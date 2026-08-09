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
  Building2
} from 'lucide-react';
import { getThemePalette } from '../../utils/themeUtils';

export default function IngredientPriceTrendPage({
  masterData,
  selectedBranch,
  themeMode = 'dark'
}) {
  const T = getThemePalette(themeMode);

  const [trendOutletId,        setTrendOutletId]        = useState('');
  const [trendIngredient,      setTrendIngredient]      = useState('');
  const [trendIngSearch,       setTrendIngSearch]       = useState('');
  const [showTrendIngDropdown, setShowTrendIngDropdown] = useState(false);

  const outletsList = useMemo(() => masterData?.outlets || [], [masterData]);

  const getOutletName = (id) => {
    const o = outletsList.find(o => String(o.id) === String(id));
    return o ? o.name : 'Outlet';
  };

  const allPurchaseRecords = useMemo(() => {
    const records = [];

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

    (masterData?.ingredients || []).forEach(ing => {
      if (!ing.name || !ing.cost) return;
      records.push({
        date: new Date().toISOString().substring(0, 10),
        ingredient_name: ing.name.trim(),
        unit: ing.unit || ing.satuan || 'kg',
        qty: 1,
        unit_price: Number(ing.cost || ing.harga || 0),
        total_price: Number(ing.cost || ing.harga || 0),
        outlet_id: String(outletsList[0]?.id || 1),
        outlet_name: outletsList[0]?.name || 'Outlet Utama',
        supplier_name: 'Master Data HPP Standard',
        source: 'Master HPP'
      });
    });

    return records;
  }, [masterData, outletsList]);

  const trendIngredientOptions = useMemo(() => {
    const set = new Set();
    const src = trendOutletId
      ? allPurchaseRecords.filter(r => String(r.outlet_id) === String(trendOutletId))
      : allPurchaseRecords;
    src.forEach(r => r.ingredient_name && set.add(r.ingredient_name.trim()));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [allPurchaseRecords, trendOutletId]);

  const filteredTrendIngOptions = useMemo(() => {
    if (!trendIngSearch.trim()) return trendIngredientOptions;
    return trendIngredientOptions.filter(n => n.toLowerCase().includes(trendIngSearch.toLowerCase()));
  }, [trendIngredientOptions, trendIngSearch]);

  const trendRows = useMemo(() => {
    if (!trendOutletId || !trendIngredient) return [];
    const rows = allPurchaseRecords.filter(r =>
      String(r.outlet_id) === String(trendOutletId) &&
      r.ingredient_name.toLowerCase().trim() === trendIngredient.toLowerCase().trim() &&
      r.unit_price > 0
    );
    const sorted = [...rows].sort((a, b) => new Date(a.date) - new Date(b.date));
    return sorted.map((r, idx) => {
      const prev = idx > 0 ? sorted[idx - 1] : null;
      const diff = prev ? r.unit_price - prev.unit_price : null;
      const pct  = (prev && prev.unit_price > 0) ? ((diff / prev.unit_price) * 100) : null;
      return { ...r, diff, pct };
    }).reverse();
  }, [allPurchaseRecords, trendOutletId, trendIngredient]);

  const trendStats = useMemo(() => {
    if (trendRows.length === 0) return null;
    const prices = trendRows.map(r => r.unit_price);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const avg = Math.round(prices.reduce((a, b) => a + b, 0) / prices.length);
    const newest = trendRows[0]?.unit_price || 0;
    const oldest = trendRows[trendRows.length - 1]?.unit_price || 0;
    const totalChange = newest - oldest;
    const totalPct = oldest > 0 ? ((totalChange / oldest) * 100).toFixed(1) : null;
    const upCount   = trendRows.filter(r => r.diff !== null && r.diff > 0).length;
    const downCount = trendRows.filter(r => r.diff !== null && r.diff < 0).length;
    const flatCount = trendRows.filter(r => r.diff !== null && r.diff === 0).length;
    return { min, max, avg, newest, oldest, totalChange, totalPct, upCount, downCount, flatCount };
  }, [trendRows]);

  const selectedOutletName = outletsList.find(o => String(o.id) === String(trendOutletId))?.name || '';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

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
            Lacak perubahan harga satu bahan baku dari waktu ke waktu dalam satu outlet — dari data Logistik, Laporan Harian, Update Laporan, dan Master HPP.
          </p>
        </div>
      </div>

      {/* FILTER BAR */}
      <div style={{ background: T.cardBg, border: `1px solid ${T.border}`, borderRadius: '14px', padding: '18px 20px', display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'flex-end' }}>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', minWidth: '220px' }}>
          <label style={{ fontSize: '0.72rem', fontWeight: '800', color: T.txtSecondary, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '5px' }}>
            <Building2 size={13} /> Pilih Outlet
          </label>
          <select
            value={trendOutletId}
            onChange={e => { setTrendOutletId(e.target.value); setTrendIngredient(''); setTrendIngSearch(''); }}
            style={{ padding: '9px 12px', borderRadius: '8px', border: `1px solid ${trendOutletId ? T.info : T.border}`, background: T.inputBg, color: T.txtPrimary, fontSize: '0.84rem', fontWeight: '700', cursor: 'pointer' }}
          >
            <option value="">-- Pilih Outlet --</option>
            {outletsList.map(o => (
              <option key={o.id} value={String(o.id)}>{o.name}</option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', minWidth: '240px', position: 'relative' }}>
          <label style={{ fontSize: '0.72rem', fontWeight: '800', color: T.txtSecondary, textTransform: 'uppercase' }}>
            🥬 Pilih Bahan Baku
          </label>
          <button
            type="button"
            onClick={() => { if (trendOutletId) setShowTrendIngDropdown(v => !v); }}
            style={{ padding: '9px 12px', borderRadius: '8px', cursor: trendOutletId ? 'pointer' : 'not-allowed', border: `1px solid ${trendIngredient ? T.accentGold : T.border}`, background: trendOutletId ? T.inputBg : T.cardBg2, color: trendIngredient ? T.accentGold : T.txtSecondary, fontSize: '0.84rem', fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}
          >
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {trendIngredient || (trendOutletId ? 'Pilih bahan baku...' : 'Pilih outlet dulu')}
            </span>
            <ChevronDown size={14} color={T.txtMuted} />
          </button>

          {showTrendIngDropdown && trendOutletId && (
            <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, background: T.cardBg, border: `1px solid ${T.accentGoldBorder}`, borderRadius: '10px', boxShadow: '0 16px 40px rgba(0,0,0,0.6)', zIndex: 9999, padding: '10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ position: 'relative' }}>
                <Search size={13} color={T.txtMuted} style={{ position: 'absolute', left: '9px', top: '50%', transform: 'translateY(-50%)' }} />
                <input type="text" value={trendIngSearch} onChange={e => setTrendIngSearch(e.target.value)} placeholder="Cari nama bahan baku..." autoFocus style={{ width: '100%', padding: '7px 10px 7px 30px', borderRadius: '6px', border: `1px solid ${T.border}`, background: T.inputBg, color: T.txtPrimary, fontSize: '0.78rem' }} />
              </div>
              <div style={{ overflowY: 'auto', maxHeight: '220px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                {filteredTrendIngOptions.length === 0 ? (
                  <div style={{ padding: '12px', fontSize: '0.74rem', color: T.txtMuted, textAlign: 'center' }}>Tidak ada data</div>
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

        {(trendOutletId || trendIngredient) && (
          <button onClick={() => { setTrendOutletId(''); setTrendIngredient(''); setTrendIngSearch(''); setShowTrendIngDropdown(false); }} style={{ padding: '9px 16px', borderRadius: '8px', border: `1px solid ${T.border}`, background: 'transparent', color: T.txtMuted, fontSize: '0.80rem', fontWeight: '700', cursor: 'pointer', alignSelf: 'flex-end', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <RotateCcw size={13} /> Reset
          </button>
        )}
      </div>

      {/* PLACEHOLDER */}
      {(!trendOutletId || !trendIngredient) && (
        <div style={{ background: T.cardBg, border: `1px dashed ${T.border}`, borderRadius: '14px', padding: '64px 20px', textAlign: 'center' }}>
          <History size={48} color={T.txtMuted} style={{ opacity: 0.3, marginBottom: '14px' }} />
          <div style={{ fontSize: '1.0rem', color: T.txtMuted, fontWeight: '700' }}>
            {!trendOutletId ? 'Pilih Outlet terlebih dahulu' : 'Pilih Bahan Baku untuk melihat tren harga'}
          </div>
          <div style={{ fontSize: '0.76rem', color: T.txtMuted, marginTop: '8px' }}>
            Setelah memilih keduanya, histori harga dari waktu ke waktu akan ditampilkan di sini.
          </div>
        </div>
      )}

      {/* SUMMARY CARDS */}
      {trendOutletId && trendIngredient && trendStats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '12px' }}>
          <div style={{ background: T.cardBg, border: `1px solid ${T.infoBorder}`, borderRadius: '13px', padding: '16px 18px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '9px', background: T.infoBg, borderRadius: '10px' }}><History size={20} color={T.info} /></div>
            <div>
              <div style={{ fontSize: '0.64rem', color: T.txtSecondary, fontWeight: '800', textTransform: 'uppercase' }}>Total Pembelian</div>
              <div style={{ fontSize: '1.40rem', fontWeight: '900', color: T.info, lineHeight: 1.1 }}>{trendRows.length}×</div>
              <div style={{ fontSize: '0.64rem', color: T.txtMuted }}>transaksi tercatat</div>
            </div>
          </div>
          <div style={{ background: T.cardBg, border: `1px solid ${T.successBorder}`, borderRadius: '13px', padding: '16px 18px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '9px', background: T.successBg, borderRadius: '10px' }}><TrendingDown size={20} color={T.success} /></div>
            <div>
              <div style={{ fontSize: '0.64rem', color: T.txtSecondary, fontWeight: '800', textTransform: 'uppercase' }}>Harga Terendah</div>
              <div style={{ fontSize: '1.05rem', fontWeight: '900', color: T.success }}>Rp {trendStats.min.toLocaleString('id-ID')}</div>
              <div style={{ fontSize: '0.64rem', color: T.txtMuted }}>harga terbaik per unit</div>
            </div>
          </div>
          <div style={{ background: T.cardBg, border: `1px solid ${T.dangerBorder}`, borderRadius: '13px', padding: '16px 18px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '9px', background: T.dangerBg, borderRadius: '10px' }}><TrendingUp size={20} color={T.danger} /></div>
            <div>
              <div style={{ fontSize: '0.64rem', color: T.txtSecondary, fontWeight: '800', textTransform: 'uppercase' }}>Harga Tertinggi</div>
              <div style={{ fontSize: '1.05rem', fontWeight: '900', color: T.danger }}>Rp {trendStats.max.toLocaleString('id-ID')}</div>
              <div style={{ fontSize: '0.64rem', color: T.txtMuted }}>harga puncak per unit</div>
            </div>
          </div>
          <div style={{ background: T.cardBg, border: `1px solid ${T.border}`, borderRadius: '13px', padding: '16px 18px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '9px', background: T.accentGoldBg, borderRadius: '10px' }}><DollarSign size={20} color={T.accentGold} /></div>
            <div>
              <div style={{ fontSize: '0.64rem', color: T.txtSecondary, fontWeight: '800', textTransform: 'uppercase' }}>Rata-Rata Harga</div>
              <div style={{ fontSize: '1.05rem', fontWeight: '900', color: T.accentGold }}>Rp {trendStats.avg.toLocaleString('id-ID')}</div>
              <div style={{ fontSize: '0.64rem', color: T.txtMuted }}>rata-rata semua pembelian</div>
            </div>
          </div>
          <div style={{ background: T.cardBg, border: `1px solid ${trendStats.totalChange > 0 ? T.dangerBorder : trendStats.totalChange < 0 ? T.successBorder : T.border}`, borderRadius: '13px', padding: '16px 18px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '9px', background: trendStats.totalChange > 0 ? T.dangerBg : trendStats.totalChange < 0 ? T.successBg : T.cardBg2, borderRadius: '10px' }}>
              <AlertTriangle size={20} color={trendStats.totalChange > 0 ? T.danger : trendStats.totalChange < 0 ? T.success : T.txtMuted} />
            </div>
            <div>
              <div style={{ fontSize: '0.64rem', color: T.txtSecondary, fontWeight: '800', textTransform: 'uppercase' }}>Total Perubahan</div>
              <div style={{ fontSize: '1.05rem', fontWeight: '900', color: trendStats.totalChange > 0 ? T.danger : trendStats.totalChange < 0 ? T.success : T.txtMuted }}>
                {trendStats.totalChange > 0 ? '+' : ''}{trendStats.totalChange.toLocaleString('id-ID')}
                {trendStats.totalPct && <span style={{ fontSize: '0.72rem', marginLeft: '4px' }}>({trendStats.totalChange > 0 ? '+' : ''}{trendStats.totalPct}%)</span>}
              </div>
              <div style={{ fontSize: '0.64rem', color: T.txtMuted }}>pertama → terbaru</div>
            </div>
          </div>
          <div style={{ background: T.cardBg, border: `1px solid ${T.border}`, borderRadius: '13px', padding: '16px 18px' }}>
            <div style={{ fontSize: '0.64rem', color: T.txtSecondary, fontWeight: '800', textTransform: 'uppercase', marginBottom: '10px' }}>Frekuensi Perubahan</div>
            <div style={{ display: 'flex', gap: '16px' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1.30rem', fontWeight: '900', color: T.danger }}>{trendStats.upCount}</div>
                <div style={{ fontSize: '0.62rem', color: T.txtMuted, fontWeight: '700' }}>↑ Naik</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1.30rem', fontWeight: '900', color: T.success }}>{trendStats.downCount}</div>
                <div style={{ fontSize: '0.62rem', color: T.txtMuted, fontWeight: '700' }}>↓ Turun</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1.30rem', fontWeight: '900', color: T.txtMuted }}>{trendStats.flatCount}</div>
                <div style={{ fontSize: '0.62rem', color: T.txtMuted, fontWeight: '700' }}>= Tetap</div>
              </div>
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
                      Belum ada data pembelian untuk bahan baku ini di outlet tersebut.
                    </td>
                  </tr>
                ) : trendRows.map((r, idx) => {
                  const rowNo   = trendRows.length - idx;
                  const hasDiff = r.diff !== null;
                  const isUp    = hasDiff && r.diff > 0;
                  const isDown  = hasDiff && r.diff < 0;
                  const isFlat  = hasDiff && r.diff === 0;
                  const formattedDate = new Date(r.date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
                  const sourceBg    = r.source === 'Logistik' ? 'rgba(56,189,248,0.12)' : r.source === 'Laporan Harian' ? 'rgba(251,191,36,0.12)' : r.source === 'Master HPP' ? 'rgba(139,92,246,0.12)' : 'rgba(52,211,153,0.12)';
                  const sourceColor = r.source === 'Logistik' ? T.info : r.source === 'Laporan Harian' ? T.accentGold : r.source === 'Master HPP' ? '#a78bfa' : T.success;
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
              📌 Diurutkan dari transaksi <strong>terbaru → terlama</strong>. Kolom "Perubahan Harga" menunjukkan selisih harga satuan vs pembelian sebelumnya.
            </div>
          )}
        </div>
      )}

    </div>
  );
}
