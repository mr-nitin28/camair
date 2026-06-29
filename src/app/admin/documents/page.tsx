'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAppStore } from '@/lib/store';
import {
  FolderOpen,
  ArrowLeft,
  Download,
  Tag,
  ShieldAlert,
} from 'lucide-react';
import Link from 'next/link';

interface NoteDocument {
  id: string;
  title: string;
  description: string;
  file_name: string;
  file_type: string;
  file_url: string;
  created_at: string;
  subjects?: { name: string; code: string };
}

export default function DocumentsVaultPage() {
  const { admin } = useAppStore();

  // Fetch Documents (using Notes table as shared repository)
  const { data: documents, isLoading } = useQuery({
    queryKey: ['admin-documents-vault'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notes')
        .select('*, subjects(*)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as NoteDocument[];
    },
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link href="/admin" className="text-xs text-slate-500 hover:text-indigo-650 font-extrabold flex items-center gap-1 mb-2">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
        </Link>
        <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 font-sans">Documents Vault</h2>
        <p className="text-slate-550 text-xs mt-1 font-semibold">
          Review academic notes, medical certificate attachments, circular policies, and department handouts.
        </p>
      </div>

      {/* Main Grid */}
      <div className="bg-white/50 backdrop-blur-md border border-slate-200/80 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-200/60 mb-5">
          <FolderOpen className="w-5 h-5 text-indigo-650" />
          <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider font-sans">Institution Documents Repository</h3>
        </div>

        {isLoading ? (
          <div className="p-12 text-center text-slate-500 font-bold">
            <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-xs">Loading vault...</p>
          </div>
        ) : documents && documents.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="bg-white/40 border border-slate-200/60 rounded-xl p-5 hover:border-slate-300 transition flex flex-col justify-between gap-4 shadow-sm"
              >
                <div className="space-y-2.5">
                  <div className="flex items-start justify-between gap-3">
                    <span className="bg-white border border-slate-200 text-slate-700 text-[9.5px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded flex items-center gap-1">
                      <Tag className="w-2.5 h-2.5 text-indigo-650" /> {doc.file_type}
                    </span>
                    <span className="text-slate-500 text-[9.5px] font-sans font-semibold">
                      {new Date(doc.created_at).toLocaleDateString()}
                    </span>
                  </div>

                  <h4 className="text-xs font-extrabold text-slate-900 line-clamp-1">{doc.title}</h4>
                  <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed font-semibold">{doc.description}</p>
                </div>

                <div className="border-t border-slate-200/65 pt-3 flex items-center justify-between gap-4">
                  <span className="text-[10px] text-slate-500 truncate max-w-[150px] font-sans font-bold leading-none">
                    {doc.file_name}
                  </span>
                  
                  <a
                    href={doc.file_url}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1.5 bg-white/45 hover:bg-white/60 text-slate-700 hover:text-indigo-850 border border-slate-200 hover:border-slate-300 rounded-lg flex items-center gap-1 text-[10px] font-extrabold transition shadow-sm"
                    title="Download document file"
                  >
                    <Download className="w-3.5 h-3.5 text-indigo-650" /> Download
                  </a>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-12 text-center text-slate-500 text-xs font-bold">
            <ShieldAlert className="w-10 h-10 text-slate-400 mx-auto mb-2 stroke-[1.5]" />
            No documents stored in vault.
          </div>
        )}
      </div>
    </div>
  );
}
