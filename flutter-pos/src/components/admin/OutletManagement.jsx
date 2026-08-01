import React, { useState } from 'react';
import { Store, Plus, Search, Edit3, Trash2, X, CheckCircle2, MapPin, Target, Users } from 'lucide-react';
import OutletAnalyticsDetailModal from './OutletAnalyticsDetailModal';
import PaginationControls from './PaginationControls';

export default function OutletManagement({ masterData, setMasterData }) {
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

    const updated = { ...masterData };
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
      const updated = { ...masterData };
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }} className="animate-fade-in">
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '800', color: '#f8fafc', letterSpacing: '-0.02em' }}>
            Data Outlet Restoran
          </h2>
          <p style={{ color: '#94a3b8', fontSize: '0.875rem', marginTop: '4px' }}>
            Kelola data cabang restoran, alamat lokasi operasional, dan status keaktifan outlet multi-cabang
          </p>
        </div>

        <button onClick={handleOpenAddModal} className="btn-primary">
          <Plus size={18} />
          <span>Tambahkan Outlet</span>
        </button>
      </div>

      {/* Search Bar */}
      <div style={{ position: 'relative', maxWidth: '380px' }}>
        <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
        <input
          type="text"
          placeholder="Cari berdasarkan nama, alamat, atau kode outlet..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="form-input"
          style={{ paddingLeft: '36px' }}
        />
      </div>

      {/* Table Section */}
      <div className="glass-card" style={{ padding: '20px' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #334155', color: '#94a3b8', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                <th style={{ padding: '12px' }}>Kode Outlet</th>
                <th style={{ padding: '12px' }}>Nama Outlet</th>
                <th style={{ padding: '12px' }}>Alamat Lokasi</th>
                <th style={{ padding: '12px', textAlign: 'right' }}>Target Outlet (Omzet)</th>
                <th style={{ padding: '12px', textAlign: 'center' }}>Jumlah Karyawan</th>
                <th style={{ padding: '12px' }}>Status</th>
                <th style={{ padding: '12px', textAlign: 'right' }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {paginatedOutlets.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
                    Belum ada data outlet yang dikonfigurasi.
                  </td>
                </tr>
              ) : (
                paginatedOutlets.map(outlet => {
                  const isAktif = (outlet.status || 'Aktif') === 'Aktif';
                  const targetVal = outlet.target_omzet !== undefined ? outlet.target_omzet : (outlet.target || 50000000);
                  const empVal = outlet.employee_count !== undefined ? outlet.employee_count : (outlet.employees || 10);

                  return (
                    <tr key={outlet.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', color: '#f8fafc' }}>
                      {/* 1. KODE OUTLET */}
                      <td style={{ padding: '14px 12px' }}>
                        <span style={{
                          background: 'rgba(99, 102, 241, 0.15)',
                          color: '#818cf8',
                          border: '1px solid rgba(99, 102, 241, 0.3)',
                          padding: '4px 10px',
                          borderRadius: '8px',
                          fontWeight: '800',
                          fontSize: '0.8rem',
                          fontFamily: 'monospace'
                        }}>
                          {outlet.code || `OTL-00${outlet.id}`}
                        </span>
                      </td>

                      {/* 2. NAMA OUTLET */}
                      <td style={{ padding: '14px 12px', fontWeight: '800', fontSize: '0.9rem' }}>
                        <button
                          type="button"
                          onClick={() => setSelectedOutletDetail(outlet)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#38bdf8',
                            fontWeight: '900',
                            cursor: 'pointer',
                            padding: 0,
                            textAlign: 'left',
                            fontSize: '0.9rem',
                            textDecoration: 'underline',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px'
                          }}
                          title="Klik untuk melihat papan informasi detail kuantitas terjual, total omzet & history penjualan outlet ini"
                        >
                          <Store size={16} color="#38bdf8" />
                          <span>{outlet.name}</span>
                        </button>
                      </td>

                      {/* 3. ALAMAT LOKASI */}
                      <td style={{ padding: '14px 12px', color: '#cbd5e1' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <MapPin size={14} color="#94a3b8" />
                          <span>{outlet.address}</span>
                        </div>
                      </td>

                      {/* 4. TARGET OUTLET */}
                      <td style={{ padding: '14px 12px', textAlign: 'right', fontWeight: '900', color: '#34d399' }}>
                        {formatRupiah(targetVal)}
                      </td>

                      {/* 5. JUMLAH KARYAWAN */}
                      <td style={{ padding: '14px 12px', textAlign: 'center' }}>
                        <span style={{
                          background: 'rgba(168, 85, 247, 0.15)',
                          color: '#a78bfa',
                          border: '1px solid rgba(168, 85, 247, 0.3)',
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
                          background: isAktif ? 'rgba(16, 185, 129, 0.15)' : 'rgba(244, 63, 94, 0.15)',
                          color: isAktif ? '#34d399' : '#fb7185',
                          border: `1px solid ${isAktif ? 'rgba(16, 185, 129, 0.3)' : 'rgba(244, 63, 94, 0.3)'}`,
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
                          <button
                            onClick={() => handleOpenEditModal(outlet)}
                            style={{
                              background: '#334155',
                              color: '#cbd5e1',
                              border: '1px solid rgba(255,255,255,0.1)',
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
                            <Edit3 size={14} color="#818cf8" />
                            <span>Edit</span>
                          </button>

                          <button
                            onClick={() => handleDeleteOutlet(outlet.id, outlet.name)}
                            style={{
                              background: 'rgba(244, 63, 94, 0.15)',
                              color: '#fb7185',
                              border: '1px solid rgba(244, 63, 94, 0.3)',
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
          <div className="glass-card animate-fade-in" style={{ width: '100%', maxWidth: '480px', padding: '26px', background: '#1e293b' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: '800', color: '#f8fafc' }}>
                {editingOutlet ? 'Edit Data Outlet Restoran' : 'Tambahkan Outlet Restoran Baru'}
              </h3>
              <button onClick={() => setShowAddModal(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmitForm} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Field 1: Kode Outlet (Manual Input) */}
              <div>
                <label style={{ fontSize: '0.78rem', color: '#94a3b8', display: 'block', marginBottom: '6px', fontWeight: '600' }}>
                  1. Kode Outlet *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: OTL-001, BDG-01, PIK-88"
                  value={code}
                  onChange={e => setCode(e.target.value)}
                  className="form-input"
                  style={{ fontFamily: 'monospace', fontWeight: '800', color: '#818cf8' }}
                  autoFocus
                />
              </div>

              {/* Field 2: Nama Outlet */}
              <div>
                <label style={{ fontSize: '0.78rem', color: '#94a3b8', display: 'block', marginBottom: '6px', fontWeight: '600' }}>
                  2. Nama Outlet *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Barokah Resto Branch PIK"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="form-input"
                  autoFocus
                />
              </div>

              {/* Field 3: Alamat */}
              <div>
                <label style={{ fontSize: '0.78rem', color: '#94a3b8', display: 'block', marginBottom: '6px', fontWeight: '600' }}>
                  3. Alamat Lokasi Outlet *
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="Contoh: Jl. Pantai Indah Kapuk No. 88, Jakarta Utara"
                  value={address}
                  onChange={e => setAddress(e.target.value)}
                  className="form-input"
                  style={{ resize: 'vertical' }}
                />
              </div>

              {/* Field 4: Target Omzet Outlet (Rp) */}
              <div>
                <label style={{ fontSize: '0.78rem', color: '#94a3b8', display: 'block', marginBottom: '6px', fontWeight: '600' }}>
                  4. Target Omzet Outlet (Rp) *
                </label>
                <input
                  type="number"
                  required
                  placeholder="Contoh: 50000000"
                  value={targetOmzet}
                  onChange={e => setTargetOmzet(e.target.value)}
                  className="form-input"
                  style={{ fontWeight: '800', color: '#34d399' }}
                />
              </div>

              {/* Field 5: Jumlah Karyawan */}
              <div>
                <label style={{ fontSize: '0.78rem', color: '#94a3b8', display: 'block', marginBottom: '6px', fontWeight: '600' }}>
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
                  style={{ fontWeight: '800', color: '#a78bfa' }}
                />
              </div>

              {/* Field 6: Status */}
              <div>
                <label style={{ fontSize: '0.78rem', color: '#94a3b8', display: 'block', marginBottom: '6px', fontWeight: '600' }}>
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
                      borderColor: status === 'Aktif' ? '#10b981' : '#334155',
                      background: status === 'Aktif' ? 'rgba(16, 185, 129, 0.2)' : '#0f172a',
                      color: status === 'Aktif' ? '#34d399' : '#94a3b8',
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
                      borderColor: status === 'Inaktif' ? '#f43f5e' : '#334155',
                      background: status === 'Inaktif' ? 'rgba(244, 63, 94, 0.2)' : '#0f172a',
                      color: status === 'Inaktif' ? '#fb7185' : '#94a3b8',
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
          onClose={() => setSelectedOutletDetail(null)}
        />
      )}
    </div>
  );
}
