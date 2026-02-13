import type { Metadata } from 'next';
import { AppShell } from '@/components/layouts/AppShell';

export const metadata: Metadata = {
  title: '우주지(UjuZ)',
};

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
