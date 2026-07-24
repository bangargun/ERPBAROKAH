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

export default function TransactionHistoryPage({ masterData, setMasterData, selectedBranch }) {
  const outlets = masterData?.outlets || [];

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
    : [
        { id: 1, name: 'Admin Utama (HQ)', role: 'Super Admin' },
        { id: 2, name: 'KASIR PECAL LELE PAK HAJI', role: 'Kasir POS' },
        { id: 3, name: 'Manajer Cabang', role: 'Manajer Cabang' }
      ];

  // DEFAULT TRANSACTIONS MATCHING LUNA POS SCREENSHOTS
  const defaultSalesList = [
    {
      id: '002549',
      date: '23/07/2026',
      time: '23:52',
      type: 'Invoice Penjualan',
      outlet_id: 1,
      branch_name: 'RUMAH PRODUKSI',
      customer_name: 'AYAM PECAK 2001 SEAFOOD TEBING TINGGI',
      order_type: 'DineIn',
      amount: 2424100,
      payment_method: 'Kasir POS',
      cashier: 'Kasir Utama',
      notes: '-',
      status: 'Selesai',
      source: '📱 By POS',
      ref_pelanggan: 'POS-230726-49',
      gudang: 'GUDANG RUMAH PRODUKSI',
      items: [
        { name: 'AYAM BAKAR / SAMBAL PENYET', sku: '000987', qty: 20, unit: 'PORSI', price_unit: 35000, amount: 700000 },
        { name: 'IKAN NILA / SAMBAL PENYET', sku: '000855', qty: 30, unit: 'PORSI', price_unit: 35000, amount: 1050000 },
        { name: 'TEH MANIS DINGIN', sku: 'BMJ-23', qty: 40, unit: 'GELAS', price_unit: 5000, amount: 200000 },
        { name: 'NASI PUTIH', sku: '000827', qty: 94, unit: 'PORSI', price_unit: 5000, amount: 474100 }
      ]
    },
    {
      id: '002548',
      date: '22/07/2026',
      time: '21:15',
      type: 'Invoice Penjualan',
      outlet_id: 1,
      branch_name: 'RUMAH PRODUKSI',
      customer_name: 'AYAM PECAK 2001 SEAFOOD TEBING TINGGI',
      order_type: 'DineIn',
      amount: 2688900,
      payment_method: 'Kasir POS',
      cashier: 'Kasir Utama',
      notes: '-',
      status: 'Selesai',
      source: '📱 By POS',
      ref_pelanggan: 'POS-220726-48',
      gudang: 'GUDANG RUMAH PRODUKSI',
      items: [
        { name: 'IKAN NILA / SAMBAL PENYET', sku: '000855', qty: 40, unit: 'PORSI', price_unit: 35000, amount: 1400000 },
        { name: 'AYAM BAKAR / SAMBAL PENYET', sku: '000987', qty: 30, unit: 'PORSI', price_unit: 35000, amount: 1050000 },
        { name: 'NASI PUTIH', sku: '000827', qty: 47, unit: 'PORSI', price_unit: 5000, amount: 238900 }
      ]
    },
    {
      id: '002544',
      date: '21/07/2026',
      time: '19:40',
      type: 'Invoice Penjualan',
      outlet_id: 1,
      branch_name: 'RUMAH PRODUKSI',
      customer_name: 'AYAM PECAK 2001 SEAFOOD TEBING TINGGI',
      order_type: 'DineIn',
      amount: 2339800,
      payment_method: 'Kasir POS',
      cashier: 'Kasir POS',
      notes: '-',
      status: 'Selesai',
      source: '📱 By POS',
      ref_pelanggan: 'POS-210726-44',
      gudang: 'GUDANG RUMAH PRODUKSI',
      items: [
        { name: 'AYAM BAKAR / SAMBAL PENYET', sku: '000987', qty: 30, unit: 'PORSI', price_unit: 35000, amount: 1050000 },
        { name: 'IKAN NILA / SAMBAL PENYET', sku: '000855', qty: 30, unit: 'PORSI', price_unit: 35000, amount: 1050000 },
        { name: 'NASI PUTIH', sku: '000827', qty: 48, unit: 'PORSI', price_unit: 5000, amount: 239800 }
      ]
    },
    {
      id: '002543',
      date: '21/07/2026',
      time: '18:10',
      type: 'Invoice Penjualan',
      outlet_id: 1,
      branch_name: 'RUMAH PRODUKSI',
      customer_name: 'AYAM PECAK 2001 SEAFOOD RANTAU PRAPAT',
      order_type: 'DineIn',
      amount: 6050000,
      payment_method: 'Kasir POS',
      cashier: 'Kasir POS',
      notes: 'Pesanan rombongan',
      status: 'Selesai',
      source: '📱 By POS',
      ref_pelanggan: 'POS-210726-43',
      gudang: 'GUDANG RUMAH PRODUKSI',
      items: [
        { name: 'IKAN NILA / SAMBAL PENYET', sku: '000855', qty: 100, unit: 'PORSI', price_unit: 35000, amount: 3500000 },
        { name: 'AYAM BAKAR / SAMBAL PENYET', sku: '000987', qty: 60, unit: 'PORSI', price_unit: 35000, amount: 2100000 },
        { name: 'NASI PUTIH', sku: '000827', qty: 90, unit: 'PORSI', price_unit: 5000, amount: 450000 }
      ]
    },
    {
      id: '002540',
      date: '20/07/2026',
      time: '14:20',
      type: 'Invoice Penjualan',
      outlet_id: 1,
      branch_name: 'RUMAH PRODUKSI',
      customer_name: 'AYAM PECAK 2001 SEAFOOD TEBING TINGGI',
      order_type: 'DineIn',
      amount: 2123200,
      payment_method: 'Kasir POS',
      cashier: 'Kasir POS',
      notes: '-',
      status: 'Selesai',
      source: '📱 By POS',
      ref_pelanggan: 'POS-200726-40',
      gudang: 'GUDANG RUMAH PRODUKSI',
      items: [
        { name: 'AYAM BAKAR / SAMBAL PENYET', sku: '000987', qty: 30, unit: 'PORSI', price_unit: 35000, amount: 1050000 },
        { name: 'IKAN NILA / SAMBAL PENYET', sku: '000855', qty: 25, unit: 'PORSI', price_unit: 35000, amount: 875000 },
        { name: 'NASI PUTIH', sku: '000827', qty: 39, unit: 'PORSI', price_unit: 5000, amount: 198200 }
      ]
    },
    {
      id: '002534',
      date: '20/07/2026',
      time: '12:30',
      type: 'Invoice Penjualan',
      outlet_id: 1,
      branch_name: 'RUMAH PRODUKSI',
      customer_name: 'AYAM PECAK 2001 SEAFOOD KISARAN',
      order_type: 'DineIn',
      amount: 3757000,
      payment_method: 'Kasir POS',
      cashier: 'Kasir POS',
      notes: '-',
      status: 'Selesai',
      source: '📱 By POS',
      ref_pelanggan: 'POS-200726-34',
      gudang: 'GUDANG RUMAH PRODUKSI',
      items: [
        { name: 'IKAN NILA / SAMBAL PENYET', sku: '000855', qty: 60, unit: 'PORSI', price_unit: 35000, amount: 2100000 },
        { name: 'AYAM BAKAR / SAMBAL PENYET', sku: '000987', qty: 40, unit: 'PORSI', price_unit: 35000, amount: 1400000 },
        { name: 'NASI PUTIH', sku: '000827', qty: 51, unit: 'PORSI', price_unit: 5000, amount: 257000 }
      ]
    },
    {
      id: '002542',
      date: '19/07/2026',
      time: '20:10',
      type: 'Invoice Penjualan',
      outlet_id: 1,
      branch_name: 'RUMAH PRODUKSI',
      customer_name: 'AYAM BAKAR SURABAYA TEBING TINGGI',
      order_type: 'DineIn',
      amount: 2394100,
      payment_method: 'Kasir POS',
      cashier: 'Kasir POS',
      notes: '-',
      status: 'Selesai',
      source: '📱 By POS',
      ref_pelanggan: 'POS-190726-42',
      gudang: 'GUDANG RUMAH PRODUKSI',
      items: [
        { name: 'AYAM BAKAR / SAMBAL PENYET', sku: '000987', qty: 40, unit: 'PORSI', price_unit: 35000, amount: 1400000 },
        { name: 'IKAN NILA / SAMBAL PENYET', sku: '000855', qty: 22, unit: 'PORSI', price_unit: 35000, amount: 770000 },
        { name: 'NASI PUTIH', sku: '000827', qty: 44, unit: 'PORSI', price_unit: 5000, amount: 224100 }
      ]
    },
    {
      id: '002541',
      date: '19/07/2026',
      time: '18:50',
      type: 'Invoice Penjualan',
      outlet_id: 1,
      branch_name: 'RUMAH PRODUKSI',
      customer_name: 'AYAM PECAK 2001 SEAFOOD TEBING TINGGI',
      order_type: 'DineIn',
      amount: 2719700,
      payment_method: 'Kasir POS',
      cashier: 'Kasir POS',
      notes: '-',
      status: 'Selesai',
      source: '📱 By POS',
      ref_pelanggan: 'POS-190726-41',
      gudang: 'GUDANG RUMAH PRODUKSI',
      items: [
        { name: 'IKAN NILA / SAMBAL PENYET', sku: '000855', qty: 45, unit: 'PORSI', price_unit: 35000, amount: 1575000 },
        { name: 'AYAM BAKAR / SAMBAL PENYET', sku: '000987', qty: 25, unit: 'PORSI', price_unit: 35000, amount: 875000 },
        { name: 'NASI PUTIH', sku: '000827', qty: 53, unit: 'PORSI', price_unit: 5000, amount: 269700 }
      ]
    },
    {
      id: '049947',
      date: '23/07/2026',
      time: '23:52',
      type: 'Invoice Penjualan',
      outlet_id: 2,
      branch_name: 'PECAL LELE PAK HAJI',
      customer_name: 'Default Customer',
      order_type: 'DineIn',
      amount: 80000,
      payment_method: 'Kasir POS',
      cashier: 'KASIR PECAL LELE PAK HAJI',
      notes: '-',
      status: 'CLOSED',
      source: '📱 By POS',
      ref_pelanggan: 'POS-230726-43',
      gudang: 'GUDANG PECAL LELE PAK HAJI',
      items: [
        { name: 'AYAM BAKAR / SAMBAL PENYET', sku: '000987', qty: 1, unit: 'PORSI', price_unit: 20000, amount: 20000 },
        { name: 'IKAN NILA / SAMBAL PENYET', sku: '000855', qty: 1, unit: 'PORSI', price_unit: 35000, amount: 35000 },
        { name: 'NASI PUTIH', sku: '000827', qty: 3, unit: 'PORSI', price_unit: 5000, amount: 15000 },
        { name: 'TEH MANIS DINGIN', sku: 'BMJ-23', qty: 2, unit: 'GELAS', price_unit: 5000, amount: 10000 }
      ]
    }
  ];

  // GET SALES LIST WITH FALLBACK TO SAMPLE DATA
  const getSalesList = () => {
    const list = masterData?.salesTransactions;
    if (list && list.length > 0) return list;
    return defaultSalesList;
  };

  const transactions = getSalesList();

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
  const [itemFilter, setItemFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

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

  const handleDeleteTransaction = (id) => {
    if (window.confirm(`Apakah Anda yakin ingin menghapus transaksi penjualan ${id}?`)) {
      const updatedList = transactions.filter(t => t.id !== id);
      if (setMasterData) {
        setMasterData({
          ...masterData,
          salesTransactions: updatedList
        });
      }
    }
  };

  // FILTERING TRANSACTIONS
  const filteredTransactions = transactions.filter(item => {
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
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', background: '#0f172a', minHeight: '100vh', padding: '20px', color: '#f8fafc' }} className="animate-fade-in">
        
        {/* HEADER BAR LUNA POS INVOICE */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button 
              onClick={handleBackToList}
              style={{
                background: '#1e293b', border: '1px solid #334155', color: '#cbd5e1', padding: '8px 14px', borderRadius: '8px',
                cursor: 'pointer', fontWeight: '700', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px'
              }}
            >
              <ArrowLeft size={16} />
              <span>Kembali</span>
            </button>
            <h2 style={{ fontSize: '1.5rem', fontWeight: '800', color: '#f8fafc', margin: 0, display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span>Invoice: {inv.id}</span>
              <span style={{ background: '#ef4444', color: '#ffffff', fontSize: '0.72rem', fontWeight: '800', padding: '3px 10px', borderRadius: '12px', letterSpacing: '0.05em' }}>
                {inv.status === 'CLOSED' || inv.status === 'Selesai' ? 'CLOSED' : inv.status}
              </span>
            </h2>
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <button 
              onClick={() => window.print()} 
              style={{ background: '#1e293b', border: '1px solid #334155', color: '#cbd5e1', padding: '8px 16px', borderRadius: '8px', fontSize: '0.85rem', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Printer size={16} color="#94a3b8" />
              <span>Print</span>
              <ChevronDown size={14} />
            </button>

            <button 
              onClick={() => handleOpenEditModal(inv)}
              style={{ background: '#7e22ce', border: 'none', color: '#ffffff', padding: '8px 20px', borderRadius: '8px', fontSize: '0.85rem', fontWeight: '700', cursor: 'pointer' }}
            >
              Ubah
            </button>

            <button style={{ background: '#1e293b', border: '1px solid #334155', color: '#cbd5e1', padding: '8px 12px', borderRadius: '8px', cursor: 'pointer' }}>
              <MoreVertical size={16} />
            </button>
          </div>
        </div>

        {/* TOP SUMMARY CARD (CUSTOMER DETAIL & LARGE AMOUNT) */}
        <div style={{ background: '#1e293b', borderRadius: '12px', border: '1px solid #334155', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '20px' }}>
          {/* Customer Box */}
          <div style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', padding: '16px 20px', minWidth: '320px', flex: 1, borderTop: '4px solid #c084fc' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: '800', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <User size={16} color="#c084fc" />
              <span>Detail Customer</span>
            </div>
            <div style={{ fontSize: '1.1rem', fontWeight: '800', color: '#c084fc' }}>
              {inv.customer_name || 'Default Customer'}
            </div>
            <div style={{ display: 'flex', gap: '24px', fontSize: '0.82rem', color: '#94a3b8', marginTop: '8px' }}>
              <span>📞 -</span>
              <span>✉️ -</span>
            </div>
            <div style={{ marginTop: '8px', display: 'inline-flex', background: 'rgba(59,130,246,0.15)', color: '#60a5fa', border: '1px solid rgba(96,165,250,0.3)', padding: '2px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: '700' }}>
              💳 -
            </div>
          </div>

          {/* Amount Box */}
          <div style={{ textAlign: 'right', minWidth: '220px' }}>
            <div style={{ fontSize: '0.85rem', color: '#94a3b8', fontWeight: '700' }}>Jumlah</div>
            <div style={{ fontSize: '2rem', fontWeight: '900', color: '#f8fafc', marginTop: '2px' }}>
              {formatLunaCurrency(inv.amount)}
            </div>
          </div>
        </div>

        {/* METADATA INFORMATION GRID */}
        <div style={{ background: '#0f172a', borderRadius: '8px', padding: '20px 24px', border: '1px solid #334155', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', fontSize: '0.82rem' }}>
          {/* Left Metadata */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#94a3b8' }}>No. Invoice</span>
              <strong style={{ color: '#f8fafc' }}>#{inv.id}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#94a3b8' }}>No. Order</span>
              <span style={{ color: '#f8fafc' }}>-</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#94a3b8' }}>No. Ref Pelanggan</span>
              <strong style={{ color: '#f8fafc' }}>{inv.ref_pelanggan || `POS-${inv.id}`}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#94a3b8' }}>Tanggal</span>
              <strong style={{ color: '#f8fafc' }}>{inv.date} {inv.time || '23:52'}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#94a3b8' }}>Tanggal jatuh tempo</span>
              <span style={{ color: '#f8fafc' }}>{inv.date}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#94a3b8' }}>Harga termasuk pajak</span>
              <span style={{ color: '#f8fafc' }}>Ya</span>
            </div>
          </div>

          {/* Right Metadata */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#94a3b8' }}>Tipe Order</span>
              <strong style={{ color: '#f8fafc' }}>POS</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#94a3b8' }}>Tipe Penjualan</span>
              <strong style={{ color: '#f8fafc' }}>{inv.order_type || 'DineIn'}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#94a3b8' }}>Gudang</span>
              <strong style={{ color: '#f8fafc' }}>{inv.gudang || `GUDANG ${inv.branch_name}`}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#94a3b8' }}>Outlet</span>
              <strong style={{ color: '#f8fafc' }}>{inv.branch_name}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#94a3b8' }}>Kasir/Pelayan</span>
              <strong style={{ color: '#f8fafc' }}>{inv.cashier || `KASIR ${inv.branch_name}`}</strong>
            </div>
          </div>
        </div>

        {/* ITEMIZED PRODUCTS TABLE */}
        <div style={{ background: '#1e293b', borderRadius: '12px', border: '1px solid #334155', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: '#0f172a', borderBottom: '1px solid #334155', color: '#94a3b8', fontWeight: '700' }}>
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
                <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', color: '#f8fafc' }}>
                  <td style={{ padding: '12px 14px', color: '#94a3b8' }}>{idx + 1}</td>
                  <td style={{ padding: '12px 14px' }}>
                    <div style={{ fontWeight: '700', color: '#f8fafc' }}>{it.name}</div>
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontStyle: 'italic' }}>SKU: {it.sku || `000${idx + 800}`}</div>
                  </td>
                  <td style={{ padding: '12px 14px', color: '#94a3b8' }}>-</td>
                  <td style={{ padding: '12px 14px', color: '#cbd5e1' }}>{it.name}</td>
                  <td style={{ padding: '12px 14px', textAlign: 'center', fontWeight: '700' }}>{it.qty}</td>
                  <td style={{ padding: '12px 14px', color: '#cbd5e1', textTransform: 'uppercase' }}>{it.unit || 'PORSI'}</td>
                  <td style={{ padding: '12px 14px', textAlign: 'right' }}>{formatLunaCurrency(it.price_unit)}</td>
                  <td style={{ padding: '12px 14px', textAlign: 'center' }}>0</td>
                  <td style={{ padding: '12px 14px', textAlign: 'right' }}>0,00</td>
                  <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: '700' }}>{formatLunaCurrency(it.amount)}</td>
                </tr>
              ))}
              <tr style={{ background: '#0f172a', fontWeight: '800', color: '#f8fafc' }}>
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
            <div style={{ background: '#1e293b', padding: '16px', borderRadius: '8px', border: '1px solid #334155' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: '800', color: '#f8fafc', display: 'block', marginBottom: '6px' }}>Pesan untuk pelanggan</label>
              <div style={{ fontSize: '0.82rem', color: '#94a3b8' }}>-</div>
            </div>

            <div style={{ background: '#1e293b', padding: '16px', borderRadius: '8px', border: '1px solid #334155' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: '800', color: '#f8fafc', display: 'block', marginBottom: '6px' }}>Catatan</label>
              <div style={{ fontSize: '0.82rem', color: '#cbd5e1' }}>{inv.notes || '-'}</div>
            </div>
          </div>

          {/* Right Calculation Box */}
          <div style={{ background: '#1e293b', padding: '20px', borderRadius: '8px', border: '1px solid #334155', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.85rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#94a3b8', fontWeight: '700' }}>Subtotal</span>
              <strong style={{ color: '#f8fafc' }}>{formatLunaCurrency(inv.amount)}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#94a3b8' }}>Diskon (Rp)</span>
              <span style={{ color: '#cbd5e1' }}>0</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#94a3b8' }}>Service charge</span>
              <span style={{ color: '#cbd5e1' }}>0,00</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#94a3b8' }}>Pajak</span>
              <span style={{ color: '#cbd5e1' }}>0,00</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#94a3b8' }}>Penyesuaian</span>
              <span style={{ color: '#cbd5e1' }}>0,00</span>
            </div>

            <div style={{ borderTop: '1px dashed #334155', margin: '8px 0' }}></div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.2rem', fontWeight: '900', color: '#f8fafc' }}>
              <span>Total</span>
              <span>{formatLunaCurrency(inv.amount)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.05rem', fontWeight: '800', color: '#c084fc' }}>
              <span>Dibayar</span>
              <span>{formatLunaCurrency(inv.amount)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1rem', fontWeight: '800', color: '#34d399' }}>
              <span>Sisa Tagihan</span>
              <span>LUNAS</span>
            </div>
          </div>
        </div>

        {/* BOTTOM PAYMENT INFO */}
        <div style={{ background: '#1e293b', borderRadius: '8px', padding: '16px', border: '1px solid #334155', fontSize: '0.85rem', fontWeight: '800', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', background: '#0f172a', padding: '20px', borderRadius: '16px', color: '#f8fafc', minHeight: '88vh' }} className="animate-fade-in">
      
      {/* 1. HEADER ROW WITH TITLE & "+ TAMBAH BARU" BUTTON */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <h1 style={{ fontSize: '1.8rem', fontWeight: '800', color: '#f8fafc', margin: 0 }}>
            Penjualan
          </h1>

          {/* STATUS PRESET DROPDOWN */}
          <div style={{ position: 'relative' }}>
            <select
              value={statusFilterPreset}
              onChange={e => setStatusFilterPreset(e.target.value)}
              style={{
                background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', padding: '6px 32px 6px 14px',
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
              background: '#1e293b', 
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
      <div style={{ background: '#1e293b', padding: '16px', borderRadius: '12px', border: '1px solid #334155', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '12px', position: 'relative', zIndex: 100 }}>
        
        {/* Search Bar Input */}
        <div style={{ width: '240px', position: 'relative' }}>
          <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
          <input 
            type="text" 
            placeholder="Cari penjualan" 
            value={searchQuery} 
            onChange={e => setSearchQuery(e.target.value)} 
            style={{ paddingLeft: '36px', height: '38px', fontSize: '0.85rem', width: '100%', border: '1px solid #334155', borderRadius: '6px', background: '#0f172a', color: '#f8fafc' }} 
          />
        </div>

        {/* Date Range Picker Input */}
        <div style={{ width: '220px' }}>
          <input 
            type="text" 
            value={dateRangeText} 
            onChange={e => setDateRangeText(e.target.value)}
            style={{ height: '38px', fontSize: '0.85rem', width: '100%', border: '1px solid #334155', borderRadius: '6px', padding: '0 12px', color: '#cbd5e1', fontWeight: '500', background: '#0f172a' }} 
          />
        </div>

        {/* Outlet Selector Dropdown */}
        <div style={{ width: '200px' }}>
          <select 
            value={outletFilter} 
            onChange={e => setOutletFilter(e.target.value)} 
            style={{ height: '38px', fontSize: '0.85rem', width: '100%', border: '1px solid #334155', borderRadius: '6px', padding: '0 12px', color: '#cbd5e1', fontWeight: '500', background: '#0f172a' }}
          >
            <option value="ALL">RUMAH PRODUKSI</option>
            {outlets.map(o => (
              <option key={o.id} value={o.id}>{o.name}</option>
            ))}
          </select>
        </div>

        {/* More Filter Button */}
        <button style={{ height: '38px', padding: '0 16px', border: '1px solid #334155', background: '#0f172a', color: '#cbd5e1', borderRadius: '6px', fontSize: '0.85rem', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
          <span>More Filter</span>
          <ChevronDown size={14} />
        </button>

        {/* Control Icons */}
        <div style={{ display: 'flex', gap: '8px', marginLeft: 'auto' }}>
          <button style={{ width: '38px', height: '38px', borderRadius: '8px', border: '1px solid #334155', background: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748b' }}>
            <RefreshCw size={18} color="#64748b" />
          </button>
          <button style={{ width: '38px', height: '38px', borderRadius: '8px', border: '1px solid #334155', background: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748b' }}>
            <SlidersHorizontal size={18} color="#64748b" />
          </button>
        </div>

      </div>

      {/* 3. LUNA POS PENJUALAN TABLE MATCHING DARK THEME SYSTEM */}
      <div style={{ background: '#1e293b', borderRadius: '12px', border: '1px solid #334155', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ background: '#0f172a', borderBottom: '1px solid #334155', color: '#94a3b8', fontWeight: '600' }}>
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
                  <td colSpan={8} style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
                    Belum ada data penjualan. Klik "+ Tambah Baru" untuk membuat invoice penjualan baru.
                  </td>
                </tr>
              ) : (
                paginatedTransactions.map((item, idx) => (
                  <tr key={item.id || idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', background: '#1e293b' }}>
                    
                    {/* Tanggal */}
                    <td style={{ padding: '16px', color: '#cbd5e1' }}>
                      {item.date}
                    </td>

                    {/* Tipe */}
                    <td style={{ padding: '16px', color: '#94a3b8' }}>
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
                    <td style={{ padding: '16px', color: '#cbd5e1' }}>
                      {item.branch_name}
                    </td>

                    {/* Pelanggan (LINK TEXT PURPLE MATCHING DARK THEME) */}
                    <td style={{ padding: '16px' }}>
                      <span onClick={() => handleOpenInvoiceDetail(item)} style={{ color: '#c084fc', fontWeight: '700', cursor: 'pointer' }}>
                        {item.customer_name || 'Default Customer'}
                      </span>
                    </td>

                    {/* Total (FORMATTED WITH DECIMAL e.g. 2.424.100,00) */}
                    <td style={{ padding: '16px', textAlign: 'right', fontWeight: '600', color: '#f8fafc' }}>
                      {formatLunaCurrency(item.amount)}
                    </td>

                    {/* Status (GREEN TEXT MATCHING DARK THEME) */}
                    <td style={{ padding: '16px' }}>
                      <span style={{ color: '#34d399', fontWeight: '700' }}>
                        {item.status || 'Selesai'}
                      </span>
                    </td>

                    {/* Aksi (PURPLE UBAH BUTTON MATCHING DARK THEME) */}
                    <td style={{ padding: '16px', textAlign: 'center' }}>
                      <button 
                        onClick={() => handleOpenEditModal(item)}
                        style={{
                          background: '#7e22ce', color: '#ffffff', border: 'none', padding: '6px 18px', borderRadius: '16px',
                          fontSize: '0.78rem', fontWeight: '700', cursor: 'pointer'
                        }}
                      >
                        Ubah
                      </button>
                    </td>

                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINATION CONTROLS */}
        <div style={{ padding: '16px', background: '#1e293b', borderTop: '1px solid #334155' }}>
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
            padding: '24px', background: '#ffffff', borderRadius: '16px', boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
            color: '#1e293b'
          }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '14px', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: '800', color: '#6b21a8', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShoppingBag size={20} color="#6b21a8" />
                <span>{editingRecord ? 'Ubah Invoice Penjualan' : 'Tambah Invoice Penjualan Baru'}</span>
              </h3>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveTransaction} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.78rem', color: '#475569', fontWeight: '700', display: 'block', marginBottom: '4px' }}>Tanggal Transaksi *</label>
                  <input type="date" value={formDate} onChange={e => setFormDate(e.target.value)} required style={{ width: '100%', height: '38px', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '0 10px' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.78rem', color: '#475569', fontWeight: '700', display: 'block', marginBottom: '4px' }}>Jam Transaksi *</label>
                  <input type="time" value={formTime} onChange={e => setFormTime(e.target.value)} required style={{ width: '100%', height: '38px', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '0 10px' }} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.78rem', color: '#475569', fontWeight: '700', display: 'block', marginBottom: '4px' }}>Outlet Cabang *</label>
                  <select value={formOutletId} onChange={e => setFormOutletId(e.target.value)} style={{ width: '100%', height: '38px', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '0 10px' }}>
                    {outlets.map(o => (
                      <option key={o.id} value={o.id}>{o.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.78rem', color: '#475569', fontWeight: '700', display: 'block', marginBottom: '4px' }}>Kasir/Pelayan *</label>
                  <select value={formCashier} onChange={e => setFormCashier(e.target.value)} style={{ width: '100%', height: '38px', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '0 10px' }}>
                    {adminList.map(a => (
                      <option key={a.id} value={a.name}>{a.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.78rem', color: '#475569', fontWeight: '700', display: 'block', marginBottom: '4px' }}>Nama Pelanggan *</label>
                  <select value={formCustomerName} onChange={e => setFormCustomerName(e.target.value)} style={{ width: '100%', height: '38px', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '0 10px' }}>
                    {customerList.map(c => (
                      <option key={c.id} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.78rem', color: '#475569', fontWeight: '700', display: 'block', marginBottom: '4px' }}>Tipe Order *</label>
                  <select value={formOrderType} onChange={e => setFormOrderType(e.target.value)} style={{ width: '100%', height: '38px', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '0 10px', fontWeight: '700', color: '#6b21a8' }}>
                    <option value="DineIn">DineIn (Makan di Tempat)</option>
                    <option value="Take Away">Take Away (Bawa Pulang)</option>
                  </select>
                </div>
              </div>

              {/* Multi-Row Items */}
              <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '8px', border: '1px solid #cbd5e1', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: '800', color: '#6b21a8' }}>Rincian Produk Menu</span>
                  <span style={{ fontSize: '0.78rem', color: '#1e293b', fontWeight: '700' }}>Subtotal: {formatLunaCurrency(grandTotalStrukAmount)}</span>
                </div>

                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
                    <thead>
                      <tr style={{ color: '#475569', borderBottom: '1px solid #cbd5e1', textAlign: 'left' }}>
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
                              style={{ width: '100%', height: '32px', fontSize: '0.78rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontWeight: '600' }}
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
                              style={{ width: '100%', height: '32px', fontSize: '0.78rem', textAlign: 'center', border: '1px solid #cbd5e1', borderRadius: '6px' }} 
                            />
                          </td>
                          <td style={{ padding: '6px' }}>
                            <input 
                              type="number" 
                              value={r.price_unit} 
                              onChange={e => handleUpdateItemRow(r.id, 'price_unit', e.target.value)} 
                              style={{ width: '100%', height: '32px', fontSize: '0.78rem', textAlign: 'right', border: '1px solid #cbd5e1', borderRadius: '6px' }} 
                            />
                          </td>
                          <td style={{ padding: '6px', textAlign: 'right', fontWeight: '700', color: '#1e293b' }}>
                            {formatLunaCurrency(r.amount)}
                          </td>
                          <td style={{ padding: '6px', textAlign: 'center' }}>
                            <button type="button" onClick={() => handleRemoveItemRow(r.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}>✕</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <button 
                  type="button" 
                  onClick={handleAddBlankItemRow} 
                  style={{ alignSelf: 'flex-start', background: '#f1f5f9', border: '1px solid #cbd5e1', color: '#6b21a8', padding: '6px 12px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  <PlusCircle size={14} />
                  <span>+ Tambah Field Produk</span>
                </button>
              </div>

              <div>
                <label style={{ fontSize: '0.78rem', color: '#475569', fontWeight: '700', display: 'block', marginBottom: '4px' }}>Catatan Transaksi</label>
                <input 
                  type="text" 
                  placeholder="Contoh: Meja 04, es teh manis" 
                  value={formNotes} 
                  onChange={e => setFormNotes(e.target.value)} 
                  style={{ width: '100%', height: '38px', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '0 10px' }} 
                />
              </div>

              <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.85rem', color: '#475569', fontWeight: '700' }}>TOTAL TRANSAKSI:</span>
                <span style={{ fontSize: '1.2rem', fontWeight: '900', color: '#6b21a8' }}>{formatLunaCurrency(grandTotalStrukAmount)}</span>
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '6px' }}>
                <button type="button" onClick={() => setShowModal(false)} style={{ padding: '8px 16px', border: '1px solid #cbd5e1', borderRadius: '8px', background: '#ffffff', cursor: 'pointer', fontSize: '0.85rem' }}>
                  Batal
                </button>
                <button type="submit" style={{ padding: '8px 20px', border: 'none', borderRadius: '8px', background: '#6b21a8', color: '#ffffff', cursor: 'pointer', fontWeight: '700', fontSize: '0.85rem' }}>
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
            width: '100%', maxWidth: '440px', padding: '24px', background: '#0f172a', border: '1px solid #38bdf8', borderRadius: '20px',
            boxShadow: '0 20px 50px rgba(0,0,0,0.8)'
          }}>
            {/* Header Modal */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #334155', paddingBottom: '12px', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: '900', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Receipt size={22} color="#38bdf8" />
                <span>Pratinjau Struk Nota POS Kasir</span>
              </h3>
              <button onClick={() => setPreviewRecord(null)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                <X size={22} />
              </button>
            </div>

            {/* Thermal Struk Card Visual */}
            <div style={{
              background: '#1e293b',
              border: '1px dashed #334155',
              borderRadius: '12px',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
              fontFamily: 'monospace'
            }}>
              
              {/* Resto Branding Header */}
              <div style={{ textAlign: 'center', borderBottom: '1px dashed #334155', paddingBottom: '12px' }}>
                <div style={{ fontSize: '1.15rem', fontWeight: '900', color: '#f8fafc', letterSpacing: '0.05em' }}>MRIS RESTO POS</div>
                <div style={{ fontSize: '0.78rem', color: '#38bdf8', marginTop: '2px', fontWeight: '700' }}>🏢 {previewRecord.branch_name}</div>
                <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '2px' }}>Terhubung Realtime Kasir System</div>
              </div>

              {/* Transaction Metadata */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.78rem', color: '#cbd5e1' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#94a3b8' }}>No Struk:</span>
                  <strong style={{ color: '#38bdf8' }}>{previewRecord.id}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#94a3b8' }}>Waktu:</span>
                  <span>📅 {previewRecord.date} {previewRecord.time ? `(${previewRecord.time})` : ''}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#94a3b8' }}>Pelanggan:</span>
                  <span style={{ fontWeight: '700', color: '#f8fafc' }}>👤 {previewRecord.customer_name || 'Pelanggan Umum'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#94a3b8' }}>Layanan:</span>
                  <strong style={{ color: previewRecord.order_type === 'Take Away' ? '#fbbf24' : '#38bdf8' }}>
                    {previewRecord.order_type === 'Take Away' ? '🛍️ Take Away' : '🍽️ Dine In'}
                  </strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#94a3b8' }}>Kasir POS:</span>
                  <span>👤 {previewRecord.cashier}</span>
                </div>
              </div>

              {/* Rincian Item Produk Menu */}
              <div style={{ borderTop: '1px dashed #334155', borderBottom: '1px dashed #334155', padding: '10px 0', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: '800', display: 'flex', justifyContent: 'space-between' }}>
                  <span>ITEM PESANAN</span>
                  <span>SUBTOTAL</span>
                </div>

                {(previewRecord.items && previewRecord.items.length > 0 ? previewRecord.items : [
                  { name: previewRecord.item_name || 'Nasi Goreng Spesial', qty: previewRecord.qty || 1, price_unit: previewRecord.price_unit || 35000, amount: previewRecord.amount || 35000 }
                ]).map((it, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#f8fafc' }}>
                    <div>
                      <div style={{ fontWeight: '700' }}>• {it.name}</div>
                      <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>{it.qty}x @ {formatRupiah(it.price_unit)}</div>
                    </div>
                    <div style={{ fontWeight: '800', color: '#cbd5e1' }}>{formatRupiah(it.amount || (it.qty * it.price_unit))}</div>
                  </div>
                ))}
              </div>

              {/* Payment Summary */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.8rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8' }}>
                  <span>Metode Pembayaran:</span>
                  <strong style={{ color: '#f8fafc' }}>💳 {previewRecord.payment_method}</strong>
                </div>

                {previewRecord.notes && (
                  <div style={{ color: '#fbbf24', fontSize: '0.75rem', fontStyle: 'italic', marginTop: '2px' }}>
                    Catatan: "{previewRecord.notes}"
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.15rem', fontWeight: '900', color: '#34d399', marginTop: '8px', borderTop: '1px dashed #334155', paddingTop: '8px' }}>
                  <span>TOTAL STRUK:</span>
                  <span>{formatRupiah(previewRecord.amount)}</span>
                </div>
              </div>

              {/* Footer Struk */}
              <div style={{ textAlign: 'center', fontSize: '0.7rem', color: '#64748b', marginTop: '4px' }}>
                *** Terima Kasih Atas Kunjungan Anda ***<br />
                Simpan Struk Sebagai Bukti Pembayaran Sah
              </div>

            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
              <button onClick={() => window.print()} className="btn-secondary" style={{ flex: 1, justifyContent: 'center', borderColor: '#38bdf8', color: '#38bdf8', borderRadius: '8px' }}>
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
