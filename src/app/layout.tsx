import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Ujuz(우주지) — AI 보육 입소지원',
  description: 'AI 기반 국공립 어린이집 입소 지원 플랫폼',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
