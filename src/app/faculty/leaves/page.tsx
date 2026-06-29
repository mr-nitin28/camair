'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAppStore } from '@/lib/store';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CalendarClock,
  ArrowLeft,
  CheckCircle,
  XCircle,
  FileText,
  Clock,
  User,
  ExternalLink,
  MessageSquare,
  AlertTriangle,
} from 'lucide-react';
import Link from 'next/link';

interface Student {
  first_name: string;
  last_name: string;
  student_id: string;
}

interface LeaveRequest {
  id: string;
  student_id: string;
  leave_type: 'Medical' | 'Personal' | 'On Duty' | 'Other';
  start_date: string;
  end_date: string;
  reason: string;
  attachment_url: string | null;
  status: 'Pending' | 'Approved' | 'Rejected';
  actioned_by: string | null;
  actioned_at: string | null;
  comments: string | null;
  created_at: string;
  students?: Student;
}

export default function LeaveApprovalsPage() {
  const { faculty } = useAppStore();
  const queryClient = useQueryClient();

  const [activeRequest, setActiveRequest] = useState<LeaveRequest | null>(null);
  const [comments, setComments] = useState('');
  const [filterStatus, setFilterStatus] = useState<'All' | 'Pending' | 'Approved' | 'Rejected'>('Pending');

  // Fetch Leave Requests
  const { data: leaves, isLoading } = useQuery({
    queryKey: ['faculty-leave-requests', faculty?.id],
    queryFn: async () => {
      // Query leave requests from students.
      // Since it's a demo, we fetch all leave requests in the system.
      const { data, error } = await supabase
        .from('leave_requests')
        .select('*, students(*)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as LeaveRequest[];
    },
    enabled: !!faculty,
  });

  // Action Leave Mutation
  const actionLeaveMutation = useMutation({
    mutationFn: async ({ id, status, comments }: { id: string; status: 'Approved' | 'Rejected'; comments: string }) => {
      const { error } = await supabase
        .from('leave_requests')
        .update({
          status,
          comments: comments.trim() || null,
          actioned_by: `Dr. ${faculty?.first_name} ${faculty?.last_name}`,
          actioned_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['faculty-leave-requests'] });
      setComments('');
      setActiveRequest(null);
    },
  });

  const handleAction = (status: 'Approved' | 'Rejected') => {
    if (!activeRequest) return;
    actionLeaveMutation.mutate({
      id: activeRequest.id,
      status,
      comments,
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Approved':
        return 'bg-emerald-50 border-emerald-200 text-emerald-800 font-extrabold';
      case 'Rejected':
        return 'bg-red-50 border-red-200 text-red-800 font-extrabold';
      default:
        return 'bg-amber-50 border-amber-200 text-amber-800 font-extrabold';
    }
  };

  // Filter leaves
  const filteredLeaves = leaves?.filter((l) => {
    if (filterStatus === 'All') return true;
    return l.status === filterStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link
          href="/faculty"
          className="text-xs text-slate-500 hover:text-blue-600 font-semibold flex items-center gap-1 mb-2"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Workspace
        </Link>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">Leave Approvals Control</h2>
        <p className="text-slate-500 text-xs mt-1">
          Review, approve, or reject student leaves, verify medical certificate attachments, and add comments.
        </p>
      </div>

      {/* Tabs / Filters */}
      <div className="flex gap-2 pb-1 border-b border-slate-200">
        {(['Pending', 'Approved', 'Rejected', 'All'] as const).map((status) => (
          <button
            key={status}
            onClick={() => {
              setFilterStatus(status);
              setActiveRequest(null);
            }}
            className={`px-4 py-2 text-xs font-semibold border-b-2 transition ${
              filterStatus === status
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            {status} Requests
          </button>
        ))}
      </div>

      {/* Main Grid split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Side: Leaves List */}
        <div className="lg:col-span-2 space-y-3.5">
          {isLoading ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-slate-400">
              <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-xs font-semibold">Loading leave records...</p>
            </div>
          ) : filteredLeaves && filteredLeaves.length > 0 ? (
            filteredLeaves.map((request) => (
              <div
                key={request.id}
                onClick={() => {
                  setActiveRequest(request);
                  setComments(request.comments || '');
                }}
                className={`bg-white border p-5 rounded-2xl shadow-sm hover:shadow-md transition cursor-pointer relative overflow-hidden flex flex-col sm:flex-row justify-between gap-4 ${
                  activeRequest?.id === request.id ? 'border-blue-600 bg-blue-50/5' : 'border-slate-200'
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 border rounded-full ${getStatusBadge(request.status)}`}>
                      {request.status}
                    </span>
                    <span className="bg-slate-100 border text-slate-600 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase">
                      {request.leave_type} Leave
                    </span>
                    <span className="text-[10px] text-slate-400 font-semibold font-mono">
                      Applied: {new Date(request.created_at).toLocaleDateString()}
                    </span>
                  </div>

                  <h3 className="text-xs font-bold text-slate-900 leading-tight">
                    {request.students?.first_name} {request.students?.last_name} ({request.students?.student_id})
                  </h3>

                  <p className="text-[11px] text-slate-500 font-semibold mt-1">
                    Duration: {new Date(request.start_date).toLocaleDateString()} to {new Date(request.end_date).toLocaleDateString()}
                  </p>

                  <p className="text-xs text-slate-600 line-clamp-1 mt-1 leading-relaxed">
                    Reason: "{request.reason}"
                  </p>
                </div>

                <div className="flex items-end self-end sm:self-auto shrink-0">
                  <span className="text-[10px] text-blue-600 hover:text-blue-700 font-bold flex items-center gap-0.5">
                    View Details <ExternalLink className="w-3 h-3" />
                  </span>
                </div>
              </div>
            ))
          ) : (
            <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-400">
              <CalendarClock className="w-12 h-12 text-slate-300 stroke-[1.5] mx-auto mb-3" />
              <h3 className="text-xs font-bold text-slate-900">No requests found</h3>
              <p className="text-[10px] text-slate-400 mt-1 max-w-xs mx-auto">
                Leave requests matching your current status filter will be logged in this view.
              </p>
            </div>
          )}
        </div>

        {/* Right Side: Detailed review board */}
        <div className="lg:col-span-1">
          <AnimatePresence mode="wait">
            {activeRequest ? (
              <motion.div
                key={activeRequest.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="bg-white border border-slate-200 rounded-2xl p-6 shadow-md space-y-5 sticky top-24"
              >
                <div className="border-b border-slate-100 pb-4">
                  <h3 className="text-sm font-bold text-slate-950">Review Request dossier</h3>
                  <p className="text-[10px] text-slate-400 mt-0.5 uppercase tracking-wider font-bold">
                    ID: #{activeRequest.id.slice(0, 8)}
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="flex gap-3">
                    <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                      <User className="w-5 h-5 text-slate-500" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">
                        {activeRequest.students?.first_name} {activeRequest.students?.last_name}
                      </h4>
                      <p className="text-[10px] text-slate-400 font-mono mt-0.5">{activeRequest.students?.student_id}</p>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[9px] font-bold text-slate-400 uppercase">Leave Duration</span>
                    <p className="text-xs font-bold text-slate-800">
                      {new Date(activeRequest.start_date).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}{' '}
                      -{' '}
                      {new Date(activeRequest.end_date).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </p>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[9px] font-bold text-slate-400 uppercase">Reason</span>
                    <p className="text-xs text-slate-600 bg-slate-50 border border-slate-100 p-3 rounded-xl whitespace-pre-line leading-relaxed">
                      "{activeRequest.reason}"
                    </p>
                  </div>

                  {activeRequest.attachment_url && (
                    <div className="space-y-1">
                      <span className="text-[9px] font-bold text-slate-400 uppercase">Certificate Attachment</span>
                      <a
                        href={activeRequest.attachment_url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center justify-between p-2.5 bg-blue-50 border border-blue-100 rounded-xl text-blue-700 hover:bg-blue-100 transition mt-1"
                      >
                        <span className="text-xs font-semibold flex items-center gap-1.5">
                          <FileText className="w-4 h-4 text-blue-600" /> Medical Certificate
                        </span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  )}

                  {activeRequest.status === 'Pending' ? (
                    <div className="space-y-3.5 pt-3 border-t border-slate-100">
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-400 uppercase block">Reviewer remarks</label>
                        <textarea
                          rows={3}
                          value={comments}
                          onChange={(e) => setComments(e.target.value)}
                          placeholder="Provide approval comments, reason for rejection, or adjustments..."
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-blue-500 focus:bg-white transition resize-none"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3.5">
                        <button
                          onClick={() => handleAction('Rejected')}
                          disabled={actionLeaveMutation.isPending}
                          className="border border-red-200 bg-red-50 hover:bg-red-100/75 text-red-800 font-bold text-xs py-2 px-4 rounded-xl transition disabled:opacity-50 flex items-center justify-center gap-1"
                        >
                          <XCircle className="w-4 h-4 text-red-600" /> Reject
                        </button>
                        <button
                          onClick={() => handleAction('Approved')}
                          disabled={actionLeaveMutation.isPending}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2 px-4 rounded-xl shadow-md shadow-emerald-600/10 transition disabled:opacity-50 flex items-center justify-center gap-1"
                        >
                          <CheckCircle className="w-4 h-4 text-white" /> Approve
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl text-xs space-y-2 mt-2">
                      <span className="block font-bold text-slate-700">Processed log details:</span>
                      <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-500">
                        <span>Actioned by:</span>
                        <span className="font-semibold text-slate-800 text-right">{activeRequest.actioned_by}</span>
                        <span>Actioned at:</span>
                        <span className="font-semibold text-slate-800 text-right">
                          {activeRequest.actioned_at ? new Date(activeRequest.actioned_at).toLocaleDateString() : 'N/A'}
                        </span>
                      </div>
                      {activeRequest.comments && (
                        <div className="pt-2 border-t border-slate-200/50">
                          <span className="block font-bold text-slate-700 text-[10px]">Reviewer Remarks:</span>
                          <p className="text-[11px] text-slate-600 mt-0.5">"{activeRequest.comments}"</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
            ) : (
              <div className="bg-slate-50 border border-dashed border-slate-300 rounded-2xl p-8 text-center text-slate-400 h-64 flex flex-col items-center justify-center">
                <CalendarClock className="w-8 h-8 text-slate-300 stroke-[1.5] mb-2 animate-bounce" />
                <h4 className="text-xs font-bold text-slate-900">No ticket loaded</h4>
                <p className="text-[10px] text-slate-400 mt-1 max-w-xs">
                  Click on any leave application request log in the list to trigger audit view.
                </p>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
