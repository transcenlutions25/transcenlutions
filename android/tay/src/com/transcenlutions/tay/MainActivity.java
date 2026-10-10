package com.transcenlutions.tay;

import android.Manifest;
import android.app.Activity;
import android.app.AlertDialog;
import android.content.pm.PackageManager;
import android.graphics.Insets;
import android.net.ConnectivityManager;
import android.net.NetworkCapabilities;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.text.Editable;
import android.text.InputFilter;
import android.text.TextWatcher;
import android.view.Gravity;
import android.view.View;
import android.view.WindowInsets;
import android.widget.*;

/** Tay's smallest native surface: local text/dictation, with truthful connection status. */
public final class MainActivity extends Activity {
    private static final int MICROPHONE = 1;
    private static final int BG = 0xff0a0710, PANEL = 0xff17101f, GOLD = 0xffdfbd72, TEXT = 0xfff1eaf5;
    private final Handler main = new Handler(Looper.getMainLooper());
    private TayApplication app;
    private EditText draft;
    private TextView connectionStatus, saveStatus, voiceStatus;
    private Button talk, cancel, check, save;
    private NativeVoiceController voice;
    private boolean visible, alive = true, loaded, canPersist;
    private long editVersion, connectionGeneration;
    private Runnable pendingSave;
    private AuthenticatedIdentityTransport.Request identityRequest;
    private static final class RetainedDraft {
        final LocalDraft draft; final boolean canPersist;
        RetainedDraft(LocalDraft draft, boolean canPersist) { this.draft = draft; this.canPersist = canPersist; }
    }

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        getWindow().setDecorFitsSystemWindows(false);
        app = (TayApplication) getApplication();
        buildViews();
        voice = new NativeVoiceController(this, new NativeVoiceController.Listener() {
            public void status(String text) { if (alive) voiceStatus.setText(text); }
            public void changed() { if (alive) updateVoiceButtons(); }
            public void transcript(String text) {
                if (!visible || !loaded) return;
                try {
                    LocalDraft updated = new LocalDraft(draft.getText().toString()).appendSpeech(text);
                    draft.setText(updated.text); draft.setSelection(updated.text.length());
                    voiceStatus.setText("Dictation added to your local draft. Review it before sharing.");
                } catch (IllegalArgumentException e) { voiceStatus.setText("Dictation would exceed the 16,000-character limit. Your existing draft is unchanged."); }
            }
        });
        updateVoiceButtons();
        Object retained = getLastNonConfigurationInstance();
        if (retained instanceof RetainedDraft) {
            RetainedDraft previous = (RetainedDraft) retained;
            draft.setText(previous.draft.text); finishLoad(previous.canPersist);
            // Confirm again: a previous Activity's write may still be queued or may have failed.
            if (canPersist) persist();
            return;
        }
        app.draftIo.execute(() -> {
            try {
                LocalDraft restored = app.drafts.read();
                main.post(() -> { if (!alive) return; draft.setText(restored.text); finishLoad(true); });
            } catch (Exception e) {
                main.post(() -> { if (!alive) return; finishLoad(false); });
            }
        });
    }
    @Override public Object onRetainNonConfigurationInstance() {
        // Keep unsaved/temporary edits through rotation or theme changes, outside any saved-state Bundle.
        return loaded ? new RetainedDraft(new LocalDraft(draft.getText().toString()), canPersist) : null;
    }

    private void finishLoad(boolean success) {
        loaded = true; canPersist = success; draft.setEnabled(true); save.setEnabled(success);
        saveStatus.setText(success ? "Saved on this device only" : "Stored draft could not be read. It is preserved. New text is temporary and will not be saved.");
        draft.addTextChangedListener(new TextWatcher() {
            public void beforeTextChanged(CharSequence s, int start, int count, int after) { }
            public void onTextChanged(CharSequence s, int start, int before, int count) {
                editVersion++;
                if (!canPersist) return;
                saveStatus.setText("Saving local draft…");
                if (pendingSave != null) main.removeCallbacks(pendingSave);
                pendingSave = () -> { pendingSave = null; persist(); };
                main.postDelayed(pendingSave, 150);
            }
            public void afterTextChanged(Editable e) { }
        });
        updateVoiceButtons();
    }

    private void persist() {
        if (!loaded || !canPersist) return;
        if (pendingSave != null) { main.removeCallbacks(pendingSave); pendingSave = null; }
        final long version = editVersion;
        final LocalDraft value = new LocalDraft(draft.getText().toString());
        saveStatus.setText("Saving local draft…");
        app.draftIo.execute(() -> {
            boolean saved;
            try { app.drafts.save(value); saved = true; } catch (Exception e) { saved = false; }
            final boolean confirmed = saved;
            main.post(() -> {
                if (!alive || version != editVersion) return;
                saveStatus.setText(confirmed ? "Saved on this device only" : "Not saved. Keep this draft open and tap Save to retry.");
            });
        });
    }

    private void buildViews() {
        ScrollView scroll = new ScrollView(this); scroll.setFillViewport(true); scroll.setBackgroundColor(BG);
        LinearLayout column = new LinearLayout(this); column.setOrientation(LinearLayout.VERTICAL);
        column.setPadding(dp(20), dp(16), dp(20), dp(20));
        scroll.addView(column, new ScrollView.LayoutParams(-1, -2));
        scroll.setOnApplyWindowInsetsListener((view, insets) -> {
            Insets system = insets.getInsets(WindowInsets.Type.systemBars() | WindowInsets.Type.displayCutout() | WindowInsets.Type.ime());
            view.setPadding(system.left, system.top, system.right, system.bottom); return insets;
        });
        TextView title = text("Tay Command", 24); title.setTextColor(GOLD); title.setAccessibilityHeading(true); column.addView(title);
        connectionStatus = text("Not synced · Account connection not configured", 16); connectionStatus.setAccessibilityLiveRegion(View.ACCESSIBILITY_LIVE_REGION_POLITE); column.addView(connectionStatus);
        TextView context = text("Talk or type a draft. This device-local scratch space is separate from every account. Connected Tay replies and cross-device sync are not available in this source milestone.", 16);
        column.addView(context);
        TextView label = text("Your local draft", 18); column.addView(label);
        draft = new EditText(this); draft.setId(View.generateViewId()); label.setLabelFor(draft.getId());
        draft.setTextSize(18); draft.setTextColor(TEXT); draft.setHintTextColor(0xffb7aebe);
        draft.setHint("Write here, or tap Talk"); draft.setBackgroundColor(PANEL);
        draft.setGravity(Gravity.TOP | Gravity.START); draft.setMinLines(5); draft.setMaxLines(12);
        draft.setInputType(android.text.InputType.TYPE_CLASS_TEXT | android.text.InputType.TYPE_TEXT_FLAG_MULTI_LINE | android.text.InputType.TYPE_TEXT_FLAG_CAP_SENTENCES);
        draft.setFilters(new InputFilter[] { new InputFilter.LengthFilter(LocalDraft.MAX_CHARS) });
        draft.setPadding(dp(12), dp(12), dp(12), dp(12)); draft.setEnabled(false);
        draft.setSaveEnabled(false); // No Activity state copy of private text outside the app's explicit draft store.
        draft.setImportantForAutofill(View.IMPORTANT_FOR_AUTOFILL_NO_EXCLUDE_DESCENDANTS);
        column.addView(draft, new LinearLayout.LayoutParams(-1, -2));
        saveStatus = text("Loading local draft…", 14); column.addView(saveStatus);
        voiceStatus = text("On-device dictation only. Microphone access is requested when you tap Talk. Audio is not saved by Tay.", 14);
        voiceStatus.setAccessibilityLiveRegion(View.ACCESSIBILITY_LIVE_REGION_POLITE); column.addView(voiceStatus);
        talk = button("Talk", column, view -> talk());
        cancel = button("Cancel dictation", column, view -> { voice.cancel(); voiceStatus.setText("Dictation cancelled. Your existing draft is unchanged."); talk.requestFocus(); });
        save = button("Save local draft", column, view -> persist()); save.setEnabled(false);
        check = button("Check connection", column, view -> checkConnection());
        TextView limits = text("Not sent · Not synced · Last confirmed sync: never\nLocal text is available to anyone using this unlocked app. Tay does not automatically copy this draft into an account.", 14);
        column.addView(limits);
        setContentView(scroll); scroll.requestApplyInsets();
    }

    private void talk() {
        if (!visible || !loaded) return;
        if (voice.state() == VoiceTurn.State.LISTENING) { voice.stop(); return; }
        if (voice.state() != VoiceTurn.State.IDLE) return;
        if (!voice.available()) { voiceStatus.setText("On-device speech is unavailable on this device. You can still type."); return; }
        if (checkSelfPermission(Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED) { voice.start(); return; }
        new AlertDialog.Builder(this).setTitle("Use the microphone for dictation?")
            .setMessage("Tay will use Android's on-device speech service only while this screen is open. It appends final text to your local draft. No cloud recognizer or automatic model download is used.")
            .setNegativeButton("Not now", (dialog, which) -> talk.requestFocus())
            .setPositiveButton("Continue", (dialog, which) -> { if (visible) requestPermissions(new String[] { Manifest.permission.RECORD_AUDIO }, MICROPHONE); })
            .show();
    }
    @Override public void onRequestPermissionsResult(int code, String[] permissions, int[] results) {
        super.onRequestPermissionsResult(code, permissions, results);
        if (code != MICROPHONE || !alive) return;
        voiceStatus.setText(results.length > 0 && results[0] == PackageManager.PERMISSION_GRANTED
            ? "Microphone allowed. Tap Talk to start dictation." : "Microphone was not allowed. You can still type.");
        talk.requestFocus(); // Never auto-start after a permission dialog, backgrounding or recreation.
    }
    private void updateVoiceButtons() {
        VoiceTurn.State state = voice == null ? VoiceTurn.State.IDLE : voice.state();
        talk.setText(state == VoiceTurn.State.LISTENING ? "Stop dictation" : state == VoiceTurn.State.FINISHING ? "Finishing dictation…" : "Talk");
        talk.setEnabled(loaded && state != VoiceTurn.State.FINISHING);
        cancel.setVisibility(state == VoiceTurn.State.IDLE ? View.GONE : View.VISIBLE);
    }

    private void checkConnection() {
        if (!visible) return;
        final TrustedEndpoint endpoint;
        try { endpoint = new TrustedEndpoint(getString(R.string.tay_api_origin)); }
        catch (IllegalArgumentException e) { connectionStatus.setText(networkLabel() + "Not synced · Account connection not configured"); return; }
        // No tokens in settings, Intent extras or local files. The default adapter has no session.
        final AuthenticatedIdentityTransport.Session session = app.sessions.current();
        if (session == null) { connectionStatus.setText("Not synced · Sign-in adapter is not configured. You can keep drafting."); return; }
        cancelIdentity(); final long generation = connectionGeneration;
        final AuthenticatedIdentityTransport.Request request = new AuthenticatedIdentityTransport.Request(); identityRequest = request;
        check.setEnabled(false); connectionStatus.setText("Checking authenticated connection… You can keep drafting.");
        app.networkIo.execute(() -> {
            boolean verified;
            try { AuthenticatedIdentityTransport.verify(endpoint, app.sessions, request); verified = true; }
            catch (Exception e) { verified = false; }
            final boolean identityVerified = verified;
            main.post(() -> {
                if (!alive || !visible || generation != connectionGeneration) return;
                identityRequest = null; check.setEnabled(true);
                connectionStatus.setText(identityVerified && app.sessions.current() == session ? "Account identity verified · Not synced. Native sync is not integrated."
                    : "Not synced · Account could not be verified. You can keep drafting.");
            });
        });
    }
    private String networkLabel() {
        ConnectivityManager manager = (ConnectivityManager) getSystemService(CONNECTIVITY_SERVICE);
        NetworkCapabilities network = manager == null ? null : manager.getNetworkCapabilities(manager.getActiveNetwork());
        return network == null || !network.hasCapability(NetworkCapabilities.NET_CAPABILITY_VALIDATED) ? "Device offline · " : "";
    }
    private void cancelIdentity() { connectionGeneration++; if (identityRequest != null) identityRequest.cancel(); identityRequest = null; check.setEnabled(true); }
    @Override public void onResume() { super.onResume(); visible = true; connectionStatus.setText(networkLabel() + "Not synced · Account connection not configured"); }
    @Override public void onPause() {
        visible = false;
        if (voice != null && voice.state() != VoiceTurn.State.IDLE) {
            voice.cancel(); voiceStatus.setText("Dictation stopped when this screen closed. Tap Talk to start again.");
        }
        cancelIdentity(); if (pendingSave != null) persist(); super.onPause();
    }
    @Override public void onDestroy() { alive = false; if (voice != null) voice.cancel(); cancelIdentity(); super.onDestroy(); }
    private TextView text(String value, int sp) { TextView view = new TextView(this); view.setText(value); view.setTextSize(sp); view.setTextColor(TEXT); view.setPadding(0, dp(8), 0, dp(8)); return view; }
    private Button button(String value, LinearLayout parent, View.OnClickListener listener) {
        Button button = new Button(this); button.setText(value); button.setAllCaps(false); button.setTextSize(18);
        button.setMinHeight(dp(56)); button.setTextColor(GOLD); button.setOnClickListener(listener);
        LinearLayout.LayoutParams layout = new LinearLayout.LayoutParams(-1, -2); layout.topMargin = dp(8); parent.addView(button, layout); return button;
    }
    private int dp(int value) { return Math.round(value * getResources().getDisplayMetrics().density); }
}
