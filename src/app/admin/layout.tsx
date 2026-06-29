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
  Building,
  Compass,
  CalendarCheck,
  Award,
  CreditCard,
  FolderOpen,
  Megaphone,
  CheckSquare,
  History,
  ShieldCheck,
  Settings,
  LogOut,
  Bell,
  Menu,
  X,
  User,
  Loader2,
  ChevronRight,
  ChevronLeft,
  Shield,
  HelpCircle,
  CheckCircle,
} from 'lucide-react';
import Link from 'next/link';

// Grouped navItems for Desktop Sidebar
const desktopGroups = [
  {
    title: 'Core Console',
    items: [
      { label: 'Overview Console', href: '/admin', icon: LayoutDashboard },
    ],
  },
  {
    title: 'Registry Suite',
    items: [
      { label: 'Student Registry', href: '/admin/students', icon: Users },
      { label: 'Faculty Registry', href: '/admin/faculty', icon: GraduationCap },
      { label: 'Departments', href: '/admin/departments', icon: Building },
      { label: 'Courses & Sessions', href: '/admin/courses', icon: Compass },
    ],
  },
  {
    title: 'Operational Services',
    items: [
      { label: 'Attendance Monitor', href: '/admin/attendance', icon: CalendarCheck },
      { label: 'Examinations Desk', href: '/admin/exams', icon: Award },
      { label: 'Fees & Financials', href: '/admin/fees', icon: CreditCard },
      { label: 'Documents Vault', href: '/admin/documents', icon: FolderOpen },
    ],
  },
  {
    title: 'Control Room',
    items: [
      { label: 'Broadcast Board', href: '/admin/communications', icon: Megaphone },
      { label: 'Approvals Queue', href: '/admin/approvals', icon: CheckSquare },
      { label: 'Audit Trail', href: '/admin/audit-logs', icon: History },
      { label: 'Security Console', href: '/admin/security', icon: ShieldCheck },
      { label: 'System Settings', href: '/admin/settings', icon: Settings },
    ],
  },
];

// Mobile Bottom Navigation Tabs (Exactly 5 items)
const mobileTabs = [
  { label: 'Dashboard', href: '/admin', icon: LayoutDashboard, pattern: /^\/admin$/ },
  { label: 'Operations', href: '/admin/students', icon: Building, pattern: /^\/admin\/(students|faculty|departments|courses)/ },
  { label: 'Reports', href: '/admin/attendance', icon: CreditCard, pattern: /^\/admin\/(attendance|exams|fees|documents|approvals)/ },
  { label: 'Notifications', href: '/admin/communications', icon: Megaphone, pattern: /^\/admin\/communications/ },
  { label: 'Profile', href: '/admin/settings', icon: User, pattern: /^\/admin\/(settings|security|audit-logs)/ },
];

