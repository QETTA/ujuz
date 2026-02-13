import { z } from 'zod';

export const COMMUNITY_CATEGORIES = ['질문', '정보공유', '후기', '자유'] as const;
export type CommunityCategory = (typeof COMMUNITY_CATEGORIES)[number];

export const REGION_OPTIONS = [
  { value: '서울', label: '서울' },
  { value: '경기', label: '경기' },
  { value: '부산', label: '부산' },
  { value: '대구', label: '대구' },
  { value: '광주', label: '광주' },
  { value: '대전', label: '대전' },
  { value: '울산', label: '울산' },
  { value: '제주', label: '제주' },
  { value: '기타', label: '기타' },
] as const;

export const TITLE_MAX = 100;
export const CONTENT_MAX = 2000;

export const communityWriteSchema = z.object({
  title: z.string().min(1, '제목을 입력해 주세요').max(TITLE_MAX, `제목은 ${TITLE_MAX}자 이내로 입력해 주세요`),
  content: z.string().min(1, '내용을 입력해 주세요').max(CONTENT_MAX, `내용은 ${CONTENT_MAX}자 이내로 입력해 주세요`),
  category: z.enum(COMMUNITY_CATEGORIES),
  region: z.string().min(1, '지역을 선택해 주세요'),
  anonymous: z.boolean().default(false),
});

export type CommunityWriteInput = z.infer<typeof communityWriteSchema>;

export function validateWrite(data: unknown) {
  return communityWriteSchema.safeParse(data);
}

const DRAFT_KEY = 'ujuz_community_draft';

export interface CommunityDraft {
  title: string;
  content: string;
  category: CommunityCategory;
  region: string;
  anonymous: boolean;
  savedAt: number;
}

export function saveDraft(draft: Omit<CommunityDraft, 'savedAt'>): void {
  try {
    const data: CommunityDraft = { ...draft, savedAt: Date.now() };
    localStorage.setItem(DRAFT_KEY, JSON.stringify(data));
  } catch { /* quota exceeded 등 무시 */ }
}

export function loadDraft(): CommunityDraft | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as CommunityDraft;
    // 24시간 이상 지난 임시저장은 무시
    if (Date.now() - data.savedAt > 24 * 60 * 60 * 1000) {
      clearDraft();
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

export function clearDraft(): void {
  try {
    localStorage.removeItem(DRAFT_KEY);
  } catch { /* 무시 */ }
}
