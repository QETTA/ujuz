/**
 * UjuZ - NextAuth v5 Configuration
 * OAuth providers (Google, Kakao) + anonymous credentials fallback.
 * OAuth providers are enabled only when their env vars are set.
 */

import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import type { Provider } from 'next-auth/providers';

declare module 'next-auth' {
  interface Session {
    userId: string;
    provider?: string;
  }
  interface User {
    id: string;
  }
}

const UUID_V4_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// Build providers list dynamically based on env vars
function buildProviders(): Provider[] {
  const providers: Provider[] = [];

  // Google OAuth — enabled when env vars are set
  if (process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET) {
    // next-auth v5 auto-discovers Google provider from AUTH_GOOGLE_ID/SECRET env vars
    const Google = require('next-auth/providers/google').default;
    providers.push(Google);
  }

  // Kakao OAuth — enabled when env vars are set
  if (process.env.AUTH_KAKAO_ID && process.env.AUTH_KAKAO_SECRET) {
    const Kakao = require('next-auth/providers/kakao').default;
    providers.push(Kakao);
  }

  // Anonymous credentials — always available as fallback
  providers.push(
    Credentials({
      id: 'anonymous',
      name: 'Anonymous',
      credentials: {
        deviceId: { label: 'Device ID', type: 'text' },
      },
      async authorize(credentials) {
        const deviceId = credentials?.deviceId;
        if (!deviceId || typeof deviceId !== 'string') return null;
        if (!UUID_V4_RE.test(deviceId)) return null;
        return { id: deviceId };
      },
    }),
  );

  return providers;
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: buildProviders(),
  session: { strategy: 'jwt', maxAge: 30 * 24 * 60 * 60 }, // 30 days
  callbacks: {
    jwt({ token, user, account }) {
      if (user) {
        token.sub = user.id;
      }
      if (account) {
        token.provider = account.provider;
      }
      return token;
    },
    session({ session, token }) {
      session.userId = token.sub ?? '';
      session.provider = token.provider as string | undefined;
      return session;
    },
  },
  pages: {
    signIn: '/login',
  },
  trustHost: true,
});
