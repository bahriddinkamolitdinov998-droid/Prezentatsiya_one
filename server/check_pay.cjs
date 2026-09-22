const Database = require('better-sqlite3');
const db = new Database('shop.db', { readonly: true });
const P = db.prepare('SELECT p.amount, p.note, p.created_at FROM nasiya_payments p JOIN nasiya n ON n.id = p.nasiya_id WHERE n.customer_name = ?');
const rows = P.all('Muhammadali');
console.log(JSON.stringify(rows, null, 2));
const admin = db.prepare('SELECT key, value FROM admin_settings').all();
console.log('ADMIN SETTINGS KEYS:', admin.map(a => a.key).join(', '));