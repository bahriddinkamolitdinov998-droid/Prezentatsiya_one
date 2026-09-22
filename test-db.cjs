const Database = require('better-sqlite3');
const path = require('path');
const db = new Database(path.join(__dirname, 'server', 'shop.db'));

try {
  const sales = db.prepare("SELECT * FROM sales WHERE strftime('%Y-%m', created_at, '+5 hours') = ?").all('2026-07');
  console.log('Sales count:', sales.length);
  for (const sale of sales) {
    const items = JSON.parse(sale.items);
    console.log('Sale:', sale.id, 'Total:', sale.total, 'Items:', items.length);
    for (const item of items) {
      const product = db.prepare('SELECT cost FROM products WHERE id = ?').get(item.id);
      console.log('  Item:', item.id, 'Price:', item.price, 'Cost:', product ? product.cost : 'NOT FOUND', 'Qty:', item.quantity);
    }
  }
} catch(e) {
  console.error('Monthly query error:', e.message);
}

try {
  const nasiyaList = db.prepare('SELECT * FROM nasiya WHERE status = ?').all('active');
  const totalNasiyaDebt = nasiyaList.reduce((sum, n) => sum + (n.total_debt - n.paid_amount), 0);
  console.log('Nasiya debt:', totalNasiyaDebt);
} catch(e) {
  console.error('Nasiya query error:', e.message);
}

db.close();
