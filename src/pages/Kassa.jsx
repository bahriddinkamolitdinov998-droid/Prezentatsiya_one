import { useState, useEffect, useCallback } from 'react';
import { api } from '../api';
import { useApp } from '../context/AppContext';
import { Coins, CreditCard, Notebook, Lock, Receipt } from 'lucide-react';

const fmt = (n) => (Number(n) || 0).toLocaleString() + " so'm";

const fmtTime = (d) => {
  if (!d) return '—';
  return new Date(d).toLocaleString('uz-UZ', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
};

export default function Kassa() {
  const { requireAdmin, showToast } = useApp();
  const [current, setCurrent] = useState(null);
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showOpen, setShowOpen] = useState(false);
  const [showClose, setShowClose] = useState(false);
  const [form, setForm] = useState({ opening_balance: '', closing_balance: '', note: '' });
  const [busy, setBusy] = useState(false);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [c, h] = await Promise.allSettled([api.getCurrentKassa(), api.getKassaShifts()]);
      if (c.status === 'fulfilled') setCurrent(c.value);
      if (h.status === 'fulfilled') setShifts(h.value);
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleOpen = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await api.openKassa({ opening_balance: Number(form.opening_balance) || 0, note: form.note });
      setShowOpen(false);
      setForm({ ...form, opening_balance: '', note: '' });
      showToast('Kassa ochildi');
      loadAll();
    } catch (err) { showToast(err.message || 'Xatolik', 'error'); }
    finally { setBusy(false); }
  };

  const handleClose = async () => {
    if (busy) return;
    if (!current) return;
    if (form.closing_balance === '' || isNaN(Number(form.closing_balance))) {
      showToast('Yopish balansini kiriting', 'error');
      return;
    }
    setBusy(true);
    try {
      await api.closeKassa({ closing_balance: Number(form.closing_balance), note: form.note });
      setShowClose(false);
      setForm({ closing_balance: '', note: '' });
      showToast('Kassa yopildi');
      loadAll();
    } catch (err) { showToast(err.message || 'Xatolik', 'error'); }
    finally { setBusy(false); }
  };

  if (loading) {
    return <div className="loading-screen"><div className="loader"></div><div className="text">Yuklanmoqda...</div></div>;
  }

  const st = current?.stats;
  const openElapsed = current ? Math.floor((Date.now() - new Date(current.opened_at).getTime()) / 60000) : 0;

  return (
    <div>
      <div className="page-header">
        <h1>Kassa Kabineti</h1>
        <p>Kassa smenasini ochish, yopish va balansni kuzatish</p>
      </div>

      {current ? (
        <div className="card" style={{ borderLeft: '4px solid var(--success)', marginBottom: 20 }}>
          <div className="flex-between" style={{ marginBottom: 16 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--success)', background: 'rgba(0,206,201,0.12)', padding: '4px 10px', borderRadius: 20 }}>
                  ● KASSA OCHIQ
                </span>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Ochilgan: {fmtTime(current.opened_at)}</span>
              </div>
              <h2 style={{ fontSize: 20, fontWeight: 800, marginTop: 8 }}>
                {fmt(st.expected)} <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-muted)' }}>kutilgan balans</span>
              </h2>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                {st.salesCount} ta savdo · {String(Math.floor(openElapsed / 60)).padStart(2, '0')}:{String(openElapsed % 60).padStart(2, '0')} o'tdi
              </div>
            </div>
            <button
              className="btn btn-danger"
              onClick={() => requireAdmin(() => { setForm({ closing_balance: '', note: '' }); setShowClose(true); })}
            >
              Kassani yopish
            </button>
          </div>

          <div className="stat-cards">
            <div className="stat-card purple">
              <div className="icon"><Coins size={22} /></div>
              <div className="value">{fmt(current.opening_balance)}</div>
              <div className="label">Boshlang'ich balans</div>
            </div>
            <div className="stat-card green">
              <div className="icon"><Coins size={22} /></div>
              <div className="value">{fmt(st.cash)}</div>
              <div className="label">Naqd savdo ({st.cashCount} ta)</div>
            </div>
            <div className="stat-card pink">
              <div className="icon"><CreditCard size={22} /></div>
              <div className="value">{fmt(st.card)}</div>
              <div className="label">Karta savdo ({st.cardCount} ta)</div>
            </div>
            <div className="stat-card yellow">
              <div className="icon"><Notebook size={22} /></div>
              <div className="value">{fmt(st.nasiyaPayments)}</div>
              <div className="label">Nasiya to'lovlari ({st.nasiyaPaymentsCount} ta)</div>
            </div>
          </div>
        </div>
      ) : (
        <div className="card" style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 }}><Lock size={18} /> Kassa yopiq</h2>
              <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Ishni boshlash uchun kassani oching.</p>
            </div>
            <button className="btn btn-primary" onClick={() => requireAdmin(() => { setForm({ opening_balance: '', note: '' }); setShowOpen(true); })}>
              + Kassani ochish
            </button>
          </div>
        </div>
      )}

      <div className="card" style={{ marginTop: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700 }}>Smenalar tarixi</h3>
          <span style={{ fontSize: 12, color: 'var(--text-muted)', background: 'var(--bg-input)', padding: '4px 10px', borderRadius: 20 }}>
            {shifts.length} ta
          </span>
        </div>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Ochilgan</th>
                <th>Yopilgan</th>
                <th>Boshlang'ich</th>
                <th>Kutilgan</th>
                <th>Haqiqiy</th>
                <th>Farq</th>
                <th>Holat</th>
              </tr>
            </thead>
            <tbody>
              {shifts.map((s, idx) => {
                const diffColor = s.stats.diff === null ? 'var(--text-muted)' : s.stats.diff === 0 ? 'var(--success)' : s.stats.diff > 0 ? 'var(--success)' : 'var(--danger)';
                return (
                  <tr key={s.id}>
                    <td style={{ fontWeight: 800, color: idx < 3 ? 'var(--primary-light)' : 'var(--text-muted)' }}>{idx + 1}</td>
                    <td>{fmtTime(s.opened_at)}</td>
                    <td>{fmtTime(s.closed_at)}</td>
                    <td style={{ fontWeight: 600 }}>{fmt(s.opening_balance)}</td>
                    <td style={{ fontWeight: 700 }}>{fmt(s.stats.expected)}</td>
                    <td style={{ fontWeight: 600 }}>{s.stats.actual !== null ? fmt(s.stats.actual) : '—'}</td>
                    <td style={{ fontWeight: 700, color: diffColor }}>
                      {s.stats.diff !== null ? (s.stats.diff > 0 ? '+' : '') + fmt(s.stats.diff) : '—'}
                    </td>
                    <td>
                      <span style={{ fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 20, background: s.status === 'open' ? 'rgba(0,206,201,0.12)' : 'var(--bg-input)', color: s.status === 'open' ? 'var(--success)' : 'var(--text-muted)' }}>
                        {s.status === 'open' ? 'Ochiq' : 'Yopiq'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {shifts.length === 0 && (
            <div className="empty-cart" style={{ padding: 40 }}>
              <div className="icon"><Receipt size={48} /></div>
              <p style={{ marginTop: 12, color: 'var(--text-muted)' }}>Hali smena yo'q</p>
            </div>
          )}
        </div>
      </div>

      {showOpen && (
        <div className="modal-overlay" onClick={() => setShowOpen(false)}>
          <div className="modal" style={{ maxWidth: 420 }} onClick={e => e.stopPropagation()}>
            <h2>Kassani ochish</h2>
            <div className="input-group">
              <label>Boshlang'ich balans *</label>
              <input
                className="input" type="number" placeholder="0" autoFocus
                value={form.opening_balance}
                onChange={e => setForm({ ...form, opening_balance: e.target.value })}
              />
            </div>
            <div className="input-group">
              <label>Izoh</label>
              <input className="input" placeholder="Qo'shimcha ma'lumot..." value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} />
            </div>
            <div className="modal-actions">
              <button className="btn btn-outline" onClick={() => setShowOpen(false)}>Bekor</button>
              <button className="btn btn-primary" onClick={handleOpen} disabled={busy}>
                {busy ? 'Ochilmoqda...' : 'Ochish'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showClose && current && (
        <div className="modal-overlay" onClick={() => setShowClose(false)}>
          <div className="modal" style={{ maxWidth: 420 }} onClick={e => e.stopPropagation()}>
            <h2>Kassani yopish</h2>
            <div className="modal-stats-grid">
              <div style={{ padding: '12px 16px', background: 'var(--bg-input)', borderRadius: 'var(--radius-sm)' }}>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Kutilgan balans</div>
                <div style={{ fontWeight: 800, fontSize: 18, color: 'var(--secondary)' }}>{fmt(st.expected)}</div>
              </div>
              <div style={{ padding: '12px 16px', background: 'var(--bg-input)', borderRadius: 'var(--radius-sm)' }}>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Savdolar</div>
                <div style={{ fontWeight: 800, fontSize: 18 }}>{st.salesCount} ta</div>
              </div>
            </div>
            <div className="input-group" style={{ marginTop: 16 }}>
              <label>Haqiqiy hisoblangandagi summa *</label>
              <input
                className="input" type="number" placeholder="Hisoblangan naqd pul" autoFocus
                value={form.closing_balance}
                onChange={e => setForm({ ...form, closing_balance: e.target.value })}
              />
            </div>
            <div className="input-group">
              <label>Izoh</label>
              <input className="input" placeholder="Qo'shimcha ma'lumot..." value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} />
            </div>
            <div className="modal-actions">
              <button className="btn btn-outline" onClick={() => setShowClose(false)}>Bekor</button>
              <button className="btn btn-danger" onClick={handleClose} disabled={busy}>
                {busy ? 'Yopilmoqda...' : 'Yopish'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}