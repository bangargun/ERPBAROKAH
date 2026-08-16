import React, { useState, useEffect, useMemo } from 'react';
import { 
  Package, 
  Plus, 
  Search, 
  Edit3, 
  Trash2, 
  CheckCircle2, 
  AlertCircle, 
  Image as ImageIcon, 
  UploadCloud,
  X, 
  Eye, 
  Store, 
  Layers, 
  ShoppingBasket,
  DollarSign,
  Grid,
  LayoutGrid,
  BarChart3,
  TrendingUp,
  TrendingDown,
  Percent,
  Sparkles,
  HelpCircle,
  FileSpreadsheet,
  Check,
  RotateCcw,
  SlidersHorizontal,
  ChevronRight,
  Utensils,
  Palette
} from 'lucide-react';
import MenuAnalyticsDetailModal from './MenuAnalyticsDetailModal';
import PaginationControls from './PaginationControls';
import ExcelMasterImportModal from './ExcelMasterImportModal';
import { getThemePalette } from '../../utils/themeUtils';
import DeleteGuardModal from './DeleteGuardModal';
import { requestDelete, countRelatedTransactions } from '../../utils/deleteGuard';
import { canDeleteModule, canEditModule } from '../../utils/permissionUtils';

export default function ProductManagement({ masterData, setMasterData, selectedBranch, userSession, themeMode = 'dark' }) {
  const T = getThemePalette(themeMode);
  const allowDelete = canDeleteModule(userSession, 'masterData', masterData?.permissionMatrix);
  const allowEdit = canEditModule(userSession, 'masterData', masterData?.permissionMatrix);
  const [deleteGuardState, setDeleteGuardState] = useState(null);

  // Filter & Search States
  const [searchTerm, setSearchTerm] = useState('');
  const [displayMode, setDisplayMode] = useState('grid'); // 'grid' | 'table'
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('Semua');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('Semua');
  const [selectedOutletFilter, setSelectedOutletFilter] = useState('Semua');

  // Pagination States
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);

  // Sorting
  const [sortField, setSortField] = useState('name');
  const [sortDirection, setSortDirection] = useState('asc');

  // Modals
  const [showFormModal, setShowFormModal] = useState(false);
  const [showExcelImportModal, setShowExcelImportModal] = useState(false);
  const [selectedMenuDetail, setSelectedMenuDetail] = useState(null);
  const [editingProductId, setEditingProductId] = useState(null);

  // Form Modal Sub-Tab ('info' | 'pricing' | 'recipe')
  const [formSubTab, setFormSubTab] = useState('info');

  // FORM STATES
  const [prodName, setProdName] = useState('');
  const [prodSku, setProdSku] = useState('');
  const [prodCategoryId, setProdCategoryId] = useState('');
  const [prodStatus, setProdStatus] = useState('Aktif');
  const [prodImageUrl, setProdImageUrl] = useState('');
  const [isDragging, setIsDragging] = useState(false);

  // Pricing States
  const [basePrice, setBasePrice] = useState(25000);
  const [hasCustomBranchPrices, setHasCustomBranchPrices] = useState(false);
  const [standardPrices, setStandardPrices] = useState({}); // { [outletId]: price }
  const [outletApkStatus, setOutletApkStatus] = useState({}); // { [outletId]: 'Aktif' | 'Inaktif' }

  // Variant States
  const [variants, setVariants] = useState([]); // ['Sambal Pecak', 'Sambal Ijo']
  const [variantPrices, setVariantPrices] = useState({}); // { 'Sambal Pecak': 25000 }
  const [hasCustomVariantPrices, setHasCustomVariantPrices] = useState(false);
  const [tempVariantInput, setTempVariantInput] = useState('');

  // Recipe / Composition States
  const [compositions, setCompositions] = useState([]); // [{ id, ingredient_id, ingredient_name, qty, unit }]

  // Auto-sync selectedOutletFilter with top header selectedBranch
  useEffect(() => {
    if (selectedBranch && selectedBranch !== 'ALL' && selectedBranch !== 'Semua Restoran (Konsolidasi)') {
      setSelectedOutletFilter(String(selectedBranch));
      setCurrentPage(1);
    } else if (selectedBranch === 'ALL' || selectedBranch === 'Semua Restoran (Konsolidasi)') {
      setSelectedOutletFilter('Semua');
      setCurrentPage(1);
    }
  }, [selectedBranch]);

  // Master ingredients & categories
  const allIngredients = useMemo(() => masterData?.ingredients || [], [masterData?.ingredients]);
  const allCategories = useMemo(() => masterData?.categories || [], [masterData?.categories]);
  const allOutlets = useMemo(() => masterData?.outlets || [], [masterData?.outlets]);

  // Format IDR Helper
  const formatRupiah = (val) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val || 0);
  };

  // Dynamic Price Range Helper for Products with Variant Pricing
  const getProductDisplayPrice = (product) => {
    const baseP = Number(product.price || 0);
    const vPrices = product.variantPrices || {};
    const vars = product.variants || [];

    if (vars.length > 0 && typeof vPrices === 'object' && Object.keys(vPrices).length > 0) {
      const prices = vars.map(v => {
        const val = vPrices[v];
        if (typeof val === 'number') return val;
        if (typeof val === 'object') {
          return Number(Object.values(val)[0] || baseP);
        }
        return baseP;
      }).filter(p => p > 0);

      if (prices.length > 0) {
        const minP = Math.min(...prices);
        const maxP = Math.max(...prices);
        if (minP !== maxP) {
          return `${formatRupiah(minP)} - ${formatRupiah(maxP)}`;
        }
        return formatRupiah(minP);
      }
    }
    return formatRupiah(baseP);
  };

  // Helper to generate next sequential product SKU
  const generateNextProductCode = () => {
    const existingCodes = (masterData?.products || [])
      .map(p => p.sku || p.code)
      .filter(code => code && code.startsWith('PRD-'));

    if (existingCodes.length === 0) return 'PRD-001';

    const numbers = existingCodes.map(code => {
      const numPart = code.replace('PRD-', '');
      return parseInt(numPart, 10) || 0;
    });

    const maxNum = Math.max(...numbers, 0);
    const nextNum = maxNum + 1;
    return `PRD-${nextNum.toString().padStart(3, '0')}`;
  };

  // -------------------------------------------------------------
  // HPP & MARGIN CALCULATION HELPER
  // -------------------------------------------------------------
  const calculateProductHpp = (compositionsList) => {
    if (!compositionsList || compositionsList.length === 0) return 0;
    let total = 0;
    compositionsList.forEach(comp => {
      const ing = allIngredients.find(i => String(i.id) === String(comp.ingredient_id));
      if (ing) {
        const ingPrice = Number(ing.avg_buy_price || ing.price || ing.standardPrices?.[selectedBranch] || 0);
        const qtyNum = parseFloat(comp.qty) || 0;
        const ingUnit = String(ing.unit || ing.satuan || '').toLowerCase().trim();
        const compUnit = String(comp.unit || '').toLowerCase().trim();

        let cost = 0;
        if ((ingUnit === 'kg' || ingUnit === 'kilogram') && (compUnit === 'gram' || compUnit === 'gr' || compUnit === 'g')) {
          cost = (qtyNum / 1000) * ingPrice;
        } else if ((ingUnit === 'liter' || ingUnit === 'l') && (compUnit === 'ml' || compUnit === 'mililiter')) {
          cost = (qtyNum / 1000) * ingPrice;
        } else {
          cost = qtyNum * ingPrice;
        }
        total += cost;
      }
    });
    return total;
  };

  // Live modal HPP & Margin
  const liveFormHpp = useMemo(() => calculateProductHpp(compositions), [compositions, allIngredients, selectedBranch]);
  const liveFormSellingPrice = parseFloat(basePrice) || 0;
  const liveFormMarginNominal = Math.max(0, liveFormSellingPrice - liveFormHpp);
  const liveFormMarginPct = liveFormSellingPrice > 0 ? (liveFormMarginNominal / liveFormSellingPrice) * 100 : 0;
  const liveFormHppPct = liveFormSellingPrice > 0 ? (liveFormHpp / liveFormSellingPrice) * 100 : 0;

  // -------------------------------------------------------------
  // FILTERED & SORTED PRODUCTS
  // -------------------------------------------------------------
  const filteredProducts = useMemo(() => {
    return (masterData?.products || []).filter(product => {
      // 1. Search filter
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const name = String(product.name || '').toLowerCase();
        const sku = String(product.sku || product.code || '').toLowerCase();
        const cat = String(product.category_name || product.category || '').toLowerCase();
        if (!name.includes(q) && !sku.includes(q) && !cat.includes(q)) return false;
      }

      // 2. Category filter
      if (selectedCategoryFilter !== 'Semua') {
        const catName = product.category_name || product.category;
        if (String(product.category_id) !== String(selectedCategoryFilter) && catName !== selectedCategoryFilter) {
          return false;
        }
      }

      // 3. Status filter
      if (selectedStatusFilter !== 'Semua') {
        const st = product.status || 'Aktif';
        if (st !== selectedStatusFilter) return false;
      }

      // 4. Outlet filter
      if (selectedOutletFilter !== 'Semua') {
        const outId = selectedOutletFilter;
        const inSelected = (product.selectedOutletIds || []).some(id => String(id) === String(outId));
        const inStdPrices = product.standardPrices && Number(product.standardPrices[outId]) > 0;
        const isAll = product.outlet_id === 'Semua Outlet' || String(product.outlet_id) === String(outId);
        if (!inSelected && !inStdPrices && !isAll) return false;
      }

      return true;
    }).sort((a, b) => {
      if (sortField === 'name') {
        return sortDirection === 'asc' ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name);
      }
      if (sortField === 'price') {
        return sortDirection === 'asc' ? (a.price || 0) - (b.price || 0) : (b.price || 0) - (a.price || 0);
      }
      if (sortField === 'category') {
        const catA = a.category_name || a.category || '';
        const catB = b.category_name || b.category || '';
        return sortDirection === 'asc' ? catA.localeCompare(catB) : catB.localeCompare(catA);
      }
      return 0;
    });
  }, [masterData?.products, searchTerm, selectedCategoryFilter, selectedStatusFilter, selectedOutletFilter, sortField, sortDirection]);

  // KPI Metrics Calculation
  const kpiMetrics = useMemo(() => {
    const prods = masterData?.products || [];
    const activeCount = prods.filter(p => (p.status || 'Aktif') === 'Aktif').length;
    let totalPrice = 0;
    let totalHpp = 0;
    let totalMarginPct = 0;

    prods.forEach(p => {
      const price = Number(p.price || 0);
      const hpp = calculateProductHpp(p.compositions || []);
      totalPrice += price;
      totalHpp += hpp;
      if (price > 0) {
        const margin = Math.max(0, price - hpp);
        totalMarginPct += (margin / price) * 100;
      }
    });

    const totalCount = prods.length || 1;
    const avgPrice = Math.round(totalPrice / totalCount);
    const avgHpp = Math.round(totalHpp / totalCount);
    const avgMarginPct = Math.round(totalMarginPct / totalCount);

    return {
      totalProducts: prods.length,
      activeCount,
      avgPrice,
      avgHpp,
      avgMarginPct
    };
  }, [masterData?.products, allIngredients]);

  // Pagination Slice
  const totalPages = Math.ceil(filteredProducts.length / pageSize) || 1;
  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredProducts.slice(start, start + pageSize);
  }, [filteredProducts, currentPage, pageSize]);

  // -------------------------------------------------------------
  // MODAL OPEN HANDLERS
  // -------------------------------------------------------------
  const handleOpenAddForm = () => {
    setEditingProductId(null);
    setProdSku(generateNextProductCode());
    setProdName('');
    setProdCategoryId(allCategories[0]?.id || '');
    setProdStatus('Aktif');
    setProdImageUrl('');
    setBasePrice(25000);
    setHasCustomBranchPrices(false);

    const initStdPrices = {};
    const initApkStatus = {};
    allOutlets.forEach(o => {
      initStdPrices[o.id] = 25000;
      initApkStatus[o.id] = 'Aktif';
    });
    setStandardPrices(initStdPrices);
    setOutletApkStatus(initApkStatus);
    setVariants([]);
    setVariantPrices({});
    setHasCustomVariantPrices(false);
    setTempVariantInput('');
    setCompositions([]);
    setFormSubTab('info');
    setShowFormModal(true);
  };

  const handleOpenEditForm = (product) => {
    setEditingProductId(product.id);
    setProdSku(product.sku || product.code || generateNextProductCode());
    setProdName(product.name || '');

    const matchedCat = allCategories.find(c => 
      String(c.id) === String(product.category_id) || 
      (c.name && c.name.trim().toUpperCase() === (product.category_name || product.category || '').trim().toUpperCase())
    );
    setProdCategoryId(matchedCat ? matchedCat.id : (product.category_id || allCategories[0]?.id || ''));
    setProdStatus(product.status || 'Aktif');
    setProdImageUrl(product.image_url || '');

    const pPrice = Number(product.price || 0);
    setBasePrice(pPrice);

    const initStdPrices = {};
    const initApkStatus = {};
    let customFound = false;

    allOutlets.forEach(o => {
      const stdVal = product.standardPrices?.[o.id] !== undefined ? product.standardPrices[o.id] : pPrice;
      initStdPrices[o.id] = stdVal;
      initApkStatus[o.id] = product.apkStatus?.[o.id] || product.outletApkStatus?.[o.id] || 'Aktif';
      if (stdVal !== pPrice && pPrice > 0) customFound = true;
    });

    setStandardPrices(initStdPrices);
    setOutletApkStatus(initApkStatus);
    setHasCustomBranchPrices(customFound);

    // Variants load
    const prodVars = Array.isArray(product.variants) ? product.variants : [];
    setVariants(prodVars);
    const vPrices = product.variantPrices || {};
    setVariantPrices(vPrices);
    const hasDiffPrices = prodVars.some(v => vPrices[v] && Number(vPrices[v]) !== pPrice);
    setHasCustomVariantPrices(hasDiffPrices);
    setTempVariantInput('');

    setCompositions(product.compositions || []);
    setFormSubTab('info');
    setShowFormModal(true);
  };

  // -------------------------------------------------------------
  // VARIANT HANDLERS
  // -------------------------------------------------------------
  const handleAddVariant = () => {
    if (!tempVariantInput.trim()) return;
    const vName = tempVariantInput.trim();
    if (!variants.includes(vName)) {
      setVariants([...variants, vName]);
      setVariantPrices(prev => ({ ...prev, [vName]: parseFloat(basePrice) || 0 }));
    }
    setTempVariantInput('');
  };

  const handleRemoveVariant = (vName) => {
    setVariants(variants.filter(v => v !== vName));
    const copy = { ...variantPrices };
    delete copy[vName];
    setVariantPrices(copy);
  };

  // -------------------------------------------------------------
  // COMPOSITION ROW HANDLERS
  // -------------------------------------------------------------
  const handleAddCompositionRow = () => {
    const firstIng = allIngredients[0];
    setCompositions(prev => [
      ...prev,
      {
        id: Date.now() + Math.random(),
        ingredient_id: firstIng ? firstIng.id : '',
        ingredient_name: firstIng ? firstIng.name : '',
        qty: 100,
        unit: firstIng ? (firstIng.unit || 'Gram') : 'Gram'
      }
    ]);
  };

  const handleUpdateCompositionRow = (compId, field, val) => {
    setCompositions(prev => prev.map(c => {
      if (c.id !== compId) return c;
      if (field === 'ingredient_id') {
        const ing = allIngredients.find(i => String(i.id) === String(val));
        return {
          ...c,
          ingredient_id: val,
          ingredient_name: ing ? ing.name : c.ingredient_name,
          unit: ing ? (ing.unit || 'Gram') : c.unit
        };
      }
      return { ...c, [field]: val };
    }));
  };

  const handleRemoveCompositionRow = (compId) => {
    setCompositions(prev => prev.filter(c => c.id !== compId));
  };

  // -------------------------------------------------------------
  // SAVE PRODUCT HANDLER
  // -------------------------------------------------------------
  const handleSaveProduct = (e) => {
    e.preventDefault();
    if (!prodName.trim()) {
      alert('Mohon masukkan Nama Menu Produk.');
      setFormSubTab('info');
      return;
    }

    const priceNum = parseFloat(basePrice) || 0;
    const catObj = allCategories.find(c => String(c.id) === String(prodCategoryId));
    const catName = catObj ? catObj.name : 'Makanan Utama';

    // Prepare outlet prices
    const savedStdPrices = {};
    const savedApkStatus = {};
    const selectedOutIds = [];

    allOutlets.forEach(o => {
      const p = hasCustomBranchPrices ? (parseFloat(standardPrices[o.id]) || priceNum) : priceNum;
      savedStdPrices[o.id] = p;
      savedApkStatus[o.id] = outletApkStatus[o.id] || 'Aktif';
      selectedOutIds.push(o.id);
    });

    const savedVariantPrices = {};
    if (variants.length > 0) {
      variants.forEach(v => {
        savedVariantPrices[v] = hasCustomVariantPrices ? (parseFloat(variantPrices[v]) || priceNum) : priceNum;
      });
    }

    const productPayload = {
      id: editingProductId || Date.now(),
      sku: prodSku.trim().toUpperCase() || generateNextProductCode(),
      code: prodSku.trim().toUpperCase() || generateNextProductCode(),
      name: prodName.trim().toUpperCase(),
      category_id: prodCategoryId || (allCategories[0]?.id || 1),
      category_name: catName,
      category: catName,
      price: priceNum,
      cost: liveFormHpp,
      unit: 'Pcs',
      status: prodStatus,
      image_url: prodImageUrl.trim() || 'https://images.unsplash.com/photo-1544025162-d76694265947?w=400',
      outlet_id: 'Semua Outlet',
      selectedOutletIds: selectedOutIds,
      standardPrices: savedStdPrices,
      apkStatus: savedApkStatus,
      outletApkStatus: savedApkStatus,
      variants: variants,
      variantPrices: savedVariantPrices,
      compositions: compositions,
      _lastUpdated: Date.now()
    };

    let updatedProducts = [...(masterData?.products || [])];
    if (editingProductId) {
      const idx = updatedProducts.findIndex(p => String(p.id) === String(editingProductId));
      if (idx !== -1) {
        updatedProducts[idx] = { ...updatedProducts[idx], ...productPayload };
      }
    } else {
      updatedProducts.unshift(productPayload);
    }

    setMasterData({
      ...masterData,
      products: updatedProducts,
      _lastUpdated: Date.now()
    });

    setShowFormModal(false);
    alert(`Menu "${productPayload.name}" berhasil disimpan!`);
  };

  // -------------------------------------------------------------
  // DELETE PRODUCT HANDLER
  // -------------------------------------------------------------
  const handleDeleteProduct = (id, name) => {
    if (!allowDelete) {
      alert('Anda tidak memiliki izin untuk menghapus menu produk.');
      return;
    }

    requestDelete({
      masterData,
      type: 'product',
      id,
      name,
      setDeleteGuardState,
      onConfirmed: () => {
        const updated = (masterData?.products || []).filter(p => String(p.id) !== String(id));
        setMasterData({ ...masterData, products: updated, _lastUpdated: Date.now() });
      }
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', background: T.pageBg, color: T.txtPrimary }} className="animate-fade-in">
      
      {/* ------------------------------------------------------------- */}
      {/* 1. TOP HEADER & ACTION BUTTONS                                */}
      {/* ------------------------------------------------------------- */}
      <div style={{
        background: T.cardBg,
        border: `1px solid ${T.borderStrong}`,
        borderRadius: '16px',
        padding: '16px 20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '14px',
        boxShadow: T.shadowSm
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ padding: '6px', borderRadius: '10px', background: T.primary, color: T.txtInverse }}>
              <Package size={20} />
            </div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '900', color: T.txtPrimary, margin: 0, letterSpacing: '-0.02em' }}>
              Katalog Menu &amp; Resep HPP
            </h2>
            <span style={{ fontSize: '0.68rem', padding: '2px 8px', borderRadius: '6px', background: T.infoBg, color: T.info, border: `1px solid ${T.infoBorder}`, fontWeight: '800' }}>
              PRODUCT MASTER
            </span>
          </div>
          <p style={{ color: T.txtSecondary, fontSize: '0.74rem', marginTop: '4px', margin: 0 }}>
            Kelola daftar menu makanan, harga jual cabang, resep komposisi bahan baku (BOM), dan estimasi modal HPP per porsi.
          </p>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
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
              <span>+ Tambah Menu Baru</span>
            </button>
          )}
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 2. KPI SUMMARY METRIC CARDS (4 CARDS)                         */}
      {/* ------------------------------------------------------------- */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
        {/* Card 1: Total Products */}
        <div style={{ background: T.cardBg, border: `1px solid ${T.borderStrong}`, borderRadius: '14px', padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <span style={{ fontSize: '0.68rem', fontWeight: '800', color: T.txtSecondary, textTransform: 'uppercase' }}>TOTAL ITEM MENU</span>
            <div style={{ fontSize: '1.3rem', fontWeight: '900', color: T.txtPrimary, marginTop: '2px' }}>{kpiMetrics.totalProducts} Produk</div>
            <span style={{ fontSize: '0.66rem', color: T.success, fontWeight: '700' }}>{kpiMetrics.activeCount} Menu Aktif Dijual</span>
          </div>
          <div style={{ padding: '8px', borderRadius: '10px', background: T.infoBg, color: T.info }}>
            <Utensils size={18} />
          </div>
        </div>

        {/* Card 2: Average Price */}
        <div style={{ background: T.cardBg, border: `1px solid ${T.borderStrong}`, borderRadius: '14px', padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <span style={{ fontSize: '0.68rem', fontWeight: '800', color: T.txtSecondary, textTransform: 'uppercase' }}>RATA-RATA HARGA JUAL</span>
            <div style={{ fontSize: '1.3rem', fontWeight: '900', color: T.accentGold, marginTop: '2px' }}>{formatRupiah(kpiMetrics.avgPrice)}</div>
            <span style={{ fontSize: '0.66rem', color: T.txtSecondary }}>Harga Satuan Standar</span>
          </div>
          <div style={{ padding: '8px', borderRadius: '10px', background: T.accentGoldBg, color: T.accentGold }}>
            <DollarSign size={18} />
          </div>
        </div>

        {/* Card 3: Average HPP Cost */}
        <div style={{ background: T.cardBg, border: `1px solid ${T.borderStrong}`, borderRadius: '14px', padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <span style={{ fontSize: '0.68rem', fontWeight: '800', color: T.txtSecondary, textTransform: 'uppercase' }}>RATA-RATA MODAL HPP</span>
            <div style={{ fontSize: '1.3rem', fontWeight: '900', color: T.danger, marginTop: '2px' }}>{formatRupiah(kpiMetrics.avgHpp)}</div>
            <span style={{ fontSize: '0.66rem', color: T.danger, fontWeight: '700' }}>Biaya Bahan per Porsi</span>
          </div>
          <div style={{ padding: '8px', borderRadius: '10px', background: T.dangerBg, color: T.danger }}>
            <ShoppingBasket size={18} />
          </div>
        </div>

        {/* Card 4: Average Profit Margin */}
        <div style={{ background: T.cardBg, border: `1px solid ${T.borderStrong}`, borderRadius: '14px', padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <span style={{ fontSize: '0.68rem', fontWeight: '800', color: T.txtSecondary, textTransform: 'uppercase' }}>MARGIN KEUNTUNGAN</span>
            <div style={{ fontSize: '1.3rem', fontWeight: '900', color: kpiMetrics.avgMarginPct >= 50 ? T.success : T.accentGold, marginTop: '2px' }}>
              {kpiMetrics.avgMarginPct}%
            </div>
            <span style={{ fontSize: '0.66rem', color: kpiMetrics.avgMarginPct >= 50 ? T.success : T.accentGold, fontWeight: '700' }}>
              {kpiMetrics.avgMarginPct >= 50 ? 'Margin Sehat (>50%)' : 'Perlu Optimasi HPP'}
            </span>
          </div>
          <div style={{ padding: '8px', borderRadius: '10px', background: T.successBg, color: T.success }}>
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
        {/* Left: Filters */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Search Box */}
          <div style={{ position: 'relative', width: '220px' }}>
            <Search size={14} color={T.txtMuted} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              placeholder="Cari nama menu / SKU..."
              value={searchTerm}
              onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              style={{
                width: '100%',
                padding: '6px 10px 6px 30px',
                background: T.inputBg,
                border: `1px solid ${T.borderStrong}`,
                borderRadius: '8px',
                color: T.txtPrimary,
                fontSize: '0.74rem'
              }}
            />
          </div>

          {/* Category Filter */}
          <select
            value={selectedCategoryFilter}
            onChange={e => { setSelectedCategoryFilter(e.target.value); setCurrentPage(1); }}
            style={{
              background: T.inputBg,
              border: `1px solid ${T.borderStrong}`,
              color: T.txtPrimary,
              padding: '6px 10px',
              borderRadius: '8px',
              fontSize: '0.74rem',
              fontWeight: '700',
              outline: 'none',
              cursor: 'pointer'
            }}
          >
            <option value="Semua">Semua Kategori</option>
            {allCategories.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatusFilter}
            onChange={e => { setSelectedStatusFilter(e.target.value); setCurrentPage(1); }}
            style={{
              background: T.inputBg,
              border: `1px solid ${T.borderStrong}`,
              color: T.txtPrimary,
              padding: '6px 10px',
              borderRadius: '8px',
              fontSize: '0.74rem',
              fontWeight: '700',
              outline: 'none',
              cursor: 'pointer'
            }}
          >
            <option value="Semua">Semua Status</option>
            <option value="Aktif">Aktif</option>
            <option value="Inaktif">Inaktif / Habis</option>
          </select>

          {/* Branch Outlet Filter */}
          <select
            value={selectedOutletFilter}
            onChange={e => { setSelectedOutletFilter(e.target.value); setCurrentPage(1); }}
            style={{
              background: T.inputBg,
              border: `1px solid ${T.borderStrong}`,
              color: T.txtPrimary,
              padding: '6px 10px',
              borderRadius: '8px',
              fontSize: '0.74rem',
              fontWeight: '700',
              outline: 'none',
              cursor: 'pointer'
            }}
          >
            <option value="Semua">Semua Cabang Outlet</option>
            {allOutlets.map(o => (
              <option key={o.id} value={o.id}>{o.name}</option>
            ))}
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
      {/* 4. PRODUCTS LISTING: GRID OR TABLE                            */}
      {/* ------------------------------------------------------------- */}
      {filteredProducts.length === 0 ? (
        <div style={{
          background: T.cardBg,
          border: `1px solid ${T.borderStrong}`,
          borderRadius: '16px',
          padding: '48px 24px',
          textAlign: 'center',
          color: T.txtMuted
        }}>
          <Package size={36} color={T.txtMuted} style={{ margin: '0 auto 12px auto' }} />
          <h4 style={{ fontSize: '0.94rem', fontWeight: '800', color: T.txtPrimary, margin: 0 }}>Tidak ada menu produk ditemukan</h4>
          <p style={{ fontSize: '0.74rem', color: T.txtSecondary, marginTop: '4px' }}>Coba ubah kata kunci pencarian atau filter kategori di atas.</p>
        </div>
      ) : displayMode === 'grid' ? (
        /* GRID MODE */
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '14px' }}>
          {paginatedProducts.map(product => {
            const hpp = calculateProductHpp(product.compositions || []);
            const price = Number(product.price || 0);
            const marginNominal = Math.max(0, price - hpp);
            const marginPct = price > 0 ? Math.round((marginNominal / price) * 100) : 0;
            const isAvailable = (product.status || 'Aktif') === 'Aktif';

            return (
              <div
                key={product.id}
                className="glass-card"
                style={{
                  background: T.cardBg,
                  border: `1px solid ${T.borderStrong}`,
                  borderRadius: '14px',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'transform 0.15s ease, box-shadow 0.15s ease'
                }}
              >
                {/* Photo & Status Overlay */}
                <div style={{ position: 'relative', height: '140px', background: '#18181b', overflow: 'hidden' }}>
                  <img
                    src={product.image_url || 'https://images.unsplash.com/photo-1544025162-d76694265947?w=400'}
                    alt={product.name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: isAvailable ? 1 : 0.6 }}
                    onError={(e) => {
                      e.target.src = 'https://images.unsplash.com/photo-1544025162-d76694265947?w=400';
                    }}
                  />
                  {/* Category & Status Badges */}
                  <div style={{ position: 'absolute', top: '8px', left: '8px', display: 'flex', gap: '4px' }}>
                    <span style={{ fontSize: '0.62rem', fontWeight: '800', background: 'rgba(0,0,0,0.7)', color: '#ffffff', padding: '2px 6px', borderRadius: '4px', backdropFilter: 'blur(4px)' }}>
                      {product.sku || product.code || 'PRD'}
                    </span>
                    <span style={{ fontSize: '0.62rem', fontWeight: '800', background: 'rgba(245, 158, 11, 0.85)', color: '#000000', padding: '2px 6px', borderRadius: '4px', backdropFilter: 'blur(4px)' }}>
                      {product.category_name || product.category || 'Menu'}
                    </span>
                  </div>

                  <div style={{ position: 'absolute', top: '8px', right: '8px' }}>
                    <span style={{
                      fontSize: '0.62rem',
                      fontWeight: '800',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      background: isAvailable ? 'rgba(16, 185, 129, 0.85)' : 'rgba(239, 68, 68, 0.85)',
                      color: '#ffffff'
                    }}>
                      {isAvailable ? 'Aktif' : 'Inaktif'}
                    </span>
                  </div>
                </div>

                {/* Card Body */}
                <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'space-between' }}>
                  <div>
                    <h3 style={{ fontSize: '0.88rem', fontWeight: '900', color: T.txtPrimary, margin: 0, textTransform: 'uppercase', letterSpacing: '-0.01em' }}>
                      {product.name}
                    </h3>

                    {/* Price & HPP Summary Box */}
                    <div style={{ background: T.cardBg2, border: `1px solid ${T.borderStrong}`, borderRadius: '8px', padding: '8px 10px', marginTop: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <span style={{ fontSize: '0.62rem', color: T.txtSecondary }}>HARGA JUAL</span>
                        <div style={{ fontSize: '0.94rem', fontWeight: '900', color: T.accentGold }}>{getProductDisplayPrice(product)}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ fontSize: '0.62rem', color: T.txtSecondary }}>ESTIMASI HPP</span>
                        <div style={{ fontSize: '0.84rem', fontWeight: '800', color: T.danger }}>{formatRupiah(hpp)}</div>
                      </div>
                    </div>

                    {/* Profit Margin Pill */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
                      <span style={{ fontSize: '0.68rem', color: T.txtSecondary }}>Margin Keuntungan:</span>
                      <span style={{
                        fontSize: '0.68rem',
                        fontWeight: '800',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        background: marginPct >= 50 ? T.successBg : T.accentGoldBg,
                        color: marginPct >= 50 ? T.success : T.accentGold,
                        border: `1px solid ${marginPct >= 50 ? T.successBorder : T.accentGoldBorder}`
                      }}>
                        +{marginPct}% ({formatRupiah(marginNominal)})
                      </span>
                    </div>

                    {/* Composition & Variants Count */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.66rem', color: T.txtMuted, marginTop: '6px' }}>
                      <span>🥣 Resep: {product.compositions?.length || 0} bahan</span>
                      {product.variants && product.variants.length > 0 && (
                        <span style={{ color: T.primary, fontWeight: '800' }}>
                          🎨 {product.variants.length} Varian
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: '6px', marginTop: '12px', paddingTop: '10px', borderTop: `1px solid ${T.border}` }}>
                    <button
                      type="button"
                      onClick={() => setSelectedMenuDetail(product)}
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
                      <BarChart3 size={13} />
                      <span>Analisis</span>
                    </button>

                    {allowEdit && (
                      <button
                        type="button"
                        onClick={() => handleOpenEditForm(product)}
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
                        onClick={() => handleDeleteProduct(product.id, product.name)}
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
                        title="Hapus Menu"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
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
                  <th style={{ padding: '10px 12px', fontWeight: '800' }}>FOTO &amp; SKU</th>
                  <th style={{ padding: '10px 12px', fontWeight: '800' }}>NAMA MENU PRODUK</th>
                  <th style={{ padding: '10px 12px', fontWeight: '800' }}>KATEGORI</th>
                  <th style={{ padding: '10px 12px', fontWeight: '800', textAlign: 'right' }}>HARGA JUAL</th>
                  <th style={{ padding: '10px 12px', fontWeight: '800', textAlign: 'right' }}>ESTIMASI HPP</th>
                  <th style={{ padding: '10px 12px', fontWeight: '800', textAlign: 'center' }}>MARGIN LABA</th>
                  <th style={{ padding: '10px 12px', fontWeight: '800', textAlign: 'center' }}>STATUS</th>
                  <th style={{ padding: '10px 12px', fontWeight: '800', textAlign: 'center' }}>AKSI</th>
                </tr>
              </thead>
              <tbody>
                {paginatedProducts.map(product => {
                  const hpp = calculateProductHpp(product.compositions || []);
                  const price = Number(product.price || 0);
                  const marginNominal = Math.max(0, price - hpp);
                  const marginPct = price > 0 ? Math.round((marginNominal / price) * 100) : 0;
                  const isAvailable = (product.status || 'Aktif') === 'Aktif';

                  return (
                    <tr key={product.id} style={{ borderBottom: `1px solid ${T.border}`, color: T.txtPrimary }}>
                      {/* Photo & SKU */}
                      <td style={{ padding: '10px 12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <img
                            src={product.image_url || 'https://images.unsplash.com/photo-1544025162-d76694265947?w=400'}
                            alt={product.name}
                            style={{ width: '36px', height: '36px', borderRadius: '8px', objectFit: 'cover' }}
                            onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1544025162-d76694265947?w=400'; }}
                          />
                          <span style={{ fontWeight: '800', color: T.info, fontFamily: 'monospace', fontSize: '0.70rem' }}>
                            {product.sku || product.code || 'PRD'}
                          </span>
                        </div>
                      </td>

                      {/* Product Name */}
                      <td style={{ padding: '10px 12px', fontWeight: '800', textTransform: 'uppercase' }}>
                        {product.name}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.64rem', color: T.txtSecondary, textTransform: 'none', fontWeight: '600', marginTop: '2px', flexWrap: 'wrap' }}>
                          <span>🥣 {product.compositions?.length || 0} bahan baku</span>
                          {product.variants && product.variants.length > 0 && (
                            <span style={{ color: T.primary, fontWeight: '800' }}>
                              • 🎨 {product.variants.length} Varian ({product.variants.join(', ')})
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Category */}
                      <td style={{ padding: '10px 12px' }}>
                        <span style={{ fontSize: '0.66rem', background: T.infoBg, color: T.info, padding: '2px 6px', borderRadius: '4px', fontWeight: '700' }}>
                          {product.category_name || product.category || 'Menu'}
                        </span>
                      </td>

                      {/* Selling Price */}
                      <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: '900', color: T.accentGold, whiteSpace: 'nowrap' }}>
                        {getProductDisplayPrice(product)}
                      </td>

                      {/* HPP Cost */}
                      <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: '800', color: T.danger }}>
                        {formatRupiah(hpp)}
                      </td>

                      {/* Margin % */}
                      <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                        <span style={{
                          fontSize: '0.66rem',
                          fontWeight: '800',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          background: marginPct >= 50 ? T.successBg : T.accentGoldBg,
                          color: marginPct >= 50 ? T.success : T.accentGold
                        }}>
                          +{marginPct}%
                        </span>
                      </td>

                      {/* Status */}
                      <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                        <span style={{
                          fontSize: '0.64rem',
                          fontWeight: '800',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          background: isAvailable ? T.successBg : T.dangerBg,
                          color: isAvailable ? T.success : T.danger
                        }}>
                          {isAvailable ? 'Aktif' : 'Inaktif'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                        <div style={{ display: 'inline-flex', gap: '6px' }}>
                          <button
                            type="button"
                            onClick={() => setSelectedMenuDetail(product)}
                            style={{ background: 'none', border: 'none', color: T.info, cursor: 'pointer', padding: '3px' }}
                            title="Analisis Detail Menu"
                          >
                            <BarChart3 size={15} />
                          </button>
                          {allowEdit && (
                            <button
                              type="button"
                              onClick={() => handleOpenEditForm(product)}
                              style={{ background: 'none', border: 'none', color: T.txtPrimary, cursor: 'pointer', padding: '3px' }}
                              title="Edit Menu"
                            >
                              <Edit3 size={15} />
                            </button>
                          )}
                          {allowDelete && (
                            <button
                              type="button"
                              onClick={() => handleDeleteProduct(product.id, product.name)}
                              style={{ background: 'none', border: 'none', color: T.danger, cursor: 'pointer', padding: '3px' }}
                              title="Hapus Menu"
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

      {/* Pagination Controls */}
      <div style={{ padding: '10px 0' }}>
        <PaginationControls
          currentPage={currentPage}
          totalPages={totalPages}
          pageSize={pageSize}
          totalItems={filteredProducts.length}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
          themeMode={themeMode}
        />
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 5. MODAL FORM: TAMBAH / EDIT MENU (3 SECTIONS)               */}
      {/* ------------------------------------------------------------- */}
      {showFormModal && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '16px'
        }}>
          <div className="glass-card animate-fade-in" style={{
            width: '100%',
            maxWidth: '680px',
            maxHeight: '90vh',
            overflowY: 'auto',
            background: T.cardBg,
            border: `1px solid ${T.borderStrong}`,
            borderRadius: '16px',
            padding: '24px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.6)'
          }}>
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: '900', color: T.txtPrimary, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Package size={18} color={T.primary} />
                  <span>{editingProductId ? 'Edit Menu Produk' : 'Tambah Menu Baru'}</span>
                </h3>
                <p style={{ fontSize: '0.72rem', color: T.txtSecondary, margin: '2px 0 0 0' }}>
                  Form konfigurasi data produk, multi-harga cabang, dan resep HPP bahan baku
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowFormModal(false)}
                style={{ background: 'none', border: 'none', color: T.txtSecondary, cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Sub-Tab Navigation inside Form Modal */}
            <div style={{ display: 'flex', gap: '4px', background: T.cardBg2, padding: '4px', borderRadius: '10px', border: `1px solid ${T.borderStrong}`, marginBottom: '16px' }}>
              <button
                type="button"
                onClick={() => setFormSubTab('info')}
                style={{
                  flex: 1,
                  padding: '7px',
                  borderRadius: '7px',
                  border: 'none',
                  background: formSubTab === 'info' ? T.primary : 'transparent',
                  color: formSubTab === 'info' ? T.txtInverse : T.txtSecondary,
                  fontWeight: '800',
                  fontSize: '0.74rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                <Package size={14} />
                <span>1. Info Produk</span>
              </button>

              <button
                type="button"
                onClick={() => setFormSubTab('pricing')}
                style={{
                  flex: 1,
                  padding: '7px',
                  borderRadius: '7px',
                  border: 'none',
                  background: formSubTab === 'pricing' ? T.primary : 'transparent',
                  color: formSubTab === 'pricing' ? T.txtInverse : T.txtSecondary,
                  fontWeight: '800',
                  fontSize: '0.74rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                <DollarSign size={14} />
                <span>2. Harga &amp; Cabang</span>
              </button>

              <button
                type="button"
                onClick={() => setFormSubTab('recipe')}
                style={{
                  flex: 1,
                  padding: '7px',
                  borderRadius: '7px',
                  border: 'none',
                  background: formSubTab === 'recipe' ? T.primary : 'transparent',
                  color: formSubTab === 'recipe' ? T.txtInverse : T.txtSecondary,
                  fontWeight: '800',
                  fontSize: '0.74rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                <ShoppingBasket size={14} />
                <span>3. Resep &amp; HPP ({compositions.length})</span>
              </button>
            </div>

            {/* FORM CONTENT BASED ON SUB-TAB */}
            <form onSubmit={handleSaveProduct} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              
              {/* TAB 1: INFORMASI PRODUK */}
              {formSubTab === 'info' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 2fr', gap: '12px' }}>
                    <div>
                      <label style={{ fontSize: '0.74rem', fontWeight: '700', color: T.txtSecondary, display: 'block', marginBottom: '4px' }}>
                        Kode SKU *
                      </label>
                      <input
                        type="text"
                        value={prodSku}
                        onChange={e => setProdSku(e.target.value.toUpperCase())}
                        required
                        className="form-input"
                        style={{ background: T.inputBg, borderColor: T.border, color: T.txtPrimary, fontFamily: 'monospace', fontWeight: '800' }}
                      />
                    </div>

                    <div>
                      <label style={{ fontSize: '0.74rem', fontWeight: '700', color: T.txtSecondary, display: 'block', marginBottom: '4px' }}>
                        Nama Menu Produk * (Auto-Kapital)
                      </label>
                      <input
                        type="text"
                        placeholder="Contoh: AYAM GORENG KALASAN"
                        value={prodName}
                        onChange={e => setProdName(e.target.value.toUpperCase())}
                        required
                        className="form-input"
                        style={{ background: T.inputBg, borderColor: T.border, color: T.txtPrimary, fontWeight: '800' }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={{ fontSize: '0.74rem', fontWeight: '700', color: T.txtSecondary, display: 'block', marginBottom: '4px' }}>
                        Kategori Menu *
                      </label>
                      <select
                        value={prodCategoryId}
                        onChange={e => setProdCategoryId(e.target.value)}
                        className="form-select"
                        style={{ background: T.inputBg, borderColor: T.border, color: T.txtPrimary, width: '100%' }}
                        required
                      >
                        {allCategories.map(cat => (
                          <option key={cat.id} value={cat.id}>{cat.name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label style={{ fontSize: '0.74rem', fontWeight: '700', color: T.txtSecondary, display: 'block', marginBottom: '4px' }}>
                        Status Menu *
                      </label>
                      <select
                        value={prodStatus}
                        onChange={e => setProdStatus(e.target.value)}
                        className="form-select"
                        style={{ background: T.inputBg, borderColor: T.border, color: T.txtPrimary, width: '100%' }}
                      >
                        <option value="Aktif">Aktif (Tersedia)</option>
                        <option value="Inaktif">Inaktif / Habis</option>
                      </select>
                    </div>
                  </div>

                  {/* Photo URL / Upload */}
                  <div>
                    <label style={{ fontSize: '0.74rem', fontWeight: '700', color: T.txtSecondary, display: 'block', marginBottom: '4px' }}>
                      URL Foto / Gambar Produk
                    </label>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <input
                        type="url"
                        placeholder="https://images.unsplash.com/..."
                        value={prodImageUrl}
                        onChange={e => setProdImageUrl(e.target.value)}
                        className="form-input"
                        style={{ background: T.inputBg, borderColor: T.border, color: T.txtPrimary, flex: 1 }}
                      />
                      {prodImageUrl && (
                        <img
                          src={prodImageUrl}
                          alt="Preview"
                          style={{ width: '40px', height: '40px', borderRadius: '8px', objectFit: 'cover', border: `1px solid ${T.border}` }}
                          onError={(e) => { e.target.style.display = 'none'; }}
                        />
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: HARGA & CABANG */}
              {formSubTab === 'pricing' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '0.74rem', fontWeight: '700', color: T.txtSecondary, display: 'block', marginBottom: '4px' }}>
                      Harga Jual Standar (Rp) *
                    </label>
                    <input
                      type="number"
                      min="0"
                      required
                      placeholder="Contoh: 28000"
                      value={basePrice}
                      onChange={e => setBasePrice(e.target.value)}
                      className="form-input"
                      style={{ background: T.inputBg, borderColor: T.border, color: T.txtPrimary, fontSize: '0.94rem', fontWeight: '900' }}
                    />
                    <span style={{ fontSize: '0.66rem', color: T.txtMuted, marginTop: '2px', display: 'block' }}>
                      *Harga dasar yang berlaku secara umum untuk semua cabang outlet.
                    </span>
                  </div>

                  {/* Toggle Custom Branch Pricing */}
                  <div style={{ background: T.cardBg2, border: `1px solid ${T.borderStrong}`, padding: '10px 14px', borderRadius: '10px', marginTop: '4px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <span style={{ fontSize: '0.76rem', fontWeight: '800', color: T.txtPrimary }}>Atur Harga Khusus per Cabang</span>
                        <p style={{ fontSize: '0.66rem', color: T.txtSecondary, margin: '2px 0 0 0' }}>
                          Aktifkan jika harga jual menu berbeda di masing-masing 5 outlet
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        checked={hasCustomBranchPrices}
                        onChange={e => setHasCustomBranchPrices(e.target.checked)}
                        style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                      />
                    </div>

                    {/* Branch Table */}
                    {hasCustomBranchPrices && (
                      <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {allOutlets.map(o => (
                          <div key={o.id} style={{ display: 'grid', gridTemplateColumns: '1.5fr 1.2fr 1fr', gap: '8px', alignItems: 'center', background: T.inputBg, padding: '6px 10px', borderRadius: '8px', border: `1px solid ${T.border}` }}>
                            <span style={{ fontSize: '0.74rem', fontWeight: '700', color: T.txtPrimary }}>{o.name}</span>
                            <input
                              type="number"
                              placeholder="Harga Rp"
                              value={standardPrices[o.id] !== undefined ? standardPrices[o.id] : basePrice}
                              onChange={e => setStandardPrices({ ...standardPrices, [o.id]: Number(e.target.value) })}
                              className="form-input"
                              style={{ background: T.cardBg, borderColor: T.border, color: T.txtPrimary, padding: '4px 8px', fontSize: '0.74rem' }}
                            />
                            <select
                              value={outletApkStatus[o.id] || 'Aktif'}
                              onChange={e => setOutletApkStatus({ ...outletApkStatus, [o.id]: e.target.value })}
                              className="form-select"
                              style={{ background: T.cardBg, borderColor: T.border, color: T.txtPrimary, padding: '4px 6px', fontSize: '0.70rem' }}
                            >
                              <option value="Aktif">Tersedia</option>
                              <option value="Inaktif">Habis / Inaktif</option>
                            </select>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* SECTION: KELOLA VARIAN MENU */}
                  <div style={{ background: T.cardBg2, border: `1px solid ${T.borderStrong}`, padding: '12px 14px', borderRadius: '10px', marginTop: '4px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <span style={{ fontSize: '0.78rem', fontWeight: '800', color: T.txtPrimary, display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Palette size={15} color={T.primary} />
                          <span>Pilihan Varian Menu (Opsional)</span>
                        </span>
                        <p style={{ fontSize: '0.66rem', color: T.txtSecondary, margin: '2px 0 0 0' }}>
                          Contoh: Pilihan Sambal (Pecak / Ijo / Matah), Suhu (Dingin / Panas), atau Ukuran (Reguler / Jumbo)
                        </p>
                      </div>
                      <span style={{ fontSize: '0.66rem', padding: '2px 6px', borderRadius: '4px', background: T.infoBg, color: T.info, fontWeight: '800' }}>
                        {variants.length} Varian
                      </span>
                    </div>

                    {/* Input Tag Varian */}
                    <div style={{ display: 'flex', gap: '6px', marginTop: '10px' }}>
                      <input
                        type="text"
                        placeholder="Ketik nama varian (contoh: Sambal Pecak / Porsi Jumbo)..."
                        value={tempVariantInput}
                        onChange={e => setTempVariantInput(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddVariant(); } }}
                        className="form-input"
                        style={{ background: T.inputBg, borderColor: T.border, color: T.txtPrimary, flex: 1, fontSize: '0.74rem' }}
                      />
                      <button
                        type="button"
                        onClick={handleAddVariant}
                        style={{
                          background: T.primary,
                          color: T.txtInverse,
                          border: 'none',
                          padding: '6px 12px',
                          borderRadius: '8px',
                          fontWeight: '800',
                          fontSize: '0.74rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        <Plus size={14} />
                        <span>Tambah</span>
                      </button>
                    </div>

                    {/* List of Variant Chips */}
                    {variants.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '10px' }}>
                        {variants.map(v => (
                          <span
                            key={v}
                            style={{
                              fontSize: '0.72rem',
                              fontWeight: '800',
                              padding: '4px 10px',
                              borderRadius: '8px',
                              background: T.inputBg,
                              border: `1px solid ${T.borderStrong}`,
                              color: T.txtPrimary,
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px'
                            }}
                          >
                            <span>{v}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveVariant(v)}
                              style={{ background: 'none', border: 'none', color: T.danger, cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center' }}
                            >
                              <X size={12} />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Custom Price per Variant Toggle & Table */}
                    {variants.length > 0 && (
                      <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: `1px solid ${T.border}` }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <span style={{ fontSize: '0.74rem', fontWeight: '700', color: T.txtPrimary }}>Atur Harga Khusus per Varian</span>
                            <p style={{ fontSize: '0.64rem', color: T.txtSecondary, margin: '1px 0 0 0' }}>
                              Jika tidak dicentang, semua varian akan menggunakan harga dasar ({formatRupiah(basePrice)})
                            </p>
                          </div>
                          <input
                            type="checkbox"
                            checked={hasCustomVariantPrices}
                            onChange={e => setHasCustomVariantPrices(e.target.checked)}
                            style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                          />
                        </div>

                        {hasCustomVariantPrices && (
                          <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            {variants.map(v => (
                              <div key={v} style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr', gap: '8px', alignItems: 'center', background: T.inputBg, padding: '6px 10px', borderRadius: '8px', border: `1px solid ${T.border}` }}>
                                <span style={{ fontSize: '0.74rem', fontWeight: '700', color: T.txtPrimary }}>{v}</span>
                                <input
                                  type="number"
                                  placeholder="Harga Rp"
                                  value={variantPrices[v] !== undefined ? variantPrices[v] : basePrice}
                                  onChange={e => setVariantPrices({ ...variantPrices, [v]: Number(e.target.value) })}
                                  className="form-input"
                                  style={{ background: T.cardBg, borderColor: T.border, color: T.txtPrimary, padding: '4px 8px', fontSize: '0.74rem' }}
                                />
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 3: RESEP & ESTIMASI HPP */}
              {formSubTab === 'recipe' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {/* Live HPP & Profit Margin Summary Box */}
                  <div style={{ background: T.cardBg2, border: `1px solid ${T.borderStrong}`, padding: '12px 16px', borderRadius: '12px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                    <div>
                      <span style={{ fontSize: '0.64rem', color: T.txtSecondary, fontWeight: '700' }}>ESTIMASI MODAL HPP</span>
                      <div style={{ fontSize: '1.05rem', fontWeight: '900', color: T.danger }}>{formatRupiah(liveFormHpp)}</div>
                      <span style={{ fontSize: '0.62rem', color: T.danger }}>{Math.round(liveFormHppPct)}% dari Harga Jual</span>
                    </div>

                    <div>
                      <span style={{ fontSize: '0.64rem', color: T.txtSecondary, fontWeight: '700' }}>HARGA JUAL STANDAR</span>
                      <div style={{ fontSize: '1.05rem', fontWeight: '900', color: T.accentGold }}>{formatRupiah(liveFormSellingPrice)}</div>
                      <span style={{ fontSize: '0.62rem', color: T.txtSecondary }}>Per Porsi Menu</span>
                    </div>

                    <div>
                      <span style={{ fontSize: '0.64rem', color: T.txtSecondary, fontWeight: '700' }}>MARGIN KEUNTUNGAN</span>
                      <div style={{ fontSize: '1.05rem', fontWeight: '900', color: liveFormMarginPct >= 50 ? T.success : T.accentGold }}>
                        +{Math.round(liveFormMarginPct)}%
                      </div>
                      <span style={{ fontSize: '0.62rem', color: liveFormMarginPct >= 50 ? T.success : T.accentGold, fontWeight: '700' }}>
                        Laba: {formatRupiah(liveFormMarginNominal)}
                      </span>
                    </div>
                  </div>

                  {/* Composition List */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                    <span style={{ fontSize: '0.74rem', fontWeight: '800', color: T.txtPrimary }}>Daftar Bahan Baku Komposisi (BOM):</span>
                    <button
                      type="button"
                      onClick={handleAddCompositionRow}
                      style={{
                        padding: '4px 10px',
                        borderRadius: '6px',
                        background: T.infoBg,
                        border: `1px solid ${T.infoBorder}`,
                        color: T.info,
                        fontSize: '0.70rem',
                        fontWeight: '800',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      <Plus size={13} />
                      <span>+ Tambah Bahan</span>
                    </button>
                  </div>

                  {compositions.length === 0 ? (
                    <div style={{ background: T.inputBg, border: `1px dashed ${T.border}`, borderRadius: '10px', padding: '18px', textAlign: 'center', color: T.txtMuted, fontSize: '0.74rem' }}>
                      Belum ada resep bahan baku yang dihubungkan ke menu ini. Klik <strong>"+ Tambah Bahan"</strong> untuk mengaitkan bahan dapur dan menghitung HPP otomatis.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {compositions.map((comp) => {
                        const ing = allIngredients.find(i => String(i.id) === String(comp.ingredient_id));
                        const ingPrice = Number(ing?.avg_buy_price || ing?.price || 0);

                        return (
                          <div key={comp.id} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 40px', gap: '8px', alignItems: 'center', background: T.inputBg, padding: '8px 10px', borderRadius: '8px', border: `1px solid ${T.border}` }}>
                            {/* Ingredient Select */}
                            <div>
                              <select
                                value={comp.ingredient_id}
                                onChange={e => handleUpdateCompositionRow(comp.id, 'ingredient_id', e.target.value)}
                                className="form-select"
                                style={{ background: T.cardBg, borderColor: T.border, color: T.txtPrimary, width: '100%', fontSize: '0.72rem' }}
                              >
                                {allIngredients.map(ingItem => (
                                  <option key={ingItem.id} value={ingItem.id}>
                                    {ingItem.name} ({formatRupiah(ingItem.avg_buy_price || ingItem.price || 0)}/{ingItem.unit || 'Kg'})
                                  </option>
                                ))}
                              </select>
                            </div>

                            {/* Qty Input */}
                            <div>
                              <input
                                type="number"
                                min="0.01"
                                step="any"
                                placeholder="Qty"
                                value={comp.qty}
                                onChange={e => handleUpdateCompositionRow(comp.id, 'qty', e.target.value)}
                                className="form-input"
                                style={{ background: T.cardBg, borderColor: T.border, color: T.txtPrimary, padding: '4px 8px', fontSize: '0.72rem' }}
                              />
                            </div>

                            {/* Unit Select */}
                            <div>
                              <select
                                value={comp.unit}
                                onChange={e => handleUpdateCompositionRow(comp.id, 'unit', e.target.value)}
                                className="form-select"
                                style={{ background: T.cardBg, borderColor: T.border, color: T.txtPrimary, width: '100%', fontSize: '0.72rem' }}
                              >
                                <option value="Gram">Gram</option>
                                <option value="Kg">Kg</option>
                                <option value="Pcs">Pcs</option>
                                <option value="ml">ml</option>
                                <option value="Liter">Liter</option>
                                <option value="Sendok">Sendok</option>
                                <option value="Porsi">Porsi</option>
                              </select>
                            </div>

                            {/* Remove Button */}
                            <button
                              type="button"
                              onClick={() => handleRemoveCompositionRow(comp.id)}
                              style={{ background: 'none', border: 'none', color: T.danger, cursor: 'pointer', padding: '4px' }}
                              title="Hapus Bahan"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Form Actions */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px', paddingTop: '12px', borderTop: `1px solid ${T.border}` }}>
                <div style={{ display: 'flex', gap: '6px' }}>
                  {formSubTab !== 'info' && (
                    <button
                      type="button"
                      onClick={() => setFormSubTab(formSubTab === 'recipe' ? 'pricing' : 'info')}
                      style={{ padding: '6px 12px', borderRadius: '6px', border: `1px solid ${T.border}`, background: T.cardBg2, color: T.txtSecondary, fontSize: '0.74rem', fontWeight: '700', cursor: 'pointer' }}
                    >
                      &larr; Kembali
                    </button>
                  )}
                  {formSubTab !== 'recipe' && (
                    <button
                      type="button"
                      onClick={() => setFormSubTab(formSubTab === 'info' ? 'pricing' : 'recipe')}
                      style={{ padding: '6px 12px', borderRadius: '6px', border: `1px solid ${T.border}`, background: T.cardBg2, color: T.txtPrimary, fontSize: '0.74rem', fontWeight: '700', cursor: 'pointer' }}
                    >
                      Lanjut &rarr;
                    </button>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => setShowFormModal(false)}
                    style={{ background: T.cardBg2, border: `1px solid ${T.border}`, padding: '8px 16px', borderRadius: '8px', color: T.txtSecondary, fontSize: '0.76rem', fontWeight: '700', cursor: 'pointer' }}
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="btn-primary"
                    style={{ padding: '8px 20px', fontSize: '0.76rem', fontWeight: '800' }}
                  >
                    Simpan Menu Produk
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 6. MODAL: ANALYTICS DETAIL MENU                               */}
      {/* ------------------------------------------------------------- */}
      {selectedMenuDetail && (
        <MenuAnalyticsDetailModal
          product={selectedMenuDetail}
          onClose={() => setSelectedMenuDetail(null)}
          masterData={masterData}
          themeMode={themeMode}
        />
      )}

      {/* ------------------------------------------------------------- */}
      {/* 7. MODAL: EXCEL MASTER IMPORT                                 */}
      {/* ------------------------------------------------------------- */}
      {showExcelImportModal && (
        <ExcelMasterImportModal
          show={showExcelImportModal}
          onClose={() => setShowExcelImportModal(false)}
          masterData={masterData}
          setMasterData={setMasterData}
          themeMode={themeMode}
        />
      )}

      {/* ------------------------------------------------------------- */}
      {/* 8. MODAL: DELETE GUARD                                        */}
      {/* ------------------------------------------------------------- */}
      {deleteGuardState && (
        <DeleteGuardModal
          state={deleteGuardState}
          onClose={() => setDeleteGuardState(null)}
          themeMode={themeMode}
        />
      )}

    </div>
  );
}
