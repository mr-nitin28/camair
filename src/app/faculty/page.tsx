'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAppStore } from '@/lib/store';
import { motion } from 'framer-motion';
import {
  Compass,
  BookOpen,
  Users,
  HelpCircle,
  CalendarClock,
  FileEdit,
  ArrowRight,
  Clock,
  PlusCircle,
  Megaphone,
  FileUp,
  Calendar,
  Sparkles,
} from 'lucide-react';
import Link from 'next/link';

export default function FacultyDashboard() {
  const { faculty } = useAppStore();

  // Fetch Counts
  const { data: metrics } = useQuery({
    queryKey: ['faculty-metrics', faculty?.id],
    queryFn: async () => {
      // 1. Total Students
      const { count: studentCount } = await supabase
        .from('students')
        .select('*', { count: 'exact', head: true });

      // 2. Pending Doubts
      const { count: doubtCount } = await supabase
        .from('doubts')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'Open');

      // 3. Pending Leave Requests
      const { count: leaveCount } = await supabase
        .from('leave_requests')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'Pending');

      // 4. Pending Evaluations (Submitted but not Graded)
      const { count: evaluationCount } = await supabase
        .from('assignment_submissions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'Submitted');

      return {
        students: studentCount || 0,
        doubts: doubtCount || 0,
        leaves: leaveCount || 0,
        evaluations: evaluationCount || 0,
      };
    },
    enabled: !!faculty,
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

  const schedule = [
    { time: '09:00 AM - 10:30 AM', title: 'Computer Networks (CS601) - Lecture', type: 'Class', venue: 'CSE Lecture Hall 3', badge: 'bg-indigo-50 text-indigo-700 border-indigo-100' },
    { time: '11:00 AM - 12:30 PM', title: 'Software Engineering (CS602) - Seminar', type: 'Class', venue: 'CSE Lab 2', badge: 'bg-indigo-50 text-indigo-700 border-indigo-100' },
    { time: '02:30 PM - 03:30 PM', title: 'Capstone Project Review Sync', type: 'Meeting', venue: 'Faculty Room 102', badge: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
    { time: '04:00 PM - 05:00 PM', title: 'CSE Department Faculty Meeting', type: 'Meeting', venue: 'Boardroom A', badge: 'bg-amber-50 text-amber-700 border-amber-100' },
  ];

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-6 bg-transparent"
    >
      {/* 1. HERO SECTION (Welcome Banner with student panel dark theme style) */}
      <motion.div
        variants={itemVariants}
        className="relative bg-gradient-to-r from-indigo-900 via-indigo-955 to-purple-950 p-6 md:p-8 rounded-3xl text-white overflow-hidden border border-indigo-500/20 shadow-md animate-fadeIn"
      >
        <div className="absolute inset-0 bg-grid-white/[0.02] pointer-events-none" />
        <div className="absolute top-[-50%] right-[-10%] w-[50%] h-[200%] bg-indigo-500/10 blur-[100px] rounded-full pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4.5">
            <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center font-bold text-xl text-white uppercase shadow-inner shrink-0">
              {faculty ? `${faculty.first_name[0]}${faculty.last_name[0]}` : 'FC'}
            </div>
            <div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-[10px] font-bold text-indigo-200 uppercase tracking-widest">
                <Sparkles className="w-3 h-3 text-indigo-200" /> Operations Center
              </span>
              <h2 className="text-2xl md:text-3xl font-bold tracking-tight mt-2.5">
                Good Morning, Dr. {faculty?.last_name || 'Sharma'}
              </h2>
              <p className="text-indigo-200 text-xs md:text-sm mt-1 font-semibold max-w-xl">
                {faculty?.departments?.name || 'Computer Science Department'} • Academic Year 2025-2026
              </p>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-md border border-white/10 py-2.5 px-4 rounded-2xl flex items-center gap-3 shrink-0 self-start md:self-auto">
            <div className="w-2.5 h-2.5 bg-emerald-400 rounded-full animate-pulse" />
            <span className="text-xs font-bold text-indigo-100 font-sans">
              System Active
            </span>
          </div>
        </div>
      </motion.div>

      {/* 2. QUICK METRICS */}
      <motion.div
        variants={itemVariants}
        className="grid grid-cols-2 lg:grid-cols-6 gap-4.5"
      >
        {[
          { label: 'Assigned Classes', value: '1', icon: Compass, sub: 'BTech CSE Sem 6' },
          { label: 'Assigned Subjects', value: '2', icon: BookOpen, sub: 'CS601, CS602' },
          { label: 'Total Students', value: metrics?.students || '1', icon: Users, sub: 'CSE Department' },
          { label: 'Pending Doubts', value: metrics?.doubts || '0', icon: HelpCircle, sub: 'Needs Reply', highlight: (metrics?.doubts || 0) > 0 ? 'text-amber-700 bg-amber-50' : 'text-slate-500 bg-slate-50', trendColor: (metrics?.doubts || 0) > 0 ? 'text-amber-750 bg-amber-50' : 'text-slate-700 bg-slate-100' },
          { label: 'Leave Requests', value: metrics?.leaves || '0', icon: CalendarClock, sub: 'Approvals Pending', highlight: (metrics?.leaves || 0) > 0 ? 'text-amber-700 bg-amber-50' : 'text-slate-500 bg-slate-50', trendColor: (metrics?.leaves || 0) > 0 ? 'text-amber-750 bg-amber-50' : 'text-slate-700 bg-slate-100' },
          { label: 'Pending Grades', value: metrics?.evaluations || '0', icon: FileEdit, sub: 'Submissions Box', highlight: (metrics?.evaluations || 0) > 0 ? 'text-indigo-700 bg-indigo-50' : 'text-slate-500 bg-slate-50', trendColor: (metrics?.evaluations || 0) > 0 ? 'text-indigo-750 bg-indigo-50' : 'text-slate-700 bg-slate-100' },
        ].map((stat, i) => (
          <div
            key={i}
            className="bg-white/50 backdrop-blur-md border border-slate-200/80 p-5 rounded-2xl hover:border-indigo-400 transition-all duration-300 flex flex-col justify-between shadow-sm"
          >
            <div className="flex items-start justify-between">
              <span className="text-[9.5px] font-semibold uppercase tracking-wider text-slate-500 leading-tight">
                {stat.label}
              </span>
              <div className={`p-1.5 rounded-lg shrink-0 ${stat.highlight || 'text-slate-500 bg-slate-100'}`}>
                <stat.icon className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-4">
              <p className="text-2xl font-bold text-slate-800 tracking-tight">
                {stat.value}
              </p>
              <span className="text-[9.5px] text-slate-400 block font-semibold mt-1 truncate">
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
          { label: 'Mark Attendance', href: '/faculty/attendance', icon: PlusCircle },
          { label: 'Upload Grades', href: '/faculty/exams', icon: FileEdit },
          { label: 'Share Notice', href: '/faculty/announcements', icon: Megaphone },
          { label: 'Upload Materials', href: '/faculty/notes', icon: FileUp },
          { label: 'Add Assignment', href: '/faculty/assignments', icon: Sparkles },
        ].map((act, i) => (
          <Link key={i} href={act.href}>
            <div className="flex items-center justify-between p-4 rounded-2xl bg-white/50 backdrop-blur-md border border-slate-200/80 text-xs font-bold shadow-sm hover:border-indigo-400 hover:text-indigo-900 hover:bg-white/30 transition-all duration-300 cursor-pointer group">
              <div className="flex items-center gap-2.5">
                <act.icon className="w-5 h-5 shrink-0 text-indigo-600 group-hover:scale-110 transition duration-300" />
                <span>{act.label}</span>
              </div>
              <ArrowRight className="w-4 h-4 opacity-50 shrink-0 group-hover:translate-x-1 transition duration-300" />
            </div>
          </Link>
        ))}
      </motion.div>

      {/* 4. MAIN ACADEMIC SCHEDULE */}
      <motion.div
        variants={itemVariants}
        className="grid grid-cols-1 gap-6"
      >
        <div className="bg-white/50 backdrop-blur-md border border-slate-200/80 rounded-3xl p-6 shadow-sm">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-200 mb-4">
            <Calendar className="w-4.5 h-4.5 text-indigo-600" />
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Today's Academic Schedule</h3>
          </div>

          <div className="space-y-4">
            {schedule.map((item, idx) => (
              <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-white/40 border border-slate-200/60 hover:border-slate-350 hover:bg-white/60 transition duration-300 rounded-2xl">
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center shrink-0">
                    <Clock className="w-5 h-5 text-slate-400" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">{item.title}</h4>
                    <div className="flex items-center gap-2 text-[10px] text-slate-500 font-semibold mt-1">
                      <span>{item.time}</span>
                      <span>•</span>
                      <span>{item.venue}</span>
                    </div>
                  </div>
                </div>

                <span className={`text-[9.5px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full shrink-0 border self-start sm:self-auto ${item.badge}`}>
                  {item.type}
                </span>
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
