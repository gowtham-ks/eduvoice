"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { api, homeFor, Me } from "@/lib/api";
import { Mark } from "@/components/Mark";

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
        <div className="hero-mark"><Mark size={40} /></div>
        <h1>Honest feedback, with no name attached.</h1>
        <p className="lede">
          Sign in to show you're a student on the course. Your feedback is sent in a separate step, so no one —
          not even the administrators — can trace it back to you.
        </p>
        <p><Link href="/signup">New here? Create an account</Link></p>
        <ol>
          <li>
            <div>
              <strong>Sign in</strong>
              <span>We check that you're enrolled in the course.</span>
            </div>
          </li>
          <li>
            <div>
              <strong>Collect a sealed credential</strong>
              <span>Your browser creates it; we sign it without ever seeing it.</span>
            </div>
          </li>
          <li>
            <div>
              <strong>Send your feedback</strong>
              <span>No login travels with this step. The credential works once.</span>
            </div>
          </li>
        </ol>
      </section>
      <form className="card login-card" onSubmit={onSubmit}>
        <h2>Sign in</h2>
        {error && <p className="msg error" role="alert">{error}</p>}
        <div className="field">
          <label htmlFor="username">Username</label>
          <input id="username" name="username" type="text" autoComplete="username" required autoFocus />
        </div>
        <div className="field">
          <label htmlFor="password">Password</label>
          <input id="password" name="password" type="password" autoComplete="current-password" required />
        </div>
        <button className="btn big" style={{ width: "100%", justifyContent: "center" }} disabled={busy}>
          {busy ? "Signing in…" : "Sign in"}
        </button>
        {process.env.NEXT_PUBLIC_SHOW_DEMO === "true" && (
          <p className="demo">Demo accounts: s01 / student123, kumar / teacher123, admin / admin123</p>
        )}
      </form>
    </div>
  );
}
