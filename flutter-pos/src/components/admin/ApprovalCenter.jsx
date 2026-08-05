import React, { useState, useEffect } from 'react';
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
  FileSpreadsheet,
  Calendar,
  Calculator,
  DollarSign,
  TrendingUp,
  Receipt,
  Layers,
  Inbox,
  Minus
} from 'lucide-react';
import PaginationControls from './PaginationControls';

export default function ApprovalCenter({ masterData, setMasterData, selectedBranch }) {
  // FILTER STATES
  const [searchQuery, setSearchQuery] = useState('');
  const [outletFilter, setOutletFilter] = useState(selectedBranch || 'ALL');
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'ACC' | 'Approved' | 'Done'
  const [submitterFilter, setSubmitterFilter] = useState('ALL'); // 'ALL' | 'POS Kasir' | 'Admin'

  // DATE RANGE FILTER STATES
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

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

  // MASTER DATA LISTS FOR AUTO-SUGGESTION
  const outletsList = masterData?.outlets || [];
  const ingredientsList = masterData?.ingredients || [];
  const expenseMasterList = masterData?.expenseMaster || [];

  // MASTER DATA AUTO-SUGGESTION COMBINED OPTIONS
  const expenseSuggestions = [
    ...ingredientsList.map(i => ({
      name: i.name,
      category_type: 'HPP Bahan Baku',
      unit: i.unit || 'kg',
      price: i.cost || i.price || 0
    })),
    ...expenseMasterList.map(e => ({
      name: e.name || e.title,
      category_type: e.category || e.type || 'Beban Operasional',
      unit: e.unit || 'bulan',
      price: e.price || e.amount || 0
    }))
  ];

  // ADD FORM STATE (COMPREHENSIVE MANUAL ENTRY BY ADMIN)
  const [addForm, setAddForm] = useState({
    outlet_id: selectedBranch || (masterData?.outlets?.[0]?.id || 1),
    date: new Date().toISOString().split('T')[0],
    report_no: `LAP-ADM-${Date.now().toString().slice(-6)}`,
    cashier_name: 'Admin',

    // BAGIAN 1: PENJUALAN & DISKON
    cash_sales: 0,
    non_cash_sales: 0,
    sales_discount: 0,

    // BAGIAN 2: MULTI-ROW PENGELUARAN
    expense_rows: [
      { id: 1, item_name: '', category_type: 'HPP Bahan Baku', qty: 1, unit: 'kg', price_per_unit: 0, subtotal: 0 }
    ],

    // BAGIAN 5: PEMBAYARAN PENGAMBILAN MODAL
    modal_saat_ini: 0,
    modal_seharusnya: 0,
    modal_ideal: 0,
    modal_refund_rows: [
      { id: 1, date: new Date().toISOString().split('T')[0], amount_returned: 0, notes: 'Pengembalian Modal Initial' }
    ],

    notes: ''
  });

  // AUTO CALCULATE POS SALES FOR SELECTED DATE & OUTLET UP TO 23:59:59
  useEffect(() => {
    if (!showAddModal) return;

    const salesList = masterData?.salesTransactions || [];
    const targetDate = addForm.date;
    const targetOutlet = Number(addForm.outlet_id);

    let calcCash = 0;
    let calcNonCash = 0;
    let calcDiscount = 0;

    salesList.forEach(tx => {
      const txDate = String(tx.date || tx.created_at || '').substring(0, 10);
      const txOutlet = Number(tx.outlet_id || tx.branch_id || 1);

      if (txDate === targetDate && (targetOutlet === 0 || txOutlet === targetOutlet)) {
        const amount = Number(tx.amount || tx.total || 0);
        const method = String(tx.payment_method || tx.method || '').toLowerCase();
        const disc = Number(tx.discount || tx.discount_amount || 0);

        if (method.includes('cash') || method.includes('tunai')) {
          calcCash += amount;
        } else {
          calcNonCash += amount;
        }
        calcDiscount += disc;
      }
    });

    setAddForm(prev => ({
      ...prev,
      cash_sales: calcCash,
      non_cash_sales: calcNonCash,
      sales_discount: calcDiscount
    }));
  }, [addForm.date, addForm.outlet_id, showAddModal, masterData?.salesTransactions]);

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

  // FORMULA KALKULASI BAGIAN PENJUALAN, LABA KOTOR & UANG DI LACI
  const computedTotalIncome = Math.max(0, (Number(addForm.cash_sales || 0) + Number(addForm.non_cash_sales || 0)) - Number(addForm.sales_discount || 0));
  
  const computedTotalExpense = (addForm.expense_rows || []).reduce((sum, r) => sum + (Number(r.subtotal) || 0), 0);
  
  const computedGrossProfit = computedTotalIncome - computedTotalExpense;

  // Uang di laci = Laba Kotor - Penjualan Non Cash - Diskon Penjualan
  const computedCashInDrawer = computedGrossProfit - Number(addForm.non_cash_sales || 0) - Number(addForm.sales_discount || 0);

  // FORMULA PENGAMBILAN MODAL: Modal seharusnya - (Modal saat ini + Total dikembalikan)
  const computedTotalModalReturned = (addForm.modal_refund_rows || []).reduce((sum, r) => sum + (Number(r.amount_returned) || 0), 0);
  const computedModalDebtRemaining = Number(addForm.modal_seharusnya || addForm.modal_ideal || 0) - (Number(addForm.modal_saat_ini || 0) + computedTotalModalReturned);

  // HELPER UNTUK FILTER DELETED REPORT TOMBSTONES
  const deletedReportIdsSet = new Set([
    ...(masterData?.deletedReportIds || []).map(x => String(x)),
    ...(masterData?.deletedLogisticsIds || []).map(x => String(x))
  ]);

  const isDeletedReport = (r) => {
    if (!r) return true;
    const rId = String(r.id !== undefined && r.id !== null ? r.id : '');
    const rNo = String(r.report_no || r.receiptNo || '');
    return (rId && deletedReportIdsSet.has(rId)) || (rNo && deletedReportIdsSet.has(rNo));
  };

  // KONSOLIDASI SELURUH LAPORAN HARIAN DARI POS KASIR & WEB ADMIN
  const rawReports = [
    ...(masterData?.approvedFinanceDaily || []),
    ...(masterData?.shiftClosings || []),
    ...(masterData?.shift_closings || []),
    ...(masterData?.closedShifts || []),
    ...(masterData?.dailyReports || []),
    ...(masterData?.manualEntryRecords || [])
  ].filter(r => !isDeletedReport(r));

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
        net_sales: Number(r.net_sales || r.total_sales || r.total_income || 0),
        cash_sales: Number(r.cash_sales || (r.net_sales - (r.non_cash_sales || 0)) || 0),
        non_cash_sales: Number(r.non_cash_sales || 0),
        sales_discount: Number(r.sales_discount || 0),
        cogs_expense: Number(r.cogs_expense || 0),
        total_expense: Number(r.total_expense || 0),
        gross_profit: Number(r.gross_profit || (r.net_sales - r.total_expense)),
        cash_in_drawer: Number(r.cash_in_drawer || 0),
        modal_ideal: Number(r.modal_ideal || 0),
        modal_debt_remaining: Number(r.modal_debt_remaining || 0),
        modal_refund_rows: r.modal_refund_rows || [],
        status: currentStatus,
        notes: r.notes || r.closing_notes || '-',
        edit_history: r.edit_history || [],
        expense_rows: r.expense_rows || []
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

    // Date Range Filter (Tanggal Mulai - Tanggal Selesai)
    if (startDate) {
      const itemDateStr = String(item.date).substring(0, 10);
      if (itemDateStr < startDate) return false;
    }
    if (endDate) {
      const itemDateStr = String(item.date).substring(0, 10);
      if (itemDateStr > endDate) return false;
    }

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

  const getApiUrl = (pathStr) => `https://mris-api.barokahgroupindonesia.tech${pathStr}`;

  // UPDATE STATUS HANDLER (ACC -> Approved -> Done)
  const handleUpdateStatus = (item, nextStatus) => {
    const targetId = String(item.id || item.report_no || '');
    const targetReportNo = String(item.report_no || '');

    const mapFn = r => {
      if (!r) return r;
      const rId = String(r.id || r.report_no || '');
      const rNo = String(r.report_no || '');
      if (rId === targetId || rNo === targetReportNo) {
        return { ...r, status: nextStatus, approval_status: nextStatus };
      }
      return r;
    };

    setMasterData(prev => {
      const now = Date.now();
      const newMaster = {
        ...prev,
        _lastUpdated: now,
        approvedFinanceDaily: (prev.approvedFinanceDaily || []).map(mapFn),
        shiftClosings: (prev.shiftClosings || []).map(mapFn),
        shift_closings: (prev.shift_closings || []).map(mapFn),
        closedShifts: (prev.closedShifts || []).map(mapFn),
        dailyReports: (prev.dailyReports || []).map(mapFn),
        manualEntryRecords: (prev.manualEntryRecords || []).map(mapFn)
      };

      fetch(getApiUrl('/api/master-data'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newMaster)
      }).catch(() => {});

      return newMaster;
    });
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

    const targetId = String(editModalItem.id || editModalItem.report_no || '');
    const targetReportNo = String(editModalItem.report_no || '');

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
          gross_profit: Number(editForm.net_sales) - Number(editForm.total_expense),
          edit_history: [...(r.edit_history || []), editLog]
        };
      }
      return r;
    };

    setMasterData(prev => {
      const now = Date.now();
      const newMaster = {
        ...prev,
        _lastUpdated: now,
        approvedFinanceDaily: (prev.approvedFinanceDaily || []).map(mapFn),
        shiftClosings: (prev.shiftClosings || []).map(mapFn),
        shift_closings: (prev.shift_closings || []).map(mapFn),
        closedShifts: (prev.closedShifts || []).map(mapFn),
        dailyReports: (prev.dailyReports || []).map(mapFn),
        manualEntryRecords: (prev.manualEntryRecords || []).map(mapFn)
      };

      fetch(getApiUrl('/api/master-data'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newMaster)
      }).catch(() => {});

      return newMaster;
    });

    setEditModalItem(null);
  };

  // HANDLERS UNTUK MULTI-ROW PENGELUARAN
  const handleAddExpenseRow = () => {
    setAddForm(prev => ({
      ...prev,
      expense_rows: [
        ...prev.expense_rows,
        { id: Date.now(), item_name: '', category_type: 'HPP Bahan Baku', qty: 1, unit: 'kg', price_per_unit: 0, subtotal: 0 }
      ]
    }));
  };

  const handleRemoveExpenseRow = (id) => {
    setAddForm(prev => ({
      ...prev,
      expense_rows: prev.expense_rows.filter(r => r.id !== id)
    }));
  };

  const handleExpenseRowChange = (id, field, value) => {
    setAddForm(prev => ({
      ...prev,
      expense_rows: prev.expense_rows.map(r => {
        if (r.id !== id) return r;

        let updated = { ...r, [field]: value };

        // AUTO FILL KATEGORI & SATUAN SAAT AUTO-SUGGESTION DIPILIH
        if (field === 'item_name') {
          const suggested = expenseSuggestions.find(s => s.name === value);
          if (suggested) {
            updated.category_type = suggested.category_type;
            updated.unit = suggested.unit;
            if (suggested.price && !updated.price_per_unit) {
              updated.price_per_unit = suggested.price;
            }
          }
        }

        // RE-CALCULATE SUBTOTAL (QTY * HARGA SATUAN)
        const q = Number(field === 'qty' ? value : updated.qty) || 0;
        const p = Number(field === 'price_per_unit' ? value : updated.price_per_unit) || 0;
        updated.subtotal = q * p;

        return updated;
      })
    }));
  };

  // HANDLERS UNTUK RIWAYAT PENGAMBILAN MODAL
  const handleAddModalRefundRow = () => {
    setAddForm(prev => ({
      ...prev,
      modal_refund_rows: [
        ...prev.modal_refund_rows,
        { id: Date.now(), date: new Date().toISOString().split('T')[0], amount_returned: 0, notes: 'Pengembalian Modal' }
      ]
    }));
  };

  const handleRemoveModalRefundRow = (id) => {
    setAddForm(prev => ({
      ...prev,
      modal_refund_rows: prev.modal_refund_rows.filter(r => r.id !== id)
    }));
  };

  const handleModalRefundRowChange = (id, field, value) => {
    setAddForm(prev => ({
      ...prev,
      modal_refund_rows: prev.modal_refund_rows.map(r => {
        if (r.id !== id) return r;
        return { ...r, [field]: value };
      })
    }));
  };

  // SAVE NEW MANUAL REPORT HANDLER (BY ADMIN -> STATUS AUTO DONE)
  const handleSaveAddManualReport = (e) => {
    e.preventDefault();

    const newReport = {
      id: `LAP-ADM-${Date.now()}`,
      report_no: addForm.report_no,
      outlet_id: Number(addForm.outlet_id),
      branch_name: getOutletName(addForm.outlet_id),
      date: addForm.date,
      cashier_name: addForm.cashier_name || 'Admin',
      submitter_type: 'Admin',

      // BAGIAN 1: PENJUALAN
      cash_sales: Number(addForm.cash_sales || 0),
      non_cash_sales: Number(addForm.non_cash_sales || 0),
      sales_discount: Number(addForm.sales_discount || 0),
      net_sales: computedTotalIncome,

      // BAGIAN 2: PENGELUARAN
      expense_rows: addForm.expense_rows,
      cogs_expense: addForm.expense_rows.filter(r => r.category_type.includes('HPP')).reduce((sum, r) => sum + r.subtotal, 0),
      total_expense: computedTotalExpense,

      // BAGIAN 3 & 4: LABA KOTOR & UANG DI LACI
      gross_profit: computedGrossProfit,
      cash_in_drawer: computedCashInDrawer,

      // BAGIAN 5: MODAL
      modal_ideal: Number(addForm.modal_ideal || 0),
      modal_refund_rows: addForm.modal_refund_rows,
      total_modal_returned: computedTotalModalReturned,
      modal_debt_remaining: computedModalDebtRemaining,

      status: 'Pending', // Initial Status: Pending (Menunggu Persetujuan Admin)
      approval_status: 'Pending',
      notes: addForm.notes || 'Input Manual Laporan Harian Admin Central'
    };

    setMasterData(prev => {
      const now = Date.now();
      const newMaster = {
        ...prev,
        _lastUpdated: now,
        approvedFinanceDaily: [newReport, ...(prev.approvedFinanceDaily || [])],
        shiftClosings: [newReport, ...(prev.shiftClosings || [])],
        shift_closings: [newReport, ...(prev.shift_closings || [])],
        closedShifts: [newReport, ...(prev.closedShifts || [])],
        dailyReports: [newReport, ...(prev.dailyReports || [])],
        manualEntryRecords: [newReport, ...(prev.manualEntryRecords || [])]
      };

      fetch(getApiUrl('/api/master-data'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newMaster)
      }).catch(() => {});

      return newMaster;
    });

    setShowAddModal(false);
  };

  // CONFIRM DELETE HANDLER
  const handleConfirmDelete = () => {
    if (!deleteConfirmItem) return;
    const targetId = String(deleteConfirmItem.id || deleteConfirmItem.report_no || '');
    const targetReportNo = String(deleteConfirmItem.report_no || '');

    const filterFn = r => {
      if (!r) return false;
      const rId = String(r.id !== undefined && r.id !== null ? r.id : r.report_no || '');
      const rNo = String(r.report_no || '');
      return rId !== targetId && rNo !== targetReportNo && rId !== targetReportNo && rNo !== targetId;
    };

    // 1. Trigger explicit delete-item on backend API for both keys & report_no
    try {
      fetch(getApiUrl('/api/master-data/delete-item'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'approvedFinanceDaily', id: targetId, report_no: targetReportNo })
      }).catch(() => {});

      if (targetReportNo && targetReportNo !== targetId) {
        fetch(getApiUrl('/api/master-data/delete-item'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key: 'approvedFinanceDaily', id: targetReportNo, report_no: targetReportNo })
        }).catch(() => {});
      }
    } catch (e) {}

    // 2. Filter local state, update deletedLogisticsIds & deletedReportIds, & post master data update
    setMasterData(prev => {
      const now = Date.now();
      const prevDelLog = (prev.deletedLogisticsIds || []).map(x => String(x));
      const prevDelRep = (prev.deletedReportIds || []).map(x => String(x));
      const updatedDelLog = Array.from(new Set([...prevDelLog, targetId, targetReportNo].filter(Boolean)));
      const updatedDelRep = Array.from(new Set([...prevDelRep, targetId, targetReportNo].filter(Boolean)));

      const newMaster = {
        ...prev,
        _lastUpdated: now,
        deletedLogisticsIds: updatedDelLog,
        deletedReportIds: updatedDelRep,
        approvedFinanceDaily: (prev.approvedFinanceDaily || []).filter(filterFn),
        shiftClosings: (prev.shiftClosings || []).filter(filterFn),
        shift_closings: (prev.shift_closings || []).filter(filterFn),
        closedShifts: (prev.closedShifts || []).filter(filterFn),
        dailyReports: (prev.dailyReports || []).filter(filterFn),
        manualEntryRecords: (prev.manualEntryRecords || []).filter(filterFn)
      };

      try {
        fetch(getApiUrl('/api/master-data'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newMaster)
        }).catch(() => {});
      } catch (e) {}

      return newMaster;
    });

    setDeleteConfirmItem(null);
  };

  // EXPORT EXCEL HANDLER
  const handleExportCSV = () => {
    let csv = "TANGGAL,NO LAPORAN,PENGAJU,OUTLET,NET SALES (IDR),TOTAL EXPENSE (IDR),LABA KOTOR (IDR),STATUS,CATATAN\n";
    filteredReports.forEach(r => {
      csv += `"${formatDateIndo(r.date)}","${r.report_no}","${r.submitter_type}","${r.outlet_name}",${r.net_sales},${r.total_expense},${r.gross_profit || (r.net_sales - r.total_expense)},"${r.status}","${r.notes.replace(/"/g, '""')}"\n`;
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
      <div style={{ background: '#0f172a', padding: '16px 20px', borderRadius: '14px', border: '1px solid #334155', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        
        {/* BARIS 1: SEARCH & FILTER UTAMA */}
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '14px' }}>
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
            {/* FILTER NAMA OUTLET */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <label style={{ fontSize: '0.78rem', color: '#38bdf8', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Building2 size={14} color="#38bdf8" />
                <span>Outlet:</span>
              </label>
              <select
                value={outletFilter}
                onChange={e => { setOutletFilter(e.target.value); setCurrentPage(1); }}
                style={{ padding: '8px 12px', background: '#1e293b', border: '1px solid #38bdf8', borderRadius: '8px', color: '#38bdf8', fontWeight: '800', fontSize: '0.82rem', cursor: 'pointer' }}
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
                style={{ padding: '8px 12px', background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#f8fafc', fontWeight: '800', fontSize: '0.82rem', cursor: 'pointer' }}
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
                style={{ padding: '8px 12px', background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#f8fafc', fontWeight: '800', fontSize: '0.82rem', cursor: 'pointer' }}
              >
                <option value="ALL">Semua Status</option>
                <option value="ACC">ACC (Menunggu Persetujuan)</option>
                <option value="Approved">Approved (Disetujui)</option>
                <option value="Done">Done (Selesai / Dibaca)</option>
              </select>
            </div>
          </div>
        </div>

        {/* BARIS 2: WIDGET RENTANG WAKTU (TANGGAL) */}
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '12px', paddingTop: '10px', borderTop: '1px dashed #334155' }}>
          <div style={{ fontSize: '0.78rem', color: '#38bdf8', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Calendar size={15} color="#38bdf8" />
            <span>Rentang Tanggal:</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <input
              type="date"
              value={startDate}
              onChange={e => { setStartDate(e.target.value); setCurrentPage(1); }}
              style={{ padding: '7px 10px', background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#f8fafc', fontSize: '0.80rem' }}
            />
            <span style={{ color: '#94a3b8', fontSize: '0.80rem', fontWeight: '700' }}>s/d</span>
            <input
              type="date"
              value={endDate}
              onChange={e => { setEndDate(e.target.value); setCurrentPage(1); }}
              style={{ padding: '7px 10px', background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#f8fafc', fontSize: '0.80rem' }}
            />

            {(startDate || endDate) && (
              <button
                onClick={() => { setStartDate(''); setEndDate(''); setCurrentPage(1); }}
                style={{ padding: '6px 12px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid #ef4444', borderRadius: '6px', color: '#f87171', fontSize: '0.76rem', fontWeight: '800', cursor: 'pointer' }}
              >
                Reset Tanggal
              </button>
            )}
          </div>

          {/* QUICK PRESETS TANGGAL */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: 'auto' }}>
            <button
              onClick={() => {
                const today = new Date().toISOString().split('T')[0];
                setStartDate(today);
                setEndDate(today);
                setCurrentPage(1);
              }}
              style={{ padding: '5px 10px', background: '#1e293b', border: '1px solid #334155', borderRadius: '6px', color: '#94a3b8', fontSize: '0.74rem', fontWeight: '700', cursor: 'pointer' }}
            >
              Hari Ini
            </button>
            <button
              onClick={() => {
                const now = new Date();
                const past7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
                setStartDate(past7);
                setEndDate(now.toISOString().split('T')[0]);
                setCurrentPage(1);
              }}
              style={{ padding: '5px 10px', background: '#1e293b', border: '1px solid #334155', borderRadius: '6px', color: '#94a3b8', fontSize: '0.74rem', fontWeight: '700', cursor: 'pointer' }}
            >
              7 Hari Terakhir
            </button>
            <button
              onClick={() => {
                setStartDate('');
                setEndDate('');
                setCurrentPage(1);
              }}
              style={{ padding: '5px 10px', background: '#1e293b', border: '1px solid #334155', borderRadius: '6px', color: '#94a3b8', fontSize: '0.74rem', fontWeight: '700', cursor: 'pointer' }}
            >
              Semua Waktu
            </button>
          </div>
        </div>

      </div>

      {/* MAIN TABLE: 5 REQUIRED COLUMNS */}
      <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '16px', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.86rem' }}>
            <thead>
              <tr style={{ background: '#0f172a', borderBottom: '2px solid #334155', color: '#94a3b8', textAlign: 'left' }}>
                <th style={{ padding: '14px 16px', fontWeight: '800', width: '180px' }}>TANGGAL</th>
                <th style={{ padding: '14px 16px', fontWeight: '800' }}>NO LAPORAN</th>
                <th style={{ padding: '14px 16px', fontWeight: '800', width: '140px' }}>PENGAJU</th>
                <th style={{ padding: '14px 16px', fontWeight: '800', width: '160px' }}>STATUS</th>
                <th style={{ padding: '14px 16px', fontWeight: '800', textAlign: 'right', width: '160px' }}>AKSI</th>
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
                          Pendapatan: {formatRupiah(item.net_sales)} &bull; Expense: {formatRupiah(item.total_expense)}
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
                        {(item.status === 'Done' || item.status === 'Approved' || item.approval_status === 'Done') ? (
                          <span style={{
                            padding: '6px 12px',
                            borderRadius: '8px',
                            background: 'rgba(34, 197, 94, 0.15)',
                            border: '1px solid #22c55e',
                            color: '#4ade80',
                            fontWeight: '900',
                            fontSize: '0.78rem',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px'
                          }}>
                            <CheckSquare size={14} />
                            <span>Done (Disetujui)</span>
                          </span>
                        ) : (
                          <button
                            onClick={() => handleUpdateStatus(item, 'Done')}
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
                            <span>⏳ Pending (Klik Approve)</span>
                          </button>
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
          <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '16px', width: '100%', maxWidth: '720px', maxHeight: '90vh', overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
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

            {/* FINANCIAL SUMMARY */}
            <div style={{ background: '#0f172a', padding: '16px', borderRadius: '12px', border: '1px solid #334155', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: '800', color: '#f8fafc', borderBottom: '1px dashed #334155', paddingBottom: '8px' }}>
                💵 Ringkasan Penjualan &amp; Laba Kotor:
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.84rem' }}>
                <span style={{ color: '#94a3b8' }}>Penjualan Tunai (Cash):</span>
                <span style={{ color: '#f8fafc', fontWeight: '800' }}>{formatRupiah(detailModalItem.cash_sales)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.84rem' }}>
                <span style={{ color: '#94a3b8' }}>Penjualan Non-Tunai (QRIS/EDC):</span>
                <span style={{ color: '#f8fafc', fontWeight: '800' }}>{formatRupiah(detailModalItem.non_cash_sales)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.84rem' }}>
                <span style={{ color: '#94a3b8' }}>Diskon Penjualan:</span>
                <span style={{ color: '#fb7185', fontWeight: '800' }}>- {formatRupiah(detailModalItem.sales_discount || 0)}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem', fontWeight: '800', borderTop: '1px dashed #334155', paddingTop: '8px' }}>
                <span style={{ color: '#38bdf8' }}>TOTAL PENDAPATAN:</span>
                <span style={{ color: '#38bdf8' }}>{formatRupiah(detailModalItem.net_sales)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.84rem' }}>
                <span style={{ color: '#94a3b8' }}>Total Pengeluaran:</span>
                <span style={{ color: '#fb7185', fontWeight: '800' }}>- {formatRupiah(detailModalItem.total_expense)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.92rem', fontWeight: '900', borderTop: '1px dashed #334155', paddingTop: '8px' }}>
                <span style={{ color: '#34d399' }}>LABA KOTOR:</span>
                <span style={{ color: '#34d399' }}>{formatRupiah(detailModalItem.gross_profit || (detailModalItem.net_sales - detailModalItem.total_expense))}</span>
              </div>
            </div>

            {/* UANG DI LACI & MODAL METRICS */}
            <div style={{ background: '#0f172a', padding: '16px', borderRadius: '12px', border: '1px solid #334155', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: '800', color: '#f8fafc', borderBottom: '1px dashed #334155', paddingBottom: '8px' }}>
                💰 Metrik Uang Di Laci &amp; Hutang Modal:
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.84rem' }}>
                <span style={{ color: '#94a3b8' }}>Uang Di Laci (Cash in Drawer):</span>
                <span style={{ color: '#fbbf24', fontWeight: '900' }}>{formatRupiah(detailModalItem.cash_in_drawer || (detailModalItem.net_sales - detailModalItem.total_expense - detailModalItem.non_cash_sales))}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.84rem' }}>
                <span style={{ color: '#94a3b8' }}>Modal Ideal Kasir:</span>
                <span style={{ color: '#f8fafc', fontWeight: '800' }}>{formatRupiah(detailModalItem.modal_ideal || 0)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.84rem' }}>
                <span style={{ color: '#94a3b8' }}>Sisa Hutang Modal:</span>
                <span style={{ color: '#38bdf8', fontWeight: '800' }}>{formatRupiah(detailModalItem.modal_debt_remaining || 0)}</span>
              </div>
            </div>

            {/* MULTI-ROW EXPENSES BREAKDOWN */}
            {detailModalItem.expense_rows && detailModalItem.expense_rows.length > 0 && (
              <div style={{ background: '#0f172a', padding: '14px', borderRadius: '12px', border: '1px solid #334155' }}>
                <div style={{ fontSize: '0.82rem', fontWeight: '800', color: '#f8fafc', marginBottom: '8px' }}>
                  📦 Rincian Pengeluaran ({detailModalItem.expense_rows.length} Baris):
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ background: '#1e293b', color: '#94a3b8', borderBottom: '1px solid #334155' }}>
                      <th style={{ padding: '6px 8px' }}>Nama Item</th>
                      <th style={{ padding: '6px 8px' }}>Kategori</th>
                      <th style={{ padding: '6px 8px', textAlign: 'center' }}>Qty</th>
                      <th style={{ padding: '6px 8px', textAlign: 'right' }}>Harga Satuan</th>
                      <th style={{ padding: '6px 8px', textAlign: 'right' }}>Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detailModalItem.expense_rows.map((row, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <td style={{ padding: '6px 8px', color: '#f8fafc', fontWeight: '700' }}>{row.item_name || '-'}</td>
                        <td style={{ padding: '6px 8px', color: '#38bdf8' }}>{row.category_type}</td>
                        <td style={{ padding: '6px 8px', textAlign: 'center', color: '#94a3b8' }}>{row.qty} {row.unit}</td>
                        <td style={{ padding: '6px 8px', textAlign: 'right', color: '#94a3b8' }}>{formatRupiah(row.price_per_unit)}</td>
                        <td style={{ padding: '6px 8px', textAlign: 'right', color: '#fb7185', fontWeight: '800' }}>{formatRupiah(row.subtotal)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

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
                <label style={{ fontSize: '0.74rem', color: '#94a3b8', fontWeight: '700' }}>Total Pendapatan:</label>
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

      {/* ➕ MODAL INPUT LAPORAN HARIAN MANUAL (ADMIN CENTRAL) - FORMULIR LENGKAP */}
      {showAddModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.88)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '20px' }}>
          <form onSubmit={handleSaveAddManualReport} style={{ background: '#1e293b', border: '1px solid #38bdf8', borderRadius: '18px', width: '100%', maxWidth: '840px', maxHeight: '92vh', overflowY: 'auto', padding: '26px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* HEADER MODAL */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #334155', paddingBottom: '14px' }}>
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: '900', color: '#38bdf8', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Plus size={22} color="#38bdf8" />
                  <span>➕ Input Laporan Harian Manual (Admin Central)</span>
                </h3>
                <p style={{ fontSize: '0.78rem', color: '#94a3b8', margin: '2px 0 0 0' }}>
                  Input otomatis &amp; manual laporan pendapatan, multi-row pengeluaran, laba kotor, uang di laci, dan pengembalian modal.
                </p>
              </div>
              <button type="button" onClick={() => setShowAddModal(false)} style={{ background: '#334155', border: 'none', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#cbd5e1', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            {/* HEADER PARAMETERS (OUTLET, TANGGAL, NO LAPORAN) */}
            <div style={{ background: '#0f172a', padding: '16px', borderRadius: '12px', border: '1px solid #334155', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '0.74rem', color: '#38bdf8', fontWeight: '800' }}>Target Outlet:</label>
                <select
                  value={addForm.outlet_id}
                  onChange={e => setAddForm({ ...addForm, outlet_id: e.target.value })}
                  style={{ padding: '8px 12px', background: '#1e293b', border: '1px solid #38bdf8', borderRadius: '8px', color: '#38bdf8', fontWeight: '800', fontSize: '0.82rem' }}
                >
                  {outletsList.map(o => (
                    <option key={o.id} value={o.id}>{o.name}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '0.74rem', color: '#94a3b8', fontWeight: '700' }}>Tanggal Pelaporan:</label>
                <input
                  type="date"
                  value={addForm.date}
                  onChange={e => setAddForm({ ...addForm, date: e.target.value })}
                  style={{ padding: '8px 12px', background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#f8fafc', fontSize: '0.82rem' }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '0.74rem', color: '#94a3b8', fontWeight: '700' }}>No Laporan (Auto/Custom):</label>
                <input
                  type="text"
                  value={addForm.report_no}
                  onChange={e => setAddForm({ ...addForm, report_no: e.target.value })}
                  style={{ padding: '8px 12px', background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#f8fafc', fontSize: '0.82rem' }}
                />
              </div>
            </div>

            {/* 📈 BAGIAN 1: LAPORAN PENJUALAN & TOTAL PENDAPATAN */}
            <div style={{ background: '#0f172a', padding: '18px', borderRadius: '14px', border: '1px solid #334155', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ fontSize: '0.90rem', fontWeight: '900', color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px dashed #334155', paddingBottom: '10px' }}>
                <DollarSign size={18} color="#38bdf8" />
                <span>1. Laporan Penjualan &amp; Total Pendapatan (s/d Pukul 23:59:59)</span>
              </div>

              <div style={{ fontSize: '0.74rem', color: '#94a3b8', background: 'rgba(56, 189, 248, 0.08)', padding: '8px 12px', borderRadius: '8px', border: '1px solid rgba(56, 189, 248, 0.2)' }}>
                💡 Data Penjualan Cash &amp; Non Cash terisi otomatis berdasarkan transaksi POS tanggal <strong>{addForm.date}</strong> hingga pukul 23:59:59. Anda dapat menyesuaikannya secara manual.
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.74rem', color: '#94a3b8', fontWeight: '700' }}>Penjualan Cash (Tunai):</label>
                  <input
                    type="number"
                    value={addForm.cash_sales}
                    onChange={e => setAddForm({ ...addForm, cash_sales: e.target.value })}
                    style={{ padding: '9px 12px', background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#f8fafc', fontWeight: '800', fontSize: '0.85rem' }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.74rem', color: '#94a3b8', fontWeight: '700' }}>Penjualan Non-Cash (QRIS/EDC/Bank):</label>
                  <input
                    type="number"
                    value={addForm.non_cash_sales}
                    onChange={e => setAddForm({ ...addForm, non_cash_sales: e.target.value })}
                    style={{ padding: '9px 12px', background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#f8fafc', fontWeight: '800', fontSize: '0.85rem' }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.74rem', color: '#fb7185', fontWeight: '700' }}>Diskon Penjualan (Potongan):</label>
                  <input
                    type="number"
                    value={addForm.sales_discount}
                    onChange={e => setAddForm({ ...addForm, sales_discount: e.target.value })}
                    style={{ padding: '9px 12px', background: '#1e293b', border: '1px solid rgba(251, 113, 133, 0.4)', borderRadius: '8px', color: '#fb7185', fontWeight: '800', fontSize: '0.85rem' }}
                  />
                </div>
              </div>

              {/* AUTOMATIC TOTAL PENDAPATAN */}
              <div style={{ background: '#1e293b', padding: '12px 16px', borderRadius: '10px', border: '1px solid #38bdf8', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: '800', color: '#38bdf8' }}>TOTAL PENDAPATAN (Cash + Non Cash - Diskon):</span>
                <span style={{ fontSize: '1.15rem', fontWeight: '900', color: '#38bdf8' }}>{formatRupiah(computedTotalIncome)}</span>
              </div>
            </div>

            {/* 📦 BAGIAN 2: DATA PENGELUARAN (MULTI-ROW WITH AUTO-SUGGESTION & SATUAN) */}
            <div style={{ background: '#0f172a', padding: '18px', borderRadius: '14px', border: '1px solid #334155', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px dashed #334155', paddingBottom: '10px' }}>
                <div style={{ fontSize: '0.90rem', fontWeight: '900', color: '#fb7185', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Receipt size={18} color="#fb7185" />
                  <span>2. Data Pengeluaran (Bahan Baku &amp; Beban Operasional)</span>
                </div>
                <button
                  type="button"
                  onClick={handleAddExpenseRow}
                  style={{ padding: '6px 12px', background: 'rgba(251, 113, 133, 0.15)', border: '1px solid #fb7185', borderRadius: '8px', color: '#fb7185', fontWeight: '800', fontSize: '0.76rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  <Plus size={14} /> + Tambah Baris Pengeluaran
                </button>
              </div>

              {/* TABLE MULTI-ROW PENGELUARAN */}
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.80rem' }}>
                  <thead>
                    <tr style={{ background: '#1e293b', borderBottom: '1px solid #334155', color: '#94a3b8', textAlign: 'left' }}>
                      <th style={{ padding: '8px 10px', minWidth: '180px' }}>Sugesti Nama Bahan / Item *</th>
                      <th style={{ padding: '8px 10px', minWidth: '140px' }}>Kategori (HPP / Biaya)</th>
                      <th style={{ padding: '8px 10px', width: '90px' }}>Jumlah (Qty)</th>
                      <th style={{ padding: '8px 10px', width: '90px' }}>Satuan</th>
                      <th style={{ padding: '8px 10px', minWidth: '120px' }}>Harga Satuan (IDR)</th>
                      <th style={{ padding: '8px 10px', minWidth: '120px', textAlign: 'right' }}>Subtotal</th>
                      <th style={{ padding: '8px 10px', width: '40px', textAlign: 'center' }}>Hapus</th>
                    </tr>
                  </thead>
                  <tbody>
                    {addForm.expense_rows.map((row, index) => (
                      <tr key={row.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        {/* ITEM NAME WITH AUTOCOMPLETE / SUGGESTIONS */}
                        <td style={{ padding: '6px 8px' }}>
                          <input
                            type="text"
                            list={`expense-suggestions-${row.id}`}
                            value={row.item_name}
                            onChange={e => handleExpenseRowChange(row.id, 'item_name', e.target.value)}
                            placeholder="Ketik / Pilih nama item..."
                            style={{ width: '100%', padding: '6px 10px', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', color: '#f8fafc', fontSize: '0.80rem' }}
                          />
                          <datalist id={`expense-suggestions-${row.id}`}>
                            {expenseSuggestions.map((sug, i) => (
                              <option key={i} value={sug.name}>{sug.name} ({sug.category_type})</option>
                            ))}
                          </datalist>
                        </td>

                        {/* KATEGORI (AUTOMATIC BASED ON MASTER DATA) */}
                        <td style={{ padding: '6px 8px' }}>
                          <select
                            value={row.category_type}
                            onChange={e => handleExpenseRowChange(row.id, 'category_type', e.target.value)}
                            style={{ width: '100%', padding: '6px 8px', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', color: '#38bdf8', fontSize: '0.78rem' }}
                          >
                            <option value="HPP Bahan Baku">HPP Bahan Baku</option>
                            <option value="Beban Operasional">Beban Operasional</option>
                            <option value="Beban Listrik/Air/Internet">Beban Listrik/Air/Utilitas</option>
                            <option value="Beban Gaji & Upah">Beban Gaji &amp; Upah</option>
                            <option value="Kas Kecil / Petty Cash">Kas Kecil / Petty Cash</option>
                          </select>
                        </td>

                        {/* JUMLAH (QTY MANUAL) */}
                        <td style={{ padding: '6px 8px' }}>
                          <input
                            type="number"
                            step="any"
                            min="0"
                            value={row.qty}
                            onChange={e => handleExpenseRowChange(row.id, 'qty', e.target.value)}
                            style={{ width: '100%', padding: '6px 8px', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', color: '#f8fafc', fontSize: '0.80rem', textAlign: 'center' }}
                          />
                        </td>

                        {/* SATUAN / UNIT (AUTOMATIC/MANUAL) */}
                        <td style={{ padding: '6px 8px' }}>
                          <input
                            type="text"
                            value={row.unit}
                            onChange={e => handleExpenseRowChange(row.id, 'unit', e.target.value)}
                            placeholder="kg/liter/pcs"
                            style={{ width: '100%', padding: '6px 8px', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', color: '#94a3b8', fontSize: '0.78rem', textAlign: 'center' }}
                          />
                        </td>

                        {/* HARGA SATUAN (MANUAL IDR) */}
                        <td style={{ padding: '6px 8px' }}>
                          <input
                            type="number"
                            min="0"
                            value={row.price_per_unit}
                            onChange={e => handleExpenseRowChange(row.id, 'price_per_unit', e.target.value)}
                            placeholder="0"
                            style={{ width: '100%', padding: '6px 8px', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', color: '#f8fafc', fontSize: '0.80rem', textAlign: 'right' }}
                          />
                        </td>

                        {/* SUBTOTAL (AUTO-CALCULATED = QTY * HARGA SATUAN) */}
                        <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: '800', color: '#fb7185' }}>
                          {formatRupiah(row.subtotal)}
                        </td>

                        {/* ACTION REMOVE ROW */}
                        <td style={{ padding: '6px 8px', textAlign: 'center' }}>
                          <button
                            type="button"
                            onClick={() => handleRemoveExpenseRow(row.id)}
                            disabled={addForm.expense_rows.length <= 1}
                            style={{ background: 'none', border: 'none', color: addForm.expense_rows.length <= 1 ? '#475569' : '#f87171', cursor: addForm.expense_rows.length <= 1 ? 'not-allowed' : 'pointer' }}
                          >
                            <X size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* TOTAL PENGELUARAN */}
              <div style={{ background: '#1e293b', padding: '12px 16px', borderRadius: '10px', border: '1px solid #fb7185', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: '800', color: '#fb7185' }}>TOTAL PENGELUARAN (Hasil Perkalian Qty &times; Harga Satuan):</span>
                <span style={{ fontSize: '1.15rem', fontWeight: '900', color: '#fb7185' }}>{formatRupiah(computedTotalExpense)}</span>
              </div>
            </div>

            {/* 📊 BAGIAN 3 & 4: LABA KOTOR & UANG DI LACI */}
            <div style={{ background: '#0f172a', padding: '18px', borderRadius: '14px', border: '1px solid #334155', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
              
              {/* LABA KOTOR */}
              <div style={{ background: '#1e293b', padding: '14px', borderRadius: '12px', border: '1px solid #34d399', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <span style={{ fontSize: '0.78rem', color: '#34d399', fontWeight: '800' }}>📊 3. TOTAL LABA KOTOR:</span>
                <span style={{ fontSize: '1.25rem', fontWeight: '900', color: '#34d399' }}>{formatRupiah(computedGrossProfit)}</span>
                <span style={{ fontSize: '0.70rem', color: '#94a3b8' }}>(Total Pendapatan dikurangi Total Pengeluaran)</span>
              </div>

              {/* UANG DI LACI (INTERNAL SHIFT METRIC) */}
              <div style={{ background: '#1e293b', padding: '14px', borderRadius: '12px', border: '1px solid #fbbf24', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <span style={{ fontSize: '0.78rem', color: '#fbbf24', fontWeight: '800' }}>💵 4. UANG DI LACI (CASH IN DRAWER):</span>
                <span style={{ fontSize: '1.25rem', fontWeight: '900', color: '#fbbf24' }}>{formatRupiah(computedCashInDrawer)}</span>
                <span style={{ fontSize: '0.70rem', color: '#94a3b8' }}>(Laba Kotor dikurangi Penjualan Non-Cash &amp; Diskon Penjualan)</span>
              </div>

            </div>

            <div style={{ fontSize: '0.74rem', color: '#94a3b8', background: 'rgba(251, 191, 36, 0.08)', padding: '8px 12px', borderRadius: '8px', border: '1px solid rgba(251, 191, 36, 0.2)' }}>
              ℹ️ <strong>Catatan Metrik:</strong> Indikator &quot;Uang Di Laci&quot; merupakan metrik fisik internal kasir shift dan tidak dimasukkan ke dalam Laporan Laba Rugi / Financial Overview resmi.
            </div>

            {/* 💰 BAGIAN 5: PEMBAYARAN PENGAMBILAN MODAL (MODAL RESTORAN / KASIR) */}
            <div style={{ background: '#0f172a', padding: '18px', borderRadius: '14px', border: '1px solid #334155', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px dashed #334155', paddingBottom: '10px' }}>
                <div style={{ fontSize: '0.90rem', fontWeight: '900', color: '#c084fc', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Layers size={18} color="#c084fc" />
                  <span>5. Pembayaran Pengambilan Modal (Kasir / Restoran)</span>
                </div>
                <button
                  type="button"
                  onClick={handleAddModalRefundRow}
                  style={{ padding: '6px 12px', background: 'rgba(192, 132, 252, 0.15)', border: '1px solid #c084fc', borderRadius: '8px', color: '#c084fc', fontWeight: '800', fontSize: '0.76rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  <Plus size={14} /> + Tambah Baris Pengembalian Modal
                </button>
              </div>

              {/* MODAL INPUTS: Modal saat ini & Modal seharusnya */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.74rem', color: '#c084fc', fontWeight: '800' }}>Modal saat ini (IDR):</label>
                  <input
                    type="number"
                    value={addForm.modal_saat_ini}
                    onChange={e => setAddForm({ ...addForm, modal_saat_ini: Number(e.target.value) })}
                    placeholder="0"
                    style={{ padding: '9px 12px', background: '#1e293b', border: '1px solid #c084fc', borderRadius: '8px', color: '#f8fafc', fontWeight: '800', fontSize: '0.85rem' }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.74rem', color: '#38bdf8', fontWeight: '800' }}>Modal seharusnya (IDR):</label>
                  <input
                    type="number"
                    value={addForm.modal_seharusnya}
                    onChange={e => setAddForm({ ...addForm, modal_seharusnya: Number(e.target.value) })}
                    placeholder="0"
                    style={{ padding: '9px 12px', background: '#1e293b', border: '1px solid #38bdf8', borderRadius: '8px', color: '#f8fafc', fontWeight: '800', fontSize: '0.85rem' }}
                  />
                </div>
              </div>

              {/* TABEL RIWAYAT PENGEMBALIAN MODAL */}
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.80rem' }}>
                  <thead>
                    <tr style={{ background: '#1e293b', borderBottom: '1px solid #334155', color: '#94a3b8', textAlign: 'left' }}>
                      <th style={{ padding: '8px 10px', width: '140px' }}>Tanggal Pengembalian</th>
                      <th style={{ padding: '8px 10px', minWidth: '160px' }}>Jumlah Modal Dikembalikan (IDR)</th>
                      <th style={{ padding: '8px 10px' }}>Keterangan / Catatan</th>
                      <th style={{ padding: '8px 10px', width: '40px', textAlign: 'center' }}>Hapus</th>
                    </tr>
                  </thead>
                  <tbody>
                    {addForm.modal_refund_rows.map(row => (
                      <tr key={row.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <td style={{ padding: '6px 8px' }}>
                          <input
                            type="date"
                            value={row.date}
                            onChange={e => handleModalRefundRowChange(row.id, 'date', e.target.value)}
                            style={{ width: '100%', padding: '6px 8px', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', color: '#f8fafc', fontSize: '0.78rem' }}
                          />
                        </td>
                        <td style={{ padding: '6px 8px' }}>
                          <input
                            type="number"
                            min="0"
                            value={row.amount_returned}
                            onChange={e => handleModalRefundRowChange(row.id, 'amount_returned', e.target.value)}
                            placeholder="0"
                            style={{ width: '100%', padding: '6px 8px', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', color: '#c084fc', fontWeight: '800', fontSize: '0.80rem' }}
                          />
                        </td>
                        <td style={{ padding: '6px 8px' }}>
                          <input
                            type="text"
                            value={row.notes}
                            onChange={e => handleModalRefundRowChange(row.id, 'notes', e.target.value)}
                            placeholder="Catatan pengembalian modal..."
                            style={{ width: '100%', padding: '6px 8px', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', color: '#f8fafc', fontSize: '0.78rem' }}
                          />
                        </td>
                        <td style={{ padding: '6px 8px', textAlign: 'center' }}>
                          <button
                            type="button"
                            onClick={() => handleRemoveModalRefundRow(row.id)}
                            disabled={addForm.modal_refund_rows.length <= 1}
                            style={{ background: 'none', border: 'none', color: addForm.modal_refund_rows.length <= 1 ? '#475569' : '#f87171', cursor: addForm.modal_refund_rows.length <= 1 ? 'not-allowed' : 'pointer' }}
                          >
                            <X size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* RINGKASAN TOTAL MODAL & SISA HUTANG MODAL */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px' }}>
                <div style={{ background: '#1e293b', padding: '12px 14px', borderRadius: '10px', border: '1px solid #c084fc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.80rem', fontWeight: '800', color: '#c084fc' }}>Total Modal Dikembalikan:</span>
                  <span style={{ fontSize: '1.05rem', fontWeight: '900', color: '#c084fc' }}>{formatRupiah(computedTotalModalReturned)}</span>
                </div>

                <div style={{
                  background: '#1e293b',
                  padding: '12px 14px',
                  borderRadius: '10px',
                  border: `1px solid ${computedModalDebtRemaining < 0 ? '#f43f5e' : '#34d399'}`,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.78rem', fontWeight: '800', color: computedModalDebtRemaining < 0 ? '#f87171' : '#34d399' }}>
                      {computedModalDebtRemaining < 0 ? 'Sisa Hutang Modal (Masih Ada Hutang):' : 'Sisa Uang Modal (Sisa Uang / Lunas):'}
                    </span>
                    <span style={{ fontSize: '1.05rem', fontWeight: '900', color: computedModalDebtRemaining < 0 ? '#f87171' : '#34d399' }}>
                      {computedModalDebtRemaining < 0 ? `- ${formatRupiah(Math.abs(computedModalDebtRemaining))}` : formatRupiah(computedModalDebtRemaining)}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.68rem', color: computedModalDebtRemaining < 0 ? '#fb7185' : '#a7f3d0', fontWeight: '700' }}>
                    {computedModalDebtRemaining < 0 ? '⚠️ Bernilai negatif (masih ada hutang)' : '✅ Bernilai positif (sisa uang)'}
                    <span style={{ opacity: 0.75, marginLeft: '6px' }}>[Modal seharusnya - (Modal saat ini + Total dikembalikan)]</span>
                  </div>
                </div>
              </div>
            </div>

            {/* CATATAN ADMIN */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '0.74rem', color: '#94a3b8', fontWeight: '700' }}>Catatan / Keterangan Tambahan Admin:</label>
              <textarea
                rows={2}
                value={addForm.notes}
                onChange={e => setAddForm({ ...addForm, notes: e.target.value })}
                placeholder="Keterangan opsional laporan harian..."
                style={{ padding: '8px 12px', background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', color: '#f8fafc', fontSize: '0.82rem', resize: 'none' }}
              />
            </div>

            <div style={{ fontSize: '0.76rem', color: '#38bdf8', fontWeight: '800' }}>
              💡 Status laporan yang di-input manual oleh Admin Central akan langsung diset ke &quot;Done&quot; (Selesai).
            </div>

            {/* FOOTER ACTION BUTTONS */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', borderTop: '1px solid #334155', paddingTop: '16px' }}>
              <button type="button" onClick={() => setShowAddModal(false)} style={{ padding: '10px 20px', background: '#334155', border: 'none', borderRadius: '10px', color: '#f8fafc', fontWeight: '800', cursor: 'pointer' }}>
                Batal
              </button>
              <button type="submit" style={{ padding: '10px 24px', background: 'linear-gradient(135deg, #0284c7 0%, #38bdf8 100%)', border: 'none', borderRadius: '10px', color: '#0f172a', fontWeight: '900', cursor: 'pointer', boxShadow: '0 4px 14px rgba(56, 189, 248, 0.4)' }}>
                💾 Simpan Laporan Harian (Admin)
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
