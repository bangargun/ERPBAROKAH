import React, { useState } from 'react';
import { X, Users, DollarSign, Calendar, Store, ShoppingBag, Utensils, TrendingUp, Filter, Receipt, Package, Award } from 'lucide-react';
import { getThemePalette } from '../../utils/themeUtils';

export default function CustomerAnalyticsDetailModal({ customer, masterData, onClose, themeMode = 'dark' }) {
  const T = getThemePalette(themeMode);
  const [filterOutlet, setFilterOutlet] = useState('Semua Outlet');
  const [filterMonthYear, setFilterMonthYear] = useState('Semua Bulan & Tahun');

  if (!customer) return null;

  // Retrieve outlets list
  const outletsList = masterData?.outlets || [
    { name: 'Gourmet Bistro - Senopati' },
    { name: 'Ramen Haus - Kemang' },
    { name: 'Kopi & Kitchen - PIK' }
  ];

  // Helper to format Rupiah
  const formatRupiah = (val) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val || 0);
  };

  // Generate Customer Purchase History
  const generateCustomerPurchaseHistory = () => {
    const rawSales = masterData?.salesTransactions || masterData?.transactions || [];
    let matchedHistory = [];

    // Filter real raw sales for this customer
    rawSales.filter(tx => 
      tx.customer_id === customer.id || 
      tx.customer_name === customer.name || 
      tx.customer === customer.name
    ).forEach(tx => {
      matchedHistory.push({
        id: tx.id || `tx-${Math.random()}`,
        receipt_no: tx.receipt_no || tx.receiptNo || `#TRX-${tx.id}`,
        date: tx.date || tx.createdAt || tx.timestamp,
        month_year: tx.month_year || tx.monthYear || 'Tahun 2026',
        outlet_name: tx.outlet_name || tx.outletName || 'Outlet Utama',
        items_summary: (tx.items || []).map(i => `${i.name} (x${i.qty || 1})`).join(', ') || 'Item Transaksi',
        total_qty: (tx.items || []).reduce((s, i) => s + (i.qty || 1), 0),
        total_amount: tx.grand_total || tx.totalAmount || tx.total || 0,
        payment_method: tx.payment_method || tx.paymentMethod || 'Cash',
        points_earned: Math.floor((tx.grand_total || tx.total_amount || tx.amount || 0) / (masterData?.loyaltyPointRatio || 100000))
      });
    });

    return matchedHistory;
  };

  const allHistory = generateCustomerPurchaseHistory();

  // Apply Outlet & Month-Year Filters
  const filteredHistory = allHistory.filter(item => {
    const matchesOutlet = filterOutlet === 'Semua Outlet' || item.outlet_name === filterOutlet;
    const matchesMonth = filterMonthYear === 'Semua Bulan & Tahun' || item.month_year === filterMonthYear;
    return matchesOutlet && matchesMonth;
  });

  // Calculate Aggregates
  const totalSpend = filteredHistory.reduce((acc, curr) => acc + curr.total_amount, 0);
  const totalMenuQty = filteredHistory.reduce((acc, curr) => acc + curr.total_qty, 0);
  const totalTransactionsCount = filteredHistory.length;
  const totalPoints = filteredHistory.reduce((acc, curr) => acc + curr.points_earned, 0);

  // Derive favorite items purchased
  const getFavoriteItemsBreakdown = () => {
    const itemMap = {};
    filteredHistory.forEach(h => {
      const parts = h.items_summary.split(', ');
      parts.forEach(p => {
        const match = p.match(/(.+) \(x(\d+)\)/);
        if (match) {
          const itemName = match[1];
          const qty = parseInt(match[2], 10) || 1;
          if (!itemMap[itemName]) itemMap[itemName] = 0;
          itemMap[itemName] += qty;
        }
      });
    });

    return Object.keys(itemMap).map(name => ({
      name,
      qty: itemMap[name]
    })).sort((a, b) => b.qty - a.qty);
  };

  const favoriteItems = getFavoriteItemsBreakdown();

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(9, 13, 22, 0.85)', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999, padding: '20px'
    }} className="animate-fade-in">
      <div className="glass-card" style={{
        width: '100%', maxWidth: '980px', maxHeight: '92vh', overflowY: 'auto',
        background: T.cardBg, border: `1.5px solid ${T.infoBorder}`,
        borderRadius: '24px', padding: '28px', boxShadow: T.shadowLg,
        display: 'flex', flexDirection: 'column', gap: '22px'
      }}>
        
        {/* MODAL HEADER */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: `1px solid ${T.border}`, paddingBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: T.primaryBtn, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff', fontWeight: '900', fontSize: '1.4rem', boxShadow: T.primaryBtnShadow }}>
              <Users size={30} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.4rem', fontWeight: '900', color: T.txtPrimary, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>{customer.name}</span>
                <span style={{ fontSize: '0.74rem', fontWeight: '800', background: T.infoBg, color: T.info, padding: '3px 10px', borderRadius: '8px', border: `1px solid ${T.infoBorder}` }}>
                  ID: {customer.code || `MBR-00${customer.id}`}
                </span>
              </h2>
              <div style={{ fontSize: '0.82rem', color: T.txtSecondary, marginTop: '4px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span>WhatsApp: <strong style={{ color: T.success }}>{customer.phone || '0812-3456-7890'}</strong></span>
                <span>•</span>
                <span>Tier Status: <strong style={{ color: T.accentGold }}>Gold Customer</strong></span>
                <span>•</span>
                <span>Status Akun: <strong style={{ color: T.success }}>Member Aktif</strong></span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{ background: T.cardBg2, border: `1px solid ${T.borderStrong}`, color: T.txtSecondary, borderRadius: '12px', padding: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* FILTER BAR (NAMA OUTLET & BULAN TAHUN) */}
        <div style={{ background: T.cardBg2, padding: '16px', borderRadius: '16px', border: `1px solid ${T.borderStrong}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: T.info, fontWeight: '800', fontSize: '0.84rem' }}>
            <Filter size={18} />
            <span>Filter Analisis Transaksi Pelanggan:</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            {/* 1. FILTER NAMA OUTLET */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Store size={16} color={T.txtSecondary} />
              <select
                value={filterOutlet}
                onChange={e => setFilterOutlet(e.target.value)}
                style={{ padding: '8px 14px', borderRadius: '10px', border: `1px solid ${T.border}`, background: T.inputBg, color: T.txtPrimary, fontSize: '0.84rem', fontWeight: '700', cursor: 'pointer' }}
              >
                <option value="Semua Outlet">Semua Outlet Cabang</option>
                {outletsList.map((o, idx) => (
                  <option key={idx} value={o.name}>{o.name}</option>
                ))}
              </select>
            </div>

            {/* 2. FILTER BULAN & TAHUN */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Calendar size={16} color={T.txtSecondary} />
              <select
                value={filterMonthYear}
                onChange={e => setFilterMonthYear(e.target.value)}
                style={{ padding: '8px 14px', borderRadius: '10px', border: `1px solid ${T.border}`, background: T.inputBg, color: T.txtPrimary, fontSize: '0.84rem', fontWeight: '700', cursor: 'pointer' }}
              >
                <option value="Semua Bulan & Tahun">Semua Waktu</option>
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
          {/* CARD 1: TOTAL PENJUALAN / BELANJA PELANGGAN */}
          <div style={{ background: T.infoBg, border: `1px solid ${T.infoBorder}`, borderRadius: '16px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <span style={{ fontSize: '0.74rem', fontWeight: '800', color: T.info, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <DollarSign size={14} />
              <span>Total Belanja (Penjualan)</span>
            </span>
            <div style={{ fontSize: '1.35rem', fontWeight: '900', color: T.txtPrimary }}>
              {formatRupiah(totalSpend)}
            </div>
          </div>

          {/* CARD 2: KUANTITAS MENU DIBELI */}
          <div style={{ background: T.successBg, border: `1px solid ${T.successBorder}`, borderRadius: '16px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <span style={{ fontSize: '0.74rem', fontWeight: '800', color: T.success, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Package size={14} />
              <span>Kuantitas Menu Dibeli</span>
            </span>
            <div style={{ fontSize: '1.35rem', fontWeight: '900', color: T.txtPrimary }}>
              {totalMenuQty} <span style={{ fontSize: '0.85rem', color: T.success }}>Porsi / Item</span>
            </div>
          </div>

          {/* CARD 3: TOTAL TRANSAKSI STRUK */}
          <div style={{ background: T.infoBg, border: `1px solid ${T.infoBorder}`, borderRadius: '16px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <span style={{ fontSize: '0.74rem', fontWeight: '800', color: T.info, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Receipt size={14} />
              <span>Total Transaksi</span>
            </span>
            <div style={{ fontSize: '1.35rem', fontWeight: '900', color: T.txtPrimary }}>
              {totalTransactionsCount} <span style={{ fontSize: '0.85rem', color: T.info }}>Struk POS</span>
            </div>
          </div>

          {/* CARD 4: POIN LOYALITAS & TIER */}
          <div style={{ background: T.accentGoldBg, border: `1px solid ${T.accentGoldBorder}`, borderRadius: '16px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <span style={{ fontSize: '0.74rem', fontWeight: '800', color: T.accentGold, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Award size={14} />
              <span>Poin Loyalitas</span>
            </span>
            <div style={{ fontSize: '1.35rem', fontWeight: '900', color: T.txtPrimary }}>
              {totalPoints} <span style={{ fontSize: '0.85rem', color: T.accentGold }}>Poin Member</span>
            </div>
          </div>
        </div>

        {/* SECTION 1: MENU PALING SERING DIBELI (FAVORITE MENU ITEMS) */}
        <div style={{ background: T.cardBg2, padding: '20px', borderRadius: '18px', border: `1px solid ${T.borderStrong}`, display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: '900', color: T.txtPrimary, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Utensils size={18} color={T.info} />
            <span>Menu Restoran Yang Paling Sering Dibeli Oleh Pelanggan Ini:</span>
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '12px' }}>
            {favoriteItems.slice(0, 4).map((fav, idx) => (
              <div key={idx} style={{ background: T.cardBg, border: `1px solid ${T.border}`, borderRadius: '14px', padding: '14px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: T.infoBg, border: `1px solid ${T.infoBorder}`, color: T.info, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900', fontSize: '1.1rem' }}>
                  #{idx + 1}
                </div>
                <div>
                  <h4 style={{ fontSize: '0.88rem', fontWeight: '900', color: T.txtPrimary, margin: 0 }}>
                    {fav.name}
                  </h4>
                  <div style={{ fontSize: '0.75rem', color: T.success, fontWeight: '800', marginTop: '2px' }}>
                    Total Dibeli: {fav.qty} Porsi / Cangkir
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* SECTION 2: HISTORI TRANSAKSI DETAIL PELANGGAN */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: '900', color: T.txtPrimary, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShoppingBag size={18} color={T.success} />
              <span>Histori Transaksi Belanja Detail Pelanggan ({filteredHistory.length} Transaksi)</span>
            </h3>
          </div>

          <div style={{ border: `1px solid ${T.borderStrong}`, borderRadius: '16px', overflow: 'hidden', background: T.tableBg }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.82rem' }}>
              <thead>
                <tr style={{ background: T.tableHeaderBg, borderBottom: `1px solid ${T.borderStrong}`, color: T.txtSecondary, fontWeight: '800', fontSize: '0.74rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  <th style={{ padding: '12px 14px' }}>Tanggal & Waktu</th>
                  <th style={{ padding: '12px 14px' }}>No. Struk</th>
                  <th style={{ padding: '12px 14px' }}>Outlet Cabang</th>
                  <th style={{ padding: '12px 14px' }}>Menu / Items Dibelinya</th>
                  <th style={{ padding: '12px 14px', textAlign: 'center' }}>Total Qty</th>
                  <th style={{ padding: '12px 14px' }}>Total Belanja</th>
                  <th style={{ padding: '12px 14px' }}>Pembayaran</th>
                  <th style={{ padding: '12px 14px' }}>Perolehan Poin</th>
                </tr>
              </thead>
              <tbody>
                {filteredHistory.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ padding: '32px', textAlign: 'center', color: T.txtSecondary }}>
                      Tidak ada histori transaksi belanja untuk kombinasi filter ini.
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
                      <td style={{ padding: '12px 14px', fontWeight: '700', color: T.txtPrimary }}>
                        {row.outlet_name}
                      </td>
                      <td style={{ padding: '12px 14px', color: T.txtPrimary, fontWeight: '700' }}>
                        {row.items_summary}
                      </td>
                      <td style={{ padding: '12px 14px', textAlign: 'center', fontWeight: '900', color: T.success }}>
                        {row.total_qty} Item
                      </td>
                      <td style={{ padding: '12px 14px', fontWeight: '900', color: T.txtPrimary }}>
                        {formatRupiah(row.total_amount)}
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <span style={{ background: T.accentGoldBg, padding: '3px 8px', borderRadius: '6px', fontSize: '0.74rem', color: T.accentGold, fontWeight: '700', border: `1px solid ${T.accentGoldBorder}` }}>
                          {row.payment_method}
                        </span>
                      </td>
                      <td style={{ padding: '12px 14px', color: T.success, fontWeight: '900' }}>
                        +{row.points_earned} Poin
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
