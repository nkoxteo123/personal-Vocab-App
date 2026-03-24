import { useState, useRef, useEffect } from 'react';
import { Send, Bot, Loader2 } from 'lucide-react';
import { chatWithAI } from '../services/gemini';
import { getWordCount, getAllWords } from '../services/storage';

interface Message {
  role: 'user' | 'ai';
  text: string;
}

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'ai', text: 'Xin chào! Tôi là AI hỗ trợ học tiếng Anh của bạn. Hãy hỏi tôi bất cứ điều gì về từ vựng, ngữ pháp, hoặc cách dùng từ nhé! 🎓' },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMsg = input.trim();
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', text: userMsg }]);
    setLoading(true);

    try {
      const wordCount = await getWordCount();
      const allWords = await getAllWords();
      const tags = [...new Set(allWords.flatMap((w) => w.tags))].slice(0, 10);

      const response = await chatWithAI(userMsg, wordCount, tags);
      setMessages((prev) => [...prev, { role: 'ai', text: response }]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: 'ai', text: `Error: ${err instanceof Error ? err.message : 'Could not get response from AI.'}` },
      ]);
    }

    setLoading(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 64px)' }}>
      <div style={{ marginBottom: 16 }}>
        <h1 style={{ fontSize: '2rem', marginBottom: 4 }}>AI Chat</h1>
        <p style={{ color: 'var(--color-text-muted)' }}>
          Ask anything about vocabulary, grammar, or usage
        </p>
      </div>

      {/* Messages */}
      <div className="card" style={{
        flex: 1, padding: 0, display: 'flex', flexDirection: 'column',
        minHeight: 0, overflow: 'hidden',
      }}>
        <div className="chat-messages">
          {messages.map((msg, i) => (
            <div key={i} className={`chat-bubble ${msg.role === 'user' ? 'user' : 'ai'}`}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                {msg.role === 'ai' && <Bot size={16} style={{ flexShrink: 0, marginTop: 2 }} />}
                <div style={{ whiteSpace: 'pre-wrap' }}>{msg.text}</div>
              </div>
            </div>
          ))}
          {loading && (
            <div className="chat-bubble ai">
              <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="chat-input-bar">
          <input
            className="input"
            placeholder="Ask about a word, grammar rule, or anything..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
            disabled={loading}
          />
          <button
            className="btn btn-primary"
            onClick={sendMessage}
            disabled={loading || !input.trim()}
            style={{ flexShrink: 0 }}
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
