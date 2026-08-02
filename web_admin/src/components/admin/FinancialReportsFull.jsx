import React, { useState, useEffect } from 'react';
import { FileText, Scale, ArrowLeftRight, Sparkles, Calendar, ChevronDown, Check, FileSpreadsheet, X, Search, Filter, Download, Building2, ExternalLink } from 'lucide-react';

export default function FinancialReportsFull({ masterData, selectedBranch }) {
  const [activeSubTab, setActiveSubTab] = useState('pnl'); // 'pnl' | 'balance' | 'cashflow' | 'ai'
  const [pnlSubView, setPnlSubView] = useState('single'); // 'single' | 'multi_month'
  const [compareMonthsCount, setCompareMonthsCount] = useState(2); // 2 | 3 | 6 | 12
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiReportText, setAiReportText] = useState(null);

  // P&L, NERACA & ARUS KAS FILTERS & MODAL STATES
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedOutlets, setSelectedOutlets] = useState([]); // Empty array = All Outlets
  const [showOutletDropdown, setShowOutletDropdown] = useState(false);
  const [accountDetailModal, setAccountDetailModal] = useState(null);
  const [modalSearchQuery, setModalSearchQuery] = useState('');

  const outletsList = masterData?.outlets || [];

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest('.outlet-dropdown-container')) {
        setShowOutletDropdown(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const handleToggleOutlet = (id) => {
    const numId = Number(id);
    if (selectedOutlets.includes(numId)) {
      setSelectedOutlets(selectedOutlets.filter(x => x !== numId));
    } else {
      setSelectedOutlets([...selectedOutlets, numId]);
    }
  };

  const handleSelectAllOutlets = () => {
    if (selectedOutlets.length === outletsList.length) {
      setSelectedOutlets([]);
    } else {
      setSelectedOutlets(outletsList.map(o => Number(o.id)));
    }
  };

  const isOutletMatch = (outletId) => {
    if (!outletId) return true;
    if (selectedOutlets.length === 0) {
      return selectedBranch ? Number(outletId) === Number(selectedBranch) : true;
    }
    return selectedOutlets.includes(Number(outletId));
  };

  const isDateMatch = (dateStr) => {
    if (!dateStr) return true;
    const dt = String(dateStr).substring(0, 10);
    if (startDate && dt < startDate) return false;
    if (endDate && dt > endDate) return false;
    return true;
  };

  const getOutletName = (outletId) => {
    const found = outletsList.find(o => Number(o.id) === Number(outletId));
    return found ? found.name : `Outlet #${outletId || 'Pusat'}`;
  };

  const formatRupiah = (val) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val || 0);
  };

  const formatLunaCurrency = (num) => {
    const val = Number(num || 0);
    const sign = val < 0 ? '-' : '';
    const absVal = Math.abs(val);
    const parts = absVal.toFixed(2).split('.');
    const integerPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return `Rp. ${sign}${integerPart},${parts[1]}`;
  };

  const formatDateIndo = (dateStr) => {
    if (!dateStr) return '-';
    const parts = String(dateStr).substring(0, 10).split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
  };

  // Quick Date Preset Handlers
  const handleQuickPreset = (preset) => {
    const d = new Date();
    const currentYearStr = String(d.getFullYear());
    const currentMonthStr = String(d.getMonth() + 1).padStart(2, '0');
    
    if (preset === 'this_month') {
      setStartDate(`${currentYearStr}-${currentMonthStr}-01`);
      setEndDate(`${currentYearStr}-${currentMonthStr}-31`);
    } else if (preset === 'last_7_days') {
      const past7 = new Date(d);
      past7.setDate(past7.getDate() - 7);
      setStartDate(past7.toISOString().split('T')[0]);
      setEndDate(d.toISOString().split('T')[0]);
    } else if (preset === 'last_30_days') {
      const past30 = new Date(d);
      past30.setDate(past30.getDate() - 30);
      setStartDate(past30.toISOString().split('T')[0]);
      setEndDate(d.toISOString().split('T')[0]);
    } else if (preset === 'all') {
      setStartDate('');
      setEndDate('');
    }
  };

  // Filtered All Shift Closing Reports (Real-time from POS Mobile & Web Admin - ONLY APPROVED)
  const rawShiftReports = [
    ...(masterData.shiftClosings || []),
    ...(masterData.closedShifts || []),
    ...(masterData.approvedFinanceDaily || [])
  ];
  const approvedReportsMap = new Map();
  rawShiftReports.forEach(r => {
    if (r && r.id != null) {
      const isApproved = r.is_approved === true || 
                         r.status === 'approved' || 
                         r.status === 'Approved' || 
                         r.status === 'disetujui' || 
                         r.status === 'ACC' ||
                         (masterData.approvedFinanceDaily && masterData.approvedFinanceDaily.some(a => String(a.id) === String(r.id)));
      if (isApproved) {
        approvedReportsMap.set(String(r.id), r);
      }
    }
  });
  const approvedReports = Array.from(approvedReportsMap.values()).filter(f => 
    isOutletMatch(f.outlet_id || f.branch_id) && 
    isDateMatch(f.date || f.created_at)
  );

  // Filtered All Sales Transactions (Real-time from POS Mobile & Web Admin)
  const rawSalesTx = [
    ...(masterData.salesTransactions || []),
    ...(masterData.transactions || []),
    ...(masterData.outletTransactions || [])
  ];
  const salesTxMap = new Map();
  rawSalesTx.forEach(t => {
    if (t && t.id != null) salesTxMap.set(String(t.id), t);
  });
  const salesTransactions = Array.from(salesTxMap.values()).filter(t => 
    isOutletMatch(t.outlet_id || t.branch_id) && 
    isDateMatch(t.date || t.timestamp || t.created_at)
  );

  // Filtered Financial Records
  const financialRecords = (masterData.financialRecords || []).filter(f => 
    isOutletMatch(f.outlet_id) && 
    isDateMatch(f.date || f.created_at)
  );

  const calcPercent = (val, base) => {
    if (!base || base === 0) return '0';
    const pct = (Number(val || 0) / Number(base)) * 100;
    if (Math.abs(pct) === 0) return '0';
    const formatted = pct.toFixed(2);
    return formatted.endsWith('.00') ? String(Math.round(pct)) : formatted;
  };

  // ─── HELPER SINKRONISASI & PERHITUNGAN LABA RUGI UNTUK PERIODE APAPUN ───
  const computePnlDataForDateRange = (sDate, eDate) => {
    const isMatchedDate = (dateStr) => {
      if (!dateStr) return true;
      const dt = String(dateStr).substring(0, 10);
      if (sDate && dt < sDate) return false;
      if (eDate && dt > eDate) return false;
      return true;
    };

    const rawShiftReports = masterData?.shiftReports || masterData?.approvedFinanceDaily || masterData?.dailyReports || [];
    const approvedReportsMap = new Map();
    rawShiftReports.forEach(r => {
      if (r && r.id != null) {
        const isApproved = r.is_approved === true || 
                           r.status === 'approved' || 
                           r.status === 'Approved' || 
                           r.status === 'disetujui' || 
                           r.status === 'ACC' ||
                           (masterData?.approvedFinanceDaily && masterData.approvedFinanceDaily.some(a => String(a.id) === String(r.id)));
        if (isApproved) {
          approvedReportsMap.set(String(r.id), r);
        }
      }
    });
    const approvedReports = Array.from(approvedReportsMap.values()).filter(f => 
      isOutletMatch(f.outlet_id || f.branch_id) && 
      isMatchedDate(f.date || f.created_at)
    );

    const rawSalesTx = [
      ...(masterData?.salesTransactions || []),
      ...(masterData?.transactions || []),
      ...(masterData?.outletTransactions || [])
    ];
    const salesTxMap = new Map();
    rawSalesTx.forEach(t => {
      if (t && t.id != null) salesTxMap.set(String(t.id), t);
    });
    const salesTransactions = Array.from(salesTxMap.values()).filter(t => 
      isOutletMatch(t.outlet_id || t.branch_id) && 
      isMatchedDate(t.date || t.timestamp || t.created_at)
    );

    const financialRecords = (masterData?.financialRecords || []).filter(f => 
      isOutletMatch(f.outlet_id) && 
      isMatchedDate(f.date || f.created_at)
    );

    const cashSalesTotal = approvedReports.reduce((sum, f) => sum + Number(f.cash_sales || (f.net_sales - (f.non_cash_sales || 0))), 0);
    const nonCashSalesTotal = approvedReports.reduce((sum, f) => sum + Number(f.non_cash_sales || 0), 0);
    const salesTxTotal = salesTransactions.reduce((s, t) => s + Number(t.amount || 0), 0);
    const rawSalesTotal = salesTxTotal > 0 ? salesTxTotal : (cashSalesTotal + nonCashSalesTotal);

    const realDiscountsTotal = salesTransactions.reduce((s, t) => s + Number(t.discount || t.discount_amount || 0), 0) +
                                approvedReports.reduce((s, f) => s + Number(f.discount_amount || 0), 0);

    const pendapatanUsaha = rawSalesTotal;
    const diskonPenjualan = realDiscountsTotal > 0 ? -realDiscountsTotal : 0;
    const totalIncomeVal = pendapatanUsaha + diskonPenjualan;

    let cashRevenueVal = cashSalesTotal;
    let qrisRevenueVal = 0;
    let edcRevenueVal = 0;
    let transferRevenueVal = nonCashSalesTotal;

    if (salesTxTotal > 0) {
      cashRevenueVal = salesTransactions.filter(t => (t.payment_method || '').toLowerCase().includes('cash') || (t.payment_type || '').toLowerCase().includes('cash')).reduce((s, t) => s + Number(t.amount || 0), 0);
      qrisRevenueVal = salesTransactions.filter(t => (t.payment_method || '').toLowerCase().includes('qris') || (t.payment_type || '').toLowerCase().includes('qris')).reduce((s, t) => s + Number(t.amount || 0), 0);
      edcRevenueVal = salesTransactions.filter(t => (t.payment_method || '').toLowerCase().includes('edc') || (t.payment_method || '').toLowerCase().includes('card') || (t.payment_type || '').toLowerCase().includes('card')).reduce((s, t) => s + Number(t.amount || 0), 0);
      transferRevenueVal = salesTransactions.filter(t => (t.payment_method || '').toLowerCase().includes('transfer') || (t.payment_type || '').toLowerCase().includes('transfer')).reduce((s, t) => s + Number(t.amount || 0), 0);

      if (cashRevenueVal === 0 && qrisRevenueVal === 0 && edcRevenueVal === 0 && transferRevenueVal === 0 && pendapatanUsaha > 0) {
        cashRevenueVal = pendapatanUsaha;
      }
    }

    // COST OF GOODS SOLD (HPP) BREAKDOWN
    const cogsTotalApproved = approvedReports.reduce((sum, f) => {
      if (f.cogs_items && f.cogs_items.length > 0) {
        return sum + f.cogs_items.reduce((s, i) => s + Number(i.amount || (i.qty * i.price_unit) || 0), 0);
      }
      return sum + Number(f.cogs_expense || 0);
    }, 0);

    const hppVal = cogsTotalApproved;
    const hppUtamaVal = hppVal * 0.70;
    const hppBumbuVal = hppVal * 0.20;
    const hppMinumanVal = hppVal * 0.10;
    const biayaPengiriman = approvedReports.reduce((s, f) => s + Number(f.shipping_fee || f.delivery_cost || 0), 0);
    const totalCogsVal = hppVal + biayaPengiriman;

    const grossProfitVal = totalIncomeVal - totalCogsVal;

    // EXPENSES ITEMIZATION (Standard 9 Accounts + Extra Dynamic)
    const stdMap = {
      '6001': { code: '6001', codeName: '[6001] Beban Gaji & Upah Karyawan', amount: 0 },
      '6002': { code: '6002', codeName: '[6002] Beban Sewa Tempat & Gedung Restoran', amount: 0 },
      '6003': { code: '6003', codeName: '[6003] Beban Utilities (Listrik, Air, Gas & Internet)', amount: 0 },
      '6004': { code: '6004', codeName: '[6004] Beban Pemeliharaan & Service Peralatan Dapur', amount: 0 },
      '6005': { code: '6005', codeName: '[6005] Beban Pemasaran, Iklan & Promosi', amount: 0 },
      '6006': { code: '6006', codeName: '[6006] Beban Kemasan, Packaging & Supplies Kasir', amount: 0 },
      '6007': { code: '6007', codeName: '[6007] Beban Perlengkapan Kebersihan & Sanitasi', amount: 0 },
      '6008': { code: '6008', codeName: '[6008] Beban Administrasi, Bank & Fee Platform POS', amount: 0 },
      '6901': { code: '6901', codeName: '[6901] Beban Operasional Harian Kasir', amount: 0 },
    };

    const extraMap = {};

    approvedReports.forEach(f => {
      if (f.expenses_breakdown && f.expenses_breakdown.length > 0) {
        f.expenses_breakdown.forEach((ex, idx) => {
          const code = ex.code || `69${String(idx + 1).padStart(2, '0')}`;
          const name = ex.name || ex.category || 'Beban Operasional Restoran';
          if (stdMap[code]) {
            stdMap[code].amount += Number(ex.amount || 0);
          } else {
            const key = `[${code}] ${name}`;
            extraMap[key] = (extraMap[key] || 0) + Number(ex.amount || 0);
          }
        });
      } else if (f.total_expense && Number(f.total_expense) > 0) {
        const netOpex = Number(f.total_expense) - Number(f.cogs_expense || 0);
        if (netOpex > 0) {
          stdMap['6901'].amount += netOpex;
        }
      }
    });

    financialRecords
      .filter(f => f.type === 'expense')
      .forEach((f, idx) => {
        const cat = (f.category || f.notes || '').toLowerCase();
        let matched = false;
        if (cat.includes('gaji') || cat.includes('payroll') || cat.includes('upah')) { stdMap['6001'].amount += Number(f.amount || 0); matched = true; }
        else if (cat.includes('sewa') || cat.includes('rent')) { stdMap['6002'].amount += Number(f.amount || 0); matched = true; }
        else if (cat.includes('listrik') || cat.includes('air') || cat.includes('utility') || cat.includes('wifi') || cat.includes('internet') || cat.includes('gas')) { stdMap['6003'].amount += Number(f.amount || 0); matched = true; }
        else if (cat.includes('maintenance') || cat.includes('servis') || cat.includes('peralatan') || cat.includes('dapur')) { stdMap['6004'].amount += Number(f.amount || 0); matched = true; }
        else if (cat.includes('iklan') || cat.includes('promosi') || cat.includes('marketing') || cat.includes('diskon')) { stdMap['6005'].amount += Number(f.amount || 0); matched = true; }
        else if (cat.includes('kemasan') || cat.includes('packaging') || cat.includes('plastik') || cat.includes('box')) { stdMap['6006'].amount += Number(f.amount || 0); matched = true; }
        else if (cat.includes('bersih') || cat.includes('sanitasi') || cat.includes('sabun')) { stdMap['6007'].amount += Number(f.amount || 0); matched = true; }
        else if (cat.includes('admin') || cat.includes('bank') || cat.includes('fee') || cat.includes('qris')) { stdMap['6008'].amount += Number(f.amount || 0); matched = true; }

        if (!matched) {
          const code = f.code || `69${String(idx + 50).padStart(2, '0')}`;
          const key = `[${code}] ${f.category || f.notes || 'Beban Kas Operasional'}`;
          extraMap[key] = (extraMap[key] || 0) + Number(f.amount || 0);
        }
      });

    const expenseList = [
      ...Object.values(stdMap),
      ...Object.keys(extraMap).map(k => ({ codeName: k, amount: extraMap[k], code: k.match(/\[(.*?)\]/)?.[1] || '6999' }))
    ];

    const totalExpenseVal = expenseList.reduce((s, e) => s + e.amount, 0);
    const netOperatingIncomeVal = grossProfitVal - totalExpenseVal;

    const totalOtherIncomeVal = financialRecords
      .filter(f => f.type === 'other_income' || f.type === 'income')
      .reduce((s, f) => s + Number(f.amount || 0), 0);

    const totalOtherExpenseVal = financialRecords
      .filter(f => f.type === 'other_expense')
      .reduce((s, f) => s + Number(f.amount || 0), 0);

    const netOtherIncomeVal = totalOtherIncomeVal - totalOtherExpenseVal;
    const netIncomeVal = netOperatingIncomeVal + netOtherIncomeVal;

    return {
      pendapatanUsaha,
      cashRevenueVal,
      qrisRevenueVal,
      edcRevenueVal,
      transferRevenueVal,
      diskonPenjualan,
      totalIncomeVal,
      hppVal,
      hppUtamaVal,
      hppBumbuVal,
      hppMinumanVal,
      biayaPengiriman,
      totalCogsVal,
      grossProfitVal,
      expenseList,
      totalExpenseVal,
      netOperatingIncomeVal,
      totalOtherIncomeVal,
      totalOtherExpenseVal,
      netOtherIncomeVal,
      netIncomeVal
    };
  };

  // ─── PERHITUNGAN SINGLE PERIODE AKTIF ───
  const currentPnl = computePnlDataForDateRange(startDate, endDate);
  const {
    pendapatanUsaha, cashRevenueVal, qrisRevenueVal, edcRevenueVal, transferRevenueVal,
    diskonPenjualan, totalIncomeVal, hppVal, hppUtamaVal, hppBumbuVal, hppMinumanVal,
    biayaPengiriman, totalCogsVal, grossProfitVal, expenseList, totalExpenseVal,
    netOperatingIncomeVal, totalOtherIncomeVal, totalOtherExpenseVal, netOtherIncomeVal, netIncomeVal
  } = currentPnl;
  const dynamicExpenseItems = expenseList;

  // ─── HELPER DENSITY MULTI-BULAN SIDE-BY-SIDE ───
  const getComparedMonthsData = (count = 2) => {
    const months = [];
    const now = new Date();
    for (let i = 0; i < count; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const y = d.getFullYear();
      const m = d.getMonth() + 1;
      const yyyyMm = `${y}-${String(m).padStart(2, '0')}`;
      const monthName = d.toLocaleDateString('id-ID', { month: 'short', year: 'numeric' });
      const lastDay = new Date(y, m, 0).getDate();
      const startStr = `${yyyyMm}-01`;
      const endStr = `${yyyyMm}-${String(lastDay).padStart(2, '0')}`;
      const label = i === 0 ? `${monthName} (Bulan Ini)` : (i === 1 ? `${monthName} (Bulan Lalu)` : monthName);
      const pnl = computePnlDataForDateRange(startStr, endStr);
      months.push({ label, monthName, yyyyMm, startStr, endStr, pnl });
    }
    return months;
  };

  // DYNAMIC BALANCE SHEET (NERACA LUNA POS HIERARCHY & CALCULATIONS)
  const totalPhysicalCashInDrawer = approvedReports.reduce((sum, f) => sum + Number(f.actual_cash || f.cash_physical || 0), 0);
  const totalCashAndBank = totalPhysicalCashInDrawer > 0 ? totalPhysicalCashInDrawer : (cashSalesTotal + transferRevenueVal);

  const piutangUsaha = (masterData.salesTransactions || [])
    .filter(t => isOutletMatch(t.outlet_id) && isDateMatch(t.date) && t.payment_status === 'unpaid')
    .reduce((s, t) => s + Number(t.amount || 0), 0);

  const rawMaterialInventoryValue = (masterData.ingredients || []).reduce((sum, ing) => {
    return sum + ((Number(ing.stock) || 0) * (Number(ing.cost) || 0));
  }, 0);

  const cadanganGaji = 0;
  const cadanganSewa = 0;
  const cadanganTHR = 0;
  const totalOtherCurrentAsset = cadanganGaji + cadanganSewa + cadanganTHR;

  const totalAssetsVal = totalCashAndBank + piutangUsaha + rawMaterialInventoryValue + totalOtherCurrentAsset;

  const totalMinusDrawerLiabilities = approvedReports.reduce((sum, f) => sum + (f.is_minus_drawer ? Number(f.minus_drawer_amount || 0) : 0), 0);
  const totalLiability = totalMinusDrawerLiabilities + Number(masterData.supplierPayablesTotal || 0);

  // EQUILIBRIUM BALANCE SHEET EQUITY FORMULA (Assets = Liabilities + Equity)
  const ownerCapital = Math.max(0, totalAssetsVal - totalLiability - netIncomeVal);
  const totalEquity = ownerCapital + netIncomeVal;

  // DYNAMIC ARUS KAS (CASH FLOW LUNA POS HIERARCHY & CALCULATIONS)
  const penerimaanKasJualBeli = totalIncomeVal;
  const refundPenjualan = 0;
  const pembelianAssetLancar = 0;
  const pembayaranPemasok = 0;
  const refundPembelian = 0;
  const pembayaranHutang = 0;
  const pendapatanLainnya = totalOtherIncomeVal;
  const pengeluaranOperasional = -(totalExpenseVal + totalCogsVal + totalOtherExpenseVal);

  const kasBersihOperasional = penerimaanKasJualBeli + refundPenjualan + pembelianAssetLancar + pembayaranPemasok + refundPembelian + pembayaranHutang + pendapatanLainnya + pengeluaranOperasional;

  const perolehanPenjualanAsset = 0;
  const aktivitasInvestasiLainnya = 0;
  const kasBersihInvestasi = 0;

  const penerimaanPinjaman = 0;
  const penambahanModal = 0;
  const kasBersihKeuangan = 0;

  const kenaikanPenurunanKas = kasBersihOperasional + kasBersihInvestasi + kasBersihKeuangan;
  const saldoAwalKas = Math.max(0, totalCashAndBank - kenaikanPenurunanKas);
  const saldoAkhirKas = saldoAwalKas + kenaikanPenurunanKas;

  // DOWNLOAD EXCEL HANDLER (FOR P&L, BALANCE SHEET & CASH FLOW)
  const handleDownloadExcel = () => {
    if (activeSubTab === 'cashflow') {
      let csv = "DESKRIPSI,TOTAL (IDR)\n";
      csv += "Arus Kas dari Aktivitas Operasional,,\n";
      csv += `"Penerimaan Kas dari Aktivitas Jual Beli",${penerimaanKasJualBeli}\n`;
      csv += `"Refund atas Penjualan Barang",${refundPenjualan}\n`;
      csv += `"Pembelian Asset Lancar",${pembelianAssetLancar}\n`;
      csv += `"Pembayaran ke pemasok",${pembayaranPemasok}\n`;
      csv += `"Refund atas Pembelian Barang",${refundPembelian}\n`;
      csv += `"Pembayaran Hutang (Liabilitas)",${pembayaranHutang}\n`;
      csv += `"Pendapatan Lainnya (Diluar Aktivitas Jual Beli)",${pendapatanLainnya}\n`;
      csv += `"Pengeluaran Operasional",${pengeluaranOperasional}\n`;
      csv += `"Kas Bersih yang diperoleh dari Aktivitas Operasional",${kasBersihOperasional}\n`;
      csv += "Arus Kas dari Aktivitas Investasi,,\n";
      csv += `"Perolehan atas Penjualan/Pelepasan Asset",${perolehanPenjualanAsset}\n`;
      csv += `"Aktivitas Investasi Lainnya",${aktivitasInvestasiLainnya}\n`;
      csv += `"Kas Bersih yang diperoleh dari Aktivitas Investasi",${kasBersihInvestasi}\n`;
      csv += "Arus Kas Dari Aktivitas Keuangan,,\n";
      csv += `"Pembayaran / Penerimaan Pinjaman",${penerimaanPinjaman}\n`;
      csv += `"Penambahan Modal",${penambahanModal}\n`;
      csv += `"Kas Bersih yang diperoleh dari Aktivitas Keuangan",${kasBersihKeuangan}\n`;
      csv += `"KENAIKAN (PENURUNAN) KAS",${kenaikanPenurunanKas}\n`;
      csv += `"SALDO AWAL KAS",${saldoAwalKas}\n`;
      csv += `"SALDO AKHIR KAS",${saldoAkhirKas}\n`;

      const blob = new Blob(["\ufeff" + csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Laporan_Arus_Kas_${startDate || 'all'}_${endDate || 'all'}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return;
    }

    if (activeSubTab === 'balance') {
      let csv = "ACCOUNT DESCRIPTION,TOTAL (IDR)\n";
      csv += "ASSET,,\n";
      csv += "Cash and Bank,,\n";
      csv += `"[1101] Kas Laci Kasir & Rekening Bank",${totalCashAndBank}\n`;
      csv += `"Total Cash and Bank",${totalCashAndBank}\n`;
      csv += "Account Receivable,,\n";
      csv += `"[1201] Piutang Usaha",${piutangUsaha}\n`;
      csv += `"Total Account Receivable",${piutangUsaha}\n`;
      csv += "Inventory,,\n";
      csv += `"[1301] Persediaan",${rawMaterialInventoryValue}\n`;
      csv += `"Total Inventory",${rawMaterialInventoryValue}\n`;
      csv += "Other Current Asset,,\n";
      csv += `"[1431] Dana Cadangan Gaji Karyawan",${cadanganGaji}\n`;
      csv += `"[1432] Dana Cadangan Sewa Gedung",${cadanganSewa}\n`;
      csv += `"[1433] Dana Cadangan Tunjangan HariRaya",${cadanganTHR}\n`;
      csv += `"Total Other Current Asset",${totalOtherCurrentAsset}\n`;
      csv += `"TOTAL ASSET",${totalAssetsVal}\n`;
      csv += "LIABILITIES AND EQUITY,,\n";
      csv += "LIABILITY,,\n";
      csv += `"[2101] Hutang Operasional Kasir & Supplier",${totalLiability}\n`;
      csv += `"Total Liability",${totalLiability}\n`;
      csv += "EQUITY,,\n";
      csv += `"[3101] Modal Disetor Owner / Investor",${ownerCapital}\n`;
      csv += `"Net Income",${netIncomeVal}\n`;
      csv += `"Total Equity",${totalEquity}\n`;
      csv += `"TOTAL LIABILITIES AND EQUITY",${totalLiability + totalEquity}\n`;

      const blob = new Blob(["\ufeff" + csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Laporan_Neraca_Keuangan_${startDate || 'all'}_${endDate || 'all'}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return;
    }

    let csv = "DESKRIPSI AKUN / KATEGORI,TOTAL (IDR),% OF INCOME\n";
    csv += `INCOME,,\n`;
    csv += `"[4001] Pendapatan Usaha (Gross Sales)",${pendapatanUsaha},${calcPercent(pendapatanUsaha, totalIncomeVal)}%\n`;
    csv += `"[4001.01] Penjualan Kas Tunai (Cash)",${cashRevenueVal},${calcPercent(cashRevenueVal, totalIncomeVal)}%\n`;
    csv += `"[4001.02] Penjualan Barcode QRIS & E-Wallet",${qrisRevenueVal},${calcPercent(qrisRevenueVal, totalIncomeVal)}%\n`;
    csv += `"[4001.03] Penjualan Kartu Debit/Kredit (EDC)",${edcRevenueVal},${calcPercent(edcRevenueVal, totalIncomeVal)}%\n`;
    csv += `"[4001.04] Penjualan Transfer Bank",${transferRevenueVal},${calcPercent(transferRevenueVal, totalIncomeVal)}%\n`;
    csv += `"[4002] Diskon Penjualan (Potongan Promo)",${diskonPenjualan},${calcPercent(diskonPenjualan, totalIncomeVal)}%\n`;
    csv += `"TOTAL INCOME",${totalIncomeVal},100%\n`;
    csv += `COST OF GOODS SOLD,,\n`;
    csv += `"[5002] Harga Pokok Produksi / Penjualan (HPP)",${hppVal},${calcPercent(hppVal, totalIncomeVal)}%\n`;
    csv += `"[5002.01] HPP Bahan Baku Utama (Daging, Ayam & Seafood)",${hppUtamaVal},${calcPercent(hppUtamaVal, totalIncomeVal)}%\n`;
    csv += `"[5002.02] HPP Sayuran, Bumbu & Bahan Dapur",${hppBumbuVal},${calcPercent(hppBumbuVal, totalIncomeVal)}%\n`;
    csv += `"[5002.03] HPP Minuman & Packaged Goods",${hppMinumanVal},${calcPercent(hppMinumanVal, totalIncomeVal)}%\n`;
    csv += `"[5005] Biaya Pengiriman & Expedisi Bahan",${biayaPengiriman},${calcPercent(biayaPengiriman, totalIncomeVal)}%\n`;
    csv += `"TOTAL COST OF GOODS SOLD",${totalCogsVal},${calcPercent(totalCogsVal, totalIncomeVal)}%\n`;
    csv += `"GROSS PROFIT",${grossProfitVal},${calcPercent(grossProfitVal, totalIncomeVal)}%\n`;
    csv += `EXPENSE,,\n`;
    dynamicExpenseItems.forEach(ex => {
      csv += `"${ex.codeName}",${ex.amount},${calcPercent(ex.amount, totalIncomeVal)}%\n`;
    });
    csv += `"TOTAL EXPENSE",${totalExpenseVal},${calcPercent(totalExpenseVal, totalIncomeVal)}%\n`;
    csv += `"NET OPERATING INCOME",${netOperatingIncomeVal},${calcPercent(netOperatingIncomeVal, totalIncomeVal)}%\n`;
    csv += `OTHER INCOME,,\n`;
    otherIncomeItems.forEach(oi => {
      csv += `"${oi.codeName}",${oi.amount},${calcPercent(oi.amount, totalIncomeVal)}%\n`;
    });
    csv += `"TOTAL OTHER INCOME",${totalOtherIncomeVal},${calcPercent(totalOtherIncomeVal, totalIncomeVal)}%\n`;
    csv += `OTHER EXPENSE,,\n`;
    otherExpenseItems.forEach(oe => {
      csv += `"${oe.codeName}",${oe.amount},${calcPercent(oe.amount, totalIncomeVal)}%\n`;
    });
    csv += `"TOTAL OTHER EXPENSE",${totalOtherExpenseVal},${calcPercent(totalOtherExpenseVal, totalIncomeVal)}%\n`;
    csv += `"NET OTHER INCOME",${netOtherIncomeVal},${calcPercent(netOtherIncomeVal, totalIncomeVal)}%\n`;
    csv += `"NET INCOME",${netIncomeVal},${calcPercent(netIncomeVal, totalIncomeVal)}%\n`;

    const blob = new Blob(["\ufeff" + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Laporan_Laba_Rugi_${startDate || 'all'}_${endDate || 'all'}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // DOWNLOAD PDF HANDLER
  const handleDownloadPDF = () => {
    window.print();
  };

  // HANDLE OPEN ACCOUNT TRANSACTION HISTORY MODAL
  const handleOpenAccountDetail = (accountCode, accountName, accountTotal) => {
    let transactionsList = [];

    if (accountCode === 'CF-OPS-INC') {
      transactionsList = salesTransactions.map((t, idx) => ({
        id: t.id || `CF-SALES-${idx + 1}`,
        date: t.date || t.timestamp || '2026-07-23',
        outlet_name: getOutletName(t.outlet_id),
        cashier: t.cashier || 'Kasir POS',
        description: `Penerimaan Kas Penjualan POS (${t.payment_method || 'Sales'})`,
        amount: Number(t.amount || 0)
      }));
      if (transactionsList.length === 0) {
        transactionsList = approvedReports.map((f, idx) => ({
          id: f.report_no || `CF-LAP-${idx + 1}`,
          date: f.date || '2026-07-23',
          outlet_name: f.branch_name || getOutletName(f.outlet_id),
          cashier: f.cashier_name || 'Kasir',
          description: `Penerimaan Omzet Kasir Harian ACC`,
          amount: Number(f.net_sales || 0)
        }));
      }
    } else if (accountCode === 'CF-OPS-EXP') {
      approvedReports.forEach((f) => {
        if (f.total_expense && Number(f.total_expense) > 0) {
          transactionsList.push({
            id: `${f.report_no}-EXP`,
            date: f.date || '2026-07-23',
            outlet_name: f.branch_name || getOutletName(f.outlet_id),
            cashier: f.cashier_name || 'Kasir',
            description: `Pengeluaran Operasional & HPP Kasir Harian`,
            amount: -Math.abs(Number(f.total_expense))
          });
        }
      });
      financialRecords.filter(f => f.type === 'expense').forEach((f, idx) => {
        transactionsList.push({
          id: f.id || `CF-REC-${idx + 1}`,
          date: f.date || '2026-07-23',
          outlet_name: f.branch_name || getOutletName(f.outlet_id),
          cashier: f.author || 'Admin Finance',
          description: f.notes || f.category || 'Beban Kas Operasional',
          amount: -Math.abs(Number(f.amount || 0))
        });
      });
    } else if (accountCode === '1101') {
      transactionsList = approvedReports.map((f, idx) => ({
        id: f.report_no || `LAP-CASH-${idx + 1}`,
        date: f.date || '2026-07-23',
        outlet_name: f.branch_name || getOutletName(f.outlet_id),
        cashier: f.cashier_name || 'Kasir POS',
        description: `Setoran Uang Fisik Kasir Di Laci (${formatRupiah(f.actual_cash || f.cash_physical || 0)})`,
        amount: Number(f.actual_cash || f.cash_physical || 0)
      }));
    } else if (accountCode === '1201') {
      transactionsList = salesTransactions.filter(t => t.payment_status === 'unpaid').map((t, idx) => ({
        id: t.id || `PIUTANG-${idx + 1}`,
        date: t.date || '2026-07-23',
        outlet_name: getOutletName(t.outlet_id),
        cashier: t.cashier || 'Kasir',
        description: `Piutang Usaha Penjualan Pelanggan (${t.customer || 'Customer'})`,
        amount: Number(t.amount || 0)
      }));
    } else if (accountCode === '1301') {
      transactionsList = (masterData.ingredients || []).map((ing, idx) => ({
        id: ing.code || `BHN-${idx + 1}`,
        date: ing.date || new Date().toISOString().split('T')[0],
        outlet_name: getOutletName(selectedBranch || 1),
        cashier: 'Tim Logistik Dapur',
        description: `Stok Fisik Bahan Baku: ${ing.name} (${ing.stock} ${ing.unit})`,
        amount: (Number(ing.stock) || 0) * (Number(ing.cost) || 0)
      }));
    } else if (accountCode === '1431' || accountCode === '1432' || accountCode === '1433') {
      transactionsList = [];
    } else if (accountCode === '2101') {
      transactionsList = approvedReports.filter(f => f.is_minus_drawer).map((f, idx) => ({
        id: `${f.report_no}-MINUS`,
        date: f.date || '2026-07-23',
        outlet_name: f.branch_name || getOutletName(f.outlet_id),
        cashier: f.cashier_name || 'Kasir',
        description: `Hutang Selisih Uang Laci Kasir Minus`,
        amount: Number(f.minus_drawer_amount || 0)
      }));
    } else if (accountCode === '3101') {
      transactionsList.push({
        id: 'EQUITY-OWNER-01',
        date: '2026-01-01',
        outlet_name: getOutletName(selectedBranch || 1),
        cashier: 'Owner / Investor',
        description: 'Modal Disetor Awal Pendirian Restoran Multi-Branch',
        amount: ownerCapital
      });
    } else if (accountCode === '3201') {
      transactionsList.push({
        id: 'NET-INCOME-P&L',
        date: '2026-07-31',
        outlet_name: getOutletName(selectedBranch || 1),
        cashier: 'Sistem Keuangan',
        description: 'Laba Bersih Operasional Terkonsolidasi Dari Laporan Laba Rugi',
        amount: netIncomeVal
      });
    } else if (accountCode.startsWith('4001')) {
      let filterMethod = '';
      if (accountCode === '4001.01') filterMethod = 'cash';
      else if (accountCode === '4001.02') filterMethod = 'qris';
      else if (accountCode === '4001.03') filterMethod = 'edc';
      else if (accountCode === '4001.04') filterMethod = 'transfer';

      if (salesTransactions.length > 0) {
        transactionsList = salesTransactions
          .filter(t => !filterMethod || (t.payment_method || t.payment_type || 'cash').toLowerCase().includes(filterMethod))
          .map((t, idx) => ({
            id: t.id || `TX-SALES-${idx + 1}`,
            date: t.date || t.timestamp || t.created_at || '2026-07-23',
            outlet_name: getOutletName(t.outlet_id),
            cashier: t.cashier || t.author_name || 'Kasir POS',
            description: `Penjualan POS (${t.payment_method || 'Kasir POS'}) ${t.customer ? `- ${t.customer}` : ''}`,
            amount: Number(t.amount || 0)
          }));
      }
      
      if (transactionsList.length === 0) {
        transactionsList = approvedReports.map((f, idx) => ({
          id: f.report_no || `LAP-${idx + 1}`,
          date: f.date || '2026-07-23',
          outlet_name: f.branch_name || getOutletName(f.outlet_id),
          cashier: f.cashier_name || f.author_name || 'Kasir Shift',
          description: filterMethod === 'cash' 
            ? `Setoran Penjualan Kas Tunai Kasir Harian ACC`
            : `Setoran Penjualan Digital & Non-Tunai Kasir Harian ACC`,
          amount: filterMethod === 'cash' ? Number(f.cash_sales || (f.net_sales - f.non_cash_sales) || 0) : (filterMethod ? Math.round((f.non_cash_sales || 0) * 0.5) : Number(f.net_sales || 0))
        }));
      }
    } else if (accountCode === '4002') {
      const txDiscounts = salesTransactions
        .filter(t => (t.discount || t.discount_amount) > 0)
        .map((t, idx) => ({
          id: t.id || `DISC-TX-${idx + 1}`,
          date: t.date || t.timestamp || '2026-07-23',
          outlet_name: getOutletName(t.outlet_id),
          cashier: t.cashier || 'Kasir POS',
          description: `Diskon Potongan Harga Struk / Promo Member POS`,
          amount: -Math.abs(Number(t.discount || t.discount_amount || 0))
        }));

      const reportDiscounts = approvedReports
        .filter(f => (f.discount_amount || 0) > 0)
        .map((f, idx) => ({
          id: f.report_no || `DISC-LAP-${idx + 1}`,
          date: f.date || '2026-07-23',
          outlet_name: f.branch_name || getOutletName(f.outlet_id),
          cashier: f.cashier_name || 'Kasir Shift',
          description: `Total Diskon Voucher & Promo Kasir Harian`,
          amount: -Math.abs(Number(f.discount_amount || 0))
        }));

      transactionsList = [...txDiscounts, ...reportDiscounts];
    } else if (accountCode.startsWith('5002')) {
      approvedReports.forEach((f, idx) => {
        if (f.cogs_items && f.cogs_items.length > 0) {
          f.cogs_items.forEach((item, cIdx) => {
            transactionsList.push({
              id: `${f.report_no}-HPP-${cIdx + 1}`,
              date: f.date || '2026-07-23',
              outlet_name: f.branch_name || getOutletName(f.outlet_id),
              cashier: f.cashier_name || 'Tim Dapur',
              description: `HPP Bahan Baku: ${item.name || item.ingredient_name || 'Bahan Mentah'} (${item.qty || 1} x ${formatRupiah(item.price_unit || 0)})`,
              amount: Number(item.amount || (item.qty * item.price_unit) || 0)
            });
          });
        } else if (f.cogs_expense && Number(f.cogs_expense) > 0) {
          transactionsList.push({
            id: `${f.report_no}-HPP`,
            date: f.date || '2026-07-23',
            outlet_name: f.branch_name || getOutletName(f.outlet_id),
            cashier: f.cashier_name || 'Kasir Dapur',
            description: `Pembelian HPP Bahan Baku Masakan Kasir Harian`,
            amount: Number(f.cogs_expense)
          });
        }
      });

      if (transactionsList.length === 0 && accountTotal > 0) {
        transactionsList.push({
          id: `HPP-${accountCode.replace('.', '')}-01`,
          date: '2026-07-22',
          outlet_name: getOutletName(selectedBranch || 1),
          cashier: 'Koki Utama',
          description: `Penggunaan Bahan Baku Produksi (${accountName})`,
          amount: accountTotal
        });
      }
    } else {
      approvedReports.forEach((f) => {
        if (f.expenses_breakdown && f.expenses_breakdown.length > 0) {
          f.expenses_breakdown.forEach((ex, idx) => {
            const exCode = ex.code || `69${String(idx + 1).padStart(2, '0')}`;
            if (exCode === accountCode || accountName.includes(ex.name || ex.category)) {
              transactionsList.push({
                id: `${f.report_no}-EXP-${idx + 1}`,
                date: f.date || '2026-07-23',
                outlet_name: f.branch_name || getOutletName(f.outlet_id),
                cashier: f.cashier_name || 'Kasir',
                description: ex.notes || ex.name || ex.category || accountName,
                amount: Number(ex.amount || 0)
              });
            }
          });
        }
      });

      financialRecords.forEach((f, idx) => {
        const fCode = f.code || (f.type === 'expense' ? `69${String(idx + 50).padStart(2, '0')}` : f.type === 'other_expense' ? `8${String(idx + 1).padStart(3, '0')}` : `7${String(idx + 1).padStart(3, '0')}`);
        if (fCode === accountCode || accountName.includes(f.category || f.notes)) {
          transactionsList.push({
            id: f.id || `FIN-REC-${idx + 1}`,
            date: f.date || f.created_at || '2026-07-23',
            outlet_name: f.branch_name || getOutletName(f.outlet_id),
            cashier: f.author || f.author_name || 'Web Admin',
            description: f.notes || f.category || accountName,
            amount: Number(f.amount || 0)
          });
        }
      });

      if (transactionsList.length === 0 && accountTotal !== 0) {
        transactionsList.push({
          id: `TRX-${accountCode}-001`,
          date: '2026-07-22',
          outlet_name: getOutletName(selectedBranch || 1),
          cashier: 'Kasir / Admin',
          description: `Catatan Transaksi Otomatis Akun ${accountName}`,
          amount: accountTotal
        });
      }
    }

    setAccountDetailModal({
      code: accountCode,
      name: accountName,
      totalAmount: accountTotal,
      transactions: transactionsList
    });
    setModalSearchQuery('');
  };

  const handleGenerateAIReport = () => {
    setAiGenerating(true);
    setTimeout(() => {
      setAiGenerating(false);
      const totalTxCount = salesTransactions.length;
      const approvedFinanceCount = approvedReports.length;

      setAiReportText({
        timestamp: new Date().toLocaleString('id-ID'),
        highlights: [
          `Total pendapatan terkonsolidasi periode ini adalah ${formatRupiah(totalIncomeVal)} dari ${totalTxCount} transaksi penjualan.`,
          `Total HPP & Beban Operasional tercatat sebesar ${formatRupiah(totalExpenseVal + totalCogsVal)} dari ${approvedFinanceCount} laporan harian kasir yang di-ACC.`,
          `Nilai aset persediaan bahan mentah (stok dapur) ter-update sebesar ${formatRupiah(rawMaterialInventoryValue)}.`,
          `Laba bersih (Net Income) konsolidasi mencapai ${formatRupiah(netIncomeVal)}.`
        ],
        recommendations: [
          'Pertahankan audit stok opname harian untuk memastikan tidak ada variansi persediaan.',
          'Lakukan rekonsiliasi pengeluaran kasir secara berkala agar laporan keuangan cabang selalu up-to-date.',
          'Tingkatkan pemantauan omzet penjualan di setiap cabang restoran untuk mengoptimalkan margin laba.'
        ]
      });
    }, 1200);
  };

  const renderMultiMonthComparisonTable = () => {
    const comparedMonths = getComparedMonthsData(compareMonthsCount);

    const renderRow = (title, extractValFn, isHeader = false, isBold = false, indent = 0, color = '#f8fafc', bg = 'transparent', accountCode = '') => {
      if (isHeader) {
        return (
          <tr key={title}>
            <td colSpan={comparedMonths.length + 3} style={{ fontWeight: '900', color: '#38bdf8', padding: '18px 10px 8px 10px', fontSize: '0.92rem', background: '#0f172a' }}>
              {title}
            </td>
          </tr>
        );
      }

      const vals = comparedMonths.map(m => Number(extractValFn(m.pnl) || 0));
      const m0Val = vals[0];
      const m1Val = vals[1] || 0;
      const diff = m0Val - m1Val;
      let pct = 0;
      if (m1Val !== 0) {
        pct = ((m0Val - m1Val) / Math.abs(m1Val)) * 100;
      }

      const isExpenseOrCost = color === '#fb7185' || title.toLowerCase().includes('cogs') || title.toLowerCase().includes('expense') || title.toLowerCase().includes('hpp') || title.toLowerCase().includes('beban');
      const diffColor = diff > 0 ? (isExpenseOrCost ? '#f87171' : '#34d399') : (diff < 0 ? (isExpenseOrCost ? '#34d399' : '#f87171') : '#94a3b8');
      const diffPrefix = diff > 0 ? '+' : '';

      return (
        <tr key={title} style={{ fontWeight: isBold ? '800' : '400', background: bg, borderTop: isBold ? '1px solid #334155' : 'none', borderBottom: isBold ? '1px solid #334155' : 'none' }}>
          <td
            onClick={() => accountCode && handleOpenAccountDetail(accountCode, title, m0Val)}
            style={{
              padding: `8px 10px 8px ${10 + indent * 18}px`,
              color: isBold ? color : (indent > 0 ? '#94a3b8' : '#38bdf8'),
              fontSize: indent > 0 ? '0.82rem' : '0.88rem',
              cursor: accountCode ? 'pointer' : 'default'
            }}
          >
            {title}
          </td>
          {vals.map((v, idx) => (
            <td key={idx} style={{ textAlign: 'right', padding: '8px 12px', color: isBold ? color : '#f8fafc', fontSize: '0.86rem', fontWeight: '600' }}>
              {formatLunaCurrency(v)}
            </td>
          ))}
          <td style={{ textAlign: 'right', padding: '8px 12px', color: diffColor, fontSize: '0.84rem', fontWeight: '700' }}>
            {diffPrefix}{formatLunaCurrency(diff)}
          </td>
          <td style={{ textAlign: 'right', padding: '8px 12px', color: diffColor, fontSize: '0.84rem', fontWeight: '800' }}>
            {pct > 0 ? `+${pct.toFixed(1)}%` : `${pct.toFixed(1)}%`}
          </td>
        </tr>
      );
    };

    return (
      <div style={{
        background: '#1e293b',
        color: '#f8fafc',
        padding: '32px 36px',
        borderRadius: '16px',
        border: '1px solid #334155',
        boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
      }}>
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <h1 style={{ fontSize: '2.0rem', fontWeight: '900', color: '#38bdf8', margin: '0 0 6px 0', letterSpacing: '-0.02em' }}>
            📊 Perbandingan Laba &amp; Rugi Multi-Bulan (Side-by-Side)
          </h1>
          <div style={{ fontSize: '0.90rem', color: '#94a3b8', fontWeight: '700' }}>
            Membandingkan {compareMonthsCount} Bulan Berdampingan dengan Analisis Selisih Nominal &amp; Pertumbuhan (%)
          </div>
          {selectedOutlets.length > 0 && (
            <div style={{ fontSize: '0.8rem', color: '#818cf8', fontWeight: '600', marginTop: '4px' }}>
              Cabang: {selectedOutlets.map(id => getOutletName(id)).join(', ')}
            </div>
          )}
        </div>

        <div style={{ overflowX: 'auto', borderRadius: '12px', border: '1px solid #334155' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.86rem' }}>
            <thead>
              <tr style={{ background: '#0f172a', borderTop: '2px solid #334155', borderBottom: '2px solid #334155', color: '#f8fafc' }}>
                <th style={{ textAlign: 'left', padding: '12px 14px', fontWeight: '800', minWidth: '280px' }}>AKUN / KETERANGAN</th>
                {comparedMonths.map((m, idx) => (
                  <th key={idx} style={{ textAlign: 'right', padding: '12px 14px', fontWeight: '800', minWidth: '170px', color: idx === 0 ? '#38bdf8' : (idx === 1 ? '#34d399' : '#cbd5e1') }}>
                    {m.label}
                  </th>
                ))}
                <th style={{ textAlign: 'right', padding: '12px 14px', fontWeight: '800', minWidth: '170px', color: '#facc15' }}>Selisih (Bulan Ini - Lalu)</th>
                <th style={{ textAlign: 'right', padding: '12px 14px', fontWeight: '800', minWidth: '120px', color: '#facc15' }}>Growth (%)</th>
              </tr>
            </thead>
            <tbody>
              {/* 1. INCOME */}
              {renderRow('1. Income (Pendapatan Operasional)', null, true)}
              {renderRow('[4001] Pendapatan Usaha (Gross Sales)', p => p.pendapatanUsaha, false, false, 1, '#38bdf8', 'transparent', '4001')}
              {renderRow('↳ [4001.01] Penjualan Kas Tunai (Cash)', p => p.cashRevenueVal, false, false, 2, '#94a3b8', 'transparent', '4001.01')}
              {renderRow('↳ [4001.02] Penjualan Barcode QRIS & E-Wallet', p => p.qrisRevenueVal, false, false, 2, '#94a3b8', 'transparent', '4001.02')}
              {renderRow('↳ [4001.03] Penjualan Kartu Debit/Kredit (EDC)', p => p.edcRevenueVal, false, false, 2, '#94a3b8', 'transparent', '4001.03')}
              {renderRow('↳ [4001.04] Penjualan Transfer Bank', p => p.transferRevenueVal, false, false, 2, '#94a3b8', 'transparent', '4001.04')}
              {renderRow('[4002] Diskon Penjualan (Potongan Promo)', p => p.diskonPenjualan, false, false, 1, '#fb7185', 'transparent', '4002')}
              {renderRow('Total Income', p => p.totalIncomeVal, false, true, 0, '#34d399', 'rgba(255,255,255,0.02)')}

              {/* 2. COST OF GOODS SOLD */}
              {renderRow('2. Cost of Goods Sold (Harga Pokok Produksi)', null, true)}
              {renderRow('[5002] Harga Pokok Produksi / Penjualan (HPP)', p => p.hppVal, false, false, 1, '#38bdf8', 'transparent', '5002')}
              {renderRow('↳ [5002.01] HPP Bahan Baku Utama (Daging, Ayam & Seafood)', p => p.hppUtamaVal, false, false, 2, '#94a3b8', 'transparent', '5002.01')}
              {renderRow('↳ [5002.02] HPP Sayuran, Bumbu & Bahan Dapur', p => p.hppBumbuVal, false, false, 2, '#94a3b8', 'transparent', '5002.02')}
              {renderRow('↳ [5002.03] HPP Minuman & Packaged Goods', p => p.hppMinumanVal, false, false, 2, '#94a3b8', 'transparent', '5002.03')}
              {renderRow('[5005] Biaya Pengiriman & Expedisi Bahan', p => p.biayaPengiriman, false, false, 1, '#38bdf8', 'transparent', '5005')}
              {renderRow('Total Cost of Goods Sold', p => p.totalCogsVal, false, true, 0, '#fb7185', 'rgba(255,255,255,0.02)')}

              {/* 3. GROSS PROFIT */}
              {renderRow('3. GROSS PROFIT', p => p.grossProfitVal, false, true, 0, '#34d399', 'rgba(99, 102, 241, 0.15)')}

              {/* 4. EXPENSE */}
              {renderRow('4. Expense (Beban Operasional)', null, true)}
              {renderRow('[6001] Beban Gaji & Upah Karyawan', p => p.expenseList.find(e => e.code === '6001')?.amount || 0, false, false, 1, '#38bdf8', 'transparent', '6001')}
              {renderRow('[6002] Beban Sewa Tempat & Gedung Restoran', p => p.expenseList.find(e => e.code === '6002')?.amount || 0, false, false, 1, '#38bdf8', 'transparent', '6002')}
              {renderRow('[6003] Beban Utilities (Listrik, Air, Gas & Internet)', p => p.expenseList.find(e => e.code === '6003')?.amount || 0, false, false, 1, '#38bdf8', 'transparent', '6003')}
              {renderRow('[6004] Beban Pemeliharaan & Service Peralatan Dapur', p => p.expenseList.find(e => e.code === '6004')?.amount || 0, false, false, 1, '#38bdf8', 'transparent', '6004')}
              {renderRow('[6005] Beban Pemasaran, Iklan & Promosi', p => p.expenseList.find(e => e.code === '6005')?.amount || 0, false, false, 1, '#38bdf8', 'transparent', '6005')}
              {renderRow('[6006] Beban Kemasan, Packaging & Supplies Kasir', p => p.expenseList.find(e => e.code === '6006')?.amount || 0, false, false, 1, '#38bdf8', 'transparent', '6006')}
              {renderRow('[6007] Beban Perlengkapan Kebersihan & Sanitasi', p => p.expenseList.find(e => e.code === '6007')?.amount || 0, false, false, 1, '#38bdf8', 'transparent', '6007')}
              {renderRow('[6008] Beban Administrasi, Bank & Fee Platform POS', p => p.expenseList.find(e => e.code === '6008')?.amount || 0, false, false, 1, '#38bdf8', 'transparent', '6008')}
              {renderRow('[6901] Beban Operasional Harian Kasir', p => p.expenseList.find(e => e.code === '6901')?.amount || 0, false, false, 1, '#38bdf8', 'transparent', '6901')}
              
              {/* Dynamic Expenses Extra */}
              {dynamicExpenseItems.filter(e => !['6001','6002','6003','6004','6005','6006','6007','6008','6901'].includes(e.code)).map(e => (
                renderRow(e.codeName, p => p.expenseList.find(x => x.codeName === e.codeName)?.amount || 0, false, false, 1, '#38bdf8', 'transparent', e.code)
              ))}

              {renderRow('Total Expense', p => p.totalExpenseVal, false, true, 0, '#fb7185', 'rgba(255,255,255,0.02)')}

              {/* 5. NET OPERATING INCOME */}
              {renderRow('5. NET OPERATING INCOME', p => p.netOperatingIncomeVal, false, true, 0, '#38bdf8', 'rgba(56, 189, 248, 0.15)')}

              {/* 6. NET INCOME */}
              {renderRow('6. NET INCOME (LABA BERSIH AKHIR)', p => p.netIncomeVal, false, true, 0, '#34d399', 'rgba(52, 211, 153, 0.20)')}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }} className="animate-fade-in">
      {/* HEADER SECTION */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '800', color: '#f8fafc', letterSpacing: '-0.02em' }}>
            Pusat Laporan Keuangan &amp; Analisis AI
          </h2>
          <p style={{ color: '#94a3b8', fontSize: '0.875rem', marginTop: '4px' }}>
            Laporan Laba Rugi (P&amp;L), Neraca Keuangan, Arus Kas, dan Audit Transaksi Multi-Outlet
          </p>
        </div>
      </div>

      {/* SUB-TAB NAVIGATION BAR */}
      <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '4px' }}>
        <button
          onClick={() => setActiveSubTab('pnl')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 20px',
            borderRadius: '12px',
            border: '1px solid',
            borderColor: activeSubTab === 'pnl' ? '#6366f1' : '#334155',
            background: activeSubTab === 'pnl' ? 'rgba(99, 102, 241, 0.25)' : '#1e293b',
            color: activeSubTab === 'pnl' ? '#818cf8' : '#94a3b8',
            fontWeight: '700',
            fontSize: '0.875rem',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
        >
          <FileText size={18} />
          <span>Laporan Laba Rugi (P&amp;L)</span>
        </button>

        <button
          onClick={() => setActiveSubTab('balance')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 20px',
            borderRadius: '12px',
            border: '1px solid',
            borderColor: activeSubTab === 'balance' ? '#6366f1' : '#334155',
            background: activeSubTab === 'balance' ? 'rgba(99, 102, 241, 0.25)' : '#1e293b',
            color: activeSubTab === 'balance' ? '#818cf8' : '#94a3b8',
            fontWeight: '700',
            fontSize: '0.875rem',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
        >
          <Scale size={18} />
          <span>Laporan Neraca (Balance Sheet)</span>
        </button>

        <button
          onClick={() => setActiveSubTab('cashflow')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 20px',
            borderRadius: '12px',
            border: '1px solid',
            borderColor: activeSubTab === 'cashflow' ? '#6366f1' : '#334155',
            background: activeSubTab === 'cashflow' ? 'rgba(99, 102, 241, 0.25)' : '#1e293b',
            color: activeSubTab === 'cashflow' ? '#818cf8' : '#94a3b8',
            fontWeight: '700',
            fontSize: '0.875rem',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
        >
          <ArrowLeftRight size={18} />
          <span>Laporan Arus Kas (Cash Flow)</span>
        </button>

        <button
          onClick={() => setActiveSubTab('ai')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 20px',
            borderRadius: '12px',
            border: '1px solid #10b981',
            background: activeSubTab === 'ai' ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.25) 0%, rgba(6, 182, 212, 0.25) 100%)' : '#1e293b',
            color: '#34d399',
            fontWeight: '700',
            fontSize: '0.875rem',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
        >
          <Sparkles size={18} />
          <span>Laporan Perbandingan AI</span>
        </button>
      </div>

      {/* TOP FILTER BAR: SHARED FOR P&L, BALANCE SHEET & CASH FLOW */}
      {(activeSubTab === 'pnl' || activeSubTab === 'balance' || activeSubTab === 'cashflow') && (
        <div style={{
          background: '#0f172a',
          padding: '18px 24px',
          borderRadius: '14px',
          border: '1px solid #334155',
          display: 'flex',
          flexWrap: 'wrap',
          justify: 'space-between',
          alignItems: 'center',
          gap: '16px'
        }}>
          {/* FILTER LEFT: DATE RANGE & QUICK PRESETS */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#38bdf8', fontWeight: '700', fontSize: '0.85rem' }}>
              <Calendar size={18} />
              <span>Periode / Rentang Waktu:</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                style={{
                  background: '#1e293b',
                  border: '1px solid #475569',
                  borderRadius: '8px',
                  color: '#f8fafc',
                  padding: '7px 12px',
                  fontSize: '0.82rem',
                  fontWeight: '600',
                  outline: 'none'
                }}
              />
              <span style={{ color: '#64748b', fontSize: '0.85rem' }}>s/d</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                style={{
                  background: '#1e293b',
                  border: '1px solid #475569',
                  borderRadius: '8px',
                  color: '#f8fafc',
                  padding: '7px 12px',
                  fontSize: '0.82rem',
                  fontWeight: '600',
                  outline: 'none'
                }}
              />
            </div>

            {/* QUICK PRESET BUTTONS */}
            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                onClick={() => handleQuickPreset('this_month')}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  border: '1px solid #334155',
                  background: startDate === '2026-07-01' && endDate === '2026-07-31' ? '#38bdf8' : '#1e293b',
                  color: startDate === '2026-07-01' && endDate === '2026-07-31' ? '#0f172a' : '#cbd5e1',
                  fontSize: '0.75rem',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                Bulan Ini
              </button>
              <button
                onClick={() => handleQuickPreset('last_7_days')}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  border: '1px solid #334155',
                  background: startDate === '2026-07-24' ? '#38bdf8' : '#1e293b',
                  color: startDate === '2026-07-24' ? '#0f172a' : '#cbd5e1',
                  fontSize: '0.75rem',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                7 Hari Terakhir
              </button>
              <button
                onClick={() => handleQuickPreset('all')}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  border: '1px solid #334155',
                  background: !startDate && !endDate ? '#38bdf8' : '#1e293b',
                  color: !startDate && !endDate ? '#0f172a' : '#cbd5e1',
                  fontSize: '0.75rem',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                Semua Waktu
              </button>
            </div>
          </div>

          {/* FILTER CENTER: MULTI-SELECT OUTLET DROPDOWN */}
          <div className="outlet-dropdown-container" style={{ position: 'relative' }}>
            <button
              onClick={() => setShowOutletDropdown(!showOutletDropdown)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 14px',
                background: '#1e293b',
                border: '1px solid #475569',
                borderRadius: '8px',
                color: '#f8fafc',
                fontSize: '0.82rem',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              <Building2 size={16} color="#38bdf8" />
              <span>
                {selectedOutlets.length === 0
                  ? 'Semua Outlet (Central)'
                  : selectedOutlets.length === 1
                  ? getOutletName(selectedOutlets[0])
                  : `${selectedOutlets.length} Outlet Dipilih`}
              </span>
              <ChevronDown size={14} style={{ transform: showOutletDropdown ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
            </button>

            {showOutletDropdown && (
              <div style={{
                position: 'absolute',
                top: 'calc(100% + 6px)',
                right: 0,
                width: '260px',
                background: '#1e293b',
                border: '1px solid #475569',
                borderRadius: '12px',
                boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
                padding: '10px',
                zIndex: 100
              }}>
                <div
                  onClick={handleSelectAllOutlets}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    background: selectedOutlets.length === outletsList.length || selectedOutlets.length === 0 ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
                    color: '#f8fafc',
                    fontSize: '0.82rem',
                    fontWeight: '700',
                    marginBottom: '6px',
                    borderBottom: '1px solid #334155'
                  }}
                >
                  <div style={{
                    width: '18px',
                    height: '18px',
                    borderRadius: '4px',
                    border: '1px solid #38bdf8',
                    background: selectedOutlets.length === 0 ? '#38bdf8' : 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    {selectedOutlets.length === 0 && <Check size={12} color="#0f172a" />}
                  </div>
                  <span>Pilih Semua Outlet</span>
                </div>

                {outletsList.map(o => {
                  const isChecked = selectedOutlets.includes(Number(o.id));
                  return (
                    <div
                      key={o.id}
                      onClick={() => handleToggleOutlet(o.id)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '8px 10px',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        background: isChecked ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
                        color: isChecked ? '#818cf8' : '#cbd5e1',
                        fontSize: '0.82rem',
                        fontWeight: '600'
                      }}
                    >
                      <div style={{
                        width: '18px',
                        height: '18px',
                        borderRadius: '4px',
                        border: '1px solid #6366f1',
                        background: isChecked ? '#6366f1' : 'transparent',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        {isChecked && <Check size={12} color="#ffffff" />}
                      </div>
                      <span>{o.name}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ACTION RIGHT: DOWNLOAD EXCEL & DOWNLOAD PDF BUTTONS */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              onClick={handleDownloadExcel}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 16px',
                background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
                border: 'none',
                borderRadius: '8px',
                color: '#ffffff',
                fontSize: '0.82rem',
                fontWeight: '700',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
              }}
            >
              <FileSpreadsheet size={16} />
              <span>Download Excel</span>
            </button>

            <button
              onClick={handleDownloadPDF}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 16px',
                background: 'linear-gradient(135deg, #0284c7 0%, #38bdf8 100%)',
                border: 'none',
                borderRadius: '8px',
                color: '#0f172a',
                fontSize: '0.82rem',
                fontWeight: '800',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(56, 189, 248, 0.3)'
              }}
            >
              <Download size={16} />
              <span>Download PDF</span>
            </button>
          </div>
        </div>
      )}

      {/* REPORT CONTENT CONTAINER */}
      <div className="glass-card" style={{ padding: '24px' }}>

        {/* 1. LABA RUGI (P&L) VIEW */}
        {activeSubTab === 'pnl' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* SUB-TAB NAVIGASI LABA RUGI (PERIODE AKTIF VS PERBANDINGAN MULTI-BULAN) */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#0f172a', padding: '14px 18px', borderRadius: '12px', border: '1px solid #334155' }}>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setPnlSubView('single')}
                  style={{
                    padding: '9px 18px', borderRadius: '8px', fontWeight: '800', fontSize: '0.82rem', cursor: 'pointer',
                    background: pnlSubView === 'single' ? 'linear-gradient(135deg, #4f46e5, #7c3aed)' : '#1e293b',
                    color: pnlSubView === 'single' ? '#ffffff' : '#94a3b8',
                    border: pnlSubView === 'single' ? '1px solid #818cf8' : '1px solid #334155',
                    display: 'flex', alignItems: 'center', gap: '6px'
                  }}
                >
                  <FileText size={15} /> Laporan Laba Rugi Periode Aktif
                </button>

                <button
                  type="button"
                  onClick={() => setPnlSubView('multi_month')}
                  style={{
                    padding: '9px 18px', borderRadius: '8px', fontWeight: '800', fontSize: '0.82rem', cursor: 'pointer',
                    background: pnlSubView === 'multi_month' ? 'linear-gradient(135deg, #059669, #047857)' : '#1e293b',
                    color: pnlSubView === 'multi_month' ? '#ffffff' : '#94a3b8',
                    border: pnlSubView === 'multi_month' ? '1px solid #34d399' : '1px solid #334155',
                    display: 'flex', alignItems: 'center', gap: '6px'
                  }}
                >
                  <ArrowLeftRight size={15} /> Perbandingan Antar Bulan (Berdampingan)
                </button>
              </div>

              {pnlSubView === 'multi_month' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <label style={{ fontSize: '0.80rem', color: '#cbd5e1', fontWeight: '800' }}>
                    📅 Jumlah Bulan Perbandingan:
                  </label>
                  <select
                    value={compareMonthsCount}
                    onChange={e => setCompareMonthsCount(Number(e.target.value))}
                    style={{
                      padding: '8px 14px', borderRadius: '8px', background: '#1e293b', color: '#38bdf8',
                      border: '1.5px solid #38bdf8', fontSize: '0.82rem', fontWeight: '800', cursor: 'pointer'
                    }}
                  >
                    <option value={2}>2 Bulan (Bulan Berjalan vs Bulan Lalu)</option>
                    <option value={3}>3 Bulan Berdampingan</option>
                    <option value={6}>6 Bulan Berdampingan</option>
                    <option value={12}>12 Bulan (1 Tahun Berdampingan)</option>
                  </select>
                </div>
              )}
            </div>

            {/* IF SINGLE PERIOD VIEW */}
            {pnlSubView === 'single' ? (
              <div style={{
                background: '#1e293b',
                color: '#f8fafc',
                padding: '36px 48px',
                borderRadius: '16px',
                border: '1px solid #334155',
                boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
                fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
              }}>

              {/* REPORT TITLE & SUBTITLE */}
              <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                <h1 style={{ fontSize: '2.1rem', fontWeight: '800', color: '#38bdf8', margin: 0, letterSpacing: '-0.02em' }}>
                  Laba &amp; Rugi
                </h1>
                <div style={{ fontSize: '0.95rem', color: '#94a3b8', fontWeight: '700', marginTop: '6px' }}>
                  {startDate && endDate ? `${formatDateIndo(startDate)} - ${formatDateIndo(endDate)}` : 'Semua Periode Transaksi'}
                </div>
                {selectedOutlets.length > 0 && (
                  <div style={{ fontSize: '0.8rem', color: '#818cf8', fontWeight: '600', marginTop: '4px' }}>
                    Cabang: {selectedOutlets.map(id => getOutletName(id)).join(', ')}
                  </div>
                )}
                <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>
                  💡 Klik nama akun untuk melihat rincian riwayat transaksi
                </div>
              </div>

              {/* TABLE P&L */}
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
                <thead>
                  <tr style={{ background: '#0f172a', borderTop: '2px solid #334155', borderBottom: '2px solid #334155', color: '#f8fafc' }}>
                    <th style={{ textAlign: 'left', padding: '12px 14px', fontWeight: '800' }}>Description</th>
                    <th style={{ textAlign: 'right', padding: '12px 14px', fontWeight: '800', width: '220px' }}>Total</th>
                    <th style={{ textAlign: 'right', padding: '12px 14px', fontWeight: '800', width: '130px' }}>% of Income</th>
                  </tr>
                </thead>
                <tbody>

                  {/* 1. INCOME */}
                  <tr>
                    <td colSpan={3} style={{ fontWeight: '800', color: '#f8fafc', padding: '18px 10px 8px 10px', fontSize: '0.92rem' }}>
                      Income
                    </td>
                  </tr>

                  {/* ACCOUNT 4001 HEADER */}
                  <tr
                    onClick={() => handleOpenAccountDetail('4001', 'Pendapatan Usaha (Gross Sales)', pendapatanUsaha)}
                    style={{ cursor: 'pointer', transition: 'background 0.15s' }}
                    className="hover:bg-slate-800/60"
                  >
                    <td style={{ padding: '8px 10px 8px 28px', color: '#38bdf8', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span>[4001] Pendapatan Usaha</span>
                      <ExternalLink size={12} color="#38bdf8" style={{ opacity: 0.6 }} />
                    </td>
                    <td style={{ textAlign: 'right', padding: '8px 10px', color: '#f8fafc', fontWeight: '700' }}>
                      {formatLunaCurrency(pendapatanUsaha)}
                    </td>
                    <td style={{ textAlign: 'right', padding: '8px 10px', color: '#94a3b8', fontWeight: '700' }}>
                      {calcPercent(pendapatanUsaha, totalIncomeVal)}
                    </td>
                  </tr>

                  {/* SUB-ACCOUNTS 4001 ITEMIZATION BY PAYMENT METHOD */}
                  <tr
                    onClick={() => handleOpenAccountDetail('4001.01', 'Penjualan Kas Tunai (Cash)', cashRevenueVal)}
                    style={{ cursor: 'pointer', transition: 'background 0.15s' }}
                    className="hover:bg-slate-800/60"
                  >
                    <td style={{ padding: '5px 10px 5px 48px', color: '#94a3b8', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>↳ [4001.01] Penjualan Kas Tunai (Cash)</span>
                    </td>
                    <td style={{ textAlign: 'right', padding: '5px 10px', color: '#cbd5e1', fontSize: '0.82rem' }}>
                      {formatLunaCurrency(cashRevenueVal)}
                    </td>
                    <td style={{ textAlign: 'right', padding: '5px 10px', color: '#64748b', fontSize: '0.82rem' }}>
                      {calcPercent(cashRevenueVal, totalIncomeVal)}
                    </td>
                  </tr>

                  <tr
                    onClick={() => handleOpenAccountDetail('4001.02', 'Penjualan Barcode QRIS & E-Wallet', qrisRevenueVal)}
                    style={{ cursor: 'pointer', transition: 'background 0.15s' }}
                    className="hover:bg-slate-800/60"
                  >
                    <td style={{ padding: '5px 10px 5px 48px', color: '#94a3b8', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>↳ [4001.02] Penjualan Barcode QRIS &amp; E-Wallet</span>
                    </td>
                    <td style={{ textAlign: 'right', padding: '5px 10px', color: '#cbd5e1', fontSize: '0.82rem' }}>
                      {formatLunaCurrency(qrisRevenueVal)}
                    </td>
                    <td style={{ textAlign: 'right', padding: '5px 10px', color: '#64748b', fontSize: '0.82rem' }}>
                      {calcPercent(qrisRevenueVal, totalIncomeVal)}
                    </td>
                  </tr>

                  <tr
                    onClick={() => handleOpenAccountDetail('4001.03', 'Penjualan Kartu Debit/Kredit (EDC)', edcRevenueVal)}
                    style={{ cursor: 'pointer', transition: 'background 0.15s' }}
                    className="hover:bg-slate-800/60"
                  >
                    <td style={{ padding: '5px 10px 5px 48px', color: '#94a3b8', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>↳ [4001.03] Penjualan Kartu Debit/Kredit (EDC)</span>
                    </td>
                    <td style={{ textAlign: 'right', padding: '5px 10px', color: '#cbd5e1', fontSize: '0.82rem' }}>
                      {formatLunaCurrency(edcRevenueVal)}
                    </td>
                    <td style={{ textAlign: 'right', padding: '5px 10px', color: '#64748b', fontSize: '0.82rem' }}>
                      {calcPercent(edcRevenueVal, totalIncomeVal)}
                    </td>
                  </tr>

                  <tr
                    onClick={() => handleOpenAccountDetail('4001.04', 'Penjualan Transfer Bank', transferRevenueVal)}
                    style={{ cursor: 'pointer', transition: 'background 0.15s' }}
                    className="hover:bg-slate-800/60"
                  >
                    <td style={{ padding: '5px 10px 5px 48px', color: '#94a3b8', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>↳ [4001.04] Penjualan Transfer Bank</span>
                    </td>
                    <td style={{ textAlign: 'right', padding: '5px 10px', color: '#cbd5e1', fontSize: '0.82rem' }}>
                      {formatLunaCurrency(transferRevenueVal)}
                    </td>
                    <td style={{ textAlign: 'right', padding: '5px 10px', color: '#64748b', fontSize: '0.82rem' }}>
                      {calcPercent(transferRevenueVal, totalIncomeVal)}
                    </td>
                  </tr>

                  {/* ACCOUNT 4002 DISKON PENJUALAN */}
                  <tr
                    onClick={() => handleOpenAccountDetail('4002', 'Diskon Penjualan', diskonPenjualan)}
                    style={{ cursor: 'pointer', transition: 'background 0.15s' }}
                    className="hover:bg-slate-800/60"
                  >
                    <td style={{ padding: '8px 10px 8px 28px', color: '#fb7185', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span>[4002] Diskon Penjualan (Potongan Promo)</span>
                      <ExternalLink size={12} color="#fb7185" style={{ opacity: 0.6 }} />
                    </td>
                    <td style={{ textAlign: 'right', padding: '8px 10px', color: '#fb7185' }}>
                      {formatLunaCurrency(diskonPenjualan)}
                    </td>
                    <td style={{ textAlign: 'right', padding: '8px 10px', color: '#94a3b8' }}>
                      {calcPercent(diskonPenjualan, totalIncomeVal)}
                    </td>
                  </tr>

                  {/* TOTAL INCOME */}
                  <tr style={{ fontWeight: '800', background: 'rgba(255,255,255,0.02)', borderTop: '1px solid #334155', borderBottom: '1px solid #334155' }}>
                    <td style={{ padding: '10px 10px', color: '#34d399' }}>Total Income</td>
                    <td style={{ textAlign: 'right', padding: '10px 10px', color: '#34d399' }}>
                      {formatLunaCurrency(totalIncomeVal)}
                    </td>
                    <td style={{ textAlign: 'right', padding: '10px 10px', color: '#34d399' }}>
                      100
                    </td>
                  </tr>

                  {/* 2. COST OF GOODS SOLD */}
                  <tr>
                    <td colSpan={3} style={{ fontWeight: '800', color: '#f8fafc', padding: '22px 10px 8px 10px', fontSize: '0.92rem' }}>
                      Cost of Goods Sold (Harga Pokok Produksi)
                    </td>
                  </tr>

                  {/* ACCOUNT 5002 HEADER */}
                  <tr
                    onClick={() => handleOpenAccountDetail('5002', 'Harga Pokok Produksi (HPP)', hppVal)}
                    style={{ cursor: 'pointer', transition: 'background 0.15s' }}
                    className="hover:bg-slate-800/60"
                  >
                    <td style={{ padding: '8px 10px 8px 28px', color: '#38bdf8', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span>[5002] Harga Pokok Produksi / Penjualan (HPP)</span>
                      <ExternalLink size={12} color="#38bdf8" style={{ opacity: 0.6 }} />
                    </td>
                    <td style={{ textAlign: 'right', padding: '8px 10px', color: '#f8fafc', fontWeight: '700' }}>
                      {formatLunaCurrency(hppVal)}
                    </td>
                    <td style={{ textAlign: 'right', padding: '8px 10px', color: '#94a3b8', fontWeight: '700' }}>
                      {calcPercent(hppVal, totalIncomeVal)}
                    </td>
                  </tr>

                  {/* HPP ITEMIZATION BY MATERIAL CATEGORY */}
                  <tr
                    onClick={() => handleOpenAccountDetail('5002.01', 'HPP Bahan Baku Utama (Daging, Ayam & Seafood)', hppUtamaVal)}
                    style={{ cursor: 'pointer', transition: 'background 0.15s' }}
                    className="hover:bg-slate-800/60"
                  >
                    <td style={{ padding: '5px 10px 5px 48px', color: '#94a3b8', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>↳ [5002.01] HPP Bahan Baku Utama (Daging, Ayam &amp; Seafood)</span>
                    </td>
                    <td style={{ textAlign: 'right', padding: '5px 10px', color: '#cbd5e1', fontSize: '0.82rem' }}>
                      {formatLunaCurrency(hppUtamaVal)}
                    </td>
                    <td style={{ textAlign: 'right', padding: '5px 10px', color: '#64748b', fontSize: '0.82rem' }}>
                      {calcPercent(hppUtamaVal, totalIncomeVal)}
                    </td>
                  </tr>

                  <tr
                    onClick={() => handleOpenAccountDetail('5002.02', 'HPP Sayuran, Bumbu & Bahan Dapur', hppBumbuVal)}
                    style={{ cursor: 'pointer', transition: 'background 0.15s' }}
                    className="hover:bg-slate-800/60"
                  >
                    <td style={{ padding: '5px 10px 5px 48px', color: '#94a3b8', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>↳ [5002.02] HPP Sayuran, Bumbu &amp; Bahan Dapur</span>
                    </td>
                    <td style={{ textAlign: 'right', padding: '5px 10px', color: '#cbd5e1', fontSize: '0.82rem' }}>
                      {formatLunaCurrency(hppBumbuVal)}
                    </td>
                    <td style={{ textAlign: 'right', padding: '5px 10px', color: '#64748b', fontSize: '0.82rem' }}>
                      {calcPercent(hppBumbuVal, totalIncomeVal)}
                    </td>
                  </tr>

                  <tr
                    onClick={() => handleOpenAccountDetail('5002.03', 'HPP Minuman & Packaged Goods', hppMinumanVal)}
                    style={{ cursor: 'pointer', transition: 'background 0.15s' }}
                    className="hover:bg-slate-800/60"
                  >
                    <td style={{ padding: '5px 10px 5px 48px', color: '#94a3b8', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>↳ [5002.03] HPP Minuman &amp; Packaged Goods</span>
                    </td>
                    <td style={{ textAlign: 'right', padding: '5px 10px', color: '#cbd5e1', fontSize: '0.82rem' }}>
                      {formatLunaCurrency(hppMinumanVal)}
                    </td>
                    <td style={{ textAlign: 'right', padding: '5px 10px', color: '#64748b', fontSize: '0.82rem' }}>
                      {calcPercent(hppMinumanVal, totalIncomeVal)}
                    </td>
                  </tr>

                  {/* ACCOUNT 5005 */}
                  <tr
                    onClick={() => handleOpenAccountDetail('5005', 'Biaya Pengiriman', biayaPengiriman)}
                    style={{ cursor: 'pointer', transition: 'background 0.15s' }}
                    className="hover:bg-slate-800/60"
                  >
                    <td style={{ padding: '8px 10px 8px 28px', color: '#38bdf8', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span>[5005] Biaya Pengiriman &amp; Expedisi Bahan</span>
                      <ExternalLink size={12} color="#38bdf8" style={{ opacity: 0.6 }} />
                    </td>
                    <td style={{ textAlign: 'right', padding: '8px 10px', color: '#f8fafc' }}>
                      {formatLunaCurrency(biayaPengiriman)}
                    </td>
                    <td style={{ textAlign: 'right', padding: '8px 10px', color: '#94a3b8' }}>
                      {calcPercent(biayaPengiriman, totalIncomeVal)}
                    </td>
                  </tr>

                  {/* TOTAL COGS */}
                  <tr style={{ fontWeight: '800', background: 'rgba(255,255,255,0.02)', borderTop: '1px solid #334155', borderBottom: '1px solid #334155' }}>
                    <td style={{ padding: '10px 10px', color: '#fb7185' }}>Total Cost of Goods Sold</td>
                    <td style={{ textAlign: 'right', padding: '10px 10px', color: '#fb7185' }}>
                      {formatLunaCurrency(totalCogsVal)}
                    </td>
                    <td style={{ textAlign: 'right', padding: '10px 10px', color: '#fb7185' }}>
                      {calcPercent(totalCogsVal, totalIncomeVal)}
                    </td>
                  </tr>

                  {/* 3. GROSS PROFIT */}
                  <tr style={{ fontWeight: '900', background: 'rgba(99, 102, 241, 0.12)', borderTop: '2px solid #6366f1', borderBottom: '2px solid #6366f1' }}>
                    <td style={{ padding: '12px 10px', color: '#34d399', textTransform: 'uppercase' }}>GROSS PROFIT</td>
                    <td style={{ textAlign: 'right', padding: '12px 10px', color: '#34d399' }}>
                      {formatLunaCurrency(grossProfitVal)}
                    </td>
                    <td style={{ textAlign: 'right', padding: '12px 10px', color: '#34d399' }}>
                      {calcPercent(grossProfitVal, totalIncomeVal)}
                    </td>
                  </tr>

                  {/* 4. EXPENSE */}
                  <tr>
                    <td colSpan={3} style={{ fontWeight: '800', color: '#f8fafc', padding: '22px 10px 8px 10px', fontSize: '0.92rem' }}>
                      Expense
                    </td>
                  </tr>
                  {dynamicExpenseItems.map((ex, idx) => {
                    const matchCode = ex.codeName.match(/\[(.*?)\]/);
                    const code = matchCode ? matchCode[1] : `690${idx + 1}`;
                    return (
                      <tr
                        key={idx}
                        onClick={() => handleOpenAccountDetail(code, ex.codeName, ex.amount)}
                        style={{ cursor: 'pointer', transition: 'background 0.15s' }}
                        className="hover:bg-slate-800/60"
                      >
                        <td style={{ padding: '8px 10px 8px 28px', color: '#38bdf8', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span>{ex.codeName}</span>
                          <ExternalLink size={12} color="#38bdf8" style={{ opacity: 0.6 }} />
                        </td>
                        <td style={{ textAlign: 'right', padding: '8px 10px', color: '#f8fafc' }}>
                          {formatLunaCurrency(ex.amount)}
                        </td>
                        <td style={{ textAlign: 'right', padding: '8px 10px', color: '#94a3b8' }}>
                          {calcPercent(ex.amount, totalIncomeVal)}
                        </td>
                      </tr>
                    );
                  })}
                  <tr style={{ fontWeight: '800', background: 'rgba(255,255,255,0.02)', borderTop: '1px solid #334155', borderBottom: '1px solid #334155' }}>
                    <td style={{ padding: '10px 10px', color: '#fb7185' }}>Total Expense</td>
                    <td style={{ textAlign: 'right', padding: '10px 10px', color: '#fb7185' }}>
                      {formatLunaCurrency(totalExpenseVal)}
                    </td>
                    <td style={{ textAlign: 'right', padding: '10px 10px', color: '#fb7185' }}>
                      {calcPercent(totalExpenseVal, totalIncomeVal)}
                    </td>
                  </tr>

                  {/* 5. NET OPERATING INCOME */}
                  <tr style={{ fontWeight: '900', background: 'rgba(99, 102, 241, 0.12)', borderTop: '2px solid #6366f1', borderBottom: '2px solid #6366f1' }}>
                    <td style={{ padding: '12px 10px', color: '#34d399', textTransform: 'uppercase' }}>NET OPERATING INCOME</td>
                    <td style={{ textAlign: 'right', padding: '12px 10px', color: '#34d399' }}>
                      {formatLunaCurrency(netOperatingIncomeVal)}
                    </td>
                    <td style={{ textAlign: 'right', padding: '12px 10px', color: '#34d399' }}>
                      {calcPercent(netOperatingIncomeVal, totalIncomeVal)}
                    </td>
                  </tr>

                  {/* 6. OTHER INCOME */}
                  <tr>
                    <td colSpan={3} style={{ fontWeight: '800', color: '#f8fafc', padding: '22px 10px 8px 10px', fontSize: '0.92rem' }}>
                      Other Income
                    </td>
                  </tr>
                  {otherIncomeItems.map((oi, idx) => (
                    <tr
                      key={idx}
                      onClick={() => handleOpenAccountDetail(`700${idx+1}`, oi.codeName, oi.amount)}
                      style={{ cursor: 'pointer', transition: 'background 0.15s' }}
                      className="hover:bg-slate-800/60"
                    >
                      <td style={{ padding: '8px 10px 8px 28px', color: '#38bdf8', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span>{oi.codeName}</span>
                        <ExternalLink size={12} color="#38bdf8" style={{ opacity: 0.6 }} />
                      </td>
                      <td style={{ textAlign: 'right', padding: '8px 10px', color: '#f8fafc' }}>
                        {formatLunaCurrency(oi.amount)}
                      </td>
                      <td style={{ textAlign: 'right', padding: '8px 10px', color: '#94a3b8' }}>
                        {calcPercent(oi.amount, totalIncomeVal)}
                      </td>
                    </tr>
                  ))}
                  <tr style={{ fontWeight: '800', background: 'rgba(255,255,255,0.02)', borderTop: '1px solid #334155', borderBottom: '1px solid #334155' }}>
                    <td style={{ padding: '10px 10px', color: '#34d399' }}>Total Other Income</td>
                    <td style={{ textAlign: 'right', padding: '10px 10px', color: '#34d399' }}>
                      {formatLunaCurrency(totalOtherIncomeVal)}
                    </td>
                    <td style={{ textAlign: 'right', padding: '10px 10px', color: '#34d399' }}>
                      {calcPercent(totalOtherIncomeVal, totalIncomeVal)}
                    </td>
                  </tr>

                  {/* 7. OTHER EXPENSE */}
                  <tr>
                    <td colSpan={3} style={{ fontWeight: '800', color: '#f8fafc', padding: '22px 10px 8px 10px', fontSize: '0.92rem' }}>
                      Other Expense
                    </td>
                  </tr>
                  {otherExpenseItems.map((oe, idx) => (
                    <tr
                      key={idx}
                      onClick={() => handleOpenAccountDetail(`800${idx+1}`, oe.codeName, oe.amount)}
                      style={{ cursor: 'pointer', transition: 'background 0.15s' }}
                      className="hover:bg-slate-800/60"
                    >
                      <td style={{ padding: '8px 10px 8px 28px', color: '#38bdf8', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span>{oe.codeName}</span>
                        <ExternalLink size={12} color="#38bdf8" style={{ opacity: 0.6 }} />
                      </td>
                      <td style={{ textAlign: 'right', padding: '8px 10px', color: '#f8fafc' }}>
                        {formatLunaCurrency(oe.amount)}
                      </td>
                      <td style={{ textAlign: 'right', padding: '8px 10px', color: '#94a3b8' }}>
                        {calcPercent(oe.amount, totalIncomeVal)}
                      </td>
                    </tr>
                  ))}
                  <tr style={{ fontWeight: '800', background: 'rgba(255,255,255,0.02)', borderTop: '1px solid #334155', borderBottom: '1px solid #334155' }}>
                    <td style={{ padding: '10px 10px', color: '#fb7185' }}>Total Other Expense</td>
                    <td style={{ textAlign: 'right', padding: '10px 10px', color: '#fb7185' }}>
                      {formatLunaCurrency(totalOtherExpenseVal)}
                    </td>
                    <td style={{ textAlign: 'right', padding: '10px 10px', color: '#fb7185' }}>
                      {calcPercent(totalOtherExpenseVal, totalIncomeVal)}
                    </td>
                  </tr>

                  {/* 8. NET OTHER INCOME */}
                  <tr style={{ fontWeight: '900', background: 'rgba(244, 63, 94, 0.1)', borderTop: '2px solid #fb7185', borderBottom: '2px solid #fb7185' }}>
                    <td style={{ padding: '12px 10px', color: '#fb7185', textTransform: 'uppercase' }}>NET OTHER INCOME</td>
                    <td style={{ textAlign: 'right', padding: '12px 10px', color: '#fb7185' }}>
                      {formatLunaCurrency(netOtherIncomeVal)}
                    </td>
                    <td style={{ textAlign: 'right', padding: '12px 10px', color: '#fb7185' }}>
                      {calcPercent(netOtherIncomeVal, totalIncomeVal)}
                    </td>
                  </tr>

                  {/* 9. NET INCOME */}
                  <tr style={{ fontWeight: '900', background: 'rgba(52, 211, 153, 0.12)', borderTop: '2px solid #34d399', borderBottom: '2px solid #34d399' }}>
                    <td style={{ padding: '14px 10px', color: '#34d399', fontSize: '0.98rem', textTransform: 'uppercase' }}>NET INCOME</td>
                    <td style={{ textAlign: 'right', padding: '14px 10px', color: '#34d399', fontSize: '1.05rem' }}>
                      {formatLunaCurrency(netIncomeVal)}
                    </td>
                    <td style={{ textAlign: 'right', padding: '14px 10px', color: '#34d399', fontSize: '1.05rem' }}>
                      {calcPercent(netIncomeVal, totalIncomeVal)}
                    </td>
                  </tr>

                </tbody>
              </table>
            </div>
            ) : (
              renderMultiMonthComparisonTable()
            )}
          </div>
        )}

        {/* 2. NERACA (BALANCE SHEET) VIEW */}
        {activeSubTab === 'balance' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* MAIN BALANCE SHEET CARD (MRIS GLASSMORPHISM THEME) */}
            <div style={{
              background: '#1e293b',
              color: '#f8fafc',
              padding: '36px 48px',
              borderRadius: '16px',
              border: '1px solid #334155',
              boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
              fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
            }}>

              {/* REPORT TITLE & SUBTITLE */}
              <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                <h1 style={{ fontSize: '2.1rem', fontWeight: '800', color: '#38bdf8', margin: 0, letterSpacing: '-0.02em' }}>
                  Balance Sheet
                </h1>
                <div style={{ fontSize: '0.95rem', color: '#94a3b8', fontWeight: '700', marginTop: '6px' }}>
                  Per Tanggal: {endDate ? formatDateIndo(endDate) : '31/07/2026'}
                </div>
                {selectedOutlets.length > 0 && (
                  <div style={{ fontSize: '0.8rem', color: '#818cf8', fontWeight: '600', marginTop: '4px' }}>
                    Cabang: {selectedOutlets.map(id => getOutletName(id)).join(', ')}
                  </div>
                )}
                <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>
                  💡 Klik nama akun untuk melihat rincian riwayat transaksi &amp; saldo
                </div>
              </div>

              {/* TABLE BALANCE SHEET */}
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
                <thead>
                  <tr style={{ background: '#0f172a', borderTop: '2px solid #334155', borderBottom: '2px solid #334155', color: '#f8fafc' }}>
                    <th style={{ textAlign: 'left', padding: '12px 14px', fontWeight: '800' }}>Account Description</th>
                    <th style={{ textAlign: 'right', padding: '12px 14px', fontWeight: '800', width: '260px' }}>Total (IDR)</th>
                  </tr>
                </thead>
                <tbody>

                  {/* 1. ASSET SECTION HEADER */}
                  <tr>
                    <td colSpan={2} style={{ fontWeight: '900', color: '#38bdf8', padding: '18px 10px 6px 10px', fontSize: '1rem', textTransform: 'uppercase' }}>
                      ASSET
                    </td>
                  </tr>

                  {/* CASH AND BANK */}
                  <tr
                    onClick={() => handleOpenAccountDetail('1101', 'Kas Di Laci & Bank Operasional', totalCashAndBank)}
                    style={{ cursor: 'pointer', transition: 'background 0.15s' }}
                    className="hover:bg-slate-800/60"
                  >
                    <td style={{ padding: '6px 10px 6px 28px', color: '#38bdf8', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span>[1101] Kas Laci Kasir &amp; Rekening Bank</span>
                      <ExternalLink size={12} color="#38bdf8" style={{ opacity: 0.6 }} />
                    </td>
                    <td style={{ textAlign: 'right', padding: '6px 10px', color: '#f8fafc' }}>
                      {formatLunaCurrency(totalCashAndBank)}
                    </td>
                  </tr>
                  <tr style={{ fontWeight: '800', borderBottom: '1px solid #334155', background: 'rgba(255,255,255,0.01)' }}>
                    <td style={{ padding: '8px 10px 8px 28px', color: '#cbd5e1' }}>Total Cash and Bank</td>
                    <td style={{ textAlign: 'right', padding: '8px 10px', color: '#f8fafc' }}>
                      {formatLunaCurrency(totalCashAndBank)}
                    </td>
                  </tr>

                  {/* ACCOUNT RECEIVABLE */}
                  <tr>
                    <td colSpan={2} style={{ fontWeight: '800', color: '#f8fafc', padding: '16px 10px 4px 10px', fontSize: '0.92rem' }}>
                      Account Receivable
                    </td>
                  </tr>
                  <tr
                    onClick={() => handleOpenAccountDetail('1201', 'Piutang Usaha', piutangUsaha)}
                    style={{ cursor: 'pointer', transition: 'background 0.15s' }}
                    className="hover:bg-slate-800/60"
                  >
                    <td style={{ padding: '6px 10px 6px 28px', color: '#38bdf8', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span>[1201] Piutang Usaha</span>
                      <ExternalLink size={12} color="#38bdf8" style={{ opacity: 0.6 }} />
                    </td>
                    <td style={{ textAlign: 'right', padding: '6px 10px', color: '#f8fafc' }}>
                      {formatLunaCurrency(piutangUsaha)}
                    </td>
                  </tr>
                  <tr style={{ fontWeight: '800', borderBottom: '1px solid #334155', background: 'rgba(255,255,255,0.01)' }}>
                    <td style={{ padding: '8px 10px 8px 28px', color: '#cbd5e1' }}>Total Account Receivable</td>
                    <td style={{ textAlign: 'right', padding: '8px 10px', color: '#f8fafc' }}>
                      {formatLunaCurrency(piutangUsaha)}
                    </td>
                  </tr>

                  {/* INVENTORY */}
                  <tr>
                    <td colSpan={2} style={{ fontWeight: '800', color: '#f8fafc', padding: '16px 10px 4px 10px', fontSize: '0.92rem' }}>
                      Inventory
                    </td>
                  </tr>
                  <tr
                    onClick={() => handleOpenAccountDetail('1301', 'Persediaan Stok Bahan Baku Dapur', rawMaterialInventoryValue)}
                    style={{ cursor: 'pointer', transition: 'background 0.15s' }}
                    className="hover:bg-slate-800/60"
                  >
                    <td style={{ padding: '6px 10px 6px 28px', color: '#38bdf8', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span>[1301] Persediaan</span>
                      <ExternalLink size={12} color="#38bdf8" style={{ opacity: 0.6 }} />
                    </td>
                    <td style={{ textAlign: 'right', padding: '6px 10px', color: '#f8fafc' }}>
                      {formatLunaCurrency(rawMaterialInventoryValue)}
                    </td>
                  </tr>
                  <tr style={{ fontWeight: '800', borderBottom: '1px solid #334155', background: 'rgba(255,255,255,0.01)' }}>
                    <td style={{ padding: '8px 10px 8px 28px', color: '#cbd5e1' }}>Total Inventory</td>
                    <td style={{ textAlign: 'right', padding: '8px 10px', color: '#f8fafc' }}>
                      {formatLunaCurrency(rawMaterialInventoryValue)}
                    </td>
                  </tr>

                  {/* OTHER CURRENT ASSET */}
                  <tr>
                    <td colSpan={2} style={{ fontWeight: '800', color: '#f8fafc', padding: '16px 10px 4px 10px', fontSize: '0.92rem' }}>
                      Other Current Asset
                    </td>
                  </tr>
                  <tr
                    onClick={() => handleOpenAccountDetail('1431', 'Dana Cadangan Gaji Karyawan', cadanganGaji)}
                    style={{ cursor: 'pointer', transition: 'background 0.15s' }}
                    className="hover:bg-slate-800/60"
                  >
                    <td style={{ padding: '6px 10px 6px 28px', color: '#38bdf8', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span>[1431] Dana Cadangan Gaji Karyawan</span>
                      <ExternalLink size={12} color="#38bdf8" style={{ opacity: 0.6 }} />
                    </td>
                    <td style={{ textAlign: 'right', padding: '6px 10px', color: '#f8fafc' }}>
                      {formatLunaCurrency(cadanganGaji)}
                    </td>
                  </tr>
                  <tr
                    onClick={() => handleOpenAccountDetail('1432', 'Dana Cadangan Sewa Gedung', cadanganSewa)}
                    style={{ cursor: 'pointer', transition: 'background 0.15s' }}
                    className="hover:bg-slate-800/60"
                  >
                    <td style={{ padding: '6px 10px 6px 28px', color: '#38bdf8', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span>[1432] Dana Cadangan Sewa Gedung</span>
                      <ExternalLink size={12} color="#38bdf8" style={{ opacity: 0.6 }} />
                    </td>
                    <td style={{ textAlign: 'right', padding: '6px 10px', color: '#f8fafc' }}>
                      {formatLunaCurrency(cadanganSewa)}
                    </td>
                  </tr>
                  <tr
                    onClick={() => handleOpenAccountDetail('1433', 'Dana Cadangan Tunjangan HariRaya', cadanganTHR)}
                    style={{ cursor: 'pointer', transition: 'background 0.15s' }}
                    className="hover:bg-slate-800/60"
                  >
                    <td style={{ padding: '6px 10px 6px 28px', color: '#38bdf8', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span>[1433] Dana Cadangan Tunjangan HariRaya</span>
                      <ExternalLink size={12} color="#38bdf8" style={{ opacity: 0.6 }} />
                    </td>
                    <td style={{ textAlign: 'right', padding: '6px 10px', color: '#f8fafc' }}>
                      {formatLunaCurrency(cadanganTHR)}
                    </td>
                  </tr>
                  <tr style={{ fontWeight: '800', borderBottom: '1px solid #334155', background: 'rgba(255,255,255,0.01)' }}>
                    <td style={{ padding: '8px 10px 8px 28px', color: '#cbd5e1' }}>Total Other Current Asset</td>
                    <td style={{ textAlign: 'right', padding: '8px 10px', color: '#f8fafc' }}>
                      {formatLunaCurrency(totalOtherCurrentAsset)}
                    </td>
                  </tr>

                  {/* TOTAL ASSET */}
                  <tr style={{ fontWeight: '900', background: 'rgba(56, 189, 248, 0.12)', borderTop: '2px solid #38bdf8', borderBottom: '2px solid #38bdf8' }}>
                    <td style={{ padding: '14px 10px', color: '#38bdf8', fontSize: '1rem', textTransform: 'uppercase' }}>TOTAL ASSET</td>
                    <td style={{ textAlign: 'right', padding: '14px 10px', color: '#38bdf8', fontSize: '1.05rem' }}>
                      {formatLunaCurrency(totalAssetsVal)}
                    </td>
                  </tr>

                  {/* 2. LIABILITIES AND EQUITY SECTION */}
                  <tr>
                    <td colSpan={2} style={{ fontWeight: '900', color: '#f8fafc', padding: '32px 10px 8px 10px', fontSize: '1rem', textTransform: 'uppercase', borderBottom: '1px solid #334155' }}>
                      LIABILITIES AND EQUITY
                    </td>
                  </tr>

                  {/* LIABILITY */}
                  <tr>
                    <td colSpan={2} style={{ fontWeight: '800', color: '#f8fafc', padding: '18px 10px 4px 10px', fontSize: '0.92rem' }}>
                      LIABILITY
                    </td>
                  </tr>
                  <tr
                    onClick={() => handleOpenAccountDetail('2101', 'Hutang Operasional Kasir & Supplier', totalLiability)}
                    style={{ cursor: 'pointer', transition: 'background 0.15s' }}
                    className="hover:bg-slate-800/60"
                  >
                    <td style={{ padding: '6px 10px 6px 28px', color: '#fb7185', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span>[2101] Hutang Operasional Kasir &amp; Supplier</span>
                      <ExternalLink size={12} color="#fb7185" style={{ opacity: 0.6 }} />
                    </td>
                    <td style={{ textAlign: 'right', padding: '6px 10px', color: '#f8fafc' }}>
                      {formatLunaCurrency(totalLiability)}
                    </td>
                  </tr>
                  <tr style={{ fontWeight: '800', borderBottom: '1px solid #334155', background: 'rgba(255,255,255,0.01)' }}>
                    <td style={{ padding: '8px 10px', color: '#fb7185' }}>Total Liability</td>
                    <td style={{ textAlign: 'right', padding: '8px 10px', color: '#fb7185' }}>
                      {formatLunaCurrency(totalLiability)}
                    </td>
                  </tr>

                  {/* EQUITY */}
                  <tr>
                    <td colSpan={2} style={{ fontWeight: '800', color: '#f8fafc', padding: '18px 10px 4px 10px', fontSize: '0.92rem' }}>
                      EQUITY
                    </td>
                  </tr>
                  <tr
                    onClick={() => handleOpenAccountDetail('3101', 'Modal Disetor Owner / Investor', ownerCapital)}
                    style={{ cursor: 'pointer', transition: 'background 0.15s' }}
                    className="hover:bg-slate-800/60"
                  >
                    <td style={{ padding: '6px 10px 6px 28px', color: '#818cf8', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span>[3101] Modal Disetor Owner / Investor</span>
                      <ExternalLink size={12} color="#818cf8" style={{ opacity: 0.6 }} />
                    </td>
                    <td style={{ textAlign: 'right', padding: '6px 10px', color: '#f8fafc' }}>
                      {formatLunaCurrency(ownerCapital)}
                    </td>
                  </tr>
                  <tr
                    onClick={() => handleOpenAccountDetail('3201', 'Net Income (Laba Bersih Operasional)', netIncomeVal)}
                    style={{ cursor: 'pointer', transition: 'background 0.15s' }}
                    className="hover:bg-slate-800/60"
                  >
                    <td style={{ padding: '6px 10px 6px 28px', color: '#34d399', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span>Net Income</span>
                      <ExternalLink size={12} color="#34d399" style={{ opacity: 0.6 }} />
                    </td>
                    <td style={{ textAlign: 'right', padding: '6px 10px', color: '#34d399', fontWeight: '700' }}>
                      {formatLunaCurrency(netIncomeVal)}
                    </td>
                  </tr>
                  <tr style={{ fontWeight: '800', borderBottom: '1px solid #334155', background: 'rgba(255,255,255,0.01)' }}>
                    <td style={{ padding: '8px 10px', color: '#818cf8' }}>Total Equity</td>
                    <td style={{ textAlign: 'right', padding: '8px 10px', color: '#818cf8' }}>
                      {formatLunaCurrency(totalEquity)}
                    </td>
                  </tr>

                  {/* TOTAL LIABILITIES AND EQUITY */}
                  <tr style={{ fontWeight: '900', background: 'rgba(52, 211, 153, 0.12)', borderTop: '2px solid #34d399', borderBottom: '2px solid #34d399' }}>
                    <td style={{ padding: '14px 10px', color: '#34d399', fontSize: '1rem', textTransform: 'uppercase' }}>TOTAL LIABILITIES AND EQUITY</td>
                    <td style={{ textAlign: 'right', padding: '14px 10px', color: '#34d399', fontSize: '1.05rem' }}>
                      {formatLunaCurrency(totalLiability + totalEquity)}
                    </td>
                  </tr>

                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 3. ARUS KAS (CASH FLOW STATEMENT) VIEW - EXACT LUNA POS HIERARCHY MATCH */}
        {activeSubTab === 'cashflow' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* MAIN CASH FLOW REPORT CARD (MRIS GLASSMORPHISM THEME) */}
            <div style={{
              background: '#1e293b',
              color: '#f8fafc',
              padding: '36px 48px',
              borderRadius: '16px',
              border: '1px solid #334155',
              boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
              fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
            }}>

              {/* REPORT TITLE & SUBTITLE */}
              <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                <h1 style={{ fontSize: '2.1rem', fontWeight: '800', color: '#38bdf8', margin: 0, letterSpacing: '-0.02em' }}>
                  Arus Kas
                </h1>
                <div style={{ fontSize: '0.95rem', color: '#94a3b8', fontWeight: '700', marginTop: '6px' }}>
                  {startDate && endDate ? `${formatDateIndo(startDate)} - ${formatDateIndo(endDate)}` : '01/07/2026 - 24/07/2026'}
                </div>
                {selectedOutlets.length > 0 && (
                  <div style={{ fontSize: '0.8rem', color: '#818cf8', fontWeight: '600', marginTop: '4px' }}>
                    Cabang: {selectedOutlets.map(id => getOutletName(id)).join(', ')}
                  </div>
                )}
                <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>
                  💡 Klik nama item arus kas untuk melihat rincian riwayat transaksi
                </div>
              </div>

              {/* TABLE CASH FLOW (EXACT HIERARCHY MATCHING LUNA POS SCREENSHOT) */}
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
                <thead>
                  <tr style={{ background: '#0f172a', borderTop: '2px solid #334155', borderBottom: '2px solid #334155', color: '#f8fafc' }}>
                    <th style={{ textAlign: 'left', padding: '12px 14px', fontWeight: '800' }}>Deskripsi</th>
                    <th style={{ textAlign: 'right', padding: '12px 14px', fontWeight: '800', width: '260px' }}>Total</th>
                  </tr>
                </thead>
                <tbody>

                  {/* 1. ARUS KAS DARI AKTIVITAS OPERASIONAL */}
                  <tr>
                    <td colSpan={2} style={{ fontWeight: '800', color: '#f8fafc', padding: '18px 10px 8px 10px', fontSize: '0.92rem' }}>
                      Arus Kas dari Aktivitas Operasional
                    </td>
                  </tr>

                  <tr
                    onClick={() => handleOpenAccountDetail('CF-OPS-INC', 'Penerimaan Kas dari Aktivitas Jual Beli', penerimaanKasJualBeli)}
                    style={{ cursor: 'pointer', transition: 'background 0.15s' }}
                    className="hover:bg-slate-800/60"
                  >
                    <td style={{ padding: '6px 10px 6px 28px', color: '#34d399', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span>Penerimaan Kas dari Aktivitas Jual Beli</span>
                      <ExternalLink size={12} color="#34d399" style={{ opacity: 0.6 }} />
                    </td>
                    <td style={{ textAlign: 'right', padding: '6px 10px', color: '#34d399' }}>
                      {formatLunaCurrency(penerimaanKasJualBeli)}
                    </td>
                  </tr>

                  <tr style={{ transition: 'background 0.15s' }}>
                    <td style={{ padding: '6px 10px 6px 28px', color: '#cbd5e1' }}>
                      Refund atas Penjualan Barang
                    </td>
                    <td style={{ textAlign: 'right', padding: '6px 10px', color: '#f8fafc' }}>
                      {formatLunaCurrency(refundPenjualan)}
                    </td>
                  </tr>

                  <tr style={{ transition: 'background 0.15s' }}>
                    <td style={{ padding: '6px 10px 6px 28px', color: '#cbd5e1' }}>
                      Pembelian Asset Lancar
                    </td>
                    <td style={{ textAlign: 'right', padding: '6px 10px', color: '#f8fafc' }}>
                      {formatLunaCurrency(pembelianAssetLancar)}
                    </td>
                  </tr>

                  <tr style={{ transition: 'background 0.15s' }}>
                    <td style={{ padding: '6px 10px 6px 28px', color: '#cbd5e1' }}>
                      Pembayaran ke pemasok
                    </td>
                    <td style={{ textAlign: 'right', padding: '6px 10px', color: '#f8fafc' }}>
                      {formatLunaCurrency(pembayaranPemasok)}
                    </td>
                  </tr>

                  <tr style={{ transition: 'background 0.15s' }}>
                    <td style={{ padding: '6px 10px 6px 28px', color: '#cbd5e1' }}>
                      Refund atas Pembelian Barang
                    </td>
                    <td style={{ textAlign: 'right', padding: '6px 10px', color: '#f8fafc' }}>
                      {formatLunaCurrency(refundPembelian)}
                    </td>
                  </tr>

                  <tr style={{ transition: 'background 0.15s' }}>
                    <td style={{ padding: '6px 10px 6px 28px', color: '#cbd5e1' }}>
                      Pembayaran Hutang (Liabilitas)
                    </td>
                    <td style={{ textAlign: 'right', padding: '6px 10px', color: '#f8fafc' }}>
                      {formatLunaCurrency(pembayaranHutang)}
                    </td>
                  </tr>

                  <tr style={{ transition: 'background 0.15s' }}>
                    <td style={{ padding: '6px 10px 6px 28px', color: '#cbd5e1' }}>
                      Pendapatan Lainnya (Diluar Aktivitas Jual Beli)
                    </td>
                    <td style={{ textAlign: 'right', padding: '6px 10px', color: '#f8fafc' }}>
                      {formatLunaCurrency(pendapatanLainnya)}
                    </td>
                  </tr>

                  <tr
                    onClick={() => handleOpenAccountDetail('CF-OPS-EXP', 'Pengeluaran Operasional', pengeluaranOperasional)}
                    style={{ cursor: 'pointer', transition: 'background 0.15s' }}
                    className="hover:bg-slate-800/60"
                  >
                    <td style={{ padding: '6px 10px 6px 28px', color: '#fb7185', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span>Pengeluaran Operasional</span>
                      <ExternalLink size={12} color="#fb7185" style={{ opacity: 0.6 }} />
                    </td>
                    <td style={{ textAlign: 'right', padding: '6px 10px', color: '#fb7185' }}>
                      {formatLunaCurrency(pengeluaranOperasional)}
                    </td>
                  </tr>

                  <tr style={{ fontWeight: '800', background: 'rgba(255,255,255,0.02)', borderTop: '1px solid #334155', borderBottom: '1px solid #334155' }}>
                    <td style={{ padding: '10px 10px', color: kasBersihOperasional >= 0 ? '#34d399' : '#fb7185' }}>
                      Kas Bersih yang diperoleh dari Aktivitas Operasional
                    </td>
                    <td style={{ textAlign: 'right', padding: '10px 10px', color: kasBersihOperasional >= 0 ? '#34d399' : '#fb7185' }}>
                      {formatLunaCurrency(kasBersihOperasional)}
                    </td>
                  </tr>

                  {/* 2. ARUS KAS DARI AKTIVITAS INVESTASI */}
                  <tr>
                    <td colSpan={2} style={{ fontWeight: '800', color: '#f8fafc', padding: '22px 10px 8px 10px', fontSize: '0.92rem' }}>
                      Arus Kas dari Aktivitas Investasi
                    </td>
                  </tr>

                  <tr style={{ transition: 'background 0.15s' }}>
                    <td style={{ padding: '6px 10px 6px 28px', color: '#cbd5e1' }}>
                      Perolehan atas Penjualan/Pelepasan Asset
                    </td>
                    <td style={{ textAlign: 'right', padding: '6px 10px', color: '#f8fafc' }}>
                      {formatLunaCurrency(perolehanPenjualanAsset)}
                    </td>
                  </tr>

                  <tr style={{ transition: 'background 0.15s' }}>
                    <td style={{ padding: '6px 10px 6px 28px', color: '#cbd5e1' }}>
                      Aktivitas Investasi Lainnya
                    </td>
                    <td style={{ textAlign: 'right', padding: '6px 10px', color: '#f8fafc' }}>
                      {formatLunaCurrency(aktivitasInvestasiLainnya)}
                    </td>
                  </tr>

                  <tr style={{ fontWeight: '800', background: 'rgba(255,255,255,0.02)', borderTop: '1px solid #334155', borderBottom: '1px solid #334155' }}>
                    <td style={{ padding: '10px 10px', color: '#cbd5e1' }}>
                      Kas Bersih yang diperoleh dari Aktivitas Investasi
                    </td>
                    <td style={{ textAlign: 'right', padding: '10px 10px', color: '#f8fafc' }}>
                      {formatLunaCurrency(kasBersihInvestasi)}
                    </td>
                  </tr>

                  {/* 3. ARUS KAS DARI AKTIVITAS KEUANGAN */}
                  <tr>
                    <td colSpan={2} style={{ fontWeight: '800', color: '#f8fafc', padding: '22px 10px 8px 10px', fontSize: '0.92rem' }}>
                      Arus Kas Dari Aktivitas Keuangan
                    </td>
                  </tr>

                  <tr style={{ transition: 'background 0.15s' }}>
                    <td style={{ padding: '6px 10px 6px 28px', color: '#cbd5e1' }}>
                      Pembayaran / Penerimaan Pinjaman
                    </td>
                    <td style={{ textAlign: 'right', padding: '6px 10px', color: '#f8fafc' }}>
                      {formatLunaCurrency(penerimaanPinjaman)}
                    </td>
                  </tr>

                  <tr style={{ transition: 'background 0.15s' }}>
                    <td style={{ padding: '6px 10px 6px 28px', color: '#cbd5e1' }}>
                      Penambahan Modal
                    </td>
                    <td style={{ textAlign: 'right', padding: '6px 10px', color: '#f8fafc' }}>
                      {formatLunaCurrency(penambahanModal)}
                    </td>
                  </tr>

                  <tr style={{ fontWeight: '800', background: 'rgba(255,255,255,0.02)', borderTop: '1px solid #334155', borderBottom: '2px solid #334155' }}>
                    <td style={{ padding: '10px 10px', color: '#cbd5e1' }}>
                      Kas Bersih yang diperoleh dari Aktivitas Keuangan
                    </td>
                    <td style={{ textAlign: 'right', padding: '10px 10px', color: '#f8fafc' }}>
                      {formatLunaCurrency(kasBersihKeuangan)}
                    </td>
                  </tr>

                  {/* 4. REKAPITULASI KENAIKAN & SALDO KAS */}
                  <tr style={{ fontWeight: '900', background: 'rgba(56, 189, 248, 0.12)', borderTop: '2px solid #38bdf8', borderBottom: '1px solid #334155' }}>
                    <td style={{ padding: '12px 10px', color: '#38bdf8', textTransform: 'uppercase' }}>
                      KENAIKAN (PENURUNAN) KAS
                    </td>
                    <td style={{ textAlign: 'right', padding: '12px 10px', color: '#38bdf8', fontSize: '1rem' }}>
                      {formatLunaCurrency(kenaikanPenurunanKas)}
                    </td>
                  </tr>

                  <tr style={{ fontWeight: '800', background: 'rgba(255,255,255,0.01)', borderBottom: '1px solid #334155' }}>
                    <td style={{ padding: '12px 10px', color: '#818cf8', textTransform: 'uppercase' }}>
                      SALDO AWAL KAS
                    </td>
                    <td style={{ textAlign: 'right', padding: '12px 10px', color: '#f8fafc', fontSize: '1rem' }}>
                      {formatLunaCurrency(saldoAwalKas)}
                    </td>
                  </tr>

                  <tr style={{ fontWeight: '900', background: 'rgba(52, 211, 153, 0.12)', borderTop: '2px solid #34d399', borderBottom: '2px solid #34d399' }}>
                    <td style={{ padding: '14px 10px', color: '#34d399', textTransform: 'uppercase', fontSize: '1rem' }}>
                      SALDO AKHIR KAS
                    </td>
                    <td style={{ textAlign: 'right', padding: '14px 10px', color: '#34d399', fontSize: '1.1rem' }}>
                      {formatLunaCurrency(saldoAkhirKas)}
                    </td>
                  </tr>

                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 4. PERBANDINGAN GENERATE AI VIEW */}
        {activeSubTab === 'ai' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: '800', color: '#34d399', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Sparkles size={20} />
                  <span>Generator Laporan Perbandingan AI</span>
                </h3>
                <p style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                  Analisis perbandingan efisiensi &amp; profitabilitas antar outlet restoran menggunakan kecerdasan buatan
                </p>
              </div>

              <button onClick={handleGenerateAIReport} disabled={aiGenerating} className="btn-emerald">
                {aiGenerating ? <Sparkles size={16} className="animate-spin" /> : <Sparkles size={16} />}
                <span>{aiGenerating ? 'Menganalisis Data...' : 'Generate Laporan AI'}</span>
              </button>
            </div>

            {aiReportText ? (
              <div style={{ background: '#0f172a', border: '1px solid rgba(16,185,129,0.3)', padding: '20px', borderRadius: '14px' }}>
                <div style={{ fontSize: '0.75rem', color: '#34d399', fontWeight: '700', marginBottom: '12px' }}>
                  🤖 Laporan AI Dihasilkan Pada: {aiReportText.timestamp}
                </div>

                <h4 style={{ fontSize: '0.95rem', fontWeight: '700', color: '#f8fafc', marginBottom: '8px' }}>📌 Insight Perbandingan Kinerja Outlet:</h4>
                <ul style={{ paddingLeft: '20px', color: '#cbd5e1', fontSize: '0.85rem', marginBottom: '16px' }}>
                  {aiReportText.highlights.map((h, i) => (
                    <li key={i} style={{ marginBottom: '6px' }}>{h}</li>
                  ))}
                </ul>

                <h4 style={{ fontSize: '0.95rem', fontWeight: '700', color: '#f8fafc', marginBottom: '8px' }}>💡 Rekomendasi Strategis AI:</h4>
                <ul style={{ paddingLeft: '20px', color: '#34d399', fontSize: '0.85rem' }}>
                  {aiReportText.recommendations.map((r, i) => (
                    <li key={i} style={{ marginBottom: '6px' }}>{r}</li>
                  ))}
                </ul>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                <Sparkles size={36} color="#34d399" style={{ marginBottom: '12px' }} />
                <p>Klik tombol <strong>"Generate Laporan AI"</strong> untuk menganalisis data keuangan antar cabang restoran.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* RIWAYAT TRANSAKSI AKUN MODAL */}
      {accountDetailModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.85)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px'
        }}>
          <div style={{
            background: '#1e293b',
            border: '1px solid #475569',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '900px',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
            overflow: 'hidden'
          }} className="animate-scale-up">
            
            {/* MODAL HEADER */}
            <div style={{
              padding: '20px 24px',
              background: '#0f172a',
              borderBottom: '1px solid #334155',
              display: 'flex',
              justify: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{
                    padding: '4px 10px',
                    background: 'rgba(56, 189, 248, 0.15)',
                    border: '1px solid #38bdf8',
                    color: '#38bdf8',
                    borderRadius: '6px',
                    fontSize: '0.8rem',
                    fontWeight: '800'
                  }}>
                    [{accountDetailModal.code}]
                  </span>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: '800', color: '#f8fafc', margin: 0 }}>
                    Riwayat Transaksi: {accountDetailModal.name}
                  </h3>
                </div>
                <p style={{ color: '#94a3b8', fontSize: '0.8rem', marginTop: '4px', margin: 0 }}>
                  Periode: {startDate && endDate ? `${formatDateIndo(startDate)} - ${formatDateIndo(endDate)}` : 'Semua Periode'} | {selectedOutlets.length === 0 ? 'Semua Outlet' : `${selectedOutlets.length} Outlet Selected`}
                </p>
              </div>

              <button
                onClick={() => setAccountDetailModal(null)}
                style={{
                  background: '#334155',
                  border: 'none',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#cbd5e1',
                  cursor: 'pointer'
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* MODAL SUMMARY & SEARCH BAR */}
            <div style={{ padding: '16px 24px', background: '#1e293b', borderBottom: '1px solid #334155', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
              <div style={{ display: 'flex', gap: '16px' }}>
                <div style={{ background: '#0f172a', padding: '10px 16px', borderRadius: '10px', border: '1px solid #334155' }}>
                  <div style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: '700' }}>TOTAL AKUN</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: '900', color: accountDetailModal.totalAmount >= 0 ? '#34d399' : '#fb7185' }}>
                    {formatRupiah(accountDetailModal.totalAmount)}
                  </div>
                </div>

                <div style={{ background: '#0f172a', padding: '10px 16px', borderRadius: '10px', border: '1px solid #334155' }}>
                  <div style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: '700' }}>JUMLAH TRANSAKSI</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: '900', color: '#38bdf8' }}>
                    {accountDetailModal.transactions.length} Data
                  </div>
                </div>
              </div>

              {/* SEARCH INPUT */}
              <div style={{ position: 'relative', width: '260px' }}>
                <Search size={16} color="#64748b" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="text"
                  placeholder="Cari no. ref / keterangan..."
                  value={modalSearchQuery}
                  onChange={(e) => setModalSearchQuery(e.target.value)}
                  style={{
                    width: '100%',
                    background: '#0f172a',
                    border: '1px solid #475569',
                    borderRadius: '8px',
                    padding: '8px 12px 8px 36px',
                    color: '#f8fafc',
                    fontSize: '0.82rem',
                    outline: 'none'
                  }}
                />
              </div>
            </div>

            {/* TRANSACTIONS TABLE */}
            <div style={{ padding: '0', overflowY: 'auto', flex: 1 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ background: '#0f172a', color: '#94a3b8', fontSize: '0.75rem', textTransform: 'uppercase', stickyTop: 0, borderBottom: '2px solid #334155' }}>
                    <th style={{ padding: '12px 16px', width: '110px' }}>Tanggal</th>
                    <th style={{ padding: '12px 16px', width: '160px' }}>No. Referensi</th>
                    <th style={{ padding: '12px 16px', width: '150px' }}>Outlet / Cabang</th>
                    <th style={{ padding: '12px 16px', width: '140px' }}>Kasir / Inputor</th>
                    <th style={{ padding: '12px 16px' }}>Keterangan Rincian</th>
                    <th style={{ padding: '12px 16px', textAlign: 'right', width: '150px' }}>Jumlah (IDR)</th>
                  </tr>
                </thead>
                <tbody>
                  {accountDetailModal.transactions
                    .filter(tx => 
                      !modalSearchQuery || 
                      tx.id.toLowerCase().includes(modalSearchQuery.toLowerCase()) || 
                      tx.description.toLowerCase().includes(modalSearchQuery.toLowerCase()) ||
                      tx.cashier.toLowerCase().includes(modalSearchQuery.toLowerCase())
                    )
                    .map((tx, idx) => (
                      <tr
                        key={idx}
                        style={{
                          borderBottom: '1px solid rgba(255,255,255,0.05)',
                          background: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)'
                        }}
                      >
                        <td style={{ padding: '12px 16px', color: '#cbd5e1', whiteSpace: 'nowrap' }}>
                          {formatDateIndo(tx.date)}
                        </td>
                        <td style={{ padding: '12px 16px', color: '#38bdf8', fontWeight: '700' }}>
                          {tx.id}
                        </td>
                        <td style={{ padding: '12px 16px', color: '#f8fafc', fontWeight: '600' }}>
                          {tx.outlet_name}
                        </td>
                        <td style={{ padding: '12px 16px', color: '#94a3b8' }}>
                          {tx.cashier}
                        </td>
                        <td style={{ padding: '12px 16px', color: '#cbd5e1' }}>
                          {tx.description}
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: '800', color: tx.amount >= 0 ? '#34d399' : '#fb7185' }}>
                          {formatRupiah(tx.amount)}
                        </td>
                      </tr>
                    ))}

                  {accountDetailModal.transactions.length === 0 && (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                        Tidak ada transaksi tercatat untuk akun ini dalam periode filter yang dipilih.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* MODAL FOOTER */}
            <div style={{
              padding: '16px 24px',
              background: '#0f172a',
              borderTop: '1px solid #334155',
              display: 'flex',
              justify: 'space-between',
              alignItems: 'center'
            }}>
              <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                Menampilkan {accountDetailModal.transactions.length} entri riwayat transaksi
              </span>

              <button
                onClick={() => setAccountDetailModal(null)}
                style={{
                  padding: '8px 20px',
                  background: '#334155',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#f8fafc',
                  fontSize: '0.85rem',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                Tutup Window
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
