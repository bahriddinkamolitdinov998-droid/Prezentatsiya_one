const express = require('express');
const cors = require('cors');
const Database = require('better-sqlite3');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const os = require('os');
const fs = require('fs');

const app = express();
const PORT = 3001;
const TZ_OFFSET = 5;

process.on('uncaughtException', (err) => {
  console.error('[FATAL] Uncaught Exception:', err.message, err.stack);
});
process.on('unhandledRejection', (reason) => {
  console.error('[FATAL] Unhandled Rejection:', reason);
});

function getLocalDate() {
  return new Date(Date.now() + TZ_OFFSET * 3600000).toISOString().slice(0, 10);
}

function getLocalMonth() {
  return new Date(Date.now() + TZ_OFFSET * 3600000).toISOString().slice(0, 7);
}

app.use(cors());
app.use(express.json({ limit: '10mb' }));

const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
app.use('/uploads', express.static(uploadsDir));

let db;
try {
  db = new Database(path.join(__dirname, 'shop.db'));
  db.pragma('journal_mode = WAL');
  db.pragma('busy_timeout = 5000');
  db.pragma('synchronous = NORMAL');
  db.pragma('wal_checkpoint(TRUNCATE)');
} catch (err) {
  console.error('[DB] Database ochishda xatolik:', err.message);
  process.exit(1);
}

db.exec(`
  CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    barcode TEXT UNIQUE,
    product_code TEXT DEFAULT '',
    price REAL NOT NULL,
    cost REAL NOT NULL DEFAULT 0,
    stock INTEGER NOT NULL DEFAULT 0,
    category TEXT DEFAULT '',
    image TEXT DEFAULT '',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS sales (
    id TEXT PRIMARY KEY,
    items TEXT NOT NULL,
    total REAL NOT NULL,
    paid REAL NOT NULL DEFAULT 0,
    payment_type TEXT NOT NULL DEFAULT 'cash',
    nasiya_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS nasiya (
    id TEXT PRIMARY KEY,
    customer_name TEXT NOT NULL,
    phone TEXT DEFAULT '',
    address TEXT DEFAULT '',
    location TEXT DEFAULT '',
    image TEXT DEFAULT '',
    total_debt REAL NOT NULL DEFAULT 0,
    paid_amount REAL NOT NULL DEFAULT 0,
    status TEXT DEFAULT 'active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS nasiya_payments (
    id TEXT PRIMARY KEY,
    nasiya_id TEXT NOT NULL,
    amount REAL NOT NULL,
    note TEXT DEFAULT '',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (nasiya_id) REFERENCES nasiya(id)
  );

  CREATE TABLE IF NOT EXISTS admin_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS ai_chat_history (
    id TEXT PRIMARY KEY,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS archive (
    id TEXT PRIMARY KEY,
    source_table TEXT NOT NULL,
    data TEXT NOT NULL,
    archived_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS distributions (
    id TEXT PRIMARY KEY,
    client_name TEXT NOT NULL,
    client_phone TEXT DEFAULT '',
    product_id TEXT,
    product_name TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price REAL NOT NULL DEFAULT 0,
    total_sum REAL NOT NULL DEFAULT 0,
    paid_amount REAL NOT NULL DEFAULT 0,
    note TEXT DEFAULT '',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS cash_registers (
    id TEXT PRIMARY KEY,
    opened_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    closed_at DATETIME,
    opening_balance REAL NOT NULL DEFAULT 0,
    closing_balance REAL,
    note TEXT DEFAULT '',
    status TEXT DEFAULT 'open'
  );
`);

try { db.exec(`ALTER TABLE products ADD COLUMN product_code TEXT DEFAULT ''`); } catch {}
try { db.exec(`ALTER TABLE nasiya ADD COLUMN address TEXT DEFAULT ''`); } catch {}
try { db.exec(`ALTER TABLE nasiya ADD COLUMN location TEXT DEFAULT ''`); } catch {}
try { db.exec(`ALTER TABLE nasiya ADD COLUMN image TEXT DEFAULT ''`); } catch {}
try { db.exec(`ALTER TABLE sales ADD COLUMN archived_daily INTEGER DEFAULT 0`); } catch {}

const defaultSettings = {
  shop_name: 'Misol Do\'kon',
  shop_number: '001',
  shop_address: '',
  shop_phone: ''
};

for (const [key, value] of Object.entries(defaultSettings)) {
  const exists = db.prepare('SELECT value FROM admin_settings WHERE key = ?').get(key);
  if (!exists) {
    db.prepare('INSERT INTO admin_settings (key, value) VALUES (?, ?)').run(key, value);
  }
}

const authMiddleware = (req, res, next) => {
  next();
};

const getRamInfo = () => {
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;
  return {
    total: (totalMem / 1073741824).toFixed(1) + ' GB',
    used: (usedMem / 1073741824).toFixed(1) + ' GB',
    free: (freeMem / 1073741824).toFixed(1) + ' GB',
    percent: ((usedMem / totalMem) * 100).toFixed(1) + '%'
  };
};

app.get('/api/shop-info', (req, res) => {
  try {
    const settings = {};
    const rows = db.prepare('SELECT key, value FROM admin_settings WHERE key IN (?, ?, ?, ?)').all(
      'shop_name', 'shop_number', 'shop_address', 'shop_phone'
    );
    for (const row of rows) { settings[row.key] = row.value; }
    const ram = getRamInfo();
    const productCount = db.prepare('SELECT COUNT(*) as count FROM products').get();
    const activeNasiya = db.prepare('SELECT COUNT(*) as count FROM nasiya WHERE status = ?').get('active');
    res.json({
      shop_name: settings.shop_name || 'Misol Do\'kon',
      shop_number: settings.shop_number || '001',
      shop_address: settings.shop_address || '',
      shop_phone: settings.shop_phone || '',
      ram,
      server_uptime: process.uptime().toFixed(0) + 's',
      node_version: process.version,
      platform: os.platform(),
      hostname: os.hostname(),
      productCount: productCount.count,
      activeNasiya: activeNasiya.count
    });
  } catch (err) { console.error('[shop-info]', err.message); res.status(500).json({ error: 'Server xatolik' }); }
});

app.get('/api/products', (req, res) => {
  try {
    const products = db.prepare('SELECT * FROM products ORDER BY created_at DESC').all();
    res.json(products);
  } catch (err) { console.error('[products]', err.message); res.status(500).json({ error: 'Server xatolik' }); }
});

app.get('/api/products/barcode/:barcode', (req, res) => {
  try {
    const product = db.prepare('SELECT * FROM products WHERE barcode = ?').get(req.params.barcode);
    if (!product) return res.status(404).json({ error: 'Mahsulot topilmadi' });
    res.json(product);
  } catch (err) { console.error('[barcode]', err.message); res.status(500).json({ error: 'Server xatolik' }); }
});

app.get('/api/products/code/:code', (req, res) => {
  try {
    const code = req.params.code;
    const products = db.prepare('SELECT * FROM products WHERE product_code = ?').all(code);
    if (products.length === 0) return res.status(404).json({ error: 'Mahsulot topilmadi' });
    res.json(products);
  } catch (err) { console.error('[product-code]', err.message); res.status(500).json({ error: 'Server xatolik' }); }
});

app.get('/api/products/search', (req, res) => {
  try {
    const { q } = req.query;
    if (!q) return res.json([]);
    const products = db.prepare(
      `SELECT * FROM products WHERE name LIKE ? OR barcode LIKE ? OR product_code LIKE ? OR category LIKE ? ORDER BY created_at DESC`
    ).all(`%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`);
    res.json(products);
  } catch (err) { console.error('[search]', err.message); res.status(500).json({ error: 'Server xatolik' }); }
});

app.get('/api/products/:id', (req, res) => {
  try {
    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
    if (!product) return res.status(404).json({ error: 'Mahsulot topilmadi' });
    res.json(product);
  } catch (err) { console.error('[product-id]', err.message); res.status(500).json({ error: 'Server xatolik' }); }
});

