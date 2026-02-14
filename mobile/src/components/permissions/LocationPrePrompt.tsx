import React from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { StyledText as Text } from '@/components/ui/StyledText';
import { COLORS } from '@/lib/constants';
import { useThemeColors } from '@/lib/useThemeColors';

interface LocationPrePromptProps {
  visible: boolean;
  onAllow: () => void;
  onSkip: () => void;
}

const pressedStyle: StyleProp<ViewStyle> = {
  opacity: 0.9,
};

export function LocationPrePrompt({ visible, onAllow, onSkip }: LocationPrePromptProps) {
  const colors = useThemeColors();

  if (!visible) {
    return null;
  }

  return (
    <Modal
      animationType="slide"
      transparent
      visible={visible}
      accessibilityViewIsModal
      onRequestClose={onSkip}
    >
      <View style={styles.container}>
        <View style={styles.overlay} />
        <View style={[styles.sheet, { backgroundColor: colors.background }]} accessibilityRole="dialog" accessibilityLabel="위치 권한 사전 안내">
          <Text style={styles.emoji} accessibilityRole="text" accessibilityLabel="위치 아이콘">
            📍
          </Text>
          <Text
            style={[styles.title, { color: colors.text }]}
            accessibilityRole="text"
            accessibilityLabel="내 주변 시설을 찾아볼까요?"
          >
            내 주변 시설을 찾아볼까요?
          </Text>
          <Text
            style={[styles.description, { color: colors.textSecondary }]}
            accessibilityRole="text"
            accessibilityLabel="위치 정보로 가까운 어린이집을 빠르게 검색할 수 있어요."
          >
            위치 정보로 가까운 어린이집을
            {'\n'}
            빠르게 검색할 수 있어요.
          </Text>

          <Pressable
            style={({ pressed }) => [styles.allowButton, pressed && styles.allowButtonPressed]}
            onPress={onAllow}
            accessibilityRole="button"
            accessibilityLabel="위치 허용하기"
          >
            <Text style={styles.allowButtonText}>위치 허용하기</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.skipButton, pressed && styles.skipButtonPressed]}
            onPress={onSkip}
            accessibilityRole="button"
            accessibilityLabel="직접 검색할게요"
          >
            <Text style={styles.skipButtonText}>직접 검색할게요</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: COLORS.overlay,
  },
  sheet: {
    backgroundColor: COLORS.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 32,
  },
  emoji: {
    fontSize: 44,
    textAlign: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 10,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  allowButton: {
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: COLORS.brand600,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  allowButtonPressed: pressedStyle,
  allowButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textInverse,
  },
  skipButton: {
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  skipButtonPressed: pressedStyle,
  skipButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
});
