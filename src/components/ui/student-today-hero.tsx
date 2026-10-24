'use client';

import React from 'react';
import Link from 'next/link';
import {
  Clock,
  MapPin,
  CalendarDays,
  Sparkles,
  ArrowRight,
  CreditCard,
  FileText,
  HelpCircle,
  BookOpen,
} from 'lucide-react';

export interface NextClassInfo {
  subjectName: string;
  subjectCode: string;
  timeSlot: string;
  room: string;
  facultyName: string;
  startsInMinutes: number;
}

export interface StudentTodayHeroProps {
  studentName: string;
  enrollmentNo: string;
  semesterName: string;
  nextClass?: NextClassInfo | null;
  overallAttendancePct: number;
  dueFeeAmount?: number; // In Minor units or direct currency
  className?: string;
}

/**
 * StudentTodayHero
 * 
 * Mobile-first high-context hero card for the Student Self-Service Portal.
 * Optimally designed for 360-390px viewports and scaling smoothly to desktop.
 */
export function StudentTodayHero({
  studentName,
  enrollmentNo,
  semesterName,
  nextClass,
  overallAttendancePct,
  dueFeeAmount = 0,
  className = '',
}: StudentTodayHeroProps) {
  const isAttendanceShortage = overallAttendancePct < 75;

  return (
    <div
      className={`relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-900 via-slate-900 to-indigo-950 text-white p-5 md:p-8 shadow-xl border border-indigo-800/40 ${className}`}
    >
      {/* Subtle Background Glow Spheres */}
      <div className="absolute -top-16 -right-16 w-56 h-56 rounded-full bg-indigo-500/20 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-16 -left-16 w-56 h-56 rounded-full bg-purple-500/15 blur-3xl pointer-events-none" />

      {/* Header: Persona & Greeting */}
      <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/10 backdrop-blur-md text-[11px] font-semibold text-indigo-200 border border-white/10 mb-2">
            <Sparkles className="w-3 h-3 text-amber-300" />
            <span>{semesterName}</span>
            <span className="opacity-40">•</span>
            <span className="font-mono">{enrollmentNo}</span>
          </div>
          <h1 className="text-xl md:text-3xl font-black tracking-tight text-white">
            Welcome back, {studentName.split(' ')[0]}
          </h1>
        </div>

        {/* Attendance Pill */}
        <div className="self-start sm:self-auto inline-flex items-center gap-2 px-3.5 py-1.5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15">
          <div className="text-right">
            <span className="text-[10px] uppercase font-bold tracking-wider text-indigo-200 block">
              Attendance
            </span>
            <span className="text-sm font-black tabular-nums">
              {overallAttendancePct.toFixed(1)}%
            </span>
          </div>
          <span
            className={`w-2.5 h-2.5 rounded-full ${
              isAttendanceShortage ? 'bg-rose-400 animate-pulse' : 'bg-emerald-400'
            }`}
          />
        </div>
      </div>

      {/* Main Feature: Upcoming Class Banner */}
      <div className="relative z-10 mt-6 p-4 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {nextClass ? (
            <div className="flex items-start gap-3.5">
              <div className="p-3 rounded-2xl bg-indigo-500/20 border border-indigo-400/20 text-indigo-300 shrink-0">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 text-xs font-semibold text-indigo-200">
                  <span className="font-mono bg-white/10 px-1.5 py-0.5 rounded text-[10px]">
                    {nextClass.subjectCode}
                  </span>
                  <span>Starts in {nextClass.startsInMinutes} mins</span>
                </div>
                <h2 className="text-base font-bold text-white mt-0.5">
                  {nextClass.subjectName}
                </h2>
                <div className="flex items-center gap-4 text-xs text-indigo-200/80 mt-1">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" />
                    {nextClass.room}
                  </span>
                  <span>{nextClass.facultyName}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 text-indigo-200 text-sm">
              <CalendarDays className="w-5 h-5 text-indigo-400" />
              <span>No further lectures scheduled for today. You are free!</span>
            </div>
          )}

          {/* Quick Deep Link */}
          <Link
            href="/dashboard/attendance"
            className="self-start md:self-auto inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white text-indigo-950 font-bold text-xs shadow-md hover:bg-indigo-50 active:scale-95 transition-all shrink-0"
          >
            <span>View Full Schedule</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Thumb-Zone Quick Action Shortcuts (Mobile-First 4-Column Grid) */}
      <div className="relative z-10 mt-5 grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <Link
          href="/dashboard/leaves"
          className="p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/20 transition-all flex items-center gap-2.5 active:scale-95"
        >
          <div className="p-2 rounded-lg bg-indigo-500/20 text-indigo-300">
            <FileText className="w-4 h-4" />
          </div>
          <div>
            <span className="text-xs font-bold text-white block">Apply Leave</span>
            <span className="text-[10px] text-indigo-200/70">Instant filing</span>
          </div>
        </Link>

        <Link
          href="/dashboard/doubts"
          className="p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/20 transition-all flex items-center gap-2.5 active:scale-95"
        >
          <div className="p-2 rounded-lg bg-purple-500/20 text-purple-300">
            <HelpCircle className="w-4 h-4" />
          </div>
          <div>
            <span className="text-xs font-bold text-white block">Ask Doubt</span>
            <span className="text-[10px] text-indigo-200/70">Faculty desk</span>
          </div>
        </Link>

        <Link
          href="/dashboard/resources"
          className="p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/20 transition-all flex items-center gap-2.5 active:scale-95"
        >
          <div className="p-2 rounded-lg bg-cyan-500/20 text-cyan-300">
            <BookOpen className="w-4 h-4" />
          </div>
          <div>
            <span className="text-xs font-bold text-white block">Vault</span>
            <span className="text-[10px] text-indigo-200/70">Lecture notes</span>
          </div>
        </Link>

        <Link
          href="/dashboard/fees"
          className="p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/20 transition-all flex items-center gap-2.5 active:scale-95"
        >
          <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-300">
            <CreditCard className="w-4 h-4" />
          </div>
          <div>
            <span className="text-xs font-bold text-white block">Fee Ledger</span>
            <span className="text-[10px] text-indigo-200/70">
              {dueFeeAmount > 0 ? `₹${(dueFeeAmount / 100).toLocaleString('en-IN')} Due` : 'Clear'}
            </span>
          </div>
        </Link>
      </div>
    </div>
  );
}
