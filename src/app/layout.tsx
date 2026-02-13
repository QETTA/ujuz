import type { Metadata, Viewport } from 'next';
import { AppProviders } from '@/components/providers/app-providers';
import { themeInitScript } from '@/components/providers/theme-provider';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: '우주지(UjuZ) — AI 보육 입소지원',
    template: '%s | 우주지',
  },
  description: 'AI 기반 국공립 어린이집 입소 확률 예측, 실시간 TO 알림, 개인화 전략 상담',
  metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL ?? 'https://ujuz.kr'),
  openGraph: {
    type: 'website',
    locale: 'ko_KR',
    siteName: '우주지(UjuZ)',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#1a1a2e' },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <head>
        {/* FOUC prevention: set data-theme before paint */}
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        {/* Pretendard Variable via CDN */}
        <link
          rel="stylesheet"
          as="style"
          crossOrigin="anonymous"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
      </head>
      <body className="bg-surface text-text-primary antialiased">
        {/* Skip to content — accessibility */}
        <a
          href="#main-content"
          className="fixed left-2 top-2 z-[9999] -translate-y-16 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-text-inverse transition-transform focus:translate-y-0"
        >
          본문으로 건너뛰기
        </a>
        <AppProviders>
          <div id="main-content">{children}</div>
        </AppProviders>
      </body>
    </html>
  );
}
