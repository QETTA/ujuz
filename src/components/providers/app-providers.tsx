'use client';

import { ThemeProvider } from './theme-provider';
import { AuthProvider } from '@/lib/client/AuthProvider';
import { ToastProvider } from '@/components/ui/toast';

/**
 * Composite provider wrapping all client-side context providers.
 * Zustand stores are standalone and don't need a provider.
 */
export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <ThemeProvider>
        <ToastProvider>
          {children}
        </ToastProvider>
      </ThemeProvider>
    </AuthProvider>
  );
}
