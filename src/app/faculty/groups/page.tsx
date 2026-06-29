'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAppStore } from '@/lib/store';
import {
  Boxes,
  ArrowLeft,
  Plus,
  Users,
  Trash2,
  Sparkles,
  Loader2,
  X,
  AlertCircle,
} from 'lucide-react';
import Link from 'next/link';

export default function StudentGroupsPage() {
  const { faculty } = useAppStore();
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Project');
  const [description, setDescription] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  // Fetch Groups
  const { data: groups, isLoading } = useQuery({
    queryKey: ['groups-list-faculty', faculty?.id],
    queryFn: async () => {
      if (!faculty) return null;
      const { data, error } = await supabase
        .from('student_groups')
        .select('*, group_members(*, students(*))')
        .eq('faculty_id', faculty.id);
      if (error) throw error;
      return data;
    },
    enabled: !!faculty,
  });

  // Create Group Mutation
  const createGroupMutation = useMutation({
    mutationFn: async () => {
      if (!faculty) return;
      const { error } = await supabase
        .from('student_groups')
        .insert({
          name,
          category,
          description,
          faculty_id: faculty.id,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups-list-faculty'] });
      setName('');
      setDescription('');
      setCategory('Project');
      setModalOpen(false);
      setFormError(null);
    },
    onError: (err: any) => {
      setFormError(err?.message || 'Failed to create student group.');
    },
  });

  // Delete Group Mutation
  const deleteGroupMutation = useMutation({
    mutationFn: async (groupId: string) => {
      const { error } = await supabase
        .from('student_groups')
        .delete()
        .eq('id', groupId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups-list-faculty'] });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) {
      setFormError('Please enter a group name.');
      return;
    }
    setFormError(null);
    createGroupMutation.mutate();
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Link href="/faculty" className="text-xs text-slate-500 hover:text-blue-600 font-semibold flex items-center gap-1 mb-2">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Workspace
          </Link>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Student Group Registries</h2>
          <p className="text-slate-500 text-xs mt-1">Configure project teams, course groups, and placement preparation cohorts.</p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white px-4 py-2.5 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition shadow-md shadow-blue-600/10 shrink-0 self-start sm:self-auto"
        >
          <Plus className="w-4.5 h-4.5" /> Create Group
        </button>
      </div>

      {/* Groups Grid */}
      {isLoading ? (
        <div className="text-center py-12 text-slate-400 text-xs">Loading groups...</div>
      ) : !groups || groups.length === 0 ? (
        <div className="text-center py-16 bg-white border border-slate-200 rounded-2xl">
          <Boxes className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-xs font-semibold text-slate-700">No student groups recorded</p>
          <p className="text-[10px] text-slate-400 mt-1">Create one using the button above.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {groups.map((grp: any) => (
            <div key={grp.id} className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm flex flex-col justify-between hover:border-slate-300 transition relative group">
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 bg-blue-50 text-blue-700 rounded-full">
                    {grp.category} Group
                  </span>
                  <button
                    onClick={() => deleteGroupMutation.mutate(grp.id)}
                    className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg hover:bg-slate-50 opacity-0 group-hover:opacity-100 transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900 leading-snug">{grp.name}</h3>
                  <p className="text-slate-600 text-xs mt-1 leading-relaxed">{grp.description}</p>
                </div>

                {/* Group members registry list */}
                <div className="space-y-2">
                  <span className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-slate-400" /> Members ({grp.group_members?.length || 0})
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {grp.group_members?.map((gm: any) => (
                      <span key={gm.id} className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-[10px] font-semibold text-slate-700">
                        {gm.students?.first_name} {gm.students?.last_name} ({gm.students?.student_id})
                      </span>
                    ))}
                    {(!grp.group_members || grp.group_members.length === 0) && (
                      <span className="text-[10px] text-slate-400 italic">No members assigned yet.</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400 font-semibold">
                <span>Created: {new Date(grp.created_at).toLocaleDateString()}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Group Creator Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/55 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-sm text-slate-950">Create Student Group</h3>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 animate-pulse"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {formError && (
                <div className="bg-red-50 border border-red-200 text-red-800 text-xs rounded-xl p-3 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Group Category *
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs focus:outline-none focus:border-blue-500 focus:bg-white transition cursor-pointer"
                >
                  <option value="Project">Capstone / Project Team</option>
                  <option value="Placement">Placement Placement Prep</option>
                  <option value="Course">Syllabus / Course Group</option>
                  <option value="Subject">Subject Study Cohort</option>
                  <option value="Activity">Extra Curricular Group</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Group Registry Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. CSE-BTech-2026-Project-01"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs focus:outline-none focus:border-blue-500 focus:bg-white transition"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Group Purpose Description
                </label>
                <textarea
                  rows={3}
                  placeholder="Explain group tasks, mentorship objectives, project files guidelines..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs focus:outline-none focus:border-blue-500 focus:bg-white transition"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="border border-slate-200 hover:bg-slate-50 text-slate-600 px-4 py-2 text-xs font-semibold rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createGroupMutation.isPending}
                  className="bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white px-4 py-2 text-xs font-semibold rounded-lg transition shadow-md shadow-blue-600/10 flex items-center justify-center gap-1.5"
                >
                  {createGroupMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    'Register Group'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
