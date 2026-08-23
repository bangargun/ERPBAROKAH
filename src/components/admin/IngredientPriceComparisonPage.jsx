import React, { useState, useMemo, useCallback } from 'react';
import {
  Scale, Search, TrendingUp, TrendingDown, DollarSign, Filter, Info,
  Check, Layers, AlertTriangle, RotateCcw, ChevronDown, FileSpreadsheet, Printer, Calendar
} from 'lucide-react';
import * as XLSX from 'xlsx';
import PaginationControls from './PaginationControls';
import { getThemePalette } from '../../utils/themeUtils';
import { DoubleCalendarPicker } from './SalesTransactionsPage';

const TABS = [
  { id: 'harga_bahan_outlet', label: 'Harga Satuan Bahan Baku', sublabel: 'Outlet by Outlet' },
  { id: 'qty_bahan_outlet',   label: 'Quantity Bahan Baku',    sublabel: 'Outlet by Outlet' },
  { id: 'harga_beban_outlet', label: 'Harga Satuan Beban',     sublabel: 'Outlet by Outlet' },
  { id: 'qty_beban_outlet',   label: 'Quantity Beban',          sublabel: 'Outlet by Outlet' },
];

const TAB_DESC = {
  harga_bahan_outlet: 'Harga satuan bahan baku per tanggal per outlet. Baris = tanggal + nama bahan, kolom = tiap outlet. Termurah, Termahal.',
  qty_bahan_outlet:   'Quantity bahan baku yang diterima per tanggal per outlet. Baris = tanggal + nama bahan, kolom = tiap outlet.',
  harga_beban_outlet: 'Harga satuan beban per tanggal per outlet. Baris = tanggal + nama beban, kolom = tiap outlet. Termurah, Termahal.',
  qty_beban_outlet:   'Quantity beban operasional per tanggal per outlet. Baris = tanggal + nama beban, kolom = tiap outlet.',
};

