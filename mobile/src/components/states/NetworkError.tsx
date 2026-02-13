import { View, Text, TouchableOpacity } from 'react-native';

interface CtaAction {
  label: string;
  onPress: () => void;
}

interface NetworkErrorProps {
  title?: string;
  description?: string;
  primaryCta?: CtaAction;
  className?: string;
}

export function NetworkError({
  title = '연결할 수 없어요',
  description = '네트워크 연결을 확인하고 다시 시도해 주세요.',
  primaryCta,
  className,
}: NetworkErrorProps) {
  return (
    <View className={`flex-1 items-center justify-center px-6 py-16 ${className ?? ''}`}>
      <Text className="mb-4 text-5xl">📡</Text>
      <Text className="mb-2 text-center text-lg font-bold text-slate-900">{title}</Text>
      <Text className="mb-6 text-center text-sm leading-5 text-slate-500">{description}</Text>
      {primaryCta && (
        <TouchableOpacity
          onPress={primaryCta.onPress}
          className="min-h-11 min-w-[200px] items-center justify-center rounded-xl bg-indigo-500 px-6 py-3"
          activeOpacity={0.8}
        >
          <Text className="text-sm font-semibold text-white">{primaryCta.label}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
