const Database = require('better-sqlite3');
const db = new Database('shop.db', { readonly: true });
const arch = db.prepare('SELECT id, source_table, data, archived_at FROM archive ORDER BY archived_at DESC').all();
console.log('ALL ARCHIVE:', arch.length);
arch.forEach(a => {
  let rows;
  try { rows = JSON.parse(a.data); } catch { rows = [a.data]; }
  const arr = Array.isArray(rows) ? rows : [rows];
  arr.forEach(r => {
    console.log(a.source_table, '|', a.archived_at, '| type:', r.payment_type || r.nasiya_id ? 'sale' : '?', '| nasiya_id:', (r.nasiya_id||'').slice(0,12) || '-', '| total:', r.total, '| items:', String(r.items || r.client_name || '').slice(0,80));
  });
});
console.log('\nALL TABLES:');
const tabs = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
console.log(tabs.map(t => t.name).join(', '));