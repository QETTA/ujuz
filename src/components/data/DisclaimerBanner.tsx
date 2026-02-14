interface DisclaimerBannerProps {
  variant?: 'subtle' | 'prominent';
  className?: string;
}

export default function DisclaimerBanner({
  variant = 'subtle',
  className = '',
}: DisclaimerBannerProps) {
  if (variant === 'prominent') {
    return (
      <div className={`rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950 p-3 text-sm text-amber-800 dark:text-amber-200 ${className}`}>
        <p className="font-medium">안내</p>
        <p className="mt-1 text-xs">
          본 서비스의 입소 가능성 예측, 점수, 전략 정보는 공공데이터 기반 통계적 추정치이며,
          실제 입소 결과를 보장하지 않습니다. 정확한 정보는 해당 시설 또는 관할 지자체에 문의하세요.
        </p>
      </div>
    );
  }

  return (
    <p className={`text-[11px] text-muted-foreground ${className}`}>
      * 통계적 추정치이며 실제 결과와 다를 수 있습니다
    </p>
  );
}
