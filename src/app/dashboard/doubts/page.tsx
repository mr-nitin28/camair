'use client';

import React, { useState, useMemo } from 'react';
import { useAppStore } from '@/lib/store';
import {
  HelpCircle,
  ArrowLeft,
  Plus,
  Send,
  MessageSquare,
  CheckCircle,
  XCircle,
  Sparkles,
  Loader2,
  X,
} from 'lucide-react';
import Link from 'next/link';

// Detailed Mock Doubt Tickets and Messages
const mockSubjects = [
  { id: 'sub-cd', code: 'CS-601', name: 'Compiler Design' },
  { id: 'sub-cn', code: 'CS-602', name: 'Computer Networks' },
  { id: 'sub-se', code: 'CS-603', name: 'Software Engineering' },
];

const mockDoubts = [
  {
    id: 'd1',
    title: 'Minimization of DFA containing sink states',
    description: 'I am trying to minimize the DFA for (a|b)*a(a|b) but get confused about partitioning transitions that lead to dead/sink states.',
    status: 'Open',
    category: 'Academic',
    subject_id: 'sub-cd',
    created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
    subjects: mockSubjects[0],
  },
  {
    id: 'd2',
    title: 'OSPF vs RIP Convergence loops',
    description: 'Why is OSPF convergence faster than RIP link state protocols? Does OSPF also suffer from the count-to-infinity loop limit?',
    status: 'Resolved',
    category: 'Practical',
    subject_id: 'sub-cn',
    created_at: new Date(Date.now() - 3600000 * 24 * 2).toISOString(),
    subjects: mockSubjects[1],
  },
];

const mockMessages: Record<string, any[]> = {
  'd1': [
    {
      id: 'm1_1',
      doubt_id: 'd1',
      sender_name: 'Aarav Sharma',
      sender_role: 'Student',
      message: 'Hi Professor, I am trying to minimize the DFA but I am getting confused about how to treat states that transition to dead states. Do we group them together first?',
      created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
    },
    {
      id: 'm1_2',
      doubt_id: 'd1',
      sender_name: 'Dr. Ramesh Kumar',
      sender_role: 'Advisor',
      message: 'Hello Aarav, yes, dead/sink states can be combined into a single sink state. Once grouped, write out the state transition table and partition them using partition refinement (P0, P1 etc.). Try that and post your progress.',
      created_at: new Date(Date.now() - 3600000 * 1.5).toISOString(),
    },
  ],
  'd2': [
    {
      id: 'm2_1',
      doubt_id: 'd2',
      sender_name: 'Aarav Sharma',
      sender_role: 'Student',
      message: 'Hi Professor, does OSPF also suffer from RIP count-to-infinity routing loop issues?',
      created_at: new Date(Date.now() - 3600000 * 24 * 2).toISOString(),
    },
    {
      id: 'm2_2',
      doubt_id: 'd2',
      sender_name: 'Prof. Ananya Sen',
      sender_role: 'Advisor',
      message: 'Hello Aarav, OSPF uses link-state routing based on Dijkstra algorithm. Since each router maintains a complete topological map of the network, loops do not occur and it does not suffer from count-to-infinity.',
      created_at: new Date(Date.now() - 3600000 * 24 * 1.9).toISOString(),
    },
    {
      id: 'm2_3',
      doubt_id: 'd2',
      sender_name: 'Aarav Sharma',
      sender_role: 'Student',
      message: 'Excellent, thank you professor. That clears up my query.',
      created_at: new Date(Date.now() - 3600000 * 24 * 1.8).toISOString(),
    },
  ],
};

