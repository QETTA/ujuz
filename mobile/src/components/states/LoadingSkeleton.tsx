import { View, ActivityIndicator, Text } from 'react-native';

interface LoadingSkeletonProps {
  title?: string;
  className?: string;
}

export function LoadingSkeleton({ title = '불러오는 중...', className }: LoadingSkeletonProps) {
  return (
    <View className={`flex-1 items-center justify-center py-16 ${className ?? ''}`}>
      <ActivityIndicator size="large" color="#6366f1" />
      <Text className="mt-3 text-sm text-slate-500">{title}</Text>
    </View>
  );
}
