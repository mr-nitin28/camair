'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAppStore } from '@/lib/store';
import { StatusBadge } from '@/components/ui/status-badge';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { SkeletonList, SkeletonCard } from '@/components/ui/skeleton';
import {
  MessageSquare,
  Search,
  Send,
  Users,
  User,
  ArrowLeft,
  Clock,
  Sparkles,
  CheckCircle,
} from 'lucide-react';
import Link from 'next/link';

interface MessageThreadItem {
  id: string;
  senderRole: 'Student' | 'Faculty';
  senderName: string;
  text: string;
  timestamp: string;
}

interface ConversationItem {
  id: string;
  name: string;
  type: 'Group' | 'Student';
  subtitle: string;
  unreadCount: number;
  lastMessage: string;
  lastMessageTime: string;
  messages: MessageThreadItem[];
}

const initialConversations: ConversationItem[] = [
  {
    id: 'conv-1',
    name: 'LLVM JIT Compiler Capstone Research Group',
    type: 'Group',
    subtitle: 'Project Team • Section A (4 Members)',
    unreadCount: 1,
    lastMessage: 'Sir, we pushed the intermediate AST optimization pass to GitHub.',
    lastMessageTime: '10:45 AM',
    messages: [
      {
        id: 'm1',
        senderRole: 'Faculty',
        senderName: 'Dr. Vikram Mehta',
        text: 'Team, please ensure your benchmark metrics compare bytecode execution against native gcc -O2.',
        timestamp: 'Yesterday 04:30 PM',
      },
      {
        id: 'm2',
        senderRole: 'Student',
        senderName: 'Aarav Patel (Lead)',
        text: 'Sir, we pushed the intermediate AST optimization pass to GitHub. Constant folding and dead-code elimination show a 14% latency drop.',
        timestamp: '10:45 AM',
      },
    ],
  },
  {
    id: 'conv-2',
    name: 'Aarav Patel',
    type: 'Student',
    subtitle: 'Roll: 23CSE042 • Section A',
    unreadCount: 0,
    lastMessage: 'Thank you for the guidance on Thompson construction proof.',
    lastMessageTime: 'Yesterday',
    messages: [
      {
        id: 'm3',
        senderRole: 'Student',
        senderName: 'Aarav Patel',
        text: 'Good afternoon Dr. Mehta, is it permitted to use Rust instead of C for the optional parser extension?',
        timestamp: 'Yesterday 02:15 PM',
      },
      {
        id: 'm4',
        senderRole: 'Faculty',
        senderName: 'Dr. Vikram Mehta',
        text: 'Yes Aarav, Rust is approved as long as you provide clear Cargo.toml build instructions and automated test coverage.',
        timestamp: 'Yesterday 03:00 PM',
      },
      {
        id: 'm5',
        senderRole: 'Student',
        senderName: 'Aarav Patel',
        text: 'Thank you for the guidance on Thompson construction proof.',
        timestamp: 'Yesterday 03:20 PM',
      },
    ],
  },
  {
    id: 'conv-3',
    name: 'Diya Kaur',
    type: 'Student',
    subtitle: 'Roll: 23CSE043 • Section A',
    unreadCount: 0,
    lastMessage: 'Will make sure to submit the medical verification note.',
    lastMessageTime: '2 days ago',
    messages: [
      {
        id: 'm6',
        senderRole: 'Student',
        senderName: 'Diya Kaur',
        text: 'Sir, I wanted to discuss my attendance recovery plan for Compiler Design.',
        timestamp: 'Mar 21, 11:00 AM',
      },
      {
        id: 'm7',
        senderRole: 'Faculty',
        senderName: 'Dr. Vikram Mehta',
        text: 'Please attend the Friday extra lab slot and ensure all homework submissions are cleared.',
        timestamp: 'Mar 21, 01:15 PM',
      },
    ],
  },
];

