# Codex Tasks — UX/UI Round 2 (P0 + P1 + P2 Fixes)

Each task below is self-contained. Execute all 7 in order.
Commit each as `feat(codex): [CODEX-N] description`.
Run `pnpm typecheck` after each task.

---

## CODEX-1: Community onLoadMore + write button

**File**: `src/app/(app)/community/page.tsx`

**Problem**: `onLoadMore: () => {}` is empty — infinite scroll doesn't work. Write button has no handler.

**Changes**:

1. Add state for cursor-based pagination and accumulated posts:
```tsx
import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
// ... existing imports

export default function CommunityPage() {
  const router = useRouter();
  const [postType, setPostType] = useState<'review' | 'to_report' | 'question'>('review');
  const [cursor, setCursor] = useState<string | undefined>();
  const [allPosts, setAllPosts] = useState<PostData[]>([]);
```

2. When `data` changes, accumulate posts:
```tsx
  const { data, loading } = useApiFetch<PostsResponse>(
    `/api/v1/community/posts?type=${postType}&limit=20${cursor ? `&cursor=${cursor}` : ''}`,
  );

  const loadMore = useCallback(() => {
    if (data?.cursor) {
      setCursor(data.cursor);
      if (data.posts) {
        setAllPosts((prev) => [...prev, ...data.posts]);
      }
    }
  }, [data]);

  const { sentinelRef } = useInfiniteScroll({
    onLoadMore: loadMore,
    hasMore: data?.has_more ?? false,
    loading,
  });

  const posts = allPosts.length > 0 ? allPosts : (data?.posts ?? []);
```

3. Reset cursor and accumulated posts when postType changes:
```tsx
  // In the Tabs onValueChange callback:
  onValueChange={(v) => {
    setPostType(v as typeof postType);
    setCursor(undefined);
    setAllPosts([]);
  }}
```

4. Wire the write button:
```tsx
  <Button variant="primary" size="sm" onClick={() => router.push('/community/write')}>
    <PencilSquareIcon className="h-4 w-4" />
    글쓰기
  </Button>
```

**Verify**: `pnpm typecheck`

---

## CODEX-2: My Page profile data + logout

**File**: `src/app/(app)/my/page.tsx`

**Problem**: Profile shows hardcoded "사용자" and "무료 플랜". Logout button has no handler.

**Changes**:

1. Add imports:
```tsx
import { signOut } from 'next-auth/react';
import { useUjuzSession } from '@/lib/client/auth';
import { useSubscription } from '@/lib/client/hooks/useSubscription';
```

2. Inside the component, get real data:
```tsx
export default function MyPage() {
  const { data: session, isAnonymous } = useUjuzSession();
  const { subscription } = useSubscription();

  const displayName = isAnonymous ? '비회원' : (session?.user?.name ?? '사용자');
  const planLabel = subscription.plan_tier === 'premium' ? '프리미엄' : subscription.plan_tier === 'basic' ? '베이직' : '무료 플랜';
```

3. Replace the hardcoded profile text:
```tsx
  <p className="text-base font-semibold text-text-primary">{displayName}</p>
  <p className="text-xs text-text-tertiary">{planLabel}</p>
```

4. Wire the logout button:
```tsx
  <button
    type="button"
    onClick={() => signOut({ callbackUrl: '/login' })}
    className="flex w-full items-center gap-3 rounded-xl px-sm py-3 text-danger transition-colors hover:bg-danger/5"
  >
    <ArrowRightOnRectangleIcon className="h-5 w-5" />
    <span className="text-sm font-medium">로그아웃</span>
  </button>
```

**Verify**: `pnpm typecheck`

---

## CODEX-3: Facility Detail dynamic child_age_band

**File**: `src/app/(app)/facilities/[id]/page.tsx`

**Problem**: Score simulation uses hardcoded `child_age_band=2`. Should use actual child profile.

**Changes**:

1. Add import:
```tsx
import { useOnboardingStore } from '@/lib/store';
```

2. Get child age from store:
```tsx
  const child = useOnboardingStore((s) => s.child);
  const ageBand = child?.ageBand ?? 2;
```

3. Replace hardcoded age_band in the API call:
```tsx
  // Change:
  const { data: scoreResult } = useApiFetch<AdmissionScoreResultV2>(`/api/simulate?facility_id=${id}&child_age_band=2`);
  // To:
  const { data: scoreResult } = useApiFetch<AdmissionScoreResultV2>(`/api/simulate?facility_id=${id}&child_age_band=${ageBand}`);
```

**Verify**: `pnpm typecheck`

---

## CODEX-4: Error states for Dashboard, Checklist, Alerts

**Files**:
- `src/app/(app)/dashboard/page.tsx`
- `src/app/(app)/checklist/page.tsx`
- `src/app/(app)/alerts/page.tsx`

**Problem**: No error state UI. API failures show blank content.

**Changes for Dashboard** (`dashboard/page.tsx`):

1. Add import:
```tsx
import { ChatError } from '@/components/ai/chat-error';
```

2. Get error from store:
```tsx
  const error = useStrategyStore((s) => s.error);
```

3. Add error state in the conditional rendering, after loading check:
```tsx
  {loading ? (
    // ... existing skeleton
  ) : error ? (
    <ChatError
      message={error}
      onRetry={() => homeStore.load()}
    />
  ) : recommendation ? (
    // ... existing widget
  ) : (
    // ... existing empty state
  )}
```

**Changes for Checklist** (`checklist/page.tsx`):

1. Add import:
```tsx
import { ChatError } from '@/components/ai/chat-error';
```

