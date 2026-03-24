import { useEffect, useState } from 'react';
import { BookMarked, Eye, X, Trash2 } from 'lucide-react';
import { getAllSources, getAllWords, deleteSource } from '../services/storage';
import type { Source, WordEntry } from '../types';
import CEFRBadge from '../components/shared/CEFRBadge';

export default function Reading() {
  const [sources, setSources] = useState<Source[]>([]);
  const [allWords, setAllWords] = useState<WordEntry[]>([]);
  const [selectedSource, setSelectedSource] = useState<Source | null>(null);
  const [sourceWords, setSourceWords] = useState<WordEntry[]>([]);
  const [popup, setPopup] = useState<{ word: WordEntry; x: number; y: number } | null>(null);
  const [unknownPopup, setUnknownPopup] = useState<{ word: string; context: string; x: number; y: number; loading: boolean; result: WordEntry | null; error: string | null } | null>(null);

  useEffect(() => {
    (async () => {
      const s = await getAllSources();
      const w = await getAllWords();
      setSources(s.sort((a, b) => b.date_added.localeCompare(a.date_added)));
      setAllWords(w);
    })();
  }, []);

  const handleDeleteSource = async (id: string, title: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm(`Are you sure you want to delete "${title}"?\nYour extracted words will remain safely in your notebook.`)) return;
    
    await deleteSource(id);
    setSources(prev => prev.filter(s => s.id !== id));
    if (selectedSource?.id === id) {
      setSelectedSource(null);
    }
  };

  const openSource = async (source: Source) => {
    setSelectedSource(source);
    const words = allWords.filter((w) => w.source_ids.includes(source.id));
    setSourceWords(words);
  };

  const handleWordClick = (word: WordEntry, e: React.MouseEvent) => {
    e.stopPropagation();
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    setUnknownPopup(null);
    setPopup({ word, x: rect.left + rect.width / 2, y: rect.bottom + 8 });
  };

  const handleUnknownWordClick = async (word: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!selectedSource?.raw_text) return;
    
    // Find context sentence
    const text = selectedSource.raw_text;
    const matchIdx = text.toLowerCase().indexOf(word.toLowerCase());
    let context = text.slice(Math.max(0, matchIdx - 80), Math.min(text.length, matchIdx + 80));
    context = `...${context.trim()}...`;

    const rect = (e.target as HTMLElement).getBoundingClientRect();
    setPopup(null);
    setUnknownPopup({ word, context, x: rect.left + rect.width / 2, y: rect.bottom + 8, loading: true, result: null, error: null });

    try {
      // dynamically import to avoid circular dep if any, but regular import is fine too
      const { extractSingleWord } = await import('../services/gemini');
      const response = await extractSingleWord(word, context);
      
      let parsed = null;
      try {
        const cleaned = response.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
        const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
        if (jsonMatch) parsed = JSON.parse(jsonMatch[0]);
      } catch {
        throw new Error('Could not parse AI response');
      }

      if (parsed) {
        const now = new Date().toISOString();
        const newWord: WordEntry = {
          ...parsed,
          id: crypto.randomUUID(),
          word: (parsed.word || word).toLowerCase().trim(),
          pos: parsed.pos || 'unknown',
          cefr: parsed.cefr || 'B1',
          phonetic: parsed.phonetic || '',
          meaning_vi: parsed.meaning_vi || '',
          meaning_en: parsed.meaning_en || '',
          context_in_text: context,
          context_real_world: parsed.context_real_world || '',
          collocations: Array.isArray(parsed.collocations) ? parsed.collocations : [],
          synonyms: Array.isArray(parsed.synonyms) ? parsed.synonyms : [],
          antonyms: Array.isArray(parsed.antonyms) ? parsed.antonyms : [],
          word_family: Array.isArray(parsed.word_family) ? parsed.word_family : [],
          related_words: Array.isArray(parsed.related_words) ? parsed.related_words : [],
          example_from_text: parsed.example_from_text || context,
          example_real: parsed.example_real || '',
          tags: Array.isArray(parsed.tags) ? parsed.tags : [],
          source_ids: [selectedSource.id],
          date_added: now,
          notes: '',
          starred: false,
          srs_interval: 0,
          srs_ease: 2.5,
          srs_repetitions: 0,
          srs_next_review: now,
          srs_last_result: null,
        };
        // Auto-save the new word instantly and show its standard highlight popup!
        await handleSaveNewWord(newWord);
        setUnknownPopup(null);
        setPopup({ word: newWord, x: rect.left + rect.width / 2, y: rect.bottom + 8 });
      }
    } catch (err) {
      setUnknownPopup(prev => prev ? { ...prev, loading: false, error: 'Failed to extract meaning. Try again.' } : null);
    }
  };

  const handleSaveNewWord = async (newWord: WordEntry) => {
    const { addWords, updateSource } = await import('../services/storage');
    await addWords([newWord]);
    if (selectedSource) {
      const updatedSource = { ...selectedSource, word_ids: [...selectedSource.word_ids, newWord.id] };
      await updateSource(updatedSource);
      setSelectedSource(updatedSource);
    }
    setAllWords(prev => [...prev, newWord]);
    setSourceWords(prev => [...prev, newWord]);
    setUnknownPopup(null);
  };

  const getHighlightedText = (text: string) => {
    if (!text) return null;

    const wordMap = new Map(allWords.map((w) => [w.word.toLowerCase(), w]));
    const words = text.split(/(\s+)/);

    return words.map((segment, i) => {
      // Strip ONLY leading/trailing punctuation using Unicode properties.
      // This preserves letters (including Vietnamese), numbers, hyphens, and apostrophes.
      const clean = segment.replace(/^[^\p{L}\p{N}'-]+|[^\p{L}\p{N}'-]+$/gu, '').toLowerCase();
      if (!clean) return <span key={i}>{segment}</span>;

      const match = wordMap.get(clean);
      if (match) {
        let color = 'var(--color-text-muted)';
        if (match.srs_repetitions >= 3 && match.srs_last_result === 'know') {
          color = 'var(--color-success)';
        } else if (match.srs_repetitions > 0) {
          color = '#f59e0b';
        }
        return (
          <span
            key={i}
            style={{
              background: `${color}22`,
              borderBottom: `2px solid ${color}`,
              padding: '0 2px',
              cursor: 'pointer',
              borderRadius: 3,
              transition: 'background 150ms ease',
            }}
            onClick={(e) => handleWordClick(match, e)}
            onMouseEnter={(e) => { (e.target as HTMLElement).style.background = `${color}44`; }}
            onMouseLeave={(e) => { (e.target as HTMLElement).style.background = `${color}22`; }}
          >
            {segment}
          </span>
        );
      }
      
      return (
        <span 
          key={i} 
          onClick={(e) => handleUnknownWordClick(clean, e)}
          style={{ cursor: 'pointer', borderBottom: '1px dashed transparent', transition: 'border-color 150ms' }}
          onMouseEnter={(e) => { (e.target as HTMLElement).style.borderBottomColor = 'var(--color-text-muted)'; }}
          onMouseLeave={(e) => { (e.target as HTMLElement).style.borderBottomColor = 'transparent'; }}
        >
          {segment}
        </span>
      );
    });
  };

  // Close popup when clicking outside
  useEffect(() => {
    const close = () => { setPopup(null); setUnknownPopup(null); };
    if (popup || unknownPopup) {
      document.addEventListener('click', close);
      return () => document.removeEventListener('click', close);
    }
  }, [popup, unknownPopup]);

  if (selectedSource) {
    return (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <button className="btn btn-ghost btn-sm" onClick={() => { setSelectedSource(null); setPopup(null); }}>
            ← Back
          </button>
          <div>
            <h1 style={{ fontSize: '1.5rem' }}>{selectedSource.title}</h1>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
              {selectedSource.topic || 'General'} · {sourceWords.length} words extracted
            </p>
          </div>
        </div>

        {/* Legend */}
        <div style={{ display: 'flex', gap: 16, marginBottom: 20, fontSize: '0.82rem', fontWeight: 600 }}>
          <span><span style={{ color: 'var(--color-success)' }}>■</span> Mastered</span>
          <span><span style={{ color: '#f59e0b' }}>■</span> Learning</span>
          <span><span style={{ color: 'var(--color-text-muted)' }}>■</span> New</span>
          <span style={{ color: 'var(--color-text-muted)', fontWeight: 400, fontStyle: 'italic' }}>
            Click any highlighted word to see its meaning
          </span>
        </div>

        {/* Reading text */}
        <div className="card" style={{ lineHeight: 1.9, fontSize: '1rem' }}>
          {selectedSource.raw_text ? (
            <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
              {selectedSource.raw_text.split('\n').map((line, lineIdx) => {
                if (line.trim() === '') {
                  return <br key={lineIdx} />;
                }
                return (
                  <p key={lineIdx} style={{ marginBottom: 8, minHeight: '1.2em' }}>
                    {getHighlightedText(line)}
                  </p>
                );
              })}
            </div>
          ) : (
            <div className="empty-state">
              <p>No text content available for this source.</p>
            </div>
          )}
        </div>

        {/* Source words */}
        <div className="card" style={{ marginTop: 24 }}>
          <h3 style={{ marginBottom: 12 }}>Words from this text ({sourceWords.length})</h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {sourceWords.map((w) => (
              <div key={w.id} style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '6px 12px', background: 'var(--color-surface-alt)',
                borderRadius: 'var(--radius-md)', fontSize: '0.85rem',
                cursor: 'pointer', border: '2px solid var(--color-border)',
                transition: 'all 150ms ease',
              }}
                onClick={(e) => handleWordClick(w, e)}
              >
                <CEFRBadge level={w.cefr} />
                <span style={{ fontWeight: 700 }}>{w.word}</span>
                <span style={{ color: 'var(--color-text-muted)' }}>— {w.meaning_vi}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Word Meaning Popup */}
        {popup && (
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'fixed',
              left: Math.min(popup.x - 160, window.innerWidth - 340),
              top: Math.min(popup.y, window.innerHeight - 280),
              width: 320,
              background: 'var(--color-surface)',
              borderRadius: 'var(--radius-lg)',
              padding: 20,
              boxShadow: 'var(--shadow-xl)',
              border: '3px solid var(--color-border)',
              zIndex: 100,
              animation: 'slideUp 200ms ease',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ fontFamily: 'var(--font-heading)', fontSize: '1.3rem', fontWeight: 800, color: 'var(--color-primary)' }}>
                    {popup.word.word}
                  </span>
                  <CEFRBadge level={popup.word.cefr} />
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                  {popup.word.phonetic && <span>{popup.word.phonetic} · </span>}
                  <span style={{ fontStyle: 'italic' }}>{popup.word.pos}</span>
                </div>
              </div>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => setPopup(null)}
                style={{ padding: 4 }}
              >
                <X size={16} />
              </button>
            </div>

            <div style={{
              fontSize: '1.05rem', fontWeight: 700, color: 'var(--color-primary-dark)',
              marginBottom: 4, marginTop: 8,
            }}>
              {popup.word.meaning_vi}
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: 8 }}>
              {popup.word.meaning_en}
            </div>

            {popup.word.example_real && (
              <div style={{
                fontSize: '0.82rem', fontStyle: 'italic', color: 'var(--color-text)',
                padding: '8px 12px', background: 'var(--color-surface-alt)',
                borderRadius: 'var(--radius-sm)', borderLeft: '3px solid var(--color-primary)',
              }}>
                "{popup.word.example_real}"
              </div>
            )}

            {popup.word.collocations.length > 0 && (
              <div style={{ marginTop: 8, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {popup.word.collocations.slice(0, 4).map((c, i) => (
                  <span key={i} className="tag">{c}</span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Unknown Word Click-to-Add Popup */}
        {unknownPopup && (
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'fixed',
              left: Math.min(unknownPopup.x - 160, window.innerWidth - 340),
              top: Math.min(unknownPopup.y, window.innerHeight - 280),
              width: 320,
              background: 'var(--color-surface)',
              borderRadius: 'var(--radius-lg)',
              padding: 20,
              boxShadow: 'var(--shadow-xl)',
              border: '3px solid var(--color-border)',
              zIndex: 100,
              animation: 'slideUp 200ms ease',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
              <span style={{ fontFamily: 'var(--font-heading)', fontSize: '1.3rem', fontWeight: 800, color: 'var(--color-primary)' }}>
                {unknownPopup.word}
              </span>
              <button className="btn btn-ghost btn-sm" onClick={() => setUnknownPopup(null)} style={{ padding: 4 }}>
                <X size={16} />
              </button>
            </div>

            {unknownPopup.loading && (
              <div style={{ padding: '20px 0', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                <div className="spinner" style={{ margin: '0 auto 12px', width: 24, height: 24, borderWidth: 3 }}></div>
                <p style={{ fontSize: '0.85rem' }}>Looking up meaning...</p>
              </div>
            )}

            {unknownPopup.error && (
              <div style={{ padding: '10px 0', color: 'var(--color-danger)', fontSize: '0.85rem', textAlign: 'center' }}>
                {unknownPopup.error}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <h1 style={{ fontSize: '2rem', marginBottom: 4 }}>Reading Mode</h1>
      <p style={{ color: 'var(--color-text-muted)', marginBottom: 24 }}>
        Review your uploaded texts with highlighted vocabulary
      </p>

      {sources.length === 0 ? (
        <div className="empty-state" style={{ marginTop: 48 }}>
          <BookMarked size={48} />
          <h3 style={{ marginTop: 16 }}>No texts uploaded yet</h3>
          <p style={{ color: 'var(--color-text-muted)' }}>
            Upload a PDF to see it here with vocabulary highlights.
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {sources.map((s) => (
            <div key={s.id} className="card" style={{ cursor: 'pointer' }} onClick={() => openSource(s)}>
              <h3 style={{ marginBottom: 8 }}>{s.title}</h3>
              <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                {s.topic && <span className="tag">{s.topic}</span>}
                <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                  {s.word_ids.length} words
                </span>
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                Added {new Date(s.date_added).toLocaleDateString()}
              </p>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                <button className="btn btn-ghost btn-sm">
                  <Eye size={14} /> Read
                </button>
                <button 
                  className="btn btn-ghost btn-sm" 
                  style={{ color: 'var(--color-danger)' }}
                  onClick={(e) => handleDeleteSource(s.id, s.title, e)}
                  title="Delete Document"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
