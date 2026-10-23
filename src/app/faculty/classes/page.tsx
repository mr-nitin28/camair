'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAppStore } from '@/lib/store';
import { StatusBadge } from '@/components/ui/status-badge';
import { EmptyState } from '@/components/ui/empty-state';
import {
  Compass,
  ArrowLeft,
  Calendar,
  Clock,
  BookOpen,
  MapPin,
  Users,
  ArrowRight,
  CalendarCheck,
} from 'lucide-react';
import Link from 'next/link';

export default function FacultyClassesPage() {
  const { faculty } = useAppStore();

  const assignedSections = [
    {
      id: 'sec-1',
      subjectCode: 'CS601',
      subjectName: 'Compiler Design',
      programme: 'B.Tech Computer Science',
      semester: 6,
      section: 'Section A & B (Combined)',
      enrolledCount: 160,
      credits: 4,
      room: 'Auditorium Hall 2',
    },
    {
      id: 'sec-2',
      subjectCode: 'CS605L',
      subjectName: 'Compiler Design Lab',
      programme: 'B.Tech Computer Science',
      semester: 6,
      section: 'Lab Batches L1 & L2',
      enrolledCount: 60,
      credits: 2,
      room: 'Computer Lab 3, Tech Wing',
    },
  ];

  const weeklySchedule = [
    {
      day: 'Monday',
      slots: [
        { time: '09:00 AM - 10:30 AM', code: 'CS601', name: 'Compiler Design', type: 'Lecture', venue: 'Auditorium Hall 2', section: 'Section A & B', sessionId: '00000000-0000-0000-0000-000000000501' },
        { time: '02:00 PM - 04:00 PM', code: 'CS605L', name: 'Compiler Design Lab', type: 'Lab Practical', venue: 'Computer Lab 3', section: 'Batch L1', sessionId: '00000000-0000-0000-0000-000000000502' },
      ],
    },
    {
      day: 'Tuesday',
      slots: [
        { time: '11:00 AM - 12:30 PM', code: 'CS601', name: 'Compiler Design', type: 'Lecture', venue: 'Auditorium Hall 2', section: 'Section A & B', sessionId: '00000000-0000-0000-0000-000000000503' },
      ],
    },
    {
      day: 'Wednesday',
      slots: [
        { time: '09:00 AM - 10:30 AM', code: 'CS601', name: 'Compiler Design', type: 'Lecture', venue: 'Auditorium Hall 2', section: 'Section A & B', sessionId: '00000000-0000-0000-0000-000000000501' },
        { time: '03:00 PM - 04:30 PM', code: 'CAPSTONE', name: 'LLVM JIT Review', type: 'Advisory Sync', venue: 'Faculty Cabin 302', section: 'Research Group', sessionId: '' },
      ],
    },
    {
      day: 'Thursday',
      slots: [
        { time: '11:00 AM - 12:30 PM', code: 'CS601', name: 'Compiler Design (Problem Solving)', type: 'Tutorial', venue: 'Lecture Hall 1', section: 'Section A', sessionId: '00000000-0000-0000-0000-000000000503' },
      ],
    },
    {
      day: 'Friday',
      slots: [
        { time: '09:00 AM - 10:30 AM', code: 'CS601', name: 'Compiler Design', type: 'Lecture', venue: 'Auditorium Hall 2', section: 'Section A & B', sessionId: '00000000-0000-0000-0000-000000000503' },
        { time: '02:00 PM - 04:00 PM', code: 'CS605L', name: 'Compiler Design Lab Catch-up', type: 'Lab Practical', venue: 'Computer Lab 3', section: 'Batch L2', sessionId: '00000000-0000-0000-0000-000000000502' },
      ],
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-3xl bg-card border border-border shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground font-semibold mb-1">
            <Link href="/faculty" className="hover:text-primary flex items-center gap-1">
              <ArrowLeft className="w-3.5 h-3.5" /> Faculty Console
            </Link>
            <span>•</span>
            <span>Weekly Master Timetable & Curricular Workload</span>
          </div>
          <h1 className="text-xl md:text-2xl font-black text-foreground tracking-tight">
            Class Assignments & Timetables
          </h1>
        </div>
      </div>

      {/* Assigned Sections Grid */}
      <div className="space-y-3">
        <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">
          Assigned Course Sections
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {assignedSections.map((sec) => (
            <div
              key={sec.id}
              className="p-5 rounded-3xl bg-card border border-border shadow-xs flex items-center justify-between hover:border-primary/40 transition-all"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center font-bold shrink-0">
                  <Compass className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground">
                    {sec.subjectCode} — {sec.subjectName}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {sec.programme} • Semester {sec.semester} ({sec.section})
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5 font-semibold">
                    {sec.room} • {sec.credits} Academic Credits
                  </p>
                </div>
              </div>

              <div className="text-right shrink-0">
                <span className="font-mono text-base font-extrabold text-foreground">
                  {sec.enrolledCount}
                </span>
                <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider block">
                  Enrolled
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Weekly Schedule Table */}
      <div className="p-6 rounded-3xl bg-card border border-border shadow-xs space-y-6">
        <div className="flex items-center gap-2 pb-3 border-b border-border/60">
          <Calendar className="w-5 h-5 text-primary" />
          <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">
            Weekly Lecture & Practical Timetable
          </h2>
        </div>

        <div className="space-y-6">
          {weeklySchedule.map((day, idx) => (
            <div
              key={idx}
              className="grid grid-cols-1 md:grid-cols-4 gap-4 pb-4 border-b border-border/40 last:border-0 last:pb-0"
            >
              <div className="md:col-span-1 py-1 font-bold text-foreground text-xs uppercase tracking-wider">
                {day.day}
              </div>
              <div className="md:col-span-3 space-y-3">
                {day.slots.map((slot, sidx) => (
                  <div
                    key={sidx}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-muted/30 border border-border/60 rounded-2xl hover:border-primary/40 transition-colors text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-foreground">
                          {slot.name} ({slot.code})
                        </h4>
                        <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-bold">
                          {slot.section}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-1 font-medium">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" /> {slot.time}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5" /> {slot.venue}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-auto">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-muted text-muted-foreground rounded-md border border-border/60">
                        {slot.type}
                      </span>
                      {slot.sessionId && (
                        <Link
                          href={`/faculty/attendance?sessionId=${slot.sessionId}`}
                          className="inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-primary text-primary-foreground text-xs font-bold shadow-xs hover:bg-primary/90"
                        >
                          <CalendarCheck className="w-3.5 h-3.5" /> Roll Call
                        </Link>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
