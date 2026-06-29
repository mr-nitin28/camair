'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAppStore } from '@/lib/store';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HelpCircle,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Send,
  MessageSquare,
  Clock,
  Clock3,
  User,
  Tag,
} from 'lucide-react';
import Link from 'next/link';

interface Doubt {
  id: string;
  student_id: string;
  subject_id: string;
  title: string;
  description: string;
  category: 'Academic' | 'Administrative' | 'Examination' | 'Technical';
  status: 'Open' | 'In Progress' | 'Resolved';
  created_at: string;
  students?: { first_name: string; last_name: string; student_id: string };
  subjects?: { name: string; code: string };
}

interface DoubtMessage {
  id: string;
  doubt_id: string;
  sender_id: string;
  sender_name: string;
  sender_role: 'Student' | 'Faculty' | 'Admin';
  message: string;
  created_at: string;
}

export default function DoubtsInboxPage() {
  const { faculty } = useAppStore();
  const queryClient = useQueryClient();
  const threadEndRef = useRef<HTMLDivElement | null>(null);

  const [selectedDoubtId, setSelectedDoubtId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch Doubt Tickets
  const { data: doubts, isLoading } = useQuery({
    queryKey: ['faculty-doubts-list', faculty?.id],
    queryFn: async () => {
      // Query doubts. To be specific, we fetch all doubts where the subject belongs to the subjects taught by this faculty.
      // 1. Fetch subjects taught by faculty
      const { data: subjectLinks } = await supabase
        .from('faculty_subjects')
        .select('subject_id');
      const subjectIds = subjectLinks?.map((l: any) => l.subject_id) || [];

      if (subjectIds.length === 0) {
        // Return empty or fetch all for department
        const { data, error } = await supabase
          .from('doubts')
          .select('*, students(*), subjects(*)')
          .order('created_at', { ascending: false });
        if (error) throw error;
        return data as Doubt[];
      }

      const { data, error } = await supabase
        .from('doubts')
        .select('*, students(*), subjects(*)')
        .in('subject_id', subjectIds)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Doubt[];
    },
    enabled: !!faculty,
  });

  // Set first doubt ticket as default selected on load
  useEffect(() => {
    if (doubts && doubts.length > 0 && !selectedDoubtId) {
      setSelectedDoubtId(doubts[0].id);
    }
  }, [doubts, selectedDoubtId]);

  // Fetch Messages for Selected Ticket
  const { data: threadMessages } = useQuery({
    queryKey: ['doubt-thread-messages', selectedDoubtId],
    queryFn: async () => {
      if (!selectedDoubtId) return [];
      const { data, error } = await supabase
        .from('doubt_messages')
        .select('*')
        .eq('doubt_id', selectedDoubtId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data as DoubtMessage[];
    },
    enabled: !!selectedDoubtId,
    refetchInterval: 3000, // Poll every 3 seconds for new updates
  });

  // Scroll to bottom of message thread
  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [threadMessages]);

  // Send Message Mutation
  const sendReplyMutation = useMutation({
    mutationFn: async () => {
      if (!faculty || !selectedDoubtId || !replyText.trim()) return;

      const { error } = await supabase.from('doubt_messages').insert({
        doubt_id: selectedDoubtId,
        sender_id: faculty.id,
        sender_name: `Dr. ${faculty.first_name} ${faculty.last_name}`,
        sender_role: 'Faculty',
        message: replyText.trim(),
      });

      if (error) throw error;
    },
    onSuccess: () => {
      setReplyText('');
      queryClient.invalidateQueries({ queryKey: ['doubt-thread-messages', selectedDoubtId] });
    },
  });

  // Update Status Mutation
  const updateStatusMutation = useMutation({
    mutationFn: async (newStatus: 'Open' | 'In Progress' | 'Resolved') => {
      if (!selectedDoubtId) return;
      const { error } = await supabase
        .from('doubts')
        .update({ status: newStatus })
        .eq('id', selectedDoubtId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['faculty-doubts-list'] });
    },
  });

  const handleSendReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || sendReplyMutation.isPending) return;
    sendReplyMutation.mutate();
  };

  const activeDoubt = doubts?.find((d) => d.id === selectedDoubtId);

  // Status badges helpers
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Resolved':
        return 'bg-emerald-50 border-emerald-200 text-emerald-800 font-extrabold';
      case 'In Progress':
        return 'bg-amber-50 border-amber-200 text-amber-800 font-extrabold';
      default:
        return 'bg-blue-50 border-blue-200 text-blue-800 font-extrabold';
    }
  };

  // Filter doubts by query
  const filteredDoubts = doubts?.filter((d) => {
    const query = searchQuery.toLowerCase();
    const studentName = `${d.students?.first_name} ${d.students?.last_name}`.toLowerCase();
    return (
      d.title.toLowerCase().includes(query) ||
      (d.subjects?.name || '').toLowerCase().includes(query) ||
      studentName.includes(query)
    );
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
        <h2 className="text-2xl font-bold tracking-tight text-slate-900 font-sans">Doubts Inbox</h2>
        <p className="text-slate-500 text-xs mt-1">
          Review, triage, and reply to academic doubts raised by students across your subjects.
        </p>
      </div>

      {/* Doubts Split Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden h-[75vh]">
        {/* Left Side: Ticket Queue */}
        <div className="lg:col-span-1 border-r border-slate-200 flex flex-col h-full bg-slate-50/50">
          {/* List Search */}
          <div className="p-3 border-b border-slate-200 bg-white">
            <input
              type="text"
              placeholder="Search doubts by title, subject..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-100 border-transparent rounded-lg py-1.5 px-3 text-xs focus:outline-none focus:bg-white focus:border-slate-300 border transition"
            />
          </div>

          {/* Ticket List */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {isLoading ? (
              <div className="text-center py-8 text-slate-400 text-xs font-semibold">Loading tickets...</div>
            ) : filteredDoubts && filteredDoubts.length > 0 ? (
              filteredDoubts.map((d) => (
                <button
                  key={d.id}
                  onClick={() => setSelectedDoubtId(d.id)}
                  className={`w-full flex flex-col gap-1.5 p-3.5 rounded-xl text-left border transition ${
                    selectedDoubtId === d.id
                      ? 'bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-600/10'
                      : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 border rounded-full ${
                      selectedDoubtId === d.id
                        ? 'bg-blue-800 border-blue-700 text-blue-100'
                        : getStatusBadge(d.status)
                    }`}>
                      {d.status}
                    </span>
                    <span className={`text-[9px] font-semibold ${selectedDoubtId === d.id ? 'text-blue-200' : 'text-slate-400'}`}>
                      {new Date(d.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <h4 className="text-xs font-bold leading-tight line-clamp-1">{d.title}</h4>
                  <div className="flex items-center gap-1.5 text-[9px] font-semibold">
                    <span className={selectedDoubtId === d.id ? 'text-blue-100' : 'text-slate-500'}>
                      {d.students?.first_name} {d.students?.last_name}
                    </span>
                    <span className={selectedDoubtId === d.id ? 'text-blue-200' : 'text-slate-400'}>•</span>
                    <span className={`truncate ${selectedDoubtId === d.id ? 'text-blue-100' : 'text-slate-500 font-mono'}`}>
                      {d.subjects?.code}
                    </span>
                  </div>
                </button>
              ))
            ) : (
              <div className="text-center py-8 text-slate-400 text-xs font-semibold">No doubts in mailbox.</div>
            )}
          </div>
        </div>

        {/* Right Side: Doubt Ticket Details & Thread */}
        <div className="lg:col-span-3 flex flex-col h-full bg-slate-50/10">
          {activeDoubt ? (
            <>
              {/* Ticket Details & Action Panel */}
              <div className="p-6 bg-white border-b border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 border rounded-full ${getStatusBadge(activeDoubt.status)}`}>
                      {activeDoubt.status}
                    </span>
                    <span className="bg-slate-100 text-slate-700 border border-slate-200 text-[9px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full flex items-center gap-1">
                      <Tag className="w-2.5 h-2.5 text-slate-500" /> {activeDoubt.category}
                    </span>
                    <span className="text-slate-400 text-[10px] font-semibold flex items-center gap-1 font-mono">
                      <Clock3 className="w-3.5 h-3.5 text-slate-400" /> {new Date(activeDoubt.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 leading-tight">{activeDoubt.title}</h3>
                  <div className="flex items-center gap-1 text-[10px] text-slate-500 font-medium">
                    <span>Raised by:</span>
                    <span className="font-bold text-slate-700">{activeDoubt.students?.first_name} {activeDoubt.students?.last_name} ({activeDoubt.students?.student_id})</span>
                    <span>• Subject:</span>
                    <span className="font-bold text-blue-700">{activeDoubt.subjects?.name} ({activeDoubt.subjects?.code})</span>
                  </div>
                </div>

                {/* Resolve / Action Controls */}
                <div className="flex gap-2">
                  <button
                    onClick={() => updateStatusMutation.mutate('In Progress')}
                    disabled={activeDoubt.status === 'In Progress' || updateStatusMutation.isPending}
                    className="border border-amber-200 bg-amber-50 hover:bg-amber-100/75 text-amber-800 text-[10px] font-bold uppercase tracking-wider py-1.5 px-3 rounded-lg transition disabled:opacity-50"
                  >
                    Set In Progress
                  </button>
                  <button
                    onClick={() => updateStatusMutation.mutate('Resolved')}
                    disabled={activeDoubt.status === 'Resolved' || updateStatusMutation.isPending}
                    className="border border-emerald-200 bg-emerald-50 hover:bg-emerald-100/75 text-emerald-800 text-[10px] font-bold uppercase tracking-wider py-1.5 px-3 rounded-lg transition disabled:opacity-50 flex items-center gap-1"
                  >
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Mark Resolved
                  </button>
                </div>
              </div>

              {/* Chat Thread */}
              <div className="flex-grow overflow-y-auto p-6 space-y-4">
                {/* Description Post */}
                <div className="bg-blue-50/50 border border-blue-200 p-4.5 rounded-2xl shadow-sm text-xs leading-relaxed max-w-[85%]">
                  <span className="block font-bold text-blue-900 mb-1">Doubt Description:</span>
                  <p className="text-slate-800 whitespace-pre-line">{activeDoubt.description}</p>
                </div>

                {/* Thread Messages */}
                {threadMessages && threadMessages.length > 0 ? (
                  threadMessages.map((msg) => {
                    const isFaculty = msg.sender_role === 'Faculty';
                    return (
                      <div
                        key={msg.id}
                        className={`flex gap-3 max-w-[80%] ${isFaculty ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}
                      >
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                          isFaculty ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-800'
                        }`}>
                          {msg.sender_name[0] || 'U'}
                        </div>
                        <div className="space-y-1">
                          <div className={`flex items-center gap-2 ${isFaculty ? 'justify-end' : ''}`}>
                            <span className="text-[10px] font-bold text-slate-800">{msg.sender_name}</span>
                            <span className="bg-slate-100 border text-slate-600 text-[8px] font-bold uppercase px-1 rounded">
                              {msg.sender_role}
                            </span>
                            <span className="text-[9px] text-slate-400 font-mono">
                              {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <div className={`p-3.5 rounded-2xl text-xs leading-relaxed ${
                            isFaculty
                              ? 'bg-blue-600 text-white rounded-tr-none'
                              : 'bg-white border border-slate-200 text-slate-800 rounded-tl-none shadow-sm'
                          }`}>
                            <p className="whitespace-pre-line">{msg.message}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-6 text-slate-400 text-xs">No replies in thread. Post a reply below.</div>
                )}
                <div ref={threadEndRef} />
              </div>

              {/* Chat Input */}
              <form onSubmit={handleSendReply} className="p-4 bg-white border-t border-slate-200 flex gap-2">
                <textarea
                  rows={1}
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendReply(e);
                    }
                  }}
                  placeholder="Type a response to this doubt..."
                  className="flex-grow bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs focus:outline-none focus:border-blue-500 focus:bg-white resize-none max-h-20"
                />
                <button
                  type="submit"
                  disabled={!replyText.trim() || sendReplyMutation.isPending}
                  className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-4 flex items-center justify-center transition disabled:opacity-50 shrink-0 self-end h-9 font-semibold text-xs"
                >
                  {sendReplyMutation.isPending ? 'Sending...' : <Send className="w-4 h-4" />}
                </button>
              </form>
            </>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-400">
              <HelpCircle className="w-12 h-12 text-slate-300 stroke-[1.5] mb-2 animate-pulse" />
              <h4 className="text-sm font-bold text-slate-900">No doubts ticket selected</h4>
              <p className="text-xs text-slate-400 mt-1 max-w-xs text-center leading-relaxed">
                Select a doubt query from the left queue to view details, update the ticket status, or send replies.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
