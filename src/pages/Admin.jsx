import { useState, useEffect, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { api } from '../api';
import { useApp } from '../context/AppContext';
import { Lock, Package, Coins, LayoutDashboard, Notebook, TriangleAlert, Trash2, Info, Settings, Archive, ShoppingCart, MessageSquare, ClipboardList, Phone, MapPin, X, Calendar, ShoppingBag, Banknote, CreditCard, UserRound, Bot, Camera, ArrowRight } from 'lucide-react';
import { onProductImgError } from '../utils/media';

export default function Admin() {
  const [activeTab, setActiveTab] = useState('stats');
  const [products, setProducts] = useState([]);
  const [nasiyaList, setNasiyaList] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [showEdit, setShowEdit] = useState(null);
  const [showQR, setShowQR] = useState(null);
  const [loading, setLoading] = useState(false);
  const [settingsForm, setSettingsForm] = useState({});
  const [showAddNasiya, setShowAddNasiya] = useState(false);
  const [showEditNasiya, setShowEditNasiya] = useState(null);
  const [nasiyaForm, setNasiyaForm] = useState({ customer_name: '', phone: '', address: '', location: '', image: '' });
  const [adminStats, setAdminStats] = useState(null);
  const [dailyStats, setDailyStats] = useState(null);
  const [monthlyStats, setMonthlyStats] = useState(null);
  const [selectedTables, setSelectedTables] = useState([]);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [archiveData, setArchiveData] = useState([]);
  const [archiveStats, setArchiveStats] = useState(null);
  const [showArchiveDetail, setShowArchiveDetail] = useState(null);
  const [showDistribute, setShowDistribute] = useState(null);
  const [distForm, setDistForm] = useState({ client_name: '', client_phone: '', quantity: '', paid_amount: '', note: '' });
  const [adminPassword, setAdminPassword] = useState('');
  const [adminError, setAdminError] = useState('');
  const [adminLoggingIn, setAdminLoggingIn] = useState(false);
  const [lowStockProducts, setLowStockProducts] = useState([]);
  const [showNasiyaDetail, setShowNasiyaDetail] = useState(null);
  const [nasiyaDetailPayments, setNasiyaDetailPayments] = useState([]);
  const [nasiyaDetailSales, setNasiyaDetailSales] = useState([]);
  const [nasiyaSelectedDate, setNasiyaSelectedDate] = useState(null);
  const [nasiyaCalendarMonth, setNasiyaCalendarMonth] = useState(() => { const d = new Date(); return { year: d.getFullYear(), month: d.getMonth() }; });
  const qrRef = useRef(null);
  const { showToast, isAdmin, loginAdmin } = useApp();

  const roundNum = (n) => {
    if (n >= 1000000) return Math.round(n / 10000) * 10000;
    if (n >= 10000) return Math.round(n / 1000) * 1000;
    if (n >= 1000) return Math.round(n / 100) * 100;
    return Math.round(n);
  };

  const canRestore = (sourceTable) => {
    const base = (sourceTable || '').replace(/_(daily|monthly|manual|full)$/, '');
    return ['sales', 'distributions', 'ai_chat_history'].includes(base);
  };

  const [form, setForm] = useState({
    name: '', barcode: '', product_code: '', price: '', cost: '', stock: '', category: '', image: ''
  });

  useEffect(() => {
    if (isAdmin) {
      loadAll();
    }
  }, [isAdmin]);

  const loadAll = async () => {
    setLoading(true);
    await Promise.allSettled([
      loadProducts(),
      loadNasiya(),
      loadSettings(),
      loadAdminStats(),
      loadDashStats(),
      loadArchiveStats(),
      loadLowStock()
    ]);
    setLoading(false);
  };

  const loadLowStock = async () => {
    try {
      const data = await api.getLowStock();
      setLowStockProducts(data);
    } catch {}
  };

  const loadNasiyaDetail = async (nasiya) => {
    setShowNasiyaDetail(nasiya);
    try {
      const [payments, sales] = await Promise.allSettled([
        api.getNasiyaPayments(nasiya.id),
        api.getNasiyaSales(nasiya.id)
      ]);
      if (payments.status === 'fulfilled') setNasiyaDetailPayments(payments.value);
      if (sales.status === 'fulfilled') setNasiyaDetailSales(sales.value);
    } catch {}
  };

  const loadAdminStats = async () => {
    try {
      const data = await api.getAdminStats();
      setAdminStats(data);
    } catch {}
  };

  const loadDashStats = async () => {
    try {
      const [d, m] = await Promise.allSettled([
        api.getDailyStats(),
        api.getMonthlyStats(new Date().toISOString().slice(0, 7))
      ]);
      if (d.status === 'fulfilled') setDailyStats(d.value);
      if (m.status === 'fulfilled') setMonthlyStats(m.value);
    } catch {}
  };

  const loadArchiveStats = async () => {
    try {
      const data = await api.getArchiveStats();
      setArchiveStats(data);
    } catch {}
  };

  const loadArchive = async () => {
    try {
      const data = await api.getArchive();
      setArchiveData(data);
    } catch {}
  };

  const handleRestoreArchive = async (item) => {
    if (!confirm(`Arxivdan tiklash: ${item.source_table} jadvalidan ${item.data.length} ta yozuvni tiklashni xohlaysizmi?`)) return;
    try {
      const res = await api.restoreArchive(item.id);
      showToast(res.message || `${item.data.length} ta yozuv tiklandi`);
      loadArchive();
      loadArchiveStats();
      loadAll();
    } catch (err) {
      showToast(err.message || 'Tiklashda xatolik', 'error');
    }
  };

  const handleDeleteArchiveItem = async (id) => {
    if (!confirm('Arxiv yozuvini o\'chirishni xohlaysizmi?')) return;
    try {
      await api.deleteArchiveItem(id);
      showToast('Arxiv o\'chirildi');
      loadArchive();
      loadArchiveStats();
    } catch {
      showToast('Xatolik', 'error');
    }
  };

  const handleClearArchive = async () => {
    if (!confirm('Barcha arxivni tozalashni xohlaysizmi? Bu amalni qaytarib bo\'lmaydi!')) return;
    try {
      await api.clearArchive();
      showToast('Arxiv tozalandi');
      loadArchive();
      loadArchiveStats();
    } catch {
      showToast('Xatolik', 'error');
    }
  };

  const loadProducts = async () => {
    try {
      const data = await api.getProducts();
      setProducts(data);
    } catch {}
  };

  const loadNasiya = async () => {
    try {
      const data = await api.getNasiya();
      setNasiyaList(data);
    } catch {}
  };

  const loadSettings = async () => {
    try {
      const data = await api.getAdminSettings();
      setSettingsForm({
        shop_name: data.shop_name || '',
        shop_number: data.shop_number || '',
        shop_address: data.shop_address || '',
        shop_phone: data.shop_phone || ''
      });
    } catch {}
  };

  const resetForm = () => setForm({ name: '', barcode: '', product_code: '', price: '', cost: '', stock: '', category: '', image: '' });

  const handleDistribute = async () => {
    if (!distForm.client_name.trim()) {
      showToast('Mijoz nomini kiriting', 'error');
      return;
    }
    const qty = Number(distForm.quantity) || 1;
    const unitPrice = showDistribute.cost || 0;
    try {
      await api.createDistribution({
        client_name: distForm.client_name,
        client_phone: distForm.client_phone,
        product_id: showDistribute.id,
        product_name: showDistribute.name,
        quantity: qty,
        unit_price: unitPrice,
        paid_amount: Number(distForm.paid_amount) || 0,
        note: distForm.note
      });
      setShowDistribute(null);
      setDistForm({ client_name: '', client_phone: '', quantity: '', paid_amount: '', note: '' });
      showToast('Tarqatish qo\'shildi');
      loadProducts();
      loadAdminStats();
    } catch (err) {
      showToast(err.message || 'Xatolik', 'error');
    }
  };

  const handleAdd = async () => {
    if (!form.name || !form.price) {
      showToast('Nomi va narxini kiriting', 'error');
      return;
    }
    try {
      await api.createProduct({
        ...form,
        price: Number(form.price),
        cost: Number(form.cost) || 0,
        stock: Number(form.stock) || 0
      });
      resetForm();
      setShowAdd(false);
      showToast('Mahsulot qo\'shildi');
      loadProducts();
      loadAdminStats();
    } catch (err) {
      showToast(err.message || 'Xatolik', 'error');
    }
  };

  const handleEdit = async () => {
    if (!form.name || !form.price) {
      showToast('Nomi va narxini kiriting', 'error');
      return;
    }
    try {
      await api.updateProduct(showEdit.id, {
        ...form,
        price: Number(form.price),
        cost: Number(form.cost) || 0,
        stock: Number(form.stock) || 0
      });
      resetForm();
      setShowEdit(null);
      showToast('Mahsulot yangilandi');
      loadProducts();
      loadAdminStats();
    } catch (err) {
      showToast(err.message || 'Xatolik', 'error');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('O\'chirishni xohlaysizmi?')) return;
    try {
      await api.deleteProduct(id);
      showToast('Mahsulot o\'chirildi');
      loadProducts();
      loadAdminStats();
    } catch {
      showToast('Xatolik', 'error');
    }
  };

  const openEdit = (product) => {
    setForm({
      name: product.name,
      barcode: product.barcode || '',
      product_code: product.product_code || '',
      price: product.price.toString(),
      cost: product.cost.toString(),
      stock: product.stock.toString(),
      category: product.category || '',
      image: product.image || ''
    });
    setShowEdit(product);
  };

  const handleAddNasiya = async () => {
    if (!nasiyaForm.customer_name.trim()) {
      showToast('Mijoz nomini kiriting', 'error');
      return;
    }
    try {
      if (showEditNasiya) {
        await api.updateNasiya(showEditNasiya.id, nasiyaForm);
        showToast('Nasiya yangilandi');
      } else {
        await api.createNasiya(nasiyaForm);
        showToast('Nasiya qo\'shildi');
      }
      setNasiyaForm({ customer_name: '', phone: '', address: '', location: '', image: '' });
      setShowAddNasiya(false);
      setShowEditNasiya(null);
      loadNasiya();
      loadAdminStats();
    } catch {
      showToast('Xatolik', 'error');
    }
  };

  const handleNasiyaImageUpload = (e) => {
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
          setNasiyaForm(prev => ({ ...prev, image: result.url }));
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

  const handleDeleteNasiya = async (id) => {
    if (!confirm('Nasiyani o\'chirishni xohlaysizmi?')) return;
    try {
      await api.deleteNasiya(id);
      showToast('Nasiya o\'chirildi');
      loadNasiya();
      loadAdminStats();
    } catch {
      showToast('Xatolik', 'error');
    }
  };

  const handleSaveSettings = async () => {
    try {
      for (const [key, value] of Object.entries(settingsForm)) {
        await api.updateAdminSetting(key, value);
      }
      showToast('Sozlamalar saqlandi');
    } catch {
      showToast('Xatolik', 'error');
    }
  };

  const handleBackup = async () => {
    try {
      await api.downloadBackup();
      showToast('Backup yuklab olindi');
    } catch {
      showToast('Backup xatolik', 'error');
    }
  };

  const toggleTable = (table) => {
    setSelectedTables(prev =>
      prev.includes(table) ? prev.filter(t => t !== table) : [...prev, table]
    );
  };

  const selectAllTables = () => {
    setSelectedTables(['sales', 'ai_chat_history', 'distributions']);
  };

  const handleBulkDelete = async () => {
    if (selectedTables.length === 0) {
      showToast('Kamida bitta jadvalni tanlang', 'error');
      return;
    }
    const names = selectedTables.map(t => t === 'sales' ? 'Sotishlar' : t === 'ai_chat_history' ? 'AI Chat' : 'Tarqatishlar');
    if (!confirm(`${names.join(', ')} — ma'lumotlar arxivga saqlanadi.\n\nEslatma: hech narsa o'chirilmaydi, hammasi joyida qoladi.\n\nDavom etishni xohlaysizmi?`)) return;
    setBulkDeleting(true);
    try {
      const result = await api.bulkDelete(selectedTables);
      showToast(`${result.deleted.length} ta jadval tozalandi. Dashboard yangilandi.`);
      setSelectedTables([]);
      loadAll();
    } catch {
      showToast('Xatolik yuz berdi', 'error');
    } finally {
      setBulkDeleting(false);
    }
  };

  const handleAutoArchive = async () => {
    if (!confirm("Bugungi ma'lumotlar arxivga saqlanadi.\n\nEslatma: ma'lumotlar o'chirilmaydi, hammasi joyida qoladi.\n\nDavom etishni xohlaysizmi?")) return;
    try {
      const result = await api.autoArchive();
      showToast(`${result.count} ta yozuv arxivlandi va tozalandi`);
      loadAll();
    } catch {
      showToast('Xatolik yuz berdi', 'error');
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      showToast('Rasm hajmi 5MB dan kichik bo\'lishi kerak', 'error');
      return;
    }
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const result = await api.uploadImage(reader.result, file.name);
        if (result.url) {
          setForm({ ...form, image: result.url });
          showToast('Rasm yuklandi');
        } else {
          showToast('Rasm yuklashda xatolik', 'error');
        }
      };
      reader.readAsDataURL(file);
    } catch {
      showToast('Rasm yuklashda xatolik', 'error');
    }
  };

  const downloadQR = (product) => {
    const svg = qrRef.current?.querySelector('svg');
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      const a = document.createElement('a');
      a.download = `${product.name}_QR.png`;
      a.href = canvas.toDataURL('image/png');
      a.click();
    };
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  };

  const handleAdminLogin = async (e) => {
    e.preventDefault();
    setAdminLoggingIn(true);
    setAdminError('');
    const result = await loginAdmin(adminPassword);
    setAdminLoggingIn(false);
    if (result.ok) {
      setAdminPassword('');
    } else {
      setAdminError(result.error);
    }
  };

  if (!isAdmin) {
    return (
      <div>
        <div className="page-header">
          <div>
            <h1>Admin Panel</h1>
            <p>Boshqaruv paneli — barcha sozlamalar va ma'lumotlar</p>
          </div>
        </div>
        <div className="card" style={{ maxWidth: 400, margin: '40px auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 20 }}>
            <div style={{ marginBottom: 8, color: 'var(--primary-light)' }}><Lock size={40} /></div>
            <h2 style={{ marginBottom: 4 }}>Admin kirish</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Davom etish uchun admin parolni kiriting</p>
          </div>
          <form onSubmit={handleAdminLogin}>
            <div className="input-group">
              <label>Parol</label>
              <input
                className="input"
                type="password"
                placeholder="Admin parol"
                value={adminPassword}
                onChange={e => { setAdminPassword(e.target.value); setAdminError(''); }}
                autoFocus
              />
            </div>
            {adminError && <p style={{ color: 'var(--danger)', fontSize: 13, marginTop: 8 }}>{adminError}</p>}
            <button className="btn btn-primary" style={{ width: '100%', marginTop: 16 }} disabled={adminLoggingIn || !adminPassword}>
              {adminLoggingIn ? 'Tekshirilmoqda...' : 'Kirish'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Admin Panel</h1>
          <p>Boshqaruv paneli — barcha sozlamalar va ma'lumotlar</p>
        </div>
      </div>

      <div className="tabs" style={{ maxWidth: 800, marginBottom: 24, flexWrap: 'wrap' }}>
        <button className={`tab ${activeTab === 'stats' ? 'active' : ''}`} onClick={() => setActiveTab('stats')}>
          Statistika
        </button>
        <button className={`tab ${activeTab === 'products' ? 'active' : ''}`} onClick={() => setActiveTab('products')}>
          Mahsulotlar
          {lowStockProducts.length > 0 && (
            <span style={{ background: 'var(--warning)', color: '#0F0F1A', borderRadius: 10, padding: '1px 7px', fontSize: 11, marginLeft: 6, fontWeight: 700 }}>{lowStockProducts.length}</span>
          )}
        </button>
        <button className={`tab ${activeTab === 'nasiya' ? 'active' : ''}`} onClick={() => setActiveTab('nasiya')}>
          Nasiya
        </button>
        <button className={`tab ${activeTab === 'settings' ? 'active' : ''}`} onClick={() => setActiveTab('settings')}>
          Nastroyka
        </button>
        <button className={`tab ${activeTab === 'backup' ? 'active' : ''}`} onClick={() => setActiveTab('backup')}>
          Backup
        </button>
        <button className={`tab ${activeTab === 'delete' ? 'active' : ''}`} onClick={() => setActiveTab('delete')}>
          Arxivlash
        </button>
        <button className={`tab ${activeTab === 'archive' ? 'active' : ''}`} onClick={() => { setActiveTab('archive'); loadArchive(); }}>
          Arxiv
          {archiveStats && archiveStats.total > 0 && (
            <span style={{ background: 'var(--danger)', color: 'white', borderRadius: 10, padding: '1px 7px', fontSize: 11, marginLeft: 6, fontWeight: 700 }}>{archiveStats.total}</span>
          )}
        </button>
      </div>

      {activeTab === 'stats' && (
        <>
          {loading ? (
            <div className="loading-screen" style={{ position: 'relative' }}><div className="loader"></div></div>
          ) : (
            <>
              <div className="stat-cards">
                {adminStats && (
                  <>
                    <div className="stat-card purple">
                      <div className="icon"><Package size={22} /></div>
                      <div className="value">{adminStats.products}</div>
                      <div className="label">Mahsulotlar</div>
                    </div>
                    <div className="stat-card green">
                      <div className="icon"><Coins size={22} /></div>
                      <div className="value">{(adminStats.todayRevenue || 0).toLocaleString()} so'm</div>
                      <div className="label">Bugungi savdo</div>
                    </div>
                    <div className="stat-card pink">
                      <div className="icon"><LayoutDashboard size={22} /></div>
                      <div className="value">{adminStats.totalSales}</div>
                      <div className="label">Sotishlar soni</div>
                    </div>
                    <div className="stat-card yellow">
                      <div className="icon"><Notebook size={22} /></div>
                      <div className="value">{adminStats.nasiyaActive}</div>
                      <div className="label">Faol nasiya</div>
                    </div>
                  </>
                )}
              </div>

              {lowStockProducts.length > 0 && (
                <div style={{
                  marginTop: 16, padding: '14px 18px', borderRadius: 'var(--radius)',
                  background: 'rgba(253,203,110,0.1)',
                  border: '1.5px solid rgba(253,203,110,0.5)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                    <TriangleAlert size={20} color="var(--warning)" />
                    <strong style={{ color: 'var(--warning)', fontSize: 14 }}>Kam qolgan mahsulotlar ({lowStockProducts.length} ta)</strong>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {lowStockProducts.map(p => (
                      <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 10px', background: 'rgba(0,0,0,0.15)', borderRadius: 8, fontSize: 13 }}>
                        <span style={{ fontWeight: 600 }}>{p.name} <span style={{ color: 'var(--text-muted)', fontFamily: 'monospace', fontSize: 11 }}>#{p.product_code || '—'}</span></span>
                        <span style={{ fontWeight: 700, color: p.stock === 0 ? 'var(--danger)' : 'var(--warning)' }}>{p.stock} dona</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid-2" style={{ marginTop: 24 }}>
                <div className="card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <h3>Bugungi savdo</h3>
                    <button className="btn btn-sm btn-danger" onClick={async () => {
                      if (!confirm("Bugungi barcha savdolarni arxivlab, ro'yxatdan o'chirishni xohlaysizmi?")) return;
                      try {
                        await api.cleanDaily();
                        showToast("Bugungi ma'lumotlar arxivlandi va faol ro'yxatdan o'chirildi");
                        loadAll();
                      } catch (err) {
                        showToast(err.message || 'Xatolik', 'error');
                      }
                    }}><Trash2 size={14} /> Arxivlash va O'chirish</button>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div className="flex-between" style={{ padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                      <span>Savdo</span><span style={{ fontWeight: 700 }}>{(dailyStats?.totalSales || 0).toLocaleString()} so'm</span>
                    </div>
                    <div className="flex-between" style={{ padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                      <span>Naqd pul</span><span className="text-success" style={{ fontWeight: 700 }}>{(dailyStats?.totalCash || 0).toLocaleString()} so'm</span>
                    </div>
                    <div className="flex-between" style={{ padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                      <span>Foyda</span><span style={{ fontWeight: 700, color: 'var(--secondary)' }}>{(dailyStats?.totalProfit || 0).toLocaleString()} so'm</span>
                    </div>
                    <div className="flex-between" style={{ padding: '10px 0' }}>
                      <span>Tranzaksiyalar</span><span style={{ fontWeight: 700 }}>{dailyStats?.salesCount || 0}</span>
                    </div>
                  </div>
                </div>

                <div className="card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <h3>Oylik hisobot</h3>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="btn btn-sm btn-danger" style={{ fontWeight: 600, fontSize: 12 }} onClick={async () => {
                        if (!confirm("Oylik barcha savdolarni arxivlab, ro'yxatdan o'chirishni xohlaysizmi?")) return;
                        try {
                          await api.cleanMonthly();
                          showToast("Oylik ma'lumotlar arxivlandi va faol ro'yxatdan o'chirildi");
                          loadAll();
                        } catch (err) {
                          showToast(err.message || 'Xatolik', 'error');
                        }
                      }}><Trash2 size={14} /> Arxivlash va O'chirish</button>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div className="flex-between" style={{ padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                      <span>Savdo</span><span style={{ fontWeight: 700 }}>{(monthlyStats?.totalSales || 0).toLocaleString()} so'm</span>
                    </div>
                    <div className="flex-between" style={{ padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                      <span>Foyda</span><span style={{ fontWeight: 700, color: 'var(--secondary)' }}>{(monthlyStats?.totalProfit || 0).toLocaleString()} so'm</span>
                    </div>
                    <div className="flex-between" style={{ padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                      <span>Nasiya qarzi</span><span className="text-danger" style={{ fontWeight: 700 }}>{(monthlyStats?.totalNasiyaDebt || 0).toLocaleString()} so'm</span>
                    </div>
                    <div className="flex-between" style={{ padding: '10px 0' }}>
                      <span>O'rtacha tranzaksiya</span><span style={{ fontWeight: 700 }}>
                        {monthlyStats?.salesCount > 0 ? Math.round(monthlyStats.totalSales / monthlyStats.salesCount).toLocaleString() : 0} so'm
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {adminStats && (
                <div className="card" style={{ marginTop: 24 }}>
                  <h3 style={{ marginBottom: 16 }}>Tizim haqida</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div className="flex-between" style={{ padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                      <span>Database hajmi</span><span style={{ fontWeight: 600, fontFamily: 'monospace' }}>{adminStats.dbSize}</span>
                    </div>
                    <div className="flex-between" style={{ padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                      <span>Server ish vaqti</span><span style={{ fontWeight: 600 }}>{adminStats.uptime}</span>
                    </div>
                    <div className="flex-between" style={{ padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                      <span>Node.js</span><span style={{ fontWeight: 600, fontFamily: 'monospace' }}>{adminStats.nodeVersion}</span>
                    </div>
                    <div className="flex-between" style={{ padding: '8px 0' }}>
                      <span>Platforma</span><span style={{ fontWeight: 600 }}>{adminStats.platform}</span>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}

      {activeTab === 'products' && (
        <>
          <div className="flex-between mb-4">
            <p style={{ color: 'var(--text-secondary)' }}>{products.length} ta mahsulot</p>
            <button className="btn btn-primary" onClick={() => { resetForm(); setShowAdd(true); }}>
              Mahsulot qo'shish
            </button>
          </div>

          {/* Desktop: jadval */}
          <div className="table-container admin-desktop-table">
            <table>
              <thead>
                <tr>
                  <th>QR</th><th>Rasm</th><th>Kod</th><th>Nomi</th><th className="hide-mobile">Barcode</th>
                  <th>Narx</th><th className="hide-mobile">Xarajat</th><th className="hide-mobile">Foyda</th><th>Qoldiq</th><th className="hide-mobile">Kat.</th><th>Amallar</th>
                </tr>
              </thead>
              <tbody>
                {products.map(p => (
                  <tr key={p.id}>
                    <td><button className="btn btn-sm btn-outline" onClick={() => setShowQR(p)} style={{ padding: '4px 8px', fontSize: 11 }}>QR</button></td>
                    <td>
                      {p.image ? (
                        <img src={p.image} alt={p.name} style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 8, border: '1.5px solid var(--border)' }} onError={onProductImgError} />
                      ) : (
                        <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 40, height: 40, borderRadius: 8, background: 'var(--bg-input)', color: 'var(--text-muted)' }}><Package size={18} /></span>
                      )}
                    </td>
                    <td><span style={{ background: 'rgba(108,92,231,0.15)', color: 'var(--primary-light)', padding: '2px 8px', borderRadius: 12, fontSize: 12, fontWeight: 700, fontFamily: 'monospace' }}>{p.product_code || '—'}</span></td>
                    <td style={{ fontWeight: 600 }}>{p.name}</td>
                    <td className="text-muted hide-mobile" style={{ fontFamily: 'monospace' }}>{p.barcode}</td>
                    <td>{p.price.toLocaleString()} so'm</td>
                    <td className="hide-mobile">{p.cost.toLocaleString()} so'm</td>
                    <td className="text-success hide-mobile">{(p.price - p.cost).toLocaleString()} so'm</td>
                    <td><span style={{ color: p.stock <= 5 ? 'var(--danger)' : p.stock <= 15 ? 'var(--warning)' : 'var(--success)', fontWeight: 600 }}>{p.stock}</span></td>
                    <td className="text-muted hide-mobile">{p.category || '—'}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        <button className="btn btn-sm btn-outline" onClick={() => openEdit(p)} style={{ padding: '4px 8px', fontSize: 11 }}>Tahrir</button>
                        <button className="btn btn-sm btn-primary" onClick={() => { setDistForm({ client_name: '', client_phone: '', quantity: '', paid_amount: '', note: '' }); setShowDistribute(p); }} style={{ padding: '4px 8px', fontSize: 11 }}>Tarqatish</button>
                        <button className="btn btn-sm btn-danger" onClick={() => handleDelete(p.id)} style={{ padding: '4px 8px', fontSize: 11 }}>O'chir</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {products.length === 0 && <div className="empty-cart" style={{ padding: 48 }}><div className="icon"><Package size={48} /></div><p>Mahsulotlar yo'q</p></div>}
          </div>

          {/* Mobile: kartochkalar */}
          <div className="products-grid admin-mobile-cards">
            {products.map((p, i) => (
              <div key={p.id} className="product-card uzum-card" style={{ animationDelay: `${i * 0.03}s` }}>
                <div className="uzum-card-img" onClick={() => setShowQR(p)} style={{ cursor: 'pointer' }}>
                  {p.image ? (
                    <img src={p.image} alt={p.name} onError={onProductImgError} />
                  ) : null}
                  <div style={{
                    display: p.image ? 'none' : 'flex',
                    flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    gap: 4, color: 'var(--text-muted)', width: '100%', height: '100%'
                  }}>
                    <span style={{ color: 'var(--text-muted)' }}><Package size={40} /></span>
                  </div>
                  {p.stock === 0 && <span className="uzum-badge-oz">Tugagan</span>}
                  {p.stock > 0 && p.stock <= 5 && (
                    <span style={{
                      position: 'absolute', top: 10, left: 10,
                      background: 'rgba(253,203,110,0.95)', color: '#0F0F1A',
                      padding: '3px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700
                    }}>Kam — {p.stock}</span>
                  )}
                  <span style={{
                    position: 'absolute', top: 10, right: 10,
                    background: 'rgba(108,92,231,0.85)', color: '#fff',
                    padding: '3px 8px', borderRadius: 6, fontSize: 10, fontWeight: 700, fontFamily: 'monospace'
                  }}>#{p.product_code || '—'}</span>
                </div>
                <div className="uzum-card-body">
                  <div className="uzum-card-name">{p.name}</div>
                  {p.category && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>{p.category}</div>}
                  <div className="uzum-card-price">{p.price.toLocaleString()} so'm</div>
                  <div style={{ display: 'flex', gap: 4, marginTop: 6 }}>
                    <button className="uzum-admin-btn uzum-admin-edit" onClick={() => openEdit(p)}>Tahrir</button>
                    <button className="uzum-admin-btn uzum-admin-dist" onClick={() => { setDistForm({ client_name: '', client_phone: '', quantity: '', paid_amount: '', note: '' }); setShowDistribute(p); }}>Tarqatish</button>
                    <button className="uzum-admin-btn uzum-admin-del" onClick={() => handleDelete(p.id)}>O'chir</button>
                  </div>
                </div>
              </div>
            ))}
            {products.length === 0 && (
              <div className="empty-cart" style={{ gridColumn: '1 / -1', padding: 48 }}>
                <div className="icon"><Package size={48} /></div>
                <p>Mahsulotlar yo'q</p>
              </div>
            )}
          </div>
        </>
      )}

      {activeTab === 'nasiya' && (
        <>
          <div className="flex-between mb-4">
            <p style={{ color: 'var(--text-secondary)' }}>{nasiyaList.length} ta nasiya mijoz</p>
            <button className="btn btn-primary" onClick={() => { setNasiyaForm({ customer_name: '', phone: '', address: '', location: '', image: '' }); setShowEditNasiya(null); setShowAddNasiya(true); }}>
              Nasiya qo'shish
            </button>
          </div>
          <div className="table-container">
            <table>
              <thead>
                <tr><th>Mijoz</th><th className="hide-mobile">Manzil / Lokatsiya</th><th className="hide-mobile">Nimalar olgan</th><th>Qarz</th><th>To'langan</th><th className="hide-mobile">Holat</th><th>Amallar</th></tr>
              </thead>
              <tbody>
                {nasiyaList.map(n => (
                  <tr key={n.id} onClick={() => loadNasiyaDetail(n)} style={{ cursor: 'pointer' }}>
                    <td>
                      <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                        {n.image && (
                          <img
                            src={n.image}
                            alt={n.customer_name}
                            onError={(e) => { e.target.style.display = 'none'; }}
                            style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover', border: '1.5px solid var(--border)', flexShrink: 0 }}
                          />
                        )}
                        <span>{n.customer_name}</span>
                      </div>
                      {n.phone && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{n.phone}</div>}
                    </td>
                    <td className="text-muted hide-mobile" style={{ fontSize: 12 }}>
                      <div>{n.address || '—'}</div>
                    </td>
                    <td className="hide-mobile" style={{ fontSize: 11, color: 'var(--text-secondary)', maxWidth: 140 }}>
                      {n.items_summary !== '—' ? (
                        <div>
                          <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.items_summary}</div>
                          <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{n.total_items_bought} ta</div>
                        </div>
                      ) : '—'}
                    </td>
                    <td style={{ fontWeight: 700, color: (n.total_debt - n.paid_amount) > 0 ? 'var(--danger)' : 'var(--success)' }}>
                      {roundNum(n.total_debt - n.paid_amount).toLocaleString()} so'm
                    </td>
                    <td className="text-success">{roundNum(n.paid_amount).toLocaleString()} so'm</td>
                    <td className="hide-mobile">
                      <span style={{ padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: n.status === 'active' ? 'rgba(253,121,168,0.15)' : 'rgba(0,184,148,0.15)', color: n.status === 'active' ? 'var(--accent)' : 'var(--success)' }}>
                        {n.status === 'active' ? 'Faol' : 'To\'langan'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        <button className="btn btn-sm btn-outline" onClick={(e) => { e.stopPropagation(); loadNasiyaDetail(n); }} style={{ padding: '4px 8px', fontSize: 11 }}>Batafsil</button>
                        <button className="btn btn-sm btn-outline" onClick={(e) => { e.stopPropagation(); setNasiyaForm({ customer_name: n.customer_name, phone: n.phone || '', address: n.address || '', location: n.location || '', image: n.image || '' }); setShowEditNasiya(n); setShowAddNasiya(true); }} style={{ padding: '4px 8px', fontSize: 11 }}>Tahrir</button>
                        <button className="btn btn-sm btn-danger" onClick={(e) => { e.stopPropagation(); handleDeleteNasiya(n.id); }} style={{ padding: '4px 8px', fontSize: 11 }}>O'chir</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {nasiyaList.length === 0 && <div className="empty-cart" style={{ padding: 48 }}><div className="icon"><Notebook size={48} /></div><p>Nasiyalar yo'q</p></div>}
          </div>
        </>
      )}

      {activeTab === 'settings' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 560 }}>
          <div className="card">
            <h3 style={{ marginBottom: 20 }}>Do'kon sozlamalari</h3>
            <div className="grid-2">
              <div className="input-group">
                <label>Do'kon nomi</label>
                <input className="input" placeholder="Do'kon nomi" value={settingsForm.shop_name || ''} onChange={e => setSettingsForm({ ...settingsForm, shop_name: e.target.value })} />
              </div>
              <div className="input-group">
                <label>Do'kon raqami</label>
                <input className="input" placeholder="001" value={settingsForm.shop_number || ''} onChange={e => setSettingsForm({ ...settingsForm, shop_number: e.target.value })} />
              </div>
            </div>
            <div className="input-group">
              <label>Manzil</label>
              <input className="input" placeholder="Do'kon manzili" value={settingsForm.shop_address || ''} onChange={e => setSettingsForm({ ...settingsForm, shop_address: e.target.value })} />
            </div>
            <div className="input-group">
              <label>Telefon</label>
              <input className="input" placeholder="+998 XX XXX XX XX" value={settingsForm.shop_phone || ''} onChange={e => setSettingsForm({ ...settingsForm, shop_phone: e.target.value })} />
            </div>
            <button className="btn btn-primary" onClick={handleSaveSettings}>Saqlash</button>
          </div>
        </div>
      )}

      {activeTab === 'backup' && (
        <div style={{ maxWidth: 600 }}>
          <div className="card" style={{ marginBottom: 24 }}>
            <h3 style={{ marginBottom: 16 }}>Ma'lumotlar zaxirasi</h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 20, fontSize: 14, lineHeight: 1.6 }}>
              Barcha ma'lumotlarni (mahsulotlar, sotishlar, nasiyalar) JSON formatida yuklab oling.
              Zaxira faylini keyinroq qayta tiklash uchun saqlab qo'ying.
            </p>
            <button className="btn btn-primary btn-lg" onClick={handleBackup}>
              Backup yuklab olish
            </button>
          </div>

          {adminStats && (
            <div className="card">
              <h3 style={{ marginBottom: 16 }}>Zaxira tarkibi</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div className="flex-between" style={{ padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                  <span>Mahsulotlar</span><span style={{ fontWeight: 700 }}>{adminStats.products} ta</span>
                </div>
                <div className="flex-between" style={{ padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                  <span>Sotishlar</span><span style={{ fontWeight: 700 }}>{adminStats.totalSales} ta</span>
                </div>
                <div className="flex-between" style={{ padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                  <span>Nasiyalar</span><span style={{ fontWeight: 700 }}>{adminStats.nasiyaTotal} ta</span>
                </div>
                <div className="flex-between" style={{ padding: '10px 0' }}>
                  <span>Database hajmi</span><span style={{ fontWeight: 700, fontFamily: 'monospace' }}>{adminStats.dbSize}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'delete' && (
        <div style={{ maxWidth: 600 }}>
          <div className="card" style={{ marginBottom: 24, border: '1.5px solid var(--success)', background: 'rgba(0,184,148,0.05)' }}>
            <h3 style={{ marginBottom: 12, color: 'var(--success)' }}>Arxivga saqlash</h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 16, fontSize: 14, lineHeight: 1.6 }}>
              Bugungi ma'lumotlar (sotishlar, chat, tarqatish) arxivga saqlanadi.
              <br />
              <strong style={{ color: 'var(--secondary)' }}><Info size={14} style={{ verticalAlign: 'middle', marginRight: 2 }} /></strong> Ma'lumotlar o'chirilmaydi — hammasi joyida qoladi, arxivga nusxasi saqlanadi.
            </p>
            <button className="btn btn-success" onClick={handleAutoArchive} style={{ width: '100%' }}>
              Hozir arxivga saqlash
            </button>
          </div>

          <div className="card" style={{ marginBottom: 24, border: '1.5px solid var(--danger)', background: 'rgba(225, 112, 85, 0.05)' }}>
            <h3 style={{ marginBottom: 12, color: 'var(--danger)' }}>Tanlanganlarni arxivga saqlash</h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 20, fontSize: 14, lineHeight: 1.6 }}>
              Tanlangan bo'limlarni arxivga saqlash. Mahsulotlar va nasiyalar saqlanib qolinadi.
              <br />
              <strong style={{ color: 'var(--secondary)' }}><Info size={14} style={{ verticalAlign: 'middle', marginRight: 2 }} /></strong> Ma'lumotlar o'chirilmaydi, faqat arxivga nusxasi saqlanadi.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', background: 'var(--bg-input)', border: '1.5px solid var(--border)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', transition: 'all 0.2s', borderColor: selectedTables.includes('sales') ? 'var(--success)' : 'var(--border)' }}>
                <input type="checkbox" checked={selectedTables.includes('sales')} onChange={() => toggleTable('sales')} style={{ width: 18, height: 18, accentColor: '#00B894' }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>Sotishlar tarixi</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>Sotishlar arxivga saqlanadi, o'chirilmaydi</div>
                </div>
                <span style={{ fontWeight: 700, fontFamily: 'monospace', color: 'var(--text-secondary)' }}>{adminStats?.totalSales || 0} ta</span>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', background: 'var(--bg-input)', border: '1.5px solid var(--border)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', transition: 'all 0.2s', borderColor: selectedTables.includes('ai_chat_history') ? 'var(--success)' : 'var(--border)' }}>
                <input type="checkbox" checked={selectedTables.includes('ai_chat_history')} onChange={() => toggleTable('ai_chat_history')} style={{ width: 18, height: 18, accentColor: '#00B894' }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>AI Chat tarixi</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>Suhbat tarixi arxivga saqlanadi</div>
                </div>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', background: 'var(--bg-input)', border: '1.5px solid var(--border)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', transition: 'all 0.2s', borderColor: selectedTables.includes('distributions') ? 'var(--success)' : 'var(--border)' }}>
                <input type="checkbox" checked={selectedTables.includes('distributions')} onChange={() => toggleTable('distributions')} style={{ width: 18, height: 18, accentColor: '#00B894' }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>Tovar tarqatish</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>Tarqatishlar arxivga saqlanadi, o'chirilmaydi</div>
                </div>
              </label>
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <button className="btn btn-success" onClick={selectAllTables} style={{ flex: 1 }}>
                Hammasini tanlash
              </button>
              <button className="btn btn-danger" onClick={handleBulkDelete} disabled={bulkDeleting || selectedTables.length === 0} style={{ flex: 1 }}>
                {bulkDeleting ? "Saqlanmoqda..." : `Arxivga saqlash (${selectedTables.length})`}
              </button>
            </div>
          </div>

          <div className="card">
            <h3 style={{ marginBottom: 12 }}>Saqlanib qolinadigan ma'lumotlar</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 16 }}>Quyidagi ma'lumotlar hech qachon o'chirilmaydi:</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div className="flex-between" style={{ padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Package size={18} /> Mahsulotlar</span>
                <span style={{ fontWeight: 700, color: 'var(--success)' }}>{adminStats?.products || 0} ta</span>
              </div>
              <div className="flex-between" style={{ padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Notebook size={18} /> Nasiyalar</span>
                <span style={{ fontWeight: 700, color: 'var(--success)' }}>{adminStats?.nasiyaTotal || 0} ta</span>
              </div>
              <div className="flex-between" style={{ padding: '10px 0' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Settings size={18} /> Sozlamalar</span>
                <span style={{ fontWeight: 700, color: 'var(--success)' }}>Saqlangan</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'archive' && (
        <div className="card">
          <div className="flex-between mb-4">
            <div>
              <h3>Arxivlangan ma'lumotlar</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4 }}>
                O'chirilgan ma'lumotlar avtomatik saqlanadi. {archiveStats ? `Jami: ${archiveStats.total} ta yozuv` : ''}
              </p>
            </div>
            {archiveData.length > 0 && (
              <button className="btn btn-danger" onClick={handleClearArchive}>Hammasini tozalash</button>
            )}
          </div>

          {archiveData.length === 0 ? (
            <div className="empty-cart" style={{ padding: 48 }}>
              <div className="icon"><Archive size={48} /></div>
              <p style={{ marginTop: 12, color: 'var(--text-muted)' }}>Arxiv bo'sh</p>
              <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4 }}>O'chirilgan ma'lumotlar shu yerda ko'rinadi</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {archiveData.map(item => {
                const typeLabel = item.source_table === 'sales' ? <><ShoppingCart size={13} style={{ verticalAlign: 'middle', marginRight: 4 }} /> Sotishlar</> :
                  item.source_table === 'distributions' ? <><Package size={13} style={{ verticalAlign: 'middle', marginRight: 4 }} /> Tarqatish</> :
                  item.source_table === 'ai_chat_history' ? <><MessageSquare size={13} style={{ verticalAlign: 'middle', marginRight: 4 }} /> AI Chat</> :
                  item.source_table === 'sales_daily' ? <><ShoppingCart size={13} style={{ verticalAlign: 'middle', marginRight: 4 }} /> Kunlik sotish</> :
                  item.source_table === 'distributions_daily' ? <><Package size={13} style={{ verticalAlign: 'middle', marginRight: 4 }} /> Kunlik tarqatish</> :
                  item.source_table === 'sales_manual' ? <><ShoppingCart size={13} style={{ verticalAlign: 'middle', marginRight: 4 }} /> Qo'lda arxiv</> :
                  item.source_table === 'distributions_manual' ? <><Package size={13} style={{ verticalAlign: 'middle', marginRight: 4 }} /> Qo'lda tarqatish</> :
                  <><ClipboardList size={13} style={{ verticalAlign: 'middle', marginRight: 4 }} /> {item.source_table}</>;
                const typeColor = item.source_table.includes('sales') ? 'var(--secondary)' :
                  item.source_table.includes('distribution') ? 'var(--warning)' : 'var(--primary-light)';
                const typeBg = item.source_table.includes('sales') ? 'rgba(0,206,201,0.15)' :
                  item.source_table.includes('distribution') ? 'rgba(253,203,110,0.15)' : 'rgba(108,92,231,0.15)';

                const summary = item.source_table.includes('sales')
                  ? `${item.data.length} ta sotish · ${item.data.reduce((s, d) => s + (d.total || 0), 0).toLocaleString()} so'm`
                  : item.source_table.includes('distribution')
                  ? `${item.data.length} ta tarqatish · ${item.data.reduce((s, d) => s + (d.total_sum || 0), 0).toLocaleString()} so'm`
                  : (() => {
                      const firstUserMsg = item.data.find(m => m.role === 'user');
                      const text = firstUserMsg?.content || '';
                      return text.length > 60 ? text.slice(0, 60) + '...' : text || `${item.data.length} ta xabar`;
                    })();

                return (
                  <div
                    key={item.id}
                    onClick={() => setShowArchiveDetail(item)}
                    style={{
                      border: '1.5px solid var(--border)',
                      borderRadius: 'var(--radius)',
                      padding: '14px 16px',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      background: 'var(--bg-secondary)'
                    }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = typeColor}
                    onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
                  >
                    <div className="flex-between">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{
                          display: 'inline-block',
                          padding: '4px 10px',
                          borderRadius: 12,
                          fontSize: 12,
                          fontWeight: 700,
                          background: typeBg,
                          color: typeColor
                        }}>
                          {typeLabel}
                        </span>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600 }}>{summary}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                            O'chirilgan: {new Date(item.archived_at).toLocaleString('uz-UZ')}
                            {item.data[0]?.created_at && ` · Sana: ${new Date(item.data[0].created_at).toLocaleString('uz-UZ')}`}
                          </div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <span style={{ fontSize: 20, color: 'var(--text-muted)' }}><ArrowRight size={20} /></span>
                        {canRestore(item.source_table) && (
                          <button className="btn btn-sm btn-outline" onClick={(e) => { e.stopPropagation(); handleRestoreArchive(item); }}>Tiklash</button>
                        )}
                        <button className="btn btn-sm btn-danger" onClick={(e) => { e.stopPropagation(); handleDeleteArchiveItem(item.id); }}>O'chirish</button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {showNasiyaDetail && (
        <div className="modal-overlay" onClick={() => { setShowNasiyaDetail(null); setNasiyaDetailPayments([]); setNasiyaDetailSales([]); setNasiyaSelectedDate(null); }}>
          <div className="modal" style={{ maxWidth: 480, maxHeight: '90vh', overflow: 'auto' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
              <div>
                <h2 style={{ marginBottom: 2, fontSize: 17, display: 'flex', alignItems: 'center', gap: 8 }}><Notebook size={18} /> {showNasiyaDetail.customer_name}</h2>
                <div style={{ color: 'var(--text-muted)', fontSize: 12, display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', marginTop: 3 }}>
                  {showNasiyaDetail.phone && <span><Phone size={12} style={{ verticalAlign: 'middle', marginRight: 2 }} /> {showNasiyaDetail.phone}</span>}
                  {showNasiyaDetail.address && <span><MapPin size={12} style={{ verticalAlign: 'middle', marginRight: 2 }} /> {showNasiyaDetail.address}</span>}
                  </div>
              </div>
              <button className="btn btn-sm btn-outline" onClick={() => { setShowNasiyaDetail(null); setNasiyaDetailPayments([]); setNasiyaDetailSales([]); setNasiyaSelectedDate(null); }} style={{ flexShrink: 0, display: 'inline-flex', alignItems: 'center' }}><X size={14} /></button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, marginBottom: 14 }}>
              <div style={{ padding: '8px 4px', borderRadius: 20, background: 'rgba(225,112,85,0.1)', textAlign: 'center' }}>
                <div style={{ fontSize: 9, color: 'var(--text-muted)' }}>Qoldiq</div>
                <div style={{ fontWeight: 800, fontSize: 15, color: 'var(--danger)' }}>{roundNum(showNasiyaDetail.total_debt - showNasiyaDetail.paid_amount).toLocaleString()}</div>
              </div>
              <div style={{ padding: '8px 4px', borderRadius: 20, background: 'rgba(0,184,148,0.1)', textAlign: 'center' }}>
                <div style={{ fontSize: 9, color: 'var(--text-muted)' }}>To'langan</div>
                <div style={{ fontWeight: 800, fontSize: 15, color: 'var(--success)' }}>{roundNum(showNasiyaDetail.paid_amount).toLocaleString()}</div>
              </div>
              <div style={{ padding: '8px 4px', borderRadius: 20, background: 'rgba(108,92,231,0.1)', textAlign: 'center' }}>
                <div style={{ fontSize: 9, color: 'var(--text-muted)' }}>Jami</div>
                <div style={{ fontWeight: 800, fontSize: 15, color: 'var(--primary-light)' }}>{roundNum(showNasiyaDetail.total_debt).toLocaleString()}</div>
              </div>
            </div>

            <div style={{ padding: '12px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-secondary)', border: '1px solid var(--border)', marginBottom: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <button onClick={() => { const m = nasiyaCalendarMonth.month === 0 ? 11 : nasiyaCalendarMonth.month - 1; const y = nasiyaCalendarMonth.month === 0 ? nasiyaCalendarMonth.year - 1 : nasiyaCalendarMonth.year; setNasiyaCalendarMonth({ year: y, month: m }); setNasiyaSelectedDate(null); }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: 'var(--text-secondary)', padding: '2px 6px' }}>◀</button>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
                  {new Date(nasiyaCalendarMonth.year, nasiyaCalendarMonth.month).toLocaleDateString('uz-UZ', { month: 'long', year: 'numeric' })}
                </div>
                <button onClick={() => { const m = nasiyaCalendarMonth.month === 11 ? 0 : nasiyaCalendarMonth.month + 1; const y = nasiyaCalendarMonth.month === 11 ? nasiyaCalendarMonth.year + 1 : nasiyaCalendarMonth.year; setNasiyaCalendarMonth({ year: y, month: m }); setNasiyaSelectedDate(null); }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: 'var(--text-secondary)', padding: '2px 6px' }}>▶</button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, textAlign: 'center' }}>
                {['Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sha', 'Ya'].map(d => (
                  <div key={d} style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', padding: '4px 0' }}>{d}</div>
                ))}
                {(() => {
                  const { year, month } = nasiyaCalendarMonth;
                  const firstDay = new Date(year, month, 1).getDay();
                  const daysInMonth = new Date(year, month + 1, 0).getDate();
                  const startOffset = firstDay === 0 ? 6 : firstDay - 1;

                  const grouped = {};
                  nasiyaDetailPayments.forEach(p => {
                    const d = p.created_at.split(' ')[0];
                    if (!grouped[d]) grouped[d] = { amount: 0, count: 0 };
                    grouped[d].amount += p.amount;
                    grouped[d].count++;
                  });
                  const saleDates = {};
                  nasiyaDetailSales.forEach(s => {
                    const d = s.created_at.split(' ')[0];
                    if (!saleDates[d]) saleDates[d] = { total: 0, items: [] };
                    saleDates[d].total += s.total;
                    let items = s.items;
                    if (typeof items === 'string') { try { items = JSON.parse(items); } catch { items = []; } }
                    saleDates[d].items.push({ sale: s, items });
                  });

                  const cells = [];
                  for (let i = 0; i < startOffset; i++) cells.push(<div key={`empty-${i}`} />);
                  for (let day = 1; day <= daysInMonth; day++) {
                    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                    const hasPayment = grouped[dateStr];
                    const hasSale = saleDates[dateStr];
                    const isActive = nasiyaSelectedDate === dateStr;
                    const isToday = new Date().toISOString().split('T')[0] === dateStr;
                    cells.push(
                      <div key={day} onClick={() => (hasPayment || hasSale) && setNasiyaSelectedDate(isActive ? null : dateStr)} style={{
                        width: '100%', aspectRatio: '1', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                        borderRadius: '50%', cursor: (hasPayment || hasSale) ? 'pointer' : 'default', fontSize: 11, fontWeight: isToday ? 800 : 500,
                        background: isActive ? 'var(--success)' : hasPayment ? 'rgba(0,184,148,0.2)' : 'transparent',
                        color: isActive ? '#fff' : isToday ? 'var(--primary-light)' : hasPayment ? 'var(--success)' : 'var(--text-secondary)',
                        transition: 'all 0.15s', position: 'relative'
                      }}>
                        <span>{day}</span>
                        {hasPayment && !isActive && <div style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--success)', marginTop: 1 }} />}
                        {hasSale && !hasPayment && !isActive && <div style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--secondary)', marginTop: 1 }} />}
                      </div>
                    );
                  }
                  return cells;
                })()}
              </div>
            </div>

            {nasiyaSelectedDate && (
              <div style={{ padding: '12px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-secondary)', border: '1px solid var(--border)', marginBottom: 14 }}>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Calendar size={14} /> {new Date(nasiyaSelectedDate + 'T00:00:00').toLocaleDateString('uz-UZ', { weekday: 'long', day: 'numeric', month: 'long' })}
                </div>
                {(() => {
                  const dayPayments = nasiyaDetailPayments.filter(p => p.created_at.startsWith(nasiyaSelectedDate));
                  const daySales = nasiyaDetailSales.filter(s => s.created_at.startsWith(nasiyaSelectedDate));
                  return (
                    <>
                      {daySales.length > 0 && daySales.map((sale, i) => {
                        let items = sale.items;
                        if (typeof items === 'string') { try { items = JSON.parse(items); } catch { items = []; } }
                        return (
                          <div key={`s-${i}`} style={{ marginBottom: 8 }}>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}><ShoppingBag size={12} /> Sotib olingan:</div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontWeight: 600, marginBottom: 3, color: 'var(--secondary)' }}>
                              <span>Jami: {roundNum(sale.total).toLocaleString()} so'm</span>
                              <span>To'lov: {roundNum(sale.paid).toLocaleString()} so'm</span>
                            </div>
                            {items.map((item, j) => (
                              <div key={j} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, paddingLeft: 6, color: 'var(--text-secondary)', marginBottom: 1 }}>
                                <span>{item.name} × {item.quantity}</span>
                                <span>{roundNum(item.price).toLocaleString()} × {item.quantity} = {roundNum(item.price * item.quantity).toLocaleString()}</span>
                              </div>
                            ))}
                          </div>
                        );
                      })}
                      {dayPayments.length > 0 && (
                        <div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}><Coins size={12} /> To'lovlar:</div>
                          {dayPayments.map((p, i) => (
                            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, padding: '2px 0' }}>
                              <span style={{ color: 'var(--success)', fontWeight: 600 }}>+{roundNum(p.amount).toLocaleString()} so'm</span>
                              {p.note && <span style={{ color: 'var(--text-muted)', fontSize: 10 }}>({p.note})</span>}
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            )}

            {nasiyaDetailSales.length > 0 && (
              <div>
                <h3 style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 4 }}><ShoppingBag size={13} /> Nimalar olgan</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {nasiyaDetailSales.map((sale, i) => {
                    let items = sale.items;
                    if (typeof items === 'string') { try { items = JSON.parse(items); } catch { items = []; } }
                    return (
                      <div key={i} style={{ padding: '8px 10px', borderRadius: 12, background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{new Date(sale.created_at).toLocaleDateString('uz-UZ', { day: 'numeric', month: 'short' })}</span>
                          <span style={{ fontWeight: 700, color: 'var(--secondary)', fontSize: 12 }}>{roundNum(sale.total).toLocaleString()} so'm</span>
                        </div>
                        {items.map((item, j) => (
                          <div key={j} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-secondary)' }}>
                            <span>{item.name} × {item.quantity}</span>
                            <span>{roundNum(item.price).toLocaleString()} × {item.quantity} = {roundNum(item.price * item.quantity).toLocaleString()}</span>
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {showArchiveDetail && (
        <div className="modal-overlay" onClick={() => setShowArchiveDetail(null)}>
          <div className="modal" style={{ maxWidth: 700 }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <div>
                <h2 style={{ marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
                  {showArchiveDetail.source_table.includes('sales') ? <><ShoppingCart size={18} /> Sotishlar</> :
                   showArchiveDetail.source_table.includes('distribution') ? <><Package size={18} /> Tarqatish</> : <><MessageSquare size={18} /> AI Chat</>}
                </h2>
                <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>
                  O'chirilgan: {new Date(showArchiveDetail.archived_at).toLocaleString('uz-UZ')}
                </p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Jami</div>
                <div style={{ fontWeight: 800, fontSize: 18, color: 'var(--secondary)' }}>
                  {showArchiveDetail.source_table.includes('sales')
                    ? showArchiveDetail.data.reduce((s, d) => s + (d.total || 0), 0).toLocaleString() + " so'm"
                    : showArchiveDetail.source_table.includes('distribution')
                    ? showArchiveDetail.data.reduce((s, d) => s + (d.total_sum || 0), 0).toLocaleString() + " so'm"
                    : (() => {
                        const firstUserMsg = showArchiveDetail.data.find(m => m.role === 'user');
                        const text = firstUserMsg?.content || '';
                        return text.length > 40 ? text.slice(0, 40) + '...' : text || showArchiveDetail.data.length + " ta xabar";
                      })()}
                </div>
              </div>
            </div>

            <div style={{ maxHeight: 500, overflow: 'auto' }}>
              {showArchiveDetail.source_table.includes('sales') && showArchiveDetail.data.map((sale, i) => (
                <div key={i} style={{
                  padding: '14px 16px',
                  background: i % 2 === 0 ? 'var(--bg-secondary)' : 'transparent',
                  borderRadius: 'var(--radius-sm)',
                  marginBottom: 4
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>
                        {sale.items ? JSON.parse(typeof sale.items === 'string' ? sale.items : '[]').map(it => it.name).join(', ') : sale.product_name || '—'}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                        {sale.payment_type === 'cash' ? <><Banknote size={12} style={{ verticalAlign: 'middle', marginRight: 2 }} /> Naqd</> : sale.payment_type === 'card' ? <><CreditCard size={12} style={{ verticalAlign: 'middle', marginRight: 2 }} /> Karta</> : <><Notebook size={12} style={{ verticalAlign: 'middle', marginRight: 2 }} /> Nasiya</>}
                        {sale.items && ` · ${JSON.parse(typeof sale.items === 'string' ? sale.items : '[]').length} ta mahsulot`}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 700, color: 'var(--secondary)' }}>
                        {(sale.total || 0).toLocaleString()} so'm
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--success)', marginTop: 2 }}>
                        To'langan: {(sale.paid || 0).toLocaleString()} so'm
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                        {sale.created_at ? new Date(sale.created_at).toLocaleString('uz-UZ') : '—'}
                      </div>
                    </div>
                  </div>
                  {sale.items && (
                    <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--border)' }}>
                      {JSON.parse(typeof sale.items === 'string' ? sale.items : '[]').map((item, j) => (
                        <div key={j} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-secondary)', padding: '2px 0' }}>
                          <span>{item.name}</span>
                          <span>{item.quantity} dona × {(item.price || 0).toLocaleString()} so'm = {((item.price || 0) * (item.quantity || 1)).toLocaleString()} so'm</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              {showArchiveDetail.source_table.includes('distribution') && showArchiveDetail.data.map((d, i) => (
                <div key={i} style={{
                  padding: '14px 16px',
                  background: i % 2 === 0 ? 'var(--bg-secondary)' : 'transparent',
                  borderRadius: 'var(--radius-sm)',
                  marginBottom: 4
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>{d.product_name || '—'}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                        Mijoz: {d.client_name || '—'}
                        {d.client_phone && ` · Tel: ${d.client_phone}`}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                        {d.quantity || 1} dona × {(d.unit_price || 0).toLocaleString()} so'm
                      </div>
                      {d.note && (
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2, fontStyle: 'italic' }}>Izoh: {d.note}</div>
                      )}
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 700, color: 'var(--secondary)' }}>
                        {(d.total_sum || 0).toLocaleString()} so'm
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--success)', marginTop: 2 }}>
                        To'langan: {(d.paid_amount || 0).toLocaleString()} so'm
                      </div>
                      {(d.total_sum || 0) - (d.paid_amount || 0) > 0 && (
                        <div style={{ fontSize: 12, color: 'var(--danger)', marginTop: 2 }}>
                          Qarz: {((d.total_sum || 0) - (d.paid_amount || 0)).toLocaleString()} so'm
                        </div>
                      )}
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                        {d.created_at ? new Date(d.created_at).toLocaleString('uz-UZ') : '—'}
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {showArchiveDetail.source_table === 'ai_chat_history' && showArchiveDetail.data.map((msg, i) => (
                <div key={i} style={{
                  padding: '12px 16px',
                  background: i % 2 === 0 ? 'var(--bg-secondary)' : 'transparent',
                  borderRadius: 'var(--radius-sm)',
                  marginBottom: 4
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <div style={{ fontWeight: 700, fontSize: 13, color: msg.role === 'user' ? 'var(--primary-light)' : 'var(--secondary)' }}>
                      {msg.role === 'user' ? <><UserRound size={13} style={{ verticalAlign: 'middle', marginRight: 4 }} /> Foydalanuvchi</> : <><Bot size={13} style={{ verticalAlign: 'middle', marginRight: 4 }} /> Yordamchi</>}
                    </div>
                    {msg.created_at && (
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                        {new Date(msg.created_at).toLocaleString('uz-UZ')}
                      </div>
                    )}
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)', whiteSpace: 'pre-wrap' }}>
                    {msg.content || '—'}
                  </div>
                </div>
              ))}
            </div>

            <div className="modal-actions">
              {canRestore(showArchiveDetail.source_table) && (
                <button className="btn btn-outline" onClick={() => { handleRestoreArchive(showArchiveDetail); setShowArchiveDetail(null); }}>Tiklash</button>
              )}
              <button className="btn btn-danger" onClick={() => { handleDeleteArchiveItem(showArchiveDetail.id); setShowArchiveDetail(null); }}>O'chirish</button>
              <button className="btn btn-primary" onClick={() => setShowArchiveDetail(null)}>Yopish</button>
            </div>
          </div>
        </div>
      )}

      {(showAdd || showEdit) && (
        <div className="modal-overlay" onMouseDown={e => { if (e.target === e.currentTarget) { setShowAdd(false); setShowEdit(null); } }}>
          <div className="modal" style={{ maxWidth: 560 }} onClick={e => e.stopPropagation()} onMouseDown={e => e.stopPropagation()}>
            <h2>{showEdit ? 'Tahrirlash' : 'Yangi mahsulot'}</h2>
            <div className="grid-2">
              <div className="input-group">
                <label>Nomi *</label>
                <input className="input" placeholder="Mahsulot nomi" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="input-group">
                <label>Mahsulot kodi</label>
                <input className="input" placeholder="Masalan: 1, 2, 3..." value={form.product_code} onChange={e => setForm({ ...form, product_code: e.target.value })} />
              </div>
              <div className="input-group">
                <label>Barcode</label>
                <input className="input" placeholder="Avtomatik generatsiya" value={form.barcode} onChange={e => setForm({ ...form, barcode: e.target.value })} />
              </div>
              <div className="input-group">
                <label>Sotish narxi *</label>
                <input className="input" type="number" placeholder="0" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} />
              </div>
              <div className="input-group">
                <label>Xarajat narxi</label>
                <input className="input" type="number" placeholder="0" value={form.cost} onChange={e => setForm({ ...form, cost: e.target.value })} />
              </div>
              <div className="input-group">
                <label>Ombordagi miqdor</label>
                <input className="input" type="number" placeholder="0" value={form.stock} onChange={e => setForm({ ...form, stock: e.target.value })} />
              </div>
              <div className="input-group">
                <label>Kategoriya</label>
                <input className="input" placeholder="Masalan: Ichimliklar" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} />
              </div>
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
                <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>yoki</span>
              </div>
              <input className="input" placeholder="URL manzilini kiriting" value={form.image} onChange={e => setForm({ ...form, image: e.target.value })} style={{ marginTop: 8 }} />
              {form.image && (
                <div style={{ marginTop: 8, position: 'relative', display: 'inline-block' }}>
                  <img src={form.image} alt="preview" style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 'var(--radius-sm)', border: '1.5px solid var(--border)' }}
                    onError={e => { e.target.style.display = 'none'; }} />
                  <button onClick={() => setForm({ ...form, image: '' })} style={{
                    position: 'absolute', top: -6, right: -6, width: 20, height: 20,
                    borderRadius: '50%', background: 'var(--danger)', color: 'white',
                    border: 'none', cursor: 'pointer', display: 'flex',
                    alignItems: 'center', justifyContent: 'center'
                  }}><X size={12} /></button>
                </div>
              )}
            </div>
            <div className="modal-actions">
              <button className="btn btn-outline" onClick={() => { setShowAdd(false); setShowEdit(null); }}>Bekor</button>
              <button className="btn btn-primary" onClick={showEdit ? handleEdit : handleAdd}>
                {showEdit ? 'Saqlash' : 'Qo\'shish'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showAddNasiya && (
        <div className="modal-overlay" onMouseDown={e => { if (e.target === e.currentTarget) { setShowAddNasiya(false); setShowEditNasiya(null); } }}>
          <div className="modal" style={{ maxWidth: 440 }} onClick={e => e.stopPropagation()} onMouseDown={e => e.stopPropagation()}>
            <h2>{showEditNasiya ? 'Nasiyani tahrirlash' : 'Yangi nasiya'}</h2>
            <div className="input-group">
              <label>Mijoz nomi *</label>
              <input className="input" placeholder="Ism Familiya" value={nasiyaForm.customer_name} onChange={e => setNasiyaForm({ ...nasiyaForm, customer_name: e.target.value })} />
            </div>
            <div className="input-group">
              <label>Telefon raqam</label>
              <input className="input" placeholder="+998 XX XXX XX XX" value={nasiyaForm.phone} onChange={e => setNasiyaForm({ ...nasiyaForm, phone: e.target.value })} />
            </div>
            <div className="input-group">
              <label>Manzil</label>
              <input className="input" placeholder="Masalan: Toshkent sh., Chilonzor 5-mavze" value={nasiyaForm.address} onChange={e => setNasiyaForm({ ...nasiyaForm, address: e.target.value })} />
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
                  <input type="file" accept="image/*" capture="environment" onChange={handleNasiyaImageUpload} style={{ display: 'none' }} />
                </label>
              </div>
              {nasiyaForm.image && (
                <div style={{ marginTop: 8, position: 'relative', display: 'inline-block' }}>
                  <img src={nasiyaForm.image} alt="preview" style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 'var(--radius-sm)', border: '1.5px solid var(--border)' }}
                    onError={e => { e.target.style.display = 'none'; }} />
                  <button onClick={() => setNasiyaForm({ ...nasiyaForm, image: '' })} style={{
                    position: 'absolute', top: -6, right: -6, width: 20, height: 20,
                    borderRadius: '50%', background: 'var(--danger)', color: 'white',
                    border: 'none', cursor: 'pointer', display: 'flex',
                    alignItems: 'center', justifyContent: 'center'
                  }}><X size={12} /></button>
                </div>
              )}
            </div>
            <div className="modal-actions">
              <button className="btn btn-outline" onClick={() => { setShowAddNasiya(false); setShowEditNasiya(null); }}>Bekor</button>
              <button className="btn btn-primary" onClick={handleAddNasiya}>
                {showEditNasiya ? 'Saqlash' : 'Qo\'shish'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showQR && (
        <div className="modal-overlay" onClick={() => setShowQR(null)}>
          <div className="modal" style={{ maxWidth: 380, textAlign: 'center' }} onClick={e => e.stopPropagation()} ref={qrRef}>
            <h2>QR Kod</h2>
            <p style={{ fontWeight: 600, fontSize: 18, marginBottom: 8 }}>{showQR.name}</p>
            {showQR.product_code && (
              <p style={{ color: 'var(--primary-light)', marginBottom: 8, fontFamily: 'monospace', fontWeight: 700 }}>Kod: {showQR.product_code}</p>
            )}
            <div style={{ background: 'white', padding: 24, borderRadius: 'var(--radius-sm)', display: 'inline-block' }}>
              <QRCodeSVG value={showQR.barcode || showQR.id} size={200} />
            </div>
            <p style={{ color: 'var(--text-muted)', marginTop: 12, fontFamily: 'monospace', fontSize: 14 }}>{showQR.barcode}</p>
            <p style={{ color: 'var(--text-secondary)', marginTop: 8 }}>
              Narx: <strong style={{ color: 'var(--secondary)' }}>{showQR.price.toLocaleString()} so'm</strong>
            </p>
            <div className="modal-actions" style={{ justifyContent: 'center', gap: 8 }}>
              <button className="btn btn-outline" onClick={() => setShowQR(null)}>Yopish</button>
              <button className="btn btn-primary" onClick={() => downloadQR(showQR)}>Yuklab olish</button>
            </div>
          </div>
        </div>
      )}
      {showDistribute && (
        <div className="modal-overlay" onClick={() => setShowDistribute(null)}>
          <div className="modal" style={{ maxWidth: 500 }} onClick={e => e.stopPropagation()}>
            <h2>Tarqatish: {showDistribute.name}</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 16 }}>
              Xarajat narxi: <strong>{(showDistribute.cost || 0).toLocaleString()} so'm</strong> · Qoldiq: <strong>{showDistribute.stock}</strong>
            </p>
            <div className="grid-2">
              <div className="input-group">
                <label>Mijoz nomi *</label>
                <input className="input" placeholder="Ism Familiya" value={distForm.client_name} onChange={e => setDistForm({ ...distForm, client_name: e.target.value })} />
              </div>
              <div className="input-group">
                <label>Telefon</label>
                <input className="input" placeholder="+998 XX XXX XX XX" value={distForm.client_phone} onChange={e => setDistForm({ ...distForm, client_phone: e.target.value })} />
              </div>
            </div>
            <div className="grid-2">
              <div className="input-group">
                <label>Soni</label>
                <input className="input" type="number" placeholder="1" value={distForm.quantity} onChange={e => setDistForm({ ...distForm, quantity: e.target.value })} />
              </div>
              <div className="input-group">
                <label>Jami summa</label>
                <input className="input" value={((Number(distForm.quantity) || 1) * (showDistribute.cost || 0)).toLocaleString() + " so'm"} disabled style={{ fontWeight: 700, color: 'var(--secondary)' }} />
              </div>
            </div>
            <div className="input-group">
              <label>To'langan</label>
              <input className="input" type="number" placeholder="0" value={distForm.paid_amount} onChange={e => setDistForm({ ...distForm, paid_amount: e.target.value })} />
            </div>
            <div className="input-group">
              <label>Izoh</label>
              <input className="input" placeholder="Qo'shimcha ma'lumot..." value={distForm.note} onChange={e => setDistForm({ ...distForm, note: e.target.value })} />
            </div>
            <div className="modal-actions">
              <button className="btn btn-outline" onClick={() => setShowDistribute(null)}>Bekor</button>
              <button className="btn btn-primary" onClick={handleDistribute}>Tarqatish</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
