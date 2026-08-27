import React, { useState, useMemo } from 'react';
import {
  Layers, Plus, Search, Edit3, Trash2, CheckCircle2, AlertCircle,
  Package, X, Eye, FileSpreadsheet, LayoutGrid, Sparkles,
  ArrowUpDown, TrendingUp, DollarSign, Utensils, Tag, Palette, MoveRight, HelpCircle
} from 'lucide-react';
import MenuAnalyticsDetailModal from './MenuAnalyticsDetailModal';
import CategoryAnalyticsDetailModal from './CategoryAnalyticsDetailModal';
import PaginationControls from './PaginationControls';
import ExcelMasterImportModal from './ExcelMasterImportModal';
import { getThemePalette } from '../../utils/themeUtils';
import { canDeleteModule, canEditModule } from '../../utils/permissionUtils';
import { executePermanentDelete } from '../../utils/deleteGuard';

const COLOR_PRESETS = [
  { name: 'Amber Emas', bg: 'rgba(245, 158, 11, 0.15)', text: '#f59e0b', border: 'rgba(245, 158, 11, 0.3)' },
  { name: 'Emerald Hijau', bg: 'rgba(16, 185, 129, 0.15)', text: '#10b981', border: 'rgba(16, 185, 129, 0.3)' },
  { name: 'Sky Biru', bg: 'rgba(14, 165, 233, 0.15)', text: '#0ea5e9', border: 'rgba(14, 165, 233, 0.3)' },
  { name: 'Rose Merah', bg: 'rgba(244, 63, 94, 0.15)', text: '#f43f5e', border: 'rgba(244, 63, 94, 0.3)' },
  { name: 'Purple Ungu', bg: 'rgba(168, 85, 247, 0.15)', text: '#a855f7', border: 'rgba(168, 85, 247, 0.3)' },
  { name: 'Orange Jingga', bg: 'rgba(249, 115, 22, 0.15)', text: '#f97316', border: 'rgba(249, 115, 22, 0.3)' },
];

