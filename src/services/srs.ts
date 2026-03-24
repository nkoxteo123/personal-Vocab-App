import type { WordEntry } from '../types';

/**
 * SM-2 simplified SRS algorithm from the PRD.
 */
export function calculateNextReview(
  word: WordEntry,
  result: 'know' | 'again',
): Partial<WordEntry> {
  if (result === 'again') {
    return {
      srs_interval: 1,
      srs_ease: Math.max(1.3, word.srs_ease - 0.2),
      srs_repetitions: 0,
      srs_next_review: new Date(Date.now() + 1 * 86400000).toISOString(),
      srs_last_result: 'again',
    };
  }

  // result === 'know'
  let interval: number;
  if (word.srs_repetitions === 0) interval = 1;
  else if (word.srs_repetitions === 1) interval = 6;
  else interval = Math.round(word.srs_interval * word.srs_ease);

  return {
    srs_interval: interval,
    srs_ease: Math.min(2.5, word.srs_ease + 0.1),
    srs_repetitions: word.srs_repetitions + 1,
    srs_next_review: new Date(Date.now() + interval * 86400000).toISOString(),
    srs_last_result: 'know',
  };
}
