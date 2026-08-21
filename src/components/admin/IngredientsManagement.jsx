import React, { useState, useMemo } from 'react';
import {
  ShoppingBasket, Plus, Search, Trash2, Edit3, X, CheckCircle2,
  AlertTriangle, Eye, ArrowLeft, ShieldCheck, FileSpreadsheet,
  Layers, LayoutGrid, Sparkles, TrendingUp, DollarSign, Utensils,
  Scale, AlertCircle
} from 'lucide-react';
import IngredientAnalyticsDetailModal from './IngredientAnalyticsDetailModal';
import PaginationControls from './PaginationControls';
import ExcelMasterImportModal from './ExcelMasterImportModal';
import { getThemePalette } from '../../utils/themeUtils';
import { canDeleteModule, canEditModule } from '../../utils/permissionUtils';

export const inferDefaultIngredientCategory = (name) => {
  const n = String(name || '').toLowerCase();
  if (n.includes('ikan') || n.includes('udang') || n.includes('cumi') || n.includes('kepiting') || n.includes('lele') || n.includes('gurami') || n.includes('seafood')) return 'Seafood & Ikan';
  if (n.includes('ayam') || n.includes('bebek') || n.includes('daging') || n.includes('sapi') || n.includes('kambing') || n.includes('telur')) return 'Daging & Unggas';
  if (n.includes('kangkung') || n.includes('bayam') || n.includes('toge') || n.includes('sayur') || n.includes('cabai') || n.includes('cabe') || n.includes('bawang') || n.includes('tomat') || n.includes('timun')) return 'Sayur & Bumbu Segar';
  if (n.includes('milo') || n.includes('kopi') || n.includes('coffee') || n.includes('cappucino') || n.includes('teh') || n.includes('lemon tea') || n.includes('fruit tea') || n.includes('air mineral') || n.includes('sirup') || n.includes('susu') || n.includes('powder')) return 'Minuman & Powder';
  if (n.includes('nasi') || n.includes('beras') || n.includes('minyak') || n.includes('tepung') || n.includes('gula') || n.includes('garam') || n.includes('kecap') || n.includes('saus')) return 'Sembako & Olahan';
  return 'Bumbu & Rempah';
};

