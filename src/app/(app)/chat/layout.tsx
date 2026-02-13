import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'AI 상담 | UjuZ',
  description: 'UjuZ AI 상담에서 어린이집 입소 관련 질문에 맞춤 답변을 받아보세요.',
};

export default function ChatLayout({ children }: { children: ReactNode }) {
  return children;
}
