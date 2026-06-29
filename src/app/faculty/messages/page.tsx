'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAppStore } from '@/lib/store';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageSquare,
  Search,
  Send,
  Plus,
  Users,
  User,
  ArrowLeft,
  AlertCircle,
  Megaphone,
  Bell,
  Clock,
} from 'lucide-react';
import Link from 'next/link';

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string | null;
  group_id: string | null;
  content: string;
  message_type: 'Regular' | 'Announcement' | 'Alert' | 'Notice';
  created_at: string;
}

export default function CommunicationHub() {
  const { faculty } = useAppStore();
  const queryClient = useQueryClient();
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Active view states
  const [activeTab, setActiveTab] = useState<'groups' | 'direct'>('groups');
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [messageText, setMessageText] = useState('');
  const [messageType, setMessageType] = useState<'Regular' | 'Announcement' | 'Alert' | 'Notice'>('Regular');
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch student groups managed by this faculty
  const { data: groups } = useQuery({
    queryKey: ['faculty-groups-messages', faculty?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('student_groups')
        .select('*')
        .eq('faculty_id', faculty?.id)
        .order('name', { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!faculty,
  });

  // Fetch all students (to populate direct messages & resolve names)
  const { data: students } = useQuery({
    queryKey: ['all-students-messages'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .order('first_name', { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  // Set default group selection on load
  useEffect(() => {
    if (groups && groups.length > 0 && !selectedGroupId && !selectedStudentId) {
      setSelectedGroupId(groups[0].id);
    }
  }, [groups, selectedGroupId, selectedStudentId]);

  // Fetch messages for the selected group or direct chat
  const { data: messages } = useQuery({
    queryKey: ['chat-messages', selectedGroupId, selectedStudentId, faculty?.id],
    queryFn: async () => {
      if (selectedGroupId) {
        // Fetch group messages
        const { data, error } = await supabase
          .from('messages')
          .select('*')
          .eq('group_id', selectedGroupId)
          .order('created_at', { ascending: true });
        if (error) throw error;
        return data as Message[];
      } else if (selectedStudentId && faculty?.id) {
        // Fetch direct messages (sent by faculty to student or vice-versa)
        const { data, error } = await supabase
          .from('messages')
          .select('*')
          .or(
            `and(sender_id.eq.${faculty.id},receiver_id.eq.${selectedStudentId}),and(sender_id.eq.${selectedStudentId},receiver_id.eq.${faculty.id})`
          )
          .order('created_at', { ascending: true });
        if (error) throw error;
        return data as Message[];
      }
      return [];
    },
    enabled: !!faculty && (!!selectedGroupId || !!selectedStudentId),
    refetchInterval: 3000, // Poll every 3 seconds for active chat real-time experience
  });

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async () => {
      if (!faculty || !messageText.trim()) return;

      const payload: Partial<Message> = {
        sender_id: faculty.id,
        content: messageText.trim(),
        message_type: messageType,
      };

      if (selectedGroupId) {
        payload.group_id = selectedGroupId;
        payload.receiver_id = null;
      } else if (selectedStudentId) {
        payload.receiver_id = selectedStudentId;
        payload.group_id = null;
      } else {
        return;
      }

      const { error } = await supabase.from('messages').insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      setMessageText('');
      setMessageType('Regular');
      queryClient.invalidateQueries({
        queryKey: ['chat-messages', selectedGroupId, selectedStudentId, faculty?.id],
      });
    },
  });

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim() || sendMessageMutation.isPending) return;
    sendMessageMutation.mutate();
  };

  // Helper to resolve sender names
  const getSenderDetails = (senderId: string) => {
    if (senderId === faculty?.id) {
      return {
        name: `Dr. ${faculty.first_name} ${faculty.last_name} (You)`,
        avatarInitials: `${faculty.first_name[0]}${faculty.last_name[0]}`,
        role: 'Faculty',
        color: 'bg-blue-600 text-white',
      };
    }
    const student = students?.find((s) => s.id === senderId);
    if (student) {
      return {
        name: `${student.first_name} ${student.last_name}`,
        avatarInitials: `${student.first_name[0]}${student.last_name[0]}`,
        role: 'Student',
        color: 'bg-slate-200 text-slate-800',
      };
    }
    return {
      name: 'System / Guest',
      avatarInitials: 'SY',
      role: 'Unknown',
      color: 'bg-slate-100 text-slate-500',
    };
  };

  // Filtered lists
  const filteredGroups = groups?.filter((g) =>
    g.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredStudents = students?.filter((s) =>
    `${s.first_name} ${s.last_name}`.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const activeChatTitle = selectedGroupId
    ? groups?.find((g) => g.id === selectedGroupId)?.name
    : selectedStudentId
    ? (() => {
        const s = students?.find((st) => st.id === selectedStudentId);
        return s ? `${s.first_name} ${s.last_name}` : 'Direct Chat';
      })()
    : 'Select a Chat';

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
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">Communication Hub</h2>
        <p className="text-slate-500 text-xs mt-1">
          Broadcast announcements, discuss tasks in group channels, or chat privately with students.
        </p>
      </div>

      {/* Main Workspace Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden h-[75vh]">
        {/* Left Panel: Chat Selector */}
        <div className="lg:col-span-1 border-r border-slate-200 flex flex-col h-full bg-slate-50/50">
          {/* Tabs */}
          <div className="flex border-b border-slate-200">
            <button
              onClick={() => {
                setActiveTab('groups');
                setSelectedStudentId(null);
                if (groups && groups.length > 0) setSelectedGroupId(groups[0].id);
              }}
              className={`flex-1 py-3 text-xs font-semibold border-b-2 transition ${
                activeTab === 'groups'
                  ? 'border-blue-600 text-blue-600 bg-white'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              Group Channels
            </button>
            <button
              onClick={() => {
                setActiveTab('direct');
                setSelectedGroupId(null);
                if (students && students.length > 0) setSelectedStudentId(students[0].id);
              }}
              className={`flex-1 py-3 text-xs font-semibold border-b-2 transition ${
                activeTab === 'direct'
                  ? 'border-blue-600 text-blue-600 bg-white'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              Direct Chats
            </button>
          </div>

          {/* Search bar */}
          <div className="p-3 border-b border-slate-200 bg-white">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                placeholder={activeTab === 'groups' ? 'Search groups...' : 'Search students...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-100 border-transparent rounded-lg py-1.5 pl-9 pr-3 text-xs focus:outline-none focus:bg-white focus:border-slate-300 border transition"
              />
            </div>
          </div>

          {/* Lists */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {activeTab === 'groups' ? (
              filteredGroups && filteredGroups.length > 0 ? (
                filteredGroups.map((g) => (
                  <button
                    key={g.id}
                    onClick={() => {
                      setSelectedGroupId(g.id);
                      setSelectedStudentId(null);
                    }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left text-xs font-medium transition ${
                      selectedGroupId === g.id
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <Users className={`w-4 h-4 ${selectedGroupId === g.id ? 'text-white' : 'text-slate-400'}`} />
                    <div className="truncate">
                      <span className="block font-bold">{g.name}</span>
                      <span className={`text-[10px] truncate block ${selectedGroupId === g.id ? 'text-blue-200' : 'text-slate-400'}`}>
                        {g.category} Group
                      </span>
                    </div>
                  </button>
                ))
              ) : (
                <div className="text-center py-8 text-slate-400 text-xs">No groups found</div>
              )
            ) : (
              filteredStudents && filteredStudents.length > 0 ? (
                filteredStudents.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => {
                      setSelectedStudentId(s.id);
                      setSelectedGroupId(null);
                    }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left text-xs font-medium transition ${
                      selectedStudentId === s.id
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-[10px] shrink-0 ${
                      selectedStudentId === s.id ? 'bg-blue-800 text-white' : 'bg-slate-200 text-slate-700'
                    }`}>
                      {s.first_name[0]}{s.last_name[0]}
                    </div>
                    <div className="truncate">
                      <span className="block font-bold">{s.first_name} {s.last_name}</span>
                      <span className={`text-[9px] block font-mono ${selectedStudentId === s.id ? 'text-blue-200' : 'text-slate-400'}`}>
                        {s.student_id}
                      </span>
                    </div>
                  </button>
                ))
              ) : (
                <div className="text-center py-8 text-slate-400 text-xs">No students found</div>
              )
            )}
          </div>
        </div>

        {/* Right Panel: Active Chat Box */}
        <div className="lg:col-span-3 flex flex-col h-full bg-slate-50/20">
          {selectedGroupId || selectedStudentId ? (
            <>
              {/* Chat Header */}
              <div className="px-6 py-4 bg-white border-b border-slate-200 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-semibold">
                    {selectedGroupId ? <Users className="w-4.5 h-4.5" /> : <User className="w-4.5 h-4.5" />}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">{activeChatTitle}</h3>
                    <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                      {selectedGroupId ? 'Collaborative Channel' : 'Secure Private Room'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Chat Messages */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {messages && messages.length > 0 ? (
                  messages.map((msg) => {
                    const sender = getSenderDetails(msg.sender_id);
                    const isSelf = msg.sender_id === faculty?.id;

                    return (
                      <div
                        key={msg.id}
                        className={`flex gap-3 max-w-[75%] ${isSelf ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}
                      >
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${sender.color}`}>
                          {sender.avatarInitials}
                        </div>
                        <div className="space-y-1">
                          <div className={`flex items-center gap-2 ${isSelf ? 'justify-end' : ''}`}>
                            <span className="text-[10px] font-bold text-slate-700">{sender.name}</span>
                            <span className="text-[9px] text-slate-400 font-mono">
                              {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <div className={`p-3.5 rounded-2xl text-xs leading-relaxed ${
                            isSelf
                              ? 'bg-blue-600 text-white rounded-tr-none'
                              : 'bg-white border border-slate-200 text-slate-800 rounded-tl-none shadow-sm'
                          }`}>
                            {msg.message_type !== 'Regular' && (
                              <div className="flex items-center gap-1.5 mb-1.5 font-bold uppercase text-[9px] tracking-wider">
                                {msg.message_type === 'Alert' ? (
                                  <span className="bg-red-500 text-white px-1.5 py-0.5 rounded flex items-center gap-0.5">
                                    <AlertCircle className="w-2.5 h-2.5" /> ALERT
                                  </span>
                                ) : msg.message_type === 'Announcement' ? (
                                  <span className="bg-amber-500 text-white px-1.5 py-0.5 rounded flex items-center gap-0.5">
                                    <Megaphone className="w-2.5 h-2.5" /> ANNOUNCEMENT
                                  </span>
                                ) : (
                                  <span className="bg-purple-500 text-white px-1.5 py-0.5 rounded flex items-center gap-0.5">
                                    <Bell className="w-2.5 h-2.5" /> NOTICE
                                  </span>
                                )}
                              </div>
                            )}
                            <p className="whitespace-pre-line">{msg.content}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center text-slate-400">
                    <MessageSquare className="w-10 h-10 text-slate-300 stroke-[1.5] mb-2 animate-bounce" />
                    <p className="text-xs font-semibold">No messages yet.</p>
                    <p className="text-[10px] mt-1">Send a message to open the conversation.</p>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Chat Input */}
              <form onSubmit={handleSend} className="p-4 bg-white border-t border-slate-200">
                <div className="flex gap-2 mb-3">
                  {(['Regular', 'Announcement', 'Alert', 'Notice'] as const).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setMessageType(type)}
                      className={`text-[9px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border transition ${
                        messageType === type
                          ? type === 'Alert'
                            ? 'bg-red-50 border-red-200 text-red-700 font-extrabold'
                            : type === 'Announcement'
                            ? 'bg-amber-50 border-amber-200 text-amber-700 font-extrabold'
                            : type === 'Notice'
                            ? 'bg-purple-50 border-purple-200 text-purple-700 font-extrabold'
                            : 'bg-blue-50 border-blue-200 text-blue-700 font-extrabold'
                          : 'bg-slate-50 border-slate-100 text-slate-400 hover:bg-slate-100'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <textarea
                    rows={1}
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSend(e);
                      }
                    }}
                    placeholder="Type your message... (Press Enter to send)"
                    className="flex-grow bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs focus:outline-none focus:border-blue-500 focus:bg-white resize-none max-h-20"
                  />
                  <button
                    type="submit"
                    disabled={!messageText.trim() || sendMessageMutation.isPending}
                    className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-4 flex items-center justify-center transition disabled:opacity-50 shrink-0 self-end h-9"
                  >
                    {sendMessageMutation.isPending ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </form>
            </>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-400">
              <MessageSquare className="w-12 h-12 text-slate-300 stroke-[1.5] mb-3" />
              <h4 className="text-sm font-bold text-slate-900">No Chat Selected</h4>
              <p className="text-xs text-slate-400 max-w-xs mt-1 text-center">
                Select a group channel or student direct chat from the sidebar to start communicating.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
