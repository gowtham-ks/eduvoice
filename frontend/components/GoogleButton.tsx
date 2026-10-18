"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || "";

/**
 * Links straight to the backend (not through the /api proxy): the OAuth state
 * cookie it sets has to live on the same domain Google redirects back to.
 */
export function GoogleButton({ role, label }: { role?: "student" | "teacher"; label: string }) {
  const [enabled, setEnabled] = useState(false);
  useEffect(() => {
    api<{ enabled: boolean }>("/auth/google/enabled").then((r) => setEnabled(r.enabled)).catch(() => {});
  }, []);
  if (!enabled || !BACKEND) return null;
  const href = `${BACKEND}/auth/google/start${role ? `?role=${role}` : ""}`;
  return (
    <a className="btn quiet google-btn" href={href}>
      <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
        <path fill="#4285F4" d="M17.6 9.2c0-.6-.05-1.2-.15-1.8H9v3.4h4.8a4.1 4.1 0 0 1-1.8 2.7v2.2h2.9c1.7-1.6 2.7-3.9 2.7-6.5z"/>
        <path fill="#34A853" d="M9 18c2.4 0 4.5-.8 6-2.2l-2.9-2.2c-.8.5-1.9.9-3.1.9-2.4 0-4.4-1.6-5.1-3.8H.9v2.3A9 9 0 0 0 9 18z"/>
        <path fill="#FBBC05" d="M3.9 10.7a5.4 5.4 0 0 1 0-3.4V5H.9a9 9 0 0 0 0 8l3-2.3z"/>
        <path fill="#EA4335" d="M9 3.6c1.3 0 2.5.45 3.4 1.35l2.6-2.6A9 9 0 0 0 .9 5l3 2.3C4.6 5.2 6.6 3.6 9 3.6z"/>
      </svg>
      {label}
    </a>
  );
}
