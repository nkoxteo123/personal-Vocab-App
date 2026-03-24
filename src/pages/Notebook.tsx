import { useEffect, useState, useMemo } from 'react';
import { Search, Star, StarOff, Trash2, X, BookOpen } from 'lucide-react';
import { getAllWords, updateWord, deleteWord } from '../services/storage';
import { useAppStore } from '../store/useAppStore';
import CEFRBadge from '../components/shared/CEFRBadge';
import type { WordEntry, CEFRLevel } from '../types';

type SortKey = 'date' | 'alpha' | 'cefr' | 'srs';

export default function Notebook() {
  const { refreshTrigger, triggerRefresh } = useAppStore();
  const [words, setWords] = useState<WordEntry[]>([]);
  const [search, setSearch] = useState('');
  const [cefrFilter, setCefrFilter] = useState<CEFRLevel | ''>('');
  const [posFilter, setPosFilter] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('date');
  const [selectedWord, setSelectedWord] = useState<WordEntry | null>(null);
  const [editNotes, setEditNotes] = useState('');

  useEffect(() => {
    (async () => {
      const all = await getAllWords();
      setWords(all);
    })();
  }, [refreshTrigger]);

  const filtered = useMemo(() => {
    let result = [...words];

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (w) =>
          w.word.includes(q) ||
          w.meaning_vi.toLowerCase().includes(q) ||
          w.meaning_en.toLowerCase().includes(q) ||
          w.tags.some((t) => t.toLowerCase().includes(q)),
      );
    }

    if (cefrFilter) result = result.filter((w) => w.cefr === cefrFilter);
    if (posFilter) result = result.filter((w) => w.pos === posFilter);

    // Sort
    switch (sortKey) {
      case 'alpha':
        result.sort((a, b) => a.word.localeCompare(b.word));
        break;
      case 'cefr':
        const order = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
        result.sort((a, b) => order.indexOf(a.cefr) - order.indexOf(b.cefr));
        break;
      case 'srs':
        result.sort((a, b) => (a.srs_next_review || '').localeCompare(b.srs_next_review || ''));
        break;
      default:
        result.sort((a, b) => b.date_added.localeCompare(a.date_added));
    }

    return result;
  }, [words, search, cefrFilter, posFilter, sortKey]);

  const handleStar = async (word: WordEntry) => {
    await updateWord(word.id, { starred: !word.starred });
    triggerRefresh();
  };

  const handleDelete = async (word: WordEntry) => {
    if (confirm(`Delete "${word.word}" from your vocabulary?`)) {
      await deleteWord(word.id);
      setSelectedWord(null);
      triggerRefresh();
    }
  };

  const handleNotesChange = async (notes: string) => {
    setEditNotes(notes);
    if (selectedWord) {
      await updateWord(selectedWord.id, { notes });
    }
  };

  return (
    <div>
      <h1 style={{ fontSize: '2rem', marginBottom: 4 }}>Personal Notebook</h1>
      <p style={{ color: 'var(--color-text-muted)', marginBottom: 24 }}>
        {words.length} words in your vocabulary bank
      </p>

      {/* Search & Filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search size={16} style={{
            position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
            color: 'var(--color-text-muted)',
          }} />
          <input
            className="input"
            placeholder="Search words, meanings, tags..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: 36 }}
          />
        </div>
        <select
          className="input"
          style={{ width: 'auto' }}
          value={cefrFilter}
          onChange={(e) => setCefrFilter(e.target.value as CEFRLevel | '')}
        >
          <option value="">All Levels</option>
          <option value="A1">A1</option>
          <option value="A2">A2</option>
          <option value="B1">B1</option>
          <option value="B2">B2</option>
          <option value="C1">C1</option>
          <option value="C2">C2</option>
        </select>
        <select
          className="input"
          style={{ width: 'auto' }}
          value={posFilter}
          onChange={(e) => setPosFilter(e.target.value)}
        >
          <option value="">All Types</option>
          <option value="noun">Noun</option>
          <option value="verb">Verb</option>
          <option value="adj">Adjective</option>
          <option value="adv">Adverb</option>
          <option value="phrase">Phrase</option>
        </select>
        <select
          className="input"
          style={{ width: 'auto' }}
          value={sortKey}
          onChange={(e) => setSortKey(e.target.value as SortKey)}
        >
          <option value="date">Newest first</option>
          <option value="alpha">A → Z</option>
          <option value="cefr">CEFR level</option>
          <option value="srs">Due soon</option>
        </select>
      </div>

      {/* Word List & Detail side-by-side */}
      <div style={{ display: 'grid', gridTemplateColumns: selectedWord ? '1fr 1fr' : '1fr', gap: 24 }}>
        {/* List */}
        <div className="card" style={{ padding: 0, maxHeight: 'calc(100vh - 240px)', overflowY: 'auto' }}>
          {filtered.length === 0 ? (
            <div className="empty-state" style={{ padding: 48 }}>
              <BookOpen size={40} />
              <p>No words found.</p>
            </div>
          ) : (
            filtered.map((w) => (
              <div
                key={w.id}
                className="word-list-item"
                onClick={() => { setSelectedWord(w); setEditNotes(w.notes); }}
                style={{
                  borderBottom: '1px solid var(--color-border)',
                  borderRadius: 0,
                  background: selectedWord?.id === w.id ? 'var(--color-surface-alt)' : undefined,
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span className="word-text">{w.word}</span>
                    <CEFRBadge level={w.cefr} />
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{w.pos}</span>
                    {w.starred && <Star size={14} style={{ color: '#f59e0b', fill: '#f59e0b' }} />}
                  </div>
                  <div className="word-meaning">{w.meaning_vi}</div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Detail Panel */}
        {selectedWord && (
          <div className="card" style={{ position: 'sticky', top: 32, alignSelf: 'start', maxHeight: 'calc(100vh - 240px)', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
              <div>
                <h2 style={{ fontSize: '1.5rem', color: 'var(--color-primary)' }}>{selectedWord.word}</h2>
                <span style={{ color: 'var(--color-text-muted)' }}>
                  {selectedWord.phonetic} · {selectedWord.pos}
                </span>
              </div>
              <div style={{ display: 'flex', gap: 4 }}>
                <button className="btn btn-ghost btn-sm" onClick={() => handleStar(selectedWord)}>
                  {selectedWord.starred
                    ? <Star size={16} style={{ color: '#f59e0b', fill: '#f59e0b' }} />
                    : <StarOff size={16} />
                  }
                </button>
                <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(selectedWord)}>
                  <Trash2 size={16} style={{ color: 'var(--color-danger)' }} />
                </button>
                <button className="btn btn-ghost btn-sm" onClick={() => setSelectedWord(null)}>
                  <X size={16} />
                </button>
              </div>
            </div>

            <CEFRBadge level={selectedWord.cefr} size="md" />

            <div style={{ marginTop: 20 }}>
              <div className="section-title">Vietnamese</div>
              <p style={{ fontWeight: 600, fontSize: '1.1rem' }}>{selectedWord.meaning_vi}</p>
            </div>

            <div style={{ marginTop: 12 }}>
              <div className="section-title">English Definition</div>
              <p style={{ fontSize: '0.9rem' }}>{selectedWord.meaning_en}</p>
            </div>

            {selectedWord.context_in_text && (
              <div style={{ marginTop: 12 }}>
                <div className="section-title">Context in Text</div>
                <p style={{ fontSize: '0.85rem', fontStyle: 'italic' }}>{selectedWord.context_in_text}</p>
              </div>
            )}

            {selectedWord.context_real_world && (
              <div style={{ marginTop: 12 }}>
                <div className="section-title">Real World Usage</div>
                <p style={{ fontSize: '0.85rem' }}>{selectedWord.context_real_world}</p>
              </div>
            )}

            {selectedWord.example_from_text && (
              <div style={{ marginTop: 12 }}>
                <div className="section-title">Example from Text</div>
                <p style={{ fontSize: '0.85rem', fontStyle: 'italic' }}>"{selectedWord.example_from_text}"</p>
              </div>
            )}

            {selectedWord.example_real && (
              <div style={{ marginTop: 12 }}>
                <div className="section-title">Real-world Example</div>
                <p style={{ fontSize: '0.85rem' }}>"{selectedWord.example_real}"</p>
              </div>
            )}

            {selectedWord.synonyms.length > 0 && (
              <div style={{ marginTop: 12 }}>
                <div className="section-title">Synonyms</div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {selectedWord.synonyms.map((s, i) => <span key={i} className="tag">{s}</span>)}
                </div>
              </div>
            )}

            {selectedWord.antonyms.length > 0 && (
              <div style={{ marginTop: 12 }}>
                <div className="section-title">Antonyms</div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {selectedWord.antonyms.map((a, i) => <span key={i} className="tag">{a}</span>)}
                </div>
              </div>
            )}

            {selectedWord.word_family.length > 0 && (
              <div style={{ marginTop: 12 }}>
                <div className="section-title">Word Family</div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {selectedWord.word_family.map((w, i) => <span key={i} className="tag">{w}</span>)}
                </div>
              </div>
            )}

            {selectedWord.collocations.length > 0 && (
              <div style={{ marginTop: 12 }}>
                <div className="section-title">Collocations</div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {selectedWord.collocations.map((c, i) => <span key={i} className="tag">{c}</span>)}
                </div>
              </div>
            )}

            {selectedWord.tags.length > 0 && (
              <div style={{ marginTop: 12 }}>
                <div className="section-title">Tags</div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {selectedWord.tags.map((t, i) => <span key={i} className="tag">{t}</span>)}
                </div>
              </div>
            )}

            <div style={{ marginTop: 16 }}>
              <div className="section-title">Personal Notes</div>
              <textarea
                className="input"
                value={editNotes}
                onChange={(e) => handleNotesChange(e.target.value)}
                placeholder="Add your personal notes..."
                rows={3}
              />
            </div>

            <div style={{ marginTop: 12, fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
              SRS: interval {selectedWord.srs_interval}d · ease {selectedWord.srs_ease.toFixed(1)} · reps {selectedWord.srs_repetitions}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
