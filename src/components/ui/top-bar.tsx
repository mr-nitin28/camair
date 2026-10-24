'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Menu, 
  Search, 
  Bell, 
  Sun, 
  Moon, 
  Command, 
  Check, 
  ChevronDown,
  LogOut,
  User as UserIcon,
  Sparkles
} from 'lucide-react';
import { Avatar } from './avatar';
import { Breadcrumbs, type BreadcrumbItem } from './breadcrumbs';

export interface TopBarNotificationItem {
  id: string;
  title: string;
  body: string;
  category?: 'Leave' | 'Attendance' | 'Result' | 'Exam' | 'Fee' | 'Notice' | 'Doubt' | 'System' | string;
  deepLink?: string | null;
  isRead: boolean;
  createdAt: string;
}

export interface TopBarProps {
  onToggleMobileMenu?: () => void;
  onOpenCommandPalette?: () => void;
  breadcrumbs?: BreadcrumbItem[];
  user?: {
    name: string;
    role: string;
    avatarUrl?: string;
    email?: string;
  };
  unreadNotificationsCount?: number;
  notifications?: TopBarNotificationItem[];
  onNotificationsClick?: () => void;
  onMarkAsRead?: (id: string) => void;
  onMarkAllAsRead?: () => void;
  onNotificationClick?: (item: TopBarNotificationItem) => void;
  onLogout?: () => void;
  className?: string;
}

