/**
 * Tests for /api/home heroState logic
 */
import { describe, it, expect } from 'vitest';

type HeroState = 'ONBOARDING' | 'TO_URGENT' | 'NEW_INSIGHT' | 'STABLE';

/** Extracted heroState decision logic for unit testing */
function determineHeroState(opts: {
  hasChildProfile: boolean;
  unreadAlerts: number;
  hasRecentInsight: boolean;
  followedFacilities: number;
}): HeroState {
  if (!opts.hasChildProfile) return 'ONBOARDING';
  if (opts.unreadAlerts > 0) return 'TO_URGENT';
  if (opts.hasRecentInsight) return 'NEW_INSIGHT';
  if (opts.followedFacilities >= 1) return 'STABLE';
  return 'ONBOARDING';
}

describe('heroState decision logic', () => {
  it('returns ONBOARDING when no child profile', () => {
    expect(determineHeroState({
      hasChildProfile: false,
      unreadAlerts: 5,
      hasRecentInsight: true,
      followedFacilities: 3,
    })).toBe('ONBOARDING');
  });

  it('returns TO_URGENT when unread alerts exist', () => {
    expect(determineHeroState({
      hasChildProfile: true,
      unreadAlerts: 2,
      hasRecentInsight: false,
      followedFacilities: 1,
    })).toBe('TO_URGENT');
  });

  it('returns NEW_INSIGHT when insight exists and no urgent alerts', () => {
    expect(determineHeroState({
      hasChildProfile: true,
      unreadAlerts: 0,
      hasRecentInsight: true,
      followedFacilities: 1,
    })).toBe('NEW_INSIGHT');
  });

  it('returns STABLE when followed facilities exist', () => {
    expect(determineHeroState({
      hasChildProfile: true,
      unreadAlerts: 0,
      hasRecentInsight: false,
      followedFacilities: 2,
    })).toBe('STABLE');
  });

  it('returns ONBOARDING as fallback with no facilities', () => {
    expect(determineHeroState({
      hasChildProfile: true,
      unreadAlerts: 0,
      hasRecentInsight: false,
      followedFacilities: 0,
    })).toBe('ONBOARDING');
  });
});
