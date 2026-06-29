'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAppStore } from '@/lib/store';
import { motion } from 'framer-motion';
import {
  Users,
  GraduationCap,
  Building,
  CreditCard,
  History,
  CheckSquare,
  ArrowRight,
  TrendingUp,
  PlusCircle,
  ShieldCheck,
  Megaphone,
  Settings,
} from 'lucide-react';
import Link from 'next/link';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar, Legend } from 'recharts';

export default function AdminDashboardOverview() {
  const { admin } = useAppStore();

  // Fetch metrics counts
  const { data: metrics, isLoading } = useQuery({
    queryKey: ['admin-dashboard-metrics'],
    queryFn: async () => {
      // 1. Total Students
      const { count: studentCount } = await supabase
        .from('students')
        .select('*', { count: 'exact', head: true });

      // 2. Total Faculty
      const { count: facultyCount } = await supabase
        .from('faculty')
        .select('*', { count: 'exact', head: true });

      // 3. Departments
      const { count: deptCount } = await supabase
        .from('departments')
        .select('*', { count: 'exact', head: true });

      // 4. Leave & Service Requests Pending
      const { count: pendingLeaves } = await supabase
        .from('leave_requests')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'Pending');

      const { count: pendingService } = await supabase
        .from('service_requests')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'Pending');

      // 5. Total Fees Collected (Success Payments)
      const { data: payments } = await supabase
        .from('payments')
        .select('amount_paid')
        .eq('status', 'Success');
      
      const totalCollected = payments?.reduce((sum, p) => sum + Number(p.amount_paid), 0) || 0;

      return {
        students: studentCount || 0,
        faculty: facultyCount || 0,
        departments: deptCount || 0,
        pendingApprovals: (pendingLeaves || 0) + (pendingService || 0),
        feesCollected: totalCollected,
      };
    },
  });

  // Fetch recent audit logs from database
  const { data: recentLogs } = useQuery({
    queryKey: ['admin-recent-audit-logs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) return [];
      return data;
    },
  });

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 260, damping: 25 } },
  };

  // Mock static data for charts
  const collectionTrends = [
    { name: 'Jan', Target: 4000, Collected: 2400 },
    { name: 'Feb', Target: 3000, Collected: 1398 },
    { name: 'Mar', Target: 5000, Collected: 4800 },
    { name: 'Apr', Target: 4780, Collected: 3908 },
    { name: 'May', Target: 5890, Collected: 4800 },
    { name: 'Jun', Target: 6000, Collected: 5700 },
  ];

  const attendanceTrends = [
    { name: 'Week 1', CSE: 92, ECE: 88, ME: 84 },
    { name: 'Week 2', CSE: 94, ECE: 89, ME: 85 },
    { name: 'Week 3', CSE: 89, ECE: 84, ME: 80 },
    { name: 'Week 4', CSE: 91, ECE: 87, ME: 82 },
    { name: 'Week 5', CSE: 95, ECE: 91, ME: 86 },
    { name: 'Week 6', CSE: 93, ECE: 90, ME: 85 },
  ];

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-8"
    >
      {/* 1. HERO SECTION (Welcome Banner) */}
      <motion.div
        variants={itemVariants}
        className="bg-gradient-to-r from-indigo-950 via-indigo-900 to-slate-900 p-6 md:p-8 rounded-3xl text-white relative overflow-hidden shadow-lg border border-indigo-950/20"
      >
        <div className="absolute top-[-50%] right-[-10%] w-[50%] h-[200%] bg-white/5 blur-[90px] rounded-full pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-4.5">
            <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10 flex items-center justify-center font-bold text-xl text-white uppercase shadow-inner">
              AD
            </div>
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-indigo-200 bg-indigo-600/30 px-2.5 py-1 rounded-full backdrop-blur-sm">
                Control Room
              </span>
              <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight mt-2.5 font-sans">
                Welcome, {admin?.name || 'Administrator'}
              </h2>
              <p className="text-slate-300 text-xs md:text-sm mt-1 max-w-xl font-semibold">
                Monitor institutional performance, audit financial accounts, process permissions, and manage student registry databases.
              </p>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-md border border-white/10 py-2.5 px-4 rounded-2xl flex items-center gap-3">
            <div className="w-2.5 h-2.5 bg-emerald-400 rounded-full animate-ping" />
            <span className="text-xs font-bold text-slate-100 font-sans">
              System Active
            </span>
          </div>
        </div>
      </motion.div>

      {/* 2. QUICK STATS (Glassmorphic metrics grid) */}
      <motion.div
        variants={itemVariants}
        className="grid grid-cols-2 lg:grid-cols-5 gap-4.5"
      >
        {[
          { label: 'Registered Students', value: metrics?.students || '0', icon: Users, sub: 'Active registry', color: 'text-indigo-600 bg-indigo-50/50 border-indigo-100/50' },
          { label: 'Active Faculty Staff', value: metrics?.faculty || '0', icon: GraduationCap, sub: 'Workforce registry', color: 'text-indigo-600 bg-indigo-50/50 border-indigo-100/50' },
          { label: 'Departments', value: metrics?.departments || '0', icon: Building, sub: 'Academic groups', color: 'text-indigo-600 bg-indigo-50/50 border-indigo-100/50' },
          { label: 'Fee Collections', value: `₹${metrics?.feesCollected.toLocaleString() || '0'}`, icon: CreditCard, sub: 'Payments success', color: 'text-emerald-600 bg-emerald-50/50 border-emerald-100/50' },
          { label: 'Pending Approvals', value: metrics?.pendingApprovals || '0', icon: CheckSquare, sub: 'Awaiting review', color: (metrics?.pendingApprovals || 0) > 0 ? 'text-amber-600 bg-amber-50/50 border-amber-100/50' : 'text-slate-550 bg-slate-50 border-slate-100' },
        ].map((stat, i) => (
          <div
            key={i}
            className="bg-white/50 backdrop-blur-md border border-slate-200/80 p-5 rounded-2xl hover:border-slate-350 hover:shadow-md transition-all duration-300 flex flex-col justify-between"
          >
            <div className="flex items-start justify-between">
              <span className="text-[9.5px] font-extrabold uppercase tracking-wider text-slate-500 leading-tight">
                {stat.label}
              </span>
              <div className={`p-1.5 rounded-lg shrink-0 border ${stat.color}`}>
                <stat.icon className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-4">
              <p className="text-2xl font-extrabold text-slate-900 tracking-tight font-sans">
                {isLoading ? <div className="w-12 h-6 bg-slate-100/50 animate-pulse rounded" /> : stat.value}
              </p>
              <span className="text-[9.5px] text-slate-500 block font-bold mt-1 truncate">
                {stat.sub}
              </span>
            </div>
          </div>
        ))}
      </motion.div>

      {/* 3. QUICK ACTIONS GRID */}
      <motion.div
        variants={itemVariants}
        className="grid grid-cols-2 md:grid-cols-5 gap-4"
      >
        {[
          { label: 'Register Student', href: '/admin/students', icon: PlusCircle, color: 'bg-white/40 border-slate-200/80 hover:border-indigo-400 text-slate-700 hover:text-indigo-800 hover:bg-white/60' },
          { label: 'Review Approvals', href: '/admin/approvals', icon: CheckSquare, color: 'bg-white/40 border-slate-200/80 hover:border-indigo-400 text-slate-700 hover:text-indigo-800 hover:bg-white/60' },
          { label: 'Broadcast Notices', href: '/admin/communications', icon: Megaphone, color: 'bg-white/40 border-slate-200/80 hover:border-indigo-400 text-slate-700 hover:text-indigo-800 hover:bg-white/60' },
          { label: 'Audit Trail Logs', href: '/admin/audit-logs', icon: History, color: 'bg-white/40 border-slate-200/80 hover:border-indigo-400 text-slate-700 hover:text-indigo-800 hover:bg-white/60' },
          { label: 'System Settings', href: '/admin/settings', icon: Settings, color: 'bg-white/40 border-slate-200/80 hover:border-indigo-400 text-slate-700 hover:text-indigo-800 hover:bg-white/60' },
        ].map((act, i) => (
          <Link key={i} href={act.href}>
            <div className={`flex items-center justify-between p-4 rounded-2xl border text-xs font-bold shadow-sm transition-all duration-300 cursor-pointer ${act.color}`}>
              <div className="flex items-center gap-2.5">
                <act.icon className="w-5 h-5 shrink-0 text-indigo-650" />
                <span>{act.label}</span>
              </div>
              <ArrowRight className="w-4 h-4 opacity-50 shrink-0 text-slate-555" />
            </div>
          </Link>
        ))}
      </motion.div>

      {/* 4. MAIN ACADEMIC & FINANCIAL ANALYTICS */}
      <motion.div
        variants={itemVariants}
        className="grid grid-cols-1 lg:grid-cols-2 gap-6"
      >
        {/* Financial collection Chart */}
        <div className="bg-white/50 backdrop-blur-md border border-slate-200/80 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between pb-4 border-b border-slate-200/60 mb-5">
            <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-1.5 font-sans">
              <CreditCard className="w-4 h-4 text-indigo-600" /> Revenue Collection vs Targets
            </h3>
            <span className="text-[10px] text-slate-500 font-bold">Real-time Feed</span>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={collectionTrends}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="name" stroke="#475569" fontSize={10} tickLine={false} />
                <YAxis stroke="#475569" fontSize={10} tickLine={false} />
                <Tooltip contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.9)', backdropFilter: 'blur(8px)', border: '1px solid #E2E8F0', borderRadius: '12px', color: '#0F172A' }} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Bar dataKey="Target" fill="#818cf8" opacity={0.6} radius={[4, 4, 0, 0]} />
                <Bar dataKey="Collected" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Attendance trends chart */}
        <div className="bg-white/50 backdrop-blur-md border border-slate-200/80 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between pb-4 border-b border-slate-200/60 mb-5">
            <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-1.5 font-sans">
              <TrendingUp className="w-4 h-4 text-indigo-600" /> Department Attendance Trends
            </h3>
            <span className="text-[10px] text-slate-500 font-bold">Overall Average: 91%</span>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={attendanceTrends}>
                <defs>
                  <linearGradient id="colorCse" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorEce" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#14B8A6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#14B8A6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="name" stroke="#475569" fontSize={10} tickLine={false} />
                <YAxis stroke="#475569" fontSize={10} domain={[60, 100]} tickLine={false} />
                <Tooltip contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.9)', backdropFilter: 'blur(8px)', border: '1px solid #E2E8F0', borderRadius: '12px', color: '#0F172A' }} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Area type="monotone" dataKey="CSE" stroke="#4f46e5" fillOpacity={1} fill="url(#colorCse)" strokeWidth={2} />
                <Area type="monotone" dataKey="ECE" stroke="#14B8A6" fillOpacity={1} fill="url(#colorEce)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </motion.div>

      {/* 5. BOTTOM SECTION: AUDIT LOGS SUMMARY */}
      <motion.div
        variants={itemVariants}
        className="bg-white/50 backdrop-blur-md border border-slate-200/80 rounded-2xl p-6 shadow-sm"
      >
        <div className="flex items-center justify-between pb-3 border-b border-slate-200/60 mb-4">
          <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2 font-sans">
            <History className="w-4.5 h-4.5 text-indigo-600" /> Recent Security & Operations Logs
          </h3>
          <Link href="/admin/audit-logs" className="text-[10px] text-indigo-650 hover:underline font-extrabold flex items-center gap-0.5">
            Full Audit Trail <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        <div className="divide-y divide-slate-200/60">
          {recentLogs && recentLogs.length > 0 ? (
            recentLogs.map((log) => (
              <div key={log.id} className="py-3.5 flex flex-col sm:flex-row justify-between gap-3 text-xs font-bold text-slate-655">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded bg-white/40 border border-slate-200 flex items-center justify-center shrink-0">
                    <ShieldCheck className="w-4.5 h-4.5 text-indigo-600" />
                  </div>
                  <div>
                    <p className="text-slate-800 font-semibold">{log.action}</p>
                    <span className="text-[10px] text-slate-500 block mt-0.5">
                      {log.user_email} • {log.role}
                    </span>
                  </div>
                </div>

                <div className="text-[10px] text-slate-550 sm:text-right shrink-0">
                  {new Date(log.created_at).toLocaleDateString()} at{' '}
                  {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            ))
          ) : (
            <div className="py-8 text-center text-slate-400 text-xs font-semibold">
              No recent logs recorded.
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
