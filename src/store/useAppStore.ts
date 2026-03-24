import { create } from 'zustand';
import type { AppView, WordEntry, Source } from '../types';

interface AppState {
  // Navigation
  view: AppView;
  setView: (view: AppView) => void;

  // Authentication
  user: any | null;
  setUser: (user: any | null) => void;

  // Extracted words preview (before saving)
  previewWords: WordEntry[];
  setPreviewWords: (words: WordEntry[]) => void;

  // Current source being processed
  currentSource: Source | null;
  setCurrentSource: (source: Source | null) => void;

  // Word detail view
  selectedWordId: string | null;
  setSelectedWordId: (id: string | null) => void;

  // Refresh triggers
  refreshTrigger: number;
  triggerRefresh: () => void;

  // Streak
  streak: number;
  setStreak: (s: number) => void;
}

export const useAppStore = create<AppState>((set) => ({
  view: 'dashboard',
  setView: (view) => set({ view }),

  user: null,
  setUser: (user) => set({ user }),

  previewWords: [],
  setPreviewWords: (words) => set({ previewWords: words }),

  currentSource: null,
  setCurrentSource: (source) => set({ currentSource: source }),

  selectedWordId: null,
  setSelectedWordId: (id) => set({ selectedWordId: id }),

  refreshTrigger: 0,
  triggerRefresh: () => set((state) => ({ refreshTrigger: state.refreshTrigger + 1 })),

  streak: parseInt(localStorage.getItem('vocab_streak') || '0', 10),
  setStreak: (s) => {
    localStorage.setItem('vocab_streak', String(s));
    set({ streak: s });
  },
}));
