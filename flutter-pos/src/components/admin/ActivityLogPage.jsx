import React, { useState, useEffect } from 'react';
import { 
  History, 
  Smartphone, 
  Laptop, 
  Search, 
  Calendar, 
  Filter, 
  Download, 
  Printer, 
  Clock, 
  User, 
  Store, 
  ShieldCheck, 
  FileText, 
  CheckCircle2, 
  AlertCircle,
  RefreshCw,
  Trash2
} from 'lucide-react';
import PaginationControls from './PaginationControls';
import { buildExportFilename } from './SalesTransactionsPage';

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

  // INITIAL SAMPLE & REAL LOGS DERIVED FROM MASTER DATA
  const deriveLogs = () => {
    const customLogs = masterData.systemLogs || [];

    // 1. Logs from Mobile APK Kasir (Shift Closings & POS Sales)
    const mobileLogs = [];
    (masterData.approvedFinanceDaily || []).forEach(f => {
      mobileLogs.push({
        id: `log-mob-${f.id}`,
        timestamp: `${f.date || '2026-07-22'} ${f.created_at ? f.created_at.substring(11, 19) : '09:15:30'}`,
        platform: 'mobile',
        platform_label: '📱 Mobile APK Kasir',
        user: f.author_name || f.cashier || 'Rina Kasir',
        outlet_id: f.outlet_id,
        branch_name: f.branch_name || 'Restoran Senopati',
        action_type: 'Input Shift Closing Kasir',
        details: `Mengirimkan laporan penutupan kasir shift. Net Sales: ${formatRupiah(f.net_sales)}, Total Pengeluaran: ${formatRupiah(f.total_expense)}, Uang Di Laci: ${formatRupiah(f.cash_physical)}.`,
        device_info: 'Android POS Terminal (APK v2.4)'
      });
    });

    (masterData.stockOpname || []).forEach(op => {
      if (op.type_input === 'mobile' || op.type_input === 'kasir') {
        mobileLogs.push({
          id: `log-mob-op-${op.id}`,
          timestamp: `${op.date || '2026-07-22'} 10:20:15`,
          platform: 'mobile',
          platform_label: '📱 Mobile APK Kasir',
          user: op.created_by || 'Adi Kasir',
          outlet_id: op.outlet_id,
          branch_name: (outlets.find(o => o.id === op.outlet_id)?.name) || 'Restoran Kemang',
          action_type: 'Audit Stok Opname Mobile',
          details: `Menginput hasil audit stok fisik untuk item: ${op.item_name} (${op.stok_fisik || 0} unit).`,
          device_info: 'Mobile APK Kasir Tablet'
        });
      }
    });

    // 2. Logs from Web Based Admin Desktop
    const webLogs = [];
    (masterData.approvedFinanceDaily || []).filter(f => f.status === 'ok' || f.status === 'approved').forEach(f => {
      webLogs.push({
        id: `log-web-acc-${f.id}`,
        timestamp: `${f.date || '2026-07-22'} 11:45:00`,
        platform: 'web',
        platform_label: '💻 Web Based Admin',
        user: f.approved_by || 'Argun Admin (Super Admin)',
        outlet_id: f.outlet_id,
        branch_name: f.branch_name || 'Restoran Senopati',
        action_type: 'ACC Persetujuan Laporan Kasir',
        details: `Menyetujui (ACC) laporan keuangan kasir ${f.report_no || f.id} dan mendistribusikan pos pengeluaran ke Laporan Keuangan.`,
        device_info: 'Chrome Browser MacOS (Web Admin)'
      });
    });

    (masterData.priceComparison || []).forEach(prc => {
      webLogs.push({
        id: `log-web-prc-${prc.id}`,
        timestamp: `${prc.date || '2026-07-22'} 14:10:05`,
        platform: 'web',
        platform_label: '💻 Web Based Admin',
        user: 'Argun Admin',
        outlet_id: 1,
        branch_name: 'Konsolidasi Cabang',
        action_type: 'Input Perbandingan Harga Stok',
        details: `Mencatat perbandingan harga bahan baku master data: ${prc.item_name} antar cabang restoran.`,
        device_info: 'Chrome Browser MacOS (Web Admin)'
      });
    });

    return [...customLogs, ...mobileLogs, ...webLogs].sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  };

  const allLogs = deriveLogs();

  // FILTER LOGS
  const filteredLogs = allLogs.filter(log => {
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }} className="animate-fade-in">
      
      {/* Header Title */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '1.20rem', fontWeight: '900', color: '#f8fafc', letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
            <History size={20} color="#6366f1" />
            <span>Log Aktivitas Sistem (System Audit Trail)</span>
          </h2>
          <p style={{ color: '#94a3b8', fontSize: '0.78rem', marginTop: '2px', margin: 0 }}>
            Rekap jejak audit aktivitas penggunaan Mobile APK Kasir dan pengguna Web Admin.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={handleDownloadCSV} className="btn-secondary" style={{ display: 'flex', gap: '6px', padding: '6px 12px', fontSize: '0.78rem' }}>
            <Download size={14} />
            <span>Export CSV</span>
          </button>
          <button onClick={() => window.print()} className="btn-secondary" style={{ display: 'flex', gap: '6px', padding: '6px 12px', fontSize: '0.78rem', borderColor: '#fb7185', color: '#fb7185' }}>
            <Printer size={14} />
            <span>Cetak PDF</span>
          </button>
        </div>
      </div>

      {/* Sub-Tab Navigation Bar: All vs Mobile APK vs Web Admin */}
      <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', borderBottom: '1px solid #334155', paddingBottom: '8px' }}>
        <button
          onClick={() => setActiveSubTab('all')}
          style={{
            display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '8px',
            border: '1px solid', borderColor: activeSubTab === 'all' ? '#6366f1' : '#334155',
            background: activeSubTab === 'all' ? 'rgba(99, 102, 241, 0.2)' : '#1e293b',
            color: activeSubTab === 'all' ? '#818cf8' : '#94a3b8', fontWeight: '800', fontSize: '0.78rem', cursor: 'pointer'
          }}
        >
          <History size={14} />
          <span>Semua Log Aktivitas ({allLogs.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('mobile')}
          style={{
            display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '8px',
            border: '1px solid', borderColor: activeSubTab === 'mobile' ? '#10b981' : '#334155',
            background: activeSubTab === 'mobile' ? 'rgba(16, 185, 129, 0.2)' : '#1e293b',
            color: activeSubTab === 'mobile' ? '#34d399' : '#94a3b8', fontWeight: '800', fontSize: '0.78rem', cursor: 'pointer'
          }}
        >
          <Smartphone size={14} />
          <span>📱 Log Mobile APK</span>
        </button>

        <button
          onClick={() => setActiveSubTab('web')}
          style={{
            display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '8px',
            border: '1px solid', borderColor: activeSubTab === 'web' ? '#38bdf8' : '#334155',
            background: activeSubTab === 'web' ? 'rgba(56, 189, 248, 0.2)' : '#1e293b',
            color: activeSubTab === 'web' ? '#38bdf8' : '#94a3b8', fontWeight: '800', fontSize: '0.78rem', cursor: 'pointer'
          }}
        >
          <Laptop size={14} />
          <span>💻 Log Web Admin</span>
        </button>
      </div>

      {/* FILTER & SEARCH CONTROL BAR */}
      <div className="glass-card" style={{ padding: '12px', background: '#1e293b', border: '1px solid #334155', borderRadius: '10px', display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap', flex: 1 }}>
          
          {/* Filter Outlet */}
          <div style={{ minWidth: '200px' }}>
            <select 
              value={outletFilter} 
              onChange={e => setOutletFilter(e.target.value)} 
              className="form-select"
              style={{ height: '38px', fontSize: '0.82rem' }}
            >
              <option value="ALL">🏢 Semua Outlet Restoran</option>
              {outlets.map(o => (
                <option key={o.id} value={o.id}>{o.name}</option>
              ))}
            </select>
          </div>

          {/* Filter Start Date */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: '700' }}>Dari:</span>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="form-input" style={{ height: '38px', fontSize: '0.8rem', width: '145px' }} />
          </div>

          {/* Filter End Date */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: '700' }}>s/d:</span>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="form-input" style={{ height: '38px', fontSize: '0.8rem', width: '145px' }} />
          </div>

          {/* Search Box */}
          <div style={{ flex: 1, minWidth: '220px', position: 'relative' }}>
            <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
            <input 
              type="text" 
              placeholder="Cari berdasarkan jam, user/kasir, aktivitas, atau keterangan..." 
              value={searchQuery} 
              onChange={e => setSearchQuery(e.target.value)} 
              className="form-input" 
              style={{ paddingLeft: '36px', height: '38px', fontSize: '0.82rem' }} 
            />
          </div>

        </div>

        <div style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: '700' }}>
          Ditemukan: <span style={{ color: '#818cf8', fontWeight: '900' }}>{filteredLogs.length} Baris Log</span>
        </div>
      </div>

      {/* TABLE AUDIT TRAIL LOGS */}
      <div className="glass-card" style={{ padding: '24px', background: '#0f172a', border: '1px solid #334155', borderRadius: '12px' }}>
        <div style={{ overflowX: 'auto', border: '1px solid #334155', borderRadius: '10px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ background: '#1e293b', borderBottom: '1px solid #334155', color: '#cbd5e1', fontWeight: '800', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                <th style={{ padding: '12px 10px', width: '165px' }}>Waktu & Jam</th>
                <th style={{ padding: '12px 10px', width: '160px' }}>Platform</th>
                <th style={{ padding: '12px 10px', width: '160px' }}>Pengguna (User)</th>
                <th style={{ padding: '12px 10px', width: '180px' }}>Cabang Outlet</th>
                <th style={{ padding: '12px 10px', width: '220px' }}>Jenis Aktivitas</th>
                <th style={{ padding: '12px 10px' }}>Detail Keterangan Audit</th>
                <th style={{ padding: '12px 10px', width: '180px' }}>Perangkat / Device</th>
              </tr>
            </thead>
            <tbody>
              {paginatedLogs.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                    Tidak ada log aktivitas yang cocok dengan kriteria pencarian/filter.
                  </td>
                </tr>
              ) : (
                paginatedLogs.map(log => {
                  const isMobile = log.platform === 'mobile';

                  return (
                    <tr key={log.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', color: '#f8fafc' }}>
                      
                      {/* Timestamp Presisi */}
                      <td style={{ padding: '12px 10px', color: '#818cf8', fontWeight: '700', fontFamily: 'monospace', fontSize: '0.8rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Clock size={13} color="#818cf8" />
                          <span>{log.timestamp}</span>
                        </div>
                      </td>

                      {/* Platform Badge */}
                      <td style={{ padding: '12px 10px' }}>
                        <span style={{
                          padding: '4px 10px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: '800',
                          background: isMobile ? 'rgba(16, 185, 129, 0.15)' : 'rgba(56, 189, 248, 0.15)',
                          color: isMobile ? '#34d399' : '#38bdf8',
                          border: `1px solid ${isMobile ? 'rgba(16, 185, 129, 0.3)' : 'rgba(56, 189, 248, 0.3)'}`,
                          display: 'inline-flex', alignItems: 'center', gap: '4px'
                        }}>
                          {isMobile ? <Smartphone size={12} /> : <Laptop size={12} />}
                          <span>{isMobile ? 'Mobile APK' : 'Web Admin'}</span>
                        </span>
                      </td>

                      {/* User */}
                      <td style={{ padding: '12px 10px', fontWeight: '700', color: '#f8fafc' }}>
                        👤 {log.user}
                      </td>

                      {/* Outlet */}
                      <td style={{ padding: '12px 10px', color: '#cbd5e1' }}>
                        🏢 {log.branch_name}
                      </td>

                      {/* Jenis Aktivitas */}
                      <td style={{ padding: '12px 10px', fontWeight: '800', color: isMobile ? '#34d399' : '#38bdf8' }}>
                        {log.action_type}
                      </td>

                      {/* Detail Keterangan */}
                      <td style={{ padding: '12px 10px', color: '#cbd5e1', fontSize: '0.82rem', lineHeight: '1.4' }}>
                        {log.details}
                      </td>

                      {/* Device Info */}
                      <td style={{ padding: '12px 10px', color: '#64748b', fontSize: '0.74rem', fontStyle: 'italic' }}>
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
