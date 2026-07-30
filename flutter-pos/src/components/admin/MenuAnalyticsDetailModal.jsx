import React, { useState } from 'react';
import { X, Package, DollarSign, Calendar, Store, ShoppingBag, CreditCard, TrendingUp, Filter, Receipt } from 'lucide-react';

export default function MenuAnalyticsDetailModal({ menuItem, masterData, onClose }) {
  const [filterOutlet, setFilterOutlet] = useState('Semua Outlet');
  const [filterMonthYear, setFilterMonthYear] = useState('Semua Bulan & Tahun');

  if (!menuItem) return null;

  // Retrieve outlets list
  const outletsList = masterData?.outlets || [];

  // Helper to format Rupiah
  const formatRupiah = (val) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val || 0);
  };

  // Generate comprehensive sales history for this menu item based on actual sales transactions
  const generateSalesHistory = () => {
    const rawSales = masterData?.salesTransactions || masterData?.transactions || [];
    let matchedHistory = [];

    // Search inside actual sales transactions
    rawSales.forEach((trx, idx) => {
      const trxItems = trx.items || [];
      const matchedItem = trxItems.find(i => {
        if (!i) return false;
        // 1. Match by Product ID / ID
        if (i.product_id && (Number(i.product_id) === Number(menuItem.id) || String(i.product_id) === String(menuItem.id))) return true;
        if (i.id && (Number(i.id) === Number(menuItem.id) || String(i.id) === String(menuItem.id))) return true;
        
        // 2. Match by SKU / Code
        if (i.sku && menuItem.sku && i.sku.toLowerCase() === menuItem.sku.toLowerCase()) return true;

        // 3. Match by Product Name (case-insensitive & substring match)
        if (i.name && menuItem.name) {
          const iName = i.name.trim().toLowerCase();
          const mName = menuItem.name.trim().toLowerCase();
          if (iName === mName) return true;
          if (iName.startsWith(mName) || mName.startsWith(iName)) return true;
          if (iName.includes(mName) || mName.includes(iName)) return true;
        }
        return false;
      });

      if (matchedItem) {
        const itemQty = Number(matchedItem.qty || matchedItem.quantity || 1);
        const unitPrice = Number(matchedItem.price || matchedItem.price_unit || menuItem.price || 0);
        const totalPrice = Number(matchedItem.amount || matchedItem.total_price || (itemQty * unitPrice));

        matchedHistory.push({
          id: trx.id || idx + 1,
          receipt_no: trx.receipt_no || trx.code || trx.id || `#TRX-${String(idx + 1).padStart(3, '0')}`,
          date: trx.date ? `${trx.date}${trx.time ? `, ${trx.time}` : ''}` : (trx.created_at || 'Baru Saja'),
          month_year: trx.month_year || (trx.date ? new Date(trx.date).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' }) : ''),
          outlet_name: trx.branch_name || trx.outlet_name || (outletsList[idx % outletsList.length]?.name || 'Outlet Central'),
          qty: itemQty,
          unit_price: unitPrice,
          total_price: totalPrice,
          payment_method: trx.payment_method || 'Cash',
          cashier: trx.cashier || 'Kasir POS'
        });
      }
    });

    return matchedHistory;
  };

  const allHistory = generateSalesHistory();

  // Apply Outlet & Month-Year Filters
  const filteredHistory = allHistory.filter(item => {
    const matchesOutlet = filterOutlet === 'Semua Outlet' || item.outlet_name === filterOutlet;
    const matchesMonth = filterMonthYear === 'Semua Bulan & Tahun' || item.month_year === filterMonthYear;
    return matchesOutlet && matchesMonth;
  });

  // Calculate Aggregates
  const totalQtySold = filteredHistory.reduce((acc, curr) => acc + curr.qty, 0);
  const totalRevenue = filteredHistory.reduce((acc, curr) => acc + curr.total_price, 0);
  const totalTransactions = filteredHistory.length;
  const avgRevenuePerTx = totalTransactions > 0 ? Math.round(totalRevenue / totalTransactions) : 0;

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(9, 13, 22, 0.85)', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999, padding: '20px'
    }} className="animate-fade-in">
      <div className="glass-card" style={{
        width: '100%', maxWidth: '960px', maxHeight: '92vh', overflowY: 'auto',
        background: '#111827', border: '1.5px solid rgba(56, 189, 248, 0.3)',
        borderRadius: '24px', padding: '28px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.7)',
        display: 'flex', flexDirection: 'column', gap: '22px'
      }}>
        
        {/* MODAL HEADER */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid #1f2937', paddingBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff', fontWeight: '900', fontSize: '1.4rem', boxShadow: '0 6px 16px rgba(37,99,235,0.4)' }}>
              {menuItem.name ? menuItem.name.charAt(0).toUpperCase() : 'M'}
            </div>
            <div>
              <h2 style={{ fontSize: '1.4rem', fontWeight: '900', color: '#ffffff', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>{menuItem.name}</span>
                <span style={{ fontSize: '0.74rem', fontWeight: '800', background: 'rgba(56,189,248,0.15)', color: '#38bdf8', padding: '3px 10px', borderRadius: '8px', border: '1px solid rgba(56,189,248,0.3)' }}>
                  Kode: {menuItem.sku || `MNU-${menuItem.id}`}
                </span>
              </h2>
              <div style={{ fontSize: '0.82rem', color: '#94a3b8', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span>Kategori: <strong style={{ color: '#818cf8' }}>{menuItem.category_name || menuItem.category || 'Umum'}</strong></span>
                <span>•</span>
                <span>Harga Jual: <strong style={{ color: '#34d399' }}>{formatRupiah(menuItem.price)}</strong></span>
                {menuItem.cost && (
                  <>
                    <span>•</span>
                    <span>HPP Modal: <strong style={{ color: '#cbd5e1' }}>{formatRupiah(menuItem.cost)}</strong></span>
                  </>
                )}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{ background: '#1f2937', border: '1px solid #374151', color: '#94a3b8', borderRadius: '12px', padding: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* FILTER BAR (NAMA OUTLET & BULAN TAHUN) */}
        <div style={{ background: '#1f2937', padding: '16px', borderRadius: '16px', border: '1px solid #374151', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#38bdf8', fontWeight: '800', fontSize: '0.84rem' }}>
            <Filter size={18} />
            <span>Filter Analisis Penjualan Menu:</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            {/* 1. FILTER NAMA OUTLET */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Store size={16} color="#94a3b8" />
              <select
                value={filterOutlet}
                onChange={e => setFilterOutlet(e.target.value)}
                style={{ padding: '8px 14px', borderRadius: '10px', border: '1px solid #374151', background: '#090d16', color: '#ffffff', fontSize: '0.84rem', fontWeight: '700', cursor: 'pointer' }}
              >
                <option value="Semua Outlet">🏬 Semua Outlet Cabang</option>
                {outletsList.map((o, idx) => (
                  <option key={idx} value={o.name}>{o.name}</option>
                ))}
              </select>
            </div>

            {/* 2. FILTER BULAN & TAHUN */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Calendar size={16} color="#94a3b8" />
              <select
                value={filterMonthYear}
                onChange={e => setFilterMonthYear(e.target.value)}
                style={{ padding: '8px 14px', borderRadius: '10px', border: '1px solid #374151', background: '#090d16', color: '#ffffff', fontSize: '0.84rem', fontWeight: '700', cursor: 'pointer' }}
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
          <div style={{ background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.3)', borderRadius: '16px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <span style={{ fontSize: '0.74rem', fontWeight: '800', color: '#34d399', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Package size={14} />
              <span>Kuantitas Terjual</span>
            </span>
            <div style={{ fontSize: '1.4rem', fontWeight: '900', color: '#ffffff' }}>
              {totalQtySold} <span style={{ fontSize: '0.85rem', color: '#34d399' }}>Porsi / Unit</span>
            </div>
          </div>

          {/* CARD 2: TOTAL PENJUALAN (OMZET) */}
          <div style={{ background: 'rgba(56,189,248,0.1)', border: '1px solid rgba(56,189,248,0.3)', borderRadius: '16px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <span style={{ fontSize: '0.74rem', fontWeight: '800', color: '#38bdf8', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <DollarSign size={14} />
              <span>Total Penjualan (Omzet)</span>
            </span>
            <div style={{ fontSize: '1.35rem', fontWeight: '900', color: '#ffffff' }}>
              {formatRupiah(totalRevenue)}
            </div>
          </div>

          {/* CARD 3: RATA-RATA OMZET PER TRANSAKSI */}
          <div style={{ background: 'rgba(129,140,248,0.1)', border: '1px solid rgba(129,140,248,0.3)', borderRadius: '16px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <span style={{ fontSize: '0.74rem', fontWeight: '800', color: '#818cf8', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <TrendingUp size={14} />
              <span>Rata-Rata / Struk</span>
            </span>
            <div style={{ fontSize: '1.35rem', fontWeight: '900', color: '#ffffff' }}>
              {formatRupiah(avgRevenuePerTx)}
            </div>
          </div>

          {/* CARD 4: TOTAL TRANSAKSI STRUK */}
          <div style={{ background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.3)', borderRadius: '16px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <span style={{ fontSize: '0.74rem', fontWeight: '800', color: '#fbbf24', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Receipt size={14} />
              <span>Total Transaksi</span>
            </span>
            <div style={{ fontSize: '1.4rem', fontWeight: '900', color: '#ffffff' }}>
              {totalTransactions} <span style={{ fontSize: '0.85rem', color: '#fbbf24' }}>Struk POS</span>
            </div>
          </div>
        </div>

        {/* TABEL HISTORY PENJUALAN DETAIL */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: '900', color: '#ffffff', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShoppingBag size={18} color="#38bdf8" />
              <span>Riwayat History Penjualan Detail ({filteredHistory.length} Transaksi)</span>
            </h3>
          </div>

          <div style={{ border: '1px solid #1f2937', borderRadius: '16px', overflow: 'hidden', background: '#090d16' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.82rem' }}>
              <thead>
                <tr style={{ background: '#1f2937', borderBottom: '1px solid #374151', color: '#94a3b8', fontWeight: '800', fontSize: '0.74rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  <th style={{ padding: '12px 14px' }}>Tanggal & Waktu</th>
                  <th style={{ padding: '12px 14px' }}>No. Struk</th>
                  <th style={{ padding: '12px 14px' }}>Outlet Cabang</th>
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
                    <td colSpan={8} style={{ padding: '32px', textAlign: 'center', color: '#94a3b8' }}>
                      Tidak ada riwayat penjualan menu untuk kombinasi filter ini.
                    </td>
                  </tr>
                ) : (
                  filteredHistory.map((row, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', color: '#f8fafc' }}>
                      <td style={{ padding: '12px 14px', color: '#cbd5e1' }}>
                        {row.date}
                      </td>
                      <td style={{ padding: '12px 14px', fontFamily: 'monospace', fontWeight: '800', color: '#38bdf8' }}>
                        {row.receipt_no}
                      </td>
                      <td style={{ padding: '12px 14px', fontWeight: '700', color: '#f8fafc' }}>
                        🏬 {row.outlet_name}
                      </td>
                      <td style={{ padding: '12px 14px', textAlign: 'center', fontWeight: '900', color: '#34d399' }}>
                        {row.qty} Porsi
                      </td>
                      <td style={{ padding: '12px 14px', color: '#cbd5e1' }}>
                        {formatRupiah(row.unit_price)}
                      </td>
                      <td style={{ padding: '12px 14px', fontWeight: '900', color: '#ffffff' }}>
                        {formatRupiah(row.total_price)}
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <span style={{ background: 'rgba(255,255,255,0.06)', padding: '3px 8px', borderRadius: '6px', fontSize: '0.74rem', color: '#fbbf24', fontWeight: '700', border: '1px solid rgba(255,255,255,0.1)' }}>
                          💳 {row.payment_method}
                        </span>
                      </td>
                      <td style={{ padding: '12px 14px', color: '#94a3b8' }}>
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
