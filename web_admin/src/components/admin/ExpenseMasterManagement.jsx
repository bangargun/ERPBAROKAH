import React, { useState } from 'react';
import { BookOpen, Plus, Search, Edit3, Trash2, X, CheckCircle2, Tag, Layers, FolderPlus, Info, HelpCircle, ArrowRight, ShieldCheck, FileText, Scale, ArrowLeftRight, Download, Upload, FileSpreadsheet, FileUp, RefreshCw, AlertCircle } from 'lucide-react';
import * as XLSX from 'xlsx';
import PaginationControls from './PaginationControls';
import { getThemePalette } from '../../utils/themeUtils';

export default function ExpenseMasterManagement({ masterData, setMasterData, themeMode = 'dark' }) {
  const T = getThemePalette(themeMode);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGroupFilter, setSelectedGroupFilter] = useState('ALL');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState(null);

  // Excel Upload State
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadStep, setUploadStep] = useState('select'); // 'select' | 'preview'
  const [parsedAccounts, setParsedAccounts] = useState([]);
  const [importMode, setImportMode] = useState('append'); // 'append' | 'overwrite'
  const [uploadError, setUploadError] = useState('');
  const [fileName, setFileName] = useState('');
  const [isDragging, setIsDragging] = useState(false);

  // Pagination States (Default 25 rows per page)
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Form states for Add / Edit
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [categoryGroup, setCategoryGroup] = useState('Beban Operasional (OPEX)');
  const [targetReport, setTargetReport] = useState('Laporan Laba Rugi');
  const [normalBalance, setNormalBalance] = useState('Debet');
  const [status, setStatus] = useState('Aktif');
  const [notes, setNotes] = useState('');

  const accountsList = masterData.chartOfAccounts || masterData.expenseMaster || [];

  // Template Excel Download Handler
  const handleDownloadTemplate = () => {
    const sampleData = [
      {
        'Kode Akun': '1001',
        'Nama Akun Akuntansi': 'Kas Utama Kasir Outlet',
        'Kelompok Akun': 'Aktiva / Asset',
        'Target Laporan': 'Laporan Neraca',
        'Saldo Normal': 'Debet',
        'Status': 'Aktif',
        'Catatan': 'Kas kecil di laci kasir outlet'
      },
      {
        'Kode Akun': '1002',
        'Nama Akun Akuntansi': 'Bank BCA Operasional Restoran',
        'Kelompok Akun': 'Aktiva / Asset',
        'Target Laporan': 'Laporan Neraca',
        'Saldo Normal': 'Debet',
        'Status': 'Aktif',
        'Catatan': 'Rekening penampungan transaksi EDC & QRIS'
      },
      {
        'Kode Akun': '1101',
        'Nama Akun Akuntansi': 'Piutang Penjualan Katering',
        'Kelompok Akun': 'Aktiva / Asset',
        'Target Laporan': 'Laporan Neraca',
        'Saldo Normal': 'Debet',
        'Status': 'Aktif',
        'Catatan': 'Piutang jatuh tempo pesanan katering'
      },
      {
        'Kode Akun': '1201',
        'Nama Akun Akuntansi': 'Stok Persediaan Bahan Baku Daging & Ayam',
        'Kelompok Akun': 'Aktiva / Asset',
        'Target Laporan': 'Laporan Neraca',
        'Saldo Normal': 'Debet',
        'Status': 'Aktif',
        'Catatan': 'Persediaan bahan mentah dapur utama'
      },
      {
        'Kode Akun': '2001',
        'Nama Akun Akuntansi': 'Hutang Pemasok Bahan Food & Beverage',
        'Kelompok Akun': 'Pasiva / Liability',
        'Target Laporan': 'Laporan Neraca',
        'Saldo Normal': 'Kredit',
        'Status': 'Aktif',
        'Catatan': 'Hutang dagang pembelian bahan baku'
      },
      {
        'Kode Akun': '2101',
        'Nama Akun Akuntansi': 'Hutang Pajak Restoran (PB1 10%)',
        'Kelompok Akun': 'Pasiva / Liability',
        'Target Laporan': 'Laporan Neraca',
        'Saldo Normal': 'Kredit',
        'Status': 'Aktif',
        'Catatan': 'Kewajiban pajak daerah bulanan'
      },
      {
        'Kode Akun': '3001',
        'Nama Akun Akuntansi': 'Modal Disetor Pemilik Restoran',
        'Kelompok Akun': 'Ekuitas / Equity',
        'Target Laporan': 'Laporan Neraca',
        'Saldo Normal': 'Kredit',
        'Status': 'Aktif',
        'Catatan': 'Modal awal pendirian outlet'
      },
      {
        'Kode Akun': '4001',
        'Nama Akun Akuntansi': 'Pendapatan Usaha Penjualan Makanan & Minuman',
        'Kelompok Akun': 'Pendapatan / Revenue',
        'Target Laporan': 'Laporan Laba Rugi',
        'Saldo Normal': 'Kredit',
        'Status': 'Aktif',
        'Catatan': 'Penjualan Omset Bruto Kasir'
      },
      {
        'Kode Akun': '4002',
        'Nama Akun Akuntansi': 'Diskon & Promo Penjualan',
        'Kelompok Akun': 'Pendapatan / Revenue',
        'Target Laporan': 'Laporan Laba Rugi',
        'Saldo Normal': 'Debet',
        'Status': 'Aktif',
        'Catatan': 'Potongan harga promo atau member'
      },
      {
        'Kode Akun': '5001',
        'Nama Akun Akuntansi': 'HPP Bahan Baku Makanan & Bumbu',
        'Kelompok Akun': 'HPP / COGS',
        'Target Laporan': 'Laporan Laba Rugi',
        'Saldo Normal': 'Debet',
        'Status': 'Aktif',
        'Catatan': 'Biaya konsumsi bahan baku'
      },
      {
        'Kode Akun': '5002',
        'Nama Akun Akuntansi': 'HPP Kemasan & Food Packaging',
        'Kelompok Akun': 'HPP / COGS',
        'Target Laporan': 'Laporan Laba Rugi',
        'Saldo Normal': 'Debet',
        'Status': 'Aktif',
        'Catatan': 'Takeaway boxes, kantong plastik, cup'
      },
      {
        'Kode Akun': '6001',
        'Nama Akun Akuntansi': 'Beban Gaji & Tunjangan Karyawan',
        'Kelompok Akun': 'Beban Operasional (OPEX)',
        'Target Laporan': 'Laporan Laba Rugi',
        'Saldo Normal': 'Debet',
        'Status': 'Aktif',
        'Catatan': 'Gaji staf dapur, kasir & waiter'
      },
      {
        'Kode Akun': '6002',
        'Nama Akun Akuntansi': 'Beban Listrik, Air PLN & LPG',
        'Kelompok Akun': 'Beban Operasional (OPEX)',
        'Target Laporan': 'Laporan Laba Rugi',
        'Saldo Normal': 'Debet',
        'Status': 'Aktif',
        'Catatan': 'Tagihan utilitas bulanan'
      },
      {
        'Kode Akun': '6003',
        'Nama Akun Akuntansi': 'Beban Sewa Gedung Restoran',
        'Kelompok Akun': 'Beban Operasional (OPEX)',
        'Target Laporan': 'Laporan Laba Rugi',
        'Saldo Normal': 'Debet',
        'Status': 'Aktif',
        'Catatan': 'Sewa tempat ruko / outlet'
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(sampleData);
    worksheet['!cols'] = [
      { wch: 14 }, // Kode Akun
      { wch: 44 }, // Nama Akun
      { wch: 28 }, // Kelompok Akun
      { wch: 20 }, // Target Laporan
      { wch: 15 }, // Saldo Normal
      { wch: 12 }, // Status
      { wch: 45 }  // Catatan
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Master Data COA');
    XLSX.writeFile(workbook, 'Template_Chart_of_Accounts_MRIS.xlsx');
  };

  // Excel / CSV File Process Handler
  const processUploadedFile = (file) => {
    if (!file) return;
    setFileName(file.name);
    setUploadError('');

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const rawJson = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

        if (!rawJson || rawJson.length === 0) {
          setUploadError('File Excel/CSV kosong atau format tidak terbaca.');
          return;
        }

        // Map and validate rows
        const parsed = rawJson.map((row, idx) => {
          const codeVal = String(
            row['Kode Akun'] || row['Kode'] || row['code'] || row['Kode_Akun'] || row['Account Code'] || ''
          ).trim();

          const nameVal = String(
            row['Nama Akun Akuntansi'] || row['Nama Akun'] || row['Nama'] || row['name'] || row['Account Name'] || ''
          ).trim();

          const groupVal = String(
            row['Kelompok Akun'] || row['Category Group'] || row['Kelompok'] || row['categoryGroup'] || 'Beban Operasional (OPEX)'
          ).trim();

          const reportVal = String(
            row['Target Laporan'] || row['Target Report'] || row['Laporan'] || row['targetReport'] || 'Laporan Laba Rugi'
          ).trim();

          const balanceVal = String(
            row['Saldo Normal'] || row['Normal Balance'] || row['normalBalance'] || 'Debet'
          ).trim();

          const statusVal = String(
            row['Status'] || row['status'] || 'Aktif'
          ).trim();

          const notesVal = String(
            row['Catatan'] || row['Keterangan'] || row['Notes'] || row['notes'] || ''
          ).trim();

          const existingAcc = accountsList.find(a => String(a.code).trim() === codeVal);

          let isValid = true;
          let validationMsg = 'Valid';

          if (!codeVal) {
            isValid = false;
            validationMsg = 'Kode akun kosong';
          } else if (!nameVal) {
            isValid = false;
            validationMsg = 'Nama akun kosong';
          } else if (existingAcc) {
            validationMsg = 'Update (Kode Ada)';
          }

          return {
            tempId: idx + 1,
            code: codeVal,
            name: nameVal,
            categoryGroup: groupVal,
            targetReport: reportVal,
            normalBalance: balanceVal,
            status: statusVal,
            notes: notesVal,
            isValid,
            validationMsg,
            isDuplicate: !!existingAcc
          };
        });

        setParsedAccounts(parsed);
        setUploadStep('preview');
      } catch (err) {
        console.error("Error reading Excel:", err);
        setUploadError('Gagal membaca file Excel/CSV: ' + err.message);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // Import Execution Handler
  const handleExecuteImport = () => {
    const validItems = parsedAccounts.filter(p => p.isValid);
    if (validItems.length === 0) {
      alert('Tidak ada data valid yang dapat di-import.');
      return;
    }

    let newList = [];
    if (importMode === 'overwrite') {
      newList = validItems.map((item, idx) => ({
        id: Date.now() + idx,
        code: item.code,
        name: item.name,
        categoryGroup: item.categoryGroup,
        targetReport: item.targetReport,
        normalBalance: item.normalBalance,
        status: item.status,
        notes: item.notes
      }));
    } else {
      const mapExisting = new Map(accountsList.map(a => [String(a.code).trim(), a]));
      
      validItems.forEach((item, idx) => {
        const codeKey = String(item.code).trim();
        if (mapExisting.has(codeKey)) {
          const existing = mapExisting.get(codeKey);
          mapExisting.set(codeKey, {
            ...existing,
            name: item.name,
            categoryGroup: item.categoryGroup,
            targetReport: item.targetReport,
            normalBalance: item.normalBalance,
            status: item.status,
            notes: item.notes
          });
        } else {
          mapExisting.set(codeKey, {
            id: Date.now() + idx,
            code: item.code,
            name: item.name,
            categoryGroup: item.categoryGroup,
            targetReport: item.targetReport,
            normalBalance: item.normalBalance,
            status: item.status,
            notes: item.notes
          });
        }
      });

      newList = Array.from(mapExisting.values());
    }

    setMasterData({
      ...masterData,
      chartOfAccounts: newList,
      expenseMaster: newList
    });

    setShowUploadModal(false);
    setUploadStep('select');
    setParsedAccounts([]);
    alert(`Berhasil meng-import ${validItems.length} akun akuntansi ke Master Data!`);
  };

  // Helper to categorize account code into Class Badge Style
  const getAccountClassInfo = (account) => {
    const codeStr = String(account.code || '');
    const groupStr = (account.categoryGroup || '').toLowerCase();

    if (codeStr.startsWith('1')) {
      return {
        classLabel: 'AKTIVA / ASSET',
        badgeColor: T.info,
        bg: T.infoBg,
        border: T.infoBorder,
        targetDefault: 'Laporan Neraca'
      };
    } else if (codeStr.startsWith('2')) {
      return {
        classLabel: 'PASIVA / LIABILITY',
        badgeColor: T.danger,
        bg: T.dangerBg,
        border: T.dangerBorder,
        targetDefault: 'Laporan Neraca'
      };
    } else if (codeStr.startsWith('3')) {
      return {
        classLabel: 'EKUITAS / EQUITY',
        badgeColor: '#c084fc',
        bg: 'rgba(192, 132, 252, 0.15)',
        border: 'rgba(192, 132, 252, 0.3)',
        targetDefault: 'Laporan Neraca'
      };
    } else if (codeStr.startsWith('4')) {
      return {
        classLabel: 'PENDAPATAN / REVENUE',
        badgeColor: T.success,
        bg: T.successBg,
        border: T.successBorder,
        targetDefault: 'Laporan Laba Rugi'
      };
    } else if (codeStr.startsWith('5')) {
      return {
        classLabel: 'HPP / COGS',
        badgeColor: T.accentGold,
        bg: T.accentGoldBg,
        border: T.accentGoldBorder,
        targetDefault: 'Laporan Laba Rugi'
      };
    } else if (codeStr.startsWith('6')) {
      return {
        classLabel: 'BEBAN OPERASIONAL (OPEX)',
        badgeColor: '#60a5fa',
        bg: 'rgba(96, 165, 250, 0.15)',
        border: 'rgba(96, 165, 250, 0.3)',
        targetDefault: 'Laporan Laba Rugi'
      };
    } else {
      return {
        classLabel: 'NON-OPERASIONAL',
        badgeColor: T.success,
        bg: T.successBg,
        border: T.successBorder,
        targetDefault: 'Laporan Laba Rugi'
      };
    }
  };

  // Generate next account code helper
  const generateNextAccountCode = () => {
    return `69${String(accountsList.length + 1).padStart(2, '0')}`;
  };

  // Open Add Modal
  const handleOpenAddModal = () => {
    setEditingAccount(null);
    setCode(generateNextAccountCode());
    setName('');
    setCategoryGroup('Beban Operasional (OPEX)');
    setTargetReport('Laporan Laba Rugi');
    setNormalBalance('Debet');
    setStatus('Aktif');
    setNotes('');
    setShowAddModal(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (acc) => {
    setEditingAccount(acc);
    setCode(acc.code || '');
    setName(acc.name || '');
    setCategoryGroup(acc.categoryGroup || 'Beban Operasional (OPEX)');
    setTargetReport(acc.targetReport || 'Laporan Laba Rugi');
    setNormalBalance(acc.normalBalance || 'Debet');
    setStatus(acc.status || 'Aktif');
    setNotes(acc.notes || '');
    setShowAddModal(true);
  };

  // Save Account Handler
  const handleSaveAccount = (e) => {
    e.preventDefault();
    if (!name.trim() || !code.trim()) return;

    let updatedList = [...accountsList];

    if (editingAccount) {
      updatedList = updatedList.map(a => 
        a.id === editingAccount.id 
          ? { ...a, code, name, categoryGroup, targetReport, normalBalance, status, notes }
          : a
      );
    } else {
      const newAcc = {
        id: Date.now(),
        code,
        name,
        categoryGroup,
        targetReport,
        normalBalance,
        status,
        notes
      };
      updatedList.unshift(newAcc);
    }

    setMasterData({
      ...masterData,
      chartOfAccounts: updatedList,
      expenseMaster: updatedList
    });

    setShowAddModal(false);
  };

  // Delete Account Handler
  const handleDeleteAccount = (id) => {
    if (window.confirm('Apakah Anda yakin ingin menghapus akun akuntansi ini dari Data Master?')) {
      const updatedList = accountsList.filter(a => a.id !== id);
      setMasterData({
        ...masterData,
        chartOfAccounts: updatedList,
        expenseMaster: updatedList
      });
    }
  };

  // Filtering Logic
  const filteredAccounts = accountsList.filter(acc => {
    const matchesSearch = 
      (acc.code || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (acc.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (acc.categoryGroup || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (acc.targetReport || '').toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;

    const codeStr = String(acc.code || '');
    if (selectedGroupFilter === '1000') return codeStr.startsWith('1');
    if (selectedGroupFilter === '2000') return codeStr.startsWith('2');
    if (selectedGroupFilter === '3000') return codeStr.startsWith('3');
    if (selectedGroupFilter === '4000') return codeStr.startsWith('4');
    if (selectedGroupFilter === '5000') return codeStr.startsWith('5');
    if (selectedGroupFilter === '6000') return codeStr.startsWith('6');
    if (selectedGroupFilter === '7000') return codeStr.startsWith('7') || codeStr.startsWith('8');

    return true;
  });

  // Calculate Paginated Data
  const totalPages = Math.ceil(filteredAccounts.length / pageSize) || 1;
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedAccounts = filteredAccounts.slice(startIndex, startIndex + pageSize);

  // Group Count Summary
  const count1000 = accountsList.filter(a => String(a.code).startsWith('1')).length;
  const count2000 = accountsList.filter(a => String(a.code).startsWith('2')).length;
  const count3000 = accountsList.filter(a => String(a.code).startsWith('3')).length;
  const count4000 = accountsList.filter(a => String(a.code).startsWith('4')).length;
  const count5000 = accountsList.filter(a => String(a.code).startsWith('5')).length;
  const count6000 = accountsList.filter(a => String(a.code).startsWith('6')).length;
  const count7000 = accountsList.filter(a => String(a.code).startsWith('7') || String(a.code).startsWith('8')).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }} className="animate-fade-in">
      
      {/* SECTION HEADER & TITLE */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '0.96rem', fontWeight: '900', color: T.txtPrimary, display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
            <BookOpen size={16} color={T.info} />
            <span>Master Data Akuntansi (Chart of Accounts)</span>
          </h2>
          <p style={{ color: T.txtSecondary, fontSize: '0.72rem', marginTop: '2px', margin: 0 }}>
            Daftar Kode Akun Akuntansi Restoran dan Pengelompokannya pada Laporan Laba Rugi, Neraca &amp; Arus Kas
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <button
            onClick={handleDownloadTemplate}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              background: T.cardBg,
              border: `1px solid ${T.successBorder}`,
              borderRadius: '8px',
              color: T.success,
              fontWeight: '800',
              fontSize: '0.72rem',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
            title="Download file template Excel (.xlsx) siap isi"
          >
            <Download size={14} />
            <span>Download Template Excel</span>
          </button>

          <button
            onClick={() => {
              setUploadStep('select');
              setUploadError('');
              setParsedAccounts([]);
              setShowUploadModal(true);
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              background: T.cardBg,
              border: `1px solid ${T.infoBorder}`,
              borderRadius: '8px',
              color: T.info,
              fontWeight: '800',
              fontSize: '0.72rem',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
            title="Upload data akun dari file Excel (.xlsx) atau CSV"
          >
            <Upload size={14} />
            <span>Upload Excel / CSV</span>
          </button>

          <button
            onClick={handleOpenAddModal}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              background: T.primaryBtn,
              border: 'none',
              borderRadius: '8px',
              color: T.navActiveTxt,
              fontWeight: '800',
              fontSize: '0.72rem',
              cursor: 'pointer',
              boxShadow: T.primaryBtnShadow
            }}
          >
            <Plus size={15} />
            <span>Tambah Kode Akun Baru</span>
          </button>
        </div>
      </div>

      {/* SUMMARY STATS CARDS BY ACCOUNT CLASS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '10px' }}>
        
        <div style={{ background: T.cardBg, border: `1px solid ${T.infoBorder}`, padding: '10px 14px', borderRadius: '10px' }}>
          <div style={{ fontSize: '0.68rem', color: T.info, fontWeight: '700' }}>[1000] AKTIVA / ASSETS</div>
          <div style={{ fontSize: '1.05rem', fontWeight: '900', color: T.txtPrimary, marginTop: '2px' }}>
            {count1000} <span style={{ fontSize: '0.70rem', color: T.txtSecondary, fontWeight: '500' }}>Akun</span>
          </div>
          <div style={{ fontSize: '0.64rem', color: T.txtMuted, marginTop: '1px' }}>Kas, Bank, Piutang, Stok</div>
        </div>

        <div style={{ background: T.cardBg, border: `1px solid ${T.dangerBorder}`, padding: '10px 14px', borderRadius: '10px' }}>
          <div style={{ fontSize: '0.68rem', color: T.danger, fontWeight: '700' }}>[2000] PASIVA / KEWAJIBAN</div>
          <div style={{ fontSize: '1.05rem', fontWeight: '900', color: T.txtPrimary, marginTop: '2px' }}>
            {count2000} <span style={{ fontSize: '0.70rem', color: T.txtSecondary, fontWeight: '500' }}>Akun</span>
          </div>
          <div style={{ fontSize: '0.64rem', color: T.txtMuted, marginTop: '1px' }}>Hutang Dagang, Utang Gaji</div>
        </div>

        <div style={{ background: T.cardBg, border: `1px solid ${T.border}`, padding: '10px 14px', borderRadius: '10px' }}>
          <div style={{ fontSize: '0.68rem', color: T.accentGold, fontWeight: '700' }}>[3000] EKUITAS / MODAL</div>
          <div style={{ fontSize: '1.05rem', fontWeight: '900', color: T.txtPrimary, marginTop: '2px' }}>
            {count3000} <span style={{ fontSize: '0.70rem', color: T.txtSecondary, fontWeight: '500' }}>Akun</span>
          </div>
          <div style={{ fontSize: '0.64rem', color: T.txtMuted, marginTop: '1px' }}>Modal Pemilik, Laba Ditahan</div>
        </div>

        <div style={{ background: T.cardBg, border: `1px solid ${T.successBorder}`, padding: '10px 14px', borderRadius: '10px' }}>
          <div style={{ fontSize: '0.68rem', color: T.success, fontWeight: '700' }}>[4000] PENDAPATAN / OMZET</div>
          <div style={{ fontSize: '1.05rem', fontWeight: '900', color: T.txtPrimary, marginTop: '2px' }}>
            {count4000} <span style={{ fontSize: '0.70rem', color: T.txtSecondary, fontWeight: '500' }}>Akun</span>
          </div>
          <div style={{ fontSize: '0.64rem', color: T.txtMuted, marginTop: '1px' }}>Penjualan POS, Non-POS</div>
        </div>

        <div style={{ background: T.cardBg, border: `1px solid ${T.border}`, padding: '10px 14px', borderRadius: '10px' }}>
          <div style={{ fontSize: '0.68rem', color: T.txtSecondary, fontWeight: '700' }}>[5000] HPP / BEBAN POKOK</div>
          <div style={{ fontSize: '1.05rem', fontWeight: '900', color: T.txtPrimary, marginTop: '2px' }}>
            {count5000} <span style={{ fontSize: '0.70rem', color: T.txtSecondary, fontWeight: '500' }}>Akun</span>
          </div>
          <div style={{ fontSize: '0.64rem', color: T.txtMuted, marginTop: '1px' }}>Bahan Baku Dapur, Kebocoran</div>
        </div>

        <div style={{ background: T.cardBg, border: `1px solid ${T.border}`, padding: '10px 14px', borderRadius: '10px' }}>
          <div style={{ fontSize: '0.68rem', color: T.txtSecondary, fontWeight: '700' }}>[6000] OPEX / OPERASIONAL</div>
          <div style={{ fontSize: '1.05rem', fontWeight: '900', color: T.txtPrimary, marginTop: '2px' }}>
            {count6000} <span style={{ fontSize: '0.70rem', color: T.txtSecondary, fontWeight: '500' }}>Akun</span>
          </div>
          <div style={{ fontSize: '0.64rem', color: T.txtMuted, marginTop: '1px' }}>Gaji, Listrik, Sewa, Promosi</div>
        </div>
      </div>

      {/* TABS FILTER & SEARCH BAR */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        
        {/* ACCOUNT CLASS BUTTONS */}
        <div style={{ display: 'flex', gap: '4px', overflowX: 'auto', paddingBottom: '4px' }}>
          {[
            { id: 'ALL', label: 'Semua Akun' },
            { id: '1000', label: '[1000] Aktiva' },
            { id: '2000', label: '[2000] Pasiva' },
            { id: '3000', label: '[3000] Ekuitas' },
            { id: '4000', label: '[4000] Pendapatan' },
            { id: '5000', label: '[5000] HPP' },
            { id: '6000', label: '[6000] OPEX' },
            { id: '7000', label: '[7000-8000] Lainnya' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => { setSelectedGroupFilter(tab.id); setCurrentPage(1); }}
              style={{
                padding: '4px 10px',
                borderRadius: '6px',
                border: '1px solid',
                borderColor: selectedGroupFilter === tab.id ? T.info : T.border,
                background: selectedGroupFilter === tab.id ? T.infoBg : T.cardBg,
                color: selectedGroupFilter === tab.id ? T.info : T.txtSecondary,
                fontSize: '0.70rem',
                fontWeight: '700',
                cursor: 'pointer',
                whiteSpace: 'nowrap'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* SEARCH BAR */}
        <div style={{ position: 'relative', width: '260px' }}>
          <Search size={15} color={T.txtMuted} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            placeholder="Cari kode akun / nama akun..."
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            style={{
              width: '100%',
              background: T.inputBg,
              border: `1px solid ${T.border}`,
              borderRadius: '8px',
              padding: '6px 12px 6px 34px',
              color: T.txtPrimary,
              fontSize: '0.76rem',
              outline: 'none',
              height: '34px'
            }}
          />
        </div>
      </div>

      {/* CHART OF ACCOUNTS TABLE */}
      <div className="glass-card" style={{ padding: '0', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.76rem' }}>
            <thead>
              <tr style={{ background: T.tableHeaderBg, borderBottom: '1px solid rgba(255, 255, 255, 0.05)', color: T.txtSecondary, fontSize: '0.68rem', textTransform: 'uppercase', fontWeight: '800' }}>
                <th style={{ padding: '10px 10px', width: '110px' }}>Kode Akun</th>
                <th style={{ padding: '10px 10px' }}>Nama Akun Akuntansi</th>
                <th style={{ padding: '10px 10px', width: '200px' }}>Kelompok Akun</th>
                <th style={{ padding: '10px 10px', width: '180px' }}>Target Laporan</th>
                <th style={{ padding: '10px 10px', width: '100px' }}>Saldo Normal</th>
                <th style={{ padding: '10px 10px', width: '90px' }}>Status</th>
                <th style={{ padding: '10px 10px', textAlign: 'center', width: '90px' }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {paginatedAccounts.map((acc, idx) => {
                const classInfo = getAccountClassInfo(acc);
                const cleanAccName = (acc.name || '').replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, '').trim();
                return (
                  <tr
                    key={acc.id || idx}
                    style={{
                      borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                      background: idx % 2 === 0 ? 'transparent' : T.tableStripeBg,
                      transition: 'background 0.15s'
                    }}
                  >
                    {/* KODE AKUN */}
                    <td style={{ padding: '8px 10px', fontWeight: '800', color: classInfo.badgeColor, whiteSpace: 'nowrap', fontSize: '0.68rem', fontFamily: 'monospace' }}>
                      [{acc.code}]
                    </td>

                    {/* NAMA AKUN & NOTES */}
                    <td style={{ padding: '8px 10px' }}>
                      <div style={{ color: T.txtPrimary, fontWeight: '800', fontSize: '0.76rem' }}>
                        {cleanAccName}
                      </div>
                      {acc.notes && (
                        <div style={{ color: T.txtMuted, fontSize: '0.66rem', marginTop: '1px' }}>
                          {acc.notes}
                        </div>
                      )}
                    </td>

                    {/* KELOMPOK AKUN */}
                    <td style={{ padding: '8px 10px' }}>
                      <span style={{
                        display: 'inline-block',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        fontSize: '0.68rem',
                        fontWeight: '700',
                        color: classInfo.badgeColor,
                        background: classInfo.bg,
                        border: `1px solid ${classInfo.border}`
                      }}>
                        {acc.categoryGroup || classInfo.classLabel}
                      </span>
                    </td>

                    {/* TARGET LAPORAN */}
                    <td style={{ padding: '8px 10px', color: T.txtSecondary, fontSize: '0.72rem', fontWeight: '600' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        {acc.targetReport?.includes('Neraca') ? <Scale size={12} color={T.info} /> : <FileText size={12} color={T.success} />}
                        <span>{acc.targetReport || classInfo.targetDefault}</span>
                      </div>
                    </td>

                    {/* SALDO NORMAL */}
                    <td style={{ padding: '8px 10px' }}>
                      <span style={{
                        padding: '2px 6px',
                        borderRadius: '4px',
                        fontSize: '0.68rem',
                        fontWeight: '800',
                        color: acc.normalBalance === 'Kredit' ? '#c084fc' : T.info,
                        background: acc.normalBalance === 'Kredit' ? 'rgba(192, 132, 252, 0.15)' : T.infoBg
                      }}>
                        {acc.normalBalance || 'Debet'}
                      </span>
                    </td>

                    {/* STATUS */}
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{
                        padding: '3px 8px',
                        borderRadius: '4px',
                        fontSize: '0.72rem',
                        fontWeight: '700',
                        color: (acc.status || 'Aktif') === 'Aktif' ? T.success : T.txtMuted,
                        background: (acc.status || 'Aktif') === 'Aktif' ? T.successBg : T.hoverBg
                      }}>
                        {acc.status || 'Aktif'}
                      </span>
                    </td>

                    {/* AKSI EDIT / DELETE */}
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
                        <button
                          onClick={() => handleOpenEditModal(acc)}
                          title="Edit Akun"
                          style={{ background: 'transparent', border: 'none', color: T.info, cursor: 'pointer', padding: '4px' }}
                        >
                          <Edit3 size={16} />
                        </button>
                        <button
                          onClick={() => handleDeleteAccount(acc.id)}
                          title="Hapus Akun"
                          style={{ background: 'transparent', border: 'none', color: T.danger, cursor: 'pointer', padding: '4px' }}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {paginatedAccounts.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: T.txtMuted }}>
                    Tidak ada kode akun akuntansi yang sesuai dengan kata kunci pencarian.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINATION CONTROLS */}
        <PaginationControls
          currentPage={currentPage}
          totalPages={totalPages}
          pageSize={pageSize}
          totalItems={filteredAccounts.length}
          onPageChange={setCurrentPage}
          onPageSizeChange={(newSize) => { setPageSize(newSize); setCurrentPage(1); }}
        />
      </div>

      {/* MODAL TAMBAH / EDIT KODE AKUN AKUNTANSI */}
      {showAddModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px'
        }}>
          <div style={{
            background: T.cardBg,
            border: `1px solid ${T.borderStrong}`,
            borderRadius: '16px',
            width: '100%',
            maxWidth: '540px',
            boxShadow: T.shadowLg,
            overflow: 'hidden'
          }} className="animate-scale-up">

            {/* MODAL HEADER */}
            <div style={{
              padding: '18px 24px',
              background: T.cardBg2,
              borderBottom: `1px solid ${T.border}`,
              display: 'flex',
              justify: 'space-between',
              alignItems: 'center'
            }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: '800', color: T.txtPrimary, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <BookOpen size={20} color={T.info} />
                <span>{editingAccount ? 'Edit Kode Akun Akuntansi' : 'Tambah Kode Akun Akuntansi Baru'}</span>
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                style={{ background: T.borderStrong, border: 'none', borderRadius: '50%', width: '30px', height: '30px', color: T.txtSecondary, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <X size={16} />
              </button>
            </div>

            {/* FORM BODY */}
            <form onSubmit={handleSaveAccount} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

              {/* KODE AKUN & SALDO NORMAL */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={{ fontSize: '0.78rem', color: T.txtSecondary, fontWeight: '700', display: 'block', marginBottom: '6px' }}>
                    Kode Akun Akuntansi *
                  </label>
                  <input
                    type="text"
                    required
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="misal: 6901, 1101"
                    className="form-input"
                    style={{ width: '100%', background: T.inputBg, border: `1px solid ${T.border}`, borderRadius: '8px', padding: '9px 12px', color: T.info, fontWeight: '800', fontSize: '0.9rem' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.78rem', color: T.txtSecondary, fontWeight: '700', display: 'block', marginBottom: '6px' }}>
                    Saldo Normal *
                  </label>
                  <select
                    value={normalBalance}
                    onChange={(e) => setNormalBalance(e.target.value)}
                    className="form-input"
                    style={{ width: '100%', background: T.inputBg, border: `1px solid ${T.border}`, borderRadius: '8px', padding: '9px 12px', color: T.txtPrimary, fontSize: '0.85rem', fontWeight: '600' }}
                  >
                    <option value="Debet">Debet (+ Kas Keluar / Aset)</option>
                    <option value="Kredit">Kredit (+ Kas Masuk / Modal)</option>
                  </select>
                </div>
              </div>

              {/* NAMA AKUN */}
              <div>
                <label style={{ fontSize: '0.78rem', color: T.txtSecondary, fontWeight: '700', display: 'block', marginBottom: '6px' }}>
                  Nama Akun Akuntansi *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="misal: Beban Operasional Kasir Harian"
                  className="form-input"
                  style={{ width: '100%', background: T.inputBg, border: `1px solid ${T.border}`, borderRadius: '8px', padding: '9px 12px', color: T.txtPrimary, fontSize: '0.85rem' }}
                />
              </div>

              {/* KELOMPOK AKUN & TARGET LAPORAN */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={{ fontSize: '0.78rem', color: T.txtSecondary, fontWeight: '700', display: 'block', marginBottom: '6px' }}>
                    Kelompok Akun *
                  </label>
                  <select
                    value={categoryGroup}
                    onChange={(e) => setCategoryGroup(e.target.value)}
                    className="form-input"
                    style={{ width: '100%', background: T.inputBg, border: `1px solid ${T.border}`, borderRadius: '8px', padding: '9px 12px', color: T.txtPrimary, fontSize: '0.85rem' }}
                  >
                    <option value="Aktiva Lancar (Kas & Bank)">Aktiva Lancar (Kas &amp; Bank)</option>
                    <option value="Aktiva Lancar (Piutang Usaha)">Aktiva Lancar (Piutang Usaha)</option>
                    <option value="Aktiva Lancar (Persediaan)">Aktiva Lancar (Persediaan)</option>
                    <option value="Aktiva Lancar Lainnya">Aktiva Lancar Lainnya</option>
                    <option value="Kewajiban / Hutang Lancar">Kewajiban / Hutang Lancar</option>
                    <option value="Ekuitas / Modal Owner">Ekuitas / Modal Owner</option>
                    <option value="Ekuitas / Laba Ditahan">Ekuitas / Laba Ditahan</option>
                    <option value="Pendapatan Utama Restoran">Pendapatan Utama Restoran</option>
                    <option value="Pendapatan Rincian">Pendapatan Rincian</option>
                    <option value="Pengurang Pendapatan">Pengurang Pendapatan</option>
                    <option value="COGS / HPP Dapur">COGS / HPP Dapur</option>
                    <option value="HPP Rincian">HPP Rincian</option>
                    <option value="Beban Operasional (OPEX)">Beban Operasional (OPEX)</option>
                    <option value="Beban Personalia / Gaji">Beban Personalia / Gaji</option>
                    <option value="Beban Utilitas">Beban Utilitas</option>
                    <option value="Beban Pemasaran">Beban Pemasaran</option>
                    <option value="Beban Perawatan & Service">Beban Perawatan &amp; Service</option>
                    <option value="Beban Perlengkapan">Beban Perlengkapan</option>
                    <option value="Pendapatan Lain-Lain">Pendapatan Lain-Lain</option>
                    <option value="Beban Lain-Lain">Beban Lain-Lain</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '0.78rem', color: T.txtSecondary, fontWeight: '700', display: 'block', marginBottom: '6px' }}>
                    Target Laporan Keuangan *
                  </label>
                  <select
                    value={targetReport}
                    onChange={(e) => setTargetReport(e.target.value)}
                    className="form-input"
                    style={{ width: '100%', background: T.inputBg, border: `1px solid ${T.border}`, borderRadius: '8px', padding: '9px 12px', color: T.txtPrimary, fontSize: '0.85rem' }}
                  >
                    <option value="Laporan Laba Rugi">Laporan Laba Rugi (P&amp;L)</option>
                    <option value="Laporan Neraca">Laporan Neraca (Balance Sheet)</option>
                    <option value="Laporan Laba Rugi & Arus Kas">Laporan Laba Rugi &amp; Arus Kas</option>
                    <option value="Laporan Neraca & Arus Kas">Laporan Neraca &amp; Arus Kas</option>
                  </select>
                </div>
              </div>

              {/* STATUS & NOTES */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '14px' }}>
                <div>
                  <label style={{ fontSize: '0.78rem', color: T.txtSecondary, fontWeight: '700', display: 'block', marginBottom: '6px' }}>
                    Status Akun
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="form-input"
                    style={{ width: '100%', background: T.inputBg, border: `1px solid ${T.border}`, borderRadius: '8px', padding: '9px 12px', color: T.txtPrimary, fontSize: '0.85rem' }}
                  >
                    <option value="Aktif">Aktif</option>
                    <option value="Non-Aktif">Non-Aktif</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '0.78rem', color: T.txtSecondary, fontWeight: '700', display: 'block', marginBottom: '6px' }}>
                    Keterangan Rincian / Catatan Akun
                  </label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Catatan tambahan fungsi akun..."
                    className="form-input"
                    style={{ width: '100%', background: T.inputBg, border: `1px solid ${T.border}`, borderRadius: '8px', padding: '9px 12px', color: T.txtPrimary, fontSize: '0.85rem' }}
                  />
                </div>
              </div>

              {/* MODAL FOOTER */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  style={{ padding: '9px 18px', background: T.borderStrong, border: 'none', borderRadius: '8px', color: T.txtSecondary, fontSize: '0.85rem', fontWeight: '700', cursor: 'pointer' }}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  style={{ padding: '9px 22px', background: T.primaryBtn, border: 'none', borderRadius: '8px', color: T.navActiveTxt, fontSize: '0.85rem', fontWeight: '800', cursor: 'pointer' }}
                >
                  Simpan Akun Akuntansi
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* MODAL UPLOAD EXCEL / CSV */}
      {showUploadModal && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 9999,
          padding: '16px'
        }}>
          <div style={{
            background: T.cardBg,
            border: `1px solid ${T.infoBorder}`,
            borderRadius: '16px',
            width: '100%',
            maxWidth: uploadStep === 'preview' ? '880px' : '540px',
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: '24px',
            boxShadow: '0 20px 50px rgba(0,0,0,0.6)'
          }} className="animate-scale-up">

            {/* MODAL HEADER */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', borderBottom: `1px solid ${T.border}`, paddingBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <FileSpreadsheet size={22} color={T.info} />
                <div>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: '900', color: T.txtPrimary, margin: 0 }}>
                    Upload Data Master Akuntansi (COA)
                  </h3>
                  <span style={{ fontSize: '0.72rem', color: T.txtSecondary }}>
                    Format file: Excel (.xlsx, .xls) atau CSV (.csv)
                  </span>
                </div>
              </div>
              <button
                onClick={() => setShowUploadModal(false)}
                style={{ background: 'transparent', border: 'none', color: T.txtMuted, cursor: 'pointer', padding: '4px' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* ERROR BANNER */}
            {uploadError && (
              <div style={{ background: T.dangerBg, border: `1px solid ${T.dangerBorder}`, color: T.danger, padding: '10px 14px', borderRadius: '8px', fontSize: '0.78rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertCircle size={16} />
                <span>{uploadError}</span>
              </div>
            )}

            {/* STEP 1: SELECT FILE */}
            {uploadStep === 'select' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

                {/* DROPZONE */}
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
                  onClick={() => document.getElementById('excelFileInput').click()}
                >
                  <FileUp size={44} color={T.info} style={{ marginBottom: '12px' }} />
                  <div style={{ fontSize: '0.90rem', fontWeight: '800', color: T.txtPrimary }}>
                    Pilih atau Drag &amp; Drop File Excel
                  </div>
                  <div style={{ fontSize: '0.74rem', color: T.txtSecondary, marginTop: '4px' }}>
                    Mendukung file format <strong>.xlsx</strong>, <strong>.xls</strong>, dan <strong>.csv</strong>
                  </div>

                  <input
                    id="excelFileInput"
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

                {/* GUIDANCE & TEMPLATE DOWNLOAD LINK */}
                <div style={{ background: T.infoBg, border: `1px solid ${T.infoBorder}`, borderRadius: '10px', padding: '12px 14px' }}>
                  <div style={{ fontSize: '0.78rem', fontWeight: '800', color: T.info, marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Info size={15} />
                    <span>Perlu Contoh Format Template?</span>
                  </div>
                  <p style={{ fontSize: '0.72rem', color: T.txtSecondary, margin: '0 0 10px 0', lineHeight: 1.4 }}>
                    Gunakan template standar agar kolom teridentifikasi secara otomatis:
                    <br />
                    <code>Kode Akun</code>, <code>Nama Akun Akuntansi</code>, <code>Kelompok Akun</code>, <code>Target Laporan</code>, <code>Saldo Normal</code>, <code>Status</code>.
                  </p>
                  <button
                    onClick={handleDownloadTemplate}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '6px 12px',
                      background: T.info,
                      border: 'none',
                      borderRadius: '6px',
                      color: '#ffffff',
                      fontWeight: '800',
                      fontSize: '0.72rem',
                      cursor: 'pointer'
                    }}
                  >
                    <Download size={14} />
                    <span>Download Template Spreadsheet (.xlsx)</span>
                  </button>
                </div>

              </div>
            )}

            {/* STEP 2: PREVIEW & CONFIRMATION */}
            {uploadStep === 'preview' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

                {/* STATS & FILE INFO BAR */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', background: T.cardBg2, padding: '12px 16px', borderRadius: '10px', border: `1px solid ${T.border}` }}>
                  <div>
                    <div style={{ fontSize: '0.84rem', fontWeight: '800', color: T.txtPrimary }}>
                      📄 {fileName}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: T.txtSecondary, marginTop: '2px' }}>
                      Terbaca <strong>{parsedAccounts.length}</strong> baris akun akuntansi dari file
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <span style={{ padding: '4px 8px', borderRadius: '6px', background: T.successBg, color: T.success, fontSize: '0.70rem', fontWeight: '800', border: `1px solid ${T.successBorder}` }}>
                      {parsedAccounts.filter(p => p.isValid && !p.isDuplicate).length} Akun Baru
                    </span>
                    <span style={{ padding: '4px 8px', borderRadius: '6px', background: T.accentGoldBg, color: T.accentGold, fontSize: '0.70rem', fontWeight: '800', border: `1px solid ${T.accentGoldBorder}` }}>
                      {parsedAccounts.filter(p => p.isValid && p.isDuplicate).length} Kode Sudah Ada
                    </span>
                    {parsedAccounts.some(p => !p.isValid) && (
                      <span style={{ padding: '4px 8px', borderRadius: '6px', background: T.dangerBg, color: T.danger, fontSize: '0.70rem', fontWeight: '800', border: `1px solid ${T.dangerBorder}` }}>
                        {parsedAccounts.filter(p => !p.isValid).length} Error / Tidak Valid
                      </span>
                    )}
                  </div>
                </div>

                {/* PREVIEW TABLE */}
                <div style={{ border: `1px solid ${T.border}`, borderRadius: '10px', overflow: 'hidden', maxHeight: '300px', overflowY: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.74rem' }}>
                    <thead>
                      <tr style={{ background: T.tableHeaderBg, borderBottom: `1px solid ${T.border}`, color: T.txtSecondary, fontSize: '0.68rem', textTransform: 'uppercase', fontWeight: '800' }}>
                        <th style={{ padding: '8px 10px', width: '90px' }}>Kode</th>
                        <th style={{ padding: '8px 10px' }}>Nama Akun Akuntansi</th>
                        <th style={{ padding: '8px 10px', width: '170px' }}>Kelompok Akun</th>
                        <th style={{ padding: '8px 10px', width: '140px' }}>Target Laporan</th>
                        <th style={{ padding: '8px 10px', width: '90px' }}>Status Validasi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parsedAccounts.map((item) => (
                        <tr
                          key={item.tempId}
                          style={{
                            borderBottom: `1px solid ${T.border}`,
                            background: !item.isValid ? T.dangerBg : item.isDuplicate ? T.accentGoldBg : 'transparent'
                          }}
                        >
                          <td style={{ padding: '6px 10px', fontWeight: '800', fontFamily: 'monospace', color: T.txtPrimary }}>
                            [{item.code || '—'}]
                          </td>
                          <td style={{ padding: '6px 10px', fontWeight: '700', color: T.txtPrimary }}>
                            {item.name || '—'}
                          </td>
                          <td style={{ padding: '6px 10px', color: T.txtSecondary }}>
                            {item.categoryGroup}
                          </td>
                          <td style={{ padding: '6px 10px', color: T.txtSecondary }}>
                            {item.targetReport}
                          </td>
                          <td style={{ padding: '6px 10px' }}>
                            {!item.isValid ? (
                              <span style={{ color: T.danger, fontWeight: '800', fontSize: '0.68rem' }}>❌ {item.validationMsg}</span>
                            ) : item.isDuplicate ? (
                              <span style={{ color: T.accentGold, fontWeight: '800', fontSize: '0.68rem' }}>⚠️ {item.validationMsg}</span>
                            ) : (
                              <span style={{ color: T.success, fontWeight: '800', fontSize: '0.68rem' }}>✅ Ready</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* STRATEGY TOGGLE */}
                <div style={{ background: T.cardBg2, padding: '14px', borderRadius: '10px', border: `1px solid ${T.border}` }}>
                  <label style={{ fontSize: '0.78rem', color: T.txtPrimary, fontWeight: '800', display: 'block', marginBottom: '8px' }}>
                    ⚙️ Metode Penggabungan Data:
                  </label>
                  <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.78rem', color: T.txtPrimary, fontWeight: '600' }}>
                      <input
                        type="radio"
                        name="importStrategy"
                        value="append"
                        checked={importMode === 'append'}
                        onChange={() => setImportMode('append')}
                      />
                      <span><strong>Gabungkan &amp; Update</strong> (Tambah akun baru &amp; perbarui jika kode sama)</span>
                    </label>

                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.78rem', color: T.danger, fontWeight: '600' }}>
                      <input
                        type="radio"
                        name="importStrategy"
                        value="overwrite"
                        checked={importMode === 'overwrite'}
                        onChange={() => setImportMode('overwrite')}
                      />
                      <span><strong>Ganti Semua Data</strong> (Hapus semua akun lama &amp; ganti dengan file ini)</span>
                    </label>
                  </div>
                </div>

                {/* FOOTER ACTIONS */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setUploadStep('select');
                      setParsedAccounts([]);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '8px 14px',
                      background: T.cardBg,
                      border: `1px solid ${T.border}`,
                      borderRadius: '8px',
                      color: T.txtSecondary,
                      fontSize: '0.78rem',
                      fontWeight: '700',
                      cursor: 'pointer'
                    }}
                  >
                    <RefreshCw size={14} />
                    <span>Pilih File Lain</span>
                  </button>

                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                      type="button"
                      onClick={() => setShowUploadModal(false)}
                      style={{ padding: '8px 16px', background: T.borderStrong, border: 'none', borderRadius: '8px', color: T.txtSecondary, fontSize: '0.78rem', fontWeight: '700', cursor: 'pointer' }}
                    >
                      Batal
                    </button>
                    <button
                      type="button"
                      onClick={handleExecuteImport}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '8px 20px',
                        background: T.primaryBtn,
                        border: 'none',
                        borderRadius: '8px',
                        color: T.navActiveTxt,
                        fontSize: '0.82rem',
                        fontWeight: '800',
                        cursor: 'pointer',
                        boxShadow: T.primaryBtnShadow
                      }}
                    >
                      <CheckCircle2 size={16} />
                      <span>Proses Import ({parsedAccounts.filter(p => p.isValid).length} Akun)</span>
                    </button>
                  </div>
                </div>

              </div>
            )}

          </div>
        </div>
      )}

    </div>
  );
}
