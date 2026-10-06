"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api, ApiError, homeFor, Me } from "@/lib/api";
import { Mark } from "@/components/Mark";

/** Loads the signed-in user, sends visitors to the right place, and renders the page frame. */
export default function Shell({ role, wide, children }: { role?: Me["role"]; wide?: boolean; children: (me: Me) => React.ReactNode }) {
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);

  useEffect(() => {
    api<Me>("/auth/me")
      .then((m) => {
        if (m.must_change_password && typeof window !== "undefined" && window.location.pathname !== "/account") {
          router.replace("/account?required=1");
          return;
        }
        if (!role || m.role === role) setMe(m);
        else router.replace(homeFor(m.role));
      })
      .catch((e) => e instanceof ApiError && router.replace("/"));
  }, [role, router]);

  async function signOut() {
    await api("/auth/logout", { method: "POST", body: {} });
    router.replace("/");
  }

  if (!me) {
    return (
      <>
        <header className="bar"><a className="brand" href="/"><Mark size={24} /> EduVoice</a></header>
        <main className="page"><p className="muted">Loading…</p></main>
      </>
    );
  }
  return (
    <>
      <header className="bar">
        <a className="brand" href={homeFor(me.role)}><Mark size={24} /> EduVoice</a>
        <nav className="who">
          <span>{me.name}</span>
          <a href="/account">Password</a>
          <button className="link" onClick={signOut}>Sign out</button>
        </nav>
      </header>
      <main className={wide ? "page wide" : "page"}>{children(me)}</main>
    </>
  );
}
