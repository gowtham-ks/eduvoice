"use client";
import { useCallback, useEffect, useState } from "react";
import Shell from "@/components/Shell";
import { api } from "@/lib/api";
import { BarChart, PieChart } from "@/components/Chart";

type Stats = {
  users: { total: number; students: number; teachers: number };
  courses: number;
  feedback: { total: number; flagged: number; recent_7_days: number };
  average_ratings: Record<string, number>;
};

function StatCard({ label, value, subtext }: { label: string; value: string | number; subtext?: string }) {
  return (
    <div className="card" style={{ textAlign: "center", padding: "1.5rem" }}>
      <div style={{ fontSize: "2.5rem", fontWeight: 700, color: "var(--stamp)", marginBottom: "0.3rem" }}>{value}</div>
      <div style={{ fontSize: "0.95rem", fontWeight: 600, color: "var(--ink)", marginBottom: "0.2rem" }}>{label}</div>
      {subtext && <div style={{ fontSize: "0.85rem", color: "var(--muted)" }}>{subtext}</div>}
    </div>
  );
}

function AnalyticsDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);

  const load = useCallback(() => {
    api<Stats>("/analytics/admin/stats").then(setStats).catch(console.error);
  }, []);

  useEffect(load, [load]);

  if (!stats) return <p className="muted">Loading analytics...</p>;

  const ratingData = Object.entries(stats.average_ratings).map(([label, value]) => ({
    label: label.charAt(0).toUpperCase() + label.slice(1),
    value: parseFloat(value.toFixed(2)),
    max: 5,
  }));

  const userDistribution = [
    { label: "Students", value: stats.users.students, color: "#5636e0" },
    { label: "Teachers", value: stats.users.teachers, color: "#16815f" },
  ];

  return (
    <div className="stack">
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem" }}>
        <StatCard label="Total Users" value={stats.users.total} />
        <StatCard label="Active Courses" value={stats.courses} />
        <StatCard label="Total Feedback" value={stats.feedback.total} />
        <StatCard label="Recent (7d)" value={stats.feedback.recent_7_days} subtext="responses" />
      </div>

      {stats.feedback.flagged > 0 && (
        <div className="card" style={{ background: "var(--alert-soft)", borderColor: "var(--alert)" }}>
          <strong style={{ color: "#7a241a" }}>⚠ {stats.feedback.flagged} flagged comments awaiting review</strong>
        </div>
      )}

      <div className="card">
        <h3>User Distribution</h3>
        <PieChart data={userDistribution} size={160} />
      </div>

      {ratingData.length > 0 && (
        <div className="card">
          <h3>Average Ratings Across All Feedback</h3>
          <BarChart data={ratingData} height={250} />
        </div>
      )}
    </div>
  );
}

export default AnalyticsDashboard;
