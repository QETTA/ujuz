/**
 * UJUz Web - Zustand Store
 * Admission / Chat / TO Alert state management
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type {
  AdmissionScoreResultV2, Place, BotMessage, ConversationSummary,
  ToAlertSubscription, ToAlertHistory,
  RouteId, SheetState, RecommendationResponse, StrategyFacility, RecommendationInput,
  ChildProfile,
} from './types';
import { apiFetch, generateUUID } from './api';
import { getLocalStorage, getSessionStorage } from './platform/storage';

// ── Admission Store ─────────────────────────────────────

interface AdmissionStore {
  result: AdmissionScoreResultV2 | null;
  facility: Place | null;
  loading: boolean;
  error: string | null;
  setResult: (result: AdmissionScoreResultV2, facility: Place) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clear: () => void;
}

export const useAdmissionStore = create<AdmissionStore>()(
  persist(
    (set) => ({
      result: null,
      facility: null,
      loading: false,
      error: null,
      setResult: (result, facility) => set({ result, facility, loading: false, error: null }),
      setLoading: (loading) => set({ loading }),
      setError: (error) => set({ error, loading: false }),
      clear: () => set({ result: null, facility: null, loading: false, error: null }),
    }),
    {
      name: 'ujuz-admission',
      storage: createJSONStorage(() => getSessionStorage()),
      partialize: (state) => ({ result: state.result, facility: state.facility }),
    },
  ),
);

// ── Chat Store ──────────────────────────────────────────

interface ChatStore {
  messages: BotMessage[];
  conversationId: string | null;
  conversations: ConversationSummary[];
  loading: boolean;
  suggestions: string[];
  error: string | null;
  sendMessage: (text: string, context?: Record<string, unknown>) => Promise<void>;
  loadConversations: () => Promise<void>;
  loadConversation: (id: string) => Promise<void>;
  deleteConversation: (id: string) => Promise<void>;
  clear: () => void;
}

export const useChatStore = create<ChatStore>((set, get) => ({
  messages: [],
  conversationId: null,
  conversations: [],
  loading: false,
  suggestions: [],
  error: null,

  sendMessage: async (text, context) => {
    const userMsg: BotMessage = {
      id: generateUUID(),
      role: 'user',
      content: text,
      created_at: new Date().toISOString(),
    };
    set((s) => ({ messages: [...s.messages, userMsg], loading: true, error: null }));

    try {
      const res = await apiFetch<{
        conversation_id: string;
        message: BotMessage;
        suggestions: string[];
      }>('/api/bot/chat', {
        method: 'POST',
        json: {
          message: text,
          conversation_id: get().conversationId,
          context,
        },
      });

      const wasNewConversation = !get().conversationId;
      set((s) => ({
        messages: [...s.messages, res.message],
        conversationId: res.conversation_id,
        suggestions: res.suggestions,
        loading: false,
      }));

      // Only refresh conversation list when a new conversation was created
      if (wasNewConversation) {
        get().loadConversations();
      }
    } catch (err) {
      const fallback: BotMessage = {
        id: generateUUID(),
        role: 'assistant',
        content: '죄송합니다. 일시적으로 응답을 가져올 수 없습니다. 잠시 후 다시 시도해 주세요.',
        created_at: new Date().toISOString(),
      };
      set((s) => ({
        messages: [...s.messages, fallback],
        loading: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      }));
    }
  },

  loadConversations: async () => {
    try {
      const data = await apiFetch<{ conversations: ConversationSummary[] }>('/api/bot/conversations');
      set({ conversations: data.conversations });
    } catch {
      // Non-fatal
    }
  },

  loadConversation: async (id) => {
    try {
      const data = await apiFetch<{
        id: string;
        messages: BotMessage[];
      }>(`/api/bot/conversations/${id}`);
      set({
        conversationId: data.id,
        messages: data.messages,
        suggestions: [],
      });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to load conversation' });
    }
  },

  deleteConversation: async (id) => {
    try {
      await apiFetch(`/api/bot/conversations/${id}`, { method: 'DELETE' });
      set((s) => ({
        conversations: s.conversations.filter((c) => c.id !== id),
        ...(s.conversationId === id
          ? { conversationId: null, messages: [], suggestions: [] }
          : {}),
      }));
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to delete conversation' });
    }
  },

  clear: () => set({ messages: [], conversationId: null, loading: false, suggestions: [], error: null }),
}));

// ── TO Alert Store ──────────────────────────────────────

interface ToAlertStore {
  subscriptions: ToAlertSubscription[];
  history: ToAlertHistory[];
  loading: boolean;
  error: string | null;
  unreadCount: number;
  pollingRef: ReturnType<typeof setInterval> | null;
  lastPolledAt: string | null;
  load: () => Promise<void>;
  subscribe: (facilityId: string, facilityName: string, targetClasses: string[]) => Promise<void>;
  unsubscribe: (facilityId: string) => Promise<void>;
  loadHistory: () => Promise<void>;
  pollUnread: () => Promise<void>;
  startPolling: () => void;
  stopPolling: () => void;
  markAsRead: (ids: string[]) => Promise<void>;
}

export const useToAlertStore = create<ToAlertStore>((set, get) => ({
  subscriptions: [],
  history: [],
  loading: false,
  error: null,
  unreadCount: 0,
  pollingRef: null,
  lastPolledAt: null,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const data = await apiFetch<{ subscriptions: ToAlertSubscription[] }>('/api/to-alerts');
      set({ subscriptions: data.subscriptions ?? [], loading: false });
    } catch (err) {
      set({ loading: false, error: err instanceof Error ? err.message : 'Failed to load' });
    }
  },

  subscribe: async (facilityId, facilityName, targetClasses) => {
    const prev = get().subscriptions;
    // Optimistic update
    const optimistic: ToAlertSubscription = {
      id: `temp_${facilityId}`,
      facility_id: facilityId,
      facility_name: facilityName,
      target_classes: targetClasses,
      is_active: true,
      created_at: new Date().toISOString(),
    };
    set((s) => ({
      subscriptions: [...s.subscriptions.filter((sub) => sub.facility_id !== facilityId), optimistic],
      error: null,
    }));
    try {
      const result = await apiFetch<ToAlertSubscription>('/api/to-alerts', {
        method: 'POST',
        json: { facility_id: facilityId, facility_name: facilityName, target_classes: targetClasses },
      });
      // Replace optimistic with real server data
      set((s) => ({
        subscriptions: s.subscriptions.map((sub) => sub.facility_id === facilityId ? result : sub),
      }));
    } catch (err) {
      // Rollback optimistic update
      set({ subscriptions: prev, error: err instanceof Error ? err.message : '구독에 실패했습니다' });
    }
  },

  unsubscribe: async (facilityId) => {
    try {
      await apiFetch(`/api/to-alerts?facility_id=${encodeURIComponent(facilityId)}`, { method: 'DELETE' });
      set((s) => ({ subscriptions: s.subscriptions.filter((sub) => sub.facility_id !== facilityId) }));
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Unsubscribe failed' });
    }
  },

  loadHistory: async () => {
    try {
      const data = await apiFetch<{ alerts: ToAlertHistory[]; total: number; unread_count: number }>('/api/to-alerts/history');
      set({ history: data.alerts ?? [], unreadCount: data.unread_count ?? 0 });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to load history' });
    }
  },

  pollUnread: async () => {
    try {
      const since = get().lastPolledAt;
      const qs = since ? `?since=${encodeURIComponent(since)}` : '';
      const data = await apiFetch<{ alerts: ToAlertHistory[]; unread_count: number }>(`/api/to-alerts/unread${qs}`);
      set({
        unreadCount: data.unread_count,
        lastPolledAt: new Date().toISOString(),
      });
      // Merge new alerts into history
      if (data.alerts.length > 0) {
        set((s) => {
          const existingIds = new Set(s.history.map((h) => h.id));
          const newAlerts = data.alerts.filter((a) => !existingIds.has(a.id));
          return {
            history: [...newAlerts, ...s.history],
          };
        });
      }
    } catch {
      // Non-fatal: polling failure should not break UX
    }
  },

  startPolling: () => {
    const existing = get().pollingRef;
    if (existing) return;
    // Initial poll
    get().pollUnread();
    const ref = setInterval(() => get().pollUnread(), 30_000);
    set({ pollingRef: ref });
  },

  stopPolling: () => {
    const ref = get().pollingRef;
    if (ref) {
      clearInterval(ref);
      set({ pollingRef: null });
    }
  },

  markAsRead: async (ids) => {
    try {
      await apiFetch('/api/to-alerts/read', {
        method: 'PATCH',
        json: { alert_ids: ids },
      });
      set((s) => ({
        history: s.history.map((h) => ids.includes(h.id) ? { ...h, is_read: true } : h),
        unreadCount: Math.max(0, s.unreadCount - ids.length),
      }));
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to mark as read' });
    }
  },
}));

// ── Strategy Store ──────────────────────────────────────

interface StrategyStore {
  // Sheet
  sheet: SheetState;
  setSheet: (s: SheetState) => void;

  // User input
  userContext: RecommendationInput['user_context'] | null;
  setUserContext: (ctx: RecommendationInput['user_context']) => void;

  // Recommendation
  recommendation: RecommendationResponse | null;
  facilities: StrategyFacility[];
  loading: boolean;
  error: string | null;
  analyze: (input: RecommendationInput) => Promise<void>;

  // Map ↔ Widget sync
  activeRoute: RouteId;
  setActiveRoute: (r: RouteId) => void;
  highlightedFacilityId: string | null;
  setHighlightedFacility: (id: string | null) => void;
  pinnedFacilityIds: string[];
  setPinnedFacilityIds: (ids: string[]) => void;

  // UI
  showProbabilities: boolean;
  toggleProbabilities: () => void;

  clear: () => void;
}

export const useStrategyStore = create<StrategyStore>()(
  persist(
    (set, get) => ({
      sheet: 'MID',
      setSheet: (sheet) => set({ sheet }),

      userContext: null,
      setUserContext: (userContext) => set({ userContext }),

      recommendation: null,
      facilities: [],
      loading: false,
      error: null,

      analyze: async (input) => {
        set({ loading: true, error: null });
        try {
          const result = await apiFetch<RecommendationResponse>('/api/v1/recommendations', {
            method: 'POST',
            json: input,
          });

          // Engine returns enriched facilities directly — no second fetch needed
          const activeRoute = get().activeRoute;
          const route = result.widget.routes.find((r) => r.route_id === activeRoute);

          set({
            recommendation: result,
            facilities: result.facilities,
            loading: false,
            sheet: 'MID',
            pinnedFacilityIds: route?.facility_ids ?? [],
          });
        } catch (err) {
          set({
            loading: false,
            error: err instanceof Error ? err.message : '분석에 실패했습니다',
          });
        }
      },

      activeRoute: 'public',
      setActiveRoute: (r) => {
        const rec = get().recommendation;
        const route = rec?.widget.routes.find((rt) => rt.route_id === r);
        set({
          activeRoute: r,
          pinnedFacilityIds: route?.facility_ids ?? [],
        });
      },

      highlightedFacilityId: null,
      setHighlightedFacility: (id) => set({ highlightedFacilityId: id, sheet: id ? 'MID' : get().sheet }),

      pinnedFacilityIds: [],
      setPinnedFacilityIds: (ids) => set({ pinnedFacilityIds: ids }),

      showProbabilities: false,
      toggleProbabilities: () => set((s) => ({ showProbabilities: !s.showProbabilities })),

      clear: () => set({
        sheet: 'MID',
        userContext: null,
        recommendation: null,
        facilities: [],
        loading: false,
        error: null,
        activeRoute: 'public',
        highlightedFacilityId: null,
        pinnedFacilityIds: [],
        showProbabilities: false,
      }),
    }),
    {
      name: 'ujuz-strategy',
      storage: createJSONStorage(() => getSessionStorage()),
      partialize: (state) => ({
        userContext: state.userContext,
        recommendation: state.recommendation,
        facilities: state.facilities,
        activeRoute: state.activeRoute,
      }),
    },
  ),
);

// ── Home Store ──────────────────────────────────────────

type HeroState = 'ONBOARDING' | 'TO_URGENT' | 'NEW_INSIGHT' | 'STABLE';

interface HomeStore {
  heroState: HeroState;
  unreadAlerts: number;
  followedFacilities: number;
  loading: boolean;
  load: () => Promise<void>;
}

export const useHomeStore = create<HomeStore>((set) => ({
  heroState: 'ONBOARDING',
  unreadAlerts: 0,
  followedFacilities: 0,
  loading: false,

  load: async () => {
    set({ loading: true });
    try {
      const data = await apiFetch<{
        heroState: HeroState;
        unreadAlerts: number;
        followedFacilities: number;
      }>('/api/home');
      set({
        heroState: data.heroState,
        unreadAlerts: data.unreadAlerts,
        followedFacilities: data.followedFacilities,
        loading: false,
      });
    } catch {
      set({ loading: false });
    }
  },
}));

// ── Onboarding Store ────────────────────────────────────

interface OnboardingStore {
  step: number;
  child: Partial<ChildProfile> | null;
  consentGiven: boolean;
  selectedFacilities: { id: string; name: string }[];
  setStep: (step: number) => void;
  setChild: (child: Partial<ChildProfile>) => void;
  setConsentGiven: (given: boolean) => void;
  addFacility: (facility: { id: string; name: string }) => void;
  removeFacility: (id: string) => void;
  reset: () => void;
}

export const useOnboardingStore = create<OnboardingStore>((set) => ({
  step: 1,
  child: null,
  consentGiven: false,
  selectedFacilities: [],
  setStep: (step) => set({ step }),
  setChild: (child) => set({ child }),
  setConsentGiven: (consentGiven) => set({ consentGiven }),
  addFacility: (facility) => set((s) => ({
    selectedFacilities: s.selectedFacilities.some((f) => f.id === facility.id)
      ? s.selectedFacilities
      : [...s.selectedFacilities, facility],
  })),
  removeFacility: (id) => set((s) => ({
    selectedFacilities: s.selectedFacilities.filter((f) => f.id !== id),
  })),
  reset: () => set({ step: 1, child: null, consentGiven: false, selectedFacilities: [] }),
}));

// ── Facility Browse Store ───────────────────────────────

interface FacilityBrowseStore {
  query: string;
  filters: { type?: string; sido?: string; sigungu?: string };
  sort: 'distance' | 'grade' | 'probability';
  setQuery: (q: string) => void;
  setFilter: (key: string, value: string | undefined) => void;
  setSort: (s: 'distance' | 'grade' | 'probability') => void;
  reset: () => void;
}

export const useFacilityBrowseStore = create<FacilityBrowseStore>((set) => ({
  query: '',
  filters: {},
  sort: 'distance',
  setQuery: (query) => set({ query }),
  setFilter: (key, value) => set((s) => ({
    filters: { ...s.filters, [key]: value },
  })),
  setSort: (sort) => set({ sort }),
  reset: () => set({ query: '', filters: {}, sort: 'distance' }),
}));

// ── Theme Store ─────────────────────────────────────────

type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeStore {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
}

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set) => ({
      mode: 'system',
      setMode: (mode) => set({ mode }),
    }),
    {
      name: 'ujuz-theme-store',
      storage: createJSONStorage(() => getLocalStorage()),
    },
  ),
);
