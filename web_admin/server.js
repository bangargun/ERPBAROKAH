import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Persistent JSON Store Path
const DB_FILE = path.join(__dirname, 'mris_finance.json');

// Initial Data Structure
const initialDb = {
  outlets: [
    { id: 1, code: 'RST-001', name: 'Gourmet Bistro - Senopati', location: 'Jl. Senopati No. 45, Jakarta Selatan', manager_name: 'Budi Santoso', phone: '0812-3456-7890', monthly_budget: 120000000, status: 'Active', color: '#6366f1' },
    { id: 2, code: 'RST-002', name: 'Ramen Haus - Kemang', location: 'Jl. Kemang Raya No. 12, Jakarta Selatan', manager_name: 'Siti Rahma', phone: '0813-9876-5432', monthly_budget: 85000000, status: 'Active', color: '#ec4899' },
    { id: 3, code: 'RST-003', name: 'Kopi & Kitchen - PIK', location: 'Ruko Crown Golf Blok B No. 8, Pantai Indah Kapuk', manager_name: 'Kevin Wijaya', phone: '0811-2233-4455', monthly_budget: 65000000, status: 'Active', color: '#10b981' }
  ],
  categories: [
    { id: 1, name: 'Penjualan Dine-in', type: 'income', icon: 'Utensils' },
    { id: 2, name: 'Penjualan Takeaway / Online', type: 'income', icon: 'ShoppingBag' },
    { id: 3, name: 'Layanan Catering & Event', type: 'income', icon: 'Calendar' },
    { id: 4, name: 'Pendapatan Lain-lain', type: 'income', icon: 'TrendingUp' },
    { id: 5, name: 'Bahan Baku & Dapur (COGS)', type: 'expense', icon: 'ShoppingBasket' },
    { id: 6, name: 'Gaji & Bonus Karyawan', type: 'expense', icon: 'Users' },
    { id: 7, name: 'Listrik, Air & Gas', type: 'expense', icon: 'Zap' },
    { id: 8, name: 'Sewa Tempat & Maintenance', type: 'expense', icon: 'Home' },
    { id: 9, name: 'Marketing & Promosi', type: 'expense', icon: 'Megaphone' },
    { id: 10, name: 'Peralatan & Operational Smallware', type: 'expense', icon: 'Wrench' }
  ],
  transactions: [],
  shift_closings: []
};

// Seed Helper Dates
const today = new Date();
const formatDate = (daysAgo) => {
  const d = new Date(today);
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().split('T')[0];
};

// Seed Transactions if empty
let txIdCounter = 1;
initialDb.transactions = [];
initialDb.shift_closings = [];

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

// 8. Full Master Data Sync Endpoints
app.get('/api/master-data', (req, res) => {
  try {
    const db = readDb();
    res.json(db.masterData || initialDb);
  } catch (err) {
    res.status(500).json({ error: 'Gagal mengambil data master terpusat' });
  }
});

app.post('/api/master-data', (req, res) => {
  try {
    const payload = req.body;
    if (!payload || typeof payload !== 'object') {
      return res.status(400).json({ error: 'Payload tidak valid' });
    }
    const db = readDb();
    const nowTs = Date.now();
    db.masterData = {
      ...(db.masterData || {}),
      ...payload,
      _lastUpdated: nowTs
    };
    db.lastUpdated = new Date().toISOString();
    saveDb(db);
    res.json({ success: true, message: 'Data master terpusat berhasil diperbarui', timestamp: db.lastUpdated, _lastUpdated: nowTs });
  } catch (err) {
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
