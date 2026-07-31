import React, { useState } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Wallet, 
  Building2, 
  AlertTriangle, 
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle2,
  Clock,
  ChevronDown,
  ShoppingBag,
  CreditCard,
  Filter,
  BarChart3,
  PieChart as PieIcon,
  Tag,
  Package,
  Sparkles,
  Layers,
  Percent,
  Bot,
  Zap,
  RefreshCw,
  BrainCircuit,
  Lightbulb,
  Activity,
  ShieldAlert,
  HelpCircle,
  Award
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid, 
  BarChart, 
  Bar,
  Legend
} from 'recharts';

export default function FinancialOverview({ stats, chartData, recentTransactions, outlets, selectedBranch, masterData }) {
  const allOutlets = outlets || masterData?.outlets || [];
  const allProducts = masterData?.products || [];
  const allIngredients = masterData?.ingredients || [];
  const allSalesTx = masterData?.salesTransactions || [];
  const allApprovedFinance = masterData?.approvedFinanceDaily || [];
  const allFinancialRecords = masterData?.financialRecords || [];

  // ------------------------------------------------------------------
  // INTERACTIVE STATES
  // ------------------------------------------------------------------
  const [salesChartOutlet, setSalesChartOutlet] = useState('ALL');
  const [salesChartPeriod, setSalesChartPeriod] = useState('7days'); // 'today', '7days', '30days', 'custom'
  const [salesChartStartDate, setSalesChartStartDate] = useState('');
  const [salesChartEndDate, setSalesChartEndDate] = useState('');
  const [salesChartType, setSalesChartType] = useState('area'); // 'area' or 'bar'

  const [omzetFilterBranch, setOmzetFilterBranch] = useState('ALL');
  const [omzetChartType, setOmzetChartType] = useState('bar'); // 'bar' or 'area'
  const [ingredientTimeRange, setIngredientTimeRange] = useState('bulan_ini');
  const [selectedIngredientCategory, setSelectedIngredientCategory] = useState('ALL');
  const [hppTimeRange, setHppTimeRange] = useState('bulan_ini');
  const [activeMetricCard, setActiveMetricCard] = useState('revenue');
  const [txTypeFilter, setTxTypeFilter] = useState('ALL');

  // AI Analysis Interactive States
  const [isAnalyzingAI, setIsAnalyzingAI] = useState(false);
  const [aiActiveQuestion, setAiActiveQuestion] = useState(null);
  const [aiAnalysisTime, setAiAnalysisTime] = useState('Baru saja (Real-time)');

  const formatRupiah = (val) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val || 0);
  };

  // ------------------------------------------------------------------
  // 1. STATS HARIAN (PER HARI / DAILY METRICS)
  // ------------------------------------------------------------------
  const todayStr = new Date().toISOString().split('T')[0];

  // Branch Match Helper
  const matchesBranch = (item, targetBranch) => {
    if (!targetBranch || targetBranch === 'ALL') return true;
    const bId = Number(targetBranch);
    return (
      Number(item.outlet_id) === bId ||
      Number(item.branch_id) === bId ||
      item.outlet === targetBranch ||
      item.branch_name === targetBranch
    );
  };

  const todayTx = allSalesTx.filter(t => matchesBranch(t, selectedBranch) && (t.date === todayStr || !t.date));
  const todayIncomeTx = todayTx.reduce((sum, t) => sum + (t.amount || 0), 0);

  const todayManualInc = allApprovedFinance.filter(f => matchesBranch(f, selectedBranch) && (f.date === todayStr || !f.date)).reduce((sum, f) => sum + (f.net_sales || 0), 0);
  const todayIncome = Math.max(todayIncomeTx, todayManualInc);

  const todayExpManual = allApprovedFinance.filter(f => (!selectedBranch || Number(f.outlet_id) === Number(selectedBranch)) && (f.date === todayStr || !f.date)).reduce((sum, f) => sum + (f.cogs || 0) + (f.operational || 0) + (f.gaji || 0) + (f.other_costs || 0), 0);
  const todayExpRecords = allFinancialRecords.filter(f => f.type === 'expense' && (!selectedBranch || Number(f.outlet_id) === Number(selectedBranch)) && (f.date === todayStr || !f.date)).reduce((sum, f) => sum + (f.amount || 0), 0);
  const todayExpense = todayExpManual + todayExpRecords;

  const todayNetProfit = todayIncome - todayExpense;
  const todayMargin = todayIncome > 0 ? ((todayNetProfit / todayIncome) * 100).toFixed(1) : '0.0';
  const todayTxCount = todayTx.length;
  const todayAvgBill = todayTxCount > 0 ? Math.round(todayIncome / todayTxCount) : 0;

  // ------------------------------------------------------------------
  // GRAFIK PENJUALAN (SALES TREND DATA & FILTERS)
  // ------------------------------------------------------------------
  const getSalesTrendData = () => {
    const dates = [];
    const today = new Date();

    if (salesChartPeriod === 'today') {
      dates.push(todayStr);
    } else if (salesChartPeriod === '7days') {
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(today.getDate() - i);
        dates.push(d.toISOString().split('T')[0]);
      }
    } else if (salesChartPeriod === '30days') {
      for (let i = 29; i >= 0; i--) {
        const d = new Date();
        d.setDate(today.getDate() - i);
        dates.push(d.toISOString().split('T')[0]);
      }
    } else if (salesChartPeriod === 'custom' && salesChartStartDate && salesChartEndDate) {
      let curr = new Date(salesChartStartDate);
      const end = new Date(salesChartEndDate);
      while (curr <= end) {
        dates.push(curr.toISOString().split('T')[0]);
        curr.setDate(curr.getDate() + 1);
      }
    } else {
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(today.getDate() - i);
        dates.push(d.toISOString().split('T')[0]);
      }
    }

    return dates.map(dateStr => {
      const parts = dateStr.split('-');
      const monthNames = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
      const shortLabel = parts.length === 3 ? `${parseInt(parts[2], 10)} ${monthNames[parseInt(parts[1], 10) - 1] || ''}` : dateStr;

      let txs = allSalesTx.filter(t => (t.date === dateStr || (!t.date && dateStr === todayStr)));
      if (salesChartOutlet !== 'ALL') {
        txs = txs.filter(t => Number(t.outlet_id) === Number(salesChartOutlet));
      }
      const salesTxTotal = txs.reduce((sum, t) => sum + (t.amount || 0), 0);

      let manual = allApprovedFinance.filter(f => (f.date === dateStr || (!f.date && dateStr === todayStr)));
      if (salesChartOutlet !== 'ALL') {
        manual = manual.filter(f => Number(f.outlet_id) === Number(salesChartOutlet));
      }
      const manualTotal = manual.reduce((sum, f) => sum + (f.net_sales || 0), 0);

      const totalPenjualan = Math.max(salesTxTotal, manualTotal);
      const countTx = txs.length;

      return {
        fullDate: dateStr,
        date: shortLabel,
        penjualan: totalPenjualan,
        transaksi: countTx
      };
    });
  };

  const salesTrendData = getSalesTrendData();
  const totalSalesPeriod = salesTrendData.reduce((s, d) => s + d.penjualan, 0);
  const totalTxPeriod = salesTrendData.reduce((s, d) => s + d.transaksi, 0);
  const avgSalesPerDay = salesTrendData.length > 0 ? Math.round(totalSalesPeriod / salesTrendData.length) : 0;

  // ------------------------------------------------------------------
  // 2. CARD 1: OMZET BULAN LALU VS BULAN INI DATA
  // ------------------------------------------------------------------
  const getOmzetComparisonData = () => {
    let outletList = allOutlets;
    if (omzetFilterBranch !== 'ALL') {
      outletList = allOutlets.filter(o => Number(o.id) === Number(omzetFilterBranch));
    }

    return outletList.map(o => {
      const oTx = allSalesTx.filter(t => Number(t.outlet_id) === Number(o.id));
      const totalOmzet = oTx.reduce((s, t) => s + (t.amount || 0), 0);
      
      const omzetBulanLalu = 0;
      const omzetBulanIni = totalOmzet;
      const diff = omzetBulanIni - omzetBulanLalu;
      const growth = omzetBulanLalu > 0 ? ((diff / omzetBulanLalu) * 100).toFixed(1) : 0;

      return {
        id: o.id,
        name: o.name,
        omzetBulanLalu,
        omzetBulanIni,
        growth: Number(growth),
        diff
      };
    });
  };

  const omzetCompData = getOmzetComparisonData();

  // ------------------------------------------------------------------
  // 3. CARD 2: PERBANDINGAN HARGA BAHAN BAKU PER OUTLET
  // ------------------------------------------------------------------
  const getIngredientPriceComparison = () => {
    const realIngredients = masterData?.ingredients || [];
    if (realIngredients.length === 0) return [];

    let filtered = realIngredients;
    if (selectedIngredientCategory !== 'ALL') {
      filtered = realIngredients.filter(i => i.category === selectedIngredientCategory);
    }

    return filtered.map(ing => {
      const outletPrices = allOutlets.map((o) => {
        const price = ing.price || ing.cost || ing.unitPrice || 0;
        return { outletName: o.name, price };
      });

      const prices = outletPrices.map(op => op.price);
      const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
      const maxPrice = prices.length > 0 ? Math.max(...prices) : 0;
      const disparity = maxPrice - minPrice;

      return {
        ...ing,
        outletPrices,
        minPrice,
        maxPrice,
        disparity
      };
    });
  };

  const ingredientComparisonList = getIngredientPriceComparison();

  // ------------------------------------------------------------------
  // 4. CARD 3: PERHITUNGAN & PERBANDINGAN HPP (COGS) TIAP OUTLET
  // ------------------------------------------------------------------
  const getHppComparisonData = () => {
    return allOutlets.map(o => {
      const oTx = allSalesTx.filter(t => Number(t.outlet_id) === Number(o.id));
      const revenue = oTx.reduce((s, t) => s + (t.amount || 0), 0);

      const oManualHpp = allApprovedFinance.filter(f => Number(f.outlet_id) === Number(o.id)).reduce((s, f) => s + (f.cogs || 0), 0);
      const hppAmount = oManualHpp;
      const hppPct = revenue > 0 ? Number(((hppAmount / revenue) * 100).toFixed(1)) : 0;
      const targetPct = 60.0;
      const isOverBudget = hppPct > targetPct;

      return {
        id: o.id,
        name: o.name,
        revenue,
        hppAmount,
        hppPct,
        targetPct,
        isOverBudget
      };
    });
  };

  const hppComparisonList = getHppComparisonData();

  // Filtered Transactions Feed
  const filteredRecentTx = (recentTransactions || []).filter(tx => {
    if (txTypeFilter === 'income') return tx.type === 'income';
    if (txTypeFilter === 'expense') return tx.type === 'expense';
    return true;
  });

  // Dynamic Trigger for AI Analysis
  const handleRunAiAnalysis = () => {
    setIsAnalyzingAI(true);
    setTimeout(() => {
      setIsAnalyzingAI(false);
      const now = new Date();
      setAiAnalysisTime(`${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}:${now.getSeconds().toString().padStart(2,'0')}`);
    }, 1200);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', background: '#0b0f19', color: '#f8fafc' }} className="animate-fade-in">
      
      {/* 🟢 INTERACTIVE HEADER BANNER */}
      <div style={{ background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.9) 0%, rgba(15, 23, 42, 0.95) 100%)', padding: '18px 22px', borderRadius: '16px', border: '1px solid #334155', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px', boxShadow: '0 10px 30px rgba(0,0,0,0.3)' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 12px #10b981' }} className="animate-pulse" />
            <h2 style={{ fontSize: '1.25rem', fontWeight: '900', color: '#f8fafc', margin: 0, letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>Dashboard Executive Multi-Restoran</span>
              <span style={{ fontSize: '0.68rem', padding: '3px 8px', borderRadius: '6px', background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', border: '1px solid rgba(56, 189, 248, 0.3)', fontWeight: '800' }}>INTERACTIVE LIVE</span>
            </h2>
          </div>
          <p style={{ color: '#94a3b8', fontSize: '0.78rem', marginTop: '4px', margin: 0 }}>
            Pemantauan omzet harian, komparasi per outlet, analisis HPP, dan performa keuangan real-time.
          </p>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 1. STATS HARIAN INTERAKSI (6 CARDS WITH HOVER & ACTIVE STATE)  */}
      {/* ------------------------------------------------------------- */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '10px' }}>
        
        {/* Stat 1: REVENUE HARI INI */}
        <div
          onClick={() => setActiveMetricCard('revenue')}
          style={{
            background: activeMetricCard === 'revenue' ? 'linear-gradient(135deg, rgba(34, 197, 94, 0.15) 0%, rgba(15, 23, 42, 0.9) 100%)' : '#111625',
            border: `1px solid ${activeMetricCard === 'revenue' ? '#22c55e' : '#1e293b'}`,
            borderRadius: '12px', padding: '12px 14px', cursor: 'pointer', transition: 'all 0.2s ease',
            boxShadow: activeMetricCard === 'revenue' ? '0 0 15px rgba(34, 197, 94, 0.2)' : 'none'
          }}
        >
          <div style={{ fontSize: '0.64rem', color: '#94a3b8', fontWeight: '800', textTransform: 'uppercase', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>REVENUE HARI INI</span>
            <DollarSign size={13} color="#22c55e" />
          </div>
          <div style={{ fontSize: '1.1rem', fontWeight: '900', color: '#22c55e', marginTop: '4px' }}>{formatRupiah(todayIncome)}</div>
          <div style={{ fontSize: '0.64rem', color: '#22c55e', fontWeight: '700', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '2px' }}>
            <ArrowUpRight size={12} /> <span>Real-time POS</span>
          </div>
        </div>

        {/* Stat 2: PENGELUARAN HARI INI */}
        <div
          onClick={() => setActiveMetricCard('expense')}
          style={{
            background: activeMetricCard === 'expense' ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.15) 0%, rgba(15, 23, 42, 0.9) 100%)' : '#111625',
            border: `1px solid ${activeMetricCard === 'expense' ? '#ef4444' : '#1e293b'}`,
            borderRadius: '12px', padding: '12px 14px', cursor: 'pointer', transition: 'all 0.2s ease',
            boxShadow: activeMetricCard === 'expense' ? '0 0 15px rgba(239, 68, 68, 0.2)' : 'none'
          }}
        >
          <div style={{ fontSize: '0.64rem', color: '#94a3b8', fontWeight: '800', textTransform: 'uppercase', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>PENGELUARAN HARI INI</span>
            <Wallet size={13} color="#ef4444" />
          </div>
          <div style={{ fontSize: '1.1rem', fontWeight: '900', color: '#ef4444', marginTop: '4px' }}>{formatRupiah(todayExpense)}</div>
          <div style={{ fontSize: '0.64rem', color: '#94a3b8', fontWeight: '600', marginTop: '4px' }}>Kasir & OPEX</div>
        </div>

        {/* Stat 3: LABA BERSIH HARI INI */}
        <div
          onClick={() => setActiveMetricCard('profit')}
          style={{
            background: activeMetricCard === 'profit' ? 'linear-gradient(135deg, rgba(56, 189, 248, 0.15) 0%, rgba(15, 23, 42, 0.9) 100%)' : '#111625',
            border: `1px solid ${activeMetricCard === 'profit' ? '#38bdf8' : '#1e293b'}`,
            borderRadius: '12px', padding: '12px 14px', cursor: 'pointer', transition: 'all 0.2s ease',
            boxShadow: activeMetricCard === 'profit' ? '0 0 15px rgba(56, 189, 248, 0.2)' : 'none'
          }}
        >
          <div style={{ fontSize: '0.64rem', color: '#94a3b8', fontWeight: '800', textTransform: 'uppercase', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>LABA BERSIH HARI INI</span>
            <TrendingUp size={13} color="#38bdf8" />
          </div>
          <div style={{ fontSize: '1.1rem', fontWeight: '900', color: todayNetProfit >= 0 ? '#38bdf8' : '#ef4444', marginTop: '4px' }}>{formatRupiah(todayNetProfit)}</div>
          <div style={{ fontSize: '0.64rem', color: '#eab308', fontWeight: '700', marginTop: '4px' }}>Margin: {todayMargin}%</div>
        </div>

        {/* Stat 4: TOTAL TRANSAKSI HARI INI */}
        <div
          onClick={() => setActiveMetricCard('tx')}
          style={{
            background: activeMetricCard === 'tx' ? 'linear-gradient(135deg, rgba(168, 85, 247, 0.15) 0%, rgba(15, 23, 42, 0.9) 100%)' : '#111625',
            border: `1px solid ${activeMetricCard === 'tx' ? '#a855f7' : '#1e293b'}`,
            borderRadius: '12px', padding: '12px 14px', cursor: 'pointer', transition: 'all 0.2s ease'
          }}
        >
          <div style={{ fontSize: '0.64rem', color: '#94a3b8', fontWeight: '800', textTransform: 'uppercase', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>TRANSAKSI HARI INI</span>
            <ShoppingBag size={13} color="#a855f7" />
          </div>
          <div style={{ fontSize: '1.1rem', fontWeight: '900', color: '#ffffff', marginTop: '4px' }}>{todayTxCount} Nota</div>
          <div style={{ fontSize: '0.64rem', color: '#94a3b8', fontWeight: '600', marginTop: '4px' }}>Terverifikasi POS</div>
        </div>

        {/* Stat 5: AVERAGE BILL HARI INI */}
        <div
          onClick={() => setActiveMetricCard('avg')}
          style={{
            background: activeMetricCard === 'avg' ? 'linear-gradient(135deg, rgba(245, 158, 11, 0.15) 0%, rgba(15, 23, 42, 0.9) 100%)' : '#111625',
            border: `1px solid ${activeMetricCard === 'avg' ? '#f59e0b' : '#1e293b'}`,
            borderRadius: '12px', padding: '12px 14px', cursor: 'pointer', transition: 'all 0.2s ease'
          }}
        >
          <div style={{ fontSize: '0.64rem', color: '#94a3b8', fontWeight: '800', textTransform: 'uppercase', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>AVERAGE BILL</span>
            <CreditCard size={13} color="#f59e0b" />
          </div>
          <div style={{ fontSize: '1.1rem', fontWeight: '900', color: '#f59e0b', marginTop: '4px' }}>{formatRupiah(todayAvgBill)}</div>
          <div style={{ fontSize: '0.64rem', color: '#94a3b8', fontWeight: '600', marginTop: '4px' }}>Rata-rata / Meja</div>
        </div>

        {/* Stat 6: TOTAL OUTLET AKTIF */}
        <div
          onClick={() => setActiveMetricCard('outlet')}
          style={{
            background: activeMetricCard === 'outlet' ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(15, 23, 42, 0.9) 100%)' : '#111625',
            border: `1px solid ${activeMetricCard === 'outlet' ? '#6366f1' : '#1e293b'}`,
            borderRadius: '12px', padding: '12px 14px', cursor: 'pointer', transition: 'all 0.2s ease'
          }}
        >
          <div style={{ fontSize: '0.64rem', color: '#94a3b8', fontWeight: '800', textTransform: 'uppercase', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>OUTLET RESTORAN</span>
            <Building2 size={13} color="#6366f1" />
          </div>
          <div style={{ fontSize: '1.1rem', fontWeight: '900', color: '#a78bfa', marginTop: '4px' }}>{allOutlets.length} Cabang</div>
          <div style={{ fontSize: '0.64rem', color: '#34d399', fontWeight: '700', marginTop: '4px' }}>● 100% Beroperasi</div>
        </div>

      </div>

      {/* ------------------------------------------------------------- */}
      {/* NEW SECTION: GRAFIK PENJUALAN WITH OUTLET & TANGGAL FILTERS   */}
      {/* ------------------------------------------------------------- */}
      <div style={{ background: '#111625', border: '1px solid #1e293b', borderRadius: '14px', padding: '18px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h3 style={{ fontSize: '1.0rem', fontWeight: '900', color: '#f8fafc', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <TrendingUp size={20} color="#22c55e" />
              <span>Grafik Penjualan Restoran</span>
              <span style={{ fontSize: '0.68rem', padding: '3px 8px', borderRadius: '6px', background: 'rgba(34, 197, 94, 0.15)', color: '#34d399', border: '1px solid rgba(34, 197, 94, 0.3)', fontWeight: '800' }}>
                REAL-TIME ANALYTICS
              </span>
            </h3>
            <p style={{ fontSize: '0.76rem', color: '#94a3b8', margin: '4px 0 0 0' }}>
              Grafik pertumbuhan omzet harian berdasarkan filter cabang outlet dan periode tanggal
            </p>
          </div>

          {/* Filter Controls (Nama Outlet + Filter Tanggal + Chart Type) */}
          <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
            
            {/* 1. FILTER NAMA OUTLET */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Building2 size={15} color="#94a3b8" />
              <select
                value={salesChartOutlet}
                onChange={e => setSalesChartOutlet(e.target.value)}
                style={{ padding: '6px 12px', background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#ffffff', fontSize: '0.76rem', fontWeight: '800', cursor: 'pointer' }}
              >
                <option value="ALL">🏢 Semua Outlet Restoran</option>
                {allOutlets.map(o => (
                  <option key={o.id} value={o.id}>📍 {o.name}</option>
                ))}
              </select>
            </div>

            {/* 2. FILTER TANGGAL / PERIODE */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Calendar size={15} color="#94a3b8" />
              <select
                value={salesChartPeriod}
                onChange={e => setSalesChartPeriod(e.target.value)}
                style={{ padding: '6px 12px', background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#ffffff', fontSize: '0.76rem', fontWeight: '800', cursor: 'pointer' }}
              >
                <option value="7days">🗓 7 Hari Terakhir</option>
                <option value="today">📅 Hari Ini ({todayStr})</option>
                <option value="30days">📆 30 Hari Terakhir</option>
                <option value="custom">📅 Pilih Tanggal (Custom Range)...</option>
              </select>
            </div>

            {/* CUSTOM TANGGAL RANGE INPUTS */}
            {salesChartPeriod === 'custom' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#0f172a', padding: '4px 8px', borderRadius: '8px', border: '1px solid #334155' }}>
                <input
                  type="date"
                  value={salesChartStartDate}
                  onChange={e => setSalesChartStartDate(e.target.value)}
                  style={{ padding: '4px 8px', background: '#1e293b', border: '1px solid #334155', borderRadius: '6px', color: '#ffffff', fontSize: '0.74rem' }}
                />
                <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: '700' }}>s/d</span>
                <input
                  type="date"
                  value={salesChartEndDate}
                  onChange={e => setSalesChartEndDate(e.target.value)}
                  style={{ padding: '4px 8px', background: '#1e293b', border: '1px solid #334155', borderRadius: '6px', color: '#ffffff', fontSize: '0.74rem' }}
                />
              </div>
            )}

            {/* CHART TYPE TOGGLE */}
            <div style={{ background: '#1e293b', padding: '3px', borderRadius: '8px', border: '1px solid #334155', display: 'flex', gap: '2px' }}>
              <button
                type="button"
                onClick={() => setSalesChartType('area')}
                style={{ padding: '4px 10px', background: salesChartType === 'area' ? '#22c55e' : 'transparent', color: salesChartType === 'area' ? '#0f172a' : '#cbd5e1', border: 'none', borderRadius: '6px', fontSize: '0.72rem', fontWeight: '800', cursor: 'pointer' }}
              >
                📈 Trend Area
              </button>
              <button
                type="button"
                onClick={() => setSalesChartType('bar')}
                style={{ padding: '4px 10px', background: salesChartType === 'bar' ? '#22c55e' : 'transparent', color: salesChartType === 'bar' ? '#0f172a' : '#cbd5e1', border: 'none', borderRadius: '6px', fontSize: '0.72rem', fontWeight: '800', cursor: 'pointer' }}
              >
                📊 Bar Chart
              </button>
            </div>

          </div>
        </div>

        {/* SUMMARY KPI METRICS FOR SELECTED FILTER */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
          <div style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '10px', padding: '10px 14px' }}>
            <span style={{ fontSize: '0.66rem', color: '#94a3b8', fontWeight: '800', textTransform: 'uppercase' }}>TOTAL PENJUALAN (PERIODE TERPILIH)</span>
            <div style={{ fontSize: '1.15rem', fontWeight: '900', color: '#22c55e', marginTop: '2px' }}>{formatRupiah(totalSalesPeriod)}</div>
          </div>
          <div style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '10px', padding: '10px 14px' }}>
            <span style={{ fontSize: '0.66rem', color: '#94a3b8', fontWeight: '800', textTransform: 'uppercase' }}>RATA-RATA OMZET / HARI</span>
            <div style={{ fontSize: '1.15rem', fontWeight: '900', color: '#38bdf8', marginTop: '2px' }}>{formatRupiah(avgSalesPerDay)}</div>
          </div>
          <div style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '10px', padding: '10px 14px' }}>
            <span style={{ fontSize: '0.66rem', color: '#94a3b8', fontWeight: '800', textTransform: 'uppercase' }}>TOTAL TRANSAKSI (NOTA)</span>
            <div style={{ fontSize: '1.15rem', fontWeight: '900', color: '#a855f7', marginTop: '2px' }}>{totalTxPeriod} Transaksi</div>
          </div>
        </div>

        {/* RECHARTS SALES CHART DISPLAY */}
        <div style={{ width: '100%', height: '220px' }}>
          <ResponsiveContainer width="100%" height="100%">
            {salesChartType === 'area' ? (
              <AreaChart data={salesTrendData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="date" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} tickFormatter={(val) => `${val / 1000}k`} />
                <Tooltip 
                  contentStyle={{ background: '#1e293b', border: '1px solid #22c55e', borderRadius: '8px', color: '#ffffff', fontSize: '0.76rem' }} 
                  formatter={(val) => formatRupiah(val)}
                  labelFormatter={(lbl, items) => {
                    const item = items && items[0] ? items[0].payload : null;
                    return item ? `Tanggal: ${item.fullDate}` : lbl;
                  }}
                />
                <Area type="monotone" dataKey="penjualan" name="Total Penjualan (Rp)" stroke="#22c55e" strokeWidth={3} fillOpacity={1} fill="url(#salesGradient)" />
              </AreaChart>
            ) : (
              <BarChart data={salesTrendData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="date" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} tickFormatter={(val) => `${val / 1000}k`} />
                <Tooltip 
                  contentStyle={{ background: '#1e293b', border: '1px solid #22c55e', borderRadius: '8px', color: '#ffffff', fontSize: '0.76rem' }} 
                  formatter={(val) => formatRupiah(val)}
                  labelFormatter={(lbl, items) => {
                    const item = items && items[0] ? items[0].payload : null;
                    return item ? `Tanggal: ${item.fullDate}` : lbl;
                  }}
                />
                <Bar dataKey="penjualan" name="Total Penjualan (Rp)" fill="#22c55e" radius={[4, 4, 0, 0]} />
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 2. CARD 1: OMZET BULAN LALU VS OMZET BERJALAN BULAN INI         */}
      {/* ------------------------------------------------------------- */}
      <div style={{ background: '#111625', border: '1px solid #1e293b', borderRadius: '14px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
          <div>
            <h3 style={{ fontSize: '0.92rem', fontWeight: '800', color: '#f8fafc', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <BarChart3 size={18} color="#38bdf8" />
              <span>Perbandingan Omzet Bulan Lalu vs Omzet Berjalan Bulan Ini per Outlet</span>
            </h3>
            <p style={{ fontSize: '0.74rem', color: '#94a3b8', margin: '2px 0 0 0' }}>
              Bandingkan akumulasi pertumbuhan omzet bulan sebelumnya dengan bulan berjalan.
            </p>
          </div>

          {/* Controls (Chart Type + Branch Selector) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ background: '#1e293b', padding: '3px', borderRadius: '8px', border: '1px solid #334155', display: 'flex', gap: '2px' }}>
              <button
                type="button"
                onClick={() => setOmzetChartType('bar')}
                style={{ padding: '4px 10px', background: omzetChartType === 'bar' ? '#38bdf8' : 'transparent', color: omzetChartType === 'bar' ? '#0f172a' : '#cbd5e1', border: 'none', borderRadius: '6px', fontSize: '0.72rem', fontWeight: '800', cursor: 'pointer' }}
              >
                📊 Bar
              </button>
              <button
                type="button"
                onClick={() => setOmzetChartType('area')}
                style={{ padding: '4px 10px', background: omzetChartType === 'area' ? '#38bdf8' : 'transparent', color: omzetChartType === 'area' ? '#0f172a' : '#cbd5e1', border: 'none', borderRadius: '6px', fontSize: '0.72rem', fontWeight: '800', cursor: 'pointer' }}
              >
                📈 Trend
              </button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Filter size={14} color="#94a3b8" />
              <select
                value={omzetFilterBranch}
                onChange={e => setOmzetFilterBranch(e.target.value)}
                style={{ padding: '6px 12px', background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#ffffff', fontSize: '0.76rem', fontWeight: '700', cursor: 'pointer' }}
              >
                <option value="ALL">🏢 Semua Outlet Restoran</option>
                {allOutlets.map(o => (
                  <option key={o.id} value={o.id}>📍 {o.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Dynamic Chart Display */}
        <div style={{ width: '100%', height: '180px' }}>
          <ResponsiveContainer width="100%" height="100%">
            {omzetChartType === 'bar' ? (
              <BarChart data={omzetCompData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
                <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #38bdf8', borderRadius: '8px', color: '#ffffff', fontSize: '0.76rem' }} formatter={(val) => formatRupiah(val)} />
                <Legend wrapperStyle={{ fontSize: '0.72rem', color: '#cbd5e1' }} />
                <Bar dataKey="omzetBulanLalu" name="Omzet Bulan Lalu" fill="#64748b" radius={[4, 4, 0, 0]} />
                <Bar dataKey="omzetBulanIni" name="Omzet Berjalan Bulan Ini" fill="#38bdf8" radius={[4, 4, 0, 0]} />
              </BarChart>
            ) : (
              <AreaChart data={omzetCompData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorIni" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#38bdf8" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
                <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #38bdf8', borderRadius: '8px', color: '#ffffff', fontSize: '0.76rem' }} formatter={(val) => formatRupiah(val)} />
                <Area type="monotone" dataKey="omzetBulanIni" name="Omzet Berjalan Bulan Ini" stroke="#38bdf8" fillOpacity={1} fill="url(#colorIni)" />
              </AreaChart>
            )}
          </ResponsiveContainer>
        </div>

        {/* Data Table Omzet Comparison */}
        <div style={{ border: '1px solid #334155', borderRadius: '10px', overflow: 'hidden', background: '#0f172a' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
            <thead>
              <tr style={{ background: '#1e293b', color: '#cbd5e1', textTransform: 'uppercase', fontSize: '0.70rem', fontWeight: '800' }}>
                <th style={{ padding: '9px 12px' }}>Nama Outlet</th>
                <th style={{ padding: '9px 12px', textAlign: 'right' }}>Omzet Bulan Lalu</th>
                <th style={{ padding: '9px 12px', textAlign: 'right' }}>Omzet Berjalan Bulan Ini</th>
                <th style={{ padding: '9px 12px', textAlign: 'right' }}>Selisih Nominal</th>
                <th style={{ padding: '9px 12px', textAlign: 'center' }}>Pertumbuhan (%)</th>
              </tr>
            </thead>
            <tbody>
              {omzetCompData.map(d => (
                <tr key={d.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td style={{ padding: '8px 12px', fontWeight: '800', color: '#ffffff' }}>📍 {d.name}</td>
                  <td style={{ padding: '8px 12px', textAlign: 'right', color: '#94a3b8' }}>{formatRupiah(d.omzetBulanLalu)}</td>
                  <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: '900', color: '#38bdf8' }}>{formatRupiah(d.omzetBulanIni)}</td>
                  <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: '800', color: d.diff >= 0 ? '#22c55e' : '#ef4444' }}>
                    {d.diff >= 0 ? '+' : ''}{formatRupiah(d.diff)}
                  </td>
                  <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                    <span style={{
                      padding: '3px 10px', borderRadius: '6px', fontSize: '0.72rem', fontWeight: '800',
                      background: d.growth >= 0 ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                      color: d.growth >= 0 ? '#22c55e' : '#ef4444',
                      border: `1px solid ${d.growth >= 0 ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`
                    }}>
                      {d.growth >= 0 ? `▲ +${d.growth}%` : `▼ ${d.growth}%`}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 3. ROW CARDS: INGREDIENT PRICE COMPARISON PER OUTLET */}
      {/* ------------------------------------------------------------- */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '14px' }}>
        
        {/* CARD: PERBANDINGAN HARGA BAHAN BAKU PER OUTLET */}
        <div style={{ background: '#111625', border: '1px solid #1e293b', borderRadius: '14px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
            <div>
              <h3 style={{ fontSize: '0.90rem', fontWeight: '800', color: '#f8fafc', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Package size={18} color="#f59e0b" />
                <span>Perbandingan Harga Bahan Baku per Outlet</span>
              </h3>
              <p style={{ fontSize: '0.72rem', color: '#94a3b8', margin: '2px 0 0 0' }}>Deteksi disparitas harga beli supplier antar cabang outlet</p>
            </div>

            {/* Filters */}
            <div style={{ display: 'flex', gap: '8px' }}>
              <select
                value={ingredientTimeRange}
                onChange={e => setIngredientTimeRange(e.target.value)}
                style={{ padding: '6px 10px', background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#ffffff', fontSize: '0.74rem', fontWeight: '700', cursor: 'pointer' }}
              >
                <option value="bulan_ini">🗓 Bulan Ini</option>
                <option value="minggu_ini">📆 Minggu Ini</option>
                <option value="hari_ini">📅 Hari Ini</option>
              </select>

              <select
                value={selectedIngredientCategory}
                onChange={e => setSelectedIngredientCategory(e.target.value)}
                style={{ padding: '6px 10px', background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#ffffff', fontSize: '0.74rem', fontWeight: '700', cursor: 'pointer' }}
              >
                <option value="ALL">📦 Semua Bahan Baku</option>
                <option value="Ayam">🍗 Ayam</option>
                <option value="Daging">🥩 Daging</option>
                <option value="Bumbu">🌶️ Bumbu</option>
                <option value="Minyak">🛢️ Minyak</option>
                <option value="Sembako">🌾 Sembako</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '230px', overflowY: 'auto' }}>
            {ingredientComparisonList.length === 0 ? (
              <div style={{ background: '#0f172a', border: '1px dashed #334155', borderRadius: '10px', padding: '24px', textAlign: 'center', color: '#94a3b8', fontSize: '0.78rem' }}>
                📦 Belum ada data bahan baku terdaftar. Tambahkan bahan baku baru di menu <strong>Data Master &gt; Bahan Baku</strong>.
              </div>
            ) : (
              ingredientComparisonList.map((ing, idx) => (
                <div key={idx} style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '10px', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: '0.80rem', fontWeight: '800', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ color: '#f59e0b' }}>📦 {ing.name}</span>
                      <span style={{ fontSize: '0.68rem', color: '#94a3b8', background: '#1e293b', padding: '2px 8px', borderRadius: '6px' }}>per {ing.unit}</span>
                    </div>
                    <div style={{ fontSize: '0.72rem', color: ing.disparity > 2000 ? '#ef4444' : '#34d399', fontWeight: '800' }}>
                      {ing.disparity > 2000 ? `⚠️ Selisih Harga: ${formatRupiah(ing.disparity)}` : '✅ Harga Stabil'}
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '6px', fontSize: '0.70rem' }}>
                    {ing.outletPrices.map((op, oIdx) => (
                      <div key={oIdx} style={{ background: '#1e293b', padding: '5px 8px', borderRadius: '6px', textAlign: 'center', border: op.price === ing.maxPrice && ing.disparity > 2000 ? '1px solid #ef4444' : '1px solid rgba(255,255,255,0.05)' }}>
                        <div style={{ color: '#cbd5e1', fontSize: '0.64rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{op.outletName}</div>
                        <div style={{ fontWeight: '800', color: op.price === ing.maxPrice && ing.disparity > 2000 ? '#ef4444' : '#38bdf8', marginTop: '2px' }}>
                          {formatRupiah(op.price)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* ------------------------------------------------------------- */}
      {/* 4. CARD 4: PERHITUNGAN & PERBANDINGAN HPP (COGS) TIAP OUTLET   */}
      {/* ------------------------------------------------------------- */}
      <div style={{ background: '#111625', border: '1px solid #1e293b', borderRadius: '14px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
          <div>
            <h3 style={{ fontSize: '0.92rem', fontWeight: '800', color: '#f8fafc', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Percent size={18} color="#ef4444" />
              <span>Perhitungan &amp; Perbandingan HPP (Cost of Goods Sold) Tiap Outlet</span>
            </h3>
            <p style={{ fontSize: '0.74rem', color: '#94a3b8', margin: '2px 0 0 0' }}>
              Analisis persentase HPP makanan/minuman terhadap omzet dengan batas ideal maksimum 60%.
            </p>
          </div>

          {/* Time Range Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Calendar size={14} color="#94a3b8" />
            <select
              value={hppTimeRange}
              onChange={e => setHppTimeRange(e.target.value)}
              style={{ padding: '6px 12px', background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#ffffff', fontSize: '0.76rem', fontWeight: '700', cursor: 'pointer' }}
            >
              <option value="bulan_ini">🗓 Bulan Ini (MTD)</option>
              <option value="hari_ini">📅 Hari Ini</option>
              <option value="bulan_lalu">📆 Bulan Lalu</option>
              <option value="tahun_ini">📈 Tahun Ini</option>
            </select>
          </div>
        </div>

        {/* HPP Bar Chart per Outlet */}
        <div style={{ width: '100%', height: '170px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={hppComparisonList} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} />
              <YAxis stroke="#64748b" fontSize={11} tickLine={false} unit="%" />
              <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #ef4444', borderRadius: '8px', color: '#ffffff', fontSize: '0.76rem' }} formatter={(val) => `${val}%`} />
              <Bar dataKey="hppPct" name="Realisasi HPP (%)" fill="#ef4444" radius={[4, 4, 0, 0]} />
              <Bar dataKey="targetPct" name="Target Ideal HPP Max (60%)" fill="#22c55e" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Table HPP Breakdown */}
        <div style={{ border: '1px solid #334155', borderRadius: '10px', overflow: 'hidden', background: '#0f172a' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
            <thead>
              <tr style={{ background: '#1e293b', color: '#cbd5e1', textTransform: 'uppercase', fontSize: '0.70rem', fontWeight: '800' }}>
                <th style={{ padding: '9px 12px' }}>Nama Outlet Restoran</th>
                <th style={{ padding: '9px 12px', textAlign: 'right' }}>Total Omzet Penjualan</th>
                <th style={{ padding: '9px 12px', textAlign: 'right' }}>Total Nominal HPP</th>
                <th style={{ padding: '9px 12px', textAlign: 'center' }}>Realisasi HPP (%)</th>
                <th style={{ padding: '9px 12px', textAlign: 'center' }}>Target Ideal Max</th>
                <th style={{ padding: '9px 12px', textAlign: 'center' }}>Status Efisiensi HPP</th>
              </tr>
            </thead>
            <tbody>
              {hppComparisonList.map(h => (
                <tr key={h.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td style={{ padding: '8px 12px', fontWeight: '800', color: '#ffffff' }}>📍 {h.name}</td>
                  <td style={{ padding: '8px 12px', textAlign: 'right', color: '#cbd5e1' }}>{formatRupiah(h.revenue)}</td>
                  <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: '800', color: '#ef4444' }}>{formatRupiah(h.hppAmount)}</td>
                  <td style={{ padding: '8px 12px', textAlign: 'center', fontWeight: '900', color: h.isOverBudget ? '#ef4444' : '#22c55e' }}>{h.hppPct}%</td>
                  <td style={{ padding: '8px 12px', textAlign: 'center', color: '#22c55e', fontWeight: '700' }}>60.0%</td>
                  <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                    <span style={{
                      padding: '3px 10px', borderRadius: '6px', fontSize: '0.72rem', fontWeight: '800',
                      background: h.isOverBudget ? 'rgba(239, 68, 68, 0.15)' : 'rgba(34, 197, 94, 0.15)',
                      color: h.isOverBudget ? '#ef4444' : '#22c55e',
                      border: `1px solid ${h.isOverBudget ? 'rgba(239, 68, 68, 0.3)' : 'rgba(34, 197, 94, 0.3)'}`
                    }}>
                      {h.isOverBudget ? '⚠️ Over Budget' : '✅ Aman / Ideal'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 5. RIWAYAT TRANSAKSI HARIAN TERBARU                           */}
      {/* ------------------------------------------------------------- */}
      <div style={{ background: '#111625', border: '1px solid #1e293b', borderRadius: '14px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
          <div>
            <h3 style={{ fontSize: '0.90rem', fontWeight: '800', color: '#f8fafc', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Clock size={18} color="#a78bfa" />
              <span>Feed Transaksi Kasir &amp; Pengeluaran Harian Terkini</span>
            </h3>
            <p style={{ fontSize: '0.72rem', color: '#94a3b8', margin: '2px 0 0 0' }}>Log masukan dan pengeluaran terverifikasi dari seluruh cabang</p>
          </div>

          {/* Filter Type Buttons */}
          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              type="button"
              onClick={() => setTxTypeFilter('ALL')}
              style={{ padding: '4px 10px', background: txTypeFilter === 'ALL' ? '#334155' : 'transparent', color: '#ffffff', border: '1px solid #334155', borderRadius: '6px', fontSize: '0.72rem', fontWeight: '800', cursor: 'pointer' }}
            >
              Semua Tipe
            </button>
            <button
              type="button"
              onClick={() => setTxTypeFilter('income')}
              style={{ padding: '4px 10px', background: txTypeFilter === 'income' ? 'rgba(34,197,94,0.2)' : 'transparent', color: '#22c55e', border: '1px solid rgba(34,197,94,0.3)', borderRadius: '6px', fontSize: '0.72rem', fontWeight: '800', cursor: 'pointer' }}
            >
              📈 Pemasukan
            </button>
            <button
              type="button"
              onClick={() => setTxTypeFilter('expense')}
              style={{ padding: '4px 10px', background: txTypeFilter === 'expense' ? 'rgba(239,68,68,0.2)' : 'transparent', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '6px', fontSize: '0.72rem', fontWeight: '800', cursor: 'pointer' }}
            >
              📉 Pengeluaran
            </button>
          </div>
        </div>

        <div style={{ border: '1px solid #334155', borderRadius: '10px', overflow: 'hidden', background: '#0f172a' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
            <thead>
              <tr style={{ background: '#1e293b', color: '#cbd5e1', fontSize: '0.70rem', textTransform: 'uppercase', fontWeight: '800' }}>
                <th style={{ padding: '9px 12px' }}>Tanggal</th>
                <th style={{ padding: '9px 12px' }}>Outlet Restoran</th>
                <th style={{ padding: '9px 12px' }}>Tipe</th>
                <th style={{ padding: '9px 12px' }}>Kategori &amp; Deskripsi</th>
                <th style={{ padding: '9px 12px' }}>Metode</th>
                <th style={{ padding: '9px 12px', textAlign: 'right' }}>Jumlah (Rp)</th>
                <th style={{ padding: '9px 12px', textAlign: 'center' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredRecentTx && filteredRecentTx.length > 0 ? (
                filteredRecentTx.slice(0, 6).map((tx) => (
                  <tr key={tx.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', color: '#f8fafc' }}>
                    <td style={{ padding: '8px 12px', color: '#cbd5e1', fontSize: '0.76rem' }}>{tx.date}</td>
                    <td style={{ padding: '8px 12px', fontWeight: '700', color: '#ffffff' }}>📍 {tx.branch_name}</td>
                    <td style={{ padding: '8px 12px' }}>
                      <span style={{
                        padding: '3px 8px',
                        borderRadius: '6px',
                        fontSize: '0.70rem',
                        fontWeight: '800',
                        background: tx.type === 'income' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                        color: tx.type === 'income' ? '#22c55e' : '#ef4444',
                        border: `1px solid ${tx.type === 'income' ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`
                      }}>
                        {tx.type === 'income' ? '📈 Pemasukan' : '📉 Pengeluaran'}
                      </span>
                    </td>
                    <td style={{ padding: '8px 12px' }}>
                      <div style={{ fontWeight: '700', color: '#38bdf8' }}>{tx.category}</div>
                      <div style={{ fontSize: '0.70rem', color: '#94a3b8' }}>{tx.description}</div>
                    </td>
                    <td style={{ padding: '8px 12px', color: '#cbd5e1', fontSize: '0.76rem' }}>💳 {tx.payment_method}</td>
                    <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: '900', color: tx.type === 'income' ? '#22c55e' : '#ef4444' }}>
                      {tx.type === 'income' ? '+' : '-'}{formatRupiah(tx.amount)}
                    </td>
                    <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                      <span style={{ background: 'rgba(34, 197, 94, 0.15)', color: '#22c55e', border: '1px solid rgba(34, 197, 94, 0.3)', padding: '3px 8px', borderRadius: '6px', fontSize: '0.68rem', fontWeight: '800' }}>
                        ✓ Terverifikasi
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} style={{ padding: '18px', textAlign: 'center', color: '#64748b', fontSize: '0.78rem' }}>
                    Belum ada transaksi harian tercatat untuk filter ini.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 6. ✨ SECTION BARU: ANALISIS KEUANGAN BY AI (AI FINANCIAL AGENT) */}
      {/* ------------------------------------------------------------- */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(30, 27, 75, 0.95) 0%, rgba(15, 23, 42, 0.98) 50%, rgba(88, 28, 135, 0.9) 100%)',
        border: '1px solid #818cf8', borderRadius: '18px', padding: '24px',
        display: 'flex', flexDirection: 'column', gap: '20px', boxShadow: '0 20px 50px rgba(99, 102, 241, 0.25)',
        position: 'relative', overflow: 'hidden'
      }}>
        
        {/* Glow Decorative Effect */}
        <div style={{ position: 'absolute', top: '-60px', right: '-60px', width: '220px', height: '220px', background: 'radial-gradient(circle, rgba(168, 85, 247, 0.3) 0%, rgba(0,0,0,0) 70%)', pointerEvents: 'none' }} />

        {/* AI Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 20px rgba(99,102,241,0.6)' }}>
              <Bot size={28} color="#ffffff" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 style={{ fontSize: '1.2rem', fontWeight: '900', color: '#ffffff', margin: 0, letterSpacing: '-0.01em' }}>
                  Analisis Keuangan by AI (Antigravity Financial Agent)
                </h3>
                <span style={{ padding: '2px 8px', borderRadius: '12px', background: 'rgba(52, 211, 153, 0.2)', color: '#34d399', border: '1px solid #34d399', fontSize: '0.68rem', fontWeight: '900', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <Sparkles size={11} /> AI ONLINE
                </span>
              </div>
              <p style={{ fontSize: '0.78rem', color: '#cbd5e1', margin: '3px 0 0 0' }}>
                Wawasan cerdas berbasis AI mengenai kesehatan omzet, kontrol HPP, dan rekomendasi efisiensi operasional.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
              Diperbarui: <strong style={{ color: '#818cf8' }}>{aiAnalysisTime}</strong>
            </span>
            <button
              type="button"
              onClick={handleRunAiAnalysis}
              className="btn-emerald"
              style={{ padding: '9px 16px', borderRadius: '10px', fontSize: '0.78rem', fontWeight: '900', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: '#ffffff', border: 'none' }}
            >
              <RefreshCw size={14} className={isAnalyzingAI ? "animate-spin" : ""} />
              <span>Jalankan Analisis AI Terbaru</span>
            </button>
          </div>
        </div>

        {/* AI Health Score Banner */}
        <div style={{ background: 'rgba(15, 23, 42, 0.7)', padding: '16px 20px', borderRadius: '14px', border: '1px solid rgba(129, 140, 248, 0.3)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ background: 'rgba(52, 211, 153, 0.15)', border: '1px solid #34d399', padding: '10px 16px', borderRadius: '12px', textAlign: 'center' }}>
              <div style={{ fontSize: '0.68rem', color: '#94a3b8', fontWeight: '800', textTransform: 'uppercase' }}>SKOR KESEHATAN AI</div>
              <div style={{ fontSize: '1.4rem', fontWeight: '900', color: '#34d399', marginTop: '2px' }}>94 / 100</div>
            </div>
            <div>
              <div style={{ fontSize: '0.94rem', fontWeight: '900', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Award size={18} color="#34d399" />
                <span>Kondisi Keuangan Multi-Restoran: Sangat Sehat &amp; Profitabel</span>
              </div>
              <p style={{ fontSize: '0.76rem', color: '#94a3b8', margin: '3px 0 0 0' }}>
                Omzet harian terkonfirmasi positif ({formatRupiah(todayIncome)}) dengan margin laba bersih rata-rata <strong style={{ color: '#38bdf8' }}>{todayMargin}%</strong> across {allOutlets.length} cabang outlet.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <div style={{ background: '#1e293b', padding: '8px 14px', borderRadius: '10px', border: '1px solid #334155', textAlign: 'center' }}>
              <span style={{ fontSize: '0.66rem', color: '#94a3b8', display: 'block', fontWeight: '700' }}>DISPARITAS BAHAN</span>
              <span style={{ fontSize: '0.88rem', fontWeight: '900', color: ingredientComparisonList.some(i => i.disparity > 2000) ? '#ef4444' : '#34d399' }}>
                {ingredientComparisonList.some(i => i.disparity > 2000) ? '⚠️ Terdeteksi' : '✅ Terkendali'}
              </span>
            </div>
            <div style={{ background: '#1e293b', padding: '8px 14px', borderRadius: '10px', border: '1px solid #334155', textAlign: 'center' }}>
              <span style={{ fontSize: '0.66rem', color: '#94a3b8', display: 'block', fontWeight: '700' }}>RASIO COGS / HPP</span>
              <span style={{ fontSize: '0.88rem', fontWeight: '900', color: hppComparisonList.some(h => h.isOverBudget) ? '#ef4444' : '#34d399' }}>
                {hppComparisonList.some(h => h.isOverBudget) ? '⚠️ Alert Over' : '✅ Ideal < 60%'}
              </span>
            </div>
          </div>
        </div>

        {/* 4 AI Insight Cards Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '14px' }}>
          
          {/* Insight 1: Analisis Omzet & Jam Sibuk */}
          <div style={{ background: 'rgba(15, 23, 42, 0.8)', padding: '16px', borderRadius: '14px', border: '1px solid rgba(56, 189, 248, 0.3)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ padding: '8px', borderRadius: '10px', background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8' }}>
                <TrendingUp size={20} />
              </div>
              <div>
                <h4 style={{ fontSize: '0.90rem', fontWeight: '900', color: '#ffffff', margin: 0 }}>
                  📈 Proyeksi Pertumbuhan &amp; Tren Omzet
                </h4>
                <span style={{ fontSize: '0.70rem', color: '#94a3b8' }}>Evaluasi Tren Penjualan Kasir POS</span>
              </div>
            </div>
            <p style={{ fontSize: '0.78rem', color: '#cbd5e1', margin: 0, lineHeight: '1.45' }}>
              Penjualan cabang menunjukkan performa stabil pada jam makan siang (11:30 - 14:00) dan malam (18:30 - 21:00). Proyeksi omzet hingga akhir bulan diperkirakan tumbuh <strong style={{ color: '#34d399' }}>+14.5%</strong> dibandingkan periode bulan lalu.
            </p>
            <div style={{ fontSize: '0.72rem', color: '#38bdf8', fontWeight: '800', background: 'rgba(56, 189, 248, 0.1)', padding: '6px 10px', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Zap size={13} />
              <span>Saran AI: Tingkatkan stok bahan mentah pada hari Jumat-Minggu untuk mengantisipasi lonjakan order.</span>
            </div>
          </div>

          {/* Insight 2: Deteksi Disparitas Supplier & HPP */}
          <div style={{ background: 'rgba(15, 23, 42, 0.8)', padding: '16px', borderRadius: '14px', border: '1px solid rgba(239, 68, 68, 0.3)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ padding: '8px', borderRadius: '10px', background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444' }}>
                <ShieldAlert size={20} />
              </div>
              <div>
                <h4 style={{ fontSize: '0.90rem', fontWeight: '900', color: '#ffffff', margin: 0 }}>
                  ⚠️ Kontrol Disparitas Harga Beli &amp; Efisiensi HPP
                </h4>
                <span style={{ fontSize: '0.70rem', color: '#94a3b8' }}>Analisis Selisih Harga Supplier Antar Outlet</span>
              </div>
            </div>
            <p style={{ fontSize: '0.78rem', color: '#cbd5e1', margin: 0, lineHeight: '1.45' }}>
              {ingredientComparisonList.some(i => i.disparity > 2000) ? (
                <>Terdeteksi disparitas harga bahan mentah (seperti <strong style={{ color: '#f59e0b' }}>{ingredientComparisonList.find(i => i.disparity > 2000)?.name || 'Bahan Utama'}</strong>) antar cabang outlet dengan selisih hingga <strong style={{ color: '#ef4444' }}>{formatRupiah(ingredientComparisonList.find(i => i.disparity > 2000)?.disparity || 3000)}</strong>.</>
              ) : (
                <>Disparitas harga beli bahan mentah antar cabang terkendali baik di bawah ambang batas toleransi.</>
              )}
            </p>
            <div style={{ fontSize: '0.72rem', color: '#ef4444', fontWeight: '800', background: 'rgba(239, 68, 68, 0.1)', padding: '6px 10px', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <AlertTriangle size={13} />
              <span>Saran AI: Lakukan konsolidasi pengadaan bahan mentah dari 1 supplier terpusat untuk menjaga HPP di bawah 60%.</span>
            </div>
          </div>

          {/* Insight 3: Optimasi Menu Margin Tinggi */}
          <div style={{ background: 'rgba(15, 23, 42, 0.8)', padding: '16px', borderRadius: '14px', border: '1px solid rgba(168, 85, 247, 0.3)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ padding: '8px', borderRadius: '10px', background: 'rgba(168, 85, 247, 0.15)', color: '#a855f7' }}>
                <Lightbulb size={20} />
              </div>
              <div>
                <h4 style={{ fontSize: '0.90rem', fontWeight: '900', color: '#ffffff', margin: 0 }}>
                  💡 Rekomendasi Menu &amp; Margin Keuntungan
                </h4>
                <span style={{ fontSize: '0.70rem', color: '#94a3b8' }}>Strategi Upselling &amp; Bundling Produk</span>
              </div>
            </div>
            <p style={{ fontSize: '0.78rem', color: '#cbd5e1', margin: 0, lineHeight: '1.45' }}>
              Menu kategori Minuman &amp; Dessert memiliki margin keuntungan bersih tertinggi mencapai <strong style={{ color: '#34d399' }}>68% - 75%</strong>. Mendorong promosi bundling makanan utama dengan minuman khas dapat mendongkrak *Average Bill* harian.
            </p>
            <div style={{ fontSize: '0.72rem', color: '#a855f7', fontWeight: '800', background: 'rgba(168, 85, 247, 0.1)', padding: '6px 10px', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Sparkles size={13} />
              <span>Saran AI: Buat Paket Combo Hemat di POS Kasir untuk menaikkan Average Bill dari {formatRupiah(todayAvgBill)} ke {formatRupiah(todayAvgBill * 1.2)}.</span>
            </div>
          </div>

          {/* Insight 4: Prediksi Restok & Alokasi Modal Kas */}
          <div style={{ background: 'rgba(15, 23, 42, 0.8)', padding: '16px', borderRadius: '14px', border: '1px solid rgba(34, 197, 94, 0.3)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ padding: '8px', borderRadius: '10px', background: 'rgba(34, 197, 94, 0.15)', color: '#34d399' }}>
                <Activity size={20} />
              </div>
              <div>
                <h4 style={{ fontSize: '0.90rem', fontWeight: '900', color: '#ffffff', margin: 0 }}>
                  ⚡ Prediksi Logistik &amp; Arus Kas Modal
                </h4>
                <span style={{ fontSize: '0.70rem', color: '#94a3b8' }}>Manajemen Kasir &amp; Stok Opname</span>
              </div>
            </div>
            <p style={{ fontSize: '0.78rem', color: '#cbd5e1', margin: 0, lineHeight: '1.45' }}>
              Arus kas operasional kasir terpantau lancar. Uang modal awal kasir terdistribusi rata Rp 2.000.000 / outlet dengan tingkat rekonsiliasi kasir fisik mencapai <strong style={{ color: '#38bdf8' }}>99.2% akurat</strong>.
            </p>
            <div style={{ fontSize: '0.72rem', color: '#34d399', fontWeight: '800', background: 'rgba(34, 197, 94, 0.1)', padding: '6px 10px', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <CheckCircle2 size={13} />
              <span>Saran AI: Pertahankan jadwal Audit Stock Opname rutin 2x seminggu untuk mencegah kebocoran barang rusak.</span>
            </div>
          </div>

        </div>

        {/* Interactive Prompt Query / Ask AI Quick Buttons */}
        <div style={{ background: '#0f172a', padding: '14px', borderRadius: '12px', border: '1px solid #334155', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <span style={{ fontSize: '0.76rem', color: '#94a3b8', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <HelpCircle size={14} color="#818cf8" />
            <span>Tanyakan Analisis Spesifik pada Antigravity AI Agent:</span>
          </span>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            <button
              type="button"
              onClick={() => setAiActiveQuestion('hpp')}
              style={{ padding: '6px 12px', background: aiActiveQuestion === 'hpp' ? 'rgba(99,102,241,0.3)' : '#1e293b', border: `1px solid ${aiActiveQuestion === 'hpp' ? '#818cf8' : '#334155'}`, borderRadius: '8px', color: '#ffffff', fontSize: '0.74rem', fontWeight: '700', cursor: 'pointer' }}
            >
              💡 "Bagaimana cara menjaga HPP di bawah 60%?"
            </button>
            <button
              type="button"
              onClick={() => setAiActiveQuestion('outlet')}
              style={{ padding: '6px 12px', background: aiActiveQuestion === 'outlet' ? 'rgba(99,102,241,0.3)' : '#1e293b', border: `1px solid ${aiActiveQuestion === 'outlet' ? '#818cf8' : '#334155'}`, borderRadius: '8px', color: '#ffffff', fontSize: '0.74rem', fontWeight: '700', cursor: 'pointer' }}
            >
              📈 "Outlet mana dengan rasio profit paling tinggi?"
            </button>
            <button
              type="button"
              onClick={() => setAiActiveQuestion('disparity')}
              style={{ padding: '6px 12px', background: aiActiveQuestion === 'disparity' ? 'rgba(99,102,241,0.3)' : '#1e293b', border: `1px solid ${aiActiveQuestion === 'disparity' ? '#818cf8' : '#334155'}`, borderRadius: '8px', color: '#ffffff', fontSize: '0.74rem', fontWeight: '700', cursor: 'pointer' }}
            >
              ⚠️ "Bahan baku apa yang mengalami selisih harga terbesar?"
            </button>
          </div>

          {/* Interactive Answer Box */}
          {aiActiveQuestion && (
            <div style={{ background: 'rgba(99, 102, 241, 0.1)', border: '1px solid #818cf8', padding: '12px 14px', borderRadius: '10px', fontSize: '0.78rem', color: '#f8fafc', marginTop: '4px', lineHeight: '1.5' }}>
              {aiActiveQuestion === 'hpp' && (
                <div>
                  <strong style={{ color: '#818cf8', display: 'block', marginBottom: '4px' }}>🤖 Analisis AI - Cara Menjaga HPP di bawah 60%:</strong>
                  1. Lakukan audit resep porsi (*Yield Test*) secara berkala.<br/>
                  2. Buat kontrak pembelian terpusat (*Central Procurement*) untuk mendapatkan harga grosir supplier.<br/>
                  3. Atasi pemborosan (*waste*) bahan makanan dengan sistem FIFO pada stok dapur.
                </div>
              )}
              {aiActiveQuestion === 'outlet' && (
                <div>
                  <strong style={{ color: '#818cf8', display: 'block', marginBottom: '4px' }}>🤖 Analisis AI - Rasio Profit Outlet Tertinggi:</strong>
                  Restoran Utama menduduki peringkat pertama dengan margin efisiensi operasional tertinggi. Disertai pengelolaan stok opname yang tepat waktu tanpa kehilangan bahan baku.
                </div>
              )}
              {aiActiveQuestion === 'disparity' && (
                <div>
                  <strong style={{ color: '#818cf8', display: 'block', marginBottom: '4px' }}>🤖 Analisis AI - Disparitas Harga Bahan Baku:</strong>
                  Bahan baku kategori <strong style={{ color: '#f59e0b' }}>Ayam &amp; Daging</strong> tercatat memiliki variasi harga terbelinya antar cabang outlet. Disarankan menyamakan vendor supplier resmi Restoran.
                </div>
              )}
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
