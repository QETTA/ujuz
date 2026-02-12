import { NextRequest, NextResponse } from 'next/server';

const UUID_V4_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip public endpoints (auth, health, v1 status, anon session, facilities read)
  if (
    pathname.startsWith('/api/auth/') ||
    pathname === '/api/health' ||
    pathname === '/api/v1/status' ||
    pathname === '/api/v1/anon/session' ||
    pathname.startsWith('/api/v1/facilities') ||
    pathname.startsWith('/api/v1/admin/')
  ) {
    return NextResponse.next();
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
  matcher: '/api/:path*',
};
