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
  FileText,
} from 'lucide-react';
import Link from 'next/link';

interface Announcement {
  id: string;
  title: string;
  content: string;
  category: 'Institution' | 'Department' | 'Examination';
  department_id: string;
  priority: 'Low' | 'Normal' | 'High' | 'Critical';
  created_at: string;
}

export default function AnnouncementsPage() {
  const { faculty } = useAppStore();
  const queryClient = useQueryClient();

  // Create Announcement Modal/Form States
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState<'Institution' | 'Department' | 'Examination'>('Department');
  const [priority, setPriority] = useState<'Low' | 'Normal' | 'High' | 'Critical'>('Normal');
  
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Fetch announcements for faculty department
  const { data: announcements, isLoading } = useQuery({
    queryKey: ['announcements-list', faculty?.department_id],
    queryFn: async () => {
      if (!faculty?.department_id) return [];
      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .or(`department_id.eq.${faculty.department_id},department_id.is.null`)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Announcement[];
    },
    enabled: !!faculty?.department_id,
  });

  // Create Announcement Mutation
  const createAnnouncementMutation = useMutation({
    mutationFn: async () => {
      if (!faculty?.department_id) return;
      const { error } = await supabase.from('announcements').insert({
        title,
        content,
        category,
        priority,
        department_id: faculty.department_id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcements-list'] });
      setTitle('');
      setContent('');
      setCategory('Department');
      setPriority('Normal');
      setIsOpen(false);
      setSuccessMsg('Announcement published successfully.');
      setTimeout(() => setSuccessMsg(null), 3000);
    },
    onError: (err: any) => {
      setErrorMsg(err?.message || 'Failed to publish announcement.');
    },
  });

  // Delete Announcement Mutation
  const deleteAnnouncementMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('announcements').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcements-list'] });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;
    createAnnouncementMutation.mutate();
  };

  const getPriorityBadge = (p: string) => {
    switch (p) {
      case 'Critical':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'High':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'Normal':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

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
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Alerts & Notice Board</h2>
          <p className="text-slate-500 text-xs mt-1">
            Broadcast emergency alerts, department notices, or academic schedules to all student portals.
          </p>
        </div>

        <button
          onClick={() => setIsOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs py-2.5 px-4 rounded-xl shadow-md shadow-blue-600/10 flex items-center gap-1.5 transition self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" /> Publish Announcement
        </button>
      </div>

      {/* Messages / Alerts */}
      <AnimatePresence>
        {successMsg && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center gap-2.5"
          >
            <CheckCircle className="w-4.5 h-4.5 text-emerald-600 shrink-0" />
            <span className="font-semibold">{successMsg}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Notice list */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-slate-400">
            <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-xs font-semibold">Loading notices...</p>
          </div>
        ) : announcements && announcements.length > 0 ? (
          announcements.map((item) => (
            <motion.div
              layout
              key={item.id}
              className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition relative overflow-hidden flex flex-col md:flex-row justify-between gap-6"
            >
              {/* Colored left strip for priority */}
              <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${
                item.priority === 'Critical' ? 'bg-red-600' :
                item.priority === 'High' ? 'bg-amber-500' :
                item.priority === 'Normal' ? 'bg-blue-600' : 'bg-slate-400'
              }`} />

              <div className="space-y-3 flex-grow pl-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 border rounded-full ${getPriorityBadge(item.priority)}`}>
                    {item.priority} Priority
                  </span>
                  <span className="bg-slate-50 text-slate-600 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 border border-slate-200 rounded-full flex items-center gap-1">
                    <Tag className="w-2.5 h-2.5" /> {item.category}
                  </span>
                  <span className="text-slate-400 text-[10px] font-semibold flex items-center gap-1 font-mono">
                    <Calendar className="w-3 h-3" /> {new Date(item.created_at).toLocaleDateString(undefined, {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </span>
                </div>

                <h3 className="text-sm font-bold text-slate-900 leading-tight">{item.title}</h3>
                <p className="text-slate-600 text-xs leading-relaxed max-w-4xl whitespace-pre-line">{item.content}</p>
              </div>

              <div className="flex items-start justify-end shrink-0">
                <button
                  onClick={() => {
                    if (confirm('Are you sure you want to delete this notice?')) {
                      deleteAnnouncementMutation.mutate(item.id);
                    }
                  }}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 border border-transparent hover:border-red-150 transition"
                  title="Delete announcement"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          ))
        ) : (
          <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-400">
            <Megaphone className="w-12 h-12 text-slate-300 stroke-[1.5] mx-auto mb-3" />
            <h3 className="text-xs font-bold text-slate-900">Notice board is empty</h3>
            <p className="text-[10px] text-slate-400 mt-1 max-w-xs mx-auto">
              Any notices or broadcast messages you publish to the department will appear here.
            </p>
          </div>
        )}
      </div>

      {/* Create Announcement Drawer/Modal */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
            />

            {/* Modal Box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white border border-slate-200 rounded-2xl shadow-xl w-full max-w-xl p-6 relative z-10 mx-4"
            >
              <h3 className="text-sm font-bold text-slate-950 pb-3 border-b border-slate-100 flex items-center gap-2">
                <Megaphone className="w-4.5 h-4.5 text-blue-600" />
                Publish Department Announcement
              </h3>

              <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                {errorMsg && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1.5">Announcement Title</label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. End Semester Practical Schedule - Sem 6"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-blue-500 focus:bg-white transition"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1.5">Category</label>
                    <select
                      value={category}
                      onChange={(e: any) => setCategory(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-blue-500 focus:bg-white transition"
                    >
                      <option value="Department">Department Notice</option>
                      <option value="Examination">Examination Alert</option>
                      <option value="Institution">Institution General</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1.5">Priority</label>
                    <select
                      value={priority}
                      onChange={(e: any) => setPriority(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-blue-500 focus:bg-white transition"
                    >
                      <option value="Low">Low</option>
                      <option value="Normal">Normal</option>
                      <option value="High">High</option>
                      <option value="Critical">Critical</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1.5">Detailed Content</label>
                  <textarea
                    rows={6}
                    required
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Write detailed information, contact points, and instructions for students..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-blue-500 focus:bg-white transition resize-none"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="text-xs font-semibold text-slate-500 hover:text-slate-800 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createAnnouncementMutation.isPending}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs py-2 px-4 rounded-xl transition disabled:opacity-50"
                  >
                    {createAnnouncementMutation.isPending ? 'Publishing...' : 'Publish Board Announcement'}
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
