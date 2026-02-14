import { router } from 'expo-router';
import { useState } from 'react';
import { SafeAreaView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { StyledText as Text } from '@/components/ui/StyledText';

import { COLORS } from '@/lib/constants';
import { useThemeColors } from '@/lib/useThemeColors';
import { markOnboardingComplete } from '@/lib/storage/onboarding';

type OnboardingStep = {
  title: string;
  icon: string;
  description: string;
};

const STEPS: OnboardingStep[] = [
  {
    title: 'TO알림소개',
    icon: '🔔',
    description: '중요한 TO 공지와 일정 변동을 실시간으로 받아보세요.',
  },
  {
    title: '지도탐색',
    icon: '🗺️',
    description: '내 주변 시설과 지역별 정보를 지도에서 빠르게 확인하세요.',
  },
  {
    title: '상담리포트',
    icon: '📊',
    description: 'AI 상담 결과를 리포트로 정리해 다음 액션을 명확히 하세요.',
  },
];

export default function OnboardingScreen() {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const colors = useThemeColors();

  const currentStep = STEPS[currentStepIndex];
  const isLastStep = currentStepIndex === STEPS.length - 1;

  const completeAndGoTabs = async () => {
    setIsSubmitting(true);
    try {
      await markOnboardingComplete();
    } finally {
      router.replace('/(tabs)');
    }
  };

  const handlePrimaryPress = async () => {
    if (!isLastStep) {
      setCurrentStepIndex((previous) => previous + 1);
      return;
    }

    await completeAndGoTabs();
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        <Text style={styles.progressLabel}>
          Step {currentStepIndex + 1} / {STEPS.length}
        </Text>
        <View style={styles.progressTrack}>
          {STEPS.map((_, index) => (
            <View
              key={`step-${index + 1}`}
              style={[
                styles.progressSegment,
                index <= currentStepIndex ? styles.progressSegmentActive : styles.progressSegmentInactive,
              ]}
            />
          ))}
        </View>

        <View style={styles.stepCard}>
          <Text style={styles.icon}>{currentStep.icon}</Text>
          <Text style={[styles.title, { color: colors.text }]}>{currentStep.title}</Text>
          <Text style={[styles.description, { color: colors.textSecondary }]}>{currentStep.description}</Text>

          <TouchableOpacity
            style={[styles.primaryButton, isSubmitting ? styles.buttonDisabled : null]}
            activeOpacity={0.85}
            disabled={isSubmitting}
            onPress={() => void handlePrimaryPress()}
            accessibilityRole="button"
            accessibilityLabel={isLastStep ? '시작하기' : '다음'}
          >
            <Text style={styles.primaryButtonText}>{isLastStep ? '시작하기' : '다음'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <TouchableOpacity
        style={styles.skipArea}
        activeOpacity={0.7}
        disabled={isSubmitting}
        onPress={() => void completeAndGoTabs()}
        accessibilityRole="button"
        accessibilityLabel="건너뛰기"
      >
        <Text style={styles.skipText}>건너뛰기</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 16,
  },
  content: {
    flex: 1,
  },
  progressLabel: {
    marginTop: 12,
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  progressTrack: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 28,
  },
  progressSegment: {
    height: 6,
    borderRadius: 999,
    flex: 1,
    marginHorizontal: 4,
  },
  progressSegmentActive: {
    backgroundColor: COLORS.brand500,
  },
  progressSegmentInactive: {
    backgroundColor: COLORS.border,
  },
  stepCard: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 40,
  },
  icon: {
    fontSize: 68,
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 14,
  },
  description: {
    fontSize: 17,
    lineHeight: 25,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 32,
  },
  primaryButton: {
    minWidth: 180,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: COLORS.brand500,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.65,
  },
  primaryButtonText: {
    color: COLORS.textInverse,
    fontSize: 16,
    fontWeight: '700',
  },
  skipArea: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  skipText: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '600',
  },
});
