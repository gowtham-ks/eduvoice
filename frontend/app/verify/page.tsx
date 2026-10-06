"use client";
import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { Mark } from "@/components/Mark";

function VerifyInner() {
  const params = useSearchParams();
  const [state, setState] = useState<"checking" | "ok" | "error">("checking");
  const [text, setText] = useState("");

  useEffect(() => {
    const token = params.get("token");
    if (!token) { setState("error"); setText("This verification link is missing its token."); return; }
    api<{ message: string }>("/auth/verify-email", { body: { token } })
      .then((r) => { setState("ok"); setText(r.message); })
      .catch((err) => { setState("error"); setText(err instanceof Error ? err.message : "This link didn't work."); });
  }, [params]);

  return (
    <div className="page" style={{ maxWidth: 480, textAlign: "center", paddingTop: "4rem" }}>
      <div style={{ margin: "0 auto 1.2rem", width: "fit-content" }}><Mark size={36} /></div>
      {state === "checking" && <p className="muted">Verifying…</p>}
      {state === "ok" && <p className="msg ok" role="status">{text}</p>}
      {state === "error" && <p className="msg error" role="alert">{text}</p>}
      <Link className="btn quiet" href="/">Back to sign in</Link>
    </div>
  );
}

export default function Verify() {
  return (
    <Suspense fallback={null}>
      <VerifyInner />
    </Suspense>
  );
}
