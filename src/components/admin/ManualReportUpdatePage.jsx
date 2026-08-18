import React, { useState, useMemo } from 'react';
import { 
  FileSpreadsheet, 
  Plus, 
  PlusCircle,
  Search, 
  Eye, 
  Edit3, 
  Trash2, 
  X, 
  Calendar, 
  Building2, 
  CheckCircle2, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Layers, 
  Filter, 
  AlertCircle, 
  RefreshCw,
  FileText,
  User,
  Info,
  PackageCheck,
  Check,
  ArrowUpDown,
  Coins
} from 'lucide-react';
import PaginationControls from './PaginationControls';
import { getThemePalette } from '../../utils/themeUtils';
import ManualReportUpdateModal from './ManualReportUpdateModal';

export default function ManualReportUpdatePage({ 
  masterData, 
  setMasterData, 
  userSession, 
  selectedBranch, 
  themeMode = 'dark' 
}) {
  const T = getThemePalette(themeMode);

  // States
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOutletFilter, setSelectedOutletFilter] = useState('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Sorting States
  const [sortField, setSortField] = useState('date'); // 'date' | 'report_no' | 'outlet' | 'item_name' | 'qty' | 'unit_price' | 'sales' | 'expense'
  const [sortDirection, setSortDirection] = useState('desc'); // 'asc' | 'desc'

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Modal Controls
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [previewReport, setPreviewReport] = useState(null);
  const [deletingReport, setDeletingReport] = useState(null);
  const [editingReport, setEditingReport] = useState(null);

  // Helper: Get Outlet Name
  const getOutletName = (id) => {
    const otl = (masterData?.outlets || []).find(o => String(o.id) === String(id));
    return otl ? otl.name : `Outlet #${id}`;
  };

  // Helper: Format Tanggal & Jam Indonesia (Disamping Tanggal)
  const formatDateIndonesian = (dateStr, rawObj = null) => {
    if (!dateStr) return '-';

    let timePart = '';
    if (rawObj) {
      if (rawObj.time) {
        timePart = rawObj.time;
      } else if (rawObj.created_at && String(rawObj.created_at).includes('T')) {
        const timeSub = String(rawObj.created_at).split('T')[1];
        if (timeSub) timePart = timeSub.substring(0, 8);
      } else if (rawObj.timestamp && String(rawObj.timestamp).includes('T')) {
        const timeSub = String(rawObj.timestamp).split('T')[1];
        if (timeSub) timePart = timeSub.substring(0, 8);
      } else if (rawObj.timestamp && typeof rawObj.timestamp === 'number') {
        const d = new Date(rawObj.timestamp);
        timePart = d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      }
    }

    if (!timePart) {
      if (String(dateStr).includes('T')) {
        const timeSub = String(dateStr).split('T')[1];
        if (timeSub) timePart = timeSub.substring(0, 8);
      } else if (String(dateStr).includes(' ')) {
        const timeSub = String(dateStr).split(' ')[1];
        if (timeSub) timePart = timeSub.substring(0, 8);
      }
    }

    const str = String(dateStr).substring(0, 10);
    const parts = str.split('-');
    let formattedDate = str;
    if (parts.length === 3 && parts[0].length === 4) {
      const year = parts[0];
      const monthIdx = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agt', 'Sep', 'Okt', 'Nov', 'Des'];
      if (monthIdx >= 0 && monthIdx < 12) {
        formattedDate = `${String(day).padStart(2, '0')} ${months[monthIdx]} ${year}`;
      }
    }

    if (timePart) {
      return (
        <span>
          {formattedDate} <span style={{ fontSize: '0.72rem', color: T.txtMuted, marginLeft: '4px', fontWeight: '600' }}>{timePart}</span>
        </span>
      );
    }
    return formattedDate;
  };

  // Extract All Unique Reports Combining Manual Entries, POS Shifts, Daily Approvals & Standalone Financial Records
  const allReportsList = useMemo(() => {
    const deletedReportIdsSet = new Set([
      ...(masterData?.deletedReportIds || []),
      ...(masterData?.deleted_report_nos || []),
      ...(masterData?.deletedFinancialIds || []),
      ...(masterData?.deleted_outflow_ids || [])
    ].map(id => String(id)));

    const isDeletedReport = (r) => {
      if (!r) return true;
      const rId = String(r.id !== undefined && r.id !== null ? r.id : '');
      const rNo = String(r.report_no || r.receiptNo || r.receipt_no || '');
      return (rId && deletedReportIdsSet.has(rId)) || (rNo && deletedReportIdsSet.has(rNo));
    };

    const map = new Map();

    // STRICT: Only source genuine manual report updates entered from Web Admin
    const combineSources = [
      ...(masterData?.manualEntryRecords || []),
      ...(masterData?.manualReports || []),
      ...(masterData?.approvedFinanceDaily || []).filter(r => 
        r.is_manual || 
        String(r.source || '').includes('Manual') || 
        String(r.source || '').includes('Update Laporan') || 
        String(r.report_no || '').startsWith('UPD-') || 
        String(r.report_no || '').startsWith('REP-')
      )
    ].filter(r => !isDeletedReport(r));

    combineSources.forEach(r => {
      if (r && (r.id != null || r.report_no)) {
        const key = String(r.report_no || r.id);
        if (!map.has(key)) {
          map.set(key, r);
        }
      }
    });

    return Array.from(map.values());
  }, [masterData]);

  // Filtered Reports
  const filteredReports = useMemo(() => {
    return allReportsList.filter(r => {
      const checkOutletMatch = (targetVal) => {
        if (!targetVal || targetVal === 'ALL' || targetVal === 'Semua Restoran (Konsolidasi)') return true;
        const strTarget = String(targetVal).toLowerCase().trim();
        const targetOutletObj = (masterData?.outlets || []).find(o => 
          String(o.id) === strTarget || 
          String(o.name).toLowerCase().trim() === strTarget
        );
        const targetNameLower = targetOutletObj ? (targetOutletObj.name || '').toLowerCase().trim() : strTarget;

        const rIdStr = String(r.outlet_id || r.branch_id || '').toLowerCase().trim();
        const rNameStr = String(r.outlet_name || getOutletName(r.outlet_id)).toLowerCase().trim();

        if (rIdStr === strTarget || rIdStr === 'all' || rIdStr === 'semua' || rIdStr === 'central') return true;
        if (targetNameLower && (rIdStr === targetNameLower || rNameStr === targetNameLower || rNameStr.includes(targetNameLower))) return true;
        return false;
      };

      if (selectedBranch && selectedBranch !== 'ALL' && selectedBranch !== 'Semua Restoran (Konsolidasi)') {
        if (!checkOutletMatch(selectedBranch)) return false;
      }

      if (selectedOutletFilter !== 'ALL') {
        if (!checkOutletMatch(selectedOutletFilter)) return false;
      }

      const rDate = String(r.entry_date || r.date || r.transaction_date || r.created_at || '').substring(0, 10);
      if (startDate && rDate < startDate) return false;
      if (endDate && rDate > endDate) return false;

      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase().trim();
        const noLap = String(r.report_no || '').toLowerCase();
        const otlName = String(r.outlet_name || getOutletName(r.outlet_id)).toLowerCase();
        const author = String(r.author || r.created_by || '').toLowerCase();

        const salesDetails = r.sales_details || r.sales_rows || r.items || r.cogs_items || [];
        const pendapatanDetails = r.pendapatan_details || [];
        const expenseDetails = r.expense_details || r.expense_rows || r.expenses_breakdown || [];
        const allDetails = [...salesDetails, ...pendapatanDetails, ...expenseDetails];
        const itemNamesStr = allDetails.map(d => (d.product_name || d.productName || d.name || d.categoryName || d.category || '')).join(' ').toLowerCase();

        if (!noLap.includes(term) && !otlName.includes(term) && !author.includes(term) && !rDate.includes(term) && !itemNamesStr.includes(term)) {
          return false;
        }
      }

      return true;
    });
  }, [allReportsList, selectedBranch, selectedOutletFilter, startDate, endDate, searchTerm, masterData?.outlets]);

  // Dynamic Column & Data Sorting Logic
  const sortedReports = useMemo(() => {
    const list = [...filteredReports];
    list.sort((a, b) => {
      const getRowMeta = (row) => {
        const salesVal = Number(row.total_omset || row.gross_sales || row.net_sales || 0);
        const pendLainVal = Number(row.total_pendapatan_lain || 0);
        const totalPemasukanVal = Number(row.total_pemasukan || (salesVal + pendLainVal));
        const expenseVal = Number(row.total_expense || row.total_pengeluaran || 0);

        const salesDetails = row.sales_details || row.sales_rows || row.items || row.cogs_items || [];
        const pendapatanDetails = row.pendapatan_details || [];
        const expenseDetails = row.expense_details || row.expense_rows || row.expenses_breakdown || [];
        const allDetails = [...salesDetails, ...pendapatanDetails, ...expenseDetails];

        let totalQty = Number(row.total_qty || row.qty || row.quantity || 0);
        if (!totalQty && allDetails.length > 0) {
          totalQty = allDetails.reduce((s, d) => s + Number(d.qty || d.quantity || 1), 0);
        }

        const getItemUnitPrice = (d) => {
          const p = Number(d.price || d.unit_price || d.unitPrice || d.harga_satuan || d.hargaSatuan || d.price_per_unit || 0);
          if (p > 0) return p;
          const q = Number(d.qty || d.quantity || 1);
          const sub = Number(d.subtotal || d.amount || d.total || 0);
          if (sub > 0 && q > 0) return sub / q;
          return 0;
        };

        let unitPriceVal = 0;
        if (allDetails.length > 0) {
          const totalPriceSum = allDetails.reduce((s, d) => s + (getItemUnitPrice(d) * Number(d.qty || d.quantity || 1)), 0);
          const calcQty = allDetails.reduce((s, d) => s + Number(d.qty || d.quantity || 1), 0);
          unitPriceVal = calcQty > 0 ? totalPriceSum / calcQty : 0;
        }
        if (!unitPriceVal && totalQty > 0) {
          if (totalPemasukanVal > 0) unitPriceVal = totalPemasukanVal / totalQty;
          else if (expenseVal > 0) unitPriceVal = expenseVal / totalQty;
        }

        let itemNameDisplay = 'Laporan Transaksi Kas';
        if (allDetails.length > 0) {
          const first = allDetails[0];
          const firstName = first.product_name || first.productName || first.name || first.categoryName || first.category || 'Item';
          itemNameDisplay = allDetails.length === 1 ? firstName : `${firstName} (+${allDetails.length - 1} item)`;
        } else if (row.product_name || row.productName) {
          itemNameDisplay = row.product_name || row.productName;
        } else if (row.categoryName || row.category_name || row.category) {
          itemNameDisplay = row.categoryName || row.category_name || row.category;
        } else if (row.notes && row.notes !== 'Update Laporan Manual' && row.notes !== 'Import Batch Excel') {
          itemNameDisplay = row.notes;
        } else if (totalPemasukanVal > 0) {
          itemNameDisplay = 'Pemasukan Kas';
        } else if (expenseVal > 0) {
          itemNameDisplay = 'Pengeluaran Operational';
        }

        return {
          date: String(row.entry_date || row.date || row.transaction_date || row.created_at || ''),
          reportNo: String(row.report_no || `UPD-${row.id}`),
          outletName: String(row.outlet_name || getOutletName(row.outlet_id)),
          itemName: itemNameDisplay,
          totalQty,
          unitPriceVal,
          salesVal: totalPemasukanVal,
          expenseVal
        };
      };

      const metaA = getRowMeta(a);
      const metaB = getRowMeta(b);

      let comp = 0;
      switch (sortField) {
        case 'date':
          comp = metaA.date.localeCompare(metaB.date);
          break;
        case 'report_no':
          comp = metaA.reportNo.localeCompare(metaB.reportNo);
          break;
        case 'outlet':
          comp = metaA.outletName.localeCompare(metaB.outletName);
          break;
        case 'item_name':
          comp = metaA.itemName.localeCompare(metaB.itemName);
          break;
        case 'qty':
          comp = metaA.totalQty - metaB.totalQty;
          break;
        case 'unit_price':
          comp = metaA.unitPriceVal - metaB.unitPriceVal;
          break;
        case 'sales':
          comp = metaA.salesVal - metaB.salesVal;
          break;
        case 'expense':
          comp = metaA.expenseVal - metaB.expenseVal;
          break;
        default:
          comp = metaA.date.localeCompare(metaB.date);
      }

      return sortDirection === 'asc' ? comp : -comp;
    });
    return list;
  }, [filteredReports, sortField, sortDirection, masterData]);

  // Aggregates for Filtered Data
  const totalReportsCount = filteredReports.length;
  const totalSalesAggregate = filteredReports.reduce((sum, r) => sum + Number(r.total_omset || r.gross_sales || r.net_sales || 0), 0);
  const totalPendapatanLainAggregate = filteredReports.reduce((sum, r) => sum + Number(r.total_pendapatan_lain || 0), 0);
  const totalPemasukanAggregate = filteredReports.reduce((sum, r) => {
    const s = Number(r.total_omset || r.gross_sales || r.net_sales || 0);
    const p = Number(r.total_pendapatan_lain || 0);
    return sum + Number(r.total_pemasukan || (s + p));
  }, 0);
  const totalExpenseAggregate = filteredReports.reduce((sum, r) => sum + Number(r.total_expense || r.total_pengeluaran || 0), 0);
  const netCashflowAggregate = totalPemasukanAggregate - totalExpenseAggregate;

  // Pagination Slice
  const paginatedReports = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedReports.slice(start, start + pageSize);
  }, [sortedReports, currentPage, pageSize]);

  // Sort Header Handler
  const handleHeaderSort = (field) => {
    if (sortField === field) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection(field === 'date' ? 'desc' : 'asc');
    }
  };

  // Helper Render Column Header with Sort Indicator
  const renderSortHeader = (field, label, align = 'left') => {
    const isActive = sortField === field;
    const icon = isActive ? (sortDirection === 'asc' ? ' ▲' : ' ▼') : ' ↕';
    return (
      <th
        onClick={() => handleHeaderSort(field)}
        style={{
          padding: '12px 14px',
          textAlign: align,
          cursor: 'pointer',
          userSelect: 'none',
          color: isActive ? T.info : T.txtSecondary,
          fontWeight: isActive ? '800' : '700',
          transition: 'color 0.15s ease'
        }}
        title={`Klik untuk mengurutkan berdasarkan ${label}`}
      >
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', justifyContent: align === 'center' ? 'center' : align === 'right' ? 'flex-end' : 'flex-start' }}>
          <span>{label}</span>
          <span style={{ fontSize: '0.68rem', opacity: isActive ? 1 : 0.4 }}>{icon}</span>
        </div>
      </th>
    );
  };

  // --- DELETE & REVERT STOCK HANDLER ---
  const handleConfirmDeleteReport = () => {
    if (!deletingReport) return;

    const targetId = String(deletingReport.id || '');
    const targetReportNo = String(deletingReport.report_no || deletingReport.receipt_no || '');
    const targetDate = String(deletingReport.entry_date || deletingReport.date || deletingReport.transaction_date || '').substring(0, 10);
    const targetOutletId = String(deletingReport.outlet_id || '');

    // 1. REVERT STOCK OF RAW MATERIALS (Pengembalian Stok)
    let updatedIngredients = [...(masterData?.ingredients || [])];
    const restorationMovements = [];

    const salesDetails = deletingReport.sales_details || deletingReport.sales_rows || deletingReport.items || [];
    salesDetails.forEach(sRow => {
      const prod = (masterData?.products || []).find(p => String(p.id) === String(sRow.productId || sRow.product_id) || p.name === sRow.productName || p.name === sRow.product_name || p.name === sRow.name);
      if (prod && prod.compositions && prod.compositions.length > 0) {
        prod.compositions.forEach(comp => {
          const ingIndex = updatedIngredients.findIndex(i => String(i.id) === String(comp.ingredient_id) || i.name === comp.ingredient_name);
          if (ingIndex !== -1) {
            const restoreQty = (parseFloat(comp.qty) || 0) * (parseFloat(sRow.qty) || 1);
            const currentStock = parseFloat(updatedIngredients[ingIndex].stock || updatedIngredients[ingIndex].qty || 0);
            const restoredStock = currentStock + restoreQty;

            updatedIngredients[ingIndex] = {
              ...updatedIngredients[ingIndex],
              stock: restoredStock,
              qty: restoredStock
            };

            restorationMovements.push({
              id: Date.now() + Math.random(),
              date: new Date().toISOString().split('T')[0],
              time: new Date().toLocaleTimeString('id-ID'),
              outlet_id: deletingReport.outlet_id,
              outlet_name: deletingReport.outlet_name,
              ingredient_id: updatedIngredients[ingIndex].id,
              ingredient_name: updatedIngredients[ingIndex].name,
              movement_type: 'Hapus Laporan (Restok Stok)',
              qty_change: restoreQty,
              final_stock: restoredStock,
              unit: comp.unit || updatedIngredients[ingIndex].unit || 'Gram',
              notes: `Pengembalian Stok akibat Hapus Laporan (${targetReportNo || targetId})`,
              author: userSession?.name || 'Super Admin'
            });
          }
        });
      }
    });

    // 2. ADD DELETED IDS TO TOMBSTONES SO THEY NEVER REAPPEAR
    const prevDelLog = (masterData?.deletedLogisticsIds || []).map(x => String(x));
    const prevDelRep = (masterData?.deletedReportIds || []).map(x => String(x));
    const updatedDelLog = Array.from(new Set([...prevDelLog, targetId, targetReportNo].filter(Boolean)));
    const updatedDelRep = Array.from(new Set([...prevDelRep, targetId, targetReportNo].filter(Boolean)));

    // 3. REMOVE RECORD FROM ALL MASTER DATA ARRAYS STRICTLY
    const isTargetRecord = (r) => {
      if (!r) return false;
      const rId = String(r.id !== undefined && r.id !== null ? r.id : '');
      const rNo = String(r.report_no || r.receiptNo || r.receipt_no || '');
      if (rId === targetId || (targetReportNo && rNo === targetReportNo) || rId === targetReportNo || (targetReportNo && rNo === targetId)) return true;
      if (targetDate) {
        const rDt = String(r.entry_date || r.date || r.transaction_date || r.timestamp || r.created_at || '').substring(0, 10);
        const rOtl = String(r.outlet_id || r.branch_id || '');
        if (rDt === targetDate && (!targetOutletId || !rOtl || rOtl === targetOutletId)) {
          return true;
        }
      }
      return false;
    };

    const updatedManualRecords = (masterData?.manualEntryRecords || []).filter(r => !isTargetRecord(r));
    const updatedApprovedDaily = (masterData?.approvedFinanceDaily || []).filter(r => !isTargetRecord(r));
    const updatedShiftReports = (masterData?.shiftReports || []).filter(r => !isTargetRecord(r));
    const updatedDailyReports = (masterData?.dailyReports || []).filter(r => !isTargetRecord(r));
    const updatedManualReports = (masterData?.manualReports || []).filter(r => !isTargetRecord(r));

    const updatedFinRecords = (masterData?.financialRecords || []).filter(f => !isTargetRecord(f));
    const updatedSalesTx = (masterData?.salesTransactions || []).filter(t => !isTargetRecord(t));
    const updatedOutletTx = (masterData?.outletTransactions || []).filter(t => !isTargetRecord(t));

    const updatedMovements = [...restorationMovements, ...(masterData?.stockMovement || [])];

    // 4. TRIGGER DIRECT SERVER DELETE API CALLS
    try {
      fetch('/api/master-data/delete-item', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'salesTransactions', id: targetId, report_no: targetReportNo })
      }).catch(() => {});

      fetch('/api/master-data/delete-item', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'approvedFinanceDaily', id: targetId, report_no: targetReportNo })
      }).catch(() => {});

      if (targetReportNo && targetReportNo !== targetId) {
        fetch('/api/master-data/delete-item', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key: 'salesTransactions', id: targetReportNo, report_no: targetReportNo })
        }).catch(() => {});
      }
    } catch (e) {}

    // 5. UPDATE LOCAL & SERVER MASTER DATA WITH LASTUPDATED TIMESTAMP
    setMasterData(prev => {
      const ts = Date.now();
      return {
        ...prev,
        _lastUpdated: ts,
        deletedLogisticsIds: updatedDelLog,
        deletedReportIds: updatedDelRep,
        ingredients: updatedIngredients,
        stockMovement: updatedMovements,
        manualEntryRecords: updatedManualRecords,
        approvedFinanceDaily: updatedApprovedDaily,
        shiftReports: updatedShiftReports,
        dailyReports: updatedDailyReports,
        manualReports: updatedManualReports,
        financialRecords: updatedFinRecords,
        salesTransactions: updatedSalesTx,
        outletTransactions: updatedOutletTx
      };
    });

    alert(`BERHASIL MENGHAPUS LAPORAN PERMANEN!\n\n• Laporan/Tanggal: ${targetReportNo || targetDate || targetId}\n• Rekomposisi Stok: ${restorationMovements.length} bahan baku dikembalikan.\n• Laporan telah dihapus permanen dari server & lokal!`);

    setDeletingReport(null);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }} className="animate-fade-in">
      
      {/* PAGE TITLE & ACTION BAR */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px', background: T.cardBg, padding: '20px 24px', borderRadius: '16px', border: `1px solid ${T.border}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ padding: '12px', background: T.accentGoldBg, border: `1px solid ${T.accentGoldBorder}`, borderRadius: '14px' }}>
            <FileSpreadsheet size={28} color={T.accentGold} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.30rem', fontWeight: '900', color: T.txtPrimary, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>Update Laporan (Penjualan, Pendapatan &amp; Pengeluaran)</span>
            </h1>
            <p style={{ fontSize: '0.78rem', color: T.txtSecondary, margin: '3px 0 0 0' }}>
              Kelola, edit, preview, dan upload laporan transaksi Penjualan, Pendapatan Non-Sales (Kas Masuk), Pengeluaran (Kas Keluar) &amp; Stok.
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          style={{
            padding: '10px 18px',
            background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
            border: 'none',
            borderRadius: '10px',
            color: '#000000',
            fontWeight: '900',
            fontSize: '0.82rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 4px 16px rgba(245, 158, 11, 0.4)'
          }}
        >
          <PlusCircle size={18} />
          <span>+ Buat Update Laporan Baru</span>
        </button>
      </div>

      {/* STATS CARDS BARIS 1 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
        <div style={{ background: T.cardBg, padding: '16px 20px', borderRadius: '14px', border: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ padding: '10px', background: T.infoBg, borderRadius: '10px', color: T.info }}>
            <FileText size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.70rem', color: T.txtSecondary, fontWeight: '700', textTransform: 'uppercase' }}>TOTAL LAPORAN</div>
            <div style={{ fontSize: '1.25rem', fontWeight: '900', color: T.txtPrimary }}>{totalReportsCount} Record</div>
          </div>
        </div>

        <div style={{ background: T.cardBg, padding: '16px 20px', borderRadius: '14px', border: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ padding: '10px', background: T.successBg, borderRadius: '10px', color: T.success }}>
            <TrendingUp size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.70rem', color: T.txtSecondary, fontWeight: '700', textTransform: 'uppercase' }}>TOTAL PEMASUKAN (KAS MASUK)</div>
            <div style={{ fontSize: '1.25rem', fontWeight: '900', color: T.success }}>
              Rp {totalPemasukanAggregate.toLocaleString('id-ID')}
              {totalPendapatanLainAggregate > 0 && (
                <span style={{ fontSize: '0.68rem', display: 'block', color: T.info, fontWeight: '700', marginTop: '2px' }}>
                  (Sales: Rp {totalSalesAggregate.toLocaleString('id-ID')} + Pendapatan: Rp {totalPendapatanLainAggregate.toLocaleString('id-ID')})
                </span>
              )}
            </div>
          </div>
        </div>

        <div style={{ background: T.cardBg, padding: '16px 20px', borderRadius: '14px', border: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ padding: '10px', background: T.dangerBg, borderRadius: '10px', color: T.danger }}>
            <TrendingDown size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.70rem', color: T.txtSecondary, fontWeight: '700', textTransform: 'uppercase' }}>TOTAL PENGELUARAN (KAS KELUAR)</div>
            <div style={{ fontSize: '1.25rem', fontWeight: '900', color: T.danger }}>Rp {totalExpenseAggregate.toLocaleString('id-ID')}</div>
          </div>
        </div>

        <div style={{ background: T.cardBg, padding: '16px 20px', borderRadius: '14px', border: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ padding: '10px', background: netCashflowAggregate >= 0 ? T.accentGoldBg : T.dangerBg, borderRadius: '10px', color: netCashflowAggregate >= 0 ? T.accentGold : T.danger }}>
            <DollarSign size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.70rem', color: T.txtSecondary, fontWeight: '700', textTransform: 'uppercase' }}>NET CASHFLOW / LABA</div>
            <div style={{ fontSize: '1.25rem', fontWeight: '900', color: netCashflowAggregate >= 0 ? T.accentGold : T.danger }}>Rp {netCashflowAggregate.toLocaleString('id-ID')}</div>
          </div>
        </div>
      </div>

      {/* FILTER & SEARCH BAR */}
      <div style={{ background: T.cardBg, padding: '14px 20px', borderRadius: '14px', border: `1px solid ${T.border}`, display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: '260px' }}>
          <div style={{ position: 'relative', width: '100%', maxWidth: '320px' }}>
            <Search size={16} color={T.txtMuted} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              value={searchTerm}
              onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              placeholder="Cari No. Laporan, Pembuat, atau Tanggal..."
              style={{ width: '100%', padding: '8px 12px 8px 36px', background: T.controlBg, border: `1px solid ${T.border}`, borderRadius: '8px', color: T.txtPrimary, fontSize: '0.80rem' }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {/* Quick Sort Dropdown Bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <ArrowUpDown size={15} color={T.accentGold} />
            <select
              value={sortField}
              onChange={e => { setSortField(e.target.value); setCurrentPage(1); }}
              style={{ padding: '7px 10px', background: T.controlBg, border: `1px solid ${T.border}`, borderRadius: '8px', color: T.txtPrimary, fontSize: '0.78rem', fontWeight: '700' }}
              title="Pilih kolom yang ingin diurutkan"
            >
              <option value="date">Urut Tanggal Transaksi</option>
              <option value="report_no">Urut No. Laporan</option>
              <option value="outlet">Urut Outlet / Cabang</option>
              <option value="item_name">Urut Nama Item</option>
              <option value="qty">Urut QTY (Jumlah)</option>
              <option value="unit_price">Urut Harga Satuan</option>
              <option value="sales">Urut Total Pemasukan</option>
              <option value="expense">Urut Total Pengeluaran</option>
            </select>

            <button
              type="button"
              onClick={() => setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')}
              style={{
                padding: '7px 10px',
                background: T.controlBg,
                border: `1px solid ${T.border}`,
                borderRadius: '8px',
                color: T.txtPrimary,
                fontSize: '0.78rem',
                fontWeight: '700',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
              title="Klik untuk memilih arah urutan (Ascending / Descending)"
            >
              {sortDirection === 'asc' ? 'Naik (A-Z / 0-9)' : 'Turun (Z-A / 9-0)'}
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Building2 size={15} color={T.info} />
            <select
              value={selectedOutletFilter}
              onChange={e => { setSelectedOutletFilter(e.target.value); setCurrentPage(1); }}
              style={{ padding: '8px 12px', background: T.controlBg, border: `1px solid ${T.border}`, borderRadius: '8px', color: T.txtPrimary, fontSize: '0.80rem', fontWeight: '700' }}
            >
              <option value="ALL">Semua Outlet / Cabang</option>
              {(masterData?.outlets || []).map(o => (
                <option key={o.id} value={o.id}>{o.name}</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Calendar size={15} color={T.txtMuted} />
            <input
              type="date"
              value={startDate}
              onChange={e => { setStartDate(e.target.value); setCurrentPage(1); }}
              style={{ padding: '7px 10px', background: T.controlBg, border: `1px solid ${T.border}`, borderRadius: '8px', color: T.txtPrimary, fontSize: '0.78rem' }}
            />
            <span style={{ color: T.txtMuted, fontSize: '0.78rem' }}>s/d</span>
            <input
              type="date"
              value={endDate}
              onChange={e => { setEndDate(e.target.value); setCurrentPage(1); }}
              style={{ padding: '7px 10px', background: T.controlBg, border: `1px solid ${T.border}`, borderRadius: '8px', color: T.txtPrimary, fontSize: '0.78rem' }}
            />
          </div>
        </div>
      </div>

      {/* TABLE CONTENT */}
      <div style={{ background: T.cardBg, borderRadius: '14px', border: `1px solid ${T.border}`, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.80rem' }}>
            <thead>
              <tr style={{ background: T.headerBg, borderBottom: `2px solid ${T.border}`, color: T.txtSecondary, textTransform: 'uppercase', fontSize: '0.70rem', letterSpacing: '0.04em' }}>
                {renderSortHeader('date', 'TANGGAL', 'left')}
                {renderSortHeader('report_no', 'NO. LAPORAN', 'left')}
                {renderSortHeader('outlet', 'OUTLET / CABANG', 'left')}
                {renderSortHeader('item_name', 'NAMA ITEM / DESKRIPSI', 'left')}
                {renderSortHeader('qty', 'QTY', 'center')}
                {renderSortHeader('unit_price', 'HARGA SATUAN', 'right')}
                {renderSortHeader('sales', 'TOTAL PEMASUKAN (KAS MASUK)', 'right')}
                {renderSortHeader('expense', 'TOTAL PENGELUARAN (KAS KELUAR)', 'right')}
                <th style={{ padding: '12px 14px', textAlign: 'center' }}>STATUS</th>
                <th style={{ padding: '12px 14px', textAlign: 'center' }}>AKSI</th>
              </tr>
            </thead>
            <tbody>
              {paginatedReports.length === 0 ? (
                <tr>
                  <td colSpan={10} style={{ padding: '36px', textAlign: 'center', color: T.txtMuted }}>
                    Belum ada laporan update atau data tidak ditemukan.
                  </td>
                </tr>
              ) : (
                paginatedReports.map((row) => {
                  const salesVal = Number(row.total_omset || row.gross_sales || row.net_sales || 0);
                  const pendLainVal = Number(row.total_pendapatan_lain || 0);
                  const totalPemasukanVal = Number(row.total_pemasukan || (salesVal + pendLainVal));
                  const expenseVal = Number(row.total_expense || row.total_pengeluaran || 0);
                  const formattedDate = formatDateIndonesian(row.entry_date || row.date || row.transaction_date || row.created_at, row);

                  const getItemUnitPrice = (d) => {
                    const p = Number(d.price || d.unit_price || d.unitPrice || d.harga_satuan || d.hargaSatuan || d.price_per_unit || 0);
                    if (p > 0) return p;
                    const q = Number(d.qty || d.quantity || 1);
                    const sub = Number(d.subtotal || d.amount || d.total || 0);
                    if (sub > 0 && q > 0) return sub / q;
                    return 0;
                  };

                  const salesDetails = row.sales_details || row.sales_rows || row.items || row.cogs_items || [];
                  const pendapatanDetails = row.pendapatan_details || [];
                  const expenseDetails = row.expense_details || row.expense_rows || row.expenses_breakdown || [];
                  const allDetails = [...salesDetails, ...pendapatanDetails, ...expenseDetails];

                  const getItemNameDisplay = () => {
                    if (allDetails.length > 0) {
                      const first = allDetails[0];
                      const firstName = first.product_name || first.productName || first.name || first.categoryName || first.category || 'Item';
                      if (allDetails.length === 1) {
                        return firstName;
                      }
                      return `${firstName} (+${allDetails.length - 1} item)`;
                    }
                    if (row.product_name || row.productName) return row.product_name || row.productName;
                    if (row.categoryName || row.category_name || row.category) return row.categoryName || row.category_name || row.category;
                    if (row.notes && row.notes !== 'Update Laporan Manual' && row.notes !== 'Import Batch Excel') return row.notes;
                    if (totalPemasukanVal > 0) return 'Pemasukan Kas';
                    if (expenseVal > 0) return 'Pengeluaran Operational';
                    return 'Laporan Shift Kasir';
                  };
                  const itemNameDisplay = getItemNameDisplay();

                  let totalQty = Number(row.total_qty || row.qty || row.quantity || 0);
                  if (!totalQty && allDetails.length > 0) {
                    totalQty = allDetails.reduce((s, d) => s + Number(d.qty || d.quantity || 1), 0);
                  }

                  let unitPriceVal = 0;
                  if (allDetails.length > 0) {
                    const totalPriceSum = allDetails.reduce((s, d) => s + (getItemUnitPrice(d) * Number(d.qty || d.quantity || 1)), 0);
                    const calcQty = allDetails.reduce((s, d) => s + Number(d.qty || d.quantity || 1), 0);
                    unitPriceVal = calcQty > 0 ? totalPriceSum / calcQty : 0;
                  }

                  if (!unitPriceVal && totalQty > 0) {
                    if (totalPemasukanVal > 0) unitPriceVal = totalPemasukanVal / totalQty;
                    else if (expenseVal > 0) unitPriceVal = expenseVal / totalQty;
                  }

                  return (
                    <tr key={row.id} style={{ borderBottom: `1px solid ${T.border}`, transition: 'background 0.15s ease' }}>
                      <td style={{ padding: '10px 14px', color: T.txtPrimary, fontWeight: '700' }}>
                        {formattedDate}
                      </td>

                      <td style={{ padding: '10px 14px' }}>
                        <button
                          type="button"
                          onClick={() => setPreviewReport(row)}
                          style={{ background: 'none', border: 'none', color: T.info, fontWeight: '800', cursor: 'pointer', textDecoration: 'underline', padding: 0, fontSize: '0.78rem' }}
                          title="Klik untuk membuka preview detail laporan"
                        >
                          {row.report_no || `UPD-${row.id}`}
                        </button>
                      </td>

                      <td style={{ padding: '10px 14px', color: T.txtPrimary }}>
                        <span style={{ padding: '3px 8px', background: T.cardBg2, border: `1px solid ${T.border}`, borderRadius: '6px', fontSize: '0.72rem', fontWeight: '700' }}>
                          {row.outlet_name || getOutletName(row.outlet_id)}
                        </span>
                      </td>

                      <td style={{ padding: '10px 14px', color: T.txtPrimary, fontWeight: '700', fontSize: '0.78rem' }}>
                        <span style={{ display: 'inline-block', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={itemNameDisplay}>
                          {itemNameDisplay}
                        </span>
                      </td>

                      <td style={{ padding: '10px 14px', textAlign: 'center', fontWeight: '800', color: T.info }}>
                        {totalQty > 0 ? totalQty : '-'}
                      </td>

                      <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: '700', color: T.txtSecondary, fontSize: '0.75rem' }}>
                        {unitPriceVal > 0 && totalQty > 0
                          ? `Rp ${Math.round(unitPriceVal).toLocaleString('id-ID')}`
                          : '-'}
                      </td>

                      <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: '800', color: T.success }}>
                        {totalPemasukanVal > 0 ? `+ Rp ${totalPemasukanVal.toLocaleString('id-ID')}` : 'Rp 0'}
                      </td>

                      <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: '800', color: T.danger }}>
                        {expenseVal > 0 ? `- Rp ${expenseVal.toLocaleString('id-ID')}` : 'Rp 0'}
                      </td>

                      <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                        <span style={{ padding: '3px 8px', background: T.successBg, border: `1px solid ${T.successBorder}`, color: T.success, borderRadius: '12px', fontSize: '0.68rem', fontWeight: '800' }}>
                          Disetujui
                        </span>
                      </td>

                      <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '6px' }}>
                          <button
                            type="button"
                            onClick={() => setPreviewReport(row)}
                            style={{ padding: '5px 8px', background: T.infoBg, border: `1px solid ${T.infoBorder}`, borderRadius: '6px', color: T.info, cursor: 'pointer' }}
                            title="Preview Detail Laporan"
                          >
                            <Eye size={15} />
                          </button>

                          <button
                            type="button"
                            onClick={() => setEditingReport(row)}
                            style={{ padding: '5px 8px', background: T.warningBg || 'rgba(251,191,36,0.15)', border: `1px solid ${T.warningBorder || 'rgba(251,191,36,0.4)'}`, borderRadius: '6px', color: T.accentGold, cursor: 'pointer' }}
                            title="Edit Laporan"
                          >
                            <Edit3 size={15} />
                          </button>

                          <button
                            type="button"
                            onClick={() => setDeletingReport(row)}
                            style={{ padding: '5px 8px', background: T.dangerBg, border: `1px solid ${T.dangerBorder}`, borderRadius: '6px', color: T.danger, cursor: 'pointer' }}
                            title="Hapus Laporan"
                          >
                            <Trash2 size={15} />
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

        {/* PAGINATION CONTROLS */}
        {filteredReports.length > 0 && (
          <div style={{ padding: '12px 16px', borderTop: `1px solid ${T.border}` }}>
            <PaginationControls
              totalItems={filteredReports.length}
              currentPage={currentPage}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              onPageSizeChange={(sz) => { setPageSize(sz); setCurrentPage(1); }}
              themeMode={themeMode}
            />
          </div>
        )}
      </div>

      {/* --- MODAL 1: PREVIEW REPORT DETAIL --- */}
      {previewReport && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(5px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999, padding: '16px' }}>
          <div style={{ background: T.cardBg, border: `1px solid ${T.accentGoldBorder}`, borderRadius: '16px', width: '100%', maxWidth: '820px', maxHeight: '90vh', overflowY: 'auto', padding: '24px', boxShadow: '0 25px 60px rgba(0,0,0,0.7)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: `1px solid ${T.border}`, paddingBottom: '12px' }}>
              <div>
                <div style={{ fontSize: '0.72rem', color: T.accentGold, fontWeight: '800', textTransform: 'uppercase' }}>Preview Detail Laporan</div>
                <h2 style={{ fontSize: '1.20rem', fontWeight: '900', color: T.txtPrimary, margin: '2px 0 0 0' }}>
                  {previewReport.report_no || `UPD-${previewReport.id}`}
                </h2>
              </div>
              <button onClick={() => setPreviewReport(null)} style={{ background: 'none', border: 'none', color: T.txtMuted, cursor: 'pointer' }}>
                <X size={22} />
              </button>
            </div>

            {/* Info Badges */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '10px', background: T.cardBg2, padding: '12px', borderRadius: '10px', border: `1px solid ${T.border}` }}>
              <div>
                <span style={{ fontSize: '0.68rem', color: T.txtSecondary }}>Tanggal:</span>
                <div style={{ fontSize: '0.80rem', fontWeight: '800', color: T.txtPrimary }}>{previewReport.entry_date || previewReport.date}</div>
              </div>
              <div>
                <span style={{ fontSize: '0.68rem', color: T.txtSecondary }}>Outlet / Cabang:</span>
                <div style={{ fontSize: '0.80rem', fontWeight: '800', color: T.txtPrimary }}>{previewReport.outlet_name || getOutletName(previewReport.outlet_id)}</div>
              </div>
              <div>
                <span style={{ fontSize: '0.68rem', color: T.txtSecondary }}>Total Pemasukan (Kas Masuk):</span>
                <div style={{ fontSize: '0.80rem', fontWeight: '900', color: T.success }}>
                  Rp {(previewReport.total_pemasukan || (Number(previewReport.total_omset || previewReport.gross_sales || 0) + Number(previewReport.total_pendapatan_lain || 0))).toLocaleString('id-ID')}
                </div>
              </div>
              <div>
                <span style={{ fontSize: '0.68rem', color: T.txtSecondary }}>Total Pengeluaran (Kas Keluar):</span>
                <div style={{ fontSize: '0.80rem', fontWeight: '900', color: T.danger }}>Rp {(previewReport.total_expense || previewReport.total_pengeluaran || 0).toLocaleString('id-ID')}</div>
              </div>
            </div>

            {/* Tabel Penjualan Produk */}
            {(previewReport.sales_details || previewReport.sales_rows || []).length > 0 && (
              <div>
                <div style={{ fontSize: '0.78rem', fontWeight: '800', color: T.success, marginBottom: '6px' }}>
                  Rincian Produk Penjualan Terjual:
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.74rem', border: `1px solid ${T.border}`, borderRadius: '8px' }}>
                  <thead>
                    <tr style={{ background: T.tableHeaderBg, color: T.txtSecondary, textTransform: 'uppercase' }}>
                      <th style={{ padding: '6px 10px', textAlign: 'left' }}>Nama Produk</th>
                      <th style={{ padding: '6px 10px', textAlign: 'center' }}>Qty</th>
                      <th style={{ padding: '6px 10px', textAlign: 'right' }}>Harga Satuan</th>
                      <th style={{ padding: '6px 10px', textAlign: 'right' }}>Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(previewReport.sales_details || previewReport.sales_rows || []).map((s, idx) => (
                      <tr key={idx} style={{ borderBottom: `1px solid ${T.border}` }}>
                        <td style={{ padding: '6px 10px', color: T.txtPrimary, fontWeight: '700' }}>{s.productName || s.name || s.product_name}</td>
                        <td style={{ padding: '6px 10px', textAlign: 'center' }}>{s.qty}</td>
                        <td style={{ padding: '6px 10px', textAlign: 'right' }}>
                          Rp {(Number(s.price || s.unit_price || s.unitPrice || s.harga_satuan || s.hargaSatuan || (s.subtotal && s.qty ? s.subtotal / s.qty : 0))).toLocaleString('id-ID')}
                        </td>
                        <td style={{ padding: '6px 10px', textAlign: 'right', fontWeight: '800', color: T.success }}>Rp {(s.subtotal || s.amount || 0).toLocaleString('id-ID')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Tabel Pendapatan Non-Sales */}
            {(previewReport.pendapatan_details || []).length > 0 && (
              <div>
                <div style={{ fontSize: '0.78rem', fontWeight: '800', color: T.info, marginBottom: '6px' }}>
                  Rincian Pendapatan Non-Sales (Kas Masuk):
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.74rem', border: `1px solid ${T.border}`, borderRadius: '8px' }}>
                  <thead>
                    <tr style={{ background: T.tableHeaderBg, color: T.txtSecondary, textTransform: 'uppercase' }}>
                      <th style={{ padding: '6px 10px', textAlign: 'left' }}>Kategori / Judul Pendapatan</th>
                      <th style={{ padding: '6px 10px', textAlign: 'left' }}>Catatan</th>
                      <th style={{ padding: '6px 10px', textAlign: 'left' }}>Metode</th>
                      <th style={{ padding: '6px 10px', textAlign: 'right' }}>Jumlah Rp</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewReport.pendapatan_details.map((p, idx) => (
                      <tr key={idx} style={{ borderBottom: `1px solid ${T.border}` }}>
                        <td style={{ padding: '6px 10px', color: T.txtPrimary, fontWeight: '700' }}>{p.categoryName || p.category || p.name}</td>
                        <td style={{ padding: '6px 10px', color: T.txtSecondary }}>{p.notes || '-'}</td>
                        <td style={{ padding: '6px 10px', color: T.info, fontWeight: '700' }}>{p.paymentMethod || p.payment_method || 'Kas Kasir'}</td>
                        <td style={{ padding: '6px 10px', textAlign: 'right', fontWeight: '800', color: T.success }}>Rp {(p.amount || p.subtotal || 0).toLocaleString('id-ID')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Tabel Pengeluaran */}
            {(previewReport.expense_details || previewReport.expenses_breakdown || []).length > 0 && (
              <div>
                <div style={{ fontSize: '0.78rem', fontWeight: '800', color: T.danger, marginBottom: '6px' }}>
                  Rincian Pengeluaran / Beban Operasional:
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.74rem', border: `1px solid ${T.border}`, borderRadius: '8px' }}>
                  <thead>
                    <tr style={{ background: T.tableHeaderBg, color: T.txtSecondary, textTransform: 'uppercase' }}>
                      <th style={{ padding: '6px 10px', textAlign: 'left' }}>Nama Biaya / Akun</th>
                      <th style={{ padding: '6px 10px', textAlign: 'left' }}>Catatan</th>
                      <th style={{ padding: '6px 10px', textAlign: 'right' }}>Jumlah Rp</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(previewReport.expense_details || previewReport.expenses_breakdown || []).map((e, idx) => (
                      <tr key={idx} style={{ borderBottom: `1px solid ${T.border}` }}>
                        <td style={{ padding: '6px 10px', color: T.txtPrimary, fontWeight: '700' }}>
                          [{e.code || e.accountCode || '6000'}] {e.name || e.categoryName || e.category}
                        </td>
                        <td style={{ padding: '6px 10px', color: T.txtSecondary }}>{e.notes || '-'}</td>
                        <td style={{ padding: '6px 10px', textAlign: 'right', fontWeight: '800', color: T.danger }}>Rp {(e.subtotal || e.amount || 0).toLocaleString('id-ID')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: `1px solid ${T.border}`, paddingTop: '12px' }}>
              <button onClick={() => setPreviewReport(null)} style={{ padding: '8px 18px', background: T.borderStrong, border: 'none', borderRadius: '8px', color: T.txtSecondary, fontWeight: '700', cursor: 'pointer' }}>
                Tutup Preview
              </button>
            </div>

          </div>
        </div>
      )}

      {/* --- MODAL 2: CONFIRM DELETE MODAL --- */}
      {deletingReport && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(5px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999, padding: '16px' }}>
          <div style={{ background: T.cardBg, border: `1px solid ${T.dangerBorder}`, borderRadius: '16px', width: '100%', maxWidth: '480px', padding: '24px', boxShadow: '0 25px 60px rgba(0,0,0,0.7)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: T.danger }}>
              <AlertCircle size={28} />
              <h2 style={{ fontSize: '1.10rem', fontWeight: '900', margin: 0, color: T.txtPrimary }}>Konfirmasi Hapus Laporan</h2>
            </div>

            <p style={{ fontSize: '0.80rem', color: T.txtSecondary, margin: 0, lineHeight: 1.5 }}>
              Apakah Anda yakin ingin menghapus laporan <strong>{deletingReport.report_no || `UPD-${deletingReport.id}`}</strong>?
              <br /><br />
              • Stok bahan baku yang sebelumnya terpotong akan <strong>otomatis dikembalikan (restored)</strong> ke jumlah semula.
              <br />
              • Perhitungan laporan Laba Rugi, Neraca &amp; Arus Kas akan otomatis dikurangi.
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', borderTop: `1px solid ${T.border}`, paddingTop: '14px' }}>
              <button onClick={() => setDeletingReport(null)} style={{ padding: '8px 16px', background: T.borderStrong, border: 'none', borderRadius: '8px', color: T.txtSecondary, fontWeight: '700', cursor: 'pointer' }}>
                Batal
              </button>
              <button onClick={handleConfirmDeleteReport} style={{ padding: '8px 18px', background: T.danger, border: 'none', borderRadius: '8px', color: '#ffffff', fontWeight: '900', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Trash2 size={16} />
                <span>Ya, Hapus &amp; Kembalikan Stok</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- CREATE REPORT MODAL --- */}
      <ManualReportUpdateModal
        show={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        masterData={masterData}
        setMasterData={setMasterData}
        userSession={userSession}
        themeMode={themeMode}
      />

      {/* --- EDIT REPORT MODAL --- */}
      <ManualReportUpdateModal
        show={!!editingReport}
        onClose={() => setEditingReport(null)}
        masterData={masterData}
        setMasterData={setMasterData}
        userSession={userSession}
        themeMode={themeMode}
        editData={editingReport}
      />

    </div>
  );
}
