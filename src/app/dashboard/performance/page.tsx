'use client';

import React, { useMemo } from 'react';
import { useAppStore } from '@/lib/store';
import { motion } from 'framer-motion';
import {
  TrendingUp,
  ArrowLeft,
  ChevronUp,
  ChevronDown,
  BookOpen,
  Award,
} from 'lucide-react';
import Link from 'next/link';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar, Cell } from 'recharts';

// Fallback Mock Results
const mockResults = [
  {
    subjects: { code: 'CS-501', name: 'Theory of Computation', credits: 4 },
    internal_marks: 27,
    exam_marks: 61,
    grade: 'A+',
    grade_points: 9,
  },
  {
    subjects: { code: 'CS-502', name: 'Database Management Systems', credits: 4 },
    internal_marks: 29,
    exam_marks: 63,
    grade: 'O',
    grade_points: 10,
  },
  {
    subjects: { code: 'CS-503', name: 'Design & Analysis of Algorithms', credits: 4 },
    internal_marks: 25,
    exam_marks: 59,
    grade: 'A',
    grade_points: 8,
  },
  {
    subjects: { code: 'CS-504', name: 'Microprocessors', credits: 3 },
    internal_marks: 24,
    exam_marks: 54,
    grade: 'B+',
    grade_points: 7,
  },
  {
    subjects: { code: 'CS-505L', name: 'DBMS Laboratory', credits: 2 },
    internal_marks: 0,
    exam_marks: 46,
    grade: 'O',
    grade_points: 10,
  },
  {
    id: 'r6',
    subjects: { code: 'CS-506L', name: 'Algorithm Design Lab', credits: 2 },
    internal_marks: 0,
    exam_marks: 44,
    grade: 'A+',
    grade_points: 9,
  },
];

// Semester GPA Trend Data (Sem 1 to 5)
const gpaTrendData = [
  { name: 'Sem 1', SGPA: 8.20, CGPA: 8.20 },
  { name: 'Sem 2', SGPA: 8.45, CGPA: 8.32 },
  { name: 'Sem 3', SGPA: 8.50, CGPA: 8.38 },
  { name: 'Sem 4', SGPA: 8.80, CGPA: 8.49 },
  { name: 'Sem 5', SGPA: 8.75, CGPA: 8.72 },
];

const COLORS = ['#6366f1', '#a855f7', '#ec4899', '#f43f5e', '#e11d48', '#be123c'];

interface CustomTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string;
}

const CustomGpaTooltip: React.FC<CustomTooltipProps> = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-slate-200 p-2.5 rounded-xl shadow-xl">
        <p className="text-[10px] text-slate-500 font-extrabold uppercase tracking-wider">{label}</p>
        <div className="space-y-1 mt-1.5 font-semibold">
          <p className="text-xs text-indigo-650">
            SGPA: <span className="text-slate-900 font-bold">{payload[0].value}</span>
          </p>
          {payload[1] && (
            <p className="text-xs text-purple-650">
              CGPA: <span className="text-slate-900 font-bold">{payload[1].value}</span>
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
      <div className="bg-white border border-slate-200 p-2.5 rounded-xl shadow-xl">
        <p className="text-[10px] text-slate-500 font-extrabold uppercase tracking-wider">{payload[0].payload.fullName}</p>
        <p className="text-xs text-purple-655 font-extrabold mt-1">
          Total Score: <span className="text-slate-900 font-black">{payload[0].value} / 100</span>
        </p>
      </div>
    );
  }
  return null;
};