// Mobile Top Sub-navigation options
const subNavGroups = {
  operations: [
    { label: 'Students', href: '/admin/students' },
    { label: 'Faculty', href: '/admin/faculty' },
    { label: 'Departments', href: '/admin/departments' },
    { label: 'Courses', href: '/admin/courses' },
  ],
  reports: [
    { label: 'Attendance', href: '/admin/attendance' },
    { label: 'Exams', href: '/admin/exams' },
    { label: 'Fees', href: '/admin/fees' },
    { label: 'Documents', href: '/admin/documents' },
    { label: 'Approvals', href: '/admin/approvals' },
  ],
  profile: [
    { label: 'Settings', href: '/admin/settings' },
    { label: 'Security', href: '/admin/security' },
    { label: 'Audit Logs', href: '/admin/audit-logs' },
  ],
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const {
    admin,
    setAdmin,
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

        if (session && session.user.email === 'admin@campusos.dev') {
          // Real admin session exists, try fetching profile
          const { data: profile, error } = await supabase
            .from('admin_profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();

          if (!error && profile && active) {
            setAdmin(profile);
            fetchNotifications();
            return;
          }
        }

        // Fallback: use mock admin profile so UI is fully visible
        if (active) {
          const mockAdmin = {
            id: 'mock-admin-001',
            name: 'Administrator',
            role: 'Super Admin' as const,
            created_at: '2022-01-01T00:00:00Z',
          };
          setAdmin(mockAdmin);
        }
      } catch (err) {
        console.error(err);
        // Even on error, set mock profile so UI renders
        if (active) {
          const mockAdmin = {
            id: 'mock-admin-001',
            name: 'Administrator',
            role: 'Super Admin' as const,
            created_at: '2022-01-01T00:00:00Z',
          };
          setAdmin(mockAdmin);
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    checkAuth();

    return () => {
      active = false;
    };
  }, [router, setAdmin]);

  const fetchNotifications = async () => {
    // Fetch pending leaves & open doubts & unpaid service requests
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
          title: 'Leave Request Pending',
          message: `${l.students?.first_name} ${l.students?.last_name} applied for leave: "${l.reason}"`,
          type: 'Leave',
          created_at: l.created_at,
        });
      });
    }
    if (doubtAlerts) {
      doubtAlerts.forEach((d: any) => {
        combined.push({
          id: d.id,
          title: 'New Doubt Ticket Raised',
          message: `${d.students?.first_name} ${d.students?.last_name} raised a doubt: "${d.title}"`,
          type: 'Doubt',
          created_at: d.created_at,
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
    setAdmin(null);
    router.push('/login');
  };

  // Determine active mobile bottom tab
  const activeTabHref = useMemo(() => {
    const activeTab = mobileTabs.find((tab) => tab.pattern.test(pathname));
    return activeTab ? activeTab.href : '/admin';
  }, [pathname]);

  // Determine active subnav group
  const activeSubNavGroup = useMemo(() => {
    if (/^\/admin\/(students|faculty|departments|courses)/.test(pathname)) return 'operations';
    if (/^\/admin\/(attendance|exams|fees|documents|approvals)/.test(pathname)) return 'reports';
    if (/^\/admin\/(settings|security|audit-logs)/.test(pathname)) return 'profile';
    return null;
  }, [pathname]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-[#D9F9DF] to-[#FFF0E4] text-slate-800">
        <Loader2 className="w-10 h-10 animate-spin text-indigo-600 mb-4" />
        <p className="text-slate-550 font-semibold text-xs animate-pulse">Initializing Command Center...</p>
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
                <Shield className="w-5 h-5 text-white animate-pulse" />
              </div>
              {!sidebarCollapsed && (
                <div className="truncate">
                  <span className="font-extrabold text-sm text-transparent bg-clip-text bg-gradient-to-r from-indigo-700 to-indigo-900 tracking-tight block">CampusOS</span>
                  <span className="text-[9px] text-indigo-700 font-extrabold uppercase tracking-widest block">Command Center</span>
                </div>
              )}
            </div>
            
            {/* Collapse toggle */}
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="p-1 rounded-lg text-slate-550 hover:text-slate-900 hover:bg-white/50 transition border border-transparent hover:border-slate-200"
            >
              {sidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>
          </div>

          {/* Admin Mini Profile */}
          {admin && !sidebarCollapsed && (
            <div className="mx-4 my-4 p-3.5 bg-white/55 border border-slate-200/80 rounded-2xl flex items-center gap-3 shadow-sm">
              <div className="w-9 h-9 rounded-xl bg-indigo-650/10 border border-indigo-650/20 flex items-center justify-center text-indigo-750 font-black text-xs shrink-0">
                AD
              </div>
              <div className="overflow-hidden">
                <h3 className="text-xs font-bold text-slate-900 truncate">{admin.name}</h3>
                <span className="text-[10px] text-slate-550 font-semibold block mt-0.5">{admin.role}</span>
              </div>
            </div>
          )}

          {/* Sidebar Nav */}
          <nav className="flex-1 px-4 py-2 space-y-5 overflow-y-auto custom-scrollbar">
            {desktopGroups.map((group) => (
              <div key={group.title} className="space-y-1">
                {!sidebarCollapsed && (
                  <h4 className="px-3 text-[9.5px] font-extrabold text-slate-550 uppercase tracking-widest">
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
                        className={`flex items-center gap-3 px-3 py-2 text-xs font-extrabold rounded-xl transition border ${
                          isActive
                            ? 'bg-white/70 border-indigo-200/80 text-indigo-900 shadow-sm'
                            : 'text-slate-655 border-transparent hover:text-slate-900 hover:bg-white/30'
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
              className={`w-full flex items-center gap-3 px-3 py-2.5 text-xs font-bold text-slate-555 hover:text-red-650 hover:bg-red-50/50 border border-transparent hover:border-red-200/30 rounded-xl transition ${
                sidebarCollapsed ? 'justify-center' : ''
              }`}
            >
              <LogOut className="w-4.5 h-4.5 text-slate-500 hover:text-red-650" />
              {!sidebarCollapsed && <span>Sign Out</span>}
            </button>
          </div>
        </aside>

        {/* CONTENT & HEADER AREA */}
        <div className="flex-1 flex flex-col h-full overflow-y-auto pb-16 lg:pb-0">
                    {/* HEADER (Sticky) */}
          <header className="h-16 px-4 md:px-6 bg-white/40 backdrop-blur-md border-b border-slate-200/60 flex items-center justify-between sticky top-0 z-10 shadow-sm shadow-slate-100/30 shrink-0">
            <div className="flex items-center gap-3">
              {/* Mobile Branding */}
              <div className="flex items-center gap-2 lg:hidden">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-600 to-indigo-700 flex items-center justify-center shrink-0">
                  <Shield className="w-4.5 h-4.5 text-white" />
                </div>
                <span className="font-extrabold text-xs tracking-tight text-slate-950 block">CampusOS</span>
              </div>
              
              {/* Breadcrumbs for desktop */}
              <div className="hidden lg:block">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                  Educational Org Operating System
                </span>
                <span className="text-[10px] text-slate-400 mx-1.5">•</span>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-655">
                  Console Workspace
                </span>
              </div>
            </div>

            {/* Right actions */}
            <div className="flex items-center gap-3">
              {/* Session badge */}
              <div className="hidden md:flex flex-col text-right">
                <span className="text-[9px] font-bold text-slate-400 uppercase leading-none">Session</span>
                <span className="text-[10px] font-bold text-slate-750 mt-1">2026-2027 (Sem 6)</span>
              </div>

              <div className="h-7 w-px bg-slate-200/80 hidden md:block" />

              {/* Notifications bell */}
              <button
                onClick={() => setNotificationsOpen(true)}
                className="p-2 text-slate-550 hover:text-slate-900 hover:bg-white/50 rounded-full relative transition border border-transparent hover:border-slate-200"
              >
                <Bell className="w-4.5 h-4.5" />
                {unreadNotificationsCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-indigo-650 rounded-full ring-2 ring-white" />
                )}
              </button>

              <div className="h-7 w-px bg-slate-200/80" />

              {/* Settings profile avatar */}
              <Link
                href="/admin/settings"
                className="flex items-center gap-2 hover:bg-white/50 p-1.5 rounded-xl transition border border-transparent hover:border-slate-200"
              >
                <div className="w-7 h-7 rounded-xl bg-indigo-650/10 border border-indigo-650/20 flex items-center justify-center text-xs font-semibold text-indigo-750">
                  AD
                </div>
                <span className="hidden sm:inline text-xs font-bold text-slate-700">
                  {admin?.name}
                </span>
              </Link>
            </div>
          </header>

          {/* MOBILE SECONDARY SUB-NAVIGATION TABS */}
          {activeSubNavGroup && (
            <div className="lg:hidden bg-white/50 backdrop-blur-md border-b border-slate-200/60 px-4 py-1.5 overflow-x-auto custom-scrollbar flex gap-1 scroll-smooth shrink-0 sticky top-16 z-9">
              {subNavGroups[activeSubNavGroup].map((tab) => {
                const isSubActive = pathname === tab.href;
                return (
                  <Link
                    key={tab.href}
                    href={tab.href}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold shrink-0 transition ${
                      isSubActive
                        ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/10'
                        : 'text-slate-555 hover:text-slate-900 hover:bg-white/30'
                    }`}
                  >
                    {tab.label}
                  </Link>
                );
              })}
            </div>
          )}

          {/* ROUTER CONTENT CONTAINER */}
          <main className="flex-1 p-4 md:p-6 lg:p-8 max-w-7xl w-full mx-auto pb-10">
            <AnimatePresence mode="wait">
              <motion.div
                key={pathname}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.15, ease: 'easeOut' }}
              >
                {children}
              </motion.div>
            </AnimatePresence>
          </main>
        </div>
      </div>

      {/* 2. MOBILE PERSISTENT BOTTOM NAVIGATION */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 h-16 bg-white/60 backdrop-blur-xl border-t border-slate-200/60 z-20 px-3 flex items-center justify-around shadow-2xl">
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
                    ? 'text-indigo-650 font-extrabold scale-105'
                    : 'text-slate-550 hover:text-slate-900 font-semibold'
                }`}
              >
                <Icon className={`w-5 h-5 transition ${isTabActive ? 'text-indigo-655' : 'text-slate-500'}`} />
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
              className="fixed inset-y-0 right-0 w-full max-w-sm bg-white/70 backdrop-blur-xl border-l border-slate-200/60 z-40 flex flex-col shadow-2xl"
            >
              <div className="h-16 px-6 border-b border-slate-200/60 flex items-center justify-between shrink-0 bg-white/40">
                <div className="flex items-center gap-2.5">
                  <Bell className="w-5 h-5 text-slate-900 animate-bounce" />
                  <span className="font-extrabold text-sm text-slate-900">System Alerts Queue</span>
                </div>
                <button
                  onClick={() => setNotificationsOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-655 hover:bg-white/50 border border-transparent hover:border-slate-200 rounded-xl transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-transparent">
                {notifications.length === 0 ? (
                  <div className="text-center py-16 text-slate-405 flex flex-col items-center justify-center">
                    <CheckCircle className="w-10 h-10 text-slate-350 mb-3" />
                    <p className="text-xs font-bold text-slate-700">All caught up!</p>
                    <p className="text-[10.5px] text-slate-450 mt-1 max-w-[200px]">No pending leave request approvals or active doubts in the queue.</p>
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      className="p-4 border border-slate-200/80 bg-white/50 backdrop-blur-md rounded-2xl shadow-sm transition-all hover:shadow-md"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <span
                          className={`text-[9px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                            n.type === 'Leave'
                              ? 'bg-amber-505 text-amber-800 border border-amber-250/20'
                              : 'bg-indigo-505 text-indigo-800 border border-indigo-255/20'
                          }`}
                        >
                          {n.type}
                        </span>
                        <button
                          onClick={() => handleMarkAsRead(n.id)}
                          className="text-[10px] text-indigo-650 hover:underline font-bold"
                        >
                          Dismiss
                        </button>
                      </div>
                      <h3 className="text-xs font-bold text-slate-900 mt-2.5">{n.title}</h3>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed">{n.message}</p>
                      <span className="text-[9px] text-slate-400 font-bold block mt-3">
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
