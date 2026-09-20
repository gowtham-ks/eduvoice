"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import Shell from "@/components/Shell";
import { api } from "@/lib/api";
import { isSubmitted, loadCredential } from "@/lib/blind";

type Course = { assignment_id: number; subject: string; subject_code: string; teacher: string; semester: string; credential_issued: boolean };

function Courses() {
  const [courses, setCourses] = useState<Course[] | null>(null);
  useEffect(() => { api<Course[]>("/student/assignments").then(setCourses); }, []);
  if (!courses) return <p className="muted">Loading your courses…</p>;
  if (!courses.length) return <p>You have no courses open for feedback right now.</p>;

  return (
    <ul className="courses">
      {courses.map((c) => {
        const done = isSubmitted(c.assignment_id);
        const hasCred = !!loadCredential(c.assignment_id);
        let status = <span className="pill">Not started</span>;
        let action = "Start feedback";
        if (done) { status = <span className="pill done">Feedback sent</span>; action = ""; }
        else if (c.credential_issued && hasCred) { status = <span className="pill">Credential ready</span>; action = "Continue"; }
        else if (c.credential_issued) { status = <span className="pill warn">Credential used or lost</span>; action = ""; }
        return (
          <li className="course" key={c.assignment_id}>
            <div>
              <h3>{c.subject}</h3>
              <p className="muted">{c.teacher} · {c.semester}</p>
              <p>{status}</p>
            </div>
            {action && <Link className="btn" href={`/student/feedback/${c.assignment_id}`}>{action}</Link>}
          </li>
        );
      })}
    </ul>
  );
}

export default function StudentHome() {
  return (
    <Shell role="student">
      {() => (
        <>
          <h1>Your courses</h1>
          <p className="muted">Choose a course to give anonymous feedback on.</p>
          <Courses />
          <p className="hint" style={{ marginTop: "1.5rem" }}>
            Your credential is stored only in this browser. Use the same browser and device to finish, and don't clear site data before you send.
          </p>
        </>
      )}
    </Shell>
  );
}
