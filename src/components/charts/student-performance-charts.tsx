'use client';

import React from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
  Cell,
} from 'recharts';
import { TrendingUp, BookOpen } from 'lucide-react';

export interface StudentPerformanceChartsProps {
  gpaTrendData: { name: string; SGPA: number; CGPA: number }[];
  subjectMarksData: { name: string; fullName: string; Score: number }[];
}

const COLORS = ['#6366f1', '#a855f7', '#ec4899', '#f43f5e', '#e11d48', '#be123c'];

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ value: number; payload?: { fullName?: string } }>;
  label?: string;
}

const CustomGpaTooltip: React.FC<CustomTooltipProps> = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[var(--surface)] border border-[var(--border)] p-2.5 rounded-xl shadow-xl">
        <p className="text-[10px] text-[var(--text-muted)] font-extrabold uppercase tracking-wider">{label}</p>
        <div className="space-y-1 mt-1.5 font-semibold">
          <p className="text-xs text-[var(--accent)] font-bold">
            SGPA: <span className="text-[var(--text)] font-extrabold">{payload[0].value}</span>
          </p>
          {payload[1] && (
            <p className="text-xs text-purple-500 font-bold">
              CGPA: <span className="text-[var(--text)] font-extrabold">{payload[1].value}</span>
            </p>
          )}
        </div>
      </div>
    );
  }
  return null;
};

const CustomScoreTooltip: React.FC<CustomTooltipProps> = ({ active, payload }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[var(--surface)] border border-[var(--border)] p-2.5 rounded-xl shadow-xl">
        <p className="text-[10px] text-[var(--text-muted)] font-extrabold uppercase tracking-wider">
          {payload[0].payload?.fullName}
        </p>
        <p className="text-xs text-purple-500 font-extrabold mt-1">
          Total Score: <span className="text-[var(--text)] font-black">{payload[0].value} / 100</span>
        </p>
      </div>
    );
  }
  return null;
};

export default function StudentPerformanceCharts({
  gpaTrendData,
  subjectMarksData,
}: StudentPerformanceChartsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Semester GPA Line Chart */}
      <div className="bg-[var(--surface)] border border-[var(--border)] p-6 rounded-3xl shadow-sm flex flex-col justify-between">
        <div>
          <h3 className="text-sm font-bold text-[var(--text)] flex items-center gap-2">
            <TrendingUp className="w-4.5 h-4.5 text-[var(--accent)]" />
            GPA Progression
          </h3>
          <p className="text-[10px] text-[var(--text-muted)] font-bold mt-1">
            Comparing SGPA vs Cumulative CGPA across semesters
          </p>
        </div>

        <div className="h-60 mt-4 w-full text-[10px] font-mono">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={gpaTrendData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
              <defs>
                <linearGradient id="colorSgpa" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorCgpa" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#a855f7" stopOpacity={0.1} />
                  <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" strokeOpacity={0.2} />
              <XAxis dataKey="name" stroke="#64748b" style={{ fontSize: '10px' }} />
              <YAxis domain={[7.5, 9.5]} stroke="#64748b" style={{ fontSize: '10px' }} />
              <Tooltip content={<CustomGpaTooltip />} />
              <Area type="monotone" dataKey="SGPA" stroke="#6366f1" strokeWidth={2.5} fillOpacity={1} fill="url(#colorSgpa)" />
              <Area type="monotone" dataKey="CGPA" stroke="#a855f7" strokeWidth={2} fillOpacity={1} fill="url(#colorCgpa)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Subject wise marks bar chart */}
      <div className="bg-[var(--surface)] border border-[var(--border)] p-6 rounded-3xl shadow-sm flex flex-col justify-between">
        <div>
          <h3 className="text-sm font-bold text-[var(--text)] flex items-center gap-2">
            <BookOpen className="w-4.5 h-4.5 text-[var(--accent)]" />
            Semester 5 Subject Scores
          </h3>
          <p className="text-[10px] text-[var(--text-muted)] font-bold mt-1">
            Total score breakdown (out of 100) per subject
          </p>
        </div>

        <div className="h-60 mt-4 w-full text-[10px] font-mono">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={subjectMarksData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" strokeOpacity={0.2} />
              <XAxis dataKey="name" stroke="#64748b" style={{ fontSize: '10px' }} />
              <YAxis domain={[0, 100]} stroke="#64748b" style={{ fontSize: '10px' }} />
              <Tooltip content={<CustomScoreTooltip />} />
              <Bar dataKey="Score" radius={[6, 6, 0, 0]}>
                {subjectMarksData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
