import { useState, useEffect } from 'react';
import { Key, Save, Download, AlertTriangle, CheckCircle, LogOut } from 'lucide-react';
import { getApiKey, setApiKey, getModel, setModel, getProvider, setProvider, type AIProvider } from '../services/gemini';
import { getAllWords, getAllSources } from '../services/storage';
import { supabase } from '../services/supabase';
import type { WordEntry, Source } from '../types';

const PROVIDER_CONFIG = {
  gemini: {
    label: 'Google Gemini',
    url: 'https://aistudio.google.com',
    urlLabel: 'aistudio.google.com',
    placeholder: 'AIza...',
    models: [
      { value: 'gemini-2.0-flash-lite', label: 'Gemini 2.0 Flash Lite (recommended)' },
      { value: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash' },
      { value: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash' },
    ],
  },
  deepseek: {
    label: 'DeepSeek',
    url: 'https://platform.deepseek.com/api_keys',
    urlLabel: 'platform.deepseek.com',
    placeholder: 'sk-...',
    models: [
      { value: 'deepseek-chat', label: 'DeepSeek Chat (V3)' },
      { value: 'deepseek-reasoner', label: 'DeepSeek Reasoner (R1)' },
    ],
  },
};

export default function SettingsPage() {
  const [provider, setProviderState] = useState<AIProvider>(getProvider());
  const [apiKey, setApiKeyState] = useState(getApiKey() || '');
  const [model, setModelState] = useState(getModel());
  const [saved, setSaved] = useState(false);
  const [words, setWords] = useState<WordEntry[]>([]);
  const [sources, setSources] = useState<Source[]>([]);

  const cfg = PROVIDER_CONFIG[provider];

  useEffect(() => {
    (async () => {
      setWords(await getAllWords());
      setSources(await getAllSources());
    })();
  }, []);

  const handleProviderChange = (p: AIProvider) => {
    setProvider(p);
    setProviderState(p);
    setApiKeyState(getApiKey() || '');
    setModelState(getModel());
    setSaved(false);
  };

  const handleSaveKey = () => {
    setApiKey(apiKey);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const exportCSV = () => {
    if (words.length === 0) return;
    const headers = ['word', 'pos', 'cefr', 'phonetic', 'meaning_vi', 'meaning_en', 'collocations', 'synonyms', 'tags'];
    const rows = words.map((w) =>
      [w.word, w.pos, w.cefr, w.phonetic, w.meaning_vi, w.meaning_en,
        w.collocations.join('; '), w.synonyms.join('; '), w.tags.join('; ')]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(','),
    );
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vocabai_export_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportAnki = () => {
    if (words.length === 0) return;
    const rows = words.map((w) => {
      const front = `${w.word} (${w.pos}) [${w.cefr}]`;
      const back = `${w.meaning_vi}\n${w.meaning_en}\nCollocations: ${w.collocations.join(', ')}\nExample: ${w.example_real || w.example_from_text}`;
      return `${front}\t${back}`;
    });
    const txt = rows.join('\n');
    const blob = new Blob([txt], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vocabai_anki_${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ maxWidth: 640 }}>
      <h1 style={{ fontSize: '2rem', marginBottom: 24 }}>Settings</h1>

      {/* Provider Selector */}
      <div className="card" style={{ marginBottom: 20 }}>
        <h3 style={{ marginBottom: 12 }}>AI Provider</h3>
        <div style={{ display: 'flex', gap: 8 }}>
          {(Object.keys(PROVIDER_CONFIG) as AIProvider[]).map((p) => (
            <button
              key={p}
              className={`btn ${provider === p ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => handleProviderChange(p)}
              style={{ flex: 1 }}
            >
              {PROVIDER_CONFIG[p].label}
            </button>
          ))}
        </div>
      </div>

      {/* API Key */}
      <div className="card" style={{ marginBottom: 20 }}>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <Key size={18} /> {cfg.label} API Key
        </h3>
        <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: 12 }}>
          Get your API key from{' '}
          <a href={cfg.url} target="_blank" rel="noreferrer"
            style={{ color: 'var(--color-primary)', textDecoration: 'underline' }}>
            {cfg.urlLabel}
          </a>
        </p>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            className="input"
            type="password"
            placeholder={`Enter API key (${cfg.placeholder})...`}
            value={apiKey}
            onChange={(e) => setApiKeyState(e.target.value)}
          />
          <button className="btn btn-primary" onClick={handleSaveKey} style={{ flexShrink: 0 }}>
            {saved ? <CheckCircle size={16} /> : <Save size={16} />}
            {saved ? 'Saved!' : 'Save'}
          </button>
        </div>
        {!getApiKey() && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8, marginTop: 12,
            color: 'var(--color-warning)', fontSize: '0.85rem',
          }}>
            <AlertTriangle size={16} />
            API key not set. PDF extraction and AI features require a valid key.
          </div>
        )}
      </div>

      {/* Model Selection */}
      <div className="card" style={{ marginBottom: 20 }}>
        <h3 style={{ marginBottom: 12 }}>AI Model</h3>
        <select
          className="input"
          value={model}
          onChange={(e) => { setModelState(e.target.value); setModel(e.target.value); }}
          style={{ width: 'auto' }}
        >
          {cfg.models.map((m) => (
            <option key={m.value} value={m.value}>{m.label}</option>
          ))}
        </select>
      </div>

      {/* Data Overview */}
      <div className="card" style={{ marginBottom: 20 }}>
        <h3 style={{ marginBottom: 12 }}>Your Data</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div style={{ padding: 12, background: 'var(--color-surface-alt)', borderRadius: 'var(--radius-md)' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{words.length}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Words saved</div>
          </div>
          <div style={{ padding: 12, background: 'var(--color-surface-alt)', borderRadius: 'var(--radius-md)' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{sources.length}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Sources uploaded</div>
          </div>
        </div>
      </div>

      {/* Export */}
      <div className="card" style={{ marginBottom: 20 }}>
        <h3 style={{ marginBottom: 12 }}>
          <Download size={18} style={{ display: 'inline', marginRight: 8 }} />
          Export Data
        </h3>
        <div style={{ display: 'flex', gap: 12 }}>
          <button className="btn btn-secondary" onClick={exportCSV} disabled={words.length === 0}>
            Export CSV
          </button>
          <button className="btn btn-secondary" onClick={exportAnki} disabled={words.length === 0}>
            Export for Anki
          </button>
        </div>
        {words.length === 0 && (
          <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: 8 }}>
            Add words to your bank before exporting.
          </p>
        )}
      </div>

      {/* Sign Out */}
      <div className="card">
        <button
          className="btn btn-secondary"
          style={{ color: 'var(--color-danger)', borderColor: 'var(--color-danger)', width: '100%' }}
          onClick={() => supabase.auth.signOut()}
        >
          <LogOut size={16} />
          Sign Out
        </button>
      </div>
    </div>
  );
}
