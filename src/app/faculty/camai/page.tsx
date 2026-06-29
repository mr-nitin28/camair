'use client';

import React, { useState, useEffect, useMemo, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAppStore } from '@/lib/store';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  FileText,
  Megaphone,
  Calendar,
  Send,
  Search,
  Download,
  MapPin,
  Clock,
  CheckCircle,
  Loader2,
  Plus,
  Trash2,
  X,
  ClipboardList,
  Award,
  FileUp,
  Bot,
  User as UserIcon,
} from 'lucide-react';

// --- TYPING INTERFACES ---
interface Subject {
  id: string;
  code: string;
  name: string;
}

interface FacultyNote {
  id: string;
  title: string;
  description: string;
  file_type: string;
  file_name: string;
  subject_id: string;
  created_at: string;
  subjects: Subject;
}

interface FacultyAnnouncement {
  id: string;
  title: string;
  content: string;
  priority: 'Critical' | 'High' | 'Normal';
  category: string;
  created_at: string;
}

interface FacultyActivity {
  id: string;
  title: string;
  description: string;
  event_type: string;
  venue: string;
  start_date: string;
  end_date: string;
  registration_deadline: string;
}

interface ClassItem {
  code: string;
  name: string;
  timing: string;
  venue: string;
}

interface StudentRiskItem {
  name: string;
  id: string;
  alert: string;
  status: 'Critical' | 'High' | 'Normal';
}

interface LeaveRequestItem {
  student: string;
  type: string;
  duration: string;
  reason: string;
}

interface ExamLogisticsItem {
  event: string;
  time: string;
  detail: string;
}

type DataCardType = 'classes' | 'students_risk' | 'pending_leaves' | 'exams_logistics';

interface DataCard {
  type: DataCardType;
  title: string;
  items: ClassItem[] | StudentRiskItem[] | LeaveRequestItem[] | ExamLogisticsItem[];
}

interface Message {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: Date;
  dataCard?: DataCard;
}

// --- MOCK DATA ---
const mockSubjects: Subject[] = [
  { id: 'sub-cd', code: 'CS-601', name: 'Compiler Design' },
  { id: 'sub-cn', code: 'CS-602', name: 'Computer Networks' },
  { id: 'sub-se', code: 'CS-603', name: 'Software Engineering' },
];

const defaultFacultyNotes: FacultyNote[] = [
  {
    id: 'n1',
    title: 'CS-601: Lexical Analysis DFA Minimization Steps',
    description: 'Lecture slides covering state minimization partition refinement algorithms and sink state combinations.',
    file_type: 'PDF Slide Deck',
    file_name: 'CS601_DFA_Minimization.pdf',
    subject_id: 'sub-cd',
    created_at: '2026-06-24T19:26:00.000Z',
    subjects: mockSubjects[0],
  },
  {
    id: 'n2',
    title: 'CS-602: Socket Programming Handbook',
    description: 'Detailed tutorial guides on TCP/UDP client-server sockets setup in C++ and Python.',
    file_type: 'Handout Pack',
    file_name: 'Socket_Programming_Guide.pdf',
    subject_id: 'sub-cn',
    created_at: '2026-06-21T19:26:00.000Z',
    subjects: mockSubjects[1],
  },
];

const mockFacultyAnnouncements: FacultyAnnouncement[] = [
  {
    id: 'fa1',
    title: 'Syllabus Coverage Audit Review',
    content: 'All faculty members must submit their Mid-Semester 6 syllabus completion status report to the Dean of Academics by June 30th.',
    priority: 'Critical',
    category: "Dean's Office",
    created_at: '2026-06-26T15:26:00.000Z',
  },
  {
    id: 'fa2',
    title: 'Semester 6 Exam Invigilation Schedule',
    content: 'The final duty roster for Mid-Semester internal exam invigilations has been published. Please review your assigned venues and report 15 mins prior.',
    priority: 'High',
    category: 'Academic Council',
    created_at: '2026-06-25T23:26:00.000Z',
  },
  {
    id: 'fa3',
    title: 'Research Grant Proposals Call',
    content: 'Submissions are invited for the DST-SERB core research grant. Faculty members with active research profiles can submit drafts to the department head.',
    priority: 'Normal',
    category: 'Institution',
    created_at: '2026-06-24T19:26:00.000Z',
  },
];

const mockFacultyActivities: FacultyActivity[] = [
  {
    id: 'fac_act1',
    title: 'Board of Studies (BoS) CSE Review Meeting',
    description: 'Annual department review discussing new curriculum updates for Machine Learning and Cloud Computing tracks in B.Tech CSE.',
    event_type: 'Department Meeting',
    venue: 'CSE Conference Hall',
    start_date: '2026-06-27T19:26:00.000Z',
    end_date: '2026-06-27T22:26:00.000Z',
    registration_deadline: '2026-06-27T07:26:00.000Z',
  },
  {
    id: 'fac_act2',
    title: 'Generative AI Tools in Academic Research',
    description: 'A hands-on workshop for faculty members on utilizing AI tools for writing literature reviews and compiling metadata summaries.',
    event_type: 'Faculty Development Program',
    venue: 'Seminar Hall 1',
    start_date: '2026-06-29T19:26:00.000Z',
    end_date: '2026-06-29T22:26:00.000Z',
    registration_deadline: '2026-06-28T19:26:00.000Z',
  },
];

