import { useState, useEffect, useCallback } from 'react';
import { api } from '../api';
import { Package, Coins, ClipboardList, Hourglass, UserRound } from 'lucide-react';

export default function Distributions() {
  const [distributions, setDistributions] = useState([]);
  const [stats, setStats] = useState(null);
  const [clients, setClients] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showAdd, setShowAdd] = useState(false);
  const [showEdit, setShowEdit] = useState(null);
  const [searchClient, setSearchClient] = useState('');
  const [searchProduct, setSearchProduct] = useState('');
  const [showClient, setShowClient] = useState(null);
  const [form, setForm] = useState({
    client_name: '', client_phone: '', product_id: '', product_name: '',
    quantity: '', unit_price: '', paid_amount: '', note: ''
  });

  const loadDistributions = useCallback(async () => {
    try {
      const params = {};
      if (searchClient) params.client = searchClient;
      if (searchProduct) params.product = searchProduct;
      const data = await api.getDistributions(params);
      setDistributions(data);
    } catch {}
  }, [searchClient, searchProduct]);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [s, c, p] = await Promise.allSettled([
        api.getDistributionStats(),
        api.getDistributionClients(),
        api.getProducts()
      ]);
      if (s.status === 'fulfilled') setStats(s.value);
      if (c.status === 'fulfilled') setClients(c.value);
      if (p.status === 'fulfilled') setProducts(p.value);
      await loadDistributions();
    } catch {} finally { setLoading(false); }
  }, [loadDistributions]);

  useEffect(() => { loadAll(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    loadDistributions();
  }, [loadDistributions]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleAdd = async () => {
    if (!form.client_name.trim() || !form.product_name.trim()) {
      return;
    }
    try {
      const payload = {
        ...form,
        quantity: Number(form.quantity) || 1,
        unit_price: Number(form.unit_price) || 0,
        paid_amount: Number(form.paid_amount) || 0,
        product_id: form.product_id || null
      };
      await api.createDistribution(payload);
      setShowAdd(false);
      setForm({ client_name: '', client_phone: '', product_id: '', product_name: '', quantity: '', unit_price: '', paid_amount: '', note: '' });
      loadAll();
    } catch {}
  };

  const handleEdit = async () => {
    if (!form.client_name.trim() || !form.product_name.trim()) return;
    try {
      await api.updateDistribution(showEdit.id, {
        ...form,
        quantity: Number(form.quantity) || 1,
        unit_price: Number(form.unit_price) || 0,
        paid_amount: Number(form.paid_amount) || 0
      });
      setShowEdit(null);
      setForm({ client_name: '', client_phone: '', product_id: '', product_name: '', quantity: '', unit_price: '', paid_amount: '', note: '' });
      loadAll();
    } catch {}
  };

  const handleDelete = async (id) => {
    if (!confirm("Tarqatishni o'chirishni xohlaysizmi? Mahsulot omborga qaytariladi.")) return;
    try {
      await api.deleteDistribution(id);
      loadAll();
    } catch {}
  };

  const openEdit = (d) => {
    setForm({
      client_name: d.client_name, client_phone: d.client_phone || '',
      product_id: d.product_id || '', product_name: d.product_name,
      quantity: d.quantity, unit_price: d.unit_price,
      paid_amount: d.paid_amount, note: d.note || ''
    });
    setShowEdit(d);
  };

  const openAddForClient = (d) => {
    setForm({
      client_name: d.client_name, client_phone: d.client_phone || '',
      product_id: '', product_name: '',
      quantity: '', unit_price: '', paid_amount: '', note: ''
    });
    setShowAdd(true);
  };

  const selectProduct = (p) => {
    setForm({ ...form, product_id: p.id, product_name: p.name, unit_price: p.cost || 0 });
  };

  const formatDateTime = (d) => {
    if (!d) return '—';
    return new Date(d).toLocaleString('uz-UZ', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
  };

  if (loading) {
    return <div className="loading-screen"><div className="loader"></div><div className="text">Yuklanmoqda...</div></div>;
  }

  return (
    <div>
      <div className="page-header">
        <h1>Tovar Tarqatish</h1>
        <p>Mijozlarga tovar tarqatishni boshqarish</p>
      </div>

      <div className="tabs" style={{ marginBottom: 20 }}>
        <button className={`tab ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('dashboard')}>
          Dashboard
        </button>
        <button className={`tab ${activeTab === 'list' ? 'active' : ''}`} onClick={() => setActiveTab('list')}>
          Tarqatishlar
        </button>
        <button className={`tab ${activeTab === 'clients' ? 'active' : ''}`} onClick={() => setActiveTab('clients')}>
          Mijozlar
        </button>
      </div>

      {activeTab === 'dashboard' && stats && (
        <>
          <div className="stat-cards">
            <div className="stat-card purple">
              <div className="icon"><Package size={22} /></div>
              <div className="value">{stats.today.count} ta</div>
              <div className="label">Bugun tarqatilgan</div>
              <div style={{ marginTop: 8, fontSize: 12, color: 'var(--text-muted)' }}>
                {stats.today.totalSum.toLocaleString()} so'm
              </div>
            </div>
            <div className="stat-card green">
              <div className="icon"><Coins size={22} /></div>
              <div className="value">{stats.month.totalSum.toLocaleString()} so'm</div>
              <div className="label">Oylik tarqatish</div>
              <div style={{ marginTop: 8, fontSize: 12, color: 'var(--text-muted)' }}>
                {stats.month.count} ta operatsiya
              </div>
            </div>
            <div className="stat-card yellow">
              <div className="icon"><ClipboardList size={22} /></div>
              <div className="value">{stats.all.count} ta</div>
              <div className="label">Jami tarqatishlar</div>
              <div style={{ marginTop: 8, fontSize: 12, color: 'var(--text-muted)' }}>
                {stats.all.totalSum.toLocaleString()} so'm
              </div>
            </div>
            <div className="stat-card pink">
              <div className="icon"><Hourglass size={22} /></div>
              <div className="value">{stats.unpaid.totalDebt.toLocaleString()} so'm</div>
              <div className="label">To'lanmagan</div>
              <div style={{ marginTop: 8, fontSize: 12, color: 'var(--text-muted)' }}>
                {stats.unpaid.count} ta mijoz
              </div>
            </div>
          </div>

          <div className="grid-2" style={{ marginTop: 8 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {stats.recentDists && stats.recentDists.length > 0 && (
                <div className="card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <h3 style={{ fontSize: 16, fontWeight: 700 }}>So'nggi tarqatishlar</h3>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)', background: 'var(--bg-input)', padding: '4px 10px', borderRadius: 20 }}>
                      {stats.recentDists.length} ta
                    </span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                    {stats.recentDists.map((d, idx) => (
                      <div key={d.id} style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '12px 0',
                        borderBottom: idx < stats.recentDists.length - 1 ? '1px solid var(--border)' : 'none'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{
                            width: 36, height: 36, borderRadius: 'var(--radius-sm)',
                            background: 'rgba(108,92,231,0.15)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary-light)'
                          }}><UserRound size={18} /></div>
                          <div>
                            <div style={{ fontWeight: 600, fontSize: 13 }}>{d.client_name}</div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                              {d.product_name} — {d.quantity} dona · {formatDateTime(d.created_at)}
                            </div>
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontWeight: 700, color: 'var(--secondary)', fontSize: 14 }}>
                            {d.total_sum.toLocaleString()} so'm
                          </div>
                          <div style={{ fontSize: 11, color: d.paid_amount >= d.total_sum ? 'var(--success)' : 'var(--danger)' }}>
                            {d.paid_amount >= d.total_sum ? "To'langan" : `Qarz: ${(d.total_sum - d.paid_amount).toLocaleString()}`}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {(!stats.recentDists || stats.recentDists.length === 0) && (
                <div className="card">
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 32, color: 'var(--text-muted)' }}>
                    <span style={{ fontSize: 48, marginBottom: 12, color: 'var(--text-muted)' }}><Package size={48} /></span>
                    <p>Hali tarqatish yo'q</p>
                    <p style={{ fontSize: 12, marginTop: 4 }}>"Qo'shish" tugmasini bosing</p>
                  </div>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {stats.topClients && stats.topClients.length > 0 && (
                <div className="card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <h3 style={{ fontSize: 16, fontWeight: 700 }}>Eng ko'p olgan mijozlar</h3>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)', background: 'var(--bg-input)', padding: '4px 10px', borderRadius: 20 }}>
                      TOP {stats.topClients.length}
                    </span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                    {stats.topClients.map((c, idx) => {
                      const maxSum = stats.topClients[0]?.totalSum || 1;
                      const widthPercent = (c.totalSum / maxSum) * 100;
                      return (
                        <div key={idx} style={{
                          padding: '12px 0',
                          borderBottom: idx < stats.topClients.length - 1 ? '1px solid var(--border)' : 'none'
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span style={{
                                width: 22, height: 22, borderRadius: '50%',
                                background: idx === 0 ? 'var(--gradient-4)' : idx === 1 ? '#A0A0C0' : idx === 2 ? '#E17055' : 'var(--bg-input)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: 11, fontWeight: 800, color: idx < 3 ? '#0F0F1A' : 'var(--text-muted)'
                              }}>{idx + 1}</span>
                              <div>
                                <span style={{ fontWeight: 600, fontSize: 13 }}>{c.client_name}</span>
                                {c.client_phone && <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 8 }}>{c.client_phone}</span>}
                              </div>
                            </div>
                            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{c.orderCount} ta</span>
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
                              {c.totalSum.toLocaleString()} so'm
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="card">
                <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Oylik tahlil</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div className="flex-between" style={{ padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                    <span>Jami summa</span><span style={{ fontWeight: 700 }}>{stats.month.totalSum.toLocaleString()} so'm</span>
                  </div>
                  <div className="flex-between" style={{ padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                    <span>To'langan</span><span style={{ fontWeight: 700, color: 'var(--success)' }}>{stats.month.totalPaid.toLocaleString()} so'm</span>
                  </div>
                  <div className="flex-between" style={{ padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                    <span>Qarz</span><span style={{ fontWeight: 700, color: 'var(--danger)' }}>{(stats.month.totalSum - stats.month.totalPaid).toLocaleString()} so'm</span>
                  </div>
                  <div className="flex-between" style={{ padding: '10px 0' }}>
                    <span>Soni</span><span style={{ fontWeight: 700 }}>{stats.month.count} ta</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {activeTab === 'list' && (
        <>
          <div className="flex-between mb-4 mobile-flex-wrap" style={{ gap: 12 }}>
            <div className="filter-group" style={{ display: 'flex', gap: 8 }}>
              <input className="input" placeholder="Mijoz qidirish..." value={searchClient} onChange={e => setSearchClient(e.target.value)} style={{ width: '100%', maxWidth: 200 }} />
              <input className="input" placeholder="Mahsulot qidirish..." value={searchProduct} onChange={e => setSearchProduct(e.target.value)} style={{ width: '100%', maxWidth: 200 }} />
            </div>
            <button className="btn btn-primary mobile-w-full" onClick={() => { setForm({ client_name: '', client_phone: '', product_id: '', product_name: '', quantity: '', unit_price: '', paid_amount: '', note: '' }); setShowAdd(true); }}>
              + Tarqatish qo'shish
            </button>
          </div>

          {(() => {
            const clientMap = {};
            distributions.forEach(d => {
              const key = d.client_name;
              if (!clientMap[key]) {
                clientMap[key] = { client_name: d.client_name, client_phone: d.client_phone || '', items: [], totalSum: 0, totalPaid: 0, debt: 0 };
              }
              clientMap[key].items.push(d);
              clientMap[key].totalSum += d.total_sum || 0;
              clientMap[key].totalPaid += d.paid_amount || 0;
              clientMap[key].debt += (d.total_sum || 0) - (d.paid_amount || 0);
            });
            const grouped = Object.values(clientMap);
            return grouped.length === 0 ? (
              <div className="empty-cart" style={{ padding: 48 }}>
                <div className="icon"><Package size={48} /></div>
                <p style={{ marginTop: 12, color: 'var(--text-muted)' }}>Tarqatishlar yo'q</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {grouped.map((g, idx) => (
                  <div
                    key={idx}
                    onClick={() => setShowClient(g)}
                    style={{
                      border: '1.5px solid var(--border)',
                      borderRadius: 'var(--radius)',
                      padding: '16px 20px',
                      cursor: 'pointer',
                      background: 'var(--bg-secondary)',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--primary-light)'}
                    onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
                  >
                    <div className="flex-between">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{
                          width: 40, height: 40, borderRadius: '50%',
                          background: idx < 3 ? 'var(--gradient-4)' : 'var(--bg-input)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 14, fontWeight: 800, color: idx < 3 ? '#0F0F1A' : 'var(--text-muted)'
                        }}>{idx + 1}</div>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 15 }}>{g.client_name}</div>
                          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                            {g.client_phone && `${g.client_phone} · `}
                            {g.items.length} ta buyurtma · {g.items.map(i => i.product_name).join(', ')}
                          </div>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: 800, fontSize: 16, color: 'var(--secondary)' }}>
                          {g.totalSum.toLocaleString()} so'm
                        </div>
                        <div style={{ fontSize: 12, marginTop: 4 }}>
                          <span style={{ color: 'var(--success)' }}>To'langan: {g.totalPaid.toLocaleString()}</span>
                          {g.debt > 0 && <span style={{ color: 'var(--danger)', marginLeft: 8 }}>Qarz: {g.debt.toLocaleString()}</span>}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            );
          })()}
        </>
      )}

      {activeTab === 'clients' && (
        <>
          <div className="flex-between mb-4">
            <p style={{ color: 'var(--text-secondary)' }}>{clients.length} ta mijoz</p>
          </div>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>#</th><th>Mijoz nomi</th><th>Telefon</th><th>Buyurtmalar</th>
                  <th>Jami summa</th><th>To'langan</th><th>Qarz</th>
                </tr>
              </thead>
              <tbody>
                {clients.map((c, idx) => (
                  <tr key={idx} onClick={() => setShowClient(c)} style={{ cursor: 'pointer' }}>
                    <td style={{ fontWeight: 800, color: idx < 3 ? 'var(--primary-light)' : 'var(--text-muted)' }}>{idx + 1}</td>
                    <td style={{ fontWeight: 600 }}>{c.client_name}</td>
                    <td className="text-muted">{c.client_phone || '—'}</td>
                    <td style={{ fontFamily: 'monospace', fontWeight: 700 }}>{c.orderCount} ta</td>
                    <td style={{ fontWeight: 700 }}>{c.totalSum.toLocaleString()} so'm</td>
                    <td style={{ color: 'var(--success)', fontWeight: 600 }}>{c.totalPaid.toLocaleString()} so'm</td>
                    <td style={{ color: c.debt > 0 ? 'var(--danger)' : 'var(--success)', fontWeight: 700 }}>
                      {c.debt.toLocaleString()} so'm
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {clients.length === 0 && (
              <div className="empty-cart" style={{ padding: 48 }}>
                <div className="icon"><UserRound size={48} /></div>
                <p style={{ marginTop: 12, color: 'var(--text-muted)' }}>Mijozlar yo'q</p>
              </div>
            )}
          </div>
        </>
      )}

      {(showAdd || showEdit) && (
        <div className="modal-overlay" onClick={() => { setShowAdd(false); setShowEdit(null); }}>
          <div className="modal" style={{ maxWidth: 600 }} onClick={e => e.stopPropagation()}>
            <h2>{showEdit ? "Tarqatishni tahrirlash" : "Yangi tarqatish"}</h2>

            <div className="grid-2">
              <div className="input-group">
                <label>Mijoz nomi *</label>
                <input className="input" placeholder="Ism Familiya" value={form.client_name} onChange={e => setForm({ ...form, client_name: e.target.value })} />
              </div>
              <div className="input-group">
                <label>Telefon raqam</label>
                <input className="input" placeholder="+998 XX XXX XX XX" value={form.client_phone} onChange={e => setForm({ ...form, client_phone: e.target.value })} />
              </div>
            </div>

            <div className="input-group">
              <label>Mahsulot tanlash (ixtiyoriy)</label>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', maxHeight: 80, overflow: 'auto', padding: '4px 0' }}>
                {products.filter(p => p.stock > 0).slice(0, 10).map(p => (
                  <button
                    key={p.id}
                    className={`btn btn-sm ${form.product_id === p.id ? 'btn-primary' : 'btn-outline'}`}
                    onClick={() => selectProduct(p)}
                    style={{ fontSize: 11, padding: '4px 8px' }}
                  >
                    {p.name} ({p.stock}) — {p.cost ? p.cost.toLocaleString() + " so'm" : "narx yo'q"}
                  </button>
                ))}
              </div>
            </div>

              <div className="grid-2">
              <div className="input-group">
                <label>Mahsulot nomi *</label>
                <input className="input" placeholder="Mahsulot nomi" value={form.product_name} onChange={e => setForm({ ...form, product_name: e.target.value })} />
              </div>
              <div className="input-group">
                <label>Soni</label>
                <input className="input" type="number" placeholder="1" value={form.quantity} onChange={e => setForm({ ...form, quantity: e.target.value })} />
              </div>
              <div className="input-group">
                <label>Narxi (dona uchun)</label>
                <input className="input" type="number" placeholder="0" value={form.unit_price} onChange={e => setForm({ ...form, unit_price: e.target.value })} />
              </div>
              <div className="input-group">
                <label>Jami summa</label>
                <input className="input" value={((Number(form.quantity) || 1) * (Number(form.unit_price) || 0)).toLocaleString() + " so'm"} disabled style={{ fontWeight: 700, color: 'var(--secondary)' }} />
              </div>
              <div className="input-group">
                <label>To'langan</label>
                <input className="input" type="number" placeholder="0" value={form.paid_amount} onChange={e => setForm({ ...form, paid_amount: e.target.value })} />
              </div>
              <div className="input-group">
                <label>Qoldiq</label>
                <input className="input" value={(((Number(form.quantity) || 1) * (Number(form.unit_price) || 0)) - (Number(form.paid_amount) || 0)).toLocaleString() + " so'm"} disabled style={{ fontWeight: 700, color: (((Number(form.quantity) || 1) * (Number(form.unit_price) || 0)) - (Number(form.paid_amount) || 0)) > 0 ? 'var(--danger)' : 'var(--success)' }} />
              </div>
            </div>

            <div className="input-group">
              <label>Izoh</label>
              <input className="input" placeholder="Qo'shimcha ma'lumot..." value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} />
            </div>

            <div className="modal-actions">
              <button className="btn btn-outline" onClick={() => { setShowAdd(false); setShowEdit(null); }}>Bekor</button>
              <button className="btn btn-primary" onClick={showEdit ? handleEdit : handleAdd}>
                {showEdit ? 'Saqlash' : "Qo'shish"}
              </button>
            </div>
          </div>
        </div>
      )}
      {showClient && (
        <div className="modal-overlay" onClick={() => setShowClient(null)}>
          <div className="modal" style={{ maxWidth: 700 }} onClick={e => e.stopPropagation()}>
            {(() => {
              const clientDists = showClient.items || distributions.filter(d => d.client_name === showClient.client_name);
              const totalSum = showClient.totalSum || clientDists.reduce((s, d) => s + (d.total_sum || 0), 0);
              const totalPaid = showClient.totalPaid || clientDists.reduce((s, d) => s + (d.paid_amount || 0), 0);
              const debt = showClient.debt || totalSum - totalPaid;

              return (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                    <div>
                      <h2 style={{ marginBottom: 4 }}>{showClient.client_name}</h2>
                      {showClient.client_phone && (
                        <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Tel: {showClient.client_phone}</p>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="btn btn-primary" onClick={() => {
                        setShowClient(null);
                        setForm({ client_name: showClient.client_name, client_phone: showClient.client_phone || '', product_id: '', product_name: '', quantity: '', unit_price: '', paid_amount: '', note: '' });
                        setShowAdd(true);
                      }}>+ Qo'shish</button>
                    </div>
                  </div>

                  <div className="modal-stats-grid">
                    <div style={{ padding: '12px 16px', background: 'var(--bg-input)', borderRadius: 'var(--radius-sm)' }}>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Buyurtmalar</div>
                      <div style={{ fontWeight: 700, fontSize: 16 }}>{clientDists.length} ta</div>
                    </div>
                    <div style={{ padding: '12px 16px', background: 'var(--bg-input)', borderRadius: 'var(--radius-sm)' }}>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Jami summa</div>
                      <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--secondary)' }}>{totalSum.toLocaleString()} so'm</div>
                    </div>
                    <div style={{ padding: '12px 16px', background: 'var(--bg-input)', borderRadius: 'var(--radius-sm)' }}>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>To'langan</div>
                      <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--success)' }}>{totalPaid.toLocaleString()} so'm</div>
                    </div>
                    <div style={{ padding: '12px 16px', background: 'var(--bg-input)', borderRadius: 'var(--radius-sm)' }}>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Qarz</div>
                      <div style={{ fontWeight: 700, fontSize: 16, color: debt > 0 ? 'var(--danger)' : 'var(--success)' }}>{debt.toLocaleString()} so'm</div>
                    </div>
                  </div>

                  <div style={{ maxHeight: 400, overflow: 'auto' }}>
                    {clientDists.map((d, idx) => (
                      <div key={d.id} style={{
                        padding: '14px 16px',
                        background: idx % 2 === 0 ? 'var(--bg-secondary)' : 'transparent',
                        borderRadius: 'var(--radius-sm)',
                        marginBottom: 6
                      }}>
                        <div className="dist-item-row">
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 700, fontSize: 14 }}>{d.product_name}</div>
                            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                              {d.quantity} dona × {(d.unit_price || 0).toLocaleString()} so'm
                            </div>
                            {d.note && (
                              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2, fontStyle: 'italic' }}>
                                Izoh: {d.note}
                              </div>
                            )}
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                              {d.created_at ? new Date(d.created_at).toLocaleString('uz-UZ') : '—'}
                            </div>
                          </div>
                          <div className="text-right" style={{ textAlign: 'right', marginRight: 8 }}>
                            <div style={{ fontWeight: 700, color: 'var(--secondary)' }}>
                              {d.total_sum.toLocaleString()} so'm
                            </div>
                            <div style={{ fontSize: 12, color: d.paid_amount >= d.total_sum ? 'var(--success)' : 'var(--danger)', marginTop: 2 }}>
                              {d.paid_amount >= d.total_sum ? "To'langan" : `To'langan: ${d.paid_amount.toLocaleString()} · Qarz: ${(d.total_sum - d.paid_amount).toLocaleString()}`}
                            </div>
                          </div>
                          <div className="actions-group" style={{ display: 'flex', gap: 4, marginLeft: 8 }}>
                            <button className="btn btn-sm btn-primary" onClick={(e) => {
                              e.stopPropagation();
                              setShowClient(null);
                              openAddForClient(d);
                            }} style={{ fontSize: 11, padding: '4px 8px' }}>+</button>
                            <button className="btn btn-sm btn-outline" onClick={(e) => {
                              e.stopPropagation();
                              setShowClient(null);
                              openEdit(d);
                            }} style={{ fontSize: 11, padding: '4px 8px' }}>T</button>
                            <button className="btn btn-sm btn-danger" onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(d.id);
                            }} style={{ fontSize: 11, padding: '4px 8px' }}>×</button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="modal-actions">
                    <button className="btn btn-outline" onClick={() => setShowClient(null)}>Yopish</button>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
