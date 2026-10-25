'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import {
  Sun,
  Moon,
  Sparkles,
  Command,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  ArrowRight,
  TrendingUp,
  CreditCard,
  Users,
  GraduationCap,
  Layers,
  Palette,
  Zap,
  Activity,
  Sliders,
  RotateCcw,
  Shield,
  Eye,
  Info,
} from 'lucide-react';

import { Avatar } from '@/components/ui/avatar';
import { Tooltip } from '@/components/ui/tooltip';
import { StatusBadge } from '@/components/ui/status-badge';
import { ProgressRing } from '@/components/ui/progress-ring';
import { StatCard } from '@/components/ui/stat-card';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { PageHeader } from '@/components/ui/page-header';
import {
  Skeleton,
  SkeletonStat,
  SkeletonCard,
  SkeletonChart,
  SkeletonTable,
} from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { PermissionDenied } from '@/components/ui/permission-denied';
import { Dialog } from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Sheet } from '@/components/ui/sheet';
import { Tabs, TabList, TabTrigger, TabContent } from '@/components/ui/tabs';
import { Stepper } from '@/components/ui/stepper';
import { FormField } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ToastProvider, useToast } from '@/components/ui/toast';
import type { Column } from '@/components/ui/data-table';

const DataTable = dynamic(
  () => import('@/components/ui/data-table').then((m) => m.DataTable),
  {
    ssr: false,
    loading: () => <SkeletonTable rows={5} cols={6} />,
  }
) as unknown as <T extends Record<string, unknown>>(props: import('@/components/ui/data-table').DataTableProps<T>) => React.JSX.Element;

const CommandPalette = dynamic(
  () => import('@/components/ui/command-palette').then((m) => m.CommandPalette),
  { ssr: false }
);

import {
  MOTION_DURATIONS,
  SPRING_TRANSITION,
  usePrefersReducedMotion,
} from '@/lib/motion';
import { motion, AnimatePresence } from 'framer-motion';

// Sample mock data for DataTable demo
interface MockStudentRow extends Record<string, unknown> {
  id: string;
  name: string;
  enrolment: string;
  department: string;
  attendance: number;
  cgpa: number;
  status: 'Active' | 'At Risk' | 'On Leave';
}

const mockStudentsData: MockStudentRow[] = [
  { id: '1', name: 'Aarav Sharma', enrolment: '2023-CS-042', department: 'Computer Science', attendance: 89.4, cgpa: 8.75, status: 'Active' },
  { id: '2', name: 'Ishita Patel', enrolment: '2023-CS-018', department: 'Computer Science', attendance: 71.2, cgpa: 7.10, status: 'At Risk' },
  { id: '3', name: 'Rohan Deshmukh', enrolment: '2023-EC-089', department: 'Electronics', attendance: 94.0, cgpa: 9.20, status: 'Active' },
  { id: '4', name: 'Ananya Roy', enrolment: '2023-ME-012', department: 'Mechanical', attendance: 64.5, cgpa: 6.80, status: 'At Risk' },
  { id: '5', name: 'Vikram Joshi', enrolment: '2023-CS-099', department: 'Computer Science', attendance: 82.0, cgpa: 8.10, status: 'Active' },
  { id: '6', name: 'Meera Nambiar', enrolment: '2023-CV-007', department: 'Civil', attendance: 88.5, cgpa: 8.60, status: 'On Leave' },
  { id: '7', name: 'Kabir Khan', enrolment: '2023-EC-054', department: 'Electronics', attendance: 91.0, cgpa: 8.90, status: 'Active' },
];

