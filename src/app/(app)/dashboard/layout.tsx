import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: '대시보드 | UjuZ',
  description: 'UjuZ 대시보드에서 입소 전략과 맞춤 추천 현황을 확인하세요.',
};

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return children;
}
