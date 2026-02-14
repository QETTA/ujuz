import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { deleteJson, getJson, postJson } from '@/lib/api';
import { FacilityDetailCard, type FacilityDetailCardData } from '@/components/facility/FacilityDetailCard';

type DetailErrorState = 'network' | 'server' | 'data_missing' | null;

interface FacilityDetailModel {
  id: string;
  name: string;
  address?: string;
  phone?: string;
  type?: string;
  distanceM?: number;
  updatedAt?: string;
}

interface SaveResponse {
  saved?: boolean;
}

const TYPE_LABELS: Record<string, string> = {
  national_public: '국공립',
  public: '공립',
  private: '민간',
  home: '가정',
  cooperative: '협동',
  workplace: '직장',
  other: '기타',
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const toStringOrUndefined = (value: unknown): string | undefined => {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const toNumberOrUndefined = (value: unknown): number | undefined => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
};

const formatDistance = (distanceM?: number): string => {
  if (typeof distanceM !== 'number') return '거리 정보 없음';
  if (distanceM < 1000) return `${Math.round(distanceM)}m`;
  return `${(distanceM / 1000).toFixed(1)}km`;
};

const formatType = (type?: string): string | undefined => {
  if (!type) return undefined;
  return TYPE_LABELS[type] ?? type;
};

const formatDateLabel = (value?: string): string | undefined => {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;

  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}.${month}.${day} 업데이트`;
};

const parseAddress = (value: unknown): string | undefined => {
  const direct = toStringOrUndefined(value);
  if (direct) return direct;

  if (!isRecord(value)) return undefined;
  const full = toStringOrUndefined(value.full);
  if (full) return full;

  const parts = [
    toStringOrUndefined(value.sido),
    toStringOrUndefined(value.sigungu),
    toStringOrUndefined(value.detail),
  ].filter((part): part is string => Boolean(part));
  return parts.length > 0 ? parts.join(' ') : undefined;
};

function parseFacilityResponse(payload: unknown): { facility: FacilityDetailModel | null; saved?: boolean } {
  if (!isRecord(payload)) {
    return { facility: null };
  }

  const saved = typeof payload.saved === 'boolean' ? payload.saved : undefined;
  const source = isRecord(payload.facility) ? payload.facility : payload;

  const id = toStringOrUndefined(source.id);
  const name = toStringOrUndefined(source.name);
  if (!id || !name) {
    return { facility: null, saved };
  }

  const distanceMDirect = toNumberOrUndefined(source.distance_m);
  const distanceKm = toNumberOrUndefined(source.distance_km);
  const distanceM =
    typeof distanceMDirect === 'number'
      ? distanceMDirect
      : typeof distanceKm === 'number'
        ? distanceKm * 1000
        : undefined;

  return {
    facility: {
      id,
      name,
      address: parseAddress(source.address),
      phone: toStringOrUndefined(source.phone),
      type: toStringOrUndefined(source.type),
      distanceM: typeof distanceM === 'number' && distanceM >= 0 ? distanceM : undefined,
      updatedAt: toStringOrUndefined(source.updated_at),
    },
    saved,
  };
}

const isNetworkError = (error: unknown): boolean => {
  if (error instanceof TypeError) return true;
  if (!isRecord(error)) return false;

  const message = toStringOrUndefined(error.message);
  if (!message) return false;
  const normalized = message.toLowerCase();
  return normalized.includes('network') || normalized.includes('fetch') || normalized.includes('인터넷');
};

export default function FacilityDetailScreen() {
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const routeId = Array.isArray(params.id) ? params.id[0] : params.id;
  const facilityId = typeof routeId === 'string' && routeId.length > 0 ? routeId : null;

  const [facility, setFacility] = useState<FacilityDetailModel | null>(null);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorState, setErrorState] = useState<DetailErrorState>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const fetchDetail = useCallback(async () => {
    if (!facilityId) {
      setFacility(null);
      setErrorState('data_missing');
      setLoading(false);
      return;
    }

    setLoading(true);
    setErrorState(null);
    setSaveError(null);

    try {
      const response = await getJson<unknown>(`/api/v1/facilities/${encodeURIComponent(facilityId)}`);
      const parsed = parseFacilityResponse(response);
      if (!parsed.facility) {
        setFacility(null);
        setErrorState('data_missing');
        return;
      }

      setFacility(parsed.facility);
      setSaved(parsed.saved ?? false);
    } catch (error) {
      setFacility(null);
      setErrorState(isNetworkError(error) ? 'network' : 'server');
    } finally {
      setLoading(false);
    }
  }, [facilityId]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  const handleToggleSave = useCallback(async () => {
    if (!facility || saving) return;

    const previous = saved;
    const next = !previous;

    setSaveError(null);
    setSaved(next);
    setSaving(true);

    try {
      const endpoint = `/api/v1/facilities/${encodeURIComponent(facility.id)}/save`;
      const result = next
        ? await postJson<SaveResponse>(endpoint, {})
        : await deleteJson<SaveResponse>(endpoint);

      if (typeof result?.saved === 'boolean') {
        setSaved(result.saved);
      }
    } catch {
      setSaved(previous);
      setSaveError('저장 상태 변경에 실패했어요. 잠시 후 다시 시도해 주세요.');
    } finally {
      setSaving(false);
    }
  }, [facility, saved, saving]);

  const handlePressCreateAlert = useCallback(() => {
    if (!facility) return;
    router.push(
      `/alerts/create?facility_id=${encodeURIComponent(facility.id)}` as Parameters<typeof router.push>[0],
    );
  }, [facility]);

  const cardData = useMemo<FacilityDetailCardData | null>(() => {
    if (!facility) return null;

    return {
      name: facility.name,
      address: facility.address,
      distanceLabel: formatDistance(facility.distanceM),
      phone: facility.phone,
      typeLabel: formatType(facility.type),
      updatedAtLabel: formatDateLabel(facility.updatedAt),
    };
  }, [facility]);

  const renderStateBlock = () => {
    if (loading) {
      return (
        <View style={styles.stateCard}>
          <ActivityIndicator size="small" color="#4F46E5" />
          <Text style={styles.stateTitle}>시설 정보를 불러오는 중입니다.</Text>
        </View>
      );
    }

    if (errorState === 'network') {
      return (
        <View style={styles.stateCard}>
          <Text style={styles.stateTitle}>네트워크 연결을 확인해 주세요.</Text>
          <Text style={styles.stateDescription}>
            인터넷 연결이 불안정해 시설 정보를 가져오지 못했습니다.
          </Text>
          <Pressable onPress={fetchDetail} style={({ pressed }) => [styles.retryButton, pressed ? styles.buttonPressed : null]}>
            <Text style={styles.retryButtonText}>다시 시도</Text>
          </Pressable>
        </View>
      );
    }

    if (errorState === 'server') {
      return (
        <View style={styles.stateCard}>
          <Text style={styles.stateTitle}>시설 정보를 불러오지 못했습니다.</Text>
          <Text style={styles.stateDescription}>
            잠시 후 다시 시도해 주세요.
          </Text>
          <Pressable onPress={fetchDetail} style={({ pressed }) => [styles.retryButton, pressed ? styles.buttonPressed : null]}>
            <Text style={styles.retryButtonText}>다시 시도</Text>
          </Pressable>
        </View>
      );
    }

    if (errorState === 'data_missing' || !cardData) {
      return (
        <View style={styles.stateCard}>
          <Text style={styles.stateTitle}>표시할 시설 정보가 부족합니다.</Text>
          <Text style={styles.stateDescription}>
            필수 데이터가 누락되어 상세 화면을 렌더링할 수 없습니다.
          </Text>
          <Pressable onPress={fetchDetail} style={({ pressed }) => [styles.retryButton, pressed ? styles.buttonPressed : null]}>
            <Text style={styles.retryButtonText}>다시 시도</Text>
          </Pressable>
        </View>
      );
    }

    return (
      <FacilityDetailCard
        facility={cardData}
        saved={saved}
        saving={saving}
        saveError={saveError}
        onToggleSave={handleToggleSave}
        onPressCreateAlert={handlePressCreateAlert}
      />
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.contentContainer}>
        <View style={styles.topBar}>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [styles.backButton, pressed ? styles.buttonPressed : null]}
          >
            <Text style={styles.backButtonText}>이전</Text>
          </Pressable>
        </View>

        <View style={styles.headingWrap}>
          <Text style={styles.heading}>시설 상세</Text>
          <Text style={styles.subHeading}>시설 정보 확인 후 TO 알림을 설정할 수 있어요.</Text>
        </View>

        {renderStateBlock()}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 28,
    gap: 12,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  backButton: {
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  backButtonText: {
    color: '#334155',
    fontSize: 14,
    fontWeight: '600',
  },
  headingWrap: {
    gap: 6,
    marginBottom: 4,
  },
  heading: {
    color: '#0F172A',
    fontSize: 25,
    fontWeight: '800',
  },
  subHeading: {
    color: '#475569',
    fontSize: 14,
    lineHeight: 20,
  },
  stateCard: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 20,
    paddingVertical: 28,
  },
  stateTitle: {
    color: '#0F172A',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  stateDescription: {
    color: '#64748B',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 4,
    borderRadius: 12,
    backgroundColor: '#4F46E5',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  buttonPressed: {
    opacity: 0.85,
  },
});
