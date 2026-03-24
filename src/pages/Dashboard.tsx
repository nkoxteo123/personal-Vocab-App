import { useEffect, useState } from 'react';
import { BookOpen, Trophy, Flame, TrendingUp, Clock, Layers } from 'lucide-react';
import { getAllWords, getDueWords, getMasteredWordCount, getAllSources } from '../services/storage';
import { useAppStore } from '../store/useAppStore';
import type { WordEntry } from '../types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const CEFR_BAR_COLORS: Record<string, string> = {
  A1: '#22c55e', A2: '#16a34a', B1: '#f59e0b', B2: '#f97316', C1: '#ef4444', C2: '#dc2626',
};

export default function Dashboard() {
  const { refreshTrigger, streak, setView } = useAppStore();
  const [totalWords, setTotalWords] = useState(0);
  const [mastered, setMastered] = useState(0);
  const [dueToday, setDueToday] = useState(0);
  const [, setSourceCount] = useState(0);
  const [cefrData, setCefrData] = useState<{ level: string; count: number }[]>([]);
  const [recentWords, setRecentWords] = useState<WordEntry[]>([]);

  useEffect(() => {
    (async () => {
      const allWords = await getAllWords();
      const due = await getDueWords();
      const mast = await getMasteredWordCount();
      const sources = await getAllSources();

      setTotalWords(allWords.length);
      setDueToday(due.length);
      setMastered(mast);
      setSourceCount(sources.length);

      // CEFR distribution
      const cefrCounts: Record<string, number> = { A1: 0, A2: 0, B1: 0, B2: 0, C1: 0, C2: 0 };
      allWords.forEach((w) => { cefrCounts[w.cefr] = (cefrCounts[w.cefr] || 0) + 1; });
      setCefrData(Object.entries(cefrCounts).map(([level, count]) => ({ level, count })));

      // Recent words
      const sorted = [...allWords].sort((a, b) => b.date_added.localeCompare(a.date_added));
      setRecentWords(sorted.slice(0, 8));
    })();
  }, [refreshTrigger]);

  return (
    <div>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: '2rem', marginBottom: 4 }}>Welcome back!</h1>
        <p style={{ color: 'var(--color-text-muted)' }}>
          {dueToday > 0
            ? `You have ${dueToday} words to review today. ~${Math.ceil(dueToday * 0.7)} minutes estimated.`
            : 'You\'re all caught up! Upload a new PDF to learn more words.'}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(79,70,229,0.1)' }}>
            <BookOpen size={24} style={{ color: 'var(--color-primary)' }} />
          </div>
          <div>
            <div className="stat-value">{totalWords}</div>
            <div className="stat-label">Total Words</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(34,197,94,0.1)' }}>
            <Trophy size={24} style={{ color: 'var(--color-success)' }} />
          </div>
          <div>
            <div className="stat-value">{mastered}</div>
            <div className="stat-label">Mastered</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(249,115,22,0.1)' }}>
            <Flame size={24} style={{ color: 'var(--color-cta)' }} />
          </div>
          <div>
            <div className="stat-value">{streak}</div>
            <div className="stat-label">Day Streak</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(239,68,68,0.1)' }}>
            <Clock size={24} style={{ color: 'var(--color-danger)' }} />
          </div>
          <div>
            <div className="stat-value">{dueToday}</div>
            <div className="stat-label">Due Today</div>
          </div>
        </div>
      </div>

      {/* Two Column Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        {/* CEFR Distribution */}
        <div className="card">
          <h3 style={{ marginBottom: 16 }}>CEFR Distribution</h3>
          {totalWords === 0 ? (
            <div className="empty-state">
              <Layers size={32} />
              <p>No words yet. Upload a PDF to get started.</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={cefrData}>
                <XAxis dataKey="level" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {cefrData.map((entry) => (
                    <Cell key={entry.level} fill={CEFR_BAR_COLORS[entry.level] || '#94a3b8'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Recent Words */}
        <div className="card">
          <div className="card-header">
            <h3>Recently Added</h3>
            {totalWords > 0 && (
              <button className="btn btn-ghost btn-sm" onClick={() => setView('notebook')}>
                View all
              </button>
            )}
          </div>
          {recentWords.length === 0 ? (
            <div className="empty-state">
              <BookOpen size={32} />
              <p>No words yet.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {recentWords.map((w) => (
                <div key={w.id} className="word-list-item" style={{ padding: '8px 12px' }}>
                  <span className={`cefr-badge cefr-${w.cefr.toLowerCase()}`}>{w.cefr}</span>
                  <div style={{ flex: 1 }}>
                    <span className="word-text" style={{ fontSize: '0.9rem' }}>{w.word}</span>
                    <span className="word-meaning" style={{ marginLeft: 8 }}>{w.meaning_vi}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      {dueToday > 0 && (
        <div style={{ marginTop: 24, textAlign: 'center' }}>
          <button
            className="btn btn-primary btn-lg"
            onClick={() => setView('flashcards')}
          >
            <TrendingUp size={20} />
            Start Review ({dueToday} words)
          </button>
        </div>
      )}
    </div>
  );
}
