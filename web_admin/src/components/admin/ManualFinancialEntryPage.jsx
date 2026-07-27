import React, { useState, useEffect } from 'react';
import { 
  FileEdit, 
  Calendar, 
  User, 
  Store, 
  DollarSign, 
  Plus, 
  Trash2, 
  Search, 
  Eye, 
  X, 
  CheckCircle2, 
  AlertCircle, 
  Edit3, 
  ArrowRight,
  ShoppingBag,
  Package,
  CreditCard,
  PlusCircle,
  Filter,
  SlidersHorizontal,
  FileSpreadsheet,
  Printer,
  ShieldCheck,
  Receipt,
  Building2,
  ChevronDown
} from 'lucide-react';
import PaginationControls from './PaginationControls';

export default function ManualFinancialEntryPage({ masterData, setMasterData, selectedBranch, setActiveTab, triggerOpenModal }) {
  const [activeMainSubTab, setActiveMainSubTab] = useState('rekap'); // 'rekap' | 'approval'
  const outlets = masterData.outlets || [];
  const ingredientsList = masterData?.ingredients || [];

  const expenseMasterList = masterData?.expenseMaster || [];

  const adminList = masterData?.userRights || masterData?.users || [];

  const formatRupiah = (val) => {
    return 'Rp ' + Number(val || 0).toLocaleString('id-ID');
  };

  // MAIN PAGE FILTER & SEARCH STATES
  const [filterOutletId, setFilterOutletId] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // MODAL FORM & EDITING STATES
  const [showInputModal, setShowInputModal] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [previewingRecord, setPreviewingRecord] = useState(null);

  // Auto-sync local outlet filters with selectedBranch
  useEffect(() => {
    if (selectedBranch) {
      setFilterOutletId(selectedBranch);
      setFinanceOutletFilter(selectedBranch);
      setEntryOutletId(selectedBranch);
    } else {
      setFilterOutletId('ALL');
      setFinanceOutletFilter('ALL');
    }
  }, [selectedBranch]);

  // FORM FIELDS STATES
  const [entryDate, setEntryDate] = useState(new Date().toISOString().split('T')[0]);
  const [entryOutletId, setEntryOutletId] = useState(selectedBranch || (outlets[0] ? outlets[0].id : 1));
  const [createdBy, setCreatedBy] = useState(adminList[0]?.name || 'Argun Admin');

  // INCOME STATES
  const [netSales, setNetSales] = useState(0);
  const [nonCashSales, setNonCashSales] = useState(0);

  // MULTI-ROW HPP (BAHAN MENTAH) & BIAYA
  const [cogsRows, setCogsRows] = useState([]);
  const [cogsSearchQuery, setCogsSearchQuery] = useState('');

  const [expenseRows, setExpenseRows] = useState([]);
  const [expenseSearchQuery, setExpenseSearchQuery] = useState('');

  // DEBT PAYMENT & TOAST
  const [debtPayment, setDebtPayment] = useState(0);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('Laporan Berhasil Disimpan!');

  // FINANCE APPROVAL STATES & MODALS
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
  const [currentPageFinance, setCurrentPageFinance] = useState(1);
  const [pageSizeFinance, setPageSizeFinance] = useState(25);

  const [previewFinanceRecord, setPreviewFinanceRecord] = useState(null);
  const [accFinanceModalRecord, setAccFinanceModalRecord] = useState(null);
  const [editFinanceModalRecord, setEditFinanceModalRecord] = useState(null);

  // FORM LAPORAN KEUANGAN HARIAN (12 MANDATORY RULES IMPLEMENTATION)
  const [showDailyReportModal, setShowDailyReportModal] = useState(false);
  const [dailyRepDate, setDailyRepDate] = useState(new Date().toISOString().split('T')[0]);
  const [dailyRepOutletId, setDailyRepOutletId] = useState(selectedBranch || (outlets[0] ? outlets[0].id : 1));
  const [dailyRepCreatedBy, setDailyRepCreatedBy] = useState(adminList[0]?.name || 'Argun Admin');

  const suppliersList = masterData?.suppliers || [];

  // Combined Master Data List (Bahan Baku & Biaya)
  const combinedMasterItemsList = [
    ...(ingredientsList || []).map(ing => ({
      id: `ing-${ing.id}`,
      name: ing.name,
      itemType: 'Bahan Baku',
      category: 'HPP Dapur (Bahan Mentah)',
      unit: ing.unit || 'kg',
      price: ing.cost || 10000
    })),
    ...(expenseMasterList || []).map(exp => ({
      id: `exp-${exp.id}`,
      name: exp.name,
      itemType: 'Biaya',
      category: exp.category || 'Biaya Operasional (OPEX)',
      unit: 'pcs',
      price: 50000
    }))
  ];

  const [dailyExpenseRows, setDailyExpenseRows] = useState([]);
  const [cashReturnRows, setCashReturnRows] = useState([]);
  const [defaultCashModal, setDefaultCashModal] = useState(2000000);
  const [dailyRepNotes, setDailyRepNotes] = useState('');

  // 1. AUTO-GENERATED SALES FROM SALES TRANSACTIONS ACCORDING TO DATE (UNTIL 23:59:59)
  const matchedSalesTx = (masterData.salesTransactions || []).filter(t => {
    const isDateMatch = !t.date || t.date === dailyRepDate;
    const isOutletMatch = dailyRepOutletId === 'ALL' || Number(t.outlet_id) === Number(dailyRepOutletId);
    return isDateMatch && isOutletMatch;
  });

  const autoCashSales = matchedSalesTx
    .filter(t => !t.payment_method || t.payment_method.toLowerCase() === 'cash' || t.payment_method.toLowerCase() === 'tunai')
    .reduce((sum, t) => sum + Number(t.amount || 0), 0);

  const autoNonCashSales = matchedSalesTx
    .filter(t => t.payment_method && t.payment_method.toLowerCase() !== 'cash' && t.payment_method.toLowerCase() !== 'tunai')
    .reduce((sum, t) => sum + Number(t.amount || 0), 0);

  const autoTotalSales = autoCashSales + autoNonCashSales;

  const handleOpenDailyReportModal = () => {
    const todayStr = new Date().toISOString().split('T')[0];
    setDailyRepDate(todayStr);
    setDailyRepOutletId(selectedBranch || (outlets[0] ? outlets[0].id : 1));
    setDailyRepCreatedBy(masterData?.currentUser?.name || masterData?.user?.name || adminList[0]?.name || 'Master Super Admin');

    const initialRows = [];
    if (ingredientsList && ingredientsList.length > 0) {
      ingredientsList.slice(0, 2).forEach((ing, idx) => {
        initialRows.push({
          id: Date.now() + idx + 1,
          itemName: ing.name,
          itemType: 'Bahan Baku',
          category: ing.category || 'HPP Dapur (Bahan Mentah)',
          qty: 1,
          priceUnit: ing.cost || ing.price || 0,
          totalPrice: ing.cost || ing.price || 0
        });
      });
    }
    if (expenseMasterList && expenseMasterList.length > 0) {
      const exp1 = expenseMasterList[0];
      initialRows.push({
        id: Date.now() + 10,
        itemName: exp1.name,
        itemType: 'Biaya Operasional',
        category: exp1.category || 'Biaya Operasional (OPEX)',
        qty: 1,
        priceUnit: exp1.amount || exp1.cost || 0,
        totalPrice: exp1.amount || exp1.cost || 0
      });
    }

    setDailyExpenseRows(initialRows);
    setCashReturnRows([]);
    setDefaultCashModal(0);
    setDailyRepNotes('');
    setShowDailyReportModal(true);
  };

  const handleAddDailyExpenseRow = () => {
    const item = combinedMasterItemsList[dailyExpenseRows.length % combinedMasterItemsList.length] || { name: 'Bahan Baku Baru', itemType: 'Bahan Baku', category: 'HPP Dapur', price: 15000 };
    setDailyExpenseRows(prev => [...prev, {
      id: Date.now() + Math.random(),
      itemName: item.name,
      itemType: item.itemType,
      category: item.category,
      qty: 1,
      priceUnit: item.price || 15000,
      totalPrice: item.price || 15000
    }]);
  };

  const handleRemoveDailyExpenseRow = (id) => {
    setDailyExpenseRows(prev => prev.filter(r => r.id !== id));
  };

  const handleUpdateDailyExpenseRow = (id, field, val) => {
    setDailyExpenseRows(prev => prev.map(r => {
      if (r.id !== id) return r;
      if (field === 'itemName') {
        const found = combinedMasterItemsList.find(m => m.name.toLowerCase() === val.toLowerCase());
        return {
          ...r,
          itemName: val,
          itemType: found ? found.itemType : r.itemType,
          category: found ? found.category : r.category,
          priceUnit: found ? found.price : r.priceUnit,
          totalPrice: (Number(r.qty || 1)) * (found ? found.price : r.priceUnit)
        };
      }
      if (field === 'qty' || field === 'priceUnit') {
        const updatedQty = field === 'qty' ? Number(val || 0) : r.qty;
        const updatedPrice = field === 'priceUnit' ? Number(val || 0) : r.priceUnit;
        return {
          ...r,
          [field]: Number(val || 0),
          totalPrice: updatedQty * updatedPrice
        };
      }
      return { ...r, [field]: val };
    }));
  };

  // CASH RETURN TABLE HANDLERS
  const handleAddCashReturnRow = () => {
    setCashReturnRows(prev => [...prev, {
      id: Date.now() + Math.random(),
      date: dailyRepDate,
      debtAmount: 0,
      returnAmount: 0
    }]);
  };

  const handleRemoveCashReturnRow = (id) => {
    setCashReturnRows(prev => prev.filter(r => r.id !== id));
  };

  const handleUpdateCashReturnRow = (id, field, val) => {
    setCashReturnRows(prev => prev.map(r => {
      if (r.id !== id) return r;
      return { ...r, [field]: val };
    }));
  };

  // CALCULATIONS ACCORDING TO THE 12 RULES
  const totalPengeluaran = dailyExpenseRows.reduce((sum, r) => sum + Number(r.totalPrice || 0), 0);
  const labaKotor = autoTotalSales - totalPengeluaran;

  const totalPengembalianKas = cashReturnRows.reduce((sum, r) => sum + Number(r.returnAmount || 0), 0);
  const totalHutangKas = cashReturnRows.reduce((sum, r) => sum + Number(r.debtAmount || 0), 0);
  const sisaHutangBelumDikembalikan = Math.max(0, totalHutangKas - totalPengembalianKas);

  // Uang di Laci = Laba Kotor - Pengembalian Uang Kas - Pendapatan Non-Cash
  const uangDiLaci = labaKotor - totalPengembalianKas - autoNonCashSales;
  const isUangDiLaciMinus = uangDiLaci < 0;

  // Sisa Uang di Kas = Modal Default - Laba Kotor (jika minus) - Hutang belum dikembalikan
  const labaKotorMinusVal = labaKotor < 0 ? Math.abs(labaKotor) : 0;
  const sisaUangDiKas = Number(defaultCashModal || 0) - labaKotorMinusVal - sisaHutangBelumDikembalikan;

  const handleSaveDailyReportModal = (e) => {
    e.preventDefault();
    const repNo = `LAP-${dailyRepDate.replace(/-/g,'')}-${Math.floor(100 + Math.random() * 900)}`;
    const selectedOutletObj = outlets.find(o => Number(o.id) === Number(dailyRepOutletId)) || { name: 'Restoran Utama' };

    const cogsItems = dailyExpenseRows
      .filter(r => r.itemType === 'Bahan Baku')
      .map(r => ({
        id: r.id,
        name: r.itemName,
        supplier: r.supplier,
        qty: Number(r.qty || 1),
        unit: 'kg',
        price_unit: Number(r.priceUnit || 0),
        amount: Number(r.totalPrice || 0)
      }));

    const expensesBreakdown = dailyExpenseRows.map(r => ({
      id: r.id,
      category: r.category,
      cost_group: r.itemType === 'Bahan Baku' ? 'COGS / HPP Bahan Baku' : 'Biaya Operasional (OPEX)',
      amount: Number(r.totalPrice || 0),
      supplier: r.supplier,
      notes: `${r.itemName} (${r.qty} x ${formatRupiah(r.priceUnit)})`
    }));

    const newDailyRepObj = {
      id: repNo,
      report_no: repNo,
      date: dailyRepDate,
      outlet_id: Number(dailyRepOutletId),
      branch_name: selectedOutletObj.name,
      author_name: dailyRepCreatedBy,
      cashier: dailyRepCreatedBy,
      net_sales: autoTotalSales,
      gross_sales: autoTotalSales,
      cash_sales: autoCashSales,
      non_cash_sales: autoNonCashSales,
      total_expense: totalPengeluaran,
      gross_profit: labaKotor,
      cash_physical: uangDiLaci,
      actual_cash: uangDiLaci,
      status: 'approved',
      notes: dailyRepNotes || `Laporan Keuangan Harian (Sisa Uang Kas: ${formatRupiah(sisaUangDiKas)})`,
      cogs_items: cogsItems,
      expenses_breakdown: expensesBreakdown,
      cash_return_breakdown: cashReturnRows,
      is_minus_drawer: isUangDiLaciMinus,
      minus_drawer_amount: isUangDiLaciMinus ? Math.abs(uangDiLaci) : 0,
      sisa_uang_kas: sisaUangDiKas
    };

    setMasterData(prev => {
      // 1. Update ingredient stocks from cogsItems
      const updatedIngredients = [...(prev.ingredients || [])];
      cogsItems.forEach(item => {
        const itemQty = Number(item.qty || 1);
        const itemName = item.name || 'Bahan Mentah';
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

      // 2. Add expense items to financialRecords
      const newExpenses = expensesBreakdown.map(exp => ({
        id: `EXP-ACC-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
        date: dailyRepDate,
        outlet_id: Number(dailyRepOutletId),
        type: 'expense',
        category: exp.category || 'Biaya Operasional (OPEX)',
        name: exp.notes || exp.category || 'Biaya Kasir',
        amount: Number(exp.amount || 0),
        supplier: exp.supplier || '-',
        status: 'approved'
      }));

      return {
        ...prev,
        ingredients: updatedIngredients,
        approvedFinanceDaily: [newDailyRepObj, ...(prev.approvedFinanceDaily || [])],
        financialRecords: [...(prev.financialRecords || []), ...newExpenses]
      };
    });

    setShowDailyReportModal(false);
    setToastMessage(`Laporan Keuangan Harian (${repNo}) Berhasil Disimpan & ACC! Laba Kotor: ${formatRupiah(labaKotor)}`);
    setShowSuccessToast(true);
    setTimeout(() => setShowSuccessToast(false), 2500);
  };

  const [finFormDate, setFinFormDate] = useState(new Date().toISOString().split('T')[0]);
  const [finFormOutletId, setFinFormOutletId] = useState(1);
  const [finFormShift, setFinFormShift] = useState('Pagi');
  const [finFormCashier, setFinFormCashier] = useState('');
  const [finFormGrossSales, setFinFormGrossSales] = useState('0');
  const [finFormDiscount, setFinFormDiscount] = useState('0');
  const [finFormNonCashSales, setFinFormNonCashSales] = useState('0');
  const [finFormCogsExpense, setFinFormCogsExpense] = useState('0');
  const [finFormOpexExpense, setFinFormOpexExpense] = useState('0');
  const [finFormUtilitiesExpense, setFinFormUtilitiesExpense] = useState('0');
  const [finFormMarketingExpense, setFinFormMarketingExpense] = useState('0');
  const [finFormNotes, setFinFormNotes] = useState('');

  const getFinanceApprovals = () => masterData.approvedFinanceDaily || [];

  const getFilteredFinance = () => {
    let list = getFinanceApprovals();
    if (financeOutletFilter !== 'ALL') {
      list = list.filter(f => Number(f.outlet_id) === Number(financeOutletFilter));
    }
    return list;
  };

  const handleOpenAccFinanceModal = (fin) => {
    setAccFinanceModalRecord(fin);
    setFinFormDate(fin.date || new Date().toISOString().split('T')[0]);
    setFinFormOutletId(fin.outlet_id || 1);
    setFinFormShift(fin.shift || 'Pagi');
    setFinFormCashier(fin.cashier || fin.author_name || 'Kasir POS');
    setFinFormGrossSales(fin.gross_sales || fin.net_sales || '0');
    setFinFormDiscount(fin.discount || '0');
    setFinFormNonCashSales(fin.non_cash_sales || '0');
    setFinFormCogsExpense(fin.cogs_expense || '0');
    setFinFormOpexExpense(fin.opex_expense || '0');
    setFinFormUtilitiesExpense(fin.utilities_expense || '0');
    setFinFormMarketingExpense(fin.marketing_expense || '0');
    setFinFormNotes(fin.notes || '');
  };

  const handleOpenEditFinanceModal = (fin) => {
    setEditFinanceModalRecord(fin);
    setFinFormDate(fin.date || new Date().toISOString().split('T')[0]);
    setFinFormOutletId(fin.outlet_id || 1);
    setFinFormShift(fin.shift || 'Pagi');
    setFinFormCashier(fin.cashier || fin.author_name || 'Kasir POS');
    setFinFormGrossSales(fin.gross_sales || fin.net_sales || '0');
    setFinFormDiscount(fin.discount || '0');
    setFinFormNonCashSales(fin.non_cash_sales || '0');
    setFinFormCogsExpense(fin.cogs_expense || '0');
    setFinFormOpexExpense(fin.opex_expense || '0');
    setFinFormUtilitiesExpense(fin.utilities_expense || '0');
    setFinFormMarketingExpense(fin.marketing_expense || '0');
    setFinFormNotes(fin.notes || '');
  };

  // DIRECT ONE-CLICK ACC APPROVAL
  const handleDirectAccFinance = (fin) => {
    const list = [...getFinanceApprovals()];
    const index = list.findIndex(f => f.id === fin.id);

    const updatedItem = {
      ...fin,
      status: 'approved',
      approved_by: 'Admin / Owner',
      notes: fin.notes || 'Penutupan keuangan kasir disetujui & didistribusikan'
    };

    if (index !== -1) {
      list[index] = updatedItem;
    } else {
      list.unshift(updatedItem);
    }

    setMasterData(prev => {
      const updatedIngredients = [...(prev.ingredients || [])];
      const cogsItems = updatedItem.cogs_items || updatedItem.cogs_breakdown || [];

      cogsItems.forEach(item => {
        const itemQty = Number(item.qty || 1);
        const itemName = item.name || 'Bahan Mentah';
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

      const manualList = prev.manualEntryRecords || [];
      const updatedManualList = manualList.map(item => (item.id === fin.id || item.report_no === fin.report_no) ? { ...item, status: 'approved' } : item);

      return {
        ...prev,
        ingredients: updatedIngredients,
        approvedFinanceDaily: list,
        manualEntryRecords: updatedManualList.some(item => item.id === fin.id || item.report_no === fin.report_no)
          ? updatedManualList
          : [{ ...updatedItem, status: 'approved' }, ...manualList],
        financialRecords: [...(prev.financialRecords || []), ...newExpenses]
      };
    });

    setToastMessage(`✅ Laporan ${updatedItem.report_no || updatedItem.id} Berhasil Di-ACC! Status POS Mobile Ter-update menjadi APPROVED.`);
    setShowSuccessToast(true);
    setTimeout(() => setShowSuccessToast(false), 2500);
  };

  const handleSaveAccFinance = (e) => {
    e.preventDefault();
    if (!accFinanceModalRecord) return;

    const list = [...getFinanceApprovals()];
    const index = list.findIndex(f => f.id === accFinanceModalRecord.id);

    const gross = Number(finFormGrossSales || 0);
    const disc = Number(finFormDiscount || 0);
    const net = gross - disc;
    const nonCash = Number(finFormNonCashSales || 0);

    const cogs = Number(finFormCogsExpense || 0);
    const opex = Number(finFormOpexExpense || 0);
    const util = Number(finFormUtilitiesExpense || 0);
    const mkt = Number(finFormMarketingExpense || 0);
    const totalExp = cogs + opex + util + mkt;

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
      approved_by: 'Admin / Owner',
      notes: finFormNotes || 'Penutupan keuangan kasir disetujui & didistribusikan'
    };

    if (index !== -1) {
      list[index] = updatedItem;
    } else {
      list.unshift(updatedItem);
    }

    setMasterData(prev => {
      const updatedIngredients = [...(prev.ingredients || [])];
      const cogsItems = updatedItem.cogs_items || updatedItem.cogs_breakdown || [];

      cogsItems.forEach(item => {
        const itemQty = Number(item.qty || 1);
        const itemName = item.name || 'Bahan Mentah';
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

      return {
        ...prev,
        ingredients: updatedIngredients,
        approvedFinanceDaily: list
      };
    });
    setAccFinanceModalRecord(null);
    setToastMessage('Persetujuan Keuangan Kasir Berhasil Disimpan & Setuju (OK)!');
    setShowSuccessToast(true);
    setTimeout(() => setShowSuccessToast(false), 2000);
  };

  const handleSaveEditFinance = (e) => {
    e.preventDefault();
    if (!editFinanceModalRecord) return;

    const list = [...getFinanceApprovals()];
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
      notes: finFormNotes
    };

    if (index !== -1) list[index] = updatedItem;

    setMasterData(prev => ({ ...prev, approvedFinanceDaily: list }));
    setEditFinanceModalRecord(null);
    setToastMessage('Data Laporan Keuangan Kasir Berhasil Diperbarui!');
    setShowSuccessToast(true);
    setTimeout(() => setShowSuccessToast(false), 2000);
  };

  const handleDeleteFinanceRecord = (id) => {
    if (window.confirm('Apakah Anda yakin ingin menghapus laporan keuangan kasir ini?')) {
      const list = getFinanceApprovals().filter(f => f.id !== id);
      setMasterData(prev => ({ ...prev, approvedFinanceDaily: list }));
    }
  };

  // REACTIVE LISTENER TO TRIGGER MODAL FROM SIDEBAR "CATAT TRANSAKSI"
  useEffect(() => {
    if (triggerOpenModal && triggerOpenModal > 0) {
      handleOpenAddModal();
    }
  }, [triggerOpenModal]);

  // AUTO FETCH SALES INCOME ACCORDING TO DATE & OUTLET WHEN CREATING NEW
  useEffect(() => {
    if (!editingRecord && showInputModal) {
      const txList = masterData.salesTransactions || [];
      const matched = txList.filter(t => {
        const isDateMatch = !t.date || t.date === entryDate;
        const isOutletMatch = Number(t.outlet_id) === Number(entryOutletId);
        return isDateMatch && isOutletMatch;
      });

      const totalIncome = matched.reduce((acc, t) => acc + (t.amount || 0), 0);
      const totalNonCash = matched.filter(t => t.payment_method && t.payment_method.toLowerCase() !== 'cash')
                                  .reduce((acc, t) => acc + (t.amount || 0), 0);

      setNetSales(totalIncome);
      setNonCashSales(totalNonCash);
    }
  }, [entryDate, entryOutletId, masterData.salesTransactions, editingRecord, showInputModal]);

  // OPEN NEW ENTRY FORM MODAL (WITH MINIMUM 5 OPEN FIELDS PER CATEGORY)
  const handleOpenAddModal = () => {
    setEditingRecord(null);
    setEntryDate(new Date().toISOString().split('T')[0]);
    setEntryOutletId(selectedBranch || (outlets[0] ? outlets[0].id : 1));
    setCreatedBy(adminList[0]?.name || 'Argun Admin');
    setDebtPayment(0);
    setCogsSearchQuery('');
    setExpenseSearchQuery('');

    // MINIMAL 5 FIELD TERBUKA SECARA DEFAULT DI KATEGORI HPP BAHAN MENTAH
    const default5Cogs = Array.from({ length: 5 }).map((_, idx) => {
      const ing = ingredientsList[idx % ingredientsList.length] || { id: idx + 1, name: `Bahan Mentah ${idx + 1}`, unit: 'kg', cost: 10000 };
      return {
        id: Date.now() + idx + Math.random(),
        ingredient_id: ing.id,
        name: ing.name,
        qty: 1,
        unit: ing.unit || 'kg',
        price_unit: ing.cost || 10000,
        amount: ing.cost || 10000
      };
    });

    // MINIMAL 5 FIELD TERBUKA SECARA DEFAULT DI KATEGORI BIAYA OPERASIONAL
    const default5Expenses = Array.from({ length: 5 }).map((_, idx) => {
      const exp = expenseMasterList[idx % expenseMasterList.length] || { id: idx + 1, name: `Biaya Operasional ${idx + 1}`, category: 'Biaya Operasional (OPEX)' };
      return {
        id: Date.now() + 100 + idx + Math.random(),
        expense_id: exp.id,
        name: exp.name,
        category: exp.category || 'Biaya Operasional (OPEX)',
        amount: 50000
      };
    });

    setCogsRows(default5Cogs);
    setExpenseRows(default5Expenses);
    setShowInputModal(true);
  };

  // ADD EXTRA FIELD TO HPP BAHAN MENTAH
  const handleAddBlankCogsRow = () => {
    const nextIdx = cogsRows.length;
    const ing = ingredientsList[nextIdx % ingredientsList.length] || { id: Date.now(), name: 'Bahan Mentah Baru', unit: 'kg', cost: 10000 };
    const newRow = {
      id: Date.now() + Math.random(),
      ingredient_id: ing.id,
      name: ing.name,
      qty: 1,
      unit: ing.unit || 'kg',
      price_unit: ing.cost || 10000,
      amount: ing.cost || 10000
    };
    setCogsRows([...cogsRows, newRow]);
  };

  // ADD EXTRA FIELD TO BIAYA OPERASIONAL
  const handleAddBlankExpenseRow = () => {
    const nextIdx = expenseRows.length;
    const exp = expenseMasterList[nextIdx % expenseMasterList.length] || { id: Date.now(), name: 'Biaya Operasional Baru', category: 'Biaya Operasional (OPEX)' };
    const newRow = {
      id: Date.now() + Math.random(),
      expense_id: exp.id,
      name: exp.name,
      category: exp.category || 'Biaya Operasional (OPEX)',
      amount: 50000
    };
    setExpenseRows([...expenseRows, newRow]);
  };

  // OPEN EDIT FORM MODAL FOR A RECORD
  const handleOpenEditModal = (item) => {
    setEditingRecord(item);
    setEntryDate(item.date || new Date().toISOString().split('T')[0]);
    setEntryOutletId(item.outlet_id || (outlets[0] ? outlets[0].id : 1));
    setCreatedBy(item.author_name || adminList[0]?.name || 'Argun Admin');
    setNetSales(item.net_sales || 0);
    setNonCashSales(item.non_cash_sales || 0);
    setDebtPayment(item.debt_payment || 0);

    // Parse breakdown expenses into cogsRows and expenseRows
    const cogsArr = [];
    const expArr = [];
    (item.expenses_breakdown || []).forEach(ex => {
      if ((ex.cost_group || '').toLowerCase().includes('cogs') || (ex.category || '').toLowerCase().includes('hpp')) {
        cogsArr.push({
          id: ex.id || Math.random(),
          name: ex.category?.replace('[HPP Dapur] ', '') || 'Bahan Dapur',
          qty: 1,
          unit: 'kg',
          price_unit: ex.amount || 0,
          amount: ex.amount || 0
        });
      } else {
        expArr.push({
          id: ex.id || Math.random(),
          name: ex.category || 'Biaya Operasional',
          category: ex.cost_group || 'Biaya Operasional (OPEX)',
          amount: ex.amount || 0
        });
      }
    });

    // Ensure minimum 5 open rows when editing
    while (cogsArr.length < 5) {
      const ing = ingredientsList[cogsArr.length % ingredientsList.length] || { name: 'Bahan Mentah', unit: 'kg', cost: 0 };
      cogsArr.push({ id: Date.now() + cogsArr.length, name: ing.name, qty: 1, unit: ing.unit || 'kg', price_unit: ing.cost || 0, amount: ing.cost || 0 });
    }
    while (expArr.length < 5) {
      const exp = expenseMasterList[expArr.length % expenseMasterList.length] || { name: 'Biaya Operasional', category: 'Biaya Operasional (OPEX)' };
      expArr.push({ id: Date.now() + 100 + expArr.length, name: exp.name, category: exp.category || 'Biaya Operasional (OPEX)', amount: 0 });
    }

    setCogsRows(cogsArr);
    setExpenseRows(expArr);
    setCogsSearchQuery('');
    setExpenseSearchQuery('');
    setShowInputModal(true);
  };

  // DELETE RECORD FROM DATABASE
  const handleDeleteRecord = (id) => {
    if (window.confirm('Apakah Anda yakin ingin menghapus record input manual laporan ini?')) {
      setMasterData(prev => ({
        ...prev,
        approvedFinanceDaily: (prev.approvedFinanceDaily || []).filter(item => item.id !== id)
      }));
      setToastMessage('Record Laporan Berhasil Dihapus');
      setShowSuccessToast(true);
      setTimeout(() => setShowSuccessToast(false), 2000);
    }
  };

  // OPEN PREVIEW MODAL
  const handleOpenPreviewRow = (item) => {
    setPreviewingRecord(item);
  };

  // ADD COGS ROW FROM SEARCH CHIP
  const handleAddCogsFromSearch = (ingItem) => {
    const newRow = {
      id: Date.now() + Math.random(),
      ingredient_id: ingItem.id,
      name: ingItem.name,
      qty: 1,
      unit: ingItem.unit || 'kg',
      price_unit: ingItem.cost || 10000,
      amount: ingItem.cost || 10000
    };
    setCogsRows([...cogsRows, newRow]);
    setCogsSearchQuery('');
  };

  const handleRemoveCogsRow = (id) => {
    setCogsRows(cogsRows.filter(r => r.id !== id));
  };

  const handleUpdateCogsRow = (id, field, val) => {
    setCogsRows(cogsRows.map(r => {
      if (r.id === id) {
        const updated = { ...r, [field]: val };
        if (field === 'name') {
          const matchedIng = ingredientsList.find(i => i.name === val);
          if (matchedIng) {
            updated.unit = matchedIng.unit || 'kg';
            updated.price_unit = matchedIng.cost || updated.price_unit;
          }
        }
        if (field === 'qty' || field === 'price_unit') {
          updated.amount = Number(updated.qty || 0) * Number(updated.price_unit || 0);
        }
        return updated;
      }
      return r;
    }));
  };

  // ADD EXPENSE ROW FROM SEARCH CHIP
  const handleAddExpenseFromSearch = (expItem) => {
    const newRow = {
      id: Date.now() + Math.random(),
      expense_id: expItem.id,
      name: expItem.name,
      category: expItem.category || 'Biaya Operasional (OPEX)',
      amount: 50000
    };
    setExpenseRows([...expenseRows, newRow]);
    setExpenseSearchQuery('');
  };

  const handleRemoveExpenseRow = (id) => {
    setExpenseRows(expenseRows.filter(r => r.id !== id));
  };

  const handleUpdateExpenseRow = (id, field, val) => {
    setExpenseRows(expenseRows.map(r => {
      if (r.id === id) {
        const updated = { ...r, [field]: val };
        if (field === 'name') {
          const matchedExp = expenseMasterList.find(e => e.name === val);
          if (matchedExp) {
            updated.category = matchedExp.category || updated.category;
          }
        }
        return updated;
      }
      return r;
    }));
  };

  // TOTAL CALCULATIONS FOR FORM
  const totalCogs = cogsRows.reduce((s, r) => s + Number(r.amount || 0), 0);
  const totalExpenseOther = expenseRows.reduce((s, r) => s + Number(r.amount || 0), 0);
  const grandTotalExpense = totalCogs + totalExpenseOther;

  const grossProfit = Number(netSales || 0) - grandTotalExpense;
  const cashInDrawer = grossProfit - Number(debtPayment || 0) - Number(nonCashSales || 0);

  const selectedOutletObj = outlets.find(o => Number(o.id) === Number(entryOutletId)) || { name: 'Restoran Senopati (HQ)' };

  // PREVIEW DRAFT BEFORE SAVE FROM MODAL FORM
  const handlePreviewFormDraft = () => {
    const activeCogs = cogsRows.filter(c => Number(c.amount || 0) > 0 || c.name.trim());
    const activeExp = expenseRows.filter(e => Number(e.amount || 0) > 0 || e.name.trim());

    const combinedExpenses = [
      ...activeCogs.map(c => ({
        id: c.id,
        category: `[HPP Dapur] ${c.name}`,
        cost_group: 'COGS / HPP Bahan Baku',
        amount: Number(c.amount || 0),
        notes: `${c.qty} ${c.unit} @ ${formatRupiah(c.price_unit)}`
      })),
      ...activeExp.map(e => ({
        id: e.id,
        category: e.name,
        cost_group: e.category,
        amount: Number(e.amount || 0),
        notes: `Input biaya operasional`
      }))
    ];

    const draft = {
      id: editingRecord ? editingRecord.id : `FIN-${Date.now()}`,
      date: entryDate,
      branch_name: selectedOutletObj.name,
      outlet_id: Number(entryOutletId),
      author_name: createdBy,
      net_sales: Number(netSales || 0),
      non_cash_sales: Number(nonCashSales || 0),
      total_expense: grandTotalExpense,
      cash_physical: cashInDrawer,
      debt_payment: Number(debtPayment || 0),
      cogs_items: activeCogs,
      expenses_breakdown: combinedExpenses,
      status: editingRecord ? editingRecord.status : 'ditunda'
    };

    setPreviewingRecord(draft);
  };

  // FINAL SAVE FROM PREVIEW MODAL TO DATABASE
  const handleFinalSubmit = () => {
    if (!previewingRecord) return;

    setMasterData(prev => {
      const list = prev.approvedFinanceDaily || [];
      const exists = list.some(item => item.id === previewingRecord.id);

      let updatedList = [];
      if (exists) {
        updatedList = list.map(item => item.id === previewingRecord.id ? previewingRecord : item);
      } else {
        updatedList = [previewingRecord, ...list];
      }

      return {
        ...prev,
        approvedFinanceDaily: updatedList
      };
    });

    setPreviewingRecord(null);
    setShowInputModal(false);
    setToastMessage('Laporan Keuangan Berhasil Disimpan & Dikirim ke Persetujuan!');
    setShowSuccessToast(true);
    setTimeout(() => setShowSuccessToast(false), 2000);
  };

  // GET FILTERED MANAGEMENT TABLE RECORDS
  const rawList = masterData.approvedFinanceDaily || [];
  const filteredRecords = rawList.filter(item => {
    if (filterOutletId !== 'ALL' && Number(item.outlet_id) !== Number(filterOutletId)) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchDate = (item.date || '').toLowerCase().includes(q);
      const matchBranch = (item.branch_name || '').toLowerCase().includes(q);
      const matchAuthor = (item.author_name || '').toLowerCase().includes(q);
      if (!matchDate && !matchBranch && !matchAuthor) return false;
    }
    return true;
  });

  const filteredIngredients = ingredientsList.filter(i => 
    i.name.toLowerCase().includes(cogsSearchQuery.toLowerCase())
  );

  const filteredExpenseMaster = expenseMasterList.filter(e =>
    e.name.toLowerCase().includes(expenseSearchQuery.toLowerCase()) ||
    (e.category && e.category.toLowerCase().includes(expenseSearchQuery.toLowerCase()))
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }} className="animate-fade-in">
      
      {/* SUCCESS TOAST NOTIFICATION */}
      {showSuccessToast && (
        <div style={{
          position: 'fixed', top: '24px', right: '24px', zIndex: 130,
          background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
          color: 'white', padding: '14px 20px', borderRadius: '10px',
          boxShadow: '0 8px 24px rgba(16, 185, 129, 0.4)',
          display: 'flex', alignItems: 'center', gap: '12px', fontWeight: '800'
        }} className="animate-fade-in">
          <CheckCircle2 size={22} />
          <div>
            <div>{toastMessage}</div>
            <div style={{ fontSize: '0.75rem', fontWeight: '500', opacity: 0.9 }}>
              Tersinkronisasi otomatis dengan Halaman Persetujuan Keuangan Kasir.
            </div>
          </div>
        </div>
      )}

      {/* Title Header with Action Buttons */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '1.6rem', fontWeight: '900', color: '#f8fafc', letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <FileEdit size={28} color="#6366f1" />
            <span>Laporan dari Outlet</span>
          </h2>
          <p style={{ color: '#94a3b8', fontSize: '0.875rem', marginTop: '4px' }}>
            Kelola rekapitulasi laporan harian & persetujuan keuangan shift kasir POS (Closing & Settlement) secara terpusat
          </p>
        </div>

        {/* TOMBOL "+ LAPORAN DARI OUTLET HARIAN" */}
        <button 
          onClick={handleOpenDailyReportModal} 
          className="btn-primary" 
          style={{ padding: '11px 22px', fontSize: '0.85rem', display: 'flex', gap: '8px', background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)', color: '#ffffff', borderRadius: '10px', fontWeight: '800', cursor: 'pointer', border: 'none', boxShadow: '0 4px 14px rgba(99,102,241,0.35)' }}
        >
          <Receipt size={18} />
          <span>+ Laporan dari Outlet Harian</span>
        </button>
      </div>

      {/* KPI SUMMARY CARDS BAR */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
        {/* Card 1: Total Omzet (Net Sales) */}
        <div style={{ background: 'linear-gradient(135deg, rgba(52, 211, 153, 0.15) 0%, rgba(30, 41, 59, 0.9) 100%)', border: '1px solid rgba(52, 211, 153, 0.4)', padding: '16px 18px', borderRadius: '14px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(52, 211, 153, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <DollarSign size={24} color="#34d399" />
          </div>
          <div>
            <span style={{ fontSize: '0.74rem', color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase' }}>Total Net Sales</span>
            <div style={{ fontSize: '1.25rem', fontWeight: '900', color: '#34d399', marginTop: '2px' }}>
              {formatRupiah(getFilteredFinance().reduce((s, f) => s + (f.net_sales || f.system_sales || 0), 0))}
            </div>
          </div>
        </div>

        {/* Card 2: Total Biaya & HPP */}
        <div style={{ background: 'linear-gradient(135deg, rgba(251, 113, 133, 0.15) 0%, rgba(30, 41, 59, 0.9) 100%)', border: '1px solid rgba(251, 113, 133, 0.4)', padding: '16px 18px', borderRadius: '14px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(251, 113, 133, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Package size={24} color="#fb7185" />
          </div>
          <div>
            <span style={{ fontSize: '0.74rem', color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase' }}>Total Biaya & HPP</span>
            <div style={{ fontSize: '1.25rem', fontWeight: '900', color: '#fb7185', marginTop: '2px' }}>
              {formatRupiah(getFilteredFinance().reduce((s, f) => s + (f.total_expense !== undefined ? f.total_expense : (f.expenses_breakdown || []).reduce((eS, ex) => eS + (ex.amount || 0), 0)), 0))}
            </div>
          </div>
        </div>

        {/* Card 3: Fisik Kas di Laci Kasir */}
        <div style={{ background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.15) 0%, rgba(30, 41, 59, 0.9) 100%)', border: '1px solid rgba(56, 189, 248, 0.4)', padding: '16px 18px', borderRadius: '14px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(56, 189, 248, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CreditCard size={24} color="#38bdf8" />
          </div>
          <div>
            <span style={{ fontSize: '0.74rem', color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase' }}>Total Fisik Kasir</span>
            <div style={{ fontSize: '1.25rem', fontWeight: '900', color: '#38bdf8', marginTop: '2px' }}>
              {formatRupiah(getFilteredFinance().reduce((s, f) => s + (f.actual_cash !== undefined ? f.actual_cash : (f.cash_physical !== undefined ? f.cash_physical : 0)), 0))}
            </div>
          </div>
        </div>

        {/* Card 4: Status Laporan */}
        <div style={{ background: 'linear-gradient(135deg, rgba(129, 140, 248, 0.15) 0%, rgba(30, 41, 59, 0.9) 100%)', border: '1px solid rgba(129, 140, 248, 0.4)', padding: '16px 18px', borderRadius: '14px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(129, 140, 248, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Receipt size={24} color="#818cf8" />
          </div>
          <div>
            <span style={{ fontSize: '0.74rem', color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase' }}>Persetujuan Laporan</span>
            <div style={{ fontSize: '1.1rem', fontWeight: '900', color: '#818cf8', marginTop: '2px', display: 'flex', gap: '8px', alignItems: 'center' }}>
              <span style={{ color: '#34d399' }}>✓ {getFilteredFinance().filter(f => f.status === 'ok' || f.status === 'approved').length} ACC</span>
              <span style={{ color: '#fbbf24' }}>⏳ {getFilteredFinance().filter(f => f.status !== 'ok' && f.status !== 'approved').length} Pending</span>
            </div>
          </div>
        </div>
      </div>

      {/* UNIFIED FILTER & ACTION BAR */}
      <div className="glass-card" style={{ padding: '16px', background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap', flex: 1 }}>
          
          {/* Filter Outlet */}
          <div style={{ minWidth: '200px' }}>
            <select 
              value={filterOutletId} 
              onChange={e => setFilterOutletId(e.target.value)} 
              className="form-select"
              style={{ height: '40px', fontSize: '0.82rem' }}
            >
              <option value="ALL">🏢 Semua Outlet Restoran</option>
              {outlets.map(o => (
                <option key={o.id} value={o.id}>{o.name}</option>
              ))}
            </select>
          </div>

          {/* Search Input */}
          <div style={{ flex: 1, minWidth: '240px', position: 'relative' }}>
            <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
            <input 
              type="text" 
              placeholder="Cari tanggal, no. laporan, outlet, atau nama kasir..." 
              value={searchQuery} 
              onChange={e => setSearchQuery(e.target.value)} 
              className="form-input" 
              style={{ paddingLeft: '36px', height: '40px', fontSize: '0.82rem' }} 
            />
          </div>

          {/* Column Selector Button */}
          <button
            onClick={() => setShowFinanceColDropdown(!showFinanceColDropdown)}
            className="btn-secondary"
            style={{
              padding: '8px 12px',
              height: '40px',
              fontSize: '0.8rem',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              color: showFinanceColDropdown ? '#818cf8' : '#cbd5e1',
              borderColor: showFinanceColDropdown ? '#818cf8' : 'rgba(255, 255, 255, 0.1)',
              background: showFinanceColDropdown ? 'rgba(99, 102, 241, 0.15)' : '#1e293b'
            }}
          >
            <SlidersHorizontal size={15} color="#818cf8" />
            <span>Pilih Kolom</span>
            <ChevronDown size={14} style={{ transform: showFinanceColDropdown ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
          </button>

          <button onClick={() => window.print()} className="btn-secondary" style={{ padding: '8px 14px', height: '40px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Printer size={15} />
            <span>Cetak PDF</span>
          </button>

        </div>

        <div style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: '700' }}>
          Total Laporan: <span style={{ color: '#6366f1', fontWeight: '900' }}>{getFilteredFinance().length} Data</span>
        </div>
      </div>

      {/* PAPAN FILTER VISIBILITAS KOLOM TABEL (DISUSUN LANGSUNG DI ATAS TABEL) */}
      {showFinanceColDropdown && (
        <div className="glass-card animate-fade-in" style={{ padding: '16px', border: '1.5px solid #818cf8', background: '#1e293b', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #334155', paddingBottom: '8px' }}>
            <div style={{ fontWeight: '800', color: '#f8fafc', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <SlidersHorizontal size={16} color="#818cf8" />
              <span>Papan Visibilitas Kolom Tabel Laporan Keuangan</span>
            </div>
            <button onClick={() => setShowFinanceColDropdown(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontWeight: '800', fontSize: '0.85rem' }}>
              ✕ Sembunyikan Papan Kolom
            </button>
          </div>
          
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', background: '#0f172a', padding: '12px', borderRadius: '8px', border: '1px solid #334155' }}>
            {[
              { key: 'date', label: '📅 Tanggal' },
              { key: 'reportNo', label: '🧾 No. Laporan' },
              { key: 'outlet', label: '🏢 Outlet & Shift' },
              { key: 'cashier', label: '👤 Kasir / Penanggung Jawab' },
              { key: 'netSales', label: '💵 Pendapatan (Net)' },
              { key: 'nonCashSales', label: '💳 Selain Cash' },
              { key: 'totalExpense', label: '📉 Total Pengeluaran' },
              { key: 'grossProfit', label: '💰 Laba Kotor' },
              { key: 'capitalReturn', label: '🏦 Uang Modal' },
              { key: 'status', label: '📌 Status' },
              { key: 'actions', label: '⚙️ Aksi' }
            ].map(col => {
              const isChecked = visibleColsFinance[col.key] !== false;
              return (
                <label key={col.key} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  cursor: 'pointer',
                  fontSize: '0.78rem',
                  color: isChecked ? '#818cf8' : '#cbd5e1',
                  fontWeight: isChecked ? '700' : '500',
                  background: isChecked ? 'rgba(99, 102, 241, 0.15)' : '#1e293b',
                  padding: '6px 10px',
                  borderRadius: '6px',
                  border: '1px solid',
                  borderColor: isChecked ? '#818cf8' : '#334155'
                }}>
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={(e) => setVisibleColsFinance({ ...visibleColsFinance, [col.key]: e.target.checked })}
                    style={{ accentColor: '#818cf8' }}
                  />
                  <span>{col.label}</span>
                </label>
              );
            })}
          </div>
        </div>
      )}

      {/* UNIFIED REKAP & PERSETUJUAN KEUANGAN TABLE */}
      <div className="glass-card" style={{ padding: '20px', background: '#0f172a', border: '1px solid #334155', borderRadius: '12px' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ background: '#1e293b', borderBottom: '1px solid #334155', color: '#cbd5e1', fontWeight: '800', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                {visibleColsFinance.date && <th style={{ padding: '12px 10px' }}>Tanggal</th>}
                {visibleColsFinance.reportNo && <th style={{ padding: '12px 10px' }}>No. Laporan</th>}
                {visibleColsFinance.outlet && <th style={{ padding: '12px 10px' }}>Outlet & Shift</th>}
                {visibleColsFinance.cashier && <th style={{ padding: '12px 10px' }}>Kasir / Penanggung Jawab</th>}
                {visibleColsFinance.netSales && <th style={{ padding: '12px 10px', textAlign: 'right' }}>Pendapatan (Net)</th>}
                {visibleColsFinance.nonCashSales && <th style={{ padding: '12px 10px', textAlign: 'right' }}>Selain Cash</th>}
                {visibleColsFinance.totalExpense && <th style={{ padding: '12px 10px', textAlign: 'right' }}>Total Pengeluaran</th>}
                {visibleColsFinance.grossProfit && <th style={{ padding: '12px 10px', textAlign: 'right' }}>Laba Kotor</th>}
                {visibleColsFinance.capitalReturn && <th style={{ padding: '12px 10px', textAlign: 'right' }}>Uang Modal</th>}
                {visibleColsFinance.actualCash && <th style={{ padding: '12px 10px', textAlign: 'right' }}>💵 Uang Di Laci (Fisik Kas)</th>}
                {visibleColsFinance.status && <th style={{ padding: '12px 10px', textAlign: 'center', width: '140px' }}>Tombol ACC</th>}
                {visibleColsFinance.actions && <th style={{ padding: '12px 10px', textAlign: 'center', width: '220px' }}>Aksi</th>}
              </tr>
            </thead>
            <tbody>
              {(() => {
                const rawList = masterData.approvedFinanceDaily || [];
                const filtered = rawList.filter(item => {
                  if (filterOutletId !== 'ALL' && Number(item.outlet_id) !== Number(filterOutletId)) return false;
                  if (searchQuery.trim()) {
                    const q = searchQuery.toLowerCase();
                    const matchDate = (item.date || '').toLowerCase().includes(q);
                    const matchBranch = (item.branch_name || '').toLowerCase().includes(q);
                    const matchAuthor = (item.author_name || item.cashier || '').toLowerCase().includes(q);
                    const matchNo = (item.report_no || item.id || '').toLowerCase().includes(q);
                    if (!matchDate && !matchBranch && !matchAuthor && !matchNo) return false;
                  }
                  return true;
                });

                const paginated = filtered.slice((currentPageFinance - 1) * pageSizeFinance, currentPageFinance * pageSizeFinance);

                if (paginated.length === 0) {
                  return (
                    <tr>
                      <td colSpan={12} style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                        Belum ada laporan keuangan untuk filter ini. Klik "+ Laporan dari Outlet Harian" di atas.
                      </td>
                    </tr>
                  );
                }

                return paginated.map(fin => {
                  const isOk = fin.status === 'ok' || fin.status === 'Approved' || fin.status === 'approved';
                  const net = fin.net_sales || fin.system_sales || 0;
                  const totalExp = fin.total_expense !== undefined 
                    ? fin.total_expense 
                    : ((fin.expenses_breakdown || []).reduce((sum, ex) => sum + (ex.amount || 0), 0));
                  const grossVal = net - totalExp;
                  const nonCash = fin.non_cash_sales || 0;
                  const debtPay = fin.debt_payment || 0;
                  const calculatedFisikKas = fin.actual_cash !== undefined 
                    ? fin.actual_cash 
                    : (fin.cash_physical !== undefined ? fin.cash_physical : (grossVal - debtPay - nonCash));

                  return (
                    <tr key={fin.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', color: '#f8fafc' }}>
                      {visibleColsFinance.date && <td style={{ padding: '12px 10px', color: '#94a3b8' }}>{fin.date}</td>}
                      {visibleColsFinance.reportNo && (
                        <td style={{ padding: '12px 10px' }}>
                          <span
                            onClick={() => setPreviewFinanceRecord(fin)}
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
                              gap: '6px'
                            }}
                          >
                            <Receipt size={13} color="#38bdf8" />
                            <span>{fin.report_no || fin.id}</span>
                          </span>
                        </td>
                      )}
                      {visibleColsFinance.outlet && (
                        <td style={{ padding: '12px 10px', fontWeight: '700' }}>
                          🏢 {fin.branch_name || (outlets.find(o => Number(o.id) === Number(fin.outlet_id))?.name || `Outlet #${fin.outlet_id}`)} {fin.shift ? <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: '500' }}>({fin.shift})</span> : null}
                        </td>
                      )}
                      {visibleColsFinance.cashier && <td style={{ padding: '12px 10px', color: '#cbd5e1' }}>👤 {fin.author_name || fin.cashier || 'Kasir/Admin'}</td>}
                      {visibleColsFinance.netSales && <td style={{ padding: '12px 10px', textAlign: 'right', fontWeight: '800', color: '#34d399' }}>{formatRupiah(net)}</td>}
                      {visibleColsFinance.nonCashSales && <td style={{ padding: '12px 10px', textAlign: 'right', color: '#38bdf8' }}>{formatRupiah(nonCash)}</td>}
                      {visibleColsFinance.totalExpense && <td style={{ padding: '12px 10px', textAlign: 'right', fontWeight: '800', color: '#fb7185' }}>-{formatRupiah(totalExp)}</td>}
                      {visibleColsFinance.grossProfit && <td style={{ padding: '12px 10px', textAlign: 'right', fontWeight: '800', color: grossVal >= 0 ? '#34d399' : '#fb7185' }}>{formatRupiah(grossVal)}</td>}
                      {visibleColsFinance.capitalReturn && <td style={{ padding: '12px 10px', textAlign: 'right', color: '#fbbf24' }}>{debtPay ? formatRupiah(debtPay) : '-'}</td>}
                      {visibleColsFinance.actualCash && <td style={{ padding: '12px 10px', textAlign: 'right', fontWeight: '900', color: '#34d399' }}>{formatRupiah(calculatedFisikKas)}</td>}
                      
                      {/* KOLOM TOMBOL ACC */}
                      {visibleColsFinance.status && (
                        <td style={{ padding: '12px 10px', textAlign: 'center' }}>
                          {!isOk ? (
                            <button
                              type="button"
                              onClick={() => handleDirectAccFinance(fin)}
                              className="btn-emerald"
                              style={{ padding: '6px 14px', fontSize: '0.78rem', fontWeight: '900', borderRadius: '8px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '5px', background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: '#ffffff', border: 'none', boxShadow: '0 2px 8px rgba(16,185,129,0.3)' }}
                              title="Klik untuk setujui laporan keuangan (ACC)"
                            >
                              <CheckCircle2 size={14} />
                              <span>ACC</span>
                            </button>
                          ) : (
                            <span style={{
                              padding: '5px 12px', borderRadius: '12px', fontSize: '0.74rem', fontWeight: '900',
                              background: 'rgba(52, 211, 153, 0.2)', color: '#34d399', border: '1px solid #34d399',
                              display: 'inline-flex', alignItems: 'center', gap: '4px'
                            }}>
                              <ShieldCheck size={14} color="#34d399" />
                              <span>APPROVED</span>
                            </span>
                          )}
                        </td>
                      )}

                      {/* KOLOM AKSI (PREVIEW, EDIT, DELETE) */}
                      {visibleColsFinance.actions && (
                        <td style={{ padding: '12px 10px', textAlign: 'center' }}>
                          <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', alignItems: 'center' }}>
                            <button
                              type="button"
                              onClick={() => setPreviewFinanceRecord(fin)}
                              style={{
                                background: 'rgba(99, 102, 241, 0.15)', border: '1px solid rgba(99, 102, 241, 0.3)', color: '#818cf8', padding: '5px 9px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '4px'
                              }}
                              title="Preview Laporan"
                            >
                              <Eye size={13} />
                              <span>Preview</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleOpenEditFinanceModal(fin)}
                              style={{
                                background: 'rgba(56, 189, 248, 0.15)', border: '1px solid rgba(56, 189, 248, 0.3)', color: '#38bdf8', padding: '5px 9px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '4px'
                              }}
                              title="Edit Laporan"
                            >
                              <Edit3 size={13} />
                              <span>Edit</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDeleteFinanceRecord(fin.id)}
                              style={{
                                background: 'rgba(244, 63, 94, 0.15)', border: '1px solid rgba(244, 63, 94, 0.3)', color: '#f43f5e', padding: '5px 9px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '4px'
                              }}
                              title="Hapus Laporan"
                            >
                              <Trash2 size={13} />
                              <span>Delete</span>
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                });
              })()}
            </tbody>
          </table>
        </div>

        {/* PAGINATION CONTROLS */}
        <PaginationControls
          currentPage={currentPageFinance}
          totalPages={Math.ceil((masterData.approvedFinanceDaily || []).length / pageSizeFinance) || 1}
          pageSize={pageSizeFinance}
          totalItems={(masterData.approvedFinanceDaily || []).length}
          onPageChange={setCurrentPageFinance}
          onPageSizeChange={setPageSizeFinance}
        />
      </div>

      {/* ========================================================= */}
      {/* MODAL FORM "+ TAMBAHKAN INPUT MANUAL" / "CATAT TRANSAKSI" */}
      {/* ========================================================= */}
      {showInputModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.82)', backdropFilter: 'blur(6px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 110
        }}>
          <div className="glass-card animate-fade-in" style={{
            width: '100%', maxWidth: '880px', maxHeight: '92vh', overflowY: 'auto',
            padding: '26px', background: '#1e293b', border: '1px solid #6366f1', borderRadius: '16px',
            display: 'flex', flexDirection: 'column', gap: '20px'
          }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #334155', paddingBottom: '14px' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: '900', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <FileEdit size={22} color="#6366f1" />
                <span>{editingRecord ? 'Edit Manual Laporan Keuangan' : 'Form Input Manual Laporan Keuangan Shift Kasir'}</span>
              </h3>
              <button onClick={() => setShowInputModal(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                <X size={22} />
              </button>
            </div>

            {/* FORM INPUT CONTENT */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              
              {/* 1. Header Information */}
              <div style={{ background: '#0f172a', padding: '16px', borderRadius: '10px', border: '1px solid #334155', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
                <div>
                  <label style={{ fontSize: '0.78rem', color: '#94a3b8', display: 'block', marginBottom: '4px', fontWeight: '700' }}>📅 Tanggal *</label>
                  <input type="date" value={entryDate} onChange={e => setEntryDate(e.target.value)} className="form-input" />
                </div>
                <div>
                  <label style={{ fontSize: '0.78rem', color: '#94a3b8', display: 'block', marginBottom: '4px', fontWeight: '700' }}>🏢 Nama Outlet *</label>
                  <select value={entryOutletId} onChange={e => setEntryOutletId(Number(e.target.value))} className="form-select">
                    {outlets.map(o => (
                      <option key={o.id} value={o.id}>{o.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.78rem', color: '#94a3b8', display: 'block', marginBottom: '4px', fontWeight: '700' }}>👤 Dibuat Oleh *</label>
                  <select value={createdBy} onChange={e => setCreatedBy(e.target.value)} className="form-select">
                    {adminList.map(a => (
                      <option key={a.id} value={a.name}>{a.name} ({a.role || 'Staf Outlet'})</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 2. Pendapatan (Sales Income Auto-Fetched) */}
              <div style={{ background: '#0f172a', padding: '16px', borderRadius: '10px', border: '1px solid #334155', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={{ fontSize: '0.78rem', color: '#34d399', fontWeight: '800', display: 'block', marginBottom: '4px' }}>Total Pendapatan Penjualan (Net Sales)</label>
                  <input type="number" value={netSales} onChange={e => setNetSales(Number(e.target.value))} className="form-input" style={{ fontWeight: '800', color: '#34d399', fontSize: '1.05rem' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.78rem', color: '#38bdf8', fontWeight: '800', display: 'block', marginBottom: '4px' }}>Penjualan Non-Cash (QRIS/Debit/Transfer)</label>
                  <input type="number" value={nonCashSales} onChange={e => setNonCashSales(Number(e.target.value))} className="form-input" style={{ fontWeight: '800', color: '#38bdf8', fontSize: '1.05rem' }} />
                </div>
              </div>

              {/* 3. Pengeluaran HPP (Bahan Mentah Dapur - MINIMAL 5 FIELD TERBUKA) */}
              <div style={{ background: '#0f172a', padding: '16px', borderRadius: '10px', border: '1px solid #fb7185', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                  <div>
                    <span style={{ fontSize: '0.85rem', fontWeight: '800', color: '#fb7185', display: 'block' }}>
                      📦 1) HPP / Bahan Mentah Dapur (Terbuka Minimal 5 Field)
                    </span>
                    <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                      Pilih dari dropdown atau gunakan pencarian master data.
                    </span>
                  </div>

                  <div style={{ position: 'relative', width: '220px' }}>
                    <Search size={14} color="#94a3b8" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
                    <input type="text" placeholder="Cari bahan mentah..." value={cogsSearchQuery} onChange={e => setCogsSearchQuery(e.target.value)} className="form-input" style={{ paddingLeft: '32px', height: '32px', fontSize: '0.75rem' }} />
                  </div>
                </div>

                {cogsSearchQuery.trim() !== '' && (
                  <div style={{ background: '#1e293b', padding: '8px', borderRadius: '6px', border: '1px solid #fb7185', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {filteredIngredients.map(ing => (
                      <button key={ing.id} type="button" onClick={() => handleAddCogsFromSearch(ing)} style={{ background: 'rgba(244, 63, 94, 0.2)', border: '1px solid #fb7185', color: '#fb7185', padding: '3px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: '700', cursor: 'pointer' }}>
                        + {ing.name} ({ing.unit || 'kg'})
                      </button>
                    ))}
                  </div>
                )}

                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                    <thead>
                      <tr style={{ color: '#94a3b8', borderBottom: '1px solid #334155', textAlign: 'left' }}>
                        <th style={{ padding: '8px 6px' }}>Nama Bahan Mentah</th>
                        <th style={{ padding: '8px 6px', width: '80px' }}>Qty</th>
                        <th style={{ padding: '8px 6px', width: '75px' }}>Satuan</th>
                        <th style={{ padding: '8px 6px', textAlign: 'right', width: '130px' }}>Harga Satuan</th>
                        <th style={{ padding: '8px 6px', textAlign: 'right', width: '140px' }}>Total HPP</th>
                        <th style={{ padding: '8px 6px', textAlign: 'center', width: '40px' }}>Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cogsRows.map((r, idx) => (
                        <tr key={r.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                          <td style={{ padding: '6px' }}>
                            <select 
                              value={r.name} 
                              onChange={e => handleUpdateCogsRow(r.id, 'name', e.target.value)} 
                              className="form-select" 
                              style={{ height: '32px', fontSize: '0.8rem', fontWeight: '700', color: '#fb7185' }}
                            >
                              {ingredientsList.map(ing => (
                                <option key={ing.id} value={ing.name}>{ing.name}</option>
                              ))}
                            </select>
                          </td>
                          <td style={{ padding: '6px' }}>
                            <input type="number" value={r.qty} onChange={e => handleUpdateCogsRow(r.id, 'qty', e.target.value)} className="form-input" style={{ height: '32px', fontSize: '0.8rem' }} />
                          </td>
                          <td style={{ padding: '6px', color: '#cbd5e1' }}>{r.unit}</td>
                          <td style={{ padding: '6px' }}>
                            <input type="number" value={r.price_unit} onChange={e => handleUpdateCogsRow(r.id, 'price_unit', e.target.value)} className="form-input" style={{ height: '32px', fontSize: '0.8rem', textAlign: 'right' }} />
                          </td>
                          <td style={{ padding: '6px', textAlign: 'right', fontWeight: '800', color: '#fb7185' }}>
                            {formatRupiah(r.amount)}
                          </td>
                          <td style={{ padding: '6px', textAlign: 'center' }}>
                            <button onClick={() => handleRemoveCogsRow(r.id)} style={{ background: 'none', border: 'none', color: '#f43f5e', cursor: 'pointer' }}>✕</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* TOMBOL "+ TAMBAH FIELD HPP BAHAN MENTAH" */}
                <button 
                  type="button" 
                  onClick={handleAddBlankCogsRow} 
                  style={{
                    alignSelf: 'flex-start', background: 'rgba(244, 63, 94, 0.15)', border: '1px solid rgba(244, 63, 94, 0.4)',
                    color: '#fb7185', padding: '6px 14px', borderRadius: '6px', fontSize: '0.78rem', fontWeight: '800',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px'
                  }}
                >
                  <PlusCircle size={14} />
                  <span>+ Tambah Field HPP Bahan Mentah</span>
                </button>
              </div>

              {/* 4. Biaya Operasional (MINIMAL 5 FIELD TERBUKA) */}
              <div style={{ background: '#0f172a', padding: '16px', borderRadius: '10px', border: '1px solid #38bdf8', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                  <div>
                    <span style={{ fontSize: '0.85rem', fontWeight: '800', color: '#38bdf8', display: 'block' }}>
                      💵 2) Biaya Operasional & Utilitas (Terbuka Minimal 5 Field)
                    </span>
                    <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                      Pilih dari dropdown atau gunakan pencarian master data biaya.
                    </span>
                  </div>

                  <div style={{ position: 'relative', width: '220px' }}>
                    <Search size={14} color="#94a3b8" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
                    <input type="text" placeholder="Cari akun biaya..." value={expenseSearchQuery} onChange={e => setExpenseSearchQuery(e.target.value)} className="form-input" style={{ paddingLeft: '32px', height: '32px', fontSize: '0.75rem' }} />
                  </div>
                </div>

                {expenseSearchQuery.trim() !== '' && (
                  <div style={{ background: '#1e293b', padding: '8px', borderRadius: '6px', border: '1px solid #38bdf8', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {filteredExpenseMaster.map(exp => (
                      <button key={exp.id} type="button" onClick={() => handleAddExpenseFromSearch(exp)} style={{ background: 'rgba(56, 189, 248, 0.2)', border: '1px solid #38bdf8', color: '#38bdf8', padding: '3px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: '700', cursor: 'pointer' }}>
                        + {exp.name} ({exp.code || 'BIA'})
                      </button>
                    ))}
                  </div>
                )}

                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                    <thead>
                      <tr style={{ color: '#94a3b8', borderBottom: '1px solid #334155', textAlign: 'left' }}>
                        <th style={{ padding: '8px 6px' }}>Nama Akun Biaya</th>
                        <th style={{ padding: '8px 6px' }}>Kelompok Laporan</th>
                        <th style={{ padding: '8px 6px', textAlign: 'right', width: '180px' }}>Nominal Biaya (IDR)</th>
                        <th style={{ padding: '8px 6px', textAlign: 'center', width: '40px' }}>Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {expenseRows.map((r, idx) => (
                        <tr key={r.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                          <td style={{ padding: '6px' }}>
                            <select 
                              value={r.name} 
                              onChange={e => handleUpdateExpenseRow(r.id, 'name', e.target.value)} 
                              className="form-select" 
                              style={{ height: '32px', fontSize: '0.8rem', fontWeight: '700', color: '#38bdf8' }}
                            >
                              {expenseMasterList.map(exp => (
                                <option key={exp.id} value={exp.name}>{exp.name}</option>
                              ))}
                            </select>
                          </td>
                          <td style={{ padding: '6px', color: '#cbd5e1', fontSize: '0.72rem' }}>{r.category}</td>
                          <td style={{ padding: '6px' }}>
                            <input type="number" value={r.amount} onChange={e => handleUpdateExpenseRow(r.id, 'amount', e.target.value)} className="form-input" style={{ height: '32px', fontSize: '0.8rem', textAlign: 'right', fontWeight: '700', color: '#fb7185' }} />
                          </td>
                          <td style={{ padding: '6px', textAlign: 'center' }}>
                            <button onClick={() => handleRemoveExpenseRow(r.id)} style={{ background: 'none', border: 'none', color: '#f43f5e', cursor: 'pointer' }}>✕</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* TOMBOL "+ TAMBAH FIELD BIAYA OPERASIONAL" */}
                <button 
                  type="button" 
                  onClick={handleAddBlankExpenseRow} 
                  style={{
                    alignSelf: 'flex-start', background: 'rgba(56, 189, 248, 0.15)', border: '1px solid rgba(56, 189, 248, 0.4)',
                    color: '#38bdf8', padding: '6px 14px', borderRadius: '6px', fontSize: '0.78rem', fontWeight: '800',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px'
                  }}
                >
                  <PlusCircle size={14} />
                  <span>+ Tambah Field Biaya Operasional</span>
                </button>
              </div>

              {/* 5. Kalkulasi & Uang Di Laci */}
              <div style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', padding: '16px', borderRadius: '10px', border: '1px solid #6366f1', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
                <div>
                  <span style={{ fontSize: '0.75rem', color: '#fb7185', fontWeight: '700' }}>Total Pengeluaran</span>
                  <div style={{ fontSize: '1.05rem', fontWeight: '900', color: '#fb7185', marginTop: '2px' }}>-{formatRupiah(grandTotalExpense)}</div>
                </div>

                <div>
                  <span style={{ fontSize: '0.75rem', color: '#38bdf8', fontWeight: '700' }}>Laba Kotor</span>
                  <div style={{ fontSize: '1.05rem', fontWeight: '900', color: grossProfit >= 0 ? '#34d399' : '#fb7185', marginTop: '2px' }}>{formatRupiah(grossProfit)}</div>
                </div>

                <div>
                  <span style={{ fontSize: '0.75rem', color: '#fbbf24', fontWeight: '700' }}>Pengembalian Uang Modal (Simpanan)</span>
                  <input type="number" value={debtPayment} onChange={e => setDebtPayment(Number(e.target.value))} className="form-input" style={{ height: '32px', fontSize: '0.85rem', fontWeight: '800', color: '#fbbf24', marginTop: '2px' }} />
                </div>

                <div style={{ background: 'rgba(16, 185, 129, 0.2)', padding: '8px 12px', borderRadius: '8px', border: '1px solid #10b981' }}>
                  <span style={{ fontSize: '0.75rem', color: '#34d399', fontWeight: '800' }}>💵 UANG DI LACI</span>
                  <div style={{ fontSize: '1.15rem', fontWeight: '900', color: '#34d399', marginTop: '2px' }}>{formatRupiah(cashInDrawer)}</div>
                </div>
              </div>

              {/* Action Modal Buttons */}
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '8px' }}>
                <button type="button" onClick={() => setShowInputModal(false)} className="btn-secondary" style={{ padding: '10px 20px' }}>
                  Batal
                </button>
                <button type="button" onClick={handlePreviewFormDraft} className="btn-primary" style={{ padding: '10px 24px', background: '#6366f1', color: 'white' }}>
                  <Eye size={16} />
                  <span>Lihat Pratinjau (Preview)</span>
                </button>
              </div>

            </div>

          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL PAPAN PREVIEW RINGKASAN NOTA LAPORAN                */}
      {/* ========================================================= */}
      {previewingRecord && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.82)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 120
        }}>
          <div className="glass-card animate-fade-in" style={{
            width: '100%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto',
            padding: '26px', background: '#1e293b', border: '1px solid #6366f1', borderRadius: '16px'
          }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #334155', paddingBottom: '12px', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: '900', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Eye size={20} color="#6366f1" />
                <span>Papan Pratinjau Laporan Shift Kasir</span>
              </h3>
              <button onClick={() => setPreviewingRecord(null)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '0.85rem' }}>
              
              <div style={{ background: '#0f172a', padding: '12px', borderRadius: '8px', border: '1px solid #334155', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div>
                  <span style={{ color: '#94a3b8', fontSize: '0.72rem', display: 'block' }}>Cabang Outlet:</span>
                  <span style={{ color: '#f8fafc', fontWeight: '800' }}>🏢 {previewingRecord.branch_name}</span>
                </div>
                <div>
                  <span style={{ color: '#94a3b8', fontSize: '0.72rem', display: 'block' }}>Tanggal Shift:</span>
                  <span style={{ color: '#f8fafc', fontWeight: '800' }}>📅 {previewingRecord.date}</span>
                </div>
                <div>
                  <span style={{ color: '#94a3b8', fontSize: '0.72rem', display: 'block' }}>Penanggung Jawab:</span>
                  <span style={{ color: '#818cf8', fontWeight: '800' }}>👤 {previewingRecord.author_name}</span>
                </div>
                <div>
                  <span style={{ color: '#94a3b8', fontSize: '0.72rem', display: 'block' }}>Status:</span>
                  <span style={{ color: previewingRecord.status === 'ok' ? '#34d399' : '#fbbf24', fontWeight: '800' }}>
                    {previewingRecord.status === 'ok' ? '✓ Approved' : '⏳ Pending'}
                  </span>
                </div>
              </div>

              {/* Finansial Breakdown */}
              <div style={{ background: '#0f172a', padding: '14px', borderRadius: '8px', border: '1px solid #334155', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#34d399' }}>
                  <span>Pendapatan Penjualan (Net Sales)</span>
                  <span style={{ fontWeight: '800' }}>+{formatRupiah(previewingRecord.net_sales)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#38bdf8', paddingLeft: '10px', fontSize: '0.78rem' }}>
                  <span>• Penjualan Non-Cash (QRIS/Debit)</span>
                  <span>{formatRupiah(previewingRecord.non_cash_sales)}</span>
                </div>

                <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '6px', display: 'flex', justifyContent: 'space-between', color: '#fb7185' }}>
                  <span>Total Pengeluaran (HPP + OPEX)</span>
                  <span style={{ fontWeight: '800' }}>-{formatRupiah(previewingRecord.total_expense)}</span>
                </div>
                
                {(previewingRecord.expenses_breakdown || []).map((ex, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', color: '#cbd5e1', paddingLeft: '10px', fontSize: '0.76rem' }}>
                    <span>• {ex.category}</span>
                    <span>{formatRupiah(ex.amount)}</span>
                  </div>
                ))}

                <div style={{ borderTop: '1px solid #334155', paddingTop: '8px', display: 'flex', justifyContent: 'space-between', fontWeight: '800' }}>
                  <span style={{ color: '#818cf8' }}>Laba Kotor</span>
                  <span style={{ color: ((previewingRecord.net_sales || 0) - (previewingRecord.total_expense || 0)) >= 0 ? '#34d399' : '#fb7185' }}>
                    {formatRupiah((previewingRecord.net_sales || 0) - (previewingRecord.total_expense || 0))}
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#fbbf24', fontSize: '0.8rem' }}>
                  <span>(-) Pengembalian Uang Modal (Simpanan)</span>
                  <span>-{formatRupiah(previewingRecord.debt_payment)}</span>
                </div>

                <div style={{ background: 'rgba(16, 185, 129, 0.2)', padding: '8px 10px', borderRadius: '6px', border: '1px solid #10b981', display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                  <span style={{ fontWeight: '800', color: '#34d399' }}>💵 UANG DI LACI (KAS FISIK DITUTUP)</span>
                  <span style={{ fontWeight: '900', color: '#34d399', fontSize: '1rem' }}>{formatRupiah(previewingRecord.cash_physical)}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                <button 
                  type="button" 
                  onClick={() => {
                    setPreviewingRecord(null);
                    setShowInputModal(true);
                  }} 
                  className="btn-secondary" 
                  style={{ flex: 1, justifyContent: 'center', padding: '10px' }}
                >
                  <Edit3 size={15} />
                  <span>Edit Kembali Data</span>
                </button>

                <button 
                  type="button" 
                  onClick={handleFinalSubmit} 
                  className="btn-primary" 
                  style={{ flex: 1, justifyContent: 'center', padding: '10px', background: '#10b981', color: '#ffffff' }}
                >
                  <CheckCircle2 size={15} />
                  <span>Simpan & Kirim ke Persetujuan</span>
                </button>
              </div>

            </div>

          </div>
        </div>
      )}

      {/* FINANCE MODAL: DETAIL LAPORAN KEUANGAN YANG DITERIMA */}
      {previewFinanceRecord && (() => {
        const isApproved = previewFinanceRecord.status === 'approved' || previewFinanceRecord.status === 'ok';
        const netSalesVal = Number(previewFinanceRecord.net_sales || previewFinanceRecord.system_sales || 0);
        const cashSalesVal = Number(previewFinanceRecord.cash_sales || (netSalesVal - Number(previewFinanceRecord.non_cash_sales || 0)));
        const nonCashSalesVal = Number(previewFinanceRecord.non_cash_sales || 0);
        const totalExpVal = Number(previewFinanceRecord.total_expense !== undefined ? previewFinanceRecord.total_expense : ((previewFinanceRecord.expenses_breakdown || []).reduce((s, e) => s + (e.amount || 0), 0)));
        const labaKotorVal = netSalesVal - totalExpVal;
        const fisikKasVal = Number(previewFinanceRecord.actual_cash !== undefined ? previewFinanceRecord.actual_cash : (previewFinanceRecord.cash_physical !== undefined ? previewFinanceRecord.cash_physical : (labaKotorVal - nonCashSalesVal)));

        const cogsList = previewFinanceRecord.cogs_breakdown || previewFinanceRecord.cogs_items || [];
        const expList = previewFinanceRecord.expenses_breakdown || [];
        const combinedBreakdown = [...cogsList, ...expList];

        return (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 130 }}>
            <div className="glass-card animate-fade-in" style={{ padding: '24px', width: '100%', maxWidth: '820px', maxHeight: '92vh', overflowY: 'auto', background: '#1e293b', border: '1px solid #38bdf8', borderRadius: '18px', display: 'flex', flexDirection: 'column', gap: '18px', boxShadow: '0 20px 50px rgba(0,0,0,0.6)' }}>
              
              {/* Header Modal */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #334155', paddingBottom: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'rgba(56, 189, 248, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(56, 189, 248, 0.3)' }}>
                    <Receipt size={24} color="#38bdf8" />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1.2rem', fontWeight: '900', color: '#f8fafc', margin: 0 }}>
                      📋 Detail Laporan Keuangan yang Diterima
                    </h3>
                    <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                      Nomor Laporan: <strong style={{ color: '#38bdf8' }}>{previewFinanceRecord.report_no || previewFinanceRecord.id}</strong>
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{
                    padding: '5px 12px', borderRadius: '12px', fontSize: '0.74rem', fontWeight: '900',
                    background: isApproved ? 'rgba(52, 211, 153, 0.2)' : 'rgba(251, 191, 36, 0.2)',
                    color: isApproved ? '#34d399' : '#fbbf24',
                    border: `1px solid ${isApproved ? '#34d399' : '#fbbf24'}`
                  }}>
                    {isApproved ? '🟢 APPROVED' : '⏳ PENDING'}
                  </span>
                  <button onClick={() => setPreviewFinanceRecord(null)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                    <X size={24} />
                  </button>
                </div>
              </div>

              {/* Grid Metadata Laporan */}
              <div style={{ background: '#0f172a', padding: '16px', borderRadius: '12px', border: '1px solid #334155', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px', fontSize: '0.82rem' }}>
                <div>
                  <span style={{ color: '#94a3b8', fontSize: '0.74rem', display: 'block', fontWeight: '700' }}>📅 Tanggal Shift</span>
                  <span style={{ fontWeight: '800', color: '#f8fafc', fontSize: '0.92rem' }}>{previewFinanceRecord.date}</span>
                </div>
                <div>
                  <span style={{ color: '#94a3b8', fontSize: '0.74rem', display: 'block', fontWeight: '700' }}>🏢 Outlet & Shift</span>
                  <span style={{ fontWeight: '800', color: '#38bdf8', fontSize: '0.92rem' }}>{previewFinanceRecord.branch_name || (outlets.find(o => Number(o.id) === Number(previewFinanceRecord.outlet_id))?.name || `Outlet #${previewFinanceRecord.outlet_id}`)}</span>
                </div>
                <div>
                  <span style={{ color: '#94a3b8', fontSize: '0.74rem', display: 'block', fontWeight: '700' }}>👤 Dibuat Oleh / Kasir</span>
                  <span style={{ fontWeight: '800', color: '#34d399', fontSize: '0.92rem' }}>{previewFinanceRecord.author_name || previewFinanceRecord.cashier || 'Kasir POS'}</span>
                </div>
              </div>

              {/* Grid Financial Cards Summary */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                <div style={{ background: 'rgba(52, 211, 153, 0.1)', padding: '12px 14px', borderRadius: '10px', border: '1px solid rgba(52, 211, 153, 0.3)' }}>
                  <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase' }}>💰 Total Net Sales</span>
                  <div style={{ fontSize: '1.15rem', fontWeight: '900', color: '#34d399', marginTop: '2px' }}>{formatRupiah(netSalesVal)}</div>
                  <div style={{ fontSize: '0.68rem', color: '#94a3b8', marginTop: '4px' }}>
                    Cash: <strong style={{ color: '#34d399' }}>{formatRupiah(cashSalesVal)}</strong> | QRIS/EDC: <strong style={{ color: '#38bdf8' }}>{formatRupiah(nonCashSalesVal)}</strong>
                  </div>
                </div>

                <div style={{ background: 'rgba(251, 113, 133, 0.1)', padding: '12px 14px', borderRadius: '10px', border: '1px solid rgba(251, 113, 133, 0.3)' }}>
                  <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase' }}>🔥 Total Pengeluaran</span>
                  <div style={{ fontSize: '1.15rem', fontWeight: '900', color: '#fb7185', marginTop: '2px' }}>-{formatRupiah(totalExpVal)}</div>
                  <div style={{ fontSize: '0.68rem', color: '#94a3b8', marginTop: '4px' }}>
                    Laba Kotor: <strong style={{ color: labaKotorVal >= 0 ? '#34d399' : '#fb7185' }}>{formatRupiah(labaKotorVal)}</strong>
                  </div>
                </div>

                <div style={{ background: 'rgba(56, 189, 248, 0.1)', padding: '12px 14px', borderRadius: '10px', border: '1px solid rgba(56, 189, 248, 0.3)' }}>
                  <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase' }}>💵 Uang Fisik Di Laci Kasir</span>
                  <div style={{ fontSize: '1.15rem', fontWeight: '900', color: '#38bdf8', marginTop: '2px' }}>{formatRupiah(fisikKasVal)}</div>
                  <div style={{ fontSize: '0.68rem', color: '#94a3b8', marginTop: '4px' }}>
                    Sisa Kas Modal: <strong style={{ color: '#fbbf24' }}>{formatRupiah(previewFinanceRecord.sisa_uang_kas || 2000000)}</strong>
                  </div>
                </div>
              </div>

              {/* Tabel Detail Breakdown Pengeluaran */}
              <div style={{ background: '#0f172a', borderRadius: '12px', border: '1px solid #334155', overflow: 'hidden' }}>
                <div style={{ padding: '10px 16px', background: '#1e293b', borderBottom: '1px solid #334155', fontSize: '0.82rem', fontWeight: '800', color: '#f8fafc', display: 'flex', justifyContent: 'space-between' }}>
                  <span>📦 Rincian Pengeluaran Bahan Baku & Biaya Operasional</span>
                  <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Total Item: {combinedBreakdown.length}</span>
                </div>
                <div style={{ overflowX: 'auto', maxHeight: '220px' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.80rem', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ background: '#0f172a', color: '#94a3b8', borderBottom: '1px solid #334155', textTransform: 'uppercase', fontSize: '0.72rem' }}>
                        <th style={{ padding: '8px 10px', width: '35px', textAlign: 'center' }}>#</th>
                        <th style={{ padding: '8px 10px' }}>Nama Bahan Baku / Biaya</th>
                        <th style={{ padding: '8px 10px' }}>Jenis Pengeluaran</th>
                        <th style={{ padding: '8px 10px', width: '80px', textAlign: 'center' }}>Qty</th>
                        <th style={{ padding: '8px 10px', textAlign: 'right' }}>Harga Satuan</th>
                        <th style={{ padding: '8px 10px', textAlign: 'right' }}>Total Harga</th>
                      </tr>
                    </thead>
                    <tbody>
                      {combinedBreakdown.length === 0 ? (
                        <tr>
                          <td colSpan={6} style={{ padding: '20px', textAlign: 'center', color: '#64748b' }}>
                            Tidak ada rincian pengeluaran item.
                          </td>
                        </tr>
                      ) : (
                        combinedBreakdown.map((item, idx) => {
                          const isIng = item.category === 'HPP Dapur (Bahan Mentah)' || item.unit !== undefined;
                          return (
                            <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                              <td style={{ padding: '8px 10px', textAlign: 'center', color: '#94a3b8' }}>{idx + 1}</td>
                              <td style={{ padding: '8px 10px', fontWeight: '800', color: isIng ? '#fb7185' : '#38bdf8' }}>
                                {item.name || item.itemName}
                              </td>
                              <td style={{ padding: '8px 10px' }}>
                                <span style={{
                                  padding: '2px 6px', borderRadius: '4px', fontSize: '0.68rem', fontWeight: '800',
                                  background: isIng ? 'rgba(251, 113, 133, 0.15)' : 'rgba(56, 189, 248, 0.15)',
                                  color: isIng ? '#fb7185' : '#38bdf8', border: `1px solid ${isIng ? '#fb7185' : '#38bdf8'}`
                                }}>
                                  {item.category || (isIng ? 'HPP Dapur (Bahan Mentah)' : 'Biaya Operasional (OPEX)')}
                                </span>
                              </td>
                              <td style={{ padding: '8px 10px', textAlign: 'center', color: '#cbd5e1', fontWeight: '700' }}>
                                {item.qty || 1} {item.unit || ''}
                              </td>
                              <td style={{ padding: '8px 10px', textAlign: 'right', color: '#cbd5e1' }}>
                                {formatRupiah(item.price_unit || item.priceUnit || item.amount || 0)}
                              </td>
                              <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: '900', color: isIng ? '#fb7185' : '#38bdf8' }}>
                                {formatRupiah(item.amount || (item.qty * (item.price_unit || item.priceUnit || 0)))}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Notes & Keterangan */}
              {previewFinanceRecord.notes && (
                <div style={{ background: '#0f172a', padding: '12px 14px', borderRadius: '10px', border: '1px solid #334155', fontSize: '0.80rem' }}>
                  <span style={{ color: '#94a3b8', fontWeight: '700', display: 'block', marginBottom: '2px' }}>📝 Catatan Kasir:</span>
                  <span style={{ color: '#cbd5e1', fontStyle: 'italic' }}>{previewFinanceRecord.notes}</span>
                </div>
              )}

              {/* Footer Modal Action Buttons */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #334155', paddingTop: '14px' }}>
                {!isApproved ? (
                  <button
                    type="button"
                    onClick={() => {
                      handleDirectAccFinance(previewFinanceRecord);
                      setPreviewFinanceRecord(null);
                    }}
                    className="btn-emerald"
                    style={{ padding: '10px 18px', fontSize: '0.82rem', fontWeight: '900', borderRadius: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: '#ffffff', border: 'none', boxShadow: '0 4px 12px rgba(16,185,129,0.3)' }}
                  >
                    <CheckCircle2 size={16} />
                    <span>Setujui Laporan Ini (ACC)</span>
                  </button>
                ) : (
                  <span style={{ fontSize: '0.78rem', color: '#34d399', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <ShieldCheck size={18} color="#34d399" />
                    <span>Laporan Ini Telah Disetujui & Diverifikasi (ACC)</span>
                  </span>
                )}

                <button
                  type="button"
                  onClick={() => setPreviewFinanceRecord(null)}
                  style={{ padding: '10px 20px', background: '#334155', color: '#ffffff', border: 'none', borderRadius: '10px', fontWeight: '800', fontSize: '0.82rem', cursor: 'pointer' }}
                >
                  Tutup Detail
                </button>
              </div>

            </div>
          </div>
        );
      })()}

      {/* FINANCE MODAL: ACC KEUANGAN KASIR */}
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
                    {outlets.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                  </select>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: '700' }}>Kasir POS</span>
                  <input type="text" value={finFormCashier} onChange={e => setFinFormCashier(e.target.value)} style={{ padding: '8px', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', color: 'white', fontSize: '0.82rem' }} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', background: '#0f172a', padding: '10px', borderRadius: '8px', border: '1px solid rgba(56, 189, 248, 0.3)' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ fontSize: '0.68rem', color: '#38bdf8', fontWeight: '700' }}>Omzet Kotor</span>
                  <input type="number" value={finFormGrossSales} onChange={e => setFinFormGrossSales(e.target.value)} style={{ padding: '6px', background: '#1e293b', border: '1px solid #334155', borderRadius: '6px', color: 'white', fontSize: '0.78rem', fontWeight: '700' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ fontSize: '0.68rem', color: '#fb7185', fontWeight: '700' }}>Diskon</span>
                  <input type="number" value={finFormDiscount} onChange={e => setFinFormDiscount(e.target.value)} style={{ padding: '6px', background: '#1e293b', border: '1px solid #334155', borderRadius: '6px', color: 'white', fontSize: '0.78rem' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ fontSize: '0.68rem', color: '#818cf8', fontWeight: '700' }}>Selain Cash</span>
                  <input type="number" value={finFormNonCashSales} onChange={e => setFinFormNonCashSales(e.target.value)} style={{ padding: '6px', background: '#1e293b', border: '1px solid #818cf8', borderRadius: '6px', color: 'white', fontSize: '0.78rem', fontWeight: '700' }} />
                </div>
              </div>

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

      {/* FINANCE MODAL: EDIT LAPORAN KEUANGAN KASIR */}
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
                    {outlets.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                  </select>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: '700' }}>Kasir POS</span>
                  <input type="text" value={finFormCashier} onChange={e => setFinFormCashier(e.target.value)} style={{ padding: '8px', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', color: 'white', fontSize: '0.82rem' }} />
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
                <button type="button" onClick={() => setEditFinanceModalRecord(null)} className="btn-secondary" style={{ padding: '8px 16px', fontSize: '0.8rem' }}>Batal</button>
                <button type="submit" className="btn-primary" style={{ padding: '8px 16px', fontSize: '0.8rem', fontWeight: '800' }}>
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        );
      })()}

      {/* ========================================================= */}
      {/* MODAL FORM "+ LAPORAN KEUANGAN HARIAN" (12 MANDATORY RULES) */}
      {/* ========================================================= */}
      {showDailyReportModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 120
        }}>
          <div className="glass-card animate-fade-in" style={{
            width: '100%', maxWidth: '980px', maxHeight: '94vh', overflowY: 'auto',
            padding: '28px', background: '#1e293b', border: '1px solid #6366f1', borderRadius: '18px',
            display: 'flex', flexDirection: 'column', gap: '20px', boxShadow: '0 20px 50px rgba(0,0,0,0.5)'
          }}>
            {/* Header Modal */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #334155', paddingBottom: '14px' }}>
              <h3 style={{ fontSize: '1.3rem', fontWeight: '900', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Receipt size={24} color="#6366f1" />
                <span>Form Laporan Keuangan Harian</span>
              </h3>
              <button onClick={() => setShowDailyReportModal(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSaveDailyReportModal} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              
              {/* 1. TOP HEADER FIELDS (Tanggal, Nama Outlet, Dibuat Oleh) */}
              <div style={{ background: '#0f172a', padding: '16px', borderRadius: '12px', border: '1px solid #334155', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px' }}>
                <div>
                  <label style={{ fontSize: '0.78rem', color: '#cbd5e1', display: 'block', marginBottom: '4px', fontWeight: '700' }}>📅 Tanggal *</label>
                  <input type="date" required value={dailyRepDate} onChange={e => setDailyRepDate(e.target.value)} className="form-input" style={{ width: '100%', height: '40px' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.78rem', color: '#cbd5e1', display: 'block', marginBottom: '4px', fontWeight: '700' }}>🏢 Nama Outlet *</label>
                  <input
                    type="text"
                    readOnly
                    value={outlets.find(o => o.id === dailyRepOutletId)?.name || outlets[0]?.name || 'Restoran Utama'}
                    className="form-input"
                    style={{ width: '100%', height: '40px', background: '#0f172a', color: '#38bdf8', fontWeight: '800', border: '1px solid #334155', cursor: 'not-allowed' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.78rem', color: '#cbd5e1', display: 'block', marginBottom: '4px', fontWeight: '700' }}>👤 Dibuat Oleh *</label>
                  <input
                    type="text"
                    readOnly
                    value={dailyRepCreatedBy || masterData?.currentUser?.name || masterData?.user?.name || adminList[0]?.name || 'Master Super Admin'}
                    className="form-input"
                    style={{ width: '100%', height: '40px', background: '#0f172a', color: '#34d399', fontWeight: '800', border: '1px solid #334155', cursor: 'not-allowed' }}
                  />
                </div>
              </div>

              {/* 2. AUTO-GENERATED SALES BREAKDOWN (CASH, NON-CASH, TOTAL) */}
              <div style={{ background: 'linear-gradient(135deg, rgba(52, 211, 153, 0.1) 0%, rgba(15, 23, 42, 0.9) 100%)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(52, 211, 153, 0.3)', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px' }}>
                <div>
                  <span style={{ fontSize: '0.74rem', color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase' }}>💵 Penjualan Cash (Tunai)</span>
                  <div style={{ fontSize: '1.2rem', fontWeight: '900', color: '#34d399', marginTop: '2px' }}>{formatRupiah(autoCashSales)}</div>
                  <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>Ter-generate otomatis (Hingga 23:59:59)</span>
                </div>
                <div>
                  <span style={{ fontSize: '0.74rem', color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase' }}>💳 Penjualan Non-Cash (EDC/QRIS)</span>
                  <div style={{ fontSize: '1.2rem', fontWeight: '900', color: '#38bdf8', marginTop: '2px' }}>{formatRupiah(autoNonCashSales)}</div>
                  <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>Ter-generate otomatis</span>
                </div>
                <div style={{ background: 'rgba(52, 211, 153, 0.15)', padding: '10px 14px', borderRadius: '10px', border: '1px solid rgba(52, 211, 153, 0.4)' }}>
                  <span style={{ fontSize: '0.74rem', color: '#34d399', fontWeight: '900', textTransform: 'uppercase' }}>💰 Total Pendapatan Penjualan</span>
                  <div style={{ fontSize: '1.3rem', fontWeight: '900', color: '#34d399', marginTop: '2px' }}>{formatRupiah(autoTotalSales)}</div>
                </div>
              </div>

              {/* 3. EXPENSES & BAHAN BAKU TABLE (BAHAN BAKU / BIAYA) */}
              <div style={{ background: '#0f172a', borderRadius: '12px', border: '1px solid #334155', overflow: 'hidden' }}>
                <div style={{ padding: '12px 16px', background: '#1e293b', borderBottom: '1px solid #334155', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.88rem', fontWeight: '800', color: '#f8fafc' }}>
                    📦 Tabel Pengeluaran Bahan Baku & Biaya Operasional
                  </span>
                  <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                    Bahan Baku (Master Data Bahan Baku) | Biaya (Master Data Biaya)
                  </span>
                </div>

                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.82rem' }}>
                    <thead>
                      <tr style={{ background: '#0f172a', color: '#94a3b8', borderBottom: '1px solid #334155', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                        <th style={{ padding: '10px', width: '40px', textAlign: 'center' }}>#</th>
                        <th style={{ padding: '10px' }}>Bahan Baku / Biaya</th>
                        <th style={{ padding: '10px', width: '220px' }}>Jenis Pengeluaran (Otomatis)</th>
                        <th style={{ padding: '10px', width: '80px', textAlign: 'center' }}>Jumlah</th>
                        <th style={{ padding: '10px', width: '130px', textAlign: 'right' }}>Harga Satuan</th>
                        <th style={{ padding: '10px', width: '140px', textAlign: 'right' }}>Total Harga</th>
                        <th style={{ padding: '10px', width: '45px', textAlign: 'center' }}>Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dailyExpenseRows.map((r, idx) => {
                        const isIng = r.itemType === 'Bahan Baku';
                        return (
                          <tr key={r.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                            <td style={{ padding: '8px', textAlign: 'center', color: '#94a3b8', fontWeight: '700' }}>{idx + 1}</td>
                            
                            {/* Autocomplete Sugesti Bahan Baku / Biaya */}
                            <td style={{ padding: '8px' }}>
                              <input
                                type="text"
                                list={`suggest-daily-${r.id}`}
                                value={r.itemName}
                                onChange={e => handleUpdateDailyExpenseRow(r.id, 'itemName', e.target.value)}
                                placeholder="Ketik/Pilih Bahan Baku atau Biaya..."
                                className="form-input"
                                style={{ width: '100%', height: '34px', fontSize: '0.8rem', fontWeight: '800', color: isIng ? '#fb7185' : '#38bdf8' }}
                              />
                              <datalist id={`suggest-daily-${r.id}`}>
                                {combinedMasterItemsList.map((m, mIdx) => (
                                  <option key={mIdx} value={m.name}>
                                    {m.itemType === 'Bahan Baku' ? '🌾' : '📊'} {m.name} ({m.category})
                                  </option>
                                ))}
                              </datalist>
                            </td>

                            {/* Jenis Pengeluaran (Auto Generated) */}
                            <td style={{ padding: '8px' }}>
                              <span style={{
                                padding: '4px 8px', borderRadius: '6px', fontSize: '0.72rem', fontWeight: '800',
                                background: isIng ? 'rgba(251, 113, 133, 0.15)' : 'rgba(56, 189, 248, 0.15)',
                                color: isIng ? '#fb7185' : '#38bdf8', border: `1px solid ${isIng ? '#fb7185' : '#38bdf8'}`,
                                display: 'inline-block'
                              }}>
                                {r.category || (isIng ? 'HPP Dapur (Bahan Mentah)' : 'Biaya Operasional (OPEX)')}
                              </span>
                            </td>

                            {/* Jumlah (Qty) */}
                            <td style={{ padding: '8px' }}>
                              <input
                                type="number"
                                min="1"
                                value={r.qty}
                                onChange={e => handleUpdateDailyExpenseRow(r.id, 'qty', e.target.value)}
                                className="form-input"
                                style={{ height: '34px', fontSize: '0.8rem', textAlign: 'center' }}
                              />
                            </td>

                            {/* Harga Satuan */}
                            <td style={{ padding: '8px' }}>
                              <input
                                type="number"
                                value={r.priceUnit}
                                onChange={e => handleUpdateDailyExpenseRow(r.id, 'priceUnit', e.target.value)}
                                className="form-input"
                                style={{ height: '34px', fontSize: '0.8rem', textAlign: 'right' }}
                              />
                            </td>

                            {/* Total Harga */}
                            <td style={{ padding: '8px', textAlign: 'right', fontWeight: '900', color: isIng ? '#fb7185' : '#38bdf8' }}>
                              {formatRupiah(r.totalPrice)}
                            </td>

                            {/* Aksi */}
                            <td style={{ padding: '8px', textAlign: 'center' }}>
                              <button
                                type="button"
                                onClick={() => handleRemoveDailyExpenseRow(r.id)}
                                style={{ background: 'none', border: 'none', color: '#f43f5e', cursor: 'pointer', fontSize: '0.9rem', fontWeight: '900' }}
                              >
                                ✕
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Add Row Button */}
                <div style={{ padding: '10px 16px', background: '#1e293b', borderTop: '1px solid #334155' }}>
                  <button
                    type="button"
                    onClick={handleAddDailyExpenseRow}
                    style={{ background: 'none', border: 'none', color: '#818cf8', fontWeight: '800', fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    <Plus size={16} />
                    <span>+ Tambah Baris Bahan Baku / Biaya</span>
                  </button>
                </div>
              </div>

              {/* 4. TOTAL PENGELUARAN & LABA KOTOR SUMMARY BAR */}
              <div style={{ background: '#0f172a', padding: '16px', borderRadius: '12px', border: '1px solid #334155', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div style={{ background: 'rgba(251, 113, 133, 0.12)', padding: '12px 16px', borderRadius: '10px', border: '1px solid rgba(251, 113, 133, 0.3)' }}>
                  <span style={{ fontSize: '0.74rem', color: '#fb7185', fontWeight: '700', textTransform: 'uppercase' }}>🔥 Total Pengeluaran (Grand Total)</span>
                  <div style={{ fontSize: '1.3rem', fontWeight: '900', color: '#fb7185', marginTop: '2px' }}>
                    -{formatRupiah(totalPengeluaran)}
                  </div>
                </div>

                <div style={{ background: labaKotor >= 0 ? 'rgba(52, 211, 153, 0.12)' : 'rgba(244, 63, 94, 0.12)', padding: '12px 16px', borderRadius: '10px', border: `1px solid ${labaKotor >= 0 ? '#34d399' : '#f43f5e'}` }}>
                  <span style={{ fontSize: '0.74rem', color: labaKotor >= 0 ? '#34d399' : '#f43f5e', fontWeight: '700', textTransform: 'uppercase' }}>
                    📈 Laba Kotor (Pendapatan - Pengeluaran)
                  </span>
                  <div style={{ fontSize: '1.3rem', fontWeight: '900', color: labaKotor >= 0 ? '#34d399' : '#f43f5e', marginTop: '2px' }}>
                    {formatRupiah(labaKotor)}
                  </div>
                </div>
              </div>

              {/* 5. TABEL PENGEMBALIAN UANG KAS (TANGGAL, JUMLAH HUTANG, JUMLAH PENGEMBALIAN) */}
              <div style={{ background: '#0f172a', padding: '16px', borderRadius: '12px', border: '1px solid #fbbf24', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <span style={{ fontSize: '0.85rem', fontWeight: '800', color: '#fbbf24', display: 'block' }}>
                      💸 Tabel Pengembalian Uang Kas
                    </span>
                    <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                      Rincian hutang simpanan/kasir & pengembalian yang disetor hari ini
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddCashReturnRow}
                    style={{ background: 'rgba(245, 158, 11, 0.2)', border: '1px solid #fbbf24', color: '#fbbf24', padding: '4px 10px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: '800', cursor: 'pointer' }}
                  >
                    + Tambah Baris Pengembalian
                  </button>
                </div>

                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                    <thead>
                      <tr style={{ color: '#94a3b8', borderBottom: '1px solid #334155', textAlign: 'left' }}>
                        <th style={{ padding: '8px' }}>Tanggal</th>
                        <th style={{ padding: '8px', textAlign: 'right' }}>Jumlah Hutang (Rp)</th>
                        <th style={{ padding: '8px', textAlign: 'right' }}>Jumlah Pengembalian (Rp)</th>
                        <th style={{ padding: '8px', textAlign: 'center', width: '40px' }}>Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cashReturnRows.map(cr => (
                        <tr key={cr.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                          <td style={{ padding: '6px' }}>
                            <input
                              type="date"
                              value={cr.date}
                              onChange={e => handleUpdateCashReturnRow(cr.id, 'date', e.target.value)}
                              className="form-input"
                              style={{ height: '32px', fontSize: '0.78rem' }}
                            />
                          </td>
                          <td style={{ padding: '6px' }}>
                            <input
                              type="number"
                              value={cr.debtAmount}
                              onChange={e => handleUpdateCashReturnRow(cr.id, 'debtAmount', Number(e.target.value))}
                              className="form-input"
                              style={{ height: '32px', fontSize: '0.78rem', textAlign: 'right', color: '#fbbf24', fontWeight: '700' }}
                            />
                          </td>
                          <td style={{ padding: '6px' }}>
                            <input
                              type="number"
                              value={cr.returnAmount}
                              onChange={e => handleUpdateCashReturnRow(cr.id, 'returnAmount', Number(e.target.value))}
                              className="form-input"
                              style={{ height: '32px', fontSize: '0.78rem', textAlign: 'right', color: '#34d399', fontWeight: '700' }}
                            />
                          </td>
                          <td style={{ padding: '6px', textAlign: 'center' }}>
                            <button
                              type="button"
                              onClick={() => handleRemoveCashReturnRow(cr.id)}
                              style={{ background: 'none', border: 'none', color: '#f43f5e', cursor: 'pointer' }}
                            >
                              ✕
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 6. UANG DI LACI & SISA UANG DI KAS (RUMUS PROPOSIONAL 12 RULES) */}
              <div style={{ background: '#0f172a', padding: '16px', borderRadius: '12px', border: '1px solid #6366f1', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
                
                {/* Uang di Laci Box */}
                <div style={{ background: isUangDiLaciMinus ? 'rgba(244, 63, 94, 0.15)' : 'rgba(52, 211, 153, 0.15)', padding: '14px', borderRadius: '10px', border: `1px solid ${isUangDiLaciMinus ? '#f43f5e' : '#34d399'}` }}>
                  <span style={{ fontSize: '0.76rem', color: isUangDiLaciMinus ? '#f43f5e' : '#34d399', fontWeight: '800', textTransform: 'uppercase' }}>
                    💵 Uang Di Laci (Laba Kotor - Pengembalian Kas - Non-Cash)
                  </span>
                  <div style={{ fontSize: '1.3rem', fontWeight: '900', color: isUangDiLaciMinus ? '#f43f5e' : '#34d399', marginTop: '4px' }}>
                    {formatRupiah(uangDiLaci)}
                  </div>
                  {isUangDiLaciMinus && (
                    <div style={{ fontSize: '0.72rem', color: '#fb7185', marginTop: '6px', fontWeight: '700', background: 'rgba(0,0,0,0.3)', padding: '4px 8px', borderRadius: '4px' }}>
                      ⚠️ Result MINUS: Otomatis tercatat sebagai Hutang Pengembalian Kas di hari berikutnya!
                    </div>
                  )}
                </div>

                {/* Sisa Uang di Kas Box */}
                <div style={{ background: 'rgba(99, 102, 241, 0.15)', padding: '14px', borderRadius: '10px', border: '1px solid #818cf8', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.76rem', color: '#818cf8', fontWeight: '800', textTransform: 'uppercase' }}>
                      🏦 Sisa Uang Di Kas
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Modal:</span>
                      <input
                        type="number"
                        value={defaultCashModal}
                        onChange={e => setDefaultCashModal(Number(e.target.value))}
                        className="form-input"
                        style={{ width: '100px', height: '28px', fontSize: '0.75rem', textAlign: 'right', fontWeight: '800' }}
                      />
                    </div>
                  </div>

                  <div style={{ fontSize: '1.3rem', fontWeight: '900', color: '#818cf8' }}>
                    {formatRupiah(sisaUangDiKas)}
                  </div>
                  <span style={{ fontSize: '0.68rem', color: '#cbd5e1' }}>
                    Rumus: Modal ({formatRupiah(defaultCashModal)}) - Laba Kotor Minus ({formatRupiah(labaKotorMinusVal)}) - Hutang Belum Dikembalikan ({formatRupiah(sisaHutangBelumDikembalikan)})
                  </span>
                </div>
              </div>

              {/* CATATAN */}
              <div>
                <label style={{ fontSize: '0.78rem', color: '#cbd5e1', fontWeight: '700', display: 'block', marginBottom: '4px' }}>Catatan Shift Laporan Keuangan</label>
                <textarea
                  rows={3}
                  value={dailyRepNotes}
                  onChange={e => setDailyRepNotes(e.target.value)}
                  placeholder="Keterangan penutupan kasir, status selisih kas, atau pengembalian modal..."
                  className="form-input"
                  style={{ width: '100%', fontSize: '0.8rem', resize: 'none' }}
                />
              </div>

              {/* BOTTOM MODAL ACTION BUTTONS */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', borderTop: '1px solid #334155', paddingTop: '16px' }}>
                <button
                  type="button"
                  onClick={() => setShowDailyReportModal(false)}
                  className="btn-secondary"
                  style={{ padding: '10px 22px', fontSize: '0.85rem' }}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  style={{ padding: '10px 28px', fontSize: '0.85rem', background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)', color: '#ffffff', fontWeight: '900' }}
                >
                  Simpan Laporan Keuangan Harian
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
