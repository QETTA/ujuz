'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { ROUTES } from '@/lib/platform/navigation';
import {
  HomeIcon,
  BuildingOffice2Icon,
  ChatBubbleLeftEllipsisIcon,
  UserCircleIcon,
} from '@heroicons/react/24/outline';
import {
  HomeIcon as HomeIconSolid,
  BuildingOffice2Icon as BuildingOffice2IconSolid,
  ChatBubbleLeftEllipsisIcon as ChatBubbleLeftEllipsisIconSolid,
  UserCircleIcon as UserCircleIconSolid,
} from '@heroicons/react/24/solid';

const tabs = [
  { href: ROUTES.HOME, label: '홈', Icon: HomeIcon, ActiveIcon: HomeIconSolid },
  { href: ROUTES.FACILITIES, label: '시설', Icon: BuildingOffice2Icon, ActiveIcon: BuildingOffice2IconSolid },
  { href: ROUTES.AI, label: 'AI', Icon: ChatBubbleLeftEllipsisIcon, ActiveIcon: ChatBubbleLeftEllipsisIconSolid },
  { href: ROUTES.MY, label: 'MY', Icon: UserCircleIcon, ActiveIcon: UserCircleIconSolid },
] as const;

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-4 left-1/2 z-nav flex -translate-x-1/2 items-center gap-1 rounded-full border border-border-subtle bg-surface-glass px-2 py-1.5 shadow-glass backdrop-blur-xl safe-bottom"
      aria-label="메인 내비게이션"
    >
      {tabs.map(({ href, label, Icon, ActiveIcon }) => {
        const isActive = href === ROUTES.HOME ? pathname === ROUTES.HOME : pathname.startsWith(href);
        const IconComponent = isActive ? ActiveIcon : Icon;

        return (
          <Link
            key={href}
            href={href}
            aria-current={isActive ? 'page' : undefined}
            className={cn(
              'flex flex-col items-center rounded-full px-4 py-1.5 text-[10px] font-medium transition-colors',
              isActive
                ? 'bg-brand-500/10 text-brand-600'
                : 'text-text-tertiary hover:text-text-secondary',
            )}
          >
            <IconComponent className="h-5 w-5" aria-hidden="true" />
            <span className="mt-0.5">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
