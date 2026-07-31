import React, { useState } from 'react';
import { ShoppingBasket, Plus, Search, Trash2, Edit3, X, CheckCircle2, AlertTriangle, Eye, ArrowLeft, ShieldCheck, FileSpreadsheet } from 'lucide-react';
import IngredientAnalyticsDetailModal from './IngredientAnalyticsDetailModal';
import PaginationControls from './PaginationControls';
import ExcelMasterImportModal from './ExcelMasterImportModal';

export default function IngredientsManagement({ masterData, setMasterData }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddFormModal, setShowAddFormModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showExcelImportModal, setShowExcelImportModal] = useState(false);
  const [selectedIngredientDetail, setSelectedIngredientDetail] = useState(null);

  // Pagination States (Default 25 rows per page)
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const [editingIngredientId, setEditingIngredientId] = useState(null);
  const [previewItemData, setPreviewItemData] = useState(null);

  // Form states
  const [ingName, setIngName] = useState('');
  const [ingStatus, setIngStatus] = useState('Aktif');
  const [ingUnit, setIngUnit] = useState('Gram');
  const [ingStock, setIngStock] = useState('1000');
  const [ingMinStock, setIngMinStock] = useState('500');

  // Helper to generate next sequential ingredient code (e.g. BHN-001, BHN-002)
  const generateNextIngredientCode = () => {
    const existingCodes = (masterData.ingredients || [])
      .map(i => i.code)
      .filter(code => code && code.startsWith('BHN-'));

    if (existingCodes.length === 0) return 'BHN-001';

    const numbers = existingCodes.map(code => {
      const numPart = code.replace('BHN-', '');
      return parseInt(numPart, 10) || 0;
    });

    const maxNum = Math.max(...numbers, 0);
    const nextNum = maxNum + 1;
    return `BHN-${nextNum.toString().padStart(3, '0')}`;
  };

  // Open Add Form Modal
  const handleOpenAddForm = () => {
    setEditingIngredientId(null);
    setIngName('');
    setIngStatus('Aktif');
    setIngUnit(masterData.units?.[0]?.symbol || 'Gram');
    setIngStock('1000');
    setIngMinStock('500');
    setShowAddFormModal(true);
  };

  // Open Edit Form Modal (With Null-Safety)
  const handleOpenEditForm = (item) => {
    if (!item) return;
    setEditingIngredientId(item.id);
    setIngName(item.name || '');
    setIngStatus(item.status || 'Aktif');
    setIngUnit(item.unit || (masterData.units?.[0]?.symbol || 'Gram'));
    setIngStock(item.stock !== undefined && item.stock !== null ? String(item.stock) : '1000');
    setIngMinStock(item.min_stock !== undefined && item.min_stock !== null ? String(item.min_stock) : '500');
    setShowAddFormModal(true);
  };

  // Open Standalone Preview Modal from Table
  const handleOpenPreviewOnly = (item) => {
    setPreviewItemData(item);
    setShowPreviewModal(true);
  };

  // Proceed to Preview Modal from Form
  const handleProceedToPreview = (e) => {
    e.preventDefault();
    if (!ingName.trim()) {
      alert('Mohon isi Nama Bahan Baku');
      return;
    }

    const code = editingIngredientId
      ? masterData.ingredients.find(i => i.id === editingIngredientId)?.code || generateNextIngredientCode()
      : generateNextIngredientCode();

    const payload = {
      id: editingIngredientId || Date.now(),
      code,
      name: ingName.trim(),
      unit: ingUnit,
      stock: parseFloat(ingStock) || 0,
      min_stock: parseFloat(ingMinStock) || 500,
      status: ingStatus,
      financial_account: 'Harga Pokok Produksi (HPP/COGS)'
    };

    setPreviewItemData(payload);
    setShowAddFormModal(false);
    setShowPreviewModal(true);
  };

  // Direct Save Ingredient from Form
  const handleDirectSaveIngredient = (e) => {
    if (e) e.preventDefault();
    if (!ingName.trim()) {
      alert('Mohon isi Nama Bahan Baku');
      return;
    }

    const code = editingIngredientId
      ? masterData.ingredients.find(i => i.id === editingIngredientId)?.code || generateNextIngredientCode()
      : generateNextIngredientCode();

    const payload = {
      id: editingIngredientId || Date.now(),
      code,
      name: ingName.trim(),
      unit: ingUnit,
      stock: parseFloat(ingStock) || 0,
      min_stock: parseFloat(ingMinStock) || 500,
      status: ingStatus,
      financial_account: 'Harga Pokok Produksi (HPP/COGS)'
    };

    const updated = { ...masterData };
    if (!updated.ingredients) updated.ingredients = [];

    if (editingIngredientId) {
      const idx = updated.ingredients.findIndex(i => i.id === editingIngredientId);
      if (idx !== -1) updated.ingredients[idx] = payload;
      else updated.ingredients.unshift(payload);
    } else {
      updated.ingredients.unshift(payload);
    }

    setMasterData(updated);
    setShowAddFormModal(false);
    setEditingIngredientId(null);
  };

  // Final Save Ingredient
  const handleFinalSaveIngredient = () => {
    if (!previewItemData) return;

    const updated = { ...masterData };
    if (!updated.ingredients) updated.ingredients = [];

    if (editingIngredientId) {
      const idx = updated.ingredients.findIndex(i => i.id === editingIngredientId);
      if (idx !== -1) updated.ingredients[idx] = previewItemData;
    } else {
      updated.ingredients.unshift(previewItemData);
    }

    setMasterData(updated);
    setShowPreviewModal(false);
    setPreviewItemData(null);
    setEditingIngredientId(null);
  };

  // Delete Ingredient
  const handleDeleteIngredient = (id, name) => {
    if (window.confirm(`Apakah Anda yakin ingin menghapus bahan baku "${name}"?`)) {
      const updated = {
        ...masterData,
        _lastUpdated: Date.now(),
        ingredients: (masterData.ingredients || []).filter(i => String(i.id) !== String(id))
      };
      setMasterData(updated);
    }
  };

  const ingredientsList = masterData.ingredients || [];
  const filtered = ingredientsList.filter(i => 
    i.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (i.code && i.code.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Pagination calculation
  const totalItems = filtered.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const paginatedIngredients = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }} className="animate-fade-in">
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '800', color: '#f8fafc', letterSpacing: '-0.02em' }}>
            Data Bahan Baku (Ingredients Master)
          </h2>
          <p style={{ color: '#94a3b8', fontSize: '0.875rem', marginTop: '4px' }}>
            Kelola master bahan baku dapur, batas stok kritis, dan pengelompokan akun Harga Pokok Produksi (HPP)
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

          <button onClick={handleOpenAddForm} className="btn-primary">
            <Plus size={18} />
            <span>Tambahkan Bahan Baku</span>
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div style={{ position: 'relative', maxWidth: '380px' }}>
        <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
        <input
          type="text"
          placeholder="Cari berdasarkan nama atau kode bahan baku..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="form-input"
          style={{ paddingLeft: '36px' }}
        />
      </div>

      {/* Table Management */}
      <div className="glass-card" style={{ padding: '20px' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #334155', color: '#94a3b8', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                <th style={{ padding: '12px' }}>Kode Bahan (Auto)</th>
                <th style={{ padding: '12px' }}>Nama Bahan Baku</th>
                <th style={{ padding: '12px' }}>Satuan Unit</th>
                <th style={{ padding: '12px' }}>Status</th>
                <th style={{ padding: '12px', textAlign: 'right' }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {paginatedIngredients.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
                    Belum ada data bahan baku yang cocok.
                  </td>
                </tr>
              ) : (
                paginatedIngredients.map(ing => {
                  const isAktif = (ing.status || 'Aktif') === 'Aktif';

                  return (
                    <tr key={ing.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', color: '#f8fafc' }}>
                      {/* 1. KODE BAHAN (Auto) */}
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
                          {ing.code || `BHN-00${ing.id}`}
                        </span>
                      </td>

                      {/* 2. NAMA BAHAN BAKU (Klik untuk Papan Informasi Detail Analisis & Resep Menu) */}
                      <td style={{ padding: '14px 12px', fontWeight: '800', fontSize: '0.88rem' }}>
                        <button
                          type="button"
                          onClick={() => setSelectedIngredientDetail(ing)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#34d399',
                            fontWeight: '900',
                            cursor: 'pointer',
                            padding: 0,
                            textAlign: 'left',
                            fontSize: '0.88rem',
                            textDecoration: 'underline'
                          }}
                          title="Klik untuk melihat papan informasi detail resep menu terhubung, kuantitas terpakai & history penjualan"
                        >
                          🥦 {ing.name}
                        </button>
                      </td>

                      {/* 3. SATUAN UNIT */}
                      <td style={{ padding: '14px 12px', color: '#cbd5e1' }}>
                        <span style={{ background: '#0f172a', padding: '4px 8px', borderRadius: '6px', border: '1px solid #334155', fontSize: '0.78rem' }}>
                          {ing.unit}
                        </span>
                      </td>

                      {/* 4. STATUS */}
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
                          ● {isAktif ? 'Aktif' : 'Non Aktif'}
                        </span>
                      </td>

                      {/* 5. AKSI (Edit, Preview, Delete) */}
                      <td style={{ padding: '14px 12px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                          <button
                            onClick={() => handleOpenPreviewOnly(ing)}
                            title="Pratinjau Bahan"
                            style={{
                              background: 'rgba(56, 189, 248, 0.15)',
                              color: '#38bdf8',
                              border: '1px solid rgba(56, 189, 248, 0.3)',
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
                            <Eye size={14} />
                            <span>Preview</span>
                          </button>

                          <button
                            onClick={() => handleOpenEditForm(ing)}
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
                            onClick={() => handleDeleteIngredient(ing.id, ing.name)}
                            style={{
                              background: 'rgba(244, 63, 94, 0.15)',
                              color: '#fb7185',
                              border: '1px solid rgba(244, 63, 94, 0.3)',
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


      {/* FORM MODAL: TAMBAH / EDIT BAHAN BAKU */}
      {showAddFormModal && (
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
          <div className="glass-card animate-fade-in" style={{ width: '100%', maxWidth: '500px', padding: '24px', background: '#1e293b' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: '800', color: '#f8fafc' }}>
                {editingIngredientId ? 'Edit Data Bahan Baku' : 'Tambahkan Bahan Baku'}
              </h3>
              <button onClick={() => setShowAddFormModal(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleProceedToPreview} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Field 1: Kode Bahan Baku (Auto Generated) */}
              <div>
                <label style={{ fontSize: '0.78rem', color: '#94a3b8', display: 'block', marginBottom: '6px', fontWeight: '600' }}>
                  Kode Bahan Baku (Otomatis)
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
                  <span>{editingIngredientId ? (masterData.ingredients.find(i => i.id === editingIngredientId)?.code || 'BHN-001') : generateNextIngredientCode()}</span>
                  <span style={{ fontSize: '0.7rem', color: '#34d399', background: 'rgba(16,185,129,0.15)', padding: '2px 8px', borderRadius: '6px' }}>
                    Auto Generated
                  </span>
                </div>
              </div>

              {/* Field 2: Nama Bahan Baku */}
              <div>
                <label style={{ fontSize: '0.78rem', color: '#94a3b8', display: 'block', marginBottom: '6px', fontWeight: '600' }}>
                  Nama Bahan Baku *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Daging Ayam Segar, Cabai Rawit Merah"
                  value={ingName}
                  onChange={e => setIngName(e.target.value)}
                  className="form-input"
                  autoFocus
                />
              </div>

              {/* Field 3 & 4: Satuan Unit & Batas Minimal Stok */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.78rem', color: '#94a3b8', display: 'block', marginBottom: '6px', fontWeight: '600' }}>
                    Satuan Unit (Dari Satuan/Unit)
                  </label>
                  <select value={ingUnit} onChange={e => setIngUnit(e.target.value)} className="form-select">
                    {masterData.units.map(u => (
                      <option key={u.id} value={u.symbol}>
                        {u.name} ({u.symbol})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '0.78rem', color: '#94a3b8', display: 'block', marginBottom: '6px', fontWeight: '600' }}>
                    Batas Minimal Stok (Alert)
                  </label>
                  <input
                    type="number"
                    value={ingMinStock}
                    onChange={e => setIngMinStock(e.target.value)}
                    className="form-input"
                    placeholder="500"
                  />
                </div>
              </div>

              {/* Field 5: Tampilkan di APK */}
              <div>
                <label style={{ fontSize: '0.78rem', color: '#94a3b8', display: 'block', marginBottom: '6px', fontWeight: '600' }}>
                  Tampilkan di APK
                </label>
                <select value={ingStatus} onChange={e => setIngStatus(e.target.value)} className="form-select">
                  <option value="Aktif">Aktif</option>
                  <option value="Inaktif">Inaktif</option>
                </select>
              </div>

              {/* Field 6: Keterangan Akun HPP */}
              <div style={{ background: '#0f172a', padding: '12px', borderRadius: '10px', border: '1px solid #334155', fontSize: '0.78rem', color: '#818cf8', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShieldCheck size={18} />
                <span>Terhubung otomatis dengan Akun <strong>Harga Pokok Produksi (HPP/COGS)</strong> Laporan Laba Rugi</span>
              </div>

              {/* Field 7: Tombol Preview & Simpan */}
              <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                <button type="button" onClick={() => setShowAddFormModal(false)} className="btn-secondary" style={{ padding: '8px 12px' }}>
                  Batal
                </button>

                <button type="button" onClick={handleProceedToPreview} className="btn-secondary" style={{ flex: 1, justifyContent: 'center', borderColor: '#38bdf8', color: '#38bdf8' }}>
                  <Eye size={15} />
                  <span>Preview Dulu</span>
                </button>

                <button type="submit" onClick={handleDirectSaveIngredient} className="btn-emerald" style={{ flex: 1, justifyContent: 'center' }}>
                  <CheckCircle2 size={15} />
                  <span>{editingIngredientId ? 'Simpan Perubahan' : 'Simpan Bahan Baku'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PREVIEW MODAL SEBELUM SIMPAN / PREVIEW VIEW */}
      {showPreviewModal && previewItemData && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.8)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 110
        }}>
          <div className="glass-card animate-fade-in" style={{ width: '100%', maxWidth: '520px', padding: '28px', background: '#1e293b', border: '1px solid #10b981' }}>
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(16,185,129,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px auto', color: '#34d399' }}>
                <Eye size={24} />
              </div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: '800', color: '#f8fafc' }}>
                Pratinjau Bahan Baku (Preview)
              </h3>
              <p style={{ fontSize: '0.78rem', color: '#94a3b8' }}>Rincian informasi bahan baku dan pemetaan akun HPP</p>
            </div>

            <div style={{ background: '#0f172a', padding: '18px', borderRadius: '12px', border: '1px solid #334155', display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.85rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '8px' }}>
                <span style={{ color: '#94a3b8' }}>Kode Bahan Baku:</span>
                <strong style={{ color: '#818cf8', fontFamily: 'monospace' }}>{previewItemData.code}</strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '8px' }}>
                <span style={{ color: '#94a3b8' }}>Nama Bahan Baku:</span>
                <strong style={{ color: '#f8fafc' }}>{previewItemData.name}</strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '8px' }}>
                <span style={{ color: '#94a3b8' }}>Satuan Unit:</span>
                <strong style={{ color: '#38bdf8' }}>{previewItemData.unit}</strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '8px' }}>
                <span style={{ color: '#94a3b8' }}>Stok Dapur & Minimal Alert:</span>
                <strong style={{ color: previewItemData.stock <= previewItemData.min_stock ? '#f43f5e' : '#34d399' }}>
                  {previewItemData.stock} {previewItemData.unit} (Min: {previewItemData.min_stock} {previewItemData.unit})
                </strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '8px' }}>
                <span style={{ color: '#94a3b8' }}>Status Bahan:</span>
                <strong style={{ color: previewItemData.status === 'Aktif' ? '#34d399' : '#fb7185' }}>{previewItemData.status || 'Aktif'}</strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#94a3b8' }}>Akun Laporan Keuangan:</span>
                <strong style={{ color: '#818cf8' }}>{previewItemData.financial_account || 'Harga Pokok Produksi (HPP/COGS)'}</strong>
              </div>
            </div>

            {/* PREVIEW ACTIONS */}
            <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
              <button
                type="button"
                onClick={() => {
                  setShowPreviewModal(false);
                  if (editingIngredientId !== null || ingName) {
                    setShowAddFormModal(true);
                  }
                }}
                className="btn-secondary"
                style={{ flex: 1, justifyContent: 'center' }}
              >
                <ArrowLeft size={16} />
                <span>{editingIngredientId !== null || ingName ? 'Edit Kembali' : 'Tutup Preview'}</span>
              </button>

              {(editingIngredientId !== null || ingName) && (
                <button
                  type="button"
                  onClick={handleFinalSaveIngredient}
                  className="btn-primary"
                  style={{ flex: 1, justifyContent: 'center' }}
                >
                  <CheckCircle2 size={16} />
                  <span>Simpan Bahan Baku</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* PAPAN INFORMASI DETAIL BAHAN BAKU ANALYTICS MODAL */}
      {selectedIngredientDetail && (
        <IngredientAnalyticsDetailModal
          ingredient={selectedIngredientDetail}
          masterData={masterData}
          onClose={() => setSelectedIngredientDetail(null)}
        />
      )}

      {/* EXCEL IMPORT MODAL */}
      <ExcelMasterImportModal
        isOpen={showExcelImportModal}
        onClose={() => setShowExcelImportModal(false)}
        moduleType="ingredients"
        masterData={masterData}
        setMasterData={setMasterData}
      />
    </div>
  );
}
