import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'TO 알림 | UjuZ',
  description: 'UjuZ TO 알림에서 관심 시설의 정원 변동 알림과 구독 상태를 관리하세요.',
};

export default function AlertsLayout({ children }: { children: ReactNode }) {
  return children;
}
