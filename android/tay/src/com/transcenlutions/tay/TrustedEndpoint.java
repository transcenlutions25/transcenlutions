package com.transcenlutions.tay;

import java.net.URI;
import java.util.Arrays;

/** App-reviewed origin, never supplied by chat text, deep links, QR codes or user token entry. */
public final class TrustedEndpoint {
    public static final String CANONICAL_ORIGIN = "https://tay-command.netlify.app";
    public final URI identityUri;
    public TrustedEndpoint(String configuredOrigin) {
        if (!CANONICAL_ORIGIN.equals(configuredOrigin)) throw new IllegalArgumentException("Trusted backend is not configured");
        identityUri = URI.create(configuredOrigin + "/api/platform/identity");
    }

    /** Values must come from the HTTPS identity response, never local storage or role claims. */
    public static final class Identity {
        public final String tenantId, userId, sessionId;
        public Identity(String tenant, String user, String session, String role, String source) {
            if (!id(tenant) || !id(user) || !id(session) || !"authenticated".equals(source)
                || !Arrays.asList("owner", "admin", "member", "learner", "child").contains(role))
                throw new IllegalArgumentException("Authenticated identity required");
            tenantId = tenant; userId = user; sessionId = session;
        }
        private static boolean id(String value) { return value != null && value.matches("[a-zA-Z0-9_-]{1,128}"); }
        public boolean sameSession(Identity other) {
            return other != null && tenantId.equals(other.tenantId) && userId.equals(other.userId) && sessionId.equals(other.sessionId);
        }
    }
    public static void requireBearer(String value) {
        // A session token is acquired by a future reviewed auth adapter, not generated or persisted here.
        if (value == null || value.length() < 1 || value.length() > 8192 || !value.matches("[A-Za-z0-9._~+/-]+=*"))
            throw new IllegalArgumentException("Session credential unavailable");
    }
}
