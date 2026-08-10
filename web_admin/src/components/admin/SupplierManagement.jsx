import React, { useState, useMemo } from 'react';
import { Truck, Plus, Search, Edit3, Trash2, X, CheckCircle2, Store, PackageCheck, ArrowUpDown } from 'lucide-react';
import PaginationControls from './PaginationControls';
import { getThemePalette } from '../../utils/themeUtils';

export default function SupplierManagement({ masterData, setMasterData, themeMode = 'dark' }) {
  const T = getThemePalette(themeMode);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);

  // Sorting States
  const [sortField, setSortField] = useState('name');
  const [sortDirection, setSortDirection] = useState('asc');

  // Pagination States (Default 25 rows per page)
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Form states
  const [name, setName] = useState('');
  const [outletId, setOutletId] = useState('');
  const [supplyTypes, setSupplyTypes] = useState(['Bahan Kering']); // Array of selected supply types
  const [status, setStatus] = useState('Aktif');

  const availableSupplyOptions = [
    { value: 'Bahan Kering', label: '🌾 Bahan Kering (Beras, Tepung, Minyak, Bumbu)', color: T.info },
    { value: 'Sayur Mayur', label: '🥬 Sayur Mayur (Cabai, Bawang, Sayuran)', color: T.success },
    { value: 'Ikan', label: '🐟 Ikan (Daging Ikan, Udang, Seafood)', color: T.info },
    { value: 'Lain-lain', label: '📦 Lain-lain (Kemasan, Tissue, Peralatan)', color: T.accentGold }
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
    if (!id || id === 'ALL' || id === 'all') return '📍 Semua Outlet (Nasional)';
    const found = masterData.outlets?.find(o => String(o.id) === String(id));
    return found ? found.name : `Outlet #${id}`;
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
    setOutletId('ALL');
    setSupplyTypes(['Bahan Kering']);
    setStatus('Aktif');
    setShowAddModal(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (item) => {
    setEditingSupplier(item);
    setName(item.name);
    setOutletId(item.outlet_id || 'ALL');
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

    if (editingSupplier) {
      const idx = updated.suppliers.findIndex(s => s.id === editingSupplier.id);
      if (idx !== -1) {
        updated.suppliers[idx] = {
          ...editingSupplier,
          name: name.trim(),
          outlet_id: outletId,
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
        outlet_id: outletId,
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
  const filtered = useMemo(() => {
    return suppliersList.filter(s => 
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      getOutletName(s.outlet_id).toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.code && s.code.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [suppliersList, searchTerm, masterData.outlets]);

  // Sorted Suppliers
  const sortedSuppliers = useMemo(() => {
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
        case 'outlet':
          valA = String(getOutletName(a.outlet_id));
          valB = String(getOutletName(b.outlet_id));
          break;
        case 'type':
          valA = String(Array.isArray(a.supply_types) ? a.supply_types.join(', ') : a.supply_types || '');
          valB = String(Array.isArray(b.supply_types) ? b.supply_types.join(', ') : b.supply_types || '');
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
  }, [filtered, sortField, sortDirection, masterData.outlets]);

  // Pagination calculation
  const totalItems = sortedSuppliers.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const paginatedSuppliers = sortedSuppliers.slice((currentPage - 1) * pageSize, currentPage * pageSize);

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
            Data Supplier & Vendor Pasokan
          </h2>
          <p style={{ color: T.txtSecondary, fontSize: '0.72rem', marginTop: '2px', margin: 0 }}>
            Kelola data mitra supplier bahan baku (Bahan Kering, Sayur Mayur, Ikan, Lain-lain) per lokasi outlet
          </p>
        </div>

        <button onClick={handleOpenAddModal} className="btn-primary" style={{ padding: '6px 12px', fontSize: '0.72rem' }}>
          <Plus size={15} />
          <span>Tambahkan Supplier</span>
        </button>
      </div>

      {/* Search & Sort Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ position: 'relative', width: '100%', maxWidth: '360px' }}>
          <Search size={15} color={T.txtSecondary} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            placeholder="Cari berdasarkan nama supplier, outlet, atau kode..."
            value={searchTerm}
            onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            className="form-input"
            style={{ paddingLeft: '34px', fontSize: '0.76rem', height: '34px' }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <ArrowUpDown size={14} color={T.accentGold} />
          <select
            value={sortField}
            onChange={e => setSortField(e.target.value)}
            style={{ padding: '5px 10px', background: T.controlBg, border: `1px solid ${T.border}`, borderRadius: '6px', color: T.txtPrimary, fontSize: '0.74rem', fontWeight: '700' }}
          >
            <option value="code">🔢 Kode Supplier</option>
            <option value="name">🏷️ Nama Supplier</option>
            <option value="outlet">🏪 Outlet Tujuan</option>
            <option value="type">📦 Jenis Pasokan</option>
            <option value="status">🟢 Status</option>
          </select>
          <button
            type="button"
            onClick={() => setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')}
            style={{ padding: '5px 10px', background: T.controlBg, border: `1px solid ${T.border}`, borderRadius: '6px', color: T.txtPrimary, fontSize: '0.74rem', fontWeight: '700', cursor: 'pointer' }}
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
              <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)', color: T.txtSecondary, fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.04em', background: T.tableHeaderBg, fontWeight: '800' }}>
                {renderSortHeader('code', 'Kode Supplier (Auto)', 'left')}
                {renderSortHeader('name', 'Nama Supplier', 'left')}
                {renderSortHeader('outlet', 'Outlet Tujuan', 'left')}
                {renderSortHeader('type', 'Jenis Pasokan', 'left')}
                {renderSortHeader('status', 'Status', 'left')}
                <th style={{ padding: '10px 10px', textAlign: 'right' }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {paginatedSuppliers.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '36px', textAlign: 'center', color: T.txtSecondary, fontSize: '0.76rem' }}>
                    Belum ada data supplier yang dikonfigurasi.
                  </td>
                </tr>
              ) : (
                paginatedSuppliers.map(sup => {
                  const isAktif = (sup.status || 'Aktif') === 'Aktif';
                  const types = sup.supply_types || ['Bahan Kering'];
                  const cleanSupName = (sup.name || '').replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, '').trim();

                  return (
                    <tr key={sup.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)', color: T.txtPrimary }}>
                      {/* 1. KODE SUPPLIER (Auto) */}
                      <td style={{ padding: '8px 10px' }}>
                        <span style={{
                          background: T.accentGreenBg,
                          color: T.info,
                          border: `1px solid ${T.border}`,
                          padding: '3px 8px',
                          borderRadius: '6px',
                          fontWeight: '800',
                          fontSize: '0.68rem',
                          fontFamily: 'monospace'
                        }}>
                          {sup.code || `SUP-00${sup.id}`}
                        </span>
                      </td>

                      {/* 2. NAMA SUPPLIER */}
                      <td style={{ padding: '8px 10px', fontWeight: '800', fontSize: '0.76rem', color: T.txtPrimary }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Truck size={14} color={T.info} />
                          <span>{cleanSupName}</span>
                        </div>
                      </td>

                      {/* 3. OUTLET TUJUAN */}
                      <td style={{ padding: '8px 10px', color: T.txtSecondary }}>
                        <span style={{ background: T.cardBg2, padding: '2px 6px', borderRadius: '4px', border: `1px solid ${T.borderStrong}`, fontSize: '0.70rem' }}>
                          {getOutletName(sup.outlet_id)}
                        </span>
                      </td>

                      {/* 4. JENIS PASOKAN (MULTI-BADGE) */}
                      <td style={{ padding: '14px 12px' }}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                          {types.map((t, idx) => (
                            <span key={idx} style={{
                              background: T.successBg,
                              color: T.success,
                              border: `1px solid ${T.successBorder}`,
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

                      {/* 6. AKSI */}
                      <td style={{ padding: '14px 12px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                          <button
                            onClick={() => handleOpenEditModal(sup)}
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
                            onClick={() => handleDeleteSupplier(sup.id, sup.name)}
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
          <div className="glass-card animate-fade-in" style={{ width: '100%', maxWidth: '500px', padding: '26px', background: T.cardBg, border: `1px solid ${T.border}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: '800', color: T.txtPrimary }}>
                {editingSupplier ? 'Edit Data Supplier' : 'Tambahkan Supplier Baru'}
              </h3>
              <button onClick={() => setShowAddModal(false)} style={{ background: 'none', border: 'none', color: T.txtSecondary, cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmitForm} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Field 1: Kode Supplier (Auto) */}
              <div>
                <label style={{ fontSize: '0.78rem', color: T.txtSecondary, display: 'block', marginBottom: '6px', fontWeight: '600' }}>
                  1. Kode Supplier (Auto Generated)
                </label>
                <div style={{
                  background: T.cardBg2,
                  border: `1px solid ${T.borderStrong}`,
                  padding: '10px 14px',
                  borderRadius: '10px',
                  color: T.info,
                  fontWeight: '800',
                  fontFamily: 'monospace',
                  fontSize: '0.9rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}>
                  <span>{editingSupplier ? editingSupplier.code : generateNextSupplierCode()}</span>
                  <span style={{ fontSize: '0.7rem', color: T.success, background: T.successBg, border: `1px solid ${T.successBorder}`, padding: '2px 8px', borderRadius: '6px' }}>
                    Auto Generated
                  </span>
                </div>
              </div>

              {/* Field 2: Nama Supplier */}
              <div>
                <label style={{ fontSize: '0.78rem', color: T.txtSecondary, display: 'block', marginBottom: '6px', fontWeight: '600' }}>
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
                <label style={{ fontSize: '0.78rem', color: T.txtSecondary, display: 'block', marginBottom: '6px', fontWeight: '600' }}>
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
                <label style={{ fontSize: '0.78rem', color: T.txtSecondary, display: 'block', marginBottom: '6px', fontWeight: '600' }}>
                  4. Jenis Pasokan Barang * (Bisa Pilih 1 atau Lebih)
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: T.cardBg2, padding: '12px', borderRadius: '10px', border: `1px solid ${T.borderStrong}` }}>
                  {availableSupplyOptions.map(opt => {
                    const isChecked = supplyTypes.includes(opt.value);
                    return (
                      <label key={opt.value} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.82rem', color: isChecked ? T.txtPrimary : T.txtSecondary, fontWeight: isChecked ? '700' : 'normal' }}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleSupplyType(opt.value)}
                          style={{ accentColor: T.accentGold, width: '16px', height: '16px' }}
                        />
                        <span>{opt.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Field 5: Status */}
              <div>
                <label style={{ fontSize: '0.78rem', color: T.txtSecondary, display: 'block', marginBottom: '6px', fontWeight: '600' }}>
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
                      borderColor: status === 'Aktif' ? T.success : T.borderStrong,
                      background: status === 'Aktif' ? T.successBg : T.cardBg2,
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
                      borderColor: status === 'Inaktif' ? T.danger : T.borderStrong,
                      background: status === 'Inaktif' ? T.dangerBg : T.cardBg2,
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
