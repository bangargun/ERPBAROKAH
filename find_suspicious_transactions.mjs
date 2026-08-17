import mysql from 'mysql2/promise';
import fs from 'fs';

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

async function runSuspiciousAudit() {
  const pool = await mysql.createPool({
    host: dbConfig.host,
    user: dbConfig.user,
    password: dbConfig.password,
    database: dbConfig.database,
    dateStrings: true
  });

  console.log('========================================================================================');
  console.log('🔍 AUDIT FORENSIK: DETEKSI TRANSAKSI MENCURIGAKAN / POTENSI SALAH INPUT (17 AGUSTUS 2026)');
  console.log('========================================================================================\n');

  // Ambil semua transaksi tanggal 17 Agustus 2026
  const [txs] = await pool.execute(`
    SELECT 
      id, receipt_no, date, time, branch_name, customer_name, table_number, order_type, 
      subtotal, amount, payment_method, cashier, notes
    FROM sales_transactions
    WHERE date = '2026-08-17'
    ORDER BY branch_name ASC, time ASC, id ASC
  `);

  console.log(`Total transaksi 17 Agustus: ${txs.length} transaksi\n`);

  // 1. CEK TRANSAKSI NAMA PELANGGAN / MEJA SAMA DALAM WAKTU BERDEKATAN (< 5 MENIT)
  console.log('--- 1. TRANSAKSI DENGAN NAMA PELANGGAN / MEJA SAMA DALAM WAKTU SINGKAT (< 5 Menit) ---');
  const sameCustomerClusters = [];
  for (let i = 0; i < txs.length - 1; i++) {
    for (let j = i + 1; j < txs.length; j++) {
      const a = txs[i];
      const b = txs[j];
      if (a.branch_name !== b.branch_name) continue;

      const custA = String(a.customer_name || '').trim().toLowerCase();
      const custB = String(b.customer_name || '').trim().toLowerCase();

      // Abaikan 'pelanggan umum' untuk pencocokan nama saja, tapi periksa jika nominal dan meja sama
      const isNamed = custA && custA !== 'pelanggan umum' && custA !== 'guest' && custA !== '-';
      const isSameName = isNamed && custA === custB;
      const isSameTable = a.table_number && a.table_number !== 'N/A' && a.table_number === b.table_number;

      if (isSameName || isSameTable) {
        // Hitung selisih waktu dalam detik
        const timeToSec = (tStr) => {
          if (!tStr) return 0;
          const [h, m, s] = tStr.split(':').map(Number);
          return (h || 0) * 3600 + (m || 0) * 60 + (s || 0);
        };
        const secDiff = Math.abs(timeToSec(a.time) - timeToSec(b.time));
        if (secDiff <= 600) { // dalam 10 menit
          sameCustomerClusters.push({
            cabang: a.branch_name,
            pelanggan: a.customer_name,
            meja: a.table_number || '-',
            tx1_id: a.id,
            tx1_time: a.time,
            tx1_amount: Number(a.amount),
            tx1_pay: a.payment_method,
            tx2_id: b.id,
            tx2_time: b.time,
            tx2_amount: Number(b.amount),
            tx2_pay: b.payment_method,
            selisih_detik: secDiff
          });
        }
      }
    }
  }
  console.log(`Ditemukan ${sameCustomerClusters.length} pasangan transaksi nama/meja sama berdekatan:`);
  console.table(sameCustomerClusters);

  // 2. CEK TRANSAKSI DENGAN NOMINAL PERSIS SAMA DALAM WAKTU < 30 DETIK (DOUBLE CLICK KASIR)
  console.log('\n--- 2. TRANSAKSI NOMINAL SAMA PERSIS DALAM WAKTU < 60 DETIK (Potensi Double Click Kasir) ---');
  const rapidDuplicates = [];
  for (let i = 0; i < txs.length - 1; i++) {
    for (let j = i + 1; j < txs.length; j++) {
      const a = txs[i];
      const b = txs[j];
      if (a.branch_name !== b.branch_name) continue;

      const timeToSec = (tStr) => {
        if (!tStr) return 0;
        const [h, m, s] = tStr.split(':').map(Number);
        return (h || 0) * 3600 + (m || 0) * 60 + (s || 0);
      };
      const secDiff = Math.abs(timeToSec(a.time) - timeToSec(b.time));
      if (secDiff <= 60 && Number(a.amount) === Number(b.amount) && Number(a.amount) > 0) {
        rapidDuplicates.push({
          cabang: a.branch_name,
          pelanggan_1: a.customer_name,
          pelanggan_2: b.customer_name,
          tx1_id: a.id,
          tx1_time: a.time,
          tx2_id: b.id,
          tx2_time: b.time,
          nominal: Number(a.amount),
          selisih_detik: secDiff
        });
      }
    }
  }
  console.log(`Ditemukan ${rapidDuplicates.length} potensi double click / double checkout:`);
  console.table(rapidDuplicates);

  // 3. CEK TRANSAKSI BERNILAI KECIL / ANOMALI (< Rp 10.000)
  console.log('\n--- 3. TRANSAKSI BERNILAI SANGAT KECIL (< Rp 10.000) ---');
  const smallTxs = txs.filter(t => Number(t.amount) < 10000).map(t => ({
    cabang: t.branch_name,
    id: t.id,
    time: t.time,
    pelanggan: t.customer_name,
    nominal: Number(t.amount),
    metode: t.payment_method,
    kasir: t.cashier
  }));
  console.log(`Ditemukan ${smallTxs.length} transaksi bernilai < Rp 10.000:`);
  console.table(smallTxs);

  // 4. CEK TRANSAKSI DENGAN NOMINAL SANGAT BESAR (> Rp 500.000)
  console.log('\n--- 4. TRANSAKSI NOMINAL BESAR (> Rp 500.000) ---');
  const largeTxs = txs.filter(t => Number(t.amount) >= 500000).map(t => ({
    cabang: t.branch_name,
    id: t.id,
    time: t.time,
    pelanggan: t.customer_name,
    nominal: Number(t.amount),
    metode: t.payment_method,
    kasir: t.cashier
  }));
  console.log(`Ditemukan ${largeTxs.length} transaksi besar:`);
  console.table(largeTxs);

  await pool.end();
}

runSuspiciousAudit().catch(console.error);
