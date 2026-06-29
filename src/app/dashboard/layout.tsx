'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAppStore, type StudentProfile } from '@/lib/store';
import { motion, AnimatePresence } from 'framer-motion';
import {
  GraduationCap,
  LayoutDashboard,
  CalendarCheck,
  Award,
  TrendingUp,
  FileText,
  CalendarDays,
  HelpCircle,
  Megaphone,
  Sparkles,
  CreditCard,
  FileSpreadsheet,
  Settings,
  LogOut,
  Bell,
  X,
  User,
  Loader2,
  CheckCircle,
  ChevronRight,
  ChevronLeft,
  MessageSquare,
} from 'lucide-react';
import Link from 'next/link';

interface Notification {
  id: string;
  student_id: string;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

// Grouped navItems for Desktop Sidebar
const desktopGroups = [
  {
    title: 'Resource Center',
    items: [
      { label: 'CamAI Unified Chat', href: '/dashboard/camai', icon: MessageSquare },
    ],
  },
  {
    title: 'Core Console',
    items: [
      { label: 'Overview Dashboard', href: '/dashboard', icon: LayoutDashboard },
    ],
  },
  {
    title: 'Academic Suite',
    items: [
      { label: 'Attendance', href: '/dashboard/attendance', icon: CalendarCheck },
      { label: 'Examinations', href: '/dashboard/exams', icon: Award },
      { label: 'Performance Tracker', href: '/dashboard/performance', icon: TrendingUp },
    ],
  },
  {
    title: 'Workflow Services',
    items: [
      { label: 'Service Desk', href: '/dashboard/service-desk', icon: FileSpreadsheet },
      { label: 'Leave Management', href: '/dashboard/leaves', icon: CalendarDays },
      { label: 'Doubt Resolution', href: '/dashboard/doubts', icon: HelpCircle },
      { label: 'Fee Management', href: '/dashboard/fees', icon: CreditCard },
    ],
  },
];

// Mobile Bottom Navigation Tabs (Exactly 5 items)
const mobileTabs = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, pattern: /^\/dashboard$/ },
  { label: 'Academics', href: '/dashboard/attendance', icon: GraduationCap, pattern: /^\/dashboard\/(attendance|exams|performance)/ },
  { label: 'CamAI', href: '/dashboard/camai', icon: MessageSquare, pattern: /^\/dashboard\/camai/ },
  { label: 'Services', href: '/dashboard/service-desk', icon: FileSpreadsheet, pattern: /^\/dashboard\/(service-desk|leaves|doubts|fees)/ },
  { label: 'Profile', href: '/dashboard/settings', icon: User, pattern: /^\/dashboard\/settings/ },
];

// Mobile Top Sub-navigation options
const subNavGroups = {
  academics: [
    { label: 'Attendance', href: '/dashboard/attendance' },
    { label: 'Examinations', href: '/dashboard/exams' },
    { label: 'Performance', href: '/dashboard/performance' },
  ],
  resources: [
    { label: 'AI Chat', href: '/dashboard/camai?chat=ai' },
    { label: 'Notes', href: '/dashboard/camai?chat=notes' },
    { label: 'Notices', href: '/dashboard/camai?chat=announcements' },
    { label: 'Events', href: '/dashboard/camai?chat=activities' },
  ],
  services: [
    { label: 'Service Desk', href: '/dashboard/service-desk' },
    { label: 'Leaves', href: '/dashboard/leaves' },
    { label: 'Doubt Box', href: '/dashboard/doubts' },
    { label: 'Fees', href: '/dashboard/fees' },
  ],
};

