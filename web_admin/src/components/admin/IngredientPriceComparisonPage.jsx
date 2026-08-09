import React, { useState, useMemo } from 'react';
import { 
  Scale, 
  Search, 
  Eye, 
  Calendar, 
  Building2, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Filter, 
  Info, 
  X, 
  Check, 
  Layers, 
  ShoppingBag, 
  AlertTriangle,
  FileSpreadsheet,
  ChevronDown,
  History,
  ArrowUpRight,
  ArrowDownRight,
  Minus
} from 'lucide-react';
import PaginationControls from './PaginationControls';
import { getThemePalette } from '../../utils/themeUtils';

export default function IngredientPriceComparisonPage({ 
  masterData, 
  selectedBranch, 
  themeMode = 'dark' 
}) {
  const T = getThemePalette(themeMode);

  // Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIngredientFilter, setSelectedIngredientFilter] = useState('ALL');
  const [showIngDropdown, setShowIngDropdown] = useState(false);
  const [ingDropdownSearch, setIngDropdownSearch] = useState('');
  
  // Direct Calendar Widget Date Filter States (Dari Tanggal & Sampai Tanggal)
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showColumnFilter, setShowColumnFilter] = useState(false);

  // Pagination States
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Active Outlets Selection for Column Visibility (Default: ALL Outlets Checked)
  const outletsList = useMemo(() => masterData?.outlets || [], [masterData]);
  const [visibleOutletIds, setVisibleOutletIds] = useState(() => {
    return (masterData?.outlets || []).map(o => String(o.id));
  });

  // Selected Item for Price History Modal
  const [priceHistoryItem, setPriceHistoryItem] = useState(null);

  // ─── TAB: 'matrix' | 'trend' ───────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState('matrix');

  // ─── TREND TAB: Filter Outlet & Bahan Baku ─────────────────────────────────
  const [trendOutletId, setTrendOutletId]             = useState('');
  const [trendIngredient, setTrendIngredient]         = useState('');
  const [trendIngSearch, setTrendIngSearch]           = useState('');
  const [showTrendIngDropdown, setShowTrendIngDropdown] = useState(false);

  // Helper: Get Outlet Name by ID
  const getOutletName = (id) => {
    const otl = outletsList.find(o => String(o.id) === String(id));
    return otl ? otl.name : `Outlet #${id}`;
  };

  // --- MULTI-SOURCE INGREDIENT PRICE AGGREGATOR ---
  const allPurchaseRecords = useMemo(() => {
    const records = [];

    // 1. Source: Logistik (approvedLogistics & stockOpname)
    (masterData?.approvedLogistics || []).forEach(log => {
      const date = String(log.date || log.created_at || '').substring(0, 10);
      const items = log.items || log.ingredients || [];
      items.forEach(item => {
        const ingName = item.ingredient_name || item.name || item.item_name;
        const unitPrice = Number(item.price_per_unit || item.cost || item.price || 0);
        if (ingName && unitPrice > 0) {
          records.push({
            id: `log-${log.id}-${item.id || Math.random()}`,
            date: date || new Date().toISOString().substring(0, 10),
            ingredient_name: ingName.trim(),
            unit: item.unit || 'Kg',
            outlet_id: String(log.outlet_id || log.branch_id || outletsList[0]?.id || 1),
            outlet_name: log.outlet_name || getOutletName(log.outlet_id),
            unit_price: unitPrice,
            qty: Number(item.qty || 1),
            total_price: unitPrice * Number(item.qty || 1),
            supplier_name: log.supplier_name || item.supplier || 'Supplier Logistik',
            source: 'Logistik'
          });
        }
      });
    });

    // 2. Source: Laporan Harian Outlet (approvedFinanceDaily & dailyReports)
    (masterData?.approvedFinanceDaily || []).forEach(rep => {
      const date = String(rep.entry_date || rep.date || rep.created_at || '').substring(0, 10);
      const breakdown = rep.expense_details || rep.expenses_breakdown || [];
      breakdown.forEach((ex, idx) => {
        const name = ex.name || ex.categoryName || ex.category;
        const amt = Number(ex.amount || ex.subtotal || 0);
        const qty = Number(ex.qty || 1);
        const unitPrice = qty > 0 ? (amt / qty) : amt;

        if (name && amt > 0) {
          records.push({
            id: `rep-${rep.id}-${idx}`,
            date: date || new Date().toISOString().substring(0, 10),
            ingredient_name: name.trim(),
            unit: ex.unit || 'Unit',
            outlet_id: String(rep.outlet_id || rep.branch_id || outletsList[0]?.id || 1),
            outlet_name: rep.outlet_name || getOutletName(rep.outlet_id),
            unit_price: unitPrice,
            qty: qty,
            total_price: amt,
            supplier_name: ex.supplier || 'Nota Kasir Outlet',
            source: 'Laporan Harian'
          });
        }
      });
    });

    // 3. Source: Update Laporan (+ Update Laporan Manual Records)
    (masterData?.manualEntryRecords || []).forEach(man => {
      const date = String(man.entry_date || man.date || man.created_at || '').substring(0, 10);
      const breakdown = man.expense_details || man.expenses_breakdown || [];
      breakdown.forEach((ex, idx) => {
        const name = ex.name || ex.categoryName || ex.category;
        const amt = Number(ex.amount || ex.subtotal || 0);
        const qty = Number(ex.qty || 1);
        const unitPrice = qty > 0 ? (amt / qty) : amt;

        if (name && amt > 0) {
          records.push({
            id: `man-${man.id}-${idx}`,
            date: date || new Date().toISOString().substring(0, 10),
            ingredient_name: name.trim(),
            unit: ex.unit || 'Unit',
            outlet_id: String(man.outlet_id || man.branch_id || outletsList[0]?.id || 1),
            outlet_name: man.outlet_name || getOutletName(man.outlet_id),
            unit_price: unitPrice,
            qty: qty,
            total_price: amt,
            supplier_name: ex.notes || 'Update Laporan Manual',
            source: 'Update Laporan'
          });
        }
      });
    });

    // 4. Source Fallback: Master Data Ingredients Standard Cost
    (masterData?.ingredients || []).forEach(ing => {
      const cost = Number(ing.cost || ing.price || 0);
      if (ing.name && cost > 0) {
        records.push({
          id: `ing-${ing.id}`,
          date: new Date().toISOString().substring(0, 10),
          ingredient_name: ing.name.trim(),
          unit: ing.unit || 'Kg',
          outlet_id: String(outletsList[0]?.id || 1),
          outlet_name: outletsList[0]?.name || 'Outlet Utama',
          unit_price: cost,
          qty: 1,
          total_price: cost,
          supplier_name: 'Master Data HPP Standard',
          source: 'Master HPP'
        });
      }
    });

    return records;
  }, [masterData, outletsList]);

  // Unique Ingredient Names List for Dropdown Filter
  const uniqueIngredientNames = useMemo(() => {
    const set = new Set();
    (masterData?.ingredients || []).forEach(i => i.name && set.add(i.name.trim()));
    (allPurchaseRecords || []).forEach(r => r.ingredient_name && set.add(r.ingredient_name.trim()));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [masterData, allPurchaseRecords]);

  // ─── TREND TAB: Data Tren Harga Per Outlet + Bahan Baku ────────────────────
  const trendRows = useMemo(() => {
    if (!trendOutletId || !trendIngredient) return [];
    // Filter semua record: outlet sama, bahan baku sama
    const rows = allPurchaseRecords.filter(r =>
      String(r.outlet_id) === String(trendOutletId) &&
      r.ingredient_name.toLowerCase().trim() === trendIngredient.toLowerCase().trim()
    );
    // Sort by date ascending (terlama → terbaru)
    const sorted = [...rows].sort((a, b) => new Date(a.date) - new Date(b.date));
    // Tambah kolom selisih harga vs pembelian sebelumnya
    return sorted.map((r, idx) => {
      const prev = idx > 0 ? sorted[idx - 1] : null;
      const diff = prev ? r.unit_price - prev.unit_price : null;
      const pct  = (prev && prev.unit_price > 0) ? ((diff / prev.unit_price) * 100) : null;
      return { ...r, diff, pct };
    }).reverse(); // tampilkan terbaru di atas
  }, [allPurchaseRecords, trendOutletId, trendIngredient]);

  // Trend summary stats
  const trendStats = useMemo(() => {
    if (trendRows.length === 0) return null;
    const prices = trendRows.map(r => r.unit_price);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const avg = Math.round(prices.reduce((a, b) => a + b, 0) / prices.length);
    // Harga terbaru vs tertua
    const newest = trendRows[0]?.unit_price || 0;
    const oldest = trendRows[trendRows.length - 1]?.unit_price || 0;
    const totalChange = newest - oldest;
    const totalPct = oldest > 0 ? ((totalChange / oldest) * 100).toFixed(1) : null;
    return { min, max, avg, newest, oldest, totalChange, totalPct };
  }, [trendRows]);

  // Trend: bahan baku unik untuk outlet terpilih
  const trendIngredientOptions = useMemo(() => {
    if (!trendOutletId) return uniqueIngredientNames;
    const set = new Set();
    allPurchaseRecords
      .filter(r => String(r.outlet_id) === String(trendOutletId))
      .forEach(r => r.ingredient_name && set.add(r.ingredient_name.trim()));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [allPurchaseRecords, trendOutletId, uniqueIngredientNames]);

  const filteredTrendIngOptions = useMemo(() => {
    if (!trendIngSearch.trim()) return trendIngredientOptions;
    return trendIngredientOptions.filter(n => n.toLowerCase().includes(trendIngSearch.toLowerCase()));
  }, [trendIngredientOptions, trendIngSearch]);

  // Filtered Dropdown Items based on internal search input
  const filteredDropdownIngredients = useMemo(() => {
    if (!ingDropdownSearch.trim()) return uniqueIngredientNames;
    return uniqueIngredientNames.filter(name =>
      name.toLowerCase().includes(ingDropdownSearch.toLowerCase().trim())
    );
  }, [uniqueIngredientNames, ingDropdownSearch]);

  // Filtered Purchase Records
  const filteredPurchaseRecords = useMemo(() => {
    return allPurchaseRecords.filter(r => {
      // Branch / Outlet Filter
      if (selectedBranch && selectedBranch !== 'ALL' && selectedBranch !== 'Semua Restoran (Konsolidasi)') {
        if (String(r.outlet_id) !== String(selectedBranch)) return false;
      }

      // Ingredient Dropdown Filter
      if (selectedIngredientFilter !== 'ALL') {
        if (r.ingredient_name.toLowerCase().trim() !== selectedIngredientFilter.toLowerCase().trim()) return false;
      }

      // Date Range Filter (Direct Calendar Picker)
      if (startDate && r.date < startDate) return false;
      if (endDate && r.date > endDate) return false;

      // Ingredient Search Filter
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase().trim();
        const nameMatch = r.ingredient_name.toLowerCase().includes(term);
        const otlMatch = r.outlet_name.toLowerCase().includes(term);
        const suppMatch = r.supplier_name.toLowerCase().includes(term);
        if (!nameMatch && !otlMatch && !suppMatch) return false;
      }

      return true;
    });
  }, [allPurchaseRecords, selectedBranch, selectedIngredientFilter, startDate, endDate, searchTerm]);

  // TOP SUMMARY CARDS STATS (Lowest, Highest, Average, Max Variance)
  const summaryStats = useMemo(() => {
    if (filteredPurchaseRecords.length === 0) {
      return { lowest: null, highest: null, avgUnitPrice: 0, maxVariance: null };
    }

    let lowest = filteredPurchaseRecords[0];
    let highest = filteredPurchaseRecords[0];
    let totalPriceSum = 0;

    // Group prices per ingredient to find max variance
    const ingMap = new Map();

    filteredPurchaseRecords.forEach(r => {
      totalPriceSum += r.unit_price;

      if (r.unit_price < lowest.unit_price) lowest = r;
      if (r.unit_price > highest.unit_price) highest = r;

      if (!ingMap.has(r.ingredient_name)) {
        ingMap.set(r.ingredient_name, []);
      }
      ingMap.get(r.ingredient_name).push(r);
    });

    const avgUnitPrice = Math.round(totalPriceSum / filteredPurchaseRecords.length);

    // Calculate Max Variance per ingredient
    let maxVarianceObj = null;
    let maxVariancePct = 0;

    ingMap.forEach((list, ingName) => {
      if (list.length >= 2) {
        const prices = list.map(l => l.unit_price);
        const minP = Math.min(...prices);
        const maxP = Math.max(...prices);
        if (minP > 0) {
          const pct = ((maxP - minP) / minP) * 100;
          if (pct > maxVariancePct) {
            maxVariancePct = pct;
            maxVarianceObj = {
              ingredient_name: ingName,
              unit: list[0].unit,
              minPrice: minP,
              maxPrice: maxP,
              diff: maxP - minP,
              pct: Math.round(pct)
            };
          }
        }
      }
    });

    return { lowest, highest, avgUnitPrice, maxVariance: maxVarianceObj };
  }, [filteredPurchaseRecords]);

  // MATRIX TABLE GROUPING BY (Date + Ingredient Name)
  // Columns: Tanggal | Nama Bahan Baku | Outlet 1 | Outlet 2 | ... | Outlet N | Aksi
  const matrixTableRows = useMemo(() => {
    const rowMap = new Map();

    filteredPurchaseRecords.forEach(r => {
      const key = `${r.date}__${r.ingredient_name}`;
      if (!rowMap.has(key)) {
        rowMap.set(key, {
          key,
          date: r.date,
          ingredient_name: r.ingredient_name,
          unit: r.unit,
          outletPrices: {},
          rawRecords: []
        });
      }

      const rowObj = rowMap.get(key);
      rowObj.rawRecords.push(r);

      // Save unit price for this outlet (keep latest or average if multiple)
      const existingOtl = rowObj.outletPrices[r.outlet_id];
      if (!existingOtl || r.unit_price < existingOtl.unit_price) {
        rowObj.outletPrices[r.outlet_id] = {
          unit_price: r.unit_price,
          supplier_name: r.supplier_name,
          source: r.source
        };
      }
    });

    // Mark Min / Max Outlet Prices on each row
    const resultRows = Array.from(rowMap.values()).map(row => {
      const validPrices = Object.values(row.outletPrices).map(o => o.unit_price);
      const minP = validPrices.length > 0 ? Math.min(...validPrices) : 0;
      const maxP = validPrices.length > 0 ? Math.max(...validPrices) : 0;

      Object.keys(row.outletPrices).forEach(otlId => {
        const item = row.outletPrices[otlId];
        item.isMin = validPrices.length > 1 && item.unit_price === minP;
        item.isMax = validPrices.length > 1 && item.unit_price === maxP && maxP !== minP;
      });

      return row;
    });

    return resultRows.sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [filteredPurchaseRecords]);

  // Visible Outlet Columns
  const activeOutletColumns = useMemo(() => {
    return outletsList.filter(o => visibleOutletIds.includes(String(o.id)));
  }, [outletsList, visibleOutletIds]);

  // Paginated Rows
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return matrixTableRows.slice(start, start + pageSize);
  }, [matrixTableRows, currentPage, pageSize]);

  // Toggle Outlet Column Visibility
  const toggleOutletColumn = (id) => {
    const strId = String(id);
    setVisibleOutletIds(prev => 
      prev.includes(strId) ? prev.filter(i => i !== strId) : [...prev, strId]
    );
  };

  const selectAllOutlets = () => {
    setVisibleOutletIds(outletsList.map(o => String(o.id)));
  };

  const clearAllOutlets = () => {
    setVisibleOutletIds([]);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }} className="animate-fade-in">
      
      {/* PAGE HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px', background: T.cardBg, padding: '20px 24px', borderRadius: '16px', border: `1px solid ${T.border}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ padding: '12px', background: T.accentGoldBg, border: `1px solid ${T.accentGoldBorder}`, borderRadius: '14px' }}>
            <Scale size={28} color={T.accentGold} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.30rem', fontWeight: '900', color: T.txtPrimary, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>Perbandingan Harga</span>
            </h1>
            <p style={{ fontSize: '0.78rem', color: T.txtSecondary, margin: '3px 0 0 0' }}>
              Komparasi harga satuan Rp per unit antar cabang dari gabungan data Logistik, Laporan Harian, dan Update Laporan.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* TAB TOGGLE */}
          <div style={{ display: 'flex', background: T.cardBg2, border: `1px solid ${T.border}`, borderRadius: '10px', padding: '3px', gap: '3px' }}>
            <button
              onClick={() => setActiveTab('matrix')}
              style={{
                padding: '7px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer',
                fontWeight: '800', fontSize: '0.78rem',
                background: activeTab === 'matrix' ? T.accentGoldBg : 'transparent',
                color: activeTab === 'matrix' ? T.accentGold : T.txtSecondary,
                transition: 'all 0.2s'
              }}
            >
              <span>📊 Matrix Antar Outlet</span>
            </button>
            <button
              onClick={() => setActiveTab('trend')}
              style={{
                padding: '7px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer',
                fontWeight: '800', fontSize: '0.78rem',
                background: activeTab === 'trend' ? 'rgba(56,189,248,0.15)' : 'transparent',
                color: activeTab === 'trend' ? T.info : T.txtSecondary,
                transition: 'all 0.2s',
                display: 'flex', alignItems: 'center', gap: '5px'
              }}
            >
              <History size={14} />
              <span>Tren Harga Per Outlet</span>
            </button>
          </div>

          {/* COLUMN VISIBILITY FILTER BUTTON — hanya tampil di tab matrix */}
          {activeTab === 'matrix' && (
            <button
              onClick={() => setShowColumnFilter(!showColumnFilter)}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '10px 18px', background: T.cardBg2,
                border: `1px solid ${T.borderStrong}`, borderRadius: '10px',
                color: T.txtPrimary, fontWeight: '800', fontSize: '0.82rem', cursor: 'pointer'
              }}
            >
              <Filter size={16} color={T.accentGold} />
              <span>👁️ Filter Kolom Outlet ({activeOutletColumns.length}/{outletsList.length})</span>
            </button>
          )}
        </div>
      </div>

      {/* COLUMN VISIBILITY FILTER DROPDOWN MODAL */}
      {showColumnFilter && (
        <div style={{ background: T.cardBg, padding: '16px 20px', borderRadius: '14px', border: `1px solid ${T.accentGoldBorder}`, display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: '0.84rem', fontWeight: '800', color: T.accentGold, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Layers size={16} />
              <span>Tampilkan / Sembunyikan Kolom Outlet pada Tabel:</span>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={selectAllOutlets} style={{ background: 'none', border: 'none', color: T.info, fontSize: '0.74rem', fontWeight: '800', cursor: 'pointer' }}>Pilih Semua</button>
              <span style={{ color: T.txtMuted }}>|</span>
              <button onClick={clearAllOutlets} style={{ background: 'none', border: 'none', color: T.danger, fontSize: '0.74rem', fontWeight: '800', cursor: 'pointer' }}>Bersihkan</button>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '10px' }}>
            {outletsList.map(otl => {
              const isChecked = visibleOutletIds.includes(String(otl.id));
              return (
                <label key={otl.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', background: T.cardBg2, borderRadius: '8px', border: `1px solid ${T.border}`, cursor: 'pointer', fontSize: '0.78rem', color: T.txtPrimary, fontWeight: '700' }}>
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => toggleOutletColumn(otl.id)}
                    style={{ accentColor: T.accentGold }}
                  />
                  <span>{otl.name}</span>
                </label>
              );
            })}
          </div>
        </div>
      )}

      {/* TOP SUMMARY CARDS (Lowest, Highest, Average, Max Variance) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '14px' }}>
        
        {/* Card 1: Harga Satuan Terendah */}
        <div style={{ background: T.cardBg, padding: '16px 20px', borderRadius: '14px', border: `1px solid ${T.successBorder}`, display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ padding: '10px', background: T.successBg, borderRadius: '10px' }}>
            <TrendingDown size={24} color={T.success} />
          </div>
          <div>
            <div style={{ fontSize: '0.68rem', color: T.txtSecondary, fontWeight: '700', textTransform: 'uppercase' }}>🟢 Harga Satuan Terendah</div>
            {summaryStats.lowest ? (
              <>
                <div style={{ fontSize: '1.20rem', fontWeight: '900', color: T.success }}>
                  Rp {summaryStats.lowest.unit_price.toLocaleString('id-ID')} <span style={{ fontSize: '0.72rem', color: T.txtSecondary }}>/{summaryStats.lowest.unit}</span>
                </div>
                <div style={{ fontSize: '0.70rem', color: T.txtSecondary, fontWeight: '700', marginTop: '2px' }}>
                  {summaryStats.lowest.ingredient_name} • {summaryStats.lowest.outlet_name}
                </div>
              </>
            ) : (
              <div style={{ fontSize: '0.84rem', color: T.txtMuted }}>-</div>
            )}
          </div>
        </div>

        {/* Card 2: Harga Satuan Tertinggi */}
        <div style={{ background: T.cardBg, padding: '16px 20px', borderRadius: '14px', border: `1px solid ${T.dangerBorder}`, display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ padding: '10px', background: T.dangerBg, borderRadius: '10px' }}>
            <TrendingUp size={24} color={T.danger} />
          </div>
          <div>
            <div style={{ fontSize: '0.68rem', color: T.txtSecondary, fontWeight: '700', textTransform: 'uppercase' }}>🔴 Harga Satuan Tertinggi</div>
            {summaryStats.highest ? (
              <>
                <div style={{ fontSize: '1.20rem', fontWeight: '900', color: T.danger }}>
                  Rp {summaryStats.highest.unit_price.toLocaleString('id-ID')} <span style={{ fontSize: '0.72rem', color: T.txtSecondary }}>/{summaryStats.highest.unit}</span>
                </div>
                <div style={{ fontSize: '0.70rem', color: T.txtSecondary, fontWeight: '700', marginTop: '2px' }}>
                  {summaryStats.highest.ingredient_name} • {summaryStats.highest.outlet_name}
                </div>
              </>
            ) : (
              <div style={{ fontSize: '0.84rem', color: T.txtMuted }}>-</div>
            )}
          </div>
        </div>

        {/* Card 3: Rata-Rata Harga Pasar */}
        <div style={{ background: T.cardBg, padding: '16px 20px', borderRadius: '14px', border: `1px solid ${T.infoBorder}`, display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ padding: '10px', background: T.infoBg, borderRadius: '10px' }}>
            <DollarSign size={24} color={T.info} />
          </div>
          <div>
            <div style={{ fontSize: '0.68rem', color: T.txtSecondary, fontWeight: '700', textTransform: 'uppercase' }}>💵 Rata-Rata Harga Pasar</div>
            <div style={{ fontSize: '1.20rem', fontWeight: '900', color: T.info }}>
              Rp {summaryStats.avgUnitPrice.toLocaleString('id-ID')}
            </div>
            <div style={{ fontSize: '0.70rem', color: T.txtSecondary, fontWeight: '700', marginTop: '2px' }}>
              Dari {filteredPurchaseRecords.length} Transaksi Nota
            </div>
          </div>
        </div>

        {/* Card 4: Variansi Selisih Harga Terbesar */}
        <div style={{ background: T.cardBg, padding: '16px 20px', borderRadius: '14px', border: `1px solid ${T.accentGoldBorder}`, display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ padding: '10px', background: T.accentGoldBg, borderRadius: '10px' }}>
            <AlertTriangle size={24} color={T.accentGold} />
          </div>
          <div>
            <div style={{ fontSize: '0.68rem', color: T.txtSecondary, fontWeight: '700', textTransform: 'uppercase' }}>⚠️ Variansi Selisih Harga Terbesar</div>
            {summaryStats.maxVariance ? (
              <>
                <div style={{ fontSize: '1.20rem', fontWeight: '900', color: T.accentGold }}>
                  +{summaryStats.maxVariance.pct}% <span style={{ fontSize: '0.74rem', color: T.danger }}>(Rp {summaryStats.maxVariance.diff.toLocaleString('id-ID')})</span>
                </div>
                <div style={{ fontSize: '0.70rem', color: T.txtSecondary, fontWeight: '700', marginTop: '2px' }}>
                  {summaryStats.maxVariance.ingredient_name}
                </div>
              </>
            ) : (
              <div style={{ fontSize: '0.84rem', color: T.txtMuted }}>Normal (&lt;5% Bedar)</div>
            )}
          </div>
        </div>

      </div>

      {/* FILTER & SEARCH BAR */}
      <div style={{ background: T.cardBg, padding: '16px', borderRadius: '14px', border: `1px solid ${T.border}`, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', alignItems: 'center' }}>
        
        {/* Search Input: Nama Bahan Baku */}
        <div style={{ position: 'relative' }}>
          <Search size={16} color={T.txtMuted} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            value={searchTerm}
            onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            placeholder="Cari Kata Kunci Bahan Baku / Supplier..."
            style={{ width: '100%', padding: '8px 12px 8px 36px', borderRadius: '8px', border: `1px solid ${T.border}`, background: T.inputBg, color: T.txtPrimary, fontSize: '0.80rem' }}
          />
        </div>

        {/* Custom Searchable Dropdown Filter: Pilihan Spesifik Nama Bahan Baku */}
        <div style={{ position: 'relative' }}>
          <button
            type="button"
            onClick={() => setShowIngDropdown(!showIngDropdown)}
            style={{
              width: '100%',
              padding: '8px 12px',
              borderRadius: '8px',
              border: `1px solid ${showIngDropdown ? T.accentGold : T.border}`,
              background: T.inputBg,
              color: T.txtPrimary,
              fontSize: '0.80rem',
              fontWeight: '700',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
              textAlign: 'left'
            }}
          >
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {selectedIngredientFilter === 'ALL'
                ? `🥬 Semua Bahan Baku (${uniqueIngredientNames.length} Item)`
                : selectedIngredientFilter}
            </span>
            <ChevronDown size={16} color={T.txtMuted} />
          </button>

          {showIngDropdown && (
            <div
              style={{
                position: 'absolute',
                top: 'calc(100% + 4px)',
                left: 0,
                right: 0,
                background: T.cardBg,
                border: `1px solid ${T.accentGoldBorder}`,
                borderRadius: '10px',
                boxShadow: '0 14px 35px rgba(0,0,0,0.65)',
                zIndex: 9999,
                padding: '10px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                minWidth: '220px'
              }}
            >
              {/* Search Input Box Inside Dropdown */}
              <div style={{ position: 'relative' }}>
                <Search size={14} color={T.txtMuted} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="text"
                  value={ingDropdownSearch}
                  onChange={e => setIngDropdownSearch(e.target.value)}
                  placeholder="🔍 Cari nama bahan..."
                  autoFocus
                  style={{
                    width: '100%',
                    padding: '6px 10px 6px 30px',
                    borderRadius: '6px',
                    border: `1px solid ${T.border}`,
                    background: T.inputBg,
                    color: T.txtPrimary,
                    fontSize: '0.76rem'
                  }}
                />
              </div>

              {/* Options List */}
              <div style={{ overflowY: 'auto', maxHeight: '200px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedIngredientFilter('ALL');
                    setShowIngDropdown(false);
                    setIngDropdownSearch('');
                    setCurrentPage(1);
                  }}
                  style={{
                    padding: '7px 10px',
                    borderRadius: '6px',
                    border: 'none',
                    background: selectedIngredientFilter === 'ALL' ? T.accentGoldBg : 'transparent',
                    color: selectedIngredientFilter === 'ALL' ? T.accentGold : T.txtPrimary,
                    fontSize: '0.78rem',
                    fontWeight: '800',
                    textAlign: 'left',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}
                >
                  <span>🥬 Semua Bahan Baku ({uniqueIngredientNames.length} Item)</span>
                  {selectedIngredientFilter === 'ALL' && <Check size={14} color={T.accentGold} />}
                </button>

                {filteredDropdownIngredients.length === 0 ? (
                  <div style={{ padding: '12px 10px', fontSize: '0.74rem', color: T.txtMuted, textAlign: 'center' }}>
                    Tidak ada nama bahan baku cocok
                  </div>
                ) : (
                  filteredDropdownIngredients.map((name, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setSelectedIngredientFilter(name);
                        setShowIngDropdown(false);
                        setIngDropdownSearch('');
                        setCurrentPage(1);
                      }}
                      style={{
                        padding: '7px 10px',
                        borderRadius: '6px',
                        border: 'none',
                        background: selectedIngredientFilter === name ? T.accentGoldBg : 'transparent',
                        color: selectedIngredientFilter === name ? T.accentGold : T.txtPrimary,
                        fontSize: '0.76rem',
                        fontWeight: selectedIngredientFilter === name ? '900' : '600',
                        textAlign: 'left',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                      }}
                    >
                      <span>{name}</span>
                      {selectedIngredientFilter === name && <Check size={14} color={T.accentGold} />}
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Calendar Widget: Dari Tanggal */}
        <div style={{ position: 'relative' }}>
          <Calendar size={15} color={T.txtMuted} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="date"
            value={startDate}
            onChange={e => { setStartDate(e.target.value); setCurrentPage(1); }}
            placeholder="Dari Tanggal"
            title="Filter Dari Tanggal"
            style={{ width: '100%', padding: '8px 12px 8px 34px', borderRadius: '8px', border: `1px solid ${T.border}`, background: T.inputBg, color: T.txtPrimary, fontSize: '0.80rem', fontWeight: '700' }}
          />
        </div>

        {/* Calendar Widget: Sampai Tanggal */}
        <div style={{ position: 'relative' }}>
          <Calendar size={15} color={T.txtMuted} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="date"
            value={endDate}
            onChange={e => { setEndDate(e.target.value); setCurrentPage(1); }}
            placeholder="Sampai Tanggal"
            title="Filter Sampai Tanggal"
            style={{ width: '100%', padding: '8px 12px 8px 34px', borderRadius: '8px', border: `1px solid ${T.border}`, background: T.inputBg, color: T.txtPrimary, fontSize: '0.80rem', fontWeight: '700' }}
          />
        </div>
      </div>

      {/* MAIN DATA TABLE MATRIX */}
      {/* Exact Column Order: Tanggal | Nama Bahan Baku | Outlet 1 | Outlet 2 | ... | Outlet N | Aksi */}
      <div style={{ background: T.cardBg, borderRadius: '16px', border: `1px solid ${T.border}`, overflow: 'hidden', boxShadow: T.cardShadow }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
            <thead>
              <tr style={{ background: T.tableHeaderBg, borderBottom: `1px solid ${T.borderStrong}`, color: T.txtSecondary, fontWeight: '800', textTransform: 'uppercase', fontSize: '0.68rem', letterSpacing: '0.04em' }}>
                <th style={{ padding: '12px 14px', textAlign: 'left', minWidth: '110px', borderRight: `1px solid ${T.border}` }}>Tanggal</th>
                <th style={{ padding: '12px 14px', textAlign: 'left', minWidth: '180px', borderRight: `1px solid ${T.border}` }}>Nama Bahan Baku</th>
                
                {/* DYNAMIC OUTLET COLUMN HEADERS */}
                {activeOutletColumns.map(otl => (
                  <th key={otl.id} style={{ padding: '12px 14px', textAlign: 'right', minWidth: '150px', borderRight: `1px solid ${T.border}` }}>
                    {otl.name}
                  </th>
                ))}

                <th style={{ padding: '12px 14px', textAlign: 'center', minWidth: '80px' }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {paginatedRows.length === 0 ? (
                <tr>
                  <td colSpan={3 + activeOutletColumns.length} style={{ padding: '40px 20px', textAlign: 'center', color: T.txtMuted, fontSize: '0.84rem' }}>
                    <Info size={32} style={{ marginBottom: '8px', opacity: 0.5 }} />
                    <br />
                    Tidak ada transaksi pembelian bahan baku yang cocok dengan filter.
                  </td>
                </tr>
              ) : (
                paginatedRows.map((row) => {
                  const formattedDate = new Date(row.date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });

                  return (
                    <tr key={row.key} style={{ borderBottom: `1px solid ${T.border}`, transition: 'background 0.15s ease' }}>
                      
                      {/* 1. Tanggal */}
                      <td style={{ padding: '10px 14px', color: T.txtPrimary, fontWeight: '700', borderRight: `1px solid ${T.border}` }}>
                        {formattedDate}
                      </td>

                      {/* 2. Nama Bahan Baku (beserta Satuan) */}
                      <td style={{ padding: '10px 14px', color: T.txtPrimary, fontWeight: '800', borderRight: `1px solid ${T.border}` }}>
                        <div>{row.ingredient_name}</div>
                        <span style={{ fontSize: '0.68rem', color: T.txtSecondary, fontWeight: '600' }}>Satuan: {row.unit}</span>
                      </td>

                      {/* 3...N. DYNAMIC OUTLET PRICE CELLS (Harga Satuan Rp / Unit) */}
                      {activeOutletColumns.map(otl => {
                        const priceObj = row.outletPrices[String(otl.id)];
                        if (!priceObj || !priceObj.unit_price) {
                          return (
                            <td key={otl.id} style={{ padding: '10px 14px', textAlign: 'right', color: T.txtMuted, borderRight: `1px solid ${T.border}` }}>
                              -
                            </td>
                          );
                        }

                        return (
                          <td key={otl.id} style={{ padding: '10px 14px', textAlign: 'right', borderRight: `1px solid ${T.border}` }}>
                            <div style={{ fontWeight: '900', color: T.txtPrimary }}>
                              Rp {priceObj.unit_price.toLocaleString('id-ID')}
                            </div>
                            <div style={{ fontSize: '0.64rem', marginTop: '2px' }}>
                              {priceObj.isMin && (
                                <span style={{ color: T.success, fontWeight: '900', background: T.successBg, padding: '2px 6px', borderRadius: '4px', border: `1px solid ${T.successBorder}` }}>
                                  🟢 Min
                                </span>
                              )}
                              {priceObj.isMax && (
                                <span style={{ color: T.danger, fontWeight: '900', background: T.dangerBg, padding: '2px 6px', borderRadius: '4px', border: `1px solid ${T.dangerBorder}` }}>
                                  🔴 Max
                                </span>
                              )}
                            </div>
                          </td>
                        );
                      })}

                      {/* N+1. Aksi (Detail Riwayat Nota) */}
                      <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                        <button
                          type="button"
                          onClick={() => setPriceHistoryItem(row)}
                          style={{ padding: '5px 9px', background: T.infoBg, border: `1px solid ${T.infoBorder}`, borderRadius: '6px', color: T.info, cursor: 'pointer' }}
                          title="Lihat Detail Riwayat Nota Pembelian"
                        >
                          <Eye size={15} />
                        </button>
                      </td>

                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINATION CONTROLS */}
        {matrixTableRows.length > 0 && (
          <div style={{ padding: '12px 16px', borderTop: `1px solid ${T.border}` }}>
            <PaginationControls
              totalItems={matrixTableRows.length}
              currentPage={currentPage}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              onPageSizeChange={(sz) => { setPageSize(sz); setCurrentPage(1); }}
              themeMode={themeMode}
            />
          </div>
        )}
      </div>

      {/* ════════════════════════════════════════════════════════════════ */}
      {/* TAB: TREN HARGA PER OUTLET (BARU)                               */}
      {/* ════════════════════════════════════════════════════════════════ */}
      {activeTab === 'trend' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* ── FILTER BAR ────────────────────────────────────────────── */}
          <div style={{ background: T.cardBg, border: `1px solid ${T.border}`, borderRadius: '14px', padding: '18px 20px', display: 'flex', flexWrap: 'wrap', gap: '14px', alignItems: 'flex-end' }}>
            
            {/* Pilih Outlet */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', minWidth: '200px' }}>
              <label style={{ fontSize: '0.72rem', fontWeight: '800', color: T.txtSecondary, textTransform: 'uppercase' }}>🏬 Pilih Outlet</label>
              <select
                value={trendOutletId}
                onChange={e => { setTrendOutletId(e.target.value); setTrendIngredient(''); }}
                style={{ padding: '8px 12px', borderRadius: '8px', border: `1px solid ${trendOutletId ? T.info : T.border}`, background: T.inputBg, color: T.txtPrimary, fontSize: '0.82rem', fontWeight: '700', cursor: 'pointer' }}
              >
                <option value=''>-- Pilih Outlet --</option>
                {outletsList.map(o => (
                  <option key={o.id} value={String(o.id)}>{o.name}</option>
                ))}
              </select>
            </div>

            {/* Pilih Bahan Baku (searchable dropdown) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', minWidth: '220px', position: 'relative' }}>
              <label style={{ fontSize: '0.72rem', fontWeight: '800', color: T.txtSecondary, textTransform: 'uppercase' }}>🥬 Pilih Bahan Baku</label>
              <button
                type='button'
                onClick={() => { if (trendOutletId) setShowTrendIngDropdown(!showTrendIngDropdown); }}
                style={{
                  padding: '8px 12px', borderRadius: '8px', cursor: trendOutletId ? 'pointer' : 'not-allowed',
                  border: `1px solid ${trendIngredient ? T.accentGold : T.border}`,
                  background: trendOutletId ? T.inputBg : T.cardBg2,
                  color: trendIngredient ? T.accentGold : T.txtSecondary,
                  fontSize: '0.82rem', fontWeight: '700',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px'
                }}
              >
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {trendIngredient || (trendOutletId ? 'Pilih bahan baku...' : 'Pilih outlet dulu')}
                </span>
                <ChevronDown size={14} color={T.txtMuted} />
              </button>

              {showTrendIngDropdown && trendOutletId && (
                <div style={{
                  position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0,
                  background: T.cardBg, border: `1px solid ${T.accentGoldBorder}`,
                  borderRadius: '10px', boxShadow: '0 14px 35px rgba(0,0,0,0.65)',
                  zIndex: 9999, padding: '10px', display: 'flex', flexDirection: 'column', gap: '6px'
                }}>
                  <div style={{ position: 'relative' }}>
                    <Search size={13} color={T.txtMuted} style={{ position: 'absolute', left: '9px', top: '50%', transform: 'translateY(-50%)' }} />
                    <input
                      type='text'
                      value={trendIngSearch}
                      onChange={e => setTrendIngSearch(e.target.value)}
                      placeholder='Cari bahan baku...'
                      autoFocus
                      style={{ width: '100%', padding: '6px 10px 6px 28px', borderRadius: '6px', border: `1px solid ${T.border}`, background: T.inputBg, color: T.txtPrimary, fontSize: '0.76rem' }}
                    />
                  </div>
                  <div style={{ overflowY: 'auto', maxHeight: '200px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    {filteredTrendIngOptions.length === 0 ? (
                      <div style={{ padding: '10px', fontSize: '0.74rem', color: T.txtMuted, textAlign: 'center' }}>Tidak ada data</div>
                    ) : filteredTrendIngOptions.map((name, i) => (
                      <button
                        key={i} type='button'
                        onClick={() => { setTrendIngredient(name); setShowTrendIngDropdown(false); setTrendIngSearch(''); }}
                        style={{
                          padding: '7px 10px', borderRadius: '6px', border: 'none', textAlign: 'left', cursor: 'pointer',
                          background: trendIngredient === name ? T.accentGoldBg : 'transparent',
                          color: trendIngredient === name ? T.accentGold : T.txtPrimary,
                          fontSize: '0.78rem', fontWeight: trendIngredient === name ? '900' : '600',
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                        }}
                      >
                        <span>{name}</span>
                        {trendIngredient === name && <Check size={13} color={T.accentGold} />}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Reset */}
            {(trendOutletId || trendIngredient) && (
              <button
                onClick={() => { setTrendOutletId(''); setTrendIngredient(''); setTrendIngSearch(''); }}
                style={{ padding: '8px 14px', borderRadius: '8px', border: `1px solid ${T.border}`, background: 'transparent', color: T.txtMuted, fontSize: '0.78rem', fontWeight: '700', cursor: 'pointer', alignSelf: 'flex-end' }}
              >
                ✕ Reset
              </button>
            )}
          </div>

          {/* ── PLACEHOLDER JIKA BELUM PILIH ──────────────────────────── */}
          {(!trendOutletId || !trendIngredient) && (
            <div style={{ background: T.cardBg, border: `1px dashed ${T.border}`, borderRadius: '14px', padding: '48px 20px', textAlign: 'center' }}>
              <History size={42} color={T.txtMuted} style={{ opacity: 0.4, marginBottom: '12px' }} />
              <div style={{ fontSize: '0.90rem', color: T.txtMuted, fontWeight: '700' }}>Pilih Outlet dan Bahan Baku</div>
              <div style={{ fontSize: '0.76rem', color: T.txtMuted, marginTop: '6px' }}>untuk melihat tren harga dari waktu ke waktu pada outlet tersebut</div>
            </div>
          )}

          {/* ── SUMMARY MINI CARDS ────────────────────────────────────── */}
          {trendOutletId && trendIngredient && trendStats && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
              
              <div style={{ background: T.cardBg, border: `1px solid ${T.infoBorder}`, borderRadius: '12px', padding: '14px 16px' }}>
                <div style={{ fontSize: '0.66rem', color: T.txtSecondary, fontWeight: '800', textTransform: 'uppercase', marginBottom: '6px' }}>📋 Total Pembelian</div>
                <div style={{ fontSize: '1.30rem', fontWeight: '900', color: T.info }}>{trendRows.length}×</div>
                <div style={{ fontSize: '0.68rem', color: T.txtMuted, marginTop: '2px' }}>transaksi tercatat</div>
              </div>

              <div style={{ background: T.cardBg, border: `1px solid ${T.successBorder}`, borderRadius: '12px', padding: '14px 16px' }}>
                <div style={{ fontSize: '0.66rem', color: T.txtSecondary, fontWeight: '800', textTransform: 'uppercase', marginBottom: '6px' }}>🟢 Harga Terendah</div>
                <div style={{ fontSize: '1.10rem', fontWeight: '900', color: T.success }}>Rp {trendStats.min.toLocaleString('id-ID')}</div>
                <div style={{ fontSize: '0.68rem', color: T.txtMuted, marginTop: '2px' }}>per unit terbaik</div>
              </div>

              <div style={{ background: T.cardBg, border: `1px solid ${T.dangerBorder}`, borderRadius: '12px', padding: '14px 16px' }}>
                <div style={{ fontSize: '0.66rem', color: T.txtSecondary, fontWeight: '800', textTransform: 'uppercase', marginBottom: '6px' }}>🔴 Harga Tertinggi</div>
                <div style={{ fontSize: '1.10rem', fontWeight: '900', color: T.danger }}>Rp {trendStats.max.toLocaleString('id-ID')}</div>
                <div style={{ fontSize: '0.68rem', color: T.txtMuted, marginTop: '2px' }}>per unit termahal</div>
              </div>

              <div style={{ background: T.cardBg, border: `1px solid ${T.border}`, borderRadius: '12px', padding: '14px 16px' }}>
                <div style={{ fontSize: '0.66rem', color: T.txtSecondary, fontWeight: '800', textTransform: 'uppercase', marginBottom: '6px' }}>💵 Rata-Rata Harga</div>
                <div style={{ fontSize: '1.10rem', fontWeight: '900', color: T.txtPrimary }}>Rp {trendStats.avg.toLocaleString('id-ID')}</div>
                <div style={{ fontSize: '0.68rem', color: T.txtMuted, marginTop: '2px' }}>rata-rata semua pembelian</div>
              </div>

              <div style={{ background: T.cardBg, border: `1px solid ${trendStats.totalChange > 0 ? T.dangerBorder : trendStats.totalChange < 0 ? T.successBorder : T.border}`, borderRadius: '12px', padding: '14px 16px' }}>
                <div style={{ fontSize: '0.66rem', color: T.txtSecondary, fontWeight: '800', textTransform: 'uppercase', marginBottom: '6px' }}>📈 Total Perubahan Harga</div>
                <div style={{ fontSize: '1.10rem', fontWeight: '900', color: trendStats.totalChange > 0 ? T.danger : trendStats.totalChange < 0 ? T.success : T.txtMuted }}>
                  {trendStats.totalChange > 0 ? '+' : ''}{trendStats.totalChange.toLocaleString('id-ID')}
                  {trendStats.totalPct && <span style={{ fontSize: '0.74rem', marginLeft: '5px' }}>({trendStats.totalChange > 0 ? '+' : ''}{trendStats.totalPct}%)</span>}
                </div>
                <div style={{ fontSize: '0.68rem', color: T.txtMuted, marginTop: '2px' }}>dari pembelian pertama → terbaru</div>
              </div>

            </div>
          )}

          {/* ── TABEL TREN HARGA ──────────────────────────────────────── */}
          {trendOutletId && trendIngredient && (
            <div style={{ background: T.cardBg, border: `1px solid ${T.border}`, borderRadius: '14px', overflow: 'hidden' }}>
              
              {/* Header Tabel */}
              <div style={{ padding: '14px 20px', borderBottom: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', gap: '10px', background: T.cardBg2 }}>
                <History size={16} color={T.info} />
                <span style={{ fontWeight: '800', fontSize: '0.88rem', color: T.txtPrimary }}>
                  Tren Harga: <span style={{ color: T.accentGold }}>{trendIngredient}</span>
                  <span style={{ color: T.txtSecondary, fontWeight: '600' }}> — {outletsList.find(o => String(o.id) === String(trendOutletId))?.name || 'Outlet'}</span>
                </span>
                <span style={{ marginLeft: 'auto', fontSize: '0.72rem', color: T.txtMuted, fontWeight: '700' }}>
                  {trendRows.length} transaksi
                </span>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                  <thead>
                    <tr style={{ background: T.cardBg2, color: T.txtSecondary, textTransform: 'uppercase', fontSize: '0.68rem', borderBottom: `2px solid ${T.border}` }}>
                      <th style={{ padding: '12px 14px', textAlign: 'left', fontWeight: '800' }}>No</th>
                      <th style={{ padding: '12px 14px', textAlign: 'left', fontWeight: '800' }}>Tanggal</th>
                      <th style={{ padding: '12px 14px', textAlign: 'left', fontWeight: '800' }}>Sumber Data</th>
                      <th style={{ padding: '12px 14px', textAlign: 'left', fontWeight: '800' }}>Supplier / Catatan</th>
                      <th style={{ padding: '12px 14px', textAlign: 'center', fontWeight: '800' }}>Qty</th>
                      <th style={{ padding: '12px 14px', textAlign: 'right', fontWeight: '800', color: T.accentGold }}>Harga Satuan</th>
                      <th style={{ padding: '12px 14px', textAlign: 'right', fontWeight: '800' }}>Total Rp</th>
                      <th style={{ padding: '12px 14px', textAlign: 'center', fontWeight: '800' }}>Perubahan Harga</th>
                      <th style={{ padding: '12px 14px', textAlign: 'center', fontWeight: '800' }}>% Naik/Turun</th>
                    </tr>
                  </thead>
                  <tbody>
                    {trendRows.length === 0 ? (
                      <tr>
                        <td colSpan={9} style={{ padding: '40px', textAlign: 'center', color: T.txtMuted }}>
                          <History size={32} style={{ opacity: 0.3, marginBottom: '8px' }} />
                          <br />
                          Belum ada data pembelian untuk bahan baku ini di outlet tersebut.
                        </td>
                      </tr>
                    ) : trendRows.map((r, idx) => {
                      const rowNo = trendRows.length - idx;
                      const hasDiff = r.diff !== null;
                      const isUp    = hasDiff && r.diff > 0;
                      const isDown  = hasDiff && r.diff < 0;
                      const isFlat  = hasDiff && r.diff === 0;
                      const formattedDate = new Date(r.date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });

                      return (
                        <tr
                          key={idx}
                          style={{
                            borderBottom: `1px solid ${T.border}`,
                            background: idx === 0 ? 'rgba(56,189,248,0.04)' : 'transparent',
                            transition: 'background 0.15s'
                          }}
                          className='hover:bg-slate-800/40'
                        >
                          {/* No */}
                          <td style={{ padding: '10px 14px', color: T.txtMuted, fontWeight: '700', fontSize: '0.72rem' }}>
                            {rowNo}
                            {idx === 0 && <span style={{ display: 'block', fontSize: '0.60rem', color: T.info, fontWeight: '800' }}>TERBARU</span>}
                          </td>

                          {/* Tanggal */}
                          <td style={{ padding: '10px 14px', fontWeight: '700', color: T.txtPrimary, whiteSpace: 'nowrap' }}>
                            {formattedDate}
                          </td>

                          {/* Sumber */}
                          <td style={{ padding: '10px 14px' }}>
                            <span style={{
                              padding: '3px 8px', borderRadius: '5px', fontSize: '0.68rem', fontWeight: '800',
                              background: r.source === 'Logistik' ? 'rgba(56,189,248,0.12)'
                                : r.source === 'Laporan Harian' ? 'rgba(251,191,36,0.12)'
                                : r.source === 'Master HPP' ? 'rgba(139,92,246,0.12)'
                                : 'rgba(52,211,153,0.12)',
                              color: r.source === 'Logistik' ? T.info
                                : r.source === 'Laporan Harian' ? T.accentGold
                                : r.source === 'Master HPP' ? '#a78bfa'
                                : T.success
                            }}>
                              {r.source}
                            </span>
                          </td>

                          {/* Supplier */}
                          <td style={{ padding: '10px 14px', color: T.txtSecondary, fontSize: '0.76rem', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {r.supplier_name || '-'}
                          </td>

                          {/* Qty */}
                          <td style={{ padding: '10px 14px', textAlign: 'center', fontWeight: '700', color: T.txtPrimary }}>
                            {r.qty} <span style={{ fontSize: '0.68rem', color: T.txtMuted }}>{r.unit}</span>
                          </td>

                          {/* Harga Satuan */}
                          <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: '900', fontSize: '0.90rem', color: T.accentGold, whiteSpace: 'nowrap' }}>
                            Rp {r.unit_price.toLocaleString('id-ID')}
                          </td>

                          {/* Total Rp */}
                          <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: '700', color: T.txtPrimary, whiteSpace: 'nowrap' }}>
                            Rp {(r.total_price || 0).toLocaleString('id-ID')}
                          </td>

                          {/* Selisih Harga */}
                          <td style={{ padding: '10px 14px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                            {!hasDiff ? (
                              <span style={{ fontSize: '0.68rem', color: T.txtMuted }}>—</span>
                            ) : (
                              <span style={{
                                display: 'inline-flex', alignItems: 'center', gap: '3px',
                                padding: '3px 8px', borderRadius: '6px', fontSize: '0.72rem', fontWeight: '800',
                                background: isUp ? 'rgba(244,63,94,0.12)' : isDown ? 'rgba(52,211,153,0.12)' : 'rgba(148,163,184,0.10)',
                                color: isUp ? T.danger : isDown ? T.success : T.txtMuted,
                                border: `1px solid ${isUp ? 'rgba(244,63,94,0.25)' : isDown ? 'rgba(52,211,153,0.25)' : T.border}`
                              }}>
                                {isUp && <ArrowUpRight size={11} />}
                                {isDown && <ArrowDownRight size={11} />}
                                {isFlat && <Minus size={11} />}
                                {isUp ? '+' : ''}{r.diff.toLocaleString('id-ID')}
                              </span>
                            )}
                          </td>

                          {/* % */}
                          <td style={{ padding: '10px 14px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                            {r.pct === null ? (
                              <span style={{ fontSize: '0.68rem', color: T.txtMuted }}>—</span>
                            ) : (
                              <span style={{
                                display: 'inline-flex', alignItems: 'center', gap: '2px',
                                padding: '3px 9px', borderRadius: '20px', fontSize: '0.70rem', fontWeight: '900',
                                background: r.pct > 5 ? 'rgba(244,63,94,0.15)' : r.pct < -5 ? 'rgba(52,211,153,0.15)' : 'rgba(148,163,184,0.10)',
                                color: r.pct > 5 ? T.danger : r.pct < -5 ? T.success : T.txtSecondary
                              }}>
                                {r.pct > 0 ? '↑' : r.pct < 0 ? '↓' : '='} {Math.abs(r.pct).toFixed(1)}%
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Footer info */}
              {trendRows.length > 0 && (
                <div style={{ padding: '10px 20px', borderTop: `1px solid ${T.border}`, background: T.cardBg2, fontSize: '0.70rem', color: T.txtMuted, fontWeight: '600' }}>
                  📌 Data diurutkan dari transaksi terbaru → terlama. Kolom &ldquo;Perubahan Harga&rdquo; menunjukkan selisih harga satuan dibandingkan pembelian sebelumnya.
                </div>
              )}
            </div>
          )}

        </div>
      )}

    </div>
  );
}
