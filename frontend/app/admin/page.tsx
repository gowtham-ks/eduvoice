"use client";
import { useCallback, useEffect, useState } from "react";
import Shell from "@/components/Shell";
import { api } from "@/lib/api";

type Row = { assignment_id: number; subject: string; teacher: string; semester: string; enrolled: number; responses: number; is_open: boolean };
type Flagged = { id: number; subject: string; went_well: string; to_improve: string; flags: string[] };
type Pending = { id: number; name: string; email: string | null; role: string };
type Note = { ok: boolean; text: string } | null;

const FLAG_TEXT: Record<string, string> = { toxic: "Possibly abusive", identifying_info: "May identify the student" };
const splitList = (s: string) => s.split(/[\n,]+/).map((x) => x.trim()).filter(Boolean);

function Notice({ note }: { note: Note }) {
  return note ? <p className={`msg ${note.ok ? "ok" : "error"}`} role={note.ok ? "status" : "alert"}>{note.text}</p> : null;
}

function AddAccounts({ onDone }: { onDone: () => void }) {
  const [note, setNote] = useState<Note>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    const lines = String(f.get("lines")).split("\n").map((l) => l.trim()).filter(Boolean);
    const users = lines.map((l) => l.split(",").map((x) => x.trim()));
    const bad = users.findIndex((u) => u.length !== 3 || u.some((x) => !x));
    if (bad >= 0) return setNote({ ok: false, text: `Line ${bad + 1} needs three parts: username, name, password.` });
    setBusy(true); setNote(null);
    try {
      const r = await api<{ created: number; skipped: string[] }>("/admin/users", {
        body: { role: f.get("role"), users: users.map(([username, name, password]) => ({ username, name, password })) },
      });
      setNote({ ok: true, text: `${r.created} account(s) created.${r.skipped.length ? ` Skipped (already exist or invalid username): ${r.skipped.join(", ")}.` : ""}` });
      form.reset(); onDone();
    } catch (err) { setNote({ ok: false, text: err instanceof Error ? err.message : "Could not create accounts." }); }
    finally { setBusy(false); }
  }

  return (
    <form className="card" onSubmit={submit}>
      <h2>Add accounts</h2>
      <p className="muted">One per line. Give <code>username, name, password</code> to set the password yourself, or just <code>their@email.com, name</code> to auto-generate one and email it to them — they'll be required to set their own on first login. People can also sign themselves up at <code>/signup</code> and show up above once approved.</p>
      <Notice note={note} />
      <div className="field"><label htmlFor="role">Account type</label>
        <select id="role" name="role"><option value="student">Students</option><option value="teacher">Teachers</option></select></div>
      <div className="field"><label htmlFor="lines">Accounts</label>
        <textarea id="lines" name="lines" className="code" required placeholder={"asha.k, Asha K, Temp#Pass2026\nravi.s, Ravi S, Temp#Pass2027"} /></div>
      <button className="btn" disabled={busy}>{busy ? "Creating…" : "Create accounts"}</button>
    </form>
  );
}

function AddCourse({ onDone }: { onDone: () => void }) {
  const [note, setNote] = useState<Note>(null);
  const [busy, setBusy] = useState(false);
  const [all, setAll] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    setBusy(true); setNote(null);
    try {
      const r = await api<{ enrolled: number; unknown_students: string[] }>("/admin/courses", {
        body: {
          subject_code: f.get("code"), subject_name: f.get("name"), teacher_username: f.get("teacher"),
          semester: f.get("semester"), enroll_all_students: all, student_usernames: splitList(String(f.get("students") || "")),
        },
      });
      setNote({ ok: true, text: `Course created with ${r.enrolled} student(s) enrolled.${r.unknown_students.length ? ` Unknown usernames: ${r.unknown_students.join(", ")}.` : ""}` });
      form.reset(); setAll(false); onDone();
    } catch (err) { setNote({ ok: false, text: err instanceof Error ? err.message : "Could not create the course." }); }
    finally { setBusy(false); }
  }

  return (
    <form className="card" onSubmit={submit}>
      <h2>Add a course</h2>
      <Notice note={note} />
      <div className="field"><label htmlFor="code">Subject code</label><input id="code" name="code" type="text" required maxLength={20} /></div>
      <div className="field"><label htmlFor="name">Subject name</label><input id="name" name="name" type="text" required maxLength={120} /></div>
      <div className="field"><label htmlFor="teacher">Teacher's username</label><input id="teacher" name="teacher" type="text" required /></div>
      <div className="field"><label htmlFor="semester">Semester</label><input id="semester" name="semester" type="text" required maxLength={20} placeholder="Sem 5" /></div>
      <div className="field"><label className="check"><input type="checkbox" checked={all} onChange={(e) => setAll(e.target.checked)} />Enroll every student account</label></div>
      {!all && <div className="field"><label htmlFor="students">Student usernames</label>
        <textarea id="students" name="students" className="code" placeholder="asha.k, ravi.s" /><p className="hint">Separate with commas or new lines.</p></div>}
      <button className="btn" disabled={busy}>{busy ? "Creating…" : "Create course"}</button>
    </form>
  );
}