export default function CommunicationHub() {
  const [conversations, setConversations] = useState<ConversationItem[]>(initialConversations);
  const [activeConvId, setActiveConvId] = useState<string>('conv-1');
  const [inputText, setInputText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const activeConv = conversations.find((c) => c.id === activeConvId) || conversations[0];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeConv?.messages.length]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !activeConv) return;

    const newMsg: MessageThreadItem = {
      id: `msg-${Date.now()}`,
      senderRole: 'Faculty',
      senderName: 'Dr. Vikram Mehta',
      text: inputText.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setConversations((prev) =>
      prev.map((c) => {
        if (c.id === activeConv.id) {
          return {
            ...c,
            lastMessage: newMsg.text,
            lastMessageTime: 'Just now',
            messages: [...c.messages, newMsg],
          };
        }
        return c;
      })
    );

    setInputText('');
  };

  const filteredConversations = conversations.filter((c) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return c.name.toLowerCase().includes(q) || c.subtitle.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-6">
      {/* 1. PAGE HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-3xl bg-card border border-border shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground font-semibold mb-1">
            <Link href="/faculty" className="hover:text-primary flex items-center gap-1">
              <ArrowLeft className="w-3.5 h-3.5" /> Faculty Console
            </Link>
            <span>•</span>
            <span>Scoped Direct & Group Messaging</span>
          </div>
          <h1 className="text-xl md:text-2xl font-black text-foreground tracking-tight">
            Communication Hub
          </h1>
        </div>
      </div>

      {/* 2. SPLIT-PANE MESSAGING INTERFACE */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Pane: Conversations List */}
        <div className="lg:col-span-4 rounded-3xl bg-card border border-border shadow-xs overflow-hidden max-h-[720px] flex flex-col">
          <div className="p-3.5 bg-muted/50 border-b border-border space-y-2">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-card border border-border/80 text-xs text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/40"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-border/40">
            {filteredConversations.map((conv) => {
              const isSelected = activeConv.id === conv.id;
              return (
                <div
                  key={conv.id}
                  onClick={() => setActiveConvId(conv.id)}
                  className={`p-3.5 transition-colors cursor-pointer space-y-1 ${
                    isSelected
                      ? 'bg-primary/10 border-l-4 border-l-primary'
                      : 'hover:bg-muted/30'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-foreground line-clamp-1">
                      {conv.name}
                    </span>
                    <span className="text-[10px] text-muted-foreground font-mono">
                      {conv.lastMessageTime}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground line-clamp-1">
                    {conv.subtitle}
                  </p>
                  <p className="text-xs text-foreground/80 line-clamp-1 font-medium pt-0.5">
                    {conv.lastMessage}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Pane: Thread & Reply */}
        <div className="lg:col-span-8 rounded-3xl bg-card border border-border shadow-xs p-6 space-y-4 flex flex-col min-h-[580px]">
          {/* Thread Header */}
          <div className="flex items-center justify-between pb-3 border-b border-border/60">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center font-bold text-primary shrink-0 uppercase">
                {activeConv.name.split(' ').map((p) => p[0]).slice(0, 2).join('')}
              </div>
              <div>
                <h2 className="text-sm font-bold text-foreground">
                  {activeConv.name}
                </h2>
                <p className="text-xs text-muted-foreground">
                  {activeConv.subtitle}
                </p>
              </div>
            </div>
            <StatusBadge
              status="active"
              label={activeConv.type.toUpperCase()}
            />
          </div>

          {/* Messages Scroll Area */}
          <div className="flex-1 overflow-y-auto space-y-3.5 pr-1 min-h-[360px] max-h-[460px]">
            {activeConv.messages.map((msg) => {
              const isFaculty = msg.senderRole === 'Faculty';
              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isFaculty ? 'items-end' : 'items-start'}`}
                >
                  <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mb-0.5">
                    <span className="font-bold text-foreground">{msg.senderName}</span>
                    <span>•</span>
                    <span>{msg.timestamp}</span>
                  </div>
                  <div
                    className={`p-3.5 rounded-2xl max-w-lg text-xs leading-relaxed ${
                      isFaculty
                        ? 'bg-primary text-primary-foreground rounded-tr-xs shadow-xs'
                        : 'bg-muted/70 text-foreground border border-border/70 rounded-tl-xs'
                    }`}
                  >
                    <p>{msg.text}</p>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Reply Form */}
          <form onSubmit={handleSendMessage} className="pt-3 border-t border-border/60 flex items-center gap-3">
            <input
              type="text"
              placeholder={`Message ${activeConv.name}...`}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              className="flex-1 px-4 py-2.5 rounded-xl bg-muted/40 border border-border text-xs text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/40"
            />
            <button
              type="submit"
              disabled={!inputText.trim()}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold text-xs shadow-md hover:bg-primary/90 transition-all disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              <span>Send</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
