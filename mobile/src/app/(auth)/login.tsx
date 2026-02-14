import { View } from 'react-native';
import { StyledText as Text } from '@/components/ui/StyledText';

export default function LoginScreen() {
  return (
    <View className="flex-1 items-center justify-center bg-surface-inset dark:bg-dark-surface-inset">
      <Text className="text-xl font-bold text-text-primary dark:text-dark-text-primary">로그인</Text>
      <Text className="mt-2 text-sm text-text-secondary dark:text-dark-text-secondary">인증 화면 placeholder</Text>
    </View>
  );
}
