import { useEffect, useState } from 'react';
import { CheckCircle, RotateCcw, Zap } from 'lucide-react';
import { getAllWords } from '../services/storage';
import type { WordEntry } from '../types';
import CEFRBadge from '../components/shared/CEFRBadge';

type QuizMode = 'select' | 'mcq' | 'fill' | 'results';

interface Question {
  word: WordEntry;
  question: string;
  options: string[];
  correctIndex: number;
}

function generateMCQ(words: WordEntry[]): Question[] {
  if (words.length < 4) return [];
  const shuffled = [...words].sort(() => Math.random() - 0.5);
  const questions: Question[] = [];

  for (let i = 0; i < Math.min(10, shuffled.length); i++) {
    const correct = shuffled[i];
    const others = shuffled.filter((w) => w.id !== correct.id).sort(() => Math.random() - 0.5).slice(0, 3);
    const options = [...others.map((o) => o.meaning_vi), correct.meaning_vi].sort(() => Math.random() - 0.5);
    questions.push({
      word: correct,
      question: `What does "${correct.word}" (${correct.pos}) mean?`,
      options,
      correctIndex: options.indexOf(correct.meaning_vi),
    });
  }

  return questions;
}

function generateFillBlanks(words: WordEntry[]): Question[] {
  const withExamples = words.filter((w) => w.example_from_text || w.example_real);
  if (withExamples.length < 4) return [];
  const shuffled = [...withExamples].sort(() => Math.random() - 0.5);
  const questions: Question[] = [];

  for (let i = 0; i < Math.min(10, shuffled.length); i++) {
    const correct = shuffled[i];
    const sentence = correct.example_from_text || correct.example_real;
    const blanked = sentence.replace(new RegExp(correct.word, 'gi'), '_____');
    if (blanked === sentence) continue;

    const others = shuffled.filter((w) => w.id !== correct.id).sort(() => Math.random() - 0.5).slice(0, 3);
    const options = [...others.map((o) => o.word), correct.word].sort(() => Math.random() - 0.5);
    questions.push({
      word: correct,
      question: blanked,
      options,
      correctIndex: options.indexOf(correct.word),
    });
  }

  return questions;
}

export default function Practice() {
  const [words, setWords] = useState<WordEntry[]>([]);
  const [mode, setMode] = useState<QuizMode>('select');
  const [lastQuizType, setLastQuizType] = useState<'mcq' | 'fill'>('mcq');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [answered, setAnswered] = useState(false);
  const [score, setScore] = useState(0);

  useEffect(() => {
    (async () => setWords(await getAllWords()))();
  }, []);

  const startQuiz = (type: 'mcq' | 'fill') => {
    const qs = type === 'mcq' ? generateMCQ(words) : generateFillBlanks(words);
    if (qs.length === 0) return;
    setQuestions(qs);
    setCurrent(0);
    setSelected(null);
    setAnswered(false);
    setScore(0);
    setLastQuizType(type);
    setMode(type);
  };

  const handleSelect = (idx: number) => {
    if (answered) return;
    setSelected(idx);
    setAnswered(true);
    if (idx === questions[current].correctIndex) {
      setScore((s) => s + 1);
    }
  };

  const nextQuestion = () => {
    if (current < questions.length - 1) {
      setCurrent((c) => c + 1);
      setSelected(null);
      setAnswered(false);
    } else {
      setMode('results');
    }
  };

  const q = questions[current];

  if (mode === 'select') {
    return (
      <div>
        <h1 style={{ fontSize: '2rem', marginBottom: 4 }}>Practice Zone</h1>
        <p style={{ color: 'var(--color-text-muted)', marginBottom: 32 }}>
          Test your knowledge with different quiz types
        </p>

        {words.length < 4 ? (
          <div className="empty-state" style={{ marginTop: 48 }}>
            <Zap size={48} />
            <h3 style={{ marginTop: 16 }}>Need more words</h3>
            <p style={{ color: 'var(--color-text-muted)' }}>
              Add at least 4 words to your bank to start practicing.
            </p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, maxWidth: 600 }}>
            <div className="card" style={{ cursor: 'pointer' }} onClick={() => startQuiz('mcq')}>
              <h3 style={{ marginBottom: 8 }}>Multiple Choice</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                Choose the correct meaning from 4 options
              </p>
              <button className="btn btn-primary btn-sm" style={{ marginTop: 12 }}>
                Start
              </button>
            </div>

            <div className="card" style={{ cursor: 'pointer' }} onClick={() => startQuiz('fill')}>
              <h3 style={{ marginBottom: 8 }}>Fill in the Blank</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                Complete the sentence with the correct word
              </p>
              <button className="btn btn-primary btn-sm" style={{ marginTop: 12 }}>
                Start
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (mode === 'results') {
    const pct = Math.round((score / questions.length) * 100);
    return (
      <div style={{ maxWidth: 480, margin: '0 auto', textAlign: 'center', paddingTop: 48 }}>
        <div style={{
          width: 80, height: 80, borderRadius: '50%',
          background: pct >= 70 ? 'rgba(34,197,94,0.1)' : 'rgba(249,115,22,0.1)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px',
        }}>
          {pct >= 70
            ? <CheckCircle size={40} style={{ color: 'var(--color-success)' }} />
            : <RotateCcw size={40} style={{ color: 'var(--color-cta)' }} />
          }
        </div>
        <h2 style={{ marginBottom: 8 }}>{pct >= 70 ? 'Great job!' : 'Keep practicing!'}</h2>
        <p style={{ fontSize: '2rem', fontWeight: 700, color: pct >= 70 ? 'var(--color-success)' : 'var(--color-cta)' }}>
          {score}/{questions.length}
        </p>
        <p style={{ color: 'var(--color-text-muted)', marginBottom: 24 }}>{pct}% correct</p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
          <button className="btn btn-secondary" onClick={() => setMode('select')}>Back</button>
          <button className="btn btn-primary" onClick={() => startQuiz(lastQuizType)}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 600, margin: '0 auto' }}>
      {/* Progress */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
          Question {current + 1} / {questions.length}
        </span>
        <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Score: {score}</span>
      </div>
      <div style={{ background: 'var(--color-border)', borderRadius: 8, height: 6, marginBottom: 32 }}>
        <div style={{
          background: 'var(--color-primary)',
          borderRadius: 8,
          height: 6,
          width: `${((current + 1) / questions.length) * 100}%`,
          transition: 'width 300ms ease',
        }} />
      </div>

      {/* Question */}
      {q && (
        <div className="card" style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <CEFRBadge level={q.word.cefr} />
            <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
              {mode === 'mcq' ? 'Multiple Choice' : 'Fill in the Blank'}
            </span>
          </div>
          <h3 style={{ fontSize: '1.1rem', marginBottom: 20, lineHeight: 1.5 }}>
            {q.question}
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {q.options.map((opt, idx) => {
              let cls = 'quiz-option';
              if (answered) {
                if (idx === q.correctIndex) cls += ' correct';
                else if (idx === selected) cls += ' incorrect';
              } else if (idx === selected) {
                cls += ' selected';
              }
              return (
                <div key={idx} className={cls} onClick={() => handleSelect(idx)}>
                  <span style={{ fontWeight: 600, marginRight: 8 }}>{String.fromCharCode(65 + idx)}.</span>
                  {opt}
                </div>
              );
            })}
          </div>

          {answered && (
            <div style={{ marginTop: 20, textAlign: 'right' }}>
              <button className="btn btn-primary" onClick={nextQuestion}>
                {current < questions.length - 1 ? 'Next' : 'See Results'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
