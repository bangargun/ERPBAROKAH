import React, { useState, useEffect } from 'react';
import { 
  Package, 
  ArrowDownRight, 
  ArrowUpRight, 
  AlertTriangle, 
  CheckSquare, 
  CheckCircle2,
  CheckCircle,
  Plus, 
  PlusCircle,
  Printer, 
  FileSpreadsheet, 
  ChevronDown, 
  SlidersHorizontal,
  RefreshCw,
  Truck,
  Trash2,
  Calendar,
  XCircle,
  FileText,
  DollarSign,
  Edit3,
  Smartphone,
  Eye,
  Clock,
  ShoppingBag
} from 'lucide-react';
import { DoubleCalendarPicker, buildExportFilename, getOutletNameStrForExport } from './SalesTransactionsPage';
import PaginationControls from './PaginationControls';
import { getThemePalette } from '../../utils/themeUtils';

export default function StockManagement({ masterData, setMasterData, selectedBranch, themeMode = 'dark' }) {
  const T = getThemePalette(themeMode);
  const outlets = masterData.outlets || [];
  const formatRupiah = (num) => {
    return 'Rp ' + Number(num || 0).toLocaleString('id-ID');
  };

  const [activeSubTab, setActiveSubTab] = useState('stok_masuk'); // 'stok_masuk' | 'stok_keluar' | 'transfer_stok' | 'stok_rusak' | 'stok_opname'

  // Pagination States (Default 10 rows per page)
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Loading state for tab switching
  const [isTabLoading, setIsTabLoading] = useState(false);

  // SHARED FILTER STATES FOR LOGISTICS
  const [logStartDate, setLogStartDate] = useState('');
  const [logEndDate, setLogEndDate] = useState('');
  const [logDatePreset, setLogDatePreset] = useState('all');
  const [logShowCalendarPopover, setLogShowCalendarPopover] = useState(false);
  const [logSelectedOutletIds, setLogSelectedOutletIds] = useState(['ALL']);
  const [logShowOutletDropdown, setLogShowOutletDropdown] = useState(false);

  // Auto-sync logSelectedOutletIds with top-level selectedBranch filter
  useEffect(() => {
    if (selectedBranch) {
      setLogSelectedOutletIds([selectedBranch]);
    } else {
      setLogSelectedOutletIds(['ALL']);
    }
  }, [selectedBranch]);

  // COLUMN VISIBILITY STATES
  const [logShowColumnDropdown, setLogShowColumnDropdown] = useState(false);
  const [visibleColsMasuk, setVisibleColsMasuk] = useState({
    date: true,
    outletId: true,
    createdBy: true,
    itemName: true,
    supplier: true,
    qty: true,
    unit: true,
    priceUnit: true,
    totalPrice: true,
    typeInput: true
  });

  const [visibleColsKeluar, setVisibleColsKeluar] = useState({
    receiptNo: true,
    dateTime: true,
    outletName: true,
    itemName: true,
    itemType: true,
    qty: true,
    unit: true,
    cogsValue: true,
    status: true
  });

  const [visibleColsTransfer, setVisibleColsTransfer] = useState({
    date: true,
    createdBy: true,
    typeInput: true,
    fromOutlet: true,
    toOutlet: true,
    itemName: true,
    qty: false,
    unit: false,
    status: true,
    returnStatus: true
  });

  const [visibleColsRusak, setVisibleColsRusak] = useState({
    date: true,
    createdBy: true,
    typeInput: true,
    outletId: true,
    itemName: true,
    qty: true,
    unit: true,
    notes: true
  });

  const [visibleColsOpname, setVisibleColsOpname] = useState({
    date: true,
    createdBy: true,
    outletId: true,
    itemName: true,
    stokAwal: true,
    stokMasuk: true,
    stokKeluar: true,
    transferMasuk: true,
    transferKeluar: true,
    stokRusak: true,
    stokFisik: true,
    stokSistem: true,
    selisih: true,
    hargaSatuan: true,
    dendaStok: true,
    notes: true
  });

  const [visibleColsOpnameSystem, setVisibleColsOpnameSystem] = useState({
    date: true,
    outletName: true,
    itemName: true,
    unit: true,
    stokAwal: true,
    stokMasuk: true,
    stokKeluar: true,
    transferIn: true,
    transferOut: true,
    stokRusak: true,
    sisaStokSystem: true
  });

  const [manualStokAwalMap, setManualStokAwalMap] = useState(masterData.manualStokAwalMap || {});

  const handleUpdateManualStokAwal = (key, value) => {
    const updatedMap = { ...manualStokAwalMap, [key]: value === '' ? undefined : Number(value) };
    setManualStokAwalMap(updatedMap);
    if (setMasterData) {
      setMasterData(prev => ({
        ...prev,
        manualStokAwalMap: updatedMap
      }));
    }
  };

  const [visibleColsHarga, setVisibleColsHarga] = useState({
    date: true,
    itemName: true,
    category: true,
    unit: true,
    outletPrices: true,
    highestPrice: true,
    actions: true
  });

  // PRICE COMPARISON STATES & FORM
  const [priceSearchQuery, setPriceSearchQuery] = useState('');
  const [priceItemFilter, setPriceItemFilter] = useState('ALL');
  const [showAddPriceModal, setShowAddPriceModal] = useState(false);
  const [editingPriceRecord, setEditingPriceRecord] = useState(null);

  const [priceDate, setPriceDate] = useState(new Date().toISOString().split('T')[0]);
  const [priceItemName, setPriceItemName] = useState('');
  const [priceCategory, setPriceCategory] = useState('Bahan Utama');
  const [priceUnit, setPriceUnit] = useState('kg');
  const [priceValues, setPriceValues] = useState({});
  const [priceNotes, setPriceNotes] = useState('');

  // MASTER DATA LISTS (PURE REAL DATA ONLY - NO FAKE FALLBACKS)
  const ingredientsList = masterData.ingredients || [];
  const suppliersList = masterData.suppliers || [];
  const userRightsList = (masterData.userAccounts && masterData.userAccounts.length > 0)
    ? masterData.userAccounts
    : ((masterData.userRights && masterData.userRights.length > 0)
      ? masterData.userRights
      : []);

  // HELPER UNTUK FILTER TOMBSTONE DELETED LOGISTICS
  const isDeletedRecord = (item) => {
    if (!item) return false;
    const delList = (masterData.deletedLogisticsIds || []).map(x => String(x));
    if (delList.length === 0) return false;
    const itemId = String(item.id !== undefined && item.id !== null ? item.id : '');
    const itemRNo = String(item.report_no || item.receiptNo || item.receipt_no || '');
    return (itemId && delList.includes(itemId)) || (itemRNo && delList.includes(itemRNo));
  };

  // LOGISTIC DATA (AUTOMATICALLY STREAMED FROM MASTER DATA & LAPORAN KEUANGAN)
  const getMovementsList = () => {
    const baseList = [...(masterData.stockMovement || [])];
    const existingIds = new Set(baseList.map(m => m.id));

    // Auto-stream HPP/Bahan Mentah entries from Laporan Keuangan (approvedFinanceDaily) into Stok Masuk ONLY AFTER ACC / APPROVED
    if (masterData.approvedFinanceDaily && masterData.approvedFinanceDaily.length > 0) {
      masterData.approvedFinanceDaily.forEach(f => {
        const isApproved = f.status === 'ok' || f.status === 'approved' || f.status === 'Approved';
        if (!isApproved) return; // Wait until ACC / Approved by Admin/Owner!

        // 1. From cogs_items array
        if (f.cogs_items && f.cogs_items.length > 0) {
          f.cogs_items.forEach((c, idx) => {
            const autoId = `mov-fin-${f.id}-${idx}`;
            if (!existingIds.has(autoId)) {
              baseList.push({
                id: autoId,
                type: 'IN',
                date: f.date || '2026-07-24',
                outlet_id: Number(f.outlet_id || 1),
                created_by: f.author_name || f.cashier || 'Kasir (by Laporan Keuangan)',
                item_name: c.name || c.item_name || 'Bahan Dapur Mentah',
                supplier: c.supplier || 'Supplier Dapur HPP',
                qty: Number(c.qty || 1),
                unit: c.unit || 'kg',
                price_unit: Number(c.price_unit || 0),
                total_price: Number(c.amount || (c.qty * c.price_unit) || 0),
                type_input: 'by laporan keuangan (ACC)'
              });
            }
          });
        } 
        // 2. From expenses_breakdown HPP items
        else if (f.expenses_breakdown && f.expenses_breakdown.length > 0) {
          f.expenses_breakdown.forEach((ex, idx) => {
            if ((ex.cost_group || '').toLowerCase().includes('cogs') || (ex.category || '').toLowerCase().includes('hpp')) {
              const autoId = `mov-fin-ex-${f.id}-${idx}`;
              if (!existingIds.has(autoId)) {
                const itemName = ex.category?.replace('[HPP Dapur] ', '') || 'Bahan Mentah Dapur';
                baseList.push({
                  id: autoId,
                  type: 'IN',
                  date: f.date || '2026-07-24',
                  outlet_id: Number(f.outlet_id || 1),
                  created_by: f.author_name || f.cashier || 'Kasir (by Laporan Keuangan)',
                  item_name: itemName,
                  supplier: 'Supplier Dapur HPP',
                  qty: 1,
                  unit: 'kg',
                  price_unit: Number(ex.amount || 0),
                  total_price: Number(ex.amount || 0),
                  type_input: 'by laporan keuangan (ACC)'
                });
              }
            }
          });
        }
      });
    }

    return baseList.filter(m => !isDeletedRecord(m));
  };

  const getTransfersList = () => {
    const l1 = masterData.stockTransfer || [];
    const l2 = masterData.approvedTransfers || [];
    const res = [...l1];
    const ids = new Set(res.map(x => String(x.id || x.report_no)));
    l2.forEach(x => {
      const key = String(x.id || x.report_no);
      if (key && !ids.has(key)) res.push(x);
    });
    return res.filter(t => !isDeletedRecord(t));
  };

  const getOpnameList = () => {
    return (masterData.stockOpname || []).filter(op => !isDeletedRecord(op));
  };

  const calculateStockOpnameBySystem = () => {
    const movements = getMovementsList();
    const transfersList = getTransfersList();
    const ingredients = ingredientsList || [];

    // Tentukan apakah filter outlet adalah "Semua Outlet (Central)" / "ALL"
    const isAllOutlets = !selectedBranch || String(selectedBranch) === 'ALL' || logSelectedOutletIds.includes('ALL');
    const targetBranchId = selectedBranch && String(selectedBranch) !== 'ALL' ? selectedBranch : (logSelectedOutletIds.includes('ALL') ? null : logSelectedOutletIds[0]);

    return ingredients.map((ing, idx) => {
      const ingNameLower = (ing.name || '').toLowerCase().trim();

      // 1. Stok Masuk
      const stokMasuk = movements
        .filter(m => {
          if (m.type !== 'IN') return false;
          if ((m.item_name || m.itemName || '').toLowerCase().trim() !== ingNameLower) return false;
          if (logStartDate && m.date < logStartDate) return false;
          if (logEndDate && m.date > logEndDate) return false;
          if (!isAllOutlets && targetBranchId !== null && Number(m.outlet_id) !== Number(targetBranchId)) return false;
          return true;
        })
        .reduce((sum, m) => sum + Number(m.qty || 0), 0);

      // 2. Stok Keluar (Penjualan POS / Outflow)
      const stokKeluar = (masterData.stockOutflow || [])
        .filter(s => {
          if ((s.itemName || s.item_name || '').toLowerCase().trim() !== ingNameLower) return false;
          if (logStartDate && s.date < logStartDate) return false;
          if (logEndDate && s.date > logEndDate) return false;
          if (!isAllOutlets && targetBranchId !== null && Number(s.outletId || s.branch_id || 1) !== Number(targetBranchId)) return false;
          return true;
        })
        .reduce((sum, s) => sum + Math.abs(Number(s.qty || 0)), 0);

      // 3. Transfer Stok In (Penerimaan)
      const transferIn = transfersList
        .filter(t => {
          if ((t.item_name || t.itemName || '').toLowerCase().trim() !== ingNameLower) return false;
          if (logStartDate && t.date < logStartDate) return false;
          if (logEndDate && t.date > logEndDate) return false;
          if (!isAllOutlets && targetBranchId !== null && Number(t.to_outlet_id || t.toOutletId) !== Number(targetBranchId)) return false;
          return true;
        })
        .reduce((sum, t) => sum + Number(t.qty || 0), 0);

      // 4. Transfer Stok Out (Pengiriman)
      const transferOut = transfersList
        .filter(t => {
          if ((t.item_name || t.itemName || '').toLowerCase().trim() !== ingNameLower) return false;
          if (logStartDate && t.date < logStartDate) return false;
          if (logEndDate && t.date > logEndDate) return false;
          if (!isAllOutlets && targetBranchId !== null && Number(t.from_outlet_id || t.fromOutletId) !== Number(targetBranchId)) return false;
          return true;
        })
        .reduce((sum, t) => sum + Number(t.qty || 0), 0);

      // 5. Stok Rusak
      const stokRusak = (masterData.damagedGoods || [])
        .concat(masterData.approvedWaste || [])
        .filter(d => {
          if ((d.item_name || d.itemName || '').toLowerCase().trim() !== ingNameLower) return false;
          if (logStartDate && d.date < logStartDate) return false;
          if (logEndDate && d.date > logEndDate) return false;
          if (!isAllOutlets && targetBranchId !== null && Number(d.outlet_id || d.branch_id) !== Number(targetBranchId)) return false;
          return true;
        })
        .reduce((sum, d) => sum + Number(d.qty || d.stok_rusak || 0), 0);

      // 6. Stok Awal: Manual Override > Ingredient Initial Stock
      const manualKey = `ing_${targetBranchId || 'ALL'}_${ing.name}`;
      let stokAwal = 0;
      if (manualStokAwalMap[manualKey] !== undefined && manualStokAwalMap[manualKey] !== '') {
        stokAwal = Number(manualStokAwalMap[manualKey]);
      } else {
        stokAwal = Number(ing.initialStock !== undefined ? ing.initialStock : (ing.stock || ing.stok || 0));
      }

      // 7. Sisa Stok by Sistem Formula
      const sisaStokSystem = (stokAwal + stokMasuk + transferIn) - (stokKeluar + transferOut + stokRusak);

      return {
        id: `op-sys-ing-${ing.id || idx}`,
        itemName: ing.name,
        unit: ing.unit || 'kg',
        stokAwal,
        stokMasuk,
        stokKeluar,
        transferIn,
        transferOut,
        stokRusak,
        sisaStokSystem,
        manualKey,
        hasManualOverride: manualStokAwalMap[manualKey] !== undefined && manualStokAwalMap[manualKey] !== ''
      };
    }).sort((a, b) => a.itemName.localeCompare(b.itemName));
  };

  // PERBANDINGAN HARGA BAHAN BAKU ANTAR OUTLET (TANGGAL KE TANGGAL)
  // Auto-streamed directly from Halaman Logistik -> Stok Masuk (Harga Satuan)
  const getPriceComparisonList = () => {
    const masukList = getMovementsList().filter(m => m.type === 'IN' && Number(m.price_unit) > 0);
    const customList = (masterData.priceComparison || []).filter(p => !p.id?.startsWith('prc-auto-'));

    const groupedMap = {};

    // 1. Process Stok Masuk entries
    masukList.forEach(m => {
      const dateStr = m.date || new Date().toISOString().split('T')[0];
      const rawName = (m.item_name || '').trim();
      if (!rawName) return;
      const nameKey = rawName.toLowerCase();
      const groupKey = `${dateStr}_${nameKey}`;

      if (!groupedMap[groupKey]) {
        const ingMatch = ingredientsList.find(i => (i.name || '').toLowerCase().trim() === nameKey);
        groupedMap[groupKey] = {
          id: `prc-auto-${dateStr}-${nameKey}`,
          date: dateStr,
          item_name: ingMatch ? ingMatch.name : rawName,
          category: ingMatch ? ingMatch.category : 'Bahan Baku',
          unit: m.unit || ingMatch?.unit || 'kg',
          prices: {},
          notes: 'Diambil dari Stok Masuk Logistik (Harga Satuan)'
        };
      }

      const outId = m.outlet_id;
      if (outId) {
        groupedMap[groupKey].prices[outId] = Number(m.price_unit);
      }
    });

    // 2. Process custom manual price comparison entries if any
    customList.forEach(c => {
      const dateStr = c.date || new Date().toISOString().split('T')[0];
      const rawName = (c.item_name || '').trim();
      if (!rawName) return;
      const nameKey = rawName.toLowerCase();
      const groupKey = `${dateStr}_${nameKey}`;

      if (!groupedMap[groupKey]) {
        groupedMap[groupKey] = {
          id: c.id || `prc-cust-${dateStr}-${nameKey}`,
          date: dateStr,
          item_name: c.item_name,
          category: c.category || 'Bahan Baku',
          unit: c.unit || 'kg',
          prices: c.prices || {},
          notes: c.notes || 'Input Perbandingan Manual'
        };
      } else {
        if (c.prices) {
          Object.keys(c.prices).forEach(outId => {
            if (c.prices[outId]) {
              groupedMap[groupKey].prices[outId] = Number(c.prices[outId]);
            }
          });
        }
      }
    });

    return Object.values(groupedMap).sort((a, b) => {
      const dateComp = b.date.localeCompare(a.date);
      if (dateComp !== 0) return dateComp;
      return a.item_name.localeCompare(b.item_name);
    });
  };

  const getFilteredPriceComparison = () => {
    return getPriceComparisonList().filter(item => {
      if (logStartDate && item.date < logStartDate) return false;
      if (logEndDate && item.date > logEndDate) return false;
      if (priceItemFilter !== 'ALL' && item.item_name !== priceItemFilter) return false;
      if (priceSearchQuery.trim()) {
        const q = priceSearchQuery.toLowerCase();
        const nameMatch = (item.item_name || '').toLowerCase().includes(q);
        const catMatch = (item.category || '').toLowerCase().includes(q);
        const dateMatch = (item.date || '').toLowerCase().includes(q);
        if (!nameMatch && !catMatch && !dateMatch) return false;
      }
      return true;
    });
  };

  // CHECK LOGISTICS ALERT FOR H+1 NO DATA ENTRY
  const checkLogisticsAlert = () => {
    const masukRecords = getMovementsList().filter(m => m.type === 'IN');
    if (masukRecords.length === 0) return false;

    const dates = masukRecords.map(m => new Date(m.date));
    const latestDate = new Date(Math.max(...dates));

    const today = new Date();
    today.setHours(0,0,0,0);
    latestDate.setHours(0,0,0,0);

    const diffTime = today.getTime() - latestDate.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return diffDays > 1; // True if it has been more than 1 day since last entry
  };

  // MODAL RECORD STATES
  const [showAddModal, setShowAddModal] = useState(null); // 'masuk' | 'transfer' | 'rusak' | 'opname' | null
  const [showPreviewModal, setShowPreviewModal] = useState(false); // for manual logistics preview

  // Dynamic Multi-Row Manual Logistics States
  const [manualDate, setManualDate] = useState(new Date().toISOString().split('T')[0]);
  const [manualOutletId, setManualOutletId] = useState(1);
  const [manualCreatedBy, setManualCreatedBy] = useState(userRightsList[0] ? userRightsList[0].name : 'Admin');
  
  // Start with 5 default empty rows
  const [manualRows, setManualRows] = useState([
    { ingredientId: '', supplierId: suppliersList[0]?.id || '', qty: '', priceUnit: '', searchQuery: '', unit: '', showSuggestions: false },
    { ingredientId: '', supplierId: suppliersList[0]?.id || '', qty: '', priceUnit: '', searchQuery: '', unit: '', showSuggestions: false },
    { ingredientId: '', supplierId: suppliersList[0]?.id || '', qty: '', priceUnit: '', searchQuery: '', unit: '', showSuggestions: false },
    { ingredientId: '', supplierId: suppliersList[0]?.id || '', qty: '', priceUnit: '', searchQuery: '', unit: '', showSuggestions: false },
    { ingredientId: '', supplierId: suppliersList[0]?.id || '', qty: '', priceUnit: '', searchQuery: '', unit: '', showSuggestions: false }
  ]);

  // SINGLE RECORD EDIT STATE
  const [editingRecord, setEditingRecord] = useState(null);
  const [editType, setEditType] = useState('masuk'); // 'masuk' | 'transfer'
  const [editFromOutletId, setEditFromOutletId] = useState('');
  const [editToOutletId, setEditToOutletId] = useState('');
  const [editStatus, setEditStatus] = useState('');
  const [editIsReturned, setEditIsReturned] = useState(false);
  const [editDate, setEditDate] = useState('');
  const [editOutletId, setEditOutletId] = useState('');
  const [editCreatedBy, setEditCreatedBy] = useState('');
  const [editItemName, setEditItemName] = useState('');
  const [editSupplier, setEditSupplier] = useState('');
  const [editQty, setEditQty] = useState('');
  const [editUnit, setEditUnit] = useState('');
  const [editPriceUnit, setEditPriceUnit] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editStokAwal, setEditStokAwal] = useState('');
  const [editStokMasuk, setEditStokMasuk] = useState('');
  const [editStokKeluar, setEditStokKeluar] = useState('');
  const [editTransferMasuk, setEditTransferMasuk] = useState('');
  const [editTransferKeluar, setEditTransferKeluar] = useState('');
  const [editStokRusak, setEditStokRusak] = useState('');
  const [editStokFisik, setEditStokFisik] = useState('');
  const [editHargaSatuan, setEditHargaSatuan] = useState('');

  // Transfer Stok Form States
  const [transferDate, setTransferDate] = useState(new Date().toISOString().split('T')[0]);
  const [transferCreatedBy, setTransferCreatedBy] = useState(userRightsList[0] ? userRightsList[0].name : 'Admin');
  const [transferFromOutletId, setTransferFromOutletId] = useState(1);
  const [transferToOutletId, setTransferToOutletId] = useState(2);
  const [transferSearchQuery, setTransferSearchQuery] = useState('');
  const [transferIngredientId, setTransferIngredientId] = useState(ingredientsList[0] ? ingredientsList[0].id : 1);
  const [transferQty, setTransferQty] = useState('');
  const [transferUnit, setTransferUnit] = useState(ingredientsList[0] ? ingredientsList[0].unit : 'kg');
  const [transferStatus, setTransferStatus] = useState('Terkirim');
  const [transferNotes, setTransferNotes] = useState('');
  const [transferNo, setTransferNo] = useState(`TRF-${new Date().toISOString().split('T')[0].replace(/-/g,'')}-001`);
  const [transferBatchRows, setTransferBatchRows] = useState([]);
  const [previewTransferModalData, setPreviewTransferModalData] = useState(null);
  const [previewWasteModalData, setPreviewWasteModalData] = useState(null);

  // Stok Keluar / Sales Transaction Form States
  const [showAddSalesModal, setShowAddSalesModal] = useState(false);
  const [salesDate, setSalesDate] = useState(new Date().toISOString().split('T')[0]);
  const [salesNo, setSalesNo] = useState(`TRX-${new Date().toISOString().split('T')[0].replace(/-/g,'')}-001`);
  const [salesCreatedBy, setSalesCreatedBy] = useState(userRightsList[0] ? userRightsList[0].name : 'Admin');
  const [salesOutletId, setSalesOutletId] = useState(1);
  const [salesStatus, setSalesStatus] = useState('Paid');
  const [salesPaymentMethod, setSalesPaymentMethod] = useState('Cash');
  const [salesMenuRows, setSalesMenuRows] = useState([]);
  const [previewOutflowModalData, setPreviewOutflowModalData] = useState(null);
  const [editingOutflowRecord, setEditingOutflowRecord] = useState(null);

  // Stok Rusak Form States
  const [rusakDate, setRusakDate] = useState(new Date().toISOString().split('T')[0]);
  const [rusakNo, setRusakNo] = useState(`WST-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-001`);
  const [rusakCreatedBy, setRusakCreatedBy] = useState(userRightsList[0] ? userRightsList[0].name : 'Admin');
  const [rusakOutletId, setRusakOutletId] = useState(1);
  const [rusakBatchRows, setRusakBatchRows] = useState([]);
  const [rusakSearchQuery, setRusakSearchQuery] = useState('');
  const [rusakIngredientId, setRusakIngredientId] = useState(ingredientsList[0] ? ingredientsList[0].id : '');
  const [rusakQty, setRusakQty] = useState('');
  const [rusakUnit, setRusakUnit] = useState(ingredientsList[0] ? ingredientsList[0].unit : 'kg');
  const [rusakNotes, setRusakNotes] = useState('');
  const [rusakEditingNotes, setRusakEditingNotes] = useState('');
  const [showRusakPreviewFormModal, setShowRusakPreviewFormModal] = useState(false);

  // Stok Opname Form States
  const [deletedOutflowIds, setDeletedOutflowIds] = useState(masterData.deletedOutflowIds || []);
  const [opnameDate, setOpnameDate] = useState(new Date().toISOString().split('T')[0]);
  const [opnameCreatedBy, setOpnameCreatedBy] = useState(userRightsList[0] ? userRightsList[0].name : 'Admin');
  const [opnameOutletId, setOpnameOutletId] = useState(1);
  const [opnameSearchQuery, setOpnameSearchQuery] = useState('');
  const [opnameIngredientId, setOpnameIngredientId] = useState(ingredientsList[0] ? ingredientsList[0].id : 1);
  const [opnameStokAwal, setOpnameStokAwal] = useState('');
  const [opnameStokMasuk, setOpnameStokMasuk] = useState('');
  const [opnameStokKeluar, setOpnameStokKeluar] = useState('');
  const [opnameTransferMasuk, setOpnameTransferMasuk] = useState('');
  const [opnameTransferKeluar, setOpnameTransferKeluar] = useState('');
  const [opnameStokRusak, setOpnameStokRusak] = useState('');
  const [opnameStokFisik, setOpnameStokFisik] = useState('');
  const [opnameHargaSatuan, setOpnameHargaSatuan] = useState('');
  const [opnameUnit, setOpnameUnit] = useState(ingredientsList[0] ? ingredientsList[0].unit : 'kg');
  const [opnameNotes, setOpnameNotes] = useState('');
  const [opnameCreatorFilter, setOpnameCreatorFilter] = useState('ALL'); // 'ALL' | 'by_kasir' | 'by_outlet'
  const [previewOpnameReportModalData, setPreviewOpnameReportModalData] = useState(null);

  // HELPER FUNCTIONS
  const getOutletName = (id, explicitName) => {
    const outletsList = masterData.outlets || outlets || [];
    const found = outletsList.find(o => String(o.id) === String(id) || Number(o.id) === Number(id));
    if (found && found.name) return found.name;
    if (explicitName && explicitName !== `Outlet #${id}` && explicitName !== 'Restoran Utama') {
      const explicitFound = outletsList.find(o => o.name === explicitName);
      if (explicitFound) return explicitFound.name;
      return explicitName;
    }
    if (outletsList.length > 0 && outletsList[0]?.name) {
      const fallback = outletsList.find(o => Number(o.id) === Number(id)) || outletsList[0];
      if (fallback && fallback.name) return fallback.name;
    }
    return id ? `Outlet #${id}` : 'Semua Outlet';
  };

  const getSelisihStatus = (sistem, fisik) => {
    if (sistem === fisik) return { text: 'Pas', color: T.success, bg: 'rgba(52, 211, 153, 0.15)', border: 'rgba(52, 211, 153, 0.3)' };
    if (sistem > fisik) return { text: 'SOP tidak berjalan', color: T.accentGold, bg: 'rgba(245, 158, 11, 0.15)', border: 'rgba(245, 158, 11, 0.3)' };
    return { text: 'Kehilangan', color: T.danger, bg: 'rgba(244, 63, 94, 0.15)', border: 'rgba(244, 63, 94, 0.3)' };
  };

  const getItemPriceFromStokMasuk = (itemName) => {
    const movements = getMovementsList();
    const found = [...movements]
      .reverse()
      .find(m => m.type === 'IN' && m.item_name === itemName);
    return found ? (found.price_unit || 0) : 0;
  };

  const handleToggleLogOutlet = (idVal) => {
    if (idVal === 'ALL') {
      setLogSelectedOutletIds(['ALL']);
    } else {
      let updated = logSelectedOutletIds.filter(id => id !== 'ALL');
      if (updated.includes(idVal)) {
        updated = updated.filter(id => id !== idVal);
      } else {
        updated.push(idVal);
      }
      if (updated.length === 0) updated = ['ALL'];
      setLogSelectedOutletIds(updated);
    }
  };

  const handleToggleColumnVisibility = (key) => {
    if (activeSubTab === 'stok_masuk') {
      setVisibleColsMasuk(prev => ({ ...prev, [key]: !prev[key] }));
    } else if (activeSubTab === 'stok_keluar') {
      setVisibleColsKeluar(prev => ({ ...prev, [key]: !prev[key] }));
    } else if (activeSubTab === 'transfer_stok') {
      setVisibleColsTransfer(prev => ({ ...prev, [key]: !prev[key] }));
    } else if (activeSubTab === 'stok_rusak') {
      setVisibleColsRusak(prev => ({ ...prev, [key]: !prev[key] }));
    } else if (activeSubTab === 'stok_opname_system') {
      setVisibleColsOpnameSystem(prev => ({ ...prev, [key]: !prev[key] }));
    } else if (activeSubTab === 'stok_opname_report' || activeSubTab === 'stok_opname') {
      setVisibleColsOpname(prev => ({ ...prev, [key]: !prev[key] }));
    } else if (activeSubTab === 'perbandingan_harga') {
      setVisibleColsHarga(prev => ({ ...prev, [key]: !prev[key] }));
    }
  };

  const getActiveVisibleCols = () => {
    if (activeSubTab === 'stok_masuk') return visibleColsMasuk;
    if (activeSubTab === 'stok_keluar') return visibleColsKeluar;
    if (activeSubTab === 'transfer_stok') return visibleColsTransfer;
    if (activeSubTab === 'stok_rusak') return visibleColsRusak;
    if (activeSubTab === 'stok_opname_system') return visibleColsOpnameSystem;
    if (activeSubTab === 'stok_opname_report' || activeSubTab === 'stok_opname') return visibleColsOpname;
    return visibleColsHarga;
  };

  // MULTI-ROW ACTIONS FOR MANUAL LOGISTICS
  const handleAddRow = () => {
    setManualRows([...manualRows, { ingredientId: '', supplierId: suppliersList[0]?.id || '', qty: '', priceUnit: '', searchQuery: '', unit: '', showSuggestions: false }]);
  };

  const handleRemoveRow = (idx) => {
    setManualRows(manualRows.filter((_, i) => i !== idx));
  };

  const handleUpdateRow = (idx, field, value) => {
    const updated = [...manualRows];
    updated[idx][field] = value;
    setManualRows(updated);
  };

  // STOCK OUTFLOW GENERATOR (DEDUCTED FROM REAL SALES TRANSACTIONS)
  const generateStockDeductions = () => {
    const deductions = [];
    const salesTx = masterData.salesTransactions || [];
    const activeProducts = masterData.products || [];

    // Filter transactions: status can be 'Success', 'Berhasil', 'Selesai', or default active
    const successTransactions = salesTx.filter(tx => 
      !tx.status || tx.status === 'Success' || tx.status === 'Berhasil' || tx.status === 'Selesai'
    );

    successTransactions.forEach(tx => {
      // Find what branch/outlet is selected
      const txOutletId = Number(tx.outlet_id);
      const isFilteredOutlet = logSelectedOutletIds.includes('ALL') || logSelectedOutletIds.some(id => Number(id) === txOutletId);
      if (!isFilteredOutlet) return;
      if (selectedBranch && txOutletId !== Number(selectedBranch)) return;

      // Filter by calendar range
      if (logStartDate && tx.date < logStartDate) return;
      if (logEndDate && tx.date > logEndDate) return;

      // Helper to map sold menu items to raw material ingredients
      const mapItemToRawMaterials = (itemName, qtySold, txRef) => {
        const itemLower = (itemName || '').toLowerCase().trim();
        const matchedProd = activeProducts.find(p => p.name?.toLowerCase() === itemLower || itemLower.startsWith(p.name?.toLowerCase()));

        // 1. If explicit compositions/recipes exist on product
        if (matchedProd && matchedProd.compositions && matchedProd.compositions.length > 0) {
          matchedProd.compositions.forEach((comp, cIdx) => {
            const ingQty = Number(comp.qty || comp.amount || 1) * qtySold;
            deductions.push({
              id: `stk-${txRef}-c-${cIdx}`,
              receiptNo: tx.receipt_no || tx.id || `TRX-${tx.id}`,
              date: tx.date,
              time: tx.time || '12:00',
              outletId: tx.outlet_id,
              itemName: comp.ingredient_name || comp.name || 'Bahan Baku',
              itemType: 'Bahan Baku',
              qty: ingQty,
              unit: comp.unit || 'Gram',
              cogsValue: Math.round((comp.cogs || 1500) * ingQty),
              status: '✓ Terpotong Otomatis'
            });
          });
          return;
        }

        // 2. Fallback: match ingredient in ingredientsList by menu category/name
        let matchedIng = ingredientsList.find(ing => {
          const ingLower = ing.name.toLowerCase();
          if (itemLower.includes('kopi') || itemLower.includes('espresso') || itemLower.includes('latte')) return ingLower.includes('kopi');
          if (itemLower.includes('ayam') || itemLower.includes('chicken')) return ingLower.includes('ayam');
          if (itemLower.includes('sapi') || itemLower.includes('beef') || itemLower.includes('steak')) return ingLower.includes('daging') || ingLower.includes('sapi');
          if (itemLower.includes('nasi') || itemLower.includes('rice')) return ingLower.includes('beras');
          if (itemLower.includes('susu') || itemLower.includes('milk')) return ingLower.includes('susu');
          if (itemLower.includes('teh') || itemLower.includes('tea')) return ingLower.includes('teh');
          return ingLower.includes(itemLower) || itemLower.includes(ingLower);
        });

        if (!matchedIng) {
          matchedIng = ingredientsList[0] || { name: 'Bahan Mentah Dapur', unit: 'kg', cost: 15000 };
        }

        const ingQty = qtySold * (matchedIng.unit === 'Gram' || matchedIng.unit === 'ml' ? 150 : 0.2);

        deductions.push({
          id: `stk-${txRef}-ing`,
          receiptNo: tx.receipt_no || tx.id || `TRX-${tx.id}`,
          date: tx.date,
          time: tx.time || '12:00',
          outletId: tx.outlet_id,
          itemName: matchedIng.name,
          itemType: 'Bahan Baku',
          qty: ingQty,
          unit: matchedIng.unit || 'kg',
          cogsValue: Math.round((matchedIng.cost || 15000) * ingQty),
          status: '✓ Terpotong Otomatis'
        });
      };

      // IF TRANSACTION HAS EXPLICIT ITEMS (From Mobile POS Kasir or Web POS)
      if (tx.items && tx.items.length > 0) {
        tx.items.forEach((item, itemIdx) => {
          mapItemToRawMaterials(item.name, item.qty || 1, `${tx.id || tx.receipt_no}-${itemIdx}`);
        });
        return;
      }

    });

    return deductions.filter(d => !deletedOutflowIds.includes(d.id) && d.itemType === 'Bahan Baku');
  };

  const filteredStockOutflow = generateStockDeductions();

  // Get all Sales Transactions for Log Mutasi Keluar (Autoconsumption Stock Deductions)
  const getFilteredSalesOutflowTransactions = () => {
    const rawSales = [
      ...(masterData.salesTransactions || []),
      ...(masterData.transactions || []),
      ...(masterData.sales || []),
      ...(masterData.manualSales || [])
    ];

    const groupedMap = new Map();

    rawSales.forEach(tx => {
      const txId = tx.receipt_no || tx.receiptNo || tx.report_no || tx.order_no || tx.id;
      if (!txId) return;
      const key = String(txId);

      if (!groupedMap.has(key)) {
        const txOutletId = Number(tx.outlet_id || tx.outletId || tx.branch_id || 1);
        const txDate = tx.date || tx.tanggal || new Date().toISOString().split('T')[0];
        const txTime = tx.time || tx.waktu || '12:00';
        const txCreatedBy = tx.created_by || tx.submitted_by || tx.kasir || tx.author_name || 'Kasir';
        const isWebAdmin = tx.type_input === 'manual' || tx.sumber_input === 'web_admin' || tx.created_by === 'Admin' || (tx.type_input && tx.type_input.includes('admin'));
        
        const rawStatus = tx.status || tx.payment_status || 'Paid';
        const isPaid = rawStatus === 'Paid' || rawStatus === 'Lunas' || rawStatus === 'Success' || rawStatus === 'Selesai' || rawStatus === 'Paid (Disetujui)' || rawStatus === 'approved';

        const itemsSold = tx.items || tx.menu_items || [];
        
        let deductedIngs = tx.deducted_ingredients || tx.ingredients || [];
        if (deductedIngs.length === 0 && itemsSold.length > 0) {
          const activeProducts = masterData.products || [];
          itemsSold.forEach(item => {
            const qtySold = Number(item.qty || 1);
            const itemLower = (item.name || item.product_name || '').toLowerCase().trim();
            const matchedProd = activeProducts.find(p => p.name?.toLowerCase() === itemLower || itemLower.startsWith(p.name?.toLowerCase()));

            if (matchedProd && matchedProd.compositions && matchedProd.compositions.length > 0) {
              matchedProd.compositions.forEach(comp => {
                const ingQty = Number(comp.qty || comp.amount || 1) * qtySold;
                deductedIngs.push({
                  ingredient_name: comp.ingredient_name || comp.name || 'Bahan Baku',
                  qty: ingQty,
                  unit: comp.unit || 'Gram',
                  cogs: Math.round((comp.cogs || 1500) * ingQty)
                });
              });
            } else {
              let matchedIng = ingredientsList.find(ing => {
                const ingLower = ing.name.toLowerCase();
                if (itemLower.includes('kopi') || itemLower.includes('espresso') || itemLower.includes('latte')) return ingLower.includes('kopi');
                if (itemLower.includes('ayam') || itemLower.includes('chicken')) return ingLower.includes('ayam');
                if (itemLower.includes('sapi') || itemLower.includes('steak')) return ingLower.includes('sapi') || ingLower.includes('daging');
                if (itemLower.includes('nasi') || itemLower.includes('rice')) return ingLower.includes('beras');
                if (itemLower.includes('susu') || itemLower.includes('milk')) return ingLower.includes('susu');
                if (itemLower.includes('teh') || itemLower.includes('tea')) return ingLower.includes('teh');
                return ingLower.includes(itemLower) || itemLower.includes(ingLower);
              });
              if (!matchedIng) matchedIng = ingredientsList[0] || { name: 'Bahan Mentah Dapur', unit: 'kg', cost: 15000 };
              const ingQty = qtySold * (matchedIng.unit === 'Gram' || matchedIng.unit === 'ml' ? 150 : 0.2);
              deductedIngs.push({
                ingredient_name: matchedIng.name,
                qty: ingQty,
                unit: matchedIng.unit || 'kg',
                cogs: Math.round((matchedIng.cost || 15000) * ingQty)
              });
            }
          });
        }

        groupedMap.set(key, {
          id: key,
          receiptNo: key,
          report_no: key,
          date: txDate,
          time: txTime,
          outlet_id: txOutletId,
          outlet_name: tx.outlet_name || getOutletName(txOutletId),
          created_by: txCreatedBy,
          type_input: isWebAdmin ? 'manual' : 'by pos kasir',
          sumber_input: isWebAdmin ? 'web_admin' : 'pos_kasir',
          status: isPaid ? 'Paid' : 'Pending',
          isPaid,
          payment_method: tx.payment_method || 'Cash',
          items: itemsSold,
          deducted_ingredients: deductedIngs,
          total_amount: tx.total_amount || tx.grand_total || itemsSold.reduce((s, i) => s + (Number(i.price || 0) * Number(i.qty || 1)), 0)
        });
      }
    });

    (masterData.stockOutflow || []).forEach(s => {
      const sKey = String(s.receiptNo || s.report_no || s.id || `TRX-STK-${s.date}`);
      if (!groupedMap.has(sKey) && !deletedOutflowIds.includes(s.id)) {
        groupedMap.set(sKey, {
          id: s.id || sKey,
          receiptNo: sKey,
          report_no: sKey,
          date: s.date || new Date().toISOString().split('T')[0],
          time: s.time || '12:00',
          outlet_id: Number(s.outletId || s.outlet_id || 1),
          outlet_name: getOutletName(s.outletId || s.outlet_id || 1),
          created_by: s.created_by || s.submitted_by || 'Kasir',
          type_input: s.type_input || 'by pos kasir',
          sumber_input: s.sumber_input || 'pos_kasir',
          status: s.status === 'Pending' ? 'Pending' : 'Paid',
          isPaid: s.status !== 'Pending',
          payment_method: s.payment_method || 'Cash',
          items: s.items || [{ name: s.itemName || 'Produk Penjualan', qty: Math.abs(s.qty || 1), price: s.cogsValue || 15000 }],
          deducted_ingredients: s.deducted_ingredients || [{ ingredient_name: s.itemName || 'Bahan Baku', qty: Math.abs(s.qty || 1), unit: s.unit || 'kg', cogs: s.cogsValue || 15000 }],
          total_amount: s.cogsValue || 15000
        });
      }
    });

    const list = Array.from(groupedMap.values()).filter(item => {
      if (deletedOutflowIds.includes(item.id)) return false;
      if (logStartDate && item.date < logStartDate) return false;
      if (logEndDate && item.date > logEndDate) return false;
      if (!logSelectedOutletIds.includes('ALL') && !logSelectedOutletIds.includes(item.outlet_id)) return false;
      if (selectedBranch && Number(item.outlet_id) !== Number(selectedBranch)) return false;
      return true;
    });

    return list.sort((a, b) => b.date.localeCompare(a.date));
  };

  const getProductVariants = (productName) => {
    const products = masterData.products || [];
    const matched = products.find(p => p.name === productName || (p.name && productName && (productName.startsWith(p.name) || p.name.startsWith(productName))));
    if (!matched) return [];
    const rawVariants = matched.variants || matched.options || matched.variations || matched.variant || [];
    if (Array.isArray(rawVariants)) {
      return rawVariants.map(v => typeof v === 'string' ? { name: v, price: 0 } : { name: v.name || v.label || String(v), price: Number(v.price || v.extraPrice || 0) });
    } else if (typeof rawVariants === 'string') {
      return rawVariants.split(',').map(s => s.trim()).filter(Boolean).map(v => ({ name: v, price: 0 }));
    }
    return [];
  };

  const handleOpenEditOutflowModal = (tx) => {
    setEditingOutflowRecord(tx);
    setSalesDate(tx.date || new Date().toISOString().split('T')[0]);
    setSalesNo(tx.receiptNo || tx.report_no || tx.id);
    setSalesCreatedBy(tx.created_by || 'Admin');
    setSalesOutletId(tx.outlet_id || 1);
    setSalesStatus(tx.isPaid ? 'Paid' : 'Pending');
    setSalesPaymentMethod(tx.payment_method || 'Cash');

    if (tx.items && tx.items.length > 0) {
      setSalesMenuRows(tx.items.map((it, idx) => {
        let pName = it.product_name || it.name || 'Item Penjualan';
        let vName = it.variant_name || it.variant || '';
        
        if (!vName && pName.includes('(') && pName.includes(')')) {
          const match = pName.match(/^(.*?)\s*\((.*?)\)$/);
          if (match) {
            pName = match[1].trim();
            vName = match[2].trim();
          }
        }

        return {
          id: it.id || (Date.now() + idx),
          product_id: it.id || it.product_id || 1,
          product_name: pName,
          variant_name: vName,
          base_price: Number(it.price || 0),
          qty: Number(it.qty || 1),
          price: Number(it.price || 0),
          total: Number(it.total || (it.qty * it.price))
        };
      }));
    } else {
      const firstProd = masterData.products && masterData.products[0] ? masterData.products[0] : null;
      const firstVars = firstProd ? getProductVariants(firstProd.name) : [];
      setSalesMenuRows([{
        id: Date.now(),
        product_id: firstProd ? firstProd.id : 1,
        product_name: firstProd ? firstProd.name : 'Item Penjualan',
        variant_name: firstVars[0] ? firstVars[0].name : '',
        base_price: firstProd ? (firstProd.price || 25000) : 25000,
        qty: 1,
        price: firstProd ? (firstProd.price || 25000) : 25000,
        total: firstProd ? (firstProd.price || 25000) : 25000
      }]);
    }
    setShowAddSalesModal(true);
  };

  const handleAddSalesMenuRow = () => {
    const firstProd = masterData.products && masterData.products[0] ? masterData.products[0] : null;
    const firstVars = firstProd ? getProductVariants(firstProd.name) : [];
    setSalesMenuRows([
      ...salesMenuRows,
      {
        id: Date.now() + Math.random(),
        product_id: firstProd ? firstProd.id : 1,
        product_name: firstProd ? firstProd.name : 'Nasi Goreng Spesial',
        variant_name: firstVars[0] ? firstVars[0].name : '',
        base_price: firstProd ? (firstProd.price || 25000) : 25000,
        qty: 1,
        price: firstProd ? (firstProd.price || 25000) : 25000,
        total: firstProd ? (firstProd.price || 25000) : 25000
      }
    ]);
  };

  const handleRemoveSalesMenuRow = (idx) => {
    setSalesMenuRows(salesMenuRows.filter((_, i) => i !== idx));
  };

  const handleUpdateSalesMenuRow = (idx, field, value) => {
    const updated = [...salesMenuRows];
    if (field === 'product_name') {
      updated[idx].product_name = value;
      const matchedProd = (masterData.products || []).find(p => p.name === value);
      if (matchedProd) {
        updated[idx].product_id = matchedProd.id;
        const baseP = Number(matchedProd.price || 0);
        updated[idx].base_price = baseP;
        updated[idx].price = baseP;
        const vars = getProductVariants(value);
        if (vars.length > 0) {
          updated[idx].variant_name = vars[0].name;
          if (vars[0].price) {
            updated[idx].price = baseP + Number(vars[0].price);
          }
        } else {
          updated[idx].variant_name = '';
        }
      }
    } else if (field === 'variant_name') {
      updated[idx].variant_name = value;
      const matchedProd = (masterData.products || []).find(p => p.name === updated[idx].product_name);
      const baseP = updated[idx].base_price || (matchedProd ? Number(matchedProd.price || 0) : updated[idx].price);
      const vars = getProductVariants(updated[idx].product_name);
      const selectedVarObj = vars.find(v => v.name === value);
      if (selectedVarObj && selectedVarObj.price) {
        updated[idx].price = baseP + Number(selectedVarObj.price);
      } else {
        updated[idx].price = baseP;
      }
    } else {
      updated[idx][field] = value;
    }
    const q = Number(updated[idx].qty || 1);
    const p = Number(updated[idx].price || 0);
    updated[idx].total = q * p;
    setSalesMenuRows(updated);
  };

  const handleSaveSalesTransaction = (e) => {
    if (e) e.preventDefault();
    if (salesMenuRows.length === 0 || salesMenuRows.some(r => !r.product_name || !r.qty)) {
      alert('Harap lengkapi item menu penjualan dan jumlah Qty!');
      return;
    }

    const items = salesMenuRows.map(r => {
      const displayName = r.variant_name
        ? `${r.product_name} (${r.variant_name})`
        : r.product_name;

      return {
        id: r.product_id,
        name: displayName,
        product_name: r.product_name,
        variant_name: r.variant_name || '',
        qty: Number(r.qty || 1),
        price: Number(r.price || 0),
        total: Number(r.total || (r.qty * r.price))
      };
    });

    const totalAmount = items.reduce((sum, i) => sum + i.total, 0);

    const deductedIngredients = [];
    const activeProducts = masterData.products || [];

    items.forEach(item => {
      const qtySold = item.qty;
      const itemLower = (item.product_name || item.name || '').toLowerCase().trim();
      const matchedProd = activeProducts.find(p => p.name?.toLowerCase() === itemLower || itemLower.startsWith(p.name?.toLowerCase()));

      if (matchedProd && matchedProd.compositions && matchedProd.compositions.length > 0) {
        matchedProd.compositions.forEach(comp => {
          const ingQty = Number(comp.qty || comp.amount || 1) * qtySold;
          deductedIngredients.push({
            ingredient_name: comp.ingredient_name || comp.name || 'Bahan Baku',
            qty: ingQty,
            unit: comp.unit || 'Gram',
            cogs: Math.round((comp.cogs || 1500) * ingQty)
          });
        });
      } else {
        let matchedIng = ingredientsList.find(ing => {
          const ingLower = ing.name.toLowerCase();
          if (itemLower.includes('kopi') || itemLower.includes('espresso') || itemLower.includes('latte')) return ingLower.includes('kopi');
          if (itemLower.includes('ayam') || itemLower.includes('chicken')) return ingLower.includes('ayam');
          if (itemLower.includes('sapi') || itemLower.includes('steak')) return ingLower.includes('sapi') || ingLower.includes('daging');
          if (itemLower.includes('nasi') || itemLower.includes('rice')) return ingLower.includes('beras');
          if (itemLower.includes('susu') || itemLower.includes('milk')) return ingLower.includes('susu');
          if (itemLower.includes('teh') || itemLower.includes('tea')) return ingLower.includes('teh');
          return ingLower.includes(itemLower) || itemLower.includes(ingLower);
        });
        if (!matchedIng) matchedIng = ingredientsList[0] || { name: 'Bahan Mentah Dapur', unit: 'kg', cost: 15000 };
        const ingQty = qtySold * (matchedIng.unit === 'Gram' || matchedIng.unit === 'ml' ? 150 : 0.2);
        deductedIngredients.push({
          ingredient_name: matchedIng.name,
          qty: ingQty,
          unit: matchedIng.unit || 'kg',
          cogs: Math.round((matchedIng.cost || 15000) * ingQty)
        });
      }
    });

    const isPaid = salesStatus === 'Paid' || salesStatus === 'Lunas';
    const targetId = editingOutflowRecord ? editingOutflowRecord.id : salesNo;

    const newTx = {
      id: targetId,
      receipt_no: targetId,
      report_no: targetId,
      date: salesDate,
      time: editingOutflowRecord ? editingOutflowRecord.time : new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      outlet_id: Number(salesOutletId),
      created_by: salesCreatedBy,
      type_input: 'manual',
      sumber_input: 'web_admin',
      status: isPaid ? 'Paid' : 'Pending',
      payment_status: isPaid ? 'Paid' : 'Pending',
      payment_method: salesPaymentMethod,
      items: items,
      deducted_ingredients: deductedIngredients,
      total_amount: totalAmount
    };

    setMasterData(prev => {
      const filterOutOld = (arr = []) => arr.filter(x => String(x.id) !== String(targetId) && String(x.receipt_no || x.report_no || '') !== String(targetId));
      
      const updatedSales = [newTx, ...filterOutOld(prev.salesTransactions || [])];
      
      const updatedIngredients = (prev.ingredients || []).map(ing => {
        const matchRecord = deductedIngredients.find(r => 
          (r.ingredient_name || '').toLowerCase().trim() === (ing.name || '').toLowerCase().trim()
        );
        if (matchRecord) {
          const currentStok = Number(ing.stok || ing.stock || ing.qty || 0);
          const newStok = Math.max(0, currentStok - Number(matchRecord.qty || 1));
          return { ...ing, stok: newStok, stock: newStok };
        }
        return ing;
      });

      return {
        ...prev,
        salesTransactions: updatedSales,
        ingredients: updatedIngredients
      };
    });

    setShowAddSalesModal(false);
    setEditingOutflowRecord(null);
    alert(`✓ Transaksi Penjualan (${targetId}) Berhasil Disimpan & Stok Bahan Baku Terpotong Otomatis!`);
  };

  // FILTERED DATA SELECTORS
  const getFilteredMasuk = () => {
    return getMovementsList().filter(m => {
      if (m.type !== 'IN') return false;
      if (logStartDate && m.date < logStartDate) return false;
      if (logEndDate && m.date > logEndDate) return false;
      // Fix type mismatch: bandingkan sebagai String agar '1' == 1
      if (!logSelectedOutletIds.includes('ALL') && !logSelectedOutletIds.includes(m.outlet_id) && !logSelectedOutletIds.includes(String(m.outlet_id))) return false;
      if (selectedBranch && Number(m.outlet_id) !== Number(selectedBranch)) return false;
      return true;
    });
  };

  const getFilteredTransfer = () => {
    return getTransfersList().filter(t => {
      if (logStartDate && t.date < logStartDate) return false;
      if (logEndDate && t.date > logEndDate) return false;
      // Fix type mismatch: cek String dan Number dari outlet_id
      const matchFrom = logSelectedOutletIds.includes('ALL') || logSelectedOutletIds.includes(t.from_outlet_id) || logSelectedOutletIds.includes(String(t.from_outlet_id));
      const matchTo = logSelectedOutletIds.includes('ALL') || logSelectedOutletIds.includes(t.to_outlet_id) || logSelectedOutletIds.includes(String(t.to_outlet_id));
      if (!matchFrom && !matchTo) return false;

      if (selectedBranch && Number(t.from_outlet_id) !== Number(selectedBranch) && Number(t.to_outlet_id) !== Number(selectedBranch)) return false;
      return true;
    });
  };

  const getFilteredRusak = () => {
    const l1 = masterData.damagedGoods || [];
    const l2 = masterData.approvedWaste || [];
    const l3 = getMovementsList().filter(m => m.type === 'WASTE');

    const combined = [...l1];
    const ids = new Set(combined.map(x => String(x.report_no || x.id)));

    [...l2, ...l3].forEach(x => {
      const key = String(x.report_no || x.id);
      if (key && !ids.has(key)) {
        combined.push(x);
        ids.add(key);
      }
    });

    const filtered = combined.filter(m => {
      if (logStartDate && m.date < logStartDate) return false;
      if (logEndDate && m.date > logEndDate) return false;
      // Fix type mismatch: cek String dan Number
      if (!logSelectedOutletIds.includes('ALL') && !logSelectedOutletIds.includes(m.outlet_id) && !logSelectedOutletIds.includes(String(m.outlet_id))) return false;
      if (selectedBranch && Number(m.outlet_id) !== Number(selectedBranch)) return false;
      return true;
    });

    const seen = new Set();
    return filtered.filter(m => {
      const rNo = String(m.report_no || m.id);
      if (seen.has(rNo)) return false;
      seen.add(rNo);
      return true;
    });
  };

  const getFilteredOpname = () => {
    return getOpnameList().filter(op => {
      if (logStartDate && op.date < logStartDate) return false;
      if (logEndDate && op.date > logEndDate) return false;
      // Fix type mismatch: cek String dan Number
      if (!logSelectedOutletIds.includes('ALL') && !logSelectedOutletIds.includes(op.outlet_id) && !logSelectedOutletIds.includes(String(op.outlet_id))) return false;
      if (selectedBranch && Number(op.outlet_id) !== Number(selectedBranch)) return false;

      // Filter Dibuat Oleh (By Kasir vs By Outlet)
      const isKasir = (op.type_input && op.type_input.toLowerCase().includes('mobile')) || (op.submitted_by && !op.created_by) || ((op.created_by || '').toLowerCase().includes('kasir'));
      if (opnameCreatorFilter === 'by_kasir' && !isKasir) return false;
      if (opnameCreatorFilter === 'by_outlet' && isKasir) return false;

      return true;
    });
  };

  // CALCULATE MANUAL LOGISTICS GRAND TOTAL
  const getManualGrandTotal = () => {
    return manualRows.reduce((acc, row) => {
      const q = Number(row.qty) || 0;
      const p = Number(row.priceUnit) || 0;
      return acc + (q * p);
    }, 0);
  };

  // SUBMIT MANUAL LOGISTICS
  const handleCommitManualLogistics = () => {
    const validRows = manualRows.filter(row => (row.searchQuery || row.ingredientId) && Number(row.qty) > 0);
    if (validRows.length === 0) {
      alert('Isi minimal 1 item (pilih bahan baku) dengan Jumlah dan Harga yang valid');
      return;
    }

    const newMovements = validRows.map((row, idx) => {
      const ing = ingredientsList.find(i => i.id === Number(row.ingredientId) || i.name.toLowerCase() === (row.searchQuery || '').toLowerCase()) || {};
      const sup = suppliersList.find(s => s.id === Number(row.supplierId)) || { name: '-' };
      const qtyVal = Number(row.qty);
      const prcVal = Number(row.priceUnit) || 0;
      const itemName = row.searchQuery || ing.name || 'Item';
      const itemUnit = row.unit || ing.unit || 'pcs';

      return {
        id: `mv-${Date.now()}-${idx}`,
        date: manualDate,
        outlet_id: Number(manualOutletId),
        type: 'IN',
        item_name: itemName,
        qty: qtyVal,
        unit: itemUnit,
        supplier: sup.name,
        created_by: manualCreatedBy,
        price_unit: prcVal,
        total_price: qtyVal * prcVal,
        type_input: 'manual'
      };
    });

    setMasterData(prev => ({
      ...prev,
      stockMovement: [...(prev.stockMovement || []), ...newMovements]
    }));

    // Reset Form & Close Modals
    setManualRows([
      { ingredientId: '', supplierId: suppliersList[0]?.id || '', qty: '', priceUnit: '', searchQuery: '', unit: '', showSuggestions: false },
      { ingredientId: '', supplierId: suppliersList[0]?.id || '', qty: '', priceUnit: '', searchQuery: '', unit: '', showSuggestions: false },
      { ingredientId: '', supplierId: suppliersList[0]?.id || '', qty: '', priceUnit: '', searchQuery: '', unit: '', showSuggestions: false },
      { ingredientId: '', supplierId: suppliersList[0]?.id || '', qty: '', priceUnit: '', searchQuery: '', unit: '', showSuggestions: false },
      { ingredientId: '', supplierId: suppliersList[0]?.id || '', qty: '', priceUnit: '', searchQuery: '', unit: '', showSuggestions: false }
    ]);
    setShowPreviewModal(false);
    setShowAddModal(null);
  };

  // DELETE LOGISTIC RECORD (MENYAPU BERSIH SELURUH LOGISTIK DARI WEB ADMIN & POS KASIR)
  const handleDeleteRecord = (id, tabType, reportNo = null) => {
    if (!window.confirm('Apakah Anda yakin ingin menghapus data logistik ini secara permanen dari Web Admin dan POS Kasir?')) return;

    const targetReportNo = String(reportNo || id);
    const targetIdStr = String(id);

    setMasterData(prev => {
      const prevDeleted = (prev.deletedLogisticsIds || []).map(x => String(x));
      const updatedDeleted = Array.from(new Set([...prevDeleted, targetIdStr, targetReportNo]));

      const filterItem = item => {
        if (!item) return false;
        const iId = String(item.id !== undefined && item.id !== null ? item.id : '');
        const iRNo = String(item.report_no || item.receiptNo || item.receipt_no || '');
        return iId !== targetIdStr && iId !== targetReportNo && iRNo !== targetIdStr && iRNo !== targetReportNo;
      };

      return {
        ...prev,
        _lastUpdated: Date.now(),
        deletedLogisticsIds: updatedDeleted,
        stockOpname: (prev.stockOpname || []).filter(filterItem),
        approvedOpname: (prev.approvedOpname || []).filter(filterItem),
        approvedLogistics: (prev.approvedLogistics || []).filter(filterItem),
        stockTransfer: (prev.stockTransfer || []).filter(filterItem),
        approvedTransfers: (prev.approvedTransfers || []).filter(filterItem),
        damagedGoods: (prev.damagedGoods || []).filter(filterItem),
        approvedWaste: (prev.approvedWaste || []).filter(filterItem),
        stockMovement: (prev.stockMovement || []).filter(filterItem),
        stockIn: (prev.stockIn || []).filter(filterItem),
        purchases: (prev.purchases || []).filter(filterItem),
        outletTransactions: (prev.outletTransactions || []).filter(filterItem),
        salesTransactions: (prev.salesTransactions || []).filter(filterItem),
        transactions: (prev.transactions || []).filter(filterItem)
      };
    });

    // Panggil delete-item endpoint di server backend untuk menjamin MySQL bersih
    try {
      fetch('https://mris-api.barokahgroupindonesia.tech/api/master-data/delete-item', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: tabType || 'stockOpname', id: targetReportNo, report_no: targetReportNo })
      }).catch(() => {});
    } catch (e) {}
  };

  // GET AUTO SALES OUTFLOW FROM WEB ADMIN LOGISTIK (STOK KELUAR PENJUALAN)
  const getAutoSalesOutflowForIngredient = (itemName, outletId) => {
    const allOutflows = generateStockDeductions();
    const itemOutflows = allOutflows.filter(d => 
      (d.itemName || d.ingredientName || d.item_name || '').toLowerCase().trim() === (itemName || '').toLowerCase().trim() &&
      (!outletId || Number(d.outletId || d.outlet_id) === Number(outletId))
    );
    return itemOutflows.reduce((sum, d) => sum + Number(d.qty || 0), 0);
  };

  // GET AUTO WASTE / STOK RUSAK FOR INGREDIENT
  const getAutoWasteForIngredient = (itemName, outletId, dateStr) => {
    const rawList = [...(masterData.damagedGoods || []), ...(masterData.approvedWaste || []), ...(masterData.stockMovement || []).filter(m => m.type === 'WASTE')];
    const uniqueMap = new Map();
    rawList.forEach(w => {
      const key = w.id || `${w.report_no}-${w.item_name || w.nama_barang}-${w.qty || w.stok_rusak}`;
      if (!uniqueMap.has(key)) uniqueMap.set(key, w);
    });
    const deduplicated = Array.from(uniqueMap.values());
    return deduplicated
      .filter(d => {
        const matchName = (d.item_name || d.nama_barang || d.itemName || '').toLowerCase().trim() === (itemName || '').toLowerCase().trim();
        const matchOutlet = !outletId || String(d.outlet_id || d.outletId) === String(outletId) || d.branch_name === outletId || d.outletName === outletId || Number(d.outlet_id || d.outletId) === Number(outletId);
        const dDate = d.date || (d.tanggal_waktu ? d.tanggal_waktu.split('T')[0] : '');
        const matchDate = !dateStr || dDate === dateStr;
        return matchName && matchOutlet && matchDate;
      })
      .reduce((sum, d) => sum + Number(d.qty || d.stok_rusak || d.jumlah_rusak || 0), 0);
  };

  // APPROVE STOK MASUK (dari POS Kasir → Web Admin klik Done)
  const handleApproveMasukRecord = (record) => {
    const targetReportNo = record.report_no || record.id;
    setMasterData(prev => {
      const updateItem = (item) => {
        if (item.id === record.id || (item.report_no && String(item.report_no) === String(targetReportNo))) {
          return { ...item, status: 'Done', is_approved: true, sent_to_apk: true, approved_at: new Date().toISOString(), approved_by: 'Admin Web', status_keterangan: 'by approved' };
        }
        return item;
      };
      return {
        ...prev,
        _lastUpdated: Date.now(),
        stockMovement: (prev.stockMovement || []).map(updateItem),
        approvedLogistics: (prev.approvedLogistics || []).map(updateItem)
      };
    });
    alert(`✅ Stok Masuk (${record.item_name || targetReportNo}) BERHASIL DISETUJUI!\nStatus berubah menjadi 🟢 Done dan tersinkron ke POS Kasir.`);
  };

  // ACC / APPROVE OPNAME REPORT FROM OUTLET
  const handleApproveOpnameReport = (op) => {
    const autoStokKeluarPenjualan = getAutoSalesOutflowForIngredient(op.item_name, op.outlet_id);
    const activePrice = getItemPriceFromStokMasuk(op.item_name) || op.harga_satuan || 0;

    const updatedRecord = {
      ...op,
      stok_keluar: autoStokKeluarPenjualan,
      harga_satuan: activePrice,
      status: 'Approved',
      sent_to_apk: true,
      approved_at: new Date().toISOString(),
      approved_by: 'Admin Web'
    };

    setMasterData(prev => {
      const existingApp = prev.approvedLogistics || [];
      const updatedApp = existingApp.map(item => item.id === op.id ? updatedRecord : item);

      const existingOp = prev.stockOpname || [];
      const updatedOp = existingOp.map(item => item.id === op.id ? updatedRecord : item);

      return {
        ...prev,
        _lastUpdated: Date.now(),
        approvedLogistics: updatedApp.some(item => item.id === op.id) ? updatedApp : [updatedRecord, ...updatedApp],
        stockOpname: updatedOp.some(item => item.id === op.id) ? updatedOp : [updatedRecord, ...updatedOp]
      };
    });

    alert(`✅ Laporan Stok Opname (${op.item_name}) BERHASIL DI-ACC & APPROVED!\nStok Keluar Penjualan otomatis terisi (${autoStokKeluarPenjualan} ${op.unit || 'kg'}).\nStatus di POS Mobile APK kini langsung berubah dari PENDING menjadi 🟢 APPROVED.`);
  };

  // SEND TO MOBILE APK (REQUIRES ACC FIRST)
  const handleSendToMobileAPK = (recordName, recordObj = null) => {
    if (recordObj) {
      if (recordObj.status !== 'ACC' && recordObj.status !== 'Approved' && recordObj.status !== 'ok') {
        alert(`⚠️ Laporan Stok Opname (${recordName}) harus disetujui (ACC) terlebih dahulu oleh Admin sebelum dapat dikirim ke Mobile APK!`);
        return;
      }

      const updatedObj = {
        ...recordObj,
        status: 'Approved',
        sent_to_apk: true,
        type_input: 'Report Outlet (Disetujui)'
      };

      setMasterData(prev => {
        const existingApp = prev.approvedLogistics || [];
        const updatedApp = existingApp.map(op => op.id === recordObj.id ? updatedObj : op);

        const existingOp = prev.stockOpname || [];
        const updatedOp = existingOp.map(op => op.id === recordObj.id ? updatedObj : op);

        return {
          ...prev,
          approvedLogistics: updatedApp.some(op => op.id === recordObj.id) ? updatedApp : [updatedObj, ...updatedApp],
          stockOpname: updatedOp.some(op => op.id === recordObj.id) ? updatedOp : [updatedObj, ...updatedOp]
        };
      });
    }
    alert(`🚀 Berhasil mengirim Laporan Stok Opname (${recordName}) ke Mobile APK Kasir! Status laporan kini berubah menjadi 🟢 APPROVED.`);
  };

  // 2-STEP TRANSFER APPROVAL & APK DISTRIBUTION TO POS MOBILE
  const handleApproveTransferRecord = (targetRecord) => {
    const targetReportNo = targetRecord.report_no || targetRecord.id;

    setMasterData(prev => {
      const list1 = prev.stockTransfer || [];
      const list2 = prev.approvedTransfers || [];

      const updateItem = (item) => {
        if (item.id === targetRecord.id || (item.report_no && String(item.report_no) === String(targetReportNo))) {
          return {
            ...item,
            status: 'Approved',
            is_approved: true
          };
        }
        return item;
      };

      const updatedList1 = list1.map(updateItem);
      const updatedList2 = list2.map(updateItem);

      return {
        ...prev,
        stockTransfer: updatedList1,
        approvedTransfers: updatedList2
      };
    });

    alert(`✅ Laporan Transfer Stok ${targetReportNo} telah disetujui (ACC)! Silakan klik tombol 'Kirim APK' untuk menghubungkan data langsung ke Mobile APK Kasir (POS).`);
  };

  const handleApproveWasteRecord = (targetRecord) => {
    const targetReportNo = targetRecord.report_no || targetRecord.id;

    setMasterData(prev => {
      const updateItem = (item) => {
        if (item.id === targetRecord.id || (item.report_no && String(item.report_no) === String(targetReportNo))) {
          return {
            ...item,
            status: 'Approved',
            type_input: 'by approval',
            status_keterangan: 'by approved',
            sumber_input: item.sumber_input || 'web_admin',
            is_approved: true
          };
        }
        return item;
      };

      return {
        ...prev,
        damagedGoods: (prev.damagedGoods || []).map(updateItem),
        approvedWaste: (prev.approvedWaste || []).map(updateItem),
        stockMovement: (prev.stockMovement || []).map(updateItem)
      };
    });

    alert(`✅ Laporan Barang Rusak ${targetReportNo} telah disetujui (ACC)! Status laporan ini di POS Mobile kini berubah menjadi 🟢 APPROVED.`);
  };

  const handleSendWasteToAPK = (targetRecord) => {
    const targetReportNo = targetRecord.report_no || targetRecord.id;

    setMasterData(prev => {
      const updateItem = (item) => {
        if (item.id === targetRecord.id || (item.report_no && String(item.report_no) === String(targetReportNo))) {
          return {
            ...item,
            status: 'Approved',
            sent_to_apk: true,
            type_input: 'by approval',
            status_keterangan: 'by approved',
            sumber_input: item.sumber_input || 'web_admin',
            is_approved: true
          };
        }
        return item;
      };

      return {
        ...prev,
        damagedGoods: (prev.damagedGoods || []).map(updateItem),
        approvedWaste: (prev.approvedWaste || []).map(updateItem),
        stockMovement: (prev.stockMovement || []).map(updateItem)
      };
    });

    alert(`🚀 Laporan Barang Rusak ${targetReportNo} berhasil dikirim ke Mobile APK Kasir! Status berubah menjadi 🟢 APPROVED.`);
  };

  const handleSendTransferToAPK = (targetRecord) => {
    const targetReportNo = targetRecord.report_no || targetRecord.id;

    setMasterData(prev => {
      const list1 = prev.stockTransfer || [];
      const list2 = prev.approvedTransfers || [];
      const list3 = prev.stockMovement || [];

      const updateItem = (item) => {
        if (item.id === targetRecord.id || (item.report_no && String(item.report_no) === String(targetReportNo))) {
          return {
            ...item,
            status: 'Approved',
            sent_to_apk: true,
            is_approved: true
          };
        }
        return item;
      };

      const updatedList1 = list1.map(updateItem);
      const updatedList2 = list2.map(updateItem);
      const updatedList3 = list3.map(updateItem);

      return {
        ...prev,
        stockTransfer: updatedList1,
        approvedTransfers: updatedList2,
        stockMovement: updatedList3
      };
    });

    alert(`🚀 Laporan Transfer Stok ${targetReportNo} berhasil dikirim ke Mobile APK Kasir! Status berubah menjadi 🟢 APPROVED.`);
  };

  // OPEN SINGLE RECORD EDIT MODAL
  const handleOpenEditRecord = (m, type = 'masuk') => {
    setEditingRecord(m);
    setEditType(type);
    setEditDate(m.date);
    setEditCreatedBy(m.created_by || 'Admin');
    setEditItemName(m.item_name);
    setEditQty(m.qty || 0);
    setEditUnit(m.unit || 'kg');
    setEditNotes(m.notes || '');

    if (type === 'masuk') {
      setEditOutletId(m.outlet_id);
      setEditSupplier(m.supplier || '');
      setEditPriceUnit(m.price_unit || '');
    } else if (type === 'waste') {
      setEditOutletId(m.outlet_id);
      setRusakNo(m.report_no || m.id);
      setRusakDate(m.date || new Date().toISOString().split('T')[0]);
      setRusakCreatedBy(m.created_by || m.submitted_by || m.input_by || 'Admin');
      setRusakOutletId(m.outlet_id || 1);
      setRusakEditingNotes(m.editing_notes || m.notes || '');

      const allRusak = [...(masterData.damagedGoods || []), ...(masterData.approvedWaste || [])];
      const matchingBatch = allRusak.filter(x => (x.report_no && x.report_no === m.report_no) || x.id === m.id);
      if (matchingBatch.length > 0) {
        setRusakBatchRows(matchingBatch.map((b, i) => ({
          id: b.id || (Date.now() + i),
          item_name: b.item_name || b.nama_barang || '',
          custom_item_name: '',
          qty: b.qty || b.stok_rusak || b.jumlah_rusak || 1,
          unit: b.unit || 'kg',
          reason: b.alasan_rusak || b.damage_reason || b.reason || 'Terlalu kecil',
          notes: b.notes || ''
        })));
      } else {
        setRusakBatchRows([{
          id: m.id || Date.now(),
          item_name: m.item_name || m.nama_barang || '',
          custom_item_name: '',
          qty: m.qty || m.stok_rusak || m.jumlah_rusak || 1,
          unit: m.unit || 'kg',
          reason: m.alasan_rusak || m.damage_reason || m.reason || 'Terlalu kecil',
          notes: m.notes || ''
        }]);
      }
      setShowAddModal('rusak');
      return;
    } else if (type === 'opname') {
      setEditOutletId(m.outlet_id);
      setEditStokAwal(m.stok_awal || 0);
      setEditStokMasuk(m.stok_masuk || 0);
      setEditStokKeluar(m.stok_keluar || 0);
      setEditTransferMasuk(m.transfer_masuk || 0);
      setEditTransferKeluar(m.transfer_keluar || 0);
      setEditStokRusak(m.stok_rusak || 0);
      setEditStokFisik(m.stok_fisik || 0);
      setEditHargaSatuan(m.harga_satuan || 0);
    } else {
      setEditFromOutletId(m.from_outlet_id);
      setEditToOutletId(m.to_outlet_id);
      setEditStatus(m.status || 'Terkirim');
      setEditIsReturned(m.is_returned || false);
    }
  };

  // SAVE SINGLE RECORD EDIT
  const handleSaveEditRecord = (e) => {
    e.preventDefault();
    if (!editItemName || (editType !== 'opname' && !editQty)) {
      alert('Nama item dan Qty wajib diisi');
      return;
    }

    if (editType === 'masuk') {
      const updatedMovements = getMovementsList().map(m => {
        if (m.id === editingRecord.id) {
          const qtyVal = Number(editQty);
          const prcVal = Number(editPriceUnit || 0);
          return {
            ...m,
            date: editDate,
            outlet_id: Number(editOutletId),
            created_by: editCreatedBy,
            item_name: editItemName,
            supplier: editSupplier,
            qty: qtyVal,
            unit: editUnit,
            price_unit: prcVal,
            total_price: qtyVal * prcVal,
            notes: editNotes
          };
        }
        return m;
      });

      setMasterData(prev => ({
        ...prev,
        stockMovement: updatedMovements
      }));
    } else if (editType === 'waste') {
      const updatedMovements = getMovementsList().map(m => {
        if (m.id === editingRecord.id) {
          return {
            ...m,
            date: editDate,
            outlet_id: Number(editOutletId),
            created_by: editCreatedBy,
            item_name: editItemName,
            qty: Number(editQty),
            unit: editUnit,
            notes: editNotes
          };
        }
        return m;
      });

      setMasterData(prev => ({
        ...prev,
        stockMovement: updatedMovements
      }));
    } else if (editType === 'opname') {
      const updatedOpname = getOpnameList().map(op => {
        if (op.id === editingRecord.id) {
          return {
            ...op,
            date: editDate,
            outlet_id: Number(editOutletId),
            created_by: editCreatedBy,
            item_name: editItemName,
            stok_awal: Number(editStokAwal || 0),
            stok_masuk: Number(editStokMasuk || 0),
            stok_keluar: Number(editStokKeluar || 0),
            transfer_masuk: Number(editTransferMasuk || 0),
            transfer_keluar: Number(editTransferKeluar || 0),
            stok_rusak: Number(editStokRusak || 0),
            stok_fisik: Number(editStokFisik || 0),
            harga_satuan: Number(editHargaSatuan || 0),
            unit: editUnit,
            notes: editNotes
          };
        }
        return op;
      });

      setMasterData(prev => ({
        ...prev,
        stockOpname: updatedOpname
      }));
    } else {
      // Edit Transfer Stok
      const updatedTransfers = getTransfersList().map(t => {
        if (t.id === editingRecord.id) {
          return {
            ...t,
            date: editDate,
            from_outlet_id: Number(editFromOutletId),
            to_outlet_id: Number(editToOutletId),
            item_name: editItemName,
            qty: Number(editQty),
            unit: editUnit,
            status: editStatus,
            created_by: editCreatedBy,
            is_returned: editIsReturned,
            notes: editNotes
          };
        }
        return t;
      });

      setMasterData(prev => ({
        ...prev,
        stockTransfer: updatedTransfers
      }));
    }

    setEditingRecord(null);
  };

  // SAVE OTHER LOGISTICS SUBTABS
  const handleSaveTransfer = (e) => {
    e.preventDefault();
    if (Number(transferFromOutletId) === Number(transferToOutletId)) {
      alert('Outlet Asal dan Outlet Tujuan tidak boleh sama');
      return;
    }
    if (!transferQty) {
      alert('Kuantitas (Qty) wajib diisi');
      return;
    }

    const selectedIng = ingredientsList.find(i => i.id === Number(transferIngredientId)) || { name: 'Item', unit: 'pcs' };

    const newRecord = {
      id: `tx-${Date.now()}`,
      date: transferDate,
      from_outlet_id: Number(transferFromOutletId),
      to_outlet_id: Number(transferToOutletId),
      item_name: selectedIng.name,
      qty: Number(transferQty),
      unit: selectedIng.unit || 'pcs',
      status: transferStatus,
      created_by: transferCreatedBy,
      type_input: 'manual',
      is_returned: false,
      notes: transferNotes || '-'
    };

    setMasterData(prev => ({
      ...prev,
      stockTransfer: [...(prev.stockTransfer || []), newRecord]
    }));

    setTransferQty('');
    setTransferNotes('');
    setTransferSearchQuery('');
    setShowAddModal(null);
  };

  const handleSaveRusak = (e) => {
    e.preventDefault();
    if (rusakBatchRows.length === 0 || rusakBatchRows.some(r => !r.item_name || !r.qty)) {
      alert('Harap lengkapi item bahan baku dan jumlah Qty rusak!');
      return;
    }
    // Opens Papan Preview Modal for user review
    setShowRusakPreviewFormModal(true);
  };

  const handleSaveRusakFinal = () => {
    const reportNo = rusakNo || `WST-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${Math.floor(100 + Math.random() * 900)}`;
    const ingredientsList = masterData.ingredients || [];
    const outletTarget = outlets.find(o => String(o.id) === String(rusakOutletId) || Number(o.id) === Number(rusakOutletId)) || outlets[0] || { id: 1, name: 'Restoran Utama' };

    const createdRecords = rusakBatchRows.map((row, idx) => {
      const finalItemName = row.item_name === '__OTHER__' ? (row.custom_item_name || 'Bahan Baku Kustom') : row.item_name;
      const matchedIng = ingredientsList.find(i => i.name === finalItemName);
      const skuVal = row.sku || matchedIng?.sku || `SKU-WST-${Math.floor(1000 + Math.random() * 9000)}`;

      const finalReason = (row.reason === 'Dan lain lain' || row.reason === 'Lain-lain')
        ? (row.reason_custom ? `Dan lain lain: ${row.reason_custom}` : (row.reason || 'Dan lain lain'))
        : (row.reason || 'Terlalu kecil');

      const notesParts = [];
      if (rusakEditingNotes) notesParts.push(`[Edit: ${rusakEditingNotes}]`);
      if (rusakNotes) notesParts.push(`[Catatan: ${rusakNotes}]`);
      if (row.notes) notesParts.push(row.notes);
      if (notesParts.length === 0) notesParts.push(finalReason);

      const finalNotesStr = notesParts.join(' - ');

      return {
        id: `${reportNo}-${idx + 1}-${Math.random().toString(36).substr(2, 4)}`,
        report_no: reportNo,
        date: rusakDate,
        tanggal_waktu: new Date().toISOString(),
        outlet_id: rusakOutletId || (outlets[0]?.id) || 1,
        branch_name: outletTarget.name || (outlets[0]?.name) || 'Restoran Utama',
        type: 'WASTE',
        nama_barang: finalItemName,
        item_name: finalItemName,
        sku: skuVal,
        jumlah_rusak: Number(row.qty || 1),
        qty: Number(row.qty || 1),
        stok_rusak: Number(row.qty || 1),
        unit: row.unit || matchedIng?.unit || 'kg',
        alasan_rusak: finalReason,
        damage_reason: finalReason,
        reason: finalReason,
        input_by: rusakCreatedBy,
        submitted_by: rusakCreatedBy,
        created_by: rusakCreatedBy,
        author_name: rusakCreatedBy,
        sumber_input: 'web_admin',
        status_keterangan: 'by manual',
        type_input: 'manual',
        status: 'pending',
        is_approved: false,
        editing_notes: rusakEditingNotes || '',
        notes: finalNotesStr,
        created_at: new Date().toISOString()
      };
    });

    const filterOld = (arr = []) => arr.filter(x => String(x.report_no || x.id) !== String(reportNo) && String(x.id) !== String(editingRecord?.id || ''));

    setMasterData(prev => {
      const updatedIngredients = (prev.ingredients || []).map(ing => {
        const matchRecord = createdRecords.find(r => 
          (r.item_name || r.nama_barang || '').toLowerCase().trim() === (ing.name || '').toLowerCase().trim() &&
          (!ing.outlet_id || String(r.outlet_id) === String(ing.outlet_id) || Number(r.outlet_id) === Number(ing.outlet_id))
        );
        if (matchRecord) {
          const currentStok = Number(ing.stok || ing.stock || ing.qty || 0);
          const newStok = Math.max(0, currentStok - Number(matchRecord.qty || 1));
          return { ...ing, stok: newStok, stock: newStok };
        }
        return ing;
      });

      return {
        ...prev,
        ingredients: updatedIngredients,
        damagedGoods: [...createdRecords, ...filterOld(prev.damagedGoods)],
        approvedWaste: [...createdRecords, ...filterOld(prev.approvedWaste)],
        stockMovement: [...createdRecords, ...filterOld(prev.stockMovement)]
      };
    });

    alert(`✅ Laporan Barang Rusak ${reportNo} (${rusakBatchRows.length} Bahan Baku) berhasil disimpan!\nKeterangan "by manual" aktif. Silakan klik ACC & Kirim APK jika ingin menghubungkan ke POS Mobile APK.`);
    setShowRusakPreviewFormModal(false);
    setShowAddModal(null);
    setEditingRecord(null);
    setRusakEditingNotes('');
  };

  const handleSaveOpname = (e) => {
    e.preventDefault();
    if (!opnameStokFisik) {
      alert('Sisa stok fisik wajib diisi');
      return;
    }

    const selectedIng = ingredientsList.find(i => i.id === Number(opnameIngredientId)) || { name: 'Item', unit: 'pcs' };

    const newRecord = {
      id: `op-${Date.now()}`,
      date: opnameDate,
      outlet_id: Number(opnameOutletId),
      item_name: selectedIng.name,
      stok_awal: Number(opnameStokAwal || 0),
      stok_masuk: Number(opnameStokMasuk || 0),
      stok_keluar: Number(opnameStokKeluar || 0),
      transfer_masuk: Number(opnameTransferMasuk || 0),
      transfer_keluar: Number(opnameTransferKeluar || 0),
      stok_rusak: Number(opnameStokRusak || 0),
      stok_fisik: Number(opnameStokFisik || 0),
      harga_satuan: getItemPriceFromStokMasuk(selectedIng.name),
      unit: selectedIng.unit || 'pcs',
      created_by: opnameCreatedBy,
      type_input: 'manual',
      notes: opnameNotes || '-'
    };

    setMasterData(prev => ({
      ...prev,
      stockOpname: [...(prev.stockOpname || []), newRecord]
    }));

    setOpnameStokAwal('');
    setOpnameStokMasuk('');
    setOpnameStokKeluar('');
    setOpnameTransferMasuk('');
    setOpnameTransferKeluar('');
    setOpnameStokRusak('');
    setOpnameStokFisik('');
    setOpnameHargaSatuan('');
    setOpnameNotes('');
    setOpnameSearchQuery('');
    setShowAddModal(null);
  };

  // EXPORT EXCEL HANDLER
  const handleDownloadExcel = () => {
    const outletStr = selectedBranch ? (outlets.find(o => Number(o.id) === Number(selectedBranch))?.name || 'Semua Outlet Cabang') : 'Semua Outlet Cabang';
    let filename = buildExportFilename(`laporan_logistik_${activeSubTab}`, outletStr, '2026-07-01', '2026-07-31', 'csv');
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += `Laporan Logistik (${activeSubTab.toUpperCase()}) - Outlet: ${outletStr}\n`;
    csvContent += `Nama Outlet,${outletStr}\n\n`;

    if (activeSubTab === 'stok_masuk') {
      csvContent += "Tanggal,Outlet,Dibuat Oleh,Nama Item,Supplier,Qty,Satuan,Harga per Unit (Rp),Total Harga (Rp),Tipe Input\n";
      getFilteredMasuk().forEach(m => {
        csvContent += `"${m.date}","${getOutletName(m.outlet_id)}","${m.created_by || 'Admin'}","${m.item_name}",${m.qty},"${m.unit}",${m.price_unit || 0},${m.total_price || 0},"${m.type_input || 'by kasir'}"\n`;
      });
    } else if (activeSubTab === 'stok_keluar') {
      csvContent += "No. Struk,Tanggal & Waktu,Nama Outlet,Nama Item,Tipe Item,Qty Terpotong,Satuan,Total HPP Terpotong (Rp),Status\n";
      filteredStockOutflow.forEach(d => {
        csvContent += `"${d.receiptNo}","${d.date} ${d.time}","${getOutletName(d.outletId)}","${d.itemName}","${d.itemType}",-${Math.abs(d.qty)},"${d.unit}",${d.cogsValue},"${d.status}"\n`;
      });
    } else if (activeSubTab === 'transfer_stok') {
      csvContent += "Tanggal,Dibuat Oleh,Tipe Input,Outlet Asal,Outlet Tujuan,Nama Item,Qty,Satuan,Status,Catatan,Status Pengembalian\n";
      getFilteredTransfer().forEach(t => {
        csvContent += `"${t.date}","${t.created_by || 'Admin'}","${t.type_input || 'by approval'}","${getOutletName(t.from_outlet_id)}","${getOutletName(t.to_outlet_id)}","${t.item_name}",${t.qty},"${t.unit}","${t.status}","${t.notes}","${t.is_returned ? 'Sudah Kembali' : 'Belum Kembali'}"\n`;
      });
    } else if (activeSubTab === 'stok_rusak') {
      csvContent += "Tanggal,Dibuat Oleh,Tipe Input,Outlet,Nama Item,Qty,Satuan,Catatan\n";
      getFilteredRusak().forEach(m => {
        csvContent += `"${m.date}","${m.created_by || 'Admin'}","${m.type_input || 'by approval'}","${getOutletName(m.outlet_id)}","${m.item_name}",${m.qty},"${m.unit}","${m.notes}"\n`;
      });
    } else if (activeSubTab === 'stok_opname_system') {
      csvContent += "Tanggal,Nama Outlet,Nama Item,Satuan,Stok Awal,Stok Masuk,Stok Keluar,Transfer Stok In,Transfer Stok Out,Stok Rusak,Sisa Stok by Sistem\n";
      calculateStockOpnameBySystem().forEach(op => {
        csvContent += `"${op.date}","${op.outletName}","${op.itemName}","${op.unit}",${op.stokAwal},${op.stokMasuk},${op.stokKeluar},${op.transferIn},${op.transferOut},${op.stokRusak},${op.sisaStokSystem}\n`;
      });
    } else if (activeSubTab === 'stok_opname_report' || activeSubTab === 'stok_opname') {
      csvContent += "Tanggal Audit,Dibuat Oleh,Tipe Input,Outlet,Nama Item,Stok Awal,Stok Masuk,Stok Keluar,Trans. Masuk,Trans. Keluar,Stok Rusak,Sisa Stok Sistem,Sisa Stok Fisik,Analisis Selisih,Harga Satuan,Denda Stok,Catatan\n";
      getFilteredOpname().forEach(op => {
        const sSistem = (op.stok_awal || 0) + (op.stok_masuk || 0) + (op.transfer_masuk || 0) - ((op.stok_keluar || 0) + (op.stok_rusak || 0) + (op.transfer_keluar || 0));
        const isDefisit = (op.stok_fisik || 0) < sSistem;
        const activePrice = getItemPriceFromStokMasuk(op.item_name) || op.harga_satuan || 0;
        const dendaVal = isDefisit ? Math.abs(sSistem - (op.stok_fisik || 0)) * activePrice : 0;
        csvContent += `"${op.date}","${op.created_by || 'Admin'}","${op.type_input || 'manual'}","${getOutletName(op.outlet_id)}","${op.item_name}",${op.stok_awal || 0},${op.stok_masuk || 0},${op.stok_keluar || 0},${op.transfer_masuk || 0},${op.transfer_keluar || 0},${op.stok_rusak || 0},${sSistem},${op.stok_fisik || 0},"${statusText} (${diffVal > 0 ? `+${diffVal}` : diffVal === 0 ? '0' : `-${Math.abs(diffVal)}`})",${activePrice},${dendaVal},"${op.notes || '-'}"\n`;
      });
    } else if (activeSubTab === 'perbandingan_harga') {
      const outletCols = outlets.map(o => `Harga ${o.name}`);
      csvContent += `Tanggal,Nama Item,Kategori,Satuan,${outletCols.join(',')},Outlet Harga Tertinggi,Catatan\n`;
      getFilteredPriceComparison().forEach(item => {
        const prices = outlets.map(o => item.prices?.[o.id] || 0);
        const maxP = Math.max(...prices);
        const highest = outlets.filter(o => (item.prices?.[o.id] || 0) === maxP && maxP > 0).map(o => o.name).join(' & ');
        csvContent += `"${item.date}","${item.item_name}","${item.category || 'Bahan Baku'}","${item.unit || 'kg'}",${prices.join(',')},"${highest || '-'}","${item.notes || ''}"\n`;
      });
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadPDF = () => {
    const outletStr = selectedBranch ? (outlets.find(o => Number(o.id) === Number(selectedBranch))?.name || 'Semua Outlet Cabang') : 'Semua Outlet Cabang';
    const pdfFilename = buildExportFilename(`laporan_logistik_${activeSubTab}`, outletStr, '2026-07-01', '2026-07-31', 'pdf');
    const printWindow = window.open('', '_blank');
    let tabTitle = activeSubTab.toUpperCase().replace('_', ' ');
    let tableRows = '';

    if (activeSubTab === 'stok_masuk') {
      tableRows = getFilteredMasuk().map(m => `
        <tr>
          <td>${m.date}</td>
          <td>🏢 ${getOutletName(m.outlet_id)}</td>
          <td>${m.created_by || 'Admin'}</td>
          <td><b>${m.item_name}</b></td>
          <td>${m.supplier || '-'}</td>
          <td>+${m.qty}</td>
          <td>${m.unit}</td>
          <td>${formatRupiah(m.price_unit)}</td>
          <td><b>${formatRupiah(m.total_price)}</b></td>
          <td><span style="text-transform:uppercase; font-size:10px; font-weight:bold; color:${m.type_input === 'manual' ? T.info : T.accentGold}">${m.type_input || 'by kasir'}</span></td>
        </tr>
      `).join('');
    } else if (activeSubTab === 'stok_keluar') {
      tableRows = filteredStockOutflow.map(d => `
        <tr>
          <td>${d.receiptNo}</td>
          <td>${d.date} (${d.time})</td>
          <td>🏢 ${getOutletName(d.outletId)}</td>
          <td><b>${d.itemName}</b></td>
          <td>${d.itemType}</td>
          <td style="color: ${T.danger}; font-weight: bold;">-${Math.abs(d.qty).toFixed(1)}</td>
          <td>${d.unit}</td>
          <td style="color: ${T.success}; font-weight: bold;">${formatRupiah(d.cogsValue)}</td>
          <td>${d.status}</td>
        </tr>
      `).join('');
    } else if (activeSubTab === 'transfer_stok') {
      tableRows = getFilteredTransfer().map(t => `
        <tr>
          <td>${t.date}</td>
          <td>${t.created_by || 'Admin'}</td>
          <td><span style="text-transform:uppercase; font-size:10px; font-weight:bold; color:${t.type_input === 'manual' ? T.info : T.accentGold}">${t.type_input || 'by approval'}</span></td>
          <td>🏢 ${getOutletName(t.from_outlet_id)}</td>
          <td>🏢 ${getOutletName(t.to_outlet_id)}</td>
          <td><b>${t.item_name}</b></td>
          <td>${t.qty}</td>
          <td>${t.unit}</td>
          <td><span style="font-weight: bold; color: ${t.status === 'Terkirim' ? T.success : T.accentGold}">${t.status}</span></td>
          <td>${t.notes}</td>
          <td><span style="font-weight: bold; color: ${t.is_returned ? T.success : T.danger}">${t.is_returned ? 'Sudah Kembali' : 'Belum Kembali'}</span></td>
        </tr>
      `).join('');
    } else if (activeSubTab === 'stok_rusak') {
      tableRows = getFilteredRusak().map(m => `
        <tr>
          <td>${m.date}</td>
          <td>${m.created_by || 'Admin'}</td>
          <td><span style="text-transform:uppercase; font-size:10px; font-weight:bold; color:${m.type_input === 'manual' ? T.info : T.accentGold}">${m.type_input || 'by approval'}</span></td>
          <td>🏢 ${getOutletName(m.outlet_id)}</td>
          <td><b>${m.item_name}</b></td>
          <td style="color: ${T.danger}; font-weight: bold;">-${m.qty}</td>
          <td>${m.unit}</td>
          <td>${m.notes}</td>
        </tr>
      `).join('');
    } else if (activeSubTab === 'stok_opname_system') {
      tableRows = calculateStockOpnameBySystem().map(op => `
        <tr>
          <td>${op.date}</td>
          <td>🏢 ${op.outletName}</td>
          <td><b>${op.itemName}</b></td>
          <td>${op.unit}</td>
          <td>${op.stokAwal}</td>
          <td style="color: ${T.info}; font-weight: bold;">+${op.stokMasuk}</td>
          <td style="color: ${T.danger}; font-weight: bold;">-${op.stokKeluar}</td>
          <td style="color: ${T.success}; font-weight: bold;">+${op.transferIn}</td>
          <td style="color: ${T.danger}; font-weight: bold;">-${op.transferOut}</td>
          <td style="color: ${T.danger}; font-weight: bold;">-${op.stokRusak}</td>
          <td style="color: ${T.success}; font-weight: bold; font-size: 1.05em;">${op.sisaStokSystem.toFixed(1)} ${op.unit}</td>
        </tr>
      `).join('');
    } else if (activeSubTab === 'stok_opname_report' || activeSubTab === 'stok_opname') {
      tableRows = getFilteredOpname().map(op => {
        const isDefisit = (op.stok_fisik || 0) < sSistem;
        const activePrice = getItemPriceFromStokMasuk(op.item_name) || op.harga_satuan || 0;
        const dendaVal = isDefisit ? Math.abs(sSistem - (op.stok_fisik || 0)) * activePrice : 0;
        return `
          <tr>
            <td>${op.date}</td>
            <td>${op.created_by || 'Admin'} (${op.type_input || 'manual'})</td>
            <td>🏢 ${getOutletName(op.outlet_id)}</td>
            <td><b>${op.item_name}</b></td>
            <td>${op.stok_awal || 0}</td>
            <td>+${op.stok_masuk || 0}</td>
            <td>-${op.stok_keluar || 0}</td>
            <td>+${op.transfer_masuk || 0}</td>
            <td>-${op.transfer_keluar || 0}</td>
            <td>-${op.stok_rusak || 0}</td>
            <td><b>${sSistem}</b></td>
            <td style="color: ${T.success}; font-weight: bold;">${op.stok_fisik || 0}</td>
            <td><span style="font-weight: bold; color: ${sSistem === op.stok_fisik ? T.success : sSistem > op.stok_fisik ? T.accentGold : T.danger}">${statusText} (${diffVal > 0 ? `+${diffVal}` : diffVal === 0 ? '0' : `-${Math.abs(diffVal)}`})</span></td>
            <td>${formatRupiah(activePrice)}</td>
            <td style="font-weight: bold; color: ${dendaVal > 0 ? T.danger : T.txtMuted}">${dendaVal > 0 ? formatRupiah(dendaVal) : '-'}</td>
            <td>${op.notes || '-'}</td>
          </tr>
        `;
      }).join('');
    } else if (activeSubTab === 'perbandingan_harga') {
      tableRows = getFilteredPriceComparison().map(item => {
        const prices = outlets.map(o => item.prices?.[o.id] || 0);
        const maxP = Math.max(...prices);
        const priceCells = outlets.map(o => {
          const prc = item.prices?.[o.id] || 0;
          const isHighest = prc === maxP && maxP > 0 && prices.some(p => p < maxP);
          return `<td style="${isHighest ? 'color: ${T.danger}; font-weight: bold; background-color: #fee2e2;' : ''}">${formatRupiah(prc)}${isHighest ? ' 🔴 (Tertinggi)' : ''}</td>`;
        }).join('');
        return `
          <tr>
            <td>${item.date}</td>
            <td><b>${item.item_name}</b></td>
            <td>${item.category || 'Bahan Baku'}</td>
            <td>${item.unit || 'kg'}</td>
            ${priceCells}
            <td>${item.notes || '-'}</td>
          </tr>
        `;
      }).join('');
    }

    printWindow.document.write(`
      <html>
        <head>
          <title>${pdfFilename}</title>
          <style>
            body { font-family: sans-serif; padding: 20px; color: ${T.txtPrimary}; }
            h2 { color: ${T.txtPrimary}; margin-bottom: 4px; }
            p { font-size: 14px; color: ${T.txtMuted}; margin-top: 0; }
            table { width: 100%; border-collapse: collapse; margin-top: 16px; }
            th, td { border: 1px solid ${T.border}; padding: 8px; text-align: left; font-size: 11px; }
            th { background-color: #f1f5f9; text-transform: uppercase; font-size: 10px; }
          </style>
        </head>
        <body>
          <h2>Laporan Logistik Restoran (${tabTitle})</h2>
          <p>Outlet: ${outletStr} | Tanggal Cetak: ${new Date().toLocaleDateString('id-ID')}</p>
          <table>
            <thead>
              ${activeSubTab === 'stok_masuk' ? `
                <tr>
                  <th>Tanggal</th>
                  <th>Outlet</th>
                  <th>Dibuat Oleh</th>
                  <th>Nama Item</th>
                  <th>Supplier</th>
                  <th>Qty</th>
                  <th>Satuan</th>
                  <th>Harga/Unit</th>
                  <th>Total Harga</th>
                  <th>Tipe Input</th>
                </tr>
              ` : activeSubTab === 'stok_keluar' ? `
                <tr>
                  <th>No. Struk</th>
                  <th>Tanggal & Waktu</th>
                  <th>Outlet</th>
                  <th>Nama Item</th>
                  <th>Tipe Item</th>
                  <th>Qty Terpotong</th>
                  <th>Satuan</th>
                  <th>HPP Terpotong</th>
                  <th>Status</th>
                </tr>
              ` : activeSubTab === 'transfer_stok' ? `
                <tr>
                  <th>Tanggal</th>
                  <th>Dibuat Oleh</th>
                  <th>Tipe Input</th>
                  <th>Dari Outlet</th>
                  <th>Ke Outlet</th>
                  <th>Nama Item</th>
                  <th>Qty</th>
                  <th>Satuan</th>
                  <th>Status</th>
                  <th>Catatan</th>
                  <th>Pengembalian</th>
                </tr>
              ` : activeSubTab === 'stok_rusak' ? `
                <tr>
                  <th>Tanggal</th>
                  <th>Dibuat Oleh</th>
                  <th>Tipe Input</th>
                  <th>Outlet</th>
                  <th>Nama Item</th>
                  <th>Qty Rusak</th>
                  <th>Satuan</th>
                  <th>Alasan</th>
                </tr>
              ` : activeSubTab === 'stok_opname' ? `
                <tr>
                  <th>Tanggal Audit</th>
                  <th>Dibuat Oleh (Tipe)</th>
                  <th>Outlet</th>
                  <th>Nama Item</th>
                  <th>Stok Awal</th>
                  <th>Stok Masuk</th>
                  <th>Stok Keluar</th>
                  <th>Trans. Masuk</th>
                  <th>Trans. Keluar</th>
                  <th>Stok Rusak</th>
                  <th>Sistem</th>
                  <th>Fisik</th>
                  <th>Analisis Selisih</th>
                  <th>Harga Satuan</th>
                  <th>Denda Stok</th>
                  <th>Catatan</th>
                </tr>
              ` : `
                <tr>
                  <th>Tanggal</th>
                  <th>Nama Item</th>
                  <th>Kategori</th>
                  <th>Satuan</th>
                  ${outlets.map(o => `<th>Harga ${o.name}</th>`).join('')}
                  <th>Catatan</th>
                </tr>
              `}
            </thead>
            <tbody>
              ${tableRows}
            </tbody>
          </table>
          <script>window.print();</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', background: T.pageBg, color: T.txtPrimary, transition: 'background 0.25s ease' }} className="animate-fade-in">
      
      {/* Title Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '1.6rem', fontWeight: '900', color: T.txtPrimary, letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Package size={28} color={T.accentGold} />
            <span>Pusat Kontrol Logistik &amp; Stok (Logistics &amp; Supply)</span>
          </h2>
          <p style={{ color: T.txtSecondary, fontSize: '0.875rem', marginTop: '4px' }}>
            Pantau barang masuk supplier, pemotongan stok kasir otomatis, transfer antarcabang, barang rusak (waste), dan stock opname fisik.
          </p>
        </div>

        {/* Global Action Add Button for Active SubTab */}
        {activeSubTab !== 'stok_keluar' && activeSubTab !== 'stok_rusak' && (
          <button 
            onClick={() => {
              if (activeSubTab === 'perbandingan_harga') {
                handleOpenAddPriceModal();
              } else if (activeSubTab === 'stock_opname' || activeSubTab === 'opname') {
                setShowAddModal('opname');
              } else {
                setShowAddModal(activeSubTab.replace('stok_', ''));
              }
            }} 
            className="btn-primary" 
            style={{ padding: '10px 18px', display: 'flex', gap: '8px', fontSize: '0.85rem' }}
          >
            <Plus size={16} />
            <span>
              {activeSubTab === 'stok_masuk' ? 'Tambah Logistik Manual' : 
               activeSubTab === 'transfer_stok' ? 'Kirim Transfer Stok' :
               activeSubTab === 'perbandingan_harga' ? 'Tambah Perbandingan Harga' : 'Mulai Audit Opname'}
            </span>
          </button>
        )}
      </div>

      {/* FILTER BAR PANEL (Double Calendar / Rentang Waktu, Outlet Dropdown, Column Filters) - POSITIONED AT THE TOP */}
      <div className="glass-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '16px' }}>
          
          {/* Double calendar selector + Outlet multi-select (Dark Themed) */}
          <DoubleCalendarPicker
            startDate={logStartDate}
            endDate={logEndDate}
            datePreset={logDatePreset}
            setStartDate={setLogStartDate}
            setEndDate={setLogEndDate}
            setDatePreset={setLogDatePreset}
            showPopover={logShowCalendarPopover}
            setShowPopover={setLogShowCalendarPopover}
            outlets={outlets}
            selectedOutletIds={logSelectedOutletIds}
            onToggleOutlet={handleToggleLogOutlet}
            onToggleAllOutlets={() => handleToggleLogOutlet('ALL')}
            showOutletDropdown={logShowOutletDropdown}
            setShowOutletDropdown={setLogShowOutletDropdown}
            selectedBranch={selectedBranch}
          />

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            
            {/* Column visibility filter toggle */}
            <button
              onClick={() => {
                setLogShowColumnDropdown(!logShowColumnDropdown);
                setLogShowCalendarPopover(false);
                setLogShowOutletDropdown(false);
              }}
              className="btn-secondary"
              style={{
                fontSize: '0.8rem',
                padding: '8px 12px',
                borderColor: logShowColumnDropdown ? T.accentGold : T.border,
                background: logShowColumnDropdown ? 'rgba(251, 191, 36, 0.2)' : T.border,
                color: logShowColumnDropdown ? T.accentGold : T.txtPrimary,
                height: '40px'
              }}
            >
              <SlidersHorizontal size={15} color={T.accentGold} />
              <span>👁️ Filter Kolom Ditampilkan</span>
              <ChevronDown size={14} style={{ transform: logShowColumnDropdown ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
            </button>

            {/* Export options */}
            <button onClick={handleDownloadExcel} className="btn-secondary" style={{ padding: '8px 12px', fontSize: '0.8rem', color: T.success, borderColor: 'rgba(52, 211, 153, 0.3)', height: '40px' }}>
              <FileSpreadsheet size={15} />
              <span>Download Excel</span>
            </button>

            <button onClick={handleDownloadPDF} className="btn-secondary" style={{ padding: '8px 12px', fontSize: '0.8rem', color: T.danger, borderColor: 'rgba(251, 113, 133, 0.3)', height: '40px' }}>
              <Printer size={15} />
              <span>Download PDF</span>
            </button>
          </div>
        </div>

        {/* COLUMN VISIBILITY PANEL */}
        {logShowColumnDropdown && (
          <div className="glass-card animate-fade-in" style={{ padding: '16px', border: `1px solid ${T.accentGold}`, background: T.cardBg, display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${T.border}`, paddingBottom: '8px' }}>
              <div style={{ fontWeight: '800', color: T.txtPrimary, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <SlidersHorizontal size={16} color={T.accentGold} />
                <span>Pilih Kolom Tabel yang Ingin Ditampilkan</span>
              </div>
              <button onClick={() => setLogShowColumnDropdown(false)} style={{ background: 'none', border: 'none', color: T.txtSecondary, cursor: 'pointer', fontWeight: '800', fontSize: '0.9rem' }}>
                ✕ Tutup
              </button>
            </div>
            
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', background: T.cardBg2, padding: '12px', borderRadius: '8px', border: `1px solid ${T.border}` }}>
              {Object.keys(getActiveVisibleCols()).map(key => (
                <label key={key} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  cursor: 'pointer',
                  fontSize: '0.8rem',
                  color: getActiveVisibleCols()[key] ? T.accentGold : T.txtPrimary,
                  fontWeight: getActiveVisibleCols()[key] ? '700' : '500',
                  background: getActiveVisibleCols()[key] ? 'rgba(251, 191, 36, 0.12)' : T.border,
                  padding: '6px 12px',
                  borderRadius: '6px',
                  border: '1px solid',
                  borderColor: getActiveVisibleCols()[key] ? T.accentGold : T.border
                }}>
                  <input
                    type="checkbox"
                    checked={getActiveVisibleCols()[key]}
                    onChange={() => handleToggleColumnVisibility(key)}
                    style={{ accentColor: T.accentGold }}
                  />
                  <span>
                    {key === 'date' ? '📅 Tanggal' : 
                     key === 'outletId' ? '🏢 Outlet' :
                     key === 'createdBy' ? '👤 Dibuat Oleh' :
                     key === 'itemName' ? '📦 Nama Item' :
                     key === 'supplier' ? '🏢 Supplier' :
                     key === 'qty' ? '📊 Kuantitas' :
                     key === 'unit' ? '⚖️ Satuan' :
                     key === 'priceUnit' ? '💵 Harga Satuan' :
                     key === 'totalPrice' ? '💰 Total Harga' :
                     key === 'typeInput' ? '⚡ Tipe Input' :
                     key === 'receiptNo' ? '🎫 No. Struk' :
                     key === 'dateTime' ? '🕒 Waktu' :
                     key === 'outletName' ? '🏢 Outlet' :
                     key === 'itemType' ? '🏷️ Jenis' :
                     key === 'cogsValue' ? '💵 Nilai HPP' :
                     key === 'status' ? '⚡ Status' :
                     key === 'fromOutlet' ? '📤 Outlet Asal' :
                     key === 'toOutlet' ? '📥 Outlet Tujuan' :
                     key === 'loss' ? '💸 Estimasi Rugi' :
                     key === 'systemQty' ? '🖥️ Stok Sistem' :
                     key === 'actualQty' ? '⚖️ Stok Fisik' :
                     key === 'variance' ? '📈 Selisih' :
                     key === 'stokAwal' ? '📦 Stok Awal' :
                     key === 'stokMasuk' ? '📥 Stok Masuk' :
                     key === 'stokKeluar' ? '📤 Stok Keluar' :
                     key === 'transferMasuk' ? '📥 Transfer Penerima' :
                     key === 'transferKeluar' ? '📤 Transfer Pemberi' :
                     key === 'stokRusak' ? '⚠️ Stok Rusak' :
                     key === 'stokFisik' ? '⚖️ Sisa Stok Fisik' :
                     key === 'stokSistem' ? '🖥️ Sisa Stok Sistem' :
                     key === 'selisih' ? '📈 Selisih' :
                     key === 'hargaSatuan' ? '💵 Harga Satuan' :
                     key === 'dendaStok' ? '💸 Denda Stok' :
                     key === 'notes' ? '📝 Catatan' : key === 'returnStatus' ? '🔄 Analisis Pengembalian' : key}
                  </span>
                </label>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Sub-Tab Navigation Bar — 6 subtab rapi */}
      <div style={{ background: T.cardBg2, padding: '8px', borderRadius: '16px', border: `1px solid ${T.border}`, boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '6px' }}>
          {[
            { id: 'stok_masuk',        label: 'Stok Masuk',                         icon: '📥', color: T.info },
            { id: 'stok_keluar',       label: 'Stok Keluar',                        icon: '📤', color: T.danger },
            { id: 'transfer_stok',     label: 'Transfer Stok',                      icon: '🚚', color: T.accentGold },
            { id: 'stok_rusak',        label: 'Stok Rusak (Waste)',                 icon: '⚠️', color: T.danger },
            { id: 'stok_opname_system',label: 'Opname by Sistem',                   icon: '🤖', color: T.info },
            { id: 'stok_opname',       label: 'Log Opname Audit Fisik',             icon: '📋', color: T.success }
          ].map(tab => {
            const isActive = activeSubTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  if (tab.id !== activeSubTab) {
                    setIsTabLoading(true);
                    setCurrentPage(1);
                    setTimeout(() => setIsTabLoading(false), 300);
                  }
                  setActiveSubTab(tab.id);
                  setLogShowColumnDropdown(false);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  padding: '10px 8px',
                  borderRadius: '10px',
                  border: isActive ? `1.5px solid ${tab.color}` : `1px solid ${T.border}`,
                  background: isActive ? `${tab.color}18` : T.cardBg,
                  color: isActive ? tab.color : T.txtSecondary,
                  fontWeight: isActive ? '800' : '600',
                  fontSize: '0.80rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  boxShadow: isActive ? `0 3px 12px ${tab.color}30` : 'none'
                }}
              >
                <span style={{ fontSize: '0.85rem' }}>{tab.icon}</span>
                <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '130px' }}>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* SPIN LOADING OVERLAY */}
      {isTabLoading && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px', gap: '14px', background: T.cardBg2, borderRadius: '12px', border: `1px solid ${T.border}` }}>
          <div style={{
            width: '32px', height: '32px',
            border: `3px solid ${T.border}`,
            borderTop: `3px solid ${T.accentGold}`,
            borderRadius: '50%',
            animation: 'spin 0.7s linear infinite'
          }} />
          <span style={{ color: T.txtSecondary, fontWeight: '700', fontSize: '0.9rem' }}>Memuat data log...</span>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}

      {/* RENDER ACTIVE TAB TABLE */}
      {!isTabLoading && <div className="glass-card" style={{ padding: '24px', background: T.cardBg2, border: `1px solid ${T.border}`, borderRadius: '12px' }}>
        
        {/* SUBTAB 1: STOK MASUK */}
        {activeSubTab === 'stok_masuk' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: '800', color: T.txtPrimary, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ArrowDownRight size={18} color={T.info} />
              <span>Log Mutasi Masuk (Stock Inflow Receivings)</span>
            </h3>
            
            <div style={{ overflowX: 'auto', border: `1px solid ${T.border}`, borderRadius: '10px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.86rem' }}>
                <thead>
                  <tr style={{ background: T.cardBg2, borderBottom: `2px solid ${T.border}`, color: T.txtSecondary, textAlign: 'left' }}>
                    <th style={{ padding: '14px 16px', fontWeight: '800', width: '160px' }}>TANGGAL</th>
                    <th style={{ padding: '14px 16px', fontWeight: '800', width: '150px' }}>NAMA OUTLET</th>
                    <th style={{ padding: '14px 16px', fontWeight: '800' }}>NO LAPORAN</th>
                    <th style={{ padding: '14px 16px', fontWeight: '800', width: '130px' }}>PENGAJU</th>
                    <th style={{ padding: '14px 16px', fontWeight: '800', textAlign: 'center', width: '150px' }}>STATUS</th>
                    <th style={{ padding: '14px 16px', fontWeight: '800', textAlign: 'right', width: '150px' }}>AKSI</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const filteredMasuk = getFilteredMasuk();
                    const paginatedMasuk = filteredMasuk.slice((currentPage - 1) * pageSize, currentPage * pageSize);

                    if (paginatedMasuk.length === 0) {
                      return (
                        <tr>
                          <td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: T.txtSecondary, fontSize: '0.85rem' }}>
                            📭 Tidak ada log stok masuk untuk outlet / tanggal terpilih.
                          </td>
                        </tr>
                      );
                    }

                    return paginatedMasuk.map(m => {
                      const isDone = m.status === 'Done' || m.status === 'Approved' || m.status === 'approved' || m.status === 'ok' || m.approval_status === 'Done';
                      const isWebAdminInput = m.type_input === 'manual' || m.type_input === 'by laporan keuangan (ACC)';

                      return (
                        <tr key={m.id} style={{ borderBottom: `1px solid ${T.border}`, transition: 'background 0.15s' }} className="hover:bg-slate-800/50">
                          {/* 1. TANGGAL */}
                          <td style={{ padding: '14px 16px', color: T.txtPrimary, fontWeight: '600' }}>
                            <div>{m.date}</div>
                            <div style={{ fontSize: '0.70rem', color: T.txtMuted, marginTop: '2px' }}>{m.time || ''}</div>
                          </td>

                          {/* 2. NAMA OUTLET */}
                          <td style={{ padding: '14px 16px' }}>
                            <span style={{ fontSize: '0.82rem', fontWeight: '700', color: T.txtPrimary, display: 'flex', alignItems: 'center', gap: '5px' }}>
                              🏢 {getOutletName(m.outlet_id)}
                            </span>
                          </td>

                          {/* 2. NO LAPORAN */}
                          <td style={{ padding: '14px 16px' }}>
                            <div style={{ color: T.info, fontWeight: '900', fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span>{m.report_no || m.id}</span>
                              <Eye size={14} color={T.info} />
                            </div>
                            <div style={{ fontSize: '0.74rem', color: T.txtSecondary, marginTop: '2px' }}>
                              Bahan: <strong style={{ color: T.txtPrimary }}>{m.item_name}</strong> &bull; Qty: <strong style={{ color: T.success }}>+{m.qty} {m.unit}</strong> &bull; Total: <strong style={{ color: T.info }}>{formatRupiah(m.total_price || (m.qty * (m.price_unit || 0)))}</strong>
                            </div>
                          </td>

                          {/* 3. PENGAJU */}
                          <td style={{ padding: '14px 16px' }}>
                            <span style={{
                              padding: '4px 10px',
                              borderRadius: '6px',
                              fontSize: '0.78rem',
                              fontWeight: '800',
                              background: isWebAdminInput ? 'rgba(56, 189, 248, 0.15)' : 'rgba(99, 102, 241, 0.15)',
                              color: isWebAdminInput ? T.info : T.info,
                              border: isWebAdminInput ? `1px solid ${T.info}` : `1px solid ${T.info}`
                            }}>
                              {isWebAdminInput ? '👤 Admin' : '📱 POS Kasir'}
                            </span>
                            <div style={{ fontSize: '0.72rem', color: T.txtSecondary, marginTop: '4px' }}>{m.created_by || 'Admin Logistik'}</div>
                          </td>

                          {/* 4. STATUS */}
                          <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); if (!isDone) handleApproveMasukRecord(m); else alert('Status sudah Done (Disetujui). Klik Edit untuk mengubah.'); }}
                              style={{
                                padding: '6px 12px',
                                borderRadius: '8px',
                                background: isDone ? 'rgba(34, 197, 94, 0.15)' : 'rgba(245, 158, 11, 0.2)',
                                border: `1px solid ${isDone ? `${T.success}` : T.accentGold}`,
                                color: isDone ? T.success : T.accentGold,
                                fontWeight: '900',
                                fontSize: '0.78rem',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                cursor: isDone ? 'default' : 'pointer',
                                transition: 'all 0.2s ease'
                              }}
                              title={isDone ? 'Status sudah Done (Disetujui)' : 'Klik untuk menyetujui (Done) stok masuk ini'}
                            >
                              {isDone ? <CheckSquare size={14} /> : <Clock size={14} />}
                              <span>{isDone ? 'Done (Disetujui)' : '⏳ Pending'}</span>
                            </button>
                          </td>

                          {/* 5. AKSI */}
                          <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                            <button
                              onClick={() => handleDeleteRecord(m.id, 'stok_masuk', m.report_no || m.id)}
                              style={{
                                padding: '6px 10px', background: T.cardBg2, border: '1px solid rgba(244, 63, 94, 0.4)', borderRadius: '6px', color: T.danger, fontWeight: '800', fontSize: '0.78rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px'
                              }}
                              title="Hapus Log Stok Masuk"
                            >
                              <Trash2 size={14} /> Hapus
                            </button>
                          </td>
                        </tr>
                      );
                    });
                  })()}
                </tbody>
              </table>
            </div>

            {/* PAGINATION CONTROLS */}
            <PaginationControls
              currentPage={currentPage}
              totalPages={Math.ceil(getFilteredMasuk().length / pageSize) || 1}
              pageSize={pageSize}
              totalItems={getFilteredMasuk().length}
              onPageChange={setCurrentPage}
              onPageSizeChange={setPageSize}
            />
          </div>
        )}

        {/* SUBTAB 2: STOK KELUAR */}
        {activeSubTab === 'stok_keluar' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: '800', color: T.txtPrimary, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ArrowUpRight size={18} color={T.danger} />
                  <span>Log Mutasi Keluar Penjualan POS (Autoconsumption Stock Deductions)</span>
                </h3>
                <p style={{ fontSize: '0.78rem', color: T.txtSecondary, marginTop: '2px' }}>
                  Pemotongan stok bahan baku otomatis dari transaksi penjualan POS Kasir & penginputan transaksi penjualan manual.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  const todayStr = new Date().toISOString().split('T')[0];
                  setSalesDate(todayStr);
                  setSalesNo(`TRX-${todayStr.replace(/-/g,'')}-${Math.floor(100 + Math.random() * 900)}`);
                  setSalesCreatedBy(userRightsList[0] ? userRightsList[0].name : 'Admin');
                  setSalesOutletId(selectedBranch || (outlets[0] ? outlets[0].id : 1));
                  setSalesStatus('Paid');
                  setSalesPaymentMethod('Cash');
                  const firstProd = masterData.products && masterData.products[0] ? masterData.products[0] : null;
                  setSalesMenuRows([{
                    id: Date.now(),
                    product_id: firstProd ? firstProd.id : 1,
                    product_name: firstProd ? firstProd.name : 'Nasi Goreng Spesial',
                    qty: 1,
                    price: firstProd ? (firstProd.price || 25000) : 25000,
                    total: firstProd ? (firstProd.price || 25000) : 25000
                  }]);
                  setEditingOutflowRecord(null);
                  setShowAddSalesModal(true);
                }}
                style={{
                  padding: '8px 16px', background: `linear-gradient(135deg, ${T.info} 0%, #4f46e5 100%)`,
                  color: T.txtPrimary, border: 'none', borderRadius: '8px',
                  fontSize: '0.82rem', fontWeight: '800', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: '6px',
                  boxShadow: '0 4px 12px rgba(99,102,241,0.3)'
                }}
              >
                <PlusCircle size={15} />
                <span>+ Tambahkan Transaksi Penjualan</span>
              </button>
            </div>
            
            <div style={{ width: '100%', overflowX: 'auto', border: `1px solid ${T.border}`, borderRadius: '10px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.86rem' }}>
                <thead>
                  <tr style={{ background: T.cardBg2, borderBottom: `2px solid ${T.border}`, color: T.txtSecondary, textAlign: 'left' }}>
                    <th style={{ padding: '14px 16px', fontWeight: '800', width: '160px' }}>TANGGAL</th>
                    <th style={{ padding: '14px 16px', fontWeight: '800', width: '150px' }}>NAMA OUTLET</th>
                    <th style={{ padding: '14px 16px', fontWeight: '800' }}>NO TRANSAKSI</th>
                    <th style={{ padding: '14px 16px', fontWeight: '800', width: '130px' }}>PENGAJU</th>
                    <th style={{ padding: '14px 16px', fontWeight: '800', textAlign: 'center', width: '150px' }}>STATUS</th>
                    <th style={{ padding: '14px 16px', fontWeight: '800', textAlign: 'right', width: '170px' }}>AKSI</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const salesList = getFilteredSalesOutflowTransactions();
                    const paginatedSales = salesList.slice((currentPage - 1) * pageSize, currentPage * pageSize);

                    if (paginatedSales.length === 0) {
                      return (
                        <tr>
                          <td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: T.txtSecondary, fontSize: '0.85rem' }}>
                            📭 Tidak ada log mutasi keluar dari penjualan untuk outlet / tanggal terpilih. Klik "+ Tambahkan Transaksi Penjualan" di atas.
                          </td>
                        </tr>
                      );
                    }

                    return paginatedSales.map((tx) => {
                      const isWebAdminInput = tx.type_input === 'manual' || tx.sumber_input === 'web_admin';
                      const isPaid = tx.status === 'Paid' || tx.status === 'Lunas' || tx.status === 'Success' || tx.status === 'Selesai' || tx.isPaid;

                      const itemsSummary = tx.items && tx.items.length > 0
                        ? tx.items.map(i => `${i.name || i.product_name} (x${i.qty || 1})`).join(', ')
                        : 'Produk Penjualan';

                      const ingredientsSummary = tx.deducted_ingredients && tx.deducted_ingredients.length > 0
                        ? tx.deducted_ingredients.map(ing => `${ing.ingredient_name || ing.name}: ${ing.qty} ${ing.unit || 'kg'}`).join(', ')
                        : 'Bahan Baku';

                      return (
                        <tr key={tx.id} style={{ borderBottom: `1px solid ${T.border}`, transition: 'background 0.15s' }} className="hover:bg-slate-800/50">
                          {/* 1. TANGGAL */}
                          <td style={{ padding: '14px 16px', color: T.txtPrimary, fontWeight: '600' }}>
                            <div>{tx.date}</div>
                            <div style={{ fontSize: '0.70rem', color: T.txtMuted, marginTop: '2px' }}>{tx.time || ''}</div>
                          </td>

                          {/* 2. NAMA OUTLET */}
                          <td style={{ padding: '14px 16px' }}>
                            <span style={{ fontSize: '0.82rem', fontWeight: '700', color: T.txtPrimary, display: 'flex', alignItems: 'center', gap: '5px' }}>
                              🏢 {getOutletName(tx.outlet_id)}
                            </span>
                          </td>

                          {/* 3. NO TRANSAKSI */}
                          <td style={{ padding: '14px 16px' }}>
                            <button
                              type="button"
                              onClick={() => setPreviewOutflowModalData(tx)}
                              style={{ background: 'none', border: 'none', padding: 0, color: T.info, fontWeight: '900', fontSize: '0.88rem', cursor: 'pointer', textDecoration: 'underline', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '6px' }}
                              title="Klik untuk melihat pratinjau detail transaksi & bahan baku terpotong"
                            >
                              <span>{tx.receiptNo || tx.id}</span>
                              <Eye size={14} color={T.info} />
                            </button>
                            <div style={{ fontSize: '0.74rem', color: T.txtSecondary, marginTop: '2px' }}>
                              Menu: <strong style={{ color: T.txtPrimary }}>{itemsSummary}</strong>
                            </div>
                            <div style={{ fontSize: '0.72rem', color: T.danger, marginTop: '1px' }}>
                              Bahan Terpotong: <strong>{ingredientsSummary}</strong>
                            </div>
                          </td>

                          {/* 3. PENGAJU */}
                          <td style={{ padding: '14px 16px' }}>
                            <span style={{
                              padding: '4px 10px',
                              borderRadius: '6px',
                              fontSize: '0.78rem',
                              fontWeight: '800',
                              background: isWebAdminInput ? 'rgba(56, 189, 248, 0.15)' : 'rgba(99, 102, 241, 0.15)',
                              color: isWebAdminInput ? T.info : T.info,
                              border: isWebAdminInput ? `1px solid ${T.info}` : `1px solid ${T.info}`
                            }}>
                              {isWebAdminInput ? '👤 Admin' : '📱 POS Kasir'}
                            </span>
                            <div style={{ fontSize: '0.72rem', color: T.txtSecondary, marginTop: '4px' }}>{tx.created_by || 'Kasir'}</div>
                          </td>

                          {/* 4. STATUS */}
                          <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                            <span style={{
                              padding: '6px 12px',
                              borderRadius: '8px',
                              background: isPaid ? 'rgba(34, 197, 94, 0.15)' : 'rgba(245, 158, 11, 0.2)',
                              border: `1px solid ${isPaid ? `${T.success}` : T.accentGold}`,
                              color: isPaid ? T.success : T.accentGold,
                              fontWeight: '900',
                              fontSize: '0.78rem',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px'
                            }}>
                              {isPaid ? <CheckSquare size={14} /> : <Clock size={14} />}
                              <span>{isPaid ? '🟢 Paid' : '⏳ Pending'}</span>
                            </span>
                          </td>

                          {/* 5. AKSI */}
                          <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px' }}>
                              <button
                                onClick={() => handleOpenEditOutflowModal(tx)}
                                style={{ padding: '6px 10px', background: T.cardBg2, border: `1px solid ${T.border}`, borderRadius: '6px', color: T.info, fontWeight: '800', fontSize: '0.78rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                              >
                                <Edit3 size={14} /> Edit
                              </button>

                              <button
                                onClick={() => handleDeleteRecord(tx.id, 'stok_keluar', tx.receiptNo || tx.id)}
                                style={{ padding: '6px 10px', background: T.cardBg2, border: '1px solid rgba(244, 63, 94, 0.4)', borderRadius: '6px', color: T.danger, fontWeight: '800', fontSize: '0.78rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                              >
                                <Trash2 size={14} /> Hapus
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    });
                  })()}
                </tbody>
              </table>
            </div>

            {/* PAGINATION CONTROLS */}
            <PaginationControls
              currentPage={currentPage}
              totalPages={Math.ceil(getFilteredSalesOutflowTransactions().length / pageSize) || 1}
              pageSize={pageSize}
              totalItems={getFilteredSalesOutflowTransactions().length}
              onPageChange={setCurrentPage}
              onPageSizeChange={setPageSize}
            />
          </div>
        )}

        {/* SUBTAB 3: TRANSFER STOK */}
        {activeSubTab === 'transfer_stok' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: '800', color: T.txtPrimary, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Truck size={18} color={T.accentGold} />
              <span>Log Transfer Stok Antar Cabang Restoran</span>
            </h3>
            
            <div style={{ width: '100%', overflowX: 'auto', border: `1px solid ${T.border}`, borderRadius: '10px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.86rem' }}>
                <thead>
                  <tr style={{ background: T.cardBg2, borderBottom: `2px solid ${T.border}`, color: T.txtSecondary, textAlign: 'left' }}>
                    <th style={{ padding: '14px 16px', fontWeight: '800', width: '160px' }}>TANGGAL</th>
                    <th style={{ padding: '14px 16px', fontWeight: '800', width: '220px' }}>NAMA OUTLET</th>
                    <th style={{ padding: '14px 16px', fontWeight: '800' }}>NO LAPORAN</th>
                    <th style={{ padding: '14px 16px', fontWeight: '800', width: '130px' }}>PENGAJU</th>
                    <th style={{ padding: '14px 16px', fontWeight: '800', textAlign: 'center', width: '150px' }}>STATUS</th>
                    <th style={{ padding: '14px 16px', fontWeight: '800', textAlign: 'right', width: '180px' }}>AKSI</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const filteredTransfer = getFilteredTransfer();
                    const paginatedTransfer = filteredTransfer.slice((currentPage - 1) * pageSize, currentPage * pageSize);

                    if (filteredTransfer.length === 0) return (
                      <tr>
                        <td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: T.txtSecondary, fontSize: '0.85rem' }}>
                          📭 Tidak ada log transfer stok untuk outlet terpilih.
                        </td>
                      </tr>
                    );

                    return paginatedTransfer.map(t => {
                      const isApproved = t.status === 'Approved' || t.status === 'Terkirim' || t.status === 'Done' || t.is_approved;
                      const isWebAdminInput = t.type_input === 'manual';

                      return (
                        <tr key={t.id} style={{ borderBottom: `1px solid ${T.border}`, transition: 'background 0.15s' }} className="hover:bg-slate-800/50">
                          {/* 1. TANGGAL */}
                          <td style={{ padding: '14px 16px', color: T.txtPrimary, fontWeight: '600' }}>
                            <div>{t.date}</div>
                            <div style={{ fontSize: '0.70rem', color: T.txtMuted, marginTop: '2px' }}>{t.time || ''}</div>
                          </td>

                          {/* 2. NAMA OUTLET (FROM → TO) */}
                          <td style={{ padding: '14px 16px' }}>
                            <div style={{ fontSize: '0.80rem', fontWeight: '700', color: T.txtPrimary, display: 'flex', flexDirection: 'column', gap: '2px' }}>
                              <span>🔴 {getOutletName(t.from_outlet_id || t.fromOutletId, t.from_outlet_name)}</span>
                              <span style={{ color: T.txtMuted }}>↓</span>
                              <span>🟢 {getOutletName(t.to_outlet_id || t.toOutletId, t.to_outlet_name)}</span>
                            </div>
                          </td>

                          {/* 2. NO LAPORAN */}
                          <td style={{ padding: '14px 16px' }}>
                            <button
                              type="button"
                              onClick={() => setPreviewTransferModalData(t)}
                              style={{ background: 'none', border: 'none', padding: 0, color: T.info, fontWeight: '900', fontSize: '0.88rem', cursor: 'pointer', textDecoration: 'underline', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '6px' }}
                              title="Klik untuk melihat pratinjau detail laporan"
                            >
                              <span>{t.report_no || t.id}</span>
                              <Eye size={14} color={T.info} />
                            </button>
                            <div style={{ fontSize: '0.74rem', color: T.txtSecondary, marginTop: '2px' }}>
                              Item: <strong style={{ color: T.txtPrimary }}>{t.item_name}</strong> &bull; Qty: <strong style={{ color: `${T.info}` }}>{t.qty} {t.unit}</strong>
                            </div>
                          </td>

                          {/* 3. PENGAJU */}
                          <td style={{ padding: '14px 16px' }}>
                            <span style={{
                              padding: '4px 10px',
                              borderRadius: '6px',
                              fontSize: '0.78rem',
                              fontWeight: '800',
                              background: isWebAdminInput ? 'rgba(56, 189, 248, 0.15)' : 'rgba(99, 102, 241, 0.15)',
                              color: isWebAdminInput ? T.info : T.info,
                              border: isWebAdminInput ? `1px solid ${T.info}` : `1px solid ${T.info}`
                            }}>
                              {isWebAdminInput ? '👤 Admin' : '📱 POS Kasir'}
                            </span>
                            <div style={{ fontSize: '0.72rem', color: T.txtSecondary, marginTop: '4px' }}>{t.created_by || t.submitted_by || 'Admin'}</div>
                          </td>

                          {/* 4. STATUS */}
                          <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); if (!isApproved) handleApproveTransferRecord(t); else alert('Status sudah Done (Disetujui).'); }}
                              style={{
                                padding: '6px 12px',
                                borderRadius: '8px',
                                background: isApproved ? 'rgba(34, 197, 94, 0.15)' : 'rgba(245, 158, 11, 0.2)',
                                border: `1px solid ${isApproved ? `${T.success}` : T.accentGold}`,
                                color: isApproved ? T.success : T.accentGold,
                                fontWeight: '900',
                                fontSize: '0.78rem',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                cursor: isApproved ? 'default' : 'pointer',
                                transition: 'all 0.2s ease'
                              }}
                              title={isApproved ? 'Status sudah Done (Disetujui)' : 'Klik untuk menyetujui transfer stok ini'}
                            >
                              {isApproved ? <CheckSquare size={14} /> : <Clock size={14} />}
                              <span>{isApproved ? 'Done (Disetujui)' : '⏳ Pending'}</span>
                            </button>
                          </td>

                          {/* 5. AKSI */}
                          <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px' }}>
                              <button
                                onClick={() => handleOpenEditRecord(t, 'transfer')}
                                style={{ padding: '6px 10px', background: T.cardBg2, border: `1px solid ${T.border}`, borderRadius: '6px', color: T.info, fontWeight: '800', fontSize: '0.78rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                              >
                                <Edit3 size={14} /> Edit
                              </button>

                              {!isApproved && (
                                <button
                                  onClick={() => handleApproveTransferRecord(t)}
                                  style={{ padding: '6px 10px', background: 'rgba(251, 191, 36, 0.2)', border: `1px solid ${T.accentGold}`, borderRadius: '6px', color: T.accentGold, fontWeight: '900', fontSize: '0.78rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                                  title="Setujui Laporan Transfer Stok"
                                >
                                  <CheckCircle size={14} /> ACC
                                </button>
                              )}

                              <button
                                onClick={() => handleDeleteRecord(t.id, 'transfer_stok', t.report_no || t.id)}
                                style={{ padding: '6px 10px', background: T.cardBg2, border: '1px solid rgba(244, 63, 94, 0.4)', borderRadius: '6px', color: T.danger, fontWeight: '800', fontSize: '0.78rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                              >
                                <Trash2 size={14} /> Hapus
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    });
                  })()}
                </tbody>
              </table>
            </div>

            {/* PAGINATION CONTROLS */}
            <PaginationControls
              currentPage={currentPage}
              totalPages={Math.ceil(getFilteredTransfer().length / pageSize) || 1}
              pageSize={pageSize}
              totalItems={getFilteredTransfer().length}
              onPageChange={setCurrentPage}
              onPageSizeChange={setPageSize}
            />
          </div>
        )}



        {/* SUBTAB 4: STOK RUSAK */}
        {activeSubTab === 'stok_rusak' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: '800', color: T.txtPrimary, display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                  <Trash2 size={18} color={T.danger} />
                  <span>Daftar Log Laporan Barang Rusak (Waste & Retur Bahan Baku)</span>
                </h3>
                <p style={{ fontSize: '0.78rem', color: T.txtSecondary, margin: '4px 0 0 0' }}>
                  Pencatatan waste, retur, expired, & kerusakan bahan baku terintegrasi dua arah dengan POS Mobile APK
                </p>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => {
                    const todayStr = new Date().toISOString().split('T')[0];
                    setEditingRecord(null);
                    setRusakDate(todayStr);
                    setRusakNo(`WST-${todayStr.replace(/-/g,'')}-${Math.floor(100 + Math.random() * 900)}`);
                    setRusakCreatedBy(userRightsList[0] ? userRightsList[0].name : 'Admin Logistik');
                    setRusakOutletId(selectedBranch || (outlets[0] ? outlets[0].id : 1));
                    setRusakBatchRows([{ id: Date.now(), item_name: ingredientsList[0] ? ingredientsList[0].name : '', custom_item_name: '', qty: 1, unit: ingredientsList[0] ? ingredientsList[0].unit : 'kg', reason: 'Terlalu kecil', notes: '' }]);
                    setRusakEditingNotes('');
                    setShowAddModal('rusak');
                  }}
                  style={{
                    padding: '8px 16px', background: `linear-gradient(135deg, ${T.danger} 0%, #e11d48 100%)`,
                    color: T.txtPrimary, border: 'none', borderRadius: '8px',
                    fontSize: '0.82rem', fontWeight: '800', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: '6px',
                    boxShadow: '0 4px 12px rgba(244,63,94,0.3)'
                  }}
                >
                  <PlusCircle size={15} />
                  <span>+ Tambah Stok Rusak</span>
                </button>
              </div>
            </div>
            
            <div style={{ width: '100%', overflowX: 'auto', border: `1px solid ${T.border}`, borderRadius: '10px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.86rem' }}>
                <thead>
                  <tr style={{ background: T.cardBg2, borderBottom: `2px solid ${T.border}`, color: T.txtSecondary, textAlign: 'left' }}>
                    <th style={{ padding: '14px 16px', fontWeight: '800', width: '160px' }}>TANGGAL</th>
                    <th style={{ padding: '14px 16px', fontWeight: '800', width: '150px' }}>NAMA OUTLET</th>
                    <th style={{ padding: '14px 16px', fontWeight: '800' }}>NO LAPORAN</th>
                    <th style={{ padding: '14px 16px', fontWeight: '800', width: '130px' }}>PENGAJU</th>
                    <th style={{ padding: '14px 16px', fontWeight: '800', textAlign: 'center', width: '150px' }}>STATUS</th>
                    <th style={{ padding: '14px 16px', fontWeight: '800', textAlign: 'right', width: '170px' }}>AKSI</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const filteredRusak = getFilteredRusak();
                    const paginatedRusak = filteredRusak.slice((currentPage - 1) * pageSize, currentPage * pageSize);

                    if (filteredRusak.length === 0) return (
                      <tr>
                        <td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: T.txtSecondary, fontSize: '0.85rem' }}>
                          📭 Belum ada log laporan barang rusak / waste untuk outlet terpilih. Klik "+ Tambah Stok Rusak" untuk membuat laporan.
                        </td>
                      </tr>
                    );

                    return paginatedRusak.map(m => {
                      const isSent = m.status === 'Terkirim' || m.sent_to_apk;
                      const isApproved = isSent || m.status === 'ok' || m.status === 'approved' || m.status === 'Approved' || m.status === 'ACC' || m.is_approved || m.status === 'Done';
                      const isWebAdminInput = m.sumber_input === 'web_admin' || m.status_keterangan === 'by manual' || m.type_input === 'manual';

                      const rawItems = [...(masterData.damagedGoods || []), ...(masterData.approvedWaste || [])].filter(x => (x.report_no && x.report_no === (m.report_no || m.id)) || x.id === m.id);
                      const uniqueItemsMap = new Map();
                      rawItems.forEach(x => {
                        const itemKey = x.id || `${x.item_name || x.nama_barang}-${x.qty || x.stok_rusak}-${x.unit}`;
                        if (!uniqueItemsMap.has(itemKey)) {
                          uniqueItemsMap.set(itemKey, x);
                        }
                      });
                      const reportItems = Array.from(uniqueItemsMap.values());

                      const displayItemName = reportItems.length > 0
                        ? reportItems.map(r => r.item_name || r.nama_barang || 'Bahan Baku').join(', ')
                        : (m.item_name || m.nama_barang || 'Bahan Baku');
                      const displayQty = reportItems.length > 0
                        ? reportItems.map(r => `${r.qty || r.stok_rusak || 1} ${r.unit || 'kg'}`).join(', ')
                        : `${m.qty || m.stok_rusak || 1} ${m.unit || 'kg'}`;
                      const displayReason = reportItems.length > 0
                        ? reportItems.map(r => r.alasan_rusak || r.reason || r.damage_reason || 'Terlalu kecil').filter((v, i, a) => a.indexOf(v) === i).join(', ')
                        : (m.alasan_rusak || m.reason || m.damage_reason || '-');

                      return (
                        <tr key={m.id} style={{ borderBottom: `1px solid ${T.border}`, transition: 'background 0.15s' }} className="hover:bg-slate-800/50">
                          {/* 1. TANGGAL */}
                          <td style={{ padding: '14px 16px', color: T.txtPrimary, fontWeight: '600' }}>
                            <div>{m.date}</div>
                            <div style={{ fontSize: '0.70rem', color: T.txtMuted, marginTop: '2px' }}>{m.time || ''}</div>
                          </td>

                          {/* 2. NAMA OUTLET */}
                          <td style={{ padding: '14px 16px' }}>
                            <span style={{ fontSize: '0.82rem', fontWeight: '700', color: T.txtPrimary, display: 'flex', alignItems: 'center', gap: '5px' }}>
                              🏢 {getOutletName(m.outlet_id, m.branch_name)}
                            </span>
                          </td>

                          {/* 2. NO LAPORAN */}
                          <td style={{ padding: '14px 16px' }}>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setPreviewWasteModalData(m);
                              }}
                              style={{ background: 'none', border: 'none', padding: 0, color: T.danger, fontWeight: '900', fontSize: '0.88rem', cursor: 'pointer', textDecoration: 'underline', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '6px' }}
                              title="Klik untuk lihat pratinjau rincian barang rusak"
                            >
                              <span>{m.report_no || m.id}</span>
                              <Eye size={14} color={T.danger} />
                            </button>
                            <div style={{ fontSize: '0.74rem', color: T.txtSecondary, marginTop: '2px' }}>
                              Bahan: <strong style={{ color: T.info }}>{displayItemName}</strong> &bull; Qty: <strong style={{ color: T.danger }}>{displayQty}</strong> &bull; Alasan: <strong style={{ color: T.accentGold }}>{displayReason}</strong>
                            </div>
                          </td>

                          {/* 3. PENGAJU */}
                          <td style={{ padding: '14px 16px' }}>
                            <span style={{
                              padding: '4px 10px',
                              borderRadius: '6px',
                              fontSize: '0.78rem',
                              fontWeight: '800',
                              background: isWebAdminInput ? 'rgba(56, 189, 248, 0.15)' : 'rgba(99, 102, 241, 0.15)',
                              color: isWebAdminInput ? T.info : T.info,
                              border: isWebAdminInput ? `1px solid ${T.info}` : `1px solid ${T.info}`
                            }}>
                              {isWebAdminInput ? '👤 Admin' : '📱 POS Kasir'}
                            </span>
                            <div style={{ fontSize: '0.72rem', color: T.txtSecondary, marginTop: '4px' }}>{m.input_by || m.submitted_by || m.created_by || 'Admin Logistik'}</div>
                          </td>

                          {/* 4. STATUS */}
                          <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); if (!isApproved) handleApproveWasteRecord(m); else alert('Status sudah Done (Disetujui).'); }}
                              style={{
                                padding: '6px 12px',
                                borderRadius: '8px',
                                background: isApproved ? 'rgba(34, 197, 94, 0.15)' : 'rgba(245, 158, 11, 0.2)',
                                border: `1px solid ${isApproved ? `${T.success}` : T.accentGold}`,
                                color: isApproved ? T.success : T.accentGold,
                                fontWeight: '900',
                                fontSize: '0.78rem',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                cursor: isApproved ? 'default' : 'pointer',
                                transition: 'all 0.2s ease'
                              }}
                              title={isApproved ? 'Status sudah Done (Disetujui)' : 'Klik untuk menyetujui (Done) laporan barang rusak ini'}
                            >
                              {isApproved ? <CheckSquare size={14} /> : <Clock size={14} />}
                              <span>{isApproved ? 'Done (Disetujui)' : '⏳ Pending'}</span>
                            </button>
                          </td>

                          {/* 5. AKSI */}
                          <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px' }}>
                              <button
                                onClick={() => handleOpenEditRecord(m, 'waste')}
                                style={{ padding: '6px 10px', background: T.cardBg2, border: `1px solid ${T.border}`, borderRadius: '6px', color: T.info, fontWeight: '800', fontSize: '0.78rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                              >
                                <Edit3 size={14} /> Edit
                              </button>

                              <button
                                onClick={() => handleDeleteRecord(m.id, 'stok_rusak', m.report_no || m.id)}
                                style={{ padding: '6px 10px', background: T.cardBg2, border: '1px solid rgba(244, 63, 94, 0.4)', borderRadius: '6px', color: T.danger, fontWeight: '800', fontSize: '0.78rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                              >
                                <Trash2 size={14} /> Hapus
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    });
                  })()}
                </tbody>
              </table>
            </div>

            {/* PAGINATION CONTROLS */}
            <PaginationControls
              currentPage={currentPage}
              totalPages={Math.ceil(getFilteredRusak().length / pageSize) || 1}
              pageSize={pageSize}
              totalItems={getFilteredRusak().length}
              onPageChange={setCurrentPage}
              onPageSizeChange={setPageSize}
            />
          </div>
        )}

        {/* SUBTAB: STOK OPNAME (HASIL AUDIT FISIK INVENTORIS) */}
        {(activeSubTab === 'stok_opname_report' || activeSubTab === 'stok_opname_system' || activeSubTab === 'stok_opname') && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: '800', color: T.txtPrimary, display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                <CheckSquare size={18} color={T.success} />
                <span>Log Stock Opname (Hasil Audit Fisik Inventoris)</span>
              </h3>
              
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                {/* FILTER DIBUAT OLEH (BY OUTLET / BY KASIR) */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: T.cardBg, padding: '4px 10px', borderRadius: '10px', border: `1px solid ${T.border}` }}>
                  <span style={{ fontSize: '0.78rem', fontWeight: '800', color: T.txtSecondary }}>Filter Dibuat Oleh:</span>
                  <select
                    value={opnameCreatorFilter}
                    onChange={e => setOpnameCreatorFilter(e.target.value)}
                    style={{ padding: '6px 10px', background: T.cardBg2, border: `1px solid ${T.border}`, borderRadius: '8px', color: T.txtPrimary, fontSize: '0.80rem', fontWeight: '800', cursor: 'pointer' }}
                  >
                    <option value="ALL">🌐 Semua (All Makers)</option>
                    <option value="by_kasir">📱 By Kasir (Mobile POS)</option>
                    <option value="by_outlet">🏢 By Outlet (Web Based)</option>
                  </select>
                </div>

                {/* Total Denda Hari Ini (Per Hari) */}
                <div style={{ background: 'rgba(244, 63, 94, 0.15)', border: '1px solid rgba(244, 63, 94, 0.3)', padding: '6px 14px', borderRadius: '10px', color: T.danger, fontSize: '0.8rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>📅 Denda Hari Ini:</span>
                  <span style={{ fontSize: '0.9rem', color: T.txtPrimary }}>
                    {formatRupiah(
                      getFilteredOpname().reduce((acc, op) => {
                        const todayStr = new Date().toISOString().split('T')[0];
                        if (op.date !== todayStr) return acc;
                        const autoSalesKeluar = getAutoSalesOutflowForIngredient(op.item_name, op.outlet_id);
                        const autoWasteQty = getAutoWasteForIngredient(op.item_name, op.outlet_id, op.date);
                        const currentStokKeluar = (op.status === 'ACC' || op.status === 'ok' || op.status === 'approved') 
                          ? (op.stok_keluar !== undefined ? op.stok_keluar : autoSalesKeluar) 
                          : (op.stok_keluar || autoSalesKeluar);
                        const currentStokRusak = (op.stok_rusak !== undefined && op.stok_rusak > 0) ? op.stok_rusak : autoWasteQty;

                        const sSistem = (op.stok_awal || 0) + (op.stok_masuk || 0) + (op.transfer_masuk || 0) - (currentStokKeluar + currentStokRusak + (op.transfer_keluar || 0));
                        const isDefisit = (op.stok_fisik || 0) < sSistem;
                        const activePrice = getItemPriceFromStokMasuk(op.item_name) || op.harga_satuan || 0;
                        const dendaVal = isDefisit ? Math.abs(sSistem - (op.stok_fisik || 0)) * activePrice : 0;
                        return acc + dendaVal;
                      }, 0)
                    )}
                  </span>
                </div>

                {/* Total Denda Per Stok (Filter) */}
                <div style={{ background: 'rgba(56, 189, 248, 0.15)', border: '1px solid rgba(56, 189, 248, 0.3)', padding: '6px 14px', borderRadius: '10px', color: T.info, fontSize: '0.8rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>💸 Total Denda Per Stok (Filter):</span>
                  <span style={{ fontSize: '0.9rem', color: T.txtPrimary }}>
                    {formatRupiah(
                      getFilteredOpname().reduce((acc, op) => {
                        const autoSalesKeluar = getAutoSalesOutflowForIngredient(op.item_name, op.outlet_id);
                        const autoWasteQty = getAutoWasteForIngredient(op.item_name, op.outlet_id, op.date);
                        const currentStokKeluar = (op.status === 'ACC' || op.status === 'ok' || op.status === 'approved') 
                          ? (op.stok_keluar !== undefined ? op.stok_keluar : autoSalesKeluar) 
                          : (op.stok_keluar || autoSalesKeluar);
                        const currentStokRusak = (op.stok_rusak !== undefined && op.stok_rusak > 0) ? op.stok_rusak : autoWasteQty;

                        const sSistem = (op.stok_awal || 0) + (op.stok_masuk || 0) + (op.transfer_masuk || 0) - (currentStokKeluar + currentStokRusak + (op.transfer_keluar || 0));
                        const isDefisit = (op.stok_fisik || 0) < sSistem;
                        const activePrice = getItemPriceFromStokMasuk(op.item_name) || op.harga_satuan || 0;
                        const dendaVal = isDefisit ? Math.abs(sSistem - (op.stok_fisik || 0)) * activePrice : 0;
                        return acc + dendaVal;
                      }, 0)
                    )}
                  </span>
                </div>
              </div>
            </div>
            
            <div style={{ overflowX: 'auto', border: `1px solid ${T.border}`, borderRadius: '10px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.86rem' }}>
                <thead>
                  <tr style={{ background: T.cardBg2, borderBottom: `2px solid ${T.border}`, color: T.txtSecondary, textAlign: 'left' }}>
                    <th style={{ padding: '14px 16px', fontWeight: '800', width: '160px' }}>TANGGAL</th>
                    <th style={{ padding: '14px 16px', fontWeight: '800', width: '150px' }}>NAMA OUTLET</th>
                    <th style={{ padding: '14px 16px', fontWeight: '800' }}>NO LAPORAN</th>
                    <th style={{ padding: '14px 16px', fontWeight: '800', width: '160px' }}>PENGAJU</th>
                    <th style={{ padding: '14px 16px', fontWeight: '800', textAlign: 'center', width: '140px' }}>STATUS</th>
                    <th style={{ padding: '14px 16px', fontWeight: '800', textAlign: 'right', width: '170px' }}>AKSI</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const filteredOpname = getFilteredOpname();
                    const paginatedOpname = filteredOpname.slice((currentPage - 1) * pageSize, currentPage * pageSize);

                    if (filteredOpname.length === 0) return (
                      <tr>
                        <td colSpan={6} style={{ padding: '30px', textAlign: 'center', color: T.txtMuted }}>
                          Tidak ada log stock opname untuk filter terpilih.
                        </td>
                      </tr>
                    );

                    return paginatedOpname.map(op => {
                      const reportNo = op.report_no || op.id || 'OPN-LOG';
                      const isKasir = (op.type_input && op.type_input.toLowerCase().includes('mobile')) || (op.submitted_by && !op.created_by) || ((op.created_by || '').toLowerCase().includes('kasir'));
                      const makerName = op.created_by || op.submitted_by || 'Admin';
                      const outletName = getOutletName(op.outlet_id);
                      const isApproved = op.status === 'ACC' || op.status === 'ok' || op.status === 'approved' || op.status === 'Approved' || op.status === 'Done';

                      return (
                        <tr key={op.id} style={{ borderBottom: `1px solid ${T.border}`, color: T.txtPrimary, transition: 'background 0.15s' }} className="hover:bg-slate-800/50">
                          {/* 1. TANGGAL */}
                          <td style={{ padding: '14px 16px', color: T.txtPrimary, fontWeight: '600' }}>
                            <div>{op.date}</div>
                            <div style={{ fontSize: '0.70rem', color: T.txtMuted, marginTop: '2px' }}>{op.time || ''}</div>
                          </td>

                          {/* 2. NAMA OUTLET */}
                          <td style={{ padding: '14px 16px' }}>
                            <span style={{ fontSize: '0.82rem', fontWeight: '700', color: T.txtPrimary, display: 'flex', alignItems: 'center', gap: '5px' }}>
                              🏢 {outletName}
                            </span>
                          </td>

                          {/* 3. NO LAPORAN (KLIK UNTUK PRATINJAU) */}
                          <td style={{ padding: '14px 16px', fontWeight: '900' }}>
                            <button
                              type="button"
                              onClick={() => setPreviewOpnameReportModalData(op)}
                              style={{
                                background: 'none', border: 'none', padding: 0,
                                color: T.success, fontWeight: '900', fontSize: '0.88rem',
                                cursor: 'pointer', textDecoration: 'underline', textAlign: 'left',
                                display: 'flex', alignItems: 'center', gap: '6px'
                              }}
                              title="Klik untuk membuka hasil laporan stok opname secara lengkap"
                            >
                              <span>{reportNo}</span>
                              <Eye size={14} color={T.success} />
                            </button>
                            <div style={{ fontSize: '0.74rem', color: T.txtSecondary, marginTop: '2px' }}>
                              Item: <strong style={{ color: T.txtPrimary }}>{op.item_name || 'Audit Fisik'}</strong>
                            </div>
                          </td>

                          {/* 4. PENGAJU */}
                          <td style={{ padding: '14px 16px' }}>
                            <span style={{
                              padding: '4px 10px',
                              borderRadius: '6px',
                              fontSize: '0.78rem',
                              fontWeight: '800',
                              background: isKasir ? 'rgba(52, 211, 153, 0.15)' : 'rgba(56, 189, 248, 0.15)',
                              color: isKasir ? T.success : T.info,
                              border: `1px solid ${isKasir ? 'rgba(52,211,153,0.4)' : 'rgba(56,189,248,0.4)'}`
                            }}>
                              {isKasir ? '📱 By Kasir' : '🏢 By Outlet'}
                            </span>
                            <div style={{ fontSize: '0.72rem', color: T.txtSecondary, marginTop: '4px' }}>{makerName}</div>
                          </td>

                          {/* 5. STATUS */}
                          <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); if (!isApproved) handleApproveOpnameReport(op); else alert('Laporan sudah Done (ACC / Disetujui).'); }}
                              style={{
                                padding: '6px 12px',
                                borderRadius: '8px',
                                background: isApproved ? 'rgba(34, 197, 94, 0.15)' : 'rgba(245, 158, 11, 0.2)',
                                border: `1px solid ${isApproved ? T.success : T.accentGold}`,
                                color: isApproved ? T.success : T.accentGold,
                                fontWeight: '900',
                                fontSize: '0.78rem',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                cursor: isApproved ? 'default' : 'pointer',
                                transition: 'all 0.2s ease'
                              }}
                              title={isApproved ? 'Laporan sudah Done (ACC)' : 'Klik untuk menyetujui (ACC / Done) laporan opname ini dan kirim ke POS Kasir'}
                            >
                              {isApproved ? <CheckSquare size={14} /> : <Clock size={14} />}
                              <span>{isApproved ? 'Done (ACC)' : '⏳ Pending'}</span>
                            </button>
                          </td>

                          {/* 6. AKSI */}
                          <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                            <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', alignItems: 'center' }}>
                              <button
                                type="button"
                                onClick={() => handleStartEdit(op, 'opname')}
                                style={{ padding: '6px 10px', background: T.cardBg2, border: `1px solid ${T.border}`, borderRadius: '6px', color: T.info, fontWeight: '800', fontSize: '0.78rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                              >
                                <Edit3 size={13} /> Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteRecord(op.id, 'stok_opname', op.report_no || op.id)}
                                style={{ padding: '6px 10px', background: T.cardBg2, border: '1px solid rgba(244, 63, 94, 0.4)', borderRadius: '6px', color: T.danger, fontWeight: '800', fontSize: '0.78rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                              >
                                <Trash2 size={13} /> Hapus
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    });
                  })()}
                </tbody>
              </table>
            </div>

            {/* PAGINATION CONTROLS */}
            <PaginationControls
              currentPage={currentPage}
              totalPages={Math.ceil(getFilteredOpname().length / pageSize) || 1}
              pageSize={pageSize}
              totalItems={getFilteredOpname().length}
              onPageChange={setCurrentPage}
              onPageSizeChange={setPageSize}
            />
          </div>
        )}

      </div>}

      {showAddModal === 'masuk' && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(5px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 110 }}>
          <div className="glass-card animate-fade-in" style={{ padding: '24px', width: '920px', maxHeight: '90vh', overflowY: 'auto', border: `1px solid ${T.info}`, display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${T.border}`, paddingBottom: '12px' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: '900', color: T.txtPrimary, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ArrowDownRight size={22} color={T.info} />
                <span>Tambah Laporan Logistik Masuk Manual</span>
              </h3>
              <button 
                onClick={() => handleAddRow()} 
                className="btn-primary" 
                style={{ padding: '8px 14px', fontSize: '0.78rem', background: T.info, color: T.cardBg2 }}
              >
                <Plus size={14} />
                <span>Tambahkan Item Baru</span>
              </button>
            </div>

            {/* Global Header Inputs (Date, Outlet, Author) */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', background: T.cardBg2, padding: '16px', borderRadius: '8px', border: `1px solid ${T.border}` }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '0.78rem', color: T.txtSecondary, fontWeight: '700' }}>Tanggal Input</label>
                <input 
                  type="date" 
                  value={manualDate} 
                  onChange={e => setManualDate(e.target.value)} 
                  style={{ padding: '8px 12px', background: T.cardBg, border: `1px solid ${T.border}`, borderRadius: '6px', color: T.txtPrimary, fontSize: '0.85rem' }} 
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '0.78rem', color: T.txtSecondary, fontWeight: '700' }}>Nama Outlet Cabang</label>
                <select 
                  value={manualOutletId} 
                  onChange={e => setManualOutletId(Number(e.target.value))} 
                  style={{ padding: '8px 12px', background: T.cardBg, border: `1px solid ${T.border}`, borderRadius: '6px', color: T.txtPrimary, fontSize: '0.85rem', cursor: 'pointer' }}
                >
                  {outlets.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '0.78rem', color: T.txtSecondary, fontWeight: '700' }}>Dibuat Oleh (Petugas)</label>
                <select 
                  value={manualCreatedBy} 
                  onChange={e => setManualCreatedBy(e.target.value)} 
                  style={{ padding: '8px 12px', background: T.cardBg, border: `1px solid ${T.border}`, borderRadius: '6px', color: T.txtPrimary, fontSize: '0.85rem', cursor: 'pointer' }}
                >
                  {userRightsList.map(u => <option key={u.id} value={u.name}>{u.name} ({u.role})</option>)}
                </select>
              </div>
            </div>

            {/* Dynamic Rows Form */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 1fr 1fr 1fr 1fr 40px', gap: '10px', fontSize: '0.75rem', color: T.txtPrimary, fontWeight: '700', textTransform: 'uppercase', paddingBottom: '4px', borderBottom: `1px solid ${T.border}` }}>
                <div>Nama Item / Cari</div>
                <div>Supplier</div>
                <div style={{ textAlign: 'right' }}>Jumlah (Qty)</div>
                <div>Satuan</div>
                <div style={{ textAlign: 'right' }}>Harga Satuan (Rp)</div>
                <div style={{ textAlign: 'right' }}>Total (Rp)</div>
                <div></div>
              </div>

              {manualRows.map((row, idx) => {
                const totalVal = (Number(row.qty) || 0) * (Number(row.priceUnit) || 0);

                return (
                  <div key={idx} style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 1fr 1fr 1fr 1fr 40px', gap: '10px', alignItems: 'center' }}>
                    
                    {/* Autocomplete Input with floating suggestions */}
                    <div style={{ position: 'relative', width: '100%' }}>
                      <input
                        type="text"
                        placeholder="Ketik untuk cari bahan baku..."
                        value={row.searchQuery || ''}
                        onFocus={() => handleUpdateRow(idx, 'showSuggestions', true)}
                        onChange={e => {
                          const q = e.target.value;
                          const updated = [...manualRows];
                          updated[idx].searchQuery = q;
                          updated[idx].showSuggestions = true;
                          const match = ingredientsList.find(i => i.name.toLowerCase() === q.toLowerCase());
                          if (match) {
                            updated[idx].ingredientId = match.id;
                            updated[idx].unit = match.unit || 'kg';
                            if (!updated[idx].priceUnit && match.cost) {
                              updated[idx].priceUnit = match.cost;
                            }
                          } else {
                            updated[idx].ingredientId = '';
                            updated[idx].unit = '';
                          }
                          setManualRows(updated);
                        }}
                        style={{ padding: '8px 10px', background: T.cardBg, border: `1px solid ${T.border}`, borderRadius: '6px', color: T.txtPrimary, fontSize: '0.8rem', width: '100%' }}
                      />

                      {row.showSuggestions && (
                        <div
                          style={{
                            position: 'absolute',
                            top: '100%',
                            left: 0,
                            right: 0,
                            zIndex: 999,
                            background: T.cardBg2,
                            border: `1px solid ${T.info}`,
                            borderRadius: '6px',
                            maxHeight: '180px',
                            overflowY: 'auto',
                            marginTop: '4px',
                            boxShadow: '0 10px 25px rgba(0,0,0,0.5)'
                          }}
                        >
                          {ingredientsList
                            .filter(i => (i.name || '').toLowerCase().includes((row.searchQuery || '').toLowerCase()))
                            .map(ing => (
                              <div
                                key={ing.id}
                                onClick={() => {
                                  const updated = [...manualRows];
                                  updated[idx].searchQuery = ing.name;
                                  updated[idx].ingredientId = ing.id;
                                  updated[idx].unit = ing.unit || 'kg';
                                  if (!updated[idx].priceUnit && ing.cost) {
                                    updated[idx].priceUnit = ing.cost;
                                  }
                                  updated[idx].showSuggestions = false;
                                  setManualRows(updated);
                                }}
                                style={{
                                  padding: '8px 12px',
                                  cursor: 'pointer',
                                  fontSize: '0.80rem',
                                  color: T.txtPrimary,
                                  borderBottom: `1px solid ${T.border}`,
                                  display: 'flex',
                                  justify: 'space-between',
                                  alignItems: 'center'
                                }}
                                onMouseOver={e => e.currentTarget.style.background = T.border}
                                onMouseOut={e => e.currentTarget.style.background = T.cardBg2}
                              >
                                <span style={{ fontWeight: '700' }}>{ing.name}</span>
                                <span style={{ fontSize: '0.70rem', color: T.info, background: 'rgba(56,189,248,0.15)', padding: '2px 6px', borderRadius: '4px' }}>
                                  Satuan: {ing.unit || 'pcs'}
                                </span>
                              </div>
                            ))}
                          {ingredientsList.filter(i => (i.name || '').toLowerCase().includes((row.searchQuery || '').toLowerCase())).length === 0 && (
                            <div style={{ padding: '10px', fontSize: '0.75rem', color: T.txtSecondary, textAlign: 'center' }}>
                              Tidak ada bahan baku yang cocok
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Supplier */}
                    <select
                      value={row.supplierId}
                      onChange={e => handleUpdateRow(idx, 'supplierId', Number(e.target.value))}
                      style={{ padding: '8px', background: T.cardBg, border: `1px solid ${T.border}`, borderRadius: '4px', color: T.txtPrimary, fontSize: '0.8rem', cursor: 'pointer' }}
                    >
                      {suppliersList.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>

                    {/* Qty */}
                    <input
                      type="number"
                      placeholder="Jumlah"
                      value={row.qty}
                      onChange={e => handleUpdateRow(idx, 'qty', e.target.value)}
                      style={{ padding: '8px', background: T.cardBg, border: `1px solid ${T.border}`, borderRadius: '4px', color: T.txtPrimary, fontSize: '0.8rem', textAlign: 'right' }}
                    />

                    {/* Satuan (Auto-filled from selected ingredient) */}
                    <input
                      type="text"
                      readOnly
                      placeholder="Satuan"
                      value={row.unit || ''}
                      style={{ padding: '8px', background: T.cardBg2, border: `1px solid ${T.border}`, borderRadius: '4px', color: row.unit ? T.success : T.txtMuted, fontSize: '0.8rem', fontWeight: '700', textAlign: 'center' }}
                    />

                    {/* Price Unit */}
                    <input
                      type="number"
                      placeholder="Harga"
                      value={row.priceUnit}
                      onChange={e => handleUpdateRow(idx, 'priceUnit', e.target.value)}
                      style={{ padding: '8px', background: T.cardBg, border: `1px solid ${T.border}`, borderRadius: '4px', color: T.txtPrimary, fontSize: '0.8rem', textAlign: 'right' }}
                    />

                    {/* Total Price (Formula) */}
                    <div style={{ padding: '8px', textAlign: 'right', fontWeight: '800', color: T.success, fontSize: '0.82rem' }}>
                      {formatRupiah(totalVal)}
                    </div>

                    {/* Delete button */}
                    <button
                      type="button"
                      onClick={() => handleRemoveRow(idx)}
                      disabled={manualRows.length <= 1}
                      style={{ background: 'none', border: 'none', color: T.danger, cursor: 'pointer', opacity: manualRows.length <= 1 ? 0.3 : 1 }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Bottom calculation & Actions */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: `1px solid ${T.border}`, paddingTop: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
                <span style={{ fontSize: '0.85rem', color: T.txtSecondary, fontWeight: '700' }}>TOTAL NILAI BELANJA LOGISTIK:</span>
                <span style={{ fontSize: '1.4rem', fontWeight: '900', color: T.success }}>{formatRupiah(getManualGrandTotal())}</span>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="button" onClick={() => setShowAddModal(null)} className="btn-secondary" style={{ padding: '10px 18px', fontSize: '0.85rem' }}>Batal</button>
                <button 
                  type="button" 
                  onClick={() => setShowPreviewModal(true)} 
                  className="btn-primary" 
                  style={{ padding: '10px 20px', fontSize: '0.85rem', background: T.info, color: T.cardBg2 }}
                >
                  Simpan Laporan
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* PAPAN PREVIEW MODAL (PRE-CONFIRM BEFORE COMMIT)           */}
      {/* ========================================================= */}
      {showPreviewModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(5px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 120 }}>
          <div className="glass-card animate-fade-in" style={{ padding: '24px', width: '780px', border: `2px solid ${T.success}`, display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <h3 style={{ fontSize: '1.3rem', fontWeight: '900', color: T.txtPrimary, borderBottom: `1px solid ${T.border}`, paddingBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckSquare size={24} color={T.success} />
                <span>Papan Konfirmasi & Preview Laporan Logistik</span>
              </h3>
              <p style={{ color: T.txtPrimary, fontSize: '0.8rem', marginTop: '6px' }}>
                Tinjau kembali daftar logistik masuk yang Anda catat sebelum disimpan permanen ke dalam basis data sistem.
              </p>
            </div>

            {/* Metadata Summary */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px', background: T.cardBg2, padding: '12px 16px', borderRadius: '8px', border: `1px solid ${T.border}`, fontSize: '0.82rem' }}>
              <div><span style={{ color: T.txtSecondary }}>Tanggal Input:</span> <strong style={{ color: T.txtPrimary }}>{manualDate}</strong></div>
              <div><span style={{ color: T.txtSecondary }}>Outlet Cabang:</span> <strong style={{ color: T.txtPrimary }}>{getOutletName(manualOutletId)}</strong></div>
              <div><span style={{ color: T.txtSecondary }}>Dibuat Oleh:</span> <strong style={{ color: T.txtPrimary }}>{manualCreatedBy}</strong></div>
            </div>

            {/* Items Table Preview */}
            <div style={{ border: `1px solid ${T.border}`, borderRadius: '8px', overflow: 'hidden', background: T.cardBg2 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.82rem' }}>
                <thead>
                  <tr style={{ background: T.cardBg, borderBottom: `1px solid ${T.border}`, color: T.txtPrimary, fontWeight: '800' }}>
                    <th style={{ padding: '10px' }}>Nama Item</th>
                    <th style={{ padding: '10px' }}>Supplier</th>
                    <th style={{ padding: '10px', textAlign: 'right' }}>Jumlah</th>
                    <th style={{ padding: '10px' }}>Satuan</th>
                    <th style={{ padding: '10px', textAlign: 'right' }}>Harga Satuan</th>
                    <th style={{ padding: '10px', textAlign: 'right' }}>Total Harga</th>
                  </tr>
                </thead>
                <tbody>
                  {manualRows.filter(row => row.qty && row.priceUnit).map((row, idx) => {
                    const ing = ingredientsList.find(i => i.id === Number(row.ingredientId)) || { name: 'Item', unit: 'pcs' };
                    const sup = suppliersList.find(s => s.id === Number(row.supplierId)) || { name: '-' };
                    const qtyVal = Number(row.qty);
                    const prcVal = Number(row.priceUnit);
                    return (
                      <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', color: T.txtPrimary }}>
                        <td style={{ padding: '10px', fontWeight: '700', color: T.info }}>{ing.name}</td>
                        <td style={{ padding: '10px', color: T.txtPrimary }}>{sup.name}</td>
                        <td style={{ padding: '10px', textAlign: 'right', fontWeight: '700' }}>{qtyVal}</td>
                        <td style={{ padding: '10px', color: T.txtSecondary }}>{ing.unit}</td>
                        <td style={{ padding: '10px', textAlign: 'right' }}>{formatRupiah(prcVal)}</td>
                        <td style={{ padding: '10px', textAlign: 'right', fontWeight: '800', color: T.success }}>{formatRupiah(qtyVal * prcVal)}</td>
                      </tr>
                    );
                  })}
                  <tr style={{ background: T.cardBg, fontWeight: '900', color: T.success }}>
                    <td colspan="5" style={{ padding: '12px 10px' }}>TOTAL KESELURUHAN</td>
                    <td style={{ padding: '12px 10px', textAlign: 'right', fontSize: '0.9rem' }}>{formatRupiah(getManualGrandTotal())}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Preview Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', borderTop: `1px solid ${T.border}`, paddingTop: '16px' }}>
              <button 
                type="button" 
                onClick={() => setShowPreviewModal(false)} 
                className="btn-secondary" 
                style={{ padding: '10px 18px', fontSize: '0.85rem', borderColor: T.accentGold, color: T.accentGold }}
              >
                ✏️ Edit Lagi (Kembali)
              </button>
              <button 
                type="button" 
                onClick={() => handleCommitManualLogistics()} 
                className="btn-primary" 
                style={{ padding: '10px 24px', fontSize: '0.85rem', background: T.success, color: T.cardBg2 }}
              >
                ✓ Simpan & Masukkan database
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* SINGLE RECORD EDIT MODAL                                 */}
      {/* ========================================================= */}
      {editingRecord && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 110 }}>
          <form onSubmit={handleSaveEditRecord} className="glass-card animate-fade-in" style={{ padding: '24px', width: '480px', border: `1px solid ${editType === 'masuk' ? T.info : editType === 'waste' ? T.danger : editType === 'opname' ? T.success : T.accentGold}`, display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: '900', color: T.txtPrimary, borderBottom: `1px solid ${T.border}`, paddingBottom: '12px' }}>
              ✏️ {editType === 'masuk' ? 'Edit Record Logistik Masuk' : editType === 'waste' ? 'Edit Laporan Stok Rusak (Waste)' : editType === 'opname' ? 'Edit Audit Stock Opname' : 'Edit Transfer Stok Antarcabang'}
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '0.75rem', color: T.txtSecondary }}>Tanggal</span>
                <input type="date" value={editDate} onChange={e => setEditDate(e.target.value)} style={{ padding: '8px', background: T.cardBg2, border: `1px solid ${T.border}`, borderRadius: '6px', color: T.txtPrimary, fontSize: '0.82rem' }} />
              </div>

              {(editType === 'masuk' || editType === 'waste' || editType === 'opname') ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ fontSize: '0.75rem', color: T.txtSecondary }}>Restoran Outlet</span>
                  <select value={editOutletId} onChange={e => setEditOutletId(Number(e.target.value))} style={{ padding: '8px', background: T.cardBg2, border: `1px solid ${T.border}`, borderRadius: '6px', color: T.txtPrimary, fontSize: '0.82rem' }}>
                    {outlets.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                  </select>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ fontSize: '0.75rem', color: T.txtSecondary }}>Status Pengiriman</span>
                  <select value={editStatus} onChange={e => setEditStatus(e.target.value)} style={{ padding: '8px', background: T.cardBg2, border: `1px solid ${T.border}`, borderRadius: '6px', color: T.txtPrimary, fontSize: '0.82rem' }}>
                    <option value="Terkirim">Terkirim</option>
                    <option value="Dalam Perjalanan">Dalam Perjalanan</option>
                  </select>
                </div>
              )}
            </div>

            {editType === 'transfer' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ fontSize: '0.75rem', color: T.txtSecondary }}>Dari Outlet Asal</span>
                  <select value={editFromOutletId} onChange={e => setEditFromOutletId(Number(e.target.value))} style={{ padding: '8px', background: T.cardBg2, border: `1px solid ${T.border}`, borderRadius: '6px', color: T.txtPrimary, fontSize: '0.82rem' }}>
                    {outlets.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                  </select>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ fontSize: '0.75rem', color: T.txtSecondary }}>Ke Outlet Tujuan</span>
                  <select value={editToOutletId} onChange={e => setEditToOutletId(Number(e.target.value))} style={{ padding: '8px', background: T.cardBg2, border: `1px solid ${T.border}`, borderRadius: '6px', color: T.txtPrimary, fontSize: '0.82rem' }}>
                    {outlets.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                  </select>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ fontSize: '0.75rem', color: T.txtSecondary }}>Dibuat Oleh</span>
              <input type="text" value={editCreatedBy} onChange={e => setEditCreatedBy(e.target.value)} style={{ padding: '10px', background: T.cardBg2, border: `1px solid ${T.border}`, borderRadius: '6px', color: T.txtPrimary, fontSize: '0.85rem' }} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ fontSize: '0.75rem', color: T.txtSecondary }}>Nama Item / Bahan</span>
              <input type="text" value={editItemName} onChange={e => setEditItemName(e.target.value)} style={{ padding: '10px', background: T.cardBg2, border: `1px solid ${T.border}`, borderRadius: '6px', color: T.txtPrimary, fontSize: '0.85rem' }} />
            </div>

            {editType === 'masuk' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '0.75rem', color: T.txtSecondary }}>Supplier</span>
                <input type="text" value={editSupplier} onChange={e => setEditSupplier(e.target.value)} style={{ padding: '10px', background: T.cardBg2, border: `1px solid ${T.border}`, borderRadius: '6px', color: T.txtPrimary, fontSize: '0.85rem' }} />
              </div>
            )}

            {editType === 'opname' ? (
              <>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ fontSize: '0.75rem', color: T.txtSecondary }}>Satuan</span>
                  <input type="text" value={editUnit} onChange={e => setEditUnit(e.target.value)} style={{ padding: '8px', background: T.cardBg2, border: `1px solid ${T.border}`, borderRadius: '6px', color: T.txtPrimary, fontSize: '0.82rem' }} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span style={{ fontSize: '0.7rem', color: T.txtSecondary }}>Stok Awal</span>
                    <input type="number" value={editStokAwal} onChange={e => setEditStokAwal(e.target.value)} style={{ padding: '8px', background: T.cardBg2, border: `1px solid ${T.border}`, borderRadius: '6px', color: T.txtPrimary, fontSize: '0.8rem' }} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span style={{ fontSize: '0.7rem', color: T.txtSecondary }}>Stok Masuk</span>
                    <input type="number" value={editStokMasuk} onChange={e => setEditStokMasuk(e.target.value)} style={{ padding: '8px', background: T.cardBg2, border: `1px solid ${T.border}`, borderRadius: '6px', color: T.txtPrimary, fontSize: '0.8rem' }} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span style={{ fontSize: '0.7rem', color: T.txtSecondary }}>Stok Keluar</span>
                    <input type="number" value={editStokKeluar} onChange={e => setEditStokKeluar(e.target.value)} style={{ padding: '8px', background: T.cardBg2, border: `1px solid ${T.border}`, borderRadius: '6px', color: T.txtPrimary, fontSize: '0.8rem' }} />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span style={{ fontSize: '0.7rem', color: T.txtSecondary }}>Trans. Masuk</span>
                    <input type="number" value={editTransferMasuk} onChange={e => setEditTransferMasuk(e.target.value)} style={{ padding: '8px', background: T.cardBg2, border: `1px solid ${T.border}`, borderRadius: '6px', color: T.txtPrimary, fontSize: '0.8rem' }} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span style={{ fontSize: '0.7rem', color: T.txtSecondary }}>Trans. Keluar</span>
                    <input type="number" value={editTransferKeluar} onChange={e => setEditTransferKeluar(e.target.value)} style={{ padding: '8px', background: T.cardBg2, border: `1px solid ${T.border}`, borderRadius: '6px', color: T.txtPrimary, fontSize: '0.8rem' }} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span style={{ fontSize: '0.7rem', color: T.txtSecondary }}>Stok Rusak</span>
                    <input type="number" value={editStokRusak} onChange={e => setEditStokRusak(e.target.value)} style={{ padding: '8px', background: T.cardBg2, border: `1px solid ${T.border}`, borderRadius: '6px', color: T.txtPrimary, fontSize: '0.8rem' }} />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span style={{ fontSize: '0.7rem', color: T.success, fontWeight: '700' }}>Sisa Stok Fisik</span>
                    <input type="number" value={editStokFisik} onChange={e => setEditStokFisik(e.target.value)} style={{ padding: '8px', background: T.cardBg2, border: `1px solid ${T.success}`, borderRadius: '6px', color: T.txtPrimary, fontSize: '0.8rem' }} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span style={{ fontSize: '0.7rem', color: T.info, fontWeight: '700' }}>Harga Satuan (Rp)</span>
                    <input type="number" value={editHargaSatuan} onChange={e => setEditHargaSatuan(e.target.value)} style={{ padding: '8px', background: T.cardBg2, border: `1px solid ${T.info}`, borderRadius: '6px', color: T.txtPrimary, fontSize: '0.8rem' }} />
                  </div>
                </div>
              </>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ fontSize: '0.75rem', color: T.txtSecondary }}>Kuantitas (Qty)</span>
                  <input type="number" value={editQty} onChange={e => setEditQty(e.target.value)} style={{ padding: '8px', background: T.cardBg2, border: `1px solid ${T.border}`, borderRadius: '6px', color: T.txtPrimary, fontSize: '0.82rem' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ fontSize: '0.75rem', color: T.txtSecondary }}>Satuan</span>
                  <input type="text" value={editUnit} onChange={e => setEditUnit(e.target.value)} style={{ padding: '8px', background: T.cardBg2, border: `1px solid ${T.border}`, borderRadius: '6px', color: T.txtPrimary, fontSize: '0.82rem' }} />
                </div>
              </div>
            )}

            {editType === 'masuk' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '0.75rem', color: T.txtSecondary }}>Harga Satuan (Rp)</span>
                <input type="number" value={editPriceUnit} onChange={e => setEditPriceUnit(e.target.value)} style={{ padding: '10px', background: T.cardBg2, border: `1px solid ${T.border}`, borderRadius: '6px', color: T.txtPrimary, fontSize: '0.85rem' }} />
              </div>
            )}

            {editType === 'transfer' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 0' }}>
                <input
                  type="checkbox"
                  id="editIsReturned"
                  checked={editIsReturned}
                  onChange={e => setEditIsReturned(e.target.checked)}
                  style={{ width: '16px', height: '16px', accentColor: T.accentGold }}
                />
                <label htmlFor="editIsReturned" style={{ fontSize: '0.82rem', color: T.txtPrimary, fontWeight: '700', cursor: 'pointer' }}>
                  Tandai Sudah Dikembalikan (Retur Lunas)
                </label>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ fontSize: '0.75rem', color: T.txtSecondary }}>Catatan</span>
              <input type="text" value={editNotes} onChange={e => setEditNotes(e.target.value)} style={{ padding: '10px', background: T.cardBg2, border: `1px solid ${T.border}`, borderRadius: '6px', color: T.txtPrimary, fontSize: '0.85rem' }} />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
              <button type="button" onClick={() => setEditingRecord(null)} className="btn-secondary" style={{ padding: '8px 16px', fontSize: '0.8rem' }}>Batal</button>
              <button type="submit" className="btn-primary" style={{ padding: '8px 16px', fontSize: '0.8rem', background: editType === 'masuk' ? T.info : editType === 'waste' ? T.danger : editType === 'opname' ? T.success : T.accentGold, color: T.cardBg2 }}>Simpan Perubahan</button>
            </div>
          </form>
        </div>
      )}

      {/* 2. Modal Kirim Transfer Stok Antar Cabang (SAME AS POS MOBILE 100% - FIT TO PAGE) */}
      {showAddModal === 'transfer_stok' && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '12px'
        }}>
          <div className="glass-card animate-fade-in" style={{
            width: '95vw', maxWidth: '960px', maxHeight: '94vh', overflowY: 'auto',
            padding: '18px', background: T.cardBg, border: `1px solid ${T.info}`, borderRadius: '18px',
            display: 'flex', flexDirection: 'column', gap: '12px'
          }}>
            {/* Header Modal */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ padding: '8px', background: 'rgba(167, 139, 250, 0.15)', borderRadius: '10px', border: '1px solid rgba(167, 139, 250, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Truck size={22} color={T.info} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: '800', color: T.txtPrimary, margin: 0, letterSpacing: '-0.02em' }}>
                    🚚 Buat Laporan Transfer Produk Antarcabang
                  </h3>
                  <p style={{ fontSize: '0.76rem', color: T.txtSecondary, margin: '2px 0 0 0' }}>
                    Formulir mutasi & pengiriman persediaan stok antarcabang restoran
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setShowAddModal(null)} 
                style={{
                  background: T.border, border: '1px solid rgba(255,255,255,0.1)',
                  color: T.txtSecondary, borderRadius: '8px', width: '32px', height: '32px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', fontSize: '1.0rem', fontWeight: '700', transition: 'all 0.2s'
                }}
              >
                ✕
              </button>
            </div>

            {(() => {
              const handleAddTransferRow = () => {
                const defaultIng = ingredientsList[0] || { name: 'Daging Ayam Fillet', unit: 'kg' };
                setTransferBatchRows(prev => [
                  ...prev,
                  {
                    id: Date.now() + Math.random(),
                    item_name: defaultIng.name,
                    custom_item_name: '',
                    qty: 1,
                    unit: defaultIng.unit || 'kg'
                  }
                ]);
              };

              const handleUpdateTransferRow = (id, field, value) => {
                setTransferBatchRows(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
              };

              const handleDeleteTransferRow = (id) => {
                if (transferBatchRows.length <= 1) return;
                setTransferBatchRows(prev => prev.filter(r => r.id !== id));
              };

              return (
                <form onSubmit={e => {
                  e.preventDefault();
                  if (transferBatchRows.length === 0) {
                    alert('Mohon tambahkan minimal 1 bahan baku/produk untuk ditransfer.');
                    return;
                  }

                  const fromOutletObj = outlets.find(o => Number(o.id) === Number(transferFromOutletId)) || outlets[0] || { name: 'Restoran Utama' };
                  const toOutletObj = outlets.find(o => Number(o.id) === Number(transferToOutletId)) || outlets.find(o => Number(o.id) !== Number(transferFromOutletId)) || { name: 'Outlet Tujuan' };

                  const newRecords = [];
                  transferBatchRows.forEach((row, idx) => {
                    const finalItemName = row.item_name === '__OTHER__' ? (row.custom_item_name || 'Bahan Baku Baru') : row.item_name;
                    const recId = transferBatchRows.length > 1 ? `${transferNo}-${idx + 1}` : transferNo;

                    newRecords.push({
                      id: recId,
                      report_no: transferNo,
                      date: transferDate,
                      from_outlet_id: Number(transferFromOutletId),
                      from_outlet_name: fromOutletObj.name,
                      to_outlet_id: Number(transferToOutletId),
                      to_outlet_name: toOutletObj.name,
                      submitted_by: transferCreatedBy,
                      created_by: transferCreatedBy,
                      author_name: transferCreatedBy,
                      item_name: finalItemName,
                      qty: Number(row.qty || 0),
                      unit: row.unit || 'kg',
                      notes: transferNotes || 'Transfer stok antarcabang',
                      status: 'Approved',
                      is_approved: true,
                      type_input: 'manual'
                    });
                  });

                  setMasterData(prev => ({
                    ...prev,
                    stockTransfer: [...newRecords, ...(prev.stockTransfer || [])],
                    approvedTransfers: [...newRecords, ...(prev.approvedTransfers || [])],
                    stockMovement: [...newRecords, ...(prev.stockMovement || [])]
                  }));

                  alert(`Berhasil membuat & menyimpan Laporan Transfer Stok ${transferNo} (${newRecords.length} Item)!\nStatus: Approved (Siap Dikirim ke Mobile APK).`);
                  setShowAddModal(null);
                }} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

                  {/* KARTU 1: Tanggal & Nomor Laporan */}
                  <div style={{ background: T.cardBg2, padding: '12px 14px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                    <div>
                      <label style={{ fontSize: '0.74rem', color: T.txtSecondary, fontWeight: '700', display: 'block', marginBottom: '4px' }}>📅 Tanggal Transfer *</label>
                      <input type="date" required value={transferDate} onChange={e => setTransferDate(e.target.value)} className="form-input" style={{ width: '100%', height: '36px', fontSize: '0.80rem' }} />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.74rem', color: T.txtSecondary, fontWeight: '700', display: 'block', marginBottom: '4px' }}>📋 Nomor Laporan Transfer *</label>
                      <input type="text" required value={transferNo} onChange={e => setTransferNo(e.target.value)} className="form-input" style={{ width: '100%', height: '36px', fontWeight: '800', color: `${T.info}`, fontSize: '0.80rem' }} />
                    </div>
                  </div>

                  {/* KARTU 2: Diisi Oleh, Outlet Asal & Outlet Tujuan */}
                  <div style={{ background: T.cardBg2, padding: '12px 14px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
                    <div>
                      <label style={{ fontSize: '0.74rem', color: T.txtSecondary, fontWeight: '700', display: 'block', marginBottom: '4px' }}>👤 Pengaju / Dibuat Oleh *</label>
                      <select value={transferCreatedBy} onChange={e => setTransferCreatedBy(e.target.value)} className="form-input" style={{ width: '100%', height: '36px', fontSize: '0.80rem' }}>
                        {userRightsList.map(a => (
                          <option key={a.id} value={a.name}>{a.name} ({a.role})</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label style={{ fontSize: '0.74rem', color: T.danger, fontWeight: '800', display: 'block', marginBottom: '4px' }}>🔴 Outlet Asal (Pengirim) *</label>
                      <select value={transferFromOutletId} onChange={e => setTransferFromOutletId(Number(e.target.value))} className="form-input" style={{ width: '100%', height: '36px', fontWeight: '800', color: T.danger, border: `1px solid ${T.danger}`, fontSize: '0.80rem' }}>
                        {outlets.map(o => (
                          <option key={o.id} value={o.id}>{o.name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label style={{ fontSize: '0.74rem', color: T.success, fontWeight: '800', display: 'block', marginBottom: '4px' }}>🟢 Outlet Tujuan (Penerima) *</label>
                      <select value={transferToOutletId} onChange={e => setTransferToOutletId(Number(e.target.value))} className="form-input" style={{ width: '100%', height: '36px', fontWeight: '800', color: T.success, border: `1px solid ${T.success}`, fontSize: '0.80rem' }}>
                        {outlets.filter(o => o.id !== Number(transferFromOutletId)).map(o => (
                          <option key={o.id} value={o.id}>{o.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* KARTU 3: DETAIL BAHAN BAKU / PRODUK YANG DITRANSFER (MULTI-ITEM FIT TO PAGE) */}
                  <div style={{ background: T.cardBg2, padding: '12px 14px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      <label style={{ fontSize: '0.78rem', color: T.info, fontWeight: '800', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>📦 Detail Bahan Baku / Produk Yang Ditransfer ({transferBatchRows.length} Item)</span>
                      </label>
                      <button
                        type="button"
                        onClick={handleAddTransferRow}
                        style={{
                          padding: '5px 12px', background: 'rgba(56, 189, 248, 0.15)', color: T.info,
                          border: '1px solid rgba(56, 189, 248, 0.3)', borderRadius: '8px',
                          fontSize: '0.74rem', fontWeight: '800', cursor: 'pointer',
                          display: 'inline-flex', alignItems: 'center', gap: '5px', transition: 'all 0.2s'
                        }}
                      >
                        <PlusCircle size={14} />
                        <span>+ Tambahkan Bahan Baku</span>
                      </button>
                    </div>

                    {/* Format Tabel Fit To Page Proposional */}
                    <div style={{ width: '100%', overflowX: 'auto', borderRadius: '10px', border: `1px solid ${T.border}` }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.78rem' }}>
                        <thead>
                          <tr style={{ background: T.cardBg, borderBottom: `1px solid ${T.border}`, color: T.txtSecondary, fontSize: '0.70rem', fontWeight: '800', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                            <th style={{ padding: '8px 10px', width: '35px', textAlign: 'center' }}>No</th>
                            <th style={{ padding: '8px 10px', minWidth: '180px' }}>Nama Produk / Stok Item *</th>
                            <th style={{ padding: '8px 10px', width: '130px', textAlign: 'right', color: T.danger }}>📤 Transfer Out (Outlet Pengirim) *</th>
                            <th style={{ padding: '8px 10px', width: '130px', textAlign: 'right', color: T.success }}>📥 Transfer In (Outlet Penerima) *</th>
                            <th style={{ padding: '8px 10px', width: '110px', textAlign: 'center' }}>Satuan / Unit</th>
                            <th style={{ padding: '8px 10px', width: '40px', textAlign: 'center' }}>Hapus</th>
                          </tr>
                        </thead>
                        <tbody>
                          {transferBatchRows.map((row, idx) => {
                            const foundIng = ingredientsList.find(i => i.name === row.item_name);
                            const autoUnit = foundIng?.unit || row.unit || 'kg';

                            return (
                              <React.Fragment key={row.id || idx}>
                                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', background: idx % 2 === 0 ? 'rgba(30, 41, 59, 0.5)' : T.cardBg2 }}>
                                  {/* 1. Index */}
                                  <td style={{ padding: '6px 8px', textAlign: 'center', fontWeight: '700', color: T.txtMuted, whiteSpace: 'nowrap' }}>
                                    {idx + 1}
                                  </td>

                                  {/* 2. Nama Bahan Baku */}
                                  <td style={{ padding: '6px 8px', whiteSpace: 'nowrap' }}>
                                    <select
                                      value={row.item_name}
                                      onChange={e => {
                                        const val = e.target.value;
                                        handleUpdateTransferRow(row.id, 'item_name', val);
                                        if (val !== '__OTHER__') {
                                          const found = ingredientsList.find(i => i.name === val);
                                          if (found) handleUpdateTransferRow(row.id, 'unit', found.unit || 'kg');
                                        }
                                      }}
                                      className="form-input"
                                      style={{ width: '100%', height: '34px', fontWeight: '800', color: T.success, fontSize: '0.78rem', borderRadius: '6px' }}
                                    >
                                      {ingredientsList.map(ing => (
                                        <option key={ing.id} value={ing.name}>{ing.name} ({ing.unit || 'kg'})</option>
                                      ))}
                                      <option value="__OTHER__">➕ + Buat / Tentukan Nama Bahan Baku Baru...</option>
                                    </select>
                                  </td>

                                  {/* 3. Transfer Out Input */}
                                  <td style={{ padding: '6px 8px', whiteSpace: 'nowrap' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'flex-end' }}>
                                      <span style={{ color: T.danger, fontWeight: '900', fontSize: '0.85rem' }}>-</span>
                                      <input
                                        type="number"
                                        required
                                        step="any"
                                        min="0"
                                        placeholder="0"
                                        value={row.qty}
                                        onChange={e => handleUpdateTransferRow(row.id, 'qty', e.target.value)}
                                        className="form-input"
                                        style={{ width: '75px', height: '34px', fontWeight: '900', color: T.danger, fontSize: '0.80rem', textAlign: 'right', borderRadius: '6px', border: '1px solid rgba(251, 113, 133, 0.4)' }}
                                      />
                                    </div>
                                  </td>

                                  {/* 4. Transfer In Input */}
                                  <td style={{ padding: '6px 8px', whiteSpace: 'nowrap' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'flex-end' }}>
                                      <span style={{ color: T.success, fontWeight: '900', fontSize: '0.85rem' }}>+</span>
                                      <input
                                        type="number"
                                        required
                                        step="any"
                                        min="0"
                                        placeholder="0"
                                        value={row.qty}
                                        onChange={e => handleUpdateTransferRow(row.id, 'qty', e.target.value)}
                                        className="form-input"
                                        style={{ width: '75px', height: '34px', fontWeight: '900', color: T.success, fontSize: '0.80rem', textAlign: 'right', borderRadius: '6px', border: '1px solid rgba(52, 211, 153, 0.4)' }}
                                      />
                                    </div>
                                  </td>

                                  {/* 5. Satuan Unit Automatis */}
                                  <td style={{ padding: '6px 8px', whiteSpace: 'nowrap' }}>
                                    {row.item_name === '__OTHER__' ? (
                                      <input
                                        type="text"
                                        value={row.unit}
                                        onChange={e => handleUpdateTransferRow(row.id, 'unit', e.target.value)}
                                        placeholder="kg/liter"
                                        className="form-input"
                                        style={{ width: '100%', height: '34px', fontSize: '0.78rem', borderRadius: '6px', textAlign: 'center' }}
                                      />
                                    ) : (
                                      <div style={{
                                        height: '34px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        background: 'rgba(167, 139, 250, 0.1)', border: '1px solid rgba(167, 139, 250, 0.3)',
                                        borderRadius: '6px', color: `${T.info}`, fontWeight: '800', fontSize: '0.78rem'
                                      }}>
                                        🏷️ {autoUnit}
                                      </div>
                                    )}
                                  </td>

                                  {/* 6. Hapus */}
                                  <td style={{ padding: '6px 8px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteTransferRow(row.id)}
                                      disabled={transferBatchRows.length <= 1}
                                      style={{
                                        background: transferBatchRows.length <= 1 ? 'transparent' : 'rgba(244, 63, 94, 0.15)',
                                        border: `1px solid ${transferBatchRows.length <= 1 ? T.border : 'rgba(244, 63, 94, 0.3)'}`,
                                        color: transferBatchRows.length <= 1 ? T.borderStrong : T.danger,
                                        borderRadius: '6px', width: '28px', height: '28px',
                                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                        cursor: transferBatchRows.length <= 1 ? 'not-allowed' : 'pointer'
                                      }}
                                    >
                                      <Trash2 size={13} />
                                    </button>
                                  </td>
                                </tr>

                                {/* Sub-row custom item input */}
                                {row.item_name === '__OTHER__' && (
                                  <tr style={{ background: 'rgba(56, 189, 248, 0.05)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                    <td colSpan={6} style={{ padding: '8px 10px' }}>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span style={{ fontSize: '0.74rem', color: T.accentGold, fontWeight: '800' }}>✏️ Nama Bahan Baku Baru:</span>
                                        <input
                                          type="text"
                                          required
                                          placeholder="Ketikkan nama bahan baku baru..."
                                          value={row.custom_item_name}
                                          onChange={e => handleUpdateTransferRow(row.id, 'custom_item_name', e.target.value)}
                                          className="form-input"
                                          style={{ flex: 1, height: '32px', fontWeight: '800', color: T.accentGold, fontSize: '0.78rem', borderRadius: '6px' }}
                                        />
                                      </div>
                                    </td>
                                  </tr>
                                )}
                              </React.Fragment>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* KARTU 4: Catatan / Alasan Transfer */}
                  <div style={{ background: T.cardBg2, padding: '12px 14px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <label style={{ fontSize: '0.74rem', color: T.txtSecondary, fontWeight: '700', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                      <span>📝 Catatan / Alasan Transfer Bahan Baku</span>
                    </label>
                    <input 
                      type="text" 
                      placeholder="Contoh: Stok bahan baku menipis untuk persiapan weekend..." 
                      value={transferNotes} 
                      onChange={e => setTransferNotes(e.target.value)} 
                      className="form-input" 
                      style={{ width: '100%', height: '36px', fontSize: '0.80rem', borderRadius: '8px' }} 
                    />
                  </div>

                  {/* Footer Buttons */}
                  <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', paddingTop: '6px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                    <button 
                      type="button" 
                      onClick={() => setShowAddModal(null)} 
                      style={{
                        padding: '10px 20px', background: T.border, color: T.txtPrimary,
                        border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px',
                        fontWeight: '700', fontSize: '0.80rem', cursor: 'pointer', transition: 'all 0.2s'
                      }}
                    >
                      Batal
                    </button>
                    <button 
                      type="submit" 
                      style={{
                        padding: '10px 24px', background: `linear-gradient(135deg, ${T.info} 0%, #7c3aed 100%)`,
                        color: T.txtPrimary, border: 'none', borderRadius: '8px',
                        fontWeight: '800', fontSize: '0.82rem', cursor: 'pointer',
                        boxShadow: '0 4px 14px rgba(167,139,250,0.4)', transition: 'all 0.2s'
                      }}
                    >
                      💾 Simpan & Kirim Transfer Bahan Baku
                    </button>
                  </div>
                </form>
              );
            })()}
          </div>
        </div>
      )}

      {/* 3. Modal Stok Rusak (MATCHING POS MOBILE EXACTLY) */}
      {showAddModal === 'rusak' && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div className="glass-card animate-fade-in" style={{
            width: '100%', maxWidth: '720px', maxHeight: '90vh', overflowY: 'auto',
            padding: '24px', background: T.cardBg, border: `1px solid ${T.danger}`, borderRadius: '18px',
            display: 'flex', flexDirection: 'column', gap: '16px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${T.border}`, paddingBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Trash2 size={24} color={T.danger} />
                <div>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: '900', color: T.txtPrimary, margin: 0 }}>
                    Laporkan Stok Rusak / Waste
                  </h3>
                  <p style={{ fontSize: '0.76rem', color: T.txtSecondary, margin: '2px 0 0 0' }}>
                    Formulir pencatatan waste, retur, expired, & kerusakan bahan baku
                  </p>
                </div>
              </div>
              <button onClick={() => { setShowAddModal(null); setEditingRecord(null); }} style={{ background: 'none', border: 'none', color: T.txtSecondary, cursor: 'pointer', fontSize: '1.2rem', fontWeight: '900' }}>✕</button>
            </div>

            <form onSubmit={handleSaveRusak} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

              {/* Row 1: Tanggal Kejadian & Dibuat Oleh */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '12px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ fontSize: '0.78rem', color: T.txtSecondary, fontWeight: '700' }}>Tanggal Kejadian *</span>
                  <input type="date" required value={rusakDate} onChange={e => setRusakDate(e.target.value)} className="form-input" style={{ width: '100%', height: '40px', padding: '8px', background: T.cardBg2, border: `1px solid ${T.border}`, borderRadius: '6px', color: T.txtPrimary, fontSize: '0.82rem' }} />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ fontSize: '0.78rem', color: T.txtSecondary, fontWeight: '700' }}>Dibuat Oleh *</span>
                  <select value={rusakCreatedBy} onChange={e => setRusakCreatedBy(e.target.value)} className="form-input" style={{ width: '100%', height: '40px', padding: '8px', background: T.cardBg2, border: `1px solid ${T.border}`, borderRadius: '6px', color: T.txtPrimary, fontSize: '0.82rem', cursor: 'pointer' }}>
                    {userRightsList.map(u => (
                      <option key={u.id} value={u.name}>{u.name} ({u.role || 'Staf Restoran'})</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Row 2: Nama Outlet Cabang */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '0.78rem', color: T.txtSecondary, fontWeight: '700' }}>Nama Outlet Cabang</span>
                <select 
                  value={rusakOutletId} 
                  onChange={e => setRusakOutletId(e.target.value)} 
                  className="form-input"
                  style={{ width: '100%', height: '40px', padding: '8px', background: T.cardBg2, border: `1px solid ${T.success}`, borderRadius: '6px', color: T.success, fontWeight: '800', fontSize: '0.85rem', cursor: 'pointer' }}
                >
                  {outlets.map(o => <option key={o.id} value={o.id}>🏢 {o.name}</option>)}
                </select>
              </div>

              {/* Catatan Editing jika dalam mode Edit */}
              {editingRecord && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', background: 'rgba(251,191,36,0.08)', padding: '10px', borderRadius: '8px', border: '1px solid rgba(251,191,36,0.3)' }}>
                  <span style={{ fontSize: '0.78rem', color: T.accentGold, fontWeight: '800' }}>📝 Catatan Editing (Wajib saat Edit Data) *</span>
                  <textarea
                    required
                    placeholder="Tuliskan catatan perbaikan atau alasan pengeditan data ini..."
                    value={rusakEditingNotes}
                    onChange={e => setRusakEditingNotes(e.target.value)}
                    rows={2}
                    className="form-input"
                    style={{ width: '100%', padding: '8px', background: T.cardBg2, border: `1px solid ${T.accentGold}`, borderRadius: '6px', color: T.accentGold, fontSize: '0.80rem' }}
                  />
                </div>
              )}

              {/* Dynamic Item Rows Section */}
              <div style={{ background: T.cardBg2, padding: '14px', borderRadius: '12px', border: `1px solid ${T.border}`, display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.82rem', color: T.danger, fontWeight: '800' }}>
                    🥬 Cari & Pilih Nama Item (Bahan Baku Rusak):
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const firstIng = ingredientsList[0] || { name: 'Daging Ayam Fillet', unit: 'kg' };
                      setRusakBatchRows(prev => [
                        ...prev,
                        { id: Date.now(), item_name: firstIng.name, custom_item_name: '', qty: 1, unit: firstIng.unit || 'kg', reason: 'Terlalu kecil', notes: '' }
                      ]);
                    }}
                    style={{
                      padding: '6px 12px', background: 'rgba(244, 63, 94, 0.2)', border: `1px solid ${T.danger}`,
                      color: T.danger, borderRadius: '8px', fontSize: '0.75rem', fontWeight: '900', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px'
                    }}
                  >
                    <PlusCircle size={14} />
                    <span>+ Tambahkan Bahan Baku</span>
                  </button>
                </div>

                {rusakBatchRows.map((row, idx) => (
                  <div key={row.id || idx} style={{ background: T.cardBg, padding: '12px', borderRadius: '10px', border: `1px solid ${T.borderStrong}`, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1.5fr 36px', gap: '8px', alignItems: 'end' }}>
                      <div>
                        <span style={{ fontSize: '0.72rem', color: T.txtPrimary, fontWeight: '700', display: 'block', marginBottom: '2px' }}>
                          Item Bahan Baku *
                        </span>
                        <select
                          value={row.item_name}
                          onChange={e => {
                            const val = e.target.value;
                            const updated = [...rusakBatchRows];
                            updated[idx].item_name = val;
                            if (val !== '__OTHER__') {
                              const found = ingredientsList.find(i => i.name === val);
                              if (found) updated[idx].unit = found.unit || 'kg';
                            }
                            setRusakBatchRows(updated);
                          }}
                          className="form-input"
                          style={{ width: '100%', height: '36px', fontSize: '0.80rem', fontWeight: '800', color: T.info, padding: '6px' }}
                        >
                          {ingredientsList.map(ing => (
                            <option key={ing.id} value={ing.name}>{ing.name} ({ing.unit || 'kg'})</option>
                          ))}
                          <option value="__OTHER__">➕ + Nama Bahan Baku Lainnya...</option>
                        </select>
                      </div>

                      <div>
                        <span style={{ fontSize: '0.72rem', color: T.danger, fontWeight: '700', display: 'block', marginBottom: '2px' }}>
                          Jumlah Qty Rusak *
                        </span>
                        <input
                          type="number"
                          min="0.01"
                          step="any"
                          required
                          placeholder="Isi Qty..."
                          value={row.qty}
                          onChange={e => {
                            const updated = [...rusakBatchRows];
                            updated[idx].qty = e.target.value;
                            setRusakBatchRows(updated);
                          }}
                          className="form-input"
                          style={{ width: '100%', height: '36px', fontSize: '0.80rem', fontWeight: '900', color: T.danger, padding: '6px' }}
                        />
                      </div>

                      <div>
                        <span style={{ fontSize: '0.72rem', color: T.txtSecondary, fontWeight: '700', display: 'block', marginBottom: '2px' }}>
                          Satuan (Otomatis)
                        </span>
                        <input
                          type="text"
                          readOnly
                          value={row.unit}
                          className="form-input"
                          style={{ width: '100%', height: '36px', fontSize: '0.80rem', background: T.cardBg2, color: T.txtSecondary, padding: '6px' }}
                        />
                      </div>

                      <div>
                        <span style={{ fontSize: '0.72rem', color: T.danger, fontWeight: '700', display: 'block', marginBottom: '2px' }}>
                          Pilihan Alasan *
                        </span>
                        <select
                          value={row.reason}
                          onChange={e => {
                            const updated = [...rusakBatchRows];
                            updated[idx].reason = e.target.value;
                            setRusakBatchRows(updated);
                          }}
                          className="form-input"
                          style={{ width: '100%', height: '36px', fontSize: '0.78rem', fontWeight: '800', color: T.danger, padding: '6px' }}
                        >
                          <option value="Terlalu kecil">Terlalu kecil</option>
                          <option value="Terlalu besar">Terlalu besar</option>
                          <option value="Berbau">Berbau</option>
                          <option value="Tidak standar">Tidak standar</option>
                          <option value="Dan lain lain">Dan lain lain</option>
                        </select>

                        {row.reason === 'Dan lain lain' && (
                          <input
                            type="text"
                            placeholder="Tulis alasan spesifik..."
                            value={row.reason_custom || ''}
                            onChange={e => {
                              const updated = [...rusakBatchRows];
                              updated[idx].reason_custom = e.target.value;
                              setRusakBatchRows(updated);
                            }}
                            className="form-input"
                            style={{ width: '100%', height: '34px', fontSize: '0.78rem', color: T.accentGold, fontWeight: '700', marginTop: '4px' }}
                          />
                        )}
                      </div>

                      {rusakBatchRows.length > 1 && (
                        <button
                          type="button"
                          onClick={() => {
                            setRusakBatchRows(prev => prev.filter((_, i) => i !== idx));
                          }}
                          style={{ height: '36px', width: '36px', background: 'rgba(239, 68, 68, 0.2)', border: '1px solid #ef4444', color: T.danger, borderRadius: '6px', cursor: 'pointer', fontWeight: '900' }}
                          title="Hapus baris ini"
                        >
                          ✕
                        </button>
                      )}
                    </div>

                    {row.item_name === '__OTHER__' && (
                      <input
                        type="text"
                        required
                        placeholder="Tentukan Nama Bahan Baku Baru..."
                        value={row.custom_item_name}
                        onChange={e => {
                          const updated = [...rusakBatchRows];
                          updated[idx].custom_item_name = e.target.value;
                          setRusakBatchRows(updated);
                        }}
                        className="form-input"
                        style={{ width: '100%', height: '34px', fontSize: '0.78rem', color: T.accentGold, fontWeight: '800' }}
                      />
                    )}
                  </div>
                ))}
              </div>

              {/* Footer Buttons */}
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '6px' }}>
                <button type="button" onClick={() => { setShowAddModal(null); setEditingRecord(null); }} className="btn-secondary" style={{ padding: '8px 16px', fontSize: '0.8rem' }}>
                  Batal
                </button>
                <button type="submit" className="btn-primary" style={{ padding: '8px 16px', fontSize: '0.8rem', background: T.danger, color: T.txtPrimary, fontWeight: '800' }}>
                  Lanjut ke Pratinjau (OK)
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PAPAN PREVIEW MODAL STOK RUSAK WEB ADMIN */}
      {showRusakPreviewFormModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000 }}>
          <div className="glass-card animate-fade-in" style={{ width: '100%', maxWidth: '580px', maxHeight: '90vh', overflowY: 'auto', padding: '24px', background: T.cardBg, border: `1px solid ${T.success}`, borderRadius: '18px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${T.border}`, paddingBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle size={22} color={T.success} />
                <h3 style={{ fontSize: '1.15rem', fontWeight: '900', color: T.txtPrimary, margin: 0 }}>
                  📋 Papan Pratinjau Laporan Barang Rusak
                </h3>
              </div>
              <button onClick={() => setShowRusakPreviewFormModal(false)} style={{ background: 'none', border: 'none', color: T.txtSecondary, cursor: 'pointer', fontSize: '1.2rem', fontWeight: '900' }}>✕</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.82rem', color: T.txtPrimary, background: T.cardBg2, padding: '16px', borderRadius: '12px', border: `1px solid ${T.border}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: T.txtSecondary }}>No Laporan:</span>
                <span style={{ fontWeight: '900', color: T.danger }}>{rusakNo}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: T.txtSecondary }}>Tanggal Kejadian:</span>
                <span style={{ fontWeight: '800' }}>{rusakDate}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: T.txtSecondary }}>Pengaju / Dibuat Oleh:</span>
                <span style={{ fontWeight: '800' }}>👤 {rusakCreatedBy}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: T.txtSecondary }}>Outlet Cabang:</span>
                <span style={{ fontWeight: '800', color: T.success }}>🏢 {getOutletName(rusakOutletId)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: T.txtSecondary }}>Tipe Input & Status:</span>
                <span style={{ fontWeight: '800', color: T.info }}>🔵 By manual (PENDING)</span>
              </div>
              {editingRecord && rusakEditingNotes && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', background: 'rgba(251,191,36,0.1)', padding: '8px 12px', borderRadius: '8px', border: '1px solid rgba(251,191,36,0.3)' }}>
                  <span style={{ color: T.accentGold, fontWeight: '800', fontSize: '0.75rem' }}>📝 Catatan Editing:</span>
                  <span style={{ color: T.txtPrimary, fontSize: '0.78rem' }}>{rusakEditingNotes}</span>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <span style={{ fontSize: '0.80rem', color: T.txtSecondary, fontWeight: '800' }}>📦 Rincian Bahan Baku Rusak:</span>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: T.cardBg2, color: T.txtSecondary, borderBottom: `1px solid ${T.border}` }}>
                    <th style={{ padding: '8px' }}>Bahan Baku</th>
                    <th style={{ padding: '8px', textAlign: 'center' }}>Jumlah Qty</th>
                    <th style={{ padding: '8px' }}>Alasan Rusak</th>
                  </tr>
                </thead>
                <tbody>
                  {rusakBatchRows.map((row, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <td style={{ padding: '8px', fontWeight: '800', color: T.info }}>{row.item_name === '__OTHER__' ? (row.custom_item_name || 'Bahan Kustom') : row.item_name}</td>
                      <td style={{ padding: '8px', textAlign: 'center', fontWeight: '900', color: T.danger }}>{row.qty} {row.unit}</td>
                      <td style={{ padding: '8px', color: T.txtPrimary }}>{row.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '8px', borderTop: `1px solid ${T.border}`, paddingTop: '14px' }}>
              <button
                type="button"
                onClick={() => setShowRusakPreviewFormModal(false)}
                style={{ padding: '9px 18px', background: 'rgba(100,116,139,0.2)', border: `1px solid ${T.borderStrong}`, color: T.txtSecondary, borderRadius: '8px', fontSize: '0.82rem', fontWeight: '800', cursor: 'pointer' }}
              >
                ✏️ Edit Lagi
              </button>
              <button
                type="button"
                onClick={handleSaveRusakFinal}
                style={{ padding: '9px 24px', background: `linear-gradient(135deg, ${T.success} 0%, #059669 100%)`, border: 'none', color: T.txtPrimary, borderRadius: '8px', fontSize: '0.85rem', fontWeight: '900', cursor: 'pointer', boxShadow: '0 4px 14px rgba(52,211,153,0.4)' }}
              >
                💾 Simpan Laporan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Modal Stok Opname */}
      {/* 4. Modal Stok Opname */}
      {showAddModal === 'opname' && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 110 }}>
          <form onSubmit={handleSaveOpname} className="glass-card animate-fade-in" style={{ padding: '24px', width: '500px', border: `1px solid ${T.success}`, display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: '900', color: T.txtPrimary, borderBottom: `1px solid ${T.border}`, paddingBottom: '12px' }}>
              📋 Mulai Audit Fisik (Stock Opname)
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '0.75rem', color: T.txtSecondary, fontWeight: '700' }}>Tanggal Audit</span>
                <input type="date" value={opnameDate} onChange={e => setOpnameDate(e.target.value)} style={{ padding: '8px', background: T.cardBg2, border: `1px solid ${T.border}`, borderRadius: '6px', color: T.txtPrimary, fontSize: '0.82rem' }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '0.75rem', color: T.txtSecondary, fontWeight: '700' }}>Dibuat Oleh</span>
                <select value={opnameCreatedBy} onChange={e => setOpnameCreatedBy(e.target.value)} style={{ padding: '8px', background: T.cardBg2, border: `1px solid ${T.border}`, borderRadius: '6px', color: T.txtPrimary, fontSize: '0.82rem', cursor: 'pointer' }}>
                  {userRightsList.map(u => <option key={u.id} value={u.name}>{u.name} ({u.role})</option>)}
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ fontSize: '0.75rem', color: T.txtSecondary, fontWeight: '700' }}>Restoran Outlet</span>
              <select value={opnameOutletId} onChange={e => setOpnameOutletId(Number(e.target.value))} style={{ padding: '8px', background: T.cardBg2, border: `1px solid ${T.border}`, borderRadius: '6px', color: T.txtPrimary, fontSize: '0.82rem', cursor: 'pointer' }}>
                {outlets.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
              </select>
            </div>

            {/* Nama Item (Searchable) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ fontSize: '0.75rem', color: T.txtSecondary, fontWeight: '700' }}>Cari & Pilih Nama Item (Bahan Baku)</span>
              <input
                type="text"
                placeholder="Ketik untuk mencari bahan..."
                value={opnameSearchQuery}
                onChange={e => setOpnameSearchQuery(e.target.value)}
                style={{ padding: '8px', background: T.cardBg2, border: `1px solid ${T.border}`, borderRadius: '6px 6px 0 0', color: T.txtPrimary, fontSize: '0.82rem' }}
              />
              <select
                value={opnameIngredientId}
                onChange={e => {
                  const val = Number(e.target.value);
                  setOpnameIngredientId(val);
                  const found = ingredientsList.find(i => i.id === val);
                  if (found) setOpnameUnit(found.unit || 'pcs');
                }}
                style={{ padding: '8px', background: T.cardBg, border: `1px solid ${T.border}`, borderTop: 'none', borderRadius: '0 0 6px 6px', color: T.txtPrimary, fontSize: '0.82rem', cursor: 'pointer' }}
              >
                {ingredientsList.filter(i => i.name.toLowerCase().includes(opnameSearchQuery.toLowerCase())).map(i => (
                  <option key={i.id} value={i.id}>{i.name}</option>
                ))}
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '0.7rem', color: T.txtSecondary, fontWeight: '700' }}>Stok Awal</span>
                <input type="number" value={opnameStokAwal} onChange={e => setOpnameStokAwal(e.target.value)} style={{ padding: '8px', background: T.cardBg2, border: `1px solid ${T.border}`, borderRadius: '6px', color: T.txtPrimary, fontSize: '0.8rem' }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '0.7rem', color: T.txtSecondary, fontWeight: '700' }}>Stok Masuk</span>
                <input type="number" value={opnameStokMasuk} onChange={e => setOpnameStokMasuk(e.target.value)} style={{ padding: '8px', background: T.cardBg2, border: `1px solid ${T.border}`, borderRadius: '6px', color: T.txtPrimary, fontSize: '0.8rem' }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '0.7rem', color: T.txtSecondary, fontWeight: '700' }}>Stok Keluar</span>
                <input type="number" value={opnameStokKeluar} onChange={e => setOpnameStokKeluar(e.target.value)} style={{ padding: '8px', background: T.cardBg2, border: `1px solid ${T.border}`, borderRadius: '6px', color: T.txtPrimary, fontSize: '0.8rem' }} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '0.7rem', color: T.txtSecondary, fontWeight: '700' }}>Trans. Masuk</span>
                <input type="number" value={opnameTransferMasuk} onChange={e => setOpnameTransferMasuk(e.target.value)} style={{ padding: '8px', background: T.cardBg2, border: `1px solid ${T.border}`, borderRadius: '6px', color: T.txtPrimary, fontSize: '0.8rem' }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '0.7rem', color: T.txtSecondary, fontWeight: '700' }}>Trans. Keluar</span>
                <input type="number" value={opnameTransferKeluar} onChange={e => setOpnameTransferKeluar(e.target.value)} style={{ padding: '8px', background: T.cardBg2, border: `1px solid ${T.border}`, borderRadius: '6px', color: T.txtPrimary, fontSize: '0.8rem' }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '0.7rem', color: T.txtSecondary, fontWeight: '700' }}>Stok Rusak</span>
                <input type="number" value={opnameStokRusak} onChange={e => setOpnameStokRusak(e.target.value)} style={{ padding: '8px', background: T.cardBg2, border: `1px solid ${T.border}`, borderRadius: '6px', color: T.txtPrimary, fontSize: '0.8rem' }} />
              </div>
            </div>

            {/* STOK YANG DIHITUNG (STOK SISTEM) & SELISIH AUTOMATIC FORMULA BOX */}
            {(() => {
              const calcStokSistem = (Number(opnameStokAwal || 0) + Number(opnameStokMasuk || 0) + Number(opnameTransferMasuk || 0)) - (Number(opnameStokKeluar || 0) + Number(opnameTransferKeluar || 0) + Number(opnameStokRusak || 0));
              const calcSelisih = Number(opnameStokFisik || 0) - calcStokSistem;

              return (
                <div style={{ background: T.cardBg2, padding: '12px', borderRadius: '8px', border: `1px solid ${T.info}`, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <span style={{ fontSize: '0.74rem', color: T.info, fontWeight: '800', display: 'block' }}>🔢 STOK YANG DIHITUNG (STOK SISTEM)</span>
                    <div style={{ fontSize: '1.1rem', fontWeight: '900', color: T.info, marginTop: '2px' }}>
                      {calcStokSistem} {opnameUnit || 'pcs'}
                    </div>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.74rem', color: calcSelisih === 0 ? T.success : calcSelisih > 0 ? T.info : T.danger, fontWeight: '800', display: 'block' }}>📊 ANALISIS SELISIH FISIK VS DIHITUNG</span>
                    <div style={{ fontSize: '1.1rem', fontWeight: '900', color: calcSelisih === 0 ? T.success : calcSelisih > 0 ? T.info : T.danger, marginTop: '2px' }}>
                      {calcSelisih > 0 ? `+${calcSelisih}` : calcSelisih} {opnameUnit || 'pcs'}
                    </div>
                  </div>
                </div>
              );
            })()}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ fontSize: '0.75rem', color: T.success, fontWeight: '800' }}>Sisa Stok Fisik</span>
              <input type="number" value={opnameStokFisik} onChange={e => setOpnameStokFisik(e.target.value)} style={{ padding: '8px', background: T.cardBg2, border: `1px solid ${T.success}`, borderRadius: '6px', color: T.txtPrimary, fontSize: '0.82rem' }} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ fontSize: '0.75rem', color: T.txtSecondary, fontWeight: '700' }}>Catatan / Selisih Keterangan</span>
              <input type="text" placeholder="Audit penyusutan atau kehilangan..." value={opnameNotes} onChange={e => setOpnameNotes(e.target.value)} style={{ padding: '10px', background: T.cardBg2, border: `1px solid ${T.border}`, borderRadius: '6px', color: T.txtPrimary, fontSize: '0.85rem' }} />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
              <button type="button" onClick={() => setShowAddModal(null)} className="btn-secondary" style={{ padding: '8px 16px', fontSize: '0.8rem' }}>Batal</button>
              <button type="submit" className="btn-primary" style={{ padding: '8px 16px', fontSize: '0.8rem', background: T.success, color: T.cardBg2 }}>Simpan Audit</button>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================= */}
      {/* ADD / EDIT PRICE COMPARISON MODAL                         */}
      {/* ========================================================= */}
      {showAddPriceModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(5px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 110 }}>
          <div className="glass-card animate-fade-in" style={{ padding: '24px', width: '100%', maxWidth: '520px', background: T.cardBg, border: `1px solid ${T.info}`, borderRadius: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${T.border}`, paddingBottom: '12px', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: '800', color: T.txtPrimary, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <DollarSign size={20} color="#c084fc" />
                <span>{editingPriceRecord ? 'Edit Perbandingan Harga' : 'Tambah Perbandingan Harga Stok'}</span>
              </h3>
              <button onClick={() => setShowAddPriceModal(false)} style={{ background: 'none', border: 'none', color: T.txtSecondary, cursor: 'pointer' }}>
                <XCircle size={20} />
              </button>
            </div>

            <form onSubmit={handleSavePriceRecord} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '0.78rem', color: T.txtPrimary, fontWeight: '700', display: 'block', marginBottom: '4px' }}>Tanggal Pencatatan *</label>
                <input type="date" required value={priceDate} onChange={e => setPriceDate(e.target.value)} className="form-input" />
              </div>

              <div>
                <label style={{ fontSize: '0.78rem', color: T.txtPrimary, fontWeight: '700', display: 'block', marginBottom: '4px' }}>Nama Item (Bahan Baku Master Data) *</label>
                <select value={priceItemName} onChange={e => {
                  setPriceItemName(e.target.value);
                  const found = ingredientsList.find(i => i.name === e.target.value);
                  if (found) setPriceUnit(found.unit || 'kg');
                }} className="form-select" required>
                  {ingredientsList.map(ing => (
                    <option key={ing.id} value={ing.name}>{ing.name} ({ing.unit || 'kg'})</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '0.78rem', color: T.txtPrimary, fontWeight: '700', display: 'block', marginBottom: '4px' }}>Kategori Bahan</label>
                  <input type="text" placeholder="Contoh: Bahan Utama" value={priceCategory} onChange={e => setPriceCategory(e.target.value)} className="form-input" />
                </div>
                <div>
                  <label style={{ fontSize: '0.78rem', color: T.txtPrimary, fontWeight: '700', display: 'block', marginBottom: '4px' }}>Satuan (Unit)</label>
                  <input type="text" placeholder="kg, liter, pcs" value={priceUnit} onChange={e => setPriceUnit(e.target.value)} className="form-input" />
                </div>
              </div>

              {/* INPUT HARGA PER CABANG OUTLET */}
              <div style={{ background: T.cardBg2, padding: '14px', borderRadius: '8px', border: `1px solid ${T.border}`, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: '800', color: `${T.info}` }}>🏷️ Input Harga Satuan (IDR) per Cabang Outlet:</span>
                {outlets.map(o => (
                  <div key={o.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                    <span style={{ fontSize: '0.8rem', color: T.txtPrimary, fontWeight: '600' }}>🏢 {o.name}</span>
                    <input
                      type="number"
                      placeholder="0"
                      value={priceValues[o.id] || ''}
                      onChange={e => setPriceValues({ ...priceValues, [o.id]: e.target.value })}
                      className="form-input"
                      style={{ width: '160px', textAlign: 'right', fontWeight: '700', color: T.txtPrimary }}
                    />
                  </div>
                ))}
              </div>

              <div>
                <label style={{ fontSize: '0.78rem', color: T.txtPrimary, fontWeight: '700', display: 'block', marginBottom: '4px' }}>Catatan / Keterangan</label>
                <input type="text" placeholder="Contoh: Kenaikan harga akibat pasokan supplier" value={priceNotes} onChange={e => setPriceNotes(e.target.value)} className="form-input" />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button type="button" onClick={() => setShowAddPriceModal(false)} className="btn-secondary" style={{ flex: 1, justifyContent: 'center' }}>Batal</button>
                <button type="submit" className="btn-primary" style={{ flex: 1, justifyContent: 'center', background: `${T.info}`, color: T.cardBg2 }}>Simpan Perbandingan</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL PREVIEW LOG TRANSFER STOK */}
      {previewTransferModalData && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.85)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '16px'
        }}>
          <div className="glass-card animate-fade-in" style={{
            width: '100%', maxWidth: '580px', background: T.cardBg,
            border: `1px solid ${T.info}`, borderRadius: '18px', padding: '24px',
            boxShadow: '0 20px 50px rgba(0,0,0,0.5)', display: 'flex', flexDirection: 'column', gap: '16px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ padding: '8px', background: 'rgba(56, 189, 248, 0.15)', borderRadius: '10px' }}>
                  <Truck size={22} color={T.info} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: '900', color: T.txtPrimary, margin: 0 }}>
                    Pratinjau Laporan Transfer {previewTransferModalData.report_no || previewTransferModalData.id}
                  </h3>
                  <span style={{ fontSize: '0.74rem', color: T.txtSecondary }}>Detail Mutasi Stok Antarcabang Restoran</span>
                </div>
              </div>
              <button onClick={() => setPreviewTransferModalData(null)} style={{ background: 'none', border: 'none', color: T.txtSecondary, cursor: 'pointer', fontSize: '1.2rem', fontWeight: '800' }}>✕</button>
            </div>

            <div style={{ background: T.cardBg2, padding: '16px', borderRadius: '12px', border: `1px solid ${T.border}`, display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.84rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: T.txtSecondary }}>📋 No. Laporan:</span>
                <span style={{ fontWeight: '900', color: T.info }}>{previewTransferModalData.report_no || previewTransferModalData.id}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: T.txtSecondary }}>📅 Tanggal:</span>
                <span style={{ fontWeight: '800', color: T.txtPrimary }}>{previewTransferModalData.date}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: T.txtSecondary }}>👤 Pengaju / Dibuat Oleh:</span>
                <span style={{ fontWeight: '800', color: T.txtPrimary }}>{previewTransferModalData.submitted_by || previewTransferModalData.created_by || 'Admin'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: T.txtSecondary }}>🌾 Nama Produk / Stok Item:</span>
                <span style={{ fontWeight: '900', color: T.info }}>{previewTransferModalData.item_name}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: T.danger, fontWeight: '800' }}>🔴 Outlet Asal (Pengirim):</span>
                <span style={{ fontWeight: '800', color: T.danger }}>{getOutletName(previewTransferModalData.from_outlet_id || previewTransferModalData.fromOutletId, previewTransferModalData.from_outlet_name || previewTransferModalData.fromOutletName)} (-{previewTransferModalData.qty} {previewTransferModalData.unit})</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: T.success, fontWeight: '800' }}>🟢 Outlet Tujuan (Penerima):</span>
                <span style={{ fontWeight: '800', color: T.success }}>{getOutletName(previewTransferModalData.to_outlet_id || previewTransferModalData.toOutletId, previewTransferModalData.to_outlet_name || previewTransferModalData.toOutletName)} (+{previewTransferModalData.qty} {previewTransferModalData.unit})</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: T.txtSecondary }}>🏷️ Satuan / Unit:</span>
                <span style={{ fontWeight: '800', color: `${T.info}` }}>{previewTransferModalData.unit}</span>
              </div>
              {previewTransferModalData.notes && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: T.txtSecondary }}>📝 Catatan:</span>
                  <span style={{ fontWeight: '600', color: T.txtPrimary }}>{previewTransferModalData.notes}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: `1px solid ${T.border}`, paddingTop: '8px' }}>
                <span style={{ color: T.txtSecondary }}>⚡ Status Approval:</span>
                <span style={{ fontWeight: '900', color: (previewTransferModalData.status === 'Terkirim' || previewTransferModalData.status === 'Approved' || previewTransferModalData.status === 'ok') ? T.success : T.accentGold }}>
                  {(previewTransferModalData.status === 'Terkirim' || previewTransferModalData.status === 'Approved' || previewTransferModalData.status === 'ok') ? '🟢 APPROVED / TERKIRIM' : '⏳ PENDING'}
                </span>
              </div>
            </div>

            <button onClick={() => setPreviewTransferModalData(null)} style={{ padding: '10px', background: T.border, color: T.txtPrimary, border: 'none', borderRadius: '8px', fontWeight: '800', cursor: 'pointer' }}>
              Tutup Pratinjau
            </button>
          </div>
        </div>
      )}

      {/* 6. MODAL PRATINJAU BARANG RUSAK (PREVIEW WASTE REPORT) */}
      {previewWasteModalData && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999 }}>
          <div className="glass-card animate-fade-in" style={{ padding: '24px', width: '520px', background: T.cardBg, border: `1px solid ${T.danger}`, borderRadius: '14px', display: 'flex', flexDirection: 'column', gap: '16px', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${T.border}`, paddingBottom: '10px' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: '900', color: T.txtPrimary, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Trash2 size={20} color={T.danger} />
                <span>Pratinjau Laporan Barang Rusak {previewWasteModalData.report_no || previewWasteModalData.id}</span>
              </h3>
              <button onClick={() => setPreviewWasteModalData(null)} style={{ background: 'none', border: 'none', color: T.txtSecondary, cursor: 'pointer', fontWeight: '900', fontSize: '1.2rem' }}>✕</button>
            </div>

            {(() => {
              const reportNo = previewWasteModalData.report_no || previewWasteModalData.id;
              const allWasteList = [...(masterData.damagedGoods || []), ...(masterData.approvedWaste || []), ...(masterData.stockMovement || []).filter(m => m.type === 'WASTE')];
              const matchingItems = allWasteList.filter(
                x => (x.report_no && String(x.report_no) === String(reportNo)) || String(x.id) === String(previewWasteModalData.id)
              );
              const uniqueMap = new Map();
              matchingItems.forEach(x => {
                const itemKey = x.id || `${x.item_name || x.nama_barang}-${x.qty || x.stok_rusak}-${x.unit}`;
                if (!uniqueMap.has(itemKey)) {
                  uniqueMap.set(itemKey, x);
                }
              });
              const itemsList = uniqueMap.size > 0 ? Array.from(uniqueMap.values()) : [previewWasteModalData];
              const isApproved = previewWasteModalData.status === 'ok' || previewWasteModalData.status === 'approved' || previewWasteModalData.status === 'Approved' || previewWasteModalData.status === 'ACC' || previewWasteModalData.is_approved;

              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.85rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: T.txtSecondary }}>📋 No. Laporan:</span>
                    <span style={{ fontWeight: '900', color: T.danger }}>{reportNo}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: T.txtSecondary }}>📅 Tanggal Pencatatan:</span>
                    <span style={{ fontWeight: '800', color: T.txtPrimary }}>{previewWasteModalData.date}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: T.txtSecondary }}>👤 Diisi Oleh:</span>
                    <span style={{ fontWeight: '800', color: T.txtPrimary }}>👤 {previewWasteModalData.submitted_by || previewWasteModalData.created_by || 'Admin'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: T.txtSecondary }}>🏢 Outlet Cabang:</span>
                    <span style={{ fontWeight: '800', color: T.txtPrimary }}>🏢 {getOutletName(previewWasteModalData.outlet_id)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: T.txtSecondary }}>⚡ Status Persetujuan:</span>
                    <span style={{ fontWeight: '900', color: isApproved ? T.success : T.accentGold }}>
                      {isApproved ? '🟢 APPROVED' : '⏳ PENDING'}
                    </span>
                  </div>

                  {/* List Item Bahan Baku */}
                  <div style={{ background: T.cardBg2, borderRadius: '10px', padding: '12px', border: `1px solid ${T.border}`, marginTop: '4px' }}>
                    <div style={{ fontWeight: '800', color: T.danger, marginBottom: '8px', fontSize: '0.80rem' }}>
                      🥬 Rincian Bahan Baku Rusak ({itemsList.length} Item):
                    </div>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.80rem' }}>
                      <thead>
                        <tr style={{ background: T.cardBg, color: T.txtSecondary, borderBottom: `1px solid ${T.border}` }}>
                          <th style={{ padding: '6px', textAlign: 'left' }}>Bahan Baku</th>
                          <th style={{ padding: '6px', textAlign: 'right' }}>Jumlah</th>
                          <th style={{ padding: '6px', textAlign: 'left' }}>Alasan</th>
                        </tr>
                      </thead>
                      <tbody>
                        {itemsList.map((row, i) => (
                          <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', color: T.txtPrimary }}>
                            <td style={{ padding: '6px', fontWeight: '800', color: T.info }}>📦 {row.item_name}</td>
                            <td style={{ padding: '6px', textAlign: 'right', fontWeight: '900', color: T.danger }}>-{row.qty || row.stok_rusak} {row.unit}</td>
                            <td style={{ padding: '6px', color: T.danger }}>⚠️ {row.damage_reason || row.reason || 'Lainnya'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <button onClick={() => setPreviewWasteModalData(null)} style={{ padding: '10px', background: T.border, color: T.txtPrimary, border: 'none', borderRadius: '8px', fontWeight: '800', cursor: 'pointer', marginTop: '6px' }}>
                    Tutup Pratinjau
                  </button>
                </div>
              );
            })()}
          </div>
        </div>
      )}
      {/* ========================================================= */}
      {/* ADD / EDIT SALES TRANSACTION MODAL                        */}
      {/* ========================================================= */}
      {showAddSalesModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 110 }}>
          <div className="glass-card animate-fade-in" style={{ padding: '24px', width: '780px', maxHeight: '90vh', overflowY: 'auto', border: `1px solid ${T.info}`, background: T.cardBg2, borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${T.border}`, paddingBottom: '14px' }}>
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: '900', color: T.txtPrimary, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ShoppingBag size={22} color={T.info} />
                  <span>{editingOutflowRecord ? `Edit Transaksi Penjualan (${salesNo})` : '🛍️ Tambah Transaksi Penjualan (Input Order POS Manual)'}</span>
                </h3>
                <p style={{ fontSize: '0.78rem', color: T.txtSecondary, margin: '4px 0 0 0' }}>
                  Input transaksi penjualan menu. Stok bahan baku akan terhitung & terpotong secara otomatis berdasarkan resep.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setShowAddSalesModal(false);
                  setEditingOutflowRecord(null);
                }}
                style={{ background: 'none', border: 'none', color: T.txtSecondary, fontSize: '1.2rem', cursor: 'pointer', fontWeight: '800' }}
              >
                ✕
              </button>
            </div>

            {/* General Info Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px', background: T.cardBg, padding: '16px', borderRadius: '12px', border: `1px solid ${T.border}` }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: '800', color: T.txtPrimary }}>📅 Tanggal Transaksi</label>
                <input
                  type="date"
                  value={salesDate}
                  onChange={e => setSalesDate(e.target.value)}
                  style={{ padding: '8px 12px', background: T.cardBg2, border: `1px solid ${T.border}`, borderRadius: '6px', color: T.txtPrimary, fontSize: '0.85rem', fontWeight: '700' }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: '800', color: T.txtPrimary }}>🎫 No. Transaksi / Struk</label>
                <input
                  type="text"
                  value={salesNo}
                  onChange={e => setSalesNo(e.target.value)}
                  style={{ padding: '8px 12px', background: T.cardBg2, border: `1px solid ${T.border}`, borderRadius: '6px', color: T.info, fontSize: '0.85rem', fontWeight: '900' }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: '800', color: T.txtPrimary }}>🏢 Outlet / Cabang</label>
                <select
                  value={salesOutletId}
                  onChange={e => setSalesOutletId(Number(e.target.value))}
                  style={{ padding: '8px 12px', background: T.cardBg2, border: `1px solid ${T.border}`, borderRadius: '6px', color: T.txtPrimary, fontSize: '0.85rem', fontWeight: '700' }}
                >
                  {outlets.map(o => (
                    <option key={o.id} value={o.id}>{o.name}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: '800', color: T.txtPrimary }}>👤 Kasir / Admin Pengaju</label>
                <input
                  type="text"
                  value={salesCreatedBy}
                  onChange={e => setSalesCreatedBy(e.target.value)}
                  style={{ padding: '8px 12px', background: T.cardBg2, border: `1px solid ${T.border}`, borderRadius: '6px', color: T.txtPrimary, fontSize: '0.85rem', fontWeight: '700' }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: '800', color: T.txtPrimary }}>⚡ Status Pembayaran</label>
                <select
                  value={salesStatus}
                  onChange={e => setSalesStatus(e.target.value)}
                  style={{ padding: '8px 12px', background: T.cardBg2, border: `1px solid ${T.border}`, borderRadius: '6px', color: salesStatus === 'Paid' ? T.success : T.accentGold, fontSize: '0.85rem', fontWeight: '900' }}
                >
                  <option value="Paid">🟢 Paid (Lunas)</option>
                  <option value="Pending">⏳ Pending (Belum Lunas)</option>
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: '800', color: T.txtPrimary }}>💳 Metode Pembayaran</label>
                <select
                  value={salesPaymentMethod}
                  onChange={e => setSalesPaymentMethod(e.target.value)}
                  style={{ padding: '8px 12px', background: T.cardBg2, border: `1px solid ${T.border}`, borderRadius: '6px', color: T.txtPrimary, fontSize: '0.85rem', fontWeight: '700' }}
                >
                  <option value="Cash">Cash (Tunai)</option>
                  <option value="QRIS">QRIS</option>
                  <option value="Transfer">Transfer Bank</option>
                  <option value="Debit">Kartu Debit</option>
                </select>
              </div>
            </div>

            {/* Menu Items Batch Table */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.9rem', fontWeight: '800', color: T.txtPrimary, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>🍔 Rincian Menu Penjualan</span>
                  <span style={{ fontSize: '0.75rem', color: T.txtSecondary }}>({salesMenuRows.length} item)</span>
                </span>
                <button
                  type="button"
                  onClick={handleAddSalesMenuRow}
                  style={{ padding: '6px 12px', background: 'rgba(99,102,241,0.15)', border: `1px solid ${T.info}`, color: T.info, borderRadius: '6px', fontSize: '0.78rem', fontWeight: '800', cursor: 'pointer' }}
                >
                  + Tambah Menu
                </button>
              </div>

              <div style={{ overflowX: 'auto', border: `1px solid ${T.border}`, borderRadius: '10px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                  <thead>
                    <tr style={{ background: T.cardBg, color: T.txtPrimary, borderBottom: `1px solid ${T.border}`, textTransform: 'uppercase', fontSize: '0.72rem', fontWeight: '800' }}>
                      <th style={{ padding: '10px 12px' }}>Pilih Product / Menu</th>
                      <th style={{ padding: '10px 12px', width: '190px' }}>🌶️ Varian Menu / Opsi</th>
                      <th style={{ padding: '10px 12px', width: '90px', textAlign: 'center' }}>Qty Sold</th>
                      <th style={{ padding: '10px 12px', width: '130px', textAlign: 'right' }}>Harga Satuan</th>
                      <th style={{ padding: '10px 12px', width: '140px', textAlign: 'right' }}>Subtotal</th>
                      <th style={{ padding: '10px 12px', width: '50px', textAlign: 'center' }}>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {salesMenuRows.map((row, idx) => {
                      const availVars = getProductVariants(row.product_name);

                      return (
                        <tr key={row.id || idx} style={{ borderBottom: `1px solid ${T.border}` }}>
                          {/* 1. PRODUCT NAME */}
                          <td style={{ padding: '10px 12px' }}>
                            <input
                              type="text"
                              list={`prod-list-${idx}`}
                              placeholder="Cari / Pilih Nama Menu..."
                              value={row.product_name}
                              onChange={e => handleUpdateSalesMenuRow(idx, 'product_name', e.target.value)}
                              style={{ width: '100%', padding: '8px', background: T.cardBg2, border: `1px solid ${T.border}`, borderRadius: '6px', color: T.txtPrimary, fontSize: '0.82rem', fontWeight: '700' }}
                            />
                            <datalist id={`prod-list-${idx}`}>
                              {(masterData.products || []).map(p => (
                                <option key={p.id} value={p.name} />
                              ))}
                            </datalist>
                          </td>

                          {/* 2. VARIAN MENU / OPSI */}
                          <td style={{ padding: '10px 12px' }}>
                            {availVars.length > 0 ? (
                              <select
                                value={row.variant_name || ''}
                                onChange={e => handleUpdateSalesMenuRow(idx, 'variant_name', e.target.value)}
                                style={{ width: '100%', padding: '8px', background: T.cardBg2, border: `1px solid ${T.info}`, borderRadius: '6px', color: T.info, fontSize: '0.82rem', fontWeight: '800', cursor: 'pointer' }}
                              >
                                <option value="">-- Normal / Standard --</option>
                                {availVars.map((v, vIdx) => (
                                  <option key={vIdx} value={v.name}>
                                    {v.name} {v.price ? `(+${formatRupiah(v.price)})` : ''}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <input
                                type="text"
                                list={`var-list-${idx}`}
                                placeholder="Ketik varian (opsional)..."
                                value={row.variant_name || ''}
                                onChange={e => handleUpdateSalesMenuRow(idx, 'variant_name', e.target.value)}
                                style={{ width: '100%', padding: '8px', background: T.cardBg2, border: `1px solid ${T.border}`, borderRadius: '6px', color: T.info, fontSize: '0.82rem', fontWeight: '700' }}
                              />
                            )}
                            <datalist id={`var-list-${idx}`}>
                              <option value="Sambal Pecak" />
                              <option value="Sambal Ijo" />
                              <option value="Pedas Level 1" />
                              <option value="Pedas Level 2" />
                              <option value="Pedas Level 3" />
                              <option value="Hot" />
                              <option value="Ice / Dingin" />
                              <option value="Large" />
                              <option value="Regular" />
                              <option value="Extra Topping" />
                            </datalist>
                          </td>

                          {/* 3. QTY */}
                          <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                            <input
                              type="number"
                              min="1"
                              value={row.qty}
                              onChange={e => handleUpdateSalesMenuRow(idx, 'qty', Math.max(1, Number(e.target.value)))}
                              style={{ width: '70px', padding: '8px', background: T.cardBg2, border: `1px solid ${T.border}`, borderRadius: '6px', color: T.success, fontSize: '0.85rem', fontWeight: '900', textAlign: 'center' }}
                            />
                          </td>

                          {/* 4. HARGA SATUAN */}
                          <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                            <input
                              type="number"
                              value={row.price}
                              onChange={e => handleUpdateSalesMenuRow(idx, 'price', Number(e.target.value))}
                              style={{ width: '110px', padding: '8px', background: T.cardBg2, border: `1px solid ${T.border}`, borderRadius: '6px', color: T.txtPrimary, fontSize: '0.82rem', textAlign: 'right' }}
                            />
                          </td>

                          {/* 5. SUBTOTAL */}
                          <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: '900', color: T.info }}>
                            {formatRupiah(row.total || (row.qty * row.price))}
                          </td>

                          {/* 6. AKSI */}
                          <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                            <button
                              type="button"
                              onClick={() => handleRemoveSalesMenuRow(idx)}
                              style={{ background: 'rgba(244, 63, 94, 0.15)', border: '1px solid rgba(244, 63, 94, 0.4)', color: T.danger, borderRadius: '6px', padding: '6px', cursor: 'pointer' }}
                              title="Hapus baris menu"
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Total Omset Sales Summary */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '12px', background: T.cardBg, padding: '12px 16px', borderRadius: '8px', border: `1px solid ${T.border}` }}>
                <span style={{ fontSize: '0.85rem', fontWeight: '800', color: T.txtPrimary }}>Total Omset Penjualan:</span>
                <span style={{ fontSize: '1.2rem', fontWeight: '900', color: T.success }}>
                  {formatRupiah(salesMenuRows.reduce((sum, r) => sum + (Number(r.total) || 0), 0))}
                </span>
              </div>
            </div>

            {/* Modal Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', borderTop: `1px solid ${T.border}`, paddingTop: '16px' }}>
              <button
                type="button"
                onClick={() => {
                  setShowAddSalesModal(false);
                  setEditingOutflowRecord(null);
                }}
                className="btn-secondary"
                style={{ padding: '10px 18px', fontSize: '0.85rem' }}
              >
                Batal
              </button>

              <button
                type="button"
                onClick={handleSaveSalesTransaction}
                className="btn-primary"
                style={{ padding: '10px 24px', fontSize: '0.85rem', background: `${T.info}`, color: T.txtPrimary }}
              >
                ✓ Simpan Transaksi Penjualan
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* PREVIEW OUTFLOW TRANSACTION MODAL                         */}
      {/* ========================================================= */}
      {previewOutflowModalData && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 110 }}>
          <div className="glass-card animate-fade-in" style={{ padding: '24px', width: '680px', maxHeight: '85vh', overflowY: 'auto', border: '1px solid #818cf8', background: T.cardBg2, borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${T.border}`, paddingBottom: '12px' }}>
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: '900', color: T.info, margin: 0 }}>
                  📋 Detail Transaksi Penjualan ({previewOutflowModalData.receiptNo})
                </h3>
                <div style={{ fontSize: '0.78rem', color: T.txtSecondary, marginTop: '2px' }}>
                  Outlet: <strong style={{ color: T.txtPrimary }}>{getOutletName(previewOutflowModalData.outlet_id)}</strong> &bull; Tanggal: <strong style={{ color: T.txtPrimary }}>{previewOutflowModalData.date} ({previewOutflowModalData.time})</strong>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setPreviewOutflowModalData(null)}
                style={{ background: 'none', border: 'none', color: T.txtSecondary, fontSize: '1.2rem', cursor: 'pointer', fontWeight: '800' }}
              >
                ✕
              </button>
            </div>

            {/* Info Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
              <div style={{ background: T.cardBg, padding: '10px 12px', borderRadius: '8px', border: `1px solid ${T.border}` }}>
                <div style={{ fontSize: '0.72rem', color: T.txtSecondary }}>Pengaju / Kasir</div>
                <div style={{ fontSize: '0.85rem', fontWeight: '800', color: T.txtPrimary, marginTop: '2px' }}>👤 {previewOutflowModalData.created_by}</div>
              </div>
              <div style={{ background: T.cardBg, padding: '10px 12px', borderRadius: '8px', border: `1px solid ${T.border}` }}>
                <div style={{ fontSize: '0.72rem', color: T.txtSecondary }}>Status Pembayaran</div>
                <div style={{ fontSize: '0.85rem', fontWeight: '900', color: previewOutflowModalData.isPaid ? T.success : T.accentGold, marginTop: '2px' }}>
                  {previewOutflowModalData.isPaid ? '🟢 Paid (Lunas)' : '⏳ Pending'}
                </div>
              </div>
              <div style={{ background: T.cardBg, padding: '10px 12px', borderRadius: '8px', border: `1px solid ${T.border}` }}>
                <div style={{ fontSize: '0.72rem', color: T.txtSecondary }}>Metode Pembayaran</div>
                <div style={{ fontSize: '0.85rem', fontWeight: '800', color: T.info, marginTop: '2px' }}>💳 {previewOutflowModalData.payment_method || 'Cash'}</div>
              </div>
            </div>

            {/* Menu Items Table */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: '800', color: T.txtPrimary }}>🍔 Rincian Menu Penjualan</div>
              <div style={{ overflowX: 'auto', border: `1px solid ${T.border}`, borderRadius: '8px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                  <thead>
                    <tr style={{ background: T.cardBg, color: T.txtPrimary, textTransform: 'uppercase', fontSize: '0.70rem', fontWeight: '800' }}>
                      <th style={{ padding: '8px 12px' }}>Nama Menu</th>
                      <th style={{ padding: '8px 12px', textAlign: 'center' }}>Qty</th>
                      <th style={{ padding: '8px 12px', textAlign: 'right' }}>Harga Satuan</th>
                      <th style={{ padding: '8px 12px', textAlign: 'right' }}>Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(previewOutflowModalData.items || []).map((it, idx) => (
                      <tr key={idx} style={{ borderBottom: `1px solid ${T.border}` }}>
                        <td style={{ padding: '8px 12px', fontWeight: '700', color: T.txtPrimary }}>{it.name || it.product_name}</td>
                        <td style={{ padding: '8px 12px', textAlign: 'center', fontWeight: '800', color: T.success }}>{it.qty}</td>
                        <td style={{ padding: '8px 12px', textAlign: 'right', color: T.txtSecondary }}>{formatRupiah(it.price)}</td>
                        <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: '800', color: T.info }}>{formatRupiah(it.total || (it.qty * it.price))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div style={{ textAlign: 'right', fontSize: '0.9rem', fontWeight: '900', color: T.success, marginTop: '4px' }}>
                Total Omset: {formatRupiah(previewOutflowModalData.total_amount)}
              </div>
            </div>

            {/* Ingredients Deducted Table */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: '800', color: T.danger }}>🌾 Rincian Bahan Baku Terpotong Otomatis (Autoconsumption)</div>
              <div style={{ overflowX: 'auto', border: `1px solid ${T.border}`, borderRadius: '8px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                  <thead>
                    <tr style={{ background: T.cardBg, color: T.txtPrimary, textTransform: 'uppercase', fontSize: '0.70rem', fontWeight: '800' }}>
                      <th style={{ padding: '8px 12px' }}>Nama Bahan Baku</th>
                      <th style={{ padding: '8px 12px', textAlign: 'right' }}>Qty Terpotong</th>
                      <th style={{ padding: '8px 12px' }}>Satuan</th>
                      <th style={{ padding: '8px 12px', textAlign: 'right' }}>Estimasi HPP</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(previewOutflowModalData.deducted_ingredients || []).map((ing, idx) => (
                      <tr key={idx} style={{ borderBottom: `1px solid ${T.border}` }}>
                        <td style={{ padding: '8px 12px', fontWeight: '700', color: T.info }}>{ing.ingredient_name || ing.name}</td>
                        <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: '900', color: T.danger }}>-{ing.qty}</td>
                        <td style={{ padding: '8px 12px', color: T.txtPrimary }}>{ing.unit || 'kg'}</td>
                        <td style={{ padding: '8px 12px', textAlign: 'right', color: T.success, fontWeight: '700' }}>{formatRupiah(ing.cogs || 0)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: `1px solid ${T.border}`, paddingTop: '12px' }}>
              <button
                type="button"
                onClick={() => setPreviewOutflowModalData(null)}
                className="btn-primary"
                style={{ padding: '8px 18px', fontSize: '0.85rem' }}
              >
                Tutup
              </button>
            </div>

          </div>
        </div>
      )}

      {/* MODAL PRATINJAU DOKUMEN LAPORAN STOK OPNAME LENGKAP */}
      {previewOpnameReportModalData && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 120 }}>
          <div className="glass-card animate-fade-in" style={{ padding: '24px', width: '940px', maxHeight: '90vh', overflowY: 'auto', border: `1px solid ${T.info}`, display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${T.border}`, paddingBottom: '14px' }}>
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: '900', color: T.txtPrimary, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <CheckSquare size={22} color={T.success} />
                  <span>📋 Detail Hasil Audit Fisik Inventoris (Stok Opname)</span>
                </h3>
                <p style={{ fontSize: '0.80rem', color: T.txtSecondary, margin: '4px 0 0 0' }}>
                  Rincian lengkap item bahan baku, sisa stok sistem vs sisa stok fisik, dan denda stok.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPreviewOpnameReportModalData(null)}
                style={{ background: 'rgba(255,255,255,0.1)', border: `1px solid ${T.border}`, color: T.txtPrimary, padding: '6px 14px', borderRadius: '8px', cursor: 'pointer', fontWeight: '800', fontSize: '0.82rem' }}
              >
                ✕ Tutup
              </button>
            </div>

            {/* Meta Info Header Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', background: T.cardBg, padding: '16px', borderRadius: '12px', border: `1px solid ${T.border}` }}>
              <div>
                <span style={{ fontSize: '0.72rem', color: T.txtMuted, textTransform: 'uppercase', fontWeight: '800' }}>No. Laporan:</span>
                <div style={{ fontSize: '0.95rem', fontWeight: '900', color: T.info, marginTop: '2px' }}>
                  📄 {previewOpnameReportModalData.report_no || previewOpnameReportModalData.id}
                </div>
              </div>
              <div>
                <span style={{ fontSize: '0.72rem', color: T.txtMuted, textTransform: 'uppercase', fontWeight: '800' }}>Tanggal Audit:</span>
                <div style={{ fontSize: '0.92rem', fontWeight: '800', color: T.txtPrimary, marginTop: '2px' }}>
                  📅 {previewOpnameReportModalData.date}
                </div>
              </div>
              <div>
                <span style={{ fontSize: '0.72rem', color: T.txtMuted, textTransform: 'uppercase', fontWeight: '800' }}>Outlet:</span>
                <div style={{ fontSize: '0.92rem', fontWeight: '800', color: T.txtPrimary, marginTop: '2px' }}>
                  🏢 {getOutletName(previewOpnameReportModalData.outlet_id)}
                </div>
              </div>
              <div>
                <span style={{ fontSize: '0.72rem', color: T.txtMuted, textTransform: 'uppercase', fontWeight: '800' }}>Dibuat Oleh:</span>
                <div style={{ fontSize: '0.92rem', fontWeight: '800', color: T.txtPrimary, marginTop: '2px' }}>
                  👤 {previewOpnameReportModalData.created_by || previewOpnameReportModalData.submitted_by || 'Admin'}
                </div>
              </div>
            </div>

            {/* Rincian Tabel Bahan Baku */}
            <div style={{ overflowX: 'auto', border: `1px solid ${T.border}`, borderRadius: '10px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.80rem', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: T.cardBg, borderBottom: `1px solid ${T.border}`, color: T.txtSecondary, fontWeight: '800', textTransform: 'uppercase', fontSize: '0.70rem' }}>
                    <th style={{ padding: '10px 12px' }}>Nama Item</th>
                    <th style={{ padding: '10px 12px', textAlign: 'right' }}>Stok Awal</th>
                    <th style={{ padding: '10px 12px', textAlign: 'right', color: T.info }}>Stok Masuk</th>
                    <th style={{ padding: '10px 12px', textAlign: 'right', color: T.danger }}>Stok Keluar</th>
                    <th style={{ padding: '10px 12px', textAlign: 'right', color: T.success }}>Trans. Masuk</th>
                    <th style={{ padding: '10px 12px', textAlign: 'right', color: T.danger }}>Trans. Keluar</th>
                    <th style={{ padding: '10px 12px', textAlign: 'right', color: T.danger }}>Stok Rusak</th>
                    <th style={{ padding: '10px 12px', textAlign: 'right' }}>Sistem</th>
                    <th style={{ padding: '10px 12px', textAlign: 'right', color: T.success, fontWeight: '900' }}>Fisik</th>
                    <th style={{ padding: '10px 12px', textAlign: 'center' }}>Analisis Selisih</th>
                    <th style={{ padding: '10px 12px', textAlign: 'right' }}>Harga Satuan</th>
                    <th style={{ padding: '10px 12px', textAlign: 'right', color: T.danger }}>Denda Stok</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const op = previewOpnameReportModalData;
                    const itemsList = op.items || [op];

                    let grandDenda = 0;

                    return (
                      <>
                        {itemsList.map((item, idx) => {
                          const autoSalesKeluar = getAutoSalesOutflowForIngredient(item.item_name || item.name, op.outlet_id);
                          const autoWasteQty = getAutoWasteForIngredient(item.item_name || item.name, op.outlet_id, op.date);
                          const currentStokKeluar = item.stok_keluar !== undefined && item.stok_keluar > 0 ? item.stok_keluar : autoSalesKeluar;
                          const currentStokRusak = item.stok_rusak !== undefined && item.stok_rusak > 0 ? item.stok_rusak : autoWasteQty;

                          const sSistem = (item.stok_awal || 0) + (item.stok_masuk || 0) + (item.transfer_masuk || 0) - (currentStokKeluar + currentStokRusak + (item.transfer_keluar || 0));
                          const diffVal = (item.stok_fisik || 0) - sSistem;
                          const selisihStatus = getSelisihStatus(sSistem, item.stok_fisik || 0);
                          const activePrice = getItemPriceFromStokMasuk(item.item_name || item.name) || item.harga_satuan || 0;
                          const isDefisit = (item.stok_fisik || 0) < sSistem;
                          const dendaVal = isDefisit ? Math.abs(sSistem - (item.stok_fisik || 0)) * activePrice : 0;
                          grandDenda += dendaVal;

                          return (
                            <tr key={idx} style={{ borderBottom: `1px solid ${T.border}`, color: T.txtPrimary }}>
                              <td style={{ padding: '10px 12px', fontWeight: '800', color: T.success }}>📦 {item.item_name || item.name}</td>
                              <td style={{ padding: '10px 12px', textAlign: 'right' }}>{item.stok_awal || 0} {item.unit || 'kg'}</td>
                              <td style={{ padding: '10px 12px', textAlign: 'right', color: T.info, fontWeight: '700' }}>+{item.stok_masuk || 0}</td>
                              <td style={{ padding: '10px 12px', textAlign: 'right', color: T.danger, fontWeight: '700' }}>-{currentStokKeluar}</td>
                              <td style={{ padding: '10px 12px', textAlign: 'right', color: T.success }}>+{item.transfer_masuk || 0}</td>
                              <td style={{ padding: '10px 12px', textAlign: 'right', color: T.danger }}>-{item.transfer_keluar || 0}</td>
                              <td style={{ padding: '10px 12px', textAlign: 'right', color: T.danger }}>-{currentStokRusak}</td>
                              <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: '800' }}>{sSistem}</td>
                              <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: '900', color: T.info, fontSize: '0.86rem' }}>{item.stok_fisik || 0} {item.unit || 'kg'}</td>
                              <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                                <span style={{
                                  padding: '3px 8px', borderRadius: '6px', fontSize: '0.70rem', fontWeight: '800',
                                  color: selisihStatus.color, background: selisihStatus.bg, border: `1px solid ${selisihStatus.border}`,
                                  textTransform: 'uppercase'
                                }}>
                                  {selisihStatus.text}
                                </span>
                              </td>
                              <td style={{ padding: '10px 12px', textAlign: 'right' }}>{formatRupiah(activePrice)}</td>
                              <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: '800', color: dendaVal > 0 ? T.danger : T.txtMuted }}>
                                {dendaVal > 0 ? formatRupiah(dendaVal) : '-'}
                              </td>
                            </tr>
                          );
                        })}
                        <tr style={{ background: T.cardBg, fontWeight: '900', borderTop: `2px solid ${T.border}` }}>
                          <td colSpan={11} style={{ padding: '12px 10px', textAlign: 'right', color: T.danger, textTransform: 'uppercase' }}>
                            <span>💸 TOTAL AKUMULASI DENDA STOK:</span>
                          </td>
                          <td style={{ padding: '12px 10px', textAlign: 'right', color: T.danger, fontSize: '0.95rem', background: 'rgba(244, 63, 94, 0.15)' }}>
                            {formatRupiah(grandDenda)}
                          </td>
                        </tr>
                      </>
                    );
                  })()}
                </tbody>
              </table>
            </div>

            {/* Modal Actions */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
              <div style={{ fontSize: '0.80rem', color: T.txtSecondary }}>
                Catatan Audit: <strong style={{ color: T.txtPrimary }}>{previewOpnameReportModalData.notes || 'Tidak ada catatan'}</strong>
              </div>
              <button
                type="button"
                onClick={() => setPreviewOpnameReportModalData(null)}
                style={{ padding: '10px 24px', background: T.info, color: '#000000', border: 'none', borderRadius: '8px', fontWeight: '900', fontSize: '0.85rem', cursor: 'pointer' }}
              >
                Selesai &amp; Tutup
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