// --- WORKSPACE FEATURE TABS ---
const WORKSPACE_TABS = [
  { id: 'ai', label: 'CamAI Faculty Helper', icon: Sparkles, gradient: 'from-emerald-500 to-teal-600', meta: 'Online', online: true },
  { id: 'notes', label: 'Upload Lectures Hub', icon: FileText, gradient: 'from-indigo-500 to-indigo-700', meta: 'Study Guides', online: false },
  { id: 'announcements', label: 'Faculty Bulletins', icon: Megaphone, gradient: 'from-amber-500 to-amber-600', meta: 'Circulars', online: false },
  { id: 'activities', label: 'Meetings & Schedule', icon: Calendar, gradient: 'from-rose-500 to-rose-600', meta: 'Duties', online: false },
] as const;

// --- AI RESPONSES GENERATOR ---
const getAIResponse = (userPrompt: string): { text: string; dataCard?: DataCard } => {
  const prompt = userPrompt.toLowerCase();

  if (prompt.includes('class') || prompt.includes('schedule') || prompt.includes('teach') || prompt.includes('timetable') || prompt.includes('lecture')) {
    return {
      text: 'Here is your assigned class and teaching schedule for the current semester:',
      dataCard: {
        type: 'classes',
        title: 'Assigned Lectures',
        items: [
          { code: 'CS-601', name: 'Compiler Design', timing: 'Tue & Thu, 10:00 AM', venue: 'Room 101 (LH)' },
          { code: 'CS-603', name: 'Software Engineering', timing: 'Mon & Fri, 11:30 AM', venue: 'Room 102 (LH)' },
          { code: 'CS-606L', name: 'Computer Networks Lab', timing: 'Wed, 02:00 PM', venue: 'Lab 6 (Block B)' }
        ] as ClassItem[]
      }
    };
  }

  if (prompt.includes('risk') || prompt.includes('performance') || prompt.includes('shortage') || prompt.includes('fail') || prompt.includes('student')) {
    return {
      text: 'These are the students currently flagged as "At Risk" based on low attendance or poor test scores:',
      dataCard: {
        type: 'students_risk',
        title: 'Students At Risk',
        items: [
          { name: 'Aarav Sharma', id: 'STU-2023-0042', alert: 'Shortage (68% Attendance)', status: 'Critical' },
          { name: 'Rohit Verma', id: 'STU-2023-0059', alert: 'Failed Internals (12/30 Marks)', status: 'High' }
        ] as StudentRiskItem[]
      }
    };
  }

  if (prompt.includes('leave') || prompt.includes('approval') || prompt.includes('pending')) {
    return {
      text: 'You have the following pending student leave requests requiring your review:',
      dataCard: {
        type: 'pending_leaves',
        title: 'Leave Requests Ledger',
        items: [
          { student: 'Aarav Sharma', type: 'Medical Leave', duration: 'June 25 (1 Day)', reason: 'Viral fever checkup' },
          { student: 'Sneha Patel', type: 'Personal Leave', duration: 'July 2-4 (3 Days)', reason: "Sister's marriage" }
        ] as LeaveRequestItem[]
      }
    };
  }

  if (prompt.includes('exam') || prompt.includes('grade') || prompt.includes('invigilation') || prompt.includes('test') || prompt.includes('duty')) {
    return {
      text: 'Your upcoming midterm exam invigilation duties and grading deadlines:',
      dataCard: {
        type: 'exams_logistics',
        title: 'Exams & Logistics',
        items: [
          { event: 'CS-601 Invigilation', time: 'July 5, 10:00 AM', detail: 'LH-101 (Block A)' },
          { event: 'CS-603 Invigilation', time: 'July 7, 02:00 PM', detail: 'LH-103 (Block A)' },
          { event: 'CS-604 Grading Deadline', time: 'July 12, 05:00 PM', detail: 'Online Marks Submission' }
        ] as ExamLogisticsItem[]
      }
    };
  }

  if (prompt.includes('hi') || prompt.includes('hello') || prompt.includes('hey') || prompt.includes('help') || prompt.includes('start')) {
    return {
      text: `Hello Dr. Priya! I am **CamAI Faculty Assistant**. I am ready to pull data cards for you. Try asking me about:\n\n* **Teaching Schedule** (classes, timetables)\n* **Student Attendance** (students at risk, shortage alerts)\n* **Leave Approvals** (pending student leaves)\n* **Exam Duties** (invigilations, grading deadlines)\n\nChoose an action below or type a query!`
    };
  }

  return {
    text: `I've analyzed your query regarding "${userPrompt}". \n\nAs a faculty assistant tool, I can look up academic schedules, student directories, or exam invigilation rosters. Try typing keywords like **Schedule, Student, Leave, or Exams** to view the metrics!`,
  };
};

export default function FacultyCamAIPage() {
  return (
    <Suspense fallback={
      <div className="flex-1 flex flex-col items-center justify-center bg-emerald-50/10 text-slate-800 h-full min-h-[400px]">
        <Loader2 className="w-10 h-10 animate-spin text-emerald-650 mb-4" />
        <p className="text-slate-500 font-semibold text-xs animate-pulse">Loading CamAI Faculty Workspace...</p>
      </div>
    }>
      <FacultyCamAIWorkspace />
    </Suspense>
  );
}

