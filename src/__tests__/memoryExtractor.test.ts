import { describe, it, expect } from 'vitest';
import { extractMemoriesFromMessage } from '@/lib/server/memoryExtractor';

describe('extractMemoriesFromMessage', () => {
  // ── 아이 나이 (살) ──────────────────────────────────────

  it('extracts child age in years', () => {
    const result = extractMemoriesFromMessage('아이가 2살이에요');
    expect(result).toContainEqual({
      memoryKey: 'chat_child_age',
      value: '2살',
      tags: ['chat_extracted'],
    });
  });

  it('extracts child age with prefix variants', () => {
    expect(extractMemoriesFromMessage('우리 아이 5살인데요')).toContainEqual(
      expect.objectContaining({ memoryKey: 'chat_child_age', value: '5살' }),
    );
    expect(extractMemoriesFromMessage('첫째가 7살이에요')).toContainEqual(
      expect.objectContaining({ memoryKey: 'chat_child_age', value: '7살' }),
    );
  });

  it('ignores out-of-range age', () => {
    const result = extractMemoriesFromMessage('아이가 15살이에요');
    expect(result.find((m) => m.memoryKey === 'chat_child_age')).toBeUndefined();
  });

  // ── 아이 나이 (개월) ────────────────────────────────────

  it('extracts child age in months', () => {
    const result = extractMemoriesFromMessage('18개월 아기예요');
    expect(result).toContainEqual({
      memoryKey: 'chat_child_age_months',
      value: '18개월',
      tags: ['chat_extracted'],
    });
  });

  it('ignores out-of-range months', () => {
    const result = extractMemoriesFromMessage('100개월 된 아기');
    expect(result.find((m) => m.memoryKey === 'chat_child_age_months')).toBeUndefined();
  });

  // ── 우선순위 유형 ───────────────────────────────────────

  it('extracts priority type - 맞벌이', () => {
    const result = extractMemoriesFromMessage('저희는 맞벌이인데요');
    expect(result).toContainEqual({
      memoryKey: 'chat_priority_type',
      value: '맞벌이',
      tags: ['chat_extracted'],
    });
  });

  it('extracts priority type - 한부모', () => {
    const result = extractMemoriesFromMessage('한부모 가정입니다');
    expect(result).toContainEqual(
      expect.objectContaining({ memoryKey: 'chat_priority_type', value: '한부모' }),
    );
  });

  // ── 지역 (REGION_DEFS) ─────────────────────────────────

  it('extracts region from REGION_DEFS keywords', () => {
    const result = extractMemoriesFromMessage('위례에서 어린이집 찾고 있어요');
    expect(result).toContainEqual({
      memoryKey: 'chat_region',
      value: '위례',
      tags: ['chat_extracted'],
    });
  });

  it('extracts region - 강남구', () => {
    const result = extractMemoriesFromMessage('강남구에 살아요');
    expect(result).toContainEqual(
      expect.objectContaining({ memoryKey: 'chat_region', value: '강남구' }),
    );
  });

  // ── 지역 (일반 패턴 fallback) ──────────────────────────

  it('extracts region from general pattern', () => {
    const result = extractMemoriesFromMessage('마포구에서 살고 있어요');
    expect(result).toContainEqual({
      memoryKey: 'chat_region',
      value: '마포구',
      tags: ['chat_extracted'],
    });
  });

  // ── 시설명 ──────────────────────────────────────────────

  it('extracts facility name', () => {
    const result = extractMemoriesFromMessage('한빛어린이집 어때요?');
    expect(result).toContainEqual({
      memoryKey: 'chat_facility_interest',
      value: '한빛어린이집',
      tags: ['chat_extracted'],
    });
  });

  it('extracts kindergarten name', () => {
    const result = extractMemoriesFromMessage('하늘유치원 정보 알려주세요');
    expect(result).toContainEqual(
      expect.objectContaining({ memoryKey: 'chat_facility_interest', value: '하늘유치원' }),
    );
  });

  // ── 입소 시기 ───────────────────────────────────────────

  it('extracts desired timing', () => {
    const result = extractMemoriesFromMessage('3월 입소 가능할까요?');
    expect(result).toContainEqual({
      memoryKey: 'chat_desired_timing',
      value: '3월 입소',
      tags: ['chat_extracted'],
    });
  });

  // ── 복합 정보 ───────────────────────────────────────────

  it('extracts multiple memories from one message', () => {
    const result = extractMemoriesFromMessage('아이가 2살이고 강남구에 살아요');
    expect(result.length).toBeGreaterThanOrEqual(2);
    expect(result).toContainEqual(
      expect.objectContaining({ memoryKey: 'chat_child_age', value: '2살' }),
    );
    expect(result).toContainEqual(
      expect.objectContaining({ memoryKey: 'chat_region', value: '강남구' }),
    );
  });

  // ── 무관한 메시지 ───────────────────────────────────────

  it('returns empty array for unrelated message', () => {
    const result = extractMemoriesFromMessage('안녕하세요 오늘 날씨 좋네요');
    expect(result).toEqual([]);
  });

  // ── 모든 결과에 chat_extracted 태그 ─────────────────────

  it('all results have chat_extracted tag', () => {
    const result = extractMemoriesFromMessage('아이가 3살이고 맞벌이이고 분당에 한빛어린이집 보고 있어요');
    expect(result.length).toBeGreaterThan(0);
    for (const m of result) {
      expect(m.tags).toContain('chat_extracted');
    }
  });
});
