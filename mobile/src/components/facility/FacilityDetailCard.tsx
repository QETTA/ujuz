import { Pressable, StyleSheet, Text, View } from 'react-native';

export interface FacilityDetailCardData {
  name: string;
  address?: string;
  distanceLabel: string;
  phone?: string;
  typeLabel?: string;
  updatedAtLabel?: string;
}

interface FacilityDetailCardProps {
  facility: FacilityDetailCardData;
  saved: boolean;
  saving: boolean;
  saveError?: string | null;
  onToggleSave: () => void;
  onPressCreateAlert: () => void;
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

export function FacilityDetailCard({
  facility,
  saved,
  saving,
  saveError,
  onToggleSave,
  onPressCreateAlert,
}: FacilityDetailCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.titleWrap}>
          <Text style={styles.title}>{facility.name}</Text>
          {facility.updatedAtLabel ? (
            <Text style={styles.updatedAt}>{facility.updatedAtLabel}</Text>
          ) : null}
        </View>
        <Pressable
          onPress={onToggleSave}
          disabled={saving}
          style={({ pressed }) => [
            styles.saveButton,
            saved ? styles.saveButtonActive : styles.saveButtonIdle,
            pressed ? styles.buttonPressed : null,
            saving ? styles.buttonDisabled : null,
          ]}
        >
          <Text style={[styles.saveButtonText, saved ? styles.saveButtonTextActive : null]}>
            {saving ? '처리 중...' : saved ? '저장됨' : '저장'}
          </Text>
        </Pressable>
      </View>

      <View style={styles.rowsWrap}>
        <DetailRow label="주소" value={facility.address ?? '주소 정보 없음'} />
        <DetailRow label="거리" value={facility.distanceLabel} />
        <DetailRow label="연락처" value={facility.phone ?? '연락처 정보 없음'} />
        {facility.typeLabel ? <DetailRow label="유형" value={facility.typeLabel} /> : null}
      </View>

      <Pressable
        onPress={onPressCreateAlert}
        style={({ pressed }) => [styles.ctaButton, pressed ? styles.buttonPressed : null]}
      >
        <Text style={styles.ctaButtonText}>TO 알림 받기</Text>
      </Pressable>

      {saveError ? <Text style={styles.errorText}>{saveError}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
    gap: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  titleWrap: {
    flex: 1,
    gap: 6,
  },
  title: {
    color: '#0F172A',
    fontSize: 21,
    fontWeight: '800',
  },
  updatedAt: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '500',
  },
  rowsWrap: {
    gap: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  rowLabel: {
    width: 56,
    color: '#64748B',
    fontSize: 14,
    fontWeight: '600',
  },
  rowValue: {
    flex: 1,
    color: '#0F172A',
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
  },
  saveButton: {
    borderRadius: 999,
    borderWidth: 1,
    minWidth: 72,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  saveButtonIdle: {
    backgroundColor: '#FFFFFF',
    borderColor: '#CBD5E1',
  },
  saveButtonActive: {
    backgroundColor: '#EEF2FF',
    borderColor: '#6366F1',
  },
  saveButtonText: {
    color: '#334155',
    fontSize: 13,
    fontWeight: '700',
  },
  saveButtonTextActive: {
    color: '#4338CA',
  },
  ctaButton: {
    backgroundColor: '#4F46E5',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    paddingHorizontal: 16,
  },
  ctaButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  errorText: {
    color: '#B91C1C',
    fontSize: 13,
    fontWeight: '500',
  },
  buttonPressed: {
    opacity: 0.85,
  },
  buttonDisabled: {
    opacity: 0.55,
  },
});
