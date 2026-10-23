'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { PageHeader } from '@/components/ui/page-header';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import {
  FolderOpen,
  FileText,
  Download,
  Calendar,
  Building,
} from 'lucide-react';

interface NoteDocument {
  id: string;
  title: string;
  description: string;
  file_name: string;
  file_type: string;
  file_url?: string;
  created_at: string;
  subjects?: { name: string; code: string };
}

export default function DocumentsVaultPage() {
  const { data: documents, isLoading, isError, refetch } = useQuery({
    queryKey: ['admin-documents-vault'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notes')
        .select('*, subjects(*)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as NoteDocument[];
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-32 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5" />
          ))}
        </div>
      </div>
    );
  }

  if (isError || !documents) {
    return (
      <ErrorState
        title="Failed to Load Documents Vault"
        message="Could not load institutional files repository."
        onRetry={() => refetch()}
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Institutional Documents & Circulars Vault"
        description="Shared document vault containing curriculum syllabi, medical certificates, regulations, and departmental circulars."
      />

      {documents.length === 0 ? (
        <EmptyState
          title="Documents Vault Empty"
          description="Uploaded faculty handouts, circulars, and certificates will appear here."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {documents.map((doc) => (
            <div
              key={doc.id}
              className="p-5 rounded-2xl border border-[var(--border)] bg-[var(--surface)] hover:border-[var(--border-strong)] transition-all shadow-sm flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-xl bg-[var(--accent-soft)] text-[var(--accent)] border border-[var(--border)]">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-extrabold text-[var(--text)] tracking-tight">
                        {doc.title}
                      </h4>
                      <span className="text-xs text-[var(--text-muted)] font-mono">
                        {doc.file_name}
                      </span>
                    </div>
                  </div>

                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[var(--surface-2)] text-[var(--text)] uppercase">
                    {doc.file_type}
                  </span>
                </div>

                <p className="text-xs text-[var(--text-muted)] mt-2 line-clamp-2 leading-relaxed">
                  {doc.description}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-[var(--border)] flex items-center justify-between text-xs text-[var(--text-muted)]">
                <span className="flex items-center gap-1 font-medium">
                  <Calendar className="w-3.5 h-3.5" />
                  {new Date(doc.created_at).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>

                <button
                  type="button"
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold text-[var(--accent)] hover:bg-[var(--accent-soft)] transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Archive</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
