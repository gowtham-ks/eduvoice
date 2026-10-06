"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import Shell from "@/components/Shell";
import { api } from "@/lib/api";
import { isSubmitted, loadCredential } from "@/lib/blind";

type Course = { assignment_id: number; subject: string; subject_code: string; teacher: string; semester: string; credential_issued: boolean };

function CourseRow({ c }: { c: Course }) {
  const done = isSubmitted(c.assignment_id);
  const hasCred = !!loadCredential(c.assignment_id);
  let status = <span className="pill">Not started</span>;
  let action = "Start feedback";
  if (done) { status = <span className="pill done">Feedback sent</span>; action = ""; }
  else if (c.credential_issued && hasCred) { status = <span className="pill">Credential ready</span>; action = "Continue"; }
  else if (c.credential_issued) { status = <span className="pill warn">Credential used elsewhere</span>; action = ""; }

  return (
    <li className="course">
      <div>
        <h3>{c.subject}</h3>
        <p className="muted">{c.teacher} · {c.semester}</p>
        {status}
      </div>
      {action && <Link className="btn" href={`/student/feedback/${c.assignment_id}`}>{action}</Link>}
    </li>
  );
}

function Courses() {
  const [courses, setCourses] = useState<Course[] | null>(null);
  useEffect(() => { api<Course[]>("/student/assignments").then(setCourses); }, []);
  if (!courses) return <p className="muted">Loading your courses…</p>;
  if (!courses.length) return (
    <div className="empty">
      <h3>No courses open yet</h3>
      <p className="muted" style={{ margin: 0 }}>Your administrator will enroll you once a feedback window opens.</p>
    </div>
  );
  return <ul className="courses">{courses.map((c) => <CourseRow key={c.assignment_id} c={c} />)}</ul>;
}

export default function StudentHome() {
  return (
    <Shell role="student">
      {() => (
        <>
          <h1>Your courses</h1>
          <p className="eyebrow">Choose a course to give anonymous feedback on.</p>
          <Courses />
          <p className="hint" style={{ marginTop: "1.8rem" }}>
            Your credential lives only in this browser. Use the same browser and device to finish, and don't clear site data before you send.
          </p>
        </>
      )}
    </Shell>
  );
}
