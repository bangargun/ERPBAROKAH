import React, { useState } from 'react';
import { Scale, Plus, Search, Edit3, Trash2, X, CheckCircle2, Box, Droplets, Hash, Package } from 'lucide-react';
import PaginationControls from './PaginationControls';
import { getThemePalette } from '../../utils/themeUtils';

export default function UnitManagement({ masterData, setMasterData, themeMode = 'dark' }) {
  const T = getThemePalette(themeMode);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingUnit, setEditingUnit] = useState(null);

  // Pagination States (Default 25 rows per page)
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Form states
  const [name, setName] = useState('');
  const [symbol, setSymbol] = useState('');
  const [category, setCategory] = useState('Berat / Bobot');
  const [status, setStatus] = useState('Aktif');

  const culinaryCategoryOptions = [
    { value: 'Berat / Bobot', label: '⚖️ Berat / Bobot (Kg, Gram, Ounces)', color: T.info },
    { value: 'Volume / Cairan', label: '🧪 Volume / Cairan (Liter, Milliliter, Gallon)', color: T.success },
    { value: 'Kuantitas / Hitungan', label: '🔢 Kuantitas / Hitungan (Pieces, Porsi, Butir)', color: T.accentGreen },
    { value: 'Kemasan / Wadah', label: '📦 Kemasan / Wadah (Botol, Kaleng, Box, Pack)', color: T.warning }
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

  const getCategoryBadgeStyle = (cat) => {
    switch (cat) {
      case 'Berat / Bobot':
        return { bg: T.infoBg, color: T.info, border: T.infoBorder };
      case 'Volume / Cairan':
        return { bg: T.successBg, color: T.success, border: T.successBorder };
      case 'Kuantitas / Hitungan':
        return { bg: T.accentGreenBg, color: T.accentGreen, border: `1px solid ${T.accentGreenBg}` };
      default:
        return { bg: T.warningBg, color: T.warning, border: T.warningBorder };
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
    setName(unit.name);
    setSymbol(unit.symbol);
    setCategory(unit.category || 'Berat / Bobot');
    setStatus(unit.status || 'Aktif');
    setShowAddModal(true);
  };

  // Submit Form
  const handleSubmitForm = (e) => {
    e.preventDefault();
    if (!name.trim() || !symbol.trim()) {
      alert('Mohon isi Nama Satuan dan Simbol');
      return;
    }

    const updated = { ...masterData };
    if (!updated.units) updated.units = [];

    if (editingUnit) {
      const idx = updated.units.findIndex(u => u.id === editingUnit.id);
      if (idx !== -1) {
        updated.units[idx] = {
          ...editingUnit,
          name: name.trim(),
          symbol: symbol.trim(),
          category: category,
          status: status
        };
      }
    } else {
      const autoCode = generateNextUnitCode();
      const newUnit = {
        id: Date.now(),
        code: autoCode,
        name: name.trim(),
        symbol: symbol.trim(),
        category: category,
        status: status
      };
      updated.units.unshift(newUnit);
    }

    setMasterData(updated);
    setShowAddModal(false);
    setEditingUnit(null);
  };

  // Delete Unit
  const handleDeleteUnit = (id, unitName) => {
    if (window.confirm(`Apakah Anda yakin ingin menghapus satuan "${unitName}"?`)) {
      const updated = { ...masterData };
      updated.units = updated.units.filter(u => u.id !== id);
      setMasterData(updated);
    }
  };

  const unitsList = masterData.units || [];
  const filtered = unitsList.filter(u => 
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (u.code && u.code.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Pagination calculation
  const totalItems = filtered.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const paginatedUnits = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }} className="animate-fade-in">
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '800', color: T.txtPrimary, letterSpacing: '-0.02em' }}>
            Data Satuan / Unit Pengukuran
          </h2>
          <p style={{ color: T.txtSecondary, fontSize: '0.875rem', marginTop: '4px' }}>
            Kelola master satuan unit standar industri kuliner F&B untuk resep bahan dapur, stok inventoris, dan porsi menu
          </p>
        </div>

        <button onClick={handleOpenAddModal} className="btn-primary">
          <Plus size={18} />
          <span>Tambahkan Satuan/Unit</span>
        </button>
      </div>

      {/* Search Bar */}
      <div style={{ position: 'relative', maxWidth: '380px' }}>
        <Search size={16} color={T.txtMuted} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
        <input
          type="text"
          placeholder="Cari berdasarkan nama, simbol, atau kode unit..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="form-input"
          style={{ paddingLeft: '36px' }}
        />
      </div>

      {/* Table Section */}
      <div className="glass-card" style={{ padding: '20px', background: T.cardBg, border: `1px solid ${T.border}` }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${T.border}`, color: T.txtSecondary, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', background: T.tableHeaderBg }}>
                <th style={{ padding: '12px' }}>Kode Unit (Auto)</th>
                <th style={{ padding: '12px' }}>Nama Satuan</th>
                <th style={{ padding: '12px' }}>Simbol Unit</th>
                <th style={{ padding: '12px' }}>Kategori Kuliner F&B</th>
                <th style={{ padding: '12px' }}>Status</th>
                <th style={{ padding: '12px', textAlign: 'right' }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {paginatedUnits.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: T.txtMuted }}>
                    Belum ada data satuan unit yang dikonfigurasi.
                  </td>
                </tr>
              ) : (
                paginatedUnits.map(unit => {
                  const isAktif = (unit.status || 'Aktif') === 'Aktif';
                  const badgeStyle = getCategoryBadgeStyle(unit.category);

                  return (
                    <tr key={unit.id} style={{ borderBottom: `1px solid ${T.border}`, color: T.txtPrimary }}>
                      {/* 1. KODE UNIT (Auto) */}
                      <td style={{ padding: '14px 12px' }}>
                        <span style={{
                          background: T.accentGreenBg,
                          color: T.accentGreen,
                          border: `1px solid ${T.accentGreenBg}`,
                          padding: '4px 10px',
                          borderRadius: '8px',
                          fontWeight: '800',
                          fontSize: '0.8rem',
                          fontFamily: 'monospace'
                        }}>
                          {unit.code || `UNT-00${unit.id}`}
                        </span>
                      </td>

                      {/* 2. NAMA SATUAN */}
                      <td style={{ padding: '14px 12px', fontWeight: '800', fontSize: '0.9rem', color: T.txtPrimary }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Scale size={16} color={T.info} />
                          <span>{unit.name}</span>
                        </div>
                      </td>

                      {/* 3. SIMBOL UNIT */}
                      <td style={{ padding: '14px 12px' }}>
                        <span style={{ background: T.cardBg2, color: T.success, fontWeight: '800', padding: '4px 10px', borderRadius: '6px', border: `1px solid ${T.border}`, fontFamily: 'monospace' }}>
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

            <form onSubmit={handleSubmitForm} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
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
