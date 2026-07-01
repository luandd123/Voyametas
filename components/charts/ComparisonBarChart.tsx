"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

export function ComparisonBarChart({
  data,
  title,
  dataKey = "value",
  xKey = "name",
}: {
  data: Record<string, string | number>[];
  title: string;
  dataKey?: string;
  xKey?: string;
}) {
  return (
    <div className="card">
      <p className="text-sm font-medium text-voya-charcoal mb-2">{title}</p>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#F1E4DF" />
          <XAxis dataKey={xKey} tick={{ fontSize: 11 }} interval={0} angle={-15} textAnchor="end" height={50} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip />
          <Bar dataKey={dataKey} fill="#B8776C" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
