import React, { useState } from 'react';
import { 
  ClipboardCheck, 
  Search, 
  Filter, 
  CheckCircle2, 
  Clock, 
  CheckSquare, 
  Edit3, 
  Trash2, 
  Plus, 
  X, 
  Save, 
  FileText, 
  Building2, 
  AlertCircle,
  Eye,
  FileSpreadsheet
} from 'lucide-react';
import PaginationControls from './PaginationControls';

export default function ApprovalCenter({ masterData, setMasterData, selectedBranch }) {
  // FILTER STATES
  const [searchQuery, setSearchQuery] = useState('');
  const [outletFilter, setOutletFilter] = useState(selectedBranch || 'ALL');
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'ACC' | 'Approved' | 'Done'
  const [submitterFilter, setSubmitterFilter] = useState('ALL'); // 'ALL' | 'POS Kasir' | 'Admin'

  // PAGINATION STATES (25 rows per page)
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // MODAL STATES
  const [detailModalItem, setDetailModalItem] = useState(null);
  const [editModalItem, setEditModalItem] = useState(null);
  const [deleteConfirmItem, setDeleteConfirmItem] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);

  // EDIT FORM STATE
  const [editForm, setEditForm] = useState({
    net_sales: 0,
    cash_sales: 0,
    non_cash_sales: 0,
    cogs_expense: 0,
    total_expense: 0,
    reason_for_edit: ''
  });

  // ADD FORM STATE (ADMIN MANUAL ENTRY)
  const [addForm, setAddForm] = useState({
    outlet_id: selectedBranch || (masterData?.outlets?.[0]?.id || 1),
    date: new Date().toISOString().split('T')[0],
    report_no: `LAP-ADM-${Date.now().toString().slice(-6)}`,
    net_sales: '',
    cash_sales: '',
    non_cash_sales: '',
    cogs_expense: '',
    total_expense: '',
    notes: ''
  });

  const outletsList = masterData?.outlets || [];

  const getOutletName = (id) => {
    const found = outletsList.find(o => Number(o.id) === Number(id));
    return found ? found.name : `Outlet #${id || 'Pusat'}`;
  };

  const formatRupiah = (val) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val || 0);
  };

  const formatDateIndo = (dateStr) => {
    if (!dateStr) return '-';
    const str = String(dateStr).substring(0, 16).replace('T', ' ');
    return str;
  };

  // KONSOLIDASI SELURUH LAPORAN HARIAN DARI POS KASIR & WEB ADMIN
  const rawReports = [
    ...(masterData?.approvedFinanceDaily || []),
    ...(masterData?.shiftClosings || []),
    ...(masterData?.closedShifts || []),
    ...(masterData?.dailyReports || [])
  ];

  // Map deduplikasi berdasarkan ID / Report No
  const reportsMap = new Map();
  rawReports.forEach(r => {
    if (r && (r.id != null || r.report_no)) {
      const key = String(r.report_no || r.id);
      
      // Tentukan Pengaju
      const isFromAdmin = r.submitter_type === 'Admin' || r.created_by === 'Admin' || String(r.report_no || '').startsWith('LAP-ADM');
      const submitterText = isFromAdmin ? 'Admin' : 'POS Kasir';

      // Tentukan Status Sesuai Aturan User Request:
      // - Dari POS Kasir: ACC saat baru terima -> diklik berubah Approved -> jika sudah dibaca berubah Done
      // - Dari Admin: Langsung Done
      let currentStatus = r.status || r.approval_status;
      if (isFromAdmin) {
        currentStatus = 'Done';
      } else {
        if (!currentStatus || currentStatus === 'pending' || currentStatus === 'acc_pending_send' || currentStatus === 'ACC') {
          currentStatus = 'ACC';
        } else if (currentStatus === 'approved' || currentStatus === 'Approved' || currentStatus === 'disetujui') {
          currentStatus = 'Approved';
        } else if (currentStatus === 'done' || currentStatus === 'Done' || currentStatus === 'read') {
          currentStatus = 'Done';
        }
      }

      const formattedItem = {
        id: r.id || key,
        report_no: r.report_no || `LAP-${r.id}`,
        outlet_id: r.outlet_id || r.branch_id || 1,
        outlet_name: r.branch_name || getOutletName(r.outlet_id || r.branch_id),
        date: r.date || r.created_at || new Date().toISOString(),
        cashier_name: r.cashier_name || r.cashier || (isFromAdmin ? 'Admin' : 'Kasir'),
        submitter_type: submitterText,
        net_sales: Number(r.net_sales || r.total_sales || r.actual_cash || 0),
        cash_sales: Number(r.cash_sales || (r.net_sales - (r.non_cash_sales || 0)) || 0),
        non_cash_sales: Number(r.non_cash_sales || 0),
        cogs_expense: Number(r.cogs_expense || 0),
        total_expense: Number(r.total_expense || 0),
        status: currentStatus,
        notes: r.notes || r.closing_notes || '-',
        edit_history: r.edit_history || [],
        expenses_breakdown: r.expenses_breakdown || []
      };

      if (!reportsMap.has(key)) {
        reportsMap.set(key, formattedItem);
      }
    }
  });

  const allReportsList = Array.from(reportsMap.values());

  // FILTERING DATA LAPORAN HARIAN
  const filteredReports = allReportsList.filter(item => {
    // Outlet Filter
    if (outletFilter !== 'ALL' && Number(item.outlet_id) !== Number(outletFilter)) return false;
    
    // Status Filter
    if (statusFilter !== 'ALL' && item.status !== statusFilter) return false;

    // Submitter Filter
    if (submitterFilter !== 'ALL' && item.submitter_type !== submitterFilter) return false;

    // Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchNo = item.report_no.toLowerCase().includes(q);
      const matchCashier = item.cashier_name.toLowerCase().includes(q);
      const matchNotes = item.notes.toLowerCase().includes(q);
      const matchOutlet = item.outlet_name.toLowerCase().includes(q);
      if (!matchNo && !matchCashier && !matchNotes && !matchOutlet) return false;
    }

    return true;
  }).sort((a, b) => new Date(b.date) - new Date(a.date));

  // PAGINATION CALCULATIONS
  const totalItems = filteredReports.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedReports = filteredReports.slice(startIndex, startIndex + pageSize);

  // UPDATE STATUS HANDLER (ACC -> Approved -> Done)
  const handleUpdateStatus = (item, nextStatus) => {
    const targetId = String(item.id);
    const targetReportNo = String(item.report_no);

    const mapFn = r => {
      if (!r) return r;
      const rId = String(r.id || r.report_no || '');
      const rNo = String(r.report_no || '');
      if (rId === targetId || rNo === targetReportNo) {
        return { ...r, status: nextStatus, approval_status: nextStatus };
      }
      return r;
    };

    setMasterData(prev => ({
      ...prev,
      approvedFinanceDaily: (prev.approvedFinanceDaily || []).map(mapFn),
      shiftClosings: (prev.shiftClosings || []).map(mapFn),
      closedShifts: (prev.closedShifts || []).map(mapFn),
      dailyReports: (prev.dailyReports || []).map(mapFn)
    }));
  };

  // OPEN EDIT MODAL
  const handleOpenEdit = (item) => {
    setEditModalItem(item);
    setEditForm({
      net_sales: item.net_sales,
      cash_sales: item.cash_sales,
      non_cash_sales: item.non_cash_sales,
      cogs_expense: item.cogs_expense,
      total_expense: item.total_expense,
      reason_for_edit: ''
    });
  };

  // SAVE EDIT REPORT HANDLER (WITH MANDATORY EDIT REASON)
  const handleSaveEditReport = (e) => {
    e.preventDefault();
    if (!editForm.reason_for_edit.trim()) {
      alert('⚠️ WAJIB mengisi Keterangan Perubahan / Alasan Edit sebelum menyimpan!');
      return;
    }

    const targetId = String(editModalItem.id);
    const targetReportNo = String(editModalItem.report_no);

    const editLog = {
      timestamp: new Date().toLocaleString('id-ID'),
      edited_by: 'Super Admin',
      reason: editForm.reason_for_edit.trim(),
      old_net_sales: editModalItem.net_sales,
      new_net_sales: Number(editForm.net_sales),
      old_expense: editModalItem.total_expense,
      new_expense: Number(editForm.total_expense)
    };

    const mapFn = r => {
      if (!r) return r;
      const rId = String(r.id || r.report_no || '');
      const rNo = String(r.report_no || '');
      if (rId === targetId || rNo === targetReportNo) {
        return {
          ...r,
          net_sales: Number(editForm.net_sales),
          cash_sales: Number(editForm.cash_sales),
          non_cash_sales: Number(editForm.non_cash_sales),
          cogs_expense: Number(editForm.cogs_expense),
          total_expense: Number(editForm.total_expense),
          edit_history: [...(r.edit_history || []), editLog]
        };
      }
      return r;
    };

    setMasterData(prev => ({
      ...prev,
      approvedFinanceDaily: (prev.approvedFinanceDaily || []).map(mapFn),
      shiftClosings: (prev.shiftClosings || []).map(mapFn),
      closedShifts: (prev.closedShifts || []).map(mapFn),
      dailyReports: (prev.dailyReports || []).map(mapFn)
    }));

    setEditModalItem(null);
  };

  // SAVE NEW MANUAL REPORT HANDLER (BY ADMIN -> STATUS AUTO DONE)
  const handleSaveAddManualReport = (e) => {
    e.preventDefault();
    if (!addForm.net_sales) {
      alert('⚠️ Silakan isi total omzet penjualan!');
      return;
    }

    const newReport = {
      id: `LAP-ADM-${Date.now()}`,
      report_no: addForm.report_no,
      outlet_id: Number(addForm.outlet_id),
      branch_name: getOutletName(addForm.outlet_id),
      date: addForm.date,
      cashier_name: 'Admin',
      submitter_type: 'Admin',
      net_sales: Number(addForm.net_sales || 0),
      cash_sales: Number(addForm.cash_sales || 0),
      non_cash_sales: Number(addForm.non_cash_sales || 0),
      cogs_expense: Number(addForm.cogs_expense || 0),
      total_expense: Number(addForm.total_expense || 0),
      status: 'Done', // Direct Status for Admin
      notes: addForm.notes || 'Input Manual oleh Admin'
    };

    setMasterData(prev => ({
      ...prev,
      approvedFinanceDaily: [newReport, ...(prev.approvedFinanceDaily || [])],
      shiftClosings: [newReport, ...(prev.shiftClosings || [])]
    }));

    setShowAddModal(false);
  };

  // CONFIRM DELETE HANDLER
  const handleConfirmDelete = () => {
    if (!deleteConfirmItem) return;
    const targetId = String(deleteConfirmItem.id);
    const targetReportNo = String(deleteConfirmItem.report_no);

    const filterFn = r => {
      if (!r) return false;
      const rId = String(r.id || r.report_no || '');
      const rNo = String(r.report_no || '');
      return rId !== targetId && rNo !== targetReportNo;
    };

    setMasterData(prev => ({
      ...prev,
      approvedFinanceDaily: (prev.approvedFinanceDaily || []).filter(filterFn),
      shiftClosings: (prev.shiftClosings || []).filter(filterFn),
      closedShifts: (prev.closedShifts || []).filter(filterFn),
      dailyReports: (prev.dailyReports || []).filter(filterFn)
    }));

    setDeleteConfirmItem(null);
  };

  // EXPORT EXCEL HANDLER
  const handleExportCSV = () => {
    let csv = "TANGGAL,NO LAPORAN,PENGAJU,OUTLET,NET SALES (IDR),TOTAL EXPENSE (IDR),STATUS,CATATAN\n";
    filteredReports.forEach(r => {
      csv += `"${formatDateIndo(r.date)}","${r.report_no}","${r.submitter_type}","${r.outlet_name}",${r.net_sales},${r.total_expense},"${r.status}","${r.notes.replace(/"/g, '""')}"\n`;
    });

    const blob = new Blob(["\ufeff" + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Laporan_Harian_Outlet_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', color: '#f8fafc' }} className="animate-fade-in">
      
      {/* HEADER BAR */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '900', color: '#f8fafc', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <ClipboardCheck size={26} color="#38bdf8" />
            <span>Persetujuan Manajemen (Persetujuan Laporan Harian)</span>
          </h2>
          <p style={{ color: '#94a3b8', fontSize: '0.84rem', marginTop: '4px', margin: 0 }}>
            Persetujuan laporan keuangan shift closing dari POS Kasir Outlet &amp; Input Laporan Manual Admin Central.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={handleExportCSV}
            style={{ padding: '9px 16px', background: '#1e293b', border: '1px solid #334155', borderRadius: '10px', color: '#38bdf8', fontWeight: '800', fontSize: '0.82rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <FileSpreadsheet size={16} />
            <span>Export Excel CSV</span>
          </button>

          <button
            onClick={() => setShowAddModal(true)}
            style={{ padding: '9px 16px', background: 'linear-gradient(135deg, #0284c7 0%, #38bdf8 100%)', border: 'none', borderRadius: '10px', color: '#0f172a', fontWeight: '900', fontSize: '0.82rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', boxShadow: '0 4px 12px rgba(56, 189, 248, 0.3)' }}
          >
            <Plus size={16} />
            <span>+ Tambah Laporan Harian (Admin)</span>
          </button>
        </div>
      </div>

      {/* FILTER & SEARCH BAR */}
      <div style={{ background: '#0f172a', padding: '16px 20px', borderRadius: '14px', border: '1px solid #334155', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: '260px' }}>
          <div style={{ position: 'relative', width: '100%', maxWidth: '320px' }}>
            <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              placeholder="Cari No. Laporan, Kasir, Outlet..."
              style={{ width: '100%', padding: '9px 12px 9px 36px', background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#f8fafc', fontSize: '0.82rem' }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          {/* OUTLET FILTER */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <label style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: '700' }}>Outlet:</label>
            <select
              value={outletFilter}
              onChange={e => { setOutletFilter(e.target.value); setCurrentPage(1); }}
              style={{ padding: '8px 12px', background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#38bdf8', fontWeight: '800', fontSize: '0.82rem', cursor: 'pointer' }}
            >
              <option value="ALL">Semua Outlet (Central)</option>
              {outletsList.map(o => (
                <option key={o.id} value={o.id}>{o.name}</option>
              ))}
            </select>
          </div>

          {/* PENGAJU FILTER */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <label style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: '700' }}>Pengaju:</label>
            <select
              value={submitterFilter}
              onChange={e => { setSubmitterFilter(e.target.value); setCurrentPage(1); }}
              style={{ padding: '8px 12px', background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#38bdf8', fontWeight: '800', fontSize: '0.82rem', cursor: 'pointer' }}
            >
              <option value="ALL">Semua Pengaju</option>
              <option value="POS Kasir">POS Kasir</option>
              <option value="Admin">Admin</option>
            </select>
          </div>

          {/* STATUS FILTER */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <label style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: '700' }}>Status:</label>
            <select
              value={statusFilter}
              onChange={e => { setStatusFilter(e.target.value); setCurrentPage(1); }}
              style={{ padding: '8px 12px', background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#38bdf8', fontWeight: '800', fontSize: '0.82rem', cursor: 'pointer' }}
            >
              <option value="ALL">Semua Status</option>
              <option value="ACC">ACC (Menunggu Persetujuan)</option>
              <option value="Approved">Approved (Disetujui)</option>
              <option value="Done">Done (Selesai / Dibaca)</option>
            </select>
          </div>
        </div>
      </div>

      {/* MAIN TABLE: 5 REQUIRED COLUMNS */}
      <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '16px', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.86rem' }}>
            <thead>
              <tr style={{ background: '#0f172a', borderBottom: '2px solid #334155', color: '#94a3b8', textAlign: 'left' }}>
                <th style={{ padding: '14px 16px', fontWeight: '800', width: '180px' }}>1. TANGGAL</th>
                <th style={{ padding: '14px 16px', fontWeight: '800' }}>2. NO LAPORAN</th>
                <th style={{ padding: '14px 16px', fontWeight: '800', width: '140px' }}>3. PENGAJU</th>
                <th style={{ padding: '14px 16px', fontWeight: '800', width: '160px' }}>4. STATUS</th>
                <th style={{ padding: '14px 16px', fontWeight: '800', textAlign: 'right', width: '160px' }}>5. AKSI</th>
              </tr>
            </thead>
            <tbody>
              {paginatedReports.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: '40px', textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem' }}>
                    📭 Belum ada laporan harian yang sesuai dengan filter.
                  </td>
                </tr>
              ) : (
                paginatedReports.map(item => {
                  return (
                    <tr key={item.id} style={{ borderBottom: '1px solid #334155', transition: 'background 0.15s' }} className="hover:bg-slate-800/50">
                      
                      {/* 1. TANGGAL */}
                      <td style={{ padding: '14px 16px', color: '#f8fafc', fontWeight: '600' }}>
                        <div>{formatDateIndo(item.date)}</div>
                        <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '2px' }}>📍 {item.outlet_name}</div>
                      </td>

                      {/* 2. NO LAPORAN (CLICKABLE) */}
                      <td style={{ padding: '14px 16px' }}>
                        <button
                          onClick={() => setDetailModalItem(item)}
                          style={{ background: 'none', border: 'none', padding: 0, color: '#38bdf8', fontWeight: '900', fontSize: '0.88rem', cursor: 'pointer', textDecoration: 'underline', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '6px' }}
                          title="Klik untuk membuka rincian laporan POS"
                        >
                          <span>{item.report_no}</span>
                          <Eye size={14} color="#38bdf8" />
                        </button>
                        <div style={{ fontSize: '0.74rem', color: '#94a3b8', marginTop: '2px' }}>
                          Omzet: {formatRupiah(item.net_sales)} &bull; Expense: {formatRupiah(item.total_expense)}
                        </div>
                      </td>

                      {/* 3. PENGAJU */}
                      <td style={{ padding: '14px 16px' }}>
                        <span style={{
                          padding: '4px 10px',
                          borderRadius: '6px',
                          fontSize: '0.78rem',
                          fontWeight: '800',
                          background: item.submitter_type === 'Admin' ? 'rgba(56, 189, 248, 0.15)' : 'rgba(99, 102, 241, 0.15)',
                          color: item.submitter_type === 'Admin' ? '#38bdf8' : '#818cf8',
                          border: item.submitter_type === 'Admin' ? '1px solid #38bdf8' : '1px solid #6366f1'
                        }}>
                          {item.submitter_type === 'Admin' ? '👤 Admin' : '📱 POS Kasir'}
                        </span>
                        <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '4px' }}>{item.cashier_name}</div>
                      </td>

                      {/* 4. STATUS */}
                      <td style={{ padding: '14px 16px' }}>
                        {item.status === 'ACC' && (
                          <button
                            onClick={() => handleUpdateStatus(item, 'Approved')}
                            style={{
                              padding: '6px 12px',
                              borderRadius: '8px',
                              background: 'rgba(245, 158, 11, 0.2)',
                              border: '1px solid #f59e0b',
                              color: '#fbbf24',
                              fontWeight: '900',
                              fontSize: '0.78rem',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px'
                            }}
                            title="Klik untuk menyetujui (Approve) laporan ini"
                          >
                            <Clock size={14} />
                            <span>ACC (Klik Setuju)</span>
                          </button>
                        )}

                        {item.status === 'Approved' && (
                          <button
                            onClick={() => handleUpdateStatus(item, 'Done')}
                            style={{
                              padding: '6px 12px',
                              borderRadius: '8px',
                              background: 'rgba(34, 197, 94, 0.2)',
                              border: '1px solid #22c55e',
                              color: '#4ade80',
                              fontWeight: '900',
                              fontSize: '0.78rem',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px'
                            }}
                            title="Klik untuk mengubah ke status Selesai (Done)"
                          >
                            <CheckCircle2 size={14} />
                            <span>Approved (Setuju)</span>
                          </button>
                        )}

                        {item.status === 'Done' && (
                          <span style={{
                            padding: '6px 12px',
                            borderRadius: '8px',
                            background: 'rgba(56, 189, 248, 0.15)',
                            border: '1px solid #38bdf8',
                            color: '#38bdf8',
                            fontWeight: '900',
                            fontSize: '0.78rem',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px'
                          }}>
                            <CheckSquare size={14} />
                            <span>Done (Selesai)</span>
                          </span>
                        )}
                      </td>

                      {/* 5. AKSI (EDIT & HAPUS) */}
                      <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px' }}>
                          <button
                            onClick={() => handleOpenEdit(item)}
                            style={{ padding: '6px 10px', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', color: '#38bdf8', fontWeight: '800', fontSize: '0.78rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                            title="Edit Laporan (Wajib Isi Alasan Edit)"
                          >
                            <Edit3 size={14} /> Edit
                          </button>

                          <button
                            onClick={() => setDeleteConfirmItem(item)}
                            style={{ padding: '6px 10px', background: '#0f172a', border: '1px solid rgba(244, 63, 94, 0.4)', borderRadius: '6px', color: '#fb7185', fontWeight: '800', fontSize: '0.78rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                            title="Hapus Laporan Harian"
                          >
                            <Trash2 size={14} /> Hapus
                          </button>
                        </div>
                      </td>

                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINATION FOOTER */}
        <PaginationControls
          currentPage={currentPage}
          totalPages={totalPages}
          pageSize={pageSize}
          totalItems={totalItems}
          onPageChange={setCurrentPage}
          onPageSizeChange={(sz) => { setPageSize(sz); setCurrentPage(1); }}
        />
      </div>

      {/* 📄 MODAL DETAIL LAPORAN (KLIK NO LAPORAN) */}
      {detailModalItem && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.85)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '20px' }}>
          <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '16px', width: '100%', maxWidth: '640px', maxHeight: '90vh', overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #334155', paddingBottom: '14px' }}>
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: '900', color: '#38bdf8', margin: 0 }}>
                  📄 Rincian Laporan: {detailModalItem.report_no}
                </h3>
                <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '2px' }}>
                  {formatDateIndo(detailModalItem.date)} &bull; {detailModalItem.outlet_name}
                </div>
              </div>
              <button onClick={() => setDetailModalItem(null)} style={{ background: '#334155', border: 'none', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#cbd5e1', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div style={{ background: '#0f172a', padding: '12px 14px', borderRadius: '10px', border: '1px solid #334155' }}>
                <div style={{ fontSize: '0.74rem', color: '#94a3b8', fontWeight: '700' }}>PENGAJU</div>
                <div style={{ fontSize: '0.95rem', fontWeight: '800', color: '#f8fafc', marginTop: '4px' }}>{detailModalItem.submitter_type} ({detailModalItem.cashier_name})</div>
              </div>

              <div style={{ background: '#0f172a', padding: '12px 14px', borderRadius: '10px', border: '1px solid #334155' }}>
                <div style={{ fontSize: '0.74rem', color: '#94a3b8', fontWeight: '700' }}>STATUS LAPORAN</div>
                <div style={{ fontSize: '0.95rem', fontWeight: '800', color: '#38bdf8', marginTop: '4px' }}>{detailModalItem.status}</div>
              </div>
            </div>

            <div style={{ background: '#0f172a', padding: '16px', borderRadius: '12px', border: '1px solid #334155', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: '800', color: '#f8fafc', borderBottom: '1px dashed #334155', paddingBottom: '8px' }}>
                💵 Ringkasan Transaksi Keuangan Shift:
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.84rem' }}>
                <span style={{ color: '#94a3b8' }}>Penjualan Tunai (Cash):</span>
                <span style={{ color: '#f8fafc', fontWeight: '800' }}>{formatRupiah(detailModalItem.cash_sales)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.84rem' }}>
                <span style={{ color: '#94a3b8' }}>Penjualan Non-Tunai (QRIS/EDC):</span>
                <span style={{ color: '#f8fafc', fontWeight: '800' }}>{formatRupiah(detailModalItem.non_cash_sales)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem', fontWeight: '800', borderTop: '1px dashed #334155', paddingTop: '8px' }}>
                <span style={{ color: '#38bdf8' }}>TOTAL NET SALES:</span>
                <span style={{ color: '#38bdf8' }}>{formatRupiah(detailModalItem.net_sales)}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.84rem', marginTop: '8px' }}>
                <span style={{ color: '#94a3b8' }}>Total Pembelian HPP Bahan:</span>
                <span style={{ color: '#fb7185', fontWeight: '800' }}>{formatRupiah(detailModalItem.cogs_expense)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.84rem' }}>
                <span style={{ color: '#94a3b8' }}>Total Beban Kasir / Pengeluaran:</span>
                <span style={{ color: '#fb7185', fontWeight: '800' }}>{formatRupiah(detailModalItem.total_expense)}</span>
              </div>
            </div>

            {/* RIWAYAT EDIT KETERANGAN / ALASAN PERUBAHAN */}
            {detailModalItem.edit_history && detailModalItem.edit_history.length > 0 && (
              <div style={{ background: 'rgba(56, 189, 248, 0.08)', padding: '14px', borderRadius: '12px', border: '1px solid #38bdf8' }}>
                <div style={{ fontSize: '0.82rem', fontWeight: '800', color: '#38bdf8', marginBottom: '8px' }}>
                  📜 Riwayat Perubahan &amp; Keterangan Alasan Edit:
                </div>
                {detailModalItem.edit_history.map((log, idx) => (
                  <div key={idx} style={{ fontSize: '0.78rem', color: '#f8fafc', marginBottom: '6px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '4px' }}>
                    <div><strong>[{log.timestamp}] Edit oleh {log.edited_by}:</strong></div>
                    <div style={{ color: '#94a3b8', marginTop: '2px' }}>&quot;{log.reason}&quot;</div>
                  </div>
                ))}
              </div>
            )}

            <div style={{ textAlign: 'right' }}>
              <button onClick={() => setDetailModalItem(null)} style={{ padding: '8px 18px', background: '#334155', border: 'none', borderRadius: '8px', color: '#f8fafc', fontWeight: '800', cursor: 'pointer' }}>
                Tutup Window
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ✏️ MODAL EDIT LAPORAN HARIAN (WAJIB KETERANGAN PERUBAHAN) */}
      {editModalItem && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.85)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '20px' }}>
          <form onSubmit={handleSaveEditReport} style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '16px', width: '100%', maxWidth: '580px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #334155', paddingBottom: '12px' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: '900', color: '#38bdf8', margin: 0 }}>
                ✏️ Edit Laporan Harian: {editModalItem.report_no}
              </h3>
              <button type="button" onClick={() => setEditModalItem(null)} style={{ background: '#334155', border: 'none', borderRadius: '50%', width: '30px', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#cbd5e1', cursor: 'pointer' }}>
                <X size={16} />
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '0.74rem', color: '#94a3b8', fontWeight: '700' }}>Net Sales (Omzet Penjualan):</label>
                <input
                  type="number"
                  value={editForm.net_sales}
                  onChange={e => setEditForm({ ...editForm, net_sales: e.target.value })}
                  style={{ padding: '8px 12px', background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', color: '#f8fafc', fontSize: '0.82rem' }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '0.74rem', color: '#94a3b8', fontWeight: '700' }}>Penjualan Tunai (Cash):</label>
                <input
                  type="number"
                  value={editForm.cash_sales}
                  onChange={e => setEditForm({ ...editForm, cash_sales: e.target.value })}
                  style={{ padding: '8px 12px', background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', color: '#f8fafc', fontSize: '0.82rem' }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '0.74rem', color: '#94a3b8', fontWeight: '700' }}>Penjualan Non-Tunai (QRIS/EDC):</label>
                <input
                  type="number"
                  value={editForm.non_cash_sales}
                  onChange={e => setEditForm({ ...editForm, non_cash_sales: e.target.value })}
                  style={{ padding: '8px 12px', background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', color: '#f8fafc', fontSize: '0.82rem' }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '0.74rem', color: '#94a3b8', fontWeight: '700' }}>Pembelian HPP Bahan Baku:</label>
                <input
                  type="number"
                  value={editForm.cogs_expense}
                  onChange={e => setEditForm({ ...editForm, cogs_expense: e.target.value })}
                  style={{ padding: '8px 12px', background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', color: '#f8fafc', fontSize: '0.82rem' }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', gridColumn: 'span 2' }}>
                <label style={{ fontSize: '0.74rem', color: '#94a3b8', fontWeight: '700' }}>Total Beban Kasir / Pengeluaran:</label>
                <input
                  type="number"
                  value={editForm.total_expense}
                  onChange={e => setEditForm({ ...editForm, total_expense: e.target.value })}
                  style={{ padding: '8px 12px', background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', color: '#f8fafc', fontSize: '0.82rem' }}
                />
              </div>
            </div>

            {/* WAJIB KETERANGAN PERUBAHAN */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', background: 'rgba(239, 68, 68, 0.1)', padding: '12px', borderRadius: '10px', border: '1px solid #ef4444' }}>
              <label style={{ fontSize: '0.78rem', color: '#f87171', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <AlertCircle size={14} />
                <span>Keterangan Perubahan / Alasan Edit (WAJIB DIIISI):</span>
              </label>
              <textarea
                required
                rows={3}
                value={editForm.reason_for_edit}
                onChange={e => setEditForm({ ...editForm, reason_for_edit: e.target.value })}
                placeholder="Tuliskan alasan mengapa laporan ini diubah secara jelas..."
                style={{ padding: '8px 12px', background: '#0f172a', border: '1px solid #ef4444', borderRadius: '8px', color: '#f8fafc', fontSize: '0.82rem', resize: 'none' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
              <button type="button" onClick={() => setEditModalItem(null)} style={{ padding: '8px 16px', background: '#334155', border: 'none', borderRadius: '8px', color: '#f8fafc', fontWeight: '800', cursor: 'pointer' }}>
                Batal
              </button>
              <button type="submit" disabled={!editForm.reason_for_edit.trim()} style={{ padding: '8px 18px', background: editForm.reason_for_edit.trim() ? 'linear-gradient(135deg, #0284c7 0%, #38bdf8 100%)' : '#475569', border: 'none', borderRadius: '8px', color: '#0f172a', fontWeight: '900', cursor: editForm.reason_for_edit.trim() ? 'pointer' : 'not-allowed' }}>
                Simpan Perubahan
              </button>
            </div>

          </form>
        </div>
      )}

      {/* ➕ MODAL TAMBAH LAPORAN HARIAN MANUAL (ADMIN -> AUTO STATUS DONE) */}
      {showAddModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.85)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '20px' }}>
          <form onSubmit={handleSaveAddManualReport} style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '16px', width: '100%', maxWidth: '580px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #334155', paddingBottom: '12px' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: '900', color: '#38bdf8', margin: 0 }}>
                ➕ Input Laporan Harian Manual (Admin Central)
              </h3>
              <button type="button" onClick={() => setShowAddModal(false)} style={{ background: '#334155', border: 'none', borderRadius: '50%', width: '30px', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#cbd5e1', cursor: 'pointer' }}>
                <X size={16} />
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '0.74rem', color: '#94a3b8', fontWeight: '700' }}>Target Outlet:</label>
                <select
                  value={addForm.outlet_id}
                  onChange={e => setAddForm({ ...addForm, outlet_id: e.target.value })}
                  style={{ padding: '8px 12px', background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', color: '#f8fafc', fontSize: '0.82rem' }}
                >
                  {outletsList.map(o => (
                    <option key={o.id} value={o.id}>{o.name}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '0.74rem', color: '#94a3b8', fontWeight: '700' }}>Tanggal Laporan:</label>
                <input
                  type="date"
                  value={addForm.date}
                  onChange={e => setAddForm({ ...addForm, date: e.target.value })}
                  style={{ padding: '8px 12px', background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', color: '#f8fafc', fontSize: '0.82rem' }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', gridColumn: 'span 2' }}>
                <label style={{ fontSize: '0.74rem', color: '#94a3b8', fontWeight: '700' }}>No Laporan (Auto/Custom):</label>
                <input
                  type="text"
                  value={addForm.report_no}
                  onChange={e => setAddForm({ ...addForm, report_no: e.target.value })}
                  style={{ padding: '8px 12px', background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', color: '#f8fafc', fontSize: '0.82rem' }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '0.74rem', color: '#94a3b8', fontWeight: '700' }}>Net Sales (Omzet):</label>
                <input
                  type="number"
                  placeholder="0"
                  value={addForm.net_sales}
                  onChange={e => setAddForm({ ...addForm, net_sales: e.target.value })}
                  style={{ padding: '8px 12px', background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', color: '#f8fafc', fontSize: '0.82rem' }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '0.74rem', color: '#94a3b8', fontWeight: '700' }}>Penjualan Tunai (Cash):</label>
                <input
                  type="number"
                  placeholder="0"
                  value={addForm.cash_sales}
                  onChange={e => setAddForm({ ...addForm, cash_sales: e.target.value })}
                  style={{ padding: '8px 12px', background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', color: '#f8fafc', fontSize: '0.82rem' }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '0.74rem', color: '#94a3b8', fontWeight: '700' }}>Penjualan Non-Tunai (QRIS/EDC):</label>
                <input
                  type="number"
                  placeholder="0"
                  value={addForm.non_cash_sales}
                  onChange={e => setAddForm({ ...addForm, non_cash_sales: e.target.value })}
                  style={{ padding: '8px 12px', background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', color: '#f8fafc', fontSize: '0.82rem' }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '0.74rem', color: '#94a3b8', fontWeight: '700' }}>Total Pembelian HPP:</label>
                <input
                  type="number"
                  placeholder="0"
                  value={addForm.cogs_expense}
                  onChange={e => setAddForm({ ...addForm, cogs_expense: e.target.value })}
                  style={{ padding: '8px 12px', background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', color: '#f8fafc', fontSize: '0.82rem' }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', gridColumn: 'span 2' }}>
                <label style={{ fontSize: '0.74rem', color: '#94a3b8', fontWeight: '700' }}>Total Beban / Pengeluaran Kasir:</label>
                <input
                  type="number"
                  placeholder="0"
                  value={addForm.total_expense}
                  onChange={e => setAddForm({ ...addForm, total_expense: e.target.value })}
                  style={{ padding: '8px 12px', background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', color: '#f8fafc', fontSize: '0.82rem' }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', gridColumn: 'span 2' }}>
                <label style={{ fontSize: '0.74rem', color: '#94a3b8', fontWeight: '700' }}>Catatan / Keterangan Admin:</label>
                <textarea
                  rows={2}
                  value={addForm.notes}
                  onChange={e => setAddForm({ ...addForm, notes: e.target.value })}
                  placeholder="Keterangan opsional laporan manual..."
                  style={{ padding: '8px 12px', background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', color: '#f8fafc', fontSize: '0.82rem', resize: 'none' }}
                />
              </div>
            </div>

            <div style={{ fontSize: '0.76rem', color: '#38bdf8', fontWeight: '800' }}>
              💡 Status laporan yang di-input manual oleh Admin akan langsung diset ke &quot;Done&quot; (Selesai).
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button type="button" onClick={() => setShowAddModal(false)} style={{ padding: '8px 16px', background: '#334155', border: 'none', borderRadius: '8px', color: '#f8fafc', fontWeight: '800', cursor: 'pointer' }}>
                Batal
              </button>
              <button type="submit" style={{ padding: '8px 18px', background: 'linear-gradient(135deg, #0284c7 0%, #38bdf8 100%)', border: 'none', borderRadius: '8px', color: '#0f172a', fontWeight: '900', cursor: 'pointer' }}>
                Simpan Laporan Admin
              </button>
            </div>

          </form>
        </div>
      )}

      {/* 🗑️ MODAL CONFIRM DELETE */}
      {deleteConfirmItem && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.85)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '20px' }}>
          <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '16px', width: '100%', maxWidth: '440px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', textAlign: 'center' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto' }}>
              <Trash2 size={24} color="#f87171" />
            </div>

            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: '900', color: '#f8fafc', margin: '0 0 6px 0' }}>
                Hapus Laporan Harian?
              </h3>
              <p style={{ fontSize: '0.82rem', color: '#94a3b8', margin: 0 }}>
                Apakah Anda yakin ingin menghapus Laporan <strong>{deleteConfirmItem.report_no}</strong>? Tindakan ini tidak dapat dibatalkan.
              </p>
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', marginTop: '6px' }}>
              <button onClick={() => setDeleteConfirmItem(null)} style={{ padding: '8px 20px', background: '#334155', border: 'none', borderRadius: '8px', color: '#f8fafc', fontWeight: '800', cursor: 'pointer' }}>
                Batal
              </button>
              <button onClick={handleConfirmDelete} style={{ padding: '8px 20px', background: 'linear-gradient(135deg, #e11d48 0%, #f43f5e 100%)', border: 'none', borderRadius: '8px', color: '#ffffff', fontWeight: '900', cursor: 'pointer' }}>
                Hapus Laporan
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
