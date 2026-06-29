'use client';

import React, { useMemo } from 'react';
import { useAppStore } from '@/lib/store';
import { motion } from 'framer-motion';
import {
  Award,
  ArrowLeft,
  FileDown,
  BookOpen,
  CalendarCheck,
  CheckCircle,
  FileText,
} from 'lucide-react';
import Link from 'next/link';

// Detailed Fallback Mock Results
const mockSemester5Results = [
  {
    id: 'r1',
    subjects: { code: 'CS-501', name: 'Theory of Computation', credits: 4 },
    internal_marks: 27,
    exam_marks: 61,
    grade: 'A+',
    grade_points: 9,
  },
  {
    id: 'r2',
    subjects: { code: 'CS-502', name: 'Database Management Systems', credits: 4 },
    internal_marks: 29,
    exam_marks: 63,
    grade: 'O',
    grade_points: 10,
  },
  {
    id: 'r3',
    subjects: { code: 'CS-503', name: 'Design & Analysis of Algorithms', credits: 4 },
    internal_marks: 25,
    exam_marks: 59,
    grade: 'A',
    grade_points: 8,
  },
  {
    id: 'r4',
    subjects: { code: 'CS-504', name: 'Microprocessors', credits: 3 },
    internal_marks: 24,
    exam_marks: 54,
    grade: 'B+',
    grade_points: 7,
  },
  {
    id: 'r5',
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

const mockSemester6Results = [
  {
    id: 'r6_1',
    subjects: { code: 'CS-601', name: 'Compiler Design', credits: 4 },
    internal_marks: 27,
    assignment_marks: 18,
    practical_marks: null,
  },
  {
    id: 'r6_2',
    subjects: { code: 'CS-602', name: 'Computer Networks', credits: 4 },
    internal_marks: 24,
    assignment_marks: 16,
    practical_marks: null,
  },
  {
    id: 'r6_3',
    subjects: { code: 'CS-603', name: 'Software Engineering', credits: 4 },
    internal_marks: 26,
    assignment_marks: 18,
    practical_marks: null,
  },
  {
    id: 'r6_4',
    subjects: { code: 'CS-604', name: 'Artificial Intelligence', credits: 4 },
    internal_marks: 22,
    assignment_marks: 17,
    practical_marks: null,
  },
  {
    id: 'r6_5',
    subjects: { code: 'CS-605', name: 'Web Technologies', credits: 4 },
    internal_marks: 25,
    assignment_marks: 19,
    practical_marks: null,
  },
  {
    id: 'r6_6',
    subjects: { code: 'CS-606L', name: 'Computer Networks Lab', credits: 2 },
    internal_marks: null,
    assignment_marks: null,
    practical_marks: 45,
  },
];

export default function ExamsPage() {
  const { student } = useAppStore();

  // Completed Sem 5 Grades
  const displaySem5 = mockSemester5Results;

  // In-Progress Sem 6 Grades
  const displaySem6 = mockSemester6Results;

  // Calculate Sem 5 SGPA
  const sem5Summary = useMemo(() => {
    let totalPoints = 0;
    let totalCredits = 0;

    displaySem5.forEach((r: any) => {
      const credits = r.subjects?.credits || 4;
      totalPoints += r.grade_points * credits;
      totalCredits += credits;
    });

    const gpa = totalCredits > 0 ? (totalPoints / totalCredits).toFixed(2) : '8.75';
    return { gpa, totalCredits };
  }, [displaySem5]);

  const handleExport = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Printable CSS Overrides */}
      <style jsx global>{`
        @media print {
          body {
            background: #ffffff !important;
            color: #000000 !important;
          }
          aside, header, nav, button, .no-print {
            display: none !important;
          }
          .lg\\:pl-64, .xl\\:pl-72 {
            padding-left: 0 !important;
          }
          .max-w-7xl {
            max-width: 100% !important;
          }
          main {
            padding: 0 !important;
          }
          .print-container {
            border: none !important;
            box-shadow: none !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          .print-header {
            display: block !important;
            text-align: center;
            margin-bottom: 2rem;
            border-bottom: 2px solid #000;
            padding-bottom: 1rem;
          }
          table {
            color: #000000 !important;
            border-color: #000000 !important;
          }
          th, td {
            color: #000000 !important;
            border-bottom-color: #000000 !important;
          }
        }
      `}</style>

      {/* Page Header (Hidden during print) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 no-print">
        <div>
          <Link href="/dashboard" className="text-xs text-slate-500 hover:text-indigo-650 font-semibold flex items-center gap-1 mb-2">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
          </Link>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Examinations & Grades</h2>
          <p className="text-slate-600 text-xs mt-1">Review internal assessment progress, semester grades, and download grade sheets.</p>
        </div>
        <button
          onClick={handleExport}
          className="bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white px-4 py-2.5 text-xs font-bold rounded-xl flex items-center gap-1.5 transition shadow shadow-indigo-600/10 shrink-0 self-start sm:self-auto"
        >
          <FileDown className="w-4 h-4" /> Export Result Sheet
        </button>
      </div>

      {/* Dynamic Print Header (Shown ONLY during print) */}
      <div className="hidden print-header text-center text-slate-900">
        <h1 className="text-2xl font-bold tracking-tight uppercase">CampusOS University System</h1>
        <p className="text-sm font-semibold text-slate-505 mt-1">Official Academic Term Grade Report</p>
        <div className="grid grid-cols-2 text-left text-xs gap-2 mt-6 border border-slate-200 p-4 rounded-lg">
          <div><strong>Student Name:</strong> {student?.first_name || 'Aarav'} {student?.last_name || 'Sharma'}</div>
          <div><strong>Student ID:</strong> {student?.student_id || 'STU-2023-0042'}</div>
          <div><strong>Course Name:</strong> {student?.courses?.name || 'B.Tech - Computer Science'}</div>
          <div><strong>Department:</strong> {student?.departments?.name || 'Computer Science & Engineering'}</div>
        </div>
      </div>

      {/* GPA summary boxes */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 no-print">
        {[
          { label: 'Cumulative CGPA', value: student?.cgpa ? Number(student.cgpa).toFixed(2) : '8.72', icon: Award, color: 'text-indigo-700 bg-indigo-50 border border-indigo-100' },
          { label: 'Semester 5 SGPA', value: sem5Summary.gpa, icon: CalendarCheck, color: 'text-purple-700 bg-purple-50 border border-purple-100' },
          { label: 'Total Credits Earned', value: `${student ? 17 * 5 : 85} Credits`, icon: CheckCircle, color: 'text-emerald-700 bg-emerald-50 border border-emerald-100' },
        ].map((item, i) => (
          <div key={i} className="bg-white border border-slate-200 p-5 rounded-2xl flex items-center gap-4 shadow-sm">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${item.color}`}>
              <item.icon className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[9.5px] font-extrabold text-slate-500 uppercase tracking-wider block font-mono">{item.label}</span>
              <span className="text-2xl font-black text-slate-900 block mt-0.5">{item.value}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Layout Grid: Semester Results and Internal assessments */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 print-container">
        
        {/* Semester 5 Results (Completed Transcript) */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm lg:col-span-2 space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-200">
            <BookOpen className="w-4.5 h-4.5 text-indigo-600 no-print" />
            <h3 className="text-sm font-bold text-slate-800">Semester 5 Grade Details</h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-extrabold text-[9.5px] font-mono">
                  <th className="p-3">Code</th>
                  <th className="p-3">Subject Name</th>
                  <th className="p-3 text-center">Credits</th>
                  <th className="p-3 text-center">Marks (100)</th>
                  <th className="p-3 text-center">Letter Grade</th>
                  <th className="p-3 text-center">Grade Points</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/85">
                {displaySem5.map((r: any) => (
                  <tr key={r.id} className="hover:bg-slate-50 transition">
                    <td className="p-3 font-mono font-bold text-indigo-700">{r.subjects?.code}</td>
                    <td className="p-3 font-semibold text-slate-800">{r.subjects?.name}</td>
                    <td className="p-3 text-center font-bold text-slate-600">{r.subjects?.credits}</td>
                    <td className="p-3 text-center font-bold text-slate-900">
                      {r.internal_marks + r.exam_marks}
                    </td>
                    <td className="p-3 text-center">
                      <span className="font-extrabold text-indigo-700 px-2.5 py-0.5 bg-indigo-50 border border-indigo-100 rounded-md">
                        {r.grade}
                      </span>
                    </td>
                    <td className="p-3 text-center font-extrabold text-slate-700">{r.grade_points}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Semester 6 Internals (In-Progress) */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-200">
            <FileText className="w-4.5 h-4.5 text-indigo-600 no-print" />
            <h3 className="text-sm font-bold text-slate-800">Semester 6 Assessments</h3>
          </div>

          <div className="space-y-4">
            {displaySem6.map((r: any) => {
              const isLab = r.subjects?.code === 'CS-606L';
              return (
                <div key={r.id} className="space-y-2.5 pb-3.5 border-b border-slate-200/70 last:border-0 last:pb-0">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 leading-tight">{r.subjects?.name}</h4>
                      <span className="text-[9.5px] font-mono font-bold text-indigo-700">{r.subjects?.code}</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center text-[10px] bg-slate-50 p-2.5 rounded-xl border border-slate-200 font-bold">
                    <div>
                      <span className="text-[8.5px] text-slate-500 block font-bold">Test (30)</span>
                      <span className="text-slate-800 font-extrabold">{isLab ? '-' : r.internal_marks}</span>
                    </div>
                    <div>
                      <span className="text-[8.5px] text-slate-500 block font-bold">Assign (20)</span>
                      <span className="text-slate-800 font-extrabold">{isLab ? '-' : r.assignment_marks}</span>
                    </div>
                    <div>
                      <span className="text-[8.5px] text-slate-500 block font-bold">Practical (50)</span>
                      <span className="text-slate-800 font-extrabold">{isLab ? r.practical_marks : '-'}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}
