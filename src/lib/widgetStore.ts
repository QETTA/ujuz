import { create } from 'zustand';

export type WidgetTab = 'chat' | 'admission' | 'to-alerts';

interface WidgetStore {
  isOpen: boolean;
  activeTab: WidgetTab;
  open: (tab?: WidgetTab) => void;
  close: () => void;
  setTab: (tab: WidgetTab) => void;
}

export const useWidgetStore = create<WidgetStore>((set) => ({
  isOpen: false,
  activeTab: 'chat',
  open: (tab) => set({ isOpen: true, activeTab: tab ?? 'chat' }),
  close: () => set({ isOpen: false }),
  setTab: (tab) => set({ activeTab: tab }),
}));
