package com.transcenlutions.tay;

import java.io.*;
import java.nio.ByteBuffer;
import java.nio.charset.*;

/** One explicitly device-local scratch draft. It has no account, agent authority or sync cursor. */
public final class LocalDraft {
    public static final int MAX_CHARS = 16000;
    private static final int MAGIC = 0x54415931;
    public final String text;

    public LocalDraft(String text) {
        if (text == null || text.length() > MAX_CHARS) throw new IllegalArgumentException("Draft too large");
        this.text = text;
    }

    public LocalDraft appendSpeech(String speech) {
        if (speech == null) return this;
        if (speech.length() > MAX_CHARS) throw new IllegalArgumentException("Dictation too large");
        if (speech.trim().isEmpty()) return this;
        String separator = text.isEmpty() || Character.isWhitespace(text.charAt(text.length() - 1)) ? "" : "\n";
        if (text.length() + separator.length() + speech.length() > MAX_CHARS) throw new IllegalArgumentException("Draft too large");
        return new LocalDraft(text + separator + speech);
    }

    public byte[] encode() throws IOException {
        ByteBuffer encoded;
        try {
            encoded = StandardCharsets.UTF_8.newEncoder().onMalformedInput(CodingErrorAction.REPORT)
                .onUnmappableCharacter(CodingErrorAction.REPORT).encode(java.nio.CharBuffer.wrap(text));
        } catch (CharacterCodingException e) { throw new IOException("Invalid draft text", e); }
        byte[] bytes = new byte[encoded.remaining()]; encoded.get(bytes);
        ByteArrayOutputStream buffer = new ByteArrayOutputStream();
        DataOutputStream out = new DataOutputStream(buffer);
        out.writeInt(MAGIC); out.writeInt(bytes.length); out.write(bytes); out.flush();
        return buffer.toByteArray();
    }

    public static LocalDraft decode(byte[] bytes) throws IOException {
        if (bytes == null || bytes.length > MAX_CHARS * 4 + 8) throw new IOException("Invalid draft size");
        DataInputStream in = new DataInputStream(new ByteArrayInputStream(bytes));
        if (in.readInt() != MAGIC) throw new IOException("Unsupported draft format");
        int size = in.readInt();
        if (size < 0 || size != in.available()) throw new IOException("Invalid draft length");
        byte[] text = new byte[size]; in.readFully(text);
        try {
            String decoded = StandardCharsets.UTF_8.newDecoder().onMalformedInput(CodingErrorAction.REPORT)
                .onUnmappableCharacter(CodingErrorAction.REPORT).decode(ByteBuffer.wrap(text)).toString();
            return new LocalDraft(decoded);
        } catch (CharacterCodingException | IllegalArgumentException e) { throw new IOException("Invalid draft", e); }
    }
}
