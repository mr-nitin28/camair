'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAppStore } from '@/lib/store';
import { AppShell } from '@/components/ui/app-shell';
import { Sheet } from '@/components/ui/sheet';
import { StatusBadge } from '@/components/ui/status-badge';
import type { NavGroup } from '@/components/ui/sidebar-nav';
import type { TabBarItem } from '@/components/ui/bottom-tab-bar';
import type { BreadcrumbItem } from '@/components/ui/breadcrumbs';
import {
  LayoutDashboard,
  CalendarCheck,
  Award,
  TrendingUp,
  BookOpen,
  CalendarDays,
  HelpCircle,
  CreditCard,
  Megaphone,
  Sparkles,
  Settings,
  GraduationCap,
  FileSpreadsheet,
  MessageSquare,
  Menu,
  CheckCircle,
  Bell,
  Clock,
} from 'lucide-react';

import { NotificationService, USER_IDS } from '@/lib/services/notification-service';
import type { TopBarNotificationItem } from '@/components/ui/top-bar';

interface NotificationItem {
  id: string;
  type: string;
  category?: string;
  title: string;
  message: string;
  body: string;
  is_read: boolean;
  isRead: boolean;
  deepLink?: string | null;
  created_at: string;
  createdAt: string;
}

const studentNavGroups: NavGroup[] = [
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
      { label: 'Performance', href: '/dashboard/performance', icon: TrendingUp },
    ],
  },
  {
    title: 'Learning & Notes',
    items: [
      { label: 'Resources & Notes', href: '/dashboard/notes', icon: BookOpen },
      { label: 'CamAI Assistant', href: '/dashboard/camai', icon: MessageSquare },
    ],
  },
  {
    title: 'Workflows & Requests',
    items: [
      { label: 'Leave Management', href: '/dashboard/leaves', icon: CalendarDays },
      { label: 'Doubt Resolution', href: '/dashboard/doubts', icon: HelpCircle },
      { label: 'Fee Management', href: '/dashboard/fees', icon: CreditCard },
      { label: 'Service Desk', href: '/dashboard/service-desk', icon: FileSpreadsheet },
    ],
  },
  {
    title: 'Campus Life',
    items: [
      { label: 'Announcements', href: '/dashboard/announcements', icon: Megaphone },
      { label: 'Campus Activities', href: '/dashboard/activities', icon: Sparkles },
      { label: 'Account Settings', href: '/dashboard/settings', icon: Settings },
    ],
  },
];

