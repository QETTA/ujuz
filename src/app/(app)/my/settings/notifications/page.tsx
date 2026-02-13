'use client';

import { useCallback, useEffect, useState } from 'react';
import { PageHeader } from '@/components/layouts/PageHeader';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import { Spinner } from '@/components/primitives/Spinner';

const STORAGE_KEY = 'ujuz_notif_settings';

interface NotifSettings {
  enabled: boolean;
  to_alerts: boolean;
  announcements: boolean;
  consultation: boolean;
  quiet_start: string;
  quiet_end: string;
}

const DEFAULTS: NotifSettings = {
  enabled: true,
  to_alerts: true,
  announcements: true,
  consultation: true,
  quiet_start: '22:00',
  quiet_end: '07:00',
};

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex items-center justify-between py-1.5">
      <span className="text-sm text-text-primary">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors duration-200 ${checked ? 'bg-brand-500' : 'bg-border'}`}
      >
        <span
          className={`pointer-events-none inline-block h-5 w-5 translate-y-0.5 rounded-full bg-white shadow-sm transition-transform duration-200 ${checked ? 'translate-x-5.5' : 'translate-x-0.5'}`}
        />
      </button>
    </label>
  );
}

export default function NotificationSettingsPage() {
  const { toast } = useToast();
  const [settings, setSettings] = useState<NotifSettings>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<NotifSettings>;
        setSettings((prev) => ({ ...prev, ...parsed }));
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  const update = useCallback(<K extends keyof NotifSettings>(key: K, value: NotifSettings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      // MVP: localStorage 저장. Phase 6/7에서 서버 연동.
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
      toast('알림 설정이 저장되었어요.', 'success');
    } catch {
      toast('저장에 실패했습니다. 다시 시도해 주세요.', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Spinner size="md" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="알림 설정" backHref="/my/settings" />

      <div className="space-y-4 px-4">
        {/* 전체 토글 */}
        <Card className="p-4">
          <Toggle checked={settings.enabled} onChange={(v) => update('enabled', v)} label="알림 전체" />
        </Card>

        {/* 알림 종류 */}
        <Card className={`space-y-1 p-4 ${!settings.enabled ? 'opacity-50 pointer-events-none' : ''}`}>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-text-tertiary">알림 종류</h3>
          <Toggle checked={settings.to_alerts} onChange={(v) => update('to_alerts', v)} label="TO 알림" />
          <Toggle checked={settings.announcements} onChange={(v) => update('announcements', v)} label="공지사항" />
          <Toggle checked={settings.consultation} onChange={(v) => update('consultation', v)} label="상담 안내" />
        </Card>

        {/* 방해금지 시간 */}
        <Card className={`space-y-3 p-4 ${!settings.enabled ? 'opacity-50 pointer-events-none' : ''}`}>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-text-tertiary">방해금지 시간</h3>
          <p className="text-xs text-text-secondary">이 시간에는 푸시 알림을 보내지 않아요.</p>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2">
              <span className="text-sm text-text-secondary">시작</span>
              <input
                type="time"
                value={settings.quiet_start}
                onChange={(e) => update('quiet_start', e.target.value)}
                className="rounded-md border border-border bg-surface px-2 py-1 text-sm"
              />
            </label>
            <span className="text-text-tertiary">~</span>
            <label className="flex items-center gap-2">
              <span className="text-sm text-text-secondary">종료</span>
              <input
                type="time"
                value={settings.quiet_end}
                onChange={(e) => update('quiet_end', e.target.value)}
                className="rounded-md border border-border bg-surface px-2 py-1 text-sm"
              />
            </label>
          </div>
        </Card>

        <Button className="w-full" onClick={handleSave} loading={saving} disabled={saving}>
          {saving ? '저장 중...' : '설정 저장'}
        </Button>
      </div>
    </div>
  );
}
