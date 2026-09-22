const Database = require('better-sqlite3');
const path = require('path');
const db = new Database(path.join(__dirname, 'server', 'shop.db'));
console.log('Products:', db.prepare('SELECT COUNT(*) as c FROM products').get().c);
console.log('Sales:', db.prepare('SELECT COUNT(*) as c FROM sales').get().c);
console.log('Archive:', db.prepare('SELECT COUNT(*) as c FROM archive').get().c);
console.log('Integrity:', db.pragma('integrity_check')[0]);
db.close();
