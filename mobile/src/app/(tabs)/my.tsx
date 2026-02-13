import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  Linking,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getJson, deleteJson } from '@/lib/api';

type SubscriptionItem = {
  id: string;
  facility_id: string;
  facility_name: string;
  target_classes: string[];
  is_active: boolean;
};

type ToAlertsResponse = {
  subscriptions: SubscriptionItem[];
  user?: {
    name?: string;
    email?: string;
    device_id?: string;
  };
  email?: string;
  device_id?: string;
  user_name?: string;
};

type SettingRowProps = {
  icon: string;
  label: string;
  description?: string;
  value?: string;
  onPress: () => void;
};

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const extractErrorMessage = (error: unknown): string => {
  if (!isObject(error)) {
    return '요청을 처리하지 못했습니다.';
  }

  const anyError = error as {
    message?: string;
    status?: number;
    statusCode?: number;
    response?: { status?: number; data?: { message?: string; error?: string } };
  };

  if (typeof anyError.message === 'string' && anyError.message.length > 0) {
    return anyError.message;
  }

  if (typeof anyError.response?.data?.message === 'string') {
    return anyError.response.data.message;
  }

  if (typeof anyError.response?.data?.error === 'string') {
    return anyError.response.data.error;
  }

  if (typeof anyError.status === 'number') {
    return `요청 중 오류가 발생했습니다. (HTTP ${anyError.status})`;
  }

  if (typeof anyError.statusCode === 'number') {
    return `요청 중 오류가 발생했습니다. (HTTP ${anyError.statusCode})`;
  }

  return '요청을 처리하지 못했습니다.';
};

const getStatusCode = (error: unknown): number | undefined => {
  if (!isObject(error)) {
    return undefined;
  }
  const anyError = error as {
    status?: number;
    statusCode?: number;
    response?: { status?: number };
  };
  return anyError.status ?? anyError.statusCode ?? anyError.response?.status;
}

const SettingRow = ({ icon, label, description, value, onPress }: SettingRowProps) => (
  <TouchableOpacity
    onPress={onPress}
    className="flex-row items-center bg-white border-b border-slate-200 px-4 py-4"
  >
    <Text className="mr-3 text-xl">{icon}</Text>
    <View className="flex-1">
      <Text className="text-base font-semibold text-slate-900">{label}</Text>
      {description ? <Text className="mt-1 text-xs text-slate-500">{description}</Text> : null}
      {value ? <Text className="mt-1 text-sm text-slate-500">{value}</Text> : null}
    </View>
    <Text className="text-xl text-slate-400">›</Text>
  </TouchableOpacity>
);

