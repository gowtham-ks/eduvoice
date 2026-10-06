"use client";
import Link from "next/link";
import { useState } from "react";
import { api } from "@/lib/api";
import { Mark } from "@/components/Mark";

export default function Signup() {
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(""); setBusy(true);
    const f = new FormData(e.currentTarget);
    if (String(f.get("password")) !== String(f.get("confirm"))) {
      setError("Passwords don't match."); setBusy(false); return;
    }
    try {
      await api("/auth/signup", {
        body: { email: f.get("email"), name: f.get("name"), password: f.get("password"), role: f.get("role") },
      });
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create your account.");
    } finally { setBusy(false); }
  }

  return (
    <div className="login">
      <section>
        <div className="hero-mark"><Mark size={40} /></div>
        <h1>Create your account</h1>
        <p className="lede">
          Use your college email. We'll send a link to confirm it's really you, and your administrator
          approves new accounts before you can sign in.
        </p>
        <p><Link href="/">Already have an account? Sign in</Link></p>
      </section>
      <div className="card login-card">
        {done ? (
          <>
            <h2>Check your email</h2>
            <p className="msg ok" role="status">We've sent a verification link. Click it, then wait for your administrator to approve the account.</p>
            <Link className="btn quiet" href="/">Back to sign in</Link>
          </>
        ) : (
          <form onSubmit={onSubmit}>
            <h2>Sign up</h2>
            {error && <p className="msg error" role="alert">{error}</p>}
            <div className="field"><label htmlFor="name">Full name</label><input id="name" name="name" type="text" required maxLength={120} /></div>
            <div className="field"><label htmlFor="email">College email</label><input id="email" name="email" type="email" autoComplete="email" required /></div>
            <div className="field"><label htmlFor="role">I am a</label>
              <select id="role" name="role"><option value="student">Student</option><option value="teacher">Teacher</option></select>
            </div>
            <div className="field"><label htmlFor="password">Password</label><input id="password" name="password" type="password" autoComplete="new-password" minLength={10} required /><p className="hint">At least 10 characters.</p></div>
            <div className="field"><label htmlFor="confirm">Confirm password</label><input id="confirm" name="confirm" type="password" autoComplete="new-password" required /></div>
            <button className="btn big" style={{ width: "100%", justifyContent: "center" }} disabled={busy}>{busy ? "Creating…" : "Create account"}</button>
          </form>
        )}
      </div>
    </div>
  );
}
