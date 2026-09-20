"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api, homeFor, Me } from "@/lib/api";

export default function Login() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setBusy(true);
    const f = new FormData(e.currentTarget);
    try {
      const me = await api<Me>("/auth/login", {
        body: { username: String(f.get("username")), password: String(f.get("password")) },
      });
      router.push(homeFor(me.role));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not sign in.");
      setBusy(false);
    }
  }

  return (
    <div className="login">
      <section>
        <h1>Honest feedback, with no name attached.</h1>
        <p>
          Sign in to show you're a student on the course. Your feedback is sent in a separate step, so no one, including
          the administrators, can trace it back to you.
        </p>
        <ol>
          <li><strong>Sign in</strong>We check that you're enrolled in the course.</li>
          <li><strong>Collect a sealed credential</strong>Your browser creates it and we sign it without seeing it.</li>
          <li><strong>Send your feedback</strong>No login goes with this step. The credential works once.</li>
        </ol>
      </section>
      <form className="card" onSubmit={onSubmit}>
        <h2>Sign in</h2>
        {error && <p className="msg error" role="alert">{error}</p>}
        <div className="field">
          <label htmlFor="username">Username</label>
          <input id="username" name="username" type="text" autoComplete="username" required />
        </div>
        <div className="field">
          <label htmlFor="password">Password</label>
          <input id="password" name="password" type="password" autoComplete="current-password" required />
        </div>
        <button className="btn" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</button>
        {process.env.NEXT_PUBLIC_SHOW_DEMO === "true" && (
          <p className="demo">Demo accounts: s01 / student123, kumar / teacher123, admin / admin123</p>
        )}
      </form>
    </div>
  );
}
