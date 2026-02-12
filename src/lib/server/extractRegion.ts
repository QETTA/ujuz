/**
 * UJUz - Region Extraction Utility
 */

import { REGION_DEFS, type RegionKey } from './regions';

export interface RegionInput {
  address?: string;
  lat?: number;
  lng?: number;
}

export function extractRegion(input: RegionInput): RegionKey | null {
  const { address, lat, lng } = input;

  if (address) {
    for (const def of REGION_DEFS) {
      for (const kw of def.keywords) {
        if (address.includes(kw)) {
          return def.key;
        }
      }
    }
  }

  if (typeof lat === 'number' && typeof lng === 'number') {
    for (const def of REGION_DEFS) {
      if (!def.bbox) continue;
      const [minLng, minLat, maxLng, maxLat] = def.bbox;
      if (lng >= minLng && lng <= maxLng && lat >= minLat && lat <= maxLat) {
        return def.key;
      }
    }
  }

  return null;
}

export function extractRegionFromAddress(address: string | undefined): RegionKey | null {
  if (!address) return null;
  return extractRegion({ address });
}
