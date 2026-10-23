'use client';

import React from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

export interface StudentAttendanceChartProps {
  data: { name: string; Percentage: number }[];
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
}

const CustomChartTooltip: React.FC<CustomTooltipProps> = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[var(--surface)] border border-[var(--border)] p-2.5 rounded-xl shadow-xl">
        <p className="text-[10px] text-[var(--text-muted)] font-extrabold uppercase tracking-wider">{label}</p>
        <p className="text-xs text-[var(--accent)] font-extrabold mt-1">
          Rate: <span className="text-[var(--text)]">{payload[0].value}%</span>
        </p>
      </div>
    );
  }
  return null;
};

export default function StudentAttendanceChart({ data }: StudentAttendanceChartProps) {
  return (
    <div className="bg-[var(--surface)] border border-[var(--border)] p-5 rounded-2xl flex flex-col justify-between shadow-sm">
      <div>
        <h3 className="text-sm font-bold text-[var(--text)] pb-2 border-b border-[var(--border)]">
          Monthly Analysis
        </h3>
        <p className="text-[10px] text-[var(--text-muted)] font-bold mt-1">
          Attendance progression across Semester 6
        </p>
      </div>

      <div className="h-52 mt-4 w-full text-[10px] font-mono">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 5, right: 10, left: -25, bottom: 5 }}>
            <defs>
              <linearGradient id="areaGlow" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#6366f1" stopOpacity={0.2} />
                <stop offset="100%" stopColor="#6366f1" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" strokeOpacity={0.2} />
            <XAxis dataKey="name" stroke="#64748b" style={{ fontSize: '10px' }} />
            <YAxis domain={[50, 100]} stroke="#64748b" style={{ fontSize: '10px' }} />
            <Tooltip content={<CustomChartTooltip />} />
            <Area
              type="monotone"
              dataKey="Percentage"
              stroke="#6366f1"
              strokeWidth={2.5}
              fill="url(#areaGlow)"
              activeDot={{ r: 5 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-4 pt-4 border-t border-[var(--border)] text-center">
        <span className="text-[9px] text-[var(--text-muted)] font-extrabold uppercase tracking-wider block">
          Jan 8, 2026 - May 15, 2026
        </span>
      </div>
    </div>
  );
}
