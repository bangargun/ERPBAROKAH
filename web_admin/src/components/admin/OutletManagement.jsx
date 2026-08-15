import React, { useState } from 'react';
import { Store, Plus, Search, Edit3, Trash2, X, CheckCircle2, MapPin, Target, Users } from 'lucide-react';
import OutletAnalyticsDetailModal from './OutletAnalyticsDetailModal';
import PaginationControls from './PaginationControls';
import { getThemePalette } from '../../utils/themeUtils';
import { canDeleteModule, canEditModule } from '../../utils/permissionUtils';

export default function OutletManagement({ masterData, setMasterData, userSession, themeMode = 'dark' }) {
  const T = getThemePalette(themeMode);
  const allowDelete = canDeleteModule(userSession, 'masterData', masterData?.permissionMatrix);
  const allowEdit = canEditModule(userSession, 'masterData', masterData?.permissionMatrix);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingOutlet, setEditingOutlet] = useState(null);
  const [selectedOutletDetail, setSelectedOutletDetail] = useState(null);

  // Pagination States (Default 25 rows per page)
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Form states
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [targetOmzet, setTargetOmzet] = useState('50000000');
  const [employeeCount, setEmployeeCount] = useState('10');
  const [status, setStatus] = useState('Aktif');

  const formatRupiah = (val) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val || 0);
  };

  // Helper to generate next sequential Outlet Code (OTL-001, OTL-002)
  const generateNextOutletCode = () => {
    const existingCodes = (masterData.outlets || [])
      .map(o => o.code)
      .filter(code => code && code.startsWith('OTL-'));

    if (existingCodes.length === 0) return 'OTL-001';

    const numbers = existingCodes.map(code => {
      const numPart = code.replace('OTL-', '');
      return parseInt(numPart, 10) || 0;
    });

    const maxNum = Math.max(...numbers, 0);
    const nextNum = maxNum + 1;
    return `OTL-${nextNum.toString().padStart(3, '0')}`;
  };

  // Open Add Modal
  const handleOpenAddModal = () => {
    setEditingOutlet(null);
    setCode(generateNextOutletCode());
    setName('');
    setAddress('');
    setTargetOmzet('50000000');
    setEmployeeCount('10');
    setStatus('Aktif');
    setShowAddModal(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (outlet) => {
    setEditingOutlet(outlet);
    setCode(outlet.code || `OTL-00${outlet.id}`);
    setName(outlet.name);
    setAddress(outlet.address || '');
    setTargetOmzet(outlet.target_omzet !== undefined ? outlet.target_omzet : (outlet.target || '50000000'));
    setEmployeeCount(outlet.employee_count !== undefined ? outlet.employee_count : (outlet.employees || '10'));
    setStatus(outlet.status || 'Aktif');
    setShowAddModal(true);
  };

  // Submit Form
  const handleSubmitForm = (e) => {
    e.preventDefault();
    if (!code.trim() || !name.trim() || !address.trim()) {
      alert('Mohon isi Kode Outlet, Nama Outlet, dan Alamat lengkap');
      return;
    }

    const updated = {
      ...masterData,
      _lastUpdated: Date.now()
    };
    if (!updated.outlets) updated.outlets = [];

    const finalCode = code.trim().toUpperCase();

    if (editingOutlet) {
      const idx = updated.outlets.findIndex(o => o.id === editingOutlet.id);
      if (idx !== -1) {
        updated.outlets[idx] = {
          ...editingOutlet,
          code: finalCode,
          name: name.trim(),
          address: address.trim(),
          target_omzet: Number(targetOmzet) || 0,
          employee_count: Number(employeeCount) || 0,
          status: status
        };
      }
    } else {
      const newOutlet = {
        id: Date.now(),
        code: finalCode,
        name: name.trim(),
        address: address.trim(),
        target_omzet: Number(targetOmzet) || 0,
        employee_count: Number(employeeCount) || 0,
        status: status
      };
      updated.outlets.unshift(newOutlet);
    }

    setMasterData(updated);
    setShowAddModal(false);
    setEditingOutlet(null);
  };

  // Delete Outlet
  const handleDeleteOutlet = (id, outletName) => {
    if (window.confirm(`Apakah Anda yakin ingin menghapus outlet "${outletName}"?`)) {
      const updated = {
        ...masterData,
        _lastUpdated: Date.now()
      };
      updated.outlets = updated.outlets.filter(o => o.id !== id);
      setMasterData(updated);
    }
  };

  const outletsList = masterData.outlets || [];
  const filtered = outletsList.filter(o => 
    o.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (o.address && o.address.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (o.code && o.code.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Pagination calculation
  const totalItems = filtered.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const paginatedOutlets = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }} className="animate-fade-in">
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '0.96rem', fontWeight: '900', color: T.txtPrimary, letterSpacing: '-0.01em', margin: 0 }}>
            Data Outlet Restoran
          </h2>
          <p style={{ color: T.txtSecondary, fontSize: '0.72rem', marginTop: '2px', margin: 0 }}>
            Kelola data cabang restoran, alamat lokasi operasional, dan status keaktifan outlet multi-cabang
          </p>
        </div>

        {allowEdit && (
          <button onClick={handleOpenAddModal} className="btn-primary" style={{ padding: '6px 12px', fontSize: '0.72rem' }}>
            <Plus size={15} />
            <span>Tambahkan Outlet</span>
          </button>
        )}
      </div>

      {/* Search Bar */}
      <div style={{ position: 'relative', maxWidth: '360px' }}>
        <Search size={15} color={T.txtSecondary} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
        <input
          type="text"
          placeholder="Cari berdasarkan nama, alamat, atau kode outlet..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="form-input"
          style={{ paddingLeft: '34px', background: T.inputBg, color: T.txtPrimary, borderColor: T.border, fontSize: '0.76rem', height: '34px' }}
        />
      </div>

      {/* Table Section */}
      <div className="glass-card" style={{ padding: '16px', background: T.cardBg, borderColor: T.border }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.76rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)', color: T.txtSecondary, fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.04em', background: T.tableHeaderBg, fontWeight: '800' }}>
                <th style={{ padding: '10px 10px' }}>Kode Outlet</th>
                <th style={{ padding: '10px 10px' }}>Nama Outlet</th>
                <th style={{ padding: '10px 10px' }}>Alamat Lokasi</th>
                <th style={{ padding: '10px 10px', textAlign: 'right' }}>Target Outlet (Omzet)</th>
                <th style={{ padding: '10px 10px', textAlign: 'center' }}>Jumlah Karyawan</th>
                <th style={{ padding: '10px 10px' }}>Status</th>
                <th style={{ padding: '10px 10px', textAlign: 'right' }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {paginatedOutlets.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '36px', textAlign: 'center', color: T.txtMuted, fontSize: '0.76rem' }}>
                    Belum ada data outlet yang dikonfigurasi.
                  </td>
                </tr>
              ) : (
                paginatedOutlets.map(outlet => {
                  const isAktif = (outlet.status || 'Aktif') === 'Aktif';
                  const targetVal = outlet.target_omzet !== undefined ? outlet.target_omzet : (outlet.target || 50000000);
                  const empVal = outlet.employee_count !== undefined ? outlet.employee_count : (outlet.employees || 10);
                  const cleanOutletName = (outlet.name || '').replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, '').trim();

                  return (
                    <tr key={outlet.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)', color: T.txtPrimary }}>
                      {/* 1. KODE OUTLET */}
                      <td style={{ padding: '8px 10px' }}>
                        <span style={{
                          background: T.infoBg,
                          color: T.info,
                          border: `1px solid ${T.infoBorder}`,
                          padding: '3px 8px',
                          borderRadius: '6px',
                          fontWeight: '800',
                          fontSize: '0.68rem',
                          fontFamily: 'monospace'
                        }}>
                          {outlet.code || `OTL-00${outlet.id}`}
                        </span>
                      </td>

                      {/* 2. NAMA OUTLET */}
                      <td style={{ padding: '8px 10px', fontWeight: '800', fontSize: '0.76rem' }}>
                        <button
                          type="button"
                          onClick={() => setSelectedOutletDetail(outlet)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: T.info,
                            fontWeight: '800',
                            cursor: 'pointer',
                            padding: 0,
                            textAlign: 'left',
                            fontSize: '0.76rem',
                            textDecoration: 'underline',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                          title="Klik untuk melihat papan informasi detail kuantitas terjual, total omzet & history penjualan outlet ini"
                        >
                          <Store size={14} color={T.info} />
                          <span>{cleanOutletName}</span>
                        </button>
                      </td>

                      {/* 3. ALAMAT LOKASI */}
                      <td style={{ padding: '14px 12px', color: T.txtSecondary }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <MapPin size={14} color={T.txtMuted} />
                          <span>{outlet.address}</span>
                        </div>
                      </td>

                      {/* 4. TARGET OUTLET */}
                      <td style={{ padding: '14px 12px', textAlign: 'right', fontWeight: '900', color: T.success }}>
                        {formatRupiah(targetVal)}
                      </td>

                      {/* 5. JUMLAH KARYAWAN */}
                      <td style={{ padding: '14px 12px', textAlign: 'center' }}>
                        <span style={{
                          background: T.accentGoldBg,
                          color: T.accentGold,
                          border: `1px solid ${T.accentGoldBorder}`,
                          padding: '4px 10px',
                          borderRadius: '8px',
                          fontWeight: '800',
                          fontSize: '0.78rem',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px'
                        }}>
                          <Users size={13} />
                          <span>{empVal} Orang</span>
                        </span>
                      </td>

                      {/* 6. STATUS */}
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

                      {/* 5. AKSI */}
                      <td style={{ padding: '14px 12px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                          {allowEdit && (
                            <button
                              onClick={() => handleOpenEditModal(outlet)}
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
                          )}

                          {allowDelete && (
                            <button
                              onClick={() => handleDeleteOutlet(outlet.id, outlet.name)}
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
                          )}
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
        />
      </div>

      {/* MODAL TAMBAH / EDIT OUTLET */}
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
          <div className="glass-card animate-fade-in" style={{ width: '100%', maxWidth: '480px', padding: '26px', background: T.cardBg, borderColor: T.border }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: '800', color: T.txtPrimary }}>
                {editingOutlet ? 'Edit Data Outlet Restoran' : 'Tambahkan Outlet Restoran Baru'}
              </h3>
              <button onClick={() => setShowAddModal(false)} style={{ background: 'none', border: 'none', color: T.txtSecondary, cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmitForm} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Field 1: Kode Outlet (Manual Input) */}
              <div>
                <label style={{ fontSize: '0.78rem', color: T.txtSecondary, display: 'block', marginBottom: '6px', fontWeight: '600' }}>
                  1. Kode Outlet *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: OTL-001, BDG-01, PIK-88"
                  value={code}
                  onChange={e => setCode(e.target.value)}
                  className="form-input"
                  style={{ fontFamily: 'monospace', fontWeight: '800', color: T.info, background: T.inputBg, borderColor: T.border }}
                  autoFocus
                />
              </div>

              {/* Field 2: Nama Outlet */}
              <div>
                <label style={{ fontSize: '0.78rem', color: T.txtSecondary, display: 'block', marginBottom: '6px', fontWeight: '600' }}>
                  2. Nama Outlet *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: MRIS Resto Branch PIK"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="form-input"
                  style={{ background: T.inputBg, color: T.txtPrimary, borderColor: T.border }}
                  autoFocus
                />
              </div>

              {/* Field 3: Alamat */}
              <div>
                <label style={{ fontSize: '0.78rem', color: T.txtSecondary, display: 'block', marginBottom: '6px', fontWeight: '600' }}>
                  3. Alamat Lokasi Outlet *
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="Contoh: Jl. Pantai Indah Kapuk No. 88, Jakarta Utara"
                  value={address}
                  onChange={e => setAddress(e.target.value)}
                  className="form-input"
                  style={{ resize: 'vertical', background: T.inputBg, color: T.txtPrimary, borderColor: T.border }}
                />
              </div>

              {/* Field 4: Target Omzet Outlet (Rp) */}
              <div>
                <label style={{ fontSize: '0.78rem', color: T.txtSecondary, display: 'block', marginBottom: '6px', fontWeight: '600' }}>
                  4. Target Omzet Outlet (Rp) *
                </label>
                <input
                  type="number"
                  required
                  placeholder="Contoh: 50000000"
                  value={targetOmzet}
                  onChange={e => setTargetOmzet(e.target.value)}
                  className="form-input"
                  style={{ fontWeight: '800', color: T.success, background: T.inputBg, borderColor: T.border }}
                />
              </div>

              {/* Field 5: Jumlah Karyawan */}
              <div>
                <label style={{ fontSize: '0.78rem', color: T.txtSecondary, display: 'block', marginBottom: '6px', fontWeight: '600' }}>
                  5. Jumlah Karyawan (Orang) *
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  placeholder="Contoh: 12"
                  value={employeeCount}
                  onChange={e => setEmployeeCount(e.target.value)}
                  className="form-input"
                  style={{ fontWeight: '800', color: T.accentGold, background: T.inputBg, borderColor: T.border }}
                />
              </div>

              {/* Field 6: Status */}
              <div>
                <label style={{ fontSize: '0.78rem', color: T.txtSecondary, display: 'block', marginBottom: '6px', fontWeight: '600' }}>
                  6. Status Operasional Outlet
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
                      color: status === 'Aktif' ? T.success : T.txtSecondary,
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
                      color: status === 'Inaktif' ? T.danger : T.txtSecondary,
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
                  Simpan Outlet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PAPAN INFORMASI DETAIL OUTLET ANALYTICS MODAL */}
      {selectedOutletDetail && (
        <OutletAnalyticsDetailModal
          outlet={selectedOutletDetail}
          masterData={masterData}
          themeMode={themeMode}
          onClose={() => setSelectedOutletDetail(null)}
        />
      )}
    </div>
  );
}

