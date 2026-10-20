package com.transcenlutions.tay;

import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;

final class TayApiClient {
    static final class ApiResponse {
        final int status;
        final JSONObject body;

        ApiResponse(int status, JSONObject body) {
            this.status = status;
            this.body = body;
        }

        String errorMessage(String fallback) {
            String value = body.optString("error", "").trim();
            if (value.isEmpty()) value = body.optString("message", "").trim();
            return value.isEmpty() ? fallback : value;
        }
    }

    private final SecureSessionStore sessions;

    TayApiClient(SecureSessionStore sessions) {
        this.sessions = sessions;
    }

    ApiResponse signIn(String email, String password) throws Exception {
        JSONObject body = new JSONObject();
        body.put("email", email);
        body.put("password", password);
        ApiResponse response = authRequest("/auth/v1/token?grant_type=password", body);
        if (response.status == 200) saveTokens(response.body);
        return response;
    }

    ApiResponse session() throws Exception {
        return apiRequest("GET", "/session", null, true);
    }

    ApiResponse signOut() throws Exception {
        return apiRequest("DELETE", "/session", null, true);
    }

    ApiResponse projects() throws Exception {
        return apiRequest("GET", "/projects", null, true);
    }

    ApiResponse createProject(String name, String summary) throws Exception {
        JSONObject body = new JSONObject();
        body.put("name", name);
        body.put("summary", summary);
        return apiRequest("POST", "/projects", body, true);
    }

    ApiResponse project(String projectId) throws Exception {
        return apiRequest("GET", "/projects/" + projectId, null, true);
    }

    ApiResponse sendMessage(String projectId, String text) throws Exception {
        JSONObject body = new JSONObject();
        body.put("text", text);
        return apiRequest("POST", "/projects/" + projectId + "/messages", body, true);
    }

    private ApiResponse apiRequest(String method, String path, JSONObject body, boolean allowRefresh) throws Exception {
        SecureSessionStore.Tokens tokens = sessions.load();
        if (tokens == null) return error(401, "Sign in to continue.");
        if (allowRefresh && tokens.expiresAt > 0 && tokens.expiresAt <= (System.currentTimeMillis() / 1000L) + 45L) {
            ApiResponse refreshed = refresh(tokens.refreshToken);
            if (refreshed.status != 200) return refreshed;
            tokens = sessions.load();
            if (tokens == null) return error(401, "Your session expired. Sign in again.");
        }
        ApiResponse response = request(method, BuildConfig.TAY_API_BASE + path, body, tokens.accessToken);
        if (response.status == 401 && allowRefresh) {
            ApiResponse refreshed = refresh(tokens.refreshToken);
            if (refreshed.status == 200) return apiRequest(method, path, body, false);
        }
        return response;
    }

    private ApiResponse refresh(String refreshToken) throws Exception {
        JSONObject body = new JSONObject();
        body.put("refresh_token", refreshToken);
        ApiResponse response = authRequest("/auth/v1/token?grant_type=refresh_token", body);
        if (response.status == 200) saveTokens(response.body);
        else sessions.clear();
        return response;
    }

    private ApiResponse authRequest(String path, JSONObject body) throws Exception {
        return request("POST", BuildConfig.SUPABASE_URL + path, body, null);
    }

    private void saveTokens(JSONObject body) {
        String access = body.optString("access_token", "");
        String refresh = body.optString("refresh_token", "");
        long expiresAt = body.optLong("expires_at", 0L);
        if (expiresAt <= 0L) expiresAt = (System.currentTimeMillis() / 1000L) + body.optLong("expires_in", 3600L);
        if (!access.isEmpty() && !refresh.isEmpty()) {
            sessions.save(new SecureSessionStore.Tokens(access, refresh, expiresAt));
        }
    }

    private ApiResponse request(String method, String url, JSONObject payload, String accessToken) throws Exception {
        HttpURLConnection connection = (HttpURLConnection) new URL(url).openConnection();
        connection.setRequestMethod(method);
        connection.setConnectTimeout(20_000);
        connection.setReadTimeout(210_000);
        connection.setInstanceFollowRedirects(false);
        connection.setUseCaches(false);
        connection.setRequestProperty("Accept", "application/json");
        connection.setRequestProperty("Cache-Control", "no-store");
        connection.setRequestProperty("User-Agent", "Transcenlutions-Tay-Android/0.3");
        connection.setRequestProperty("apikey", BuildConfig.SUPABASE_PUBLISHABLE_KEY);
        if (accessToken != null) connection.setRequestProperty("Authorization", "Bearer " + accessToken);

        if (payload != null || "POST".equals(method)) {
            byte[] bytes = (payload == null ? "{}" : payload.toString()).getBytes(StandardCharsets.UTF_8);
            connection.setDoOutput(true);
            connection.setFixedLengthStreamingMode(bytes.length);
            connection.setRequestProperty("Content-Type", "application/json; charset=utf-8");
            connection.getOutputStream().write(bytes);
        }

        int status = connection.getResponseCode();
        InputStream stream = status >= 400 ? connection.getErrorStream() : connection.getInputStream();
        String text = stream == null ? "" : readBounded(stream, 2_000_000);
        connection.disconnect();

        JSONObject body;
        try {
            body = text.isEmpty() ? new JSONObject() : new JSONObject(text);
        } catch (Exception invalidJson) {
            body = new JSONObject();
            body.put("ok", false);
            body.put("error", "Tay Cloud returned an invalid response.");
        }
        if (status >= 300 && status < 400) {
            body.put("ok", false);
            body.put("error", "Tay Cloud redirected unexpectedly.");
        }
        return new ApiResponse(status, body);
    }

    private static ApiResponse error(int status, String message) throws Exception {
        JSONObject body = new JSONObject();
        body.put("ok", false);
        body.put("error", message);
        return new ApiResponse(status, body);
    }

    private static String readBounded(InputStream stream, int maxBytes) throws Exception {
        try (InputStream input = stream; ByteArrayOutputStream output = new ByteArrayOutputStream()) {
            byte[] buffer = new byte[8192];
            int total = 0;
            for (int read; (read = input.read(buffer)) != -1; ) {
                total += read;
                if (total > maxBytes) throw new IllegalStateException("The Tay Cloud response is too large.");
                output.write(buffer, 0, read);
            }
            return output.toString(StandardCharsets.UTF_8.name());
        }
    }
}
