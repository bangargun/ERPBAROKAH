import React, { useState, useMemo } from 'react';
import { Scale, Plus, Search, Edit3, Trash2, X, CheckCircle2, Box, Droplets, Hash, Package, ArrowUpDown } from 'lucide-react';
import PaginationControls from './PaginationControls';
import { getThemePalette } from '../../utils/themeUtils';
import { canDeleteModule, canEditModule } from '../../utils/permissionUtils';
import { executePermanentDelete } from '../../utils/deleteGuard';

export default function UnitManagement({ masterData, setMasterData, userSession, themeMode = 'dark' }) {
  const T = getThemePalette(themeMode);
  const allowDelete = canDeleteModule(userSession, 'masterData', masterData?.permissionMatrix);
  const allowEdit = canEditModule(userSession, 'masterData', masterData?.permissionMatrix);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingUnit, setEditingUnit] = useState(null);

  // Sorting States
  const [sortField, setSortField] = useState('name');
  const [sortDirection, setSortDirection] = useState('asc');

  // Pagination States (Default 25 rows per page)
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Form states
  const [name, setName] = useState('');
  const [symbol, setSymbol] = useState('');
  const [category, setCategory] = useState('Berat / Bobot');
  const [status, setStatus] = useState('Aktif');

  const culinaryCategoryOptions = [
    { value: 'Berat / Bobot', label: 'Berat / Bobot (Kg, Gram, Ounces)', color: T.info },
    { value: 'Volume / Cairan', label: 'Volume / Cairan (Liter, Milliliter, Gallon)', color: T.success },
    { value: 'Kuantitas / Hitungan', label: 'Kuantitas / Hitungan (Pieces, Porsi, Butir)', color: T.accentGreen },
    { value: 'Kemasan / Wadah', label: 'Kemasan / Wadah (Botol, Kaleng, Box, Pack)', color: T.warning }
  ];

  // Helper to generate next sequential Unit Code (UNT-001, UNT-002)
  const generateNextUnitCode = () => {
    const existingCodes = (masterData.units || [])
      .map(u => u.code)
      .filter(code => code && code.startsWith('UNT-'));

    if (existingCodes.length === 0) return 'UNT-001';

    const numbers = existingCodes.map(code => {
      const numPart = code.replace('UNT-', '');
      return parseInt(numPart, 10) || 0;
    });

    const maxNum = Math.max(...numbers, 0);
    const nextNum = maxNum + 1;
    return `UNT-${nextNum.toString().padStart(3, '0')}`;
  };

  const getCategoryBadgeStyle = (catName) => {
    switch (catName) {
      case 'Berat / Bobot':
        return { bg: 'rgba(59, 130, 246, 0.12)', color: T.info, border: 'rgba(59, 130, 246, 0.25)' };
      case 'Volume / Cairan':
        return { bg: 'rgba(16, 185, 129, 0.12)', color: T.success, border: 'rgba(16, 185, 129, 0.25)' };
      case 'Kuantitas / Hitungan':
        return { bg: 'rgba(217, 119, 6, 0.12)', color: T.accentGold, border: 'rgba(217, 119, 6, 0.25)' };
      default:
        return { bg: T.tableHeaderBg, color: T.txtSecondary, border: T.border };
    }
  };

  // Open Add Modal
  const handleOpenAddModal = () => {
    setEditingUnit(null);
    setName('');
    setSymbol('');
    setCategory('Berat / Bobot');
    setStatus('Aktif');
    setShowAddModal(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (unit) => {
    setEditingUnit(unit);
    setName(unit.name || '');
    setSymbol(unit.symbol || '');
    setCategory(unit.category || 'Berat / Bobot');
    setStatus(unit.status || 'Aktif');
    setShowAddModal(true);
  };

  // Submit Form
  const handleSaveUnit = (e) => {
    e.preventDefault();
    if (!name.trim() || !symbol.trim()) {
      alert('Mohon isi Nama Satuan dan Simbol Unit');
      return;
    }

    const updated = { ...masterData };
    if (!updated.units) updated.units = [];

    if (editingUnit) {
      updated.units = updated.units.map(u => {
        if (u.id === editingUnit.id) {
          return {
            ...u,
            name: name.trim(),
            symbol: symbol.trim(),
            category,
            status
          };
        }
        return u;
      });
    } else {
      const newUnit = {
        id: Date.now(),
        code: generateNextUnitCode(),
        name: name.trim(),
        symbol: symbol.trim(),
        category,
        status,
        created_at: new Date().toISOString()
      };
      updated.units.unshift(newUnit);
    }

    updated._lastUpdated = Date.now();
    updated._lastMutated = Date.now();
    setMasterData(updated);
    try {
      localStorage.setItem('mris_master_data', JSON.stringify(updated));
      fetch(getApiUrl('/api/master-data'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated)
      }).catch(err => console.warn('Failed to push units to server:', err));
    } catch (e) {}

    setShowAddModal(false);
    setEditingUnit(null);
  };

  // Delete Unit
  const handleDeleteUnit = (id, unitName) => {
    if (window.confirm(`Apakah Anda yakin ingin menghapus satuan "${unitName}" secara permanen?`)) {
      const targetUnit = (masterData?.units || []).find(u => String(u.id) === String(id) || String(u.name || u.unit || '').trim().toLowerCase() === String(unitName || '').trim().toLowerCase());
      const targetId = String(targetUnit?.id || id);
      const targetName = String(targetUnit?.name || targetUnit?.unit || unitName).trim();

      executePermanentDelete({
        key: 'units',
        id: targetId,
        name: targetName,
        masterData,
        setMasterData
      });

      alert(`Satuan "${unitName}" berhasil dihapus secara permanen dari Web Admin, POS Kasir, dan Database.`);
    }
  };

  const unitsList = masterData.units || [];
  const filtered = useMemo(() => {
    return unitsList.filter(u => 
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.code && u.code.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [unitsList, searchTerm]);

  // Sorted Units
  const sortedUnits = useMemo(() => {
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
        case 'symbol':
          valA = String(a.symbol || '');
          valB = String(b.symbol || '');
          break;
        case 'category':
          valA = String(a.category || '');
          valB = String(b.category || '');
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
  const totalItems = sortedUnits.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const paginatedUnits = sortedUnits.slice((currentPage - 1) * pageSize, currentPage * pageSize);

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
            Data Satuan / Unit Pengukuran
          </h2>
          <p style={{ color: T.txtSecondary, fontSize: '0.72rem', marginTop: '2px', margin: 0 }}>
            Kelola master satuan unit standar industri kuliner F&B untuk resep bahan dapur, stok inventoris, dan porsi menu
          </p>
        </div>

        {allowEdit && (
          <button onClick={handleOpenAddModal} className="btn-primary" style={{ padding: '6px 12px', fontSize: '0.72rem' }}>
            <Plus size={15} />
            <span>Tambahkan Satuan/Unit</span>
          </button>
        )}
      </div>

      {/* Search & Sort Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ position: 'relative', width: '100%', maxWidth: '360px' }}>
          <Search size={15} color={T.txtMuted} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            placeholder="Cari berdasarkan nama, simbol, atau kode unit..."
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
            style={{ padding: '5px 10px', background: T.cardBg2, border: `1px solid ${T.border}`, borderRadius: '6px', color: T.txtPrimary, fontSize: '0.74rem', fontWeight: '700' }}
          >
            <option value="code">Kode Unit</option>
            <option value="name">Nama Satuan</option>
            <option value="symbol">Simbol Unit</option>
            <option value="category">Kategori F&B</option>
            <option value="status">Status</option>
          </select>
          <button
            type="button"
            onClick={() => setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')}
            style={{ padding: '5px 10px', background: T.cardBg2, border: `1px solid ${T.border}`, borderRadius: '6px', color: T.txtPrimary, fontSize: '0.74rem', fontWeight: '700', cursor: 'pointer' }}
          >
            {sortDirection === 'asc' ? 'Naik' : 'Turun'}
          </button>
        </div>
      </div>

      {/* Table Section */}
      <div className="glass-card" style={{ padding: '16px', background: T.cardBg, border: `1px solid ${T.border}` }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.76rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)', color: T.txtSecondary, fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.04em', background: T.tableHeaderBg, fontWeight: '800' }}>
                {renderSortHeader('code', 'Kode Unit (Auto)', 'left')}
                {renderSortHeader('name', 'Nama Satuan', 'left')}
                {renderSortHeader('symbol', 'Simbol Unit', 'left')}
                {renderSortHeader('category', 'Kategori Kuliner F&B', 'left')}
                {renderSortHeader('status', 'Status', 'left')}
                <th style={{ padding: '10px 10px', textAlign: 'right' }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {paginatedUnits.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '36px', textAlign: 'center', color: T.txtMuted, fontSize: '0.76rem' }}>
                    Belum ada data satuan unit yang dikonfigurasi.
                  </td>
                </tr>
              ) : (
                paginatedUnits.map(unit => {
                  const isAktif = (unit.status || 'Aktif') === 'Aktif';
                  const badgeStyle = getCategoryBadgeStyle(unit.category);
                  const cleanUnitName = (unit.name || '').replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, '').trim();

                  return (
                    <tr key={unit.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)', color: T.txtPrimary }}>
                      {/* 1. KODE UNIT (Auto) */}
                      <td style={{ padding: '8px 10px' }}>
                        <span style={{
                          background: T.accentGreenBg,
                          color: T.accentGreen,
                          border: `1px solid ${T.accentGreenBg}`,
                          padding: '3px 8px',
                          borderRadius: '6px',
                          fontWeight: '800',
                          fontSize: '0.68rem',
                          fontFamily: 'monospace'
                        }}>
                          {unit.code || `UNT-00${unit.id}`}
                        </span>
                      </td>

                      {/* 2. NAMA SATUAN */}
                      <td style={{ padding: '8px 10px', fontWeight: '800', fontSize: '0.76rem', color: T.txtPrimary }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Scale size={14} color={T.info} />
                          <span>{cleanUnitName}</span>
                        </div>
                      </td>

                      {/* 3. SIMBOL UNIT */}
                      <td style={{ padding: '8px 10px' }}>
                        <span style={{ background: T.cardBg2, color: T.success, fontWeight: '800', padding: '2px 6px', borderRadius: '4px', border: `1px solid ${T.border}`, fontFamily: 'monospace', fontSize: '0.70rem' }}>
                          {unit.symbol}
                        </span>
                      </td>

                      {/* 4. KATEGORI KULINER F&B */}
                      <td style={{ padding: '14px 12px' }}>
                        <span style={{
                          background: badgeStyle.bg,
                          color: badgeStyle.color,
                          border: `1px solid ${badgeStyle.border}`,
                          padding: '4px 10px',
                          borderRadius: '8px',
                          fontSize: '0.75rem',
                          fontWeight: '700'
                        }}>
                          {unit.category || 'Berat / Bobot'}
                        </span>
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
                          {allowEdit && (
                            <button
                              onClick={() => handleOpenEditModal(unit)}
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
                              <Edit3 size={14} color={T.accentGreen} />
                              <span>Edit</span>
                            </button>
                          )}

                          {allowDelete && (
                            <button
                              onClick={() => handleDeleteUnit(unit.id, unit.name)}
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
          themeMode={themeMode}
        />
      </div>

      {/* MODAL TAMBAH / EDIT SATUAN */}
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
          <div className="glass-card animate-fade-in" style={{ width: '100%', maxWidth: '480px', padding: '26px', background: T.cardBg, border: `1px solid ${T.border}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: '800', color: T.txtPrimary }}>
                {editingUnit ? 'Edit Data Satuan/Unit' : 'Tambahkan Satuan/Unit Baru'}
              </h3>
              <button onClick={() => setShowAddModal(false)} style={{ background: 'none', border: 'none', color: T.txtSecondary, cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveUnit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Field 1: Kode Unit (Auto) */}
              <div>
                <label style={{ fontSize: '0.78rem', color: T.txtSecondary, display: 'block', marginBottom: '6px', fontWeight: '600' }}>
                  1. Kode Satuan (Auto Generated)
                </label>
                <div style={{
                  background: T.cardBg2,
                  border: `1px solid ${T.border}`,
                  padding: '10px 14px',
                  borderRadius: '10px',
                  color: T.accentGreen,
                  fontWeight: '800',
                  fontFamily: 'monospace',
                  fontSize: '0.9rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}>
                  <span>{editingUnit ? editingUnit.code : generateNextUnitCode()}</span>
                  <span style={{ fontSize: '0.7rem', color: T.success, background: T.successBg, border: `1px solid ${T.successBorder}`, padding: '2px 8px', borderRadius: '6px' }}>
                    Auto Generated
                  </span>
                </div>
              </div>

              {/* Field 2 & 3: Nama Satuan & Simbol */}
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.78rem', color: T.txtSecondary, display: 'block', marginBottom: '6px', fontWeight: '600' }}>
                    2. Nama Satuan *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Kilogram, Porsi"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="form-input"
                    autoFocus
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.78rem', color: T.txtSecondary, display: 'block', marginBottom: '6px', fontWeight: '600' }}>
                    3. Simbol *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Kg, Prs"
                    value={symbol}
                    onChange={e => setSymbol(e.target.value)}
                    className="form-input"
                    style={{ fontWeight: '800', fontFamily: 'monospace' }}
                  />
                </div>
              </div>

              {/* Field 4: Kategori Satuan (Dropdown Kuliner F&B) */}
              <div>
                <label style={{ fontSize: '0.78rem', color: T.txtSecondary, display: 'block', marginBottom: '6px', fontWeight: '600' }}>
                  4. Kategori Pengukuran Kuliner F&B *
                </label>
                <select
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                  className="form-select"
                >
                  {culinaryCategoryOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Field 5: Status */}
              <div>
                <label style={{ fontSize: '0.78rem', color: T.txtSecondary, display: 'block', marginBottom: '6px', fontWeight: '600' }}>
                  5. Status Satuan
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
                      borderColor: status === 'Inaktif' ? T.danger : T.border,
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
                  Simpan Satuan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
