import React, { useState } from 'react';
import { X, Store, DollarSign, Calendar, ShoppingBag, Utensils, TrendingUp, Filter, Receipt, Package, MapPin, Users } from 'lucide-react';

export default function OutletAnalyticsDetailModal({ outlet, masterData, onClose }) {
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

    const sampleMonths = ['Juli 2026', 'Juni 2026', 'Mei 2026', 'April 2026'];
    const samplePayments = ['QRIS BCA', 'Cash', 'Transfer Mandiri', 'Debit BRI'];
    const sampleCashiers = ['Andi Kasir', 'Siti Supervisor', 'Budi Kasir', 'Dewi Admin'];
    const sampleMenuList = masterData?.products || [
      { name: 'Espresso Single', price: 25000 },
      { name: 'Chicken Katsu Rice', price: 45000 },
      { name: 'Iced Palm Sugar Latte', price: 30000 },
      { name: 'Ramen Tonkotsu', price: 55000 }
    ];

    for (let i = 1; i <= 20; i++) {
      const menuObj = sampleMenuList[(i - 1) % sampleMenuList.length];
      const qty = (i % 4) + 1;
      const unitPrice = menuObj.price || 35000;
      const totalPrice = qty * unitPrice;

      const day = 24 - (i % 22);
      const monthIndex = i % sampleMonths.length;
      const monthStr = sampleMonths[monthIndex];

      matchedHistory.push({
        id: `otl-sales-${outlet.id}-${i}`,
        receipt_no: `#TRX-2026${String(7 - monthIndex).padStart(2, '0')}${String(day).padStart(2, '0')}-${String(500 + i)}`,
        date: `${day} ${monthStr.split(' ')[0]} 2026, ${10 + (i % 11)}:${10 + (i * 6) % 45} WIB`,
        month_year: monthStr,
        outlet_name: outlet.name,
        menu_name: menuObj.name,
        qty: qty,
        unit_price: unitPrice,
        total_price: totalPrice,
        payment_method: samplePayments[i % samplePayments.length],
        cashier: sampleCashiers[i % sampleCashiers.length]
      });
    }

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
        background: '#111827', border: '1.5px solid rgba(56, 189, 248, 0.4)',
        borderRadius: '24px', padding: '28px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.7)',
        display: 'flex', flexDirection: 'column', gap: '22px'
      }}>
        
        {/* MODAL HEADER */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid #1f2937', paddingBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff', fontWeight: '900', fontSize: '1.4rem', boxShadow: '0 6px 16px rgba(2,132,199,0.4)' }}>
              <Store size={30} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.4rem', fontWeight: '900', color: '#ffffff', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>🏪 {outlet.name}</span>
                <span style={{ fontSize: '0.74rem', fontWeight: '800', background: 'rgba(56,189,248,0.15)', color: '#38bdf8', padding: '3px 10px', borderRadius: '8px', border: '1px solid rgba(56,189,248,0.3)' }}>
                  Kode: {outlet.code || `OTL-00${outlet.id}`}
                </span>
              </h2>
              <div style={{ fontSize: '0.82rem', color: '#94a3b8', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span>Alamat: <strong style={{ color: '#cbd5e1' }}>📍 {outlet.address || 'Jakarta'}</strong></span>
                <span>•</span>
                <span>Status Outlet: <strong style={{ color: '#34d399' }}>🟢 {outlet.status || 'Aktif'}</strong></span>
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

        {/* FILTER BAR (BULAN & TAHUN) */}
        <div style={{ background: '#1f2937', padding: '16px', borderRadius: '16px', border: '1px solid #374151', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#38bdf8', fontWeight: '800', fontSize: '0.84rem' }}>
            <Filter size={18} />
            <span>Filter Analisis Penjualan Outlet Cabang:</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            {/* FILTER BULAN & TAHUN */}
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

          {/* CARD 2: TOTAL PENJUALAN (OMZET OUTLET) */}
          <div style={{ background: 'rgba(56,189,248,0.1)', border: '1px solid rgba(56,189,248,0.3)', borderRadius: '16px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <span style={{ fontSize: '0.74rem', fontWeight: '800', color: '#38bdf8', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <DollarSign size={14} />
              <span>Total Omzet Outlet</span>
            </span>
            <div style={{ fontSize: '1.35rem', fontWeight: '900', color: '#ffffff' }}>
              {formatRupiah(totalRevenue)}
            </div>
          </div>

          {/* CARD 3: RATA-RATA OMZET / STRUK */}
          <div style={{ background: 'rgba(129,140,248,0.1)', border: '1px solid rgba(129,140,248,0.3)', borderRadius: '16px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <span style={{ fontSize: '0.74rem', fontWeight: '800', color: '#818cf8', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
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
              {totalTransactionsCount} <span style={{ fontSize: '0.85rem', color: '#fbbf24' }}>Struk POS</span>
            </div>
          </div>
        </div>

        {/* SECTION 1: TOP 4 MENU TERLARIS DI OUTLET INI */}
        <div style={{ background: '#1f2937', padding: '20px', borderRadius: '18px', border: '1px solid #374151', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: '900', color: '#ffffff', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Utensils size={18} color="#38bdf8" />
            <span>Menu Terlaris Di Outlet {outlet.name}:</span>
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '12px' }}>
            {topMenus.slice(0, 4).map((top, idx) => (
              <div key={idx} style={{ background: '#090d16', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '14px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(56,189,248,0.15)', border: '1px solid rgba(56,189,248,0.3)', color: '#38bdf8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900', fontSize: '1.1rem' }}>
                  #{idx + 1}
                </div>
                <div>
                  <h4 style={{ fontSize: '0.88rem', fontWeight: '900', color: '#ffffff', margin: 0 }}>
                    {top.name}
                  </h4>
                  <div style={{ fontSize: '0.75rem', color: '#34d399', fontWeight: '800', marginTop: '2px' }}>
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
            <h3 style={{ fontSize: '1.05rem', fontWeight: '900', color: '#ffffff', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShoppingBag size={18} color="#34d399" />
              <span>History Penjualan Detail Outlet ({filteredHistory.length} Transaksi)</span>
            </h3>
          </div>

          <div style={{ border: '1px solid #1f2937', borderRadius: '16px', overflow: 'hidden', background: '#090d16' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.82rem' }}>
              <thead>
                <tr style={{ background: '#1f2937', borderBottom: '1px solid #374151', color: '#94a3b8', fontWeight: '800', fontSize: '0.74rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
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
                    <td colSpan={8} style={{ padding: '32px', textAlign: 'center', color: '#94a3b8' }}>
                      Tidak ada history penjualan outlet untuk filter ini.
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
                      <td style={{ padding: '12px 14px', color: '#f8fafc', fontWeight: '800' }}>
                        🍽️ {row.menu_name}
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
