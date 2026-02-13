import { View, Text, TouchableOpacity } from 'react-native';

interface CtaAction {
  label: string;
  onPress: () => void;
}

interface EmptyFirstUseProps {
  title: string;
  description: string;
  primaryCta?: CtaAction;
  secondaryCta?: CtaAction;
  className?: string;
}

export function EmptyFirstUse({
  title,
  description,
  primaryCta,
  secondaryCta,
  className,
}: EmptyFirstUseProps) {
  return (
    <View className={`flex-1 items-center justify-center px-6 py-16 ${className ?? ''}`}>
      <Text className="mb-4 text-5xl">📭</Text>
      <Text className="mb-2 text-center text-lg font-bold text-slate-900">{title}</Text>
      <Text className="mb-6 text-center text-sm leading-5 text-slate-500">{description}</Text>
      {primaryCta && (
        <TouchableOpacity
          onPress={primaryCta.onPress}
          className="mb-3 min-h-11 min-w-[200px] items-center justify-center rounded-xl bg-indigo-500 px-6 py-3"
          activeOpacity={0.8}
        >
          <Text className="text-sm font-semibold text-white">{primaryCta.label}</Text>
        </TouchableOpacity>
      )}
      {secondaryCta && (
        <TouchableOpacity
          onPress={secondaryCta.onPress}
          className="min-h-11 items-center justify-center px-2"
          activeOpacity={0.7}
        >
          <Text className="text-sm font-medium text-indigo-500">{secondaryCta.label}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
