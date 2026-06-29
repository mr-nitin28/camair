'use client';

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAppStore } from '@/lib/store';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Award,
  ArrowLeft,
  CheckCircle,
  AlertTriangle,
  Save,
  Loader2,
  FileSpreadsheet,
  Download,
} from 'lucide-react';
import Link from 'next/link';

interface Student {
  id: string;
  student_id: string;
  first_name: string;
  last_name: string;
  semester_id: string;
}

interface ResultRecord {
  id?: string;
  student_id: string;
  subject_id: string;
  semester_id: string;
  internal_marks: number;
  assignment_marks: number;
  practical_marks: number;
  exam_marks: number;
  grade: string;
  grade_points: number;
}

export default function ExamsGradesPage() {
  const { faculty } = useAppStore();
  const queryClient = useQueryClient();

  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [gradesSheet, setGradesSheet] = useState<Record<string, Omit<ResultRecord, 'subject_id' | 'semester_id'>>>({});
  
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Fetch subjects taught by faculty
  const { data: subjects } = useQuery({
    queryKey: ['faculty-subjects-exams', faculty?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('faculty_subjects')
        .select('*, subjects(*)');
      if (error) throw error;
      return data?.map((fs: any) => fs.subjects) || [];
    },
    enabled: !!faculty,
  });

  // Set default subject
  useEffect(() => {
    if (subjects && subjects.length > 0 && !selectedSubjectId) {
      setSelectedSubjectId(subjects[0].id);
    }
  }, [subjects, selectedSubjectId]);

  // Fetch students (for Semester 6/B.Tech)
  const { data: students, isLoading: loadingStudents } = useQuery({
    queryKey: ['students-exams-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .order('student_id', { ascending: true });
      if (error) throw error;
      return data as Student[];
    },
  });

  // Fetch existing results for selected subject
  const { data: existingResults, isLoading: loadingResults } = useQuery({
    queryKey: ['existing-results-list', selectedSubjectId],
    queryFn: async () => {
      if (!selectedSubjectId) return [];
      const { data, error } = await supabase
        .from('results')
        .select('*')
        .eq('subject_id', selectedSubjectId);
      if (error) throw error;
      return data as ResultRecord[];
    },
    enabled: !!selectedSubjectId,
  });

  // Sync state
  useEffect(() => {
    if (students && selectedSubjectId) {
      const sheet: Record<string, Omit<ResultRecord, 'subject_id' | 'semester_id'>> = {};
      
      students.forEach((s) => {
        // Find existing result
        const res = existingResults?.find((r) => r.student_id === s.id);
        if (res) {
          sheet[s.id] = {
            id: res.id,
            student_id: s.id,
            internal_marks: Number(res.internal_marks) || 0,
            assignment_marks: Number(res.assignment_marks) || 0,
            practical_marks: Number(res.practical_marks) || 0,
            exam_marks: Number(res.exam_marks) || 0,
            grade: res.grade || 'IP',
            grade_points: res.grade_points || 0,
          };
        } else {
          sheet[s.id] = {
            student_id: s.id,
            internal_marks: 0,
            assignment_marks: 0,
            practical_marks: 0,
            exam_marks: 0,
            grade: 'IP',
            grade_points: 0,
          };
        }
      });
      setGradesSheet(sheet);
    }
  }, [students, existingResults, selectedSubjectId]);

  // Grade calculator utility
  const calculateGradeAndPoints = (
    internals: number,
    assignments: number,
    practicals: number,
    exams: number
  ) => {
    // Standard total weight = internal (30) + assignment (20) + practical (50) + exam (100) = 200 max.
    const total = Number(internals) + Number(assignments) + Number(practicals) + Number(exams);
    const percentage = (total / 200) * 100;

    let grade = 'F';
    let points = 0;

    if (percentage >= 90) {
      grade = 'O';
      points = 10;
    } else if (percentage >= 80) {
      grade = 'A+';
      points = 9;
    } else if (percentage >= 70) {
      grade = 'A';
      points = 8;
    } else if (percentage >= 60) {
      grade = 'B+';
      points = 7;
    } else if (percentage >= 50) {
      grade = 'B';
      points = 6;
    } else if (percentage >= 40) {
      grade = 'C';
      points = 5;
    } else {
      grade = 'F';
      points = 0;
    }

    return { grade, points, total };
  };

  const handleMarkChange = (
    studentId: string,
    field: 'internal_marks' | 'assignment_marks' | 'practical_marks' | 'exam_marks',
    val: number
  ) => {
    // Constrain max marks bounds
    let max = 100;
    if (field === 'internal_marks') max = 30;
    if (field === 'assignment_marks') max = 20;
    if (field === 'practical_marks') max = 50;

    const numericVal = Math.min(max, Math.max(0, val));

    setGradesSheet((prev) => {
      const record = prev[studentId];
      const nextRecord = {
        ...record,
        [field]: numericVal,
      };

      const { grade, points } = calculateGradeAndPoints(
        field === 'internal_marks' ? numericVal : record.internal_marks,
        field === 'assignment_marks' ? numericVal : record.assignment_marks,
        field === 'practical_marks' ? numericVal : record.practical_marks,
        field === 'exam_marks' ? numericVal : record.exam_marks
      );

      return {
        ...prev,
        [studentId]: {
          ...nextRecord,
          grade,
          grade_points: points,
        },
      };
    });
  };

  // Batch Save Mutation
  const saveGradesMutation = useMutation({
    mutationFn: async () => {
      if (!selectedSubjectId || !students) return;

      const records = Object.values(gradesSheet).map((row) => {
        const student = students.find((s) => s.id === row.student_id);
        return {
          id: row.id || undefined, // Keep existing UUID if updates, otherwise omit for generate
          student_id: row.student_id,
          subject_id: selectedSubjectId,
          semester_id: student?.semester_id || '98fb4928-8d4a-464b-b0b3-57bb735db9d3', // Default sem fallback
          internal_marks: row.internal_marks,
          assignment_marks: row.assignment_marks,
          practical_marks: row.practical_marks,
          exam_marks: row.exam_marks,
          grade: row.grade,
          grade_points: row.grade_points,
        };
      });

      const { error } = await supabase.from('results').upsert(records, { onConflict: 'student_id,subject_id' });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['existing-results-list'] });
      setSuccessMsg('Grades and marks records published successfully.');
      setTimeout(() => setSuccessMsg(null), 3000);
      setErrorMsg(null);
    },
    onError: (err: any) => {
      setErrorMsg(err?.message || 'Failed to upsert marks logs.');
    },
  });

  const handleExportCSV = () => {
    if (!students || !gradesSheet) return;
    const currentSubjectName = subjects?.find((s) => s.id === selectedSubjectId)?.name || 'Subject';
    
    let csvContent = 'data:text/csv;charset=utf-8,';
    csvContent += 'Student ID,First Name,Last Name,Internals (30),Assignments (20),Practicals (50),End Sem (100),Total (200),Grade,Grade Point\n';

    students.forEach((s) => {
      const g = gradesSheet[s.id];
      if (g) {
        const total = g.internal_marks + g.assignment_marks + g.practical_marks + g.exam_marks;
        csvContent += `${s.student_id},${s.first_name},${s.last_name},${g.internal_marks},${g.assignment_marks},${g.practical_marks},${g.exam_marks},${total},${g.grade},${g.grade_points}\n`;
      }
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${currentSubjectName.replace(/\s+/g, '_')}_grades.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const currentSubject = subjects?.find((s) => s.id === selectedSubjectId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Link
            href="/faculty"
            className="text-xs text-slate-500 hover:text-blue-600 font-semibold flex items-center gap-1 mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Workspace
          </Link>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Exams & Grade Registry</h2>
          <p className="text-slate-500 text-xs mt-1">
            Input student scores for internal assessments, assignments, practical tasks, and end-semester examinations.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleExportCSV}
            className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold text-xs py-2 px-3.5 rounded-xl shadow-sm flex items-center gap-1.5 transition"
            title="Export csv file"
          >
            <Download className="w-4 h-4 text-slate-400" /> Export CSV
          </button>
          <button
            onClick={() => saveGradesMutation.mutate()}
            disabled={saveGradesMutation.isPending}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs py-2 px-4 rounded-xl shadow-md shadow-blue-600/10 flex items-center gap-1.5 transition"
          >
            {saveGradesMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin text-white" />
            ) : (
              <Save className="w-4 h-4 text-white" />
            )}
            Publish Grades
          </button>
        </div>
      </div>

      {/* Select Subject Filter card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex items-center justify-between gap-6 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <Award className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Active Course Unit</span>
            <select
              value={selectedSubjectId}
              onChange={(e) => setSelectedSubjectId(e.target.value)}
              className="mt-1 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-bold py-1.5 px-3 focus:outline-none focus:border-blue-500 transition"
            >
              {subjects?.map((sub) => (
                <option key={sub.id} value={sub.id}>
                  {sub.name} ({sub.code})
                </option>
              ))}
            </select>
          </div>
        </div>

        {currentSubject && (
          <div className="text-right">
            <span className="text-[10px] font-bold text-slate-400 block">Grading Weight Scales</span>
            <span className="text-[11px] font-bold text-slate-700 mt-1 block">
              Internals (30m) • Assignments (20m) • Practicals (50m) • End Sem (100m)
            </span>
          </div>
        )}
      </div>

      {/* Error & Success Messages */}
      <AnimatePresence>
        {successMsg && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center gap-2"
          >
            <CheckCircle className="w-4.5 h-4.5 text-emerald-600 shrink-0" />
            <span className="font-semibold">{successMsg}</span>
          </motion.div>
        )}
        {errorMsg && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-800 text-xs flex items-center gap-2"
          >
            <AlertTriangle className="w-4.5 h-4.5 text-red-500 shrink-0" />
            <span className="font-semibold">{errorMsg}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Grades Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        {loadingStudents || loadingResults ? (
          <div className="p-12 text-center text-slate-400">
            <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-xs font-semibold">Syncing student roster logs...</p>
          </div>
        ) : students && students.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 uppercase font-bold text-[9px] tracking-wider">
                  <th className="py-3.5 px-6">Student details</th>
                  <th className="py-3.5 px-4 text-center">Internals (Max 30)</th>
                  <th className="py-3.5 px-4 text-center">Assignments (Max 20)</th>
                  <th className="py-3.5 px-4 text-center">Practicals (Max 50)</th>
                  <th className="py-3.5 px-4 text-center">End Sem (Max 100)</th>
                  <th className="py-3.5 px-4 text-center">Total (Max 200)</th>
                  <th className="py-3.5 px-4 text-center">Auto Grade</th>
                  <th className="py-3.5 px-6 text-center">Points</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                {students.map((student) => {
                  const record = gradesSheet[student.id] || {
                    internal_marks: 0,
                    assignment_marks: 0,
                    practical_marks: 0,
                    exam_marks: 0,
                    grade: 'IP',
                    grade_points: 0,
                  };

                  const totalScore =
                    Number(record.internal_marks) +
                    Number(record.assignment_marks) +
                    Number(record.practical_marks) +
                    Number(record.exam_marks);

                  return (
                    <tr key={student.id} className="hover:bg-slate-50/50 transition">
                      <td className="py-3.5 px-6">
                        <div className="font-bold text-slate-900">
                          {student.first_name} {student.last_name}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">{student.student_id}</div>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <input
                          type="number"
                          value={record.internal_marks}
                          onChange={(e) =>
                            handleMarkChange(student.id, 'internal_marks', parseFloat(e.target.value) || 0)
                          }
                          className="w-16 bg-slate-50 border border-slate-200 rounded-lg p-1.5 text-center text-xs focus:outline-none focus:border-blue-500 focus:bg-white transition"
                        />
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <input
                          type="number"
                          value={record.assignment_marks}
                          onChange={(e) =>
                            handleMarkChange(student.id, 'assignment_marks', parseFloat(e.target.value) || 0)
                          }
                          className="w-16 bg-slate-50 border border-slate-200 rounded-lg p-1.5 text-center text-xs focus:outline-none focus:border-blue-500 focus:bg-white transition"
                        />
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <input
                          type="number"
                          value={record.practical_marks}
                          onChange={(e) =>
                            handleMarkChange(student.id, 'practical_marks', parseFloat(e.target.value) || 0)
                          }
                          className="w-16 bg-slate-50 border border-slate-200 rounded-lg p-1.5 text-center text-xs focus:outline-none focus:border-blue-500 focus:bg-white transition"
                        />
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <input
                          type="number"
                          value={record.exam_marks}
                          onChange={(e) =>
                            handleMarkChange(student.id, 'exam_marks', parseFloat(e.target.value) || 0)
                          }
                          className="w-16 bg-slate-50 border border-slate-200 rounded-lg p-1.5 text-center text-xs focus:outline-none focus:border-blue-500 focus:bg-white transition"
                        />
                      </td>
                      <td className="py-3.5 px-4 text-center text-slate-900 font-bold">{totalScore}</td>
                      <td className="py-3.5 px-4 text-center">
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 border rounded-full ${
                          record.grade === 'F' ? 'bg-red-50 border-red-200 text-red-800' :
                          record.grade === 'IP' ? 'bg-slate-100 border-slate-200 text-slate-700' :
                          'bg-emerald-50 border-emerald-200 text-emerald-800'
                        }`}>
                          {record.grade}
                        </span>
                      </td>
                      <td className="py-3.5 px-6 text-center text-slate-500 font-mono">{record.grade_points}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center text-slate-400 text-xs">No student details found.</div>
        )}
      </div>
    </div>
  );
}
