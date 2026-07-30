import React, { useState } from 'react';
import { X, Layers, DollarSign, Calendar, Store, ShoppingBag, Utensils, TrendingUp, Filter, Receipt, Package } from 'lucide-react';

export default function CategoryAnalyticsDetailModal({ category, masterData, onClose }) {
  const [filterOutlet, setFilterOutlet] = useState('Semua Outlet');
  const [filterMonthYear, setFilterMonthYear] = useState('Semua Bulan & Tahun');

  if (!category) return null;

  // Retrieve outlets list
  const outletsList = masterData?.outlets || [];

  // Helper to format Rupiah
  const formatRupiah = (val) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val || 0);
  };

  // Find all products in this category
  const connectedProducts = (masterData?.products || []).filter(p => 
    p.category_id === category.id || 
    p.category_name === category.name || 
    p.category === category.name
  );

  // Generate Sales History for this Category across its menu items
  const generateCategorySalesHistory = () => {
    const rawSales = masterData?.salesTransactions || masterData?.transactions || [];
    let matchedHistory = [];

    // Filter real raw sales for connected products
    rawSales.forEach(tx => {
      (tx.items || []).forEach(item => {
        const isMatched = connectedProducts.some(p => p.id === item.id || p.name === item.name);
        if (isMatched) {
          matchedHistory.push({
            id: tx.id || `tx-${Math.random()}`,
            receipt_no: tx.receipt_no || tx.receiptNo || `#TRX-${tx.id}`,
            date: tx.date || tx.createdAt || tx.timestamp,
            month_year: tx.month_year || tx.monthYear || 'Tahun 2026',
            outlet_name: tx.outlet_name || tx.outletName || 'Outlet Utama',
            item_name: item.name || item.item_name,
            qty: item.qty || item.quantity || 1,
            unit_price: item.price || item.unit_price || 0,
            total_price: item.subtotal || (item.qty * item.price) || 0,
            payment_method: tx.payment_method || tx.paymentMethod || 'Cash',
            cashier: tx.cashier || tx.cashier_name || 'Kasir'
          });
        }
      });
    });

    return matchedHistory;
  };

  const allHistory = generateCategorySalesHistory();

  // Apply Outlet & Month-Year Filters
  const filteredHistory = allHistory.filter(item => {
    const matchesOutlet = filterOutlet === 'Semua Outlet' || item.outlet_name === filterOutlet;
    const matchesMonth = filterMonthYear === 'Semua Bulan & Tahun' || item.month_year === filterMonthYear;
    return matchesOutlet && matchesMonth;
  });

  // Calculate Aggregates
  const totalQtySold = filteredHistory.reduce((acc, curr) => acc + curr.qty, 0);
  const totalRevenue = filteredHistory.reduce((acc, curr) => acc + curr.total_price, 0);
  const totalTransactionsCount = filteredHistory.length;
  const avgRevenuePerTx = totalTransactionsCount > 0 ? Math.round(totalRevenue / totalTransactionsCount) : 0;

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(9, 13, 22, 0.85)', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999, padding: '20px'
    }} className="animate-fade-in">
      <div className="glass-card" style={{
        width: '100%', maxWidth: '980px', maxHeight: '92vh', overflowY: 'auto',
        background: '#111827', border: '1.5px solid rgba(168, 85, 247, 0.4)',
        borderRadius: '24px', padding: '28px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.7)',
        display: 'flex', flexDirection: 'column', gap: '22px'
      }}>
        
        {/* MODAL HEADER */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid #1f2937', paddingBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: 'linear-gradient(135deg, #a855f7 0%, #7e22ce 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff', fontWeight: '900', fontSize: '1.4rem', boxShadow: '0 6px 16px rgba(168,85,247,0.4)' }}>
              <Layers size={30} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.4rem', fontWeight: '900', color: '#ffffff', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>🏷️ Kategori Menu: {category.name}</span>
                <span style={{ fontSize: '0.74rem', fontWeight: '800', background: 'rgba(168,85,247,0.15)', color: '#c084fc', padding: '3px 10px', borderRadius: '8px', border: '1px solid rgba(168,85,247,0.3)' }}>
                  Kode: {category.code || `CAT-00${category.id}`}
                </span>
              </h2>
              <div style={{ fontSize: '0.82rem', color: '#94a3b8', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span>Total Menu Terhubung: <strong style={{ color: '#38bdf8' }}>{connectedProducts.length} Menu</strong></span>
                <span>•</span>
                <span>Status Kategori: <strong style={{ color: '#34d399' }}>🟢 {category.status || 'Aktif'}</strong></span>
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#c084fc', fontWeight: '800', fontSize: '0.84rem' }}>
            <Filter size={18} />
            <span>Filter Analisis Penjualan Kategori Menu:</span>
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
            <div style={{ fontSize: '1.35rem', fontWeight: '900', color: '#ffffff' }}>
              {totalQtySold} <span style={{ fontSize: '0.85rem', color: '#34d399' }}>Porsi / Unit</span>
            </div>
          </div>

          {/* CARD 2: TOTAL PENJUALAN (OMZET KATEGORI) */}
          <div style={{ background: 'rgba(56,189,248,0.1)', border: '1px solid rgba(56,189,248,0.3)', borderRadius: '16px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <span style={{ fontSize: '0.74rem', fontWeight: '800', color: '#38bdf8', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <DollarSign size={14} />
              <span>Total Omzet Kategori</span>
            </span>
            <div style={{ fontSize: '1.35rem', fontWeight: '900', color: '#ffffff' }}>
              {formatRupiah(totalRevenue)}
            </div>
          </div>

          {/* CARD 3: RATA-RATA / STRUK */}
          <div style={{ background: 'rgba(192,132,252,0.1)', border: '1px solid rgba(192,132,252,0.3)', borderRadius: '16px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <span style={{ fontSize: '0.74rem', fontWeight: '800', color: '#c084fc', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <TrendingUp size={14} />
              <span>Rata-Rata / Struk</span>
            </span>
            <div style={{ fontSize: '1.35rem', fontWeight: '900', color: '#ffffff' }}>
              {formatRupiah(avgRevenuePerTx)}
            </div>
          </div>

          {/* CARD 4: TOTAL STRUK POS */}
          <div style={{ background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.3)', borderRadius: '16px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <span style={{ fontSize: '0.74rem', fontWeight: '800', color: '#fbbf24', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Receipt size={14} />
              <span>Total Struk POS</span>
            </span>
            <div style={{ fontSize: '1.35rem', fontWeight: '900', color: '#ffffff' }}>
              {totalTransactionsCount} <span style={{ fontSize: '0.85rem', color: '#fbbf24' }}>Struk</span>
            </div>
          </div>
        </div>

        {/* SECTION 1: NAMA MENU DALAM KATEGORI INI */}
        <div style={{ background: '#1f2937', padding: '20px', borderRadius: '18px', border: '1px solid #374151', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: '900', color: '#ffffff', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Utensils size={18} color="#c084fc" />
            <span>Daftar Menu Restoran Dalam Kategori {category.name} ({connectedProducts.length} Menu):</span>
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '12px' }}>
            {connectedProducts.map((menu, idx) => (
              <div key={idx} style={{ background: '#090d16', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '14px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'rgba(168,85,247,0.15)', border: '1px solid rgba(168,85,247,0.3)', color: '#c084fc', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900', fontSize: '1.1rem' }}>
                  {menu.name ? menu.name.charAt(0).toUpperCase() : 'M'}
                </div>
                <div>
                  <h4 style={{ fontSize: '0.90rem', fontWeight: '900', color: '#ffffff', margin: 0 }}>
                    {menu.name}
                  </h4>
                  <div style={{ fontSize: '0.75rem', color: '#34d399', fontWeight: '700', marginTop: '2px' }}>
                    Harga: {formatRupiah(menu.price)}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '1px' }}>
                    SKU: {menu.sku || `MNU-${menu.id}`}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* SECTION 2: TABEL HISTORY PENJUALAN DETAIL KATEGORI */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: '900', color: '#ffffff', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShoppingBag size={18} color="#38bdf8" />
              <span>Riwayat History Penjualan Detail Kategori ({filteredHistory.length} Transaksi)</span>
            </h3>
          </div>

          <div style={{ border: '1px solid #1f2937', borderRadius: '16px', overflow: 'hidden', background: '#090d16' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.82rem' }}>
              <thead>
                <tr style={{ background: '#1f2937', borderBottom: '1px solid #374151', color: '#94a3b8', fontWeight: '800', fontSize: '0.74rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  <th style={{ padding: '12px 14px' }}>Tanggal & Waktu</th>
                  <th style={{ padding: '12px 14px' }}>No. Struk</th>
                  <th style={{ padding: '12px 14px' }}>Outlet Cabang</th>
                  <th style={{ padding: '12px 14px' }}>Menu Terjual</th>
                  <th style={{ padding: '12px 14px', textAlign: 'center' }}>Qty</th>
                  <th style={{ padding: '12px 14px' }}>Harga Satuan</th>
                  <th style={{ padding: '12px 14px' }}>Total Nominal</th>
                  <th style={{ padding: '12px 14px' }}>Metode Pembayaran</th>
                  <th style={{ padding: '12px 14px' }}>Kasir / User</th>
                </tr>
              </thead>
              <tbody>
                {filteredHistory.length === 0 ? (
                  <tr>
                    <td colSpan={9} style={{ padding: '32px', textAlign: 'center', color: '#94a3b8' }}>
                      Tidak ada riwayat penjualan kategori untuk kombinasi filter ini.
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
                      <td style={{ padding: '12px 14px', color: '#c084fc', fontWeight: '800' }}>
                        🍽️ {row.item_name}
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
