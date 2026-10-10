package com.transcenlutions.tay;

/** Main-thread turn fence. Late recognition callbacks never modify a newer draft session. */
public final class VoiceTurn {
    public enum State { IDLE, LISTENING, FINISHING }
    private long generation;
    private State state = State.IDLE;
    public State state() { return state; }
    public long begin() {
        if (state != State.IDLE) throw new IllegalStateException("Recognition already active");
        state = State.LISTENING; return ++generation;
    }
    public boolean accepts(long turn) { return state != State.IDLE && turn == generation; }
    public boolean finish(long turn) {
        if (!accepts(turn) || state != State.LISTENING) return false;
        state = State.FINISHING; return true;
    }
    public boolean complete(long turn) {
        if (!accepts(turn)) return false;
        state = State.IDLE; generation++; return true;
    }
    public void cancel() { state = State.IDLE; generation++; }
}
