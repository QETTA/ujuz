import { DateTime } from 'luxon';
import type { UsageFeature } from './types';

type PeriodResult = {
  period: string;
  resetAt: string;
};

function seoulNow(date = new Date()) {
  return DateTime.fromJSDate(date, { zone: 'utc' }).setZone('Asia/Seoul');
}

function monthlyPeriod(now: DateTime) {
  return {
    period: now.toFormat('yyyy-MM'),
    resetAt: now.plus({ months: 1 }).startOf('month').toFormat("yyyy-MM-dd'T'HH:mm:ssZZ"),
  };
}

function dailyPeriod(now: DateTime) {
  return {
    period: now.toFormat('yyyy-MM-dd'),
    resetAt: now.plus({ days: 1 }).startOf('day').toFormat("yyyy-MM-dd'T'HH:mm:ssZZ"),
  };
}

export function getPeriodForFeature(feature: UsageFeature, now = new Date()): PeriodResult {
  const nowSeoul = seoulNow(now);

  if (feature === 'admission_calc' || feature === 'to_alert_slots') {
    return monthlyPeriod(nowSeoul);
  }

  return dailyPeriod(nowSeoul);
}
