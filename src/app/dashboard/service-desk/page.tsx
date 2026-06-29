'use client';

import React, { useState, useMemo } from 'react';
import { useAppStore } from '@/lib/store';
import {
  FileSpreadsheet,
  ArrowLeft,
  Plus,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  FileDown,
  Sparkles,
  Loader2,
  X,
} from 'lucide-react';
import Link from 'next/link';

// Detailed Mock Requests
const mockRequests = [
  {
    id: 'req1',
    request_type: 'Official Academic Transcript',
    reason: 'Application for Summer Research Internship cohort.',
    status: 'Completed',
    created_at: new Date(Date.now() - 3600000 * 24 * 7).toISOString(),
    comments: 'Transcript verified and processed. Attached digital document below.',
    attachment_url: '#',
  },
  {
    id: 'req2',
    request_type: 'Bonafide Certificate',
    reason: 'Student bus pass renewal application.',
    status: 'Approved',
    created_at: new Date(Date.now() - 3600000 * 24 * 3).toISOString(),
    comments: 'Approved by Registrar. Print copy available at Desk 4.',
    attachment_url: null,
  },
  {
    id: 'req3',
    request_type: 'ID Card Reissue',
    reason: 'Original magnetic strip card lost on campus grounds.',
    status: 'Pending',
    created_at: new Date(Date.now() - 3600000 * 12).toISOString(),
    comments: null,
    attachment_url: null,
  },
];

