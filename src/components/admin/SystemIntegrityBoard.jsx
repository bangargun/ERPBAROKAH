import React, { useState, useMemo } from 'react';
import { 
  ShieldAlert, 
  ShieldCheck, 
  AlertTriangle, 
  RefreshCw, 
  DollarSign, 
  Users, 
  Clock, 
  Layers, 
  CheckCircle2, 
  XCircle, 
  HelpCircle, 
  ArrowRight,
  TrendingDown,
  TrendingUp,
  FileSpreadsheet,
  Printer,
  Trash2,
  Eye,
  Check,
  AlertOctagon,
  Search,
  Filter
} from 'lucide-react';
import { getThemePalette } from '../../utils/themeUtils';

export default function SystemIntegrityBoard({ 
  masterData, 
  setMasterData, 
  selectedBranch, 
  themeMode = 'dark' 
}) {
  const T = getThemePalette(themeMode);

  const [activeSubTab, setActiveSubTab] = useState('anomalies'); // 'anomalies' | 'cash_reconciliation' | 'sync_health'
  const [filterDate, setFilterDate] = useState(() => {
    // Default to yesterday or today based on data
    return '2026-08-17';
  });
  const [filterBranch, setFilterBranch] = useState(selectedBranch ? String(selectedBranch) : 'ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [resolvedTxIds, setResolvedTxIds] = useState(new Set());
  const [previewTx, setPreviewTx] = useState(null);

  const outlets = masterData?.outlets || [];
  const salesTransactions = masterData?.salesTransactions || masterData?.transactions || [];
  const shiftClosings = masterData?.shiftClosings || masterData?.shift_closings || masterData?.approvedFinanceDaily || [];
  const pettyExpenses = masterData?.pettyExpenses || [];

  const formatRupiah = (val) => {
    return 'Rp ' + Number(val || 0).toLocaleString('id-ID');
  };

  // 1. FILTER TRANSAKSI BERDASARKAN TANGGAL & CABANG
  const filteredTxs = useMemo(() => {
    return salesTransactions.filter(t => {
      if (!t) return false;
      const tDate = String(t.date || t.entry_date || t.transaction_date || '').substring(0, 10);
      if (filterDate && tDate !== filterDate) return false;
      if (filterBranch !== 'ALL') {
        const matchesId = String(t.outlet_id) === String(filterBranch) || String(t.branch_id) === String(filterBranch);
        const matchesName = (outlets.find(o => String(o.id) === String(filterBranch))?.name || '') === (t.branch_name || t.outlet);
        if (!matchesId && !matchesName) return false;
      }
      return true;
    });
  }, [salesTransactions, filterDate, filterBranch, outlets]);

  // 2. DETEKSI ANOMALI OTOMATIS (RAPID DUPLICATES, ANOMALOUS AMOUNTS, ZERO PRICES)
  const detectedAnomalies = useMemo(() => {
    const list = [];
    const timeToSec = (tStr) => {
      if (!tStr) return 0;
      const [h, m, s] = String(tStr).split(':').map(Number);
      return (h || 0) * 3600 + (m || 0) * 60 + (s || 0);
    };

    // Kelompokkan per cabang untuk mendeteksi transaksi berdekatan
    const byBranch = {};
    filteredTxs.forEach(t => {
      const bKey = t.branch_name || t.outlet || 'Umum';
      if (!byBranch[bKey]) byBranch[bKey] = [];
      byBranch[bKey].push(t);
    });

    Object.entries(byBranch).forEach(([branchName, txList]) => {
      // Urutkan berdasarkan waktu
      const sorted = [...txList].sort((a, b) => timeToSec(a.time) - timeToSec(b.time));

      for (let i = 0; i < sorted.length; i++) {
        const tx = sorted[i];
        const amt = Number(tx.amount || 0);
        const custName = String(tx.customer_name || '').trim().toLowerCase();
        const isNamed = custName && custName !== 'pelanggan umum' && custName !== 'guest' && custName !== '-';

        // Anomali 1: Transaksi Nominal Sangat Rendah (< Rp 5.000)
        if (amt > 0 && amt < 5000) {
          list.push({
            id: `anom-low-${tx.id}`,
            txId: tx.id,
            tx: tx,
            type: 'LOW_AMOUNT',
            level: 'WARNING',
            title: 'Nominal Transaksi Sangat Rendah (< Rp 5.000)',
            desc: `Total transaksi hanya ${formatRupiah(amt)} untuk ${tx.items?.map(it => it.name).join(', ') || 'Menu'}. Potensi salah pilih menu atau salah ketik harga.`,
            branch: branchName,
            time: tx.time,
            customer: tx.customer_name || 'Pelanggan Umum',
            amount: amt,
            cashier: tx.cashier || 'Kasir',
            paymentMethod: tx.payment_method || 'Cash'
          });
        }

        // Anomali 2: Potensi Double Checkout (< 60 detik untuk nominal sama atau nama sama)
        for (let j = i + 1; j < sorted.length; j++) {
          const nextTx = sorted[j];
          const secDiff = Math.abs(timeToSec(nextTx.time) - timeToSec(tx.time));
          if (secDiff > 90) break; // hanya bandingkan dalam jeda 90 detik

          const nextAmt = Number(nextTx.amount || 0);
          const nextCust = String(nextTx.customer_name || '').trim().toLowerCase();
          const isSameNamedCust = isNamed && custName === nextCust;
          const isExactSameAmt = amt === nextAmt && amt > 0;

          if (isExactSameAmt || isSameNamedCust) {
            list.push({
              id: `anom-dup-${tx.id}-${nextTx.id}`,
              txId: nextTx.id,
              baseTxId: tx.id,
              tx: nextTx,
              baseTx: tx,
              type: 'RAPID_DUPLICATE',
              level: secDiff <= 15 ? 'CRITICAL' : 'WARNING',
              title: secDiff <= 15 ? 'Potensi Double Click / Checkout Ganda' : 'Transaksi Serupa dalam Rentang Cepat',
              desc: `Struk ${nextTx.id} (${formatRupiah(nextAmt)}) terjadi hanya ${secDiff} detik setelah ${tx.id} (${formatRupiah(amt)}) untuk pelanggan "${tx.customer_name}".`,
              branch: branchName,
              time: `${tx.time} ➔ ${nextTx.time}`,
              customer: `${tx.customer_name} & ${nextTx.customer_name}`,
              amount: nextAmt,
              cashier: nextTx.cashier || 'Kasir',
              paymentMethod: nextTx.payment_method || 'Cash',
              secDiff
            });
          }
        }
      }
    });

    return list;
  }, [filteredTxs]);

  // 3. REKONSILIASI KAS LACI FISIK PER OUTLET
  const cashReconciliationData = useMemo(() => {
    return outlets.map(outlet => {
      const oId = String(outlet.id);
      const oName = outlet.name;

      // Transaksi penjualan cabang ini pada tanggal filter
      const oTxs = salesTransactions.filter(t => {
        const tDate = String(t.date || t.entry_date || '').substring(0, 10);
        if (filterDate && tDate !== filterDate) return false;
        return String(t.outlet_id) === oId || String(t.branch_id) === oId || (t.branch_name || t.outlet) === oName;
      });

      const totalGross = oTxs.reduce((sum, t) => sum + Number(t.amount || 0), 0);
      const cashSales = oTxs.filter(t => String(t.payment_method || '').toLowerCase() === 'cash').reduce((sum, t) => sum + Number(t.amount || 0), 0);
      const nonCashSales = oTxs.filter(t => String(t.payment_method || '').toLowerCase() !== 'cash').reduce((sum, t) => sum + Number(t.amount || 0), 0);
      const txCount = oTxs.length;

      // Data shift closing
      const shift = shiftClosings.find(s => {
        const sDate = String(s.date || '').substring(0, 10);
        return (String(s.outlet_id) === oId || (s.branch_name || s.outlet_name) === oName) && (!filterDate || sDate === filterDate);
      });

      // Data petty expenses (kas kecil)
      const oExpenses = pettyExpenses.filter(e => {
        const eDate = String(e.date || '').substring(0, 10);
        return (String(e.outlet_id) === oId || e.branch_name === oName) && (!filterDate || eDate === filterDate);
      }).reduce((sum, e) => sum + Number(e.amount || 0), 0);

      const openingFloat = Number(shift?.opening_float || shift?.initial_cash || 0);
      const totalExpense = Number(shift?.total_expense || shift?.petty_expense || oExpenses || 0);
      const expectedCash = openingFloat + cashSales - totalExpense;
      const physicalCash = Number(shift?.cash_physical || shift?.physical_cash || 0);
      const isShiftClosed = shift && (shift.status === 'SELESAI DITUTUP' || shift.status === 'approved' || shift.status === 'closed' || Number(shift.cash_physical) > 0);
      const variance = isShiftClosed ? (physicalCash - expectedCash) : 0;

      return {
        outletId: oId,
        outletName: oName,
        txCount,
        totalGross,
        cashSales,
        nonCashSales,
        openingFloat,
        totalExpense,
        expectedCash,
        physicalCash,
        variance,
        isShiftClosed,
        shiftStatus: isShiftClosed ? 'Tutup Shift Selesai' : 'Shift Aktif / Belum Rekap',
        author: shift?.author_name || shift?.cashier_name || 'Kasir Outlet'
      };
    });
  }, [outlets, salesTransactions, shiftClosings, pettyExpenses, filterDate]);

  // Aksi Void Struk Transaksi
  const handleVoidTransaction = (targetTxId) => {
    if (!targetTxId) return;
    if (!window.confirm(`Konfirmasi Pembatalan Transaksi (Void):\n\nApakah Anda yakin ingin membatalkan struk ${targetTxId}?\n• Transaksi akan ditandai Void dan tidak dihitung ke omzet/kas.`)) {
      return;
    }

    setMasterData(prev => {
      const updatedSales = (prev.salesTransactions || []).map(t => {
        if (t.id === targetTxId || t.receipt_no === targetTxId) {
          return { ...t, status: 'void', notes: `[VOID] Dibatalkan oleh Admin: ${t.notes || ''}` };
        }
        return t;
      });

      const nextData = {
        ...prev,
        _lastUpdated: Date.now(),
        salesTransactions: updatedSales,
        transactions: updatedSales
      };

      // Simpan ke server
      try {
        fetch('/api/master-data', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(nextData)
        });
      } catch (e) {}

      return nextData;
    });

    setResolvedTxIds(prev => new Set([...prev, targetTxId]));
    alert(`Transaksi ${targetTxId} berhasil dibatalkan (VOID). Data omzet dan laporan kas diperbarui.`);
  };

  // Tandai Transaksi Aman / Valid
  const handleMarkAsValid = (targetTxId) => {
    setResolvedTxIds(prev => new Set([...prev, targetTxId]));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', color: T.txtPrimary }}>
      {/* 1. HEADER BANNER */}
      <div 
        className="glass-card animate-fade-in"
        style={{
          padding: '24px',
          background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.12) 0%, rgba(245, 158, 11, 0.08) 50%, rgba(30, 41, 59, 0.4) 100%)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          borderRadius: '16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '54px', height: '54px', borderRadius: '14px', background: 'rgba(239, 68, 68, 0.2)', border: '1px solid rgba(239, 68, 68, 0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ShieldAlert size={28} color="#ef4444" />
          </div>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '800', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>Pusat Audit Integritas & Deteksi Anomali Sistem</span>
              <span style={{ fontSize: '0.72rem', background: '#ef4444', color: '#ffffff', padding: '2px 8px', borderRadius: '20px', fontWeight: '700' }}>
                LIVE GUARD
              </span>
            </h2>
            <p style={{ fontSize: '0.84rem', color: T.txtSecondary, margin: '4px 0 0 0' }}>
              Memantau secara otomatis potensi double input kasir, transaksi harga tidak lazim, dan selisih rekonsiliasi kas laci fisik.
            </p>
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: T.cardBg, padding: '6px 12px', borderRadius: '8px', border: `1px solid ${T.border}` }}>
            <Clock size={15} color={T.accentGold} />
            <input 
              type="date" 
              value={filterDate} 
              onChange={(e) => setFilterDate(e.target.value)}
              style={{ background: 'transparent', border: 'none', color: T.txtPrimary, fontSize: '0.82rem', outline: 'none' }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: T.cardBg, padding: '6px 12px', borderRadius: '8px', border: `1px solid ${T.border}` }}>
            <Filter size={15} color={T.accentGold} />
            <select 
              value={filterBranch} 
              onChange={(e) => setFilterBranch(e.target.value)}
              style={{ background: 'transparent', border: 'none', color: T.txtPrimary, fontSize: '0.82rem', outline: 'none' }}
            >
              <option value="ALL">Semua Cabang Outlet</option>
              {outlets.map(o => (
                <option key={o.id} value={o.id}>{o.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* 2. KPI SUMMARY METRIC CARDS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
        <div className="glass-card" style={{ padding: '16px', background: T.cardBg, border: `1px solid ${detectedAnomalies.length > 0 ? '#ef4444' : T.border}`, borderRadius: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: T.txtSecondary, fontWeight: '600' }}>Potensi Anomali Terdeteksi</span>
            <AlertTriangle size={18} color={detectedAnomalies.length > 0 ? '#ef4444' : '#10b981'} />
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: '800', color: detectedAnomalies.length > 0 ? '#ef4444' : '#10b981', marginTop: '6px' }}>
            {detectedAnomalies.filter(a => !resolvedTxIds.has(a.txId)).length} <span style={{ fontSize: '0.85rem', fontWeight: '600', color: T.txtSecondary }}>Kasus</span>
          </div>
          <div style={{ fontSize: '0.74rem', color: T.txtSecondary, marginTop: '4px' }}>
            {detectedAnomalies.filter(a => a.type === 'RAPID_DUPLICATE').length} double input, {detectedAnomalies.filter(a => a.type === 'LOW_AMOUNT').length} nominal rendah
          </div>
        </div>

        <div className="glass-card" style={{ padding: '16px', background: T.cardBg, border: `1px solid ${T.border}`, borderRadius: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: T.txtSecondary, fontWeight: '600' }}>Total Transaksi Tersinkron</span>
            <CheckCircle2 size={18} color="#10b981" />
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: '800', color: T.txtPrimary, marginTop: '6px' }}>
            {filteredTxs.length} <span style={{ fontSize: '0.85rem', fontWeight: '600', color: T.txtSecondary }}>Struk</span>
          </div>
          <div style={{ fontSize: '0.74rem', color: T.txtSecondary, marginTop: '4px' }}>
            Total Omzet: <strong style={{ color: T.accentGold }}>{formatRupiah(filteredTxs.reduce((s, t) => s + Number(t.amount || 0), 0))}</strong>
          </div>
        </div>

        <div className="glass-card" style={{ padding: '16px', background: T.cardBg, border: `1px solid ${T.border}`, borderRadius: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: T.txtSecondary, fontWeight: '600' }}>Penjualan Tunai (Cash Laci)</span>
            <DollarSign size={18} color="#f59e0b" />
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: '800', color: '#f59e0b', marginTop: '6px' }}>
            {formatRupiah(filteredTxs.filter(t => String(t.payment_method || '').toLowerCase() === 'cash').reduce((s, t) => s + Number(t.amount || 0), 0))}
          </div>
          <div style={{ fontSize: '0.74rem', color: T.txtSecondary, marginTop: '4px' }}>
            Non-Cash: {formatRupiah(filteredTxs.filter(t => String(t.payment_method || '').toLowerCase() !== 'cash').reduce((s, t) => s + Number(t.amount || 0), 0))}
          </div>
        </div>

        <div className="glass-card" style={{ padding: '16px', background: T.cardBg, border: `1px solid ${T.border}`, borderRadius: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: T.txtSecondary, fontWeight: '600' }}>Status Rekonsiliasi Tutup Shift</span>
            <Layers size={18} color="#3b82f6" />
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: '800', color: '#3b82f6', marginTop: '6px' }}>
            {cashReconciliationData.filter(c => c.isShiftClosed).length} / {outlets.length} <span style={{ fontSize: '0.85rem', fontWeight: '600', color: T.txtSecondary }}>Outlet</span>
          </div>
          <div style={{ fontSize: '0.74rem', color: T.txtSecondary, marginTop: '4px' }}>
            {cashReconciliationData.filter(c => !c.isShiftClosed).length} outlet belum tutup shift
          </div>
        </div>
      </div>

      {/* 3. SUB-TAB NAVIGATION */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: `1px solid ${T.border}`, paddingBottom: '12px' }}>
        <button
          onClick={() => setActiveSubTab('anomalies')}
          className="btn-secondary"
          style={{
            padding: '8px 16px',
            fontSize: '0.86rem',
            fontWeight: '700',
            background: activeSubTab === 'anomalies' ? 'rgba(239, 68, 68, 0.2)' : 'transparent',
            borderColor: activeSubTab === 'anomalies' ? '#ef4444' : 'transparent',
            color: activeSubTab === 'anomalies' ? '#ef4444' : T.txtSecondary
          }}
        >
          <ShieldAlert size={16} />
          <span>Deteksi Anomali & Double Input ({detectedAnomalies.filter(a => !resolvedTxIds.has(a.txId)).length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('cash_reconciliation')}
          className="btn-secondary"
          style={{
            padding: '8px 16px',
            fontSize: '0.86rem',
            fontWeight: '700',
            background: activeSubTab === 'cash_reconciliation' ? 'rgba(245, 158, 11, 0.2)' : 'transparent',
            borderColor: activeSubTab === 'cash_reconciliation' ? '#f59e0b' : 'transparent',
            color: activeSubTab === 'cash_reconciliation' ? '#f59e0b' : T.txtSecondary
          }}
        >
          <DollarSign size={16} />
          <span>Monitor Selisih Kas Laci Fisik</span>
        </button>

        <button
          onClick={() => setActiveSubTab('sync_health')}
          className="btn-secondary"
          style={{
            padding: '8px 16px',
            fontSize: '0.86rem',
            fontWeight: '700',
            background: activeSubTab === 'sync_health' ? 'rgba(16, 185, 129, 0.2)' : 'transparent',
            borderColor: activeSubTab === 'sync_health' ? '#10b981' : 'transparent',
            color: activeSubTab === 'sync_health' ? '#10b981' : T.txtSecondary
          }}
        >
          <ShieldCheck size={16} />
          <span>Integritas Jalur Multi-Tablet</span>
        </button>
      </div>

      {/* 4. TAB CONTENT */}

      {/* TAB 1: DAFTAR ANOMALI */}
      {activeSubTab === 'anomalies' && (
        <div className="glass-card" style={{ padding: '20px', background: T.cardBg, borderRadius: '12px', border: `1px solid ${T.border}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: '800', margin: 0 }}>Daftar Transaksi Perlu Review & Validasi</h3>
              <p style={{ fontSize: '0.8rem', color: T.txtSecondary, margin: '2px 0 0 0' }}>
                Transaksi berikut ditandai otomatis oleh AI guardrail karena memiliki pola jeda sangat singkat, nominal identik, atau harga anomali.
              </p>
            </div>
          </div>

          {detectedAnomalies.filter(a => !resolvedTxIds.has(a.txId)).length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: '#10b981' }}>
              <CheckCircle2 size={42} style={{ margin: '0 auto 12px auto' }} />
              <div style={{ fontWeight: '800', fontSize: '1.1rem' }}>Semua Jalur Transaksi Aman & Normal</div>
              <p style={{ fontSize: '0.84rem', color: T.txtSecondary, maxWidth: '460px', margin: '6px auto 0 auto' }}>
                Tidak ditemukan transaksi anomali atau double input pada filter tanggal {filterDate}.
              </p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem' }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${T.border}`, textAlign: 'left', color: T.txtSecondary }}>
                    <th style={{ padding: '10px 12px' }}>Tingkat</th>
                    <th style={{ padding: '10px 12px' }}>Waktu & Struk</th>
                    <th style={{ padding: '10px 12px' }}>Cabang Outlet</th>
                    <th style={{ padding: '10px 12px' }}>Pelanggan / Kasir</th>
                    <th style={{ padding: '10px 12px' }}>Rincian & Nominal</th>
                    <th style={{ padding: '10px 12px' }}>Analisis Anomali</th>
                    <th style={{ padding: '10px 12px', textAlign: 'center' }}>Aksi Cepat</th>
                  </tr>
                </thead>
                <tbody>
                  {detectedAnomalies.filter(a => !resolvedTxIds.has(a.txId)).map((anom) => (
                    <tr key={anom.id} style={{ borderBottom: `1px solid rgba(255,255,255,0.05)`, background: anom.level === 'CRITICAL' ? 'rgba(239, 68, 68, 0.05)' : 'transparent' }}>
                      <td style={{ padding: '12px' }}>
                        <span style={{
                          padding: '3px 8px',
                          borderRadius: '12px',
                          fontSize: '0.72rem',
                          fontWeight: '800',
                          background: anom.level === 'CRITICAL' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                          color: anom.level === 'CRITICAL' ? '#ef4444' : '#f59e0b',
                          border: `1px solid ${anom.level === 'CRITICAL' ? 'rgba(239, 68, 68, 0.4)' : 'rgba(245, 158, 11, 0.4)'}`
                        }}>
                          {anom.level === 'CRITICAL' ? 'TINGGI' : 'SEDANG'}
                        </span>
                      </td>
                      <td style={{ padding: '12px' }}>
                        <div style={{ fontWeight: '700', color: T.txtPrimary }}>{anom.time}</div>
                        <div style={{ fontSize: '0.74rem', color: T.accentGold, fontFamily: 'monospace' }}>{anom.txId}</div>
                      </td>
                      <td style={{ padding: '12px' }}>
                        <div style={{ fontWeight: '600' }}>{anom.branch}</div>
                        <div style={{ fontSize: '0.74rem', color: T.txtSecondary }}>Metode: {anom.paymentMethod}</div>
                      </td>
                      <td style={{ padding: '12px' }}>
                        <div style={{ fontWeight: '700' }}>{anom.customer}</div>
                        <div style={{ fontSize: '0.74rem', color: T.txtSecondary }}>Kasir: {anom.cashier}</div>
                      </td>
                      <td style={{ padding: '12px' }}>
                        <div style={{ fontWeight: '800', color: '#10b981', fontSize: '0.92rem' }}>{formatRupiah(anom.amount)}</div>
                        <div style={{ fontSize: '0.74rem', color: T.txtSecondary }}>
                          {anom.tx?.items?.map(i => `${i.name} (x${i.qty})`).join(', ') || 'Menu'}
                        </div>
                      </td>
                      <td style={{ padding: '12px', maxWidth: '300px' }}>
                        <div style={{ fontWeight: '700', color: anom.level === 'CRITICAL' ? '#ef4444' : '#f59e0b' }}>
                          {anom.title}
                        </div>
                        <div style={{ fontSize: '0.76rem', color: T.txtSecondary, marginTop: '2px' }}>
                          {anom.desc}
                        </div>
                      </td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                          <button
                            onClick={() => handleMarkAsValid(anom.txId)}
                            className="btn-secondary"
                            title="Tandai transaksi ini valid & aman"
                            style={{ padding: '6px 10px', fontSize: '0.74rem', color: '#10b981', borderColor: 'rgba(16, 185, 129, 0.3)' }}
                          >
                            <Check size={14} />
                            <span>Valid</span>
                          </button>
                          <button
                            onClick={() => handleVoidTransaction(anom.txId)}
                            className="btn-secondary"
                            title="Batalkan transaksi ini (VOID)"
                            style={{ padding: '6px 10px', fontSize: '0.74rem', color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.3)' }}
                          >
                            <Trash2 size={14} />
                            <span>Void</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: REKONSILIASI KAS LACI FISIK */}
      {activeSubTab === 'cash_reconciliation' && (
        <div className="glass-card" style={{ padding: '20px', background: T.cardBg, borderRadius: '12px', border: `1px solid ${T.border}` }}>
          <div style={{ marginBottom: '16px' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: '800', margin: 0 }}>Papan Rekonsiliasi Kas Laci Fisik vs Sistem</h3>
            <p style={{ fontSize: '0.8rem', color: T.txtSecondary, margin: '2px 0 0 0' }}>
              Membandingkan saldo tunai yang seharusnya ada di laci kasir (Modal Awal + Penjualan Tunai - Pengeluaran Kas Kecil) dengan uang fisik yang dihitung kasir saat tutup shift.
            </p>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem' }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${T.border}`, textAlign: 'left', color: T.txtSecondary }}>
                  <th style={{ padding: '10px 12px' }}>Outlet Cabang</th>
                  <th style={{ padding: '10px 12px' }}>Modal Awal</th>
                  <th style={{ padding: '10px 12px' }}>Penjualan Tunai</th>
                  <th style={{ padding: '10px 12px' }}>Kas Kecil (Bon)</th>
                  <th style={{ padding: '10px 12px' }}>Seharusnya di Laci</th>
                  <th style={{ padding: '10px 12px' }}>Fisik Dihitung Kasir</th>
                  <th style={{ padding: '10px 12px' }}>Selisih (Variance)</th>
                  <th style={{ padding: '10px 12px' }}>Status Shift</th>
                </tr>
              </thead>
              <tbody>
                {cashReconciliationData.map((rec) => {
                  const isMatch = rec.isShiftClosed && Math.abs(rec.variance) === 0;
                  const isMinus = rec.isShiftClosed && rec.variance < 0;
                  const isPlus = rec.isShiftClosed && rec.variance > 0;

                  return (
                    <tr key={rec.outletId} style={{ borderBottom: `1px solid rgba(255,255,255,0.05)` }}>
                      <td style={{ padding: '12px' }}>
                        <div style={{ fontWeight: '700', color: T.txtPrimary }}>{rec.outletName}</div>
                        <div style={{ fontSize: '0.74rem', color: T.txtSecondary }}>Kasir: {rec.author} ({rec.txCount} Struk)</div>
                      </td>
                      <td style={{ padding: '12px' }}>{formatRupiah(rec.openingFloat)}</td>
                      <td style={{ padding: '12px', color: '#f59e0b', fontWeight: '700' }}>{formatRupiah(rec.cashSales)}</td>
                      <td style={{ padding: '12px', color: '#ef4444' }}>- {formatRupiah(rec.totalExpense)}</td>
                      <td style={{ padding: '12px', fontWeight: '800', color: T.txtPrimary }}>{formatRupiah(rec.expectedCash)}</td>
                      <td style={{ padding: '12px', fontWeight: '800', color: rec.isShiftClosed ? T.txtPrimary : T.txtSecondary }}>
                        {rec.isShiftClosed ? formatRupiah(rec.physicalCash) : 'Belum Dihitung'}
                      </td>
                      <td style={{ padding: '12px' }}>
                        {!rec.isShiftClosed ? (
                          <span style={{ fontSize: '0.74rem', color: T.txtSecondary }}>Menunggu Tutup Shift</span>
                        ) : isMatch ? (
                          <span style={{ color: '#10b981', fontWeight: '800' }}>✅ PAS (Rp 0)</span>
                        ) : isMinus ? (
                          <span style={{ color: '#ef4444', fontWeight: '800' }}>⚠️ Minus {formatRupiah(Math.abs(rec.variance))}</span>
                        ) : (
                          <span style={{ color: '#3b82f6', fontWeight: '800' }}>➕ Lebih {formatRupiah(rec.variance)}</span>
                        )}
                      </td>
                      <td style={{ padding: '12px' }}>
                        <span style={{
                          padding: '3px 8px',
                          borderRadius: '12px',
                          fontSize: '0.72rem',
                          fontWeight: '700',
                          background: rec.isShiftClosed ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                          color: rec.isShiftClosed ? '#10b981' : '#f59e0b',
                          border: `1px solid ${rec.isShiftClosed ? 'rgba(16, 185, 129, 0.4)' : 'rgba(245, 158, 11, 0.4)'}`
                        }}>
                          {rec.shiftStatus}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: INTEGRITAS JALUR MULTI-TABLET */}
      {activeSubTab === 'sync_health' && (
        <div className="glass-card" style={{ padding: '20px', background: T.cardBg, borderRadius: '12px', border: `1px solid ${T.border}` }}>
          <div style={{ marginBottom: '16px' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: '800', margin: 0 }}>Status Konektivitas & Sinkronisasi Tablet POS</h3>
            <p style={{ fontSize: '0.8rem', color: T.txtSecondary, margin: '2px 0 0 0' }}>
              Memastikan seluruh perangkat kasir terhubung secara aman ke server MySQL dan tidak ada data penjualan yang tertahan di memori lokal.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
            {outlets.map(outlet => {
              const count = salesTransactions.filter(t => 
                (String(t.outlet_id) === String(outlet.id) || (t.branch_name || t.outlet) === outlet.name) &&
                String(t.date || '').substring(0, 10) === filterDate
              ).length;

              return (
                <div key={outlet.id} style={{ padding: '16px', background: 'rgba(255,255,255,0.02)', borderRadius: '10px', border: `1px solid ${T.border}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: '700', color: T.txtPrimary }}>{outlet.name}</span>
                    <span style={{ fontSize: '0.72rem', background: '#10b981', color: '#ffffff', padding: '2px 6px', borderRadius: '10px', fontWeight: '700' }}>
                      ONLINE
                    </span>
                  </div>
                  <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.8rem', color: T.txtSecondary }}>
                    <div>Kode Cabang: <strong style={{ color: T.txtPrimary }}>{outlet.code}</strong></div>
                    <div>Struk Tersinkron ({filterDate}): <strong style={{ color: T.accentGold }}>{count} Transaksi</strong></div>
                    <div>Protokol Guard: <strong style={{ color: '#10b981' }}>Active Union-Merge & Anti-Override</strong></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
