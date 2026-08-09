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
  themeMode = 'dark',
  editData = null
}) {
  if (!show) return null;

  const T = getThemePalette(themeMode);
  const isEditMode = !!editData;

  // Active Tab ('manual' | 'excel')
  const [activeTab, setActiveTab] = useState('manual');
  const [entryType, setEntryType] = useState(() => {
    if (editData) {
      const hasSales = (editData.sales_details || []).length > 0;
      return hasSales ? 'penjualan' : 'pengeluaran';
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

  // Manual Form - Sales Items State
  const [salesItems, setSalesItems] = useState(() => {
    if (editData && (editData.sales_details || []).length > 0) {
      return editData.sales_details.map((s, i) => ({
        id: i + 1,
        productId: s.product_id || '',
        productName: s.product_name || s.name || '',
        qty: s.qty || 1,
        price: s.price || 0,
        subtotal: s.subtotal || s.amount || 0,
        paymentMethod: 'Kas Kasir (Tunai)'
      }));
    }
    return [{
      id: 1,
      productId: masterData?.products?.[0]?.id || '',
      productName: masterData?.products?.[0]?.name || '',
      qty: 1,
      price: masterData?.products?.[0]?.price || 25000,
      subtotal: masterData?.products?.[0]?.price || 25000,
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
        'Tanggal': '10 April 2026',
        'Nama Outlet': 'Ayam Bakar Surabaya Tebing Tinggi',
        'Nama Item': 'Gas',
        'Qty': 10,
        'Harga Satuan': 20000,
        'Total Harga': 200000
      },
      {
        'Tanggal': '11 April 2026',
        'Nama Outlet': 'Ayam Pecak 2001 Seafood Tebing Tinggi',
        'Nama Item': 'Gas',
        'Qty': 15,
        'Harga Satuan': 20000,
        'Total Harga': 300000
      },
      {
        'Tanggal': '12 April 2026',
        'Nama Outlet': 'Ayam Bakar Surabaya Tebing Tinggi',
        'Nama Item': 'Gas',
        'Qty': 10,
        'Harga Satuan': 20000,
        'Total Harga': 200000
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(sampleRows);
    worksheet['!cols'] = [
      { wch: 18 }, // Tanggal
      { wch: 42 }, // Nama Outlet
      { wch: 30 }, // Nama Item
      { wch: 10 }, // Qty
      { wch: 16 }, // Harga Satuan
      { wch: 18 }  // Total Harga
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Update Laporan Transaksi');
    XLSX.writeFile(workbook, `Template_Update_Laporan_MRIS_${reportDate}.xlsx`);
  };

  // Helper: Parse Indonesian Text Date (e.g. "10 april 2026", "11 april 2026") into YYYY-MM-DD
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
          
          // Match outletVal against masterData.outlets to assign exact outlet_id
          const matchedOutletObj = (masterData?.outlets || []).find(o => 
            String(o.name).toLowerCase().trim() === outletVal.toLowerCase().trim() ||
            outletVal.toLowerCase().includes(String(o.name).toLowerCase().trim()) ||
            String(o.id) === outletVal
          );
          const matchedOutletId = matchedOutletObj ? matchedOutletObj.id : selectedOutletId;
          const matchedOutletName = matchedOutletObj ? matchedOutletObj.name : outletVal;

          const nameOrCode = String(
            row['Nama Item'] || row['Item'] || row['Nama Produk / Kode Biaya'] || row['Nama Produk'] || row['Kode Biaya'] || ''
          ).trim();

          const qtyVal = parseFloat(row['Qty'] || row['qty'] || row['Jumlah Qty'] || 1);
          const unitPriceVal = parseFloat(row['Harga Satuan'] || row['Harga'] || row['Harga Satuan / Jumlah Rp'] || 0);
          const rawTotalVal = parseFloat(row['Total Harga'] || row['Total'] || row['Subtotal'] || 0);
          const totalVal = rawTotalVal > 0 ? rawTotalVal : (qtyVal * unitPriceVal);

          const paymentVal = String(row['Metode Pembayaran'] || row['Metode'] || 'Kas Kasir (Tunai)').trim();
          const notesVal = String(row['Catatan'] || row['Keterangan'] || '').trim();

          // Type Auto Detection:
          // Check if row has explicit Tipe Laporan. If not, auto detect based on item name matching products vs expenses.
          let typeVal = String(row['Tipe Laporan'] || row['Tipe'] || row['type'] || '').trim().toLowerCase();
          let isSales = false;
          if (typeVal) {
            isSales = typeVal.includes('jual') || typeVal.includes('sales');
          } else {
            // Auto detect: If nameOrCode matches a product in masterData.products, treat as Sales (Penjualan). Otherwise Expense (Pengeluaran).
            const foundProduct = findMatchingProduct(nameOrCode);
            if (foundProduct) {
              isSales = true;
            } else {
              isSales = false;
            }
          }

          let isValid = true;
          let validationMsg = 'Valid';
          let matchedProduct = null;
          let matchedCOA = null;

          if (!nameOrCode) {
            isValid = false;
            validationMsg = isSales ? 'Nama item produk kosong' : 'Nama item biaya kosong';
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
            outletId: matchedOutletId,
            outletName: matchedOutletName,
            nameOrCode,
            qty: qtyVal,
            amount: unitPriceVal > 0 ? unitPriceVal : (qtyVal > 0 ? totalVal / qtyVal : totalVal),
            price: unitPriceVal > 0 ? unitPriceVal : (qtyVal > 0 ? totalVal / qtyVal : totalVal),
            totalSubtotal: totalVal,
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

    // 1. STOCK DEDUCTION ENGINE (Resep HPP & Stok) - per row pakai tanggal masing-masing
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
          expenseRows: []
        });
      }
      const grp = groupMap.get(gKey);
      if (row.type === 'penjualan') grp.salesRows.push(row);
      else grp.expenseRows.push(row);
    });

    // 3. CONSTRUCT REPORT RECORDS, FINANCIAL RECORDS & SALES TX PER GRUP TANGGAL+OUTLET
    const allNewReportRecords = [];
    const allNewFinancialRecords = [];
    const allNewSalesTxRecords = [];
    let totalSalesOmsetAll = 0;
    let totalExpenseAmountAll = 0;

    groupMap.forEach((grp) => {
      const grpSalesTotal = grp.salesRows.reduce((s, r) => s + r.subtotal, 0);
      const grpExpenseTotal = grp.expenseRows.reduce((s, r) => s + r.subtotal, 0);
      const grpNet = grpSalesTotal - grpExpenseTotal;
      totalSalesOmsetAll += grpSalesTotal;
      totalExpenseAmountAll += grpExpenseTotal;

      const grpReportNo = `UPD-${grp.date.replace(/-/g, '')}-${String(grp.outletId)}-${String(Math.floor(Math.random() * 900) + 100)}`;
      const grpTimestamp = `${grp.date}T${new Date().toTimeString().split(' ')[0]}`;

      const grpSalesBreakdown = grp.salesRows.map(s => ({
        product_id: s.productId, product_name: s.productName, name: s.productName,
        qty: s.qty, price: s.price, subtotal: s.subtotal, amount: s.subtotal
      }));
      const grpExpenseBreakdown = grp.expenseRows.map(e => ({
        code: e.accountCode, name: e.categoryName, category: e.categoryName,
        categoryName: e.categoryName, amount: e.subtotal, subtotal: e.subtotal,
        notes: e.notes || 'Update Laporan Pengeluaran'
      }));

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
        expense_details: grpExpenseBreakdown,
        expenses_breakdown: grpExpenseBreakdown,
        expense_rows: grpExpenseBreakdown,
        created_at: new Date().toISOString()
      });

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

    const netCashFlowAll = totalSalesOmsetAll - totalExpenseAmountAll;

    // 4. SAVE TO MASTER DATA STATE LOCALLY
    // Jika mode Edit: hapus laporan lama (by editData.id) sebelum tambah yang baru
    const oldId = isEditMode ? String(editData.id) : null;
    const filterOld = (arr) => oldId ? (arr || []).filter(r => String(r.id) !== oldId) : (arr || []);

    const updatedManualRecords = [...allNewReportRecords, ...filterOld(masterData?.manualEntryRecords)];
    const updatedApprovedDaily = [...allNewReportRecords, ...filterOld(masterData?.approvedFinanceDaily)];
    const updatedShiftReports  = [...allNewReportRecords, ...filterOld(masterData?.shiftReports)];
    const updatedMovements     = [...newStockMovements,   ...(masterData?.stockMovement || [])];
    const updatedFinRecords    = [...allNewFinancialRecords, ...(masterData?.financialRecords || [])];
    const updatedSalesTx       = [...allNewSalesTxRecords, ...(masterData?.salesTransactions || []), ...(masterData?.outletTransactions || [])];

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
    if (newAccountsCreatedCount > 0) autoMsg += `\n• Auto-Generate Kode Biaya Baru: ${newAccountsCreatedCount} Akun terdaftar.`;
    if (newProductsCreatedCount > 0) autoMsg += `\n• Auto-Register Produk Baru: ${newProductsCreatedCount} Produk terdaftar.`;

    alert(isEditMode
      ? `✅ LAPORAN BERHASIL DIUPDATE!\n\n• Laporan Lama: ${editData?.report_no || ''} telah digantikan\n• Total Penjualan: Rp ${totalSalesOmsetAll.toLocaleString('id-ID')}\n• Total Pengeluaran: Rp ${totalExpenseAmountAll.toLocaleString('id-ID')}${autoMsg}`
      : `✅ BERHASIL UPDATE LAPORAN!\n\n• Total Laporan Dibuat: ${allNewReportRecords.length} laporan (${groupMap.size} tanggal berbeda)\n• Total Penjualan: Rp ${totalSalesOmsetAll.toLocaleString('id-ID')}\n• Total Pengeluaran: Rp ${totalExpenseAmountAll.toLocaleString('id-ID')}\n• Net Cashflow: Rp ${netCashFlowAll.toLocaleString('id-ID')}${autoMsg}\n• Mutasi Stok: ${newStockMovements.length} item.`);

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
                <span>{isEditMode ? `✏️ Edit Laporan: ${editData?.report_no || ''}` : '+ Update Laporan Penjualan & Pengeluaran'}</span>
              </h2>
              <p style={{ fontSize: '0.74rem', color: T.txtSecondary, margin: '2px 0 0 0' }}>
                {isEditMode
                  ? 'Ubah data laporan yang sudah ada. Laporan lama akan digantikan setelah disimpan.'
                  : 'Update transaksi manual / Excel yang secara otomatis memotong stok bahan baku dan memperbarui Laba Rugi, Neraca & Arus Kas.'}
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
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.74rem', minWidth: '700px' }}>
                    <thead>
                      <tr style={{ background: T.tableHeaderBg, borderBottom: `1px solid ${T.border}`, color: T.txtSecondary, fontWeight: '800', textTransform: 'uppercase', fontSize: '0.66rem' }}>
                        <th style={{ padding: '8px 10px', whiteSpace: 'nowrap' }}>📅 Tanggal</th>
                        <th style={{ padding: '8px 10px', whiteSpace: 'nowrap' }}>🏪 Outlet</th>
                        <th style={{ padding: '8px 10px' }}>Tipe</th>
                        <th style={{ padding: '8px 10px' }}>Item / Akun Biaya</th>
                        <th style={{ padding: '8px 10px', textAlign: 'center' }}>Qty</th>
                        <th style={{ padding: '8px 10px', textAlign: 'right' }}>Harga Satuan</th>
                        <th style={{ padding: '8px 10px', textAlign: 'right' }}>Total Harga</th>
                        <th style={{ padding: '8px 10px' }}>Status</th>
                        <th style={{ padding: '8px 10px', textAlign: 'center' }}>Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parsedRows.map((r) => (
                        <tr key={r.tempId} style={{ borderBottom: `1px solid ${T.border}` }}>
                          <td style={{ padding: '6px 10px', fontWeight: '800', color: T.accentGold, whiteSpace: 'nowrap' }}>
                            {r.date || reportDate}
                          </td>
                          <td style={{ padding: '6px 10px', color: T.txtSecondary, fontSize: '0.70rem', maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={r.outletName}>
                            {r.outletName || getOutletName(r.outletId || selectedOutletId)}
                          </td>
                          <td style={{ padding: '6px 10px', fontWeight: '800', color: r.type === 'penjualan' ? T.success : T.danger, whiteSpace: 'nowrap' }}>
                            {r.type === 'penjualan' ? '🟢 Jual' : '🔴 Keluar'}
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
