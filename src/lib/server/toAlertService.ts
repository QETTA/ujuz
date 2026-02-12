/**
 * UJUz - TO Alert Service
 * TO(자리) 알림 구독 및 감지
 */

import { getDbOrThrow } from './db';
import { U } from './collections';
import { ObjectId } from 'mongodb';
import type { TOSubscriptionDoc as DbTOSubscriptionDoc, TOAlertDoc } from './dbTypes';

interface TOSubscriptionInput {
  user_id: string;
  facility_id: string;
  facility_name: string;
  target_classes: string[];
  notification_preferences: { push: boolean; sms: boolean; email: boolean };
}

interface TOSubscriptionResponse {
  id: string;
  facility_id: string;
  facility_name: string;
  target_classes: string[];
  is_active: boolean;
  notification_preferences: { push: boolean; sms: boolean; email: boolean };
  created_at: string;
}

interface TOAlertResponse {
  id: string;
  facility_id: string;
  facility_name: string;
  age_class: string;
  detected_at: string;
  estimated_slots: number;
  confidence: number;
  is_read: boolean;
  source: string;
}

function mapSubscriptionToDto(doc: DbTOSubscriptionDoc): TOSubscriptionResponse {
  return {
    id: doc._id.toString(),
    facility_id: doc.facility_id,
    facility_name: doc.facility_name,
    target_classes: doc.target_classes,
    is_active: doc.is_active,
    notification_preferences: doc.notification_preferences,
    created_at: doc.created_at.toISOString(),
  };
}

function mapAlertToDto(doc: TOAlertDoc): TOAlertResponse {
  return {
    id: doc._id.toString(),
    facility_id: doc.facility_id,
    facility_name: doc.facility_name,
    age_class: doc.age_class,
    detected_at: doc.detected_at.toISOString(),
    estimated_slots: doc.estimated_slots ?? 1,
    confidence: doc.confidence ?? 0.6,
    is_read: doc.is_read ?? false,
    source: doc.source ?? 'auto_detection',
  };
}


export async function createSubscription(input: TOSubscriptionInput): Promise<TOSubscriptionResponse> {
  const db = await getDbOrThrow();
  const collection = db.collection<DbTOSubscriptionDoc>(U.TO_SUBSCRIPTIONS);

  const existing = await collection.findOne({
    user_id: input.user_id,
    facility_id: input.facility_id,
    is_active: true,
  });

  if (existing) {
    await collection.updateOne(
      { _id: existing._id },
      { $set: { target_classes: input.target_classes, notification_preferences: input.notification_preferences } },
    );
    return mapSubscriptionToDto({
      ...existing,
      target_classes: input.target_classes,
      notification_preferences: input.notification_preferences,
    });
  }

  const now = new Date();
  const newDoc: DbTOSubscriptionDoc = {
    _id: new ObjectId(),
    ...input,
    is_active: true,
    created_at: now,
  };
  await collection.insertOne(newDoc);

  return mapSubscriptionToDto(newDoc);
}

export async function getUserSubscriptions(userId: string): Promise<{ subscriptions: TOSubscriptionResponse[] }> {
  const db = await getDbOrThrow();
  const docs = await db.collection<DbTOSubscriptionDoc>(U.TO_SUBSCRIPTIONS)
    .find({ user_id: userId, is_active: true })
    .sort({ created_at: -1 })
    .toArray();

  return {
    subscriptions: docs.map(mapSubscriptionToDto),
  };
}

export async function deleteSubscription(userId: string, facilityId: string): Promise<void> {
  const db = await getDbOrThrow();
  await db.collection<DbTOSubscriptionDoc>(U.TO_SUBSCRIPTIONS).updateOne(
    { user_id: userId, facility_id: facilityId },
    { $set: { is_active: false } },
  );
}

export async function getAlertHistory(userId: string): Promise<{
  alerts: TOAlertResponse[];
  total: number;
  unread_count: number;
}> {
  const db = await getDbOrThrow();

  const subs = await db.collection<DbTOSubscriptionDoc>(U.TO_SUBSCRIPTIONS)
    .find({ user_id: userId, is_active: true })
    .toArray();

  const facilityIds = subs.map((s) => s.facility_id);

  if (facilityIds.length === 0) {
    return { alerts: [], total: 0, unread_count: 0 };
  }

  const alerts = await db.collection<TOAlertDoc>(U.TO_ALERTS)
    .find({ facility_id: { $in: facilityIds } })
    .sort({ detected_at: -1 })
    .limit(50)
    .toArray();

  const mapped = alerts.map(mapAlertToDto);

  return {
    alerts: mapped,
    total: mapped.length,
    unread_count: mapped.filter((a) => !a.is_read).length,
  };
}
