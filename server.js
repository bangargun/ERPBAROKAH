import express from 'express';
import cors from 'cors';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import * as XLSX from 'xlsx';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ─── FLAG: Force-flush perintah ke semua POS client ────────────────────────
// Diset via POST /api/pos-force-flush, dibaca dan di-clear saat GET /api/master-data
let forceFlushActive = false;

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
// PORT resmi produksi VPS: 5001 (sesuai Nginx proxy_pass)
const PORT = 5001;

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept']
}));
app.options('*', cors());
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ limit: '100mb', extended: true }));

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

// Helper for unified MySQL storage retrieval across all REST endpoints
const getUnifiedData = async () => {
  let masterData = await getMasterDataFromMySQL();
  if (!masterData || typeof masterData !== 'object') {
    masterData = defaultMasterData;
  }
  return masterData;
};

// REST API ROUTES (100% UNIFIED MYSQL mris_db PRIMARY STORAGE)

// 1. Get All Outlets
app.get('/api/outlets', async (req, res) => {
  const masterData = await getUnifiedData();
  res.json(masterData.outlets || []);
});

// Create Outlet
app.post('/api/outlets', async (req, res) => {
  const masterData = await getUnifiedData();
  const { code, name, location, manager_name, phone, monthly_budget, color } = req.body;
  const newOutlet = {
    id: (masterData.outlets || []).length + 1,
    code,
    name,
    location,
    manager_name: manager_name || '',
    phone: phone || '',
    monthly_budget: parseFloat(monthly_budget) || 50000000,
    status: 'Active',
    color: color || '#3b82f6'
  };
  masterData.outlets = [...(masterData.outlets || []), newOutlet];
  masterData._lastUpdated = Date.now();
  await saveMasterDataToMySQL(masterData);
  await syncToMySQL(masterData);
  res.json({ id: newOutlet.id, message: 'Restoran/Cabang berhasil ditambahkan' });
});

// 2. Get Categories
app.get('/api/categories', async (req, res) => {
  const masterData = await getUnifiedData();
  res.json(masterData.categories || []);
});

