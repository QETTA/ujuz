import { NextRequest, NextResponse } from 'next/server';

const UUID_V4_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// Frontend pages that are publicly accessible (no auth required)
const PUBLIC_PAGES = ['/', '/login', '/onboarding', '/pricing'];

function isPublicPage(pathname: string): boolean {
  return PUBLIC_PAGES.some((p) =>
    p === pathname || (p === '/onboarding' && pathname.startsWith('/onboarding')),
  );
}

export function middleware(request: NextRequest) {
  // Dev bypass: skip all auth checks
  if (process.env.AUTH_BYPASS === 'true') {
    return NextResponse.next();
  }

  const { pathname } = request.nextUrl;

  // ── Frontend route protection ─────────────────────────
  // Protected pages redirect to /login if no session
  if (!pathname.startsWith('/api/') && !pathname.startsWith('/_next/') && !pathname.startsWith('/favicon')) {
    if (!isPublicPage(pathname)) {
      const hasSession = request.cookies.has('authjs.session-token')
        || request.cookies.has('__Secure-authjs.session-token');
      const hasDeviceId = request.cookies.has('ujuz-device-id');

      // Allow if any form of identity exists
      if (!hasSession && !hasDeviceId) {
        // Don't block — anonymous users can browse via device ID set client-side
        // Just pass through; client-side stores will handle auth flows
      }
    }
    return NextResponse.next();
  }

  // ── API route protection ──────────────────────────────

  // Skip public endpoints (auth, health, v1 status, anon session, facilities read)
  if (
    pathname.startsWith('/api/auth/') ||
    pathname === '/api/health' ||
    pathname === '/api/v1/status' ||
    pathname === '/api/v1/anon/session' ||
    pathname.startsWith('/api/v1/facilities')
  ) {
    return NextResponse.next();
  }

  // Admin routes: require x-admin-key header (defense-in-depth with per-handler requireAdmin)
  if (pathname.startsWith('/api/v1/admin/')) {
    const adminKey = request.headers.get('x-admin-key');
    const expectedKey = process.env.ADMIN_API_KEY;

    if (!expectedKey || !adminKey || adminKey !== expectedKey) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'admin_unauthorized' },
        { status: 401 },
      );
    }

    // Inject traceId for downstream route handlers
    const traceId = crypto.randomUUID();
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-trace-id', traceId);
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  // API routes: require either a session cookie OR a valid x-device-id
  if (pathname.startsWith('/api/')) {
    const hasSession = request.cookies.has('authjs.session-token')
      || request.cookies.has('__Secure-authjs.session-token');
    const deviceId = request.headers.get('x-device-id');

    if (!hasSession && !deviceId) {
      return NextResponse.json(
        { error: 'Missing authentication', code: 'auth_required' },
        { status: 401 },
      );
    }

    if (!hasSession && deviceId && !UUID_V4_RE.test(deviceId)) {
      return NextResponse.json(
        { error: 'Invalid device ID format', code: 'invalid_device_id' },
        { status: 400 },
      );
    }

    // Inject traceId for downstream route handlers
    const traceId = crypto.randomUUID();
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-trace-id', traceId);
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
