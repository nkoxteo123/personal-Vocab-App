import { useEffect, useState } from 'react';
import { Loader2, CheckCircle, AlertTriangle, RefreshCw, X } from 'lucide-react';
import { onAIStatus, type AIStatus } from '../../services/gemini';

export default function AIStatusBar() {
  const [status, setStatus] = useState<AIStatus | null>(null);
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const unsub = onAIStatus((s) => {
      setStatus(s);
      setVisible(true);
      setDismissed(false);

      // Auto-hide success after 4s
      if (s.state === 'success') {
        setTimeout(() => setVisible(false), 4000);
      }
    });
    return () => { unsub(); };
  }, []);

  const dismiss = () => {
    setVisible(false);
    setDismissed(true);
  };

  if (!visible || dismissed || !status) return null;

  const getIcon = (state: AIStatus['state']) => {
    switch (state) {
      case 'pending': return <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />;
      case 'retrying': return <RefreshCw size={16} style={{ animation: 'spin 2s linear infinite', color: '#f59e0b' }} />;
      case 'success': return <CheckCircle size={16} style={{ color: '#22c55e' }} />;
      case 'error': return <AlertTriangle size={16} style={{ color: '#ef4444' }} />;
      default: return null;
    }
  };

  const getBorderColor = (state: AIStatus['state']) => {
    switch (state) {
      case 'pending': return 'var(--color-primary)';
      case 'retrying': return '#f59e0b';
      case 'success': return '#22c55e';
      case 'error': return '#ef4444';
      default: return 'var(--color-border)';
    }
  };

  return (
    <div style={{
      position: 'fixed',
      bottom: 16,
      right: 16,
      zIndex: 100,
      width: 340,
      borderRadius: 12,
      boxShadow: '0 4px 24px rgba(0,0,0,0.12)',
      border: `1.5px solid ${getBorderColor(status.state)}`,
      background: 'var(--color-surface)',
      padding: '12px 16px',
      fontFamily: 'var(--font-body)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {getIcon(status.state)}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '0.85rem', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {status.message}
          </div>
        </div>
        {/* Big visible close button */}
        <button
          onClick={dismiss}
          style={{
            background: 'var(--color-surface-alt)',
            border: '1px solid var(--color-border)',
            borderRadius: 6,
            cursor: 'pointer',
            padding: '4px 6px',
            display: 'flex',
            alignItems: 'center',
            color: 'var(--color-text-muted)',
          }}
          title="Dismiss"
        >
          <X size={16} />
        </button>
      </div>
      {status.detail && (
        <div style={{
          fontSize: '0.75rem',
          color: 'var(--color-text-muted)',
          marginTop: 6,
          maxHeight: 40,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}>
          {status.detail}
        </div>
      )}
    </div>
  );
}
