export function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 px-4 py-2" aria-label="AI 응답 생성 중">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="h-2 w-2 rounded-full bg-text-tertiary animate-bounce"
          style={{ animationDelay: `${i * 150}ms` }}
        />
      ))}
    </div>
  );
}
