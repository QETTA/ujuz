import { router } from 'expo-router';
import { useState } from 'react';
import { SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

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
    <SafeAreaView style={styles.container}>
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
          <Text style={styles.title}>{currentStep.title}</Text>
          <Text style={styles.description}>{currentStep.description}</Text>

          <TouchableOpacity
            style={[styles.primaryButton, isSubmitting ? styles.buttonDisabled : null]}
            activeOpacity={0.85}
            disabled={isSubmitting}
            onPress={() => void handlePrimaryPress()}
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
      >
        <Text style={styles.skipText}>건너뛰기</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
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
    color: '#475569',
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
    backgroundColor: '#2563eb',
  },
  progressSegmentInactive: {
    backgroundColor: '#e2e8f0',
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
    color: '#0f172a',
    marginBottom: 14,
  },
  description: {
    fontSize: 17,
    lineHeight: 25,
    color: '#334155',
    textAlign: 'center',
    marginBottom: 32,
  },
  primaryButton: {
    minWidth: 180,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#3B82F6',
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.65,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  skipArea: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  skipText: {
    color: '#111827',
    fontSize: 15,
    fontWeight: '600',
  },
});