const mockNotifications: Notification[] = [
  {
    id: 'n1',
    student_id: 'mock-student-001',
    type: 'Result',
    title: 'Semester 5 Results Released',
    message: 'Congratulations! Your Semester 5 grade sheet is now verified and published. Your SGPA is 8.75.',
    is_read: false,
    created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
  },
  {
    id: 'n2',
    student_id: 'mock-student-001',
    type: 'Assignment',
    title: 'New Lab Handout Uploaded',
    message: 'Prof. Ananya Sen uploaded "Lab Manual 6: Socket Programming Basics" under Computer Networks.',
    is_read: false,
    created_at: new Date(Date.now() - 3600000 * 5).toISOString(),
  },
  {
    id: 'n3',
    student_id: 'mock-student-001',
    type: 'Leave',
    title: 'Leave Request Approved',
    message: 'Your leave application for June 25th has been approved by Advisor Dr. Ramesh.',
    is_read: true,
    created_at: new Date(Date.now() - 3600000 * 24).toISOString(),
  },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const {
    student,
    setStudent,
    unreadNotificationsCount,
    setUnreadNotificationsCount,
  } = useAppStore();

  const [loading, setLoading] = useState(true);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Load profile and notifications from localStorage / mock on mount
  useEffect(() => {
    // 1. Set static student details
    setStudent({
      id: 'mock-student-001',
      student_id: 'STU-2023-0042',
      first_name: 'Aarav',
      last_name: 'Sharma',
      email: 'aarav.sharma@campusos.edu',
      phone: '+91 98765 43210',
      address: 'Room 304, Hostel C, Campus Town',
      avatar_url: null,
      department_id: 'dept-cse-01',
      course_id: 'course-btech-01',
      semester_id: '33333333-3333-3333-3333-333333333306',
      cgpa: 8.72,
      sgpa: 8.94,
      status: 'Active',
      admission_date: '2023-08-01',
      departments: { name: 'Computer Science & Engineering', code: 'CSE' },
      courses: { name: 'B.Tech - Computer Science', code: 'CS' },
      semesters: { number: 6 },
    });

    // 2. Load notifications from localStorage
    const savedNotifications = localStorage.getItem('student_notifications');
    if (savedNotifications) {
      try {
        const parsed = JSON.parse(savedNotifications);
        setNotifications(parsed);
        setUnreadNotificationsCount(parsed.filter((n: any) => !n.is_read).length);
      } catch (err) {
        setNotifications(mockNotifications);
        setUnreadNotificationsCount(mockNotifications.filter((n) => !n.is_read).length);
      }
    } else {
      setNotifications(mockNotifications);
      setUnreadNotificationsCount(mockNotifications.filter((n) => !n.is_read).length);
      localStorage.setItem('student_notifications', JSON.stringify(mockNotifications));
    }
    setLoading(false);
  }, [setStudent, setUnreadNotificationsCount]);

  const handleMarkAsRead = (notificationId: string) => {
    const updated = notifications.map((n) =>
      n.id === notificationId ? { ...n, is_read: true } : n
    );
    setNotifications(updated);
    localStorage.setItem('student_notifications', JSON.stringify(updated));
    setUnreadNotificationsCount(Math.max(0, unreadNotificationsCount - 1));
  };

  const handleLogout = () => {
    setStudent(null);
    router.push('/login');
  };

  // Determine active mobile bottom tab
  const activeTabHref = useMemo(() => {
    const activeTab = mobileTabs.find((tab) => tab.pattern.test(pathname));
    return activeTab ? activeTab.href : '/dashboard';
  }, [pathname]);

  // Determine active subnav group
  const activeSubNavGroup = useMemo(() => {
    if (/^\/dashboard\/(attendance|exams|performance)/.test(pathname)) return 'academics';
    if (/^\/dashboard\/camai/.test(pathname)) return 'resources';
    if (/^\/dashboard\/(service-desk|leaves|doubts|fees)/.test(pathname)) return 'services';
    return null;
  }, [pathname]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background text-slate-900">
        <Loader2 className="w-10 h-10 animate-spin text-indigo-600 mb-4" />
        <p className="text-slate-800 font-extrabold text-xs animate-pulse tracking-widest uppercase">Initializing Success Panel...</p>
      </div>
    );
  }

  return (
    <div className="h-screen bg-background text-slate-900 flex flex-col relative overflow-hidden">
      
      {/* GLOBAL VIEW WRAPPER */}
      <div className="flex flex-1 relative overflow-hidden z-10">
        
        {/* 1. DESKTOP GROUPED SIDEBAR */}
        <aside
          className={`hidden lg:flex lg:flex-col bg-white border-r border-slate-200 shrink-0 h-full transition-all duration-300 z-20 ${
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
                  <span className="text-[9px] text-indigo-700 font-extrabold uppercase tracking-widest block">Success Panel</span>
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

          {/* Student Profile Card */}
          {student && !sidebarCollapsed && (
            <div className="mx-4 my-4 p-3.5 bg-slate-50 border border-slate-200/65 rounded-2xl flex items-center gap-3 shadow-sm">
              <div className="w-9 h-9 rounded-xl bg-indigo-600/10 border border-indigo-600/20 flex items-center justify-center text-indigo-700 font-black text-xs">
                {student.first_name[0]}{student.last_name[0]}
              </div>
              <div className="overflow-hidden">
                <h3 className="text-xs font-bold text-slate-900 truncate">{student.first_name} {student.last_name}</h3>
                <span className="text-[10px] text-slate-500 font-mono font-semibold block mt-0.5 truncate">{student.student_id}</span>
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
                            ? 'bg-indigo-50 border-indigo-100 text-indigo-900 shadow-sm'
                            : 'text-slate-600 border-transparent hover:text-slate-900 hover:bg-slate-100'
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
        <div className={`flex-1 flex flex-col h-full pb-16 lg:pb-0 ${pathname === '/dashboard/camai' ? 'overflow-hidden' : 'overflow-y-auto'}`}>
          
          {/* HEADER (Sticky) */}
          {pathname !== '/dashboard/camai' && (
            <header className="h-16 px-4 md:px-6 bg-white border-b border-slate-200 flex items-center justify-between sticky top-0 z-10 shadow-sm shrink-0">
              <div className="flex items-center gap-3">
                {/* Mobile Branding */}
                <div className="flex items-center gap-2 lg:hidden">
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-600 to-indigo-700 flex items-center justify-center shrink-0">
                    <GraduationCap className="w-4.5 h-4.5 text-white" />
                  </div>
                  <span className="font-extrabold text-xs tracking-tight text-slate-900 block">CampusOS</span>
                </div>
                
                {/* Breadcrumbs for desktop */}
                <div className="hidden lg:flex lg:items-center">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                    {student?.departments?.name || 'Department'}
                  </span>
                  <span className="text-[10px] text-slate-400 mx-2">•</span>
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-700 font-mono">
                    {student?.courses?.name} / Sem {student?.semesters?.number || 6}
                  </span>
                </div>
              </div>

              {/* Right actions */}
              <div className="flex items-center gap-3">
                {/* Notifications bell */}
                <button
                  onClick={() => setNotificationsOpen(true)}
                  className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-full relative transition border border-slate-200 shadow-sm"
                >
                  <Bell className="w-4.5 h-4.5" />
                  {unreadNotificationsCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-indigo-600 rounded-full ring-2 ring-white animate-pulse" />
                  )}
                </button>

                <div className="h-7 w-px bg-slate-200" />

                {/* Settings profile avatar */}
                <Link
                  href="/dashboard/settings"
                  className="flex items-center gap-2 hover:bg-slate-100 p-1.5 rounded-xl transition border border-slate-200"
                >
                  <div className="w-7 h-7 rounded-xl bg-indigo-600/10 border border-indigo-600/20 flex items-center justify-center text-xs font-bold text-indigo-700">
                    {student ? `${student.first_name[0]}${student.last_name[0]}` : <User className="w-4 h-4" />}
                  </div>
                  <span className="hidden sm:inline text-xs font-bold text-slate-700">
                    {student?.first_name}
                  </span>
                </Link>
              </div>
            </header>
          )}

          {/* MOBILE SECONDARY SUB-NAVIGATION TABS */}
          {activeSubNavGroup && (
            <div className="lg:hidden bg-white border-b border-slate-200 px-4 py-2 overflow-x-auto custom-scrollbar flex gap-1.5 scroll-smooth shrink-0 sticky top-16 z-9">
              {subNavGroups[activeSubNavGroup].map((tab) => {
                const isSubActive = pathname === tab.href;
                return (
                  <Link
                    key={tab.href}
                    href={tab.href}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold shrink-0 transition-all border ${
                      isSubActive
                        ? 'bg-indigo-600 border-indigo-500 text-white shadow-sm'
                        : 'text-slate-600 border-transparent hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    {tab.label}
                  </Link>
                );
              })}
            </div>
          )}

          {/* ROUTER CONTENT CONTAINER */}
          <main className={pathname === '/dashboard/camai' ? "flex-1 w-full h-full flex flex-col min-h-0 overflow-hidden" : "flex-1 p-4 md:p-6 lg:p-8 max-w-7xl w-full mx-auto pb-10"}>
            <AnimatePresence mode="wait">
              <motion.div
                key={pathname}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.15, ease: 'easeOut' }}
                className={pathname === '/dashboard/camai' ? "flex-1 w-full h-full flex flex-col min-h-0 overflow-hidden" : ""}
              >
                {children}
              </motion.div>
            </AnimatePresence>
          </main>
        </div>
      </div>

      {/* 2. MOBILE PERSISTENT BOTTOM NAVIGATION */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 h-16 bg-white border-t border-slate-200 z-20 px-3 flex items-center justify-around shadow-lg">
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
                className={`py-1 px-3.5 rounded-xl flex flex-col items-center gap-0.5 transition-all ${
                  isTabActive
                    ? 'text-indigo-600 font-extrabold scale-105'
                    : 'text-slate-500 hover:text-slate-900 font-semibold'
                }`}
              >
                <Icon className={`w-5 h-5 transition-colors ${isTabActive ? 'text-indigo-600' : 'text-slate-500'}`} />
                <span className="text-[10px] tracking-wide mt-0.5">{tab.label}</span>
              </div>
              {isTabActive && (
                <motion.div
                  layoutId="mobileActiveIndicator"
                  className="absolute bottom-1.5 w-6 h-0.5 bg-indigo-600 rounded-full"
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
              animate={{ opacity: 0.4 }}
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
              <div className="h-16 px-6 border-b border-slate-200 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2.5">
                  <Bell className="w-5 h-5 text-indigo-600" />
                  <span className="font-extrabold text-sm text-slate-900">Notification Hub</span>
                </div>
                <button
                  onClick={() => setNotificationsOpen(false)}
                  className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition border border-transparent hover:border-slate-200"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/50 custom-scrollbar">
                {notifications.length === 0 ? (
                  <div className="text-center py-16 text-slate-500 flex flex-col items-center justify-center h-full">
                    <CheckCircle className="w-10 h-10 text-slate-350 mb-3" />
                    <p className="text-xs font-bold text-slate-700">All caught up!</p>
                    <p className="text-[10.5px] text-slate-500 mt-1 max-w-[200px] leading-relaxed">No new system alerts or circular notices found.</p>
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      className={`p-4 border rounded-2xl bg-white transition-all hover:border-slate-300 ${
                        n.is_read ? 'border-slate-200 opacity-60' : 'border-indigo-200 shadow-sm'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <span
                          className={`text-[9px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                            n.type === 'Leave'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                              : n.type === 'Result'
                              ? 'bg-purple-50 text-purple-700 border-purple-100'
                              : n.type === 'Attendance'
                              ? 'bg-amber-50 text-amber-700 border-amber-100'
                              : n.type === 'Assignment'
                              ? 'bg-blue-50 text-blue-700 border-blue-100'
                              : 'bg-slate-50 text-slate-700 border-slate-200'
                          }`}
                        >
                          {n.type}
                        </span>
                        {!n.is_read && (
                          <button
                            onClick={() => handleMarkAsRead(n.id)}
                            className="text-[10px] text-indigo-650 hover:text-indigo-850 hover:underline font-extrabold"
                          >
                            Mark read
                          </button>
                        )}
                      </div>
                      <h3 className="text-xs font-bold text-slate-900 mt-2.5">{n.title}</h3>
                      <p className="text-xs text-slate-650 mt-1 leading-relaxed">{n.message}</p>
                      <span className="text-[9px] text-slate-500 font-extrabold font-mono block mt-3">
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
