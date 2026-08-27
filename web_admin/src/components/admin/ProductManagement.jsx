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
import { getMenuFallbackImage } from '../../utils/formatUtils';
import { requestDelete, countRelatedTransactions, executePermanentDelete } from '../../utils/deleteGuard';
import { canDeleteModule, canEditModule } from '../../utils/permissionUtils';
import { getApiUrl } from '../../utils/apiConfig';

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
  const [showDuplicateMergeModal, setShowDuplicateMergeModal] = useState(false);
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
  const [selectedOutletIds, setSelectedOutletIds] = useState([]); // [1, 2, 3]
  const [hasCustomBranchPrices, setHasCustomBranchPrices] = useState(false);
  const [standardPrices, setStandardPrices] = useState({}); // { [outletId]: price }
  const [outletApkStatus, setOutletApkStatus] = useState({}); // { [outletId]: 'Aktif' | 'Inaktif' }

  // Variant States
  const [variants, setVariants] = useState([]); // ['GORENG', 'BAKAR']
  const [variantPrices, setVariantPrices] = useState({}); // { 'GORENG': 25000 }
  const [branchVariantPrices, setBranchVariantPrices] = useState({}); // { [outletId]: { 'GORENG': 12000, 'BAKAR': 15000 } }
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

  // Auto-clean any residual menu image URLs across masterData
  useEffect(() => {
    if (masterData?.products && masterData.products.some(p => p.image_url || p.image)) {
      const cleaned = masterData.products.map(p => {
        if (!p.image_url && !p.image) return p;
        const { image_url, image, ...rest } = p;
        return { ...rest, image_url: '', image: '' };
      });
      const nextMaster = {
        ...masterData,
        products: cleaned,
        _lastUpdated: Date.now()
      };
      setMasterData(nextMaster);
      try {
        localStorage.setItem('mris_master_data', JSON.stringify(nextMaster));
      } catch (e) {}
    }
  }, [masterData?.products]);

  // Master ingredients, categories, outlets, and units
  const allIngredients = useMemo(() => masterData?.ingredients || [], [masterData?.ingredients]);
  const allCategories = useMemo(() => masterData?.categories || [], [masterData?.categories]);
  const allOutlets = useMemo(() => masterData?.outlets || [], [masterData?.outlets]);
  const allUnits = useMemo(() => {
    const list = masterData?.units || [];
    const unitNames = list.map(u => u.name || u.nama || u.unit || u.code).filter(Boolean);
    const fallbackUnits = ['Gram', 'Kg', 'Pcs', 'ml', 'Liter', 'Botol', 'Bungkus', 'Porsi', 'Sendok', 'Ikat', 'Kaleng', 'Dus', 'Butir', 'Batang', 'Lembar', 'Biji'];
    return Array.from(new Set([...unitNames, ...fallbackUnits]));
  }, [masterData?.units]);

  // Format IDR Helper
  const formatRupiah = (val) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val || 0);
  };

  // Dynamic Price Range Helper for Products with Variant Pricing
  const getProductDisplayPrice = (product) => {
    const baseP = Number(product.price || 0);
    const vars = product.variants || [];
    const bVarPrices = product.branchVariantPrices || product.branch_variant_prices || {};
    const vPrices = product.variantPrices || {};

    const allExtractedPrices = [];

    if (vars.length > 0) {
      // Check if branchVariantPrices has values
      Object.values(bVarPrices).forEach(outMap => {
        if (outMap && typeof outMap === 'object') {
          vars.forEach(v => {
            if (outMap[v] !== undefined && Number(outMap[v]) > 0) {
              allExtractedPrices.push(Number(outMap[v]));
            }
          });
        }
      });

      // Also check flat variantPrices
      vars.forEach(v => {
        if (vPrices[v] !== undefined && Number(vPrices[v]) > 0) {
          allExtractedPrices.push(Number(vPrices[v]));
        }
      });

      // Also check standardPrices
      if (product.standardPrices) {
        Object.values(product.standardPrices).forEach(p => {
          if (Number(p) > 0) allExtractedPrices.push(Number(p));
        });
      }

      if (allExtractedPrices.length > 0) {
        const minP = Math.min(...allExtractedPrices);
        const maxP = Math.max(...allExtractedPrices);
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
        const ingPrice = Number(ing.avg_buy_price || ing.price || ing.standardPrices?.[selectedBranch] || ing.last_buy_price || 0);
        const qtyNum = parseFloat(comp.qty) || 0;
        const ingUnit = String(ing.unit || ing.satuan || '').toLowerCase().trim();
        const compUnit = String(comp.unit || '').toLowerCase().trim();

        let cost = 0;
        if ((ingUnit === 'kg' || ingUnit === 'kilogram') && (compUnit === 'gram' || compUnit === 'gr' || compUnit === 'g')) {
          cost = (qtyNum / 1000) * ingPrice;
        } else if ((ingUnit === 'gram' || ingUnit === 'gr' || ingUnit === 'g') && (compUnit === 'kg' || compUnit === 'kilogram')) {
          cost = (qtyNum * 1000) * ingPrice;
        } else if ((ingUnit === 'liter' || ingUnit === 'l') && (compUnit === 'ml' || compUnit === 'mililiter' || compUnit === 'cc')) {
          cost = (qtyNum / 1000) * ingPrice;
        } else if ((ingUnit === 'ml' || ingUnit === 'mililiter' || ingUnit === 'cc') && (compUnit === 'liter' || compUnit === 'l')) {
          cost = (qtyNum * 1000) * ingPrice;
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
        const outId = String(selectedOutletFilter);
        const selIds = (product.selectedOutletIds || product.selected_outlet_ids || []).map(x => String(x));
        const stdPrices = product.standardPrices || product.standard_prices || product.branch_prices || product.outlet_prices || {};
        const inStdPrices = (stdPrices[outId] !== undefined && Number(stdPrices[outId]) > 0) ||
                            (stdPrices[Number(outId)] !== undefined && Number(stdPrices[Number(outId)]) > 0);
        const isDirect = String(product.outlet_id) === outId;
        const isGlobal = !product.outlet_id || product.outlet_id === 'Semua Outlet' || product.outlet_id === 'Semua Outlet (Central)' || product.outlet_id === 'ALL';

        if (selIds.length > 0) {
          if (!selIds.includes(outId) && !isDirect && !inStdPrices) return false;
        } else {
          if (!isGlobal && !isDirect && !inStdPrices) return false;
        }
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
    setSelectedOutletIds(allOutlets.map(o => o.id));
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
    setBranchVariantPrices({});
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

    // Outlet selection load
    if (Array.isArray(product.selectedOutletIds) && product.selectedOutletIds.length > 0) {
      setSelectedOutletIds(product.selectedOutletIds);
    } else if (product.outlet_id && product.outlet_id !== 'Semua Outlet') {
      setSelectedOutletIds([product.outlet_id]);
    } else {
      setSelectedOutletIds(allOutlets.map(o => o.id));
    }

    // Variants load
    const prodVars = Array.isArray(product.variants) ? product.variants : [];
    setVariants(prodVars);
    const vPrices = product.variantPrices || {};
    setVariantPrices(vPrices);

    const bVarPrices = product.branchVariantPrices || product.branch_variant_prices || {};
    setBranchVariantPrices(bVarPrices);

    const hasDiffPrices = prodVars.some(v => vPrices[v] && Number(vPrices[v]) !== pPrice);
    setHasCustomVariantPrices(hasDiffPrices);
    setTempVariantInput('');

    const initialComps = (product.compositions || []).map((c, idx) => ({
      ...c,
      id: c.id || `${Date.now()}_${idx}_${Math.random()}`
    }));
    setCompositions(initialComps);
    setFormSubTab('info');
    setShowFormModal(true);
  };

  // -------------------------------------------------------------
  // VARIANT HANDLERS
  // -------------------------------------------------------------
  const handleAddVariant = () => {
    if (!tempVariantInput.trim()) return;
    const vName = tempVariantInput.trim().toUpperCase();
    if (!variants.includes(vName)) {
      setVariants([...variants, vName]);
      const currentPrice = parseFloat(basePrice) || 0;
      setVariantPrices(prev => ({ ...prev, [vName]: currentPrice }));
      setBranchVariantPrices(prev => {
        const next = { ...prev };
        allOutlets.forEach(o => {
          const outBase = standardPrices[o.id] !== undefined ? standardPrices[o.id] : currentPrice;
          next[o.id] = { ...(next[o.id] || {}), [vName]: outBase };
        });
        return next;
      });
    }
    setTempVariantInput('');
  };

  const handleRemoveVariant = (vName) => {
    setVariants(variants.filter(v => v !== vName));
    const copy = { ...variantPrices };
    delete copy[vName];
    setVariantPrices(copy);

    setBranchVariantPrices(prev => {
      const next = { ...prev };
      allOutlets.forEach(o => {
        if (next[o.id]) {
          const outCopy = { ...next[o.id] };
          delete outCopy[vName];
          next[o.id] = outCopy;
        }
      });
      return next;
    });
  };

  const handleUpdateBranchVariantPrice = (outletId, variantName, priceVal) => {
    setBranchVariantPrices(prev => ({
      ...prev,
      [outletId]: {
        ...(prev[outletId] || {}),
        [variantName]: Number(priceVal)
      }
    }));
  };

  // -------------------------------------------------------------
  // COMPOSITION ROW HANDLERS
  // -------------------------------------------------------------
  const handleAddCompositionRow = () => {
    const firstIng = allIngredients[0];
    const defaultUnit = firstIng ? (firstIng.unit || firstIng.satuan || 'Pcs') : 'Pcs';
    setCompositions(prev => [
      ...prev,
      {
        id: Date.now() + Math.random(),
        ingredient_id: firstIng ? firstIng.id : '',
        ingredient_name: firstIng ? firstIng.name : '',
        qty: 1,
        unit: defaultUnit
      }
    ]);
  };

  const handleUpdateCompositionRow = (compId, field, val) => {
    setCompositions(prev => prev.map(c => {
      if (c.id !== compId) return c;
      if (field === 'ingredient_id') {
        const ing = allIngredients.find(i => String(i.id) === String(val));
        const ingUnit = ing ? (ing.unit || ing.satuan || c.unit) : c.unit;
        return {
          ...c,
          ingredient_id: val,
          ingredient_name: ing ? ing.name : c.ingredient_name,
          unit: ingUnit
        };
      }
      return { ...c, [field]: val };
    }));
  };

  const handleRemoveCompositionRow = (compId, idx) => {
    setCompositions(prev => prev.filter((c, i) => {
      if (compId !== undefined && compId !== null && c.id) {
        return c.id !== compId;
      }
      return i !== idx;
    }));
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
    const finalSelectedOutIds = selectedOutletIds.length > 0
      ? selectedOutletIds.map(x => String(x))
      : allOutlets.map(o => String(o.id));

    allOutlets.forEach(o => {
      const isIncluded = finalSelectedOutIds.some(id => String(id) === String(o.id));
      const p = standardPrices[o.id] !== undefined
        ? Number(standardPrices[o.id])
        : (standardPrices[String(o.id)] !== undefined ? Number(standardPrices[String(o.id)]) : priceNum);
      savedStdPrices[String(o.id)] = p;
      savedStdPrices[Number(o.id)] = p;
      const statusVal = isIncluded ? (outletApkStatus[o.id] || outletApkStatus[String(o.id)] || 'Aktif') : 'Inaktif';
      savedApkStatus[String(o.id)] = statusVal;
      savedApkStatus[Number(o.id)] = statusVal;
    });

    const savedVariantPrices = {};
    if (variants.length > 0) {
      variants.forEach(v => {
        const firstOutPrice = Object.values(branchVariantPrices).find(bv => bv && bv[v] !== undefined)?.[v];
        savedVariantPrices[v] = firstOutPrice !== undefined ? Number(firstOutPrice) : (parseFloat(variantPrices[v]) || priceNum);
      });
    }

    const nowTs = Date.now();
    const productPayload = {
      id: editingProductId || nowTs,
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
      image_url: '',
      image: '',
      outlet_id: finalSelectedOutIds.length === allOutlets.length
        ? 'Semua Outlet'
        : (finalSelectedOutIds.length === 1 ? String(finalSelectedOutIds[0]) : 'Semua Outlet'),
      outlet_name: finalSelectedOutIds.length === 1
        ? (allOutlets.find(o => String(o.id) === String(finalSelectedOutIds[0]))?.name || '')
        : 'Semua Outlet',
      selectedOutletIds: finalSelectedOutIds,
      selected_outlet_ids: finalSelectedOutIds,
      standardPrices: savedStdPrices,
      standard_prices: savedStdPrices,
      branch_prices: savedStdPrices,
      outlet_prices: savedStdPrices,
      apkStatus: savedApkStatus,
      outletApkStatus: savedApkStatus,
      outlet_apk_status: savedApkStatus,
      variants: variants,
      variantPrices: savedVariantPrices,
      branchVariantPrices: branchVariantPrices,
      compositions: compositions,
      _updatedAt: nowTs,
      _lastMutated: nowTs,
      _lastUpdated: nowTs
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

    const nextDeleted = (masterData?.deletedProductIds || []).filter(
      del => String(del).toLowerCase() !== String(productPayload.id).toLowerCase() &&
             String(del).toLowerCase() !== String(productPayload.sku).toLowerCase() &&
             String(del).toLowerCase() !== String(productPayload.name).toLowerCase()
    );

    const nextMaster = {
      ...masterData,
      products: updatedProducts,
      deletedProductIds: nextDeleted,
      _lastMutated: nowTs,
      _lastUpdated: nowTs
    };

    setMasterData(nextMaster);
    try {
      localStorage.setItem('mris_master_data', JSON.stringify(nextMaster));
    } catch (e) {}

    // Segera dorong ke server backend VPS agar POS Kasir langsung menerima produk baru
    try {
      fetch(getApiUrl('/api/master-data'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nextMaster)
      }).catch(err => console.warn('Failed to push saved product to server:', err));
    } catch (e) {}

    setShowFormModal(false);
    alert(`Menu "${productPayload.name}" berhasil disimpan dan disinkronkan ke seluruh POS Kasir!`);
  };

  // -------------------------------------------------------------
  // SMART AUTO-MERGE & TRANSACTION RELINKING LOGIC
  // -------------------------------------------------------------
  const duplicateGroups = useMemo(() => {
    const prods = masterData?.products || [];
    const map = {};
    prods.forEach(p => {
      const normName = String(p.name || '').trim().toUpperCase();
      if (!normName) return;
      if (!map[normName]) map[normName] = [];
      map[normName].push(p);
    });

    const groups = [];
    Object.keys(map).forEach(name => {
      if (map[name].length > 1) {
        let totalTx = 0;
        map[name].forEach(item => {
          totalTx += countRelatedTransactions(masterData, 'product', item.id);
        });

        groups.push({
          name,
          items: map[name],
          count: map[name].length,
          totalTx
        });
      }
    });
    return groups;
  }, [masterData?.products, masterData?.salesTransactions]);

  const mergeSingleGroup = (group, currentProducts, currentSales) => {
    const items = group.items;
    if (items.length <= 1) return { products: currentProducts, sales: currentSales };

    // Master item is first item or one with the highest recipe/price
    const masterItem = items[0];
    const duplicateIds = items.slice(1).map(i => i.id);

    // Merge selectedOutletIds
    const allSelectedOutletIds = Array.from(new Set(
      items.flatMap(item => {
        if (Array.isArray(item.selectedOutletIds) && item.selectedOutletIds.length > 0) {
          return item.selectedOutletIds;
        }
        if (item.outlet_id && item.outlet_id !== 'Semua Outlet') {
          return [item.outlet_id];
        }
        return allOutlets.map(o => o.id);
      })
    ));

    // Merge standardPrices & branchVariantPrices
    const mergedStandardPrices = {};
    const mergedApkStatus = {};
    const mergedBranchVariantPrices = {};
    let mergedVariants = [];
    let mergedCompositions = masterItem.compositions || [];

    items.forEach(item => {
      if (item.standardPrices) {
        Object.keys(item.standardPrices).forEach(oId => {
          if (mergedStandardPrices[oId] === undefined && Number(item.standardPrices[oId]) > 0) {
            mergedStandardPrices[oId] = Number(item.standardPrices[oId]);
          }
        });
      }
      if (item.outlet_id && item.outlet_id !== 'Semua Outlet') {
        mergedStandardPrices[item.outlet_id] = Number(item.price || masterItem.price || 0);
      }

      if (item.branchVariantPrices || item.branch_variant_prices) {
        const bMap = item.branchVariantPrices || item.branch_variant_prices;
        Object.keys(bMap).forEach(oId => {
          mergedBranchVariantPrices[oId] = {
            ...(mergedBranchVariantPrices[oId] || {}),
            ...(bMap[oId] || {})
          };
        });
      }

      if (Array.isArray(item.variants)) {
        mergedVariants = Array.from(new Set([...mergedVariants, ...item.variants]));
      }

      if (Array.isArray(item.compositions) && item.compositions.length > mergedCompositions.length) {
        mergedCompositions = item.compositions;
      }
    });

    allOutlets.forEach(o => {
      if (mergedStandardPrices[o.id] === undefined) {
        mergedStandardPrices[o.id] = Number(masterItem.price || 25000);
      }
      mergedApkStatus[o.id] = allSelectedOutletIds.some(id => String(id) === String(o.id)) ? 'Aktif' : 'Inaktif';
    });

    const mergedMasterProduct = {
      ...masterItem,
      selectedOutletIds: allSelectedOutletIds,
      selected_outlet_ids: allSelectedOutletIds,
      outlet_id: allSelectedOutletIds.length === allOutlets.length ? 'Semua Outlet' : (allSelectedOutletIds[0] || 'Semua Outlet'),
      standardPrices: mergedStandardPrices,
      apkStatus: mergedApkStatus,
      outletApkStatus: mergedApkStatus,
      variants: mergedVariants,
      branchVariantPrices: mergedBranchVariantPrices,
      branch_variant_prices: mergedBranchVariantPrices,
      compositions: mergedCompositions,
      _lastUpdated: Date.now()
    };

    // Relink sales transactions
    const updatedSales = (currentSales || []).map(tx => {
      if (Array.isArray(tx.items)) {
        let hasModified = false;
        const updatedItems = tx.items.map(it => {
          const itProdId = it.product_id || it.productId || it.id;
          if (duplicateIds.some(dId => String(dId) === String(itProdId))) {
            hasModified = true;
            return {
              ...it,
              product_id: masterItem.id,
              productId: masterItem.id,
              _mergedFromId: itProdId
            };
          }
          return it;
        });
        return hasModified ? { ...tx, items: updatedItems } : tx;
      }
      const singleId = tx.product_id || tx.productId;
      if (duplicateIds.some(dId => String(dId) === String(singleId))) {
        return {
          ...tx,
          product_id: masterItem.id,
          productId: masterItem.id,
          _mergedFromId: singleId
        };
      }
      return tx;
    });

    // Remove duplicates from products list
    const updatedProducts = currentProducts
      .filter(p => !duplicateIds.some(dId => String(dId) === String(p.id)))
      .map(p => String(p.id) === String(masterItem.id) ? mergedMasterProduct : p);

    return { products: updatedProducts, sales: updatedSales };
  };

  const handleMergeSingleGroup = (group) => {
    if (!allowEdit) {
      alert('Anda tidak memiliki hak akses untuk mengedit/menggabungkan menu.');
      return;
    }
    if (!confirm(`Gabungkan ${group.items.length} menu "${group.name}" menjadi 1 Menu Master?\n\n• ${group.totalTx} riwayat transaksi penjualan akan ditautkan ke Master Baru secara aman tanpa mengubah pembukuan.`)) {
      return;
    }

    const { products, sales } = mergeSingleGroup(group, masterData?.products || [], masterData?.salesTransactions || []);
    setMasterData({
      ...masterData,
      products,
      salesTransactions: sales,
      _lastUpdated: Date.now()
    });

    alert(`Menu "${group.name}" berhasil dikonsolidasikan dan ${group.totalTx} transaksi berhasil ditautkan ulang!`);
  };

  const handleMergeAllDuplicates = () => {
    if (!allowEdit) {
      alert('Anda tidak memiliki hak akses untuk mengedit/menggabungkan menu.');
      return;
    }
    if (duplicateGroups.length === 0) {
      alert('Tidak ada menu duplikat yang terdeteksi.');
      return;
    }

    const totalTxAll = duplicateGroups.reduce((acc, g) => acc + g.totalTx, 0);
    if (!confirm(`Konfirmasi Smart Auto-Merge:\n\n• Ditemukan ${duplicateGroups.length} grup menu duplikat.\n• Seluruh duplikat akan disatukan menjadi Menu Master.\n• ${totalTxAll} riwayat transaksi penjualan akan ditautkan ulang dengan aman.\n\nLanjutkan konsolidasi?`)) {
      return;
    }

    let curProds = [...(masterData?.products || [])];
    let curSales = [...(masterData?.salesTransactions || [])];

    duplicateGroups.forEach(group => {
      const res = mergeSingleGroup(group, curProds, curSales);
      curProds = res.products;
      curSales = res.sales;
    });

    setMasterData({
      ...masterData,
      products: curProds,
      salesTransactions: curSales,
      _lastUpdated: Date.now()
    });

    setShowDuplicateMergeModal(false);
    alert(`🎉 Sukses! ${duplicateGroups.length} grup menu duplikat berhasil disatukan dan ${totalTxAll} transaksi aman ditautkan!`);
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
        const prod = (masterData?.products || []).find(p => 
          String(p.id) === String(id) || 
          String(p.sku || '').toUpperCase() === String(id).toUpperCase() || 
          String(p.code || '').toUpperCase() === String(id).toUpperCase() || 
          String(p.name || '').trim().toUpperCase() === String(name || '').trim().toUpperCase()
        );

        const delSku = prod?.sku || prod?.code || '';
        const delName = prod?.name || name;
        const delId = prod?.id || id;

        executePermanentDelete({
          key: 'products',
          id: delId,
          sku: delSku,
          code: delSku,
          name: delName,
          masterData,
          setMasterData
        });
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
          {duplicateGroups.length > 0 && (
            <button
              type="button"
              onClick={() => setShowDuplicateMergeModal(true)}
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
              <span>Cek {duplicateGroups.length} Menu Duplikat</span>
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
                {/* Clean Menu Header */}
                <div style={{
                  padding: '14px 14px 10px 14px',
                  borderBottom: `1px solid ${T.border}`,
                  background: T.cardBg2,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  gap: '8px'
                }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                      <span style={{ fontSize: '0.64rem', fontWeight: '800', background: T.inputBg, color: T.info, padding: '2px 6px', borderRadius: '4px', border: `1px solid ${T.border}`, fontFamily: 'monospace' }}>
                        {product.sku || product.code || 'PRD'}
                      </span>
                      <span style={{ fontSize: '0.64rem', fontWeight: '800', background: T.infoBg, color: T.info, padding: '2px 6px', borderRadius: '4px' }}>
                        {product.category_name || product.category || 'Menu'}
                      </span>
                    </div>
                    <h3 style={{ fontSize: '0.94rem', fontWeight: '900', color: T.txtPrimary, margin: 0, textTransform: 'uppercase', letterSpacing: '-0.01em' }}>
                      {product.name}
                    </h3>
                    {Boolean(product.needs_review || product.status_katalog === 'perlu_diedit' || (product.notes || '').includes('Perlu Dilengkapi')) && (
                      <div style={{ marginTop: '4px' }}>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontSize: '0.62rem',
                          fontWeight: '800',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          background: 'rgba(245, 158, 11, 0.2)',
                          border: '1px solid #f59e0b',
                          color: '#fbbf24'
                        }}>
                          ⚠️ Perlu Diedit / Dilengkapi
                        </span>
                      </div>
                    )}
                  </div>

                  <span style={{
                    fontSize: '0.64rem',
                    fontWeight: '800',
                    padding: '3px 8px',
                    borderRadius: '6px',
                    background: isAvailable ? T.successBg : T.dangerBg,
                    color: isAvailable ? T.success : T.danger,
                    border: `1px solid ${isAvailable ? T.successBorder : T.dangerBorder}`,
                    whiteSpace: 'nowrap'
                  }}>
                    {isAvailable ? 'Aktif' : 'Inaktif'}
                  </span>
                </div>

                {/* Card Body */}
                <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'space-between' }}>
                  <div>

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
                      {/* SKU */}
                      <td style={{ padding: '10px 12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: T.cardBg2, border: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Package size={15} color={T.primary} />
                          </div>
                          <span style={{ fontWeight: '800', color: T.info, fontFamily: 'monospace', fontSize: '0.74rem' }}>
                            {product.sku || product.code || 'PRD'}
                          </span>
                        </div>
                      </td>

                      {/* Product Name */}
                      <td style={{ padding: '10px 12px', fontWeight: '800', textTransform: 'uppercase' }}>
                        <div>{product.name}</div>
                        {Boolean(product.needs_review || product.status_katalog === 'perlu_diedit' || (product.notes || '').includes('Perlu Dilengkapi')) && (
                          <div style={{ marginTop: '2px' }}>
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              fontSize: '0.60rem',
                              fontWeight: '800',
                              padding: '1px 5px',
                              borderRadius: '4px',
                              background: 'rgba(245, 158, 11, 0.2)',
                              border: '1px solid #f59e0b',
                              color: '#fbbf24'
                            }}>
                              ⚠️ Perlu Diedit
                            </span>
                          </div>
                        )}
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
                      *Harga acuan dasar yang otomatis mengisi harga cabang di bawah.
                    </span>
                  </div>

                  {/* SECTION 1: KELOLA VARIAN MENU */}
                  <div style={{ background: T.cardBg2, border: `1px solid ${T.borderStrong}`, padding: '12px 14px', borderRadius: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <span style={{ fontSize: '0.78rem', fontWeight: '800', color: T.txtPrimary, display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Palette size={15} color={T.primary} />
                          <span>Pilihan Varian Menu (Opsional)</span>
                        </span>
                        <p style={{ fontSize: '0.66rem', color: T.txtSecondary, margin: '2px 0 0 0' }}>
                          Contoh: Tambah varian <strong>GORENG</strong> dan <strong>BAKAR</strong>, lalu atur harga masing-masing di cabang bawah
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
                        placeholder="Ketik nama varian (contoh: GORENG / BAKAR / JUMBO)..."
                        value={tempVariantInput}
                        onChange={e => setTempVariantInput(e.target.value.toUpperCase())}
                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddVariant(); } }}
                        className="form-input"
                        style={{ background: T.inputBg, borderColor: T.border, color: T.txtPrimary, flex: 1, fontSize: '0.74rem', textTransform: 'uppercase' }}
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
                            <span>🎨 {v}</span>
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
                  </div>

                  {/* SECTION 2: KETERSEDIAAN & PENGATURAN HARGA PER CABANG OUTLET */}
                  <div style={{ background: T.cardBg2, border: `1px solid ${T.borderStrong}`, padding: '12px 14px', borderRadius: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                      <div>
                        <span style={{ fontSize: '0.78rem', fontWeight: '800', color: T.txtPrimary, display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Store size={15} color={T.primary} />
                          <span>Pilih Cabang &amp; Atur Harga {variants.length > 0 ? 'Varian Khusus' : 'Menu'}</span>
                        </span>
                        <p style={{ fontSize: '0.66rem', color: T.txtSecondary, margin: '2px 0 0 0' }}>
                          Centang cabang yang menjual menu ini. Anda dapat menentukan harga berbeda untuk setiap varian di setiap cabang.
                        </p>
                      </div>

                      {/* Quick Select Buttons */}
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                          type="button"
                          onClick={() => setSelectedOutletIds(allOutlets.map(o => o.id))}
                          style={{
                            background: selectedOutletIds.length === allOutlets.length ? T.primary : T.inputBg,
                            color: selectedOutletIds.length === allOutlets.length ? T.txtInverse : T.txtPrimary,
                            border: `1px solid ${T.border}`,
                            padding: '3px 8px',
                            borderRadius: '6px',
                            fontSize: '0.68rem',
                            fontWeight: '800',
                            cursor: 'pointer'
                          }}
                        >
                          ✓ Pilih Semua ({allOutlets.length})
                        </button>

                        <button
                          type="button"
                          onClick={() => setSelectedOutletIds([])}
                          style={{
                            background: T.inputBg,
                            color: T.txtSecondary,
                            border: `1px solid ${T.border}`,
                            padding: '3px 8px',
                            borderRadius: '6px',
                            fontSize: '0.68rem',
                            fontWeight: '700',
                            cursor: 'pointer'
                          }}
                        >
                          Kosongkan
                        </button>
                      </div>
                    </div>

                    {/* Outlets Checklist & Granular Variant Price Table */}
                    <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {allOutlets.map(o => {
                        const isSelected = selectedOutletIds.some(id => String(id) === String(o.id));
                        const outPrice = standardPrices[o.id] !== undefined ? standardPrices[o.id] : basePrice;

                        return (
                          <div
                            key={o.id}
                            style={{
                              background: isSelected ? T.inputBg : T.controlBg,
                              padding: '10px 12px',
                              borderRadius: '10px',
                              border: `1px solid ${isSelected ? T.primary : T.border}`,
                              opacity: isSelected ? 1 : 0.6,
                              transition: 'all 0.15s ease'
                            }}
                          >
                            {/* Header of Outlet Row */}
                            <div style={{ display: 'grid', gridTemplateColumns: '24px 1.5fr 1fr 1fr', gap: '8px', alignItems: 'center' }}>
                              {/* Checkbox */}
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => {
                                  if (isSelected) {
                                    setSelectedOutletIds(selectedOutletIds.filter(id => String(id) !== String(o.id)));
                                  } else {
                                    setSelectedOutletIds([...selectedOutletIds, o.id]);
                                  }
                                }}
                                style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                              />

                              {/* Outlet Name */}
                              <div>
                                <span style={{ fontSize: '0.76rem', fontWeight: '900', color: isSelected ? T.txtPrimary : T.txtSecondary }}>
                                  {o.name}
                                </span>
                                <div style={{ fontSize: '0.62rem', color: isSelected ? T.success : T.danger, fontWeight: '700' }}>
                                  {isSelected ? '✓ Dijual di Cabang Ini' : '✗ Tidak Dijual'}
                                </div>
                              </div>

                              {/* Base Outlet Price (Only shown if NO variants) */}
                              {variants.length === 0 ? (
                                <div>
                                  <input
                                    type="number"
                                    disabled={!isSelected}
                                    placeholder="Harga Rp"
                                    value={outPrice}
                                    onChange={e => setStandardPrices({ ...standardPrices, [o.id]: Number(e.target.value) })}
                                    className="form-input"
                                    style={{
                                      background: isSelected ? T.cardBg : 'transparent',
                                      borderColor: isSelected ? T.border : 'transparent',
                                      color: isSelected ? T.accentGold : T.txtMuted,
                                      padding: '4px 8px',
                                      fontSize: '0.74rem',
                                      fontWeight: '800'
                                    }}
                                  />
                                </div>
                              ) : (
                                <div style={{ fontSize: '0.68rem', color: T.accentGold, fontWeight: '800' }}>
                                  {variants.length} Harga Varian Khusus &darr;
                                </div>
                              )}

                              {/* Status at POS */}
                              <div>
                                <select
                                  disabled={!isSelected}
                                  value={outletApkStatus[o.id] || 'Aktif'}
                                  onChange={e => setOutletApkStatus({ ...outletApkStatus, [o.id]: e.target.value })}
                                  className="form-select"
                                  style={{
                                    background: isSelected ? T.cardBg : 'transparent',
                                    borderColor: isSelected ? T.border : 'transparent',
                                    color: isSelected ? T.txtPrimary : T.txtMuted,
                                    padding: '4px 6px',
                                    fontSize: '0.70rem'
                                  }}
                                >
                                  <option value="Aktif">Tersedia</option>
                                  <option value="Inaktif">Habis</option>
                                </select>
                              </div>
                            </div>

                            {/* Granular Variant Price Inputs per Outlet */}
                            {isSelected && variants.length > 0 && (
                              <div style={{
                                marginTop: '10px',
                                paddingTop: '10px',
                                borderTop: `1px dashed ${T.border}`,
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                                gap: '8px'
                              }}>
                                {variants.map(v => {
                                  const currentVPrice = branchVariantPrices[o.id]?.[v] !== undefined
                                    ? branchVariantPrices[o.id][v]
                                    : (variantPrices[v] !== undefined ? variantPrices[v] : outPrice);

                                  return (
                                    <div key={v} style={{ background: T.cardBg, padding: '6px 10px', borderRadius: '8px', border: `1px solid ${T.borderStrong}`, display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                      <span style={{ fontSize: '0.66rem', fontWeight: '800', color: T.txtSecondary }}>
                                        Varian: <strong style={{ color: T.txtPrimary }}>{v}</strong>
                                      </span>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <span style={{ fontSize: '0.66rem', color: T.txtMuted, fontWeight: '700' }}>Rp</span>
                                        <input
                                          type="number"
                                          placeholder="Harga Rp"
                                          value={currentVPrice}
                                          onChange={e => handleUpdateBranchVariantPrice(o.id, v, e.target.value)}
                                          className="form-input"
                                          style={{
                                            background: T.inputBg,
                                            borderColor: T.border,
                                            color: T.accentGold,
                                            padding: '4px 6px',
                                            fontSize: '0.76rem',
                                            fontWeight: '800',
                                            width: '100%'
                                          }}
                                        />
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
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
                      {compositions.map((comp, idx) => {
                        const ing = allIngredients.find(i => String(i.id) === String(comp.ingredient_id));
                        const ingPrice = Number(ing?.avg_buy_price || ing?.price || 0);

                        return (
                          <div key={comp.id || idx} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 40px', gap: '8px', alignItems: 'center', background: T.inputBg, padding: '8px 10px', borderRadius: '8px', border: `1px solid ${T.border}` }}>
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

                            {/* Unit Select Dynamically from masterData.units */}
                            <div>
                              <select
                                value={comp.unit}
                                onChange={e => handleUpdateCompositionRow(comp.id, 'unit', e.target.value)}
                                className="form-select"
                                style={{ background: T.cardBg, borderColor: T.border, color: T.txtPrimary, width: '100%', fontSize: '0.72rem' }}
                              >
                                {allUnits.map(u => (
                                  <option key={u} value={u}>{u}</option>
                                ))}
                                {comp.unit && !allUnits.includes(comp.unit) && (
                                  <option value={comp.unit}>{comp.unit}</option>
                                )}
                              </select>
                            </div>

                            {/* Remove Button */}
                            <button
                              type="button"
                              onClick={() => handleRemoveCompositionRow(comp.id, idx)}
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
          menuItem={selectedMenuDetail}
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
          guardState={deleteGuardState}
          state={deleteGuardState}
          onClose={() => setDeleteGuardState(null)}
          theme={themeMode}
          themeMode={themeMode}
        />
      )}

      {/* ------------------------------------------------------------- */}
      {/* 9. MODAL: SMART AUTO-MERGE & KONSOLIDASI MENU DUPLIKAT        */}
      {/* ------------------------------------------------------------- */}
      {showDuplicateMergeModal && (
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
            maxWidth: '740px',
            maxHeight: '90vh',
            overflowY: 'auto',
            background: T.cardBg,
            border: `1px solid ${T.borderStrong}`,
            borderRadius: '16px',
            padding: '24px',
            boxShadow: '0 25px 50px rgba(0,0,0,0.6)'
          }}>
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: '900', color: T.txtPrimary, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Sparkles size={20} color={T.primary} />
                  <span>Smart Konsolidasi Menu Duplikat</span>
                </h3>
                <p style={{ fontSize: '0.74rem', color: T.txtSecondary, margin: '4px 0 0 0' }}>
                  Satukan menu bernama sama menjadi 1 Menu Master dengan multi-harga cabang &amp; relinking transaksi yang aman
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowDuplicateMergeModal(false)}
                style={{ background: 'none', border: 'none', color: T.txtSecondary, cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Audit-Safe Banner */}
            <div style={{ background: T.infoBg, border: `1px solid ${T.infoBorder}`, padding: '12px 14px', borderRadius: '10px', marginBottom: '16px', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
              <CheckCircle2 size={18} color={T.info} style={{ flexShrink: 0, marginTop: '2px' }} />
              <div style={{ fontSize: '0.72rem', color: T.txtPrimary, lineHeight: '1.4' }}>
                <strong style={{ color: T.info }}>Audit-Safe Transaction Relinking:</strong> Riwayat transaksi penjualan masa lalu akan ditautkan secara aman ke ID Menu Master baru. <strong>Nominal omzet, rincian nota, dan pembukuan masa lalu tidak akan bergeser 1 Rupiah pun.</strong>
              </div>
            </div>

            {/* Duplicate List */}
            {duplicateGroups.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px 16px', color: T.txtMuted }}>
                <CheckCircle2 size={40} color={T.success} style={{ margin: '0 auto 10px auto' }} />
                <h4 style={{ fontSize: '0.94rem', fontWeight: '800', color: T.txtPrimary, margin: 0 }}>Semua Menu Bersih &amp; Terkonsolidasi!</h4>
                <p style={{ fontSize: '0.74rem', color: T.txtSecondary, marginTop: '4px' }}>Tidak ada menu dengan nama duplikat yang terdeteksi di database.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {duplicateGroups.map((grp) => (
                  <div
                    key={grp.name}
                    style={{
                      background: T.cardBg2,
                      border: `1px solid ${T.borderStrong}`,
                      borderRadius: '12px',
                      padding: '14px 16px'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                      <div>
                        <span style={{ fontSize: '0.88rem', fontWeight: '900', color: T.txtPrimary }}>
                          {grp.name}
                        </span>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '2px', fontSize: '0.68rem', color: T.txtSecondary }}>
                          <span style={{ background: T.dangerBg, color: T.danger, padding: '2px 6px', borderRadius: '4px', fontWeight: '800' }}>
                            {grp.count} Item Terdaftar
                          </span>
                          <span>•</span>
                          <span style={{ color: T.accentGold, fontWeight: '800' }}>
                            📊 {grp.totalTx} Riwayat Transaksi Terkait
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleMergeSingleGroup(grp)}
                        className="btn-primary"
                        style={{ padding: '6px 14px', fontSize: '0.72rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '4px' }}
                      >
                        <Sparkles size={13} />
                        <span>Konsolidasi Menu Ini</span>
                      </button>
                    </div>

                    {/* Breakdown of items in this group */}
                    <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {grp.items.map((item, idx) => {
                        const txCount = countRelatedTransactions(masterData, 'product', item.id);
                        const outName = allOutlets.find(o => String(o.id) === String(item.outlet_id))?.name || item.outlet_id || 'Semua Outlet';

                        return (
                          <div
                            key={item.id}
                            style={{
                              background: T.inputBg,
                              padding: '6px 10px',
                              borderRadius: '8px',
                              border: `1px solid ${T.border}`,
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              fontSize: '0.72rem'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ fontSize: '0.64rem', padding: '2px 6px', borderRadius: '4px', background: idx === 0 ? T.successBg : T.cardBg, color: idx === 0 ? T.success : T.txtSecondary, fontWeight: '800' }}>
                                {idx === 0 ? 'CALON MASTER' : `DUPLIKAT #${idx}`}
                              </span>
                              <span style={{ fontFamily: 'monospace', color: T.info, fontWeight: '800' }}>{item.sku || item.code}</span>
                              <span style={{ color: T.txtPrimary, fontWeight: '700' }}>📍 {outName}</span>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <span style={{ fontWeight: '900', color: T.accentGold }}>{formatRupiah(item.price)}</span>
                              <span style={{ fontSize: '0.66rem', color: T.txtMuted }}>({txCount} tx)</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Modal Footer Actions */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '18px', paddingTop: '14px', borderTop: `1px solid ${T.border}` }}>
              <button
                type="button"
                onClick={() => setShowDuplicateMergeModal(false)}
                style={{ background: T.cardBg2, border: `1px solid ${T.border}`, padding: '8px 16px', borderRadius: '8px', color: T.txtSecondary, fontSize: '0.76rem', fontWeight: '700', cursor: 'pointer' }}
              >
                Tutup
              </button>

              {duplicateGroups.length > 0 && allowEdit && (
                <button
                  type="button"
                  onClick={handleMergeAllDuplicates}
                  style={{
                    padding: '8px 20px',
                    fontSize: '0.76rem',
                    fontWeight: '900',
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: '0 4px 12px rgba(16, 185, 129, 0.4)'
                  }}
                >
                  <Sparkles size={16} />
                  <span>⚡ Auto-Merge Semua Duplikat ({duplicateGroups.length})</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
