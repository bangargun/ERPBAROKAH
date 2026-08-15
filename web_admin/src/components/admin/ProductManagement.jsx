import React, { useState, useEffect } from 'react';
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
  ArrowLeft, 
  Store, 
  Layers, 
  ShoppingBasket,
  DollarSign,
  Grid,
  LayoutGrid,
  BarChart3
} from 'lucide-react';
import MenuAnalyticsDetailModal from './MenuAnalyticsDetailModal';
import PaginationControls from './PaginationControls';
import { FileSpreadsheet } from 'lucide-react';
import ExcelMasterImportModal from './ExcelMasterImportModal';
import { getThemePalette } from '../../utils/themeUtils';
import DeleteGuardModal from './DeleteGuardModal';
import { requestDelete, countRelatedTransactions } from '../../utils/deleteGuard';

export default function ProductManagement({ masterData, setMasterData, selectedBranch, themeMode = 'dark' }) {
  const T = getThemePalette(themeMode);
  const [deleteGuardState, setDeleteGuardState] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [displayMode, setDisplayMode] = useState('grid'); // 'grid' | 'table'
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('Semua');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('Semua');
  const [selectedOutletFilter, setSelectedOutletFilter] = useState('Semua');

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
  const [showFormModal, setShowFormModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showExcelImportModal, setShowExcelImportModal] = useState(false);
  const [editingProductId, setEditingProductId] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedMenuDetail, setSelectedMenuDetail] = useState(null);

  // Pagination States (Default 10 rows per page)
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Sorting States
  const [sortField, setSortField] = useState('name');
  const [sortDirection, setSortDirection] = useState('asc');

  const getApiUrl = (pathStr) => `https://mris-api.barokahgroupindonesia.tech${pathStr}`;

  // DRAG & DROP PHOTO UPLOAD HANDLERS
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setProdImageUrl(reader.result);
        };
        reader.readAsDataURL(file);
      } else {
        alert('File harus berupa gambar (JPG, PNG, GIF)');
      }
    }
  };

  const handleFileInputChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (uploadEvent) => {
          setProdImageUrl(uploadEvent.target.result);
        };
        reader.readAsDataURL(file);
      } else {
        alert('File harus berupa gambar (JPG, PNG, GIF)');
      }
    }
  };

  // FORM STATES (Field 1 - 8)
  const [prodName, setProdName] = useState('');
  const [prodCategoryId, setProdCategoryId] = useState('');
  const [prodStatus, setProdStatus] = useState('Aktif');
  const [prodPrinterTarget, setProdPrinterTarget] = useState('dapur');
  const [prodImageUrl, setProdImageUrl] = useState('');
  
  // Field 6: Varian List
  const [variants, setVariants] = useState([]); // ['Sambal Pecak', 'Sambal Ijo']
  const [tempVariantInput, setTempVariantInput] = useState('');

  // Field 7: Outlet Selection & Per-Outlet Variant Prices & APK Visibility Status
  const [selectedOutletIds, setSelectedOutletIds] = useState([]);
  const [tempOutletSelectId, setTempOutletSelectId] = useState('');
  const [variantPrices, setVariantPrices] = useState({}); // { 'Sambal Pecak': { 1: 35000, 2: 38000 } }
  const [standardPrices, setStandardPrices] = useState({}); // { 1: 30000, 2: 32000 }
  const [outletApkStatus, setOutletApkStatus] = useState({}); // { 1785564003169: 'Aktif', 1785537689430: 'Inaktif' }

  // Field 8: Komposisi / Ingredients List
  const [compositions, setCompositions] = useState([]);

  // Helper to generate next sequential product code (e.g. PRD-001, PRD-002)
  const generateNextProductCode = () => {
    const existingCodes = masterData.products
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

  // 1. Add Variant Tag
  const handleAddVariant = () => {
    if (!tempVariantInput.trim()) return;
    const newV = tempVariantInput.trim();
    if (!variants.includes(newV)) {
      setVariants([...variants, newV]);
      // Initialize default per-outlet prices for this new variant, pre-filled from standard outlet prices
      const initPrices = {};
      selectedOutletIds.forEach(outId => {
        initPrices[outId] = standardPrices[outId] !== undefined ? standardPrices[outId] : (standardPrices[String(outId)] || 0);
      });
      setVariantPrices(prev => ({ ...prev, [newV]: initPrices }));
    }
    setTempVariantInput('');
  };

  const handleRemoveVariant = (variantName) => {
    setVariants(variants.filter(v => v !== variantName));
    const copy = { ...variantPrices };
    delete copy[variantName];
    setVariantPrices(copy);
  };

  // Update Price for specific Variant and Outlet
  const handleUpdateVariantPrice = (variantName, outletId, val) => {
    const num = parseFloat(val) || 0;
    setVariantPrices(prev => ({
      ...prev,
      [variantName]: {
        ...(prev[variantName] || {}),
        [outletId]: num
      }
    }));
  };

  // Update Standard Price for specific Outlet and auto-sync uncustomized variant prices
  const handleUpdateStandardPrice = (outletId, val) => {
    const num = parseFloat(val) || 0;
    const oldPrice = standardPrices[outletId] !== undefined ? Number(standardPrices[outletId]) : (Number(standardPrices[String(outletId)]) || 0);

    setStandardPrices(prev => ({
      ...prev,
      [outletId]: num
    }));

    setVariantPrices(prev => {
      const updated = { ...prev };
      variants.forEach(vName => {
        const currentVarP = updated[vName] ? Number(updated[vName][outletId] || 0) : 0;
        if (!updated[vName]) updated[vName] = {};
        if (currentVarP === 0 || currentVarP === oldPrice) {
          updated[vName][outletId] = num;
        }
      });
      return updated;
    });
  };

  // 3. Add Composition Row
  const handleAddCompositionRow = () => {
    const defaultIng = masterData.ingredients?.[0] || null;
    const autoUnit = defaultIng ? (defaultIng.unit || defaultIng.satuan || defaultIng.unit_name || masterData.units?.[0]?.symbol || 'Gram') : 'Gram';

    setCompositions([
      ...compositions,
      {
        id: Date.now(),
        ingredient_id: defaultIng ? defaultIng.id : '',
        ingredient_name: defaultIng ? defaultIng.name : '',
        qty: 1,
        unit: autoUnit
      }
    ]);
  };

  const handleRemoveComposition = (compId) => {
    setCompositions(compositions.filter(c => c.id !== compId));
  };

  const handleUpdateComposition = (compId, field, val) => {
    setCompositions(compositions.map(c => {
      if (c.id === compId) {
        if (field === 'ingredient_id') {
          const ing = (masterData.ingredients || []).find(i => String(i.id) === String(val));
          const autoUnit = ing ? (ing.unit || ing.satuan || ing.unit_name || c.unit) : c.unit;
          return {
            ...c,
            ingredient_id: val,
            ingredient_name: ing ? ing.name : c.ingredient_name,
            unit: autoUnit
          };
        }
        return { ...c, [field]: val };
      }
      return c;
    }));
  };

  // 4. Open Add Form Modal
  const handleOpenAddForm = () => {
    setEditingProductId(null);
    setProdName('');
    setProdCategoryId(masterData.categories[0]?.id || '');
    setProdStatus('Aktif');
    setProdImageUrl('');
    setVariants([]);
    const defaultOutId = (selectedBranch && selectedBranch !== 'all') 
      ? (isNaN(selectedBranch) ? selectedBranch : Number(selectedBranch))
      : (masterData.outlets[0]?.id ? (isNaN(masterData.outlets[0].id) ? masterData.outlets[0].id : Number(masterData.outlets[0].id)) : 1785307180576);
    setSelectedOutletIds([defaultOutId]);
    setTempOutletSelectId(String(defaultOutId));
    setVariantPrices({});
    setStandardPrices({ [defaultOutId]: 0 });
    setOutletApkStatus({ [defaultOutId]: 'Aktif' });
    setCompositions([]);
    setShowFormModal(true);
  };

  // 5. Open Edit Form Modal (1 Menu = 1 Outlet Khusus)
  const handleOpenEditForm = (product) => {
    setEditingProductId(product.id);
    setProdName(product.name);
    setProdCategoryId(product.category_id || masterData.categories[0]?.id);
    setProdStatus(product.status || 'Aktif');
    setProdImageUrl(product.image_url || '');
    setVariants(product.variants || []);

    const stdP = product.standardPrices || {};
    const vP = product.variantPrices || {};

    let singleOutId = null;
    if (Array.isArray(product.selectedOutletIds) && product.selectedOutletIds.length > 0) {
      singleOutId = product.selectedOutletIds[0];
    } else if (product.outlet_id && product.outlet_id !== 'Semua Outlet') {
      singleOutId = product.outlet_id;
    } else {
      singleOutId = masterData.outlets[0]?.id || 1785307180576;
    }
    const cleanOutId = isNaN(singleOutId) ? singleOutId : Number(singleOutId);
    setSelectedOutletIds([cleanOutId]);
    setTempOutletSelectId(String(cleanOutId));

    const prodP = Number(product.price || stdP[cleanOutId] || stdP[String(cleanOutId)] || Object.values(stdP)[0] || 0);
    setStandardPrices({ [cleanOutId]: prodP });
    setVariantPrices(vP);
    setOutletApkStatus({ [cleanOutId]: (product.apkStatus?.[cleanOutId] || product.outletApkStatus?.[cleanOutId] || 'Aktif') });

    const loadedCompositions = (product.compositions || []).map(comp => {
      const matchedIng = (masterData.ingredients || []).find(i => String(i.id) === String(comp.ingredient_id) || i.name === comp.ingredient_name);
      return {
        ...comp,
        unit: comp.unit || matchedIng?.unit || matchedIng?.satuan || matchedIng?.unit_name || 'Gram'
      };
    });
    setCompositions(loadedCompositions);
    setShowFormModal(true);
  };

  // 6. Proceed to PREVIEW MODAL (Field 9)
  const handleProceedToPreview = (e) => {
    e.preventDefault();
    if (!prodName.trim()) {
      alert('Mohon isi Nama Produk');
      return;
    }
    setShowFormModal(false);
    setShowPreviewModal(true);
  };

  // 7. Final Save Product (1 Menu = 1 Outlet Khusus)
  const handleFinalSaveProduct = () => {
    const code = editingProductId 
      ? masterData.products.find(p => p.id === editingProductId)?.sku || generateNextProductCode()
      : generateNextProductCode();

    const categoryObj = masterData.categories.find(c => c.id === parseInt(prodCategoryId));
    
    const targetOutId = (selectedOutletIds && selectedOutletIds.length > 0)
      ? (isNaN(selectedOutletIds[0]) ? selectedOutletIds[0] : Number(selectedOutletIds[0]))
      : (masterData.outlets[0]?.id ? (isNaN(masterData.outlets[0].id) ? masterData.outlets[0].id : Number(masterData.outlets[0].id)) : 1785307180576);

    const priceVal = Number(standardPrices[targetOutId] !== undefined ? standardPrices[targetOutId] : (standardPrices[String(targetOutId)] || Object.values(standardPrices)[0] || 0));

    const productPayload = {
      id: editingProductId || Date.now(),
      sku: code,
      code: code,
      name: prodName.trim(),
      category_id: parseInt(prodCategoryId),
      category_name: categoryObj ? categoryObj.name : 'Makanan Utama',
      category: categoryObj ? categoryObj.name : 'Makanan Utama',
      price: priceVal,
      cost: 0,
      unit: 'Pcs',
      stock: 0,
      min_stock: 0,
      status: prodStatus,
      image_url: prodImageUrl || 'https://images.unsplash.com/photo-1544025162-d76694265947?w=400',
      variants,
      outlet_id: targetOutId,
      selectedOutletIds: [targetOutId],
      selected_outlet_ids: [targetOutId],
      variantPrices,
      standardPrices: { [targetOutId]: priceVal },
      apkStatus: { [targetOutId]: outletApkStatus[targetOutId] || 'Aktif' },
      outletApkStatus: { [targetOutId]: outletApkStatus[targetOutId] || 'Aktif' },
      priceCombinations: [
        {
          id: Date.now(),
          combinationName: prodName.trim(),
          selectedOutletIds: [targetOutId],
          outletPrices: { [targetOutId]: priceVal },
          apkStatus: { [targetOutId]: outletApkStatus[targetOutId] || 'Aktif' },
          status: 'Aktif'
        }
      ],
      compositions,
      _updatedAt: Date.now(),
    };

    const updated = {
      ...masterData,
      _lastUpdated: Date.now()
    };

    if (editingProductId) {
      // When editing: check for duplicate name in same outlet (excluding self)
      const nameConflict = (updated.products || []).find(p =>
        p.id !== editingProductId &&
        String(p.outlet_id) === String(targetOutId) &&
        (p.name || '').trim().toUpperCase() === prodName.trim().toUpperCase()
      );
      if (nameConflict) {
        alert(`⚠️ Menu "${prodName.trim()}" sudah ada di outlet yang sama (${nameConflict.sku}).\n\nSetiap menu hanya boleh 1 kali per outlet. Gunakan nama yang berbeda atau pilih outlet yang berbeda.`);
        return;
      }
      const idx = (updated.products || []).findIndex(p => p.id === editingProductId);
      if (idx !== -1) updated.products[idx] = productPayload;
    } else {
      // When adding: strictly prevent duplicate name in same outlet
      const nameConflict = (updated.products || []).find(p =>
        String(p.outlet_id) === String(targetOutId) &&
        (p.name || '').trim().toUpperCase() === prodName.trim().toUpperCase()
      );
      if (nameConflict) {
        alert(`⚠️ Menu "${prodName.trim()}" sudah ada di outlet yang sama (${nameConflict.sku}).\n\nSetiap menu hanya boleh 1 kali per outlet. Jika menu ini dijual di outlet lain, tambahkan sebagai produk terpisah dengan outlet yang berbeda.`);
        return;
      }
      updated.products.unshift(productPayload);
    }

    setMasterData(updated);
    setShowPreviewModal(false);
    setEditingProductId(null);
  };

  // 8. Delete Product (dengan perlindungan lock jika ada transaksi)
  const handleDeleteProduct = (id, name) => {
    requestDelete({
      masterData,
      type: 'product',
      id,
      name,
      setDeleteGuardState,
      onConfirmed: async () => {
        const updated = {
          ...masterData,
          _lastUpdated: Date.now(),
          products: (masterData.products || []).filter(p => String(p.id) !== String(id))
        };
        setMasterData(updated);
        try {
          const res = await fetch(getApiUrl('/api/master-data/delete-item'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ key: 'products', id })
          });
          if (res.ok) {
            const resData = await res.json();
            if (resData && resData.masterData) setMasterData(resData.masterData);
          }
        } catch (err) {
          console.error('Delete product API error:', err);
        }
      }
    });
  };

  const formatRupiah = (val) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val || 0);
  };

  const isProductAvailableAtOutlet = (product, targetOutletId) => {
    if (!targetOutletId || targetOutletId === 'Semua' || targetOutletId === 'ALL' || targetOutletId === 'Semua Restoran (Konsolidasi)') return true;
    if (!product) return false;

    const strId = String(targetOutletId);
    const numId = Number(targetOutletId);

    // Find the outlet object from masterData.outlets
    const targetOutletObj = (masterData.outlets || []).find(o => 
      String(o.id) === strId || 
      String(o.name).toLowerCase().trim() === strId.toLowerCase().trim()
    );
    const targetNameLower = targetOutletObj ? (targetOutletObj.name || '').toLowerCase().trim() : strId.toLowerCase().trim();
    const targetCodeLower = targetOutletObj && targetOutletObj.code ? String(targetOutletObj.code).toLowerCase().trim() : '';

    // Helper matcher function to check if a value matches the target outlet (by ID, Name, Code, or ALL)
    const matchesOutlet = (val) => {
      if (val === undefined || val === null) return false;
      const s = String(val).toLowerCase().trim();
      if (s === 'all' || s === 'semua' || s === 'semua outlet' || s === 'central') return true;
      if (s === strId || Number(val) === numId) return true;
      if (targetNameLower && s === targetNameLower) return true;
      if (targetCodeLower && s === targetCodeLower) return true;
      return false;
    };

    // Check APK Status per outlet override (if explicitly hidden/inaktif for this outlet)
    if (product.apkStatus && typeof product.apkStatus === 'object') {
      const statusValue = product.apkStatus[strId] || 
                          product.apkStatus[numId] || 
                          (targetNameLower && product.apkStatus[targetNameLower]) ||
                          (targetOutletObj && product.apkStatus[targetOutletObj.name]);
      if (statusValue === 'Hide' || statusValue === 'Inaktif' || statusValue === false) return false;
    }

    // Check 1: Direct outlet_id
    if (matchesOutlet(product.outlet_id)) return true;

    // Check 2: selectedOutletIds array
    if (product.selectedOutletIds && Array.isArray(product.selectedOutletIds) && product.selectedOutletIds.length > 0) {
      if (product.selectedOutletIds.some(matchesOutlet)) return true;
    }

    // Check 3: standardPrices map
    if (product.standardPrices && typeof product.standardPrices === 'object') {
      for (const k of Object.keys(product.standardPrices)) {
        if (matchesOutlet(k) && Number(product.standardPrices[k]) > 0) return true;
      }
    }

    // Check 4: variantPrices map
    if (product.variantPrices && typeof product.variantPrices === 'object') {
      for (const vName of Object.keys(product.variantPrices)) {
        const vMap = product.variantPrices[vName] || {};
        for (const k of Object.keys(vMap)) {
          if (matchesOutlet(k) && Number(vMap[k]) > 0) return true;
        }
      }
    }

    // Check 5: priceCombinations
    if (product.priceCombinations && Array.isArray(product.priceCombinations)) {
      for (const combo of product.priceCombinations) {
        if (combo.selectedOutletIds && Array.isArray(combo.selectedOutletIds)) {
          if (combo.selectedOutletIds.some(matchesOutlet)) return true;
        }
        if (combo.outletPrices && typeof combo.outletPrices === 'object') {
          for (const k of Object.keys(combo.outletPrices)) {
            if (matchesOutlet(k) && Number(combo.outletPrices[k]) > 0) return true;
          }
        }
      }
    }

    // Default Fallback: If no restrictive selectedOutletIds array is set (or empty), the product is global (available at all outlets)
    if (!product.selectedOutletIds || !Array.isArray(product.selectedOutletIds) || product.selectedOutletIds.length === 0) {
      return true;
    }

    return false;
  };

  const getEffectiveProductPrice = (p) => {
    if (p.price && Number(p.price) > 0) return Number(p.price);
    if (p.priceCombinations && p.priceCombinations.length > 0) {
      for (const combo of p.priceCombinations) {
        if (combo.outletPrices) {
          const prices = Object.values(combo.outletPrices).map(Number).filter(v => v > 0);
          if (prices.length > 0) return Math.max(...prices);
        }
      }
    }
    if (p.standardPrices) {
      const prices = Object.values(p.standardPrices).map(Number).filter(v => v > 0);
      if (prices.length > 0) return Math.max(...prices);
    }
    return 0;
  };

  const getEffectiveProductPriceForOutlet = (p, targetOutletId) => {
    if (targetOutletId && targetOutletId !== 'Semua' && targetOutletId !== 'ALL' && targetOutletId !== 'Semua Restoran (Konsolidasi)') {
      const strId = String(targetOutletId);
      const numId = Number(targetOutletId);

      // Check standardPrices
      if (p.standardPrices) {
        const stdPrice = p.standardPrices[strId] !== undefined ? Number(p.standardPrices[strId]) : Number(p.standardPrices[numId] || 0);
        if (stdPrice > 0) return stdPrice;
      }

      // Check variantPrices
      if (p.variantPrices) {
        for (const vName of Object.keys(p.variantPrices)) {
          const vMap = p.variantPrices[vName] || {};
          const vPrice = vMap[strId] !== undefined ? Number(vMap[strId]) : Number(vMap[numId] || 0);
          if (vPrice > 0) return vPrice;
        }
      }

      // Check priceCombinations
      if (p.priceCombinations && Array.isArray(p.priceCombinations)) {
        for (const combo of p.priceCombinations) {
          if (combo.outletPrices) {
            const comboPrice = combo.outletPrices[strId] !== undefined ? Number(combo.outletPrices[strId]) : Number(combo.outletPrices[numId] || 0);
            if (comboPrice > 0) return comboPrice;
          }
        }
      }
    }

    return getEffectiveProductPrice(p);
  };

  const categoryOptions = ['Semua', ...Array.from(new Set(masterData.categories.map(c => c.name)))];

  // Active Outlet Filter ID Priority
  const activeOutletId = (selectedOutletFilter && selectedOutletFilter !== 'Semua')
    ? selectedOutletFilter
    : ((selectedBranch && selectedBranch !== 'ALL' && selectedBranch !== 'Semua Restoran (Konsolidasi)') ? String(selectedBranch) : 'Semua');

  const filteredProducts = (masterData.products || []).filter(p => {
    // 1. Outlet Filter Check
    if (activeOutletId !== 'Semua' && activeOutletId !== 'ALL') {
      if (!isProductAvailableAtOutlet(p, activeOutletId)) return false;
    }

    // 2. Status Filter Check
    const pStatus = p.status || 'Aktif';
    if (selectedStatusFilter !== 'Semua' && pStatus !== selectedStatusFilter) {
      return false;
    }

    // 3. Search & Category Filter Check
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.sku && p.sku.toLowerCase().includes(searchTerm.toLowerCase()));
    
    if (selectedCategoryFilter === 'Semua') return matchesSearch;
    const catObj = masterData.categories.find(c => c.id === p.category_id);
    return matchesSearch && (catObj?.name === selectedCategoryFilter || p.category_name === selectedCategoryFilter);
  });

  // Sorting calculation
  const sortedProducts = React.useMemo(() => {
    const list = [...filteredProducts];
    list.sort((a, b) => {
      let comp = 0;
      switch (sortField) {
        case 'sku':
          comp = (a.sku || a.code || '').localeCompare(b.sku || b.code || '');
          break;
        case 'name':
          comp = (a.name || '').localeCompare(b.name || '');
          break;
        case 'category_name': {
          const catA = masterData.categories.find(c => c.id === a.category_id)?.name || a.category_name || '';
          const catB = masterData.categories.find(c => c.id === b.category_id)?.name || b.category_name || '';
          comp = catA.localeCompare(catB);
          break;
        }
        case 'price': {
          const prA = getEffectiveProductPrice(a);
          const prB = getEffectiveProductPrice(b);
          comp = prA - prB;
          break;
        }
        case 'status':
          comp = (a.status || 'Aktif').localeCompare(b.status || 'Aktif');
          break;
        default:
          comp = (a.name || '').localeCompare(b.name || '');
      }
      return sortDirection === 'asc' ? comp : -comp;
    });
    return list;
  }, [filteredProducts, sortField, sortDirection, masterData.categories]);

  // Pagination calculation
  const totalItems = sortedProducts.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const paginatedProducts = sortedProducts.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleSortHeader = (field) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const renderSortableTh = (field, label, extraStyle = {}) => {
    const isActive = sortField === field;
    const icon = isActive ? (sortDirection === 'asc' ? ' ▲' : ' ▼') : ' ↕';
    return (
      <th
        onClick={() => handleSortHeader(field)}
        style={{
          padding: '10px 10px',
          cursor: 'pointer',
          userSelect: 'none',
          color: isActive ? T.info : T.txtSecondary,
          fontWeight: isActive ? '900' : '800',
          transition: 'color 0.15s ease',
          ...extraStyle
        }}
        title={`Klik untuk mengurutkan berdasarkan ${label}`}
      >
        {label} <span style={{ opacity: isActive ? 1 : 0.4, fontSize: '0.70rem' }}>{icon}</span>
      </th>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* MAIN CONTAINER CARD */}
      <div className="glass-card" style={{ padding: '0', overflow: 'hidden', background: T.cardBg, border: `1px solid ${T.border}`, borderRadius: '16px' }}>
        
        {/* CARD TOP HEADER BAR (TITLE & PRIMARY ACTIONS) */}
        <div style={{ padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${T.border}`, flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '800', color: T.txtPrimary, margin: 0 }}>
              Produk
            </h2>
            <p style={{ color: T.txtSecondary, fontSize: '0.82rem', marginTop: '4px', margin: 0 }}>
              Master produk/menu, kategori, harga, dan komposisi harga pokok produksi.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            {/* Excel Download & Upload Button */}
            <button
              onClick={() => setShowExcelImportModal(true)}
              style={{
                background: T.info,
                color: '#ffffff',
                border: 'none',
                padding: '9px 16px',
                borderRadius: '10px',
                fontWeight: '700',
                fontSize: '0.82rem',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
                boxShadow: T.shadowSm,
                whiteSpace: 'nowrap'
              }}
            >
              <FileSpreadsheet size={16} />
              <span>📥 Template & Upload Excel</span>
            </button>

            {/* Teal Add Product Button (PROMINENT & CLEAR) */}
            <button
              onClick={handleOpenAddForm}
              style={{
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: '#ffffff',
                border: 'none',
                padding: '9px 18px',
                borderRadius: '10px',
                fontWeight: '800',
                fontSize: '0.86rem',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
                whiteSpace: 'nowrap'
              }}
            >
              <Plus size={18} strokeWidth={2.5} />
              <span>+ Tambah Produk</span>
            </button>
          </div>
        </div>

        {/* DEDICATED SECONDARY FILTER & SEARCH BAR */}
        <div style={{ padding: '14px 24px', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', borderBottom: `1px solid ${T.border}`, background: T.isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)' }}>
          {/* Search Input */}
          <div style={{ position: 'relative', flex: '1 1 240px', minWidth: '200px' }}>
            <Search size={15} color={T.txtSecondary} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              placeholder="Cari nama produk, SKU, kategori..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px 8px 36px',
                borderRadius: '8px',
                border: `1px solid ${T.border}`,
                fontSize: '0.82rem',
                background: T.inputBg,
                color: T.txtPrimary
              }}
            />
          </div>

          {/* Status Filter Dropdown */}
          <select
            value={selectedStatusFilter}
            onChange={e => setSelectedStatusFilter(e.target.value)}
            style={{
              padding: '8px 12px',
              borderRadius: '8px',
              border: `1px solid ${T.border}`,
              fontSize: '0.82rem',
              background: T.inputBg,
              color: selectedStatusFilter === 'Aktif' ? T.success : selectedStatusFilter === 'Hide' ? T.txtSecondary : selectedStatusFilter === 'Inaktif' ? T.danger : T.txtPrimary,
              fontWeight: '700',
              cursor: 'pointer'
            }}
          >
            <option value="Semua">Semua Status</option>
            <option value="Aktif">🟢 Aktif</option>
            <option value="Inaktif">🔴 Inaktif</option>
            <option value="Hide">👁️ Hide (Sembunyi)</option>
          </select>

          {/* Outlet Filter Dropdown */}
          <select
            value={selectedOutletFilter}
            onChange={e => {
              setSelectedOutletFilter(e.target.value);
              setCurrentPage(1);
            }}
            style={{
              padding: '8px 12px',
              borderRadius: '8px',
              border: `1px solid ${T.border}`,
              fontSize: '0.82rem',
              background: T.inputBg,
              color: selectedOutletFilter !== 'Semua' ? T.info : T.txtPrimary,
              fontWeight: '700',
              cursor: 'pointer'
            }}
          >
            <option value="Semua">🏬 Semua Outlet</option>
            {(masterData.outlets || []).map(otl => (
              <option key={otl.id} value={String(otl.id)}>
                {otl.name}
              </option>
            ))}
          </select>

          {/* Quick Sort Field */}
          <select
            value={sortField}
            onChange={e => setSortField(e.target.value)}
            style={{
              padding: '8px 12px',
              borderRadius: '8px',
              border: `1px solid ${T.border}`,
              fontSize: '0.82rem',
              background: T.inputBg,
              color: T.txtPrimary,
              fontWeight: '700',
              cursor: 'pointer'
            }}
            title="Urutkan berdasarkan"
          >
            <option value="name">Sort: Nama</option>
            <option value="sku">Sort: SKU</option>
            <option value="category_name">Sort: Kategori</option>
            <option value="price">Sort: Harga</option>
            <option value="status">Sort: Status</option>
          </select>

          {/* Quick Sort Direction */}
          <select
            value={sortDirection}
            onChange={e => setSortDirection(e.target.value)}
            style={{
              padding: '8px 12px',
              borderRadius: '8px',
              border: `1px solid ${T.border}`,
              fontSize: '0.82rem',
              background: T.inputBg,
              color: T.txtPrimary,
              fontWeight: '700',
              cursor: 'pointer'
            }}
            title="Arah urutan"
          >
            <option value="asc">⬆️ Naik (A-Z / Kecil-Besar)</option>
            <option value="desc">⬇️ Turun (Z-A / Besar-Kecil)</option>
          </select>
        </div>

        {/* TABLE CONTENT */}
        <div style={{ width: '100%', overflowX: 'auto' }}>
          <table style={{ width: '100%', minWidth: '1050px', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.76rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)', color: T.txtSecondary, fontWeight: '800', fontSize: '0.68rem', textTransform: 'uppercase', background: T.tableHeaderBg }}>
                {renderSortableTh('sku', 'SKU', { width: '100px' })}
                {renderSortableTh('name', 'Produk', { minWidth: '220px' })}
                {renderSortableTh('category_name', 'Kategori', { width: '130px' })}
                {renderSortableTh('price', 'Harga', { width: '140px' })}
                <th style={{ padding: '10px 10px', minWidth: '200px' }}>Bahan Baku</th>
                <th style={{ padding: '10px 10px', width: '120px' }}>Variant</th>
                {renderSortableTh('status', 'Status', { width: '90px' })}
                <th style={{ padding: '10px 10px', width: '80px', textAlign: 'right' }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {paginatedProducts.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: '36px', textAlign: 'center', color: T.txtMuted, fontSize: '0.76rem' }}>
                    Belum ada produk yang ditambahkan.
                  </td>
                </tr>
              ) : (
                paginatedProducts.map(p => {
                  const categoryName = (masterData.categories.find(c => c.id === p.category_id)?.name || p.category_name || 'Umum').toUpperCase();
                  const cleanMenuName = (p.name || '').replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, '').trim().toUpperCase();

                  // Primary Outlet Name & Price
                  const validPriceOutlets = (masterData.outlets || []).filter(o => {
                    const oid = String(o.id);
                    let pr = 0;
                    if (p.standardPrices) {
                      const stdKey = Object.keys(p.standardPrices).find(k => String(k) === oid);
                      if (stdKey && Number(p.standardPrices[stdKey]) > 0) pr = Number(p.standardPrices[stdKey]);
                    }
                    if (pr === 0 && p.variantPrices && p.variants && p.variants.length > 0) {
                      const firstV = p.variants[0];
                      if (p.variantPrices[firstV]) {
                        const vKey = Object.keys(p.variantPrices[firstV]).find(k => String(k) === oid);
                        if (vKey && Number(p.variantPrices[firstV][vKey]) > 0) pr = Number(p.variantPrices[firstV][vKey]);
                      }
                    }
                    if (pr === 0 && p.priceCombinations && p.priceCombinations.length > 0) {
                      const combo = p.priceCombinations.find(c => c.outletPrices && (
                        Number(c.outletPrices[o.id]) > 0 || Number(c.outletPrices[oid]) > 0
                      ));
                      if (combo) {
                        pr = Number(combo.outletPrices[o.id] || combo.outletPrices[oid] || 0);
                      }
                    }
                    return pr > 0;
                  });

                  const firstOutletObj = validPriceOutlets[0] || null;
                  const activeOutletObj = (activeOutletId !== 'Semua' && activeOutletId !== 'ALL')
                    ? (masterData.outlets || []).find(o => String(o.id) === String(activeOutletId))
                    : null;

                  const displayOutletObj = activeOutletObj || firstOutletObj;

                  let primaryPrice = 0;
                  if (displayOutletObj) {
                    const oid = String(displayOutletObj.id);
                    if (p.standardPrices) {
                      const stdKey = Object.keys(p.standardPrices).find(k => String(k) === oid);
                      if (stdKey) primaryPrice = Number(p.standardPrices[stdKey]);
                    }
                    if (primaryPrice <= 0 && p.variantPrices && p.variants && p.variants.length > 0) {
                      const firstV = p.variants[0];
                      if (p.variantPrices[firstV]) {
                        const vKey = Object.keys(p.variantPrices[firstV]).find(k => String(k) === oid);
                        if (vKey) primaryPrice = Number(p.variantPrices[firstV][vKey]);
                      }
                    }
                    if (primaryPrice <= 0 && p.priceCombinations && p.priceCombinations.length > 0) {
                      const combo = p.priceCombinations.find(c => c.outletPrices && (
                        Number(c.outletPrices[displayOutletObj.id]) > 0 || Number(c.outletPrices[oid]) > 0
                      ));
                      if (combo) primaryPrice = Number(combo.outletPrices[displayOutletObj.id] || combo.outletPrices[oid] || 0);
                    }
                  }

                  if (primaryPrice <= 0) {
                    primaryPrice = getEffectiveProductPrice(p);
                  }

                  const outletNameHeader = (displayOutletObj) ? (displayOutletObj.name || '').toUpperCase() : '';

                  return (
                    <tr key={p.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)', color: T.txtPrimary }}>
                      {/* 1. SKU */}
                      <td style={{ padding: '8px 10px', color: T.txtSecondary, fontFamily: 'monospace', fontSize: '0.70rem', fontWeight: '600', wordBreak: 'break-all' }}>
                        {p.sku || p.code || `MNM-00${p.id}`}
                      </td>

                      {/* 2. MENU */}
                      <td style={{ padding: '8px 10px', fontWeight: '800', fontSize: '0.76rem', letterSpacing: '0.2px', whiteSpace: 'normal', wordBreak: 'break-word', lineHeight: '1.35' }}>
                        <button
                          type="button"
                          onClick={() => setSelectedMenuDetail(p)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: T.info,
                            fontWeight: '800',
                            cursor: 'pointer',
                            padding: 0,
                            textAlign: 'left',
                            fontSize: '0.76rem',
                            textDecoration: 'underline',
                            whiteSpace: 'normal',
                            wordBreak: 'break-word',
                            lineHeight: '1.35',
                            display: 'block'
                          }}
                          title="Klik untuk melihat papan informasi detail kuantitas terjual & riwayat penjualan menu ini"
                        >
                          {cleanMenuName}
                        </button>
                        {outletNameHeader && (
                          <div style={{ marginTop: '3px' }}>
                            <span style={{ background: T.cardBg2, color: T.txtSecondary, border: `1px solid ${T.border}`, padding: '1px 6px', borderRadius: '4px', fontSize: '0.62rem', fontWeight: '700' }}>
                              🏢 {outletNameHeader}
                            </span>
                          </div>
                        )}
                      </td>

                      {/* 3. KATEGORI */}
                      <td style={{ padding: '8px 10px', color: T.txtSecondary, fontWeight: '700', fontSize: '0.72rem' }}>
                        {categoryName}
                      </td>

                      {/* 4. HARGA */}
                      <td style={{ padding: '8px 10px' }}>
                        {primaryPrice > 0 ? (
                          <>
                            {outletNameHeader && (
                              <div style={{ fontSize: '0.64rem', color: T.info, fontWeight: '800', textTransform: 'uppercase', marginBottom: '1px', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {outletNameHeader}
                              </div>
                            )}
                            <div style={{ fontWeight: '800', color: T.success, fontSize: '0.78rem' }}>
                              {formatRupiah(primaryPrice)}
                            </div>
                          </>
                        ) : (
                          <span style={{ color: T.danger, fontSize: '0.68rem', fontWeight: '800', background: T.dangerBg, padding: '2px 6px', borderRadius: '4px', border: `1px solid ${T.dangerBorder}` }}>Belum Di-set</span>
                        )}
                      </td>

                      {/* 5. BAHAN BAKU */}
                      <td style={{ padding: '8px 10px' }}>
                        {(() => {
                          const comps = p.compositions || p.ingredients || [];
                          if (!comps || comps.length === 0) {
                            return (
                              <span style={{ background: T.cardBg2, color: T.txtMuted, border: `1px solid ${T.border}`, padding: '2px 6px', borderRadius: '4px', fontSize: '0.68rem', fontWeight: '600' }}>
                                Belum ada
                              </span>
                            );
                          }

                          const ingList = comps.map(c => {
                            const ingId = c.ingredient_id || c.ingredientId;
                            if (ingId) {
                              const found = (masterData.ingredients || []).find(i => String(i.id) === String(ingId));
                              if (found && found.name) return found.name;
                            }
                            if (c.ingredient_name) {
                              const foundByName = (masterData.ingredients || []).find(i => i.name.toLowerCase() === c.ingredient_name.toLowerCase());
                              if (foundByName && foundByName.name) return foundByName.name;
                              return c.ingredient_name;
                            }
                            if (c.ingredientName) return c.ingredientName;
                            if (c.name && c.name !== p.name) return c.name;
                            return null;
                          }).filter(Boolean);

                          if (ingList.length === 0) {
                            return (
                              <span style={{ background: T.cardBg2, color: T.info, border: `1px solid ${T.border}`, padding: '2px 6px', borderRadius: '4px', fontSize: '0.68rem', fontWeight: '700' }}>
                                {comps.length} Bahan Baku
                              </span>
                            );
                          }

                          return (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px' }}>
                              {ingList.map((ingName, idx) => (
                                <span key={idx} style={{ background: T.cardBg2, color: T.info, border: `1px solid ${T.border}`, padding: '2px 6px', borderRadius: '4px', fontSize: '0.68rem', fontWeight: '700' }}>
                                  {ingName}
                                </span>
                              ))}
                            </div>
                          );
                        })()}
                      </td>

                      {/* 6. VARIANT */}
                      <td style={{ padding: '8px 10px' }}>
                        {(p.variants && p.variants.length > 0) ? (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px' }}>
                            {p.variants.map((vName, vIdx) => (
                              <span key={vIdx} style={{ background: T.infoBg, color: T.info, border: `1px solid ${T.infoBorder}`, padding: '2px 6px', borderRadius: '4px', fontSize: '0.68rem', fontWeight: '700' }}>
                                {vName}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span style={{ color: T.txtMuted, fontSize: '0.68rem', fontStyle: 'italic' }}>Tanpa Varian</span>
                        )}
                      </td>

                      {/* 7. STATUS */}
                      <td style={{ padding: '8px 10px' }}>
                        {(() => {
                          const st = p.status || 'Aktif';
                          if (st === 'Aktif') {
                            return (
                              <span style={{ background: T.successBg, color: T.success, border: `1px solid ${T.successBorder}`, padding: '2px 8px', borderRadius: '4px', fontSize: '0.68rem', fontWeight: '800' }}>
                                Aktif
                              </span>
                            );
                          } else if (st === 'Inaktif') {
                            return (
                              <span style={{ background: T.dangerBg, color: T.danger, border: `1px solid ${T.dangerBorder}`, padding: '2px 8px', borderRadius: '4px', fontSize: '0.68rem', fontWeight: '800' }}>
                                Inaktif
                              </span>
                            );
                          } else {
                            return (
                              <span style={{ background: T.hoverBg, color: T.txtSecondary, border: `1px solid ${T.border}`, padding: '2px 8px', borderRadius: '4px', fontSize: '0.68rem', fontWeight: '800' }}>
                                Hide
                              </span>
                            );
                          }
                        })()}
                      </td>

                      {/* 8. AKSI */}
                      <td style={{ padding: '8px 10px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '4px' }}>
                          <button
                            type="button"
                            onClick={() => setSelectedMenuDetail(p)}
                            title="Lihat Riwayat History Penjualan Detail"
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

                          <button
                            onClick={() => handleOpenEditForm(p)}
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
                            <Edit3 size={12} color={T.info} />
                            <span>Edit</span>
                          </button>

                          <button
                            onClick={() => handleDeleteProduct(p.id, p.name)}
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
                            title="Hapus Menu"
                          >
                            <Trash2 size={12} />
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

      {/* FORM MODAL: TAMBAH / EDIT PRODUK */}
      {showFormModal && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.75)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
          padding: '20px'
        }}>
          <div className="glass-card animate-fade-in" style={{ width: '100%', maxWidth: '780px', maxHeight: '90vh', overflowY: 'auto', padding: '28px', background: T.cardBg, border: `1px solid ${T.border}`, borderRadius: '16px' }}>
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', borderBottom: `1px solid ${T.border}`, paddingBottom: '12px' }}>
              <div>
                <h3 style={{ fontSize: '1.3rem', fontWeight: '800', color: T.txtPrimary, margin: 0 }}>
                  {editingProductId ? 'Edit Menu' : 'Tambah Menu'}
                </h3>
                <p style={{ fontSize: '0.82rem', color: T.txtSecondary, margin: '4px 0 0 0' }}>
                  Kelola produk, harga outlet manual, dan komposisi harga pokok produksi.
                </p>
              </div>
              <button onClick={() => setShowFormModal(false)} style={{ background: 'none', border: 'none', color: T.txtSecondary, cursor: 'pointer', padding: '4px' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleProceedToPreview} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              
              {/* ROW 1: NAMA PRODUK & SKU AUTO BOX */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', color: T.txtPrimary, display: 'block', marginBottom: '6px', fontWeight: '700' }}>
                    Nama Produk
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Nasi Goreng Barokah"
                    value={prodName}
                    onChange={e => setProdName(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: '8px',
                      border: `1px solid ${T.border}`,
                      background: T.inputBg,
                      color: T.txtPrimary,
                      fontSize: '0.85rem'
                    }}
                  />
                </div>

                <div style={{ background: T.cardBg2, border: `1px dashed ${T.border}`, borderRadius: '10px', padding: '10px 14px' }}>
                  <div style={{ fontSize: '0.78rem', color: T.txtPrimary, fontWeight: '800', marginBottom: '2px' }}>
                    SKU
                  </div>
                  <div style={{ fontSize: '0.78rem', color: T.info, fontWeight: '700', fontFamily: 'monospace' }}>
                    Dibuat otomatis setelah produk disimpan.
                  </div>
                  <div style={{ fontSize: '0.7rem', color: T.txtMuted, marginTop: '2px' }}>
                    Contoh: MKN-010, MNM-008, SNK-004.
                  </div>
                </div>
              </div>

              {/* ROW 2: KATEGORI, TARGET PRINTER & STATUS */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', color: T.txtPrimary, display: 'block', marginBottom: '6px', fontWeight: '700' }}>
                    Kategori
                  </label>
                  <select
                    value={prodCategoryId}
                    onChange={e => setProdCategoryId(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: '8px',
                      border: `1px solid ${T.border}`,
                      background: T.inputBg,
                      color: T.txtPrimary,
                      fontSize: '0.85rem'
                    }}
                  >
                    {masterData.categories.map(cat => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name.toUpperCase()}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '0.8rem', color: T.txtPrimary, display: 'block', marginBottom: '6px', fontWeight: '700' }}>
                    Target Struk (Printer)
                  </label>
                  <select
                    value={prodPrinterTarget}
                    onChange={e => setProdPrinterTarget(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: '8px',
                      border: `1px solid ${T.border}`,
                      background: T.inputBg,
                      color: T.accentGold,
                      fontWeight: '700',
                      fontSize: '0.85rem'
                    }}
                  >
                    <option value="dapur">🍳 Struk Dapur (Koki)</option>
                    <option value="bar">🍹 Struk Bar (Bartender)</option>
                    <option value="keduanya">🍳🍹 Keduanya (Dapur & Bar)</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '0.8rem', color: T.txtPrimary, display: 'block', marginBottom: '6px', fontWeight: '700' }}>
                    Status
                  </label>
                  <select
                    value={prodStatus}
                    onChange={e => setProdStatus(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: '8px',
                      border: `1px solid ${T.border}`,
                      background: T.inputBg,
                      color: prodStatus === 'Aktif' ? T.success : prodStatus === 'Hide' ? T.txtSecondary : T.danger,
                      fontWeight: '700',
                      fontSize: '0.85rem'
                    }}
                  >
                    <option value="Aktif">🟢 Aktif</option>
                    <option value="Inaktif">🔴 Inaktif</option>
                    <option value="Hide">👁️ Hide (Disembunyikan dari POS)</option>
                  </select>
                </div>
              </div>

              {/* SECTION 3: GAMBAR PRODUK */}
              <div style={{ border: `1px solid ${T.border}`, borderRadius: '12px', padding: '16px', background: T.cardBg2 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '10px',
                    background: T.cardBg,
                    border: `1px solid ${T.border}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.2rem',
                    fontWeight: '900',
                    color: T.info,
                    overflow: 'hidden'
                  }}>
                    {prodImageUrl ? (
                      <img src={prodImageUrl} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <span>{prodName ? prodName.charAt(0).toUpperCase() : 'P'}</span>
                    )}
                  </div>

                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: '800', color: T.txtPrimary, marginBottom: '2px' }}>
                      Gambar Produk
                    </div>
                    <div style={{ fontSize: '0.75rem', color: T.txtSecondary, marginBottom: '8px' }}>
                      Opsional. Gambar tampil di grid produk APK kasir. Format JPG, PNG, atau WEBP maksimal 2MB.
                    </div>
                    
                    <input 
                      id="product-image-file-input" 
                      type="file" 
                      accept="image/*" 
                      onChange={handleFileInputChange} 
                      style={{ display: 'none' }} 
                    />
                    <button
                      type="button"
                      onClick={() => document.getElementById('product-image-file-input').click()}
                      style={{
                        background: T.cardBg,
                        border: `1px solid ${T.border}`,
                        color: T.txtPrimary,
                        padding: '6px 14px',
                        borderRadius: '6px',
                        fontSize: '0.78rem',
                        fontWeight: '700',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      <UploadCloud size={14} color={T.info} />
                      <span>Pilih Gambar</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* SECTION 4: CATATAN VARIANT */}
              <div style={{ border: `1px solid ${T.border}`, borderRadius: '12px', padding: '16px', background: T.cardBg2 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <div>
                    <div style={{ fontSize: '0.85rem', fontWeight: '800', color: T.txtPrimary }}>
                      Catatan Variant
                    </div>
                    <div style={{ fontSize: '0.75rem', color: T.txtSecondary }}>
                      Badge pilihan kecil untuk APK kasir. Bisa dipilih lebih dari satu dan tidak mengubah harga.
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleAddVariant}
                    style={{
                      background: T.cardBg,
                      border: `1px solid ${T.border}`,
                      color: T.txtPrimary,
                      padding: '6px 12px',
                      borderRadius: '6px',
                      fontSize: '0.78rem',
                      fontWeight: '700',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    <Plus size={14} />
                    <span>Tambah Variant</span>
                  </button>
                </div>

                <div style={{ marginTop: '10px' }}>
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                    <input
                      type="text"
                      placeholder="Ketik nama variant baru..."
                      value={tempVariantInput}
                      onChange={e => setTempVariantInput(e.target.value)}
                      style={{
                        flex: 1,
                        padding: '6px 10px',
                        borderRadius: '6px',
                        border: `1px solid ${T.border}`,
                        background: T.inputBg,
                        color: T.txtPrimary,
                        fontSize: '0.8rem'
                      }}
                    />
                  </div>

                  {variants.length === 0 ? (
                    <div style={{ padding: '12px', background: T.cardBg, borderRadius: '8px', border: `1px dashed ${T.border}`, color: T.info, fontSize: '0.78rem', textAlign: 'center' }}>
                      Belum ada catatan variant. Produk tetap bisa dijual tanpa pilihan tambahan.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {variants.map((v, i) => {
                        const firstOutId = selectedOutletIds[0];
                        const pVal = firstOutId ? (
                          variantPrices[v]?.[firstOutId] || variantPrices[v]?.[String(firstOutId)] ||
                          standardPrices[firstOutId] || standardPrices[String(firstOutId)] || 0
                        ) : 0;

                        return (
                          <span key={i} style={{ background: T.cardBg, border: `1px solid ${T.border}`, color: T.txtPrimary, padding: '5px 12px', borderRadius: '20px', fontSize: '0.78rem', fontWeight: '700', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                            <span>{v}</span>
                            {pVal > 0 && (
                              <span style={{ color: T.success, fontWeight: '800', fontSize: '0.74rem' }}>
                                ({formatRupiah(pVal)})
                              </span>
                            )}
                            <X size={14} color={T.danger} style={{ cursor: 'pointer', marginLeft: '2px' }} onClick={() => handleRemoveVariant(v)} />
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* SECTION 5: OUTLET CABANG & HARGA MENU (1 MENU = 1 OUTLET) */}
              <div style={{ border: `1px solid ${T.border}`, borderRadius: '12px', padding: '16px', background: T.cardBg2 }}>
                <div style={{ marginBottom: '12px' }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: '800', color: T.txtPrimary }}>
                    🏢 Outlet Cabang & Harga Menu
                  </div>
                  <div style={{ fontSize: '0.75rem', color: T.txtSecondary }}>
                    Pilih 1 outlet cabang tempat menu ini dijual (1 Menu Khusus 1 Outlet).
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
                  {/* Dropdown Outlet */}
                  <div>
                    <label style={{ fontSize: '0.74rem', color: T.txtSecondary, fontWeight: '700', display: 'block', marginBottom: '4px' }}>
                      Outlet Cabang Penjualan:
                    </label>
                    <select
                      value={selectedOutletIds[0] || ''}
                      onChange={e => {
                        const outId = isNaN(e.target.value) ? e.target.value : Number(e.target.value);
                        setSelectedOutletIds([outId]);
                        const currentP = Number(standardPrices[selectedOutletIds[0]] || Object.values(standardPrices)[0] || 0);
                        setStandardPrices({ [outId]: currentP });
                        setOutletApkStatus({ [outId]: 'Aktif' });
                      }}
                      style={{
                        width: '100%',
                        background: T.inputBg,
                        border: `1px solid ${T.border}`,
                        color: T.txtPrimary,
                        padding: '8px 10px',
                        borderRadius: '6px',
                        fontSize: '0.82rem',
                        fontWeight: '700'
                      }}
                    >
                      {(masterData.outlets || []).map(o => (
                        <option key={o.id} value={o.id}>{o.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Harga Menu */}
                  <div>
                    <label style={{ fontSize: '0.74rem', color: T.txtSecondary, fontWeight: '700', display: 'block', marginBottom: '4px' }}>
                      Harga Jual Menu (Rp):
                    </label>
                    <input
                      type="number"
                      placeholder="Nominal harga..."
                      value={standardPrices[selectedOutletIds[0]] !== undefined ? standardPrices[selectedOutletIds[0]] : ''}
                      onChange={e => {
                        const val = parseFloat(e.target.value) || 0;
                        const outId = selectedOutletIds[0];
                        setStandardPrices({ [outId]: val });
                      }}
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        borderRadius: '6px',
                        border: `1px solid ${T.border}`,
                        background: T.inputBg,
                        color: T.success,
                        fontWeight: '800',
                        fontSize: '0.85rem'
                      }}
                    />
                  </div>

                  {/* Status di POS Kasir APK */}
                  <div>
                    <label style={{ fontSize: '0.74rem', color: T.txtSecondary, fontWeight: '700', display: 'block', marginBottom: '4px' }}>
                      📱 Status di POS Kasir APK:
                    </label>
                    <select
                      value={outletApkStatus[selectedOutletIds[0]] || 'Aktif'}
                      onChange={e => {
                        const val = e.target.value;
                        const outId = selectedOutletIds[0];
                        setOutletApkStatus({ [outId]: val });
                      }}
                      style={{
                        width: '100%',
                        background: T.inputBg,
                        border: `1px solid ${T.border}`,
                        color: (outletApkStatus[selectedOutletIds[0]] === 'Inaktif' || outletApkStatus[selectedOutletIds[0]] === 'Hide') ? T.danger : T.success,
                        padding: '8px 10px',
                        borderRadius: '6px',
                        fontSize: '0.82rem',
                        fontWeight: '800'
                      }}
                    >
                      <option value="Aktif">🟢 Aktif (Tampil di POS Kasir)</option>
                      <option value="Inaktif">🔴 Inaktif (Sembunyikan dari POS Kasir)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* SECTION 6: BAHAN BAKU HARGA POKOK PRODUKSI (HPP & STOK) */}
              <div style={{ border: `1px solid ${T.border}`, borderRadius: '12px', padding: '16px', background: T.cardBg2 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <div>
                    <div style={{ fontSize: '0.85rem', fontWeight: '800', color: T.txtPrimary }}>
                      Bahan Baku (Resep HPP & Stok)
                    </div>
                    <div style={{ fontSize: '0.75rem', color: T.txtSecondary }}>
                      Tambahkan rincian bahan baku untuk pemotongan stok otomatis & estimasi HPP.
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleAddCompositionRow}
                    style={{
                      background: T.cardBg,
                      border: `1px solid ${T.border}`,
                      color: T.txtPrimary,
                      padding: '6px 12px',
                      borderRadius: '6px',
                      fontSize: '0.78rem',
                      fontWeight: '700',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    <Plus size={14} />
                    <span>Tambah Bahan Baku</span>
                  </button>
                </div>

                {compositions.length === 0 ? (
                  <div style={{ padding: '12px', background: T.cardBg, borderRadius: '8px', border: `1px dashed ${T.border}`, color: T.info, fontSize: '0.78rem', textAlign: 'center' }}>
                    Belum ada bahan baku HPP. Klik "+ Tambah Bahan Baku" di atas.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 40px', gap: '8px', fontSize: '0.72rem', color: T.txtSecondary, fontWeight: '700', paddingLeft: '4px' }}>
                      <span>Bahan Baku</span>
                      <span>Qty</span>
                      <span>Unit</span>
                      <span></span>
                    </div>

                    {compositions.map(comp => (
                      <div key={comp.id} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 40px', gap: '8px', alignItems: 'center' }}>
                        <select
                          value={comp.ingredient_id}
                          onChange={e => handleUpdateComposition(comp.id, 'ingredient_id', e.target.value)}
                          style={{
                            width: '100%',
                            padding: '7px 10px',
                            borderRadius: '6px',
                            border: `1px solid ${T.border}`,
                            background: T.inputBg,
                            color: T.txtPrimary,
                            fontSize: '0.8rem'
                          }}
                        >
                          {masterData.ingredients.length === 0 ? (
                            <option value="">Gula Putih (Contoh)</option>
                          ) : (
                            masterData.ingredients.map(ing => (
                              <option key={ing.id} value={ing.id}>{ing.name}</option>
                            ))
                          )}
                        </select>

                        <input
                          type="number"
                          step="0.01"
                          placeholder="0,18"
                          value={comp.qty}
                          onChange={e => handleUpdateComposition(comp.id, 'qty', e.target.value)}
                          style={{
                            width: '100%',
                            padding: '7px 10px',
                            borderRadius: '6px',
                            border: `1px solid ${T.border}`,
                            background: T.inputBg,
                            color: T.txtPrimary,
                            fontSize: '0.8rem'
                          }}
                        />

                        <select
                          value={comp.unit || 'Gram'}
                          onChange={e => handleUpdateComposition(comp.id, 'unit', e.target.value)}
                          style={{
                            width: '100%',
                            padding: '7px 10px',
                            borderRadius: '6px',
                            border: `1px solid ${T.border}`,
                            background: T.inputBg,
                            color: T.txtPrimary,
                            fontSize: '0.8rem'
                          }}
                        >
                          {(() => {
                            const baseUnits = masterData.units && masterData.units.length > 0
                              ? masterData.units.map(u => ({ id: u.id, name: u.name, symbol: u.symbol || u.name }))
                              : [
                                { id: 1, name: 'Kilogram', symbol: 'kg' },
                                { id: 2, name: 'Gram', symbol: 'Gram' },
                                { id: 3, name: 'Liter', symbol: 'Liter' },
                                { id: 4, name: 'Milliliter', symbol: 'ml' },
                                { id: 5, name: 'Porsi', symbol: 'Porsi' },
                                { id: 6, name: 'Pcs', symbol: 'pcs' },
                                { id: 7, name: 'Ekor', symbol: 'EKOR' },
                                { id: 8, name: 'Bungkus', symbol: 'Bungkus' }
                              ];

                            const unitList = [...baseUnits];
                            if (comp.unit && !unitList.some(u => (u.symbol || u.name).toLowerCase() === String(comp.unit).toLowerCase())) {
                              unitList.push({ id: `custom-${comp.unit}`, name: comp.unit, symbol: comp.unit });
                            }

                            return unitList.map(u => {
                              const val = u.symbol || u.name;
                              return (
                                <option key={u.id} value={val}>
                                  {val} {u.name && u.name !== val ? `(${u.name})` : ''}
                                </option>
                              );
                            });
                          })()}
                        </select>

                        <button type="button" onClick={() => handleRemoveComposition(comp.id)} style={{ background: 'none', border: 'none', color: T.danger, cursor: 'pointer', textAlign: 'center' }}>
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* FOOTER ACTIONS */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px', borderTop: `1px solid ${T.border}`, paddingTop: '16px' }}>
                <button
                  type="button"
                  onClick={() => setShowFormModal(false)}
                  style={{
                    background: T.cardBg2,
                    color: T.txtSecondary,
                    border: 'none',
                    padding: '8px 18px',
                    borderRadius: '8px',
                    fontSize: '0.82rem',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                >
                  Batal
                </button>

                <button
                  type="submit"
                  style={{
                    background: T.success,
                    color: '#ffffff',
                    border: 'none',
                    padding: '8px 20px',
                    borderRadius: '8px',
                    fontSize: '0.82rem',
                    fontWeight: '700',
                    cursor: 'pointer',
                    boxShadow: T.shadowSm
                  }}
                >
                  Simpan Produk
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* FIELD 9: PREVIEW MODAL SEBELUM SIMPAN PRODUK */}
      {showPreviewModal && (
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
          <div className="glass-card animate-fade-in" style={{ width: '100%', maxWidth: '600px', maxHeight: '85vh', overflowY: 'auto', padding: '28px', background: T.cardBg, border: `1px solid ${T.success}` }}>
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <div style={{ width: '50px', height: '50px', borderRadius: '50%', background: T.successBg, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px auto', color: T.success }}>
                <Eye size={24} />
              </div>
              <h3 style={{ fontSize: '1.3rem', fontWeight: '800', color: T.txtPrimary }}>
                Pratinjau Produk (Preview)
              </h3>
              <p style={{ fontSize: '0.8rem', color: T.txtSecondary }}>Periksa kembali kelengkapan data sebelum menyimpan secara permanen</p>
            </div>

            <div style={{ background: T.cardBg2, padding: '16px', borderRadius: '12px', border: `1px solid ${T.border}`, display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.85rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: `1px solid ${T.border}`, paddingBottom: '8px' }}>
                <span style={{ color: T.txtSecondary }}>Kode Produk:</span>
                <strong style={{ color: T.info, fontFamily: 'monospace' }}>{editingProductId ? (masterData.products.find(p => p.id === editingProductId)?.sku || 'PRD-001') : generateNextProductCode()}</strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: `1px solid ${T.border}`, paddingBottom: '8px' }}>
                <span style={{ color: T.txtSecondary }}>Nama Produk:</span>
                <strong style={{ color: T.txtPrimary }}>{prodName}</strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: `1px solid ${T.border}`, paddingBottom: '8px' }}>
                <span style={{ color: T.txtSecondary }}>Kategori Produk:</span>
                <strong style={{ color: T.info }}>{masterData.categories.find(c => c.id === parseInt(prodCategoryId))?.name || 'Umum'}</strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: `1px solid ${T.border}`, paddingBottom: '8px' }}>
                <span style={{ color: T.txtSecondary }}>Status Produk:</span>
                <strong style={{ color: prodStatus === 'Aktif' ? T.success : T.danger }}>{prodStatus}</strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: `1px solid ${T.border}`, paddingBottom: '8px' }}>
                <span style={{ color: T.txtSecondary }}>Varian Produk:</span>
                <strong style={{ color: T.txtPrimary }}>{variants.length > 0 ? variants.join(', ') : 'Tanpa Varian'}</strong>
              </div>

              <div>
                <span style={{ color: T.txtSecondary, display: 'block', marginBottom: '4px' }}>Harga & Status POS APK per Outlet:</span>
                {variants.length > 0 ? (
                  variants.map((vName, i) => (
                    <div key={i} style={{ background: T.cardBg, padding: '6px 10px', borderRadius: '6px', marginBottom: '4px', fontSize: '0.78rem' }}>
                      <div style={{ color: T.info, fontWeight: '700' }}>Varian: {vName}</div>
                      <div style={{ color: T.success }}>
                        {selectedOutletIds.length > 0
                          ? selectedOutletIds.map(oid => {
                              const oObj = masterData.outlets.find(o => String(o.id) === String(oid));
                              const apkSt = outletApkStatus[oid] || 'Aktif';
                              const tagColor = apkSt === 'Inaktif' ? T.danger : T.success;
                              return (
                                <span key={oid} style={{ marginRight: '10px', display: 'inline-block' }}>
                                  {oObj ? oObj.name : `Outlet #${oid}`}: <strong>{formatRupiah(variantPrices[vName]?.[oid] || 0)}</strong> <span style={{ color: tagColor, fontSize: '0.72rem', fontWeight: '800' }}>({apkSt === 'Inaktif' ? '🔴 Sembunyi POS' : '🟢 Tampil POS'})</span>
                                </span>
                              );
                            })
                          : 'Belum ada outlet'}
                      </div>
                    </div>
                  ))
                ) : (
                  <div style={{ background: T.cardBg, padding: '6px 10px', borderRadius: '6px', fontSize: '0.78rem', color: T.success }}>
                    {selectedOutletIds.length > 0
                      ? selectedOutletIds.map(oid => {
                          const oObj = masterData.outlets.find(o => String(o.id) === String(oid));
                          const apkSt = outletApkStatus[oid] || 'Aktif';
                          const tagColor = apkSt === 'Inaktif' ? T.danger : T.success;
                          return (
                            <span key={oid} style={{ marginRight: '10px', display: 'inline-block' }}>
                              {oObj ? oObj.name : `Outlet #${oid}`}: <strong>{formatRupiah(standardPrices[oid] || 0)}</strong> <span style={{ color: tagColor, fontSize: '0.72rem', fontWeight: '800' }}>({apkSt === 'Inaktif' ? '🔴 Sembunyi POS' : '🟢 Tampil POS'})</span>
                            </span>
                          );
                        })
                      : 'Belum ada outlet'}
                  </div>
                )}
              </div>

              <div>
                <span style={{ color: T.txtSecondary, display: 'block', marginBottom: '4px' }}>Komposisi Bahan Baku (Resep):</span>
                {compositions.length > 0 ? (
                  <ul style={{ paddingLeft: '18px', color: T.txtPrimary, fontSize: '0.78rem' }}>
                    {compositions.map((comp, i) => (
                      <li key={i}>{comp.ingredient_name}: {comp.qty} {comp.unit}</li>
                    ))}
                  </ul>
                ) : (
                  <span style={{ color: T.txtMuted, fontSize: '0.75rem', fontStyle: 'italic' }}>Tanpa Komposisi Khusus</span>
                )}
              </div>
            </div>

            {/* PREVIEW BUTTONS: EDIT KEMBALI VS SIMPAN PRODUK */}
            <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
              <button
                type="button"
                onClick={() => {
                  setShowPreviewModal(false);
                  setShowFormModal(true);
                }}
                className="btn-secondary"
                style={{ flex: 1, justifyContent: 'center' }}
              >
                <ArrowLeft size={16} />
                <span>Edit Kembali</span>
              </button>

              <button
                type="button"
                onClick={handleFinalSaveProduct}
                className="btn-primary"
                style={{ flex: 1, justifyContent: 'center' }}
              >
                <CheckCircle2 size={16} />
                <span>Simpan Produk</span>
              </button>
            </div>
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

      {/* EXCEL IMPORT & TEMPLATE MODAL */}
      <ExcelMasterImportModal
        isOpen={showExcelImportModal}
        onClose={() => setShowExcelImportModal(false)}
        moduleType="products"
        masterData={masterData}
        setMasterData={setMasterData}
      />

      {/* DELETE GUARD MODAL — perlindungan hapus data yang punya transaksi */}
      <DeleteGuardModal
        guardState={deleteGuardState}
        onClose={() => setDeleteGuardState(null)}
        theme={themeMode}
      />
    </div>
  );
}
