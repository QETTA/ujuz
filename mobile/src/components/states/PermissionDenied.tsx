import { View, Text, TouchableOpacity, Linking, Platform } from 'react-native';

interface CtaAction {
  label: string;
  onPress: () => void;
}

interface PermissionDeniedProps {
  variant: 'location' | 'push';
  title?: string;
  description?: string;
  primaryCta?: CtaAction;
  secondaryCta?: CtaAction;
  className?: string;
}

const DEFAULTS = {
  location: {
    emoji: '📍',
    title: '위치권한이 필요해요',
    description: '내 주변 시설을 찾으려면 위치 권한을 허용해 주세요.',
    primaryLabel: '설정에서 허용하기',
    secondaryLabel: '직접 지역 검색하기',
  },
  push: {
    emoji: '🔔',
    title: '알림권한이 필요해요',
    description: 'TO 알림을 받으려면 알림 권한을 허용해 주세요.',
    primaryLabel: '설정에서 허용하기',
    secondaryLabel: '앱에서 직접 확인하기',
  },
};

function openSettings() {
  if (Platform.OS === 'ios') {
    Linking.openURL('app-settings:');
  } else {
    Linking.openSettings();
  }
}

export function PermissionDenied({
  variant,
  title,
  description,
  primaryCta,
  secondaryCta,
  className,
}: PermissionDeniedProps) {
  const defaults = DEFAULTS[variant];

  return (
    <View className={`flex-1 items-center justify-center px-6 py-16 ${className ?? ''}`}>
      <Text className="mb-4 text-5xl">{defaults.emoji}</Text>
      <Text className="mb-2 text-center text-lg font-bold text-slate-900">
        {title ?? defaults.title}
      </Text>
      <Text className="mb-6 text-center text-sm leading-5 text-slate-500">
        {description ?? defaults.description}
      </Text>
      <TouchableOpacity
        onPress={primaryCta?.onPress ?? openSettings}
        className="mb-3 min-h-11 min-w-[200px] items-center justify-center rounded-xl bg-indigo-500 px-6 py-3"
        activeOpacity={0.8}
      >
        <Text className="text-sm font-semibold text-white">
          {primaryCta?.label ?? defaults.primaryLabel}
        </Text>
      </TouchableOpacity>
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
