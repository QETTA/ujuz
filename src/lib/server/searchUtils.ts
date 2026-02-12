/**
 * UjuZ - Server-side search utilities
 * Extracted from utils.ts to avoid server importing client code.
 */

import { REGION_DEFS } from './regions';

/** Escape special regex characters to prevent injection */
export function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Korean region UI label → region keywords for DB $regex search */
export const REGION_SEARCH_MAP: Record<string, string[]> = Object.fromEntries(
  REGION_DEFS.map((r) => [r.label.replace(/[구시]$/, ''), r.keywords]),
);
