const Database = require('better-sqlite3');
const db = new Database('server/shop.db');
const t = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='cash_registers'").get();
console.log('TABLE:', t ? t.name : 'MISSING');
if (t) console.log('COLS:', db.prepare('PRAGMA table_info(cash_registers)').all().map(c => c.name).join(', '));
db.close();