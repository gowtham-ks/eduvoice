"use client";
import { useState } from "react";
import Shell from "@/components/Shell";
import { api } from "@/lib/api";

export default function Account() {
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    if (f.get("new_password") !== f.get("confirm")) return setMsg({ ok: false, text: "The new passwords don't match." });
    setBusy(true); setMsg(null);
    try {
      await api("/auth/change-password", { body: { current_password: f.get("current_password"), new_password: f.get("new_password") } });
      form.reset();
      setMsg({ ok: true, text: "Password changed." });
    } catch (err) {
      setMsg({ ok: false, text: err instanceof Error ? err.message : "Could not change the password." });
    } finally { setBusy(false); }
  }

  return (
    <Shell>
      {() => (
        <>
          <h1>Change password</h1>
          <form className="card" onSubmit={onSubmit}>
            {msg && <p className={`msg ${msg.ok ? "ok" : "error"}`} role={msg.ok ? "status" : "alert"}>{msg.text}</p>}
            <div className="field"><label htmlFor="cp">Current password</label><input id="cp" name="current_password" type="password" autoComplete="current-password" required /></div>
            <div className="field"><label htmlFor="np">New password</label><input id="np" name="new_password" type="password" autoComplete="new-password" minLength={10} required /><p className="hint">At least 10 characters.</p></div>
            <div className="field"><label htmlFor="cf">Confirm new password</label><input id="cf" name="confirm" type="password" autoComplete="new-password" required /></div>
            <button className="btn" disabled={busy}>{busy ? "Saving…" : "Change password"}</button>
          </form>
        </>
      )}
    </Shell>
  );
}
