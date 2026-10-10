package com.transcenlutions.tay;

import java.io.*;
import java.util.Arrays;

public final class NativeCoreTest {
    interface Checked { void run() throws Exception; }
    private static int count;
    private static void test(String name, Checked action) throws Exception { action.run(); count++; System.out.println("PASS " + name); }
    private static void equal(Object a, Object b) { if (!a.equals(b)) throw new AssertionError(a + " != " + b); }
    private static void yes(boolean value) { if (!value) throw new AssertionError(); }
    private static void reject(Checked action) throws Exception {
        try { action.run(); } catch (IllegalArgumentException | IllegalStateException | IOException expected) { return; }
        throw new AssertionError("Expected rejection");
    }
    public static void main(String[] args) throws Exception {
        test("empty draft round trip", () -> equal(LocalDraft.decode(new LocalDraft("").encode()).text, ""));
        test("exact writing and Unicode preserved", () -> { String s="  hello\n世界 🌍\t"; equal(LocalDraft.decode(new LocalDraft(s).encode()).text,s); });
        test("speech appends without replacing concurrent writing", () -> equal(new LocalDraft("typed during dictation").appendSpeech("spoken").text,"typed during dictation\nspoken"));
        test("existing whitespace preserved", () -> equal(new LocalDraft("hello\n").appendSpeech(" world ").text,"hello\n world "));
        test("blank or null recognition leaves draft unchanged", () -> { LocalDraft d=new LocalDraft("safe"); yes(d.appendSpeech("  ")==d); yes(d.appendSpeech(null)==d); });
        test("null draft rejected", () -> reject(() -> new LocalDraft(null)));
        test("size limit enforced", () -> { char[] c=new char[LocalDraft.MAX_CHARS+1]; Arrays.fill(c,'x'); reject(() -> new LocalDraft(new String(c))); });
        test("oversized speech preserves original", () -> { char[] c=new char[LocalDraft.MAX_CHARS]; Arrays.fill(c,'x'); LocalDraft d=new LocalDraft(new String(c)); reject(() -> d.appendSpeech("a")); equal(d.text.length(),LocalDraft.MAX_CHARS); });
        test("invalid UTF16 does not silently corrupt writing", () -> reject(() -> new LocalDraft("\ud800").encode()));
        test("truncated file rejected", () -> reject(() -> LocalDraft.decode(new byte[]{1,2})));
        test("unknown schema preserved by rejection", () -> { byte[] b=new LocalDraft("safe").encode(); b[3]++; reject(() -> LocalDraft.decode(b)); });
        test("negative length rejected", () -> { byte[] b=new LocalDraft("safe").encode(); b[4]=(byte)255; reject(() -> LocalDraft.decode(b)); });
        test("trailing bytes rejected", () -> { byte[] b=new LocalDraft("safe").encode(); reject(() -> LocalDraft.decode(Arrays.copyOf(b,b.length+1))); });
        test("malformed UTF8 rejected", () -> { byte[] b=new LocalDraft("x").encode(); b[8]=(byte)255; reject(() -> LocalDraft.decode(b)); });
        test("unconfigured endpoint fails closed", () -> reject(() -> new TrustedEndpoint("")));
        test("canonical HTTPS identity route only", () -> equal(new TrustedEndpoint(TrustedEndpoint.CANONICAL_ORIGIN).identityUri.toString(),"https://tay-command.netlify.app/api/platform/identity"));
        for (String value : new String[]{"http://tay-command.netlify.app","https://evil.test","https://tay-command.netlify.app.evil.test","https://tay-command.netlify.app@evil.test","https://tay-command.netlify.app/","https://tay-command.netlify.app?token=x","https://tay-command.netlify.app:443","https://127.0.0.1"}) {
            test("reject unreviewed origin " + value, () -> reject(() -> new TrustedEndpoint(value)));
        }
        test("server authenticated identity accepted as data", () -> new TrustedEndpoint.Identity("tenant","user","session","member","authenticated"));
        test("development identity rejected", () -> reject(() -> new TrustedEndpoint.Identity("tenant","user","session","owner","internal_dev")));
        test("unknown role rejected", () -> reject(() -> new TrustedEndpoint.Identity("tenant","user","session","founder","authenticated")));
        test("malformed account rejected", () -> reject(() -> new TrustedEndpoint.Identity("../tenant","user","session","member","authenticated")));
        test("session boundary includes account", () -> { TrustedEndpoint.Identity i=new TrustedEndpoint.Identity("t","u","s","member","authenticated"); yes(!i.sameSession(new TrustedEndpoint.Identity("t","other","s","owner","authenticated"))); yes(!i.sameSession(new TrustedEndpoint.Identity("other","u","s","owner","authenticated"))); yes(!i.sameSession(new TrustedEndpoint.Identity("t","u","new","owner","authenticated"))); yes(i.sameSession(new TrustedEndpoint.Identity("t","u","s","member","authenticated"))); });
        test("missing credential rejected", () -> reject(() -> TrustedEndpoint.requireBearer(null)));
        test("credential header injection rejected", () -> reject(() -> TrustedEndpoint.requireBearer("a\r\nX-Role: owner")));
        test("bearer syntax checked without generating credential", () -> TrustedEndpoint.requireBearer("synthetic.test.only"));
        test("recognition starts idle", () -> equal(new VoiceTurn().state(),VoiceTurn.State.IDLE));
        test("repeated start blocked", () -> { VoiceTurn t=new VoiceTurn(); t.begin(); reject(() -> t.begin()); });
        test("stop transition is idempotent", () -> { VoiceTurn t=new VoiceTurn(); long id=t.begin(); yes(t.finish(id)); yes(!t.finish(id)); equal(t.state(),VoiceTurn.State.FINISHING); });
        test("late result after cancel rejected", () -> { VoiceTurn t=new VoiceTurn(); long id=t.begin(); t.cancel(); yes(!t.complete(id)); });
        test("background turn cannot change a new turn", () -> { VoiceTurn t=new VoiceTurn(); long old=t.begin(); t.cancel(); long current=t.begin(); yes(!t.complete(old)); yes(t.accepts(current)); });
        test("completion accepted once", () -> { VoiceTurn t=new VoiceTurn(); long id=t.begin(); yes(t.complete(id)); yes(!t.complete(id)); equal(t.state(),VoiceTurn.State.IDLE); });
        test("timeout/cancel clears finishing", () -> { VoiceTurn t=new VoiceTurn(); long id=t.begin(); t.finish(id); t.cancel(); yes(!t.accepts(id)); equal(t.state(),VoiceTurn.State.IDLE); });
        System.out.println(count + " native core checks passed (JVM only; no Android device or authentication)");
    }
}
