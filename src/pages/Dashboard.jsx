import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { api } from '../api';
import { useApp } from '../context/AppContext';
import { Sunrise, Sun, Sunset, Moon, Coins, Banknote, ClipboardList, Notebook, Package, Trash2, Rocket, ShoppingCart, CreditCard, LayoutDashboard, Bot, EllipsisVertical } from 'lucide-react';

export default function Dashboard() {
  const [stats, setStats] = useState({ totalSales: 0, totalCash: 0, totalCard: 0, totalNasiya: 0, totalProfit: 0, salesCount: 0, topProducts: [], recentSales: [] });
  const [monthlyStats, setMonthlyStats] = useState(null);
  const [shopInfo, setShopInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showWelcome, setShowWelcome] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [selectedSales, setSelectedSales] = useState([]);
  const [openMenu, setOpenMenu] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { showToast, requireAdmin } = useApp();

  useEffect(() => {
    loadData();
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    const refreshTimer = setInterval(() => loadData(), 30000);
    return () => { clearInterval(timer); clearInterval(refreshTimer); };
  }, [location.key]);

  useEffect(() => {
    const close = () => setOpenMenu(null);
    if (openMenu !== null) document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [openMenu]);

  const loadData = async () => {
    try {
      const [daily, monthly, shop] = await Promise.allSettled([
        api.getDailyStats(),
        api.getMonthlyStats(new Date().toISOString().slice(0, 7)),
        api.getShopInfo()
      ]);
      if (daily.status === 'fulfilled') setStats(daily.value);
      if (monthly.status === 'fulfilled') setMonthlyStats(monthly.value);
      if (shop.status === 'fulfilled') setShopInfo(shop.value);
    } catch {} finally {
      setLoading(false);
    }
  };

  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour >= 5 && hour < 12) return { text: 'Xayrli ertalab', icon: Sunrise, color: 'rgba(253, 203, 110, 0.15)' };
    if (hour >= 12 && hour < 17) return { text: 'Xayrli kun', icon: Sun, color: 'rgba(0, 206, 201, 0.15)' };
    if (hour >= 17 && hour < 21) return { text: 'Xayrli kech', icon: Sunset, color: 'rgba(253, 121, 168, 0.15)' };
    return { text: 'Xayrli tungi', icon: Moon, color: 'rgba(108, 92, 231, 0.15)' };
  };

  const getPaymentLabel = (type) => {
    const types = { cash: 'Naqd', card: 'Karta', nasiya: 'Nasiya' };
    return types[type] || type;
  };

  const getPaymentColor = (type) => {
    const colors = { cash: 'var(--success)', card: 'var(--primary-light)', nasiya: 'var(--accent)' };
    return colors[type] || 'var(--text-secondary)';
  };

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString('uz', { hour: '2-digit', minute: '2-digit' });
  };

  const toggleSale = (id) => {
    setSelectedSales(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleArchiveSelected = async () => {
    if (selectedSales.length === 0) return;
    if (!confirm(`${selectedSales.length} ta sotishni arxivga qo'shishni xohlaysizmi?`)) return;
    requireAdmin(async () => {
      try {
        const res = await api.archiveDailySale(selectedSales);
        showToast(res.message || 'Arxivlandi');
        setSelectedSales([]);
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

  const handleArchiveAll = async () => {
    if (!stats.recentSales || stats.recentSales.length === 0) return;
    if (!confirm(`Barcha ${stats.recentSales.length} ta sotishni arxivga qo'shishni xohlaysizmi?`)) return;
    requireAdmin(async () => {
      try {
        const res = await api.archiveDailySale(stats.recentSales.map(s => s.id));
        showToast(res.message || 'Arxivlandi');
        setSelectedSales([]);
        loadData();
      } catch {
        showToast('Xatolik', 'error');
      }
    });
  };

  const handleDeleteAll = async () => {
    if (!stats.recentSales || stats.recentSales.length === 0) return;
    if (!confirm(`Barcha ${stats.recentSales.length} ta sotishni butunlay o'chirishni xohlaysizmi?`)) return;
    requireAdmin(async () => {
      try {
        for (const s of stats.recentSales) {
          await api.deleteSale(s.id);
        }
        showToast(`${stats.recentSales.length} ta sotish o'chirildi`);
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
        const res = await api.archiveDailySale([id]);
        showToast(res.message || 'Arxivlandi');
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

  const greeting = getGreeting();
  const avgTransaction = stats.salesCount > 0 ? Math.round(stats.totalSales / stats.salesCount) : 0;
  const noSalesToday = stats.salesCount === 0;

  const getMotivation = () => {
    const hour = currentTime.getHours();
    if (hour < 12) return { text: "Ertalab — eng yaxshi vaqt! Boshlang!", icon: Sunrise, color: "rgba(253,203,110,0.15)" };
    if (hour < 17) return { text: "Kun o'rtasi — faollik vaqti! Davom eting!", icon: Sun, color: "rgba(0,206,201,0.15)" };
    if (hour < 21) return { text: "Kech — tinchlik va hisob-kitob vaqti!", icon: Sunset, color: "rgba(253,121,168,0.15)" };
    return { text: "Tungi — ertaga yangi kun, yangi imkoniyatlar!", icon: Moon, color: "rgba(108,92,231,0.15)" };
  };
  const motivation = getMotivation();

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loader"></div>
        <div className="text">Yuklanmoqda...</div>
      </div>
    );
  }

  return (
    <div className="dashboard-wrapper">
      <video
        className="dashboard-bg-video"
        autoPlay
        muted
        loop
        playsInline
        poster=""
      >
        <source src="/bg-video.mp4" type="video/mp4" />
      </video>
      <div className="dashboard-overlay"></div>
      <div className="dashboard-content">
      {showWelcome && shopInfo && (
        <div className="card" style={{
          marginBottom: 24,
          background: 'rgba(108,92,231,0.12)',
          border: '1px solid rgba(108,92,231,0.3)',
          padding: 24,
          position: 'relative'
        }}>
          <button
            onClick={() => setShowWelcome(false)}
            style={{
              position: 'absolute', top: 12, right: 12,
              background: 'none', border: 'none',
              color: 'var(--text-muted)', cursor: 'pointer', fontSize: 18
            }}
          >
            x
          </button>
          <h2 style={{ marginBottom: 16, fontSize: 20 }}>Xush kelibsiz! — {shopInfo.shop_name}</h2>
          <div className="grid-2" style={{ gap: 16 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Do'kon raqami:</span>
                <span style={{ fontWeight: 700, fontFamily: 'monospace', color: 'var(--primary-light)' }}>{shopInfo.shop_number}</span>
              </div>
              {shopInfo.shop_address && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Manzil:</span>
                  <span style={{ fontWeight: 600 }}>{shopInfo.shop_address}</span>
                </div>
              )}
              {shopInfo.shop_phone && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Telefon:</span>
                  <span style={{ fontWeight: 600 }}>{shopInfo.shop_phone}</span>
                </div>
              )}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Mahsulotlar:</span>
                <span style={{ fontWeight: 700, color: 'var(--primary-light)' }}>{shopInfo.productCount || 0} ta</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Faol nasiya:</span>
                <span style={{ fontWeight: 700, color: 'var(--accent)' }}>{shopInfo.activeNasiya || 0} ta</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>RAM:</span>
                <span style={{ fontWeight: 600 }}>
                  {shopInfo.ram?.used} / {shopInfo.ram?.total}
                  <span style={{ color: 'var(--text-muted)', marginLeft: 4, fontSize: 12 }}>({shopInfo.ram?.percent})</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28, animation: 'slideDown 0.5s cubic-bezier(0.4, 0, 0.2, 1)' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
            <span style={{ fontSize: 28, color: 'var(--warning)' }}><greeting.icon size={28} /></span>
            <h1 style={{ fontSize: 28, fontWeight: 800, background: 'var(--gradient-1)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
              {greeting.text}!
            </h1>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
            {currentTime.toLocaleDateString('uz-UZ', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            <span style={{ marginLeft: 12, fontFamily: 'monospace', color: 'var(--primary-light)', fontWeight: 600 }}>
              {currentTime.toLocaleTimeString('uz', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          </p>
        </div>
      </div>

      {noSalesToday && (
        <div className="card" style={{
          marginBottom: 24,
          background: motivation.color,
          border: '1px solid rgba(108,92,231,0.2)',
          padding: '16px 24px',
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          animation: 'slideUp 0.5s ease'
        }}>
          <span style={{ fontSize: 32, color: 'var(--warning)' }}><motivation.icon size={32} /></span>
          <div>
            <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>{motivation.text}</p>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>POS bo'limiga o'tib sotishni boshlashingiz mumkin</p>
          </div>
        </div>
      )}

      <div className="stat-cards">
        <div className="stat-card purple">
          <div className="icon"><Coins size={22} /></div>
          <div className="value">{stats.totalSales.toLocaleString()} so'm</div>
          <div className="label">Bugungi savdo</div>
          <div style={{ marginTop: 8, fontSize: 12, color: 'var(--text-muted)' }}>
            Naqd: {stats.totalCash.toLocaleString()} so'm
          </div>
        </div>
        <div className="stat-card green">
          <div className="icon"><Banknote size={22} /></div>
          <div className="value">{stats.totalCash.toLocaleString()} so'm</div>
          <div className="label">Naqd pul</div>
          <div style={{ marginTop: 8, fontSize: 12, color: 'var(--text-muted)' }}>
            Karta: {stats.totalCard.toLocaleString()} so'm
          </div>
        </div>
        <div className="stat-card yellow">
          <div className="icon"><ClipboardList size={22} /></div>
          <div className="value">{stats.salesCount}</div>
          <div className="label">Tranzaksiyalar</div>
          <div style={{ marginTop: 8, fontSize: 12, color: 'var(--text-muted)' }}>
            O'rtacha: {avgTransaction.toLocaleString()} so'm
          </div>
        </div>
        <div className="stat-card pink">
          <div className="icon"><Notebook size={22} /></div>
          <div className="value">{stats.totalNasiya.toLocaleString()} so'm</div>
          <div className="label">Nasiya</div>
          <div style={{ marginTop: 8, fontSize: 12, color: 'var(--text-muted)' }}>
            Bugun nasiyaga sotilgan
          </div>
        </div>
      </div>

      <div className="grid-2" style={{ marginTop: 8 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {stats.recentSales && stats.recentSales.length > 0 && (
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h3 style={{ fontSize: 16, fontWeight: 700 }}>So'nggi sotishlar</h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {selectedSales.length > 0 && (
                    <>
                      <button className="btn btn-sm" style={{ background: 'var(--success)', color: '#0F0F1A', fontWeight: 600, fontSize: 12 }} onClick={handleArchiveSelected}>
                        <Package size={14} /> Arxivlash ({selectedSales.length})
                      </button>
                      <button className="btn btn-sm" style={{ background: 'var(--danger)', color: 'white', fontWeight: 600, fontSize: 12 }} onClick={handleDeleteSelected}>
                        <Trash2 size={14} /> O'chirish ({selectedSales.length})
                      </button>
                    </>
                  )}
                  <span style={{ fontSize: 12, color: 'var(--text-muted)', background: 'var(--bg-input)', padding: '4px 10px', borderRadius: 20 }}>
                    {stats.recentSales.length} ta
                  </span>
                  <div style={{ position: 'relative' }}>
                    <button
                      onClick={(e) => { e.stopPropagation(); setOpenMenu(openMenu === 'dashboard-sales' ? null : 'dashboard-sales'); }}
                      style={{
                        width: 32, height: 32, borderRadius: 'var(--radius-sm)',
                        background: openMenu === 'dashboard-sales' ? 'var(--bg-input)' : 'transparent',
                        border: '1.5px solid var(--border)', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 16, fontWeight: 700, color: 'var(--text-secondary)',
                        transition: 'all 0.2s'
                      }}
                    ><EllipsisVertical size={18} /></button>
                    {openMenu === 'dashboard-sales' && (
                      <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: 4, background: 'var(--bg-secondary)', border: '1.5px solid var(--border)', borderRadius: 'var(--radius-sm)', minWidth: 180, zIndex: 50, boxShadow: '0 8px 24px rgba(0,0,0,0.3)', overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
                        <button style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', cursor: 'pointer', fontSize: 13, fontWeight: 500, color: 'var(--success)', transition: 'background 0.15s', border: 'none', background: 'none', width: '100%', textAlign: 'left', fontFamily: 'inherit' }} onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-input)'} onMouseLeave={e => e.currentTarget.style.background = 'none'} onClick={handleArchiveAll}>
                          <Package size={14} /> Barchasini arxivlash
                        </button>
                        <button style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', cursor: 'pointer', fontSize: 13, fontWeight: 500, color: 'var(--danger)', transition: 'background 0.15s', border: 'none', background: 'none', width: '100%', textAlign: 'left', fontFamily: 'inherit' }} onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-input)'} onMouseLeave={e => e.currentTarget.style.background = 'none'} onClick={handleDeleteAll}>
                          <Trash2 size={14} /> Barchasini o'chirish
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                {stats.recentSales.map((sale, idx) => (
                  <div key={sale.id} className="dashboard-sale-item" style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '12px 0',
                    borderBottom: idx < stats.recentSales.length - 1 ? '1px solid var(--border)' : 'none',
                    animation: `slideUp 0.3s ease ${idx * 0.05}s backwards`
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flex: 1 }}>
                      <input
                        type="checkbox"
                        checked={selectedSales.includes(sale.id)}
                        onChange={() => toggleSale(sale.id)}
                        style={{ width: 16, height: 16, accentColor: '#00B894', cursor: 'pointer', flexShrink: 0 }}
                      />
                      <div style={{
                        width: 36, height: 36, borderRadius: 'var(--radius-sm)',
                        background: getPaymentColor(sale.payment_type) + '20',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 16, flexShrink: 0
                      }}>
                        {sale.payment_type === 'cash' ? <Banknote size={16} /> : sale.payment_type === 'card' ? <CreditCard size={16} /> : <Notebook size={16} />}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{sale.items.length} ta mahsulot</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                          {formatDate(sale.created_at)} · {getPaymentLabel(sale.payment_type)}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, marginLeft: 8 }}>
                      <div style={{ fontWeight: 700, color: 'var(--secondary)', fontSize: 13 }}>
                        {sale.total.toLocaleString()} so'm
                      </div>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button
                          className="btn btn-sm"
                          style={{ background: 'var(--success)', color: '#0F0F1A', fontWeight: 600, fontSize: 10, padding: '4px 6px', border: 'none', borderRadius: 'var(--radius-sm)' }}
                          onClick={(e) => { e.stopPropagation(); handleArchiveSingle(sale.id); }}
                          title="Arxivlash"
                        >
                          <Package size={12} />
                        </button>
                        <button
                          className="btn btn-sm"
                          style={{ background: 'var(--danger)', color: 'white', fontWeight: 600, fontSize: 10, padding: '4px 6px', border: 'none', borderRadius: 'var(--radius-sm)' }}
                          onClick={(e) => { e.stopPropagation(); handleDeleteSingle(sale.id); }}
                          title="O'chirish"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {selectedSales.length > 0 && (
                <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end' }}>
                  <button className="btn btn-outline btn-sm" onClick={() => setSelectedSales([])}>
                    Tanlovni bekor qilish
                  </button>
                </div>
              )}
            </div>
          )}

          {(!stats.recentSales || stats.recentSales.length === 0) && (
            <div className="card" style={{ background: 'rgba(108,92,231,0.08)', border: '1px solid rgba(108,92,231,0.25)' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 32, textAlign: 'center' }}>
                <span style={{ fontSize: 56, marginBottom: 16, animation: 'float 3s ease-in-out infinite', color: 'var(--primary-light)' }}><Rocket size={56} /></span>
                <h3 style={{ fontSize: 18, fontWeight: 700, background: 'var(--gradient-1)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', marginBottom: 8 }}>
                  Bugun hali savdo boshlanmadi!
                </h3>
                <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 4, lineHeight: 1.6 }}>
                  Har bir katta biznes birinchi sotishdan boshlanadi.
                </p>
                <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16, lineHeight: 1.6, maxWidth: 360 }}>
                  "Muvaffaqiyat — bu har kuni bir oz yaqinroq kelishdan iborat."
                </p>
                <button
                  className="btn btn-primary"
                  onClick={() => navigate('/pos')}
                  style={{ fontSize: 14, padding: '12px 28px', borderRadius: 'var(--radius-sm)' }}
                >
                  <ShoppingCart size={16} /> Sotishni boshlash
                </button>
              </div>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {stats.topProducts && stats.topProducts.length > 0 && (
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h3 style={{ fontSize: 16, fontWeight: 700 }}>Eng ko'p sotilganlar</h3>
                <span style={{ fontSize: 12, color: 'var(--text-muted)', background: 'var(--bg-input)', padding: '4px 10px', borderRadius: 20 }}>
                  TOP {stats.topProducts.length}
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                {stats.topProducts.map((product, idx) => {
                  const maxTotal = stats.topProducts[0]?.total || 1;
                  const widthPercent = (product.total / maxTotal) * 100;
                  return (
                    <div key={product.id} style={{
                      padding: '12px 0',
                      borderBottom: idx < stats.topProducts.length - 1 ? '1px solid var(--border)' : 'none',
                      animation: `slideUp 0.3s ease ${idx * 0.05}s backwards`
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{
                            width: 22, height: 22, borderRadius: '50%',
                            background: idx === 0 ? 'var(--gradient-4)' : idx === 1 ? '#A0A0C0' : idx === 2 ? '#E17055' : 'var(--bg-input)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 11, fontWeight: 800, color: idx < 3 ? '#0F0F1A' : 'var(--text-muted)'
                          }}>
                            {idx + 1}
                          </span>
                          <span style={{ fontWeight: 600, fontSize: 13 }}>{product.name}</span>
                        </div>
                        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{product.quantity} dona</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ flex: 1, height: 6, background: 'var(--bg-input)', borderRadius: 3, overflow: 'hidden' }}>
                          <div style={{
                            width: `${widthPercent}%`, height: '100%',
                            background: idx === 0 ? 'var(--gradient-4)' : idx === 1 ? 'var(--gradient-1)' : 'var(--gradient-2)',
                            borderRadius: 3, transition: 'width 0.8s cubic-bezier(0.4, 0, 0.2, 1)'
                          }} />
                        </div>
                        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--secondary)', minWidth: 80, textAlign: 'right' }}>
                          {product.total.toLocaleString()} so'm
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="card">
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Tezkor harakatlar</h3>
            <div className="quick-actions-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
              <button onClick={() => navigate('/pos')} style={{
                padding: '16px 12px', borderRadius: 'var(--radius-sm)', border: '1.5px solid var(--border)',
                background: 'var(--bg-input)', cursor: 'pointer', textAlign: 'center',
                transition: 'all 0.3s', color: 'var(--text)', fontFamily: 'inherit'
              }}
                onMouseEnter={e => { e.target.style.borderColor = 'var(--primary)'; e.target.style.background = 'rgba(108,92,231,0.1)'; }}
                onMouseLeave={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.background = 'var(--bg-input)'; }}
              >
                <div style={{ fontSize: 24, marginBottom: 6, color: 'var(--primary-light)' }}><ShoppingCart size={24} /></div>
                <div style={{ fontWeight: 600, fontSize: 13 }}>POS</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Sotish boshlash</div>
              </button>
              <button onClick={() => navigate('/reports')} style={{
                padding: '16px 12px', borderRadius: 'var(--radius-sm)', border: '1.5px solid var(--border)',
                background: 'var(--bg-input)', cursor: 'pointer', textAlign: 'center',
                transition: 'all 0.3s', color: 'var(--text)', fontFamily: 'inherit'
              }}
                onMouseEnter={e => { e.target.style.borderColor = 'var(--secondary)'; e.target.style.background = 'rgba(0,206,201,0.1)'; }}
                onMouseLeave={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.background = 'var(--bg-input)'; }}
              >
                <div style={{ fontSize: 24, marginBottom: 6, color: 'var(--secondary)' }}><LayoutDashboard size={24} /></div>
                <div style={{ fontWeight: 600, fontSize: 13 }}>Hisobotlar</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Batafsil ko'rish</div>
              </button>
              <button onClick={() => navigate('/nasiya')} style={{
                padding: '16px 12px', borderRadius: 'var(--radius-sm)', border: '1.5px solid var(--border)',
                background: 'var(--bg-input)', cursor: 'pointer', textAlign: 'center',
                transition: 'all 0.3s', color: 'var(--text)', fontFamily: 'inherit'
              }}
                onMouseEnter={e => { e.target.style.borderColor = 'var(--accent)'; e.target.style.background = 'rgba(253,121,168,0.1)'; }}
                onMouseLeave={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.background = 'var(--bg-input)'; }}
              >
                <div style={{ fontSize: 24, marginBottom: 6, color: 'var(--accent)' }}><Notebook size={24} /></div>
                <div style={{ fontWeight: 600, fontSize: 13 }}>Nasiya</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Qarzlar ro'yxati</div>
              </button>
              <button onClick={() => navigate('/distributions')} style={{
                padding: '16px 12px', borderRadius: 'var(--radius-sm)', border: '1.5px solid var(--border)',
                background: 'var(--bg-input)', cursor: 'pointer', textAlign: 'center',
                transition: 'all 0.3s', color: 'var(--text)', fontFamily: 'inherit'
              }}
                onMouseEnter={e => { e.target.style.borderColor = 'var(--warning)'; e.target.style.background = 'rgba(253,203,110,0.1)'; }}
                onMouseLeave={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.background = 'var(--bg-input)'; }}
              >
                <div style={{ fontSize: 24, marginBottom: 6, color: 'var(--warning)' }}><Package size={24} /></div>
                <div style={{ fontWeight: 600, fontSize: 13 }}>Tarqatish</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Tovar tarqatish</div>
              </button>
              <button onClick={() => navigate('/chat')} style={{
                padding: '16px 12px', borderRadius: 'var(--radius-sm)', border: '1.5px solid var(--border)',
                background: 'var(--bg-input)', cursor: 'pointer', textAlign: 'center',
                transition: 'all 0.3s', color: 'var(--text)', fontFamily: 'inherit'
              }}
                onMouseEnter={e => { e.target.style.borderColor = 'var(--warning)'; e.target.style.background = 'rgba(253,203,110,0.1)'; }}
                onMouseLeave={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.background = 'var(--bg-input)'; }}
              >
                <div style={{ fontSize: 24, marginBottom: 6, color: 'var(--warning)' }}><Bot size={24} /></div>
                <div style={{ fontWeight: 600, fontSize: 13 }}>AI Yordamchi</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Savol berish</div>
              </button>
            </div>
          </div>
        </div>
      </div>

      {monthlyStats && (
        <>
          <div style={{ marginTop: 32, marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontSize: 20, fontWeight: 800, background: 'var(--gradient-1)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
              Oylik hisobot — {monthlyStats.month}
            </h2>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-sm btn-danger" style={{ fontWeight: 600, fontSize: 12 }} onClick={async () => {
                if (!confirm("Oylik barcha savdolarni arxivlab, ro'yxatdan o'chirishni xohlaysizmi?")) return;
                requireAdmin(async () => {
                  try {
                    await api.cleanMonthly();
                    showToast("Oylik ma'lumotlar arxivlandi va faol ro'yxatdan o'chirildi");
                    loadData();
                  } catch {
                    showToast('Xatolik', 'error');
                  }
                });
              }}><Trash2 size={14} /> Arxivlash va O'chirish</button>
            </div>
          </div>
          <div className="stat-cards">
            <div className="stat-card purple">
              <div className="icon"><LayoutDashboard size={22} /></div>
              <div className="value">{(monthlyStats.totalSales || 0).toLocaleString()} so'm</div>
              <div className="label">Oylik savdo</div>
              <div style={{ marginTop: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>
                  <span>{monthlyStats.salesCount || 0} ta sotish</span>
                  <span>O'rtacha: {monthlyStats.salesCount > 0 ? Math.round((monthlyStats.totalSales || 0) / monthlyStats.salesCount).toLocaleString() : 0} so'm</span>
                </div>
                <div style={{ height: 4, background: 'var(--bg-input)', borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{ width: '100%', height: '100%', background: 'var(--gradient-1)', borderRadius: 2 }} />
                </div>
              </div>
            </div>
            <div className="stat-card green">
              <div className="icon"><Banknote size={22} /></div>
              <div className="value">{(monthlyStats.totalCash || 0).toLocaleString()} so'm</div>
              <div className="label">Oylik naqd</div>
              <div style={{ marginTop: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>
                  <span>Savdo tarkibida</span>
                  <span>{(monthlyStats.totalSales || 0) > 0 ? Math.round(((monthlyStats.totalCash || 0) / (monthlyStats.totalSales || 1)) * 100) : 0}%</span>
                </div>
                <div style={{ height: 4, background: 'var(--bg-input)', borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{
                    width: `${(monthlyStats.totalSales || 0) > 0 ? ((monthlyStats.totalCash || 0) / (monthlyStats.totalSales || 1)) * 100 : 0}%`,
                    height: '100%', background: 'var(--gradient-2)', borderRadius: 2
                  }} />
                </div>
              </div>
            </div>
            <div className="stat-card yellow">
              <div className="icon"><Notebook size={22} /></div>
              <div className="value">{(monthlyStats.totalNasiyaDebt || 0).toLocaleString()} so'm</div>
              <div className="label">Jami nasiya qarzi</div>
              <div style={{ marginTop: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>
                  <span>Savdo tarkibida</span>
                  <span>{(monthlyStats.totalSales || 0) > 0 ? Math.round(((monthlyStats.totalNasiyaDebt || 0) / ((monthlyStats.totalSales || 0) + (monthlyStats.totalNasiyaDebt || 0))) * 100) : 0}%</span>
                </div>
                <div style={{ height: 4, background: 'var(--bg-input)', borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{
                    width: `${Math.min((monthlyStats.totalSales || 0) > 0 ? ((monthlyStats.totalNasiyaDebt || 0) / ((monthlyStats.totalSales || 0) + (monthlyStats.totalNasiyaDebt || 0))) * 100 : 0, 100)}%`,
                    height: '100%', background: 'var(--gradient-4)', borderRadius: 2
                  }} />
                </div>
              </div>
            </div>
          </div>
        </>
      )}
      </div>
    </div>
  );
}
