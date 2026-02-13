'use client';

import Link from 'next/link';
import { signOut } from 'next-auth/react';
import { PageHeader } from '@/components/layouts/PageHeader';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useUjuzSession } from '@/lib/client/auth';
import { useApiFetch } from '@/lib/client/hooks/useApiFetch';
import { ROUTES } from '@/lib/platform/navigation';
import { useTheme } from '@/lib/hooks/useTheme';
import { nextThemeMode } from '@/lib/hooks/useTheme';
import {
  UserCircleIcon,
  Cog6ToothIcon,
  CreditCardIcon,
  DocumentTextIcon,
  ArrowRightStartOnRectangleIcon,
  SunIcon,
  MoonIcon,
  ComputerDesktopIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline';

interface UserProfile {
  nickname?: string;
  children_count?: number;
  subscription_tier?: string;
}

export default function ProfilePage() {
  const { isAnonymous, provider } = useUjuzSession();
  const { data: profile } = useApiFetch<UserProfile>('/api/v1/user/account');
  const { mode, setMode } = useTheme();

  const themeIcons = {
    light: SunIcon,
    dark: MoonIcon,
    system: ComputerDesktopIcon,
  };
  const ThemeIcon = themeIcons[mode];

  return (
    <div className="flex flex-col">
      <PageHeader title="마이페이지" />

      <div className="space-y-6 p-4">
        {/* Profile summary */}
        <Card variant="elevated" className="p-5">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-100">
              <UserCircleIcon className="h-8 w-8 text-brand-600" />
            </div>
            <div className="flex-1">
              <p className="text-base font-semibold text-text-primary">
                {profile?.nickname ?? (isAnonymous ? '비회원 사용자' : '사용자')}
              </p>
              <p className="text-xs text-text-tertiary">
                {isAnonymous
                  ? '로그인하면 더 많은 기능을 이용할 수 있어요'
                  : `${provider ?? 'OAuth'} 로그인`}
              </p>
            </div>
          </div>
          {isAnonymous && (
            <Link
              href={ROUTES.LOGIN}
              className="mt-4 block rounded-lg bg-brand-500 py-2.5 text-center text-sm font-medium text-text-inverse hover:bg-brand-600 transition-colors"
            >
              로그인 / 회원가입
            </Link>
          )}
        </Card>

        {/* Menu items */}
        <div className="space-y-1">
          <MenuItem
            icon={CreditCardIcon}
            label="구독 관리"
            sublabel={profile?.subscription_tier ?? '무료'}
            href={ROUTES.SUBSCRIPTION}
          />
          <MenuItem
            icon={DocumentTextIcon}
            label="아이 프로필"
            sublabel={profile?.children_count ? `${profile.children_count}명` : '미등록'}
            href="/children"
          />
          <MenuItem icon={Cog6ToothIcon} label="설정" href="/settings" />

          {/* Theme toggle */}
          <button
            type="button"
            onClick={() => setMode(nextThemeMode(mode))}
            className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left transition-colors hover:bg-surface-inset"
          >
            <ThemeIcon className="h-5 w-5 text-text-tertiary" />
            <span className="flex-1 text-sm text-text-primary">테마</span>
            <span className="text-xs text-text-tertiary capitalize">{mode}</span>
          </button>
        </div>

        {/* Logout */}
        {!isAnonymous && (
          <Button
            variant="ghost"
            className="w-full text-danger"
            onClick={() => signOut({ callbackUrl: '/' })}
          >
            <ArrowRightStartOnRectangleIcon className="h-5 w-5" />
            로그아웃
          </Button>
        )}
      </div>
    </div>
  );
}

function MenuItem({
  icon: Icon,
  label,
  sublabel,
  href,
}: {
  icon: typeof UserCircleIcon;
  label: string;
  sublabel?: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-lg px-4 py-3 transition-colors hover:bg-surface-inset"
    >
      <Icon className="h-5 w-5 text-text-tertiary" />
      <span className="flex-1 text-sm text-text-primary">{label}</span>
      {sublabel && <span className="text-xs text-text-tertiary">{sublabel}</span>}
      <ChevronRightIcon className="h-4 w-4 text-text-tertiary" />
    </Link>
  );
}
