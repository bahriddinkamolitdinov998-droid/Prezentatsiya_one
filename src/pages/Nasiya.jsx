import { useState, useEffect } from 'react';
import { api } from '../api';
import { useApp } from '../context/AppContext';
import { Plus, Notebook, TriangleAlert, Check, Phone, MapPin, Trash2, Camera, Banknote, ClipboardList, Clock, ShoppingBag } from 'lucide-react';
import { onProductImgError } from '../utils/media';

export default function Nasiya() {
  const [nasiyaList, setNasiyaList] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [showDetail, setShowDetail] = useState(null);
  const [showPay, setShowPay] = useState(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [image, setImage] = useState('');
  const [payAmount, setPayAmount] = useState('');
  const [payNote, setPayNote] = useState('');
  const [payments, setPayments] = useState([]);
  const [nasiyaSales, setNasiyaSales] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [showAddSale, setShowAddSale] = useState(false);
  const [addSaleProducts, setAddSaleProducts] = useState([]);
  const [addSaleProductId, setAddSaleProductId] = useState('');
  const [addSaleQty, setAddSaleQty] = useState(1);
  const [addSaleItems, setAddSaleItems] = useState([]);
  const [addSalePaid, setAddSalePaid] = useState('');
  const [addSaleDate, setAddSaleDate] = useState('');
  const { showToast, loading: actionLoading } = useApp();

  useEffect(() => { loadNasiya(); }, []);

  const loadNasiya = async () => {
    try {
      const data = await api.getNasiya();
      setNasiyaList(data);
    } catch {} finally {
      setLoading(false);
    }
  };

  const handleAdd = async () => {
    if (!name.trim()) {
      showToast('Mijoz nomini kiriting', 'error');
      return;
    }
    try {
      await api.createNasiya({ customer_name: name, phone, address, image });
      setName('');
      setPhone('');
      setAddress('');
      setLocation('');
      setImage('');
      setShowAdd(false);
      showToast('Nasiya ochildi');
      loadNasiya();
    } catch {
      showToast('Serverga ulanib bo\'lmadi', 'error');
    }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      showToast('Rasm hajmi 5MB dan kichik bo\'lishi kerak', 'error');
      return;
    }
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const result = await api.uploadImage(reader.result, file.name);
        if (result.url) {
          setImage(result.url);
          showToast('Rasm yuklandi');
        } else {
          showToast('Rasm yuklashda xatolik', 'error');
        }
      } catch {
        showToast('Rasm yuklashda xatolik', 'error');
      }
    };
    reader.readAsDataURL(file);
  };

  const handlePay = async () => {
    if (!payAmount || Number(payAmount) <= 0) {
      showToast('To\'lov miqdorini kiriting', 'error');
      return;
    }
    try {
      await api.payNasiya(showPay.id, { amount: Number(payAmount), note: payNote });
      setPayAmount('');
      setPayNote('');
      setShowPay(null);
      showToast('To\'lov qabul qilindi');
      loadNasiya();
    } catch {
      showToast('Serverga ulanib bo\'lmadi', 'error');
    }
  };

  const handleDeleteNasiya = async (id) => {
    if (!confirm("Ushbu nasiyani butunlay o'chirishni xohlaysizmi? Bu amalni ortga qaytarib bo'lmaydi!")) return;
    try {
      await api.deleteNasiya(id);
      showToast("Nasiya o'chirildi");
      loadNasiya();
    } catch {
      showToast("Serverga ulanib bo'lmadi", "error");
    }
  };

  const openDetail = async (nasiya) => {
    setShowDetail(nasiya);
    try {
      const [p, s] = await Promise.all([
        api.getNasiyaPayments(nasiya.id),
        api.getNasiyaSales(nasiya.id)
      ]);
      setPayments(p);
      setNasiyaSales(s);
    } catch {}
  };

  const openAddSale = async () => {
    setAddSaleItems([]);
    setAddSaleProductId('');
    setAddSaleQty(1);
    setAddSalePaid('');
    setAddSaleDate('');
    setShowAddSale(true);
    try {
      const data = await api.getProducts();
      setAddSaleProducts(data);
    } catch {}
  };

  const addSaleItem = () => {
    const product = addSaleProducts.find(p => p.id === addSaleProductId);
    if (!product) return;
    const qty = Math.max(1, Number(addSaleQty) || 1);
    setAddSaleItems(prev => {
      const existing = prev.find(i => i.id === product.id);
      if (existing) {
        return prev.map(i => i.id === product.id ? { ...i, quantity: i.quantity + qty } : i);
      }
      return [...prev, { id: product.id, name: product.name, price: product.price, quantity: qty }];
    });
    setAddSaleProductId('');
    setAddSaleQty(1);
  };

  const addSaleTotal = addSaleItems.reduce((sum, i) => sum + i.price * i.quantity, 0);

  const handleAddSale = async () => {
    if (addSaleItems.length === 0) {
      showToast('Kamida bitta mahsulot qo\'shing', 'error');
      return;
    }
    try {
      const created_at = addSaleDate ? addSaleDate.replace('T', ' ') : undefined;
      await api.addNasiyaSale(showDetail.id, {
        items: addSaleItems,
        paid: Number(addSalePaid) || 0,
        created_at
      });
      showToast('Sotuv qo\'shildi');
      setShowAddSale(false);
      loadNasiya();
      const [, s] = await Promise.all([
        api.getNasiyaPayments(showDetail.id),
        api.getNasiyaSales(showDetail.id)
      ]);
      setNasiyaSales(s);
    } catch (err) {
      showToast(err.message || 'Serverga ulanib bo\'lmadi', 'error');
    }
  };

  const filtered = nasiyaList.filter(n => {
    if (filter === 'active') return n.status === 'active';
    if (filter === 'paid') return n.status === 'paid';
    return true;
  });

  const totalDebt = nasiyaList
    .filter(n => n.status === 'active')
    .reduce((sum, n) => sum + (n.total_debt - n.paid_amount), 0);

  return (
    <div>
      <div className="page-header flex-between">
        <div>
          <h1>Nasiya Daftarchasi</h1>
          <p>Mijozlarning nasiya qarzlari va to'lovlari</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAdd(true)}>
          <Plus size={16} /> Nasiya ochish
        </button>
      </div>

      <div className="stat-cards" style={{ marginBottom: 24 }}>
        <div className="stat-card pink">
          <div className="icon"><Notebook size={22} /></div>
          <div className="value">{nasiyaList.filter(n => n.status === 'active').length}</div>
          <div className="label">Faol nasiyalar</div>
        </div>
        <div className="stat-card yellow">
          <div className="icon"><TriangleAlert size={22} /></div>
          <div className="value">{totalDebt.toLocaleString()} so'm</div>
          <div className="label">Jami qarz</div>
        </div>
        <div className="stat-card green">
          <div className="icon"><Check size={22} /></div>
          <div className="value">{nasiyaList.filter(n => n.status === 'paid').length}</div>
          <div className="label">To'langan</div>
        </div>
      </div>

      <div className="tabs" style={{ maxWidth: 400 }}>
        <button className={`tab ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>Hammasi</button>
        <button className={`tab ${filter === 'active' ? 'active' : ''}`} onClick={() => setFilter('active')}>Faol</button>
        <button className={`tab ${filter === 'paid' ? 'active' : ''}`} onClick={() => setFilter('paid')}>To'langan</button>
      </div>

      {loading ? (
        <div className="loading-screen" style={{ position: 'relative' }}>
          <div className="loader"></div>
        </div>
      ) : (
        <div className="grid-3">
          {filtered.map((n, i) => (
            <div
              key={n.id}
              className="nasiya-card"
              style={{ animationDelay: `${i * 0.05}s` }}
            >
              <div className="customer" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {n.image ? (
                  <img
                    src={n.image}
                    alt={n.customer_name}
                    onError={onProductImgError}
                    style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', border: '1.5px solid var(--border)', flexShrink: 0 }}
                  />
                ) : null}
                <span>{n.customer_name}</span>
              </div>
              {n.phone && <div className="phone"><Phone size={13} style={{ verticalAlign: 'middle', marginRight: 4 }} /> {n.phone}</div>}
              {n.address && <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}><MapPin size={13} style={{ verticalAlign: 'middle', marginRight: 4 }} /> {n.address}</div>}
              <div className="debt">
                Qarz: {(n.total_debt - n.paid_amount).toLocaleString()} so'm
              </div>
              <div className="paid">
                To'langan: {n.paid_amount.toLocaleString()} so'm / {n.total_debt.toLocaleString()} so'm
              </div>
              {n.sales && n.sales.length > 0 && (
                <div style={{ marginTop: 10, fontSize: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6, color: 'var(--primary)' }}>
                    <ShoppingBag size={14} />
                    <strong style={{ color: 'var(--primary)' }}>Olinganlar:</strong>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 8 }}>
                    {Array.from(new Set(n.sales.flatMap(s => (s.items || []).map(i => i.name)))).map((name, i) => (
                      <span key={i} style={{
                        background: 'rgba(108,92,231,0.15)', color: 'var(--primary-light)',
                        padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 600
                      }}>{name}</span>
                    ))}
                  </div>
                  {n.sales.map(s => (
                    <div key={s.id} style={{ background: 'var(--bg-input)', borderRadius: 6, padding: '6px 8px', marginBottom: 6 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--text-muted)', marginBottom: 4 }}>
                        <Clock size={11} />
                        <span>{new Date(s.created_at).toLocaleString('uz-UZ', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                      </div>
                      {s.items && s.items.map((item, idx) => (
                        <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, padding: '2px 0' }}>
                          <span style={{ color: 'var(--text)' }}><strong>{item.name}</strong> × {item.quantity} dona</span>
                          <span style={{ color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                            {(item.price || 0).toLocaleString()} so'm = {((item.price || 0) * (item.quantity || 1)).toLocaleString()} so'm
                          </span>
                        </div>
                      ))}
                      {s.total > 0 && (
                        <div style={{ textAlign: 'right', fontWeight: 700, color: 'var(--text)', marginTop: 2, fontSize: 11 }}>
                          Jami: {(s.total || 0).toLocaleString()} so'm
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
              {n.created_at && (
                <div style={{ marginTop: 6, fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Clock size={12} />
                  <span>Ochilgan: {new Date(n.created_at).toLocaleString('uz-UZ', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                </div>
              )}
              <div style={{ marginTop: 12, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <button
                  className="btn btn-sm btn-success"
                  onClick={() => { setShowPay(n); }}
                >
                  To'lov
                </button>
                <button
                  className="btn btn-sm btn-outline"
                  onClick={() => openDetail(n)}
                >
                  Batafsil
                </button>
                <button
                  className="btn btn-sm btn-danger"
                  style={{ background: 'var(--danger)', color: 'white', border: 'none' }}
                  onClick={() => handleDeleteNasiya(n.id)}
                >
                  <Trash2 size={13} /> O'chirish
                </button>
              </div>
              {n.status === 'paid' && (
                <div style={{
                  marginTop: 8,
                  padding: '4px 12px',
                  background: 'rgba(0,184,148,0.15)',
                  color: 'var(--success)',
                  borderRadius: 20,
                  fontSize: 12,
                  fontWeight: 600,
                  display: 'inline-block'
                }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <Check size={13} /> To'langan
                  </div>
                </div>
              )}
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="empty-cart" style={{ gridColumn: '1 / -1' }}>
              <div className="icon"><Notebook size={48} /></div>
              <p>Nasiyalar yo'q</p>
            </div>
          )}
        </div>
      )}

      {showAdd && (
        <div className="modal-overlay" onClick={() => setShowAdd(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2 style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Plus size={18} /> Yangi nasiya</h2>
            <div className="input-group">
              <label>Mijoz nomi *</label>
              <input className="input" placeholder="Ism Familiya" value={name} onChange={e => setName(e.target.value)} />
            </div>
            <div className="input-group">
              <label>Telefon raqam</label>
              <input className="input" placeholder="+998 XX XXX XX XX" value={phone} onChange={e => setPhone(e.target.value)} />
            </div>
            <div className="input-group">
              <label>Manzil</label>
              <input className="input" placeholder="Masalan: Toshkent sh., Chilonzor 5-mavze" value={address} onChange={e => setAddress(e.target.value)} />
            </div>
            <div className="input-group">
              <label>Rasm</label>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <label style={{
                  flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  padding: '12px 16px', background: 'var(--bg-input)', border: '1.5px dashed var(--border)',
                  borderRadius: 'var(--radius-sm)', cursor: 'pointer', transition: 'all 0.2s',
                  color: 'var(--text-secondary)', fontSize: 13
                }}>
                  <Camera size={16} /> Kamera / Galereya
                  <input type="file" accept="image/*" capture="environment" onChange={handleImageUpload} style={{ display: 'none' }} />
                </label>
              </div>
              {image && (
                <div style={{ marginTop: 8, position: 'relative', display: 'inline-block' }}>
                  <img src={image} alt="preview" style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 'var(--radius-sm)', border: '1.5px solid var(--border)' }}
                    onError={e => { e.target.style.display = 'none'; }} />
                  <button onClick={() => setImage('')} style={{
                    position: 'absolute', top: -6, right: -6, width: 20, height: 20,
                    borderRadius: '50%', background: 'var(--danger)', color: 'white',
                    border: 'none', cursor: 'pointer', fontSize: 12, display: 'flex',
                    alignItems: 'center', justifyContent: 'center'
                  }}>x</button>
                </div>
              )}
            </div>
            <div className="modal-actions">
              <button className="btn btn-outline" onClick={() => setShowAdd(false)}>Bekor</button>
              <button className="btn btn-primary" onClick={handleAdd}>Ochish</button>
            </div>
          </div>
        </div>
      )}

      {showPay && (
        <div className="modal-overlay" onClick={() => setShowPay(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2 style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Banknote size={18} /> To'lov — {showPay.customer_name}</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 16 }}>
              Qarz: {(showPay.total_debt - showPay.paid_amount).toLocaleString()} so'm
            </p>
            <div className="input-group">
              <label>To'lov miqdori *</label>
              <input
                className="input"
                type="number"
                placeholder="0"
                value={payAmount}
                onChange={e => setPayAmount(e.target.value)}
              />
            </div>
            <div className="input-group">
              <label>Izoh</label>
              <input className="input" placeholder="Izoh (ixtiyoriy)" value={payNote} onChange={e => setPayNote(e.target.value)} />
            </div>
            <div className="modal-actions">
              <button className="btn btn-outline" onClick={() => setShowPay(null)}>Bekor</button>
              <button className="btn btn-success" onClick={handlePay} disabled={actionLoading}>
                {actionLoading ? <div className="spinner"></div> : <><Banknote size={16} /> Qabul qilish</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {showDetail && (
        <div className="modal-overlay" onClick={() => setShowDetail(null)}>
          <div className="modal" style={{ maxWidth: 600 }} onClick={e => e.stopPropagation()}>
            <h2 style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {showDetail.image && (
                <img
                  src={showDetail.image}
                  alt={showDetail.customer_name}
                  onError={onProductImgError}
                  style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover', border: '1.5px solid var(--border)', flexShrink: 0 }}
                />
              )}
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><ClipboardList size={16} /> {showDetail.customer_name} — Batafsil</span>
            </h2>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', marginBottom: 14, color: 'var(--text-secondary)', fontSize: 13 }}>
              {showDetail.phone && <div><Phone size={13} style={{ verticalAlign: 'middle', marginRight: 4 }} /> {showDetail.phone}</div>}
              {showDetail.address && <div><MapPin size={13} style={{ verticalAlign: 'middle', marginRight: 4 }} /> {showDetail.address}</div>}
            </div>

            <div className="stat-cards" style={{ marginBottom: 16 }}>
              <div className="stat-card yellow">
                <div className="value" style={{ fontSize: 20 }}>{showDetail.total_debt.toLocaleString()} so'm</div>
                <div className="label">Jami qarz</div>
              </div>
              <div className="stat-card green">
                <div className="value" style={{ fontSize: 20 }}>{showDetail.paid_amount.toLocaleString()} so'm</div>
                <div className="label">To'langan</div>
              </div>
            </div>

            {payments.length > 0 && (
              <>
                <h3 style={{ marginBottom: 12, fontSize: 16 }}>To'lovlar tarixi</h3>
                <div className="table-container" style={{ marginBottom: 20 }}>
                  <table>
                    <thead>
                      <tr>
                        <th>Sana</th>
                        <th>Miqdor</th>
                        <th>Izoh</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payments.map(p => (
                        <tr key={p.id}>
                          <td style={{ fontSize: 12 }}>
                            <div style={{ fontWeight: 600 }}>
                              {new Date(p.created_at).toLocaleDateString('uz-UZ', { year: 'numeric', month: '2-digit', day: '2-digit' })}
                            </div>
                            <div style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                              <Clock size={11} />
                              {new Date(p.created_at).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                            </div>
                          </td>
                          <td className="text-success" style={{ fontWeight: 700 }}>{p.amount.toLocaleString()} so'm</td>
                          <td className="text-muted">{p.note || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {nasiyaSales.length > 0 ? (
              <>
                <h3 style={{ marginBottom: 12, fontSize: 16, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <ShoppingBag size={18} color="var(--primary)" /> Sotib olingan tovarlar tarixi
                </h3>
                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th style={{ whiteSpace: 'nowrap' }}>Sana va Vaqt (sekundigacha)</th>
                        <th>Mahsulotlar va Narxlari</th>
                        <th>To'langan</th>
                        <th>Qarzga yozilgan</th>
                      </tr>
                    </thead>
                    <tbody>
                      {nasiyaSales.map(s => (
                        <tr key={s.id}>
                          <td style={{ fontSize: 12, whiteSpace: 'nowrap' }}>
                            <div style={{ fontWeight: 600, color: 'var(--text)' }}>
                              {new Date(s.created_at).toLocaleDateString('uz-UZ', { year: 'numeric', month: '2-digit', day: '2-digit' })}
                            </div>
                            <div style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                              <Clock size={11} />
                              {new Date(s.created_at).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                            </div>
                          </td>
                          <td>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                              {s.items && s.items.map((item, idx) => (
                                <div key={idx} style={{ fontSize: 12, display: 'flex', justifyContent: 'space-between', gap: 8, background: 'var(--bg-secondary)', padding: '4px 8px', borderRadius: 4 }}>
                                  <span><strong>{item.name}</strong> × {item.quantity} dona</span>
                                  <span style={{ color: 'var(--text-secondary)' }}>
                                    {(item.price || 0).toLocaleString()} so'm = <strong>{((item.price || 0) * (item.quantity || 1)).toLocaleString()} so'm</strong>
                                  </span>
                                </div>
                              ))}
                            </div>
                            <div style={{ marginTop: 4, textAlign: 'right', fontSize: 11, fontWeight: 700, color: 'var(--text)' }}>
                              Jami xarid: {(s.total || 0).toLocaleString()} so'm
                            </div>
                          </td>
                          <td className="text-success" style={{ fontWeight: 600, whiteSpace: 'nowrap', fontSize: 12 }}>
                            {(s.paid || 0).toLocaleString()} so'm
                          </td>
                          <td className="text-danger" style={{ fontWeight: 700, whiteSpace: 'nowrap', fontSize: 13 }}>
                            {((s.total || 0) - (s.paid || 0)).toLocaleString()} so'm
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <div style={{ padding: '16px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                Hali nasiyaga tovar olinmagan
              </div>
            )}

            <div className="modal-actions">
              <button className="btn btn-outline" onClick={() => setShowDetail(null)}>Yopish</button>
              <button className="btn btn-outline" onClick={() => { setShowDetail(null); setShowPay(showDetail); }} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <Banknote size={14} /> To'lov qilish
              </button>
              <button className="btn btn-primary" onClick={openAddSale} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <ShoppingBag size={14} /> Sotuv qo'shish
              </button>
            </div>
          </div>
        </div>
      )}

      {showAddSale && showDetail && (
        <div className="modal-overlay" onClick={() => setShowAddSale(false)}>
          <div className="modal" style={{ maxWidth: 520 }} onClick={e => e.stopPropagation()}>
            <h2 style={{ display: 'flex', alignItems: 'center', gap: 8 }}><ShoppingBag size={18} /> Sotuv qo'shish — {showDetail.customer_name}</h2>
<div className="input-group">
                <label>Mahsulot</label>
                <div className="add-sale-row" style={{ display: 'flex', gap: 8 }}>
                <select className="input" style={{ flex: 1 }} value={addSaleProductId} onChange={e => setAddSaleProductId(e.target.value)}>
                  <option value="">Mahsulot tanlang...</option>
                  {addSaleProducts.map(p => (
                    <option key={p.id} value={p.id}>{p.name} — {p.price.toLocaleString()} so'm</option>
                  ))}
                </select>
                <input
                  className="input"
                  type="number"
                  min="1"
                  style={{ width: 70, textAlign: 'center' }}
                  value={addSaleQty}
                  onChange={e => setAddSaleQty(e.target.value)}
                />
                <button className="btn btn-primary" onClick={addSaleItem} disabled={!addSaleProductId} style={{ whiteSpace: 'nowrap' }}>
                  <Plus size={14} /> Qo'shish
                </button>
              </div>
            </div>

            {addSaleItems.length > 0 && (
              <div style={{ marginBottom: 12 }}>
                {addSaleItems.map((item, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, background: 'var(--bg-secondary)', padding: '6px 10px', borderRadius: 6, marginBottom: 6, fontSize: 13 }}>
                    <span style={{ flex: 1 }}><strong>{item.name}</strong> × {item.quantity}</span>
                    <span style={{ color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{(item.price * item.quantity).toLocaleString()} so'm</span>
                    <button onClick={() => setAddSaleItems(prev => prev.filter((_, i) => i !== idx))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', fontSize: 15, lineHeight: 1 }}>×</button>
                  </div>
                ))}
              </div>
            )}
            {addSaleItems.length > 0 && (
              <div style={{ textAlign: 'right', fontWeight: 700, marginBottom: 12, fontSize: 14 }}>
                Jami: {addSaleTotal.toLocaleString()} so'm
              </div>
            )}

            <div className="input-group">
              <label>Sana va vaqt (ixtiyoriy, standart hozir)</label>
              <input
                className="input"
                type="datetime-local"
                step="1"
                value={addSaleDate}
                onChange={e => setAddSaleDate(e.target.value)}
              />
            </div>
            <div className="input-group">
              <label>To'langan miqdor (ixtiyoriy)</label>
              <input
                className="input"
                type="number"
                placeholder="0"
                value={addSalePaid}
                onChange={e => setAddSalePaid(e.target.value)}
              />
            </div>
            <div className="modal-actions">
              <button className="btn btn-outline" onClick={() => setShowAddSale(false)}>Bekor</button>
              <button className="btn btn-primary" onClick={handleAddSale} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <Check size={15} /> Saqlash
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