function DesignSystemContent() {
  const { addToast } = useToast();
  const prefersReduced = usePrefersReducedMotion();

  // Control State
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [role, setRole] = useState<'student' | 'faculty' | 'admin'>('student');
  const [density, setDensity] = useState<'comfortable' | 'compact'>('comfortable');
  const [motionOverride, setMotionOverride] = useState(false);

  // Dialog & Overlay States
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isCmdOpen, setIsCmdOpen] = useState(false);

  // Form Demo State
  const [formInputVal, setFormInputVal] = useState('John Doe');
  const [formErrorVal, setFormErrorVal] = useState('');

  // Sync theme to DOM
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
      root.setAttribute('data-theme', 'dark');
    } else {
      root.classList.remove('dark');
      root.removeAttribute('data-theme');
    }
  }, [theme]);

  // Sync role to DOM
  useEffect(() => {
    document.documentElement.setAttribute('data-role', role);
  }, [role]);

  // Sync density to DOM
  useEffect(() => {
    document.documentElement.setAttribute('data-density', density);
  }, [density]);

  // Sync reduced motion override
  useEffect(() => {
    if (motionOverride) {
      document.documentElement.classList.add('reduced-motion');
    } else {
      document.documentElement.classList.remove('reduced-motion');
    }
  }, [motionOverride]);

  const columns: Column<MockStudentRow>[] = [
    {
      key: 'name',
      header: 'Student',
      sortable: true,
      render: (row) => (
        <div className="flex items-center gap-2.5">
          <Avatar name={row.name} size="sm" />
          <div>
            <div className="font-bold text-[var(--text)]">{row.name}</div>
            <div className="text-[10px] text-[var(--text-muted)] font-mono">{row.enrolment}</div>
          </div>
        </div>
      ),
    },
    { key: 'department', header: 'Department', sortable: true },
    {
      key: 'attendance',
      header: 'Attendance',
      sortable: true,
      align: 'right',
      render: (row) => (
        <span className="font-extrabold tabular-nums">
          <span className={row.attendance < 75 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}>
            {row.attendance.toFixed(1)}%
          </span>
        </span>
      ),
    },
    {
      key: 'cgpa',
      header: 'CGPA',
      sortable: true,
      align: 'right',
      render: (row) => <span className="font-mono font-bold tabular-nums">{row.cgpa.toFixed(2)}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: (row) => {
        const variant =
          row.status === 'Active' ? 'success' : row.status === 'At Risk' ? 'danger' : 'neutral';
        return <StatusBadge label={row.status} variant={variant} size="sm" />;
      },
    },
  ];

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)] py-8 px-4 sm:px-6 lg:px-8 transition-colors duration-150">
      <div className="max-w-7xl mx-auto space-y-12">
        {/* Top Control Bar */}
        <div className="sticky top-4 z-[var(--z-sticky)] bg-[var(--surface)]/90 backdrop-blur-md border border-[var(--border)] rounded-2xl p-4 shadow-lg flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[var(--accent)] text-white flex items-center justify-center font-black">
              DS
            </div>
            <div>
              <h1 className="text-sm font-extrabold text-[var(--text)] tracking-tight">
                CampusOS Design System
              </h1>
              <p className="text-[10px] text-[var(--text-muted)] font-semibold">
                Phase 2 Tokens, Components & Motion Module
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs">
            {/* Theme Toggle */}
            <div className="flex items-center rounded-xl border border-[var(--border)] p-1 bg-[var(--surface-2)]">
              <button
                type="button"
                onClick={() => setTheme('light')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold transition-colors cursor-pointer ${
                  theme === 'light'
                    ? 'bg-[var(--surface)] text-[var(--text)] shadow-xs'
                    : 'text-[var(--text-muted)]'
                }`}
              >
                <Sun className="w-3.5 h-3.5 text-amber-500" /> Light
              </button>
              <button
                type="button"
                onClick={() => setTheme('dark')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold transition-colors cursor-pointer ${
                  theme === 'dark'
                    ? 'bg-[var(--surface)] text-[var(--text)] shadow-xs'
                    : 'text-[var(--text-muted)]'
                }`}
              >
                <Moon className="w-3.5 h-3.5 text-indigo-400" /> Dark
              </button>
            </div>

            {/* Role Accent Selector */}
            <div className="flex items-center rounded-xl border border-[var(--border)] p-1 bg-[var(--surface-2)]">
              {(['student', 'faculty', 'admin'] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRole(r)}
                  className={`px-2.5 py-1 rounded-lg font-bold capitalize transition-colors cursor-pointer ${
                    role === r
                      ? 'bg-[var(--surface)] text-[var(--accent)] shadow-xs'
                      : 'text-[var(--text-muted)]'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>

            {/* Density Toggle */}
            <button
              type="button"
              onClick={() => setDensity(density === 'comfortable' ? 'compact' : 'comfortable')}
              className="px-3 py-1.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] font-bold text-[var(--text)] hover:bg-[var(--surface-2)] transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Sliders className="w-3.5 h-3.5 text-[var(--text-muted)]" />
              <span className="capitalize">{density}</span>
            </button>

            {/* Reduced Motion Toggle */}
            <button
              type="button"
              onClick={() => setMotionOverride(!motionOverride)}
              className={`px-3 py-1.5 rounded-xl border font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
                motionOverride || prefersReduced
                  ? 'bg-amber-500/10 border-amber-500 text-amber-600 dark:text-amber-400'
                  : 'border-[var(--border)] bg-[var(--surface)] text-[var(--text)] hover:bg-[var(--surface-2)]'
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Reduced Motion: {motionOverride || prefersReduced ? 'ON' : 'OFF'}</span>
            </button>

            {/* Command Palette Button */}
            <button
              type="button"
              onClick={() => setIsCmdOpen(true)}
              className="px-3 py-1.5 rounded-xl bg-[var(--accent)] text-white font-bold hover:bg-[var(--accent-hover)] transition-colors cursor-pointer flex items-center gap-1.5 shadow-sm"
            >
              <Command className="w-3.5 h-3.5" />
              <span>Ctrl+K</span>
            </button>
          </div>
        </div>

        {/* SECTION 1: Design Tokens & WCAG Contrast Grid */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 border-b border-[var(--border)] pb-3">
            <Palette className="w-5 h-5 text-[var(--accent)]" />
            <h2 className="text-xl font-extrabold text-[var(--text)] tracking-tight">
              1. Design Tokens & Contrast Ratios (WCAG 2.2 AA)
            </h2>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {[
              { token: '--bg', label: 'Canvas Background', val: theme === 'dark' ? '#090D16' : '#F8FAFC', contrast: '18.5:1 (AAA)' },
              { token: '--surface', label: 'Surface Primary', val: theme === 'dark' ? '#111827' : '#FFFFFF', contrast: '17.1:1 (AAA)' },
              { token: '--surface-2', label: 'Surface Muted', val: theme === 'dark' ? '#1E293B' : '#F1F5F9', contrast: '14.2:1 (AAA)' },
              { token: '--text', label: 'Primary Text', val: theme === 'dark' ? '#F8FAFC' : '#0F172A', contrast: '4.5:1+ (AA)' },
              { token: '--text-muted', label: 'Muted Text', val: theme === 'dark' ? '#94A3B8' : '#64748B', contrast: '4.6:1 (AA)' },
              { 
                token: '--accent', 
                label: `Role Accent (${role})`, 
                val: role === 'student' ? '#4F46E5' : role === 'faculty' ? '#0F766E' : '#4338CA', 
                contrast: '5.2:1+ (AA)' 
              },
            ].map((swatch, idx) => (
              <div key={idx} className="p-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-xs space-y-2">
                <div
                  className="h-12 w-full rounded-xl border border-[var(--border)]"
                  style={{ backgroundColor: `var(${swatch.token})` }}
                />
                <div>
                  <div className="text-xs font-mono font-bold text-[var(--text)]">{swatch.token}</div>
                  <div className="text-[11px] text-[var(--text-muted)] font-medium truncate">{swatch.label}</div>
                  <div className="mt-1 inline-flex items-center gap-1 text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
                    <CheckCircle2 className="w-2.5 h-2.5" /> {swatch.contrast}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* SECTION 2: Motion System Tokens */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 border-b border-[var(--border)] pb-3">
            <Activity className="w-5 h-5 text-[var(--accent)]" />
            <h2 className="text-xl font-extrabold text-[var(--text)] tracking-tight">
              2. Motion System Tokens & Physics
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {[
              { name: 'instant', ms: '80ms (0.08s)', use: 'Tooltips, toggle states' },
              { name: 'fast', ms: '140ms (0.14s)', use: 'Dropdowns, hover, badges' },
              { name: 'base', ms: '220ms (0.22s)', use: 'Cards, modest dialogs' },
              { name: 'slow', ms: '320ms (0.32s)', use: 'Drawers, large page transitions' },
              { name: 'chart', ms: '600ms (0.60s)', use: 'Path drawing, progress rings' },
            ].map((tok, idx) => (
              <div key={idx} className="p-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-xs space-y-2">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-[var(--accent)]">
                  {tok.name}
                </span>
                <div className="text-sm font-black font-mono text-[var(--text)]">{tok.ms}</div>
                <p className="text-xs text-[var(--text-muted)] font-medium leading-snug">{tok.use}</p>
              </div>
            ))}
          </div>
        </section>

        {/* SECTION 3: KPI Tiles & Progress Rings */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 border-b border-[var(--border)] pb-3">
            <TrendingUp className="w-5 h-5 text-[var(--accent)]" />
            <h2 className="text-xl font-extrabold text-[var(--text)] tracking-tight">
              3. Analytics, KPI Tiles & Progress Rings
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Overall Attendance"
              value="89.4%"
              delta={{ value: 3.2, isPositive: true, label: 'vs last month' }}
              subtext="Above mandatory 75% threshold"
              icon={GraduationCap}
              sparklineData={[74, 78, 80, 85, 87, 89]}
            />
            <StatCard
              title="Outstanding Fees"
              value="₹14,500"
              delta={{ value: -2500, isPositive: true, label: 'partial receipt' }}
              subtext="Due on Nov 15, 2026"
              icon={CreditCard}
              sparklineData={[25000, 22000, 18000, 14500]}
            />
            <StatCard
              title="Pending Approvals"
              value="7"
              delta={{ value: 2, isPositive: false, label: 'backlog queue' }}
              subtext="3 urgent leave requests"
              icon={Clock}
              sparklineData={[2, 3, 5, 4, 7]}
            />
            {/* Progress Rings showcase */}
            <div className="p-5 rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-xs flex items-center justify-around">
              <div className="text-center">
                <ProgressRing value={88} threshold={75} size={76} strokeWidth={8} label="Lecture" />
              </div>
              <div className="text-center">
                <ProgressRing value={68} threshold={75} size={76} strokeWidth={8} label="Shortage" />
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 4: Status Badges, Avatars & Tooltips */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 border-b border-[var(--border)] pb-3">
            <Shield className="w-5 h-5 text-[var(--accent)]" />
            <h2 className="text-xl font-extrabold text-[var(--text)] tracking-tight">
              4. Badges, Avatars & Tooltips
            </h2>
          </div>

          <div className="p-6 rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-xs space-y-6">
            {/* Badges */}
            <div className="space-y-2">
              <h3 className="text-xs font-extrabold text-[var(--text-muted)] uppercase tracking-wider">
                Status Badges (Icon + Label)
              </h3>
              <div className="flex flex-wrap items-center gap-3">
                <StatusBadge label="Present (Published)" variant="success" />
                <StatusBadge label="Pending Review" variant="warning" />
                <StatusBadge label="Absent / Overdue" variant="danger" />
                <StatusBadge label="In Progress" variant="info" />
                <StatusBadge label="Draft Scheduled" variant="neutral" />
                <StatusBadge label="Compact" variant="success" size="sm" />
              </div>
            </div>

            {/* Avatars */}
            <div className="space-y-2">
              <h3 className="text-xs font-extrabold text-[var(--text-muted)] uppercase tracking-wider">
                Avatars (Sizes & Status Dots)
              </h3>
              <div className="flex items-center gap-4 flex-wrap">
                <Tooltip content="Extra Small (24px)">
                  <Avatar name="Aarav Sharma" size="xs" status="online" />
                </Tooltip>
                <Tooltip content="Small (32px)">
                  <Avatar name="Ishita Patel" size="sm" status="online" />
                </Tooltip>
                <Tooltip content="Medium (40px)">
                  <Avatar name="Dr. Ramesh Kumar" size="md" status="away" />
                </Tooltip>
                <Tooltip content="Large (48px)">
                  <Avatar name="Prof. Ananya Sen" size="lg" status="busy" />
                </Tooltip>
                <Tooltip content="Extra Large (64px)">
                  <Avatar name="Campus Admin" size="xl" status="offline" />
                </Tooltip>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 5: DataTable */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 border-b border-[var(--border)] pb-3">
            <Layers className="w-5 h-5 text-[var(--accent)]" />
            <h2 className="text-xl font-extrabold text-[var(--text)] tracking-tight">
              5. Interactive Data Table (Sort, Filter, Density, Pagination)
            </h2>
          </div>

          <DataTable
            columns={columns}
            data={mockStudentsData}
            searchPlaceholder="Search student name, enrolment ID, or department..."
            defaultPageSize={5}
            pageSizeOptions={[5, 10, 20]}
          />
        </section>

        {/* SECTION 6: Form Controls & Validation */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 border-b border-[var(--border)] pb-3">
            <Sliders className="w-5 h-5 text-[var(--accent)]" />
            <h2 className="text-xl font-extrabold text-[var(--text)] tracking-tight">
              6. Form Controls with Inline Validation
            </h2>
          </div>

          <div className="p-6 rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-xs grid grid-cols-1 md:grid-cols-3 gap-6">
            <FormField
              label="Full Legal Name"
              required
              helperText="As documented on institutional ID records."
              error={formErrorVal}
            >
              <Input
                placeholder="e.g. Aarav Sharma"
                value={formInputVal}
                onChange={(e) => {
                  setFormInputVal(e.target.value);
                  if (!e.target.value.trim()) {
                    setFormErrorVal('Full name is required and cannot be empty.');
                  } else {
                    setFormErrorVal('');
                  }
                }}
              />
            </FormField>

            <FormField label="Assigned Programme" required>
              <Select
                options={[
                  { value: 'btech-cs', label: 'B.Tech Computer Science' },
                  { value: 'btech-ec', label: 'B.Tech Electronics & Comm' },
                  { value: 'btech-me', label: 'B.Tech Mechanical' },
                ]}
              />
            </FormField>

            <FormField label="Special Approval Remarks" helperText="Optional explanation for audit records.">
              <Textarea placeholder="Enter decision remarks..." rows={2} />
            </FormField>
          </div>
        </section>

        {/* SECTION 7: Dialogs, Drawers & Confirmations */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 border-b border-[var(--border)] pb-3">
            <Eye className="w-5 h-5 text-[var(--accent)]" />
            <h2 className="text-xl font-extrabold text-[var(--text)] tracking-tight">
              7. Overlays, Dialogs & Typed Confirmations
            </h2>
          </div>

          <div className="p-6 rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-xs flex flex-wrap gap-4">
            <button
              type="button"
              onClick={() => setIsDialogOpen(true)}
              className="px-4 py-2 text-xs font-bold rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] hover:bg-[var(--surface-2)] transition-colors cursor-pointer"
            >
              Open Standard Dialog
            </button>

            <button
              type="button"
              onClick={() => setIsConfirmDialogOpen(true)}
              className="px-4 py-2 text-xs font-bold rounded-xl bg-rose-600 text-white hover:bg-rose-700 transition-colors cursor-pointer"
            >
              Open Typed Destructive ConfirmDialog
            </button>

            <button
              type="button"
              onClick={() => setIsSheetOpen(true)}
              className="px-4 py-2 text-xs font-bold rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] hover:bg-[var(--surface-2)] transition-colors cursor-pointer"
            >
              Open Slide-Over Sheet (Drawer)
            </button>

            {/* Toast Triggers */}
            <button
              type="button"
              onClick={() =>
                addToast({
                  title: 'Attendance Session Submitted',
                  description: 'Session CS601 recorded for 42 students.',
                  type: 'success',
                  onUndo: () =>
                    addToast({
                      title: 'Submission Reverted',
                      description: 'Draft restored to editing workspace.',
                      type: 'info',
                    }),
                })
              }
              className="px-4 py-2 text-xs font-bold rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 transition-colors cursor-pointer"
            >
              Trigger Success Toast (with Undo)
            </button>

            <button
              type="button"
              onClick={() =>
                addToast({
                  title: 'Publish Results Failed',
                  description: 'Draft marks must be submitted before publication.',
                  type: 'error',
                })
              }
              className="px-4 py-2 text-xs font-bold rounded-xl bg-slate-800 text-white hover:bg-slate-900 transition-colors cursor-pointer"
            >
              Trigger Error Toast
            </button>
          </div>
        </section>

        {/* SECTION 8: Stepper & Timeline */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 border-b border-[var(--border)] pb-3">
            <Clock className="w-5 h-5 text-[var(--accent)]" />
            <h2 className="text-xl font-extrabold text-[var(--text)] tracking-tight">
              8. Workflow Stepper / State Machine Timeline
            </h2>
          </div>

          <div className="p-6 rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-xs">
            <Stepper
              steps={[
                { title: 'Leave Application', description: 'Submitted by student', status: 'completed', timestamp: '10:15 AM' },
                { title: 'Proctor Verification', description: 'Attendance rate checked', status: 'completed', timestamp: '11:30 AM' },
                { title: 'HOD Approval', description: 'Awaiting faculty dean decision', status: 'current', timestamp: 'Pending' },
                { title: 'Notification Outbox', description: 'SMS & Email dispatch', status: 'upcoming' },
              ]}
            />
          </div>
        </section>

        {/* SECTION 9: System Fallback & Empty States */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 border-b border-[var(--border)] pb-3">
            <Info className="w-5 h-5 text-[var(--accent)]" />
            <h2 className="text-xl font-extrabold text-[var(--text)] tracking-tight">
              9. System States & Fallback Screens
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <EmptyState
              title="No Pending Leaves"
              description="All submitted student leave requests for your section have been resolved."
            />
            <ErrorState
              title="Failed to Load Roster"
              message="The database query timed out. Check connection and retry."
              onRetry={() => alert('Retry triggered')}
            />
            <PermissionDenied
              requiredRole="Finance Administrator"
              message="Fee structure modifications are strictly restricted to Finance Admins."
            />
          </div>
        </section>

        {/* SECTION 10: Skeletons */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 border-b border-[var(--border)] pb-3">
            <Sparkles className="w-5 h-5 text-[var(--accent)]" />
            <h2 className="text-xl font-extrabold text-[var(--text)] tracking-tight">
              10. Layout Skeleton Fallbacks
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <SkeletonStat />
            <SkeletonCard />
            <SkeletonChart height={180} />
          </div>
        </section>
      </div>

      {/* Standard Dialog */}
      <Dialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        title="Institutional Policy Notice"
        description="Review academic attendance criteria for the 2026-2027 semester."
        footer={
          <button
            type="button"
            onClick={() => setIsDialogOpen(false)}
            className="px-4 py-2 text-xs font-bold rounded-xl bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] cursor-pointer"
          >
            Acknowledge & Close
          </button>
        }
      >
        <p className="text-xs text-[var(--text-muted)] leading-relaxed font-medium">
          Pursuant to university regulations, students maintaining less than 75% aggregate attendance
          will be flagged for detention prior to end-semester examinations.
        </p>
      </Dialog>

      {/* Typed Destructive Confirm Dialog */}
      <ConfirmDialog
        isOpen={isConfirmDialogOpen}
        onClose={() => setIsConfirmDialogOpen(false)}
        onConfirm={async () => {
          await new Promise((r) => setTimeout(r, 800));
          addToast({
            title: 'Attendance Record Purged',
            description: 'Archived session successfully removed.',
            type: 'warning',
          });
        }}
        title="Purge Locked Attendance Session"
        description="This will permanently delete session logs CS-601 and all associated student marks. This action cannot be undone."
        requiredKeyword="CONFIRM"
        confirmText="Permanently Delete"
      />

      {/* Slide-Over Sheet */}
      <Sheet
        isOpen={isSheetOpen}
        onClose={() => setIsSheetOpen(false)}
        title="Student Profile Details"
        description="Detailed registry attributes and academic standing."
        footer={
          <button
            type="button"
            onClick={() => setIsSheetOpen(false)}
            className="px-4 py-2 text-xs font-bold rounded-xl bg-[var(--surface)] text-[var(--text)] border border-[var(--border)] cursor-pointer"
          >
            Close Drawer
          </button>
        }
      >
        <div className="space-y-4 text-xs">
          <div className="flex items-center gap-3">
            <Avatar name="Aarav Sharma" size="lg" status="online" />
            <div>
              <h4 className="font-extrabold text-[var(--text)] text-sm">Aarav Sharma</h4>
              <p className="text-[11px] text-[var(--text-muted)] font-mono">Enrolment: 2023-CS-042</p>
            </div>
          </div>
          <div className="p-4 rounded-xl bg-[var(--surface-2)] space-y-2">
            <div className="flex justify-between">
              <span className="text-[var(--text-muted)]">Current SGPA:</span>
              <span className="font-bold tabular-nums">8.75</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--text-muted)]">Overall Attendance:</span>
              <span className="font-bold tabular-nums text-emerald-600">89.4%</span>
            </div>
          </div>
        </div>
      </Sheet>

      {/* Command Palette */}
      <CommandPalette
        isOpen={isCmdOpen}
        onOpen={() => setIsCmdOpen(true)}
        onClose={() => setIsCmdOpen(false)}
        currentRole={role}
      />
    </div>
  );
}

export default function DesignSystemPage() {
  return (
    <ToastProvider>
      <DesignSystemContent />
    </ToastProvider>
  );
}