app.post('/api/sales', (req, res) => {
  try {
    const { items, total, paid, payment_type, nasiya_id } = req.body;
    if (!items || !Array.isArray(items) || items.length === 0) return res.status(400).json({ error: 'Mahsulotlar kiritilmagan' });
    const id = uuidv4();

    for (const item of items) {
      const product = db.prepare('SELECT stock, name FROM products WHERE id = ?').get(item.id);
      if (!product) return res.status(400).json({ error: `Mahsulot topilmadi: ${item.id}` });
      if (product.stock < item.quantity) return res.status(400).json({ error: `${product.name} — omborda yetarli emas (${product.stock} ta qoldi)` });
    }

    const insertSale = db.prepare('INSERT INTO sales (id, items, total, paid, payment_type, nasiya_id) VALUES (?, ?, ?, ?, ?, ?)');
    insertSale.run(id, JSON.stringify(items), total, paid, payment_type, nasiya_id || null);

    const updateStock = db.prepare('UPDATE products SET stock = stock - ? WHERE id = ?');
    for (const item of items) {
      updateStock.run(item.quantity, item.id);
    }

    if (payment_type === 'nasiya' && nasiya_id) {
      const nasiya = db.prepare('SELECT total_debt, paid_amount FROM nasiya WHERE id = ?').get(nasiya_id);
      const newDebt = (nasiya?.total_debt || 0) + (total - paid);
      const newStatus = newDebt > (nasiya?.paid_amount || 0) ? 'active' : (nasiya?.status || 'active');
      db.prepare('UPDATE nasiya SET total_debt = ?, status = ? WHERE id = ?').run(newDebt, newStatus, nasiya_id);
    }

    res.json({ id, message: 'Sotish muvaffaqiyatli' });
  } catch (err) { console.error('[sale]', err.message); res.status(500).json({ error: err.message }); }
});

app.get('/api/sales', (req, res) => {
  try {
    const { date, month } = req.query;
    let query = 'SELECT * FROM sales';
    const params = [];
    if (date) {
      query += ' WHERE DATE(created_at, \'+5 hours\') = ? AND archived_daily = 0';
      params.push(date);
    } else if (month) {
      query += ` WHERE strftime('%Y-%m', created_at, '+5 hours') = ? AND archived_daily = 0`;
      params.push(month);
    }
    query += ' ORDER BY created_at DESC';
    const sales = db.prepare(query).all(...params);
    res.json(sales.map(s => ({ ...s, items: JSON.parse(s.items) })));
  } catch (err) { console.error('[sales-get]', err.message); res.status(500).json({ error: 'Server xatolik' }); }
});

app.get('/api/stats/daily', (req, res) => {
  try {
    const today = getLocalDate();
    const sales = db.prepare('SELECT * FROM sales WHERE DATE(created_at, \'+5 hours\') = ? AND archived_daily = 0').all(today);

    let totalCash = 0, totalCard = 0, totalNasiya = 0, totalSales = 0, totalProfit = 0;
    const productSales = {};

    for (const sale of sales) {
      const items = JSON.parse(sale.items);
      totalSales += sale.total;
      if (sale.payment_type === 'cash') totalCash += sale.paid;
      else if (sale.payment_type === 'card') totalCard += sale.paid;
      else if (sale.payment_type === 'nasiya') totalNasiya += sale.total - sale.paid;

      for (const item of items) {
        const product = db.prepare('SELECT cost, name FROM products WHERE id = ?').get(item.id);
        if (product) {
          totalProfit += (item.price - product.cost) * item.quantity;
          if (!productSales[item.id]) productSales[item.id] = { name: product.name, quantity: 0, total: 0 };
          productSales[item.id].quantity += item.quantity;
          productSales[item.id].total += item.price * item.quantity;
        }
      }
    }

    const topProducts = Object.entries(productSales)
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => b.total - a.total).slice(0, 5);

    const recentSales = sales.slice(0, 5).map(s => ({
      id: s.id, total: s.total, payment_type: s.payment_type, created_at: s.created_at, items: JSON.parse(s.items)
    }));

    res.json({ totalSales, totalCash, totalCard, totalNasiya, totalProfit, salesCount: sales.length, topProducts, recentSales });
  } catch (err) { console.error('[daily-stats]', err.message); res.status(500).json({ error: 'Server xatolik' }); }
});

app.get('/api/stats/monthly', (req, res) => {
  try {
    const month = req.query.month || getLocalMonth();
    const sales = db.prepare(`SELECT * FROM sales WHERE strftime('%Y-%m', created_at, '+5 hours') = ? AND archived_daily = 0`).all(month);

    let totalCash = 0, totalCard = 0, totalNasiya = 0, totalSales = 0, totalProfit = 0;

    for (const sale of sales) {
      const items = JSON.parse(sale.items);
      totalSales += sale.total;
      if (sale.payment_type === 'cash') totalCash += sale.paid;
      else if (sale.payment_type === 'card') totalCard += sale.paid;
      else if (sale.payment_type === 'nasiya') totalNasiya += sale.total - sale.paid;

      for (const item of items) {
        const product = db.prepare('SELECT cost FROM products WHERE id = ?').get(item.id);
        if (product) totalProfit += (item.price - product.cost) * item.quantity;
      }
    }

    const nasiyaList = db.prepare('SELECT * FROM nasiya WHERE status = ?').all('active');
    const totalNasiyaDebt = nasiyaList.reduce((sum, n) => sum + (n.total_debt - n.paid_amount), 0);

    res.json({ totalSales, totalCash, totalCard, totalNasiya, totalProfit, totalNasiyaDebt, salesCount: sales.length, month });
  } catch (err) { console.error('[monthly-stats]', err.message); res.status(500).json({ error: 'Server xatolik' }); }
});

app.get('/api/nasiya', (req, res) => {
  try {
    const nasiya = db.prepare('SELECT * FROM nasiya ORDER BY created_at DESC').all();
    const archiveRows = db.prepare("SELECT data FROM archive WHERE source_table LIKE '%sales%'").all();
    const allSales = [];
    archiveRows.forEach(row => {
      try {
        const items = JSON.parse(row.data);
        if (Array.isArray(items)) items.forEach(s => { if (s.nasiya_id) allSales.push(s); });
      } catch {}
    });
    const currentSales = db.prepare('SELECT * FROM sales WHERE nasiya_id IS NOT NULL').all();
    const allLinkedSales = [...currentSales, ...allSales];
    const productNameById = new Map(db.prepare('SELECT id, name FROM products').all().map(p => [p.id, p.name]));
    const normalizeItems = (s) => {
      let items = s.items;
      if (typeof items === 'string') { try { items = JSON.parse(items); } catch { items = []; } }
      if (!Array.isArray(items)) return [];
      return items.map(item => {
        const name = item.name || item.product_name || productNameById.get(item.id) || 'Mahsulot';
        return { ...item, name };
      });
    };
    const nasiyaWithItems = nasiya.map(n => {
      const sales = allLinkedSales.filter(s => s.nasiya_id === n.id);
      const itemNames = new Set();
      let totalItems = 0;
      sales.forEach(s => {
        const items = normalizeItems(s);
        items.forEach(item => { itemNames.add(item.name); totalItems += item.quantity; });
      });
      const salesDetails = sales
        .map(s => ({ ...s, items: normalizeItems(s) }))
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      return { ...n, items_summary: Array.from(itemNames).join(', ') || '—', total_items_bought: totalItems, sales: salesDetails };
    });
    res.json(nasiyaWithItems);
  } catch (err) { console.error('[nasiya]', err.message); res.status(500).json({ error: 'Server xatolik' }); }
});

app.get('/api/nasiya/active', (req, res) => {
  try {
    const nasiya = db.prepare('SELECT * FROM nasiya WHERE status = ? ORDER BY created_at DESC').all('active');
    res.json(nasiya);
  } catch (err) { console.error('[nasiya-active]', err.message); res.status(500).json({ error: 'Server xatolik' }); }
});

app.post('/api/nasiya', (req, res) => {
  try {
    const { customer_name, phone, address, location, image } = req.body;
    if (!customer_name) return res.status(400).json({ error: 'Mijoz nomi kiritilishi shart' });
    const id = uuidv4();
    db.prepare('INSERT INTO nasiya (id, customer_name, phone, address, location, image) VALUES (?, ?, ?, ?, ?, ?)').run(id, customer_name, phone || '', address || '', location || '', image || '');
    res.json({ id, message: 'Nasiya ochildi' });
  } catch (err) { console.error('[nasiya-post]', err.message); res.status(500).json({ error: err.message }); }
});

