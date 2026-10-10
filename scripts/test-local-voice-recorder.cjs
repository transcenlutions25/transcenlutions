/* Deterministic media mocks, not device/browser microphone verification. No real
 * audio, permission prompts, external services, browser sockets, or uploads. */
const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const ts = require('typescript');
for (const extension of ['.ts', '.tsx']) require.extensions[extension] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
}).outputText, filename);
const { LocalVoiceRecorderController, audioFileExtension, LOCAL_RECORDING_MAX_MS, LOCAL_RECORDING_MAX_BYTES, localRecordingSupport } = require('../lib/local-voice-recorder.ts');
const { parseVoiceRecorderCommand } = require('../lib/voice-recorder-command.ts');
const settle = async () => { await Promise.resolve(); await Promise.resolve(); };
function deferred() { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; }
function harness(overrides = {}) {
  let time = 0, timerId = 0;
  const timers = new Map(), changes = [], blobs = [], revoked = [], log = [], recorders = [];
  const listeners = new Map();
  const track = { enabled: true, readyState: 'live', stops: 0,
    stop() { this.stops++; this.readyState = 'ended'; log.push('track-stop'); },
    addEventListener(type, fn) { listeners.set(type, fn); }, removeEventListener(type, fn) { if (listeners.get(type) === fn) listeners.delete(type); } };
  const stream = { getTracks: () => [track], getAudioTracks: () => [track] };
  const cue = { async play() { log.push('cue'); assert.equal(track.enabled, false, 'microphone disabled during beep'); }, cancel() { log.push('cue-cancel'); } };
  const env = {
    async getUserMedia() { log.push('permission'); return stream; },
    createStartCue() { log.push('prepare-cue'); return cue; },
    createRecorder(_, mimeType) {
      const recorder = { state: 'inactive', mimeType: mimeType || 'audio/mp4', starts: 0, stops: 0,
        start(timeslice) { this.state = 'recording'; this.starts++; assert.equal(timeslice, 250); assert.equal(track.enabled, true); log.push('record'); },
        stop() { this.state = 'inactive'; this.stops++; queueMicrotask(() => { this.ondataavailable?.({ data: new Blob(['sample audio'], { type: this.mimeType }) }); this.onstop?.(); }); },
      };
      recorders.push(recorder); return recorder;
    },
    supportsMimeType: type => type === 'audio/webm;codecs=opus',
    createObjectURL(blob) { blobs.push(blob); return `blob:local-${blobs.length}`; },
    revokeObjectURL(url) { revoked.push(url); }, now: () => time,
    setTimeout(fn, delay) { const id = ++timerId; timers.set(id, { at: time + delay, fn }); return id; },
    clearTimeout(id) { timers.delete(id); }, ...overrides,
  };
  const controller = new LocalVoiceRecorderController(env, snapshot => changes.push(snapshot));
  function advance(ms) {
    const end = time + ms;
    while (true) {
      const next = [...timers].sort((a, b) => a[1].at - b[1].at)[0];
      if (!next || next[1].at > end) break;
      timers.delete(next[0]); time = next[1].at; next[1].fn();
    }
    time = end;
  }
  return { controller, env, track, stream, cue, changes, blobs, revoked, log, recorders, timers, listeners, advance,
    snapshot: () => controller.getSnapshot(), recorder: () => recorders.at(-1), stall: ms => { time += ms; } };
}

