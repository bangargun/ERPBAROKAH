import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env file manually if present
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  try {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        const key = match[1];
        let value = match[2] || '';
        if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
        if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
        if (!process.env[key]) process.env[key] = value.trim();
      }
    });
  } catch (e) {}
}

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept']
}));
app.options('*', cors());
app.use(express.json({ limit: '10mb' }));

// Persistent JSON Store Path
const DB_FILE = path.join(__dirname, 'mris_finance.json');

// Initial Data Structure (100% Clean Slate - Murni Data Pengguna)
const initialDb = {
  outlets: [],
  categories: [],
  transactions: [],
  shift_closings: []
};

// Initialize Database File if not exists
if (!fs.existsSync(DB_FILE)) {
  fs.writeFileSync(DB_FILE, JSON.stringify(initialDb, null, 2));
}

// Database Read/Write Utilities
const readDb = () => {
  try {
    const data = fs.readFileSync(DB_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (err) {
    return initialDb;
  }
};

const saveDb = (data) => {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
};

// REST API ROUTES

// 1. Get All Outlets
app.get('/api/outlets', (req, res) => {
  const db = readDb();
  res.json(db.outlets);
});

// Create Outlet
app.post('/api/outlets', (req, res) => {
  const db = readDb();
  const { code, name, location, manager_name, phone, monthly_budget, color } = req.body;
  const newOutlet = {
    id: db.outlets.length + 1,
    code,
    name,
    location,
    manager_name: manager_name || '',
    phone: phone || '',
    monthly_budget: parseFloat(monthly_budget) || 50000000,
    status: 'Active',
    color: color || '#3b82f6'
  };
  db.outlets.push(newOutlet);
  saveDb(db);
  res.json({ id: newOutlet.id, message: 'Restoran/Cabang berhasil ditambahkan' });
});

// 2. Get Categories
app.get('/api/categories', (req, res) => {
  const db = readDb();
  res.json(db.categories);
});

// 3. Get Financial Dashboard KPI & Consolidated Stats
app.get('/api/dashboard/stats', (req, res) => {
  const db = readDb();
  const branchId = req.query.branchId ? parseInt(req.query.branchId) : null;

  let approvedTx = db.transactions.filter(t => t.status === 'approved');
  if (branchId) {
    approvedTx = approvedTx.filter(t => t.branch_id === branchId);
  }

  const totalIncome = approvedTx.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
  const totalExpense = approvedTx.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
  const netProfit = totalIncome - totalExpense;
  const profitMargin = totalIncome > 0 ? ((netProfit / totalIncome) * 100).toFixed(1) : 0;
  const pendingApprovals = db.transactions.filter(t => t.status === 'pending').length;

  const outletsStats = db.outlets.map(o => {
    const oApproved = db.transactions.filter(t => t.branch_id === o.id && t.status === 'approved');
    const income = oApproved.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const expense = oApproved.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
    const net = income - expense;
    const margin = income > 0 ? ((net / income) * 100).toFixed(1) : 0;
    return {
      id: o.id,
      name: o.name,
      code: o.code,
      color: o.color,
      monthly_budget: o.monthly_budget,
      income,
      expense,
      netProfit: net,
      profitMargin: margin
    };
  });

  res.json({
    totalIncome,
    totalExpense,
    netProfit,
    profitMargin,
    pendingApprovals,
    outletsStats
  });
});

// 4. Get Financial Chart Data (Revenue vs Expense Trend)
app.get('/api/dashboard/chart', (req, res) => {
  const db = readDb();
  const branchId = req.query.branchId ? parseInt(req.query.branchId) : null;

  let approvedTx = db.transactions.filter(t => t.status === 'approved');
  if (branchId) {
    approvedTx = approvedTx.filter(t => t.branch_id === branchId);
  }

  const dateMap = {};
  approvedTx.forEach(t => {
    if (!dateMap[t.date]) {
      dateMap[t.date] = { date: t.date, income: 0, expense: 0 };
    }
    if (t.type === 'income') dateMap[t.date].income += t.amount;
    if (t.type === 'expense') dateMap[t.date].expense += t.amount;
  });

  const chartData = Object.values(dateMap).sort((a, b) => a.date.localeCompare(b.date));
  chartData.forEach(d => { d.profit = d.income - d.expense; });

  res.json(chartData);
});

// 5. Get Transactions List
app.get('/api/transactions', (req, res) => {
  const db = readDb();
  const { branchId, type, status, limit } = req.query;

  let list = db.transactions.map(t => {
    const outlet = db.outlets.find(o => o.id === t.branch_id);
    return { ...t, branch_name: outlet?.name || 'Cabang', branch_code: outlet?.code || '' };
  });

  if (branchId) list = list.filter(t => t.branch_id === parseInt(branchId));
  if (type) list = list.filter(t => t.type === type);
  if (status) list = list.filter(t => t.status === status);

  list.sort((a, b) => b.id - a.id);

  if (limit) list = list.slice(0, parseInt(limit));

  res.json(list);
});

// Add Transaction
app.post('/api/transactions', (req, res) => {
  const db = readDb();
  const { branch_id, type, category, amount, description, payment_method, date, created_by, receipt_url, status } = req.body;

  if (!branch_id || !type || !category || !amount || !payment_method) {
    return res.status(400).json({ error: 'Mohon lengkapi field mandatory' });
  }

  const txDate = date || new Date().toISOString().split('T')[0];
  const txStatus = status || (type === 'expense' && parseFloat(amount) > 1000000 ? 'pending' : 'approved');

  const newTx = {
    id: Date.now(),
    branch_id: parseInt(branch_id),
    type,
    category,
    amount: parseFloat(amount),
    description: description || '',
    payment_method,
    date: txDate,
    created_by: created_by || 'Staff',
    receipt_url: receipt_url || null,
    status: txStatus
  };

  db.transactions.unshift(newTx);
  saveDb(db);

  res.json({
    id: newTx.id,
    status: txStatus,
    message: txStatus === 'pending' ? 'Pengeluaran nominal besar berhasil diajukan & menunggu persetujuan Admin' : 'Transaksi berhasil dicatat'
  });
});

// Update Status
app.patch('/api/transactions/:id/status', (req, res) => {
  const db = readDb();
  const id = parseInt(req.params.id);
  const { status } = req.body;

  const tx = db.transactions.find(t => t.id === id);
  if (tx) {
    tx.status = status;
    saveDb(db);
    res.json({ message: `Status transaksi berhasil diperbarui menjadi ${status}` });
  } else {
    res.status(404).json({ error: 'Transaksi tidak ditemukan' });
  }
});

// 6. Get Shift Closings
app.get('/api/shift-closings', (req, res) => {
  const db = readDb();
  const { branchId } = req.query;

  let closings = db.shift_closings.map(s => {
    const outlet = db.outlets.find(o => o.id === s.branch_id);
    return { ...s, branch_name: outlet?.name || 'Cabang' };
  });

  if (branchId) closings = closings.filter(s => s.branch_id === parseInt(branchId));
  closings.sort((a, b) => b.id - a.id);

  res.json(closings);
});

// Submit Shift Closing
app.post('/api/shift-closings', (req, res) => {
  const db = readDb();
  const { branch_id, shift_date, shift_name, cashier_name, system_sales, actual_cash, qris_sales, edc_sales, notes } = req.body;

  const sys = parseFloat(system_sales) || 0;
  const cash = parseFloat(actual_cash) || 0;
  const qris = parseFloat(qris_sales) || 0;
  const edc = parseFloat(edc_sales) || 0;
  const variance = (cash + qris + edc) - sys;

  const newClosing = {
    id: Date.now(),
    branch_id: parseInt(branch_id),
    shift_date: shift_date || new Date().toISOString().split('T')[0],
    shift_name,
    cashier_name,
    system_sales: sys,
    actual_cash: cash,
    qris_sales: qris,
    edc_sales: edc,
    variance,
    notes: notes || ''
  };

  db.shift_closings.unshift(newClosing);
  saveDb(db);

  res.json({
    id: newClosing.id,
    variance,
    message: variance === 0 ? 'Penutupan Kasir Berhasil! Selisih NIHIL (Cocok).' : `Penutupan Kasir Berhasil! Selisih audit: Rp ${variance.toLocaleString('id-ID')}`
  });
});

// 7. Get Profit & Loss Report
app.get('/api/reports/pnl', (req, res) => {
  const db = readDb();
  const { branchId } = req.query;

  let approvedTx = db.transactions.filter(t => t.status === 'approved');
  if (branchId) approvedTx = approvedTx.filter(t => t.branch_id === parseInt(branchId));

  const incomeMap = {};
  const expenseMap = {};

  approvedTx.forEach(t => {
    if (t.type === 'income') {
      incomeMap[t.category] = (incomeMap[t.category] || 0) + t.amount;
    } else if (t.type === 'expense') {
      expenseMap[t.category] = (expenseMap[t.category] || 0) + t.amount;
    }
  });

  const incomeByCategory = Object.keys(incomeMap).map(cat => ({ category: cat, total: incomeMap[cat] }));
  const expenseByCategory = Object.keys(expenseMap).map(cat => ({ category: cat, total: expenseMap[cat] }));

  const totalIncome = incomeByCategory.reduce((sum, i) => sum + i.total, 0);
  const totalExpense = expenseByCategory.reduce((sum, i) => sum + i.total, 0);
  const netProfit = totalIncome - totalExpense;

  res.json({
    totalIncome,
    totalExpense,
    netProfit,
    incomeByCategory,
    expenseByCategory
  });
});

// Default Master Data Schema Structure (Clean Slate)
const defaultMasterData = {
  outlets: [],
  categories: [],
  products: [],
  customers: [],
  salesTransactions: [],
  tables: [],
  paymentMethods: [
    { id: 1, name: 'Tunai (Cash)', code: 'CASH', status: 'Aktif' },
    { id: 2, name: 'QRIS', code: 'QRIS', status: 'Aktif' },
    { id: 3, name: 'Debit / EDC Bank', code: 'EDC', status: 'Aktif' }
  ],
  suppliers: [],
  units: [],
  expenseMaster: [],
  ingredients: [],
  cogsExpenses: [],
  productionExpenses: [],
  otherExpenses: [],
  stockMovement: [],
  stockOpname: [],
  shiftClosings: [],
  sopDocuments: [],
  webAdminAccounts: [],
  mobileAccounts: [],
  _lastUpdated: Date.now()
};

// 8. Full Master Data Sync Endpoints
// MySQL Enterprise Storage Connection & Auto-Mirroring Engine
let mysqlInitError = null;

const initMySQLPool = async () => {
  try {
    const mysql = await import('mysql2/promise');
    mysqlPool = mysql.createPool({
      host: process.env.MYSQL_HOST || '127.0.0.1',
      user: process.env.MYSQL_USER || 'root',
      password: process.env.MYSQL_PASSWORD || '',
      database: process.env.MYSQL_DATABASE || 'mris_db',
      port: Number(process.env.MYSQL_PORT) || 3306,
      waitForConnections: false,
      connectionLimit: 5,
      connectTimeout: 2500,
      queueLimit: 0
    });
    mysqlInitError = null;
    console.log('✅ MySQL Pool Initialized for Hostinger mris_db Storage');
    // Auto-create master data table jika belum ada
    await ensureMasterDataTable();
  } catch (err) {
    mysqlInitError = err.message;
  }
};
initMySQLPool();

// Auto-create tabel mris_master_data jika belum ada
const ensureMasterDataTable = async () => {
  if (!mysqlPool) return;
  try {
    await mysqlPool.execute(`
      CREATE TABLE IF NOT EXISTS mris_master_data (
        id INT PRIMARY KEY DEFAULT 1,
        data LONGTEXT NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Tabel mris_master_data siap');
  } catch (err) {
    console.error('❌ Gagal membuat tabel mris_master_data:', err.message);
  }
};

// Baca masterData dari MySQL
const getMasterDataFromMySQL = async () => {
  if (!mysqlPool) return null;
  try {
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('MySQL read timeout')), 3000)
    );
    const queryPromise = mysqlPool.execute('SELECT data FROM mris_master_data WHERE id = 1');
    const [rows] = await Promise.race([queryPromise, timeoutPromise]);
    if (rows && rows.length > 0 && rows[0].data) {
      return JSON.parse(rows[0].data);
    }
    return null;
  } catch (err) {
    console.error('MySQL read error:', err.message);
    return null;
  }
};

// Simpan masterData ke MySQL
const saveMasterDataToMySQL = async (masterData) => {
  if (!mysqlPool) return false;
  try {
    const json = JSON.stringify(masterData);
    await mysqlPool.execute(`
      INSERT INTO mris_master_data (id, data) VALUES (1, ?)
      ON DUPLICATE KEY UPDATE data = VALUES(data), updated_at = CURRENT_TIMESTAMP
    `, [json]);
    return true;
  } catch (err) {
    console.error('MySQL write error:', err.message);
    return false;
  }
};

const syncToMySQL = async (masterData) => {
  if (!mysqlPool || !masterData || typeof masterData !== 'object') return;

  try {
    const transactions = masterData.salesTransactions || masterData.transactions || [];
    for (const t of transactions) {
      if (!t || !t.id) continue;
      const txId = String(t.id);
      const txDate = t.date || new Date().toISOString().split('T')[0];
      const txTime = t.time || '00:00:00';
      const outletId = Number(t.outlet_id || t.branch_id || 1);
      const branchName = t.branch_name || t.outlet || '';
      const customerName = t.customer_name || t.customer || 'Pelanggan Umum';
      const tableNumber = t.table_number || t.table || '';
      const orderType = t.order_type || t.type || 'Dine In';
      const amount = Number(t.amount || t.total || 0);
      const paidAmount = Number(t.paid_amount || t.paid || amount);
      const changeAmount = Number(t.change_amount || t.change || 0);
      const paymentMethod = t.payment_method || 'Cash';
      const cashier = t.cashier || t.author || 'Kasir';
      const notes = t.notes || '';
      const status = t.status || 'approved';

      await mysqlPool.execute(`
        INSERT INTO sales_transactions 
          (id, receipt_no, date, time, outlet_id, branch_id, branch_name, outlet, customer_name, table_number, order_type, subtotal, discount_amount, service_charge, tax_amount, adjustment_amount, amount, paid_amount, change_amount, payment_method, cashier, notes, status, type)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'income')
        ON DUPLICATE KEY UPDATE
          amount = VALUES(amount),
          paid_amount = VALUES(paid_amount),
          payment_method = VALUES(payment_method),
          status = VALUES(status)
      `, [txId, txId, txDate, txTime, outletId, outletId, branchName, branchName, customerName, tableNumber, orderType, amount, 0, 0, 0, 0, amount, paidAmount, changeAmount, paymentMethod, cashier, notes, status]);
    }

    const shiftClosings = masterData.shiftClosings || masterData.closedShifts || masterData.approvedFinanceDaily || [];
    for (const sc of shiftClosings) {
      if (!sc || !sc.id) continue;
      await mysqlPool.execute(`
        INSERT INTO shift_closings 
          (id, date, outlet_id, branch_name, author_name, opening_float, net_sales, cash_sales, non_cash_sales, total_expense, expected_cash, cash_physical, cash_variance, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          net_sales = VALUES(net_sales),
          cash_physical = VALUES(cash_physical),
          status = VALUES(status)
      `, [
        String(sc.id),
        sc.date || new Date().toISOString().split('T')[0],
        Number(sc.outlet_id || 1),
        sc.branch_name || '',
        sc.author_name || sc.cashier || 'Kasir',
        Number(sc.opening_float || 0),
        Number(sc.net_sales || 0),
        Number(sc.cash_sales || 0),
        Number(sc.non_cash_sales || 0),
        Number(sc.total_expense || 0),
        Number(sc.expected_cash || 0),
        Number(sc.cash_physical || 0),
        Number(sc.cash_variance || 0),
        sc.status || 'ditunda'
      ]);
    }
  } catch (err) {
    // Non-blocking log
  }
};

app.get('/api/mysql-status', async (req, res) => {
  if (!mysqlPool) {
    return res.json({ status: 'standalone', message: 'Engine 1 (JSON Fast Store Active). MySQL driver notice: ' + (mysqlInitError || 'mysql2 pool inactive') });
  }
  try {
    const queryPromise = mysqlPool.query('SELECT COUNT(*) as tx_count FROM sales_transactions');
    const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('MySQL connection timeout (2500ms)')), 2500));
    
    const [rows] = await Promise.race([queryPromise, timeoutPromise]);
    res.json({ status: 'connected', database: 'mris_db', sales_transaction_count: rows[0]?.tx_count || 0 });
  } catch (err) {
    res.json({ status: 'standalone', message: 'Engine 1 (JSON Fast Store Active). MySQL notice: ' + err.message });
  }
});

// Auto-Deploy Webhook Endpoint for Instant VPS Deployment
app.all('/api/webhook/deploy', (req, res) => {
  const secret = req.query.secret || req.body?.secret || req.headers['x-deploy-secret'];
  const DEPLOY_SECRET = process.env.DEPLOY_SECRET || 'mris_deploy_secret_2026';

  if (secret !== DEPLOY_SECRET) {
    return res.status(403).json({ error: 'Unauthorized deploy secret' });
  }

  res.json({ success: true, message: '🚀 Deployment command triggered on VPS in background...' });

  const deployCmd = `cd /var/www/MRIS_TECH && git fetch origin && git reset --hard origin/main && cd web_admin && npm run build && cp -r dist/* ../dist/ && cd .. && pm2 restart mris-app-tech`;

  exec(deployCmd, (error, stdout, stderr) => {
    if (error) {
      console.error('❌ Auto-deploy failed:', error.message);
      return;
    }
    console.log('✅ Auto-deploy output:\n', stdout);
  });
});

// Sanitizer otomatis — menjamin data input pengguna 100% aman dan tidak terhapus
const sanitizeMasterDataPayload = (data) => {
  if (!data || typeof data !== 'object') return data;
  const clean = { ...data };

  // Hanya bersihkan nama data fiktif legacy jika ada (JANGAN hapus ID numerik milik pengguna)
  if (Array.isArray(clean.outlets)) {
    clean.outlets = clean.outlets.filter(o => o && o.name !== 'Outlet Cabang 2' && o.code !== 'RST-DUMMY');
  }
  if (Array.isArray(clean.suppliers)) {
    clean.suppliers = clean.suppliers.filter(s => s && s.name !== 'PT Sembako Nusantara' && s.name !== 'UD Sayur Segar');
  }

  return clean;
};

// GET /api/master-data — MySQL PRIMARY, JSON fallback
app.get('/api/master-data', async (req, res) => {
  try {
    const mysqlData = await getMasterDataFromMySQL();
    if (mysqlData && typeof mysqlData === 'object') {
      return res.json(sanitizeMasterDataPayload(mysqlData));
    }
    // Fallback ke JSON
    const db = readDb();
    const jsonData = (db.masterData && typeof db.masterData === 'object') ? db.masterData : defaultMasterData;
    res.json(sanitizeMasterDataPayload(jsonData));
  } catch (err) {
    console.error('GET /api/master-data error:', err.message);
    res.status(500).json({ error: 'Gagal mengambil data master terpusat' });
  }
});

// POST /api/master-data — MySQL PRIMARY, JSON fallback
app.post('/api/master-data', async (req, res) => {
  try {
    const payload = req.body;
    if (!payload || typeof payload !== 'object') {
      return res.status(400).json({ error: 'Payload tidak valid' });
    }

    const nowTs = Date.now();

    // Baca data existing dari MySQL
    let existing = await getMasterDataFromMySQL();
    if (!existing || typeof existing !== 'object') {
      // Fallback ke JSON jika MySQL kosong
      const db = readDb();
      existing = (db.masterData && typeof db.masterData === 'object') ? db.masterData : defaultMasterData;
    }

    const sanitizedPayload = sanitizeMasterDataPayload(payload);
    const newMasterData = sanitizeMasterDataPayload({ ...existing, ...sanitizedPayload, _lastUpdated: nowTs });

    // Simpan ke MySQL (primary)
    const mysqlOk = await saveMasterDataToMySQL(newMasterData);

    // Simpan ke JSON juga sebagai backup
    try {
      const db = readDb();
      db.masterData = newMasterData;
      db.lastUpdated = new Date().toISOString();
      saveDb(db);
    } catch (jsonErr) {
      // JSON backup gagal — tidak masalah kalau MySQL berhasil
    }

    // Mirror transaksi ke MySQL tabel terpisah (background)
    setTimeout(() => { syncToMySQL(newMasterData); }, 50);

    const timestamp = new Date().toISOString();
    res.json({
      success: true,
      message: mysqlOk ? 'Data master tersimpan ke MySQL' : 'Data master tersimpan ke JSON (MySQL unavailable)',
      storage: mysqlOk ? 'mysql' : 'json',
      timestamp,
      _lastUpdated: nowTs
    });
  } catch (err) {
    console.error('POST /api/master-data error:', err.message);
    res.status(500).json({ error: 'Gagal menyinkronkan data master ke server' });
  }
});

// Serve Static Production Bundle
app.use(express.static(path.join(__dirname, 'dist')));

app.get('*', (req, res) => {
  if (req.path.startsWith('/api')) return;
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// Start Server
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 MRIS Full-Stack App & API running on http://0.0.0.0:${PORT}`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    const ALT_PORT = 5001;
    console.log(`Port ${PORT} is in use, trying ${ALT_PORT}...`);
    app.listen(ALT_PORT, '0.0.0.0', () => {
      console.log(`🚀 MRIS Full-Stack App & API running on http://0.0.0.0:${ALT_PORT}`);
    });
  }
});
