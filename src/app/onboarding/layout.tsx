export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative mx-auto flex min-h-dvh max-w-lg flex-col bg-surface">
      {children}
    </div>
  );
}