export default function IngredientPriceComparisonPage({ masterData, selectedBranch, themeMode = 'dark' }) {
  const T = getThemePalette(themeMode);
  const isLight = themeMode === 'soft_blue' || themeMode === 'light';

  const [activeTab, setActiveTab]       = useState('harga_bahan_outlet');
  const [periodViewMode, setPeriodViewMode] = useState('daily'); // 'daily' | 'monthly'
  const [selectedYear, setSelectedYear]     = useState('');
  const [selectedMonth, setSelectedMonth]   = useState('');
  const [startDate, setStartDate]       = useState('');
  const [endDate, setEndDate]           = useState('');
  const [datePreset, setDatePreset]     = useState('all');
  const [showCalendarPopover, setShowCalendarPopover] = useState(false);
  const [searchTerm, setSearchTerm]     = useState('');
  const [selectedItem, setSelectedItem] = useState('ALL');
  const [showItemDropdown, setShowItemDropdown]     = useState(false);
  const [itemDropdownSearch, setItemDropdownSearch] = useState('');
  const [showColumnFilter, setShowColumnFilter]     = useState(false);
  const [currentPage, setCurrentPage]   = useState(1);
  const [pageSize, setPageSize]         = useState(10);

  const handleQuickPreset = (presetKey) => {
    setDatePreset(presetKey);
    setSelectedYear('');
    setSelectedMonth('');
    const today = new Date();
    const toYMD = (dt) => {
      const y = dt.getFullYear();
      const m = String(dt.getMonth() + 1).padStart(2, '0');
      const d = String(dt.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    };

    if (presetKey === 'today') {
      const t = toYMD(today);
      setStartDate(t);
      setEndDate(t);
      setCurrentPage(1);
    } else if (presetKey === 'yesterday') {
      const yes = new Date(today);
      yes.setDate(today.getDate() - 1);
      const yStr = toYMD(yes);
      setStartDate(yStr);
      setEndDate(yStr);
      setCurrentPage(1);
    } else if (presetKey === 'last_week') {
      const dayOfWeek = today.getDay();
      const daysSinceMonday = (dayOfWeek === 0 ? 7 : dayOfWeek) - 1;
      const mondayThisWeek = new Date(today);
      mondayThisWeek.setDate(today.getDate() - daysSinceMonday);

      const mondayLastWeek = new Date(mondayThisWeek);
      mondayLastWeek.setDate(mondayThisWeek.getDate() - 7);

      const sundayLastWeek = new Date(mondayThisWeek);
      sundayLastWeek.setDate(mondayThisWeek.getDate() - 1);

      setStartDate(toYMD(mondayLastWeek));
      setEndDate(toYMD(sundayLastWeek));
      setCurrentPage(1);
    } else if (presetKey === 'this_month') {
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      setStartDate(toYMD(firstDay));
      setEndDate(toYMD(today));
      setCurrentPage(1);
    } else if (presetKey === 'last_month') {
      const firstDay = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const lastDay = new Date(today.getFullYear(), today.getMonth(), 0);
      setStartDate(toYMD(firstDay));
      setEndDate(toYMD(lastDay));
      setCurrentPage(1);
    } else if (presetKey === '7days') {
      const past7 = new Date(today);
      past7.setDate(today.getDate() - 6);
      setStartDate(toYMD(past7));
      setEndDate(toYMD(today));
      setCurrentPage(1);
    } else if (presetKey === 'all') {
      setStartDate('');
      setEndDate('');
      setCurrentPage(1);
    }
  };

  const outletsList = useMemo(() => masterData?.outlets || [], [masterData]);
  const [visibleOutletIds, setVisibleOutletIds] = useState(
    () => (masterData?.outlets || []).map(o => String(o.id))
  );

  const getOutletName = (id) => {
    const o = outletsList.find(o => String(o.id) === String(id));
    return o ? o.name : 'Outlet #' + id;
  };

  const fmtDate = (d) => {
    if (!d) return '-';
    if (periodViewMode === 'monthly') {
      try {
        const parts = d.split('-');
        if (parts.length >= 2) {
          const dt = new Date(Number(parts[0]), Number(parts[1]) - 1, 1);
          return dt.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
        }
      } catch { return d; }
    }
    try { return new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }); }
    catch { return d; }
  };

  const allIngredientRecords = useMemo(() => {
    const records = [];
    const deletedLogSet = new Set([
      ...(masterData?.deletedLogisticsIds || []),
      ...(masterData?.deletedReportIds || []),
      ...(masterData?.deletedIngredientIds || [])
    ].map(x => String(x)));

    // 1. From approvedLogistics
    (masterData?.approvedLogistics || []).forEach(log => {
      if (deletedLogSet.has(String(log.id)) || deletedLogSet.has(String(log.report_no || ''))) return;
      const date = String(log.date || log.created_at || '').substring(0, 10);
      const items = log.items || log.ingredients || [];
      items.forEach(item => {
        const name = (item.ingredient_name || item.name || item.item_name || '').trim();
        const unitPrice = Number(item.price_per_unit || item.cost || item.price || 0);
        const qty = Number(item.qty || 1);
        if (name && (unitPrice > 0 || qty > 0)) {
          records.push({
            date: date || new Date().toISOString().substring(0, 10),
            name, unit: item.unit || 'Kg',
            outlet_id: String(log.outlet_id || log.branch_id || outletsList[0]?.id || 1),
            outlet_name: log.outlet_name || getOutletName(log.outlet_id),
            unit_price: unitPrice, qty,
          });
        }
      });
    });

    // 2. From stockMovement (real stock in / purchases)
    (masterData?.stockMovement || []).forEach(mov => {
      if (deletedLogSet.has(String(mov.id))) return;
      const date = String(mov.date || mov.created_at || '').substring(0, 10);
      const name = (mov.item_name || mov.name || mov.ingredient_name || '').trim();
      const unitPrice = Number(mov.price || mov.cost || mov.unit_price || 0);
      const qty = Number(mov.qty || 1);
      const type = String(mov.type || mov.movement_type || '').toLowerCase();
      if (name && (type.includes('in') || type.includes('masuk') || type.includes('beli') || type.includes('purchase')) && unitPrice > 0) {
        records.push({
          date: date || new Date().toISOString().substring(0, 10),
          name, unit: mov.unit || 'Kg',
          outlet_id: String(mov.outlet_id || mov.branch_id || outletsList[0]?.id || 1),
          outlet_name: mov.outlet_name || getOutletName(mov.outlet_id),
          unit_price: unitPrice, qty,
        });
      }
    });

    // 3. From approved daily reports & manual report update expense_rows (where category is HPP/Bahan Baku)
    const reportSources = [
      ...(masterData?.approvedFinanceDaily || []),
      ...(masterData?.manualEntryRecords || [])
    ];
    reportSources.forEach(rep => {
      if (deletedLogSet.has(String(rep.id)) || deletedLogSet.has(String(rep.report_no || ''))) return;
      const date = String(rep.entry_date || rep.date || rep.created_at || '').substring(0, 10);
      const rows = rep.expense_rows || rep.cogs_items || rep.cogs_breakdown || [];
      rows.forEach(r => {
        const cat = String(r.category_type || r.category || '').toLowerCase();
        const name = (r.item_name || r.name || '').trim();
        const price = Number(r.price_per_unit || r.price_unit || r.cost || 0);
        const qty = Number(r.qty || 1);
        if (name && price > 0 && (cat.includes('hpp') || cat.includes('bahan'))) {
          records.push({
            date: date || new Date().toISOString().substring(0, 10),
            name, unit: r.unit || 'Kg',
            outlet_id: String(rep.outlet_id || rep.branch_id || outletsList[0]?.id || 1),
            outlet_name: rep.branch_name || rep.outlet_name || getOutletName(rep.outlet_id),
            unit_price: price, qty,
          });
        }
      });
    });

    // 4. Fallback baseline Master Ingredients HPP for all branches if sparse
    (masterData?.ingredients || []).forEach(ing => {
      if (!ing?.name) return;
      const cost = Number(ing.cost || ing.harga || 0);
      if (cost > 0) {
        outletsList.forEach(otl => {
          records.push({
            date: new Date().toISOString().substring(0, 10),
            name: ing.name.trim(),
            unit: ing.unit || 'Kg',
            outlet_id: String(otl.id),
            outlet_name: otl.name,
            unit_price: cost,
            qty: 1,
            isBaseline: true
          });
        });
      }
    });

    return records;
  }, [masterData, outletsList]);

  const allExpenseRecords = useMemo(() => {
    const records = [];
    const deletedLogSet = new Set([
      ...(masterData?.deletedLogisticsIds || []),
      ...(masterData?.deletedReportIds || [])
    ].map(x => String(x)));

    const addExpenses = (list) => {
      list.forEach(rep => {
        if (deletedLogSet.has(String(rep.id)) || deletedLogSet.has(String(rep.report_no || ''))) return;
        const date = String(rep.entry_date || rep.date || rep.created_at || '').substring(0, 10);
        const breakdown = rep.expense_details || rep.expenses_breakdown || rep.expense_rows || [];
        breakdown.forEach(ex => {
          const cat = String(ex.category_type || ex.category || '').toLowerCase();
          if (cat.includes('hpp') || cat.includes('bahan')) return;
          const name = (ex.item_name || ex.name || ex.categoryName || ex.category || '').trim();
          const amt  = Number(ex.amount || ex.subtotal || 0);
          const qty  = Number(ex.qty || 1);
          const unitPrice = Number(ex.price_per_unit || (qty > 0 ? amt / qty : amt));
          if (name && (amt > 0 || unitPrice > 0)) {
            records.push({
              date: date || new Date().toISOString().substring(0, 10),
              name,
              outlet_id: String(rep.outlet_id || rep.branch_id || outletsList[0]?.id || 1),
              outlet_name: rep.branch_name || rep.outlet_name || getOutletName(rep.outlet_id),
              unit_price: unitPrice, qty, amount: amt || (unitPrice * qty),
            });
          }
        });
      });
    };
    addExpenses(masterData?.approvedFinanceDaily || []);
    addExpenses(masterData?.manualEntryRecords    || []);
    return records;
  }, [masterData, outletsList]);

  const activeOutletColumns = useMemo(() =>
    outletsList.filter(o => visibleOutletIds.includes(String(o.id))),
    [outletsList, visibleOutletIds]
  );

  const applyFilters = (records) => records.filter(r => {
    if (selectedBranch && selectedBranch !== 'ALL' && !String(selectedBranch).includes('Konsolidasi')) {
      if (String(r.outlet_id) !== String(selectedBranch)) return false;
    }
    if (selectedYear && !r.date.startsWith(selectedYear)) return false;
    if (periodViewMode === 'daily' && selectedMonth && r.date.substring(5, 7) !== selectedMonth) return false;
    if (startDate && r.date < startDate) return false;
    if (endDate   && r.date > endDate)   return false;
    if (searchTerm.trim() && !r.name.toLowerCase().includes(searchTerm.toLowerCase().trim())) return false;
    return true;
  });

  const filteredIngredients = useMemo(() => applyFilters(allIngredientRecords),
    [allIngredientRecords, selectedBranch, selectedYear, selectedMonth, periodViewMode, startDate, endDate, searchTerm]);
  const filteredExpenses = useMemo(() => applyFilters(allExpenseRecords),
    [allExpenseRecords, selectedBranch, selectedYear, selectedMonth, periodViewMode, startDate, endDate, searchTerm]);

  const markMinMax = (infoMap) => {
    const vals = Object.values(infoMap).map(o => o.value).filter(v => v > 0);
    if (vals.length < 2) return infoMap;
    const minV = Math.min(...vals), maxV = Math.max(...vals);
    Object.values(infoMap).forEach(obj => {
      obj.isMin = obj.value === minV && minV !== maxV;
      obj.isMax = obj.value === maxV && minV !== maxV;
    });
    return infoMap;
  };

  const ingredientOutletPivot = useMemo(() => {
    const src = selectedItem !== 'ALL' ? filteredIngredients.filter(r => r.name === selectedItem) : filteredIngredients;
    const map = new Map();
    src.forEach(r => {
      const timeKey = periodViewMode === 'monthly' ? r.date.substring(0, 7) : r.date;
      const key = (timeKey || '') + '||' + r.name;
      if (!map.has(key)) map.set(key, { date: timeKey, name: r.name, unit: r.unit, outlets: {} });
      const row = map.get(key);
      if (!row.outlets[r.outlet_id]) row.outlets[r.outlet_id] = { prices: [], qtys: [] };
      row.outlets[r.outlet_id].prices.push(r.unit_price);
      row.outlets[r.outlet_id].qtys.push(r.qty);
    });
    return Array.from(map.values()).map(row => {
      const priceInfo = {}, qtyInfo = {};
      Object.entries(row.outlets).forEach(([id, d]) => {
        priceInfo[id] = { value: Math.round(d.prices.reduce((s, p) => s + p, 0) / d.prices.length) };
        qtyInfo[id]   = { value: d.qtys.reduce((s, q) => s + q, 0) };
      });
      return { date: row.date, name: row.name, unit: row.unit, priceInfo: markMinMax(priceInfo), qtyInfo: markMinMax(qtyInfo) };
    }).sort((a, b) => new Date(b.date) - new Date(a.date) || a.name.localeCompare(b.name));
  }, [filteredIngredients, selectedItem, periodViewMode]);

  const uniqueIngredientNames = useMemo(() => {
    const s = new Set(filteredIngredients.map(r => r.name));
    return Array.from(s).sort((a, b) => a.localeCompare(b));
  }, [filteredIngredients]);

  const expenseOutletPivot = useMemo(() => {
    const src = selectedItem !== 'ALL' ? filteredExpenses.filter(r => r.name === selectedItem) : filteredExpenses;
    const map = new Map();
    src.forEach(r => {
      const timeKey = periodViewMode === 'monthly' ? r.date.substring(0, 7) : r.date;
      const key = (timeKey || '') + '||' + r.name;
      if (!map.has(key)) map.set(key, { date: timeKey, name: r.name, outlets: {} });
      const row = map.get(key);
      if (!row.outlets[r.outlet_id]) row.outlets[r.outlet_id] = { unitPrices: [], qtys: [] };
      row.outlets[r.outlet_id].unitPrices.push(r.unit_price);
      row.outlets[r.outlet_id].qtys.push(r.qty);
    });
    return Array.from(map.values()).map(row => {
      const unitPriceInfo = {}, qtyInfo = {};
      Object.entries(row.outlets).forEach(([id, d]) => {
        unitPriceInfo[id] = { value: Math.round(d.unitPrices.reduce((s, p) => s + p, 0) / d.unitPrices.length) };
        qtyInfo[id]       = { value: d.qtys.reduce((s, q) => s + q, 0) };
      });
      return { date: row.date, name: row.name, unitPriceInfo: markMinMax(unitPriceInfo), qtyInfo: markMinMax(qtyInfo) };
    }).sort((a, b) => new Date(b.date) - new Date(a.date) || a.name.localeCompare(b.name));
  }, [filteredExpenses, selectedItem, periodViewMode]);

  const uniqueExpenseNames = useMemo(() => {
    const s = new Set(filteredExpenses.map(r => r.name));
    return Array.from(s).sort((a, b) => a.localeCompare(b));
  }, [filteredExpenses]);

  const currentDataRows = useMemo(() => {
    if (activeTab === 'harga_bahan_outlet' || activeTab === 'qty_bahan_outlet') return ingredientOutletPivot;
    if (activeTab === 'harga_beban_outlet' || activeTab === 'qty_beban_outlet') return expenseOutletPivot;
    return [];
  }, [activeTab, ingredientOutletPivot, expenseOutletPivot]);

  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return currentDataRows.slice(start, start + pageSize);
  }, [currentDataRows, currentPage, pageSize]);

  const isBahanTab      = activeTab.includes('bahan');
  const currentItemList = isBahanTab ? uniqueIngredientNames : uniqueExpenseNames;

  // ─── COMPUTATION FOR OMZET & BIAYA (BULANAN & HARIAN) ───
  const activeSelectedDate = useMemo(() => {
    if (endDate) return endDate;
    if (startDate) return startDate;
    return new Date().toISOString().substring(0, 10);
  }, [startDate, endDate]);

  const activeSelectedMonth = useMemo(() => {
    return activeSelectedDate.substring(0, 7);
  }, [activeSelectedDate]);

  const isOutletMatchFilter = useCallback((otlId) => {
    if (!selectedBranch || selectedBranch === 'ALL' || String(selectedBranch).includes('Konsolidasi')) return true;
    return String(otlId) === String(selectedBranch);
  }, [selectedBranch]);

  const allSalesEntries = useMemo(() => {
    const map = new Map();
    const rawPOS = [
      ...(masterData?.salesTransactions || []),
      ...(masterData?.transactions || []),
      ...(masterData?.outletTransactions || [])
    ];
    rawPOS.forEach(t => {
      if (t && t.id != null) {
        const dt = String(t.entry_date || t.date || t.transaction_date || t.timestamp || t.created_at || '').substring(0, 10);
        const otl = String(t.outlet_id || t.branch_id || 1);
        const amt = Number(t.amount || t.total || t.grand_total || t.total_sales || 0);
        if (dt && amt > 0 && isOutletMatchFilter(otl)) {
          map.set(`pos-${t.id}`, { date: dt, amount: amt, outlet_id: otl });
        }
      }
    });

    const rawDaily = [
      ...(masterData?.approvedFinanceDaily || []),
      ...(masterData?.dailyReports || []),
      ...(masterData?.shiftReports || [])
    ];
    rawDaily.forEach(r => {
      if (r && r.id != null) {
        const dt = String(r.entry_date || r.date || r.created_at || '').substring(0, 10);
        const otl = String(r.outlet_id || r.branch_id || 1);
        const amt = Number(r.income_total || r.total_sales || r.omset || r.grand_total || 0);
        if (dt && amt > 0 && isOutletMatchFilter(otl) && !map.has(`pos-${r.id}`)) {
          map.set(`daily-${r.id}`, { date: dt, amount: amt, outlet_id: otl });
        }
      }
    });

    return Array.from(map.values());
  }, [masterData, isOutletMatchFilter]);

  const allExpenseEntries = useMemo(() => {
    const list = [];
    const rawExpenses = [
      ...(masterData?.approvedFinanceDaily || []),
      ...(masterData?.manualEntryRecords || []),
      ...(masterData?.financialRecords || [])
    ];
    rawExpenses.forEach(r => {
      const dt = String(r.entry_date || r.date || r.created_at || '').substring(0, 10);
      const otl = String(r.outlet_id || r.branch_id || 1);
      if (dt && isOutletMatchFilter(otl)) {
        const breakdown = r.expense_details || r.expenses_breakdown || [];
        if (Array.isArray(breakdown) && breakdown.length > 0) {
          breakdown.forEach(ex => {
            const amt = Number(ex.amount || ex.subtotal || 0);
            if (amt > 0) list.push({ date: dt, amount: amt, outlet_id: otl });
          });
        } else {
          const amt = Number(r.expense_total || r.total_expenses || r.amount || 0);
          if (amt > 0 && (r.type === 'expense' || r.expense_amount > 0 || String(r.category_name || '').toLowerCase().includes('biaya'))) {
            list.push({ date: dt, amount: amt, outlet_id: otl });
          }
        }
      }
    });

    const rawPurchases = [
      ...(masterData?.approvedLogistics || []),
      ...(masterData?.purchases || []),
      ...(masterData?.stok_masuk || [])
    ];
    rawPurchases.forEach(p => {
      const dt = String(p.entry_date || p.date || p.created_at || '').substring(0, 10);
      const otl = String(p.outlet_id || p.branch_id || 1);
      const amt = Number(p.total_cost || p.amount || p.total || 0);
      if (dt && amt > 0 && isOutletMatchFilter(otl)) {
        list.push({ date: dt, amount: amt, outlet_id: otl });
      }
    });

    return list;
  }, [masterData, isOutletMatchFilter]);

  const totalOmzetBulan = useMemo(() => {
    return allSalesEntries
      .filter(s => s.date.substring(0, 7) === activeSelectedMonth)
      .reduce((sum, item) => sum + item.amount, 0);
  }, [allSalesEntries, activeSelectedMonth]);

  const totalOmzetHarian = useMemo(() => {
    return allSalesEntries
      .filter(s => s.date === activeSelectedDate)
      .reduce((sum, item) => sum + item.amount, 0);
  }, [allSalesEntries, activeSelectedDate]);

  const totalBiayaBulan = useMemo(() => {
    return allExpenseEntries
      .filter(e => e.date.substring(0, 7) === activeSelectedMonth)
      .reduce((sum, item) => sum + item.amount, 0);
  }, [allExpenseEntries, activeSelectedMonth]);

  const totalBiayaHarian = useMemo(() => {
    return allExpenseEntries
      .filter(e => e.date === activeSelectedDate)
      .reduce((sum, item) => sum + item.amount, 0);
  }, [allExpenseEntries, activeSelectedDate]);

  const formatMonthName = (yearMonthStr) => {
    try {
      const [y, m] = yearMonthStr.split('-');
      const d = new Date(Number(y), Number(m) - 1, 1);
      return d.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
    } catch {
      return yearMonthStr;
    }
  };

  const handleTabChange = (tabId) => {
    setActiveTab(tabId); setCurrentPage(1); setSelectedItem('ALL');
    setShowItemDropdown(false); setItemDropdownSearch('');
  };

  const resetFilters = () => {
    setSearchTerm(''); setStartDate(''); setEndDate(''); setDatePreset('all');
    setSelectedItem('ALL'); setShowItemDropdown(false); setItemDropdownSearch('');
    setCurrentPage(1);
  };

  const toggleOutletColumn = (id) => {
    const sid = String(id);
    setVisibleOutletIds(prev => prev.includes(sid) ? prev.filter(i => i !== sid) : [...prev, sid]);
  };

  const getExportData = useCallback(() => {
    const isBhn = activeTab.includes('bahan');
    const isQty = activeTab === 'qty_bahan_outlet' || activeTab === 'qty_beban_outlet';
    const headers = ['Tanggal', isBhn ? 'Nama Bahan Baku' : 'Nama Beban / Akun'];
    if (isBhn) headers.push('Satuan');
    activeOutletColumns.forEach(o => headers.push(o.name));
    const rows = currentDataRows.map(row => {
      const r = [fmtDate(row.date), row.name];
      if (isBhn) r.push(row.unit || '');
      activeOutletColumns.forEach(otl => {
        const sid = String(otl.id);
        let info;
        if      (activeTab === 'harga_bahan_outlet') info = row.priceInfo?.[sid];
        else if (activeTab === 'qty_bahan_outlet')   info = row.qtyInfo?.[sid];
        else if (activeTab === 'harga_beban_outlet') info = row.unitPriceInfo?.[sid];
        else if (activeTab === 'qty_beban_outlet')   info = row.qtyInfo?.[sid];
        r.push(info ? info.value : '');
      });
      return r;
    });
    return { headers, rows, isQty };
  }, [activeTab, activeOutletColumns, currentDataRows, fmtDate]);

  const downloadExcel = useCallback(() => {
    const { headers, rows } = getExportData();
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    // Style header row bold
    headers.forEach((_, ci) => {
      const cell = ws[XLSX.utils.encode_cell({ r: 0, c: ci })];
      if (cell) cell.s = { font: { bold: true } };
    });
    const wb = XLSX.utils.book_new();
    const sheetName = (TABS.find(t => t.id === activeTab)?.label || activeTab).replace(/[^\w\s]/gu, '').trim().substring(0, 31);
    XLSX.utils.book_append_sheet(wb, ws, sheetName || 'Sheet1');
    const fname = `Perbandingan_${activeTab}_${new Date().toISOString().substring(0, 10)}.xlsx`;
    XLSX.writeFile(wb, fname);
  }, [getExportData, activeTab]);

  const downloadPDF = useCallback(() => {
    const { headers, rows, isQty } = getExportData();
    const tabLabel = TABS.find(t => t.id === activeTab)?.label || activeTab;
    const isBhn = activeTab.includes('bahan');
    const fixedCols = isBhn ? 3 : 2;
    const tableRows = rows.map(row =>
      '<tr>' + row.map((cell, ci) => {
        const isNum = ci >= fixedCols;
        const val = isNum && cell !== ''
          ? (isQty ? Number(cell).toLocaleString('id-ID') : 'Rp ' + Number(cell).toLocaleString('id-ID'))
          : (cell ?? '—');
        return `<td style="text-align:${isNum ? 'right' : 'left'}">${val}</td>`;
      }).join('') + '</tr>'
    ).join('');
    const subtitle = [
      `Dicetak: ${new Date().toLocaleString('id-ID')}`,
      selectedItem !== 'ALL' ? `Filter: ${selectedItem}` : '',
      startDate ? `Dari: ${startDate}` : '',
      endDate   ? `s/d: ${endDate}` : '',
    ].filter(Boolean).join(' • ');
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
<title>Perbandingan – ${tabLabel}</title>
<style>
  body{font-family:Arial,sans-serif;font-size:11px;margin:20px;color:#111}
  h2{font-size:15px;margin:0 0 4px}
  .sub{font-size:9.5px;color:#555;margin-bottom:14px}
  table{width:100%;border-collapse:collapse}
  th{background:#1e293b;color:#fff;padding:6px 10px;font-size:9px;text-transform:uppercase;white-space:nowrap}
  td{padding:5px 10px;border-bottom:1px solid #e2e8f0;white-space:nowrap}
  tr:nth-child(even) td{background:#f8fafc}
  @media print{@page{margin:12mm}button{display:none}}
</style></head><body>
<h2>Perbandingan – ${tabLabel}</h2>
<div class="sub">${subtitle}</div>
<table><thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead>
<tbody>${tableRows}</tbody></table>
</body></html>`;
    const win = window.open('', '_blank', 'width=900,height=700');
    if (!win) return;
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 500);
  }, [getExportData, activeTab, selectedItem, startDate, endDate]);

  const renderOutletCells = (row) => activeOutletColumns.map(otl => {
    const sid = String(otl.id);
    let info;
    if (activeTab === 'harga_bahan_outlet') info = row.priceInfo?.[sid];
    else if (activeTab === 'qty_bahan_outlet')   info = row.qtyInfo?.[sid];
    else if (activeTab === 'harga_bahan_item')   info = row.priceInfo?.[sid];
    else if (activeTab === 'harga_beban_outlet') info = row.unitPriceInfo?.[sid];
    else if (activeTab === 'qty_beban_outlet')   info = row.qtyInfo?.[sid];
    const isQty = activeTab === 'qty_bahan_outlet' || activeTab === 'qty_beban_outlet';
    if (!info) {
      return <td key={otl.id} style={{ padding: '10px 14px', textAlign: 'right', color: T.txtMuted, borderRight: '1px solid ' + T.border }}>—</td>;
    }
    const label = isQty ? info.value.toLocaleString('id-ID') : 'Rp ' + info.value.toLocaleString('id-ID');
    return (
      <td key={otl.id} style={{ padding: '10px 14px', textAlign: 'right', borderRight: '1px solid ' + T.border }}>
        <div style={{ fontWeight: '900', color: T.txtPrimary, fontSize: '0.82rem' }}>{label}</div>
        {(info.isMin || info.isMax) && (
          <div style={{ fontSize: '0.62rem', marginTop: '3px' }}>
            {info.isMin && <span style={{ color: T.success, fontWeight: '900', background: T.successBg, padding: '2px 5px', borderRadius: '4px', border: '1px solid ' + T.successBorder }}>Min</span>}
            {info.isMax && <span style={{ color: T.danger,  fontWeight: '900', background: T.dangerBg,  padding: '2px 5px', borderRadius: '4px', border: '1px solid ' + T.dangerBorder  }}>Max</span>}
          </div>
        )}
      </td>
    );
  });

  const summaryStats = useMemo(() => {
    if (isBahanTab) {
      const prices = filteredIngredients.map(r => r.unit_price).filter(p => p > 0);
      if (!prices.length) return null;
      const minP = Math.min(...prices), maxP = Math.max(...prices);
      return {
        type: 'bahan', count: filteredIngredients.length,
        avg: Math.round(prices.reduce((s, p) => s + p, 0) / prices.length),
        minP, maxP,
        minRec: filteredIngredients.find(r => r.unit_price === minP),
        maxRec: filteredIngredients.find(r => r.unit_price === maxP),
      };
    } else {
      const unitPrices = filteredExpenses.map(r => r.unit_price).filter(p => p > 0);
      if (!unitPrices.length) return null;
      const minP = Math.min(...unitPrices), maxP = Math.max(...unitPrices);
      return {
        type: 'beban', count: filteredExpenses.length,
        avg: Math.round(unitPrices.reduce((s, p) => s + p, 0) / unitPrices.length),
        minP, maxP,
        minRec: filteredExpenses.find(r => r.unit_price === minP),
        maxRec: filteredExpenses.find(r => r.unit_price === maxP),
      };
    }
  }, [isBahanTab, filteredIngredients, filteredExpenses]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }} className="animate-fade-in">

      {/* 1. TOP HEADER & MODE SWITCHER (HARIAN VS BULANAN) */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px', background: T.cardBg, padding: '18px 22px', borderRadius: '16px', border: `1px solid ${T.border}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ padding: '12px', background: T.accentGoldBg, border: `1px solid ${T.accentGoldBorder}`, borderRadius: '14px' }}>
            <Scale size={26} color={T.accentGold} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.25rem', fontWeight: '900', color: T.txtPrimary, margin: 0 }}>
              Perbandingan Harga &amp; Kuantitas Stok Bahan
            </h1>
            <p style={{ fontSize: '0.76rem', color: T.txtSecondary, margin: '2px 0 0 0' }}>
              Komparasi harga satuan dan kuantitas bahan baku antar outlet (Hari ke Hari &amp; Bulan ke Bulan).
            </p>
          </div>
        </div>

        {/* MODE SWITCHER PILL BUTTONS */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{
            display: 'inline-flex',
            background: T.cardBg2,
            padding: '3px',
            borderRadius: '10px',
            border: `1px solid ${T.borderStrong}`,
            gap: '4px'
          }}>
            <button
              type="button"
              onClick={() => { setPeriodViewMode('daily'); setCurrentPage(1); }}
              style={{
                padding: '6px 14px',
                borderRadius: '8px',
                border: 'none',
                background: periodViewMode === 'daily' ? T.primary : 'transparent',
                color: periodViewMode === 'daily' ? T.txtInverse : T.txtSecondary,
                fontWeight: '800',
                fontSize: '0.78rem',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              📅 Rincian Harian (Hari ke Hari)
            </button>
            <button
              type="button"
              onClick={() => { setPeriodViewMode('monthly'); setCurrentPage(1); }}
              style={{
                padding: '6px 14px',
                borderRadius: '8px',
                border: 'none',
                background: periodViewMode === 'monthly' ? T.primary : 'transparent',
                color: periodViewMode === 'monthly' ? T.txtInverse : T.txtSecondary,
                fontWeight: '800',
                fontSize: '0.78rem',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              📊 Rekap Bulanan (Bulan ke Bulan)
            </button>
          </div>

          <button onClick={() => setShowColumnFilter(!showColumnFilter)}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', background: T.cardBg2, border: `1px solid ${T.borderStrong}`, borderRadius: '10px', color: T.txtPrimary, fontWeight: '800', fontSize: '0.78rem', cursor: 'pointer' }}>
            <Filter size={15} color={T.accentGold} />
            <span>Kolom Outlet ({activeOutletColumns.length}/{outletsList.length})</span>
          </button>

          <button onClick={downloadExcel} title="Download Excel"
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.35)', borderRadius: '10px', color: '#22c55e', fontWeight: '800', fontSize: '0.78rem', cursor: 'pointer' }}>
            <FileSpreadsheet size={15} />
            <span>Excel</span>
          </button>

          <button onClick={downloadPDF} title="Download / Print PDF"
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.35)', borderRadius: '10px', color: '#ef4444', fontWeight: '800', fontSize: '0.78rem', cursor: 'pointer' }}>
            <Printer size={15} />
            <span>PDF</span>
          </button>
        </div>
      </div>

      {/* 2. 4 STRATEGIC PURCHASING & DISPARITY KPI CARDS */}
      {(() => {
        // Compute price disparity across outlets for active dataset
        let maxDisparityItem = '-';
        let maxDisparityVal = 0;
        currentDataRows.forEach(r => {
          const vals = Object.values(r.priceInfo || r.unitPriceInfo || {}).map(x => x.value).filter(v => v > 0);
          if (vals.length >= 2) {
            const diff = Math.max(...vals) - Math.min(...vals);
            if (diff > maxDisparityVal) {
              maxDisparityVal = diff;
              maxDisparityItem = r.name;
            }
          }
        });

        // Compute lowest average price branch
        const branchSpendMap = {};
        filteredIngredients.forEach(r => {
          if (!branchSpendMap[r.outlet_name]) branchSpendMap[r.outlet_name] = { total: 0, count: 0 };
          branchSpendMap[r.outlet_name].total += r.unit_price;
          branchSpendMap[r.outlet_name].count += 1;
        });
        let lowestAvgBranch = '-';
        let lowestAvgPrice = Infinity;
        Object.entries(branchSpendMap).forEach(([bName, data]) => {
          const avg = data.total / (data.count || 1);
          if (avg < lowestAvgPrice) {
            lowestAvgPrice = avg;
            lowestAvgBranch = bName;
          }
        });

        return (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
            {/* Card 1: Disparitas Harga Tertinggi */}
            <div style={{ background: T.cardBg, border: `1px solid ${T.borderStrong}`, borderRadius: '14px', padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ fontSize: '0.68rem', fontWeight: '800', color: T.txtSecondary, textTransform: 'uppercase' }}>SELISIH HARGA TERTINGGI</span>
                <div style={{ fontSize: '1.25rem', fontWeight: '900', color: T.danger, marginTop: '2px' }}>
                  {maxDisparityVal > 0 ? `Rp ${maxDisparityVal.toLocaleString('id-ID')}` : 'Rp 0'}
                </div>
                <span style={{ fontSize: '0.68rem', color: T.accentGold, fontWeight: '700' }}>
                  {maxDisparityItem !== '-' ? maxDisparityItem : 'Harga Seragam'}
                </span>
              </div>
              <div style={{ padding: '8px', borderRadius: '10px', background: T.dangerBg, color: T.danger }}>
                <TrendingUp size={18} />
              </div>
            </div>

            {/* Card 2: Total Item Bahan Baku Terdata */}
            <div style={{ background: T.cardBg, border: `1px solid ${T.borderStrong}`, borderRadius: '14px', padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ fontSize: '0.68rem', fontWeight: '800', color: T.txtSecondary, textTransform: 'uppercase' }}>TOTAL ITEM TERDATA</span>
                <div style={{ fontSize: '1.25rem', fontWeight: '900', color: T.info, marginTop: '2px' }}>
                  {isBahanTab ? uniqueIngredientNames.length : uniqueExpenseNames.length} {isBahanTab ? 'Bahan' : 'Beban'}
                </div>
                <span style={{ fontSize: '0.68rem', color: T.txtSecondary }}>{currentDataRows.length} Entri Komparasi</span>
              </div>
              <div style={{ padding: '8px', borderRadius: '10px', background: T.infoBg, color: T.info }}>
                <Scale size={18} />
              </div>
            </div>

            {/* Card 3: Cabang Purchasing Paling Hemat */}
            <div style={{ background: T.cardBg, border: `1px solid ${T.borderStrong}`, borderRadius: '14px', padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ fontSize: '0.68rem', fontWeight: '800', color: T.txtSecondary, textTransform: 'uppercase' }}>CABANG PALING HEMAT</span>
                <div style={{ fontSize: '1.05rem', fontWeight: '900', color: T.success, marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '160px' }}>
                  {lowestAvgBranch !== '-' ? lowestAvgBranch : 'Semua Cabang'}
                </div>
                <span style={{ fontSize: '0.68rem', color: T.success, fontWeight: '700' }}>
                  {lowestAvgPrice !== Infinity ? `Avg Rp ${Math.round(lowestAvgPrice).toLocaleString('id-ID')}` : 'Terdaftar'}
                </span>
              </div>
              <div style={{ padding: '8px', borderRadius: '10px', background: T.successBg, color: T.success }}>
                <TrendingDown size={18} />
              </div>
            </div>

            {/* Card 4: Rata-Rata Satuan Harga */}
            <div style={{ background: T.cardBg, border: `1px solid ${T.borderStrong}`, borderRadius: '14px', padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ fontSize: '0.68rem', fontWeight: '800', color: T.txtSecondary, textTransform: 'uppercase' }}>RATA-RATA HARGA SATUAN</span>
                <div style={{ fontSize: '1.25rem', fontWeight: '900', color: T.accentGold, marginTop: '2px' }}>
                  Rp {(summaryStats?.avg || 0).toLocaleString('id-ID')}
                </div>
                <span style={{ fontSize: '0.68rem', color: T.txtSecondary }}>
                  {periodViewMode === 'daily' ? 'Mode Harian' : 'Mode Rata-Rata Bulanan'}
                </span>
              </div>
              <div style={{ padding: '8px', borderRadius: '10px', background: T.accentGoldBg, color: T.accentGold }}>
                <DollarSign size={18} />
              </div>
            </div>
          </div>
        );
      })()}

      {/* 3. TABS SELECTOR (HARGA BAHAN / QTY BAHAN / HARGA BEBAN / QTY BEBAN) */}
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', background: T.cardBg, padding: '8px', borderRadius: '14px', border: `1px solid ${T.border}` }}>
        {TABS.map(tab => {
          const isActive = activeTab === tab.id;
          return (
            <button key={tab.id} onClick={() => handleTabChange(tab.id)}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', padding: '8px 14px', borderRadius: '10px', cursor: 'pointer', border: `1px solid ${isActive ? T.accentGoldBorder : T.border}`, background: isActive ? T.accentGoldBg : 'transparent', color: isActive ? T.accentGold : T.txtSecondary, transition: 'all 0.2s', flex: '1 1 auto', minWidth: '140px', textAlign: 'left' }}>
              <span style={{ fontWeight: '800', fontSize: '0.78rem', lineHeight: 1.3 }}>{tab.label}</span>
              <span style={{ fontSize: '0.64rem', opacity: 0.8, marginTop: '2px' }}>{tab.sublabel}</span>
            </button>
          );
        })}
      </div>

      {summaryStats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
          {summaryStats.type === 'bahan' ? (
            <>
              <div style={{ background: T.cardBg, padding: '16px 18px', borderRadius: '14px', border: '1px solid ' + T.successBorder, display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{ padding: '10px', background: T.successBg, borderRadius: '10px' }}><TrendingDown size={22} color={T.success} /></div>
                <div>
                  <div style={{ fontSize: '0.66rem', color: T.txtSecondary, fontWeight: '700', textTransform: 'uppercase' }}>Harga Terendah</div>
                  <div style={{ fontSize: '1.10rem', fontWeight: '900', color: T.success }}>Rp {summaryStats.minP.toLocaleString('id-ID')}</div>
                  <div style={{ fontSize: '0.68rem', color: T.txtMuted, marginTop: '2px' }}>{summaryStats.minRec?.name} • {summaryStats.minRec?.outlet_name}</div>
                </div>
              </div>
              <div style={{ background: T.cardBg, padding: '16px 18px', borderRadius: '14px', border: '1px solid ' + T.dangerBorder, display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{ padding: '10px', background: T.dangerBg, borderRadius: '10px' }}><TrendingUp size={22} color={T.danger} /></div>
                <div>
                  <div style={{ fontSize: '0.66rem', color: T.txtSecondary, fontWeight: '700', textTransform: 'uppercase' }}>Harga Tertinggi</div>
                  <div style={{ fontSize: '1.10rem', fontWeight: '900', color: T.danger }}>Rp {summaryStats.maxP.toLocaleString('id-ID')}</div>
                  <div style={{ fontSize: '0.68rem', color: T.txtMuted, marginTop: '2px' }}>{summaryStats.maxRec?.name} • {summaryStats.maxRec?.outlet_name}</div>
                </div>
              </div>
              <div style={{ background: T.cardBg, padding: '16px 18px', borderRadius: '14px', border: '1px solid ' + T.infoBorder, display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{ padding: '10px', background: T.infoBg, borderRadius: '10px' }}><DollarSign size={22} color={T.info} /></div>
                <div>
                  <div style={{ fontSize: '0.66rem', color: T.txtSecondary, fontWeight: '700', textTransform: 'uppercase' }}>Rata-Rata Harga</div>
                  <div style={{ fontSize: '1.10rem', fontWeight: '900', color: T.info }}>Rp {summaryStats.avg.toLocaleString('id-ID')}</div>
                  <div style={{ fontSize: '0.68rem', color: T.txtMuted, marginTop: '2px' }}>{summaryStats.count} Transaksi</div>
                </div>
              </div>
            </>
          ) : (
            <>
              <div style={{ background: T.cardBg, padding: '16px 18px', borderRadius: '14px', border: '1px solid ' + T.successBorder, display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{ padding: '10px', background: T.successBg, borderRadius: '10px' }}><TrendingDown size={22} color={T.success} /></div>
                <div>
                  <div style={{ fontSize: '0.66rem', color: T.txtSecondary, fontWeight: '700', textTransform: 'uppercase' }}>Satuan Terendah</div>
                  <div style={{ fontSize: '1.10rem', fontWeight: '900', color: T.success }}>Rp {summaryStats.minP.toLocaleString('id-ID')}</div>
                  <div style={{ fontSize: '0.68rem', color: T.txtMuted, marginTop: '2px' }}>{summaryStats.minRec?.name} • {summaryStats.minRec?.outlet_name}</div>
                </div>
              </div>
              <div style={{ background: T.cardBg, padding: '16px 18px', borderRadius: '14px', border: '1px solid ' + T.dangerBorder, display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{ padding: '10px', background: T.dangerBg, borderRadius: '10px' }}><TrendingUp size={22} color={T.danger} /></div>
                <div>
                  <div style={{ fontSize: '0.66rem', color: T.txtSecondary, fontWeight: '700', textTransform: 'uppercase' }}>Satuan Tertinggi</div>
                  <div style={{ fontSize: '1.10rem', fontWeight: '900', color: T.danger }}>Rp {summaryStats.maxP.toLocaleString('id-ID')}</div>
                  <div style={{ fontSize: '0.68rem', color: T.txtMuted, marginTop: '2px' }}>{summaryStats.maxRec?.name} • {summaryStats.maxRec?.outlet_name}</div>
                </div>
              </div>
              <div style={{ background: T.cardBg, padding: '16px 18px', borderRadius: '14px', border: '1px solid ' + T.infoBorder, display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{ padding: '10px', background: T.infoBg, borderRadius: '10px' }}><DollarSign size={22} color={T.info} /></div>
                <div>
                  <div style={{ fontSize: '0.66rem', color: T.txtSecondary, fontWeight: '700', textTransform: 'uppercase' }}>Rata-Rata Satuan</div>
                  <div style={{ fontSize: '1.10rem', fontWeight: '900', color: T.info }}>Rp {summaryStats.avg.toLocaleString('id-ID')}</div>
                  <div style={{ fontSize: '0.68rem', color: T.txtMuted, marginTop: '2px' }}>{summaryStats.count} Transaksi Beban</div>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* 4. FILTER BAR CONTROLS - CLEAN & CONFLICT-FREE */}
      <div style={{ background: T.cardBg, border: `1px solid ${T.border}`, borderRadius: '14px', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        
        {/* Single Row Filter Bar */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center', justifyContent: 'space-between' }}>
          
          {/* Left Group: Search & Item Filter */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center', flex: '1 1 320px' }}>
            {/* Cari Bahan / Beban */}
            <div style={{ position: 'relative', flex: '1 1 200px', minWidth: '160px' }}>
              <Search size={14} color={T.txtSecondary} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="text"
                value={searchTerm}
                onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                placeholder={`Cari ${isBahanTab ? 'bahan baku' : 'beban'}...`}
                style={{
                  width: '100%',
                  paddingLeft: '34px',
                  paddingRight: '12px',
                  height: '38px',
                  borderRadius: '8px',
                  border: `1px solid ${T.border}`,
                  background: T.inputBg,
                  color: T.txtPrimary,
                  fontSize: '0.82rem',
                  fontWeight: '600',
                  outline: 'none'
                }}
              />
            </div>

            {/* Filter Dropdown Bahan Baku / Beban */}
            <div style={{ position: 'relative', flex: '1 1 220px', minWidth: '180px' }}>
              <button
                type="button"
                onClick={() => setShowItemDropdown(v => !v)}
                style={{
                  width: '100%',
                  height: '38px',
                  padding: '0 12px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  border: `1px solid ${selectedItem !== 'ALL' ? T.accentGold : T.border}`,
                  background: T.inputBg,
                  color: selectedItem !== 'ALL' ? T.accentGold : T.txtPrimary,
                  fontSize: '0.82rem',
                  fontWeight: '700',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '8px'
                }}
              >
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {selectedItem === 'ALL' ? ('— Semua ' + (isBahanTab ? 'bahan' : 'beban') + ' —') : selectedItem}
                </span>
                <ChevronDown size={14} color={T.txtMuted} />
              </button>

              {showItemDropdown && (
                <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, background: T.cardBg, border: `1px solid ${T.accentGoldBorder}`, borderRadius: '10px', boxShadow: '0 16px 40px rgba(0,0,0,0.65)', zIndex: 9999, padding: '10px', display: 'flex', flexDirection: 'column', gap: '6px', minWidth: '240px' }}>
                  <input
                    type="text"
                    value={itemDropdownSearch}
                    onChange={e => setItemDropdownSearch(e.target.value)}
                    placeholder="Ketik untuk mencari..."
                    autoFocus
                    style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: `1px solid ${T.border}`, background: T.inputBg, color: T.txtPrimary, fontSize: '0.78rem', outline: 'none' }}
                  />
                  <div style={{ overflowY: 'auto', maxHeight: '220px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <button
                      type="button"
                      onClick={() => { setSelectedItem('ALL'); setShowItemDropdown(false); setItemDropdownSearch(''); setCurrentPage(1); }}
                      style={{ padding: '7px 10px', borderRadius: '6px', border: 'none', textAlign: 'left', cursor: 'pointer', background: selectedItem === 'ALL' ? T.accentGoldBg : 'transparent', color: selectedItem === 'ALL' ? T.accentGold : T.txtMuted, fontSize: '0.80rem', fontWeight: '700', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                    >
                      <span>— Semua {isBahanTab ? 'bahan' : 'beban'} —</span>
                      {selectedItem === 'ALL' && <Check size={13} color={T.accentGold} />}
                    </button>
                    {currentItemList
                      .filter(n => !itemDropdownSearch || n.toLowerCase().includes(itemDropdownSearch.toLowerCase()))
                      .map((name, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => { setSelectedItem(name); setShowItemDropdown(false); setItemDropdownSearch(''); setCurrentPage(1); }}
                          style={{ padding: '7px 10px', borderRadius: '6px', border: 'none', textAlign: 'left', cursor: 'pointer', background: selectedItem === name ? T.accentGoldBg : 'transparent', color: selectedItem === name ? T.accentGold : T.txtPrimary, fontSize: '0.80rem', fontWeight: '900', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                        >
                          <span>{name}</span>
                          {selectedItem === name && <Check size={13} color={T.accentGold} />}
                        </button>
                      ))}
                    {currentItemList.filter(n => !itemDropdownSearch || n.toLowerCase().includes(itemDropdownSearch.toLowerCase())).length === 0 && (
                      <div style={{ padding: '12px', fontSize: '0.74rem', color: T.txtMuted, textAlign: 'center' }}>Tidak ditemukan</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Group: Unified Calendar & Reset */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            {/* Unified Double Calendar Picker */}
            <DoubleCalendarPicker
              startDate={startDate}
              endDate={endDate}
              datePreset={datePreset}
              setStartDate={setStartDate}
              setEndDate={setEndDate}
              setDatePreset={setDatePreset}
              showPopover={showCalendarPopover}
              setShowPopover={setShowCalendarPopover}
              hideOutletFilter={true}
              themeMode={themeMode}
            />

            {(searchTerm || startDate || endDate || selectedItem !== 'ALL' || datePreset !== 'all') && (
              <button
                onClick={resetFilters}
                style={{
                  height: '38px',
                  padding: '0 14px',
                  borderRadius: '8px',
                  border: `1px solid ${T.border}`,
                  background: 'transparent',
                  color: T.txtMuted,
                  fontSize: '0.78rem',
                  fontWeight: '700',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.15s ease'
                }}
                title="Reset semua filter ke kondisi awal"
              >
                <RotateCcw size={13} />
                <span>Reset</span>
              </button>
            )}
          </div>
        </div>
      </div>

      <div style={{ background: T.cardBg2, border: '1px solid ' + T.border, borderRadius: '10px', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <Info size={15} color={T.info} style={{ flexShrink: 0 }} />
        <span style={{ fontSize: '0.76rem', color: T.txtSecondary, fontWeight: '600' }}>
          {TAB_DESC[activeTab]}
          {selectedItem !== 'ALL' && <strong style={{ color: T.accentGold }}> &nbsp;→ Filter: {selectedItem}</strong>}
        </span>
      </div>

      <div style={{ background: T.cardBg, borderRadius: '16px', border: '1px solid ' + T.border, overflow: 'hidden', boxShadow: T.cardShadow }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
            <thead>
              <tr style={{ background: T.tableHeaderBg, borderBottom: `1px solid ${T.borderStrong}`, color: T.txtSecondary, fontWeight: '800', textTransform: 'uppercase', fontSize: '0.67rem', letterSpacing: '0.04em' }}>
                {(activeTab === 'harga_bahan_outlet' || activeTab === 'qty_bahan_outlet') && (
                  <>
                    <th style={{ padding: '12px 14px', textAlign: 'left', minWidth: '140px', borderRight: `1px solid ${T.border}` }}>
                      {periodViewMode === 'daily' ? 'Tanggal / Hari' : 'Bulan (MoM)'}
                    </th>
                    <th style={{ padding: '12px 14px', textAlign: 'left', minWidth: '200px', borderRight: `1px solid ${T.border}` }}>Nama Bahan Baku</th>
                    <th style={{ padding: '12px 10px', textAlign: 'center', minWidth: '70px', borderRight: `1px solid ${T.border}` }}>Satuan</th>
                  </>
                )}
                {(activeTab === 'harga_beban_outlet' || activeTab === 'qty_beban_outlet') && (
                  <>
                    <th style={{ padding: '12px 14px', textAlign: 'left', minWidth: '140px', borderRight: `1px solid ${T.border}` }}>
                      {periodViewMode === 'daily' ? 'Tanggal / Hari' : 'Bulan (MoM)'}
                    </th>
                    <th style={{ padding: '12px 14px', textAlign: 'left', minWidth: '220px', borderRight: `1px solid ${T.border}` }}>Nama Beban / Akun</th>
                  </>
                )}
                {activeOutletColumns.map(otl => (
                  <th key={otl.id} style={{ padding: '12px 14px', textAlign: 'right', minWidth: '160px', borderRight: `1px solid ${T.border}` }}>
                    {otl.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginatedRows.length === 0 ? (
                <tr>
                  <td colSpan={5 + activeOutletColumns.length} style={{ padding: '48px 20px', textAlign: 'center', color: T.txtMuted, fontSize: '0.84rem' }}>
                    <Info size={32} style={{ marginBottom: '10px', opacity: 0.4 }} /><br />
                    {'Tidak ada data yang cocok dengan filter yang dipilih.'}
                  </td>
                </tr>
              ) : paginatedRows.map((row, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid ' + T.border, transition: 'background 0.15s' }}>
                  {(activeTab === 'harga_bahan_outlet' || activeTab === 'qty_bahan_outlet') && (
                    <>
                      <td style={{ padding: '10px 14px', color: T.accentGold, fontWeight: '700', whiteSpace: 'nowrap', borderRight: '1px solid ' + T.border }}>{fmtDate(row.date)}</td>
                      <td style={{ padding: '10px 14px', color: T.txtPrimary, fontWeight: '800', borderRight: '1px solid ' + T.border }}>{row.name}</td>
                      <td style={{ padding: '10px 10px', textAlign: 'center', color: T.txtSecondary, fontSize: '0.72rem', fontWeight: '600', borderRight: '1px solid ' + T.border }}>{row.unit}</td>
                    </>
                  )}
                  {(activeTab === 'harga_beban_outlet' || activeTab === 'qty_beban_outlet') && (
                    <>
                      <td style={{ padding: '10px 14px', color: T.accentGold, fontWeight: '700', whiteSpace: 'nowrap', borderRight: '1px solid ' + T.border }}>{fmtDate(row.date)}</td>
                      <td style={{ padding: '10px 14px', color: T.txtPrimary, fontWeight: '800', borderRight: '1px solid ' + T.border }}>{row.name}</td>
                    </>
                  )}
                  {renderOutletCells(row)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {currentDataRows.length > 0 && (
          <div style={{ padding: '12px 16px', borderTop: '1px solid ' + T.border }}>
            <PaginationControls
              totalItems={currentDataRows.length}
              currentPage={currentPage}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              onPageSizeChange={sz => { setPageSize(sz); setCurrentPage(1); }}
              themeMode={themeMode}
            />
          </div>
        )}
      </div>
    </div>
  );
}
