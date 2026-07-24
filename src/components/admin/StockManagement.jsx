import React, { useState, useEffect } from 'react';
import { 
  Package, 
  ArrowDownRight, 
  ArrowUpRight, 
  AlertTriangle, 
  CheckSquare, 
  CheckCircle2,
  Plus, 
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
  Smartphone
} from 'lucide-react';
import { DoubleCalendarPicker, buildExportFilename, getOutletNameStrForExport } from './SalesTransactionsPage';
import PaginationControls from './PaginationControls';

export default function StockManagement({ masterData, setMasterData, selectedBranch }) {
  const outlets = masterData.outlets || [];
  const formatRupiah = (num) => {
    return 'Rp ' + Number(num || 0).toLocaleString('id-ID');
  };

  const [activeSubTab, setActiveSubTab] = useState('stok_masuk'); // 'stok_masuk' | 'stok_keluar' | 'transfer_stok' | 'stok_rusak' | 'stok_opname'

  // Pagination States (Default 25 rows per page)
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

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
    qty: true,
    unit: true,
    status: true,
    notes: true,
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

  // MASTER DATA LISTS WITH FALLBACKS
  const ingredientsList = masterData.ingredients && masterData.ingredients.length > 0 
    ? masterData.ingredients 
    : [
        { id: 1, name: 'Beras Pandan Wangi', unit: 'kg' },
        { id: 2, name: 'Minyak Goreng Bimoli', unit: 'liter' },
        { id: 3, name: 'Telur Ayam Negeri', unit: 'butir' },
        { id: 4, name: 'Daging Ayam Fillet', unit: 'kg' },
        { id: 5, name: 'Cabai Rawit Merah', unit: 'kg' },
        { id: 6, name: 'Bawang Merah', unit: 'kg' },
        { id: 7, name: 'Teh Celup Premium', unit: 'pcs' },
        { id: 8, name: 'Gula Pasir Putih', unit: 'kg' }
      ];

  const suppliersList = masterData.suppliers && masterData.suppliers.length > 0
    ? masterData.suppliers
    : [
        { id: 1, name: 'PT Sembako Nusantara' },
        { id: 2, name: 'UD Sayur Segar Jaya' },
        { id: 3, name: 'PT Pangan Mandiri' },
        { id: 4, name: 'Toko Bumbu Lestari' }
      ];

  const userRightsList = masterData.userRights || [
    { id: 1, name: 'Budi Santoso', role: 'Super Admin / Owner', status: 'Aktif' },
    { id: 2, name: 'Siti Aminah', role: 'Manajer Cabang (Branch Manager)', status: 'Aktif' },
    { id: 3, name: 'Adi Wijaya', role: 'Kasir / Staf Keuangan', status: 'Aktif' },
    { id: 4, name: 'Rian Kurnia', role: 'Kepala Dapur / Head Chef', status: 'Aktif' }
  ];

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

    return baseList;
  };

  const getTransfersList = () => {
    return masterData.stockTransfer || [];
  };

  const getOpnameList = () => {
    return masterData.stockOpname || [];
  };

  const calculateStockOpnameBySystem = () => {
    const movements = getMovementsList();
    const dateSet = new Set();
    const todayStr = new Date().toISOString().split('T')[0];
    dateSet.add(todayStr);

    movements.forEach(m => { if (m.date) dateSet.add(m.date); });
    (masterData.stockOutflow || []).forEach(s => { if (s.date) dateSet.add(s.date); });
    (masterData.stockTransfer || []).forEach(t => { if (t.date) dateSet.add(t.date); });
    (masterData.damagedGoods || []).forEach(d => { if (d.date) dateSet.add(d.date); });
    (masterData.stockOpname || []).forEach(o => { if (o.date) dateSet.add(o.date); });

    const sortedDates = Array.from(dateSet).sort();
    const targetOutlets = outlets.length > 0 ? outlets : [{ id: 1, name: 'Gourmet Bistro - Senopati' }];

    const targetIngredients = ingredientsList.length > 0 ? ingredientsList : [
      { id: 1, name: 'Daging Ayam Fillet', unit: 'kg' },
      { id: 2, name: 'Beras Pandan Wangi', unit: 'kg' },
      { id: 3, name: 'Minyak Goreng Bimoli', unit: 'liter' }
    ];

    const prevEndingStockMap = {};
    const allCalculatedRows = [];

    sortedDates.forEach(dateStr => {
      targetOutlets.forEach(out => {
        targetIngredients.forEach(ing => {
          const itemKey = `${out.id}_${ing.name}`;
          const manualKey = `${dateStr}_${out.id}_${ing.name}`;

          // 1. Stok Masuk
          const inQty = movements
            .filter(m => m.type === 'IN' && String(m.outlet_id) === String(out.id) && (m.item_name || m.itemName) === ing.name && m.date === dateStr)
            .reduce((sum, m) => sum + Number(m.qty || 0), 0);

          // 2. Stok Keluar (Penjualan POS)
          const outSalesQty = (masterData.stockOutflow || [])
            .filter(s => String(s.outletId || s.branch_id || 1) === String(out.id) && s.itemName === ing.name && s.date === dateStr)
            .reduce((sum, s) => sum + Math.abs(Number(s.qty || 0)), 0);

          // 3. Transfer Stok In (Penerimaan)
          const transferInQty = (masterData.stockTransfer || [])
            .filter(t => (Number(t.to_outlet_id || t.toOutletId) === Number(out.id) || t.toOutletName === out.name) && (t.item_name || t.itemName) === ing.name && t.date === dateStr)
            .reduce((sum, t) => sum + Number(t.qty || 0), 0);

          // 4. Transfer Stok Out (Pengiriman)
          const transferOutQty = (masterData.stockTransfer || [])
            .filter(t => (Number(t.from_outlet_id || t.fromOutletId) === Number(out.id) || t.fromOutletName === out.name) && (t.item_name || t.itemName) === ing.name && t.date === dateStr)
            .reduce((sum, t) => sum + Number(t.qty || 0), 0);

          // 5. Stok Rusak
          const rusakQty = (masterData.damagedGoods || [])
            .filter(d => (Number(d.outletId || d.outlet_id || 1) === Number(out.id) || d.outletName === out.name) && (d.itemName || d.item_name) === ing.name && d.date === dateStr)
            .reduce((sum, d) => sum + Number(d.qty || 0), 0);

          // 6. Stok Awal: Manual Override > Previous Ending Stock > Default
          let stokAwal = 0;
          if (manualStokAwalMap[manualKey] !== undefined && manualStokAwalMap[manualKey] !== '') {
            stokAwal = Number(manualStokAwalMap[manualKey]);
          } else if (prevEndingStockMap[itemKey] !== undefined) {
            stokAwal = prevEndingStockMap[itemKey];
          } else {
            stokAwal = Number(ing.initialStock || 0);
          }

          // 7. Sisa Stok by Sistem Formula: (Stok Awal + Stok Masuk + Transfer In) - (Stok Keluar + Transfer Out + Stok Rusak)
          const sisaStokSystem = (stokAwal + inQty + transferInQty) - (outSalesQty + transferOutQty + rusakQty);

          // Save for next date iteration
          prevEndingStockMap[itemKey] = sisaStokSystem;

          // Filter checks
          const matchesOutlet = logSelectedOutletIds.includes('ALL') || logSelectedOutletIds.includes(out.id) || logSelectedOutletIds.includes(String(out.id));
          const matchesDate = (!logStartDate || dateStr >= logStartDate) && (!logEndDate || dateStr <= logEndDate);

          if (matchesOutlet && matchesDate) {
            allCalculatedRows.push({
              id: `op-sys-${dateStr}-${out.id}-${ing.id || ing.name}`,
              date: dateStr,
              outletId: out.id,
              outletName: out.name,
              itemName: ing.name,
              unit: ing.unit || 'kg',
              stokAwal,
              stokMasuk: inQty,
              stokKeluar: outSalesQty,
              transferIn: transferInQty,
              transferOut: transferOutQty,
              stokRusak: rusakQty,
              sisaStokSystem,
              manualKey,
              hasManualOverride: manualStokAwalMap[manualKey] !== undefined && manualStokAwalMap[manualKey] !== ''
            });
          }
        });
      });
    });

    return allCalculatedRows.sort((a, b) => b.date.localeCompare(a.date));
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
    if (masukRecords.length === 0) return true;

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
    { ingredientId: ingredientsList[0]?.id || '', supplierId: suppliersList[0]?.id || '', qty: '', priceUnit: '', searchQuery: '' },
    { ingredientId: ingredientsList[0]?.id || '', supplierId: suppliersList[0]?.id || '', qty: '', priceUnit: '', searchQuery: '' },
    { ingredientId: ingredientsList[0]?.id || '', supplierId: suppliersList[0]?.id || '', qty: '', priceUnit: '', searchQuery: '' },
    { ingredientId: ingredientsList[0]?.id || '', supplierId: suppliersList[0]?.id || '', qty: '', priceUnit: '', searchQuery: '' },
    { ingredientId: ingredientsList[0]?.id || '', supplierId: suppliersList[0]?.id || '', qty: '', priceUnit: '', searchQuery: '' }
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

  // Stok Rusak Form States
  const [rusakDate, setRusakDate] = useState(new Date().toISOString().split('T')[0]);
  const [rusakCreatedBy, setRusakCreatedBy] = useState(userRightsList[0] ? userRightsList[0].name : 'Admin');
  const [rusakOutletId, setRusakOutletId] = useState(1);
  const [rusakSearchQuery, setRusakSearchQuery] = useState('');
  const [rusakIngredientId, setRusakIngredientId] = useState(ingredientsList[0] ? ingredientsList[0].id : 1);
  const [rusakQty, setRusakQty] = useState('');
  const [rusakUnit, setRusakUnit] = useState(ingredientsList[0] ? ingredientsList[0].unit : 'kg');
  const [rusakNotes, setRusakNotes] = useState('');

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

  // HELPER FUNCTIONS
  const getOutletName = (id) => {
    const found = masterData.outlets.find(o => o.id === Number(id));
    return found ? found.name : `Outlet #${id}`;
  };

  const getSelisihStatus = (sistem, fisik) => {
    if (sistem === fisik) return { text: 'Pas', color: '#34d399', bg: 'rgba(52, 211, 153, 0.15)', border: 'rgba(52, 211, 153, 0.3)' };
    if (sistem > fisik) return { text: 'SOP tidak berjalan', color: '#fbbf24', bg: 'rgba(245, 158, 11, 0.15)', border: 'rgba(245, 158, 11, 0.3)' };
    return { text: 'Kehilangan', color: '#f43f5e', bg: 'rgba(244, 63, 94, 0.15)', border: 'rgba(244, 63, 94, 0.3)' };
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
    setManualRows([...manualRows, { ingredientId: ingredientsList[0].id, supplierId: suppliersList[0].id, qty: '', priceUnit: '', searchQuery: '' }]);
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

      // FALLBACK DETERMINISTIC DEDUCTION FOR IMPLICIT TRANSACTIONS
      let remainingAmount = tx.amount || 0;
      let seed = (typeof tx.id === 'number' ? tx.id : 1234) * 17;
      const sortedProducts = [...activeProducts].sort((a,b) => b.price - a.price);

      sortedProducts.forEach((p, idx) => {
        if (remainingAmount <= 0) return;

        const pSeed = (seed + idx * 9) % 10;
        if (pSeed < 6 && remainingAmount >= p.price) {
          const qtySold = Math.floor(remainingAmount / p.price) || 1;
          remainingAmount -= qtySold * p.price;
          mapItemToRawMaterials(p.name, qtySold, `${tx.id}-${p.id}`);
        }
      });
    });

    return deductions.filter(d => !deletedOutflowIds.includes(d.id) && d.itemType === 'Bahan Baku');
  };

  const filteredStockOutflow = generateStockDeductions();

  // FILTERED DATA SELECTORS
  const getFilteredMasuk = () => {
    return getMovementsList().filter(m => {
      if (m.type !== 'IN') return false;
      if (logStartDate && m.date < logStartDate) return false;
      if (logEndDate && m.date > logEndDate) return false;
      if (!logSelectedOutletIds.includes('ALL') && !logSelectedOutletIds.includes(m.outlet_id)) return false;
      if (selectedBranch && m.outlet_id !== selectedBranch) return false;
      return true;
    });
  };

  const getFilteredTransfer = () => {
    return getTransfersList().filter(t => {
      if (logStartDate && t.date < logStartDate) return false;
      if (logEndDate && t.date > logEndDate) return false;
      
      const matchFrom = logSelectedOutletIds.includes('ALL') || logSelectedOutletIds.includes(t.from_outlet_id);
      const matchTo = logSelectedOutletIds.includes('ALL') || logSelectedOutletIds.includes(t.to_outlet_id);
      if (!matchFrom && !matchTo) return false;

      if (selectedBranch && t.from_outlet_id !== selectedBranch && t.to_outlet_id !== selectedBranch) return false;
      return true;
    });
  };

  const getFilteredRusak = () => {
    return getMovementsList().filter(m => {
      if (m.type !== 'WASTE') return false;
      if (logStartDate && m.date < logStartDate) return false;
      if (logEndDate && m.date > logEndDate) return false;
      if (!logSelectedOutletIds.includes('ALL') && !logSelectedOutletIds.includes(m.outlet_id)) return false;
      if (selectedBranch && m.outlet_id !== selectedBranch) return false;
      return true;
    });
  };

  const getFilteredOpname = () => {
    return getOpnameList().filter(op => {
      if (logStartDate && op.date < logStartDate) return false;
      if (logEndDate && op.date > logEndDate) return false;
      if (!logSelectedOutletIds.includes('ALL') && !logSelectedOutletIds.includes(op.outlet_id)) return false;
      if (selectedBranch && op.outlet_id !== selectedBranch) return false;
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
    const validRows = manualRows.filter(row => row.qty && row.priceUnit);
    if (validRows.length === 0) {
      alert('Isi minimal 1 item dengan Jumlah dan Harga yang valid');
      return;
    }

    const newMovements = validRows.map((row, idx) => {
      const ing = ingredientsList.find(i => i.id === Number(row.ingredientId)) || { name: 'Item', unit: 'pcs' };
      const sup = suppliersList.find(s => s.id === Number(row.supplierId)) || { name: '-' };
      const qtyVal = Number(row.qty);
      const prcVal = Number(row.priceUnit);

      return {
        id: `mv-${Date.now()}-${idx}`,
        date: manualDate,
        outlet_id: Number(manualOutletId),
        type: 'IN',
        item_name: ing.name,
        qty: qtyVal,
        unit: ing.unit || 'pcs',
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
      { ingredientId: ingredientsList[0].id, supplierId: suppliersList[0].id, qty: '', priceUnit: '', searchQuery: '' },
      { ingredientId: ingredientsList[0].id, supplierId: suppliersList[0].id, qty: '', priceUnit: '', searchQuery: '' },
      { ingredientId: ingredientsList[0].id, supplierId: suppliersList[0].id, qty: '', priceUnit: '', searchQuery: '' },
      { ingredientId: ingredientsList[0].id, supplierId: suppliersList[0].id, qty: '', priceUnit: '', searchQuery: '' },
      { ingredientId: ingredientsList[0].id, supplierId: suppliersList[0].id, qty: '', priceUnit: '', searchQuery: '' }
    ]);
    setShowPreviewModal(false);
    setShowAddModal(null);
  };

  // DELETE LOGISTIC RECORD
  const handleDeleteRecord = (id, tabType) => {
    if (!window.confirm('Apakah Anda yakin ingin menghapus data logistik ini secara permanen?')) return;

    if (tabType === 'stok_masuk' || tabType === 'stok_rusak') {
      setMasterData(prev => ({
        ...prev,
        stockMovement: (prev.stockMovement || []).filter(item => item.id !== id)
      }));
    } else if (tabType === 'stok_keluar') {
      const updated = [...deletedOutflowIds, id];
      setDeletedOutflowIds(updated);
      setMasterData(prev => ({
        ...prev,
        deletedOutflowIds: updated
      }));
    } else if (tabType === 'transfer_stok') {
      setMasterData(prev => ({
        ...prev,
        stockTransfer: (prev.stockTransfer || []).filter(item => item.id !== id)
      }));
    } else if (tabType === 'stok_opname') {
      setMasterData(prev => ({
        ...prev,
        stockOpname: (prev.stockOpname || []).filter(item => item.id !== id)
      }));
    }
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

  // ACC / APPROVE OPNAME REPORT FROM OUTLET
  const handleApproveOpnameReport = (op) => {
    const autoStokKeluarPenjualan = getAutoSalesOutflowForIngredient(op.item_name, op.outlet_id);
    const activePrice = getItemPriceFromStokMasuk(op.item_name) || op.harga_satuan || 0;

    const updatedRecord = {
      ...op,
      stok_keluar: autoStokKeluarPenjualan,
      harga_satuan: activePrice,
      status: 'ACC',
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
        approvedLogistics: updatedApp.some(item => item.id === op.id) ? updatedApp : [updatedRecord, ...updatedApp],
        stockOpname: updatedOp.some(item => item.id === op.id) ? updatedOp : [updatedRecord, ...updatedOp]
      };
    });

    alert(`✅ Laporan Stok Opname (${op.item_name}) berhasil disetujui (ACC)!\nStok Keluar Penjualan otomatis terisi dari Web Admin: ${autoStokKeluarPenjualan} ${op.unit || 'kg'}.\nKini Anda dapat menekan tombol "Kirim APK".`);
  };

  // SEND TO MOBILE APK (REQUIRES ACC FIRST)
  const handleSendToMobileAPK = (recordName, recordObj = null) => {
    if (recordObj) {
      if (recordObj.status !== 'ACC') {
        alert(`⚠️ Laporan Stok Opname (${recordName}) harus disetujui (ACC) terlebih dahulu oleh Admin sebelum dapat dikirim ke Mobile APK!`);
        return;
      }

      const updatedObj = {
        ...recordObj,
        status: 'ACC',
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
    alert(`🚀 Berhasil mengirim Laporan Stok Opname (${recordName}) yang telah di-ACC ke Mobile APK Kasir! Data kini langsung ter-sync di Halaman Logistik Mobile APK.`);
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
    if (!rusakQty) {
      alert('Kuantitas (Qty) wajib diisi');
      return;
    }

    const selectedIng = ingredientsList.find(i => i.id === Number(rusakIngredientId)) || { name: 'Item', unit: 'pcs' };

    const newRecord = {
      id: `mv-${Date.now()}`,
      date: rusakDate,
      outlet_id: Number(rusakOutletId),
      type: 'WASTE',
      item_name: selectedIng.name,
      qty: Number(rusakQty),
      unit: selectedIng.unit || 'pcs',
      created_by: rusakCreatedBy,
      type_input: 'manual',
      notes: rusakNotes || '-'
    };

    setMasterData(prev => ({
      ...prev,
      stockMovement: [...(prev.stockMovement || []), newRecord]
    }));

    setRusakQty('');
    setRusakNotes('');
    setRusakSearchQuery('');
    setShowAddModal(null);
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
          <td><span style="text-transform:uppercase; font-size:10px; font-weight:bold; color:${m.type_input === 'manual' ? '#818cf8' : '#f59e0b'}">${m.type_input || 'by kasir'}</span></td>
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
          <td style="color: #ef4444; font-weight: bold;">-${Math.abs(d.qty).toFixed(1)}</td>
          <td>${d.unit}</td>
          <td style="color: #10b981; font-weight: bold;">${formatRupiah(d.cogsValue)}</td>
          <td>${d.status}</td>
        </tr>
      `).join('');
    } else if (activeSubTab === 'transfer_stok') {
      tableRows = getFilteredTransfer().map(t => `
        <tr>
          <td>${t.date}</td>
          <td>${t.created_by || 'Admin'}</td>
          <td><span style="text-transform:uppercase; font-size:10px; font-weight:bold; color:${t.type_input === 'manual' ? '#818cf8' : '#f59e0b'}">${t.type_input || 'by approval'}</span></td>
          <td>🏢 ${getOutletName(t.from_outlet_id)}</td>
          <td>🏢 ${getOutletName(t.to_outlet_id)}</td>
          <td><b>${t.item_name}</b></td>
          <td>${t.qty}</td>
          <td>${t.unit}</td>
          <td><span style="font-weight: bold; color: ${t.status === 'Terkirim' ? '#10b981' : '#f59e0b'}">${t.status}</span></td>
          <td>${t.notes}</td>
          <td><span style="font-weight: bold; color: ${t.is_returned ? '#10b981' : '#ef4444'}">${t.is_returned ? 'Sudah Kembali' : 'Belum Kembali'}</span></td>
        </tr>
      `).join('');
    } else if (activeSubTab === 'stok_rusak') {
      tableRows = getFilteredRusak().map(m => `
        <tr>
          <td>${m.date}</td>
          <td>${m.created_by || 'Admin'}</td>
          <td><span style="text-transform:uppercase; font-size:10px; font-weight:bold; color:${m.type_input === 'manual' ? '#818cf8' : '#f59e0b'}">${m.type_input || 'by approval'}</span></td>
          <td>🏢 ${getOutletName(m.outlet_id)}</td>
          <td><b>${m.item_name}</b></td>
          <td style="color: #ef4444; font-weight: bold;">-${m.qty}</td>
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
          <td style="color: #38bdf8; font-weight: bold;">+${op.stokMasuk}</td>
          <td style="color: #fb7185; font-weight: bold;">-${op.stokKeluar}</td>
          <td style="color: #34d399; font-weight: bold;">+${op.transferIn}</td>
          <td style="color: #fb7185; font-weight: bold;">-${op.transferOut}</td>
          <td style="color: #fb7185; font-weight: bold;">-${op.stokRusak}</td>
          <td style="color: #34d399; font-weight: bold; font-size: 1.05em;">${op.sisaStokSystem.toFixed(1)} ${op.unit}</td>
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
            <td style="color: #10b981; font-weight: bold;">${op.stok_fisik || 0}</td>
            <td><span style="font-weight: bold; color: ${sSistem === op.stok_fisik ? '#10b981' : sSistem > op.stok_fisik ? '#f59e0b' : '#ef4444'}">${statusText} (${diffVal > 0 ? `+${diffVal}` : diffVal === 0 ? '0' : `-${Math.abs(diffVal)}`})</span></td>
            <td>${formatRupiah(activePrice)}</td>
            <td style="font-weight: bold; color: ${dendaVal > 0 ? '#ef4444' : '#64748b'}">${dendaVal > 0 ? formatRupiah(dendaVal) : '-'}</td>
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
          return `<td style="${isHighest ? 'color: #ef4444; font-weight: bold; background-color: #fee2e2;' : ''}">${formatRupiah(prc)}${isHighest ? ' 🔴 (Tertinggi)' : ''}</td>`;
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
            body { font-family: sans-serif; padding: 20px; color: #1e293b; }
            h2 { color: #0f172a; margin-bottom: 4px; }
            p { font-size: 14px; color: #64748b; margin-top: 0; }
            table { width: 100%; border-collapse: collapse; margin-top: 16px; }
            th, td { border: 1px solid #cbd5e1; padding: 8px; text-align: left; font-size: 11px; }
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }} className="animate-fade-in">
      
      {/* Title Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '1.6rem', fontWeight: '900', color: '#f8fafc', letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Package size={28} color="#6366f1" />
            <span>Pusat Kontrol Logistik & Stok (Logistics & Supply)</span>
          </h2>
          <p style={{ color: '#94a3b8', fontSize: '0.875rem', marginTop: '4px' }}>
            Pantau barang masuk supplier, pemotongan stok kasir otomatis, transfer antarcabang, barang rusak (waste), dan stock opname fisik.
          </p>
        </div>

        {/* Global Action Add Button for Active SubTab */}
        {activeSubTab !== 'stok_keluar' && (
          <button 
            onClick={() => {
              if (activeSubTab === 'perbandingan_harga') {
                handleOpenAddPriceModal();
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
               activeSubTab === 'stok_rusak' ? 'Laporkan Barang Rusak' :
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
                borderColor: logShowColumnDropdown ? '#fbbf24' : 'rgba(255,255,255,0.1)',
                background: logShowColumnDropdown ? 'rgba(251, 191, 36, 0.2)' : '#1e293b',
                color: logShowColumnDropdown ? '#fbbf24' : '#cbd5e1',
                height: '40px'
              }}
            >
              <SlidersHorizontal size={15} color="#fbbf24" />
              <span>👁️ Filter Kolom Ditampilkan</span>
              <ChevronDown size={14} style={{ transform: logShowColumnDropdown ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
            </button>

            {/* Export options */}
            <button onClick={handleDownloadExcel} className="btn-secondary" style={{ padding: '8px 12px', fontSize: '0.8rem', color: '#34d399', borderColor: 'rgba(52, 211, 153, 0.3)', height: '40px' }}>
              <FileSpreadsheet size={15} />
              <span>Download Excel</span>
            </button>

            <button onClick={handleDownloadPDF} className="btn-secondary" style={{ padding: '8px 12px', fontSize: '0.8rem', color: '#fb7185', borderColor: 'rgba(251, 113, 133, 0.3)', height: '40px' }}>
              <Printer size={15} />
              <span>Download PDF</span>
            </button>
          </div>
        </div>

        {/* COLUMN VISIBILITY PANEL */}
        {logShowColumnDropdown && (
          <div className="glass-card animate-fade-in" style={{ padding: '16px', border: '1px solid #fbbf24', background: '#1e293b', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #334155', paddingBottom: '8px' }}>
              <div style={{ fontWeight: '800', color: '#f8fafc', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <SlidersHorizontal size={16} color="#fbbf24" />
                <span>Pilih Kolom Tabel yang Ingin Ditampilkan</span>
              </div>
              <button onClick={() => setLogShowColumnDropdown(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontWeight: '800', fontSize: '0.9rem' }}>
                ✕ Tutup
              </button>
            </div>
            
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', background: '#0f172a', padding: '12px', borderRadius: '8px', border: '1px solid #334155' }}>
              {Object.keys(getActiveVisibleCols()).map(key => (
                <label key={key} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  cursor: 'pointer',
                  fontSize: '0.8rem',
                  color: getActiveVisibleCols()[key] ? '#fbbf24' : '#cbd5e1',
                  fontWeight: getActiveVisibleCols()[key] ? '700' : '500',
                  background: getActiveVisibleCols()[key] ? 'rgba(251, 191, 36, 0.12)' : '#1e293b',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  border: '1px solid',
                  borderColor: getActiveVisibleCols()[key] ? '#fbbf24' : '#334155'
                }}>
                  <input
                    type="checkbox"
                    checked={getActiveVisibleCols()[key]}
                    onChange={() => handleToggleColumnVisibility(key)}
                    style={{ accentColor: '#fbbf24' }}
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
                     key === 'stokKeluar' ? '📤 Stok Keluar (Penjualan)' :
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

      {/* Sub-Tab Navigation Bar */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', background: '#1e293b', padding: '6px', borderRadius: '12px', border: '1px solid #334155' }}>
        {[
          { id: 'stok_masuk', label: '📥 Stok Masuk', color: '#38bdf8' },
          { id: 'stok_keluar', label: '📤 Stok Keluar (Penjualan)', color: '#fb7185' },
          { id: 'transfer_stok', label: '🚚 Transfer Stok', color: '#fbbf24' },
          { id: 'stok_rusak', label: '⚠️ Stok Rusak (Waste)', color: '#f43f5e' },
          { id: 'stok_opname_system', label: '🤖 Stock Opname by Sistem', color: '#34d399' },
          { id: 'stok_opname_report', label: '📱 Stok Opname by Report Outlet', color: '#a78bfa' },
          { id: 'perbandingan_harga', label: '🏷️ Perbandingan Harga', color: '#c084fc' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => {
              setActiveSubTab(tab.id);
              setLogShowColumnDropdown(false);
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 16px',
              borderRadius: '8px',
              border: 'none',
              background: activeSubTab === tab.id ? 'rgba(99, 102, 241, 0.18)' : 'transparent',
              color: activeSubTab === tab.id ? '#818cf8' : '#94a3b8',
              fontWeight: activeSubTab === tab.id ? '800' : '600',
              fontSize: '0.82rem',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            <span style={{ color: activeSubTab === tab.id ? '#818cf8' : tab.color }}>●</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* RENDER ACTIVE TAB TABLE */}
      <div className="glass-card" style={{ padding: '24px', background: '#0f172a', border: '1px solid #334155', borderRadius: '12px' }}>
        
        {/* SUBTAB 1: STOK MASUK */}
        {activeSubTab === 'stok_masuk' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: '800', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ArrowDownRight size={18} color="#38bdf8" />
              <span>Log Mutasi Masuk (Stock Inflow Receivings)</span>
            </h3>
            
            <div style={{ overflowX: 'auto', border: '1px solid #334155', borderRadius: '10px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ background: '#1e293b', borderBottom: '1px solid #334155', color: '#cbd5e1', fontWeight: '800', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                    {visibleColsMasuk.date && <th style={{ padding: '12px 10px' }}>Tanggal</th>}
                    {visibleColsMasuk.outletId && <th style={{ padding: '12px 10px' }}>Outlet</th>}
                    {visibleColsMasuk.createdBy && <th style={{ padding: '12px 10px' }}>Dibuat Oleh</th>}
                    {visibleColsMasuk.itemName && <th style={{ padding: '12px 10px' }}>Nama Item</th>}
                    {visibleColsMasuk.supplier && <th style={{ padding: '12px 10px' }}>Supplier</th>}
                    {visibleColsMasuk.qty && <th style={{ padding: '12px 10px', textAlign: 'right' }}>Jumlah</th>}
                    {visibleColsMasuk.unit && <th style={{ padding: '12px 10px' }}>Satuan</th>}
                    {visibleColsMasuk.priceUnit && <th style={{ padding: '12px 10px', textAlign: 'right' }}>Harga Satuan</th>}
                    {visibleColsMasuk.totalPrice && <th style={{ padding: '12px 10px', textAlign: 'right' }}>Total Harga</th>}
                    {visibleColsMasuk.typeInput && <th style={{ padding: '12px 10px' }}>Tipe Input</th>}
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const filteredMasuk = getFilteredMasuk();
                    const totalMasuk = filteredMasuk.length;
                    const paginatedMasuk = filteredMasuk.slice((currentPage - 1) * pageSize, currentPage * pageSize);

                    if (paginatedMasuk.length === 0) {
                      return (
                        <tr>
                          <td colSpan={10} style={{ padding: '30px', textAlign: 'center', color: '#64748b' }}>
                            Tidak ada log stok masuk untuk outlet / tanggal terpilih.
                          </td>
                        </tr>
                      );
                    }

                    return paginatedMasuk.map(m => (
                      <tr key={m.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', color: '#f8fafc' }}>
                        {visibleColsMasuk.date && <td style={{ padding: '12px 10px', color: '#94a3b8' }}>{m.date}</td>}
                        {visibleColsMasuk.outletId && <td style={{ padding: '12px 10px', fontWeight: '700' }}>🏢 {getOutletName(m.outlet_id)}</td>}
                        {visibleColsMasuk.createdBy && <td style={{ padding: '12px 10px', color: '#cbd5e1' }}>{m.created_by || 'Admin'}</td>}
                        {visibleColsMasuk.itemName && <td style={{ padding: '12px 10px', fontWeight: '800', color: '#38bdf8' }}>{m.item_name}</td>}
                        {visibleColsMasuk.supplier && <td style={{ padding: '12px 10px', color: '#cbd5e1' }}>{m.supplier || '-'}</td>}
                        {visibleColsMasuk.qty && <td style={{ padding: '12px 10px', textAlign: 'right', fontWeight: '800', color: '#34d399' }}>+{m.qty}</td>}
                        {visibleColsMasuk.unit && <td style={{ padding: '12px 10px', color: '#cbd5e1' }}>{m.unit}</td>}
                        {visibleColsMasuk.priceUnit && <td style={{ padding: '12px 10px', textAlign: 'right' }}>{formatRupiah(m.price_unit || 0)}</td>}
                        {visibleColsMasuk.totalPrice && <td style={{ padding: '12px 10px', textAlign: 'right', fontWeight: '800', color: '#34d399' }}>{formatRupiah(m.total_price || (m.qty * (m.price_unit || 0)))}</td>}
                        {visibleColsMasuk.typeInput && (
                          <td style={{ padding: '12px 10px' }}>
                            <span style={{
                              padding: '2px 8px', borderRadius: '6px', fontSize: '0.72rem', fontWeight: '700',
                              background: m.type_input === 'manual' ? 'rgba(129, 140, 248, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                              color: m.type_input === 'manual' ? '#818cf8' : '#fbbf24',
                              border: '1px solid',
                              borderColor: m.type_input === 'manual' ? 'rgba(129, 140, 248, 0.3)' : 'rgba(245, 158, 11, 0.3)',
                              textTransform: 'uppercase'
                            }}>
                              {m.type_input === 'manual' ? 'manual' : 'by kasir'}
                            </span>
                          </td>
                        )}
                      </tr>
                    ));
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
            <h3 style={{ fontSize: '1.05rem', fontWeight: '800', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ArrowUpRight size={18} color="#fb7185" />
              <span>Log Mutasi Keluar Penjualan POS (Autoconsumption Stock Deductions)</span>
            </h3>
            
            <div style={{ overflowX: 'auto', border: '1px solid #334155', borderRadius: '10px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ background: '#1e293b', borderBottom: '1px solid #334155', color: '#cbd5e1', fontWeight: '800', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                    {visibleColsKeluar.receiptNo && <th style={{ padding: '12px 10px' }}>🎫 No. Struk</th>}
                    {visibleColsKeluar.dateTime && <th style={{ padding: '12px 10px' }}>Tanggal & Waktu</th>}
                    {visibleColsKeluar.outletName && <th style={{ padding: '12px 10px' }}>Nama Outlet</th>}
                    {visibleColsKeluar.itemName && <th style={{ padding: '12px 10px' }}>Nama Item</th>}
                    {visibleColsKeluar.itemType && <th style={{ padding: '12px 10px' }}>Tipe</th>}
                    {visibleColsKeluar.qty && <th style={{ padding: '12px 10px', textAlign: 'right' }}>Qty</th>}
                    {visibleColsKeluar.unit && <th style={{ padding: '12px 10px' }}>Satuan</th>}
                    {visibleColsKeluar.cogsValue && <th style={{ padding: '12px 10px', textAlign: 'right' }}>Estimasi HPP</th>}
                    {visibleColsKeluar.status && <th style={{ padding: '12px 10px' }}>Status</th>}
                    <th style={{ padding: '12px 10px', textAlign: 'center', width: '120px' }}>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStockOutflow.length === 0 ? (
                    <tr>
                      <td colSpan={10} style={{ padding: '30px', textAlign: 'center', color: '#64748b' }}>
                        Tidak ada log mutasi keluar dari penjualan untuk outlet / tanggal terpilih.
                      </td>
                    </tr>
                  ) : (
                    filteredStockOutflow.map((d, index) => (
                      <tr key={d.id || index} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', color: '#f8fafc' }}>
                        {visibleColsKeluar.receiptNo && <td style={{ padding: '12px 10px', color: '#818cf8', fontWeight: '700', fontFamily: 'monospace' }}>{d.receiptNo}</td>}
                        {visibleColsKeluar.dateTime && <td style={{ padding: '12px 10px', color: '#94a3b8' }}>{d.date} <span style={{ fontSize: '0.72rem', opacity: 0.8 }}>({d.time})</span></td>}
                        {visibleColsKeluar.outletName && <td style={{ padding: '12px 10px' }}>🏢 {getOutletName(d.outletId)}</td>}
                        {visibleColsKeluar.itemName && <td style={{ padding: '12px 10px', fontWeight: '800' }}>{d.itemName}</td>}
                        {visibleColsKeluar.itemType && (
                          <td style={{ padding: '12px 10px' }}>
                            <span style={{
                              padding: '2px 6px', borderRadius: '4px', fontSize: '0.72rem', fontWeight: '700',
                              background: d.itemType === 'Produk Jadi' ? 'rgba(56,189,248,0.12)' : 'rgba(251,191,36,0.12)',
                              color: d.itemType === 'Produk Jadi' ? '#38bdf8' : '#fbbf24',
                              border: '1px solid',
                              borderColor: d.itemType === 'Produk Jadi' ? 'rgba(56,189,248,0.2)' : 'rgba(251,191,36,0.2)'
                            }}>
                              {d.itemType}
                            </span>
                          </td>
                        )}
                        {visibleColsKeluar.qty && <td style={{ padding: '12px 10px', textAlign: 'right', fontWeight: '800', color: '#f43f5e' }}>-{Math.abs(d.qty).toFixed(1)}</td>}
                        {visibleColsKeluar.unit && <td style={{ padding: '12px 10px', color: '#cbd5e1' }}>{d.unit}</td>}
                        {visibleColsKeluar.cogsValue && <td style={{ padding: '12px 10px', textAlign: 'right', fontWeight: '800', color: '#34d399' }}>{formatRupiah(d.cogsValue)}</td>}
                        {visibleColsKeluar.status && <td style={{ padding: '12px 10px', color: '#34d399', fontWeight: '700' }}>{d.status}</td>}
                        <td style={{ padding: '12px 10px', display: 'flex', gap: '6px', justifyContent: 'center', alignItems: 'center' }}>
                          <button
                            onClick={() => handleDeleteRecord(d.id, 'stok_keluar')}
                            style={{
                              background: 'rgba(244, 63, 94, 0.15)', border: '1px solid rgba(244, 63, 94, 0.3)', color: '#f43f5e', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '4px'
                            }}
                          >
                            <Trash2 size={12} />
                            <span>Hapus</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* SUBTAB 3: TRANSFER STOK */}
        {activeSubTab === 'transfer_stok' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: '800', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Truck size={18} color="#fbbf24" />
              <span>Log Transfer Stok Antar Cabang Restoran</span>
            </h3>
            
            <div style={{ overflowX: 'auto', border: '1px solid #334155', borderRadius: '10px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ background: '#1e293b', borderBottom: '1px solid #334155', color: '#cbd5e1', fontWeight: '800', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                    {visibleColsTransfer.date && <th style={{ padding: '12px 10px' }}>Tanggal</th>}
                    {visibleColsTransfer.createdBy && <th style={{ padding: '12px 10px' }}>Dibuat Oleh</th>}
                    {visibleColsTransfer.typeInput && <th style={{ padding: '12px 10px' }}>Tipe Input</th>}
                    {visibleColsTransfer.fromOutlet && <th style={{ padding: '12px 10px' }}>Outlet Asal</th>}
                    {visibleColsTransfer.toOutlet && <th style={{ padding: '12px 10px' }}>Outlet Tujuan</th>}
                    {visibleColsTransfer.itemName && <th style={{ padding: '12px 10px' }}>Nama Item</th>}
                    {visibleColsTransfer.qty && <th style={{ padding: '12px 10px', textAlign: 'right' }}>Qty</th>}
                    {visibleColsTransfer.unit && <th style={{ padding: '12px 10px' }}>Satuan</th>}
                    {visibleColsTransfer.status && <th style={{ padding: '12px 10px' }}>Status</th>}
                    {visibleColsTransfer.notes && <th style={{ padding: '12px 10px' }}>Catatan</th>}
                    {visibleColsTransfer.returnStatus && <th style={{ padding: '12px 10px' }}>Analisis Pengembalian</th>}
                    <th style={{ padding: '12px 10px', textAlign: 'center', width: '150px' }}>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {getFilteredTransfer().length === 0 ? (
                    <tr>
                      <td colSpan={12} style={{ padding: '30px', textAlign: 'center', color: '#64748b' }}>
                        Tidak ada log transfer stok untuk outlet terpilih.
                      </td>
                    </tr>
                  ) : (
                    getFilteredTransfer().map(t => (
                      <tr key={t.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', color: '#f8fafc' }}>
                        {visibleColsTransfer.date && <td style={{ padding: '12px 10px', color: '#94a3b8' }}>{t.date}</td>}
                        {visibleColsTransfer.createdBy && <td style={{ padding: '12px 10px', color: '#cbd5e1', fontWeight: '600' }}>👤 {t.created_by || 'Admin'}</td>}
                        {visibleColsTransfer.typeInput && (
                          <td style={{ padding: '12px 10px' }}>
                            <span style={{
                              padding: '2px 8px', borderRadius: '6px', fontSize: '0.72rem', fontWeight: '700',
                              background: t.type_input === 'manual' ? 'rgba(129, 140, 248, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                              color: t.type_input === 'manual' ? '#818cf8' : '#fbbf24',
                              border: '1px solid',
                              borderColor: t.type_input === 'manual' ? 'rgba(129, 140, 248, 0.3)' : 'rgba(245, 158, 11, 0.3)',
                              textTransform: 'uppercase'
                            }}>
                              {t.type_input === 'manual' ? 'manual' : 'by approval'}
                            </span>
                          </td>
                        )}
                        {visibleColsTransfer.fromOutlet && <td style={{ padding: '12px 10px', fontWeight: '700', color: '#fb7185' }}>📤 {getOutletName(t.from_outlet_id)}</td>}
                        {visibleColsTransfer.toOutlet && <td style={{ padding: '12px 10px', fontWeight: '700', color: '#34d399' }}>📥 {getOutletName(t.to_outlet_id)}</td>}
                        {visibleColsTransfer.itemName && <td style={{ padding: '12px 10px', fontWeight: '800' }}>{t.item_name}</td>}
                        {visibleColsTransfer.qty && <td style={{ padding: '12px 10px', textAlign: 'right', fontWeight: '800' }}>{t.qty}</td>}
                        {visibleColsTransfer.unit && <td style={{ padding: '12px 10px', color: '#cbd5e1' }}>{t.unit}</td>}
                        {visibleColsTransfer.status && (
                          <td style={{ padding: '12px 10px' }}>
                            <span style={{
                              padding: '2px 6px', borderRadius: '4px', fontSize: '0.72rem', fontWeight: '700',
                              background: t.status === 'Terkirim' ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)',
                              color: t.status === 'Terkirim' ? '#34d399' : '#fbbf24'
                            }}>
                              {t.status}
                            </span>
                          </td>
                        )}
                        {visibleColsTransfer.notes && <td style={{ padding: '12px 10px', color: '#94a3b8' }}>{t.notes}</td>}
                        
                        {/* Analisis Pengembalian */}
                        {visibleColsTransfer.returnStatus && (
                          <td style={{ padding: '12px 10px' }}>
                            {t.is_returned ? (
                              <span style={{ color: '#34d399', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                🟢 Sudah Kembali (Lunas)
                              </span>
                            ) : (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <span style={{ color: '#fb7185', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                  ⚠️ Belum Dikembalikan
                                </span>
                                <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                                  Harus dikembalikan: {t.qty} {t.unit}
                                </span>
                              </div>
                            )}
                          </td>
                        )}

                        {/* Aksi Edit & Tandai Lunas */}
                        <td style={{ padding: '12px 10px', display: 'flex', gap: '6px', justifyContent: 'center', alignItems: 'center' }}>
                          <button
                            onClick={() => handleOpenEditRecord(t, 'transfer')}
                            style={{
                              background: 'rgba(56, 189, 248, 0.15)', border: '1px solid rgba(56, 189, 248, 0.3)', color: '#38bdf8', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '4px'
                            }}
                          >
                            <Edit3 size={12} />
                            <span>Edit</span>
                          </button>
                          <button
                            onClick={() => handleDeleteRecord(t.id, 'transfer_stok')}
                            style={{
                              background: 'rgba(244, 63, 94, 0.15)', border: '1px solid rgba(244, 63, 94, 0.3)', color: '#f43f5e', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '4px'
                            }}
                          >
                            <Trash2 size={12} />
                            <span>Hapus</span>
                          </button>
                          <button
                            onClick={() => handleSendToMobileAPK(t.item_name)}
                            style={{
                              background: 'rgba(52, 211, 153, 0.15)', border: '1px solid rgba(52, 211, 153, 0.3)', color: '#34d399', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '4px'
                            }}
                            title="Kirim data logistik ke Mobile APK Kasir"
                          >
                            <Smartphone size={12} />
                            <span>Kirim APK</span>
                          </button>
                          {!t.is_returned && (
                            <button
                              onClick={() => {
                                const updatedTransfers = getTransfersList().map(itemTx => {
                                  if (itemTx.id === t.id) {
                                    return { ...itemTx, is_returned: true };
                                  }
                                  return itemTx;
                                });
                                setMasterData(prev => ({ ...prev, stockTransfer: updatedTransfers }));
                              }}
                              style={{
                                background: 'rgba(251, 191, 36, 0.15)', border: '1px solid rgba(251, 191, 36, 0.3)', color: '#fbbf24', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: '700'
                              }}
                            >
                              Retur
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* SUBTAB 4: STOK RUSAK */}
        {activeSubTab === 'stok_rusak' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: '800', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Trash2 size={18} color="#f43f5e" />
              <span>Log Barang Rusak & Waste Inventoris</span>
            </h3>
            
            <div style={{ overflowX: 'auto', border: '1px solid #334155', borderRadius: '10px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ background: '#1e293b', borderBottom: '1px solid #334155', color: '#cbd5e1', fontWeight: '800', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                    {visibleColsRusak.date && <th style={{ padding: '12px 10px' }}>Tanggal</th>}
                    {visibleColsRusak.createdBy && <th style={{ padding: '12px 10px' }}>Dibuat Oleh</th>}
                    {visibleColsRusak.typeInput && <th style={{ padding: '12px 10px' }}>Tipe Input</th>}
                    {visibleColsRusak.outletId && <th style={{ padding: '12px 10px' }}>Outlet</th>}
                    {visibleColsRusak.itemName && <th style={{ padding: '12px 10px' }}>Nama Item</th>}
                    {visibleColsRusak.qty && <th style={{ padding: '12px 10px', textAlign: 'right' }}>Qty Rusak</th>}
                    {visibleColsRusak.unit && <th style={{ padding: '12px 10px' }}>Satuan</th>}
                    {visibleColsRusak.notes && <th style={{ padding: '12px 10px' }}>Catatan Alasan</th>}
                    <th style={{ padding: '12px 10px', textAlign: 'center', width: '100px' }}>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {getFilteredRusak().length === 0 ? (
                    <tr>
                      <td colSpan={10} style={{ padding: '30px', textAlign: 'center', color: '#64748b' }}>
                        Tidak ada log stok rusak / waste untuk outlet terpilih.
                      </td>
                    </tr>
                  ) : (
                    getFilteredRusak().map(m => (
                      <tr key={m.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', color: '#f8fafc' }}>
                        {visibleColsRusak.date && <td style={{ padding: '12px 10px', color: '#94a3b8' }}>{m.date}</td>}
                        {visibleColsRusak.createdBy && <td style={{ padding: '12px 10px', color: '#cbd5e1', fontWeight: '600' }}>👤 {m.created_by || 'Admin'}</td>}
                        {visibleColsRusak.typeInput && (
                          <td style={{ padding: '12px 10px' }}>
                            <span style={{
                              padding: '2px 8px', borderRadius: '6px', fontSize: '0.72rem', fontWeight: '700',
                              background: m.type_input === 'manual' ? 'rgba(129, 140, 248, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                              color: m.type_input === 'manual' ? '#818cf8' : '#fbbf24',
                              border: '1px solid',
                              borderColor: m.type_input === 'manual' ? 'rgba(129, 140, 248, 0.3)' : 'rgba(245, 158, 11, 0.3)',
                              textTransform: 'uppercase'
                            }}>
                              {m.type_input === 'manual' ? 'manual' : 'by approval'}
                            </span>
                          </td>
                        )}
                        {visibleColsRusak.outletId && <td style={{ padding: '12px 10px', fontWeight: '700' }}>🏢 {getOutletName(m.outlet_id)}</td>}
                        {visibleColsRusak.itemName && <td style={{ padding: '12px 10px', fontWeight: '800', color: '#f43f5e' }}>{m.item_name}</td>}
                        {visibleColsRusak.qty && <td style={{ padding: '12px 10px', textAlign: 'right', fontWeight: '800', color: '#fb7185' }}>-{m.qty}</td>}
                        {visibleColsRusak.unit && <td style={{ padding: '12px 10px', color: '#cbd5e1' }}>{m.unit}</td>}
                        {visibleColsRusak.notes && <td style={{ padding: '12px 10px', color: '#94a3b8' }}>{m.notes}</td>}
                        
                        {/* Aksi Edit, Delete & Kirim APK */}
                        <td style={{ padding: '12px 10px', display: 'flex', gap: '6px', justifyContent: 'center', alignItems: 'center' }}>
                          <button
                            onClick={() => handleOpenEditRecord(m, 'waste')}
                            style={{
                              background: 'rgba(244, 63, 94, 0.15)', border: '1px solid rgba(244, 63, 94, 0.3)', color: '#f43f5e', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '4px'
                            }}
                          >
                            <Edit3 size={12} />
                            <span>Edit</span>
                          </button>
                          <button
                            onClick={() => handleDeleteRecord(m.id, 'stok_rusak')}
                            style={{
                              background: 'rgba(244, 63, 94, 0.15)', border: '1px solid rgba(244, 63, 94, 0.3)', color: '#f43f5e', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '4px'
                            }}
                          >
                            <Trash2 size={12} />
                            <span>Hapus</span>
                          </button>
                          <button
                            onClick={() => handleSendToMobileAPK(m.item_name)}
                            style={{
                              background: 'rgba(52, 211, 153, 0.15)', border: '1px solid rgba(52, 211, 153, 0.3)', color: '#34d399', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '4px'
                            }}
                            title="Kirim data logistik ke Mobile APK Kasir"
                          >
                            <Smartphone size={12} />
                            <span>Kirim APK</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* SUBTAB: STOCK OPNAME BY SISTEM */}
        {activeSubTab === 'stok_opname_system' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: '900', color: '#f8fafc', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <CheckSquare size={18} color="#34d399" />
                  <span>Stock Opname by Sistem (Perhitungan Otomatis Real-Time)</span>
                </h3>
                <p style={{ fontSize: '0.78rem', color: '#94a3b8', margin: '4px 0 0 0' }}>
                  Sisa Stok by Sistem = (Stok Awal + Stok Masuk + Transfer Stok In) - (Stok Keluar + Transfer Stok Out + Stok Rusak)
                </p>
              </div>

              {/* Summary Badges */}
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <div style={{ background: '#1e293b', border: '1px solid #334155', padding: '6px 14px', borderRadius: '10px', color: '#cbd5e1', fontSize: '0.78rem', fontWeight: '700' }}>
                  Total Record: <span style={{ color: '#38bdf8', fontWeight: '900' }}>{calculateStockOpnameBySystem().length}</span>
                </div>
                <div style={{ background: '#1e293b', border: '1px solid #334155', padding: '6px 14px', borderRadius: '10px', color: '#cbd5e1', fontSize: '0.78rem', fontWeight: '700' }}>
                  Total Sisa Stok System: <span style={{ color: '#34d399', fontWeight: '900' }}>
                    {calculateStockOpnameBySystem().reduce((sum, r) => sum + r.sisaStokSystem, 0).toFixed(1)}
                  </span>
                </div>
              </div>
            </div>
            
            <div style={{ overflowX: 'auto', border: '1px solid #334155', borderRadius: '12px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ background: '#0f172a', borderBottom: '1px solid #334155', color: '#cbd5e1', fontWeight: '800', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                    {visibleColsOpnameSystem.date && <th style={{ padding: '12px 10px' }}>📅 Tanggal</th>}
                    {visibleColsOpnameSystem.outletName && <th style={{ padding: '12px 10px' }}>🏢 Nama Outlet</th>}
                    {visibleColsOpnameSystem.itemName && <th style={{ padding: '12px 10px' }}>🥦 Nama Bahan Baku</th>}
                    {visibleColsOpnameSystem.unit && <th style={{ padding: '12px 10px' }}>Satuan</th>}
                    {visibleColsOpnameSystem.stokAwal && <th style={{ padding: '12px 10px', textAlign: 'right' }}>Stok Awal</th>}
                    {visibleColsOpnameSystem.stokMasuk && <th style={{ padding: '12px 10px', textAlign: 'right' }}>Stok Masuk</th>}
                    {visibleColsOpnameSystem.stokKeluar && <th style={{ padding: '12px 10px', textAlign: 'right' }}>Stok Keluar</th>}
                    {visibleColsOpnameSystem.transferIn && <th style={{ padding: '12px 10px', textAlign: 'right' }}>Transfer Stok In</th>}
                    {visibleColsOpnameSystem.transferOut && <th style={{ padding: '12px 10px', textAlign: 'right' }}>Transfer Stok Out</th>}
                    {visibleColsOpnameSystem.stokRusak && <th style={{ padding: '12px 10px', textAlign: 'right' }}>Stok Rusak</th>}
                    {visibleColsOpnameSystem.sisaStokSystem && <th style={{ padding: '12px 10px', textAlign: 'right', background: 'rgba(52, 211, 153, 0.1)' }}>Sisa Stok by Sistem</th>}
                  </tr>
                </thead>
                <tbody>
                  {calculateStockOpnameBySystem().length === 0 ? (
                    <tr>
                      <td colSpan={11} style={{ padding: '30px', textAlign: 'center', color: '#64748b' }}>
                        Tidak ada data stok opname by sistem untuk outlet / rentang tanggal terpilih.
                      </td>
                    </tr>
                  ) : (
                    calculateStockOpnameBySystem().map(row => (
                      <tr key={row.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', color: '#f8fafc' }}>
                        {visibleColsOpnameSystem.date && <td style={{ padding: '12px 10px', color: '#94a3b8' }}>{row.date}</td>}
                        {visibleColsOpnameSystem.outletName && <td style={{ padding: '12px 10px', fontWeight: '700' }}>🏢 {row.outletName}</td>}
                        {visibleColsOpnameSystem.itemName && <td style={{ padding: '12px 10px', fontWeight: '800', color: '#38bdf8' }}>{row.itemName}</td>}
                        {visibleColsOpnameSystem.unit && <td style={{ padding: '12px 10px', color: '#94a3b8' }}>{row.unit}</td>}

                        {/* STOK AWAL (Editable manual override if needed) */}
                        {visibleColsOpnameSystem.stokAwal && (
                          <td style={{ padding: '8px 10px', textAlign: 'right' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px' }}>
                              <input
                                type="number"
                                step="any"
                                value={manualStokAwalMap[row.manualKey] !== undefined ? manualStokAwalMap[row.manualKey] : row.stokAwal}
                                onChange={(e) => handleUpdateManualStokAwal(row.manualKey, e.target.value)}
                                placeholder="0"
                                style={{
                                  width: '75px',
                                  padding: '4px 6px',
                                  textAlign: 'right',
                                  background: row.hasManualOverride ? 'rgba(251, 191, 36, 0.15)' : '#0f172a',
                                  border: `1px solid ${row.hasManualOverride ? '#fbbf24' : '#334155'}`,
                                  borderRadius: '6px',
                                  color: row.hasManualOverride ? '#fbbf24' : '#ffffff',
                                  fontWeight: '800',
                                  fontSize: '0.82rem'
                                }}
                              />
                            </div>
                          </td>
                        )}

                        {/* STOK MASUK */}
                        {visibleColsOpnameSystem.stokMasuk && (
                          <td style={{ padding: '12px 10px', textAlign: 'right', color: '#38bdf8', fontWeight: '700' }}>
                            +{row.stokMasuk}
                          </td>
                        )}

                        {/* STOK KELUAR */}
                        {visibleColsOpnameSystem.stokKeluar && (
                          <td style={{ padding: '12px 10px', textAlign: 'right', color: '#fb7185', fontWeight: '700' }}>
                            -{row.stokKeluar}
                          </td>
                        )}

                        {/* TRANSFER STOK IN */}
                        {visibleColsOpnameSystem.transferIn && (
                          <td style={{ padding: '12px 10px', textAlign: 'right', color: '#34d399', fontWeight: '700' }}>
                            +{row.transferIn}
                          </td>
                        )}

                        {/* TRANSFER STOK OUT */}
                        {visibleColsOpnameSystem.transferOut && (
                          <td style={{ padding: '12px 10px', textAlign: 'right', color: '#fb7185', fontWeight: '700' }}>
                            -{row.transferOut}
                          </td>
                        )}

                        {/* STOK RUSAK */}
                        {visibleColsOpnameSystem.stokRusak && (
                          <td style={{ padding: '12px 10px', textAlign: 'right', color: '#f43f5e', fontWeight: '700' }}>
                            -{row.stokRusak}
                          </td>
                        )}

                        {/* SISA STOK BY SISTEM */}
                        {visibleColsOpnameSystem.sisaStokSystem && (
                          <td style={{ padding: '12px 10px', textAlign: 'right', background: 'rgba(52, 211, 153, 0.08)' }}>
                            <span style={{
                              padding: '4px 10px',
                              borderRadius: '8px',
                              fontWeight: '900',
                              fontSize: '0.88rem',
                              color: row.sisaStokSystem < 0 ? '#f43f5e' : '#34d399',
                              background: row.sisaStokSystem < 0 ? 'rgba(244, 63, 94, 0.15)' : 'rgba(52, 211, 153, 0.18)',
                              border: `1px solid ${row.sisaStokSystem < 0 ? '#f43f5e' : '#34d399'}`
                            }}>
                              {row.sisaStokSystem.toFixed(1)} {row.unit}
                            </span>
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* SUBTAB 5: STOK OPNAME BY REPORT OUTLET */}
        {(activeSubTab === 'stok_opname_report' || activeSubTab === 'stok_opname') && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: '800', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                <CheckSquare size={18} color="#34d399" />
                <span>Log Stock Opname (Hasil Audit Fisik Inventoris)</span>
              </h3>
              
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                {/* Total Denda Hari Ini (Per Hari) */}
                <div style={{ background: 'rgba(244, 63, 94, 0.15)', border: '1px solid rgba(244, 63, 94, 0.3)', padding: '6px 14px', borderRadius: '10px', color: '#fb7185', fontSize: '0.8rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>📅 Denda Hari Ini:</span>
                  <span style={{ fontSize: '0.9rem', color: '#ffffff' }}>
                    {formatRupiah(
                      getFilteredOpname().reduce((acc, op) => {
                        const todayStr = new Date().toISOString().split('T')[0];
                        if (op.date !== todayStr) return acc;
                        const autoSalesKeluar = getAutoSalesOutflowForIngredient(op.item_name, op.outlet_id);
                        const currentStokKeluar = (op.status === 'ACC' || op.status === 'ok' || op.status === 'approved') 
                          ? (op.stok_keluar !== undefined ? op.stok_keluar : autoSalesKeluar) 
                          : (op.stok_keluar || 0);
                        const sSistem = (op.stok_awal || 0) + (op.stok_masuk || 0) + (op.transfer_masuk || 0) - (currentStokKeluar + (op.stok_rusak || 0) + (op.transfer_keluar || 0));
                        const isDefisit = (op.stok_fisik || 0) < sSistem;
                        const activePrice = getItemPriceFromStokMasuk(op.item_name) || op.harga_satuan || 0;
                        const dendaVal = isDefisit ? Math.abs(sSistem - (op.stok_fisik || 0)) * activePrice : 0;
                        return acc + dendaVal;
                      }, 0)
                    )}
                  </span>
                </div>

                {/* Total Denda Per Stok (Filter) */}
                <div style={{ background: 'rgba(56, 189, 248, 0.15)', border: '1px solid rgba(56, 189, 248, 0.3)', padding: '6px 14px', borderRadius: '10px', color: '#38bdf8', fontSize: '0.8rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>💸 Total Denda Per Stok (Filter):</span>
                  <span style={{ fontSize: '0.9rem', color: '#ffffff' }}>
                    {formatRupiah(
                      getFilteredOpname().reduce((acc, op) => {
                        const autoSalesKeluar = getAutoSalesOutflowForIngredient(op.item_name, op.outlet_id);
                        const currentStokKeluar = (op.status === 'ACC' || op.status === 'ok' || op.status === 'approved') 
                          ? (op.stok_keluar !== undefined ? op.stok_keluar : autoSalesKeluar) 
                          : (op.stok_keluar || 0);
                        const sSistem = (op.stok_awal || 0) + (op.stok_masuk || 0) + (op.transfer_masuk || 0) - (currentStokKeluar + (op.stok_rusak || 0) + (op.transfer_keluar || 0));
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
            
            <div style={{ overflowX: 'auto', border: '1px solid #334155', borderRadius: '10px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ background: '#1e293b', borderBottom: '1px solid #334155', color: '#cbd5e1', fontWeight: '800', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                    {visibleColsOpname.date && <th style={{ padding: '12px 10px' }}>Tanggal Audit</th>}
                    {visibleColsOpname.createdBy && <th style={{ padding: '12px 10px' }}>Dibuat Oleh</th>}
                    {visibleColsOpname.outletId && <th style={{ padding: '12px 10px' }}>Outlet</th>}
                    {visibleColsOpname.itemName && <th style={{ padding: '12px 10px' }}>Nama Item</th>}
                    {visibleColsOpname.stokAwal && <th style={{ padding: '12px 10px', textAlign: 'right' }}>Stok Awal</th>}
                    {visibleColsOpname.stokMasuk && <th style={{ padding: '12px 10px', textAlign: 'right' }}>Stok Masuk</th>}
                    {visibleColsOpname.stokKeluar && <th style={{ padding: '12px 10px', textAlign: 'right' }}>Stok Keluar</th>}
                    {visibleColsOpname.transferMasuk && <th style={{ padding: '12px 10px', textAlign: 'right' }}>Trans. Masuk</th>}
                    {visibleColsOpname.transferKeluar && <th style={{ padding: '12px 10px', textAlign: 'right' }}>Trans. Keluar</th>}
                    {visibleColsOpname.stokRusak && <th style={{ padding: '12px 10px', textAlign: 'right' }}>Stok Rusak</th>}
                    {visibleColsOpname.stokSistem && <th style={{ padding: '12px 10px', textAlign: 'right' }}>Sistem</th>}
                    {visibleColsOpname.stokFisik && <th style={{ padding: '12px 10px', textAlign: 'right' }}>Fisik</th>}
                    {visibleColsOpname.selisih && <th style={{ padding: '12px 10px', textAlign: 'center' }}>Analisis Selisih</th>}
                    {visibleColsOpname.hargaSatuan && <th style={{ padding: '12px 10px', textAlign: 'right' }}>Harga Satuan</th>}
                    {visibleColsOpname.dendaStok && <th style={{ padding: '12px 10px', textAlign: 'right', color: '#fb7185' }}>⚠️ Denda Per Stok</th>}
                    {visibleColsOpname.notes && <th style={{ padding: '12px 10px' }}>Catatan</th>}
                    <th style={{ padding: '12px 10px', textAlign: 'center', width: '220px' }}>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {getFilteredOpname().length === 0 ? (
                    <tr>
                      <td colSpan={17} style={{ padding: '30px', textAlign: 'center', color: '#64748b' }}>
                        Tidak ada log stock opname untuk outlet terpilih.
                      </td>
                    </tr>
                  ) : (
                    getFilteredOpname().map(op => {
                      const autoSalesKeluar = getAutoSalesOutflowForIngredient(op.item_name, op.outlet_id);
                      const currentStokKeluar = op.stok_keluar !== undefined && op.stok_keluar > 0 ? op.stok_keluar : autoSalesKeluar;

                      const sSistem = (op.stok_awal || 0) + (op.stok_masuk || 0) + (op.transfer_masuk || 0) - (currentStokKeluar + (op.stok_rusak || 0) + (op.transfer_keluar || 0));
                      const diffVal = (op.stok_fisik || 0) - sSistem;
                      const selisihStatus = getSelisihStatus(sSistem, op.stok_fisik || 0);
                      const activePrice = getItemPriceFromStokMasuk(op.item_name) || op.harga_satuan || 0;
                      const isDefisit = (op.stok_fisik || 0) < sSistem;
                      const dendaVal = isDefisit ? Math.abs(sSistem - (op.stok_fisik || 0)) * activePrice : 0;
                      const isACC = op.status === 'ACC' || op.status === 'ok' || op.status === 'approved';
                      
                      return (
                        <tr key={op.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', color: '#f8fafc' }}>
                          {visibleColsOpname.date && <td style={{ padding: '12px 10px', color: '#94a3b8' }}>{op.date}</td>}
                          {visibleColsOpname.createdBy && (
                            <td style={{ padding: '12px 10px', color: '#cbd5e1', fontWeight: '600' }}>
                              <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <span>👤 {op.created_by || op.submitted_by || 'Admin'}</span>
                                <span style={{ fontSize: '0.7rem', color: isACC ? '#34d399' : '#fbbf24', textTransform: 'uppercase', fontWeight: '800' }}>
                                  {isACC ? '🟢 ACC' : '⏳ PENDING'}
                                </span>
                              </div>
                            </td>
                          )}
                          {visibleColsOpname.outletId && <td style={{ padding: '12px 10px', fontWeight: '700' }}>🏢 {getOutletName(op.outlet_id)}</td>}
                          {visibleColsOpname.itemName && <td style={{ padding: '12px 10px', fontWeight: '800', color: '#34d399' }}>{op.item_name}</td>}
                          {visibleColsOpname.stokAwal && <td style={{ padding: '12px 10px', textAlign: 'right' }}>{op.stok_awal || 0}</td>}
                          {visibleColsOpname.stokMasuk && <td style={{ padding: '12px 10px', textAlign: 'right', color: '#38bdf8' }}>+{op.stok_masuk || 0}</td>}
                          {visibleColsOpname.stokKeluar && (
                            <td style={{ padding: '12px 10px', textAlign: 'right', color: '#fb7185', fontWeight: '800' }}>
                              -{currentStokKeluar}
                            </td>
                          )}
                          {visibleColsOpname.transferMasuk && <td style={{ padding: '12px 10px', textAlign: 'right', color: '#34d399' }}>+{op.transfer_masuk || 0}</td>}
                          {visibleColsOpname.transferKeluar && <td style={{ padding: '12px 10px', textAlign: 'right', color: '#fb7185' }}>-{op.transfer_keluar || 0}</td>}
                          {visibleColsOpname.stokRusak && <td style={{ padding: '12px 10px', textAlign: 'right', color: '#fb7185' }}>-{op.stok_rusak || 0}</td>}
                          {visibleColsOpname.stokSistem && <td style={{ padding: '12px 10px', textAlign: 'right', fontWeight: '700' }}>{sSistem}</td>}
                          {visibleColsOpname.stokFisik && <td style={{ padding: '12px 10px', textAlign: 'right', fontWeight: '800', color: '#34d399' }}>{op.stok_fisik || 0}</td>}
                          {visibleColsOpname.selisih && (
                            <td style={{ padding: '12px 10px', textAlign: 'center' }}>
                              <span style={{
                                padding: '3px 8px', borderRadius: '6px', fontSize: '0.72rem', fontWeight: '800',
                                color: selisihStatus.color, background: selisihStatus.bg, border: `1px solid ${selisihStatus.border}`,
                                textTransform: 'uppercase'
                              }}>
                                {selisihStatus.text}
                              </span>
                            </td>
                          )}
                          {visibleColsOpname.hargaSatuan && <td style={{ padding: '12px 10px', textAlign: 'right' }}>{formatRupiah(activePrice)}</td>}
                          {visibleColsOpname.dendaStok && (
                            <td style={{ padding: '12px 10px', textAlign: 'right', fontWeight: '800', color: dendaVal > 0 ? '#fb7185' : '#64748b' }}>
                              {dendaVal > 0 ? formatRupiah(dendaVal) : '-'}
                            </td>
                          )}
                          {visibleColsOpname.notes && <td style={{ padding: '12px 10px', color: '#94a3b8' }}>{op.notes}</td>}
                          
                          {/* Aksi ACC & Kirim APK */}
                          <td style={{ padding: '12px 10px', display: 'flex', gap: '6px', justifyContent: 'center', alignItems: 'center' }}>
                            {!isACC ? (
                              <button
                                onClick={() => handleApproveOpnameReport(op)}
                                style={{
                                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                  border: 'none', color: '#ffffff', padding: '5px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: '900', display: 'flex', alignItems: 'center', gap: '4px', boxShadow: '0 2px 8px rgba(16,185,129,0.3)'
                                }}
                                title="ACC / Setujui Laporan & Hitung Otomatis Stok Keluar Penjualan"
                              >
                                <CheckCircle2 size={13} />
                                <span>ACC</span>
                              </button>
                            ) : (
                              <span style={{ background: 'rgba(52, 211, 153, 0.15)', color: '#34d399', border: '1px solid rgba(52, 211, 153, 0.4)', padding: '3px 8px', borderRadius: '6px', fontSize: '0.72rem', fontWeight: '800' }}>
                                ✅ ACC
                              </span>
                            )}

                            <button
                              onClick={() => handleSendToMobileAPK(op.item_name, op)}
                              disabled={!isACC}
                              style={{
                                background: isACC ? 'rgba(56, 189, 248, 0.15)' : 'rgba(148, 163, 184, 0.1)',
                                border: `1px solid ${isACC ? 'rgba(56, 189, 248, 0.4)' : 'rgba(148, 163, 184, 0.2)'}`,
                                color: isACC ? '#38bdf8' : '#64748b',
                                padding: '5px 10px', borderRadius: '6px',
                                cursor: isACC ? 'pointer' : 'not-allowed',
                                fontSize: '0.75rem', fontWeight: '800',
                                display: 'flex', alignItems: 'center', gap: '4px'
                              }}
                              title={isACC ? "Kirim data logistik ter-ACC ke Mobile APK Kasir" : "Laporan harus di-ACC terlebih dahulu sebelum dapat dikirim ke Mobile APK"}
                            >
                              <Smartphone size={13} />
                              <span>Kirim APK</span>
                            </button>

                            <button
                              onClick={() => handleDeleteRecord(op.id, 'stok_opname')}
                              style={{
                                background: 'rgba(244, 63, 94, 0.15)', border: '1px solid rgba(244, 63, 94, 0.3)', color: '#f43f5e', padding: '5px 8px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '4px'
                              }}
                              title="Hapus Record"
                            >
                              <Trash2 size={12} />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* SUBTAB 6: PERBANDINGAN HARGA */}
        {activeSubTab === 'perbandingan_harga' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: '800', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <DollarSign size={18} color="#c084fc" />
                  <span>Perbandingan Harga Bahan Baku Antar Outlet (Tanggal ke Tanggal)</span>
                </h3>
                <p style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '2px' }}>
                  Perbandingan harga bahan baku tiap outlet berdasarkan tanggal. Harga bahan baku diambil secara otomatis dari <b>Halaman Logistik -&gt; Stok Masuk</b> (dibagian <b>Harga Satuan</b>).
                </p>
              </div>
            </div>

            {/* KPI HIGHLIGHT CARDS: ANALISIS HARGA TERTINGGI BAHAN BAKU */}
            {(() => {
              const listPrc = getFilteredPriceComparison();
              const activeCardItem = priceItemFilter !== 'ALL' ? priceItemFilter : (ingredientsList[0]?.name || 'Daging Ayam Fillet');
              const itemRecords = listPrc.filter(r => (r.item_name || '').toLowerCase().trim() === activeCardItem.toLowerCase().trim());

              let maxPriceRecord = { price: 0, outletName: '-', date: '-', unit: 'kg' };
              let lowestPriceRecord = { price: Infinity, outletName: '-', date: '-' };
              let totalPriceSum = 0;
              let totalCount = 0;

              itemRecords.forEach(row => {
                outlets.forEach(out => {
                  const pVal = Number(row.prices?.[out.id] || 0);
                  if (pVal > 0) {
                    totalPriceSum += pVal;
                    totalCount++;

                    if (pVal > maxPriceRecord.price) {
                      maxPriceRecord = {
                        price: pVal,
                        outletName: out.name,
                        date: row.date,
                        unit: row.unit || 'kg'
                      };
                    }

                    if (pVal < lowestPriceRecord.price) {
                      lowestPriceRecord = {
                        price: pVal,
                        outletName: out.name,
                        date: row.date
                      };
                    }
                  }
                });
              });

              if (lowestPriceRecord.price === Infinity) lowestPriceRecord.price = 0;
              const avgPrice = totalCount > 0 ? Math.round(totalPriceSum / totalCount) : 0;
              const priceGap = maxPriceRecord.price - lowestPriceRecord.price;
              const gapPercent = lowestPriceRecord.price > 0 ? Math.round((priceGap / lowestPriceRecord.price) * 100) : 0;

              return (
                <div style={{ background: '#1e293b', border: '1px solid rgba(192, 132, 252, 0.3)', padding: '18px', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  
                  {/* CARD HEADER & INGREDIENT FILTER DROPDOWN */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', borderBottom: '1px solid #334155', paddingBottom: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '1.1rem' }}>👑</span>
                      <div>
                        <div style={{ fontSize: '0.85rem', fontWeight: '900', color: '#c084fc', textTransform: 'uppercase' }}>
                          Analisis Harga Satuan Tertinggi Bahan Baku
                        </div>
                        <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                          Periode Rentang Waktu: <span style={{ color: '#38bdf8', fontWeight: '800' }}>{logStartDate || 'Semua Tanggal'}</span> s/d <span style={{ color: '#38bdf8', fontWeight: '800' }}>{logEndDate || 'Hari Ini'}</span>
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '0.78rem', color: '#cbd5e1', fontWeight: '800' }}>🥦 Pilih Bahan Baku:</span>
                      <select
                        value={priceItemFilter}
                        onChange={e => setPriceItemFilter(e.target.value)}
                        style={{ height: '36px', padding: '0 12px', background: '#0f172a', border: '1px solid #c084fc', color: '#f8fafc', borderRadius: '8px', fontSize: '0.82rem', fontWeight: '800', cursor: 'pointer' }}
                      >
                        <option value="ALL">Semua Item (Pilih Spesifik)</option>
                        {ingredientsList.map(ing => (
                          <option key={ing.id} value={ing.name}>{ing.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* THREE METRIC BOXES */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
                    
                    {/* BOX 1: HARGA SATUAN TERTINGGI */}
                    <div style={{ background: '#0f172a', border: '1px solid rgba(244, 63, 94, 0.4)', padding: '14px', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <div style={{ fontSize: '0.72rem', fontWeight: '800', color: '#fb7185', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span>🔴 HARGA SATUAN TERTINGGI</span>
                      </div>
                      <div style={{ fontSize: '1.35rem', fontWeight: '900', color: '#ffffff' }}>
                        {maxPriceRecord.price > 0 ? formatRupiah(maxPriceRecord.price) : '-'} <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>/ {maxPriceRecord.unit}</span>
                      </div>
                      <div style={{ fontSize: '0.74rem', color: '#cbd5e1', fontWeight: '700' }}>
                        📦 Item: <span style={{ color: '#c084fc' }}>{activeCardItem}</span>
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                        🏢 Outlet: <span style={{ color: '#fb7185', fontWeight: '800' }}>{maxPriceRecord.outletName}</span> (Tanggal: {maxPriceRecord.date})
                      </div>
                    </div>

                    {/* BOX 2: HARGA TERENDAH & DISPARITAS GAP */}
                    <div style={{ background: '#0f172a', border: '1px solid rgba(52, 211, 153, 0.4)', padding: '14px', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <div style={{ fontSize: '0.72rem', fontWeight: '800', color: '#34d399', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span>🟢 HARGA SATUAN TERENDAH</span>
                      </div>
                      <div style={{ fontSize: '1.35rem', fontWeight: '900', color: '#ffffff' }}>
                        {lowestPriceRecord.price > 0 ? formatRupiah(lowestPriceRecord.price) : '-'}
                      </div>
                      <div style={{ fontSize: '0.74rem', color: '#cbd5e1', fontWeight: '700' }}>
                        🏢 Outlet: <span style={{ color: '#34d399' }}>{lowestPriceRecord.outletName}</span> (Tanggal: {lowestPriceRecord.date})
                      </div>
                      <div style={{ fontSize: '0.72rem', color: priceGap > 0 ? '#fb7185' : '#34d399', fontWeight: '800' }}>
                        ⚡ Selisih (Disparitas): {priceGap > 0 ? `+${formatRupiah(priceGap)} (+${gapPercent}%)` : 'Harga Seragam (0%)'}
                      </div>
                    </div>

                    {/* BOX 3: RATA-RATA HARGA ANTAR OUTLET */}
                    <div style={{ background: '#0f172a', border: '1px solid rgba(56, 189, 248, 0.4)', padding: '14px', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <div style={{ fontSize: '0.72rem', fontWeight: '800', color: '#38bdf8', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span>📊 RATA-RATA HARGA SATUAN</span>
                      </div>
                      <div style={{ fontSize: '1.35rem', fontWeight: '900', color: '#ffffff' }}>
                        {avgPrice > 0 ? formatRupiah(avgPrice) : '-'}
                      </div>
                      <div style={{ fontSize: '0.74rem', color: '#cbd5e1', fontWeight: '700' }}>
                        📈 Total Pencatatan Stok Masuk: {totalCount} Data
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                        Rata-rata harga pembelian dari seluruh outlet ter-filter
                      </div>
                    </div>

                  </div>
                </div>
              );
            })()}

            {/* SEARCH & ITEM FILTER BAR */}
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap', background: '#1e293b', padding: '12px', borderRadius: '8px', border: '1px solid #334155' }}>
              <div style={{ flex: 1, minWidth: '220px', position: 'relative' }}>
                <input
                  type="text"
                  placeholder="Cari nama item / bahan baku..."
                  value={priceSearchQuery}
                  onChange={e => setPriceSearchQuery(e.target.value)}
                  className="form-input"
                  style={{ paddingLeft: '36px', height: '38px', fontSize: '0.82rem' }}
                />
                <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}>🔍</span>
              </div>

              <div style={{ minWidth: '220px' }}>
                <select
                  value={priceItemFilter}
                  onChange={e => setPriceItemFilter(e.target.value)}
                  className="form-select"
                  style={{ height: '38px', fontSize: '0.82rem' }}
                >
                  <option value="ALL">Semua Bahan Baku (Master Data)</option>
                  {ingredientsList.map(ing => (
                    <option key={ing.id} value={ing.name}>{ing.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* TABLE PERBANDINGAN HARGA */}
            <div style={{ overflowX: 'auto', border: '1px solid #334155', borderRadius: '10px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ background: '#1e293b', borderBottom: '1px solid #334155', color: '#cbd5e1', fontWeight: '800', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                    {visibleColsHarga.date && <th style={{ padding: '12px 10px' }}>Tanggal</th>}
                    {visibleColsHarga.itemName && <th style={{ padding: '12px 10px' }}>Nama Item (Bahan Baku)</th>}
                    {visibleColsHarga.category && <th style={{ padding: '12px 10px' }}>Kategori</th>}
                    {visibleColsHarga.unit && <th style={{ padding: '12px 10px' }}>Satuan</th>}
                    
                    {/* DYNAMIC OUTLET PRICE COLUMNS */}
                    {visibleColsHarga.outletPrices && outlets.map(o => (
                      <th key={o.id} style={{ padding: '12px 10px', textAlign: 'right' }}>
                        Harga {o.name}
                      </th>
                    ))}

                    {visibleColsHarga.highestPrice && <th style={{ padding: '12px 10px', textAlign: 'center' }}>Analisis Selisih</th>}
                    {visibleColsHarga.actions && <th style={{ padding: '12px 10px', textAlign: 'center' }}>Aksi</th>}
                  </tr>
                </thead>
                <tbody>
                  {getFilteredPriceComparison().length === 0 ? (
                    <tr>
                      <td colSpan={5 + outlets.length} style={{ padding: '30px', textAlign: 'center', color: '#64748b' }}>
                        Belum ada data perbandingan harga stok. Silakan klik tombol "+ Tambah Perbandingan Harga".
                      </td>
                    </tr>
                  ) : (
                    getFilteredPriceComparison().map(item => {
                      const allPrices = outlets.map(o => Number(item.prices?.[o.id] || 0));
                      const maxPrice = Math.max(...allPrices);
                      const minPrice = Math.min(...allPrices.filter(p => p > 0));
                      const hasPriceDiff = maxPrice > minPrice && maxPrice > 0;

                      return (
                        <tr key={item.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', color: '#f8fafc' }}>
                          {visibleColsHarga.date && <td style={{ padding: '12px 10px', color: '#94a3b8' }}>{item.date}</td>}
                          {visibleColsHarga.itemName && <td style={{ padding: '12px 10px', fontWeight: '800', color: '#c084fc' }}>{item.item_name}</td>}
                          {visibleColsHarga.category && (
                            <td style={{ padding: '12px 10px' }}>
                              <span style={{ background: '#1e293b', padding: '2px 8px', borderRadius: '4px', border: '1px solid #334155', fontSize: '0.75rem', color: '#cbd5e1' }}>
                                {item.category || 'Bahan Baku'}
                              </span>
                            </td>
                          )}
                          {visibleColsHarga.unit && <td style={{ padding: '12px 10px', color: '#cbd5e1' }}>{item.unit || 'kg'}</td>}

                          {/* OUTLET PRICE CELLS WITH RED HIGHLIGHT FOR HIGHEST PRICE */}
                          {visibleColsHarga.outletPrices && outlets.map(o => {
                            const pVal = Number(item.prices?.[o.id] || 0);
                            const isHighest = pVal === maxPrice && hasPriceDiff;

                            return (
                              <td key={o.id} style={{ padding: '12px 10px', textAlign: 'right' }}>
                                {isHighest ? (
                                  <span style={{
                                    background: 'rgba(244, 63, 94, 0.15)',
                                    color: '#fb7185',
                                    border: '1px solid rgba(244, 63, 94, 0.4)',
                                    padding: '4px 8px',
                                    borderRadius: '6px',
                                    fontWeight: '800',
                                    fontSize: '0.8rem',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px'
                                  }}>
                                    <span>🔴</span>
                                    <span>{formatRupiah(pVal)}</span>
                                  </span>
                                ) : (
                                  <span style={{ fontWeight: '700', color: pVal > 0 ? '#f8fafc' : '#64748b' }}>
                                    {pVal > 0 ? formatRupiah(pVal) : '-'}
                                  </span>
                                )}
                              </td>
                            );
                          })}

                          {/* HIGHEST PRICE SUMMARY */}
                          {visibleColsHarga.highestPrice && (
                            <td style={{ padding: '12px 10px', textAlign: 'center' }}>
                              {hasPriceDiff ? (
                                <span style={{ color: '#fb7185', fontWeight: '800', fontSize: '0.75rem', background: 'rgba(244,63,94,0.1)', padding: '4px 8px', borderRadius: '6px', border: '1px solid rgba(244,63,94,0.2)' }}>
                                  ⚠️ Selisih {formatRupiah(maxPrice - minPrice)}
                                </span>
                              ) : (
                                <span style={{ color: '#34d399', fontWeight: '700', fontSize: '0.75rem' }}>
                                  ✓ Harga Seragam
                                </span>
                              )}
                            </td>
                          )}

                          {/* ACTIONS EDIT & DELETE */}
                          {visibleColsHarga.actions && (
                            <td style={{ padding: '12px 10px', textAlign: 'center' }}>
                              <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                                <button
                                  onClick={() => handleOpenEditPriceModal(item)}
                                  style={{
                                    background: 'rgba(56, 189, 248, 0.15)', border: '1px solid rgba(56, 189, 248, 0.3)', color: '#38bdf8', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '4px'
                                  }}
                                >
                                  <Edit3 size={12} />
                                  <span>Edit</span>
                                </button>
                                <button
                                  onClick={() => handleDeletePriceRecord(item.id)}
                                  style={{
                                    background: 'rgba(244, 63, 94, 0.15)', border: '1px solid rgba(244, 63, 94, 0.3)', color: '#f43f5e', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '4px'
                                  }}
                                >
                                  <Trash2 size={12} />
                                  <span>Hapus</span>
                                </button>
                              </div>
                            </td>
                          )}
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {showAddModal === 'masuk' && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(5px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 110 }}>
          <div className="glass-card animate-fade-in" style={{ padding: '24px', width: '920px', maxHeight: '90vh', overflowY: 'auto', border: '1px solid #38bdf8', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #334155', paddingBottom: '12px' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: '900', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ArrowDownRight size={22} color="#38bdf8" />
                <span>Tambah Laporan Logistik Masuk Manual</span>
              </h3>
              <button 
                onClick={() => handleAddRow()} 
                className="btn-primary" 
                style={{ padding: '8px 14px', fontSize: '0.78rem', background: '#38bdf8', color: '#0f172a' }}
              >
                <Plus size={14} />
                <span>Tambahkan Item Baru</span>
              </button>
            </div>

            {/* Global Header Inputs (Date, Outlet, Author) */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', background: '#0f172a', padding: '16px', borderRadius: '8px', border: '1px solid #334155' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: '700' }}>Tanggal Input</label>
                <input 
                  type="date" 
                  value={manualDate} 
                  onChange={e => setManualDate(e.target.value)} 
                  style={{ padding: '8px 12px', background: '#1e293b', border: '1px solid #334155', borderRadius: '6px', color: 'white', fontSize: '0.85rem' }} 
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: '700' }}>Nama Outlet Cabang</label>
                <select 
                  value={manualOutletId} 
                  onChange={e => setManualOutletId(Number(e.target.value))} 
                  style={{ padding: '8px 12px', background: '#1e293b', border: '1px solid #334155', borderRadius: '6px', color: 'white', fontSize: '0.85rem', cursor: 'pointer' }}
                >
                  {outlets.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: '700' }}>Dibuat Oleh (Petugas)</label>
                <select 
                  value={manualCreatedBy} 
                  onChange={e => setManualCreatedBy(e.target.value)} 
                  style={{ padding: '8px 12px', background: '#1e293b', border: '1px solid #334155', borderRadius: '6px', color: 'white', fontSize: '0.85rem', cursor: 'pointer' }}
                >
                  {userRightsList.map(u => <option key={u.id} value={u.name}>{u.name} ({u.role})</option>)}
                </select>
              </div>
            </div>

            {/* Dynamic Rows Form */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 1fr 1fr 1fr 1fr 40px', gap: '10px', fontSize: '0.75rem', color: '#cbd5e1', fontWeight: '700', textTransform: 'uppercase', paddingBottom: '4px', borderBottom: '1px solid #334155' }}>
                <div>Nama Item / Cari</div>
                <div>Supplier</div>
                <div style={{ textAlign: 'right' }}>Jumlah (Qty)</div>
                <div>Satuan</div>
                <div style={{ textAlign: 'right' }}>Harga Satuan (Rp)</div>
                <div style={{ textAlign: 'right' }}>Total (Rp)</div>
                <div></div>
              </div>

              {manualRows.map((row, idx) => {
                // Find selected ingredient unit
                const selectedIng = ingredientsList.find(i => i.id === Number(row.ingredientId)) || { unit: 'kg' };
                // Filter ingredients based on text search query
                const filteredIngs = ingredientsList.filter(i => 
                  i.name.toLowerCase().includes(row.searchQuery.toLowerCase())
                );

                const totalVal = (Number(row.qty) || 0) * (Number(row.priceUnit) || 0);

                return (
                  <div key={idx} style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 1fr 1fr 1fr 1fr 40px', gap: '10px', alignItems: 'center' }}>
                    
                    {/* Search & Select Combobox */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <input
                        type="text"
                        placeholder="Ketik untuk cari..."
                        value={row.searchQuery}
                        onChange={e => handleUpdateRow(idx, 'searchQuery', e.target.value)}
                        style={{ padding: '6px 8px', background: '#1e293b', border: '1px solid #334155', borderRadius: '4px 4px 0 0', color: 'white', fontSize: '0.78rem' }}
                      />
                      <select
                        value={row.ingredientId}
                        onChange={e => handleUpdateRow(idx, 'ingredientId', Number(e.target.value))}
                        style={{ padding: '6px 8px', background: '#0f172a', border: '1px solid #334155', borderTop: 'none', borderRadius: '0 0 4px 4px', color: 'white', fontSize: '0.78rem', cursor: 'pointer' }}
                      >
                        {filteredIngs.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                      </select>
                    </div>

                    {/* Supplier */}
                    <select
                      value={row.supplierId}
                      onChange={e => handleUpdateRow(idx, 'supplierId', Number(e.target.value))}
                      style={{ padding: '8px', background: '#1e293b', border: '1px solid #334155', borderRadius: '4px', color: 'white', fontSize: '0.8rem', cursor: 'pointer' }}
                    >
                      {suppliersList.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>

                    {/* Qty */}
                    <input
                      type="number"
                      placeholder="Jumlah"
                      value={row.qty}
                      onChange={e => handleUpdateRow(idx, 'qty', e.target.value)}
                      style={{ padding: '8px', background: '#1e293b', border: '1px solid #334155', borderRadius: '4px', color: 'white', fontSize: '0.8rem', textAlign: 'right' }}
                    />

                    {/* Unit (Locked) */}
                    <input
                      type="text"
                      readOnly
                      value={selectedIng.unit || 'pcs'}
                      style={{ padding: '8px', background: '#0f172a', border: '1px solid #334155', borderRadius: '4px', color: '#94a3b8', fontSize: '0.8rem' }}
                    />

                    {/* Price Unit */}
                    <input
                      type="number"
                      placeholder="Harga"
                      value={row.priceUnit}
                      onChange={e => handleUpdateRow(idx, 'priceUnit', e.target.value)}
                      style={{ padding: '8px', background: '#1e293b', border: '1px solid #334155', borderRadius: '4px', color: 'white', fontSize: '0.8rem', textAlign: 'right' }}
                    />

                    {/* Total Price (Formula) */}
                    <div style={{ padding: '8px', textAlign: 'right', fontWeight: '800', color: '#34d399', fontSize: '0.82rem' }}>
                      {formatRupiah(totalVal)}
                    </div>

                    {/* Delete button */}
                    <button
                      type="button"
                      onClick={() => handleRemoveRow(idx)}
                      disabled={manualRows.length <= 1}
                      style={{ background: 'none', border: 'none', color: '#f43f5e', cursor: 'pointer', opacity: manualRows.length <= 1 ? 0.3 : 1 }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Bottom calculation & Actions */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #334155', paddingTop: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
                <span style={{ fontSize: '0.85rem', color: '#94a3b8', fontWeight: '700' }}>TOTAL NILAI BELANJA LOGISTIK:</span>
                <span style={{ fontSize: '1.4rem', fontWeight: '900', color: '#34d399' }}>{formatRupiah(getManualGrandTotal())}</span>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="button" onClick={() => setShowAddModal(null)} className="btn-secondary" style={{ padding: '10px 18px', fontSize: '0.85rem' }}>Batal</button>
                <button 
                  type="button" 
                  onClick={() => setShowPreviewModal(true)} 
                  className="btn-primary" 
                  style={{ padding: '10px 20px', fontSize: '0.85rem', background: '#38bdf8', color: '#0f172a' }}
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
          <div className="glass-card animate-fade-in" style={{ padding: '24px', width: '780px', border: '2px solid #34d399', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <h3 style={{ fontSize: '1.3rem', fontWeight: '900', color: '#f8fafc', borderBottom: '1px solid #334155', paddingBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckSquare size={24} color="#34d399" />
                <span>Papan Konfirmasi & Preview Laporan Logistik</span>
              </h3>
              <p style={{ color: '#cbd5e1', fontSize: '0.8rem', marginTop: '6px' }}>
                Tinjau kembali daftar logistik masuk yang Anda catat sebelum disimpan permanen ke dalam basis data sistem.
              </p>
            </div>

            {/* Metadata Summary */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px', background: '#0f172a', padding: '12px 16px', borderRadius: '8px', border: '1px solid #334155', fontSize: '0.82rem' }}>
              <div><span style={{ color: '#94a3b8' }}>Tanggal Input:</span> <strong style={{ color: '#f8fafc' }}>{manualDate}</strong></div>
              <div><span style={{ color: '#94a3b8' }}>Outlet Cabang:</span> <strong style={{ color: '#f8fafc' }}>{getOutletName(manualOutletId)}</strong></div>
              <div><span style={{ color: '#94a3b8' }}>Dibuat Oleh:</span> <strong style={{ color: '#f8fafc' }}>{manualCreatedBy}</strong></div>
            </div>

            {/* Items Table Preview */}
            <div style={{ border: '1px solid #334155', borderRadius: '8px', overflow: 'hidden', background: '#0f172a' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.82rem' }}>
                <thead>
                  <tr style={{ background: '#1e293b', borderBottom: '1px solid #334155', color: '#cbd5e1', fontWeight: '800' }}>
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
                      <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', color: '#f8fafc' }}>
                        <td style={{ padding: '10px', fontWeight: '700', color: '#38bdf8' }}>{ing.name}</td>
                        <td style={{ padding: '10px', color: '#cbd5e1' }}>{sup.name}</td>
                        <td style={{ padding: '10px', textAlign: 'right', fontWeight: '700' }}>{qtyVal}</td>
                        <td style={{ padding: '10px', color: '#94a3b8' }}>{ing.unit}</td>
                        <td style={{ padding: '10px', textAlign: 'right' }}>{formatRupiah(prcVal)}</td>
                        <td style={{ padding: '10px', textAlign: 'right', fontWeight: '800', color: '#34d399' }}>{formatRupiah(qtyVal * prcVal)}</td>
                      </tr>
                    );
                  })}
                  <tr style={{ background: '#1e293b', fontWeight: '900', color: '#34d399' }}>
                    <td colspan="5" style={{ padding: '12px 10px' }}>TOTAL KESELURUHAN</td>
                    <td style={{ padding: '12px 10px', textAlign: 'right', fontSize: '0.9rem' }}>{formatRupiah(getManualGrandTotal())}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Preview Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', borderTop: '1px solid #334155', paddingTop: '16px' }}>
              <button 
                type="button" 
                onClick={() => setShowPreviewModal(false)} 
                className="btn-secondary" 
                style={{ padding: '10px 18px', fontSize: '0.85rem', borderColor: '#fbbf24', color: '#fbbf24' }}
              >
                ✏️ Edit Lagi (Kembali)
              </button>
              <button 
                type="button" 
                onClick={() => handleCommitManualLogistics()} 
                className="btn-primary" 
                style={{ padding: '10px 24px', fontSize: '0.85rem', background: '#34d399', color: '#0f172a' }}
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
          <form onSubmit={handleSaveEditRecord} className="glass-card animate-fade-in" style={{ padding: '24px', width: '480px', border: `1px solid ${editType === 'masuk' ? '#38bdf8' : editType === 'waste' ? '#f43f5e' : editType === 'opname' ? '#34d399' : '#fbbf24'}`, display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: '900', color: '#f8fafc', borderBottom: '1px solid #334155', paddingBottom: '12px' }}>
              ✏️ {editType === 'masuk' ? 'Edit Record Logistik Masuk' : editType === 'waste' ? 'Edit Laporan Stok Rusak (Waste)' : editType === 'opname' ? 'Edit Audit Stock Opname' : 'Edit Transfer Stok Antarcabang'}
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Tanggal</span>
                <input type="date" value={editDate} onChange={e => setEditDate(e.target.value)} style={{ padding: '8px', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', color: 'white', fontSize: '0.82rem' }} />
              </div>

              {(editType === 'masuk' || editType === 'waste' || editType === 'opname') ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Restoran Outlet</span>
                  <select value={editOutletId} onChange={e => setEditOutletId(Number(e.target.value))} style={{ padding: '8px', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', color: 'white', fontSize: '0.82rem' }}>
                    {outlets.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                  </select>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Status Pengiriman</span>
                  <select value={editStatus} onChange={e => setEditStatus(e.target.value)} style={{ padding: '8px', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', color: 'white', fontSize: '0.82rem' }}>
                    <option value="Terkirim">Terkirim</option>
                    <option value="Dalam Perjalanan">Dalam Perjalanan</option>
                  </select>
                </div>
              )}
            </div>

            {editType === 'transfer' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Dari Outlet Asal</span>
                  <select value={editFromOutletId} onChange={e => setEditFromOutletId(Number(e.target.value))} style={{ padding: '8px', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', color: 'white', fontSize: '0.82rem' }}>
                    {outlets.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                  </select>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Ke Outlet Tujuan</span>
                  <select value={editToOutletId} onChange={e => setEditToOutletId(Number(e.target.value))} style={{ padding: '8px', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', color: 'white', fontSize: '0.82rem' }}>
                    {outlets.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                  </select>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Dibuat Oleh</span>
              <input type="text" value={editCreatedBy} onChange={e => setEditCreatedBy(e.target.value)} style={{ padding: '10px', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', color: 'white', fontSize: '0.85rem' }} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Nama Item / Bahan</span>
              <input type="text" value={editItemName} onChange={e => setEditItemName(e.target.value)} style={{ padding: '10px', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', color: 'white', fontSize: '0.85rem' }} />
            </div>

            {editType === 'masuk' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Supplier</span>
                <input type="text" value={editSupplier} onChange={e => setEditSupplier(e.target.value)} style={{ padding: '10px', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', color: 'white', fontSize: '0.85rem' }} />
              </div>
            )}

            {editType === 'opname' ? (
              <>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Satuan</span>
                  <input type="text" value={editUnit} onChange={e => setEditUnit(e.target.value)} style={{ padding: '8px', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', color: 'white', fontSize: '0.82rem' }} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Stok Awal</span>
                    <input type="number" value={editStokAwal} onChange={e => setEditStokAwal(e.target.value)} style={{ padding: '8px', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', color: 'white', fontSize: '0.8rem' }} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Stok Masuk</span>
                    <input type="number" value={editStokMasuk} onChange={e => setEditStokMasuk(e.target.value)} style={{ padding: '8px', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', color: 'white', fontSize: '0.8rem' }} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Stok Keluar</span>
                    <input type="number" value={editStokKeluar} onChange={e => setEditStokKeluar(e.target.value)} style={{ padding: '8px', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', color: 'white', fontSize: '0.8rem' }} />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Trans. Masuk</span>
                    <input type="number" value={editTransferMasuk} onChange={e => setEditTransferMasuk(e.target.value)} style={{ padding: '8px', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', color: 'white', fontSize: '0.8rem' }} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Trans. Keluar</span>
                    <input type="number" value={editTransferKeluar} onChange={e => setEditTransferKeluar(e.target.value)} style={{ padding: '8px', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', color: 'white', fontSize: '0.8rem' }} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Stok Rusak</span>
                    <input type="number" value={editStokRusak} onChange={e => setEditStokRusak(e.target.value)} style={{ padding: '8px', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', color: 'white', fontSize: '0.8rem' }} />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span style={{ fontSize: '0.7rem', color: '#34d399', fontWeight: '700' }}>Sisa Stok Fisik</span>
                    <input type="number" value={editStokFisik} onChange={e => setEditStokFisik(e.target.value)} style={{ padding: '8px', background: '#0f172a', border: '1px solid #34d399', borderRadius: '6px', color: 'white', fontSize: '0.8rem' }} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span style={{ fontSize: '0.7rem', color: '#38bdf8', fontWeight: '700' }}>Harga Satuan (Rp)</span>
                    <input type="number" value={editHargaSatuan} onChange={e => setEditHargaSatuan(e.target.value)} style={{ padding: '8px', background: '#0f172a', border: '1px solid #38bdf8', borderRadius: '6px', color: 'white', fontSize: '0.8rem' }} />
                  </div>
                </div>
              </>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Kuantitas (Qty)</span>
                  <input type="number" value={editQty} onChange={e => setEditQty(e.target.value)} style={{ padding: '8px', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', color: 'white', fontSize: '0.82rem' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Satuan</span>
                  <input type="text" value={editUnit} onChange={e => setEditUnit(e.target.value)} style={{ padding: '8px', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', color: 'white', fontSize: '0.82rem' }} />
                </div>
              </div>
            )}

            {editType === 'masuk' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Harga Satuan (Rp)</span>
                <input type="number" value={editPriceUnit} onChange={e => setEditPriceUnit(e.target.value)} style={{ padding: '10px', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', color: 'white', fontSize: '0.85rem' }} />
              </div>
            )}

            {editType === 'transfer' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 0' }}>
                <input
                  type="checkbox"
                  id="editIsReturned"
                  checked={editIsReturned}
                  onChange={e => setEditIsReturned(e.target.checked)}
                  style={{ width: '16px', height: '16px', accentColor: '#fbbf24' }}
                />
                <label htmlFor="editIsReturned" style={{ fontSize: '0.82rem', color: '#f8fafc', fontWeight: '700', cursor: 'pointer' }}>
                  Tandai Sudah Dikembalikan (Retur Lunas)
                </label>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Catatan</span>
              <input type="text" value={editNotes} onChange={e => setEditNotes(e.target.value)} style={{ padding: '10px', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', color: 'white', fontSize: '0.85rem' }} />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
              <button type="button" onClick={() => setEditingRecord(null)} className="btn-secondary" style={{ padding: '8px 16px', fontSize: '0.8rem' }}>Batal</button>
              <button type="submit" className="btn-primary" style={{ padding: '8px 16px', fontSize: '0.8rem', background: editType === 'masuk' ? '#38bdf8' : editType === 'waste' ? '#f43f5e' : editType === 'opname' ? '#34d399' : '#fbbf24', color: '#0f172a' }}>Simpan Perubahan</button>
            </div>
          </form>
        </div>
      )}

      {/* 2. Modal Transfer Stok */}
      {showAddModal === 'transfer_stok' && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 110 }}>
          <form onSubmit={handleSaveTransfer} className="glass-card animate-fade-in" style={{ padding: '24px', width: '480px', border: '1px solid #fbbf24', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: '900', color: '#f8fafc', borderBottom: '1px solid #334155', paddingBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Truck size={20} color="#fbbf24" />
              <span>Kirim Transfer Stok Antar Cabang</span>
            </h3>

            {/* Tanggal & Dibuat Oleh */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '12px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: '700' }}>Tanggal Pengiriman</span>
                <input 
                  type="date" 
                  value={transferDate} 
                  onChange={e => setTransferDate(e.target.value)} 
                  style={{ padding: '8px', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', color: 'white', fontSize: '0.82rem' }} 
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: '700' }}>Dibuat Oleh</span>
                <select
                  value={transferCreatedBy}
                  onChange={e => setTransferCreatedBy(e.target.value)}
                  style={{ padding: '8px', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', color: 'white', fontSize: '0.82rem', cursor: 'pointer' }}
                >
                  {userRightsList.map(u => <option key={u.id} value={u.name}>{u.name} ({u.role})</option>)}
                </select>
              </div>
            </div>

            {/* Pengirim & Penerima */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '0.75rem', color: '#fb7185', fontWeight: '700' }}>📤 Cabang Pengirim</span>
                <select 
                  value={transferFromOutletId} 
                  onChange={e => setTransferFromOutletId(Number(e.target.value))} 
                  style={{ padding: '8px', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', color: 'white', fontSize: '0.82rem', cursor: 'pointer' }}
                >
                  {outlets.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                </select>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '0.75rem', color: '#34d399', fontWeight: '700' }}>📥 Cabang Penerima</span>
                <select 
                  value={transferToOutletId} 
                  onChange={e => setTransferToOutletId(Number(e.target.value))} 
                  style={{ padding: '8px', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', color: 'white', fontSize: '0.82rem', cursor: 'pointer' }}
                >
                  {outlets.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                </select>
              </div>
            </div>

            {/* Nama Item (Searchable) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: '700' }}>Cari & Pilih Nama Item (Bahan Baku)</span>
              <input
                type="text"
                placeholder="Ketik untuk mencari bahan baku..."
                value={transferSearchQuery}
                onChange={e => setTransferSearchQuery(e.target.value)}
                style={{ padding: '8px', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px 6px 0 0', color: 'white', fontSize: '0.82rem' }}
              />
              <select
                value={transferIngredientId}
                onChange={e => {
                  const val = Number(e.target.value);
                  setTransferIngredientId(val);
                  const found = ingredientsList.find(i => i.id === val);
                  if (found) setTransferUnit(found.unit || 'pcs');
                }}
                style={{ padding: '8px', background: '#1e293b', border: '1px solid #334155', borderTop: 'none', borderRadius: '0 0 6px 6px', color: 'white', fontSize: '0.82rem', cursor: 'pointer' }}
              >
                {ingredientsList.filter(i => i.name.toLowerCase().includes(transferSearchQuery.toLowerCase())).map(i => (
                  <option key={i.id} value={i.id}>{i.name}</option>
                ))}
              </select>
            </div>

            {/* Qty & Satuan */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: '700' }}>Jumlah (Qty)</span>
                <input 
                  type="number" 
                  placeholder="Isi Qty transfer..." 
                  value={transferQty} 
                  onChange={e => setTransferQty(e.target.value)} 
                  style={{ padding: '8px', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', color: 'white', fontSize: '0.82rem' }} 
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: '700' }}>Satuan (Otomatis)</span>
                <input 
                  type="text" 
                  readOnly 
                  value={transferUnit} 
                  style={{ padding: '8px', background: '#1e293b', border: '1px solid #334155', borderRadius: '6px', color: '#94a3b8', fontSize: '0.82rem' }} 
                />
              </div>
            </div>

            {/* Catatan */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: '700' }}>Catatan Transfer</span>
              <input 
                type="text" 
                placeholder="Tulis alasan / keperluan transfer..." 
                value={transferNotes} 
                onChange={e => setTransferNotes(e.target.value)} 
                style={{ padding: '8px', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', color: 'white', fontSize: '0.82rem' }} 
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
              <button type="button" onClick={() => setShowAddModal(null)} className="btn-secondary" style={{ padding: '8px 16px', fontSize: '0.8rem' }}>Batal</button>
              <button type="submit" className="btn-primary" style={{ padding: '8px 16px', fontSize: '0.8rem', background: '#fbbf24', color: '#0f172a' }}>Simpan Transfer</button>
            </div>
          </form>
        </div>
      )}

      {/* 3. Modal Stok Rusak */}
      {showAddModal === 'rusak' && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 110 }}>
          <form onSubmit={handleSaveRusak} className="glass-card animate-fade-in" style={{ padding: '24px', width: '480px', border: '1px solid #f43f5e', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: '900', color: '#f8fafc', borderBottom: '1px solid #334155', paddingBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Trash2 size={20} color="#f43f5e" />
              <span>Laporkan Stok Rusak / Waste</span>
            </h3>

            {/* Tanggal & Dibuat Oleh */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '12px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: '700' }}>Tanggal Kejadian</span>
                <input 
                  type="date" 
                  value={rusakDate} 
                  onChange={e => setRusakDate(e.target.value)} 
                  style={{ padding: '8px', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', color: 'white', fontSize: '0.82rem' }} 
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: '700' }}>Dibuat Oleh</span>
                <select
                  value={rusakCreatedBy}
                  onChange={e => setRusakCreatedBy(e.target.value)}
                  style={{ padding: '8px', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', color: 'white', fontSize: '0.82rem', cursor: 'pointer' }}
                >
                  {userRightsList.map(u => <option key={u.id} value={u.name}>{u.name} ({u.role})</option>)}
                </select>
              </div>
            </div>

            {/* Nama Outlet */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: '700' }}>Nama Outlet Cabang</span>
              <select 
                value={rusakOutletId} 
                onChange={e => setRusakOutletId(Number(e.target.value))} 
                style={{ padding: '8px', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', color: 'white', fontSize: '0.82rem', cursor: 'pointer' }}
              >
                {outlets.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
              </select>
            </div>

            {/* Nama Item (Searchable) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: '700' }}>Cari & Pilih Nama Item (Bahan Baku)</span>
              <input
                type="text"
                placeholder="Ketik untuk mencari bahan baku..."
                value={rusakSearchQuery}
                onChange={e => setRusakSearchQuery(e.target.value)}
                style={{ padding: '8px', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px 6px 0 0', color: 'white', fontSize: '0.82rem' }}
              />
              <select
                value={rusakIngredientId}
                onChange={e => {
                  const val = Number(e.target.value);
                  setRusakIngredientId(val);
                  const found = ingredientsList.find(i => i.id === val);
                  if (found) setRusakUnit(found.unit || 'pcs');
                }}
                style={{ padding: '8px', background: '#1e293b', border: '1px solid #334155', borderTop: 'none', borderRadius: '0 0 6px 6px', color: 'white', fontSize: '0.82rem', cursor: 'pointer' }}
              >
                {ingredientsList.filter(i => i.name.toLowerCase().includes(rusakSearchQuery.toLowerCase())).map(i => (
                  <option key={i.id} value={i.id}>{i.name}</option>
                ))}
              </select>
            </div>

            {/* Qty & Satuan */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: '700' }}>Jumlah Qty Rusak</span>
                <input 
                  type="number" 
                  placeholder="Isi Qty rusak..." 
                  value={rusakQty} 
                  onChange={e => setRusakQty(e.target.value)} 
                  style={{ padding: '8px', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', color: 'white', fontSize: '0.82rem' }} 
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: '700' }}>Satuan (Otomatis)</span>
                <input 
                  type="text" 
                  readOnly 
                  value={rusakUnit} 
                  style={{ padding: '8px', background: '#1e293b', border: '1px solid #334155', borderRadius: '6px', color: '#94a3b8', fontSize: '0.82rem' }} 
                />
              </div>
            </div>



            {/* Catatan Alasan */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: '700' }}>Catatan Stok Rusak (Alasan)</span>
              <input 
                type="text" 
                placeholder="Busuk, pecah, expired..." 
                value={rusakNotes} 
                onChange={e => setRusakNotes(e.target.value)} 
                style={{ padding: '8px', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', color: 'white', fontSize: '0.82rem' }} 
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
              <button type="button" onClick={() => setShowAddModal(null)} className="btn-secondary" style={{ padding: '8px 16px', fontSize: '0.8rem' }}>Batal</button>
              <button type="submit" className="btn-primary" style={{ padding: '8px 16px', fontSize: '0.8rem', background: '#f43f5e', color: 'white' }}>Laporkan Rusak</button>
            </div>
          </form>
        </div>
      )}

      {/* 4. Modal Stok Opname */}
      {/* 4. Modal Stok Opname */}
      {showAddModal === 'opname' && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 110 }}>
          <form onSubmit={handleSaveOpname} className="glass-card animate-fade-in" style={{ padding: '24px', width: '500px', border: '1px solid #34d399', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: '900', color: '#f8fafc', borderBottom: '1px solid #334155', paddingBottom: '12px' }}>
              📋 Mulai Audit Fisik (Stock Opname)
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: '700' }}>Tanggal Audit</span>
                <input type="date" value={opnameDate} onChange={e => setOpnameDate(e.target.value)} style={{ padding: '8px', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', color: 'white', fontSize: '0.82rem' }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: '700' }}>Dibuat Oleh</span>
                <select value={opnameCreatedBy} onChange={e => setOpnameCreatedBy(e.target.value)} style={{ padding: '8px', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', color: 'white', fontSize: '0.82rem', cursor: 'pointer' }}>
                  {userRightsList.map(u => <option key={u.id} value={u.name}>{u.name} ({u.role})</option>)}
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: '700' }}>Restoran Outlet</span>
              <select value={opnameOutletId} onChange={e => setOpnameOutletId(Number(e.target.value))} style={{ padding: '8px', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', color: 'white', fontSize: '0.82rem', cursor: 'pointer' }}>
                {outlets.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
              </select>
            </div>

            {/* Nama Item (Searchable) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: '700' }}>Cari & Pilih Nama Item (Bahan Baku)</span>
              <input
                type="text"
                placeholder="Ketik untuk mencari bahan..."
                value={opnameSearchQuery}
                onChange={e => setOpnameSearchQuery(e.target.value)}
                style={{ padding: '8px', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px 6px 0 0', color: 'white', fontSize: '0.82rem' }}
              />
              <select
                value={opnameIngredientId}
                onChange={e => {
                  const val = Number(e.target.value);
                  setOpnameIngredientId(val);
                  const found = ingredientsList.find(i => i.id === val);
                  if (found) setOpnameUnit(found.unit || 'pcs');
                }}
                style={{ padding: '8px', background: '#1e293b', border: '1px solid #334155', borderTop: 'none', borderRadius: '0 0 6px 6px', color: 'white', fontSize: '0.82rem', cursor: 'pointer' }}
              >
                {ingredientsList.filter(i => i.name.toLowerCase().includes(opnameSearchQuery.toLowerCase())).map(i => (
                  <option key={i.id} value={i.id}>{i.name}</option>
                ))}
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: '700' }}>Stok Awal</span>
                <input type="number" value={opnameStokAwal} onChange={e => setOpnameStokAwal(e.target.value)} style={{ padding: '8px', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', color: 'white', fontSize: '0.8rem' }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: '700' }}>Stok Masuk</span>
                <input type="number" value={opnameStokMasuk} onChange={e => setOpnameStokMasuk(e.target.value)} style={{ padding: '8px', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', color: 'white', fontSize: '0.8rem' }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: '700' }}>Stok Keluar</span>
                <input type="number" value={opnameStokKeluar} onChange={e => setOpnameStokKeluar(e.target.value)} style={{ padding: '8px', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', color: 'white', fontSize: '0.8rem' }} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: '700' }}>Trans. Masuk</span>
                <input type="number" value={opnameTransferMasuk} onChange={e => setOpnameTransferMasuk(e.target.value)} style={{ padding: '8px', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', color: 'white', fontSize: '0.8rem' }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: '700' }}>Trans. Keluar</span>
                <input type="number" value={opnameTransferKeluar} onChange={e => setOpnameTransferKeluar(e.target.value)} style={{ padding: '8px', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', color: 'white', fontSize: '0.8rem' }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: '700' }}>Stok Rusak</span>
                <input type="number" value={opnameStokRusak} onChange={e => setOpnameStokRusak(e.target.value)} style={{ padding: '8px', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', color: 'white', fontSize: '0.8rem' }} />
              </div>
            </div>

            {/* STOK YANG DIHITUNG (STOK SISTEM) & SELISIH AUTOMATIC FORMULA BOX */}
            {(() => {
              const calcStokSistem = (Number(opnameStokAwal || 0) + Number(opnameStokMasuk || 0) + Number(opnameTransferMasuk || 0)) - (Number(opnameStokKeluar || 0) + Number(opnameTransferKeluar || 0) + Number(opnameStokRusak || 0));
              const calcSelisih = Number(opnameStokFisik || 0) - calcStokSistem;

              return (
                <div style={{ background: '#0f172a', padding: '12px', borderRadius: '8px', border: '1px solid #6366f1', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <span style={{ fontSize: '0.74rem', color: '#818cf8', fontWeight: '800', display: 'block' }}>🔢 STOK YANG DIHITUNG (STOK SISTEM)</span>
                    <div style={{ fontSize: '1.1rem', fontWeight: '900', color: '#818cf8', marginTop: '2px' }}>
                      {calcStokSistem} {opnameUnit || 'pcs'}
                    </div>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.74rem', color: calcSelisih === 0 ? '#34d399' : calcSelisih > 0 ? '#38bdf8' : '#fb7185', fontWeight: '800', display: 'block' }}>📊 ANALISIS SELISIH FISIK VS DIHITUNG</span>
                    <div style={{ fontSize: '1.1rem', fontWeight: '900', color: calcSelisih === 0 ? '#34d399' : calcSelisih > 0 ? '#38bdf8' : '#fb7185', marginTop: '2px' }}>
                      {calcSelisih > 0 ? `+${calcSelisih}` : calcSelisih} {opnameUnit || 'pcs'}
                    </div>
                  </div>
                </div>
              );
            })()}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ fontSize: '0.75rem', color: '#34d399', fontWeight: '800' }}>Sisa Stok Fisik</span>
              <input type="number" value={opnameStokFisik} onChange={e => setOpnameStokFisik(e.target.value)} style={{ padding: '8px', background: '#0f172a', border: '1px solid #34d399', borderRadius: '6px', color: 'white', fontSize: '0.82rem' }} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: '700' }}>Catatan / Selisih Keterangan</span>
              <input type="text" placeholder="Audit penyusutan atau kehilangan..." value={opnameNotes} onChange={e => setOpnameNotes(e.target.value)} style={{ padding: '10px', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', color: 'white', fontSize: '0.85rem' }} />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
              <button type="button" onClick={() => setShowAddModal(null)} className="btn-secondary" style={{ padding: '8px 16px', fontSize: '0.8rem' }}>Batal</button>
              <button type="submit" className="btn-primary" style={{ padding: '8px 16px', fontSize: '0.8rem', background: '#34d399', color: '#0f172a' }}>Simpan Audit</button>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================= */}
      {/* ADD / EDIT PRICE COMPARISON MODAL                         */}
      {/* ========================================================= */}
      {showAddPriceModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(5px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 110 }}>
          <div className="glass-card animate-fade-in" style={{ padding: '24px', width: '100%', maxWidth: '520px', background: '#1e293b', border: '1px solid #c084fc', borderRadius: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #334155', paddingBottom: '12px', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: '800', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <DollarSign size={20} color="#c084fc" />
                <span>{editingPriceRecord ? 'Edit Perbandingan Harga' : 'Tambah Perbandingan Harga Stok'}</span>
              </h3>
              <button onClick={() => setShowAddPriceModal(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                <XCircle size={20} />
              </button>
            </div>

            <form onSubmit={handleSavePriceRecord} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '0.78rem', color: '#cbd5e1', fontWeight: '700', display: 'block', marginBottom: '4px' }}>Tanggal Pencatatan *</label>
                <input type="date" required value={priceDate} onChange={e => setPriceDate(e.target.value)} className="form-input" />
              </div>

              <div>
                <label style={{ fontSize: '0.78rem', color: '#cbd5e1', fontWeight: '700', display: 'block', marginBottom: '4px' }}>Nama Item (Bahan Baku Master Data) *</label>
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
                  <label style={{ fontSize: '0.78rem', color: '#cbd5e1', fontWeight: '700', display: 'block', marginBottom: '4px' }}>Kategori Bahan</label>
                  <input type="text" placeholder="Contoh: Bahan Utama" value={priceCategory} onChange={e => setPriceCategory(e.target.value)} className="form-input" />
                </div>
                <div>
                  <label style={{ fontSize: '0.78rem', color: '#cbd5e1', fontWeight: '700', display: 'block', marginBottom: '4px' }}>Satuan (Unit)</label>
                  <input type="text" placeholder="kg, liter, pcs" value={priceUnit} onChange={e => setPriceUnit(e.target.value)} className="form-input" />
                </div>
              </div>

              {/* INPUT HARGA PER CABANG OUTLET */}
              <div style={{ background: '#0f172a', padding: '14px', borderRadius: '8px', border: '1px solid #334155', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: '800', color: '#c084fc' }}>🏷️ Input Harga Satuan (IDR) per Cabang Outlet:</span>
                {outlets.map(o => (
                  <div key={o.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                    <span style={{ fontSize: '0.8rem', color: '#cbd5e1', fontWeight: '600' }}>🏢 {o.name}</span>
                    <input
                      type="number"
                      placeholder="0"
                      value={priceValues[o.id] || ''}
                      onChange={e => setPriceValues({ ...priceValues, [o.id]: e.target.value })}
                      className="form-input"
                      style={{ width: '160px', textAlign: 'right', fontWeight: '700', color: '#f8fafc' }}
                    />
                  </div>
                ))}
              </div>

              <div>
                <label style={{ fontSize: '0.78rem', color: '#cbd5e1', fontWeight: '700', display: 'block', marginBottom: '4px' }}>Catatan / Keterangan</label>
                <input type="text" placeholder="Contoh: Kenaikan harga akibat pasokan supplier" value={priceNotes} onChange={e => setPriceNotes(e.target.value)} className="form-input" />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button type="button" onClick={() => setShowAddPriceModal(false)} className="btn-secondary" style={{ flex: 1, justifyContent: 'center' }}>Batal</button>
                <button type="submit" className="btn-primary" style={{ flex: 1, justifyContent: 'center', background: '#c084fc', color: '#0f172a' }}>Simpan Perbandingan</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