app.put('/api/nasiya/:id', authMiddleware, (req, res) => {
  try {
    const { customer_name, phone, address, location, image } = req.body;
    db.prepare('UPDATE nasiya SET customer_name=?, phone=?, address=?, location=?, image=? WHERE id=?')
      .run(customer_name, phone || '', address || '', location || '', image || '', req.params.id);
    res.json({ message: 'Nasiya yangilandi' });
  } catch (err) { console.error('[nasiya-put]', err.message); res.status(500).json({ error: err.message }); }
});

app.delete('/api/nasiya/:id', authMiddleware, (req, res) => {
  try {
    db.prepare('DELETE FROM nasiya_payments WHERE nasiya_id = ?').run(req.params.id);
    db.prepare('DELETE FROM nasiya WHERE id = ?').run(req.params.id);
    res.json({ message: 'Nasiya o\'chirildi' });
  } catch (err) { console.error('[nasiya-del]', err.message); res.status(500).json({ error: err.message }); }
});

app.post('/api/nasiya/:id/pay', (req, res) => {
  try {
    const { amount, note } = req.body;
    const nasiya = db.prepare('SELECT * FROM nasiya WHERE id = ?').get(req.params.id);
    if (!nasiya) return res.status(404).json({ error: 'Nasiya topilmadi' });

    const paymentId = uuidv4();
    db.prepare('INSERT INTO nasiya_payments (id, nasiya_id, amount, note) VALUES (?, ?, ?, ?)').run(
      paymentId, req.params.id, amount, note || ''
    );

    const newPaid = nasiya.paid_amount + amount;
    const newStatus = newPaid >= nasiya.total_debt ? 'paid' : 'active';
    db.prepare('UPDATE nasiya SET paid_amount = ?, status = ? WHERE id = ?').run(newPaid, newStatus, req.params.id);
    res.json({ message: 'To\'lov qabul qilindi' });
  } catch (err) { console.error('[nasiya-pay]', err.message); res.status(500).json({ error: err.message }); }
});

app.get('/api/nasiya/:id/payments', (req, res) => {
  try {
    const payments = db.prepare('SELECT * FROM nasiya_payments WHERE nasiya_id = ? ORDER BY created_at DESC').all(req.params.id);
    res.json(payments);
  } catch (err) { console.error('[nasiya-payments]', err.message); res.status(500).json({ error: 'Server xatolik' }); }
});

app.get('/api/nasiya/:id/sales', (req, res) => {
  try {
    const sales = db.prepare('SELECT * FROM sales WHERE nasiya_id = ? ORDER BY created_at DESC').all(req.params.id);
    const archiveRows = db.prepare("SELECT data FROM archive WHERE source_table LIKE '%sales%'").all();
    const archivedSales = [];
    archiveRows.forEach(row => {
      try {
        const items = JSON.parse(row.data);
        if (Array.isArray(items)) {
          items.forEach(s => {
            if (s.nasiya_id === req.params.id) archivedSales.push(s);
          });
        }
      } catch {}
    });
    const productNameById = new Map(db.prepare('SELECT id, name FROM products').all().map(p => [p.id, p.name]));
    const normalizeItems = (s) => {
      let items = s.items;
      if (typeof items === 'string') { try { items = JSON.parse(items); } catch { items = []; } }
      if (!Array.isArray(items)) return [];
      return items.map(item => {
        const name = item.name || item.product_name || productNameById.get(item.id) || 'Mahsulot';
        return { ...item, name };
      });
    };
    const allSales = [...sales, ...archivedSales].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    res.json(allSales.map(s => ({ ...s, items: normalizeItems(s) })));
  } catch (err) { console.error('[nasiya-sales]', err.message); res.status(500).json({ error: 'Server xatolik' }); }
});

app.post('/api/nasiya/:id/sale', (req, res) => {
  try {
    const { items, paid = 0, created_at } = req.body;
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Mahsulotlar kiritilmagan' });
    }
    const nasiya = db.prepare('SELECT * FROM nasiya WHERE id = ?').get(req.params.id);
    if (!nasiya) return res.status(404).json({ error: 'Nasiya topilmadi' });

    const productStmt = db.prepare('SELECT stock FROM products WHERE id = ?');
    const updateStock = db.prepare('UPDATE products SET stock = stock - ? WHERE id = ?');
    let total = 0;
    for (const item of items) {
      const qty = Number(item.quantity) || 1;
      const price = Number(item.price) || 0;
      total += price * qty;
      if (item.id) {
        const product = productStmt.get(item.id);
        if (product) {
          if (product.stock < qty) {
            return res.status(400).json({ error: `${item.name || 'Mahsulot'} — omborda yetarli emas (${product.stock} ta qoldi)` });
          }
          updateStock.run(qty, item.id);
        }
      }
    }

    const id = uuidv4();
    const dateStr = created_at || null;
    db.prepare('INSERT INTO sales (id, items, total, paid, payment_type, nasiya_id, created_at) VALUES (?, ?, ?, ?, ?, ?, COALESCE(?, CURRENT_TIMESTAMP))')
      .run(id, JSON.stringify(items), total, Number(paid) || 0, 'nasiya', req.params.id, dateStr);

    const newDebt = nasiya.total_debt + (total - (Number(paid) || 0));
    const newStatus = newDebt > nasiya.paid_amount ? 'active' : 'paid';
    db.prepare('UPDATE nasiya SET total_debt = ?, status = ? WHERE id = ?').run(newDebt, newStatus, req.params.id);

    res.json({ id, message: 'Sotuv qo\'shildi' });
  } catch (err) { console.error('[nasiya-sale-add]', err.message); res.status(500).json({ error: err.message }); }
});

app.post('/api/admin/login', (req, res) => {
  res.json({ success: true });
});

app.get('/api/admin/settings', authMiddleware, (req, res) => {
  try {
    const settings = {};
    const rows = db.prepare('SELECT key, value FROM admin_settings').all();
    for (const row of rows) { settings[row.key] = row.value; }
    res.json(settings);
  } catch (err) { console.error('[settings-get]', err.message); res.status(500).json({ error: 'Server xatolik' }); }
});

app.put('/api/admin/settings', authMiddleware, (req, res) => {
  try {
    const { key, value } = req.body;
    if (!key) return res.status(400).json({ error: 'Kalit kiritilmagan' });
    const exists = db.prepare('SELECT key FROM admin_settings WHERE key = ?').get(key);
    if (exists) {
      db.prepare('UPDATE admin_settings SET value = ? WHERE key = ?').run(value || '', key);
    } else {
      db.prepare('INSERT INTO admin_settings (key, value) VALUES (?, ?)').run(key, value || '');
    }
    res.json({ message: 'Sozlama yangilandi' });
  } catch (err) { console.error('[settings-put]', err.message); res.status(500).json({ error: err.message }); }
});

