import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getJson, postJson } from '@/lib/api';

type UnreadAlert = {
  _id: string;
  facility_name: string;
  age_class: string;
  estimated_slots: number;
  confidence: number;
  detected_at: string;
  is_read: boolean;
};

type UnreadAlertsResponse = {
  alerts: UnreadAlert[];
  total: number;
};

type Subscription = {
  id: string;
  facility_id: string;
  facility_name: string;
  target_classes: string[];
  is_active: boolean;
  created_at: string;
};

type SubscriptionsResponse = {
  subscriptions: Subscription[];
};

type ConfidenceLevel = 'high' | 'medium' | 'low';

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return '방금 전';
  if (mins < 60) return `${mins}분 전`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}시간 전`;
  const days = Math.floor(hours / 24);
  return `${days}일 전`;
}

function getConfidenceLevel(confidence: number): ConfidenceLevel {
  if (confidence > 0.8) return 'high';
  if (confidence >= 0.6) return 'medium';
  return 'low';
}

function confidenceVisual(level: ConfidenceLevel) {
  if (level === 'high') {
    return { dot: 'bg-green-500', label: '높음' };
  }
  if (level === 'medium') {
    return { dot: 'bg-yellow-400', label: '보통' };
  }
  return { dot: 'bg-slate-400', label: '낮음' };
}

function parseFacilityClasses(classes: string[]) {
  return classes.join(', ');
}

export default function AlertsScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [alerts, setAlerts] = useState<UnreadAlert[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [markingIds, setMarkingIds] = useState<Set<string>>(new Set());

  const loadData = useCallback(
    async (options: { silent?: boolean } = {}) => {
      const { silent = false } = options;
      if (!silent) setLoading(true);
      setErrorMessage(null);

      try {
        const [alertRes, subscriptionRes] = await Promise.all([
          getJson<UnreadAlertsResponse>('/api/to-alerts/unread'),
          getJson<SubscriptionsResponse>('/api/to-alerts'),
        ]);

        const unreadAlerts = (alertRes.alerts ?? []).filter((item) => !item.is_read);
        setAlerts(unreadAlerts);
        setSubscriptions(subscriptionRes.subscriptions ?? []);
      } catch (error) {
        setErrorMessage('알림을 불러오지 못했습니다.');
      } finally {
        if (!silent) setLoading(false);
        setRefreshing(false);
      }
    },
    [],
  );

  useEffect(() => {
    let mounted = true;
    loadData();

    const interval = setInterval(() => {
      if (mounted) {
        loadData({ silent: true });
      }
    }, 60000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [loadData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData({ silent: true });
  }, [loadData]);

  const markAsRead = useCallback(
    async (alertId: string) => {
      if (markingIds.has(alertId)) return;
      setMarkingIds((prev) => {
        const next = new Set(prev);
        next.add(alertId);
        return next;
      });

      try {
        await postJson('/api/to-alerts/read', { alert_ids: [alertId] });
        setAlerts((prev) => prev.filter((item) => item._id !== alertId));
      } catch {
        setErrorMessage('알림을 읽음 처리하지 못했습니다.');
      } finally {
        setMarkingIds((prev) => {
          const next = new Set(prev);
          next.delete(alertId);
          return next;
        });
      }
    },
    [markingIds],
  );

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-slate-100">
      <View className="border-b border-slate-200 bg-white px-4 py-4">
        <View className="flex-row items-center justify-between">
          <Text className="text-2xl font-extrabold text-slate-900">TO 알림</Text>
          <View className="flex-row items-center rounded-full bg-indigo-100 px-3 py-1">
            <Text className="text-xs font-semibold text-indigo-700">
              미확인 {alerts.length}건
            </Text>
          </View>
        </View>
        {errorMessage ? (
          <Text className="mt-2 text-xs text-rose-500">{errorMessage}</Text>
        ) : null}
      </View>

      <ScrollView
        className="flex-1"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 28 }}
      >
        {loading ? (
          <View className="flex-1 items-center justify-center py-16">
            <ActivityIndicator size="large" color="#6366f1" />
          </View>
        ) : (
          <View className="py-4">
            <View>
              <Text className="mb-3 text-lg font-bold text-slate-900">활성 알림</Text>
              {alerts.length === 0 ? (
                <View className="mb-6 rounded-2xl border border-indigo-100 bg-indigo-50 p-4">
                  <Text className="text-sm text-slate-700">
                    아직 감지된 TO가 없습니다. 시설을 구독하면 빈자리 알림을 받을 수 있습니다.
                  </Text>
                </View>
              ) : (
                <View className="mb-6 gap-3">
                  {alerts.map((alert) => {
                    const confidenceLevel = getConfidenceLevel(alert.confidence);
                    const { dot, label } = confidenceVisual(confidenceLevel);
                    const isMarking = markingIds.has(alert._id);

                    return (
                      <TouchableOpacity
                        key={alert._id}
                        activeOpacity={0.75}
                        disabled={isMarking}
                        onPress={() => markAsRead(alert._id)}
                        className={`rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm ${isMarking ? 'opacity-70' : 'opacity-100'}`}
                      >
                        <View className="absolute left-0 top-0 h-full w-1 rounded-l-2xl border-l-4 border-indigo-500" />
                        <View className="mb-2 flex-row items-center justify-between gap-2">
                          <View className="flex-1">
                            <Text className="text-base font-bold text-slate-900">
                              {alert.facility_name}
                            </Text>
                          </View>
                          <View className="rounded-full bg-indigo-100 px-3 py-1">
                            <Text className="text-xs font-semibold text-indigo-700">{alert.age_class}</Text>
                          </View>
                        </View>
                        <View className="mb-2 flex-row items-center justify-between">
                          <Text className="text-sm text-slate-600">
                            예상 {alert.estimated_slots}명
                          </Text>
                          <Text className="text-xs text-slate-500">{timeAgo(alert.detected_at)}</Text>
                        </View>
                        <View className="flex-row items-center justify-end gap-1">
                          <View className={`h-2 w-2 rounded-full ${dot}`} />
                          <Text className="text-xs text-slate-500">신뢰도 {label}</Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </View>

            <View>
              <Text className="mb-3 text-lg font-bold text-slate-900">Subscriptions</Text>
              <View className="gap-3 pb-2">
                {subscriptions.length === 0 ? (
                  <View className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
                    <Text className="text-sm text-slate-500">구독한 시설이 없습니다.</Text>
                  </View>
                ) : (
                  subscriptions.map((sub) => (
                    <View
                      key={sub.id}
                      className="rounded-2xl border border-slate-100 bg-white px-4 py-4 shadow-sm"
                    >
                      <View className="mb-2 flex-row items-center justify-between">
                        <Text className="text-base font-semibold text-slate-900">{sub.facility_name}</Text>
                        <View
                          className={`rounded-full px-3 py-1 ${
                            sub.is_active ? 'bg-green-100' : 'bg-slate-100'
                          }`}
                        >
                          <Text
                            className={`text-xs font-semibold ${
                              sub.is_active ? 'text-green-700' : 'text-slate-500'
                            }`}
                          >
                            {sub.is_active ? '구독 중' : '중지됨'}
                          </Text>
                        </View>
                      </View>
                      <Text className="mb-1 text-xs text-slate-500">대상 연령</Text>
                      <View className="flex-row flex-wrap gap-2">
                        {sub.target_classes.length === 0 ? (
                          <Text className="text-sm text-slate-500">지정 없음</Text>
                        ) : (
                          sub.target_classes.map((target) => (
                            <View
                              key={`${sub.id}-${target}`}
                              className="rounded-full bg-indigo-100 px-3 py-1"
                            >
                              <Text className="text-xs font-medium text-indigo-700">{target}</Text>
                            </View>
                          ))
                        )}
                      </View>
                      <Text className="mt-2 text-xs text-slate-400">
                        시설ID: {sub.facility_id}
                        {parseFacilityClasses(sub.target_classes).length > 0
                          ? ` / 대상: ${parseFacilityClasses(sub.target_classes)}`
                          : ''}
                      </Text>
                    </View>
                  ))
                )}
              </View>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
