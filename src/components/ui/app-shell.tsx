'use client';

import React, { useState, useEffect } from 'react';
import { SidebarNav, type NavGroup } from './sidebar-nav';
import { TopBar, type TopBarNotificationItem } from './top-bar';
import { BottomTabBar, type TabBarItem } from './bottom-tab-bar';
import { CommandPalette, type CommandItem } from './command-palette';
import { Sheet } from './sheet';
import type { BreadcrumbItem } from './breadcrumbs';

export interface AppShellProps {
  children: React.ReactNode;
  navGroups: NavGroup[];
  mobileTabs?: TabBarItem[];
  roleTitle?: string;
  role?: 'student' | 'faculty' | 'admin';
  user?: {
    name: string;
    role: string;
    avatarUrl?: string;
    email?: string;
  };
  breadcrumbs?: BreadcrumbItem[];
  customCommands?: CommandItem[];
  unreadNotificationsCount?: number;
  notifications?: TopBarNotificationItem[];
  onNotificationsClick?: () => void;
  onMarkAsRead?: (id: string) => void;
  onMarkAllAsRead?: () => void;
  onNotificationClick?: (item: TopBarNotificationItem) => void;
  density?: 'comfortable' | 'compact';
}

export function AppShell({
  children,
  navGroups,
  mobileTabs,
  roleTitle = 'Portal',
  role = 'student',
  user,
  breadcrumbs,
  customCommands,
  unreadNotificationsCount,
  notifications,
  onNotificationsClick,
  onMarkAsRead,
  onMarkAllAsRead,
  onNotificationClick,
  density = 'comfortable',
}: AppShellProps) {
  const [isRail, setIsRail] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);

  // Restore rail preference from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('campusos_nav_rail');
    if (saved !== null) {
      setIsRail(saved === 'true');
    }
  }, []);

  // Global Ctrl/Cmd+K shortcut listener to toggle Command Palette
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleToggleRail = () => {
    setIsRail((prev) => {
      const next = !prev;
      localStorage.setItem('campusos_nav_rail', String(next));
      return next;
    });
  };

  return (
    <div
      data-role={role}
      data-density={density}
      className="min-h-screen bg-[var(--bg)] text-[var(--text)] flex flex-col antialiased selection:bg-[var(--accent-soft)] selection:text-[var(--accent)]"
    >
      <div className="flex h-screen overflow-hidden">
        {/* Desktop Sidebar (hidden on mobile) */}
        <div className="hidden md:block shrink-0">
          <SidebarNav
            groups={navGroups}
            isCollapsed={isRail}
            onToggleCollapse={handleToggleRail}
            roleTitle={roleTitle}
          />
        </div>

        {/* Mobile Slide-Over Drawer for Navigation */}
        <Sheet
          isOpen={isMobileMenuOpen}
          onClose={() => setIsMobileMenuOpen(false)}
          title={`CampusOS ${roleTitle}`}
          side="left"
          className="max-w-xs"
        >
          <div className="-mx-5 -my-5">
            <SidebarNav
              groups={navGroups}
              isCollapsed={false}
              onToggleCollapse={() => setIsMobileMenuOpen(false)}
              roleTitle={roleTitle}
              className="border-none w-full"
            />
          </div>
        </Sheet>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* TopBar */}
          <TopBar
            onToggleMobileMenu={() => setIsMobileMenuOpen(true)}
            onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
            breadcrumbs={breadcrumbs}
            user={user}
            unreadNotificationsCount={unreadNotificationsCount}
            notifications={notifications}
            onNotificationsClick={onNotificationsClick}
            onMarkAsRead={onMarkAsRead}
            onMarkAllAsRead={onMarkAllAsRead}
            onNotificationClick={onNotificationClick}
          />

          {/* Scrollable Page Canvas */}
          <main className="flex-1 overflow-y-auto px-4 md:px-8 py-6 md:py-8 custom-scrollbar pb-24 md:pb-8">
            <div className="max-w-7xl mx-auto w-full">{children}</div>
          </main>
        </div>
      </div>

      {/* Mobile Bottom Tab Bar */}
      {mobileTabs && mobileTabs.length > 0 && (
        <BottomTabBar items={mobileTabs} />
      )}

      {/* Global Command Palette (Ctrl/Cmd+K) */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onOpen={() => setIsCommandPaletteOpen(true)}
        onClose={() => setIsCommandPaletteOpen(false)}
        currentRole={role}
        customItems={customCommands}
      />
    </div>
  );
}