function PendingApprovals({ rows, onDone }: { rows: Pending[] | null; onDone: () => void }) {
  async function decide(id: number, action: "approve" | "reject") {
    await api(`/admin/pending/${id}`, { body: { action } });
    onDone();
  }
  return (
    <section className="card">
      <h2>Accounts awaiting approval</h2>
      <p className="muted">These people signed up and verified their email themselves.</p>
      {!rows ? <p className="muted">Loading…</p> : !rows.length ? <p className="muted" style={{ margin: 0 }}>Nothing waiting right now.</p> : rows.map((p) => (
        <div className="course" key={p.id} style={{ marginBottom: ".7rem" }}>
          <div>
            <h3 style={{ marginBottom: ".15rem" }}>{p.name}</h3>
            <p className="muted" style={{ margin: 0 }}>{p.email} · {p.role}</p>
          </div>
          <div className="row-actions" style={{ marginTop: 0 }}>
            <button className="btn quiet" onClick={() => decide(p.id, "approve")}>Approve</button>
            <button className="btn danger" onClick={() => decide(p.id, "reject")}>Reject</button>
          </div>
        </div>
      ))}
    </section>
  );
}

function Dashboard() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [queue, setQueue] = useState<Flagged[] | null>(null);
  const [pending, setPending] = useState<Pending[] | null>(null);
  const load = useCallback(() => {
    api<Row[]>("/admin/overview").then(setRows);
    api<Flagged[]>("/admin/moderation").then(setQueue);
    api<Pending[]>("/admin/pending").then(setPending);
  }, []);
  useEffect(load, [load]);

  async function review(id: number, action: "approve" | "remove") {
    await api(`/admin/moderation/${id}`, { body: { action } });
    load();
  }
  async function toggle(r: Row) {
    await api(`/admin/assignments/${r.assignment_id}/open`, { body: { is_open: !r.is_open } });
    load();
  }

  return (
    <>
      <h1>Administration</h1>
      <div className="stack">
        <PendingApprovals rows={pending} onDone={load} />
        <section className="card">
          <div className="section-title"><h2 style={{ margin: 0 }}>Courses and response rates</h2></div>
          {!rows ? <p className="muted">Loading…</p> : !rows.length ? <p>No courses yet. Add accounts, then add a course below.</p> : (
            <div style={{ overflowX: "auto" }}>
              <table>
                <thead><tr><th>Course</th><th>Teacher</th><th>Semester</th><th>Responses</th><th>Feedback</th></tr></thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.assignment_id}>
                      <td>{r.subject}</td><td>{r.teacher}</td><td>{r.semester}</td>
                      <td>{r.responses} of {r.enrolled}</td>
                      <td><button className="btn quiet" onClick={() => toggle(r)}>{r.is_open ? "Close feedback" : "Reopen feedback"}</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
        <section className="card">
          <h2>Comments to review</h2>
          <p className="muted">Flagged comments stay hidden from teachers until you approve them.</p>
          {!queue ? <p className="muted">Loading…</p> : !queue.length ? <p className="muted" style={{ margin: 0 }}>Nothing to review.</p> : queue.map((q) => (
            <div className="comment" key={q.id}>
              <p>{q.flags.map((f) => <span className="pill warn" key={f} style={{ marginRight: ".4rem" }}>{FLAG_TEXT[f] ?? f}</span>)}<span className="muted">{q.subject}</span></p>
              {q.went_well && <p><strong>Went well:</strong> {q.went_well}</p>}
              {q.to_improve && <p><strong>To improve:</strong> {q.to_improve}</p>}
              <div className="row-actions">
                <button className="btn quiet" onClick={() => review(q.id, "approve")}>Approve</button>
                <button className="btn danger" onClick={() => review(q.id, "remove")}>Remove</button>
              </div>
            </div>
          ))}
        </section>
        <AddAccounts onDone={load} />
        <AddCourse onDone={load} />
      </div>
    </>
  );
}

export default function AdminHome() {
  return <Shell role="admin" wide>{() => <Dashboard />}</Shell>;
}
