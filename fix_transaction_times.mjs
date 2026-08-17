import mysql from 'mysql2/promise';
import fs from 'fs';

// Read .env manually
let dbConfig = {
  host: '127.0.0.1',
  user: 'erpbarokah_app',
  password: 'f792f7a3a264d5fa7bfcdcc65bde36d338ede532b917b50c',
  database: 'mris_db'
};

try {
  if (fs.existsSync('.env')) {
    const envLines = fs.readFileSync('.env', 'utf8').split('\n');
    envLines.forEach(line => {
      const parts = line.split('=');
      if (parts.length >= 2) {
        const k = parts[0].trim();
        const v = parts.slice(1).join('=').trim();
        if (k === 'MYSQL_HOST') dbConfig.host = v;
        if (k === 'MYSQL_USER') dbConfig.user = v;
        if (k === 'MYSQL_PASSWORD') dbConfig.password = v;
        if (k === 'MYSQL_DATABASE') dbConfig.database = v;
      }
    });
  }
} catch (e) {}

function recoverTime(txId, rawDate) {
  if (!txId || typeof txId !== 'string' || !txId.startsWith('TX-POS-')) return null;
  const suffix = txId.replace('TX-POS-', '').trim();
  if (!/^[0-9]+$/.test(suffix) || suffix.length < 6) return null;

  let y, m, d;
  if (rawDate instanceof Date) {
    y = rawDate.getFullYear();
    m = String(rawDate.getMonth() + 1).padStart(2, '0');
    d = String(rawDate.getDate()).padStart(2, '0');
  } else {
    const dStr = String(rawDate || '2026-08-17').substring(0, 10);
    const parts = dStr.split('-');
    y = parseInt(parts[0]);
    m = parts[1];
    d = parts[2];
  }
  const dateStr = `${y}-${m}-${d}`;
  const dayStartMs = new Date(`${dateStr}T00:00:00+07:00`).getTime();
  const dayEndMs = dayStartMs + 24 * 3600 * 1000;

  const prefixLen = 13 - suffix.length;
  const minPrefix = parseInt(String(dayStartMs).slice(0, prefixLen)) - 1;
  const maxPrefix = parseInt(String(dayEndMs).slice(0, prefixLen)) + 1;

  for (let p = minPrefix; p <= maxPrefix; p++) {
    const candMs = parseInt(String(p) + suffix);
    if (candMs >= dayStartMs - 7200000 && candMs <= dayEndMs + 7200000) {
      const dt = new Date(candMs);
      const hours = String((dt.getUTCHours() + 7) % 24).padStart(2, '0');
      const minutes = String(dt.getUTCMinutes()).padStart(2, '0');
      const seconds = String(dt.getUTCSeconds()).padStart(2, '0');
      return `${hours}:${minutes}:${seconds}`;
    }
  }
  return null;
}

async function main() {
  console.log('Connecting to MySQL with user:', dbConfig.user);
  const pool = await mysql.createPool({
    host: dbConfig.host,
    user: dbConfig.user,
    password: dbConfig.password,
    database: dbConfig.database,
    waitForConnections: true,
    connectionLimit: 10,
    dateStrings: true
  });

  // 1. Periksa data di sales_transactions
  const [rows] = await pool.execute('SELECT id, date, time FROM sales_transactions WHERE time LIKE "00:00:%" OR time = "00:00:00" OR time IS NULL ORDER BY id DESC');
  console.log(`Found ${rows.length} transactions with time like 00:00:xx in MySQL`);

  let updatedCount = 0;
  for (const r of rows) {
    const accurateTime = recoverTime(r.id, r.date);
    if (accurateTime) {
      await pool.execute('UPDATE sales_transactions SET time = ? WHERE id = ?', [accurateTime, r.id]);
      updatedCount++;
      if (updatedCount <= 10) {
        console.log(`Updated ${r.id} (${r.date}): ${r.time} -> ${accurateTime}`);
      }
    }
  }
  console.log(`Successfully updated ${updatedCount} rows in sales_transactions table!`);

  // 2. Periksa & update JSON blob di mris_master_data
  const [blobRows] = await pool.execute('SELECT id, data FROM mris_master_data WHERE id = 1');
  if (blobRows && blobRows.length > 0 && blobRows[0].data) {
    const masterData = typeof blobRows[0].data === 'string' ? JSON.parse(blobRows[0].data) : blobRows[0].data;
    let blobUpdated = 0;

    ['salesTransactions', 'transactions', 'outletTransactions'].forEach(k => {
      if (Array.isArray(masterData[k])) {
        masterData[k] = masterData[k].map(t => {
          if (!t) return t;
          const currentT = String(t.time || '');
          if (currentT.startsWith('00:00:') || currentT === '00:00:00' || !currentT) {
            const acc = recoverTime(t.id || t.receipt_no, t.date);
            if (acc) {
              blobUpdated++;
              return { ...t, time: acc };
            }
          }
          return t;
        });
      }
    });

    if (blobUpdated > 0) {
      masterData._lastUpdated = Date.now();
      const updatedJson = JSON.stringify(masterData);
      await pool.execute('UPDATE mris_master_data SET data = ?, updated_at = CURRENT_TIMESTAMP WHERE id = 1', [updatedJson]);
      console.log(`Updated ${blobUpdated} transaction time entries in mris_master_data JSON blob!`);
    }
  }

  await pool.end();
}

main().catch(console.error);
