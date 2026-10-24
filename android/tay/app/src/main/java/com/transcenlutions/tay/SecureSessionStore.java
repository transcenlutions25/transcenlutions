package com.transcenlutions.tay;

import android.content.Context;
import android.content.SharedPreferences;
import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyProperties;
import android.util.Base64;

import org.json.JSONObject;

import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.security.KeyStore;

import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;

final class SecureSessionStore {
    static final class Tokens {
        final String accessToken;
        final String refreshToken;
        final long expiresAt;

        Tokens(String accessToken, String refreshToken, long expiresAt) {
            this.accessToken = accessToken;
            this.refreshToken = refreshToken;
            this.expiresAt = expiresAt;
        }
    }

    private static final String KEY_ALIAS = "transcenlutions_tay_cloud_session_v1";
    private static final String PREFS = "tay_cloud_secure_session";
    private static final String VALUE = "encrypted_tokens";
    private final SharedPreferences preferences;

    SecureSessionStore(Context context) {
        preferences = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    synchronized void save(Tokens tokens) {
        if (tokens == null || tokens.accessToken == null || tokens.refreshToken == null
                || tokens.accessToken.length() > 16_384 || tokens.refreshToken.length() > 4_096) {
            clear();
            return;
        }
        try {
            JSONObject value = new JSONObject();
            value.put("accessToken", tokens.accessToken);
            value.put("refreshToken", tokens.refreshToken);
            value.put("expiresAt", tokens.expiresAt);
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.ENCRYPT_MODE, key());
            byte[] iv = cipher.getIV();
            byte[] encrypted = cipher.doFinal(value.toString().getBytes(StandardCharsets.UTF_8));
            ByteBuffer buffer = ByteBuffer.allocate(4 + iv.length + encrypted.length);
            buffer.putInt(iv.length).put(iv).put(encrypted);
            preferences.edit().putString(VALUE, Base64.encodeToString(buffer.array(), Base64.NO_WRAP)).apply();
        } catch (Exception error) {
            clear();
        }
    }

    synchronized Tokens load() {
        String encoded = preferences.getString(VALUE, null);
        if (encoded == null) return null;
        try {
            ByteBuffer buffer = ByteBuffer.wrap(Base64.decode(encoded, Base64.NO_WRAP));
            int ivLength = buffer.getInt();
            if (ivLength < 12 || ivLength > 32 || buffer.remaining() <= ivLength) {
                throw new IllegalStateException("Invalid encrypted session.");
            }
            byte[] iv = new byte[ivLength];
            buffer.get(iv);
            byte[] encrypted = new byte[buffer.remaining()];
            buffer.get(encrypted);
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.DECRYPT_MODE, key(), new GCMParameterSpec(128, iv));
            JSONObject value = new JSONObject(new String(cipher.doFinal(encrypted), StandardCharsets.UTF_8));
            String access = value.optString("accessToken", "");
            String refresh = value.optString("refreshToken", "");
            long expiresAt = value.optLong("expiresAt", 0L);
            if (access.isEmpty() || refresh.isEmpty() || access.length() > 16_384 || refresh.length() > 4_096) {
                throw new IllegalStateException("Invalid session tokens.");
            }
            return new Tokens(access, refresh, expiresAt);
        } catch (Exception error) {
            clear();
            return null;
        }
    }

    synchronized void clear() {
        preferences.edit().remove(VALUE).apply();
    }

    private SecretKey key() throws Exception {
        KeyStore keyStore = KeyStore.getInstance("AndroidKeyStore");
        keyStore.load(null);
        KeyStore.Entry existing = keyStore.getEntry(KEY_ALIAS, null);
        if (existing instanceof KeyStore.SecretKeyEntry) {
            return ((KeyStore.SecretKeyEntry) existing).getSecretKey();
        }
        KeyGenerator generator = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore");
        generator.init(new KeyGenParameterSpec.Builder(
                KEY_ALIAS,
                KeyProperties.PURPOSE_ENCRYPT | KeyProperties.PURPOSE_DECRYPT)
                .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
                .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
                .setRandomizedEncryptionRequired(true)
                .build());
        return generator.generateKey();
    }
}
