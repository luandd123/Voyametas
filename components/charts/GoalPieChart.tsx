"use client";

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";

const COLORS = ["#B8776C", "#F1E4DF"];

export function GoalPieChart({
  done,
  remaining,
  title,
}: {
  done: number;
  remaining: number;
  title: string;
}) {
  const data = [
    { name: "Realizado", value: Math.max(done, 0) },
    { name: "Restante", value: Math.max(remaining, 0) },
  ];

  return (
    <div className="card">
      <p className="text-sm font-medium text-voya-charcoal mb-2">{title}</p>
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie data={data} dataKey="value" innerRadius={50} outerRadius={80} paddingAngle={2}>
            {data.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
