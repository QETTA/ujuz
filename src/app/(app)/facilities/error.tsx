"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 p-8">
      <p className="text-sm text-text-secondary">문제가 발생했습니다</p>
      <p className="text-xs text-text-tertiary">{error.message}</p>
      <button
        onClick={reset}
        className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-text-inverse hover:bg-brand-600"
      >
        다시 시도
      </button>
    </div>
  );
}