2. Destructure `error` from useApiFetch:
```tsx
  const { data, loading, error, refetch } = useApiFetch<ChecklistResponse>(
```

3. Add error state:
```tsx
  {loading ? (
    // ... existing skeleton
  ) : error ? (
    <ChatError message={error} onRetry={refetch} />
  ) : !data || data.items.length === 0 ? (
    // ... existing empty state
  ) : (
    // ... existing checklist
  )}
```

**Changes for Alerts** (`alerts/page.tsx`):

1. Add import:
```tsx
import { ChatError } from '@/components/ai/chat-error';
```

2. Get error from store:
```tsx
  const error = useToAlertStore((s) => s.error);
```

3. Add error display above the Tabs:
```tsx
  <div className="p-4">
    {error && (
      <ChatError message={error} onRetry={() => { load(); loadHistory(); }} className="mb-4" />
    )}
    <Tabs defaultValue="history">
```

**Verify**: `pnpm typecheck`

---

## CODEX-5: Chat stagger animation + streaming-text

**Files**:
- `src/app/(app)/chat/page.tsx`
- `src/components/composites/ChatBubble.tsx`

**Problem**: All messages have `animationDelay: 0ms` — no stagger effect. `animate-streaming-text` class is defined but never used.

**Changes for chat/page.tsx**:

Find:
```tsx
  style={{ animationDelay: i === messages.length - 1 ? '0ms' : '0ms' }}
```

Replace with:
```tsx
  style={{ animationDelay: `${Math.min(i * 50, 300)}ms` }}
```

This gives 50ms stagger per message, capped at 300ms.

**Changes for ChatBubble.tsx** (`src/components/composites/ChatBubble.tsx`):

In the text content `<p>` tag, add the streaming animation class when the message is the last assistant message (detected by checking if content is still being generated — we approximate this by checking if the message has no created_at, meaning it's currently streaming):

Find:
```tsx
  <p className="text-sm whitespace-pre-wrap leading-relaxed">{textContent}</p>
```

Replace with:
```tsx
  <p className={cn(
    'text-sm whitespace-pre-wrap leading-relaxed',
    !isUser && !message.created_at && 'animate-streaming-text',
  )}>{textContent}</p>
```

**Verify**: `pnpm typecheck`

---

## CODEX-6: ChatInput dedup (ai/ → composites/ wrapper)

**File**: `src/components/ai/chat-input.tsx`

**Problem**: `ai/chat-input.tsx` and `composites/ChatInput.tsx` are near-identical implementations (code duplication from Codex round 1).

**Change**: Convert `ai/chat-input.tsx` to a thin wrapper that delegates to `composites/ChatInput.tsx`.

Replace the entire file content with:
```tsx
'use client';

import { ChatInput as PrimaryChatInput } from '@/components/composites/ChatInput';

export interface ChatInputProps {
  onSend: (text: string) => void;
  suggestions?: string[];
  disabled?: boolean;
  className?: string;
}

export function ChatInput({ onSend, suggestions, disabled, className }: ChatInputProps) {
  return (
    <PrimaryChatInput
      onSend={onSend}
      suggestions={suggestions}
      disabled={disabled}
      className={className}
    />
  );
}
```

**Verify**: `pnpm typecheck`

---

## CODEX-7: ScoreGauge + Skeleton reduced-motion + Login font size

**Files**:
- `src/components/composites/ScoreGauge.tsx`
- `src/components/ui/skeleton.tsx`
- `src/app/login/page.tsx`

**Problem 1**: ScoreGauge rAF animation ignores `prefers-reduced-motion`.
**Problem 2**: Skeleton `animate-pulse` has no reduced-motion alternative.
**Problem 3**: Login page terms text uses `text-[10px]` — below WCAG minimum.

**Changes for ScoreGauge.tsx**:

Add a hook to detect reduced motion at the top of the component:
```tsx
export function ScoreGauge({ score, grade, size = 'md', animated = true, className }: ScoreGaugeProps) {
  // Respect prefers-reduced-motion
  const prefersReducedMotion = typeof window !== 'undefined'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const shouldAnimate = animated && !prefersReducedMotion;

  const [displayScore, setDisplayScore] = useState(shouldAnimate ? 0 : score);
```

Then replace all references to `animated` with `shouldAnimate` in the useEffect and the progress calculation:
```tsx
  useEffect(() => {
    if (!shouldAnimate) return;
    // ... rest of animation code
  }, [score, shouldAnimate]);

  const effectiveScore = shouldAnimate ? displayScore : score;
```

Also update the SVG stroke transition:
```tsx
  style={{ transition: shouldAnimate ? 'none' : 'stroke-dashoffset 0.6s ease-out' }}
```

**Changes for skeleton.tsx**:

The globals.css already handles `prefers-reduced-motion` by setting all animation durations to near-zero, so Skeleton needs no code change. But add a visual fallback — a static background instead of pulse:

Find:
```tsx
  'animate-pulse bg-surface-inset',
```

Replace with:
```tsx
  'animate-pulse bg-surface-inset motion-reduce:animate-none',
```

**Changes for login/page.tsx**:

Find:
```tsx
  <p className="text-center text-[10px] text-text-tertiary leading-relaxed">
```

Replace with:
```tsx
  <p className="text-center text-xs text-text-tertiary leading-relaxed">
```

This changes from 10px to 12px (0.75rem), meeting WCAG minimum text size.

**Verify**: `pnpm typecheck`

---

## After All Tasks

Run full verification:
```bash
pnpm typecheck
```

All tasks should pass typecheck.
