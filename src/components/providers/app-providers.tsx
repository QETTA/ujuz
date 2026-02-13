'use client';

import { ThemeProvider } from './theme-provider';
import { AuthProvider } from '@/lib/client/AuthProvider';

/**
 * Composite provider wrapping all client-side context providers.
 * Zustand stores are standalone and don't need a provider.
 */
export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <ThemeProvider>
        {children}
      </ThemeProvider>
    </AuthProvider>
  );
}
