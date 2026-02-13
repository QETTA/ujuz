import { View, Text, TouchableOpacity } from 'react-native';

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
      <Text className="mb-2 text-center text-lg font-bold text-slate-900">{title}</Text>
      <Text className="mb-6 text-center text-sm leading-5 text-slate-500">{description}</Text>
      {primaryCta && (
        <TouchableOpacity
          onPress={primaryCta.onPress}
          className="min-h-11 min-w-[200px] items-center justify-center rounded-xl border border-indigo-500 px-6 py-3"
          activeOpacity={0.8}
        >
          <Text className="text-sm font-semibold text-indigo-500">{primaryCta.label}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