app.post('/api/admin/products', authMiddleware, (req, res) => {
  try {
    const { name, barcode, product_code, price, cost, stock, category, image } = req.body;
    if (!name || price === undefined) return res.status(400).json({ error: 'Nomi va narxini kiriting' });
    const id = uuidv4();
    db.prepare(
      'INSERT INTO products (id, name, barcode, product_code, price, cost, stock, category, image) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(id, name, barcode || uuidv4().slice(0, 8), product_code || '', price, cost || 0, stock || 0, category || '', image || '');
    res.json({ id, message: 'Mahsulot qo\'shildi' });
  } catch (err) {
    console.error('[product-add]', err.message);
    res.status(400).json({ error: 'Barcode allaqachon mavjud yoki xatolik' });
  }
});

app.put('/api/admin/products/:id', authMiddleware, (req, res) => {
  try {
    const { name, barcode, product_code, price, cost, stock, category, image } = req.body;
    db.prepare(
      'UPDATE products SET name=?, barcode=?, product_code=?, price=?, cost=?, stock=?, category=?, image=? WHERE id=?'
    ).run(name, barcode, product_code || '', price, cost || 0, stock || 0, category || '', image || '', req.params.id);
    res.json({ message: 'Mahsulot yangilandi' });
  } catch (err) { console.error('[product-put]', err.message); res.status(500).json({ error: err.message }); }
});

app.delete('/api/admin/products/:id', authMiddleware, (req, res) => {
  try {
    db.prepare('DELETE FROM products WHERE id = ?').run(req.params.id);
    res.json({ message: 'Mahsulot o\'chirildi' });
  } catch (err) { console.error('[product-del]', err.message); res.status(500).json({ error: err.message }); }
});

app.post('/api/ai/chat', (req, res) => {
  try {
    const { message } = req.body;
    if (!message || typeof message !== 'string') return res.status(400).json({ error: 'Xabar kiritilmagan' });

    const sanitized = message.replace(/<[^>]*>/g, '').replace(/[<>]/g, '').trim();
    if (sanitized.length > 500) return res.status(400).json({ error: 'Xabar juda uzun' });

    const blocked = ['eval(', 'exec(', 'script>', 'javascript:', 'onerror=', 'onload=', 'DROP TABLE', 'DELETE FROM', 'INSERT INTO', '../../', '..\\'];
    for (const pattern of blocked) {
      if (sanitized.toLowerCase().includes(pattern.toLowerCase())) return res.status(400).json({ error: 'Xavfsizlik sababi bilan rad etildi' });
    }

    const id = uuidv4();
    db.prepare('INSERT INTO ai_chat_history (id, role, content) VALUES (?, ?, ?)').run(id, 'user', sanitized);

    const lower = sanitized.toLowerCase();
    let response = '';
    const today = getLocalDate();
    const month = getLocalMonth();

    if (lower.includes('salom') || lower.includes('hello') || lower.includes('assalomu')) {
      response = 'Assalomu alaykum! Men sizning AI yordamchiman. Savdo apparati tizimida qanday yordam bera olaman?\n\nMen quyidagilarni bilaman:\n- Bugungi va oylik savdo ma\'lumotlari\n- Foyda hisobi\n- Nasiya qarzi\n- Mahsulotlar holati\n- Kam qolgan mahsulotlar';
    } else if (lower.includes('bugun') && (lower.includes('savdo') || lower.includes('sotish'))) {
      const sales = db.prepare('SELECT * FROM sales WHERE DATE(created_at, \'+5 hours\') = ?').all(today);
      let total = 0, cashTotal = 0, cardTotal = 0, nasiyaTotal = 0, count = sales.length;
      for (const s of sales) {
        total += s.total;
        if (s.payment_type === 'cash') cashTotal += s.paid;
        else if (s.payment_type === 'card') cardTotal += s.paid;
        else if (s.payment_type === 'nasiya') nasiyaTotal += s.total - s.paid;
      }
      response = `Bugungi savdo hisoboti:\n\nJami sotishlar soni: ${count} ta\nJami savdo summasi: ${total.toLocaleString()} so'm\n\nTo'lov turlari bo'yicha:\n- Naqd pul: ${cashTotal.toLocaleString()} so'm\n- Plastik karta: ${cardTotal.toLocaleString()} so'm\n- Nasiya: ${nasiyaTotal.toLocaleString()} so'm`;
    } else if (lower.includes('oylik') && (lower.includes('savdo') || lower.includes('hisobot'))) {
      const sales = db.prepare(`SELECT * FROM sales WHERE strftime('%Y-%m', created_at, '+5 hours') = ?`).all(month);
      let total = 0, profit = 0, cashTotal = 0;
      for (const s of sales) {
        total += s.total;
        if (s.payment_type === 'cash') cashTotal += s.paid;
        const items = JSON.parse(s.items);
        for (const item of items) {
          const p = db.prepare('SELECT cost FROM products WHERE id = ?').get(item.id);
          if (p) profit += (item.price - p.cost) * item.quantity;
        }
      }
      const nasiyaList = db.prepare('SELECT * FROM nasiya WHERE status = ?').all('active');
      const totalNasiyaDebt = nasiyaList.reduce((sum, n) => sum + (n.total_debt - n.paid_amount), 0);
      response = `Oylik hisobot (${month}):\n\nJami sotishlar: ${sales.length} ta\nJami savdo summasi: ${total.toLocaleString()} so'm\nNaqd pul: ${cashTotal.toLocaleString()} so'm\nJami foyda: ${profit.toLocaleString()} so'm\nFaol nasiya qarzi: ${totalNasiyaDebt.toLocaleString()} so'm\nO'rtacha tranzaksiya: ${sales.length > 0 ? Math.round(total / sales.length).toLocaleString() : 0} so'm`;
    } else if (lower.includes('nasiya') && (lower.includes('qarz') || lower.includes('miqdor') || lower.includes('jami'))) {
      const active = db.prepare('SELECT * FROM nasiya WHERE status = ?').all('active');
      const totalDebt = active.reduce((sum, n) => sum + (n.total_debt - n.paid_amount), 0);
      const totalPaid = active.reduce((sum, n) => sum + n.paid_amount, 0);
      let details = '';
      if (active.length > 0) {
        details = '\n\nNasiya mijozlari:\n' + active.map(n => `- ${n.customer_name}: qoldiq ${(n.total_debt - n.paid_amount).toLocaleString()} so'm, to'langan ${n.paid_amount.toLocaleString()} so'm`).join('\n');
      }
      response = `Nasiya qarzi haqida:\n\nFaol nasiyalar soni: ${active.length} ta\nUmumiy qarz: ${totalDebt.toLocaleString()} so'm\nJami to'langan: ${totalPaid.toLocaleString()} so'm${details}`;
    } else if (lower.includes('mahsulot') && (lower.includes('soni') || lower.includes('nechta') || lower.includes('qancha'))) {
      const products = db.prepare('SELECT COUNT(*) as count FROM products').get();
      const totalStock = db.prepare('SELECT SUM(stock) as total FROM products').get();
      const categories = db.prepare('SELECT category, COUNT(*) as count FROM products WHERE category != "" GROUP BY category').all();
      let catInfo = '';
      if (categories.length > 0) catInfo = '\n\nKategoriyalar:\n' + categories.map(c => `- ${c.category}: ${c.count} ta`).join('\n');
      response = `Mahsulotlar haqida:\n\nJami mahsulotlar soni: ${products.count} ta\nOmbordagi jami miqdor: ${totalStock.total || 0} dona${catInfo}`;
    } else if (lower.includes('kam qol') || lower.includes('tugayapti') || lower.includes('oz qoldi') || lower.includes('tugab bormoqda') || lower.includes('kam qolgan') || lower.includes('tugagan mahsulot')) {
      const low = db.prepare('SELECT * FROM products WHERE stock < 50 ORDER BY stock ASC').all();
      if (low.length === 0) {
        response = 'Hamma mahsulotlar yetarli darajada. Kam qolgan mahsulotlar yo\'q.';
      } else {
        response = `Kam qolgan mahsulotlar (${low.length} ta):\n\n${low.map(p => `- ${p.name}: ${p.stock} dona qoldi (narxi: ${p.price.toLocaleString()} so'm)`).join('\n')}\n\nIltimos, zaxirani to'ldiring!`;
      }
    } else if (lower.includes('foyda')) {
      const sales = db.prepare(`SELECT * FROM sales WHERE strftime('%Y-%m', created_at, '+5 hours') = ?`).all(month);
      let profit = 0, totalSales = 0;
      for (const s of sales) {
        totalSales += s.total;
        const items = JSON.parse(s.items);
        for (const item of items) {
          const p = db.prepare('SELECT cost FROM products WHERE id = ?').get(item.id);
          if (p) profit += (item.price - p.cost) * item.quantity;
        }
      }
      const margin = totalSales > 0 ? ((profit / totalSales) * 100).toFixed(1) : 0;
      response = `Foyda hisoboti (${month}):\n\nJami savdo: ${totalSales.toLocaleString()} so'm\nJami foyda: ${profit.toLocaleString()} so'm\nFoyda foizi: ${margin}%\nO'rtacha foyda har bir sotishdan: ${sales.length > 0 ? Math.round(profit / sales.length).toLocaleString() : 0} so'm`;
    } else if (lower.includes('yordam') || lower.includes('help') || lower.includes('nima qila')) {
      response = `Men quyidagilarni bila olaman:\n\nBugungi savdo - bugungi sotishlar haqida to'liq ma'lumot\nOylik hisobot - oylik savdo, foyda va nasiya haqida\nFoyda - foyda hisobi va marjani\nNasiya qarzi - nasiya mijozlari va qarzlar\nMahsulotlar soni - ombordagi mahsulotlar haqida\nKam qolganlar - kam qolgan mahsulotlar ro'yxati\n\nQanday savol berishingiz mumkin!`;
    } else if (lower.includes('rahmat') || lower.includes('thanks')) {
      response = 'Arzimaydi! Boshqa savol bo\'lsa, bemalol so\'rang. Men doimo yordamga tayyorman.';
    } else {
      response = `Savolingiz "${sanitized}" bo'yicha:\n\nHozircha faqat quyidagi mavzular bo'yicha ma'lumot bera olaman:\n- Bugungi savdo\n- Oylik hisobot\n- Foyda hisobi\n- Nasiya qarzi\n- Mahsulotlar soni\n- Kam qolgan mahsulotlar\n\n"Yordam" deb yozing, barcha imkoniyatlarni ko'ring.`;
    }

    db.prepare('INSERT INTO ai_chat_history (id, role, content) VALUES (?, ?, ?)').run(uuidv4(), 'assistant', response);
    res.json({ response });
  } catch (err) { console.error('[ai-chat]', err.message); res.status(500).json({ error: 'Xatolik yuz berdi' }); }
});

app.get('/api/ai/history', (req, res) => {
  try {
    const history = db.prepare('SELECT * FROM ai_chat_history ORDER BY created_at DESC LIMIT 50').all();
    res.json(history.reverse());
  } catch (err) { console.error('[ai-history]', err.message); res.status(500).json({ error: 'Server xatolik' }); }
});

app.delete('/api/ai/clear', authMiddleware, (req, res) => {
  try {
    const history = db.prepare('SELECT * FROM ai_chat_history ORDER BY created_at ASC').all();
    if (history.length > 0) {
      db.prepare('INSERT INTO archive (id, source_table, data) VALUES (?, ?, ?)').run(uuidv4(), 'ai_chat_history', JSON.stringify(history));
    }
    db.prepare('DELETE FROM ai_chat_history').run();
    res.json({ message: 'Chat tarixi tozalandi' });
  } catch (err) { console.error('[ai-clear]', err.message); res.status(500).json({ error: err.message }); }
});

app.get('/api/admin/backup', authMiddleware, (req, res) => {
  try {
    const products = db.prepare('SELECT * FROM products').all();
    const sales = db.prepare('SELECT * FROM sales').all();
    const nasiya = db.prepare('SELECT * FROM nasiya').all();
    const nasiyaPayments = db.prepare('SELECT * FROM nasiya_payments').all();
    const settings = db.prepare('SELECT * FROM admin_settings WHERE key != ?').all('admin_password');

    const backup = {
      version: '1.0',
      created_at: new Date().toISOString(),
      shop_name: 'Savdo Apparati Backup',
      data: {
        products,
        sales: sales.map(s => ({ ...s, items: JSON.parse(s.items) })),
        nasiya,
        nasiya_payments: nasiyaPayments,
        settings
      }
    };

    res.setHeader('Content-Disposition', 'attachment; filename=backup_' + new Date().toISOString().slice(0, 10) + '.json');
    res.setHeader('Content-Type', 'application/json');
    res.json(backup);
  } catch (err) { console.error('[backup]', err.message); res.status(500).json({ error: 'Backup xatolik' }); }
});

app.post('/api/admin/archive-sale', authMiddleware, (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) return res.status(400).json({ error: 'ID lar kiritilmagan' });
    const archiveInsert = db.prepare('INSERT INTO archive (id, source_table, data) VALUES (?, ?, ?)');
    const placeholders = ids.map(() => '?').join(',');
    const rows = db.prepare(`SELECT * FROM sales WHERE id IN (${placeholders})`).all(...ids);
    if (rows.length > 0) archiveInsert.run(uuidv4(), 'sales_daily', JSON.stringify(rows));
    db.prepare(`UPDATE sales SET archived_daily = 1 WHERE id IN (${placeholders})`).run(...ids);
    res.json({ message: `${rows.length} ta sotish arxivlandi`, count: rows.length });
  } catch (err) { console.error('[archive-sale]', err.message); res.status(500).json({ error: err.message }); }
});

app.delete('/api/admin/sales/:id', authMiddleware, (req, res) => {
  try {
    const { id } = req.params;
    const row = db.prepare('SELECT * FROM sales WHERE id = ?').get(id);
    if (!row) return res.status(404).json({ error: 'Sotish topilmadi' });
    db.prepare('INSERT INTO archive (id, source_table, data) VALUES (?, ?, ?)').run(uuidv4(), 'sales_deleted', JSON.stringify([row]));
    db.prepare('DELETE FROM sales WHERE id = ?').run(id);
    res.json({ message: "Sotish o'chirildi" });
  } catch (err) { console.error('[sale-del]', err.message); res.status(500).json({ error: err.message }); }
});

app.delete('/api/admin/bulk-delete', authMiddleware, (req, res) => {
  try {
    const { tables } = req.body;
    if (!tables || !Array.isArray(tables)) return res.status(400).json({ error: 'Jadval nomlari kiritilmagan' });
    const allowed = ['sales', 'ai_chat_history', 'distributions'];
    const archived = [];
    const archiveInsert = db.prepare('INSERT INTO archive (id, source_table, data) VALUES (?, ?, ?)');
    const today = getLocalDate();

    for (const table of tables) {
      if (allowed.includes(table)) {
        try {
          const rows = db.prepare(`SELECT * FROM ${table} WHERE DATE(created_at, '+5 hours') = ?`).all(today);
          if (rows.length > 0) archiveInsert.run(uuidv4(), table + '_manual', JSON.stringify(rows));
          archived.push(table);
        } catch (e) { console.error(`[bulk-delete:${table}]`, e.message); }
      }
    }
    res.json({ message: `${archived.length} ta jadval arxivga saqlandi (ma'lumotlar o'chirilmadi)`, deleted: archived });
  } catch (err) { console.error('[bulk-delete]', err.message); res.status(500).json({ error: err.message }); }
});

app.get('/api/admin/archive', authMiddleware, (req, res) => {
  try {
    const archives = db.prepare('SELECT * FROM archive ORDER BY archived_at DESC').all();
    res.json(archives.map(a => ({ ...a, data: JSON.parse(a.data) })));
  } catch (err) { console.error('[archive-get]', err.message); res.status(500).json({ error: 'Server xatolik' }); }
});

app.get('/api/admin/archive/stats', authMiddleware, (req, res) => {
  try {
    const salesArchive = db.prepare("SELECT COUNT(*) as count FROM archive WHERE source_table IN ('sales', 'sales_daily', 'sales_manual')").get();
    const chatArchive = db.prepare("SELECT COUNT(*) as count FROM archive WHERE source_table = 'ai_chat_history'").get();
    const distArchive = db.prepare("SELECT COUNT(*) as count FROM archive WHERE source_table IN ('distributions', 'distributions_daily', 'distributions_manual')").get();
    res.json({
      salesArchives: salesArchive.count,
      chatArchives: chatArchive.count,
      distArchives: distArchive.count,
      total: salesArchive.count + chatArchive.count + distArchive.count
    });
  } catch (err) { console.error('[archive-stats]', err.message); res.status(500).json({ error: 'Server xatolik' }); }
});

app.delete('/api/admin/archive/:id', authMiddleware, (req, res) => {
  try {
    db.prepare('DELETE FROM archive WHERE id = ?').run(req.params.id);
    res.json({ message: 'Arxiv o\'chirildi' });
  } catch (err) { console.error('[archive-del]', err.message); res.status(500).json({ error: err.message }); }
});

app.delete('/api/admin/archive', authMiddleware, (req, res) => {
  try {
    db.prepare('DELETE FROM archive').run();
    res.json({ message: 'Barcha arxiv tozalandi' });
  } catch (err) { console.error('[archive-del-all]', err.message); res.status(500).json({ error: err.message }); }
});

app.post('/api/admin/restore/:id', authMiddleware, (req, res) => {
  try {
    const item = db.prepare('SELECT * FROM archive WHERE id = ?').get(req.params.id);
    if (!item) return res.status(404).json({ error: 'Arxiv yozuvi topilmadi' });
    const rows = JSON.parse(item.data);
    if (!Array.isArray(rows) || rows.length === 0) return res.status(400).json({ error: 'Arxiv bo\'sh' });

    const base = item.source_table.replace(/_(daily|monthly|manual|full)$/, '');
    let restored = 0;

    if (base === 'sales') {
      const existing = db.prepare('SELECT id FROM sales WHERE id = ?');
      const insert = db.prepare(`INSERT OR IGNORE INTO sales (id, items, total, paid, payment_type, nasiya_id, created_at, archived_daily) VALUES (@id, @items, @total, @paid, @payment_type, @nasiya_id, @created_at, 0)`);
      const unhide = db.prepare('UPDATE sales SET archived_daily = 0 WHERE id = ?');
      for (const r of rows) {
        const items = typeof r.items === 'string' ? r.items : JSON.stringify(r.items || []);
        if (existing.get(r.id)) {
          unhide.run(r.id);
        } else {
          insert.run({
            id: r.id,
            items,
            total: r.total || 0,
            paid: r.paid || 0,
            payment_type: r.payment_type || 'cash',
            nasiya_id: r.nasiya_id || null,
            created_at: r.created_at || new Date().toISOString()
          });
        }
        restored++;
      }
    } else if (base === 'distributions') {
      const insert = db.prepare(`INSERT OR IGNORE INTO distributions (id, client_name, client_phone, product_id, product_name, quantity, unit_price, total_sum, paid_amount, note, created_at) VALUES (@id, @client_name, @client_phone, @product_id, @product_name, @quantity, @unit_price, @total_sum, @paid_amount, @note, @created_at)`);
      for (const r of rows) {
        insert.run({
          id: r.id,
          client_name: r.client_name || '',
          client_phone: r.client_phone || '',
          product_id: r.product_id || null,
          product_name: r.product_name || '',
          quantity: r.quantity || 1,
          unit_price: r.unit_price || 0,
          total_sum: r.total_sum || 0,
          paid_amount: r.paid_amount || 0,
          note: r.note || '',
          created_at: r.created_at || new Date().toISOString()
        });
        restored++;
      }
    } else if (base === 'ai_chat_history') {
      const insert = db.prepare(`INSERT OR IGNORE INTO ai_chat_history (id, role, content, created_at) VALUES (@id, @role, @content, @created_at)`);
      for (const r of rows) {
        insert.run({
          id: r.id,
          role: r.role || 'user',
          content: r.content || '',
          created_at: r.created_at || new Date().toISOString()
        });
        restored++;
      }
    } else {
      return res.status(400).json({ error: 'Bu turdagi arxivni tiklab bo\'lmaydi: ' + item.source_table });
    }

    db.prepare('DELETE FROM archive WHERE id = ?').run(req.params.id);
    res.json({ message: `${restored} ta yozuv tiklandi`, count: restored });
  } catch (err) { console.error('[restore]', err.message); res.status(500).json({ error: err.message }); }
});

app.get('/api/distributions', (req, res) => {
  try {
    const { client, product, date, month } = req.query;
    let query = 'SELECT * FROM distributions';
    const conditions = [];
    const params = [];
    if (client) { conditions.push('client_name LIKE ?'); params.push(`%${client}%`); }
    if (product) { conditions.push('product_name LIKE ?'); params.push(`%${product}%`); }
    if (date) { conditions.push("DATE(created_at, '+5 hours') = ?"); params.push(date); }
    if (month) { conditions.push("strftime('%Y-%m', created_at, '+5 hours') = ?"); params.push(month); }
    if (conditions.length > 0) query += ' WHERE ' + conditions.join(' AND ');
    query += ' ORDER BY created_at DESC';
    res.json(db.prepare(query).all(...params));
  } catch (err) { console.error('[distributions-get]', err.message); res.status(500).json({ error: 'Server xatolik' }); }
});

app.get('/api/distributions/stats', (req, res) => {
  try {
    const today = getLocalDate();
    const month = getLocalMonth();
    const todayStats = db.prepare("SELECT COUNT(*) as count, COALESCE(SUM(total_sum),0) as totalSum, COALESCE(SUM(paid_amount),0) as totalPaid FROM distributions WHERE DATE(created_at, '+5 hours') = ?").get(today);
    const monthStats = db.prepare("SELECT COUNT(*) as count, COALESCE(SUM(total_sum),0) as totalSum, COALESCE(SUM(paid_amount),0) as totalPaid FROM distributions WHERE strftime('%Y-%m', created_at, '+5 hours') = ?").get(month);
    const allStats = db.prepare("SELECT COUNT(*) as count, COALESCE(SUM(total_sum),0) as totalSum, COALESCE(SUM(paid_amount),0) as totalPaid FROM distributions").get();
    const unpaidStats = db.prepare("SELECT COUNT(*) as count, COALESCE(SUM(total_sum - paid_amount),0) as totalDebt FROM distributions WHERE paid_amount < total_sum").get();
    const topClients = db.prepare("SELECT client_name, client_phone, SUM(total_sum) as totalSum, SUM(paid_amount) as totalPaid, COUNT(*) as orderCount FROM distributions GROUP BY client_name, client_phone ORDER BY totalSum DESC LIMIT 5").all();
    const recentDists = db.prepare("SELECT * FROM distributions ORDER BY created_at DESC LIMIT 5").all();
    res.json({
      today: { count: todayStats.count, totalSum: todayStats.totalSum, totalPaid: todayStats.totalPaid },
      month: { count: monthStats.count, totalSum: monthStats.totalSum, totalPaid: monthStats.totalPaid },
      all: { count: allStats.count, totalSum: allStats.totalSum, totalPaid: allStats.totalPaid },
      unpaid: { count: unpaidStats.count, totalDebt: unpaidStats.totalDebt },
      topClients,
      recentDists
    });
  } catch (err) { console.error('[dist-stats]', err.message); res.status(500).json({ error: 'Server xatolik' }); }
});

app.get('/api/distributions/clients', (req, res) => {
  try {
    const clients = db.prepare("SELECT client_name, client_phone, SUM(total_sum) as totalSum, SUM(paid_amount) as totalPaid, SUM(total_sum - paid_amount) as debt, COUNT(*) as orderCount FROM distributions GROUP BY client_name, client_phone ORDER BY totalSum DESC").all();
    res.json(clients);
  } catch (err) { console.error('[dist-clients]', err.message); res.status(500).json({ error: 'Server xatolik' }); }
});

app.post('/api/distributions', (req, res) => {
  try {
    const { client_name, client_phone, product_id, product_name, quantity, unit_price, paid_amount, note } = req.body;
    if (!client_name || !product_name) return res.status(400).json({ error: 'Mijoz va mahsulot nomi kiritilishi shart' });
    const id = uuidv4();
    const total_sum = (Number(quantity) || 1) * (Number(unit_price) || 0);
    db.prepare('INSERT INTO distributions (id, client_name, client_phone, product_id, product_name, quantity, unit_price, total_sum, paid_amount, note) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(
      id, client_name, client_phone || '', product_id || null, product_name, Number(quantity) || 1, Number(unit_price) || 0, total_sum, Number(paid_amount) || 0, note || ''
    );
    if (product_id) {
      db.prepare('UPDATE products SET stock = stock - ? WHERE id = ?').run(Number(quantity) || 1, product_id);
    }
    res.json({ id, message: "Tarqatish qo'shildi" });
  } catch (err) { console.error('[dist-post]', err.message); res.status(500).json({ error: err.message }); }
});

app.put('/api/distributions/:id', authMiddleware, (req, res) => {
  try {
    const { client_name, client_phone, product_name, quantity, unit_price, paid_amount, note } = req.body;
    const old = db.prepare('SELECT * FROM distributions WHERE id = ?').get(req.params.id);
    if (!old) return res.status(404).json({ error: 'Topilmadi' });
    const total_sum = (Number(quantity) || 1) * (Number(unit_price) || 0);
    db.prepare('UPDATE distributions SET client_name=?, client_phone=?, product_name=?, quantity=?, unit_price=?, total_sum=?, paid_amount=?, note=? WHERE id=?').run(
      client_name, client_phone || '', product_name, Number(quantity) || 1, Number(unit_price) || 0, total_sum, Number(paid_amount) || 0, note || '', req.params.id
    );
    if (old.product_id && old.product_id !== 'null') {
      db.prepare('UPDATE products SET stock = stock + ? WHERE id = ?').run(old.quantity, old.product_id);
      db.prepare('UPDATE products SET stock = stock - ? WHERE id = ?').run(Number(quantity) || 1, old.product_id);
    }
    res.json({ message: 'Tarqatish yangilandi' });
  } catch (err) { console.error('[dist-put]', err.message); res.status(500).json({ error: err.message }); }
});

app.delete('/api/distributions/:id', authMiddleware, (req, res) => {
  try {
    const dist = db.prepare('SELECT * FROM distributions WHERE id = ?').get(req.params.id);
    if (dist && dist.product_id) {
      db.prepare('UPDATE products SET stock = stock + ? WHERE id = ?').run(dist.quantity, dist.product_id);
    }
    db.prepare('DELETE FROM distributions WHERE id = ?').run(req.params.id);
    res.json({ message: "Tarqatish o'chirildi" });
  } catch (err) { console.error('[dist-del]', err.message); res.status(500).json({ error: err.message }); }
});

app.delete('/api/distributions', authMiddleware, (req, res) => {
  try {
    const rows = db.prepare('SELECT * FROM distributions').all();
    if (rows.length > 0) {
      db.prepare('INSERT INTO archive (id, source_table, data) VALUES (?, ?, ?)').run(uuidv4(), 'distributions_manual', JSON.stringify(rows));
    }
    db.prepare('DELETE FROM distributions').run();
    res.json({ message: "Barcha tarqatishlar arxivga saqlanib tozalandi" });
  } catch (err) { console.error('[dist-del-all]', err.message); res.status(500).json({ error: err.message }); }
});

app.post('/api/upload/image', authMiddleware, (req, res) => {
  try {
    const { image, filename } = req.body;
    if (!image) return res.status(400).json({ error: 'Rasm yuborilmadi' });
    const base64Data = image.replace(/^data:image\/\w+;base64,/, '');
    const ext = filename ? path.extname(filename) : '.jpg';
    const name = uuidv4() + ext;
    const filePath = path.join(uploadsDir, name);
    fs.writeFileSync(filePath, base64Data, 'base64');
    const url = `/uploads/${name}`;
    res.json({ url });
  } catch (err) { console.error('[upload]', err.message); res.status(500).json({ error: 'Rasm yuklashda xatolik' }); }
});

function performAutoArchive() {
  const archiveInsert = db.prepare('INSERT INTO archive (id, source_table, data) VALUES (?, ?, ?)');
  let archivedCount = 0;
  const today = getLocalDate();
  const tables = [
    { name: 'sales', where: "DATE(created_at, '+5 hours') = ?" },
    { name: 'ai_chat_history', where: "DATE(created_at, '+5 hours') = ?" },
    { name: 'distributions', where: "DATE(created_at, '+5 hours') = ?" }
  ];
  for (const t of tables) {
    try {
      const rows = db.prepare(`SELECT * FROM ${t.name} WHERE ${t.where}`).all(today);
      if (rows.length > 0) {
        archiveInsert.run(uuidv4(), t.name + '_daily', JSON.stringify(rows));
        archivedCount += rows.length;
      }
    } catch (e) { console.error(`[auto-archive:${t.name}]`, e.message); }
  }
  return archivedCount;
}

app.post('/api/admin/auto-archive', authMiddleware, (req, res) => {
  try {
    const count = performAutoArchive();
    res.json({ message: `${count} ta yozuv arxivga saqlandi (ma'lumotlar saqlanib qoldi, hech narsa o'chirilmadi)`, count });
  } catch (err) { console.error('[auto-archive]', err.message); res.status(500).json({ error: err.message }); }
});

function cleanAllData() {
  const archiveInsert = db.prepare('INSERT INTO archive (id, source_table, data) VALUES (?, ?, ?)');
  let archivedCount = 0;
  const tables = [{ name: 'sales' }, { name: 'ai_chat_history' }, { name: 'distributions' }];
  for (const t of tables) {
    try {
      const rows = db.prepare(`SELECT * FROM ${t.name}`).all();
      if (rows.length > 0) {
        archiveInsert.run(uuidv4(), t.name + '_full', JSON.stringify(rows));
        db.prepare(`DELETE FROM ${t.name}`).run();
        archivedCount += rows.length;
      }
    } catch (e) { console.error(`[clean-all:${t.name}]`, e.message); }
  }
  return archivedCount;
}

app.post('/api/admin/clean-all', authMiddleware, (req, res) => {
  try {
    const count = cleanAllData();
    res.json({ message: `${count} ta yozuv arxivlandi va faol ro'yxatdan o'chirildi`, count });
  } catch (err) { console.error('[clean-all]', err.message); res.status(500).json({ error: err.message }); }
});

function cleanTodayData() {
  const archiveInsert = db.prepare('INSERT INTO archive (id, source_table, data) VALUES (?, ?, ?)');
  let archivedCount = 0;
  const today = getLocalDate();
  const tables = [{ name: 'sales' }, { name: 'ai_chat_history' }, { name: 'distributions' }];
  for (const t of tables) {
    try {
      const rows = db.prepare(`SELECT * FROM ${t.name} WHERE DATE(created_at, '+5 hours') = ?`).all(today);
      if (rows.length > 0) {
        archiveInsert.run(uuidv4(), t.name + '_daily', JSON.stringify(rows));
        db.prepare(`DELETE FROM ${t.name} WHERE DATE(created_at, '+5 hours') = ?`).run(today);
        archivedCount += rows.length;
      }
    } catch (e) { console.error(`[clean-daily:${t.name}]`, e.message); }
  }
  return archivedCount;
}

app.post('/api/admin/clean-daily', authMiddleware, (req, res) => {
  try {
    const count = cleanTodayData();
    res.json({ message: `${count} ta bugungi yozuv arxivlandi va faol ro'yxatdan o'chirildi`, count });
  } catch (err) { console.error('[clean-daily]', err.message); res.status(500).json({ error: err.message }); }
});

app.post('/api/admin/archive-daily-sale', authMiddleware, (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) return res.status(400).json({ error: 'ID lar kiritilmagan' });
    const archiveInsert = db.prepare('INSERT INTO archive (id, source_table, data) VALUES (?, ?, ?)');
    const placeholders = ids.map(() => '?').join(',');
    const rows = db.prepare(`SELECT * FROM sales WHERE id IN (${placeholders})`).all(...ids);
    if (rows.length > 0) archiveInsert.run(uuidv4(), 'sales_daily', JSON.stringify(rows));
    db.prepare(`UPDATE sales SET archived_daily = 1 WHERE id IN (${placeholders})`).run(...ids);
    res.json({ message: `${rows.length} ta sotish kunlik arxivlandi`, count: rows.length });
  } catch (err) { console.error('[archive-daily-sale]', err.message); res.status(500).json({ error: err.message }); }
});

