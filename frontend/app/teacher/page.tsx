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
      <h2>{s.subject}</h2>
      <p className="muted">{s.subject_code} · {s.semester} · {s.responses} responses</p>
      {!s.available ? (
        <p>
          Results appear once {s.needed} students have responded ({s.responses} so far). Showing fewer would make it
          easy to guess who gave which rating.
        </p>
      ) : (
        <>
          <div className="bars">
            {Object.entries(s.ratings!).map(([k, v]) => (
              <div className="bar-row" key={k}>
                <span>{LABELS[k]}</span>
                <span className="track"><span className="fill" style={{ width: `${(v / 5) * 100}%`, display: "block" }} /></span>
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
            <p className="muted">Comments are shown once {s.comments_needed} students have responded, so writing styles can't be matched to individuals.</p>
          )}
        </>
      )}
    </section>
  );
}

export default function TeacherHome() {
  const [data, setData] = useState<Summary[] | null>(null);
  return (
    <Shell role="teacher" wide>
      {() => <Inner data={data} setData={setData} />}
    </Shell>
  );
}

function Inner({ data, setData }: { data: Summary[] | null; setData: (d: Summary[]) => void }) {
  useEffect(() => { api<Summary[]>("/teacher/summary").then(setData); }, [setData]);
  return (
    <>
      <h1>Your feedback</h1>
      <p className="muted">Only combined results are shown. No individual student is identifiable.</p>
      <div className="grid">
        {!data ? <p className="muted">Loading…</p> : data.length ? data.map((s) => <Course key={s.assignment_id} s={s} />) : <p>You have no courses assigned yet.</p>}
      </div>
    </>
  );
}