export function TopBar({
  onToggleMobileMenu,
  onOpenCommandPalette,
  breadcrumbs,
  user = { name: 'Aarav Sharma', role: 'Student' },
  unreadNotificationsCount = 0,
  notifications,
  onNotificationsClick,
  onMarkAsRead,
  onMarkAllAsRead,
  onNotificationClick,
  onLogout,
  className = '',
}: TopBarProps) {
  const router = useRouter();
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const userMenuRef = useRef<HTMLDivElement | null>(null);
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
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  useEffect(() => {
    if (!isNotificationsOpen && !isUserMenuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (dropdownRef.current && !dropdownRef.current.contains(target)) {
        setIsNotificationsOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(target)) {
        setIsUserMenuOpen(false);
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsNotificationsOpen(false);
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isNotificationsOpen, isUserMenuOpen]);

  const handleToggleNotifications = () => {
    setIsNotificationsOpen((prev) => !prev);
    if (onNotificationsClick) {
      onNotificationsClick();
    }
  };

  const handleItemClick = (item: TopBarNotificationItem) => {
    if (!item.isRead && onMarkAsRead) {
      onMarkAsRead(item.id);
    }
    if (onNotificationClick) {
      onNotificationClick(item);
    }
    if (item.deepLink) {
      router.push(item.deepLink);
    }
    setIsNotificationsOpen(false);
  };

  const formatTimeAgo = (dateString: string): string => {
    try {
      const diffMs = Date.now() - new Date(dateString).getTime();
      const diffSec = Math.floor(diffMs / 1000);
      if (diffSec < 60) return 'Just now';
      const diffMin = Math.floor(diffSec / 60);
      if (diffMin < 60) return `${diffMin}m ago`;
      const diffHours = Math.floor(diffMin / 60);
      if (diffHours < 24) return `${diffHours}h ago`;
      const diffDays = Math.floor(diffHours / 24);
      return `${diffDays}d ago`;
    } catch {
      return 'Recently';
    }
  };

  const getCategoryStyle = (category?: string): string => {
    switch (category) {
      case 'Result':
      case 'Exam':
        return 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400';
      case 'Fee':
        return 'bg-amber-500/15 text-amber-600 dark:text-amber-400';
      case 'Leave':
        return 'bg-sky-500/15 text-sky-600 dark:text-sky-400';
      case 'Attendance':
        return 'bg-rose-500/15 text-rose-600 dark:text-rose-400';
      case 'Doubt':
        return 'bg-purple-500/15 text-purple-600 dark:text-purple-400';
      case 'Notice':
        return 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400';
      default:
        return 'bg-[var(--surface-2)] text-[var(--text-muted)]';
    }
  };

  return (
    <header
      className={`h-16 px-4 md:px-6 bg-[var(--surface)] border-b border-[var(--border)] flex items-center justify-between gap-4 select-none shrink-0 sticky top-0 z-[var(--z-sticky)] ${className}`}
    >
      {/* Left: Mobile hamburger + Breadcrumbs */}
      <div className="flex items-center gap-3 min-w-0">
        {onToggleMobileMenu && (
          <button
            type="button"
            onClick={onToggleMobileMenu}
            className="md:hidden min-w-[44px] min-h-[44px] p-2 rounded-xl text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-2)] transition-colors cursor-pointer flex items-center justify-center"
            aria-label="Open mobile navigation menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}

        {breadcrumbs && breadcrumbs.length > 0 && (
          <div className="hidden sm:block truncate">
            <Breadcrumbs items={breadcrumbs} />
          </div>
        )}
      </div>

      {/* Center: Command Palette Trigger Button */}
      {onOpenCommandPalette && (
        <button
          type="button"
          onClick={onOpenCommandPalette}
          className="hidden md:flex items-center justify-between w-64 lg:w-80 px-3 py-1.5 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] text-xs text-[var(--text-muted)] hover:border-[var(--border-strong)] transition-all cursor-pointer"
          aria-label="Search or run command"
        >
          <span className="flex items-center gap-2">
            <Search className="w-4 h-4 text-[var(--text-muted)]" />
            <span className="font-medium">Quick search or command...</span>
          </span>
          <span className="flex items-center gap-0.5 text-[10px] font-mono font-bold bg-[var(--surface)] border border-[var(--border)] px-1.5 py-0.5 rounded shadow-xs">
            <Command className="w-3 h-3" />
            <span>K</span>
          </span>
        </button>
      )}

      {/* Right: Actions, Theme, Notifications, Avatar */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {/* Mobile search trigger */}
        {onOpenCommandPalette && (
          <button
            type="button"
            onClick={onOpenCommandPalette}
            className="md:hidden min-w-[44px] min-h-[44px] p-2 rounded-xl text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-2)] transition-colors cursor-pointer flex items-center justify-center"
            aria-label="Search"
          >
            <Search className="w-4.5 h-4.5" />
          </button>
        )}

        {/* Theme Toggle */}
        <button
          type="button"
          onClick={toggleTheme}
          className="min-w-[44px] min-h-[44px] p-2 rounded-xl text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-2)] transition-colors cursor-pointer flex items-center justify-center"
          aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
          title={isDark ? 'Light Theme' : 'Dark Theme'}
        >
          {isDark ? <Sun className="w-4.5 h-4.5 text-amber-400" /> : <Moon className="w-4.5 h-4.5" />}
        </button>

        {/* Notification Bell & Dropdown Feed */}
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            data-testid="notification-bell-btn"
            onClick={handleToggleNotifications}
            className="min-w-[44px] min-h-[44px] p-2 rounded-xl text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-2)] transition-colors relative cursor-pointer flex items-center justify-center"
            aria-label={unreadNotificationsCount > 0 ? `View ${unreadNotificationsCount} notifications` : 'View notifications'}
          >
            <Bell className="w-4.5 h-4.5" />
            {unreadNotificationsCount > 0 && (
              <span
                data-testid="notification-badge"
                className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center shadow-xs"
              >
                {unreadNotificationsCount > 99 ? '99+' : unreadNotificationsCount}
              </span>
            )}
          </button>

          {isNotificationsOpen && (
            <div
              data-testid="notification-dropdown"
              className="absolute right-0 top-full mt-2 w-80 sm:w-96 rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl z-[var(--z-popover)] overflow-hidden flex flex-col max-h-[480px] animate-in fade-in-0 zoom-in-95 duration-150"
            >
              {/* Dropdown Header */}
              <div className="px-4 py-3 border-b border-[var(--border)] flex items-center justify-between bg-[var(--surface-2)]/60">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-[var(--text)]">Notifications</span>
                  {unreadNotificationsCount > 0 && (
                    <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/15 text-rose-600 dark:text-rose-400">
                      {unreadNotificationsCount} new
                    </span>
                  )}
                </div>
                {unreadNotificationsCount > 0 && onMarkAllAsRead && (
                  <button
                    type="button"
                    data-testid="mark-all-read"
                    onClick={() => {
                      onMarkAllAsRead();
                    }}
                    className="text-[11px] font-semibold text-[var(--accent)] hover:underline cursor-pointer"
                  >
                    Mark all as read
                  </button>
                )}
              </div>

              {/* Feed List */}
              <div className="overflow-y-auto divide-y divide-[var(--border)]/40 p-1.5 flex-1 custom-scrollbar">
                {!notifications || notifications.length === 0 ? (
                  <div className="py-10 px-4 text-center text-[var(--text-muted)] flex flex-col items-center">
                    <Check className="w-8 h-8 text-emerald-500 mb-1.5 opacity-80" />
                    <p className="text-xs font-bold text-[var(--text)]">All caught up!</p>
                    <p className="text-[11px] mt-0.5 text-[var(--text-muted)]">No alerts or notifications right now.</p>
                  </div>
                ) : (
                  notifications.map((n) => {
                    const categoryColor = getCategoryStyle(n.category);
                    return (
                      <div
                        key={n.id}
                        data-testid="notification-item"
                        onClick={() => handleItemClick(n)}
                        className={`p-3 rounded-xl transition-colors cursor-pointer group flex flex-col gap-1 ${
                          n.isRead
                            ? 'bg-transparent hover:bg-[var(--surface-2)]/60 opacity-75'
                            : 'bg-[var(--surface-2)]/40 hover:bg-[var(--surface-2)] border border-[var(--border-strong)]/30'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${categoryColor}`}>
                            {n.category || 'General'}
                          </span>
                          <div className="flex items-center gap-1.5">
                            {!n.isRead && onMarkAsRead && (
                              <button
                                type="button"
                                data-testid="mark-read-btn"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onMarkAsRead(n.id);
                                }}
                                className="text-[10px] text-[var(--accent)] hover:underline font-semibold cursor-pointer"
                              >
                                Mark read
                              </button>
                            )}
                            {!n.isRead && (
                              <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                            )}
                          </div>
                        </div>
                        <h5 className="text-xs font-bold text-[var(--text)] line-clamp-1 leading-snug">
                          {n.title}
                        </h5>
                        <p className="text-[11px] text-[var(--text-muted)] line-clamp-2 leading-relaxed">
                          {n.body}
                        </p>
                        <div className="flex items-center justify-between text-[10px] text-[var(--text-muted)] mt-1 font-mono">
                          <span>
                            {formatTimeAgo(n.createdAt)}
                          </span>
                          {n.deepLink && (
                            <span className="text-[10px] text-[var(--accent)] flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                              View record →
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Avatar + Role Badge with Interactive Menu */}
        <div className="relative" ref={userMenuRef}>
          <button
            type="button"
            onClick={() => setIsUserMenuOpen((prev) => !prev)}
            className="flex items-center gap-2.5 pl-2 py-1 pr-1.5 rounded-xl border-l border-[var(--border)] hover:bg-[var(--surface-2)] transition-colors cursor-pointer"
            aria-label="User account menu"
            aria-expanded={isUserMenuOpen}
          >
            <Avatar
              name={user.name}
              src={user.avatarUrl}
              size="sm"
              status="online"
            />
            <div className="hidden lg:block text-left">
              <span className="text-xs font-bold text-[var(--text)] block truncate leading-tight">
                {user.name}
              </span>
              <span className="text-[10px] font-semibold text-[var(--text-muted)] block truncate uppercase tracking-wider">
                {user.role}
              </span>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-[var(--text-muted)] hidden sm:block" />
          </button>

          {/* User Profile Dropdown Menu */}
          {isUserMenuOpen && (
            <div className="absolute right-0 top-full mt-2 w-56 rounded-2xl bg-[var(--surface)] border border-[var(--border)] shadow-xl p-2 z-[var(--z-dropdown)] animate-in fade-in zoom-in-95 duration-150">
              <div className="px-3 py-2 border-b border-[var(--border)]/60">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] block">
                  Signed in as
                </span>
                <span className="text-xs font-bold text-[var(--text)] block truncate mt-0.5">
                  {user.name}
                </span>
                <span className="text-[11px] text-[var(--text-muted)] block truncate font-mono mt-0.5">
                  {user.email || user.role}
                </span>
              </div>

              {onLogout && (
                <div className="pt-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      onLogout();
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-colors cursor-pointer text-left"
                  >
                    <LogOut className="w-4 h-4 shrink-0" />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
