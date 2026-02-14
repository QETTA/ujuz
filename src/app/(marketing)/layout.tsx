import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '우주지(UjuZ) — 상담',
};

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-dvh bg-surface">{children}</div>;
}
