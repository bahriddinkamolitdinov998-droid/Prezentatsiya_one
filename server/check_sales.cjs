const Database = require('better-sqlite3');
const db = new Database('shop.db', { readonly: true });
const all = db.prepare('SELECT id, items, total, paid, payment_type, nasiya_id, created_at FROM sales ORDER BY created_at DESC').all();
console.log('TOTAL SALES:', all.length);
all.slice(0, 30).forEach(s => {
  console.log(s.id.slice(0,8), '| type:', s.payment_type, '| nasiya:', (s.nasiya_id||'').slice(0,8) || '-', '| total:', s.total, '| date:', s.created_at, '| items:', String(s.items).slice(0,60));
});
const arch = db.prepare("SELECT source_table, data FROM archive WHERE source_table LIKE '%sales%'").all();
console.log('\nARCHIVE ROWS:', arch.length);
arch.forEach(a => {
  try {
    const rows = JSON.parse(a.data);
    rows.forEach(r => {
      console.log(a.source_table, '| type:', r.payment_type, '| nasiya:', (r.nasiya_id||'').slice(0,8) || '-', '| total:', r.total, '| date:', r.created_at, '| items:', String(r.items).slice(0,60));
    });
  } catch {}
});
const arch2 = db.prepare("SELECT COUNT(*) c FROM archive").get();
console.log('\nTOTAL ARCHIVE ROWS:', arch2.c);