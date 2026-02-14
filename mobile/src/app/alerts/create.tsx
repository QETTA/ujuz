import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Switch, TouchableOpacity, View } from 'react-native';
import { StyledText as Text } from '@/components/ui/StyledText';
import { SafeAreaView } from 'react-native-safe-area-context';
import { postJson } from '@/lib/api';
import { COLORS } from '@/lib/constants';

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
  const [smsEnabled, setSmsEnabled] = useState(false);
  const [smsConsent, setSmsConsent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const canSubmit = !isSubmitting && facilityId && (!smsEnabled || smsConsent);

  const submit = async () => {
    if (!canSubmit) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await postJson<CreateSubscriptionResponse>('/api/v1/alert-subscriptions', {
        facility_id: facilityId,
        schedule: { mode: frequency },
        channels: { push: true, sms: smsEnabled },
      });
      router.replace('/(tabs)/alerts');
    } catch {
      setErrorMessage('구독 생성에 실패했습니다. 잠시 후 다시 시도해 주세요.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-surface-inset dark:bg-dark-surface-inset">
      <View className="flex-1 px-5 py-6">
        <Text className="text-2xl font-extrabold text-text-primary dark:text-dark-text-primary">알림 구독 생성</Text>
        <Text className="mt-2 text-sm text-text-secondary dark:text-dark-text-secondary">
          시설 ID: {facilityId || '미지정'}
        </Text>

        <View className="mt-8">
          <Text className="mb-3 text-sm font-semibold text-text-primary dark:text-dark-text-primary">빈도</Text>
          <View className="gap-3">
            <TouchableOpacity
              disabled={isSubmitting}
              onPress={() => setFrequency('immediate')}
              accessibilityRole="button"
              accessibilityState={{ selected: frequency === 'immediate' }}
              className={`rounded-2xl border px-4 py-4 ${
                frequency === 'immediate'
                  ? 'border-brand-500 bg-brand-50'
                  : 'border-border-subtle dark:border-dark-border-subtle bg-surface dark:bg-dark-surface'
              }`}
            >
              <Text
                className={`text-base font-semibold ${
                  frequency === 'immediate' ? 'text-brand-700' : 'text-text-primary dark:text-dark-text-primary'
                }`}
              >
                즉시
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              disabled={isSubmitting}
              onPress={() => setFrequency('daily')}
              accessibilityRole="button"
              accessibilityState={{ selected: frequency === 'daily' }}
              className={`rounded-2xl border px-4 py-4 ${
                frequency === 'daily'
                  ? 'border-brand-500 bg-brand-50'
                  : 'border-border-subtle dark:border-dark-border-subtle bg-surface dark:bg-dark-surface'
              }`}
            >
              <Text
                className={`text-base font-semibold ${
                  frequency === 'daily' ? 'text-brand-700' : 'text-text-primary dark:text-dark-text-primary'
                }`}
              >
                1일 1회
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View className="mt-8 rounded-2xl border border-border-subtle dark:border-dark-border-subtle bg-surface dark:bg-dark-surface px-4 py-4">
          <Text className="text-sm font-semibold text-text-primary dark:text-dark-text-primary">채널</Text>
          <View className="mt-3 flex-row items-center justify-between">
            <View className="rounded-full bg-brand-100 px-3 py-1">
              <Text className="text-xs font-semibold text-brand-700">Push</Text>
            </View>
            <Text className="text-xs text-text-tertiary dark:text-dark-text-tertiary">기본</Text>
          </View>

          <View className="mt-3 flex-row items-center justify-between">
            <View className="flex-row items-center gap-2">
              <View className="rounded-full bg-amber-100 px-3 py-1">
                <Text className="text-xs font-semibold text-amber-700">SMS</Text>
              </View>
              <Text className="text-xs text-text-secondary dark:text-dark-text-secondary">유료 옵션</Text>
            </View>
            <Switch
              value={smsEnabled}
              onValueChange={(v) => {
                setSmsEnabled(v);
                if (!v) setSmsConsent(false);
              }}
              disabled={isSubmitting}
              accessibilityLabel="SMS 알림 활성화"
            />
          </View>

          {smsEnabled && (
            <View className="mt-3 rounded-xl bg-amber-50 p-3">
              <Text className="text-xs leading-5 text-amber-800">
                SMS 알림은 건당 약 20원의 비용이 발생하며, 일 5건 / 월 50건 상한이 적용됩니다.
                설정에서 언제든 해제할 수 있습니다.
              </Text>
              <TouchableOpacity
                className="mt-2 flex-row items-center gap-2"
                onPress={() => setSmsConsent((prev) => !prev)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: smsConsent }}
                accessibilityLabel="비용 발생 동의"
              >
                <View
                  className={`h-5 w-5 items-center justify-center rounded border ${
                    smsConsent ? 'border-brand-500 bg-brand-500' : 'border-border dark:border-dark-border bg-surface dark:bg-dark-surface'
                  }`}
                >
                  {smsConsent && <Text className="text-xs text-text-inverse">✓</Text>}
                </View>
                <Text className="flex-1 text-xs text-text-primary dark:text-dark-text-primary">
                  비용 발생에 동의합니다
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {errorMessage ? (
          <Text className="mt-4 text-sm font-medium text-rose-600">{errorMessage}</Text>
        ) : null}

        <TouchableOpacity
          disabled={!canSubmit}
          onPress={() => void submit()}
          accessibilityRole="button"
          accessibilityLabel="구독 저장"
          className={`mt-auto h-12 items-center justify-center rounded-xl ${
            canSubmit ? 'bg-brand-600' : 'bg-brand-300'
          }`}
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color={COLORS.textInverse} />
          ) : (
            <Text className="text-base font-bold text-text-inverse">구독 저장</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
