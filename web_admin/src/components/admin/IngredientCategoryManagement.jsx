import React, { useState, useMemo } from 'react';
import { Layers, Plus, Search, Edit3, Trash2, CheckCircle2, AlertCircle, ShoppingBasket, X, Eye, FileSpreadsheet } from 'lucide-react';
import PaginationControls from './PaginationControls';
import ExcelMasterImportModal from './ExcelMasterImportModal';
import { getThemePalette } from '../../utils/themeUtils';
import { getApiUrl } from '../../utils/apiConfig';
import { canDeleteModule, canEditModule } from '../../utils/permissionUtils';

export const DEFAULT_INGREDIENT_CATEGORIES = [
  { id: 1, code: 'KBHN-001', name: 'Seafood & Ikan', description: 'Aneka ikan laut, udang, cumi, dan seafood segar', status: 'Aktif' },
  { id: 2, code: 'KBHN-002', name: 'Daging & Unggas', description: 'Ayam, bebek, sapi, dan produk unggas', status: 'Aktif' },
  { id: 3, code: 'KBHN-003', name: 'Sayur & Bumbu Segar', description: 'Sayuran hijau, cabai, bawang, dan bumbu basah', status: 'Aktif' },
  { id: 4, code: 'KBHN-004', name: 'Minuman & Powder', description: 'Bubuk minuman, teh, kopi, sirup, dan kemasan', status: 'Aktif' },
  { id: 5, code: 'KBHN-005', name: 'Sembako & Olahan', description: 'Beras, minyak goreng, tepung, gula, kecap, dan saus', status: 'Aktif' },
  { id: 6, code: 'KBHN-006', name: 'Bumbu & Rempah', description: 'Bumbu kering, rempah-rempah dapur, dan perasa', status: 'Aktif' }
];

export const getIngredientCategoryName = (ing) => {
  if (!ing) return 'Bumbu & Rempah';
  if (ing.category && String(ing.category).trim() && String(ing.category).trim() !== '-') return String(ing.category).trim();
  if (ing.category_name && String(ing.category_name).trim() && String(ing.category_name).trim() !== '-') return String(ing.category_name).trim();
  if (ing.type && String(ing.type).trim() && String(ing.type).trim() !== '-') return String(ing.type).trim();

  // Smart inference based on ingredient name
  const n = String(ing.name || '').toLowerCase();
  if (n.includes('ikan') || n.includes('udang') || n.includes('cumi') || n.includes('kepiting') || n.includes('lele') || n.includes('gurami') || n.includes('seafood') || n.includes('belut')) return 'Seafood & Ikan';
  if (n.includes('ayam') || n.includes('bebek') || n.includes('daging') || n.includes('sapi') || n.includes('kambing') || n.includes('telur')) return 'Daging & Unggas';
  if (n.includes('kangkung') || n.includes('bayam') || n.includes('toge') || n.includes('sayur') || n.includes('cabai') || n.includes('cabe') || n.includes('bawang') || n.includes('tomat') || n.includes('timun') || n.includes('jeruk') || n.includes('daun')) return 'Sayur & Bumbu Segar';
  if (n.includes('milo') || n.includes('kopi') || n.includes('coffee') || n.includes('cappucino') || n.includes('teh') || n.includes('lemon tea') || n.includes('fruit tea') || n.includes('air mineral') || n.includes('sirup') || n.includes('susu') || n.includes('powder') || n.includes('aqua')) return 'Minuman & Powder';
  if (n.includes('nasi') || n.includes('beras') || n.includes('minyak') || n.includes('tepung') || n.includes('gula') || n.includes('garam') || n.includes('kecap') || n.includes('saus') || n.includes('kerupuk')) return 'Sembako & Olahan';
  return 'Bumbu & Rempah';
};