test('no capture on construction; explicit start plays beep before capture, stop releases immediately, real MIME exports', async () => {
  const h = harness();
  assert.deepEqual(h.log, []);
  await h.controller.start();
  assert.deepEqual(h.log.slice(0, 5), ['prepare-cue', 'permission', 'cue', 'cue-cancel', 'record']);
  assert.equal(h.snapshot().phase, 'recording');
  h.advance(1200);
  h.controller.stop();
  assert.equal(h.track.stops, 1, 'tracks released before finish event');
  assert.equal(h.snapshot().phase, 'stopping');
  await settle();
  assert.equal(h.snapshot().phase, 'ready');
  assert.equal(h.snapshot().recording.filename, 'tay-voice-sample.webm');
  assert.equal(h.snapshot().recording.mimeType, 'audio/webm;codecs=opus');
  assert.equal(h.blobs[0].type, 'audio/webm;codecs=opus');
  assert.equal(h.snapshot().recording.durationMs, 1200);
  assert.equal(h.timers.size, 0);
  assert.equal(h.listeners.size, 0);
  await h.controller.start();
  assert.equal(h.recorders.length, 1, 'saved take cannot be overwritten by start');
  h.controller.cancel();
  assert.deepEqual(h.revoked, ['blob:local-1']);
  assert.equal(h.snapshot().recording, null);
});

test('cancel during permission request releases a late stream and never records', async () => {
  const permission = deferred(), h = harness({ getUserMedia: () => permission.promise });
  const starting = h.controller.start();
  assert.equal(h.snapshot().phase, 'requesting');
  h.controller.cancel(); permission.resolve(h.stream); await starting;
  assert.equal(h.track.stops, 1); assert.equal(h.recorders.length, 0);
  assert.equal(h.snapshot().phase, 'idle'); assert.equal(h.timers.size, 0);
});

test('unmount during permission request cannot produce state changes or retain late streams', async () => {
  const permission = deferred(), h = harness({ getUserMedia: () => permission.promise });
  const starting = h.controller.start(); h.controller.dispose(); const count = h.changes.length;
  permission.resolve(h.stream); await starting;
  assert.equal(h.track.stops, 1); assert.equal(h.changes.length, count); assert.equal(h.recorders.length, 0);
  await h.controller.start(); assert.equal(h.recorders.length, 0);
});

test('duplicate starts do not create parallel permission requests or captures', async () => {
  const permission = deferred(); let calls = 0;
  const h = harness({ getUserMedia: () => { calls++; return permission.promise; } });
  const starting = h.controller.start(); await h.controller.start();
  assert.equal(calls, 1); permission.resolve(h.stream); await starting;
  await h.controller.start(); assert.equal(h.recorders.length, 1); h.controller.dispose();
});

test('stale permission and cue completions cannot interfere with a newer session', async () => {
  const permission = deferred(), h = harness(); let count = 0;
  h.env.getUserMedia = () => ++count === 1 ? permission.promise : Promise.resolve(h.stream);
  const stale = h.controller.start(); h.controller.cancel(); await h.controller.start();
  let staleStops = 0;
  permission.resolve({ getTracks: () => [{ stop() { staleStops++; } }] }); await stale;
  assert.equal(staleStops, 1); assert.equal(h.snapshot().phase, 'recording'); assert.equal(h.track.stops, 0);
  h.controller.dispose();
});

test('cancellation during beep stops tracks and prevents capture', async () => {
  const beep = deferred(), h = harness(); h.cue.play = () => beep.promise;
  const starting = h.controller.start(); await settle();
  assert.equal(h.snapshot().phase, 'preparing'); assert.equal(h.track.enabled, false);
  h.controller.cancel(); beep.resolve(); await starting;
  assert.equal(h.track.stops, 1); assert.equal(h.recorders.length, 0); assert.equal(h.snapshot().phase, 'idle');
});

test('permission denial and missing/busy microphone return actionable errors without recording', async () => {
  for (const [name, text] of [['NotAllowedError', 'denied'], ['NotFoundError', 'No microphone'], ['NotReadableError', 'another app']]) {
    const h = harness({ getUserMedia: async () => { throw { name }; } });
    await h.controller.start(); assert.equal(h.snapshot().phase, 'error');
    assert.match(h.snapshot().message, new RegExp(text)); assert.equal(h.timers.size, 0); assert.equal(h.recorders.length, 0);
  }
});

