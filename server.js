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

    // 2. Sync Users to MySQL relational table
    const usersMap = new Map();
    const userSources = [
      ...(masterData.users || []),
      ...(masterData.userAccounts || []),
      ...(masterData.webAdminAccounts || []),
      ...(masterData.mobileAccounts || [])
    ];
    userSources.forEach(u => {
      if (u && (u.id || u.username)) {
        const key = String(u.id || u.username);
        usersMap.set(key, u);
      }
    });

    for (const u of Array.from(usersMap.values())) {
      const uId = Number(u.id) || Date.now();
      const uName = String(u.name || u.username || 'User');
      const uUsername = String(u.username || u.name || `user_${uId}`).toLowerCase().replace(/\s+/g, '_');
      const uPassword = String(u.password || u.mobileLoginPassword || '1234');
      const uRole = String(u.role || 'Kasir');
      const uOutlet = String(u.outlet || u.assignedOutlet || 'Semua Outlet (Central)');
      const uStatus = String(u.status || 'Aktif');
      const canMobile = u.canLoginMobile !== false ? 1 : 0;
      const mobPass = String(u.mobileLoginPassword || u.password || '');
      const canReports = u.canAccessMobileReports ? 1 : 0;
      const repPass = String(u.mobileReportPassword || '');

      await mysqlPool.execute(`
        INSERT INTO users (id, name, username, password, role, outlet, status, can_login_mobile, mobile_login_password, can_access_mobile_reports, mobile_report_password)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          name = VALUES(name),
          username = VALUES(username),
          password = VALUES(password),
          role = VALUES(role),
          outlet = VALUES(outlet),
          status = VALUES(status),
          can_login_mobile = VALUES(can_login_mobile),
          mobile_login_password = VALUES(mobile_login_password),
          can_access_mobile_reports = VALUES(can_access_mobile_reports),
          mobile_report_password = VALUES(mobile_report_password)
      `, [uId, uName, uUsername, uPassword, uRole, uOutlet, uStatus, canMobile, mobPass, canReports, repPass]);
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

      await mysqlPool.execute(`
        INSERT INTO stock_movement (date, time, ingredient_name, type, qty, unit, outlet_id, source_outlet, target_outlet, reason, user_name)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [smDate, smTime, smName, smType, smQty, smUnit, smOutletId, smSource, smTarget, smReason, smUser]).catch(() => {});
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
    res.json({ success: true, message: `Baris ID ${id} berhasil diperbarui di tabel ${table}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Standalone phpMyAdmin / Adminer Web Interface Route
app.get(['/phpmyadmin', '/phpmyadmin/*', '/adminer', '/adminer/*', '/api/phpmyadmin', '/api/phpmyadmin/*', '/api/db-explorer'], (req, res) => {
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
      <button onclick="loadTables()" style="background:none; border:none; color:#38bdf8; cursor:pointer; font-size:14px;" title="Refresh">🔄</button>
    </div>
    <div class="table-list" id="tableList">
      <div style="padding:15px; color:#94a3b8;">Memuat tabel...</div>
    </div>
  </div>
  <div class="main">
    <div class="topbar">
      <div>
        <h3 id="currentTableTitle" style="font-size:1.1rem; font-weight:800; color:#f8fafc;">Pilih Tabel Database</h3>
        <span id="dbStatus" style="font-size:11px; color:#10b981; font-weight:700;">🟢 Full Access: Edit & Hapus Aktif (mris_db)</span>
      </div>
      <div class="tabs">
        <button class="tab-btn active" id="btn-browse" onclick="switchTab('browse')">🔍 Browse Data</button>
        <button class="tab-btn" id="btn-structure" onclick="switchTab('structure')">📐 Structure</button>
        <button class="tab-btn" id="btn-sql" onclick="switchTab('sql')">⚡ SQL Console</button>
      </div>
    </div>
    <div class="content-area" id="contentArea">
      <div style="padding: 50px; text-align: center; color: #94a3b8;">
        <h2>Selamat datang di phpMyAdmin / Database Manager (mris_db)</h2>
        <p style="margin-top:10px;">Akses penuh Edit, Hapus, dan Eksekusi SQL Aktif.</p>
      </div>
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

    async function loadTables() {
      try {
        const res = await fetch('/api/db/tables');
        const data = await res.json();
        const container = document.getElementById('tableList');
        if (data.tables && data.tables.length > 0) {
          container.innerHTML = data.tables.map(function(t) {
            return '<div class="table-item ' + (t.name === activeTable ? 'active' : '') + '" onclick="selectTable(\'' + t.name + '\')">' +
              '<span>📂 ' + t.name + '</span>' +
              '<span class="badge">' + t.count + '</span>' +
            '</div>';
          }).join('');
          if (!activeTable && data.tables.length > 0) {
            selectTable(data.tables[0].name);
          }
        } else {
          container.innerHTML = '<div style="padding:15px; color:#ef4444;">Tidak ada tabel / Standalone JSON Mode</div>';
        }
      } catch (err) {
        document.getElementById('tableList').innerHTML = '<div style="padding:15px; color:#ef4444;">Gagal memuat tabel</div>';
      }
    }

    async function selectTable(tableName) {
      activeTable = tableName;
      document.getElementById('currentTableTitle').innerText = 'Tabel: ' + tableName;
      loadTables();
      loadTableData();
    }

    async function loadTableData() {
      if (!activeTable) return;
      const content = document.getElementById('contentArea');
      content.innerHTML = '<div style="padding:20px; color:#38bdf8;">Memuat data tabel '+activeTable+'...</div>';

      try {
        const res = await fetch('/api/db/table/' + activeTable);
        const data = await res.json();
        tableDataCache = data;

        const primaryCol = (data.columns || []).find(c => c.Key === 'PRI');
        pkColName = primaryCol ? primaryCol.Field : (data.columns?.[0]?.Field || 'id');

        if (activeTab === 'browse') renderBrowse(data);
        else if (activeTab === 'structure') renderStructure(data);
        else if (activeTab === 'sql') renderSqlConsole();
      } catch (err) {
        content.innerHTML = '<div style="padding:20px; color:#ef4444;">Gagal mengambil data tabel</div>';
      }
    }

    function switchTab(tabName) {
      activeTab = tabName;
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.getElementById('btn-' + tabName).classList.add('active');
      if (activeTab === 'sql') renderSqlConsole();
      else if (tableDataCache.table) {
        if (activeTab === 'browse') renderBrowse(tableDataCache);
        else if (activeTab === 'structure') renderStructure(tableDataCache);
      }
    }

    function renderBrowse(data) {
      const content = document.getElementById('contentArea');
      if (!data.rows || data.rows.length === 0) {
        content.innerHTML = '<div style="padding:40px; text-align:center; color:#94a3b8;">Tabel <b>' + data.table + '</b> masih kosong (0 records).</div>';
        return;
      }
      const cols = data.columns.map(c => c.Field);
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
          return '<td title="' + (val || '') + '">' + (val !== null && val !== undefined ? String(val) : '<i style="color:#64748b">NULL</i>') + '</td>';
        }).join('');
        html += '</tr>';
      });
      html += '</tbody></table>';
      content.innerHTML = html;
    }

    function renderStructure(data) {
      const content = document.getElementById('contentArea');
      let html = '<table><thead><tr><th>Field</th><th>Type</th><th>Null</th><th>Key</th><th>Default</th></tr></thead><tbody>';
      data.columns.forEach(c => {
        html += '<tr><td style="font-weight:700; color:#38bdf8;">' + c.Field + '</td><td>' + c.Type + '</td><td>' + c.Null + '</td><td>' + (c.Key || '-') + '</td><td>' + (c.Default || 'NULL') + '</td></tr>';
      });
      html += '</tbody></table>';
      content.innerHTML = html;
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

    loadTables();
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

  const deployCmd = `cd /var/www/MRIS_TECH && git fetch origin && git reset --hard origin/main && cd web_admin && npm run build && cp -r dist/* ../dist/ && cd .. && (pm2 reload mris-app-tech || pm2 restart mris-app-tech)`;

  exec(deployCmd, (error, stdout, stderr) => {
    if (error) {
      console.error('❌ Auto-deploy failed:', error.message);
      return;
    }
    console.log('✅ Auto-deploy output:\n', stdout);
  });
});

