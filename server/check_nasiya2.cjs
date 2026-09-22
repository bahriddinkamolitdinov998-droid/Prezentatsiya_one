const Database = require('better-sqlite3');
const db = new Database('shop.db', { readonly: true });
const nasiya = db.prepare('SELECT id, customer_name, total_debt, paid_amount, status, created_at FROM nasiya').all();
console.log('TOTAL NASIYA:', nasiya.length);
for (const n of nasiya.slice(0, 20)) {
  const salesCount = db.prepare('SELECT COUNT(*) c FROM sales WHERE nasiya_id = ?').get(n.id).c;
  console.log(n.customer_name, '| debt:', n.total_debt, 'paid:', n.paid_amount, 'status:', n.status, '| linkedSales:', salesCount);
}
const nasiyaSales = db.prepare("SELECT id, items, total, paid, payment_type, nasiya_id, created_at FROM sales WHERE payment_type = 'nasiya'").all();
console.log('\nSALES with payment_type=nasiya:', nasiyaSales.length);
nasiyaSales.forEach(s => console.log(' ', s.id.slice(0,8), 'nasiya_id:', (s.nasiya_id||'NULL').slice(0,8), 'total:', s.total, 'items:', s.items.slice(0,80)));
const payments = db.prepare('SELECT nasiya_id, amount, note, created_at FROM nasiya_payments').all();
console.log('\nNASIYA PAYMENTS:', payments.length);
const P = db.prepare('SELECT customer_name FROM nasiya WHERE id = ?');
payments.forEach(p => {
  const row = P.get(p.nasiya_id);
  console.log(' ', row ? row.customer_name : p.nasiya_id, '| amount:', p.amount, '| date:', p.created_at);
});