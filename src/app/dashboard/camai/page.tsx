'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAppStore, type StudentProfile } from '@/lib/store';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  FileText,
  Megaphone,
  Calendar,
  Send,
  Search,
  Download,
  Bookmark,
  MapPin,
  Clock,
  CheckCircle,
  AlertCircle,
  Loader2,
  ArrowLeft,
  ChevronRight,
  BookmarkCheck,
  User,
  GraduationCap,
  Bell,
  RefreshCw,
  Plus,
  CreditCard,
  Award
} from 'lucide-react';
import Link from 'next/link';

// --- MOCK DATA ---
const mockSubjects = [
  { id: 'sub-cd', code: 'CS-601', name: 'Compiler Design' },
  { id: 'sub-cn', code: 'CS-602', name: 'Computer Networks' },
  { id: 'sub-se', code: 'CS-603', name: 'Software Engineering' },
  { id: 'sub-ai', code: 'CS-604', name: 'Artificial Intelligence' },
  { id: 'sub-wt', code: 'CS-605', name: 'Web Technologies' },
];

const mockNotes = [
  {
    id: 'n1',
    title: 'Compiler Design: Lexical Analyzer & DFA minimization',
    description: 'Detailed lecture notes covering finite automata construction, subset construction algorithm, and direct transition table minimized state tables.',
    file_type: 'PDF Slide Deck',
    file_name: 'Lexical_Analysis_CS601.pdf',
    subject_id: 'sub-cd',
    created_at: new Date(Date.now() - 3600000 * 24 * 2).toISOString(),
    subjects: mockSubjects[0],
  },
  {
    id: 'n2',
    title: 'Computer Networks: IPv6 Header and Routing Protocols',
    description: 'Comprehensive guidelines detailing OSPF, RIP link state routing vs distance vector algorithms, and IPv4 to IPv6 translation headers.',
    file_type: 'Handout Pack',
    file_name: 'Routing_OSPF_Protocols.pdf',
    subject_id: 'sub-cn',
    created_at: new Date(Date.now() - 3600000 * 24 * 5).toISOString(),
    subjects: mockSubjects[1],
  },
  {
    id: 'n3',
    title: 'Software Engineering: Agile Sprint Management Templates',
    description: 'Practical workbook slides for drafting Sprint Backlogs, planning velocity metrics, and user story mapping criteria for Capstone evaluations.',
    file_type: 'Word Doc',
    file_name: 'Agile_Sprint_Workbook.docx',
    subject_id: 'sub-se',
    created_at: new Date(Date.now() - 3600000 * 24 * 7).toISOString(),
    subjects: mockSubjects[2],
  },
  {
    id: 'n4',
    title: 'Artificial Intelligence: Heuristic Search & A* Proofs',
    description: 'A complete study guide covering A* admissibility proofs, heuristic admissibility vs consistency, and adversarial Minimax alpha-beta pruning trees.',
    file_type: 'PDF Booklet',
    file_name: 'Admissible_Heuristics_AI.pdf',
    subject_id: 'sub-ai',
    created_at: new Date(Date.now() - 3600000 * 24 * 10).toISOString(),
    subjects: mockSubjects[3],
  },
  {
    id: 'n5',
    title: 'Web Technologies: Next.js Server Actions & RLS Integration',
    description: 'Technical draft detailing Next.js app route fetch optimization, Supabase RLS schema validation, and middleware edge route performance benchmarks.',
    file_type: 'Technical Guide',
    file_name: 'Nextjs_Supabase_State.pdf',
    subject_id: 'sub-wt',
    created_at: new Date(Date.now() - 3600000 * 24 * 12).toISOString(),
    subjects: mockSubjects[4],
  },
];

const mockAnnouncements = [
  {
    id: 'a1',
    title: 'Mid-Semester Internal Evaluation Schedule',
    content: 'The detailed datesheet for Semester 6 Mid-Term internal examinations is now uploaded. Attendance is strictly compulsory. Contact your department coordinator for details.',
    priority: 'Critical',
    category: 'Examination',
    created_at: new Date(Date.now() - 3600000 * 4).toISOString(),
  },
  {
    id: 'a2',
    title: 'Annual Campus Hackathon - Hackfest 2026',
    content: 'Registration is now open for Hackfest 2026. Cash prizes worth ₹2,50,000 up for grabs. Mentorship from senior engineering staff. Registrations close on June 28th.',
    priority: 'High',
    category: 'Department',
    created_at: new Date(Date.now() - 3600000 * 20).toISOString(),
  },
  {
    id: 'a3',
    title: 'Fee Payment Deadline Extension',
    content: 'The deadline for clearing Semester 6 academic fee dues has been extended till June 30th without any late penalty charges. Please check your ledger for pending invoices.',
    priority: 'Normal',
    category: 'Institution',
    created_at: new Date(Date.now() - 3600000 * 48).toISOString(),
  },
  {
    id: 'a4',
    title: 'Campus Placement Prep Boot Camp',
    content: 'A mock aptitude drill and technical interview preparation workshop is scheduled in the main auditorium this Thursday from 10:00 AM onwards. Recommended for all Pre-final year students.',
    priority: 'High',
    category: 'Institution',
    created_at: new Date(Date.now() - 3600000 * 72).toISOString(),
  },
  {
    id: 'a5',
    title: 'Central Library Stock Audit Closure',
    content: 'The central library will remain closed for book inventory verification from June 24th to June 26th. Book checkouts are temporarily suspended.',
    priority: 'Normal',
    category: 'Institution',
    created_at: new Date(Date.now() - 3600000 * 96).toISOString(),
  },
];

