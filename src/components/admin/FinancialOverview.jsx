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
  X
} from 'lucide-react';
import SystemIntegrityBoard from './SystemIntegrityBoard';
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
  Cell
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
    } else if (selectedBranch === 'ALL' || selectedBranch === 'Semua Restoran (Konsolidasi)') {
      setActiveOutletFilter('ALL');
    }
  }, [selectedBranch]);

  const [dateRangePreset, setDateRangePreset] = useState('7days'); // 'today', 'yesterday', '7days', '30days', 'this_month', 'custom'
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [salesChartType, setSalesChartType] = useState('area'); // 'area' | 'bar'
  const [omzetChartType, setOmzetChartType] = useState('bar'); // 'bar' | 'area'
  const [selectedIngredientCategory, setSelectedIngredientCategory] = useState('ALL');
  const [txTypeFilter, setTxTypeFilter] = useState('ALL'); // 'ALL' | 'income' | 'expense'
  const [isAnalyzingAI, setIsAnalyzingAI] = useState(false);
  const [aiLastUpdated, setAiLastUpdated] = useState('Baru saja (Real-time)');
  const [showAIModal, setShowAIModal] = useState(false);
  const [aiModalTab, setAiModalTab] = useState('summary');

  // Currency Formatter
  const formatRupiah = (val) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val || 0);
  };

  // Helper Date Matcher (Local Time YYYY-MM-DD)
  const todayStr = useMemo(() => new Date().toLocaleDateString('en-CA'), []);

  // Compute Active Dates List based on Preset
  const activeDateList = useMemo(() => {
    const dates = [];
    const today = new Date();

    if (dateRangePreset === 'today') {
      dates.push(todayStr);
    } else if (dateRangePreset === 'yesterday') {
      const yest = new Date();
      yest.setDate(today.getDate() - 1);
      dates.push(yest.toLocaleDateString('en-CA'));
    } else if (dateRangePreset === '7days') {
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(today.getDate() - i);
        dates.push(d.toLocaleDateString('en-CA'));
      }
    } else if (dateRangePreset === '30days') {
      for (let i = 29; i >= 0; i--) {
        const d = new Date();
        d.setDate(today.getDate() - i);
        dates.push(d.toLocaleDateString('en-CA'));
      }
    } else if (dateRangePreset === 'this_month') {
      const year = today.getFullYear();
      const month = today.getMonth();
      const firstDay = new Date(year, month, 1);
      let curr = new Date(firstDay);
      while (curr <= today) {
        dates.push(curr.toLocaleDateString('en-CA'));
        curr.setDate(curr.getDate() + 1);
      }
    } else if (dateRangePreset === 'custom' && customStartDate && customEndDate) {
      let curr = new Date(customStartDate);
      const end = new Date(customEndDate);
      while (curr <= end) {
        dates.push(curr.toLocaleDateString('en-CA'));
        curr.setDate(curr.getDate() + 1);
      }
    } else {
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(today.getDate() - i);
        dates.push(d.toLocaleDateString('en-CA'));
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
      const d = String(t.date || t.entry_date || t.transaction_date || t.timestamp || todayStr).substring(0, 10);
      return datesSet.has(d) && matchesBranch(t, activeOutletFilter);
    });

    const txSalesAmount = periodTx.reduce((sum, t) => sum + (Number(t.amount) || Number(t.total) || 0), 0);
    const txCount = periodTx.length;

    // Approved Finance
    const periodApproved = allApprovedFinance.filter(f => {
      const d = String(f.date || f.entry_date || f.created_at || todayStr).substring(0, 10);
      return datesSet.has(d) && matchesBranch(f, activeOutletFilter);
    });

    const manualSalesAmount = periodApproved.reduce((sum, f) => sum + (Number(f.net_sales) || 0), 0);
    const periodCogs = periodApproved.reduce((sum, f) => sum + (Number(f.cogs) || 0), 0);
    const periodOpex = periodApproved.reduce((sum, f) => sum + (Number(f.operational) || 0) + (Number(f.gaji) || 0) + (Number(f.other_costs) || 0), 0);

    // Expense Records
    const periodExpenseRecs = allFinancialRecords.filter(f => {
      const d = String(f.date || f.entry_date || f.created_at || todayStr).substring(0, 10);
      return f.type === 'expense' && datesSet.has(d) && matchesBranch(f, activeOutletFilter);
    }).reduce((sum, f) => sum + (Number(f.amount) || 0), 0);

    let totalQtySold = 0;
    periodTx.forEach(t => {
      if (Array.isArray(t.items) && t.items.length > 0) {
        t.items.forEach(it => {
          totalQtySold += Number(it.qty || it.quantity || 1);
        });
      } else {
        totalQtySold += Number(t.qty || t.item_count || 1);
      }
    });

    const totalRevenue = Math.max(txSalesAmount, manualSalesAmount);
    const opexTotal = periodOpex + periodExpenseRecs;
    const totalExpense = periodCogs + opexTotal;
    const netProfit = totalRevenue - totalExpense;
    const profitMargin = totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(1) : '0.0';
    const avgTicket = txCount > 0 ? Math.round(totalRevenue / txCount) : 0;
    const cogsPct = totalRevenue > 0 ? ((periodCogs / totalRevenue) * 100).toFixed(1) : '0.0';
    const opexPct = totalRevenue > 0 ? ((opexTotal / totalRevenue) * 100).toFixed(1) : '0.0';
    const itemsPerTicket = txCount > 0 ? (totalQtySold / txCount).toFixed(1) : '0.0';

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
      activeOutletCount: allOutlets.length
    };
  }, [activeDateList, allSalesTx, allApprovedFinance, allFinancialRecords, activeOutletFilter, allOutlets.length, todayStr]);

  // ------------------------------------------------------------------
  // 2. SALES TREND DATA (DAILY CHART)
  // ------------------------------------------------------------------
  const salesTrendChartData = useMemo(() => {
    const monthNames = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];

    return activeDateList.map(dateStr => {
      const parts = dateStr.split('-');
      const shortLabel = parts.length === 3 ? `${parseInt(parts[2], 10)} ${monthNames[parseInt(parts[1], 10) - 1] || ''}` : dateStr;

      const dayTxs = allSalesTx.filter(t => (String(t.date || t.entry_date || t.transaction_date || t.timestamp || todayStr).substring(0, 10) === dateStr) && matchesBranch(t, activeOutletFilter));
      const txSum = dayTxs.reduce((sum, t) => sum + (Number(t.amount) || Number(t.total) || 0), 0);

      const dayApproved = allApprovedFinance.filter(f => (String(f.date || f.entry_date || f.created_at || todayStr).substring(0, 10) === dateStr) && matchesBranch(f, activeOutletFilter));
      const approvedSum = dayApproved.reduce((sum, f) => sum + (Number(f.net_sales) || 0), 0);

      const dayRevenue = Math.max(txSum, approvedSum);
      const dayCount = dayTxs.length;

      return {
        fullDate: dateStr,
        date: shortLabel,
        penjualan: dayRevenue,
        transaksi: dayCount
      };
    });
  }, [activeDateList, allSalesTx, allApprovedFinance, activeOutletFilter, todayStr]);

  // ------------------------------------------------------------------
  // 3. TOP SELLING PRODUCTS (TOP 5 MENU TERLARIS)
  // ------------------------------------------------------------------
  const topSellingMenu = useMemo(() => {
    const menuMap = new Map();
    const datesSet = new Set(activeDateList);

    const relevantTxs = allSalesTx.filter(t => {
      const d = String(t.date || t.entry_date || t.transaction_date || t.timestamp || todayStr).substring(0, 10);
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
          return mName === ingNameLower && mOId === oIdStr && (mType.includes('in') || mType.includes('masuk') || mType.includes('beli'));
        });
        if (matchedStockIn.length > 0) {
          const latestStock = matchedStockIn[matchedStockIn.length - 1];
          foundPrice = Number(latestStock.price || latestStock.cost || latestStock.unit_price || 0);
        }

        // 2. Check approvedLogistics
        if (!foundPrice) {
          (masterData?.approvedLogistics || []).forEach(log => {
            if (String(log.outlet_id || log.branch_id || '') === oIdStr) {
              const items = log.items || log.ingredients || [];
              items.forEach(it => {
                const itName = (it.ingredient_name || it.name || it.item_name || '').toLowerCase().trim();
                if (itName === ingNameLower && Number(it.price_per_unit || it.cost || it.price || 0) > 0) {
                  foundPrice = Number(it.price_per_unit || it.cost || it.price);
                }
              });
            }
          });
        }

        // 3. Check approvedFinanceDaily / manualEntryRecords cogs rows
        if (!foundPrice) {
          const allReps = [...(masterData?.approvedFinanceDaily || []), ...(masterData?.manualEntryRecords || [])];
          allReps.forEach(rep => {
            if (String(rep.outlet_id || rep.branch_id || '') === oIdStr) {
              const rows = rep.expense_rows || rep.cogs_items || rep.cogs_breakdown || [];
              rows.forEach(r => {
                const rName = (r.item_name || r.name || '').toLowerCase().trim();
                if (rName === ingNameLower && Number(r.price_per_unit || r.cost || 0) > 0) {
                  foundPrice = Number(r.price_per_unit || r.cost);
                }
              });
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

  // ------------------------------------------------------------------
  // 6. RECENT TRANSACTIONS FEED
  // ------------------------------------------------------------------
  const feedTransactions = useMemo(() => {
    const rawFeed = (recentTransactions && recentTransactions.length > 0)
      ? recentTransactions
      : allSalesTx.slice(0, 15).map(tx => ({
          id: tx.id,
          date: tx.date || todayStr,
          time: tx.time || '12:00',
          branch_name: tx.branch_name || tx.outlet_name || (allOutlets.find(o => String(o.id) === String(tx.outlet_id))?.name) || 'Restoran Barokah',
          type: 'income',
          category: 'Penjualan POS',
          description: tx.receipt_no ? `Nota: ${tx.receipt_no}` : (tx.description || 'Transaksi POS Kasir'),
          payment_method: tx.payment_method || tx.paymentMethod || 'Tunai (Cash)',
          amount: Number(tx.amount || tx.total || 0)
        }));

    return rawFeed.filter(tx => {
      if (txTypeFilter === 'income') return tx.type === 'income';
      if (txTypeFilter === 'expense') return tx.type === 'expense';
      return true;
    }).slice(0, 8);
  }, [recentTransactions, allSalesTx, allOutlets, txTypeFilter, todayStr]);

  // AI Analysis Trigger
  const handleOpenAIInsight = (tab = 'summary') => {
    setAiModalTab(tab);
    setShowAIModal(true);
  };

  const [showIntegrityModal, setShowIntegrityModal] = useState(false);

  // Deteksi Anomali Ringan untuk Banner Dashboard
  const dashboardAnomaliesCount = useMemo(() => {
    const timeToSec = (tStr) => {
      if (!tStr) return 0;
      const [h, m, s] = String(tStr).split(':').map(Number);
      return (h || 0) * 3600 + (m || 0) * 60 + (s || 0);
    };

    let count = 0;
    const sorted = [...allSalesTx].sort((a, b) => timeToSec(a.time) - timeToSec(b.time));
    for (let i = 0; i < sorted.length; i++) {
      const amt = Number(sorted[i].amount || 0);
      if (amt > 0 && amt < 5000) count++;
      if (i > 0) {
        const prev = sorted[i - 1];
        const secDiff = Math.abs(timeToSec(sorted[i].time) - timeToSec(prev.time));
        if (secDiff <= 60 && amt === Number(prev.amount || 0) && amt > 0 && sorted[i].branch_name === prev.branch_name) {
          count++;
        }
      }
    }
    return count;
  }, [allSalesTx]);

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
        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          
          {/* Outlet Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: T.inputBg, padding: '4px 10px', borderRadius: '10px', border: `1px solid ${T.borderStrong}` }}>
            <Building2 size={15} color={T.txtSecondary} />
            <select
              value={activeOutletFilter}
              onChange={e => setActiveOutletFilter(e.target.value)}
              style={{ background: 'transparent', border: 'none', color: T.txtPrimary, fontSize: '0.78rem', fontWeight: '800', cursor: 'pointer', outline: 'none' }}
            >
              <option value="ALL">Semua Cabang Restoran</option>
              {allOutlets.map(o => (
                <option key={o.id} value={o.id}>{o.name}</option>
              ))}
            </select>
          </div>

          {/* Date Preset Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: T.inputBg, padding: '4px 10px', borderRadius: '10px', border: `1px solid ${T.borderStrong}` }}>
            <Calendar size={15} color={T.txtSecondary} />
            <select
              value={dateRangePreset}
              onChange={e => setDateRangePreset(e.target.value)}
              style={{ background: 'transparent', border: 'none', color: T.txtPrimary, fontSize: '0.78rem', fontWeight: '800', cursor: 'pointer', outline: 'none' }}
            >
              <option value="today">Hari Ini</option>
              <option value="yesterday">Kemarin</option>
              <option value="7days">7 Hari Terakhir</option>
              <option value="30days">30 Hari Terakhir</option>
              <option value="this_month">Bulan Ini (MTD)</option>
              <option value="custom">Rentang Tanggal Khusus...</option>
            </select>
          </div>

          {/* Custom Date Pickers if selected */}
          {dateRangePreset === 'custom' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: T.cardBg2, padding: '4px 8px', borderRadius: '10px', border: `1px solid ${T.borderStrong}` }}>
              <input
                type="date"
                value={customStartDate}
                onChange={e => setCustomStartDate(e.target.value)}
                style={{ padding: '4px 6px', background: T.inputBg, border: `1px solid ${T.border}`, borderRadius: '6px', color: T.txtPrimary, fontSize: '0.74rem' }}
              />
              <span style={{ fontSize: '0.70rem', color: T.txtSecondary }}>s/d</span>
              <input
                type="date"
                value={customEndDate}
                onChange={e => setCustomEndDate(e.target.value)}
                style={{ padding: '4px 6px', background: T.inputBg, border: `1px solid ${T.border}`, borderRadius: '6px', color: T.txtPrimary, fontSize: '0.74rem' }}
              />
            </div>
          )}

          {/* AI Refresh Button */}
          <button
            type="button"
            onClick={handleTriggerAI}
            style={{
              padding: '7px 14px',
              borderRadius: '10px',
              fontSize: '0.76rem',
              fontWeight: '800',
              cursor: 'pointer',
              background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
              color: '#ffffff',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 3px 10px rgba(99,102,241,0.35)',
              transition: 'transform 0.15s ease'
            }}
          >
            <Sparkles size={14} className={isAnalyzingAI ? "animate-spin" : ""} />
            <span>{isAnalyzingAI ? "Memproses AI..." : "Insight AI"}</span>
          </button>
        </div>
      </div>

      {/* BANNER DETEKSI ANOMALI & GUARD INTEGRITAS */}
      {dashboardAnomaliesCount > 0 && (
        <div 
          style={{
            background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.15) 0%, rgba(245, 158, 11, 0.1) 100%)',
            border: '1px solid rgba(239, 68, 68, 0.35)',
            borderRadius: '14px',
            padding: '14px 18px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px',
            boxShadow: '0 4px 14px rgba(239, 68, 68, 0.15)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '8px', borderRadius: '10px', background: 'rgba(239, 68, 68, 0.2)', border: '1px solid rgba(239, 68, 68, 0.4)' }}>
              <ShieldAlert size={20} color="#ef4444" />
            </div>
            <div>
              <div style={{ fontSize: '0.88rem', fontWeight: '800', color: T.txtPrimary, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>Peringatan Integritas: Ditemukan {dashboardAnomaliesCount} Potensi Transaksi Anomali / Double Input</span>
                <span style={{ fontSize: '0.68rem', background: '#ef4444', color: '#fff', padding: '1px 6px', borderRadius: '10px' }}>PERLU REVIEW</span>
              </div>
              <div style={{ fontSize: '0.76rem', color: T.txtSecondary, marginTop: '2px' }}>
                Papan informasi mendeteksi adanya transaksi bernilai rendah atau pesanan serupa dalam rentang detik.
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowIntegrityModal(true)}
            style={{
              padding: '8px 16px',
              borderRadius: '10px',
              fontSize: '0.78rem',
              fontWeight: '800',
              cursor: 'pointer',
              background: '#ef4444',
              color: '#ffffff',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 2px 8px rgba(239, 68, 68, 0.4)'
            }}
          >
            <ShieldAlert size={14} />
            <span>Buka Papan Audit & Anomali</span>
          </button>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 2. EXECUTIVE KPI CARDS (8 CARDS - 4x2 SYMMETRICAL GRID)       */}
      {/* ------------------------------------------------------------- */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '14px' }}>
        
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

        {/* KPI 7: BIAYA OPERASIONAL & GAJI */}
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
              BIAYA OPERASIONAL &amp; GAJI
            </span>
            <div style={{ padding: '6px', borderRadius: '8px', background: T.accentGoldBg, color: T.accentGold }}>
              <Building2 size={16} />
            </div>
          </div>
          <div>
            <div style={{ fontSize: '1.35rem', fontWeight: '900', color: T.accentGold, letterSpacing: '-0.02em' }}>
              {formatRupiah(kpiMetrics.periodOpex)}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.70rem', color: T.txtSecondary, fontWeight: '600', marginTop: '4px' }}>
              <span>Rasio OPEX: {kpiMetrics.opexPct}% dari Omzet</span>
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

          {/* Quick Metrics Bar */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
            <div style={{ background: T.cardBg2, border: `1px solid ${T.borderStrong}`, borderRadius: '8px', padding: '8px 12px' }}>
              <span style={{ fontSize: '0.64rem', color: T.txtSecondary, fontWeight: '700', textTransform: 'uppercase' }}>TOTAL OMZET PERIODE</span>
              <div style={{ fontSize: '1.05rem', fontWeight: '900', color: T.success, marginTop: '2px' }}>{formatRupiah(kpiMetrics.totalRevenue)}</div>
            </div>
            <div style={{ background: T.cardBg2, border: `1px solid ${T.borderStrong}`, borderRadius: '8px', padding: '8px 12px' }}>
              <span style={{ fontSize: '0.64rem', color: T.txtSecondary, fontWeight: '700', textTransform: 'uppercase' }}>RATA-RATA / HARI</span>
              <div style={{ fontSize: '1.05rem', fontWeight: '900', color: T.info, marginTop: '2px' }}>
                {formatRupiah(salesTrendChartData.length > 0 ? Math.round(kpiMetrics.totalRevenue / salesTrendChartData.length) : 0)}
              </div>
            </div>
            <div style={{ background: T.cardBg2, border: `1px solid ${T.borderStrong}`, borderRadius: '8px', padding: '8px 12px' }}>
              <span style={{ fontSize: '0.64rem', color: T.txtSecondary, fontWeight: '700', textTransform: 'uppercase' }}>TOTAL NOTA TRANSAKSI</span>
              <div style={{ fontSize: '1.05rem', fontWeight: '900', color: T.accentGreen, marginTop: '2px' }}>{kpiMetrics.txCount} Nota</div>
            </div>
          </div>

          {/* Recharts Component */}
          <div style={{ width: '100%', height: '240px' }}>
            <ResponsiveContainer width="100%" height="100%">
              {salesChartType === 'area' ? (
                <AreaChart data={salesTrendChartData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
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
                    formatter={(val) => formatRupiah(val)}
                  />
                  <Area type="monotone" dataKey="penjualan" name="Total Penjualan" stroke="#22c55e" strokeWidth={2.5} fill="url(#salesGrad)" />
                </AreaChart>
              ) : (
                <BarChart data={salesTrendChartData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={T.gridColor} />
                  <XAxis dataKey="date" stroke={T.txtMuted} fontSize={11} tickLine={false} />
                  <YAxis stroke={T.txtMuted} fontSize={11} tickLine={false} tickFormatter={(v) => `${v / 1000}k`} />
                  <Tooltip 
                    contentStyle={{ background: T.tooltipBg, border: `1px solid ${T.tooltipBorder}`, borderRadius: '8px', color: T.tooltipColor, fontSize: '0.76rem' }} 
                    formatter={(val) => formatRupiah(val)}
                  />
                  <Bar dataKey="penjualan" name="Total Penjualan" fill="#22c55e" radius={[4, 4, 0, 0]} />
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
        gap: '14px',
        boxShadow: T.shadowSm
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <h3 style={{ fontSize: '0.96rem', fontWeight: '900', color: T.txtPrimary, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Package size={18} color={T.accentGold} />
              <span>Disparitas Harga Pembelian Bahan Baku Antar Cabang</span>
            </h3>
            <p style={{ fontSize: '0.72rem', color: T.txtSecondary, margin: '2px 0 0 0' }}>
              Deteksi perbedaan harga beli supplier antar outlet untuk efisiensi pengadaan central kitchen
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => handleOpenAIInsight('purchasing')}
              style={{
                background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(168, 85, 247, 0.15) 100%)',
                border: '1px solid rgba(168, 85, 247, 0.3)',
                color: '#a855f7',
                padding: '4px 10px',
                borderRadius: '8px',
                fontSize: '0.72rem',
                fontWeight: '800',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                cursor: 'pointer'
              }}
              title="Analisis AI Disparitas Harga Supplier"
            >
              <Sparkles size={12} />
              <span>AI Purchasing</span>
            </button>

            {/* Category Filter Dynamically from Master Data */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: T.inputBg, padding: '4px 10px', borderRadius: '10px', border: `1px solid ${T.borderStrong}` }}>
              <Filter size={14} color={T.txtSecondary} />
              <select
                value={selectedIngredientCategory}
                onChange={e => setSelectedIngredientCategory(e.target.value)}
                style={{ background: 'transparent', border: 'none', color: T.txtPrimary, fontSize: '0.76rem', fontWeight: '800', cursor: 'pointer', outline: 'none' }}
              >
                <option value="ALL">Semua Kategori Bahan</option>
                {dynamicIngredientCategories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Grid Disparitas Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '10px' }}>
          {ingredientDisparityList.length === 0 ? (
            <div style={{ gridColumn: '1 / -1', padding: '24px', textAlign: 'center', color: T.txtMuted, fontSize: '0.78rem' }}>
              Belum ada data bahan baku terdaftar pada kategori ini.
            </div>
          ) : (
            ingredientDisparityList.map((ing, idx) => (
              <div key={idx} style={{ background: T.cardBg2, border: `1px solid ${T.borderStrong}`, borderRadius: '12px', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '0.80rem', fontWeight: '800', color: T.txtPrimary }}>{ing.name}</span>
                      <span style={{ fontSize: '0.66rem', color: T.txtSecondary }}>/ {ing.unit || 'Kg'}</span>
                    </div>
                    <div style={{ fontSize: '0.62rem', color: T.info, fontWeight: '700', marginTop: '2px' }}>
                      Kategori: {resolveIngredientCategory(ing)}
                    </div>
                  </div>
                  <span style={{
                    fontSize: '0.68rem',
                    fontWeight: '800',
                    padding: '2px 8px',
                    borderRadius: '6px',
                    background: ing.hasDisparityAlert ? T.dangerBg : T.successBg,
                    color: ing.hasDisparityAlert ? T.danger : T.success,
                    border: `1px solid ${ing.hasDisparityAlert ? T.dangerBorder : T.successBorder}`
                  }}>
                    {ing.hasDisparityAlert ? `Selisih: ${formatRupiah(ing.disparity)}` : 'Harga Stabil'}
                  </span>
                </div>

                {/* Per Outlet Price Tags (5 Cabang Lengkap) */}
                <div style={{ display: 'grid', gridTemplateColumns: `repeat(${allOutlets.length || 5}, 1fr)`, gap: '4px', fontSize: '0.68rem' }}>
                  {ing.outletPrices.map((op, oIdx) => {
                    const isLowest = ing.minPrice > 0 && op.price === ing.minPrice && ing.hasDisparityAlert;
                    const isHighest = ing.maxPrice > 0 && op.price === ing.maxPrice && ing.hasDisparityAlert;
                    const shortName = op.outletName
                      ? op.outletName
                          .replace(/AYAM PECAK 2001 SEAFOOD /i, 'PCK ')
                          .replace(/AYAM BAKAR SURABAYA /i, 'SBY ')
                          .replace(/PECEL LELE PAK HAJI /i, 'PLP ')
                      : `Cabang #${oIdx + 1}`;

                    return (
                      <div 
                        key={oIdx} 
                        style={{ 
                          background: isHighest ? T.dangerBg : isLowest ? T.successBg : T.inputBg, 
                          padding: '5px 4px', 
                          borderRadius: '6px', 
                          textAlign: 'center', 
                          border: `1px solid ${isHighest ? T.dangerBorder : isLowest ? T.successBorder : T.border}` 
                        }}
                        title={`${op.outletName}: ${formatRupiah(op.price)}`}
                      >
                        <div style={{ color: isHighest ? T.danger : isLowest ? T.success : T.txtSecondary, fontSize: '0.60rem', fontWeight: '800', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {shortName}
                        </div>
                        <div style={{ fontWeight: '900', color: isHighest ? T.danger : isLowest ? T.success : T.txtPrimary, marginTop: '2px', fontSize: '0.66rem' }}>
                          {formatRupiah(op.price)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 6. SECTION 4: FEED LOG TRANSAKSI HARIAN TERKINI               */}
      {/* ------------------------------------------------------------- */}
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <h3 style={{ fontSize: '0.96rem', fontWeight: '900', color: T.txtPrimary, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Clock size={18} color={T.accentGreen} />
              <span>Feed Transaksi Kasir &amp; Pengeluaran Harian Terkini</span>
            </h3>
            <p style={{ fontSize: '0.72rem', color: T.txtSecondary, margin: '2px 0 0 0' }}>
              Log masukan kasir POS dan pengeluaran terverifikasi dengan keterangan waktu nyata
            </p>
          </div>

          {/* Type Filter Buttons */}
          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              type="button"
              onClick={() => setTxTypeFilter('ALL')}
              style={{
                padding: '4px 12px',
                background: txTypeFilter === 'ALL' ? T.borderStrong : 'transparent',
                color: txTypeFilter === 'ALL' ? T.txtPrimary : T.txtSecondary,
                border: `1px solid ${T.borderStrong}`,
                borderRadius: '8px',
                fontSize: '0.72rem',
                fontWeight: '800',
                cursor: 'pointer'
              }}
            >
              Semua Tipe
            </button>
            <button
              type="button"
              onClick={() => setTxTypeFilter('income')}
              style={{
                padding: '4px 12px',
                background: txTypeFilter === 'income' ? T.successBg : 'transparent',
                color: txTypeFilter === 'income' ? T.success : T.txtSecondary,
                border: `1px solid ${txTypeFilter === 'income' ? T.successBorder : T.borderStrong}`,
                borderRadius: '8px',
                fontSize: '0.72rem',
                fontWeight: '800',
                cursor: 'pointer'
              }}
            >
              Pemasukan (Sales)
            </button>
            <button
              type="button"
              onClick={() => setTxTypeFilter('expense')}
              style={{
                padding: '4px 12px',
                background: txTypeFilter === 'expense' ? T.dangerBg : 'transparent',
                color: txTypeFilter === 'expense' ? T.danger : T.txtSecondary,
                border: `1px solid ${txTypeFilter === 'expense' ? T.dangerBorder : T.borderStrong}`,
                borderRadius: '8px',
                fontSize: '0.72rem',
                fontWeight: '800',
                cursor: 'pointer'
              }}
            >
              Pengeluaran (OPEX)
            </button>
          </div>
        </div>

        {/* Modern Transaction Feed Table */}
        <div style={{ border: `1px solid ${T.borderStrong}`, borderRadius: '12px', overflow: 'hidden', background: T.cardBg2 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
            <thead>
              <tr style={{ background: T.tableHeaderBg, color: T.txtPrimary, fontSize: '0.70rem', textTransform: 'uppercase', fontWeight: '800' }}>
                <th style={{ padding: '10px 14px', textAlign: 'left' }}>Waktu &amp; Tanggal</th>
                <th style={{ padding: '10px 14px', textAlign: 'left' }}>Outlet Cabang</th>
                <th style={{ padding: '10px 14px', textAlign: 'center' }}>Tipe</th>
                <th style={{ padding: '10px 14px', textAlign: 'left' }}>Kategori &amp; Deskripsi</th>
                <th style={{ padding: '10px 14px', textAlign: 'left' }}>Metode</th>
                <th style={{ padding: '10px 14px', textAlign: 'right' }}>Nominal (Rp)</th>
                <th style={{ padding: '10px 14px', textAlign: 'center' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {feedTransactions.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '24px', textAlign: 'center', color: T.txtMuted, fontSize: '0.78rem' }}>
                    Belum ada riwayat transaksi pada filter ini.
                  </td>
                </tr>
              ) : (
                feedTransactions.map(tx => (
                  <tr key={tx.id} style={{ borderBottom: `1px solid ${T.border}`, transition: 'background 0.15s ease' }} className="hover:bg-slate-800/40">
                    {/* WAKTU LENGKAP DENGAN JAM DAN MENIT */}
                    <td style={{ padding: '10px 14px', color: T.txtPrimary, fontWeight: '700', fontSize: '0.74rem' }}>
                      <div>{tx.date}</div>
                      <div style={{ fontSize: '0.64rem', color: T.txtMuted, marginTop: '2px' }}>{tx.time ? tx.time.substring(0, 5) : '12:00'} WIB</div>
                    </td>

                    {/* OUTLET */}
                    <td style={{ padding: '10px 14px', fontWeight: '800', color: T.txtPrimary }}>
                      {tx.branch_name}
                    </td>

                    {/* TIPE */}
                    <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                      <span style={{
                        padding: '3px 8px',
                        borderRadius: '6px',
                        fontSize: '0.68rem',
                        fontWeight: '800',
                        background: tx.type === 'income' ? T.successBg : T.dangerBg,
                        color: tx.type === 'income' ? T.success : T.danger,
                        border: `1px solid ${tx.type === 'income' ? T.successBorder : T.dangerBorder}`
                      }}>
                        {tx.type === 'income' ? 'Pemasukan' : 'Pengeluaran'}
                      </span>
                    </td>

                    {/* KATEGORI & DESKRIPSI */}
                    <td style={{ padding: '10px 14px' }}>
                      <div style={{ fontWeight: '800', color: T.info }}>{tx.category}</div>
                      <div style={{ fontSize: '0.70rem', color: T.txtSecondary, marginTop: '1px' }}>{tx.description}</div>
                    </td>

                    {/* METODE */}
                    <td style={{ padding: '10px 14px', color: T.txtPrimary, fontSize: '0.74rem' }}>
                      {tx.payment_method}
                    </td>

                    {/* NOMINAL */}
                    <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: '900', color: tx.type === 'income' ? T.success : T.danger }}>
                      {tx.type === 'income' ? '+' : '-'}{formatRupiah(tx.amount)}
                    </td>

                    {/* STATUS */}
                    <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                      <span style={{ background: T.successBg, color: T.success, border: `1px solid ${T.successBorder}`, padding: '3px 8px', borderRadius: '6px', fontSize: '0.68rem', fontWeight: '800' }}>
                        Terverifikasi
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
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

      {/* ------------------------------------------------------------- */}
      {/* 8. POPUP MODAL PAPAN INTEGRITAS & AUDIT ANOMALI               */}
      {/* ------------------------------------------------------------- */}
      {showIntegrityModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.85)',
          backdropFilter: 'blur(8px)',
          zIndex: 99999,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '24px'
        }}>
          <div style={{
            background: T.cardBg,
            border: `1px solid ${T.borderStrong}`,
            borderRadius: '20px',
            width: '100%',
            maxWidth: '1200px',
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: '24px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
            position: 'relative'
          }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '12px' }}>
              <button
                onClick={() => setShowIntegrityModal(false)}
                className="btn-secondary"
                style={{ padding: '6px 12px', fontSize: '0.8rem', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                <X size={16} />
                <span>Tutup Papan Audit</span>
              </button>
            </div>
            <SystemIntegrityBoard
              masterData={masterData}
              setMasterData={setMasterData}
              selectedBranch={selectedBranch}
              themeMode={themeMode}
            />
          </div>
        </div>
      )}

    </div>
  );
}
