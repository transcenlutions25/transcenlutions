package com.transcenlutions.tay;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.Context;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.graphics.drawable.GradientDrawable;
import android.net.Uri;
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
    private SharedPreferences settings;
    private SecureSessionStore sessions;
    private TayApiClient api;
    private String baseUrl = "";
    private String currentProjectId;
    private String currentConversationId;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().setStatusBarColor(BG);
        getWindow().setNavigationBarColor(BG);
        settings = getSharedPreferences("tay_settings", Context.MODE_PRIVATE);
        sessions = new SecureSessionStore(this);
        baseUrl = settings.getString("base_url", BuildConfig.DEFAULT_BASE_URL).trim();
        if (baseUrl.isEmpty()) showServerSetup(null);
        else {
            api = new TayApiClient(baseUrl, sessions);
            checkSession();
        }
    }

    @Override
    protected void onDestroy() {
        io.shutdownNow();
        super.onDestroy();
    }

    @Override
    public void onBackPressed() {
        if (currentProjectId != null) {
            currentProjectId = null;
            currentConversationId = null;
            loadProjects();
        } else {
            super.onBackPressed();
        }
    }

    private void checkSession() {
        showLoading("Connecting to Tay…");
        runApi(api::session, response -> {
            if (response.status == 200 && response.body.optJSONObject("session") != null) loadProjects();
            else if (response.status == 503) showUnavailable(response.errorMessage("Tay storage is unavailable on this server."));
            else showSignIn(response.status == 200 ? null : response.errorMessage("Sign in to continue."));
        });
    }

    private void showServerSetup(String error) {
        currentProjectId = null;
        currentConversationId = null;
        LinearLayout content = verticalPage();
        content.addView(brand());
        content.addView(title("Connect Tay"));
        content.addView(body("Enter the HTTPS address of the Transcenlutions Tay server. This app uses the same account, projects, conversations, memory, approvals, and artifacts as the web workspace when that backend is configured."));
        if (error != null) content.addView(errorText(error));

        EditText server = input("https://tay.example.com");
        server.setInputType(InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_VARIATION_URI);
        server.setText(baseUrl);
        content.addView(label("Server URL"));
        content.addView(server);
        content.addView(spacer(14));
        Button connect = primaryButton("Continue");
        connect.setOnClickListener(view -> {
            String normalized = normalizeServer(server.getText().toString());
            if (normalized == null) {
                showToast(BuildConfig.DEBUG ? "Enter an HTTPS URL, or an HTTP URL for local debug use." : "Enter an HTTPS server URL.");
                return;
            }
            if (!normalized.equals(baseUrl)) sessions.clear();
            baseUrl = normalized;
            settings.edit().putString("base_url", baseUrl).apply();
            api = new TayApiClient(baseUrl, sessions);
            checkSession();
        });
        content.addView(connect);
        setContentView(scrollPage(content));
    }

    private void showSignIn(String error) {
        currentProjectId = null;
        currentConversationId = null;
        LinearLayout content = verticalPage();
        content.addView(brand());
        content.addView(title("Sign in to Tay"));
        content.addView(body("Use the same Transcenlutions account as the web workspace."));
        TextView server = small("Server: " + baseUrl);
        content.addView(server);
        if (error != null) content.addView(errorText(error));

        EditText email = input("you@example.com");
        email.setInputType(InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_VARIATION_EMAIL_ADDRESS);
        email.setAutofillHints(View.AUTOFILL_HINT_EMAIL_ADDRESS);
        content.addView(label("Email"));
        content.addView(email);
        content.addView(spacer(12));

        EditText password = input("Password");
        password.setInputType(InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_VARIATION_PASSWORD);
        password.setTransformationMethod(PasswordTransformationMethod.getInstance());
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
            password.setTransformationMethod(visible[0] ? HideReturnsTransformationMethod.getInstance() : PasswordTransformationMethod.getInstance());
            eye.setImageResource(visible[0] ? R.drawable.ic_visibility_off : R.drawable.ic_visibility);
            eye.setContentDescription(getString(visible[0] ? R.string.hide_password : R.string.show_password));
            password.setSelection(password.length());
        });
        FrameLayout passwordFrame = new FrameLayout(this);
        passwordFrame.addView(password, new FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, dp(56)));
        FrameLayout.LayoutParams eyeParams = new FrameLayout.LayoutParams(dp(54), dp(54), Gravity.END | Gravity.CENTER_VERTICAL);
        passwordFrame.addView(eye, eyeParams);
        content.addView(label("Password"));
        content.addView(passwordFrame);
        content.addView(spacer(16));

        Button signIn = primaryButton("Sign in");
        View.OnClickListener submit = view -> {
            String emailValue = email.getText().toString().trim();
            String passwordValue = password.getText().toString();
            if (emailValue.isEmpty() || passwordValue.length() < 12) {
                showToast("Enter a valid email and a password of at least 12 characters.");
                return;
            }
            signIn.setEnabled(false);
            signIn.setText("Signing in…");
            runApi(() -> api.signIn(emailValue, passwordValue), response -> {
                password.setText("");
                if (response.status == 200 && response.body.optBoolean("ok")) loadProjects();
                else if (response.status == 503) showUnavailable(response.errorMessage("Tay storage is unavailable on this server."));
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
        Button change = secondaryButton("Change server");
        change.setOnClickListener(view -> showServerSetup(null));
        content.addView(spacer(8));
        content.addView(change);
        setContentView(scrollPage(content));
        email.requestFocus();
    }

    private void loadProjects() {
        currentProjectId = null;
        currentConversationId = null;
        showLoading("Loading projects…");
        runApi(api::projects, response -> {
            if (response.status == 401) {
                showSignIn("Your session expired. Sign in again.");
                return;
            }
            if (response.status == 503) {
                showUnavailable(response.errorMessage("Tay storage is unavailable on this server."));
                return;
            }
            if (response.status != 200 || !response.body.optBoolean("ok")) {
                showUnavailable(response.errorMessage("Projects could not be loaded."));
                return;
            }
            renderProjects(response.body.optJSONArray("projects"));
        });
    }

    private void renderProjects(JSONArray projects) {
        LinearLayout content = verticalPage();
        LinearLayout header = new LinearLayout(this);
        header.setGravity(Gravity.CENTER_VERTICAL);
        TextView heading = title("Projects");
        header.addView(heading, new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f));
        Button logout = compactButton("Sign out");
        logout.setOnClickListener(view -> runApi(api::signOut, response -> {
            sessions.clear();
            showSignIn(null);
        }));
        header.addView(logout);
        content.addView(brand());
        content.addView(header);
        content.addView(small("Native Tay · " + baseUrl));
        content.addView(spacer(12));

        Button create = primaryButton("New project");
        create.setOnClickListener(view -> showCreateProjectDialog());
        content.addView(create);
        content.addView(spacer(14));

        if (projects == null || projects.length() == 0) {
            content.addView(body("No projects yet. Create one to begin a synchronized Tay conversation."));
        } else {
            for (int index = 0; index < projects.length(); index++) {
                JSONObject project = projects.optJSONObject(index);
                if (project == null) continue;
                String id = project.optString("id");
                String conversationId = project.optString("conversationId", "");
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
                card.setOnClickListener(view -> openProject(id, conversationId));
                content.addView(card);
                content.addView(spacer(10));
            }
        }
        Button change = secondaryButton("Server settings");
        change.setOnClickListener(view -> showServerSetup(null));
        content.addView(spacer(10));
        content.addView(change);
        setContentView(scrollPage(content));
    }

    private void showCreateProjectDialog() {
        LinearLayout form = new LinearLayout(this);
        form.setOrientation(LinearLayout.VERTICAL);
        form.setPadding(dp(20), dp(8), dp(20), 0);
        EditText name = input("Project name");
        EditText summary = input("What are you building?");
        form.addView(name);
        form.addView(spacer(10));
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
            showLoading("Creating project…");
            runApi(() -> api.createProject(projectName, summary.getText().toString().trim()), response -> {
                if (response.status == 200 && response.body.optBoolean("ok")) {
                    JSONObject project = response.body.optJSONObject("project");
                    openProject(project == null ? "" : project.optString("id"), response.body.optString("conversationId", ""));
                } else if (response.status == 401) showSignIn("Your session expired. Sign in again.");
                else showUnavailable(response.errorMessage("The project could not be created."));
            });
        }));
        dialog.show();
    }

    private void openProject(String projectId, String conversationId) {
        if (projectId == null || projectId.isEmpty()) {
            showToast("This project is missing an identifier.");
            loadProjects();
            return;
        }
        showLoading("Opening project…");
        runApi(() -> api.project(projectId, conversationId), response -> {
            if (response.status == 401) showSignIn("Your session expired. Sign in again.");
            else if (response.status == 503) showUnavailable(response.errorMessage("Tay storage is unavailable on this server."));
            else if (response.status == 200 && response.body.optBoolean("ok")) renderProject(response.body);
            else {
                showToast(response.errorMessage("The project could not be opened."));
                loadProjects();
            }
        });
    }

    private void renderProject(JSONObject state) {
        JSONObject project = state.optJSONObject("project");
        JSONObject conversation = state.optJSONObject("conversation");
        currentProjectId = project == null ? null : project.optString("id", null);
        currentConversationId = conversation == null ? null : conversation.optString("id", null);
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
        refresh.setOnClickListener(view -> openProject(currentProjectId, currentConversationId));
        header.addView(refresh);
        root.addView(header);

        JSONArray approvals = state.optJSONArray("approvals");
        int pending = 0;
        if (approvals != null) {
            for (int i = 0; i < approvals.length(); i++) {
                JSONObject approval = approvals.optJSONObject(i);
                if (approval != null && "pending".equals(approval.optString("status"))) pending++;
            }
        }
        if (pending > 0) {
            TextView notice = goldText(pending + " approval" + (pending == 1 ? "" : "s") + " pending. Approval decisions remain available in the web workspace during this Android alpha.");
            notice.setPadding(dp(10), dp(10), dp(10), dp(10));
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
                messages.addView(spacer(8));
            }
        }
        ScrollView scroll = new ScrollView(this);
        scroll.setFillViewport(true);
        scroll.addView(messages);
        root.addView(scroll, new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, 0, 1f));
        main.post(() -> scroll.fullScroll(View.FOCUS_DOWN));

        LinearLayout composer = new LinearLayout(this);
        composer.setGravity(Gravity.BOTTOM);
        EditText message = input("Message Tay");
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
            if (text.isEmpty() || currentProjectId == null || currentConversationId == null) return;
            message.setEnabled(false);
            send.setEnabled(false);
            send.setText("…");
            runApi(() -> api.sendMessage(currentProjectId, currentConversationId, text), response -> {
                if (response.status == 200 && response.body.optBoolean("ok")) openProject(currentProjectId, currentConversationId);
                else if (response.status == 401) showSignIn("Your session expired. Sign in again.");
                else {
                    showToast(response.errorMessage("Tay could not send that message."));
                    openProject(currentProjectId, currentConversationId);
                }
            });
        });
        root.addView(composer);
        setContentView(root);
        message.requestFocus();
    }

    private void showUnavailable(String detail) {
        currentProjectId = null;
        currentConversationId = null;
        LinearLayout content = verticalPage();
        content.addView(brand());
        content.addView(title("Tay is temporarily unavailable"));
        content.addView(body(detail));
        content.addView(body("This Android app will use the same account and project data as the web and desktop clients once the configured server has durable workspace storage. It will not create a separate unsynchronized account."));
        Button retry = primaryButton("Try again");
        retry.setOnClickListener(view -> checkSession());
        content.addView(retry);
        content.addView(spacer(8));
        Button change = secondaryButton("Change server");
        change.setOnClickListener(view -> showServerSetup(null));
        content.addView(change);
        setContentView(scrollPage(content));
    }

    private void showLoading(String message) {
        LinearLayout root = verticalPage();
        root.setGravity(Gravity.CENTER);
        ProgressBar progress = new ProgressBar(this);
        root.addView(progress);
        root.addView(spacer(14));
        root.addView(body(message));
        setContentView(root);
    }

    private void runApi(Callable<TayApiClient.ApiResponse> operation, Consumer<TayApiClient.ApiResponse> result) {
        io.submit(() -> {
            try {
                TayApiClient.ApiResponse response = operation.call();
                main.post(() -> result.accept(response));
            } catch (Exception error) {
                main.post(() -> showUnavailable("Could not reach the configured Tay server. Check the address and your connection."));
            }
        });
    }

    private String normalizeServer(String value) {
        String candidate = value == null ? "" : value.trim();
        while (candidate.endsWith("/")) candidate = candidate.substring(0, candidate.length() - 1);
        try {
            Uri uri = Uri.parse(candidate);
            String scheme = uri.getScheme();
            String host = uri.getHost();
            if (host == null || host.trim().isEmpty() || uri.getUserInfo() != null || uri.getQuery() != null || uri.getFragment() != null) return null;
            if ("https".equalsIgnoreCase(scheme)) return uri.buildUpon().path("").build().toString().replaceAll("/$", "");
            if (BuildConfig.DEBUG && "http".equalsIgnoreCase(scheme)) return uri.buildUpon().path("").build().toString().replaceAll("/$", "");
            return null;
        } catch (Exception error) {
            return null;
        }
    }

    private ScrollView scrollPage(LinearLayout content) {
        ScrollView scroll = new ScrollView(this);
        scroll.setFillViewport(true);
        scroll.setBackgroundColor(BG);
        scroll.addView(content);
        return scroll;
    }

    private LinearLayout verticalPage() {
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
        view.setText("TRANSCENLUTIONS");
        view.setTextColor(GOLD);
        view.setTextSize(17);
        view.setLetterSpacing(0.16f);
        view.setTypeface(view.getTypeface(), 1);
        view.setPadding(0, 0, 0, dp(18));
        return view;
    }

    private TextView title(String value) {
        TextView view = new TextView(this);
        view.setText(value);
        view.setTextColor(TEXT);
        view.setTextSize(28);
        view.setTypeface(view.getTypeface(), 1);
        view.setPadding(0, 0, 0, dp(10));
        return view;
    }

    private TextView cardTitle(String value) {
        TextView view = new TextView(this);
        view.setText(value);
        view.setTextColor(TEXT);
        view.setTextSize(18);
        view.setTypeface(view.getTypeface(), 1);
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
        field.setSingleLine(false);
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
        background.setColor("user".equals(role) ? Color.rgb(48, 55, 127) : PANEL);
        background.setCornerRadius(dp(16));
        background.setStroke(dp(1), "user".equals(role) ? Color.rgb(86, 112, 245) : Color.rgb(72, 61, 92));
        bubble.setBackground(background);
        LinearLayout.LayoutParams params = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        params.setMargins("user".equals(role) ? dp(38) : 0, 0, "user".equals(role) ? 0 : dp(38), 0);
        bubble.setLayoutParams(params);
        return bubble;
    }

    private View spacer(int height) {
        View view = new View(this);
        view.setLayoutParams(new LinearLayout.LayoutParams(1, dp(height)));
        return view;
    }

    private int dp(int value) {
        return Math.round(value * getResources().getDisplayMetrics().density);
    }

    private void showToast(String message) {
        Toast.makeText(this, message, Toast.LENGTH_LONG).show();
    }
}
