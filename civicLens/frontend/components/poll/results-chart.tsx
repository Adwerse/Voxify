"use client";

import { Pie, PieChart, Cell, ResponsiveContainer, Tooltip } from "recharts";

import { Analysis } from "@/lib/api";
import { Card } from "@/components/ui/card";

type ResultsChartProps = {
  analysis: Analysis;
};

const COLORS = ["#0A0A0A", "#27272A", "#52525B", "#71717A", "#A1A1AA"];

export function ResultsChart({ analysis }: ResultsChartProps) {
  const chartData = analysis.themes?.themes ?? [];
  const totalVotes = chartData.reduce((sum, item) => sum + Number(item.response_count || 0), 0);

  return (
    <Card className="p-6">
      <h2 className="text-2xl tracking-tight">Vote Breakdown</h2>
      <p className="text-sm text-zinc-400">Total votes: {totalVotes}</p>

      <div className="mt-6 h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              dataKey="response_count"
              nameKey="label"
              innerRadius={65}
              outerRadius={105}
              paddingAngle={3}
            >
              {chartData.map((entry, index) => (
                <Cell key={entry.id} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <ul className="space-y-2">
        {chartData.map((item, index) => (
          <li key={item.id} className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: COLORS[index % COLORS.length] }}
              />
              <span>{item.label}</span>
            </div>
            <span className="text-zinc-400">{item.percentage.toFixed(1)}%</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}