// 3. Get Financial Dashboard KPI & Consolidated Stats
app.get('/api/dashboard/stats', async (req, res) => {
  const masterData = await getUnifiedData();
  const branchId = req.query.branchId ? parseInt(req.query.branchId) : null;
  const allTx = [...(masterData.salesTransactions || []), ...(masterData.transactions || [])];

  let approvedTx = allTx.filter(t => t.status === 'approved' || !t.status);
  if (branchId) {
    approvedTx = approvedTx.filter(t => Number(t.branch_id || t.outlet_id) === branchId);
  }

  const totalIncome = approvedTx.filter(t => t.type === 'income' || t.total || t.grand_total).reduce((sum, t) => sum + Number(t.amount || t.total || t.grand_total || 0), 0);
  const totalExpense = approvedTx.filter(t => t.type === 'expense').reduce((sum, t) => sum + Number(t.amount || 0), 0);
  const netProfit = totalIncome - totalExpense;
  const profitMargin = totalIncome > 0 ? ((netProfit / totalIncome) * 100).toFixed(1) : 0;
  const pendingApprovals = allTx.filter(t => t.status === 'pending').length;

  const outletsStats = (masterData.outlets || []).map(o => {
    const oApproved = allTx.filter(t => Number(t.branch_id || t.outlet_id) === Number(o.id) && (t.status === 'approved' || !t.status));
    const income = oApproved.filter(t => t.type === 'income' || t.total || t.grand_total).reduce((sum, t) => sum + Number(t.amount || t.total || t.grand_total || 0), 0);
    const expense = oApproved.filter(t => t.type === 'expense').reduce((sum, t) => sum + Number(t.amount || 0), 0);
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
app.get('/api/dashboard/chart', async (req, res) => {
  const masterData = await getUnifiedData();
  const branchId = req.query.branchId ? parseInt(req.query.branchId) : null;
  const allTx = [...(masterData.salesTransactions || []), ...(masterData.transactions || [])];

  let approvedTx = allTx.filter(t => t.status === 'approved' || !t.status);
  if (branchId) {
    approvedTx = approvedTx.filter(t => Number(t.branch_id || t.outlet_id) === branchId);
  }

  const dateMap = {};
  approvedTx.forEach(t => {
    const d = t.date || (t.timestamp ? String(t.timestamp).split('T')[0] : new Date().toISOString().split('T')[0]);
    if (!dateMap[d]) {
      dateMap[d] = { date: d, income: 0, expense: 0 };
    }
    const amt = Number(t.amount || t.total || t.grand_total || 0);
    if (t.type === 'expense') {
      dateMap[d].expense += amt;
    } else {
      dateMap[d].income += amt;
    }
  });

  const chartData = Object.values(dateMap).sort((a, b) => a.date.localeCompare(b.date));
  chartData.forEach(d => { d.profit = d.income - d.expense; });

  res.json(chartData);
});

// 5. Get Transactions List
app.get('/api/transactions', async (req, res) => {
  const masterData = await getUnifiedData();
  const { branchId, type, status, limit } = req.query;

  const outlets = masterData.outlets || [];
  const allTx = [...(masterData.salesTransactions || []), ...(masterData.transactions || [])];

  let list = allTx.map(t => {
    const bId = Number(t.branch_id || t.outlet_id);
    const outlet = outlets.find(o => Number(o.id) === bId);
    return {
      ...t,
      amount: Number(t.amount || t.total || t.grand_total || 0),
      branch_id: bId,
      branch_name: outlet?.name || t.outlet_name || 'Cabang',
      branch_code: outlet?.code || ''
    };
  });

  if (branchId) list = list.filter(t => t.branch_id === parseInt(branchId));
  if (type) list = list.filter(t => t.type === type);
  if (status) list = list.filter(t => t.status === status);

  list.sort((a, b) => (b.id || 0) - (a.id || 0));

  if (limit) list = list.slice(0, parseInt(limit));

  res.json(list);
});

// Add Transaction
app.post('/api/transactions', async (req, res) => {
  const masterData = await getUnifiedData();
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

  masterData.transactions = [newTx, ...(masterData.transactions || [])];
  masterData.salesTransactions = [newTx, ...(masterData.salesTransactions || [])];
  masterData._lastUpdated = Date.now();

  await saveMasterDataToMySQL(masterData);
  await syncToMySQL(masterData);

  res.json({
    id: newTx.id,
    status: txStatus,
    message: txStatus === 'pending' ? 'Pengeluaran nominal besar berhasil diajukan & menunggu persetujuan Admin' : 'Transaksi berhasil dicatat'
  });
});

// Update Status
app.patch('/api/transactions/:id/status', async (req, res) => {
  const masterData = await getUnifiedData();
  const id = parseInt(req.params.id);
  const { status } = req.body;

  const allTx = masterData.transactions || [];
  const tx = allTx.find(t => Number(t.id) === id);
  if (tx) {
    tx.status = status;
    masterData._lastUpdated = Date.now();
    await saveMasterDataToMySQL(masterData);
    await syncToMySQL(masterData);
    res.json({ message: `Status transaksi berhasil diperbarui menjadi ${status}` });
  } else {
    res.status(404).json({ error: 'Transaksi tidak ditemukan' });
  }
});

// 6. Get Shift Closings
app.get('/api/shift-closings', async (req, res) => {
  const masterData = await getUnifiedData();
  const { branchId } = req.query;

  const closingsList = [...(masterData.shift_closings || []), ...(masterData.closedShifts || [])];
  const outlets = masterData.outlets || [];

  let closings = closingsList.map(s => {
    const bId = Number(s.branch_id || s.outlet_id);
    const outlet = outlets.find(o => Number(o.id) === bId);
    return { ...s, branch_name: outlet?.name || s.outlet_name || 'Cabang' };
  });

  if (branchId) closings = closings.filter(s => Number(s.branch_id || s.outlet_id) === parseInt(branchId));
  closings.sort((a, b) => (b.id || 0) - (a.id || 0));

  res.json(closings);
});

// Submit Shift Closing
app.post('/api/shift-closings', async (req, res) => {
  const masterData = await getUnifiedData();
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

  masterData.shift_closings = [newClosing, ...(masterData.shift_closings || [])];
  masterData.closedShifts = [newClosing, ...(masterData.closedShifts || [])];
  masterData._lastUpdated = Date.now();

  await saveMasterDataToMySQL(masterData);
  await syncToMySQL(masterData);

  res.json({
    id: newClosing.id,
    variance,
    message: variance === 0 ? 'Penutupan Kasir Berhasil! Selisih NIHIL (Cocok).' : `Penutupan Kasir Berhasil! Selisih audit: Rp ${variance.toLocaleString('id-ID')}`
  });
});

// 7. Get Profit & Loss Report
app.get('/api/reports/pnl', async (req, res) => {
  const masterData = await getUnifiedData();
  const { branchId } = req.query;
  const allTx = [...(masterData.salesTransactions || []), ...(masterData.transactions || [])];

  let approvedTx = allTx.filter(t => t.status === 'approved' || !t.status);
  if (branchId) approvedTx = approvedTx.filter(t => Number(t.branch_id || t.outlet_id) === parseInt(branchId));

  const incomeMap = {};
  const expenseMap = {};

  approvedTx.forEach(t => {
    const amt = Number(t.amount || t.total || t.grand_total || 0);
    const cat = t.category || 'Penjualan Kasir';
    if (t.type === 'expense') {
      expenseMap[cat] = (expenseMap[cat] || 0) + amt;
    } else {
      incomeMap[cat] = (incomeMap[cat] || 0) + amt;
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
    { id: 2, name: 'QRIS (BCA)', code: 'QRIS_BCA', status: 'Aktif' },
    { id: 3, name: 'Debit / EDC Bank', code: 'EDC', status: 'Aktif' }
  ],
  suppliers: [],
  units: [],
  expenseMaster: [],
  ingredients: [],
  ingredientCategories: [
    { id: 1, code: 'KBHN-001', name: 'Seafood & Ikan', description: 'Aneka ikan laut, udang, cumi, dan seafood segar', status: 'Aktif' },
    { id: 2, code: 'KBHN-002', name: 'Daging & Unggas', description: 'Ayam, bebek, sapi, dan produk unggas', status: 'Aktif' },
    { id: 3, code: 'KBHN-003', name: 'Sayur & Bumbu Segar', description: 'Sayuran hijau, cabai, bawang, dan bumbu basah', status: 'Aktif' },
    { id: 4, code: 'KBHN-004', name: 'Minuman & Powder', description: 'Bubuk minuman, teh, kopi, sirup, dan kemasan', status: 'Aktif' },
    { id: 5, code: 'KBHN-005', name: 'Sembako & Olahan', description: 'Beras, minyak goreng, tepung, gula, kecap, dan saus', status: 'Aktif' },
    { id: 6, code: 'KBHN-006', name: 'Bumbu & Rempah', description: 'Bumbu kering, rempah-rempah dapur, dan perasa', status: 'Aktif' }
  ],
  cogsExpenses: [],
  productionExpenses: [],
  otherExpenses: [],
  stockMovement: [],
  stockOpname: [],
  stockAdjustments: [],
  cashAdjustments: [],
  shiftClosings: [],
  sopDocuments: [],
  webAdminAccounts: [],
  mobileAccounts: [],
  _lastUpdated: Date.now()
};

// 8. Full Master Data Sync Endpoints
// MySQL Enterprise Storage Connection & Auto-Mirroring Engine
let mysqlPool = null;
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
      waitForConnections: true,
      connectionLimit: 50,
      connectTimeout: 10000,
      queueLimit: 0,
      enableKeepAlive: true,
      keepAliveInitialDelay: 0,
      dateStrings: true
    });
    await ensureMasterDataTable();

    // Auto-sync blob data to relational tables on startup
    try {
      const initialData = await getMasterDataFromMySQL();
      if (initialData) {
        await syncToMySQL(initialData);
        console.log('✅ Auto-sync tabel relasional MySQL selesai saat startup');
      }
    } catch (sErr) {
      console.warn('Warning initial sync to relational MySQL:', sErr.message);
    }

  } catch (err) {
    mysqlInitError = err.message;
  }
};
initMySQLPool();

// Auto-create semua tabel MySQL yang dibutuhkan jika belum ada
const ensureMasterDataTable = async () => {
  if (!mysqlPool) return;
  try {
    // 1. Tabel master data utama (JSON blob)
    await mysqlPool.execute(`
      CREATE TABLE IF NOT EXISTS mris_master_data (
        id INT PRIMARY KEY DEFAULT 1,
        data LONGTEXT NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Tabel mris_master_data siap');

    // 1b. Tabel history/snapshot master data (Automatic Versioning & Rolling Backup 50 Versi)
    await mysqlPool.execute(`
      CREATE TABLE IF NOT EXISTS mris_master_data_history (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        tx_count INT DEFAULT 0,
        source_tag VARCHAR(100) DEFAULT 'auto',
        data LONGTEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Tabel mris_master_data_history (Blob Versioning) siap');

    // 2. Outlets
    await mysqlPool.execute(`
      CREATE TABLE IF NOT EXISTS outlets (
        id INT PRIMARY KEY,
        code VARCHAR(50),
        name VARCHAR(255),
        address TEXT,
        location TEXT,
        manager_name VARCHAR(255),
        phone VARCHAR(50),
        target_omzet BIGINT DEFAULT 0,
        employee_count INT DEFAULT 0,
        status VARCHAR(50) DEFAULT 'Aktif',
        color VARCHAR(50) DEFAULT '#3b82f6'
      )
    `);

    // 3. Web Admin Users
    await mysqlPool.execute(`
      CREATE TABLE IF NOT EXISTS web_admin_users (
        id BIGINT PRIMARY KEY,
        name VARCHAR(255),
        username VARCHAR(255),
        password VARCHAR(255),
        role VARCHAR(100),
        outlet VARCHAR(255),
        status VARCHAR(50) DEFAULT 'Aktif'
      )
    `);

    // 4. Mobile POS Users
    await mysqlPool.execute(`
      CREATE TABLE IF NOT EXISTS mobile_pos_users (
        id BIGINT PRIMARY KEY,
        name VARCHAR(255),
        username VARCHAR(255),
        password VARCHAR(255),
        role VARCHAR(100),
        outlet VARCHAR(255),
        status VARCHAR(50) DEFAULT 'Aktif',
        can_access_reports TINYINT(1) DEFAULT 0,
        report_password VARCHAR(255)
      )
    `);

    // Auto-migrate column id ke BIGINT jika sebelumnya INT untuk mendukung 13-digit Date.now() timestamp ID
    try { await mysqlPool.execute(`ALTER TABLE web_admin_users MODIFY id BIGINT`); } catch (e) {}
    try { await mysqlPool.execute(`ALTER TABLE mobile_pos_users MODIFY id BIGINT`); } catch (e) {}

    // Auto-cleanup username ganda (case-insensitive deduplication) di MySQL
    try {
      await mysqlPool.execute(`
        DELETE t1 FROM web_admin_users t1
        INNER JOIN web_admin_users t2 
        ON LOWER(TRIM(t1.username)) = LOWER(TRIM(t2.username)) AND t1.id < t2.id
      `);
      await mysqlPool.execute(`
        DELETE t1 FROM mobile_pos_users t1
        INNER JOIN mobile_pos_users t2 
        ON LOWER(TRIM(t1.username)) = LOWER(TRIM(t2.username)) AND t1.id < t2.id
      `);
    } catch (e) {}

    // 4b. Active Table Orders (Shared Realtime Multi-Device Table Orders per Outlet)
    await mysqlPool.execute(`
      CREATE TABLE IF NOT EXISTS active_table_orders (
        id VARCHAR(100) PRIMARY KEY,
        outlet_id BIGINT NOT NULL,
        table_id VARCHAR(100) NOT NULL,
        table_number VARCHAR(100),
        customer_name VARCHAR(255) DEFAULT 'Pelanggan Umum',
        order_type VARCHAR(100) DEFAULT 'Dine In',
        waiter_name VARCHAR(255),
        items LONGTEXT NOT NULL,
        total_amount DECIMAL(15,2) DEFAULT 0,
        status VARCHAR(50) DEFAULT 'occupied',
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_outlet_status (outlet_id, status)
      )
    `);
    console.log('✅ Tabel active_table_orders (Multi-Device Table Sync) siap');

    // 5. Categories
    await mysqlPool.execute(`
      CREATE TABLE IF NOT EXISTS categories (
        id INT PRIMARY KEY,
        code VARCHAR(50),
        name VARCHAR(255),
        type VARCHAR(50),
        icon VARCHAR(100),
        status VARCHAR(50) DEFAULT 'Aktif'
      )
    `);

    // 6. Products
    await mysqlPool.execute(`
      CREATE TABLE IF NOT EXISTS products (
        id INT PRIMARY KEY,
        sku VARCHAR(100),
        name VARCHAR(255),
        category_id INT,
        category_name VARCHAR(255),
        price BIGINT DEFAULT 0,
        cost_price BIGINT DEFAULT 0,
        stock DECIMAL(10,2) DEFAULT 0,
        unit VARCHAR(50),
        outlet_id INT,
        selected_outlet_ids TEXT,
        image_url TEXT,
        description TEXT,
        status VARCHAR(50) DEFAULT 'Aktif'
      )
    `);

    // 7. Sales Transactions
    await mysqlPool.execute(`
      CREATE TABLE IF NOT EXISTS sales_transactions (
        id VARCHAR(100) PRIMARY KEY,
        receipt_no VARCHAR(100),
        date DATE,
        time VARCHAR(20),
        outlet_id INT,
        branch_id INT,
        branch_name VARCHAR(255),
        outlet VARCHAR(255),
        customer_name VARCHAR(255),
        table_number VARCHAR(50),
        order_type VARCHAR(50),
        subtotal BIGINT DEFAULT 0,
        discount_amount BIGINT DEFAULT 0,
        service_charge BIGINT DEFAULT 0,
        tax_amount BIGINT DEFAULT 0,
        adjustment_amount BIGINT DEFAULT 0,
        amount BIGINT DEFAULT 0,
        paid_amount BIGINT DEFAULT 0,
        change_amount BIGINT DEFAULT 0,
        payment_method VARCHAR(100),
        cashier VARCHAR(255),
        notes TEXT,
        status VARCHAR(50) DEFAULT 'approved',
        type VARCHAR(50) DEFAULT 'income'
      )
    `);

    
    
    // 10. Ingredients Table
    await mysqlPool.execute(`
      CREATE TABLE IF NOT EXISTS ingredients (
        id VARCHAR(100) PRIMARY KEY,
        code VARCHAR(50),
        name VARCHAR(255),
        category VARCHAR(100),
        category_id VARCHAR(50),
        unit VARCHAR(50) DEFAULT 'kg',
        price BIGINT DEFAULT 0,
        cost_price BIGINT DEFAULT 0,
        stock DECIMAL(12,2) DEFAULT 0,
        minimum_stock DECIMAL(12,2) DEFAULT 0,
        outlet_id INT,
        status VARCHAR(50) DEFAULT 'Aktif'
      )
    `);

    // 11. Suppliers Table
    await mysqlPool.execute(`
      CREATE TABLE IF NOT EXISTS suppliers (
        id VARCHAR(100) PRIMARY KEY,
        code VARCHAR(50),
        name VARCHAR(255),
        phone VARCHAR(50),
        address TEXT,
        outlet_id INT,
        status VARCHAR(50) DEFAULT 'Aktif'
      )
    `);

    // 12. Units Table
    await mysqlPool.execute(`
      CREATE TABLE IF NOT EXISTS units (
        id VARCHAR(100) PRIMARY KEY,
        name VARCHAR(100),
        short_name VARCHAR(50),
        status VARCHAR(50) DEFAULT 'Aktif'
      )
    `);

    // 8. Shift Closings Table
    await mysqlPool.execute(`
      CREATE TABLE IF NOT EXISTS shift_closings (
        id VARCHAR(100) PRIMARY KEY,
        date DATE,
        outlet_id INT,
        branch_name VARCHAR(255),
        author_name VARCHAR(255),
        opening_float BIGINT DEFAULT 0,
        net_sales BIGINT DEFAULT 0,
        cash_sales BIGINT DEFAULT 0,
        non_cash_sales BIGINT DEFAULT 0,
        total_expense BIGINT DEFAULT 0,
        expected_cash BIGINT DEFAULT 0,
        cash_physical BIGINT DEFAULT 0,
        cash_variance BIGINT DEFAULT 0,
        status VARCHAR(50) DEFAULT 'SELESAI DITUTUP'
      )
    `);

    // 9. Stock Movement Table
    await mysqlPool.execute(`
      CREATE TABLE IF NOT EXISTS stock_movement (
        id INT AUTO_INCREMENT PRIMARY KEY,
        date DATE,
        time VARCHAR(20),
        ingredient_name VARCHAR(255),
        type VARCHAR(20) DEFAULT 'OUT',
        qty DECIMAL(12,2) DEFAULT 0,
        unit VARCHAR(50) DEFAULT 'porsi',
        outlet_id INT,
        source_outlet VARCHAR(255),
        target_outlet VARCHAR(255),
        reason TEXT,
        user_name VARCHAR(255),
        INDEX idx_sm_outlet_date (outlet_id, date),
        INDEX idx_sm_ing (ingredient_name)
      )
    `);

    // Auto-create MySQL Performance Indexes for Ultra-Responsive Queries
    try { await mysqlPool.execute(`CREATE INDEX idx_web_user_name ON web_admin_users (username)`); } catch (e) {}
    try { await mysqlPool.execute(`CREATE INDEX idx_mob_user_name ON mobile_pos_users (username)`); } catch (e) {}
    try { await mysqlPool.execute(`CREATE INDEX idx_sales_date_outlet ON sales_transactions (date, outlet_id)`); } catch (e) {}
    try { await mysqlPool.execute(`CREATE INDEX idx_products_outlet ON products (outlet_id, category_id)`); } catch (e) {}

    console.log('✅ Semua tabel relasional MySQL & Index Performa siap');
  } catch (err) {
    console.error('❌ Gagal membuat tabel:', err.message);
  }
};


// Baca masterData dari MySQL (Auto-Sync Relational Tables + JSON Blob)
const getMasterDataFromMySQL = async () => {
  if (!mysqlPool) return null;
  try {
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('MySQL read timeout')), 4000)
    );
    const queryPromise = mysqlPool.execute('SELECT data FROM mris_master_data WHERE id = 1');
    const [rows] = await Promise.race([queryPromise, timeoutPromise]);
    let masterData = null;
    if (rows && rows.length > 0 && rows[0].data) {
      masterData = typeof rows[0].data === 'string' ? JSON.parse(rows[0].data) : rows[0].data;
    }
    if (!masterData || typeof masterData !== 'object') {
      masterData = { ...defaultMasterData };
    }

    // Auto-merge semua transaksi dari tabel relasi MySQL sales_transactions
    // MySQL adalah ground truth — semua transaksi yang masuk via POST /api/pos/transaction
    // langsung tersimpan di tabel ini. Blob (JSON) adalah cache yang bisa out-of-sync.
    // Strategi: selalu union antara blob + MySQL. MySQL menambah yang tidak ada di blob.
    try {
      const [salesRows] = await mysqlPool.execute('SELECT * FROM sales_transactions ORDER BY date DESC, time DESC');
      if (Array.isArray(salesRows) && salesRows.length > 0) {
        const txMap = new Map();
        // Seed dengan data blob terlebih dahulu (blob punya detail lebih lengkap: items, dll)
        (masterData.salesTransactions || []).forEach(t => {
          const k = String(t.id || t.receipt_no || t.receiptNo || '');
          if (k) txMap.set(k, t);
        });
        (masterData.transactions || []).forEach(t => {
          const k = String(t.id || t.receipt_no || t.receiptNo || '');
          if (k && !txMap.has(k)) txMap.set(k, t);
        });

        salesRows.forEach(r => {
          const k = String(r.id || r.receipt_no || '');
          if (!k) return;

          // Blob sudah punya ini dengan data lengkap (items, dll) — skip, jangan overwrite
          if (txMap.has(k)) return;

          const dtStr = typeof r.date === 'string'
            ? r.date.substring(0, 10)
            : (r.date ? (r.date.toISOString ? r.date.toISOString().substring(0, 10) : String(r.date).substring(0, 10)) : '');
          const mappedTx = {
            id: r.id,
            receipt_no: r.receipt_no || r.id,
            receiptNo: r.receipt_no || r.id,
            date: dtStr || '',
            entry_date: dtStr || '',
            transaction_date: dtStr || '',
            time: (r.time && !String(r.time).startsWith('00:00:')) ? String(r.time) : (r.created_at ? (typeof r.created_at === 'string' ? r.created_at.split(' ')[1] : String(r.created_at).substring(11, 19)) : '12:00:00'),
            created_at: r.created_at,
            outlet_id: r.outlet_id,
            branch_id: r.branch_id || r.outlet_id,
            branch_name: r.branch_name || 'Restoran',
            outlet: r.outlet || r.branch_name || 'Restoran',
            customer_name: r.customer_name || 'Pelanggan Umum',
            table_number: r.table_number || 'N/A',
            order_type: r.order_type || 'Dine In',
            subtotal: Number(r.subtotal || r.amount || 0),
            discount: Number(r.discount_amount || 0),
            discount_amount: Number(r.discount_amount || 0),
            amount: Number(r.amount || 0),
            total: Number(r.amount || 0),
            paid_amount: Number(r.paid_amount || r.amount || 0),
            change_amount: Number(r.change_amount || 0),
            payment_method: r.payment_method || 'Cash',
            cashier: r.cashier || 'Kasir POS',
            notes: r.notes || '-',
            status: r.status || 'approved',
            type: r.type || 'sale',
            items: (() => {
              if (r.items_json) {
                try {
                  const parsed = typeof r.items_json === 'string' ? JSON.parse(r.items_json) : r.items_json;
                  if (Array.isArray(parsed) && parsed.length > 0) return parsed;
                } catch (e) {}
              }
              const itemTitle = (r.notes && r.notes !== '-' && !r.notes.startsWith('Pesanan Gantung') && !r.notes.startsWith('Informasi'))
                ? r.notes
                : (r.branch_name ? `Pesanan Menu (${r.branch_name})` : 'Menu Restoran');
              return [{ name: itemTitle, qty: 1, price_unit: Number(r.amount || 0), amount: Number(r.amount || 0) }];
            })()
          };
          txMap.set(k, mappedTx);
        });


        const delSalesSet = new Set((masterData.deletedSalesIds || []).map(x => String(x)));
        const mergedAllTx = Array.from(txMap.values()).filter(t => {
          if (!t) return false;
          const k1 = String(t.id || '');
          const k2 = String(t.receipt_no || '');
          const k3 = String(t.receiptNo || '');
          return !delSalesSet.has(k1) && !delSalesSet.has(k2) && !delSalesSet.has(k3);
        }).sort((a, b) => {
          const dateA = String(a.date || a.entry_date || a.transaction_date || a.created_at || '').substring(0, 10);
          const dateB = String(b.date || b.entry_date || b.transaction_date || b.created_at || '').substring(0, 10);
          if (dateA !== dateB) return dateB.localeCompare(dateA);
          const timeA = String(a.time || '00:00:00');
          const timeB = String(b.time || '00:00:00');
          if (timeA !== timeB) return timeB.localeCompare(timeA);
          const idA = String(a.id || a.receipt_no || '');
          const idB = String(b.id || b.receipt_no || '');
          return idB.localeCompare(idA);
        });
        masterData.salesTransactions = mergedAllTx;
        masterData.transactions = mergedAllTx;
        masterData.outletTransactions = mergedAllTx;
      }
    } catch (tblErr) {
      console.warn('Warning querying sales_transactions table:', tblErr.message);
    }

    return masterData;
  } catch (err) {
    console.error('MySQL read error:', err.message);
    return null;
  }
};

// Simpan masterData ke MySQL dengan Automatic Versioning Snapshot Backup (Rolling 50 Versi)
const saveMasterDataToMySQL = async (masterData, sourceTag = 'general_save') => {
  if (!mysqlPool || !masterData) return false;
  try {
    const json = JSON.stringify(masterData);
    const txCount = Array.isArray(masterData.salesTransactions) ? masterData.salesTransactions.length : 0;

    // 1. Simpan Snapshot ke History Table
    try {
      await mysqlPool.execute(`
        INSERT INTO mris_master_data_history (tx_count, source_tag, data)
        VALUES (?, ?, ?)
      `, [txCount, String(sourceTag || 'auto').substring(0, 100), json]);

      // Batasi history maksimal 50 snapshot terbaru (auto-prune tertua)
      await mysqlPool.execute(`
        DELETE FROM mris_master_data_history
        WHERE id NOT IN (
          SELECT id FROM (
            SELECT id FROM mris_master_data_history ORDER BY id DESC LIMIT 50
          ) as t
        )
      `);
    } catch (histErr) {
      // Non-blocking history snapshot
    }

    // 2. Simpan Current Master Data
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
    // 1. Sync Outlets to MySQL relational table
    const outlets = masterData.outlets || [];
    for (const o of outlets) {
      if (!o || !o.id) continue;
      try {
        await mysqlPool.execute(`
          INSERT INTO outlets (id, code, name, address, location, manager_name, phone, target_omzet, employee_count, status, color)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            code = VALUES(code),
            name = VALUES(name),
            address = VALUES(address),
            location = VALUES(location),
            manager_name = VALUES(manager_name),
            phone = VALUES(phone),
            target_omzet = VALUES(target_omzet),
            employee_count = VALUES(employee_count),
            status = VALUES(status),
            color = VALUES(color)
        `, [
          Number(o.id) || Date.now(),
          String(o.code || `OUT-${o.id}`),
          String(o.name || o.branch_name || 'Outlet Cabang'),
          String(o.address || ''),
          String(o.location || o.address || ''),
          String(o.manager_name || o.manager || ''),
          String(o.phone || ''),
          Number(o.target_omzet || o.monthly_budget || 0),
          Number(o.employee_count || 0),
          String(o.status || 'Aktif'),
          String(o.color || '#3b82f6')
        ]);
      } catch (outletErr) {
        // Duplicate code/id conflict — skip relational sync for this outlet, JSON blob is still correct
        console.warn(`syncToMySQL outlet skip (${o.code || o.id}): ${outletErr.message}`);
      }
    }


    // 2. Sync Web Admin Users & Mobile POS Users to separate relational tables in MySQL
    const webUsers = masterData.webAdminAccounts || [];
    const webUserIds = [];
    for (const u of webUsers) {
      if (!u || !u.id) continue;
      const uId = Number(u.id) || Date.now();
      webUserIds.push(uId);
      const uName = String(u.name || u.username || 'Admin');
      const uUsername = String(u.username || u.name || `admin_${uId}`).toLowerCase().replace(/\s+/g, '_');
      const uPassword = String(u.password || '1234');
      const uRole = String(u.role || 'Super Admin');
      const uOutlet = String(u.outlet || 'Semua Outlet (Central)');
      const uStatus = String(u.status || 'Aktif');

      await mysqlPool.execute(`
        INSERT INTO web_admin_users (id, name, username, password, role, outlet, status)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          name = VALUES(name), username = VALUES(username), password = VALUES(password),
          role = VALUES(role), outlet = VALUES(outlet), status = VALUES(status)
      `, [uId, uName, uUsername, uPassword, uRole, uOutlet, uStatus]);
    }
    if (webUserIds.length > 0) {
      const ph = webUserIds.map(() => '?').join(',');
      await mysqlPool.execute(`DELETE FROM \`web_admin_users\` WHERE id NOT IN (${ph})`, webUserIds);
    } else {
      await mysqlPool.execute(`DELETE FROM \`web_admin_users\``);
    }

    const mobileUsers = masterData.mobileAccounts || [];
    const mobileUserIds = [];
    for (const u of mobileUsers) {
      if (!u || !u.id) continue;
      const uId = Number(u.id) || Date.now();
      mobileUserIds.push(uId);
      const uName = String(u.name || u.username || 'Staf Mobile');
      const uUsername = String(u.username || u.name || `mobile_${uId}`).toLowerCase().replace(/\s+/g, '_');
      const uPassword = String(u.mobileLoginPassword || u.password || '123');
      const uRole = String(u.role || 'Kasir');
      const uOutlet = String(u.outlet || 'Semua Outlet (Central)');
      const uStatus = String(u.status || 'Aktif');
      const canReports = u.canAccessMobileReports ? 1 : 0;
      const repPass = String(u.mobileReportPassword || '');

      await mysqlPool.execute(`
        INSERT INTO mobile_pos_users (id, name, username, password, role, outlet, status, can_access_reports, report_password)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          name = VALUES(name), username = VALUES(username), password = VALUES(password),
          role = VALUES(role), outlet = VALUES(outlet), status = VALUES(status),
          can_access_reports = VALUES(can_access_reports), report_password = VALUES(report_password)
      `, [uId, uName, uUsername, uPassword, uRole, uOutlet, uStatus, canReports, repPass]);
    }
    if (mobileUserIds.length > 0) {
      const ph = mobileUserIds.map(() => '?').join(',');
      await mysqlPool.execute(`DELETE FROM \`mobile_pos_users\` WHERE id NOT IN (${ph})`, mobileUserIds);
    } else {
      await mysqlPool.execute(`DELETE FROM \`mobile_pos_users\``);
    }

    // 3. Sync Categories to MySQL relational table
    const categories = masterData.categories || [];
    for (const c of categories) {
      if (!c || !c.name) continue;
      const cId = Number(c.id) || Date.now();
      await mysqlPool.execute(`
        INSERT INTO categories (id, code, name, type, icon, status)
        VALUES (?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          code = VALUES(code),
          name = VALUES(name),
          type = VALUES(type),
          icon = VALUES(icon),
          status = VALUES(status)
      `, [
        cId,
        String(c.code || `CAT-${cId}`),
        String(c.name).trim(),
        String(c.type || 'income'),
        String(c.icon || 'Utensils'),
        String(c.status || 'Aktif')
      ]);
    }

    // 4. Sync Products to MySQL relational table
    const products = masterData.products || [];
    for (const p of products) {
      if (!p || !p.name) continue;
      const pId = Number(p.id) || Date.now();
      const outIdNum = p.outlet_id && !isNaN(Number(p.outlet_id)) ? Number(p.outlet_id) : null;
      await mysqlPool.execute(`
        INSERT INTO products (id, sku, name, category_id, category_name, price, cost_price, stock, unit, outlet_id, selected_outlet_ids, image_url, description, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          sku = VALUES(sku),
          name = VALUES(name),
          category_id = VALUES(category_id),
          category_name = VALUES(category_name),
          price = VALUES(price),
          cost_price = VALUES(cost_price),
          stock = VALUES(stock),
          unit = VALUES(unit),
          outlet_id = VALUES(outlet_id),
          selected_outlet_ids = VALUES(selected_outlet_ids),
          image_url = VALUES(image_url),
          description = VALUES(description),
          status = VALUES(status)
      `, [
        pId,
        String(p.sku || `PRD-${pId}`),
        String(p.name).trim(),
        p.category_id ? Number(p.category_id) : null,
        String(p.category || p.category_name || ''),
        Number(p.price || 0),
        Number(p.cost_price || p.cost || 0),
        Number(p.stock || 0),
        String(p.unit || 'Porsi'),
        outIdNum,
        Array.isArray(p.selectedOutletIds || p.selected_outlet_ids) ? JSON.stringify(p.selectedOutletIds || p.selected_outlet_ids) : String(p.selectedOutletIds || p.selected_outlet_ids || ''),
        String(p.image_url || p.image || ''),
        String(p.description || ''),
        String(p.status || 'Aktif')
      ]);
    }

    
    // 4b. Sync Ingredients to MySQL relational table
    const ingredients = masterData.ingredients || [];
    for (const ing of ingredients) {
      if (!ing || !ing.name) continue;
      const ingId = String(ing.id || Date.now());
      await mysqlPool.execute(`
        INSERT INTO ingredients (id, code, name, category, category_id, unit, price, cost_price, stock, minimum_stock, outlet_id, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          code = VALUES(code),
          name = VALUES(name),
          category = VALUES(category),
          category_id = VALUES(category_id),
          unit = VALUES(unit),
          price = VALUES(price),
          cost_price = VALUES(cost_price),
          stock = VALUES(stock),
          minimum_stock = VALUES(minimum_stock),
          outlet_id = VALUES(outlet_id),
          status = VALUES(status)
      `, [
        ingId,
        String(ing.code || `BHN-${ingId}`),
        String(ing.name).trim(),
        String(ing.category || ing.category_name || 'Bahan Baku'),
        String(ing.category_id || ''),
        String(ing.unit || 'kg'),
        Number(ing.price || ing.cost || 0),
        Number(ing.cost_price || ing.cost || ing.price || 0),
        Number(ing.stock || ing.current_stock || 0),
        Number(ing.min_stock || ing.minimum_stock || 0),
        ing.outlet_id ? Number(ing.outlet_id) : null,
        String(ing.status || 'Aktif')
      ]);
    }

    // 5. Sync Transactions to MySQL relational table (Combining Sales & Expenses safely)
    const txMap = new Map();
    [...(masterData.salesTransactions || []), ...(masterData.transactions || [])].forEach(t => {
      if (t && t.id) txMap.set(String(t.id), t);
    });
    const transactions = Array.from(txMap.values());
    for (const t of transactions) {
      if (!t || !t.id) continue;
      const txId = String(t.id);
      const txDate = typeof t.date === 'string' ? t.date.substring(0, 10) : (t.entry_date || (t.created_at ? String(t.created_at).substring(0, 10) : new Date().toISOString().split('T')[0]));
      let txTime = '12:00:00';
      if (t.time && typeof t.time === 'string') {
        const cleanT = t.time.replace(/\./g, ':').trim();
        const p = cleanT.split(':');
        if (p.length >= 2) {
          txTime = `${(p[0] || '00').padStart(2, '0')}:${(p[1] || '00').padStart(2, '0')}:${(p[2] || '00').substring(0, 2).padStart(2, '0')}`.substring(0, 8);
        }
      } else if (t.created_at) {
        const caStr = String(t.created_at);
        if (caStr.includes(' ')) txTime = caStr.split(' ')[1]?.substring(0, 8) || '12:00:00';
        else if (caStr.includes('T')) txTime = caStr.split('T')[1]?.substring(0, 8) || '12:00:00';
      }
      const outletId = Number(t.outlet_id || t.branch_id || 1);
      const branchName = t.branch_name || t.outlet || '';
      const customerName = t.customer_name || t.customer || 'Pelanggan Umum';
      const tableNumber = t.table_number || t.table || '';
      const orderType = t.order_type || (t.type === 'expense' ? 'Pengeluaran' : 'Dine In');
      const amount = Number(t.amount || t.total || 0);
      const paidAmount = Number(t.paid_amount || t.paid || amount);
      const changeAmount = Number(t.change_amount || t.change || 0);
      const paymentMethod = t.payment_method || 'Cash';
      const cashier = t.cashier || t.author || 'Kasir';
      const notes = t.notes || '';
      const status = t.status || 'approved';
      const txType = t.type === 'expense' ? 'expense' : 'income';

      await mysqlPool.execute(`
        INSERT INTO sales_transactions 
          (id, receipt_no, date, time, outlet_id, branch_id, branch_name, outlet, customer_name, table_number, order_type, subtotal, discount_amount, service_charge, tax_amount, adjustment_amount, amount, paid_amount, change_amount, payment_method, cashier, notes, status, type)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          date = VALUES(date),
          time = VALUES(time),
          outlet_id = VALUES(outlet_id),
          branch_id = VALUES(branch_id),
          branch_name = VALUES(branch_name),
          outlet = VALUES(outlet),
          customer_name = VALUES(customer_name),
          table_number = VALUES(table_number),
          order_type = VALUES(order_type),
          subtotal = VALUES(subtotal),
          amount = VALUES(amount),
          paid_amount = VALUES(paid_amount),
          change_amount = VALUES(change_amount),
          payment_method = VALUES(payment_method),
          cashier = VALUES(cashier),
          notes = VALUES(notes),
          status = VALUES(status)
      `, [txId, txId, txDate, txTime, outletId, outletId, branchName, branchName, customerName, tableNumber, orderType, amount, 0, 0, 0, 0, amount, paidAmount, changeAmount, paymentMethod, cashier, notes, status, txType]);
    }

    // 6. Sync Shift Closings to MySQL relational table
    const shiftClosings = masterData.shiftClosings || masterData.closedShifts || masterData.approvedFinanceDaily || [];
    for (const sc of shiftClosings) {
      if (!sc || !sc.id) continue;
      await mysqlPool.execute(`
        INSERT INTO shift_closings 
          (id, date, outlet_id, branch_name, author_name, opening_float, net_sales, cash_sales, non_cash_sales, total_expense, expected_cash, cash_physical, cash_variance, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          date = VALUES(date),
          outlet_id = VALUES(outlet_id),
          branch_name = VALUES(branch_name),
          author_name = VALUES(author_name),
          opening_float = VALUES(opening_float),
          net_sales = VALUES(net_sales),
          cash_sales = VALUES(cash_sales),
          non_cash_sales = VALUES(non_cash_sales),
          total_expense = VALUES(total_expense),
          expected_cash = VALUES(expected_cash),
          cash_physical = VALUES(cash_physical),
          cash_variance = VALUES(cash_variance),
          status = VALUES(status)
      `, [
        String(sc.id),
        sc.date || new Date().toISOString().split('T')[0],
        Number(sc.outlet_id || 1),
        sc.branch_name || '',
        sc.author_name || sc.cashier_name || sc.cashier || 'Kasir',
        Number(sc.opening_float || sc.initial_cash || 0),
        Number(sc.net_sales || sc.gross_sales || sc.total_sales || 0),
        Number(sc.cash_sales || 0),
        Number(sc.non_cash_sales || 0),
        Number(sc.total_expense || sc.petty_expense || 0),
        Number(sc.expected_cash || 0),
        Number(sc.cash_physical || sc.physical_cash || 0),
        Number(sc.cash_variance || sc.variance || 0),
        sc.status || 'ditunda'
      ]);
    }

    // 7. Sync Stock Movements & Opname Reports to MySQL relational table
    const stockMovements = masterData.stockMovement || masterData.stockOpname || [];
    for (const sm of stockMovements) {
      if (!sm) continue;
      const smDate = sm.date || new Date().toISOString().split('T')[0];
      const smTime = sm.time || '00:00:00';
      const smName = String(sm.item_name || sm.ingredient || sm.name || 'Bahan').trim();
      const smType = String(sm.type || 'OUT');
      const smQty = Number(sm.qty || sm.quantity || 0);
      const smUnit = String(sm.unit || 'kg');
      const smOutletId = sm.outlet_id ? Number(sm.outlet_id) : null;
      const smSource = String(sm.source_outlet || sm.branch_name || '');
      const smTarget = String(sm.target_outlet || '');
      const smReason = String(sm.reason || sm.supplier || sm.notes || '');
      const smUser = String(sm.created_by || sm.user_name || sm.requested_by || 'Staf');

      try {
        await mysqlPool.execute(`
          INSERT INTO stock_movement (date, time, ingredient_name, type, qty, unit, outlet_id, source_outlet, target_outlet, reason, user_name)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [smDate, smTime, smName, smType, smQty, smUnit, smOutletId, smSource, smTarget, smReason, smUser]);
      } catch (smErr) {}
    }
  } catch (err) {
    console.error('syncToMySQL error:', err.message);
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

// Database Inspector Endpoints (phpMyAdmin-style UI)
app.get('/api/db/tables', async (req, res) => {
  if (!mysqlPool) {
    return res.json({ status: 'standalone', database: 'mris_db (JSON Fallback)', tables: [] });
  }
  try {
    const [tables] = await mysqlPool.query("SHOW TABLES");
    const tableList = [];
    for (const row of tables) {
      const tableName = Object.values(row)[0];
      const [[cnt]] = await mysqlPool.query(`SELECT COUNT(*) as count FROM \`${tableName}\``);
      tableList.push({ name: tableName, count: cnt.count });
    }
    res.json({ status: 'connected', database: 'mris_db', tables: tableList });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/db/table/:name', async (req, res) => {
  if (!mysqlPool) return res.status(400).json({ error: 'MySQL tidak aktif' });
  const tableName = req.params.name;
  try {
    const [rows] = await mysqlPool.query(`SELECT * FROM \`${tableName}\` ORDER BY 1 DESC LIMIT 100`);
    const [columns] = await mysqlPool.query(`SHOW COLUMNS FROM \`${tableName}\``);
    res.json({ table: tableName, columns, rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/db/query', async (req, res) => {
  if (!mysqlPool) return res.status(400).json({ error: 'MySQL server tidak terhubung' });
  const { sql } = req.body;
  if (!sql || typeof sql !== 'string') return res.status(400).json({ error: 'Perintah SQL tidak boleh kosong' });

  try {
    const [results] = await mysqlPool.query(sql);
    res.json({ success: true, results });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/db/row/delete', async (req, res) => {
  if (!mysqlPool) return res.status(400).json({ error: 'MySQL server tidak terhubung' });
  const { table, id, pkColumn = 'id' } = req.body;
  if (!table || id === undefined) return res.status(400).json({ error: 'Table dan ID wajib diisi' });

  try {
    await mysqlPool.execute(`DELETE FROM \`${table}\` WHERE \`${pkColumn}\` = ?`, [id]);

    // Sync back to masterData
    try {
      let masterData = await getMasterDataFromMySQL();
      if (masterData) {
        const idStr = String(id);
        if (table === 'sales_transactions' || table === 'transactions') {
          masterData.salesTransactions = (masterData.salesTransactions || []).filter(t => String(t.id) !== idStr);
          masterData.transactions = (masterData.transactions || []).filter(t => String(t.id) !== idStr);
        } else if (table === 'shift_closings') {
          masterData.shiftClosings = (masterData.shiftClosings || []).filter(s => String(s.id) !== idStr);
          masterData.closedShifts = (masterData.closedShifts || []).filter(s => String(s.id) !== idStr);
        } else if (table === 'outlets') {
          masterData.outlets = (masterData.outlets || []).filter(o => String(o.id) !== idStr);
        } else if (table === 'users') {
          masterData.userAccounts = (masterData.userAccounts || []).filter(u => String(u.id) !== idStr);
          masterData.users = (masterData.users || []).filter(u => String(u.id) !== idStr);
        } else if (table === 'products') {
          masterData.products = (masterData.products || []).filter(p => String(p.id) !== idStr);
        } else if (table === 'categories') {
          masterData.categories = (masterData.categories || []).filter(c => String(c.id) !== idStr);
        }
        await saveMasterDataToMySQL(masterData);
      }
    } catch (syncErr) {}

    res.json({ success: true, message: `Baris ID ${id} berhasil dihapus dari tabel ${table}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/db/row/update', async (req, res) => {
  if (!mysqlPool) return res.status(400).json({ error: 'MySQL server tidak terhubung' });
  const { table, id, pkColumn = 'id', data } = req.body;
  if (!table || id === undefined || !data || typeof data !== 'object') {
    return res.status(400).json({ error: 'Table, ID, dan Data wajib diisi' });
  }

  try {
    const keys = Object.keys(data).filter(k => k !== pkColumn);
    if (keys.length === 0) return res.status(400).json({ error: 'Tidak ada kolom yang diubah' });

    const setClause = keys.map(k => `\`${k}\` = ?`).join(', ');
    const values = keys.map(k => data[k]);

    await mysqlPool.execute(`UPDATE \`${table}\` SET ${setClause} WHERE \`${pkColumn}\` = ?`, [...values, id]);

    // SYNC BACK TO mris_master_data INSTANTLY
    try {
      let masterData = await getMasterDataFromMySQL();
      if (masterData) {
        const idStr = String(id);
        const updateObjInArr = (arr = []) => arr.map(item => {
          if (item && (String(item.id) === idStr || String(item.code) === idStr)) {
            return { ...item, ...data };
          }
          return item;
        });

        if (table === 'sales_transactions' || table === 'transactions') {
          masterData.salesTransactions = updateObjInArr(masterData.salesTransactions || []);
          masterData.transactions = updateObjInArr(masterData.transactions || []);
        } else if (table === 'outlets') {
          masterData.outlets = updateObjInArr(masterData.outlets || []);
        } else if (table === 'products') {
          masterData.products = updateObjInArr(masterData.products || []);
        } else if (table === 'categories') {
          masterData.categories = updateObjInArr(masterData.categories || []);
        } else if (table === 'users') {
          masterData.users = updateObjInArr(masterData.users || []);
          masterData.userAccounts = updateObjInArr(masterData.userAccounts || []);
          masterData.webAdminAccounts = updateObjInArr(masterData.webAdminAccounts || []);
          masterData.mobileAccounts = updateObjInArr(masterData.mobileAccounts || []);
        } else if (table === 'shift_closings') {
          masterData.shiftClosings = updateObjInArr(masterData.shiftClosings || []);
          masterData.closedShifts = updateObjInArr(masterData.closedShifts || []);
          masterData.shift_closings = updateObjInArr(masterData.shift_closings || []);
        }
        masterData._lastUpdated = Date.now();
        await saveMasterDataToMySQL(masterData);
      }
    } catch (syncErr) {
      console.error('sync back update error:', syncErr.message);
    }

    res.json({ success: true, message: `Baris ID ${id} berhasil diperbarui di tabel ${table} & mris_master_data` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Standalone phpMyAdmin / Adminer Web Interface Route (Full SSR: Sidebar & Initial Table Rows)
app.get(['/phpmyadmin', '/phpmyadmin/*', '/adminer', '/adminer/*', '/api/phpmyadmin', '/api/phpmyadmin/*', '/api/db-explorer'], async (req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  let tableListHtml = '';
  let firstTable = '';
  let initialContentHtml = '<div style="padding: 50px; text-align: center; color: #94a3b8;"><h2>Selamat datang di phpMyAdmin (mris_db)</h2></div>';
  let initialTableData = { table: '', columns: [], rows: [] };

  try {
    if (mysqlPool) {
      try {
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('MySQL query timeout')), 1500)
        );
        const queryPromise = mysqlPool.query("SHOW TABLES");
        const [tables] = await Promise.race([queryPromise, timeoutPromise]);

        const list = [];
        for (const row of tables) {
          const tableName = Object.values(row)[0];
          try {
            const [[cnt]] = await mysqlPool.query(`SELECT COUNT(*) as count FROM \`${tableName}\``);
            list.push({ name: tableName, count: cnt.count });
          } catch (e) {
            list.push({ name: tableName, count: 0 });
          }
        }
        if (list.length > 0) {
          firstTable = list[0].name;
          tableListHtml = list.map(t =>
            `<div class="table-item ${t.name === firstTable ? 'active' : ''}" data-tablename="${t.name}" onclick="selectTable('${t.name}')">` +
              `<span>📂 ${t.name}</span>` +
              `<span class="badge">${t.count}</span>` +
            `</div>`
          ).join('');

          // SSR Data Rows for First Table
          try {
            const [rows] = await mysqlPool.query(`SELECT * FROM \`${firstTable}\` ORDER BY 1 DESC LIMIT 100`);
            const [columns] = await mysqlPool.query(`SHOW COLUMNS FROM \`${firstTable}\``);
            initialTableData = { table: firstTable, columns, rows };

            if (!rows || rows.length === 0) {
              initialContentHtml = `<div style="padding:40px; text-align:center; color:#94a3b8;">Tabel <b>${firstTable}</b> masih kosong (0 records).</div>`;
            } else {
              const cols = columns.map(c => c.Field);
              const pkCol = columns.find(c => c.Key === 'PRI')?.Field || cols[0] || 'id';
              let html = `<div style="margin-bottom:12px; color:#94a3b8; font-weight:700;">Menampilkan ${rows.length} baris (Akses Edit & Hapus Aktif):</div>`;
              html += '<table><thead><tr><th style="width:110px;">Aksi</th>' + cols.map(c => '<th>' + c + '</th>').join('') + '</tr></thead><tbody>';
              rows.forEach((row, idx) => {
                const rowId = row[pkCol] !== undefined ? row[pkCol] : row.id;
                html += '<tr>';
                html += '<td>';
                html += '<button class="btn-edit" onclick="openEditModal(' + idx + ')">✏️ Edit</button>';
                html += '<button class="btn-delete" onclick="confirmDeleteRow(\'' + rowId + '\')">🗑️ Hapus</button>';
                html += '</td>';
                html += cols.map(c => {
                  let val = row[c];
                  if (typeof val === 'object' && val !== null) val = JSON.stringify(val);
                  return '<td title="' + (val || '') + '">' + (val !== null && val !== undefined ? String(val) : '<i style="color:#64748b">NULL</i>') + '</td>';
                }).join('');
                html += '</tr>';
              });
              html += '</tbody></table>';
              initialContentHtml = html;
            }
          } catch (ssrErr) {
            initialContentHtml = `<div style="padding:20px; color:#ef4444;">Gagal mengambil data tabel ${firstTable}: ${ssrErr.message}</div>`;
          }

        } else {
          tableListHtml = '<div style="padding:15px; color:#ef4444;">Tidak ada tabel di database mris_db</div>';
        }
      } catch (err) {
        console.error('phpMyAdmin SSR mysql query error:', err.message);
        tableListHtml = '<div style="padding:15px; color:#94a3b8;">Memuat tabel via browser...</div>';
      }
    } else {
      tableListHtml = '<div style="padding:15px; color:#ef4444;">MySQL belum terhubung di server</div>';
    }
  } catch (globalErr) {
    console.error('phpMyAdmin global route error:', globalErr.message);
    tableListHtml = '<div style="padding:15px; color:#94a3b8;">Memuat tabel via browser...</div>';
  }

  res.send(`<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>phpMyAdmin - MRIS Database Manager (mris_db)</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Fira+Code:wght@400;600&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Inter', system-ui, sans-serif; background: #0f172a; color: #f8fafc; display: flex; height: 100vh; overflow: hidden; font-size: 13px; }
    .sidebar { width: 270px; background: #1e293b; border-right: 1px solid #334155; display: flex; flex-direction: column; flex-shrink: 0; }
    .sidebar-header { padding: 16px; border-bottom: 1px solid #334155; display: flex; align-items: center; justify-content: space-between; background: #0f172a; }
    .sidebar-header h2 { font-size: 0.95rem; font-weight: 800; color: #38bdf8; display: flex; align-items: center; gap: 6px; }
    .table-list { flex: 1; overflow-y: auto; padding: 10px; }
    .table-item { display: flex; align-items: center; justify-content: space-between; padding: 8px 12px; border-radius: 8px; cursor: pointer; color: #94a3b8; font-weight: 600; transition: all 0.15s ease; margin-bottom: 3px; }
    .table-item:hover { background: #334155; color: #f8fafc; }
    .table-item.active { background: #0284c7; color: #ffffff; font-weight: 700; }
    .badge { background: rgba(255,255,255,0.15); color: inherit; padding: 2px 7px; border-radius: 12px; font-size: 11px; font-weight: 800; }
    .main { flex: 1; display: flex; flex-direction: column; overflow: hidden; background: #0f172a; }
    .topbar { background: #1e293b; padding: 14px 20px; border-bottom: 1px solid #334155; display: flex; align-items: center; justify-content: space-between; }
    .tabs { display: flex; gap: 6px; }
    .tab-btn { padding: 6px 14px; border-radius: 6px; border: 1px solid #334155; background: #0f172a; color: #94a3b8; font-weight: 700; cursor: pointer; font-size: 12px; }
    .tab-btn.active { background: #0284c7; color: #fff; border-color: #0284c7; }
    .content-area { flex: 1; overflow: auto; padding: 20px; }
    table { width: 100%; border-collapse: collapse; background: #1e293b; border-radius: 8px; overflow: hidden; border: 1px solid #334155; }
    th { background: #0f172a; color: #38bdf8; text-align: left; padding: 10px 14px; font-weight: 800; font-size: 12px; border-bottom: 1px solid #334155; position: sticky; top: 0; z-index: 2; }
    td { padding: 10px 14px; border-bottom: 1px solid #334155; color: #cbd5e1; max-width: 300px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    tr:hover td { background: rgba(56, 189, 248, 0.05); }
    .btn-edit { background: #3b82f6; color: #fff; border: none; padding: 4px 10px; border-radius: 5px; font-weight: 700; font-size: 11px; cursor: pointer; margin-right: 4px; }
    .btn-delete { background: #ef4444; color: #fff; border: none; padding: 4px 10px; border-radius: 5px; font-weight: 700; font-size: 11px; cursor: pointer; }
    .btn-edit:hover { background: #2563eb; }
    .btn-delete:hover { background: #dc2626; }
    .sql-input { width: 100%; height: 110px; background: #1e293b; border: 1px solid #334155; border-radius: 8px; color: #38bdf8; font-family: 'Fira Code', monospace; padding: 12px; font-size: 13px; outline: none; margin-bottom: 10px; resize: vertical; }
    .run-btn { background: #10b981; color: #fff; border: none; padding: 8px 18px; border-radius: 6px; font-weight: 800; cursor: pointer; }
    .run-btn:hover { background: #059669; }
    .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; z-index: 1000; }
    .modal-card { background: #1e293b; border: 1px solid #334155; border-radius: 12px; padding: 24px; width: 500px; max-width: 90vw; max-height: 85vh; overflow-y: auto; color: #f8fafc; }
    .modal-field { margin-bottom: 12px; }
    .modal-field label { display: block; font-size: 11px; font-weight: 800; color: #38bdf8; margin-bottom: 4px; text-transform: uppercase; }
    .modal-field input, .modal-field textarea { width: 100%; background: #0f172a; border: 1px solid #334155; color: #fff; padding: 8px 12px; border-radius: 6px; font-size: 13px; outline: none; }
  </style>
</head>
<body>
  <div class="sidebar">
    <div class="sidebar-header">
      <h2>🗄️ phpMyAdmin <span>(mris_db)</span></h2>
      <button onclick="window.location.reload()" style="background:none; border:none; color:#38bdf8; cursor:pointer; font-size:14px;" title="Refresh">🔄</button>
    </div>
    <div class="table-list" id="tableList">
      ${tableListHtml}
    </div>
  </div>
  <div class="main">
    <div class="topbar">
      <div>
        <h3 id="currentTableTitle" style="font-size:1.1rem; font-weight:800; color:#f8fafc;">Tabel: ${firstTable || 'Database'}</h3>
        <span id="dbStatus" style="font-size:11px; color:#10b981; font-weight:700;">🟢 Full Access: Edit & Hapus Aktif (mris_db)</span>
      </div>
      <div class="tabs">
        <button class="tab-btn active" id="btn-browse" onclick="switchTab('browse')">🔍 Browse Data</button>
        <button class="tab-btn" id="btn-structure" onclick="switchTab('structure')">📐 Structure</button>
        <button class="tab-btn" id="btn-sql" onclick="switchTab('sql')">⚡ SQL Console</button>
      </div>
    </div>
    <div class="content-area" id="contentArea">
      ${initialContentHtml}
    </div>
  </div>

  <div id="editModalOverlay" class="modal-overlay" style="display:none;">
    <div class="modal-card">
      <h3 style="margin-bottom:16px; color:#38bdf8;">✏️ Edit Baris Data</h3>
      <div id="modalFields"></div>
      <div style="display:flex; justify-content:flex-end; gap:10px; margin-top:20px;">
        <button onclick="closeEditModal()" style="background:#475569; color:#fff; border:none; padding:8px 16px; border-radius:6px; font-weight:700; cursor:pointer;">Batal</button>
        <button onclick="submitRowUpdate()" style="background:#10b981; color:#fff; border:none; padding:8px 16px; border-radius:6px; font-weight:800; cursor:pointer;">Simpan Perubahan</button>
      </div>
    </div>
  </div>

  <script>
    let activeTable = '';
    let activeTab = 'browse';
    let tableDataCache = {};
    let currentEditRow = null;
    let pkColName = 'id';

    function escapeHtml(str) {
      if (str === null || str === undefined) return '<i style="color:#64748b">NULL</i>';
      return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
    }

    async function loadTables() {
      const container = document.getElementById('tableList');
      if (!container) return;
      try {
        const apiUrl = window.location.origin + '/api/db/tables';
        const res = await fetch(apiUrl, { cache: 'no-store' });
        const data = await res.json();
        const list = Array.isArray(data) ? data : (data.tables || []);
        if (list && list.length > 0) {
          container.innerHTML = list.map(function(t) {
            const isActive = t.name === activeTable;
            return '<div class="table-item ' + (isActive ? 'active' : '') + '" data-tablename="' + t.name + '" onclick="selectTable(\'' + t.name + '\')">' +
              '<span>📂 ' + t.name + '</span>' +
              '<span class="badge">' + (t.count !== undefined ? t.count : 0) + '</span>' +
            '</div>';
          }).join('');

          if (!activeTable && list.length > 0) {
            selectTable(list[0].name);
          }
        } else {
          container.innerHTML = '<div style="padding:15px; color:#ef4444;">Tidak ada tabel di MySQL mris_db</div>';
        }
      } catch (err) {
        console.error('Gagal loadTables:', err);
        container.innerHTML = '<div style="padding:15px; color:#ef4444;">Gagal memuat tabel: ' + (err.message || 'Error') + '</div>';
      }
    }

    async function selectTable(tableName) {
      if (!tableName) return;
      activeTable = tableName;
      const titleEl = document.getElementById('currentTableTitle');
      if (titleEl) titleEl.innerText = 'Tabel: ' + tableName;

      const items = document.querySelectorAll('.table-item');
      items.forEach(function(el) {
        if (el.getAttribute('data-tablename') === tableName) {
          el.classList.add('active');
        } else {
          el.classList.remove('active');
        }
      });

      await loadTableData();
    }

    async function loadTableData() {
      if (!activeTable) return;
      const content = document.getElementById('contentArea');
      content.innerHTML = '<div style="padding:20px; color:#38bdf8;">Memuat data tabel '+activeTable+'...</div>';

      try {
        const apiUrl = window.location.origin + '/api/db/table/' + activeTable;
        const res = await fetch(apiUrl, { cache: 'no-store' });
        const data = await res.json();
        tableDataCache = data;

        const primaryCol = (data.columns || []).find(c => c.Key === 'PRI');
        pkColName = primaryCol ? primaryCol.Field : (data.columns?.[0]?.Field || 'id');

        if (activeTab === 'browse') renderBrowse(data);
        else if (activeTab === 'structure') renderStructure(data);
        else if (activeTab === 'sql') renderSqlConsole();
      } catch (err) {
        content.innerHTML = '<div style="padding:20px; color:#ef4444;">Gagal mengambil data tabel: ' + (err.message || 'Error') + '</div>';
      }
    }

    function switchTab(tabName) {
      activeTab = tabName;
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      const btn = document.getElementById('btn-' + tabName);
      if (btn) btn.classList.add('active');

      if (activeTab === 'sql') renderSqlConsole();
      else if (tableDataCache.table) {
        if (activeTab === 'browse') renderBrowse(tableDataCache);
        else if (activeTab === 'structure') renderStructure(tableDataCache);
      }
    }

    function renderBrowse(data) {
      const content = document.getElementById('contentArea');
      try {
        if (!data || !data.rows || data.rows.length === 0) {
          content.innerHTML = '<div style="padding:40px; text-align:center; color:#94a3b8;">Tabel <b>' + (data ? data.table : activeTable) + '</b> masih kosong (0 records).</div>';
          return;
        }
        const cols = (data.columns || []).map(c => typeof c === 'string' ? c : c.Field);
        let html = '<div style="margin-bottom:12px; color:#94a3b8; font-weight:700;">Menampilkan ' + data.rows.length + ' baris (Akses Edit & Hapus Aktif):</div>';
        html += '<table><thead><tr><th style="width:110px;">Aksi</th>' + cols.map(c => '<th>' + c + '</th>').join('') + '</tr></thead><tbody>';
        data.rows.forEach((row, idx) => {
          const rowId = row[pkColName] !== undefined ? row[pkColName] : row.id;
          html += '<tr>';
          html += '<td>';
          html += '<button class="btn-edit" onclick="openEditModal(' + idx + ')">✏️ Edit</button>';
          html += '<button class="btn-delete" onclick="confirmDeleteRow(\'' + rowId + '\')">🗑️ Hapus</button>';
          html += '</td>';
          html += cols.map(c => {
            let val = row[c];
            if (typeof val === 'object' && val !== null) val = JSON.stringify(val);
            return '<td title="' + (val !== null && val !== undefined ? String(val).replace(/"/g, '&quot;') : '') + '">' + escapeHtml(val) + '</td>';
          }).join('');
          html += '</tr>';
        });
        html += '</tbody></table>';
        content.innerHTML = html;
      } catch (err) {
        console.error('renderBrowse error:', err);
        content.innerHTML = '<div style="padding:20px; color:#ef4444;">Error render tabel: ' + err.message + '</div>';
      }
    }

    function renderStructure(data) {
      const content = document.getElementById('contentArea');
      try {
        let html = '<table><thead><tr><th>Field</th><th>Type</th><th>Null</th><th>Key</th><th>Default</th></tr></thead><tbody>';
        (data.columns || []).forEach(c => {
          html += '<tr><td style="font-weight:700; color:#38bdf8;">' + c.Field + '</td><td>' + c.Type + '</td><td>' + c.Null + '</td><td>' + (c.Key || '-') + '</td><td>' + (c.Default || 'NULL') + '</td></tr>';
        });
        html += '</tbody></table>';
        content.innerHTML = html;
      } catch (err) {
        content.innerHTML = '<div style="padding:20px; color:#ef4444;">Error structure: ' + err.message + '</div>';
      }
    }

    function renderSqlConsole() {
      const content = document.getElementById('contentArea');
      content.innerHTML = '<div style="margin-bottom:15px;">' +
        '<h4 style="margin-bottom:8px; color:#38bdf8;">⚡ SQL Query Runner (SELECT / UPDATE / DELETE / INSERT / ALTER)</h4>' +
        '<textarea id="sqlQuery" class="sql-input">SELECT * FROM ' + (activeTable || 'sales_transactions') + ' LIMIT 50;</textarea>' +
        '<button class="run-btn" onclick="runSqlQuery()">Jalankan Perintah SQL</button>' +
      '</div>' +
      '<div id="sqlResult"></div>';
    }

    async function runSqlQuery() {
      const sql = document.getElementById('sqlQuery').value;
      const resContainer = document.getElementById('sqlResult');
      resContainer.innerHTML = '<div style="color:#38bdf8; padding:10px;">Menjalankan SQL...</div>';

      try {
        const res = await fetch('/api/db/query', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sql })
        });
        const data = await res.json();
        if (data.error) {
          resContainer.innerHTML = '<div style="color:#ef4444; padding:10px; background:rgba(239,68,68,0.1); border-radius:6px;">❌ ' + data.error + '</div>';
        } else if (data.results && Array.isArray(data.results) && data.results.length > 0) {
          const cols = Object.keys(data.results[0]);
          let html = '<table style="margin-top:10px;"><thead><tr>' + cols.map(c => '<th>' + c + '</th>').join('') + '</tr></thead><tbody>';
          data.results.forEach(row => {
            html += '<tr>' + cols.map(c => '<td>' + (row[c] !== null ? row[c] : 'NULL') + '</td>').join('') + '</tr>';
          });
          html += '</tbody></table>';
          resContainer.innerHTML = html;
        } else {
          resContainer.innerHTML = '<div style="color:#10b981; padding:10px;">✅ Perintah SQL berhasil dijalankan.</div>';
          loadTableData();
        }
      } catch (err) {
        resContainer.innerHTML = '<div style="color:#ef4444; padding:10px;">❌ Query Error</div>';
      }
    }

    function openEditModal(rowIndex) {
      if (!tableDataCache.rows || !tableDataCache.rows[rowIndex]) return;
      currentEditRow = tableDataCache.rows[rowIndex];
      const fieldsContainer = document.getElementById('modalFields');
      const cols = tableDataCache.columns.map(c => c.Field);
      
      let html = '';
      cols.forEach(c => {
        let val = currentEditRow[c];
        if (typeof val === 'object' && val !== null) val = JSON.stringify(val);
        const isPk = c === pkColName;
        html += '<div class="modal-field">' +
          '<label>' + c + ' ' + (isPk ? '(PRIMARY KEY)' : '') + '</label>' +
          '<input type="text" id="edit_col_' + c + '" value="' + (val !== null && val !== undefined ? String(val).replace(/"/g, '&quot;') : '') + '" ' + (isPk ? 'disabled' : '') + ' />' +
        '</div>';
      });

      fieldsContainer.innerHTML = html;
      document.getElementById('editModalOverlay').style.display = 'flex';
    }

    function closeEditModal() {
      document.getElementById('editModalOverlay').style.display = 'none';
      currentEditRow = null;
    }

    async function submitRowUpdate() {
      if (!currentEditRow) return;
      const rowId = currentEditRow[pkColName];
      const cols = tableDataCache.columns.map(c => c.Field);
      const updateData = {};

      cols.forEach(c => {
        if (c !== pkColName) {
          const inputEl = document.getElementById('edit_col_' + c);
          if (inputEl) updateData[c] = inputEl.value;
        }
      });

      try {
        const res = await fetch('/api/db/row/update', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            table: activeTable,
            id: rowId,
            pkColumn: pkColName,
            data: updateData
          })
        });
        const result = await res.json();
        if (result.success) {
          alert('✅ ' + result.message);
          closeEditModal();
          loadTableData();
        } else {
          alert('❌ Gagal memperbarui data: ' + (result.error || 'Unknown error'));
        }
      } catch (err) {
        alert('❌ Gagal mengirim update ke server');
      }
    }

    async function confirmDeleteRow(rowId) {
      if (!confirm('⚠️ YAKIN INGIN MENGHAPUS BARIS DENGAN ID "' + rowId + '" DARI TABEL ' + activeTable.toUpperCase() + '?')) {
        return;
      }

      try {
        const res = await fetch('/api/db/row/delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            table: activeTable,
            id: rowId,
            pkColumn: pkColName
          })
        });
        const result = await res.json();
        if (result.success) {
          alert('✅ ' + result.message);
          loadTableData();
        } else {
          alert('❌ Gagal menghapus baris: ' + (result.error || 'Unknown error'));
        }
      } catch (err) {
        alert('❌ Gagal menghapus baris dari server');
      }
    }

    window.selectTable = async function(tableName) {
      if (!tableName) return;
      activeTable = tableName;
      const titleEl = document.getElementById('currentTableTitle');
      if (titleEl) titleEl.innerText = 'Tabel: ' + tableName;

      const items = document.querySelectorAll('.table-item');
      items.forEach(function(el) {
        if (el.getAttribute('data-tablename') === tableName) {
          el.classList.add('active');
        } else {
          el.classList.remove('active');
        }
      });

      loadTableData();
    };

    // Event listener otomatis untuk klik tabel di sidebar
    document.addEventListener('click', function(e) {
      const item = e.target.closest('.table-item');
      if (item) {
        const tbl = item.getAttribute('data-tablename');
        if (tbl) {
          window.selectTable(tbl);
        }
      }
    });

    // Auto-load tabel pertama dari DOM saat halaman dibuka
    function initAutoLoad() {
      const firstItem = document.querySelector('.table-item');
      if (firstItem) {
        const firstTbl = firstItem.getAttribute('data-tablename');
        if (firstTbl) window.selectTable(firstTbl);
      } else {
        loadTables();
      }
    }

    if (document.readyState === 'complete' || document.readyState === 'interactive') {
      setTimeout(initAutoLoad, 100);
    } else {
      document.addEventListener('DOMContentLoaded', initAutoLoad);
    }
  </script>
</body>
</html>`);
});

// Auto-Deploy Webhook Endpoint for Instant VPS Deployment
app.all('/api/webhook/deploy', (req, res) => {
  const secret = req.query.secret || req.body?.secret || req.headers['x-deploy-secret'];
  const DEPLOY_SECRET = process.env.DEPLOY_SECRET || 'mris_deploy_secret_2026';

  if (secret !== DEPLOY_SECRET) {
    return res.status(403).json({ error: 'Unauthorized deploy secret' });
  }

  res.json({ success: true, message: '🚀 Deployment command triggered on VPS in background...' });

  // Step 1: jalankan deploy.sh (atau fallback git pull + pm2 restart)
  // Step 2: SELALU rebuild web_admin setelah deploy agar dist ter-update
  const getProjectDir = `DIR="/var/www/erp-barokah"; if [ -d "/var/www/ERPBAROKAH" ]; then DIR="/var/www/ERPBAROKAH"; elif [ -d "/var/www/MRIS" ]; then DIR="/var/www/MRIS"; fi; echo $DIR`;
  const deployCmd = `
    if [ -f "/var/www/deploy.sh" ]; then
      bash /var/www/deploy.sh;
    fi;
    DIR="/var/www/erp-barokah";
    if [ -d "/var/www/ERPBAROKAH" ]; then DIR="/var/www/ERPBAROKAH"; elif [ -d "/var/www/MRIS" ]; then DIR="/var/www/MRIS"; fi;
    cd "$DIR" && git fetch origin && git reset --hard origin/main && echo "✅ git pull done";
    cd "$DIR/web_admin" && npm run build && echo "✅ web_admin build done" && cp -r dist/* ../dist/ && echo "✅ dist copied";
    pm2 reload all || pm2 restart all || true;
  `;

  exec(deployCmd, { maxBuffer: 1024 * 1024 * 10 }, (error, stdout, stderr) => {
    if (error) {
      console.error('❌ Auto-deploy failed:', error.message);
      console.error('stderr:', stderr);
      return;
    }
    console.log('✅ Auto-deploy output:\n', stdout);
  });
});

// Endpoint khusus: force rebuild web_admin saja (tanpa full deploy)
// Berguna untuk memaksa update tampilan tanpa restart backend
app.all('/api/webhook/build-frontend', (req, res) => {
  const secret = req.query.secret || req.body?.secret || req.headers['x-deploy-secret'];
  const DEPLOY_SECRET = process.env.DEPLOY_SECRET || 'mris_deploy_secret_2026';

  if (secret !== DEPLOY_SECRET) {
    return res.status(403).json({ error: 'Unauthorized' });
  }

  let projectDir = '/var/www/erp-barokah';
  if (fs.existsSync('/var/www/ERPBAROKAH')) projectDir = '/var/www/ERPBAROKAH';
  else if (fs.existsSync('/var/www/MRIS')) projectDir = '/var/www/MRIS';

  const buildCmd = `cd "${projectDir}/web_admin" && npm run build && cp -r dist/* ../dist/ && echo "BUILD_OK"`;


  exec(buildCmd, { maxBuffer: 1024 * 1024 * 10, timeout: 300000 }, (error, stdout, stderr) => {
    if (error) {
      console.error('❌ Frontend build failed:', error.message);
      return res.status(500).json({ success: false, error: error.message, stderr });
    }
    console.log('✅ Frontend build output:\n', stdout);
    res.json({ success: true, message: '✅ Frontend build selesai', output: stdout.slice(-500) });
  });
});

// Deep merge masterData protecting user input from empty array wipes while honoring active entity updates and respecting deletions
const mergeMasterDataSafely = (existing = {}, incoming = {}) => {
  const result = { ...existing };
  const incTs = Number(incoming._lastUpdated) || 0;
  const extTs = Number(existing._lastUpdated) || 0;

  // Field kritis yang TIDAK BOLEH di-overwrite dengan [] kosong (perlindungan data user & permission matrix)
  const USER_CRITICAL_KEYS = new Set([
    'webAdminAccounts',
    'mobileAccounts',
    'userRights',
    'users',
    'userAccounts',
    'permissionMatrix',
    'mobilePermissionMatrix'
  ]);

  Object.keys(incoming).forEach(key => {
    const incVal = incoming[key];
    const extVal = existing[key];

    if (Array.isArray(incVal)) {
      // Proteksi Union Merge khusus untuk user accounts: gabungkan data incoming & existing berdasarkan ID/Username, kecualikan yang terhapus
      if (key === 'webAdminAccounts' || key === 'mobileAccounts') {
        const deletedSet = new Set([
          ...(result.deletedUserIds || []),
          ...(incoming.deletedUserIds || []),
          ...(existing.deletedUserIds || [])
        ].map(x => String(x)));

        const deletedUsernameSet = new Set([
          ...(result.deletedUsernames || []),
          ...(incoming.deletedUsernames || []),
          ...(existing.deletedUsernames || [])
        ].map(x => String(x).toLowerCase().trim()));

        const mapByUsername = new Map();

        const addUsers = (list) => {
          (list || []).forEach(u => {
            if (!u || u.id == null) return;
            const uIdStr = String(u.id);
            const uNameKey = String(u.username || u.name || '').toLowerCase().trim();

            if (deletedSet.has(uIdStr) || (uNameKey && deletedUsernameSet.has(uNameKey))) {
              return;
            }
            if (uNameKey) {
              mapByUsername.set(uNameKey, u);
            }
          });
        };

        addUsers(extVal);
        addUsers(incVal);

        result[key] = Array.from(mapByUsername.values());
        return;
      }

      // Proteksi khusus: field user-kritis tidak boleh di-overwrite dengan [] tanpa _isExplicitClear
      if (USER_CRITICAL_KEYS.has(key) && incVal.length === 0 && Array.isArray(extVal) && extVal.length > 0 && !incoming._isExplicitClear) {
        result[key] = extVal;
        return;
      }

      // ─── UNION MERGE untuk Master Data arrays ────────────────────────────────
      // Kategori, Produk, Bahan, Outlet, dll. TIDAK BOLEH di-overwrite mentah-mentah
      // oleh klien yang mungkin punya data lebih sedikit (misal: APK lama).
      // Gunakan union merge: gabungkan existing + incoming berdasarkan ID/name,
      // prioritaskan item dengan _updatedAt lebih baru.
      // ─── UNION MERGE ADDITIVE untuk Transaction arrays ───────────────────────
      // salesTransactions, shiftClosings, dll. TIDAK BOLEH di-overwrite (replace).
      // Selalu gabungkan berdasarkan ID: existing + incoming, tidak ada yang hilang.
      const TRANSACTION_ARRAY_KEYS = new Set([
        'salesTransactions', 'transactions',
        'shiftClosings', 'closedShifts', 'shift_closings', 'shiftReports',
        'stockOpname', 'approvedLogistics', 'approvedOpname',
        'stockTransfer', 'approvedTransfers',
        'damagedGoods', 'approvedWaste',
        'approvedFinanceDaily', 'manualEntryRecords', 'manualReports',
        'stockMovement', 'stockIn', 'purchases', 'cogsExpenses',
        'productionExpenses', 'otherExpenses', 'stockAdjustments',
        'cashAdjustments', 'customers', 'suppliers', 'units', 'tables'
      ]);

      const MASTER_DATA_ARRAY_KEYS = new Set([
        'categories', 'ingredients', 'products', 'menuItems',
        'outlets', 'paymentMethods', 'expenseMaster'
      ]);

      const shouldUnionMerge = MASTER_DATA_ARRAY_KEYS.has(key) || TRANSACTION_ARRAY_KEYS.has(key);
      if (shouldUnionMerge && (incVal.length > 0 || (Array.isArray(extVal) && extVal.length > 0))) {
        const unionMap = new Map();

        // Kumpulkan deleted tombstone set untuk key yang sedang di-merge
        const getDeletedSetForKey = (k) => {
          if (k === 'ingredients') {
            return new Set([
              ...(result.deletedIngredientIds || []),
              ...(incoming.deletedIngredientIds || []),
              ...(existing.deletedIngredientIds || [])
            ].map(x => String(x).toLowerCase().trim()));
          }
          if (k === 'products' || k === 'menuItems') {
            return new Set([
              ...(result.deletedProductIds || []),
              ...(incoming.deletedProductIds || []),
              ...(existing.deletedProductIds || [])
            ].map(x => String(x).toLowerCase().trim()));
          }
          if (k === 'categories' || k === 'ingredientCategories') {
            return new Set([
              ...(result.deletedCategoriesIds || []),
              ...(result.deletedCategoryIds || []),
              ...(incoming.deletedCategoriesIds || []),
              ...(incoming.deletedCategoryIds || []),
              ...(existing.deletedCategoriesIds || []),
              ...(existing.deletedCategoryIds || [])
            ].map(x => String(x).toLowerCase().trim()));
          }
          if (k === 'suppliers') {
            return new Set([
              ...(result.deletedSupplierIds || []),
              ...(incoming.deletedSupplierIds || []),
              ...(existing.deletedSupplierIds || [])
            ].map(x => String(x).toLowerCase().trim()));
          }
          if (k === 'customers') {
            return new Set([
              ...(result.deletedCustomerIds || []),
              ...(incoming.deletedCustomerIds || []),
              ...(existing.deletedCustomerIds || [])
            ].map(x => String(x).toLowerCase().trim()));
          }
          if (k === 'units') {
            return new Set([
              ...(result.deletedUnitIds || []),
              ...(incoming.deletedUnitIds || []),
              ...(existing.deletedUnitIds || [])
            ].map(x => String(x).toLowerCase().trim()));
          }
          if (k === 'outlets') {
            return new Set([
              ...(result.deletedOutletIds || []),
              ...(incoming.deletedOutletIds || []),
              ...(existing.deletedOutletIds || [])
            ].map(x => String(x).toLowerCase().trim()));
          }
          if (k === 'paymentMethods') {
            return new Set([
              ...(result.deletedPaymentMethodIds || []),
              ...(incoming.deletedPaymentMethodIds || []),
              ...(existing.deletedPaymentMethodIds || [])
            ].map(x => String(x).toLowerCase().trim()));
          }
          if (k === 'tables') {
            return new Set([
              ...(result.deletedTableIds || []),
              ...(incoming.deletedTableIds || []),
              ...(existing.deletedTableIds || [])
            ].map(x => String(x).toLowerCase().trim()));
          }
          if (k === 'expenseMaster') {
            return new Set([
              ...(result.deletedExpenseIds || []),
              ...(incoming.deletedExpenseIds || []),
              ...(existing.deletedExpenseIds || [])
            ].map(x => String(x).toLowerCase().trim()));
          }
          if (TRANSACTION_ARRAY_KEYS.has(k)) {
            return new Set([
              ...(result.deletedLogisticsIds || []),
              ...(result.deletedReportIds || []),
              ...(result.deletedSalesIds || []),
              ...(incoming.deletedLogisticsIds || []),
              ...(incoming.deletedReportIds || []),
              ...(incoming.deletedSalesIds || []),
              ...(existing.deletedLogisticsIds || []),
              ...(existing.deletedReportIds || []),
              ...(existing.deletedSalesIds || [])
            ].map(x => String(x).toLowerCase().trim()));
          }
          return new Set();
        };

        const currentDeletedSet = getDeletedSetForKey(key);
        const isItemTombstoned = (it) => {
          if (!it || !currentDeletedSet || currentDeletedSet.size === 0) return false;
          const itemId = String(it.id !== undefined && it.id !== null ? it.id : '').toLowerCase().trim();
          const itemSku = String(it.sku || '').toLowerCase().trim();
          const itemCode = String(it.code || '').toLowerCase().trim();
          const itemName = String(it.name || it.title || '').toLowerCase().trim();
          const itemRcpt = String(it.receipt_no || it.receiptNo || it.report_no || it.tx_id || '').toLowerCase().trim();
          return (itemId && currentDeletedSet.has(itemId)) ||
                 (itemSku && currentDeletedSet.has(itemSku)) ||
                 (itemCode && currentDeletedSet.has(itemCode)) ||
                 (itemName && currentDeletedSet.has(itemName)) ||
                 (itemRcpt && currentDeletedSet.has(itemRcpt));
        };

        // Seed dengan data existing (base) — tidak ada yang hilang dari server
        (Array.isArray(extVal) ? extVal : []).forEach(item => {
          if (!item || isItemTombstoned(item)) return;
          const k = String(
            item.id != null ? item.id :
            (item.tx_id || item.report_no || item.receiptNo || item.code || item.name || '')
          ).trim();
          if (k) unionMap.set(k, item);
        });

        // ─── PROTEKSI ANTI DATA-LOSS untuk salesTransactions ──────────────────
        // Jika incoming salesTransactions jauh lebih sedikit dari existing (< 30%),
        // kemungkinan besar ini adalah payload parsial dari browser yang baru dibuka.
        // Dalam kasus ini: HANYA tambahkan item baru dari incoming, JANGAN replace existing.
        // Tujuan: mencegah 121 transaksi hilang karena browser kirim payload dengan 12 item.
        const existingCount = Array.isArray(extVal) ? extVal.length : 0;
        const incomingCount = Array.isArray(incVal) ? incVal.length : 0;
        const isSalesTxKey = (key === 'salesTransactions' || key === 'transactions');
        const isPartialPayload = isSalesTxKey && existingCount > 20 && incomingCount > 0 && incomingCount < existingCount * 0.3;

        if (isPartialPayload) {
          // Hanya tambahkan item yang BENAR-BENAR baru (tidak ada di existing)
          (Array.isArray(incVal) ? incVal : []).forEach(item => {
            if (!item) return;
            const k = String(
              item.id != null ? item.id :
              (item.tx_id || item.report_no || item.receiptNo || item.code || item.name || '')
            ).trim();
            if (k && !unionMap.has(k)) {
              unionMap.set(k, item); // hanya item genuinely baru
            }
          });
          result[key] = Array.from(unionMap.values());
          return;
        }
        // ─────────────────────────────────────────────────────────────────────

        // Overlay dengan data incoming: jika item sudah ada, ambil yang _updatedAt lebih baru
        (Array.isArray(incVal) ? incVal : []).forEach(item => {
          if (!item || isItemTombstoned(item)) return;
          const k = String(
            item.id != null ? item.id :
            (item.tx_id || item.report_no || item.receiptNo || item.code || item.name || '')
          ).trim();
          if (!k) return;

          if (unionMap.has(k)) {
            const existItem = unionMap.get(k);
            const existTs = Number(existItem._updatedAt || existItem._lastMutated || existItem._lastUpdated || 0);
            const incItemTs = Number(item._updatedAt || item._lastMutated || item._lastUpdated || 0);
            // Jika incoming lebih baru ATAU keduanya tanpa timestamp → pakai incoming
            if (incItemTs >= existTs) {
              unionMap.set(k, item);
            }
          } else {
            // Item baru dari incoming yang belum ada di existing → SELALU tambahkan
            unionMap.set(k, item);
          }
        });

        result[key] = Array.from(unionMap.values());
        return;
      }
      // ─────────────────────────────────────────────────────────────────────────

      // Untuk array non-master-data: gunakan logika replace berdasarkan timestamp
      if (incTs >= extTs || !extVal) {
        if (incVal.length > 0) {
          result[key] = incVal;
        } else if (!extVal || extVal.length === 0 || incoming._isExplicitClear) {
          result[key] = [];
        } else {
          result[key] = extVal;
        }
      } else {
        if (incVal.length > 0) {
          result[key] = incVal;
        } else {
          result[key] = extVal || [];
        }
      }
    } else if (incVal !== undefined && incVal !== null) {
      result[key] = incVal;
    }
  });

  // Jaminan Tambahan: jika incoming payload sama sekali TIDAK menyertakan key kritis, wajib pertahankan dari existing
  USER_CRITICAL_KEYS.forEach(critKey => {
    if ((!incoming[critKey] || (Array.isArray(incoming[critKey]) && incoming[critKey].length === 0)) && Array.isArray(existing[critKey]) && existing[critKey].length > 0 && !incoming._isExplicitClear) {
      result[critKey] = existing[critKey];
    }
  });

  // Bersihkan item logistik & laporan yang sudah terhapus di deletedLogisticsIds / deletedReportIds / deletedOutflowIds
  const deletedLogSet = new Set([
    ...(result.deletedLogisticsIds || []),
    ...(incoming.deletedLogisticsIds || []),
    ...(result.deletedReportIds || []),
    ...(incoming.deletedReportIds || []),
    ...(result.deletedOutflowIds || []),
    ...(incoming.deletedOutflowIds || [])
  ].map(x => String(x)));

  if (deletedLogSet.size > 0) {
    const deletedArr = Array.from(deletedLogSet);
    result.deletedLogisticsIds = deletedArr;
    result.deletedReportIds = deletedArr;

    const ALL_PURGED_KEYS = [
      'stockOpname', 'approvedLogistics', 'approvedOpname',
      'stockTransfer', 'approvedTransfers', 'damagedGoods',
      'approvedWaste', 'stockMovement', 'stockIn', 'purchases',
      'approvedFinanceDaily', 'shiftClosings', 'shift_closings',
      'closedShifts', 'dailyReports', 'manualEntryRecords'
    ];

    ALL_PURGED_KEYS.forEach(lk => {
      if (Array.isArray(result[lk])) {
        result[lk] = result[lk].filter(item => {
          if (!item) return false;
          const iId = String(item.id !== undefined && item.id !== null ? item.id : '');
          const iRNo = String(item.report_no || item.receiptNo || '');
          return !deletedLogSet.has(iId) && !deletedLogSet.has(iRNo);
        });
      }
    });
  }

  // Bersihkan produk yang sudah dihapus via deletedProductIds
  const deletedProdSet = new Set([
    ...(result.deletedProductIds || []),
    ...(incoming.deletedProductIds || []),
    ...(existing.deletedProductIds || [])
  ].map(x => String(x).toLowerCase().trim()));

  if (deletedProdSet.size > 0 && Array.isArray(result.products)) {
    result.products = result.products.filter(p => {
      if (!p) return false;
      const pId  = String(p.id  !== undefined && p.id  !== null ? p.id  : '').toLowerCase().trim();
      const pSku = String(p.sku || p.code || '').toLowerCase().trim();
      const pName= String(p.name || '').toLowerCase().trim();
      return !deletedProdSet.has(pId) && !deletedProdSet.has(pSku) && !deletedProdSet.has(pName);
    });
  }

  // ── Otomatis Konsolidasi Produk dengan Nama Sama (Mencegah Duplikasi Menu Master) ──
  if (Array.isArray(result.products) && result.products.length > 0) {
    const nameMap = new Map();
    result.products.forEach(p => {
      if (!p) return;
      const rawName = String(p.name || '').trim();
      const normName = rawName.toUpperCase();
      if (!normName) return;

      if (!nameMap.has(normName)) {
        nameMap.set(normName, { ...p, name: rawName });
      } else {
        const exist = nameMap.get(normName);
        const existOutlets = new Set((exist.selectedOutletIds || exist.selected_outlet_ids || []).map(x => String(x)));
        if (exist.outlet_id && !['Semua Outlet', 'ALL', ''].includes(String(exist.outlet_id))) existOutlets.add(String(exist.outlet_id));

        const newOutlets = (p.selectedOutletIds || p.selected_outlet_ids || []).map(x => String(x));
        if (p.outlet_id && !['Semua Outlet', 'ALL', ''].includes(String(p.outlet_id))) newOutlets.push(String(p.outlet_id));
        newOutlets.forEach(o => existOutlets.add(o));

        const mergedStdPrices = {
          ...(exist.standardPrices || exist.standard_prices || {}),
          ...(p.standardPrices || p.standard_prices || {})
        };

        const mergedVariants = Array.from(new Set([
          ...(exist.variants || []),
          ...(p.variants || [])
        ]));

        const mergedBranchVars = {
          ...(exist.branchVariantPrices || exist.branch_variant_prices || {}),
          ...(p.branchVariantPrices || p.branch_variant_prices || {})
        };

        const existTs = Number(exist._updatedAt || exist._lastMutated || exist._lastUpdated || 0);
        const pTs = Number(p._updatedAt || p._lastMutated || p._lastUpdated || 0);
        const baseWinner = (pTs > existTs || (Array.isArray(p.variants) && p.variants.length > (exist.variants || []).length)) ? p : exist;

        const mergedProduct = {
          ...baseWinner,
          name: rawName,
          selectedOutletIds: Array.from(existOutlets),
          selected_outlet_ids: Array.from(existOutlets),
          standardPrices: mergedStdPrices,
          standard_prices: mergedStdPrices,
          branch_prices: mergedStdPrices,
          outlet_prices: mergedStdPrices,
          variants: mergedVariants,
          branchVariantPrices: mergedBranchVars,
          branch_variant_prices: mergedBranchVars,
          _updatedAt: Math.max(existTs, pTs, Date.now())
        };

        nameMap.set(normName, mergedProduct);
      }
    });
    result.products = Array.from(nameMap.values());
  }

  // Bersihkan kategori yang sudah dihapus via deletedCategoriesIds
  const deletedCatSet = new Set([
    ...(result.deletedCategoriesIds || []),
    ...(incoming.deletedCategoriesIds || []),
    ...(existing.deletedCategoriesIds || [])
  ].map(x => String(x).toLowerCase().trim()));

  if (deletedCatSet.size > 0 && Array.isArray(result.categories)) {
    result.categories = result.categories.filter(c => {
      if (!c) return false;
      const cId   = String(c.id   !== undefined && c.id   !== null ? c.id   : '').toLowerCase().trim();
      const cCode = String(c.code || '').toLowerCase().trim();
      const cName = String(c.name || '').toLowerCase().trim();
      return !deletedCatSet.has(cId) && !deletedCatSet.has(cCode) && !deletedCatSet.has(cName);
    });
  }

  // Bersihkan bahan baku yang sudah dihapus via deletedIngredientIds
  const deletedIngSet = new Set([
    ...(result.deletedIngredientIds || []),
    ...(incoming.deletedIngredientIds || []),
    ...(existing.deletedIngredientIds || [])
  ].map(x => String(x).toLowerCase().trim()));

  if (deletedIngSet.size > 0 && Array.isArray(result.ingredients)) {
    result.ingredients = result.ingredients.filter(i => {
      if (!i) return false;
      const iId   = String(i.id   !== undefined && i.id   !== null ? i.id   : '').toLowerCase().trim();
      const iCode = String(i.code || '').toLowerCase().trim();
      const iName = String(i.name || '').toLowerCase().trim();
      return !deletedIngSet.has(iId) && !deletedIngSet.has(iCode) && !deletedIngSet.has(iName);
    });
  }


  return result;
};

// Sanitizer otomatis — menjamin data input pengguna 100% aman dan tidak terhapus
const sanitizeMasterDataPayload = (data) => {
  if (!data || typeof data !== 'object') return data;
  const clean = { ...data };
  if (clean.masterData) delete clean.masterData;

  // Hapus seluruh data UPD- dan Update Laporan Excel dari POS Kasir (shiftReports, approvedFinanceDaily, manualEntryRecords, salesTransactions)
  const isExcelUploadReport = (item, arrayKey = '') => {
    if (!item) return false;
    const str = String(JSON.stringify(item));
    if (str.includes('UPD-') || str.includes('Batch Upload Excel') || str.includes('Update Laporan') || str.includes('Excel/Manual')) {
      return true;
    }
    const rNo = String(item.report_no || item.reportNo || item.no_laporan || item.noLaporan || item.id || item.code || '');
    const src = String(item.source || '');
    if (rNo.startsWith('UPD-') || src.includes('Excel') || src.includes('Update Laporan')) return true;

    // Hapus data mock "Restoran Utama" / dummy shift closings
    const bName = String(item.branch_name || item.outlet_name || '').toLowerCase();
    if (bName.includes('restoran utama')) return true;
    const rNoLower = rNo.toLowerCase();
    if (bName.includes('restoran utama') || rNoLower.includes('dummy') || rNoLower.includes('mock-shift')) {
      return true;
    }

    return false;
  };

  const POS_REPORT_KEYS = [
    'approvedFinanceDaily', 'manualEntryRecords', 'shiftReports',
    'dailyReports', 'manualReports', 'salesTransactions', 'outletTransactions', 'transactions', 'closedShifts', 'shift_closings'
  ];

  POS_REPORT_KEYS.forEach(key => {
    if (Array.isArray(clean[key])) {
      clean[key] = clean[key].filter(item => !isExcelUploadReport(item, key));
    }
  });

  // Sanitize transaction discount anomalies (e.g. discount_unit > price_unit or discount_amount > subtotal)
  ['salesTransactions', 'transactions', 'outletTransactions'].forEach(key => {
    if (Array.isArray(clean[key])) {
      clean[key] = clean[key].map(t => {
        if (!t || typeof t !== 'object') return t;
        let isAnomalous = false;
        let fixedItems = t.items;
        if (Array.isArray(t.items)) {
          fixedItems = t.items.map(it => {
            const pu = Number(it.price_unit || it.price || 0);
            const du = Number(it.discount_unit || it.discount || 0);
            const qty = Number(it.qty || 1);
            if (du > pu && pu > 0) {
              isAnomalous = true;
              return {
                ...it,
                discount_unit: 0,
                amount: pu * qty
              };
            }
            return it;
          });
        }
        const sub = Number(t.subtotal || 0);
        const disc = Number(t.discount_amount || t.discount || 0);
        if (isAnomalous || (disc > sub && sub > 0)) {
          const newItems = fixedItems || t.items || [];
          const newSub = newItems.reduce((s, it) => s + Number(it.amount || ((it.price_unit || 0) * (it.qty || 1))), 0) || sub;
          const validDisc = Math.min(newSub, Math.max(0, disc > sub ? 0 : disc));
          const netAmt = Math.max(0, newSub - validDisc);
          return {
            ...t,
            items: newItems,
            subtotal: newSub,
            discount: validDisc,
            discount_amount: validDisc,
            item_discounts: validDisc,
            summary_discount: validDisc,
            amount: netAmt,
            total: netAmt,
            grand_total: netAmt,
            paid_amount: netAmt,
            tendered: netAmt,
            _updatedAt: Date.now()
          };
        }
        return t;
      });
    }
  });

  // ===== MASTER PRODUCTS DEDUPLICATION & SANITIZATION (MULTI-OUTLET SAFE) =====
  if (Array.isArray(clean.products) && clean.products.length > 0) {
    const prodMap = new Map();

    for (const p of clean.products) {
      if (!p || !p.id) continue;
      const idKey = String(p.id).trim();

      // Normalize selectedOutletIds
      let selIds = Array.isArray(p.selectedOutletIds)
        ? p.selectedOutletIds.map(String)
        : (Array.isArray(p.selected_outlet_ids) ? p.selected_outlet_ids.map(String) : []);

      if (selIds.length === 0 && p.outlet_id && p.outlet_id !== 'Semua Outlet' && p.outlet_id !== 'ALL') {
        selIds = [String(p.outlet_id)];
      }

      // Preserve all standardPrices and alias maps
      const stdPrices = {
        ...(p.standardPrices || {}),
        ...(p.standard_prices || {}),
        ...(p.branch_prices || {}),
        ...(p.outlet_prices || {})
      };
      const apkStatus = {
        ...(p.apkStatus || {}),
        ...(p.outletApkStatus || {}),
        ...(p.outlet_apk_status || {})
      };

      const sanitizedProd = {
        ...p,
        id: isNaN(Number(p.id)) ? p.id : Number(p.id),
        name: String(p.name || '').trim().toUpperCase(),
        sku: String(p.sku || p.code || `PRD-${p.id}`).trim().toUpperCase(),
        code: String(p.sku || p.code || `PRD-${p.id}`).trim().toUpperCase(),
        price: Number(p.price || 0),
        cost: Number(p.cost || p.cost_price || 0),
        status: p.status || 'Aktif',
        selectedOutletIds: selIds,
        selected_outlet_ids: selIds,
        standardPrices: stdPrices,
        standard_prices: stdPrices,
        branch_prices: stdPrices,
        outlet_prices: stdPrices,
        apkStatus: apkStatus,
        outletApkStatus: apkStatus,
        outlet_apk_status: apkStatus,
        variants: Array.isArray(p.variants) ? p.variants : [],
        variantPrices: p.variantPrices || {},
        branchVariantPrices: p.branchVariantPrices || p.branch_variant_prices || {},
        branch_variant_prices: p.branchVariantPrices || p.branch_variant_prices || {},
        compositions: Array.isArray(p.compositions) ? p.compositions : []
      };

      if (prodMap.has(idKey)) {
        const exist = prodMap.get(idKey);
        const candTs = Number(p._lastUpdated || p._updatedAt || p._lastMutated || 0);
        const existTs = Number(exist._lastUpdated || exist._updatedAt || exist._lastMutated || 0);
        if (candTs >= existTs) {
          prodMap.set(idKey, sanitizedProd);
        }
      } else {
        prodMap.set(idKey, sanitizedProd);
      }
    }

    clean.products = Array.from(prodMap.values());
  }

  return clean;
};

// -----------------------------------------------------------------------------
// SINKRONISASI DATA MASTER TERPUSAT (SINGLE PRIMARY DATABASE: MySQL mris_db)
// -----------------------------------------------------------------------------

const FORCE_FLUSH_TTL_MS = 60 * 1000; // Auto-expire: 60 detik
let forceFlushUntil = 0;

// GET /api/master-data — 100% MySQL PRIMARY STORAGE
app.get('/api/master-data', async (req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  try {
    const clientTs = Number(req.query.ts || req.headers['x-mris-ts'] || 0);
    const mysqlData = await getMasterDataFromMySQL();
    const activeData = (mysqlData && typeof mysqlData === 'object') ? mysqlData : defaultMasterData;
    const serverTs = Number(activeData._lastUpdated || 0);

    // ── Auto-expire _forceFlushCommand di DB jika sudah lewat 60 detik ──
    if (activeData._forceFlushCommand === true) {
      const flushAt = Number(activeData._forceFlushAt || 0);
      const elapsed = Date.now() - flushAt;
      if (flushAt > 0 && elapsed > FORCE_FLUSH_TTL_MS) {
        // Expired — matikan otomatis di DB (async, tidak blokir response)
        getMasterDataFromMySQL().then(cur => {
          if (cur && cur._forceFlushCommand === true) {
            cur._forceFlushCommand = false;
            cur._forceFlushAt = null;
            cur._lastUpdated = Date.now();
            saveMasterDataToMySQL(cur).then(() =>
              console.log(`[FORCE-FLUSH] Auto-expired setelah ${Math.round(elapsed / 1000)}s. DB direset otomatis.`)
            ).catch(() => {});
          }
        }).catch(() => {});
        // Jangan kirim _forceFlushCommand=true ke tablet
        activeData._forceFlushCommand = false;
      }
    }

    // Jika forceFlush window aktif (60 detik sejak di-trigger via API), embed ke response
    const shouldForceFlush = Date.now() < forceFlushUntil;

    if (clientTs > 0 && serverTs > 0 && clientTs >= serverTs && !shouldForceFlush) {
      return res.status(304).end();
    }

    const payload = sanitizeMasterDataPayload(activeData);
    if (shouldForceFlush) payload._forceFlushCommand = true;
    return res.json(payload);
  } catch (err) {
    return res.json(sanitizeMasterDataPayload(defaultMasterData));
  }
});

// POST /api/admin/rebuild-blob-from-mysql — Emergency: Rebuild JSON blob dari tabel MySQL sales_transactions
// Digunakan saat blob ter-overwrite dengan data parsial tapi MySQL masih punya semua transaksi.
app.post('/api/admin/rebuild-blob-from-mysql', async (req, res) => {
  try {
    const { secret } = req.body || {};
    if (secret !== 'MRIS-RESTORE-2026') {
      return res.status(403).json({ success: false, error: 'Akses ditolak' });
    }
    if (!mysqlPool) {
      return res.status(500).json({ success: false, error: 'MySQL tidak terhubung' });
    }

    // 1. Baca semua transaksi dari tabel sales_transactions (ground truth)
    const [salesRows] = await mysqlPool.execute(
      'SELECT * FROM sales_transactions ORDER BY date DESC, time DESC'
    );

    // 2. Baca blob saat ini
    const current = (await getMasterDataFromMySQL()) || defaultMasterData;
    const blobTxMap = new Map(
      (current.salesTransactions || []).map(t => [String(t.id || t.receipt_no || ''), t])
    );

    let addedCount = 0;
    const delSalesSet = new Set((current.deletedSalesIds || []).map(x => String(x)));

    // 3. Tambahkan dari MySQL semua yang tidak ada di blob dan tidak dalam deleted list
    salesRows.forEach(r => {
      const k = String(r.id || r.receipt_no || '');
      if (!k || delSalesSet.has(k)) return;
      if (blobTxMap.has(k)) return; // sudah ada di blob, skip

      const dtStr = r.date
        ? (typeof r.date === 'string' ? r.date.substring(0, 10) : (r.date.toISOString ? r.date.toISOString().substring(0, 10) : String(r.date).substring(0, 10)))
        : '';

      blobTxMap.set(k, {
        id: r.id,
        receipt_no: r.receipt_no || r.id,
        receiptNo: r.receipt_no || r.id,
        date: dtStr,
        entry_date: dtStr,
        transaction_date: dtStr,
        time: r.time ? String(r.time) : '12:00:00',
        created_at: r.created_at,
        outlet_id: r.outlet_id,
        branch_id: r.branch_id || r.outlet_id,
        branch_name: r.branch_name || '',
        outlet: r.outlet || r.branch_name || '',
        customer_name: r.customer_name || 'Pelanggan Umum',
        table_number: r.table_number || '',
        order_type: r.order_type || 'Dine In',
        subtotal: Number(r.subtotal || r.amount || 0),
        discount: Number(r.discount_amount || 0),
        discount_amount: Number(r.discount_amount || 0),
        amount: Number(r.amount || 0),
        total: Number(r.amount || 0),
        paid_amount: Number(r.paid_amount || r.amount || 0),
        change_amount: Number(r.change_amount || 0),
        payment_method: r.payment_method || 'Cash',
        cashier: r.cashier || 'Kasir POS',
        notes: r.notes || '',
        status: r.status || 'approved',
        type: r.type || 'income',
        items: [{ name: 'Menu', qty: 1, price_unit: Number(r.amount || 0), amount: Number(r.amount || 0) }]
      });
      addedCount++;
    });

    // 4. Simpan blob yang sudah dipulihkan
    const rebuiltTxList = Array.from(blobTxMap.values()).sort((a, b) => {
      const da = String(a.date || '').substring(0, 10);
      const db = String(b.date || '').substring(0, 10);
      if (da !== db) return db.localeCompare(da);
      return String(b.time || '').localeCompare(String(a.time || ''));
    });

    current.salesTransactions = rebuiltTxList;
    current.transactions = rebuiltTxList;
    current._lastUpdated = Date.now();
    await saveMasterDataToMySQL(current);

    return res.json({
      success: true,
      message: `Blob berhasil di-rebuild. ${addedCount} transaksi ditambahkan dari MySQL. Total sekarang: ${rebuiltTxList.length} transaksi.`,
      added: addedCount,
      total: rebuiltTxList.length,
      mysql_rows: salesRows.length,
      blob_before: blobTxMap.size - addedCount
    });
  } catch (err) {
    console.error('POST /api/admin/rebuild-blob-from-mysql error:', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/admin/blob-history — Lihat 50 snapshot riwayat blob terbaru
app.get('/api/admin/blob-history', async (req, res) => {
  try {
    if (!mysqlPool) return res.status(500).json({ success: false, error: 'MySQL tidak terhubung' });
    const [rows] = await mysqlPool.execute(
      'SELECT id, tx_count, source_tag, created_at FROM mris_master_data_history ORDER BY id DESC LIMIT 50'
    );
    return res.json({ success: true, count: rows.length, history: rows });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/admin/restore-blob-version — Rollback blob ke versi history tertentu
app.post('/api/admin/restore-blob-version', async (req, res) => {
  try {
    const { version_id, secret } = req.body || {};
    if (secret !== 'MRIS-RESTORE-2026') {
      return res.status(403).json({ success: false, error: 'Akses ditolak' });
    }
    if (!version_id) {
      return res.status(400).json({ success: false, error: 'Parameter version_id wajib diisi' });
    }
    if (!mysqlPool) return res.status(500).json({ success: false, error: 'MySQL tidak terhubung' });

    const [rows] = await mysqlPool.execute(
      'SELECT * FROM mris_master_data_history WHERE id = ?',
      [version_id]
    );
    if (!rows || rows.length === 0) {
      return res.status(404).json({ success: false, error: `Versi snapshot #${version_id} tidak ditemukan` });
    }

    const snapshotData = JSON.parse(rows[0].data);
    snapshotData._lastUpdated = Date.now();
    await saveMasterDataToMySQL(snapshotData, `rollback_to_v${version_id}`);

    return res.json({
      success: true,
      message: `Berhasil rollback master data ke versi snapshot #${version_id} (${rows[0].created_at})`,
      version_id,
      tx_count: rows[0].tx_count,
      created_at: rows[0].created_at
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// =============================================================================
// DIRECT LIGHTWEIGHT POS REST ENDPOINTS (FAST, DIRECT MYSQL COMMIT, <15ms)
// =============================================================================

// 0. POST /api/pos/bulk-restore — Pulihkan transaksi massal dari POS (bypass proteksi delete)
// Endpoint ini dibuat untuk memulihkan data yang hilang akibat overwrite blob oleh skrip server.
// Menerima array salesTransactions dari POS dan merge ke blob + sales_transactions.
app.post('/api/pos/bulk-restore', async (req, res) => {
  try {
    const { transactions, secret } = req.body;
    if (secret !== 'MRIS-RESTORE-2026') {
      return res.status(403).json({ success: false, error: 'Akses ditolak' });
    }
    if (!Array.isArray(transactions) || transactions.length === 0) {
      return res.status(400).json({ success: false, error: 'Array transactions kosong' });
    }

    const current = (await getMasterDataFromMySQL()) || defaultMasterData;
    const existingIds = new Set((current.salesTransactions || []).map(t => String(t.id || t.receipt_no || '')));

    let inserted = 0;
    let skipped = 0;
    const newTxs = [];

    for (const tx of transactions) {
      if (!tx || !tx.id) { skipped++; continue; }
      const txId = String(tx.id);
      const txDate = tx.date || new Date().toISOString().split('T')[0];
      if (txDate < '2026-08-13') { skipped++; continue; }

      if (existingIds.has(txId)) { skipped++; continue; }
      existingIds.add(txId);
      newTxs.push(tx);

      // Upsert ke sales_transactions
      if (mysqlPool) {
        try {
          const txRcpt = String(tx.receipt_no || tx.receiptNo || txId);
          const txTime = String(tx.time || '00:00:00').replace(/\./g, ':').substring(0, 8);
          const outletId = Number(tx.outlet_id || tx.branch_id || 1);
          const amount = Number(tx.amount || tx.total || 0);
          const paidAmount = Number(tx.paid_amount || tx.cash_paid || amount);
          const changeAmount = Number(tx.change_amount || tx.change || 0);
          await mysqlPool.execute(`
            INSERT INTO sales_transactions
              (id, receipt_no, date, time, outlet_id, branch_id, branch_name, outlet, customer_name,
               table_number, order_type, subtotal, discount_amount, service_charge, tax_amount,
               adjustment_amount, amount, paid_amount, change_amount, payment_method, cashier, notes, status, type)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'income')
            ON DUPLICATE KEY UPDATE amount = VALUES(amount), status = VALUES(status)
          `, [txId, txRcpt, txDate, txTime, outletId, outletId,
              tx.branch_name || tx.outlet || 'Cabang', tx.branch_name || tx.outlet || 'Cabang',
              tx.customer_name || 'Pelanggan Umum', tx.table_number || '', tx.order_type || 'Dine In',
              amount, 0, 0, 0, 0, amount, paidAmount, changeAmount,
              tx.payment_method || 'Cash', tx.cashier || 'Kasir POS', tx.notes || '', tx.status || 'approved']);
          inserted++;
        } catch (e) { skipped++; }
      }
    }

    // Merge ke blob
    const merged = [...newTxs, ...(current.salesTransactions || [])];
    current.salesTransactions = merged;
    current.transactions = merged;
    current._lastUpdated = Date.now();
    await saveMasterDataToMySQL(current);

    return res.json({
      success: true,
      message: `Berhasil memulihkan ${inserted} transaksi, ${skipped} dilewati (sudah ada / invalid)`,
      inserted,
      skipped,
      total_in_blob: merged.length
    });
  } catch (err) {
    console.error('POST /api/pos/bulk-restore error:', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 1. POST /api/pos/transaction — Direct POS Single Receipt Checkout
app.post('/api/pos/transaction', async (req, res) => {
  try {
    const tx = req.body;
    if (!tx || !tx.id) {
      return res.status(400).json({ success: false, error: 'Data transaksi tidak valid' });
    }

    const txId = String(tx.id);
    const txRcpt = String(tx.receipt_no || tx.receiptNo || '');
    const txDate = tx.date || new Date().toISOString().split('T')[0];

    // Reject legacy test dates or permanently deleted transactions
    if (txDate < '2026-08-13') {
      return res.status(400).json({ success: false, error: 'Transaksi uji coba sebelum 13 Agustus 2026 telah dibersihkan' });
    }
    const formatTimeHHMMSS = (t) => {
      if (t && typeof t === 'string') {
        const cleanT = t.replace(/\./g, ':').trim();
        if (cleanT.includes(':')) {
          const parts = cleanT.split(':');
          return `${(parts[0] || '00').padStart(2, '0')}:${(parts[1] || '00').padStart(2, '0')}:${(parts[2] || '00').substring(0, 2).padStart(2, '0')}`.substring(0, 8);
        }
      }
      const _n = new Date();
      return _n.toLocaleTimeString('id-ID', { timeZone: 'Asia/Jakarta', hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }).replace(/\./g, ':');
    };
    const txTime = formatTimeHHMMSS(tx.time);
    const outletId = Number(tx.outlet_id || tx.branch_id || 1);
    const branchName = tx.branch_name || tx.outlet || 'Cabang';
    const customerName = tx.customer_name || tx.customer || 'Pelanggan Umum';
    const tableNumber = tx.table_number || tx.table || '';
    const orderType = tx.order_type || tx.type || 'Dine In';
    const amount = Number(tx.amount || tx.total || 0);
    const paidAmount = Number(tx.paid_amount || tx.cash_paid || tx.tendered || amount);
    const changeAmount = Number(tx.change_amount || tx.change || tx.kembalian || 0);
    const paymentMethod = tx.payment_method || 'Cash';
    const cashier = tx.cashier || tx.cashier_name || 'Kasir POS';
    const notes = tx.notes || '';
    const status = tx.status || 'approved';

    const itemsJsonStr = (Array.isArray(tx.items) && tx.items.length > 0) ? JSON.stringify(tx.items) : null;

    // 1. Langsung insert ke MySQL sales_transactions
    if (mysqlPool) {
      await mysqlPool.execute(`
        INSERT INTO sales_transactions 
          (id, receipt_no, date, time, outlet_id, branch_id, branch_name, outlet, customer_name, table_number, order_type, subtotal, discount_amount, service_charge, tax_amount, adjustment_amount, amount, paid_amount, change_amount, payment_method, cashier, notes, status, type, items_json)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'income', ?)
        ON DUPLICATE KEY UPDATE
          date = VALUES(date),
          time = VALUES(time),
          outlet_id = VALUES(outlet_id),
          branch_id = VALUES(branch_id),
          branch_name = VALUES(branch_name),
          customer_name = VALUES(customer_name),
          table_number = VALUES(table_number),
          order_type = VALUES(order_type),
          amount = VALUES(amount),
          paid_amount = VALUES(paid_amount),
          change_amount = VALUES(change_amount),
          payment_method = VALUES(payment_method),
          cashier = VALUES(cashier),
          notes = VALUES(notes),
          status = VALUES(status),
          items_json = VALUES(items_json)
      `, [txId, txId, txDate, txTime, outletId, outletId, branchName, branchName, customerName, tableNumber, orderType, amount, 0, 0, 0, 0, amount, paidAmount, changeAmount, paymentMethod, cashier, notes, status, itemsJsonStr]);

      // Catat pergerakan stok jika ada items
      if (Array.isArray(tx.items) && tx.items.length > 0) {
        for (const it of tx.items) {
          const itName = String(it.name || '').trim();
          const itQty = Number(it.qty || 1);
          try {
            const txReason = `POS Checkout [TX:${txId}]`;
            const [existingSm] = await mysqlPool.execute(
              `SELECT id FROM stock_movement WHERE outlet_id = ? AND date = ? AND ingredient_name = ? AND reason = ? LIMIT 1`,
              [outletId, txDate, itName, txReason]
            );
            if (!existingSm || existingSm.length === 0) {
              await mysqlPool.execute(`
                INSERT INTO stock_movement (date, time, ingredient_name, type, qty, unit, outlet_id, source_outlet, reason, user_name)
                VALUES (?, ?, ?, 'OUT', ?, 'porsi', ?, ?, ?, ?)
              `, [txDate, txTime, itName, itQty, outletId, branchName, txReason, cashier]);
            }
          } catch (smErr) {}
        }
      }

      // Hapus otomatis dari active_table_orders untuk meja yang bersangkutan saat transaksi selesai dibayar
      const tableNum = String(tx.table_number || '').trim();
      if (tableNum && tableNum !== 'N/A (Take Away)' && tableNum !== 'N/A') {
        try {
          await mysqlPool.execute(`
            DELETE FROM active_table_orders 
            WHERE outlet_id = ? AND (table_number = ? OR table_id = ? OR id LIKE ?)
          `, [outletId, tableNum, tableNum, `%${tableNum}%`]);
          // Broadcast real-time SSE table cleared
          broadcastPosEvent(outletId, { type: 'TABLE_ORDER_UPDATE', action: 'DELETE', table_id: tableNum, outlet_id: outletId });
        } catch (delTblErr) {}
      }
      // Broadcast real-time SSE checkout event
      broadcastPosEvent(outletId, { type: 'TX_CHECKOUT', tx_id: txId, table_number: tableNum, amount, outlet_id: outletId });
    }

    // 2. Synchronous update to masterData JSON blob so immediate GET /api/master-data has the latest transaction
    try {
      const cur = await getMasterDataFromMySQL();
      const current = cur || defaultMasterData;
      const salesTx = current.salesTransactions || [];
      if (!salesTx.some(t => String(t.id) === txId)) {
        current.salesTransactions = [tx, ...salesTx];
        current.transactions = [tx, ...(current.transactions || [])];
        current._lastUpdated = Date.now();
        await saveMasterDataToMySQL(current);
      }
    } catch (saveErr) {
      console.warn('Warning updating masterData blob for new transaction:', saveErr.message);
    }

    return res.json({ success: true, message: 'Transaksi berhasil disimpan ke MySQL', id: txId });
  } catch (err) {
    console.error('POST /api/pos/transaction error:', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// -----------------------------------------------------------------------------
// 1b. REAL-TIME SERVER-SENT EVENTS (SSE) ENGINE (50ms Instant Push per Outlet)
// -----------------------------------------------------------------------------
const sseClientsByOutlet = new Map(); // outletId -> Set of res objects

const broadcastPosEvent = (outletId, eventData) => {
  const targetOutlets = [outletId, 'all', 0];
  const payload = `data: ${JSON.stringify(eventData)}\n\n`;

  targetOutlets.forEach(oId => {
    const clients = sseClientsByOutlet.get(Number(oId)) || sseClientsByOutlet.get(String(oId));
    if (clients && clients.size > 0) {
      clients.forEach(clientRes => {
        try {
          clientRes.write(payload);
        } catch (err) {
          clients.delete(clientRes);
        }
      });
    }
  });
};

// GET /api/pos/events — SSE Stream Listener
app.get('/api/pos/events', (req, res) => {
  const outletId = Number(req.query.outlet_id || 1);

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // Bypass Nginx buffering
  res.flushHeaders();

  if (!sseClientsByOutlet.has(outletId)) {
    sseClientsByOutlet.set(outletId, new Set());
  }
  sseClientsByOutlet.get(outletId).add(res);

  // Send initial connection ack
  res.write(`data: ${JSON.stringify({ type: 'CONNECTED', outlet_id: outletId, time: Date.now() })}\n\n`);

  // Heartbeat keep-alive every 25s
  const heartbeatTimer = setInterval(() => {
    try {
      res.write(': keepalive\n\n');
    } catch (e) {
      clearInterval(heartbeatTimer);
    }
  }, 25000);

  req.on('close', () => {
    clearInterval(heartbeatTimer);
    const clients = sseClientsByOutlet.get(outletId);
    if (clients) {
      clients.delete(res);
      if (clients.size === 0) sseClientsByOutlet.delete(outletId);
    }
  });
});

// 1c. GET /api/pos/table-orders — Mengambil pesanan meja aktif per-outlet
app.get('/api/pos/table-orders', async (req, res) => {
  try {
    const outletId = Number(req.query.outlet_id || 1);
    if (!mysqlPool) return res.json({ success: true, tableOrders: [] });

    const [rows] = await mysqlPool.execute(
      'SELECT * FROM active_table_orders WHERE outlet_id = ? AND status = "occupied" ORDER BY updated_at DESC',
      [outletId]
    );

    const formatted = rows.map(r => ({
      id: r.id,
      table_id: r.table_id,
      table_number: r.table_number,
      customer_name: r.customer_name,
      order_type: r.order_type,
      waiter_name: r.waiter_name,
      total_amount: Number(r.total_amount || 0),
      items: typeof r.items === 'string' ? (JSON.parse(r.items || '[]')) : (r.items || []),
      status: r.status,
      updated_at: r.updated_at
    }));

    return res.json({ success: true, tableOrders: formatted });
  } catch (err) {
    console.error('GET /api/pos/table-orders error:', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 1d. POST /api/pos/table-orders — Simpan / Update pesanan meja dari Waiters / Kasir
app.post('/api/pos/table-orders', async (req, res) => {
  try {
    const { id, outlet_id, table_id, table_number, customer_name, order_type, waiter_name, items, total_amount, status } = req.body || {};
    if (!table_id || !outlet_id) {
      return res.status(400).json({ success: false, error: 'outlet_id dan table_id wajib diisi' });
    }

    const orderId = `TO-${outlet_id}-${table_id}`;
    const itemsJson = typeof items === 'string' ? items : JSON.stringify(items || []);
    const totAmt = Number(total_amount || 0);

    if (mysqlPool) {
      await mysqlPool.execute(`
        INSERT INTO active_table_orders 
          (id, outlet_id, table_id, table_number, customer_name, order_type, waiter_name, items, total_amount, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          table_number = VALUES(table_number),
          customer_name = VALUES(customer_name),
          order_type = VALUES(order_type),
          waiter_name = VALUES(waiter_name),
          items = VALUES(items),
          total_amount = VALUES(total_amount),
          status = VALUES(status),
          updated_at = CURRENT_TIMESTAMP
      `, [orderId, Number(outlet_id), String(table_id), String(table_number || table_id), String(customer_name || 'Pelanggan Umum'), String(order_type || 'Dine In'), String(waiter_name || 'Waiters'), itemsJson, totAmt, String(status || 'occupied')]);
    }

    // Broadcast instant SSE to Kasir & KDS screens (<50ms)
    broadcastPosEvent(Number(outlet_id), {
      type: 'TABLE_ORDER_UPDATE',
      action: 'SAVE',
      table_id: String(table_id),
      outlet_id: Number(outlet_id),
      order: {
        id: orderId,
        table_id: String(table_id),
        table_number: String(table_number || table_id),
        customer_name: String(customer_name || 'Pelanggan Umum'),
        order_type: String(order_type || 'Dine In'),
        waiter_name: String(waiter_name || 'Waiters'),
        items: typeof items === 'string' ? JSON.parse(items) : (items || []),
        total_amount: totAmt,
        status: String(status || 'occupied'),
        updated_at: new Date().toISOString()
      }
    });

    return res.json({ success: true, message: 'Pesanan meja berhasil disinkronisasi', id: orderId });
  } catch (err) {
    console.error('POST /api/pos/table-orders error:', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 1e. DELETE /api/pos/table-orders/:table_id — Hapus pesanan meja (meja dikosongkan / dibatalkan)
app.delete('/api/pos/table-orders/:table_id', async (req, res) => {
  try {
    const tableId = req.params.table_id;
    const outletId = Number(req.query.outlet_id || 1);
    if (!tableId) return res.status(400).json({ success: false, error: 'table_id wajib diisi' });

    if (mysqlPool) {
      await mysqlPool.execute(
        'DELETE FROM active_table_orders WHERE outlet_id = ? AND (table_id = ? OR table_number = ? OR id = ?)',
        [outletId, tableId, tableId, tableId]
      );
    }

    // Broadcast SSE delete event
    broadcastPosEvent(outletId, {
      type: 'TABLE_ORDER_UPDATE',
      action: 'DELETE',
      table_id: String(tableId),
      outlet_id: outletId
    });

    return res.json({ success: true, message: `Pesanan meja ${tableId} berhasil dihapus` });
  } catch (err) {
    console.error('DELETE /api/pos/table-orders error:', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 1f. GET /api/sales/paginated — High-Performance Paginated Sales Transactions (Skala Besar)
app.get('/api/sales/paginated', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page || 1, 10));
    const limit = Math.min(200, Math.max(10, parseInt(req.query.limit || 50, 10)));
    const offset = (page - 1) * limit;

    const outletId = req.query.outlet_id ? Number(req.query.outlet_id) : null;
    const dateFrom = req.query.date_from || null;
    const dateTo = req.query.date_to || null;
    const search = req.query.search ? `%${req.query.search.trim()}%` : null;
    const paymentMethod = req.query.payment_method || null;

    if (!mysqlPool) return res.json({ success: true, transactions: [], pagination: { page: 1, limit, totalRecords: 0, totalPages: 0 } });

    let whereClauses = ['1=1'];
    let params = [];

    if (outletId) {
      whereClauses.push('outlet_id = ?');
      params.push(outletId);
    }
    if (dateFrom) {
      whereClauses.push('date >= ?');
      params.push(dateFrom);
    }
    if (dateTo) {
      whereClauses.push('date <= ?');
      params.push(dateTo);
    }
    if (paymentMethod && paymentMethod !== 'all') {
      whereClauses.push('payment_method = ?');
      params.push(paymentMethod);
    }
    if (search) {
      whereClauses.push('(receipt_no LIKE ? OR id LIKE ? OR customer_name LIKE ? OR cashier LIKE ? OR notes LIKE ?)');
      params.push(search, search, search, search, search);
    }

    const whereSql = whereClauses.join(' AND ');

    const [countRows] = await mysqlPool.execute(`SELECT COUNT(*) as total FROM sales_transactions WHERE ${whereSql}`, params);
    const totalRecords = countRows[0]?.total || 0;
    const totalPages = Math.ceil(totalRecords / limit) || 1;

    const [rows] = await mysqlPool.execute(
      `SELECT * FROM sales_transactions WHERE ${whereSql} ORDER BY date DESC, time DESC LIMIT ? OFFSET ?`,
      [...params, String(limit), String(offset)]
    );

    const transactions = rows.map(r => {
      let items = [];
      if (r.items_json) {
        try { items = typeof r.items_json === 'string' ? JSON.parse(r.items_json) : r.items_json; } catch (e) {}
      }
      if (!Array.isArray(items) || items.length === 0) {
        items = [{ name: r.notes && r.notes !== '-' ? r.notes : (r.branch_name ? `Menu ${r.branch_name}` : 'Menu Restoran'), qty: 1, price_unit: Number(r.amount || 0), amount: Number(r.amount || 0) }];
      }
      const dtStr = String(r.date ? (r.date.toISOString ? r.date.toISOString().substring(0, 10) : String(r.date).substring(0, 10)) : '');
      return {
        id: r.id,
        receipt_no: r.receipt_no || r.id,
        date: dtStr,
        time: String(r.time || '00:00:00').substring(0, 8),
        outlet_id: r.outlet_id,
        branch_name: r.branch_name,
        customer_name: r.customer_name,
        table_number: r.table_number,
        order_type: r.order_type,
        amount: Number(r.amount || 0),
        subtotal: Number(r.subtotal || r.amount || 0),
        discount_amount: Number(r.discount_amount || 0),
        paid_amount: Number(r.paid_amount || r.amount || 0),
        change_amount: Number(r.change_amount || 0),
        payment_method: r.payment_method,
        cashier: r.cashier,
        notes: r.notes,
        status: r.status,
        items
      };
    });

    return res.json({
      success: true,
      transactions,
      pagination: {
        page,
        limit,
        totalRecords,
        totalPages
      }
    });
  } catch (err) {
    console.error('GET /api/sales/paginated error:', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 1g. POST /api/sales/parse-import-file — Parse PDF / Excel Penjualan untuk Papan Review & Koreksi
app.post('/api/sales/parse-import-file', async (req, res) => {
  try {
    const { fileData, fileName, filePath } = req.body;
    let targetPath = filePath;

    if (!targetPath && fileData) {
      const isPdf = (fileName || '').toLowerCase().endsWith('.pdf') || fileData.startsWith('data:application/pdf') || fileData.startsWith('JVBERi0');
      const ext = isPdf ? '.pdf' : '.xlsx';
      targetPath = path.join(os.tmpdir(), `upload_${Date.now()}${ext}`);
      
      const base64Content = fileData.replace(/^data:[^;]+;base64,/, '');
      await fs.promises.writeFile(targetPath, Buffer.from(base64Content, 'base64'));
    }

    if (!targetPath || !fs.existsSync(targetPath)) {
      return res.status(400).json({ success: false, error: 'File tidak ditemukan atau format tidak didukung' });
    }

    const isPdf = targetPath.toLowerCase().endsWith('.pdf');

    if (isPdf) {
      // Eksekusi skrip python pdf_sales_parser.py
      const scriptPath = path.join(__dirname, 'scripts', 'pdf_sales_parser.py');
      exec(`python3 "${scriptPath}" "${targetPath}"`, { maxBuffer: 50 * 1024 * 1024 }, (err, stdout, stderr) => {
        if (err) {
          console.error('PDF Parse Error:', stderr || err.message);
          return res.status(500).json({ success: false, error: `Gagal mem-parse PDF: ${stderr || err.message}` });
        }
        try {
          const parsed = JSON.parse(stdout);
          return res.json(parsed);
        } catch (parseErr) {
          console.error('PDF JSON parse error:', stdout.substring(0, 300));
          return res.status(500).json({ success: false, error: 'Output parser PDF tidak valid' });
        }
      });
    } else {
      // Excel Parser
      const workbook = XLSX.readFile(targetPath);
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json(sheet);

      const txList = [];
      const uniqueRawItems = new Set();
      let totalOmzet = 0;

      rows.forEach((r, idx) => {
        const rawDate = String(r.Tanggal || r.Date || r.date || r.tanggal || '').trim();
        const dMatch = rawDate.match(/(\d{4}[-/]\d{2}[-/]\d{2})|(\d{2}[-/]\d{2}[-/]\d{4})/);
        let isoDate = new Date().toISOString().split('T')[0];
        if (dMatch) {
          const dStr = dMatch[0];
          if (dStr.includes('/')) {
            const p = dStr.split('/');
            isoDate = p[0].length === 4 ? `${p[0]}-${p[1]}-${p[2]}` : `${p[2]}-${p[1]}-${p[0]}`;
          } else {
            isoDate = dStr;
          }
        }

        const rawProd = String(r.Produk || r.Item || r.Menu || r.produk || r.nama_menu || '').trim();
        const totalVal = Number(String(r.Total || r.Jumlah || r.Amount || r.total || 0).replace(/[^0-9.-]+/g, '')) || 0;
        totalOmzet += totalVal;

        const rawItems = rawProd.split(/,|\n/).map(i => i.trim()).filter(Boolean);
        rawItems.forEach(it => uniqueRawItems.add(it));

        const receiptId = `TX-XLS-${isoDate.replace(/-/g, '')}-${idx + 1}`;
        txList.push({
          id: receiptId,
          receipt_no: receiptId,
          date: isoDate,
          time: '12:00:00',
          outlet_id: '1785369617361',
          outlet_name: String(r.Outlet || r.Cabang || 'AYAM PECAK 2001 SEAFOOD - KISARAN'),
          raw_products: rawProd,
          raw_items: rawItems,
          subtotal: totalVal,
          discount: 0,
          total: totalVal,
          amount: totalVal,
          paid_amount: totalVal,
          change_amount: 0,
          payment_method: 'Cash',
          customer_name: String(r.Pelanggan || r.Customer || 'Pelanggan Umum'),
          status: 'approved',
          cashier: 'Impor Excel'
        });
      });

      return res.json({
        success: true,
        totalPages: 1,
        totalCount: txList.length,
        totalOmzet,
        dateStart: txList[0]?.date || '',
        dateEnd: txList[txList.length - 1]?.date || '',
        outletsDetected: Array.from(new Set(txList.map(t => t.outlet_name))),
        uniqueRawMenus: Array.from(uniqueRawItems),
        transactions: txList
      });
    }
  } catch (err) {
    console.error('POST /api/sales/parse-import-file error:', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 1h. POST /api/sales/execute-import-batch — Simpan Seluruh Transaksi yang Terpetakan ke MySQL & Master Data
app.post('/api/sales/execute-import-batch', async (req, res) => {
  try {
    const { transactions = [], menuMapping = {}, deductStock = false, defaultOutletId = null } = req.body;

    if (!Array.isArray(transactions) || transactions.length === 0) {
      return res.status(400).json({ success: false, error: 'Tidak ada transaksi yang dikirim' });
    }

    let insertedCount = 0;
    let totalInsertedAmount = 0;

    for (const tx of transactions) {
      const txId = String(tx.id || `TX-IMP-${Date.now()}-${insertedCount}`);
      const txDate = tx.date || new Date().toISOString().split('T')[0];
      const txTime = tx.time || '12:00:00';
      const outletId = Number(defaultOutletId || tx.outlet_id || 1);
      const branchName = tx.outlet_name || tx.branch_name || 'Cabang';
      const amount = Number(tx.amount || tx.total || 0);
      totalInsertedAmount += amount;

      // Transform raw items using menuMapping
      let items = [];
      const rawList = Array.isArray(tx.raw_items) && tx.raw_items.length > 0 ? tx.raw_items : [tx.raw_products || 'Menu Restoran'];
      
      const itemPrice = rawList.length > 0 ? Math.round(amount / rawList.length) : amount;
      items = rawList.map(raw => {
        const mappedName = menuMapping[raw] || raw;
        return {
          name: mappedName,
          qty: 1,
          price: itemPrice,
          price_unit: itemPrice,
          amount: itemPrice
        };
      });

      const itemsJsonStr = JSON.stringify(items);

      if (mysqlPool) {
        await mysqlPool.execute(`
          INSERT INTO sales_transactions 
            (id, receipt_no, date, time, outlet_id, branch_id, branch_name, outlet, customer_name, table_number, order_type, subtotal, discount_amount, service_charge, tax_amount, adjustment_amount, amount, paid_amount, change_amount, payment_method, cashier, notes, status, type, items_json)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'income', ?)
          ON DUPLICATE KEY UPDATE
            date = VALUES(date),
            time = VALUES(time),
            outlet_id = VALUES(outlet_id),
            branch_name = VALUES(branch_name),
            amount = VALUES(amount),
            paid_amount = VALUES(paid_amount),
            items_json = VALUES(items_json),
            status = 'approved'
        `, [
          txId,
          tx.receipt_no || txId,
          txDate,
          txTime,
          outletId,
          outletId,
          branchName,
          branchName,
          tx.customer_name || 'Pelanggan Umum',
          tx.table_number || '',
          tx.order_type || 'Dine In',
          Number(tx.subtotal || amount),
          Number(tx.discount || 0),
          0,
          0,
          0,
          amount,
          Number(tx.paid_amount || amount),
          Number(tx.change_amount || 0),
          tx.payment_method || 'Cash',
          tx.cashier || 'Impor File',
          tx.notes || 'Diimpor dari dokumen penjualan',
          'approved',
          itemsJsonStr
        ]);
      }

      insertedCount++;
    }

    console.log(`[SalesImport] Berhasil mengimpor ${insertedCount} transaksi (Total: Rp ${totalInsertedAmount.toLocaleString('id-ID')})`);
    return res.json({
      success: true,
      count: insertedCount,
      totalAmount: totalInsertedAmount,
      message: `Berhasil mengimpor ${insertedCount} transaksi ke dalam database sistem.`
    });
  } catch (err) {
    console.error('POST /api/sales/execute-import-batch error:', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 1i. POST /api/expenses/parse-import-file — Parse Dokumen Pengeluaran (PDF / Excel)
app.post('/api/expenses/parse-import-file', async (req, res) => {
  try {
    const { fileName, fileData } = req.body;
    if (!fileName || !fileData) {
      return res.status(400).json({ success: false, error: 'File atau data file tidak boleh kosong' });
    }

    const base64Clean = fileData.replace(/^data:[^;]+;base64,/, '');
    const buffer = Buffer.from(base64Clean, 'base64');
    const ext = path.extname(fileName).toLowerCase();
    const tempFileName = `upload_exp_${Date.now()}${ext}`;
    const targetPath = path.join('/tmp', tempFileName);

    fs.writeFileSync(targetPath, buffer);

    if (ext === '.pdf') {
      const scriptPath = path.join(__dirname, 'scripts', 'pdf_expense_parser.py');
      exec(`python3 "${scriptPath}" "${targetPath}"`, { maxBuffer: 50 * 1024 * 1024 }, (err, stdout, stderr) => {
        if (err) {
          console.error('Expense PDF Parse Error:', stderr || err.message);
          return res.status(500).json({ success: false, error: `Gagal mem-parse PDF: ${stderr || err.message}` });
        }
        try {
          const parsed = JSON.parse(stdout);
          return res.json(parsed);
        } catch (parseErr) {
          console.error('Expense PDF JSON parse error:', stdout.substring(0, 300));
          return res.status(500).json({ success: false, error: 'Output parser PDF pengeluaran tidak valid' });
        }
      });
    } else {
      // Excel Expense Parser
      const workbook = XLSX.readFile(targetPath);
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json(sheet);

      const expList = [];
      const uniqueRawItems = new Set();
      const uniqueSuppliers = new Set();
      let totalExpense = 0;

      rows.forEach((r, idx) => {
        const rawDate = String(r.Tanggal || r.Date || r.date || r.tanggal || '').trim();
        const dMatch = rawDate.match(/(\d{4}[-/]\d{2}[-/]\d{2})|(\d{2}[-/]\d{2}[-/]\d{4})/);
        let isoDate = new Date().toISOString().split('T')[0];
        if (dMatch) {
          const dStr = dMatch[0];
          if (dStr.includes('/')) {
            const p = dStr.split('/');
            isoDate = p[0].length === 4 ? `${p[0]}-${p[1]}-${p[2]}` : `${p[2]}-${p[1]}-${p[0]}`;
          } else {
            isoDate = dStr;
          }
        }

        const rawItem = String(r.Item || r.Bahan || r.Barang || r.Keterangan || r.Deskripsi || r.Biaya || r.item || '').trim() || `Pengeluaran #${idx + 1}`;
        const supplier = String(r.Supplier || r.Pemasok || r.Toko || r.supplier || 'Supplier Umum / Pasar').trim();
        const amountVal = Number(String(r.Jumlah || r.Total || r.Amount || r.Nominal || r.total || 0).replace(/[^0-9.-]+/g, '')) || 0;
        totalExpense += amountVal;

        uniqueRawItems.add(rawItem);
        if (supplier) uniqueSuppliers.add(supplier);

        const receiptId = `EXP-XLS-${isoDate.replace(/-/g, '')}-${String(idx + 1).padStart(4, '0')}`;
        expList.push({
          id: receiptId,
          receipt_no: receiptId,
          date: isoDate,
          time: '12:00:00',
          outlet_name: String(r.Outlet || r.Cabang || 'Semua Outlet'),
          supplier_name: supplier,
          raw_item: rawItem,
          raw_items: [rawItem],
          amount: amountVal,
          payment_method: String(r.Metode || r.Payment || 'Cash / Kasir'),
          notes: String(r.Catatan || r.Notes || 'Diimpor dari Excel Pengeluaran')
        });
      });

      return res.json({
        success: true,
        totalPages: 1,
        totalCount: expList.length,
        totalExpense,
        dateStart: expList[0]?.date || '',
        dateEnd: expList[expList.length - 1]?.date || '',
        suppliersDetected: Array.from(uniqueSuppliers),
        uniqueRawItems: Array.from(uniqueRawItems),
        expenses: expList
      });
    }
  } catch (err) {
    console.error('POST /api/expenses/parse-import-file error:', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 1j. POST /api/expenses/execute-import-batch — Simpan Seluruh Pengeluaran Terpetakan ke MySQL & Update Stok
app.post('/api/expenses/execute-import-batch', async (req, res) => {
  try {
    const { expenses = [], itemMapping = {}, increaseStock = false, defaultOutletId = null } = req.body;

    if (!Array.isArray(expenses) || expenses.length === 0) {
      return res.status(400).json({ success: false, error: 'Tidak ada pengeluaran yang dikirim' });
    }

    const masterData = await getUnifiedData();
    let insertedCount = 0;
    let totalInsertedAmount = 0;
    const nowTs = Date.now();

    const createdTxList = [];

    for (const exp of expenses) {
      const expId = String(exp.id || `EXP-IMP-${nowTs}-${insertedCount}`);
      const expDate = exp.date || new Date().toISOString().split('T')[0];
      const outletId = Number(defaultOutletId || exp.outlet_id || 1);
      const branchName = exp.outlet_name || 'Semua Outlet';
      const amount = Number(exp.amount || 0);
      const rawItem = exp.raw_item || 'Bahan / Biaya Operasional';
      const mappedCategoryOrItem = itemMapping[rawItem] || rawItem;
      const supplierName = exp.supplier_name || 'Supplier Pasar';
      totalInsertedAmount += amount;

      const txObj = {
        id: nowTs + insertedCount,
        receipt_no: exp.receipt_no || expId,
        branch_id: outletId,
        outlet_id: outletId,
        branch_name: branchName,
        type: 'expense',
        category: mappedCategoryOrItem,
        amount: amount,
        description: `Pembelian/Beban: ${rawItem} (${supplierName})`,
        supplier_name: supplierName,
        payment_method: exp.payment_method || 'Cash / Kasir',
        date: expDate,
        time: exp.time || '12:00:00',
        created_by: 'Impor Dokumen Pengeluaran',
        status: 'approved',
        notes: exp.notes || 'Diimpor dari Dokumen Pengeluaran'
      };

      createdTxList.push(txObj);
      insertedCount++;
    }

    masterData.transactions = [...createdTxList, ...(masterData.transactions || [])];
    masterData.cogsExpenses = [...createdTxList, ...(masterData.cogsExpenses || [])];
    masterData._lastUpdated = Date.now();
    masterData._lastMutated = Date.now();

    await saveMasterDataToMySQL(masterData);
    await syncToMySQL(masterData);

    console.log(`[ExpenseImport] Berhasil mengimpor ${insertedCount} pengeluaran (Total: Rp ${totalInsertedAmount.toLocaleString('id-ID')})`);
    return res.json({
      success: true,
      count: insertedCount,
      totalAmount: totalInsertedAmount,
      message: `Berhasil mengimpor ${insertedCount} data pengeluaran ke dalam database sistem.`
    });
  } catch (err) {
    console.error('POST /api/expenses/execute-import-batch error:', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 2. POST /api/pos/shift-close — Direct POS Shift Closing (Auto-Approved & Immediate)
app.post('/api/pos/shift-close', async (req, res) => {
  try {
    const sc = req.body;
    if (!sc || !sc.id) {
      return res.status(400).json({ success: false, error: 'Data shift closing tidak valid' });
    }

    const scId = String(sc.id);
    const scDate = sc.date || new Date().toISOString().split('T')[0];
    const outletId = Number(sc.outlet_id || 1);
    const branchName = sc.branch_name || sc.outlet_name || '';
    const authorName = sc.cashier_name || sc.author_name || sc.cashier || 'Kasir POS';
    const openingFloat = Number(sc.initial_cash || sc.opening_float || 0);
    const netSales = Number(sc.gross_sales || sc.net_sales || sc.total_sales || 0);
    const cashSales = Number(sc.cash_sales || 0);
    const nonCashSales = Number(sc.non_cash_sales || 0);
    const totalExpense = Number(sc.petty_expense || sc.total_expense || 0);
    const expectedCash = Number(sc.expected_cash || (openingFloat + cashSales - totalExpense));
    const cashPhysical = Number(sc.physical_cash || sc.cash_physical || expectedCash);
    const cashVariance = Number(sc.variance || sc.cash_variance || (cashPhysical - expectedCash));
    const status = 'SELESAI DITUTUP';

    // Langsung insert ke MySQL shift_closings
    if (mysqlPool) {
      await mysqlPool.execute(`
        INSERT INTO shift_closings 
          (id, date, outlet_id, branch_name, author_name, opening_float, net_sales, cash_sales, non_cash_sales, total_expense, expected_cash, cash_physical, cash_variance, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          date = VALUES(date),
          outlet_id = VALUES(outlet_id),
          branch_name = VALUES(branch_name),
          author_name = VALUES(author_name),
          opening_float = VALUES(opening_float),
          net_sales = VALUES(net_sales),
          cash_sales = VALUES(cash_sales),
          non_cash_sales = VALUES(non_cash_sales),
          total_expense = VALUES(total_expense),
          expected_cash = VALUES(expected_cash),
          cash_physical = VALUES(cash_physical),
          cash_variance = VALUES(cash_variance),
          status = VALUES(status)
      `, [scId, scDate, outletId, branchName, authorName, openingFloat, netSales, cashSales, nonCashSales, totalExpense, expectedCash, cashPhysical, cashVariance, status]);
    }

    // Update masterData cache in background
    getMasterDataFromMySQL().then(async (cur) => {
      const current = cur || defaultMasterData;
      const normalizedSc = { ...sc, status: 'SELESAI DITUTUP', is_approved: true };
      current.shiftClosings = [normalizedSc, ...(current.shiftClosings || []).filter(s => String(s.id) !== scId)];
      current.shift_closings = [normalizedSc, ...(current.shift_closings || []).filter(s => String(s.id) !== scId)];
      current.approvedFinanceDaily = [normalizedSc, ...(current.approvedFinanceDaily || []).filter(s => String(s.id) !== scId)];
      current.closedShifts = [normalizedSc, ...(current.closedShifts || []).filter(s => String(s.id) !== scId)];
      current._lastUpdated = Date.now();
      await saveMasterDataToMySQL(current);
    }).catch(() => {});

    return res.json({ success: true, message: 'Tutup shift berhasil disimpan otomatis ke MySQL', id: scId });
  } catch (err) {
    console.error('POST /api/pos/shift-close error:', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/pos-force-flush — Paksa semua POS tablet flush data transaksi ke server (auto-expire 60 detik)
app.post('/api/pos-force-flush', async (req, res) => {
  forceFlushUntil = Date.now() + FORCE_FLUSH_TTL_MS; // Aktif selama 60 detik
  console.log('[FORCE-FLUSH] Perintah force-flush aktif selama 60 detik untuk semua POS client');

  // Simpan _forceFlushAt ke DB agar auto-expire bekerja meski server restart
  try {
    const cur = await getMasterDataFromMySQL();
    if (cur) {
      cur._forceFlushCommand = true;
      cur._forceFlushAt = Date.now();
      cur._lastUpdated = Date.now();
      await saveMasterDataToMySQL(cur);
    }
  } catch (e) { /* non-fatal */ }

  return res.json({ success: true, message: 'Perintah force-flush aktif selama 60 detik. Semua POS akan otomatis upload transaksi, lalu perintah mati sendiri.' });
});

// POST /api/master-data — 100% MySQL PRIMARY STORAGE UPDATE
app.post('/api/master-data', async (req, res) => {
  try {
    const incomingData = req.body;

    if (!incomingData || typeof incomingData !== 'object') {
      return res.status(400).json({ success: false, error: 'Payload tidak valid' });
    }

    // Baca data terkini dari MySQL; jika gagal/null, gunakan defaultMasterData sebagai base
    const currentData = (await getMasterDataFromMySQL()) || defaultMasterData;
    const sanitizedIncoming = sanitizeMasterDataPayload(incomingData);

    // Merge data incoming dengan data server terkini (additive union merge for transactions & master data)
    const mergedData = mergeMasterDataSafely(currentData, sanitizedIncoming);
    mergedData._lastUpdated = Date.now();

    // Simpan ke JSON blob MySQL (dibaca oleh GET /api/master-data) — FIX KRITIS SINKRONISASI
    await saveMasterDataToMySQL(mergedData);
    // Sync ke tabel-tabel relasional MySQL (sales_transactions, shift_closings, stock_movement, dll)
    await syncToMySQL(mergedData);


    return res.json({
      success: true,
      message: 'Master data berhasil diperbarui & tersinkronisasi ke MySQL mris_db',
      data: mergedData,
      _lastUpdated: mergedData._lastUpdated
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/master-data/delete-item — Hapus spesifik item dari masterData & MySQL
app.post('/api/master-data/delete-item', async (req, res) => {
  try {
    const { key, id } = req.body;
    if (!key || id === undefined || id === null) {
      return res.status(400).json({ success: false, error: 'Parameter key dan id wajib diisi' });
    }

    const existing = (await getMasterDataFromMySQL()) || defaultMasterData;
    const idStr = String(id);
    const nowTs = Date.now();

    // Catat ID & Receipt No & Username yang dihapus ke tombstone tracking
    const targetRcpt = String(req.body.receipt_no || '');
    const targetUsername = String(req.body.username || '').toLowerCase().trim();

    existing.deletedLogisticsIds = Array.from(new Set([
      ...(existing.deletedLogisticsIds || []),
      idStr,
      targetRcpt
    ].filter(Boolean)));
    existing.deletedReportIds = Array.from(new Set([
      ...(existing.deletedReportIds || []),
      idStr,
      targetRcpt
    ].filter(Boolean)));
    existing.deletedSalesIds = Array.from(new Set([
      ...(existing.deletedSalesIds || []),
      idStr,
      targetRcpt
    ].filter(Boolean)));
    existing.deletedUserIds = Array.from(new Set([
      ...(existing.deletedUserIds || []),
      idStr
    ].filter(Boolean)));

    if (targetUsername) {
      existing.deletedUsernames = Array.from(new Set([
        ...(existing.deletedUsernames || []),
        targetUsername
      ].filter(Boolean)));
    }

    if (key === 'products' || key === 'menuItems') {
      const targetSku = String(req.body.sku || req.body.code || '');
      const targetName = String(req.body.name || '').toLowerCase().trim();
      existing.deletedProductIds = Array.from(new Set([
        ...(existing.deletedProductIds || []),
        idStr,
        targetSku,
        targetName
      ].filter(Boolean)));
    } else if (key === 'ingredients') {
      const targetCode = String(req.body.code || req.body.sku || '');
      const targetName = String(req.body.name || '').toLowerCase().trim();
      existing.deletedIngredientIds = Array.from(new Set([
        ...(existing.deletedIngredientIds || []),
        idStr,
        targetCode,
        targetName
      ].filter(Boolean)));
    } else if (key === 'categories' || key === 'ingredientCategories') {
      const targetCode = String(req.body.code || '');
      const targetName = String(req.body.name || '').toLowerCase().trim();
      existing.deletedCategoriesIds = Array.from(new Set([
        ...(existing.deletedCategoriesIds || []),
        ...(existing.deletedCategoryIds || []),
        idStr,
        targetCode,
        targetName
      ].filter(Boolean)));
      existing.deletedCategoryIds = existing.deletedCategoriesIds;
    } else if (key === 'suppliers') {
      const targetCode = String(req.body.code || '');
      const targetName = String(req.body.name || '').toLowerCase().trim();
      existing.deletedSupplierIds = Array.from(new Set([
        ...(existing.deletedSupplierIds || []),
        idStr,
        targetCode,
        targetName
      ].filter(Boolean)));
    } else if (key === 'customers') {
      const targetCode = String(req.body.code || '');
      const targetName = String(req.body.name || '').toLowerCase().trim();
      existing.deletedCustomerIds = Array.from(new Set([
        ...(existing.deletedCustomerIds || []),
        idStr,
        targetCode,
        targetName
      ].filter(Boolean)));
    } else if (key === 'units') {
      const targetName = String(req.body.name || '').toLowerCase().trim();
      existing.deletedUnitIds = Array.from(new Set([
        ...(existing.deletedUnitIds || []),
        idStr,
        targetName
      ].filter(Boolean)));
    } else if (key === 'outlets') {
      const targetCode = String(req.body.code || '');
      const targetName = String(req.body.name || '').toLowerCase().trim();
      existing.deletedOutletIds = Array.from(new Set([
        ...(existing.deletedOutletIds || []),
        idStr,
        targetCode,
        targetName
      ].filter(Boolean)));
    } else if (key === 'paymentMethods') {
      const targetCode = String(req.body.code || '');
      const targetName = String(req.body.name || '').toLowerCase().trim();
      existing.deletedPaymentMethodIds = Array.from(new Set([
        ...(existing.deletedPaymentMethodIds || []),
        idStr,
        targetCode,
        targetName
      ].filter(Boolean)));
    } else if (key === 'tables') {
      const targetName = String(req.body.name || '').toLowerCase().trim();
      existing.deletedTableIds = Array.from(new Set([
        ...(existing.deletedTableIds || []),
        idStr,
        targetName
      ].filter(Boolean)));
    } else if (key === 'expenseMaster') {
      const targetCode = String(req.body.code || '');
      const targetName = String(req.body.name || '').toLowerCase().trim();
      existing.deletedExpenseIds = Array.from(new Set([
        ...(existing.deletedExpenseIds || []),
        idStr,
        targetCode,
        targetName
      ].filter(Boolean)));
    }

    if (key === 'webAdminAccounts' || key === 'mobileAccounts') {
      const filterOutUser = u => {
        if (!u) return false;
        const uId = String(u.id);
        const uName = String(u.username || u.name || '').toLowerCase().trim();
        if (uId === idStr) return false;
        if (targetUsername && uName === targetUsername) return false;
        return true;
      };

      if (Array.isArray(existing.webAdminAccounts)) existing.webAdminAccounts = existing.webAdminAccounts.filter(filterOutUser);
      if (Array.isArray(existing.mobileAccounts)) existing.mobileAccounts = existing.mobileAccounts.filter(filterOutUser);
      if (Array.isArray(existing.userRights)) existing.userRights = existing.userRights.filter(filterOutUser);
      if (Array.isArray(existing.users)) existing.users = existing.users.filter(filterOutUser);
      if (Array.isArray(existing.userAccounts)) existing.userAccounts = existing.userAccounts.filter(filterOutUser);
    }

    const reportKeys = ['approvedFinanceDaily', 'shiftClosings', 'shift_closings', 'closedShifts', 'dailyReports', 'manualEntryRecords'];
    const logisticsKeys = [
      'stockOpname', 'approvedLogistics', 'approvedOpname',
      'stockTransfer', 'approvedTransfers', 'damagedGoods',
      'approvedWaste', 'stockMovement', 'stockIn', 'purchases',
      'stok_masuk', 'stok_keluar', 'transfer_stok', 'stok_rusak', 'stok_opname'
    ];

    if (reportKeys.includes(key)) {
      const matchReport = r => {
        if (!r) return false;
        const rId = String(r.id !== undefined && r.id !== null ? r.id : '');
        const rNo = String(r.report_no || '');
        return rId === idStr || rNo === idStr;
      };

      reportKeys.forEach(rk => {
        if (Array.isArray(existing[rk])) {
          existing[rk] = existing[rk].filter(r => !matchReport(r));
        }
      });
    } else if (logisticsKeys.includes(key)) {
      const matchLogistics = item => {
        if (!item) return false;
        const itemId = String(item.id !== undefined && item.id !== null ? item.id : '');
        const itemRNo = String(item.report_no || item.receiptNo || '');
        return itemId === idStr || itemRNo === idStr;
      };

      // Hapus dari SEMUA key logistik terkait
      const ALL_LOGISTICS_KEYS = [
        'stockOpname', 'approvedLogistics', 'approvedOpname',
        'stockTransfer', 'approvedTransfers', 'damagedGoods',
        'approvedWaste', 'stockMovement', 'stockIn', 'purchases'
      ];

      ALL_LOGISTICS_KEYS.forEach(lk => {
        if (Array.isArray(existing[lk])) {
          existing[lk] = existing[lk].filter(item => !matchLogistics(item));
        }
      });

      // Hapus dari tabel relasi MySQL stock_movement
      if (mysqlPool && idStr) {
        try {
          await mysqlPool.execute(`DELETE FROM \`stock_movement\` WHERE id = ? OR reason LIKE ? OR ingredient_name = ?`, [idStr, `%${idStr}%`, idStr]);
        } catch (delErr) {}
      }
    } else if (key === 'salesTransactions' || key === 'transactions' || key === 'outletTransactions') {
      const targetId = idStr;
      const isMatch = item => {
        if (!item) return false;
        const itemId = String(item.id !== undefined && item.id !== null ? item.id : '');
        const itemRcpt = String(item.receipt_no || item.transaction_id || '');
        if (itemId === targetId || itemId === idStr) return true;
        if (itemRcpt && (itemRcpt === targetId || itemRcpt === idStr)) return true;
        return false;
      };

      if (Array.isArray(existing.salesTransactions)) {
        existing.salesTransactions = existing.salesTransactions.filter(item => !isMatch(item));
      }
      if (Array.isArray(existing.transactions)) {
        existing.transactions = existing.transactions.filter(item => !isMatch(item));
      }
      if (Array.isArray(existing.outletTransactions)) {
        existing.outletTransactions = existing.outletTransactions.filter(item => !isMatch(item));
      }
    } else if (Array.isArray(existing[key])) {
      existing[key] = existing[key].filter(item => {
        if (!item) return false;
        const itemId = String(item.id !== undefined && item.id !== null ? item.id : '');
        const itemSku = String(item.sku || '');
        const itemCode = String(item.code || '');
        const itemName = String(item.name || '').toLowerCase().trim();
        const targetLower = idStr.toLowerCase().trim();
        if (itemId === idStr || (Number(itemId) && Number(itemId) === Number(idStr))) return false;
        if (itemSku && itemSku === idStr) return false;
        if (itemCode && itemCode === idStr) return false;
        if (itemName && itemName === targetLower) return false;
        return true;
      });
    }

    existing._lastUpdated = nowTs;

    // Hapus murni dari tabel relasi MySQL berdasarkan Primary Key (ID) masing-masing
    if (mysqlPool && idStr) {
      try {
        if (key === 'webAdminAccounts') {
          if (targetUsername) {
            await mysqlPool.execute(`DELETE FROM \`web_admin_users\` WHERE id = ? OR LOWER(username) = ? OR LOWER(name) = ?`, [idStr, targetUsername, targetUsername]);
          } else {
            await mysqlPool.execute(`DELETE FROM \`web_admin_users\` WHERE id = ?`, [idStr]);
          }
        } else if (key === 'mobileAccounts') {
          if (targetUsername) {
            await mysqlPool.execute(`DELETE FROM \`mobile_pos_users\` WHERE id = ? OR LOWER(username) = ? OR LOWER(name) = ?`, [idStr, targetUsername, targetUsername]);
          } else {
            await mysqlPool.execute(`DELETE FROM \`mobile_pos_users\` WHERE id = ?`, [idStr]);
          }
        } else {
          const relTable = key === 'products' || key === 'menuItems' ? 'products' :
                           key === 'categories' || key === 'ingredientCategories' ? 'categories' :
                           key === 'outlets' ? 'outlets' :
                           key === 'ingredients' ? 'ingredients' :
                           key === 'suppliers' ? 'suppliers' :
                           key === 'customers' ? 'customers' :
                           key === 'units' ? 'units' :
                           key === 'salesTransactions' || key === 'transactions' ? 'sales_transactions' : null;
          if (relTable) {
            const targetName = String(req.body.name || '').trim();
            const targetCode = String(req.body.code || req.body.sku || '').trim();
            try {
              await mysqlPool.execute(`DELETE FROM \`${relTable}\` WHERE id = ? OR code = ? OR name = ?`, [idStr, targetCode || idStr, targetName || idStr]);
            } catch (dErr) {
              await mysqlPool.execute(`DELETE FROM \`${relTable}\` WHERE id = ?`, [idStr]).catch(() => {});
            }
          }
        }
      } catch (delErr) {}
    }

    // Sync ulang sisa data ke relasi dan JSON blob MySQL
    await saveMasterDataToMySQL(existing);
    await syncToMySQL(existing);

    res.json({
      success: true,
      message: `Item ID ${id} dari ${key} berhasil dihapus permanen`,
      masterData: existing,
      _lastUpdated: nowTs
    });
  } catch (err) {
    console.error('POST /api/master-data/delete-item error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// -----------------------------------------------------------------------------
// ENDPOINT MANUAL RECALL & SNAPSHOT DATABASE STATIS (mris_finance.json)
// -----------------------------------------------------------------------------

// POST /api/db/backup-snapshot — Manual Recall: Ambil snapshot MySQL -> file statis
app.post('/api/db/backup-snapshot', async (req, res) => {
  try {
    const currentData = await getMasterDataFromMySQL();
    if (!currentData) {
      return res.status(400).json({ error: 'Data MySQL kosong, tidak bisa membuat snapshot' });
    }
    const db = readDb();
    db.masterData = currentData;
    db.lastUpdated = new Date().toISOString();
    saveDb(db);
    res.json({
      success: true,
      message: '✅ Snapshot manual berhasil disimpan ke database statis (mris_finance.json)',
      timestamp: db.lastUpdated
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/db/restore-snapshot — Manual Recall: Pulihkan file statis -> MySQL mris_db
app.post('/api/db/restore-snapshot', async (req, res) => {
  try {
    const db = readDb();
    if (!db || !db.masterData) {
      return res.status(400).json({ error: 'Database statis mris_finance.json tidak memiliki data master' });
    }
    const restoredData = sanitizeMasterDataPayload({ ...db.masterData, _lastUpdated: Date.now() });
    await saveMasterDataToMySQL(restoredData);
    await syncToMySQL(restoredData);
    res.json({
      success: true,
      message: '✅ Data dari database statis mris_finance.json berhasil direcall ke MySQL mris_db!',
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Serve Web Admin UI (web_admin/dist)
// Aset JS/CSS di-cache oleh browser karena nama file berubah setiap build (content hash)
app.use('/assets', express.static(path.join(__dirname, 'web_admin', 'dist', 'assets'), {
  maxAge: '1y',
  immutable: true
}));
// File lain (index.html, favicon, dll) TIDAK di-cache agar WebView APK selalu muat versi terbaru
app.use(express.static(path.join(__dirname, 'web_admin', 'dist'), {
  maxAge: 0,
  etag: false,
  lastModified: false,
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('index.html')) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    }
  }
}));

app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/phpmyadmin') || req.path.startsWith('/adminer') || req.path.startsWith('/db-explorer')) {
    return next();
  }
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.sendFile(path.join(__dirname, 'web_admin', 'dist', 'index.html'));
});

// ── DEPLOY ENDPOINT: git pull dari GitHub lalu restart PM2 (TIDAK rebuild sendiri) ──
// Alur deploy yang benar: local build → git push → VPS git pull (via endpoint ini)
// Jangan gunakan git reset --hard karena akan menghapus file rsync yang belum di-commit
app.all('/api/webhook/force-build', (req, res) => {
  const secret = req.query.secret || req.body?.secret;
  if (secret !== (process.env.DEPLOY_SECRET || 'mris_deploy_secret_2026')) {
    return res.status(403).json({ error: 'Unauthorized' });
  }
  const DIR = '/var/www/erp-barokah';
  // Langkah 1: git pull origin main (fast-forward saja, tidak overwrite file lokal)
  // Langkah 2: install deps jika package.json berubah
  // Langkah 3: PM2 restart agar server.js terbaru aktif
  const pullCmd = [
    `cd "${DIR}"`,
    'git fetch origin',
    'git merge --ff-only origin/main',
    'npm install --omit=dev --silent 2>&1 | tail -3',
    'pm2 restart erp-barokah --update-env',
    'echo "DEPLOY_OK"'
  ].join(' && ');
  exec(pullCmd, { maxBuffer: 1024 * 1024 * 20, timeout: 300000 }, (err, stdout, stderr) => {
    if (err) {
      // Jika ff-only gagal (ada divergence), tampilkan pesan jelas
      const msg = stderr?.includes('Not possible to fast-forward')
        ? 'Git divergence: push lokal ke GitHub dulu sebelum deploy!'
        : err.message;
      return res.status(500).json({ success: false, error: msg, stderr: stderr?.slice(-1000) });
    }
    res.json({ success: true, output: stdout?.slice(-500) });
  });
});

// Start Server — PORT resmi produksi: 5001 (dikunci, tidak tergantung env)
const TARGET_PORT = PORT;

const startServer = (portToUse, retries = 5) => {
  const server = app.listen(portToUse, '0.0.0.0', () => {
    console.log(`🚀 MRIS Full-Stack App & API running on http://0.0.0.0:${portToUse}`);
  });

  // Tuned for 25+ simultaneous POS Kasir Android devices & Web Admin clients
  server.keepAliveTimeout = 65000;
  server.headersTimeout = 66000;
  server.maxHeadersCount = 3000;

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE' && retries > 0) {
      console.log(`⚠️ Port ${portToUse} is occupied. Retrying in 1.5s (${retries} retries left)...`);
      setTimeout(() => {
        startServer(portToUse, retries - 1);
      }, 1500);
    } else {
      console.error('❌ Server listen error:', err.message);
    }
  });
};

startServer(TARGET_PORT);