test('setup timeout remains bounded and releases stream if permission is granted later', async () => {
  const permission = deferred(), h = harness({ getUserMedia: () => permission.promise });
  const starting = h.controller.start(); h.advance(30_000);
  assert.equal(h.snapshot().phase, 'error'); permission.resolve(h.stream); await starting;
  assert.equal(h.track.stops, 1); assert.equal(h.recorders.length, 0); assert.equal(h.timers.size, 0);
});

test('cue failure or recorder constructor/start failure releases every track', async () => {
  for (const stage of ['cue', 'constructor', 'start']) {
    const h = harness();
    if (stage === 'cue') h.cue.play = async () => { throw new Error('cue unavailable'); };
    if (stage === 'constructor') h.env.createRecorder = () => { throw new Error('unsupported'); };
    if (stage === 'start') { const create = h.env.createRecorder; h.env.createRecorder = (...args) => { const r = create(...args); r.start = () => { throw new Error('start'); }; return r; }; }
    await h.controller.start(); assert.equal(h.snapshot().phase, 'error'); assert.equal(h.track.stops, 1); assert.equal(h.timers.size, 0);
  }
});

test('two minute limit stops capture and finalizes a reviewable local take', async () => {
  const h = harness(); await h.controller.start(); h.advance(LOCAL_RECORDING_MAX_MS); await settle();
  assert.equal(h.snapshot().phase, 'ready'); assert.equal(h.snapshot().recording.durationMs, LOCAL_RECORDING_MAX_MS - 1000);
  assert.match(h.snapshot().message, /2-minute limit/); assert.equal(h.track.stops, 1); h.controller.dispose();
});

test('main-thread stall past the hard duration limit discards audio instead of clamping its duration', async () => {
  for (const stopPath of ['manual', 'spontaneous', 'delayed deadline']) {
    const h = harness(); await h.controller.start(); h.stall(180_000);
    if (stopPath === 'delayed deadline') { const [id, timer] = [...h.timers].find(([, timer]) => timer.at === LOCAL_RECORDING_MAX_MS - 1000); h.timers.delete(id); timer.fn(); }
    else if (stopPath === 'spontaneous') { h.recorder().ondataavailable({ data: new Blob(['overlong'], { type: 'audio/webm' }) }); h.recorder().onstop(); }
    else h.controller.stop();
    await settle(); assert.equal(h.snapshot().phase, 'error'); assert.match(h.snapshot().message, /delayed stopping/);
    assert.equal(h.blobs.length, 0); assert.equal(h.track.stops, 1); assert.equal(h.timers.size, 0);
  }
});

test('size limit discards rather than exporting truncated or oversized audio', async () => {
  const h = harness(); await h.controller.start();
  h.recorder().ondataavailable({ data: new Blob([new Uint8Array(LOCAL_RECORDING_MAX_BYTES + 1)], { type: 'audio/webm' }) });
  await settle(); assert.equal(h.snapshot().phase, 'error'); assert.equal(h.snapshot().recording, null);
  assert.equal(h.blobs.length, 0); assert.equal(h.track.stops, 1); assert.equal(h.timers.size, 0);
});

test('cancel discards capture and stale media callbacks; URL is never created', async () => {
  const h = harness(); await h.controller.start(); const oldData = h.recorder().ondataavailable, oldStop = h.recorder().onstop;
  h.controller.cancel(); oldData({ data: new Blob(['old']) }); oldStop(); await settle();
  assert.equal(h.blobs.length, 0); assert.equal(h.snapshot().phase, 'idle'); assert.equal(h.track.stops, 1);
});

test('mic disconnect and recorder error discard capture and release resources', async () => {
  for (const event of ['disconnect', 'error']) {
    const h = harness(); await h.controller.start();
    if (event === 'disconnect') h.listeners.get('ended')(); else h.recorder().onerror();
    await settle(); assert.equal(h.snapshot().phase, 'error'); assert.equal(h.track.stops, 1); assert.equal(h.snapshot().recording, null); assert.equal(h.timers.size, 0);
  }
});

