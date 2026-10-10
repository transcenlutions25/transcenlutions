/** Browser-local audio capture. No storage, transport, provider, or cloning APIs. */
export const LOCAL_RECORDING_MAX_MS = 120_000;
export const LOCAL_RECORDING_MAX_BYTES = 10 * 1024 * 1024;
// Leave scheduling headroom; the hard limit is checked again before accepting audio.
const AUTO_STOP_MS = LOCAL_RECORDING_MAX_MS - 1_000;
const SETUP_TIMEOUT_MS = 30_000;
const FINALIZE_TIMEOUT_MS = 5_000;
const MIME_PREFERENCES = ["audio/webm;codecs=opus", "audio/mp4", "audio/ogg;codecs=opus", "audio/webm", "audio/ogg"];

export type RecordingPhase = "idle" | "requesting" | "preparing" | "recording" | "stopping" | "ready" | "error";
export interface LocalRecording {
  url: string;
  mimeType: string;
  filename: string;
  bytes: number;
  durationMs: number;
}
export interface RecordingSnapshot {
  phase: RecordingPhase;
  message: string;
  elapsedMs: number;
  recording: LocalRecording | null;
}
export const EMPTY_RECORDING: RecordingSnapshot = {
  phase: "idle", message: "Ready when you are. Recording starts after the beep.", elapsedMs: 0, recording: null,
};
export function recordingIsBusy(phase: RecordingPhase) {
  return ["requesting", "preparing", "recording", "stopping"].includes(phase);
}
export function audioFileExtension(mimeType: string): string | null {
  const type = mimeType.split(";")[0].trim().toLowerCase();
  return ({ "audio/webm": "webm", "video/webm": "webm", "audio/mp4": "m4a", "video/mp4": "mp4",
    "audio/ogg": "ogg", "application/ogg": "ogg", "audio/aac": "aac", "audio/mpeg": "mp3",
    "audio/wav": "wav", "audio/x-wav": "wav" } as Record<string, string>)[type] || null;
}
interface StartCue { play(): Promise<void>; cancel(): void }
export interface RecorderEnvironment {
  getUserMedia(): Promise<MediaStream>;
  createRecorder(stream: MediaStream, mimeType?: string): MediaRecorder;
  supportsMimeType(type: string): boolean;
  createStartCue(): StartCue;
  createObjectURL(blob: Blob): string;
  revokeObjectURL(url: string): void;
  now(): number;
  setTimeout(callback: () => void, ms: number): ReturnType<typeof setTimeout>;
  clearTimeout(timer: ReturnType<typeof setTimeout>): void;
}

/** Construct/resume the context synchronously from the Record button gesture. */
function browserStartCue(): StartCue {
  const Context = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Context) throw new Error("The start beep is unavailable in this browser. No audio was recorded.");
  const context = new Context();
  // Attach a rejection handler immediately; microphone permission may remain pending.
  const resumed = context.resume().then(() => true, () => false);
  let cancelled = false;
  let finish: (() => void) | undefined;
  let oscillator: OscillatorNode | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const close = () => { void context.close().catch(() => undefined); };
  return {
    async play() {
      if (!(await resumed) || cancelled || context.state !== "running") throw new Error("The start beep could not play. Tap Record again; no audio was recorded.");
      await new Promise<void>((resolve) => {
        finish = resolve;
        oscillator = context.createOscillator();
        const gain = context.createGain();
        oscillator.connect(gain);
        gain.connect(context.destination);
        oscillator.frequency.value = 740;
        gain.gain.setValueAtTime(0, context.currentTime);
        gain.gain.linearRampToValueAtTime(0.12, context.currentTime + 0.015);
        gain.gain.linearRampToValueAtTime(0, context.currentTime + 0.15);
        oscillator.onended = () => {
          // Capture is still disabled during this short acoustic tail.
          timer = setTimeout(() => { close(); resolve(); }, 150);
        };
        oscillator.start();
        oscillator.stop(context.currentTime + 0.16);
      });
      if (cancelled) throw new Error("Recording cancelled.");
    },
    cancel() {
      cancelled = true;
      if (timer) clearTimeout(timer);
      if (oscillator) { oscillator.onended = null; try { oscillator.stop(); } catch { /* already ended */ } }
      finish?.();
      close();
    },
  };
}
export function localRecordingSupport(): string | null {
  if (typeof window === "undefined" || !window.isSecureContext) return "Recording needs HTTPS or a secure localhost page.";
  if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) return "Audio recording is unavailable in this browser. Try a current browser with microphone support.";
  if (!window.AudioContext && !(window as Window & { webkitAudioContext?: unknown }).webkitAudioContext) return "The recording start beep is unavailable in this browser.";
  return null;
}
export function browserRecorderEnvironment(): RecorderEnvironment {
  return {
    getUserMedia: () => navigator.mediaDevices.getUserMedia({ audio: true, video: false }),
    createRecorder: (stream, mimeType) => new MediaRecorder(stream, mimeType ? { mimeType } : undefined),
    supportsMimeType: type => MediaRecorder.isTypeSupported(type),
    createStartCue: browserStartCue,
    createObjectURL: blob => URL.createObjectURL(blob), revokeObjectURL: url => URL.revokeObjectURL(url),
    now: () => performance.now(), setTimeout, clearTimeout,
  };
}
function captureError(error: unknown) {
  const name = error && typeof error === "object" && "name" in error ? error.name : "";
  if (name === "NotAllowedError" || name === "SecurityError") return "Microphone permission was denied. Allow it in your browser settings, then tap Record again.";
  if (name === "NotFoundError") return "No microphone was found. Connect one, then tap Record again.";
  if (name === "NotReadableError" || name === "AbortError") return "The microphone could not be opened. Check whether another app is using it, then try again.";
  return "Recording could not start. Check your microphone and browser audio permissions, then tap Record again.";
}

