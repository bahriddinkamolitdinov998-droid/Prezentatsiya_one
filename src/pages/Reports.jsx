import { useState, useEffect, useCallback } from 'react';
import { api } from '../api';
import { useApp } from '../context/AppContext';
import { Package, Trash2, Coins, Banknote, LayoutDashboard, ClipboardList, EllipsisVertical } from 'lucide-react';

const emptyStats = { totalSales: 0, totalCash: 0, totalCard: 0, totalNasiya: 0, totalProfit: 0, salesCount: 0 };

export default function Reports() {
  const [activeTab, setActiveTab] = useState('daily');
  const [dailyStats, setDailyStats] = useState(emptyStats);
  const [monthlyStats, setMonthlyStats] = useState(emptyStats);
  const [sales, setSales] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [loading, setLoading] = useState(true);
  const [selectedSales, setSelectedSales] = useState([]);
  const [openMenu, setOpenMenu] = useState(null);
  const { showToast, requireAdmin } = useApp();

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      if (activeTab === 'daily') {
        const [s, sl] = await Promise.allSettled([
          api.getDailyStats(),
          api.getSales({ date: new Date().toISOString().split('T')[0] })
        ]);
        if (s.status === 'fulfilled') setDailyStats(s.value);
        if (sl.status === 'fulfilled') setSales(sl.value);
      } else {
        const [s, sl] = await Promise.allSettled([
          api.getMonthlyStats(selectedMonth),
          api.getSales({ month: selectedMonth })
        ]);
        if (s.status === 'fulfilled') setMonthlyStats(s.value);
        if (sl.status === 'fulfilled') setSales(sl.value);
      }
    } catch {} finally {
      setLoading(false);
    }
  }, [activeTab, selectedMonth]);

  useEffect(() => { setSelectedSales([]); loadData(); }, [activeTab, selectedMonth, loadData]);

  useEffect(() => {
    const close = () => setOpenMenu(null);
    if (openMenu !== null) document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [openMenu]);

  const stats = activeTab === 'daily' ? dailyStats : monthlyStats;

  const toggleSale = (id) => {
    setSelectedSales(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const toggleAllSales = () => {
    if (selectedSales.length === sales.length) {
      setSelectedSales([]);
    } else {
      setSelectedSales(sales.map(s => s.id));
    }
  };

  const handleArchiveSelected = async () => {
    if (selectedSales.length === 0) return;
    if (!confirm(`${selectedSales.length} ta sotishni arxivga qo'shishni xohlaysizmi?`)) return;
    requireAdmin(async () => {
      try {
        const res = activeTab === 'daily'
          ? await api.archiveDailySale(selectedSales)
          : await api.archiveSales(selectedSales);
        showToast(res.message || 'Arxivlandi');
        setSelectedSales([]);
        loadData();
      } catch {
        showToast('Xatolik', 'error');
      }
    });
  };

  const handleArchiveSingle = async (id) => {
    if (!confirm("Ushbu savdoni arxivlashni xohlaysizmi?")) return;
    requireAdmin(async () => {
      try {
        const res = activeTab === 'daily'
          ? await api.archiveDailySale([id])
          : await api.archiveSales([id]);
        showToast(res.message || 'Arxivlandi');
        loadData();
      } catch {
        showToast('Xatolik', 'error');
      }
    });
  };

  const handleDeleteSelected = async () => {
    if (selectedSales.length === 0) return;
    if (!confirm(`${selectedSales.length} ta sotishni butunlay o'chirishni xohlaysizmi?`)) return;
    requireAdmin(async () => {
      try {
        for (const id of selectedSales) {
          await api.deleteSale(id);
        }
        showToast(`${selectedSales.length} ta sotish o'chirildi`);
        setSelectedSales([]);
        loadData();
      } catch {
        showToast('Xatolik', 'error');
      }
    });
  };

  const handleDeleteSingle = async (id) => {
    if (!confirm("Ushbu savdoni butunlay o'chirishni xohlaysizmi?")) return;
    requireAdmin(async () => {
      try {
        await api.deleteSale(id);
        showToast('Savdo o\'chirildi');
        loadData();
      } catch {
        showToast('Xatolik', 'error');
      }
    });
  };

  const handleArchiveAll = async () => {
    if (sales.length === 0) return;
    if (!confirm(`Barcha ${sales.length} ta sotishni arxivga qo'shishni xohlaysizmi?`)) return;
    requireAdmin(async () => {
      try {
        const res = activeTab === 'daily'
          ? await api.archiveDailySale(sales.map(s => s.id))
          : await api.archiveSales(sales.map(s => s.id));
        showToast(res.message || 'Arxivlandi');
        setSelectedSales([]);
        loadData();
      } catch {
        showToast('Xatolik', 'error');
      }
    });
  };

  const handleDeleteAll = async () => {
    if (sales.length === 0) return;
    if (!confirm(`Barcha ${sales.length} ta sotishni butunlay o'chirishni xohlaysizmi?`)) return;
    requireAdmin(async () => {
      try {
        for (const s of sales) {
          await api.deleteSale(s.id);
        }
        showToast(`${sales.length} ta sotish o'chirildi`);
        setSelectedSales([]);
        loadData();
      } catch {
        showToast('Xatolik', 'error');
      }
    });
  };

  const dropdownStyle = {
    position: 'absolute', top: '100%', right: 0, marginTop: 4,
    background: 'var(--bg-secondary)', border: '1.5px solid var(--border)',
    borderRadius: 'var(--radius-sm)', minWidth: 180, zIndex: 50,
    boxShadow: '0 8px 24px rgba(0,0,0,0.3)', overflow: 'hidden'
  };

  const dropdownItemStyle = (color) => ({
    display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
    cursor: 'pointer', fontSize: 13, fontWeight: 500, color: color || 'var(--text)',
    transition: 'background 0.15s', border: 'none', background: 'none',
    width: '100%', textAlign: 'left', fontFamily: 'inherit'
  });

  return (
    <div>
      <div className="page-header reports-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1>Savdo Hisoboti</h1>
          <p>Kunlik va oylik savdo ma'lumotlari</p>
        </div>
        <div className="reports-actions" style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <button className="btn btn-sm" style={{ background: 'var(--success)', color: '#0F0F1A', fontWeight: 600, fontSize: 12 }} onClick={() => {
            if (sales.length === 0) return;
            if (!confirm(`Joriy ${activeTab === 'daily' ? 'kun' : 'oy'} bo'yicha ${sales.length} ta sotishni arxivga qo'shishni xohlaysizmi?`)) return;
            requireAdmin(async () => {
              try {
                const res = activeTab === 'daily'
                  ? await api.archiveDailySale(sales.map(s => s.id))
                  : await api.archiveSales(sales.map(s => s.id));
                showToast(res.message || 'Arxivlandi');
                loadData();
              } catch {
                showToast('Xatolik', 'error');
              }
            });
          }}><Package size={14} /> Arxivlash</button>
          <button className="btn btn-sm btn-danger" style={{ fontWeight: 600, fontSize: 12 }} onClick={() => {
            if (sales.length === 0) return;
            if (!confirm(`Joriy ${activeTab === 'daily' ? 'kun' : 'oy'} bo'yicha barcha savdolarni arxivlab, ro'yxatdan o'chirishni xohlaysizmi?`)) return;
            requireAdmin(async () => {
              try {
                if (activeTab === 'daily') {
                  await api.cleanDaily();
                } else {
                  await api.cleanMonthly();
                }
                showToast("Ma'lumotlar arxivlandi va faol ro'yxatdan o'chirildi");
                loadData();
              } catch {
                showToast('Xatolik', 'error');
              }
            });
          }}><Trash2 size={14} /> Arxivlash va O'chirish</button>
        </div>
      </div>

      <div className="tabs" style={{ maxWidth: 400, marginBottom: 24 }}>
        <button className={`tab ${activeTab === 'daily' ? 'active' : ''}`} onClick={() => setActiveTab('daily')}>
          Kunlik
        </button>
        <button className={`tab ${activeTab === 'monthly' ? 'active' : ''}`} onClick={() => setActiveTab('monthly')}>
          Oylik
        </button>
      </div>

      {activeTab === 'monthly' && (
        <div className="input-group" style={{ maxWidth: 300, marginBottom: 24 }}>
          <label>Oy</label>
          <input
            className="input"
            type="month"
            value={selectedMonth}
            onChange={e => setSelectedMonth(e.target.value)}
          />
        </div>
      )}

      {loading ? (
        <div className="loading-screen" style={{ position: 'relative' }}>
          <div className="loader"></div>
          <div className="text">Hisobot yuklanmoqda...</div>
        </div>
      ) : (
        <>
          <div className="stat-cards">
            <div className="stat-card purple">
              <div className="icon"><Coins size={22} /></div>
              <div className="value">{(stats.totalSales || 0).toLocaleString()} so'm</div>
              <div className="label">Jami savdo</div>
            </div>
            <div className="stat-card green">
              <div className="icon"><Banknote size={22} /></div>
              <div className="value">{(stats.totalCash || 0).toLocaleString()} so'm</div>
              <div className="label">Naqd pul</div>
            </div>
            <div className="stat-card pink">
              <div className="icon"><LayoutDashboard size={22} /></div>
              <div className="value">{(stats.totalProfit || 0).toLocaleString()} so'm</div>
              <div className="label">Foyda</div>
            </div>
            <div className="stat-card yellow">
              <div className="icon"><ClipboardList size={22} /></div>
              <div className="value">{stats.salesCount || 0}</div>
              <div className="label">Tranzaksiyalar</div>
            </div>
          </div>

          <div className="grid-2" style={{ marginTop: 24 }}>
            <div className="card">
              <h3 style={{ marginBottom: 16 }}>To'lov turlari bo'yicha</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div className="flex-between" style={{ padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
                  <span>Naqd</span>
                  <span className="text-success" style={{ fontWeight: 700 }}>{(stats.totalCash || 0).toLocaleString()} so'm</span>
                </div>
                <div className="flex-between" style={{ padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
                  <span>Plastik</span>
                  <span style={{ color: 'var(--primary-light)', fontWeight: 700 }}>{(stats.totalCard || 0).toLocaleString()} so'm</span>
                </div>
                <div className="flex-between" style={{ padding: '12px 0' }}>
                  <span>Nasiya</span>
                  <span className="text-danger" style={{ fontWeight: 700 }}>{(stats.totalNasiya || 0).toLocaleString()} so'm</span>
                </div>
              </div>
            </div>

            <div className="card">
              <h3 style={{ marginBottom: 16 }}>Savdo tahlili</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div className="flex-between" style={{ padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
                  <span>Jami tranzaksiya</span>
                  <span style={{ fontWeight: 700 }}>{stats.salesCount || 0} ta</span>
                </div>
                <div className="flex-between" style={{ padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
                  <span>O'rtacha tranzaksiya</span>
                  <span style={{ fontWeight: 700 }}>
                    {stats.salesCount > 0 ? Math.round(stats.totalSales / stats.salesCount).toLocaleString() : 0} so'm
                  </span>
                </div>
                <div className="flex-between" style={{ padding: '12px 0' }}>
                  <span>Foiz daromad</span>
                  <span style={{ fontWeight: 700, color: 'var(--secondary)' }}>
                    {stats.totalSales > 0 ? ((stats.totalProfit / stats.totalSales) * 100).toFixed(1) : 0}%
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="card" style={{ marginTop: 24, position: 'relative' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3>So'nggi tranzaksiyalar</h3>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                {selectedSales.length > 0 && (
                  <>
                    <button className="btn btn-sm" style={{ background: 'var(--success)', color: '#0F0F1A', fontWeight: 600, fontSize: 12 }} onClick={handleArchiveSelected}>
                      <Package size={14} /> Arxivlash ({selectedSales.length})
                    </button>
                    <button className="btn btn-sm" style={{ background: 'var(--danger)', color: 'white', fontWeight: 600, fontSize: 12 }} onClick={handleDeleteSelected}>
                      <Trash2 size={14} /> O'chirish ({selectedSales.length})
                    </button>
                    <button className="btn btn-outline btn-sm" onClick={() => setSelectedSales([])} style={{ fontSize: 12 }}>
                      Bekor
                    </button>
                  </>
                )}
                <div style={{ position: 'relative' }}>
                  <button
                    onClick={(e) => { e.stopPropagation(); setOpenMenu(openMenu === 'reports' ? null : 'reports'); }}
                    style={{
                      width: 32, height: 32, borderRadius: 'var(--radius-sm)',
                      background: openMenu === 'reports' ? 'var(--bg-input)' : 'transparent',
                      border: '1.5px solid var(--border)', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 16, fontWeight: 700, color: 'var(--text-secondary)',
                      transition: 'all 0.2s'
                    }}
                  >
                    <EllipsisVertical size={18} />
                  </button>
                  {openMenu === 'reports' && (
                    <div style={dropdownStyle} onClick={e => e.stopPropagation()}>
                       <button style={dropdownItemStyle('var(--success)')} onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-input)'} onMouseLeave={e => e.currentTarget.style.background = 'none'} onClick={handleArchiveAll}>
                         <Package size={14} /> Barchasini arxivlash
                       </button>
                       <button style={dropdownItemStyle('var(--danger)')} onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-input)'} onMouseLeave={e => e.currentTarget.style.background = 'none'} onClick={handleDeleteAll}>
                         <Trash2 size={14} /> Barchasini o'chirish
                       </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th style={{ width: 40 }}>
                      <input
                        type="checkbox"
                        checked={sales.length > 0 && selectedSales.length === sales.length}
                        onChange={toggleAllSales}
                        style={{ width: 14, height: 14, accentColor: '#00B894', cursor: 'pointer' }}
                      />
                    </th>
                    <th>Sana</th>
                    <th>Mahsulotlar</th>
                    <th>Jami</th>
                    <th>To'lov</th>
                    <th>Turi</th>
                    <th>Amallar</th>
                  </tr>
                </thead>
                <tbody>
                  {sales.slice(0, 20).map(sale => (
                    <tr key={sale.id}>
                      <td>
                        <input
                          type="checkbox"
                          checked={selectedSales.includes(sale.id)}
                          onChange={() => toggleSale(sale.id)}
                          style={{ width: 14, height: 14, accentColor: '#00B894', cursor: 'pointer' }}
                        />
                      </td>
                      <td>{new Date(sale.created_at).toLocaleString('uz-UZ', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}</td>
                      <td>{sale.items.map(i => `${i.name} x${i.quantity}`).join(', ')}</td>
                      <td style={{ fontWeight: 600 }}>{sale.total.toLocaleString()} so'm</td>
                      <td className="text-success">{sale.paid.toLocaleString()} so'm</td>
                      <td>
                        <span style={{
                          padding: '4px 10px',
                          borderRadius: 20,
                          fontSize: 12,
                          fontWeight: 600,
                          background: sale.payment_type === 'cash' ? 'rgba(0,184,148,0.15)' :
                                      sale.payment_type === 'card' ? 'rgba(108,92,231,0.15)' : 'rgba(253,121,168,0.15)',
                          color: sale.payment_type === 'cash' ? 'var(--success)' :
                                sale.payment_type === 'card' ? 'var(--primary-light)' : 'var(--accent)'
                        }}>
                          {sale.payment_type === 'cash' ? 'Naqd' :
                           sale.payment_type === 'card' ? 'Karta' : 'Nasiya'}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button
                            className="btn btn-sm"
                            style={{ background: 'var(--success)', color: '#0F0F1A', fontWeight: 600, fontSize: 11, padding: '4px 8px' }}
                            onClick={() => handleArchiveSingle(sale.id)}
                          >
                            <Package size={11} /> Arxiv
                          </button>
                          <button
                            className="btn btn-sm"
                            style={{ background: 'var(--danger)', color: 'white', fontWeight: 600, fontSize: 11, padding: '4px 8px' }}
                            onClick={() => handleDeleteSingle(sale.id)}
                          >
                            <Trash2 size={11} /> O'chirish
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {sales.length === 0 && (
                    <tr>
                      <td colSpan="7" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 32 }}>
                        Tranzaksiyalar yo'q
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
