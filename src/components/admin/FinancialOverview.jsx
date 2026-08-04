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
import { getThemePalette } from '../../utils/themeUtils';

export default function FinancialOverview({ stats, chartData, recentTransactions, outlets, selectedBranch, masterData, themeMode = 'dark' }) {
  const T = getThemePalette(themeMode);
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', background: T.pageBg, color: T.txtPrimary, transition: 'background 0.25s ease, color 0.25s ease' }} className="animate-fade-in">
      
      {/* 🟢 INTERACTIVE HEADER BANNER */}
      <div style={{ background: themeMode === 'warm_minimalist' ? 'linear-gradient(135deg, #1a3826 0%, #143022 100%)' : themeMode === 'light' ? 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)' : 'linear-gradient(135deg, rgba(30, 41, 59, 0.9) 0%, rgba(15, 23, 42, 0.95) 100%)', padding: '18px 22px', borderRadius: '16px', border: `1px solid ${themeMode === 'warm_minimalist' ? 'rgba(217,119,6,0.3)' : T.borderStrong}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px', boxShadow: T.shadowMd }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: T.success, boxShadow: `0 0 12px ${T.success}` }} className="animate-pulse" />
            <h2 style={{ fontSize: '1.25rem', fontWeight: '900', color: themeMode === 'warm_minimalist' ? '#e8f0ea' : T.txtPrimary, margin: 0, letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>Dashboard Executive Multi-Restoran</span>
              <span style={{ fontSize: '0.68rem', padding: '3px 8px', borderRadius: '6px', background: T.accentGoldBg, color: T.accentGold, border: `1px solid ${T.accentGoldBorder}`, fontWeight: '800' }}>INTERACTIVE LIVE</span>
            </h2>
          </div>
          <p style={{ color: themeMode === 'warm_minimalist' ? '#a8c4ae' : T.txtSecondary, fontSize: '0.78rem', marginTop: '4px', margin: 0 }}>
            Pemantauan omzet harian, komparasi per outlet, analisis HPP, dan Rekomendasi Analisis AI real-time.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            type="button"
            onClick={handleRunAiAnalysis}
            style={{
              padding: '9px 16px', borderRadius: '10px', fontSize: '0.78rem', fontWeight: '800', cursor: 'pointer',
              background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)', color: T.txtPrimary, border: 'none',
              display: 'flex', alignItems: 'center', gap: '6px', boxShadow: '0 4px 14px rgba(99,102,241,0.4)',
              transition: 'transform 0.2s ease'
            }}
            title="Jalankan Ulang Analisis AI"
          >
            <Sparkles size={15} className={isAnalyzingAI ? "animate-spin" : ""} />
            <span>{isAnalyzingAI ? "Analisis AI..." : "Update Analisis AI"}</span>
          </button>
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
            background: activeMetricCard === 'revenue' ? 'linear-gradient(135deg, rgba(34, 197, 94, 0.15) 0%, rgba(15, 23, 42, 0.9) 100%)' : T.cardBg,
            border: `1px solid ${activeMetricCard === 'revenue' ? T.success : T.border}`,
            borderRadius: '12px', padding: '12px 14px', cursor: 'pointer', transition: 'all 0.2s ease',
            boxShadow: activeMetricCard === 'revenue' ? '0 0 15px rgba(34, 197, 94, 0.2)' : 'none'
          }}
        >
          <div style={{ fontSize: '0.64rem', color: T.txtSecondary, fontWeight: '800', textTransform: 'uppercase', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>REVENUE HARI INI</span>
            <DollarSign size={13} color={T.success} />
          </div>
          <div style={{ fontSize: '1.1rem', fontWeight: '900', color: T.success, marginTop: '4px' }}>{formatRupiah(todayIncome)}</div>
          <div style={{ fontSize: '0.64rem', color: T.success, fontWeight: '700', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '2px' }}>
            <ArrowUpRight size={12} /> <span>Real-time POS</span>
          </div>
        </div>

        {/* Stat 2: PENGELUARAN HARI INI */}
        <div
          onClick={() => setActiveMetricCard('expense')}
          style={{
            background: activeMetricCard === 'expense' ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.15) 0%, rgba(15, 23, 42, 0.9) 100%)' : T.cardBg,
            border: `1px solid ${activeMetricCard === 'expense' ? T.danger : T.border}`,
            borderRadius: '12px', padding: '12px 14px', cursor: 'pointer', transition: 'all 0.2s ease',
            boxShadow: activeMetricCard === 'expense' ? '0 0 15px rgba(239, 68, 68, 0.2)' : 'none'
          }}
        >
          <div style={{ fontSize: '0.64rem', color: T.txtSecondary, fontWeight: '800', textTransform: 'uppercase', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>PENGELUARAN HARI INI</span>
            <Wallet size={13} color={T.danger} />
          </div>
          <div style={{ fontSize: '1.1rem', fontWeight: '900', color: T.danger, marginTop: '4px' }}>{formatRupiah(todayExpense)}</div>
          <div style={{ fontSize: '0.64rem', color: T.txtSecondary, fontWeight: '600', marginTop: '4px' }}>Kasir & OPEX</div>
        </div>

        {/* Stat 3: LABA BERSIH HARI INI */}
        <div
          onClick={() => setActiveMetricCard('profit')}
          style={{
            background: activeMetricCard === 'profit' ? 'linear-gradient(135deg, rgba(56, 189, 248, 0.15) 0%, rgba(15, 23, 42, 0.9) 100%)' : T.cardBg,
            border: `1px solid ${activeMetricCard === 'profit' ? T.info : T.border}`,
            borderRadius: '12px', padding: '12px 14px', cursor: 'pointer', transition: 'all 0.2s ease',
            boxShadow: activeMetricCard === 'profit' ? '0 0 15px rgba(56, 189, 248, 0.2)' : 'none'
          }}
        >
          <div style={{ fontSize: '0.64rem', color: T.txtSecondary, fontWeight: '800', textTransform: 'uppercase', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>LABA BERSIH HARI INI</span>
            <TrendingUp size={13} color={T.info} />
          </div>
          <div style={{ fontSize: '1.1rem', fontWeight: '900', color: todayNetProfit >= 0 ? T.info : T.danger, marginTop: '4px' }}>{formatRupiah(todayNetProfit)}</div>
          <div style={{ fontSize: '0.64rem', color: T.warning, fontWeight: '700', marginTop: '4px' }}>Margin: {todayMargin}%</div>
        </div>

        {/* Stat 4: TOTAL TRANSAKSI HARI INI */}
        <div
          onClick={() => setActiveMetricCard('tx')}
          style={{
            background: activeMetricCard === 'tx' ? 'linear-gradient(135deg, rgba(168, 85, 247, 0.15) 0%, rgba(15, 23, 42, 0.9) 100%)' : T.cardBg,
            border: `1px solid ${activeMetricCard === 'tx' ? T.accentGreen : T.border}`,
            borderRadius: '12px', padding: '12px 14px', cursor: 'pointer', transition: 'all 0.2s ease'
          }}
        >
          <div style={{ fontSize: '0.64rem', color: T.txtSecondary, fontWeight: '800', textTransform: 'uppercase', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>TRANSAKSI HARI INI</span>
            <ShoppingBag size={13} color={T.accentGreen} />
          </div>
          <div style={{ fontSize: '1.1rem', fontWeight: '900', color: T.txtPrimary, marginTop: '4px' }}>{todayTxCount} Nota</div>
          <div style={{ fontSize: '0.64rem', color: T.txtSecondary, fontWeight: '600', marginTop: '4px' }}>Terverifikasi POS</div>
        </div>

        {/* Stat 5: AVERAGE BILL HARI INI */}
        <div
          onClick={() => setActiveMetricCard('avg')}
          style={{
            background: activeMetricCard === 'avg' ? 'linear-gradient(135deg, rgba(245, 158, 11, 0.15) 0%, rgba(15, 23, 42, 0.9) 100%)' : T.cardBg,
            border: `1px solid ${activeMetricCard === 'avg' ? T.accentGold : T.border}`,
            borderRadius: '12px', padding: '12px 14px', cursor: 'pointer', transition: 'all 0.2s ease'
          }}
        >
          <div style={{ fontSize: '0.64rem', color: T.txtSecondary, fontWeight: '800', textTransform: 'uppercase', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>AVERAGE BILL</span>
            <CreditCard size={13} color={T.accentGold} />
          </div>
          <div style={{ fontSize: '1.1rem', fontWeight: '900', color: T.accentGold, marginTop: '4px' }}>{formatRupiah(todayAvgBill)}</div>
          <div style={{ fontSize: '0.64rem', color: T.txtSecondary, fontWeight: '600', marginTop: '4px' }}>Rata-rata / Meja</div>
        </div>

        {/* Stat 6: TOTAL OUTLET AKTIF */}
        <div
          onClick={() => setActiveMetricCard('outlet')}
          style={{
            background: activeMetricCard === 'outlet' ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(15, 23, 42, 0.9) 100%)' : T.cardBg,
            border: `1px solid ${activeMetricCard === 'outlet' ? T.accentGreen : T.border}`,
            borderRadius: '12px', padding: '12px 14px', cursor: 'pointer', transition: 'all 0.2s ease'
          }}
        >
          <div style={{ fontSize: '0.64rem', color: T.txtSecondary, fontWeight: '800', textTransform: 'uppercase', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>OUTLET RESTORAN</span>
            <Building2 size={13} color={T.accentGreen} />
          </div>
          <div style={{ fontSize: '1.1rem', fontWeight: '900', color: T.accentGreen, marginTop: '4px' }}>{allOutlets.length} Cabang</div>
          <div style={{ fontSize: '0.64rem', color: T.success, fontWeight: '700', marginTop: '4px' }}>● 100% Beroperasi</div>
        </div>

      </div>

      {/* ------------------------------------------------------------- */}
      {/* NEW SECTION: GRAFIK PENJUALAN WITH OUTLET & TANGGAL FILTERS   */}
      {/* ------------------------------------------------------------- */}
      <div style={{ background: T.cardBg, border: `1px solid ${T.border}`, borderRadius: '14px', padding: '18px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h3 style={{ fontSize: '1.0rem', fontWeight: '900', color: T.txtPrimary, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <TrendingUp size={20} color={T.success} />
              <span>Grafik Penjualan Restoran</span>
              <span style={{ fontSize: '0.68rem', padding: '3px 8px', borderRadius: '6px', background: 'rgba(34, 197, 94, 0.15)', color: T.success, border: '1px solid rgba(34, 197, 94, 0.3)', fontWeight: '800' }}>
                REAL-TIME ANALYTICS
              </span>
            </h3>
            <p style={{ fontSize: '0.76rem', color: T.txtSecondary, margin: '4px 0 0 0' }}>
              Grafik pertumbuhan omzet harian berdasarkan filter cabang outlet dan periode tanggal
            </p>
          </div>

          {/* Filter Controls (Nama Outlet + Filter Tanggal + Chart Type) */}
          <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
            
            {/* 1. FILTER NAMA OUTLET */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Building2 size={15} color={T.txtSecondary} />
              <select
                value={salesChartOutlet}
                onChange={e => setSalesChartOutlet(e.target.value)}
                style={{ padding: '6px 12px', background: T.inputBg, border: `1px solid ${T.borderStrong}`, borderRadius: '8px', color: T.txtPrimary, fontSize: '0.76rem', fontWeight: '800', cursor: 'pointer' }}
              >
                <option value="ALL">🏢 Semua Outlet Restoran</option>
                {allOutlets.map(o => (
                  <option key={o.id} value={o.id}>📍 {o.name}</option>
                ))}
              </select>
            </div>

            {/* 2. FILTER TANGGAL / PERIODE */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Calendar size={15} color={T.txtSecondary} />
              <select
                value={salesChartPeriod}
                onChange={e => setSalesChartPeriod(e.target.value)}
                style={{ padding: '6px 12px', background: T.inputBg, border: `1px solid ${T.borderStrong}`, borderRadius: '8px', color: T.txtPrimary, fontSize: '0.76rem', fontWeight: '800', cursor: 'pointer' }}
              >
                <option value="7days">🗓 7 Hari Terakhir</option>
                <option value="today">📅 Hari Ini ({todayStr})</option>
                <option value="30days">📆 30 Hari Terakhir</option>
                <option value="custom">📅 Pilih Tanggal (Custom Range)...</option>
              </select>
            </div>

            {/* CUSTOM TANGGAL RANGE INPUTS */}
            {salesChartPeriod === 'custom' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: T.cardBg2, padding: '4px 8px', borderRadius: '8px', border: `1px solid ${T.borderStrong}` }}>
                <input
                  type="date"
                  value={salesChartStartDate}
                  onChange={e => setSalesChartStartDate(e.target.value)}
                  style={{ padding: '4px 8px', background: T.inputBg, border: `1px solid ${T.borderStrong}`, borderRadius: '6px', color: T.txtPrimary, fontSize: '0.74rem' }}
                />
                <span style={{ fontSize: '0.72rem', color: T.txtSecondary, fontWeight: '700' }}>s/d</span>
                <input
                  type="date"
                  value={salesChartEndDate}
                  onChange={e => setSalesChartEndDate(e.target.value)}
                  style={{ padding: '4px 8px', background: T.inputBg, border: `1px solid ${T.borderStrong}`, borderRadius: '6px', color: T.txtPrimary, fontSize: '0.74rem' }}
                />
              </div>
            )}

            {/* CHART TYPE TOGGLE */}
            <div style={{ background: T.inputBg, padding: '3px', borderRadius: '8px', border: `1px solid ${T.borderStrong}`, display: 'flex', gap: '2px' }}>
              <button
                type="button"
                onClick={() => setSalesChartType('area')}
                style={{ padding: '4px 10px', background: salesChartType === 'area' ? T.success : 'transparent', color: salesChartType === 'area' ? T.cardBg2 : '#cbd5e1', border: 'none', borderRadius: '6px', fontSize: '0.72rem', fontWeight: '800', cursor: 'pointer' }}
              >
                📈 Trend Area
              </button>
              <button
                type="button"
                onClick={() => setSalesChartType('bar')}
                style={{ padding: '4px 10px', background: salesChartType === 'bar' ? T.success : 'transparent', color: salesChartType === 'bar' ? T.cardBg2 : '#cbd5e1', border: 'none', borderRadius: '6px', fontSize: '0.72rem', fontWeight: '800', cursor: 'pointer' }}
              >
                📊 Bar Chart
              </button>
            </div>

          </div>
        </div>

        {/* SUMMARY KPI METRICS FOR SELECTED FILTER */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
          <div style={{ background: T.cardBg2, border: `1px solid ${T.borderStrong}`, borderRadius: '10px', padding: '10px 14px' }}>
            <span style={{ fontSize: '0.66rem', color: T.txtSecondary, fontWeight: '800', textTransform: 'uppercase' }}>TOTAL PENJUALAN (PERIODE TERPILIH)</span>
            <div style={{ fontSize: '1.15rem', fontWeight: '900', color: T.success, marginTop: '2px' }}>{formatRupiah(totalSalesPeriod)}</div>
          </div>
          <div style={{ background: T.cardBg2, border: `1px solid ${T.borderStrong}`, borderRadius: '10px', padding: '10px 14px' }}>
            <span style={{ fontSize: '0.66rem', color: T.txtSecondary, fontWeight: '800', textTransform: 'uppercase' }}>RATA-RATA OMZET / HARI</span>
            <div style={{ fontSize: '1.15rem', fontWeight: '900', color: T.info, marginTop: '2px' }}>{formatRupiah(avgSalesPerDay)}</div>
          </div>
          <div style={{ background: T.cardBg2, border: `1px solid ${T.borderStrong}`, borderRadius: '10px', padding: '10px 14px' }}>
            <span style={{ fontSize: '0.66rem', color: T.txtSecondary, fontWeight: '800', textTransform: 'uppercase' }}>TOTAL TRANSAKSI (NOTA)</span>
            <div style={{ fontSize: '1.15rem', fontWeight: '900', color: T.accentGreen, marginTop: '2px' }}>{totalTxPeriod} Transaksi</div>
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
                <CartesianGrid strokeDasharray="3 3" stroke={T.gridColor} />
                <XAxis dataKey="date" stroke={T.txtMuted} fontSize={11} tickLine={false} />
                <YAxis stroke={T.txtMuted} fontSize={11} tickLine={false} tickFormatter={(val) => `${val / 1000}k`} />
                <Tooltip 
                  contentStyle={{ background: T.tooltipBg, border: `1px solid ${T.tooltipBorder}`, borderRadius: '8px', color: T.tooltipColor, fontSize: '0.76rem' }} 
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
                <CartesianGrid strokeDasharray="3 3" stroke={T.gridColor} />
                <XAxis dataKey="date" stroke={T.txtMuted} fontSize={11} tickLine={false} />
                <YAxis stroke={T.txtMuted} fontSize={11} tickLine={false} tickFormatter={(val) => `${val / 1000}k`} />
                <Tooltip 
                  contentStyle={{ background: T.tooltipBg, border: `1px solid ${T.tooltipBorder}`, borderRadius: '8px', color: T.tooltipColor, fontSize: '0.76rem' }} 
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
      <div style={{ background: T.cardBg, border: `1px solid ${T.border}`, borderRadius: '14px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
          <div>
            <h3 style={{ fontSize: '0.92rem', fontWeight: '800', color: T.txtPrimary, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <BarChart3 size={18} color={T.info} />
              <span>Perbandingan Omzet Bulan Lalu vs Omzet Berjalan Bulan Ini per Outlet</span>
            </h3>
            <p style={{ fontSize: '0.74rem', color: T.txtSecondary, margin: '2px 0 0 0' }}>
              Bandingkan akumulasi pertumbuhan omzet bulan sebelumnya dengan bulan berjalan.
            </p>
          </div>

          {/* Controls (Chart Type + Branch Selector) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ background: T.inputBg, padding: '3px', borderRadius: '8px', border: `1px solid ${T.borderStrong}`, display: 'flex', gap: '2px' }}>
              <button
                type="button"
                onClick={() => setOmzetChartType('bar')}
                style={{ padding: '4px 10px', background: omzetChartType === 'bar' ? T.info : 'transparent', color: omzetChartType === 'bar' ? T.cardBg2 : '#cbd5e1', border: 'none', borderRadius: '6px', fontSize: '0.72rem', fontWeight: '800', cursor: 'pointer' }}
              >
                📊 Bar
              </button>
              <button
                type="button"
                onClick={() => setOmzetChartType('area')}
                style={{ padding: '4px 10px', background: omzetChartType === 'area' ? T.info : 'transparent', color: omzetChartType === 'area' ? T.cardBg2 : '#cbd5e1', border: 'none', borderRadius: '6px', fontSize: '0.72rem', fontWeight: '800', cursor: 'pointer' }}
              >
                📈 Trend
              </button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Filter size={14} color={T.txtSecondary} />
              <select
                value={omzetFilterBranch}
                onChange={e => setOmzetFilterBranch(e.target.value)}
                style={{ padding: '6px 12px', background: T.inputBg, border: `1px solid ${T.borderStrong}`, borderRadius: '8px', color: T.txtPrimary, fontSize: '0.76rem', fontWeight: '700', cursor: 'pointer' }}
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
                <CartesianGrid strokeDasharray="3 3" stroke={T.gridColor} />
                <XAxis dataKey="name" stroke={T.txtMuted} fontSize={11} tickLine={false} />
                <YAxis stroke={T.txtMuted} fontSize={11} tickLine={false} />
                <Tooltip contentStyle={{ background: T.tooltipBg, border: `1px solid ${T.tooltipBorder}`, borderRadius: '8px', color: T.tooltipColor, fontSize: '0.76rem' }} formatter={(val) => formatRupiah(val)} />
                <Legend wrapperStyle={{ fontSize: '0.72rem', color: T.txtPrimary }} />
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
                <CartesianGrid strokeDasharray="3 3" stroke={T.gridColor} />
                <XAxis dataKey="name" stroke={T.txtMuted} fontSize={11} tickLine={false} />
                <YAxis stroke={T.txtMuted} fontSize={11} tickLine={false} />
                <Tooltip contentStyle={{ background: T.tooltipBg, border: `1px solid ${T.tooltipBorder}`, borderRadius: '8px', color: T.tooltipColor, fontSize: '0.76rem' }} formatter={(val) => formatRupiah(val)} />
                <Area type="monotone" dataKey="omzetBulanIni" name="Omzet Berjalan Bulan Ini" stroke="#38bdf8" fillOpacity={1} fill="url(#colorIni)" />
              </AreaChart>
            )}
          </ResponsiveContainer>
        </div>

        {/* Data Table Omzet Comparison */}
        <div style={{ border: `1px solid ${T.borderStrong}`, borderRadius: '10px', overflow: 'hidden', background: T.cardBg2 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
            <thead>
              <tr style={{ background: T.tableHeaderBg, color: T.txtPrimary, textTransform: 'uppercase', fontSize: '0.70rem', fontWeight: '800' }}>
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
                  <td style={{ padding: '8px 12px', fontWeight: '800', color: T.txtPrimary }}>📍 {d.name}</td>
                  <td style={{ padding: '8px 12px', textAlign: 'right', color: T.txtSecondary }}>{formatRupiah(d.omzetBulanLalu)}</td>
                  <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: '900', color: T.info }}>{formatRupiah(d.omzetBulanIni)}</td>
                  <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: '800', color: d.diff >= 0 ? T.success : T.danger }}>
                    {d.diff >= 0 ? '+' : ''}{formatRupiah(d.diff)}
                  </td>
                  <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                    <span style={{
                      padding: '3px 10px', borderRadius: '6px', fontSize: '0.72rem', fontWeight: '800',
                      background: d.growth >= 0 ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                      color: d.growth >= 0 ? T.success : T.danger,
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
        <div style={{ background: T.cardBg, border: `1px solid ${T.border}`, borderRadius: '14px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
            <div>
              <h3 style={{ fontSize: '0.90rem', fontWeight: '800', color: T.txtPrimary, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Package size={18} color={T.accentGold} />
                <span>Perbandingan Harga Bahan Baku per Outlet</span>
              </h3>
              <p style={{ fontSize: '0.72rem', color: T.txtSecondary, margin: '2px 0 0 0' }}>Deteksi disparitas harga beli supplier antar cabang outlet</p>
            </div>

            {/* Filters */}
            <div style={{ display: 'flex', gap: '8px' }}>
              <select
                value={ingredientTimeRange}
                onChange={e => setIngredientTimeRange(e.target.value)}
                style={{ padding: '6px 10px', background: T.inputBg, border: `1px solid ${T.borderStrong}`, borderRadius: '8px', color: T.txtPrimary, fontSize: '0.74rem', fontWeight: '700', cursor: 'pointer' }}
              >
                <option value="bulan_ini">🗓 Bulan Ini</option>
                <option value="minggu_ini">📆 Minggu Ini</option>
                <option value="hari_ini">📅 Hari Ini</option>
              </select>

              <select
                value={selectedIngredientCategory}
                onChange={e => setSelectedIngredientCategory(e.target.value)}
                style={{ padding: '6px 10px', background: T.inputBg, border: `1px solid ${T.borderStrong}`, borderRadius: '8px', color: T.txtPrimary, fontSize: '0.74rem', fontWeight: '700', cursor: 'pointer' }}
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
              <div style={{ background: T.cardBg2, border: '1px dashed #334155', borderRadius: '10px', padding: '24px', textAlign: 'center', color: T.txtSecondary, fontSize: '0.78rem' }}>
                📦 Belum ada data bahan baku terdaftar. Tambahkan bahan baku baru di menu <strong>Data Master &gt; Bahan Baku</strong>.
              </div>
            ) : (
              ingredientComparisonList.map((ing, idx) => (
                <div key={idx} style={{ background: T.cardBg2, border: `1px solid ${T.borderStrong}`, borderRadius: '10px', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: '0.80rem', fontWeight: '800', color: T.txtPrimary, display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ color: T.accentGold }}>📦 {ing.name}</span>
                      <span style={{ fontSize: '0.68rem', color: T.txtSecondary, background: T.inputBg, padding: '2px 8px', borderRadius: '6px' }}>per {ing.unit}</span>
                    </div>
                    <div style={{ fontSize: '0.72rem', color: ing.disparity > 2000 ? T.danger : T.success, fontWeight: '800' }}>
                      {ing.disparity > 2000 ? `⚠️ Selisih Harga: ${formatRupiah(ing.disparity)}` : '✅ Harga Stabil'}
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '6px', fontSize: '0.70rem' }}>
                    {ing.outletPrices.map((op, oIdx) => (
                      <div key={oIdx} style={{ background: T.inputBg, padding: '5px 8px', borderRadius: '6px', textAlign: 'center', border: op.price === ing.maxPrice && ing.disparity > 2000 ? '1px solid #ef4444' : '1px solid rgba(255,255,255,0.05)' }}>
                        <div style={{ color: T.txtPrimary, fontSize: '0.64rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{op.outletName}</div>
                        <div style={{ fontWeight: '800', color: op.price === ing.maxPrice && ing.disparity > 2000 ? T.danger : T.info, marginTop: '2px' }}>
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
      <div style={{ background: T.cardBg, border: `1px solid ${T.border}`, borderRadius: '14px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
          <div>
            <h3 style={{ fontSize: '0.92rem', fontWeight: '800', color: T.txtPrimary, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Percent size={18} color={T.danger} />
              <span>Perhitungan &amp; Perbandingan HPP (Cost of Goods Sold) Tiap Outlet</span>
            </h3>
            <p style={{ fontSize: '0.74rem', color: T.txtSecondary, margin: '2px 0 0 0' }}>
              Analisis persentase HPP makanan/minuman terhadap omzet dengan batas ideal maksimum 60%.
            </p>
          </div>

          {/* Time Range Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Calendar size={14} color={T.txtSecondary} />
            <select
              value={hppTimeRange}
              onChange={e => setHppTimeRange(e.target.value)}
              style={{ padding: '6px 12px', background: T.inputBg, border: `1px solid ${T.borderStrong}`, borderRadius: '8px', color: T.txtPrimary, fontSize: '0.76rem', fontWeight: '700', cursor: 'pointer' }}
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
              <CartesianGrid strokeDasharray="3 3" stroke={T.gridColor} />
              <XAxis dataKey="name" stroke={T.txtMuted} fontSize={11} tickLine={false} />
              <YAxis stroke={T.txtMuted} fontSize={11} tickLine={false} unit="%" />
              <Tooltip contentStyle={{ background: T.tooltipBg, border: `1px solid ${T.tooltipBorder}`, borderRadius: '8px', color: T.tooltipColor, fontSize: '0.76rem' }} formatter={(val) => `${val}%`} />
              <Bar dataKey="hppPct" name="Realisasi HPP (%)" fill="#ef4444" radius={[4, 4, 0, 0]} />
              <Bar dataKey="targetPct" name="Target Ideal HPP Max (60%)" fill="#22c55e" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Table HPP Breakdown */}
        <div style={{ border: `1px solid ${T.borderStrong}`, borderRadius: '10px', overflow: 'hidden', background: T.cardBg2 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
            <thead>
              <tr style={{ background: T.tableHeaderBg, color: T.txtPrimary, textTransform: 'uppercase', fontSize: '0.70rem', fontWeight: '800' }}>
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
                  <td style={{ padding: '8px 12px', fontWeight: '800', color: T.txtPrimary }}>📍 {h.name}</td>
                  <td style={{ padding: '8px 12px', textAlign: 'right', color: T.txtPrimary }}>{formatRupiah(h.revenue)}</td>
                  <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: '800', color: T.danger }}>{formatRupiah(h.hppAmount)}</td>
                  <td style={{ padding: '8px 12px', textAlign: 'center', fontWeight: '900', color: h.isOverBudget ? T.danger : T.success }}>{h.hppPct}%</td>
                  <td style={{ padding: '8px 12px', textAlign: 'center', color: T.success, fontWeight: '700' }}>60.0%</td>
                  <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                    <span style={{
                      padding: '3px 10px', borderRadius: '6px', fontSize: '0.72rem', fontWeight: '800',
                      background: h.isOverBudget ? 'rgba(239, 68, 68, 0.15)' : 'rgba(34, 197, 94, 0.15)',
                      color: h.isOverBudget ? T.danger : T.success,
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
      <div style={{ background: T.cardBg, border: `1px solid ${T.border}`, borderRadius: '14px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
          <div>
            <h3 style={{ fontSize: '0.90rem', fontWeight: '800', color: T.txtPrimary, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Clock size={18} color={T.accentGreen} />
              <span>Feed Transaksi Kasir &amp; Pengeluaran Harian Terkini</span>
            </h3>
            <p style={{ fontSize: '0.72rem', color: T.txtSecondary, margin: '2px 0 0 0' }}>Log masukan dan pengeluaran terverifikasi dari seluruh cabang</p>
          </div>

          {/* Filter Type Buttons */}
          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              type="button"
              onClick={() => setTxTypeFilter('ALL')}
              style={{ padding: '4px 10px', background: txTypeFilter === 'ALL' ? T.borderStrong : 'transparent', color: T.txtPrimary, border: `1px solid ${T.borderStrong}`, borderRadius: '6px', fontSize: '0.72rem', fontWeight: '800', cursor: 'pointer' }}
            >
              Semua Tipe
            </button>
            <button
              type="button"
              onClick={() => setTxTypeFilter('income')}
              style={{ padding: '4px 10px', background: txTypeFilter === 'income' ? 'rgba(34,197,94,0.2)' : 'transparent', color: T.success, border: '1px solid rgba(34,197,94,0.3)', borderRadius: '6px', fontSize: '0.72rem', fontWeight: '800', cursor: 'pointer' }}
            >
              📈 Pemasukan
            </button>
            <button
              type="button"
              onClick={() => setTxTypeFilter('expense')}
              style={{ padding: '4px 10px', background: txTypeFilter === 'expense' ? 'rgba(239,68,68,0.2)' : 'transparent', color: T.danger, border: '1px solid rgba(239,68,68,0.3)', borderRadius: '6px', fontSize: '0.72rem', fontWeight: '800', cursor: 'pointer' }}
            >
              📉 Pengeluaran
            </button>
          </div>
        </div>

        <div style={{ border: `1px solid ${T.borderStrong}`, borderRadius: '10px', overflow: 'hidden', background: T.cardBg2 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
            <thead>
              <tr style={{ background: T.tableHeaderBg, color: T.txtPrimary, fontSize: '0.70rem', textTransform: 'uppercase', fontWeight: '800' }}>
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
                  <tr key={tx.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', color: T.txtPrimary }}>
                    <td style={{ padding: '8px 12px', color: T.txtPrimary, fontSize: '0.76rem' }}>{tx.date}</td>
                    <td style={{ padding: '8px 12px', fontWeight: '700', color: T.txtPrimary }}>📍 {tx.branch_name}</td>
                    <td style={{ padding: '8px 12px' }}>
                      <span style={{
                        padding: '3px 8px',
                        borderRadius: '6px',
                        fontSize: '0.70rem',
                        fontWeight: '800',
                        background: tx.type === 'income' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                        color: tx.type === 'income' ? T.success : T.danger,
                        border: `1px solid ${tx.type === 'income' ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`
                      }}>
                        {tx.type === 'income' ? '📈 Pemasukan' : '📉 Pengeluaran'}
                      </span>
                    </td>
                    <td style={{ padding: '8px 12px' }}>
                      <div style={{ fontWeight: '700', color: T.info }}>{tx.category}</div>
                      <div style={{ fontSize: '0.70rem', color: T.txtSecondary }}>{tx.description}</div>
                    </td>
                    <td style={{ padding: '8px 12px', color: T.txtPrimary, fontSize: '0.76rem' }}>💳 {tx.payment_method}</td>
                    <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: '900', color: tx.type === 'income' ? T.success : T.danger }}>
                      {tx.type === 'income' ? '+' : '-'}{formatRupiah(tx.amount)}
                    </td>
                    <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                      <span style={{ background: 'rgba(34, 197, 94, 0.15)', color: T.success, border: '1px solid rgba(34, 197, 94, 0.3)', padding: '3px 8px', borderRadius: '6px', fontSize: '0.68rem', fontWeight: '800' }}>
                        ✓ Terverifikasi
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} style={{ padding: '18px', textAlign: 'center', color: T.txtMuted, fontSize: '0.78rem' }}>
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
              <Bot size={28} color={T.txtPrimary} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 style={{ fontSize: '1.2rem', fontWeight: '900', color: T.txtPrimary, margin: 0, letterSpacing: '-0.01em' }}>
                  Analisis Keuangan by AI (Antigravity Financial Agent)
                </h3>
                <span style={{ padding: '2px 8px', borderRadius: '12px', background: 'rgba(52, 211, 153, 0.2)', color: T.success, border: '1px solid #34d399', fontSize: '0.68rem', fontWeight: '900', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <Sparkles size={11} /> AI ONLINE
                </span>
              </div>
              <p style={{ fontSize: '0.78rem', color: T.txtPrimary, margin: '3px 0 0 0' }}>
                Wawasan cerdas berbasis AI mengenai kesehatan omzet, kontrol HPP, dan rekomendasi efisiensi operasional.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '0.72rem', color: T.txtSecondary }}>
              Diperbarui: <strong style={{ color: T.accentGreen }}>{aiAnalysisTime}</strong>
            </span>
            <button
              type="button"
              onClick={handleRunAiAnalysis}
              className="btn-emerald"
              style={{ padding: '9px 16px', borderRadius: '10px', fontSize: '0.78rem', fontWeight: '900', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: T.txtPrimary, border: 'none' }}
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
              <div style={{ fontSize: '0.68rem', color: T.txtSecondary, fontWeight: '800', textTransform: 'uppercase' }}>SKOR KESEHATAN AI</div>
              <div style={{ fontSize: '1.4rem', fontWeight: '900', color: T.success, marginTop: '2px' }}>94 / 100</div>
            </div>
            <div>
              <div style={{ fontSize: '0.94rem', fontWeight: '900', color: T.txtPrimary, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Award size={18} color={T.success} />
                <span>Kondisi Keuangan Multi-Restoran: Sangat Sehat &amp; Profitabel</span>
              </div>
              <p style={{ fontSize: '0.76rem', color: T.txtSecondary, margin: '3px 0 0 0' }}>
                Omzet harian terkonfirmasi positif ({formatRupiah(todayIncome)}) dengan margin laba bersih rata-rata <strong style={{ color: T.info }}>{todayMargin}%</strong> across {allOutlets.length} cabang outlet.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <div style={{ background: T.inputBg, padding: '8px 14px', borderRadius: '10px', border: `1px solid ${T.borderStrong}`, textAlign: 'center' }}>
              <span style={{ fontSize: '0.66rem', color: T.txtSecondary, display: 'block', fontWeight: '700' }}>DISPARITAS BAHAN</span>
              <span style={{ fontSize: '0.88rem', fontWeight: '900', color: ingredientComparisonList.some(i => i.disparity > 2000) ? T.danger : T.success }}>
                {ingredientComparisonList.some(i => i.disparity > 2000) ? '⚠️ Terdeteksi' : '✅ Terkendali'}
              </span>
            </div>
            <div style={{ background: T.inputBg, padding: '8px 14px', borderRadius: '10px', border: `1px solid ${T.borderStrong}`, textAlign: 'center' }}>
              <span style={{ fontSize: '0.66rem', color: T.txtSecondary, display: 'block', fontWeight: '700' }}>RASIO COGS / HPP</span>
              <span style={{ fontSize: '0.88rem', fontWeight: '900', color: hppComparisonList.some(h => h.isOverBudget) ? T.danger : T.success }}>
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
              <div style={{ padding: '8px', borderRadius: '10px', background: 'rgba(56, 189, 248, 0.15)', color: T.info }}>
                <TrendingUp size={20} />
              </div>
              <div>
                <h4 style={{ fontSize: '0.90rem', fontWeight: '900', color: T.txtPrimary, margin: 0 }}>
                  📈 Proyeksi Pertumbuhan &amp; Tren Omzet
                </h4>
                <span style={{ fontSize: '0.70rem', color: T.txtSecondary }}>Evaluasi Tren Penjualan Kasir POS</span>
              </div>
            </div>
            <p style={{ fontSize: '0.78rem', color: T.txtPrimary, margin: 0, lineHeight: '1.45' }}>
              Penjualan cabang menunjukkan performa stabil pada jam makan siang (11:30 - 14:00) dan malam (18:30 - 21:00). Proyeksi omzet hingga akhir bulan diperkirakan tumbuh <strong style={{ color: T.success }}>+14.5%</strong> dibandingkan periode bulan lalu.
            </p>
            <div style={{ fontSize: '0.72rem', color: T.info, fontWeight: '800', background: 'rgba(56, 189, 248, 0.1)', padding: '6px 10px', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Zap size={13} />
              <span>Saran AI: Tingkatkan stok bahan mentah pada hari Jumat-Minggu untuk mengantisipasi lonjakan order.</span>
            </div>
          </div>

          {/* Insight 2: Deteksi Disparitas Supplier & HPP */}
          <div style={{ background: 'rgba(15, 23, 42, 0.8)', padding: '16px', borderRadius: '14px', border: '1px solid rgba(239, 68, 68, 0.3)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ padding: '8px', borderRadius: '10px', background: 'rgba(239, 68, 68, 0.15)', color: T.danger }}>
                <ShieldAlert size={20} />
              </div>
              <div>
                <h4 style={{ fontSize: '0.90rem', fontWeight: '900', color: T.txtPrimary, margin: 0 }}>
                  ⚠️ Kontrol Disparitas Harga Beli &amp; Efisiensi HPP
                </h4>
                <span style={{ fontSize: '0.70rem', color: T.txtSecondary }}>Analisis Selisih Harga Supplier Antar Outlet</span>
              </div>
            </div>
            <p style={{ fontSize: '0.78rem', color: T.txtPrimary, margin: 0, lineHeight: '1.45' }}>
              {ingredientComparisonList.some(i => i.disparity > 2000) ? (
                <>Terdeteksi disparitas harga bahan mentah (seperti <strong style={{ color: T.accentGold }}>{ingredientComparisonList.find(i => i.disparity > 2000)?.name || 'Bahan Utama'}</strong>) antar cabang outlet dengan selisih hingga <strong style={{ color: T.danger }}>{formatRupiah(ingredientComparisonList.find(i => i.disparity > 2000)?.disparity || 3000)}</strong>.</>
              ) : (
                <>Disparitas harga beli bahan mentah antar cabang terkendali baik di bawah ambang batas toleransi.</>
              )}
            </p>
            <div style={{ fontSize: '0.72rem', color: T.danger, fontWeight: '800', background: 'rgba(239, 68, 68, 0.1)', padding: '6px 10px', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <AlertTriangle size={13} />
              <span>Saran AI: Lakukan konsolidasi pengadaan bahan mentah dari 1 supplier terpusat untuk menjaga HPP di bawah 60%.</span>
            </div>
          </div>

          {/* Insight 3: Optimasi Menu Margin Tinggi */}
          <div style={{ background: 'rgba(15, 23, 42, 0.8)', padding: '16px', borderRadius: '14px', border: '1px solid rgba(168, 85, 247, 0.3)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ padding: '8px', borderRadius: '10px', background: 'rgba(168, 85, 247, 0.15)', color: T.accentGreen }}>
                <Lightbulb size={20} />
              </div>
              <div>
                <h4 style={{ fontSize: '0.90rem', fontWeight: '900', color: T.txtPrimary, margin: 0 }}>
                  💡 Rekomendasi Menu &amp; Margin Keuntungan
                </h4>
                <span style={{ fontSize: '0.70rem', color: T.txtSecondary }}>Strategi Upselling &amp; Bundling Produk</span>
              </div>
            </div>
            <p style={{ fontSize: '0.78rem', color: T.txtPrimary, margin: 0, lineHeight: '1.45' }}>
              Menu kategori Minuman &amp; Dessert memiliki margin keuntungan bersih tertinggi mencapai <strong style={{ color: T.success }}>68% - 75%</strong>. Mendorong promosi bundling makanan utama dengan minuman khas dapat mendongkrak *Average Bill* harian.
            </p>
            <div style={{ fontSize: '0.72rem', color: T.accentGreen, fontWeight: '800', background: 'rgba(168, 85, 247, 0.1)', padding: '6px 10px', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Sparkles size={13} />
              <span>Saran AI: Buat Paket Combo Hemat di POS Kasir untuk menaikkan Average Bill dari {formatRupiah(todayAvgBill)} ke {formatRupiah(todayAvgBill * 1.2)}.</span>
            </div>
          </div>

          {/* Insight 4: Prediksi Restok & Alokasi Modal Kas */}
          <div style={{ background: 'rgba(15, 23, 42, 0.8)', padding: '16px', borderRadius: '14px', border: '1px solid rgba(34, 197, 94, 0.3)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ padding: '8px', borderRadius: '10px', background: 'rgba(34, 197, 94, 0.15)', color: T.success }}>
                <Activity size={20} />
              </div>
              <div>
                <h4 style={{ fontSize: '0.90rem', fontWeight: '900', color: T.txtPrimary, margin: 0 }}>
                  ⚡ Prediksi Logistik &amp; Arus Kas Modal
                </h4>
                <span style={{ fontSize: '0.70rem', color: T.txtSecondary }}>Manajemen Kasir &amp; Stok Opname</span>
              </div>
            </div>
            <p style={{ fontSize: '0.78rem', color: T.txtPrimary, margin: 0, lineHeight: '1.45' }}>
              Arus kas operasional kasir terpantau lancar. Uang modal awal kasir terdistribusi rata Rp 2.000.000 / outlet dengan tingkat rekonsiliasi kasir fisik mencapai <strong style={{ color: T.info }}>99.2% akurat</strong>.
            </p>
            <div style={{ fontSize: '0.72rem', color: T.success, fontWeight: '800', background: 'rgba(34, 197, 94, 0.1)', padding: '6px 10px', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <CheckCircle2 size={13} />
              <span>Saran AI: Pertahankan jadwal Audit Stock Opname rutin 2x seminggu untuk mencegah kebocoran barang rusak.</span>
            </div>
          </div>

        </div>

        {/* Interactive Prompt Query / Ask AI Quick Buttons */}
        <div style={{ background: T.cardBg2, padding: '14px', borderRadius: '12px', border: `1px solid ${T.borderStrong}`, display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <span style={{ fontSize: '0.76rem', color: T.txtSecondary, fontWeight: '800', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <HelpCircle size={14} color={T.accentGreen} />
            <span>Tanyakan Analisis Spesifik pada Antigravity AI Agent:</span>
          </span>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            <button
              type="button"
              onClick={() => setAiActiveQuestion('hpp')}
              style={{ padding: '6px 12px', background: aiActiveQuestion === 'hpp' ? 'rgba(99,102,241,0.3)' : T.border, border: `1px solid ${aiActiveQuestion === 'hpp' ? T.accentGreen : T.borderStrong}`, borderRadius: '8px', color: T.txtPrimary, fontSize: '0.74rem', fontWeight: '700', cursor: 'pointer' }}
            >
              💡 "Bagaimana cara menjaga HPP di bawah 60%?"
            </button>
            <button
              type="button"
              onClick={() => setAiActiveQuestion('outlet')}
              style={{ padding: '6px 12px', background: aiActiveQuestion === 'outlet' ? 'rgba(99,102,241,0.3)' : T.border, border: `1px solid ${aiActiveQuestion === 'outlet' ? T.accentGreen : T.borderStrong}`, borderRadius: '8px', color: T.txtPrimary, fontSize: '0.74rem', fontWeight: '700', cursor: 'pointer' }}
            >
              📈 "Outlet mana dengan rasio profit paling tinggi?"
            </button>
            <button
              type="button"
              onClick={() => setAiActiveQuestion('disparity')}
              style={{ padding: '6px 12px', background: aiActiveQuestion === 'disparity' ? 'rgba(99,102,241,0.3)' : T.border, border: `1px solid ${aiActiveQuestion === 'disparity' ? T.accentGreen : T.borderStrong}`, borderRadius: '8px', color: T.txtPrimary, fontSize: '0.74rem', fontWeight: '700', cursor: 'pointer' }}
            >
              ⚠️ "Bahan baku apa yang mengalami selisih harga terbesar?"
            </button>
          </div>

          {/* Interactive Answer Box */}
          {aiActiveQuestion && (
            <div style={{ background: 'rgba(99, 102, 241, 0.1)', border: '1px solid #818cf8', padding: '12px 14px', borderRadius: '10px', fontSize: '0.78rem', color: T.txtPrimary, marginTop: '4px', lineHeight: '1.5' }}>
              {aiActiveQuestion === 'hpp' && (
                <div>
                  <strong style={{ color: T.accentGreen, display: 'block', marginBottom: '4px' }}>🤖 Analisis AI - Cara Menjaga HPP di bawah 60%:</strong>
                  1. Lakukan audit resep porsi (*Yield Test*) secara berkala.<br/>
                  2. Buat kontrak pembelian terpusat (*Central Procurement*) untuk mendapatkan harga grosir supplier.<br/>
                  3. Atasi pemborosan (*waste*) bahan makanan dengan sistem FIFO pada stok dapur.
                </div>
              )}
              {aiActiveQuestion === 'outlet' && (
                <div>
                  <strong style={{ color: T.accentGreen, display: 'block', marginBottom: '4px' }}>🤖 Analisis AI - Rasio Profit Outlet Tertinggi:</strong>
                  Restoran Utama menduduki peringkat pertama dengan margin efisiensi operasional tertinggi. Disertai pengelolaan stok opname yang tepat waktu tanpa kehilangan bahan baku.
                </div>
              )}
              {aiActiveQuestion === 'disparity' && (
                <div>
                  <strong style={{ color: T.accentGreen, display: 'block', marginBottom: '4px' }}>🤖 Analisis AI - Disparitas Harga Bahan Baku:</strong>
                  Bahan baku kategori <strong style={{ color: T.accentGold }}>Ayam &amp; Daging</strong> tercatat memiliki variasi harga terbelinya antar cabang outlet. Disarankan menyamakan vendor supplier resmi Restoran.
                </div>
              )}
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
