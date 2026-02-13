import { useState, useEffect, useCallback } from 'react';
import { View, Text, ActivityIndicator, Alert, Platform } from 'react-native';
import MapView, { Marker, Region, PROVIDER_GOOGLE } from 'react-native-maps';
import { getJson } from '@/lib/api';

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

// Default: Seoul City Hall
const SEOUL_CENTER: Region = {
  latitude: 37.5665,
  longitude: 126.978,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
};

const GRADE_COLORS: Record<string, string> = {
  A: '#22C55E',
  B: '#84CC16',
  C: '#EAB308',
  D: '#F97316',
  E: '#EF4444',
  F: '#991B1B',
};

export default function MapScreen() {
  const [facilities, setFacilities] = useState<FacilityMapItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [region, setRegion] = useState<Region>(SEOUL_CENTER);

  const fetchNearby = useCallback(async (r: Region) => {
    try {
      const data = await getJson<{ items: FacilityMapItem[] }>(
        `/api/v1/facilities/nearby?lat=${r.latitude}&lng=${r.longitude}&radius=3000&limit=50`,
      );
      setFacilities(data.items ?? []);
    } catch (err) {
      console.error('Failed to fetch facilities:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNearby(region);
  }, []);

  const handleRegionChangeComplete = useCallback((r: Region) => {
    setRegion(r);
    fetchNearby(r);
  }, [fetchNearby]);

  return (
    <View className="flex-1">
      <MapView
        className="flex-1"
        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
        initialRegion={SEOUL_CENTER}
        onRegionChangeComplete={handleRegionChangeComplete}
        showsUserLocation
        showsMyLocationButton
      >
        {facilities.map((f) => (
          <Marker
            key={f.id}
            coordinate={{ latitude: f.lat, longitude: f.lng }}
            title={f.name}
            description={`${f.type} · ${f.grade ?? '-'}등급`}
            pinColor={f.grade ? GRADE_COLORS[f.grade] ?? '#6B7280' : '#6B7280'}
          />
        ))}
      </MapView>

      {loading && (
        <View className="absolute inset-0 items-center justify-center bg-black/20">
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text className="mt-2 text-white font-medium">주변 시설 검색 중...</Text>
        </View>
      )}
    </View>
  );
}