function FacultyCamAIWorkspace() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { faculty } = useAppStore();

  const initialChat = searchParams.get('chat') || 'ai';
  const [activeChat, setActiveChat] = useState<string>(initialChat);
  const [seenTabs, setSeenTabs] = useState<Record<string, boolean>>({ [initialChat]: true });

  // Notes/Lectures States
  const [searchNotes, setSearchNotes] = useState<string>('');
  const [selectedSubject, setSelectedSubject] = useState<string>('All');
  const [downloadAlert, setDownloadAlert] = useState<string | null>(null);
  const [notesList, setNotesList] = useState<FacultyNote[]>([]);
  const [uploadModalOpen, setUploadModalOpen] = useState<boolean>(false);
  const [newTitle, setNewTitle] = useState<string>('');
  const [newDesc, setNewDesc] = useState<string>('');
  const [newSubjectId, setNewSubjectId] = useState<string>('sub-cd');
  const [newFileName, setNewFileName] = useState<string>('');
  const [uploading, setUploading] = useState<boolean>(false);

  // Notices States
  const [searchNotices, setSearchNotices] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  // Events States
  const [registeredEvents, setRegisteredEvents] = useState<Record<string, boolean>>({});
  const [rsvpLoadingId, setRsvpLoadingId] = useState<string | null>(null);

  // AI Chat States
  const [aiInput, setAiInput] = useState<string>('');
  const [aiMessages, setAiMessages] = useState<Message[]>([
    {
      id: 'welcome-faculty',
      sender: 'ai',
      text: `Hello Dr. Priya! I am **CamAI Faculty Assistant**. I can help you look up teaching timetables, student attendance alerts, pending student leaves, and grading deadlines. How can I assist you today?`,
      timestamp: new Date('2026-06-26T19:25:00.000Z'),
    }
  ]);
  const [isTyping, setIsTyping] = useState<boolean>(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Load from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedNotes = localStorage.getItem('faculty_camai_notes');
      if (storedNotes) {
        try {
          setNotesList(JSON.parse(storedNotes) as FacultyNote[]);
        } catch (e) {
          console.error(e);
        }
      } else {
        setNotesList(defaultFacultyNotes);
        localStorage.setItem('faculty_camai_notes', JSON.stringify(defaultFacultyNotes));
      }

      const storedEvents = localStorage.getItem('faculty_camai_registered_events');
      if (storedEvents) {
        try {
          setRegisteredEvents(JSON.parse(storedEvents) as Record<string, boolean>);
        } catch (e) {
          console.error(e);
        }
      }

      const storedMessages = localStorage.getItem('faculty_camai_messages');
      if (storedMessages) {
        try {
          const parsed = JSON.parse(storedMessages);
          const formatted = parsed.map((m: { id: string; sender: 'user' | 'ai'; text: string; timestamp: string; dataCard?: DataCard }) => ({
            ...m,
            timestamp: new Date(m.timestamp)
          })) as Message[];
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
    if (activeChat === 'ai' && chatContainerRef.current) {
      chatContainerRef.current.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, [aiMessages, activeChat, isTyping]);

  // AI chat reply
  const handleSendAiMessage = (textToSend?: string) => {
    const text = textToSend || aiInput;
    if (!text.trim()) return;

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text,
      timestamp: new Date(),
    };
    
    setAiMessages(prev => {
      const updated = [...prev, userMsg];
      localStorage.setItem('faculty_camai_messages', JSON.stringify(updated));
      return updated;
    });
    if (!textToSend) setAiInput('');

    setIsTyping(true);
    setTimeout(() => {
      const response = getAIResponse(text);
      const aiMsg: Message = {
        id: `ai-${Date.now()}`,
        sender: 'ai',
        text: response.text,
        timestamp: new Date(),
        dataCard: response.dataCard,
      };
      setAiMessages(prev => {
        const updated = [...prev, aiMsg];
        localStorage.setItem('faculty_camai_messages', JSON.stringify(updated));
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

  const handleRegisterEvent = (eventId: string) => {
    setRsvpLoadingId(eventId);
    setTimeout(() => {
      setRegisteredEvents(prev => {
        const updated = {
          ...prev,
          [eventId]: !prev[eventId]
        };
        localStorage.setItem('faculty_camai_registered_events', JSON.stringify(updated));
        return updated;
      });
      setRsvpLoadingId(null);
    }, 800);
  };

  // Upload new lecture slide
  const handleUploadNotes = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle || !newFileName) return;

    setUploading(true);
    setTimeout(() => {
      const sub = mockSubjects.find(s => s.id === newSubjectId) || mockSubjects[0];
      const newNote: FacultyNote = {
        id: `local-note-${Date.now()}`,
        title: newTitle,
        description: newDesc || 'No description provided.',
        file_type: 'PDF Slide Deck',
        file_name: newFileName.endsWith('.pdf') ? newFileName : `${newFileName}.pdf`,
        subject_id: newSubjectId,
        created_at: new Date().toISOString(),
        subjects: sub,
      };

      setNotesList(prev => {
        const updated = [newNote, ...prev];
        localStorage.setItem('faculty_camai_notes', JSON.stringify(updated));
        return updated;
      });

      setNewTitle('');
      setNewDesc('');
      setNewFileName('');
      setUploadModalOpen(false);
      setUploading(false);
    }, 800);
  };

  // Delete lecture slide
  const handleDeleteNote = (id: string) => {
    if (confirm('Are you sure you want to delete this lecture resource?')) {
      setNotesList(prev => {
        const updated = prev.filter(n => n.id !== id);
        localStorage.setItem('faculty_camai_notes', JSON.stringify(updated));
        return updated;
      });
    }
  };

  const switchTab = (id: string) => {
    setActiveChat(id);
    setSeenTabs((prev) => ({ ...prev, [id]: true }));
    router.replace(`/faculty/camai?chat=${id}`);
  };

  // Notification badge logic
  const tabBadges = useMemo<Record<string, number>>(
    () => ({
      ai: 0,
      notes: 0,
      announcements: mockFacultyAnnouncements.filter((a) => a.priority === 'Critical').length,
      activities: mockFacultyActivities.length,
    }),
    []
  );

  // Filters
  const filteredNotesList = useMemo(() => {
    return notesList.filter(note => {
      const matchesSearch = note.title.toLowerCase().includes(searchNotes.toLowerCase()) ||
                            note.description.toLowerCase().includes(searchNotes.toLowerCase());
      const matchesSubject = selectedSubject === 'All' || note.subject_id === selectedSubject;
      return matchesSearch && matchesSubject;
    });
  }, [searchNotes, selectedSubject, notesList]);

  const filteredNoticesList = useMemo(() => {
    return mockFacultyAnnouncements.filter(notice => {
      const matchesSearch = notice.title.toLowerCase().includes(searchNotices.toLowerCase()) ||
                            notice.content.toLowerCase().includes(searchNotices.toLowerCase());
      const matchesCategory = selectedCategory === 'All' || notice.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [searchNotices, selectedCategory]);

  return (
    <div className="flex flex-col flex-1 w-full bg-transparent overflow-hidden relative min-h-0">
      {/* Download Alert Pop-up */}
      <AnimatePresence>
        {downloadAlert && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-white border border-slate-200 shadow-xl px-4 py-2.5 rounded-2xl flex items-center gap-2.5 text-xs text-slate-800 font-bold"
          >
            <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
            <span>Downloading {downloadAlert}...</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- TOP WORKSPACE TAB STRIP --- */}
      <div className="bg-white/60 backdrop-blur-md border-b border-slate-200/80 shrink-0">
        <div
          role="tablist"
          aria-label="Faculty CamAI features"
          className="px-6 py-4 flex gap-2 overflow-x-auto custom-scrollbar scroll-smooth"
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
                className={`relative shrink-0 flex items-center gap-3 pl-3 pr-4 py-2 rounded-2xl transition duration-200 ${
                  isActive ? 'text-slate-900 font-bold' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                }`}
              >
                {isActive && (
                  <motion.span
                    layoutId="facultyCamaiActiveTab"
                    transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                    className="absolute inset-0 bg-white border border-slate-200 shadow-sm rounded-2xl"
                  />
                )}

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

                <span className="relative z-10 hidden sm:flex flex-col items-start leading-tight">
                  <span className="text-xs font-bold whitespace-nowrap text-slate-800">{tab.label}</span>
                  <span className={`text-[9px] font-bold font-mono uppercase tracking-wide ${isActive ? 'text-indigo-600' : 'text-slate-400'}`}>
                    {tab.meta}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* --- CONTENT WORKSPACE --- */}
      <div className="flex-1 relative overflow-hidden bg-transparent">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeChat}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="absolute inset-0 flex flex-col"
          >
            {/* 1. ASSISTANT PANEL */}
            {activeChat === 'ai' && (
              <>
                {/* Inline chat header */}
                <div className="px-6 py-3.5 bg-white/40 backdrop-blur-md border-b border-slate-200/80 flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-sm">
                      <Bot className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h2 className="text-xs font-extrabold text-slate-800">CamAI Intelligent Assistant</h2>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                        <span className="text-[10px] text-slate-505 font-bold font-mono">SYSTEM INTERACTIVE HUB • ONLINE</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Messages Panel */}
                <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/30">
                  {aiMessages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-[70%] flex gap-3.5 items-start ${msg.sender === 'user' ? 'flex-row-reverse' : ''}`}>
                        {/* Avatar */}
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-xs font-black uppercase shadow-sm border transition ${
                          msg.sender === 'user'
                            ? 'bg-indigo-50 border-indigo-100 text-indigo-700'
                            : 'bg-emerald-50 border-emerald-100 text-emerald-700'
                        }`}>
                          {msg.sender === 'user' ? (
                            faculty ? `${faculty.first_name[0]}${faculty.last_name[0]}` : <UserIcon className="w-4 h-4" />
                          ) : (
                            <Bot className="w-4 h-4" />
                          )}
                        </div>

                        {/* Bubble Area */}
                        <div className="space-y-2">
                          <div className={`p-4 rounded-2xl text-xs font-medium leading-relaxed shadow-sm border ${
                            msg.sender === 'user'
                              ? 'bg-gradient-to-br from-indigo-600 to-indigo-750 text-white border-indigo-500/30 rounded-tr-none'
                              : 'bg-white text-slate-800 border-slate-100 rounded-tl-none'
                          }`}>
                            {msg.text.split('\n').map((line, idx) => (
                              <p key={idx} className={idx > 0 ? 'mt-1.5' : ''}>{line}</p>
                            ))}
                          </div>

                          {/* Data card render */}
                          {msg.dataCard && (
                            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-md w-80 animate-scaleUp space-y-3 mt-2">
                              <h4 className="text-xs font-bold text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-2">
                                {msg.dataCard.type === 'classes' && <Award className="w-4 h-4 text-emerald-600" />}
                                {msg.dataCard.type === 'students_risk' && <ClipboardList className="w-4 h-4 text-rose-600" />}
                                {msg.dataCard.type === 'pending_leaves' && <Calendar className="w-4 h-4 text-amber-600" />}
                                {msg.dataCard.type === 'exams_logistics' && <Award className="w-4 h-4 text-indigo-650" />}
                                <span className="font-extrabold tracking-tight">{msg.dataCard.title}</span>
                              </h4>

                              {msg.dataCard.type === 'classes' && (
                                <div className="space-y-2">
                                  {(msg.dataCard.items as ClassItem[]).map((item, i) => (
                                    <div key={i} className="p-3 border border-slate-100 bg-slate-50/50 rounded-xl text-[11px] hover:border-slate-200 transition">
                                      <span className="font-bold text-slate-800 block leading-tight">{item.code}: {item.name}</span>
                                      <div className="flex justify-between items-center text-[10px] text-slate-500 font-mono mt-2 font-semibold">
                                        <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5 text-slate-400" /> {item.timing}</span>
                                        <span className="bg-slate-200/60 text-slate-650 px-1.5 py-0.5 rounded text-[9px] font-sans font-bold">{item.venue}</span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}

                              {msg.dataCard.type === 'students_risk' && (
                                <div className="space-y-2">
                                  {(msg.dataCard.items as StudentRiskItem[]).map((item, i) => (
                                    <div key={i} className="p-3 border border-slate-100 bg-slate-50/50 rounded-xl flex items-center justify-between text-[11px] hover:border-slate-200 transition">
                                      <div>
                                        <span className="font-bold text-slate-800 block">{item.name}</span>
                                        <span className="text-slate-505 font-mono text-[9px] block mt-0.5 font-bold">{item.id}</span>
                                      </div>
                                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase border ${
                                        item.status === 'Critical' ? 'bg-rose-50 border-rose-100 text-rose-700' : 'bg-amber-50 border-amber-100 text-amber-700'
                                      }`}>
                                        {item.alert}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              )}

                              {msg.dataCard.type === 'pending_leaves' && (
                                <div className="space-y-2">
                                  {(msg.dataCard.items as LeaveRequestItem[]).map((item, i) => (
                                    <div key={i} className="p-3 border border-slate-100 bg-slate-50/50 rounded-xl text-[11px] space-y-2 hover:border-slate-200 transition">
                                      <div className="flex justify-between items-baseline">
                                        <span className="font-bold text-slate-800">{item.student}</span>
                                        <span className="text-[9px] font-extrabold uppercase px-1.5 bg-amber-50 text-amber-700 border border-amber-100 rounded-md font-mono">{item.type}</span>
                                      </div>
                                      <p className="text-slate-600 bg-white border border-slate-100 p-2 rounded-lg text-[10.5px] font-medium leading-relaxed">
                                        <span className="font-bold text-slate-400 text-[9px] uppercase tracking-wider block mb-0.5 font-mono">Reason</span>
                                        {item.reason}
                                      </p>
                                      <span className="text-[9px] text-slate-400 font-mono font-bold block">{item.duration}</span>
                                    </div>
                                  ))}
                                </div>
                              )}

                              {msg.dataCard.type === 'exams_logistics' && (
                                <div className="space-y-2">
                                  {(msg.dataCard.items as ExamLogisticsItem[]).map((item, i) => (
                                    <div key={i} className="p-3 border border-slate-100 bg-slate-50/50 rounded-xl text-[11px] hover:border-slate-200 transition">
                                      <span className="font-bold text-slate-800 block leading-tight">{item.event}</span>
                                      <div className="flex justify-between items-center text-[10px] text-slate-500 font-mono mt-2 font-semibold">
                                        <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5 text-slate-400" /> {item.time}</span>
                                        <span className="bg-indigo-50 border border-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded text-[9px] font-sans font-bold">{item.detail}</span>
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
                      <div className="flex gap-3.5 items-center">
                        <div className="w-9 h-9 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-bold animate-pulse shadow-sm">
                          <Bot className="w-4 h-4 text-emerald-605" />
                        </div>
                        <div className="bg-white border border-slate-100 py-3 px-4 rounded-2xl rounded-tl-none shadow-sm flex items-center gap-1">
                          <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                          <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                          <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                      </div>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>

                {/* AI Input Form */}
                <div className="p-4 bg-white/65 backdrop-blur-md border-t border-slate-200/80 shrink-0 flex flex-col gap-3.5">
                  <div className="flex gap-2 overflow-x-auto pb-1.5 scroll-smooth custom-scrollbar">
                    <button
                      onClick={() => handleSendAiMessage('Show my teaching schedule')}
                      className="bg-white hover:bg-slate-50 border border-slate-200 shadow-sm px-4 py-1.5 rounded-full text-[10.5px] font-bold text-slate-600 shrink-0 transition flex items-center gap-1"
                    >
                      🗓️ Lecture Schedule
                    </button>
                    <button
                      onClick={() => handleSendAiMessage('Who are the students at academic risk?')}
                      className="bg-white hover:bg-slate-50 border border-slate-200 shadow-sm px-4 py-1.5 rounded-full text-[10.5px] font-bold text-slate-600 shrink-0 transition flex items-center gap-1"
                    >
                      🚨 Students at Risk
                    </button>
                    <button
                      onClick={() => handleSendAiMessage('Do I have pending leave requests?')}
                      className="bg-white hover:bg-slate-50 border border-slate-200 shadow-sm px-4 py-1.5 rounded-full text-[10.5px] font-bold text-slate-600 shrink-0 transition flex items-center gap-1"
                    >
                      ✉️ Pending Approvals
                    </button>
                    <button
                      onClick={() => handleSendAiMessage('Show exam duties and deadlines')}
                      className="bg-white hover:bg-slate-50 border border-slate-200 shadow-sm px-4 py-1.5 rounded-full text-[10.5px] font-bold text-slate-600 shrink-0 transition flex items-center gap-1"
                    >
                      ✏️ Exam Logistics
                    </button>
                  </div>

                  <form
                    onSubmit={(e) => { e.preventDefault(); handleSendAiMessage(); }}
                    className="flex items-center gap-3"
                  >
                    <input
                      type="text"
                      value={aiInput}
                      onChange={(e) => setAiInput(e.target.value)}
                      placeholder="Ask CamAI faculty assistant..."
                      className="flex-1 bg-white border border-slate-200 rounded-2xl px-4 py-3 text-xs focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 font-medium text-slate-800 placeholder-slate-450 shadow-inner transition duration-200"
                    />
                    <button
                      type="submit"
                      disabled={!aiInput.trim()}
                      className="w-11 h-11 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-850 disabled:opacity-50 text-white rounded-2xl flex items-center justify-center transition shadow-md shadow-indigo-500/20 shrink-0 animate-scaleUp"
                    >
                      <Send className="w-5 h-5" />
                    </button>
                  </form>
                </div>
              </>
            )}

            {/* 2. LECTURE NOTES HUB */}
            {activeChat === 'notes' && (
              <div className="flex-1 flex flex-col h-full overflow-hidden">
                {/* Header Controls */}
                <div className="px-6 py-4 border-b border-slate-200 bg-white/40 backdrop-blur-md shrink-0 flex flex-col sm:flex-row justify-between gap-4">
                  <div className="flex flex-col sm:flex-row gap-3.5 flex-1">
                    <div className="relative flex-1 max-w-md">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        value={searchNotes}
                        onChange={(e) => setSearchNotes(e.target.value)}
                        placeholder="Search slides & syllabus guides..."
                        className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-3 py-1.5 text-xs focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 font-semibold text-slate-705 shadow-sm"
                      />
                    </div>

                    <div className="flex gap-2 overflow-x-auto pb-1 sm:pb-0 scroll-smooth custom-scrollbar">
                      <button
                        onClick={() => setSelectedSubject('All')}
                        className={`px-3 py-1.5 rounded-xl text-[10.5px] font-bold border transition shrink-0 ${
                          selectedSubject === 'All'
                            ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        All Subjects
                      </button>
                      {mockSubjects.map(sub => (
                        <button
                          key={sub.id}
                          onClick={() => setSelectedSubject(sub.id)}
                          className={`px-3 py-1.5 rounded-xl text-[10.5px] font-bold border transition shrink-0 ${
                            selectedSubject === sub.id
                              ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm'
                              : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          {sub.code}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={() => setUploadModalOpen(true)}
                    className="bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-850 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm hover:shadow transition shrink-0 duration-200"
                  >
                    <Plus className="w-4 h-4" /> Publish slides
                  </button>
                </div>

                {/* Workspace grid list */}
                <div className="flex-1 overflow-y-auto p-6 bg-slate-50/20">
                  {filteredNotesList.length === 0 ? (
                    <div className="text-center py-16 bg-white border border-slate-205 rounded-3xl shadow-sm max-w-lg mx-auto mt-6">
                      <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                      <p className="text-sm font-bold text-slate-800">No published lectures found</p>
                      <p className="text-xs text-slate-450 mt-1 max-w-[280px] mx-auto">Publish slides or syllabus guides using the button above to make them visible to students.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                      {filteredNotesList.map((note) => (
                        <div
                          key={note.id}
                          className="bg-white border border-slate-200/80 rounded-2xl p-5 hover:shadow-md transition-shadow duration-200 flex flex-col justify-between"
                        >
                          <div className="space-y-3">
                            <div className="flex items-center justify-between gap-3">
                              <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 bg-indigo-50 border border-indigo-100 text-indigo-700 rounded-full font-mono">
                                {note.subjects?.code}
                              </span>
                              <span className="text-[10px] font-mono text-slate-400 font-bold">
                                {new Date(note.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                              </span>
                            </div>

                            <div>
                              <h4 className="text-xs font-extrabold text-slate-900 leading-snug line-clamp-1">
                                {note.title}
                              </h4>
                              <p className="text-[11px] text-slate-500 font-medium leading-relaxed mt-1 line-clamp-2">
                                {note.description}
                              </p>
                            </div>
                          </div>

                          <div className="mt-4 pt-4 border-t border-slate-100 flex flex-col gap-3">
                            <div className="bg-slate-55 border border-slate-200 rounded-xl p-2.5 flex items-center justify-between gap-3">
                              <div className="flex items-center gap-2 min-w-0">
                                <FileText className="w-4 h-4 text-indigo-500 shrink-0" />
                                <div className="min-w-0">
                                  <span className="text-[10.5px] font-bold text-slate-800 truncate block">
                                    {note.file_name}
                                  </span>
                                  <span className="text-[9px] text-slate-400 font-mono font-bold">
                                    {note.file_type}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleDownloadFile(note.file_name)}
                                className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-600 hover:text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50/30 transition text-[11px] font-bold flex items-center gap-1"
                              >
                                <Download className="w-3.5 h-3.5" /> Download
                              </button>
                              <button
                                onClick={() => handleDeleteNote(note.id)}
                                className="p-1.5 rounded-xl border border-slate-200 bg-white text-rose-500 hover:text-rose-700 hover:border-rose-200 hover:bg-rose-50 transition"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 3. OFFICIAL NOTICES */}
            {activeChat === 'announcements' && (
              <div className="flex-1 flex flex-col h-full overflow-hidden">
                {/* Filter header */}
                <div className="px-6 py-4 border-b border-slate-200 bg-white/40 backdrop-blur-md shrink-0">
                  <div className="flex flex-col sm:flex-row gap-3.5">
                    <div className="relative flex-1 max-w-md">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        value={searchNotices}
                        onChange={(e) => setSearchNotices(e.target.value)}
                        placeholder="Search circular bulletins..."
                        className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-3 py-1.5 text-xs focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 font-semibold text-slate-700 shadow-sm"
                      />
                    </div>

                    <div className="flex gap-2 overflow-x-auto pb-1 sm:pb-0 scroll-smooth custom-scrollbar">
                      {['All', "Dean's Office", 'Academic Council', 'Institution'].map(cat => (
                        <button
                          key={cat}
                          onClick={() => setSelectedCategory(cat)}
                          className={`px-3 py-1.5 rounded-xl text-[10.5px] font-bold border transition shrink-0 ${
                            selectedCategory === cat
                              ? 'bg-amber-500 border-amber-500 text-white shadow-sm'
                              : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Bulletins list */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/20">
                  {filteredNoticesList.length === 0 ? (
                    <div className="text-center py-16 bg-white border border-slate-200 rounded-3xl shadow-sm max-w-lg mx-auto mt-6">
                      <Megaphone className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                      <p className="text-sm font-bold text-slate-800">No circulars found</p>
                      <p className="text-xs text-slate-450 mt-1">Try resetting filters to inspect bulletins.</p>
                    </div>
                  ) : (
                    <div className="max-w-4xl mx-auto space-y-4">
                      {filteredNoticesList.map((ann) => (
                        <div
                          key={ann.id}
                          className={`bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm space-y-4 relative overflow-hidden transition hover:shadow-md ${
                            ann.priority === 'Critical' ? 'border-l-4 border-l-rose-500' :
                            ann.priority === 'High' ? 'border-l-4 border-l-orange-405' : 'border-l-4 border-l-slate-400'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-3 flex-wrap">
                            <div className="flex items-center gap-2">
                              <span className={`text-[9px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full font-mono border ${
                                ann.priority === 'Critical' ? 'bg-rose-50 border-rose-100 text-rose-700' :
                                ann.priority === 'High' ? 'bg-amber-50 border-amber-100 text-amber-700' :
                                'bg-slate-50 border-slate-200 text-slate-650'
                              }`}>
                                {ann.priority} Priority
                              </span>
                              <span className="text-[9px] font-extrabold uppercase tracking-wider px-2 py-0.5 bg-slate-105 border border-slate-200 text-slate-600 rounded-full font-mono">
                                {ann.category}
                              </span>
                            </div>

                            <span className="text-[10px] font-mono text-slate-400 font-bold">
                              {new Date(ann.created_at).toLocaleDateString(undefined, {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                          </div>

                          <div>
                            <h4 className="text-xs font-extrabold text-slate-900 leading-snug">
                              {ann.title}
                            </h4>
                            <p className="text-xs text-slate-600 font-medium leading-relaxed mt-2.5">
                              {ann.content}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 4. CALENDAR & SCHEDULES */}
            {activeChat === 'activities' && (
              <div className="flex-1 flex flex-col h-full overflow-hidden">
                <div className="flex-1 overflow-y-auto p-6 bg-slate-50/20">
                  <div className="max-w-4xl mx-auto space-y-4">
                    {mockFacultyActivities.map((act) => {
                      const isRegistered = registeredEvents[act.id];
                      const isPassed = new Date(act.start_date).getTime() < Date.now();
                      return (
                        <div
                          key={act.id}
                          className="bg-white border border-slate-200/80 rounded-2xl p-5 hover:shadow-md transition duration-200 flex flex-col sm:flex-row gap-4.5"
                        >
                          {/* Calendar Sheet */}
                          <div className="w-16 h-20 rounded-2xl bg-slate-50 border border-slate-150 flex flex-col overflow-hidden shrink-0 shadow-sm self-start">
                            <div className="h-6 bg-rose-500 flex items-center justify-center text-[9px] font-black text-white uppercase tracking-wider">
                              {new Date(act.start_date).toLocaleDateString(undefined, { month: 'short' })}
                            </div>
                            <div className="flex-1 flex items-center justify-center text-xl font-extrabold text-slate-800">
                              {new Date(act.start_date).toLocaleDateString(undefined, { day: 'numeric' })}
                            </div>
                          </div>

                          {/* Event Details */}
                          <div className="flex-1 space-y-4">
                            <div className="space-y-2">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-[9px] font-extrabold uppercase tracking-wider px-2 py-0.5 bg-rose-50 border border-rose-100 text-rose-705 rounded-full font-mono">
                                  {act.event_type}
                                </span>
                                {isPassed && (
                                  <span className="text-[9px] font-extrabold uppercase tracking-wider px-2 py-0.5 bg-slate-100 text-slate-500 rounded-full font-mono">
                                    Concluded
                                  </span>
                                )}
                              </div>
                              <h4 className="text-xs font-extrabold text-slate-900 leading-snug">
                                {act.title}
                              </h4>
                              <p className="text-xs text-slate-550 font-medium leading-relaxed">
                                {act.description}
                              </p>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px] font-semibold text-slate-600 border-t border-slate-100 pt-3.5">
                              <div className="flex items-center gap-2 font-mono text-[10px] text-slate-500">
                                <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                                <span>{act.venue}</span>
                              </div>
                              <div className="flex items-center gap-2 font-mono text-[10px] text-slate-500">
                                <Clock className="w-4 h-4 text-slate-400 shrink-0" />
                                <span>
                                  {new Date(act.start_date).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })} - {new Date(act.end_date).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                            </div>

                            <div className="border-t border-slate-100 pt-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                              <div className="text-[10px] text-slate-400 font-mono font-bold">
                                {!isPassed && (
                                  <span>RSVP deadline: {new Date(act.registration_deadline).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                                )}
                              </div>

                              {!isPassed && (
                                <button
                                  onClick={() => handleRegisterEvent(act.id)}
                                  disabled={rsvpLoadingId === act.id}
                                  className={`px-4 py-2 text-xs font-bold rounded-xl flex items-center gap-1.5 transition duration-200 shrink-0 border ${
                                    isRegistered
                                      ? 'bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100/50'
                                      : 'bg-emerald-600 border-emerald-600 text-white hover:bg-emerald-700 hover:shadow-sm'
                                  }`}
                                >
                                  {rsvpLoadingId === act.id ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  ) : isRegistered ? (
                                    <>
                                      <CheckCircle className="w-3.5 h-3.5" />
                                      Attending
                                    </>
                                  ) : (
                                    <>
                                      <Plus className="w-3.5 h-3.5" />
                                      Confirm Attendance
                                    </>
                                  )}
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Upload Lecture Slides Modal */}
      {uploadModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col animate-scaleUp">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <FileUp className="w-5 h-5 text-indigo-600" />
                <h3 className="font-extrabold text-sm text-slate-900">Publish Lecture Slide</h3>
              </div>
              <button
                onClick={() => setUploadModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUploadNotes} className="p-6 space-y-4 font-semibold text-xs text-slate-700">
              <div>
                <label className="block text-[9.5px] font-extrabold text-slate-500 uppercase tracking-wider mb-1.5 font-mono">
                  Subject *
                </label>
                <select
                  value={newSubjectId}
                  onChange={(e) => setNewSubjectId(e.target.value)}
                  className="w-full bg-white border border-slate-200 text-slate-800 rounded-xl py-2.5 px-3.5 text-xs focus:outline-none focus:border-indigo-500 transition cursor-pointer font-bold shadow-sm"
                >
                  {mockSubjects.map((sub) => (
                    <option key={sub.id} value={sub.id}>
                      {sub.name} ({sub.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[9.5px] font-extrabold text-slate-500 uppercase tracking-wider mb-1.5 font-mono">
                  Title *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Socket Programming Basics"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full bg-white border border-slate-200 text-slate-800 rounded-xl py-2.5 px-3.5 text-xs focus:outline-none focus:border-indigo-500 transition shadow-sm font-medium"
                />
              </div>

              <div>
                <label className="block text-[9.5px] font-extrabold text-slate-500 uppercase tracking-wider mb-1.5 font-mono">
                  Description
                </label>
                <textarea
                  rows={3}
                  placeholder="Brief description of lecture content..."
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  className="w-full bg-white border border-slate-200 text-slate-800 rounded-xl py-2.5 px-3.5 text-xs focus:outline-none focus:border-indigo-500 transition shadow-sm font-medium"
                />
              </div>

              <div>
                <label className="block text-[9.5px] font-extrabold text-slate-500 uppercase tracking-wider mb-1.5 font-mono">
                  File Attachment Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. CS606_Lab_Manual_Socket.pdf"
                  required
                  value={newFileName}
                  onChange={(e) => setNewFileName(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl py-2.5 px-3.5 text-xs focus:outline-none focus:border-indigo-500 transition font-mono shadow-sm"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setUploadModalOpen(false)}
                  className="border border-slate-205 hover:bg-slate-50 text-slate-600 px-4 py-2 text-xs font-bold rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading || !newTitle || !newFileName}
                  className="bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-855 text-white px-4 py-2 text-xs font-bold rounded-xl transition shadow-md shadow-indigo-500/10 flex items-center justify-center gap-1.5"
                >
                  {uploading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    'Publish Material'
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