const mockActivities = [
  {
    id: 'ac1',
    title: 'Decentralized AI & Web3 Hackfest 2026',
    description: 'A 36-hour cohort hackathon focusing on AI agents, zero-knowledge proofs, and decentralized compute protocols. Cash pool worth ₹2,50,000.',
    event_type: 'Hackathon',
    venue: 'Seminar Hall 3',
    start_date: new Date(Date.now() + 3600000 * 48).toISOString(),
    end_date: new Date(Date.now() + 3600000 * 84).toISOString(),
    registration_deadline: new Date(Date.now() + 3600000 * 24).toISOString(),
  },
  {
    id: 'ac2',
    title: 'Cloud Native Kubernetes Boot Camp',
    description: 'Learn deployment patterns, service mesh integration, microservices orchestration, and building scalable serverless infrastructures.',
    event_type: 'Workshop',
    venue: 'Block B Lab 6',
    start_date: new Date(Date.now() + 3600000 * 120).toISOString(),
    end_date: new Date(Date.now() + 3600000 * 126).toISOString(),
    registration_deadline: new Date(Date.now() + 3600000 * 96).toISOString(),
  },
  {
    id: 'ac3',
    title: 'Campus Placement & Aptitude Drills',
    description: 'Comprehensive guidelines detailing analytical problem solving, programming mock rounds, and corporate HR presentation skills.',
    event_type: 'Seminar',
    venue: 'Main Auditorium',
    start_date: new Date(Date.now() - 3600000 * 2).toISOString(),
    end_date: new Date(Date.now() - 3600000 * 1).toISOString(),
    registration_deadline: new Date(Date.now() - 3600000 * 12).toISOString(),
  },
];

// --- WORKSPACE FEATURE TABS (top navigation) ---
// Each tab maps to exactly one feature panel; gradients preserve per-feature identity.
const WORKSPACE_TABS = [
  { id: 'ai', label: 'CamAI Helper', icon: Sparkles, gradient: 'from-violet-500 to-indigo-600', meta: 'Online', online: true },
  { id: 'notes', label: 'Study Notes Hub', icon: FileText, gradient: 'from-amber-500 to-orange-600', meta: 'Resources', online: false },
  { id: 'announcements', label: 'Official Notices', icon: Megaphone, gradient: 'from-rose-500 to-red-600', meta: 'Broadcasts', online: false },
  { id: 'activities', label: 'Campus Events', icon: Calendar, gradient: 'from-emerald-500 to-teal-600', meta: 'Live', online: false },
] as const;