test('finalization timeout and stop exception are errors, not usable recordings', async () => {
  for (const throws of [false, true]) {
    const h = harness(); await h.controller.start();
    h.recorder().stop = () => { if (throws) throw new Error('cannot stop'); h.recorder().state = 'inactive'; };
    h.controller.stop(); h.advance(5000); await settle();
    assert.equal(h.snapshot().phase, 'error'); assert.equal(h.track.stops, 1); assert.equal(h.blobs.length, 0); assert.equal(h.timers.size, 0);
  }
});

test('browser-selected MP4 keeps M4A extension; missing or unsupported encoding is not relabeled', async () => {
  const mp4 = harness({ supportsMimeType: () => false }); await mp4.controller.start(); mp4.controller.stop(); await settle();
  assert.equal(mp4.snapshot().recording.filename, 'tay-voice-sample.m4a'); assert.equal(mp4.blobs[0].type, 'audio/mp4'); mp4.controller.dispose();
  for (const mime of ['', 'application/octet-stream']) {
    const h = harness(); await h.controller.start(); h.recorder().mimeType = mime; h.controller.stop(); await settle();
    assert.equal(h.snapshot().phase, 'error'); assert.equal(h.blobs.length, 0);
  }
  assert.equal(audioFileExtension('audio/webm;codecs=opus'), 'webm');
  assert.equal(audioFileExtension('audio/ogg'), 'ogg'); assert.equal(audioFileExtension('audio/wav'), 'wav');
  assert.equal(audioFileExtension('text/html'), null);
});

test('empty recording and object URL failure fail closed', async () => {
  const empty = harness(); await empty.controller.start(); empty.recorder().stop = function () { this.state = 'inactive'; queueMicrotask(() => this.onstop?.()); };
  empty.controller.stop(); await settle(); assert.equal(empty.snapshot().phase, 'error'); assert.equal(empty.blobs.length, 0);
  const h = harness({ createObjectURL() { throw new Error('allocation failed'); } }); await h.controller.start(); h.controller.stop(); await settle();
  assert.equal(h.snapshot().phase, 'error'); assert.equal(h.track.stops, 1);
});

test('dispose revokes ready URL exactly once and suppresses subsequent notifications', async () => {
  const h = harness(); await h.controller.start(); h.controller.stop(); await settle(); const count = h.changes.length;
  h.controller.dispose(); h.controller.dispose();
  assert.deepEqual(h.revoked, ['blob:local-1']); assert.equal(h.changes.length, count); assert.equal(h.snapshot().recording, null);
});

test('voice command adapter is exact, requires active user-started listening, and never requests capture', () => {
  const allowed = { userStartedListening: true, listening: true };
  assert.equal(parseVoiceRecorderCommand('Hey Tay, record and clone my voice. Start now!', allowed), 'review-start');
  assert.equal(parseVoiceRecorderCommand('hey tay stop recording', allowed), 'stop');
  assert.equal(parseVoiceRecorderCommand('Hey Tay, cancel recording.', allowed), 'cancel');
  for (const text of ['"Hey Tay, record and clone my voice. Start now"', 'Say Hey Tay, record and clone my voice. Start now', 'Do not record and clone my voice', 'Hey Tay, record and clone my voice. Start now and upload it', 'Hey Tay, record my voice', 'Hey Tay, record and clone his voice. Start now']) assert.equal(parseVoiceRecorderCommand(text, allowed), null, text);
  for (const context of [{ userStartedListening: false, listening: true }, { userStartedListening: true, listening: false }]) assert.equal(parseVoiceRecorderCommand('Hey Tay, record and clone my voice. Start now', context), null);
});

