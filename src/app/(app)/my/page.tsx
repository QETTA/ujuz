'use client';

import Link from 'next/link';
import { signOut } from 'next-auth/react';
import { TopBar } from '@/components/nav/top-bar';
import { Card } from '@/components/ui/card';
import { useUjuzSession } from '@/lib/client/auth';
import { useSubscription } from '@/lib/client/hooks/useSubscription';
import { ROUTES } from '@/lib/platform/navigation';
import {
  Cog6ToothIcon,
  CreditCardIcon,
  UserCircleIcon,
  ArrowRightOnRectangleIcon,
} from '@heroicons/react/24/outline';

const menuItems = [
  { href: ROUTES.MY_SETTINGS, label: '설정', Icon: Cog6ToothIcon },
  { href: ROUTES.PRICING, label: '구독 관리', Icon: CreditCardIcon },
];

export default function MyPage() {
  const { data: session, isAnonymous } = useUjuzSession();
  const { subscription } = useSubscription();

  const displayName = isAnonymous ? '비회원' : (session?.user?.name ?? '사용자');
  const planLabel = subscription.plan_tier === 'premium' ? '프리미엄' : subscription.plan_tier === 'basic' ? '베이직' : '무료 플랜';

  return (
    <div className="flex flex-col">
      <TopBar title="MY" />

      <div className="space-y-4 px-4 py-4">
        {/* Profile Card */}
        <Card variant="elevated" className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-100">
            <UserCircleIcon className="h-8 w-8 text-brand-600" />
          </div>
          <div className="flex-1">
            <p className="text-base font-semibold text-text-primary">{displayName}</p>
            <p className="text-xs text-text-tertiary">{planLabel}</p>
          </div>
        </Card>

        {/* Menu */}
        <div className="space-y-1">
          {menuItems.map(({ href, label, Icon }) => (
            <Link key={href} href={href}>
              <div className="flex items-center gap-3 rounded-xl px-2 py-3 transition-colors hover:bg-surface-inset">
                <Icon className="h-5 w-5 text-text-secondary" />
                <span className="flex-1 text-sm font-medium text-text-primary">{label}</span>
                <span className="text-text-tertiary">&rsaquo;</span>
              </div>
            </Link>
          ))}
        </div>

        {/* Logout */}
        <button
          type="button"
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="flex w-full items-center gap-3 rounded-xl px-2 py-3 text-danger transition-colors hover:bg-danger/5"
        >
          <ArrowRightOnRectangleIcon className="h-5 w-5" />
          <span className="text-sm font-medium">로그아웃</span>
        </button>
      </div>
    </div>
  );
}
