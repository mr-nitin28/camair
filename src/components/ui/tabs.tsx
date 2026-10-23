'use client';

import React, { createContext, useContext, useState, useId } from 'react';

interface TabsContextType {
  activeTab: string;
  setActiveTab: (val: string) => void;
  baseId: string;
}

const TabsContext = createContext<TabsContextType | null>(null);
const TabVariantContext = createContext<'pills' | 'underline'>('pills');

export interface TabsProps {
  defaultValue: string;
  value?: string;
  onValueChange?: (val: string) => void;
  children: React.ReactNode;
  className?: string;
}

export function Tabs({
  defaultValue,
  value,
  onValueChange,
  children,
  className = '',
}: TabsProps) {
  const [internalValue, setInternalValue] = useState(defaultValue);
  const baseId = useId();

  const activeTab = value !== undefined ? value : internalValue;
  const setActiveTab = (val: string) => {
    if (value === undefined) {
      setInternalValue(val);
    }
    onValueChange?.(val);
  };

  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab, baseId }}>
      <div className={`space-y-4 ${className}`}>{children}</div>
    </TabsContext.Provider>
  );
}

export interface TabListProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'pills' | 'underline';
}

export function TabList({
  children,
  className = '',
  variant = 'pills',
}: TabListProps) {
  const variantStyles = {
    pills: 'p-1 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] inline-flex',
    underline: 'border-b border-[var(--border)] flex gap-4',
  };

  return (
    <TabVariantContext.Provider value={variant}>
      <div
        role="tablist"
        className={`items-center gap-1 ${variantStyles[variant]} ${className}`}
      >
        {children}
      </div>
    </TabVariantContext.Provider>
  );
}

export interface TabTriggerProps {
  value: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
  disabled?: boolean;
  className?: string;
}

export function TabTrigger({
  value,
  children,
  icon,
  disabled = false,
  className = '',
}: TabTriggerProps) {
  const context = useContext(TabsContext);
  if (!context) throw new Error('TabTrigger must be used within Tabs');

  const variant = useContext(TabVariantContext);
  const { activeTab, setActiveTab, baseId } = context;
  const isSelected = activeTab === value;

  const triggerStyles =
    variant === 'underline'
      ? isSelected
        ? 'border-b-2 border-[var(--accent)] text-[var(--accent)] pb-2 px-3 rounded-none font-bold -mb-px'
        : 'border-b-2 border-transparent text-[var(--text-muted)] hover:text-[var(--text)] pb-2 px-3 rounded-none font-medium -mb-px'
      : isSelected
      ? 'bg-[var(--surface)] text-[var(--accent)] shadow-sm border border-[var(--border)]'
      : 'text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface)]/50';

  return (
    <button
      role="tab"
      type="button"
      id={`${baseId}-tab-${value}`}
      aria-controls={`${baseId}-panel-${value}`}
      aria-selected={isSelected}
      disabled={disabled}
      onClick={() => setActiveTab(value)}
      className={`inline-flex items-center gap-2 px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all duration-150 cursor-pointer select-none disabled:opacity-40 disabled:cursor-not-allowed ${triggerStyles} ${className}`}
    >
      {icon}
      <span>{children}</span>
    </button>
  );
}

export interface TabContentProps {
  value: string;
  children: React.ReactNode;
  className?: string;
}

export function TabContent({ value, children, className = '' }: TabContentProps) {
  const context = useContext(TabsContext);
  if (!context) throw new Error('TabContent must be used within Tabs');

  const { activeTab, baseId } = context;
  if (activeTab !== value) return null;

  return (
    <div
      role="tabpanel"
      id={`${baseId}-panel-${value}`}
      aria-labelledby={`${baseId}-tab-${value}`}
      tabIndex={0}
      className={`focus:outline-none ${className}`}
    >
      {children}
    </div>
  );
}
