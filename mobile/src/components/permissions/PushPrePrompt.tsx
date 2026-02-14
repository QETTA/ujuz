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

interface PushPrePromptProps {
  visible: boolean;
  onAllow: () => void;
  onSkip: () => void;
}

const pressedStyle: StyleProp<ViewStyle> = {
  opacity: 0.9,
};

export function PushPrePrompt({ visible, onAllow, onSkip }: PushPrePromptProps) {
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
        <View style={[styles.sheet, { backgroundColor: colors.background }]} accessibilityRole="dialog" accessibilityLabel="알림 권한 사전 안내">
          <Text style={styles.emoji} accessibilityRole="text" accessibilityLabel="알림 아이콘">
            🔔
          </Text>
          <Text style={[styles.title, { color: colors.text }]} accessibilityRole="text" accessibilityLabel="알림을 받아볼까요?">
            알림을 받아볼까요?
          </Text>
          <Text
            style={[styles.description, { color: colors.textSecondary }]}
            accessibilityRole="text"
            accessibilityLabel="TO 빈자리가 생기면 즉시 알려드려요. 중요한 알림만 보내드릴게요."
          >
            TO 빈자리가 생기면 즉시 알려드려요.
            {'\n'}
            중요한 알림만 보내드릴게요.
          </Text>

          <Pressable
            style={({ pressed }) => [styles.allowButton, pressed && styles.allowButtonPressed]}
            onPress={onAllow}
            accessibilityRole="button"
            accessibilityLabel="알림 허용하기"
          >
            <Text style={styles.allowButtonText}>알림 허용하기</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.skipButton, pressed && styles.skipButtonPressed]}
            onPress={onSkip}
            accessibilityRole="button"
            accessibilityLabel="나중에 할게요"
          >
            <Text style={styles.skipButtonText}>나중에 할게요</Text>
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
