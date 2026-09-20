"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import Shell from "@/components/Shell";
import { api } from "@/lib/api";
import { blindMessage, Credential, fromHex, isSubmitted, loadCredential, markSubmitted, randomNonce, saveCredential, toHex, unblind } from "@/lib/blind";

type Course = { assignment_id: number; subject: string; teacher: string; semester: string; credential_issued: boolean };

const QUESTIONS = [
  ["clarity", "Teaching clarity"],
  ["pace", "Teaching pace"],
  ["examples", "Use of practical examples"],
  ["doubts", "Clearing doubts"],
  ["overall", "Overall teaching experience"],
] as const;

function Rating({ name, label }: { name: string; label: string }) {
  return (
    <fieldset className="rating">
      <legend>{label}</legend>
      <div className="scale">
        <small>Poor</small>
        {[1, 2, 3, 4, 5].map((v) => (
          <label key={v}>
            <input type="radio" name={name} value={v} required />
            <span>{v}</span>
          </label>
        ))}
        <small>Excellent</small>
      </div>
    </fieldset>
  );
}

function FeedbackFlow({ id }: { id: number }) {
  const [course, setCourse] = useState<Course | null>(null);
  const [cred, setCred] = useState<Credential | null>(null);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api<Course>(`/student/assignments/${id}`).then(setCourse).catch((e) => setError(e.message));
    setCred(loadCredential(id));
    setSent(isSubmitted(id));
  }, [id]);

  async function getCredential() {
    setError(""); setBusy(true);
    try {
      const key = await api<{ n: string; e: string }>("/credentials/public-key");
      const n = fromHex(key.n), e = fromHex(key.e);
      const nonce = randomNonce();
      const blinded = await blindMessage(`${id}:${nonce}`, n, e);
      // The only logged-in call: the server sees the blinded value, never the nonce.
      const res = await api<{ signature: string }>("/credentials/issue", {
        body: { assignment_id: id, blinded: toHex(blinded.blinded) },
      });
      const signature = toHex(unblind(fromHex(res.signature), blinded, n, e));
      const c = { nonce, signature };
      saveCredential(id, c);
      setCred(c);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create a credential.");
    } finally { setBusy(false); }
  }

  async function send(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!cred) return;
    setError(""); setBusy(true);
    const f = new FormData(e.currentTarget);
    try {
      await api("/feedback", {
        anonymous: true, // no cookies: nothing here identifies the student
        body: {
          assignment_id: id, nonce: cred.nonce, signature: cred.signature,
          ...Object.fromEntries(QUESTIONS.map(([k]) => [k, Number(f.get(k))])),
          went_well: String(f.get("went_well") || ""), to_improve: String(f.get("to_improve") || ""),
        },
      });
      markSubmitted(id);
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send your feedback.");
    } finally { setBusy(false); }
  }

  if (error && !course) return <p className="msg error">{error}</p>;
  if (!course) return <p className="muted">Loading…</p>;

  return (
    <>
      <p><Link href="/student">Back to your courses</Link></p>
      <h1>{course.subject}</h1>
      <p className="muted">{course.teacher} · {course.semester}</p>

      {sent ? (
        <p className="msg ok" role="status">Your feedback was sent anonymously. Thank you.</p>
      ) : !cred && course.credential_issued ? (
        <p className="msg error">You already collected a credential for this course, and it isn't stored in this browser. If you already sent your feedback, you're done.</p>
      ) : !cred ? (
        <div className="card" style={{ marginTop: "1.5rem" }}>
          <h2>Get your sealed credential</h2>
          <p>
            This proves you can give feedback once. Your browser creates it and we sign it without seeing it, so we can't
            connect it to you later.
          </p>
          {error && <p className="msg error" role="alert">{error}</p>}
          <button className="btn" onClick={getCredential} disabled={busy}>{busy ? "Creating credential…" : "Get credential"}</button>
        </div>
      ) : (
        <form className="slip" onSubmit={send}>
          <p className="seal" role="status">Sealed credential ready. This form is sent without your login.</p>
          {QUESTIONS.map(([k, label]) => <Rating key={k} name={k} label={label} />)}
          <div className="field">
            <label htmlFor="went_well">What does the teacher do well?</label>
            <textarea id="went_well" name="went_well" maxLength={1000} />
          </div>
          <div className="field">
            <label htmlFor="to_improve">What could be improved?</label>
            <textarea id="to_improve" name="to_improve" maxLength={1000} />
            <p className="hint">Leave out your name, register number, email and phone number. Specific incidents can also give you away.</p>
          </div>
          {error && <p className="msg error" role="alert">{error}</p>}
          <button className="btn" disabled={busy}>{busy ? "Sending…" : "Send feedback anonymously"}</button>
        </form>
      )}
    </>
  );
}

export default function Page({ params }: { params: { id: string } }) {
  return <Shell role="student">{() => <FeedbackFlow id={Number(params.id)} />}</Shell>;
}
