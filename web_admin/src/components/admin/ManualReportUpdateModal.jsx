import React, { useState } from 'react';
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
  Info
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { getThemePalette } from '../../utils/themeUtils';

export default function ManualReportUpdateModal({ 
  show, 
  onClose, 
  masterData, 
  setMasterData, 
  userSession, 
  themeMode = 'dark' 
}) {
  if (!show) return null;

  const T = getThemePalette(themeMode);

  // Active Tab ('manual' | 'excel')
  const [activeTab, setActiveTab] = useState('manual');
  const [entryType, setEntryType] = useState('penjualan'); // 'penjualan' | 'pengeluaran'

  // Header Common States
  const [reportDate, setReportDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [selectedOutletId, setSelectedOutletId] = useState(() => masterData?.outlets?.[0]?.id || 1);
  const [authorName, setAuthorName] = useState(() => userSession?.name || userSession?.username || 'Super Admin');

  // Manual Form - Sales Items State
  const [salesItems, setSalesItems] = useState([
    {
      id: 1,
      productId: masterData?.products?.[0]?.id || '',
      productName: masterData?.products?.[0]?.name || '',
      qty: 1,
      price: masterData?.products?.[0]?.price || 25000,
      subtotal: masterData?.products?.[0]?.price || 25000,
      paymentMethod: 'Kas Kasir (Tunai)'
    }
  ]);

  // Manual Form - Expense Items State
  const [expenseItems, setExpenseItems] = useState([
    {
      id: 1,
      accountCode: '6001',
      categoryName: 'Beban Gaji & Operasional',
      notes: 'Pembelian Biaya Operasional Dapur',
      amount: 50000,
      paymentSource: 'Kas Kasir (Tunai)'
    }
  ]);

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

  // Generate next sequential Expense Code (6000 series: 6001, 6002, ..., 6016)
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

  // Generate next sequential Product SKU (PRD-001, PRD-002, ..., PRD-008)
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

  // Smart Normalize text: removes common prefixes (biaya, beban, etc.) and punctuation
  const normalizeText = (text) => {
    if (!text) return '';
    return String(text)
      .toLowerCase()
      .replace(/\b(biaya|beban|pembelian|pengeluaran|operasional|pembayaran|biaya-biaya)\b/gi, '')
      .replace(/[^a-z0-9]/g, '')
      .trim();
  };

  // Token & character set similarity ratio (0 to 1)
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

  // Smart Fuzzy Search for Expense Account (Prevents duplicate entries for similar names)
  const findMatchingExpenseAccount = (nameOrCode, customList = null) => {
    if (!nameOrCode) return null;
    const list = customList || (masterData?.chartOfAccounts || []);
    const rawClean = String(nameOrCode).toLowerCase().trim();
    const normInput = normalizeText(nameOrCode);

    // 1. Exact Match on Code or Raw Name
    let match = list.find(c => {
      const cleanCode = String(c.code || '').toLowerCase().trim();
      const cleanName = String(c.name || '').toLowerCase().trim();
      return cleanCode === rawClean || cleanName === rawClean;
    });
    if (match) return match;

    // 2. Normalized Text Match (ignoring "Biaya", "Beban", "Pengeluaran", etc.)
    match = list.find(c => {
      const normName = normalizeText(c.name);
      return normName && normInput && normName === normInput;
    });
    if (match) return match;

    // 3. High Fuzzy Similarity Match (>= 0.8)
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

  // Smart Fuzzy Search for Product (Prevents duplicate entries for similar product names)
  const findMatchingProduct = (nameOrSku, customList = null) => {
    if (!nameOrSku) return null;
    const list = customList || (masterData?.products || []);
    const rawClean = String(nameOrSku).toLowerCase().trim();
    const normInput = normalizeText(nameOrSku);

    // 1. Exact Match on SKU or Raw Name
    let match = list.find(p => {
      const cleanSku = String(p.sku || '').toLowerCase().trim();
      const cleanName = String(p.name || '').toLowerCase().trim();
      return cleanSku === rawClean || cleanName === rawClean;
    });
    if (match) return match;

    // 2. Normalized Text Match
    match = list.find(p => {
      const normName = normalizeText(p.name);
      return normName && normInput && normName === normInput;
    });
    if (match) return match;

    // 3. High Fuzzy Similarity Match (>= 0.85)
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
    const firstProd = masterData?.products?.[0] || null;
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

  // --- EXCEL TEMPLATE GENERATOR ---
  const handleDownloadTemplate = () => {
    const sampleRows = [
      {
        'Tipe Laporan': 'Penjualan',
        'Tanggal': reportDate,
        'Nama Outlet': getOutletName(selectedOutletId),
        'Nama Produk / Kode Biaya': masterData?.products?.[0]?.name || 'BEBEK PENYET',
        'Qty': 5,
        'Harga Satuan / Jumlah Rp': masterData?.products?.[0]?.price || 32000,
        'Metode Pembayaran': 'Kas Kasir (Tunai)',
        'Catatan': 'Penjualan Makan di Tempat (Dine-in)'
      },
      {
        'Tipe Laporan': 'Penjualan',
        'Tanggal': reportDate,
        'Nama Outlet': getOutletName(selectedOutletId),
        'Nama Produk / Kode Biaya': masterData?.products?.[1]?.name || 'AYAM GORENG',
        'Qty': 10,
        'Harga Satuan / Jumlah Rp': masterData?.products?.[1]?.price || 18000,
        'Metode Pembayaran': 'Bank BCA / EDC',
        'Catatan': 'Pesanan Takeaway'
      },
      {
        'Tipe Laporan': 'Pengeluaran',
        'Tanggal': reportDate,
        'Nama Outlet': getOutletName(selectedOutletId),
        'Nama Produk / Kode Biaya': '6003 - Beban Sewa Gedung Restoran',
        'Qty': 1,
        'Harga Satuan / Jumlah Rp': 250000,
        'Metode Pembayaran': 'Bank BCA / EDC',
        'Catatan': 'Pembayaran Sewa Tempat Harian'
      },
      {
        'Tipe Laporan': 'Pengeluaran',
        'Tanggal': reportDate,
        'Nama Outlet': getOutletName(selectedOutletId),
        'Nama Produk / Kode Biaya': '6002 - Beban Listrik, Air PLN & LPG',
        'Qty': 2,
        'Harga Satuan / Jumlah Rp': 45000,
        'Metode Pembayaran': 'Kas Kasir (Tunai)',
        'Catatan': 'Pembelian 2 Tabung Gas LPG 3kg'
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(sampleRows);
    worksheet['!cols'] = [
      { wch: 15 }, // Tipe Laporan
      { wch: 14 }, // Tanggal
      { wch: 32 }, // Nama Outlet
      { wch: 38 }, // Nama Produk / Kode Biaya
      { wch: 10 }, // Qty
      { wch: 22 }, // Harga Satuan / Jumlah Rp
      { wch: 22 }, // Metode Pembayaran
      { wch: 40 }  // Catatan
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Update Laporan Transaksi');
    XLSX.writeFile(workbook, `Template_Update_Laporan_MRIS_${reportDate}.xlsx`);
  };

  // --- EXCEL FILE PARSER ---
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
          const typeVal = String(row['Tipe Laporan'] || row['Tipe'] || row['type'] || 'Penjualan').trim();
          const isSales = typeVal.toLowerCase().includes('jual') || typeVal.toLowerCase().includes('sales');

          const dateVal = String(row['Tanggal'] || row['date'] || reportDate).trim();
          const outletVal = String(row['Nama Outlet'] || row['Outlet'] || getOutletName(selectedOutletId)).trim();

          const nameOrCode = String(
            row['Nama Produk / Kode Biaya'] || row['Nama Produk'] || row['Kode Biaya'] || row['Item'] || ''
          ).trim();

          const qtyVal = parseFloat(row['Qty'] || row['qty'] || 1);
          const amountVal = parseFloat(row['Harga Satuan / Jumlah Rp'] || row['Jumlah'] || row['Harga'] || 0);
          const paymentVal = String(row['Metode Pembayaran'] || row['Metode'] || 'Kas Kasir (Tunai)').trim();
          const notesVal = String(row['Catatan'] || row['Keterangan'] || '').trim();

          // Validation & Matching with Strict Deduplication & Auto Registration
          let isValid = true;
          let validationMsg = 'Valid';
          let matchedProduct = null;
          let matchedCOA = null;

          if (!nameOrCode) {
            isValid = false;
            validationMsg = isSales ? 'Nama produk kosong' : 'Nama biaya kosong';
          } else if (isSales) {
            matchedProduct = findMatchingProduct(nameOrCode);
            if (matchedProduct) {
              validationMsg = `✅ Produk Ada (${matchedProduct.sku})`;
            } else {
              validationMsg = `✨ Auto-Register Produk Baru`;
            }
          } else {
            matchedCOA = findMatchingExpenseAccount(nameOrCode);
            if (matchedCOA) {
              validationMsg = `✅ Biaya Ada [${matchedCOA.code}]`;
            } else {
              validationMsg = `✨ Auto-Generate Kode Biaya`;
            }
          }

          return {
            tempId: idx + 1,
            type: isSales ? 'penjualan' : 'pengeluaran',
            date: dateVal,
            outletName: outletVal,
            nameOrCode,
            qty: qtyVal,
            amount: amountVal,
            totalSubtotal: isSales ? (qtyVal * amountVal) : amountVal,
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
      } else {
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
        outletId: selectedOutletId,
        outletName: r.outletName || getOutletName(selectedOutletId),
        productName: r.nameOrCode,
        categoryName: r.nameOrCode,
        qty: r.qty,
        price: r.amount,
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

    // 1. Calculate Aggregates
    const salesRows = rowsToProcess.filter(r => r.type === 'penjualan');
    const expenseRows = rowsToProcess.filter(r => r.type === 'pengeluaran');

    const totalSalesOmset = salesRows.reduce((sum, r) => sum + r.subtotal, 0);
    const totalExpenseAmount = expenseRows.reduce((sum, r) => sum + r.subtotal, 0);
    const netCashFlow = totalSalesOmset - totalExpenseAmount;

    // 2. STOCK DEDUCTION ENGINE (Resep HPP & Stok)
    let updatedIngredients = [...(masterData?.ingredients || [])];
    const newStockMovements = [];

    salesRows.forEach(sRow => {
      const prod = currentProducts.find(p => String(p.id) === String(sRow.productId) || p.name.toLowerCase().trim() === sRow.productName.toLowerCase().trim());
      if (prod && prod.compositions && prod.compositions.length > 0) {
        prod.compositions.forEach(comp => {
          const ingIndex = updatedIngredients.findIndex(i => String(i.id) === String(comp.ingredient_id) || i.name.toLowerCase().trim() === comp.ingredient_name.toLowerCase().trim());
          if (ingIndex !== -1) {
            const deductQty = (parseFloat(comp.qty) || 0) * (parseFloat(sRow.qty) || 1);
            const currentStock = parseFloat(updatedIngredients[ingIndex].stock || updatedIngredients[ingIndex].qty || 0);
            const newStock = Math.max(0, currentStock - deductQty);

            updatedIngredients[ingIndex] = {
              ...updatedIngredients[ingIndex],
              stock: newStock,
              qty: newStock
            };

            newStockMovements.push({
              id: Date.now() + Math.random(),
              date: sRow.date,
              time: new Date().toLocaleTimeString('id-ID'),
              outlet_id: sRow.outletId,
              outlet_name: sRow.outletName,
              ingredient_id: updatedIngredients[ingIndex].id,
              ingredient_name: updatedIngredients[ingIndex].name,
              movement_type: 'Penjualan (Update Laporan)',
              qty_change: -deductQty,
              final_stock: newStock,
              unit: comp.unit || updatedIngredients[ingIndex].unit || 'Gram',
              notes: `Auto Pemotongan Stok dari Update Laporan Penjualan (${sRow.productName} x${sRow.qty})`,
              author: authorName
            });
          }
        });
      }
    });

    // 3. CONSTRUCT FINANCIAL REPORT RECORD
    const reportNo = `UPD-${reportDate.replace(/-/g, '')}-${String(Math.floor(Math.random() * 900) + 100)}`;

    const formattedExpenseBreakdown = expenseRows.map(e => ({
      code: e.accountCode,
      name: e.categoryName,
      category: e.categoryName,
      categoryName: e.categoryName,
      amount: e.subtotal,
      subtotal: e.subtotal,
      notes: e.notes || 'Update Laporan Pengeluaran'
    }));

    const formattedSalesBreakdown = salesRows.map(s => ({
      product_id: s.productId,
      product_name: s.productName,
      name: s.productName,
      qty: s.qty,
      price: s.price,
      subtotal: s.subtotal,
      amount: s.subtotal
    }));

    const newReportRecord = {
      id: Date.now(),
      report_no: reportNo,
      entry_date: reportDate,
      date: reportDate,
      outlet_id: selectedOutletId,
      outlet_name: getOutletName(selectedOutletId),
      net_sales: totalSalesOmset,
      gross_sales: totalSalesOmset,
      total_omset: totalSalesOmset,
      total_sales: totalSalesOmset,
      cash_sales: totalSalesOmset,
      non_cash_sales: 0,
      total_expense: totalExpenseAmount,
      total_pengeluaran: totalExpenseAmount,
      net_cash: netCashFlow,
      laba_bersih: netCashFlow,
      status: 'Disetujui',
      is_approved: true,
      author: authorName,
      created_by: authorName,
      source: 'Update Laporan Manual',
      sales_details: formattedSalesBreakdown,
      expense_details: formattedExpenseBreakdown,
      expenses_breakdown: formattedExpenseBreakdown,
      expense_rows: formattedExpenseBreakdown,
      created_at: new Date().toISOString()
    };

    // 4. ALSO CREATE FINANCIAL & SALES TRANSACTION RECORDS FOR DETAILED LOGS
    const newFinancialRecords = expenseRows.map(e => ({
      id: Date.now() + Math.random(),
      type: 'expense',
      code: e.accountCode,
      category: e.categoryName,
      notes: e.notes || 'Update Laporan Pengeluaran',
      amount: e.subtotal,
      outlet_id: selectedOutletId,
      outlet_name: getOutletName(selectedOutletId),
      date: reportDate,
      created_at: new Date().toISOString()
    }));

    const newSalesTxRecords = salesRows.map(s => ({
      id: Date.now() + Math.random(),
      type: 'sale',
      amount: s.subtotal,
      total: s.subtotal,
      items: [{ name: s.productName, qty: s.qty, price: s.price, subtotal: s.subtotal }],
      outlet_id: selectedOutletId,
      outlet_name: getOutletName(selectedOutletId),
      date: reportDate,
      timestamp: new Date().toISOString(),
      created_at: new Date().toISOString(),
      payment_method: s.paymentMethod || 'Kas Kasir (Tunai)'
    }));

    // 5. SAVE TO MASTER DATA STATE LOCALLY
    const updatedManualRecords = [newReportRecord, ...(masterData?.manualEntryRecords || [])];
    const updatedApprovedDaily = [newReportRecord, ...(masterData?.approvedFinanceDaily || [])];
    const updatedShiftReports = [newReportRecord, ...(masterData?.shiftReports || [])];
    const updatedMovements = [...newStockMovements, ...(masterData?.stockMovement || [])];
    const updatedFinRecords = [...newFinancialRecords, ...(masterData?.financialRecords || [])];
    const updatedSalesTx = [...newSalesTxRecords, ...(masterData?.salesTransactions || []), ...(masterData?.outletTransactions || [])];

    setMasterData({
      ...masterData,
      chartOfAccounts: currentAccounts,
      expenseMaster: currentExpenseMaster,
      products: currentProducts,
      ingredients: updatedIngredients,
      stockMovement: updatedMovements,
      manualEntryRecords: updatedManualRecords,
      approvedFinanceDaily: updatedApprovedDaily,
      shiftReports: updatedShiftReports,
      financialRecords: updatedFinRecords,
      salesTransactions: updatedSalesTx,
      outletTransactions: updatedSalesTx
    });

    let autoMsg = '';
    if (newAccountsCreatedCount > 0) {
      autoMsg += `\n• Auto-Generate Kode Biaya Baru: ${newAccountsCreatedCount} Akun terdaftar di Master Akuntansi.`;
    }
    if (newProductsCreatedCount > 0) {
      autoMsg += `\n• Auto-Register Produk Baru: ${newProductsCreatedCount} Produk terdaftar di Katalog Menu.`;
    }

    alert(`✅ BERHASIL UPDATE LAPORAN!\n\n• Laporan No: ${reportNo}\n• Total Penjualan: Rp ${totalSalesOmset.toLocaleString('id-ID')}\n• Total Pengeluaran: Rp ${totalExpenseAmount.toLocaleString('id-ID')}${autoMsg}\n• Stok Bahan Baku Terpotong: ${newStockMovements.length} item mutasi.\n• Laporan Laba/Rugi, Neraca & Stok telah diperbarui secara lokal!`);

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
                <span>+ Update Laporan Penjualan &amp; Pengeluaran</span>
              </h2>
              <p style={{ fontSize: '0.74rem', color: T.txtSecondary, margin: '2px 0 0 0' }}>
                Update transaksi manual / Excel yang secara otomatis memotong stok bahan baku dan memperbarui Laba Rugi, Neraca &amp; Arus Kas.
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

        {/* MODE NAVIGATION TABS */}
        <div style={{ display: 'flex', borderBottom: `1px solid ${T.border}`, gap: '12px' }}>
          <button
            onClick={() => setActiveTab('manual')}
            style={{
              padding: '8px 16px',
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'manual' ? `2px solid ${T.accentGold}` : '2px solid transparent',
              color: activeTab === 'manual' ? T.accentGold : T.txtSecondary,
              fontWeight: '800',
              fontSize: '0.82rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Plus size={16} />
            <span>✍️ Input Manual Transaksi</span>
          </button>

          <button
            onClick={() => setActiveTab('excel')}
            style={{
              padding: '8px 16px',
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'excel' ? `2px solid ${T.info}` : '2px solid transparent',
              color: activeTab === 'excel' ? T.info : T.txtSecondary,
              fontWeight: '800',
              fontSize: '0.82rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <FileSpreadsheet size={16} />
            <span>📊 Batch Upload File Excel / CSV</span>
          </button>
        </div>

        {/* --- TAB 1: MANUAL INPUT FORM --- */}
        {activeTab === 'manual' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            
            {/* TYPE TOGGLE (PENJUALAN vs PENGELUARAN) */}
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setEntryType('penjualan')}
                style={{
                  flex: 1,
                  padding: '10px',
                  borderRadius: '10px',
                  border: `1px solid ${entryType === 'penjualan' ? T.success : T.border}`,
                  background: entryType === 'penjualan' ? T.successBg : T.cardBg2,
                  color: entryType === 'penjualan' ? T.success : T.txtSecondary,
                  fontWeight: '800',
                  fontSize: '0.84rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
              >
                <TrendingUp size={18} />
                <span>🟢 Update Penjualan (Revenue &amp; Potong Stok)</span>
              </button>

              <button
                type="button"
                onClick={() => setEntryType('pengeluaran')}
                style={{
                  flex: 1,
                  padding: '10px',
                  borderRadius: '10px',
                  border: `1px solid ${entryType === 'pengeluaran' ? T.danger : T.border}`,
                  background: entryType === 'pengeluaran' ? T.dangerBg : T.cardBg2,
                  color: entryType === 'pengeluaran' ? T.danger : T.txtSecondary,
                  fontWeight: '800',
                  fontSize: '0.84rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
              >
                <TrendingDown size={18} />
                <span>🔴 Update Pengeluaran (Beban Operasional/OPEX)</span>
              </button>
            </div>

            {/* FORM BODY FOR SALES */}
            {entryType === 'penjualan' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <datalist id="mrisExistingProductsList">
                  {(masterData?.products || []).map(p => (
                    <option key={p.id} value={p.name}>{`[${p.sku}] Rp ${p.price?.toLocaleString('id-ID')}`}</option>
                  ))}
                </datalist>

                <div style={{ fontSize: '0.76rem', color: T.txtSecondary, fontWeight: '700', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>🛒 Rincian Menu Produk Terjual:</span>
                  <span style={{ fontSize: '0.68rem', color: T.info }}>*Ketik nama produk baru untuk pendaftaran otomatis</span>
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
                            <span style={{ color: T.success }}>✅ Terdaftar [{matched.sku}]</span>
                          ) : item.productName && item.productName.trim() ? (
                            <span style={{ color: T.accentGold }}>✨ Auto-Register Produk Baru</span>
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
                  <span>💸 Rincian Pengeluaran &amp; Beban Operasional:</span>
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
                            <span style={{ color: T.info }}>✅ Kode Akun [{matched.code}]</span>
                          ) : item.categoryName && item.categoryName.trim() ? (
                            <span style={{ color: T.accentGold }}>✨ Auto-Generate Kode Biaya</span>
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
                    Mendukung file format <strong>.xlsx</strong>, <strong>.xls</strong>, dan <strong>.csv</strong>
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
                    <code>Tipe Laporan</code>, <code>Tanggal</code>, <code>Nama Outlet</code>, <code>Shift</code>, <code>Nama Produk / Kode Biaya</code>, <code>Qty</code>, <code>Harga Satuan / Jumlah Rp</code>, <code>Metode Pembayaran</code>.
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
                    📄 {fileName} ({parsedRows.length} Baris Terbaca)
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
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.74rem' }}>
                    <thead>
                      <tr style={{ background: T.tableHeaderBg, borderBottom: `1px solid ${T.border}`, color: T.txtSecondary, fontWeight: '800', textTransform: 'uppercase', fontSize: '0.66rem' }}>
                        <th style={{ padding: '8px 10px' }}>Tipe</th>
                        <th style={{ padding: '8px 10px' }}>Item / Akun Biaya</th>
                        <th style={{ padding: '8px 10px', textAlign: 'center' }}>Qty</th>
                        <th style={{ padding: '8px 10px', textAlign: 'right' }}>Jumlah Rp</th>
                        <th style={{ padding: '8px 10px' }}>Status</th>
                        <th style={{ padding: '8px 10px', textAlign: 'center' }}>Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parsedRows.map((r) => (
                        <tr key={r.tempId} style={{ borderBottom: `1px solid ${T.border}` }}>
                          <td style={{ padding: '6px 10px', fontWeight: '800', color: r.type === 'penjualan' ? T.success : T.danger }}>
                            {r.type === 'penjualan' ? '🟢 Penjualan' : '🔴 Pengeluaran'}
                          </td>
                          <td style={{ padding: '6px 10px', color: T.txtPrimary, fontWeight: '700' }}>
                            {r.nameOrCode}
                          </td>
                          <td style={{ padding: '6px 10px', textAlign: 'center' }}>
                            {r.qty}
                          </td>
                          <td style={{ padding: '6px 10px', textAlign: 'right', fontWeight: '800', color: T.txtPrimary }}>
                            Rp {r.totalSubtotal?.toLocaleString('id-ID')}
                          </td>
                          <td style={{ padding: '6px 10px' }}>
                            {r.isValid ? (
                              <span style={{ color: T.success, fontWeight: '800', fontSize: '0.68rem' }}>{r.validationMsg || '✅ Valid'}</span>
                            ) : (
                              <span style={{ color: T.danger, fontWeight: '800', fontSize: '0.68rem' }}>❌ {r.validationMsg}</span>
                            )}
                          </td>
                          <td style={{ padding: '6px 10px', textAlign: 'center' }}>
                            <button
                              type="button"
                              onClick={() => handleRemoveParsedRow(r.tempId)}
                              style={{ background: 'none', border: 'none', color: T.danger, cursor: 'pointer', padding: '2px' }}
                              title="Hapus baris ini dari pratinjau"
                            >
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

          </div>
        )}

        {/* MODAL FOOTER */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', borderTop: `1px solid ${T.border}`, paddingTop: '14px', marginTop: '6px' }}>
          <button
            type="button"
            onClick={onClose}
            style={{ padding: '8px 18px', background: T.borderStrong, border: 'none', borderRadius: '8px', color: T.txtSecondary, fontSize: '0.80rem', fontWeight: '700', cursor: 'pointer' }}
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleExecuteSaveReport}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 22px',
              background: T.primaryBtn,
              border: 'none',
              borderRadius: '8px',
              color: T.navActiveTxt,
              fontSize: '0.82rem',
              fontWeight: '900',
              cursor: 'pointer',
              boxShadow: T.primaryBtnShadow
            }}
          >
            <CheckCircle2 size={16} />
            <span>Proses &amp; Simpan Update Laporan</span>
          </button>
        </div>

      </div>
    </div>
  );
}