function cleanMonthData() {
  const archiveInsert = db.prepare('INSERT INTO archive (id, source_table, data) VALUES (?, ?, ?)');
  let archivedCount = 0;
  const month = getLocalMonth();
  const tables = [{ name: 'sales' }, { name: 'ai_chat_history' }, { name: 'distributions' }];
  for (const t of tables) {
    try {
      const rows = db.prepare(`SELECT * FROM ${t.name} WHERE strftime('%Y-%m', created_at, '+5 hours') = ?`).all(month);
      if (rows.length > 0) {
        archiveInsert.run(uuidv4(), t.name + '_monthly', JSON.stringify(rows));
        db.prepare(`DELETE FROM ${t.name} WHERE strftime('%Y-%m', created_at, '+5 hours') = ?`).run(month);
        archivedCount += rows.length;
      }
    } catch (e) { console.error(`[clean-monthly:${t.name}]`, e.message); }
  }
  return archivedCount;
}

app.post('/api/admin/clean-monthly', authMiddleware, (req, res) => {
  try {
    const count = cleanMonthData();
    res.json({ message: `${count} ta oylik yozuv arxivlandi va faol ro'yxatdan o'chirildi`, count });
  } catch (err) { console.error('[clean-monthly]', err.message); res.status(500).json({ error: err.message }); }
});

