'use client';

import { useEffect, useState } from 'react';
import { TopBar } from '@/components/nav/top-bar';
import { Card } from '@/components/ui/card';
import { apiFetch } from '@/lib/api';
import { useTheme, nextThemeMode } from '@/lib/hooks/useTheme';
import { useToast } from '@/components/ui/toast';
import { SunIcon, MoonIcon, ComputerDesktopIcon } from '@heroicons/react/24/outline';
import type { ThemeMode } from '@/components/providers/theme-provider';

const themeIcons: Record<ThemeMode, typeof SunIcon> = {
  light: SunIcon,
  dark: MoonIcon,
  system: ComputerDesktopIcon,
};

const themeLabels: Record<ThemeMode, string> = {
  light: '라이트',
  dark: '다크',
  system: '시스템',
};

interface Settings {
  theme: ThemeMode;
  notifications: { push: boolean; email: boolean; sms: boolean };
  language: string;
}

export default function SettingsPage() {
  const { mode, setMode } = useTheme();
  const { toast } = useToast();
  const [settings, setSettings] = useState<Settings | null>(null);

  useEffect(() => {
    apiFetch<Settings>('/api/settings').then(setSettings).catch(() => {});
  }, []);

  const toggleNotification = async (key: 'push' | 'email' | 'sms') => {
    if (!settings) return;
    const prev = settings.notifications;
    const updated = { ...prev, [key]: !prev[key] };
    setSettings({ ...settings, notifications: updated });
    try {
      await apiFetch('/api/settings', { method: 'PATCH', json: { notifications: updated } });
    } catch {
      setSettings({ ...settings, notifications: prev });
      toast('알림 설정 변경에 실패했습니다', 'error');
    }
  };

  const cycleTheme = () => {
    const next = nextThemeMode(mode);
    setMode(next);
    apiFetch('/api/settings', { method: 'PATCH', json: { theme: next } }).catch(() => {});
  };

  const ThemeIcon = themeIcons[mode];

  return (
    <div className="flex flex-col">
      <TopBar showBack title="설정" />
      <div className="space-y-4 px-md py-md">
        {/* Theme */}
        <Card>
          <button onClick={cycleTheme} className="flex w-full items-center justify-between">
            <span className="text-sm font-medium text-text-primary">테마</span>
            <span className="flex items-center gap-1.5 text-sm text-text-secondary">
              <ThemeIcon className="h-4 w-4" />
              {themeLabels[mode]}
            </span>
          </button>
        </Card>

        {/* Notifications */}
        {settings && (
          <Card>
            <h3 className="mb-3 text-sm font-semibold text-text-primary">알림</h3>
            {(['push', 'email', 'sms'] as const).map((key) => (
              <label key={key} className="flex items-center justify-between py-2">
                <span className="text-sm text-text-secondary capitalize">{key === 'push' ? '푸시' : key === 'email' ? '이메일' : 'SMS'}</span>
                <input
                  type="checkbox"
                  checked={settings.notifications[key]}
                  onChange={() => toggleNotification(key)}
                  className="h-4 w-4 rounded border-border text-brand-500 focus:ring-brand-500"
                />
              </label>
            ))}
          </Card>
        )}
      </div>
    </div>
  );
}
