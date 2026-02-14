"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { TopBar } from '@/components/nav/top-bar';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';

const PREF_KEY = 'ujuz_preferences';

type SettingsState = {
  push_notification: boolean;
  email_notification: boolean;
  sms_notification: boolean;
  quiet_start: string;
  quiet_end: string;
};

const defaultSettings: SettingsState = {
  push_notification: true,
  email_notification: false,
  sms_notification: false,
  quiet_start: '22:00',
  quiet_end: '07:00',
};

export default function SettingsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [settings, setSettings] = useState<SettingsState>(defaultSettings);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(PREF_KEY);
      if (!raw) {
        return;
      }

      const parsed = JSON.parse(raw) as Partial<SettingsState>;
      setSettings((prev) => ({
        ...prev,
        push_notification:
          typeof parsed.push_notification === 'boolean'
            ? parsed.push_notification
            : prev.push_notification,
        email_notification:
          typeof parsed.email_notification === 'boolean'
            ? parsed.email_notification
            : prev.email_notification,
        sms_notification:
          typeof parsed.sms_notification === 'boolean'
            ? parsed.sms_notification
            : prev.sms_notification,
        quiet_start: parsed.quiet_start ?? prev.quiet_start,
        quiet_end: parsed.quiet_end ?? prev.quiet_end,
      }));
    } catch {
      // ignore invalid localStorage payload
    }
  }, []);

  const onSave = () => {
    localStorage.setItem(PREF_KEY, JSON.stringify(settings));
    toast('설정이 저장되었습니다.', 'success');
  };

  const onExport = async () => {
    try {
      const res = await fetch('/api/v1/export?format=json');
      if (!res.ok) {
        toast('데이터 내보내기에 실패했습니다.', 'error');
        return;
      }

      const blob = await res.blob();
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.href = url;
      link.download = 'ujuz-export.json';
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast('데이터 내보내기가 시작되었습니다.', 'success');
    } catch {
      toast('데이터 내보내기 중 오류가 발생했습니다.', 'error');
    }
  };

  const onDeleteAccount = () => {
    const ok = confirm('정말 탈퇴하시겠습니까? 모든 데이터가 삭제됩니다.');
    if (!ok) {
      return;
    }

    localStorage.removeItem(PREF_KEY);
    toast('계정이 삭제되었습니다.', 'success');
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-surface">
      <TopBar title="설정" showBack />

      <main className="space-y-6 p-4">
        <section>
          <h2 className="mb-2 text-sm font-semibold text-text-secondary">알림 설정</h2>
          <Card className="p-4">
            <Link href="/my/settings/notifications" className="flex items-center justify-between">
              <span className="text-sm">알림 설정 관리</span>
              <span className="text-text-tertiary">&rsaquo;</span>
            </Link>
          </Card>
        </section>

        <section>
          <h2 className="mb-2 text-sm font-semibold text-text-secondary">계정</h2>
          <Card className="space-y-3">
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button className="sm:flex-1" onClick={onExport}>
                데이터 내보내기
              </Button>
              <Button
                variant="danger"
                className="sm:flex-1"
                onClick={onDeleteAccount}
              >
                계정 삭제
              </Button>
            </div>
          </Card>
        </section>

        <section>
          <h2 className="mb-2 text-sm font-semibold text-text-secondary">앱 정보</h2>
          <Card className="space-y-3">
            <p>버전: 1.0.0</p>
            <div className="space-y-1">
              <Link href="/privacy" className="block text-brand-500 underline">
                개인정보처리방침
              </Link>
              <Link href="/terms" className="block text-brand-500 underline">
                이용약관
              </Link>
            </div>
          </Card>
        </section>

        <Button className="w-full" onClick={onSave}>
          설정 저장
        </Button>
      </main>
    </div>
  );
}
