import { useState, useEffect, useRef } from 'react';
import { api } from '../api';
import { useApp } from '../context/AppContext';
import { Bot } from 'lucide-react';

export default function AIChat() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);
  const { showToast } = useApp();

  useEffect(() => {
    loadHistory();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadHistory = async () => {
    try {
      const history = await api.getAiHistory();
      setMessages(history.map(m => ({ role: m.role, content: m.content })));
    } catch {}
  };

  const sendMessage = async (msg) => {
    if (!msg || sending) return;
    setSending(true);
    setMessages(prev => [...prev, { role: 'user', content: msg }]);
    try {
      const res = await api.aiChat(msg);
      if (res.response) {
        setMessages(prev => [...prev, { role: 'assistant', content: res.response }]);
      }
    } catch (err) {
      showToast(err.message || 'Xatolik', 'error');
      setMessages(prev => [...prev, { role: 'assistant', content: err.message || 'Xatolik yuz berdi. Qaytadan urinib ko\'ring.' }]);
    } finally {
      setSending(false);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || sending) return;
    const userMsg = input.trim();
    setInput('');
    await sendMessage(userMsg);
  };

  const handleClear = async () => {
    if (!confirm('Chat tarixini tozalashni xohlaysizmi?')) return;
    try {
      await api.clearAiHistory();
      setMessages([]);
      showToast('Chat tarixi tozalandi');
    } catch {
      showToast('Xatolik', 'error');
    }
  };

  const quickActions = [
    { label: "Bugungi savdo", msg: "Bugungi savdo haqida ma'lumot ber" },
    { label: "Oylik hisobot", msg: "Oylik hisobotni ko'rsat" },
    { label: "Nasiya qarzi", msg: "Nasiya qarzi qancha?" },
    { label: "Kam qolganlar", msg: "Kam qolgan mahsulotlar" },
    { label: "Foyda", msg: "Shu oylik foyda qancha?" },
    { label: "Yordam", msg: "Nima qila olasan?" }
  ];

  return (
    <div>
      <div className="page-header flex-between">
        <div>
          <h1>AI Yordamchi</h1>
          <p>Savdo tizimi bo'yicha savol-javob</p>
        </div>
        <button className="btn btn-outline btn-sm" onClick={handleClear}>Tozalash</button>
      </div>

      <div className="card ai-chat-card" style={{ maxWidth: 700, margin: '0 auto', display: 'flex', flexDirection: 'column', height: 'calc(100vh - 200px)' }}>
        <div style={{ flex: 1, overflow: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {messages.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: 48, marginBottom: 16, color: 'var(--secondary)' }}><Bot size={48} /></div>
              <h3 style={{ color: 'var(--text-secondary)', marginBottom: 8 }}>AI Yordamchiga xush kelibsiz!</h3>
              <p style={{ marginBottom: 24, fontSize: 14 }}>Savdo, nasiya, mahsulotlar haqida savol bering</p>
            </div>
          )}

          {messages.map((msg, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                animation: 'slideUp 0.3s ease'
              }}
            >
              <div style={{
                maxWidth: '80%',
                padding: '12px 16px',
                borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                background: msg.role === 'user'
                  ? 'var(--primary)'
                  : 'var(--bg-secondary)',
                color: msg.role === 'user' ? 'white' : 'var(--text-primary)',
                border: msg.role === 'user' ? 'none' : '1px solid var(--border)',
                whiteSpace: 'pre-wrap',
                lineHeight: 1.5,
                fontSize: 14
              }}>
                {msg.content}
              </div>
            </div>
          ))}

          {sending && (
            <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
              <div style={{
                padding: '12px 16px',
                borderRadius: '16px 16px 16px 4px',
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border)',
                display: 'flex',
                gap: 4,
                alignItems: 'center'
              }}>
                <div className="typing-dot" style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--text-muted)', animation: 'typingBounce 1.4s infinite ease-in-out' }}></div>
                <div className="typing-dot" style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--text-muted)', animation: 'typingBounce 1.4s infinite ease-in-out 0.2s' }}></div>
                <div className="typing-dot" style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--text-muted)', animation: 'typingBounce 1.4s infinite ease-in-out 0.4s' }}></div>
              </div>
            </div>
          )}

          {!sending && (
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 8,
              justifyContent: 'center',
              padding: '12px 8px',
              marginTop: 12,
              borderTop: messages.length > 0 ? '1px dashed var(--border)' : 'none',
              animation: 'slideUp 0.3s ease'
            }}>
              {quickActions.map((action, i) => (
                <button
                  key={i}
                  className="btn btn-outline btn-sm"
                  onClick={() => sendMessage(action.msg)}
                  style={{ borderRadius: 20, fontSize: 12 }}
                >
                  {action.label}
                </button>
              ))}
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        <div style={{ padding: 16, borderTop: '1px solid var(--border)', display: 'flex', gap: 8 }}>
          <input
            className="input"
            style={{ flex: 1 }}
            placeholder="Savolingizni yozing..."
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSend()}
            disabled={sending}
          />
          <button
            className="btn btn-primary"
            onClick={handleSend}
            disabled={sending || !input.trim()}
          >
            {sending ? '...' : 'Yuborish'}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes typingBounce {
          0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
          40% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
