package com.transcenlutions.arcade;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.res.Configuration;
import android.graphics.Color;
import android.graphics.Insets;
import android.net.Uri;
import android.net.http.SslError;
import android.os.Build;
import android.os.Bundle;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.view.WindowInsets;
import android.webkit.CookieManager;
import android.webkit.GeolocationPermissions;
import android.webkit.PermissionRequest;
import android.webkit.RenderProcessGoneDetail;
import android.webkit.ServiceWorkerClient;
import android.webkit.ServiceWorkerController;
import android.webkit.SslErrorHandler;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.window.OnBackInvokedCallback;
import android.window.OnBackInvokedDispatcher;

import androidx.webkit.WebViewAssetLoader;

import java.io.ByteArrayInputStream;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Map;

/** Hosts only the original, bundled arcade. It has no network permission or native JS bridge. */
public final class MainActivity extends Activity {
    private static final String ASSET_HOST = "appassets.androidplatform.net";
    private static final String ASSET_PREFIX = "/assets/www/";
    private static final String HOME_URL = "https://" + ASSET_HOST + ASSET_PREFIX + "index.html";
    private static final int BACKGROUND = Color.rgb(7, 8, 17);
    private static final String PAUSE_SCRIPT =
            "window.dispatchEvent(new CustomEvent('transcenlutions:pause'));";
    private static final String RESUME_SCRIPT =
            "window.dispatchEvent(new CustomEvent('transcenlutions:resume'));";
    private static final String BACK_SCRIPT = "(function(){try{"
            + "var a=window.TranscenlutionsArcade;"
            + "return !!(a&&typeof a.androidBack==='function'&&a.androidBack());"
            + "}catch(e){return false;}})();";

    private FrameLayout container;
    private WebView webView;
    private WebViewAssetLoader assetLoader;
    private boolean foreground;
    private boolean backPending;
    private OnBackInvokedCallback backCallback;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        container = new FrameLayout(this);
        container.setBackgroundColor(BACKGROUND);
        setContentView(container);
        configureInsets();

        WebViewAssetLoader.AssetsPathHandler assets = new WebViewAssetLoader.AssetsPathHandler(this);
        assetLoader = new WebViewAssetLoader.Builder()
                .addPathHandler("/assets/", path -> {
                    WebResourceResponse response = assets.handle(path);
                    if (response == null) return null;
                    // Android's platform MIME map is not consistent for ES modules.
                    if (path.endsWith(".mjs") || path.endsWith(".js")) {
                        response.setMimeType("text/javascript");
                        response.setEncoding("UTF-8");
                    } else if (path.endsWith(".webmanifest")) {
                        response.setMimeType("application/manifest+json");
                        response.setEncoding("UTF-8");
                    } else if (path.endsWith(".svg")) {
                        response.setMimeType("image/svg+xml");
                        response.setEncoding("UTF-8");
                    }
                    Map<String, String> headers = new HashMap<>();
                    headers.put("X-Content-Type-Options", "nosniff");
                    headers.put("Cache-Control", "no-store");
                    response.setResponseHeaders(headers);
                    return response;
                })
                .build();

