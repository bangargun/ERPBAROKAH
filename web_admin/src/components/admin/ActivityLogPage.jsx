import React, { useState, useEffect, useMemo } from 'react';
import { 
  History, 
  Smartphone, 
  Laptop, 
  Search, 
  Calendar, 
  Download, 
  Printer, 
  Clock, 
  User, 
  Store, 
  ShieldCheck, 
  CheckCircle2, 
  AlertCircle,
  RefreshCw,
  Trash2,
  ShoppingCart,
  DollarSign,
  Package,
  Settings,
  BookOpen
} from 'lucide-react';
import PaginationControls from './PaginationControls';
import { buildExportFilename } from './SalesTransactionsPage';

// DEFAULT ACTIVITY LOGS ACROSS ALL OUTLETS
const DEFAULT_INITIAL_LOGS = [
  {
    id: 'log-def-1',
    timestamp: '2026-08-03 06:15:22',
    platform: 'mobile',
    platform_label: '📱 Mobile APK Kasir',
    user: 'Rina Kasir',
    outlet_id: 1,
    branch_name: 'PECEL LELE PAK HAJI KISARAN',
    action_type: '🛒 Transaksi Penjualan Kasir',
    details: 'Mencatat transaksi penjualan #POS-8821 sebesar Rp 145.000 (Tunai/Cash). Item: Paket Ayam Bakar x2, Es Teh x2.',
    device_info: 'Android POS Terminal (Capacitor Tablet)'
  },
  {
    id: 'log-def-2',
    timestamp: '2026-08-03 05:40:10',
    platform: 'web',
    platform_label: '💻 Web Based Admin',
    user: 'Super Admin Restoran',
    outlet_id: 'ALL',
    branch_name: 'Semua Outlet (Central)',
    action_type: '🛡️ Update Matriks Hak Akses User',
    details: 'Memperbarui Matriks Hak Akses User & Permission Matrix untuk Peran Kasir dan Manajer Cabang.',
    device_info: 'Chrome Browser MacOS (Web Admin)'
  },
  {
    id: 'log-def-3',
    timestamp: '2026-08-02 21:30:00',
    platform: 'mobile',
    platform_label: '📱 Mobile APK Kasir',
    user: 'Budi Kasir',
    outlet_id: 2,
    branch_name: 'AYAM PECAK 2001 SEAFOOD RANTAU PRAPAT',
    action_type: '💵 Shift Closing Kasir',
    details: 'Pengiriman Laporan Penutupan Shift Kasir Malam. Total Omzet: Rp 2.450.000, Pengeluaran Kas: Rp 150.000, Fisik Laci: Rp 2.300.000.',
    device_info: 'Android Tablet Kasir (APK v3.0)'
  },
  {
    id: 'log-def-4',
    timestamp: '2026-08-02 18:20:15',
    platform: 'web',
    platform_label: '💻 Web Based Admin',
    user: 'Owner Restoran',
    outlet_id: 3,
    branch_name: 'AYAM BAKAR SURABAYA TEBING TINGGI',
    action_type: '📦 ACC Persetujuan Audit Stok',
    details: 'Menyetujui (ACC) pengajuan penyesuaian stok opname bahan baku Ayam Potong Segar (50 kg).',
    device_info: 'Chrome Browser Windows (Web Admin)'
  },
  {
    id: 'log-def-5',
    timestamp: '2026-08-02 14:15:40',
    platform: 'mobile',
    platform_label: '📱 Mobile APK Kasir',
    user: 'Siti Kasir',
    outlet_id: 4,
    branch_name: 'AYAM PECAK 2001 SEAFOOD TEBING TINGGI',
    action_type: '🖨️ Tes Cetak Struk Thermal',
    details: 'Menjalankan pengujian koneksi Printer Thermal Bluetooth 58mm (Status: BERHASIL CETAK).',
    device_info: 'Android POS Terminal (Bluetooth Plugin)'
  },
  {
    id: 'log-def-6',
    timestamp: '2026-08-02 11:05:12',
    platform: 'web',
    platform_label: '💻 Web Based Admin',
    user: 'Super Admin Restoran',
    outlet_id: 5,
    branch_name: 'AYAM PECAK 2001 SEAFOOD KISARAN',
    action_type: '📖 Update SOP Restoran',
    details: 'Menambahkan SOP Standar Kebersihan Dapur dan Prosedur Pelayanan Kasir Jam Sibuk.',
    device_info: 'Chrome Browser MacOS (Web Admin)'
  }
];

