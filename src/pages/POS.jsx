import { useState, useEffect, useRef } from 'react';
import { api } from '../api';
import { useApp } from '../context/AppContext';
import { Package, Search, ShoppingCart, Banknote, CreditCard, Notebook, Check } from 'lucide-react';
import { onProductImgError } from '../utils/media';

export default function POS() {
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState('');
  const [showScanner, setShowScanner] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [paymentType, setPaymentType] = useState('cash');
  const [nasiyaList, setNasiyaList] = useState([]);
  const [selectedNasiya, setSelectedNasiya] = useState(null);
  const [paidAmount, setPaidAmount] = useState('');
  const [loading, setLoading] = useState(true);
  const [codeInput, setCodeInput] = useState('');
  const [codeResults, setCodeResults] = useState([]);
  const [showCodeSearch, setShowCodeSearch] = useState(false);
  const [showProductDetail, setShowProductDetail] = useState(null);
  const scannerRef = useRef(null);
  const scannerContainerRef = useRef(null);

  const {
    cart, addToCart, removeFromCart, updateCartQuantity, clearCart,
    cartTotal, cartCount, processSale, showToast, loading: saleLoading
  } = useApp();

  useEffect(() => {
    loadProducts();
  }, []);

  useEffect(() => {
    if (showScanner) {
      startScanner();
    } else {
      stopScanner();
    }
    return () => stopScanner();
  }, [showScanner]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadProducts = async () => {
    try {
      const data = await api.getProducts();
      setProducts(data);
    } catch {} finally {
      setLoading(false);
    }
  };

  const startScanner = async () => {
    try {
      const { Html5Qrcode } = await import('html5-qrcode');
      await new Promise(r => setTimeout(r, 100));

      if (scannerRef.current) {
        try { await scannerRef.current.stop(); } catch {}
      }

      scannerRef.current = new Html5Qrcode('qr-reader');
      await scannerRef.current.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        async (decodedText) => {
          setShowScanner(false);
          try {
            const product = await api.getProductByBarcode(decodedText);
            addToCart(product);
            showToast(`${product.name} savatga qo'shildi`);
          } catch {
            try {
              const productsByCode = await api.getProductsByCode(decodedText);
              if (productsByCode.length === 1) {
                addToCart(productsByCode[0]);
                showToast(`${productsByCode[0].name} savatga qo'shildi`);
              } else if (productsByCode.length > 1) {
                setCodeResults(productsByCode);
                setShowCodeSearch(true);
              }
            } catch {
              showToast('Mahsulot topilmadi', 'error');
            }
          }
        },
        () => {}
      );
    } catch {
      showToast('Kameraga ruxsat berilmadi', 'error');
      setShowScanner(false);
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        scannerRef.current = null;
      } catch {}
    }
  };

  const handleCodeSearch = async () => {
    if (!codeInput.trim()) return;
    try {
      const productsByCode = await api.getProductsByCode(codeInput.trim());
      if (productsByCode.length === 1) {
        addToCart(productsByCode[0]);
        showToast(`${productsByCode[0].name} savatga qo'shildi`);
        setCodeInput('');
      } else if (productsByCode.length > 1) {
        setCodeResults(productsByCode);
        setShowCodeSearch(true);
      }
    } catch {
      const found = products.filter(p =>
        p.product_code?.toLowerCase().includes(codeInput.toLowerCase()) ||
        p.name.toLowerCase().includes(codeInput.toLowerCase()) ||
        p.barcode?.toLowerCase().includes(codeInput.toLowerCase())
      );
      if (found.length > 0) {
        setCodeResults(found);
        setShowCodeSearch(true);
      } else {
        showToast('Mahsulot topilmadi', 'error');
      }
    }
  };

  const handlePayment = async () => {
    if (paymentType === 'nasiya') {
      if (!selectedNasiya) {
        showToast('Nasiya mijozini tanlang', 'error');
        return;
      }
    }

    const paid = paymentType === 'cash' ? cartTotal :
                 paymentType === 'nasiya' ? (Number(paidAmount) || 0) : cartTotal;

    const success = await processSale(
      paymentType,
      paymentType === 'nasiya' ? selectedNasiya : null,
      paid
    );

    if (success) {
      setShowPayment(false);
      setShowSuccess(true);
      setPaidAmount('');
      setSelectedNasiya(null);
      loadProducts();
      setTimeout(() => setShowSuccess(false), 2500);
    }
  };

  const openPayment = async () => {
    if (cart.length === 0) {
      showToast('Savat bo\'sh!', 'error');
      return;
    }
    if (paymentType === 'nasiya') {
      try {
        const data = await api.getNasiya();
        setNasiyaList(data);
      } catch {}
    }
    setShowPayment(true);
  };

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.barcode?.toLowerCase().includes(search.toLowerCase()) ||
    p.category?.toLowerCase().includes(search.toLowerCase()) ||
    p.product_code?.toLowerCase().includes(search.toLowerCase())
  );

  const categories = [...new Set(products.map(p => p.category).filter(Boolean))];

  return (
    <div>
      <div className="page-header">
        <h1>Sotish Apparati</h1>
        <p>Mahsulotlarni QR skaner, kod yoki qidiruv orqali tanlang</p>
      </div>

      <div className="pos-layout">
        <div>
          <div className="pos-search-bar">
            <input
              className="input"
              style={{ flex: 1 }}
              placeholder="Mahsulot nomi, barcode yoki kategoriya..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <div className="pos-search-line">
              <div className="pos-code-group">
                <input
                  className="input"
                  style={{ width: 100, textAlign: 'center', fontWeight: 700, fontSize: 14 }}
                  placeholder="Kod"
                  value={codeInput}
                  onChange={e => setCodeInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleCodeSearch()}
                />
                <button className="btn btn-primary btn-sm" onClick={handleCodeSearch}>
                  Kod
                </button>
              </div>
              <button className="btn btn-primary pos-qr-btn" onClick={() => setShowScanner(!showScanner)}>
                QR Skaner
              </button>
            </div>
          </div>

          {categories.length > 0 && (
            <div className="tabs" style={{ marginBottom: 16 }}>
              <button
                className={`tab ${search === '' ? 'active' : ''}`}
                onClick={() => setSearch('')}
              >
                Hammasi
              </button>
              {categories.map(cat => (
                <button
                  key={cat}
                  className={`tab ${search === cat ? 'active' : ''}`}
                  onClick={() => setSearch(cat)}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}

          {showScanner && (
            <div className="card mb-4" style={{ textAlign: 'center' }}>
              <div id="qr-reader" className="qr-scanner-container" ref={scannerContainerRef}></div>
              <button
                className="btn btn-outline mt-4"
                onClick={() => setShowScanner(false)}
              >
                Skanerni yopish
              </button>
            </div>
          )}

          {loading ? (
            <div className="loading-screen" style={{ position: 'relative' }}>
              <div className="loader"></div>
              <div className="text">Mahsulotlar yuklanmoqda...</div>
            </div>
          ) : (
            <div className="products-grid">
              {filteredProducts.map((product, i) => (
                <div key={product.id} style={{ animationDelay: `${i * 0.03}s` }}>
                  {/* Desktop: eski uslub */}
                  <div
                    className="product-card pos-desktop-item"
                    onClick={() => setShowProductDetail(product)}
                  >
                    <div className="product-icon">
                      {product.image ? (
                        <img src={product.image} alt="" onError={onProductImgError} />
                      ) : (
                        <Package size={22} />
                      )}
                    </div>
                    <div className="product-name">{product.name}</div>
                    {product.category && <div className="product-stock" style={{ color: 'var(--text-muted)' }}>{product.category}</div>}
                    <div className="product-price">{product.price.toLocaleString()} so'm</div>
                    <div className="product-stock">Qoldiq: {product.stock}</div>
                  </div>

                  {/* Mobile: Uzum Market */}
                  <div
                    className="product-card uzum-card pos-mobile-item"
                    onClick={() => setShowProductDetail(product)}
                  >
                    <div className="uzum-card-img">
                      {product.image ? (
                        <img src={product.image} alt={product.name} onError={onProductImgError} />
                      ) : (
                        <span style={{ opacity: 0.3 }}><Package size={48} /></span>
                      )}
                      {product.stock === 0 && <span className="uzum-badge-oz">Tugagan</span>}
                    </div>
                    <div className="uzum-card-body">
                      <div className="uzum-card-name">{product.name}</div>
                      <div className="uzum-card-price">{product.price.toLocaleString()} so'm</div>
                      {product.stock > 0 && (
                        <button className="uzum-card-btn" onClick={(e) => {
                          e.stopPropagation();
                          addToCart(product);
                          showToast(`${product.name} savatga qo'shildi`);
                        }}>Savatga</button>
                      )}
                      {product.stock === 0 && (
                        <button className="uzum-card-btn uzum-card-btn-disabled" disabled>Mavjud emas</button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {filteredProducts.length === 0 && (
                <div className="empty-cart" style={{ gridColumn: '1 / -1' }}>
                  <div className="icon"><Search size={48} /></div>
                  <p>Mahsulot topilmadi</p>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="cart-panel">
          <div className="cart-header">
            <h3>Savat ({cartCount})</h3>
            {cart.length > 0 && (
              <button className="btn btn-sm btn-outline" onClick={clearCart}>Tozalash</button>
            )}
          </div>

          <div className="cart-items">
            {cart.length === 0 ? (
              <div className="empty-cart">
                <div className="icon"><ShoppingCart size={48} /></div>
                <p>Savat bo'sh</p>
                <p style={{ fontSize: 12 }}>Mahsulotni bosing yoki QR skanerlang</p>
              </div>
            ) : (
              cart.map(item => (
                <div key={item.id} className="cart-item">
                  <div className="cart-item-info">
                    <div className="cart-item-name">
                      {item.product_code && (
                        <span style={{ color: 'var(--primary-light)', fontFamily: 'monospace', fontWeight: 700, marginRight: 4 }}>
                          #{item.product_code}
                        </span>
                      )}
                      {item.name}
                    </div>
                    <div className="cart-item-price">{item.price.toLocaleString()} so'm</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <div className="cart-item-qty">
                      <button onClick={() => updateCartQuantity(item.id, item.quantity - 1)}>−</button>
                      <span>{item.quantity}ta</span>
                      <button onClick={() => updateCartQuantity(item.id, item.quantity + 1)}>+</button>
                    </div>
                    <button
                      onClick={() => removeFromCart(item.id)}
                      style={{
                        background: 'rgba(255,71,87,0.15)',
                        color: '#FF4757',
                        border: 'none',
                        borderRadius: 6,
                        width: 24,
                        height: 24,
                        fontSize: 14,
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        lineHeight: 1
                      }}
                      title="O'chirish"
                    >
                      ×
                    </button>
                  </div>
                  <div className="cart-item-total">
                    {(item.price * item.quantity).toLocaleString()} so'm
                  </div>
                </div>
              ))
            )}
          </div>

          {cart.length > 0 && (
            <div className="cart-footer">
              <div className="cart-total">
                <span className="label">Jami:</span>
                <span className="value">{cartTotal.toLocaleString()} so'm</span>
              </div>
              <div className="cart-actions">
                <button className="btn btn-success btn-lg" onClick={openPayment}>
                  To'lov
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {showPayment && (
        <div className="modal-overlay" onClick={() => setShowPayment(false)}>
          <div className="modal payment-modal" onClick={e => e.stopPropagation()}>
            <h2>To'lov</h2>
            <div className="total-display">{cartTotal.toLocaleString()} so'm</div>

            <div className="payment-options">
              <button
                className={`payment-option ${paymentType === 'cash' ? 'selected' : ''}`}
                onClick={() => setPaymentType('cash')}
              >
                <div className="icon" style={{ background: 'rgba(0,184,148,0.15)', color: '#00B894' }}><Banknote size={20} /></div>
                Naqd pul
              </button>
              <button
                className={`payment-option ${paymentType === 'card' ? 'selected' : ''}`}
                onClick={() => setPaymentType('card')}
              >
                <div className="icon" style={{ background: 'rgba(108,92,231,0.15)', color: '#6C5CE7' }}><CreditCard size={20} /></div>
                Plastik karta
              </button>
              <button
                className={`payment-option ${paymentType === 'nasiya' ? 'selected' : ''}`}
                onClick={() => {
                  setPaymentType('nasiya');
                  api.getNasiya().then(data => setNasiyaList(data)).catch(() => {});
                }}
              >
                <div className="icon" style={{ background: 'rgba(253,121,168,0.15)', color: '#FD79A8' }}><Notebook size={20} /></div>
                Nasiya
              </button>
            </div>

            {paymentType === 'nasiya' && (
              <div className="mt-4">
                <div className="input-group">
                  <label>Mijozni tanlang</label>
                  <select
                    className="input"
                    value={selectedNasiya || ''}
                    onChange={e => setSelectedNasiya(e.target.value)}
                  >
                    <option value="">Mijoz tanlang...</option>
                    {nasiyaList.map(n => (
                      <option key={n.id} value={n.id}>
                        {n.customer_name} — Qarz: {(n.total_debt - n.paid_amount).toLocaleString()} so'm
                      </option>
                    ))}
                  </select>
                </div>
                {nasiyaList.length === 0 && (
                  <p style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 8 }}>
                    Nasiya mijozlari yo'q. Admin paneldan qo'shing.
                  </p>
                )}
                <div className="input-group">
                  <label>To'langan miqdor</label>
                  <input
                    className="input"
                    type="number"
                    placeholder="0"
                    value={paidAmount}
                    onChange={e => setPaidAmount(e.target.value)}
                  />
                </div>
              </div>
            )}

            <div className="modal-actions">
              <button className="btn btn-outline" onClick={() => setShowPayment(false)}>Bekor qilish</button>
              <button className="btn btn-success btn-lg" onClick={handlePayment} disabled={saleLoading}>
                {saleLoading ? <div className="spinner"></div> : 'Tasdiqlash'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showCodeSearch && (
        <div className="modal-overlay" onClick={() => setShowCodeSearch(false)}>
          <div className="modal" style={{ maxWidth: 560 }} onClick={e => e.stopPropagation()}>
            <h2>Mahsulotlar ro'yxati</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 16 }}>
              {codeResults.length} ta mahsulot topildi
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 400, overflow: 'auto' }}>
              {codeResults.map(p => (
                <div
                  key={p.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '12px 16px',
                    background: 'var(--bg-secondary)',
                    borderRadius: 'var(--radius-sm)',
                    cursor: 'pointer',
                    border: '1px solid var(--border)',
                    transition: 'all 0.2s'
                  }}
                  onClick={() => {
                    addToCart(p);
                    setShowCodeSearch(false);
                    setCodeInput('');
                    showToast(`${p.name} savatga qo'shildi`);
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600 }}>
                      {p.product_code && (
                        <span style={{ color: 'var(--primary-light)', fontFamily: 'monospace', marginRight: 6 }}>
                          #{p.product_code}
                        </span>
                      )}
                      {p.name}
                    </div>
                    <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                      {p.category || 'Kategoriya yo\'q'} — Qoldiq: {p.stock}
                    </div>
                  </div>
                  <div style={{ fontWeight: 700, color: 'var(--secondary)' }}>
                    {p.price.toLocaleString()} so'm
                  </div>
                </div>
              ))}
            </div>
            <div className="modal-actions">
              <button className="btn btn-outline" onClick={() => setShowCodeSearch(false)}>Yopish</button>
            </div>
          </div>
        </div>
      )}

      {showSuccess && (
        <div className="modal-overlay" onClick={() => setShowSuccess(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="success-animation">
              <div className="success-check"><Check size={40} strokeWidth={3} /></div>
              <h2 style={{ fontSize: 24, textAlign: 'center' }}>Sotish amalga oshirildi!</h2>
              <p style={{ color: 'var(--text-secondary)', textAlign: 'center' }}>
                Tranzaksiya muvaffaqiyatli yakunlandi
              </p>
            </div>
          </div>
        </div>
      )}

      {showProductDetail && (
        <div className="modal-overlay" onClick={() => setShowProductDetail(null)}>
          <div className="modal uzum-modal" onClick={e => e.stopPropagation()}>
            <button className="uzum-modal-close" onClick={() => setShowProductDetail(null)}>×</button>
            <div className="uzum-modal-img">
              {showProductDetail.image ? (
                <img
                  src={showProductDetail.image}
                  alt={showProductDetail.name}
                  onError={e => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
                />
              ) : null}
              <div style={{
                display: showProductDetail.image ? 'none' : 'flex',
                flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                gap: 8, color: 'var(--text-muted)', width: '100%', height: '100%'
              }}>
                <Package size={72} color="var(--text-muted)" />
                <span style={{ fontSize: 13 }}>Rasm yo'q</span>
              </div>
              {showProductDetail.stock <= 5 && showProductDetail.stock > 0 && (
                <span className="uzum-badge-warn">Kam qoldi — {showProductDetail.stock} dona</span>
              )}
              {showProductDetail.stock === 0 && (
                <span className="uzum-badge-oz">Tugagan</span>
              )}
            </div>

            <div className="uzum-modal-body">
              {showProductDetail.product_code && (
                <div className="uzum-modal-code">#{showProductDetail.product_code}</div>
              )}
              {showProductDetail.category && (
                <div className="uzum-modal-cat">{showProductDetail.category}</div>
              )}
              <h2 className="uzum-modal-title">{showProductDetail.name}</h2>
              <div className="uzum-modal-price">{showProductDetail.price.toLocaleString()} so'm</div>

              <div className="uzum-modal-stats">
                <div className="uzum-modal-stat">
                  <div className="uzum-modal-stat-label">Qoldiq</div>
                  <div className="uzum-modal-stat-value" style={{
                    color: showProductDetail.stock <= 5 ? 'var(--danger)' : showProductDetail.stock <= 15 ? 'var(--warning)' : 'var(--success)'
                  }}>{showProductDetail.stock} dona</div>
                </div>
                <div className="uzum-modal-stat">
                  <div className="uzum-modal-stat-label">Xarajat</div>
                  <div className="uzum-modal-stat-value">{(showProductDetail.cost || 0).toLocaleString()} so'm</div>
                </div>
                <div className="uzum-modal-stat">
                  <div className="uzum-modal-stat-label">Foyda</div>
                  <div className="uzum-modal-stat-value" style={{ color: 'var(--success)' }}>
                    {((showProductDetail.price || 0) - (showProductDetail.cost || 0)).toLocaleString()} so'm
                  </div>
                </div>
                {showProductDetail.barcode && (
                  <div className="uzum-modal-stat">
                    <div className="uzum-modal-stat-label">Barcode</div>
                    <div className="uzum-modal-stat-value" style={{ fontFamily: 'monospace', fontSize: 12 }}>{showProductDetail.barcode}</div>
                  </div>
                )}
              </div>

              <div className="uzum-modal-actions">
                <button className="uzum-modal-buy" onClick={() => {
                  addToCart(showProductDetail);
                  setShowProductDetail(null);
                  showToast(`${showProductDetail.name} savatga qo'shildi`);
                }} disabled={showProductDetail.stock <= 0}>
                  <ShoppingCart size={16} /> Savatga qo'shish
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