export default function MyScreen() {
  const [subscriptions, setSubscriptions] = useState<SubscriptionItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [deletingFacilityId, setDeletingFacilityId] = useState<string | null>(null);

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [userName, setUserName] = useState<string>('비로그인 사용자');
  const [userIdentity, setUserIdentity] = useState<string>('디바이스 ID: 미등록');

  const fetchSubscriptions = useCallback(async () => {
    setError('');
    try {
      const data = await getJson<ToAlertsResponse>('/api/v1/to-alerts');
      const fetched = Array.isArray(data?.subscriptions) ? data.subscriptions : [];
      setSubscriptions(fetched);

      setIsAuthenticated(true);

      const resolvedName =
        data?.user?.name ??
        data?.user_name ??
        '';
      const resolvedEmail =
        data?.user?.email ??
        data?.email ??
        '';
      const resolvedDeviceId =
        data?.user?.device_id ??
        data?.device_id ??
        '';

      setUserName(resolvedName.trim().length > 0 ? resolvedName : '회원님');

      if (resolvedEmail.trim().length > 0) {
        setUserIdentity(resolvedEmail);
      } else if (resolvedDeviceId.trim().length > 0) {
        setUserIdentity(`디바이스 ID: ${resolvedDeviceId}`);
      } else {
        setUserIdentity('디바이스 ID: 미연결');
      }
    } catch (error: unknown) {
      const status = getStatusCode(error);
      setSubscriptions([]);
      setIsAuthenticated(false);
      setUserName('비로그인 사용자');
      setUserIdentity('디바이스 ID: 미등록');
      if (status === 401) {
        setError('로그인이 필요합니다. 로그인 버튼을 눌러주세요.');
      } else {
        setError(extractErrorMessage(error));
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchSubscriptions();
  }, [fetchSubscriptions]);

  useEffect(() => {
    fetchSubscriptions();
  }, [fetchSubscriptions]);

  const handleLogin = useCallback(() => {
    Alert.alert('로그인', '로그인 기능은 준비 중입니다.');
  }, []);

  const handleDelete = useCallback(
    (facilityId: string, facilityName: string) => {
      Alert.alert('구독 해제', `${facilityName} 구독을 삭제하시겠습니까?`, [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제',
          style: 'destructive',
          onPress: async () => {
            try {
              setDeletingFacilityId(facilityId);
              await deleteJson(`/api/v1/to-alerts?facility_id=${encodeURIComponent(facilityId)}`);
              await fetchSubscriptions();
            } catch (error: unknown) {
              Alert.alert('구독 해제 실패', extractErrorMessage(error));
            } finally {
              setDeletingFacilityId(null);
            }
          },
        },
      ]);
    },
    [fetchSubscriptions]
  );

  const handleOpenPrivacy = useCallback(() => {
    Linking.openURL('https://ujuz.kr/privacy');
  }, []);

  const handleOpenTerms = useCallback(() => {
    Linking.openURL('https://ujuz.kr/terms');
  }, []);

  const handleLogout = useCallback(() => {
    Alert.alert('로그아웃', '로그아웃 기능은 준비 중입니다.');
  }, []);

  const handleWithdraw = useCallback(() => {
    Alert.alert('탈퇴', '탈퇴 기능은 준비 중입니다.');
  }, []);

  return (
    <SafeAreaView className="flex-1 bg-slate-100">
      <ScrollView
        className="flex-1"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View className="px-4 pb-8 pt-4">
          <View className="mb-6 rounded-2xl bg-white px-4 py-5">
            <View className="flex-row items-center">
              <View className="mr-4 h-16 w-16 items-center justify-center rounded-full bg-slate-200">
                <Text className="text-3xl">👤</Text>
              </View>
              <View className="flex-1">
                <Text className="text-lg font-bold text-slate-900">{userName}</Text>
                <Text className="mt-1 text-sm text-slate-500">{userIdentity}</Text>
                {!isAuthenticated ? (
                  <TouchableOpacity
                    onPress={handleLogin}
                    className="mt-3 self-start rounded-full bg-indigo-600 px-4 py-2"
                  >
                    <Text className="text-sm font-semibold text-white">로그인</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>
          </View>

          <Text className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
            내 구독
          </Text>
          <View className="overflow-hidden rounded-2xl bg-white">
            {loading ? (
              <View className="items-center justify-center py-10">
                <ActivityIndicator size="small" color="#4f46e5" />
              </View>
            ) : error ? (
              <View className="px-4 py-4">
                <Text className="text-sm text-rose-700">{error}</Text>
                <TouchableOpacity onPress={fetchSubscriptions} className="mt-3 self-start">
                  <Text className="text-sm font-semibold text-indigo-600">다시 시도</Text>
                </TouchableOpacity>
              </View>
            ) : subscriptions.length === 0 ? (
              <View className="px-4 py-6">
                <Text className="text-sm text-slate-500">
                  구독 중인 시설이 없습니다. 지도에서 시설을 구독해보세요.
                </Text>
              </View>
            ) : (
              subscriptions.map((subscription, index) => (
                <View
                  key={subscription.id || `${subscription.facility_id}-${index}`}
                  className="flex-row items-center justify-between border-b border-slate-100 px-4 py-4"
                >
                  <View className="flex-1 pr-3">
                    <Text className="text-base font-semibold text-slate-900">
                      {subscription.facility_name}
                    </Text>
                    <View className="mt-2 flex-row flex-wrap">
                      {(subscription.target_classes ?? []).map((targetClass) => (
                        <View
                          key={targetClass}
                          className="mb-2 mr-2 rounded-full bg-indigo-100 px-2.5 py-1"
                        >
                          <Text className="text-xs font-medium text-indigo-700">{targetClass}</Text>
                        </View>
                      ))}
                    </View>
                    {!subscription.is_active ? (
                      <Text className="mt-1 text-xs font-medium text-amber-600">비활성 상태</Text>
                    ) : null}
                  </View>
                  <TouchableOpacity
                    onPress={() => handleDelete(subscription.facility_id, subscription.facility_name)}
                    disabled={deletingFacilityId === subscription.facility_id}
                    className="h-9 w-9 items-center justify-center rounded-full border border-slate-200"
                  >
                    {deletingFacilityId === subscription.facility_id ? (
                      <ActivityIndicator size="small" color="#64748b" />
                    ) : (
                      <Text className="text-base text-slate-500">🗑</Text>
                    )}
                  </TouchableOpacity>
                </View>
              ))
            )}
          </View>

          <Text className="mb-2 mt-6 text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
            설정
          </Text>
          <View className="rounded-2xl bg-white">
            <SettingRow
              icon="🔔"
              label="알림 설정"
              description="푸시, 이메일 알림 토글은 추후 연동됩니다."
              onPress={() => Alert.alert('알림 설정', '알림 토글은 준비 중입니다.')}
            />
            <SettingRow
              icon="🛡️"
              label="개인정보처리방침"
              description="개인정보 수집·이용 내역 확인"
              onPress={handleOpenPrivacy}
            />
            <SettingRow
              icon="📄"
              label="이용약관"
              description="서비스 이용 규칙 확인"
              onPress={handleOpenTerms}
            />
            <SettingRow
              icon="ℹ️"
              label="앱 버전"
              value="1.0.0"
              onPress={() => Alert.alert('앱 버전', '현재 버전: 1.0.0')}
            />
          </View>

          <Text className="mb-2 mt-6 text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
            위험영역
          </Text>
          <View className="rounded-2xl bg-white p-4">
            <TouchableOpacity onPress={handleLogout} className="py-2">
              <Text className="text-lg font-semibold text-rose-500">로그아웃</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleWithdraw} className="py-2">
              <Text className="text-base text-slate-500">탈퇴</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