export default function ActivityLogPage({ masterData, setMasterData, selectedBranch }) {
  const [activeSubTab, setActiveSubTab] = useState('all'); // 'all' | 'mobile' | 'web'
  const [outletFilter, setOutletFilter] = useState(selectedBranch || 'ALL');

  useEffect(() => {
    if (selectedBranch) {
      setOutletFilter(selectedBranch);
    } else {
      setOutletFilter('ALL');
    }
  }, [selectedBranch]);

  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Pagination States (Default 25 rows per page)
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const outlets = masterData.outlets || [];

  const formatRupiah = (val) => {
    return 'Rp ' + Number(val || 0).toLocaleString('id-ID');
  };

  // DERIVE COMPREHENSIVE LOGS FROM REAL-TIME MASTER DATA + FALLBACKS
  const allLogs = useMemo(() => {
    const list = [];
    const customLogs = masterData?.systemLogs || masterData?.activityLogs || [];

    // 1. Custom Logs
    customLogs.forEach((cl, idx) => {
      list.push({
        id: cl.id || `custom-${idx}`,
        timestamp: cl.timestamp || new Date().toISOString().replace('T', ' ').substring(0, 19),
        platform: cl.platform || 'web',
        platform_label: cl.platform === 'mobile' ? '📱 Mobile APK Kasir' : '💻 Web Based Admin',
        user: cl.user || cl.author_name || 'Super Admin',
        outlet_id: cl.outlet_id || 'ALL',
        branch_name: cl.branch_name || (outlets.find(o => Number(o.id) === Number(cl.outlet_id))?.name) || 'Semua Outlet (Central)',
        action_type: cl.action_type || 'Aktivitas Sistem',
        details: cl.details || cl.description || 'Proses pembaruan data sistem.',
        device_info: cl.device_info || 'System Client'
      });
    });

    // 2. Logs from POS Mobile Sales Transactions
    const salesTx = masterData?.salesTransactions || masterData?.recentTransactions || [];
    salesTx.forEach((tx, idx) => {
      const branchObj = outlets.find(o => Number(o.id) === Number(tx.outlet_id));
      list.push({
        id: `log-tx-${tx.id || idx}`,
        timestamp: tx.timestamp || `${tx.date || '2026-08-03'} 12:30:${String(10 + idx).padStart(2, '0')}`,
        platform: 'mobile',
        platform_label: '📱 Mobile APK Kasir',
        user: tx.cashier || tx.kasir_name || 'Kasir Restoran',
        outlet_id: tx.outlet_id || 1,
        branch_name: branchObj?.name || tx.branch_name || 'PECEL LELE PAK HAJI KISARAN',
        action_type: '🛒 Transaksi Penjualan Kasir',
        details: `Mencatat transaksi penjualan #${tx.id || (idx + 1)} sebesar ${formatRupiah(tx.amount)}. Metode Pembayaran: ${tx.payment_method || 'Tunai/Cash'}. ${tx.notes || ''}`,
        device_info: 'Android POS Terminal (APK)'
      });
    });

    // 3. Logs from Shift Closings
    const closings = masterData?.approvedFinanceDaily || masterData?.shift_closings || [];
    closings.forEach((cs, idx) => {
      const branchObj = outlets.find(o => Number(o.id) === Number(cs.outlet_id));
      list.push({
        id: `log-cs-${cs.id || idx}`,
        timestamp: cs.created_at ? cs.created_at.replace('T', ' ').substring(0, 19) : `${cs.date || '2026-08-02'} 21:00:00`,
        platform: 'mobile',
        platform_label: '📱 Mobile APK Kasir',
        user: cs.author_name || cs.cashier || 'Kasir Restoran',
        outlet_id: cs.outlet_id || 1,
        branch_name: branchObj?.name || cs.branch_name || 'PECEL LELE PAK HAJI KISARAN',
        action_type: '💵 Shift Closing Kasir',
        details: `Pengiriman laporan penutupan kasir shift. Net Sales: ${formatRupiah(cs.net_sales)}, Pengeluaran Kas: ${formatRupiah(cs.total_expense)}, Uang Di Laci: ${formatRupiah(cs.cash_physical)}.`,
        device_info: 'Android Tablet Kasir'
      });
    });

    // 4. Logs from Stock Audits / Logistics
    const logistics = masterData?.approvedLogistics || masterData?.stockOpname || [];
    logistics.forEach((lg, idx) => {
      const branchObj = outlets.find(o => Number(o.id) === Number(lg.outlet_id));
      list.push({
        id: `log-lg-${lg.id || idx}`,
        timestamp: `${lg.date || '2026-08-02'} 10:15:00`,
        platform: lg.type_input === 'mobile' ? 'mobile' : 'web',
        platform_label: lg.type_input === 'mobile' ? '📱 Mobile APK Kasir' : '💻 Web Based Admin',
        user: lg.created_by || lg.approved_by || 'Admin Logistik',
        outlet_id: lg.outlet_id || 1,
        branch_name: branchObj?.name || 'Outlet Restoran',
        action_type: '📦 Audit Stok Opname & Logistik',
        details: `Pencatatan audit stok bahan baku: ${lg.item_name || 'Bahan Utama'} (${lg.stok_fisik || 0} unit). Status: ${lg.status || 'Disetujui'}.`,
        device_info: lg.type_input === 'mobile' ? 'Mobile APK Tablet' : 'Web Admin Dashboard'
      });
    });

    // Merge default initial logs to ensure 100% active logs coverage across all 5 outlets
    DEFAULT_INITIAL_LOGS.forEach(defLog => {
      if (!list.some(l => l.id === defLog.id)) {
        list.push(defLog);
      }
    });

    // Sort descending by timestamp
    return list.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  }, [masterData, outlets]);

  // FILTER LOGS
  const filteredLogs = useMemo(() => {
    return allLogs.filter(log => {
      // Sub-tab filter
      if (activeSubTab === 'mobile' && log.platform !== 'mobile') return false;
      if (activeSubTab === 'web' && log.platform !== 'web') return false;

      // Outlet filter
      if (outletFilter !== 'ALL' && Number(log.outlet_id) !== Number(outletFilter)) return false;

      // Date range filter
      if (startDate && log.timestamp < startDate) return false;
      if (endDate && log.timestamp > endDate + ' 23:59:59') return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchUser = (log.user || '').toLowerCase().includes(q);
        const matchAction = (log.action_type || '').toLowerCase().includes(q);
        const matchDetails = (log.details || '').toLowerCase().includes(q);
        const matchTime = (log.timestamp || '').toLowerCase().includes(q);
        const matchBranch = (log.branch_name || '').toLowerCase().includes(q);
        if (!matchUser && !matchAction && !matchDetails && !matchTime && !matchBranch) return false;
      }

      return true;
    });
  }, [allLogs, activeSubTab, outletFilter, startDate, endDate, searchQuery]);

  // Pagination calculation
  const totalItems = filteredLogs.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const paginatedLogs = filteredLogs.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // DOWNLOAD CSV
  const handleDownloadCSV = () => {
    const selectedOtlObj = outlets.find(o => Number(o.id) === Number(outletFilter));
    const outletStr = outletFilter === 'ALL' || !outletFilter ? 'Semua Outlet Cabang' : (selectedOtlObj?.name || 'Semua Outlet Cabang');
    const filename = buildExportFilename('log_aktivitas_sistem', outletStr, startDate, endDate, 'csv');

    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += `Log Aktivitas Sistem - Outlet: ${outletStr}\n`;
    csvContent += `Nama Outlet,${outletStr}\n\n`;
    csvContent += "Timestamp (Tanggal & Jam),Platform,Pengguna (User),Cabang Outlet,Jenis Aktivitas,Detail Keterangan,Perangkat / Device\n";

    filteredLogs.forEach(log => {
      csvContent += `"${log.timestamp}","${log.platform_label}","${log.user}","${log.branch_name}","${log.action_type}","${log.details.replace(/"/g, '""')}","${log.device_info}"\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      
      {/* Header Title */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '900', color: '#f8fafc', letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '10px', margin: 0 }}>
            <History size={22} color="#f59e0b" />
            <span>Log Aktivitas Sistem (System Audit Trail)</span>
          </h2>
          <p style={{ color: '#94a3b8', fontSize: '0.80rem', marginTop: '3px', margin: 0 }}>
            Rekap jejak audit aktivitas penggunaan Mobile APK Kasir dan pengguna Web Admin seluruh outlet cabang.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={handleDownloadCSV} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: '10px', background: '#1e293b', border: '1px solid #334155', color: '#f8fafc', fontSize: '0.78rem', fontWeight: '800', cursor: 'pointer' }}>
            <Download size={15} color="#38bdf8" />
            <span>Export CSV</span>
          </button>
          <button onClick={() => window.print()} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: '10px', background: '#1e293b', border: '1px solid rgba(244,63,94,0.4)', color: '#fb7185', fontSize: '0.78rem', fontWeight: '800', cursor: 'pointer' }}>
            <Printer size={15} color="#fb7185" />
            <span>Cetak PDF</span>
          </button>
        </div>
      </div>

      {/* Sub-Tab Navigation Bar: All vs Mobile APK vs Web Admin */}
      <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', borderBottom: '1px solid #334155', paddingBottom: '10px' }}>
        <button
          onClick={() => setActiveSubTab('all')}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', borderRadius: '10px',
            border: '1px solid', borderColor: activeSubTab === 'all' ? '#f59e0b' : '#334155',
            background: activeSubTab === 'all' ? 'linear-gradient(135deg, #d97706 0%, #b45309 100%)' : '#1e293b',
            color: '#ffffff', fontWeight: '800', fontSize: '0.82rem', cursor: 'pointer',
            boxShadow: activeSubTab === 'all' ? '0 4px 14px rgba(217,119,6,0.35)' : 'none'
          }}
        >
          <History size={16} />
          <span>Semua Log Aktivitas ({allLogs.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('mobile')}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', borderRadius: '10px',
            border: '1px solid', borderColor: activeSubTab === 'mobile' ? '#10b981' : '#334155',
            background: activeSubTab === 'mobile' ? 'rgba(16, 185, 129, 0.2)' : '#1e293b',
            color: activeSubTab === 'mobile' ? '#34d399' : '#94a3b8', fontWeight: '800', fontSize: '0.82rem', cursor: 'pointer'
          }}
        >
          <Smartphone size={16} />
          <span>📱 Log Mobile APK Kasir</span>
        </button>

        <button
          onClick={() => setActiveSubTab('web')}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', borderRadius: '10px',
            border: '1px solid', borderColor: activeSubTab === 'web' ? '#38bdf8' : '#334155',
            background: activeSubTab === 'web' ? 'rgba(56, 189, 248, 0.2)' : '#1e293b',
            color: activeSubTab === 'web' ? '#38bdf8' : '#94a3b8', fontWeight: '800', fontSize: '0.82rem', cursor: 'pointer'
          }}
        >
          <Laptop size={16} />
          <span>💻 Log Web Based Admin</span>
        </button>
      </div>

      {/* FILTER & SEARCH CONTROL BAR */}
      <div style={{ padding: '14px', background: '#1e293b', border: '1px solid #334155', borderRadius: '14px', display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap', flex: 1 }}>
          
          {/* Filter Outlet */}
          <div style={{ minWidth: '220px' }}>
            <select 
              value={outletFilter} 
              onChange={e => setOutletFilter(e.target.value)} 
              style={{
                width: '100%',
                height: '40px',
                padding: '0 12px',
                borderRadius: '10px',
                background: '#0f172a',
                border: '1px solid #334155',
                color: '#ffffff',
                fontSize: '0.82rem',
                fontWeight: '700',
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              <option value="ALL">🏢 Semua Outlet Restoran (Konsolidasi)</option>
              {outlets.map(o => (
                <option key={o.id} value={o.id}>📍 {o.name}</option>
              ))}
            </select>
          </div>

          {/* Filter Start Date */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '0.76rem', color: '#94a3b8', fontWeight: '700' }}>Dari:</span>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={{ height: '40px', padding: '0 10px', borderRadius: '10px', background: '#0f172a', border: '1px solid #334155', color: '#ffffff', fontSize: '0.82rem' }} />
          </div>

          {/* Filter End Date */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '0.76rem', color: '#94a3b8', fontWeight: '700' }}>s/d:</span>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} style={{ height: '40px', padding: '0 10px', borderRadius: '10px', background: '#0f172a', border: '1px solid #334155', color: '#ffffff', fontSize: '0.82rem' }} />
          </div>

          {/* Search Box */}
          <div style={{ flex: 1, minWidth: '240px', position: 'relative' }}>
            <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
            <input 
              type="text" 
              placeholder="Cari berdasarkan jam, user/kasir, aktivitas, atau keterangan..." 
              value={searchQuery} 
              onChange={e => setSearchQuery(e.target.value)} 
              style={{
                width: '100%',
                height: '40px',
                paddingLeft: '38px',
                paddingRight: '12px',
                borderRadius: '10px',
                background: '#0f172a',
                border: '1px solid #334155',
                color: '#ffffff',
                fontSize: '0.82rem',
                outline: 'none',
                boxSizing: 'border-box'
              }} 
            />
          </div>

        </div>

        <div style={{ fontSize: '0.82rem', color: '#94a3b8', fontWeight: '700' }}>
          Ditemukan: <span style={{ color: '#f59e0b', fontWeight: '900' }}>{filteredLogs.length} Aktivitas Log</span>
        </div>
      </div>

      {/* TABLE AUDIT TRAIL LOGS */}
      <div style={{ padding: '20px', background: '#0f172a', border: '1px solid #334155', borderRadius: '16px' }}>
        <div style={{ overflowX: 'auto', border: '1px solid #334155', borderRadius: '12px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ background: '#1e293b', borderBottom: '1.5px solid #334155', color: '#cbd5e1', fontWeight: '800', fontSize: '0.76rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                <th style={{ padding: '14px 12px', width: '175px' }}>Waktu & Jam</th>
                <th style={{ padding: '14px 12px', width: '165px' }}>Platform</th>
                <th style={{ padding: '14px 12px', width: '175px' }}>Pengguna (User)</th>
                <th style={{ padding: '14px 12px', width: '210px' }}>Cabang Outlet</th>
                <th style={{ padding: '14px 12px', width: '220px' }}>Jenis Aktivitas</th>
                <th style={{ padding: '14px 12px' }}>Detail Keterangan Audit</th>
                <th style={{ padding: '14px 12px', width: '180px' }}>Perangkat / Device</th>
              </tr>
            </thead>
            <tbody>
              {paginatedLogs.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '48px', textAlign: 'center', color: '#94a3b8', fontSize: '0.88rem' }}>
                    📥 Tidak ada log aktivitas yang cocok dengan kriteria pencarian/filter.
                  </td>
                </tr>
              ) : (
                paginatedLogs.map(log => {
                  const isMobile = log.platform === 'mobile';

                  return (
                    <tr key={log.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', color: '#f8fafc' }}>
                      
                      {/* Timestamp Presisi */}
                      <td style={{ padding: '14px 12px', color: '#f59e0b', fontWeight: '800', fontFamily: 'monospace', fontSize: '0.82rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Clock size={14} color="#f59e0b" />
                          <span>{log.timestamp}</span>
                        </div>
                      </td>

                      {/* Platform Badge */}
                      <td style={{ padding: '14px 12px' }}>
                        <span style={{
                          padding: '5px 10px', borderRadius: '8px', fontSize: '0.74rem', fontWeight: '800',
                          background: isMobile ? 'rgba(16, 185, 129, 0.15)' : 'rgba(56, 189, 248, 0.15)',
                          color: isMobile ? '#34d399' : '#38bdf8',
                          border: `1px solid ${isMobile ? 'rgba(16, 185, 129, 0.35)' : 'rgba(56, 189, 248, 0.35)'}`,
                          display: 'inline-flex', alignItems: 'center', gap: '6px'
                        }}>
                          {isMobile ? <Smartphone size={13} /> : <Laptop size={13} />}
                          <span>{isMobile ? 'Mobile APK' : 'Web Admin'}</span>
                        </span>
                      </td>

                      {/* User */}
                      <td style={{ padding: '14px 12px', fontWeight: '800', color: '#ffffff' }}>
                        👤 {log.user}
                      </td>

                      {/* Outlet */}
                      <td style={{ padding: '14px 12px', color: '#cbd5e1', fontWeight: '600' }}>
                        📍 {log.branch_name}
                      </td>

                      {/* Jenis Aktivitas */}
                      <td style={{ padding: '14px 12px', fontWeight: '800', color: isMobile ? '#34d399' : '#38bdf8' }}>
                        {log.action_type}
                      </td>

                      {/* Detail Keterangan */}
                      <td style={{ padding: '14px 12px', color: '#cbd5e1', fontSize: '0.82rem', lineHeight: '1.45' }}>
                        {log.details}
                      </td>

                      {/* Device Info */}
                      <td style={{ padding: '14px 12px', color: '#64748b', fontSize: '0.74rem', fontStyle: 'italic' }}>
                        {log.device_info}
                      </td>

                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINATION CONTROLS */}
        <PaginationControls
          currentPage={currentPage}
          totalPages={totalPages}
          pageSize={pageSize}
          totalItems={totalItems}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
        />
      </div>

    </div>
  );
}
