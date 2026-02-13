# Codex Tasks — UX/UI 2026 Improvements

Each task below is self-contained. Copy-paste each section as a Codex prompt.
Run `pnpm typecheck` after each task to verify.

---

## CODEX-1: Fix ai/chat-input — input to textarea with auto-height

**File**: `src/components/ai/chat-input.tsx`

**Problem**: Uses `<input type="text">` (single line) while `composites/ChatInput.tsx` uses `<textarea>` with auto-height. Inconsistent and limits long question input.

**Change**: Replace the `<input>` with a `<textarea>` that auto-grows up to 120px, matching the composites version pattern.

**Current code to replace** (the form inside the component):
```tsx
<form onSubmit={handleSubmit} className="flex items-center gap-2">
  <input
    type="text"
    value={text}
    onChange={(e) => setText(e.target.value)}
    placeholder="질문을 입력하세요..."
    disabled={disabled}
    className="flex-1 rounded-full border border-border bg-surface-inset px-4 py-2.5 text-sm text-text-primary placeholder:text-text-tertiary focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 disabled:opacity-50"
    aria-label="메시지 입력"
  />
```

**New code**:
```tsx
// Add useRef import at top
import { useState, useRef, type FormEvent, type KeyboardEvent } from 'react';

// Add ref inside the component
const textareaRef = useRef<HTMLTextAreaElement>(null);

// Add keyboard handler
const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    handleSubmit(e);
  }
};

// Add auto-height handler
const handleInput = () => {
  const el = textareaRef.current;
  if (!el) return;
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, 120) + 'px';
};

// In handleSubmit, reset height:
// After setText(''), add: if (textareaRef.current) textareaRef.current.style.height = 'auto';

// Replace <input> with:
<form onSubmit={handleSubmit} className="flex items-end gap-2">
  <textarea
    ref={textareaRef}
    value={text}
    onChange={(e) => setText(e.target.value)}
    onKeyDown={handleKeyDown}
    onInput={handleInput}
    placeholder="질문을 입력하세요..."
    disabled={disabled}
    rows={1}
    className="flex-1 resize-none rounded-xl border border-border bg-surface-inset px-4 py-2.5 text-sm text-text-primary placeholder:text-text-tertiary focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 disabled:opacity-50"
    aria-label="메시지 입력"
  />
```

**Also change** suggestion layout from `flex-wrap` to `overflow-x-auto` for consistency:
```tsx
// Change:
<div className="mb-2 flex flex-wrap gap-1.5">
// To:
<div className="mb-2 flex gap-2 overflow-x-auto pb-1">
```

**Verify**: `pnpm typecheck`

---

## CODEX-2: Add prefers-reduced-transparency glass fallback

**File**: `src/app/globals.css`

**Problem**: `.glass` utility uses `backdrop-filter` but has no fallback for users who prefer reduced transparency (accessibility requirement).

**Change**: Add media query after the existing `.glass` utility class.

**Find this block** (near line ~190):
```css
.glass {
  background: var(--color-surface-glass);
  backdrop-filter: blur(12px) saturate(1.5);
  -webkit-backdrop-filter: blur(12px) saturate(1.5);
}
```

**Add immediately after**:
```css
@media (prefers-reduced-transparency) {
  .glass {
    background: var(--color-surface-elevated);
    backdrop-filter: none;
    -webkit-backdrop-filter: none;
  }
}
```

**Verify**: `pnpm typecheck` (CSS-only change, should always pass)

---

## CODEX-3: Add OKLCH @supports fallback for older browsers

**File**: `src/app/globals.css`

**Problem**: 7% of browsers don't support `oklch()`. No fallback defined.

**Change**: Add a `@supports` block before the `@theme` block with hex fallback values for critical semantic tokens.

