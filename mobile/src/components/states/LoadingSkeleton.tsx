import { View, ActivityIndicator } from 'react-native';
import { StyledText as Text } from '@/components/ui/StyledText';
import { COLORS } from '../../lib/constants';

interface LoadingSkeletonProps {
  title?: string;
  className?: string;
}

export function LoadingSkeleton({ title = '불러오는 중...', className }: LoadingSkeletonProps) {
  return (
    <View
      className={`flex-1 items-center justify-center py-16 ${className ?? ''}`}
      accessibilityRole="progressbar"
      accessibilityLabel={title}
    >
      <ActivityIndicator size="large" color={COLORS.brand500} />
      <Text className="mt-3 text-sm text-text-secondary dark:text-dark-text-secondary">{title}</Text>
    </View>
  );
}