export default function ProductCategoryManagement({ masterData, setMasterData, selectedBranch, userSession, themeMode = 'dark' }) {
  const T = getThemePalette(themeMode);
  const allowDelete = canDeleteModule(userSession, 'masterData', masterData?.permissionMatrix);
  const allowEdit = canEditModule(userSession, 'masterData', masterData?.permissionMatrix);

  // View & Filter States
  const [displayMode, setDisplayMode] = useState('grid'); // 'grid' | 'table'
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('Semua');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showExcelImportModal, setShowExcelImportModal] = useState(false);
  const [showDrilldownModal, setShowDrilldownModal] = useState(null); // Category object
  const [showMergeModal, setShowMergeModal] = useState(false);
  const [selectedMenuDetail, setSelectedMenuDetail] = useState(null);
  const [selectedCategoryDetail, setSelectedCategoryDetail] = useState(null);
  const [editingCategory, setEditingCategory] = useState(null);

  // Pagination States
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);

  // Form States (Add/Edit)
  const [formName, setFormName] = useState('');
  const [formStatus, setFormStatus] = useState('Aktif');
  const [formColor, setFormColor] = useState(COLOR_PRESETS[0].text);
  const [formPriority, setFormPriority] = useState(1);

  // Helper Format Rupiah
  const formatRupiah = (val) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val || 0);
  };

  // Helper to generate next auto code (e.g. CAT-001, CAT-002)
  const generateNextCategoryCode = () => {
    const existingCodes = (masterData?.categories || [])
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
    return (masterData?.products || []).filter(p =>
      String(p.category_id) === String(catId) ||
      (p.category_name && p.category_name.trim().toLowerCase() === String(catName).trim().toLowerCase()) ||
      (p.category && p.category.trim().toLowerCase() === String(catName).trim().toLowerCase())
    );
  };

  // -------------------------------------------------------------
  // KPI CALCULATIONS
  // -------------------------------------------------------------
  const kpiMetrics = useMemo(() => {
    const cats = masterData?.categories || [];
    const prods = masterData?.products || [];
    const sales = masterData?.salesTransactions || [];

    const totalCats = cats.length;
    const activeCats = cats.filter(c => (c.status || 'Aktif') === 'Aktif').length;
    const connectedProds = prods.filter(p => p.category_id || p.category_name).length;

    // Calculate revenue & qty per category
    const catSalesMap = {};
    sales.forEach(tx => {
      if (Array.isArray(tx.items)) {
        tx.items.forEach(it => {
          const matchedProd = prods.find(p => String(p.id) === String(it.product_id || it.productId || it.id));
          const catKey = matchedProd?.category_name || matchedProd?.category || 'Lainnya';
          const rev = Number(it.amount || it.total_price || (Number(it.qty || 1) * Number(it.price || 0)));
          catSalesMap[catKey] = (catSalesMap[catKey] || 0) + rev;
        });
      }
    });

    let topCatName = 'Belum Ada Transaksi';
    let topCatRev = 0;
    Object.keys(catSalesMap).forEach(cName => {
      if (catSalesMap[cName] > topCatRev) {
        topCatRev = catSalesMap[cName];
        topCatName = cName;
      }
    });

    return {
      totalCats,
      activeCats,
      inactiveCats: totalCats - activeCats,
      connectedProds,
      topCatName,
      topCatRev
    };
  }, [masterData?.categories, masterData?.products, masterData?.salesTransactions]);

  // -------------------------------------------------------------
  // DUPLICATE CATEGORIES DETECTION
  // -------------------------------------------------------------
  const duplicateCategoryGroups = useMemo(() => {
    const cats = masterData?.categories || [];
    const map = {};
    cats.forEach(c => {
      const norm = String(c.name || '').trim().toLowerCase();
      if (!norm) return;
      if (!map[norm]) map[norm] = [];
      map[norm].push(c);
    });

    const duplicates = [];
    Object.keys(map).forEach(normName => {
      if (map[normName].length > 1) {
        duplicates.push({
          name: map[normName][0].name,
          items: map[normName],
          count: map[normName].length
        });
      }
    });
    return duplicates;
  }, [masterData?.categories]);

  // -------------------------------------------------------------
  // FILTERED & SORTED CATEGORIES
  // -------------------------------------------------------------
  const filteredCategories = useMemo(() => {
    return (masterData?.categories || [])
      .filter(c => {
        if (statusFilter !== 'Semua' && (c.status || 'Aktif') !== statusFilter) return false;
        if (searchTerm.trim()) {
          const q = searchTerm.toLowerCase();
          const name = String(c.name || '').toLowerCase();
          const code = String(c.code || '').toLowerCase();
          if (!name.includes(q) && !code.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => (Number(a.priority || 99) - Number(b.priority || 99)) || a.name.localeCompare(b.name));
  }, [masterData?.categories, statusFilter, searchTerm]);

  // Pagination calculation
  const totalItems = filteredCategories.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const paginatedCategories = useMemo(() => {
    return filteredCategories.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  }, [filteredCategories, currentPage, pageSize]);

  // -------------------------------------------------------------
  // CREATE CATEGORY HANDLER
  // -------------------------------------------------------------
  const handleOpenAdd = () => {
    setFormName('');
    setFormStatus('Aktif');
    setFormColor(COLOR_PRESETS[0].text);
    setFormPriority((masterData?.categories?.length || 0) + 1);
    setShowAddModal(true);
  };

  const handleCreateCategory = (e) => {
    e.preventDefault();
    if (!formName.trim()) {
      alert('Mohon masukkan Nama Kategori Menu.');
      return;
    }

    const autoCode = generateNextCategoryCode();
    const newCategory = {
      id: Date.now(),
      code: autoCode,
      name: formName.trim().toUpperCase(),
      status: formStatus,
      color: formColor,
      priority: Number(formPriority) || 1,
      created_at: new Date().toISOString().split('T')[0],
      _updatedAt: Date.now()
    };

    const nextDeleted = (masterData?.deletedCategoriesIds || []).filter(
      del => String(del).toLowerCase() !== String(newCategory.id).toLowerCase() &&
             String(del).toLowerCase() !== String(newCategory.code).toLowerCase() &&
             String(del).toLowerCase() !== String(newCategory.name).toLowerCase()
    );

    const updated = {
      ...masterData,
      _lastUpdated: Date.now(),
      _lastMutated: Date.now(),
      deletedCategoriesIds: nextDeleted,
      categories: [...(masterData?.categories || []), newCategory]
    };
    setMasterData(updated);
    try {
      localStorage.setItem('mris_master_data', JSON.stringify(updated));
      fetch(getApiUrl('/api/master-data'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated)
      }).catch(err => console.warn('Failed to push saved category to server:', err));
    } catch (e) {}

    setShowAddModal(false);
    alert(`Kategori "${newCategory.name}" (${newCategory.code}) berhasil ditambahkan dan disinkronkan ke server!`);
  };

  // -------------------------------------------------------------
  // EDIT CATEGORY HANDLER
  // -------------------------------------------------------------
  const handleOpenEdit = (cat) => {
    setEditingCategory(cat);
    setFormName(cat.name || '');
    setFormStatus(cat.status || 'Aktif');
    setFormColor(cat.color || COLOR_PRESETS[0].text);
    setFormPriority(cat.priority || 1);
    setShowEditModal(true);
  };

  const handleUpdateCategory = (e) => {
    e.preventDefault();
    if (!editingCategory || !formName.trim()) return;

    const updatedCatObj = {
      ...editingCategory,
      name: formName.trim().toUpperCase(),
      status: formStatus,
      color: formColor,
      priority: Number(formPriority) || 1,
      _updatedAt: Date.now()
    };

    const updatedCategories = (masterData?.categories || []).map(c =>
      String(c.id) === String(editingCategory.id) ? updatedCatObj : c
    );

    // Sync category_name to all associated products
    const updatedProducts = (masterData?.products || []).map(p => {
      if (String(p.category_id) === String(editingCategory.id) || p.category_name === editingCategory.name) {
        return {
          ...p,
          category_id: updatedCatObj.id,
          category_name: updatedCatObj.name,
          category: updatedCatObj.name,
          _updatedAt: Date.now()
        };
      }
      return p;
    });

    const nextDeleted = (masterData?.deletedCategoriesIds || []).filter(
      del => String(del).toLowerCase() !== String(updatedCatObj.id).toLowerCase() &&
             String(del).toLowerCase() !== String(updatedCatObj.code).toLowerCase() &&
             String(del).toLowerCase() !== String(updatedCatObj.name).toLowerCase()
    );

    const updated = {
      ...masterData,
      _lastUpdated: Date.now(),
      _lastMutated: Date.now(),
      deletedCategoriesIds: nextDeleted,
      categories: updatedCategories,
      products: updatedProducts
    };
    setMasterData(updated);
    try {
      localStorage.setItem('mris_master_data', JSON.stringify(updated));
      fetch(getApiUrl('/api/master-data'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated)
      }).catch(err => console.warn('Failed to push updated category to server:', err));
    } catch (e) {}

    setShowEditModal(false);
    setEditingCategory(null);
    alert(`Kategori "${updatedCatObj.name}" berhasil diperbarui dan disinkronkan ke server!`);
  };

  // -------------------------------------------------------------
  // DELETE CATEGORY HANDLER (DELETE GUARD)
  // -------------------------------------------------------------
  const handleDeleteCategory = (catId, catName) => {
    if (!allowDelete) {
      alert('Anda tidak memiliki hak akses untuk menghapus kategori.');
      return;
    }

    const associated = getAssociatedProducts(catId, catName);
    if (associated.length > 0) {
      alert(`⚠️ PENGAMAN HAPUS (DELETE GUARD):\n\nKategori "${catName}" tidak dapat langsung dihapus karena masih memiliki ${associated.length} menu produk terhubung.\n\nSilakan pindahkan menu ke kategori lain terlebih dahulu (klik tombol "Lihat Menu"), atau gunakan fitur "Gabungkan Kategori".`);
      return;
    }

    if (!window.confirm(`Apakah Anda yakin ingin menghapus kategori "${catName}"?`)) {
      return;
    }

    const targetCat = (masterData?.categories || []).find(c => String(c.id) === String(catId) || String(c.name || '').trim().toLowerCase() === String(catName || '').trim().toLowerCase());
    const targetId = String(targetCat?.id || catId);
    const targetCode = String(targetCat?.code || '');
    executePermanentDelete({
      key: 'categories',
      id: targetId,
      code: targetCode,
      name: targetName,
      masterData,
      setMasterData
    });

    alert(`Kategori "${catName}" berhasil dihapus secara permanen dari Web Admin, POS Kasir, dan Database.`);
  };

  // -------------------------------------------------------------
  // REASSIGN PRODUCT CATEGORY (DRILLDOWN)
  // -------------------------------------------------------------
  const handleReassignProductCategory = (prodId, targetCatId) => {
    const targetCat = (masterData?.categories || []).find(c => String(c.id) === String(targetCatId));
    if (!targetCat) return;

    const updatedProducts = (masterData?.products || []).map(p => {
      if (String(p.id) === String(prodId)) {
        return {
          ...p,
          category_id: targetCat.id,
          category_name: targetCat.name,
          category: targetCat.name,
          _updatedAt: Date.now()
        };
      }
      return p;
    });

    setMasterData({
      ...masterData,
      products: updatedProducts,
      _lastUpdated: Date.now()
    });
  };

  // -------------------------------------------------------------
  // MERGE DUPLICATE CATEGORIES
  // -------------------------------------------------------------
  const handleMergeCategoryGroup = (group) => {
    if (!allowEdit) {
      alert('Anda tidak memiliki hak akses untuk mengedit kategori.');
      return;
    }
    const masterCat = group.items[0];
    const duplicateIds = group.items.slice(1).map(c => String(c.id));

    if (!confirm(`Gabungkan ${group.items.length} kategori "${group.name}" menjadi 1 Kategori Master (${masterCat.code})?\n\n• Seluruh menu yang terhubung ke duplikat akan otomatis dipindahkan ke Kategori Master.`)) {
      return;
    }

    // Move all products to masterCat
    const updatedProducts = (masterData?.products || []).map(p => {
      if (duplicateIds.includes(String(p.category_id)) || group.items.some(it => it.name === p.category_name)) {
        return {
          ...p,
          category_id: masterCat.id,
          category_name: masterCat.name,
          category: masterCat.name,
          _updatedAt: Date.now()
        };
      }
      return p;
    });

    const updatedCategories = (masterData?.categories || []).filter(c => !duplicateIds.includes(String(c.id)));

    setMasterData({
      ...masterData,
      categories: updatedCategories,
      products: updatedProducts,
      _lastUpdated: Date.now()
    });

    alert(`Kategori "${group.name}" berhasil digabungkan ke master (${masterCat.code})!`);
  };

  const handleMergeAllDuplicateCategories = () => {
    if (!allowEdit || duplicateCategoryGroups.length === 0) return;
    if (!confirm(`Satukan ${duplicateCategoryGroups.length} grup kategori duplikat menjadi kategori master? Seluruh menu produk akan otomatis dipindahkan.`)) {
      return;
    }

    let curCats = [...(masterData?.categories || [])];
    let curProds = [...(masterData?.products || [])];

    duplicateCategoryGroups.forEach(group => {
      const masterCat = group.items[0];
      const duplicateIds = group.items.slice(1).map(c => String(c.id));

      curProds = curProds.map(p => {
        if (duplicateIds.includes(String(p.category_id)) || group.items.some(it => it.name === p.category_name)) {
          return {
            ...p,
            category_id: masterCat.id,
            category_name: masterCat.name,
            category: masterCat.name,
            _updatedAt: Date.now()
          };
        }
        return p;
      });

      curCats = curCats.filter(c => !duplicateIds.includes(String(c.id)));
    });

    setMasterData({
      ...masterData,
      categories: curCats,
      products: curProds,
      _lastUpdated: Date.now()
    });

    setShowMergeModal(false);
    alert(`🎉 Sukses! ${duplicateCategoryGroups.length} grup kategori duplikat berhasil disatukan.`);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }} className="animate-fade-in">
      {/* ------------------------------------------------------------- */}
      {/* 1. HEADER SECTION & MAIN ACTIONS                              */}
      {/* ------------------------------------------------------------- */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <h2 style={{ fontSize: '1.05rem', fontWeight: '900', color: T.txtPrimary, letterSpacing: '-0.01em', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Layers size={20} color={T.primary} />
            <span>Kategori Menu Produk</span>
          </h2>
          <p style={{ color: T.txtSecondary, fontSize: '0.74rem', marginTop: '3px', margin: 0 }}>
            Pengelompokan menu makanan &amp; minuman dengan sistem auto-code, visual label POS, dan proteksi integritas menu
          </p>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          {duplicateCategoryGroups.length > 0 && (
            <button
              type="button"
              onClick={() => setShowMergeModal(true)}
              style={{
                padding: '8px 14px',
                fontSize: '0.76rem',
                fontWeight: '800',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: 'rgba(239, 68, 68, 0.15)',
                color: T.danger,
                border: `1px solid ${T.dangerBorder}`,
                borderRadius: '8px',
                cursor: 'pointer'
              }}
            >
              <AlertCircle size={15} />
              <span>Cek {duplicateCategoryGroups.length} Kategori Duplikat</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setShowExcelImportModal(true)}
            className="btn-secondary"
            style={{ padding: '8px 14px', fontSize: '0.76rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <FileSpreadsheet size={15} />
            <span>Import Excel</span>
          </button>

          {allowEdit && (
            <button
              type="button"
              onClick={handleOpenAdd}
              className="btn-primary"
              style={{ padding: '8px 16px', fontSize: '0.76rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Plus size={16} />
              <span>+ Tambah Kategori Baru</span>
            </button>
          )}
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 2. SUMMARY KPI METRICS (4 CARDS)                              */}
      {/* ------------------------------------------------------------- */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
        {/* Card 1: Total Categories */}
        <div style={{ background: T.cardBg, border: `1px solid ${T.borderStrong}`, borderRadius: '14px', padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <span style={{ fontSize: '0.68rem', fontWeight: '800', color: T.txtSecondary, textTransform: 'uppercase' }}>TOTAL KATEGORI</span>
            <div style={{ fontSize: '1.3rem', fontWeight: '900', color: T.txtPrimary, marginTop: '2px' }}>{kpiMetrics.totalCats} Kategori</div>
            <span style={{ fontSize: '0.66rem', color: T.info, fontWeight: '700' }}>{kpiMetrics.activeCats} Aktif Dijual</span>
          </div>
          <div style={{ padding: '8px', borderRadius: '10px', background: T.infoBg, color: T.info }}>
            <Layers size={18} />
          </div>
        </div>

        {/* Card 2: Active vs Inactive */}
        <div style={{ background: T.cardBg, border: `1px solid ${T.borderStrong}`, borderRadius: '14px', padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <span style={{ fontSize: '0.68rem', fontWeight: '800', color: T.txtSecondary, textTransform: 'uppercase' }}>STATUS KATEGORI</span>
            <div style={{ fontSize: '1.3rem', fontWeight: '900', color: T.success, marginTop: '2px' }}>{kpiMetrics.activeCats} Aktif</div>
            <span style={{ fontSize: '0.66rem', color: kpiMetrics.inactiveCats > 0 ? T.danger : T.txtMuted, fontWeight: '700' }}>
              {kpiMetrics.inactiveCats} Kategori Non-Aktif
            </span>
          </div>
          <div style={{ padding: '8px', borderRadius: '10px', background: T.successBg, color: T.success }}>
            <CheckCircle2 size={18} />
          </div>
        </div>

        {/* Card 3: Connected Products */}
        <div style={{ background: T.cardBg, border: `1px solid ${T.borderStrong}`, borderRadius: '14px', padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <span style={{ fontSize: '0.68rem', fontWeight: '800', color: T.txtSecondary, textTransform: 'uppercase' }}>MENU TERHUBUNG</span>
            <div style={{ fontSize: '1.3rem', fontWeight: '900', color: T.accentGold, marginTop: '2px' }}>{kpiMetrics.connectedProds} Menu</div>
            <span style={{ fontSize: '0.66rem', color: T.txtSecondary }}>Terbagi di Semua Kategori</span>
          </div>
          <div style={{ padding: '8px', borderRadius: '10px', background: T.accentGoldBg, color: T.accentGold }}>
            <Utensils size={18} />
          </div>
        </div>

        {/* Card 4: Top Contributor Category */}
        <div style={{ background: T.cardBg, border: `1px solid ${T.borderStrong}`, borderRadius: '14px', padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <span style={{ fontSize: '0.68rem', fontWeight: '800', color: T.txtSecondary, textTransform: 'uppercase' }}>KATEGORI TERLARIS</span>
            <div style={{ fontSize: '1.05rem', fontWeight: '900', color: T.primary, marginTop: '2px', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '160px' }}>
              {kpiMetrics.topCatName}
            </div>
            <span style={{ fontSize: '0.66rem', color: T.success, fontWeight: '700' }}>
              {kpiMetrics.topCatRev > 0 ? `Omzet ${formatRupiah(kpiMetrics.topCatRev)}` : 'Berdasarkan Transaksi POS'}
            </span>
          </div>
          <div style={{ padding: '8px', borderRadius: '10px', background: T.primaryBtn, color: T.navActiveTxt }}>
            <TrendingUp size={18} />
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 3. FILTER CONTROLS & DISPLAY SWITCHER                         */}
      {/* ------------------------------------------------------------- */}
      <div style={{
        background: T.cardBg,
        border: `1px solid ${T.borderStrong}`,
        borderRadius: '14px',
        padding: '12px 16px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '10px'
      }}>
        {/* Left: Search and Filters */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Search Box */}
          <div style={{ position: 'relative', width: '240px' }}>
            <Search size={14} color={T.txtMuted} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              placeholder="Cari nama / kode kategori..."
              value={searchTerm}
              onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              style={{
                width: '100%',
                padding: '6px 10px 6px 30px',
                background: T.inputBg,
                border: `1px solid ${T.border}`,
                borderRadius: '8px',
                color: T.txtPrimary,
                fontSize: '0.74rem',
                outline: 'none'
              }}
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={e => { setStatusFilter(e.target.value); setCurrentPage(1); }}
            style={{
              padding: '6px 12px',
              background: T.inputBg,
              border: `1px solid ${T.border}`,
              color: T.txtPrimary,
              borderRadius: '8px',
              fontSize: '0.74rem',
              fontWeight: '700',
              outline: 'none',
              cursor: 'pointer'
            }}
          >
            <option value="Semua">Semua Status</option>
            <option value="Aktif">Hanya Aktif</option>
            <option value="Inaktif">Hanya Non-Aktif</option>
          </select>
        </div>

        {/* Right: Display Mode Switcher */}
        <div style={{ display: 'flex', gap: '4px', background: T.cardBg2, padding: '3px', borderRadius: '8px', border: `1px solid ${T.borderStrong}` }}>
          <button
            type="button"
            onClick={() => setDisplayMode('grid')}
            style={{
              padding: '5px 10px',
              borderRadius: '6px',
              border: 'none',
              background: displayMode === 'grid' ? T.primary : 'transparent',
              color: displayMode === 'grid' ? T.txtInverse : T.txtSecondary,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '0.72rem',
              fontWeight: '800'
            }}
          >
            <LayoutGrid size={14} />
            <span>Grid</span>
          </button>

          <button
            type="button"
            onClick={() => setDisplayMode('table')}
            style={{
              padding: '5px 10px',
              borderRadius: '6px',
              border: 'none',
              background: displayMode === 'table' ? T.primary : 'transparent',
              color: displayMode === 'table' ? T.txtInverse : T.txtSecondary,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '0.72rem',
              fontWeight: '800'
            }}
          >
            <Layers size={14} />
            <span>Tabel</span>
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 4. CATEGORIES LISTING (GRID OR TABLE)                         */}
      {/* ------------------------------------------------------------- */}
      {filteredCategories.length === 0 ? (
        <div style={{
          background: T.cardBg,
          border: `1px solid ${T.borderStrong}`,
          borderRadius: '16px',
          padding: '48px 24px',
          textAlign: 'center',
          color: T.txtMuted
        }}>
          <Layers size={36} color={T.txtMuted} style={{ margin: '0 auto 12px auto' }} />
          <h4 style={{ fontSize: '0.94rem', fontWeight: '800', color: T.txtPrimary, margin: 0 }}>Tidak ada kategori ditemukan</h4>
          <p style={{ fontSize: '0.74rem', color: T.txtSecondary, marginTop: '4px' }}>Coba ubah kata kunci pencarian atau filter status.</p>
        </div>
      ) : displayMode === 'grid' ? (
        /* GRID MODE */
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '14px' }}>
          {paginatedCategories.map(cat => {
            const associated = getAssociatedProducts(cat.id, cat.name);
            const isAktif = (cat.status || 'Aktif') === 'Aktif';
            const catColor = cat.color || '#f59e0b';

            return (
              <div
                key={cat.id}
                className="glass-card"
                style={{
                  background: T.cardBg,
                  border: `1px solid ${T.borderStrong}`,
                  borderRadius: '14px',
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '12px',
                  position: 'relative',
                  overflow: 'hidden'
                }}
              >
                {/* Top Accent Strip */}
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '4px', background: catColor }} />

                <div>
                  {/* Header: Code & Status */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{
                      fontFamily: 'monospace',
                      fontSize: '0.68rem',
                      fontWeight: '800',
                      background: T.infoBg,
                      color: T.info,
                      padding: '2px 6px',
                      borderRadius: '6px',
                      border: `1px solid ${T.infoBorder}`
                    }}>
                      {cat.code || `CAT-00${cat.id}`}
                    </span>

                    <span style={{
                      fontSize: '0.64rem',
                      fontWeight: '800',
                      padding: '2px 8px',
                      borderRadius: '20px',
                      background: isAktif ? T.successBg : T.dangerBg,
                      color: isAktif ? T.success : T.danger,
                      border: `1px solid ${isAktif ? T.successBorder : T.dangerBorder}`
                    }}>
                      ● {isAktif ? 'Aktif' : 'Inaktif'}
                    </span>
                  </div>

                  {/* Category Title */}
                  <h3 style={{ fontSize: '0.96rem', fontWeight: '900', color: T.txtPrimary, margin: '0 0 8px 0', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: catColor, display: 'inline-block' }} />
                    <span>{cat.name}</span>
                  </h3>

                  {/* Connected Menus Count Box */}
                  <div style={{ background: T.cardBg2, border: `1px solid ${T.borderStrong}`, borderRadius: '10px', padding: '10px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <span style={{ fontSize: '0.62rem', color: T.txtSecondary, fontWeight: '700' }}>MENU TERDAFTAR</span>
                      <div style={{ fontSize: '1.1rem', fontWeight: '900', color: T.accentGold }}>{associated.length} Produk</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowDrilldownModal(cat)}
                      style={{
                        background: T.infoBg,
                        border: `1px solid ${T.infoBorder}`,
                        color: T.info,
                        fontSize: '0.68rem',
                        fontWeight: '800',
                        padding: '4px 8px',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      <Eye size={12} />
                      <span>Lihat Menu</span>
                    </button>
                  </div>
                </div>

                {/* Bottom Actions */}
                <div style={{ display: 'flex', gap: '6px', paddingTop: '10px', borderTop: `1px solid ${T.border}` }}>
                  <button
                    type="button"
                    onClick={() => setSelectedCategoryDetail(cat)}
                    style={{
                      flex: 1,
                      padding: '6px',
                      borderRadius: '6px',
                      border: `1px solid ${T.border}`,
                      background: T.cardBg2,
                      color: T.info,
                      fontSize: '0.70rem',
                      fontWeight: '800',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px'
                    }}
                  >
                    <TrendingUp size={13} />
                    <span>Analisis</span>
                  </button>

                  {allowEdit && (
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(cat)}
                      style={{
                        flex: 1,
                        padding: '6px',
                        borderRadius: '6px',
                        border: `1px solid ${T.border}`,
                        background: T.cardBg2,
                        color: T.txtPrimary,
                        fontSize: '0.70rem',
                        fontWeight: '800',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '4px'
                      }}
                    >
                      <Edit3 size={13} />
                      <span>Edit</span>
                    </button>
                  )}

                  {allowDelete && (
                    <button
                      type="button"
                      onClick={() => handleDeleteCategory(cat.id, cat.name)}
                      style={{
                        padding: '6px 8px',
                        borderRadius: '6px',
                        border: `1px solid ${T.dangerBorder}`,
                        background: T.dangerBg,
                        color: T.danger,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                      title="Hapus Kategori"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* TABLE MODE */
        <div style={{
          background: T.cardBg,
          border: `1px solid ${T.borderStrong}`,
          borderRadius: '16px',
          overflow: 'hidden',
          boxShadow: T.shadowSm
        }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.74rem' }}>
              <thead>
                <tr style={{ background: T.tableHeaderBg, borderBottom: `1px solid ${T.border}`, color: T.txtMuted }}>
                  <th style={{ padding: '10px 12px', fontWeight: '800' }}>KODE (AUTO)</th>
                  <th style={{ padding: '10px 12px', fontWeight: '800' }}>NAMA KATEGORI MENU</th>
                  <th style={{ padding: '10px 12px', fontWeight: '800', textAlign: 'center' }}>PRIORITAS POS</th>
                  <th style={{ padding: '10px 12px', fontWeight: '800' }}>MENU TERHUBUNG</th>
                  <th style={{ padding: '10px 12px', fontWeight: '800', textAlign: 'center' }}>STATUS</th>
                  <th style={{ padding: '10px 12px', fontWeight: '800', textAlign: 'center' }}>AKSI</th>
                </tr>
              </thead>
              <tbody>
                {paginatedCategories.map(cat => {
                  const associated = getAssociatedProducts(cat.id, cat.name);
                  const isAktif = (cat.status || 'Aktif') === 'Aktif';
                  const catColor = cat.color || '#f59e0b';

                  return (
                    <tr key={cat.id} style={{ borderBottom: `1px solid ${T.border}`, color: T.txtPrimary }}>
                      {/* Code */}
                      <td style={{ padding: '10px 12px' }}>
                        <span style={{ fontFamily: 'monospace', fontWeight: '800', color: T.info, background: T.infoBg, border: `1px solid ${T.infoBorder}`, padding: '2px 6px', borderRadius: '4px' }}>
                          {cat.code || `CAT-00${cat.id}`}
                        </span>
                      </td>

                      {/* Name */}
                      <td style={{ padding: '10px 12px', fontWeight: '800', textTransform: 'uppercase' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: catColor }} />
                          <button
                            type="button"
                            onClick={() => setSelectedCategoryDetail(cat)}
                            style={{ background: 'none', border: 'none', color: T.txtPrimary, fontWeight: '800', cursor: 'pointer', padding: 0, textTransform: 'uppercase' }}
                          >
                            {cat.name}
                          </button>
                        </div>
                      </td>

                      {/* Priority */}
                      <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                        <span style={{ background: T.cardBg2, padding: '2px 8px', borderRadius: '6px', border: `1px solid ${T.border}`, fontWeight: '800', color: T.txtSecondary }}>
                          #{cat.priority || 1}
                        </span>
                      </td>

                      {/* Associated Products */}
                      <td style={{ padding: '10px 12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ color: T.accentGold, fontWeight: '800' }}>
                            {associated.length} Menu
                          </span>
                          <button
                            type="button"
                            onClick={() => setShowDrilldownModal(cat)}
                            style={{
                              background: 'none',
                              border: `1px solid ${T.border}`,
                              color: T.info,
                              borderRadius: '4px',
                              padding: '2px 6px',
                              fontSize: '0.66rem',
                              cursor: 'pointer'
                            }}
                          >
                            Lihat &amp; Kelola
                          </button>
                        </div>
                      </td>

                      {/* Status */}
                      <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                        <span style={{
                          fontSize: '0.64rem',
                          fontWeight: '800',
                          padding: '2px 8px',
                          borderRadius: '20px',
                          background: isAktif ? T.successBg : T.dangerBg,
                          color: isAktif ? T.success : T.danger,
                          border: `1px solid ${isAktif ? T.successBorder : T.dangerBorder}`
                        }}>
                          ● {isAktif ? 'Aktif' : 'Inaktif'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                        <div style={{ display: 'inline-flex', gap: '6px' }}>
                          <button
                            type="button"
                            onClick={() => setSelectedCategoryDetail(cat)}
                            style={{ background: 'none', border: 'none', color: T.info, cursor: 'pointer', padding: '3px' }}
                            title="Analisis Penjualan Kategori"
                          >
                            <TrendingUp size={15} />
                          </button>

                          {allowEdit && (
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(cat)}
                              style={{ background: 'none', border: 'none', color: T.txtPrimary, cursor: 'pointer', padding: '3px' }}
                              title="Edit Kategori"
                            >
                              <Edit3 size={15} />
                            </button>
                          )}

                          {allowDelete && (
                            <button
                              type="button"
                              onClick={() => handleDeleteCategory(cat.id, cat.name)}
                              style={{ background: 'none', border: 'none', color: T.danger, cursor: 'pointer', padding: '3px' }}
                              title="Hapus Kategori"
                            >
                              <Trash2 size={15} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 5. PAGINATION CONTROLS                                        */}
      {/* ------------------------------------------------------------- */}
      <PaginationControls
        currentPage={currentPage}
        totalPages={totalPages}
        pageSize={pageSize}
        totalItems={totalItems}
        onPageChange={setCurrentPage}
        onPageSizeChange={setPageSize}
      />

      {/* ------------------------------------------------------------- */}
      {/* MODAL: TAMBAH KATEGORI BARU                                   */}
      {/* ------------------------------------------------------------- */}
      {showAddModal && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0, 0, 0, 0.8)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '16px'
        }}>
          <div className="glass-card animate-fade-in" style={{
            width: '100%',
            maxWidth: '520px',
            background: T.cardBg,
            border: `1px solid ${T.borderStrong}`,
            borderRadius: '16px',
            padding: '24px',
            boxShadow: '0 25px 50px rgba(0,0,0,0.6)'
          }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: '900', color: T.txtPrimary, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Layers size={18} color={T.primary} />
                  <span>Tambah Kategori Menu Baru</span>
                </h3>
                <p style={{ fontSize: '0.72rem', color: T.txtSecondary, margin: '3px 0 0 0' }}>
                  Konfigurasi label, urutan prioritas POS, dan kode otomatis
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                style={{ background: 'none', border: 'none', color: T.txtSecondary, cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateCategory} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Auto Code */}
              <div>
                <label style={{ fontSize: '0.72rem', color: T.txtSecondary, fontWeight: '700', display: 'block', marginBottom: '4px' }}>
                  KODE KATEGORI (OTOMATIS)
                </label>
                <div style={{
                  background: T.inputBg,
                  border: `1px solid ${T.border}`,
                  padding: '8px 12px',
                  borderRadius: '8px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <span style={{ fontFamily: 'monospace', fontWeight: '900', color: T.info, fontSize: '0.86rem' }}>
                    {generateNextCategoryCode()}
                  </span>
                  <span style={{ fontSize: '0.64rem', color: T.success, background: T.successBg, border: `1px solid ${T.successBorder}`, padding: '2px 6px', borderRadius: '4px', fontWeight: '800' }}>
                    ✓ Auto-Generated
                  </span>
                </div>
              </div>

              {/* Name */}
              <div>
                <label style={{ fontSize: '0.72rem', color: T.txtSecondary, fontWeight: '700', display: 'block', marginBottom: '4px' }}>
                  NAMA KATEGORI MENU *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: MAKANAN UTAMA, SERBA AYAM, MINUMAN DINGIN..."
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  className="form-input"
                  style={{ background: T.inputBg, border: `1px solid ${T.border}`, color: T.txtPrimary, textTransform: 'uppercase' }}
                  autoFocus
                />
              </div>

              {/* Color Presets */}
              <div>
                <label style={{ fontSize: '0.72rem', color: T.txtSecondary, fontWeight: '700', display: 'block', marginBottom: '6px' }}>
                  PILIHAN WARNA LABEL POS
                </label>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {COLOR_PRESETS.map(preset => (
                    <button
                      key={preset.text}
                      type="button"
                      onClick={() => setFormColor(preset.text)}
                      style={{
                        padding: '6px 10px',
                        borderRadius: '8px',
                        border: `1.5px solid ${formColor === preset.text ? preset.text : T.border}`,
                        background: formColor === preset.text ? preset.bg : T.cardBg2,
                        color: preset.text,
                        fontSize: '0.72rem',
                        fontWeight: '800',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: preset.text }} />
                      <span>{preset.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Priority and Status Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.72rem', color: T.txtSecondary, fontWeight: '700', display: 'block', marginBottom: '4px' }}>
                    URUTAN PRIORITAS DI POS
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formPriority}
                    onChange={e => setFormPriority(e.target.value)}
                    className="form-input"
                    style={{ background: T.inputBg, border: `1px solid ${T.border}`, color: T.txtPrimary }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.72rem', color: T.txtSecondary, fontWeight: '700', display: 'block', marginBottom: '4px' }}>
                    STATUS KATEGORI
                  </label>
                  <select
                    value={formStatus}
                    onChange={e => setFormStatus(e.target.value)}
                    className="form-select"
                    style={{ background: T.inputBg, border: `1px solid ${T.border}`, color: T.txtPrimary, width: '100%' }}
                  >
                    <option value="Aktif">● Aktif</option>
                    <option value="Inaktif">● Inaktif</option>
                  </select>
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '12px' }}>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  style={{ background: T.cardBg2, border: `1px solid ${T.border}`, padding: '8px 16px', borderRadius: '8px', color: T.txtSecondary, fontSize: '0.76rem', fontWeight: '700', cursor: 'pointer' }}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  style={{ padding: '8px 20px', fontSize: '0.76rem', fontWeight: '800' }}
                >
                  Simpan Kategori
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: EDIT KATEGORI                                          */}
      {/* ------------------------------------------------------------- */}
      {showEditModal && editingCategory && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0, 0, 0, 0.8)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '16px'
        }}>
          <div className="glass-card animate-fade-in" style={{
            width: '100%',
            maxWidth: '520px',
            background: T.cardBg,
            border: `1px solid ${T.borderStrong}`,
            borderRadius: '16px',
            padding: '24px',
            boxShadow: '0 25px 50px rgba(0,0,0,0.6)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: '900', color: T.txtPrimary, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Edit3 size={18} color={T.primary} />
                  <span>Edit Kategori Menu</span>
                </h3>
                <p style={{ fontSize: '0.72rem', color: T.txtSecondary, margin: '3px 0 0 0' }}>
                  Perubahan nama akan otomatis tersinkronisasi ke seluruh menu terhubung
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                style={{ background: 'none', border: 'none', color: T.txtSecondary, cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleUpdateCategory} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Code (Readonly) */}
              <div>
                <label style={{ fontSize: '0.72rem', color: T.txtSecondary, fontWeight: '700', display: 'block', marginBottom: '4px' }}>
                  KODE KATEGORI
                </label>
                <input
                  type="text"
                  readOnly
                  value={editingCategory.code || `CAT-00${editingCategory.id}`}
                  className="form-input"
                  style={{ background: T.cardBg2, border: `1px solid ${T.border}`, color: T.info, fontFamily: 'monospace', fontWeight: '900' }}
                />
              </div>

              {/* Name */}
              <div>
                <label style={{ fontSize: '0.72rem', color: T.txtSecondary, fontWeight: '700', display: 'block', marginBottom: '4px' }}>
                  NAMA KATEGORI MENU *
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  className="form-input"
                  style={{ background: T.inputBg, border: `1px solid ${T.border}`, color: T.txtPrimary, textTransform: 'uppercase' }}
                />
              </div>

              {/* Color Presets */}
              <div>
                <label style={{ fontSize: '0.72rem', color: T.txtSecondary, fontWeight: '700', display: 'block', marginBottom: '6px' }}>
                  PILIHAN WARNA LABEL POS
                </label>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {COLOR_PRESETS.map(preset => (
                    <button
                      key={preset.text}
                      type="button"
                      onClick={() => setFormColor(preset.text)}
                      style={{
                        padding: '6px 10px',
                        borderRadius: '8px',
                        border: `1.5px solid ${formColor === preset.text ? preset.text : T.border}`,
                        background: formColor === preset.text ? preset.bg : T.cardBg2,
                        color: preset.text,
                        fontSize: '0.72rem',
                        fontWeight: '800',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: preset.text }} />
                      <span>{preset.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Priority and Status Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.72rem', color: T.txtSecondary, fontWeight: '700', display: 'block', marginBottom: '4px' }}>
                    URUTAN PRIORITAS DI POS
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formPriority}
                    onChange={e => setFormPriority(e.target.value)}
                    className="form-input"
                    style={{ background: T.inputBg, border: `1px solid ${T.border}`, color: T.txtPrimary }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.72rem', color: T.txtSecondary, fontWeight: '700', display: 'block', marginBottom: '4px' }}>
                    STATUS KATEGORI
                  </label>
                  <select
                    value={formStatus}
                    onChange={e => setFormStatus(e.target.value)}
                    className="form-select"
                    style={{ background: T.inputBg, border: `1px solid ${T.border}`, color: T.txtPrimary, width: '100%' }}
                  >
                    <option value="Aktif">● Aktif</option>
                    <option value="Inaktif">● Inaktif</option>
                  </select>
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '12px' }}>
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  style={{ background: T.cardBg2, border: `1px solid ${T.border}`, padding: '8px 16px', borderRadius: '8px', color: T.txtSecondary, fontSize: '0.76rem', fontWeight: '700', cursor: 'pointer' }}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  style={{ padding: '8px 20px', fontSize: '0.76rem', fontWeight: '800' }}
                >
                  Perbarui Kategori
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: DRILLDOWN DAFTAR MENU TERHUBUNG (ASSOCIATED MENUS)     */}
      {/* ------------------------------------------------------------- */}
      {showDrilldownModal && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0, 0, 0, 0.8)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '16px'
        }}>
          <div className="glass-card animate-fade-in" style={{
            width: '100%',
            maxWidth: '680px',
            maxHeight: '85vh',
            overflowY: 'auto',
            background: T.cardBg,
            border: `1px solid ${T.borderStrong}`,
            borderRadius: '16px',
            padding: '24px',
            boxShadow: '0 25px 50px rgba(0,0,0,0.6)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: '900', color: T.txtPrimary, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Utensils size={18} color={T.primary} />
                  <span>Daftar Menu Kategori: {showDrilldownModal.name}</span>
                </h3>
                <p style={{ fontSize: '0.72rem', color: T.txtSecondary, margin: '3px 0 0 0' }}>
                  Kelola dan pindahkan menu produk ke kategori lain dengan mudah
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowDrilldownModal(null)}
                style={{ background: 'none', border: 'none', color: T.txtSecondary, cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Product List */}
            {getAssociatedProducts(showDrilldownModal.id, showDrilldownModal.name).length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px 16px', color: T.txtMuted }}>
                <Package size={36} color={T.txtMuted} style={{ margin: '0 auto 8px auto' }} />
                <h4 style={{ fontSize: '0.92rem', fontWeight: '800', color: T.txtPrimary, margin: 0 }}>Belum Ada Menu Terhubung</h4>
                <p style={{ fontSize: '0.72rem', color: T.txtSecondary, marginTop: '4px' }}>Kategori ini belum memiliki menu produk yang terdaftar.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {getAssociatedProducts(showDrilldownModal.id, showDrilldownModal.name).map(prod => (
                  <div
                    key={prod.id}
                    style={{
                      background: T.cardBg2,
                      border: `1px solid ${T.border}`,
                      borderRadius: '10px',
                      padding: '8px 12px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      fontSize: '0.74rem'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: T.cardBg, border: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Package size={18} color={T.primary} />
                      </div>
                      <div>
                        <div style={{ fontWeight: '800', color: T.txtPrimary, textTransform: 'uppercase' }}>{prod.name}</div>
                        <div style={{ fontSize: '0.66rem', color: T.info, fontFamily: 'monospace' }}>{prod.sku || prod.code} • {formatRupiah(prod.price)}</div>
                      </div>
                    </div>

                    {/* Reassign select */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '0.66rem', color: T.txtSecondary }}>Pindah:</span>
                      <select
                        value={prod.category_id || showDrilldownModal.id}
                        onChange={e => handleReassignProductCategory(prod.id, e.target.value)}
                        style={{
                          padding: '4px 8px',
                          background: T.inputBg,
                          border: `1px solid ${T.border}`,
                          color: T.txtPrimary,
                          borderRadius: '6px',
                          fontSize: '0.70rem',
                          fontWeight: '700'
                        }}
                      >
                        {(masterData?.categories || []).map(c => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px', paddingTop: '12px', borderTop: `1px solid ${T.border}` }}>
              <button
                type="button"
                onClick={() => setShowDrilldownModal(null)}
                style={{ background: T.cardBg2, border: `1px solid ${T.border}`, padding: '6px 14px', borderRadius: '8px', color: T.txtPrimary, fontSize: '0.74rem', fontWeight: '700', cursor: 'pointer' }}
              >
                Selesai
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: SMART-MERGE KATEGORI DUPLIKAT                           */}
      {/* ------------------------------------------------------------- */}
      {showMergeModal && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0, 0, 0, 0.8)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '16px'
        }}>
          <div className="glass-card animate-fade-in" style={{
            width: '100%',
            maxWidth: '680px',
            maxHeight: '85vh',
            overflowY: 'auto',
            background: T.cardBg,
            border: `1px solid ${T.borderStrong}`,
            borderRadius: '16px',
            padding: '24px',
            boxShadow: '0 25px 50px rgba(0,0,0,0.6)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: '900', color: T.txtPrimary, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Sparkles size={18} color={T.primary} />
                  <span>Smart-Merge Kategori Duplikat</span>
                </h3>
                <p style={{ fontSize: '0.72rem', color: T.txtSecondary, margin: '3px 0 0 0' }}>
                  Satukan kategori yang memiliki nama identik dan pindahkan seluruh menu produk ke Kategori Master
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowMergeModal(false)}
                style={{ background: 'none', border: 'none', color: T.txtSecondary, cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            {duplicateCategoryGroups.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px 16px', color: T.txtMuted }}>
                <CheckCircle2 size={36} color={T.success} style={{ margin: '0 auto 8px auto' }} />
                <h4 style={{ fontSize: '0.92rem', fontWeight: '800', color: T.txtPrimary, margin: 0 }}>Semua Kategori Bersih!</h4>
                <p style={{ fontSize: '0.72rem', color: T.txtSecondary, marginTop: '4px' }}>Tidak ada nama kategori duplikat yang terdeteksi.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {duplicateCategoryGroups.map(grp => (
                  <div
                    key={grp.name}
                    style={{
                      background: T.cardBg2,
                      border: `1px solid ${T.borderStrong}`,
                      borderRadius: '12px',
                      padding: '12px 14px'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontWeight: '900', color: T.txtPrimary, fontSize: '0.88rem' }}>{grp.name}</div>
                        <div style={{ fontSize: '0.68rem', color: T.danger, fontWeight: '800', marginTop: '2px' }}>
                          ⚠️ {grp.count} Kategori Terdaftar dengan Nama Sama
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleMergeCategoryGroup(grp)}
                        className="btn-primary"
                        style={{ padding: '6px 12px', fontSize: '0.72rem', fontWeight: '800' }}
                      >
                        Gabungkan Grup Ini
                      </button>
                    </div>

                    <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {grp.items.map((it, idx) => {
                        const prods = getAssociatedProducts(it.id, it.name);
                        return (
                          <div
                            key={it.id}
                            style={{
                              background: T.inputBg,
                              padding: '6px 10px',
                              borderRadius: '6px',
                              border: `1px solid ${T.border}`,
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              fontSize: '0.70rem'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ fontSize: '0.62rem', padding: '2px 6px', borderRadius: '4px', background: idx === 0 ? T.successBg : T.cardBg, color: idx === 0 ? T.success : T.txtSecondary, fontWeight: '800' }}>
                                {idx === 0 ? 'MASTER' : `DUPLIKAT #${idx}`}
                              </span>
                              <span style={{ fontFamily: 'monospace', color: T.info, fontWeight: '800' }}>{it.code}</span>
                              <span style={{ color: T.txtPrimary }}>{it.name}</span>
                            </div>
                            <span style={{ color: T.accentGold, fontWeight: '800' }}>{prods.length} Menu Terhubung</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', paddingTop: '12px', borderTop: `1px solid ${T.border}` }}>
              <button
                type="button"
                onClick={() => setShowMergeModal(false)}
                style={{ background: T.cardBg2, border: `1px solid ${T.border}`, padding: '8px 16px', borderRadius: '8px', color: T.txtSecondary, fontSize: '0.76rem', fontWeight: '700', cursor: 'pointer' }}
              >
                Tutup
              </button>

              {duplicateCategoryGroups.length > 0 && allowEdit && (
                <button
                  type="button"
                  onClick={handleMergeAllDuplicateCategories}
                  style={{
                    padding: '8px 18px',
                    fontSize: '0.76rem',
                    fontWeight: '900',
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <Sparkles size={15} />
                  <span>⚡ Auto-Merge Semua Duplikat ({duplicateCategoryGroups.length})</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: DETAIL MENU ANALYTICS                                  */}
      {/* ------------------------------------------------------------- */}
      {selectedMenuDetail && (
        <MenuAnalyticsDetailModal
          menuItem={selectedMenuDetail}
          product={selectedMenuDetail}
          masterData={masterData}
          onClose={() => setSelectedMenuDetail(null)}
          themeMode={themeMode}
        />
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: DETAIL KATEGORI ANALYTICS                              */}
      {/* ------------------------------------------------------------- */}
      {selectedCategoryDetail && (
        <CategoryAnalyticsDetailModal
          category={selectedCategoryDetail}
          masterData={masterData}
          onClose={() => setSelectedCategoryDetail(null)}
          themeMode={themeMode}
        />
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: EXCEL IMPORT                                           */}
      {/* ------------------------------------------------------------- */}
      {showExcelImportModal && (
        <ExcelMasterImportModal
          show={showExcelImportModal}
          isOpen={showExcelImportModal}
          moduleType="categories"
          masterData={masterData}
          setMasterData={setMasterData}
          onClose={() => setShowExcelImportModal(false)}
          themeMode={themeMode}
        />
      )}
    </div>
  );
}
