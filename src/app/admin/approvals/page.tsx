'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAppStore } from '@/lib/store';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckSquare,
  ArrowLeft,
  CheckCircle,
  XCircle,
  FileText,
  ExternalLink,
  Loader2,
  ChevronRight,
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

interface ServiceRequest {
  id: string;
  student_id: string;
  request_type: 'Bonafide Certificate' | 'Character Certificate' | 'Transcript' | 'ID Card Reissue';
  reason: string;
  status: 'Pending' | 'Approved' | 'Completed' | 'Rejected';
  comments: string | null;
  attachment_url: string | null;
  actioned_by: string | null;
  actioned_at: string | null;
  created_at: string;
  students?: Student;
}

export default function ApprovalsQueuePage() {
  const { admin } = useAppStore();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<'leaves' | 'services'>('leaves');
  
  const [selectedLeave, setSelectedLeave] = useState<LeaveRequest | null>(null);
  const [selectedService, setSelectedService] = useState<ServiceRequest | null>(null);
  
  const [comments, setComments] = useState('');

  // Fetch Leave Requests
  const { data: leaves, isLoading: loadingLeaves } = useQuery({
    queryKey: ['admin-approvals-leaves'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leave_requests')
        .select('*, students(*)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as LeaveRequest[];
    },
  });

  // Fetch Service Requests
  const { data: services, isLoading: loadingServices } = useQuery({
    queryKey: ['admin-approvals-services'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('service_requests')
        .select('*, students(*)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as ServiceRequest[];
    },
  });

  // Action Leave Mutation
  const actionLeaveMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'Approved' | 'Rejected' }) => {
      const { error } = await supabase
        .from('leave_requests')
        .update({
          status,
          comments: comments.trim() || null,
          actioned_by: admin?.name || 'Admin',
          actioned_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;

      await supabase.from('audit_logs').insert({
        user_email: admin?.name || 'Admin',
        role: admin?.role || 'Super Admin',
        action: `Processed leave request status: ${status}`,
        affected_records: `leave_requests: ${id}`,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-approvals-leaves'] });
      setComments('');
      setSelectedLeave(null);
    },
  });

  // Action Service Mutation
  const actionServiceMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'Approved' | 'Completed' | 'Rejected' }) => {
      const { error } = await supabase
        .from('service_requests')
        .update({
          status,
          comments: comments.trim() || null,
          actioned_by: admin?.name || 'Admin',
          actioned_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;

      await supabase.from('audit_logs').insert({
        user_email: admin?.name || 'Admin',
        role: admin?.role || 'Super Admin',
        action: `Processed certificate service request status: ${status}`,
        affected_records: `service_requests: ${id}`,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-approvals-services'] });
      setComments('');
      setSelectedService(null);
    },
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Approved':
      case 'Completed':
        return 'bg-emerald-500/10 border-emerald-250/20 text-emerald-800';
      case 'Rejected':
        return 'bg-red-500/10 border-red-250/20 text-red-800';
      default:
        return 'bg-amber-500/10 border-amber-250/20 text-amber-850';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link href="/admin" className="text-xs text-slate-500 hover:text-indigo-650 font-extrabold flex items-center gap-1 mb-2">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
        </Link>
        <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 font-sans">Unified Approvals Board</h2>
        <p className="text-slate-550 text-xs mt-1 font-semibold">
          Approve or reject student leave requests, medical certificate logs, and official document re-issues.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 pb-1 border-b border-slate-200/60 font-semibold">
        <button
          onClick={() => {
            setActiveTab('leaves');
            setSelectedService(null);
            setComments('');
          }}
          className={`px-4 py-2 text-xs font-extrabold border-b-2 transition ${
            activeTab === 'leaves'
              ? 'border-indigo-600 text-indigo-650'
              : 'border-transparent text-slate-500 hover:text-slate-705'
          }`}
        >
          Leave Applications ({leaves?.filter((l) => l.status === 'Pending').length || 0})
        </button>
        <button
          onClick={() => {
            setActiveTab('services');
            setSelectedLeave(null);
            setComments('');
          }}
          className={`px-4 py-2 text-xs font-extrabold border-b-2 transition ${
            activeTab === 'services'
              ? 'border-indigo-600 text-indigo-650'
              : 'border-transparent text-slate-500 hover:text-slate-705'
          }`}
        >
          Service Desk Tickets ({services?.filter((s) => s.status === 'Pending').length || 0})
        </button>
      </div>

      {/* Grid split view */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Side: Requests List */}
        <div className="lg:col-span-2 space-y-3.5 h-[65vh] overflow-y-auto pr-1">
          {activeTab === 'leaves' ? (
            loadingLeaves ? (
              <div className="p-8 text-center text-slate-500 font-bold"><Loader2 className="w-6 h-6 animate-spin mx-auto text-indigo-600" /></div>
            ) : leaves && leaves.length > 0 ? (
              leaves.map((l) => (
                <div
                  key={l.id}
                  onClick={() => {
                    setSelectedLeave(l);
                    setComments(l.comments || '');
                  }}
                  className={`bg-white/50 backdrop-blur-md border p-5 rounded-2xl cursor-pointer hover:border-slate-350 transition flex flex-col sm:flex-row justify-between gap-4 shadow-sm ${
                    selectedLeave?.id === l.id ? 'border-indigo-600 shadow' : 'border-slate-200/80'
                  }`}
                >
                  <div className="space-y-2 font-semibold">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-[9.5px] font-extrabold uppercase tracking-wider px-2 py-0.5 border rounded-full ${getStatusBadge(l.status)}`}>
                        {l.status}
                      </span>
                      <span className="bg-white border border-slate-200 text-slate-700 text-[9.5px] font-extrabold px-2 py-0.5 rounded-full uppercase">
                        {l.leave_type} Leave
                      </span>
                      <span className="text-[10px] text-slate-505 font-bold font-sans">
                        Applied: {new Date(l.created_at).toLocaleDateString()}
                      </span>
                    </div>

                    <h3 className="text-xs font-extrabold text-slate-900 leading-tight">
                      {l.students?.first_name} {l.students?.last_name} ({l.students?.student_id})
                    </h3>

                    <p className="text-xs text-slate-500 line-clamp-1 leading-relaxed font-semibold">
                      Reason: "{l.reason}"
                    </p>
                  </div>

                  <span className="text-[10px] text-indigo-650 hover:text-indigo-750 font-extrabold flex items-center gap-0.5 self-end sm:self-auto">
                    Audit dossier <ChevronRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              ))
            ) : (
              <div className="text-center py-12 text-slate-500 text-xs font-bold">No leave requests logged.</div>
            )
          ) : (
            loadingServices ? (
              <div className="p-8 text-center text-slate-500 font-bold"><Loader2 className="w-6 h-6 animate-spin mx-auto text-indigo-600" /></div>
            ) : services && services.length > 0 ? (
              services.map((s) => (
                <div
                  key={s.id}
                  onClick={() => {
                    setSelectedService(s);
                    setComments(s.comments || '');
                  }}
                  className={`bg-white/50 backdrop-blur-md border p-5 rounded-2xl cursor-pointer hover:border-slate-350 transition flex flex-col sm:flex-row justify-between gap-4 shadow-sm ${
                    selectedService?.id === s.id ? 'border-indigo-600 shadow' : 'border-slate-200/80'
                  }`}
                >
                  <div className="space-y-2 font-semibold">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-[9.5px] font-extrabold uppercase tracking-wider px-2 py-0.5 border rounded-full ${getStatusBadge(s.status)}`}>
                        {s.status}
                      </span>
                      <span className="bg-white border border-slate-200 text-slate-700 text-[9.5px] font-extrabold px-2 py-0.5 rounded-full uppercase">
                        {s.request_type}
                      </span>
                      <span className="text-[10px] text-slate-505 font-bold font-sans">
                        Raised: {new Date(s.created_at).toLocaleDateString()}
                      </span>
                    </div>

                    <h3 className="text-xs font-extrabold text-slate-900 leading-tight">
                      {s.students?.first_name} {s.students?.last_name} ({s.students?.student_id})
                    </h3>

                    <p className="text-xs text-slate-500 line-clamp-1 leading-relaxed font-semibold">
                      Reason: "{s.reason}"
                    </p>
                  </div>

                  <span className="text-[10px] text-indigo-650 hover:text-indigo-755 font-extrabold flex items-center gap-0.5 self-end sm:self-auto">
                    Audit dossier <ChevronRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              ))
            ) : (
              <div className="text-center py-12 text-slate-500 text-xs font-bold">No service requests logged.</div>
            )
          )}
        </div>

        {/* Right Side: Action Detailed Board */}
        <div className="lg:col-span-1">
          <AnimatePresence mode="wait">
            {selectedLeave && (
              <motion.div
                key={selectedLeave.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="bg-white/50 backdrop-blur-md border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-5"
              >
                <div className="border-b border-slate-200/60 pb-4">
                  <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider font-sans">Leave dossier review</h3>
                  <p className="text-[10px] text-slate-500 mt-0.5 font-sans font-bold">#{selectedLeave.id.slice(0, 8)}</p>
                </div>

                <div className="space-y-4 font-semibold text-xs text-slate-700">
                  <div>
                    <span className="text-[9.5px] font-extrabold text-slate-500 uppercase">Student applicant</span>
                    <h4 className="text-xs font-extrabold text-slate-900 mt-1">
                      {selectedLeave.students?.first_name} {selectedLeave.students?.last_name}
                    </h4>
                    <span className="text-[10px] text-slate-500 mt-0.5 block font-sans font-semibold">{selectedLeave.students?.student_id}</span>
                  </div>

                  <div>
                    <span className="text-[9.5px] font-extrabold text-slate-500 uppercase">Duration</span>
                    <p className="text-xs font-bold text-slate-800 mt-1">
                      {new Date(selectedLeave.start_date).toLocaleDateString()} - {new Date(selectedLeave.end_date).toLocaleDateString()}
                    </p>
                  </div>

                  <div>
                    <span className="text-[9.5px] font-extrabold text-slate-500 uppercase">Reason</span>
                    <p className="text-xs text-slate-500 bg-white/40 border border-slate-200/60 p-3 rounded-xl mt-1 leading-relaxed font-semibold">
                      "{selectedLeave.reason}"
                    </p>
                  </div>

                  {selectedLeave.attachment_url && (
                    <div>
                      <span className="text-[9.5px] font-extrabold text-slate-500 uppercase block mb-1.5">Document Attachment</span>
                      <a
                        href={selectedLeave.attachment_url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center justify-between p-2.5 bg-indigo-500/10 border border-indigo-250/20 text-indigo-850 hover:bg-indigo-500/20 rounded-xl transition shadow-sm font-extrabold"
                      >
                        <span className="text-xs flex items-center gap-1.5">
                          <FileText className="w-4 h-4 text-indigo-650" /> Medical Certificate
                        </span>
                        <ExternalLink className="w-3.5 h-3.5 text-indigo-650" />
                      </a>
                    </div>
                  )}

                  {selectedLeave.status === 'Pending' ? (
                    <div className="space-y-3.5 pt-3 border-t border-slate-200/60">
                      <div>
                        <label className="text-[9.5px] font-extrabold text-slate-500 uppercase block mb-1">Approval remarks</label>
                        <textarea
                          rows={3}
                          value={comments}
                          onChange={(e) => setComments(e.target.value)}
                          placeholder="Provide approval comments, reason for rejection..."
                          className="w-full bg-white/40 border border-slate-200/60 rounded-xl px-3 py-2 text-xs text-slate-850 focus:outline-none focus:border-indigo-500 transition resize-none font-bold"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <button
                          onClick={() => actionLeaveMutation.mutate({ id: selectedLeave.id, status: 'Rejected' })}
                          disabled={actionLeaveMutation.isPending}
                          className="border border-red-200/60 bg-red-500/10 hover:bg-red-500/20 text-red-850 font-extrabold text-xs py-2 px-4 rounded-xl transition flex items-center justify-center gap-1"
                        >
                          <XCircle className="w-4 h-4 text-red-655" /> Reject
                        </button>
                        <button
                          onClick={() => actionLeaveMutation.mutate({ id: selectedLeave.id, status: 'Approved' })}
                          disabled={actionLeaveMutation.isPending}
                          className="bg-indigo-600 hover:bg-indigo-705 text-white font-extrabold text-xs py-2 px-4 rounded-xl transition flex items-center justify-center gap-1 shadow-sm"
                        >
                          <CheckCircle className="w-4 h-4" /> Approve
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 bg-white/40 border border-slate-200/60 rounded-xl text-xs space-y-1.5 text-slate-500">
                      <span className="block font-extrabold text-slate-800">Reviewed Log:</span>
                      <div>Reviewed by: <span className="font-extrabold text-slate-900">{selectedLeave.actioned_by}</span></div>
                      {selectedLeave.comments && <div>Remarks: <span className="font-extrabold text-slate-900">"{selectedLeave.comments}"</span></div>}
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {selectedService && (
              <motion.div
                key={selectedService.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="bg-white/50 backdrop-blur-md border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-5"
              >
                <div className="border-b border-slate-200/60 pb-4">
                  <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider font-sans">Service request review</h3>
                  <p className="text-[10px] text-slate-500 mt-0.5 font-sans font-bold">#{selectedService.id.slice(0, 8)}</p>
                </div>

                <div className="space-y-4 font-semibold text-xs text-slate-700">
                  <div>
                    <span className="text-[9.5px] font-extrabold text-slate-500 uppercase">Student applicant</span>
                    <h4 className="text-xs font-extrabold text-slate-900 mt-1">
                      {selectedService.students?.first_name} {selectedService.students?.last_name}
                    </h4>
                    <span className="text-[10px] text-slate-500 mt-0.5 block font-sans font-semibold">{selectedService.students?.student_id}</span>
                  </div>

                  <div>
                    <span className="text-[9.5px] font-extrabold text-slate-500 uppercase">Request Type</span>
                    <p className="text-xs font-bold text-slate-800 mt-1">{selectedService.request_type}</p>
                  </div>

                  <div>
                    <span className="text-[9.5px] font-extrabold text-slate-500 uppercase">Reason</span>
                    <p className="text-xs text-slate-500 bg-white/40 border border-slate-200/60 p-3 rounded-xl mt-1 leading-relaxed font-semibold">
                      "{selectedService.reason}"
                    </p>
                  </div>

                  {selectedService.status === 'Pending' ? (
                    <div className="space-y-3.5 pt-3 border-t border-slate-200/60">
                      <div>
                        <label className="text-[9.5px] font-extrabold text-slate-500 uppercase block mb-1">Approval remarks</label>
                        <textarea
                          rows={3}
                          value={comments}
                          onChange={(e) => setComments(e.target.value)}
                          placeholder="Provide approval comments or update status..."
                          className="w-full bg-white/40 border border-slate-200/60 rounded-xl px-3 py-2 text-xs text-slate-850 focus:outline-none focus:border-indigo-500 transition resize-none font-bold"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <button
                          onClick={() => actionServiceMutation.mutate({ id: selectedService.id, status: 'Rejected' })}
                          disabled={actionServiceMutation.isPending}
                          className="border border-red-200/60 bg-red-500/10 hover:bg-red-500/20 text-red-855 font-extrabold text-xs py-2 px-4 rounded-xl transition flex items-center justify-center gap-1"
                        >
                          <XCircle className="w-4 h-4 text-red-655" /> Reject
                        </button>
                        <button
                          onClick={() => actionServiceMutation.mutate({ id: selectedService.id, status: 'Completed' })}
                          disabled={actionServiceMutation.isPending}
                          className="bg-indigo-600 hover:bg-indigo-705 text-white font-extrabold text-xs py-2 px-4 rounded-xl transition flex items-center justify-center gap-1 shadow-sm"
                        >
                          <CheckCircle className="w-4 h-4" /> Complete
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 bg-white/40 border border-slate-200/60 rounded-xl text-xs space-y-1.5 text-slate-500">
                      <span className="block font-extrabold text-slate-800">Processed Log:</span>
                      <div>Processed by: <span className="font-extrabold text-slate-900">{selectedService.actioned_by}</span></div>
                      {selectedService.comments && <div>Remarks: <span className="font-extrabold text-slate-900">"{selectedService.comments}"</span></div>}
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {!selectedLeave && !selectedService && (
              <div className="bg-white/50 border border-dashed border-slate-200/80 rounded-2xl p-8 text-center text-slate-500 h-64 flex flex-col items-center justify-center shadow-sm font-bold">
                <CheckSquare className="w-10 h-10 text-slate-400 mb-2 stroke-[1.5] animate-pulse" />
                <h4 className="text-xs font-extrabold text-slate-700">No application selected</h4>
                <p className="text-[10px] text-slate-555 max-w-xs mt-1 font-semibold">
                  Click on any request in the left list queue to audit details and execute approval actions.
                </p>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