const studentMobileTabs: TabBarItem[] = [
  { label: 'Home', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Academics', href: '/dashboard/attendance', icon: GraduationCap },
  { label: 'Resources', href: '/dashboard/notes', icon: BookOpen },
  { label: 'Requests', href: '/dashboard/leaves', icon: CalendarDays },
  { label: 'More', href: '/dashboard/settings', icon: Menu },
];

export default function StudentDashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { student, setStudent, unreadNotificationsCount, setUnreadNotificationsCount } = useAppStore();
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  useEffect(() => {
    // 1. Initialize student state
    setStudent({
      id: '00000000-0000-0000-0000-000000000030',
      student_id: 'EN2023CSE042',
      first_name: 'Aarav',
      last_name: 'Patel',
      email: 'student@campusos.dev',
      phone: '+91 99999 00030',
      address: 'Hostel Block C, Room 304, Campus Main',
      avatar_url: null,
      department_id: '00000000-0000-0000-0000-000000000301',
      course_id: '00000000-0000-0000-0000-000000000311',
      semester_id: '00000000-0000-0000-0000-000000000331',
      cgpa: 8.66,
      sgpa: 8.90,
      status: 'active',
      admission_date: '2023-08-01',
      departments: { name: 'Computer Science & Engineering', code: 'CSE' },
      courses: { name: 'B.Tech - Computer Science', code: 'BTECH-CSE' },
      semesters: { number: 6 },
    });

    // 2. Load notifications from authoritative NotificationService
    const loadNotifications = () => {
      const list = NotificationService.getUserNotifications(USER_IDS.studentA1);
      const mapped: NotificationItem[] = list.map((n) => ({
        id: n.id,
        type: n.category,
        category: n.category,
        title: n.title,
        message: n.body,
        body: n.body,
        is_read: n.isRead,
        isRead: n.isRead,
        deepLink: n.deepLink,
        created_at: n.createdAt,
        createdAt: n.createdAt,
      }));
      setNotifications(mapped);
      setUnreadNotificationsCount(NotificationService.getUnreadCount(USER_IDS.studentA1));
    };

    loadNotifications();
  }, [setStudent, setUnreadNotificationsCount]);

  const handleMarkAsRead = (id: string) => {
    try {
      NotificationService.markAsRead(id, USER_IDS.studentA1);
    } catch {
      // ignore
    }
    const list = NotificationService.getUserNotifications(USER_IDS.studentA1);
    setNotifications(
      list.map((n) => ({
        id: n.id,
        type: n.category,
        category: n.category,
        title: n.title,
        message: n.body,
        body: n.body,
        is_read: n.isRead,
        isRead: n.isRead,
        deepLink: n.deepLink,
        created_at: n.createdAt,
        createdAt: n.createdAt,
      }))
    );
    setUnreadNotificationsCount(NotificationService.getUnreadCount(USER_IDS.studentA1));
  };

  const handleMarkAllRead = () => {
    NotificationService.markAllAsRead(USER_IDS.studentA1);
    const list = NotificationService.getUserNotifications(USER_IDS.studentA1);
    setNotifications(
      list.map((n) => ({
        id: n.id,
        type: n.category,
        category: n.category,
        title: n.title,
        message: n.body,
        body: n.body,
        is_read: n.isRead,
        isRead: n.isRead,
        deepLink: n.deepLink,
        created_at: n.createdAt,
        createdAt: n.createdAt,
      }))
    );
    setUnreadNotificationsCount(0);
  };

  const handleNotificationClick = (item: { id: string; deepLink?: string | null }) => {
    handleMarkAsRead(item.id);
    if (item.deepLink) {
      router.push(item.deepLink);
      setNotificationsOpen(false);
    }
  };

  // Dynamic breadcrumbs based on route
  const breadcrumbs: BreadcrumbItem[] = useMemo(() => {
    const crumbs: BreadcrumbItem[] = [{ label: 'CampusOS', href: '/dashboard' }];
    if (pathname === '/dashboard') {
      crumbs.push({ label: 'Overview' });
      return crumbs;
    }
    if (pathname.startsWith('/dashboard/attendance')) {
      crumbs.push({ label: 'Academics', href: '/dashboard/attendance' });
      crumbs.push({ label: 'Attendance' });
    } else if (pathname.startsWith('/dashboard/exams')) {
      crumbs.push({ label: 'Academics', href: '/dashboard/attendance' });
      crumbs.push({ label: 'Examinations' });
    } else if (pathname.startsWith('/dashboard/performance')) {
      crumbs.push({ label: 'Academics', href: '/dashboard/attendance' });
      crumbs.push({ label: 'Performance' });
    } else if (pathname.startsWith('/dashboard/notes')) {
      crumbs.push({ label: 'Learning Resources & Notes' });
    } else if (pathname.startsWith('/dashboard/camai')) {
      crumbs.push({ label: 'CamAI Unified Assistant' });
    } else if (pathname.startsWith('/dashboard/leaves')) {
      crumbs.push({ label: 'Workflows', href: '/dashboard/leaves' });
      crumbs.push({ label: 'Leave Requests' });
    } else if (pathname.startsWith('/dashboard/doubts')) {
      crumbs.push({ label: 'Workflows', href: '/dashboard/doubts' });
      crumbs.push({ label: 'Doubt Resolution' });
    } else if (pathname.startsWith('/dashboard/fees')) {
      crumbs.push({ label: 'Finance', href: '/dashboard/fees' });
      crumbs.push({ label: 'Fee Management' });
    } else if (pathname.startsWith('/dashboard/announcements')) {
      crumbs.push({ label: 'Campus Life', href: '/dashboard/announcements' });
      crumbs.push({ label: 'Announcements' });
    } else if (pathname.startsWith('/dashboard/activities')) {
      crumbs.push({ label: 'Campus Life', href: '/dashboard/activities' });
      crumbs.push({ label: 'Activities & Events' });
    } else if (pathname.startsWith('/dashboard/service-desk')) {
      crumbs.push({ label: 'Support', href: '/dashboard/service-desk' });
      crumbs.push({ label: 'Service Desk' });
    } else if (pathname.startsWith('/dashboard/settings')) {
      crumbs.push({ label: 'Account Settings' });
    } else {
      const seg = pathname.split('/').filter(Boolean).pop();
      if (seg) crumbs.push({ label: seg.charAt(0).toUpperCase() + seg.slice(1) });
    }
    return crumbs;
  }, [pathname]);

  return (
    <>
      <AppShell
        role="student"
        roleTitle="Student Portal"
        navGroups={studentNavGroups}
        mobileTabs={studentMobileTabs}
        user={{
          name: student ? `${student.first_name} ${student.last_name}` : 'Aarav Patel',
          role: 'B.Tech CSE • Sem 6',
          email: student?.email || 'student@campusos.dev',
        }}
        breadcrumbs={breadcrumbs}
        unreadNotificationsCount={unreadNotificationsCount}
        notifications={notifications}
        onNotificationsClick={() => setNotificationsOpen(true)}
        onMarkAsRead={handleMarkAsRead}
        onMarkAllAsRead={handleMarkAllRead}
        onNotificationClick={handleNotificationClick}
      >
        {children}
      </AppShell>

      {/* Notifications Slide-Over Drawer */}
      <Sheet
        isOpen={notificationsOpen}
        onClose={() => setNotificationsOpen(false)}
        title="Notification Hub"
        description="Official circulars, grade updates, and administrative alerts"
        side="right"
        className="max-w-md"
        footer={
          unreadNotificationsCount > 0 ? (
            <button
              type="button"
              onClick={handleMarkAllRead}
              className="w-full py-2 text-xs font-bold text-center text-[var(--accent)] hover:underline cursor-pointer"
            >
              Mark all as read
            </button>
          ) : undefined
        }
      >
        <div className="space-y-3 p-1">
          {notifications.length === 0 ? (
            <div className="py-16 text-center text-[var(--text-muted)] flex flex-col items-center">
              <CheckCircle className="w-10 h-10 text-emerald-500 mb-2" />
              <p className="text-xs font-bold text-[var(--text)]">All caught up!</p>
              <p className="text-[11px] mt-1 text-[var(--text-muted)]">No unread alerts or notifications.</p>
            </div>
          ) : (
            notifications.map((n) => (
              <div
                key={n.id}
                onClick={() => handleNotificationClick(n)}
                className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                  n.is_read
                    ? 'border-[var(--border)] bg-[var(--surface-2)]/40 opacity-70 hover:opacity-100'
                    : 'border-[var(--accent)]/40 bg-[var(--surface)] shadow-sm hover:border-[var(--accent)]'
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <StatusBadge
                    label={n.type}
                    variant={
                      n.type === 'Result'
                        ? 'success'
                        : n.type === 'Fee'
                        ? 'warning'
                        : n.type === 'Leave'
                        ? 'info'
                        : 'neutral'
                    }
                    size="sm"
                  />
                  {!n.is_read && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMarkAsRead(n.id);
                      }}
                      className="text-[10px] font-bold text-[var(--accent)] hover:underline cursor-pointer"
                    >
                      Mark read
                    </button>
                  )}
                </div>
                <h4 className="text-xs font-bold text-[var(--text)] leading-snug">{n.title}</h4>
                <p className="text-xs text-[var(--text-muted)] mt-1 leading-relaxed">{n.message}</p>
                <div className="mt-2.5 flex items-center justify-between text-[10px] text-[var(--text-muted)] font-mono">
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-3 h-3" />
                    {new Date(n.created_at).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                  {n.deepLink && (
                    <span className="text-[10px] text-[var(--accent)] font-sans font-medium">
                      View record →
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </Sheet>
    </>
  );
}
