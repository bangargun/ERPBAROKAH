import React, { useState } from 'react';
import { CreditCard, Plus, Search, Edit3, Trash2, X, CheckCircle2, Wallet, QrCode, Banknote, Landmark, HelpCircle } from 'lucide-react';
import PaginationControls from './PaginationControls';
import { getThemePalette } from '../../utils/themeUtils';

export default function PaymentMethodManagement({ masterData, setMasterData, themeMode = 'dark' }) {
  const T = getThemePalette(themeMode);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingPayment, setEditingPayment] = useState(null);

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
        return { bg: T.successBg, color: T.success, border: T.successBorder };
      case 'Transfer':
        return { bg: T.accentGreenBg, color: T.accentGreen, border: T.accentGreenBg };
      case 'QRIS':
        return { bg: T.infoBg, color: T.info, border: T.infoBorder };
      case 'E-Wallet':
        return { bg: T.warningBg, color: T.warning, border: T.warningBorder };
      default:
        return { bg: T.accentGoldBg, color: T.accentGold, border: T.accentGoldBorder };
    }
  };

  // Open Add Modal
  const handleOpenAddModal = () => {
    setEditingPayment(null);
    setCodeCategory('Cash');
    setName('');
    setStatus('Aktif');
    setShowAddModal(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (item) => {
    setEditingPayment(item);
    setCodeCategory(item.code || 'Cash');
    setName(item.name);
    setStatus(item.status || 'Aktif');
    setShowAddModal(true);
  };

  // Submit Form
  const handleSubmitForm = (e) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('Mohon isi Nama Metode Pembayaran');
      return;
    }

    const updated = { ...masterData };
    if (!updated.paymentMethods) updated.paymentMethods = [];

    if (editingPayment) {
      const idx = updated.paymentMethods.findIndex(p => p.id === editingPayment.id);
      if (idx !== -1) {
        updated.paymentMethods[idx] = {
          ...editingPayment,
          code: codeCategory,
          name: name.trim(),
          status: status
        };
      }
    } else {
      const newPayment = {
        id: Date.now(),
        code: codeCategory,
        name: name.trim(),
        status: status
      };
      updated.paymentMethods.unshift(newPayment);
    }

    setMasterData(updated);
    setShowAddModal(false);
    setEditingPayment(null);
  };

  // Delete Payment Method
  const handleDeletePayment = async (id, payName) => {
    if (window.confirm(`Apakah Anda yakin ingin menghapus metode pembayaran "${payName}"?`)) {
      const nowTs = Date.now();
      const updated = {
        ...masterData,
        _lastUpdated: nowTs,
        paymentMethods: (masterData.paymentMethods || []).filter(p => String(p.id) !== String(id))
      };
      setMasterData(updated);

      const getApiUrl = (pathStr) => {
        if (typeof window !== 'undefined' && window.location.protocol === 'file:') {
          return `https://mris-api.barokahgroupindonesia.tech${pathStr}`;
        }
        return `https://mris-api.barokahgroupindonesia.tech${pathStr}`;
      };

      try {
        await fetch(getApiUrl('/api/master-data/delete-item'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key: 'paymentMethods', id })
        });
      } catch (err) {}
    }
  };

  const paymentsList = masterData.paymentMethods || [];
  const filtered = paymentsList.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.code && p.code.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Pagination calculation
  const totalItems = filtered.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const paginatedPayments = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }} className="animate-fade-in">
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '800', color: T.txtPrimary, letterSpacing: '-0.02em' }}>
            Data Metode Pembayaran
          </h2>
          <p style={{ color: T.txtSecondary, fontSize: '0.875rem', marginTop: '4px' }}>
            Kelola pilihan saluran pembayaran kasir (Cash, Transfer, QRIS, E-Wallet, dan Pendapatan Lain-lain)
          </p>
        </div>

        <button onClick={handleOpenAddModal} className="btn-primary">
          <Plus size={18} />
          <span>Tambahkan Metode Pembayaran</span>
        </button>
      </div>

      {/* Search Bar */}
      <div style={{ position: 'relative', maxWidth: '380px' }}>
        <Search size={16} color={T.txtMuted} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
        <input
          type="text"
          placeholder="Cari berdasarkan nama atau kode metode pembayaran..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="form-input"
          style={{ paddingLeft: '36px', background: T.inputBg, color: T.txtPrimary, borderColor: T.border }}
        />
      </div>

      {/* Table Section */}
      <div className="glass-card" style={{ padding: '20px', background: T.cardBg, border: `1px solid ${T.border}` }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ background: T.tableHeaderBg, borderBottom: `1px solid ${T.borderStrong}`, color: T.txtSecondary, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                <th style={{ padding: '12px' }}>Kode (Jenis Pembayaran)</th>
                <th style={{ padding: '12px' }}>Nama Metode Pembayaran</th>
                <th style={{ padding: '12px' }}>Status</th>
                <th style={{ padding: '12px', textAlign: 'right' }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {paginatedPayments.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ padding: '40px', textAlign: 'center', color: T.txtMuted }}>
                    Belum ada data metode pembayaran.
                  </td>
                </tr>
              ) : (
                paginatedPayments.map(item => {
                  const badgeStyle = getCodeBadgeStyle(item.code);
                  const isAktif = (item.status || 'Aktif') === 'Aktif';

                  return (
                    <tr key={item.id} style={{ borderBottom: `1px solid ${T.border}`, color: T.txtPrimary }}>
                      {/* 1. KODE (JENIS PEMBAYARAN) */}
                      <td style={{ padding: '14px 12px' }}>
                        <span style={{
                          background: badgeStyle.bg,
                          color: badgeStyle.color,
                          border: `1px solid ${badgeStyle.border}`,
                          padding: '4px 10px',
                          borderRadius: '8px',
                          fontWeight: '800',
                          fontSize: '0.8rem',
                          fontFamily: 'monospace'
                        }}>
                          {item.code || 'Cash'}
                        </span>
                      </td>

                      {/* 2. NAMA METODE PEMBAYARAN */}
                      <td style={{ padding: '14px 12px', fontWeight: '800', fontSize: '0.9rem', color: T.txtPrimary }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <CreditCard size={16} color={T.info} />
                          <span>{item.name}</span>
                        </div>
                      </td>

                      {/* 3. STATUS */}
                      <td style={{ padding: '14px 12px' }}>
                        <span style={{
                          background: isAktif ? T.successBg : T.dangerBg,
                          color: isAktif ? T.success : T.danger,
                          border: `1px solid ${isAktif ? T.successBorder : T.dangerBorder}`,
                          padding: '4px 10px',
                          borderRadius: '20px',
                          fontSize: '0.75rem',
                          fontWeight: '700'
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

            <form onSubmit={handleSubmitForm} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
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
