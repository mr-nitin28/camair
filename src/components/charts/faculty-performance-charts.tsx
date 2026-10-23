'use client';

import React from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from 'recharts';
import { TrendingUp } from 'lucide-react';

export interface FacultyRiskChartProps {
  data: { name: string; count: number; color: string }[];
}

export default function FacultyPerformanceChart({ data }: FacultyRiskChartProps) {
  return (
    <div className="bg-[var(--surface)] border border-[var(--border)] p-6 rounded-2xl shadow-sm flex flex-col justify-between">
      <div>
        <h3 className="text-sm font-bold text-[var(--text)] flex items-center gap-2">
          <TrendingUp className="w-4.5 h-4.5 text-blue-600 dark:text-blue-400" />
          Risk Roster Classification
        </h3>
        <p className="text-[10px] text-[var(--text-muted)] font-semibold mt-1">
          Student distribution across risk categories
        </p>
      </div>

      <div className="h-56 mt-4 w-full text-xs">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" strokeOpacity={0.2} />
            <XAxis dataKey="name" stroke="#64748B" />
            <YAxis stroke="#64748B" />
            <Tooltip
              contentStyle={{
                backgroundColor: 'var(--surface)',
                borderColor: 'var(--border)',
                borderRadius: '12px',
                color: 'var(--text)',
              }}
            />
            <Bar dataKey="count" radius={[4, 4, 0, 0]}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
