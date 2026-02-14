import { View, TouchableOpacity } from 'react-native';
import { StyledText as Text } from '@/components/ui/StyledText';

interface CtaAction {
  label: string;
  onPress: () => void;
}

interface PlanLimitProps {
  title?: string;
  description?: string;
  primaryCta?: CtaAction;
  secondaryCta?: CtaAction;
  className?: string;
}

export function PlanLimit({
  title = '플랜 한도에 도달했어요',
  description = '더 많은 기능을 사용하려면 플랜을 업그레이드해 주세요.',
  primaryCta,
  secondaryCta,
  className,
}: PlanLimitProps) {
  return (
    <View className={`flex-1 items-center justify-center px-6 py-16 ${className ?? ''}`}>
      <Text className="mb-4 text-5xl">🔒</Text>
      <Text className="mb-2 text-center text-lg font-bold text-text-primary dark:text-dark-text-primary">{title}</Text>
      <Text className="mb-6 text-center text-sm leading-5 text-text-secondary dark:text-dark-text-secondary">{description}</Text>
      {primaryCta && (
        <TouchableOpacity
          onPress={primaryCta.onPress}
          className="mb-3 min-h-11 min-w-[200px] items-center justify-center rounded-xl bg-brand-500 px-6 py-3"
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel={primaryCta.label}
        >
          <Text className="text-sm font-semibold text-text-inverse">{primaryCta.label}</Text>
        </TouchableOpacity>
      )}
      {secondaryCta && (
        <TouchableOpacity
          onPress={secondaryCta.onPress}
          className="min-h-11 items-center justify-center px-2"
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={secondaryCta.label}
        >
          <Text className="text-sm font-medium text-brand-500">{secondaryCta.label}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