// DOM tests cover accessible controls, no automatic capture, and existing dictation.
test('mounted Voice panel: consent → record → stop → local playback/save/delete; no transcript or provider submission', async () => {
  const { JSDOM } = require('jsdom');
  const dom = new JSDOM('<!doctype html><div id="root"></div>', { url: 'https://example.test/', pretendToBeVisual: true });
  const { window } = dom;
  for (const key of ['window', 'document', 'navigator', 'HTMLElement', 'Event', 'MouseEvent']) Object.defineProperty(globalThis, key, { configurable: true, value: key === 'window' ? window : window[key] });
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  Object.defineProperty(window, 'isSecureContext', { value: false, configurable: true });
  assert.match(localRecordingSupport(), /HTTPS/);
  Object.defineProperty(window, 'isSecureContext', { value: true, configurable: true });
  assert.match(localRecordingSupport(), /unavailable/);
  let mediaCalls = 0, stops = 0, activeRecorder, recognition, cueStops = 0, speechCancels = 0;
  const revoked = [], urls = [], transcripts = [], channels = [], playbackCleanup = [];
  const noNetwork = () => { throw new Error('Network forbidden'); };
  globalThis.fetch = noNetwork; window.fetch = noNetwork; window.XMLHttpRequest = noNetwork; window.WebSocket = noNetwork;
  const track = { enabled: true, readyState: 'live', stop() { stops++; }, addEventListener() {}, removeEventListener() {} };
  Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { async getUserMedia(constraints) { mediaCalls++; assert.deepEqual(constraints, { audio: true, video: false }); return { getTracks: () => [track], getAudioTracks: () => [track] }; } } });
  window.MediaRecorder = globalThis.MediaRecorder = class {
    static isTypeSupported(type) { return type === 'audio/webm;codecs=opus'; }
    constructor(stream, options) { activeRecorder = this; this.mimeType = options?.mimeType || 'audio/mp4'; this.state = 'inactive'; }
    start() { this.state = 'recording'; }
    stop() { this.state = 'inactive'; queueMicrotask(() => { this.ondataavailable?.({ data: new Blob(['local sample'], { type: this.mimeType }) }); this.onstop?.(); }); }
  };
  assert.match(localRecordingSupport(), /beep/);
  window.AudioContext = class {
    state = 'running'; currentTime = 0; destination = {};
    async resume() {} async close() { this.state = 'closed'; }
    createGain() { return { connect() {}, gain: { setValueAtTime() {}, linearRampToValueAtTime() {} } }; }
    createOscillator() { return { frequency: {}, connect() {}, start() {}, stop() { cueStops++; queueMicrotask(() => this.onended?.()); } }; }
  };
  assert.equal(localRecordingSupport(), null);
  window.SpeechRecognition = class { constructor() { recognition = this; } start() {} abort() {} };
  window.speechSynthesis = { cancel() { speechCancels++; }, speak() {} };
  globalThis.URL.createObjectURL = blob => { urls.push(blob); return `blob:test-${urls.length}`; };
  globalThis.URL.revokeObjectURL = url => revoked.push(url);
  window.HTMLMediaElement.prototype.pause = function () { playbackCleanup.push('pause'); };
  window.HTMLMediaElement.prototype.load = function () { playbackCleanup.push('load'); };
  const React = require('react'), { createRoot } = require('react-dom/client');
  const { VoiceControls } = require('../components/voice-controls.tsx');
  const root = createRoot(document.getElementById('root'));
  const render = () => root.render(React.createElement(VoiceControls, { reply: 'Hello', onTranscript: text => transcripts.push(text), onListening: value => channels.push(value) }));
  const button = text => { const found = [...document.querySelectorAll('button')].find(item => item.textContent === text); assert.ok(found, text); return found; };
  const click = async element => React.act(async () => { element.focus(); element.click(); });
  const waitCue = async () => React.act(async () => new Promise(resolve => setTimeout(resolve, 180)));
  await React.act(async () => render());
  assert.equal(mediaCalls, 0); assert.equal(button('Record my voice').disabled, true);
  await click(button('Speak request'));
  await React.act(async () => recognition.onresult({ results: [[{ transcript: 'Hey Tay, record and clone my voice. Start now' }]] }));
  assert.equal(mediaCalls, 0, 'spoken request never bypasses button consent/activation');
  assert.deepEqual(transcripts, []); assert.equal(document.activeElement.type, 'checkbox');
  await click(document.querySelector('input[type=checkbox]'));
  assert.equal(button('Record my voice').disabled, false);
  await click(button('Record my voice'));
  assert.equal(button('Speak request').disabled, true); assert.equal(button('Read latest reply').disabled, true);
  await waitCue(); assert.equal(activeRecorder.state, 'recording'); assert.ok(cueStops > 0);
  assert.match(document.body.textContent, /Recording now/);
  assert.equal(document.querySelector('[role=timer]').getAttribute('aria-live'), 'off');
  await click(button('Stop recording'));
  assert.equal(stops, 1); const audio = document.querySelector('audio');
  assert.ok(audio.controls); assert.equal(audio.autoplay, false); assert.equal(audio.getAttribute('src'), 'blob:test-1');
  const save = document.querySelector('a[download]'); assert.equal(save.download, 'tay-voice-sample.webm'); assert.equal(save.href, 'blob:test-1');
  save.addEventListener('click', event => event.preventDefault());
  await click(save); assert.match(document.body.textContent, /cannot confirm the file was saved/);
  assert.ok(document.querySelector('audio'), 'requesting Save does not delete the review copy');
  assert.equal(button('Record my voice').disabled, true); assert.equal(button('Speak request').disabled, false);
  await click(button('Speak request'));
  assert.deepEqual(playbackCleanup, ['pause'], 'dictation pauses sample audio before opening recognition');
  const cancelsBeforePlayback = speechCancels;
  await React.act(async () => audio.dispatchEvent(new Event('play')));
  assert.equal(channels.at(-1), false, 'starting sample playback stops active dictation');
  assert.equal(recognition.onresult, null); assert.equal(speechCancels, cancelsBeforePlayback + 1);
  assert.ok(button('Speak request'));
  globalThis.SpeechSynthesisUtterance = class { constructor(text) { this.text = text; } };
  await click(button('Read latest reply'));
  assert.deepEqual(playbackCleanup, ['pause', 'pause'], 'reading a reply also pauses the sample');
  await click(button('Delete recording'));
  assert.deepEqual(revoked, ['blob:test-1']); assert.equal(document.querySelector('audio'), null); assert.deepEqual(playbackCleanup, ['pause', 'pause', 'pause', 'load']);
  assert.equal(document.querySelector('input').checked, false);
  assert.equal(document.activeElement, document.querySelector('input'), 'Delete returns focus to the enabled consent control');
  await click(button('Speak request'));
  await React.act(async () => recognition.onresult({ results: [[{ transcript: 'Please keep this as my draft' }]] }));
  assert.deepEqual(transcripts, ['Please keep this as my draft']);
  await click(button('Stop microphone'));
  await click(document.querySelector('input[type=checkbox]')); await click(button('Record my voice')); await waitCue();
  Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' });
  await React.act(async () => document.dispatchEvent(new Event('visibilitychange')));
  assert.equal(stops, 2); assert.match(document.body.textContent, /cancelled when this page was hidden/); assert.equal(document.querySelector('audio'), null);
  Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });
  assert.equal(document.querySelector('input').checked, false);
  await click(document.querySelector('input[type=checkbox]')); await click(button('Record my voice')); await waitCue();
  await click(button('Cancel recording')); assert.equal(stops, 3);
  assert.equal(document.activeElement, document.querySelector('input'), 'Cancel returns focus to the enabled consent control');
  assert.equal(document.querySelector('input').checked, false);
  await click(document.querySelector('input[type=checkbox]')); await click(button('Record my voice')); await waitCue();
  await React.act(async () => root.unmount()); assert.equal(stops, 4); assert.equal(channels.at(-1), false);
  dom.window.close();
});
