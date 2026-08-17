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

async function main() {
  const pool = await mysql.createPool({
    host: dbConfig.host,
    user: dbConfig.user,
    password: dbConfig.password,
    database: dbConfig.database,
    dateStrings: true
  });

  console.log('=== AUDIT LAPORAN & DATABASE DETAIL ===\n');

  // 1. REKAP PENJUALAN PER OUTLET PER TANGGAL (10-18 AGUSTUS 2026)
  console.log('1. REKAP PENJUALAN POS (sales_transactions):');
  const [sales] = await pool.execute(`
    SELECT 
      date,
      branch_name,
      COUNT(*) as count_tx,
      SUM(amount) as total_omzet,
      SUM(CASE WHEN payment_method = 'Cash' THEN amount ELSE 0 END) as cash_omzet,
      SUM(CASE WHEN payment_method != 'Cash' THEN amount ELSE 0 END) as non_cash_omzet
    FROM sales_transactions
    WHERE date >= '2026-08-10'
    GROUP BY date, branch_name
    ORDER BY date DESC, total_omzet DESC
  `);
  console.table(sales);

  // 2. CEK TABEL SHIFT CLOSINGS vs PENJUALAN
  console.log('\n2. STATUS LAPORAN TUTUP SHIFT (shift_closings):');
  const [shifts] = await pool.execute(`
    SELECT id, date, branch_name, author_name, opening_float, net_sales, cash_sales, non_cash_sales, total_expense, expected_cash, cash_physical, cash_variance, status
    FROM shift_closings
    WHERE date >= '2026-08-10'
    ORDER BY date DESC
  `);
  console.table(shifts);

  // 3. CEK DATA KEUANGAN / PENGELUARAN / COA
  console.log('\n3. DATA ARUS KAS & PENGELUARAN DARI JSON MASTER:');
  const [blobRows] = await pool.execute('SELECT data FROM mris_master_data WHERE id = 1');
  if (blobRows.length > 0 && blobRows[0].data) {
    const d = typeof blobRows[0].data === 'string' ? JSON.parse(blobRows[0].data) : blobRows[0].data;
    
    console.log('- Jumlah approvedFinanceDaily:', (d.approvedFinanceDaily || []).length);
    console.log('- Jumlah manualEntryRecords:', (d.manualEntryRecords || []).length);
    console.log('- Jumlah cogsExpenses (HPP):', (d.cogsExpenses || []).length);
    console.log('- Jumlah productionExpenses (BOP):', (d.productionExpenses || []).length);
    console.log('- Jumlah otherExpenses (Beban Operasional):', (d.otherExpenses || []).length);
    console.log('- Jumlah stockMovement (Pergerakan Stok):', (d.stockMovement || []).length);
    console.log('- Jumlah stockOpname (Opname):', (d.stockOpname || []).length);

    // Cek sampel approvedFinanceDaily jika ada
    if (d.approvedFinanceDaily && d.approvedFinanceDaily.length > 0) {
      console.log('\nSampel approvedFinanceDaily:', d.approvedFinanceDaily.slice(0, 5));
    }
  }

  // 4. CEK RELASI OUTLETS & KATEGORI & PRODUK
  console.log('\n4. INTEGRITAS MASTER OUTLETS & PRODUK:');
  const [outlets] = await pool.execute('SELECT id, code, name, status FROM outlets');
  console.table(outlets);

  await pool.end();
}

main().catch(console.error);
