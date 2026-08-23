import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Search,
  ChevronDown,
  Check,
  History,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  DollarSign,
  AlertTriangle,
  RotateCcw,
  Building2,
  Calendar,
  Filter,
  Sparkles,
  ShoppingBag,
  Activity
} from 'lucide-react';
import { getThemePalette } from '../../utils/themeUtils';
import { DoubleCalendarPicker } from './SalesTransactionsPage';

export default function IngredientPriceTrendPage({
  masterData,
  selectedBranch,
  themeMode = 'dark'
}) {
  const T = getThemePalette(themeMode);

  // ─── Filter States ───────────────────────────────────────────────────────
  const [trendOutletId,        setTrendOutletId]        = useState('');
  const [trendIngredient,      setTrendIngredient]      = useState('');
  const [trendIngSearch,       setTrendIngSearch]       = useState('');
  const [showTrendIngDropdown, setShowTrendIngDropdown] = useState(false);

  // Date Range Filter States
  const [selectedYear, setSelectedYear]   = useState('');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [datePreset, setDatePreset] = useState('all');
  const [showCalendarPopover, setShowCalendarPopover] = useState(false);

  const outletsList = useMemo(() => masterData?.outlets || [], [masterData]);

  const getOutletName = (id) => {
    const o = outletsList.find(o => String(o.id) === String(id));
    return o ? o.name : 'Outlet';
  };

  // ─── 1. Opsi Bahan Baku: DIAMPIL DARI DATA MASTER BAHAN BAKU ─────────────
  const masterIngredientsList = useMemo(() => {
    const set = new Set();
    // Prioritas Utama: Data Master Bahan Baku
    (masterData?.ingredients || []).forEach(ing => {
      if (ing?.name) set.add(ing.name.trim());
    });
    // Tambahkan juga jika ada transaksi laporan harian yang pakai nama bahan baku lain
    (masterData?.dailyReports || []).forEach(rep => {
      (rep.expenses || rep.pengeluaran || []).forEach(ex => {
        const name = ex.ingredient_name || ex.item_name || ex.name;
        if (name) set.add(name.trim());
      });
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [masterData]);

  const filteredTrendIngOptions = useMemo(() => {
    if (!trendIngSearch.trim()) return masterIngredientsList;
    return masterIngredientsList.filter(n =>
      n.toLowerCase().includes(trendIngSearch.toLowerCase())
    );
  }, [masterIngredientsList, trendIngSearch]);

  // ─── 2. Data Pembelian: DIAMPIL DARI LAPORAN HARIAN (DAN LOGISTIK) ───────
  const allPurchaseRecords = useMemo(() => {
    const records = [];

    // Prioritas Utama: Laporan Harian (dailyReports)
    (masterData?.dailyReports || []).forEach(rep => {
      const date = String(rep.entry_date || rep.date || rep.created_at || '').substring(0, 10);
      (rep.expenses || rep.pengeluaran || []).forEach(ex => {
        const name = ex.ingredient_name || ex.item_name || ex.name;
        if (!name) return;
        records.push({
          date: date || new Date().toISOString().substring(0, 10),
          ingredient_name: name.trim(),
          unit: ex.unit || ex.satuan || 'kg',
          qty: Number(ex.qty || ex.quantity || 1),
          unit_price: Number(ex.unit_price || ex.harga_satuan || ex.price || 0),
          total_price: Number(ex.total_price || ex.total || ex.amount || 0),
          outlet_id: String(rep.outlet_id || rep.branch_id || outletsList[0]?.id || 1),
          outlet_name: rep.outlet_name || getOutletName(rep.outlet_id),
          supplier_name: ex.supplier || ex.notes || 'Laporan Harian',
          source: 'Laporan Harian'
        });
      });
    });

    // Tambahan: Logistik (stokMasuk)
    (masterData?.stokMasuk || masterData?.logistics || []).forEach(log => {
      const date = String(log.date || log.created_at || '').substring(0, 10);
      (log.items || log.ingredients || []).forEach(item => {
        const ingName = item.ingredient_name || item.name || item.item_name;
        if (!ingName) return;
        records.push({
          date: date || new Date().toISOString().substring(0, 10),
          ingredient_name: ingName.trim(),
          unit: item.unit || item.satuan || 'kg',
          qty: Number(item.qty || item.quantity || 0),
          unit_price: Number(item.unit_price || item.harga_satuan || item.price || 0),
          total_price: Number(item.total_price || item.total || 0),
          outlet_id: String(log.outlet_id || log.branch_id || outletsList[0]?.id || 1),
          outlet_name: log.outlet_name || getOutletName(log.outlet_id),
          supplier_name: log.supplier_name || log.supplier || item.supplier || 'Logistik',
          source: 'Logistik'
        });
      });
    });

    // Tambahan: Update Laporan / Manual
    (masterData?.manualReports || masterData?.updateLaporan || []).forEach(man => {
      const date = String(man.entry_date || man.date || man.created_at || '').substring(0, 10);
      (man.expenses || man.pengeluaran || []).forEach(ex => {
        const name = ex.ingredient_name || ex.item_name || ex.name;
        if (!name) return;
        records.push({
          date: date || new Date().toISOString().substring(0, 10),
          ingredient_name: name.trim(),
          unit: ex.unit || ex.satuan || 'kg',
          qty: Number(ex.qty || ex.quantity || 1),
          unit_price: Number(ex.unit_price || ex.harga_satuan || ex.price || 0),
          total_price: Number(ex.total_price || ex.total || ex.amount || 0),
          outlet_id: String(man.outlet_id || man.branch_id || outletsList[0]?.id || 1),
          outlet_name: man.outlet_name || getOutletName(man.outlet_id),
          supplier_name: ex.notes || 'Update Laporan Manual',
          source: 'Update Laporan'
        });
      });
    });

    // Master HPP Standar (sebagai baseline awal untuk semua outlet)
    (masterData?.ingredients || []).forEach(ing => {
      if (!ing.name) return;
      const cost = Number(ing.cost || ing.harga || 0);
      outletsList.forEach(otl => {
        records.push({
          date: new Date().toISOString().substring(0, 10),
          ingredient_name: ing.name.trim(),
          unit: ing.unit || ing.satuan || 'kg',
          qty: 1,
          unit_price: cost,
          total_price: cost,
          outlet_id: String(otl.id),
          outlet_name: otl.name,
          supplier_name: 'Master Data HPP Standard',
          source: 'Master HPP'
        });
      });
    });

    return records;
  }, [masterData, outletsList]);

  // ─── 3. Filter Tren dengan Rentang Waktu Tanggal ────────────────────────
  const trendRows = useMemo(() => {
    if (!trendOutletId || !trendIngredient) return [];
    
    // Filter outlet, nama bahan baku, dan rentang tanggal
    const rows = allPurchaseRecords.filter(r => {
      if (String(r.outlet_id) !== String(trendOutletId)) return false;
      if (r.ingredient_name.toLowerCase().trim() !== trendIngredient.toLowerCase().trim()) return false;
      if (r.unit_price <= 0) return false;
      
      // Rentang Tanggal Kalender
      if (startDate && r.date < startDate) return false;
      if (endDate && r.date > endDate) return false;

      return true;
    });

    // Urutkan terlama -> terbaru untuk menghitung selisih & %
    const sorted = [...rows].sort((a, b) => new Date(a.date) - new Date(b.date));
    return sorted.map((r, idx) => {
      const prev = idx > 0 ? sorted[idx - 1] : null;
      const diff = prev ? r.unit_price - prev.unit_price : null;
      const pct  = (prev && prev.unit_price > 0) ? ((diff / prev.unit_price) * 100) : null;
      return { ...r, diff, pct };
    }).reverse(); // Tampilkan terbaru di atas pada tabel
  }, [allPurchaseRecords, trendOutletId, trendIngredient, startDate, endDate]);

  const trendStats = useMemo(() => {
    if (!trendIngredient) return null;

    if (trendRows.length === 0) {
      const masterIng = (masterData?.ingredients || []).find(i => i.name && i.name.trim().toLowerCase() === trendIngredient.toLowerCase().trim());
      const baseCost = Number(masterIng?.cost || masterIng?.harga || 0);
      const unit = masterIng?.unit || masterIng?.satuan || 'Kg';
      return {
        min: baseCost,
        max: baseCost,
        avg: baseCost,
        totalSpend: 0,
        totalQty: 0,
        unit: unit,
        newest: baseCost,
        oldest: baseCost,
        totalChange: 0,
        totalPct: '0.0',
        volatilityPct: '0.0',
        upCount: 0,
        downCount: 0,
        flatCount: 0,
        statusText: 'Baseline Master Data HPP',
        statusColor: T.info
      };
    }

    const prices = trendRows.map(r => r.unit_price);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const avg = Math.round(prices.reduce((a, b) => a + b, 0) / prices.length);
    const totalSpend = trendRows.reduce((sum, r) => sum + (r.total_price || 0), 0);
    const totalQty = trendRows.reduce((sum, r) => sum + Number(r.qty || 0), 0);
    const unit = trendRows[0]?.unit || 'Kg';
    const newest = trendRows[0]?.unit_price || 0;
    const oldest = trendRows[trendRows.length - 1]?.unit_price || 0;
    const totalChange = newest - oldest;
    const totalPct = oldest > 0 ? ((totalChange / oldest) * 100).toFixed(1) : null;
    const volatilityPct = min > 0 ? (((max - min) / min) * 100).toFixed(1) : 0;
    const upCount   = trendRows.filter(r => r.diff !== null && r.diff > 0).length;
    const downCount = trendRows.filter(r => r.diff !== null && r.diff < 0).length;
    const flatCount = trendRows.filter(r => r.diff !== null && r.diff === 0).length;

    let statusText = 'Harga Stabil';
    let statusColor = T.info;
    if (totalChange > 0) {
      statusText = `Mengalami Kenaikan (+${totalPct}%)`;
      statusColor = T.danger;
    } else if (totalChange < 0) {
      statusText = `Mengalami Penurunan (${totalPct}%)`;
      statusColor = T.success;
    }

    return { min, max, avg, totalSpend, totalQty, unit, newest, oldest, totalChange, totalPct, volatilityPct, upCount, downCount, flatCount, statusText, statusColor };
  }, [trendRows, trendIngredient, masterData, T]);

  // Auto-select outlet and ingredient if available so resume cards are immediately visible!
  React.useEffect(() => {
    if (!trendOutletId && outletsList.length > 0) {
      if (selectedBranch && selectedBranch !== 'ALL' && selectedBranch !== 'Semua Restoran (Konsolidasi)') {
        setTrendOutletId(String(selectedBranch));
      } else {
        setTrendOutletId(String(outletsList[0].id));
      }
    }
  }, [outletsList, selectedBranch, trendOutletId]);

  React.useEffect(() => {
    if (trendOutletId && !trendIngredient && masterIngredientsList.length > 0) {
      setTrendIngredient(masterIngredientsList[0]);
    }
  }, [trendOutletId, masterIngredientsList, trendIngredient]);

  const selectedOutletName = outletsList.find(o => String(o.id) === String(trendOutletId))?.name || '';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }} className="animate-fade-in">

      {/* PAGE HEADER */}
      <div style={{ background: T.cardBg, padding: '20px 24px', borderRadius: '16px', border: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
        <div style={{ padding: '12px', background: 'rgba(56,189,248,0.12)', border: '1px solid rgba(56,189,248,0.25)', borderRadius: '14px' }}>
          <TrendingUp size={28} color={T.info} />
        </div>
        <div>
          <h1 style={{ fontSize: '1.30rem', fontWeight: '900', color: T.txtPrimary, margin: 0 }}>
            Tren Harga Per Outlet
          </h1>
          <p style={{ fontSize: '0.78rem', color: T.txtSecondary, margin: '3px 0 0 0' }}>
            Lacak perubahan harga bahan baku (Data Master Bahan Baku) dari Laporan Harian Outlet dalam rentang waktu tanggal tertentu.
          </p>
        </div>
      </div>

      {/* FILTER BAR 1 BARIS TAMPILAN */}
      <div style={{ background: T.cardBg, border: `1px solid ${T.border}`, borderRadius: '14px', padding: '16px 20px', display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'flex-end' }}>

        {/* 1. Pilih Outlet */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: '1 1 180px', minWidth: '170px' }}>
          <label style={{ fontSize: '0.72rem', fontWeight: '800', color: T.txtSecondary, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '5px' }}>
            <Building2 size={13} /> Pilih Outlet
          </label>
          <select
            value={trendOutletId}
            onChange={e => { setTrendOutletId(e.target.value); setTrendIngredient(''); setTrendIngSearch(''); }}
            style={{ height: '40px', padding: '0 12px', borderRadius: '6px', border: `1px solid ${trendOutletId ? T.info : T.border}`, background: T.inputBg, color: T.txtPrimary, fontSize: '0.84rem', fontWeight: '700', cursor: 'pointer' }}
          >
            <option value="">-- Pilih Outlet --</option>
            {outletsList.map(o => (
              <option key={o.id} value={String(o.id)}>{o.name}</option>
            ))}
          </select>
        </div>

        {/* 2. Pilih Bahan Baku (Searchable Dropdown) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: '1 1 200px', minWidth: '180px', position: 'relative' }}>
          <label style={{ fontSize: '0.72rem', fontWeight: '800', color: T.txtSecondary, textTransform: 'uppercase' }}>
            Pilih Bahan Baku
          </label>
          <button
            type="button"
            onClick={() => { if (trendOutletId) setShowTrendIngDropdown(v => !v); }}
            style={{ height: '40px', padding: '0 12px', borderRadius: '6px', cursor: trendOutletId ? 'pointer' : 'not-allowed', border: `1px solid ${trendIngredient ? T.accentGold : T.border}`, background: trendOutletId ? T.inputBg : T.cardBg2, color: trendIngredient ? T.accentGold : T.txtPrimary, fontSize: '0.84rem', fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}
          >
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {trendIngredient || (trendOutletId ? 'Pilih bahan baku...' : 'Pilih outlet dulu')}
            </span>
            <ChevronDown size={14} color={T.txtMuted} />
          </button>

          {showTrendIngDropdown && trendOutletId && (
            <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, background: T.cardBg, border: `1px solid ${T.accentGoldBorder}`, borderRadius: '10px', boxShadow: '0 16px 40px rgba(0,0,0,0.6)', zIndex: 9999, padding: '10px', display: 'flex', flexDirection: 'column', gap: '6px', minWidth: '230px' }}>
              <div style={{ position: 'relative' }}>
                <Search size={13} color={T.txtMuted} style={{ position: 'absolute', left: '9px', top: '50%', transform: 'translateY(-50%)' }} />
                <input type="text" value={trendIngSearch} onChange={e => setTrendIngSearch(e.target.value)} placeholder="Cari nama bahan..." autoFocus style={{ width: '100%', padding: '7px 10px 7px 30px', borderRadius: '6px', border: `1px solid ${T.border}`, background: T.inputBg, color: T.txtPrimary, fontSize: '0.78rem' }} />
              </div>
              <div style={{ overflowY: 'auto', maxHeight: '220px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                {filteredTrendIngOptions.length === 0 ? (
                  <div style={{ padding: '12px', fontSize: '0.74rem', color: T.txtMuted, textAlign: 'center' }}>Tidak ada data bahan baku master</div>
                ) : filteredTrendIngOptions.map((name, i) => (
                  <button key={i} type="button" onClick={() => { setTrendIngredient(name); setShowTrendIngDropdown(false); setTrendIngSearch(''); }} style={{ padding: '7px 10px', borderRadius: '6px', border: 'none', textAlign: 'left', cursor: 'pointer', background: trendIngredient === name ? T.accentGoldBg : 'transparent', color: trendIngredient === name ? T.accentGold : T.txtPrimary, fontSize: '0.80rem', fontWeight: trendIngredient === name ? '900' : '600', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>{name}</span>
                    {trendIngredient === name && <Check size={13} color={T.accentGold} />}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 3. Rentang Waktu Tanggal (DoubleCalendarPicker) */}
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

        {/* 4. Reset Button */}
        {(trendOutletId || trendIngredient || startDate || endDate || datePreset !== 'all') && (
          <button onClick={() => { setTrendOutletId(''); setTrendIngredient(''); setTrendIngSearch(''); setStartDate(''); setEndDate(''); setDatePreset('all'); setShowTrendIngDropdown(false); }} style={{ height: '38px', padding: '0 14px', borderRadius: '8px', border: `1px solid ${T.border}`, background: 'transparent', color: T.txtMuted, fontSize: '0.78rem', fontWeight: '700', cursor: 'pointer', alignSelf: 'center', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <RotateCcw size={13} /> Reset Filter
          </button>
        )}
      </div>

      {/* PLACEHOLDER JIKA BELUM MEMILIH */}
      {(!trendOutletId || !trendIngredient) && (
        <div style={{ background: T.cardBg, border: `1px dashed ${T.border}`, borderRadius: '14px', padding: '64px 20px', textAlign: 'center' }}>
          <History size={48} color={T.txtMuted} style={{ opacity: 0.3, marginBottom: '14px' }} />
          <div style={{ fontSize: '1.0rem', color: T.txtMuted, fontWeight: '700' }}>
            {!trendOutletId ? 'Pilih Outlet terlebih dahulu' : 'Pilih Bahan Baku (Master Data) untuk melihat tren harga'}
          </div>
          <div style={{ fontSize: '0.76rem', color: T.txtMuted, marginTop: '8px' }}>
            Data pembelian akan difilter berdasarkan Laporan Harian Outlet dan rentang tanggal yang dipilih.
          </div>
        </div>
      )}

      {/* SUMMARY KPI CARDS (SUSUNAN 1 BARIS TAMPILAN - 4 CARD UTAMA) */}
      {trendOutletId && trendIngredient && trendStats && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '12px',
          alignItems: 'stretch'
        }}>
          
          {/* Card 1: Total Belanja (Spend) */}
          <div style={{ background: T.cardBg, border: `1px solid ${T.infoBorder}`, borderRadius: '13px', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '9px', background: T.infoBg, borderRadius: '10px' }}><ShoppingBag size={20} color={T.info} /></div>
            <div>
              <div style={{ fontSize: '0.64rem', color: T.txtSecondary, fontWeight: '800', textTransform: 'uppercase' }}>Total Belanja (Spend)</div>
              <div style={{ fontSize: '1.15rem', fontWeight: '900', color: T.info, lineHeight: 1.1 }}>Rp {trendStats.totalSpend.toLocaleString('id-ID')}</div>
              <div style={{ fontSize: '0.64rem', color: T.txtMuted }}>{trendRows.length}× transaksi ({trendStats.totalQty} {trendStats.unit})</div>
            </div>
          </div>

          {/* Card 2: Harga Pembelian Terbaru */}
          <div style={{ background: T.cardBg, border: `1px solid ${T.accentGoldBorder}`, borderRadius: '13px', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '9px', background: T.accentGoldBg, borderRadius: '10px' }}><DollarSign size={20} color={T.accentGold} /></div>
            <div>
              <div style={{ fontSize: '0.64rem', color: T.txtSecondary, fontWeight: '800', textTransform: 'uppercase' }}>Harga Terbaru</div>
              <div style={{ fontSize: '1.15rem', fontWeight: '900', color: T.accentGold, lineHeight: 1.1 }}>Rp {trendStats.newest.toLocaleString('id-ID')}</div>
              <div style={{ fontSize: '0.64rem', color: T.txtMuted }}>per {trendStats.unit} (Awal: Rp {trendStats.oldest.toLocaleString('id-ID')})</div>
            </div>
          </div>

          {/* Card 3: Harga Terendah */}
          <div style={{ background: T.cardBg, border: `1px solid ${T.successBorder}`, borderRadius: '13px', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '9px', background: T.successBg, borderRadius: '10px' }}><TrendingDown size={20} color={T.success} /></div>
            <div>
              <div style={{ fontSize: '0.64rem', color: T.txtSecondary, fontWeight: '800', textTransform: 'uppercase' }}>Harga Terendah</div>
              <div style={{ fontSize: '1.15rem', fontWeight: '900', color: T.success, lineHeight: 1.1 }}>Rp {trendStats.min.toLocaleString('id-ID')}</div>
              <div style={{ fontSize: '0.64rem', color: T.txtMuted }}>harga terbaik per {trendStats.unit}</div>
            </div>
          </div>

          {/* Card 4: Harga Tertinggi */}
          <div style={{ background: T.cardBg, border: `1px solid ${T.dangerBorder}`, borderRadius: '13px', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '9px', background: T.dangerBg, borderRadius: '10px' }}><TrendingUp size={20} color={T.danger} /></div>
            <div>
              <div style={{ fontSize: '0.64rem', color: T.txtSecondary, fontWeight: '800', textTransform: 'uppercase' }}>Harga Tertinggi</div>
              <div style={{ fontSize: '1.15rem', fontWeight: '900', color: T.danger, lineHeight: 1.1 }}>Rp {trendStats.max.toLocaleString('id-ID')}</div>
              <div style={{ fontSize: '0.64rem', color: T.txtMuted }}>harga puncak per {trendStats.unit}</div>
            </div>
          </div>

        </div>
      )}

      {/* TABEL TREN HARGA */}
      {trendOutletId && trendIngredient && (
        <div style={{ background: T.cardBg, border: `1px solid ${T.border}`, borderRadius: '14px', overflow: 'hidden' }}>
          <div style={{ padding: '14px 20px', borderBottom: `1px solid ${T.border}`, background: T.cardBg2, display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <History size={17} color={T.info} />
            <span style={{ fontWeight: '900', fontSize: '0.92rem', color: T.txtPrimary }}>
              Tren Harga: <span style={{ color: T.accentGold }}>{trendIngredient}</span>
              <span style={{ color: T.txtSecondary, fontWeight: '600' }}> — {selectedOutletName}</span>
            </span>
            {(startDate || endDate) && (
              <span style={{ fontSize: '0.70rem', color: T.info, background: T.infoBg, padding: '3px 9px', borderRadius: '6px', border: `1px solid ${T.infoBorder}`, fontWeight: '700' }}>
                Periode: {startDate || 'Awal'} s/d {endDate || 'Sekarang'}
              </span>
            )}
            <span style={{ marginLeft: 'auto', fontSize: '0.72rem', color: T.txtMuted, fontWeight: '700', background: T.cardBg, padding: '3px 10px', borderRadius: '20px', border: `1px solid ${T.border}` }}>
              {trendRows.length} transaksi
            </span>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.83rem' }}>
              <thead>
                <tr style={{ background: T.cardBg2, color: T.txtSecondary, textTransform: 'uppercase', fontSize: '0.68rem', borderBottom: `2px solid ${T.border}` }}>
                  <th style={{ padding: '12px 14px', textAlign: 'left',   fontWeight: '800', whiteSpace: 'nowrap' }}>No</th>
                  <th style={{ padding: '12px 14px', textAlign: 'left',   fontWeight: '800', whiteSpace: 'nowrap' }}>Tanggal</th>
                  <th style={{ padding: '12px 14px', textAlign: 'left',   fontWeight: '800', whiteSpace: 'nowrap' }}>Sumber Data</th>
                  <th style={{ padding: '12px 14px', textAlign: 'left',   fontWeight: '800', whiteSpace: 'nowrap' }}>Supplier / Catatan</th>
                  <th style={{ padding: '12px 14px', textAlign: 'center', fontWeight: '800', whiteSpace: 'nowrap' }}>Qty</th>
                  <th style={{ padding: '12px 14px', textAlign: 'right',  fontWeight: '800', whiteSpace: 'nowrap', color: T.accentGold }}>Harga Satuan</th>
                  <th style={{ padding: '12px 14px', textAlign: 'right',  fontWeight: '800', whiteSpace: 'nowrap' }}>Total Rp</th>
                  <th style={{ padding: '12px 14px', textAlign: 'center', fontWeight: '800', whiteSpace: 'nowrap' }}>Perubahan Harga</th>
                  <th style={{ padding: '12px 14px', textAlign: 'center', fontWeight: '800', whiteSpace: 'nowrap' }}>% Naik/Turun</th>
                </tr>
              </thead>
              <tbody>
                {trendRows.length === 0 ? (
                  <tr>
                    <td colSpan={9} style={{ padding: '48px', textAlign: 'center', color: T.txtMuted }}>
                      <History size={36} style={{ opacity: 0.25, marginBottom: '10px' }} /><br />
                      Tidak ada data transaksi pembelian pada rentang tanggal/outlet yang dipilih.
                    </td>
                  </tr>
                ) : trendRows.map((r, idx) => {
                  const rowNo   = trendRows.length - idx;
                  const hasDiff = r.diff !== null;
                  const isUp    = hasDiff && r.diff > 0;
                  const isDown  = hasDiff && r.diff < 0;
                  const isFlat  = hasDiff && r.diff === 0;
                  const formattedDate = new Date(r.date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
                  const sourceBg    = r.source === 'Laporan Harian' ? 'rgba(251,191,36,0.12)' : r.source === 'Logistik' ? 'rgba(56,189,248,0.12)' : r.source === 'Master HPP' ? 'rgba(139,92,246,0.12)' : 'rgba(52,211,153,0.12)';
                  const sourceColor = r.source === 'Laporan Harian' ? T.accentGold : r.source === 'Logistik' ? T.info : r.source === 'Master HPP' ? '#a78bfa' : T.success;

                  return (
                    <tr key={idx} style={{ borderBottom: `1px solid ${T.border}`, background: idx === 0 ? 'rgba(56,189,248,0.035)' : 'transparent', transition: 'background 0.15s' }}>
                      <td style={{ padding: '10px 14px', color: T.txtMuted, fontWeight: '700', fontSize: '0.72rem' }}>
                        <div>{rowNo}</div>
                        {idx === 0 && <span style={{ fontSize: '0.58rem', color: T.info, fontWeight: '900', background: 'rgba(56,189,248,0.12)', padding: '1px 5px', borderRadius: '3px' }}>TERBARU</span>}
                      </td>
                      <td style={{ padding: '10px 14px', fontWeight: '700', color: T.txtPrimary, whiteSpace: 'nowrap' }}>{formattedDate}</td>
                      <td style={{ padding: '10px 14px' }}>
                        <span style={{ padding: '3px 9px', borderRadius: '5px', fontSize: '0.68rem', fontWeight: '800', background: sourceBg, color: sourceColor }}>{r.source}</span>
                      </td>
                      <td style={{ padding: '10px 14px', color: T.txtSecondary, fontSize: '0.76rem', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.supplier_name || '-'}</td>
                      <td style={{ padding: '10px 14px', textAlign: 'center', fontWeight: '700', color: T.txtPrimary, whiteSpace: 'nowrap' }}>{r.qty} <span style={{ fontSize: '0.68rem', color: T.txtMuted }}>{r.unit}</span></td>
                      <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: '900', fontSize: '0.92rem', color: T.accentGold, whiteSpace: 'nowrap' }}>Rp {r.unit_price.toLocaleString('id-ID')}</td>
                      <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: '700', color: T.txtPrimary, whiteSpace: 'nowrap' }}>Rp {(r.total_price || 0).toLocaleString('id-ID')}</td>
                      <td style={{ padding: '10px 14px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                        {!hasDiff ? <span style={{ fontSize: '0.68rem', color: T.txtMuted }}>—</span> : (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', padding: '3px 9px', borderRadius: '6px', fontSize: '0.72rem', fontWeight: '800', background: isUp ? 'rgba(244,63,94,0.12)' : isDown ? 'rgba(52,211,153,0.12)' : 'rgba(148,163,184,0.10)', color: isUp ? T.danger : isDown ? T.success : T.txtMuted, border: `1px solid ${isUp ? 'rgba(244,63,94,0.25)' : isDown ? 'rgba(52,211,153,0.25)' : T.border}` }}>
                            {isUp && <ArrowUpRight size={11} />}{isDown && <ArrowDownRight size={11} />}{isFlat && <Minus size={11} />}
                            {isUp ? '+' : ''}{r.diff.toLocaleString('id-ID')}
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '10px 14px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                        {r.pct === null ? <span style={{ fontSize: '0.68rem', color: T.txtMuted }}>—</span> : (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', padding: '3px 10px', borderRadius: '20px', fontSize: '0.70rem', fontWeight: '900', background: r.pct > 5 ? 'rgba(244,63,94,0.15)' : r.pct < -5 ? 'rgba(52,211,153,0.15)' : 'rgba(148,163,184,0.10)', color: r.pct > 5 ? T.danger : r.pct < -5 ? T.success : T.txtSecondary }}>
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

          {trendRows.length > 0 && (
            <div style={{ padding: '10px 20px', borderTop: `1px solid ${T.border}`, background: T.cardBg2, fontSize: '0.70rem', color: T.txtMuted, fontWeight: '600' }}>
              Diurutkan dari transaksi <strong>terbaru → terlama</strong>. Kolom &ldquo;Perubahan Harga&rdquo; menunjukkan selisih harga satuan vs pembelian sebelumnya.
            </div>
          )}
        </div>
      )}

    </div>
  );
}
