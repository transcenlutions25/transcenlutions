"use client";

import { useId, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { errorMessage, type SessionResponse } from "./tay-types";

type Mode = "login" | "accept_invite";

/** Sign-in, founding-owner setup, and invited-admin acceptance. */
export function TayAuth({ setup }: { setup: SessionResponse["setup"] }) {
  const [mode, setMode] = useState<Mode>("login");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [token, setToken] = useState("");
  const passwordId = useId();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const needsOwner = !setup.ownerExists;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      const path = needsOwner ? "/api/tay/bootstrap" : mode === "accept_invite" ? "/api/tay/invites/accept" : "/api/tay/session";
      const response = await fetch(path, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          displayName: displayName.trim(),
          email: email.trim(),
          password,
          ...(mode === "accept_invite" && !needsOwner ? { token: token.trim() } : {}),
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!response.ok || payload.ok === false) {
        setMessage(errorMessage(payload));
        return;
      }
      window.location.reload();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "That request could not be completed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="tl-shell tl-auth">
      <div className="tl-panel tl-panel-strong tl-auth-card">
        <p className="tl-brand-mark">TRANSCENLUTIONS</p>
        <h1 style={{ margin: "0.3rem 0 0.4rem", fontSize: "1.35rem" }}>
          {needsOwner ? "Create the founding owner account" : mode === "accept_invite" ? "Accept an admin invitation" : "Sign in to Tay"}
        </h1>
        <p className="tl-small tl-muted">
          {needsOwner
            ? "This deployment has no owner yet. The account created here becomes the single founding owner and controls system-wide change."
            : "Your account only sees its own projects. Owner administration stays separate from an ordinary account label."}
        </p>

        <form className="tl-stack" style={{ marginTop: "0.9rem" }} onSubmit={submit}>
          {needsOwner || mode === "accept_invite" ? (
            <label className="tl-field">
              <span className="tl-label">Your name</span>
              <input className="tl-input" value={displayName} onChange={(event) => setDisplayName(event.target.value)} autoComplete="name" required />
            </label>
          ) : null}

          {mode === "accept_invite" && !needsOwner ? (
            <label className="tl-field">
              <span className="tl-label">Invitation token</span>
              <input className="tl-input" value={token} onChange={(event) => setToken(event.target.value)} required />
            </label>
          ) : null}

          <label className="tl-field">
            <span className="tl-label">Email</span>
            <input
              className="tl-input"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="username"
              required
            />
          </label>

          <div className="tl-field">
            <label className="tl-label" htmlFor={passwordId}>
              Password (at least 12 characters)
            </label>
            <div className="tl-password-field">
              <input
                id={passwordId}
                className="tl-input"
                type={passwordVisible ? "text" : "password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete={needsOwner ? "new-password" : "current-password"}
                minLength={12}
                required
              />
              <button
                type="button"
                className="tl-password-toggle"
                aria-label={passwordVisible ? "Hide password" : "Show password"}
                aria-pressed={passwordVisible}
                aria-controls={passwordId}
                title={passwordVisible ? "Hide password" : "Show password"}
                onClick={() => setPasswordVisible((visible) => !visible)}
              >
                {passwordVisible ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
              </button>
            </div>
          </div>

          {message ? (
            <p className="tl-notice" data-tone="error" role="alert">
              {message}
            </p>
          ) : null}

          <button type="submit" className="tl-button" data-variant="primary" disabled={busy}>
            {busy ? "Working…" : needsOwner ? "Create owner and open Tay" : mode === "accept_invite" ? "Accept invitation" : "Sign in"}
          </button>
        </form>

        {!needsOwner ? (
          <p className="tl-small" style={{ marginTop: "0.9rem" }}>
            <button
              type="button"
              className="tl-button"
              data-variant="ghost"
              onClick={() => setMode((current) => (current === "login" ? "accept_invite" : "login"))}
            >
              {mode === "login" ? "I have an invitation token" : "Back to sign in"}
            </button>
          </p>
        ) : null}

        <p className="tl-small tl-muted" style={{ marginTop: "0.9rem" }}>
          Passwords are stored as scrypt hashes. Sessions are HttpOnly cookies. Set TAY_OWNER_EMAIL before first run on a hosted deployment so
          founding-owner authority binds to one verified address.
        </p>
      </div>
    </main>
  );
}
