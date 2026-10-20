package com.transcenlutions.tay;

import android.annotation.SuppressLint;
import android.annotation.TargetApi;
import android.app.Activity;
import android.app.AlertDialog;
import android.content.Intent;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.text.InputType;
import android.text.method.HideReturnsTransformationMethod;
import android.text.method.PasswordTransformationMethod;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.view.inputmethod.EditorInfo;
import android.widget.Button;
import android.widget.EditText;
import android.widget.FrameLayout;
import android.widget.ImageButton;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.ScrollView;
import android.widget.TextView;
import android.widget.Toast;
import android.window.OnBackInvokedCallback;
import android.window.OnBackInvokedDispatcher;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.concurrent.Callable;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.function.Consumer;

public final class MainActivity extends Activity {
    private static final int BG = Color.rgb(10, 8, 20);
    private static final int PANEL = Color.rgb(21, 16, 38);
    private static final int PURPLE = Color.rgb(104, 63, 190);
    private static final int BLUE = Color.rgb(50, 79, 213);
    private static final int GOLD = Color.rgb(238, 197, 91);
    private static final int TEXT = Color.rgb(245, 242, 255);
    private static final int MUTED = Color.rgb(190, 181, 211);

    private final ExecutorService io = Executors.newSingleThreadExecutor();
    private final Handler main = new Handler(Looper.getMainLooper());
    private SecureSessionStore sessions;
    private TayApiClient api;
    private String currentProjectId;
    private Object predictiveBackCallback;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().setStatusBarColor(BG);
        getWindow().setNavigationBarColor(BG);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) registerPredictiveBack();
        sessions = new SecureSessionStore(this);
        api = new TayApiClient(sessions);
        if (sessions.load() == null) showSignIn(null);
        else checkSession();
    }

    @Override
    protected void onDestroy() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) unregisterPredictiveBack();
        io.shutdownNow();
        super.onDestroy();
    }

    @TargetApi(33)
    private void registerPredictiveBack() {
        OnBackInvokedCallback callback = this::handleBack;
        predictiveBackCallback = callback;
        getOnBackInvokedDispatcher().registerOnBackInvokedCallback(OnBackInvokedDispatcher.PRIORITY_DEFAULT, callback);
    }

    @TargetApi(33)
    private void unregisterPredictiveBack() {
        if (predictiveBackCallback instanceof OnBackInvokedCallback) {
            getOnBackInvokedDispatcher().unregisterOnBackInvokedCallback((OnBackInvokedCallback) predictiveBackCallback);
        }
        predictiveBackCallback = null;
    }

    @SuppressLint("GestureBackNavigation")
    @Override
    public void onBackPressed() {
        handleBack();
    }

    private void handleBack() {
        if (currentProjectId != null) {
            currentProjectId = null;
            loadProjects();
        } else {
            finish();
        }
    }

    private void checkSession() {
        showLoading("Connecting to Tay Cloud…");
        runApi(api::session, response -> {
            if (response.status == 200 && response.body.optJSONObject("session") != null) loadProjects();
            else {
                sessions.clear();
                showSignIn(response.errorMessage("Sign in to continue."));
            }
        });
    }

    private void showSignIn(String error) {
        currentProjectId = null;
        LinearLayout content = page();
        content.addView(brand());
        content.addView(title("Sign in to Tay"));
        content.addView(body("Tay Cloud works anywhere over HTTPS. Your Mac does not need to be running."));
        content.addView(goldText("Shared Transcenlutions cloud account"));
        if (error != null && !error.isEmpty()) content.addView(errorText(error));

        EditText email = input("you@example.com");
        email.setInputType(InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_VARIATION_EMAIL_ADDRESS);
        email.setSingleLine(true);
        email.setAutofillHints(View.AUTOFILL_HINT_EMAIL_ADDRESS);
        email.setText("transcenlutions@gmail.com");
        content.addView(label("Email"));
        content.addView(email);
        content.addView(space(12));

        EditText password = input("Password");
        password.setInputType(InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_VARIATION_PASSWORD);
        password.setTransformationMethod(PasswordTransformationMethod.getInstance());
        password.setSingleLine(true);
        password.setAutofillHints(View.AUTOFILL_HINT_PASSWORD);
        password.setImeOptions(EditorInfo.IME_ACTION_DONE);
        password.setPadding(dp(14), 0, dp(58), 0);

        ImageButton eye = new ImageButton(this);
        eye.setImageResource(R.drawable.ic_visibility);
        eye.setContentDescription(getString(R.string.show_password));
        eye.setBackgroundColor(Color.TRANSPARENT);
        eye.setColorFilter(GOLD);
        eye.setPadding(dp(14), dp(14), dp(14), dp(14));
        final boolean[] visible = {false};
        eye.setOnClickListener(view -> {
            visible[0] = !visible[0];
            password.setTransformationMethod(visible[0]
                    ? HideReturnsTransformationMethod.getInstance()
                    : PasswordTransformationMethod.getInstance());
            eye.setImageResource(visible[0] ? R.drawable.ic_visibility_off : R.drawable.ic_visibility);
            eye.setContentDescription(getString(visible[0] ? R.string.hide_password : R.string.show_password));
            password.setSelection(password.length());
        });

        FrameLayout passwordFrame = new FrameLayout(this);
        passwordFrame.addView(password, new FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, dp(56)));
        passwordFrame.addView(eye, new FrameLayout.LayoutParams(dp(54), dp(54), Gravity.END | Gravity.CENTER_VERTICAL));
        content.addView(label("Password"));
        content.addView(passwordFrame);
        content.addView(space(16));

        Button signIn = primaryButton("Sign in");
        View.OnClickListener submit = view -> {
            String emailValue = email.getText().toString().trim();
            String passwordValue = password.getText().toString();
            if (emailValue.isEmpty() || passwordValue.length() < 6) {
                toast("Enter your email and password.");
                return;
            }
            signIn.setEnabled(false);
            signIn.setText(R.string.signing_in);
            runApi(() -> api.signIn(emailValue, passwordValue), response -> {
                password.setText("");
                if (response.status == 200 && !response.body.optString("access_token", "").isEmpty()) checkSession();
                else showSignIn(response.errorMessage("Sign-in failed."));
            });
        };
        signIn.setOnClickListener(submit);
        password.setOnEditorActionListener((view, actionId, event) -> {
            if (actionId == EditorInfo.IME_ACTION_DONE) {
                submit.onClick(view);
                return true;
            }
            return false;
        });
        content.addView(signIn);
        content.addView(space(10));
        Button web = secondaryButton("Open Tay on the web");
        web.setOnClickListener(view -> startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(BuildConfig.TAY_WEB_URL))));
        content.addView(web);
        content.addView(space(12));
        content.addView(small("Session tokens are encrypted by Android Keystore. Your password is never saved by this app."));
        setContentView(scroll(content));
        password.requestFocus();
    }

    private void loadProjects() {
        currentProjectId = null;
        showLoading("Loading cloud projects…");
        runApi(api::projects, response -> {
            if (response.status == 401) {
                sessions.clear();
                showSignIn("Your session expired. Sign in again.");
            } else if (response.status == 200 && response.body.optBoolean("ok")) {
                renderProjects(response.body.optJSONArray("projects"));
            } else {
                showUnavailable(response.errorMessage("Projects could not be loaded."), this::loadProjects);
            }
        });
    }

    private void renderProjects(JSONArray projects) {
        LinearLayout content = page();
        content.addView(brand());
        LinearLayout header = new LinearLayout(this);
        header.setGravity(Gravity.CENTER_VERTICAL);
        TextView heading = title("Projects");
        header.addView(heading, new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f));
        Button logout = compactButton("Sign out");
        logout.setOnClickListener(view -> confirmSignOut());
        header.addView(logout);
        content.addView(header);
        content.addView(goldText("Tay Cloud · Connected"));
        content.addView(space(12));

        Button create = primaryButton("New project");
        create.setOnClickListener(view -> showCreateProjectDialog());
        content.addView(create);
        content.addView(space(14));

        if (projects == null || projects.length() == 0) {
            content.addView(body("No projects yet. Create one to begin a cloud-synchronized Tay conversation."));
        } else {
            for (int index = 0; index < projects.length(); index++) {
                JSONObject project = projects.optJSONObject(index);
                if (project == null) continue;
                String id = project.optString("id");
                String name = project.optString("name", "Untitled project");
                String summary = project.optString("summary", "");
                int approvals = project.optInt("pendingApprovals", 0);
                LinearLayout card = panel();
                card.setClickable(true);
                card.setFocusable(true);
                card.setContentDescription("Open project " + name);
                card.addView(cardTitle(name));
                if (!summary.isEmpty()) card.addView(small(summary));
                if (approvals > 0) card.addView(goldText(approvals + " approval" + (approvals == 1 ? "" : "s") + " pending"));
                card.setOnClickListener(view -> openProject(id));
                content.addView(card);
                content.addView(space(10));
            }
        }
        Button web = secondaryButton("Open shared web workspace");
        web.setOnClickListener(view -> startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(BuildConfig.TAY_WEB_URL))));
        content.addView(space(10));
        content.addView(web);
        setContentView(scroll(content));
    }

    private void confirmSignOut() {
        new AlertDialog.Builder(this)
                .setTitle("Sign out everywhere?")
                .setMessage("This revokes the current cloud session before removing it from this phone.")
                .setNegativeButton("Cancel", null)
                .setPositiveButton("Sign out", (dialog, which) -> {
                    showLoading("Revoking session…");
                    runApi(api::signOut, response -> {
                        if (response.status == 200 && response.body.optBoolean("revoked")) {
                            sessions.clear();
                            showSignIn(null);
                        } else {
                            showUnavailable(response.errorMessage("Session revocation could not be confirmed. Your local session was kept."), this::loadProjects);
                        }
                    });
                }).show();
    }

    private void showCreateProjectDialog() {
        LinearLayout form = new LinearLayout(this);
        form.setOrientation(LinearLayout.VERTICAL);
        form.setPadding(dp(20), dp(8), dp(20), 0);
        EditText name = input("Project name");
        name.setSingleLine(true);
        EditText summary = input("What are you building?");
        summary.setSingleLine(false);
        summary.setMinLines(2);
        form.addView(name);
        form.addView(space(10));
        form.addView(summary);
        AlertDialog dialog = new AlertDialog.Builder(this)
                .setTitle("New Tay project")
                .setView(form)
                .setNegativeButton("Cancel", null)
                .setPositiveButton("Create", null)
                .create();
        dialog.setOnShowListener(ignored -> dialog.getButton(AlertDialog.BUTTON_POSITIVE).setOnClickListener(view -> {
            String projectName = name.getText().toString().trim();
            if (projectName.isEmpty()) {
                name.setError("Project name is required.");
                return;
            }
            dialog.dismiss();
            showLoading("Creating cloud project…");
            runApi(() -> api.createProject(projectName, summary.getText().toString().trim()), response -> {
                if (response.status == 200 && response.body.optBoolean("ok")) {
                    openProject(response.body.optString("projectId", ""));
                } else if (response.status == 401) {
                    sessions.clear();
                    showSignIn("Your session expired. Sign in again.");
                } else {
                    showUnavailable(response.errorMessage("The project could not be created."), this::loadProjects);
                }
            });
        }));
        dialog.show();
    }

    private void openProject(String projectId) {
        if (projectId == null || projectId.isEmpty()) {
            toast("This project is missing an identifier.");
            loadProjects();
            return;
        }
        showLoading("Opening project…");
        runApi(() -> api.project(projectId), response -> {
            if (response.status == 401) {
                sessions.clear();
                showSignIn("Your session expired. Sign in again.");
            } else if (response.status == 200 && response.body.optBoolean("ok")) {
                renderProject(response.body);
            } else {
                showUnavailable(response.errorMessage("The project could not be opened."), this::loadProjects);
            }
        });
    }

    private void renderProject(JSONObject state) {
        JSONObject project = state.optJSONObject("project");
        currentProjectId = project == null ? null : project.optString("id", null);
        String projectName = project == null ? "Project" : project.optString("name", "Project");

        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setPadding(dp(14), dp(16), dp(14), dp(12));
        root.setBackgroundColor(BG);

        LinearLayout header = new LinearLayout(this);
        header.setGravity(Gravity.CENTER_VERTICAL);
        Button back = compactButton("Projects");
        back.setOnClickListener(view -> loadProjects());
        header.addView(back);
        TextView heading = cardTitle(projectName);
        heading.setGravity(Gravity.CENTER);
        header.addView(heading, new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f));
        Button refresh = compactButton("Refresh");
        refresh.setOnClickListener(view -> openProject(currentProjectId));
        header.addView(refresh);
        root.addView(header);

        JSONArray approvals = state.optJSONArray("approvals");
        int pending = 0;
        if (approvals != null) {
            for (int index = 0; index < approvals.length(); index++) {
                JSONObject approval = approvals.optJSONObject(index);
                if (approval != null && "pending".equals(approval.optString("status"))) pending++;
            }
        }
        if (pending > 0) {
            TextView notice = goldText(pending + " approval" + (pending == 1 ? "" : "s") + " pending. Open the shared web workspace to review full previews.");
            notice.setPadding(dp(10), dp(10), dp(10), dp(10));
            notice.setOnClickListener(view -> startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(BuildConfig.TAY_WEB_URL))));
            root.addView(notice);
        }

        LinearLayout messages = new LinearLayout(this);
        messages.setOrientation(LinearLayout.VERTICAL);
        messages.setPadding(0, dp(10), 0, dp(10));
        JSONArray entries = state.optJSONArray("messages");
        if (entries == null || entries.length() == 0) {
            messages.addView(body("Start the conversation with Tay."));
        } else {
            for (int index = 0; index < entries.length(); index++) {
                JSONObject entry = entries.optJSONObject(index);
                if (entry == null) continue;
                messages.addView(messageBubble(entry.optString("role", "tay"), entry.optString("text", "")));
                messages.addView(space(8));
            }
        }
        ScrollView messageScroll = new ScrollView(this);
        messageScroll.setFillViewport(true);
        messageScroll.addView(messages);
        root.addView(messageScroll, new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, 0, 1f));
        main.post(() -> messageScroll.fullScroll(View.FOCUS_DOWN));

        LinearLayout composer = new LinearLayout(this);
        composer.setGravity(Gravity.BOTTOM);
        EditText message = input("Message Tay");
        message.setSingleLine(false);
        message.setMaxLines(5);
        message.setMinLines(1);
        message.setInputType(InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_FLAG_CAP_SENTENCES | InputType.TYPE_TEXT_FLAG_MULTI_LINE);
        composer.addView(message, new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f));
        Button send = compactButton("Send");
        LinearLayout.LayoutParams sendParams = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, dp(56));
        sendParams.setMargins(dp(8), 0, 0, 0);
        composer.addView(send, sendParams);
        send.setOnClickListener(view -> {
            String text = message.getText().toString().trim();
            if (text.isEmpty() || currentProjectId == null) return;
            message.setEnabled(false);
            send.setEnabled(false);
            send.setText("…");
            runApi(() -> api.sendMessage(currentProjectId, text), response -> {
                if (response.status == 200 && response.body.optBoolean("ok")) {
                    openProject(currentProjectId);
                } else if (response.status == 401) {
                    sessions.clear();
                    showSignIn("Your session expired. Sign in again.");
                } else {
                    showUnavailable(response.errorMessage("Tay could not send that message."), () -> openProject(currentProjectId));
                }
            });
        });
        root.addView(composer);
        setContentView(root);
        message.requestFocus();
    }

    private void showUnavailable(String detail, Runnable retryAction) {
        LinearLayout content = page();
        content.addView(brand());
        content.addView(title("Tay Cloud is unavailable"));
        content.addView(body(detail));
        content.addView(body("Your Mac is not required. This message means the cloud request could not be completed."));
        Button retry = primaryButton("Try again");
        retry.setOnClickListener(view -> retryAction.run());
        content.addView(retry);
        content.addView(space(8));
        Button web = secondaryButton("Open web workspace");
        web.setOnClickListener(view -> startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(BuildConfig.TAY_WEB_URL))));
        content.addView(web);
        setContentView(scroll(content));
    }

    private void showLoading(String message) {
        LinearLayout root = page();
        root.setGravity(Gravity.CENTER);
        root.addView(new ProgressBar(this));
        root.addView(space(14));
        root.addView(body(message));
        setContentView(root);
    }

    private void runApi(Callable<TayApiClient.ApiResponse> operation, Consumer<TayApiClient.ApiResponse> result) {
        io.submit(() -> {
            try {
                TayApiClient.ApiResponse response = operation.call();
                main.post(() -> result.accept(response));
            } catch (Exception error) {
                main.post(() -> showUnavailable("Could not reach Tay Cloud. Check your internet connection and try again.", this::checkSession));
            }
        });
    }

    private ScrollView scroll(LinearLayout content) {
        ScrollView scroll = new ScrollView(this);
        scroll.setFillViewport(true);
        scroll.setBackgroundColor(BG);
        scroll.addView(content);
        return scroll;
    }

    private LinearLayout page() {
        LinearLayout layout = new LinearLayout(this);
        layout.setOrientation(LinearLayout.VERTICAL);
        layout.setPadding(dp(20), dp(28), dp(20), dp(24));
        layout.setBackgroundColor(BG);
        return layout;
    }

    private LinearLayout panel() {
        LinearLayout layout = new LinearLayout(this);
        layout.setOrientation(LinearLayout.VERTICAL);
        layout.setPadding(dp(16), dp(14), dp(16), dp(14));
        GradientDrawable background = new GradientDrawable();
        background.setColor(PANEL);
        background.setCornerRadius(dp(16));
        background.setStroke(dp(1), Color.argb(125, 238, 197, 91));
        layout.setBackground(background);
        return layout;
    }

    private TextView brand() {
        TextView view = new TextView(this);
        view.setText(R.string.brand_name);
        view.setTextColor(GOLD);
        view.setTextSize(17);
        view.setLetterSpacing(0.16f);
        view.setTypeface(view.getTypeface(), Typeface.BOLD);
        view.setPadding(0, 0, 0, dp(18));
        return view;
    }

    private TextView title(String value) {
        TextView view = new TextView(this);
        view.setText(value);
        view.setTextColor(TEXT);
        view.setTextSize(28);
        view.setTypeface(view.getTypeface(), Typeface.BOLD);
        view.setPadding(0, 0, 0, dp(10));
        return view;
    }

    private TextView cardTitle(String value) {
        TextView view = new TextView(this);
        view.setText(value);
        view.setTextColor(TEXT);
        view.setTextSize(18);
        view.setTypeface(view.getTypeface(), Typeface.BOLD);
        return view;
    }

    private TextView body(String value) {
        TextView view = new TextView(this);
        view.setText(value);
        view.setTextColor(MUTED);
        view.setTextSize(16);
        view.setLineSpacing(0, 1.2f);
        view.setPadding(0, 0, 0, dp(14));
        return view;
    }

    private TextView small(String value) {
        TextView view = new TextView(this);
        view.setText(value);
        view.setTextColor(MUTED);
        view.setTextSize(13);
        view.setPadding(0, dp(4), 0, dp(4));
        return view;
    }

    private TextView goldText(String value) {
        TextView view = small(value);
        view.setTextColor(GOLD);
        return view;
    }

    private TextView errorText(String value) {
        TextView view = body(value);
        view.setTextColor(Color.rgb(255, 151, 151));
        return view;
    }

    private TextView label(String value) {
        TextView view = small(value);
        view.setTextColor(TEXT);
        return view;
    }

    private EditText input(String hint) {
        EditText field = new EditText(this);
        field.setHint(hint);
        field.setHintTextColor(Color.rgb(132, 123, 151));
        field.setTextColor(TEXT);
        field.setTextSize(16);
        field.setMinHeight(dp(56));
        field.setPadding(dp(14), 0, dp(14), 0);
        GradientDrawable background = new GradientDrawable();
        background.setColor(Color.rgb(13, 11, 24));
        background.setCornerRadius(dp(14));
        background.setStroke(dp(1), Color.rgb(65, 56, 83));
        field.setBackground(background);
        return field;
    }

    private Button primaryButton(String value) {
        Button button = button(value);
        GradientDrawable background = new GradientDrawable(GradientDrawable.Orientation.LEFT_RIGHT, new int[]{BLUE, PURPLE});
        background.setCornerRadius(dp(14));
        button.setBackground(background);
        return button;
    }

    private Button secondaryButton(String value) {
        Button button = button(value);
        GradientDrawable background = new GradientDrawable();
        background.setColor(PANEL);
        background.setCornerRadius(dp(14));
        background.setStroke(dp(1), Color.argb(170, 238, 197, 91));
        button.setBackground(background);
        return button;
    }

    private Button compactButton(String value) {
        Button button = secondaryButton(value);
        button.setMinHeight(dp(48));
        button.setPadding(dp(12), 0, dp(12), 0);
        return button;
    }

    private Button button(String value) {
        Button button = new Button(this);
        button.setText(value);
        button.setTextColor(TEXT);
        button.setTextSize(15);
        button.setAllCaps(false);
        button.setMinHeight(dp(56));
        button.setPadding(dp(16), 0, dp(16), 0);
        return button;
    }

    private TextView messageBubble(String role, String value) {
        TextView bubble = new TextView(this);
        bubble.setText(value);
        bubble.setTextColor(TEXT);
        bubble.setTextSize(16);
        bubble.setLineSpacing(0, 1.18f);
        bubble.setPadding(dp(14), dp(12), dp(14), dp(12));
        GradientDrawable background = new GradientDrawable();
        boolean user = "user".equals(role);
        background.setColor(user ? Color.rgb(48, 55, 127) : PANEL);
        background.setCornerRadius(dp(16));
        background.setStroke(dp(1), user ? Color.rgb(86, 112, 245) : Color.rgb(72, 61, 92));
        bubble.setBackground(background);
        LinearLayout.LayoutParams params = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        params.setMargins(user ? dp(38) : 0, 0, user ? 0 : dp(38), 0);
        bubble.setLayoutParams(params);
        return bubble;
    }

    private View space(int height) {
        View view = new View(this);
        view.setLayoutParams(new LinearLayout.LayoutParams(1, dp(height)));
        return view;
    }

    private int dp(int value) {
        return Math.round(value * getResources().getDisplayMetrics().density);
    }

    private void toast(String message) {
        Toast.makeText(this, message, Toast.LENGTH_LONG).show();
    }
}
