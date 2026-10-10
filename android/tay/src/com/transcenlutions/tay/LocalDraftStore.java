package com.transcenlutions.tay;

import android.content.Context;
import android.util.AtomicFile;
import java.io.*;

/** App-private no-backup storage. No import into an authenticated account is permitted here. */
final class LocalDraftStore {
    private final AtomicFile file;
    private boolean readable;
    LocalDraftStore(Context context) {
        file = new AtomicFile(new File(context.getNoBackupFilesDir(), "local-draft-v1.bin"));
    }
    synchronized LocalDraft read() throws IOException {
        readable = false;
        try (InputStream in = file.openRead(); ByteArrayOutputStream bytes = new ByteArrayOutputStream()) {
            byte[] buffer = new byte[4096]; int count;
            while ((count = in.read(buffer)) != -1) {
                if (bytes.size() + count > LocalDraft.MAX_CHARS * 4 + 8) throw new IOException("Draft too large");
                bytes.write(buffer, 0, count);
            }
            LocalDraft result = LocalDraft.decode(bytes.toByteArray()); readable = true; return result;
        } catch (FileNotFoundException e) {
            // Missing is empty; existing but unreadable/corrupt must never be overwritten.
            if (file.getBaseFile().exists()) throw e;
            readable = true; return new LocalDraft("");
        }
    }
    synchronized void save(LocalDraft draft) throws IOException {
        if (!readable) throw new IOException("Stored draft could not be safely read");
        byte[] bytes = draft.encode(); FileOutputStream out = null;
        try {
            out = file.startWrite(); out.write(bytes); out.getFD().sync(); file.finishWrite(out); out = null;
            if (!read().text.equals(draft.text)) throw new IOException("Draft commit was not confirmed");
        }
        catch (IOException | RuntimeException e) { if (out != null) file.failWrite(out); throw e; }
    }
}
