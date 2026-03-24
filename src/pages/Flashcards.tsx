import { useEffect, useState, useCallback } from 'react';
import { RotateCcw, Check, Layers, ChevronDown, ChevronUp } from 'lucide-react';
import { getAllWords, getDueWords, updateWord, addSRSRecord } from '../services/storage';
import { calculateNextReview } from '../services/srs';
import { useAppStore } from '../store/useAppStore';
import CEFRBadge from '../components/shared/CEFRBadge';
import type { WordEntry, CEFRLevel } from '../types';

type FilterMode = 'all' | 'due' | 'starred';

export default function Flashcards() {
  const { refreshTrigger, triggerRefresh } = useAppStore();
  const [words, setWords] = useState<WordEntry[]>([]);
  const [current, setCurrent] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [filterMode, setFilterMode] = useState<FilterMode>('due');
  const [cefrFilter, setCefrFilter] = useState<CEFRLevel | ''>('');
  const [sessionDone, setSessionDone] = useState(false);
  const [sessionStats, setSessionStats] = useState({ know: 0, again: 0 });

  const loadWords = useCallback(async () => {
    let loaded: WordEntry[];
    if (filterMode === 'due') {
      loaded = await getDueWords();
    } else if (filterMode === 'starred') {
      const all = await getAllWords();
      loaded = all.filter((w) => w.starred);
    } else {
      loaded = await getAllWords();
    }

    if (cefrFilter) {
      loaded = loaded.filter((w) => w.cefr === cefrFilter);
    }

    loaded.sort(() => Math.random() - 0.5);
    setWords(loaded);
    setCurrent(0);
    setFlipped(false);
    setExpanded(false);
    setSessionDone(false);
    setSessionStats({ know: 0, again: 0 });
  }, [filterMode, cefrFilter, refreshTrigger]);

  useEffect(() => { loadWords(); }, [loadWords]);

  const handleResult = async (result: 'know' | 'again') => {
    const word = words[current];
    if (!word) return;

    const updates = calculateNextReview(word, result);
    await updateWord(word.id, updates);
    await addSRSRecord({
      id: crypto.randomUUID(),
      word_id: word.id,
      reviewed_at: new Date().toISOString(),
      result,
      interval_before: word.srs_interval,
      interval_after: updates.srs_interval || 0,
    });

    setSessionStats((prev) => ({ ...prev, [result]: prev[result] + 1 }));

    if (current < words.length - 1) {
      setCurrent((p) => p + 1);
      setFlipped(false);
      setExpanded(false);
    } else {
      setSessionDone(true);
      triggerRefresh();
    }
  };

  const word = words[current];

  if (words.length === 0 && !sessionDone) {
    return (
      <div>
        <h1 style={{ fontSize: '2rem', marginBottom: 8 }}>Flashcards</h1>
        <div className="empty-state" style={{ marginTop: 48 }}>
          <Layers size={48} />
          <h3 style={{ marginTop: 16 }}>No words to review</h3>
          <p style={{ color: 'var(--color-text-muted)', marginTop: 4 }}>
            {filterMode === 'due' ? 'All caught up! No words due for review.'
              : 'Upload a PDF to get started.'}
          </p>
          {filterMode === 'due' && (
            <button className="btn btn-secondary" style={{ marginTop: 16 }} onClick={() => setFilterMode('all')}>
              Review all words
            </button>
          )}
        </div>
      </div>
    );
  }

  if (sessionDone) {
    return (
      <div>
        <h1 style={{ fontSize: '2rem', marginBottom: 8 }}>Session Complete!</h1>
        <div style={{ maxWidth: 400, margin: '48px auto', textAlign: 'center' }}>
          <div style={{
            width: 80, height: 80, borderRadius: '50%', background: 'rgba(34,197,94,0.1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px',
          }}>
            <Check size={40} style={{ color: 'var(--color-success)' }} />
          </div>
          <h2 style={{ marginBottom: 8 }}>Great job!</h2>
          <p style={{ color: 'var(--color-text-muted)', marginBottom: 24 }}>
            You reviewed {sessionStats.know + sessionStats.again} words
          </p>
          <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginBottom: 24 }}>
            <div className="stat-card" style={{ minWidth: 120 }}>
              <div>
                <div className="stat-value" style={{ color: 'var(--color-success)' }}>{sessionStats.know}</div>
                <div className="stat-label">Remembered</div>
              </div>
            </div>
            <div className="stat-card" style={{ minWidth: 120 }}>
              <div>
                <div className="stat-value" style={{ color: 'var(--color-danger)' }}>{sessionStats.again}</div>
                <div className="stat-label">Review again</div>
              </div>
            </div>
          </div>
          <button className="btn btn-primary" onClick={loadWords}>Start New Session</button>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: '2rem', marginBottom: 4 }}>Flashcards</h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
            Card {current + 1} of {words.length}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <select className="input" style={{ width: 'auto', padding: '8px 12px' }}
            value={filterMode} onChange={(e) => setFilterMode(e.target.value as FilterMode)}>
            <option value="due">Due today</option>
            <option value="all">All words</option>
            <option value="starred">Starred</option>
          </select>
          <select className="input" style={{ width: 'auto', padding: '8px 12px' }}
            value={cefrFilter} onChange={(e) => setCefrFilter(e.target.value as CEFRLevel | '')}>
            <option value="">All levels</option>
            {(['A1','A2','B1','B2','C1','C2'] as const).map(l => <option key={l} value={l}>{l}</option>)}
          </select>
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ background: 'var(--color-border)', borderRadius: 8, height: 6, marginBottom: 32 }}>
        <div style={{
          background: 'var(--color-primary)', borderRadius: 8, height: 6,
          width: `${((current + 1) / words.length) * 100}%`, transition: 'width 300ms ease',
        }} />
      </div>

      {/* Card */}
      {word && (
        <div className="flashcard-container">
          <div
            className={`flashcard ${flipped ? 'flipped' : ''}`}
            onClick={() => { if (!flipped) setFlipped(true); }}
          >
            {/* Front */}
            <div className="flashcard-face flashcard-front">
              <CEFRBadge level={word.cefr} size="md" />
              <div className="flashcard-word" style={{ marginTop: 16 }}>{word.word}</div>
              <div className="flashcard-phonetic">{word.phonetic}</div>
              <span className="flashcard-pos">{word.pos}</span>
              <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: 16 }}>
                Tap to reveal meaning
              </p>
            </div>

            {/* Back — compact: only meaning + expand button */}
            <div className="flashcard-face flashcard-back" onClick={(e) => e.stopPropagation()}>
              <h3 style={{ fontSize: '1.4rem', color: 'var(--color-primary)', marginBottom: 8 }}>
                {word.meaning_vi}
              </h3>
              <p style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>
                {word.meaning_en}
              </p>

              {/* Expand toggle */}
              <button
                className="btn btn-ghost btn-sm"
                onClick={(e) => { e.stopPropagation(); setExpanded((v) => !v); }}
                style={{
                  margin: '10px auto 0', display: 'flex', alignItems: 'center', gap: 4,
                  fontSize: '0.8rem', color: 'var(--color-primary)',
                }}
              >
                {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                {expanded ? 'Show less' : 'Show details'}
              </button>

              {/* Expanded details — scrollable */}
              {expanded && (
                <div style={{ marginTop: 12, textAlign: 'left', maxHeight: 200, overflowY: 'auto', paddingRight: 4 }}>
                  {word.context_in_text && (
                    <div style={{ marginBottom: 10 }}>
                      <div className="section-title">Context in text</div>
                      <p style={{ fontSize: '0.83rem', fontStyle: 'italic' }}>{word.context_in_text}</p>
                    </div>
                  )}
                  {word.example_real && (
                    <div style={{ marginBottom: 10 }}>
                      <div className="section-title">Example</div>
                      <p style={{ fontSize: '0.83rem' }}>"{word.example_real}"</p>
                    </div>
                  )}
                  {word.collocations.length > 0 && (
                    <div style={{ marginBottom: 10 }}>
                      <div className="section-title">Collocations</div>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {word.collocations.map((c, i) => <span key={i} className="tag">{c}</span>)}
                      </div>
                    </div>
                  )}
                  {word.synonyms.length > 0 && (
                    <div style={{ marginBottom: 10 }}>
                      <div className="section-title">Synonyms</div>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {word.synonyms.map((s, i) => <span key={i} className="tag">{s}</span>)}
                      </div>
                    </div>
                  )}
                  {word.word_family.length > 0 && (
                    <div>
                      <div className="section-title">Word Family</div>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {word.word_family.map((w, i) => <span key={i} className="tag">{w}</span>)}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Buttons — always visible when flipped */}
      {flipped && word && (
        <div style={{
          display: 'flex', justifyContent: 'center', gap: 16, marginTop: 24,
        }}>
          <button className="btn btn-danger btn-lg"
            onClick={() => handleResult('again')}>
            <RotateCcw size={18} /> Review Again
          </button>
          <button className="btn btn-success btn-lg"
            onClick={() => handleResult('know')}>
            <Check size={18} /> Got It!
          </button>
        </div>
      )}
    </div>
  );
}
