// ─── Word Entry ───────────────────────────────────────────────
export interface WordEntry {
  id: string;
  word: string;
  pos: string;
  cefr: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
  phonetic: string;
  meaning_vi: string;
  meaning_en: string;
  context_in_text: string;
  context_real_world: string;
  collocations: string[];
  synonyms: string[];
  antonyms: string[];
  word_family: string[];
  related_words: string[];
  example_from_text: string;
  example_real: string;
  tags: string[];
  source_ids: string[];
  date_added: string;
  notes: string;
  starred: boolean;
  srs_interval: number;
  srs_ease: number;
  srs_repetitions: number;
  srs_next_review: string;
  srs_last_result: 'know' | 'again' | null;
}

// ─── Source (reading text / PDF) ──────────────────────────────
export interface Source {
  id: string;
  title: string;
  topic: string;
  date_added: string;
  word_ids: string[];
  raw_text?: string;
}

// ─── SRS History ──────────────────────────────────────────────
export interface SRSRecord {
  id: string;
  word_id: string;
  reviewed_at: string;
  result: 'know' | 'again';
  interval_before: number;
  interval_after: number;
}

// ─── CEFR helpers ─────────────────────────────────────────────
export type CEFRLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';

export const CEFR_COLORS: Record<CEFRLevel, string> = {
  A1: '#22c55e',
  A2: '#16a34a',
  B1: '#f59e0b',
  B2: '#f97316',
  C1: '#ef4444',
  C2: '#dc2626',
};

// ─── App views ────────────────────────────────────────────────
export type AppView =
  | 'dashboard'
  | 'flashcards'
  | 'notebook'
  | 'practice'
  | 'reading'
  | 'chat'
  | 'settings';
