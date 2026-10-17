"use client";

type BarChartProps = {
  data: Array<{ label: string; value: number; max?: number }>;
  height?: number;
};

export function BarChart({ data, height = 300 }: BarChartProps) {
  const maxValue = Math.max(...data.map((d) => d.value), 5);

  return (
    <div style={{ height: `${height}px`, display: "flex", alignItems: "flex-end", gap: "12px", padding: "20px 0" }}>
      {data.map((item, i) => (
        <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
          <div style={{ fontSize: "0.9rem", fontWeight: 600, color: "var(--ink)" }}>{item.value}</div>
          <div
            style={{
              width: "100%",
              height: `${(item.value / maxValue) * (height - 60)}px`,
              background: "var(--stamp)",
              borderRadius: "6px 6px 0 0",
              transition: "height 0.3s ease",
              minHeight: "4px",
            }}
          />
          <div style={{ fontSize: "0.85rem", color: "var(--muted)", textAlign: "center" }}>{item.label}</div>
        </div>
      ))}
    </div>
  );
}

type LineChartProps = {
  data: Array<{ x: string; y: number }>;
  height?: number;
  label?: string;
};

export function LineChart({ data, height = 200, label }: LineChartProps) {
  if (!data.length) return <p className="muted">No data available</p>;

  const maxY = Math.max(...data.map((d) => d.y), 5);
  const minY = Math.min(...data.map((d) => d.y), 0);
  const range = maxY - minY || 1;
  const width = 100;

  const points = data
    .map((d, i) => {
      const x = (i / (data.length - 1 || 1)) * width;
      const y = height - ((d.y - minY) / range) * height;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <div>
      {label && <h3 style={{ marginBottom: "12px" }}>{label}</h3>}
      <svg
        viewBox={`0 0 ${width} ${height}`}
        style={{ width: "100%", height: `${height}px`, background: "var(--paper-raised)", borderRadius: "8px", padding: "12px" }}
      >
        <polyline
          points={points}
          fill="none"
          stroke="var(--stamp)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {data.map((d, i) => {
          const x = (i / (data.length - 1 || 1)) * width;
          const y = height - ((d.y - minY) / range) * height;
          return <circle key={i} cx={x} cy={y} r="3" fill="var(--stamp-deep)" />;
        })}
      </svg>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: "8px", fontSize: "0.8rem", color: "var(--muted)" }}>
        <span>{data[0]?.x}</span>
        <span>{data[data.length - 1]?.x}</span>
      </div>
    </div>
  );
}

type PieSegment = { label: string; value: number; color?: string };

export function PieChart({ data, size = 180 }: { data: PieSegment[]; size?: number }) {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  if (total === 0) return <p className="muted">No data</p>;

  const colors = ["#5636e0", "#16815f", "#a9791f", "#b3392c", "#6b6e85"];
  let currentAngle = -90;

  const segments = data.map((d, i) => {
    const angle = (d.value / total) * 360;
    const startAngle = currentAngle;
    currentAngle += angle;

    const x1 = size / 2 + (size / 2) * Math.cos((Math.PI * startAngle) / 180);
    const y1 = size / 2 + (size / 2) * Math.sin((Math.PI * startAngle) / 180);
    const x2 = size / 2 + (size / 2) * Math.cos((Math.PI * currentAngle) / 180);
    const y2 = size / 2 + (size / 2) * Math.sin((Math.PI * currentAngle) / 180);
    const largeArc = angle > 180 ? 1 : 0;

    return {
      d: `M ${size / 2} ${size / 2} L ${x1} ${y1} A ${size / 2} ${size / 2} 0 ${largeArc} 1 ${x2} ${y2} Z`,
      color: d.color || colors[i % colors.length],
      label: d.label,
      value: d.value,
      percent: ((d.value / total) * 100).toFixed(1),
    };
  });

  return (
    <div style={{ display: "flex", gap: "24px", alignItems: "center", flexWrap: "wrap" }}>
      <svg width={size} height={size} style={{ flexShrink: 0 }}>
        {segments.map((s, i) => (
          <path key={i} d={s.d} fill={s.color} stroke="var(--panel)" strokeWidth="2" />
        ))}
      </svg>
      <div style={{ display: "grid", gap: "8px" }}>
        {segments.map((s, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div style={{ width: "16px", height: "16px", borderRadius: "3px", background: s.color, flexShrink: 0 }} />
            <span style={{ fontSize: "0.9rem", color: "var(--ink-soft)" }}>
              {s.label}: <strong>{s.value}</strong> ({s.percent}%)
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
