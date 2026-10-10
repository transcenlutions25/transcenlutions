package com.transcenlutions.tay;

import org.json.JSONObject;
import org.json.JSONTokener;
import javax.net.ssl.HttpsURLConnection;
import java.io.*;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.Iterator;

/** Read-only integration seam for a reviewed native sign-in adapter. No login, model or sync endpoint. */
final class AuthenticatedIdentityTransport {
    interface SessionProvider { Session current(); }
    static final class Session {
        final String bearer;
        Session(String bearer) { TrustedEndpoint.requireBearer(bearer); this.bearer = bearer; }
    }
    static final class Request {
        private final long deadline = System.nanoTime() + 15000000000L;
        private volatile boolean cancelled;
        private volatile HttpsURLConnection connection;
        void cancel() { cancelled = true; HttpsURLConnection current = connection; if (current != null) current.disconnect(); }
        void check() throws IOException {
            if (cancelled || Thread.currentThread().isInterrupted()) throw new IOException("Cancelled");
            if (System.nanoTime() - deadline >= 0) throw new IOException("Timed out");
        }
    }

    static TrustedEndpoint.Identity verify(TrustedEndpoint endpoint, SessionProvider sessions, Request request) throws Exception {
        Session session = sessions.current();
        if (session == null) throw new IOException("Sign-in is not configured");
        request.check();
        HttpsURLConnection connection = (HttpsURLConnection) endpoint.identityUri.toURL().openConnection();
        request.connection = connection;
        try {
            request.check();
            connection.setInstanceFollowRedirects(false); connection.setUseCaches(false);
            connection.setConnectTimeout(10000); connection.setReadTimeout(10000);
            connection.setRequestMethod("GET");
            connection.setRequestProperty("Authorization", "Bearer " + session.bearer);
            connection.setRequestProperty("Accept", "application/json");
            connection.setRequestProperty("Cache-Control", "no-store");
            int status = connection.getResponseCode();
            if (status != 200) throw new IOException(status == 401 || status == 403 ? "Sign-in required" : "Identity unavailable");
            String type = connection.getContentType();
            if (type == null || !type.split(";", 2)[0].trim().equalsIgnoreCase("application/json"))
                throw new IOException("Invalid identity response");
            ByteArrayOutputStream body = new ByteArrayOutputStream();
            try (InputStream in = connection.getInputStream()) {
                byte[] bytes = new byte[2048]; int count;
                while ((count = in.read(bytes)) != -1) {
                    request.check();
                    if (body.size() + count > 16384) throw new IOException("Identity response too large");
                    body.write(bytes, 0, count);
                }
            }
            request.check();
            if (sessions.current() != session) throw new IOException("Session changed");
            String json = StandardCharsets.UTF_8.newDecoder().onMalformedInput(java.nio.charset.CodingErrorAction.REPORT)
                .onUnmappableCharacter(java.nio.charset.CodingErrorAction.REPORT)
                .decode(java.nio.ByteBuffer.wrap(body.toByteArray())).toString();
            JSONTokener parser = new JSONTokener(json);
            Object parsed = parser.nextValue();
            if (!(parsed instanceof JSONObject) || parser.nextClean() != 0) throw new IOException("Invalid identity JSON");
            JSONObject data = (JSONObject) parsed;
            exactKeys(data, "ok", "authenticated", "identity", "warning");
            if (!Boolean.TRUE.equals(data.opt("ok")) || !Boolean.TRUE.equals(data.opt("authenticated")))
                throw new IOException("Authenticated identity required");
            JSONObject identity = data.getJSONObject("identity");
            exactKeys(identity, "tenantId", "userId", "sessionId", "role", "source");
            TrustedEndpoint.Identity result = new TrustedEndpoint.Identity(string(identity, "tenantId"), string(identity, "userId"),
                string(identity, "sessionId"), string(identity, "role"), string(identity, "source"));
            request.check();
            if (sessions.current() != session) throw new IOException("Session changed");
            return result;
        } finally { connection.disconnect(); request.connection = null; }
    }
    private static String string(JSONObject object, String key) throws IOException {
        Object value = object.opt(key);
        if (!(value instanceof String)) throw new IOException("Invalid identity field");
        return (String) value;
    }
    private static void exactKeys(JSONObject object, String... allowed) throws IOException {
        Iterator<String> keys = object.keys();
        while (keys.hasNext()) if (!Arrays.asList(allowed).contains(keys.next())) throw new IOException("Unexpected identity field");
    }
}
