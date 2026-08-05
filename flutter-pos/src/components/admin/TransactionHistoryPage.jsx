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

export default function TransactionHistoryPage({ masterData, setMasterData, selectedBranch, themeMode = 'dark' }) {
  const outlets = masterData?.outlets || [];
  const T = getThemePalette(themeMode);

  const formatRupiah = (val) => {
    return 'Rp ' + Number(val || 0).toLocaleString('id-ID');
  };

  // FORMAT CURRENCY MATCHING LUNA POS STYLE (e.g. 2.424.100,00)
  const formatLunaCurrency = (val) => {
    const num = Number(val || 0);
    return num.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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
  const [itemFilter, setItemFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

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

  const grandTotalStrukAmount = formItemRows.reduce((sum, r) => sum + Number(r.amount || 0), 0);

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

    const newRecord = {
      id: editingRecord ? editingRecord.id : `00${Math.floor(2500 + Math.random() * 9000)}`,
      date: formDate,
      time: formTime,
      type: 'Invoice Penjualan',
      outlet_id: Number(formOutletId),
      branch_name: targetOutlet.name,
      customer_name: formCustomerName || 'Default Customer',
      order_type: formOrderType || 'DineIn',
      items: activeItems,
      amount: grandTotalStrukAmount,
      payment_method: formPaymentMethod,
      cashier: formCashier,
      notes: formNotes,
      ref_pelanggan: `POS-${formDate.replace(/-/g, '')}-MANUAL`,
      gudang: `GUDANG ${targetOutlet.name.toUpperCase()}`,
      source: editingRecord ? (editingRecord.source || '✍️ By Manual') : '✍️ By Manual',
      status: 'Selesai'
    };

    let updatedList = [...transactions];
    if (editingRecord) {
      const index = updatedList.findIndex(t => t.id === editingRecord.id);
      if (index !== -1) updatedList[index] = newRecord;
    } else {
      updatedList = [newRecord, ...updatedList];
    }

    if (setMasterData) {
      setMasterData({
        ...masterData,
        salesTransactions: updatedList
      });
    }

    setShowModal(false);
  };

  const handleDuplicateTransaction = (item) => {
    const dupRecord = {
      ...item,
      id: `00${Math.floor(2500 + Math.random() * 9000)}`,
      notes: item.notes ? `${item.notes} (Duplikat)` : 'Duplikat Transaksi',
      source: '✍️ By Manual',
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

  const handleDeleteTransaction = async (id) => {
    if (!id) return;
    const targetTx = (masterData?.salesTransactions || []).find(t => 
      String(t.id) === String(id) || String(t.receipt_no) === String(id) || String(t.receiptNo) === String(id) || String(t.invoice_no) === String(id)
    ) || (masterData?.transactions || []).find(t => 
      String(t.id) === String(id) || String(t.receipt_no) === String(id) || String(t.receiptNo) === String(id) || String(t.invoice_no) === String(id)
    );

    const targetId = targetTx?.id ? String(targetTx.id) : String(id);
    const targetReceiptNo = targetTx?.receipt_no || targetTx?.receiptNo || targetTx?.invoice_no || null;
    const displayLabel = targetReceiptNo || targetId;

    if (window.confirm(`Apakah Anda yakin ingin menghapus transaksi penjualan ${displayLabel}? Data penjualan ini akan terhapus permanen dari Web Admin, Riwayat Kategori, Laba Rugi, dan Kasir Mobile.`)) {
      const isMatch = (t) => {
        if (!t) return false;
        const tid = String(t.id !== undefined ? t.id : '');
        const trcpt = String(t.receipt_no || t.receiptNo || t.invoice_no || t.receipt || '');
        if (tid && (tid === targetId || tid === String(id))) return true;
        if (targetReceiptNo && trcpt && trcpt === targetReceiptNo) return true;
        if (trcpt && (trcpt === targetId || trcpt === String(id))) return true;
        return false;
      };

      const updatedSalesTx = (masterData?.salesTransactions || []).filter(t => !isMatch(t));
      const updatedTx = (masterData?.transactions || []).filter(t => !isMatch(t));
      const updatedOutletTx = (masterData?.outletTransactions || []).filter(t => !isMatch(t));

      const updatedStockMovement = (masterData?.stockMovement || []).filter(m => {
        if (!m) return false;
        const refId = String(m.ref_id || m.transaction_id || m.receipt_no || '');
        if (refId && (refId === targetId || refId === String(id) || (targetReceiptNo && refId === targetReceiptNo))) return false;
        return true;
      });

      const prevDelSales = (masterData?.deletedSalesIds || []).map(x => String(x));
      const prevDelLog = (masterData?.deletedLogisticsIds || []).map(x => String(x));
      const updatedDelSales = Array.from(new Set([...prevDelSales, targetId, targetReceiptNo, String(id)].filter(Boolean)));
      const updatedDelLog = Array.from(new Set([...prevDelLog, targetId, targetReceiptNo, String(id)].filter(Boolean)));

      const updated = {
        ...masterData,
        _lastUpdated: Date.now(),
        deletedSalesIds: updatedDelSales,
        deletedLogisticsIds: updatedDelLog,
        salesTransactions: updatedSalesTx,
        transactions: updatedTx,
        outletTransactions: updatedOutletTx,
        stockMovement: updatedStockMovement
      };

      if (setMasterData) {
        setMasterData(updated);
      }

      try {
        const getApiUrl = (pathStr) => `https://mris-api.barokahgroupindonesia.tech${pathStr}`;
        await fetch(getApiUrl('/api/master-data/delete-item'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key: 'salesTransactions', id: targetId, receipt_no: targetReceiptNo })
        });
        if (targetReceiptNo && targetReceiptNo !== targetId) {
          await fetch(getApiUrl('/api/master-data/delete-item'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ key: 'salesTransactions', id: targetReceiptNo, receipt_no: targetReceiptNo })
          });
        }
      } catch (err) {
        console.error('Delete transaction API error:', err);
      }

      if (viewMode === 'detail') {
        setViewMode('list');
      }
    }
  };

  // FILTERING TRANSACTIONS WITH TOMBSTONE DELETION GUARD
  const deletedSalesSet = new Set([
    ...(masterData?.deletedSalesIds || []).map(x => String(x)),
    ...(masterData?.deletedLogisticsIds || []).map(x => String(x))
  ]);

  const rawTransactionsList = (masterData?.salesTransactions || masterData?.transactions || []).filter(t => {
    if (!t) return false;
    const tid = String(t.id !== undefined && t.id !== null ? t.id : '');
    const trcpt = String(t.receipt_no || t.receiptNo || t.invoice_no || t.receipt || '');
    if (tid && deletedSalesSet.has(tid)) return false;
    if (trcpt && deletedSalesSet.has(trcpt)) return false;
    return true;
  });

  const filteredTransactions = rawTransactionsList.filter(item => {
    if (outletFilter !== 'ALL' && Number(item.outlet_id) !== Number(outletFilter)) return false;
    if (startDate && item.date < startDate) return false;
    if (endDate && item.date > endDate) return false;

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
  if (viewMode === 'detail' && selectedInvoice) {
    const inv = selectedInvoice;
    const itemList = inv.items && inv.items.length > 0 
      ? inv.items 
      : [{ name: inv.item_name || 'AYAM BAKAR / SAMBAL PENYET', sku: '000987', qty: inv.qty || 1, unit: 'PORSI', price_unit: inv.amount || 35000, amount: inv.amount || 35000 }];
    
    const totalQtyCount = itemList.reduce((sum, it) => sum + Number(it.qty || 1), 0);

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', background: T.cardBg2, minHeight: '100vh', padding: '20px', color: T.txtPrimary }} className="animate-fade-in">
        
        {/* HEADER BAR LUNA POS INVOICE */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button 
              onClick={handleBackToList}
              style={{
                background: T.cardBg, border: '1px solid ${T.borderStrong}', color: T.txtPrimary, padding: '8px 14px', borderRadius: '8px',
                cursor: 'pointer', fontWeight: '700', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px'
              }}
            >
              <ArrowLeft size={16} />
              <span>Kembali</span>
            </button>
            <h2 style={{ fontSize: '1.5rem', fontWeight: '800', color: T.txtPrimary, margin: 0, display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span>Invoice: {inv.id}</span>
              <span style={{ background: T.danger, color: T.txtPrimary, fontSize: '0.72rem', fontWeight: '800', padding: '3px 10px', borderRadius: '12px', letterSpacing: '0.05em' }}>
                {inv.status === 'CLOSED' || inv.status === 'Selesai' ? 'CLOSED' : inv.status}
              </span>
            </h2>
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <button 
              onClick={() => window.print()} 
              style={{ background: T.cardBg, border: '1px solid ${T.borderStrong}', color: T.txtPrimary, padding: '8px 16px', borderRadius: '8px', fontSize: '0.85rem', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Printer size={16} color="${T.txtSecondary}" />
              <span>Print</span>
              <ChevronDown size={14} />
            </button>

            <button 
              onClick={() => handleOpenEditModal(inv)}
              style={{ background: '#7e22ce', border: 'none', color: T.txtPrimary, padding: '8px 20px', borderRadius: '8px', fontSize: '0.85rem', fontWeight: '700', cursor: 'pointer' }}
            >
              Ubah
            </button>

            <button 
              onClick={() => handleDeleteTransaction(inv.id)}
              style={{ background: T.danger, border: 'none', color: T.txtPrimary, padding: '8px 16px', borderRadius: '8px', fontSize: '0.85rem', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Trash2 size={16} />
              <span>Hapus</span>
            </button>

            <button style={{ background: T.cardBg, border: '1px solid ${T.borderStrong}', color: T.txtPrimary, padding: '8px 12px', borderRadius: '8px', cursor: 'pointer' }}>
              <MoreVertical size={16} />
            </button>
          </div>
        </div>

        {/* TOP SUMMARY CARD (CUSTOMER DETAIL & LARGE AMOUNT) */}
        <div style={{ background: T.cardBg, borderRadius: '12px', border: '1px solid ${T.borderStrong}', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '20px' }}>
          {/* Customer Box */}
          <div style={{ background: T.cardBg2, border: '1px solid ${T.borderStrong}', borderRadius: '8px', padding: '16px 20px', minWidth: '320px', flex: 1, borderTop: '4px solid #c084fc' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: '800', color: T.txtPrimary, display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <User size={16} color="#c084fc" />
              <span>Detail Customer</span>
            </div>
            <div style={{ fontSize: '1.1rem', fontWeight: '800', color: '#c084fc' }}>
              {inv.customer_name || 'Default Customer'}
            </div>
            <div style={{ display: 'flex', gap: '24px', fontSize: '0.82rem', color: T.txtSecondary, marginTop: '8px' }}>
              <span>📞 -</span>
              <span>✉️ -</span>
            </div>
            <div style={{ marginTop: '8px', display: 'inline-flex', background: 'rgba(59,130,246,0.15)', color: '#60a5fa', border: '1px solid rgba(96,165,250,0.3)', padding: '2px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: '700' }}>
              💳 -
            </div>
          </div>

          {/* Amount Box */}
          <div style={{ textAlign: 'right', minWidth: '220px' }}>
            <div style={{ fontSize: '0.85rem', color: T.txtSecondary, fontWeight: '700' }}>Jumlah</div>
            <div style={{ fontSize: '2rem', fontWeight: '900', color: T.txtPrimary, marginTop: '2px' }}>
              {formatLunaCurrency(inv.amount)}
            </div>
          </div>
        </div>

        {/* METADATA INFORMATION GRID */}
        <div style={{ background: T.cardBg2, borderRadius: '8px', padding: '20px 24px', border: '1px solid ${T.borderStrong}', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', fontSize: '0.82rem' }}>
          {/* Left Metadata */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: T.txtSecondary }}>No. Invoice</span>
              <strong style={{ color: T.txtPrimary }}>#{inv.id}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: T.txtSecondary }}>No. Order</span>
              <span style={{ color: T.txtPrimary }}>-</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: T.txtSecondary }}>No. Ref Pelanggan</span>
              <strong style={{ color: T.txtPrimary }}>{inv.ref_pelanggan || `POS-${inv.id}`}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: T.txtSecondary }}>Tanggal</span>
              <strong style={{ color: T.txtPrimary }}>{inv.date} {inv.time || '23:52'}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: T.txtSecondary }}>Tanggal jatuh tempo</span>
              <span style={{ color: T.txtPrimary }}>{inv.date}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: T.txtSecondary }}>Harga termasuk pajak</span>
              <span style={{ color: T.txtPrimary }}>Ya</span>
            </div>
          </div>

          {/* Right Metadata */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: T.txtSecondary }}>Tipe Order</span>
              <strong style={{ color: T.txtPrimary }}>POS</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: T.txtSecondary }}>Tipe Penjualan</span>
              <strong style={{ color: T.txtPrimary }}>{inv.order_type || 'DineIn'}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: T.txtSecondary }}>Gudang</span>
              <strong style={{ color: T.txtPrimary }}>{inv.gudang || `GUDANG ${inv.branch_name}`}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: T.txtSecondary }}>Outlet</span>
              <strong style={{ color: T.txtPrimary }}>{inv.branch_name}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: T.txtSecondary }}>Kasir/Pelayan</span>
              <strong style={{ color: T.txtPrimary }}>{inv.cashier || `KASIR ${inv.branch_name}`}</strong>
            </div>
          </div>
        </div>

        {/* ITEMIZED PRODUCTS TABLE */}
        <div style={{ background: T.cardBg, borderRadius: '12px', border: '1px solid ${T.borderStrong}', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: T.cardBg2, borderBottom: '1px solid ${T.borderStrong}', color: T.txtSecondary, fontWeight: '700' }}>
                <th style={{ padding: '12px 14px', width: '30px' }}>#</th>
                <th style={{ padding: '12px 14px' }}>Produk</th>
                <th style={{ padding: '12px 14px' }}>Modifier</th>
                <th style={{ padding: '12px 14px' }}>Deskripsi</th>
                <th style={{ padding: '12px 14px', textAlign: 'center', width: '60px' }}>Qty</th>
                <th style={{ padding: '12px 14px', width: '80px' }}>Satuan</th>
                <th style={{ padding: '12px 14px', textAlign: 'right' }}>Harga</th>
                <th style={{ padding: '12px 14px', textAlign: 'center', width: '70px' }}>Diskon %</th>
                <th style={{ padding: '12px 14px', textAlign: 'right' }}>Diskon</th>
                <th style={{ padding: '12px 14px', textAlign: 'right' }}>Jumlah</th>
              </tr>
            </thead>
            <tbody>
              {itemList.map((it, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid ${T.border}', color: T.txtPrimary }}>
                  <td style={{ padding: '12px 14px', color: T.txtSecondary }}>{idx + 1}</td>
                  <td style={{ padding: '12px 14px' }}>
                    <div style={{ fontWeight: '700', color: T.txtPrimary }}>{it.name}</div>
                    <div style={{ fontSize: '0.75rem', color: T.txtSecondary, fontStyle: 'italic' }}>SKU: {it.sku || `000${idx + 800}`}</div>
                  </td>
                  <td style={{ padding: '12px 14px', color: T.txtSecondary }}>-</td>
                  <td style={{ padding: '12px 14px', color: T.txtPrimary }}>{it.name}</td>
                  <td style={{ padding: '12px 14px', textAlign: 'center', fontWeight: '700' }}>{it.qty}</td>
                  <td style={{ padding: '12px 14px', color: T.txtPrimary, textTransform: 'uppercase' }}>{it.unit || 'PORSI'}</td>
                  <td style={{ padding: '12px 14px', textAlign: 'right' }}>{formatLunaCurrency(it.price_unit)}</td>
                  <td style={{ padding: '12px 14px', textAlign: 'center' }}>0</td>
                  <td style={{ padding: '12px 14px', textAlign: 'right' }}>0,00</td>
                  <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: '700' }}>{formatLunaCurrency(it.amount)}</td>
                </tr>
              ))}
              <tr style={{ background: T.cardBg2, fontWeight: '800', color: T.txtPrimary }}>
                <td colSpan={4} style={{ padding: '12px 14px', textAlign: 'right' }}>Total Qty:</td>
                <td style={{ padding: '12px 14px', textAlign: 'center' }}>{totalQtyCount}</td>
                <td colSpan={5}></td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* BOTTOM NOTES & SUMMARY CALCULATION SECTION */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', alignItems: 'flex-start' }}>
          {/* Left Notes */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ background: T.cardBg, padding: '16px', borderRadius: '8px', border: '1px solid ${T.borderStrong}' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: '800', color: T.txtPrimary, display: 'block', marginBottom: '6px' }}>Pesan untuk pelanggan</label>
              <div style={{ fontSize: '0.82rem', color: T.txtSecondary }}>-</div>
            </div>

            <div style={{ background: T.cardBg, padding: '16px', borderRadius: '8px', border: '1px solid ${T.borderStrong}' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: '800', color: T.txtPrimary, display: 'block', marginBottom: '6px' }}>Catatan</label>
              <div style={{ fontSize: '0.82rem', color: T.txtPrimary }}>{inv.notes || '-'}</div>
            </div>
          </div>

          {/* Right Calculation Box */}
          <div style={{ background: T.cardBg, padding: '20px', borderRadius: '8px', border: '1px solid ${T.borderStrong}', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.85rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: T.txtSecondary, fontWeight: '700' }}>Subtotal</span>
              <strong style={{ color: T.txtPrimary }}>{formatLunaCurrency(inv.amount)}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: T.txtSecondary }}>Diskon (Rp)</span>
              <span style={{ color: T.txtPrimary }}>0</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: T.txtSecondary }}>Service charge</span>
              <span style={{ color: T.txtPrimary }}>0,00</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: T.txtSecondary }}>Pajak</span>
              <span style={{ color: T.txtPrimary }}>0,00</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: T.txtSecondary }}>Penyesuaian</span>
              <span style={{ color: T.txtPrimary }}>0,00</span>
            </div>

            <div style={{ borderTop: '1px dashed ${T.borderStrong}', margin: '8px 0' }}></div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.2rem', fontWeight: '900', color: T.txtPrimary }}>
              <span>Total</span>
              <span>{formatLunaCurrency(inv.amount)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.05rem', fontWeight: '800', color: '#c084fc' }}>
              <span>Dibayar</span>
              <span>{formatLunaCurrency(inv.amount)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1rem', fontWeight: '800', color: T.success }}>
              <span>Sisa Tagihan</span>
              <span>LUNAS</span>
            </div>
          </div>
        </div>

        {/* BOTTOM PAYMENT INFO */}
        <div style={{ background: T.cardBg, borderRadius: '8px', padding: '16px', border: '1px solid ${T.borderStrong}', fontSize: '0.85rem', fontWeight: '800', color: T.txtPrimary, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <CreditCard size={18} color="#c084fc" />
          <span>Informasi Pembayaran</span>
        </div>

      </div>
    );
  }

  // =========================================================
  // VIEW MODE 1: LUNA POS MAIN PENJUALAN TABLE (MATCHING DARK THEME SYSTEM)
  // =========================================================
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', background: T.cardBg2, padding: '20px', borderRadius: '16px', color: T.txtPrimary, minHeight: '88vh' }} className="animate-fade-in">
      
      {/* 1. HEADER ROW WITH TITLE & "+ TAMBAH BARU" BUTTON */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <h1 style={{ fontSize: '1.8rem', fontWeight: '800', color: T.txtPrimary, margin: 0 }}>
            Penjualan
          </h1>

          {/* STATUS PRESET DROPDOWN */}
          <div style={{ position: 'relative' }}>
            <select
              value={statusFilterPreset}
              onChange={e => setStatusFilterPreset(e.target.value)}
              style={{
                background: T.cardBg, border: '1px solid ${T.borderStrong}', borderRadius: '8px', padding: '6px 32px 6px 14px',
                fontSize: '0.9rem', fontWeight: '700', color: '#c084fc', cursor: 'pointer', appearance: 'none'
              }}
            >
              <option value="Semua">Semua</option>
              <option value="Terbayar">Terbayar</option>
              <option value="Draft">Draft</option>
              <option value="Dibatalkan">Dibatalkan</option>
            </select>
            <ChevronDown size={14} color="#c084fc" style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
          </div>
        </div>

        {/* "+ TAMBAH BARU" PURPLE BUTTON */}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button 
            onClick={handleOpenAddModal} 
            style={{ 
              padding: '8px 18px', 
              fontSize: '0.85rem', 
              fontWeight: '700',
              display: 'flex', 
              alignItems: 'center',
              gap: '6px', 
              background: T.cardBg, 
              color: '#c084fc',
              borderRadius: '8px',
              border: '1px solid #c084fc',
              cursor: 'pointer'
            }}
          >
            <Plus size={16} color="#c084fc" />
            <span>Tambah Baru</span>
            <ChevronDown size={14} color="#c084fc" />
          </button>
        </div>
      </div>

      {/* 2. FILTER & SEARCH CONTROL BAR MATCHING DARK THEME */}
      <div style={{ background: T.cardBg, padding: '16px', borderRadius: '12px', border: '1px solid ${T.borderStrong}', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', display: 'flex', alignItems: 'flex-end', flexWrap: 'wrap', gap: '12px', position: 'relative', zIndex: 100 }}>
        
        {/* Search Bar Input */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '220px' }}>
          <span style={{ fontSize: '0.78rem', color: T.txtSecondary, fontWeight: '700' }}>🔍 Pencarian Struk</span>
          <div style={{ position: 'relative' }}>
            <Search size={16} color="${T.txtSecondary}" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
            <input 
              type="text" 
              placeholder="Cari no. struk/item..." 
              value={searchQuery} 
              onChange={e => setSearchQuery(e.target.value)} 
              style={{ paddingLeft: '36px', height: '36px', fontSize: '0.85rem', width: '100%', border: '1px solid ${T.borderStrong}', borderRadius: '6px', background: T.inputBg, color: T.txtPrimary }} 
            />
          </div>
        </div>

        {/* 1. Tahun Dropdown */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <span style={{ fontSize: '0.78rem', color: T.txtSecondary, fontWeight: '700' }}>📅 Tahun</span>
          <select
            value={selectedYear}
            onChange={e => handleYearChange(e.target.value)}
            style={{
              padding: '0 12px',
              borderRadius: '6px',
              border: '1px solid ${T.borderStrong}',
              background: T.cardBg2,
              color: T.txtPrimary,
              fontSize: '0.85rem',
              fontWeight: '700',
              height: '36px',
              cursor: 'pointer'
            }}
          >
            <option value="">Semua Tahun</option>
            {Array.from({ length: 17 }, (_, i) => 2024 + i).map(yr => (
              <option key={yr} value={String(yr)}>{yr}</option>
            ))}
          </select>
        </div>

        {/* 2. Bulan Dropdown */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <span style={{ fontSize: '0.78rem', color: T.txtSecondary, fontWeight: '700' }}>🗓️ Bulan</span>
          <select
            value={selectedMonth}
            onChange={e => handleMonthChange(e.target.value)}
            style={{
              padding: '0 12px',
              borderRadius: '6px',
              border: '1px solid ${T.borderStrong}',
              background: T.cardBg2,
              color: T.txtPrimary,
              fontSize: '0.85rem',
              fontWeight: '700',
              height: '36px',
              cursor: 'pointer'
            }}
          >
            <option value="">Semua Bulan</option>
            <option value="01">Januari</option>
            <option value="02">Februari</option>
            <option value="03">Maret</option>
            <option value="04">April</option>
            <option value="05">Mei</option>
            <option value="06">Juni</option>
            <option value="07">Juli</option>
            <option value="08">Agustus</option>
            <option value="09">September</option>
            <option value="10">Oktober</option>
            <option value="11">November</option>
            <option value="12">Desember</option>
          </select>
        </div>

        {/* 3. Tanggal (Rentang Waktu) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <span style={{ fontSize: '0.78rem', color: T.txtSecondary, fontWeight: '700' }}>📆 Tanggal (Rentang Waktu)</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <input 
              type="date" 
              value={startDate} 
              onChange={e => setStartDate(e.target.value)}
              style={{ height: '36px', fontSize: '0.82rem', border: '1px solid ${T.borderStrong}', borderRadius: '6px', padding: '0 8px', color: T.txtPrimary, fontWeight: '600', background: T.inputBg }} 
            />
            <span style={{ color: T.txtMuted, fontSize: '0.80rem' }}>s/d</span>
            <input 
              type="date" 
              value={endDate} 
              onChange={e => setEndDate(e.target.value)}
              style={{ height: '36px', fontSize: '0.82rem', border: '1px solid ${T.borderStrong}', borderRadius: '6px', padding: '0 8px', color: T.txtPrimary, fontWeight: '600', background: T.inputBg }} 
            />
          </div>
        </div>

        {/* 4. Outlet Selector Dropdown */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '200px' }}>
          <span style={{ fontSize: '0.78rem', color: T.txtSecondary, fontWeight: '700' }}>🏢 Outlet</span>
          <select 
            value={outletFilter} 
            onChange={e => setOutletFilter(e.target.value)} 
            style={{ height: '36px', fontSize: '0.85rem', width: '100%', border: '1px solid ${T.borderStrong}', borderRadius: '6px', padding: '0 12px', color: T.txtPrimary, fontWeight: '700', background: T.inputBg, cursor: 'pointer' }}
          >
            <option value="ALL">SEMUA OUTLET CABANG</option>
            {outlets.map(o => (
              <option key={o.id} value={o.id}>{o.name}</option>
            ))}
          </select>
        </div>

        {/* More Filter Button */}
        <button style={{ height: '38px', padding: '0 16px', border: '1px solid ${T.borderStrong}', background: T.cardBg2, color: T.txtPrimary, borderRadius: '6px', fontSize: '0.85rem', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
          <span>More Filter</span>
          <ChevronDown size={14} />
        </button>

        {/* Control Icons */}
        <div style={{ display: 'flex', gap: '8px', marginLeft: 'auto' }}>
          <button style={{ width: '38px', height: '38px', borderRadius: '8px', border: '1px solid ${T.borderStrong}', background: T.cardBg2, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: T.txtMuted }}>
            <RefreshCw size={18} color="${T.txtMuted}" />
          </button>
          <button style={{ width: '38px', height: '38px', borderRadius: '8px', border: '1px solid ${T.borderStrong}', background: T.cardBg2, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: T.txtMuted }}>
            <SlidersHorizontal size={18} color="${T.txtMuted}" />
          </button>
        </div>

      </div>

      {/* 3. LUNA POS PENJUALAN TABLE MATCHING DARK THEME SYSTEM */}
      <div style={{ background: T.cardBg, borderRadius: '12px', border: '1px solid ${T.borderStrong}', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ background: T.cardBg2, borderBottom: '1px solid ${T.borderStrong}', color: T.txtSecondary, fontWeight: '600' }}>
                <th style={{ padding: '14px 16px' }}>Tanggal ↕</th>
                <th style={{ padding: '14px 16px' }}>Tipe ↕</th>
                <th style={{ padding: '14px 16px' }}>No ↕</th>
                <th style={{ padding: '14px 16px' }}>Outlet</th>
                <th style={{ padding: '14px 16px' }}>Pelanggan ↕</th>
                <th style={{ padding: '14px 16px', textAlign: 'right' }}>Total ↕</th>
                <th style={{ padding: '14px 16px' }}>Status ↕</th>
                <th style={{ padding: '14px 16px', textAlign: 'center', width: '90px' }}></th>
              </tr>
            </thead>
            <tbody>
              {paginatedTransactions.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: '40px', textAlign: 'center', color: T.txtSecondary }}>
                    Belum ada data penjualan. Klik "+ Tambah Baru" untuk membuat invoice penjualan baru.
                  </td>
                </tr>
              ) : (
                paginatedTransactions.map((item, idx) => (
                  <tr key={item.id || idx} style={{ borderBottom: '1px solid ${T.border}', background: T.cardBg }}>
                    
                    {/* Tanggal */}
                    <td style={{ padding: '16px', color: T.txtPrimary }}>
                      {item.date}
                    </td>

                    {/* Tipe */}
                    <td style={{ padding: '16px', color: T.txtSecondary }}>
                      {item.type || 'Invoice Penjualan'}
                    </td>

                    {/* No (CLICKABLE LINK PURPLE MATCHING DARK THEME) */}
                    <td style={{ padding: '16px' }}>
                      <span 
                        onClick={() => handleOpenInvoiceDetail(item)}
                        style={{ color: '#c084fc', fontWeight: '700', cursor: 'pointer', textDecoration: 'none' }}
                        title="Klik untuk membuka rincian invoice"
                      >
                        {item.id}
                      </span>
                    </td>

                    {/* Outlet */}
                    <td style={{ padding: '16px', color: T.txtPrimary }}>
                      {item.branch_name}
                    </td>

                    {/* Pelanggan (LINK TEXT PURPLE MATCHING DARK THEME) */}
                    <td style={{ padding: '16px' }}>
                      <span onClick={() => handleOpenInvoiceDetail(item)} style={{ color: '#c084fc', fontWeight: '700', cursor: 'pointer' }}>
                        {item.customer_name || 'Default Customer'}
                      </span>
                    </td>

                    {/* Total (FORMATTED WITH DECIMAL e.g. 2.424.100,00) */}
                    <td style={{ padding: '16px', textAlign: 'right', fontWeight: '600', color: T.txtPrimary }}>
                      {formatLunaCurrency(item.amount)}
                    </td>

                    {/* Status (GREEN TEXT MATCHING DARK THEME) */}
                    <td style={{ padding: '16px' }}>
                      <span style={{ color: T.success, fontWeight: '700' }}>
                        {item.status || 'Selesai'}
                      </span>
                    </td>

                    {/* Aksi (Ubah & Hapus) */}
                    <td style={{ padding: '16px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                        <button 
                          onClick={() => handleOpenEditModal(item)}
                          style={{
                            background: '#7e22ce', color: T.txtPrimary, border: 'none', padding: '6px 14px', borderRadius: '16px',
                            fontSize: '0.78rem', fontWeight: '700', cursor: 'pointer'
                          }}
                        >
                          Ubah
                        </button>
                        <button 
                          onClick={() => handleDeleteTransaction(item.id)}
                          title="Hapus Transaksi Penjualan"
                          style={{
                            background: T.danger, color: T.txtPrimary, border: 'none', padding: '6px 12px', borderRadius: '16px',
                            fontSize: '0.78rem', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px'
                          }}
                        >
                          <Trash2 size={13} />
                          <span>Hapus</span>
                        </button>
                      </div>
                    </td>

                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINATION CONTROLS */}
        <div style={{ padding: '16px', background: T.cardBg, borderTop: '1px solid ${T.borderStrong}' }}>
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
                  <input type="date" value={formDate} onChange={e => setFormDate(e.target.value)} required style={{ width: '100%', height: '38px', border: '1px solid ${T.txtPrimary}', borderRadius: '8px', padding: '0 10px' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.78rem', color: T.txtMuted, fontWeight: '700', display: 'block', marginBottom: '4px' }}>Jam Transaksi *</label>
                  <input type="time" value={formTime} onChange={e => setFormTime(e.target.value)} required style={{ width: '100%', height: '38px', border: '1px solid ${T.txtPrimary}', borderRadius: '8px', padding: '0 10px' }} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.78rem', color: T.txtMuted, fontWeight: '700', display: 'block', marginBottom: '4px' }}>Outlet Cabang *</label>
                  <select value={formOutletId} onChange={e => setFormOutletId(e.target.value)} style={{ width: '100%', height: '38px', border: '1px solid ${T.txtPrimary}', borderRadius: '8px', padding: '0 10px' }}>
                    {outlets.map(o => (
                      <option key={o.id} value={o.id}>{o.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.78rem', color: T.txtMuted, fontWeight: '700', display: 'block', marginBottom: '4px' }}>Kasir/Pelayan *</label>
                  <select value={formCashier} onChange={e => setFormCashier(e.target.value)} style={{ width: '100%', height: '38px', border: '1px solid ${T.txtPrimary}', borderRadius: '8px', padding: '0 10px' }}>
                    {adminList.map(a => (
                      <option key={a.id} value={a.name}>{a.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.78rem', color: T.txtMuted, fontWeight: '700', display: 'block', marginBottom: '4px' }}>Nama Pelanggan *</label>
                  <select value={formCustomerName} onChange={e => setFormCustomerName(e.target.value)} style={{ width: '100%', height: '38px', border: '1px solid ${T.txtPrimary}', borderRadius: '8px', padding: '0 10px' }}>
                    {customerList.map(c => (
                      <option key={c.id} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.78rem', color: T.txtMuted, fontWeight: '700', display: 'block', marginBottom: '4px' }}>Tipe Order *</label>
                  <select value={formOrderType} onChange={e => setFormOrderType(e.target.value)} style={{ width: '100%', height: '38px', border: '1px solid ${T.txtPrimary}', borderRadius: '8px', padding: '0 10px', fontWeight: '700', color: '#6b21a8' }}>
                    <option value="DineIn">DineIn (Makan di Tempat)</option>
                    <option value="Take Away">Take Away (Bawa Pulang)</option>
                  </select>
                </div>
              </div>

              {/* Multi-Row Items */}
              <div style={{ background: T.txtPrimary, padding: '14px', borderRadius: '8px', border: '1px solid ${T.txtPrimary}', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: '800', color: '#6b21a8' }}>Rincian Produk Menu</span>
                  <span style={{ fontSize: '0.78rem', color: T.cardBg, fontWeight: '700' }}>Subtotal: {formatLunaCurrency(grandTotalStrukAmount)}</span>
                </div>

                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
                    <thead>
                      <tr style={{ color: T.txtMuted, borderBottom: '1px solid ${T.txtPrimary}', textAlign: 'left' }}>
                        <th style={{ padding: '6px' }}>Nama Produk</th>
                        <th style={{ padding: '6px', width: '65px' }}>Qty</th>
                        <th style={{ padding: '6px', textAlign: 'right', width: '100px' }}>Harga</th>
                        <th style={{ padding: '6px', textAlign: 'right', width: '100px' }}>Total</th>
                        <th style={{ padding: '6px', textAlign: 'center', width: '30px' }}>✕</th>
                      </tr>
                    </thead>
                    <tbody>
                      {formItemRows.map(r => (
                        <tr key={r.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                          <td style={{ padding: '6px' }}>
                            <select 
                              value={r.name} 
                              onChange={e => handleUpdateItemRow(r.id, 'name', e.target.value)} 
                              style={{ width: '100%', height: '32px', fontSize: '0.78rem', border: '1px solid ${T.txtPrimary}', borderRadius: '6px', fontWeight: '600' }}
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
                              style={{ width: '100%', height: '32px', fontSize: '0.78rem', textAlign: 'center', border: '1px solid ${T.txtPrimary}', borderRadius: '6px' }} 
                            />
                          </td>
                          <td style={{ padding: '6px' }}>
                            <input 
                              type="number" 
                              value={r.price_unit} 
                              onChange={e => handleUpdateItemRow(r.id, 'price_unit', e.target.value)} 
                              style={{ width: '100%', height: '32px', fontSize: '0.78rem', textAlign: 'right', border: '1px solid ${T.txtPrimary}', borderRadius: '6px' }} 
                            />
                          </td>
                          <td style={{ padding: '6px', textAlign: 'right', fontWeight: '700', color: T.cardBg }}>
                            {formatLunaCurrency(r.amount)}
                          </td>
                          <td style={{ padding: '6px', textAlign: 'center' }}>
                            <button type="button" onClick={() => handleRemoveItemRow(r.id)} style={{ background: 'none', border: 'none', color: T.danger, cursor: 'pointer' }}>✕</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <button 
                  type="button" 
                  onClick={handleAddBlankItemRow} 
                  style={{ alignSelf: 'flex-start', background: '#f1f5f9', border: '1px solid ${T.txtPrimary}', color: '#6b21a8', padding: '6px 12px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  <PlusCircle size={14} />
                  <span>+ Tambah Field Produk</span>
                </button>
              </div>

              <div>
                <label style={{ fontSize: '0.78rem', color: T.txtMuted, fontWeight: '700', display: 'block', marginBottom: '4px' }}>Catatan Transaksi</label>
                <input 
                  type="text" 
                  placeholder="Contoh: Meja 04, es teh manis" 
                  value={formNotes} 
                  onChange={e => setFormNotes(e.target.value)} 
                  style={{ width: '100%', height: '38px', border: '1px solid ${T.txtPrimary}', borderRadius: '8px', padding: '0 10px' }} 
                />
              </div>

              <div style={{ background: T.txtPrimary, padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.85rem', color: T.txtMuted, fontWeight: '700' }}>TOTAL TRANSAKSI:</span>
                <span style={{ fontSize: '1.2rem', fontWeight: '900', color: '#6b21a8' }}>{formatLunaCurrency(grandTotalStrukAmount)}</span>
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '6px' }}>
                <button type="button" onClick={() => setShowModal(false)} style={{ padding: '8px 16px', border: '1px solid ${T.txtPrimary}', borderRadius: '8px', background: T.txtPrimary, cursor: 'pointer', fontSize: '0.85rem' }}>
                  Batal
                </button>
                <button type="submit" style={{ padding: '8px 20px', border: 'none', borderRadius: '8px', background: '#6b21a8', color: T.txtPrimary, cursor: 'pointer', fontWeight: '700', fontSize: '0.85rem' }}>
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
            width: '100%', maxWidth: '440px', padding: '24px', background: T.cardBg2, border: '1px solid ${T.info}', borderRadius: '20px',
            boxShadow: '0 20px 50px rgba(0,0,0,0.8)'
          }}>
            {/* Header Modal */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid ${T.borderStrong}', paddingBottom: '12px', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: '900', color: T.txtPrimary, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Receipt size={22} color="${T.info}" />
                <span>Pratinjau Struk Nota POS Kasir</span>
              </h3>
              <button onClick={() => setPreviewRecord(null)} style={{ background: 'none', border: 'none', color: T.txtSecondary, cursor: 'pointer' }}>
                <X size={22} />
              </button>
            </div>

            {/* Thermal Struk Card Visual */}
            <div style={{
              background: T.cardBg,
              border: '1px dashed ${T.borderStrong}',
              borderRadius: '12px',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
              fontFamily: 'monospace'
            }}>
              
              {/* Resto Branding Header */}
              <div style={{ textAlign: 'center', borderBottom: '1px dashed ${T.borderStrong}', paddingBottom: '12px' }}>
                <div style={{ fontSize: '1.15rem', fontWeight: '900', color: T.txtPrimary, letterSpacing: '0.05em' }}>POS KASIR BAROKAH</div>
                <div style={{ fontSize: '0.78rem', color: T.info, marginTop: '2px', fontWeight: '700' }}>🏢 {previewRecord.branch_name}</div>
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
                  <span>📅 {previewRecord.date} {previewRecord.time ? `(${previewRecord.time})` : ''}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: T.txtSecondary }}>Pelanggan:</span>
                  <span style={{ fontWeight: '700', color: T.txtPrimary }}>👤 {previewRecord.customer_name || 'Pelanggan Umum'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: T.txtSecondary }}>Layanan:</span>
                  <strong style={{ color: previewRecord.order_type === 'Take Away' ? T.accentGold : T.info }}>
                    {previewRecord.order_type === 'Take Away' ? '🛍️ Take Away' : '🍽️ Dine In'}
                  </strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: T.txtSecondary }}>Kasir POS:</span>
                  <span>👤 {previewRecord.cashier}</span>
                </div>
              </div>

              {/* Rincian Item Produk Menu */}
              <div style={{ borderTop: '1px dashed ${T.borderStrong}', borderBottom: '1px dashed ${T.borderStrong}', padding: '10px 0', display: 'flex', flexDirection: 'column', gap: '8px' }}>
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
                  <strong style={{ color: T.txtPrimary }}>💳 {previewRecord.payment_method}</strong>
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

    </div>
  );
}
