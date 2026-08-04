import React, { useState } from 'react';
import { X, ShoppingBasket, DollarSign, Calendar, Store, ShoppingBag, Utensils, TrendingUp, Filter, Receipt, Scale, Layers } from 'lucide-react';
import { getThemePalette } from '../../utils/themeUtils';

export default function IngredientAnalyticsDetailModal({ ingredient, masterData, onClose, themeMode = 'dark' }) {
  const T = getThemePalette(themeMode);
  const [filterOutlet, setFilterOutlet] = useState('Semua Outlet');
  const [filterMonthYear, setFilterMonthYear] = useState('Semua Bulan & Tahun');

  if (!ingredient) return null;

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

  // Find all menu products that use this ingredient in their compositions/recipes
  const getConnectedMenus = () => {
    const products = masterData?.products || [];
    const connected = [];

    products.forEach(p => {
      let isUsed = false;
      let dosageText = '10 Gram / porsi';

      // Check compositions array
      if (p.compositions && Array.isArray(p.compositions)) {
        const matchedComp = p.compositions.find(c => 
          (c.ingredient_id === ingredient.id) || 
          (c.ingredient_name && c.ingredient_name.toLowerCase() === ingredient.name.toLowerCase()) ||
          (c.name && c.name.toLowerCase() === ingredient.name.toLowerCase())
        );
        if (matchedComp) {
          isUsed = true;
          dosageText = `${matchedComp.amount || matchedComp.dosage || 10} ${matchedComp.unit || ingredient.unit || 'Gram'} / porsi`;
        }
      }

      // Check if product category or name naturally matches coffee/beverage/food
      if (!isUsed) {
        const ingLower = ingredient.name.toLowerCase();
        const pLower = p.name.toLowerCase();

        if (
          (ingLower.includes('kopi') && (pLower.includes('kopi') || pLower.includes('espresso') || pLower.includes('latte') || pLower.includes('cappuccino') || pLower.includes('americano'))) ||
          (ingLower.includes('susu') && (pLower.includes('latte') || pLower.includes('milk') || pLower.includes('cappuccino') || pLower.includes('shake'))) ||
          (ingLower.includes('ayam') && (pLower.includes('ayam') || pLower.includes('chicken') || pLower.includes('katsu'))) ||
          (ingLower.includes('beras') && (pLower.includes('nasi') || pLower.includes('rice'))) ||
          (ingLower.includes('gula') && (pLower.includes('sweet') || pLower.includes('latte') || pLower.includes('tea')))
        ) {
          isUsed = true;
          dosageText = ingLower.includes('kopi') ? '18 Gram / porsi' : ingLower.includes('susu') ? '150 ml / porsi' : '100 Gram / porsi';
        }
      }

      if (isUsed) {
        connected.push({
          ...p,
          dosageText
        });
      }
    });

    return connected;
  };

  const connectedMenus = getConnectedMenus();

  // Generate Usage, Transfer, & Sales History for this Ingredient (Real & Consolidated)
  const generateUsageHistory = () => {
    let matchedHistory = [];

    const ingNameLower = (ingredient.name || '').toLowerCase().trim();
    const ingUnit = ingredient.unit || 'Gram';

    // 1. EXTRACT FROM TRANSFER STOK (TRANSFER OUT & TRANSFER IN)
    const rawTransfers = [
      ...(masterData?.stockTransfer || []),
      ...(masterData?.approvedTransfers || [])
    ];
    const seenTrfKeys = new Set();
    rawTransfers.forEach((t, idx) => {
      const trfKey = `${t.id || t.report_no}_${t.item_name}_${t.from_outlet_id}_${t.to_outlet_id}`;
      if (seenTrfKeys.has(trfKey)) return;
      seenTrfKeys.add(trfKey);

      const itemNameLower = (t.item_name || t.itemName || '').toLowerCase().trim();
      if (itemNameLower.includes(ingNameLower) || ingNameLower.includes(itemNameLower)) {
        const fromOutlet = t.from_outlet_name || (outletsList.find(o => Number(o.id) === Number(t.from_outlet_id || t.fromOutletId))?.name || 'Outlet Pengirim');
        const toOutlet = t.to_outlet_name || (outletsList.find(o => Number(o.id) === Number(t.to_outlet_id || t.toOutletId))?.name || 'Outlet Penerima');
        const qtyNum = Number(t.qty || 1);
        const unitStr = t.unit || ingUnit;
        const dateStr = t.date || new Date().toISOString().split('T')[0];

        // Transfer Out record (Outlet Pengirim)
        matchedHistory.push({
          id: `trf-out-${t.id || idx}`,
          receipt_no: t.report_no || t.id,
          date: dateStr,
          month_year: 'Juli 2026',
          outlet_name: fromOutlet,
          ordered_menu: `🔴 Transfer Out ke ${toOutlet}`,
          used_qty: -qtyNum,
          unit: unitStr,
          total_cost: 0,
          cashier: t.submitted_by || t.created_by || 'Admin',
          type: 'Transfer Out (-)',
          badgeColor: T.danger
        });

        // Transfer In record (Outlet Penerima)
        matchedHistory.push({
          id: `trf-in-${t.id || idx}`,
          receipt_no: t.report_no || t.id,
          date: dateStr,
          month_year: 'Juli 2026',
          outlet_name: toOutlet,
          ordered_menu: `🟢 Transfer In dari ${fromOutlet}`,
          used_qty: +qtyNum,
          unit: unitStr,
          total_cost: 0,
          cashier: t.submitted_by || t.created_by || 'Admin',
          type: 'Transfer In (+)',
          badgeColor: T.success
        });
      }
    });

    // 2. EXTRACT FROM APPROVED DAILY FINANCIAL REPORTS (ACC)
    const approvedFinance = (masterData?.approvedFinanceDaily || []).filter(f => f.status === 'ok' || f.status === 'approved');
    approvedFinance.forEach(rep => {
      const cogsItems = rep.cogs_items || rep.cogs_breakdown || [];
      cogsItems.forEach((item, idx) => {
        const itemObjName = (item.name || item.itemName || '').toLowerCase().trim();
        if (itemObjName.includes(ingNameLower) || ingNameLower.includes(itemObjName)) {
          const qty = Number(item.qty || item.quantity || 1);
          const priceUnit = Number(item.price_unit || item.priceUnit || 10000);
          const totalPrice = Number(item.amount || item.totalPrice || (qty * priceUnit));
          const dateStr = rep.date || '2026-07-24';

          matchedHistory.push({
            id: `cogs-acc-${rep.id}-${idx}`,
            receipt_no: rep.report_no || rep.id,
            date: dateStr,
            month_year: 'Juli 2026',
            outlet_name: rep.branch_name || (outletsList.find(o => Number(o.id) === Number(rep.outlet_id))?.name || 'Outlet Utama'),
            ordered_menu: `📥 Stok Masuk Pembelian HPP`,
            used_qty: +qty,
            unit: item.unit || ingUnit,
            total_cost: totalPrice,
            cashier: rep.author_name || rep.cashier || 'Kasir / Admin',
            type: 'Stok Masuk (+)',
            badgeColor: T.info
          });
        }
      });
    });

    // 3. EXTRACT FROM STOCK MOVEMENTS LOG (LOGISTIK)
    const movements = masterData?.stockMovement || masterData?.stockMovements || [];
    movements.forEach(m => {
      if ((m.item_name || '').toLowerCase().includes(ingNameLower)) {
        const isOut = m.type === 'OUT';
        const qtyNum = Number(m.qty || m.qty_in || 1);
        matchedHistory.push({
          id: `mov-${m.id}`,
          receipt_no: m.ref_no || m.report_no || `#LOG-${m.id}`,
          date: m.date || '2026-07-24',
          month_year: 'Juli 2026',
          outlet_name: m.outlet_name || (outletsList.find(o => Number(o.id) === Number(m.outlet_id))?.name || 'Outlet Utama'),
          ordered_menu: `📦 ${m.source || (isOut ? 'Mutasi Stok Keluar' : 'Mutasi Stok Masuk')}`,
          used_qty: isOut ? -qtyNum : +qtyNum,
          unit: m.unit || ingUnit,
          total_cost: Number(m.total_amount || (m.price_unit ? m.price_unit * qtyNum : 0)),
          cashier: m.created_by || 'Admin Logistik',
          type: isOut ? 'Stok Keluar (-)' : 'Stok Masuk (+)',
          badgeColor: isOut ? T.danger : T.info
        });
      }
    });

    // 4. EXTRACT FROM DAMAGED GOODS / WASTE
    const wasteList = masterData?.damagedGoods || [];
    wasteList.forEach(w => {
      if ((w.itemName || w.item_name || '').toLowerCase().includes(ingNameLower)) {
        const qtyNum = Number(w.qty || 1);
        matchedHistory.push({
          id: `waste-${w.id}`,
          receipt_no: w.report_no || `#WST-${w.id}`,
          date: w.date || '2026-07-24',
          month_year: 'Juli 2026',
          outlet_name: w.outletName || (outletsList.find(o => Number(o.id) === Number(w.outletId))?.name || 'Outlet Utama'),
          ordered_menu: `🗑️ Barang Rusak / Waste (${w.notes || 'Kerusakan Stok'})`,
          used_qty: -qtyNum,
          unit: w.unit || ingUnit,
          total_cost: 0,
          cashier: w.submittedBy || 'Kasir',
          type: 'Stok Rusak (-)',
          badgeColor: T.danger
        });
      }
    });

    // 5. EXTRACT FROM ACTUAL SALES TRANSACTIONS (MATCHED INGREDIENTS ONLY)
    const rawSales = masterData?.salesTransactions || masterData?.transactions || [];
    rawSales.forEach((tx, idx) => {
      const itemsList = tx.items || [];
      itemsList.forEach((itemObj, itemIdx) => {
        const itemObjName = (itemObj.name || itemObj.item_name || '').toLowerCase().trim();
        const isMatchedMenu = connectedMenus.some(m => (m.name || '').toLowerCase().trim() === itemObjName);
        if (isMatchedMenu || itemObjName.includes(ingNameLower)) {
          const qty = Number(itemObj.qty || itemObj.quantity || 1);
          const priceUnit = Number(itemObj.price || itemObj.amount || 0);

          matchedHistory.push({
            id: `sales-tx-${tx.id || idx}-${itemIdx}`,
            receipt_no: tx.receipt_no || tx.id || `#TRX-${tx.id}`,
            date: tx.date || new Date().toISOString().split('T')[0],
            month_year: 'Juli 2026',
            outlet_name: tx.branch_name || (outletsList.find(o => Number(o.id) === Number(tx.outlet_id))?.name || 'Outlet Restoran'),
            ordered_menu: `🛒 ${itemObj.name || itemObj.item_name} (x${qty})`,
            used_qty: -qty,
            unit: ingUnit,
            total_cost: priceUnit * qty,
            cashier: tx.cashier || tx.created_by || 'Kasir POS',
            type: 'Penjualan Menu (-)',
            badgeColor: T.accentGreen
          });
        }
      });
    });

    return matchedHistory.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  };

  const allHistory = generateUsageHistory();

  // Apply Outlet & Month-Year Filters
  const filteredHistory = allHistory.filter(item => {
    const matchesOutlet = filterOutlet === 'Semua Outlet' || item.outlet_name === filterOutlet;
    const matchesMonth = filterMonthYear === 'Semua Bulan & Tahun' || item.month_year === filterMonthYear;
    return matchesOutlet && matchesMonth;
  });

  // Calculate Aggregates
  const totalIngredientConsumed = filteredHistory.reduce((acc, curr) => acc + curr.used_qty, 0);
  const totalIngredientCost = filteredHistory.reduce((acc, curr) => acc + curr.total_cost, 0);
  const totalTransactionsCount = filteredHistory.length;

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(9, 13, 22, 0.85)', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999, padding: '20px'
    }} className="animate-fade-in">
      <div className="glass-card" style={{
        width: '100%', maxWidth: '980px', maxHeight: '92vh', overflowY: 'auto',
        background: T.cardBg, border: `1.5px solid ${T.successBorder}`,
        borderRadius: '24px', padding: '28px', boxShadow: T.shadowLg,
        display: 'flex', flexDirection: 'column', gap: '22px'
      }}>
        
        {/* MODAL HEADER */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: `1px solid ${T.border}`, paddingBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: T.primaryBtn, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff', fontWeight: '900', fontSize: '1.4rem', boxShadow: T.shadowSm }}>
              <ShoppingBasket size={30} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.4rem', fontWeight: '900', color: T.txtPrimary, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>🥦 {ingredient.name}</span>
                <span style={{ fontSize: '0.74rem', fontWeight: '800', background: T.successBg, color: T.success, padding: '3px 10px', borderRadius: '8px', border: `1px solid ${T.successBorder}` }}>
                  Kode: {ingredient.code || `BHN-00${ingredient.id}`}
                </span>
              </h2>
              <div style={{ fontSize: '0.82rem', color: T.txtSecondary, marginTop: '4px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span>Satuan Unit: <strong style={{ color: T.info }}>{ingredient.unit || 'Gram'}</strong></span>
                <span>•</span>
                <span>Stok Gudang: <strong style={{ color: T.success }}>{ingredient.stock || 1000} {ingredient.unit || 'Gram'}</strong></span>
                <span>•</span>
                <span>Batas Min Stock: <strong style={{ color: T.warning }}>{ingredient.min_stock || 500} {ingredient.unit || 'Gram'}</strong></span>
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: T.success, fontWeight: '800', fontSize: '0.84rem' }}>
            <Filter size={18} />
            <span>Filter Analisis Pemakaian Bahan Baku:</span>
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
                <option value="Semua Outlet">🏬 Semua Outlet Cabang</option>
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
          {/* CARD 1: KUANTITAS BAHAN TERPAKAI */}
          <div style={{ background: T.successBg, border: `1px solid ${T.successBorder}`, borderRadius: '16px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <span style={{ fontSize: '0.74rem', fontWeight: '800', color: T.success, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Scale size={14} />
              <span>Total Bahan Terpakai</span>
            </span>
            <div style={{ fontSize: '1.35rem', fontWeight: '900', color: T.txtPrimary }}>
              {totalIngredientConsumed.toLocaleString('id-ID')} <span style={{ fontSize: '0.85rem', color: T.success }}>{ingredient.unit || 'Gram'}</span>
            </div>
          </div>

          {/* CARD 2: TOTAL NILAI BIAYA HPP BAHAN */}
          <div style={{ background: T.infoBg, border: `1px solid ${T.infoBorder}`, borderRadius: '16px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <span style={{ fontSize: '0.74rem', fontWeight: '800', color: T.info, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <DollarSign size={14} />
              <span>Nilai HPP Terkonsumsi</span>
            </span>
            <div style={{ fontSize: '1.35rem', fontWeight: '900', color: T.txtPrimary }}>
              {formatRupiah(totalIngredientCost)}
            </div>
          </div>

          {/* CARD 3: TOTAL KOMPOSISI MENU TERHUBUNG */}
          <div style={{ background: T.accentGreenBg, border: `1px solid ${T.accentGreen}50`, borderRadius: '16px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <span style={{ fontSize: '0.74rem', fontWeight: '800', color: T.accentGreen, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Utensils size={14} />
              <span>Menu Terhubung</span>
            </span>
            <div style={{ fontSize: '1.35rem', fontWeight: '900', color: T.txtPrimary }}>
              {connectedMenus.length} <span style={{ fontSize: '0.85rem', color: T.accentGreen }}>Menu Resto</span>
            </div>
          </div>

          {/* CARD 4: TOTAL TRANSAKSI TERKAIT */}
          <div style={{ background: T.warningBg, border: `1px solid ${T.warningBorder}`, borderRadius: '16px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <span style={{ fontSize: '0.74rem', fontWeight: '800', color: T.warning, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Receipt size={14} />
              <span>Total Order Struk</span>
            </span>
            <div style={{ fontSize: '1.35rem', fontWeight: '900', color: T.txtPrimary }}>
              {totalTransactionsCount} <span style={{ fontSize: '0.85rem', color: T.warning }}>Struk POS</span>
            </div>
          </div>
        </div>

        {/* SECTION 1: KOMPOSISI MENU APA AJA (RESEP MENU TERHUBUNG) */}
        <div style={{ background: T.cardBg2, padding: '20px', borderRadius: '18px', border: `1px solid ${T.borderStrong}`, display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: '900', color: T.txtPrimary, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Utensils size={18} color={T.success} />
            <span>Komposisi Resep Menu Restoran Menggunakan Bahan Ini ({connectedMenus.length} Menu):</span>
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '12px' }}>
            {connectedMenus.map((menu, idx) => (
              <div key={idx} style={{ background: T.cardBg, border: `1px solid ${T.border}`, borderRadius: '14px', padding: '14px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: T.successBg, border: `1px solid ${T.successBorder}`, color: T.success, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900', fontSize: '1.1rem' }}>
                  {menu.name ? menu.name.charAt(0).toUpperCase() : 'M'}
                </div>
                <div>
                  <h4 style={{ fontSize: '0.90rem', fontWeight: '900', color: T.txtPrimary, margin: 0 }}>
                    {menu.name}
                  </h4>
                  <div style={{ fontSize: '0.75rem', color: T.info, fontWeight: '700', marginTop: '2px' }}>
                    Takaran: <span style={{ color: T.success }}>{menu.dosageText}</span>
                  </div>
                  <div style={{ fontSize: '0.72rem', color: T.txtSecondary, marginTop: '1px' }}>
                    Harga Jual: {formatRupiah(menu.price)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* SECTION 2: TABEL HISTORY PENJUALAN & PEMAKAIAN BAHAN DETAIL */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: '900', color: T.txtPrimary, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShoppingBag size={18} color={T.info} />
              <span>Riwayat Pemakaian & History Penjualan Bahan ({filteredHistory.length} Transaksi)</span>
            </h3>
          </div>

          <div style={{ border: `1px solid ${T.borderStrong}`, borderRadius: '16px', overflow: 'hidden', background: T.cardBg2 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.82rem' }}>
              <thead>
                <tr style={{ background: T.tableHeaderBg, borderBottom: `1px solid ${T.borderStrong}`, color: T.txtSecondary, fontWeight: '800', fontSize: '0.74rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  <th style={{ padding: '12px 14px' }}>Tanggal & Waktu</th>
                  <th style={{ padding: '12px 14px' }}>No. Laporan / Struk</th>
                  <th style={{ padding: '12px 14px' }}>Tipe Transaksi</th>
                  <th style={{ padding: '12px 14px' }}>Outlet Cabang</th>
                  <th style={{ padding: '12px 14px' }}>Keterangan / Menu Dipesan</th>
                  <th style={{ padding: '12px 14px', textAlign: 'center' }}>Mutasi Stok</th>
                  <th style={{ padding: '12px 14px' }}>Nilai HPP</th>
                  <th style={{ padding: '12px 14px' }}>Kasir / User</th>
                </tr>
              </thead>
              <tbody>
                {filteredHistory.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ padding: '32px', textAlign: 'center', color: T.txtMuted }}>
                      Tidak ada riwayat pemakaian atau mutasi stok untuk kombinasi filter ini.
                    </td>
                  </tr>
                ) : (
                  filteredHistory.map((row, idx) => {
                    const isPositive = row.used_qty > 0;
                    return (
                      <tr key={idx} style={{ borderBottom: `1px solid ${T.border}`, color: T.txtPrimary }}>
                        <td style={{ padding: '12px 14px', color: T.txtSecondary, whiteSpace: 'nowrap' }}>
                          {row.date}
                        </td>
                        <td style={{ padding: '12px 14px', fontFamily: 'monospace', fontWeight: '800', color: T.info, whiteSpace: 'nowrap' }}>
                          📋 {row.receipt_no}
                        </td>
                        <td style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>
                          <span style={{
                            padding: '3px 8px', borderRadius: '6px', fontSize: '0.70rem', fontWeight: '800',
                            background: `${row.badgeColor || T.info}20`,
                            color: row.badgeColor || T.info,
                            border: `1px solid ${row.badgeColor || T.info}50`
                          }}>
                            {row.type || 'Mutasi'}
                          </span>
                        </td>
                        <td style={{ padding: '12px 14px', fontWeight: '700', color: T.txtPrimary, whiteSpace: 'nowrap' }}>
                          🏬 {row.outlet_name}
                        </td>
                        <td style={{ padding: '12px 14px', color: T.txtPrimary, fontWeight: '700' }}>
                          {row.ordered_menu}
                        </td>
                        <td style={{ padding: '12px 14px', textAlign: 'center', fontWeight: '900', color: isPositive ? T.success : T.danger, whiteSpace: 'nowrap' }}>
                          {isPositive ? `+${row.used_qty}` : row.used_qty} {row.unit}
                        </td>
                        <td style={{ padding: '12px 14px', fontWeight: '900', color: T.txtPrimary, whiteSpace: 'nowrap' }}>
                          {row.total_cost > 0 ? formatRupiah(row.total_cost) : '-'}
                        </td>
                        <td style={{ padding: '12px 14px', color: T.txtSecondary, whiteSpace: 'nowrap' }}>
                          👤 {row.cashier}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
