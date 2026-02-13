'use client';

import { createContext, useCallback, useContext, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface TabsContextValue {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  registerTab: (value: string) => void;
  tabValues: () => string[];
}

const TabsContext = createContext<TabsContextValue>({
  activeTab: '',
  setActiveTab: () => {},
  registerTab: () => {},
  tabValues: () => [],
});

export interface TabsProps {
  defaultValue: string;
  value?: string;
  onValueChange?: (value: string) => void;
  children: ReactNode;
  className?: string;
}

export function Tabs({ defaultValue, value, onValueChange, children, className }: TabsProps) {
  const [internalValue, setInternalValue] = useState(defaultValue);
  const tabValuesRef = useRef<string[]>([]);
  const activeTab = value ?? internalValue;

  const setActiveTab = useCallback((tab: string) => {
    if (!value) setInternalValue(tab);
    onValueChange?.(tab);
  }, [value, onValueChange]);

  const registerTab = useCallback((val: string) => {
    if (!tabValuesRef.current.includes(val)) {
      tabValuesRef.current.push(val);
    }
  }, []);

  const tabValues = useCallback(() => tabValuesRef.current, []);

  return (
    <TabsContext value={{ activeTab, setActiveTab, registerTab, tabValues }}>
      <div className={className}>{children}</div>
    </TabsContext>
  );
}

export function TabsList({ children, className }: { children: ReactNode; className?: string }) {
  const { activeTab, setActiveTab, tabValues } = useContext(TabsContext);

  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLDivElement>) => {
    const tabs = tabValues();
    const currentIndex = tabs.indexOf(activeTab);
    if (currentIndex === -1) return;

    let nextIndex: number | null = null;

    switch (e.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        nextIndex = (currentIndex + 1) % tabs.length;
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
        break;
      case 'Home':
        nextIndex = 0;
        break;
      case 'End':
        nextIndex = tabs.length - 1;
        break;
      default:
        return;
    }

    e.preventDefault();
    setActiveTab(tabs[nextIndex]);

    // Focus the newly active tab button
    const container = e.currentTarget;
    const buttons = container.querySelectorAll<HTMLButtonElement>('[role="tab"]');
    buttons[nextIndex]?.focus();
  }, [activeTab, setActiveTab, tabValues]);

  return (
    <div
      role="tablist"
      onKeyDown={handleKeyDown}
      className={cn(
        'flex items-center gap-1 rounded-lg bg-surface-inset p-1',
        className,
      )}
    >
      {children}
    </div>
  );
}

export function TabsTrigger({
  value,
  children,
  className,
}: {
  value: string;
  children: ReactNode;
  className?: string;
}) {
  const { activeTab, setActiveTab, registerTab } = useContext(TabsContext);
  const isActive = activeTab === value;

  // Register this tab value on first render
  registerTab(value);

  return (
    <button
      type="button"
      role="tab"
      aria-selected={isActive}
      data-state={isActive ? 'active' : 'inactive'}
      tabIndex={isActive ? 0 : -1}
      onClick={() => setActiveTab(value)}
      className={cn(
        'flex-1 rounded-md border-b-2 border-transparent px-3 py-1.5 text-sm font-medium transition-all duration-200 ease-out active:scale-95',
        'data-[state=active]:border-brand-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-1',
        isActive
          ? 'bg-surface text-text-primary shadow-sm'
          : 'text-text-tertiary hover:bg-muted/50 hover:text-text-secondary',
        className,
      )}
    >
      {children}
    </button>
  );
}

export function TabsContent({
  value,
  children,
  className,
}: {
  value: string;
  children: ReactNode;
  className?: string;
}) {
  const { activeTab } = useContext(TabsContext);
  if (activeTab !== value) return null;

  return (
    <div role="tabpanel" tabIndex={0} className={cn('mt-3 animate-in fade-in-0 duration-200', className)}>
      {children}
    </div>
  );
}
