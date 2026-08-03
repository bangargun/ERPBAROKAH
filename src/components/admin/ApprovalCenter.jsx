import React, { useState, useEffect } from 'react';
import { 
  CheckCircle2, 
  XCircle, 
  FileText, 
  Truck, 
  DollarSign, 
  Clock, 
  ShieldCheck, 
  Trash2, 
  Eye, 
  Edit3, 
  Filter, 
  FileSpreadsheet, 
  Printer, 
  SlidersHorizontal,
  Package,
  UserCheck,
  CheckSquare,
  Square,
  Search,
  TrendingUp,
  TrendingDown,
  Receipt
} from 'lucide-react';
import PaginationControls from './PaginationControls';
import { buildExportFilename } from './SalesTransactionsPage';

export default function ApprovalCenter({ masterData, setMasterData, selectedBranch }) {
  const [activeSubTab, setActiveSubTab] = useState('logistics'); // 'logistics' | 'finance' | 'transfer' | 'waste'

  // Auto-sync local outlet filters with top-level selectedBranch filter
  useEffect(() => {
    if (selectedBranch) {
      setLogisticsOutletFilter(selectedBranch);
      setFinanceOutletFilter(selectedBranch);
    } else {
      setLogisticsOutletFilter('ALL');
      setFinanceOutletFilter('ALL');
    }
  }, [selectedBranch]);

  // Pagination States (Default 25 rows per page)
  const [currentPageLogistics, setCurrentPageLogistics] = useState(1);
  const [pageSizeLogistics, setPageSizeLogistics] = useState(25);
  const [currentPageFinance, setCurrentPageFinance] = useState(1);
  const [pageSizeFinance, setPageSizeFinance] = useState(25);

  // Master Data fallbacks
  const ingredientsList = masterData.ingredients || [];
  const userRightsList = (masterData.userAccounts && masterData.userAccounts.length > 0)
    ? masterData.userAccounts
    : (masterData.userRights || []);

  // LOGISTICS FILTER & VISIBILITY STATES
  const [logisticsOutletFilter, setLogisticsOutletFilter] = useState('ALL');
  const [showLogisticsColDropdown, setShowLogisticsColDropdown] = useState(false);
  const [visibleColsLogistics, setVisibleColsLogistics] = useState({
    date: true,
    outlet: true,
    reportNo: true,
    submitter: true,
    itemName: true,
    stokFisik: true,
    status: true,
    actions: true
  });

  // FINANCE FILTER & VISIBILITY STATES (VARIANSI REMOVED)
  const [financeOutletFilter, setFinanceOutletFilter] = useState('ALL');
  const [showFinanceColDropdown, setShowFinanceColDropdown] = useState(false);
  const [visibleColsFinance, setVisibleColsFinance] = useState({
    date: true,
    reportNo: true,
    outlet: true,
    cashier: true,
    netSales: true,
    nonCashSales: true,
    totalExpense: true,
    grossProfit: true,
    capitalReturn: true,
    actualCash: true,
    status: true,
    actions: true
  });

  // LOGISTICS MODAL STATES
  const [previewRecord, setPreviewRecord] = useState(null); // Preview on hover/click No Laporan
  const [accModalRecord, setAccModalRecord] = useState(null); // Modal papan informasi ACC (opname audit editable)
  const [editModalRecord, setEditModalRecord] = useState(null); // Modal Edit pengajuan opname

  // FINANCE MODAL STATES
  const [previewFinanceRecord, setPreviewFinanceRecord] = useState(null); // Preview on hover/click No Laporan or Preview button
  const [accFinanceModalRecord, setAccFinanceModalRecord] = useState(null); // Modal ACC & Edit Finance
  const [editFinanceModalRecord, setEditFinanceModalRecord] = useState(null); // Modal Edit Finance

  // Form states for LOGISTICS ACC / Edit Modal
  const [formDate, setFormDate] = useState('');
  const [formOutletId, setFormOutletId] = useState(1);
  const [formSubmitter, setFormSubmitter] = useState('');
  const [formIngredientId, setFormIngredientId] = useState(ingredientsList[0]?.id || 1);
  const [formItemName, setFormItemName] = useState(ingredientsList[0]?.name || '');
  const [formUnit, setFormUnit] = useState(ingredientsList[0]?.unit || 'kg');
  const [formSearchQuery, setFormSearchQuery] = useState('');

  // Kuantitas Audit Opname States
  const [formStokAwal, setFormStokAwal] = useState('0');
  const [formStokMasuk, setFormStokMasuk] = useState('0');
  const [formStokKeluar, setFormStokKeluar] = useState('0');
  const [formTransferMasuk, setFormTransferMasuk] = useState('0');
  const [formTransferKeluar, setFormTransferKeluar] = useState('0');
  const [formStokRusak, setFormStokRusak] = useState('0');
  const [formStokFisik, setFormStokFisik] = useState('0');
  const [formStatus, setFormStatus] = useState('ditunda');
  const [formNotes, setFormNotes] = useState('');

  // Form states for FINANCE ACC / Edit Modal
  const [finFormDate, setFinFormDate] = useState('');
  const [finFormOutletId, setFinFormOutletId] = useState(1);
  const [finFormShift, setFinFormShift] = useState('Pagi');
  const [finFormCashier, setFinFormCashier] = useState('');
  const [finFormGrossSales, setFinFormGrossSales] = useState('0');
  const [finFormDiscount, setFinFormDiscount] = useState('0');
  const [finFormNonCashSales, setFinFormNonCashSales] = useState('0'); // Pendapatan Selain Cash
  const [finFormCogsExpense, setFinFormCogsExpense] = useState('0');
  const [finFormOpexExpense, setFinFormOpexExpense] = useState('0');
  const [finFormUtilitiesExpense, setFinFormUtilitiesExpense] = useState('0');
  const [finFormMarketingExpense, setFinFormMarketingExpense] = useState('0');
  const [finFormStatus, setFinFormStatus] = useState('ditunda');
  const [finFormNotes, setFinFormNotes] = useState('');

  const formatRupiah = (val) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val || 0);
  };

  const getOutletName = (id) => {
    const found = (masterData.outlets || []).find(o => o.id === Number(id));
    return found ? found.name : `Outlet #${id}`;
  };

  const getSelisihStatus = (sistem, fisik) => {
    if (sistem === fisik) return { text: 'Pas', color: '#34d399', bg: 'rgba(52, 211, 153, 0.15)', border: 'rgba(52, 211, 153, 0.3)' };
    if (sistem > fisik) return { text: 'SOP tidak berjalan', color: '#fbbf24', bg: 'rgba(245, 158, 11, 0.15)', border: 'rgba(245, 158, 11, 0.3)' };
    return { text: 'Kehilangan', color: '#f43f5e', bg: 'rgba(244, 63, 94, 0.15)', border: 'rgba(244, 63, 94, 0.3)' };
  };

  // 1. DATA LOGISTICS OPNAME APPROVALS (CLEAN FROM MASTER DATA)
  const getLogisticsApprovals = () => {
    return masterData.approvedLogistics || [];
  };

  const getFilteredLogistics = () => {
    let list = getLogisticsApprovals();
    if (logisticsOutletFilter !== 'ALL') {
      list = list.filter(l => l.outlet_id === Number(logisticsOutletFilter));
    }
    return list;
  };

  // 2. DATA FINANCE DAILY APPROVALS (CLEAN FROM MASTER DATA)
  const getFinanceApprovals = () => {
    return masterData.approvedFinanceDaily || [];
  };

  const getFilteredFinance = () => {
    let list = getFinanceApprovals();
    if (financeOutletFilter !== 'ALL') {
      list = list.filter(f => f.outlet_id === Number(financeOutletFilter));
    }
    return list;
  };

  // 3. DATA TRANSFER & WASTE APPROVALS (CLEAN FROM MASTER DATA)
  const getTransferApprovals = () => {
    return masterData.approvedTransfers || [];
  };

  const getWasteApprovals = () => {
    return masterData.approvedWaste || [];
  };

  // LOGISTICS ACC & EDIT HANDLERS
  const handleOpenAccModal = (log) => {
    setAccModalRecord(log);
    setFormDate(log.date || new Date().toISOString().split('T')[0]);
    setFormOutletId(log.outlet_id || 1);
    setFormSubmitter(log.submitted_by || 'Adi Wijaya (Kasir POS)');
    setFormItemName(log.item_name || '');
    setFormUnit(log.unit || 'kg');
    setFormStokAwal(log.stok_awal || '0');
    setFormStokMasuk(log.stok_masuk || '0');
    setFormStokKeluar(log.stok_keluar || '0');
    setFormTransferMasuk(log.transfer_masuk || '0');
    setFormTransferKeluar(log.transfer_keluar || '0');
    setFormStokRusak(log.stok_rusak || '0');
    setFormStokFisik(log.stok_fisik || '0');
    setFormStatus(log.status || 'ditunda');
    setFormNotes(log.notes || '');

    const found = ingredientsList.find(i => i.name === log.item_name);
    if (found) setFormIngredientId(found.id);
  };

  const handleOpenEditModal = (log) => {
    setEditModalRecord(log);
    setFormDate(log.date || new Date().toISOString().split('T')[0]);
    setFormOutletId(log.outlet_id || 1);
    setFormSubmitter(log.submitted_by || 'Adi Wijaya (Kasir POS)');
    setFormItemName(log.item_name || '');
    setFormUnit(log.unit || 'kg');
    setFormStokAwal(log.stok_awal || '0');
    setFormStokMasuk(log.stok_masuk || '0');
    setFormStokKeluar(log.stok_keluar || '0');
    setFormTransferMasuk(log.transfer_masuk || '0');
    setFormTransferKeluar(log.transfer_keluar || '0');
    setFormStokRusak(log.stok_rusak || '0');
    setFormStokFisik(log.stok_fisik || '0');
    setFormStatus(log.status || 'ditunda');
    setFormNotes(log.notes || '');

    const found = ingredientsList.find(i => i.name === log.item_name);
    if (found) setFormIngredientId(found.id);
  };

  const handleSaveAccLogistics = (e) => {
    e.preventDefault();
    if (!accModalRecord) return;

    const list = getLogisticsApprovals();
    const index = list.findIndex(l => l.id === accModalRecord.id);

    const updatedItem = {
      ...accModalRecord,
      date: formDate,
      outlet_id: Number(formOutletId),
      submitted_by: formSubmitter,
      item_name: formItemName,
      unit: formUnit,
      stok_awal: Number(formStokAwal || 0),
      stok_masuk: Number(formStokMasuk || 0),
      stok_keluar: Number(formStokKeluar || 0),
      transfer_masuk: Number(formTransferMasuk || 0),
      transfer_keluar: Number(formTransferKeluar || 0),
      stok_rusak: Number(formStokRusak || 0),
      stok_fisik: Number(formStokFisik || 0),
      status: 'acc_pending_send',
      approved_by: 'Admin / Owner',
      notes: formNotes || 'Telah di-ACC (Siap Kirim ke POS Mobile)'
    };

    if (index !== -1) {
      list[index] = updatedItem;
    } else {
      list.push(updatedItem);
    }

    setMasterData({
      ...masterData,
      _lastUpdated: Date.now(),
      approvedLogistics: list
    });

    setAccModalRecord(null);
    alert(`✅ Audit Stok Opname ${updatedItem.report_no || updatedItem.id} berhasil di-ACC!\nSilakan klik tombol "🚀 Kirim (Approve)" untuk mengirim status Approved ke POS Mobile APK.`);
  };

  const handleSendFinalApprovalLogistics = (log) => {
    const list = [...getLogisticsApprovals()];
    const index = list.findIndex(l => l.id === log.id);

    const updatedItem = {
      ...log,
      status: 'approved',
      approved_by: 'Admin / Owner',
      notes: log.notes || 'Disetujui & Terkirim ke POS Mobile APK'
    };

    if (index !== -1) list[index] = updatedItem;
    else list.unshift(updatedItem);

    const stockOpnameList = [...(masterData.stockOpname || [])];
    const opIdx = stockOpnameList.findIndex(o => o.id === log.id || o.report_no === log.report_no);
    if (opIdx !== -1) {
      stockOpnameList[opIdx] = { ...stockOpnameList[opIdx], status: 'approved' };
    } else {
      stockOpnameList.push({
        id: `op-app-${Date.now()}`,
        report_no: log.report_no || log.id,
        date: log.date,
        outlet_id: Number(log.outlet_id),
        item_name: log.item_name,
        unit: log.unit,
        stok_awal: Number(log.stok_awal || 0),
        stok_masuk: Number(log.stok_masuk || 0),
        stok_keluar: Number(log.stok_keluar || 0),
        transfer_masuk: Number(log.transfer_masuk || 0),
        transfer_keluar: Number(log.transfer_keluar || 0),
        stok_rusak: Number(log.stok_rusak || 0),
        stok_fisik: Number(log.stok_fisik || 0),
        status: 'approved',
        created_by: log.submitted_by
      });
    }

    setMasterData({
      ...masterData,
      _lastUpdated: Date.now(),
      approvedLogistics: list,
      stockOpname: stockOpnameList
    });

    alert(`🚀 Laporan Logistik ${log.report_no || log.id} BERHASIL DIKIRIM!\nStatus di POS Mobile APK telah berubah dari PENDING menjadi APPROVED.`);
  };

  const handleSaveEditLogistics = (e) => {
    e.preventDefault();
    if (!editModalRecord) return;

    const list = getLogisticsApprovals();
    const index = list.findIndex(l => l.id === editModalRecord.id);

    const updatedItem = {
      ...editModalRecord,
      date: formDate,
      outlet_id: Number(formOutletId),
      submitted_by: formSubmitter,
      item_name: formItemName,
      unit: formUnit,
      stok_awal: Number(formStokAwal || 0),
      stok_masuk: Number(formStokMasuk || 0),
      stok_keluar: Number(formStokKeluar || 0),
      transfer_masuk: Number(formTransferMasuk || 0),
      transfer_keluar: Number(formTransferKeluar || 0),
      stok_rusak: Number(formStokRusak || 0),
      stok_fisik: Number(formStokFisik || 0),
      status: formStatus,
      notes: formNotes
    };

    if (index !== -1) list[index] = updatedItem;

    setMasterData({
      ...masterData,
      approvedLogistics: list
    });

    setEditModalRecord(null);
    alert(`✅ Data Audit Stok Opname ${updatedItem.report_no || updatedItem.id} berhasil diperbarui.`);
  };

  const handleDeleteLogisticsRecord = (id) => {
    if (window.confirm(`Apakah Anda yakin ingin menghapus pengajuan laporan audit opname ${id}?`)) {
      const list = getLogisticsApprovals().filter(l => l.id !== id);
      setMasterData({ ...masterData, approvedLogistics: list });
      alert(`🗑️ Pengajuan laporan audit opname ${id} berhasil dihapus.`);
    }
  };

  // FINANCE ACC & EDIT HANDLERS (FISIK KAS = (PENDAPATAN - PENGELUARAN) - PENDAPATAN SELAIN CASH)
  const handleOpenAccFinanceModal = (fin) => {
    setAccFinanceModalRecord(fin);
    setFinFormDate(fin.date || new Date().toISOString().split('T')[0]);
    setFinFormOutletId(fin.outlet_id || 1);
    setFinFormShift(fin.shift || 'Pagi');
    setFinFormCashier(fin.cashier || 'Adi Wijaya (Kasir POS)');
    setFinFormGrossSales(fin.gross_sales || '0');
    setFinFormDiscount(fin.discount || '0');
    setFinFormNonCashSales(fin.non_cash_sales || '0');
    setFinFormCogsExpense(fin.cogs_expense || '0');
    setFinFormOpexExpense(fin.opex_expense || '0');
    setFinFormUtilitiesExpense(fin.utilities_expense || '0');
    setFinFormMarketingExpense(fin.marketing_expense || '0');
    setFinFormStatus(fin.status || 'ditunda');
    setFinFormNotes(fin.notes || '');
  };

  const handleOpenEditFinanceModal = (fin) => {
    setEditFinanceModalRecord(fin);
    setFinFormDate(fin.date || new Date().toISOString().split('T')[0]);
    setFinFormOutletId(fin.outlet_id || 1);
    setFinFormShift(fin.shift || 'Pagi');
    setFinFormCashier(fin.cashier || 'Adi Wijaya (Kasir POS)');
    setFinFormGrossSales(fin.gross_sales || '0');
    setFinFormDiscount(fin.discount || '0');
    setFinFormNonCashSales(fin.non_cash_sales || '0');
    setFinFormCogsExpense(fin.cogs_expense || '0');
    setFinFormOpexExpense(fin.opex_expense || '0');
    setFinFormUtilitiesExpense(fin.utilities_expense || '0');
    setFinFormMarketingExpense(fin.marketing_expense || '0');
    setFinFormStatus(fin.status || 'ditunda');
    setFinFormNotes(fin.notes || '');
  };

  const handleDirectAccFinance = (fin) => {
    const list = [...getFinanceApprovals()];
    const index = list.findIndex(f => f.id === fin.id);

    const updatedItem = {
      ...fin,
      status: 'acc_pending_send',
      approved_by: 'Admin / Owner',
      notes: fin.notes || 'Telah di-ACC (Siap Kirim ke POS Mobile)'
    };

    if (index !== -1) {
      list[index] = updatedItem;
    } else {
      list.unshift(updatedItem);
    }

    setMasterData({
      ...masterData,
      _lastUpdated: Date.now(),
      approvedFinanceDaily: list
    });

    alert(`✅ Penutupan Keuangan Kasir ${updatedItem.report_no || updatedItem.id} Berhasil Di-ACC!\nSilakan klik tombol "🚀 Kirim (Approve)" untuk merubah status PENDING menjadi APPROVED di POS Mobile APK.`);
  };

  const handleSendFinalApprovalFinance = (fin) => {
    const list = [...getFinanceApprovals()];
    const index = list.findIndex(f => f.id === fin.id);

    const updatedItem = {
      ...fin,
      status: 'approved',
      approved_by: 'Admin / Owner',
      notes: fin.notes || 'Penutupan keuangan kasir disetujui & terkirim ke POS Mobile'
    };

    if (index !== -1) list[index] = updatedItem;
    else list.unshift(updatedItem);

    // Sync status with shiftClosings / closedShifts array
    const shiftList = [...(masterData.shiftClosings || masterData.closedShifts || masterData.shift_closings || [])];
    const sIdx = shiftList.findIndex(s => String(s.id) === String(fin.id) || String(s.report_no) === String(fin.report_no));
    if (sIdx !== -1) {
      shiftList[sIdx] = { ...shiftList[sIdx], status: 'approved' };
    }

    const updatedIngredients = [...(masterData.ingredients || [])];
    const cogsItems = updatedItem.cogs_items || updatedItem.cogs_breakdown || [];

    cogsItems.forEach(item => {
      const itemQty = Number(item.qty || item.quantity || 1);
      const itemName = item.name || item.ingredient_name || 'Bahan Mentah';
      const foundIdx = updatedIngredients.findIndex(
        ing => ing.name.toLowerCase().trim() === itemName.toLowerCase().trim()
      );

      if (foundIdx !== -1) {
        updatedIngredients[foundIdx] = {
          ...updatedIngredients[foundIdx],
          stock: (Number(updatedIngredients[foundIdx].stock) || 0) + itemQty
        };
      } else {
        updatedIngredients.push({
          id: Date.now() + Math.random(),
          code: `BHN-${Math.floor(100 + Math.random() * 900)}`,
          name: itemName,
          unit: item.unit || 'kg',
          cost: Number(item.price_unit || item.amount || 10000),
          stock: itemQty
        });
      }
    });

    const newExpenses = (updatedItem.expenses_breakdown || []).map(exp => ({
      id: `EXP-ACC-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
      date: updatedItem.date,
      outlet_id: updatedItem.outlet_id,
      type: 'expense',
      category: exp.category || 'Biaya Operasional (OPEX)',
      name: exp.notes || exp.category || 'Biaya Kasir',
      amount: Number(exp.amount || 0),
      supplier: exp.supplier || '-',
      status: 'approved'
    }));

    setMasterData({
      ...masterData,
      _lastUpdated: Date.now(),
      ingredients: updatedIngredients,
      approvedFinanceDaily: list,
      shiftClosings: shiftList,
      closedShifts: shiftList,
      financialRecords: [...(masterData.financialRecords || []), ...newExpenses]
    });

    alert(`🚀 Penutupan Keuangan Kasir ${updatedItem.report_no || updatedItem.id} BERHASIL DIKIRIM!\nStatus di POS Mobile APK telah berubah dari PENDING menjadi APPROVED.`);
  };

  const handleSaveAccFinance = (e) => {
    e.preventDefault();
    if (!accFinanceModalRecord) return;

    const list = getFinanceApprovals();
    const index = list.findIndex(f => f.id === accFinanceModalRecord.id);

    const gross = Number(finFormGrossSales || 0);
    const disc = Number(finFormDiscount || 0);
    const net = gross - disc; // Pendapatan
    const nonCash = Number(finFormNonCashSales || 0); // Pendapatan selain cash

    const cogs = Number(finFormCogsExpense || 0);
    const opex = Number(finFormOpexExpense || 0);
    const util = Number(finFormUtilitiesExpense || 0);
    const mkt = Number(finFormMarketingExpense || 0);
    const totalExp = cogs + opex + util + mkt; // Pengeluaran

    // FISIK KAS = (PENDAPATAN - PENGELUARAN) - PENDAPATAN SELAIN CASH
    const calculatedFisikKas = (net - totalExp) - nonCash;

    const updatedItem = {
      ...accFinanceModalRecord,
      date: finFormDate,
      outlet_id: Number(finFormOutletId),
      shift: finFormShift,
      cashier: finFormCashier,
      gross_sales: gross,
      discount: disc,
      net_sales: net,
      non_cash_sales: nonCash,
      cogs_expense: cogs,
      opex_expense: opex,
      utilities_expense: util,
      marketing_expense: mkt,
      total_expense: totalExp,
      actual_cash: calculatedFisikKas,
      status: 'ok',
      approved_by: '',
      notes: finFormNotes || 'Penutupan keuangan kasir disetujui & didistribusikan'
    };

    if (index !== -1) list[index] = updatedItem;

    // AUTOMATICALLY DISTRIBUTE EXPENSES INTO FINANCIAL RECORDS / EXPENSES
    const newExpenses = [];
    const outletName = getOutletName(Number(finFormOutletId));

    if (cogs > 0) {
      newExpenses.push({
        id: `exp-cogs-${Date.now()}`,
        date: finFormDate,
        branch_name: outletName,
        type: 'expense',
        category: 'Bahan Baku & Dapur (COGS)',
        description: `Pengeluaran Kasir Dapur (${accFinanceModalRecord.report_no || accFinanceModalRecord.id})`,
        payment_method: 'Cash',
        amount: cogs,
        status: 'approved',
        type_input: 'by kasir'
      });
    }

    if (opex > 0) {
      newExpenses.push({
        id: `exp-opex-${Date.now() + 1}`,
        date: finFormDate,
        branch_name: outletName,
        type: 'expense',
        category: 'Operasional & Kebersihan',
        description: `Pengeluaran Operasional Kasir (${accFinanceModalRecord.report_no || accFinanceModalRecord.id})`,
        payment_method: 'Cash',
        amount: opex,
        status: 'approved',
        type_input: 'by kasir'
      });
    }

    if (util > 0) {
      newExpenses.push({
        id: `exp-util-${Date.now() + 2}`,
        date: finFormDate,
        branch_name: outletName,
        type: 'expense',
        category: 'Listrik, Air & Utilitas',
        description: `Pengeluaran Utilitas Kasir (${accFinanceModalRecord.report_no || accFinanceModalRecord.id})`,
        payment_method: 'Cash',
        amount: util,
        status: 'approved',
        type_input: 'by kasir'
      });
    }

    if (mkt > 0) {
      newExpenses.push({
        id: `exp-mkt-${Date.now() + 3}`,
        date: finFormDate,
        branch_name: outletName,
        type: 'expense',
        category: 'Beban Usaha & Pemasaran',
        description: `Pengeluaran Promo Kasir (${accFinanceModalRecord.report_no || accFinanceModalRecord.id})`,
        payment_method: 'Cash',
        amount: mkt,
        status: 'approved',
        type_input: 'by kasir'
      });
    }

    // Update ingredients stock from cogs_items / cogs_breakdown
    const updatedIngredients = [...(masterData.ingredients || [])];
    const cogsItems = updatedItem.cogs_items || updatedItem.cogs_breakdown || [];

    cogsItems.forEach(item => {
      const itemQty = Number(item.qty || item.quantity || 1);
      const itemName = item.name || item.ingredient_name || 'Bahan Mentah';
      const foundIdx = updatedIngredients.findIndex(
        ing => ing.name.toLowerCase().trim() === itemName.toLowerCase().trim()
      );

      if (foundIdx !== -1) {
        updatedIngredients[foundIdx] = {
          ...updatedIngredients[foundIdx],
          stock: (Number(updatedIngredients[foundIdx].stock) || 0) + itemQty
        };
      } else {
        updatedIngredients.push({
          id: Date.now() + Math.random(),
          code: `BHN-${Math.floor(100 + Math.random() * 900)}`,
          name: itemName,
          unit: item.unit || 'kg',
          cost: Number(item.price_unit || item.amount || 10000),
          stock: itemQty
        });
      }
    });

    setMasterData({
      ...masterData,
      ingredients: updatedIngredients,
      approvedFinanceDaily: list,
      financialRecords: [...(masterData.financialRecords || []), ...newExpenses]
    });

    setAccFinanceModalRecord(null);
    alert(`✅ Penutupan Keuangan Kasir ${updatedItem.report_no || updatedItem.id} berhasil di-ACC! Fisik Kas: ${formatRupiah(calculatedFisikKas)}, dan ${newExpenses.length} pos pengeluaran terdistribusi ke laporan biaya.`);
  };

  const handleSaveEditFinance = (e) => {
    e.preventDefault();
    if (!editFinanceModalRecord) return;

    const list = getFinanceApprovals();
    const index = list.findIndex(f => f.id === editFinanceModalRecord.id);

    const gross = Number(finFormGrossSales || 0);
    const disc = Number(finFormDiscount || 0);
    const net = gross - disc;
    const nonCash = Number(finFormNonCashSales || 0);

    const cogs = Number(finFormCogsExpense || 0);
    const opex = Number(finFormOpexExpense || 0);
    const util = Number(finFormUtilitiesExpense || 0);
    const mkt = Number(finFormMarketingExpense || 0);
    const totalExp = cogs + opex + util + mkt;

    // FISIK KAS = (PENDAPATAN - PENGELUARAN) - PENDAPATAN SELAIN CASH
    const calculatedFisikKas = (net - totalExp) - nonCash;

    const updatedItem = {
      ...editFinanceModalRecord,
      date: finFormDate,
      outlet_id: Number(finFormOutletId),
      shift: finFormShift,
      cashier: finFormCashier,
      gross_sales: gross,
      discount: disc,
      net_sales: net,
      non_cash_sales: nonCash,
      cogs_expense: cogs,
      opex_expense: opex,
      utilities_expense: util,
      marketing_expense: mkt,
      total_expense: totalExp,
      actual_cash: calculatedFisikKas,
      status: finFormStatus,
      notes: finFormNotes
    };

    if (index !== -1) list[index] = updatedItem;

    setMasterData({
      ...masterData,
      approvedFinanceDaily: list
    });

    setEditFinanceModalRecord(null);
    alert(`✅ Data Penutupan Keuangan Kasir ${updatedItem.report_no || updatedItem.id} berhasil diperbarui.`);
  };

  const handleDeleteFinanceRecord = (id) => {
    if (window.confirm(`Apakah Anda yakin ingin menghapus pengajuan penutupan keuangan kasir ${id}?`)) {
      const list = getFinanceApprovals().filter(f => f.id !== id);
      setMasterData({ ...masterData, approvedFinanceDaily: list });
      alert(`🗑️ Pengajuan penutupan keuangan kasir ${id} berhasil dihapus.`);
    }
  };

  // EXPORT HANDLERS FOR LOGISTICS
  const handleDownloadLogisticsExcel = () => {
    const list = getFilteredLogistics();
    const outletStr = selectedBranch ? (getOutletName(selectedBranch) || 'Semua Outlet Cabang') : 'Semua Outlet Cabang';
    const filename = buildExportFilename('persetujuan_stok_opname', outletStr, '2026-07-01', '2026-07-31', 'csv');

    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += `Laporan Persetujuan Audit Stok Opname - Outlet: ${outletStr}\n`;
    csvContent += `Nama Outlet,${outletStr}\n\n`;
    csvContent += "No Laporan Logistik,Tanggal Audit,Outlet Cabang,Pengaju (Mobile APK),Nama Item,Satuan,Stok Awal,Stok Masuk,Stok Keluar,Trans Masuk,Trans Keluar,Stok Rusak,Sisa Stok Sistem,Sisa Stok Fisik,Analisis Selisih,Status,Persetujuan Oleh,Catatan\n";

    list.forEach(item => {
      const sSistem = (item.stok_awal || 0) + (item.stok_masuk || 0) + (item.transfer_masuk || 0) - ((item.stok_keluar || 0) + (item.stok_rusak || 0) + (item.transfer_keluar || 0));
      const statusSelisih = getSelisihStatus(sSistem, item.stok_fisik || 0).text;
      csvContent += `"${item.report_no || item.id}","${item.date}","${getOutletName(item.outlet_id)}","${item.submitted_by}","${item.item_name}","${item.unit}",${item.stok_awal || 0},${item.stok_masuk || 0},${item.stok_keluar || 0},${item.transfer_masuk || 0},${item.transfer_keluar || 0},${item.stok_rusak || 0},${sSistem},${item.stok_fisik || 0},"${statusSelisih}","${item.status}","${item.approved_by || '-'}","${item.notes || '-'}"\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadLogisticsPDF = () => {
    const list = getFilteredLogistics();
    const outletStr = selectedBranch ? (getOutletName(selectedBranch) || 'Semua Outlet Cabang') : 'Semua Outlet Cabang';
    const pdfFilename = buildExportFilename('persetujuan_stok_opname', outletStr, '2026-07-01', '2026-07-31', 'pdf');

    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>${pdfFilename}</title>
          <style>
            body { font-family: sans-serif; padding: 20px; color: #1e293b; }
            h2 { color: #0f172a; margin-bottom: 4px; }
            p { font-size: 13px; color: #64748b; margin-top: 0; }
            table { width: 100%; border-collapse: collapse; margin-top: 16px; }
            th, td { border: 1px solid #cbd5e1; padding: 8px; text-align: left; font-size: 11px; }
            th { background-color: #f1f5f9; text-transform: uppercase; font-size: 10px; }
            .text-right { text-align: right; }
          </style>
        </head>
        <body>
          <h2>Laporan Persetujuan Audit Stok Opname Mobile APK</h2>
          <p>Outlet: ${outletStr} | Tanggal Cetak: ${new Date().toLocaleDateString('id-ID')}</p>
          <table>
            <thead>
              <tr>
                <th>No Laporan</th>
                <th>Tanggal</th>
                <th>Outlet Cabang</th>
                <th>Pengaju Mobile APK</th>
                <th>Nama Item</th>
                <th class="text-right">Sistem</th>
                <th class="text-right">Fisik</th>
                <th>Analisis Selisih</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${list.map(l => {
                const sSistem = (l.stok_awal || 0) + (l.stok_masuk || 0) + (l.transfer_masuk || 0) - ((l.stok_keluar || 0) + (l.stok_rusak || 0) + (l.transfer_keluar || 0));
                const statusSelisih = getSelisihStatus(sSistem, l.stok_fisik || 0).text;
                return `
                  <tr>
                    <td><b>${l.report_no || l.id}</b></td>
                    <td>${l.date}</td>
                    <td>🏢 ${getOutletName(l.outlet_id)}</td>
                    <td>${l.submitted_by}</td>
                    <td><b>${l.item_name}</b></td>
                    <td class="text-right">${sSistem} ${l.unit}</td>
                    <td class="text-right" style="color: #059669; font-weight: bold;">${l.stok_fisik || 0} ${l.unit}</td>
                    <td><b>${statusSelisih}</b></td>
                    <td><span style="font-weight:bold; color:${l.status === 'ok' || l.status === 'Approved' ? '#059669' : '#d97706'}">${l.status.toUpperCase()}</span></td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
          <script>window.print();</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // EXPORT HANDLERS FOR FINANCE (VARIANSI REMOVED, FISIK KAS FORMULA APPLIED)
  const handleDownloadFinanceExcel = () => {
    const list = getFilteredFinance();
    const outletStr = selectedBranch ? (getOutletName(selectedBranch) || 'Semua Outlet Cabang') : 'Semua Outlet Cabang';
    const filename = buildExportFilename('persetujuan_keuangan_kasir', outletStr, '2026-07-01', '2026-07-31', 'csv');

    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += `Laporan Persetujuan Keuangan Kasir Harian - Outlet: ${outletStr}\n`;
    csvContent += `Nama Outlet,${outletStr}\n\n`;
    csvContent += "No Laporan Keuangan,Tanggal Audit,Shift,Outlet Cabang,Kasir (Mobile APK),Omzet Net (Pendapatan),Total Pengeluaran,Pendapatan Selain Cash,Fisik Kas (Rumus),Status,Persetujuan Oleh,Catatan\n";

    list.forEach(f => {
      const net = f.net_sales || f.system_sales || 0;
      const totalExp = f.total_expense || 0;
      const nonCash = f.non_cash_sales || 0;
      const calculatedCash = (net - totalExp) - nonCash;
      csvContent += `"${f.report_no || f.id}","${f.date}","${f.shift}","${getOutletName(f.outlet_id)}","${f.cashier}",${net},${totalExp},${nonCash},${calculatedCash},"${f.status}","${f.approved_by || '-'}","${f.notes || '-'}"\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadFinancePDF = () => {
    const list = getFilteredFinance();
    const outletStr = selectedBranch ? (getOutletName(selectedBranch) || 'Semua Outlet Cabang') : 'Semua Outlet Cabang';
    const pdfFilename = buildExportFilename('persetujuan_keuangan_kasir', outletStr, '2026-07-01', '2026-07-31', 'pdf');

    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>${pdfFilename}</title>
          <style>
            body { font-family: sans-serif; padding: 20px; color: #1e293b; }
            h2 { color: #0f172a; margin-bottom: 4px; }
            p { font-size: 13px; color: #64748b; margin-top: 0; }
            table { width: 100%; border-collapse: collapse; margin-top: 16px; }
            th, td { border: 1px solid #cbd5e1; padding: 8px; text-align: left; font-size: 11px; }
            th { background-color: #f1f5f9; text-transform: uppercase; font-size: 10px; }
            .text-right { text-align: right; }
          </style>
        </head>
        <body>
          <h2>Laporan Persetujuan Keuangan Kasir Harian Mobile APK</h2>
          <p>Outlet: ${outletStr} | Tanggal Cetak: ${new Date().toLocaleDateString('id-ID')}</p>
          <table>
            <thead>
              <tr>
                <th>No Laporan</th>
                <th>Tanggal</th>
                <th>Outlet & Shift</th>
                <th>Kasir Mobile APK</th>
                <th class="text-right">Omzet Net</th>
                <th class="text-right">Total Biaya</th>
                <th class="text-right">Selain Cash</th>
                <th class="text-right">Fisik Kas</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${list.map(f => {
                const net = f.net_sales || f.system_sales || 0;
                const totalExp = f.total_expense || 0;
                const nonCash = f.non_cash_sales || 0;
                const calculatedCash = (net - totalExp) - nonCash;
                return `
                  <tr>
                    <td><b>${f.report_no || f.id}</b></td>
                    <td>${f.date}</td>
                    <td>🏢 ${getOutletName(f.outlet_id)} (${f.shift})</td>
                    <td>${f.cashier}</td>
                    <td class="text-right" style="color: #38bdf8; font-weight: bold;">${formatRupiah(net)}</td>
                    <td class="text-right" style="color: #fb7185;">${formatRupiah(totalExp)}</td>
                    <td class="text-right" style="color: #cbd5e1;">${formatRupiah(nonCash)}</td>
                    <td class="text-right" style="color: #34d399; font-weight: bold;">${formatRupiah(calculatedCash)}</td>
                    <td><span style="font-weight:bold; color:${f.status === 'ok' || f.status === 'Approved' ? '#059669' : '#d97706'}">${f.status.toUpperCase()}</span></td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
          <script>window.print();</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // TRANSFER & WASTE OTHER HANDLERS
  const handleApproveTransfer = (id) => {
    const list = [...(masterData.approvedTransfers || masterData.stockTransfer || [])];
    const index = list.findIndex(t => t.id === id);

    if (index !== -1) {
      const currentStatus = list[index].status;
      if (currentStatus !== 'acc_pending_send' && currentStatus !== 'approved' && currentStatus !== 'ok') {
        list[index] = { ...list[index], status: 'acc_pending_send', approved_by: 'Admin / Owner' };
        setMasterData({
          ...masterData,
          _lastUpdated: Date.now(),
          approvedTransfers: list,
          stockTransfer: list
        });
        alert(`✅ Transfer Stok ${id} berhasil di-ACC (Siap Kirim).\nKlik tombol "🚀 Kirim (Approve)" untuk merubah status di POS Mobile APK.`);
      } else {
        list[index] = { ...list[index], status: 'approved', is_approved: true, approved_by: 'Admin / Owner' };
        setMasterData({
          ...masterData,
          _lastUpdated: Date.now(),
          approvedTransfers: list,
          stockTransfer: list
        });
        alert(`🚀 Transfer Stok ${id} BERHASIL DIKIRIM!\nStatus di POS Mobile APK telah berubah dari PENDING menjadi APPROVED.`);
      }
    }
  };

  const handleApproveWaste = (id) => {
    const list = [...(masterData.approvedWaste || masterData.damagedGoods || [])];
    const index = list.findIndex(w => w.id === id);

    if (index !== -1) {
      const currentStatus = list[index].status;
      if (currentStatus !== 'acc_pending_send' && currentStatus !== 'approved' && currentStatus !== 'ok') {
        list[index] = { ...list[index], status: 'acc_pending_send', approved_by: 'Admin / Owner' };
        setMasterData({
          ...masterData,
          _lastUpdated: Date.now(),
          approvedWaste: list,
          damagedGoods: list
        });
        alert(`✅ Laporan Stok Rusak ${id} berhasil di-ACC (Siap Kirim).\nKlik tombol "🚀 Kirim (Approve)" untuk merubah status di POS Mobile APK.`);
      } else {
        list[index] = { ...list[index], status: 'approved', approved_by: 'Admin / Owner' };
        setMasterData({
          ...masterData,
          _lastUpdated: Date.now(),
          approvedWaste: list,
          damagedGoods: list
        });
        alert(`🚀 Laporan Stok Rusak ${id} BERHASIL DIKIRIM!\nStatus di POS Mobile APK telah berubah dari PENDING menjadi APPROVED.`);
      }
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }} className="animate-fade-in">
      <div>
        <h2 style={{ fontSize: '1.5rem', fontWeight: '800', color: '#f8fafc' }}>
          Persetujuan Manajemen (Approval Center)
        </h2>
        <p style={{ color: '#94a3b8', fontSize: '0.875rem', marginTop: '4px' }}>
          Pusat verifikasi & persetujuan pengajuan Mobile APK (Audit Stok Opname, Transfer, Stok Rusak, & Keuangan Kasir)
        </p>
      </div>

      {/* Sub-Tab Navigation Bar */}
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        <button
          onClick={() => setActiveSubTab('logistics')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 20px',
            borderRadius: '12px',
            border: '1px solid',
            borderColor: activeSubTab === 'logistics' ? '#6366f1' : '#334155',
            background: activeSubTab === 'logistics' ? 'rgba(99, 102, 241, 0.2)' : '#1e293b',
            color: activeSubTab === 'logistics' ? '#818cf8' : '#94a3b8',
            fontWeight: '700',
            fontSize: '0.85rem',
            cursor: 'pointer'
          }}
        >
          <Truck size={18} />
          <span>Persetujuan Laporan Logistik (Stok Opname)</span>
        </button>

        <button
          onClick={() => setActiveSubTab('transfer')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 20px',
            borderRadius: '12px',
            border: '1px solid',
            borderColor: activeSubTab === 'transfer' ? '#6366f1' : '#334155',
            background: activeSubTab === 'transfer' ? 'rgba(99, 102, 241, 0.2)' : '#1e293b',
            color: activeSubTab === 'transfer' ? '#818cf8' : '#94a3b8',
            fontWeight: '700',
            fontSize: '0.85rem',
            cursor: 'pointer'
          }}
        >
          <Truck size={18} />
          <span>Persetujuan Transfer Stok</span>
        </button>

        <button
          onClick={() => setActiveSubTab('waste')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 20px',
            borderRadius: '12px',
            border: '1px solid',
            borderColor: activeSubTab === 'waste' ? '#6366f1' : '#334155',
            background: activeSubTab === 'waste' ? 'rgba(99, 102, 241, 0.2)' : '#1e293b',
            color: activeSubTab === 'waste' ? '#818cf8' : '#94a3b8',
            fontWeight: '700',
            fontSize: '0.85rem',
            cursor: 'pointer'
          }}
        >
          <Trash2 size={18} />
          <span>Persetujuan Stok Rusak</span>
        </button>
      </div>

      {/* APPROVAL TABLES CONTENT */}
      <div className="glass-card" style={{ padding: '24px', background: '#0f172a', border: '1px solid #334155', borderRadius: '12px' }}>
        
        {/* SUBTAB 1: PERSETUJUAN LAPORAN LOGISTIK (STOK OPNAME) */}
        {activeSubTab === 'logistics' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            
            {/* ACTION BAR: FILTERS & DOWNLOAD BUTTONS */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                
                {/* 1. Filter Outlet */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#1e293b', padding: '6px 12px', borderRadius: '8px', border: '1px solid #334155' }}>
                  <Filter size={15} color="#94a3b8" />
                  <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: '600' }}>Outlet:</span>
                  <select
                    value={logisticsOutletFilter}
                    onChange={(e) => setLogisticsOutletFilter(e.target.value)}
                    style={{ background: 'transparent', border: 'none', color: '#f8fafc', fontSize: '0.82rem', fontWeight: '700', cursor: 'pointer', outline: 'none' }}
                  >
                    <option value="ALL" style={{ background: '#1e293b' }}>Semua Outlet Restoran</option>
                    {(masterData.outlets || []).map(o => (
                      <option key={o.id} value={o.id} style={{ background: '#1e293b' }}>🏢 {o.name}</option>
                    ))}
                  </select>
                </div>

                {/* 2. Filter Visibilitas Kolom */}
                <div style={{ position: 'relative', zIndex: showLogisticsColDropdown ? 999999 : 10 }}>
                  <button
                    onClick={() => setShowLogisticsColDropdown(!showLogisticsColDropdown)}
                    className="btn-secondary"
                    style={{ padding: '8px 12px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px', color: '#cbd5e1' }}
                  >
                    <SlidersHorizontal size={15} color="#818cf8" />
                    <span>Pilih Kolom Tabel</span>
                  </button>

                  {showLogisticsColDropdown && (
                    <div className="glass-card animate-fade-in" style={{
                      position: 'absolute', top: '110%', left: 0, zIndex: 999999, background: '#1e293b', border: '1.5px solid #6366f1', boxShadow: '0 20px 40px rgba(0,0,0,0.8), 0 0 20px rgba(99,102,241,0.3)', padding: '12px', width: '220px', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '8px'
                    }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: '800', color: '#f8fafc', borderBottom: '1px solid #334155', paddingBottom: '4px' }}>Visibilitas Kolom</span>
                      {Object.keys(visibleColsLogistics).map(col => (
                        <label key={col} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', color: '#cbd5e1', cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={visibleColsLogistics[col]}
                            onChange={() => setVisibleColsLogistics(prev => ({ ...prev, [col]: !prev[col] }))}
                            style={{ accentColor: '#6366f1' }}
                          />
                          <span>
                            {col === 'date' ? 'Tanggal' :
                             col === 'outlet' ? 'Outlet' :
                             col === 'reportNo' ? 'No Laporan' :
                             col === 'submitter' ? 'Pengaju' :
                             col === 'itemName' ? 'Nama Item' :
                             col === 'stokFisik' ? 'Sisa Stok Fisik' :
                             col === 'status' ? 'Status' : 'Aksi'}
                          </span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* 3. Tombol Download Excel & PDF */}
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <button onClick={handleDownloadLogisticsExcel} className="btn-secondary" style={{ padding: '8px 12px', fontSize: '0.8rem', color: '#34d399', borderColor: 'rgba(52, 211, 153, 0.3)', height: '38px' }}>
                  <FileSpreadsheet size={15} />
                  <span>Download Excel</span>
                </button>

                <button onClick={handleDownloadLogisticsPDF} className="btn-secondary" style={{ padding: '8px 12px', fontSize: '0.8rem', color: '#fb7185', borderColor: 'rgba(251, 113, 133, 0.3)', height: '38px' }}>
                  <Printer size={15} />
                  <span>Download PDF</span>
                </button>
              </div>
            </div>

            {/* TABEL PERSETUJUAN LAPORAN LOGISTIK (STOK OPNAME) */}
            <div style={{ overflowX: 'auto', border: '1px solid #334155', borderRadius: '10px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ background: '#1e293b', borderBottom: '1px solid #334155', color: '#cbd5e1', fontWeight: '800', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                    {visibleColsLogistics.date && <th style={{ padding: '12px 10px' }}>Tanggal Audit</th>}
                    {visibleColsLogistics.outlet && <th style={{ padding: '12px 10px' }}>Outlet</th>}
                    {visibleColsLogistics.reportNo && <th style={{ padding: '12px 10px' }}>No Laporan Logistik</th>}
                    {visibleColsLogistics.submitter && <th style={{ padding: '12px 10px' }}>Pengaju (Mobile APK)</th>}
                    {visibleColsLogistics.itemName && <th style={{ padding: '12px 10px' }}>Nama Item (Bahan)</th>}
                    {visibleColsLogistics.stokFisik && <th style={{ padding: '12px 10px', textAlign: 'right' }}>Sisa Stok Fisik</th>}
                    {visibleColsLogistics.status && <th style={{ padding: '12px 10px', textAlign: 'center' }}>Status</th>}
                    {visibleColsLogistics.actions && <th style={{ padding: '12px 10px', textAlign: 'center', width: '240px' }}>Tombol ACC & Aksi</th>}
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const filteredLogistics = getFilteredLogistics();
                    const totalLogistics = filteredLogistics.length;
                    const paginatedLogistics = filteredLogistics.slice((currentPageLogistics - 1) * pageSizeLogistics, currentPageLogistics * pageSizeLogistics);

                    if (paginatedLogistics.length === 0) {
                      return (
                        <tr>
                          <td colSpan={8} style={{ padding: '30px', textAlign: 'center', color: '#64748b' }}>
                            Tidak ada pengajuan laporan audit opname untuk outlet terpilih.
                          </td>
                        </tr>
                      );
                    }

                    return paginatedLogistics.map(log => {
                      const isOk = log.status === 'ok' || log.status === 'approved' || log.status === 'Approved';
                      return (
                        <tr key={log.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', color: '#f8fafc' }}>
                          
                          {/* Tanggal Audit */}
                          {visibleColsLogistics.date && (
                            <td style={{ padding: '12px 10px', color: '#94a3b8' }}>{log.date}</td>
                          )}

                          {/* Outlet */}
                          {visibleColsLogistics.outlet && (
                            <td style={{ padding: '12px 10px', fontWeight: '700' }}>🏢 {getOutletName(log.outlet_id)}</td>
                          )}

                          {/* No Laporan Logistik (Highlighted + Sorot/Click Preview Modal) */}
                          {visibleColsLogistics.reportNo && (
                            <td style={{ padding: '12px 10px' }}>
                              <span
                                onClick={() => setPreviewRecord(log)}
                                onMouseEnter={() => setPreviewRecord(log)}
                                style={{
                                  background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.2) 0%, rgba(56, 189, 248, 0.2) 100%)',
                                  color: '#38bdf8',
                                  border: '1px solid rgba(56, 189, 248, 0.4)',
                                  padding: '4px 10px',
                                  borderRadius: '6px',
                                  fontWeight: '800',
                                  fontSize: '0.8rem',
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '6px',
                                  boxShadow: '0 0 10px rgba(56, 189, 248, 0.15)'
                                }}
                                title="Sorot untuk melihat papan preview rincian audit opname"
                              >
                                <Eye size={13} color="#38bdf8" />
                                <span>{log.report_no || log.id}</span>
                              </span>
                            </td>
                          )}

                          {/* Pengaju */}
                          {visibleColsLogistics.submitter && (
                            <td style={{ padding: '12px 10px', color: '#cbd5e1', fontWeight: '600' }}>
                              👤 {log.submitted_by}
                            </td>
                          )}

                          {/* Nama Item Bahan Baku */}
                          {visibleColsLogistics.itemName && (
                            <td style={{ padding: '12px 10px', fontWeight: '800', color: '#34d399' }}>
                              {log.item_name}
                            </td>
                          )}

                          {/* Sisa Stok Fisik */}
                          {visibleColsLogistics.stokFisik && (
                            <td style={{ padding: '12px 10px', textAlign: 'right', fontWeight: '800', color: '#34d399' }}>
                              {log.stok_fisik || 0} {log.unit}
                            </td>
                          )}

                          {/* Status */}
                          {visibleColsLogistics.status && (
                            <td style={{ padding: '12px 10px', textAlign: 'center' }}>
                              <span style={{
                                padding: '3px 10px',
                                borderRadius: '6px',
                                fontSize: '0.75rem',
                                fontWeight: '800',
                                textTransform: 'lowercase',
                                background: isOk ? 'rgba(52, 211, 153, 0.15)' : (log.status === 'acc_pending_send' ? 'rgba(56, 189, 248, 0.15)' : 'rgba(245, 158, 11, 0.15)'),
                                color: isOk ? '#34d399' : (log.status === 'acc_pending_send' ? '#38bdf8' : '#fbbf24'),
                                border: '1px solid',
                                borderColor: isOk ? 'rgba(52, 211, 153, 0.3)' : (log.status === 'acc_pending_send' ? 'rgba(56, 189, 248, 0.3)' : 'rgba(245, 158, 11, 0.3)')
                              }}>
                                {isOk ? 'approved' : (log.status === 'acc_pending_send' ? 'ACC (siap kirim)' : 'ditunda')}
                              </span>
                            </td>
                          )}

                          {/* Tombol ACC, Kirim, Edit & Delete */}
                          {visibleColsLogistics.actions && (
                            <td style={{ padding: '12px 10px', display: 'flex', gap: '6px', justifyContent: 'center', alignItems: 'center' }}>
                              
                              {/* Step 1: Tombol ACC */}
                              {!isOk && log.status !== 'acc_pending_send' && (
                                <button
                                  onClick={() => handleOpenAccModal(log)}
                                  className="btn-emerald"
                                  style={{ padding: '5px 10px', fontSize: '0.75rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '4px' }}
                                  title="ACC pengajuan audit opname (Buka tahap kirim)"
                                >
                                  <CheckCircle2 size={13} />
                                  <span>ACC</span>
                                </button>
                              )}

                              {/* Step 2: Tombol Kirim (Approve) */}
                              {!isOk && log.status === 'acc_pending_send' && (
                                <button
                                  onClick={() => handleSendFinalApprovalLogistics(log)}
                                  style={{
                                    padding: '5px 12px', fontSize: '0.75rem', fontWeight: '900',
                                    background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                                    color: '#ffffff', border: 'none', borderRadius: '6px',
                                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px',
                                    boxShadow: '0 2px 8px rgba(2, 132, 199, 0.3)'
                                  }}
                                  title="Kirim status Approved ke POS Mobile APK"
                                >
                                  <span>🚀 Kirim (Approve)</span>
                                </button>
                              )}

                              {isOk && (
                                <span style={{ fontSize: '0.72rem', color: '#34d399', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '3px' }}>
                                  <ShieldCheck size={14} color="#34d399" />
                                  <span>Approved</span>
                                </span>
                              )}

                              {/* Tombol Edit */}
                              <button
                                onClick={() => handleOpenEditModal(log)}
                                style={{
                                  background: 'rgba(56, 189, 248, 0.15)', border: '1px solid rgba(56, 189, 248, 0.3)', color: '#38bdf8', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '3px'
                                }}
                                title="Edit data pengajuan audit opname"
                              >
                                <Edit3 size={12} />
                                <span>Edit</span>
                              </button>

                              {/* Tombol Delete */}
                              <button
                                onClick={() => handleDeleteLogisticsRecord(log.id)}
                                style={{
                                  background: 'rgba(244, 63, 94, 0.15)', border: '1px solid rgba(244, 63, 94, 0.3)', color: '#f43f5e', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '3px'
                                }}
                                title="Hapus pengajuan"
                              >
                                <Trash2 size={12} />
                                <span>Delete</span>
                              </button>

                            </td>
                          )}

                        </tr>
                      );
                    });
                  })()}
                </tbody>
              </table>
            </div>

            {/* PAGINATION CONTROLS FOR LOGISTICS */}
            <PaginationControls
              currentPage={currentPageLogistics}
              totalPages={Math.ceil(getFilteredLogistics().length / pageSizeLogistics) || 1}
              pageSize={pageSizeLogistics}
              totalItems={getFilteredLogistics().length}
              onPageChange={setCurrentPageLogistics}
              onPageSizeChange={setPageSizeLogistics}
            />
          </div>
        )}

        {/* SUBTAB 2: PERSETUJUAN KEUANGAN KASIR (HARIAN) - VARIANSI HILANG, FISIK KAS RUMUS */}
        {activeSubTab === 'finance' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            
            {/* ACTION BAR: FILTERS & DOWNLOAD BUTTONS */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                
                {/* 1. Filter Outlet */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#1e293b', padding: '6px 12px', borderRadius: '8px', border: '1px solid #334155' }}>
                  <Filter size={15} color="#94a3b8" />
                  <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: '600' }}>Outlet:</span>
                  <select
                    value={financeOutletFilter}
                    onChange={(e) => setFinanceOutletFilter(e.target.value)}
                    style={{ background: 'transparent', border: 'none', color: '#f8fafc', fontSize: '0.82rem', fontWeight: '700', cursor: 'pointer', outline: 'none' }}
                  >
                    <option value="ALL" style={{ background: '#1e293b' }}>Semua Outlet Restoran</option>
                    {(masterData.outlets || []).map(o => (
                      <option key={o.id} value={o.id} style={{ background: '#1e293b' }}>🏢 {o.name}</option>
                    ))}
                  </select>
                </div>

                {/* 2. Filter Visibilitas Kolom */}
                <div style={{ position: 'relative', zIndex: showFinanceColDropdown ? 999999 : 10 }}>
                  <button
                    onClick={() => setShowFinanceColDropdown(!showFinanceColDropdown)}
                    className="btn-secondary"
                    style={{ padding: '8px 12px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px', color: '#cbd5e1' }}
                  >
                    <SlidersHorizontal size={15} color="#818cf8" />
                    <span>Pilih Kolom Tabel</span>
                  </button>

                  {showFinanceColDropdown && (
                    <div className="glass-card animate-fade-in" style={{
                      position: 'absolute', top: '110%', left: 0, zIndex: 999999, background: '#1e293b', border: '1.5px solid #6366f1', boxShadow: '0 20px 40px rgba(0,0,0,0.8), 0 0 20px rgba(99,102,241,0.3)', padding: '12px', width: '220px', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '8px'
                    }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: '800', color: '#f8fafc', borderBottom: '1px solid #334155', paddingBottom: '4px' }}>Visibilitas Kolom</span>
                      {Object.keys(visibleColsFinance).map(col => (
                        <label key={col} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', color: '#cbd5e1', cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={visibleColsFinance[col]}
                            onChange={() => setVisibleColsFinance(prev => ({ ...prev, [col]: !prev[col] }))}
                            style={{ accentColor: '#6366f1' }}
                          />
                          <span>
                            {col === 'date' ? 'Tanggal' :
                             col === 'reportNo' ? 'No Laporan' :
                             col === 'outlet' ? 'Outlet & Shift' :
                             col === 'cashier' ? 'Kasir' :
                             col === 'netSales' ? 'Omzet Net' :
                             col === 'totalExpense' ? 'Total Biaya' :
                             col === 'actualCash' ? 'Fisik Kas (Rumus)' :
                             col === 'status' ? 'Status' : 'Aksi'}
                          </span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* 3. Tombol Download Excel & PDF */}
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <button onClick={handleDownloadFinanceExcel} className="btn-secondary" style={{ padding: '8px 12px', fontSize: '0.8rem', color: '#34d399', borderColor: 'rgba(52, 211, 153, 0.3)', height: '38px' }}>
                  <FileSpreadsheet size={15} />
                  <span>Download Excel</span>
                </button>

                <button onClick={handleDownloadFinancePDF} className="btn-secondary" style={{ padding: '8px 12px', fontSize: '0.8rem', color: '#fb7185', borderColor: 'rgba(251, 113, 133, 0.3)', height: '38px' }}>
                  <Printer size={15} />
                  <span>Download PDF</span>
                </button>
              </div>
            </div>

            {/* TABEL PERSETUJUAN KEUANGAN KASIR (VARIANSI DIHILANGKAN, FISIK KAS DENGAN RUMUS) */}
            <div style={{ overflowX: 'auto', border: '1px solid #334155', borderRadius: '10px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ background: '#1e293b', borderBottom: '1px solid #334155', color: '#cbd5e1', fontWeight: '800', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                    {visibleColsFinance.date && <th style={{ padding: '12px 10px' }}>Tanggal</th>}
                    {visibleColsFinance.reportNo && <th style={{ padding: '12px 10px' }}>No Laporan</th>}
                    {visibleColsFinance.outlet && <th style={{ padding: '12px 10px' }}>Outlet Cabang</th>}
                    {visibleColsFinance.cashier && <th style={{ padding: '12px 10px' }}>Kasir (Mobile APK)</th>}
                    {visibleColsFinance.netSales && <th style={{ padding: '12px 10px', textAlign: 'right' }}>Pendapatan (Net Sales)</th>}
                    {visibleColsFinance.nonCashSales && <th style={{ padding: '12px 10px', textAlign: 'right' }}>Penjualan Non-Cash</th>}
                    {visibleColsFinance.totalExpense && <th style={{ padding: '12px 10px', textAlign: 'right' }}>Total Pengeluaran</th>}
                    {visibleColsFinance.grossProfit && <th style={{ padding: '12px 10px', textAlign: 'right' }}>Laba Kotor</th>}
                    {visibleColsFinance.capitalReturn && <th style={{ padding: '12px 10px', textAlign: 'right' }}>Pengembalian Modal</th>}
                    {visibleColsFinance.actualCash && <th style={{ padding: '12px 10px', textAlign: 'right' }}>💵 Uang Di Laci</th>}
                    {visibleColsFinance.status && <th style={{ padding: '12px 10px', textAlign: 'center' }}>Status</th>}
                    {visibleColsFinance.actions && <th style={{ padding: '12px 10px', textAlign: 'center', width: '310px' }}>Tombol ACC & Aksi</th>}
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const filteredFinance = getFilteredFinance();
                    const totalFinance = filteredFinance.length;
                    const paginatedFinance = filteredFinance.slice((currentPageFinance - 1) * pageSizeFinance, currentPageFinance * pageSizeFinance);

                    if (paginatedFinance.length === 0) {
                      return (
                        <tr>
                          <td colSpan={12} style={{ padding: '30px', textAlign: 'center', color: '#64748b' }}>
                            Tidak ada pengajuan penutupan keuangan kasir untuk outlet terpilih.
                          </td>
                        </tr>
                      );
                    }

                    return paginatedFinance.map(fin => {
                      const isOk = fin.status === 'ok' || fin.status === 'Approved' || fin.status === 'approved';
                      
                      const net = fin.net_sales || fin.system_sales || 0;
                      const totalExp = fin.total_expense || 0;
                      const nonCash = fin.non_cash_sales || 0;
                      const debtPay = fin.debt_payment || 0;
                      const grossVal = net - totalExp;
                      const calculatedFisikKas = fin.cash_physical !== undefined ? fin.cash_physical : (grossVal - debtPay - nonCash);

                      return (
                        <tr key={fin.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', color: '#f8fafc' }}>
                          
                          {/* Tanggal */}
                          {visibleColsFinance.date && (
                            <td style={{ padding: '12px 10px', color: '#94a3b8' }}>{fin.date}</td>
                          )}

                          {/* No Laporan Keuangan (Highlighted + Sorot/Click Preview Modal) */}
                          {visibleColsFinance.reportNo && (
                            <td style={{ padding: '12px 10px' }}>
                              <span
                                onClick={() => setPreviewFinanceRecord(fin)}
                                onMouseEnter={() => setPreviewFinanceRecord(fin)}
                                style={{
                                  background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.2) 0%, rgba(99, 102, 241, 0.2) 100%)',
                                  color: '#38bdf8',
                                  border: '1px solid rgba(56, 189, 248, 0.4)',
                                  padding: '4px 10px',
                                  borderRadius: '6px',
                                  fontWeight: '800',
                                  fontSize: '0.8rem',
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '6px',
                                  boxShadow: '0 0 10px rgba(56, 189, 248, 0.15)'
                                }}
                                title="Sorot untuk melihat preview rincian pendapatan & pengeluaran kasir"
                              >
                                <Receipt size={13} color="#38bdf8" />
                                <span>{fin.report_no || fin.id}</span>
                              </span>
                            </td>
                          )}

                          {/* Outlet & Shift */}
                          {visibleColsFinance.outlet && (
                            <td style={{ padding: '12px 10px', fontWeight: '700' }}>
                              🏢 {fin.branch_name || getOutletName(fin.outlet_id)} {fin.shift ? <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: '500' }}>({fin.shift})</span> : null}
                            </td>
                          )}

                          {/* Kasir */}
                          {visibleColsFinance.cashier && (
                            <td style={{ padding: '12px 10px', color: '#cbd5e1', fontWeight: '600' }}>
                              👤 {fin.author_name || fin.cashier || fin.submitted_by || 'Kasir'}
                            </td>
                          )}

                          {/* Omzet Net Otomatis */}
                          {visibleColsFinance.netSales && (
                            <td style={{ padding: '12px 10px', textAlign: 'right', fontWeight: '800', color: '#34d399' }}>
                              {formatRupiah(net)}
                            </td>
                          )}

                          {/* Penjualan Non-Cash */}
                          {visibleColsFinance.nonCashSales && (
                            <td style={{ padding: '12px 10px', textAlign: 'right', color: '#38bdf8' }}>
                              {formatRupiah(nonCash)}
                            </td>
                          )}

                          {/* Total Pengeluaran */}
                          {visibleColsFinance.totalExpense && (
                            <td style={{ padding: '12px 10px', textAlign: 'right', fontWeight: '800', color: '#fb7185' }}>
                              -{formatRupiah(totalExp)}
                            </td>
                          )}

                          {/* Laba Kotor */}
                          {visibleColsFinance.grossProfit && (
                            <td style={{ padding: '12px 10px', textAlign: 'right', fontWeight: '800', color: grossVal >= 0 ? '#34d399' : '#fb7185' }}>
                              {formatRupiah(grossVal)}
                            </td>
                          )}

                          {/* Pengembalian Uang Modal */}
                          {visibleColsFinance.capitalReturn && (
                            <td style={{ padding: '12px 10px', textAlign: 'right', color: '#fbbf24' }}>
                              {debtPay ? formatRupiah(debtPay) : '-'}
                            </td>
                          )}

                          {/* Fisik Kas (Uang Di Laci) */}
                          {visibleColsFinance.actualCash && (
                            <td style={{ padding: '12px 10px', textAlign: 'right', fontWeight: '900', color: '#34d399' }}>
                              {formatRupiah(calculatedFisikKas)}
                            </td>
                          )}

                          {/* Status */}
                          {visibleColsFinance.status && (
                            <td style={{ padding: '12px 10px', textAlign: 'center' }}>
                              <span style={{
                                padding: '3px 10px',
                                borderRadius: '6px',
                                fontSize: '0.75rem',
                                fontWeight: '800',
                                textTransform: 'lowercase',
                                background: isOk ? 'rgba(52, 211, 153, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                                color: isOk ? '#34d399' : '#fbbf24',
                                border: '1px solid',
                                borderColor: isOk ? 'rgba(52, 211, 153, 0.3)' : 'rgba(245, 158, 11, 0.3)'
                              }}>
                                {isOk ? 'ok' : 'ditunda'}
                              </span>
                            </td>
                          )}

                          {/* Tombol ACC, Preview, Edit & Delete */}
                          {visibleColsFinance.actions && (
                            <td style={{ padding: '12px 10px', display: 'flex', gap: '6px', justifyContent: 'center', alignItems: 'center' }}>
                              
                              {/* Tombol ACC */}
                              {!isOk ? (
                                <button
                                  onClick={() => handleOpenAccFinanceModal(fin)}
                                  className="btn-emerald"
                                  style={{ padding: '5px 10px', fontSize: '0.75rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '4px' }}
                                  title="Setujui penutupan keuangan kasir (Buka papan informasi & edit)"
                                >
                                  <CheckCircle2 size={13} />
                                  <span>ACC</span>
                                </button>
                              ) : (
                                <span style={{ fontSize: '0.72rem', color: '#34d399', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '3px' }}>
                                  <ShieldCheck size={14} color="#34d399" />
                                  <span>Telah ACC</span>
                                </span>
                              )}

                              {/* Tombol Preview */}
                              <button
                                onClick={() => setPreviewFinanceRecord(fin)}
                                style={{
                                  background: 'rgba(99, 102, 241, 0.15)', border: '1px solid rgba(99, 102, 241, 0.3)', color: '#818cf8', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '3px'
                                }}
                                title="Lihat preview rincian pendapatan & pengeluaran kasir"
                              >
                                <Eye size={12} />
                                <span>Preview</span>
                              </button>

                              {/* Tombol Edit */}
                              <button
                                onClick={() => handleOpenEditFinanceModal(fin)}
                                style={{
                                  background: 'rgba(56, 189, 248, 0.15)', border: '1px solid rgba(56, 189, 248, 0.3)', color: '#38bdf8', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '3px'
                                }}
                                title="Edit data penutupan keuangan kasir"
                              >
                                <Edit3 size={12} />
                                <span>Edit</span>
                              </button>

                              {/* Tombol Delete */}
                              <button
                                onClick={() => handleDeleteFinanceRecord(fin.id)}
                                style={{
                                  background: 'rgba(244, 63, 94, 0.15)', border: '1px solid rgba(244, 63, 94, 0.3)', color: '#f43f5e', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '3px'
                                }}
                                title="Hapus laporan keuangan kasir"
                              >
                                <Trash2 size={12} />
                                <span>Delete</span>
                              </button>

                            </td>
                          )}

                        </tr>
                      );
                    });
                  })()}
                </tbody>
              </table>
            </div>

            {/* PAGINATION CONTROLS FOR FINANCE */}
            <PaginationControls
              currentPage={currentPageFinance}
              totalPages={Math.ceil(getFilteredFinance().length / pageSizeFinance) || 1}
              pageSize={pageSizeFinance}
              totalItems={getFilteredFinance().length}
              onPageChange={setCurrentPageFinance}
              onPageSizeChange={setPageSizeFinance}
            />
          </div>
        )}

        {/* SUBTAB 3: TRANSFER STOK */}
        {activeSubTab === 'transfer' && (
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '700', color: '#f8fafc', marginBottom: '16px' }}>
              Daftar Pengajuan Transfer Stok Antar Outlet
            </h3>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #334155', color: '#94a3b8', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                  <th style={{ padding: '10px' }}>ID Transfer</th>
                  <th style={{ padding: '10px' }}>Pengirim</th>
                  <th style={{ padding: '10px' }}>Penerima</th>
                  <th style={{ padding: '10px' }}>Nama Item</th>
                  <th style={{ padding: '10px', textAlign: 'right' }}>Qty</th>
                  <th style={{ padding: '10px', textAlign: 'center' }}>Status & Aksi</th>
                </tr>
              </thead>
              <tbody>
                {getTransferApprovals().map(tx => (
                  <tr key={tx.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', color: '#f8fafc' }}>
                    <td style={{ padding: '12px 10px', fontWeight: '700', color: '#818cf8' }}>{tx.id}</td>
                    <td style={{ padding: '12px 10px' }}>🏢 {getOutletName(tx.from_outlet_id)}</td>
                    <td style={{ padding: '12px 10px' }}>🏢 {getOutletName(tx.to_outlet_id)}</td>
                    <td style={{ padding: '12px 10px', fontWeight: '800', color: '#38bdf8' }}>{tx.item_name}</td>
                    <td style={{ padding: '12px 10px', textAlign: 'right' }}>{tx.qty} {tx.unit}</td>
                    <td style={{ padding: '12px 10px', textAlign: 'center' }}>
                      {tx.status === 'ok' || tx.status === 'Approved' ? (
                        <span style={{ color: '#34d399', fontWeight: '700', fontSize: '0.75rem' }}>✓ Disetujui (ok)</span>
                      ) : (
                        <button onClick={() => handleApproveTransfer(tx.id)} className="btn-emerald" style={{ padding: '6px 12px', fontSize: '0.75rem' }}>
                          <CheckCircle2 size={14} />
                          <span>Setujui Transfer</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* SUBTAB 4: STOK RUSAK */}
        {activeSubTab === 'waste' && (
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '700', color: '#f8fafc', marginBottom: '16px' }}>
              Daftar Pengajuan Stok Rusak (Waste)
            </h3>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #334155', color: '#94a3b8', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                  <th style={{ padding: '10px' }}>ID Rusak</th>
                  <th style={{ padding: '10px' }}>Outlet</th>
                  <th style={{ padding: '10px' }}>Nama Item</th>
                  <th style={{ padding: '10px', textAlign: 'right' }}>Qty Rusak</th>
                  <th style={{ padding: '10px' }}>Alasan / Catatan</th>
                  <th style={{ padding: '10px', textAlign: 'center' }}>Status & Aksi</th>
                </tr>
              </thead>
              <tbody>
                {getWasteApprovals().map(w => (
                  <tr key={w.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', color: '#f8fafc' }}>
                    <td style={{ padding: '12px 10px', fontWeight: '700', color: '#fb7185' }}>{w.id}</td>
                    <td style={{ padding: '12px 10px' }}>🏢 {getOutletName(w.outlet_id)}</td>
                    <td style={{ padding: '12px 10px', fontWeight: '800', color: '#fb7185' }}>{w.item_name}</td>
                    <td style={{ padding: '12px 10px', textAlign: 'right', fontWeight: '800', color: '#fb7185' }}>-{w.qty} {w.unit}</td>
                    <td style={{ padding: '12px 10px', color: '#94a3b8' }}>{w.notes}</td>
                    <td style={{ padding: '12px 10px', textAlign: 'center' }}>
                      {w.status === 'ok' || w.status === 'Approved' ? (
                        <span style={{ color: '#34d399', fontWeight: '700', fontSize: '0.75rem' }}>✓ Disetujui (ok)</span>
                      ) : (
                        <button onClick={() => handleApproveWaste(w.id)} className="btn-emerald" style={{ padding: '6px 12px', fontSize: '0.75rem' }}>
                          <CheckCircle2 size={14} />
                          <span>Setujui Rusak</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      </div>

      {/* LOGISTICS MODAL 1: PREVIEW AUDIT OPNAME */}
      {previewRecord && (() => {
        const sSistem = (previewRecord.stok_awal || 0) + (previewRecord.stok_masuk || 0) + (previewRecord.transfer_masuk || 0) - ((previewRecord.stok_keluar || 0) + (previewRecord.stok_rusak || 0) + (previewRecord.transfer_keluar || 0));
        const selisihStatus = getSelisihStatus(sSistem, previewRecord.stok_fisik || 0);
        const diffVal = (previewRecord.stok_fisik || 0) - sSistem;

        return (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 120 }}>
            <div className="glass-card animate-fade-in" style={{ padding: '24px', width: '480px', border: '1px solid #38bdf8', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #334155', paddingBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Package size={20} color="#38bdf8" />
                  <h3 style={{ fontSize: '1.1rem', fontWeight: '800', color: '#f8fafc' }}>
                    Papan Preview Audit Stok Opname
                  </h3>
                </div>
                <button onClick={() => setPreviewRecord(null)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontWeight: '800', fontSize: '1rem' }}>✕</button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.85rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', background: '#0f172a', padding: '8px 12px', borderRadius: '6px' }}>
                  <span style={{ color: '#94a3b8' }}>No. Laporan:</span>
                  <span style={{ fontWeight: '800', color: '#38bdf8' }}>{previewRecord.report_no || previewRecord.id}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', background: '#0f172a', padding: '8px 12px', borderRadius: '6px' }}>
                  <span style={{ color: '#94a3b8' }}>Tanggal Audit:</span>
                  <span style={{ fontWeight: '700', color: '#f8fafc' }}>{previewRecord.date}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', background: '#0f172a', padding: '8px 12px', borderRadius: '6px' }}>
                  <span style={{ color: '#94a3b8' }}>Restoran Outlet:</span>
                  <span style={{ fontWeight: '700', color: '#f8fafc' }}>🏢 {getOutletName(previewRecord.outlet_id)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', background: '#0f172a', padding: '8px 12px', borderRadius: '6px' }}>
                  <span style={{ color: '#94a3b8' }}>Pengaju (Mobile APK):</span>
                  <span style={{ fontWeight: '700', color: '#818cf8' }}>👤 {previewRecord.submitted_by}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', background: '#0f172a', padding: '8px 12px', borderRadius: '6px' }}>
                  <span style={{ color: '#94a3b8' }}>Nama Item (Bahan):</span>
                  <span style={{ fontWeight: '800', color: '#34d399' }}>{previewRecord.item_name} ({previewRecord.unit})</span>
                </div>

                <div style={{ background: '#0f172a', padding: '12px', borderRadius: '8px', border: '1px solid #334155', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: '800', color: '#cbd5e1', borderBottom: '1px solid #334155', paddingBottom: '4px' }}>Rincian Kuantitas Audit:</span>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', fontSize: '0.78rem' }}>
                    <div>Stok Awal: <b>{previewRecord.stok_awal || 0}</b></div>
                    <div>Stok Masuk: <b style={{ color: '#38bdf8' }}>+{previewRecord.stok_masuk || 0}</b></div>
                    <div>Stok Keluar: <b style={{ color: '#fb7185' }}>-{previewRecord.stok_keluar || 0}</b></div>
                    <div>Trans Masuk: <b style={{ color: '#34d399' }}>+{previewRecord.transfer_masuk || 0}</b></div>
                    <div>Trans Keluar: <b style={{ color: '#fb7185' }}>-{previewRecord.transfer_keluar || 0}</b></div>
                    <div>Stok Rusak: <b style={{ color: '#fb7185' }}>-{previewRecord.stok_rusak || 0}</b></div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #334155', paddingTop: '6px', marginTop: '4px', fontSize: '0.82rem' }}>
                    <span>Sisa Stok Sistem: <b>{sSistem} {previewRecord.unit}</b></span>
                    <span>Sisa Stok Fisik: <b style={{ color: '#34d399' }}>{previewRecord.stok_fisik || 0} {previewRecord.unit}</b></span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2px' }}>
                    <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Analisis Selisih:</span>
                    <span style={{
                      padding: '2px 8px', borderRadius: '6px', fontSize: '0.72rem', fontWeight: '800',
                      color: selisihStatus.color, background: selisihStatus.bg, border: `1px solid ${selisihStatus.border}`
                    }}>
                      {selisihStatus.text} ({diffVal > 0 ? `+${diffVal}` : diffVal === 0 ? '0' : `-${Math.abs(diffVal)}`})
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', background: '#0f172a', padding: '8px 12px', borderRadius: '6px' }}>
                  <span style={{ color: '#94a3b8' }}>Status Pengajuan:</span>
                  <span style={{ fontWeight: '800', textTransform: 'lowercase', color: previewRecord.status === 'ok' ? '#34d399' : '#fbbf24' }}>
                    {previewRecord.status}
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
                <button onClick={() => setPreviewRecord(null)} className="btn-primary" style={{ padding: '8px 16px', fontSize: '0.8rem' }}>
                  Tutup Preview
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* FINANCE MODAL 1: PREVIEW LAPORAN KEUANGAN KASIR (FISIK KAS RUMUS: (PENDAPATAN - PENGELUARAN) - PENDAPATAN SELAIN CASH) */}
      {previewFinanceRecord && (() => {
        const net = previewFinanceRecord.net_sales || previewFinanceRecord.system_sales || 0;
        const totalExp = previewFinanceRecord.total_expense || 0;
        const nonCash = previewFinanceRecord.non_cash_sales || 0;
        const calculatedFisikKas = (net - totalExp) - nonCash;

        return (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 120 }}>
            <div className="glass-card animate-fade-in" style={{ padding: '24px', width: '500px', border: '1px solid #38bdf8', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #334155', paddingBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Receipt size={20} color="#38bdf8" />
                  <h3 style={{ fontSize: '1.1rem', fontWeight: '800', color: '#f8fafc' }}>
                    Preview Laporan Keuangan Kasir Harian
                  </h3>
                </div>
                <button onClick={() => setPreviewFinanceRecord(null)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontWeight: '800', fontSize: '1rem' }}>✕</button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.85rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', background: '#0f172a', padding: '8px 12px', borderRadius: '6px' }}>
                  <span style={{ color: '#94a3b8' }}>No. Laporan Keuangan:</span>
                  <span style={{ fontWeight: '800', color: '#38bdf8' }}>{previewFinanceRecord.report_no || previewFinanceRecord.id}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', background: '#0f172a', padding: '8px 12px', borderRadius: '6px' }}>
                  <span style={{ color: '#94a3b8' }}>Tanggal & Shift:</span>
                  <span style={{ fontWeight: '700', color: '#f8fafc' }}>{previewFinanceRecord.date} ({previewFinanceRecord.shift})</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', background: '#0f172a', padding: '8px 12px', borderRadius: '6px' }}>
                  <span style={{ color: '#94a3b8' }}>Restoran Outlet:</span>
                  <span style={{ fontWeight: '700', color: '#f8fafc' }}>🏢 {getOutletName(previewFinanceRecord.outlet_id)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', background: '#0f172a', padding: '8px 12px', borderRadius: '6px' }}>
                  <span style={{ color: '#94a3b8' }}>Kasir (Mobile APK):</span>
                  <span style={{ fontWeight: '700', color: '#818cf8' }}>👤 {previewFinanceRecord.cashier}</span>
                </div>

                {/* PENDAPATAN OTOMATIS */}
                <div style={{ background: '#0f172a', padding: '10px 12px', borderRadius: '8px', border: '1px solid rgba(56, 189, 248, 0.3)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: '800', color: '#38bdf8' }}>⚡ Pendapatan Penjualan Kasir (Otomatis):</span>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                    <span>Omzet Kotor (Gross):</span>
                    <span>{formatRupiah(previewFinanceRecord.gross_sales || previewFinanceRecord.system_sales)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#fb7185' }}>
                    <span>Diskon Penjualan:</span>
                    <span>-{formatRupiah(previewFinanceRecord.discount || 0)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', fontWeight: '800', color: '#38bdf8', borderTop: '1px solid #334155', paddingTop: '4px', marginTop: '2px' }}>
                    <span>Omzet Bersih (Pendapatan):</span>
                    <span>{formatRupiah(net)}</span>
                  </div>
                </div>

                {/* BREAKDOWN PENGELUARAN BIAYA */}
                <div style={{ background: '#0f172a', padding: '10px 12px', borderRadius: '8px', border: '1px solid rgba(251, 113, 133, 0.3)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: '800', color: '#fb7185' }}>💸 Breakdown Pengeluaran (Terdistribusi):</span>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem' }}>
                    <span>• Bahan Baku & Dapur (COGS):</span>
                    <span>{formatRupiah(previewFinanceRecord.cogs_expense || 0)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem' }}>
                    <span>• Operasional & Kebersihan (OPEX):</span>
                    <span>{formatRupiah(previewFinanceRecord.opex_expense || 0)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem' }}>
                    <span>• Utilitas (Gas LPG & Air):</span>
                    <span>{formatRupiah(previewFinanceRecord.utilities_expense || 0)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem' }}>
                    <span>• Pemasaran / Promo:</span>
                    <span>{formatRupiah(previewFinanceRecord.marketing_expense || 0)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', fontWeight: '800', color: '#fb7185', borderTop: '1px solid #334155', paddingTop: '4px', marginTop: '2px' }}>
                    <span>Total Pengeluaran Kasir:</span>
                    <span>-{formatRupiah(totalExp)}</span>
                  </div>
                </div>

                {/* KALKULASI FISIK KASSESUAI RUMUS */}
                <div style={{ background: '#0f172a', padding: '10px 12px', borderRadius: '8px', border: '1px solid #34d399', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: '800', color: '#34d399' }}>💵 Kalkulasi Fisik Kas Ditutup (Rumus Eksplisit):</span>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem' }}>
                    <span style={{ color: '#94a3b8' }}>Pendapatan Bersih:</span>
                    <span>{formatRupiah(net)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: '#fb7185' }}>
                    <span>Dikurangi Pengeluaran:</span>
                    <span>-{formatRupiah(totalExp)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: '#cbd5e1' }}>
                    <span>Dikurangi Pendapatan Selain Cash (Non-Cash/QRIS):</span>
                    <span>-{formatRupiah(nonCash)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem', fontWeight: '900', color: '#34d399', borderTop: '1px solid #334155', paddingTop: '6px', marginTop: '2px' }}>
                    <span>Fisik Kas (Rumus: (Pendapatan - Pengeluaran) - Selain Cash):</span>
                    <span>{formatRupiah(calculatedFisikKas)}</span>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', background: '#0f172a', padding: '8px 12px', borderRadius: '6px' }}>
                  <span style={{ color: '#94a3b8' }}>Status Pengajuan:</span>
                  <span style={{ fontWeight: '800', textTransform: 'lowercase', color: previewFinanceRecord.status === 'ok' ? '#34d399' : '#fbbf24' }}>
                    {previewFinanceRecord.status}
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
                <button onClick={() => setPreviewFinanceRecord(null)} className="btn-primary" style={{ padding: '8px 16px', fontSize: '0.8rem' }}>
                  Tutup Preview
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* LOGISTICS MODAL 2: EDITABLE ACC MODAL */}
      {accModalRecord && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 120 }}>
          <form onSubmit={handleSaveAccLogistics} className="glass-card animate-fade-in" style={{ padding: '24px', width: '500px', border: '1px solid #34d399', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #334155', paddingBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle2 size={20} color="#34d399" />
                <h3 style={{ fontSize: '1.1rem', fontWeight: '800', color: '#f8fafc' }}>
                  Papan Informasi ACC Audit Stok Opname
                </h3>
              </div>
              <button type="button" onClick={() => setAccModalRecord(null)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontWeight: '800', fontSize: '1rem' }}>✕</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: '700' }}>Tanggal Audit</span>
                <input type="date" value={formDate} onChange={e => setFormDate(e.target.value)} style={{ padding: '8px', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', color: 'white', fontSize: '0.82rem' }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: '700' }}>Dibuat Oleh (Hak User)</span>
                <select value={formSubmitter} onChange={e => setFormSubmitter(e.target.value)} style={{ padding: '8px', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', color: 'white', fontSize: '0.82rem' }}>
                  {userRightsList.map(u => <option key={u.id} value={`${u.name} (${u.role})`}>{u.name} ({u.role})</option>)}
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: '700' }}>Restoran Outlet</span>
              <select value={formOutletId} onChange={e => setFormOutletId(Number(e.target.value))} style={{ padding: '8px', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', color: 'white', fontSize: '0.82rem' }}>
                {(masterData.outlets || []).map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: '700' }}>Cari & Pilih Nama Item (Bahan Baku)</span>
              <input
                type="text"
                placeholder="Ketik untuk mencari bahan..."
                value={formSearchQuery}
                onChange={e => setFormSearchQuery(e.target.value)}
                style={{ padding: '8px', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px 6px 0 0', color: 'white', fontSize: '0.82rem' }}
              />
              <select
                value={formIngredientId}
                onChange={e => {
                  const val = Number(e.target.value);
                  setFormIngredientId(val);
                  const found = ingredientsList.find(i => i.id === val);
                  if (found) {
                    setFormItemName(found.name);
                    setFormUnit(found.unit || 'kg');
                  }
                }}
                style={{ padding: '8px', background: '#1e293b', border: '1px solid #334155', borderTop: 'none', borderRadius: '0 0 6px 6px', color: 'white', fontSize: '0.82rem', cursor: 'pointer' }}
              >
                {ingredientsList.filter(i => i.name.toLowerCase().includes(formSearchQuery.toLowerCase())).map(i => (
                  <option key={i.id} value={i.id}>{i.name}</option>
                ))}
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: '700' }}>Stok Awal</span>
                <input type="number" value={formStokAwal} onChange={e => setFormStokAwal(e.target.value)} style={{ padding: '8px', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', color: 'white', fontSize: '0.8rem' }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: '700' }}>Stok Masuk</span>
                <input type="number" value={formStokMasuk} onChange={e => setFormStokMasuk(e.target.value)} style={{ padding: '8px', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', color: 'white', fontSize: '0.8rem' }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: '700' }}>Stok Keluar</span>
                <input type="number" value={formStokKeluar} onChange={e => setFormStokKeluar(e.target.value)} style={{ padding: '8px', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', color: 'white', fontSize: '0.8rem' }} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: '700' }}>Trans. Masuk</span>
                <input type="number" value={formTransferMasuk} onChange={e => setFormTransferMasuk(e.target.value)} style={{ padding: '8px', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', color: 'white', fontSize: '0.8rem' }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: '700' }}>Trans. Keluar</span>
                <input type="number" value={formTransferKeluar} onChange={e => setFormTransferKeluar(e.target.value)} style={{ padding: '8px', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', color: 'white', fontSize: '0.8rem' }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: '700' }}>Stok Rusak</span>
                <input type="number" value={formStokRusak} onChange={e => setFormStokRusak(e.target.value)} style={{ padding: '8px', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', color: 'white', fontSize: '0.8rem' }} />
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ fontSize: '0.75rem', color: '#34d399', fontWeight: '800' }}>Sisa Stok Fisik ({formUnit})</span>
              <input type="number" value={formStokFisik} onChange={e => setFormStokFisik(e.target.value)} style={{ padding: '8px', background: '#0f172a', border: '1px solid #34d399', borderRadius: '6px', color: 'white', fontSize: '0.85rem', fontWeight: '800' }} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: '700' }}>Catatan Audit / Selisih</span>
              <input type="text" placeholder="Tambahkan catatan verifikasi opname..." value={formNotes} onChange={e => setFormNotes(e.target.value)} style={{ padding: '8px', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', color: 'white', fontSize: '0.82rem' }} />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
              <button type="button" onClick={() => setAccModalRecord(null)} className="btn-secondary" style={{ padding: '8px 16px', fontSize: '0.8rem' }}>Batal</button>
              <button type="submit" className="btn-emerald" style={{ padding: '8px 16px', fontSize: '0.8rem', fontWeight: '800' }}>
                ✓ Simpan & Ubah Status Jadi OK
              </button>
            </div>
          </form>
        </div>
      )}

      {/* FINANCE MODAL 2: PAPAN INFORMASI ACC KEUANGAN KASIR (Editable with Fisik Kas Formula) */}
      {accFinanceModalRecord && (() => {
        const netCalc = Number(finFormGrossSales || 0) - Number(finFormDiscount || 0);
        const expCalc = Number(finFormCogsExpense || 0) + Number(finFormOpexExpense || 0) + Number(finFormUtilitiesExpense || 0) + Number(finFormMarketingExpense || 0);
        const autoFisikKas = (netCalc - expCalc) - Number(finFormNonCashSales || 0);

        return (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 120 }}>
            <form onSubmit={handleSaveAccFinance} className="glass-card animate-fade-in" style={{ padding: '24px', width: '520px', border: '1px solid #34d399', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #334155', paddingBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <CheckCircle2 size={20} color="#34d399" />
                  <h3 style={{ fontSize: '1.1rem', fontWeight: '800', color: '#f8fafc' }}>
                    Papan Informasi ACC Keuangan Kasir
                  </h3>
                </div>
                <button type="button" onClick={() => setAccFinanceModalRecord(null)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontWeight: '800', fontSize: '1rem' }}>✕</button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: '700' }}>Tanggal Penutupan</span>
                  <input type="date" value={finFormDate} onChange={e => setFinFormDate(e.target.value)} style={{ padding: '8px', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', color: 'white', fontSize: '0.82rem' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: '700' }}>Shift Kasir</span>
                  <input type="text" value={finFormShift} onChange={e => setFinFormShift(e.target.value)} style={{ padding: '8px', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', color: 'white', fontSize: '0.82rem' }} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: '700' }}>Restoran Outlet</span>
                  <select value={finFormOutletId} onChange={e => setFinFormOutletId(Number(e.target.value))} style={{ padding: '8px', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', color: 'white', fontSize: '0.82rem' }}>
                    {(masterData.outlets || []).map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                  </select>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: '700' }}>Kasir (Hak User)</span>
                  <select value={finFormCashier} onChange={e => setFinFormCashier(e.target.value)} style={{ padding: '8px', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', color: 'white', fontSize: '0.82rem' }}>
                    {userRightsList.map(u => <option key={u.id} value={`${u.name} (${u.role})`}>{u.name} ({u.role})</option>)}
                  </select>
                </div>
              </div>

              {/* PENDAPATAN & PENDAPATAN SELAIN CASH */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', background: '#0f172a', padding: '10px', borderRadius: '8px', border: '1px solid rgba(56, 189, 248, 0.3)' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ fontSize: '0.68rem', color: '#38bdf8', fontWeight: '700' }}>Omzet Kotor (Gross)</span>
                  <input type="number" value={finFormGrossSales} onChange={e => setFinFormGrossSales(e.target.value)} style={{ padding: '6px', background: '#1e293b', border: '1px solid #334155', borderRadius: '6px', color: 'white', fontSize: '0.78rem', fontWeight: '700' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ fontSize: '0.68rem', color: '#fb7185', fontWeight: '700' }}>Diskon</span>
                  <input type="number" value={finFormDiscount} onChange={e => setFinFormDiscount(e.target.value)} style={{ padding: '6px', background: '#1e293b', border: '1px solid #334155', borderRadius: '6px', color: 'white', fontSize: '0.78rem' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ fontSize: '0.68rem', color: '#818cf8', fontWeight: '700' }}>Selain Cash (QRIS)</span>
                  <input type="number" value={finFormNonCashSales} onChange={e => setFinFormNonCashSales(e.target.value)} style={{ padding: '6px', background: '#1e293b', border: '1px solid #818cf8', borderRadius: '6px', color: 'white', fontSize: '0.78rem', fontWeight: '700' }} />
                </div>
              </div>

              {/* BREAKDOWN PENGELUARAN (PENGELOMPOKAN BIAYA) */}
              <div style={{ background: '#0f172a', padding: '10px', borderRadius: '8px', border: '1px solid rgba(251, 113, 133, 0.3)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: '800', color: '#fb7185' }}>Rincian Pengeluaran Biaya Kasir:</span>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                    <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>• Bahan Baku (COGS)</span>
                    <input type="number" value={finFormCogsExpense} onChange={e => setFinFormCogsExpense(e.target.value)} style={{ padding: '6px 8px', background: '#1e293b', border: '1px solid #334155', borderRadius: '4px', color: 'white', fontSize: '0.78rem' }} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                    <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>• Operasional (OPEX)</span>
                    <input type="number" value={finFormOpexExpense} onChange={e => setFinFormOpexExpense(e.target.value)} style={{ padding: '6px 8px', background: '#1e293b', border: '1px solid #334155', borderRadius: '4px', color: 'white', fontSize: '0.78rem' }} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                    <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>• Utilitas (LPG & Air)</span>
                    <input type="number" value={finFormUtilitiesExpense} onChange={e => setFinFormUtilitiesExpense(e.target.value)} style={{ padding: '6px 8px', background: '#1e293b', border: '1px solid #334155', borderRadius: '4px', color: 'white', fontSize: '0.78rem' }} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                    <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>• Pemasaran / Promo</span>
                    <input type="number" value={finFormMarketingExpense} onChange={e => setFinFormMarketingExpense(e.target.value)} style={{ padding: '6px 8px', background: '#1e293b', border: '1px solid #334155', borderRadius: '4px', color: 'white', fontSize: '0.78rem' }} />
                  </div>
                </div>
              </div>

              {/* AUTOMATICALLY CALCULATED FISIK KAS DISPLAY */}
              <div style={{ background: 'rgba(52, 211, 153, 0.12)', padding: '10px 14px', borderRadius: '8px', border: '1px solid rgba(52, 211, 153, 0.3)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '0.78rem', color: '#34d399', fontWeight: '800' }}>Fisik Kas Ditutup (Kalkulasi Otomatis)</span>
                  <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>Rumus: (Pendapatan - Pengeluaran) - Selain Cash</span>
                </div>
                <span style={{ fontSize: '1.1rem', fontWeight: '900', color: '#34d399' }}>
                  {formatRupiah(autoFisikKas)}
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: '700' }}>Catatan Penutupan Kasir</span>
                <input type="text" placeholder="Catatan selisih kas / verifikasi..." value={finFormNotes} onChange={e => setFinFormNotes(e.target.value)} style={{ padding: '8px', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', color: 'white', fontSize: '0.82rem' }} />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
                <button type="button" onClick={() => setAccFinanceModalRecord(null)} className="btn-secondary" style={{ padding: '8px 16px', fontSize: '0.8rem' }}>Batal</button>
                <button type="submit" className="btn-emerald" style={{ padding: '8px 16px', fontSize: '0.8rem', fontWeight: '800' }}>
                  ✓ Simpan & Ubah Status Jadi OK
                </button>
              </div>
            </form>
          </div>
        );
      })()}

      {/* FINANCE MODAL 3: EDIT PENGAJUAN KEUANGAN KASIR */}
      {editFinanceModalRecord && (() => {
        const netCalc = Number(finFormGrossSales || 0) - Number(finFormDiscount || 0);
        const expCalc = Number(finFormCogsExpense || 0) + Number(finFormOpexExpense || 0) + Number(finFormUtilitiesExpense || 0) + Number(finFormMarketingExpense || 0);
        const autoFisikKas = (netCalc - expCalc) - Number(finFormNonCashSales || 0);

        return (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 120 }}>
            <form onSubmit={handleSaveEditFinance} className="glass-card animate-fade-in" style={{ padding: '24px', width: '520px', border: '1px solid #38bdf8', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #334155', paddingBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Edit3 size={20} color="#38bdf8" />
                  <h3 style={{ fontSize: '1.1rem', fontWeight: '800', color: '#f8fafc' }}>
                    Edit Laporan Keuangan Kasir
                  </h3>
                </div>
                <button type="button" onClick={() => setEditFinanceModalRecord(null)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontWeight: '800', fontSize: '1rem' }}>✕</button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: '700' }}>Tanggal Penutupan</span>
                  <input type="date" value={finFormDate} onChange={e => setFinFormDate(e.target.value)} style={{ padding: '8px', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', color: 'white', fontSize: '0.82rem' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: '700' }}>Shift Kasir</span>
                  <input type="text" value={finFormShift} onChange={e => setFinFormShift(e.target.value)} style={{ padding: '8px', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', color: 'white', fontSize: '0.82rem' }} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: '700' }}>Restoran Outlet</span>
                  <select value={finFormOutletId} onChange={e => setFinFormOutletId(Number(e.target.value))} style={{ padding: '8px', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', color: 'white', fontSize: '0.82rem' }}>
                    {(masterData.outlets || []).map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                  </select>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: '700' }}>Kasir (Hak User)</span>
                  <select value={finFormCashier} onChange={e => setFinFormCashier(e.target.value)} style={{ padding: '8px', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', color: 'white', fontSize: '0.82rem' }}>
                    {userRightsList.map(u => <option key={u.id} value={`${u.name} (${u.role})`}>{u.name} ({u.role})</option>)}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', background: '#0f172a', padding: '10px', borderRadius: '8px', border: '1px solid rgba(56, 189, 248, 0.3)' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ fontSize: '0.68rem', color: '#38bdf8', fontWeight: '700' }}>Omzet Kotor</span>
                  <input type="number" value={finFormGrossSales} onChange={e => setFinFormGrossSales(e.target.value)} style={{ padding: '6px', background: '#1e293b', border: '1px solid #334155', borderRadius: '6px', color: 'white', fontSize: '0.78rem' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ fontSize: '0.68rem', color: '#fb7185', fontWeight: '700' }}>Diskon</span>
                  <input type="number" value={finFormDiscount} onChange={e => setFinFormDiscount(e.target.value)} style={{ padding: '6px', background: '#1e293b', border: '1px solid #334155', borderRadius: '6px', color: 'white', fontSize: '0.78rem' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ fontSize: '0.68rem', color: '#818cf8', fontWeight: '700' }}>Selain Cash</span>
                  <input type="number" value={finFormNonCashSales} onChange={e => setFinFormNonCashSales(e.target.value)} style={{ padding: '6px', background: '#1e293b', border: '1px solid #818cf8', borderRadius: '6px', color: 'white', fontSize: '0.78rem' }} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ fontSize: '0.75rem', color: '#34d399', fontWeight: '800' }}>Fisik Kas (Hitung Otomatis)</span>
                  <div style={{ padding: '8px', background: '#0f172a', border: '1px solid #34d399', borderRadius: '6px', color: '#34d399', fontSize: '0.82rem', fontWeight: '800' }}>
                    {formatRupiah(autoFisikKas)}
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: '700' }}>Status</span>
                  <select value={finFormStatus} onChange={e => setFinFormStatus(e.target.value)} style={{ padding: '8px', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', color: 'white', fontSize: '0.82rem' }}>
                    <option value="ditunda">ditunda</option>
                    <option value="ok">ok</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
                <button type="button" onClick={() => setEditFinanceModalRecord(null)} className="btn-secondary" style={{ padding: '8px 16px', fontSize: '0.8rem' }}>Batal</button>
                <button type="submit" className="btn-primary" style={{ padding: '8px 16px', fontSize: '0.8rem' }}>Simpan Perubahan</button>
              </div>
            </form>
          </div>
        );
      })()}

      {/* LOGISTICS MODAL 3: EDIT AUDIT STOK OPNAME */}
      {editModalRecord && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 120 }}>
          <form onSubmit={handleSaveEditLogistics} className="glass-card animate-fade-in" style={{ padding: '24px', width: '500px', border: '1px solid #38bdf8', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #334155', paddingBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Edit3 size={20} color="#38bdf8" />
                <h3 style={{ fontSize: '1.1rem', fontWeight: '800', color: '#f8fafc' }}>
                  Edit Pengajuan Audit Stok Opname
                </h3>
              </div>
              <button type="button" onClick={() => setEditModalRecord(null)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontWeight: '800', fontSize: '1rem' }}>✕</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: '700' }}>Tanggal Audit</span>
                <input type="date" value={formDate} onChange={e => setFormDate(e.target.value)} style={{ padding: '8px', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', color: 'white', fontSize: '0.82rem' }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: '700' }}>Dibuat Oleh</span>
                <select value={formSubmitter} onChange={e => setFormSubmitter(e.target.value)} style={{ padding: '8px', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', color: 'white', fontSize: '0.82rem' }}>
                  {userRightsList.map(u => <option key={u.id} value={`${u.name} (${u.role})`}>{u.name} ({u.role})</option>)}
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: '700' }}>Restoran Outlet</span>
              <select value={formOutletId} onChange={e => setFormOutletId(Number(e.target.value))} style={{ padding: '8px', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', color: 'white', fontSize: '0.82rem' }}>
                {(masterData.outlets || []).map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: '700' }}>Cari & Pilih Nama Item (Bahan Baku)</span>
              <input
                type="text"
                placeholder="Ketik untuk mencari bahan..."
                value={formSearchQuery}
                onChange={e => setFormSearchQuery(e.target.value)}
                style={{ padding: '8px', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px 6px 0 0', color: 'white', fontSize: '0.82rem' }}
              />
              <select
                value={formIngredientId}
                onChange={e => {
                  const val = Number(e.target.value);
                  setFormIngredientId(val);
                  const found = ingredientsList.find(i => i.id === val);
                  if (found) {
                    setFormItemName(found.name);
                    setFormUnit(found.unit || 'kg');
                  }
                }}
                style={{ padding: '8px', background: '#1e293b', border: '1px solid #334155', borderTop: 'none', borderRadius: '0 0 6px 6px', color: 'white', fontSize: '0.82rem', cursor: 'pointer' }}
              >
                {ingredientsList.filter(i => i.name.toLowerCase().includes(formSearchQuery.toLowerCase())).map(i => (
                  <option key={i.id} value={i.id}>{i.name}</option>
                ))}
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: '700' }}>Stok Awal</span>
                <input type="number" value={formStokAwal} onChange={e => setFormStokAwal(e.target.value)} style={{ padding: '8px', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', color: 'white', fontSize: '0.8rem' }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: '700' }}>Stok Masuk</span>
                <input type="number" value={formStokMasuk} onChange={e => setFormStokMasuk(e.target.value)} style={{ padding: '8px', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', color: 'white', fontSize: '0.8rem' }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: '700' }}>Stok Keluar</span>
                <input type="number" value={formStokKeluar} onChange={e => setFormStokKeluar(e.target.value)} style={{ padding: '8px', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', color: 'white', fontSize: '0.8rem' }} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: '700' }}>Trans. Masuk</span>
                <input type="number" value={formTransferMasuk} onChange={e => setFormTransferMasuk(e.target.value)} style={{ padding: '8px', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', color: 'white', fontSize: '0.8rem' }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: '700' }}>Trans. Keluar</span>
                <input type="number" value={formTransferKeluar} onChange={e => setFormTransferKeluar(e.target.value)} style={{ padding: '8px', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', color: 'white', fontSize: '0.8rem' }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: '700' }}>Stok Rusak</span>
                <input type="number" value={formStokRusak} onChange={e => setFormStokRusak(e.target.value)} style={{ padding: '8px', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', color: 'white', fontSize: '0.8rem' }} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '0.75rem', color: '#34d399', fontWeight: '800' }}>Sisa Stok Fisik ({formUnit})</span>
                <input type="number" value={formStokFisik} onChange={e => setFormStokFisik(e.target.value)} style={{ padding: '8px', background: '#0f172a', border: '1px solid #34d399', borderRadius: '6px', color: 'white', fontSize: '0.82rem' }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: '700' }}>Status</span>
                <select value={formStatus} onChange={e => setFormStatus(e.target.value)} style={{ padding: '8px', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', color: 'white', fontSize: '0.82rem' }}>
                  <option value="ditunda">ditunda</option>
                  <option value="ok">ok</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
              <button type="button" onClick={() => setEditModalRecord(null)} className="btn-secondary" style={{ padding: '8px 16px', fontSize: '0.8rem' }}>Batal</button>
              <button type="submit" className="btn-primary" style={{ padding: '8px 16px', fontSize: '0.8rem' }}>Simpan Perubahan</button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
}
