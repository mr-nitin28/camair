'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAppStore } from '@/lib/store';
import {
  Compass,
  ArrowLeft,
  Calendar,
  Clock,
  BookOpen,
  MapPin,
  Users,
} from 'lucide-react';
import Link from 'next/link';

export default function FacultyClassesPage() {
  const { faculty } = useAppStore();

  // Fetch assigned classes
  const { data: classes, isLoading } = useQuery({
    queryKey: ['faculty-classes-list', faculty?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('faculty_classes')
        .select('*, courses(*), semesters(*)');
      if (error) throw error;
      return data;
    },
    enabled: !!faculty,
  });

  const weeklySchedule = [
    { day: 'Monday', slots: [
      { time: '09:00 AM - 10:30 AM', code: 'CS601', name: 'Computer Networks', type: 'Lecture', venue: 'Lecture Hall 3' },
      { time: '02:30 PM - 04:30 PM', code: 'CS605', name: 'Web Development Lab', type: 'Practical', venue: 'Lab 4' },
    ]},
    { day: 'Tuesday', slots: [
      { time: '11:00 AM - 12:30 PM', code: 'CS602', name: 'Software Engineering', type: 'Lecture', venue: 'Lecture Hall 1' },
    ]},
    { day: 'Wednesday', slots: [
      { time: '09:00 AM - 10:30 AM', code: 'CS601', name: 'Computer Networks', type: 'Lecture', venue: 'Lecture Hall 3' },
      { time: '03:00 PM - 04:30 PM', code: 'CS603', name: 'Artificial Intelligence', type: 'Lecture', venue: 'Seminar Hall B' },
    ]},
    { day: 'Thursday', slots: [
      { time: '11:00 AM - 12:30 PM', code: 'CS602', name: 'Software Engineering', type: 'Lecture', venue: 'Lecture Hall 1' },
      { time: '02:30 PM - 03:30 PM', code: 'PROJ', name: 'Capstone Project Review', type: 'Sync', venue: 'Faculty Room 102' },
    ]},
    { day: 'Friday', slots: [
      { time: '09:00 AM - 10:30 AM', code: 'CS601', name: 'Computer Networks', type: 'Lecture', venue: 'Lecture Hall 3' },
      { time: '11:00 AM - 12:30 PM', code: 'CS604', name: 'Database Systems', type: 'Lecture', venue: 'Lecture Hall 3' },
    ]},
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <Link href="/faculty" className="text-xs text-slate-500 hover:text-blue-600 font-semibold flex items-center gap-1 mb-2">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Workspace
        </Link>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">Class Assignments & Timetables</h2>
        <p className="text-slate-500 text-xs mt-1">Review your assigned courses, enrolled students, and weekly timetable planner logs.</p>
      </div>

      {/* Classes Grid */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-slate-950">Assigned Sections</h3>
        {isLoading ? (
          <div className="text-slate-400 text-xs py-6">Loading sections...</div>
        ) : !classes || classes.length === 0 ? (
          <div className="p-6 bg-white border border-slate-200 rounded-2xl text-center text-slate-400 text-xs">
            No sections mapped to your faculty ID.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {classes.map((cls: any) => (
              <div key={cls.id} className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm flex items-center justify-between hover:border-slate-300 transition">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                    <Compass className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 leading-snug">{cls.courses?.name}</h4>
                    <span className="text-[10px] text-slate-400 font-semibold mt-0.5 block">
                      Semester {cls.semesters?.number} • {cls.section}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-sm font-extrabold text-slate-900 block flex items-center gap-1">
                    <Users className="w-3.5 h-3.5 text-slate-400" /> 1
                  </span>
                  <span className="text-[8.5px] text-slate-400 font-bold uppercase tracking-wider block mt-0.5">Enrolled</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Timetable Grid */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
          <Calendar className="w-4.5 h-4.5 text-blue-600" />
          <h3 className="text-sm font-bold text-slate-950">Weekly Lecture Schedule</h3>
        </div>

        <div className="space-y-6">
          {weeklySchedule.map((day, idx) => (
            <div key={idx} className="grid grid-cols-1 md:grid-cols-4 gap-4 pb-4 border-b border-slate-100 last:border-0 last:pb-0">
              <div className="md:col-span-1 py-1 font-bold text-slate-900 text-xs uppercase tracking-wider">
                {day.day}
              </div>
              <div className="md:col-span-3 space-y-3">
                {day.slots.map((slot, sidx) => (
                  <div key={sidx} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-slate-50 border border-slate-100 rounded-xl hover:border-slate-200 transition text-xs">
                    <div className="space-y-1">
                      <h4 className="font-bold text-slate-800 leading-tight">
                        {slot.name} ({slot.code})
                      </h4>
                      <div className="flex items-center gap-2 text-[10px] text-slate-400 font-semibold">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" /> {slot.time}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5" /> {slot.venue}
                        </span>
                      </div>
                    </div>
                    <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full shrink-0 self-start sm:self-auto">
                      {slot.type}
                    </span>
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
