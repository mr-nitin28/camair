'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAppStore } from '@/lib/store';
import {
  FileText,
  ArrowLeft,
  Plus,
  Trash2,
  BookOpen,
  Calendar,
  Sparkles,
  Loader2,
  X,
  AlertCircle,
} from 'lucide-react';
import Link from 'next/link';

export default function FacultyNotesPage() {
  const { faculty } = useAppStore();
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);

  // Form State
  const [subjectId, setSubjectId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [fileName, setFileName] = useState('');
  const [fileType, setFileType] = useState('PDF');
  const [formError, setFormError] = useState<string | null>(null);

  // Fetch subjects
  const { data: subjects } = useQuery({
    queryKey: ['subjects-notes-dropdown', faculty?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('faculty_subjects')
        .select('*, subjects(*)');
      if (error) throw error;
      return data?.map((fs: any) => fs.subjects) || [];
    },
    enabled: !!faculty,
  });

  // Set default subject on load
  React.useEffect(() => {
    if (subjects && subjects.length > 0 && !subjectId) {
      setSubjectId(subjects[0].id);
    }
  }, [subjects, subjectId]);

  // Fetch notes
  const { data: notes, isLoading } = useQuery({
    queryKey: ['notes-list-faculty'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notes')
        .select('*, subjects(*)');
      if (error) throw error;
      return data;
    },
  });

  // Create Note Mutation
  const createNoteMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('notes')
        .insert({
          subject_id: subjectId,
          semester_id: '33333333-3333-3333-3333-333333333306', // Sem 6
          title,
          description,
          file_name: fileName || `${title.toLowerCase().replace(/ /g, '_')}.${fileType.toLowerCase()}`,
          file_type: fileType,
          file_url: `https://example.com/uploads/${fileName || 'resource'}`,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes-list-faculty'] });
      setTitle('');
      setDescription('');
      setFileName('');
      setFileType('PDF');
      setModalOpen(false);
      setFormError(null);
    },
    onError: (err: any) => {
      setFormError(err?.message || 'Failed to publish note.');
    },
  });

  // Delete Note Mutation
  const deleteNoteMutation = useMutation({
    mutationFn: async (noteId: string) => {
      const { error } = await supabase
        .from('notes')
        .delete()
        .eq('id', noteId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes-list-faculty'] });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !subjectId) {
      setFormError('Please fill in required fields.');
      return;
    }
    setFormError(null);
    createNoteMutation.mutate();
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Link href="/faculty" className="text-xs text-slate-500 hover:text-blue-600 font-semibold flex items-center gap-1 mb-2">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Workspace
          </Link>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Notes & Uploads Center</h2>
          <p className="text-slate-500 text-xs mt-1">Publish lecture slides, syllabus guidelines, and course handouts directly to students.</p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white px-4 py-2.5 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition shadow-md shadow-blue-600/10 shrink-0 self-start sm:self-auto"
        >
          <Plus className="w-4.5 h-4.5" /> Upload Resource
        </button>
      </div>

      {/* Notes Grid */}
      {isLoading ? (
        <div className="text-center py-12 text-slate-400">Loading resources...</div>
      ) : !notes || notes.length === 0 ? (
        <div className="text-center py-16 bg-white border border-slate-200 rounded-2xl">
          <FileText className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-xs font-semibold text-slate-700">No course notes published yet</p>
          <p className="text-[10px] text-slate-400 mt-1">Share syllabus notes using the button above.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {notes.map((note: any) => (
            <div key={note.id} className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm flex flex-col justify-between hover:border-slate-300 transition relative group">
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full">
                    {note.file_type}
                  </span>
                  <button
                    onClick={() => deleteNoteMutation.mutate(note.id)}
                    className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg hover:bg-slate-50 opacity-0 group-hover:opacity-100 transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900 line-clamp-1">{note.title}</h3>
                  <span className="text-[9.5px] font-bold text-slate-400 font-mono mt-0.5 block">
                    {note.subjects?.name} ({note.subjects?.code})
                  </span>
                  <p className="text-slate-600 text-xs mt-2 line-clamp-2 leading-relaxed">{note.description}</p>
                </div>
              </div>

              <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[10px] text-slate-400 font-semibold flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>File: {note.file_name}</span>
                </span>
                <span className="text-[9.5px] text-slate-400 font-semibold flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>{new Date(note.created_at).toLocaleDateString()}</span>
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/55 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-sm text-slate-950">Publish New Course Resource</h3>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600"
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

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Subject Mapping *
                  </label>
                  <select
                    value={subjectId}
                    onChange={(e) => setSubjectId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs focus:outline-none focus:border-blue-500 focus:bg-white transition cursor-pointer"
                  >
                    <option value="">Select subject...</option>
                    {subjects?.map((sub: any) => (
                      <option key={sub.id} value={sub.id}>
                        {sub.name} ({sub.code})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Resource File Type *
                  </label>
                  <select
                    value={fileType}
                    onChange={(e) => setFileType(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs focus:outline-none focus:border-blue-500 focus:bg-white transition cursor-pointer"
                  >
                    <option value="PDF">PDF Document</option>
                    <option value="PPT">PowerPoint Slide</option>
                    <option value="DOCX">Word Document</option>
                    <option value="ZIP">ZIP Code Package</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Resource Title *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Socket Programming Lecture Guidelines"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs focus:outline-none focus:border-blue-500 focus:bg-white transition"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  File Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. socket_guide.pdf (leave blank to auto generate)"
                  value={fileName}
                  onChange={(e) => setFileName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs focus:outline-none focus:border-blue-500 focus:bg-white transition"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Brief Guidelines Description
                </label>
                <textarea
                  rows={3}
                  placeholder="Explain notes contents, recommended reading chapters..."
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
                  disabled={createNoteMutation.isPending}
                  className="bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white px-4 py-2 text-xs font-semibold rounded-lg transition shadow-md shadow-blue-600/10 flex items-center justify-center gap-1.5"
                >
                  {createNoteMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    'Publish Resource'
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
