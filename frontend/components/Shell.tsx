"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api, ApiError, homeFor, Me } from "@/lib/api";

/** Loads the signed-in user, sends visitors to the right place, and renders the page frame. */
export default function Shell({ role, wide, children }: { role?: Me["role"]; wide?: boolean; children: (me: Me) => React.ReactNode }) {
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);

  useEffect(() => {
    api<Me>("/auth/me")
      .then((m) => (!role || m.role === role ? setMe(m) : router.replace(homeFor(m.role))))
      .catch((e) => e instanceof ApiError && router.replace("/"));
  }, [role, router]);

  async function signOut() {
    await api("/auth/logout", { method: "POST", body: {} });
    router.replace("/");
  }

  if (!me) return <main className="page"><p className="muted">Loading…</p></main>;
  return (
    <>
      <header className="bar">
        <a className="brand" href={homeFor(me.role)}>EduVoice</a>
        <div className="who">
          <span>{me.name}</span>
          <a href="/account">Change password</a>
          <button className="link" onClick={signOut}>Sign out</button>
        </div>
      </header>
      <main className={wide ? "page wide" : "page"}>{children(me)}</main>
    </>
  );
}
