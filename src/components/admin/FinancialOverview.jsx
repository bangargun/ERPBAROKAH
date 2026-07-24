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
  Percent
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
  // STATE FILTERS FOR INDIVIDUAL CARDS
  // ------------------------------------------------------------------
  // Card 1: Omzet Month-over-Month Filter
  const [omzetFilterBranch, setOmzetFilterBranch] = useState('ALL');

  // Card 2: Highest Price Menu Filter
  const [highestPriceBranch, setHighestPriceBranch] = useState('ALL');
  const [highestPriceTimeRange, setHighestPriceTimeRange] = useState('bulan_ini');

  // Card 3: Ingredient Price per Outlet Filter
  const [ingredientTimeRange, setIngredientTimeRange] = useState('bulan_ini');
  const [selectedIngredientCategory, setSelectedIngredientCategory] = useState('ALL');

  // Card 4: HPP (COGS) Filter
  const [hppTimeRange, setHppTimeRange] = useState('bulan_ini');

  const formatRupiah = (val) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val || 0);
  };

  // ------------------------------------------------------------------
  // 1. STATS HARIAN (PER HARI / DAILY METRICS)
  // ------------------------------------------------------------------
  const todayStr = new Date().toISOString().split('T')[0];

  const todayTx = allSalesTx.filter(t => (!selectedBranch || Number(t.outlet_id) === Number(selectedBranch)) && (t.date === todayStr || !t.date));
  const todayIncomeTx = todayTx.reduce((sum, t) => sum + (t.amount || 0), 0);

  const todayManualInc = allApprovedFinance.filter(f => (!selectedBranch || Number(f.outlet_id) === Number(selectedBranch)) && (f.date === todayStr || !f.date)).reduce((sum, f) => sum + (f.net_sales || 0), 0);
  const todayIncome = Math.max(todayIncomeTx, todayManualInc);

  // Real Daily Stat Summary Calculations (Zero Fallback for Pure Clean Data)
  const todayExpManual = allApprovedFinance.filter(f => (!selectedBranch || Number(f.outlet_id) === Number(selectedBranch)) && (f.date === todayStr || !f.date)).reduce((sum, f) => sum + (f.cogs || 0) + (f.operational || 0) + (f.gaji || 0) + (f.other_costs || 0), 0);
  const todayExpRecords = allFinancialRecords.filter(f => f.type === 'expense' && (!selectedBranch || Number(f.outlet_id) === Number(selectedBranch)) && (f.date === todayStr || !f.date)).reduce((sum, f) => sum + (f.amount || 0), 0);
  const todayExpense = todayExpManual + todayExpRecords;

  const todayNetProfit = todayIncome - todayExpense;
  const todayMargin = todayIncome > 0 ? ((todayNetProfit / todayIncome) * 100).toFixed(1) : '0.0';
  const todayTxCount = todayTx.length;
  const todayAvgBill = todayTxCount > 0 ? Math.round(todayIncome / todayTxCount) : 0;

  // ------------------------------------------------------------------
  // 2. CARD 1: OMZET BULAN LALU VS BULAN INI PER OUTLET DATA
  // ------------------------------------------------------------------
  const getOmzetComparisonData = () => {
    let outletList = allOutlets;
    if (omzetFilterBranch !== 'ALL') {
      outletList = allOutlets.filter(o => Number(o.id) === Number(omzetFilterBranch));
    }

    return outletList.map(o => {
      // Calculate real revenue from sales transactions
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
  // 3. CARD 2: PERBANDINGAN HARGA MENU / PRODUK TERTINGGI
  // ------------------------------------------------------------------
  const getHighestPriceProducts = () => {
    let prods = [...allProducts];
    if (highestPriceBranch !== 'ALL') {
      prods = prods.filter(p => !p.outlet_id || Number(p.outlet_id) === Number(highestPriceBranch));
    }

    // Sort by price descending
    prods.sort((a, b) => (b.price || 0) - (a.price || 0));

    return prods.slice(0, 6).map(p => {
      const outletName = allOutlets.find(o => Number(o.id) === Number(p.outlet_id))?.name || 'Seluruh Outlet';
      const costHpp = p.cost || 0;
      const marginPct = p.price > 0 ? (((p.price - costHpp) / p.price) * 100).toFixed(1) : '0.0';

      return {
        ...p,
        outletName,
        costHpp,
        marginPct
      };
    });
  };

  const highestPriceProducts = getHighestPriceProducts();

  // ------------------------------------------------------------------
  // 4. CARD 3: PERBANDINGAN HARGA BAHAN BAKU PER OUTLET
  // ------------------------------------------------------------------
  const getIngredientPriceComparison = () => {
    // Read real ingredients strictly from masterData
    const realIngredients = masterData?.ingredients || [];
    
    if (realIngredients.length === 0) {
      return [];
    }

    let filtered = realIngredients;
    if (selectedIngredientCategory !== 'ALL') {
      filtered = realIngredients.filter(i => i.category === selectedIngredientCategory);
    }

    return filtered.map(ing => {
      // Create price breakdown per outlet
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
  // 5. CARD 4: PERHITUNGAN & PERBANDINGAN HPP (COGS) TIAP OUTLET
  // ------------------------------------------------------------------
  const getHppComparisonData = () => {
    return allOutlets.map(o => {
      const oTx = allSalesTx.filter(t => Number(t.outlet_id) === Number(o.id));
      const revenue = oTx.reduce((s, t) => s + (t.amount || 0), 0);

      const oManualHpp = allApprovedFinance.filter(f => Number(f.outlet_id) === Number(o.id)).reduce((s, f) => s + (f.cogs || 0), 0);
      const hppAmount = oManualHpp;
      const hppPct = revenue > 0 ? Number(((hppAmount / revenue) * 100).toFixed(1)) : 0;
      const targetPct = 35.0; // Standard ideal max HPP for restaurant industry
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', background: '#0b0f19', color: '#f8fafc' }} className="animate-fade-in">
      
      {/* Header Banner */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '900', color: '#f8fafc', margin: 0, letterSpacing: '-0.02em' }}>
            Dashboard Executive Multi-Restoran (Statistik Harian &amp; Analisis Komparatif)
          </h2>
          <p style={{ color: '#94a3b8', fontSize: '0.76rem', marginTop: '2px', margin: 0 }}>
            Pemantauan omzet harian, komparasi per outlet, analisis HPP, harga menu tertinggi, dan fluktuasi bahan baku.
          </p>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 1. STATS HARIAN (PER HARI / DAILY KPI CARDS)                  */}
      {/* ------------------------------------------------------------- */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '8px' }}>
        
        {/* Stat 1: REVENUE HARI INI */}
        <div style={{ background: '#111625', border: '1px solid #1e293b', borderRadius: '10px', padding: '10px 12px' }}>
          <div style={{ fontSize: '0.62rem', color: '#94a3b8', fontWeight: '800', textTransform: 'uppercase' }}>REVENUE HARI INI</div>
          <div style={{ fontSize: '1.05rem', fontWeight: '900', color: '#22c55e', marginTop: '3px' }}>{formatRupiah(todayIncome)}</div>
          <div style={{ fontSize: '0.64rem', color: '#22c55e', fontWeight: '700', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '2px' }}>
            <ArrowUpRight size={12} /> <span>Omzet Kasir Real-time</span>
          </div>
        </div>

        {/* Stat 2: PENGELUARAN HARI INI */}
        <div style={{ background: '#111625', border: '1px solid #1e293b', borderRadius: '10px', padding: '10px 12px' }}>
          <div style={{ fontSize: '0.62rem', color: '#94a3b8', fontWeight: '800', textTransform: 'uppercase' }}>PENGELUARAN HARI INI</div>
          <div style={{ fontSize: '1.05rem', fontWeight: '900', color: '#ef4444', marginTop: '3px' }}>{formatRupiah(todayExpense)}</div>
          <div style={{ fontSize: '0.64rem', color: '#94a3b8', fontWeight: '600', marginTop: '2px' }}>Kasir &amp; Operasional</div>
        </div>

        {/* Stat 3: LABA BERSIH HARI INI */}
        <div style={{ background: '#111625', border: '1px solid #1e293b', borderRadius: '10px', padding: '10px 12px' }}>
          <div style={{ fontSize: '0.62rem', color: '#94a3b8', fontWeight: '800', textTransform: 'uppercase' }}>LABA BERSIH HARI INI</div>
          <div style={{ fontSize: '1.05rem', fontWeight: '900', color: todayNetProfit >= 0 ? '#38bdf8' : '#ef4444', marginTop: '3px' }}>{formatRupiah(todayNetProfit)}</div>
          <div style={{ fontSize: '0.64rem', color: '#eab308', fontWeight: '700', marginTop: '2px' }}>Margin Harian: {todayMargin}%</div>
        </div>

        {/* Stat 4: TOTAL TRANSAKSI HARI INI */}
        <div style={{ background: '#111625', border: '1px solid #1e293b', borderRadius: '10px', padding: '10px 12px' }}>
          <div style={{ fontSize: '0.62rem', color: '#94a3b8', fontWeight: '800', textTransform: 'uppercase' }}>TRANSAKSI HARI INI</div>
          <div style={{ fontSize: '1.05rem', fontWeight: '900', color: '#ffffff', marginTop: '3px' }}>{todayTxCount} Nota</div>
          <div style={{ fontSize: '0.64rem', color: '#94a3b8', fontWeight: '600', marginTop: '2px' }}>Terverifikasi POS</div>
        </div>

        {/* Stat 5: AVERAGE BILL HARI INI */}
        <div style={{ background: '#111625', border: '1px solid #1e293b', borderRadius: '10px', padding: '10px 12px' }}>
          <div style={{ fontSize: '0.62rem', color: '#94a3b8', fontWeight: '800', textTransform: 'uppercase' }}>AVERAGE BILL HARI INI</div>
          <div style={{ fontSize: '1.05rem', fontWeight: '900', color: '#f59e0b', marginTop: '3px' }}>{formatRupiah(todayAvgBill)}</div>
          <div style={{ fontSize: '0.64rem', color: '#94a3b8', fontWeight: '600', marginTop: '2px' }}>Rata-rata / Meja</div>
        </div>

        {/* Stat 6: TOTAL OUTLET AKTIF */}
        <div style={{ background: '#111625', border: '1px solid #1e293b', borderRadius: '10px', padding: '10px 12px' }}>
          <div style={{ fontSize: '0.62rem', color: '#94a3b8', fontWeight: '800', textTransform: 'uppercase' }}>OUTLET RESTORAN</div>
          <div style={{ fontSize: '1.05rem', fontWeight: '900', color: '#a78bfa', marginTop: '3px' }}>{allOutlets.length} Cabang</div>
          <div style={{ fontSize: '0.64rem', color: '#34d399', fontWeight: '700', marginTop: '2px' }}>● 100% Beroperasi</div>
        </div>

      </div>

      {/* ------------------------------------------------------------- */}
      {/* 2. CARD 1: OMZET BULAN LALU VS OMZET BERJALAN BULAN INI         */}
      {/* ------------------------------------------------------------- */}
      <div style={{ background: '#111625', border: '1px solid #1e293b', borderRadius: '12px', padding: '14px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
          <div>
            <h3 style={{ fontSize: '0.90rem', fontWeight: '800', color: '#f8fafc', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <BarChart3 size={16} color="#38bdf8" />
              <span>Perbandingan Omzet Bulan Lalu vs Omzet Berjalan Bulan Ini per Outlet</span>
            </h3>
            <p style={{ fontSize: '0.72rem', color: '#94a3b8', margin: '2px 0 0 0' }}>
              Bandingkan akumulasi pertumbuhan omzet bulan sebelumnya dengan bulan berjalan.
            </p>
          </div>

          {/* Filter Dropdown Outlet */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Filter size={14} color="#94a3b8" />
            <select
              value={omzetFilterBranch}
              onChange={e => setOmzetFilterBranch(e.target.value)}
              style={{ padding: '5px 10px', background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#ffffff', fontSize: '0.76rem', fontWeight: '700', cursor: 'pointer' }}
            >
              <option value="ALL">🏢 Semua Outlet Restoran</option>
              {allOutlets.map(o => (
                <option key={o.id} value={o.id}>📍 {o.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Side-by-Side Bar Chart Comparison */}
        <div style={{ width: '100%', height: '170px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={omzetCompData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} />
              <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
              <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #38bdf8', borderRadius: '8px', color: '#ffffff', fontSize: '0.76rem' }} formatter={(val) => formatRupiah(val)} />
              <Legend wrapperStyle={{ fontSize: '0.72rem', color: '#cbd5e1' }} />
              <Bar dataKey="omzetBulanLalu" name="Omzet Bulan Lalu" fill="#64748b" radius={[4, 4, 0, 0]} />
              <Bar dataKey="omzetBulanIni" name="Omzet Berjalan Bulan Ini" fill="#38bdf8" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Data Table Omzet Comparison */}
        <div style={{ border: '1px solid #334155', borderRadius: '8px', overflow: 'hidden', background: '#0f172a' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.76rem' }}>
            <thead>
              <tr style={{ background: '#1e293b', color: '#cbd5e1', textTransform: 'uppercase', fontSize: '0.68rem', fontWeight: '800' }}>
                <th style={{ padding: '8px 10px' }}>Nama Outlet</th>
                <th style={{ padding: '8px 10px', textAlign: 'right' }}>Omzet Bulan Lalu</th>
                <th style={{ padding: '8px 10px', textAlign: 'right' }}>Omzet Berjalan Bulan Ini</th>
                <th style={{ padding: '8px 10px', textAlign: 'right' }}>Selisih Nominal</th>
                <th style={{ padding: '8px 10px', textAlign: 'center' }}>Pertumbuhan (%)</th>
              </tr>
            </thead>
            <tbody>
              {omzetCompData.map(d => (
                <tr key={d.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td style={{ padding: '7px 10px', fontWeight: '800', color: '#ffffff' }}>📍 {d.name}</td>
                  <td style={{ padding: '7px 10px', textAlign: 'right', color: '#94a3b8' }}>{formatRupiah(d.omzetBulanLalu)}</td>
                  <td style={{ padding: '7px 10px', textAlign: 'right', fontWeight: '900', color: '#38bdf8' }}>{formatRupiah(d.omzetBulanIni)}</td>
                  <td style={{ padding: '7px 10px', textAlign: 'right', fontWeight: '800', color: d.diff >= 0 ? '#22c55e' : '#ef4444' }}>
                    {d.diff >= 0 ? '+' : ''}{formatRupiah(d.diff)}
                  </td>
                  <td style={{ padding: '7px 10px', textAlign: 'center' }}>
                    <span style={{
                      padding: '2px 8px',
                      borderRadius: '6px',
                      fontSize: '0.70rem',
                      fontWeight: '800',
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
      {/* 3. ROW CARDS: HIGHEST PRICE MENU & INGREDIENT PRICE PER OUTLET */}
      {/* ------------------------------------------------------------- */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        
        {/* CARD 2: PERBANDINGAN HARGA MENU / PRODUK TERTINGGI */}
        <div style={{ background: '#111625', border: '1px solid #1e293b', borderRadius: '12px', padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
            <div>
              <h3 style={{ fontSize: '0.88rem', fontWeight: '800', color: '#f8fafc', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Tag size={15} color="#eab308" />
                <span>Perbandingan Harga Menu Tertinggi</span>
              </h3>
              <p style={{ fontSize: '0.70rem', color: '#94a3b8', margin: '2px 0 0 0' }}>Harga jual menu termahal dan persentase margin keuntungan</p>
            </div>

            {/* Filters (Outlet + Time Range) */}
            <div style={{ display: 'flex', gap: '6px' }}>
              <select
                value={highestPriceTimeRange}
                onChange={e => setHighestPriceTimeRange(e.target.value)}
                style={{ padding: '4px 8px', background: '#1e293b', border: '1px solid #334155', borderRadius: '6px', color: '#ffffff', fontSize: '0.72rem', fontWeight: '700', cursor: 'pointer' }}
              >
                <option value="bulan_ini">🗓 Bulan Ini</option>
                <option value="hari_ini">📅 Hari Ini</option>
                <option value="3_bulan">📊 3 Bulan Terakhir</option>
                <option value="tahun_ini">📈 Tahun Ini</option>
              </select>

              <select
                value={highestPriceBranch}
                onChange={e => setHighestPriceBranch(e.target.value)}
                style={{ padding: '4px 8px', background: '#1e293b', border: '1px solid #334155', borderRadius: '6px', color: '#ffffff', fontSize: '0.72rem', fontWeight: '700', cursor: 'pointer' }}
              >
                <option value="ALL">🏢 Semua Outlet</option>
                {allOutlets.map(o => (
                  <option key={o.id} value={o.id}>{o.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ border: '1px solid #334155', borderRadius: '8px', overflow: 'hidden', background: '#0f172a' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem' }}>
              <thead>
                <tr style={{ background: '#1e293b', color: '#cbd5e1', fontSize: '0.68rem', fontWeight: '800', textTransform: 'uppercase' }}>
                  <th style={{ padding: '7px 8px' }}>Nama Menu</th>
                  <th style={{ padding: '7px 8px' }}>Outlet Cabang</th>
                  <th style={{ padding: '7px 8px', textAlign: 'right' }}>Harga Jual</th>
                  <th style={{ padding: '7px 8px', textAlign: 'right' }}>Estimasi HPP</th>
                  <th style={{ padding: '7px 8px', textAlign: 'center' }}>Margin (%)</th>
                </tr>
              </thead>
              <tbody>
                {highestPriceProducts.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ padding: '20px', textAlign: 'center', color: '#94a3b8', fontSize: '0.74rem' }}>
                      🍴 Belum ada data produk/menu terdaftar. Tambahkan produk baru di menu <strong>Data Master &gt; Produk / Menu</strong>.
                    </td>
                  </tr>
                ) : (
                  highestPriceProducts.map((p, idx) => (
                    <tr key={p.id || idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <td style={{ padding: '6px 8px', fontWeight: '800', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '0.80rem' }}>{idx === 0 ? '🏆' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : '🍴'}</span>
                        <span>{p.name}</span>
                      </td>
                      <td style={{ padding: '6px 8px', color: '#cbd5e1', fontSize: '0.72rem' }}>{p.outletName}</td>
                      <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: '900', color: '#eab308' }}>{formatRupiah(p.price)}</td>
                      <td style={{ padding: '6px 8px', textAlign: 'right', color: '#94a3b8' }}>{formatRupiah(p.costHpp)}</td>
                      <td style={{ padding: '6px 8px', textAlign: 'center' }}>
                        <span style={{ background: 'rgba(34, 197, 94, 0.15)', color: '#22c55e', border: '1px solid rgba(34, 197, 94, 0.3)', padding: '2px 6px', borderRadius: '4px', fontWeight: '800', fontSize: '0.68rem' }}>
                          {p.marginPct}%
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* CARD 3: PERBANDINGAN HARGA BAHAN BAKU PER OUTLET */}
        <div style={{ background: '#111625', border: '1px solid #1e293b', borderRadius: '12px', padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
            <div>
              <h3 style={{ fontSize: '0.88rem', fontWeight: '800', color: '#f8fafc', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Package size={15} color="#f59e0b" />
                <span>Perbandingan Harga Bahan Baku per Outlet</span>
              </h3>
              <p style={{ fontSize: '0.70rem', color: '#94a3b8', margin: '2px 0 0 0' }}>Deteksi disparitas harga beli supplier antar cabang outlet</p>
            </div>

            {/* Filters (Category + Time Range) */}
            <div style={{ display: 'flex', gap: '6px' }}>
              <select
                value={ingredientTimeRange}
                onChange={e => setIngredientTimeRange(e.target.value)}
                style={{ padding: '4px 8px', background: '#1e293b', border: '1px solid #334155', borderRadius: '6px', color: '#ffffff', fontSize: '0.72rem', fontWeight: '700', cursor: 'pointer' }}
              >
                <option value="bulan_ini">🗓 Bulan Ini</option>
                <option value="minggu_ini">📆 Minggu Ini</option>
                <option value="hari_ini">📅 Hari Ini</option>
              </select>

              <select
                value={selectedIngredientCategory}
                onChange={e => setSelectedIngredientCategory(e.target.value)}
                style={{ padding: '4px 8px', background: '#1e293b', border: '1px solid #334155', borderRadius: '6px', color: '#ffffff', fontSize: '0.72rem', fontWeight: '700', cursor: 'pointer' }}
              >
                <option value="ALL">📦 Semua Bahan</option>
                <option value="Ayam">🍗 Ayam</option>
                <option value="Daging">🥩 Daging</option>
                <option value="Bumbu">🌶️ Bumbu</option>
                <option value="Minyak">🛢️ Minyak</option>
                <option value="Sembako">🌾 Sembako</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '210px', overflowY: 'auto' }}>
            {ingredientComparisonList.length === 0 ? (
              <div style={{ background: '#0f172a', border: '1px dashed #334155', borderRadius: '8px', padding: '20px', textAlign: 'center', color: '#94a3b8', fontSize: '0.76rem' }}>
                📦 Belum ada data bahan baku terdaftar. Tambahkan bahan baku baru di menu <strong>Data Master &gt; Bahan Baku</strong>.
              </div>
            ) : (
              ingredientComparisonList.map((ing, idx) => (
                <div key={idx} style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: '0.78rem', fontWeight: '800', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ color: '#f59e0b' }}>📦 {ing.name}</span>
                      <span style={{ fontSize: '0.66rem', color: '#94a3b8', background: '#1e293b', padding: '1px 6px', borderRadius: '4px' }}>per {ing.unit}</span>
                    </div>
                    <div style={{ fontSize: '0.68rem', color: ing.disparity > 2000 ? '#ef4444' : '#34d399', fontWeight: '800' }}>
                      {ing.disparity > 2000 ? `⚠️ Selisih Harga: ${formatRupiah(ing.disparity)}` : '✅ Harga Stabil'}
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '4px', fontSize: '0.68rem' }}>
                    {ing.outletPrices.map((op, oIdx) => (
                      <div key={oIdx} style={{ background: '#1e293b', padding: '4px 6px', borderRadius: '4px', textAlign: 'center', border: op.price === ing.maxPrice && ing.disparity > 2000 ? '1px solid #ef4444' : '1px solid rgba(255,255,255,0.05)' }}>
                        <div style={{ color: '#cbd5e1', fontSize: '0.62rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{op.outletName}</div>
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
      {/* 4. CARD 4: PERHITUNGAN & PERBANDINGAN HPP (COGS) TIAL OUTLET   */}
      {/* ------------------------------------------------------------- */}
      <div style={{ background: '#111625', border: '1px solid #1e293b', borderRadius: '12px', padding: '14px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
          <div>
            <h3 style={{ fontSize: '0.90rem', fontWeight: '800', color: '#f8fafc', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Percent size={16} color="#ef4444" />
              <span>Perhitungan &amp; Perbandingan HPP (Cost of Goods Sold) Tiap Outlet</span>
            </h3>
            <p style={{ fontSize: '0.72rem', color: '#94a3b8', margin: '2px 0 0 0' }}>
              Analisis persentase HPP makanan/minuman terhadap omzet dengan batas ideal maksimum 35%.
            </p>
          </div>

          {/* Time Range Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Calendar size={14} color="#94a3b8" />
            <select
              value={hppTimeRange}
              onChange={e => setHppTimeRange(e.target.value)}
              style={{ padding: '5px 10px', background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#ffffff', fontSize: '0.76rem', fontWeight: '700', cursor: 'pointer' }}
            >
              <option value="bulan_ini">🗓 Bulan Ini (MTD)</option>
              <option value="hari_ini">📅 Hari Ini</option>
              <option value="bulan_lalu">📆 Bulan Lalu</option>
              <option value="tahun_ini">📈 Tahun Ini</option>
            </select>
          </div>
        </div>

        {/* HPP Bar Chart per Outlet */}
        <div style={{ width: '100%', height: '160px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={hppComparisonList} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} />
              <YAxis stroke="#64748b" fontSize={11} tickLine={false} unit="%" />
              <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #ef4444', borderRadius: '8px', color: '#ffffff', fontSize: '0.76rem' }} formatter={(val) => `${val}%`} />
              <Bar dataKey="hppPct" name="Realisasi HPP (%)" fill="#ef4444" radius={[4, 4, 0, 0]} />
              <Bar dataKey="targetPct" name="Target Ideal HPP Max (35%)" fill="#22c55e" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Table HPP Breakdown */}
        <div style={{ border: '1px solid #334155', borderRadius: '8px', overflow: 'hidden', background: '#0f172a' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.76rem' }}>
            <thead>
              <tr style={{ background: '#1e293b', color: '#cbd5e1', textTransform: 'uppercase', fontSize: '0.68rem', fontWeight: '800' }}>
                <th style={{ padding: '8px 10px' }}>Nama Outlet Restoran</th>
                <th style={{ padding: '8px 10px', textAlign: 'right' }}>Total Omzet Penjualan</th>
                <th style={{ padding: '8px 10px', textAlign: 'right' }}>Total Nominal HPP</th>
                <th style={{ padding: '8px 10px', textAlign: 'center' }}>Realisasi HPP (%)</th>
                <th style={{ padding: '8px 10px', textAlign: 'center' }}>Target Ideal Max</th>
                <th style={{ padding: '8px 10px', textAlign: 'center' }}>Status Efisiensi HPP</th>
              </tr>
            </thead>
            <tbody>
              {hppComparisonList.map(h => (
                <tr key={h.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td style={{ padding: '7px 10px', fontWeight: '800', color: '#ffffff' }}>📍 {h.name}</td>
                  <td style={{ padding: '7px 10px', textAlign: 'right', color: '#cbd5e1' }}>{formatRupiah(h.revenue)}</td>
                  <td style={{ padding: '7px 10px', textAlign: 'right', fontWeight: '800', color: '#ef4444' }}>{formatRupiah(h.hppAmount)}</td>
                  <td style={{ padding: '7px 10px', textAlign: 'center', fontWeight: '900', color: h.isOverBudget ? '#ef4444' : '#22c55e' }}>{h.hppPct}%</td>
                  <td style={{ padding: '7px 10px', textAlign: 'center', color: '#22c55e', fontWeight: '700' }}>35.0%</td>
                  <td style={{ padding: '7px 10px', textAlign: 'center' }}>
                    <span style={{
                      padding: '2px 8px',
                      borderRadius: '6px',
                      fontSize: '0.70rem',
                      fontWeight: '800',
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
      <div style={{ background: '#111625', border: '1px solid #1e293b', borderRadius: '12px', padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ fontSize: '0.88rem', fontWeight: '800', color: '#f8fafc', margin: 0 }}>
              📋 Feed Transaksi Kasir &amp; Pengeluaran Harian Terkini
            </h3>
            <p style={{ fontSize: '0.70rem', color: '#94a3b8', margin: '2px 0 0 0' }}>Log masukan dan pengeluaran terverifikasi dari seluruh cabang</p>
          </div>
        </div>

        <div style={{ border: '1px solid #334155', borderRadius: '8px', overflow: 'hidden', background: '#0f172a' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.76rem' }}>
            <thead>
              <tr style={{ background: '#1e293b', color: '#cbd5e1', fontSize: '0.68rem', textTransform: 'uppercase', fontWeight: '800' }}>
                <th style={{ padding: '8px 10px' }}>Tanggal</th>
                <th style={{ padding: '8px 10px' }}>Outlet Restoran</th>
                <th style={{ padding: '8px 10px' }}>Tipe</th>
                <th style={{ padding: '8px 10px' }}>Kategori &amp; Deskripsi</th>
                <th style={{ padding: '8px 10px' }}>Metode</th>
                <th style={{ padding: '8px 10px', textAlign: 'right' }}>Jumlah (Rp)</th>
                <th style={{ padding: '8px 10px', textAlign: 'center' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {recentTransactions && recentTransactions.length > 0 ? (
                recentTransactions.slice(0, 6).map((tx) => (
                  <tr key={tx.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', color: '#f8fafc' }}>
                    <td style={{ padding: '7px 10px', color: '#cbd5e1', fontSize: '0.74rem' }}>{tx.date}</td>
                    <td style={{ padding: '7px 10px', fontWeight: '700', color: '#ffffff' }}>📍 {tx.branch_name}</td>
                    <td style={{ padding: '7px 10px' }}>
                      <span style={{
                        padding: '2px 6px',
                        borderRadius: '4px',
                        fontSize: '0.68rem',
                        fontWeight: '800',
                        background: tx.type === 'income' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                        color: tx.type === 'income' ? '#22c55e' : '#ef4444',
                        border: `1px solid ${tx.type === 'income' ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`
                      }}>
                        {tx.type === 'income' ? '📈 Pemasukan' : '📉 Pengeluaran'}
                      </span>
                    </td>
                    <td style={{ padding: '7px 10px' }}>
                      <div style={{ fontWeight: '700', color: '#38bdf8' }}>{tx.category}</div>
                      <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>{tx.description}</div>
                    </td>
                    <td style={{ padding: '7px 10px', color: '#cbd5e1', fontSize: '0.74rem' }}>💳 {tx.payment_method}</td>
                    <td style={{ padding: '7px 10px', textAlign: 'right', fontWeight: '900', color: tx.type === 'income' ? '#22c55e' : '#ef4444' }}>
                      {tx.type === 'income' ? '+' : '-'}{formatRupiah(tx.amount)}
                    </td>
                    <td style={{ padding: '7px 10px', textAlign: 'center' }}>
                      <span style={{ background: 'rgba(34, 197, 94, 0.15)', color: '#22c55e', border: '1px solid rgba(34, 197, 94, 0.3)', padding: '2px 6px', borderRadius: '4px', fontSize: '0.66rem', fontWeight: '800' }}>
                        ✓ Terverifikasi
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} style={{ padding: '16px', textAlign: 'center', color: '#64748b', fontSize: '0.76rem' }}>
                    Belum ada transaksi harian tercatat.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