/** One controller per mounted panel. Only start() requests the microphone. */
export class LocalVoiceRecorderController {
  private snapshot: RecordingSnapshot = { ...EMPTY_RECORDING };
  private disposed = false;
  private generation = 0;
  private stream: MediaStream | null = null;
  private recorder: MediaRecorder | null = null;
  private cue: StartCue | null = null;
  private chunks: Blob[] = [];
  private bytes = 0;
  private startedAt = 0;
  private timers = new Set<ReturnType<typeof setTimeout>>();
  private trackListeners: Array<[MediaStreamTrack, () => void]> = [];
  constructor(private env: RecorderEnvironment, private onChange: (snapshot: RecordingSnapshot) => void) {}
  getSnapshot() { return this.snapshot; }
  private update(update: Partial<RecordingSnapshot>) {
    this.snapshot = { ...this.snapshot, ...update };
    if (!this.disposed) this.onChange(this.snapshot);
  }
  private later(callback: () => void, ms: number) {
    const timer = this.env.setTimeout(() => { this.timers.delete(timer); callback(); }, ms);
    this.timers.add(timer);
  }
  private clearTimers() {
    for (const timer of this.timers) this.env.clearTimeout(timer);
    this.timers.clear();
  }
  private releaseStream() {
    for (const [track, listener] of this.trackListeners) track.removeEventListener("ended", listener);
    this.trackListeners = [];
    this.stream?.getTracks().forEach(track => track.stop());
    this.stream = null;
  }
  private cleanCapture() {
    this.clearTimers();
    this.cue?.cancel(); this.cue = null;
    if (this.recorder) {
      const recorder = this.recorder;
      this.recorder = null;
      recorder.ondataavailable = null; recorder.onstop = null; recorder.onerror = null;
      try { if (recorder.state !== "inactive") recorder.stop(); } catch { /* cleanup must still release tracks */ }
    }
    this.releaseStream();
    this.chunks = []; this.bytes = 0;
  }
  private fail(message: string) {
    ++this.generation;
    this.cleanCapture();
    this.readyMessage = "Recording ready. Listen, save to your device, or delete it.";
    this.update({ phase: "error", message, elapsedMs: 0 });
  }
  async start() {
    if (this.disposed || recordingIsBusy(this.snapshot.phase) || this.snapshot.recording) return;
    const generation = ++this.generation;
    const active = () => !this.disposed && this.generation === generation;
    this.update({ phase: "requesting", message: "Waiting for microphone permission. Recording has not started.", elapsedMs: 0 });
    this.later(() => { if (active()) this.fail("Microphone setup timed out. Dismiss any open permission prompt, then tap Record again."); }, SETUP_TIMEOUT_MS);
    try {
      this.cue = this.env.createStartCue();
      const stream = await this.env.getUserMedia();
      if (!active()) { stream.getTracks().forEach(track => track.stop()); return; }
      this.stream = stream;
      if (!stream.getAudioTracks().some(track => track.readyState === "live")) {
        this.fail("No active microphone was found. Try again with a connected microphone."); return;
      }
      for (const track of stream.getTracks()) {
        track.enabled = false;
        const ended = () => { if (active()) this.fail("The microphone disconnected. This unfinished recording was discarded."); };
        track.addEventListener("ended", ended);
        this.trackListeners.push([track, ended]);
      }
      this.update({ phase: "preparing", message: "Microphone connected. Playing the start beep; recording has not started." });
      await this.cue.play();
      if (!active()) return;
      this.cue.cancel(); this.cue = null;
      const preferredType = MIME_PREFERENCES.find(type => this.env.supportsMimeType(type));
      const recorder = this.env.createRecorder(stream, preferredType);
      this.recorder = recorder;
      recorder.ondataavailable = event => {
        if (!active() || !event.data.size) return;
        if (this.bytes + event.data.size > LOCAL_RECORDING_MAX_BYTES) {
          this.fail("The recording exceeded 10 MB and was discarded. Try a shorter sample."); return;
        }
        this.bytes += event.data.size;
        this.chunks.push(event.data);
      };
      recorder.onerror = () => { if (active()) this.fail("The browser could not finish this recording. It was discarded; please try again."); };
      recorder.onstop = () => { if (active()) this.finish(recorder); };
      stream.getAudioTracks().forEach(track => { track.enabled = true; });
      recorder.start(250);
      this.clearTimers();
      this.startedAt = this.env.now();
      this.update({ phase: "recording", message: "Recording now. Use Stop to review, or Cancel to discard." });
      this.later(() => { if (active()) this.stop("Recording stopped automatically before the 2-minute limit. Review your recording below."); }, AUTO_STOP_MS);
      const tick = () => {
        if (!active() || this.snapshot.phase !== "recording") return;
        const elapsedMs = Math.max(0, this.env.now() - this.startedAt);
        this.update({ elapsedMs });
        // A delayed timer after device sleep must not renew the recording window.
        if (elapsedMs >= AUTO_STOP_MS) this.stop("Recording stopped automatically before the 2-minute limit. Review your recording below.");
        else this.later(tick, 250);
      };
      this.later(tick, 250);
    } catch (error) { if (active()) this.fail(captureError(error)); }
  }
  stop(message = "Recording ready. Listen, save to your device, or delete it.") {
    if (this.disposed || this.snapshot.phase !== "recording" || !this.recorder) return;
    this.clearTimers();
    const elapsedMs = Math.max(0, this.env.now() - this.startedAt);
    if (elapsedMs > LOCAL_RECORDING_MAX_MS) {
      this.fail("The browser delayed stopping beyond 2 minutes. This recording was discarded; try a shorter sample."); return;
    }
    this.update({ phase: "stopping", message: "Finishing your recording…", elapsedMs });
    this.readyMessage = message;
    this.later(() => this.fail("The browser did not finish this recording. It was discarded; please try again."), FINALIZE_TIMEOUT_MS);
    try { this.recorder.stop(); } catch { this.fail("The recording could not be stopped cleanly and was discarded."); }
    // End access immediately, without waiting for the asynchronous final data event.
    this.releaseStream();
  }
  private readyMessage = "Recording ready. Listen, save to your device, or delete it.";
  private finish(recorder: MediaRecorder) {
    const durationMs = this.snapshot.phase === "recording" ? Math.max(0, this.env.now() - this.startedAt) : this.snapshot.elapsedMs;
    if (durationMs > LOCAL_RECORDING_MAX_MS) {
      this.fail("The browser delayed stopping beyond 2 minutes. This recording was discarded; try a shorter sample."); return;
    }
    const mimeType = recorder.mimeType || this.chunks.find(chunk => chunk.type)?.type || "";
    const extension = audioFileExtension(mimeType);
    if (!this.bytes || !extension) {
      this.fail(this.bytes ? "This browser returned an unsupported audio format. The sample was discarded; try another browser." : "No audio was captured. Try recording a longer sample."); return;
    }
    // Preserve the encoder's actual container and type; never relabel WebM as WAV.
    let blob: Blob;
    let url: string;
    try { blob = new Blob(this.chunks, { type: mimeType }); url = this.env.createObjectURL(blob); } catch { this.fail("The recording could not be prepared for playback and was discarded. Please try again."); return; }
    const recording = { url, mimeType, filename: `tay-voice-sample.${extension}`, bytes: blob.size,
      durationMs };
    ++this.generation;
    this.cleanCapture();
    this.update({ phase: "ready", recording, elapsedMs: recording.durationMs, message: this.readyMessage });
    this.readyMessage = "Recording ready. Listen, save to your device, or delete it.";
  }
  cancel(message?: string) {
    if (this.disposed) return;
    const cancellationMessage = message || (this.snapshot.phase === "requesting"
      ? "Recording cancelled. Dismiss any open microphone prompt; any late access will be released."
      : "Recording cancelled and discarded. Tap Record when you are ready.");
    ++this.generation;
    this.cleanCapture();
    if (this.snapshot.recording) this.env.revokeObjectURL(this.snapshot.recording.url);
    this.readyMessage = "Recording ready. Listen, save to your device, or delete it.";
    this.update({ ...EMPTY_RECORDING, message: cancellationMessage });
  }
  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    ++this.generation;
    this.cleanCapture();
    if (this.snapshot.recording) this.env.revokeObjectURL(this.snapshot.recording.url);
    this.snapshot = { ...EMPTY_RECORDING };
  }
}
