import { View, TouchableOpacity } from 'react-native';
import { StyledText as Text } from '@/components/ui/StyledText';

interface CtaAction {
  label: string;
  onPress: () => void;
}

interface EmptyNoResultsProps {
  title?: string;
  description?: string;
  primaryCta?: CtaAction;
  className?: string;
}

export function EmptyNoResults({
  title = '검색 결과가 없어요',
  description = '다른 조건으로 다시 시도해 보세요.',
  primaryCta,
  className,
}: EmptyNoResultsProps) {
  return (
    <View className={`flex-1 items-center justify-center px-6 py-16 ${className ?? ''}`}>
      <Text className="mb-4 text-5xl">🔍</Text>
      <Text className="mb-2 text-center text-lg font-bold text-text-primary dark:text-dark-text-primary">{title}</Text>
      <Text className="mb-6 text-center text-sm leading-5 text-text-secondary dark:text-dark-text-secondary">{description}</Text>
      {primaryCta && (
        <TouchableOpacity
          onPress={primaryCta.onPress}
          className="min-h-11 min-w-[200px] items-center justify-center rounded-xl border border-brand-500 px-6 py-3"
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel={primaryCta.label}
        >
          <Text className="text-sm font-semibold text-brand-500">{primaryCta.label}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
