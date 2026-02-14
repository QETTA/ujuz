import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { postJson } from '@/lib/api';

type Frequency = 'immediate' | 'daily';

type CreateSubscriptionResponse = {
  subscription_id: string;
};

type RouteParams = {
  facility_id?: string | string[];
};

function getSingleParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return (value[0] ?? '').trim();
  return typeof value === 'string' ? value.trim() : '';
}

export default function AlertSubscriptionCreateScreen() {
  const params = useLocalSearchParams<RouteParams>();
  const facilityId = useMemo(() => getSingleParam(params.facility_id), [params.facility_id]);

  const [frequency, setFrequency] = useState<Frequency>('immediate');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const submit = async () => {
    if (isSubmitting) return;
    if (!facilityId) {
      setErrorMessage('facility_id가 필요합니다.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await postJson<CreateSubscriptionResponse>('/api/v1/alert-subscriptions', {
        facility_id: facilityId,
        schedule: { mode: frequency },
        channels: { push: true, sms: false },
      });
      router.replace('/(tabs)/alerts');
    } catch {
      setErrorMessage('구독 생성에 실패했습니다. 잠시 후 다시 시도해 주세요.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-slate-100">
      <View className="flex-1 px-5 py-6">
        <Text className="text-2xl font-extrabold text-slate-900">알림 구독 생성</Text>
        <Text className="mt-2 text-sm text-slate-600">
          시설 ID: {facilityId || '미지정'}
        </Text>

        <View className="mt-8">
          <Text className="mb-3 text-sm font-semibold text-slate-700">빈도</Text>
          <View className="gap-3">
            <TouchableOpacity
              disabled={isSubmitting}
              onPress={() => setFrequency('immediate')}
              className={`rounded-2xl border px-4 py-4 ${
                frequency === 'immediate'
                  ? 'border-indigo-500 bg-indigo-50'
                  : 'border-slate-200 bg-white'
              }`}
            >
              <Text
                className={`text-base font-semibold ${
                  frequency === 'immediate' ? 'text-indigo-700' : 'text-slate-800'
                }`}
              >
                즉시
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              disabled={isSubmitting}
              onPress={() => setFrequency('daily')}
              className={`rounded-2xl border px-4 py-4 ${
                frequency === 'daily'
                  ? 'border-indigo-500 bg-indigo-50'
                  : 'border-slate-200 bg-white'
              }`}
            >
              <Text
                className={`text-base font-semibold ${
                  frequency === 'daily' ? 'text-indigo-700' : 'text-slate-800'
                }`}
              >
                1일 1회
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View className="mt-8 rounded-2xl border border-slate-200 bg-white px-4 py-4">
          <Text className="text-sm font-semibold text-slate-700">채널</Text>
          <View className="mt-3 self-start rounded-full bg-indigo-100 px-3 py-1">
            <Text className="text-xs font-semibold text-indigo-700">Push</Text>
          </View>
        </View>

        {errorMessage ? (
          <Text className="mt-4 text-sm font-medium text-rose-600">{errorMessage}</Text>
        ) : null}

        <TouchableOpacity
          disabled={isSubmitting}
          onPress={() => void submit()}
          className={`mt-auto h-12 items-center justify-center rounded-xl ${
            isSubmitting ? 'bg-indigo-300' : 'bg-indigo-600'
          }`}
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <Text className="text-base font-bold text-white">구독 저장</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
