"use client";
import { useEffect, useState } from "react";
import Shell from "@/components/Shell";
import { api } from "@/lib/api";

type Summary = {
  assignment_id: number; subject: string; subject_code: string; semester: string;
  responses: number; needed: number; available: boolean;
  ratings?: Record<string, number>;
  sentiment?: Record<string, number>;
  topics?: Record<string, number>;
  comments?: { went_well: string; to_improve: string }[] | null;
  comments_needed?: number;
};

const LABELS: Record<string, string> = {
  overall: "Overall", clarity: "Clarity", pace: "Pace", examples: "Examples", doubts: "Doubts",
};

function Course({ s }: { s: Summary }) {
  return (
    <section className="card">
      <div className="course-head">
        <h2>{s.subject}</h2>
        <span className="pill">{s.responses} response{s.responses === 1 ? "" : "s"}</span>
      </div>
      <p className="muted" style={{ marginTop: "-.6rem" }}>{s.subject_code} · {s.semester}</p>
      {!s.available ? (
        <div className="locked-note">
          <strong>Results appear at {s.needed} responses.</strong> {s.responses} so far — showing results any
          earlier would make it easy to guess who gave which rating.
        </div>
      ) : (
        <>
          <div className="bars">
            {Object.entries(s.ratings!).map(([k, v]) => (
              <div className="bar-row" key={k}>
                <span>{LABELS[k]}</span>
                <span className="track"><span className="fill" style={{ width: `${(v / 5) * 100}%` }} /></span>
                <strong>{v.toFixed(1)}</strong>
              </div>
            ))}
          </div>
          <h3>Sentiment in comments</h3>
          <div className="chips">
            {Object.entries(s.sentiment!).map(([k, v]) => <span className="pill" key={k}>{k}: {v}</span>)}
          </div>
          {!!Object.keys(s.topics!).length && (
            <>
              <h3>What students mention</h3>
              <div className="chips">
                {Object.entries(s.topics!).map(([k, v]) => <span className="pill" key={k}>{k}: {v}</span>)}
              </div>
            </>
          )}
          <h3>Comments</h3>
          {s.comments ? (
            s.comments.length ? s.comments.map((c, i) => (
              <div className="comment" key={i}>
                {c.went_well && <p><strong>Went well:</strong> {c.went_well}</p>}
                {c.to_improve && <p><strong>To improve:</strong> {c.to_improve}</p>}
              </div>
            )) : <p className="muted">No approved comments yet.</p>
          ) : (
            <div className="locked-note">
              Comments appear at {s.comments_needed} responses, so a writing style can't be matched to one person.
            </div>
          )}
        </>
      )}
    </section>
  );
}

function Inner() {
  const [data, setData] = useState<Summary[] | null>(null);
  useEffect(() => { api<Summary[]>("/teacher/summary").then(setData); }, []);
  return (
    <>
      <h1>Your feedback</h1>
      <p className="eyebrow">Only combined results are shown here. No individual student is identifiable.</p>
      <div className="grid">
        {!data ? <p className="muted">Loading…</p> : data.length ? data.map((s) => <Course key={s.assignment_id} s={s} />) : (
          <div className="empty"><h3>No courses yet</h3><p className="muted" style={{ margin: 0 }}>Your administrator hasn't assigned you a course yet.</p></div>
        )}
      </div>
    </>
  );
}

export default function TeacherHome() {
  return <Shell role="teacher" wide>{() => <Inner />}</Shell>;
}
