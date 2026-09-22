import { useState, useEffect, useCallback } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext';
import { checkServer, onServerStatusChange } from './api';
import SplashScreen from './components/SplashScreen';
import Dashboard from './pages/Dashboard';
import POS from './pages/POS';
import Nasiya from './pages/Nasiya';
import Reports from './pages/Reports';
import Admin from './pages/Admin';
import AIChat from './pages/AIChat';
import Distributions from './pages/Distributions';
import Kassa from './pages/Kassa';
import { LayoutDashboard, ShoppingCart, Package, Banknote, Notebook, TrendingUp, Settings, Bot, CircleCheckBig, CircleX, Info, Lock, Monitor, RefreshCw } from 'lucide-react';
import './index.css';

const navItems = [
  { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/pos', icon: ShoppingCart, label: 'Sotish' },
  { path: '/distributions', icon: Package, label: "Tarqatish" },
  { path: '/kassa', icon: Banknote, label: 'Kassa' },
  { path: '/nasiya', icon: Notebook, label: 'Nasiya' },
  { path: '/reports', icon: TrendingUp, label: 'Hisobot' },
  { path: '/admin', icon: Settings, label: 'Admin' },
  { path: '/chat', icon: Bot, label: 'AI Chat' },
];




function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { cartCount } = useApp();

  return (
    <nav className="sidebar">
      <div className="sidebar-logo" onClick={() => navigate('/')}>S</div>
      <div className="sidebar-nav">
        {navItems.map(item => (
          <button
            key={item.path}
            className={`nav-item ${location.pathname === item.path ? 'active' : ''}`}
            onClick={() => navigate(item.path)}
            title={item.label}
          >
            <item.icon size={20} />
            {item.path === '/pos' && cartCount > 0 && (
              <span className="badge">{cartCount}</span>
            )}
          </button>
        ))}
      </div>
    </nav>
  );
}

function Toast() {
  const { toast } = useApp();
  if (!toast) return null;
  return (
    <div className="toast-container">
      <div className={`toast ${toast.type}`}>
        {toast.type === 'success' ? <CircleCheckBig size={18} /> : toast.type === 'error' ? <CircleX size={18} /> : <Info size={18} />}
        {toast.message}
      </div>
    </div>
  );
}

function LoginModal() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { showLoginModal, setShowLoginModal, loginAdmin, loginCallback, setLoginCallback } = useApp();

  if (!showLoginModal) return null;

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const result = await loginAdmin(password);
    setLoading(false);
    if (result.ok) {
      setShowLoginModal(false);
      setPassword('');
      if (loginCallback) {
        loginCallback();
        setLoginCallback(null);
      }
    } else {
      setError(result.error);
    }
  };

  const handleClose = () => {
    setShowLoginModal(false);
    setPassword('');
    setError('');    
    setLoginCallback(null);
  };

  return (
    <div className="modal-overlay" onMouseDown={handleClose}>
      <div className="modal" style={{ maxWidth: 380 }} onClick={e => e.stopPropagation()} onMouseDown={e => e.stopPropagation()}>
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{ fontSize: 40, marginBottom: 8, color: 'var(--primary-light)' }}><Lock size={40} /></div>
          <h2 style={{ marginBottom: 4 }}>Admin kirish</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Davom etish uchun admin parolni kiriting</p>
        </div>
        <form onSubmit={handleLogin}>
          <div className="input-group">
            <label>Parol</label>
            <input
              className="input"
              type="password"
              placeholder="Admin parol"
              value={password}
              onChange={e => { setPassword(e.target.value); setError(''); }}
              autoFocus
            />
          </div>
          {error && <p style={{ color: 'var(--danger)', fontSize: 13, marginTop: 8 }}>{error}</p>}
          <div className="modal-actions" style={{ marginTop: 16 }}>
            <button type="button" className="btn btn-outline" onClick={handleClose}>Bekor</button>
            <button type="submit" className="btn btn-primary" disabled={loading || !password}>
              {loading ? 'Tekshirilmoqda...' : 'Kirish'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AppLayout() {
  const [online, setOnline] = useState(navigator.onLine);
  const [serverOnline, setServerOnline] = useState(true);

  useEffect(() => {
    const handleOnline = () => { setOnline(true); checkServer(); };
    const handleOffline = () => setOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    const unsub = onServerStatusChange(setServerOnline);
    checkServer();
    const timer = setInterval(() => checkServer(), 8000);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      unsub();
      clearInterval(timer);
    };
  }, []);

  const isServerDown = !serverOnline;
  const isOfflineOnly = !online && serverOnline;

  return (
    <div className="app-layout">
      {isServerDown && (
        <div className="server-down-overlay">
          <div className="server-down-card">
            <div className="server-down-icon">
              <Monitor size={36} color="var(--text)" />
              <i className="pulse-ring"></i>
            </div>
            <h2>Lokal serverga ulanib bo'lmadi</h2>
            <p>
              Savdo tizimining ma'lumotlar bazasi va backend qismi o'chiq holatda. 
              Tizim ishlashi uchun serverni ishga tushirish lozim.
            </p>
            <div className="instruction-box">
              <span className="step-title">Qadamlar:</span>
              <ol>
                <li>Ishchi stoldagi yoki loyiha papkasidagi <strong>start.bat</strong> faylini ikki marta bosing.</li>
                <li>Qora oyna (Terminal) ochilgach, uni yopmang, shunchaki pastga tushirib qo'ying (minimize).</li>
                <li>Ushbu oynadagi qayta urinish tugmasini bosing.</li>
              </ol>
            </div>
            <button className="server-retry-btn" onClick={() => { checkServer(); window.location.reload(); }}>
              <RefreshCw size={16} /> Qayta urinish
            </button>
          </div>
        </div>
      )}

      {isOfflineOnly && (
        <div className="offline-pill-indicator" title="Tizim lokal rejimda ishlamoqda. Ma'lumotlaringiz xavfsiz saqlanadi.">
          <span className="status-dot orange"></span>
          <span className="pill-text">Avtonom rejim (Internet yo'q)</span>
        </div>
      )}
      <Sidebar />
      <main className="main-content">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/pos" element={<POS />} />
          <Route path="/distributions" element={<Distributions />} />
          <Route path="/kassa" element={<Kassa />} />
          <Route path="/nasiya" element={<Nasiya />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/chat" element={<AIChat />} />
        </Routes>
      </main>
      <Toast />
      <LoginModal />
    </div>
  );
}

function App() {
  const [splashDone, setSplashDone] = useState(false);
  const handleSplashComplete = useCallback(() => setSplashDone(true), []);

  return (
    <BrowserRouter>
      {!splashDone && <SplashScreen onComplete={handleSplashComplete} />}
      <AppProvider>
        <AppLayout />
      </AppProvider>
    </BrowserRouter>
  );
}

export default App;
