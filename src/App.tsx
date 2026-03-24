import { useAppStore } from './store/useAppStore';
import {
  LayoutDashboard,
  BookOpen,
  Layers,
  PenTool,
  BookMarked,
  MessageCircle,
  Settings,
  Upload,
} from 'lucide-react';
import Dashboard from './pages/Dashboard';
import Flashcards from './pages/Flashcards';
import Notebook from './pages/Notebook';
import Practice from './pages/Practice';
import Reading from './pages/Reading';
import Chat from './pages/Chat';
import SettingsPage from './pages/Settings';
import PDFUploader from './components/shared/PDFUploader';
import AIStatusBar from './components/shared/AIStatusBar';
import AuthOverlay from './components/auth/AuthOverlay';
import { supabase } from './services/supabase';
import { useState, useEffect } from 'react';
import type { AppView } from './types';

const NAV_ITEMS: { key: AppView; label: string; icon: React.ReactNode }[] = [
  { key: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
  { key: 'flashcards', label: 'Flashcards', icon: <Layers size={20} /> },
  { key: 'notebook', label: 'Notebook', icon: <BookOpen size={20} /> },
  { key: 'practice', label: 'Practice', icon: <PenTool size={20} /> },
  { key: 'reading', label: 'Reading', icon: <BookMarked size={20} /> },
  { key: 'chat', label: 'AI Chat', icon: <MessageCircle size={20} /> },
  { key: 'settings', label: 'Settings', icon: <Settings size={20} /> },
];

function App() {
  const { view, setView, user, setUser } = useAppStore();
  const [showUpload, setShowUpload] = useState(false);

  useEffect(() => {
    // Check active session on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    // Listen for auth changes (login/logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, [setUser]);

  if (!user) {
    return <AuthOverlay />;
  }

  const renderView = () => {
    switch (view) {
      case 'dashboard':
        return <Dashboard />;
      case 'flashcards':
        return <Flashcards />;
      case 'notebook':
        return <Notebook />;
      case 'practice':
        return <Practice />;
      case 'reading':
        return <Reading />;
      case 'chat':
        return <Chat />;
      case 'settings':
        return <SettingsPage />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="app-layout">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-brand">
          <h1>VocabAI</h1>
          <p>Personal Vocabulary Learning</p>
        </div>

        <nav className="sidebar-nav">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.key}
              className={`nav-item ${view === item.key ? 'active' : ''}`}
              onClick={() => setView(item.key)}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </nav>

        {/* Upload Button */}
        <div style={{ padding: '12px 10px', borderTop: '1px solid var(--color-border)' }}>
          <button
            className="btn btn-primary"
            style={{ width: '100%' }}
            onClick={() => setShowUpload(true)}
          >
            <Upload size={18} />
            Upload PDF
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        {renderView()}
      </main>

      {/* Upload Modal */}
      {showUpload && (
        <div className="modal-overlay" onClick={() => setShowUpload(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '700px' }}>
            <PDFUploader onClose={() => setShowUpload(false)} />
          </div>
        </div>
      )}

      {/* AI Status Bar */}
      <AIStatusBar />
    </div>
  );
}

export default App;
