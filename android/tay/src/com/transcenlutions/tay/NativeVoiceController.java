package com.transcenlutions.tay;

import android.content.Context;
import android.content.Intent;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.speech.RecognitionListener;
import android.speech.RecognizerIntent;
import android.speech.SpeechRecognizer;
import java.util.ArrayList;
import java.util.Locale;

/** Foreground-only, single utterance, explicitly on-device recognition. Never opens a cloud recognizer. */
final class NativeVoiceController {
    interface Listener { void status(String text); void transcript(String text); void changed(); }
    private final Context context;
    private final Listener listener;
    private final Handler handler = new Handler(Looper.getMainLooper());
    private final VoiceTurn turn = new VoiceTurn();
    private SpeechRecognizer recognizer;
    private Runnable timeout;
    private long activeId;
    NativeVoiceController(Context context, Listener listener) { this.context = context; this.listener = listener; }
    VoiceTurn.State state() { return turn.state(); }
    boolean available() { return SpeechRecognizer.isOnDeviceRecognitionAvailable(context); }

    void start() {
        if (Looper.myLooper() != Looper.getMainLooper()) throw new IllegalStateException("Voice requires main thread");
        if (turn.state() != VoiceTurn.State.IDLE) return;
        if (!available()) { listener.status("On-device speech is unavailable. You can still type."); return; }
        final long id = turn.begin(); activeId = id;
        try {
            recognizer = SpeechRecognizer.createOnDeviceSpeechRecognizer(context);
            recognizer.setRecognitionListener(new RecognitionListener() {
                public void onReadyForSpeech(Bundle params) { if (turn.accepts(id) && turn.state() == VoiceTurn.State.LISTENING) listener.status("Listening on this device. Tap Stop when done."); }
                public void onBeginningOfSpeech() { }
                public void onRmsChanged(float rms) { }
                public void onBufferReceived(byte[] buffer) { } // Never save or upload raw audio.
                public void onEndOfSpeech() { if (turn.finish(id)) { listener.status("Finishing dictation…"); armTimeout(id, 8000); listener.changed(); } }
                public void onError(int error) {
                    if (!turn.complete(id)) return;
                    release(); listener.status(errorText(error)); listener.changed();
                }
                public void onResults(Bundle results) {
                    if (!turn.complete(id)) return;
                    ArrayList<String> texts = results == null ? null : results.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION);
                    release();
                    if (texts != null && !texts.isEmpty() && texts.get(0) != null && !texts.get(0).trim().isEmpty()) listener.transcript(texts.get(0));
                    else listener.status("No speech recognized. Your draft is unchanged.");
                    listener.changed();
                }
                public void onPartialResults(Bundle partial) { } // Only final text is appended.
                public void onEvent(int eventType, Bundle params) { }
            });
            Intent intent = new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH);
            intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM);
            intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE, Locale.getDefault().toLanguageTag());
            intent.putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, false);
            intent.putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 1);
            recognizer.startListening(intent);
            if (turn.accepts(id)) { listener.status("Starting on-device dictation…"); listener.changed(); armTimeout(id, 60000); }
        } catch (RuntimeException e) {
            turn.cancel(); release(); listener.status("Cannot start on-device speech. Check microphone permission or type instead."); listener.changed();
        }
    }
    void stop() {
        // Transition first, so repeated taps cannot send duplicate stop calls.
        if (!turn.finish(activeId)) return;
        listener.status("Finishing dictation…"); listener.changed(); armTimeout(activeId, 8000);
        try { if (recognizer != null) recognizer.stopListening(); }
        catch (RuntimeException e) { cancel(); listener.status("Dictation stopped. Your existing draft is safe."); }
    }
    void cancel() { turn.cancel(); release(); listener.changed(); }
    private void armTimeout(long id, long delay) {
        if (timeout != null) handler.removeCallbacks(timeout);
        timeout = () -> {
            if (!turn.complete(id)) return;
            release(); listener.status("Dictation timed out. Your existing draft is unchanged."); listener.changed();
        };
        handler.postDelayed(timeout, delay);
    }
    private void release() {
        if (timeout != null) { handler.removeCallbacks(timeout); timeout = null; }
        SpeechRecognizer previous = recognizer; recognizer = null;
        if (previous != null) {
            try { previous.cancel(); } catch (RuntimeException ignored) { }
            try { previous.destroy(); } catch (RuntimeException ignored) { }
        }
    }
    private static String errorText(int error) {
        if (error == SpeechRecognizer.ERROR_LANGUAGE_UNAVAILABLE || error == SpeechRecognizer.ERROR_LANGUAGE_NOT_SUPPORTED)
            return "This speech language is not installed or supported on-device. No download was started; you can type.";
        if (error == SpeechRecognizer.ERROR_INSUFFICIENT_PERMISSIONS) return "Microphone permission is unavailable. You can still type.";
        if (error == SpeechRecognizer.ERROR_NO_MATCH || error == SpeechRecognizer.ERROR_SPEECH_TIMEOUT) return "No speech recognized. Your draft is unchanged.";
        return "On-device speech stopped. Your existing draft is safe; tap Talk to retry or type.";
    }
}
