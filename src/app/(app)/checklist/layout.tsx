import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: '체크리스트 | UjuZ',
  description: 'UjuZ 체크리스트에서 입소 준비 항목을 확인하고 진행 상황을 관리하세요.',
};

export default function ChecklistLayout({ children }: { children: ReactNode }) {
  return children;
}
