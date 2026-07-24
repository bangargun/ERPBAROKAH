import React, { useState } from 'react';
import { Truck, Plus, Search, Edit3, Trash2, X, CheckCircle2, Store, PackageCheck } from 'lucide-react';
import PaginationControls from './PaginationControls';

export default function SupplierManagement({ masterData, setMasterData }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);

  // Pagination States (Default 25 rows per page)
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Form states
  const [name, setName] = useState('');
  const [outletId, setOutletId] = useState('');
  const [supplyTypes, setSupplyTypes] = useState(['Bahan Kering']); // Array of selected supply types
  const [status, setStatus] = useState('Aktif');

  const availableSupplyOptions = [
    { value: 'Bahan Kering', label: '🌾 Bahan Kering (Beras, Tepung, Minyak, Bumbu)', color: '#38bdf8' },
    { value: 'Sayur Mayur', label: '🥬 Sayur Mayur (Cabai, Bawang, Sayuran)', color: '#34d399' },
    { value: 'Ikan', label: '🐟 Ikan (Daging Ikan, Udang, Seafood)', color: '#818cf8' },
    { value: 'Lain-lain', label: '📦 Lain-lain (Kemasan, Tissue, Peralatan)', color: '#fbbf24' }
  ];

  // Helper to generate next sequential Supplier Code (SUP-001, SUP-002)
  const generateNextSupplierCode = () => {
    const existingCodes = (masterData.suppliers || [])
      .map(s => s.code)
      .filter(code => code && code.startsWith('SUP-'));

    if (existingCodes.length === 0) return 'SUP-001';

    const numbers = existingCodes.map(code => {
      const numPart = code.replace('SUP-', '');
      return parseInt(numPart, 10) || 0;
    });

    const maxNum = Math.max(...numbers, 0);
    const nextNum = maxNum + 1;
    return `SUP-${nextNum.toString().padStart(3, '0')}`;
  };

  const getOutletName = (id) => {
    const found = masterData.outlets?.find(o => o.id === parseInt(id));
    return found ? found.name : 'Outlet Utama';
  };

  // Toggle Checkbox for Supply Type
  const handleToggleSupplyType = (typeVal) => {
    if (supplyTypes.includes(typeVal)) {
      if (supplyTypes.length === 1) return; // Must keep at least one
      setSupplyTypes(supplyTypes.filter(t => t !== typeVal));
    } else {
      setSupplyTypes([...supplyTypes, typeVal]);
    }
  };

  // Open Add Modal
  const handleOpenAddModal = () => {
    setEditingSupplier(null);
    setName('');
    setOutletId(masterData.outlets?.[0]?.id || 1);
    setSupplyTypes(['Bahan Kering']);
    setStatus('Aktif');
    setShowAddModal(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (item) => {
    setEditingSupplier(item);
    setName(item.name);
    setOutletId(item.outlet_id || masterData.outlets?.[0]?.id || 1);
    setSupplyTypes(item.supply_types || ['Bahan Kering']);
    setStatus(item.status || 'Aktif');
    setShowAddModal(true);
  };

  // Submit Form
  const handleSubmitForm = (e) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('Mohon isi Nama Supplier');
      return;
    }

    const updated = { ...masterData };
    if (!updated.suppliers) updated.suppliers = [];

    const outletIdInt = parseInt(outletId);

    if (editingSupplier) {
      const idx = updated.suppliers.findIndex(s => s.id === editingSupplier.id);
      if (idx !== -1) {
        updated.suppliers[idx] = {
          ...editingSupplier,
          name: name.trim(),
          outlet_id: outletIdInt,
          supply_types: supplyTypes,
          status: status
        };
      }
    } else {
      const autoCode = generateNextSupplierCode();
      const newSupplier = {
        id: Date.now(),
        code: autoCode,
        name: name.trim(),
        outlet_id: outletIdInt,
        supply_types: supplyTypes,
        status: status
      };
      updated.suppliers.unshift(newSupplier);
    }

    setMasterData(updated);
    setShowAddModal(false);
    setEditingSupplier(null);
  };

  // Delete Supplier
  const handleDeleteSupplier = (id, supName) => {
    if (window.confirm(`Apakah Anda yakin ingin menghapus supplier "${supName}"?`)) {
      const updated = { ...masterData };
      updated.suppliers = updated.suppliers.filter(s => s.id !== id);
      setMasterData(updated);
    }
  };

  const suppliersList = masterData.suppliers || [];
  const filtered = suppliersList.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    getOutletName(s.outlet_id).toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.code && s.code.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Pagination calculation
  const totalItems = filtered.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const paginatedSuppliers = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }} className="animate-fade-in">
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '800', color: '#f8fafc', letterSpacing: '-0.02em' }}>
            Data Supplier & Vendor Pasokan
          </h2>
          <p style={{ color: '#94a3b8', fontSize: '0.875rem', marginTop: '4px' }}>
            Kelola data mitra supplier bahan baku (Bahan Kering, Sayur Mayur, Ikan, Lain-lain) per lokasi outlet
          </p>
        </div>

        <button onClick={handleOpenAddModal} className="btn-primary">
          <Plus size={18} />
          <span>Tambahkan Supplier</span>
        </button>
      </div>

      {/* Search Bar */}
      <div style={{ position: 'relative', maxWidth: '380px' }}>
        <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
        <input
          type="text"
          placeholder="Cari berdasarkan nama supplier, outlet, atau kode..."
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
                <th style={{ padding: '12px' }}>Kode Supplier (Auto)</th>
                <th style={{ padding: '12px' }}>Nama Supplier</th>
                <th style={{ padding: '12px' }}>Outlet Tujuan</th>
                <th style={{ padding: '12px' }}>Jenis Pasokan</th>
                <th style={{ padding: '12px' }}>Status</th>
                <th style={{ padding: '12px', textAlign: 'right' }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {paginatedSuppliers.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
                    Belum ada data supplier yang dikonfigurasi.
                  </td>
                </tr>
              ) : (
                paginatedSuppliers.map(sup => {
                  const isAktif = (sup.status || 'Aktif') === 'Aktif';
                  const types = sup.supply_types || ['Bahan Kering'];

                  return (
                    <tr key={sup.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', color: '#f8fafc' }}>
                      {/* 1. KODE SUPPLIER (Auto) */}
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
                          {sup.code || `SUP-00${sup.id}`}
                        </span>
                      </td>

                      {/* 2. NAMA SUPPLIER */}
                      <td style={{ padding: '14px 12px', fontWeight: '800', fontSize: '0.9rem', color: '#f8fafc' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Truck size={16} color="#38bdf8" />
                          <span>{sup.name}</span>
                        </div>
                      </td>

                      {/* 3. OUTLET TUJUAN */}
                      <td style={{ padding: '14px 12px', color: '#cbd5e1' }}>
                        <span style={{ background: '#0f172a', padding: '4px 8px', borderRadius: '6px', border: '1px solid #334155', fontSize: '0.78rem' }}>
                          🏢 {getOutletName(sup.outlet_id)}
                        </span>
                      </td>

                      {/* 4. JENIS PASOKAN (MULTI-BADGE) */}
                      <td style={{ padding: '14px 12px' }}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                          {types.map((t, idx) => (
                            <span key={idx} style={{
                              background: '#0f172a',
                              color: '#34d399',
                              border: '1px solid rgba(52, 211, 153, 0.3)',
                              padding: '2px 8px',
                              borderRadius: '6px',
                              fontSize: '0.72rem',
                              fontWeight: '700'
                            }}>
                              {t}
                            </span>
                          ))}
                        </div>
                      </td>

                      {/* 5. STATUS */}
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

                      {/* 6. AKSI */}
                      <td style={{ padding: '14px 12px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                          <button
                            onClick={() => handleOpenEditModal(sup)}
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
                            onClick={() => handleDeleteSupplier(sup.id, sup.name)}
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

      {/* MODAL TAMBAH / EDIT SUPPLIER */}
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
          <div className="glass-card animate-fade-in" style={{ width: '100%', maxWidth: '500px', padding: '26px', background: '#1e293b' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: '800', color: '#f8fafc' }}>
                {editingSupplier ? 'Edit Data Supplier' : 'Tambahkan Supplier Baru'}
              </h3>
              <button onClick={() => setShowAddModal(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmitForm} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Field 1: Kode Supplier (Auto) */}
              <div>
                <label style={{ fontSize: '0.78rem', color: '#94a3b8', display: 'block', marginBottom: '6px', fontWeight: '600' }}>
                  1. Kode Supplier (Auto Generated)
                </label>
                <div style={{
                  background: '#0f172a',
                  border: '1px solid #334155',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  color: '#818cf8',
                  fontWeight: '800',
                  fontFamily: 'monospace',
                  fontSize: '0.9rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}>
                  <span>{editingSupplier ? editingSupplier.code : generateNextSupplierCode()}</span>
                  <span style={{ fontSize: '0.7rem', color: '#34d399', background: 'rgba(16,185,129,0.15)', padding: '2px 8px', borderRadius: '6px' }}>
                    Auto Generated
                  </span>
                </div>
              </div>

              {/* Field 2: Nama Supplier */}
              <div>
                <label style={{ fontSize: '0.78rem', color: '#94a3b8', display: 'block', marginBottom: '6px', fontWeight: '600' }}>
                  2. Nama Supplier *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: PT Sumber Ayam Segar, CV Sayur Mayur Fresh"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="form-input"
                  autoFocus
                />
              </div>

              {/* Field 3: Nama Outlet */}
              <div>
                <label style={{ fontSize: '0.78rem', color: '#94a3b8', display: 'block', marginBottom: '6px', fontWeight: '600' }}>
                  3. Nama Outlet Tujuan Pasokan * (Dari Data Master Outlet)
                </label>
                <select
                  value={outletId}
                  onChange={e => setOutletId(e.target.value)}
                  className="form-select"
                >
                  {masterData.outlets.map(o => (
                    <option key={o.id} value={o.id}>
                      🏢 {o.name} ({o.code})
                    </option>
                  ))}
                </select>
              </div>

              {/* Field 4: Jenis Pasokan (Multi-Select Checkbox) */}
              <div>
                <label style={{ fontSize: '0.78rem', color: '#94a3b8', display: 'block', marginBottom: '6px', fontWeight: '600' }}>
                  4. Jenis Pasokan Barang * (Bisa Pilih 1 atau Lebih)
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: '#0f172a', padding: '12px', borderRadius: '10px', border: '1px solid #334155' }}>
                  {availableSupplyOptions.map(opt => {
                    const isChecked = supplyTypes.includes(opt.value);
                    return (
                      <label key={opt.value} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.82rem', color: isChecked ? '#f8fafc' : '#94a3b8', fontWeight: isChecked ? '700' : 'normal' }}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleSupplyType(opt.value)}
                          style={{ accentColor: '#6366f1', width: '16px', height: '16px' }}
                        />
                        <span>{opt.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Field 5: Status */}
              <div>
                <label style={{ fontSize: '0.78rem', color: '#94a3b8', display: 'block', marginBottom: '6px', fontWeight: '600' }}>
                  5. Status Supplier
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
                  Simpan Supplier
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