// --- AI RESPONSES GENERATOR ---
const getAIResponse = (userPrompt: string, student: StudentProfile | null): { text: string; dataCard?: any } => {
  const prompt = userPrompt.toLowerCase();
  
  if (prompt.includes('cgpa') || prompt.includes('sgpa') || prompt.includes('grade') || prompt.includes('mark') || prompt.includes('gpa')) {
    return {
      text: `Sure! Here is a summary of your academic grades and performance as recorded in the portal:`,
      dataCard: {
        type: 'grades',
        title: 'Academic Scorecard',
        fields: [
          { label: 'Cumulative GPA (CGPA)', value: student?.cgpa ? `${student.cgpa} / 10.0` : '8.72 / 10.0' },
          { label: 'Latest Semester GPA (SGPA)', value: student?.sgpa ? `${student.sgpa} / 10.0` : '8.94 / 10.0' },
          { label: 'Current Semester', value: `Semester ${student?.semesters?.number || 6}` },
          { label: 'Academic Standing', value: 'First Class with Distinction' },
        ]
      }
    };
  }

  if (prompt.includes('leave') || prompt.includes('absent') || prompt.includes('holiday')) {
    return {
      text: `Your current leave applications and their real-time approval status:`,
      dataCard: {
        type: 'leaves',
        title: 'Leave Requests Ledger',
        items: [
          { type: 'Medical Leave', dates: '2026-06-25 (1 Day)', status: 'Approved', reason: 'Fever checkup' },
          { type: 'Casual Leave', dates: '2026-07-02 to 2026-07-03', status: 'Pending', reason: 'Family function' }
        ]
      }
    };
  }

  if (prompt.includes('fee') || prompt.includes('pay') || prompt.includes('ledger') || prompt.includes('due') || prompt.includes('invoice')) {
    return {
      text: `Here is the current state of your financial ledger and outstanding fee invoices:`,
      dataCard: {
        type: 'fees',
        title: 'Financial Balance',
        fields: [
          { label: 'Academic Fee (Sem 6)', value: '₹95,000 (Paid)', status: 'Paid' },
          { label: 'Exam Fees (Sem 6)', value: '₹2,500 (Paid)', status: 'Paid' },
          { label: 'Library Fine Dues', value: '₹120 (Pending)', status: 'Pending' },
          { label: 'Total Pending Dues', value: '₹120', status: 'Pending' }
        ]
      }
    };
  }

  if (prompt.includes('exam') || prompt.includes('schedule') || prompt.includes('date') || prompt.includes('test')) {
    return {
      text: `Here is the schedule for your upcoming mid-semester internal assessments:`,
      dataCard: {
        type: 'exams',
        title: 'Mid-Sem Assessments Schedule',
        items: [
          { subject: 'Compiler Design', date: 'July 5th, 10:00 AM', venue: 'LH-101' },
          { subject: 'Computer Networks', date: 'July 6th, 10:00 AM', venue: 'LH-102' },
          { subject: 'Artificial Intelligence', date: 'July 7th, 02:00 PM', venue: 'LH-101' },
        ]
      }
    };
  }

  if (prompt.includes('hi') || prompt.includes('hello') || prompt.includes('hey') || prompt.includes('help') || prompt.includes('start')) {
    return {
      text: `Hello ${student?.first_name || 'Aarav'}! I am **CamAI**, your virtual campus assistant. I can help you with:\n\n* **Academic Performance** (CGPA, SGPA, grades)\n* **Exams** (Dates, schedules, venue details)\n* **Leaves & Attendance** (Approval statuses)\n* **Fee Status** (Invoices and outstanding dues)\n\nTry clicking one of the quick prompt buttons below or ask me any question directly!`
    };
  }

  return {
    text: `I've analyzed your query regarding "${userPrompt}". \n\nAs a mock assistant for CampusOS, I can query database endpoints for grades, leaves, and financial ledgers. Try typing one of the keywords like **CGPA, Exams, Leave, or Fees** to see interactive data cards!`,
  };
};

interface Message {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: Date;
  dataCard?: any;
}

