import { ComponentType, useCallback, useEffect, useState } from 'react';
import { Platform, ScrollView, TextInput, TouchableOpacity, View } from 'react-native';
import { StyledText as Text } from '@/components/ui/StyledText';
import MapView, { Marker, type Region, PROVIDER_GOOGLE } from '@/lib/react-native-maps';
import { getJson } from '@/lib/api';
import { COLORS } from '@/lib/constants';
import { EmptyNoResults, LoadingSkeleton, NetworkError } from '@/components/states';

type MapModule = {
  MapView: ComponentType<any>;
  Marker: ComponentType<any>;
  PROVIDER_GOOGLE?: string;
};

interface FacilityMapItem {
  id: string;
  name: string;
  type: string;
  address: string;
  lat: number;
  lng: number;
  grade?: string;
  score?: number;
}

type FilterType = 'public' | 'private' | 'home';

const FILTER_CHIPS: Array<{ label: string; value: FilterType | null }> = [
  { label: '전체', value: null },
  { label: '국공립', value: 'public' },
  { label: '민간', value: 'private' },
  { label: '가정', value: 'home' },
];

// Default: Seoul City Hall
const SEOUL_CENTER: Region = {
  latitude: 37.5665,
  longitude: 126.978,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
};

const GRADE_COLORS: Record<string, string> = {
  A: COLORS.gradeA,
  B: COLORS.gradeB,
  C: COLORS.gradeC,
  D: COLORS.gradeD,
  E: COLORS.gradeE,
  F: COLORS.gradeF,
};

export default function MapScreen() {
  const [facilities, setFacilities] = useState<FacilityMapItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<FilterType | null>(null);
  const [region, setRegion] = useState<Region>(SEOUL_CENTER);
  const [mapModule, setMapModule] = useState<MapModule | null>(null);

  const fetchNearby = useCallback(async (r: Region, options?: { type?: FilterType | null; q?: string }) => {
    setLoading(true);
    setError(false);

    try {
      const selectedType = options?.type ?? null;
      const q = (options?.q ?? '').trim();
      const queryParams = [
        `lat=${r.latitude}`,
        `lng=${r.longitude}`,
        'radius=3000',
        'limit=50',
        `q=${encodeURIComponent(q)}`,
      ];
      if (selectedType) {
        queryParams.push(`type=${encodeURIComponent(selectedType)}`);
      }

      const data = await getJson<{ facilities: FacilityMapItem[] }>(
        `/api/v1/facilities/nearby?${queryParams.join('&')}`,
      );
      setFacilities(data.facilities ?? []);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNearby(SEOUL_CENTER, { type: null, q: '' });
    setMapModule({
      MapView,
      Marker,
      PROVIDER_GOOGLE,
    });
  }, [fetchNearby]);

  if (!mapModule) {
    return <LoadingSkeleton title="지도 준비 중..." />;
  }

  const { MapView: NativeMapView, Marker: NativeMarker, PROVIDER_GOOGLE: NativeProviderGoogle } = mapModule;

  const handleRegionChangeComplete = useCallback((r: Region) => {
    setRegion(r);
    fetchNearby(r, { type: filterType, q: searchQuery });
  }, [fetchNearby, filterType, searchQuery]);

  const handleSearchSubmit = useCallback(() => {
    fetchNearby(region, { type: filterType, q: searchQuery });
  }, [fetchNearby, filterType, region, searchQuery]);

  const handleFilterPress = useCallback((nextFilter: FilterType | null) => {
    setFilterType(nextFilter);
    fetchNearby(region, { type: nextFilter, q: searchQuery });
  }, [fetchNearby, region, searchQuery]);

  return (
    <View className="flex-1">
      <NativeMapView
        className="flex-1"
        provider={Platform.OS === 'android' ? NativeProviderGoogle : undefined}
        initialRegion={SEOUL_CENTER}
        onRegionChangeComplete={handleRegionChangeComplete}
        showsUserLocation
        showsMyLocationButton
      >
        {facilities.map((f) => (
          <NativeMarker
            key={f.id}
            coordinate={{ latitude: f.lat, longitude: f.lng }}
            title={f.name}
            description={`${f.type} · ${f.grade ?? '-'}등급`}
            pinColor={f.grade ? GRADE_COLORS[f.grade] ?? COLORS.gradeDefault : COLORS.gradeDefault}
          />
        ))}
      </NativeMapView>

      <View className="absolute left-4 right-4 top-12 z-10">
        <View className="rounded-2xl border border-border-subtle dark:border-dark-border-subtle bg-surface dark:bg-dark-surface px-3 py-3 shadow-sm">
          <View className="flex-row items-center rounded-xl border border-border-subtle dark:border-dark-border-subtle bg-surface-elevated dark:bg-dark-surface-elevated px-3">
            <TextInput
              className="h-11 flex-1 text-sm text-text-primary dark:text-dark-text-primary"
              placeholder="시설명을 검색해 보세요"
              placeholderTextColor={COLORS.textTertiary}
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={handleSearchSubmit}
              returnKeyType="search"
              accessibilityLabel="시설명 검색"
            />
            <TouchableOpacity
              onPress={handleSearchSubmit}
              activeOpacity={0.8}
              className="py-2 pl-3"
              accessibilityRole="button"
              accessibilityLabel="검색"
            >
              <Text className="text-sm font-semibold text-brand-500">검색</Text>
            </TouchableOpacity>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-3">
            <View className="flex-row gap-2">
              {FILTER_CHIPS.map((chip) => {
                const isActive = chip.value === filterType;
                return (
                  <TouchableOpacity
                    key={chip.label}
                    onPress={() => handleFilterPress(chip.value)}
                    activeOpacity={0.8}
                    accessibilityRole="button"
                    accessibilityLabel={`${chip.label} 필터`}
                    accessibilityState={{ selected: isActive }}
                    className={`rounded-full border px-4 py-2 ${isActive ? 'border-brand-500 bg-brand-500' : 'border-border dark:border-dark-border bg-surface dark:bg-dark-surface'}`}
                  >
                    <Text className={`text-sm font-medium ${isActive ? 'text-text-inverse' : 'text-text-primary dark:text-dark-text-primary'}`}>
                      {chip.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>
        </View>
      </View>

      {loading && (
        <LoadingSkeleton title="주변 시설 검색 중..." className="absolute inset-0 bg-white/70 dark:bg-dark-surface/70" />
      )}
      {!loading && error && (
        <NetworkError
          className="absolute inset-0 bg-surface dark:bg-dark-surface"
          primaryCta={{ label: '다시 시도', onPress: () => fetchNearby(region, { type: filterType, q: searchQuery }) }}
        />
      )}
      {!loading && !error && facilities.length === 0 && (
        <EmptyNoResults
          className="absolute inset-0 bg-surface dark:bg-dark-surface"
          title="주변에 시설이 없어요"
          description="다른 지역을 검색해 보세요."
        />
      )}
    </View>
  );
}
