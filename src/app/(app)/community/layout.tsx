import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: '커뮤니티 | UjuZ',
  description: 'UjuZ 커뮤니티에서 후기, TO 제보, 질문을 공유하고 정보를 나눠보세요.',
};

export default function CommunityLayout({ children }: { children: ReactNode }) {
  return children;
}
