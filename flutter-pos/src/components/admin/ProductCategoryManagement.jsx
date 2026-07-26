import React, { useState } from 'react';
import { Layers, Plus, Search, Edit3, Trash2, CheckCircle2, AlertCircle, Package, X, Eye, FileSpreadsheet } from 'lucide-react';
import MenuAnalyticsDetailModal from './MenuAnalyticsDetailModal';
import CategoryAnalyticsDetailModal from './CategoryAnalyticsDetailModal';
import PaginationControls from './PaginationControls';
import ExcelMasterImportModal from './ExcelMasterImportModal';

export default function ProductCategoryManagement({ masterData, setMasterData }) {
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
      created_at: new Date().toISOString().split('T')[0]
    };

    const updated = {
      ...masterData,
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

    const updated = {
      ...masterData,
      categories: (masterData.categories || []).map(c => c.id === editingCategory.id ? { ...editingCategory } : c)
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
      categories: (masterData.categories || []).filter(c => c.id !== catId)
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }} className="animate-fade-in">
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '800', color: '#f8fafc', letterSpacing: '-0.02em' }}>
            Kategori Menu
          </h2>
          <p style={{ color: '#94a3b8', fontSize: '0.875rem', marginTop: '4px' }}>
            Pengelompokan menu makanan & minuman restoran dengan auto-code dan akumulasi menu terhubung
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button
            onClick={() => setShowExcelImportModal(true)}
            style={{
              background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
              color: '#ffffff',
              border: 'none',
              padding: '8px 14px',
              borderRadius: '8px',
              fontWeight: '700',
              fontSize: '0.78rem',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(2,132,199,0.3)'
            }}
          >
            <FileSpreadsheet size={15} />
            <span>📥 Template & Upload Excel</span>
          </button>

          <button onClick={() => setShowAddModal(true)} className="btn-primary">
            <Plus size={18} />
            <span>Tambahkan Kategori Menu</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
        <div className="glass-card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'rgba(99, 102, 241, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#818cf8' }}>
            <Layers size={22} />
          </div>
          <div>
            <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: '600', textTransform: 'uppercase' }}>TOTAL KATEGORI</span>
            <h3 style={{ fontSize: '1.3rem', fontWeight: '800', color: '#f8fafc', marginTop: '2px' }}>{masterData.categories.length} Kategori</h3>
          </div>
        </div>

        <div className="glass-card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#34d399' }}>
            <CheckCircle2 size={22} />
          </div>
          <div>
            <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: '600', textTransform: 'uppercase' }}>STATUS AKTIF</span>
            <h3 style={{ fontSize: '1.3rem', fontWeight: '800', color: '#34d399', marginTop: '2px' }}>{activeCount} Aktif</h3>
          </div>
        </div>
      </div>

      {/* Search Filter Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ position: 'relative', width: '100%', maxWidth: '380px' }}>
          <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            placeholder="Cari berdasarkan nama atau kode kategori..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="form-input"
            style={{ paddingLeft: '36px' }}
          />
        </div>
      </div>

      {/* Table Section */}
      <div className="glass-card" style={{ padding: '20px' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #334155', color: '#94a3b8', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                <th style={{ padding: '12px' }}>Kode Kategori (Auto)</th>
                <th style={{ padding: '12px' }}>Nama Kategori</th>
                <th style={{ padding: '12px' }}>Menu Terhubung (Klik untuk Detail Analisis)</th>
                <th style={{ padding: '12px' }}>Status</th>
                <th style={{ padding: '12px', textAlign: 'right' }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {paginatedCategories.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
                    Belum ada data kategori menu yang cocok.
                  </td>
                </tr>
              ) : (
                paginatedCategories.map(cat => {
                  const associatedProducts = getAssociatedProducts(cat.id, cat.name);
                  const isAktif = cat.status === 'Aktif';

                  return (
                    <tr key={cat.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', color: '#f8fafc' }}>
                      {/* 1. KODE KATEGORI (Auto Generated) */}
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
                          {cat.code || `CAT-00${cat.id}`}
                        </span>
                      </td>

                      {/* 2. KATEGORI (Klik Nama Kategori -> Papan Informasi Detail Analisis Kategori) */}
                      <td style={{ padding: '14px 12px', fontWeight: '800', fontSize: '0.9rem' }}>
                        <button
                          type="button"
                          onClick={() => setSelectedCategoryDetail(cat)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#c084fc',
                            fontWeight: '900',
                            cursor: 'pointer',
                            padding: 0,
                            textAlign: 'left',
                            fontSize: '0.9rem',
                            textDecoration: 'underline'
                          }}
                          title="Klik untuk melihat papan informasi detail penjualan kuantitas & history transaksi kategori ini"
                        >
                          🏷️ {cat.name}
                        </button>
                      </td>

                      {/* 3. MENU TERHUBUNG (Klik Nama Menu -> Papan Informasi Detail Menu) */}
                      <td style={{ padding: '14px 12px' }}>
                        {associatedProducts.length > 0 ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <span style={{ color: '#38bdf8', fontWeight: '700', fontSize: '0.80rem' }}>
                              📦 {associatedProducts.length} Menu Terhubung
                            </span>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                              {associatedProducts.map(p => (
                                <button
                                  key={p.id}
                                  type="button"
                                  onClick={() => setSelectedMenuDetail(p)}
                                  style={{
                                    background: 'rgba(56, 189, 248, 0.15)',
                                    border: '1px solid rgba(56, 189, 248, 0.35)',
                                    color: '#38bdf8',
                                    borderRadius: '8px',
                                    padding: '3px 9px',
                                    fontSize: '0.74rem',
                                    fontWeight: '800',
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    transition: 'all 0.15s ease'
                                  }}
                                  title="Klik untuk melihat papan informasi detail penjualan menu ini"
                                >
                                  <span>🍽️ {p.name}</span>
                                </button>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <span style={{ color: '#64748b', fontSize: '0.78rem', fontStyle: 'italic' }}>
                            Belum ada menu
                          </span>
                        )}
                      </td>

                      {/* 4. STATUS (Aktif / Inaktif) */}
                      <td style={{ padding: '14px 12px' }}>
                        <span style={{
                          background: isAktif ? 'rgba(16, 185, 129, 0.15)' : 'rgba(244, 63, 94, 0.15)',
                          color: isAktif ? '#34d399' : '#fb7185',
                          border: `1px solid ${isAktif ? 'rgba(16, 185, 129, 0.3)' : 'rgba(244, 63, 94, 0.3)'}`,
                          padding: '4px 10px',
                          borderRadius: '20px',
                          fontSize: '0.75rem',
                          fontWeight: '700',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}>
                          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: isAktif ? '#10b981' : '#f43f5e' }}></span>
                          {cat.status || 'Aktif'}
                        </span>
                      </td>

                      {/* 5. AKSI (Tombol Edit & Delete) */}
                      <td style={{ padding: '14px 12px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                          <button
                            onClick={() => openEditModal(cat)}
                            style={{
                              background: '#334155',
                              color: '#cbd5e1',
                              border: '1px solid rgba(255,255,255,0.1)',
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
                            <Edit3 size={14} color="#818cf8" />
                            <span>Edit</span>
                          </button>

                          <button
                            onClick={() => handleDeleteCategory(cat.id, cat.name)}
                            style={{
                              background: 'rgba(244, 63, 94, 0.15)',
                              color: '#fb7185',
                              border: '1px solid rgba(244, 63, 94, 0.3)',
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
          <div className="glass-card animate-fade-in" style={{ width: '100%', maxWidth: '460px', padding: '24px', background: '#1e293b' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: '800', color: '#f8fafc' }}>
                Tambahkan Kategori Produk
              </h3>
              <button onClick={() => setShowAddModal(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateCategory} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Field 1: Kode Kategori (Auto Generated) */}
              <div>
                <label style={{ fontSize: '0.78rem', color: '#94a3b8', display: 'block', marginBottom: '6px', fontWeight: '600' }}>
                  Kode Kategori Produk (Otomatis)
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
                  <span>{generateNextCategoryCode()}</span>
                  <span style={{ fontSize: '0.7rem', color: '#34d399', background: 'rgba(16,185,129,0.15)', padding: '2px 8px', borderRadius: '6px' }}>
                    Auto Generated
                  </span>
                </div>
              </div>

              {/* Field 2: Nama Kategori (Input Manual) */}
              <div>
                <label style={{ fontSize: '0.78rem', color: '#94a3b8', display: 'block', marginBottom: '6px', fontWeight: '600' }}>
                  Nama Kategori Produk *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Makanan Utama, Minuman Cold Brew..."
                  value={newCatName}
                  onChange={e => setNewCatName(e.target.value)}
                  className="form-input"
                  autoFocus
                />
              </div>

              {/* Field 3: Status (Aktif / Inaktif) */}
              <div>
                <label style={{ fontSize: '0.78rem', color: '#94a3b8', display: 'block', marginBottom: '6px', fontWeight: '600' }}>
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
                      borderColor: newCatStatus === 'Aktif' ? '#10b981' : '#334155',
                      background: newCatStatus === 'Aktif' ? 'rgba(16, 185, 129, 0.2)' : '#0f172a',
                      color: newCatStatus === 'Aktif' ? '#34d399' : '#94a3b8',
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
                      borderColor: newCatStatus === 'Inaktif' ? '#f43f5e' : '#334155',
                      background: newCatStatus === 'Inaktif' ? 'rgba(244, 63, 94, 0.2)' : '#0f172a',
                      color: newCatStatus === 'Inaktif' ? '#fb7185' : '#94a3b8',
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
                <button type="button" onClick={() => setShowAddModal(false)} className="btn-secondary" style={{ flex: 1, justifyContent: 'center' }}>
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
          <div className="glass-card animate-fade-in" style={{ width: '100%', maxWidth: '460px', padding: '24px', background: '#1e293b' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: '800', color: '#f8fafc' }}>
                Edit Kategori Produk
              </h3>
              <button onClick={() => setShowEditModal(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleUpdateCategory} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Field 1: Kode Kategori (Read Only) */}
              <div>
                <label style={{ fontSize: '0.78rem', color: '#94a3b8', display: 'block', marginBottom: '6px', fontWeight: '600' }}>
                  Kode Kategori Produk
                </label>
                <input
                  type="text"
                  readOnly
                  value={editingCategory.code || `CAT-00${editingCategory.id}`}
                  className="form-input"
                  style={{ color: '#818cf8', fontWeight: '800', fontFamily: 'monospace' }}
                />
              </div>

              {/* Field 2: Nama Kategori */}
              <div>
                <label style={{ fontSize: '0.78rem', color: '#94a3b8', display: 'block', marginBottom: '6px', fontWeight: '600' }}>
                  Nama Kategori Produk *
                </label>
                <input
                  type="text"
                  required
                  value={editingCategory.name}
                  onChange={e => setEditingCategory({ ...editingCategory, name: e.target.value })}
                  className="form-input"
                />
              </div>

              {/* Field 3: Status */}
              <div>
                <label style={{ fontSize: '0.78rem', color: '#94a3b8', display: 'block', marginBottom: '6px', fontWeight: '600' }}>
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
                      borderColor: editingCategory.status === 'Aktif' ? '#10b981' : '#334155',
                      background: editingCategory.status === 'Aktif' ? 'rgba(16, 185, 129, 0.2)' : '#0f172a',
                      color: editingCategory.status === 'Aktif' ? '#34d399' : '#94a3b8',
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
                      borderColor: editingCategory.status === 'Inaktif' ? '#f43f5e' : '#334155',
                      background: editingCategory.status === 'Inaktif' ? 'rgba(244, 63, 94, 0.2)' : '#0f172a',
                      color: editingCategory.status === 'Inaktif' ? '#fb7185' : '#94a3b8',
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
                <button type="button" onClick={() => setShowEditModal(false)} className="btn-secondary" style={{ flex: 1, justifyContent: 'center' }}>
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
        />
      )}

      {/* PAPAN INFORMASI DETAIL KATEGORI ANALYTICS MODAL */}
      {selectedCategoryDetail && (
        <CategoryAnalyticsDetailModal
          category={selectedCategoryDetail}
          masterData={masterData}
          onClose={() => setSelectedCategoryDetail(null)}
        />
      )}

      {/* EXCEL IMPORT MODAL */}
      <ExcelMasterImportModal
        isOpen={showExcelImportModal}
        onClose={() => setShowExcelImportModal(false)}
        moduleType="categories"
        masterData={masterData}
        setMasterData={setMasterData}
      />
    </div>
  );
}
