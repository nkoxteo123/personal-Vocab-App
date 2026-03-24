# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

VocabAI is an AI-powered English vocabulary learning app. Users upload PDFs, AI extracts vocabulary, and they learn via spaced repetition flashcards, quizzes, and chat. Fully client-side — no backend, data stored in IndexedDB.

**Stack:** React 19, TypeScript (strict), Vite 8, Tailwind CSS 4, Zustand, Dexie (IndexedDB), PDF.js, Recharts, Lucide React icons.

## Commands

```bash
npm run dev        # Vite dev server at localhost:5173
npm run build      # tsc -b && vite build → outputs to dist/
npm run lint       # ESLint on all files
npm run preview    # Serve production build locally
npx tsc --noEmit   # Type-check without emitting
```

No test framework is configured.

## Architecture

### Data Flow

```
Pages (UI) → Zustand Store (state) → Services (logic) → Dexie/IndexedDB (persistence)
                                    → External AI APIs (Gemini/DeepSeek)
```

### Key Directories

- `src/pages/` — Full-screen views: Dashboard, Flashcards, Notebook, Practice, Reading, Chat, Settings
- `src/components/shared/` — Reusable components: PDFUploader, AIStatusBar, CEFRBadge
- `src/services/` — Business logic, separated by concern:
  - `storage.ts` — Dexie database schema and CRUD for words, sources, SRS history
  - `gemini.ts` — AI API integration (Gemini + DeepSeek), handles retries with exponential backoff, event-based status system
  - `pdfExtract.ts` — PDF.js text extraction with layout-aware paragraph detection
  - `srs.ts` — SM-2 spaced repetition algorithm
- `src/store/useAppStore.ts` — Zustand global state (navigation, preview words, refresh triggers, streak)
- `src/types/index.ts` — All TypeScript interfaces and constants (WordEntry has 28 fields)

### Database (Dexie/IndexedDB)

Three tables: `words` (vocabulary entries with SRS fields), `sources` (PDF/text documents), `srsHistory` (review records). Schema defined in `src/services/storage.ts`.

### AI Integration

Two providers supported via `src/services/gemini.ts`: Google Gemini (default: gemini-2.0-flash-lite) and DeepSeek. API keys and model selection stored in localStorage, configured in Settings page. Functions: `extractVocabulary`, `extractSingleWord`, `explainWord`, `gradeTranslation`, `generateQuiz`, `chatWithAI`.

### Navigation

Single-page app using Zustand `view` state (not React Router routes). The `AppView` type controls which page renders. Sidebar in `App.tsx` handles navigation.

## Design System

Defined in `design-system/vocabai/MASTER.md`. Page-specific overrides go in `design-system/pages/[page-name].md`.

**Style:** Claymorphism — soft 3D, playful, educational. No dark mode.

**Colors:** Primary `#4F46E5` (indigo), CTA `#22C55E` (green), Background `#EEF2FF`, Text `#312E81`. CSS variables defined in `src/index.css`.

**Fonts:** Baloo 2 (headings), Comic Neue (body). Loaded via Google Fonts in `index.html`.

**Rules:**
- Use Lucide React icons only — never emojis as icons
- All clickable elements need `cursor: pointer`
- All state changes need transitions (150-300ms)
- Maintain 4.5:1 minimum contrast ratio
- No layout-shifting hover effects
- Responsive breakpoints: 375px, 768px, 1024px, 1440px