app.get('/api/admin/low-stock', authMiddleware, (req, res) => {
  try {
    const low = db.prepare('SELECT id, name, barcode, product_code, stock, price, category FROM products WHERE stock < 50 ORDER BY stock ASC').all();
    res.json(low);
  } catch (err) { console.error('[low-stock]', err.message); res.status(500).json({ error: 'Server xatolik' }); }
});

app.get('/api/admin/stats', authMiddleware, (req, res) => {
  try {
    const today = getLocalDate();
    const products = db.prepare('SELECT COUNT(*) as count FROM products').get();
    const sales = db.prepare('SELECT COUNT(*) as count FROM sales').get();
    const nasiya = db.prepare('SELECT COUNT(*) as count FROM nasiya').get();
    const nasiyaActive = db.prepare('SELECT COUNT(*) as count FROM nasiya WHERE status = ?').get('active');
    const todaySales = db.prepare("SELECT SUM(total) as total FROM sales WHERE DATE(created_at, '+5 hours') = ? AND archived_daily = 0").get(today);
    const todayCount = db.prepare("SELECT COUNT(*) as count FROM sales WHERE DATE(created_at, '+5 hours') = ? AND archived_daily = 0").get(today);
    const totalDebt = db.prepare('SELECT SUM(total_debt - paid_amount) as total FROM nasiya WHERE status = ?').get('active');
    const dbSize = fs.statSync(path.join(__dirname, 'shop.db')).size;

    res.json({
      products: products.count,
      totalSales: sales.count,
      nasiyaTotal: nasiya.count,
      nasiyaActive: nasiyaActive.count,
      todayRevenue: todaySales.total || 0,
      todayCount: todayCount.count || 0,
      totalDebt: totalDebt.total || 0,
      dbSize: (dbSize / 1024).toFixed(1) + ' KB',
      uptime: (process.uptime() / 3600).toFixed(1) + ' soat',
      nodeVersion: process.version,
      platform: os.platform()
    });
  } catch (err) { console.error('[admin-stats]', err.message); res.status(500).json({ error: 'Statistika xatolik' }); }
});

