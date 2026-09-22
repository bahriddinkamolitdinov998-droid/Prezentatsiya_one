const Database = require('better-sqlite3');
const db = new Database('shop.db', { readonly: true });
const nasiya = db.prepare("SELECT id, customer_name, total_debt, paid_amount, status FROM nasiya WHERE customer_name LIKE '%Muhammadali%' OR customer_name LIKE '%Muhammad%'").all();
console.log('NASIYA:', JSON.stringify(nasiya, null, 2));
for (const n of nasiya) {
  const sales = db.prepare('SELECT id, items, total, paid, payment_type, created_at FROM sales WHERE nasiya_id = ?').all(n.id);
  console.log('SALES for', n.customer_name, ':', JSON.stringify(sales, null, 2).slice(0, 600));
  const arch = db.prepare("SELECT source_table, data FROM archive WHERE source_table LIKE '%sales%'").all();
  const linked = [];
  for (const a of arch) {
    try {
      const rows = JSON.parse(a.data);
      if (Array.isArray(rows)) rows.forEach(r => { if (r.nasiya_id === n.id) linked.push({ ...r, src: a.source_table }); });
    } catch {}
  }
  console.log('ARCHIVED LINKED for', n.customer_name, ': count =', linked.length);
  linked.forEach(l => console.log('  ', JSON.stringify({ src: l.src, id: l.id, items: l.items, total: l.total, created_at: l.created_at }).slice(0, 300)));
}