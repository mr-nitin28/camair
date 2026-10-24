'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  ChevronLeft, 
  ChevronRight, 
  GraduationCap,
  LogOut,
  type LucideIcon 
} from 'lucide-react';
import { Tooltip } from './tooltip';
import { Avatar } from './avatar';
import { ConfirmDialog } from './confirm-dialog';

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  badge?: string | number;
}

export interface NavGroup {
  title?: string;
  items: NavItem[];
}

export interface SidebarUser {
  name: string;
  role: string;
  avatarUrl?: string;
  email?: string;
}

export interface SidebarNavProps {
  groups: NavGroup[];
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  roleTitle?: string;
  logoHref?: string;
  user?: SidebarUser;
  onLogout?: () => void;
  className?: string;
}

export function SidebarNav({
  groups,
  isCollapsed,
  onToggleCollapse,
  roleTitle = 'Portal',
  logoHref = '/dashboard',
  user,
  onLogout,
  className = '',
}: SidebarNavProps) {
  const pathname = usePathname();
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);

  return (
    <aside
      aria-label="Sidebar navigation"
      className={`relative h-full flex flex-col bg-[var(--surface)] border-r border-[var(--border)] transition-all duration-200 select-none ${
        isCollapsed ? 'w-[72px]' : 'w-[264px]'
      } ${className}`}
    >
      {/* Brand Header */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-[var(--border)] shrink-0">
        <Link
          href={logoHref}
          className="flex items-center gap-3 overflow-hidden text-left"
          title="CampusOS"
        >
          <div className="w-10 h-10 rounded-xl bg-[var(--accent)] text-white flex items-center justify-center shrink-0 shadow-sm font-extrabold">
            <GraduationCap className="w-5 h-5" />
          </div>
          {!isCollapsed && (
            <div className="min-w-0">
              <span className="text-sm font-extrabold text-[var(--text)] tracking-tight block truncate">
                CampusOS
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] block truncate">
                {roleTitle}
              </span>
            </div>
          )}
        </Link>
      </div>

      {/* Navigation Groups List */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6 custom-scrollbar">
        {groups.map((group, gIdx) => (
          <div key={gIdx} className="space-y-1">
            {group.title && !isCollapsed && (
              <h3 className="px-3 text-[10px] font-extrabold uppercase tracking-widest text-[var(--text-muted)] mb-2">
                {group.title}
              </h3>
            )}
            {group.title && isCollapsed && (
              <div className="h-px bg-[var(--border)] mx-2 my-2" aria-hidden="true" />
            )}

            <ul className="space-y-1">
              {group.items.map((item) => {
                const isActive = pathname === item.href || (item.href !== '/dashboard' && item.href !== '/faculty' && item.href !== '/admin' && pathname?.startsWith(item.href));
                const Icon = item.icon;

                const linkContent = (
                  <Link
                    href={item.href}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all duration-150 relative group ${
                      isActive
                        ? 'bg-[var(--accent-soft)] text-[var(--accent)] shadow-xs'
                        : 'text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-2)]'
                    } ${isCollapsed ? 'justify-center' : ''}`}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    <Icon
                      className={`w-4 h-4 shrink-0 transition-transform duration-150 ${
                        isActive ? 'text-[var(--accent)]' : 'group-hover:scale-105'
                      }`}
                    />
                    {!isCollapsed && (
                      <span className="flex-1 truncate">{item.label}</span>
                    )}
                    {!isCollapsed && item.badge !== undefined && (
                      <span className="px-1.5 py-0.5 text-[10px] font-extrabold rounded-md bg-[var(--surface-3)] text-[var(--text)]">
                        {item.badge}
                      </span>
                    )}
                    {isActive && (
                      <span
                        className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-[var(--accent)]"
                        aria-hidden="true"
                      />
                    )}
                  </Link>
                );

                return (
                  <li key={item.href}>
                    {isCollapsed ? (
                      <Tooltip content={item.label} side="right">
                        {linkContent}
                      </Tooltip>
                    ) : (
                      linkContent
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Footer: User Profile, Sign Out & Collapse Toggle */}
      <div className="p-3 border-t border-[var(--border)] shrink-0 space-y-2 bg-[var(--surface)]">
        {/* User Card when Expanded */}
        {user && !isCollapsed && (
          <div className="flex items-center gap-2.5 p-2 rounded-xl bg-[var(--surface-2)]/60 border border-[var(--border)]/60">
            <Avatar
              name={user.name}
              src={user.avatarUrl}
              size="sm"
              status="online"
            />
            <div className="min-w-0 flex-1 text-left">
              <span className="text-xs font-bold text-[var(--text)] block truncate leading-tight">
                {user.name}
              </span>
              <span className="text-[10px] font-semibold text-[var(--text-muted)] block truncate mt-0.5">
                {user.role}
              </span>
            </div>
            {onLogout && (
              <Tooltip content="Sign Out" side="top">
                <button
                  type="button"
                  onClick={() => setIsLogoutConfirmOpen(true)}
                  className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-rose-600 hover:bg-rose-500/10 active:scale-95 transition-all cursor-pointer"
                  aria-label="Sign Out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </Tooltip>
            )}
          </div>
        )}

        {/* User Avatar when Collapsed (Rail) */}
        {user && isCollapsed && (
          <div className="flex justify-center">
            <Tooltip content={`${user.name} (${user.role})`} side="right">
              <div className="p-1 cursor-default">
                <Avatar
                  name={user.name}
                  src={user.avatarUrl}
                  size="sm"
                  status="online"
                />
              </div>
            </Tooltip>
          </div>
        )}

        {/* Dedicated Sign Out Button when Expanded */}
        {!isCollapsed && onLogout && (
          <button
            type="button"
            onClick={() => setIsLogoutConfirmOpen(true)}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 active:scale-98 transition-all cursor-pointer"
            aria-label="Sign Out of CampusOS"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            <span>Sign Out</span>
          </button>
        )}

        {/* Dedicated Sign Out Button when Collapsed (Rail) */}
        {isCollapsed && onLogout && (
          <div className="flex justify-center">
            <Tooltip content="Sign Out" side="right">
              <button
                type="button"
                onClick={() => setIsLogoutConfirmOpen(true)}
                className="w-10 h-10 flex items-center justify-center rounded-xl text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 active:scale-95 transition-all cursor-pointer"
                aria-label="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </Tooltip>
          </div>
        )}

        {/* Collapse / Expand Rail Toggle */}
        <button
          type="button"
          onClick={onToggleCollapse}
          className={`w-full flex items-center justify-center gap-2 p-2 rounded-xl text-xs font-bold text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-2)] active:scale-98 transition-all cursor-pointer ${
            isCollapsed ? 'h-10 p-0' : ''
          }`}
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar to rail'}
          title={isCollapsed ? 'Expand (264px)' : 'Collapse to rail (72px)'}
        >
          {isCollapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <>
              <ChevronLeft className="w-4 h-4" />
              <span>Collapse Rail</span>
            </>
          )}
        </button>
      </div>

      {/* Confirmation Dialog for Safe Logout */}
      <ConfirmDialog
        isOpen={isLogoutConfirmOpen}
        onClose={() => setIsLogoutConfirmOpen(false)}
        onConfirm={async () => {
          setIsLogoutConfirmOpen(false);
          if (onLogout) {
            onLogout();
          }
        }}
        title="Sign Out of CampusOS"
        description="Are you sure you want to end your active session? You will be returned to the login screen."
        confirmText="Sign Out"
        cancelText="Stay Signed In"
        variant="danger"
      />
    </aside>
  );
}
