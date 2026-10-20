package com.transcenlutions.tay;

import android.net.Uri;

import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;

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
            return value.isEmpty() ? fallback : value;
        }
    }

    private final String baseUrl;
    private final SecureSessionStore sessions;

    TayApiClient(String baseUrl, SecureSessionStore sessions) {
        this.baseUrl = baseUrl.endsWith("/") ? baseUrl.substring(0, baseUrl.length() - 1) : baseUrl;
        this.sessions = sessions;
    }

    ApiResponse session() throws Exception {
        return request("GET", "/api/tay/session", null, 30_000);
    }

    ApiResponse signIn(String email, String password) throws Exception {
        JSONObject body = new JSONObject();
        body.put("email", email);
        body.put("password", password);
        return request("POST", "/api/tay/session", body, 30_000);
    }

    ApiResponse signOut() throws Exception {
        return request("DELETE", "/api/tay/session", null, 30_000);
    }

    ApiResponse projects() throws Exception {
        return request("GET", "/api/tay/projects", null, 30_000);
    }

    ApiResponse createProject(String name, String summary) throws Exception {
        JSONObject body = new JSONObject();
        body.put("name", name);
        body.put("summary", summary);
        return request("POST", "/api/tay/projects", body, 30_000);
    }

    ApiResponse project(String projectId, String conversationId) throws Exception {
        String path = "/api/tay/projects/" + Uri.encode(projectId);
        if (conversationId != null && !conversationId.isEmpty()) {
            path += "?conversationId=" + Uri.encode(conversationId);
        }
        return request("GET", path, null, 30_000);
    }

    ApiResponse sendMessage(String projectId, String conversationId, String text) throws Exception {
        JSONObject body = new JSONObject();
        body.put("conversationId", conversationId);
        body.put("text", text);
        body.put("agentId", "tay");
        return request("POST", "/api/tay/projects/" + Uri.encode(projectId) + "/messages", body, 210_000);
    }

    private ApiResponse request(String method, String path, JSONObject payload, int readTimeout) throws Exception {
        HttpURLConnection connection = (HttpURLConnection) new URL(baseUrl + path).openConnection();
        connection.setRequestMethod(method);
        connection.setConnectTimeout(15_000);
        connection.setReadTimeout(readTimeout);
        connection.setInstanceFollowRedirects(false);
        connection.setUseCaches(false);
        connection.setRequestProperty("Accept", "application/json");
        connection.setRequestProperty("Cache-Control", "no-store");
        connection.setRequestProperty("User-Agent", "Transcenlutions-Tay-Android/0.1");
        String cookie = sessions.loadCookie();
        if (cookie != null) connection.setRequestProperty("Cookie", cookie);

        if (payload != null) {
            byte[] bytes = payload.toString().getBytes(StandardCharsets.UTF_8);
            connection.setDoOutput(true);
            connection.setFixedLengthStreamingMode(bytes.length);
            connection.setRequestProperty("Content-Type", "application/json; charset=utf-8");
            connection.getOutputStream().write(bytes);
        }

        int status = connection.getResponseCode();
        captureSessionCookie(connection.getHeaderFields());
        InputStream stream = status >= 400 ? connection.getErrorStream() : connection.getInputStream();
        String text = stream == null ? "" : readBounded(stream, 2_000_000);
        connection.disconnect();

        JSONObject body;
        try {
            body = text.isEmpty() ? new JSONObject() : new JSONObject(text);
        } catch (Exception invalidJson) {
            body = new JSONObject();
            body.put("ok", false);
            body.put("error", "The Tay server returned an invalid response.");
        }
        if (status == 401) sessions.clear();
        if (status >= 300 && status < 400) {
            body.put("ok", false);
            body.put("error", "The Tay server redirected unexpectedly. Check the configured server URL.");
        }
        return new ApiResponse(status, body);
    }

    private void captureSessionCookie(Map<String, List<String>> headers) {
        for (Map.Entry<String, List<String>> entry : headers.entrySet()) {
            if (entry.getKey() == null || !"set-cookie".equalsIgnoreCase(entry.getKey())) continue;
            for (String header : entry.getValue()) {
                if (header == null) continue;
                int start = header.indexOf("tay_session=");
                if (start < 0) continue;
                int end = header.indexOf(';', start);
                String pair = (end < 0 ? header.substring(start) : header.substring(start, end)).trim();
                if ("tay_session=".equals(pair)) sessions.clear();
                else sessions.saveCookie(pair);
            }
        }
    }

    private static String readBounded(InputStream stream, int maxBytes) throws Exception {
        try (InputStream input = stream; ByteArrayOutputStream output = new ByteArrayOutputStream()) {
            byte[] buffer = new byte[8192];
            int total = 0;
            for (int read; (read = input.read(buffer)) != -1; ) {
                total += read;
                if (total > maxBytes) throw new IllegalStateException("The Tay server response is too large.");
                output.write(buffer, 0, read);
            }
            return output.toString(StandardCharsets.UTF_8.name());
        }
    }
}
