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
import type { CommandItem } from '@/components/ui/command-palette';
import {
  LayoutDashboard,
  CalendarCheck,
  Award,
  TrendingUp,
  Compass,
  FileEdit,
  FileText,
  CalendarClock,
  HelpCircle,
  Users,
  Boxes,
  Megaphone,
  MessageSquare,
  Settings,
  Bell,
  CheckCircle,
  Clock,
  ArrowRight,
} from 'lucide-react';
import Link from 'next/link';

import { NotificationService, USER_IDS } from '@/lib/services/notification-service';

interface FacultyNotificationItem {
  id: string;
  type: string;
  category?: string;
  title: string;
  message: string;
  body: string;
  is_read: boolean;
  isRead: boolean;
  link: string;
  deepLink?: string | null;
  created_at: string;
  createdAt: string;
}

const facultyNavGroups: NavGroup[] = [
  {
    title: 'Core Console',
    items: [
      { label: 'Overview Dashboard', href: '/faculty', icon: LayoutDashboard },
    ],
  },
  {
    title: 'Academic Operations',
    items: [
      { label: 'Mark Attendance', href: '/faculty/attendance', icon: CalendarCheck },
      { label: 'Exams & Grades', href: '/faculty/exams', icon: Award },
      { label: 'Teaching Schedule', href: '/faculty/classes', icon: Compass },
      { label: 'Risk Monitor', href: '/faculty/performance', icon: TrendingUp },
    ],
  },
  {
    title: 'Learning & Handouts',
    items: [
      { label: 'Assignments Desk', href: '/faculty/assignments', icon: FileEdit },
      { label: 'Notes & Handouts', href: '/faculty/notes', icon: FileText },
      { label: 'CamAI Assistant', href: '/faculty/camai', icon: MessageSquare },
    ],
  },
  {
    title: 'Approvals & Queues',
    items: [
      { label: 'Leave Approvals', href: '/faculty/leaves', icon: CalendarClock },
      { label: 'Doubts Inbox', href: '/faculty/doubts', icon: HelpCircle },
    ],
  },
  {
    title: 'Directory & Community',
    items: [
      { label: 'Scoped Students', href: '/faculty/students', icon: Users },
      { label: 'Student Groups', href: '/faculty/groups', icon: Boxes },
      { label: 'Notices & Alerts', href: '/faculty/announcements', icon: Megaphone },
      { label: 'Messages Hub', href: '/faculty/messages', icon: MessageSquare },
      { label: 'Profile Settings', href: '/faculty/settings', icon: Settings },
    ],
  },
];

const facultyMobileTabs: TabBarItem[] = [
  { label: 'Dashboard', href: '/faculty', icon: LayoutDashboard },
  { label: 'Attendance', href: '/faculty/attendance', icon: CalendarCheck },
  { label: 'Leaves', href: '/faculty/leaves', icon: CalendarClock },
  { label: 'Doubts', href: '/faculty/doubts', icon: HelpCircle },
  { label: 'Students', href: '/faculty/students', icon: Users },
];