export default function PerformancePage() {
  const { student } = useAppStore();

  const displayResults = mockResults;

  // Subject Grades Data (Sem 5)
  const subjectMarksData = useMemo(() => {
    return displayResults.map((r: any) => ({
      name: r.subjects?.code || '',
      fullName: r.subjects?.name || '',
      Score: Number(r.internal_marks || 0) + Number(r.exam_marks || 0) + Number(r.practical_marks || 0),
    }));
  }, [displayResults]);

  // Strengths and Weakness extraction
  const strengthsAndWeaknesses = useMemo(() => {
    const sorted = [...displayResults].sort((a: any, b: any) => b.grade_points - a.grade_points);
    
    return {
      strengths: sorted.slice(0, 2).map((r: any) => ({
        name: r.subjects?.name,
        code: r.subjects?.code,
        grade: r.grade,
        reason: `Demonstrated a core mastery of internal principles and exam modules, securing top marks.`,
      })),
      weaknesses: sorted.slice(-2).map((r: any) => ({
        name: r.subjects?.name,
        code: r.subjects?.code,
        grade: r.grade,
        reason: `Slight performance deficit compared to peer classes. Suggested revision before terminal examinations.`,
      })),
    };
  }, [displayResults]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <Link href="/dashboard" className="text-xs text-slate-500 hover:text-indigo-600 font-semibold flex items-center gap-1 mb-2">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
        </Link>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">Academic Analytics & Performance</h2>
        <p className="text-slate-600 text-xs mt-1">Interactive visualizations tracing your historical GPA trend, subject strengths, and growth milestones.</p>
      </div>

      {/* GPA summaries */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Semester GPA Line Chart */}
        <div className="bg-white border border-slate-200 p-6 rounded-3xl shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <TrendingUp className="w-4.5 h-4.5 text-indigo-600" />
              GPA Progression
            </h3>
            <p className="text-[10px] text-slate-500 font-bold mt-1">Comparing SGPA vs Cumulative CGPA across semesters</p>
          </div>

          <div className="h-60 mt-4 w-full text-[10px] font-mono">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={gpaTrendData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorSgpa" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorCgpa" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#a855f7" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#a855f7" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
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
        <div className="bg-white border border-slate-200 p-6 rounded-3xl shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <BookOpen className="w-4.5 h-4.5 text-indigo-600" />
              Semester 5 Subject Scores
            </h3>
            <p className="text-[10px] text-slate-500 font-bold mt-1">Total score breakdown (out of 100) per subject</p>
          </div>

          <div className="h-60 mt-4 w-full text-[10px] font-mono">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={subjectMarksData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" stroke="#64748b" style={{ fontSize: '10px' }} />
                <YAxis domain={[0, 100]} stroke="#64748b" style={{ fontSize: '10px' }} />
                <Tooltip content={<CustomScoreTooltip />} />
                <Bar dataKey="Score" radius={[6, 6, 0, 0]}>
                  {subjectMarksData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Grid: Subject Strengths & Weak Areas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Subject Strengths */}
        <div className="bg-white border border-slate-200 p-6 rounded-3xl shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-200 text-emerald-600">
            <ChevronUp className="w-5 h-5" />
            <h3 className="text-sm font-bold text-slate-800">Key Strengths</h3>
          </div>

          <div className="space-y-4">
            {strengthsAndWeaknesses.strengths.map((str: any, idx: number) => (
              <div key={idx} className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl space-y-1 hover:border-emerald-250 transition shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <span className="font-extrabold text-slate-900 text-xs">{str.name}</span>
                  <span className="text-[9px] font-extrabold uppercase px-2.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-md shrink-0">
                    Grade {str.grade}
                  </span>
                </div>
                <p className="text-slate-600 text-xs mt-2.5 leading-relaxed font-semibold">{str.reason}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Areas for Improvement */}
        <div className="bg-white border border-slate-200 p-6 rounded-3xl shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-200 text-rose-700">
            <ChevronDown className="w-5 h-5" />
            <h3 className="text-sm font-bold text-slate-800">Areas for Improvement</h3>
          </div>

          <div className="space-y-4">
            {strengthsAndWeaknesses.weaknesses.map((weak: any, idx: number) => (
              <div key={idx} className="p-4 bg-rose-50 border border-rose-100 rounded-2xl space-y-1 hover:border-rose-250 transition shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <span className="font-extrabold text-slate-900 text-xs">{weak.name}</span>
                  <span className="text-[9px] font-extrabold uppercase px-2.5 py-0.5 bg-rose-50 text-rose-700 border border-rose-100 rounded-md shrink-0">
                    Grade {weak.grade}
                  </span>
                </div>
                <p className="text-slate-600 text-xs mt-2.5 leading-relaxed font-semibold">{weak.reason}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Academic Growth Timeline */}
      <div className="bg-white border border-slate-200 p-6 rounded-3xl shadow-sm space-y-6">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-200">
          <Award className="w-5 h-5 text-indigo-600 animate-pulse" />
          <h3 className="text-sm font-bold text-slate-800">Growth Timeline</h3>
        </div>

        <div className="relative pl-6 border-l border-slate-200 space-y-6 text-xs ml-4 font-semibold">
          <div className="relative">
            <div className="absolute top-1.5 -left-[31px] w-4 h-4 bg-white rounded-full border-2 border-indigo-600 flex items-center justify-center shadow-sm">
              <div className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-pulse" />
            </div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-slate-900 text-xs">Semester 6 In-Progress</span>
              <span className="text-[9px] font-extrabold uppercase px-2 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-md">Active</span>
            </div>
            <p className="text-slate-600 mt-2">Maintaining a current CGPA of 8.72, aiming to clear internal evaluations next week.</p>
          </div>

          <div className="relative">
            <div className="absolute top-1.5 -left-[30px] w-3.5 h-3.5 bg-slate-200 border border-slate-350 rounded-full" />
            <span className="text-slate-700 flex items-center gap-2">
              Semester 5 Completion <span className="text-[10px] text-slate-500 font-mono font-bold">(Dec 2025)</span>
            </span>
            <p className="text-slate-600 mt-2">Concluded Term 5 with SGPA of 8.75. Scored a perfect O grade in Database Management Systems.</p>
          </div>

          <div className="relative">
            <div className="absolute top-1.5 -left-[30px] w-3.5 h-3.5 bg-slate-200 border border-slate-350 rounded-full" />
            <span className="text-slate-700 flex items-center gap-2">
              Semester 4 Completion <span className="text-[10px] text-slate-500 font-mono font-bold">(May 2025)</span>
            </span>
            <p className="text-slate-600 mt-2">Achieved SGPA of 8.80. Created a simulated database parser featured in the CSE newsletter.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
