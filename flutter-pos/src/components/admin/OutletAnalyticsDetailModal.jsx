import React, { useState } from 'react';
import { X, Store, DollarSign, Calendar, ShoppingBag, Utensils, TrendingUp, Filter, Receipt, Package, MapPin, Users } from 'lucide-react';
import { getThemePalette } from '../../utils/themeUtils';

export default function OutletAnalyticsDetailModal({ outlet, masterData, onClose, themeMode = 'dark' }) {
  const T = getThemePalette(themeMode);
  const [filterMonthYear, setFilterMonthYear] = useState('Semua Bulan & Tahun');

  if (!outlet) return null;

  // Helper to format Rupiah
  const formatRupiah = (val) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val || 0);
  };

  // Generate Sales History for this Outlet
  const generateOutletSalesHistory = () => {
    const rawSales = masterData?.salesTransactions || masterData?.transactions || [];
    let matchedHistory = [];

    // Filter real raw sales for this outlet
    rawSales.filter(tx => 
      tx.outlet_id === outlet.id || 
      tx.outlet_name === outlet.name || 
      tx.outlet === outlet.name
    ).forEach(tx => {
      (tx.items || []).forEach(item => {
        matchedHistory.push({
          id: tx.id || `tx-${Math.random()}`,
          receipt_no: tx.receipt_no || tx.receiptNo || `#TRX-${tx.id}`,
          date: tx.date || tx.createdAt || tx.timestamp,
          month_year: tx.month_year || tx.monthYear || 'Tahun 2026',
          outlet_name: outlet.name,
          menu_name: item.name || item.item_name,
          qty: item.qty || item.quantity || 1,
          unit_price: item.price || item.unit_price || 0,
          total_price: item.subtotal || ((item.qty || 1) * (item.price || 0)),
          payment_method: tx.payment_method || tx.paymentMethod || 'Cash',
          cashier: tx.cashier || tx.cashier_name || 'Kasir'
        });
      });
    });

    return matchedHistory;
  };

  const allHistory = generateOutletSalesHistory();

  // Apply Month-Year Filter
  const filteredHistory = allHistory.filter(item => {
    return filterMonthYear === 'Semua Bulan & Tahun' || item.month_year === filterMonthYear;
  });

  // Calculate Aggregates
  const totalQtySold = filteredHistory.reduce((acc, curr) => acc + curr.qty, 0);
  const totalRevenue = filteredHistory.reduce((acc, curr) => acc + curr.total_price, 0);
  const totalTransactionsCount = filteredHistory.length;
  const avgRevenuePerTx = totalTransactionsCount > 0 ? Math.round(totalRevenue / totalTransactionsCount) : 0;

  // Top Menu Items at this Outlet
  const getTopMenuAtOutlet = () => {
    const itemMap = {};
    filteredHistory.forEach(h => {
      if (!itemMap[h.menu_name]) {
        itemMap[h.menu_name] = { qty: 0, revenue: 0 };
      }
      itemMap[h.menu_name].qty += h.qty;
      itemMap[h.menu_name].revenue += h.total_price;
    });

    return Object.keys(itemMap).map(name => ({
      name,
      qty: itemMap[name].qty,
      revenue: itemMap[name].revenue
    })).sort((a, b) => b.qty - a.qty);
  };

  const topMenus = getTopMenuAtOutlet();

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(9, 13, 22, 0.85)', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999, padding: '20px'
    }} className="animate-fade-in">
      <div className="glass-card" style={{
        width: '100%', maxWidth: '980px', maxHeight: '92vh', overflowY: 'auto',
        background: T.cardBg, border: `1.5px solid ${T.borderStrong}`,
        borderRadius: '24px', padding: '28px', boxShadow: T.shadowLg,
        display: 'flex', flexDirection: 'column', gap: '22px'
      }}>
        
        {/* MODAL HEADER */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: `1px solid ${T.border}`, paddingBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: T.primaryBtn, display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.navActiveTxt, fontWeight: '900', fontSize: '1.4rem', boxShadow: T.primaryBtnShadow }}>
              <Store size={30} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.4rem', fontWeight: '900', color: T.txtPrimary, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>🏪 {outlet.name}</span>
                <span style={{ fontSize: '0.74rem', fontWeight: '800', background: T.infoBg, color: T.info, padding: '3px 10px', borderRadius: '8px', border: `1px solid ${T.infoBorder}` }}>
                  Kode: {outlet.code || `OTL-00${outlet.id}`}
                </span>
              </h2>
              <div style={{ fontSize: '0.82rem', color: T.txtSecondary, marginTop: '4px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span>Alamat: <strong style={{ color: T.txtPrimary }}>📍 {outlet.address || 'Jakarta'}</strong></span>
                <span>•</span>
                <span>Status Outlet: <strong style={{ color: T.success }}>🟢 {outlet.status || 'Aktif'}</strong></span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{ background: T.cardBg2, border: `1px solid ${T.border}`, color: T.txtSecondary, borderRadius: '12px', padding: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* FILTER BAR (BULAN & TAHUN) */}
        <div style={{ background: T.cardBg2, padding: '16px', borderRadius: '16px', border: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: T.info, fontWeight: '800', fontSize: '0.84rem' }}>
            <Filter size={18} />
            <span>Filter Analisis Penjualan Outlet Cabang:</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            {/* FILTER BULAN & TAHUN */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Calendar size={16} color={T.txtSecondary} />
              <select
                value={filterMonthYear}
                onChange={e => setFilterMonthYear(e.target.value)}
                style={{ padding: '8px 14px', borderRadius: '10px', border: `1px solid ${T.border}`, background: T.inputBg, color: T.txtPrimary, fontSize: '0.84rem', fontWeight: '700', cursor: 'pointer' }}
              >
                <option value="Semua Bulan & Tahun">📅 Semua Waktu</option>
                <option value="Juli 2026">Juli 2026</option>
                <option value="Juni 2026">Juni 2026</option>
                <option value="Mei 2026">Mei 2026</option>
                <option value="April 2026">April 2026</option>
              </select>
            </div>
          </div>
        </div>

        {/* 4 SUMMARY KPI CARDS */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px' }}>
          {/* CARD 1: KUANTITAS TERJUAL */}
          <div style={{ background: T.successBg, border: `1px solid ${T.successBorder}`, borderRadius: '16px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <span style={{ fontSize: '0.74rem', fontWeight: '800', color: T.success, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Package size={14} />
              <span>Kuantitas Terjual</span>
            </span>
            <div style={{ fontSize: '1.35rem', fontWeight: '900', color: T.txtPrimary }}>
              {totalQtySold} <span style={{ fontSize: '0.85rem', color: T.success }}>Porsi / Unit</span>
            </div>
          </div>

          {/* CARD 2: TOTAL PENJUALAN (OMZET OUTLET) */}
          <div style={{ background: T.infoBg, border: `1px solid ${T.infoBorder}`, borderRadius: '16px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <span style={{ fontSize: '0.74rem', fontWeight: '800', color: T.info, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <DollarSign size={14} />
              <span>Total Omzet Outlet</span>
            </span>
            <div style={{ fontSize: '1.35rem', fontWeight: '900', color: T.txtPrimary }}>
              {formatRupiah(totalRevenue)}
            </div>
          </div>

          {/* CARD 3: RATA-RATA OMZET / STRUK */}
          <div style={{ background: T.infoBg, border: `1px solid ${T.infoBorder}`, borderRadius: '16px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <span style={{ fontSize: '0.74rem', fontWeight: '800', color: T.info, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <TrendingUp size={14} />
              <span>Rata-Rata / Struk</span>
            </span>
            <div style={{ fontSize: '1.35rem', fontWeight: '900', color: T.txtPrimary }}>
              {formatRupiah(avgRevenuePerTx)}
            </div>
          </div>

          {/* CARD 4: TOTAL STRUK POS */}
          <div style={{ background: T.warningBg, border: `1px solid ${T.warningBorder}`, borderRadius: '16px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <span style={{ fontSize: '0.74rem', fontWeight: '800', color: T.warning, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Receipt size={14} />
              <span>Total Struk POS</span>
            </span>
            <div style={{ fontSize: '1.35rem', fontWeight: '900', color: T.txtPrimary }}>
              {totalTransactionsCount} <span style={{ fontSize: '0.85rem', color: T.warning }}>Struk POS</span>
            </div>
          </div>
        </div>

        {/* SECTION 1: TOP 4 MENU TERLARIS DI OUTLET INI */}
        <div style={{ background: T.cardBg2, padding: '20px', borderRadius: '18px', border: `1px solid ${T.border}`, display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: '900', color: T.txtPrimary, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Utensils size={18} color={T.info} />
            <span>Menu Terlaris Di Outlet {outlet.name}:</span>
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '12px' }}>
            {topMenus.slice(0, 4).map((top, idx) => (
              <div key={idx} style={{ background: T.cardBg, border: `1px solid ${T.border}`, borderRadius: '14px', padding: '14px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: T.infoBg, border: `1px solid ${T.infoBorder}`, color: T.info, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900', fontSize: '1.1rem' }}>
                  #{idx + 1}
                </div>
                <div>
                  <h4 style={{ fontSize: '0.88rem', fontWeight: '900', color: T.txtPrimary, margin: 0 }}>
                    {top.name}
                  </h4>
                  <div style={{ fontSize: '0.75rem', color: T.success, fontWeight: '800', marginTop: '2px' }}>
                    {top.qty} Porsi ({formatRupiah(top.revenue)})
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* SECTION 2: HISTORY PENJUALAN DETAIL OUTLET INI */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: '900', color: T.txtPrimary, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShoppingBag size={18} color={T.success} />
              <span>History Penjualan Detail Outlet ({filteredHistory.length} Transaksi)</span>
            </h3>
          </div>

          <div style={{ border: `1px solid ${T.border}`, borderRadius: '16px', overflow: 'hidden', background: T.tableBg }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.82rem' }}>
              <thead>
                <tr style={{ background: T.tableHeaderBg, borderBottom: `1px solid ${T.border}`, color: T.txtSecondary, fontWeight: '800', fontSize: '0.74rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  <th style={{ padding: '12px 14px' }}>Tanggal & Waktu</th>
                  <th style={{ padding: '12px 14px' }}>No. Struk</th>
                  <th style={{ padding: '12px 14px' }}>Menu Terjual</th>
                  <th style={{ padding: '12px 14px', textAlign: 'center' }}>Qty</th>
                  <th style={{ padding: '12px 14px' }}>Harga Satuan</th>
                  <th style={{ padding: '12px 14px' }}>Total Nominal</th>
                  <th style={{ padding: '12px 14px' }}>Pembayaran</th>
                  <th style={{ padding: '12px 14px' }}>Kasir / User</th>
                </tr>
              </thead>
              <tbody>
                {filteredHistory.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ padding: '32px', textAlign: 'center', color: T.txtMuted }}>
                      Tidak ada history penjualan outlet untuk filter ini.
                    </td>
                  </tr>
                ) : (
                  filteredHistory.map((row, idx) => (
                    <tr key={idx} style={{ borderBottom: `1px solid ${T.border}`, color: T.txtPrimary }}>
                      <td style={{ padding: '12px 14px', color: T.txtSecondary }}>
                        {row.date}
                      </td>
                      <td style={{ padding: '12px 14px', fontFamily: 'monospace', fontWeight: '800', color: T.info }}>
                        {row.receipt_no}
                      </td>
                      <td style={{ padding: '12px 14px', color: T.txtPrimary, fontWeight: '800' }}>
                        🍽️ {row.menu_name}
                      </td>
                      <td style={{ padding: '12px 14px', textAlign: 'center', fontWeight: '900', color: T.success }}>
                        {row.qty} Porsi
                      </td>
                      <td style={{ padding: '12px 14px', color: T.txtSecondary }}>
                        {formatRupiah(row.unit_price)}
                      </td>
                      <td style={{ padding: '12px 14px', fontWeight: '900', color: T.txtPrimary }}>
                        {formatRupiah(row.total_price)}
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <span style={{ background: T.warningBg, padding: '3px 8px', borderRadius: '6px', fontSize: '0.74rem', color: T.warning, fontWeight: '700', border: `1px solid ${T.warningBorder}` }}>
                          💳 {row.payment_method}
                        </span>
                      </td>
                      <td style={{ padding: '12px 14px', color: T.txtMuted }}>
                        👤 {row.cashier}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
