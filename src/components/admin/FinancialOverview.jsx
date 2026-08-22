import React, { useState, useEffect, useMemo } from 'react';
import DashboardAIInsightModal from './DashboardAIInsightModal';
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
  RefreshCw,
  Award,
  Receipt,
  Utensils,
  Store,
  ChevronRight,
  AlertCircle,
  ShieldAlert,
  ShieldCheck,
  Search,
  Banknote,
  Target,
  XCircle,
  LayoutGrid,
  List,
  X
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
  Legend,
  Cell,
  ReferenceLine,
  Line
} from 'recharts';
import { getThemePalette } from '../../utils/themeUtils';

export default function FinancialOverview({ 
  stats, 
  chartData, 
  recentTransactions, 
  outlets, 
  selectedBranch, 
  masterData, 
  themeMode = 'dark' 
}) {
  const T = getThemePalette(themeMode);
  const isLight = themeMode === 'soft_blue' || themeMode === 'light';

  // Master Data Entities
  const allOutlets = outlets || masterData?.outlets || [];
  const allProducts = masterData?.products || [];
  const allIngredients = masterData?.ingredients || [];

  // Deleted records guard to maintain data integrity
  const deletedSalesSet = useMemo(() => new Set([
    ...(masterData?.deletedSalesIds || []),
    ...(masterData?.deletedReportIds || []),
    ...(masterData?.deleted_report_nos || [])
  ].map(x => String(x))), [masterData?.deletedSalesIds, masterData?.deletedReportIds, masterData?.deleted_report_nos]);

  // Clean Sales Transactions
  const allSalesTx = useMemo(() => {
    return (masterData?.salesTransactions || []).filter(t => {
      if (!t) return false;
      const tid = String(t.id || '');
      const trcpt = String(t.receipt_no || t.receiptNo || '');
      if (tid && deletedSalesSet.has(tid)) return false;
      if (trcpt && deletedSalesSet.has(trcpt)) return false;
      return true;
    });
  }, [masterData?.salesTransactions, deletedSalesSet]);

  // Clean Approved Daily Reports
  const allApprovedFinance = useMemo(() => {
    return (masterData?.approvedFinanceDaily || []).filter(f => {
      if (!f) return false;
      const fid = String(f.id || '');
      const frpt = String(f.report_no || f.reportNo || '');
      if (fid && deletedSalesSet.has(fid)) return false;
      if (frpt && deletedSalesSet.has(frpt)) return false;
      return true;
    });
  }, [masterData?.approvedFinanceDaily, deletedSalesSet]);

  // Clean Financial Records (Expenses & Incomes)
  const allFinancialRecords = useMemo(() => {
    return (masterData?.financialRecords || []).filter(f => {
      if (!f) return false;
      const fid = String(f.id || '');
      if (fid && deletedSalesSet.has(fid)) return false;
      return true;
    });
  }, [masterData?.financialRecords, deletedSalesSet]);

  // ------------------------------------------------------------------
  // INTERACTIVE FILTER STATES
  // ------------------------------------------------------------------
  const [activeOutletFilter, setActiveOutletFilter] = useState(selectedBranch || 'ALL');

  // Auto-sync activeOutletFilter with selectedBranch from header
  useEffect(() => {
    if (selectedBranch && selectedBranch !== 'ALL' && selectedBranch !== 'Semua Restoran (Konsolidasi)') {
      setActiveOutletFilter(String(selectedBranch));
    } else {
      setActiveOutletFilter('ALL');
    }
  }, [selectedBranch]);

  const [dateRangePreset, setDateRangePreset] = useState('7days'); // 'today', 'yesterday', '7days', '30days', 'this_month', 'custom'
  const [dataSourceMode, setDataSourceMode] = useState('auto'); // 'auto' | 'pos_only' | 'manual_only'
  const [customStartDate, setCustomStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 6);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
  const [customEndDate, setCustomEndDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
  const [salesChartType, setSalesChartType] = useState('area'); // 'area' | 'bar'
  const [omzetChartType, setOmzetChartType] = useState('bar'); // 'bar' | 'area'
  const [selectedIngredientCategory, setSelectedIngredientCategory] = useState('ALL');
  const [disparityViewMode, setDisparityViewMode] = useState('table'); // 'table' | 'cards'
  const [disparitySearchTerm, setDisparitySearchTerm] = useState('');
  const [disparityDatePreset, setDisparityDatePreset] = useState('7days');
  const [disparityCustomStartDate, setDisparityCustomStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 6);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
  const [disparityCustomEndDate, setDisparityCustomEndDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
  const [isAnalyzingAI, setIsAnalyzingAI] = useState(false);
  const [aiLastUpdated, setAiLastUpdated] = useState('Baru saja (Real-time)');
  const [showAIModal, setShowAIModal] = useState(false);
  const [aiModalTab, setAiModalTab] = useState('summary');

  // Currency Formatter
  const formatRupiah = (val) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val || 0);
  };

  // Robust Date Parser — handles ISO strings, Date objects, MySQL datetime
  const parseDateToYYYYMMDD = (raw) => {
    if (!raw) return '';
    if (raw instanceof Date) {
      if (isNaN(raw.getTime())) return '';
      return `${raw.getFullYear()}-${String(raw.getMonth()+1).padStart(2,'0')}-${String(raw.getDate()).padStart(2,'0')}`;
    }
    const s = String(raw).trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.substring(0,10);
    if (s.includes('T')) return s.split('T')[0];
    if (s.includes(' ') && /^\d{4}/.test(s)) return s.split(' ')[0];
    const d = new Date(s);
    if (!isNaN(d.getTime())) {
      return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    }
    return s.substring(0,10);
  };

  // Helper Date Matcher — today in Asia/Jakarta timezone
  const todayStr = useMemo(() => {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Jakarta',
      year: 'numeric', month: '2-digit', day: '2-digit'
    }).format(new Date());
  }, []);

  // Compute Active Dates List based on Preset (Formatted as MySQL YYYY-MM-DD)
  const activeDateList = useMemo(() => {
    const dates = [];
    const today = new Date();
    const fmtDate = (d) => parseDateToYYYYMMDD(d);

    if (dateRangePreset === 'today') {
      dates.push(todayStr);
    } else if (dateRangePreset === 'yesterday') {
      const yest = new Date(today);
      yest.setDate(today.getDate() - 1);
      dates.push(fmtDate(yest));
    } else if (dateRangePreset === 'last_week') {
      // Pekan Lalu: Dimulai dari SENIN sampai dengan MINGGU pekan lalu
      const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday ... 6 = Saturday
      const daysSinceMonday = (dayOfWeek === 0 ? 7 : dayOfWeek) - 1;
      const mondayThisWeek = new Date(today);
      mondayThisWeek.setDate(today.getDate() - daysSinceMonday);

      const mondayLastWeek = new Date(mondayThisWeek);
      mondayLastWeek.setDate(mondayThisWeek.getDate() - 7);

      for (let i = 0; i < 7; i++) {
        const d = new Date(mondayLastWeek);
        d.setDate(mondayLastWeek.getDate() + i);
        dates.push(fmtDate(d));
      }
    } else if (dateRangePreset === 'this_month') {
      // Bulan Ini (Dari tanggal 1 s/d hari ini)
      const year = today.getFullYear();
      const month = today.getMonth();
      let curr = new Date(year, month, 1);
      while (curr <= today) {
        dates.push(fmtDate(curr));
        curr.setDate(curr.getDate() + 1);
      }
    } else if (dateRangePreset === 'last_month') {
      // Bulan Lalu (Dari tanggal 1 s/d hari terakhir bulan lalu)
      const year = today.getFullYear();
      const month = today.getMonth();
      const firstDayLastMonth = new Date(year, month - 1, 1);
      const lastDayLastMonth = new Date(year, month, 0);
      let curr = new Date(firstDayLastMonth);
      while (curr <= lastDayLastMonth) {
        dates.push(fmtDate(curr));
        curr.setDate(curr.getDate() + 1);
      }
    } else if (dateRangePreset === '7days') {
      for (let i = 6; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(today.getDate() - i);
        dates.push(fmtDate(d));
      }
    } else if (dateRangePreset === '30days') {
      for (let i = 29; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(today.getDate() - i);
        dates.push(fmtDate(d));
      }
    } else if (dateRangePreset === 'custom' && customStartDate && customEndDate) {
      let curr = new Date(customStartDate + 'T00:00:00');
      const end = new Date(customEndDate + 'T00:00:00');
      while (curr <= end) {
        dates.push(fmtDate(curr));
        curr.setDate(curr.getDate() + 1);
      }
    } else {
      for (let i = 6; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(today.getDate() - i);
        dates.push(fmtDate(d));
      }
    }
    return dates;
  }, [dateRangePreset, customStartDate, customEndDate, todayStr]);

  // Branch Matcher Helper
  const matchesBranch = (item, targetBranch) => {
    if (!targetBranch || targetBranch === 'ALL' || targetBranch === 'Semua' || targetBranch === 'Semua Restoran (Konsolidasi)') return true;
    const bId = String(targetBranch);
    return (
      String(item.outlet_id) === bId ||
      String(item.branch_id) === bId ||
      String(item.outlet) === bId ||
      String(item.branch_name).toLowerCase() === bId.toLowerCase()
    );
  };

  // ------------------------------------------------------------------
  // 1. EXECUTIVE KPI CALCULATIONS (FOR SELECTED FILTER & PERIOD)
  // ------------------------------------------------------------------
  const kpiMetrics = useMemo(() => {
    const datesSet = new Set(activeDateList);

    // Sales Transactions
    const periodTx = allSalesTx.filter(t => {
      const d = parseDateToYYYYMMDD(t.date || t.entry_date || t.transaction_date || t.created_at || t.timestamp) || todayStr;
      return datesSet.has(d) && matchesBranch(t, activeOutletFilter);
    });

    const txSalesAmount = periodTx.reduce((sum, t) => sum + (Number(t.amount) || Number(t.total) || 0), 0);
    const txCount = periodTx.length;

    // Approved Finance
    const periodApproved = allApprovedFinance.filter(f => {
      const d = parseDateToYYYYMMDD(f.date || f.entry_date || f.created_at) || todayStr;
      return datesSet.has(d) && matchesBranch(f, activeOutletFilter);
    });

    const manualSalesAmount = periodApproved.reduce((sum, f) => sum + (Number(f.net_sales) || 0), 0);
    const periodCogs = periodApproved.reduce((sum, f) => sum + (Number(f.cogs) || 0), 0);
    const periodOpex = periodApproved.reduce((sum, f) => sum + (Number(f.operational) || 0) + (Number(f.gaji) || 0) + (Number(f.other_costs) || 0), 0);

    // Expense Records
    const periodExpenseRecs = allFinancialRecords.filter(f => {
      const d = parseDateToYYYYMMDD(f.date || f.entry_date || f.created_at) || todayStr;
      return f.type === 'expense' && datesSet.has(d) && matchesBranch(f, activeOutletFilter);
    }).reduce((sum, f) => sum + (Number(f.amount) || 0), 0);


    let totalQtySold = 0;
    let dineInSales = 0;
    let takeAwaySales = 0;
    let dineInCount = 0;
    let takeAwayCount = 0;
    let cashSales = 0;
    let nonCashSales = 0;
    let cashCount = 0;
    let nonCashCount = 0;

    periodTx.forEach(t => {
      const amt = Number(t.amount || t.total || 0);
      const ot = String(t.order_type || t.type || t.service_type || t.orderType || t.notes || '').toLowerCase();
      const isTakeAway = ot.includes('take') || ot.includes('away') || ot.includes('bungkus') || ot.includes('delivery') || ot.includes('online') || ot.includes('gofood') || ot.includes('grab') || ot.includes('shopee');
      
      if (isTakeAway) {
        takeAwaySales += amt;
        takeAwayCount += 1;
      } else {
        dineInSales += amt;
        dineInCount += 1;
      }

      const pm = String(t.payment_method || t.payment_type || '').toLowerCase();
      const isCash = pm.includes('cash') || pm.includes('tunai') || (!pm && t.type === 'cash');
      if (isCash) {
        cashSales += amt;
        cashCount += 1;
      } else {
        nonCashSales += amt;
        nonCashCount += 1;
      }

      if (Array.isArray(t.items) && t.items.length > 0) {
        t.items.forEach(it => {
          totalQtySold += Number(it.qty || it.quantity || 1);
        });
      } else {
        totalQtySold += Number(t.qty || t.item_count || 1);
      }
    });

    let totalRevenue = 0;
    if (dataSourceMode === 'pos_only') {
      totalRevenue = txSalesAmount;
    } else if (dataSourceMode === 'manual_only') {
      totalRevenue = manualSalesAmount;
    } else {
      // 'auto' mode: prioritaskan transaksi riil POS Kasir, jika tidak ada POS gunakan rekap manual
      totalRevenue = txSalesAmount > 0 ? txSalesAmount : manualSalesAmount;
    }
    const opexTotal = periodOpex + periodExpenseRecs;
    const totalExpense = periodCogs + opexTotal;
    const netProfit = totalRevenue - totalExpense;
    const profitMargin = totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(1) : '0.0';
    const avgTicket = txCount > 0 ? Math.round(totalRevenue / txCount) : 0;
    const cogsPct = totalRevenue > 0 ? ((periodCogs / totalRevenue) * 100).toFixed(1) : '0.0';
    const opexPct = totalRevenue > 0 ? ((opexTotal / totalRevenue) * 100).toFixed(1) : '0.0';
    const itemsPerTicket = txCount > 0 ? (totalQtySold / txCount).toFixed(1) : '0.0';

    const totalDineTakeRev = dineInSales + takeAwaySales;
    const dineInPct = totalDineTakeRev > 0 ? ((dineInSales / totalDineTakeRev) * 100).toFixed(1) : '0.0';
    const takeAwayPct = totalDineTakeRev > 0 ? ((takeAwaySales / totalDineTakeRev) * 100).toFixed(1) : '0.0';

    const totalCashNonCashRev = cashSales + nonCashSales;
    const cashPct = totalCashNonCashRev > 0 ? ((cashSales / totalCashNonCashRev) * 100).toFixed(1) : (totalRevenue > 0 ? '100.0' : '0.0');
    const nonCashPct = totalCashNonCashRev > 0 ? ((nonCashSales / totalCashNonCashRev) * 100).toFixed(1) : '0.0';

    // Outlets Target Achievement (Pencapaian Target Penjualan per Outlet)
    let targetReachedCount = 0;
    let targetMissedCount = 0;
    const totalOutletsCount = allOutlets.length || 1;
    const activeDaysCount = Math.max(1, activeDateList.length);

    allOutlets.forEach(o => {
      const oTx = allSalesTx.filter(t => {
        const d = String(t.date || t.entry_date || t.transaction_date || t.timestamp || todayStr).substring(0, 10);
        return datesSet.has(d) && (String(t.outlet_id) === String(o.id) || String(t.branch_id) === String(o.id) || String(t.outlet) === String(o.id));
      });
      const oApproved = allApprovedFinance.filter(f => {
        const d = String(f.date || f.entry_date || f.created_at || todayStr).substring(0, 10);
        return datesSet.has(d) && (String(f.outlet_id) === String(o.id) || String(f.branch_id) === String(o.id));
      });
      const oTxRev = oTx.reduce((s, t) => s + (Number(t.amount) || Number(t.total) || 0), 0);
      const oAppRev = oApproved.reduce((s, f) => s + (Number(f.net_sales) || 0), 0);
      const oRevenue = Math.max(oTxRev, oAppRev);

      const monthlyBudget = Number(o.monthly_budget || o.target_sales || 45000000);
      const dailyTarget = monthlyBudget > 0 ? monthlyBudget / 30 : 1500000;
      const targetForPeriod = dailyTarget * activeDaysCount;

      if (oRevenue >= targetForPeriod && oRevenue > 0) {
        targetReachedCount += 1;
      } else {
        targetMissedCount += 1;
      }
    });

    const targetReachedPct = totalOutletsCount > 0 ? Math.round((targetReachedCount / totalOutletsCount) * 100) : 0;

    return {
      totalRevenue,
      totalExpense,
      periodCogs,
      periodOpex: opexTotal,
      cogsPct,
      opexPct,
      netProfit,
      profitMargin,
      txCount,
      avgTicket,
      totalQtySold,
      itemsPerTicket,
      dineInSales,
      takeAwaySales,
      dineInCount,
      takeAwayCount,
      dineInPct,
      takeAwayPct,
      cashSales,
      nonCashSales,
      cashCount,
      nonCashCount,
      cashPct,
      nonCashPct,
      targetReachedCount,
      targetMissedCount,
      targetReachedPct,
      totalOutletsCount,
      activeOutletCount: allOutlets.length
    };
  }, [activeDateList, allSalesTx, allApprovedFinance, allFinancialRecords, activeOutletFilter, allOutlets, todayStr, dataSourceMode]);

  // ------------------------------------------------------------------
  // 2. SALES TREND DATA & OUTLET DAILY TARGET (DAILY CHART)
  // ------------------------------------------------------------------
  const dailyTargetRevenue = useMemo(() => {
    const now = new Date();
    // Total hari dalam 1 bulan kalender berjalan
    const daysInCurrentMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate() || 30;

    if (!activeOutletFilter || activeOutletFilter === 'ALL' || activeOutletFilter === 'Semua' || activeOutletFilter === 'Semua Restoran (Konsolidasi)') {
      // Konsolidasi Semua Cabang: akumulasi target bulanan seluruh outlet / hari dalam bulan berjalan
      const totalMonthlyBudget = allOutlets.reduce((sum, o) => sum + Number(o.monthly_budget || o.target_sales || 45000000), 0);
      return Math.round(totalMonthlyBudget / daysInCurrentMonth);
    } else {
      // Spesifik 1 Outlet: target bulanan outlet terpilih / hari dalam bulan berjalan
      const targetOutlet = allOutlets.find(o => String(o.id) === String(activeOutletFilter) || String(o.name) === String(activeOutletFilter));
      const monthlyBudget = Number(targetOutlet?.monthly_budget || targetOutlet?.target_sales || 45000000);
      return Math.round(monthlyBudget / daysInCurrentMonth);
    }
  }, [allOutlets, activeOutletFilter]);

  const salesTrendChartData = useMemo(() => {
    const monthNames = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];

    return activeDateList.map(dateStr => {
      const parts = dateStr.split('-');
      const shortLabel = parts.length === 3 ? `${parseInt(parts[2], 10)} ${monthNames[parseInt(parts[1], 10) - 1] || ''}` : dateStr;

      const dayTxs = allSalesTx.filter(t => (parseDateToYYYYMMDD(t.date || t.entry_date || t.transaction_date || t.created_at || t.timestamp) === dateStr) && matchesBranch(t, activeOutletFilter));
      const txSum = dayTxs.reduce((sum, t) => sum + (Number(t.amount) || Number(t.total) || 0), 0);

      const dayApproved = allApprovedFinance.filter(f => (parseDateToYYYYMMDD(f.date || f.entry_date || f.created_at) === dateStr) && matchesBranch(f, activeOutletFilter));
      const approvedSum = dayApproved.reduce((sum, f) => sum + (Number(f.net_sales) || 0), 0);

      let dayRevenue = 0;
      if (dataSourceMode === 'pos_only') {
        dayRevenue = txSum;
      } else if (dataSourceMode === 'manual_only') {
        dayRevenue = approvedSum;
      } else {
        dayRevenue = txSum > 0 ? txSum : approvedSum;
      }
      const dayCount = dayTxs.length;

      return {
        fullDate: dateStr,
        date: shortLabel,
        penjualan: dayRevenue,
        target: dailyTargetRevenue,
        transaksi: dayCount,
        isTargetReached: dayRevenue >= dailyTargetRevenue
      };
    });
  }, [activeDateList, allSalesTx, allApprovedFinance, activeOutletFilter, dailyTargetRevenue, todayStr, dataSourceMode]);

  // ------------------------------------------------------------------
  // 3. TOP SELLING PRODUCTS (TOP 5 MENU TERLARIS)
  // ------------------------------------------------------------------
  const topSellingMenu = useMemo(() => {
    const menuMap = new Map();
    const datesSet = new Set(activeDateList);

    const relevantTxs = allSalesTx.filter(t => {
      const d = parseDateToYYYYMMDD(t.date || t.entry_date || t.transaction_date || t.created_at || t.timestamp) || todayStr;
      return datesSet.has(d) && matchesBranch(t, activeOutletFilter);
    });


    relevantTxs.forEach(tx => {
      if (Array.isArray(tx.items) && tx.items.length > 0) {
        tx.items.forEach(it => {
          const rawName = it.name || it.product_name || it.item_name || 'MENU';
          const name = String(rawName).trim().toUpperCase();
          const qty = Number(it.qty || it.quantity || 1);
          const price = Number(it.price || it.unit_price || (tx.amount ? tx.amount / tx.items.length : 15000));
          const subtotal = qty * price;

          if (!menuMap.has(name)) {
            menuMap.set(name, { name, qty: 0, revenue: 0, category: it.category || it.category_name || 'Makanan' });
          }
          const curr = menuMap.get(name);
          curr.qty += qty;
          curr.revenue += subtotal;
        });
      } else if (tx.product_name || tx.description) {
        const rawName = tx.product_name || tx.description || 'Menu Makanan';
        const name = String(rawName).trim().toUpperCase();
        const qty = 1;
        const subtotal = Number(tx.amount || 25000);

        if (!menuMap.has(name)) {
          menuMap.set(name, { name, qty: 0, revenue: 0, category: 'Menu Utama' });
        }
        const curr = menuMap.get(name);
        curr.qty += qty;
        curr.revenue += subtotal;
      }
    });

    const sortedList = Array.from(menuMap.values()).sort((a, b) => b.revenue - a.revenue).slice(0, 5);
    const maxRev = sortedList.length > 0 ? sortedList[0].revenue : 1;

    return sortedList.map((m, idx) => ({
      ...m,
      rank: idx + 1,
      percentage: Math.round((m.revenue / (kpiMetrics.totalRevenue || maxRev)) * 100) || Math.round((m.revenue / maxRev) * 100)
    }));
  }, [allSalesTx, activeDateList, activeOutletFilter, kpiMetrics.totalRevenue, todayStr]);

  // ------------------------------------------------------------------
  // 4. BRANCH PERFORMANCE COMPARISON (OMZET, HPP, LABA PER CABANG)
  // ------------------------------------------------------------------
  const branchComparisonData = useMemo(() => {
    return allOutlets.map(o => {
      const oTx = allSalesTx.filter(t => String(t.outlet_id) === String(o.id));
      const oApproved = allApprovedFinance.filter(f => String(f.outlet_id) === String(o.id));

      const txRev = oTx.reduce((s, t) => s + (Number(t.amount) || Number(t.total) || 0), 0);
      const appRev = oApproved.reduce((s, f) => s + (Number(f.net_sales) || 0), 0);
      const revenue = Math.max(txRev, appRev);

      const hppAmount = oApproved.reduce((s, f) => s + (Number(f.cogs) || 0), 0);
      const opexAmount = oApproved.reduce((s, f) => s + (Number(f.operational) || 0) + (Number(f.gaji) || 0) + (Number(f.other_costs) || 0), 0);
      const totalCost = hppAmount + opexAmount;
      const netProfit = revenue - totalCost;

      const hppPct = revenue > 0 ? Number(((hppAmount / revenue) * 100).toFixed(1)) : 0;
      const isOverHppBudget = hppPct > 60.0;

      return {
        id: o.id,
        name: o.name,
        code: o.code || `OTL-${o.id}`,
        revenue,
        hppAmount,
        totalCost,
        netProfit,
        hppPct,
        isOverHppBudget
      };
    });
  }, [allOutlets, allSalesTx, allApprovedFinance]);

  // ------------------------------------------------------------------
  // 5. INGREDIENT CATEGORIES & PRICE DISPARITY ACROSS BRANCHES
  // ------------------------------------------------------------------
  // Helper to reliably resolve category for any ingredient strictly to Ingredient Categories
  const resolveIngredientCategory = (ing) => {
    if (!ing) return 'Bumbu & Rempah';
    if (ing.category && String(ing.category).trim() && String(ing.category).trim() !== '-') return String(ing.category).trim();
    if (ing.category_name && String(ing.category_name).trim() && String(ing.category_name).trim() !== '-') return String(ing.category_name).trim();

    const name = String(ing.name || '').toLowerCase();
    if (name.includes('ikan') || name.includes('udang') || name.includes('cumi') || name.includes('kepiting') || name.includes('lele') || name.includes('gurami') || name.includes('seafood') || name.includes('belut')) {
      return 'Seafood & Ikan';
    }
    if (name.includes('ayam') || name.includes('bebek') || name.includes('daging') || name.includes('sapi') || name.includes('kambing') || name.includes('telur')) {
      return 'Daging & Unggas';
    }
    if (name.includes('kangkung') || name.includes('bayam') || name.includes('toge') || name.includes('sayur') || name.includes('cabai') || name.includes('cabe') || name.includes('bawang') || name.includes('tomat') || name.includes('timun') || name.includes('jeruk') || name.includes('daun')) {
      return 'Sayur & Bumbu Segar';
    }
    if (name.includes('milo') || name.includes('kopi') || name.includes('coffee') || name.includes('cappucino') || name.includes('teh') || name.includes('lemon tea') || name.includes('fruit tea') || name.includes('air mineral') || name.includes('sirup') || name.includes('susu') || name.includes('powder') || name.includes('aqua')) {
      return 'Minuman & Powder';
    }
    if (name.includes('nasi') || name.includes('beras') || name.includes('minyak') || name.includes('tepung') || name.includes('gula') || name.includes('garam') || name.includes('kecap') || name.includes('saus') || name.includes('kerupuk')) {
      return 'Sembako & Olahan';
    }
    return 'Bumbu & Rempah';
  };

  // Dynamic categories STRICTLY from Data Master ➔ Kategori ➔ Kategori Bahan Baku (masterData.ingredientCategories)
  const dynamicIngredientCategories = useMemo(() => {
    if (Array.isArray(masterData?.ingredientCategories) && masterData.ingredientCategories.length > 0) {
      return masterData.ingredientCategories
        .filter(c => (c.status || 'Aktif') === 'Aktif')
        .map(c => (c.name || '').trim())
        .filter(Boolean)
        .sort();
    }
    return [
      'Bumbu & Rempah',
      'Daging & Unggas',
      'Minuman & Powder',
      'Sayur & Bumbu Segar',
      'Seafood & Ikan',
      'Sembako & Olahan'
    ];
  }, [masterData?.ingredientCategories]);

  // Active dates for Disparitas Section based on Preset (Formatted as MySQL YYYY-MM-DD)
  const disparityActiveDates = useMemo(() => {
    const today = new Date();
    const toYMD = (dt) => {
      const y = dt.getFullYear();
      const m = String(dt.getMonth() + 1).padStart(2, '0');
      const d = String(dt.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    };

    if (disparityDatePreset === 'today') {
      return [toYMD(today)];
    } else if (disparityDatePreset === 'yesterday') {
      const yes = new Date(today);
      yes.setDate(today.getDate() - 1);
      return [toYMD(yes)];
    } else if (disparityDatePreset === 'last_week') {
      const dayOfWeek = today.getDay();
      const daysSinceMonday = (dayOfWeek === 0 ? 7 : dayOfWeek) - 1;
      const mondayThisWeek = new Date(today);
      mondayThisWeek.setDate(today.getDate() - daysSinceMonday);

      const mondayLastWeek = new Date(mondayThisWeek);
      mondayLastWeek.setDate(mondayThisWeek.getDate() - 7);

      const dates = [];
      for (let i = 0; i < 7; i++) {
        const cur = new Date(mondayLastWeek);
        cur.setDate(mondayLastWeek.getDate() + i);
        dates.push(toYMD(cur));
      }
      return dates;
    } else if (disparityDatePreset === 'this_month') {
      const dates = [];
      const currentDay = today.getDate();
      for (let i = 1; i <= currentDay; i++) {
        const cur = new Date(today.getFullYear(), today.getMonth(), i);
        dates.push(toYMD(cur));
      }
      return dates;
    } else if (disparityDatePreset === 'last_month') {
      const dates = [];
      const daysInLastMonth = new Date(today.getFullYear(), today.getMonth(), 0).getDate();
      for (let i = 1; i <= daysInLastMonth; i++) {
        const cur = new Date(today.getFullYear(), today.getMonth() - 1, i);
        dates.push(toYMD(cur));
      }
      return dates;
    } else if (disparityDatePreset === '7days') {
      const dates = [];
      for (let i = 6; i >= 0; i--) {
        const cur = new Date(today);
        cur.setDate(today.getDate() - i);
        dates.push(toYMD(cur));
      }
      return dates;
    } else if (disparityDatePreset === 'custom' && disparityCustomStartDate && disparityCustomEndDate) {
      const dates = [];
      const start = new Date(disparityCustomStartDate);
      const end = new Date(disparityCustomEndDate);
      if (!isNaN(start.getTime()) && !isNaN(end.getTime()) && start <= end) {
        const cur = new Date(start);
        while (cur <= end) {
          dates.push(toYMD(cur));
          cur.setDate(cur.getDate() + 1);
        }
      }
      return dates;
    }
    return []; // all
  }, [disparityDatePreset, disparityCustomStartDate, disparityCustomEndDate]);

  // Comprehensive Price lookup per outlet per ingredient from Master Data & Logistics
  const ingredientDisparityList = useMemo(() => {
    if (allIngredients.length === 0) return [];

    let filtered = allIngredients;
    if (selectedIngredientCategory !== 'ALL') {
      filtered = allIngredients.filter(i => {
        const cat = resolveIngredientCategory(i).toLowerCase().trim();
        return cat === selectedIngredientCategory.toLowerCase().trim();
      });
    }

    return filtered.slice(0, 12).map(ing => {
      const ingNameLower = (ing.name || '').toLowerCase().trim();
      const baseCost = Number(ing.price || ing.cost || ing.buy_price || ing.unitPrice || 0);

      const outletPrices = allOutlets.map(o => {
        const oIdStr = String(o.id);
        let foundPrice = 0;

        // 1. Check stockMovement (stok masuk / pembelian logistik per outlet)
        const matchedStockIn = (masterData?.stockMovement || []).filter(m => {
          const mName = (m.item_name || m.name || m.ingredient_name || '').toLowerCase().trim();
          const mOId = String(m.outlet_id || m.branch_id || '');
          const mType = String(m.type || m.movement_type || '').toLowerCase();
          const mDate = parseDateToYYYYMMDD(m.date || m.created_at || m.timestamp);
          const dateMatches = disparityActiveDates.length === 0 || (mDate && disparityActiveDates.includes(mDate));
          return dateMatches && mName === ingNameLower && mOId === oIdStr && (mType.includes('in') || mType.includes('masuk') || mType.includes('beli'));
        });
        if (matchedStockIn.length > 0) {
          const latestStock = matchedStockIn[matchedStockIn.length - 1];
          foundPrice = Number(latestStock.price || latestStock.cost || latestStock.unit_price || 0);
        }

        // 2. Check approvedLogistics
        if (!foundPrice) {
          (masterData?.approvedLogistics || []).forEach(log => {
            if (String(log.outlet_id || log.branch_id || '') === oIdStr) {
              const lDate = parseDateToYYYYMMDD(log.date || log.created_at || log.timestamp);
              const dateMatches = disparityActiveDates.length === 0 || (lDate && disparityActiveDates.includes(lDate));
              if (dateMatches) {
                const items = log.items || log.ingredients || [];
                items.forEach(it => {
                  const itName = (it.ingredient_name || it.name || it.item_name || '').toLowerCase().trim();
                  if (itName === ingNameLower && Number(it.price_per_unit || it.cost || it.price || 0) > 0) {
                    foundPrice = Number(it.price_per_unit || it.cost || it.price);
                  }
                });
              }
            }
          });
        }

        // 3. Check approvedFinanceDaily / manualEntryRecords cogs rows
        if (!foundPrice) {
          const allReps = [...(masterData?.approvedFinanceDaily || []), ...(masterData?.manualEntryRecords || [])];
          allReps.forEach(rep => {
            if (String(rep.outlet_id || rep.branch_id || '') === oIdStr) {
              const rDate = parseDateToYYYYMMDD(rep.date || rep.created_at || rep.timestamp);
              const dateMatches = disparityActiveDates.length === 0 || (rDate && disparityActiveDates.includes(rDate));
              if (dateMatches) {
                const rows = rep.expense_rows || rep.cogs_items || rep.cogs_breakdown || [];
                rows.forEach(r => {
                  const rName = (r.item_name || r.name || '').toLowerCase().trim();
                  if (rName === ingNameLower && Number(r.price_per_unit || r.cost || 0) > 0) {
                    foundPrice = Number(r.price_per_unit || r.cost);
                  }
                });
              }
            }
          });
        }

        // 4. Fallback to ingredient's own base cost/price from Master Data Bahan Baku
        if (!foundPrice) {
          if (ing.outletPrices && (ing.outletPrices[o.id] || ing.outletPrices[oIdStr])) {
            foundPrice = Number(ing.outletPrices[o.id] || ing.outletPrices[oIdStr]);
          } else if (ing.standardPrices && (ing.standardPrices[o.id] || ing.standardPrices[oIdStr])) {
            foundPrice = Number(ing.standardPrices[o.id] || ing.standardPrices[oIdStr]);
          } else {
            foundPrice = baseCost;
          }
        }

        return {
          outletId: o.id,
          outletName: o.name,
          price: foundPrice
        };
      });

      const validPrices = outletPrices.map(op => op.price).filter(p => p > 0);
      const minPrice = validPrices.length > 0 ? Math.min(...validPrices) : 0;
      const maxPrice = validPrices.length > 0 ? Math.max(...validPrices) : 0;
      const disparity = maxPrice - minPrice;

      return {
        ...ing,
        outletPrices,
        minPrice,
        maxPrice,
        disparity,
        hasDisparityAlert: disparity > 2000
      };
    });
  }, [allIngredients, selectedIngredientCategory, allOutlets, masterData?.stockMovement, masterData?.approvedLogistics, masterData?.approvedFinanceDaily, masterData?.manualEntryRecords]);



  // AI Analysis Trigger
  const handleOpenAIInsight = (tab = 'summary') => {
    setAiModalTab(tab);
    setShowAIModal(true);
  };



  const handleTriggerAI = () => {
    handleOpenAIInsight('summary');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', background: T.pageBg, color: T.txtPrimary }} className="animate-fade-in">
      
      {/* ------------------------------------------------------------- */}
      {/* 1. EXECUTIVE HEADER & REAL-TIME FILTER TOOLBAR               */}
      {/* ------------------------------------------------------------- */}
      <div style={{
        background: T.cardBg,
        border: `1px solid ${T.borderStrong}`,
        borderRadius: '16px',
        padding: '18px 22px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '16px',
        boxShadow: T.shadowSm
      }}>
        {/* Title & Live Status */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '9px', height: '9px', borderRadius: '50%', background: T.success, boxShadow: `0 0 10px ${T.success}` }} className="animate-pulse" />
            <h2 style={{ fontSize: '1.15rem', fontWeight: '900', color: T.txtPrimary, margin: 0, letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>Dashboard Ringkasan Keuangan</span>
              <span style={{ fontSize: '0.68rem', padding: '2px 8px', borderRadius: '6px', background: T.successBg, color: T.success, border: `1px solid ${T.successBorder}`, fontWeight: '900' }}>
                LIVE REAL-TIME
              </span>
            </h2>
          </div>
          <p style={{ color: T.txtSecondary, fontSize: '0.76rem', marginTop: '4px', margin: 0 }}>
            Pusat kendali omzet, efisiensi HPP, analisis menu terlaris, dan kinerja multi-cabang restoran.
          </p>
        </div>

        {/* Global Toolbar Filters */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'flex-start', width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', width: '100%' }}>

            {/* Quick Date Range Tabs (Interactive Small Pills) */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '6px',
              background: T.controlBg,
              padding: '5px',
              borderRadius: '12px',
              border: `1px solid ${T.border}`
            }}>
              {[
                { id: 'today', label: 'Hari Ini', icon: null },
                { id: 'yesterday', label: 'Kemarin', icon: null },
                { id: 'last_week', label: 'Pekan Lalu (Sen-Min)', icon: null },
                { id: 'this_month', label: 'Bulan Ini', icon: null },
                { id: 'last_month', label: 'Bulan Lalu', icon: null },
                { id: '7days', label: '7 Hari Terakhir', icon: null },
                { id: 'custom', label: 'Rentang Waktu', icon: Calendar }
              ].map(tab => {
                const isActive = dateRangePreset === tab.id;
                const IconComp = tab.icon;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => {
                      setDateRangePreset(tab.id);
                      if (tab.id === 'custom' && (!customStartDate || !customEndDate)) {
                        const d = new Date();
                        const endStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                        d.setDate(d.getDate() - 6);
                        const startStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                        setCustomStartDate(startStr);
                        setCustomEndDate(endStr);
                      }
                    }}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '8px',
                      border: isActive ? `1px solid ${T.accentGold}` : '1px solid transparent',
                      background: isActive ? (isLight ? '#ffffff' : 'rgba(245, 158, 11, 0.20)') : 'transparent',
                      color: isActive ? (isLight ? '#1a6fc4' : '#fbbf24') : T.txtSecondary,
                      fontWeight: isActive ? '900' : '700',
                      fontSize: '0.76rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      transition: 'all 0.15s ease',
                      boxShadow: isActive ? '0 2px 6px rgba(0,0,0,0.1)' : 'none'
                    }}
                  >
                    {IconComp && <IconComp size={14} color={isActive ? (isLight ? '#b45309' : '#fbbf24') : T.txtSecondary} />}
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Right Controls: Data Source & AI Insight */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              {/* Data Source Selector (Anti Double-Counting) */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: T.inputBg, padding: '4px 10px', borderRadius: '10px', border: `1px solid ${T.borderStrong}` }}>
                <Layers size={15} color={T.txtSecondary} />
                <select
                  value={dataSourceMode}
                  onChange={e => setDataSourceMode(e.target.value)}
                  style={{ background: 'transparent', border: 'none', color: T.txtPrimary, fontSize: '0.78rem', fontWeight: '800', cursor: 'pointer', outline: 'none' }}
                  title="Pilih Sumber Data Penjualan (Mencegah Double Counting)"
                >
                  <option value="auto">📊 Otomatis (POS Prioritas)</option>
                  <option value="pos_only">🧾 Hanya Struk POS Kasir</option>
                  <option value="manual_only">📑 Hanya Rekap Manual / Excel</option>
                </select>
              </div>

              {/* AI Refresh Button */}
              <button
                type="button"
                onClick={handleTriggerAI}
                disabled={isAnalyzingAI}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '7px 14px',
                  borderRadius: '10px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #a855f7 0%, #7c3aed 100%)',
                  color: '#ffffff',
                  fontWeight: '800',
                  fontSize: '0.78rem',
                  cursor: isAnalyzingAI ? 'not-allowed' : 'pointer',
                  boxShadow: '0 2px 10px rgba(168, 85, 247, 0.4)',
                  transition: 'all 0.15s ease'
                }}
              >
                <Sparkles size={14} className={isAnalyzingAI ? "animate-spin" : ""} />
                <span>{isAnalyzingAI ? 'Menganalisis...' : 'Insight AI'}</span>
              </button>
            </div>

          </div>

          {/* Custom Date Pickers Widget if selected */}
          {dateRangePreset === 'custom' && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '12px',
              background: T.cardBg,
              padding: '10px 16px',
              borderRadius: '12px',
              border: `1px solid ${T.accentGoldBorder}`,
              boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
              animation: 'fadeIn 0.2s ease-in-out'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.78rem', fontWeight: '900', color: T.accentGold }}>
                <Calendar size={17} color={T.accentGold} />
                <span>Pilih Rentang Kalender:</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={e => setCustomStartDate(e.target.value)}
                    style={{
                      padding: '6px 10px',
                      background: T.inputBg,
                      border: `1px solid ${T.borderStrong}`,
                      borderRadius: '8px',
                      color: T.txtPrimary,
                      fontSize: '0.78rem',
                      fontWeight: '800',
                      colorScheme: isLight ? 'light' : 'dark',
                      outline: 'none',
                      cursor: 'pointer'
                    }}
                  />
                </div>
                <span style={{ fontSize: '0.74rem', color: T.txtSecondary, fontWeight: '800' }}>s/d</span>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={e => setCustomEndDate(e.target.value)}
                    style={{
                      padding: '6px 10px',
                      background: T.inputBg,
                      border: `1px solid ${T.borderStrong}`,
                      borderRadius: '8px',
                      color: T.txtPrimary,
                      fontSize: '0.78rem',
                      fontWeight: '800',
                      colorScheme: isLight ? 'light' : 'dark',
                      outline: 'none',
                      cursor: 'pointer'
                    }}
                  />
                </div>
              </div>
              <div style={{ fontSize: '0.70rem', color: T.txtSecondary, background: T.controlBg, padding: '3px 8px', borderRadius: '6px', fontWeight: '700' }}>
                Format MySQL: <code>YYYY-MM-DD</code>
              </div>
            </div>
          )}
        </div>
      </div>



      {/* ------------------------------------------------------------- */}
      {/* 2. EXECUTIVE KPI CARDS (10 CARDS - 2 BARIS x 5 CARDS)         */}
      {/* ------------------------------------------------------------- */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(5, minmax(0, 1fr))',
        gap: '12px'
      }}>
        
        {/* KPI 1: REVENUE / TOTAL OMZET */}
        <div style={{
          background: T.cardBg,
          border: `1px solid ${T.borderStrong}`,
          borderRadius: '14px',
          padding: '16px 18px',
          boxShadow: T.shadowSm,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          gap: '8px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.68rem', fontWeight: '800', color: T.txtSecondary, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              TOTAL OMZET PENJUALAN
            </span>
            <div style={{ padding: '6px', borderRadius: '8px', background: T.successBg, color: T.success }}>
              <DollarSign size={16} />
            </div>
          </div>
          <div>
            <div style={{ fontSize: '1.35rem', fontWeight: '900', color: T.success, letterSpacing: '-0.02em' }}>
              {formatRupiah(kpiMetrics.totalRevenue)}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.70rem', color: T.success, fontWeight: '700', marginTop: '4px' }}>
              <ArrowUpRight size={13} />
              <span>{kpiMetrics.txCount} Transaksi Terverifikasi</span>
            </div>
          </div>
        </div>

        {/* KPI 2: TOTAL PENGELUARAN (HPP + OPEX) */}
        <div style={{
          background: T.cardBg,
          border: `1px solid ${T.borderStrong}`,
          borderRadius: '14px',
          padding: '16px 18px',
          boxShadow: T.shadowSm,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          gap: '8px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.68rem', fontWeight: '800', color: T.txtSecondary, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              TOTAL BEBAN KESELURUHAN
            </span>
            <div style={{ padding: '6px', borderRadius: '8px', background: T.dangerBg, color: T.danger }}>
              <Wallet size={16} />
            </div>
          </div>
          <div>
            <div style={{ fontSize: '1.35rem', fontWeight: '900', color: T.danger, letterSpacing: '-0.02em' }}>
              {formatRupiah(kpiMetrics.totalExpense)}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: T.txtSecondary, fontWeight: '600', marginTop: '4px' }}>
              <span>HPP: {formatRupiah(kpiMetrics.periodCogs)}</span>
              <span>Ops: {formatRupiah(kpiMetrics.periodOpex)}</span>
            </div>
          </div>
        </div>

        {/* KPI 3: LABA BERSIH & MARGIN % */}
        <div style={{
          background: T.cardBg,
          border: `1px solid ${T.borderStrong}`,
          borderRadius: '14px',
          padding: '16px 18px',
          boxShadow: T.shadowSm,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          gap: '8px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.68rem', fontWeight: '800', color: T.txtSecondary, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              LABA BERSIH (NET PROFIT)
            </span>
            <div style={{ padding: '6px', borderRadius: '8px', background: T.infoBg, color: T.info }}>
              <TrendingUp size={16} />
            </div>
          </div>
          <div>
            <div style={{ fontSize: '1.35rem', fontWeight: '900', color: kpiMetrics.netProfit >= 0 ? T.info : T.danger, letterSpacing: '-0.02em' }}>
              {formatRupiah(kpiMetrics.netProfit)}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.70rem', color: T.warning, fontWeight: '800', marginTop: '4px' }}>
              <span>Margin Keuntungan: {kpiMetrics.profitMargin}%</span>
            </div>
          </div>
        </div>

        {/* KPI 4: AVERAGE SPEND PER TICKET */}
        <div style={{
          background: T.cardBg,
          border: `1px solid ${T.borderStrong}`,
          borderRadius: '14px',
          padding: '16px 18px',
          boxShadow: T.shadowSm,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          gap: '8px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.68rem', fontWeight: '800', color: T.txtSecondary, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              RATA-RATA NILAI NOTA (TICKET)
            </span>
            <div style={{ padding: '6px', borderRadius: '8px', background: T.accentGoldBg, color: T.accentGold }}>
              <Receipt size={16} />
            </div>
          </div>
          <div>
            <div style={{ fontSize: '1.35rem', fontWeight: '900', color: T.accentGold, letterSpacing: '-0.02em' }}>
              {formatRupiah(kpiMetrics.avgTicket)}
            </div>
            <div style={{ fontSize: '0.70rem', color: T.txtSecondary, fontWeight: '600', marginTop: '4px' }}>
              Rata-rata Pengeluaran / Meja Pelanggan
            </div>
          </div>
        </div>

        {/* KPI 5: TOTAL STRUK TRANSAKSI */}
        <div style={{
          background: T.cardBg,
          border: `1px solid ${T.borderStrong}`,
          borderRadius: '14px',
          padding: '16px 18px',
          boxShadow: T.shadowSm,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          gap: '8px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.68rem', fontWeight: '800', color: T.txtSecondary, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              TOTAL STRUK TRANSAKSI
            </span>
            <div style={{ padding: '6px', borderRadius: '8px', background: T.accentGreenBg, color: T.accentGreen }}>
              <Receipt size={16} />
            </div>
          </div>
          <div>
            <div style={{ fontSize: '1.35rem', fontWeight: '900', color: T.accentGreen, letterSpacing: '-0.02em' }}>
              {kpiMetrics.txCount} Struk
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.70rem', color: T.success, fontWeight: '700', marginTop: '4px' }}>
              <CheckCircle2 size={13} />
              <span>Transaksi Kasir Selesai</span>
            </div>
          </div>
        </div>

        {/* KPI 6: BIAYA HPP BAHAN BAKU */}
        <div style={{
          background: T.cardBg,
          border: `1px solid ${T.borderStrong}`,
          borderRadius: '14px',
          padding: '16px 18px',
          boxShadow: T.shadowSm,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          gap: '8px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.68rem', fontWeight: '800', color: T.txtSecondary, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              BIAYA HPP BAHAN BAKU
            </span>
            <div style={{ padding: '6px', borderRadius: '8px', background: T.dangerBg, color: T.danger }}>
              <Percent size={16} />
            </div>
          </div>
          <div>
            <div style={{ fontSize: '1.35rem', fontWeight: '900', color: T.danger, letterSpacing: '-0.02em' }}>
              {formatRupiah(kpiMetrics.periodCogs)}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.70rem', color: Number(kpiMetrics.cogsPct) > 60 ? T.danger : T.success, fontWeight: '700', marginTop: '4px' }}>
              <span>Rasio HPP: {kpiMetrics.cogsPct}% (Target &lt; 60%)</span>
            </div>
          </div>
        </div>

        {/* KPI 7: PERBANDINGAN DINE IN VS TAKE AWAY */}
        <div style={{
          background: T.cardBg,
          border: `1px solid ${T.borderStrong}`,
          borderRadius: '14px',
          padding: '16px 18px',
          boxShadow: T.shadowSm,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          gap: '8px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.68rem', fontWeight: '800', color: T.txtSecondary, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              DINE IN VS TAKE AWAY
            </span>
            <div style={{ padding: '6px', borderRadius: '8px', background: 'rgba(249, 115, 22, 0.15)', color: '#f97316' }}>
              <ShoppingBag size={16} />
            </div>
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap', gap: '4px' }}>
              <div>
                <span style={{ fontSize: '0.66rem', color: T.txtMuted, fontWeight: '700', display: 'block' }}>🍽️ Dine In:</span>
                <span style={{ fontSize: '1.05rem', fontWeight: '900', color: T.info, letterSpacing: '-0.02em' }}>
                  {formatRupiah(kpiMetrics.dineInSales)}
                </span>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '0.66rem', color: T.txtMuted, fontWeight: '700', display: 'block' }}>🛍️ Take Away:</span>
                <span style={{ fontSize: '1.05rem', fontWeight: '900', color: '#f97316', letterSpacing: '-0.02em' }}>
                  {formatRupiah(kpiMetrics.takeAwaySales)}
                </span>
              </div>
            </div>

            {/* Visual Proportion Bar */}
            <div style={{ width: '100%', height: '6px', background: T.controlBg, borderRadius: '999px', overflow: 'hidden', display: 'flex', margin: '8px 0 4px 0' }}>
              <div style={{ width: `${kpiMetrics.dineInPct}%`, background: T.info, transition: 'width 0.3s ease' }} title={`Dine In: ${kpiMetrics.dineInPct}%`} />
              <div style={{ width: `${kpiMetrics.takeAwayPct}%`, background: '#f97316', transition: 'width 0.3s ease' }} title={`Take Away: ${kpiMetrics.takeAwayPct}%`} />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.68rem', fontWeight: '700' }}>
              <span style={{ color: T.info }}>Dine In: {kpiMetrics.dineInPct}% ({kpiMetrics.dineInCount} Nota)</span>
              <span style={{ color: '#f97316' }}>Take Away: {kpiMetrics.takeAwayPct}% ({kpiMetrics.takeAwayCount} Nota)</span>
            </div>
          </div>
        </div>

        {/* KPI 8: TOTAL PORSI MENU TERJUAL */}
        <div style={{
          background: T.cardBg,
          border: `1px solid ${T.borderStrong}`,
          borderRadius: '14px',
          padding: '16px 18px',
          boxShadow: T.shadowSm,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          gap: '8px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.68rem', fontWeight: '800', color: T.txtSecondary, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              TOTAL PORSI MENU TERJUAL
            </span>
            <div style={{ padding: '6px', borderRadius: '8px', background: T.infoBg, color: T.info }}>
              <Utensils size={16} />
            </div>
          </div>
          <div>
            <div style={{ fontSize: '1.35rem', fontWeight: '900', color: T.info, letterSpacing: '-0.02em' }}>
              {kpiMetrics.totalQtySold} Porsi
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.70rem', color: T.success, fontWeight: '700', marginTop: '4px' }}>
              <span>Rata-rata: {kpiMetrics.itemsPerTicket} Menu / Struk</span>
            </div>
          </div>
        </div>

        {/* KPI 9: PERBANDINGAN PENJUALAN CASH VS NON-CASH */}
        <div style={{
          background: T.cardBg,
          border: `1px solid ${T.borderStrong}`,
          borderRadius: '14px',
          padding: '16px 18px',
          boxShadow: T.shadowSm,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          gap: '8px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.68rem', fontWeight: '800', color: T.txtSecondary, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              CASH VS NON-CASH
            </span>
            <div style={{ padding: '6px', borderRadius: '8px', background: T.successBg, color: T.success }}>
              <Banknote size={16} />
            </div>
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap', gap: '4px' }}>
              <div>
                <span style={{ fontSize: '0.66rem', color: T.txtMuted, fontWeight: '700', display: 'block' }}>💵 Kas Tunai:</span>
                <span style={{ fontSize: '1.05rem', fontWeight: '900', color: T.success, letterSpacing: '-0.02em' }}>
                  {formatRupiah(kpiMetrics.cashSales)}
                </span>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '0.66rem', color: T.txtMuted, fontWeight: '700', display: 'block' }}>💳 Non-Tunai:</span>
                <span style={{ fontSize: '1.05rem', fontWeight: '900', color: T.info, letterSpacing: '-0.02em' }}>
                  {formatRupiah(kpiMetrics.nonCashSales)}
                </span>
              </div>
            </div>

            {/* Visual Proportion Bar */}
            <div style={{ width: '100%', height: '6px', background: T.controlBg, borderRadius: '999px', overflow: 'hidden', display: 'flex', margin: '8px 0 4px 0' }}>
              <div style={{ width: `${kpiMetrics.cashPct}%`, background: T.success, transition: 'width 0.3s ease' }} title={`Cash: ${kpiMetrics.cashPct}%`} />
              <div style={{ width: `${kpiMetrics.nonCashPct}%`, background: T.info, transition: 'width 0.3s ease' }} title={`Non-Cash: ${kpiMetrics.nonCashPct}%`} />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.68rem', fontWeight: '700' }}>
              <span style={{ color: T.success }}>Tunai: {kpiMetrics.cashPct}% ({kpiMetrics.cashCount} Nota)</span>
              <span style={{ color: T.info }}>Non-Tunai: {kpiMetrics.nonCashPct}% ({kpiMetrics.nonCashCount} Nota)</span>
            </div>
          </div>
        </div>

        {/* KPI 10: PENCAPAIAN TARGET OUTLET */}
        <div style={{
          background: T.cardBg,
          border: `1px solid ${T.borderStrong}`,
          borderRadius: '14px',
          padding: '16px 18px',
          boxShadow: T.shadowSm,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          gap: '8px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.68rem', fontWeight: '800', color: T.txtSecondary, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              PENCAPAIAN TARGET OUTLET
            </span>
            <div style={{ padding: '6px', borderRadius: '8px', background: T.accentGoldBg, color: T.accentGold }}>
              <Target size={16} />
            </div>
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap', gap: '4px' }}>
              <div>
                <span style={{ fontSize: '0.66rem', color: T.txtMuted, fontWeight: '700', display: 'block' }}>🎯 Capai Target:</span>
                <span style={{ fontSize: '1.05rem', fontWeight: '900', color: T.success, letterSpacing: '-0.02em' }}>
                  {kpiMetrics.targetReachedCount} Outlet
                </span>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '0.66rem', color: T.txtMuted, fontWeight: '700', display: 'block' }}>⚠️ Belum Capai:</span>
                <span style={{ fontSize: '1.05rem', fontWeight: '900', color: T.danger, letterSpacing: '-0.02em' }}>
                  {kpiMetrics.targetMissedCount} Outlet
                </span>
              </div>
            </div>

            {/* Visual Proportion Bar */}
            <div style={{ width: '100%', height: '6px', background: T.controlBg, borderRadius: '999px', overflow: 'hidden', display: 'flex', margin: '8px 0 4px 0' }}>
              <div style={{ width: `${kpiMetrics.targetReachedPct}%`, background: T.success, transition: 'width 0.3s ease' }} title={`Capai Target: ${kpiMetrics.targetReachedPct}%`} />
              <div style={{ width: `${100 - kpiMetrics.targetReachedPct}%`, background: T.danger, transition: 'width 0.3s ease' }} title={`Belum Capai: ${100 - kpiMetrics.targetReachedPct}%`} />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.68rem', fontWeight: '700' }}>
              <span style={{ color: T.success }}>{kpiMetrics.targetReachedPct}% Tercapai ({kpiMetrics.targetReachedCount}/{kpiMetrics.totalOutletsCount})</span>
              <span style={{ color: T.danger }}>{100 - kpiMetrics.targetReachedPct}% Belum Tercapai</span>
            </div>
          </div>
        </div>

      </div>

      {/* ------------------------------------------------------------- */}
      {/* 3. SECTION 1: GRAFIK PENJUALAN & TOP 5 MENU TERLARIS (2 KOLOM)*/}
      {/* ------------------------------------------------------------- */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: '16px' }}>
        
        {/* Kolom 1: Grafik Tren Penjualan Harian */}
        <div style={{
          background: T.cardBg,
          border: `1px solid ${T.borderStrong}`,
          borderRadius: '16px',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          boxShadow: T.shadowSm
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <h3 style={{ fontSize: '0.96rem', fontWeight: '900', color: T.txtPrimary, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <TrendingUp size={18} color={T.success} />
                <span>Tren Penjualan Harian</span>
              </h3>
              <p style={{ fontSize: '0.72rem', color: T.txtSecondary, margin: '2px 0 0 0' }}>
                Fluktuasi omzet harian berdasarkan filter cabang &amp; rentang waktu terpilih
              </p>
            </div>

            {/* Toggle Area vs Bar Chart */}
            <div style={{ background: T.inputBg, padding: '3px', borderRadius: '8px', border: `1px solid ${T.borderStrong}`, display: 'flex', gap: '2px' }}>
              <button
                type="button"
                onClick={() => setSalesChartType('area')}
                style={{
                  padding: '4px 10px',
                  background: salesChartType === 'area' ? T.success : 'transparent',
                  color: salesChartType === 'area' ? '#ffffff' : T.txtSecondary,
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '0.72rem',
                  fontWeight: '800',
                  cursor: 'pointer'
                }}
              >
                Kurva Area
              </button>
              <button
                type="button"
                onClick={() => setSalesChartType('bar')}
                style={{
                  padding: '4px 10px',
                  background: salesChartType === 'bar' ? T.success : 'transparent',
                  color: salesChartType === 'bar' ? '#ffffff' : T.txtSecondary,
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '0.72rem',
                  fontWeight: '800',
                  cursor: 'pointer'
                }}
              >
                Batang (Bar)
              </button>
            </div>
          </div>

          {/* Quick Metrics Bar (4 Kolom dengan Target Harian) */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
            <div style={{ background: T.cardBg2, border: `1px solid ${T.borderStrong}`, borderRadius: '8px', padding: '8px 12px' }}>
              <span style={{ fontSize: '0.64rem', color: T.txtSecondary, fontWeight: '700', textTransform: 'uppercase' }}>TOTAL OMZET</span>
              <div style={{ fontSize: '1.02rem', fontWeight: '900', color: T.success, marginTop: '2px' }}>{formatRupiah(kpiMetrics.totalRevenue)}</div>
            </div>
            <div style={{ background: T.cardBg2, border: `1px solid ${T.borderStrong}`, borderRadius: '8px', padding: '8px 12px' }}>
              <span style={{ fontSize: '0.64rem', color: T.txtSecondary, fontWeight: '700', textTransform: 'uppercase' }}>RATA-RATA / HARI</span>
              <div style={{ fontSize: '1.02rem', fontWeight: '900', color: T.info, marginTop: '2px' }}>
                {formatRupiah(salesTrendChartData.length > 0 ? Math.round(kpiMetrics.totalRevenue / salesTrendChartData.length) : 0)}
              </div>
            </div>
            <div style={{ background: T.cardBg2, border: `1px solid rgba(245, 158, 11, 0.3)`, borderRadius: '8px', padding: '8px 12px', position: 'relative', overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.64rem', color: '#f59e0b', fontWeight: '800', textTransform: 'uppercase' }}>🎯 TARGET / HARI</span>
                <span style={{ fontSize: '0.60rem', color: '#f59e0b', border: '1px dashed #f59e0b', padding: '1px 4px', borderRadius: '4px', fontWeight: '800' }}>GARIS SEMU</span>
              </div>
              <div style={{ fontSize: '1.02rem', fontWeight: '900', color: '#f59e0b', marginTop: '2px' }}>
                {formatRupiah(dailyTargetRevenue)}
              </div>
            </div>
            <div style={{ background: T.cardBg2, border: `1px solid ${T.borderStrong}`, borderRadius: '8px', padding: '8px 12px' }}>
              <span style={{ fontSize: '0.64rem', color: T.txtSecondary, fontWeight: '700', textTransform: 'uppercase' }}>TOTAL NOTA</span>
              <div style={{ fontSize: '1.02rem', fontWeight: '900', color: T.accentGreen, marginTop: '2px' }}>{kpiMetrics.txCount} Nota</div>
            </div>
          </div>

          {/* Recharts Component with Target Reference Line */}
          <div style={{ width: '100%', height: '240px' }}>
            <ResponsiveContainer width="100%" height="100%">
              {salesChartType === 'area' ? (
                <AreaChart data={salesTrendChartData} margin={{ top: 12, right: 10, left: -15, bottom: 0 }}>
                  <defs>
                    <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22c55e" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#22c55e" stopOpacity={0.0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={T.gridColor} />
                  <XAxis dataKey="date" stroke={T.txtMuted} fontSize={11} tickLine={false} />
                  <YAxis stroke={T.txtMuted} fontSize={11} tickLine={false} tickFormatter={(v) => `${v / 1000}k`} />
                  <Tooltip 
                    contentStyle={{ background: T.tooltipBg, border: `1px solid ${T.tooltipBorder}`, borderRadius: '8px', color: T.tooltipColor, fontSize: '0.76rem' }} 
                    formatter={(val, name) => [formatRupiah(val), name === 'target' ? 'Target Harian (Garis Putus-Putus)' : 'Penjualan Riil']}
                  />
                  <Legend 
                    verticalAlign="top" 
                    align="right" 
                    wrapperStyle={{ fontSize: '0.70rem', paddingBottom: '4px' }} 
                  />
                  <ReferenceLine 
                    y={dailyTargetRevenue} 
                    stroke="#f59e0b" 
                    strokeDasharray="6 6" 
                    strokeWidth={2}
                  />
                  <Area type="monotone" dataKey="penjualan" name="Penjualan Riil" stroke="#22c55e" strokeWidth={2.5} fill="url(#salesGrad)" />
                  <Line type="monotone" dataKey="target" name="Target Harian (Garis Putus-Putus)" stroke="#f59e0b" strokeDasharray="6 6" strokeWidth={2} dot={false} />
                </AreaChart>
              ) : (
                <BarChart data={salesTrendChartData} margin={{ top: 12, right: 10, left: -15, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={T.gridColor} />
                  <XAxis dataKey="date" stroke={T.txtMuted} fontSize={11} tickLine={false} />
                  <YAxis stroke={T.txtMuted} fontSize={11} tickLine={false} tickFormatter={(v) => `${v / 1000}k`} />
                  <Tooltip 
                    contentStyle={{ background: T.tooltipBg, border: `1px solid ${T.tooltipBorder}`, borderRadius: '8px', color: T.tooltipColor, fontSize: '0.76rem' }} 
                    formatter={(val, name) => [formatRupiah(val), name === 'target' ? 'Target Harian (Garis Putus-Putus)' : 'Penjualan Riil']}
                  />
                  <Legend 
                    verticalAlign="top" 
                    align="right" 
                    wrapperStyle={{ fontSize: '0.70rem', paddingBottom: '4px' }} 
                  />
                  <ReferenceLine 
                    y={dailyTargetRevenue} 
                    stroke="#f59e0b" 
                    strokeDasharray="6 6" 
                    strokeWidth={2}
                  />
                  <Bar dataKey="penjualan" name="Penjualan Riil" fill="#22c55e" radius={[4, 4, 0, 0]} />
                  <Line type="monotone" dataKey="target" name="Target Harian (Garis Putus-Putus)" stroke="#f59e0b" strokeDasharray="6 6" strokeWidth={2} dot={false} />
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>

        {/* Kolom 2: Top 5 Menu Terlaris (Best Performing Products) */}
        <div style={{
          background: T.cardBg,
          border: `1px solid ${T.borderStrong}`,
          borderRadius: '16px',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          gap: '14px',
          boxShadow: T.shadowSm
        }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <h3 style={{ fontSize: '0.96rem', fontWeight: '900', color: T.txtPrimary, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Award size={18} color={T.warning} />
                <span>Top 5 Menu Terlaris</span>
              </h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <button
                  type="button"
                  onClick={() => handleOpenAIInsight('sales')}
                  style={{
                    background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(168, 85, 247, 0.15) 100%)',
                    border: '1px solid rgba(168, 85, 247, 0.3)',
                    color: '#a855f7',
                    padding: '2px 8px',
                    borderRadius: '6px',
                    fontSize: '0.66rem',
                    fontWeight: '800',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    cursor: 'pointer'
                  }}
                  title="Analisis AI untuk Menu Terlaris & Kasir"
                >
                  <Sparkles size={11} />
                  <span>AI Menu</span>
                </button>
                <span style={{ fontSize: '0.68rem', color: T.info, background: T.infoBg, border: `1px solid ${T.infoBorder}`, padding: '2px 8px', borderRadius: '6px', fontWeight: '800' }}>
                  {activeOutletFilter === 'ALL' ? 'Semua Cabang' : (allOutlets.find(o => String(o.id) === String(activeOutletFilter))?.name || 'Cabang Terpilih')}
                </span>
              </div>
            </div>
            <p style={{ fontSize: '0.72rem', color: T.txtSecondary, margin: '0 0 14px 0' }}>
              Peringkat menu dengan volume penjualan tertinggi di {activeOutletFilter === 'ALL' ? 'seluruh cabang restoran' : (allOutlets.find(o => String(o.id) === String(activeOutletFilter))?.name || 'cabang terpilih')}
            </p>

            {/* List Top Menu Items */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {topSellingMenu.length === 0 ? (
                <div style={{ padding: '24px', textAlign: 'center', color: T.txtMuted, fontSize: '0.76rem' }}>
                  Belum ada data penjualan menu pada periode ini.
                </div>
              ) : (
                topSellingMenu.map((menu) => (
                  <div key={menu.rank} style={{ background: T.cardBg2, border: `1px solid ${T.borderStrong}`, borderRadius: '10px', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{
                          width: '20px',
                          height: '20px',
                          borderRadius: '6px',
                          background: menu.rank === 1 ? T.warningBg : T.inputBg,
                          color: menu.rank === 1 ? T.warning : T.txtPrimary,
                          border: `1px solid ${menu.rank === 1 ? T.warningBorder : T.border}`,
                          fontSize: '0.70rem',
                          fontWeight: '900',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          {menu.rank}
                        </span>
                        <span style={{ fontSize: '0.78rem', fontWeight: '800', color: T.txtPrimary }}>
                          {menu.name}
                        </span>
                      </div>
                      <span style={{ fontSize: '0.74rem', fontWeight: '900', color: T.success }}>
                        {formatRupiah(menu.revenue)}
                      </span>
                    </div>

                    {/* Progress Bar & Sold Qty */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ flex: 1, height: '6px', background: T.inputBg, borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{ width: `${Math.min(menu.percentage, 100)}%`, height: '100%', background: menu.rank === 1 ? T.warning : T.info, borderRadius: '4px' }} />
                      </div>
                      <span style={{ fontSize: '0.68rem', color: T.txtSecondary, fontWeight: '700', whiteSpace: 'nowrap' }}>
                        {menu.qty} Porsi ({menu.percentage}%)
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div style={{ background: T.inputBg, padding: '8px 12px', borderRadius: '8px', fontSize: '0.70rem', color: T.txtSecondary, display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Sparkles size={14} color={T.accentGold} />
            <span>Menu terlaris otomatis diperbarui setiap kali kasir menyelesaikan transaksi POS.</span>
          </div>
        </div>

      </div>

      {/* ------------------------------------------------------------- */}
      {/* 4. SECTION 2: KOMPARASI CABANG & ANALISIS HPP (2 KOLOM)       */}
      {/* ------------------------------------------------------------- */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: '16px' }}>
        
        {/* Kolom 1: Perbandingan Omzet Antar Cabang Outlet */}
        <div style={{
          background: T.cardBg,
          border: `1px solid ${T.borderStrong}`,
          borderRadius: '16px',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
          boxShadow: T.shadowSm
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ fontSize: '0.96rem', fontWeight: '900', color: T.txtPrimary, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <BarChart3 size={18} color={T.info} />
                <span>Komparasi Kinerja Antar Cabang</span>
              </h3>
              <p style={{ fontSize: '0.72rem', color: T.txtSecondary, margin: '2px 0 0 0' }}>
                Perbandingan perolehan omzet dan laba bersih di setiap outlet restoran
              </p>
            </div>
          </div>

          {/* Bar Chart Komparasi */}
          <div style={{ width: '100%', height: '200px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={branchComparisonData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={T.gridColor} />
                <XAxis dataKey="name" stroke={T.txtMuted} fontSize={10} tickLine={false} />
                <YAxis stroke={T.txtMuted} fontSize={10} tickLine={false} tickFormatter={(v) => `${v / 1000}k`} />
                <Tooltip contentStyle={{ background: T.tooltipBg, border: `1px solid ${T.tooltipBorder}`, borderRadius: '8px', color: T.tooltipColor, fontSize: '0.76rem' }} formatter={(val) => formatRupiah(val)} />
                <Legend wrapperStyle={{ fontSize: '0.70rem', color: T.txtPrimary }} />
                <Bar dataKey="revenue" name="Total Omzet" fill="#38bdf8" radius={[4, 4, 0, 0]} />
                <Bar dataKey="netProfit" name="Laba Bersih" fill="#22c55e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Table Breakdown */}
          <div style={{ border: `1px solid ${T.borderStrong}`, borderRadius: '10px', overflow: 'hidden', background: T.cardBg2 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.76rem' }}>
              <thead>
                <tr style={{ background: T.tableHeaderBg, color: T.txtPrimary, textTransform: 'uppercase', fontSize: '0.68rem', fontWeight: '800' }}>
                  <th style={{ padding: '8px 12px', textAlign: 'left' }}>Nama Cabang</th>
                  <th style={{ padding: '8px 12px', textAlign: 'right' }}>Omzet</th>
                  <th style={{ padding: '8px 12px', textAlign: 'right' }}>Total Biaya</th>
                  <th style={{ padding: '8px 12px', textAlign: 'right' }}>Laba Bersih</th>
                </tr>
              </thead>
              <tbody>
                {branchComparisonData.map(b => (
                  <tr key={b.id} style={{ borderBottom: `1px solid ${T.border}` }}>
                    <td style={{ padding: '8px 12px', fontWeight: '800', color: T.txtPrimary }}>{b.name}</td>
                    <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: '800', color: T.info }}>{formatRupiah(b.revenue)}</td>
                    <td style={{ padding: '8px 12px', textAlign: 'right', color: T.danger }}>{formatRupiah(b.totalCost)}</td>
                    <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: '900', color: b.netProfit >= 0 ? T.success : T.danger }}>
                      {formatRupiah(b.netProfit)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Kolom 2: Analisis & Efisiensi Batas HPP (COGS Max 60%) */}
        <div style={{
          background: T.cardBg,
          border: `1px solid ${T.borderStrong}`,
          borderRadius: '16px',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          gap: '14px',
          boxShadow: T.shadowSm
        }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <h3 style={{ fontSize: '0.96rem', fontWeight: '900', color: T.txtPrimary, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Percent size={18} color={T.danger} />
                <span>Efisiensi HPP (Target Max 60%)</span>
              </h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <button
                  type="button"
                  onClick={() => handleOpenAIInsight('cogs')}
                  style={{
                    background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(168, 85, 247, 0.15) 100%)',
                    border: '1px solid rgba(168, 85, 247, 0.3)',
                    color: '#a855f7',
                    padding: '2px 8px',
                    borderRadius: '6px',
                    fontSize: '0.66rem',
                    fontWeight: '800',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    cursor: 'pointer'
                  }}
                  title="Audit AI Efisiensi HPP & Biaya"
                >
                  <Sparkles size={11} />
                  <span>AI HPP</span>
                </button>
                <span style={{ fontSize: '0.68rem', color: T.txtSecondary, fontWeight: '700' }}>COGS CONTROL</span>
              </div>
            </div>
            <p style={{ fontSize: '0.72rem', color: T.txtSecondary, margin: '0 0 14px 0' }}>
              Pantau rasio persentase biaya bahan baku terhadap omzet di tiap cabang
            </p>

            {/* List Progress per Outlet */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {branchComparisonData.map(b => (
                <div key={b.id} style={{ background: T.cardBg2, border: `1px solid ${T.borderStrong}`, borderRadius: '10px', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.78rem', fontWeight: '800', color: T.txtPrimary }}>{b.name}</span>
                    <span style={{
                      padding: '2px 8px',
                      borderRadius: '6px',
                      fontSize: '0.68rem',
                      fontWeight: '800',
                      background: b.isOverHppBudget ? T.dangerBg : T.successBg,
                      color: b.isOverHppBudget ? T.danger : T.success,
                      border: `1px solid ${b.isOverHppBudget ? T.dangerBorder : T.successBorder}`
                    }}>
                      {b.isOverHppBudget ? 'Over Budget' : 'Efisien / Aman'}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ flex: 1, height: '8px', background: T.inputBg, borderRadius: '4px', overflow: 'hidden', position: 'relative' }}>
                      <div style={{ width: `${Math.min(b.hppPct, 100)}%`, height: '100%', background: b.isOverHppBudget ? T.danger : T.success, borderRadius: '4px' }} />
                      {/* Target 60% Marker */}
                      <div style={{ position: 'absolute', top: 0, bottom: 0, left: '60%', width: '2px', background: '#f59e0b', zIndex: 2 }} title="Target Ideal 60%" />
                    </div>
                    <span style={{ fontSize: '0.74rem', fontWeight: '900', color: b.isOverHppBudget ? T.danger : T.success, width: '45px', textAlign: 'right' }}>
                      {b.hppPct}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ background: T.inputBg, padding: '8px 12px', borderRadius: '8px', fontSize: '0.70rem', color: T.txtSecondary, display: 'flex', alignItems: 'center', gap: '6px' }}>
            <AlertCircle size={14} color={T.warning} />
            <span>Garis penanda kuning menunjukkan batas ambang HPP ideal maksimum 60%.</span>
          </div>
        </div>

      </div>

      {/* ------------------------------------------------------------- */}
      {/* 5. SECTION 3: DISPARITAS HARGA BAHAN BAKU ANTAR CABANG        */}
      {/* ------------------------------------------------------------- */}
      <div style={{
        background: T.cardBg,
        border: `1px solid ${T.borderStrong}`,
        borderRadius: '16px',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        boxShadow: T.shadowSm
      }}>
        {/* Header & Controls Toolbar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h3 style={{ fontSize: '0.98rem', fontWeight: '900', color: T.txtPrimary, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Package size={19} color={T.accentGold} />
              <span>Disparitas Harga Pembelian Bahan Baku Antar Cabang</span>
            </h3>
            <p style={{ fontSize: '0.74rem', color: T.txtSecondary, margin: '3px 0 0 0' }}>
              Deteksi perbedaan harga beli supplier antar outlet secara transparan untuk efisiensi pengadaan central kitchen
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            {/* Search Bar Bahan Baku */}
            <div style={{ position: 'relative', minWidth: '180px' }}>
              <Search size={14} color={T.txtMuted} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="text"
                placeholder="Cari bahan baku..."
                value={disparitySearchTerm}
                onChange={e => setDisparitySearchTerm(e.target.value)}
                style={{
                  padding: '5px 10px 5px 30px',
                  background: T.inputBg,
                  border: `1px solid ${T.borderStrong}`,
                  borderRadius: '10px',
                  color: T.txtPrimary,
                  fontSize: '0.74rem',
                  fontWeight: '700',
                  outline: 'none',
                  width: '100%'
                }}
              />
            </div>

            {/* Category Filter Dynamically from Master Data */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: T.inputBg, padding: '4px 10px', borderRadius: '10px', border: `1px solid ${T.borderStrong}` }}>
              <Filter size={13} color={T.txtSecondary} />
              <select
                value={selectedIngredientCategory}
                onChange={e => setSelectedIngredientCategory(e.target.value)}
                style={{ background: 'transparent', border: 'none', color: T.txtPrimary, fontSize: '0.74rem', fontWeight: '800', cursor: 'pointer', outline: 'none' }}
              >
                <option value="ALL">Semua Kategori</option>
                {dynamicIngredientCategories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            {/* View Mode Toggle: Table vs Cards */}
            <div style={{ display: 'flex', background: T.cardBg2, padding: '3px', borderRadius: '9px', border: `1px solid ${T.borderStrong}` }}>
              <button
                type="button"
                onClick={() => setDisparityViewMode('table')}
                style={{
                  padding: '4px 10px',
                  borderRadius: '7px',
                  border: 'none',
                  background: disparityViewMode === 'table' ? T.primary : 'transparent',
                  color: disparityViewMode === 'table' ? T.txtInverse : T.txtSecondary,
                  fontSize: '0.72rem',
                  fontWeight: '800',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  cursor: 'pointer'
                }}
                title="Tampilan Tabel Matriks"
              >
                <List size={13} />
                <span>Tabel</span>
              </button>
              <button
                type="button"
                onClick={() => setDisparityViewMode('cards')}
                style={{
                  padding: '4px 10px',
                  borderRadius: '7px',
                  border: 'none',
                  background: disparityViewMode === 'cards' ? T.primary : 'transparent',
                  color: disparityViewMode === 'cards' ? T.txtInverse : T.txtSecondary,
                  fontSize: '0.72rem',
                  fontWeight: '800',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  cursor: 'pointer'
                }}
                title="Tampilan Kartu Rinci"
              >
                <LayoutGrid size={13} />
                <span>Kartu</span>
              </button>
            </div>

            {/* AI Purchasing Button */}
            <button
              type="button"
              onClick={() => handleOpenAIInsight('purchasing')}
              style={{
                background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(168, 85, 247, 0.15) 100%)',
                border: '1px solid rgba(168, 85, 247, 0.3)',
                color: '#a855f7',
                padding: '5px 12px',
                borderRadius: '9px',
                fontSize: '0.74rem',
                fontWeight: '800',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                cursor: 'pointer'
              }}
              title="Analisis AI Disparitas Harga Supplier"
            >
              <Sparkles size={13} />
              <span>AI Purchasing</span>
            </button>
          </div>
        </div>

        {/* Quick Date Range Tabs for Disparitas Section (Interactive Pills) */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '8px',
          padding: '8px 14px',
          background: T.controlBg,
          borderRadius: '12px',
          border: `1px solid ${T.border}`
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.74rem', fontWeight: '800', color: T.accentGold, marginRight: '4px' }}>
            <Calendar size={14} color={T.accentGold} />
            <span>Periode Pembelian:</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
            {[
              { id: 'today', label: 'Hari Ini' },
              { id: 'yesterday', label: 'Kemarin' },
              { id: 'last_week', label: 'Pekan Lalu (Sen-Min)' },
              { id: 'this_month', label: 'Bulan Ini' },
              { id: 'last_month', label: 'Bulan Lalu' },
              { id: '7days', label: '7 Hari Terakhir' },
              { id: 'custom', label: 'Rentang Waktu 📅' },
              { id: 'all', label: 'Semua Waktu' }
            ].map(tab => {
              const isActive = disparityDatePreset === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setDisparityDatePreset(tab.id);
                    if (tab.id === 'custom' && (!disparityCustomStartDate || !disparityCustomEndDate)) {
                      const d = new Date();
                      const endStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                      d.setDate(d.getDate() - 6);
                      const startStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                      setDisparityCustomStartDate(startStr);
                      setDisparityCustomEndDate(endStr);
                    }
                  }}
                  style={{
                    padding: '5px 10px',
                    borderRadius: '7px',
                    border: isActive ? `1px solid ${T.accentGold}` : '1px solid transparent',
                    background: isActive ? (isLight ? '#ffffff' : 'rgba(245, 158, 11, 0.20)') : 'transparent',
                    color: isActive ? (isLight ? '#1a6fc4' : '#fbbf24') : T.txtSecondary,
                    fontWeight: isActive ? '900' : '700',
                    fontSize: '0.74rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    transition: 'all 0.15s ease',
                    boxShadow: isActive ? '0 2px 6px rgba(0,0,0,0.1)' : 'none'
                  }}
                >
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Custom Date Widget if selected */}
          {disparityDatePreset === 'custom' && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              marginLeft: 'auto',
              background: T.cardBg,
              padding: '4px 8px',
              borderRadius: '8px',
              border: `1px solid ${T.accentGoldBorder}`
            }}>
              <input
                type="date"
                value={disparityCustomStartDate}
                onChange={e => setDisparityCustomStartDate(e.target.value)}
                style={{
                  padding: '3px 6px',
                  background: T.inputBg,
                  border: `1px solid ${T.borderStrong}`,
                  borderRadius: '6px',
                  color: T.txtPrimary,
                  fontSize: '0.74rem',
                  fontWeight: '700',
                  colorScheme: isLight ? 'light' : 'dark',
                  outline: 'none',
                  cursor: 'pointer'
                }}
              />
              <span style={{ fontSize: '0.70rem', color: T.txtSecondary, fontWeight: '800' }}>s/d</span>
              <input
                type="date"
                value={disparityCustomEndDate}
                onChange={e => setDisparityCustomEndDate(e.target.value)}
                style={{
                  padding: '3px 6px',
                  background: T.inputBg,
                  border: `1px solid ${T.borderStrong}`,
                  borderRadius: '6px',
                  color: T.txtPrimary,
                  fontSize: '0.74rem',
                  fontWeight: '700',
                  colorScheme: isLight ? 'light' : 'dark',
                  outline: 'none',
                  cursor: 'pointer'
                }}
              />
            </div>
          )}
        </div>

        {/* Quick KPI Summary Badges */}
        {(() => {
          const list = ingredientDisparityList.filter(ing => {
            if (!disparitySearchTerm) return true;
            const term = disparitySearchTerm.toLowerCase().trim();
            return (ing.name || '').toLowerCase().includes(term) || resolveIngredientCategory(ing).toLowerCase().includes(term);
          });
          const totalCount = list.length;
          const alertCount = list.filter(i => i.hasDisparityAlert).length;
          const stableCount = totalCount - alertCount;

          return (
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
              <div style={{ background: T.inputBg, border: `1px solid ${T.border}`, padding: '6px 12px', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '0.70rem', color: T.txtSecondary, fontWeight: '700' }}>Dipantau:</span>
                <span style={{ fontSize: '0.78rem', color: T.txtPrimary, fontWeight: '900' }}>{totalCount} Bahan</span>
              </div>
              <div style={{ background: T.dangerBg, border: `1px solid ${T.dangerBorder}`, padding: '6px 12px', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '0.70rem', color: T.danger, fontWeight: '700' }}>⚠️ Disparitas Tinggi:</span>
                <span style={{ fontSize: '0.78rem', color: T.danger, fontWeight: '900' }}>{alertCount} Bahan</span>
              </div>
              <div style={{ background: T.successBg, border: `1px solid ${T.successBorder}`, padding: '6px 12px', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '0.70rem', color: T.success, fontWeight: '700' }}>✅ Harga Stabil:</span>
                <span style={{ fontSize: '0.78rem', color: T.success, fontWeight: '900' }}>{stableCount} Bahan</span>
              </div>
            </div>
          );
        })()}

        {/* Main Content: Matrix Table or Cards */}
        {(() => {
          const list = ingredientDisparityList.filter(ing => {
            if (!disparitySearchTerm) return true;
            const term = disparitySearchTerm.toLowerCase().trim();
            return (ing.name || '').toLowerCase().includes(term) || resolveIngredientCategory(ing).toLowerCase().includes(term);
          });

          if (list.length === 0) {
            return (
              <div style={{ padding: '36px 20px', textAlign: 'center', color: T.txtMuted, fontSize: '0.80rem', background: T.cardBg2, borderRadius: '12px', border: `1px solid ${T.border}` }}>
                Tidak ditemukan data bahan baku yang sesuai dengan kriteria pencarian / kategori ini.
              </div>
            );
          }

          if (disparityViewMode === 'table') {
            return (
              <div style={{ border: `1px solid ${T.borderStrong}`, borderRadius: '12px', overflowX: 'auto', background: T.cardBg2 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.76rem', whiteSpace: 'nowrap' }}>
                  <thead>
                    <tr style={{ background: T.tableHeaderBg, color: T.txtPrimary, fontSize: '0.70rem', textTransform: 'uppercase', fontWeight: '900' }}>
                      <th style={{ padding: '12px 14px', textAlign: 'center', width: '40px' }}>No</th>
                      <th style={{ padding: '12px 14px', textAlign: 'left', minWidth: '220px' }}>Bahan Baku &amp; Kategori</th>
                      {allOutlets.map(o => (
                        <th key={o.id} style={{ padding: '12px 14px', textAlign: 'right', minWidth: '150px' }}>
                          <div style={{ fontWeight: '800', color: T.txtPrimary }}>{o.name}</div>
                          <div style={{ fontSize: '0.62rem', color: T.txtMuted, textTransform: 'none', fontWeight: '600' }}>Harga Beli / Satuan</div>
                        </th>
                      ))}
                      <th style={{ padding: '12px 14px', textAlign: 'right', minWidth: '130px' }}>Termurah vs Termahal</th>
                      <th style={{ padding: '12px 14px', textAlign: 'right', minWidth: '130px' }}>Selisih (Disparitas)</th>
                      <th style={{ padding: '12px 14px', textAlign: 'center', minWidth: '120px' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {list.map((ing, idx) => {
                      const categoryName = resolveIngredientCategory(ing);
                      const unitStr = ing.unit || 'Kg';
                      const hasAlert = ing.hasDisparityAlert;

                      return (
                        <tr 
                          key={idx} 
                          style={{ 
                            borderBottom: `1px solid ${T.border}`, 
                            background: idx % 2 === 0 ? 'transparent' : (T.cardBg || 'rgba(255,255,255,0.01)'),
                            transition: 'background 0.15s ease' 
                          }}
                        >
                          {/* 1. Index */}
                          <td style={{ padding: '12px 14px', textAlign: 'center', color: T.txtMuted, fontWeight: '700' }}>
                            {idx + 1}
                          </td>

                          {/* 2. Bahan Baku Info */}
                          <td style={{ padding: '12px 14px' }}>
                            <div style={{ fontWeight: '900', color: T.txtPrimary, fontSize: '0.80rem' }}>
                              {ing.name}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '3px' }}>
                              <span style={{ fontSize: '0.64rem', color: T.info, fontWeight: '700', background: T.infoBg, padding: '1px 6px', borderRadius: '4px' }}>
                                {categoryName}
                              </span>
                              <span style={{ fontSize: '0.64rem', color: T.txtSecondary, fontWeight: '700' }}>
                                Satuan: {unitStr}
                              </span>
                            </div>
                          </td>

                          {/* 3. Outlet Columns */}
                          {ing.outletPrices.map((op, oIdx) => {
                            const isLowest = ing.minPrice > 0 && op.price === ing.minPrice && hasAlert;
                            const isHighest = ing.maxPrice > 0 && op.price === ing.maxPrice && hasAlert;

                            return (
                              <td 
                                key={oIdx} 
                                style={{ 
                                  padding: '12px 14px', 
                                  textAlign: 'right',
                                  background: isHighest ? 'rgba(239, 68, 68, 0.05)' : isLowest ? 'rgba(34, 197, 94, 0.05)' : 'transparent'
                                }}
                              >
                                <div style={{ 
                                  fontWeight: '900', 
                                  fontSize: '0.78rem',
                                  color: isHighest ? T.danger : isLowest ? T.success : T.txtPrimary 
                                }}>
                                  {formatRupiah(op.price)}
                                </div>
                                <div style={{ marginTop: '2px' }}>
                                  {isLowest && (
                                    <span style={{ fontSize: '0.60rem', fontWeight: '800', padding: '1px 5px', borderRadius: '4px', background: T.successBg, color: T.success, border: `1px solid ${T.successBorder}` }}>
                                      Termurah
                                    </span>
                                  )}
                                  {isHighest && (
                                    <span style={{ fontSize: '0.60rem', fontWeight: '800', padding: '1px 5px', borderRadius: '4px', background: T.dangerBg, color: T.danger, border: `1px solid ${T.dangerBorder}` }}>
                                      Termahal
                                    </span>
                                  )}
                                  {!isLowest && !isHighest && (
                                    <span style={{ fontSize: '0.62rem', color: T.txtMuted }}>
                                      /{unitStr}
                                    </span>
                                  )}
                                </div>
                              </td>
                            );
                          })}

                          {/* 4. Min vs Max */}
                          <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                            <div style={{ fontSize: '0.72rem', color: T.success, fontWeight: '800' }}>
                              Min: {formatRupiah(ing.minPrice)}
                            </div>
                            <div style={{ fontSize: '0.72rem', color: T.danger, fontWeight: '800', marginTop: '2px' }}>
                              Max: {formatRupiah(ing.maxPrice)}
                            </div>
                          </td>

                          {/* 5. Disparity Value */}
                          <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                            <div style={{ 
                              fontWeight: '900', 
                              fontSize: '0.80rem',
                              color: hasAlert ? T.danger : T.txtSecondary 
                            }}>
                              {ing.disparity > 0 ? `+${formatRupiah(ing.disparity)}` : 'Rp 0'}
                            </div>
                            {ing.minPrice > 0 && ing.disparity > 0 && (
                              <div style={{ fontSize: '0.64rem', color: hasAlert ? T.danger : T.txtMuted, fontWeight: '700', marginTop: '1px' }}>
                                (+{((ing.disparity / ing.minPrice) * 100).toFixed(1)}%)
                              </div>
                            )}
                          </td>

                          {/* 6. Status Badge */}
                          <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                            <span style={{
                              fontSize: '0.66rem',
                              fontWeight: '800',
                              padding: '3px 8px',
                              borderRadius: '6px',
                              background: hasAlert ? T.dangerBg : T.successBg,
                              color: hasAlert ? T.danger : T.success,
                              border: `1px solid ${hasAlert ? T.dangerBorder : T.successBorder}`,
                              display: 'inline-block'
                            }}>
                              {hasAlert ? '⚠️ Selisih Tinggi' : '✅ Seragam'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            );
          }

          // Cards View Mode
          return (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '14px' }}>
              {list.map((ing, idx) => {
                const categoryName = resolveIngredientCategory(ing);
                const unitStr = ing.unit || 'Kg';
                const hasAlert = ing.hasDisparityAlert;

                return (
                  <div 
                    key={idx} 
                    style={{ 
                      background: T.cardBg2, 
                      border: `1px solid ${hasAlert ? T.dangerBorder : T.borderStrong}`, 
                      borderRadius: '14px', 
                      padding: '16px', 
                      display: 'flex', 
                      flexDirection: 'column', 
                      gap: '12px',
                      boxShadow: T.shadowSm
                    }}
                  >
                    {/* Card Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                      <div>
                        <div style={{ fontSize: '0.86rem', fontWeight: '900', color: T.txtPrimary }}>
                          {ing.name}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '3px' }}>
                          <span style={{ fontSize: '0.64rem', color: T.info, fontWeight: '700', background: T.infoBg, padding: '1px 6px', borderRadius: '4px' }}>
                            {categoryName}
                          </span>
                          <span style={{ fontSize: '0.66rem', color: T.txtSecondary, fontWeight: '700' }}>
                            Satuan: {unitStr}
                          </span>
                        </div>
                      </div>

                      <span style={{
                        fontSize: '0.68rem',
                        fontWeight: '800',
                        padding: '3px 8px',
                        borderRadius: '6px',
                        background: hasAlert ? T.dangerBg : T.successBg,
                        color: hasAlert ? T.danger : T.success,
                        border: `1px solid ${hasAlert ? T.dangerBorder : T.successBorder}`,
                        whiteSpace: 'nowrap'
                      }}>
                        {hasAlert ? `Selisih: ${formatRupiah(ing.disparity)}` : '✅ Harga Stabil'}
                      </span>
                    </div>

                    {/* Outlet Price Rows */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', background: T.inputBg, padding: '10px', borderRadius: '10px', border: `1px solid ${T.border}` }}>
                      {ing.outletPrices.map((op, oIdx) => {
                        const isLowest = ing.minPrice > 0 && op.price === ing.minPrice && hasAlert;
                        const isHighest = ing.maxPrice > 0 && op.price === ing.maxPrice && hasAlert;

                        return (
                          <div 
                            key={oIdx}
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              padding: '5px 8px',
                              borderRadius: '6px',
                              background: isHighest ? T.dangerBg : isLowest ? T.successBg : 'transparent'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{ fontSize: '0.72rem', fontWeight: '800', color: isHighest ? T.danger : isLowest ? T.success : T.txtPrimary }}>
                                {op.outletName}
                              </span>
                              {isLowest && (
                                <span style={{ fontSize: '0.58rem', fontWeight: '900', color: T.success }}>👑 Termurah</span>
                              )}
                              {isHighest && (
                                <span style={{ fontSize: '0.58rem', fontWeight: '900', color: T.danger }}>⚠️ Termahal</span>
                              )}
                            </div>
                            <span style={{ fontSize: '0.76rem', fontWeight: '900', color: isHighest ? T.danger : isLowest ? T.success : T.txtPrimary }}>
                              {formatRupiah(op.price)}
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    {/* Card Footer Summary */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.68rem', color: T.txtMuted, borderTop: `1px solid ${T.border}`, paddingTop: '8px' }}>
                      <span>Termurah: <strong style={{ color: T.success }}>{formatRupiah(ing.minPrice)}</strong></span>
                      <span>Termahal: <strong style={{ color: T.danger }}>{formatRupiah(ing.maxPrice)}</strong></span>
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })()}
      </div>



      {/* ------------------------------------------------------------- */}
      {/* 7. DASHBOARD AI INSIGHT MODAL                                 */}
      {/* ------------------------------------------------------------- */}
      <DashboardAIInsightModal
        isOpen={showAIModal}
        onClose={() => setShowAIModal(false)}
        initialTab={aiModalTab}
        kpiMetrics={kpiMetrics}
        salesTrendData={salesTrendChartData}
        topSellingMenu={topSellingMenu}
        branchComparisonData={branchComparisonData}
        ingredientDisparityList={ingredientDisparityList}
        allOutlets={allOutlets}
        activeOutletFilter={activeOutletFilter}
        dateRangePreset={dateRangePreset}
        themeMode={themeMode}
      />



    </div>
  );
}
