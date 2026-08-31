import React, { useState, useEffect } from 'react';
import { 
  Receipt, 
  Search, 
  Calendar, 
  Filter, 
  Download, 
  Printer, 
  Plus, 
  Eye, 
  Edit3, 
  Trash2, 
  X, 
  CheckCircle2, 
  ShoppingBag, 
  Columns, 
  CreditCard, 
  DollarSign, 
  User, 
  Store, 
  PlusCircle, 
  FileText, 
  Utensils,
  Copy,
  ArrowLeft,
  ChevronDown,
  RefreshCw,
  SlidersHorizontal,
  MoreVertical
} from 'lucide-react';
import PaginationControls from './PaginationControls';
import { getThemePalette } from '../../utils/themeUtils';
import { executePermanentDelete } from '../../utils/deleteGuard';

export default function TransactionHistoryPage({ masterData, setMasterData, selectedBranch, themeMode = 'dark' }) {
  const outlets = masterData?.outlets || [];
  const T = getThemePalette(themeMode);
  const isCalmSage = themeMode === 'calm_sage';
  const isLight = themeMode === 'calm_sage' || themeMode === 'soft_blue' || themeMode === 'light';

  const formatRupiah = (val) => {
    return 'Rp ' + Number(val || 0).toLocaleString('id-ID');
  };

  // FORMAT CURRENCY MATCHING LUNA POS STYLE (e.g. 2.424.100,00)
  const formatLunaCurrency = (val) => {
    const num = Number(val || 0);
    return num.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  // FORMAT TANGGAL + JAM, MENIT, DAN DETIK (HH:mm:ss)
  const formatDateTimeWithSeconds = (item) => {
    if (!item) return '-';

    let datePart = item.date || item.entry_date || item.transaction_date || '';
    let timePart = '';

    // 1. Ambil dari item.time jika valid (bukan 00:00:xx kosong)
    if (item.time && typeof item.time === 'string' && item.time.trim() !== '' && !item.time.startsWith('00:00:')) {
      const cleanT = item.time.replace(/\./g, ':').trim();
      const parts = cleanT.split(':');
      if (parts.length >= 2) {
        timePart = `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}:${(parts[2] || '00').substring(0, 2).padStart(2, '0')}`;
      }
    }

    // 2. Ambil dari item.created_at (MySQL timestamp atau ISO string)
    if (!timePart && item.created_at) {
      if (typeof item.created_at === 'string') {
        const ca = item.created_at.trim();
        if (ca.includes(' ')) {
          const sub = ca.split(' ')[1];
          if (sub) timePart = sub.substring(0, 8);
        } else if (ca.includes('T')) {
          const sub = ca.split('T')[1];
          if (sub) timePart = sub.substring(0, 8);
        }
      } else if (item.created_at instanceof Date) {
        timePart = `${String(item.created_at.getHours()).padStart(2, '0')}:${String(item.created_at.getMinutes()).padStart(2, '0')}:${String(item.created_at.getSeconds()).padStart(2, '0')}`;
      }
    }

    // 3. Ambil dari item.timestamp jika number
    if (!timePart && item.timestamp) {
      if (typeof item.timestamp === 'number') {
        const d = new Date(item.timestamp);
        if (!isNaN(d.getTime())) {
          timePart = d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).replace(/\./g, ':');
        }
      } else if (String(item.timestamp).includes('T')) {
        const sub = String(item.timestamp).split('T')[1];
        if (sub) timePart = sub.substring(0, 8);
      }
    }

    if (datePart && datePart.includes('-')) {
      const parts = datePart.split('T')[0].split('-');
      if (parts.length === 3 && parts[0].length === 4) {
        const yr = parts[0];
        const mIdx = parseInt(parts[1], 10) - 1;
        const dy = parseInt(parts[2], 10);
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agt', 'Sep', 'Okt', 'Nov', 'Des'];
        if (mIdx >= 0 && mIdx < 12) {
          datePart = `${String(dy).padStart(2, '0')} ${months[mIdx]} ${yr}`;
        }
      }
    }

    if (timePart) {
      const tParts = timePart.split(':');
      if (tParts.length === 2) {
        timePart = `${tParts[0].padStart(2, '0')}:${tParts[1].padStart(2, '0')}:00`;
      } else if (tParts.length >= 3) {
        timePart = `${tParts[0].padStart(2, '0')}:${tParts[1].padStart(2, '0')}:${tParts[2].substring(0, 2).padStart(2, '0')}`;
      }
    } else {
      timePart = '12:00:00';
    }

    return (
      <div>
        <div style={{ fontWeight: '700', color: T.txtPrimary }}>{datePart || '-'}</div>
        <div style={{ fontSize: '0.74rem', color: T.accentGold, fontWeight: '700', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '3px' }}>
          <span></span>
          <span>{timePart}</span>
        </div>
      </div>
    );
  };
  
  // MASTER DATA PELANGGAN
  const customerList = (masterData?.customers && masterData.customers.length > 0)
    ? masterData.customers
    : [
        { id: 1, name: 'AYAM PECAK 2001 SEAFOOD TEBING TINGGI', phone: '0812-3456-7890', tier: 'Gold' },
        { id: 2, name: 'AYAM PECAK 2001 SEAFOOD RANTAU PRAPAT', phone: '0811-9876-5432', tier: 'Silver' },
        { id: 3, name: 'AYAM PECAK 2001 SEAFOOD KISARAN', phone: '0813-1122-3344', tier: 'Platinum' },
        { id: 4, name: 'AYAM BAKAR SURABAYA TEBING TINGGI', phone: '0815-6677-8899', tier: 'Gold' },
        { id: 5, name: 'Default Customer', phone: '-', tier: 'Reguler' }
      ];

  // EXTRACT DYNAMIC VARIANT & PRICE PER OUTLET FROM MASTER DATA PRODUK
  const getVariantOutletProducts = (targetOutletId = null) => {
    const rawProducts = masterData?.products || [];
    const outletsList = masterData?.outlets || [];
    const items = [];

    rawProducts.forEach(p => {
      if (p.priceCombinations && p.priceCombinations.length > 0) {
        p.priceCombinations.forEach(combo => {
          if (combo.selectedOutletIds && combo.selectedOutletIds.length > 0) {
            combo.selectedOutletIds.forEach(outId => {
              if (targetOutletId && Number(outId) !== Number(targetOutletId)) return;

              const outObj = outletsList.find(o => Number(o.id) === Number(outId));
              const outName = outObj ? outObj.name : `Outlet #${outId}`;
              const price = combo.outletPrices?.[outId] !== undefined ? combo.outletPrices[outId] : (p.price || 35000);
              
              items.push({
                id: `${p.id}-${combo.id}-${outId}`,
                name: `${combo.combinationName} (${outName}) - ${formatRupiah(price)}`,
                raw_name: combo.combinationName,
                sku: p.sku || `SKU-${p.id}`,
                outlet_name: outName,
                outlet_id: outId,
                category: p.category_name || 'Umum',
                price: parseFloat(price) || 0
              });
            });
          }
        });
      }

      if (!p.priceCombinations || p.priceCombinations.length === 0) {
        const assignedOutletIds = p.outlet_id 
          ? [Number(p.outlet_id)] 
          : (p.outlet_ids && p.outlet_ids.length > 0 ? p.outlet_ids.map(id => Number(id)) : outletsList.map(o => Number(o.id)));

        assignedOutletIds.forEach(outId => {
          if (targetOutletId && Number(outId) !== Number(targetOutletId)) return;

          const outObj = outletsList.find(o => Number(o.id) === Number(outId));
          const outName = outObj ? outObj.name : `Outlet #${outId}`;
          const basePrice = p.price || 35000;

          if (p.variants && p.variants.length > 0) {
            p.variants.forEach(vName => {
              items.push({
                id: `${p.id}-${vName}-${outId}`,
                name: `${p.name} - ${vName} (${outName}) - ${formatRupiah(basePrice)}`,
                raw_name: `${p.name} - ${vName}`,
                sku: p.sku || `SKU-${p.id}`,
                outlet_name: outName,
                outlet_id: outId,
                category: p.category_name || 'Umum',
                price: parseFloat(basePrice) || 0
              });
            });
          } else {
            items.push({
              id: `${p.id}-${outId}`,
              name: `${p.name} (${outName}) - ${formatRupiah(basePrice)}`,
              raw_name: p.name,
              sku: p.sku || `SKU-${p.id}`,
              outlet_name: outName,
              outlet_id: outId,
              category: p.category_name || 'Umum',
              price: parseFloat(basePrice) || 0
            });
          }
        });
      }
    });

    return items;
  };

  const menuProducts = getVariantOutletProducts();

  // KASIR POS PENANGGUNG JAWAB (DARI MASTER DATA USER RIGHTS / ADMIN SYSTEM)
  const adminList = (masterData?.userRights && masterData.userRights.length > 0)
    ? masterData.userRights
    : (masterData?.admins && masterData.admins.length > 0)
    ? masterData.admins
    : [];

  const transactions = masterData?.salesTransactions || [];

  // VIEW MODE: 'list' (Main Table) OR 'detail' (Luna POS Invoice Page)
  const [viewMode, setViewMode] = useState('list');
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [previewRecord, setPreviewRecord] = useState(null);

  // FILTER STATES
  const [statusFilterPreset, setStatusFilterPreset] = useState('Semua');
  const [outletFilter, setOutletFilter] = useState(selectedBranch || 'ALL');

  useEffect(() => {
    if (selectedBranch) {
      setOutletFilter(selectedBranch);
    } else {
      setOutletFilter('ALL');
    }
  }, [selectedBranch]);
  const [dateRangeText, setDateRangeText] = useState('24/07/2026 - 24/07/2026');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [orderTypeFilter, setOrderTypeFilter] = useState('ALL');
  const [itemFilter, setItemFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // HELPER FORMAT ORDER TYPE (DINE IN VS TAKE AWAY)
  const getOrderTypeInfo = (item) => {
    if (!item) return { type: 'Dine In', isTakeAway: false, label: 'Dine In', table: '' };

    const ot = String(item.order_type || item.type || item.service_type || item.orderType || item.notes || '').toLowerCase();
    const isTakeAway = ot.includes('take') || ot.includes('away') || ot.includes('bungkus') || ot.includes('delivery') || ot.includes('online') || ot.includes('gofood') || ot.includes('grab') || ot.includes('shopee');

    const tableNo = item.table_no || item.table || item.no_meja || (ot.match(/meja\s*(\d+)/i) ? ot.match(/meja\s*(\d+)/i)[0] : '');

    if (isTakeAway) {
      let sub = 'Take Away';
      if (ot.includes('gofood')) sub = 'GoFood';
      else if (ot.includes('grab')) sub = 'GrabFood';
      else if (ot.includes('shopee')) sub = 'ShopeeFood';
      else if (ot.includes('delivery')) sub = 'Delivery';
      return {
        type: 'Take Away',
        isTakeAway: true,
        label: sub,
        table: ''
      };
    }

    return {
      type: 'Dine In',
      isTakeAway: false,
      label: tableNo ? `Dine In (${tableNo})` : 'Dine In',
      table: tableNo
    };
  };

  const handleYearChange = (yr) => {
    setSelectedYear(yr);
    if (!yr) {
      setStartDate('');
      setEndDate('');
      setSelectedMonth('');
      return;
    }
    const m = selectedMonth || '01';
    const lastDay = new Date(Number(yr), Number(m), 0).getDate();
    if (selectedMonth) {
      setStartDate(`${yr}-${m}-01`);
      setEndDate(`${yr}-${m}-${String(lastDay).padStart(2, '0')}`);
    } else {
      setStartDate(`${yr}-01-01`);
      setEndDate(`${yr}-12-31`);
    }
  };

  const handleMonthChange = (m) => {
    setSelectedMonth(m);
    const yr = selectedYear || new Date().getFullYear().toString();
    if (!selectedYear) setSelectedYear(yr);
    if (!m) {
      if (selectedYear) {
        setStartDate(`${yr}-01-01`);
        setEndDate(`${yr}-12-31`);
      } else {
        setStartDate('');
        setEndDate('');
      }
      return;
    }
    const lastDay = new Date(Number(yr), Number(m), 0).getDate();
    setStartDate(`${yr}-${m}-01`);
    setEndDate(`${yr}-${m}-${String(lastDay).padStart(2, '0')}`);
  };

  // COLUMN VISIBILITY TOGGLE STATE
  const [showColDropdown, setShowColDropdown] = useState(false);
  const [visibleCols, setVisibleCols] = useState({
    date: true,
    type: true,
    id: true,
    outlet: true,
    customer: true,
    amount: true,
    status: true,
    actions: true
  });

  // MODAL STATES FOR MANUAL ADD/EDIT
  const [showModal, setShowModal] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);

  // Pagination States
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // FORM INPUT STATES:
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);
  const [formTime, setFormTime] = useState('12:00');
  const [formOutletId, setFormOutletId] = useState(1);
  const [formCashier, setFormCashier] = useState(adminList[0]?.name || 'Rina Kasir');
  const [formCustomerName, setFormCustomerName] = useState('Pelanggan Umum');
  const [formOrderType, setFormOrderType] = useState('Dine In');
  const [formItemRows, setFormItemRows] = useState([]);
  const [formPaymentMethod, setFormPaymentMethod] = useState('Cash');
  const [formDiscountAmount, setFormDiscountAmount] = useState(0);
  const [formNotes, setFormNotes] = useState('');

  // HANDLER TO OPEN INVOICE DETAIL VIEW (MATCHING LUNA POS INVOICE PAGE)
  const handleOpenInvoiceDetail = (record) => {
    setSelectedInvoice(record);
    setViewMode('detail');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBackToList = () => {
    setViewMode('list');
    setSelectedInvoice(null);
  };

  // OPEN MODAL FOR NEW MANUAL TRANSACTION
  const handleOpenAddModal = () => {
    setEditingRecord(null);
    setFormDate(new Date().toISOString().split('T')[0]);
    setFormTime(new Date().toTimeString().substring(0, 5));
    setFormOutletId(selectedBranch || 1);
    setFormCashier(adminList[0]?.name || 'Rina Kasir');
    setFormCustomerName('Default Customer');
    setFormOrderType('Dine In');
    setFormPaymentMethod('Cash');
    setFormDiscountAmount(0);
    setFormNotes('');

    const firstProduct = menuProducts[0] || { name: 'AYAM BAKAR / SAMBAL PENYET', price: 35000, sku: '000987' };
    setFormItemRows([
      {
        id: Date.now(),
        name: firstProduct.name,
        sku: firstProduct.sku || 'SKU-1',
        unit: 'PORSI',
        qty: 1,
        price_unit: firstProduct.price || 35000,
        amount: firstProduct.price || 35000
      }
    ]);
    setShowModal(true);
  };

  // OPEN MODAL FOR EDITING TRANSACTION
  const handleOpenEditModal = (item) => {
    setEditingRecord(item);
    setFormDate(item.date || new Date().toISOString().split('T')[0]);
    setFormTime(item.time || '12:00');
    setFormOutletId(item.outlet_id || 1);
    setFormCashier(item.cashier || adminList[0]?.name || 'Rina Kasir');
    setFormCustomerName(item.customer_name || 'Default Customer');
    setFormOrderType(item.order_type || 'Dine In');
    setFormPaymentMethod(item.payment_method || 'Cash');
    setFormDiscountAmount(Number(item.discount || item.discount_amount || 0));
    setFormNotes(item.notes || '');

    if (item.items && item.items.length > 0) {
      setFormItemRows(item.items.map((it, idx) => ({
        id: Date.now() + idx,
        name: it.name,
        sku: it.sku || `SKU-${idx + 1}`,
        unit: it.unit || 'PORSI',
        qty: it.qty || 1,
        price_unit: it.price_unit || 35000,
        amount: (it.qty || 1) * (it.price_unit || 35000)
      })));
    } else {
      setFormItemRows([
        {
          id: Date.now(),
          name: item.item_name || menuProducts[0]?.name || 'AYAM BAKAR / SAMBAL PENYET',
          sku: '000987',
          unit: 'PORSI',
          qty: item.qty || 1,
          price_unit: item.price_unit || 35000,
          amount: item.amount || 35000
        }
      ]);
    }

    setShowModal(true);
  };

  const handleAddBlankItemRow = () => {
    const currentOutletProducts = getVariantOutletProducts(formOutletId);
    const nextIdx = formItemRows.length;
    const p = currentOutletProducts[nextIdx % currentOutletProducts.length] || { name: 'Item Produk Baru', price: 25000, sku: 'SKU-NEW' };
    const newRow = {
      id: Date.now() + Math.random(),
      name: p.name,
      sku: p.sku || 'SKU-NEW',
      unit: 'PORSI',
      qty: 1,
      price_unit: p.price || 25000,
      amount: p.price || 25000
    };
    setFormItemRows([...formItemRows, newRow]);
  };

  const handleUpdateItemRow = (id, field, val) => {
    const currentOutletProducts = getVariantOutletProducts(formOutletId);
    setFormItemRows(formItemRows.map(r => {
      if (r.id === id) {
        const updated = { ...r, [field]: val };
        if (field === 'name') {
          const found = currentOutletProducts.find(p => p.name === val) || menuProducts.find(p => p.name === val);
          if (found) {
            updated.price_unit = found.price || updated.price_unit;
            updated.sku = found.sku || updated.sku;
            updated.amount = Number(updated.qty || 1) * Number(updated.price_unit || 0);
          }
        }
        if (field === 'qty' || field === 'price_unit') {
          const qty = field === 'qty' ? Number(val || 1) : r.qty;
          const price = field === 'price_unit' ? Number(val || 0) : r.price_unit;
          updated.qty = qty;
          updated.price_unit = price;
          updated.amount = qty * price;
        }
        return updated;
      }
      return r;
    }));
  };

  const handleRemoveItemRow = (id) => {
    if (formItemRows.length === 1) {
      alert('Minimal 1 field item menu harus tersedia!');
      return;
    }
    setFormItemRows(formItemRows.filter(r => r.id !== id));
  };

    const rawSubtotal = formItemRows.reduce((sum, r) => sum + Number(r.amount || 0), 0);
    const discVal = Number(formDiscountAmount || 0);
    const netAmount = Math.max(0, rawSubtotal - discVal);

    const handleSaveTransaction = (e) => {
      e.preventDefault();
      const targetOutlet = outlets.find(o => Number(o.id) === Number(formOutletId)) || { name: 'RUMAH PRODUKSI' };
      
      const activeItems = formItemRows.map(r => ({
        name: r.name,
        sku: r.sku || 'SKU-1',
        unit: r.unit || 'PORSI',
        qty: Number(r.qty || 1),
        price_unit: Number(r.price_unit || 0),
        amount: Number(r.amount || 0)
      }));

      const existingId = editingRecord ? (editingRecord.id || editingRecord.receipt_no || editingRecord.receiptNo || editingRecord.invoice_no) : `00${Math.floor(2500 + Math.random() * 9000)}`;

      const newRecord = {
        ...(editingRecord || {}),
        id: existingId,
        receipt_no: editingRecord?.receipt_no || editingRecord?.receiptNo || existingId,
        receiptNo: editingRecord?.receiptNo || editingRecord?.receipt_no || existingId,
        date: formDate,
        time: formTime,
        type: 'Invoice Penjualan',
        outlet_id: Number(formOutletId),
        branch_name: targetOutlet.name,
        customer_name: formCustomerName || 'Default Customer',
        order_type: formOrderType || 'DineIn',
        items: activeItems,
        subtotal: rawSubtotal,
        discount: discVal,
        discount_amount: discVal,
        item_discounts: discVal,
        summary_discount: discVal,
        amount: netAmount,
        total: netAmount,
        grandTotal: netAmount,
        paid_amount: netAmount,
        tendered: netAmount,
        payment_method: formPaymentMethod,
        cashier: formCashier,
        notes: formNotes,
        ref_pelanggan: editingRecord?.ref_pelanggan || `POS-${formDate.replace(/-/g, '')}-MANUAL`,
        gudang: `GUDANG ${targetOutlet.name.toUpperCase()}`,
        source: editingRecord ? (editingRecord.source || 'By Manual') : 'By Manual',
        status: editingRecord?.status || 'Selesai',
        _updatedAt: Date.now()
      };

    const isMatch = (t) => {
      if (!t || !editingRecord) return false;
      const tid = String(t.id !== undefined && t.id !== null ? t.id : '');
      const trcpt = String(t.receipt_no || t.receiptNo || t.invoice_no || t.receipt || '');
      const targetId = String(editingRecord.id || '');
      const targetRcpt = String(editingRecord.receipt_no || editingRecord.receiptNo || editingRecord.invoice_no || '');
      if (targetId && tid && (tid === targetId || tid === targetRcpt)) return true;
      if (targetRcpt && trcpt && (trcpt === targetRcpt || trcpt === targetId)) return true;
      if (targetId && trcpt && trcpt === targetId) return true;
      return false;
    };

    let updatedSalesTx = [...(masterData?.salesTransactions || [])];
    let updatedTx = [...(masterData?.transactions || [])];

    if (editingRecord) {
      const idx1 = updatedSalesTx.findIndex(isMatch);
      if (idx1 !== -1) updatedSalesTx[idx1] = newRecord;
      else updatedSalesTx = [newRecord, ...updatedSalesTx];

      const idx2 = updatedTx.findIndex(isMatch);
      if (idx2 !== -1) updatedTx[idx2] = newRecord;
    } else {
      updatedSalesTx = [newRecord, ...updatedSalesTx];
    }

    const updatedMaster = {
      ...masterData,
      _lastUpdated: Date.now(),
      _lastMutated: Date.now(),
      salesTransactions: updatedSalesTx,
      transactions: updatedTx
    };

    if (setMasterData) {
      setMasterData(updatedMaster);
    }
    try {
      localStorage.setItem('mris_master_data', JSON.stringify(updatedMaster));
    } catch (e) {}

    fetch('https://mris-api.barokahgroupindonesia.tech/api/master-data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedMaster)
    }).catch(() => {});

    if (viewMode === 'detail') {
      setSelectedInvoice(newRecord);
    }

    setShowModal(false);
  };

  const handleDuplicateTransaction = (item) => {
    const dupRecord = {
      ...item,
      id: `00${Math.floor(2500 + Math.random() * 9000)}`,
      notes: item.notes ? `${item.notes} (Duplikat)` : 'Duplikat Transaksi',
      source: 'By Manual',
      date: new Date().toISOString().split('T')[0],
      time: new Date().toTimeString().substring(0, 5)
    };

    const updatedList = [dupRecord, ...transactions];
    if (setMasterData) {
      setMasterData({
        ...masterData,
        salesTransactions: updatedList
      });
    }
  };

  // ─── HAPUS TRANSAKSI ───────────────────────────────────────────────────────
  const handleDeleteTransaction = async (target) => {
    if (!target) return;
    const targetObj = typeof target === 'object' ? target : null;
    const targetId = targetObj ? String(targetObj.id || targetObj.receipt_no || targetObj.receiptNo || targetObj.invoice_no || '') : String(target);
    const targetReceiptNo = targetObj ? (targetObj.receipt_no || targetObj.receiptNo || targetObj.invoice_no || targetId) : targetId;

    if (window.confirm(`Yakin ingin menghapus transaksi "${targetReceiptNo}" secara permanen? Data yang dihapus tidak dapat dikembalikan.`)) {
      await executePermanentDelete({
        key: 'salesTransactions',
        id: targetId,
        receipt_no: targetReceiptNo,
        masterData,
        setMasterData
      });

      setSelectedInvoice(null);
      setViewMode('list');
    }
  };

  // ─── EXPORT EXCEL (CSV) — RIWAYAT TRANSAKSI ────────────────────────────────
  const handleDownloadTransactionExcel = () => {
    const rows = filteredTransactions;
    if (rows.length === 0) { alert('Tidak ada data transaksi untuk di-export.'); return; }

    const outletStr = outletFilter === 'ALL' ? 'semua_outlet' : (outlets.find(o => String(o.id) === String(outletFilter))?.name || 'outlet').replace(/\s+/g, '_').toLowerCase();
    const dateStr = startDate && endDate ? `${startDate}_sd_${endDate}` : startDate || endDate || new Date().toLocaleDateString('en-CA');
    const filename = `riwayat_transaksi_${outletStr}_${dateStr}.csv`;

    const headers = ['No', 'Tanggal', 'Waktu', 'No Transaksi', 'Outlet', 'Kasir', 'Pelanggan', 'Tipe Pesanan', 'Metode Bayar', 'Items', 'Total (Rp)', 'Status'];
    const csvRows = [headers.join(',')];
    rows.forEach((t, i) => {
      const orderInfo = getOrderTypeInfo(t);
      const itemNames = (t.items || []).map(it => `${it.name}(x${it.qty || 1})`).join('; ') || t.item_name || '-';
      csvRows.push([
        i + 1,
        `"${t.date || '-'}"`,
        `"${t.time || '-'}"`,
        `"${t.id || t.receipt_no || '-'}"`,
        `"${t.branch_name || '-'}"`,
        `"${t.cashier || '-'}"`,
        `"${t.customer_name || '-'}"`,
        `"${orderInfo.label}"`,
        `"${t.payment_method || '-'}"`,
        `"${itemNames}"`,
        Number(t.amount || t.total || 0),
        `"${t.status || 'Lunas'}"`
      ].join(','));
    });

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // ─── EXPORT PDF (PRINT VIEW) — RIWAYAT TRANSAKSI ────────────────────────────
  const handleDownloadTransactionPDF = () => {
    const rows = filteredTransactions;
    if (rows.length === 0) { alert('Tidak ada data transaksi untuk di-export PDF.'); return; }

    const outletStr = outletFilter === 'ALL' ? 'Semua Outlet' : (outlets.find(o => String(o.id) === String(outletFilter))?.name || '-');
    const dateStr = startDate && endDate ? `${startDate} s/d ${endDate}` : startDate || endDate || new Date().toLocaleDateString('en-CA');
    const totalAmt = rows.reduce((s, t) => s + Number(t.amount || t.total || 0), 0);
    const pdfFilename = `riwayat_transaksi_${outletStr.replace(/\s+/g,'_').toLowerCase()}_${dateStr.replace(/\s+/g,'')}.pdf`;

    const tableRows = rows.map((t, i) => {
      const orderInfo = getOrderTypeInfo(t);
      const itemNames = (t.items || []).map(it => `${it.name} (x${it.qty||1})`).join('<br>') || t.item_name || '-';
      const statusColor = t.status === 'Void' ? '#ef4444' : '#22c55e';
      const orderBg = orderInfo.isTakeAway ? '#fef3c7' : '#e0e7ff';
      const orderColor = orderInfo.isTakeAway ? '#d97706' : '#4338ca';

      return `<tr style="border-bottom:1px solid #e2e8f0">
        <td style="padding:6px 10px;text-align:center;color:#64748b">${i+1}</td>
        <td style="padding:6px 10px">${t.date||'-'}<br><small style="color:#94a3b8">${t.time||'-'}</small></td>
        <td style="padding:6px 10px;font-family:monospace;font-size:0.8em">${t.id||t.receipt_no||'-'}</td>
        <td style="padding:6px 10px">${t.branch_name||'-'}</td>
        <td style="padding:6px 10px">${t.cashier||'-'}</td>
        <td style="padding:6px 10px">${t.customer_name||'-'}</td>
        <td style="padding:6px 10px;text-align:center"><span style="padding:2px 6px;border-radius:6px;font-size:0.76em;font-weight:700;background:${orderBg};color:${orderColor}">${orderInfo.label}</span></td>
        <td style="padding:6px 10px">${t.payment_method||'-'}</td>
        <td style="padding:6px 10px;font-size:0.82em">${itemNames}</td>
        <td style="padding:6px 10px;text-align:right;font-weight:700">Rp ${Number(t.amount||t.total||0).toLocaleString('id-ID')}</td>
        <td style="padding:6px 10px;text-align:center"><span style="padding:3px 8px;border-radius:12px;font-size:0.78em;font-weight:700;background:${statusColor}22;color:${statusColor}">${t.status||'Lunas'}</span></td>
      </tr>`;
    }).join('');

    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${pdfFilename}</title>
    <style>body{font-family:Arial,sans-serif;font-size:13px;color:#1e293b;margin:0;padding:20px}
    h2{color:#1e40af;margin:0}table{width:100%;border-collapse:collapse;margin-top:16px}
    th{background:#1e3a5f;color:#fff;padding:10px;text-align:left;font-size:0.82em}
    tr:nth-child(even){background:#f8fafc}.total-row{background:#1e3a5f!important;color:#fff;font-weight:700}
    @media print{body{padding:0}}</style></head><body>
    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px">
      <div><h2>Riwayat Transaksi POS</h2>
        <p style="margin:4px 0;color:#64748b">Outlet: <strong>${outletStr}</strong> &nbsp;|&nbsp; Periode: <strong>${dateStr}</strong></p>
        <p style="margin:4px 0;color:#64748b">Total Transaksi: <strong>${rows.length} transaksi</strong> &nbsp;|&nbsp; Total Omzet: <strong style="color:#1e40af">Rp ${totalAmt.toLocaleString('id-ID')}</strong></p>
      </div>
      <div style="text-align:right;color:#94a3b8;font-size:0.8em">Dicetak: ${new Date().toLocaleString('id-ID')}</div>
    </div>
    <table><thead><tr>
      <th style="width:40px">#</th><th>Tanggal</th><th>No Transaksi</th><th>Outlet</th><th>Kasir</th><th>Pelanggan</th><th style="text-align:center">Tipe Pesanan</th><th>Metode</th><th>Items</th><th style="text-align:right">Total</th><th style="text-align:center">Status</th>
    </tr></thead><tbody>${tableRows}</tbody>
    <tfoot><tr class="total-row"><td colspan="9" style="padding:10px;text-align:right">TOTAL OMZET</td><td style="padding:10px;text-align:right">Rp ${totalAmt.toLocaleString('id-ID')}</td><td></td></tr></tfoot>
    </table></body></html>`;

    const win = window.open('', '_blank');
    win.document.write(html);
    win.document.close();
    win.onload = () => { win.focus(); win.print(); };
  };

  // FILTERING TRANSACTIONS WITH TOMBSTONE DELETION GUARD
  const deletedSalesSet = new Set([
    ...(masterData?.deletedSalesIds || []).map(x => String(x)),
    ...(masterData?.deletedLogisticsIds || []).map(x => String(x))
  ]);

  // Robust date parser — handles ISO strings, MySQL timestamps, Date objects
  const parseTxDate = (raw) => {
    if (!raw) return '';
    if (raw instanceof Date) {
      if (isNaN(raw.getTime())) return '';
      return `${raw.getFullYear()}-${String(raw.getMonth()+1).padStart(2,'0')}-${String(raw.getDate()).padStart(2,'0')}`;
    }
    const s = String(raw).trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.substring(0,10);
    if (s.includes('T')) return s.split('T')[0];
    if (s.includes(' ') && /^\d{4}/.test(s)) return s.split(' ')[0];
    const d = new Date(s);
    if (!isNaN(d.getTime())) {
      return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    }
    return s.substring(0,10);
  };

  const rawTransactionsList = (masterData?.salesTransactions || masterData?.transactions || [])
    .filter(t => {
      if (!t) return false;
      const tid = String(t.id !== undefined && t.id !== null ? t.id : '');
      const trcpt = String(t.receipt_no || t.receiptNo || t.invoice_no || t.receipt || '');
      if (tid && deletedSalesSet.has(tid)) return false;
      if (trcpt && deletedSalesSet.has(trcpt)) return false;
      return true;
    })
    .sort((a, b) => {
      const dateA = parseTxDate(a.date || a.entry_date || a.transaction_date || a.created_at) || '';
      const dateB = parseTxDate(b.date || b.entry_date || b.transaction_date || b.created_at) || '';
      if (dateA !== dateB) return dateB.localeCompare(dateA);
      const timeA = String(a.time || '00:00:00');
      const timeB = String(b.time || '00:00:00');
      if (timeA !== timeB) return timeB.localeCompare(timeA);
      const idA = String(a.id || a.receipt_no || '');
      const idB = String(b.id || b.receipt_no || '');
      return idB.localeCompare(idA);
    });

  const filteredTransactions = rawTransactionsList.filter(item => {
    if (outletFilter !== 'ALL' && Number(item.outlet_id) !== Number(outletFilter)) return false;
    const itemDate = parseTxDate(item.date || item.entry_date || item.transaction_date || item.created_at);
    if (startDate && itemDate < startDate) return false;
    if (endDate && itemDate > endDate) return false;

    if (orderTypeFilter !== 'ALL') {
      const info = getOrderTypeInfo(item);
      if (orderTypeFilter === 'DineIn' && info.isTakeAway) return false;
      if (orderTypeFilter === 'TakeAway' && !info.isTakeAway) return false;
    }

    if (itemFilter !== 'ALL') {
      const hasItem = (item.items || []).some(it => it.name === itemFilter) || item.item_name === itemFilter;
      if (!hasItem) return false;
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchId = (item.id || '').toLowerCase().includes(q);
      const matchCust = (item.customer_name || '').toLowerCase().includes(q);
      const matchCashier = (item.cashier || '').toLowerCase().includes(q);
      const matchBranch = (item.branch_name || '').toLowerCase().includes(q);
      const matchPay = (item.payment_method || '').toLowerCase().includes(q);
      const matchNotes = (item.notes || '').toLowerCase().includes(q);
      const matchItem = (item.items || []).some(it => (it.name || '').toLowerCase().includes(q));


      if (!matchId && !matchCust && !matchCashier && !matchBranch && !matchPay && !matchNotes && !matchItem) return false;
    }

    return true;
  });

  const totalItems = filteredTransactions.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const paginatedTransactions = filteredTransactions.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // =========================================================
  // VIEW MODE 2: LUNA POS INVOICE DETAIL VIEW (MATCHING IMAGE 2 & 3)
  // =========================================================
  const inv = selectedInvoice;
  const itemList = inv && inv.items && inv.items.length > 0 
    ? inv.items 
    : (inv ? [{ name: inv.item_name || 'AYAM BAKAR / SAMBAL PENYET', sku: '000987', qty: inv.qty || 1, unit: 'PORSI', price_unit: inv.amount || 35000, amount: inv.amount || 35000 }] : []);
  
  const totalQtyCount = itemList.reduce((sum, it) => sum + Number(it.qty || 1), 0);

  return (
    <>
      {viewMode === 'detail' && selectedInvoice ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', background: T.cardBg2, minHeight: '100vh', padding: '20px', color: T.txtPrimary, borderRadius: '16px', border: `1px solid ${T.border}` }} className="animate-fade-in">
          
          {/* HEADER BAR LUNA POS INVOICE */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <button 
                onClick={handleBackToList}
                style={{
                  background: T.cardBg, border: `1px solid ${T.border}`, color: T.txtPrimary, padding: '8px 14px', borderRadius: '8px',
                  cursor: 'pointer', fontWeight: '700', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px'
                }}
              >
                <ArrowLeft size={16} />
                <span>Kembali</span>
              </button>
              <h2 style={{ fontSize: '1.3rem', fontWeight: '800', color: T.txtPrimary, margin: 0, display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span>Invoice: #{inv.id || inv.receipt_no || inv.receiptNo || inv.invoice_no}</span>
                <span style={{ background: inv.status === 'Void' ? T.danger : T.success, color: T.txtInverse, fontSize: '0.72rem', fontWeight: '800', padding: '3px 10px', borderRadius: '12px', letterSpacing: '0.05em' }}>
                  {inv.status === 'CLOSED' || inv.status === 'Selesai' || !inv.status ? 'LUNAS / CLOSED' : inv.status}
                </span>
              </h2>
            </div>

            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <button 
                onClick={() => window.print()} 
                style={{ background: T.cardBg, border: `1px solid ${T.border}`, color: T.txtPrimary, padding: '8px 16px', borderRadius: '8px', fontSize: '0.82rem', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <Printer size={15} color={T.txtSecondary} />
                <span>Print Struk POS</span>
              </button>

              <button 
                onClick={() => handleOpenEditModal(inv)}
                style={{ background: T.primary, border: 'none', color: T.txtInverse, padding: '8px 18px', borderRadius: '8px', fontSize: '0.82rem', fontWeight: '700', cursor: 'pointer' }}
              >
                Ubah
              </button>

              <button 
                onClick={() => handleDeleteTransaction(inv)}
                style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', color: T.danger, padding: '8px 16px', borderRadius: '8px', fontSize: '0.82rem', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <Trash2 size={15} />
                <span>Hapus</span>
              </button>
            </div>
          </div>

          {/* TOP SUMMARY CARD (CUSTOMER DETAIL & LARGE AMOUNT) */}
          <div style={{ background: T.cardBg, borderRadius: '12px', border: `1px solid ${T.border}`, padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
            {/* Customer Box */}
            <div style={{ background: T.cardBg2, border: `1px solid ${T.border}`, borderRadius: '10px', padding: '14px 18px', minWidth: '280px', flex: 1 }}>
              <div style={{ fontSize: '0.78rem', fontWeight: '800', color: T.txtSecondary, display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <User size={15} color={T.info} />
                <span>DETAIL PELANGGAN</span>
              </div>
              <div style={{ fontSize: '1.1rem', fontWeight: '800', color: T.txtPrimary }}>
                {inv.customer_name || 'Pelanggan Umum'}
              </div>
              <div style={{ fontSize: '0.76rem', color: T.accentGold, fontWeight: '700', marginTop: '4px' }}>
                Tipe Order: {inv.order_type || 'Dine In'}
              </div>
            </div>

            {/* Amount Box */}
            <div style={{ textAlign: 'right', minWidth: '220px' }}>
              <div style={{ fontSize: '0.8rem', color: T.txtSecondary, fontWeight: '700' }}>TOTAL TRANSAKSI</div>
              <div style={{ fontSize: '1.8rem', fontWeight: '900', color: T.accentGold, marginTop: '2px' }}>
                {formatRupiah(inv.final_amount !== undefined ? inv.final_amount : (inv.amount || inv.total || 0))}
              </div>
            </div>
          </div>

          {/* METADATA INFORMATION GRID */}
          <div style={{ background: T.cardBg, borderRadius: '12px', padding: '18px 22px', border: `1px solid ${T.border}`, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', fontSize: '0.82rem' }}>
            {/* Left Metadata */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: T.txtSecondary }}>No. Struk / Invoice</span>
                <strong style={{ color: T.info }}>#{inv.receipt_no || inv.id}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: T.txtSecondary }}>Tanggal Transaksi</span>
                <strong style={{ color: T.txtPrimary }}>{inv.date} {inv.time || '12:00'}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: T.txtSecondary }}>Metode Pembayaran</span>
                <strong style={{ color: T.accentGold }}>{inv.payment_method || 'Cash'}</strong>
              </div>
            </div>

            {/* Right Metadata */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: T.txtSecondary }}>Outlet Cabang</span>
                <strong style={{ color: T.txtPrimary }}>{inv.branch_name}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: T.txtSecondary }}>Kasir POS</span>
                <strong style={{ color: T.txtPrimary }}>{inv.cashier || `Kasir ${inv.branch_name}`}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: T.txtSecondary }}>Catatan</span>
                <span style={{ color: T.txtPrimary }}>{inv.notes || '-'}</span>
              </div>
            </div>
          </div>

          {/* ITEMIZED PRODUCTS TABLE */}
          <div style={{ background: T.cardBg, borderRadius: '12px', border: `1px solid ${T.border}`, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: T.tableHeaderBg, borderBottom: `2px solid ${T.border}`, color: T.txtSecondary, fontWeight: '700' }}>
                  <th style={{ padding: '12px 14px', width: '35px' }}>#</th>
                  <th style={{ padding: '12px 14px' }}>Produk Menu</th>
                  <th style={{ padding: '12px 14px', textAlign: 'center', width: '70px' }}>Qty</th>
                  <th style={{ padding: '12px 14px', textAlign: 'right' }}>Harga Satuan</th>
                  <th style={{ padding: '12px 14px', textAlign: 'right' }}>Diskon</th>
                  <th style={{ padding: '12px 14px', textAlign: 'right' }}>Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {itemList.map((it, idx) => (
                  <tr key={idx} style={{ borderBottom: `1px solid ${T.border}`, color: T.txtPrimary }}>
                    <td style={{ padding: '10px 14px', color: T.txtSecondary }}>{idx + 1}</td>
                    <td style={{ padding: '10px 14px' }}>
                      <div style={{ fontWeight: '700', color: T.txtPrimary }}>{it.name}</div>
                      <div style={{ fontSize: '0.72rem', color: T.txtSecondary }}>SKU: {it.sku || `SKU-${idx + 1}`}</div>
                    </td>
                    <td style={{ padding: '10px 14px', textAlign: 'center', fontWeight: '800' }}>{it.qty || 1}</td>
                    <td style={{ padding: '10px 14px', textAlign: 'right' }}>{formatRupiah(it.price_unit || it.price || 0)}</td>
                    <td style={{ padding: '10px 14px', textAlign: 'right', color: T.txtSecondary }}>{formatRupiah(it.discount || 0)}</td>
                    <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: '800', color: T.success }}>{formatRupiah(it.amount || it.total || 0)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ background: T.tableHeaderBg, fontWeight: '700', color: T.txtPrimary, borderTop: `2px solid ${T.border}` }}>
                  <td colSpan={2} style={{ padding: '10px 14px' }}>Subtotal ({totalQtyCount} Item Porsi)</td>
                  <td style={{ padding: '10px 14px', textAlign: 'center' }}>{totalQtyCount}</td>
                  <td colSpan={2}></td>
                  <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: '800' }}>
                    {formatRupiah(inv.subtotal || (Number(inv.amount || 0) + Number(inv.discount_amount || inv.discount || 0)))}
                  </td>
                </tr>
                {(Number(inv.discount_amount || inv.discount || 0) > 0) && (
                  <tr style={{ background: T.tableHeaderBg, fontWeight: '700', color: T.danger }}>
                    <td colSpan={5} style={{ padding: '8px 14px', textAlign: 'right' }}>Potongan Diskon / Promo:</td>
                    <td style={{ padding: '8px 14px', textAlign: 'right', fontWeight: '800' }}>
                      -{formatRupiah(Number(inv.discount_amount || inv.discount || 0))}
                    </td>
                  </tr>
                )}
                <tr style={{ background: T.tableHeaderBg, fontWeight: '900', color: T.accentGold, borderTop: `1px solid ${T.border}` }}>
                  <td colSpan={5} style={{ padding: '12px 14px', textAlign: 'right', fontSize: '0.92rem' }}>TOTAL DIBAYAR KONSUMEN:</td>
                  <td style={{ padding: '12px 14px', textAlign: 'right', color: T.success, fontSize: '1.05rem' }}>
                    {formatRupiah(inv.amount || inv.total || 0)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

        </div>
    ) : (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', background: T.cardBg2, padding: '20px', borderRadius: '16px', color: T.txtPrimary, minHeight: '88vh' }} className="animate-fade-in">
        
        {/* 1. HEADER ROW WITH TITLE, STATUS PRESET & ACTION BUTTONS */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <h1 style={{ fontSize: '1.4rem', fontWeight: '900', color: T.txtPrimary, margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Receipt size={24} color={T.accentGold} />
              <span>Riwayat Transaksi Penjualan POS</span>
            </h1>

            {/* STATUS PRESET DROPDOWN */}
            <div style={{ position: 'relative' }}>
              <select
                value={statusFilterPreset}
                onChange={e => setStatusFilterPreset(e.target.value)}
                style={{
                  background: T.cardBg,
                  border: `1px solid ${T.border}`,
                  borderRadius: '8px',
                  padding: '6px 30px 6px 12px',
                  fontSize: '0.82rem',
                  fontWeight: '800',
                  color: T.accentGold,
                  cursor: 'pointer',
                  appearance: 'none',
                  outline: 'none'
                }}
              >
                <option value="Semua">Semua Status ({rawTransactionsList.length})</option>
                <option value="Terbayar">✓ Selesai / Terbayar</option>
                <option value="Dibatalkan">✕ Dibatalkan / Void</option>
              </select>
              <ChevronDown size={14} color={T.accentGold} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
            </div>
          </div>

          {/* RIGHT ACTION BUTTONS */}
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <button
              onClick={handleDownloadTransactionPDF}
              className="btn-secondary"
              style={{ padding: '8px 14px', fontSize: '0.8rem', color: T.danger, borderColor: 'rgba(251,113,133,0.35)', height: '38px', display: 'flex', alignItems: 'center', gap: '6px', borderRadius: '8px', fontWeight: '700', background: 'rgba(251,113,133,0.08)', border: '1px solid rgba(251,113,133,0.35)', cursor: 'pointer' }}
              title="Export ke PDF (Print)"
            >
              <Printer size={15} />
              <span>Download PDF</span>
            </button>

            <button
              onClick={handleDownloadTransactionExcel}
              className="btn-secondary"
              style={{ padding: '8px 14px', fontSize: '0.8rem', color: T.success, borderColor: 'rgba(52,211,153,0.35)', height: '38px', display: 'flex', alignItems: 'center', gap: '6px', borderRadius: '8px', fontWeight: '700', background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.35)', cursor: 'pointer' }}
              title="Export ke Excel (CSV)"
            >
              <Download size={15} />
              <span>Download Excel</span>
            </button>

            <button 
              onClick={handleOpenAddModal} 
              style={{ 
                padding: '8px 16px', 
                fontSize: '0.82rem', 
                fontWeight: '800',
                display: 'flex', 
                alignItems: 'center',
                gap: '6px', 
                background: T.primary, 
                color: T.txtInverse,
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer',
                height: '38px'
              }}
            >
              <Plus size={16} />
              <span>+ Input Transaksi Manual</span>
            </button>
          </div>
        </div>

        {/* 2. 4 SUMMARY KPI CARDS FOR TRANSACTIONS */}
        {(() => {
          const validFilteredTxs = filteredTransactions.filter(t => t.status !== 'Void' && t.status !== 'Dibatalkan');
          const totalNetFiltered = validFilteredTxs.reduce((sum, t) => sum + Number(t.final_amount !== undefined ? t.final_amount : (t.amount || t.total || 0)), 0);
          const successCount = validFilteredTxs.length;
          const voidCount = filteredTransactions.filter(t => t.status === 'Void' || t.status === 'Dibatalkan').length;
          const avgTicket = successCount > 0 ? Math.round(totalNetFiltered / successCount) : 0;

          const payMap = {};
          validFilteredTxs.forEach(t => {
            const p = (t.payment_method || 'Cash').trim();
            payMap[p] = (payMap[p] || 0) + 1;
          });
          let topPaymentMethod = 'Tunai (Cash)';
          let maxPayCount = 0;
          Object.entries(payMap).forEach(([k, v]) => {
            if (v > maxPayCount) {
              maxPayCount = v;
              topPaymentMethod = `${k} (${Math.round((v / (successCount || 1)) * 100)}%)`;
            }
          });

          return (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
              {/* Card 1: Total Omzet */}
              <div style={{ background: T.cardBg, border: `1px solid ${T.borderStrong}`, borderRadius: '14px', padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span style={{ fontSize: '0.68rem', fontWeight: '800', color: T.txtSecondary, textTransform: 'uppercase' }}>TOTAL OMZET TERSARING</span>
                  <div style={{ fontSize: '1.3rem', fontWeight: '900', color: T.accentGold, marginTop: '2px' }}>{formatRupiah(totalNetFiltered)}</div>
                  <span style={{ fontSize: '0.66rem', color: T.success, fontWeight: '700' }}>Dari {successCount} Nota Sukses</span>
                </div>
                <div style={{ padding: '8px', borderRadius: '10px', background: T.accentGoldBg, color: T.accentGold }}>
                  <DollarSign size={18} />
                </div>
              </div>

              {/* Card 2: Total Nota & Void */}
              <div style={{ background: T.cardBg, border: `1px solid ${T.borderStrong}`, borderRadius: '14px', padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span style={{ fontSize: '0.68rem', fontWeight: '800', color: T.txtSecondary, textTransform: 'uppercase' }}>JUMLAH NOTA / STRUK</span>
                  <div style={{ fontSize: '1.3rem', fontWeight: '900', color: T.info, marginTop: '2px' }}>{filteredTransactions.length} Nota</div>
                  <span style={{ fontSize: '0.66rem', color: voidCount > 0 ? T.danger : T.txtSecondary }}>Void/Batal: {voidCount} Nota</span>
                </div>
                <div style={{ padding: '8px', borderRadius: '10px', background: T.infoBg, color: T.info }}>
                  <Receipt size={18} />
                </div>
              </div>

              {/* Card 3: Rata-Rata Per Transaksi (AOV) */}
              <div style={{ background: T.cardBg, border: `1px solid ${T.borderStrong}`, borderRadius: '14px', padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span style={{ fontSize: '0.68rem', fontWeight: '800', color: T.txtSecondary, textTransform: 'uppercase' }}>RATA-RATA BELANJA (AOV)</span>
                  <div style={{ fontSize: '1.3rem', fontWeight: '900', color: T.success, marginTop: '2px' }}>{formatRupiah(avgTicket)}</div>
                  <span style={{ fontSize: '0.66rem', color: T.txtSecondary }}>Nominal per Struk Pelanggan</span>
                </div>
                <div style={{ padding: '8px', borderRadius: '10px', background: T.successBg, color: T.success }}>
                  <ShoppingBag size={18} />
                </div>
              </div>

              {/* Card 4: Top Payment Method */}
              <div style={{ background: T.cardBg, border: `1px solid ${T.borderStrong}`, borderRadius: '14px', padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span style={{ fontSize: '0.68rem', fontWeight: '800', color: T.txtSecondary, textTransform: 'uppercase' }}>METODE BAYAR TERBANYAK</span>
                  <div style={{ fontSize: '0.94rem', fontWeight: '900', color: T.primary, marginTop: '2px', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '160px' }}>
                    {topPaymentMethod}
                  </div>
                  <span style={{ fontSize: '0.66rem', color: T.info, fontWeight: '700' }}>Dominan Pelanggan</span>
                </div>
                <div style={{ padding: '8px', borderRadius: '10px', background: T.primaryBtn, color: T.navActiveTxt }}>
                  <CreditCard size={18} />
                </div>
              </div>
            </div>
          );
        })()}

        {/* 3. FILTER & SEARCH CONTROL BAR */}
        <div style={{ background: T.cardBg, padding: '14px 18px', borderRadius: '14px', border: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '12px', position: 'relative', zIndex: 100 }}>
          
          {/* Search Bar Input */}
          <div style={{ position: 'relative', minWidth: '220px', flex: 1 }}>
            <Search size={15} color={T.txtSecondary} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
            <input 
              type="text" 
              placeholder="Cari no. struk, kasir, pelanggan, menu..." 
              value={searchQuery} 
              onChange={e => setSearchQuery(e.target.value)} 
              style={{ paddingLeft: '34px', height: '36px', fontSize: '0.8rem', width: '100%', border: `1px solid ${T.border}`, borderRadius: '8px', background: T.inputBg, color: T.txtPrimary, outline: 'none' }} 
            />
          </div>

          {/* Tipe Pesanan Filter (Dine In / Take Away) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <select
              value={orderTypeFilter}
              onChange={e => setOrderTypeFilter(e.target.value)}
              style={{
                padding: '0 10px',
                borderRadius: '8px',
                border: `1px solid ${T.border}`,
                background: T.cardBg2,
                color: T.txtPrimary,
                fontSize: '0.78rem',
                fontWeight: '800',
                height: '36px',
                cursor: 'pointer',
                outline: 'none'
              }}
            >
              <option value="ALL">Semua Tipe Pesanan</option>
              <option value="DineIn">🍽️ Dine In (Makan di Tempat)</option>
              <option value="TakeAway">🛍️ Take Away (Bawa Pulang / Online)</option>
            </select>
          </div>

          {/* Date Range Inputs */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <input 
              type="date" 
              value={startDate} 
              onChange={e => setStartDate(e.target.value)}
              style={{ height: '36px', fontSize: '0.78rem', border: `1px solid ${T.border}`, borderRadius: '8px', padding: '0 8px', color: T.txtPrimary, fontWeight: '700', background: T.inputBg, colorScheme: isLight ? 'light' : 'dark', outline: 'none' }} 
            />
            <span style={{ color: T.txtMuted, fontSize: '0.75rem' }}>s/d</span>
            <input 
              type="date" 
              value={endDate} 
              onChange={e => setEndDate(e.target.value)}
              style={{ height: '36px', fontSize: '0.78rem', border: `1px solid ${T.border}`, borderRadius: '8px', padding: '0 8px', color: T.txtPrimary, fontWeight: '700', background: T.inputBg, colorScheme: isLight ? 'light' : 'dark', outline: 'none' }} 
            />
          </div>

          {/* Quick Date Presets (Pill Tabs) */}
          <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '5px' }}>
            {[
              {
                id: 'today',
                label: 'Hari Ini',
                action: () => {
                  const t = new Date().toISOString().split('T')[0];
                  setStartDate(t); setEndDate(t);
                }
              },
              {
                id: 'yesterday',
                label: 'Kemarin',
                action: () => {
                  const y = new Date(); y.setDate(y.getDate() - 1);
                  const yStr = y.toISOString().split('T')[0];
                  setStartDate(yStr); setEndDate(yStr);
                }
              },
              {
                id: 'last_week',
                label: 'Pekan Lalu (Sen-Min)',
                action: () => {
                  const now = new Date();
                  const day = now.getDay();
                  const diff = (day === 0 ? 7 : day) - 1;
                  const monThis = new Date(now); monThis.setDate(now.getDate() - diff);
                  const monLast = new Date(monThis); monLast.setDate(monThis.getDate() - 7);
                  const sunLast = new Date(monThis); sunLast.setDate(monThis.getDate() - 1);
                  setStartDate(monLast.toISOString().split('T')[0]);
                  setEndDate(sunLast.toISOString().split('T')[0]);
                }
              },
              {
                id: 'this_month',
                label: 'Bulan Ini',
                action: () => {
                  const now = new Date();
                  const first = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
                  setStartDate(first); setEndDate(now.toISOString().split('T')[0]);
                }
              },
              {
                id: 'last_month',
                label: 'Bulan Lalu',
                action: () => {
                  const now = new Date();
                  const first = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0];
                  const last = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0];
                  setStartDate(first); setEndDate(last);
                }
              },
              {
                id: '7days',
                label: '7 Hari Terakhir',
                action: () => {
                  const now = new Date();
                  const past7 = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
                  setStartDate(past7); setEndDate(now.toISOString().split('T')[0]);
                }
              }
            ].map(p => (
              <button
                key={p.id}
                type="button"
                onClick={p.action}
                style={{
                  height: '36px',
                  padding: '0 10px',
                  borderRadius: '8px',
                  border: `1px solid ${T.border}`,
                  background: T.cardBg,
                  color: T.txtPrimary,
                  fontSize: '0.74rem',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Reset filter button */}
          {(startDate || endDate || selectedYear || selectedMonth || outletFilter !== 'ALL' || orderTypeFilter !== 'ALL' || searchQuery) && (
            <button
              onClick={() => {
                setStartDate('');
                setEndDate('');
                setSelectedYear('');
                setSelectedMonth('');
                setOutletFilter('ALL');
                setOrderTypeFilter('ALL');
                setSearchQuery('');
              }}
              style={{
                height: '36px',
                padding: '0 12px',
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: T.danger,
                borderRadius: '8px',
                fontSize: '0.76rem',
                fontWeight: '700',
                cursor: 'pointer'
              }}
            >
              Reset Filter
            </button>
          )}

        </div>
      {/* 4. TABEL LOG RIWAYAT TRANSAKSI PENJUALAN POS */}
      <div style={{ background: T.cardBg, borderRadius: '14px', border: `1px solid ${T.border}`, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.82rem' }}>
            <thead>
              <tr style={{ background: T.tableHeaderBg, borderBottom: `2px solid ${T.border}`, color: T.txtSecondary, fontWeight: '700', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                <th style={{ padding: '12px 14px', width: '140px' }}>Waktu / Tanggal</th>
                <th style={{ padding: '12px 14px' }}>No. Struk / ID</th>
                <th style={{ padding: '12px 14px' }}>Outlet Cabang</th>
                <th style={{ padding: '12px 14px' }}>Kasir</th>
                <th style={{ padding: '12px 14px' }}>Pelanggan</th>
                <th style={{ padding: '12px 14px', textAlign: 'center' }}>Tipe Pesanan</th>
                <th style={{ padding: '12px 14px' }}>Items Menu</th>
                <th style={{ padding: '12px 14px' }}>Metode Bayar</th>
                <th style={{ padding: '12px 14px', textAlign: 'right' }}>Total (Rp)</th>
                <th style={{ padding: '12px 14px', textAlign: 'center' }}>Status</th>
                <th style={{ padding: '12px 14px', textAlign: 'center', width: '120px' }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {paginatedTransactions.length === 0 ? (
                <tr>
                  <td colSpan={11} style={{ padding: '40px', textAlign: 'center', color: T.txtSecondary }}>
                    Tidak ditemukan data transaksi yang sesuai dengan filter.
                  </td>
                </tr>
              ) : (
                paginatedTransactions.map((item, idx) => {
                  const isVoid = item.status === 'Void' || item.status === 'Dibatalkan';
                  let parsedItems = [];
                  if (item.items && Array.isArray(item.items) && item.items.length > 0) {
                    parsedItems = item.items;
                  } else if (item.items_json) {
                    try {
                      const p = typeof item.items_json === 'string' ? JSON.parse(item.items_json) : item.items_json;
                      if (Array.isArray(p) && p.length > 0) parsedItems = p;
                    } catch (e) {}
                  }
                  const itemsList = parsedItems.length > 0
                    ? parsedItems
                    : (item.item_name ? [{ name: item.item_name, qty: item.qty || 1 }] : []);
                  const orderInfo = getOrderTypeInfo(item);
                  
                  return (
                  <tr key={item.id || idx} style={{ borderBottom: `1px solid ${T.border}`, background: idx % 2 === 0 ? T.cardBg : T.cardBg2 }}>
                    
                    {/* Tanggal & Waktu (Jam:Menit:Detik) */}
                    <td style={{ padding: '10px 14px', color: T.txtPrimary }}>
                      {formatDateTimeWithSeconds(item)}
                    </td>

                    {/* No. Struk (Clickable to open Invoice) */}
                    <td style={{ padding: '10px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                        <span 
                          onClick={() => handleOpenInvoiceDetail(item)}
                          style={{ color: T.info, fontWeight: '800', cursor: 'pointer', fontFamily: 'monospace', fontSize: '0.86rem' }}
                          title="Klik untuk membuka rincian invoice POS"
                        >
                          {item.receipt_no || item.receiptNo || item.id || `POS-${idx + 1}`}
                        </span>

                        {Boolean(item.source?.includes('import') || item.cashier?.includes('Impor') || (item.notes || '').toLowerCase().includes('impor') || (item.receipt_no || '').startsWith('IMP-')) && (
                          <span style={{
                            fontSize: '0.62rem',
                            fontWeight: '800',
                            padding: '1px 6px',
                            borderRadius: '4px',
                            background: 'rgba(56, 189, 248, 0.15)',
                            border: '1px solid rgba(56, 189, 248, 0.35)',
                            color: '#38bdf8',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '3px'
                          }} title={item.notes || 'Data berasal dari Impor Dokumen'}>
                            📥 Impor
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Outlet */}
                    <td style={{ padding: '10px 14px', color: T.txtPrimary, fontWeight: '700' }}>
                      {item.branch_name || 'Semua Cabang'}
                    </td>

                    {/* Kasir */}
                    <td style={{ padding: '10px 14px', color: T.txtSecondary }}>
                      {item.cashier || 'Kasir POS'}
                    </td>

                    {/* Pelanggan */}
                    <td style={{ padding: '10px 14px' }}>
                      <div style={{ fontWeight: '700', color: T.txtPrimary }}>{item.customer_name || 'Pelanggan Umum'}</div>
                    </td>

                    {/* Tipe Pesanan (Dine In / Take Away) */}
                    <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                      {orderInfo.isTakeAway ? (
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontSize: '0.72rem',
                          fontWeight: '800',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          background: 'rgba(249, 115, 22, 0.15)',
                          color: '#f97316',
                          border: '1px solid rgba(249, 115, 22, 0.3)'
                        }}>
                          🛍️ {orderInfo.label}
                        </span>
                      ) : (
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontSize: '0.72rem',
                          fontWeight: '800',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          background: T.infoBg,
                          color: T.info,
                          border: `1px solid ${T.infoBorder}`
                        }}>
                          🍽️ {orderInfo.label}
                        </span>
                      )}
                    </td>

                    {/* Items Menu summary */}
                    <td style={{ padding: '10px 14px', maxWidth: '200px' }}>
                      {itemsList.length > 0 ? (
                        <div>
                          <div style={{ fontSize: '0.78rem', color: T.txtPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {itemsList[0].name} {itemsList[0].qty ? `(x${itemsList[0].qty})` : ''}
                          </div>
                          {itemsList.length > 1 && (
                            <span style={{ fontSize: '0.68rem', color: T.info, background: `${T.info}15`, padding: '1px 5px', borderRadius: '4px', fontWeight: '700' }}>
                              +{itemsList.length - 1} item lainnya
                            </span>
                          )}
                        </div>
                      ) : (
                        <span style={{ color: T.txtMuted, fontSize: '0.75rem' }}>-</span>
                      )}
                    </td>

                    {/* Metode Bayar */}
                    <td style={{ padding: '10px 14px' }}>
                      <span style={{ fontSize: '0.74rem', padding: '3px 8px', borderRadius: '6px', fontWeight: '700', background: `${T.info}15`, color: T.info, border: `1px solid ${T.info}30` }}>
                        {item.payment_method || 'Cash'}
                      </span>
                    </td>

                    {/* Total (Rp) */}
                    <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: '800', color: isVoid ? T.txtMuted : T.success, fontSize: '0.9rem', textDecoration: isVoid ? 'line-through' : 'none' }}>
                      {formatRupiah(item.final_amount !== undefined ? item.final_amount : (item.amount || item.total || 0))}
                    </td>

                    {/* Status Badge */}
                    <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                      <span style={{
                        fontSize: '0.72rem',
                        fontWeight: '800',
                        padding: '3px 9px',
                        borderRadius: '12px',
                        background: isVoid ? 'rgba(239, 68, 68, 0.15)' : 'rgba(52, 211, 153, 0.15)',
                        color: isVoid ? T.danger : T.success,
                        border: `1px solid ${isVoid ? 'rgba(239, 68, 68, 0.3)' : 'rgba(52, 211, 153, 0.3)'}`
                      }}>
                        {isVoid ? 'Void / Batal' : 'Lunas'}
                      </span>
                    </td>

                    {/* Aksi (Detail, Ubah, Hapus) */}
                    <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '5px', justifyContent: 'center' }}>
                        <button 
                          onClick={() => handleOpenInvoiceDetail(item)}
                          title="Lihat Rincian Struk POS"
                          style={{
                            background: T.cardBg2, color: T.info, border: `1px solid ${T.border}`, padding: '5px 8px', borderRadius: '6px',
                            fontSize: '0.74rem', fontWeight: '700', cursor: 'pointer'
                          }}
                        >
                          <Eye size={13} />
                        </button>

                        <button 
                          onClick={() => handleOpenEditModal(item)}
                          title="Ubah Transaksi"
                          style={{
                            background: T.cardBg2, color: T.accentGold, border: `1px solid ${T.border}`, padding: '5px 8px', borderRadius: '6px',
                            fontSize: '0.74rem', fontWeight: '700', cursor: 'pointer'
                          }}
                        >
                          <Edit3 size={13} />
                        </button>

                        <button 
                          onClick={() => handleDeleteTransaction(item)}
                          title="Hapus / Void Transaksi"
                          style={{
                            background: 'rgba(239, 68, 68, 0.1)', color: T.danger, border: '1px solid rgba(239, 68, 68, 0.3)', padding: '5px 8px', borderRadius: '6px',
                            fontSize: '0.74rem', fontWeight: '700', cursor: 'pointer'
                          }}
                        >
                          <Trash2 size={13} />
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
        <div style={{ padding: '16px', background: T.cardBg, borderTop: `1px solid ${T.border}` }}>
          <PaginationControls
            currentPage={currentPage}
            totalPages={totalPages}
            pageSize={pageSize}
            totalItems={totalItems}
            onPageChange={setCurrentPage}
            onPageSizeChange={setPageSize}
           themeMode={themeMode} />
        </div>
      </div>
    </div>
    )}

      {/* ========================================================= */}
      {/* FORM MODAL ADD / EDIT MANUAL TRANSACTION                  */}
      {/* ========================================================= */}
      {showModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 120
        }}>
          <div style={{
            width: '100%', maxWidth: '640px', maxHeight: '92vh', overflowY: 'auto',
            padding: '24px', background: T.txtPrimary, borderRadius: '16px', boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
            color: T.cardBg
          }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '14px', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: '800', color: '#6b21a8', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShoppingBag size={20} color="#6b21a8" />
                <span>{editingRecord ? 'Ubah Invoice Penjualan' : 'Tambah Invoice Penjualan Baru'}</span>
              </h3>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', color: T.txtMuted, cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveTransaction} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.78rem', color: T.txtMuted, fontWeight: '700', display: 'block', marginBottom: '4px' }}>Tanggal Transaksi *</label>
                  <input type="date" value={formDate} onChange={e => setFormDate(e.target.value)} required style={{ width: '100%', height: '38px', border: `1px solid ${T.border}`, borderRadius: '8px', padding: '0 10px', background: T.inputBg, color: T.txtPrimary }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.78rem', color: T.txtMuted, fontWeight: '700', display: 'block', marginBottom: '4px' }}>Jam Transaksi *</label>
                  <input type="time" value={formTime} onChange={e => setFormTime(e.target.value)} required style={{ width: '100%', height: '38px', border: `1px solid ${T.border}`, borderRadius: '8px', padding: '0 10px', background: T.inputBg, color: T.txtPrimary }} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.78rem', color: T.txtMuted, fontWeight: '700', display: 'block', marginBottom: '4px' }}>Outlet Cabang *</label>
                  <select value={formOutletId} onChange={e => setFormOutletId(e.target.value)} style={{ width: '100%', height: '38px', border: `1px solid ${T.border}`, borderRadius: '8px', padding: '0 10px', background: T.inputBg, color: T.txtPrimary }}>
                    {outlets.map(o => (
                      <option key={o.id} value={o.id}>{o.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.78rem', color: T.txtMuted, fontWeight: '700', display: 'block', marginBottom: '4px' }}>Kasir/Pelayan *</label>
                  <select value={formCashier} onChange={e => setFormCashier(e.target.value)} style={{ width: '100%', height: '38px', border: `1px solid ${T.border}`, borderRadius: '8px', padding: '0 10px', background: T.inputBg, color: T.txtPrimary }}>
                    {adminList.map(a => (
                      <option key={a.id} value={a.name}>{a.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.78rem', color: T.txtMuted, fontWeight: '700', display: 'block', marginBottom: '4px' }}>Nama Pelanggan *</label>
                  <select value={formCustomerName} onChange={e => setFormCustomerName(e.target.value)} style={{ width: '100%', height: '38px', border: `1px solid ${T.border}`, borderRadius: '8px', padding: '0 10px', background: T.inputBg, color: T.txtPrimary }}>
                    {customerList.map(c => (
                      <option key={c.id} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.78rem', color: T.txtMuted, fontWeight: '700', display: 'block', marginBottom: '4px' }}>Tipe Order *</label>
                  <select value={formOrderType} onChange={e => setFormOrderType(e.target.value)} style={{ width: '100%', height: '38px', border: `1px solid ${T.border}`, borderRadius: '8px', padding: '0 10px', fontWeight: '700', color: T.accentGold, background: T.inputBg }}>
                    <option value="DineIn">DineIn (Makan di Tempat)</option>
                    <option value="Take Away">Take Away (Bawa Pulang)</option>
                  </select>
                </div>
              </div>

              {/* Multi-Row Items */}
              <div style={{ background: T.cardBg2, padding: '14px', borderRadius: '10px', border: `1px solid ${T.border}`, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: '800', color: T.txtPrimary }}>Rincian Produk Menu</span>
                  <span style={{ fontSize: '0.78rem', color: T.accentGold, fontWeight: '800' }}>Subtotal: {formatRupiah(rawSubtotal)}</span>
                </div>

                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
                    <thead>
                      <tr style={{ color: T.txtSecondary, borderBottom: `1px solid ${T.border}`, textAlign: 'left' }}>
                        <th style={{ padding: '6px' }}>Nama Produk</th>
                        <th style={{ padding: '6px', width: '65px' }}>Qty</th>
                        <th style={{ padding: '6px', textAlign: 'right', width: '100px' }}>Harga</th>
                        <th style={{ padding: '6px', textAlign: 'right', width: '100px' }}>Total</th>
                        <th style={{ padding: '6px', textAlign: 'center', width: '30px' }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {formItemRows.map(r => (
                        <tr key={r.id} style={{ borderBottom: `1px solid ${T.border}` }}>
                          <td style={{ padding: '6px' }}>
                            <select 
                              value={r.name} 
                              onChange={e => handleUpdateItemRow(r.id, 'name', e.target.value)} 
                              style={{ width: '100%', height: '32px', fontSize: '0.78rem', border: `1px solid ${T.border}`, borderRadius: '6px', fontWeight: '600', background: T.inputBg, color: T.txtPrimary }}
                            >
                              {menuProducts.map(p => (
                                <option key={p.id} value={p.name}>{p.name}</option>
                              ))}
                            </select>
                          </td>
                          <td style={{ padding: '6px' }}>
                            <input 
                              type="number" 
                              min="1" 
                              value={r.qty} 
                              onChange={e => handleUpdateItemRow(r.id, 'qty', e.target.value)} 
                              style={{ width: '100%', height: '32px', fontSize: '0.78rem', textAlign: 'center', border: `1px solid ${T.border}`, borderRadius: '6px', background: T.inputBg, color: T.txtPrimary }} 
                            />
                          </td>
                          <td style={{ padding: '6px' }}>
                            <input 
                              type="number" 
                              value={r.price_unit} 
                              onChange={e => handleUpdateItemRow(r.id, 'price_unit', e.target.value)} 
                              style={{ width: '100%', height: '32px', fontSize: '0.78rem', textAlign: 'right', border: `1px solid ${T.border}`, borderRadius: '6px', background: T.inputBg, color: T.txtPrimary }} 
                            />
                          </td>
                          <td style={{ padding: '6px', textAlign: 'right', fontWeight: '700', color: T.success }}>
                            {formatRupiah(r.amount)}
                          </td>
                          <td style={{ padding: '6px', textAlign: 'center' }}>
                            <button type="button" onClick={() => handleRemoveItemRow(r.id)} style={{ background: 'none', border: 'none', color: T.danger, cursor: 'pointer' }}>
                              <Trash2 size={13} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <button 
                  type="button" 
                  onClick={handleAddBlankItemRow} 
                  style={{ alignSelf: 'flex-start', background: T.cardBg, border: `1px solid ${T.border}`, color: T.accentGold, padding: '6px 12px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  <PlusCircle size={14} />
                  <span>+ Tambah Field Produk</span>
                </button>
              </div>

              {/* Metode Pembayaran & Diskon */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.78rem', color: T.txtMuted, fontWeight: '700', display: 'block', marginBottom: '4px' }}>Metode Pembayaran</label>
                  <select value={formPaymentMethod} onChange={e => setFormPaymentMethod(e.target.value)} style={{ width: '100%', height: '38px', border: `1px solid ${T.border}`, borderRadius: '8px', padding: '0 10px', background: T.inputBg, color: T.txtPrimary }}>
                    <option value="Cash">Cash / Tunai</option>
                    <option value="QRIS">QRIS & E-Wallet</option>
                    <option value="EDC">Kartu Debit/Kredit (EDC)</option>
                    <option value="Transfer Bank">Transfer Bank</option>
                    <option value="Online Delivery">Online Delivery (GoFood/Grab/Shopee)</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.78rem', color: T.danger, fontWeight: '700', display: 'block', marginBottom: '4px' }}>Potongan Diskon / Promo (Rp)</label>
                  <input 
                    type="number" 
                    min="0"
                    placeholder="0" 
                    value={formDiscountAmount} 
                    onChange={e => setFormDiscountAmount(Number(e.target.value || 0))} 
                    style={{ width: '100%', height: '38px', border: `1px solid ${T.border}`, borderRadius: '8px', padding: '0 10px', background: T.inputBg, color: T.danger, fontWeight: '800' }} 
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.78rem', color: T.txtMuted, fontWeight: '700', display: 'block', marginBottom: '4px' }}>Catatan Transaksi</label>
                <input 
                  type="text" 
                  placeholder="Contoh: Meja 04, es teh manis" 
                  value={formNotes} 
                  onChange={e => setFormNotes(e.target.value)} 
                  style={{ width: '100%', height: '38px', border: `1px solid ${T.border}`, borderRadius: '8px', padding: '0 10px', background: T.inputBg, color: T.txtPrimary }} 
                />
              </div>

              <div style={{ background: T.cardBg2, padding: '12px 16px', borderRadius: '8px', border: `1px solid ${T.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '0.74rem', color: T.txtSecondary }}>
                    Subtotal: {formatRupiah(rawSubtotal)} {discVal > 0 ? `| Diskon: -${formatRupiah(discVal)}` : ''}
                  </div>
                  <span style={{ fontSize: '0.82rem', color: T.txtPrimary, fontWeight: '800' }}>TOTAL DIBAYAR KONSUMEN:</span>
                </div>
                <span style={{ fontSize: '1.2rem', fontWeight: '900', color: T.accentGold }}>{formatRupiah(netAmount)}</span>
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '6px' }}>
                <button type="button" onClick={() => setShowModal(false)} style={{ padding: '8px 16px', border: `1px solid ${T.border}`, borderRadius: '8px', background: T.cardBg, cursor: 'pointer', fontSize: '0.82rem', color: T.txtPrimary, fontWeight: '700' }}>
                  Batal
                </button>
                <button type="submit" style={{ padding: '8px 20px', border: 'none', borderRadius: '8px', background: T.primary, color: T.txtInverse, cursor: 'pointer', fontWeight: '800', fontSize: '0.82rem' }}>
                  Simpan Invoice
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL PREVIEW NOTA STRUK TRANSAKSI POS THERMAL STYLE      */}
      {/* ========================================================= */}
      {previewRecord && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 130
        }}>
          <div className="glass-card animate-fade-in" style={{
            width: '100%', maxWidth: '440px', padding: '24px', background: T.cardBg2, border: `1px solid ${T.border}`, borderRadius: '20px',
            boxShadow: '0 20px 50px rgba(0,0,0,0.8)'
          }}>
            {/* Header Modal */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${T.border}`, paddingBottom: '12px', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: '900', color: T.txtPrimary, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Receipt size={22} color={T.accentGold} />
                <span>Pratinjau Struk Nota POS Kasir</span>
              </h3>
              <button onClick={() => setPreviewRecord(null)} style={{ background: 'none', border: 'none', color: T.txtSecondary, cursor: 'pointer' }}>
                <X size={22} />
              </button>
            </div>

            {/* Thermal Struk Card Visual */}
            <div style={{
              background: T.cardBg,
              border: `1px dashed ${T.border}`,
              borderRadius: '12px',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
              fontFamily: 'monospace'
            }}>
              
              {/* Resto Branding Header */}
              <div style={{ textAlign: 'center', borderBottom: `1px dashed ${T.border}`, paddingBottom: '12px' }}>
                <div style={{ fontSize: '1.15rem', fontWeight: '900', color: T.txtPrimary, letterSpacing: '0.05em' }}>POS KASIR BAROKAH</div>
                <div style={{ fontSize: '0.78rem', color: T.info, marginTop: '2px', fontWeight: '700' }}>{previewRecord.branch_name}</div>
                <div style={{ fontSize: '0.72rem', color: T.txtSecondary, marginTop: '2px' }}>Terhubung Realtime Kasir System</div>
              </div>

              {/* Transaction Metadata */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.78rem', color: T.txtPrimary }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: T.txtSecondary }}>No Struk:</span>
                  <strong style={{ color: T.info }}>{previewRecord.id}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: T.txtSecondary }}>Waktu:</span>
                  <span>{previewRecord.date} {previewRecord.time ? `(${previewRecord.time})` : ''}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: T.txtSecondary }}>Pelanggan:</span>
                  <span style={{ fontWeight: '700', color: T.txtPrimary }}>{previewRecord.customer_name || 'Pelanggan Umum'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: T.txtSecondary }}>Layanan:</span>
                  <strong style={{ color: previewRecord.order_type === 'Take Away' ? T.accentGold : T.info }}>
                    {previewRecord.order_type === 'Take Away' ? 'Take Away' : 'Dine In'}
                  </strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: T.txtSecondary }}>Kasir POS:</span>
                  <span>{previewRecord.cashier}</span>
                </div>
              </div>

              {/* Rincian Item Produk Menu */}
              <div style={{ borderTop: `1px dashed ${T.border}`, borderBottom: `1px dashed ${T.border}`, padding: '10px 0', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ fontSize: '0.72rem', color: T.txtSecondary, textTransform: 'uppercase', fontWeight: '800', display: 'flex', justifyContent: 'space-between' }}>
                  <span>ITEM PESANAN</span>
                  <span>SUBTOTAL</span>
                </div>

                {(previewRecord.items && previewRecord.items.length > 0 ? previewRecord.items : [
                  { name: previewRecord.item_name || 'Nasi Goreng Spesial', qty: previewRecord.qty || 1, price_unit: previewRecord.price_unit || 35000, amount: previewRecord.amount || 35000 }
                ]).map((it, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: T.txtPrimary }}>
                    <div>
                      <div style={{ fontWeight: '700' }}>• {it.name}</div>
                      <div style={{ fontSize: '0.72rem', color: T.txtSecondary }}>{it.qty}x @ {formatRupiah(it.price_unit)}</div>
                    </div>
                    <div style={{ fontWeight: '800', color: T.txtPrimary }}>{formatRupiah(it.amount || (it.qty * it.price_unit))}</div>
                  </div>
                ))}
              </div>

              {/* Payment Summary */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.8rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: T.txtSecondary }}>
                  <span>Metode Pembayaran:</span>
                  <strong style={{ color: T.txtPrimary }}>{previewRecord.payment_method}</strong>
                </div>

                {previewRecord.notes && (
                  <div style={{ color: T.accentGold, fontSize: '0.75rem', fontStyle: 'italic', marginTop: '2px' }}>
                    Catatan: "{previewRecord.notes}"
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.15rem', fontWeight: '900', color: T.success, marginTop: '8px', borderTop: '1px dashed ${T.borderStrong}', paddingTop: '8px' }}>
                  <span>TOTAL STRUK:</span>
                  <span>{formatRupiah(previewRecord.amount)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: T.txtPrimary, marginTop: '4px' }}>
                  <span style={{ color: T.txtSecondary }}>Bayar:</span>
                  <span>{formatRupiah(previewRecord.paid_amount || previewRecord.cash_paid || previewRecord.amount)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.95rem', fontWeight: '800', color: T.success, marginTop: '2px' }}>
                  <span>Kembalian:</span>
                  <span>{formatRupiah(previewRecord.change_amount !== undefined && previewRecord.change_amount !== null ? previewRecord.change_amount : (previewRecord.kembalian !== undefined && previewRecord.kembalian !== null ? previewRecord.kembalian : Math.max(0, (previewRecord.paid_amount || previewRecord.cash_paid || previewRecord.amount || 0) - (previewRecord.amount || 0))))}</span>
                </div>
              </div>

              {/* Footer Struk */}
              <div style={{ textAlign: 'center', fontSize: '0.7rem', color: T.txtMuted, marginTop: '4px' }}>
                *** Terima Kasih Atas Kunjungan Anda ***<br />
                Simpan Struk Sebagai Bukti Pembayaran Sah
              </div>

            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
              <button onClick={() => window.print()} className="btn-secondary" style={{ flex: 1, justifyContent: 'center', borderColor: T.info, color: T.info, borderRadius: '8px' }}>
                <Printer size={16} />
                <span>Cetak Nota</span>
              </button>
              <button onClick={() => setPreviewRecord(null)} className="btn-secondary" style={{ flex: 1, justifyContent: 'center', borderRadius: '8px' }}>
                Tutup Struk
              </button>
            </div>

          </div>
        </div>
      )}

    </>
  );
}
