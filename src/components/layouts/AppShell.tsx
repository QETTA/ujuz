'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { ROUTES } from '@/lib/platform/navigation';
import { useToAlertStore } from '@/lib/store';
import {
  HomeIcon,
  MagnifyingGlassIcon,
  ChatBubbleLeftEllipsisIcon,
  BellIcon,
  UserCircleIcon,
} from '@heroicons/react/24/outline';
import {
  HomeIcon as HomeIconSolid,
  MagnifyingGlassIcon as MagnifyingGlassIconSolid,
  ChatBubbleLeftEllipsisIcon as ChatBubbleLeftEllipsisIconSolid,
  BellIcon as BellIconSolid,
  UserCircleIcon as UserCircleIconSolid,
} from '@heroicons/react/24/solid';
import type { ComponentType, SVGProps } from 'react';

type HeroIcon = ComponentType<SVGProps<SVGSVGElement> & { title?: string; titleId?: string }>;

interface Tab {
  href: string;
  label: string;
  Icon: HeroIcon;
  ActiveIcon: HeroIcon;
  badge?: 'unread';
}

const tabs: Tab[] = [
  { href: ROUTES.HOME, label: '홈', Icon: HomeIcon, ActiveIcon: HomeIconSolid },
  { href: ROUTES.SEARCH, label: '검색', Icon: MagnifyingGlassIcon, ActiveIcon: MagnifyingGlassIconSolid },
  { href: ROUTES.CHAT, label: '채팅', Icon: ChatBubbleLeftEllipsisIcon, ActiveIcon: ChatBubbleLeftEllipsisIconSolid },
  { href: ROUTES.ALERTS, label: '알림', Icon: BellIcon, ActiveIcon: BellIconSolid, badge: 'unread' },
  { href: ROUTES.PROFILE, label: '마이', Icon: UserCircleIcon, ActiveIcon: UserCircleIconSolid },
];

function isTabActive(href: string, pathname: string): boolean {
  if (href === ROUTES.HOME) return pathname === ROUTES.HOME;
  return pathname.startsWith(href);
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-surface focus:px-3 focus:py-2 focus:text-sm focus:font-medium focus:text-text-primary focus:shadow-lg"
      >
        본문으로 건너뛰기
      </a>
      {/* Desktop sidebar */}
      <DesktopSidebar />
      {/* Main content */}
      <div className="relative mx-auto flex w-full max-w-lg flex-1 flex-col bg-surface lg:max-w-none">
        <main id="main-content" role="main" className="flex-1 pb-20 lg:pb-0 lg:pl-64">
          {children}
        </main>
      </div>
      {/* Mobile bottom nav */}
      <MobileBottomNav />
    </div>
  );
}

function DesktopSidebar() {
  const pathname = usePathname();
  const unreadCount = useToAlertStore((s) => s.unreadCount);

  return (
    <aside className="fixed inset-y-0 left-0 z-nav hidden w-64 border-r border-border bg-surface-elevated lg:flex lg:flex-col">
      {/* Logo */}
      <div className="flex h-16 items-center px-6">
        <Link href={ROUTES.HOME} className="text-xl font-bold text-brand-600">
          우주지
        </Link>
      </div>
      {/* Nav */}
      <nav className="flex flex-1 flex-col gap-1 px-3 py-2" aria-label="메인 내비게이션">
        {tabs.map(({ href, label, Icon, ActiveIcon, badge }) => {
          const isActive = isTabActive(href, pathname);
          const IconComponent = isActive ? ActiveIcon : Icon;
          return (
            <Link
              key={href}
              href={href}
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-brand-500/10 text-brand-600'
                  : 'text-text-secondary hover:bg-surface-inset hover:text-text-primary',
              )}
            >
              <IconComponent className="h-5 w-5 shrink-0" aria-hidden="true" />
              <span className="flex-1">{label}</span>
              {badge === 'unread' && unreadCount > 0 && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-danger px-1.5 text-[10px] font-bold text-text-inverse">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

function MobileBottomNav() {
  const pathname = usePathname();
  const unreadCount = useToAlertStore((s) => s.unreadCount);

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-nav flex items-center border-t border-border-subtle bg-surface-glass backdrop-blur-xl safe-bottom lg:hidden"
      aria-label="메인 내비게이션"
    >
      {tabs.map(({ href, label, Icon, ActiveIcon, badge }) => {
        const isActive = isTabActive(href, pathname);
        const IconComponent = isActive ? ActiveIcon : Icon;
        return (
          <Link
            key={href}
            href={href}
            aria-current={isActive ? 'page' : undefined}
            className={cn(
              'relative flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition-colors',
              isActive ? 'text-brand-600' : 'text-text-tertiary',
            )}
          >
            <span className="relative">
              <IconComponent className="h-5 w-5" aria-hidden="true" />
              {badge === 'unread' && unreadCount > 0 && (
                <span className="absolute -right-2 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[9px] font-bold text-text-inverse">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </span>
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
