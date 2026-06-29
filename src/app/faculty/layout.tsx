'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAppStore } from '@/lib/store';
import { motion, AnimatePresence } from 'framer-motion';
import {
  GraduationCap,
  LayoutDashboard,
  Users,
  Compass,
  CalendarCheck,
  TrendingUp,
  FileEdit,
  FileText,
  Boxes,
  MessageSquare,
  Megaphone,
  HelpCircle,
  CalendarClock,
  Award,
  Settings,
  LogOut,
  Bell,
  Menu,
  X,
  User,
  Loader2,
  CheckCircle,
  ChevronRight,
  ChevronLeft,
} from 'lucide-react';
import Link from 'next/link';

// Grouped navItems for Desktop Sidebar
const desktopGroups = [
  {
    title: 'Resource Center',
    items: [
      { label: 'CamAI Unified Chat', href: '/faculty/camai', icon: MessageSquare },
    ],
  },
  {
    title: 'Core Console',
    items: [
      { label: 'Overview Dashboard', href: '/faculty', icon: LayoutDashboard },
    ],
  },
  {
    title: 'Student Management',
    items: [
      { label: 'Students Directory', href: '/faculty/students', icon: Users },
      { label: 'Risk Monitor', href: '/faculty/performance', icon: TrendingUp },
    ],
  },
  {
    title: 'Academic Services',
    items: [
      { label: 'Assigned Classes', href: '/faculty/classes', icon: Compass },
      { label: 'Mark Attendance', href: '/faculty/attendance', icon: CalendarCheck },
      { label: 'Exams & Grades', href: '/faculty/exams', icon: Award },
      { label: 'Notes & Resources', href: '/faculty/notes', icon: FileText },
      { label: 'Assignments Desk', href: '/faculty/assignments', icon: FileEdit },
    ],
  },
  {
    title: 'Communication & Approvals',
    items: [
      { label: 'Communication Hub', href: '/faculty/messages', icon: MessageSquare },
      { label: 'Alerts & Notices', href: '/faculty/announcements', icon: Megaphone },
      { label: 'Doubts Inbox', href: '/faculty/doubts', icon: HelpCircle },
      { label: 'Leave Approvals', href: '/faculty/leaves', icon: CalendarClock },
      { label: 'Student Groups', href: '/faculty/groups', icon: Boxes },
    ],
  },
];

// Mobile Bottom Navigation Tabs (Exactly 5 items)
const mobileTabs = [
  { label: 'Dashboard', href: '/faculty', icon: LayoutDashboard, pattern: /^\/faculty$/ },
  { label: 'Students', href: '/faculty/students', icon: Users, pattern: /^\/faculty\/(students|performance)/ },
  { label: 'Attendance', href: '/faculty/attendance', icon: CalendarCheck, pattern: /^\/faculty\/(attendance|classes)/ },
  { label: 'Communication', href: '/faculty/messages', icon: MessageSquare, pattern: /^\/faculty\/(messages|announcements|doubts|camai)/ },
  { label: 'Profile', href: '/faculty/settings', icon: User, pattern: /^\/faculty\/(settings|leaves|exams|notes|groups)/ },
];

// Mobile Top Sub-navigation options
const subNavGroups = {
  students: [
    { label: 'Directory', href: '/faculty/students' },
    { label: 'Risk Monitor', href: '/faculty/performance' },
  ],
  attendance: [
    { label: 'Mark Attendance', href: '/faculty/attendance' },
    { label: 'Assigned Classes', href: '/faculty/classes' },
  ],
  communication: [
    { label: 'CamAI Chat', href: '/faculty/camai' },
    { label: 'Messages', href: '/faculty/messages' },
    { label: 'Notices', href: '/faculty/announcements' },
    { label: 'Doubts Inbox', href: '/faculty/doubts' },
  ],
  profile: [
    { label: 'Settings', href: '/faculty/settings' },
    { label: 'Leaves', href: '/faculty/leaves' },
    { label: 'Exams & Grades', href: '/faculty/exams' },
    { label: 'Notes', href: '/faculty/notes' },
    { label: 'Groups', href: '/faculty/groups' },
  ],
};

