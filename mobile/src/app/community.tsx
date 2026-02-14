import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator, FlatList, RefreshControl, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import { COLORS } from '@/lib/constants';
import { useThemeColors } from '@/lib/useThemeColors';

import { StyledText as Text } from '@/components/ui/StyledText';
const API_BASE = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:3001';

interface Post {
  _id: string;
  type: string;
  board_region: string;
  content: string;
  score: number;
  created_at: string;
  anon_handle: string;
}

type CommunityResponse = {
  items?: Post[];
  posts?: Post[];
  total?: number;
};

const LABEL_BY_TYPE: Record<string, string> = {
  review: '후기',
  to_report: 'TO제보',
  question: '질문',
};

const LIMIT = 20;

const formatDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '-';
  }
  return date.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
};

const badgeStyleByType = (type: string) => {
  if (type === 'review') {
    return styles.badgeReview;
  }
  if (type === 'to_report') {
    return styles.badgeTo;
  }
  if (type === 'question') {
    return styles.badgeQuestion;
  }
  return styles.badgeDefault;
};

const toPostArray = (payload: unknown): Post[] => {
  if (!payload || typeof payload !== 'object') {
    return [];
  }

  const response = payload as CommunityResponse;
  if (Array.isArray(response.items)) {
    return response.items;
  }

  if (Array.isArray(response.posts)) {
    return response.posts;
  }

  return [];
};

export default function CommunityScreen() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [error, setError] = useState('');

  const fetchPosts = useCallback(
    async (nextOffset: number, shouldReset: boolean) => {
      try {
        setError('');

        if (shouldReset) {
          setIsLoading(true);
        } else {
          setIsLoadingMore(true);
        }

        const response = await fetch(
          `${API_BASE}/api/v1/community/posts?limit=${LIMIT}&offset=${nextOffset}`,
        );
        if (!response.ok) {
          throw new Error('게시글을 불러오지 못했습니다.');
        }

        const data = await response.json();
        const items = toPostArray(data);

        setPosts((previous) =>
          shouldReset ? items : [...previous, ...items.filter((next) => !previous.some((current) => current._id === next._id))],
        );
        setOffset(nextOffset + items.length);
        setHasMore(items.length === LIMIT);
      } catch {
        setError('게시글을 불러오지 못했습니다.');
      } finally {
        if (shouldReset) {
          setIsLoading(false);
          setIsRefreshing(false);
        }
        setIsLoadingMore(false);
      }
    },
    [],
  );

  useEffect(() => {
    void fetchPosts(0, true);
  }, [fetchPosts]);

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    setHasMore(true);
    setOffset(0);
    await fetchPosts(0, true);
  }, [fetchPosts]);

  const loadMore = useCallback(async () => {
    if (!hasMore || isLoading || isLoadingMore) {
      return;
    }
    await fetchPosts(offset, false);
  }, [fetchPosts, hasMore, isLoading, isLoadingMore, offset]);

  const filteredPosts = posts.filter((post) =>
    post.content.toLowerCase().includes(searchText.trim().toLowerCase()),
  );

  const colors = useThemeColors();

  const renderItem = ({ item }: { item: Post }) => (
    <View style={[styles.card, { backgroundColor: colors.background, borderColor: colors.border }]}>
      <View style={styles.rowBetween}>
        <View style={[styles.badge, badgeStyleByType(item.type)]}>
          <Text style={styles.badgeText}>{LABEL_BY_TYPE[item.type] ?? '게시글'}</Text>
        </View>
        <Text style={styles.scoreText}>점수 {item.score}</Text>
      </View>

      <Text style={styles.content} numberOfLines={2} ellipsizeMode="tail">
        {item.content.length > 100 ? `${item.content.slice(0, 100)}...` : item.content}
      </Text>

      <View style={styles.rowBetween}>
        <Text style={styles.metaText}>지역 · {item.board_region}</Text>
        <Text style={styles.metaText}>작성자 · {item.anon_handle}</Text>
      </View>
      <Text style={styles.metaText}>작성일 · {formatDate(item.created_at)}</Text>
    </View>
  );

  const renderEmpty = () => {
    if (isLoading) {
      return null;
    }

    return <Text style={styles.emptyText}>아직 게시글이 없습니다</Text>;
  };

  const renderFooter = () => {
    if (!isLoadingMore) {
      return null;
    }

    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={COLORS.brand500} />
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.surfaceInset }]}>
      <View style={[styles.header, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.text }]}>커뮤니티</Text>
        <TextInput
          style={styles.searchInput}
          value={searchText}
          onChangeText={setSearchText}
          placeholder="게시글 내용으로 검색"
          placeholderTextColor={COLORS.textTertiary}
          accessibilityLabel="게시글 검색"
        />
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <FlatList
        data={filteredPosts}
        renderItem={renderItem}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.listContent}
        onEndReached={loadMore}
        onEndReachedThreshold={0.3}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.brand500}
          />
        }
        ListEmptyComponent={renderEmpty}
        ListFooterComponent={renderFooter}
      />

      <TouchableOpacity
        style={styles.fab}
        activeOpacity={0.85}
        onPress={() => router.push('/community/write')}
        accessibilityRole="button"
        accessibilityLabel="글쓰기"
      >
        <Text style={styles.fabText}>글쓰기</Text>
      </TouchableOpacity>

      {isLoading ? (
        <View style={styles.centeredOverlay}>
          <ActivityIndicator size="large" color={COLORS.brand500} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.surfaceInset,
  },
  header: {
    padding: 16,
    backgroundColor: COLORS.background,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 12,
  },
  searchInput: {
    height: 42,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    paddingHorizontal: 12,
    fontSize: 14,
    color: COLORS.text,
  },
  listContent: {
    padding: 16,
    paddingBottom: 96,
  },
  card: {
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 1,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  badge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeReview: {
    backgroundColor: '#dbeafe',
  },
  badgeTo: {
    backgroundColor: '#fef3c7',
  },
  badgeQuestion: {
    backgroundColor: '#dcfce7',
  },
  badgeDefault: {
    backgroundColor: COLORS.border,
  },
  badgeText: {
    color: COLORS.text,
    fontWeight: '600',
    fontSize: 12,
  },
  scoreText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  content: {
    fontSize: 15,
    color: COLORS.text,
    lineHeight: 22,
    marginBottom: 8,
  },
  metaText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 2,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 40,
    color: COLORS.textTertiary,
    fontSize: 15,
  },
  footerLoader: {
    paddingVertical: 20,
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 24,
    width: 96,
    height: 52,
    borderRadius: 26,
    backgroundColor: COLORS.brand600,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: COLORS.brand600,
    shadowOpacity: 0.4,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
  },
  fabText: {
    color: COLORS.textInverse,
    fontWeight: '700',
    fontSize: 16,
  },
  centeredOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.72)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    color: COLORS.danger,
    marginHorizontal: 16,
    marginTop: 8,
    fontSize: 13,
  },
});
