import React, { useState } from 'react';
import { Layers, Plus, Search, Edit3, Trash2, CheckCircle2, AlertCircle, Package, X, Eye, FileSpreadsheet } from 'lucide-react';
import MenuAnalyticsDetailModal from './MenuAnalyticsDetailModal';
import CategoryAnalyticsDetailModal from './CategoryAnalyticsDetailModal';
import PaginationControls from './PaginationControls';
import ExcelMasterImportModal from './ExcelMasterImportModal';
import { getThemePalette } from '../../utils/themeUtils';

export default function ProductCategoryManagement({ masterData, setMasterData, themeMode = 'dark' }) {
  const T = getThemePalette(themeMode);

  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showExcelImportModal, setShowExcelImportModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [selectedMenuDetail, setSelectedMenuDetail] = useState(null);
  const [selectedCategoryDetail, setSelectedCategoryDetail] = useState(null);

  // Pagination States (Default 25 rows per page)
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Form states for Add Category
  const [newCatName, setNewCatName] = useState('');
  const [newCatStatus, setNewCatStatus] = useState('Aktif');

  // Helper to generate next auto code (e.g. CAT-001, CAT-002)
  const generateNextCategoryCode = () => {
    const existingCodes = masterData.categories
      .map(c => c.code)
      .filter(code => code && code.startsWith('CAT-'));
    
    if (existingCodes.length === 0) return 'CAT-001';

    const numbers = existingCodes.map(code => {
      const numPart = code.replace('CAT-', '');
      return parseInt(numPart, 10) || 0;
    });

    const maxNum = Math.max(...numbers, 0);
    const nextNum = maxNum + 1;
    return `CAT-${nextNum.toString().padStart(3, '0')}`;
  };

  // Helper to get connected products accumulation
  const getAssociatedProducts = (catId, catName) => {
    return masterData.products.filter(p => p.category_id === catId || p.category_name === catName);
  };

  // Handle Create Category
  const handleCreateCategory = (e) => {
    e.preventDefault();
    if (!newCatName.trim()) return;

    const autoCode = generateNextCategoryCode();
    const newCategory = {
      id: Date.now(),
      code: autoCode,
      name: newCatName.trim(),
      status: newCatStatus,
      created_at: new Date().toISOString().split('T')[0],
      _updatedAt: Date.now()
    };

    const updated = {
      ...masterData,
      _lastUpdated: Date.now(),
      categories: [...(masterData.categories || []), newCategory]
    };
    setMasterData(updated);

    setShowAddModal(false);
    setNewCatName('');
    setNewCatStatus('Aktif');
  };

  // Open Edit Modal
  const openEditModal = (cat) => {
    setEditingCategory(cat);
    setShowEditModal(true);
  };

  // Handle Edit Category
  const handleUpdateCategory = (e) => {
    e.preventDefault();
    if (!editingCategory || !editingCategory.name.trim()) return;

    const updatedCatObj = {
      ...editingCategory,
      name: editingCategory.name.trim(),
      _updatedAt: Date.now()
    };

    const updatedCategories = (masterData.categories || []).map(c => 
      String(c.id) === String(editingCategory.id) ? updatedCatObj : c
    );

    // Sync category_name to all associated products
    const updatedProducts = (masterData.products || []).map(p => {
      if (String(p.category_id) === String(editingCategory.id)) {
        return {
          ...p,
          category_name: updatedCatObj.name,
          category: updatedCatObj.name,
          _updatedAt: Date.now()
        };
      }
      return p;
    });

    const updated = {
      ...masterData,
      _lastUpdated: Date.now(),
      categories: updatedCategories,
      products: updatedProducts
    };
    setMasterData(updated);

    setShowEditModal(false);
    setEditingCategory(null);
  };

  // Handle Delete Category
  const handleDeleteCategory = (catId, catName) => {
    const associatedCount = getAssociatedProducts(catId, catName).length;
    if (associatedCount > 0) {
      if (!window.confirm(`Kategori "${catName}" memiliki ${associatedCount} menu terhubung. Apakah Anda yakin ingin menghapusnya?`)) {
        return;
      }
    } else {
      if (!window.confirm(`Apakah Anda yakin ingin menghapus kategori "${catName}"?`)) {
        return;
      }
    }

    const updated = {
      ...masterData,
      _lastUpdated: Date.now(),
      categories: (masterData.categories || []).filter(c => c.id !== catId),
      // Track deleted IDs so server-sync polling won't restore them
      deletedCategoriesIds: [
        ...(masterData.deletedCategoriesIds || []),
        String(catId)
      ]
    };
    setMasterData(updated);
  };

  const filteredCategories = masterData.categories.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.code && c.code.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const activeCount = masterData.categories.filter(c => c.status === 'Aktif').length;

  // Pagination calculation
  const totalItems = filteredCategories.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const paginatedCategories = filteredCategories.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }} className="animate-fade-in">
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '0.96rem', fontWeight: '900', color: T.txtPrimary, letterSpacing: '-0.01em', margin: 0 }}>
            Kategori Menu
          </h2>
          <p style={{ color: T.txtSecondary, fontSize: '0.72rem', marginTop: '2px', margin: 0 }}>
            Pengelompokan menu makanan & minuman restoran dengan auto-code dan akumulasi menu terhubung
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button
            onClick={() => setShowExcelImportModal(true)}
            style={{
              background: T.info,
              color: '#ffffff',
              border: 'none',
              padding: '6px 12px',
              borderRadius: '8px',
              fontWeight: '700',
              fontSize: '0.72rem',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
              boxShadow: T.shadowSm
            }}
          >
            <FileSpreadsheet size={14} />
            <span>Template & Upload Excel</span>
          </button>

          <button onClick={() => setShowAddModal(true)} className="btn-primary" style={{ padding: '6px 12px', fontSize: '0.72rem' }}>
            <Plus size={15} />
            <span>Tambahkan Kategori Menu</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
        <div className="glass-card" style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '12px', background: T.cardBg, border: `1px solid ${T.border}` }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: T.infoBg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.info }}>
            <Layers size={18} />
          </div>
          <div>
            <div style={{ fontSize: '0.70rem', color: T.txtSecondary, fontWeight: '700' }}>Total Kategori</div>
            <div style={{ fontSize: '1.05rem', fontWeight: '900', color: T.txtPrimary }}>{masterData.categories.length}</div>
          </div>
        </div>

        <div className="glass-card" style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '12px', background: T.cardBg, border: `1px solid ${T.border}` }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: T.successBg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.success }}>
            <CheckCircle2 size={18} />
          </div>
          <div>
            <div style={{ fontSize: '0.70rem', color: T.txtSecondary, fontWeight: '700' }}>Kategori Aktif</div>
            <div style={{ fontSize: '1.05rem', fontWeight: '900', color: T.success }}>{activeCount}</div>
          </div>
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
          style={{ paddingLeft: '34px', background: T.inputBg, border: `1px solid ${T.border}`, color: T.txtPrimary, fontSize: '0.76rem', height: '34px' }}
        />
      </div>

      {/* Table Section */}
      <div className="glass-card" style={{ padding: '16px', background: T.cardBg, border: `1px solid ${T.border}` }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.76rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)', color: T.txtSecondary, background: T.tableHeaderBg, fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: '800' }}>
                <th style={{ padding: '10px 10px' }}>Kode Kategori (Auto)</th>
                <th style={{ padding: '10px 10px' }}>Nama Kategori</th>
                <th style={{ padding: '10px 10px' }}>Menu Terhubung</th>
                <th style={{ padding: '10px 10px' }}>Status</th>
                <th style={{ padding: '10px 10px', textAlign: 'right' }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {paginatedCategories.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: '36px', textAlign: 'center', color: T.txtMuted, fontSize: '0.76rem' }}>
                    Belum ada data kategori menu yang cocok.
                  </td>
                </tr>
              ) : (
                paginatedCategories.map(cat => {
                  const associatedProducts = getAssociatedProducts(cat.id, cat.name);
                  const isAktif = cat.status === 'Aktif';
                  const cleanCatName = (cat.name || '').replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, '').trim();

                  return (
                    <tr key={cat.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)', color: T.txtPrimary }}>
                      {/* 1. KODE KATEGORI (Auto Generated) */}
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
                          {cat.code || `CAT-00${cat.id}`}
                        </span>
                      </td>

                      {/* 2. KATEGORI */}
                      <td style={{ padding: '8px 10px', fontWeight: '800', fontSize: '0.76rem' }}>
                        <button
                          type="button"
                          onClick={() => setSelectedCategoryDetail(cat)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: T.accentGold,
                            fontWeight: '800',
                            cursor: 'pointer',
                            padding: 0,
                            textAlign: 'left',
                            fontSize: '0.76rem',
                            textDecoration: 'underline'
                          }}
                          title="Klik untuk melihat papan informasi detail penjualan kuantitas & history transaksi kategori ini"
                        >
                          {cleanCatName}
                        </button>
                      </td>

                      {/* 3. MENU TERHUBUNG */}
                      <td style={{ padding: '8px 10px' }}>
                        {associatedProducts.length > 0 ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <span style={{ color: T.info, fontWeight: '700', fontSize: '0.68rem' }}>
                              {associatedProducts.length} Menu Terhubung
                            </span>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                              {associatedProducts.map(p => {
                                const cleanPName = (p.name || '').replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, '').trim();
                                return (
                                  <button
                                    key={p.id}
                                    type="button"
                                    onClick={() => setSelectedMenuDetail(p)}
                                    style={{
                                      background: T.infoBg,
                                      border: `1px solid ${T.infoBorder}`,
                                      color: T.info,
                                      borderRadius: '6px',
                                      padding: '2px 6px',
                                      fontSize: '0.68rem',
                                      fontWeight: '700',
                                      cursor: 'pointer',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '4px'
                                    }}
                                    title="Klik untuk melihat papan informasi detail penjualan menu ini"
                                  >
                                    <span>{cleanPName}</span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        ) : (
                          <span style={{ color: T.txtMuted, fontSize: '0.68rem', fontStyle: 'italic' }}>
                            Belum ada menu
                          </span>
                        )}
                      </td>

                      {/* 4. STATUS (Aktif / Inaktif) */}
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
                          ● {isAktif ? 'Aktif' : 'Non Aktif'}
                        </span>
                      </td>

                      {/* 5. AKSI (Tombol Edit & Delete) */}
                      <td style={{ padding: '14px 12px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                          <button
                            onClick={() => openEditModal(cat)}
                            style={{
                              background: T.cardBg2,
                              color: T.txtPrimary,
                              border: `1px solid ${T.border}`,
                              padding: '6px 12px',
                              borderRadius: '8px',
                              fontSize: '0.75rem',
                              fontWeight: '600',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              transition: 'all 0.2s ease'
                            }}
                          >
                            <Edit3 size={14} color={T.info} />
                            <span>Edit</span>
                          </button>

                          <button
                            onClick={() => handleDeleteCategory(cat.id, cat.name)}
                            style={{
                              background: T.dangerBg,
                              color: T.danger,
                              border: `1px solid ${T.dangerBorder}`,
                              padding: '6px 12px',
                              borderRadius: '8px',
                              fontSize: '0.75rem',
                              fontWeight: '600',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              transition: 'all 0.2s ease'
                            }}
                          >
                            <Trash2 size={14} />
                            <span>Delete</span>
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

      {/* MODAL 1: TAMBAH KATEGORI PRODUK */}
      {showAddModal && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.7)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100
        }}>
          <div className="glass-card animate-fade-in" style={{ width: '100%', maxWidth: '460px', padding: '24px', background: T.cardBg, border: `1px solid ${T.border}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: '800', color: T.txtPrimary }}>
                Tambahkan Kategori Produk
              </h3>
              <button onClick={() => setShowAddModal(false)} style={{ background: 'none', border: 'none', color: T.txtMuted, cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateCategory} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Field 1: Kode Kategori (Auto Generated) */}
              <div>
                <label style={{ fontSize: '0.78rem', color: T.txtSecondary, display: 'block', marginBottom: '6px', fontWeight: '600' }}>
                  Kode Kategori Produk (Otomatis)
                </label>
                <div style={{
                  background: T.cardBg2,
                  border: `1px solid ${T.border}`,
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
                  <span>{generateNextCategoryCode()}</span>
                  <span style={{ fontSize: '0.7rem', color: T.success, background: T.successBg, border: `1px solid ${T.successBorder}`, padding: '2px 8px', borderRadius: '6px' }}>
                    Auto Generated
                  </span>
                </div>
              </div>

              {/* Field 2: Nama Kategori (Input Manual) */}
              <div>
                <label style={{ fontSize: '0.78rem', color: T.txtSecondary, display: 'block', marginBottom: '6px', fontWeight: '600' }}>
                  Nama Kategori Produk *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Makanan Utama, Minuman Cold Brew..."
                  value={newCatName}
                  onChange={e => setNewCatName(e.target.value)}
                  className="form-input"
                  style={{ background: T.inputBg, border: `1px solid ${T.border}`, color: T.txtPrimary }}
                  autoFocus
                />
              </div>

              {/* Field 3: Status (Aktif / Inaktif) */}
              <div>
                <label style={{ fontSize: '0.78rem', color: T.txtSecondary, display: 'block', marginBottom: '6px', fontWeight: '600' }}>
                  Status Kategori
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={() => setNewCatStatus('Aktif')}
                    style={{
                      padding: '10px',
                      borderRadius: '10px',
                      border: '1px solid',
                      borderColor: newCatStatus === 'Aktif' ? T.success : T.border,
                      background: newCatStatus === 'Aktif' ? T.successBg : T.cardBg2,
                      color: newCatStatus === 'Aktif' ? T.success : T.txtMuted,
                      fontWeight: '700',
                      fontSize: '0.85rem',
                      cursor: 'pointer'
                    }}
                  >
                    ● Aktif
                  </button>

                  <button
                    type="button"
                    onClick={() => setNewCatStatus('Inaktif')}
                    style={{
                      padding: '10px',
                      borderRadius: '10px',
                      border: '1px solid',
                      borderColor: newCatStatus === 'Inaktif' ? T.danger : T.border,
                      background: newCatStatus === 'Inaktif' ? T.dangerBg : T.cardBg2,
                      color: newCatStatus === 'Inaktif' ? T.danger : T.txtMuted,
                      fontWeight: '700',
                      fontSize: '0.85rem',
                      cursor: 'pointer'
                    }}
                  >
                    ● Inaktif
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                <button type="button" onClick={() => setShowAddModal(false)} className="btn-secondary" style={{ flex: 1, justifyContent: 'center', background: T.cardBg2, color: T.txtPrimary, border: `1px solid ${T.border}` }}>
                  Batal
                </button>
                <button type="submit" className="btn-primary" style={{ flex: 1, justifyContent: 'center' }}>
                  Simpan Kategori
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: EDIT KATEGORI PRODUK */}
      {showEditModal && editingCategory && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.7)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100
        }}>
          <div className="glass-card animate-fade-in" style={{ width: '100%', maxWidth: '460px', padding: '24px', background: T.cardBg, border: `1px solid ${T.border}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: '800', color: T.txtPrimary }}>
                Edit Kategori Produk
              </h3>
              <button onClick={() => setShowEditModal(false)} style={{ background: 'none', border: 'none', color: T.txtMuted, cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleUpdateCategory} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Field 1: Kode Kategori (Read Only) */}
              <div>
                <label style={{ fontSize: '0.78rem', color: T.txtSecondary, display: 'block', marginBottom: '6px', fontWeight: '600' }}>
                  Kode Kategori Produk
                </label>
                <input
                  type="text"
                  readOnly
                  value={editingCategory.code || `CAT-00${editingCategory.id}`}
                  className="form-input"
                  style={{ color: T.info, fontWeight: '800', fontFamily: 'monospace', background: T.cardBg2, border: `1px solid ${T.border}` }}
                />
              </div>

              {/* Field 2: Nama Kategori */}
              <div>
                <label style={{ fontSize: '0.78rem', color: T.txtSecondary, display: 'block', marginBottom: '6px', fontWeight: '600' }}>
                  Nama Kategori Produk *
                </label>
                <input
                  type="text"
                  required
                  value={editingCategory.name}
                  onChange={e => setEditingCategory({ ...editingCategory, name: e.target.value })}
                  className="form-input"
                  style={{ background: T.inputBg, border: `1px solid ${T.border}`, color: T.txtPrimary }}
                />
              </div>

              {/* Field 3: Status */}
              <div>
                <label style={{ fontSize: '0.78rem', color: T.txtSecondary, display: 'block', marginBottom: '6px', fontWeight: '600' }}>
                  Status Kategori
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={() => setEditingCategory({ ...editingCategory, status: 'Aktif' })}
                    style={{
                      padding: '10px',
                      borderRadius: '10px',
                      border: '1px solid',
                      borderColor: editingCategory.status === 'Aktif' ? T.success : T.border,
                      background: editingCategory.status === 'Aktif' ? T.successBg : T.cardBg2,
                      color: editingCategory.status === 'Aktif' ? T.success : T.txtMuted,
                      fontWeight: '700',
                      fontSize: '0.85rem',
                      cursor: 'pointer'
                    }}
                  >
                    ● Aktif
                  </button>

                  <button
                    type="button"
                    onClick={() => setEditingCategory({ ...editingCategory, status: 'Inaktif' })}
                    style={{
                      padding: '10px',
                      borderRadius: '10px',
                      border: '1px solid',
                      borderColor: editingCategory.status === 'Inaktif' ? T.danger : T.border,
                      background: editingCategory.status === 'Inaktif' ? T.dangerBg : T.cardBg2,
                      color: editingCategory.status === 'Inaktif' ? T.danger : T.txtMuted,
                      fontWeight: '700',
                      fontSize: '0.85rem',
                      cursor: 'pointer'
                    }}
                  >
                    ● Inaktif
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                <button type="button" onClick={() => setShowEditModal(false)} className="btn-secondary" style={{ flex: 1, justifyContent: 'center', background: T.cardBg2, color: T.txtPrimary, border: `1px solid ${T.border}` }}>
                  Batal
                </button>
                <button type="submit" className="btn-primary" style={{ flex: 1, justifyContent: 'center' }}>
                  Perbarui Kategori
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PAPAN INFORMASI DETAIL MENU ANALYTICS MODAL */}
      {selectedMenuDetail && (
        <MenuAnalyticsDetailModal
          menuItem={selectedMenuDetail}
          masterData={masterData}
          onClose={() => setSelectedMenuDetail(null)}
          themeMode={themeMode}
        />
      )}

      {/* PAPAN INFORMASI DETAIL KATEGORI ANALYTICS MODAL */}
      {selectedCategoryDetail && (
        <CategoryAnalyticsDetailModal
          category={selectedCategoryDetail}
          masterData={masterData}
          onClose={() => setSelectedCategoryDetail(null)}
          themeMode={themeMode}
        />
      )}

      {/* EXCEL IMPORT MODAL */}
      <ExcelMasterImportModal
        isOpen={showExcelImportModal}
        onClose={() => setShowExcelImportModal(false)}
        moduleType="categories"
        masterData={masterData}
        setMasterData={setMasterData}
        themeMode={themeMode}
      />
    </div>
  );
}
