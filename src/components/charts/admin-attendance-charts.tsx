'use client';

import React from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { TrendingDown } from 'lucide-react';

export interface AdminAttendanceChartProps {
  data: { name: string; rate: number }[];
}

export default function AdminAttendanceChart({ data }: AdminAttendanceChartProps) {
  return (
    <div className="bg-white/50 dark:bg-slate-900/50 backdrop-blur-md border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
      <h3 className="text-xs font-extrabold text-[var(--text)] uppercase tracking-wider flex items-center gap-1.5 mb-4 font-sans">
        <TrendingDown className="w-4 h-4 text-indigo-600 dark:text-indigo-400" /> Attendance rate by department
      </h3>
      <div className="h-60">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" strokeOpacity={0.2} />
            <XAxis dataKey="name" stroke="#64748B" fontSize={10} tickLine={false} />
            <YAxis stroke="#64748B" fontSize={10} domain={[60, 100]} tickLine={false} />
            <Tooltip
              contentStyle={{
                backgroundColor: 'var(--surface)',
                borderColor: 'var(--border)',
                borderRadius: '12px',
                color: 'var(--text)',
              }}
            />
            <Bar dataKey="rate" fill="#4f46e5" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
