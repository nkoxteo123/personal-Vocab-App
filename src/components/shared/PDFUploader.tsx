import { useState, useRef } from 'react';
import { FileUp, AlertTriangle, Check, X, Loader2 } from 'lucide-react';
import { extractTextFromPDF } from '../../services/pdfExtract';
import { extractVocabulary } from '../../services/gemini';
import { addWords, addSource } from '../../services/storage';
import { useAppStore } from '../../store/useAppStore';
import type { WordEntry, Source } from '../../types';

interface Props {
  onClose: () => void;
}

export default function PDFUploader({ onClose }: Props) {
  const [step, setStep] = useState<'upload' | 'extracting' | 'saving' | 'done' | 'error'>('upload');
  const [dragOver, setDragOver] = useState(false);
  const [fileName, setFileName] = useState('');
  const [savedCount, setSavedCount] = useState(0);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { triggerRefresh } = useAppStore();

  const processFile = async (file: File) => {
    setFileName(file.name);
    setStep('extracting');
    try {
      // 1. Extract text from PDF
      const text = await extractTextFromPDF(file);

      if (text.length < 50) {
        setError('PDF yielded very little text. It may contain scanned images instead of text.');
        setStep('error');
        return;
      }

      // 2. Call AI to extract vocabulary
      const response = await extractVocabulary(text);

      // 3. Parse JSON — handle markdown code fences and truncated responses
      let parsed: any[] = [];
      try {
        // First try to parse the whole array if it's perfectly formed
        const cleaned = response.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
        const jsonMatch = cleaned.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          parsed = JSON.parse(jsonMatch[0]);
        }
      } catch (e) {
        // If it fails (likely due to truncation), fallback to extracting individual objects
        console.warn('Full JSON parse failed, falling back to regex extraction', e);
        const objectRegex = /\{[^{}]*"word"\s*:[^{}]*\}/g;
        const matches = response.match(objectRegex);
        if (matches) {
          parsed = matches.map((m) => {
            try { return JSON.parse(m); } catch { return null; }
          }).filter(Boolean);
        }
      }

      if (!Array.isArray(parsed) || parsed.length === 0) {
        console.error('AI raw response:', response);
        setError('AI returned an empty or unparseable word list.');
        setStep('error');
        return;
      }

      // 4. Build word entries and source
      const now = new Date().toISOString();
      const sourceId = crypto.randomUUID();

      const wordEntries: WordEntry[] = parsed.map((w: Record<string, unknown>) => ({
        id: crypto.randomUUID(),
        word: (String(w.word || '')).toLowerCase().trim(),
        pos: String(w.pos || 'noun'),
        cefr: String(w.cefr || 'B1') as WordEntry['cefr'],
        phonetic: String(w.phonetic || ''),
        meaning_vi: String(w.meaning_vi || ''),
        meaning_en: String(w.meaning_en || ''),
        context_in_text: String(w.context_in_text || ''),
        context_real_world: String(w.context_real_world || ''),
        collocations: Array.isArray(w.collocations) ? w.collocations : [],
        synonyms: Array.isArray(w.synonyms) ? w.synonyms : [],
        antonyms: Array.isArray(w.antonyms) ? w.antonyms : [],
        word_family: Array.isArray(w.word_family) ? w.word_family : [],
        related_words: Array.isArray(w.related_words) ? w.related_words : [],
        example_from_text: String(w.example_from_text || ''),
        example_real: String(w.example_real || ''),
        tags: Array.isArray(w.tags) ? w.tags : [],
        source_ids: [sourceId],
        date_added: now,
        notes: '',
        starred: false,
        srs_interval: 0,
        srs_ease: 2.5,
        srs_repetitions: 0,
        srs_next_review: now,
        srs_last_result: null,
      }));

      // 5. Auto-save — no preview step needed
      setStep('saving');

      const source: Source = {
        id: sourceId,
        title: file.name.replace(/\.pdf$/i, ''),
        topic: 'general',
        date_added: now,
        word_ids: wordEntries.map((w) => w.id),
        raw_text: text,
      };

      await addSource(source);
      await addWords(wordEntries);
      triggerRefresh();

      setSavedCount(wordEntries.length);
      setStep('done');
    } catch (err) {
      console.error('PDF processing error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred.');
      setStep('error');
    }
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type === 'application/pdf') processFile(file);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.4rem' }}>
          {step === 'upload' && 'Upload PDF'}
          {step === 'extracting' && 'Extracting vocabulary...'}
          {step === 'saving' && 'Saving words...'}
          {step === 'done' && 'Done!'}
          {step === 'error' && 'Error'}
        </h2>
        <button className="btn btn-ghost btn-sm" onClick={onClose}><X size={18} /></button>
      </div>

      {/* Upload Step */}
      {step === 'upload' && (
        <div
          className={`upload-zone ${dragOver ? 'drag-over' : ''}`}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleFileDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <FileUp size={40} style={{ color: 'var(--color-primary)', marginBottom: 12 }} />
          <p style={{ fontWeight: 600, marginBottom: 4 }}>Drop your PDF here or click to browse</p>
          <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
            AI will extract vocabulary and save automatically
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf"
            style={{ display: 'none' }}
            onChange={handleFileSelect}
          />
        </div>
      )}

      {/* Extracting Step */}
      {(step === 'extracting' || step === 'saving') && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 40, gap: 16 }}>
          <Loader2 size={40} style={{ color: 'var(--color-primary)', animation: 'spin 1s linear infinite' }} />
          <p style={{ color: 'var(--color-text-muted)', textAlign: 'center' }}>
            {step === 'extracting' ? (
              <>Parsing <strong>{fileName}</strong> and extracting vocabulary with AI...<br />
              <span style={{ fontSize: '0.8rem' }}>This may take 10-30 seconds</span></>
            ) : (
              'Saving words to your vocabulary bank...'
            )}
          </p>
        </div>
      )}

      {/* Done Step */}
      {step === 'done' && (
        <div style={{ textAlign: 'center', padding: 32 }}>
          <div style={{
            width: 64, height: 64, borderRadius: '50%', background: 'rgba(34,197,94,0.1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px',
          }}>
            <Check size={32} style={{ color: 'var(--color-success)' }} />
          </div>
          <h3 style={{ marginBottom: 8 }}>
            {savedCount} words saved!
          </h3>
          <p style={{ color: 'var(--color-text-muted)', marginBottom: 16 }}>
            Words are stored locally and will persist after page reload.
            <br />View them in Notebook, review in Flashcards, or practice in Quiz.
          </p>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
            <button className="btn btn-secondary" onClick={() => setStep('upload')}>Upload another</button>
            <button className="btn btn-primary" onClick={onClose}>Close</button>
          </div>
        </div>
      )}

      {/* Error Step */}
      {step === 'error' && (
        <div style={{ textAlign: 'center', padding: 32 }}>
          <AlertTriangle size={40} style={{ color: 'var(--color-warning)', marginBottom: 12 }} />
          <p style={{ color: 'var(--color-danger)', marginBottom: 16 }}>{error}</p>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
            <button className="btn btn-secondary" onClick={() => setStep('upload')}>Try again</button>
            <button className="btn btn-ghost" onClick={onClose}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}