function computeShiftStats(shift) {
  const end = shift.closed_at || getNowUtc();
  const cash = db.prepare("SELECT COALESCE(SUM(paid),0) as total, COUNT(*) as count FROM sales WHERE payment_type='cash' AND created_at >= ? AND created_at < ? AND archived_daily = 0").get(shift.opened_at, end);
  const card = db.prepare("SELECT COALESCE(SUM(paid),0) as total, COUNT(*) as count FROM sales WHERE payment_type='card' AND created_at >= ? AND created_at < ? AND archived_daily = 0").get(shift.opened_at, end);
  const nasiya = db.prepare("SELECT COALESCE(SUM(total-paid),0) as total, COUNT(*) as count FROM sales WHERE payment_type='nasiya' AND created_at >= ? AND created_at < ? AND archived_daily = 0").get(shift.opened_at, end);
  const nasiyaPaid = db.prepare("SELECT COALESCE(SUM(amount),0) as total, COUNT(*) as count FROM nasiya_payments WHERE created_at >= ? AND created_at < ?").get(shift.opened_at, end);
  const salesCount = db.prepare("SELECT COUNT(*) as count FROM sales WHERE created_at >= ? AND created_at < ? AND archived_daily = 0").get(shift.opened_at, end);
  const expected = (shift.opening_balance || 0) + cash.total + nasiyaPaid.total;
  const actual = shift.closing_balance != null ? shift.closing_balance : null;
  return {
    cash: cash.total,
    cashCount: cash.count,
    card: card.total,
    cardCount: card.count,
    nasiyaSales: nasiya.total,
    nasiyaCount: nasiya.count,
    nasiyaPayments: nasiyaPaid.total,
    nasiyaPaymentsCount: nasiyaPaid.count,
    salesCount: salesCount.count,
    expected,
    actual,
    diff: actual != null ? actual - expected : null
  };
}

