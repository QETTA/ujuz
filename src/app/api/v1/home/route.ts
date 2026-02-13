/**
 * GET /api/home — Home/Today heroState aggregation
 *
 * heroState decision logic:
 *   IF onboarding 미완료 → "ONBOARDING"
 *   ELSE IF 최근 24h 내 TO alert 미읽음 → "TO_URGENT"
 *   ELSE IF 새 인사이트 미읽음 → "NEW_INSIGHT"
 *   ELSE IF 관심시설 ≥ 1 → "STABLE"
 *   ELSE → "ONBOARDING"
 */

export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { getUserId, getTraceId, logRequest, errorResponse } from '@/lib/server/apiHelpers';
import { getDbOrThrow } from '@/lib/server/db';
import { U } from '@/lib/server/collections';

export type HeroState = 'ONBOARDING' | 'TO_URGENT' | 'NEW_INSIGHT' | 'STABLE';

interface HomeResponse {
  heroState: HeroState;
  unreadAlerts: number;
  followedFacilities: number;
  latestInsight?: { title: string; summary: string; created_at: string };
}

export async function GET(req: NextRequest) {
  const start = Date.now();
  const traceId = getTraceId(req);

  try {
    const userId = await getUserId(req);
    const db = await getDbOrThrow();

    // Run queries in parallel
    const [userMemories, unreadAlerts, recentInsight] = await Promise.all([
      // Check onboarding + followed facilities
      db.collection(U.USER_MEMORIES).find(
        { userId, isActive: true, tags: { $in: ['child_profile', 'followed_facility'] } },
      ).toArray(),

      // Unread TO alerts in last 24h
      db.collection(U.TO_ALERTS).countDocuments({
        user_id: userId,
        is_read: false,
        detected_at: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      }),

      // Most recent unread recommendation
      db.collection(U.RECOMMENDATIONS).findOne(
        { user_id: userId },
        { sort: { created_at: -1 }, projection: { 'widget.summary': 1, created_at: 1 } },
      ),
    ]);

    const hasChildProfile = userMemories.some((m) => m.tags?.includes('child_profile'));
    const followedFacilities = userMemories.filter((m) => m.tags?.includes('followed_facility')).length;

    let heroState: HeroState;
    if (!hasChildProfile) {
      heroState = 'ONBOARDING';
    } else if (unreadAlerts > 0) {
      heroState = 'TO_URGENT';
    } else if (recentInsight) {
      heroState = 'NEW_INSIGHT';
    } else if (followedFacilities >= 1) {
      heroState = 'STABLE';
    } else {
      heroState = 'ONBOARDING';
    }

    const body: HomeResponse = {
      heroState,
      unreadAlerts,
      followedFacilities,
    };

    if (recentInsight && heroState === 'NEW_INSIGHT') {
      body.latestInsight = {
        title: recentInsight.widget?.summary?.one_liner ?? '새로운 분석',
        summary: `종합 등급: ${recentInsight.widget?.summary?.overall_grade ?? '-'}`,
        created_at: recentInsight.created_at?.toISOString?.() ?? new Date().toISOString(),
      };
    }

    logRequest(req, 200, start, traceId);
    return NextResponse.json(body);
  } catch (error) {
    logRequest(req, error instanceof Error && 'statusCode' in error ? (error as { statusCode: number }).statusCode : 500, start, traceId);
    return errorResponse(error, traceId);
  }
}
