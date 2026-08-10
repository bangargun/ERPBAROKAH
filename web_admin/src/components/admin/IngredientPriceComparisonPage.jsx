import React, { useState, useMemo } from 'react';
import {
  Scale, Search, TrendingUp, TrendingDown, DollarSign, Filter, Info,
  Check, Layers, AlertTriangle, RotateCcw, ChevronDown
} from 'lucide-react';
import PaginationControls from './PaginationControls';
import { getThemePalette } from '../../utils/themeUtils';
import { DoubleCalendarPicker } from './SalesTransactionsPage';

const TABS = [
  { id: 'harga_bahan_outlet', label: '🏷️ Harga Satuan Bahan Baku', sublabel: 'Outlet by Outlet' },
  { id: 'qty_bahan_outlet',   label: '📦 Quantity Bahan Baku',    sublabel: 'Outlet by Outlet' },
  { id: 'harga_bahan_item',   label: '🔍 Harga Bahan Baku',       sublabel: 'By Item' },
  { id: 'harga_beban_outlet', label: '💸 Harga Satuan Beban',     sublabel: 'Outlet by Outlet' },
  { id: 'harga_beban_item',   label: '🔍 Harga Beban',            sublabel: 'By Item' },
];

const TAB_DESC = {
  harga_bahan_outlet: 'Rata-rata harga satuan bahan baku per outlet. Baris = nama bahan baku, kolom = tiap outlet. 🟢 Termurah, 🔴 Termahal.',
  qty_bahan_outlet:   'Total quantity bahan baku yang diterima per outlet. Baris = nama bahan baku, kolom = tiap outlet.',
  harga_bahan_item:   'Harga satuan bahan baku per tanggal antar outlet. Pilih bahan baku dari dropdown terlebih dahulu.',
  harga_beban_outlet: 'Rata-rata nilai beban operasional per outlet. Baris = nama kategori beban, kolom = tiap outlet.',
  harga_beban_item:   'Nilai beban operasional per tanggal antar outlet. Pilih jenis beban dari dropdown terlebih dahulu.',
};

