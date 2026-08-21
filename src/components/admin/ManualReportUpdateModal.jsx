import React, { useState, useMemo } from 'react';
import { 
  X, 
  FileSpreadsheet, 
  Plus, 
  Trash2, 
  Download, 
  Upload, 
  CheckCircle2, 
  AlertCircle, 
  FileUp, 
  RefreshCw, 
  DollarSign, 
  ShoppingBag, 
  TrendingUp, 
  TrendingDown, 
  Layers, 
  PackageCheck,
  Building2,
  Calendar,
  User,
  Info,
  Sparkles
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { getThemePalette } from '../../utils/themeUtils';

export default function ManualReportUpdateModal({ 
  show, 
  onClose, 
  masterData, 
  setMasterData, 
  userSession, 
  themeMode = 'dark',
  editData = null,
  initialEntryType = null,
  onOpenSalesImport,
  onOpenExpenseImport
}) {
  if (!show) return null;

  const T = getThemePalette(themeMode);
  const isLight = themeMode === 'light';
  const isEditMode = !!editData;

  // Active Tab ('manual' | 'excel' | 'import_sales' | 'import_expenses')
  const [activeTab, setActiveTab] = useState('manual');
  const [entryType, setEntryType] = useState(() => {
    if (initialEntryType) return initialEntryType;
    if (editData) {
      if ((editData.sales_details || []).length > 0) return 'penjualan';
      if ((editData.pembelian_details || []).length > 0) return 'pembelian';
      if ((editData.pendapatan_details || []).length > 0) return 'pendapatan';
      return 'pengeluaran';
    }
    return 'penjualan';
  });

  // Header Common States
  const [reportDate, setReportDate] = useState(() => {
    if (editData) return editData.entry_date || editData.date || new Date().toISOString().split('T')[0];
    return new Date().toISOString().split('T')[0];
  });
  const [selectedOutletId, setSelectedOutletId] = useState(() => {
    if (editData) return editData.outlet_id || masterData?.outlets?.[0]?.id || 1;
    return masterData?.outlets?.[0]?.id || 1;
  });
  const [authorName, setAuthorName] = useState(() => userSession?.name || userSession?.username || 'Super Admin');

  // Ringkasan Status Data Terinput / Terimpor Tanggal Terpilih
  const dateStatusSummary = useMemo(() => {
    const currentOutletIdStr = String(selectedOutletId);
    const curDateStr = String(reportDate);

    // 1. Sales Data
    const allSales = [...(masterData?.salesTransactions || []), ...(masterData?.transactions || []).filter(t => t.type === 'income')];
    const matchingSales = allSales.filter(tx => {
      const bId = String(tx.outlet_id || tx.branch_id || tx.branchId || '');
      const dStr = String(tx.date || tx.entry_date || tx.created_at || '').substring(0, 10);
      return (bId === currentOutletIdStr || !currentOutletIdStr) && dStr === curDateStr;
    });

    const totalSalesOmzet = matchingSales.reduce((sum, tx) => sum + Number(tx.amount || tx.final_amount || tx.total || 0), 0);
    const importedSalesCount = matchingSales.filter(tx => tx.source?.includes('import') || (tx.notes || '').toLowerCase().includes('impor') || (tx.receipt_no || '').startsWith('IMP-')).length;

    // 2. Expense & Purchasing Data
    const allExpenses = [...(masterData?.transactions || []).filter(t => t.type === 'expense'), ...(masterData?.cogsExpenses || [])];
    const matchingExpenses = allExpenses.filter(tx => {
      const bId = String(tx.outlet_id || tx.branch_id || tx.branchId || '');
      const dStr = String(tx.date || tx.entry_date || tx.created_at || '').substring(0, 10);
      return (bId === currentOutletIdStr || !currentOutletIdStr) && dStr === curDateStr;
    });

    const totalExpenseAmount = matchingExpenses.reduce((sum, tx) => sum + Number(tx.amount || tx.subtotal || 0), 0);
    const importedExpenseCount = matchingExpenses.filter(tx => (tx.notes || '').toLowerCase().includes('impor') || tx.created_by?.includes('Impor') || (tx.receipt_no || '').startsWith('EXP-')).length;

    return {
      salesCount: matchingSales.length,
      salesOmzet: totalSalesOmzet,
      importedSalesCount,
      expenseCount: matchingExpenses.length,
      expenseAmount: totalExpenseAmount,
      importedExpenseCount
    };
  }, [masterData, selectedOutletId, reportDate]);

  // Filter hanya produk & bahan baku yang AKTIF (menu inaktif dihilangkan dari dropdown)
  const activeProducts = useMemo(() => {
    return (masterData?.products || []).filter(p => {
      const s = String(p.status || 'Aktif').toLowerCase().trim();
      return s !== 'inaktif' && s !== 'inactive' && s !== 'non-aktif' && p.is_active !== false && p.is_active !== 0;
    });
  }, [masterData?.products]);

  const activeIngredients = useMemo(() => {
    return (masterData?.ingredients || []).filter(i => {
      const s = String(i.status || 'Aktif').toLowerCase().trim();
      return s !== 'inaktif' && s !== 'inactive' && s !== 'non-aktif' && i.is_active !== false && i.is_active !== 0;
    });
  }, [masterData?.ingredients]);

  // Manual Form - Sales Items State
  const [salesItems, setSalesItems] = useState(() => {
    if (editData && (editData.sales_details || []).length > 0) {
      return editData.sales_details.map((s, i) => {
        const q = Number(s.qty || 1);
        const sub = Number(s.subtotal || s.amount || 0);
        const p = Number(s.price || s.unit_price || s.harga_satuan || (sub > 0 && q > 0 ? sub / q : 0));
        return {
          id: i + 1,
          productId: s.product_id || '',
          productName: s.product_name || s.name || '',
          qty: q,
          price: p,
          subtotal: sub || (q * p),
          paymentMethod: 'Kas Kasir (Tunai)'
        };
      });
    }
    const defaultActiveProd = (masterData?.products || []).find(p => {
      const s = String(p.status || 'Aktif').toLowerCase().trim();
      return s !== 'inaktif' && s !== 'inactive' && s !== 'non-aktif' && p.is_active !== false && p.is_active !== 0;
    }) || masterData?.products?.[0];

    return [{
      id: 1,
      productId: defaultActiveProd?.id || '',
      productName: defaultActiveProd?.name || '',
      qty: 1,
      price: defaultActiveProd?.price || 25000,
      subtotal: defaultActiveProd?.price || 25000,
      paymentMethod: 'Kas Kasir (Tunai)'
    }];
  });

  // Manual Form - Expense Items State
  const [expenseItems, setExpenseItems] = useState(() => {
    if (editData && (editData.expense_details || editData.expenses_breakdown || []).length > 0) {
      const srcList = editData.expense_details || editData.expenses_breakdown || [];
      return srcList.map((e, i) => ({
        id: i + 1,
        accountCode: e.code || e.accountCode || '6001',
        categoryName: e.name || e.categoryName || e.category || '',
        notes: e.notes || '',
        amount: e.amount || e.subtotal || 0,
        paymentSource: 'Kas Kasir (Tunai)'
      }));
    }
    return [{
      id: 1,
      accountCode: '6001',
      categoryName: 'Beban Gaji & Operasional',
      notes: 'Pembelian Biaya Operasional Dapur',
      amount: 50000,
      paymentSource: 'Kas Kasir (Tunai)'
    }];
  });

  // Manual Form - Pembelian (Belanja Stok & Bahan Baku) State
  const [pembelianItems, setPembelianItems] = useState(() => {
    if (editData && (editData.pembelian_details || []).length > 0) {
      return editData.pembelian_details.map((p, i) => ({
        id: i + 1,
        ingredientId: p.ingredient_id || '',
        ingredientName: p.ingredient_name || p.name || '',
        qty: Number(p.qty || 1),
        unit: p.unit || 'Kg',
        unitPrice: Number(p.unit_price || p.price || 0),
        subtotal: Number(p.subtotal || p.amount || 0),
        supplierName: p.supplier_name || p.notes || ''
      }));
    }
    const defaultIng = masterData?.ingredients?.[0];
    return [{
      id: 1,
      ingredientId: defaultIng?.id || '',
      ingredientName: defaultIng?.name || 'Ayam Fillet / Daging',
      qty: 10,
      unit: defaultIng?.unit || 'Kg',
      unitPrice: defaultIng?.unit_price || 35000,
      subtotal: 10 * (defaultIng?.unit_price || 35000),
      supplierName: 'Pasar Utama'
    }];
  });

  // Manual Form - Pendapatan (Kas Masuk Non-Sales) State
  const [pendapatanItems, setPendapatanItems] = useState(() => {
    if (editData && (editData.pendapatan_details || []).length > 0) {
      return editData.pendapatan_details.map((p, i) => ({
        id: i + 1,
        categoryName: p.categoryName || p.category || p.name || '',
        amount: Number(p.amount || p.subtotal || 0),
        paymentMethod: p.paymentMethod || p.payment_method || 'Kas Kasir (Tunai)',
        notes: p.notes || ''
      }));
    }
    return [{
      id: 1,
      categoryName: 'Pendapatan Sewa Lapak / Non-Sales',
      amount: 1500000,
      paymentMethod: 'Kas Kasir (Tunai)',
      notes: 'Pemasukan kas masuk bulan ini'
    }];
  });

  // Handlers for Pembelian Rows
  const handleAddPembelianRow = () => {
    const defaultIng = masterData?.ingredients?.[0];
    setPembelianItems(prev => [
      ...prev,
      {
        id: Date.now(),
        ingredientId: defaultIng?.id || '',
        ingredientName: defaultIng?.name || '',
        qty: 1,
        unit: defaultIng?.unit || 'Kg',
        unitPrice: defaultIng?.unit_price || 10000,
        subtotal: 10000,
        supplierName: ''
      }
    ]);
  };

  const handleUpdatePembelianRow = (id, field, val) => {
    setPembelianItems(prev => prev.map(row => {
      if (row.id !== id) return row;
      const updated = { ...row, [field]: val };
      if (field === 'ingredientName') {
        const matchedIng = (masterData?.ingredients || []).find(ing => ing.name.toLowerCase() === String(val).toLowerCase());
        if (matchedIng) {
          updated.ingredientId = matchedIng.id;
          updated.unit = matchedIng.unit || updated.unit;
          if (matchedIng.unit_price) {
            updated.unitPrice = matchedIng.unit_price;
            updated.subtotal = Number(updated.qty || 1) * Number(matchedIng.unit_price);
          }
        }
      }
      if (field === 'qty' || field === 'unitPrice') {
        const q = Number(field === 'qty' ? val : updated.qty) || 0;
        const p = Number(field === 'unitPrice' ? val : updated.unitPrice) || 0;
        updated.subtotal = q * p;
      }
      return updated;
    }));
  };

  const handleRemovePembelianRow = (id) => {
    if (pembelianItems.length <= 1) return;
    setPembelianItems(prev => prev.filter(r => r.id !== id));
  };

  // Handlers for Pendapatan Rows
  const handleAddPendapatanRow = () => {
    setPendapatanItems(prev => [
      ...prev,
      {
        id: Date.now(),
        categoryName: 'Pendapatan Lain-Lain',
        amount: 100000,
        paymentMethod: 'Kas Kasir (Tunai)',
        notes: ''
      }
    ]);
  };

  const handleUpdatePendapatanRow = (id, field, val) => {
    setPendapatanItems(prev => prev.map(row => (row.id === id ? { ...row, [field]: val } : row)));
  };

  const handleRemovePendapatanRow = (id) => {
    if (pendapatanItems.length <= 1) return;
    setPendapatanItems(prev => prev.filter(r => r.id !== id));
  };

  // Excel Upload States
  const [uploadStep, setUploadStep] = useState('select'); // 'select' | 'preview'
  const [parsedRows, setParsedRows] = useState([]);
  const [fileName, setFileName] = useState('');
  const [uploadError, setUploadError] = useState('');
  const [isDragging, setIsDragging] = useState(false);

  // Helper: Find Outlet Name
  const getOutletName = (id) => {
    const otl = (masterData?.outlets || []).find(o => String(o.id) === String(id));
    return otl ? otl.name : `Outlet #${id}`;
  };

  // --- DEDUPLICATION & AUTO-CODE GENERATOR HELPERS ---

  const generateNextExpenseCode = (customAccountsList = null) => {
    const list = customAccountsList || (masterData?.chartOfAccounts || []);
    const codes = list
      .map(c => String(c.code || '').trim())
      .filter(code => code.startsWith('6') && !isNaN(parseInt(code, 10)));
    
    if (codes.length === 0) return '6001';
    const nums = codes.map(c => parseInt(c, 10));
    const maxNum = Math.max(...nums, 6000);
    return String(maxNum + 1);
  };

  const generateNextProductSku = (customProductsList = null) => {
    const list = customProductsList || (masterData?.products || []);
    const skus = list
      .map(p => String(p.sku || '').trim())
      .filter(sku => sku.startsWith('PRD-'));
    
    if (skus.length === 0) return 'PRD-001';
    const nums = skus.map(s => {
      const numPart = s.replace('PRD-', '');
      return parseInt(numPart, 10) || 0;
    });
    const maxNum = Math.max(...nums, 0);
    return `PRD-${String(maxNum + 1).padStart(3, '0')}`;
  };

  const normalizeText = (text) => {
    if (!text) return '';
    return String(text)
      .toLowerCase()
      .replace(/\b(biaya|beban|pembelian|pengeluaran|operasional|pembayaran|biaya-biaya)\b/gi, '')
      .replace(/[^a-z0-9]/g, '')
      .trim();
  };

  const calculateSimilarity = (str1, str2) => {
    const norm1 = normalizeText(str1);
    const norm2 = normalizeText(str2);
    if (norm1 === norm2) return 1.0;
    if (!norm1 || !norm2) return 0.0;

    if (norm1.includes(norm2) || norm2.includes(norm1)) {
      const minLen = Math.min(norm1.length, norm2.length);
      const maxLen = Math.max(norm1.length, norm2.length);
      if (minLen / maxLen >= 0.55) return 0.88;
    }

    const set1 = new Set(norm1.split(''));
    const set2 = new Set(norm2.split(''));
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);
    return intersection.size / union.size;
  };

  const findMatchingExpenseAccount = (nameOrCode, customList = null) => {
    if (!nameOrCode) return null;
    const list = customList || (masterData?.chartOfAccounts || []);
    const rawClean = String(nameOrCode).toLowerCase().trim();
    const normInput = normalizeText(nameOrCode);

    let match = list.find(c => {
      const cleanCode = String(c.code || '').toLowerCase().trim();
      const cleanName = String(c.name || '').toLowerCase().trim();
      return cleanCode === rawClean || cleanName === rawClean;
    });
    if (match) return match;

    match = list.find(c => {
      const normName = normalizeText(c.name);
      return normName && normInput && normName === normInput;
    });
    if (match) return match;

    let bestMatch = null;
    let highestScore = 0;
    list.forEach(c => {
      const score = calculateSimilarity(nameOrCode, c.name);
      if (score > highestScore && score >= 0.8) {
        highestScore = score;
        bestMatch = c;
      }
    });

    return bestMatch;
  };

  const findMatchingProduct = (nameOrSku, customList = null) => {
    if (!nameOrSku) return null;
    const list = customList || (masterData?.products || []);
    const rawClean = String(nameOrSku).toLowerCase().trim();
    const normInput = normalizeText(nameOrSku);

    let match = list.find(p => {
      const cleanSku = String(p.sku || '').toLowerCase().trim();
      const cleanName = String(p.name || '').toLowerCase().trim();
      return cleanSku === rawClean || cleanName === rawClean;
    });
    if (match) return match;

    match = list.find(p => {
      const normName = normalizeText(p.name);
      return normName && normInput && normName === normInput;
    });
    if (match) return match;

    let bestMatch = null;
    let highestScore = 0;
    list.forEach(p => {
      const score = calculateSimilarity(nameOrSku, p.name);
      if (score > highestScore && score >= 0.85) {
        highestScore = score;
        bestMatch = p;
      }
    });

    return bestMatch;
  };

  // --- EXCEL PREVIEW ROW DELETION HANDLER ---
  const handleRemoveParsedRow = (tempId) => {
    setParsedRows(prev => prev.filter(r => r.tempId !== tempId));
  };

  // --- MANUAL FORM HANDLERS ---
  const handleAddSalesRow = () => {
    const firstProd = activeProducts?.[0] || masterData?.products?.[0] || null;
    const price = firstProd ? (firstProd.price || 0) : 0;
    setSalesItems([
      ...salesItems,
      {
        id: Date.now() + Math.random(),
        productName: firstProd ? firstProd.name : '',
        qty: 1,
        price: price,
        subtotal: price,
        paymentMethod: 'Kas Kasir (Tunai)'
      }
    ]);
  };

  const handleFetchFromPosTransactions = () => {
    const allSales = masterData?.salesTransactions || masterData?.recentTransactions || [];
    const matchingTx = allSales.filter(tx => {
      const matchBranch = String(tx.outlet_id || tx.branchId || '') === String(selectedOutletId);
      const matchDate = (tx.date || '').startsWith(reportDate) || (tx.timestamp && new Date(tx.timestamp).toISOString().startsWith(reportDate));
      return matchBranch && matchDate;
    });

    if (matchingTx.length === 0) {
      alert(`Tidak ditemukan transaksi POS kasir untuk outlet & tanggal ${reportDate}. Pastikan kasir telah melakukan transaksi di aplikasi POS.`);
      return;
    }

    const itemMap = new Map();
    matchingTx.forEach(tx => {
      const items = tx.items || [];
      if (items.length > 0) {
        items.forEach(it => {
          const key = it.productId || it.id || it.name || it.productName;
          const name = it.name || it.productName || 'Menu POS';
          const qty = Number(it.qty || it.quantity || 1);
          const price = Number(it.price || it.unitPrice || 0);
          const subtotal = Number(it.subtotal || (qty * price) || 0);

          if (itemMap.has(key)) {
            const existing = itemMap.get(key);
            existing.qty += qty;
            existing.subtotal += subtotal;
          } else {
            itemMap.set(key, {
              id: Date.now() + Math.random(),
              productId: it.productId || it.id || '',
              productName: name,
              qty: qty,
              price: price,
              subtotal: subtotal,
              paymentMethod: tx.paymentMethod || 'Kas Kasir (Tunai)'
            });
          }
        });
      } else if (tx.totalAmount || tx.grandTotal || tx.amount) {
        const key = `tx-${tx.id || Math.random()}`;
        const total = Number(tx.totalAmount || tx.grandTotal || tx.amount || 0);
        itemMap.set(key, {
          id: Date.now() + Math.random(),
          productId: '',
          productName: `Penjualan POS #${tx.receiptNumber || tx.id || 'TX'}`,
          qty: 1,
          price: total,
          subtotal: total,
          paymentMethod: tx.paymentMethod || 'Kas Kasir (Tunai)'
        });
      }
    });

    const populatedItems = Array.from(itemMap.values());
    if (populatedItems.length > 0) {
      setSalesItems(populatedItems);
      setEntryType('penjualan');
      const totalOmzet = populatedItems.reduce((acc, it) => acc + (it.subtotal || 0), 0);
      alert(`Berhasil menarik ${matchingTx.length} transaksi POS kasir (${populatedItems.length} item menu) dengan total omzet ${new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(totalOmzet)}!`);
    }
  };

  const handleRemoveSalesRow = (id) => {
    if (salesItems.length === 1) return;
    setSalesItems(salesItems.filter(item => item.id !== id));
  };

  const handleUpdateSalesRow = (id, field, val) => {
    setSalesItems(salesItems.map(item => {
      if (item.id === id) {
        if (field === 'productName') {
          const matchedProd = findMatchingProduct(val);
          const newPrice = matchedProd ? (matchedProd.price || 0) : item.price;
          const newQty = item.qty || 1;
          return {
            ...item,
            productName: val,
            price: newPrice,
            subtotal: newQty * newPrice
          };
        }
        if (field === 'qty') {
          const q = parseFloat(val) || 0;
          return { ...item, qty: q, subtotal: q * (item.price || 0) };
        }
        if (field === 'price') {
          const pr = parseFloat(val) || 0;
          return { ...item, price: pr, subtotal: (item.qty || 1) * pr };
        }
        return { ...item, [field]: val };
      }
      return item;
    }));
  };

  const handleAddExpenseRow = () => {
    setExpenseItems([
      ...expenseItems,
      {
        id: Date.now() + Math.random(),
        categoryName: '',
        notes: '',
        amount: 50000,
        paymentSource: 'Kas Kasir (Tunai)'
      }
    ]);
  };

  const handleRemoveExpenseRow = (id) => {
    if (expenseItems.length === 1) return;
    setExpenseItems(expenseItems.filter(item => item.id !== id));
  };

  const handleUpdateExpenseRow = (id, field, val) => {
    setExpenseItems(expenseItems.map(item => {
      if (item.id === id) {
        if (field === 'amount') {
          return { ...item, amount: parseFloat(val) || 0 };
        }
        return { ...item, [field]: val };
      }
      return item;
    }));
  };

  // --- EXCEL TEMPLATE GENERATOR WITH ALL 4 TYPES ---
  const handleDownloadTemplate = () => {
    const sampleRows = [
      {
        'Tipe Laporan': 'Penjualan',
        'Tanggal': '10 April 2026',
        'Nama Outlet': 'Ayam Bakar Surabaya Tebing Tinggi',
        'Nama Produk / Kode Biaya / Pendapatan': 'Ayam Bakar Paket Jumbo',
        'Qty': 10,
        'Harga Satuan': 25000,
        'Total Harga': 250000,
        'Metode Pembayaran': 'Kas Kasir (Tunai)',
        'Catatan': 'Penjualan Makan di Tempat'
      },
      {
        'Tipe Laporan': 'Pengeluaran',
        'Tanggal': '10 April 2026',
        'Nama Outlet': 'Ayam Bakar Surabaya Tebing Tinggi',
        'Nama Produk / Kode Biaya / Pendapatan': 'Gas LPG 12kg',
        'Qty': 2,
        'Harga Satuan': 150000,
        'Total Harga': 300000,
        'Metode Pembayaran': 'Kas Kasir (Tunai)',
        'Catatan': 'Pembelian gas dapur'
      },
      {
        'Tipe Laporan': 'Pemasukan / Pendapatan',
        'Tanggal': '11 April 2026',
        'Nama Outlet': 'Ayam Pecak 2001 Seafood Tebing Tinggi',
        'Nama Produk / Kode Biaya / Pendapatan': 'Pendapatan Sewa Lapak Depan',
        'Qty': 1,
        'Harga Satuan': 1500000,
        'Total Harga': 1500000,
        'Metode Pembayaran': 'Bank Transfer',
        'Catatan': 'Uang sewa bulan ini'
      },
      {
        'Tipe Laporan': 'Pembelian Stok',
        'Tanggal': '12 April 2026',
        'Nama Outlet': 'Ayam Bakar Surabaya Tebing Tinggi',
        'Nama Produk / Kode Biaya / Pendapatan': 'Daging Ayam Fillet',
        'Qty': 20,
        'Harga Satuan': 35000,
        'Total Harga': 700000,
        'Metode Pembayaran': 'Kas Kasir (Tunai)',
        'Catatan': 'Stok bahan baku dari pasar'
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(sampleRows);
    worksheet['!cols'] = [
      { wch: 22 }, // Tipe Laporan
      { wch: 16 }, // Tanggal
      { wch: 40 }, // Nama Outlet
      { wch: 36 }, // Nama Item
      { wch: 8 },  // Qty
      { wch: 16 }, // Harga Satuan
      { wch: 18 }, // Total Harga
      { wch: 22 }, // Metode
      { wch: 30 }  // Catatan
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Update Laporan Transaksi');
    XLSX.writeFile(workbook, `Template_Update_Laporan_MRIS_${reportDate}.xlsx`);
  };

  const parseIndonesianDate = (strVal, fallbackDate) => {
    if (!strVal || String(strVal).trim() === '') return fallbackDate;
    const s = String(strVal).trim().toLowerCase();

    const monthMap = {
      jan: '01', januari: '01', january: '01',
      feb: '02', februari: '02', february: '02',
      mar: '03', maret: '03', march: '03',
      apr: '04', april: '04',
      mei: '05', may: '05',
      jun: '06', juni: '06', june: '06',
      jul: '07', juli: '07', july: '07',
      agu: '08', agustus: '08', august: '08', ags: '08',
      sep: '09', september: '09',
      okt: '10', oktober: '10', october: '10',
      nov: '11', november: '11',
      des: '12', desember: '12', december: '12'
    };

    const spaceParts = s.split(/\s+/);
    if (spaceParts.length === 3) {
      const day = spaceParts[0].padStart(2, '0');
      const mStr = monthMap[spaceParts[1]];
      const year = spaceParts[2];
      if (mStr && !isNaN(Number(day)) && !isNaN(Number(year))) {
        return `${year}-${mStr}-${day}`;
      }
    }

    const parts = s.split(/[\/\-\.]/);
    if (parts.length === 3) {
      if (parts[0].length === 4) {
        return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
      } else if (parts[2].length === 4) {
        return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
      }
    }

    return s;
  };

  // --- ENHANCED EXCEL FILE PARSER WITH FULL MASUK (PENDAPATAN) SUPPORT ---
  const processUploadedFile = (file) => {
    if (!file) return;
    setFileName(file.name);
    setUploadError('');

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const rawJson = XLSX.utils.sheet_to_json(firstSheet, { defval: '' });

        if (!rawJson || rawJson.length === 0) {
          setUploadError('File Excel/CSV kosong atau format tidak sesuai.');
          return;
        }

        const parsed = rawJson.map((row, idx) => {
          const rawDateStr = String(row['Tanggal'] || row['date'] || '').trim();
          let dateVal = reportDate;
          if (rawDateStr) {
            if (!isNaN(Number(rawDateStr)) && Number(rawDateStr) > 30000) {
              const excelDate = new Date(Math.round((Number(rawDateStr) - 25569) * 86400 * 1000));
              dateVal = excelDate.toISOString().split('T')[0];
            } else {
              dateVal = parseIndonesianDate(rawDateStr, reportDate);
            }
          }

          const outletVal = String(row['Nama Outlet'] || row['Outlet'] || row['Restoran'] || getOutletName(selectedOutletId)).trim();
          
          const matchedOutletObj = (masterData?.outlets || []).find(o => 
            String(o.name).toLowerCase().trim() === outletVal.toLowerCase().trim() ||
            outletVal.toLowerCase().includes(String(o.name).toLowerCase().trim()) ||
            String(o.id) === outletVal
          );
          const matchedOutletId = matchedOutletObj ? matchedOutletObj.id : selectedOutletId;
          const matchedOutletName = matchedOutletObj ? matchedOutletObj.name : outletVal;

          const nameOrCode = String(
            row['Nama Item'] || row['Item'] || row['Nama Produk / Kode Biaya / Pendapatan'] || row['Nama Produk / Kode Biaya'] || row['Nama Produk'] || row['Kode Biaya'] || row['Kategori Pendapatan'] || ''
          ).trim();

          const qtyVal = parseFloat(row['Qty'] || row['qty'] || row['QTY'] || row['Jumlah Qty'] || row['Jumlah'] || 1) || 1;
          const unitPriceVal = parseFloat(row['Harga Satuan'] || row['harga_satuan'] || row['Harga'] || row['HARGA SATUAN'] || row['Harga Satuan / Jumlah Rp'] || row['Harga Satuan (Rp)'] || row['Harga/Unit'] || row['Unit Price'] || row['price'] || 0) || 0;
          const rawTotalVal = parseFloat(row['Total Harga'] || row['total_harga'] || row['Total'] || row['Subtotal'] || row['SUBTOTAL'] || row['Total Rp'] || row['Total Penjualan'] || 0) || 0;

          let calculatedPrice = unitPriceVal;
          let calculatedTotal = rawTotalVal;

          if (calculatedTotal > 0 && calculatedPrice === 0 && qtyVal > 0) {
            calculatedPrice = calculatedTotal / qtyVal;
          } else if (calculatedPrice > 0 && calculatedTotal === 0) {
            calculatedTotal = qtyVal * calculatedPrice;
          }

          const paymentVal = String(row['Metode Pembayaran'] || row['Metode'] || 'Kas Kasir (Tunai)').trim();
          const notesVal = String(row['Catatan'] || row['Keterangan'] || '').trim();

          // 4-Way Type Auto Detection:
          let typeRaw = String(row['Tipe Laporan'] || row['Tipe'] || row['type'] || row['Jenis Transaksi'] || row['Status Kas'] || '').trim().toLowerCase();
          let itemType = 'pengeluaran'; // default

          if (typeRaw) {
            if (typeRaw.includes('jual') || typeRaw.includes('sales')) {
              itemType = 'penjualan';
            } else if (typeRaw.includes('masuk') || typeRaw.includes('pendapatan') || typeRaw.includes('pemasukan') || typeRaw.includes('income')) {
              itemType = 'pendapatan';
            } else if (typeRaw.includes('beli') || typeRaw.includes('pembelian') || typeRaw.includes('stok')) {
              itemType = 'pembelian';
            } else {
              itemType = 'pengeluaran';
            }
          } else {
            // Smart Auto-Detect from nameOrCode:
            const foundProduct = findMatchingProduct(nameOrCode);
            if (foundProduct) {
              itemType = 'penjualan';
            } else if (
              nameOrCode.toLowerCase().includes('pendapatan') ||
              nameOrCode.toLowerCase().includes('sewa') ||
              nameOrCode.toLowerCase().includes('catering') ||
              nameOrCode.toLowerCase().includes('komisi') ||
              nameOrCode.toLowerCase().includes('pemasukan') ||
              nameOrCode.toLowerCase().includes('bunga') ||
              nameOrCode.toLowerCase().includes('cash in')
            ) {
              itemType = 'pendapatan';
            } else {
              itemType = 'pengeluaran';
            }
          }

          let isValid = true;
          let validationMsg = 'Valid';
          let matchedProduct = null;
          let matchedCOA = null;

          if (!nameOrCode) {
            isValid = false;
            validationMsg = 'Nama item / kategori kosong';
          } else if (itemType === 'penjualan') {
            matchedProduct = findMatchingProduct(nameOrCode);
            if (matchedProduct) {
              validationMsg = `Produk Ada (${matchedProduct.sku})`;
            } else {
              validationMsg = `Auto-Register Produk Baru`;
            }
          } else if (itemType === 'pendapatan') {
            validationMsg = `Kas Masuk (Pendapatan Non-Sales)`;
          } else if (itemType === 'pembelian') {
            validationMsg = `Pembelian Stok (Tambah Restok)`;
          } else {
            matchedCOA = findMatchingExpenseAccount(nameOrCode);
            if (matchedCOA) {
              validationMsg = `Biaya Ada [${matchedCOA.code}]`;
            } else {
              validationMsg = `Auto-Generate Kode Biaya`;
            }
          }

          return {
            tempId: idx + 1,
            type: itemType,
            date: dateVal,
            outletId: matchedOutletId,
            outletName: matchedOutletName,
            nameOrCode,
            qty: qtyVal,
            amount: calculatedPrice,
            price: calculatedPrice,
            unit_price: calculatedPrice,
            totalSubtotal: calculatedTotal,
            paymentMethod: paymentVal,
            notes: notesVal,
            isValid,
            validationMsg,
            matchedProduct,
            matchedCOA
          };
        });

        setParsedRows(parsed);
        setUploadStep('preview');
      } catch (err) {
        console.error("Error reading Excel:", err);
        setUploadError('Gagal membaca file Excel/CSV: ' + err.message);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // --- CORE EXECUTION & CASCADING LOGIC ---
  const handleExecuteSaveReport = () => {
    let rowsToProcess = [];
    let currentAccounts = [...(masterData?.chartOfAccounts || [])];
    let currentExpenseMaster = [...(masterData?.expenseMaster || [])];
    let currentProducts = [...(masterData?.products || [])];
    let newAccountsCreatedCount = 0;
    let newProductsCreatedCount = 0;

    if (activeTab === 'manual') {
      if (entryType === 'penjualan') {
        const validSales = salesItems.filter(s => s.productName && s.productName.trim() && s.qty > 0);
        if (validSales.length === 0) {
          alert('Mohon isi minimal 1 item produk penjualan yang valid.');
          return;
        }
        rowsToProcess = validSales.map(s => ({
          type: 'penjualan',
          date: reportDate,
          outletId: selectedOutletId,
          outletName: getOutletName(selectedOutletId),
          productName: s.productName.trim(),
          qty: s.qty,
          price: s.price,
          subtotal: s.subtotal,
          paymentMethod: s.paymentMethod,
          notes: 'Input Manual Admin'
        }));
      } else if (entryType === 'pengeluaran') {
        const validExpenses = expenseItems.filter(e => e.categoryName && e.categoryName.trim() && e.amount > 0);
        if (validExpenses.length === 0) {
          alert('Mohon isi minimal 1 rincian pengeluaran yang valid.');
          return;
        }
        rowsToProcess = validExpenses.map(e => ({
          type: 'pengeluaran',
          date: reportDate,
          outletId: selectedOutletId,
          outletName: getOutletName(selectedOutletId),
          categoryName: e.categoryName.trim(),
          notes: e.notes,
          subtotal: e.amount,
          paymentMethod: e.paymentSource
        }));
      } else if (entryType === 'pembelian') {
        const validPembelian = pembelianItems.filter(p => p.ingredientName && p.ingredientName.trim() && p.subtotal > 0);
        if (validPembelian.length === 0) {
          alert('Mohon isi minimal 1 item pembelian bahan baku yang valid.');
          return;
        }
        rowsToProcess = validPembelian.map(p => ({
          type: 'pembelian',
          date: reportDate,
          outletId: selectedOutletId,
          outletName: getOutletName(selectedOutletId),
          ingredientId: p.ingredientId,
          ingredientName: p.ingredientName.trim(),
          categoryName: `Pembelian Bahan Baku - ${p.ingredientName.trim()}`,
          qty: p.qty,
          unit: p.unit,
          price: p.unitPrice,
          subtotal: p.subtotal,
          supplierName: p.supplierName,
          notes: `Pembelian Bahan Baku: ${p.ingredientName.trim()} (${p.qty} ${p.unit}) ${p.supplierName ? '- ' + p.supplierName : ''}`
        }));
      } else if (entryType === 'pendapatan') {
        const validPendapatan = pendapatanItems.filter(p => p.categoryName && p.categoryName.trim() && p.amount > 0);
        if (validPendapatan.length === 0) {
          alert('Mohon isi minimal 1 rincian pendapatan non-sales yang valid.');
          return;
        }
        rowsToProcess = validPendapatan.map(p => ({
          type: 'pendapatan',
          date: reportDate,
          outletId: selectedOutletId,
          outletName: getOutletName(selectedOutletId),
          categoryName: p.categoryName.trim(),
          notes: p.notes || 'Pendapatan Non-Sales / Kas Masuk Lainnya',
          subtotal: p.amount,
          paymentMethod: p.paymentMethod
        }));
      }
    } else {
      // Excel tab
      const validRows = parsedRows.filter(r => r.isValid);
      if (validRows.length === 0) {
        alert('Tidak ada data valid dari file Excel yang dapat di-import.');
        return;
      }
      rowsToProcess = validRows.map(r => ({
        type: r.type,
        date: r.date || reportDate,
        outletId: r.outletId || selectedOutletId,
        outletName: r.outletName || getOutletName(r.outletId || selectedOutletId),
        productName: r.nameOrCode,
        categoryName: r.nameOrCode,
        qty: r.qty,
        price: r.amount || r.price,
        subtotal: r.totalSubtotal,
        paymentMethod: r.paymentMethod,
        notes: r.notes || 'Import Batch Excel'
      }));
    }

    // --- AUTO-REGISTER & STRICT DEDUPLICATION FOR EXPENSES & PRODUCTS ---
    rowsToProcess.forEach(row => {
      if (row.type === 'pengeluaran') {
        let matched = findMatchingExpenseAccount(row.categoryName, currentAccounts);
        if (!matched) {
          const newCode = generateNextExpenseCode(currentAccounts);
          matched = {
            id: Date.now() + Math.random(),
            code: newCode,
            name: row.categoryName,
            categoryGroup: 'Beban Operasional (OPEX)',
            targetReport: 'Laporan Laba Rugi',
            normalBalance: 'Debet',
            status: 'Aktif',
            notes: 'Auto-registered dari Update Laporan'
          };
          currentAccounts.push(matched);
          currentExpenseMaster.push({
            id: matched.id,
            code: newCode,
            name: row.categoryName,
            categoryGroup: 'Beban Operasional (OPEX)',
            status: 'Aktif'
          });
          newAccountsCreatedCount++;
        }
        row.accountCode = matched.code;
        row.categoryName = matched.name;
      } else if (row.type === 'penjualan') {
        let matched = findMatchingProduct(row.productName, currentProducts);
        if (!matched) {
          const newSku = generateNextProductSku(currentProducts);
          const defaultCatId = masterData?.categories?.[0]?.id || 1;
          const defaultCatName = masterData?.categories?.[0]?.name || 'Serba Bebek';
          matched = {
            id: Date.now() + Math.random(),
            sku: newSku,
            name: row.productName,
            category_id: defaultCatId,
            category_name: defaultCatName,
            price: row.price || 0,
            status: 'Aktif',
            compositions: [],
            notes: 'Auto-registered dari Update Laporan'
          };
          currentProducts.push(matched);
          newProductsCreatedCount++;
        }
        row.productId = matched.id;
        row.productName = matched.name;
      }
    });

    // 1. STOCK DEDUCTION ENGINE (Resep HPP & Stok)
    let updatedIngredients = [...(masterData?.ingredients || [])];
    const newStockMovements = [];

    rowsToProcess.filter(r => r.type === 'penjualan').forEach(sRow => {
      const prod = currentProducts.find(p => String(p.id) === String(sRow.productId) || p.name.toLowerCase().trim() === sRow.productName.toLowerCase().trim());
      if (prod && prod.compositions && prod.compositions.length > 0) {
        prod.compositions.forEach(comp => {
          const ingIndex = updatedIngredients.findIndex(i => String(i.id) === String(comp.ingredient_id) || i.name.toLowerCase().trim() === comp.ingredient_name.toLowerCase().trim());
          if (ingIndex !== -1) {
            const deductQty = (parseFloat(comp.qty) || 0) * (parseFloat(sRow.qty) || 1);
            const currentStock = parseFloat(updatedIngredients[ingIndex].stock || updatedIngredients[ingIndex].qty || 0);
            const newStock = Math.max(0, currentStock - deductQty);
            updatedIngredients[ingIndex] = { ...updatedIngredients[ingIndex], stock: newStock, qty: newStock };
            newStockMovements.push({
              id: Date.now() + Math.random(),
              entry_date: sRow.date,
              date: sRow.date,
              transaction_date: sRow.date,
              time: new Date().toLocaleTimeString('id-ID'),
              outlet_id: sRow.outletId,
              outlet_name: sRow.outletName,
              ingredient_id: updatedIngredients[ingIndex].id,
              ingredient_name: updatedIngredients[ingIndex].name,
              movement_type: 'Penjualan (Update Laporan)',
              qty_change: -deductQty,
              final_stock: newStock,
              unit: comp.unit || updatedIngredients[ingIndex].unit || 'Gram',
              notes: `Auto Pemotongan Stok dari Update Laporan (${sRow.productName} x${sRow.qty})`,
              author: authorName
            });
          }
        });
      }
    });

    // 1b. STOCK ADDITION ENGINE (Pembelian Bahan Baku)
    rowsToProcess.filter(r => r.type === 'pembelian').forEach(pRow => {
      const ingIndex = updatedIngredients.findIndex(i => String(i.id) === String(pRow.ingredientId) || i.name.toLowerCase().trim() === (pRow.ingredientName || '').toLowerCase().trim());
      if (ingIndex !== -1) {
        const addQty = parseFloat(pRow.qty) || 0;
        const currentStock = parseFloat(updatedIngredients[ingIndex].stock || updatedIngredients[ingIndex].qty || 0);
        const newStock = currentStock + addQty;
        updatedIngredients[ingIndex] = { ...updatedIngredients[ingIndex], stock: newStock, qty: newStock };
        newStockMovements.push({
          id: Date.now() + Math.random(),
          entry_date: pRow.date,
          date: pRow.date,
          transaction_date: pRow.date,
          time: new Date().toLocaleTimeString('id-ID'),
          outlet_id: pRow.outletId,
          outlet_name: pRow.outletName,
          ingredient_id: updatedIngredients[ingIndex].id,
          ingredient_name: updatedIngredients[ingIndex].name,
          movement_type: 'Pembelian Stok (Update Laporan)',
          qty_change: addQty,
          final_stock: newStock,
          unit: pRow.unit || updatedIngredients[ingIndex].unit || 'Kg',
          notes: `Auto Penambahan Stok dari Update Laporan Pembelian (${pRow.ingredientName} +${addQty} ${pRow.unit || ''})`,
          author: authorName
        });
      }
    });

    // 2. GROUP ROWS BY TANGGAL + OUTLET → Buat 1 laporan per tanggal+outlet unik
    const groupMap = new Map();
    rowsToProcess.forEach(row => {
      const gKey = `${row.date}__${row.outletId || selectedOutletId}`;
      if (!groupMap.has(gKey)) {
        groupMap.set(gKey, {
          date: row.date,
          outletId: row.outletId || selectedOutletId,
          outletName: row.outletName || getOutletName(row.outletId || selectedOutletId),
          salesRows: [],
          pendapatanRows: [],
          expenseRows: []
        });
      }
      const grp = groupMap.get(gKey);
      if (row.type === 'penjualan') grp.salesRows.push(row);
      else if (row.type === 'pendapatan') grp.pendapatanRows.push(row);
      else grp.expenseRows.push(row);
    });

    // 3. HELPER: Cari laporan UPD- yang sudah ada untuk tanggal + outlet yang sama
    const findExistingUPDReport = (date, outletId) => {
      return (masterData?.manualEntryRecords || []).find(r =>
        (r.entry_date === date || r.date === date) &&
        (String(r.outlet_id) === String(outletId) || String(r.outletId) === String(outletId)) &&
        String(r.report_no || '').startsWith('UPD-')
      ) || null;
    };

    // Helper: merge array of breakdown items, consolidate same name → sum qty & amount (Opsi B)
    const mergeBreakdownByName = (existing = [], incoming = [], nameKey = 'name') => {
      const map = new Map();
      [...existing, ...incoming].forEach(item => {
        const key = String(item[nameKey] || item.product_name || item.categoryName || item.name || '').trim().toLowerCase();
        if (!key) return;
        if (map.has(key)) {
          const prev = map.get(key);
          const newQty = (Number(prev.qty) || 1) + (Number(item.qty) || 1);
          const newSubtotal = (Number(prev.subtotal) || Number(prev.amount) || 0) + (Number(item.subtotal) || Number(item.amount) || 0);
          const newAmount  = newSubtotal;
          map.set(key, { ...prev, qty: newQty, subtotal: newSubtotal, amount: newAmount });
        } else {
          map.set(key, { ...item });
        }
      });
      return Array.from(map.values());
    };

    // 4. CONSTRUCT REPORT RECORDS & FINANCIAL RECORDS PER GRUP TANGGAL+OUTLET
    const allNewReportRecords = [];
    const allNewFinancialRecords = [];
    const allNewSalesTxRecords = [];
    let totalSalesOmsetAll = 0;
    let totalPendapatanLainAll = 0;
    let totalExpenseAmountAll = 0;
    let mergedCount = 0;
    let createdCount = 0;
    // Track report_no of existing records that are being replaced by merged version
    const mergedReportNos = new Set();

    groupMap.forEach((grp) => {
      const grpSalesTotal = grp.salesRows.reduce((s, r) => s + r.subtotal, 0);
      const grpPendapatanTotal = grp.pendapatanRows.reduce((s, r) => s + r.subtotal, 0);
      const grpPemasukanTotal = grpSalesTotal + grpPendapatanTotal;
      const grpExpenseTotal = grp.expenseRows.reduce((s, r) => s + r.subtotal, 0);

      totalSalesOmsetAll += grpSalesTotal;
      totalPendapatanLainAll += grpPendapatanTotal;
      totalExpenseAmountAll += grpExpenseTotal;

      const grpTimestamp = `${grp.date}T${new Date().toTimeString().split(' ')[0]}`;

      const grpSalesBreakdown = grp.salesRows.map(s => ({
        product_id: s.productId, product_name: s.productName, name: s.productName,
        qty: s.qty, price: s.price, subtotal: s.subtotal, amount: s.subtotal
      }));
      const grpPendapatanBreakdown = grp.pendapatanRows.map(p => ({
        categoryName: p.categoryName, category: p.categoryName, name: p.categoryName,
        subtotal: p.subtotal, amount: p.subtotal, paymentMethod: p.paymentMethod,
        payment_method: p.paymentMethod, notes: p.notes || 'Kas Masuk Non-Sales'
      }));
      const grpExpenseBreakdown = grp.expenseRows.map(e => ({
        code: e.accountCode, name: e.categoryName, category: e.categoryName,
        categoryName: e.categoryName, amount: e.subtotal, subtotal: e.subtotal,
        qty: e.qty || 1, price: e.price || (e.qty ? e.subtotal / e.qty : e.subtotal),
        unit_price: e.price || (e.qty ? e.subtotal / e.qty : e.subtotal),
        price_per_unit: e.price || (e.qty ? e.subtotal / e.qty : e.subtotal),
        notes: e.notes || 'Update Laporan Pengeluaran'
      }));

      // ── CEK: Apakah sudah ada laporan UPD- untuk tanggal+outlet ini? ──────────
      const existingReport = findExistingUPDReport(grp.date, grp.outletId);

      if (existingReport) {
        // ── MERGE: gabungkan & konsolidasi item yang sama (Opsi B) ────────────
        mergedReportNos.add(String(existingReport.report_no || existingReport.id));
        mergedCount++;

        const mergedSales      = mergeBreakdownByName(existingReport.sales_details      || [], grpSalesBreakdown,      'name');
        const mergedPendapatan = mergeBreakdownByName(existingReport.pendapatan_details  || [], grpPendapatanBreakdown, 'name');
        const mergedExpenses   = mergeBreakdownByName(existingReport.expenses_breakdown  || [], grpExpenseBreakdown,    'name');

        const newSalesTotal    = mergedSales.reduce((s, r)      => s + (Number(r.subtotal) || Number(r.amount) || 0), 0);
        const newPendapatanTotal = mergedPendapatan.reduce((s, r) => s + (Number(r.subtotal) || Number(r.amount) || 0), 0);
        const newExpensesTotal = mergedExpenses.reduce((s, r)   => s + (Number(r.amount)   || Number(r.subtotal) || 0), 0);
        const newPemasukanTotal = newSalesTotal + newPendapatanTotal;
        const newNet = newPemasukanTotal - newExpensesTotal;

        allNewReportRecords.push({
          ...existingReport,                              // pertahankan semua field lama
          sales_details:      mergedSales,
          pendapatan_details: mergedPendapatan,
          expense_details:    mergedExpenses,
          expenses_breakdown: mergedExpenses,
          expense_rows:       mergedExpenses,
          net_sales:          newSalesTotal,
          gross_sales:        newSalesTotal,
          total_omset:        newSalesTotal,
          total_sales:        newSalesTotal,
          total_pendapatan_lain: newPendapatanTotal,
          total_pemasukan:    newPemasukanTotal,
          cash_sales:         newSalesTotal,
          total_expense:      newExpensesTotal,
          total_pengeluaran:  newExpensesTotal,
          net_cash:           newNet,
          laba_bersih:        newNet,
          updated_at:         new Date().toISOString(),
          source: activeTab === 'excel' ? 'Batch Upload Excel' : 'Update Laporan Manual',
        });

      } else {
        // ── CREATE: buat laporan baru ─────────────────────────────────────────
        createdCount++;
        const grpReportNo = `UPD-${grp.date.replace(/-/g, '')}-${String(grp.outletId)}-${String(Math.floor(Math.random() * 900) + 100)}`;
        const grpNet = grpPemasukanTotal - grpExpenseTotal;

        allNewReportRecords.push({
          id: Date.now() + Math.random(),
          report_no: grpReportNo,
          entry_date: grp.date,
          date: grp.date,
          transaction_date: grp.date,
          outlet_id: grp.outletId,
          outlet_name: grp.outletName,
          net_sales: grpSalesTotal,
          gross_sales: grpSalesTotal,
          total_omset: grpSalesTotal,
          total_sales: grpSalesTotal,
          total_pendapatan_lain: grpPendapatanTotal,
          total_pemasukan: grpPemasukanTotal,
          cash_sales: grpSalesTotal,
          non_cash_sales: 0,
          total_expense: grpExpenseTotal,
          total_pengeluaran: grpExpenseTotal,
          net_cash: grpNet,
          laba_bersih: grpNet,
          status: 'Disetujui',
          is_approved: true,
          author: authorName,
          created_by: authorName,
          source: activeTab === 'excel' ? 'Batch Upload Excel' : 'Update Laporan Manual',
          sales_details: grpSalesBreakdown,
          pendapatan_details: grpPendapatanBreakdown,
          expense_details: grpExpenseBreakdown,
          expenses_breakdown: grpExpenseBreakdown,
          expense_rows: grpExpenseBreakdown,
          created_at: new Date().toISOString()
        });
      }

      // Financial records & sales tx tetap ditambahkan (untuk analytics)
      grp.expenseRows.forEach(e => {
        allNewFinancialRecords.push({
          id: Date.now() + Math.random(),
          type: 'expense',
          code: e.accountCode,
          category: e.categoryName,
          notes: e.notes || 'Update Laporan Pengeluaran',
          amount: e.subtotal,
          outlet_id: grp.outletId,
          outlet_name: grp.outletName,
          entry_date: grp.date,
          date: grp.date,
          transaction_date: grp.date,
          created_at: new Date().toISOString()
        });
      });

      grp.pendapatanRows.forEach(p => {
        const catTitle = p.categoryName || p.productName || p.name || 'Pendapatan Non-Sales / Kas Masuk';
        allNewFinancialRecords.push({
          id: Date.now() + Math.random(),
          type: 'other_income',
          category: catTitle,
          categoryName: catTitle,
          name: catTitle,
          notes: (p.notes && p.notes !== 'Import Batch Excel' && p.notes !== 'Update Laporan Manual') ? p.notes : catTitle,
          amount: p.subtotal,
          payment_method: p.paymentMethod || 'Kas Kasir (Tunai)',
          outlet_id: grp.outletId,
          outlet_name: grp.outletName,
          entry_date: grp.date,
          date: grp.date,
          transaction_date: grp.date,
          created_at: new Date().toISOString()
        });
      });

      grp.salesRows.forEach(s => {
        allNewSalesTxRecords.push({
          id: Date.now() + Math.random(),
          type: 'sale',
          amount: s.subtotal,
          total: s.subtotal,
          items: [{ name: s.productName, qty: s.qty, price: s.price, subtotal: s.subtotal }],
          outlet_id: grp.outletId,
          outlet_name: grp.outletName,
          entry_date: grp.date,
          date: grp.date,
          transaction_date: grp.date,
          timestamp: grpTimestamp,
          created_at: new Date().toISOString(),
          payment_method: s.paymentMethod || 'Kas Kasir (Tunai)'
        });
      });
    });

    const totalTotalPemasukan = totalSalesOmsetAll + totalPendapatanLainAll;
    const netCashFlowAll = totalTotalPemasukan - totalExpenseAmountAll;

    // 5. SAVE TO MASTER DATA STATE LOCALLY WITH STRICT POS KASIR ISOLATION
    const oldId = isEditMode ? String(editData.id) : null;
    const isExcelImport = activeTab === 'excel';

    // Purge any Update Laporan / Excel Upload records from POS Kasir salesTransactions & shiftReports
    const isUpdateLaporanRecord = (t) => {
      if (!t) return false;
      const src = String(t.source || '');
      const rNo = String(t.report_no || t.id || '');
      const notes = String(t.notes || '');
      return rNo.startsWith('UPD-') || src.includes('Excel') || src.includes('Update Laporan') || notes.includes('Update Laporan');
    };

    const cleanSalesTx = (masterData?.salesTransactions || []).filter(t => !isUpdateLaporanRecord(t));
    const cleanShiftReports = (masterData?.shiftReports || []).filter(r => !isUpdateLaporanRecord(r));
    const cleanApprovedDaily = (masterData?.approvedFinanceDaily || []).filter(r => !isUpdateLaporanRecord(r));

    // Filter manualEntryRecords: buang yang lama jika sedang di-edit ATAU yang sudah di-merge
    const filterOld = (arr) => (arr || []).filter(r => {
      if (oldId && String(r.id) === oldId) return false;
      if (mergedReportNos.has(String(r.report_no || r.id))) return false;
      return true;
    });

    const updatedManualRecords = [...allNewReportRecords, ...filterOld(masterData?.manualEntryRecords)];
    const updatedMovements     = [...newStockMovements, ...(masterData?.stockMovement || [])];
    const updatedFinRecords    = [...allNewFinancialRecords, ...(masterData?.financialRecords || [])];

    setMasterData({
      ...masterData,
      chartOfAccounts: currentAccounts,
      expenseMaster: currentExpenseMaster,
      products: currentProducts,
      ingredients: updatedIngredients,
      stockMovement: updatedMovements,
      manualEntryRecords: updatedManualRecords,
      approvedFinanceDaily: cleanApprovedDaily,
      shiftReports: cleanShiftReports,
      financialRecords: updatedFinRecords,
      salesTransactions: cleanSalesTx,
      outletTransactions: cleanSalesTx,
      transactions: cleanSalesTx
    });

    let autoMsg = '';
    if (newAccountsCreatedCount > 0) autoMsg += `\n• Auto-Generate Kode Biaya Baru: ${newAccountsCreatedCount} Akun terdaftar.`;
    if (newProductsCreatedCount > 0) autoMsg += `\n• Auto-Register Produk Baru: ${newProductsCreatedCount} Produk terdaftar.`;

    const mergeInfo = mergedCount > 0 ? `\n• Di-merge ke tanggal sudah ada: ${mergedCount} tanggal/outlet` : '';
    const createInfo = createdCount > 0 ? `\n• Laporan baru dibuat: ${createdCount} tanggal/outlet` : '';

    alert(isEditMode
      ? `LAPORAN BERHASIL DIUPDATE!\n\n• Total Pemasukan: Rp ${totalTotalPemasukan.toLocaleString('id-ID')}\n• Total Pengeluaran: Rp ${totalExpenseAmountAll.toLocaleString('id-ID')}${autoMsg}`
      : `BERHASIL UPDATE LAPORAN!${createInfo}${mergeInfo}\n\n• Total Pemasukan: Rp ${totalTotalPemasukan.toLocaleString('id-ID')} (Sales: Rp ${totalSalesOmsetAll.toLocaleString('id-ID')}, Pendapatan Lain: Rp ${totalPendapatanLainAll.toLocaleString('id-ID')})\n• Total Pengeluaran: Rp ${totalExpenseAmountAll.toLocaleString('id-ID')}\n• Net Cashflow: Rp ${netCashFlowAll.toLocaleString('id-ID')}${autoMsg}\n• Mutasi Stok: ${newStockMovements.length} item.`);

    onClose();
  };



  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0, 0, 0, 0.8)',
      backdropFilter: 'blur(5px)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 9999,
      padding: '16px'
    }}>
      <div style={{
        background: T.cardBg,
        border: `1px solid ${T.accentGoldBorder}`,
        borderRadius: '16px',
        width: '100%',
        maxWidth: activeTab === 'excel' && uploadStep === 'preview' ? '920px' : '780px',
        maxHeight: '90vh',
        overflowY: 'auto',
        padding: '24px',
        boxShadow: '0 25px 60px rgba(0,0,0,0.7)',
        display: 'flex',
        flexDirection: 'column',
        gap: '18px'
      }} className="animate-scale-up">

        {/* MODAL HEADER */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: `1px solid ${T.border}`, paddingBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '10px', background: T.accentGoldBg, border: `1px solid ${T.accentGoldBorder}`, borderRadius: '12px' }}>
              <FileSpreadsheet size={24} color={T.accentGold} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.15rem', fontWeight: '900', color: T.txtPrimary, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>{isEditMode ? `Edit Laporan: ${editData?.report_no || ''}` : '+ Update Laporan Transaksi & Kas'}</span>
              </h2>
              <p style={{ fontSize: '0.74rem', color: T.txtSecondary, margin: '2px 0 0 0' }}>
                {isEditMode
                  ? 'Ubah data laporan yang sudah ada. Laporan lama akan digantikan setelah disimpan.'
                  : 'Update transaksi Penjualan, Pengeluaran, Kas Masuk (Pendapatan Lain-Lain), dan Pembelian Stok yang secara otomatis memperbarui Stok & Laporan Keuangan.'}
              </p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: T.txtMuted, cursor: 'pointer', padding: '4px' }}>
            <X size={22} />
          </button>
        </div>

        {/* TOP METADATA BAR (Tanggal, Outlet) */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px', background: T.cardBg2, padding: '14px', borderRadius: '12px', border: `1px solid ${T.border}` }}>
          <div>
            <label style={{ fontSize: '0.72rem', color: T.txtSecondary, fontWeight: '700', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
              <Calendar size={12} color={T.info} /> Tanggal Laporan
            </label>
            <input
              type="date"
              value={reportDate}
              onChange={e => setReportDate(e.target.value)}
              style={{ width: '100%', padding: '7px 10px', borderRadius: '8px', border: `1px solid ${T.border}`, background: T.inputBg, color: T.txtPrimary, fontSize: '0.80rem', fontWeight: '700' }}
            />
          </div>

          <div>
            <label style={{ fontSize: '0.72rem', color: T.txtSecondary, fontWeight: '700', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
              <Building2 size={12} color={T.success} /> Outlet / Cabang
            </label>
            <select
              value={selectedOutletId}
              onChange={e => setSelectedOutletId(e.target.value)}
              style={{ width: '100%', padding: '7px 10px', borderRadius: '8px', border: `1px solid ${T.border}`, background: T.inputBg, color: T.txtPrimary, fontSize: '0.80rem', fontWeight: '700' }}
            >
              {(masterData?.outlets || []).map(o => (
                <option key={o.id} value={o.id}>{o.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* STATUS DATA TANGGAL & OUTLET TERPILIH (LIVE ENTRY & IMPORT STATUS) */}
        <div style={{
          background: isLight ? '#f8fafc' : 'rgba(15, 23, 42, 0.65)',
          border: `1px solid ${T.borderStrong}`,
          borderRadius: '12px',
          padding: '12px 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Info size={16} color={T.info} />
              <span style={{ fontSize: '0.78rem', fontWeight: '800', color: T.txtPrimary }}>
                Status Data Tanggal: <strong style={{ color: '#38bdf8' }}>{reportDate}</strong> ({getOutletName(selectedOutletId)})
              </span>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '10px' }}>
            {/* Penjualan Status */}
            <div style={{
              padding: '12px 14px',
              borderRadius: '10px',
              background: dateStatusSummary.salesCount > 0 ? (isLight ? '#ecfdf5' : 'rgba(16, 185, 129, 0.12)') : (isLight ? '#fffbeb' : 'rgba(245, 158, 11, 0.08)'),
              border: dateStatusSummary.salesCount > 0 ? '1px solid rgba(16, 185, 129, 0.35)' : '1px solid rgba(245, 158, 11, 0.25)',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.72rem', fontWeight: '800', color: dateStatusSummary.salesCount > 0 ? '#10b981' : '#f59e0b', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  {dateStatusSummary.salesCount > 0 ? <CheckCircle2 size={13} /> : <AlertCircle size={13} />}
                  <span>PENJUALAN: {dateStatusSummary.salesCount > 0 ? 'SUDAH TERINPUT' : 'BELUM ADA DATA'}</span>
                </span>
                {dateStatusSummary.importedSalesCount > 0 && (
                  <span style={{ fontSize: '0.62rem', fontWeight: '800', background: 'rgba(56, 189, 248, 0.2)', color: '#38bdf8', padding: '1px 5px', borderRadius: '4px' }}>
                    📥 {dateStatusSummary.importedSalesCount} dari Impor
                  </span>
                )}
              </div>
              <div style={{ fontSize: '0.86rem', fontWeight: '900', color: T.txtPrimary }}>
                {dateStatusSummary.salesCount > 0
                  ? `${dateStatusSummary.salesCount} Transaksi (Rp ${dateStatusSummary.salesOmzet.toLocaleString('id-ID')})`
                  : 'Belum ada transaksi tercatat'}
              </div>
              <button
                type="button"
                onClick={() => onOpenSalesImport ? onOpenSalesImport() : null}
                style={{
                  marginTop: '4px',
                  padding: '6px 10px',
                  borderRadius: '6px',
                  border: '1px solid rgba(245, 158, 11, 0.4)',
                  background: 'rgba(245, 158, 11, 0.15)',
                  color: '#fbbf24',
                  fontSize: '0.72rem',
                  fontWeight: '800',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                <FileSpreadsheet size={13} />
                <span>+ Impor Penjualan (PDF / Excel)</span>
              </button>
            </div>

            {/* Pengeluaran Status */}
            <div style={{
              padding: '12px 14px',
              borderRadius: '10px',
              background: dateStatusSummary.expenseCount > 0 ? (isLight ? '#ecfdf5' : 'rgba(16, 185, 129, 0.12)') : (isLight ? '#fffbeb' : 'rgba(245, 158, 11, 0.08)'),
              border: dateStatusSummary.expenseCount > 0 ? '1px solid rgba(16, 185, 129, 0.35)' : '1px solid rgba(245, 158, 11, 0.25)',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.72rem', fontWeight: '800', color: dateStatusSummary.expenseCount > 0 ? '#10b981' : '#f59e0b', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  {dateStatusSummary.expenseCount > 0 ? <CheckCircle2 size={13} /> : <AlertCircle size={13} />}
                  <span>PENGELUARAN: {dateStatusSummary.expenseCount > 0 ? 'SUDAH TERINPUT' : 'BELUM ADA DATA'}</span>
                </span>
                {dateStatusSummary.importedExpenseCount > 0 && (
                  <span style={{ fontSize: '0.62rem', fontWeight: '800', background: 'rgba(239, 68, 68, 0.2)', color: '#f87171', padding: '1px 5px', borderRadius: '4px' }}>
                    📥 {dateStatusSummary.importedExpenseCount} dari Impor
                  </span>
                )}
              </div>
              <div style={{ fontSize: '0.86rem', fontWeight: '900', color: T.txtPrimary }}>
                {dateStatusSummary.expenseCount > 0
                  ? `${dateStatusSummary.expenseCount} Pengeluaran (Rp ${dateStatusSummary.expenseAmount.toLocaleString('id-ID')})`
                  : 'Belum ada pengeluaran tercatat'}
              </div>
              <button
                type="button"
                onClick={() => onOpenExpenseImport ? onOpenExpenseImport() : null}
                style={{
                  marginTop: '4px',
                  padding: '6px 10px',
                  borderRadius: '6px',
                  border: '1px solid rgba(239, 68, 68, 0.4)',
                  background: 'rgba(239, 68, 68, 0.15)',
                  color: '#f87171',
                  fontSize: '0.72rem',
                  fontWeight: '800',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                <ShoppingBag size={13} />
                <span>+ Impor Pengeluaran (PDF / Excel)</span>
              </button>
            </div>
          </div>
        </div>

        {/* MODE NAVIGATION TABS */}
        <div style={{ display: 'flex', borderBottom: `1px solid ${T.border}`, gap: '8px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => setActiveTab('manual')}
            style={{
              padding: '8px 14px',
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'manual' ? `2px solid ${T.accentGold}` : '2px solid transparent',
              color: activeTab === 'manual' ? T.accentGold : T.txtSecondary,
              fontWeight: '800',
              fontSize: '0.80rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Plus size={15} />
            <span>1. Input Manual Transaksi</span>
          </button>

          <button
            type="button"
            onClick={() => onOpenSalesImport ? onOpenSalesImport() : null}
            style={{
              padding: '8px 14px',
              background: 'transparent',
              border: 'none',
              color: '#fbbf24',
              fontWeight: '800',
              fontSize: '0.80rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
            title="Buka Wizard Impor Penjualan Dokumen PDF & Excel"
          >
            <FileSpreadsheet size={15} />
            <span>2. Impor Penjualan (PDF / Excel)</span>
          </button>

          <button
            type="button"
            onClick={() => onOpenExpenseImport ? onOpenExpenseImport() : null}
            style={{
              padding: '8px 14px',
              background: 'transparent',
              border: 'none',
              color: '#f87171',
              fontWeight: '800',
              fontSize: '0.80rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
            title="Buka Wizard Impor Pengeluaran & Pembelian Bahan PDF & Excel"
          >
            <ShoppingBag size={15} />
            <span>3. Impor Pengeluaran (PDF / Excel)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('excel')}
            style={{
              padding: '8px 14px',
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'excel' ? `2px solid ${T.info}` : '2px solid transparent',
              color: activeTab === 'excel' ? T.info : T.txtSecondary,
              fontWeight: '800',
              fontSize: '0.80rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Layers size={15} />
            <span>4. Batch Upload File Excel Rekap</span>
          </button>
        </div>

        {/* --- TAB 1: MANUAL INPUT FORM --- */}
        {activeTab === 'manual' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            
            {/* TYPE TOGGLE (4 PILL BUTTONS) */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setEntryType('penjualan')}
                style={{
                  padding: '9px 6px',
                  borderRadius: '10px',
                  border: `1px solid ${entryType === 'penjualan' ? T.success : T.border}`,
                  background: entryType === 'penjualan' ? T.successBg : T.cardBg2,
                  color: entryType === 'penjualan' ? T.success : T.txtSecondary,
                  fontWeight: '800',
                  fontSize: '0.76rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                <TrendingUp size={15} />
                <span>Penjualan Produk</span>
              </button>

              <button
                type="button"
                onClick={() => setEntryType('pendapatan')}
                style={{
                  padding: '9px 6px',
                  borderRadius: '10px',
                  border: `1px solid ${entryType === 'pendapatan' ? T.info : T.border}`,
                  background: entryType === 'pendapatan' ? T.infoBg : T.cardBg2,
                  color: entryType === 'pendapatan' ? T.info : T.txtSecondary,
                  fontWeight: '800',
                  fontSize: '0.76rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                <DollarSign size={15} />
                <span>Pendapatan Non-Sales (Kas Masuk)</span>
              </button>

              <button
                type="button"
                onClick={() => setEntryType('pengeluaran')}
                style={{
                  padding: '9px 6px',
                  borderRadius: '10px',
                  border: `1px solid ${entryType === 'pengeluaran' ? T.danger : T.border}`,
                  background: entryType === 'pengeluaran' ? T.dangerBg : T.cardBg2,
                  color: entryType === 'pengeluaran' ? T.danger : T.txtSecondary,
                  fontWeight: '800',
                  fontSize: '0.76rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                <TrendingDown size={15} />
                <span>Pengeluaran (Kas Keluar)</span>
              </button>

              <button
                type="button"
                onClick={() => setEntryType('pembelian')}
                style={{
                  padding: '9px 6px',
                  borderRadius: '10px',
                  border: `1px solid ${entryType === 'pembelian' ? T.accentGold : T.border}`,
                  background: entryType === 'pembelian' ? 'rgba(234,179,8,0.12)' : T.cardBg2,
                  color: entryType === 'pembelian' ? T.accentGold : T.txtSecondary,
                  fontWeight: '800',
                  fontSize: '0.76rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                <ShoppingBag size={15} />
                <span>Pembelian Stok</span>
              </button>
            </div>

            {/* FORM BODY FOR SALES */}
            {entryType === 'penjualan' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <datalist id="mrisExistingProductsList">
                  {(activeProducts || []).map(p => (
                    <option key={p.id} value={p.name}>{`[${p.sku}] Rp ${p.price?.toLocaleString('id-ID')}`}</option>
                  ))}
                </datalist>

                <div style={{ fontSize: '0.76rem', color: T.txtSecondary, fontWeight: '700', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                  <span>Rincian Menu Produk Terjual:</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={handleFetchFromPosTransactions}
                      style={{
                        background: 'rgba(16, 185, 129, 0.15)',
                        border: '1px solid #10b981',
                        color: '#10b981',
                        padding: '4px 10px',
                        borderRadius: '8px',
                        fontSize: '0.72rem',
                        fontWeight: '800',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                      title="Ambil dan hitung otomatis transaksi kasir POS yang telah terjadi untuk cabang dan tanggal yang dipilih"
                    >
                      <Sparkles size={13} />
                      <span>Tarik Otomatis dari POS Kasir</span>
                    </button>
                    <span style={{ fontSize: '0.68rem', color: T.info }}>*Ketik nama produk baru untuk pendaftaran otomatis</span>
                  </div>
                </div>

                {salesItems.map((item) => {
                  const matched = findMatchingProduct(item.productName);
                  return (
                    <div key={item.id} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1.2fr 1.2fr 40px', gap: '8px', alignItems: 'center', background: T.cardBg2, padding: '8px 10px', borderRadius: '8px', border: `1px solid ${T.border}` }}>
                      <div>
                        <input
                          type="text"
                          list="mrisExistingProductsList"
                          value={item.productName}
                          onChange={e => handleUpdateSalesRow(item.id, 'productName', e.target.value)}
                          placeholder="Nama Produk (Pilih / Ketik Baru)..."
                          style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: `1px solid ${T.border}`, background: T.inputBg, color: T.txtPrimary, fontSize: '0.78rem', fontWeight: '700' }}
                        />
                        <div style={{ fontSize: '0.64rem', marginTop: '2px', fontWeight: '800' }}>
                          {matched ? (
                            <span style={{ color: T.success }}>Terdaftar [{matched.sku}]</span>
                          ) : item.productName && item.productName.trim() ? (
                            <span style={{ color: T.accentGold }}>Auto-Register Produk Baru</span>
                          ) : null}
                        </div>
                      </div>

                      <div>
                        <input
                          type="number"
                          min="1"
                          value={item.qty}
                          onChange={e => handleUpdateSalesRow(item.id, 'qty', e.target.value)}
                          placeholder="Qty"
                          style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: `1px solid ${T.border}`, background: T.inputBg, color: T.txtPrimary, fontSize: '0.78rem' }}
                        />
                      </div>

                      <div>
                        <input
                          type="number"
                          value={item.price}
                          onChange={e => handleUpdateSalesRow(item.id, 'price', e.target.value)}
                          placeholder="Harga Rp"
                          style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: `1px solid ${T.border}`, background: T.inputBg, color: T.txtPrimary, fontSize: '0.78rem' }}
                        />
                      </div>

                      <div style={{ fontSize: '0.80rem', fontWeight: '800', color: T.success, textAlign: 'right', paddingRight: '4px' }}>
                        Rp {item.subtotal?.toLocaleString('id-ID')}
                      </div>

                      <button type="button" onClick={() => handleRemoveSalesRow(item.id)} style={{ background: 'none', border: 'none', color: T.danger, cursor: 'pointer', textAlign: 'center' }}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                  );
                })}

                <button
                  type="button"
                  onClick={handleAddSalesRow}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', background: T.cardBg, border: `1px solid ${T.successBorder}`, borderRadius: '6px', color: T.success, fontSize: '0.74rem', fontWeight: '800', cursor: 'pointer', width: 'fit-content' }}
                >
                  <Plus size={14} />
                  <span>Tambah Item Penjualan</span>
                </button>
              </div>
            )}

            {/* FORM BODY FOR EXPENSES */}
            {entryType === 'pengeluaran' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <datalist id="mrisExistingExpensesList">
                  {(masterData?.chartOfAccounts || [])
                    .filter(c => String(c.code).startsWith('6') || String(c.code).startsWith('5'))
                    .map(c => (
                      <option key={c.code} value={c.name}>{`[Kode: ${c.code}]`}</option>
                    ))}
                </datalist>

                <div style={{ fontSize: '0.76rem', color: T.txtSecondary, fontWeight: '700', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Rincian Pengeluaran &amp; Beban Operasional (Kas Keluar):</span>
                  <span style={{ fontSize: '0.68rem', color: T.info }}>*Ketik Nama Biaya (Kode biaya ter-generate otomatis di Data Master)</span>
                </div>

                {expenseItems.map((item) => {
                  const matched = findMatchingExpenseAccount(item.categoryName);
                  return (
                    <div key={item.id} style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 1.2fr 40px', gap: '8px', alignItems: 'center', background: T.cardBg2, padding: '8px 10px', borderRadius: '8px', border: `1px solid ${T.border}` }}>
                      <div>
                        <input
                          type="text"
                          list="mrisExistingExpensesList"
                          value={item.categoryName}
                          onChange={e => handleUpdateExpenseRow(item.id, 'categoryName', e.target.value)}
                          placeholder="Nama Biaya / Pengeluaran..."
                          style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: `1px solid ${T.border}`, background: T.inputBg, color: T.txtPrimary, fontSize: '0.78rem', fontWeight: '700' }}
                        />
                        <div style={{ fontSize: '0.64rem', marginTop: '2px', fontWeight: '800' }}>
                          {matched ? (
                            <span style={{ color: T.info }}>Kode Akun [{matched.code}]</span>
                          ) : item.categoryName && item.categoryName.trim() ? (
                            <span style={{ color: T.accentGold }}>Auto-Generate Kode Biaya</span>
                          ) : null}
                        </div>
                      </div>

                      <div>
                        <input
                          type="text"
                          value={item.notes}
                          onChange={e => handleUpdateExpenseRow(item.id, 'notes', e.target.value)}
                          placeholder="Catatan rincian..."
                          style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: `1px solid ${T.border}`, background: T.inputBg, color: T.txtPrimary, fontSize: '0.78rem' }}
                        />
                      </div>

                      <div>
                        <input
                          type="number"
                          value={item.amount}
                          onChange={e => handleUpdateExpenseRow(item.id, 'amount', e.target.value)}
                          placeholder="Jumlah Rp"
                          style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: `1px solid ${T.border}`, background: T.inputBg, color: T.txtPrimary, fontSize: '0.78rem' }}
                        />
                      </div>

                      <button type="button" onClick={() => handleRemoveExpenseRow(item.id)} style={{ background: 'none', border: 'none', color: T.danger, cursor: 'pointer', textAlign: 'center' }}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                  );
                })}

                <button
                  type="button"
                  onClick={handleAddExpenseRow}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', background: T.cardBg, border: `1px solid ${T.dangerBorder}`, borderRadius: '6px', color: T.danger, fontSize: '0.74rem', fontWeight: '800', cursor: 'pointer', width: 'fit-content' }}
                >
                  <Plus size={14} />
                  <span>Tambah Baris Pengeluaran</span>
                </button>
              </div>
            )}

            {/* FORM BODY FOR PEMBELIAN STOK */}
            {entryType === 'pembelian' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <datalist id="mrisExistingIngredientsList">
                  {(activeIngredients || []).map(ing => (
                    <option key={ing.id} value={ing.name}>{`[Stok: ${ing.stock || ing.qty || 0} ${ing.unit || ''}]`}</option>
                  ))}
                </datalist>

                <div style={{ fontSize: '0.76rem', color: T.txtSecondary, fontWeight: '700', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Rincian Pembelian Bahan Baku (Otomatis Menambah Stok Master):</span>
                  <span style={{ fontSize: '0.68rem', color: T.accentGold }}>*Stok bahan baku di master data akan otomatis bertambah</span>
                </div>

                {pembelianItems.map((item) => (
                  <div key={item.id} style={{ display: 'grid', gridTemplateColumns: '2fr 0.8fr 0.6fr 1fr 1.2fr 40px', gap: '8px', alignItems: 'center', background: T.cardBg2, padding: '8px 10px', borderRadius: '8px', border: `1px solid ${T.border}` }}>
                    <div>
                      <input
                        type="text"
                        list="mrisExistingIngredientsList"
                        value={item.ingredientName}
                        onChange={e => handleUpdatePembelianRow(item.id, 'ingredientName', e.target.value)}
                        placeholder="Nama Bahan Baku..."
                        style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: `1px solid ${T.border}`, background: T.inputBg, color: T.txtPrimary, fontSize: '0.78rem', fontWeight: '700' }}
                      />
                    </div>

                    <div>
                      <input
                        type="number"
                        min="0.1"
                        step="any"
                        value={item.qty}
                        onChange={e => handleUpdatePembelianRow(item.id, 'qty', e.target.value)}
                        placeholder="Qty"
                        style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: `1px solid ${T.border}`, background: T.inputBg, color: T.txtPrimary, fontSize: '0.78rem' }}
                      />
                    </div>

                    <div>
                      <input
                        type="text"
                        value={item.unit}
                        onChange={e => handleUpdatePembelianRow(item.id, 'unit', e.target.value)}
                        placeholder="Satuan"
                        style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: `1px solid ${T.border}`, background: T.inputBg, color: T.txtPrimary, fontSize: '0.78rem' }}
                      />
                    </div>

                    <div>
                      <input
                        type="number"
                        value={item.unitPrice}
                        onChange={e => handleUpdatePembelianRow(item.id, 'unitPrice', e.target.value)}
                        placeholder="Harga Satuan"
                        style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: `1px solid ${T.border}`, background: T.inputBg, color: T.txtPrimary, fontSize: '0.78rem' }}
                      />
                    </div>

                    <div style={{ fontSize: '0.80rem', fontWeight: '800', color: T.accentGold, textAlign: 'right', paddingRight: '4px' }}>
                      Rp {item.subtotal?.toLocaleString('id-ID')}
                    </div>

                    <button type="button" onClick={() => handleRemovePembelianRow(item.id)} style={{ background: 'none', border: 'none', color: T.danger, cursor: 'pointer', textAlign: 'center' }}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={handleAddPembelianRow}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', background: T.cardBg, border: `1px solid ${T.accentGold}`, borderRadius: '6px', color: T.accentGold, fontSize: '0.74rem', fontWeight: '800', cursor: 'pointer', width: 'fit-content' }}
                >
                  <Plus size={14} />
                  <span>Tambah Item Pembelian Bahan Baku</span>
                </button>
              </div>
            )}

            {/* FORM BODY FOR PENDAPATAN NON-SALES (KAS MASUK) */}
            {entryType === 'pendapatan' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ fontSize: '0.76rem', color: T.txtSecondary, fontWeight: '700', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Rincian Pendapatan Non-Sales (Sewa, Bagi Hasil, Catering, Pemasukan Kas Masuk):</span>
                  <span style={{ fontSize: '0.68rem', color: T.info }}>*Menambah Total Kas Masuk Outlet</span>
                </div>

                {pendapatanItems.map((item) => (
                  <div key={item.id} style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 1.2fr 40px', gap: '8px', alignItems: 'center', background: T.cardBg2, padding: '8px 10px', borderRadius: '8px', border: `1px solid ${T.border}` }}>
                    <div>
                      <input
                        type="text"
                        value={item.categoryName}
                        onChange={e => handleUpdatePendapatanRow(item.id, 'categoryName', e.target.value)}
                        placeholder="Kategori / Judul Pendapatan..."
                        style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: `1px solid ${T.border}`, background: T.inputBg, color: T.txtPrimary, fontSize: '0.78rem', fontWeight: '700' }}
                      />
                    </div>

                    <div>
                      <input
                        type="text"
                        value={item.notes}
                        onChange={e => handleUpdatePendapatanRow(item.id, 'notes', e.target.value)}
                        placeholder="Catatan rincian..."
                        style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: `1px solid ${T.border}`, background: T.inputBg, color: T.txtPrimary, fontSize: '0.78rem' }}
                      />
                    </div>

                    <div>
                      <input
                        type="number"
                        value={item.amount}
                        onChange={e => handleUpdatePendapatanRow(item.id, 'amount', e.target.value)}
                        placeholder="Jumlah Rp"
                        style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: `1px solid ${T.border}`, background: T.inputBg, color: T.txtPrimary, fontSize: '0.78rem' }}
                      />
                    </div>

                    <button type="button" onClick={() => handleRemovePendapatanRow(item.id)} style={{ background: 'none', border: 'none', color: T.danger, cursor: 'pointer', textAlign: 'center' }}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={handleAddPendapatanRow}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', background: T.cardBg, border: `1px solid ${T.infoBorder}`, borderRadius: '6px', color: T.info, fontSize: '0.74rem', fontWeight: '800', cursor: 'pointer', width: 'fit-content' }}
                >
                  <Plus size={14} />
                  <span>Tambah Baris Pendapatan Non-Sales</span>
                </button>
              </div>
            )}

          </div>
        )}

        {/* --- TAB 2: EXCEL / CSV BATCH UPLOAD --- */}
        {activeTab === 'excel' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {uploadError && (
              <div style={{ background: T.dangerBg, border: `1px solid ${T.dangerBorder}`, color: T.danger, padding: '10px 14px', borderRadius: '8px', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertCircle size={16} />
                <span>{uploadError}</span>
              </div>
            )}

            {uploadStep === 'select' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragging(false);
                    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                      processUploadedFile(e.dataTransfer.files[0]);
                    }
                  }}
                  style={{
                    border: `2px dashed ${isDragging ? T.info : T.border}`,
                    background: isDragging ? T.infoBg : T.cardBg2,
                    borderRadius: '12px',
                    padding: '36px 20px',
                    textAlign: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                  onClick={() => document.getElementById('excelUpdateFileInput').click()}
                >
                  <FileUp size={44} color={T.info} style={{ marginBottom: '10px' }} />
                  <div style={{ fontSize: '0.90rem', fontWeight: '800', color: T.txtPrimary }}>
                    Pilih atau Drag &amp; Drop File Excel Transaksi
                  </div>
                  <div style={{ fontSize: '0.74rem', color: T.txtSecondary, marginTop: '4px' }}>
                    Mendukung file format <strong>.xlsx</strong>, <strong>.xls</strong>, dan <strong>.csv</strong> (Mendukung Penjualan, Pendapatan Non-Sales, Pengeluaran, &amp; Pembelian Stok)
                  </div>

                  <input
                    id="excelUpdateFileInput"
                    type="file"
                    accept=".xlsx, .xls, .csv"
                    style={{ display: 'none' }}
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        processUploadedFile(e.target.files[0]);
                      }
                    }}
                  />
                </div>

                <div style={{ background: T.infoBg, border: `1px solid ${T.infoBorder}`, borderRadius: '10px', padding: '12px 14px' }}>
                  <div style={{ fontSize: '0.78rem', fontWeight: '800', color: T.info, marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Info size={15} />
                    <span>Template Standar Update Laporan</span>
                  </div>
                  <p style={{ fontSize: '0.72rem', color: T.txtSecondary, margin: '0 0 10px 0', lineHeight: 1.4 }}>
                    Gunakan template Excel resmi agar kolom teridentifikasi secara otomatis:
                    <br />
                    <code>Tipe Laporan</code> (Penjualan / Pemasukan / Pengeluaran / Pembelian), <code>Tanggal</code>, <code>Nama Outlet</code>, <code>Nama Produk / Kode Biaya / Pendapatan</code>, <code>Qty</code>, <code>Harga Satuan</code>, <code>Total Harga</code>, <code>Metode Pembayaran</code>.
                  </p>
                  <button
                    onClick={handleDownloadTemplate}
                    style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', background: T.info, border: 'none', borderRadius: '6px', color: '#ffffff', fontWeight: '800', fontSize: '0.72rem', cursor: 'pointer' }}
                  >
                    <Download size={14} />
                    <span>Download Template Update Laporan (.xlsx)</span>
                  </button>
                </div>
              </div>
            )}

            {uploadStep === 'preview' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: T.cardBg2, padding: '10px 14px', borderRadius: '8px', border: `1px solid ${T.border}` }}>
                  <div style={{ fontSize: '0.82rem', fontWeight: '800', color: T.txtPrimary }}>
                    {fileName} ({parsedRows.length} Baris Terbaca)
                  </div>
                  <button
                    onClick={() => { setUploadStep('select'); setParsedRows([]); }}
                    style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'transparent', border: `1px solid ${T.border}`, padding: '4px 8px', borderRadius: '6px', color: T.txtSecondary, fontSize: '0.72rem', cursor: 'pointer' }}
                  >
                    <RefreshCw size={12} />
                    <span>Pilih File Lain</span>
                  </button>
                </div>

                <div style={{ border: `1px solid ${T.border}`, borderRadius: '10px', overflow: 'hidden', maxHeight: '280px', overflowY: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.74rem', minWidth: '700px' }}>
                    <thead>
                      <tr style={{ background: T.tableHeaderBg, borderBottom: `1px solid ${T.border}`, color: T.txtSecondary, fontWeight: '800', textTransform: 'uppercase', fontSize: '0.66rem' }}>
                        <th style={{ padding: '8px 10px', whiteSpace: 'nowrap' }}>Tanggal</th>
                        <th style={{ padding: '8px 10px', whiteSpace: 'nowrap' }}>Outlet</th>
                        <th style={{ padding: '8px 10px' }}>Tipe</th>
                        <th style={{ padding: '8px 10px' }}>Item / Akun / Pendapatan</th>
                        <th style={{ padding: '8px 10px', textAlign: 'center' }}>Qty</th>
                        <th style={{ padding: '8px 10px', textAlign: 'right' }}>Harga Satuan</th>
                        <th style={{ padding: '8px 10px', textAlign: 'right' }}>Total Harga</th>
                        <th style={{ padding: '8px 10px' }}>Status</th>
                        <th style={{ padding: '8px 10px', textAlign: 'center' }}>Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parsedRows.map((r) => {
                        const isInc = r.type === 'penjualan' || r.type === 'pendapatan';
                        return (
                          <tr key={r.tempId} style={{ borderBottom: `1px solid ${T.border}` }}>
                            <td style={{ padding: '6px 10px', fontWeight: '800', color: T.accentGold, whiteSpace: 'nowrap' }}>
                              {r.date || reportDate}
                            </td>
                            <td style={{ padding: '6px 10px', color: T.txtSecondary, fontSize: '0.70rem', maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={r.outletName}>
                              {r.outletName || getOutletName(r.outletId || selectedOutletId)}
                            </td>
                            <td style={{ padding: '6px 10px', fontWeight: '800', color: isInc ? T.success : T.danger, whiteSpace: 'nowrap' }}>
                              {r.type === 'penjualan' ? 'Jual' : r.type === 'pendapatan' ? 'Masuk' : r.type === 'pembelian' ? 'Stok' : 'Keluar'}
                            </td>
                            <td style={{ padding: '6px 10px', color: T.txtPrimary, fontWeight: '700' }}>
                              {r.nameOrCode}
                            </td>
                            <td style={{ padding: '6px 10px', textAlign: 'center', fontWeight: '700', color: T.info }}>
                              {r.qty || 1}
                            </td>
                            <td style={{ padding: '6px 10px', textAlign: 'right', fontWeight: '700', color: T.txtSecondary }}>
                              Rp {(r.price || r.amount || 0).toLocaleString('id-ID')}
                            </td>
                            <td style={{ padding: '6px 10px', textAlign: 'right', fontWeight: '800', color: isInc ? T.success : T.danger }}>
                              Rp {r.totalSubtotal?.toLocaleString('id-ID')}
                            </td>
                            <td style={{ padding: '6px 10px' }}>
                              {r.isValid ? (
                                <span style={{ color: T.success, fontWeight: '800', fontSize: '0.68rem' }}>{r.validationMsg || 'Valid'}</span>
                              ) : (
                                <span style={{ color: T.danger, fontWeight: '800', fontSize: '0.68rem' }}>{r.validationMsg}</span>
                              )}
                            </td>
                            <td style={{ padding: '6px 10px', textAlign: 'center' }}>
                              <button
                                type="button"
                                onClick={() => handleRemoveParsedRow(r.tempId)}
                                style={{ background: 'none', border: 'none', color: T.danger, cursor: 'pointer' }}
                              >
                                <Trash2 size={15} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* MODAL FOOTER */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: `1px solid ${T.border}`, paddingTop: '14px' }}>
          <button onClick={onClose} style={{ padding: '8px 16px', background: T.cardBg2, border: `1px solid ${T.border}`, borderRadius: '8px', color: T.txtSecondary, fontWeight: '700', cursor: 'pointer' }}>
            Batal
          </button>
          
          <button
            onClick={handleExecuteSaveReport}
            style={{
              padding: '10px 22px',
              background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
              border: 'none',
              borderRadius: '10px',
              color: '#ffffff',
              fontWeight: '900',
              fontSize: '0.86rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 4px 16px rgba(34, 197, 94, 0.4)'
            }}
          >
            <CheckCircle2 size={18} />
            <span>Simpan Update Laporan &amp; Potong Stok</span>
          </button>
        </div>

      </div>
    </div>
  );
}