export default function IngredientCategoryManagement({ masterData, setMasterData, selectedBranch, userSession, themeMode = 'dark' }) {
  const T = getThemePalette(themeMode);
  const allowDelete = canDeleteModule(userSession, 'masterData', masterData?.permissionMatrix);
  const allowEdit = canEditModule(userSession, 'masterData', masterData?.permissionMatrix);

  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showExcelImportModal, setShowExcelImportModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [selectedCategoryDetail, setSelectedCategoryDetail] = useState(null);

  // Pagination States
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Form states
  const [newCatName, setNewCatName] = useState('');
  const [newCatDescription, setNewCatDescription] = useState('');
  const [newCatStatus, setNewCatStatus] = useState('Aktif');

  // Categories list from masterData or fallback default
  const categoriesList = useMemo(() => {
    const raw = masterData?.ingredientCategories;
    if (Array.isArray(raw) && raw.length > 0) return raw;
    return DEFAULT_INGREDIENT_CATEGORIES;
  }, [masterData?.ingredientCategories]);

  // Helper to generate next sequential category code
  const generateNextCategoryCode = () => {
    const existingCodes = categoriesList
      .map(c => c.code)
      .filter(code => code && code.startsWith('KBHN-'));
    
    if (existingCodes.length === 0) return 'KBHN-001';

    const numbers = existingCodes.map(code => {
      const numPart = code.replace('KBHN-', '');
      return parseInt(numPart, 10) || 0;
    });

    const maxNum = Math.max(...numbers, 0);
    const nextNum = maxNum + 1;
    return `KBHN-${nextNum.toString().padStart(3, '0')}`;
  };

  // Helper to get connected ingredients from Data Master Bahan Baku
  const getAssociatedIngredients = (catName) => {
    if (!catName) return [];
    const catLower = String(catName).toLowerCase().trim();
    return (masterData?.ingredients || []).filter(i => {
      const resolvedCat = getIngredientCategoryName(i).toLowerCase().trim();
      const rawCat = String(i.category || i.category_name || '').toLowerCase().trim();
      return resolvedCat === catLower || rawCat === catLower;
    });
  };

  // Handle Create Category
  const handleCreateCategory = (e) => {
    e.preventDefault();
    if (!newCatName.trim()) {
      alert('Mohon isi nama kategori bahan');
      return;
    }

    const autoCode = generateNextCategoryCode();
    const newCategory = {
      id: Date.now(),
      code: autoCode,
      name: newCatName.trim(),
      description: newCatDescription.trim() || 'Kategori Bahan Baku',
      status: newCatStatus,
      created_at: new Date().toISOString().split('T')[0],
      _updatedAt: Date.now()
    };

    const updated = {
      ...masterData,
      _lastUpdated: Date.now(),
      ingredientCategories: [...categoriesList, newCategory]
    };
    setMasterData(updated);

    setShowAddModal(false);
    setNewCatName('');
    setNewCatDescription('');
    setNewCatStatus('Aktif');
  };

  // Open Edit Modal
  const openEditModal = (cat) => {
    setEditingCategory({ ...cat });
    setShowEditModal(true);
  };

  // Handle Edit Category
  const handleUpdateCategory = (e) => {
    e.preventDefault();
    if (!editingCategory || !editingCategory.name.trim()) return;

    const oldName = categoriesList.find(c => String(c.id) === String(editingCategory.id))?.name || '';
    const newName = editingCategory.name.trim();

    const updatedCatObj = {
      ...editingCategory,
      name: newName,
      description: editingCategory.description || '',
      status: editingCategory.status || 'Aktif',
      _updatedAt: Date.now()
    };

    const updatedCategories = categoriesList.map(c => 
      String(c.id) === String(editingCategory.id) ? updatedCatObj : c
    );

    // Also update any ingredients that had the old category name
    let updatedIngredients = [...(masterData?.ingredients || [])];
    if (oldName && oldName !== newName) {
      updatedIngredients = updatedIngredients.map(ing => {
        if (ing.category === oldName || ing.category_name === oldName) {
          return { ...ing, category: newName, category_name: newName };
        }
        return ing;
      });
    }

    const updated = {
      ...masterData,
      _lastUpdated: Date.now(),
      ingredientCategories: updatedCategories,
      ingredients: updatedIngredients
    };
    setMasterData(updated);

    setShowEditModal(false);
    setEditingCategory(null);
  };

  // Handle Delete Category
  const handleDeleteCategory = (cat) => {
    const connected = getAssociatedIngredients(cat.name);
    if (connected.length > 0) {
      if (!window.confirm(`Kategori "${cat.name}" saat ini memiliki ${connected.length} bahan baku terhubung. Apakah Anda yakin tetap ingin menghapusnya secara permanen?`)) {
        return;
      }
    } else {
      if (!window.confirm(`Apakah Anda yakin ingin menghapus kategori bahan "${cat.name}" secara permanen?`)) {
        return;
      }
    }

    const targetId = String(cat?.id || '');
    const targetCode = String(cat?.code || '');
    const targetName = String(cat?.name || '').trim();

    const updatedDelCategoriesIds = Array.from(new Set([
      ...(masterData?.deletedCategoriesIds || []),
      ...(masterData?.deletedCategoryIds || []),
      targetId, targetId.toLowerCase(), targetCode, targetCode.toLowerCase(), targetName, targetName.toLowerCase()
    ].filter(Boolean)));

    const updatedCategories = categoriesList.filter(c => String(c.id) !== targetId && String(c.name || '').trim().toLowerCase() !== targetName.toLowerCase());
    const updated = {
      ...masterData,
      _lastUpdated: Date.now(),
      _lastMutated: Date.now(),
      ingredientCategories: updatedCategories,
      deletedCategoriesIds: updatedDelCategoriesIds,
      deletedCategoryIds: updatedDelCategoriesIds
    };
    setMasterData(updated);
    try { localStorage.setItem('mris_master_data', JSON.stringify(updated)); } catch(e) {}

    fetch(getApiUrl('/api/master-data/delete-item'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: 'ingredientCategories', id: targetId, code: targetCode, name: targetName })
    }).catch(() => {});

    alert(`Kategori bahan "${targetName}" berhasil dihapus.`);
  };

  // Filter Search
  const filtered = categoriesList.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.code && c.code.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (c.description && c.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Pagination calculation
  const totalItems = filtered.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const paginatedCategories = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }} className="animate-fade-in">
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <h2 style={{ fontSize: '0.96rem', fontWeight: '900', color: T.txtPrimary, letterSpacing: '-0.01em', margin: 0 }}>
            Kategori Bahan Baku (Ingredient Categories)
          </h2>
          <p style={{ color: T.txtSecondary, fontSize: '0.72rem', marginTop: '2px', margin: 0 }}>
            Kelola pengelompokan bahan baku dapur (Seafood, Daging, Sayur, Bumbu, Minuman, Sembako) untuk sinkronisasi Dashboard dan HPP
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {allowEdit && (
            <button
              onClick={() => setShowAddModal(true)}
              className="btn-primary"
              style={{
                padding: '7px 14px',
                fontSize: '0.74rem',
                fontWeight: '800',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <Plus size={15} />
              <span>Tambah Kategori Bahan</span>
            </button>
          )}
        </div>
      </div>

      {/* Search Bar */}
      <div style={{ position: 'relative', maxWidth: '360px' }}>
        <Search size={15} color={T.txtMuted} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
        <input
          type="text"
          placeholder="Cari berdasarkan nama atau kode kategori..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="form-input"
          style={{ paddingLeft: '34px', background: T.inputBg, borderColor: T.border, color: T.txtPrimary, fontSize: '0.76rem', height: '34px' }}
        />
      </div>

      {/* Table Management */}
      <div className="glass-card" style={{ padding: '16px', background: T.cardBg, border: `1px solid ${T.border}` }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.76rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)', color: T.txtSecondary, fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.04em', background: T.tableHeaderBg, fontWeight: '800' }}>
                <th style={{ padding: '10px 12px' }}>Kode Kategori</th>
                <th style={{ padding: '10px 12px' }}>Nama Kategori Bahan</th>
                <th style={{ padding: '10px 12px' }}>Keterangan / Deskripsi</th>
                <th style={{ padding: '10px 12px' }}>Bahan Terhubung</th>
                <th style={{ padding: '10px 12px' }}>Status</th>
                <th style={{ padding: '10px 12px', textAlign: 'right' }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {paginatedCategories.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '36px', textAlign: 'center', color: T.txtMuted, fontSize: '0.76rem' }}>
                    Belum ada kategori bahan baku yang terdaftar.
                  </td>
                </tr>
              ) : (
                paginatedCategories.map(cat => {
                  const isAktif = (cat.status || 'Aktif') === 'Aktif';
                  const associated = getAssociatedIngredients(cat.name);

                  return (
                    <tr key={cat.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)', color: T.txtPrimary }}>
                      {/* 1. KODE KATEGORI */}
                      <td style={{ padding: '10px 12px' }}>
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
                          {cat.code || `KBHN-00${cat.id}`}
                        </span>
                      </td>

                      {/* 2. NAMA KATEGORI */}
                      <td style={{ padding: '10px 12px', fontWeight: '800', fontSize: '0.78rem' }}>
                        <button
                          type="button"
                          onClick={() => setSelectedCategoryDetail(cat)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: T.txtPrimary,
                            fontWeight: '800',
                            cursor: 'pointer',
                            padding: 0,
                            textAlign: 'left',
                            fontSize: '0.78rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                          }}
                        >
                          <ShoppingBasket size={14} color={T.accentGold} />
                          <span>{cat.name}</span>
                        </button>
                      </td>

                      {/* 3. DESKRIPSI */}
                      <td style={{ padding: '10px 12px', color: T.txtSecondary, fontSize: '0.72rem', maxWidth: '240px' }}>
                        {cat.description || '-'}
                      </td>

                      {/* 4. BAHAN TERHUBUNG */}
                      <td style={{ padding: '10px 12px' }}>
                        <button
                          type="button"
                          onClick={() => setSelectedCategoryDetail(cat)}
                          style={{
                            background: T.cardBg2,
                            color: T.info,
                            border: `1px solid ${T.borderStrong}`,
                            padding: '3px 8px',
                            borderRadius: '6px',
                            fontWeight: '700',
                            fontSize: '0.70rem',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          <span>{associated.length} Bahan</span>
                        </button>
                      </td>

                      {/* 5. STATUS */}
                      <td style={{ padding: '10px 12px' }}>
                        <span style={{
                          background: isAktif ? T.successBg : T.dangerBg,
                          color: isAktif ? T.success : T.danger,
                          border: `1px solid ${isAktif ? T.successBorder : T.dangerBorder}`,
                          padding: '2px 8px',
                          borderRadius: '20px',
                          fontSize: '0.68rem',
                          fontWeight: '800'
                        }}>
                          ● {isAktif ? 'Aktif' : 'Non Aktif'}
                        </span>
                      </td>

                      {/* 6. AKSI */}
                      <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '4px' }}>
                          <button
                            onClick={() => setSelectedCategoryDetail(cat)}
                            title="Lihat Daftar Bahan"
                            style={{
                              background: T.infoBg,
                              color: T.info,
                              border: `1px solid ${T.infoBorder}`,
                              padding: '3px 8px',
                              borderRadius: '6px',
                              fontSize: '0.68rem',
                              fontWeight: '700',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                          >
                            <Eye size={12} />
                            <span>Detail</span>
                          </button>

                          {allowEdit && (
                            <button
                              onClick={() => openEditModal(cat)}
                              style={{
                                background: T.cardBg2,
                                color: T.txtPrimary,
                                border: `1px solid ${T.border}`,
                                padding: '3px 8px',
                                borderRadius: '6px',
                                fontSize: '0.68rem',
                                fontWeight: '700',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}
                            >
                              <Edit3 size={12} />
                              <span>Edit</span>
                            </button>
                          )}

                          {allowDelete && (
                            <button
                              onClick={() => handleDeleteCategory(cat)}
                              style={{
                                background: T.dangerBg,
                                color: T.danger,
                                border: `1px solid ${T.dangerBorder}`,
                                padding: '3px 6px',
                                borderRadius: '6px',
                                fontSize: '0.68rem',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center'
                              }}
                              title="Hapus Kategori Ini"
                            >
                              <Trash2 size={12} />
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

      {/* MODAL: TAMBAH KATEGORI BAHAN */}
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
          <div className="glass-card animate-fade-in" style={{ width: '100%', maxWidth: '440px', padding: '24px', background: T.cardBg, border: `1px solid ${T.borderStrong}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: '800', color: T.txtPrimary, margin: 0 }}>
                Tambah Kategori Bahan Baku
              </h3>
              <button onClick={() => setShowAddModal(false)} style={{ background: 'none', border: 'none', color: T.txtSecondary, cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateCategory} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '0.78rem', color: T.txtSecondary, display: 'block', marginBottom: '6px', fontWeight: '600' }}>
                  Kode Kategori (Auto Generated)
                </label>
                <div style={{ background: T.cardBg2, border: `1px solid ${T.border}`, padding: '8px 12px', borderRadius: '8px', color: T.info, fontWeight: '800', fontFamily: 'monospace', fontSize: '0.86rem' }}>
                  {generateNextCategoryCode()}
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.78rem', color: T.txtSecondary, display: 'block', marginBottom: '6px', fontWeight: '600' }}>
                  Nama Kategori Bahan *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Seafood & Ikan, Daging, Sayuran, Bumbu"
                  value={newCatName}
                  onChange={e => setNewCatName(e.target.value)}
                  className="form-input"
                  style={{ background: T.inputBg, borderColor: T.border, color: T.txtPrimary }}
                  autoFocus
                />
              </div>

              <div>
                <label style={{ fontSize: '0.78rem', color: T.txtSecondary, display: 'block', marginBottom: '6px', fontWeight: '600' }}>
                  Keterangan / Deskripsi
                </label>
                <textarea
                  rows={2}
                  placeholder="Keterangan singkat tentang kelompok bahan ini..."
                  value={newCatDescription}
                  onChange={e => setNewCatDescription(e.target.value)}
                  className="form-input"
                  style={{ background: T.inputBg, borderColor: T.border, color: T.txtPrimary, resize: 'vertical' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.78rem', color: T.txtSecondary, display: 'block', marginBottom: '6px', fontWeight: '600' }}>
                  Status
                </label>
                <select
                  value={newCatStatus}
                  onChange={e => setNewCatStatus(e.target.value)}
                  className="form-select"
                  style={{ background: T.inputBg, borderColor: T.border, color: T.txtPrimary }}
                >
                  <option value="Aktif">Aktif</option>
                  <option value="Non Aktif">Non Aktif</option>
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '10px' }}>
                <button type="button" onClick={() => setShowAddModal(false)} className="btn-secondary" style={{ padding: '7px 14px', fontSize: '0.76rem' }}>
                  Batal
                </button>
                <button type="submit" className="btn-primary" style={{ padding: '7px 16px', fontSize: '0.76rem', fontWeight: '800' }}>
                  Simpan Kategori
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDIT KATEGORI BAHAN */}
      {showEditModal && editingCategory && (
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
          <div className="glass-card animate-fade-in" style={{ width: '100%', maxWidth: '440px', padding: '24px', background: T.cardBg, border: `1px solid ${T.borderStrong}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: '800', color: T.txtPrimary, margin: 0 }}>
                Edit Kategori Bahan Baku
              </h3>
              <button onClick={() => setShowEditModal(false)} style={{ background: 'none', border: 'none', color: T.txtSecondary, cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleUpdateCategory} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '0.78rem', color: T.txtSecondary, display: 'block', marginBottom: '6px', fontWeight: '600' }}>
                  Kode Kategori
                </label>
                <div style={{ background: T.cardBg2, border: `1px solid ${T.border}`, padding: '8px 12px', borderRadius: '8px', color: T.info, fontWeight: '800', fontFamily: 'monospace', fontSize: '0.86rem' }}>
                  {editingCategory.code || 'KBHN-001'}
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.78rem', color: T.txtSecondary, display: 'block', marginBottom: '6px', fontWeight: '600' }}>
                  Nama Kategori Bahan *
                </label>
                <input
                  type="text"
                  required
                  value={editingCategory.name}
                  onChange={e => setEditingCategory({ ...editingCategory, name: e.target.value })}
                  className="form-input"
                  style={{ background: T.inputBg, borderColor: T.border, color: T.txtPrimary }}
                  autoFocus
                />
              </div>

              <div>
                <label style={{ fontSize: '0.78rem', color: T.txtSecondary, display: 'block', marginBottom: '6px', fontWeight: '600' }}>
                  Keterangan / Deskripsi
                </label>
                <textarea
                  rows={2}
                  value={editingCategory.description || ''}
                  onChange={e => setEditingCategory({ ...editingCategory, description: e.target.value })}
                  className="form-input"
                  style={{ background: T.inputBg, borderColor: T.border, color: T.txtPrimary, resize: 'vertical' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.78rem', color: T.txtSecondary, display: 'block', marginBottom: '6px', fontWeight: '600' }}>
                  Status
                </label>
                <select
                  value={editingCategory.status || 'Aktif'}
                  onChange={e => setEditingCategory({ ...editingCategory, status: e.target.value })}
                  className="form-select"
                  style={{ background: T.inputBg, borderColor: T.border, color: T.txtPrimary }}
                >
                  <option value="Aktif">Aktif</option>
                  <option value="Non Aktif">Non Aktif</option>
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '10px' }}>
                <button type="button" onClick={() => setShowEditModal(false)} className="btn-secondary" style={{ padding: '7px 14px', fontSize: '0.76rem' }}>
                  Batal
                </button>
                <button type="submit" className="btn-primary" style={{ padding: '7px 16px', fontSize: '0.76rem', fontWeight: '800' }}>
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: DETAIL BAHAN DALAM KATEGORI */}
      {selectedCategoryDetail && (
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
          <div className="glass-card animate-fade-in" style={{ width: '100%', maxWidth: '560px', padding: '24px', background: T.cardBg, border: `1px solid ${T.borderStrong}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: '900', color: T.txtPrimary, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ShoppingBasket size={18} color={T.accentGold} />
                  <span>{selectedCategoryDetail.name}</span>
                </h3>
                <span style={{ fontSize: '0.70rem', color: T.txtSecondary }}>{selectedCategoryDetail.description || 'Daftar bahan baku terhubung'}</span>
              </div>
              <button onClick={() => setSelectedCategoryDetail(null)} style={{ background: 'none', border: 'none', color: T.txtSecondary, cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ maxHeight: '320px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {getAssociatedIngredients(selectedCategoryDetail.name).length === 0 ? (
                <div style={{ padding: '32px', textAlign: 'center', color: T.txtMuted, fontSize: '0.78rem' }}>
                  Belum ada bahan baku yang terhubung dengan kategori ini.
                </div>
              ) : (
                getAssociatedIngredients(selectedCategoryDetail.name).map((ing, iIdx) => (
                  <div key={ing.id || iIdx} style={{ background: T.cardBg2, border: `1px solid ${T.border}`, padding: '10px 12px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: '800', color: T.txtPrimary, fontSize: '0.78rem' }}>{ing.name}</div>
                      <div style={{ fontSize: '0.66rem', color: T.txtSecondary }}>Kode: {ing.code || '-'} • Satuan: {ing.unit || 'Kg'}</div>
                    </div>
                    <span style={{ background: T.infoBg, color: T.info, border: `1px solid ${T.infoBorder}`, padding: '2px 8px', borderRadius: '6px', fontSize: '0.68rem', fontWeight: '700' }}>
                      Stok: {ing.stock || 0} {ing.unit || ''}
                    </span>
                  </div>
                ))
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
              <button onClick={() => setSelectedCategoryDetail(null)} className="btn-secondary" style={{ padding: '6px 14px', fontSize: '0.76rem' }}>
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