export default function IngredientsManagement({ masterData, setMasterData, selectedBranch, userSession, themeMode = 'dark', onNavigateToCategories }) {
  const T = getThemePalette(themeMode);
  const allowDelete = canDeleteModule(userSession, 'masterData', masterData?.permissionMatrix);
  const allowEdit = canEditModule(userSession, 'masterData', masterData?.permissionMatrix);

  // View & Filter States
  const [displayMode, setDisplayMode] = useState('grid'); // 'grid' | 'table'
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('Semua');
  const [statusFilter, setStatusFilter] = useState('Semua');

  // Modals
  const [showAddFormModal, setShowAddFormModal] = useState(false);
  const [showExcelImportModal, setShowExcelImportModal] = useState(false);
  const [showDrilldownModal, setShowDrilldownModal] = useState(null); // Ingredient object
  const [showMergeModal, setShowMergeModal] = useState(false);
  const [selectedIngredientDetail, setSelectedIngredientDetail] = useState(null);
  const [editingIngredientId, setEditingIngredientId] = useState(null);

  // Pagination States (Default 12 per page for grid)
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);

  // Form States
  const [ingName, setIngName] = useState('');
  const [ingCategory, setIngCategory] = useState('Bumbu & Rempah');
  const [ingStatus, setIngStatus] = useState('Aktif');
  const [ingUnit, setIngUnit] = useState('Kg');
  const [ingBuyPrice, setIngBuyPrice] = useState(10000);
  const [ingMinStock, setIngMinStock] = useState(5);

  // Master Categories & Units
  const allIngredientCategories = useMemo(() => {
    const fromMaster = (masterData?.ingredientCategories || []).map(c => c.name || c.nama).filter(Boolean);
    const defaults = ['Seafood & Ikan', 'Daging & Unggas', 'Sayur & Bumbu Segar', 'Minuman & Powder', 'Sembako & Olahan', 'Bumbu & Rempah'];
    return Array.from(new Set([...fromMaster, ...defaults]));
  }, [masterData?.ingredientCategories]);

  const allUnits = useMemo(() => {
    const fromMaster = (masterData?.units || []).map(u => u.name || u.nama || u.unit || u.symbol).filter(Boolean);
    const defaults = ['Kg', 'Gram', 'Liter', 'ml', 'Pcs', 'Botol', 'Bungkus', 'Porsi', 'Sendok', 'Ikat', 'Kaleng', 'Dus', 'Butir', 'Batang'];
    return Array.from(new Set([...fromMaster, ...defaults]));
  }, [masterData?.units]);

  // Format IDR Helper
  const formatRupiah = (val) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val || 0);
  };

  // Helper to generate next sequential ingredient code (e.g. BHN-001, BHN-002)
  const generateNextIngredientCode = () => {
    const existingCodes = (masterData?.ingredients || [])
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

  // Helper to find all recipes using this ingredient
  const getConnectedRecipes = (ingId, ingName) => {
    const products = masterData?.products || [];
    const connected = [];

    products.forEach(p => {
      if (p.compositions && Array.isArray(p.compositions)) {
        const matched = p.compositions.find(c =>
          String(c.ingredient_id) === String(ingId) ||
          (c.ingredient_name && c.ingredient_name.trim().toLowerCase() === String(ingName).trim().toLowerCase())
        );
        if (matched) {
          connected.push({
            product: p,
            composition: matched
          });
        }
      }
    });

    return connected;
  };

  // -------------------------------------------------------------
  // KPI CALCULATIONS
  // -------------------------------------------------------------
  const kpiMetrics = useMemo(() => {
    const ings = masterData?.ingredients || [];
    const prods = masterData?.products || [];

    const totalIngs = ings.length;
    const activeIngs = ings.filter(i => (i.status || 'Aktif') === 'Aktif').length;
    const inactiveIngs = totalIngs - activeIngs;

    // Average buy price
    let totalPriceSum = 0;
    let pricedCount = 0;
    ings.forEach(i => {
      const p = Number(i.avg_buy_price || i.price || i.last_buy_price || 0);
      if (p > 0) {
        totalPriceSum += p;
        pricedCount += 1;
      }
    });
    const avgBuyPrice = pricedCount > 0 ? Math.round(totalPriceSum / pricedCount) : 0;

    // Top used ingredient in recipes
    const usageCountMap = {};
    prods.forEach(p => {
      if (Array.isArray(p.compositions)) {
        p.compositions.forEach(c => {
          const key = c.ingredient_id || c.ingredient_name;
          if (key) {
            usageCountMap[key] = (usageCountMap[key] || 0) + 1;
          }
        });
      }
    });

    let topIngName = 'Belum Ada Resep';
    let maxUsage = 0;
    ings.forEach(i => {
      const u1 = usageCountMap[i.id] || 0;
      const u2 = usageCountMap[i.name] || 0;
      const totalU = Math.max(u1, u2);
      if (totalU > maxUsage) {
        maxUsage = totalU;
        topIngName = `${i.name} (${totalU} Menu)`;
      }
    });

    return {
      totalIngs,
      activeIngs,
      inactiveIngs,
      avgBuyPrice,
      topIngName,
      maxUsage
    };
  }, [masterData?.ingredients, masterData?.products]);

  // -------------------------------------------------------------
  // DUPLICATE INGREDIENTS DETECTION
  // -------------------------------------------------------------
  const duplicateIngredientGroups = useMemo(() => {
    const ings = masterData?.ingredients || [];
    const map = {};
    ings.forEach(i => {
      const norm = String(i.name || '').trim().toLowerCase();
      if (!norm) return;
      if (!map[norm]) map[norm] = [];
      map[norm].push(i);
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
  }, [masterData?.ingredients]);

  // -------------------------------------------------------------
  // FILTERED & SORTED INGREDIENTS
  // -------------------------------------------------------------
  const filteredIngredients = useMemo(() => {
    return (masterData?.ingredients || [])
      .filter(i => {
        if (categoryFilter !== 'Semua' && (i.category || i.category_name) !== categoryFilter) return false;
        if (statusFilter !== 'Semua' && (i.status || 'Aktif') !== statusFilter) return false;
        if (searchTerm.trim()) {
          const q = searchTerm.toLowerCase();
          const name = String(i.name || '').toLowerCase();
          const code = String(i.code || '').toLowerCase();
          const cat = String(i.category || i.category_name || '').toLowerCase();
          if (!name.includes(q) && !code.includes(q) && !cat.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [masterData?.ingredients, categoryFilter, statusFilter, searchTerm]);

  // Pagination calculation
  const totalItems = filteredIngredients.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const paginatedIngredients = useMemo(() => {
    return filteredIngredients.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  }, [filteredIngredients, currentPage, pageSize]);

  // -------------------------------------------------------------
  // FORM HANDLERS (ADD & EDIT)
  // -------------------------------------------------------------
  const handleOpenAddForm = () => {
    setEditingIngredientId(null);
    setIngName('');
    setIngCategory(allIngredientCategories[0] || 'Bumbu & Rempah');
    setIngStatus('Aktif');
    setIngUnit(allUnits[0] || 'Kg');
    setIngBuyPrice(10000);
    setIngMinStock(5);
    setShowAddFormModal(true);
  };

  const handleOpenEditForm = (item) => {
    if (!item) return;
    setEditingIngredientId(item.id);
    setIngName(item.name || '');
    setIngCategory(item.category || item.category_name || allIngredientCategories[0] || 'Bumbu & Rempah');
    setIngStatus(item.status || 'Aktif');
    setIngUnit(item.unit || allUnits[0] || 'Kg');
    setIngBuyPrice(item.avg_buy_price || item.price || item.last_buy_price || 0);
    setIngMinStock(item.min_stock !== undefined && item.min_stock !== null ? item.min_stock : 5);
    setShowAddFormModal(true);
  };

  const handleSaveIngredient = (e) => {
    e.preventDefault();
    if (!ingName.trim()) {
      alert('Mohon isi Nama Bahan Baku');
      return;
    }

    const priceNum = parseFloat(ingBuyPrice) || 0;
    const minStockNum = parseFloat(ingMinStock) || 0;

    const code = editingIngredientId
      ? masterData?.ingredients?.find(i => String(i.id) === String(editingIngredientId))?.code || generateNextIngredientCode()
      : generateNextIngredientCode();

    const payload = {
      id: editingIngredientId || Date.now(),
      code,
      name: ingName.trim().toUpperCase(),
      category: ingCategory.trim(),
      category_name: ingCategory.trim(),
      unit: ingUnit,
      satuan: ingUnit,
      price: priceNum,
      avg_buy_price: priceNum,
      min_stock: minStockNum,
      status: ingStatus,
      financial_account: 'Harga Pokok Produksi (HPP/COGS)',
      _updatedAt: Date.now()
    };

    const updated = { ...masterData };
    if (!updated.ingredients) updated.ingredients = [];

    if (editingIngredientId) {
      const idx = updated.ingredients.findIndex(i => String(i.id) === String(editingIngredientId));
      if (idx !== -1) updated.ingredients[idx] = { ...updated.ingredients[idx], ...payload };
      else updated.ingredients.unshift(payload);
    } else {
      updated.ingredients.unshift(payload);
    }

    // Sync ingredient name & price in product compositions if editing
    if (editingIngredientId && updated.products) {
      updated.products = updated.products.map(p => {
        if (Array.isArray(p.compositions)) {
          const hasMatched = p.compositions.some(c => String(c.ingredient_id) === String(editingIngredientId));
          if (hasMatched) {
            const newComps = p.compositions.map(c => {
              if (String(c.ingredient_id) === String(editingIngredientId)) {
                return {
                  ...c,
                  ingredient_name: payload.name
                };
              }
              return c;
            });
            return { ...p, compositions: newComps, _lastUpdated: Date.now() };
          }
        }
        return p;
      });
    }

    updated._lastUpdated = Date.now();
    setMasterData(updated);
    setShowAddFormModal(false);
    alert(`Bahan baku "${payload.name}" (${payload.code}) berhasil disimpan!`);
  };

  // -------------------------------------------------------------
  // DELETE INGREDIENT (DELETE GUARD)
  // -------------------------------------------------------------
  const handleDeleteIngredient = (id, name) => {
    if (!allowDelete) {
      alert('Anda tidak memiliki hak akses untuk menghapus bahan baku.');
      return;
    }

    const connected = getConnectedRecipes(id, name);
    if (connected.length > 0) {
      alert(`⚠️ PENGAMAN HAPUS (DELETE GUARD):\n\nBahan baku "${name}" tidak dapat dihapus karena masih digunakan dalam ${connected.length} resep menu aktif:\n\n• ${connected.slice(0, 5).map(c => c.product.name).join('\n• ')}${connected.length > 5 ? `\n...dan ${connected.length - 5} menu lainnya.` : ''}\n\nSilakan ubah resep menu produk terlebih dahulu (klik tombol "Lihat Resep").`);
      return;
    }

    if (!window.confirm(`Apakah Anda yakin ingin menghapus bahan baku "${name}"?`)) {
      return;
    }

    const updated = {
      ...masterData,
      _lastUpdated: Date.now(),
      ingredients: (masterData?.ingredients || []).filter(i => String(i.id) !== String(id))
    };
    setMasterData(updated);
    alert(`Bahan baku "${name}" berhasil dihapus.`);
  };

  // -------------------------------------------------------------
  // SMART-MERGE DUPLICATE INGREDIENTS
  // -------------------------------------------------------------
  const handleMergeIngredientGroup = (group) => {
    if (!allowEdit) {
      alert('Anda tidak memiliki hak akses untuk mengedit bahan baku.');
      return;
    }

    const masterIng = group.items[0];
    const duplicateIds = group.items.slice(1).map(i => String(i.id));

    if (!confirm(`Gabungkan ${group.items.length} bahan baku "${group.name}" menjadi 1 Bahan Master (${masterIng.code})?\n\n• Seluruh resep menu (BOM) yang menggunakan bahan duplikat akan otomatis ditautkan ke Bahan Master ini.`)) {
      return;
    }

    // Update product compositions
    const updatedProducts = (masterData?.products || []).map(p => {
      if (Array.isArray(p.compositions)) {
        let hasModified = false;
        const newComps = p.compositions.map(c => {
          if (duplicateIds.includes(String(c.ingredient_id)) || group.items.some(it => it.name === c.ingredient_name)) {
            hasModified = true;
            return {
              ...c,
              ingredient_id: masterIng.id,
              ingredient_name: masterIng.name
            };
          }
          return c;
        });
        if (hasModified) {
          return { ...p, compositions: newComps, _lastUpdated: Date.now() };
        }
      }
      return p;
    });

    const updatedIngs = (masterData?.ingredients || []).filter(i => !duplicateIds.includes(String(i.id)));

    setMasterData({
      ...masterData,
      ingredients: updatedIngs,
      products: updatedProducts,
      _lastUpdated: Date.now()
    });

    alert(`Bahan baku "${group.name}" berhasil digabungkan ke Master (${masterIng.code})!`);
  };

  const handleMergeAllDuplicateIngredients = () => {
    if (!allowEdit || duplicateIngredientGroups.length === 0) return;
    if (!confirm(`Satukan ${duplicateIngredientGroups.length} grup bahan baku duplikat menjadi Bahan Master? Seluruh resep menu akan otomatis ditautkan.`)) {
      return;
    }

    let curIngs = [...(masterData?.ingredients || [])];
    let curProds = [...(masterData?.products || [])];

    duplicateIngredientGroups.forEach(group => {
      const masterIng = group.items[0];
      const duplicateIds = group.items.slice(1).map(i => String(i.id));

      curProds = curProds.map(p => {
        if (Array.isArray(p.compositions)) {
          let hasModified = false;
          const newComps = p.compositions.map(c => {
            if (duplicateIds.includes(String(c.ingredient_id)) || group.items.some(it => it.name === c.ingredient_name)) {
              hasModified = true;
              return {
                ...c,
                ingredient_id: masterIng.id,
                ingredient_name: masterIng.name
              };
            }
            return c;
          });
          if (hasModified) {
            return { ...p, compositions: newComps, _lastUpdated: Date.now() };
          }
        }
        return p;
      });

      curIngs = curIngs.filter(i => !duplicateIds.includes(String(i.id)));
    });

    setMasterData({
      ...masterData,
      ingredients: curIngs,
      products: curProds,
      _lastUpdated: Date.now()
    });

    setShowMergeModal(false);
    alert(`🎉 Sukses! ${duplicateIngredientGroups.length} grup bahan baku duplikat berhasil disatukan.`);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }} className="animate-fade-in">
      {/* ------------------------------------------------------------- */}
      {/* 1. HEADER SECTION & MAIN ACTIONS                              */}
      {/* ------------------------------------------------------------- */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <h2 style={{ fontSize: '1.05rem', fontWeight: '900', color: T.txtPrimary, letterSpacing: '-0.01em', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShoppingBasket size={20} color={T.primary} />
            <span>Data Bahan Baku (Ingredients Master)</span>
          </h2>
          <p style={{ color: T.txtSecondary, fontSize: '0.74rem', marginTop: '3px', margin: 0 }}>
            Master bahan baku dapur, harga modal beli standar, batas stok kritis, dan pemakaian resep BOM
          </p>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          {duplicateIngredientGroups.length > 0 && (
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
              <span>Cek {duplicateIngredientGroups.length} Bahan Duplikat</span>
            </button>
          )}

          {onNavigateToCategories && (
            <button
              type="button"
              onClick={onNavigateToCategories}
              style={{
                background: T.cardBg2,
                color: T.txtPrimary,
                border: `1px solid ${T.borderStrong}`,
                padding: '8px 14px',
                borderRadius: '8px',
                fontWeight: '800',
                fontSize: '0.76rem',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer'
              }}
            >
              <Layers size={15} color={T.accentGold} />
              <span>Kelola Kategori Bahan</span>
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
              onClick={handleOpenAddForm}
              className="btn-primary"
              style={{ padding: '8px 16px', fontSize: '0.76rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Plus size={16} />
              <span>+ Tambah Bahan Baku</span>
            </button>
          )}
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 2. SUMMARY KPI METRICS (4 CARDS)                              */}
      {/* ------------------------------------------------------------- */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
        {/* Card 1: Total Ingredients */}
        <div style={{ background: T.cardBg, border: `1px solid ${T.borderStrong}`, borderRadius: '14px', padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <span style={{ fontSize: '0.68rem', fontWeight: '800', color: T.txtSecondary, textTransform: 'uppercase' }}>TOTAL BAHAN BAKU</span>
            <div style={{ fontSize: '1.3rem', fontWeight: '900', color: T.txtPrimary, marginTop: '2px' }}>{kpiMetrics.totalIngs} Item</div>
            <span style={{ fontSize: '0.66rem', color: T.info, fontWeight: '700' }}>{kpiMetrics.activeIngs} Bahan Aktif</span>
          </div>
          <div style={{ padding: '8px', borderRadius: '10px', background: T.infoBg, color: T.info }}>
            <ShoppingBasket size={18} />
          </div>
        </div>

        {/* Card 2: Active vs Inactive */}
        <div style={{ background: T.cardBg, border: `1px solid ${T.borderStrong}`, borderRadius: '14px', padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <span style={{ fontSize: '0.68rem', fontWeight: '800', color: T.txtSecondary, textTransform: 'uppercase' }}>STATUS BAHAN</span>
            <div style={{ fontSize: '1.3rem', fontWeight: '900', color: T.success, marginTop: '2px' }}>{kpiMetrics.activeIngs} Aktif</div>
            <span style={{ fontSize: '0.66rem', color: kpiMetrics.inactiveIngs > 0 ? T.danger : T.txtMuted, fontWeight: '700' }}>
              {kpiMetrics.inactiveIngs} Non-Aktif / Diarsipkan
            </span>
          </div>
          <div style={{ padding: '8px', borderRadius: '10px', background: T.successBg, color: T.success }}>
            <CheckCircle2 size={18} />
          </div>
        </div>

        {/* Card 3: Average Buy Price */}
        <div style={{ background: T.cardBg, border: `1px solid ${T.borderStrong}`, borderRadius: '14px', padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <span style={{ fontSize: '0.68rem', fontWeight: '800', color: T.txtSecondary, textTransform: 'uppercase' }}>RATA-RATA HARGA MODAL</span>
            <div style={{ fontSize: '1.3rem', fontWeight: '900', color: T.accentGold, marginTop: '2px' }}>{formatRupiah(kpiMetrics.avgBuyPrice)}</div>
            <span style={{ fontSize: '0.66rem', color: T.txtSecondary }}>Harga Beli Standar Satuan</span>
          </div>
          <div style={{ padding: '8px', borderRadius: '10px', background: T.accentGoldBg, color: T.accentGold }}>
            <DollarSign size={18} />
          </div>
        </div>

        {/* Card 4: Top Used in Recipes */}
        <div style={{ background: T.cardBg, border: `1px solid ${T.borderStrong}`, borderRadius: '14px', padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <span style={{ fontSize: '0.68rem', fontWeight: '800', color: T.txtSecondary, textTransform: 'uppercase' }}>PALING SERING DIPAKAI</span>
            <div style={{ fontSize: '0.96rem', fontWeight: '900', color: T.primary, marginTop: '2px', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '160px' }}>
              {kpiMetrics.topIngName}
            </div>
            <span style={{ fontSize: '0.66rem', color: T.success, fontWeight: '700' }}>Komponen Resep Menu Utama</span>
          </div>
          <div style={{ padding: '8px', borderRadius: '10px', background: T.primaryBtn, color: T.navActiveTxt }}>
            <Utensils size={18} />
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
          <div style={{ position: 'relative', width: '220px' }}>
            <Search size={14} color={T.txtMuted} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              placeholder="Cari nama / kode bahan..."
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

          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={e => { setCategoryFilter(e.target.value); setCurrentPage(1); }}
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
            <option value="Semua">Semua Kategori Bahan</option>
            {allIngredientCategories.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

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
      {/* 4. INGREDIENTS LISTING (GRID OR TABLE)                        */}
      {/* ------------------------------------------------------------- */}
      {filteredIngredients.length === 0 ? (
        <div style={{
          background: T.cardBg,
          border: `1px solid ${T.borderStrong}`,
          borderRadius: '16px',
          padding: '48px 24px',
          textAlign: 'center',
          color: T.txtMuted
        }}>
          <ShoppingBasket size={36} color={T.txtMuted} style={{ margin: '0 auto 12px auto' }} />
          <h4 style={{ fontSize: '0.94rem', fontWeight: '800', color: T.txtPrimary, margin: 0 }}>Tidak ada bahan baku ditemukan</h4>
          <p style={{ fontSize: '0.74rem', color: T.txtSecondary, marginTop: '4px' }}>Coba ubah kata kunci pencarian atau filter kategori di atas.</p>
        </div>
      ) : displayMode === 'grid' ? (
        /* GRID MODE */
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '14px' }}>
          {paginatedIngredients.map(ing => {
            const connected = getConnectedRecipes(ing.id, ing.name);
            const isAktif = (ing.status || 'Aktif') === 'Aktif';
            const price = Number(ing.avg_buy_price || ing.price || ing.last_buy_price || 0);

            return (
              <div
                key={ing.id}
                className="glass-card"
                style={{
                  background: T.cardBg,
                  border: `1px solid ${T.borderStrong}`,
                  borderRadius: '14px',
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '12px'
                }}
              >
                <div>
                  {/* Top: Code & Status */}
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
                      {ing.code || `BHN-00${ing.id}`}
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

                  {/* Title & Category Badge */}
                  <h3 style={{ fontSize: '0.94rem', fontWeight: '900', color: T.txtPrimary, margin: '0 0 6px 0', textTransform: 'uppercase' }}>
                    {ing.name}
                  </h3>

                  {Boolean(ing.needs_review || ing.status_katalog === 'perlu_diedit' || (ing.notes || '').includes('Perlu Dilengkapi')) && (
                    <div style={{ marginBottom: '6px' }}>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '0.62rem',
                        fontWeight: '800',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        background: 'rgba(239, 68, 68, 0.2)',
                        border: '1px solid #ef4444',
                        color: '#f87171'
                      }}>
                        ⚠️ Perlu Diedit / Dilengkapi (Dari Impor)
                      </span>
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginBottom: '10px' }}>
                    <span style={{
                      fontSize: '0.66rem',
                      fontWeight: '700',
                      background: T.accentGoldBg,
                      color: T.accentGold,
                      padding: '2px 6px',
                      borderRadius: '4px',
                      border: `1px solid ${T.accentGoldBorder}`
                    }}>
                      {ing.category || ing.category_name || 'Bumbu & Rempah'}
                    </span>
                    <span style={{ fontSize: '0.66rem', color: T.txtSecondary, fontWeight: '700' }}>
                      • Satuan: <strong style={{ color: T.info }}>{ing.unit || ing.satuan || 'Kg'}</strong>
                    </span>
                  </div>

                  {/* Price & Recipe Usage Box */}
                  <div style={{ background: T.cardBg2, border: `1px solid ${T.borderStrong}`, borderRadius: '10px', padding: '10px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <span style={{ fontSize: '0.62rem', color: T.txtSecondary, fontWeight: '700' }}>HARGA BELI MODAL</span>
                      <div style={{ fontSize: '1.05rem', fontWeight: '900', color: T.accentGold }}>{formatRupiah(price)}</div>
                      <span style={{ fontSize: '0.62rem', color: T.txtMuted }}>Per {ing.unit || 'Kg'}</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setShowDrilldownModal(ing)}
                      style={{
                        background: T.infoBg,
                        border: `1px solid ${T.infoBorder}`,
                        color: T.info,
                        fontSize: '0.68rem',
                        fontWeight: '800',
                        padding: '5px 8px',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                      title="Klik untuk melihat menu apa saja yang menggunakan bahan ini"
                    >
                      <Eye size={12} />
                      <span>{connected.length} Resep</span>
                    </button>
                  </div>
                </div>

                {/* Bottom Actions */}
                <div style={{ display: 'flex', gap: '6px', paddingTop: '10px', borderTop: `1px solid ${T.border}` }}>
                  <button
                    type="button"
                    onClick={() => setSelectedIngredientDetail(ing)}
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
                      onClick={() => handleOpenEditForm(ing)}
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
                      onClick={() => handleDeleteIngredient(ing.id, ing.name)}
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
                      title="Hapus Bahan Baku"
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
                  <th style={{ padding: '10px 12px', fontWeight: '800' }}>NAMA BAHAN BAKU</th>
                  <th style={{ padding: '10px 12px', fontWeight: '800' }}>KATEGORI</th>
                  <th style={{ padding: '10px 12px', fontWeight: '800' }}>SATUAN UNIT</th>
                  <th style={{ padding: '10px 12px', fontWeight: '800', textAlign: 'right' }}>HARGA MODAL BELI</th>
                  <th style={{ padding: '10px 12px', fontWeight: '800', textAlign: 'center' }}>RESEP TERHUBUNG</th>
                  <th style={{ padding: '10px 12px', fontWeight: '800', textAlign: 'center' }}>STATUS</th>
                  <th style={{ padding: '10px 12px', fontWeight: '800', textAlign: 'center' }}>AKSI</th>
                </tr>
              </thead>
              <tbody>
                {paginatedIngredients.map(ing => {
                  const connected = getConnectedRecipes(ing.id, ing.name);
                  const isAktif = (ing.status || 'Aktif') === 'Aktif';
                  const price = Number(ing.avg_buy_price || ing.price || ing.last_buy_price || 0);

                  return (
                    <tr key={ing.id} style={{ borderBottom: `1px solid ${T.border}`, color: T.txtPrimary }}>
                      {/* Code */}
                      <td style={{ padding: '10px 12px' }}>
                        <span style={{ fontFamily: 'monospace', fontWeight: '800', color: T.info, background: T.infoBg, border: `1px solid ${T.infoBorder}`, padding: '2px 6px', borderRadius: '4px' }}>
                          {ing.code || `BHN-00${ing.id}`}
                        </span>
                      </td>

                      {/* Name */}
                      <td style={{ padding: '10px 12px', fontWeight: '800', textTransform: 'uppercase' }}>
                        <div>
                          <button
                            type="button"
                            onClick={() => setSelectedIngredientDetail(ing)}
                            style={{ background: 'none', border: 'none', color: T.txtPrimary, fontWeight: '800', cursor: 'pointer', padding: 0, textTransform: 'uppercase' }}
                          >
                            {ing.name}
                          </button>
                        </div>
                        {Boolean(ing.needs_review || ing.status_katalog === 'perlu_diedit' || (ing.notes || '').includes('Perlu Dilengkapi')) && (
                          <div style={{ marginTop: '2px' }}>
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              fontSize: '0.60rem',
                              fontWeight: '800',
                              padding: '1px 5px',
                              borderRadius: '4px',
                              background: 'rgba(239, 68, 68, 0.2)',
                              border: '1px solid #ef4444',
                              color: '#f87171'
                            }}>
                              ⚠️ Perlu Diedit
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Category */}
                      <td style={{ padding: '10px 12px' }}>
                        <span style={{ fontSize: '0.66rem', background: T.accentGoldBg, color: T.accentGold, padding: '2px 6px', borderRadius: '4px', fontWeight: '700' }}>
                          {ing.category || ing.category_name || 'Bumbu & Rempah'}
                        </span>
                      </td>

                      {/* Unit */}
                      <td style={{ padding: '10px 12px' }}>
                        <span style={{ fontWeight: '800', color: T.info }}>
                          {ing.unit || ing.satuan || 'Kg'}
                        </span>
                      </td>

                      {/* Price */}
                      <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: '900', color: T.accentGold }}>
                        {formatRupiah(price)}
                      </td>

                      {/* Connected Recipes */}
                      <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                        <button
                          type="button"
                          onClick={() => setShowDrilldownModal(ing)}
                          style={{
                            background: 'none',
                            border: `1px solid ${T.border}`,
                            color: T.info,
                            borderRadius: '4px',
                            padding: '2px 6px',
                            fontSize: '0.66rem',
                            cursor: 'pointer',
                            fontWeight: '700'
                          }}
                        >
                          {connected.length} Resep
                        </button>
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
                            onClick={() => setSelectedIngredientDetail(ing)}
                            style={{ background: 'none', border: 'none', color: T.info, cursor: 'pointer', padding: '3px' }}
                            title="Analisis Pemakaian Bahan"
                          >
                            <TrendingUp size={15} />
                          </button>

                          {allowEdit && (
                            <button
                              type="button"
                              onClick={() => handleOpenEditForm(ing)}
                              style={{ background: 'none', border: 'none', color: T.txtPrimary, cursor: 'pointer', padding: '3px' }}
                              title="Edit Bahan Baku"
                            >
                              <Edit3 size={15} />
                            </button>
                          )}

                          {allowDelete && (
                            <button
                              type="button"
                              onClick={() => handleDeleteIngredient(ing.id, ing.name)}
                              style={{ background: 'none', border: 'none', color: T.danger, cursor: 'pointer', padding: '3px' }}
                              title="Hapus Bahan Baku"
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
      {/* MODAL: TAMBAH / EDIT BAHAN BAKU                               */}
      {/* ------------------------------------------------------------- */}
      {showAddFormModal && (
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
            maxWidth: '540px',
            background: T.cardBg,
            border: `1px solid ${T.borderStrong}`,
            borderRadius: '16px',
            padding: '24px',
            boxShadow: '0 25px 50px rgba(0,0,0,0.6)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: '900', color: T.txtPrimary, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ShoppingBasket size={18} color={T.primary} />
                  <span>{editingIngredientId ? 'Edit Bahan Baku' : 'Tambah Bahan Baku Baru'}</span>
                </h3>
                <p style={{ fontSize: '0.72rem', color: T.txtSecondary, margin: '3px 0 0 0' }}>
                  Konfigurasi kategori, satuan unit master, dan estimasi harga modal beli
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddFormModal(false)}
                style={{ background: 'none', border: 'none', color: T.txtSecondary, cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveIngredient} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Code */}
              <div>
                <label style={{ fontSize: '0.72rem', color: T.txtSecondary, fontWeight: '700', display: 'block', marginBottom: '4px' }}>
                  KODE BAHAN BAKU (OTOMATIS)
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
                    {editingIngredientId ? (masterData?.ingredients?.find(i => String(i.id) === String(editingIngredientId))?.code || 'BHN-001') : generateNextIngredientCode()}
                  </span>
                  <span style={{ fontSize: '0.64rem', color: T.success, background: T.successBg, border: `1px solid ${T.successBorder}`, padding: '2px 6px', borderRadius: '4px', fontWeight: '800' }}>
                    ✓ Auto-Generated
                  </span>
                </div>
              </div>

              {/* Name */}
              <div>
                <label style={{ fontSize: '0.72rem', color: T.txtSecondary, fontWeight: '700', display: 'block', marginBottom: '4px' }}>
                  NAMA BAHAN BAKU *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: AYAM KAMPUNG, BERAS KELUARGA, MINYAK GORENG..."
                  value={ingName}
                  onChange={e => setIngName(e.target.value)}
                  className="form-input"
                  style={{ background: T.inputBg, border: `1px solid ${T.border}`, color: T.txtPrimary, textTransform: 'uppercase' }}
                  autoFocus
                />
              </div>

              {/* Category & Unit Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.72rem', color: T.txtSecondary, fontWeight: '700', display: 'block', marginBottom: '4px' }}>
                    KATEGORI BAHAN
                  </label>
                  <select
                    value={ingCategory}
                    onChange={e => setIngCategory(e.target.value)}
                    className="form-select"
                    style={{ background: T.inputBg, border: `1px solid ${T.border}`, color: T.txtPrimary, width: '100%' }}
                  >
                    {allIngredientCategories.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '0.72rem', color: T.txtSecondary, fontWeight: '700', display: 'block', marginBottom: '4px' }}>
                    SATUAN UNIT MASTER
                  </label>
                  <select
                    value={ingUnit}
                    onChange={e => setIngUnit(e.target.value)}
                    className="form-select"
                    style={{ background: T.inputBg, border: `1px solid ${T.border}`, color: T.txtPrimary, width: '100%' }}
                  >
                    {allUnits.map(u => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Buy Price & Min Stock Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.72rem', color: T.txtSecondary, fontWeight: '700', display: 'block', marginBottom: '4px' }}>
                    HARGA MODAL BELI / SATUAN (RP)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={ingBuyPrice}
                    onChange={e => setIngBuyPrice(e.target.value)}
                    className="form-input"
                    style={{ background: T.inputBg, border: `1px solid ${T.border}`, color: T.accentGold, fontWeight: '900' }}
                  />
                  <span style={{ fontSize: '0.62rem', color: T.txtMuted, marginTop: '2px', display: 'block' }}>
                    {formatRupiah(ingBuyPrice)} / {ingUnit}
                  </span>
                </div>

                <div>
                  <label style={{ fontSize: '0.72rem', color: T.txtSecondary, fontWeight: '700', display: 'block', marginBottom: '4px' }}>
                    STATUS BAHAN
                  </label>
                  <select
                    value={ingStatus}
                    onChange={e => setIngStatus(e.target.value)}
                    className="form-select"
                    style={{ background: T.inputBg, border: `1px solid ${T.border}`, color: T.txtPrimary, width: '100%' }}
                  >
                    <option value="Aktif">● Aktif Digunakan</option>
                    <option value="Inaktif">● Non-Aktif</option>
                  </select>
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '12px' }}>
                <button
                  type="button"
                  onClick={() => setShowAddFormModal(false)}
                  style={{ background: T.cardBg2, border: `1px solid ${T.border}`, padding: '8px 16px', borderRadius: '8px', color: T.txtSecondary, fontSize: '0.76rem', fontWeight: '700', cursor: 'pointer' }}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  style={{ padding: '8px 20px', fontSize: '0.76rem', fontWeight: '800' }}
                >
                  Simpan Bahan Baku
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: DRILLDOWN RESEP MENU TERHUBUNG (CONNECTED BOM RECIPES) */}
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
                  <span>Resep Menu: {showDrilldownModal.name}</span>
                </h3>
                <p style={{ fontSize: '0.72rem', color: T.txtSecondary, margin: '3px 0 0 0' }}>
                  Daftar menu produk yang menggunakan bahan baku ini beserta takaran resepnya
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

            {getConnectedRecipes(showDrilldownModal.id, showDrilldownModal.name).length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px 16px', color: T.txtMuted }}>
                <ShoppingBasket size={36} color={T.txtMuted} style={{ margin: '0 auto 8px auto' }} />
                <h4 style={{ fontSize: '0.92rem', fontWeight: '800', color: T.txtPrimary, margin: 0 }}>Belum Digunakan dalam Resep Menu</h4>
                <p style={{ fontSize: '0.72rem', color: T.txtSecondary, marginTop: '4px' }}>Bahan baku ini belum dikonfigurasikan pada menu makanan/minuman mana pun.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {getConnectedRecipes(showDrilldownModal.id, showDrilldownModal.name).map(({ product, composition }) => (
                  <div
                    key={product.id}
                    style={{
                      background: T.cardBg2,
                      border: `1px solid ${T.border}`,
                      borderRadius: '10px',
                      padding: '10px 14px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      fontSize: '0.74rem'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: T.cardBg, border: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Utensils size={18} color={T.primary} />
                      </div>
                      <div>
                        <div style={{ fontWeight: '800', color: T.txtPrimary, textTransform: 'uppercase' }}>{product.name}</div>
                        <div style={{ fontSize: '0.66rem', color: T.txtSecondary }}>
                          Kategori: <strong style={{ color: T.info }}>{product.category_name || product.category || 'Menu'}</strong> • Harga: <strong style={{ color: T.accentGold }}>{formatRupiah(product.price)}</strong>
                        </div>
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: '0.64rem', color: T.txtSecondary }}>TAKARAN RESEP (BOM)</span>
                      <div style={{ fontSize: '0.86rem', fontWeight: '900', color: T.success }}>
                        {composition.qty || composition.amount || 1} {composition.unit || showDrilldownModal.unit || 'Kg'} / Porsi
                      </div>
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
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: SMART-MERGE BAHAN BAKU DUPLIKAT                         */}
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
                  <span>Smart-Merge Bahan Baku Duplikat</span>
                </h3>
                <p style={{ fontSize: '0.72rem', color: T.txtSecondary, margin: '3px 0 0 0' }}>
                  Satukan bahan baku bernama sama dan otomatis tautkan seluruh resep menu ke Bahan Master
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

            {duplicateIngredientGroups.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px 16px', color: T.txtMuted }}>
                <CheckCircle2 size={36} color={T.success} style={{ margin: '0 auto 8px auto' }} />
                <h4 style={{ fontSize: '0.92rem', fontWeight: '800', color: T.txtPrimary, margin: 0 }}>Semua Bahan Baku Bersih!</h4>
                <p style={{ fontSize: '0.72rem', color: T.txtSecondary, marginTop: '4px' }}>Tidak ada bahan baku dengan nama duplikat yang terdeteksi.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {duplicateIngredientGroups.map(grp => (
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
                          ⚠️ {grp.count} Bahan Terdaftar dengan Nama Sama
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleMergeIngredientGroup(grp)}
                        className="btn-primary"
                        style={{ padding: '6px 12px', fontSize: '0.72rem', fontWeight: '800' }}
                      >
                        Gabungkan Grup Ini
                      </button>
                    </div>

                    <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {grp.items.map((it, idx) => {
                        const recs = getConnectedRecipes(it.id, it.name);
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
                              <span style={{ color: T.txtPrimary }}>{it.name} ({it.unit || 'Kg'})</span>
                            </div>
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                              <span style={{ fontWeight: '800', color: T.accentGold }}>{formatRupiah(it.avg_buy_price || it.price || 0)}</span>
                              <span style={{ color: T.txtMuted }}>• {recs.length} Resep</span>
                            </div>
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

              {duplicateIngredientGroups.length > 0 && allowEdit && (
                <button
                  type="button"
                  onClick={handleMergeAllDuplicateIngredients}
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
                  <span>⚡ Auto-Merge Semua Duplikat ({duplicateIngredientGroups.length})</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: DETAIL BAHAN BAKU ANALYTICS                            */}
      {/* ------------------------------------------------------------- */}
      {selectedIngredientDetail && (
        <IngredientAnalyticsDetailModal
          ingredient={selectedIngredientDetail}
          masterData={masterData}
          onClose={() => setSelectedIngredientDetail(null)}
          themeMode={themeMode}
        />
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: EXCEL MASTER IMPORT                                    */}
      {/* ------------------------------------------------------------- */}
      {showExcelImportModal && (
        <ExcelMasterImportModal
          show={showExcelImportModal}
          isOpen={showExcelImportModal}
          moduleType="ingredients"
          masterData={masterData}
          setMasterData={setMasterData}
          onClose={() => setShowExcelImportModal(false)}
          themeMode={themeMode}
        />
      )}
    </div>
  );
}
