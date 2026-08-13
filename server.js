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
// PORT resmi produksi VPS: 5001 (sesuai Nginx proxy_pass)
const PORT = 5001;

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
      keepAliveInitialDelay: 0
    });
    mysqlInitError = null;
    console.log('✅ MySQL Pool Initialized for VPS (187.77.122.142) mris_db Storage');
    // Auto-create master data table jika belum ada
    await ensureMasterDataTable();
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
    // 1. Sync Outlets to MySQL relational table
    const outlets = masterData.outlets || [];
    for (const o of outlets) {
      if (!o || !o.id) continue;
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
        p.outlet_id ? Number(p.outlet_id) : null,
        Array.isArray(p.selected_outlet_ids) ? JSON.stringify(p.selected_outlet_ids) : String(p.selected_outlet_ids || ''),
        String(p.image_url || p.image || ''),
        String(p.description || ''),
        String(p.status || 'Aktif')
      ]);
    }

    // 5. Sync Transactions to MySQL relational table
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

    // 6. Sync Shift Closings to MySQL relational table
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
        // Pertahankan data existing yang ada — jangan izinkan array kosong menimpa data user
        result[key] = extVal;
        return;
      }

      // If incoming payload timestamp is newer or equal (active client mutation), adopt incVal directly to respect additions & deletions 100%
      if (incTs >= extTs || !extVal) {
        if (incVal.length > 0) {
          result[key] = incVal;
        } else if (!extVal || extVal.length === 0 || incoming._isExplicitClear) {
          result[key] = [];
        } else {
          // If incVal is [] but extVal has items and not an explicit clear, keep extVal to protect against accidental empty array payload wipes
          result[key] = extVal;
        }
      } else {
        // If incoming timestamp is older, adopt incoming non-empty array or keep existing
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

  return result;
};

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

// -----------------------------------------------------------------------------
// SINKRONISASI DATA MASTER TERPUSAT (SINGLE PRIMARY DATABASE: MySQL mris_db)
// -----------------------------------------------------------------------------

// GET /api/master-data — 100% MySQL PRIMARY STORAGE
app.get('/api/master-data', async (req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  try {
    const clientTs = Number(req.query.ts || req.headers['x-mris-ts'] || 0);
    const mysqlData = await getMasterDataFromMySQL();
    const activeData = (mysqlData && typeof mysqlData === 'object') ? mysqlData : masterData;
    const serverTs = Number(activeData._lastUpdated || 0);

    if (clientTs > 0 && serverTs > 0 && clientTs >= serverTs) {
      return res.status(304).end();
    }

    return res.json(sanitizeMasterDataPayload(activeData));
  } catch (err) {
    return res.json(sanitizeMasterDataPayload(masterData));
  }
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

    // Merge data incoming dengan data server terkini
    const mergedData = mergeMasterDataSafely(currentData, sanitizedIncoming);
    mergedData._lastUpdated = Date.now();

    // Simpan ke JSON blob MySQL (dibaca oleh GET /api/master-data) — FIX KRITIS SINKRONISASI
    await saveMasterDataToMySQL(mergedData);
    // Sync ke tabel-tabel relasional MySQL (shift_closings, stock_movement, dll)
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
        const itemId = String(item.id !== undefined ? item.id : item.code || item.name);
        return itemId !== idStr;
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
          const relTable = key === 'products' ? 'products' :
                           key === 'categories' ? 'categories' :
                           key === 'outlets' ? 'outlets' :
                           key === 'ingredients' ? 'ingredients' :
                           key === 'suppliers' ? 'suppliers' :
                           key === 'customers' ? 'customers' :
                           key === 'salesTransactions' || key === 'transactions' ? 'sales_transactions' : null;
          if (relTable) {
            await mysqlPool.execute(`DELETE FROM \`${relTable}\` WHERE id = ? OR receipt_no = ? OR code = ?`, [idStr, idStr, idStr]);
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
app.use(express.static(path.join(__dirname, 'web_admin', 'dist')));

app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/phpmyadmin') || req.path.startsWith('/adminer') || req.path.startsWith('/db-explorer')) {
    return next();
  }
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
