import { View } from 'react-native';
import { StyledText as Text } from '@/components/ui/StyledText';

export default function SearchScreen() {
  return (
    <View className="flex-1 items-center justify-center bg-surface-inset dark:bg-dark-surface-inset">
      <Text className="text-xl font-bold text-text-primary dark:text-dark-text-primary">시설 검색</Text>
      <Text className="mt-2 text-sm text-text-secondary dark:text-dark-text-secondary">검색 화면 placeholder</Text>
    </View>
  );
}