export default function FacultyLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const {
    faculty,
    setFaculty,
    unreadNotificationsCount,
    setUnreadNotificationsCount,
  } = useAppStore();

  const [loading, setLoading] = useState(true);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Auth check & Profile Fetch — bypasses Supabase auth, uses mock profile for dev
  useEffect(() => {
    let active = true;

    async function checkAuth() {
      try {
        // Try real Supabase auth first
        const { data: { session } } = await supabase.auth.getSession();

        if (session && session.user.email === 'faculty@campusos.dev') {
          // Real faculty session exists, try fetching profile
          const { data: profile, error } = await supabase
            .from('faculty')
            .select(`
              *,
              departments(name, code)
            `)
            .eq('id', session.user.id)
            .single();

          if (!error && profile && active) {
            setFaculty(profile);
            fetchNotifications(session.user.id);
            return;
          }
        }

        // Fallback: use mock faculty profile so UI is fully visible
        if (active) {
          const mockFaculty = {
            id: 'mock-faculty-001',
            faculty_id: 'FAC-2026-001',
            first_name: 'Priya',
            last_name: 'Verma',
            email: 'faculty@campusos.dev',
            phone: '+91-9876543211',
            department_id: 'dept-cs',
            created_at: '2022-01-15T00:00:00Z',
            departments: { name: 'Computer Science & Engineering', code: 'CSE' },
          };
          setFaculty(mockFaculty as any);
        }
      } catch (err) {
        console.error(err);
        // Even on error, set mock profile so UI renders
        if (active) {
          const mockFaculty = {
            id: 'mock-faculty-001',
            faculty_id: 'FAC-2026-001',
            first_name: 'Priya',
            last_name: 'Verma',
            email: 'faculty@campusos.dev',
            phone: '+91-9876543211',
            department_id: 'dept-cs',
            created_at: '2022-01-15T00:00:00Z',
            departments: { name: 'Computer Science & Engineering', code: 'CSE' },
          };
          setFaculty(mockFaculty as any);
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    checkAuth();

    return () => {
      active = false;
    };
  }, [router, setFaculty]);

  const fetchNotifications = async (facultyId: string) => {
    // Fetch notifications related to leave requests and doubts raised by student
    const { data: leaveAlerts } = await supabase
      .from('leave_requests')
      .select('id, reason, status, created_at, students(first_name, last_name)')
      .eq('status', 'Pending')
      .order('created_at', { ascending: false });

    const { data: doubtAlerts } = await supabase
      .from('doubts')
      .select('id, title, status, created_at, students(first_name, last_name)')
      .eq('status', 'Open')
      .order('created_at', { ascending: false });

    const combined: any[] = [];
    if (leaveAlerts) {
      leaveAlerts.forEach((l: any) => {
        combined.push({
          id: l.id,
          title: 'New Leave Request',
          message: `${l.students?.first_name} ${l.students?.last_name} applied for leave: "${l.reason}"`,
          type: 'Leave',
          created_at: l.created_at,
          is_read: false,
        });
      });
    }
    if (doubtAlerts) {
      doubtAlerts.forEach((d: any) => {
        combined.push({
          id: d.id,
          title: 'Doubt Ticket Raised',
          message: `${d.students?.first_name} ${d.students?.last_name} raised a doubt: "${d.title}"`,
          type: 'Doubt',
          created_at: d.created_at,
          is_read: false,
        });
      });
    }

    combined.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    setNotifications(combined);
    setUnreadNotificationsCount(combined.length);
  };

  const handleMarkAsRead = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    setUnreadNotificationsCount(Math.max(0, unreadNotificationsCount - 1));
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setFaculty(null);
    router.push('/login');
  };

  // Determine active mobile bottom tab
  const activeTabHref = useMemo(() => {
    const activeTab = mobileTabs.find((tab) => tab.pattern.test(pathname));
    return activeTab ? activeTab.href : '/faculty';
  }, [pathname]);

  // Determine active subnav group
  const activeSubNavGroup = useMemo(() => {
    if (/^\/faculty\/(students|performance)/.test(pathname)) return 'students';
    if (/^\/faculty\/(attendance|classes)/.test(pathname)) return 'attendance';
    if (/^\/faculty\/(messages|announcements|doubts|camai)/.test(pathname)) return 'communication';
    if (/^\/faculty\/(settings|leaves|exams|notes|groups)/.test(pathname)) return 'profile';
    return null;
  }, [pathname]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 text-slate-800">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600 mb-4" />
        <p className="text-slate-500 font-semibold text-xs animate-pulse">Initializing faculty workspace...</p>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gradient-to-br from-[#D9F9DF] to-[#FFF0E4] text-slate-900 flex flex-col relative overflow-hidden">
      {/* Subtle overlays */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-white/20 blur-[130px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-500/5 blur-[130px] pointer-events-none" />
      
      {/* GLOBAL VIEW WRAPPER */}
      <div className="flex flex-1 relative overflow-hidden z-10">
        
        {/* 1. DESKTOP GROUPED SIDEBAR */}
        <aside
          className={`hidden lg:flex lg:flex-col bg-white/40 backdrop-blur-xl border-r border-slate-200/60 shrink-0 h-full transition-all duration-300 z-20 ${
            sidebarCollapsed ? 'w-20' : 'w-72'
          }`}
        >
          {/* Brand header */}
          <div className="h-16 px-6 border-b border-slate-200/60 flex items-center justify-between">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-600 to-indigo-700 flex items-center justify-center shadow shrink-0">
                <GraduationCap className="w-5 h-5 text-white animate-pulse" />
              </div>
              {!sidebarCollapsed && (
                <div className="truncate">
                  <span className="font-extrabold text-sm text-transparent bg-clip-text bg-gradient-to-r from-indigo-700 to-indigo-900 tracking-tight block">CampusOS</span>
                  <span className="text-[9px] text-indigo-700 font-extrabold uppercase tracking-widest block">Faculty Suite</span>
                </div>
              )}
            </div>
            
            {/* Collapse toggle */}
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="p-1 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-white/50 transition border border-transparent hover:border-slate-200"
            >
              {sidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>
          </div>

          {/* Faculty Mini Card */}
          {faculty && !sidebarCollapsed && (
            <div className="mx-4 my-4 p-3.5 bg-white/55 border border-slate-200/80 rounded-2xl flex items-center gap-3 shadow-sm">
              <div className="w-9 h-9 rounded-xl bg-indigo-650/10 border border-indigo-650/20 flex items-center justify-center text-indigo-750 font-black text-xs shrink-0">
                {faculty.first_name[0]}{faculty.last_name[0]}
              </div>
              <div className="overflow-hidden">
                <h3 className="text-xs font-bold text-slate-900 truncate">Dr. {faculty.first_name} {faculty.last_name}</h3>
                <span className="text-[10px] text-slate-500 font-mono font-semibold block mt-0.5 truncate">{faculty.faculty_id}</span>
              </div>
            </div>
          )}

          {/* Sidebar Nav */}
          <nav className="flex-1 px-4 py-2 space-y-5 overflow-y-auto custom-scrollbar">
            {desktopGroups.map((group) => (
              <div key={group.title} className="space-y-1">
                {!sidebarCollapsed && (
                  <h4 className="px-3 text-[9.5px] font-extrabold text-slate-500 uppercase tracking-widest">
                    {group.title}
                  </h4>
                )}
                <div className="space-y-0.5">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname === item.href;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={`flex items-center gap-3 px-3 py-2 text-xs font-extrabold rounded-xl transition-all border ${
                          isActive
                            ? 'bg-white/70 border-indigo-200/80 text-indigo-900 shadow-sm'
                            : 'text-slate-600 border-transparent hover:text-slate-900 hover:bg-white/30'
                        }`}
                      >
                        <Icon className={`w-4.5 h-4.5 shrink-0 ${isActive ? 'text-indigo-600' : 'text-slate-500'}`} />
                        {!sidebarCollapsed && <span>{item.label}</span>}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>

          {/* Sign Out Section */}
          <div className="p-4 border-t border-slate-200/60">
            <button
              onClick={handleLogout}
              className={`w-full flex items-center gap-3 px-3 py-2.5 text-xs font-bold text-slate-600 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-100 rounded-xl transition ${
                sidebarCollapsed ? 'justify-center' : ''
              }`}
            >
              <LogOut className="w-4.5 h-4.5 text-slate-500 hover:text-rose-600" />
              {!sidebarCollapsed && <span>Sign Out</span>}
            </button>
          </div>
        </aside>

        {/* CONTENT & HEADER AREA */}
        <div className={`flex-1 flex flex-col min-h-0 ${pathname === '/faculty/camai' ? 'overflow-hidden' : 'overflow-y-auto'} pb-16 lg:pb-0`}>
          
          {/* HEADER (Sticky) */}
          {pathname !== '/faculty/camai' && (
            <header className="h-16 px-4 md:px-6 bg-white/40 backdrop-blur-md border-b border-slate-200/60 flex items-center justify-between sticky top-0 z-10 shadow-sm shrink-0">
              <div className="flex items-center gap-3">
                {/* Mobile Branding */}
                <div className="flex items-center gap-2 lg:hidden">
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-600 to-indigo-700 flex items-center justify-center shrink-0">
                    <GraduationCap className="w-4.5 h-4.5 text-white" />
                  </div>
                  <span className="font-extrabold text-xs tracking-tight text-slate-900 block">CampusOS</span>
                </div>
                
                {/* Breadcrumbs for desktop */}
                <div className="hidden lg:block">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    {faculty?.departments?.name || 'Department of Computer Science'}
                  </span>
                  <span className="text-[10px] text-slate-400 mx-1.5">•</span>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Academic Operations Console
                  </span>
                </div>
              </div>

              {/* Right actions */}
              <div className="flex items-center gap-3">
                {/* Notifications bell */}
                <button
                  onClick={() => setNotificationsOpen(true)}
                  className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-50 rounded-full relative transition border border-transparent hover:border-slate-100"
                >
                  <Bell className="w-4.5 h-4.5" />
                  {unreadNotificationsCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-blue-600 rounded-full ring-2 ring-white" />
                  )}
                </button>

                <div className="h-7 w-px bg-slate-200" />

                {/* Settings profile avatar */}
                <Link
                  href="/faculty/settings"
                  className="flex items-center gap-2 hover:bg-slate-50 p-1.5 rounded-xl transition border border-transparent hover:border-slate-100"
                >
                  <div className="w-7 h-7 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-xs font-semibold text-slate-600">
                    {faculty ? `${faculty.first_name[0]}${faculty.last_name[0]}` : <User className="w-4 h-4" />}
                  </div>
                  <span className="hidden sm:inline text-xs font-bold text-slate-700">
                    Dr. {faculty?.first_name}
                  </span>
                </Link>
              </div>
            </header>
          )}

          {/* MOBILE SECONDARY SUB-NAVIGATION TABS */}
          {activeSubNavGroup && (
            <div className="lg:hidden bg-white border-b border-slate-200 px-4 py-1.5 overflow-x-auto custom-scrollbar flex gap-1 scroll-smooth shrink-0 sticky top-16 z-9">
              {subNavGroups[activeSubNavGroup].map((tab) => {
                const isSubActive = pathname === tab.href;
                return (
                  <Link
                    key={tab.href}
                    href={tab.href}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold shrink-0 transition ${
                      isSubActive
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    {tab.label}
                  </Link>
                );
              })}
            </div>
          )}

          {/* ROUTER CONTENT CONTAINER */}
          <main className={pathname === '/faculty/camai' ? "flex-1 w-full flex flex-col min-h-0 overflow-hidden" : "flex-1 p-4 md:p-6 lg:p-8 max-w-7xl w-full mx-auto pb-10"}>
            <AnimatePresence mode="wait">
              <motion.div
                key={pathname}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.15, ease: 'easeOut' }}
                className={pathname === '/faculty/camai' ? "flex-1 w-full flex flex-col min-h-0 overflow-hidden" : ""}
              >
                {children}
              </motion.div>
            </AnimatePresence>
          </main>
        </div>
      </div>

      {/* 2. MOBILE PERSISTENT BOTTOM NAVIGATION */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 h-16 bg-white border-t border-slate-200/80 z-20 px-3 flex items-center justify-around shadow-2xl backdrop-blur-md bg-white/95">
        {mobileTabs.map((tab) => {
          const Icon = tab.icon;
          const isTabActive = tab.pattern.test(pathname);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className="flex flex-col items-center justify-center flex-1 h-full relative"
            >
              <div
                className={`py-1 px-3.5 rounded-xl flex flex-col items-center gap-0.5 transition ${
                  isTabActive
                    ? 'text-blue-600 font-bold scale-105'
                    : 'text-slate-400 hover:text-slate-600 font-medium'
                }`}
              >
                <Icon className={`w-5 h-5 transition ${isTabActive ? 'text-blue-600' : 'text-slate-400'}`} />
                <span className="text-[10px] tracking-wide mt-0.5">{tab.label}</span>
              </div>
              {isTabActive && (
                <motion.div
                  layoutId="mobileActiveIndicator"
                  className="absolute bottom-1.5 w-6 h-0.5 bg-blue-600 rounded-full"
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                />
              )}
            </Link>
          );
        })}
      </nav>

      {/* 3. NOTIFICATIONS RIGHT SLIDE-OVER DRAWER */}
      <AnimatePresence>
        {notificationsOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.3 }}
              exit={{ opacity: 0 }}
              onClick={() => setNotificationsOpen(false)}
              className="fixed inset-0 bg-black/40 z-30"
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'tween', duration: 0.25 }}
              className="fixed inset-y-0 right-0 w-full max-w-sm bg-white border-l border-slate-200 z-40 flex flex-col shadow-2xl"
            >
              <div className="h-16 px-6 border-b border-slate-100 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2.5">
                  <Bell className="w-5 h-5 text-blue-600" />
                  <span className="font-bold text-sm text-slate-900">Pending Actions</span>
                </div>
                <button
                  onClick={() => setNotificationsOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/50">
                {notifications.length === 0 ? (
                  <div className="text-center py-16 text-slate-400 flex flex-col items-center justify-center">
                    <CheckCircle className="w-10 h-10 text-slate-300 mb-3" />
                    <p className="text-xs font-bold text-slate-700">No Action Required</p>
                    <p className="text-[10.5px] text-slate-400 mt-1 max-w-[200px]">All student doubts and leave requests are currently cleared.</p>
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      className="p-4 border border-blue-100 bg-white rounded-2xl shadow-sm transition-all hover:shadow-md"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <span
                          className={`text-[9px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                            n.type === 'Leave'
                              ? 'bg-amber-50 text-amber-700 border border-amber-100'
                              : 'bg-indigo-50 text-indigo-700 border border-indigo-100'
                          }`}
                        >
                          {n.type}
                        </span>
                        <button
                          onClick={() => handleMarkAsRead(n.id)}
                          className="text-[10px] text-blue-600 hover:underline font-bold"
                        >
                          Dismiss
                        </button>
                      </div>
                      <h3 className="text-xs font-bold text-slate-900 mt-2.5">{n.title}</h3>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed">{n.message}</p>
                      <span className="text-[9px] text-slate-400 font-bold font-mono block mt-3">
                        {new Date(n.created_at).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
