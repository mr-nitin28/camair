'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAppStore } from '@/lib/store';
import { AppShell } from '@/components/ui/app-shell';
import { Sheet } from '@/components/ui/sheet';
import type { NavGroup } from '@/components/ui/sidebar-nav';
import type { TabBarItem } from '@/components/ui/bottom-tab-bar';
import type { BreadcrumbItem } from '@/components/ui/breadcrumbs';
import type { CommandItem } from '@/components/ui/command-palette';
import {
  LayoutDashboard,
  Users,
  GraduationCap,
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
  Bell,
  CheckCircle,
  Clock,
  ArrowRight,
  Shield,
} from 'lucide-react';
import Link from 'next/link';

import { NotificationService, USER_IDS } from '@/lib/services/notification-service';

interface AdminNotificationItem {
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

const adminNavGroups: NavGroup[] = [
  {
    title: 'Core Console',
    items: [
      { label: 'Overview Console', href: '/admin', icon: LayoutDashboard },
    ],
  },
  {
    title: 'Registry & Structure',
    items: [
      { label: 'Student Registry', href: '/admin/students', icon: Users },
      { label: 'Faculty Registry', href: '/admin/faculty', icon: GraduationCap },
      { label: 'Departments', href: '/admin/departments', icon: Building },
      { label: 'Courses & Sessions', href: '/admin/courses', icon: Compass },
    ],
  },
  {
    title: 'Academic Operations',
    items: [
      { label: 'Attendance Monitor', href: '/admin/attendance', icon: CalendarCheck },
      { label: 'Examinations Desk', href: '/admin/exams', icon: Award },
      { label: 'Documents Vault', href: '/admin/documents', icon: FolderOpen },
    ],
  },
  {
    title: 'Finance & Governance',
    items: [
      { label: 'Fees & Financials', href: '/admin/fees', icon: CreditCard },
      { label: 'Approvals Queue', href: '/admin/approvals', icon: CheckSquare },
      { label: 'Broadcast Board', href: '/admin/communications', icon: Megaphone },
      { label: 'Audit Trail', href: '/admin/audit-logs', icon: History },
      { label: 'Security & Roles', href: '/admin/security', icon: ShieldCheck },
      { label: 'System Settings', href: '/admin/settings', icon: Settings },
    ],
  },
];

const adminMobileTabs: TabBarItem[] = [
  { label: 'Overview', href: '/admin', icon: LayoutDashboard },
  { label: 'Students', href: '/admin/students', icon: Users },
  { label: 'Fees', href: '/admin/fees', icon: CreditCard },
  { label: 'Approvals', href: '/admin/approvals', icon: CheckSquare },
  { label: 'Settings', href: '/admin/settings', icon: Settings },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { admin, setAdmin, unreadNotificationsCount, setUnreadNotificationsCount } = useAppStore();
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<AdminNotificationItem[]>([]);

  useEffect(() => {
    // 1. Initialize admin store
    if (!admin) {
      setAdmin({
        id: 'admin-001',
        name: 'Super Administrator',
        role: 'Super Admin',
        created_at: '2022-01-01T00:00:00Z',
      });
    }

    // 2. Initialize notifications from NotificationService
    const list = NotificationService.getUserNotifications(USER_IDS.instAdminA);
    const mapped: AdminNotificationItem[] = list.map((n) => ({
      id: n.id,
      type: n.category,
      category: n.category,
      title: n.title,
      message: n.body,
      body: n.body,
      is_read: n.isRead,
      isRead: n.isRead,
      link: n.deepLink || '/admin',
      deepLink: n.deepLink || '/admin',
      created_at: n.createdAt,
      createdAt: n.createdAt,
    }));
    setNotifications(mapped);
    setUnreadNotificationsCount(NotificationService.getUnreadCount(USER_IDS.instAdminA));
  }, [admin, setAdmin, setUnreadNotificationsCount]);

  // Dynamic breadcrumbs based on pathname
  const breadcrumbs: BreadcrumbItem[] = useMemo(() => {
    const crumbs: BreadcrumbItem[] = [
      { label: 'Command Center', href: '/admin' },
    ];

    if (pathname === '/admin') {
      crumbs[0].current = true;
      return crumbs;
    }

    const segments = pathname.replace('/admin/', '').split('/');
    const titles: Record<string, string> = {
      students: 'Student Registry',
      faculty: 'Faculty Registry',
      departments: 'Departments Directory',
      courses: 'Courses & Sessions',
      attendance: 'Attendance Monitor',
      exams: 'Examinations Desk',
      documents: 'Documents Vault',
      fees: 'Fees & Financials',
      approvals: 'Unified Approvals Queue',
      communications: 'Broadcast Board',
      'audit-logs': 'Audit Trail',
      security: 'Security & Permissions',
      settings: 'System Settings',
    };

    let accum = '/admin';
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

  // Command palette commands for Admin
  const customCommands: CommandItem[] = useMemo(
    () => [
      {
        id: 'cmd-admin-overview',
        title: 'Command Center Overview',
        subtitle: 'Executive institutional KPIs, revenue, and attendance sparklines',
        icon: LayoutDashboard,
        category: 'Navigation',
        keywords: ['overview', 'dashboard', 'command center', 'kpi'],
        onSelect: () => router.push('/admin'),
      },
      {
        id: 'cmd-admin-students',
        title: 'Student Registry & Bulk Import',
        subtitle: 'Manage student records and execute CSV dry-run import',
        icon: Users,
        category: 'Navigation',
        keywords: ['students', 'bulk import', 'csv', 'registry', 'enrollment'],
        onSelect: () => router.push('/admin/students'),
      },
      {
        id: 'cmd-admin-faculty',
        title: 'Faculty Registry',
        subtitle: 'Manage faculty profiles, designations, and teaching workloads',
        icon: GraduationCap,
        category: 'Navigation',
        keywords: ['faculty', 'professors', 'hod', 'teachers'],
        onSelect: () => router.push('/admin/faculty'),
      },
      {
        id: 'cmd-admin-departments',
        title: 'Departments & Historical Safety',
        subtitle: 'Manage academic departments and protect historical integrity',
        icon: Building,
        category: 'Navigation',
        keywords: ['departments', 'cse', 'ece', 'me', 'programs'],
        onSelect: () => router.push('/admin/departments'),
      },
      {
        id: 'cmd-admin-courses',
        title: 'Courses, Semesters & Teaching Assignments',
        subtitle: 'Configure degree curricula, sections, and faculty allocations',
        icon: Compass,
        category: 'Navigation',
        keywords: ['courses', 'sessions', 'semesters', 'sections', 'teaching'],
        onSelect: () => router.push('/admin/courses'),
      },
      {
        id: 'cmd-admin-fees',
        title: 'Fees & Finance Command Center',
        subtitle: 'Double-entry structures, aging analytics, and scholarship waivers',
        icon: CreditCard,
        category: 'Actions',
        keywords: ['fees', 'finance', 'revenue', 'aging', 'scholarship', 'waiver', 'challan'],
        onSelect: () => router.push('/admin/fees'),
      },
      {
        id: 'cmd-admin-exams',
        title: 'Examinations Desk & Publication Queue',
        subtitle: 'Review assessment marks and execute official publication',
        icon: Award,
        category: 'Actions',
        keywords: ['exams', 'grades', 'publication', 'backlog', 'marks correction'],
        onSelect: () => router.push('/admin/exams'),
      },
      {
        id: 'cmd-admin-approvals',
        title: 'Unified Administrative Approvals',
        subtitle: 'Bulk review and action student leaves, certificates, and concessions',
        icon: CheckSquare,
        category: 'Actions',
        keywords: ['approvals', 'queue', 'leave', 'bonafide', 'certificate', 'bulk'],
        onSelect: () => router.push('/admin/approvals'),
      },
      {
        id: 'cmd-admin-comms',
        title: 'Broadcast Board & Emergency Alerts',
        subtitle: 'Publish institution notices and high-priority push announcements',
        icon: Megaphone,
        category: 'Actions',
        keywords: ['broadcast', 'notices', 'announcement', 'emergency', 'alert'],
        onSelect: () => router.push('/admin/communications'),
      },
      {
        id: 'cmd-admin-audit',
        title: 'Audit Trail & Entity Log Viewer',
        subtitle: 'Full forensic history with before/after state diffs',
        icon: History,
        category: 'Navigation',
        keywords: ['audit', 'trail', 'logs', 'history', 'diff', 'forensics'],
        onSelect: () => router.push('/admin/audit-logs'),
      },
      {
        id: 'cmd-admin-security',
        title: 'Security Console & Permissions Visual Diff',
        subtitle: 'RBAC policy matrix and visual change inspection',
        icon: ShieldCheck,
        category: 'Settings',
        keywords: ['security', 'roles', 'permissions', 'rbac', 'access'],
        onSelect: () => router.push('/admin/security'),
      },
      {
        id: 'cmd-admin-settings',
        title: 'System Settings & Destructive Guards',
        subtitle: 'Institution configurations with typed confirmation guards',
        icon: Settings,
        category: 'Settings',
        keywords: ['settings', 'config', 'academic year', 'threshold', 'calendar'],
        onSelect: () => router.push('/admin/settings'),
      },
    ],
    [router]
  );

  const handleMarkAsRead = (id: string) => {
    try {
      NotificationService.markAsRead(id, USER_IDS.instAdminA);
    } catch {
      // ignore
    }
    const list = NotificationService.getUserNotifications(USER_IDS.instAdminA);
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
        link: item.deepLink || '/admin',
        deepLink: item.deepLink || '/admin',
        created_at: item.createdAt,
        createdAt: item.createdAt,
      }))
    );
    setUnreadNotificationsCount(NotificationService.getUnreadCount(USER_IDS.instAdminA));
  };

  const handleMarkAllRead = () => {
    NotificationService.markAllAsRead(USER_IDS.instAdminA);
    const list = NotificationService.getUserNotifications(USER_IDS.instAdminA);
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
        link: item.deepLink || '/admin',
        deepLink: item.deepLink || '/admin',
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
      role="admin"
      roleTitle="Command Center"
      navGroups={adminNavGroups}
      mobileTabs={adminMobileTabs}
      breadcrumbs={breadcrumbs}
      customCommands={customCommands}
      unreadNotificationsCount={unreadNotificationsCount}
      notifications={notifications}
      onNotificationsClick={() => setNotificationsOpen(true)}
      onMarkAsRead={handleMarkAsRead}
      onMarkAllAsRead={handleMarkAllRead}
      onNotificationClick={handleNotificationClick}
      user={{
        name: admin?.name || 'Administrator',
        role: admin?.role || 'Super Admin',
        email: 'admin@campusos.dev',
      }}
    >
      {children}

      {/* Slide-over Sheet for System Alerts Queue */}
      <Sheet
        isOpen={notificationsOpen}
        onClose={() => setNotificationsOpen(false)}
        title="Command Center Alerts Queue"
        side="right"
      >
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between pb-3 border-b border-border/60">
            <span className="text-xs font-semibold text-muted-foreground">
              {unreadNotificationsCount} pending action{unreadNotificationsCount === 1 ? '' : 's'}
            </span>
            {unreadNotificationsCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-xs font-semibold text-primary hover:underline cursor-pointer"
              >
                Mark all as read
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-border/40 py-2 space-y-2">
            {notifications.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground text-sm flex flex-col items-center justify-center">
                <CheckCircle className="w-8 h-8 text-emerald-500 mb-2" />
                <span>All queues caught up!</span>
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
