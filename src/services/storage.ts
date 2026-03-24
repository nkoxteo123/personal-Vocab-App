import { supabase } from './supabase';
import type { WordEntry, Source, SRSRecord } from '../types';

// ─── Word CRUD ────────────────────────────────────────────────

export async function addWord(word: WordEntry): Promise<void> {
  const { data: existing } = await supabase
    .from('words')
    .select('*')
    .eq('word', word.word.toLowerCase())
    .maybeSingle();

  if (existing) {
    // Merge: add new source_ids and contexts
    const mergedSourceIds = [...new Set([...existing.source_ids, ...word.source_ids])];
    await supabase
      .from('words')
      .update({
        source_ids: mergedSourceIds,
        context_in_text: word.context_in_text || existing.context_in_text,
        context_real_world: word.context_real_world || existing.context_real_world,
      })
      .eq('id', existing.id);
  } else {
    // Strip fields not in the DB schema, lowercase the word
    const { ...entry } = word;
    await supabase.from('words').insert({
      ...entry,
      word: word.word.toLowerCase(),
      srs_last_result: word.srs_last_result ?? null,
    });
  }
}

export async function addWords(words: WordEntry[]): Promise<void> {
  for (const w of words) {
    await addWord(w);
  }
}

export async function getAllWords(): Promise<WordEntry[]> {
  const { data, error } = await supabase
    .from('words')
    .select('*');
  if (error) throw error;
  return (data || []) as WordEntry[];
}

export async function getWordById(id: string): Promise<WordEntry | undefined> {
  const { data } = await supabase
    .from('words')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  return (data as WordEntry) ?? undefined;
}

export async function updateWord(id: string, changes: Partial<WordEntry>): Promise<void> {
  const { error } = await supabase
    .from('words')
    .update(changes)
    .eq('id', id);
  if (error) throw error;
}

export async function deleteWord(id: string): Promise<void> {
  await supabase.from('words').delete().eq('id', id);
}

export async function getDueWords(): Promise<WordEntry[]> {
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from('words')
    .select('*')
    .or(`srs_next_review.eq.,srs_next_review.lte.${now}`);
  if (error) throw error;
  return (data || []) as WordEntry[];
}

// ─── Source CRUD ──────────────────────────────────────────────

export async function addSource(source: Source): Promise<void> {
  await supabase.from('sources').insert(source);
}

export async function getAllSources(): Promise<Source[]> {
  const { data, error } = await supabase
    .from('sources')
    .select('*');
  if (error) throw error;
  return (data || []) as Source[];
}

export async function getSourceById(id: string): Promise<Source | undefined> {
  const { data } = await supabase
    .from('sources')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  return (data as Source) ?? undefined;
}

export async function updateSource(source: Source): Promise<void> {
  const { id, ...rest } = source;
  await supabase.from('sources').update(rest).eq('id', id);
}

export async function deleteSource(id: string): Promise<void> {
  await supabase.from('sources').delete().eq('id', id);
}

// ─── SRS History ──────────────────────────────────────────────

export async function addSRSRecord(record: SRSRecord): Promise<void> {
  await supabase.from('srs_history').insert(record);
}

export async function getSRSHistoryForWord(wordId: string): Promise<SRSRecord[]> {
  const { data, error } = await supabase
    .from('srs_history')
    .select('*')
    .eq('word_id', wordId);
  if (error) throw error;
  return (data || []) as SRSRecord[];
}

export async function getWordCount(): Promise<number> {
  const { count, error } = await supabase
    .from('words')
    .select('*', { count: 'exact', head: true });
  if (error) throw error;
  return count || 0;
}

export async function getMasteredWordCount(): Promise<number> {
  const { count, error } = await supabase
    .from('words')
    .select('*', { count: 'exact', head: true })
    .gt('srs_interval', 21);
  if (error) throw error;
  return count || 0;
}
