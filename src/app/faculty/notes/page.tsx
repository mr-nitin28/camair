'use client';

import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  FacultyService,
  type FacultyHandoutRecord,
} from '@/lib/services/faculty-service';
import { Dialog } from '@/components/ui/dialog';
import { StatusBadge } from '@/components/ui/status-badge';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { SkeletonList, SkeletonCard } from '@/components/ui/skeleton';
import {
  FileText,
  ArrowLeft,
  Plus,
  Trash2,
  BookOpen,
  Calendar,
  Sparkles,
  Download,
  Search,
  CheckCircle,
  Archive,
  Layers,
} from 'lucide-react';
import Link from 'next/link';

export default function FacultyNotesPage() {
  const queryClient = useQueryClient();

  const [modalOpen, setModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState('All');

  // Form State for Handout Upload
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [fileName, setFileName] = useState('');
  const [version, setVersion] = useState('v1.0');
  const [fileType, setFileType] = useState<'PDF' | 'Slide Deck' | 'Workbook' | 'Lab Manual' | 'Doc'>('PDF');
  const [sectionName, setSectionName] = useState('Section A & B');
  const [formError, setFormError] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // 1. Fetch Handouts
  const {
    data: handouts,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['faculty-handouts'],
    queryFn: () => FacultyService.getHandouts('00000000-0000-0000-0000-000000000020'),
  });

  // Client Search & Filter
  const filteredHandouts = useMemo(() => {
    if (!handouts) return [];
    return handouts.filter((h) => {
      if (selectedType !== 'All' && h.fileType !== selectedType) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      return (
        h.title.toLowerCase().includes(q) ||
        h.description.toLowerCase().includes(q) ||
        h.fileName.toLowerCase().includes(q) ||
        h.subjectCode.toLowerCase().includes(q)
      );
    });
  }, [handouts, searchQuery, selectedType]);

  // Upload Handout Mutation
  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!title.trim() || !fileName.trim()) {
        throw new Error('Title and File Name are required');
      }
      return await FacultyService.uploadHandout({
        subjectId: '00000000-0000-0000-0000-000000000351',
        subjectCode: 'CS601',
        subjectName: 'Compiler Design',
        sectionName,
        title: title.trim(),
        description: description.trim(),
        fileName: fileName.trim(),
        fileSizeBytes: 3500000,
        fileType,
        version: version.trim() || 'v1.0',
      });
    },
    onSuccess: () => {
      setModalOpen(false);
      setTitle('');
      setDescription('');
      setFileName('');
      setVersion('v1.0');
      setFormError(null);
      setSuccessToast('Course handout uploaded and version logged.');
      queryClient.invalidateQueries({ queryKey: ['faculty-handouts'] });
      setTimeout(() => setSuccessToast(null), 4000);
    },
    onError: (err: any) => {
      setFormError(err?.message || 'Failed to upload handout.');
    },
  });

  // Archive Mutation
  const archiveMutation = useMutation({
    mutationFn: async (id: string) => {
      return await FacultyService.archiveHandout(id);
    },
    onSuccess: () => {
      setSuccessToast('Handout archived.');
      queryClient.invalidateQueries({ queryKey: ['faculty-handouts'] });
      setTimeout(() => setSuccessToast(null), 4000);
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <SkeletonCard height={80} />
        <SkeletonCard height={60} />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <SkeletonCard height={200} />
          <SkeletonCard height={200} />
          <SkeletonCard height={200} />
        </div>
      </div>
    );
  }

  if (isError || !handouts) {
    return (
      <ErrorState
        title="Failed to Load Course Materials"
        message={error instanceof Error ? error.message : 'Unable to query handouts repository.'}
        onRetry={() => refetch()}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Toast */}
      {successToast && (
        <div className="p-4 rounded-2xl bg-emerald-500 text-white font-bold text-sm shadow-lg flex items-center justify-between animate-fadeIn">
          <div className="flex items-center gap-2.5">
            <CheckCircle className="w-5 h-5 text-white" />
            <span>{successToast}</span>
          </div>
          <button
            onClick={() => setSuccessToast(null)}
            className="text-xs px-2.5 py-1 rounded-lg bg-white/20 hover:bg-white/30 text-white"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* 1. PAGE HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-3xl bg-card border border-border shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground font-semibold mb-1">
            <Link href="/faculty" className="hover:text-primary flex items-center gap-1">
              <ArrowLeft className="w-3.5 h-3.5" /> Faculty Console
            </Link>
            <span>•</span>
            <span>Subject: CS601 Compiler Design</span>
            <span>•</span>
            <span>Version-Controlled Materials</span>
          </div>
          <h1 className="text-xl md:text-2xl font-black text-foreground tracking-tight">
            Notes & Learning Handouts
          </h1>
        </div>

        <button
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold text-xs shadow-md hover:bg-primary/90 transition-all hover:scale-[1.02]"
        >
          <Plus className="w-4 h-4" />
          <span>Upload New Handout</span>
        </button>
      </div>

      {/* 2. SEARCH & FILTER TOOLBAR */}
      <div className="p-4 rounded-2xl bg-card border border-border shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search handouts by title, topics, filename..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-muted/40 border border-border/80 text-xs text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/40"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1.5 bg-muted/60 p-1 rounded-2xl border border-border/60 text-xs font-bold">
          {['All', 'PDF', 'Slide Deck', 'Lab Manual'].map((type) => (
            <button
              key={type}
              onClick={() => setSelectedType(type)}
              className={`px-3 py-1.5 rounded-xl transition-all ${
                selectedType === type
                  ? 'bg-card text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      {/* 3. HANDOUTS CARD GRID */}
      {filteredHandouts.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No Handouts Found"
          description="No materials match your query. Click 'Upload New Handout' to publish course notes."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredHandouts.map((h) => (
            <div
              key={h.id}
              className="p-5 rounded-3xl bg-card border border-border shadow-xs hover:border-primary/50 transition-all flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-bold">
                    {h.subjectCode} • {h.sectionName}
                  </span>
                  <span className="font-mono text-xs font-bold text-foreground px-2 py-0.5 rounded bg-muted">
                    {h.version}
                  </span>
                </div>

                <h3 className="text-sm font-bold text-foreground mt-3 group-hover:text-primary transition-colors leading-snug">
                  {h.title}
                </h3>

                <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2 leading-relaxed">
                  {h.description}
                </p>
              </div>

              <div className="mt-5 pt-3 border-t border-border/40">
                <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-3 font-semibold">
                  <span>File: {h.fileName}</span>
                  <span>{h.downloadCount} downloads</span>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSuccessToast(`Initiated download for ${h.fileName}`);
                      setTimeout(() => setSuccessToast(null), 3000);
                    }}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-muted hover:bg-muted/80 text-foreground font-bold text-xs transition-colors"
                  >
                    <Download className="w-3.5 h-3.5 text-primary" />
                    <span>Download</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => archiveMutation.mutate(h.id)}
                    className="p-2 rounded-xl border border-border/80 hover:bg-rose-500/10 text-muted-foreground hover:text-rose-600 transition-colors"
                    title="Archive handout"
                  >
                    <Archive className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 4. UPLOAD MODAL */}
      <Dialog
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Upload Handout or Lecture Notes"
      >
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-foreground">
              Document Title <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. LL(1) Parsing Table Synthesis & Proofs"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-muted/40 border border-border text-xs text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/40"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-foreground">
              Topic Description
            </label>
            <textarea
              rows={3}
              placeholder="Summary of topics covered, proofs, and review questions..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full p-3 rounded-xl bg-muted/40 border border-border text-xs text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/40"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-foreground">
                File Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. CS601_LL1_Table_v1.pdf"
                value={fileName}
                onChange={(e) => setFileName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-muted/40 border border-border text-xs text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/40"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-foreground">Version Tag</label>
              <input
                type="text"
                placeholder="v1.0"
                value={version}
                onChange={(e) => setVersion(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-muted/40 border border-border text-xs text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/40"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-foreground">Material Type</label>
              <select
                value={fileType}
                onChange={(e) => setFileType(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl bg-muted/40 border border-border text-xs text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/40"
              >
                <option value="PDF">PDF Handout</option>
                <option value="Slide Deck">Slide Deck</option>
                <option value="Lab Manual">Lab Manual</option>
                <option value="Workbook">Workbook</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-foreground">Target Cohort</label>
              <input
                type="text"
                value={sectionName}
                onChange={(e) => setSectionName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-muted/40 border border-border text-xs text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/40"
              />
            </div>
          </div>

          {formError && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-700 text-xs font-semibold">
              {formError}
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-border/60">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-border/80 text-xs font-bold text-foreground hover:bg-muted"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => uploadMutation.mutate()}
              disabled={uploadMutation.isPending}
              className="px-5 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold shadow-md hover:bg-primary/90"
            >
              {uploadMutation.isPending ? 'Uploading...' : 'Publish Handout'}
            </button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