function getNowUtc() {
  return new Date().toISOString().slice(0, 19).replace('T', ' ');
}

app.get('/api/kassa', (req, res) => {
  try {
    const shifts = db.prepare('SELECT * FROM cash_registers ORDER BY opened_at DESC').all();
    res.json(shifts.map(s => ({ ...s, stats: computeShiftStats(s) })));
  } catch (err) { console.error('[kassa]', err.message); res.status(500).json({ error: 'Server xatolik' }); }
});

app.get('/api/kassa/current', (req, res) => {
  try {
    const shift = db.prepare("SELECT * FROM cash_registers WHERE status = 'open' ORDER BY opened_at DESC LIMIT 1").get();
    if (!shift) return res.json(null);
    res.json({ ...shift, stats: computeShiftStats(shift) });
  } catch (err) { console.error('[kassa-current]', err.message); res.status(500).json({ error: 'Server xatolik' }); }
});

app.post('/api/kassa/open', authMiddleware, (req, res) => {
  try {
    const { opening_balance, note } = req.body;
    const existing = db.prepare("SELECT id FROM cash_registers WHERE status = 'open'").get();
    if (existing) return res.status(400).json({ error: 'Kassa allaqachon ochiq. Avval yopish kerak.' });
    const balance = Number(opening_balance) || 0;
    if (balance < 0) return res.status(400).json({ error: 'Boshlang\'ich summa manfiy bo\'lishi mumkin emas' });
    const id = uuidv4();
    db.prepare('INSERT INTO cash_registers (id, opening_balance, note) VALUES (?, ?, ?)').run(id, balance, note || '');
    const shift = db.prepare('SELECT * FROM cash_registers WHERE id = ?').get(id);
    res.json({ shift: { ...shift, stats: computeShiftStats(shift) }, message: 'Kassa ochildi' });
  } catch (err) { console.error('[kassa-open]', err.message); res.status(500).json({ error: err.message }); }
});

app.post('/api/kassa/close', authMiddleware, (req, res) => {
  try {
    const { closing_balance, note } = req.body;
    const shift = db.prepare("SELECT * FROM cash_registers WHERE status = 'open' ORDER BY opened_at DESC LIMIT 1").get();
    if (!shift) return res.status(400).json({ error: 'Ochiq kassa topilmadi' });
    const actual = Number(closing_balance);
    if (actual === null || isNaN(actual) || actual < 0) return res.status(400).json({ error: 'Yopish balansini kiriting' });
    db.prepare("UPDATE cash_registers SET closing_balance = ?, note = ?, status = 'closed', closed_at = CURRENT_TIMESTAMP WHERE id = ?").run(
      actual, note || shift.note || '', shift.id
    );
    const updated = db.prepare('SELECT * FROM cash_registers WHERE id = ?').get(shift.id);
    res.json({ shift: { ...updated, stats: computeShiftStats(updated) }, message: 'Kassa yopildi' });
  } catch (err) { console.error('[kassa-close]', err.message); res.status(500).json({ error: err.message }); }
});

app.use((err, req, res, _next) => {
  console.error('[EXPRESS ERROR]', err.message || err);
  if (!res.headersSent) {
    res.status(500).json({ error: 'Server xatolik' });
  }
});

const server = app.listen(PORT, () => {
  console.log(`[SERVER] ${PORT}-portda ishga tushdi — ${new Date().toLocaleString('uz-UZ')}`);
});

function gracefulShutdown(signal) {
  console.log(`[SERVER] ${signal} olishdi, tozalanmoqda...`);
  server.close(() => {
    try { db.close(); } catch {}
    process.exit(0);
  });
  setTimeout(() => { try { db.close(); } catch {} process.exit(1); }, 5000);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
