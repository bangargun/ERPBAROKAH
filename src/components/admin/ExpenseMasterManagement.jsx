import React, { useState } from 'react';
import { BookOpen, Plus, Search, Edit3, Trash2, X, CheckCircle2, Tag, Layers, FolderPlus, Info, HelpCircle, ArrowRight, ShieldCheck, FileText, Scale, ArrowLeftRight } from 'lucide-react';
import PaginationControls from './PaginationControls';
import { getThemePalette } from '../../utils/themeUtils';

export default function ExpenseMasterManagement({ masterData, setMasterData, themeMode = 'dark' }) {
  const T = getThemePalette(themeMode);

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

  const accountsList = masterData.chartOfAccounts || masterData.expenseMaster || [];

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

    </div>
  );
}