export default function IngredientPriceComparisonPage({ masterData, selectedBranch, themeMode = 'dark' }) {
  const T = getThemePalette(themeMode);

  const [activeTab, setActiveTab]       = useState('harga_bahan_outlet');
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

  const outletsList = useMemo(() => masterData?.outlets || [], [masterData]);
  const [visibleOutletIds, setVisibleOutletIds] = useState(
    () => (masterData?.outlets || []).map(o => String(o.id))
  );

  const getOutletName = (id) => {
    const o = outletsList.find(o => String(o.id) === String(id));
    return o ? o.name : 'Outlet #' + id;
  };

  const fmtDate = (d) => {
    try { return new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }); }
    catch { return d; }
  };

  const allIngredientRecords = useMemo(() => {
    const records = [];
    (masterData?.approvedLogistics || []).forEach(log => {
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
    if (records.length === 0) {
      (masterData?.ingredients || []).forEach(ing => {
        const cost = Number(ing.cost || ing.price || 0);
        if (ing.name && cost > 0) {
          records.push({
            date: new Date().toISOString().substring(0, 10),
            name: ing.name.trim(), unit: ing.unit || 'Kg',
            outlet_id: String(outletsList[0]?.id || 1),
            outlet_name: outletsList[0]?.name || 'Outlet Utama',
            unit_price: cost, qty: 1,
          });
        }
      });
    }
    return records;
  }, [masterData, outletsList]);

  const allExpenseRecords = useMemo(() => {
    const records = [];
    const ingNames = new Set(
      (masterData?.ingredients || []).map(i => i.name?.toLowerCase().trim()).filter(Boolean)
    );
    const addExpenses = (list) => {
      list.forEach(rep => {
        const date = String(rep.entry_date || rep.date || rep.created_at || '').substring(0, 10);
        const breakdown = rep.expense_details || rep.expenses_breakdown || [];
        breakdown.forEach(ex => {
          const name = (ex.name || ex.categoryName || ex.category || '').trim();
          const amt  = Number(ex.amount || ex.subtotal || 0);
          const qty  = Number(ex.qty || 1);
          const unitPrice = qty > 0 ? amt / qty : amt;
          if (name && amt > 0 && !ingNames.has(name.toLowerCase())) {
            records.push({
              date: date || new Date().toISOString().substring(0, 10),
              name,
              outlet_id: String(rep.outlet_id || rep.branch_id || outletsList[0]?.id || 1),
              outlet_name: rep.outlet_name || getOutletName(rep.outlet_id),
              unit_price: unitPrice, qty, amount: amt,
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
    if (startDate && r.date < startDate) return false;
    if (endDate   && r.date > endDate)   return false;
    if (searchTerm.trim() && !r.name.toLowerCase().includes(searchTerm.toLowerCase().trim())) return false;
    return true;
  });

  const filteredIngredients = useMemo(() => applyFilters(allIngredientRecords),
    [allIngredientRecords, selectedBranch, startDate, endDate, searchTerm]);
  const filteredExpenses = useMemo(() => applyFilters(allExpenseRecords),
    [allExpenseRecords, selectedBranch, startDate, endDate, searchTerm]);

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
    const map = new Map();
    filteredIngredients.forEach(r => {
      if (!map.has(r.name)) map.set(r.name, { name: r.name, unit: r.unit, outlets: {} });
      const row = map.get(r.name);
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
      return { name: row.name, unit: row.unit, priceInfo: markMinMax(priceInfo), qtyInfo: markMinMax(qtyInfo) };
    }).sort((a, b) => a.name.localeCompare(b.name));
  }, [filteredIngredients]);

  const uniqueIngredientNames = useMemo(() => {
    const s = new Set(filteredIngredients.map(r => r.name));
    return Array.from(s).sort((a, b) => a.localeCompare(b));
  }, [filteredIngredients]);

  const tab3Data = useMemo(() => {
    if (selectedItem === 'ALL') return [];
    const src = filteredIngredients.filter(r => r.name === selectedItem);
    const map = new Map();
    src.forEach(r => {
      if (!map.has(r.date)) map.set(r.date, { date: r.date, outlets: {} });
      const row = map.get(r.date);
      if (!row.outlets[r.outlet_id]) row.outlets[r.outlet_id] = { prices: [] };
      row.outlets[r.outlet_id].prices.push(r.unit_price);
    });
    return Array.from(map.values()).map(row => {
      const priceInfo = {};
      Object.entries(row.outlets).forEach(([id, d]) => {
        priceInfo[id] = { value: Math.round(d.prices.reduce((s, p) => s + p, 0) / d.prices.length) };
      });
      return { date: row.date, priceInfo: markMinMax(priceInfo) };
    }).sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [filteredIngredients, selectedItem]);

  const expenseOutletPivot = useMemo(() => {
    const map = new Map();
    filteredExpenses.forEach(r => {
      if (!map.has(r.name)) map.set(r.name, { name: r.name, outlets: {} });
      const row = map.get(r.name);
      if (!row.outlets[r.outlet_id]) row.outlets[r.outlet_id] = { amounts: [] };
      row.outlets[r.outlet_id].amounts.push(r.amount);
    });
    return Array.from(map.values()).map(row => {
      const amountInfo = {};
      Object.entries(row.outlets).forEach(([id, d]) => {
        amountInfo[id] = { value: Math.round(d.amounts.reduce((s, a) => s + a, 0) / d.amounts.length) };
      });
      return { name: row.name, amountInfo: markMinMax(amountInfo) };
    }).sort((a, b) => a.name.localeCompare(b.name));
  }, [filteredExpenses]);

  const uniqueExpenseNames = useMemo(() => {
    const s = new Set(filteredExpenses.map(r => r.name));
    return Array.from(s).sort((a, b) => a.localeCompare(b));
  }, [filteredExpenses]);

  const tab5Data = useMemo(() => {
    if (selectedItem === 'ALL') return [];
    const src = filteredExpenses.filter(r => r.name === selectedItem);
    const map = new Map();
    src.forEach(r => {
      if (!map.has(r.date)) map.set(r.date, { date: r.date, outlets: {} });
      const row = map.get(r.date);
      if (!row.outlets[r.outlet_id]) row.outlets[r.outlet_id] = { amounts: [] };
      row.outlets[r.outlet_id].amounts.push(r.amount);
    });
    return Array.from(map.values()).map(row => {
      const amountInfo = {};
      Object.entries(row.outlets).forEach(([id, d]) => {
        amountInfo[id] = { value: Math.round(d.amounts.reduce((s, a) => s + a, 0) / d.amounts.length) };
      });
      return { date: row.date, amountInfo: markMinMax(amountInfo) };
    }).sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [filteredExpenses, selectedItem]);

  const currentDataRows = useMemo(() => {
    if (activeTab === 'harga_bahan_outlet' || activeTab === 'qty_bahan_outlet') return ingredientOutletPivot;
    if (activeTab === 'harga_bahan_item')   return tab3Data;
    if (activeTab === 'harga_beban_outlet') return expenseOutletPivot;
    if (activeTab === 'harga_beban_item')   return tab5Data;
    return [];
  }, [activeTab, ingredientOutletPivot, tab3Data, expenseOutletPivot, tab5Data]);

  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return currentDataRows.slice(start, start + pageSize);
  }, [currentDataRows, currentPage, pageSize]);

  const isBahanTab  = activeTab.includes('bahan');
  const isByItemTab = activeTab === 'harga_bahan_item' || activeTab === 'harga_beban_item';
  const currentItemList = isBahanTab ? uniqueIngredientNames : uniqueExpenseNames;

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

  const renderOutletCells = (row) => activeOutletColumns.map(otl => {
    const sid = String(otl.id);
    let info;
    if (activeTab === 'harga_bahan_outlet') info = row.priceInfo?.[sid];
    else if (activeTab === 'qty_bahan_outlet')   info = row.qtyInfo?.[sid];
    else if (activeTab === 'harga_bahan_item')   info = row.priceInfo?.[sid];
    else if (activeTab === 'harga_beban_outlet') info = row.amountInfo?.[sid];
    else if (activeTab === 'harga_beban_item')   info = row.amountInfo?.[sid];
    const isQty = activeTab === 'qty_bahan_outlet';
    if (!info) {
      return <td key={otl.id} style={{ padding: '10px 14px', textAlign: 'right', color: T.txtMuted, borderRight: '1px solid ' + T.border }}>—</td>;
    }
    const label = isQty ? info.value.toLocaleString('id-ID') : 'Rp ' + info.value.toLocaleString('id-ID');
    return (
      <td key={otl.id} style={{ padding: '10px 14px', textAlign: 'right', borderRight: '1px solid ' + T.border }}>
        <div style={{ fontWeight: '900', color: T.txtPrimary, fontSize: '0.82rem' }}>{label}</div>
        {(info.isMin || info.isMax) && (
          <div style={{ fontSize: '0.62rem', marginTop: '3px' }}>
            {info.isMin && <span style={{ color: T.success, fontWeight: '900', background: T.successBg, padding: '2px 5px', borderRadius: '4px', border: '1px solid ' + T.successBorder }}>🟢 Min</span>}
            {info.isMax && <span style={{ color: T.danger,  fontWeight: '900', background: T.dangerBg,  padding: '2px 5px', borderRadius: '4px', border: '1px solid ' + T.dangerBorder  }}>🔴 Max</span>}
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
      const amounts = filteredExpenses.map(r => r.amount).filter(a => a > 0);
      if (!amounts.length) return null;
      const maxA = Math.max(...amounts);
      return {
        type: 'beban', count: filteredExpenses.length,
        avg: Math.round(amounts.reduce((s, a) => s + a, 0) / amounts.length),
        maxA, maxRec: filteredExpenses.find(r => r.amount === maxA),
      };
    }
  }, [isBahanTab, filteredIngredients, filteredExpenses]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }} className="animate-fade-in">

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px', background: T.cardBg, padding: '20px 24px', borderRadius: '16px', border: '1px solid ' + T.border }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ padding: '12px', background: T.accentGoldBg, border: '1px solid ' + T.accentGoldBorder, borderRadius: '14px' }}>
            <Scale size={28} color={T.accentGold} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.30rem', fontWeight: '900', color: T.txtPrimary, margin: 0 }}>Perbandingan</h1>
            <p style={{ fontSize: '0.78rem', color: T.txtSecondary, margin: '3px 0 0 0' }}>
              Komparasi harga satuan &amp; quantity bahan baku dan beban operasional antar outlet.
            </p>
          </div>
        </div>
        <button onClick={() => setShowColumnFilter(!showColumnFilter)}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px', background: T.cardBg2, border: '1px solid ' + T.borderStrong, borderRadius: '10px', color: T.txtPrimary, fontWeight: '800', fontSize: '0.82rem', cursor: 'pointer' }}>
          <Filter size={16} color={T.accentGold} />
          <span>👁️ Kolom Outlet ({activeOutletColumns.length}/{outletsList.length})</span>
        </button>
      </div>

      {showColumnFilter && (
        <div style={{ background: T.cardBg, padding: '16px 20px', borderRadius: '14px', border: '1px solid ' + T.accentGoldBorder, display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: '0.84rem', fontWeight: '800', color: T.accentGold, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Layers size={16} /><span>Tampilkan / Sembunyikan Kolom Outlet:</span>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setVisibleOutletIds(outletsList.map(o => String(o.id)))} style={{ background: 'none', border: 'none', color: T.info, fontSize: '0.74rem', fontWeight: '800', cursor: 'pointer' }}>Pilih Semua</button>
              <span style={{ color: T.txtMuted }}>|</span>
              <button onClick={() => setVisibleOutletIds([])} style={{ background: 'none', border: 'none', color: T.danger, fontSize: '0.74rem', fontWeight: '800', cursor: 'pointer' }}>Bersihkan</button>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '10px' }}>
            {outletsList.map(otl => (
              <label key={otl.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', background: T.cardBg2, borderRadius: '8px', border: '1px solid ' + T.border, cursor: 'pointer', fontSize: '0.78rem', color: T.txtPrimary, fontWeight: '700' }}>
                <input type="checkbox" checked={visibleOutletIds.includes(String(otl.id))} onChange={() => toggleOutletColumn(otl.id)} style={{ accentColor: T.accentGold }} />
                <span>{otl.name}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', background: T.cardBg, padding: '10px', borderRadius: '14px', border: '1px solid ' + T.border }}>
        {TABS.map(tab => {
          const isActive = activeTab === tab.id;
          return (
            <button key={tab.id} onClick={() => handleTabChange(tab.id)}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', padding: '10px 16px', borderRadius: '10px', cursor: 'pointer', border: '1px solid ' + (isActive ? T.accentGoldBorder : T.border), background: isActive ? T.accentGoldBg : 'transparent', color: isActive ? T.accentGold : T.txtSecondary, transition: 'all 0.2s', flex: '1 1 auto', minWidth: '150px', textAlign: 'left' }}>
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
                  <div style={{ fontSize: '0.66rem', color: T.txtSecondary, fontWeight: '700', textTransform: 'uppercase' }}>🟢 Harga Terendah</div>
                  <div style={{ fontSize: '1.10rem', fontWeight: '900', color: T.success }}>Rp {summaryStats.minP.toLocaleString('id-ID')}</div>
                  <div style={{ fontSize: '0.68rem', color: T.txtMuted, marginTop: '2px' }}>{summaryStats.minRec?.name} • {summaryStats.minRec?.outlet_name}</div>
                </div>
              </div>
              <div style={{ background: T.cardBg, padding: '16px 18px', borderRadius: '14px', border: '1px solid ' + T.dangerBorder, display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{ padding: '10px', background: T.dangerBg, borderRadius: '10px' }}><TrendingUp size={22} color={T.danger} /></div>
                <div>
                  <div style={{ fontSize: '0.66rem', color: T.txtSecondary, fontWeight: '700', textTransform: 'uppercase' }}>🔴 Harga Tertinggi</div>
                  <div style={{ fontSize: '1.10rem', fontWeight: '900', color: T.danger }}>Rp {summaryStats.maxP.toLocaleString('id-ID')}</div>
                  <div style={{ fontSize: '0.68rem', color: T.txtMuted, marginTop: '2px' }}>{summaryStats.maxRec?.name} • {summaryStats.maxRec?.outlet_name}</div>
                </div>
              </div>
              <div style={{ background: T.cardBg, padding: '16px 18px', borderRadius: '14px', border: '1px solid ' + T.infoBorder, display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{ padding: '10px', background: T.infoBg, borderRadius: '10px' }}><DollarSign size={22} color={T.info} /></div>
                <div>
                  <div style={{ fontSize: '0.66rem', color: T.txtSecondary, fontWeight: '700', textTransform: 'uppercase' }}>💵 Rata-Rata Harga</div>
                  <div style={{ fontSize: '1.10rem', fontWeight: '900', color: T.info }}>Rp {summaryStats.avg.toLocaleString('id-ID')}</div>
                  <div style={{ fontSize: '0.68rem', color: T.txtMuted, marginTop: '2px' }}>{summaryStats.count} Transaksi</div>
                </div>
              </div>
            </>
          ) : (
            <>
              <div style={{ background: T.cardBg, padding: '16px 18px', borderRadius: '14px', border: '1px solid ' + T.dangerBorder, display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{ padding: '10px', background: T.dangerBg, borderRadius: '10px' }}><AlertTriangle size={22} color={T.danger} /></div>
                <div>
                  <div style={{ fontSize: '0.66rem', color: T.txtSecondary, fontWeight: '700', textTransform: 'uppercase' }}>🔴 Beban Terbesar</div>
                  <div style={{ fontSize: '1.10rem', fontWeight: '900', color: T.danger }}>Rp {summaryStats.maxA.toLocaleString('id-ID')}</div>
                  <div style={{ fontSize: '0.68rem', color: T.txtMuted, marginTop: '2px' }}>{summaryStats.maxRec?.name} • {summaryStats.maxRec?.outlet_name}</div>
                </div>
              </div>
              <div style={{ background: T.cardBg, padding: '16px 18px', borderRadius: '14px', border: '1px solid ' + T.infoBorder, display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{ padding: '10px', background: T.infoBg, borderRadius: '10px' }}><DollarSign size={22} color={T.info} /></div>
                <div>
                  <div style={{ fontSize: '0.66rem', color: T.txtSecondary, fontWeight: '700', textTransform: 'uppercase' }}>💵 Rata-Rata Beban</div>
                  <div style={{ fontSize: '1.10rem', fontWeight: '900', color: T.info }}>Rp {summaryStats.avg.toLocaleString('id-ID')}</div>
                  <div style={{ fontSize: '0.68rem', color: T.txtMuted, marginTop: '2px' }}>{summaryStats.count} Transaksi Beban</div>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      <div style={{ background: T.cardBg, border: '1px solid ' + T.border, borderRadius: '14px', padding: '16px 20px', display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'flex-end' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: '1 1 160px', minWidth: '150px' }}>
          <label style={{ fontSize: '0.72rem', fontWeight: '800', color: T.txtSecondary, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '5px' }}>
            <Search size={13} color={T.txtMuted} /> Cari {isBahanTab ? 'Bahan' : 'Beban'}
          </label>
          <input type="text" value={searchTerm} onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }} placeholder="Ketik kata kunci..."
            style={{ padding: '0 12px', height: '40px', borderRadius: '6px', border: '1px solid ' + T.border, background: T.inputBg, color: T.txtPrimary, fontSize: '0.84rem', fontWeight: '600' }} />
        </div>

        {isByItemTab && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: '1 1 200px', minWidth: '180px', position: 'relative' }}>
            <label style={{ fontSize: '0.72rem', fontWeight: '800', color: T.txtSecondary, textTransform: 'uppercase' }}>
              {isBahanTab ? '🥬 Pilih Bahan Baku' : '💸 Pilih Jenis Beban'}
            </label>
            <button type="button" onClick={() => setShowItemDropdown(v => !v)}
              style={{ height: '40px', padding: '0 12px', borderRadius: '6px', cursor: 'pointer', border: '1px solid ' + (selectedItem !== 'ALL' ? T.accentGold : T.border), background: T.inputBg, color: selectedItem !== 'ALL' ? T.accentGold : T.txtPrimary, fontSize: '0.84rem', fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {selectedItem === 'ALL' ? ('— Pilih ' + (isBahanTab ? 'bahan baku' : 'beban') + ' —') : selectedItem}
              </span>
              <ChevronDown size={14} color={T.txtMuted} />
            </button>
            {showItemDropdown && (
              <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, background: T.cardBg, border: '1px solid ' + T.accentGoldBorder, borderRadius: '10px', boxShadow: '0 16px 40px rgba(0,0,0,0.65)', zIndex: 9999, padding: '10px', display: 'flex', flexDirection: 'column', gap: '6px', minWidth: '240px' }}>
                <input type="text" value={itemDropdownSearch} onChange={e => setItemDropdownSearch(e.target.value)} placeholder="Cari..." autoFocus
                  style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid ' + T.border, background: T.inputBg, color: T.txtPrimary, fontSize: '0.78rem' }} />
                <div style={{ overflowY: 'auto', maxHeight: '220px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  {currentItemList
                    .filter(n => !itemDropdownSearch || n.toLowerCase().includes(itemDropdownSearch.toLowerCase()))
                    .map((name, i) => (
                      <button key={i} type="button"
                        onClick={() => { setSelectedItem(name); setShowItemDropdown(false); setItemDropdownSearch(''); setCurrentPage(1); }}
                        style={{ padding: '7px 10px', borderRadius: '6px', border: 'none', textAlign: 'left', cursor: 'pointer', background: selectedItem === name ? T.accentGoldBg : 'transparent', color: selectedItem === name ? T.accentGold : T.txtPrimary, fontSize: '0.80rem', fontWeight: selectedItem === name ? '900' : '600', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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
        )}

        <DoubleCalendarPicker
          startDate={startDate} endDate={endDate} datePreset={datePreset}
          setStartDate={setStartDate} setEndDate={setEndDate} setDatePreset={setDatePreset}
          showPopover={showCalendarPopover} setShowPopover={setShowCalendarPopover}
          hideOutletFilter={true} noWrapper={true} themeMode={themeMode}
        />

        {(searchTerm || startDate || endDate || selectedItem !== 'ALL') && (
          <button onClick={resetFilters} style={{ height: '40px', padding: '0 14px', borderRadius: '6px', border: '1px solid ' + T.border, background: 'transparent', color: T.txtMuted, fontSize: '0.80rem', fontWeight: '700', cursor: 'pointer', alignSelf: 'flex-end', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <RotateCcw size={13} /> Reset
          </button>
        )}
      </div>

      <div style={{ background: T.cardBg2, border: '1px solid ' + T.border, borderRadius: '10px', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <Info size={15} color={T.info} style={{ flexShrink: 0 }} />
        <span style={{ fontSize: '0.76rem', color: T.txtSecondary, fontWeight: '600' }}>
          {TAB_DESC[activeTab]}
          {isByItemTab && selectedItem !== 'ALL' && <strong style={{ color: T.accentGold }}> &nbsp;→ Item terpilih: {selectedItem}</strong>}
        </span>
      </div>

      <div style={{ background: T.cardBg, borderRadius: '16px', border: '1px solid ' + T.border, overflow: 'hidden', boxShadow: T.cardShadow }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
            <thead>
              <tr style={{ background: T.tableHeaderBg, borderBottom: '1px solid ' + T.borderStrong, color: T.txtSecondary, fontWeight: '800', textTransform: 'uppercase', fontSize: '0.67rem', letterSpacing: '0.04em' }}>
                {(activeTab === 'harga_bahan_outlet' || activeTab === 'qty_bahan_outlet') && (
                  <>
                    <th style={{ padding: '12px 14px', textAlign: 'left', minWidth: '200px', borderRight: '1px solid ' + T.border }}>🥬 Nama Bahan Baku</th>
                    <th style={{ padding: '12px 10px', textAlign: 'center', minWidth: '70px', borderRight: '1px solid ' + T.border }}>Satuan</th>
                  </>
                )}
                {activeTab === 'harga_bahan_item' && (
                  <th style={{ padding: '12px 14px', textAlign: 'left', minWidth: '130px', borderRight: '1px solid ' + T.border }}>📅 Tanggal</th>
                )}
                {activeTab === 'harga_beban_outlet' && (
                  <th style={{ padding: '12px 14px', textAlign: 'left', minWidth: '220px', borderRight: '1px solid ' + T.border }}>💸 Nama Beban / Akun</th>
                )}
                {activeTab === 'harga_beban_item' && (
                  <th style={{ padding: '12px 14px', textAlign: 'left', minWidth: '130px', borderRight: '1px solid ' + T.border }}>📅 Tanggal</th>
                )}
                {activeOutletColumns.map(otl => (
                  <th key={otl.id} style={{ padding: '12px 14px', textAlign: 'right', minWidth: '160px', borderRight: '1px solid ' + T.border }}>
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
                    {isByItemTab && selectedItem === 'ALL'
                      ? ('👆 Pilih ' + (isBahanTab ? 'bahan baku' : 'jenis beban') + ' dari dropdown di atas untuk melihat data perbandingan antar outlet.')
                      : 'Tidak ada data yang cocok dengan filter yang dipilih.'}
                  </td>
                </tr>
              ) : paginatedRows.map((row, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid ' + T.border, transition: 'background 0.15s' }}>
                  {(activeTab === 'harga_bahan_outlet' || activeTab === 'qty_bahan_outlet') && (
                    <>
                      <td style={{ padding: '10px 14px', color: T.txtPrimary, fontWeight: '800', borderRight: '1px solid ' + T.border }}>{row.name}</td>
                      <td style={{ padding: '10px 10px', textAlign: 'center', color: T.txtSecondary, fontSize: '0.72rem', fontWeight: '600', borderRight: '1px solid ' + T.border }}>{row.unit}</td>
                    </>
                  )}
                  {(activeTab === 'harga_bahan_item' || activeTab === 'harga_beban_item') && (
                    <td style={{ padding: '10px 14px', color: T.accentGold, fontWeight: '700', whiteSpace: 'nowrap', borderRight: '1px solid ' + T.border }}>{fmtDate(row.date)}</td>
                  )}
                  {activeTab === 'harga_beban_outlet' && (
                    <td style={{ padding: '10px 14px', color: T.txtPrimary, fontWeight: '800', borderRight: '1px solid ' + T.border }}>{row.name}</td>
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
