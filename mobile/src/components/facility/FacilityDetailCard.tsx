import { Pressable, StyleSheet, View } from 'react-native';
import { StyledText as Text } from '@/components/ui/StyledText';
import { COLORS } from '../../lib/constants';
import { useThemeColors } from '../../lib/useThemeColors';

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

function DetailRow({ label, value, colors }: { label: string; value: string; colors: typeof COLORS }) {
  return (
    <View style={styles.row}>
      <Text style={[styles.rowLabel, { color: colors.textSecondary }]}>{label}</Text>
      <Text style={[styles.rowValue, { color: colors.text }]}>{value}</Text>
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
  const colors = useThemeColors();

  return (
    <View style={[styles.card, { backgroundColor: colors.background, borderColor: colors.border }]} accessibilityRole="summary">
      <View style={styles.header}>
        <View style={styles.titleWrap}>
          <Text style={[styles.title, { color: colors.text }]}>{facility.name}</Text>
          {facility.updatedAtLabel ? (
            <Text style={[styles.updatedAt, { color: colors.textSecondary }]}>{facility.updatedAtLabel}</Text>
          ) : null}
        </View>
        <Pressable
          onPress={onToggleSave}
          disabled={saving}
          accessibilityRole="button"
          accessibilityLabel={saving ? '처리 중' : saved ? '저장 취소' : '시설 저장'}
          accessibilityState={{ disabled: saving, selected: saved }}
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
        <DetailRow label="주소" value={facility.address ?? '주소 정보 없음'} colors={colors} />
        <DetailRow label="거리" value={facility.distanceLabel} colors={colors} />
        <DetailRow label="연락처" value={facility.phone ?? '연락처 정보 없음'} colors={colors} />
        {facility.typeLabel ? <DetailRow label="유형" value={facility.typeLabel} colors={colors} /> : null}
      </View>

      <Pressable
        onPress={onPressCreateAlert}
        accessibilityRole="button"
        accessibilityLabel="TO 알림 받기"
        style={({ pressed }) => [styles.ctaButton, pressed ? styles.buttonPressed : null]}
      >
        <Text style={styles.ctaButtonText}>TO 알림 받기</Text>
      </Pressable>

      {saveError ? (
        <Text style={styles.errorText} accessibilityRole="alert">
          {saveError}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.background,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
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
    color: COLORS.text,
    fontSize: 21,
    fontWeight: '800',
  },
  updatedAt: {
    color: COLORS.textSecondary,
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
    color: COLORS.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  rowValue: {
    flex: 1,
    color: COLORS.text,
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
    backgroundColor: COLORS.background,
    borderColor: COLORS.border,
  },
  saveButtonActive: {
    backgroundColor: COLORS.brand50,
    borderColor: COLORS.brand500,
  },
  saveButtonText: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '700',
  },
  saveButtonTextActive: {
    color: COLORS.brand600,
  },
  ctaButton: {
    backgroundColor: COLORS.brand600,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    paddingHorizontal: 16,
  },
  ctaButtonText: {
    color: COLORS.textInverse,
    fontSize: 15,
    fontWeight: '700',
  },
  errorText: {
    color: COLORS.danger,
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