// Deep merge masterData protecting user input from being overwritten by empty arrays
const mergeMasterDataSafely = (existing = {}, incoming = {}) => {
  const result = { ...existing };

  Object.keys(incoming).forEach(key => {
    const incVal = incoming[key];
    const extVal = existing[key];

    if (Array.isArray(extVal) && extVal.length > 0) {
      if (Array.isArray(incVal)) {
        if (incVal.length === 0) {
          // DO NOT overwrite non-empty existing data with empty incoming array!
          result[key] = extVal;
        } else {
          // Merge items by ID if items have IDs, or keep incoming if fully replacing
          const itemMap = new Map();
          extVal.forEach(item => {
            if (item && item.id !== undefined) {
              itemMap.set(String(item.id), item);
            }
          });

          if (itemMap.size > 0) {
            incVal.forEach(item => {
              if (item && item.id !== undefined) {
                const keyId = String(item.id);
                const prev = itemMap.get(keyId) || {};
                itemMap.set(keyId, { ...prev, ...item });
              } else {
                itemMap.set(Symbol(), item);
              }
            });
            result[key] = Array.from(itemMap.values());
          } else {
            result[key] = incVal;
          }
        }
      } else if (incVal === undefined || incVal === null) {
        result[key] = extVal;
      } else {
        result[key] = incVal;
      }
    } else {
      if (incVal !== undefined) {
        result[key] = incVal;
      }
    }
  });

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

// GET /api/master-data — MySQL PRIMARY, JSON fallback
app.get('/api/master-data', async (req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
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

    let existing = await getMasterDataFromMySQL();
    if (!existing || typeof existing !== 'object') {
      const db = readDb();
      existing = (db.masterData && typeof db.masterData === 'object') ? db.masterData : defaultMasterData;
    }

    const sanitizedPayload = sanitizeMasterDataPayload(payload);
    const mergedData = mergeMasterDataSafely(existing, sanitizedPayload);
    const newMasterData = sanitizeMasterDataPayload({ ...mergedData, _lastUpdated: nowTs });

    const mysqlOk = await saveMasterDataToMySQL(newMasterData);

    // Backup ke JSON
    try {
      const db = readDb();
      db.masterData = newMasterData;
      db.lastUpdated = new Date().toISOString();
      saveDb(db);
    } catch (jsonErr) {}

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

// Serve Web Admin UI (web_admin/dist)
app.use(express.static(path.join(__dirname, 'web_admin', 'dist')));

app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/phpmyadmin') || req.path.startsWith('/adminer') || req.path.startsWith('/db-explorer')) {
    return next();
  }
  res.sendFile(path.join(__dirname, 'web_admin', 'dist', 'index.html'));
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
