import { useCallback, useState } from 'react';
import {
  ActivityIndicator, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import { COLORS } from '@/lib/constants';
import { useThemeColors } from '@/lib/useThemeColors';

import { StyledText as Text } from '@/components/ui/StyledText';
const API_BASE = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:3001';

type PostType = 'review' | 'to_report' | 'question';

type TypeOption = {
  value: PostType;
  label: string;
};

const TYPE_OPTIONS: TypeOption[] = [
  { value: 'review', label: '후기' },
  { value: 'to_report', label: 'TO제보' },
  { value: 'question', label: '질문' },
];

export default function CommunityWriteScreen() {
  const [type, setType] = useState<PostType>('review');
  const [boardRegion, setBoardRegion] = useState('');
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const colors = useThemeColors();

  const submit = useCallback(async () => {
    const trimmedRegion = boardRegion.trim();
    const trimmedContent = content.trim();

    if (!trimmedRegion) {
      setError('지역을 입력해 주세요.');
      return;
    }

    if (!trimmedContent) {
      setError('내용을 입력해 주세요.');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const response = await fetch(`${API_BASE}/api/v1/community/posts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          board_region: trimmedRegion,
          type,
          content: trimmedContent,
        }),
      });

      if (!response.ok) {
        const message =
          response.status === 403
            ? '현재 커뮤니티 글쓰기가 비활성화되었습니다.'
            : '게시글 등록에 실패했습니다.';
        throw new Error(message);
      }

      router.back();
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('게시글 등록에 실패했습니다.');
      }
    } finally {
      setIsSubmitting(false);
    }
  }, [boardRegion, content, type]);

  return (
    <View style={[styles.container, { backgroundColor: colors.surfaceInset }]}>
      <Text style={[styles.title, { color: colors.text }]}>게시글 작성</Text>

      <Text style={styles.label}>유형</Text>
      <View style={styles.typeRow}>
        {TYPE_OPTIONS.map((option) => {
          const isActive = option.value === type;
          return (
            <TouchableOpacity
              key={option.value}
              style={[styles.typeButton, isActive ? styles.typeButtonActive : null]}
              onPress={() => setType(option.value)}
              disabled={isSubmitting}
              accessibilityRole="button"
              accessibilityState={{ selected: isActive }}
              accessibilityLabel={option.label}
            >
              <Text style={[styles.typeText, isActive ? styles.typeTextActive : null]}>
                {option.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <Text style={styles.label}>지역</Text>
      <TextInput
        value={boardRegion}
        onChangeText={setBoardRegion}
        editable={!isSubmitting}
        style={styles.input}
        placeholder="예: 서울시 강남구"
        placeholderTextColor={COLORS.textTertiary}
        accessibilityLabel="지역 입력"
      />

      <Text style={styles.label}>내용</Text>
      <TextInput
        style={styles.textarea}
        value={content}
        onChangeText={setContent}
        editable={!isSubmitting}
        placeholder="익명으로 자유롭게 글을 남겨 주세요"
        placeholderTextColor={COLORS.textTertiary}
        multiline
        textAlignVertical="top"
        accessibilityLabel="게시글 내용"
      />

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <TouchableOpacity
        style={[styles.submitButton, isSubmitting ? styles.submitDisabled : null]}
        onPress={submit}
        disabled={isSubmitting}
        accessibilityRole="button"
        accessibilityLabel="게시"
      >
        {isSubmitting ? (
          <ActivityIndicator size="small" color={COLORS.textInverse} />
        ) : (
          <Text style={styles.submitButtonText}>게시</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.surfaceInset,
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: 4,
    marginBottom: 16,
  },
  label: {
    marginBottom: 8,
    fontSize: 14,
    color: COLORS.text,
    fontWeight: '600',
  },
  typeRow: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 8,
  },
  typeButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  typeButtonActive: {
    borderColor: COLORS.brand500,
    backgroundColor: '#eef2ff',
  },
  typeText: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '600',
  },
  typeTextActive: {
    color: COLORS.brand600,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: COLORS.background,
    marginBottom: 16,
    color: COLORS.text,
  },
  textarea: {
    height: 220,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    backgroundColor: COLORS.background,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 15,
    lineHeight: 22,
    color: COLORS.text,
    marginBottom: 16,
  },
  submitButton: {
    marginTop: 8,
    backgroundColor: COLORS.brand600,
    borderRadius: 10,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    color: COLORS.textInverse,
    fontWeight: '700',
    fontSize: 16,
  },
  errorText: {
    color: COLORS.danger,
    marginBottom: 12,
  },
});