**Add this block BEFORE the `@theme {` declaration** (near the top of the file, after imports):
```css
/* OKLCH fallback for browsers without support (~7%) */
@supports not (color: oklch(0% 0 0)) {
  :root {
    --color-brand-500: #6d5ce7;
    --color-surface: #ffffff;
    --color-surface-elevated: #fafaff;
    --color-surface-inset: #f3f2fa;
    --color-border: #e2e0ef;
    --color-text-primary: #1a1730;
    --color-text-secondary: #6b6580;
    --color-text-tertiary: #918ba3;
    --color-text-inverse: #ffffff;
    --color-success: #4caf7a;
    --color-warning: #e0a830;
    --color-danger: #d44035;
    --color-info: #5b8fd9;
  }
}
```

**Verify**: `pnpm typecheck`

---

## CODEX-4: Mobile conversation list (slide panel)

**File**: `src/app/(app)/chat/page.tsx`

**Problem**: Conversation list sidebar is `hidden lg:block` — completely inaccessible on mobile.

**Change**: Add a mobile slide panel that opens via a hamburger/list icon in the header.

**Implementation**:

1. Add state for mobile panel:
```tsx
import { useEffect, useRef, useState } from 'react';
// ... existing imports
import { Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline';

// Inside component:
const [showMobileList, setShowMobileList] = useState(false);
```

2. Update the `PageHeader` rightAction to include list toggle on mobile:
```tsx
<PageHeader
  title="AI 상담"
  rightAction={
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => setShowMobileList(true)}
        className="text-text-secondary hover:text-text-primary lg:hidden"
        aria-label="대화 목록"
      >
        <Bars3Icon className="h-5 w-5" />
      </button>
      {conversationId && (
        <button
          type="button"
          onClick={clear}
          className="text-xs text-brand-600 hover:underline"
        >
          새 대화
        </button>
      )}
    </div>
  }
/>
```

3. Add mobile overlay panel right after `<PageHeader>` and before the flex container:
```tsx
{/* Mobile conversation list overlay */}
{showMobileList && (
  <div className="fixed inset-0 z-overlay lg:hidden">
    <div
      className="absolute inset-0 bg-black/40"
      onClick={() => setShowMobileList(false)}
    />
    <aside className="absolute inset-y-0 left-0 w-72 bg-surface border-r border-border overflow-y-auto shadow-lg">
      <div className="flex items-center justify-between p-3">
        <button
          type="button"
          onClick={() => { clear(); setShowMobileList(false); }}
          className="flex-1 rounded-lg bg-brand-500 py-2 text-sm font-medium text-text-inverse hover:bg-brand-600 transition-colors"
        >
          새 대화 시작
        </button>
        <button
          type="button"
          onClick={() => setShowMobileList(false)}
          className="ml-2 p-1.5 text-text-tertiary hover:text-text-primary"
          aria-label="닫기"
        >
          <XMarkIcon className="h-5 w-5" />
        </button>
      </div>
      <div className="space-y-0.5 px-2">
        {conversations.map((conv) => (
          <ConversationListItem
            key={conv.id}
            conversation={conv}
            isActive={conv.id === conversationId}
            onSelect={() => { loadConversation(conv.id); setShowMobileList(false); }}
            onDelete={() => deleteConversation(conv.id)}
          />
        ))}
      </div>
    </aside>
  </div>
)}
```

**Verify**: `pnpm typecheck`

---

## CODEX-5: Integrate DataBlockCard into ChatBubble

**File**: `src/components/composites/ChatBubble.tsx`

**Problem**: Data blocks are rendered as inline `<div>` elements. The `DataBlockCard` component (`src/components/ai/data-block-card.tsx`) exists but is unused.

**Change**: Import and use `DataBlockCard` instead of inline markup.

1. Add import:
```tsx
import { DataBlockCard } from '@/components/ai/data-block-card';
```

2. Replace the inline data block rendering (the `message.data_blocks` section):

