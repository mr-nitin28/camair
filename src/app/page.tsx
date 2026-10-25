'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  GraduationCap,
  Sparkles,
  ShieldCheck,
  Zap,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Layers,
  Users,
  Building2,
  CalendarCheck,
  CreditCard,
  Award,
  Bot,
  Sun,
  Moon,
  ChevronRight,
  Database,
  Lock,
  Compass,
  FileSpreadsheet,
  Check,
} from 'lucide-react';

export default function CampAILandingPage() {
  const router = useRouter();

  // Active persona preview: 'student' | 'faculty' | 'admin' | 'camai'
  const [activePersona, setActivePersona] = useState<'student' | 'faculty' | 'admin' | 'camai'>('student');

  // Attendance recovery calculator interactive sandbox state
  const [calcTotal, setCalcTotal] = useState(40);
  const [calcAttended, setCalcAttended] = useState(28);

  // Theme state
  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== 'undefined') {
      return document.documentElement.classList.contains('dark');
    }
    return false;
  });

  const toggleTheme = () => {
    const nextDark = !isDark;
    setIsDark(nextDark);
    if (nextDark) {
      document.documentElement.classList.add('dark');
      document.documentElement.setAttribute('data-theme', 'dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.removeAttribute('data-theme');
      localStorage.setItem('theme', 'light');
    }
  };

  // Quick jump helper that also configures mock role
  const handleLaunchPersona = (role: 'student' | 'faculty' | 'admin', path: string) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('mock_user_role', role);
      if (role === 'student') localStorage.setItem('mock_user_name', 'Aarav Sharma');
      if (role === 'faculty') localStorage.setItem('mock_user_name', 'Dr. Rajesh Rao');
      if (role === 'admin') localStorage.setItem('mock_user_name', 'Dean Office Admin');
    }
    router.push(path);
  };

  // Math for attendance calculator
  const calcPct = calcTotal > 0 ? (calcAttended / calcTotal) * 100 : 0;
  const isEligible = calcPct >= 75;
  // Formula: ceil((0.75 * T - A) / 0.25)
  const recoveryNeeded = !isEligible ? Math.max(0, Math.ceil((0.75 * calcTotal - calcAttended) / 0.25)) : 0;
  // Buffer formula: floor((A - 0.75 * T) / 0.75)
  const bufferAllowed = isEligible ? Math.max(0, Math.floor((calcAttended - 0.75 * calcTotal) / 0.75)) : 0;

  // Interactive Roll Call simulation state for Faculty tab
  const [simRoster, setSimRoster] = useState([
    { id: '1', name: 'Aarav Sharma', roll: 'CS-042', status: 'P' },
    { id: '2', name: 'Ishita Patel', roll: 'CS-018', status: 'P' },
    { id: '3', name: 'Rohan Deshmukh', roll: 'CS-089', status: 'A' },
    { id: '4', name: 'Ananya Roy', roll: 'CS-012', status: 'L' },
  ]);

  const toggleSimStatus = (id: string, current: string) => {
    const next = current === 'P' ? 'A' : current === 'A' ? 'L' : 'P';
    setSimRoster((prev) => prev.map((s) => (s.id === id ? { ...s, status: next } : s)));
  };

  // Interactive CamAI query prompt state
  const [camaiPrompt, setCamaiPrompt] = useState('How many classes can I miss before falling below 75%?');
  const [camaiAnswer, setCamaiAnswer] = useState<{ text: string; tag: string }>({
    text: 'Based on your Compiler Design attendance (34/38 = 89.5%), you have a safety buffer of 7 consecutive classes before dropping below the institutional 75% threshold.',
    tag: 'Attendance Forecaster',
  });

  const handleSimCamAiQuery = (query: string) => {
    setCamaiPrompt(query);
    if (query.includes('75%') || query.includes('miss')) {
      setCamaiAnswer({
        text: 'Based on your current aggregate attendance across 5 subjects (84.6%), you have a safety buffer of 4 classes before risking examination detainment.',
        tag: 'Policy Engine',
      });
    } else if (query.includes('schedule') || query.includes('exam')) {
      setCamaiAnswer({
        text: 'Upcoming Mid-Semester Exam: CS-601 Compiler Design on July 5th at 10:00 AM (LH-101). Hall ticket clearance: Verified (No fee or attendance holds).',
        tag: 'Exam Schedule Feed',
      });
    } else if (query.includes('fee')) {
      setCamaiAnswer({
        text: 'Semester 6 Tuition (₹95,000) and Exam Fee (₹2,500) are fully cleared. Outstanding balance: ₹120 (Library overdue fine).',
        tag: 'Financial Ledger',
      });
    } else {
      setCamaiAnswer({
        text: 'Medical leave submitted on June 25th is currently marked "Approved" by Faculty Advisor Dr. Rajesh Rao. Attendance adjustment has been credited.',
        tag: 'Workflow Engine',
      });
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)] transition-colors duration-150 flex flex-col selection:bg-[var(--accent-soft)] selection:text-[var(--accent)]">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-50 bg-[var(--surface)]/90 backdrop-blur-md border-b border-[var(--border)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-700 text-white flex items-center justify-center font-extrabold shadow-md shadow-indigo-600/20">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base tracking-tight text-[var(--text)]">CampAI</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                  CampusOS
                </span>
              </div>
              <span className="text-[10px] font-medium text-[var(--text-muted)] hidden sm:block">
                Academic Operating System
              </span>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-1.5 text-xs font-semibold text-[var(--text-muted)]">
            <button
              type="button"
              onClick={() => handleLaunchPersona('student', '/dashboard')}
              className="px-3 py-2 rounded-lg hover:text-[var(--text)] hover:bg-[var(--surface-2)] transition-colors cursor-pointer"
            >
              Student Portal
            </button>
            <button
              type="button"
              onClick={() => handleLaunchPersona('faculty', '/faculty')}
              className="px-3 py-2 rounded-lg hover:text-[var(--text)] hover:bg-[var(--surface-2)] transition-colors cursor-pointer"
            >
              Faculty Workspace
            </button>
            <button
              type="button"
              onClick={() => handleLaunchPersona('admin', '/admin')}
              className="px-3 py-2 rounded-lg hover:text-[var(--text)] hover:bg-[var(--surface-2)] transition-colors cursor-pointer"
            >
              Admin Command
            </button>
            <Link
              href="/dashboard/camai"
              className="px-3 py-2 rounded-lg hover:text-[var(--text)] hover:bg-[var(--surface-2)] transition-colors flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>CamAI Copilot</span>
            </Link>
            <Link
              href="/design-system"
              className="px-3 py-2 rounded-lg hover:text-[var(--text)] hover:bg-[var(--surface-2)] transition-colors"
            >
              Design System
            </Link>
          </nav>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={toggleTheme}
              className="min-w-[40px] min-h-[40px] p-2 rounded-xl text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-2)] transition-colors cursor-pointer flex items-center justify-center border border-[var(--border)]"
              aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
            </button>

            <Link
              href="/login"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-md shadow-indigo-600/20 active:scale-95"
            >
              <span>Sign In</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-20 border-b border-[var(--border)] bg-gradient-to-b from-[var(--surface)] via-[var(--bg)] to-[var(--bg)]">
        {/* Ambient Glows */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-indigo-500/10 dark:bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-3xl mx-auto space-y-4">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-xs font-bold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Next-Gen Higher Education Operating Platform</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-[var(--text)] leading-tight">
              Higher Ed Operations. <br />
              <span className="bg-gradient-to-r from-indigo-600 via-indigo-500 to-teal-500 bg-clip-text text-transparent">
                Accelerated with Precision.
              </span>
            </h1>

            <p className="text-base sm:text-lg text-[var(--text-muted)] leading-relaxed">
              Unified workflows for Students, Faculty, and Institutional Leadership. Powered by authoritative
              calculations, sub-millisecond PostgreSQL benchmarks, Row Level Security, and context-aware campus AI.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => handleLaunchPersona('student', '/dashboard')}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-lg shadow-indigo-600/25 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
              >
                <span>Launch Student Experience</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => handleLaunchPersona('faculty', '/faculty')}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[var(--surface)] border border-[var(--border)] hover:bg-[var(--surface-2)] text-[var(--text)] font-bold text-sm transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
              >
                <span>Faculty Speed Roll-Call</span>
              </button>

              <button
                type="button"
                onClick={() => handleLaunchPersona('admin', '/admin')}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[var(--surface)] border border-[var(--border)] hover:bg-[var(--surface-2)] text-[var(--text)] font-bold text-sm transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
              >
                <span>Admin Command Center</span>
              </button>
            </div>

            {/* Quick Metrics Strip */}
            <div className="pt-6 flex flex-wrap items-center justify-center gap-6 sm:gap-10 text-xs font-medium text-[var(--text-muted)]">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span>30 Tables with 100% RLS</span>
              </div>
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-500" />
                <span>1.24ms p95 Read Latency</span>
              </div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-indigo-500" />
                <span>WCAG 2.2 AA Contrast (18.5:1)</span>
              </div>
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-purple-500" />
                <span>Bundle Budget ≤200kB</span>
              </div>
            </div>
          </div>

          {/* Interactive Persona Playground (Hero Showcase) */}
          <div className="mt-12 max-w-5xl mx-auto rounded-3xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl overflow-hidden">
            {/* Persona Selector Tabs */}
            <div className="flex items-center border-b border-[var(--border)] bg-[var(--surface-2)]/50 p-2 overflow-x-auto gap-1">
              <button
                type="button"
                onClick={() => setActivePersona('student')}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
                  activePersona === 'student'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                    : 'text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-2)]'
                }`}
              >
                <GraduationCap className="w-4 h-4" />
                <span>Student Experience</span>
              </button>

              <button
                type="button"
                onClick={() => setActivePersona('faculty')}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
                  activePersona === 'faculty'
                    ? 'bg-teal-600 text-white shadow-md shadow-teal-600/20'
                    : 'text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-2)]'
                }`}
              >
                <CalendarCheck className="w-4 h-4" />
                <span>Faculty Console</span>
              </button>

              <button
                type="button"
                onClick={() => setActivePersona('admin')}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
                  activePersona === 'admin'
                    ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20'
                    : 'text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-2)]'
                }`}
              >
                <Building2 className="w-4 h-4" />
                <span>Admin Governance</span>
              </button>

              <button
                type="button"
                onClick={() => setActivePersona('camai')}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
                  activePersona === 'camai'
                    ? 'bg-amber-600 text-white shadow-md shadow-amber-600/20'
                    : 'text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-2)]'
                }`}
              >
                <Sparkles className="w-4 h-4" />
                <span>CamAI Intelligence</span>
              </button>
            </div>

            {/* Persona Interactive Content Area */}
            <div className="p-6 sm:p-8">
              {/* STUDENT TAB */}
              {activePersona === 'student' && (
                <div className="space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[var(--border)]">
                    <div>
                      <span className="text-[10px] font-extrabold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
                        Student Self-Service Portal
                      </span>
                      <h3 className="text-xl font-extrabold text-[var(--text)] mt-0.5">
                        Aarav Sharma • B.Tech CSE (Sem 6)
                      </h3>
                      <p className="text-xs text-[var(--text-muted)]">STU-2023-0042 • Real-time Attendance & Grade Ledger</p>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleLaunchPersona('student', '/dashboard')}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all cursor-pointer self-start sm:self-auto"
                    >
                      <span>Open Full Portal</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Authoritative Attendance Gauge */}
                    <div className="p-5 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)]/40 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-bold text-[var(--text)]">Cumulative Attendance</span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                            Eligible (≥75%)
                          </span>
                        </div>
                        <div className="flex items-center gap-4 my-3">
                          <div className="w-16 h-16 rounded-full border-4 border-emerald-500 flex items-center justify-center font-extrabold text-sm text-[var(--text)]">
                            84.6%
                          </div>
                          <div>
                            <div className="text-xs font-bold text-[var(--text)]">33 of 39 Classes</div>
                            <div className="text-[11px] text-[var(--text-muted)] mt-0.5">
                              Safety buffer: <strong className="text-emerald-600 dark:text-emerald-400">4 classes</strong>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="text-[11px] text-[var(--text-muted)] pt-3 border-t border-[var(--border)]">
                        Threshold marker: <strong>75.0%</strong> institutional requirement.
                      </div>
                    </div>

                    {/* Academic Performance */}
                    <div className="p-5 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)]/40 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-bold text-[var(--text)]">CGPA Trajectory</span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/15 text-purple-600 dark:text-purple-400">
                            Distinction
                          </span>
                        </div>
                        <div className="my-2">
                          <div className="text-3xl font-extrabold text-[var(--text)]">8.72</div>
                          <div className="text-xs text-[var(--text-muted)] mt-0.5">Sem 5 SGPA: 8.94 / 10.0</div>
                        </div>
                      </div>
                      <div className="text-[11px] text-purple-600 dark:text-purple-400 font-medium pt-3 border-t border-[var(--border)]">
                        All 24 enrolled credits cleared with zero backlogs.
                      </div>
                    </div>

                    {/* Next Class Schedule */}
                    <div className="p-5 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)]/40 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-bold text-[var(--text)]">Next Class</span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/15 text-indigo-600 dark:text-indigo-400">
                            10:00 AM
                          </span>
                        </div>
                        <h4 className="text-sm font-extrabold text-[var(--text)] mt-1">CS-601: Compiler Design</h4>
                        <p className="text-xs text-[var(--text-muted)] mt-0.5">Prof. Rajesh Rao • Lecture Hall 101</p>
                      </div>
                      <div className="text-[11px] text-[var(--text-muted)] pt-3 border-t border-[var(--border)] flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-indigo-500" />
                        <span>Starts in 25 minutes</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* FACULTY TAB */}
              {activePersona === 'faculty' && (
                <div className="space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[var(--border)]">
                    <div>
                      <span className="text-[10px] font-extrabold uppercase tracking-widest text-teal-600 dark:text-teal-400">
                        Faculty Productivity Workspace
                      </span>
                      <h3 className="text-xl font-extrabold text-[var(--text)] mt-0.5">
                        Dr. Rajesh Rao • CSE Department
                      </h3>
                      <p className="text-xs text-[var(--text-muted)]">Speed Roll-Call Screen & Marks Spreadsheet</p>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleLaunchPersona('faculty', '/faculty')}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold transition-all cursor-pointer self-start sm:self-auto"
                    >
                      <span>Open Faculty Desk</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Interactive Roll Call Simulation Widget */}
                  <div className="p-5 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)]/30 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CalendarCheck className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                        <span className="text-xs font-bold text-[var(--text)]">
                          CS-601 Roll-Call Speed Mode (Click status to toggle P → A → L)
                        </span>
                      </div>
                      <span className="text-[10px] font-mono font-bold text-teal-600 dark:text-teal-400 bg-teal-500/10 px-2 py-0.5 rounded">
                        Keyboard shortcuts: P / A / L / Shift+A
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {simRoster.map((student) => (
                        <div
                          key={student.id}
                          className="flex items-center justify-between p-3 rounded-xl border border-[var(--border)] bg-[var(--surface)]"
                        >
                          <div>
                            <div className="text-xs font-bold text-[var(--text)]">{student.name}</div>
                            <div className="text-[10px] font-mono text-[var(--text-muted)]">{student.roll}</div>
                          </div>

                          <button
                            type="button"
                            onClick={() => toggleSimStatus(student.id, student.status)}
                            className={`w-9 h-9 rounded-xl font-bold text-xs flex items-center justify-center transition-all cursor-pointer shadow-xs ${
                              student.status === 'P'
                                ? 'bg-emerald-500 text-white shadow-emerald-500/20'
                                : student.status === 'A'
                                ? 'bg-rose-500 text-white shadow-rose-500/20'
                                : 'bg-amber-500 text-white shadow-amber-500/20'
                            }`}
                            title="Click to toggle status"
                          >
                            {student.status}
                          </button>
                        </div>
                      ))}
                    </div>

                    <div className="flex items-center justify-between text-xs text-[var(--text-muted)] pt-2 border-t border-[var(--border)]">
                      <span>Zero latency roster with RFC 4180 Excel copy-paste support.</span>
                      <span className="font-bold text-[var(--text)]">Submit attendance with 8s undo window</span>
                    </div>
                  </div>
                </div>
              )}

              {/* ADMIN TAB */}
              {activePersona === 'admin' && (
                <div className="space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[var(--border)]">
                    <div>
                      <span className="text-[10px] font-extrabold uppercase tracking-widest text-purple-600 dark:text-purple-400">
                        Admin Executive Command Center
                      </span>
                      <h3 className="text-xl font-extrabold text-[var(--text)] mt-0.5">
                        Dean of Academic Operations
                      </h3>
                      <p className="text-xs text-[var(--text-muted)]">Multi-Tenant Institutional Governance & Ledgers</p>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleLaunchPersona('admin', '/admin')}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition-all cursor-pointer self-start sm:self-auto"
                    >
                      <span>Open Admin Center</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/40">
                      <div className="text-[10px] font-extrabold text-[var(--text-muted)] uppercase tracking-wider">
                        Total Enrolled
                      </div>
                      <div className="text-2xl font-black text-[var(--text)] mt-1">4,820</div>
                      <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold mt-1">
                        +5.2% vs last term
                      </div>
                    </div>

                    <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/40">
                      <div className="text-[10px] font-extrabold text-[var(--text-muted)] uppercase tracking-wider">
                        Fee Collections
                      </div>
                      <div className="text-2xl font-black text-[var(--text)] mt-1">₹14.28 Cr</div>
                      <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold mt-1">
                        94.1% reconciled
                      </div>
                    </div>

                    <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/40">
                      <div className="text-[10px] font-extrabold text-[var(--text-muted)] uppercase tracking-wider">
                        Campus Attendance
                      </div>
                      <div className="text-2xl font-black text-[var(--text)] mt-1">84.6%</div>
                      <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold mt-1">
                        +1.8% vs threshold
                      </div>
                    </div>

                    <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/40">
                      <div className="text-[10px] font-extrabold text-[var(--text-muted)] uppercase tracking-wider">
                        Audit Events
                      </div>
                      <div className="text-2xl font-black text-[var(--text)] mt-1">100%</div>
                      <div className="text-[10px] text-purple-600 dark:text-purple-400 font-bold mt-1">
                        Immutable ledger
                      </div>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/20 text-xs text-[var(--text-muted)] flex items-center justify-between">
                    <span>Double-entry minor currency ledgers recorded in paise with cryptographic integrity.</span>
                    <span className="font-bold text-[var(--text)]">30 Tables RLS Deny-By-Default</span>
                  </div>
                </div>
              )}

              {/* CAMAI TAB */}
              {activePersona === 'camai' && (
                <div className="space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[var(--border)]">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-extrabold uppercase tracking-widest text-amber-600 dark:text-amber-400">
                          CamAI Intelligence Copilot
                        </span>
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      </div>
                      <h3 className="text-xl font-extrabold text-[var(--text)] mt-0.5">
                        Context-Aware Academic Assistant
                      </h3>
                      <p className="text-xs text-[var(--text-muted)]">Natural Language Queries & Instant Data Cards</p>
                    </div>

                    <Link
                      href="/dashboard/camai"
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-all cursor-pointer self-start sm:self-auto"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Open CamAI Assistant</span>
                    </Link>
                  </div>

                  {/* Interactive Prompt Chip Selector */}
                  <div className="space-y-3">
                    <span className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider">
                      Try asking CamAI:
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {[
                        'How many classes can I miss before falling below 75%?',
                        'Show my upcoming exam schedule',
                        'Check fee due status',
                        'Status of my medical leave',
                      ].map((promptText) => (
                        <button
                          key={promptText}
                          type="button"
                          onClick={() => handleSimCamAiQuery(promptText)}
                          className={`text-xs px-3 py-1.5 rounded-lg border transition-all cursor-pointer text-left ${
                            camaiPrompt === promptText
                              ? 'border-amber-500 bg-amber-500/10 text-amber-700 dark:text-amber-300 font-bold'
                              : 'border-[var(--border)] bg-[var(--surface-2)]/60 text-[var(--text)] hover:border-amber-500/50'
                          }`}
                        >
                          &ldquo;{promptText}&rdquo;
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* AI Response Card */}
                  <div className="p-5 rounded-2xl border border-amber-500/30 bg-amber-500/5 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Bot className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                        <span className="text-xs font-bold text-[var(--text)]">CamAI Response</span>
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-500/15 text-amber-600 dark:text-amber-400">
                        {camaiAnswer.tag}
                      </span>
                    </div>
                    <p className="text-sm text-[var(--text)] leading-relaxed font-medium">
                      {camaiAnswer.text}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Interactive Attendance Recovery Mathematics Sandbox */}
      <section className="py-16 border-b border-[var(--border)] bg-[var(--surface)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center space-y-3 mb-10">
            <span className="text-xs font-extrabold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
              Deterministic Logic & Recovery Math
            </span>
            <h2 className="text-3xl font-black text-[var(--text)] tracking-tight">
              Institutional 75% Attendance Sandbox
            </h2>
            <p className="text-sm text-[var(--text-muted)]">
              Universities enforce strict 75% attendance limits to qualify for examinations. Test the authoritative
              recovery calculation formula live with custom parameters.
            </p>
          </div>

          <div className="max-w-4xl mx-auto p-6 sm:p-8 rounded-3xl border border-[var(--border)] bg-[var(--surface-2)]/30 shadow-lg">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
              {/* Sliders & Inputs */}
              <div className="space-y-6">
                <div>
                  <div className="flex justify-between items-center text-xs font-bold text-[var(--text)] mb-2">
                    <span>Total Classes Conducted:</span>
                    <span className="font-mono text-sm px-2 py-0.5 rounded bg-[var(--surface)] border border-[var(--border)]">
                      {calcTotal}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="100"
                    value={calcTotal}
                    onChange={(e) => {
                      const newTotal = Number(e.target.value);
                      setCalcTotal(newTotal);
                      if (calcAttended > newTotal) setCalcAttended(newTotal);
                    }}
                    className="w-full accent-indigo-600 cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center text-xs font-bold text-[var(--text)] mb-2">
                    <span>Classes Attended:</span>
                    <span className="font-mono text-sm px-2 py-0.5 rounded bg-[var(--surface)] border border-[var(--border)]">
                      {calcAttended}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max={calcTotal}
                    value={calcAttended}
                    onChange={(e) => setCalcAttended(Number(e.target.value))}
                    className="w-full accent-indigo-600 cursor-pointer"
                  />
                </div>

                <div className="p-3.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] space-y-1">
                  <div className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider">
                    Mathematical Formula
                  </div>
                  <code className="text-xs font-mono text-indigo-600 dark:text-indigo-400 block">
                    Recovery = Math.ceil((0.75 * Total - Attended) / 0.25)
                  </code>
                </div>
              </div>

              {/* Real-time Math Output Card */}
              <div className="p-6 rounded-2xl border border-[var(--border)] bg-[var(--surface)] flex flex-col items-center text-center space-y-4">
                <div
                  className={`w-28 h-28 rounded-full border-8 flex flex-col items-center justify-center transition-all ${
                    isEligible
                      ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                      : calcPct >= 70
                      ? 'border-amber-500 text-amber-600 dark:text-amber-400'
                      : 'border-rose-500 text-rose-600 dark:text-rose-400'
                  }`}
                >
                  <span className="text-2xl font-black">{calcPct.toFixed(1)}%</span>
                  <span className="text-[10px] font-bold uppercase">{isEligible ? 'Eligible' : 'Detained Risk'}</span>
                </div>

                <div>
                  <h4 className="text-base font-extrabold text-[var(--text)]">
                    {isEligible ? (
                      <span className="text-emerald-600 dark:text-emerald-400">Threshold Satisfied</span>
                    ) : (
                      <span className="text-rose-600 dark:text-rose-400">Attendance Deficit Detected</span>
                    )}
                  </h4>
                  <p className="text-xs text-[var(--text-muted)] mt-1 max-w-xs">
                    {isEligible
                      ? `You can safely miss up to ${bufferAllowed} upcoming class(es) while remaining at or above the 75% limit.`
                      : `You must attend the next ${recoveryNeeded} consecutive class(es) without absence to reach 75%.`}
                  </p>
                </div>

                <div className="w-full pt-3 border-t border-[var(--border)] flex justify-between items-center text-xs font-mono">
                  <span className="text-[var(--text-muted)]">Minimum Threshold:</span>
                  <span className="font-bold text-[var(--text)]">75.0%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Architecture & Engineering Standards Grid */}
      <section className="py-16 border-b border-[var(--border)] bg-[var(--bg)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center space-y-3 mb-12">
            <span className="text-xs font-extrabold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
              Production Architecture
            </span>
            <h2 className="text-3xl font-black text-[var(--text)] tracking-tight">
              Engineered for Institutional Scale
            </h2>
            <p className="text-sm text-[var(--text-muted)]">
              Built on Next.js 15 App Router, React 19, strict TypeScript, and PostgreSQL with Row Level Security.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-2xl border border-[var(--border)] bg-[var(--surface)] space-y-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
                <Database className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-[var(--text)]">PostgreSQL & Row Level Security</h3>
              <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                30 relational database tables protected by deny-by-default RLS policies. Tenant isolation guaranteed by
                institution_id on every row with zero leaks.
              </p>
            </div>

            <div className="p-6 rounded-2xl border border-[var(--border)] bg-[var(--surface)] space-y-3">
              <div className="w-10 h-10 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center font-bold">
                <Zap className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-[var(--text)]">Sub-Millisecond Read Latency</h3>
              <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                Single-row primary key reads clock at 1.24ms p95. Concurrent roll-call submissions run under row-level
                FOR UPDATE locks with 0 deadlocks.
              </p>
            </div>

            <div className="p-6 rounded-2xl border border-[var(--border)] bg-[var(--surface)] space-y-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-[var(--text)]">WCAG 2.2 AA & Motion Safety</h3>
              <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                18.5:1 text-to-surface contrast in light mode and 17.1:1 in dark mode. Full reduced-motion collapsing
                to &le;0.01s with keyboard focus traps on all modals.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 bg-[var(--surface)] border-t border-[var(--border)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold shadow-sm">
                <GraduationCap className="w-4 h-4" />
              </div>
              <div>
                <span className="font-extrabold text-sm text-[var(--text)]">CampAI (CampusOS)</span>
                <span className="text-[11px] text-[var(--text-muted)] block">Next-Gen Academic Engine</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-6 text-xs font-semibold text-[var(--text-muted)]">
              <button
                type="button"
                onClick={() => handleLaunchPersona('student', '/dashboard')}
                className="hover:text-[var(--text)] transition-colors cursor-pointer"
              >
                Student Portal
              </button>
              <button
                type="button"
                onClick={() => handleLaunchPersona('faculty', '/faculty')}
                className="hover:text-[var(--text)] transition-colors cursor-pointer"
              >
                Faculty Workspace
              </button>
              <button
                type="button"
                onClick={() => handleLaunchPersona('admin', '/admin')}
                className="hover:text-[var(--text)] transition-colors cursor-pointer"
              >
                Admin Command
              </button>
              <Link href="/dashboard/camai" className="hover:text-[var(--text)] transition-colors">
                CamAI Copilot
              </Link>
              <Link href="/design-system" className="hover:text-[var(--text)] transition-colors">
                Design System
              </Link>
              <Link href="/login" className="hover:text-[var(--text)] transition-colors">
                Sign In
              </Link>
            </div>

            <div className="text-[11px] text-[var(--text-muted)] font-mono">
              &copy; {new Date().getFullYear()} CampAI • All Rights Reserved
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
