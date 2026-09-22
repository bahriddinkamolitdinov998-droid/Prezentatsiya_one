const Database = require('better-sqlite3');
const db = new Database('shop.db', { readonly: true });

// ALL sales (current + archived) that mention Muhammadali's nasiya_id
const muhammedaliId = '8e991e42-d10f-4f17-9d93-71ee856bd49a';

const allSales = db.prepare('SELECT id, items, total, paid, payment_type, nasiya_id, created_at FROM sales').all();
console.log('All sales:', allSales.length);
allSales.forEach(s => console.log('  ', s.id, 'nasiya_id:', s.nasiya_id, 'type:', s.payment_type, 'total:', s.total));

const allArch = db.prepare('SELECT id, source_table, data FROM archive').all();
console.log('\nAll archive entries:', allArch.length);
allArch.forEach(a => {
  const data = JSON.parse(a.data);
  if (Array.isArray(data)) {
    data.forEach((r, i) => {
      if (r.nasiya_id || r.customer_name?.includes('Muhammadali')) {
        console.log('  FOUND in', a.source_table, '[', i, ']:', JSON.stringify(r).slice(0, 200));
      }
    });
  }
});

// Also check payments
const payments = db.prepare('SELECT nasiya_id, amount, created_at FROM nasiya_payments WHERE nasiya_id = ?').all(muhammedaliId);
console.log('\nPayments for Muhammadali:', payments.length, 'total:', payments.reduce((s, p) => s + p.amount, 0));

// Check if there's any way to recover product data - maybe the nasiya was created from a sale that was then archived and then cleared?
console.log('\nAll products:', db.prepare('SELECT id, name, price, stock FROM products').all());