**Current**:
```tsx
{message.data_blocks && message.data_blocks.length > 0 && (
  <div className="mt-2 space-y-2">
    {message.data_blocks.map((block, i) => (
      <div
        key={`${block.type}-${i}`}
        className={cn(
          'rounded-lg p-3 text-xs',
          isUser ? 'bg-brand-600/50' : 'bg-surface-inset',
        )}
      >
        <p className="font-medium">{block.title}</p>
        <p className="mt-1 opacity-80">{block.content}</p>
        {block.source && (
          <p className="mt-1 text-[10px] opacity-60">출처: {block.source}</p>
        )}
      </div>
    ))}
  </div>
)}
```

**New**:
```tsx
{message.data_blocks && message.data_blocks.length > 0 && (
  <div className="mt-2 space-y-2">
    {message.data_blocks.map((block, i) => (
      <DataBlockCard
        key={`${block.type}-${i}`}
        type={block.type}
        title={block.title}
        content={block.content}
        confidence={block.confidence}
        source={block.source}
        className={isUser ? 'border-brand-400/30 bg-brand-600/20' : undefined}
      />
    ))}
  </div>
)}
```

**Verify**: `pnpm typecheck`

---

## CODEX-6: Inline error state + retry button

**Create new file**: `src/components/ai/chat-error.tsx`

```tsx
'use client';

import { cn } from '@/lib/utils';
import { ExclamationTriangleIcon, ArrowPathIcon } from '@heroicons/react/24/outline';

export interface ChatErrorProps {
  message: string;
  onRetry?: () => void;
  className?: string;
}

export function ChatError({ message, onRetry, className }: ChatErrorProps) {
  return (
    <div
      className={cn(
        'flex items-start gap-3 rounded-xl border border-danger/20 bg-danger/5 px-4 py-3',
        className,
      )}
      role="alert"
    >
      <ExclamationTriangleIcon className="h-5 w-5 shrink-0 text-danger" />
      <div className="flex-1 min-w-0">
        <p className="text-sm text-text-primary">{message}</p>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-danger/20 px-3 py-1.5 text-xs font-medium text-danger transition-colors hover:bg-danger/10"
          >
            <ArrowPathIcon className="h-3.5 w-3.5" />
            다시 시도
          </button>
        )}
      </div>
    </div>
  );
}
```

**Then update** `src/app/(app)/chat/page.tsx`:

1. Import: `import { ChatError } from '@/components/ai/chat-error';`
2. Destructure `error` from useChat: add `error` to the destructuring
3. Add error display after messages, before loading indicator:
```tsx
{error && (
  <ChatError
    message={error}
    onRetry={() => { /* re-send last message if available */ }}
  />
)}
```

**Do the same for** `src/app/(app)/ai/page.tsx` — destructure `error` from `useChat()` and add `ChatError` in the chat tab.

**Verify**: `pnpm typecheck`

---

## CODEX-7: Glass enhancement — inner shadow + text contrast

**File**: `src/app/globals.css`

**Problem**: Current `.glass` is basic `backdrop-filter` only. Missing inner shadow for depth and text contrast guarantee.

**Change**: Enhance the `.glass` class and add a `.glass-text` utility.

**Replace**:
```css
.glass {
  background: var(--color-surface-glass);
  backdrop-filter: blur(12px) saturate(1.5);
  -webkit-backdrop-filter: blur(12px) saturate(1.5);
}
```

**With**:
```css
.glass {
  position: relative;
  background: var(--color-surface-glass);
  backdrop-filter: blur(12px) saturate(1.5);
  -webkit-backdrop-filter: blur(12px) saturate(1.5);
  box-shadow:
    var(--shadow-sm),
    inset 0 1px 0 0 oklch(1 0 0 / 0.1);
}

/* Ensure text on glass surfaces meets 4.5:1 contrast ratio */
.glass-text {
  text-shadow: 0 0 8px var(--color-surface);
}
```

**Then update** `src/components/nav/top-bar.tsx`:

Find:
```tsx
: 'glass border-b border-border-subtle',
```

Replace with:
```tsx
: 'glass glass-text border-b border-border-subtle',
```

**Verify**: `pnpm typecheck`

---

## After All Tasks

Run full verification:
```bash
pnpm typecheck
pnpm test
```

All 285 existing tests should still pass.
