/**
 * One-off migration: places (category=daycare) → facilities collection
 * Maps the places schema to FacilityDoc format.
 *
 * Usage: npx tsx scripts/migrate-places-to-facilities.ts
 */

import { MongoClient } from 'mongodb';
import { createHash } from 'crypto';
import 'dotenv/config';

const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.MONGODB_DB_NAME || 'kidsmap';

if (!MONGODB_URI) {
  console.error('MONGODB_URI is required');
  process.exit(1);
}

// places.facilityType → FacilityType
const TYPE_MAP: Record<string, string> = {
  '국공립': 'national_public',
  '공립': 'public',
  '민간': 'private',
  '가정': 'home',
  '협동': 'cooperative',
  '직장': 'workplace',
  '법인': 'private',
  '법인·단체등': 'private',
};

// places.capacity.byClass key → age index
const CLASS_AGE_MAP: Record<string, string> = {
  '0세반': 'age_0',
  '1세반': 'age_1',
  '2세반': 'age_2',
  '3세반': 'age_3',
  '4세반': 'age_4',
  '5세반': 'age_5_plus',
};

function mapType(raw: string): string {
  for (const [key, value] of Object.entries(TYPE_MAP)) {
    if (raw.includes(key)) return value;
  }
  return 'other';
}

function extractSido(addr: string): string {
  return addr.trim().split(/\s+/)[0] || '';
}

function extractSigungu(addr: string): string {
  return addr.trim().split(/\s+/)[1] || '';
}

function computeHash(obj: Record<string, unknown>): string {
  const sorted = JSON.stringify(obj, Object.keys(obj).sort());
  return createHash('sha256').update(sorted).digest('hex');
}

async function main() {
  const client = new MongoClient(MONGODB_URI!);
  await client.connect();
  console.log('Connected to MongoDB');

  const db = client.db(DB_NAME);
  const placesCol = db.collection('places');
  const facilitiesCol = db.collection('facilities');

  const daycares = await placesCol.find({ category: 'daycare' }).toArray();
  console.log(`Found ${daycares.length} daycare places to migrate`);

  let upserted = 0;
  let skipped = 0;

  for (const place of daycares) {
    const coords = place.location?.coordinates;
    if (!coords || coords.length < 2) {
      skipped++;
      continue;
    }

    const [lng, lat] = coords;
    if (lat < 33 || lat > 39 || lng < 124 || lng > 132) {
      skipped++;
      continue;
    }

    // Map capacity.byClass → capacity_by_age
    const capacityByAge: Record<string, number> = {};
    let hasAge = false;
    const byClass = place.capacity?.byClass || {};
    for (const [className, ageKey] of Object.entries(CLASS_AGE_MAP)) {
      const val = byClass[className];
      if (typeof val === 'number' && val > 0) {
        capacityByAge[ageKey] = val;
        hasAge = true;
      }
    }

    const address = place.address || '';
    const rawHash = computeHash({
      placeId: place.placeId,
      name: place.name,
      address,
      capacity: place.capacity,
      updatedAt: place.updatedAt?.toISOString?.() || String(place.updatedAt),
    });

    const facilityType = mapType(place.facilityType || '');
    const isWorkplace = facilityType === 'workplace';

    // Parse operating hours
    const hours = place.contact?.hours || '';
    const operatingHours: Record<string, string> = {};
    if (hours) {
      const weekdayMatch = hours.match(/평일\s*([^\s/]+)/);
      const satMatch = hours.match(/토\s*([^\s/]+)/);
      if (weekdayMatch) operatingHours.weekday = weekdayMatch[1];
      if (satMatch) operatingHours.saturday = satMatch[1];
    }

    const now = new Date();

    await facilitiesCol.updateOne(
      { provider: 'places_migration', provider_id: place.placeId },
      {
        $set: {
          name: place.name,
          type: facilityType,
          status: 'active' as const,
          address: {
            full: address,
            sido: extractSido(address),
            sigungu: extractSigungu(address),
          },
          location: { type: 'Point' as const, coordinates: [lng, lat] },
          phone: place.contact?.phone || undefined,
          capacity_total: place.capacity?.total || 0,
          capacity_current: place.capacity?.currentEnrollment ?? undefined,
          capacity_by_age: hasAge ? capacityByAge : undefined,
          established_date: place.metadata?.established || undefined,
          extended_care: hours.includes('연장') || false,
          operating_hours: Object.keys(operatingHours).length > 0 ? operatingHours : undefined,
          employer_name: isWorkplace ? (place.metadata?.director || undefined) : undefined,
          raw_hash: rawHash,
          updated_at: now,
        },
        $setOnInsert: {
          created_at: now,
        },
      },
      { upsert: true },
    );

    upserted++;
  }

  // Create 2dsphere index for geospatial queries
  await facilitiesCol.createIndex({ location: '2dsphere' }).catch(() => {});
  // Create compound index for provider lookup
  await facilitiesCol.createIndex({ provider: 1, provider_id: 1 }, { unique: true }).catch(() => {});

  console.log(`Migration complete: ${upserted} upserted, ${skipped} skipped`);
  console.log(`Total facilities: ${await facilitiesCol.countDocuments()}`);

  await client.close();
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