        configureServiceWorkers();
        createGameView();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            backCallback = this::handleBack;
            getOnBackInvokedDispatcher().registerOnBackInvokedCallback(
                    OnBackInvokedDispatcher.PRIORITY_DEFAULT, backCallback);
        }
    }

    @SuppressWarnings("deprecation")
    private void configureInsets() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            getWindow().setDecorFitsSystemWindows(false);
        } else {
            getWindow().getDecorView().setSystemUiVisibility(
                    View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                            | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                            | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION);
        }
        container.setOnApplyWindowInsetsListener((view, insets) -> {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                Insets safe = insets.getInsets(
                        WindowInsets.Type.systemBars() | WindowInsets.Type.displayCutout());
                view.setPadding(safe.left, safe.top, safe.right, safe.bottom);
                return WindowInsets.CONSUMED;
            }
            view.setPadding(insets.getSystemWindowInsetLeft(), insets.getSystemWindowInsetTop(),
                    insets.getSystemWindowInsetRight(), insets.getSystemWindowInsetBottom());
            return insets.consumeSystemWindowInsets();
        });
        container.requestApplyInsets();
    }

    private void configureServiceWorkers() {
        // The frontend skips service-worker registration in this asset origin. If one is
        // accidentally introduced later, it still cannot reach the network or local files.
        ServiceWorkerController controller = ServiceWorkerController.getInstance();
        controller.getServiceWorkerWebSettings().setAllowContentAccess(false);
        controller.getServiceWorkerWebSettings().setAllowFileAccess(false);
        controller.getServiceWorkerWebSettings().setBlockNetworkLoads(true);
        controller.setServiceWorkerClient(new ServiceWorkerClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebResourceRequest request) {
                return localResponse(request.getUrl());
            }
        });
    }

    @SuppressLint("SetJavaScriptEnabled")
    @SuppressWarnings("deprecation")
    private void createGameView() {
        container.removeAllViews();
        WebView view = new WebView(this);
        webView = view;
        backPending = false;
        view.setBackgroundColor(BACKGROUND);
        view.setImportantForAutofill(View.IMPORTANT_FOR_AUTOFILL_NO_EXCLUDE_DESCENDANTS);
        view.setFocusable(true);
        view.setFocusableInTouchMode(true);
        WebView.setWebContentsDebuggingEnabled(BuildConfig.DEBUG);
        WebSettings settings = view.getSettings();
        // JavaScript executes only the bundled, original game; there is no native bridge.
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        settings.setAllowFileAccessFromFileURLs(false);
        settings.setAllowUniversalAccessFromFileURLs(false);
        settings.setBlockNetworkLoads(true);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setJavaScriptCanOpenWindowsAutomatically(false);
        settings.setSupportMultipleWindows(false);
        settings.setGeolocationEnabled(false);
        settings.setSaveFormData(false);
        settings.setMediaPlaybackRequiresUserGesture(true);
        settings.setBuiltInZoomControls(true);
        settings.setDisplayZoomControls(false);
        CookieManager.getInstance().setAcceptCookie(false);
        CookieManager.getInstance().setAcceptThirdPartyCookies(view, false);

        view.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onPermissionRequest(PermissionRequest request) {
                request.deny();
            }

            @Override
            public void onGeolocationPermissionsShowPrompt(String origin,
                    GeolocationPermissions.Callback callback) {
                callback.invoke(origin, false, false);
            }

            @Override
            public boolean onShowFileChooser(WebView source, ValueCallback<Uri[]> callback,
                    FileChooserParams params) {
                callback.onReceiveValue(null);
                return true;
            }
        });
        view.setWebViewClient(new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView source,
                    WebResourceRequest request) {
                return localResponse(request.getUrl());
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView source, WebResourceRequest request) {
                return !isLocalAsset(request.getUrl());
            }

            @Override
            public void onPageFinished(WebView source, String url) {
                if (source == webView && isLocalAsset(Uri.parse(url))) {
                    source.evaluateJavascript(foreground ? RESUME_SCRIPT : PAUSE_SCRIPT, null);
                }
            }

            @Override
            public void onReceivedError(WebView source, WebResourceRequest request,
                    WebResourceError error) {
                if (request.isForMainFrame()) showRecovery(source);
            }

            @Override
            public void onReceivedHttpError(WebView source, WebResourceRequest request,
                    WebResourceResponse response) {
                if (request.isForMainFrame()) showRecovery(source);
            }

            @Override
            public void onReceivedSslError(WebView source, SslErrorHandler handler,
                    SslError error) {
                handler.cancel();
            }

            @Override
            public boolean onRenderProcessGone(WebView source, RenderProcessGoneDetail detail) {
                showRecovery(source);
                return true;
            }
        });

        container.addView(view, new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
        if (foreground) {
            view.resumeTimers();
            view.onResume();
        }
        view.loadUrl(HOME_URL);
    }

    private static boolean isLocalAsset(Uri uri) {
        if (!"https".equals(uri.getScheme()) || !ASSET_HOST.equals(uri.getHost())
                || uri.getPort() != -1 || uri.getUserInfo() != null) return false;
        String path = uri.getPath();
        if (path == null || !path.startsWith(ASSET_PREFIX) || path.indexOf('\\') >= 0
                || path.indexOf('\0') >= 0) return false;
        for (String segment : path.split("/")) {
            if ("..".equals(segment) || ".".equals(segment)) return false;
        }
        return true;
    }

    private WebResourceResponse localResponse(Uri uri) {
        if (!isLocalAsset(uri)) return denial(403, "Forbidden");
        WebResourceResponse response = assetLoader.shouldInterceptRequest(uri);
        return response != null ? response : denial(404, "Not Found");
    }

    private static WebResourceResponse denial(int code, String reason) {
        byte[] message = "This offline arcade only opens its bundled game files."
                .getBytes(StandardCharsets.UTF_8);
        Map<String, String> headers = new HashMap<>();
        headers.put("Cache-Control", "no-store");
        headers.put("X-Content-Type-Options", "nosniff");
        return new WebResourceResponse("text/plain", "UTF-8", code, reason, headers,
                new ByteArrayInputStream(message));
    }

    private void showRecovery(WebView source) {
        if (source != webView || isFinishing() || isDestroyed()) return;
        webView = null;
        backPending = false;
        container.removeView(source);
        source.destroy();
        LinearLayout panel = new LinearLayout(this);
        panel.setOrientation(LinearLayout.VERTICAL);
        panel.setGravity(Gravity.CENTER);
        int spacing = Math.round(24 * getResources().getDisplayMetrics().density);
        panel.setPadding(spacing, spacing, spacing, spacing);
        TextView message = new TextView(this);
        message.setText(R.string.recovery_message);
        message.setTextColor(Color.WHITE);
        message.setTextSize(22);
        message.setGravity(Gravity.CENTER);
        panel.addView(message);
        Button retry = new Button(this);
        retry.setText(R.string.reopen_arcade);
        retry.setOnClickListener(ignored -> createGameView());
        panel.addView(retry);
        container.addView(panel, new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
    }

    private void handleBack() {
        WebView current = webView;
        if (current == null) {
            finish();
            return;
        }
        if (backPending) return;
        backPending = true;
        current.evaluateJavascript(BACK_SCRIPT, result -> {
            backPending = false;
            if (current != webView || isFinishing() || isDestroyed()) return;
            if ("true".equals(result)) return;
            if (current.canGoBack()) current.goBack();
            else finish();
        });
    }

    @Override
    @SuppressWarnings("deprecation")
    public void onBackPressed() {
        handleBack();
    }

    @Override
    protected void onResume() {
        super.onResume();
        foreground = true;
        if (webView != null) {
            webView.resumeTimers();
            webView.onResume();
            webView.evaluateJavascript(RESUME_SCRIPT, null);
        }
    }

    @Override
    protected void onPause() {
        foreground = false;
        WebView current = webView;
        if (current != null) {
            current.evaluateJavascript(PAUSE_SCRIPT, result -> {
                if (!foreground && current == webView) current.pauseTimers();
            });
            current.onPause();
        }
        super.onPause();
    }

    @Override
    public void onConfigurationChanged(Configuration configuration) {
        super.onConfigurationChanged(configuration);
        container.requestApplyInsets();
    }

    @Override
    protected void onDestroy() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU && backCallback != null) {
            getOnBackInvokedDispatcher().unregisterOnBackInvokedCallback(backCallback);
        }
        if (webView != null) {
            WebView previous = webView;
            webView = null;
            container.removeView(previous);
            previous.destroy();
        }
        super.onDestroy();
    }
}
