'use client';

import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { CreditCard, TrendingUp } from 'lucide-react';

export interface AdminDashboardChartsProps {
  collectionTrends: { name: string; Target: number; Collected: number }[];
  attendanceTrends: { name: string; CSE: number; ECE: number; ME?: number }[];
}

export default function AdminDashboardCharts({
  collectionTrends,
  attendanceTrends,
}: AdminDashboardChartsProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Financial collection Chart */}
      <div className="bg-white/50 dark:bg-slate-900/50 backdrop-blur-md border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between pb-4 border-b border-slate-200/60 dark:border-slate-800 mb-5">
          <h3 className="text-xs font-extrabold text-[var(--text)] uppercase tracking-wider flex items-center gap-1.5 font-sans">
            <CreditCard className="w-4 h-4 text-indigo-600 dark:text-indigo-400" /> Revenue Collection vs Targets
          </h3>
          <span className="text-[10px] text-[var(--text-muted)] font-bold">Real-time Feed</span>
        </div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={collectionTrends}>
              <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" strokeOpacity={0.2} />
              <XAxis dataKey="name" stroke="#64748B" fontSize={10} tickLine={false} />
              <YAxis stroke="#64748B" fontSize={10} tickLine={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--surface)',
                  borderColor: 'var(--border)',
                  borderRadius: '12px',
                  color: 'var(--text)',
                }}
              />
              <Legend wrapperStyle={{ fontSize: 10 }} />
              <Bar dataKey="Target" fill="#818cf8" opacity={0.6} radius={[4, 4, 0, 0]} />
              <Bar dataKey="Collected" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Attendance trends chart */}
      <div className="bg-white/50 dark:bg-slate-900/50 backdrop-blur-md border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between pb-4 border-b border-slate-200/60 dark:border-slate-800 mb-5">
          <h3 className="text-xs font-extrabold text-[var(--text)] uppercase tracking-wider flex items-center gap-1.5 font-sans">
            <TrendingUp className="w-4 h-4 text-indigo-600 dark:text-indigo-400" /> Department Attendance Trends
          </h3>
          <span className="text-[10px] text-[var(--text-muted)] font-bold">Overall Average: 91%</span>
        </div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={attendanceTrends}>
              <defs>
                <linearGradient id="colorCse" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorEce" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#14B8A6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#14B8A6" stopOpacity={0} />
                </linearGradient>
              </defs>
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
              <Legend wrapperStyle={{ fontSize: 10 }} />
              <Area
                type="monotone"
                dataKey="CSE"
                stroke="#4f46e5"
                fillOpacity={1}
                fill="url(#colorCse)"
                strokeWidth={2}
              />
              <Area
                type="monotone"
                dataKey="ECE"
                stroke="#14B8A6"
                fillOpacity={1}
                fill="url(#colorEce)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