export default function CamAIPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { student } = useAppStore();

  const initialChat = searchParams.get('chat') || 'ai';
  const [activeChat, setActiveChat] = useState<string>(initialChat);
  // Track which feature tabs the user has opened so notification badges clear once seen.
  const [seenTabs, setSeenTabs] = useState<Record<string, boolean>>({ [initialChat]: true });

  // States for Notes Chat
  const [searchNotes, setSearchNotes] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('All');
  const [bookmarkedNotes, setBookmarkedNotes] = useState<Record<string, boolean>>({});
  const [downloadAlert, setDownloadAlert] = useState<string | null>(null);

  // States for Notices Chat
  const [searchNotices, setSearchNotices] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  // States for Events Chat
  const [registeredEvents, setRegisteredEvents] = useState<Record<string, boolean>>({});
  const [rsvpLoadingId, setRsvpLoadingId] = useState<string | null>(null);

  // States for AI Chat
  const [aiInput, setAiInput] = useState('');
  const [aiMessages, setAiMessages] = useState<Message[]>([
    {
      id: 'welcome',
      sender: 'ai',
      text: `Hello Aarav! I am **CamAI**, your virtual campus assistant. I can help you retrieve grades, leave status, fee details, and exam timetables. How can I help you today?`,
      timestamp: new Date(Date.now() - 60000),
    }
  ]);
  const [isTyping, setIsTyping] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedBookmarks = localStorage.getItem('camai_bookmarked_notes');
      if (storedBookmarks) {
        try {
          setBookmarkedNotes(JSON.parse(storedBookmarks));
        } catch (e) {
          console.error(e);
        }
      }

      const storedEvents = localStorage.getItem('camai_registered_events');
      if (storedEvents) {
        try {
          setRegisteredEvents(JSON.parse(storedEvents));
        } catch (e) {
          console.error(e);
        }
      } else {
        const defaultEvents = { 'ac3': true };
        setRegisteredEvents(defaultEvents);
        localStorage.setItem('camai_registered_events', JSON.stringify(defaultEvents));
      }

      const storedAiMessages = localStorage.getItem('camai_ai_messages');
      if (storedAiMessages) {
        try {
          const parsed = JSON.parse(storedAiMessages);
          const formatted = parsed.map((m: any) => ({
            ...m,
            timestamp: new Date(m.timestamp)
          }));
          setAiMessages(formatted);
        } catch (e) {
          console.error(e);
        }
      }
    }
  }, []);

  // Sync active chat tab with query param changes
  useEffect(() => {
    const chatParam = searchParams.get('chat');
    if (chatParam) {
      setActiveChat(chatParam);
      setSeenTabs((prev) => ({ ...prev, [chatParam]: true }));
    }
  }, [searchParams]);

  // Scroll to bottom of AI chat when new messages arrive
  useEffect(() => {
    if (activeChat === 'ai') {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [aiMessages, activeChat, isTyping]);

  // --- ACTIONS ---
  const handleSendAiMessage = (textToSend?: string) => {
    const text = textToSend || aiInput;
    if (!text.trim()) return;

    // Add user message
    const userMsg: Message = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text,
      timestamp: new Date(),
    };
    
    setAiMessages(prev => {
      const updated = [...prev, userMsg];
      localStorage.setItem('camai_ai_messages', JSON.stringify(updated));
      return updated;
    });
    if (!textToSend) setAiInput('');

    // Trigger typing and response
    setIsTyping(true);
    setTimeout(() => {
      const response = getAIResponse(text, student);
      const aiMsg: Message = {
        id: `ai-${Date.now()}`,
        sender: 'ai',
        text: response.text,
        timestamp: new Date(),
        dataCard: response.dataCard,
      };
      setAiMessages(prev => {
        const updated = [...prev, aiMsg];
        localStorage.setItem('camai_ai_messages', JSON.stringify(updated));
        return updated;
      });
      setIsTyping(false);
    }, 1000);
  };

  const handleDownloadFile = (fileName: string) => {
    setDownloadAlert(fileName);
    setTimeout(() => {
      setDownloadAlert(null);
    }, 3000);
  };

  const toggleBookmark = (id: string) => {
    setBookmarkedNotes(prev => {
      const updated = {
        ...prev,
        [id]: !prev[id]
      };
      localStorage.setItem('camai_bookmarked_notes', JSON.stringify(updated));
      return updated;
    });
  };

  const handleRegisterEvent = (eventId: string) => {
    setRsvpLoadingId(eventId);
    setTimeout(() => {
      setRegisteredEvents(prev => {
        const updated = {
          ...prev,
          [eventId]: !prev[eventId]
        };
        localStorage.setItem('camai_registered_events', JSON.stringify(updated));
        return updated;
      });
      setRsvpLoadingId(null);
    }, 800);
  };

  // Switch the active feature tab, mark it seen (clears its badge), and sync the URL.
  const switchTab = (id: string) => {
    setActiveChat(id);
    setSeenTabs((prev) => ({ ...prev, [id]: true }));
    router.replace(`/dashboard/camai?chat=${id}`);
  };

  // --- NOTIFICATION BADGE COUNTS (derived from mock data) ---
  const tabBadges = useMemo<Record<string, number>>(
    () => ({
      ai: 0,
      notes: mockNotes.filter(
        (n) => Date.now() - new Date(n.created_at).getTime() < 1000 * 60 * 60 * 24 * 3
      ).length,
      announcements: mockAnnouncements.filter((a) => a.priority === 'Critical').length,
      activities: mockActivities.filter((a) => new Date(a.start_date).getTime() > Date.now()).length,
    }),
    []
  );

  // --- FILTERED DATA COMPUTATIONS ---
  const filteredNotesList = useMemo(() => {
    return mockNotes.filter(note => {
      const matchesSearch = note.title.toLowerCase().includes(searchNotes.toLowerCase()) ||
                            note.description.toLowerCase().includes(searchNotes.toLowerCase());
      const matchesSubject = selectedSubject === 'All' || note.subject_id === selectedSubject;
      return matchesSearch && matchesSubject;
    });
  }, [searchNotes, selectedSubject]);

  const filteredNoticesList = useMemo(() => {
    return mockAnnouncements.filter(notice => {
      const matchesSearch = notice.title.toLowerCase().includes(searchNotices.toLowerCase()) ||
                            notice.content.toLowerCase().includes(searchNotices.toLowerCase());
      const matchesCategory = selectedCategory === 'All' || notice.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [searchNotices, selectedCategory]);

  return (
    <div className="flex flex-col flex-1 h-full w-full bg-emerald-50/30 overflow-hidden relative">
      {/* Download Indicator Pop-up */}
      <AnimatePresence>
        {downloadAlert && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-white border border-slate-200 shadow-xl px-4 py-2.5 rounded-2xl flex items-center gap-2.5 text-xs text-slate-800 font-bold"
          >
            <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
            <span>Downloading {downloadAlert}...</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- TOP WORKSPACE BAR (tabs only) --- */}
      <div className="bg-white border-b border-slate-200 shrink-0">
        {/* Feature tab strip — one feature visible at a time */}
        <div
          role="tablist"
          aria-label="CamAI workspace features"
          className="px-4 sm:px-6 py-4 flex gap-1.5 sm:gap-2 overflow-x-auto custom-scrollbar scroll-smooth"
        >
          {WORKSPACE_TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeChat === tab.id;
            const showBadge = tabBadges[tab.id] > 0 && !seenTabs[tab.id];
            return (
              <button
                key={tab.id}
                role="tab"
                aria-selected={isActive}
                onClick={() => switchTab(tab.id)}
                className={`relative shrink-0 flex items-center gap-2.5 pl-2 pr-3 sm:pr-4 py-2 rounded-2xl transition-colors ${
                  isActive ? 'text-slate-900' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                }`}
              >
                {/* Animated active background pill */}
                {isActive && (
                  <motion.span
                    layoutId="camaiActiveTab"
                    transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                    className="absolute inset-0 bg-indigo-50/70 border border-indigo-100 rounded-2xl shadow-sm"
                  />
                )}

                {/* Gradient icon chip with status + badge */}
                <span className={`relative z-10 w-9 h-9 rounded-xl bg-gradient-to-br ${tab.gradient} flex items-center justify-center text-white shrink-0 shadow-sm`}>
                  <Icon className="w-4.5 h-4.5 text-white" />
                  {tab.online && (
                    <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-white" />
                  )}
                  {showBadge && (
                    <span className="absolute -top-1.5 -right-1.5 min-w-4 h-4 px-1 bg-rose-600 rounded-full flex items-center justify-center text-[9px] font-black text-white border border-white font-mono">
                      {tabBadges[tab.id]}
                    </span>
                  )}
                </span>

                {/* Label + meta (hidden on very small screens) */}
                <span className="relative z-10 hidden sm:flex flex-col items-start leading-tight">
                  <span className="text-xs font-bold whitespace-nowrap">{tab.label}</span>
                  <span className={`text-[9px] font-bold font-mono uppercase tracking-wide ${isActive ? 'text-indigo-600' : 'text-slate-400'}`}>
                    {tab.meta}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* --- FEATURE CONTENT AREA (single feature at a time) --- */}
      <div className="flex-1 relative overflow-hidden bg-emerald-50/30">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeChat}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="absolute inset-0 flex flex-col"
          >
        {/* 1. ACTIVE CHAT - AI ASSISTANT */}
        {activeChat === 'ai' && (
          <>
            {/* Message Stream */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {aiMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[70%] flex gap-2.5 items-start ${msg.sender === 'user' ? 'flex-row-reverse' : ''}`}>
                    {/* Avatar */}
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold ${
                      msg.sender === 'user' 
                        ? 'bg-slate-200 text-slate-700' 
                        : 'bg-indigo-600/10 text-indigo-700'
                    }`}>
                      {msg.sender === 'user' ? 'AS' : 'AI'}
                    </div>

                    {/* Bubble */}
                    <div className="space-y-2">
                      <div className={`p-4 rounded-3xl text-xs font-semibold leading-relaxed shadow-sm ${
                        msg.sender === 'user'
                          ? 'bg-indigo-600 text-white rounded-tr-none'
                          : 'bg-white border border-slate-200 text-slate-800 rounded-tl-none'
                      }`}>
                        {msg.text.split('\n').map((line, idx) => (
                          <p key={idx} className={idx > 0 ? 'mt-1.5' : ''}>{line}</p>
                        ))}
                      </div>

                      {/* Dynamic structured card if provided */}
                      {msg.dataCard && (
                        <div className="bg-white border border-slate-200 rounded-3xl p-4 shadow-sm w-80 animate-fadeIn">
                          <h4 className="text-xs font-bold text-slate-900 border-b border-slate-100 pb-2 mb-3 flex items-center gap-1.5">
                            {msg.dataCard.type === 'grades' && <GraduationCap className="w-4 h-4 text-indigo-600" />}
                            {msg.dataCard.type === 'leaves' && <Calendar className="w-4 h-4 text-amber-600" />}
                            {msg.dataCard.type === 'fees' && <CreditCardIcon className="w-4 h-4 text-emerald-600" />}
                            {msg.dataCard.type === 'exams' && <AwardIcon className="w-4 h-4 text-rose-600" />}
                            {msg.dataCard.title}
                          </h4>

                          {/* Render grade card */}
                          {msg.dataCard.type === 'grades' && (
                            <div className="space-y-2.5">
                              {msg.dataCard.fields.map((f: any, i: number) => (
                                <div key={i} className="flex justify-between items-center text-[11px] font-semibold border-b border-slate-50 pb-1.5">
                                  <span className="text-slate-500">{f.label}</span>
                                  <span className="text-slate-900 font-bold">{f.value}</span>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Render leave ledger */}
                          {msg.dataCard.type === 'leaves' && (
                            <div className="space-y-2">
                              {msg.dataCard.items.map((item: any, i: number) => (
                                <div key={i} className="p-2 border border-slate-100 bg-slate-50 rounded-xl flex items-center justify-between text-[10.5px]">
                                  <div>
                                    <span className="font-bold text-slate-800 block">{item.type}</span>
                                    <span className="text-slate-500 text-[9.5px] block font-mono mt-0.5">{item.dates}</span>
                                  </div>
                                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase ${
                                    item.status === 'Approved' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                                  }`}>
                                    {item.status}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Render fees ledger */}
                          {msg.dataCard.type === 'fees' && (
                            <div className="space-y-2.5">
                              {msg.dataCard.fields.map((f: any, i: number) => (
                                <div key={i} className="flex justify-between items-center text-[11px] font-semibold border-b border-slate-50 pb-1.5">
                                  <span className="text-slate-500">{f.label}</span>
                                  <span className={`font-bold ${f.status === 'Paid' ? 'text-emerald-700' : 'text-slate-900'}`}>{f.value}</span>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Render exam schedule */}
                          {msg.dataCard.type === 'exams' && (
                            <div className="space-y-2">
                              {msg.dataCard.items.map((item: any, i: number) => (
                                <div key={i} className="p-2 border border-slate-100 bg-slate-50 rounded-xl text-[10.5px]">
                                  <span className="font-bold text-slate-800 block">{item.subject}</span>
                                  <div className="flex items-center justify-between mt-1 text-slate-500 text-[9.5px] font-mono">
                                    <span>{item.date}</span>
                                    <span>{item.venue}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      <span className="text-[9px] text-slate-400 font-mono font-bold block mt-1">
                        {msg.timestamp.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                </div>
              ))}

              {isTyping && (
                <div className="flex justify-start">
                  <div className="flex gap-2.5 items-center">
                    <div className="w-8 h-8 rounded-lg bg-indigo-600/10 text-indigo-700 flex items-center justify-center text-xs font-bold">
                      AI
                    </div>
                    <div className="bg-white border border-slate-200 py-3 px-4 rounded-3xl rounded-tl-none shadow-sm flex items-center gap-1">
                      <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Quick Actions & Input bar */}
            <div className="p-4 bg-white border-t border-slate-200 shrink-0 flex flex-col gap-3">
              {/* Context chips */}
              <div className="flex gap-2 overflow-x-auto pb-1 scroll-smooth">
                <button
                  onClick={() => handleSendAiMessage('Check my CGPA and SGPA')}
                  className="bg-slate-50 hover:bg-slate-100 border border-slate-200/80 px-3.5 py-1.5 rounded-full text-[10.5px] font-bold text-slate-600 shrink-0 transition"
                >
                  📊 Check Grades
                </button>
                <button
                  onClick={() => handleSendAiMessage('What is my leave status?')}
                  className="bg-slate-50 hover:bg-slate-100 border border-slate-200/80 px-3.5 py-1.5 rounded-full text-[10.5px] font-bold text-slate-600 shrink-0 transition"
                >
                  📅 Leave Status
                </button>
                <button
                  onClick={() => handleSendAiMessage('Do I have outstanding fees?')}
                  className="bg-slate-50 hover:bg-slate-100 border border-slate-200/80 px-3.5 py-1.5 rounded-full text-[10.5px] font-bold text-slate-600 shrink-0 transition"
                >
                  💳 Check Fees
                </button>
                <button
                  onClick={() => handleSendAiMessage('Show my upcoming exam dates')}
                  className="bg-slate-50 hover:bg-slate-100 border border-slate-200/80 px-3.5 py-1.5 rounded-full text-[10.5px] font-bold text-slate-600 shrink-0 transition"
                >
                  📝 Exam Timetable
                </button>
              </div>

              {/* Input Form */}
              <form
                onSubmit={(e) => { e.preventDefault(); handleSendAiMessage(); }}
                className="flex items-center gap-3"
              >
                <input
                  type="text"
                  value={aiInput}
                  onChange={(e) => setAiInput(e.target.value)}
                  placeholder="Ask CamAI campus assistant..."
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 text-xs focus:outline-none focus:border-indigo-500 font-semibold text-slate-700"
                />
                <button
                  type="submit"
                  disabled={!aiInput.trim()}
                  className="w-10 h-10 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 disabled:opacity-50 text-white rounded-2xl flex items-center justify-center transition shadow-md shadow-indigo-600/10"
                >
                  <Send className="w-4.5 h-4.5" />
                </button>
              </form>
            </div>
          </>
        )}

        {/* 2. ACTIVE CHAT - STUDY NOTES HUB */}
        {activeChat === 'notes' && (
          <div className="flex-1 flex flex-col h-full overflow-hidden">
            {/* Toolbar: search + subject filters */}
            <div className="px-4 sm:px-6 py-3 border-b border-slate-200 bg-white shrink-0">
              {/* Sub-actions search & subject filters */}
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={searchNotes}
                    onChange={(e) => setSearchNotes(e.target.value)}
                    placeholder="Search notes & study guides..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-1.5 text-xs focus:outline-none focus:border-indigo-500 font-semibold text-slate-700"
                  />
                </div>

                <div className="flex gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                  <button
                    onClick={() => setSelectedSubject('All')}
                    className={`px-3 py-1 rounded-xl text-[10.5px] font-bold border transition shrink-0 ${
                      selectedSubject === 'All'
                        ? 'bg-indigo-600 border-indigo-600 text-white'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    All Subjects
                  </button>
                  {mockSubjects.map(sub => (
                    <button
                      key={sub.id}
                      onClick={() => setSelectedSubject(sub.id)}
                      className={`px-3 py-1 rounded-xl text-[10.5px] font-bold border transition shrink-0 ${
                        selectedSubject === sub.id
                          ? 'bg-indigo-600 border-indigo-600 text-white'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {sub.code}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Notes List */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {filteredNotesList.length === 0 ? (
                <div className="text-center py-16 bg-white border border-slate-200 rounded-3xl shadow-sm">
                  <FileText className="w-10 h-10 text-slate-400 mx-auto mb-3" />
                  <p className="text-xs font-bold text-slate-700">No notes found</p>
                  <p className="text-[10px] text-slate-500 mt-1">Try resetting the filter or typing another search term.</p>
                </div>
              ) : (
                filteredNotesList.map((note) => (
                  <div key={note.id} className="flex justify-start">
                    <div className="flex gap-2.5 items-start max-w-[80%]">
                      <div className="w-8 h-8 rounded-lg bg-amber-600/10 text-amber-700 flex items-center justify-center text-xs font-bold shrink-0 font-mono">
                        {note.subjects?.code.substring(3)}
                      </div>
                      <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-3.5 rounded-tl-none animate-fadeIn">
                        {/* Title Row */}
                        <div>
                          <div className="flex items-center gap-2 mb-1.5">
                            <span className="text-[9px] font-extrabold uppercase tracking-wider px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-100 rounded-full font-mono">
                              {note.subjects?.name}
                            </span>
                            <span className="text-[9px] font-mono text-slate-400 font-bold">
                              {new Date(note.created_at).toLocaleDateString()}
                            </span>
                          </div>
                          <h4 className="text-xs font-extrabold text-slate-900 leading-snug">
                            {note.title}
                          </h4>
                          <p className="text-xs text-slate-500 font-medium leading-relaxed mt-1">
                            {note.description}
                          </p>
                        </div>

                        {/* File Action Card */}
                        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 flex items-center justify-between gap-4">
                          <div className="flex items-center gap-2 min-w-0">
                            <FileText className="w-4 h-4 text-indigo-500 shrink-0" />
                            <div className="min-w-0">
                              <span className="text-[11px] font-bold text-slate-800 truncate block">
                                {note.file_name}
                              </span>
                              <span className="text-[9.5px] text-slate-400 font-mono font-bold">
                                {note.file_type}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              onClick={() => toggleBookmark(note.id)}
                              className={`p-2 rounded-xl border transition ${
                                bookmarkedNotes[note.id]
                                  ? 'bg-amber-50 border-amber-200 text-amber-600'
                                  : 'bg-white border-slate-200 text-slate-400 hover:text-slate-600'
                              }`}
                            >
                              <Bookmark className="w-3.5 h-3.5 fill-current" />
                            </button>
                            <button
                              onClick={() => handleDownloadFile(note.file_name)}
                              className="p-2 rounded-xl border bg-white border-slate-200 text-slate-600 hover:text-indigo-600 hover:border-indigo-200 transition"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* 3. ACTIVE CHAT - OFFICIAL NOTICES */}
        {activeChat === 'announcements' && (
          <div className="flex-1 flex flex-col h-full overflow-hidden">
            {/* Toolbar: search + category pills */}
            <div className="px-4 sm:px-6 py-3 border-b border-slate-200 bg-white shrink-0">
              {/* Sub-actions search & category pills */}
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={searchNotices}
                    onChange={(e) => setSearchNotices(e.target.value)}
                    placeholder="Search notice boards..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-1.5 text-xs focus:outline-none focus:border-indigo-500 font-semibold text-slate-700"
                  />
                </div>

                <div className="flex gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                  {['All', 'Institution', 'Examination', 'Department'].map(cat => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-3 py-1 rounded-xl text-[10.5px] font-bold border transition shrink-0 ${
                        selectedCategory === cat
                          ? 'bg-indigo-600 border-indigo-600 text-white'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Notices feed */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {filteredNoticesList.length === 0 ? (
                <div className="text-center py-16 bg-white border border-slate-200 rounded-3xl shadow-sm">
                  <Megaphone className="w-10 h-10 text-slate-400 mx-auto mb-3" />
                  <p className="text-xs font-bold text-slate-700">No notices found</p>
                  <p className="text-[10px] text-slate-500 mt-1">Adjust search parameters to find relevant documents.</p>
                </div>
              ) : (
                filteredNoticesList.map((ann) => (
                  <div key={ann.id} className="flex justify-start">
                    <div className="flex gap-2.5 items-start max-w-[80%]">
                      <div className="w-8 h-8 rounded-lg bg-rose-600/10 text-rose-700 flex items-center justify-center text-xs font-bold shrink-0">
                        N
                      </div>
                      <div className={`bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-3.5 rounded-tl-none animate-fadeIn ${
                        ann.priority === 'Critical' ? 'border-l-4 border-l-rose-500' : 
                        ann.priority === 'High' ? 'border-l-4 border-l-orange-400' : ''
                      }`}>
                        {/* Title meta bar */}
                        <div className="flex items-center justify-between gap-3 flex-wrap">
                          <div className="flex items-center gap-2">
                            <span className={`text-[9px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full font-mono border ${
                              ann.priority === 'Critical' ? 'bg-rose-50 border-rose-100 text-rose-700' :
                              ann.priority === 'High' ? 'bg-amber-50 border-amber-100 text-amber-700' :
                              'bg-slate-50 border-slate-200 text-slate-600'
                            }`}>
                              {ann.priority} Priority
                            </span>
                            <span className="text-[9px] font-extrabold uppercase tracking-wider px-2 py-0.5 bg-indigo-50 border border-indigo-100 text-indigo-700 rounded-full font-mono">
                              {ann.category}
                            </span>
                          </div>

                          <span className="text-[9px] font-mono text-slate-400 font-bold">
                            {new Date(ann.created_at).toLocaleDateString(undefined, {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>

                        {/* Contents */}
                        <div>
                          <h4 className="text-xs font-extrabold text-slate-900 leading-snug">
                            {ann.title}
                          </h4>
                          <p className="text-xs text-slate-600 font-semibold leading-relaxed mt-2">
                            {ann.content}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* 4. ACTIVE CHAT - CAMPUS EVENTS */}
        {activeChat === 'activities' && (
          <div className="flex-1 flex flex-col h-full overflow-hidden">
            {/* Events Queue */}

            {/* Events Queue */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {mockActivities.map((act) => {
                const isRegistered = registeredEvents[act.id];
                const isPassed = new Date(act.start_date).getTime() < Date.now();
                return (
                  <div key={act.id} className="flex justify-start">
                    <div className="flex gap-2.5 items-start max-w-[80%]">
                      <div className="w-8 h-8 rounded-lg bg-emerald-600/10 text-emerald-700 flex items-center justify-center text-xs font-bold shrink-0">
                        E
                      </div>
                      <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-4 rounded-tl-none animate-fadeIn">
                        {/* Title Header */}
                        <div>
                          <div className="flex items-center gap-2 mb-1.5">
                            <span className="text-[9px] font-extrabold uppercase tracking-wider px-2 py-0.5 bg-emerald-50 border border-emerald-100 text-emerald-700 rounded-full font-mono">
                              {act.event_type}
                            </span>
                            {isPassed && (
                              <span className="text-[9px] font-extrabold uppercase tracking-wider px-2 py-0.5 bg-slate-100 text-slate-500 rounded-full font-mono">
                                Past Event
                              </span>
                            )}
                          </div>
                          <h4 className="text-xs font-extrabold text-slate-900 leading-snug">
                            {act.title}
                          </h4>
                          <p className="text-xs text-slate-600 font-semibold leading-relaxed mt-1">
                            {act.description}
                          </p>
                        </div>

                        {/* Venue Detail Cards */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px] font-semibold text-slate-700 border-t border-slate-100 pt-3">
                          <div className="flex items-center gap-2 font-mono text-[10px]">
                            <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                            <span>{act.venue}</span>
                          </div>
                          <div className="flex items-center gap-2 font-mono text-[10px]">
                            <Clock className="w-4 h-4 text-slate-400 shrink-0" />
                            <span>
                              {new Date(act.start_date).toLocaleDateString()}
                            </span>
                          </div>
                        </div>

                        {/* Registration footer action */}
                        <div className="border-t border-slate-100 pt-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                          <div className="text-[10px] text-slate-400 font-mono font-bold">
                            {!isPassed && (
                              <span>Register before: {new Date(act.registration_deadline).toLocaleDateString()}</span>
                            )}
                          </div>

                          {!isPassed && (
                            <button
                              onClick={() => handleRegisterEvent(act.id)}
                              disabled={rsvpLoadingId === act.id}
                              className={`px-4 py-2 text-xs font-bold rounded-xl flex items-center gap-1.5 transition ${
                                isRegistered
                                  ? 'bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100/50'
                                  : 'bg-indigo-600 text-white hover:bg-indigo-700'
                              }`}
                            >
                              {rsvpLoadingId === act.id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : isRegistered ? (
                                <>
                                  <CheckCircle className="w-3.5 h-3.5" />
                                  Registered
                                </>
                              ) : (
                                <>
                                  <Plus className="w-3.5 h-3.5" />
                                  Register Now
                                </>
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

// Simple internal Lucide alternatives for safety if not exported directly
function CreditCardIcon(props: any) {
  return <CreditCard className={props.className} />;
}
function AwardIcon(props: any) {
  return <Award className={props.className} />;
}
