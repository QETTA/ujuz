import { NextResponse } from 'next/server';
import { env } from '@/lib/server/env';
import { FEATURE_FLAGS } from '@/lib/server/featureFlags';

export const runtime = 'nodejs';

export async function GET() {
  const aiDegraded = !env.ANTHROPIC_API_KEY;

  return NextResponse.json({
    ai: {
      degraded: aiDegraded,
      message: aiDegraded ? 'AI 서비스가 일시적으로 제한됩니다' : undefined,
    },
    features: {
      communityWrite: FEATURE_FLAGS.communityWrite,
      communityReport: FEATURE_FLAGS.communityReport,
      aiExplain: FEATURE_FLAGS.aiExplain,
    },
  });
}
