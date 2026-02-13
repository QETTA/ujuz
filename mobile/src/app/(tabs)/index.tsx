import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { getJson } from '@/lib/api';

type UnreadResponse = {
  total?: number;
};

type ToAlertSubscription = {
  active?: boolean;
};

type SubscriptionsResponse = {
  subscriptions?: ToAlertSubscription[];
};

type QuickAction = {
  icon: string;
  title: string;
  route: string;
};

type PlaceholderActivity = {
  title: string;
  description: string;
};

const quickActions: QuickAction[] = [
  {
    icon: '📍',
    title: '시설 검색',
    route: '/(tabs)/map',
  },
  {
    icon: '💬',
    title: 'AI 상담',
    route: '/(tabs)/chat',
  },
  {
    icon: '🔔',
    title: 'TO 알림',
    route: '/(tabs)/alerts',
  },
  {
    icon: '👤',
    title: '마이페이지',
    route: '/(tabs)/my',
  },
];

const recentActivities: PlaceholderActivity[] = [
  {
    title: '최근 활동',
    description: 'TO 입학 확률 분석 결과가 곧 도착합니다.',
  },
  {
    title: '최근 활동',
    description: '내 주변 시설 추천이 준비되면 알림으로 안내됩니다.',
  },
];

const unreadRoute = '/(tabs)/alerts';

export default function HomeScreen() {
  const [unreadTotal, setUnreadTotal] = useState<number | null>(null);
  const [activeSubscriptions, setActiveSubscriptions] = useState<number | null>(null);
  const [isLoadingUnread, setIsLoadingUnread] = useState(true);
  const [isLoadingSubscriptions, setIsLoadingSubscriptions] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchDashboard = useCallback(async () => {
    setIsLoadingUnread(true);
    setIsLoadingSubscriptions(true);

    const [unreadResult, subscriptionsResult] = await Promise.allSettled([
      getJson<UnreadResponse>('/api/to-alerts/unread'),
      getJson<SubscriptionsResponse>('/api/to-alerts'),
    ]);

    if (unreadResult.status === 'fulfilled' && typeof unreadResult.value.total === 'number') {
      setUnreadTotal(unreadResult.value.total);
    } else {
      setUnreadTotal(null);
    }

    if (
      subscriptionsResult.status === 'fulfilled' &&
      Array.isArray(subscriptionsResult.value.subscriptions)
    ) {
      const activeCount = subscriptionsResult.value.subscriptions.filter(
        (item) => item?.active === true,
      ).length;
      setActiveSubscriptions(activeCount);
    } else {
      setActiveSubscriptions(null);
    }

    setIsLoadingUnread(false);
    setIsLoadingSubscriptions(false);
  }, []);

  useEffect(() => {
    fetchDashboard().catch(() => {
      setIsLoadingUnread(false);
      setIsLoadingSubscriptions(false);
      setUnreadTotal(null);
      setActiveSubscriptions(null);
    });
  }, [fetchDashboard]);

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await fetchDashboard();
    } finally {
      setIsRefreshing(false);
    }
  }, [fetchDashboard]);

  const toMap = useCallback(() => {
    router.push('/(tabs)/map');
  }, []);

  const toAlerts = useCallback(() => {
    router.push(unreadRoute);
  }, []);

  return (
    <SafeAreaView className="flex-1 bg-slate-100" edges={['top']}>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 20, paddingBottom: 36 }}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            colors={['#6366f1']}
            tintColor="#6366f1"
          />
        }
      >
        <View className="mb-6">
          <Text className="text-xs font-medium tracking-widest text-indigo-600">우쥬</Text>
          <Text className="mt-1 text-3xl font-bold text-slate-900">안녕하세요, 오늘도 준비하고 계시죠?</Text>
          <Text className="mt-2 text-sm text-slate-500">입학 준비 상황을 한눈에 확인하세요.</Text>
        </View>

        <TouchableOpacity activeOpacity={0.9} onPress={toMap} className="mb-5 rounded-2xl bg-white p-3 shadow-sm">
          <View className="h-12 flex-row items-center rounded-2xl border border-slate-200 bg-slate-50 px-3">
            <Text className="mr-2 text-lg">🔍</Text>
            <TextInput
              className="flex-1 text-base text-slate-900"
              placeholder="입력하지 않고 검색 탭으로 이동"
              placeholderTextColor="#94a3b8"
              onFocus={toMap}
              showSoftInputOnFocus={false}
            />
          </View>
        </TouchableOpacity>

        <View className="mb-5 flex-row gap-3">
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={toAlerts}
            className="flex-1 rounded-2xl bg-white p-4 shadow-sm"
          >
            <View className="flex-row items-start justify-between">
              <Text className="text-sm font-medium text-slate-500">읽지 않은 알림</Text>
              {unreadTotal !== null && unreadTotal > 0 ? (
                <View className="rounded-full bg-red-500 px-2 py-0.5">
                  <Text className="text-xs font-semibold text-white">{unreadTotal}</Text>
                </View>
              ) : null}
            </View>
            <View className="mt-3 h-10 justify-center">
              {isLoadingUnread ? (
                <ActivityIndicator size="small" color="#6366f1" />
              ) : (
                <Text className="text-3xl font-bold text-slate-900">
                  {unreadTotal === null ? '—' : unreadTotal}
                </Text>
              )}
            </View>
            <Text className="mt-1 text-xs text-slate-400">탭에서 자세히 보기</Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.9}
            onPress={toAlerts}
            className="flex-1 rounded-2xl bg-white p-4 shadow-sm"
          >
            <Text className="text-sm font-medium text-slate-500">구독 수</Text>
            <View className="mt-3 h-10 justify-center">
              {isLoadingSubscriptions ? (
                <ActivityIndicator size="small" color="#6366f1" />
              ) : (
                <Text className="text-3xl font-bold text-slate-900">
                  {activeSubscriptions === null ? '—' : activeSubscriptions}
                </Text>
              )}
            </View>
            <Text className="mt-1 text-xs text-slate-400">현재 활성화된 TO 알림</Text>
          </TouchableOpacity>
        </View>

        <View className="mb-6 rounded-2xl bg-white p-4 shadow-sm">
          <View className="mb-3 flex-row items-center justify-between">
            <Text className="text-base font-semibold text-slate-900">최근 활동</Text>
            <Text className="text-sm text-indigo-600">준비 중</Text>
          </View>
          <View className="gap-3">
            {recentActivities.map((activity, index) => (
              <View
                key={`${activity.title}-${index}`}
                className="rounded-2xl border border-indigo-100 bg-indigo-50 p-3"
              >
                <Text className="text-sm font-semibold text-slate-900">{activity.title}</Text>
                <Text className="mt-1 text-sm text-slate-500">{activity.description}</Text>
              </View>
            ))}
          </View>
        </View>

        <View>
          <Text className="mb-3 text-base font-semibold text-slate-900">빠른 메뉴</Text>
          <View className="flex-row flex-wrap -mx-1.5">
            {quickActions.map((action) => (
              <TouchableOpacity
                key={action.title}
                onPress={() => router.push(action.route)}
                className="w-1/2 px-1.5"
                activeOpacity={0.9}
              >
                <View className="mb-3 rounded-2xl bg-white p-4 shadow-sm">
                  <Text className="mb-2 text-2xl">{action.icon}</Text>
                  <Text className="text-sm font-semibold text-slate-900">{action.title}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
