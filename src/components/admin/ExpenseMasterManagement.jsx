import React, { useState } from 'react';
import { BookOpen, Plus, Search, Edit3, Trash2, X, CheckCircle2, Tag, Layers, FolderPlus, Info, HelpCircle, ArrowRight, ShieldCheck, FileText, Scale, ArrowLeftRight } from 'lucide-react';
import PaginationControls from './PaginationControls';

export default function ExpenseMasterManagement({ masterData, setMasterData }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGroupFilter, setSelectedGroupFilter] = useState('ALL');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState(null);

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

  // Default Standard Chart of Accounts (Daftar Akun Akuntansi Restoran)
  const defaultAccounts = [
    // [1000] AKTIVA / ASSETS
    { id: 1, code: '1101', name: 'Kas Laci Kasir & Rekening Bank Operasional', categoryGroup: 'Aktiva Lancar (Kas & Bank)', targetReport: 'Laporan Neraca & Arus Kas', normalBalance: 'Debet', status: 'Aktif', notes: 'Kas fisik laci kasir dan saldo bank operasional cabang' },
    { id: 2, code: '1201', name: 'Piutang Usaha Penjualan Pelanggan', categoryGroup: 'Aktiva Lancar (Piutang Usaha)', targetReport: 'Laporan Neraca', normalBalance: 'Debet', status: 'Aktif', notes: 'Piutang pesanan katering dan bon pelanggan' },
    { id: 3, code: '1301', name: 'Persediaan Stok Bahan Baku & Consumables Dapur', categoryGroup: 'Aktiva Lancar (Persediaan)', targetReport: 'Laporan Neraca', normalBalance: 'Debet', status: 'Aktif', notes: 'Nilai total fisik persediaan bahan mentah dapur' },
    { id: 4, code: '1431', name: 'Dana Cadangan Gaji Karyawan', categoryGroup: 'Aktiva Lancar Lainnya', targetReport: 'Laporan Neraca', normalBalance: 'Debet', status: 'Aktif', notes: 'Alokasi akumulasi dana cadangan gaji bulanan' },
    { id: 5, code: '1432', name: 'Dana Cadangan Sewa Gedung', categoryGroup: 'Aktiva Lancar Lainnya', targetReport: 'Laporan Neraca', normalBalance: 'Debet', status: 'Aktif', notes: 'Alokasi dana cadangan sewa lokasi bangunan' },
    { id: 6, code: '1433', name: 'Dana Cadangan Tunjangan HariRaya (THR)', categoryGroup: 'Aktiva Lancar Lainnya', targetReport: 'Laporan Neraca', normalBalance: 'Debet', status: 'Aktif', notes: 'Dana cadangan THR tahunan karyawan' },

    // [2000] PASIVA / LIABILITIES
    { id: 7, code: '2101', name: 'Hutang Operasional Kasir & Supplier', categoryGroup: 'Kewajiban / Hutang Lancar', targetReport: 'Laporan Neraca', normalBalance: 'Kredit', status: 'Aktif', notes: 'Hutang pembelian bahan ke supplier & minus laci' },

    // [3000] EKUITAS / EQUITY
    { id: 8, code: '3101', name: 'Modal Disetor Owner / Investor', categoryGroup: 'Ekuitas / Modal Owner', targetReport: 'Laporan Neraca', normalBalance: 'Kredit', status: 'Aktif', notes: 'Setoran modal investasi awal pendirian usaha' },
    { id: 9, code: '3201', name: 'Net Income (Laba Bersih Operasional)', categoryGroup: 'Ekuitas / Laba Ditahan', targetReport: 'Laporan Neraca', normalBalance: 'Kredit', status: 'Aktif', notes: 'Akumulasi laba bersih yang ditahan dalam operasional' },

    // [4000] PENDAPATAN / REVENUE
    { id: 10, code: '4001', name: 'Pendapatan Usaha (Gross Sales)', categoryGroup: 'Pendapatan Utama Restoran', targetReport: 'Laporan Laba Rugi & Arus Kas', normalBalance: 'Kredit', status: 'Aktif', notes: 'Total penerimaan omzet kotor penjualan makanan & minuman' },
    { id: 11, code: '4001.01', name: 'Penjualan Kas Tunai (Cash POS)', categoryGroup: 'Pendapatan Rincian - Cash', targetReport: 'Laporan Laba Rugi', normalBalance: 'Kredit', status: 'Aktif', notes: 'Omzet tunai diterima di laci kasir POS' },
    { id: 12, code: '4001.02', name: 'Penjualan Barcode QRIS & E-Wallet', categoryGroup: 'Pendapatan Rincian - Digital', targetReport: 'Laporan Laba Rugi', normalBalance: 'Kredit', status: 'Aktif', notes: 'Omzet via scan QRIS GoPay, OVO, ShopeePay, Dana' },
    { id: 13, code: '4001.03', name: 'Penjualan Kartu Debit/Kredit (EDC)', categoryGroup: 'Pendapatan Rincian - EDC', targetReport: 'Laporan Laba Rugi', normalBalance: 'Kredit', status: 'Aktif', notes: 'Omzet via mesin EDC gesek kartu bank' },
    { id: 14, code: '4001.04', name: 'Penjualan Transfer Bank Direct', categoryGroup: 'Pendapatan Rincian - Transfer', targetReport: 'Laporan Laba Rugi', normalBalance: 'Kredit', status: 'Aktif', notes: 'Omzet via transfer langsung ke rekening bank usaha' },
    { id: 15, code: '4002', name: 'Diskon Penjualan (Potongan Promo & Member)', categoryGroup: 'Pengurang Pendapatan', targetReport: 'Laporan Laba Rugi', normalBalance: 'Debet', status: 'Aktif', notes: 'Total potongan diskon voucher, promo & member' },

    // [5000] HARGA POKOK PRODUKSI / COGS
    { id: 16, code: '5002', name: 'Harga Pokok Produksi / Penjualan (HPP)', categoryGroup: 'COGS / HPP Dapur', targetReport: 'Laporan Laba Rugi & Arus Kas', normalBalance: 'Debet', status: 'Aktif', notes: 'Total biaya pemakaian bahan baku masakan dapur' },
    { id: 17, code: '5002.01', name: 'HPP Bahan Baku Utama (Daging, Ayam & Seafood)', categoryGroup: 'HPP Rincian - Bahan Utama', targetReport: 'Laporan Laba Rugi', normalBalance: 'Debet', status: 'Aktif', notes: 'HPP bahan utama daging sapi, ayam, dan seafood' },
    { id: 18, code: '5002.02', name: 'HPP Sayuran, Bumbu & Bahan Dapur', categoryGroup: 'HPP Rincian - Bumbu & Sayur', targetReport: 'Laporan Laba Rugi', normalBalance: 'Debet', status: 'Aktif', notes: 'HPP bahan pelengkap bumbu dapur, beras & sayur' },
    { id: 19, code: '5002.03', name: 'HPP Minuman & Packaged Goods', categoryGroup: 'HPP Rincian - Minuman & Kemasan', targetReport: 'Laporan Laba Rugi', normalBalance: 'Debet', status: 'Aktif', notes: 'HPP sirup, bubuk minuman, es kristal, dan cup/kemasan' },
    { id: 20, code: '5005', name: 'Biaya Pengiriman & Expedisi Bahan Baku', categoryGroup: 'Biaya Distribusi HPP', targetReport: 'Laporan Laba Rugi', normalBalance: 'Debet', status: 'Aktif', notes: 'Ongkos kirim pengadaan bahan mentah dari pasar/supplier' },

    // [6000] BEBAN OPERASIONAL / OPEX
    { id: 21, code: '6901', name: 'Beban Operasional Harian Kasir', categoryGroup: 'Beban Operasional (OPEX)', targetReport: 'Laporan Laba Rugi & Arus Kas', normalBalance: 'Debet', status: 'Aktif', notes: 'Pengeluaran rutin harian yang diinput kasir saat closing' },
    { id: 22, code: '6902', name: 'Beban Gaji & Upah Karyawan', categoryGroup: 'Beban Personalia / Gaji', targetReport: 'Laporan Laba Rugi', normalBalance: 'Debet', status: 'Aktif', notes: 'Gaji pokok, bonus, dan insentif lembur karyawan' },
    { id: 23, code: '6903', name: 'Beban Utilitas (Listrik PLN, Air PDAM & Gas LPG)', categoryGroup: 'Beban Utilitas', targetReport: 'Laporan Laba Rugi', normalBalance: 'Debet', status: 'Aktif', notes: 'Tagihan energi bulanan (PLN, PDAM, Internet, Gas LPG)' },
    { id: 24, code: '6904', name: 'Beban Sewa Gedung & Bangunan Cabang', categoryGroup: 'Beban Operasional (OPEX)', targetReport: 'Laporan Laba Rugi', normalBalance: 'Debet', status: 'Aktif', notes: 'Amortisasi beban sewa tempat usaha restoran' },
    { id: 25, code: '6905', name: 'Beban Pemasaran, Iklan & Promosi (Marketing)', categoryGroup: 'Beban Pemasaran', targetReport: 'Laporan Laba Rugi', normalBalance: 'Debet', status: 'Aktif', notes: 'Biaya iklan media sosial, cetak spanduk & brosur' },
    { id: 26, code: '6906', name: 'Beban Pemeliharaan & Perbaikan Peralatan', categoryGroup: 'Beban Perawatan & Service', targetReport: 'Laporan Laba Rugi', normalBalance: 'Debet', status: 'Aktif', notes: 'Service AC, kulkas freezer, mesin espresso, dan kompor' },
    { id: 27, code: '6907', name: 'Beban Kebersihan, Keamanan & Perlengkapan', categoryGroup: 'Beban Perlengkapan', targetReport: 'Laporan Laba Rugi', normalBalance: 'Debet', status: 'Aktif', notes: 'Perlengkapan sabun cuci piring, kantong sampah, iuran lingkungan' },

    // [7000-8000] NON-OPERASIONAL
    { id: 28, code: '7001', name: 'Pendapatan Sewa Space / Bunga Bank', categoryGroup: 'Pendapatan Lain-Lain', targetReport: 'Laporan Laba Rugi & Arus Kas', normalBalance: 'Kredit', status: 'Aktif', notes: 'Penerimaan sewa booth vendor / bunga simpanan bank' },
    { id: 29, code: '8001', name: 'Beban Admin Bank & Pajak Non-Operasional', categoryGroup: 'Beban Lain-Lain', targetReport: 'Laporan Laba Rugi', normalBalance: 'Debet', status: 'Aktif', notes: 'Biaya administrasi bulanan bank & denda/pajak non-rutin' }
  ];

  const accountsList = masterData.chartOfAccounts || masterData.expenseMaster || defaultAccounts;

  // Helper to categorize account code into Class Badge Style
  const getAccountClassInfo = (account) => {
    const codeStr = String(account.code || '');
    const groupStr = (account.categoryGroup || '').toLowerCase();

    if (codeStr.startsWith('1')) {
      return {
        classLabel: 'AKTIVA / ASSET',
        badgeColor: '#38bdf8',
        bg: 'rgba(56, 189, 248, 0.15)',
        border: 'rgba(56, 189, 248, 0.3)',
        targetDefault: 'Laporan Neraca'
      };
    } else if (codeStr.startsWith('2')) {
      return {
        classLabel: 'PASIVA / LIABILITY',
        badgeColor: '#fb7185',
        bg: 'rgba(251, 113, 133, 0.15)',
        border: 'rgba(251, 113, 133, 0.3)',
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
        badgeColor: '#34d399',
        bg: 'rgba(52, 211, 153, 0.15)',
        border: 'rgba(52, 211, 153, 0.3)',
        targetDefault: 'Laporan Laba Rugi'
      };
    } else if (codeStr.startsWith('5')) {
      return {
        classLabel: 'HPP / COGS',
        badgeColor: '#f59e0b',
        bg: 'rgba(245, 158, 11, 0.15)',
        border: 'rgba(245, 158, 11, 0.3)',
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
        badgeColor: '#a7f3d0',
        bg: 'rgba(167, 243, 208, 0.15)',
        border: 'rgba(167, 243, 208, 0.3)',
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }} className="animate-fade-in">
      
      {/* SECTION HEADER & TITLE */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: '800', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <BookOpen size={24} color="#38bdf8" />
            <span>Master Data Akuntansi (Chart of Accounts)</span>
          </h2>
          <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginTop: '4px' }}>
            Daftar Kode Akun Akuntansi Restoran dan Pengelompokannya pada Laporan Laba Rugi, Neraca &amp; Arus Kas
          </p>
        </div>

        <button
          onClick={handleOpenAddModal}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 18px',
            background: 'linear-gradient(135deg, #0284c7 0%, #38bdf8 100%)',
            border: 'none',
            borderRadius: '10px',
            color: '#0f172a',
            fontWeight: '800',
            fontSize: '0.85rem',
            cursor: 'pointer',
            boxShadow: '0 4px 14px rgba(56, 189, 248, 0.3)'
          }}
        >
          <Plus size={18} />
          <span>Tambah Kode Akun Baru</span>
        </button>
      </div>

      {/* SUMMARY STATS CARDS BY ACCOUNT CLASS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px' }}>
        
        <div style={{ background: '#1e293b', border: '1px solid rgba(56, 189, 248, 0.3)', padding: '14px 18px', borderRadius: '12px' }}>
          <div style={{ fontSize: '0.75rem', color: '#38bdf8', fontWeight: '700' }}>[1000] AKTIVA / ASSETS</div>
          <div style={{ fontSize: '1.5rem', fontWeight: '900', color: '#f8fafc', marginTop: '4px' }}>
            {count1000} <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: '500' }}>Akun</span>
          </div>
          <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '2px' }}>Kas, Bank, Piutang, Stok</div>
        </div>

        <div style={{ background: '#1e293b', border: '1px solid rgba(251, 113, 133, 0.3)', padding: '14px 18px', borderRadius: '12px' }}>
          <div style={{ fontSize: '0.75rem', color: '#fb7185', fontWeight: '700' }}>[2000] PASIVA / KEWAJIBAN</div>
          <div style={{ fontSize: '1.5rem', fontWeight: '900', color: '#f8fafc', marginTop: '4px' }}>
            {count2000} <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: '500' }}>Akun</span>
          </div>
          <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '2px' }}>Hutang Kasir &amp; Supplier</div>
        </div>

        <div style={{ background: '#1e293b', border: '1px solid rgba(192, 132, 252, 0.3)', padding: '14px 18px', borderRadius: '12px' }}>
          <div style={{ fontSize: '0.75rem', color: '#c084fc', fontWeight: '700' }}>[3000] EKUITAS / MODAL</div>
          <div style={{ fontSize: '1.5rem', fontWeight: '900', color: '#f8fafc', marginTop: '4px' }}>
            {count3000} <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: '500' }}>Akun</span>
          </div>
          <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '2px' }}>Modal Owner &amp; Net Income</div>
        </div>

        <div style={{ background: '#1e293b', border: '1px solid rgba(52, 211, 153, 0.3)', padding: '14px 18px', borderRadius: '12px' }}>
          <div style={{ fontSize: '0.75rem', color: '#34d399', fontWeight: '700' }}>[4000] PENDAPATAN / REVENUE</div>
          <div style={{ fontSize: '1.5rem', fontWeight: '900', color: '#f8fafc', marginTop: '4px' }}>
            {count4000} <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: '500' }}>Akun</span>
          </div>
          <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '2px' }}>Omzet Cash, QRIS, EDC, Disc</div>
        </div>

        <div style={{ background: '#1e293b', border: '1px solid rgba(245, 158, 11, 0.3)', padding: '14px 18px', borderRadius: '12px' }}>
          <div style={{ fontSize: '0.75rem', color: '#f59e0b', fontWeight: '700' }}>[5000] HPP / PRODUKSI</div>
          <div style={{ fontSize: '1.5rem', fontWeight: '900', color: '#f8fafc', marginTop: '4px' }}>
            {count5000} <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: '500' }}>Akun</span>
          </div>
          <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '2px' }}>HPP Bahan Mentah Dapur</div>
        </div>

        <div style={{ background: '#1e293b', border: '1px solid rgba(96, 165, 250, 0.3)', padding: '14px 18px', borderRadius: '12px' }}>
          <div style={{ fontSize: '0.75rem', color: '#60a5fa', fontWeight: '700' }}>[6000] BEBAN OPERASIONAL</div>
          <div style={{ fontSize: '1.5rem', fontWeight: '900', color: '#f8fafc', marginTop: '4px' }}>
            {count6000} <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: '500' }}>Akun</span>
          </div>
          <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '2px' }}>OPEX, Gaji, Utilitas, Sewa</div>
        </div>

      </div>

      {/* FILTER GROUP TABS & SEARCH BAR */}
      <div style={{
        background: '#0f172a',
        padding: '16px 20px',
        borderRadius: '14px',
        border: '1px solid #334155',
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '16px'
      }}>
        
        {/* GROUP TABS */}
        <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '2px' }}>
          {[
            { id: 'ALL', label: `Semua (${accountsList.length})` },
            { id: '1000', label: '[1000] Aktiva' },
            { id: '2000', label: '[2000] Pasiva' },
            { id: '3000', label: '[3000] Ekuitas' },
            { id: '4000', label: '[4000] Pendapatan' },
            { id: '5000', label: '[5000] HPP' },
            { id: '6000', label: '[6000] Beban OPEX' },
            { id: '7000', label: '[7000-8000] Lainnya' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => { setSelectedGroupFilter(tab.id); setCurrentPage(1); }}
              style={{
                padding: '6px 14px',
                borderRadius: '8px',
                border: '1px solid',
                borderColor: selectedGroupFilter === tab.id ? '#38bdf8' : '#334155',
                background: selectedGroupFilter === tab.id ? 'rgba(56, 189, 248, 0.2)' : '#1e293b',
                color: selectedGroupFilter === tab.id ? '#38bdf8' : '#cbd5e1',
                fontSize: '0.78rem',
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
        <div style={{ position: 'relative', width: '280px' }}>
          <Search size={16} color="#64748b" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            placeholder="Cari kode akun / nama akun..."
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            style={{
              width: '100%',
              background: '#1e293b',
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

      {/* CHART OF ACCOUNTS TABLE */}
      <div className="glass-card" style={{ padding: '0', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ background: '#0f172a', borderBottom: '2px solid #334155', color: '#94a3b8', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                <th style={{ padding: '12px 16px', width: '120px' }}>Kode Akun</th>
                <th style={{ padding: '12px 16px' }}>Nama Akun Akuntansi</th>
                <th style={{ padding: '12px 16px', width: '220px' }}>Kelompok Akun</th>
                <th style={{ padding: '12px 16px', width: '200px' }}>Target Laporan</th>
                <th style={{ padding: '12px 16px', width: '110px' }}>Saldo Normal</th>
                <th style={{ padding: '12px 16px', width: '100px' }}>Status</th>
                <th style={{ padding: '12px 16px', textAlign: 'center', width: '100px' }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {paginatedAccounts.map((acc, idx) => {
                const classInfo = getAccountClassInfo(acc);
                return (
                  <tr
                    key={acc.id || idx}
                    style={{
                      borderBottom: '1px solid rgba(255,255,255,0.05)',
                      background: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)',
                      transition: 'background 0.15s'
                    }}
                    className="hover:bg-slate-800/40"
                  >
                    {/* KODE AKUN */}
                    <td style={{ padding: '12px 16px', fontWeight: '800', color: classInfo.badgeColor, whiteSpace: 'nowrap' }}>
                      [{acc.code}]
                    </td>

                    {/* NAMA AKUN & NOTES */}
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ color: '#f8fafc', fontWeight: '700', fontSize: '0.88rem' }}>
                        {acc.name}
                      </div>
                      {acc.notes && (
                        <div style={{ color: '#64748b', fontSize: '0.75rem', marginTop: '2px' }}>
                          {acc.notes}
                        </div>
                      )}
                    </td>

                    {/* KELOMPOK AKUN */}
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{
                        display: 'inline-block',
                        padding: '4px 10px',
                        borderRadius: '6px',
                        fontSize: '0.75rem',
                        fontWeight: '700',
                        color: classInfo.badgeColor,
                        background: classInfo.bg,
                        border: `1px solid ${classInfo.border}`
                      }}>
                        {acc.categoryGroup || classInfo.classLabel}
                      </span>
                    </td>

                    {/* TARGET LAPORAN */}
                    <td style={{ padding: '12px 16px', color: '#cbd5e1', fontSize: '0.8rem', fontWeight: '600' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {acc.targetReport?.includes('Neraca') ? <Scale size={14} color="#38bdf8" /> : <FileText size={14} color="#34d399" />}
                        <span>{acc.targetReport || classInfo.targetDefault}</span>
                      </div>
                    </td>

                    {/* SALDO NORMAL */}
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{
                        padding: '3px 8px',
                        borderRadius: '4px',
                        fontSize: '0.72rem',
                        fontWeight: '800',
                        color: acc.normalBalance === 'Kredit' ? '#c084fc' : '#38bdf8',
                        background: acc.normalBalance === 'Kredit' ? 'rgba(192, 132, 252, 0.15)' : 'rgba(56, 189, 248, 0.15)'
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
                        color: (acc.status || 'Aktif') === 'Aktif' ? '#34d399' : '#94a3b8',
                        background: (acc.status || 'Aktif') === 'Aktif' ? 'rgba(52, 211, 153, 0.15)' : 'rgba(148, 163, 184, 0.15)'
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
                          style={{ background: 'transparent', border: 'none', color: '#38bdf8', cursor: 'pointer', padding: '4px' }}
                        >
                          <Edit3 size={16} />
                        </button>
                        <button
                          onClick={() => handleDeleteAccount(acc.id)}
                          title="Hapus Akun"
                          style={{ background: 'transparent', border: 'none', color: '#fb7185', cursor: 'pointer', padding: '4px' }}
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
                  <td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
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
          background: 'rgba(15, 23, 42, 0.85)',
          backdropFilter: 'blur(6px)',
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
            maxWidth: '540px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
            overflow: 'hidden'
          }} className="animate-scale-up">

            {/* MODAL HEADER */}
            <div style={{
              padding: '18px 24px',
              background: '#0f172a',
              borderBottom: '1px solid #334155',
              display: 'flex',
              justify: 'space-between',
              alignItems: 'center'
            }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: '800', color: '#f8fafc', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <BookOpen size={20} color="#38bdf8" />
                <span>{editingAccount ? 'Edit Kode Akun Akuntansi' : 'Tambah Kode Akun Akuntansi Baru'}</span>
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                style={{ background: '#334155', border: 'none', borderRadius: '50%', width: '30px', height: '30px', color: '#cbd5e1', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <X size={16} />
              </button>
            </div>

            {/* FORM BODY */}
            <form onSubmit={handleSaveAccount} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

              {/* KODE AKUN & SALDO NORMAL */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: '700', display: 'block', marginBottom: '6px' }}>
                    Kode Akun Akuntansi *
                  </label>
                  <input
                    type="text"
                    required
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="misal: 6901, 1101"
                    className="form-input"
                    style={{ width: '100%', background: '#0f172a', border: '1px solid #475569', borderRadius: '8px', padding: '9px 12px', color: '#38bdf8', fontWeight: '800', fontSize: '0.9rem' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: '700', display: 'block', marginBottom: '6px' }}>
                    Saldo Normal *
                  </label>
                  <select
                    value={normalBalance}
                    onChange={(e) => setNormalBalance(e.target.value)}
                    className="form-input"
                    style={{ width: '100%', background: '#0f172a', border: '1px solid #475569', borderRadius: '8px', padding: '9px 12px', color: '#f8fafc', fontSize: '0.85rem', fontWeight: '600' }}
                  >
                    <option value="Debet">Debet (+ Kas Keluar / Aset)</option>
                    <option value="Kredit">Kredit (+ Kas Masuk / Modal)</option>
                  </select>
                </div>
              </div>

              {/* NAMA AKUN */}
              <div>
                <label style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: '700', display: 'block', marginBottom: '6px' }}>
                  Nama Akun Akuntansi *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="misal: Beban Operasional Kasir Harian"
                  className="form-input"
                  style={{ width: '100%', background: '#0f172a', border: '1px solid #475569', borderRadius: '8px', padding: '9px 12px', color: '#f8fafc', fontSize: '0.85rem' }}
                />
              </div>

              {/* KELOMPOK AKUN & TARGET LAPORAN */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: '700', display: 'block', marginBottom: '6px' }}>
                    Kelompok Akun *
                  </label>
                  <select
                    value={categoryGroup}
                    onChange={(e) => setCategoryGroup(e.target.value)}
                    className="form-input"
                    style={{ width: '100%', background: '#0f172a', border: '1px solid #475569', borderRadius: '8px', padding: '9px 12px', color: '#f8fafc', fontSize: '0.85rem' }}
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
                  <label style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: '700', display: 'block', marginBottom: '6px' }}>
                    Target Laporan Keuangan *
                  </label>
                  <select
                    value={targetReport}
                    onChange={(e) => setTargetReport(e.target.value)}
                    className="form-input"
                    style={{ width: '100%', background: '#0f172a', border: '1px solid #475569', borderRadius: '8px', padding: '9px 12px', color: '#f8fafc', fontSize: '0.85rem' }}
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
                  <label style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: '700', display: 'block', marginBottom: '6px' }}>
                    Status Akun
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="form-input"
                    style={{ width: '100%', background: '#0f172a', border: '1px solid #475569', borderRadius: '8px', padding: '9px 12px', color: '#f8fafc', fontSize: '0.85rem' }}
                  >
                    <option value="Aktif">Aktif</option>
                    <option value="Non-Aktif">Non-Aktif</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: '700', display: 'block', marginBottom: '6px' }}>
                    Keterangan Rincian / Catatan Akun
                  </label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Catatan tambahan fungsi akun..."
                    className="form-input"
                    style={{ width: '100%', background: '#0f172a', border: '1px solid #475569', borderRadius: '8px', padding: '9px 12px', color: '#f8fafc', fontSize: '0.85rem' }}
                  />
                </div>
              </div>

              {/* MODAL FOOTER */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  style={{ padding: '9px 18px', background: '#334155', border: 'none', borderRadius: '8px', color: '#cbd5e1', fontSize: '0.85rem', fontWeight: '700', cursor: 'pointer' }}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  style={{ padding: '9px 22px', background: 'linear-gradient(135deg, #0284c7 0%, #38bdf8 100%)', border: 'none', borderRadius: '8px', color: '#0f172a', fontSize: '0.85rem', fontWeight: '800', cursor: 'pointer' }}
                >
                  Simpan Akun Akuntansi
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
