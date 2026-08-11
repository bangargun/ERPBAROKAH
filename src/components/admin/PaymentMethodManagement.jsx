import React, { useState, useMemo } from 'react';
import { CreditCard, Plus, Search, Edit3, Trash2, X, CheckCircle2, Wallet, QrCode, Banknote, Landmark, HelpCircle, ArrowUpDown } from 'lucide-react';
import PaginationControls from './PaginationControls';
import { getThemePalette } from '../../utils/themeUtils';

export default function PaymentMethodManagement({ masterData, setMasterData, themeMode = 'dark' }) {
  const T = getThemePalette(themeMode);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingPayment, setEditingPayment] = useState(null);

  // Sorting States
  const [sortField, setSortField] = useState('name');
  const [sortDirection, setSortDirection] = useState('asc');

  // Pagination States (Default 25 rows per page)
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Form states
  const [codeCategory, setCodeCategory] = useState('Cash');
  const [name, setName] = useState('');
  const [status, setStatus] = useState('Aktif');

  const paymentCodeOptions = [
    { value: 'Cash', label: 'Cash (Kas Tunai)', icon: Banknote },
    { value: 'Transfer', label: 'Transfer (Transfer Bank)', icon: Landmark },
    { value: 'QRIS', label: 'QRIS (Barcode Instant)', icon: QrCode },
    { value: 'E-Wallet', label: 'E-Wallet (Dompet Digital)', icon: Wallet },
    { value: 'Pendapatan Lain-lain', label: 'Pendapatan Lain-lain (Voucher / Lainnya)', icon: HelpCircle }
  ];

  const getCodeBadgeStyle = (code) => {
    switch (code) {
      case 'Cash':
        return { bg: T.successBg, color: T.success, icon: Banknote };
      case 'Transfer':
        return { bg: T.infoBg, color: T.info, icon: Landmark };
      case 'QRIS':
        return { bg: T.accentGoldBg, color: T.accentGold, icon: QrCode };
      case 'E-Wallet':
        return { bg: T.warningBg, color: T.warning, icon: Wallet };
      default:
        return { bg: T.tableHeaderBg, color: T.txtSecondary, icon: HelpCircle };
    }
  };

  const handleOpenAddModal = () => {
    setEditingPayment(null);
    setCodeCategory('Cash');
    setName('');
    setStatus('Aktif');
    setShowAddModal(true);
  };

  const handleOpenEditModal = (item) => {
    setEditingPayment(item);
    setCodeCategory(item.code || 'Cash');
    setName(item.name || '');
    setStatus(item.status || 'Aktif');
    setShowAddModal(true);
  };

  const handleSavePayment = (e) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('Mohon isi Nama Metode Pembayaran');
      return;
    }

    const updated = { ...masterData };
    if (!updated.paymentMethods) updated.paymentMethods = [];

    if (editingPayment) {
      updated.paymentMethods = updated.paymentMethods.map(p => {
        if (p.id === editingPayment.id) {
          return {
            ...p,
            code: codeCategory,
            name: name.trim(),
            status
          };
        }
        return p;
      });
    } else {
      const newPayment = {
        id: Date.now(),
        code: codeCategory,
        name: name.trim(),
        status,
        created_at: new Date().toISOString()
      };
      updated.paymentMethods.unshift(newPayment);
    }

    setMasterData(updated);
    setShowAddModal(false);
    setEditingPayment(null);
  };

  const handleDeletePayment = (id, itemName) => {
    if (window.confirm(`Apakah Anda yakin ingin menghapus metode pembayaran "${itemName}"?`)) {
      const updated = { ...masterData };
      updated.paymentMethods = updated.paymentMethods.filter(p => p.id !== id);
      setMasterData(updated);
    }
  };

  const paymentsList = masterData.paymentMethods || [];
  const filtered = useMemo(() => {
    return paymentsList.filter(p => 
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.code && p.code.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [paymentsList, searchTerm]);

  // Sorted Payments
  const sortedPayments = useMemo(() => {
    const list = [...filtered];
    list.sort((a, b) => {
      let valA = '';
      let valB = '';

      switch (sortField) {
        case 'code':
          valA = String(a.code || '');
          valB = String(b.code || '');
          break;
        case 'name':
          valA = String(a.name || '');
          valB = String(b.name || '');
          break;
        case 'status':
          valA = String(a.status || '');
          valB = String(b.status || '');
          break;
        default:
          valA = String(a.name || '');
          valB = String(b.name || '');
      }

      const comp = valA.localeCompare(valB, undefined, { numeric: true, sensitivity: 'base' });
      return sortDirection === 'asc' ? comp : -comp;
    });
    return list;
  }, [filtered, sortField, sortDirection]);

  // Pagination calculation
  const totalItems = sortedPayments.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const paginatedPayments = sortedPayments.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleHeaderSort = (field) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const renderSortHeader = (field, label, align = 'left') => {
    const isActive = sortField === field;
    const icon = isActive ? (sortDirection === 'asc' ? ' ▲' : ' ▼') : ' ↕';
    return (
      <th
        onClick={() => handleHeaderSort(field)}
        style={{
          padding: '10px 10px',
          textAlign: align,
          cursor: 'pointer',
          userSelect: 'none',
          color: isActive ? T.info : T.txtSecondary,
          fontWeight: isActive ? '900' : '800'
        }}
        title={`Klik untuk mengurutkan berdasarkan ${label}`}
      >
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', justifyContent: align === 'center' ? 'center' : align === 'right' ? 'flex-end' : 'flex-start' }}>
          <span>{label}</span>
          <span style={{ fontSize: '0.66rem', opacity: isActive ? 1 : 0.4 }}>{icon}</span>
        </div>
      </th>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }} className="animate-fade-in">
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '0.96rem', fontWeight: '900', color: T.txtPrimary, letterSpacing: '-0.01em', margin: 0 }}>
            Data Metode Pembayaran
          </h2>
          <p style={{ color: T.txtSecondary, fontSize: '0.72rem', marginTop: '2px', margin: 0 }}>
            Kelola pilihan saluran pembayaran kasir (Cash, Transfer, QRIS, E-Wallet, dan Pendapatan Lain-lain)
          </p>
        </div>

        <button onClick={handleOpenAddModal} className="btn-primary" style={{ padding: '6px 12px', fontSize: '0.72rem' }}>
          <Plus size={15} />
          <span>Tambahkan Metode Pembayaran</span>
        </button>
      </div>

      {/* Search & Quick Sort Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ position: 'relative', width: '100%', maxWidth: '360px' }}>
          <Search size={15} color={T.txtMuted} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            placeholder="Cari berdasarkan nama atau kode metode pembayaran..."
            value={searchTerm}
            onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            className="form-input"
            style={{ paddingLeft: '34px', background: T.inputBg, color: T.txtPrimary, borderColor: T.border, fontSize: '0.76rem', height: '34px' }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <ArrowUpDown size={14} color={T.accentGold} />
          <select
            value={sortField}
            onChange={e => setSortField(e.target.value)}
            style={{ padding: '5px 10px', background: T.cardBg2, border: `1px solid ${T.border}`, borderRadius: '6px', color: T.txtPrimary, fontSize: '0.74rem', fontWeight: '700' }}
          >
            <option value="code">💳 Jenis Pembayaran</option>
            <option value="name">🏷️ Nama Metode</option>
            <option value="status">🟢 Status</option>
          </select>
          <button
            type="button"
            onClick={() => setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')}
            style={{ padding: '5px 10px', background: T.cardBg2, border: `1px solid ${T.border}`, borderRadius: '6px', color: T.txtPrimary, fontSize: '0.74rem', fontWeight: '700', cursor: 'pointer' }}
          >
            {sortDirection === 'asc' ? '🔼 Naik' : '🔽 Turun'}
          </button>
        </div>
      </div>

      {/* Table Section */}
      <div className="glass-card" style={{ padding: '16px', background: T.cardBg, border: `1px solid ${T.border}` }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.76rem' }}>
            <thead>
              <tr style={{ background: T.tableHeaderBg, borderBottom: '1px solid rgba(255, 255, 255, 0.05)', color: T.txtSecondary, fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: '800' }}>
                {renderSortHeader('code', 'Kode (Jenis Pembayaran)', 'left')}
                {renderSortHeader('name', 'Nama Metode Pembayaran', 'left')}
                {renderSortHeader('status', 'Status', 'left')}
                <th style={{ padding: '10px 10px', textAlign: 'right' }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {paginatedPayments.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ padding: '36px', textAlign: 'center', color: T.txtMuted, fontSize: '0.76rem' }}>
                    Belum ada data metode pembayaran.
                  </td>
                </tr>
              ) : (
                paginatedPayments.map(item => {
                  const badgeStyle = getCodeBadgeStyle(item.code);
                  const isAktif = (item.status || 'Aktif') === 'Aktif';
                  const cleanItemName = (item.name || '').replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, '').trim();

                  return (
                    <tr key={item.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)', color: T.txtPrimary }}>
                      {/* 1. KODE (JENIS PEMBAYARAN) */}
                      <td style={{ padding: '8px 10px' }}>
                        <span style={{
                          background: badgeStyle.bg,
                          color: badgeStyle.color,
                          border: `1px solid ${badgeStyle.border}`,
                          padding: '3px 8px',
                          borderRadius: '6px',
                          fontWeight: '800',
                          fontSize: '0.68rem',
                          fontFamily: 'monospace'
                        }}>
                          {item.code || 'Cash'}
                        </span>
                      </td>

                      {/* 2. NAMA METODE PEMBAYARAN */}
                      <td style={{ padding: '8px 10px', fontWeight: '800', fontSize: '0.76rem', color: T.txtPrimary }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <CreditCard size={14} color={T.info} />
                          <span>{cleanItemName}</span>
                        </div>
                      </td>

                      {/* 3. STATUS */}
                      <td style={{ padding: '8px 10px' }}>
                        <span style={{
                          background: isAktif ? T.successBg : T.dangerBg,
                          color: isAktif ? T.success : T.danger,
                          border: `1px solid ${isAktif ? T.successBorder : T.dangerBorder}`,
                          padding: '2px 8px',
                          borderRadius: '20px',
                          fontSize: '0.68rem',
                          fontWeight: '800'
                        }}>
                          ● {isAktif ? 'Aktif' : 'Inaktif'}
                        </span>
                      </td>

                      {/* 4. AKSI */}
                      <td style={{ padding: '14px 12px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                          <button
                            onClick={() => handleOpenEditModal(item)}
                            style={{
                              background: T.cardBg2,
                              color: T.txtPrimary,
                              border: `1px solid ${T.border}`,
                              padding: '5px 10px',
                              borderRadius: '6px',
                              fontSize: '0.75rem',
                              fontWeight: '600',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                          >
                            <Edit3 size={14} color={T.info} />
                            <span>Edit</span>
                          </button>

                          <button
                            onClick={() => handleDeletePayment(item.id, item.name)}
                            style={{
                              background: T.dangerBg,
                              color: T.danger,
                              border: `1px solid ${T.dangerBorder}`,
                              padding: '5px 10px',
                              borderRadius: '6px',
                              fontSize: '0.75rem',
                              fontWeight: '600',
                              cursor: 'pointer'
                            }}
                          >
                            <Trash2 size={14} />
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
        <PaginationControls
          currentPage={currentPage}
          totalPages={totalPages}
          pageSize={pageSize}
          totalItems={totalItems}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
          themeMode={themeMode}
        />
      </div>

      {/* MODAL TAMBAH / EDIT METODE PEMBAYARAN */}
      {showAddModal && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.75)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100
        }}>
          <div className="glass-card animate-fade-in" style={{ width: '100%', maxWidth: '460px', padding: '26px', background: T.cardBg, border: `1px solid ${T.borderStrong}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: '800', color: T.txtPrimary }}>
                {editingPayment ? 'Edit Metode Pembayaran' : 'Tambahkan Metode Pembayaran'}
              </h3>
              <button onClick={() => setShowAddModal(false)} style={{ background: 'none', border: 'none', color: T.txtSecondary, cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSavePayment} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Field 1: Kode Jenis Pembayaran */}
              <div>
                <label style={{ fontSize: '0.78rem', color: T.txtSecondary, display: 'block', marginBottom: '6px', fontWeight: '600' }}>
                  1. Kode (Jenis Pembayaran) *
                </label>
                <select
                  value={codeCategory}
                  onChange={e => setCodeCategory(e.target.value)}
                  className="form-select"
                  style={{ background: T.inputBg, color: T.txtPrimary, borderColor: T.border }}
                >
                  {paymentCodeOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Field 2: Nama Metode Pembayaran */}
              <div>
                <label style={{ fontSize: '0.78rem', color: T.txtSecondary, display: 'block', marginBottom: '6px', fontWeight: '600' }}>
                  2. Nama Metode Pembayaran *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: QRIS BCA, Transfer Mandiri, Tunai Kasir"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="form-input"
                  autoFocus
                  style={{ background: T.inputBg, color: T.txtPrimary, borderColor: T.border }}
                />
              </div>

              {/* Field 3: Status */}
              <div>
                <label style={{ fontSize: '0.78rem', color: T.txtSecondary, display: 'block', marginBottom: '6px', fontWeight: '600' }}>
                  3. Status Pembayaran
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => setStatus('Aktif')}
                    style={{
                      padding: '10px',
                      borderRadius: '8px',
                      border: '1px solid',
                      borderColor: status === 'Aktif' ? T.success : T.border,
                      background: status === 'Aktif' ? T.successBg : T.inputBg,
                      color: status === 'Aktif' ? T.success : T.txtMuted,
                      fontWeight: '700',
                      fontSize: '0.8rem',
                      cursor: 'pointer'
                    }}
                  >
                    ● Aktif
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatus('Inaktif')}
                    style={{
                      padding: '10px',
                      borderRadius: '8px',
                      border: '1px solid',
                      borderColor: status === 'Inaktif' ? T.danger : T.border,
                      background: status === 'Inaktif' ? T.dangerBg : T.inputBg,
                      color: status === 'Inaktif' ? T.danger : T.txtMuted,
                      fontWeight: '700',
                      fontSize: '0.8rem',
                      cursor: 'pointer'
                    }}
                  >
                    ● Inaktif
                  </button>
                </div>
              </div>

              {/* Submit Buttons */}
              <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                <button type="button" onClick={() => setShowAddModal(false)} className="btn-secondary" style={{ flex: 1, justifyContent: 'center' }}>
                  Batal
                </button>
                <button type="submit" className="btn-primary" style={{ flex: 1, justifyContent: 'center' }}>
                  Simpan Metode
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