export default function FacultyLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { faculty, setFaculty, unreadNotificationsCount, setUnreadNotificationsCount } = useAppStore();
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<FacultyNotificationItem[]>([]);

  useEffect(() => {
    // 1. Initialize faculty store with seeded authoritative faculty
    setFaculty({
      id: '00000000-0000-0000-0000-000000000020',
      faculty_id: 'FAC-CS-001',
      first_name: 'Vikram',
      last_name: 'Mehta',
      email: 'faculty@campusos.dev',
      phone: '+91 99999 00020',
      department_id: '00000000-0000-0000-0000-000000000301',
      created_at: '2021-07-01T00:00:00Z',
      departments: {
        name: 'Computer Science & Engineering',
        code: 'CSE',
      },
    });

    // 2. Initialize notifications from NotificationService
    const list = NotificationService.getUserNotifications(USER_IDS.facultyA1);
    const mapped: FacultyNotificationItem[] = list.map((n) => ({
      id: n.id,
      type: n.category,
      category: n.category,
      title: n.title,
      message: n.body,
      body: n.body,
      is_read: n.isRead,
      isRead: n.isRead,
      link: n.deepLink || '/faculty',
      deepLink: n.deepLink || '/faculty',
      created_at: n.createdAt,
      createdAt: n.createdAt,
    }));
    setNotifications(mapped);
    setUnreadNotificationsCount(NotificationService.getUnreadCount(USER_IDS.facultyA1));
  }, [setFaculty, setUnreadNotificationsCount]);

  // Dynamic breadcrumbs based on pathname
  const breadcrumbs: BreadcrumbItem[] = useMemo(() => {
    const crumbs: BreadcrumbItem[] = [
      { label: 'Faculty Console', href: '/faculty' },
    ];

    if (pathname === '/faculty') {
      crumbs[0].current = true;
      return crumbs;
    }

    const segments = pathname.replace('/faculty/', '').split('/');
    const titles: Record<string, string> = {
      attendance: 'Mark Attendance',
      exams: 'Exams & Marks Entry',
      classes: 'Teaching Schedule',
      performance: 'Student Risk Monitor',
      assignments: 'Assignments Desk',
      notes: 'Notes & Handouts',
      camai: 'CamAI Copilot',
      leaves: 'Leave Approvals Queue',
      doubts: 'Doubts Inbox',
      students: 'Scoped Students Directory',
      groups: 'Student Groups',
      announcements: 'Notices & Alerts',
      messages: 'Communication Hub',
      settings: 'Settings & Security',
    };

    let accum = '/faculty';
    segments.forEach((seg, i) => {
      accum += `/${seg}`;
      crumbs.push({
        label: titles[seg] || seg.charAt(0).toUpperCase() + seg.slice(1),
        href: accum,
        current: i === segments.length - 1,
      });
    });

    return crumbs;
  }, [pathname]);

  // Command palette commands
  const customCommands: CommandItem[] = useMemo(() => [
    {
      id: 'cmd-attendance',
      title: 'Roll Call Attendance',
      subtitle: 'Open high-speed keyboard roll call for today',
      icon: CalendarCheck,
      category: 'Navigation',
      keywords: ['attendance', 'roll call', 'present', 'absent', 'speed'],
      onSelect: () => router.push('/faculty/attendance'),
    },
    {
      id: 'cmd-exams',
      title: 'Enter Assessment Marks',
      subtitle: 'Spreadsheet marks entry grid with paste from Excel',
      icon: Award,
      category: 'Navigation',
      keywords: ['marks', 'grades', 'exams', 'eval', 'spreadsheet'],
      onSelect: () => router.push('/faculty/exams'),
    },
    {
      id: 'cmd-leaves',
      title: 'Review Leave Applications',
      subtitle: 'Split-pane student leave requests queue',
      icon: CalendarClock,
      category: 'Actions',
      keywords: ['leave', 'approval', 'medical', 'absence'],
      onSelect: () => router.push('/faculty/leaves'),
    },
    {
      id: 'cmd-doubts',
      title: 'Doubts Resolution Inbox',
      subtitle: 'Respond to student technical doubts and questions',
      icon: HelpCircle,
      category: 'Actions',
      keywords: ['doubt', 'inbox', 'question', 'reply', 'student'],
      onSelect: () => router.push('/faculty/doubts'),
    },
    {
      id: 'cmd-students',
      title: 'Scoped Students Directory',
      subtitle: 'Search assigned students, attendance rates, and risk status',
      icon: Users,
      category: 'Navigation',
      keywords: ['students', 'directory', 'roster', 'advisor'],
      onSelect: () => router.push('/faculty/students'),
    },
    {
      id: 'cmd-assignments',
      title: 'Assignments & Submissions',
      subtitle: 'Evaluate student submissions and grade assignments',
      icon: FileEdit,
      category: 'Actions',
      keywords: ['assignment', 'homework', 'submission', 'grade'],
      onSelect: () => router.push('/faculty/assignments'),
    },
    {
      id: 'cmd-notes',
      title: 'Upload Course Handouts',
      subtitle: 'Share lecture slides, labs, and version-tracked handouts',
      icon: FileText,
      category: 'Actions',
      keywords: ['notes', 'handouts', 'slides', 'upload', 'materials'],
      onSelect: () => router.push('/faculty/notes'),
    },
  ], [router]);

  const handleMarkAsRead = (id: string) => {
    try {
      NotificationService.markAsRead(id, USER_IDS.facultyA1);
    } catch {
      // ignore
    }
    const list = NotificationService.getUserNotifications(USER_IDS.facultyA1);
    setNotifications(
      list.map((item) => ({
        id: item.id,
        type: item.category,
        category: item.category,
        title: item.title,
        message: item.body,
        body: item.body,
        is_read: item.isRead,
        isRead: item.isRead,
        link: item.deepLink || '/faculty',
        deepLink: item.deepLink || '/faculty',
        created_at: item.createdAt,
        createdAt: item.createdAt,
      }))
    );
    setUnreadNotificationsCount(NotificationService.getUnreadCount(USER_IDS.facultyA1));
  };

  const handleMarkAllRead = () => {
    NotificationService.markAllAsRead(USER_IDS.facultyA1);
    const list = NotificationService.getUserNotifications(USER_IDS.facultyA1);
    setNotifications(
      list.map((item) => ({
        id: item.id,
        type: item.category,
        category: item.category,
        title: item.title,
        message: item.body,
        body: item.body,
        is_read: item.isRead,
        isRead: item.isRead,
        link: item.deepLink || '/faculty',
        deepLink: item.deepLink || '/faculty',
        created_at: item.createdAt,
        createdAt: item.createdAt,
      }))
    );
    setUnreadNotificationsCount(0);
  };

  const handleNotificationClick = (n: { id: string; link?: string; deepLink?: string | null }) => {
    handleMarkAsRead(n.id);
    setNotificationsOpen(false);
    const dest = n.deepLink || n.link;
    if (dest) {
      router.push(dest);
    }
  };

  return (
    <AppShell
      role="faculty"
      roleTitle="Faculty Console"
      navGroups={facultyNavGroups}
      mobileTabs={facultyMobileTabs}
      breadcrumbs={breadcrumbs}
      customCommands={customCommands}
      unreadNotificationsCount={unreadNotificationsCount}
      notifications={notifications}
      onNotificationsClick={() => setNotificationsOpen(true)}
      onMarkAsRead={handleMarkAsRead}
      onMarkAllAsRead={handleMarkAllRead}
      onNotificationClick={handleNotificationClick}
      user={{
        name: faculty ? `Dr. ${faculty.first_name} ${faculty.last_name}` : 'Dr. Vikram Mehta',
        role: faculty?.departments?.code ? `Assoc. Prof • ${faculty.departments.code}` : 'Associate Professor, CSE',
        email: faculty?.email || 'faculty@campusos.dev',
      }}
    >
      {children}

      {/* Slide-over Sheet for Notifications */}
      <Sheet
        isOpen={notificationsOpen}
        onClose={() => setNotificationsOpen(false)}
        title="Faculty Alerts & Notifications"
        side="right"
      >
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between pb-3 border-b border-border/60">
            <span className="text-xs font-semibold text-muted-foreground">
              {unreadNotificationsCount} unread alert{unreadNotificationsCount === 1 ? '' : 's'}
            </span>
            {unreadNotificationsCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-xs font-semibold text-primary hover:underline"
              >
                Mark all as read
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-border/40 py-2 space-y-2">
            {notifications.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground text-sm">
                No alerts right now.
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => handleNotificationClick(n)}
                  className={`p-3.5 rounded-xl cursor-pointer transition-colors ${
                    n.is_read
                      ? 'bg-transparent hover:bg-muted/40 opacity-75'
                      : 'bg-primary/5 hover:bg-primary/10 border border-primary/20'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-xs font-bold text-foreground">
                      {n.title}
                    </span>
                    {!n.is_read && (
                      <span className="w-2 h-2 rounded-full bg-primary shrink-0 mt-1" />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                    {n.message}
                  </p>
                  <div className="flex items-center justify-between mt-2 pt-1 text-[10px] text-muted-foreground">
                    <span className="font-semibold text-primary/80">
                      {n.type} Alert
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </Sheet>
    </AppShell>
  );
}