export default function ServiceDeskPage() {
  const { student } = useAppStore();
  const [modalOpen, setModalOpen] = useState(false);
  const [requestType, setRequestType] = useState('Bonafide Certificate');
  const [reason, setReason] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Local state to keep submitted requests in memory for the demo
  const [localRequests, setLocalRequests] = useState<any[]>([]);

  // Load local requests on mount
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('local_service_requests');
      if (saved) {
        try {
          setLocalRequests(JSON.parse(saved));
        } catch (e) {
          console.error('Failed to parse local service requests:', e);
        }
      }
    }
  }, []);

  const displayRequests = useMemo(() => {
    return [...localRequests, ...mockRequests];
  }, [localRequests]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      setFormError('Please enter a reason for the document request.');
      return;
    }
    setFormError(null);
    setSubmitting(true);

    setTimeout(() => {
      const newReq = {
        id: `local-${Date.now()}`,
        request_type: requestType,
        reason: reason,
        status: 'Pending',
        created_at: new Date().toISOString(),
        comments: null,
        attachment_url: null,
      };

      setLocalRequests((prev) => {
        const updated = [newReq, ...prev];
        localStorage.setItem('local_service_requests', JSON.stringify(updated));
        return updated;
      });

      setReason('');
      setModalOpen(false);
      setSubmitting(false);
    }, 700);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Link href="/dashboard" className="text-xs text-slate-500 hover:text-indigo-600 font-semibold flex items-center gap-1 mb-2">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
          </Link>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Student Service Desk</h2>
          <p className="text-slate-600 text-xs mt-1">Request digital certificate transcripts, character certificates, and replacement ID cards.</p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white px-4 py-2.5 text-xs font-bold rounded-xl flex items-center gap-1.5 transition shadow shadow-indigo-600/10 shrink-0 self-start sm:self-auto"
        >
          <Plus className="w-4.5 h-4.5" /> New Request
        </button>
      </div>

      {/* Requests History List */}
      {displayRequests.length === 0 ? (
        <div className="text-center py-16 bg-white border border-slate-200 rounded-3xl shadow-sm">
          <FileSpreadsheet className="w-10 h-10 text-slate-400 mx-auto mb-3" />
          <p className="text-xs font-bold text-slate-700">No requests filed</p>
          <p className="text-[10px] text-slate-500 mt-1">File a certificate or transcript request using the button above.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {displayRequests.map((req: any) => (
            <div key={req.id} className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-4 hover:border-slate-300 transition animate-fadeIn">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-xs font-extrabold text-slate-900 leading-tight">{req.request_type}</h3>
                  <span className="text-[9.5px] text-slate-500 font-bold block mt-1.5 font-mono">
                    Requested: {new Date(req.created_at).toLocaleDateString()}
                  </span>
                </div>

                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-extrabold uppercase text-[9px] border self-start sm:self-auto ${
                    req.status === 'Completed'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                      : req.status === 'Approved'
                      ? 'bg-indigo-50 text-indigo-700 border-indigo-100'
                      : req.status === 'Rejected'
                      ? 'bg-rose-50 text-rose-700 border-rose-100'
                      : 'bg-amber-50 text-amber-700 border-amber-100'
                  }`}
                >
                  {req.status === 'Completed' && <CheckCircle className="w-3.5 h-3.5" />}
                  {req.status === 'Approved' && <CheckCircle className="w-3.5 h-3.5" />}
                  {req.status === 'Rejected' && <XCircle className="w-3.5 h-3.5" />}
                  {req.status === 'Pending' && <Clock className="w-3.5 h-3.5 animate-pulse" />}
                  {req.status}
                </span>
              </div>

              <div className="space-y-1">
                <span className="text-[9px] font-extrabold text-slate-500 uppercase block tracking-wider font-mono">Reason</span>
                <p className="text-xs text-slate-600 leading-relaxed font-semibold">{req.reason}</p>
              </div>

              {/* Action comments or download file links */}
              {req.comments && (
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs space-y-2">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <span className="text-[9.5px] font-extrabold text-slate-500 uppercase block tracking-wider font-mono">Office Remarks</span>
                      <p className="text-slate-600 mt-1 font-semibold">{req.comments}</p>
                    </div>
                    {req.attachment_url && (
                      <a
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          alert('Downloading Transcript PDF document...');
                        }}
                        className="p-2 bg-indigo-50 hover:bg-indigo-600 text-indigo-700 hover:text-white rounded-xl border border-indigo-100 hover:border-indigo-500 font-extrabold text-[10px] flex items-center gap-1.5 shrink-0 transition"
                      >
                        <FileDown className="w-3.5 h-3.5" /> Download Doc
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* New Request Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-slate-900/65 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col animate-scaleUp">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-600" />
                <h3 className="font-extrabold text-sm text-slate-900">New Document Request</h3>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 font-semibold text-xs text-slate-700">
              {formError && (
                <div className="bg-rose-50 border border-rose-100 text-rose-700 text-xs rounded-xl p-3 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div>
                <label className="block text-[9.5px] font-extrabold text-slate-500 uppercase tracking-wider mb-1 font-mono">
                  Document Type *
                </label>
                <select
                  value={requestType}
                  onChange={(e) => setRequestType(e.target.value)}
                  className="w-full bg-white border border-slate-200 text-slate-800 rounded-xl py-2 px-3 text-xs focus:outline-none focus:border-indigo-500/40 transition cursor-pointer font-bold shadow-sm"
                >
                  <option value="Bonafide Certificate">Bonafide Certificate</option>
                  <option value="Character Certificate">Character Certificate</option>
                  <option value="Transcript">Academic Transcript</option>
                  <option value="ID Card Reissue">ID Card Reissue</option>
                </select>
              </div>

              <div>
                <label className="block text-[9.5px] font-extrabold text-slate-500 uppercase tracking-wider mb-1 font-mono">
                  Purpose / Reason *
                </label>
                <textarea
                  rows={4}
                  placeholder="Explain why you are requesting this document (required for verification)..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full bg-white border border-slate-200 text-slate-800 rounded-xl py-2 px-3 text-xs focus:outline-none focus:border-indigo-500/40 transition"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="border border-slate-200 hover:bg-slate-50 text-slate-600 px-4 py-2 text-xs font-bold rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white px-4 py-2 text-xs font-bold rounded-xl transition shadow shadow-indigo-600/10 flex items-center justify-center gap-1.5"
                >
                  {submitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    'Submit Request'
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