export default function DoubtResolutionPage() {
  const { student } = useAppStore();
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedDoubtId, setSelectedDoubtId] = useState<string | null>('d1');

  // New Doubt Form State
  const [subjectId, setSubjectId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Academic');
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Thread Message State
  const [replyText, setReplyText] = useState('');

  // Local state to store added doubts and messages in memory
  const [localDoubts, setLocalDoubts] = useState<any[]>([]);
  const [localMessages, setLocalMessages] = useState<Record<string, any[]>>({});

  const displaySubjects = mockSubjects;

  const displayDoubts = useMemo(() => {
    return [...localDoubts, ...mockDoubts];
  }, [localDoubts]);

  const activeDoubt = useMemo(() => {
    return displayDoubts.find((d) => d.id === selectedDoubtId);
  }, [displayDoubts, selectedDoubtId]);

  const displayMessages = useMemo(() => {
    if (!selectedDoubtId) return [];
    const local = localMessages[selectedDoubtId] || [];
    const mock = mockMessages[selectedDoubtId] || [];
    return [...mock, ...local];
  }, [selectedDoubtId, localMessages]);

  // Load local doubts & messages on mount
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedDoubts = localStorage.getItem('local_doubts');
      if (storedDoubts) {
        try {
          setLocalDoubts(JSON.parse(storedDoubts));
        } catch (e) {
          console.error(e);
        }
      }
      const storedMessages = localStorage.getItem('local_doubt_messages');
      if (storedMessages) {
        try {
          setLocalMessages(JSON.parse(storedMessages));
        } catch (e) {
          console.error(e);
        }
      }
    }
  }, []);

  const handleCreateDoubt = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !description) {
      setFormError('Please fill in both title and description.');
      return;
    }
    setFormError(null);
    setSubmitting(true);

    setTimeout(() => {
      const selectedSub = displaySubjects.find((s) => s.id === subjectId) || displaySubjects[0];
      const newDoubt = {
        id: `local-doubt-${Date.now()}`,
        title,
        description,
        status: 'Open',
        category,
        subject_id: subjectId,
        created_at: new Date().toISOString(),
        subjects: selectedSub,
      };

      setLocalDoubts((prev) => {
        const updated = [newDoubt, ...prev];
        localStorage.setItem('local_doubts', JSON.stringify(updated));
        return updated;
      });
      setTitle('');
      setDescription('');
      setSubjectId('');
      setCategory('Academic');
      setModalOpen(false);
      setSubmitting(false);
      setSelectedDoubtId(newDoubt.id);
    }, 700);
  };

  const handleSendReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !selectedDoubtId) return;

    const newMsg = {
      id: `local-msg-${Date.now()}`,
      doubt_id: selectedDoubtId,
      sender_name: 'Aarav Sharma',
      sender_role: 'Student',
      message: replyText,
      created_at: new Date().toISOString(),
    };

    setLocalMessages((prev) => {
      const updatedMessages = [...(prev[selectedDoubtId] || []), newMsg];
      const updated = {
        ...prev,
        [selectedDoubtId]: updatedMessages,
      };
      localStorage.setItem('local_doubt_messages', JSON.stringify(updated));
      return updated;
    });

    setReplyText('');

    // Simulate Advisor Reply
    setTimeout(() => {
      const advisorMsg = {
        id: `local-advisor-${Date.now()}`,
        doubt_id: selectedDoubtId,
        sender_name: activeDoubt?.subjects?.faculty_name || 'Dr. Ramesh Kumar',
        sender_role: 'Advisor',
        message: `Got it! I will inspect this detail. Let's trace this code compile pattern tomorrow in lecture.`,
        created_at: new Date().toISOString(),
      };
      setLocalMessages((prev) => {
        const updatedMessages = [...(prev[selectedDoubtId] || []), advisorMsg];
        const updated = {
          ...prev,
          [selectedDoubtId]: updatedMessages,
        };
        localStorage.setItem('local_doubt_messages', JSON.stringify(updated));
        return updated;
      });
    }, 1500);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Link href="/dashboard" className="text-xs text-slate-500 hover:text-indigo-600 font-semibold flex items-center gap-1 mb-2">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
          </Link>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Doubt Resolution Box</h2>
          <p className="text-slate-600 text-xs mt-1">Submit academic or exam queries to course advisors and track conversation threads.</p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white px-4 py-2.5 text-xs font-bold rounded-xl flex items-center gap-1.5 transition shadow shadow-indigo-600/10 shrink-0 self-start sm:self-auto"
        >
          <Plus className="w-4.5 h-4.5" /> Ask a Question
        </button>
      </div>

      {/* Grid: Tickets List & Live Chat Thread */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Doubts Tickets list */}
        <div className="lg:col-span-1 space-y-4">
          <h3 className="text-sm font-bold text-slate-800">Your Doubt Tickets</h3>
          {displayDoubts.length === 0 ? (
            <div className="text-center py-12 bg-white border border-slate-200 rounded-3xl shadow-sm">
              <HelpCircle className="w-9 h-9 text-slate-400 mx-auto mb-3" />
              <p className="text-xs font-bold text-slate-700">No doubts raised yet</p>
              <p className="text-[10px] text-slate-500 mt-1">Submit a question using the button above.</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
              {displayDoubts.map((doubt: any) => {
                const isSelected = selectedDoubtId === doubt.id;
                return (
                  <div
                    key={doubt.id}
                    onClick={() => setSelectedDoubtId(doubt.id)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer text-left ${
                      isSelected
                        ? 'border-indigo-400 bg-white ring-1 ring-indigo-500/10 shadow-sm shadow-indigo-600/5 animate-fadeIn'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 font-mono text-[9px] font-extrabold">
                      <span className="uppercase px-2 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-md">
                        {doubt.category}
                      </span>
                      <span
                        className={`uppercase px-2 py-0.5 border rounded-full ${
                          doubt.status === 'Resolved'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                            : 'bg-amber-50 text-amber-700 border-amber-100'
                        }`}
                      >
                        {doubt.status}
                      </span>
                    </div>
                    <h4 className="text-xs font-bold text-slate-900 mt-2.5 line-clamp-1">{doubt.title}</h4>
                    <p className="text-[10px] text-slate-500 mt-0.5 font-bold line-clamp-1">{doubt.subjects?.name || 'General'}</p>
                    <span className="text-[8.5px] text-slate-500 block mt-2 font-mono font-bold">
                      {new Date(doubt.created_at).toLocaleDateString()}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Dynamic Conversation Thread Section */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-3xl shadow-sm flex flex-col h-[75vh]">
          {selectedDoubtId && activeDoubt ? (
            <>
              {/* Thread Header */}
              <div className="p-4 border-b border-slate-200 flex items-center justify-between shrink-0">
                <div>
                  <h3 className="text-xs font-extrabold text-slate-900">{activeDoubt.title}</h3>
                  <span className="text-[9.5px] text-slate-500 font-bold">
                    {activeDoubt.subjects?.name || 'General Query'} • {activeDoubt.category}
                  </span>
                </div>
                <button
                  onClick={() => setSelectedDoubtId(null)}
                  className="lg:hidden p-1 text-slate-500 hover:text-slate-700 rounded-lg hover:bg-slate-100"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
              </div>

              {/* Chat Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {/* Doubt description first */}
                <div className="bg-slate-50 border border-slate-200/60 p-4.5 rounded-2xl space-y-2">
                  <span className="text-[8.5px] font-bold text-slate-500 uppercase tracking-widest font-mono">Issue Description</span>
                  <p className="text-slate-700 text-xs leading-relaxed font-semibold">{activeDoubt.description}</p>
                </div>

                <div className="flex items-center justify-center gap-1.5 py-2 text-[9.5px] text-slate-500 uppercase tracking-widest font-mono font-bold">
                  <MessageSquare className="w-3.5 h-3.5 text-slate-400" />
                  <span>Discussion Stream</span>
                </div>

                {displayMessages.map((msg: any) => {
                  const isAdvisor = msg.sender_role === 'Advisor' || msg.sender_role === 'Faculty';
                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col max-w-[80%] ${isAdvisor ? 'mr-auto items-start animate-fadeIn' : 'ml-auto items-end animate-fadeIn'}`}
                    >
                      <div className="flex items-baseline gap-2 mb-1">
                        <span className="text-[9.5px] text-slate-500 font-bold">{msg.sender_name}</span>
                        <span className="text-[8px] text-slate-500 font-mono font-bold px-1.5 bg-slate-100 rounded">
                          {msg.sender_role}
                        </span>
                      </div>
                      <div
                        className={`p-3 rounded-2xl text-xs font-semibold leading-relaxed ${
                          isAdvisor
                            ? 'bg-white text-slate-800 border border-slate-205 rounded-tl-none shadow-sm'
                            : 'bg-indigo-600 text-white rounded-tr-none'
                        }`}
                      >
                        {msg.message}
                      </div>
                      <span className="text-[8px] text-slate-400 mt-1 font-mono font-bold">
                        {new Date(msg.created_at).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Chat Input Footer */}
              <form onSubmit={handleSendReply} className="p-4 border-t border-slate-200 shrink-0 flex gap-2">
                <input
                  type="text"
                  placeholder={activeDoubt.status === 'Resolved' ? 'This doubt is resolved.' : 'Type your message/reply...'}
                  disabled={activeDoubt.status === 'Resolved'}
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  className="flex-grow bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-indigo-500 text-slate-800 placeholder-slate-400 font-semibold shadow-sm"
                />
                <button
                  type="submit"
                  disabled={activeDoubt.status === 'Resolved'}
                  className="bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white p-2.5 rounded-xl transition disabled:opacity-50"
                >
                  <Send className="w-4 h-4 text-white" />
                </button>
              </form>
            </>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-6">
              <MessageSquare className="w-12 h-12 text-slate-400 mb-3 animate-pulse" />
              <p className="text-xs font-bold text-slate-700">No conversation selected</p>
              <p className="text-[10px] text-slate-500 mt-1 font-semibold">Select a ticket from the left panel to inspect messages.</p>
            </div>
          )}
        </div>

      </div>

      {/* New Question Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-slate-900/65 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col animate-scaleUp">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-650" />
                <h3 className="font-extrabold text-sm text-slate-900">Ask a Question</h3>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1.5 text-slate-450 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateDoubt} className="p-6 space-y-4 font-semibold text-xs text-slate-700">
              {formError && (
                <div className="bg-rose-50 border border-rose-100 text-rose-700 text-xs rounded-xl p-3 flex items-center gap-2">
                  <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[9.5px] font-extrabold text-slate-500 uppercase tracking-wider mb-1 font-mono">
                    Category *
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-white border border-slate-200 text-slate-800 rounded-xl py-2 px-3 text-xs focus:outline-none focus:border-indigo-500/40 transition cursor-pointer font-bold shadow-sm"
                  >
                    <option value="Academic">Academic</option>
                    <option value="Practical">Practical</option>
                    <option value="Administrative">Administrative</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[9.5px] font-extrabold text-slate-500 uppercase tracking-wider mb-1 font-mono">
                    Related Subject *
                  </label>
                  <select
                    value={subjectId}
                    onChange={(e) => setSubjectId(e.target.value)}
                    className="w-full bg-white border border-slate-200 text-slate-800 rounded-xl py-2 px-3 text-xs focus:outline-none focus:border-indigo-500/40 transition cursor-pointer font-bold shadow-sm"
                  >
                    <option value="">General Query</option>
                    {displaySubjects.map((sub: any) => (
                      <option key={sub.id} value={sub.id}>
                        {sub.name} ({sub.code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[9.5px] font-extrabold text-slate-500 uppercase tracking-wider mb-1 font-mono">
                  Question Headline / Title *
                </label>
                <input
                  type="text"
                  placeholder="e.g. State minimization table in Compiler Design"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-white border border-slate-200 text-slate-800 rounded-xl py-2 px-3 text-xs focus:outline-none focus:border-indigo-500/40 transition"
                />
              </div>

              <div>
                <label className="block text-[9.5px] font-extrabold text-slate-500 uppercase tracking-wider mb-1 font-mono">
                  Detailed Query Description *
                </label>
                <textarea
                  rows={4}
                  placeholder="Elaborate your query or question code context..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
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
                    'Submit Ticket'
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
