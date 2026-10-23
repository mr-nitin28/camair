'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, 
  Command, 
  CalendarCheck, 
  Award, 
  TrendingUp, 
  FileSpreadsheet, 
  CalendarDays, 
  CreditCard, 
  HelpCircle, 
  Sun, 
  Moon, 
  Zap, 
  Users, 
  ShieldCheck, 
  History, 
  Settings,
  type LucideIcon 
} from 'lucide-react';
import { usePrefersReducedMotion, createFadeVariants, createScaleVariants } from '@/lib/motion';

export interface CommandItem {
  id: string;
  title: string;
  subtitle?: string;
  icon: LucideIcon;
  category: 'Navigation' | 'Actions' | 'Settings';
  roles?: ('student' | 'faculty' | 'admin')[];
  onSelect: () => void;
  keywords?: string[];
}

export interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onOpen?: () => void;
  currentRole?: 'student' | 'faculty' | 'admin';
  customItems?: CommandItem[];
}

export function CommandPalette({
  isOpen,
  onClose,
  onOpen,
  currentRole = 'student',
  customItems,
}: CommandPaletteProps) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const prefersReduced = usePrefersReducedMotion();

  // Define default role-aware actions and destinations
  const defaultItems: CommandItem[] = useMemo(
    () => [
      // Navigation
      {
        id: 'nav-dashboard',
        title: 'Student Dashboard',
        subtitle: 'Overview KPIs and summary',
        icon: TrendingUp,
        category: 'Navigation',
        roles: ['student'],
        onSelect: () => router.push('/dashboard'),
      },
      {
        id: 'nav-attendance',
        title: 'Attendance Roster & History',
        subtitle: 'View attendance percentage and records',
        icon: CalendarCheck,
        category: 'Navigation',
        roles: ['student', 'faculty', 'admin'],
        onSelect: () => {
          if (currentRole === 'faculty') router.push('/faculty/attendance');
          else if (currentRole === 'admin') router.push('/admin/attendance');
          else router.push('/dashboard/attendance');
        },
      },
      {
        id: 'nav-exams',
        title: 'Examinations & Grades',
        subtitle: 'Subject scores, SGPA, and grade cards',
        icon: Award,
        category: 'Navigation',
        roles: ['student', 'faculty', 'admin'],
        onSelect: () => {
          if (currentRole === 'faculty') router.push('/faculty/exams');
          else if (currentRole === 'admin') router.push('/admin/exams');
          else router.push('/dashboard/exams');
        },
      },
      {
        id: 'nav-leaves',
        title: 'Leave Applications',
        subtitle: 'Submit or approve leave requests',
        icon: CalendarDays,
        category: 'Navigation',
        roles: ['student', 'faculty', 'admin'],
        onSelect: () => {
          if (currentRole === 'faculty') router.push('/faculty/leaves');
          else if (currentRole === 'admin') router.push('/admin/approvals');
          else router.push('/dashboard/leaves');
        },
      },
      {
        id: 'nav-fees',
        title: 'Fee Ledger & Payments',
        subtitle: 'View fee allocations and receipts',
        icon: CreditCard,
        category: 'Navigation',
        roles: ['student', 'admin'],
        onSelect: () => {
          if (currentRole === 'admin') router.push('/admin/fees');
          else router.push('/dashboard/fees');
        },
      },
      {
        id: 'nav-doubts',
        title: 'Doubt Resolution',
        subtitle: 'Threaded queries with faculty',
        icon: HelpCircle,
        category: 'Navigation',
        roles: ['student', 'faculty'],
        onSelect: () => {
          if (currentRole === 'faculty') router.push('/faculty/doubts');
          else router.push('/dashboard/doubts');
        },
      },
      {
        id: 'nav-admin-registry',
        title: 'Student & Faculty Registry',
        subtitle: 'Manage institution members and profiles',
        icon: Users,
        category: 'Navigation',
        roles: ['admin'],
        onSelect: () => router.push('/admin/students'),
      },
      {
        id: 'nav-admin-audit',
        title: 'Security & Audit Logs',
        subtitle: 'Immutable system event records',
        icon: History,
        category: 'Navigation',
        roles: ['admin'],
        onSelect: () => router.push('/admin/audit-logs'),
      },

      // Actions & Settings
      {
        id: 'action-theme-toggle',
        title: 'Toggle Dark / Light Theme',
        subtitle: 'Switch between dark and light appearance',
        icon: Sun,
        category: 'Actions',
        onSelect: () => {
          const isDark = document.documentElement.classList.contains('dark');
          if (isDark) {
            document.documentElement.classList.remove('dark');
            localStorage.setItem('theme', 'light');
          } else {
            document.documentElement.classList.add('dark');
            localStorage.setItem('theme', 'dark');
          }
        },
        keywords: ['mode', 'dark', 'light', 'color'],
      },
      {
        id: 'action-motion-toggle',
        title: 'Toggle Reduced Motion',
        subtitle: 'Suppress all physics animations for accessibility',
        icon: Zap,
        category: 'Actions',
        onSelect: () => {
          const isReduced = document.documentElement.classList.contains('reduced-motion');
          if (isReduced) {
            document.documentElement.classList.remove('reduced-motion');
          } else {
            document.documentElement.classList.add('reduced-motion');
          }
        },
        keywords: ['animation', 'accessibility', 'motion'],
      },
      {
        id: 'action-design-system',
        title: 'Open Design System Showcase',
        subtitle: 'View components, tokens, and contrast grids',
        icon: Settings,
        category: 'Navigation',
        onSelect: () => router.push('/design-system'),
        keywords: ['tokens', 'ui', 'components', 'colors'],
      },
    ],
    [router, currentRole]
  );

  const allItems = customItems || defaultItems;

  // Filter based on role and query
  const filteredItems = useMemo(() => {
    return allItems.filter((item) => {
      // Role match
      if (item.roles && !item.roles.includes(currentRole)) {
        return false;
      }
      if (!query.trim()) return true;

      const q = query.toLowerCase();
      const titleMatch = item.title.toLowerCase().includes(q);
      const subMatch = item.subtitle?.toLowerCase().includes(q);
      const keyMatch = item.keywords?.some((k) => k.toLowerCase().includes(q));

      return titleMatch || subMatch || keyMatch;
    });
  }, [allItems, currentRole, query]);

  // References to rendered buttons for auto-scroll
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // Keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (isOpen) {
          onClose();
        } else {
          setQuery('');
          setSelectedIndex(0);
          onOpen?.();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, onOpen]);

  // Arrow key & Tab navigation inside palette
  useEffect(() => {
    if (!isOpen) return;

    const handlePaletteKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % Math.max(1, filteredItems.length));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + filteredItems.length) % Math.max(1, filteredItems.length));
      } else if (e.key === 'Tab') {
        e.preventDefault();
        if (e.shiftKey) {
          setSelectedIndex((prev) => (prev - 1 + filteredItems.length) % Math.max(1, filteredItems.length));
        } else {
          setSelectedIndex((prev) => (prev + 1) % Math.max(1, filteredItems.length));
        }
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredItems[selectedIndex]) {
          filteredItems[selectedIndex].onSelect();
          onClose();
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handlePaletteKey);
    return () => window.removeEventListener('keydown', handlePaletteKey);
  }, [isOpen, filteredItems, selectedIndex, onClose]);

  // Auto-scroll selected item into view
  useEffect(() => {
    if (isOpen && itemRefs.current[selectedIndex]) {
      itemRefs.current[selectedIndex]?.scrollIntoView({
        block: 'nearest',
        behavior: 'smooth',
      });
    }
  }, [selectedIndex, isOpen]);

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const fadeVariants = createFadeVariants(prefersReduced);
  const scaleVariants = createScaleVariants(prefersReduced);

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-[var(--z-modal)] flex items-start justify-center p-4 sm:p-6 pt-16 sm:pt-24 overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-label="Command Palette"
        >
          {/* Backdrop */}
          <motion.div
            variants={fadeVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[var(--z-modal-backdrop)]"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Palette Content */}
          <motion.div
            variants={scaleVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="relative z-[var(--z-modal)] w-full max-w-xl bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-2xl overflow-hidden flex flex-col"
          >
            {/* Search Input Bar */}
            <div className="flex items-center px-4 py-3.5 border-b border-[var(--border)] gap-3 bg-[var(--surface)]">
              <Search className="w-5 h-5 text-[var(--text-muted)] shrink-0" />
              <input
                ref={inputRef}
                type="text"
                placeholder="Type a command, page name, or action..."
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setSelectedIndex(0);
                }}
                className="w-full bg-transparent text-sm text-[var(--text)] placeholder:text-[var(--text-muted)] focus:outline-none font-medium"
              />
              <div className="flex items-center gap-1 text-[10px] font-bold text-[var(--text-muted)] bg-[var(--surface-2)] border border-[var(--border)] px-1.5 py-0.5 rounded">
                <Command className="w-3 h-3" />
                <span>K</span>
              </div>
            </div>

            {/* Results List */}
            <div className="max-h-80 overflow-y-auto p-2 custom-scrollbar">
              {filteredItems.length > 0 ? (
                <ul className="space-y-1">
                  {filteredItems.map((item, idx) => {
                    const isSelected = idx === selectedIndex;
                    const Icon = item.icon;

                    return (
                      <li key={item.id}>
                        <button
                          ref={(el) => { itemRefs.current[idx] = el; }}
                          type="button"
                          onClick={() => {
                            item.onSelect();
                            onClose();
                          }}
                          onMouseEnter={() => setSelectedIndex(idx)}
                          className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-left transition-colors cursor-pointer select-none ${
                            isSelected
                              ? 'bg-[var(--accent-soft)] text-[var(--accent)]'
                              : 'text-[var(--text)] hover:bg-[var(--surface-2)]'
                          }`}
                        >
                          <div
                            className={`p-2 rounded-lg shrink-0 ${
                              isSelected
                                ? 'bg-[var(--accent)] text-white'
                                : 'bg-[var(--surface-2)] text-[var(--text-muted)]'
                            }`}
                          >
                            <Icon className="w-4 h-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-bold truncate">
                              {item.title}
                            </div>
                            {item.subtitle && (
                              <div className="text-[11px] text-[var(--text-muted)] truncate">
                                {item.subtitle}
                              </div>
                            )}
                          </div>
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)] px-2 py-0.5 rounded bg-[var(--surface-2)]">
                            {item.category}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <div className="p-8 text-center text-xs text-[var(--text-muted)]">
                  No commands or navigation destinations match &quot;{query}&quot;.
                </div>
              )}
            </div>

            {/* Footer keyboard hints */}
            <div className="px-4 py-2 border-t border-[var(--border)] bg-[var(--surface-2)] flex items-center justify-between text-[11px] text-[var(--text-muted)] select-none">
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 rounded bg-[var(--surface)] border border-[var(--border)] font-mono text-[10px]">
                    ↑
                  </kbd>
                  <kbd className="px-1.5 py-0.5 rounded bg-[var(--surface)] border border-[var(--border)] font-mono text-[10px]">
                    ↓
                  </kbd>
                  <span>navigate</span>
                </span>
                <span className="inline-flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 rounded bg-[var(--surface)] border border-[var(--border)] font-mono text-[10px]">
                    ↵
                  </kbd>
                  <span>execute</span>
                </span>
              </div>
              <span className="inline-flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 rounded bg-[var(--surface)] border border-[var(--border)] font-mono text-[10px]">
                  esc
                </kbd>
                <span>close</span>
              </span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
