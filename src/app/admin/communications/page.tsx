'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAppStore } from '@/lib/store';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Megaphone,
  ArrowLeft,
  Plus,
  Trash2,
  Calendar,
  AlertTriangle,
  Tag,
  CheckCircle,
  Building,
  Loader2,
} from 'lucide-react';
import Link from 'next/link';

interface Announcement {
  id: string;
  title: string;
  content: string;
  category: 'Institution' | 'Department' | 'Examination';
  department_id: string | null;
  priority: 'Low' | 'Normal' | 'High' | 'Critical';
  created_at: string;
  departments?: { name: string; code: string };
}

export default function BroadcastBoardPage() {
  const { admin } = useAppStore();
  const queryClient = useQueryClient();

  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState<'Institution' | 'Department' | 'Examination'>('Institution');
  const [priority, setPriority] = useState<'Low' | 'Normal' | 'High' | 'Critical'>('Normal');
  const [deptId, setDeptId] = useState<string>('all');

  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Fetch departments lookup
  const { data: departments } = useQuery({
    queryKey: ['admin-comms-depts'],
    queryFn: async () => {
      const { data } = await supabase.from('departments').select('*');
      return data || [];
    },
  });

  // Fetch announcements list
  const { data: notices, isLoading } = useQuery({
    queryKey: ['admin-notices-board'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('announcements')
        .select('*, departments(*)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Announcement[];
    },
  });

  // Publish notice Mutation
  const publishNoticeMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('announcements').insert({
        title: title.trim(),
        content: content.trim(),
        category,
        priority,
        department_id: deptId === 'all' ? null : deptId,
      });

      if (error) throw error;

      await supabase.from('audit_logs').insert({
        user_email: admin?.name || 'Admin',
        role: admin?.role || 'Super Admin',
        action: `Published broadcast notice: "${title}"`,
        affected_records: `announcements: published`,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-notices-board'] });
      setTitle('');
      setContent('');
      setIsOpen(false);
      setSuccessMsg('Notice board broadcast successfully published.');
      setTimeout(() => setSuccessMsg(null), 3000);
      setErrorMsg(null);
    },
    onError: (err: any) => setErrorMsg(err?.message || 'Failed to publish notice.'),
  });

  // Delete Notice Mutation
  const deleteNoticeMutation = useMutation({
    mutationFn: async (id: string) => {
      const n = notices?.find((item) => item.id === id);
      const noticeTitle = n ? n.title : id;

      const { error } = await supabase.from('announcements').delete().eq('id', id);
      if (error) throw error;

      await supabase.from('audit_logs').insert({
        user_email: admin?.name || 'Admin',
        role: admin?.role || 'Super Admin',
        action: `Withdrew/deleted broadcast notice: "${noticeTitle}"`,
        affected_records: `announcements: ${id}`,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-notices-board'] });
    },
  });

  const getPriorityBadge = (p: string) => {
    switch (p) {
      case 'Critical':
        return 'bg-red-500/10 border-red-200/40 text-red-800';
      case 'High':
        return 'bg-amber-500/10 border-amber-200/40 text-amber-800';
      case 'Normal':
        return 'bg-indigo-500/10 border-indigo-200/40 text-indigo-800';
      default:
        return 'bg-slate-200 border-slate-300 text-slate-700';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Link href="/admin" className="text-xs text-slate-500 hover:text-indigo-650 font-extrabold flex items-center gap-1 mb-2">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
          </Link>
          <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 font-sans">Broadcast Notice Board</h2>
          <p className="text-slate-550 text-xs mt-1 font-semibold">
            Publish institutional circulars, academic notices, and department announcements.
          </p>
        </div>

        <button
          onClick={() => setIsOpen(true)}
          className="bg-indigo-600 hover:bg-indigo-750 text-white font-extrabold text-xs py-2.5 px-4 rounded-xl shadow-sm flex items-center gap-1.5 transition self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" /> Publish Broadcast Notice
        </button>
      </div>

      {/* Alert details */}
      <AnimatePresence>
        {successMsg && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-4 bg-emerald-500/10 border border-emerald-200/40 text-emerald-800 text-xs flex items-center gap-2.5 rounded-xl font-extrabold"
          >
            <CheckCircle className="w-4.5 h-4.5 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Roster list */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="bg-white/50 backdrop-blur-md border border-slate-200/80 rounded-2xl p-8 text-center text-slate-500 font-bold">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-655 mx-auto" />
          </div>
        ) : notices && notices.length > 0 ? (
          notices.map((notice) => (
            <motion.div
              layout
              key={notice.id}
              className="bg-white/50 backdrop-blur-md border border-slate-200/80 rounded-2xl p-6 shadow-sm relative overflow-hidden flex flex-col md:flex-row justify-between gap-6"
            >
              {/* Left border indicator */}
              <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${
                notice.priority === 'Critical' ? 'bg-red-600' :
                notice.priority === 'High' ? 'bg-amber-500' :
                notice.priority === 'Normal' ? 'bg-indigo-600' : 'bg-slate-400'
              }`} />

              <div className="space-y-3 flex-grow pl-2 font-semibold">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`text-[9.5px] font-extrabold uppercase tracking-wider px-2 py-0.5 border rounded-full ${getPriorityBadge(notice.priority)}`}>
                    {notice.priority} Priority
                  </span>
                  <span className="bg-white text-slate-700 text-[9.5px] font-extrabold uppercase tracking-wider px-2 py-0.5 border border-slate-200 rounded-full flex items-center gap-1">
                    <Tag className="w-2.5 h-2.5 text-indigo-650" /> {notice.category}
                  </span>
                  {notice.department_id && (
                    <span className="bg-white text-slate-700 text-[9.5px] font-extrabold uppercase tracking-wider px-2 py-0.5 border border-slate-200 rounded-full flex items-center gap-1">
                      <Building className="w-2.5 h-2.5 text-indigo-650" /> {notice.departments?.code}
                    </span>
                  )}
                  <span className="text-slate-500 text-[10px] font-bold flex items-center gap-1 font-sans">
                    <Calendar className="w-3 h-3 text-slate-450" /> {new Date(notice.created_at).toLocaleDateString()}
                  </span>
                </div>

                <h3 className="text-sm font-extrabold text-slate-900 leading-tight font-sans">{notice.title}</h3>
                <p className="text-slate-500 text-xs leading-relaxed max-w-4xl whitespace-pre-line font-semibold">{notice.content}</p>
              </div>

              <div className="flex items-start justify-end shrink-0">
                <button
                  onClick={() => {
                    if (confirm('Are you sure you want to withdraw/delete this circular notice?')) {
                      deleteNoticeMutation.mutate(notice.id);
                    }
                  }}
                  className="p-1.5 rounded-lg text-slate-450 hover:text-red-655 hover:bg-red-500/10 transition border border-transparent hover:border-red-200/40"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          ))
        ) : (
          <div className="bg-white/50 backdrop-blur-md border border-slate-200/80 rounded-2xl p-12 text-center text-slate-500 font-bold">
            <Megaphone className="w-12 h-12 text-slate-400 stroke-[1.5] mx-auto mb-3 animate-pulse" />
            <h3 className="text-xs font-extrabold text-slate-700">Notice board is empty</h3>
            <p className="text-[10px] text-slate-555 mt-1 max-w-xs mx-auto font-semibold">
              Any circular announcements you publish to the institution or specific departments will be logged here.
            </p>
          </div>
        )}
      </div>

      {/* Broadcast Notice Modal Dialog */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white/80 backdrop-blur-xl border border-slate-200/80 rounded-2xl shadow-xl w-full max-w-lg p-6 relative z-10 mx-4 text-slate-805"
            >
              <h3 className="text-sm font-extrabold text-slate-900 pb-3 border-b border-slate-200/60 flex items-center gap-2">
                <Megaphone className="w-4.5 h-4.5 text-indigo-650" />
                Draft Broadcast Notice
              </h3>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  publishNoticeMutation.mutate();
                }}
                className="space-y-4 mt-4 font-semibold text-xs"
              >
                {errorMsg && (
                  <div className="p-3 bg-red-550/10 border border-red-200/40 rounded-xl text-red-800 text-xs flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-655 shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                <div>
                  <label className="text-[9.5px] font-extrabold text-slate-555 uppercase block mb-1.5">Announcement Title</label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. End Semester Practical Timelines"
                    className="w-full bg-white/40 border border-slate-200/60 rounded-xl px-3 py-2 text-xs text-slate-850 focus:outline-none focus:border-indigo-500 transition font-bold"
                  />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-[9.5px] font-extrabold text-slate-555 uppercase block mb-1.5">Audience Target</label>
                    <select
                      value={deptId}
                      onChange={(e) => setDeptId(e.target.value)}
                      className="w-full bg-white/40 border border-slate-200/60 rounded-xl px-3 py-2 text-xs text-slate-700 focus:outline-none focus:border-indigo-500 transition font-extrabold"
                    >
                      <option value="all">Global (All Students)</option>
                      {departments?.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.code} Department
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[9.5px] font-extrabold text-slate-555 uppercase block mb-1.5">Category</label>
                    <select
                      value={category}
                      onChange={(e: any) => setCategory(e.target.value)}
                      className="w-full bg-white/40 border border-slate-200/60 rounded-xl px-3 py-2 text-xs text-slate-700 focus:outline-none focus:border-indigo-500 transition font-extrabold"
                    >
                      <option value="Institution">General Notice</option>
                      <option value="Department">Dept Circular</option>
                      <option value="Examination">Exam Notice</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[9.5px] font-extrabold text-slate-555 uppercase block mb-1.5">Priority</label>
                    <select
                      value={priority}
                      onChange={(e: any) => setPriority(e.target.value)}
                      className="w-full bg-white/40 border border-slate-200/60 rounded-xl px-3 py-2 text-xs text-slate-700 focus:outline-none focus:border-indigo-500 transition font-extrabold"
                    >
                      <option value="Low">Low</option>
                      <option value="Normal">Normal</option>
                      <option value="High">High</option>
                      <option value="Critical">Critical</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-[9.5px] font-extrabold text-slate-555 uppercase block mb-1.5">Circular Content</label>
                  <textarea
                    rows={6}
                    required
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Write detailed announcements content..."
                    className="w-full bg-white/40 border border-slate-200/60 rounded-xl px-3 py-2 text-xs text-slate-850 focus:outline-none focus:border-indigo-500 transition resize-none font-bold"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t border-slate-200/60">
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="text-xs font-extrabold text-slate-500 hover:text-slate-700 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={publishNoticeMutation.isPending}
                    className="bg-indigo-600 hover:bg-indigo-750 text-white font-extrabold text-xs py-2 px-4 rounded-xl transition"
                  >
                    Confirm & Publish
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
