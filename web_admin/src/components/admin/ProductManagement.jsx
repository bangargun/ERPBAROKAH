import React, { useState } from 'react';
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

export default function ProductManagement({ masterData, setMasterData, selectedBranch, themeMode = 'dark' }) {
  const T = getThemePalette(themeMode);
  const [searchTerm, setSearchTerm] = useState('');
  const [displayMode, setDisplayMode] = useState('grid'); // 'grid' | 'table'
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('Semua');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('Semua');
  const [showFormModal, setShowFormModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showExcelImportModal, setShowExcelImportModal] = useState(false);
  const [editingProductId, setEditingProductId] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedMenuDetail, setSelectedMenuDetail] = useState(null);

  // Pagination States (Default 25 rows per page)
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

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
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (uploadEvent) => {
          setProdImageUrl(uploadEvent.target.result);
        };
        reader.readAsDataURL(file);
      } else {
        alert('Mohon unggah file format gambar (JPG, PNG, WEBP).');
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
    setSelectedOutletIds([]);
    setTempOutletSelectId('');
    setVariantPrices({});
    setStandardPrices({});
    setOutletApkStatus({});
    setCompositions([]);
    setShowFormModal(true);
  };

  // 5. Open Edit Form Modal
  const handleOpenEditForm = (product) => {
    setEditingProductId(product.id);
    setProdName(product.name);
    setProdCategoryId(product.category_id || masterData.categories[0]?.id);
    setProdStatus(product.status || 'Aktif');
    setProdImageUrl(product.image_url || '');
    setVariants(product.variants || []);

    const comboOutlets = new Set();
    const vPrices = {};
    const stdPrices = {};

    if (product.priceCombinations && product.priceCombinations.length > 0) {
      product.priceCombinations.forEach(combo => {
        (combo.selectedOutletIds || []).forEach(id => comboOutlets.add(id));
        if (product.variants && product.variants.length > 0) {
          const vName = combo.combinationName.replace(product.name, '').replace(/[()]/g, '').trim() || combo.combinationName;
          vPrices[vName] = combo.outletPrices || {};
        } else {
          Object.assign(stdPrices, combo.outletPrices || {});
        }
      });
    }

    const stdP = product.standardPrices || (Object.keys(stdPrices).length > 0 ? stdPrices : {});
    const vP = product.variantPrices || vPrices;

    // Ensure variant prices inherit standard outlet price if 0 or missing
    if (product.variants && product.variants.length > 0) {
      product.variants.forEach(vName => {
        if (!vP[vName]) vP[vName] = {};
        Object.keys(stdP).forEach(outId => {
          if (!vP[vName][outId] || Number(vP[vName][outId]) === 0) {
            vP[vName][outId] = stdP[outId];
          }
        });
      });
    }

    const rawOutletIds = Array.isArray(product.selectedOutletIds) && product.selectedOutletIds.length > 0
      ? product.selectedOutletIds 
      : (comboOutlets.size > 0 ? Array.from(comboOutlets) : (Object.keys(stdP).map(id => isNaN(id) ? id : Number(id))));

    const activeOutletIds = rawOutletIds.filter(outId => {
      const stdVal = Number(stdP[outId] || 0);
      let varVal = 0;
      if (product.variants && product.variants.length > 0) {
        product.variants.forEach(v => {
          if (vP[v] && Number(vP[v][outId]) > 0) varVal = Number(vP[v][outId]);
        });
      }
      return stdVal > 0 || varVal > 0;
    });

    setSelectedOutletIds(activeOutletIds.length > 0 ? activeOutletIds : rawOutletIds);
    setVariantPrices(vP);
    setStandardPrices(stdP);
    setOutletApkStatus(product.apkStatus || product.outletApkStatus || {});
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

  // 7. Final Save Product
  const handleFinalSaveProduct = () => {
    const code = editingProductId 
      ? masterData.products.find(p => p.id === editingProductId)?.sku || generateNextProductCode()
      : generateNextProductCode();

    const categoryObj = masterData.categories.find(c => c.id === parseInt(prodCategoryId));
    
    // Auto-generate priceCombinations for 100% backward compatibility & multi-outlet reporting
    const generatedPriceCombinations = [];
    const syncedVariantPrices = {};

    if (variants.length === 0) {
      generatedPriceCombinations.push({
        id: Date.now(),
        combinationName: prodName.trim(),
        selectedOutletIds: selectedOutletIds,
        outletPrices: standardPrices,
        apkStatus: outletApkStatus,
        status: 'Aktif'
      });
    } else {
      variants.forEach((vName, idx) => {
        const pMap = variantPrices[vName] ? { ...variantPrices[vName] } : {};
        syncedVariantPrices[vName] = {};

        selectedOutletIds.forEach(outId => {
          const stdVal = Number(standardPrices[outId] !== undefined ? standardPrices[outId] : (standardPrices[String(outId)] || 0));
          const varVal = Number(pMap[outId] !== undefined ? pMap[outId] : (pMap[String(outId)] || 0));
          const effectiveVal = varVal > 0 ? varVal : stdVal;

          pMap[outId] = effectiveVal;
          syncedVariantPrices[vName][outId] = effectiveVal;
        });

        generatedPriceCombinations.push({
          id: Date.now() + idx,
          combinationName: `${prodName.trim()} (${vName})`,
          selectedOutletIds: selectedOutletIds,
          outletPrices: pMap,
          apkStatus: outletApkStatus,
          status: 'Aktif'
        });
      });
    }

    const firstPriceVal = Object.values(standardPrices)[0] || Object.values(syncedVariantPrices[variants[0]] || {})[0] || 0;

    const productPayload = {
      id: editingProductId || Date.now(),
      sku: code,
      code: code,
      name: prodName.trim(),
      category_id: parseInt(prodCategoryId),
      category_name: categoryObj ? categoryObj.name : 'Makanan Utama',
      category: categoryObj ? categoryObj.name : 'Makanan Utama',
      price: parseFloat(firstPriceVal) || 0,
      cost: (parseFloat(firstPriceVal) || 0) * 0.4,
      unit: 'Pcs',
      stock: 100,
      min_stock: 10,
      status: prodStatus,
      image_url: prodImageUrl || 'https://images.unsplash.com/photo-1544025162-d76694265947?w=400',
      variants,
      selectedOutletIds,
      variantPrices: syncedVariantPrices,
      standardPrices,
      apkStatus: outletApkStatus,
      outletApkStatus: outletApkStatus,
      priceCombinations: generatedPriceCombinations,
      compositions
    };

    const updated = {
      ...masterData,
      _lastUpdated: Date.now()
    };

    if (editingProductId) {
      const idx = updated.products.findIndex(p => p.id === editingProductId);
      if (idx !== -1) updated.products[idx] = productPayload;
    } else {
      updated.products.unshift(productPayload);
    }

    setMasterData(updated);
    setShowPreviewModal(false);
    setEditingProductId(null);
  };

  // 8. Delete Product
  const handleDeleteProduct = async (id, name) => {
    if (window.confirm(`Apakah Anda yakin ingin menghapus produk "${name}"?`)) {
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
          if (resData && resData.masterData) {
            setMasterData(resData.masterData);
          }
        }
      } catch (err) {
        console.error('Delete product API error:', err);
      }
    }
  };

  const formatRupiah = (val) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val || 0);
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

  const categoryOptions = ['Semua', ...Array.from(new Set(masterData.categories.map(c => c.name)))];

  const filteredProducts = masterData.products.filter(p => {
    if (selectedBranch) {
      const matchOutlet = p.outlet_id === selectedBranch || Number(p.outlet_id) === Number(selectedBranch) ||
        (p.selectedOutletIds && (p.selectedOutletIds.includes(selectedBranch) || p.selectedOutletIds.includes(String(selectedBranch)) || p.selectedOutletIds.includes(Number(selectedBranch))));
      if (!matchOutlet) return false;
    }

    const pStatus = p.status || 'Aktif';
    if (selectedStatusFilter !== 'Semua' && pStatus !== selectedStatusFilter) {
      return false;
    }

    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.sku && p.sku.toLowerCase().includes(searchTerm.toLowerCase()));
    
    if (selectedCategoryFilter === 'Semua') return matchesSearch;
    const catObj = masterData.categories.find(c => c.id === p.category_id);
    return matchesSearch && (catObj?.name === selectedCategoryFilter || p.category_name === selectedCategoryFilter);
  });

  // Pagination calculation
  const totalItems = filteredProducts.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const paginatedProducts = filteredProducts.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }} className="animate-fade-in">
      {/* MAIN CONTAINER CARD */}
      <div className="glass-card" style={{ padding: '0', overflow: 'hidden', background: T.cardBg, border: `1px solid ${T.border}`, borderRadius: '16px' }}>
        
        {/* CARD TOP HEADER BAR */}
        <div style={{ padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${T.border}`, flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '800', color: T.txtPrimary, margin: 0 }}>
              Produk
            </h2>
            <p style={{ color: T.txtSecondary, fontSize: '0.82rem', marginTop: '4px', margin: 0 }}>
              Master produk/menu, kategori, harga, dan komposisi harga pokok produksi.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {/* Search Input */}
            <div style={{ position: 'relative', width: '220px' }}>
              <Search size={15} color={T.txtSecondary} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="text"
                placeholder="Cari data..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                style={{
                  width: '100%',
                  padding: '7px 12px 7px 32px',
                  borderRadius: '8px',
                  border: `1px solid ${T.border}`,
                  fontSize: '0.8rem',
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
                padding: '7px 12px',
                borderRadius: '8px',
                border: `1px solid ${T.border}`,
                fontSize: '0.8rem',
                background: T.inputBg,
                color: selectedStatusFilter === 'Aktif' ? T.success : selectedStatusFilter === 'Hide' ? T.txtSecondary : selectedStatusFilter === 'Inaktif' ? T.danger : T.txtPrimary,
                fontWeight: '700'
              }}
            >
              <option value="Semua">Semua Status</option>
              <option value="Aktif">🟢 Aktif</option>
              <option value="Inaktif">🔴 Inaktif</option>
              <option value="Hide">👁️ Hide (Sembunyi)</option>
            </select>

            {/* Excel Download & Upload Button */}
            <button
              onClick={() => setShowExcelImportModal(true)}
              style={{
                background: T.info,
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
                boxShadow: T.shadowSm
              }}
            >
              <FileSpreadsheet size={15} />
              <span>📥 Template & Upload Excel</span>
            </button>

            {/* Teal Add Product Button */}
            <button
              onClick={handleOpenAddForm}
              style={{
                background: T.success,
                color: '#ffffff',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '8px',
                fontWeight: '700',
                fontSize: '0.82rem',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer',
                boxShadow: T.shadowSm
              }}
            >
              <Plus size={16} />
              <span>Tambah Menu</span>
            </button>
          </div>
        </div>

        {/* TABLE CONTENT */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.76rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)', color: T.txtSecondary, fontWeight: '800', fontSize: '0.68rem', textTransform: 'uppercase', background: T.tableHeaderBg }}>
                <th style={{ padding: '10px 10px' }}>SKU <span style={{ opacity: 0.4 }}>↕</span></th>
                <th style={{ padding: '10px 10px' }}>Produk <span style={{ opacity: 0.4 }}>↕</span></th>
                <th style={{ padding: '10px 10px' }}>Kategori <span style={{ opacity: 0.4 }}>↕</span></th>
                <th style={{ padding: '10px 10px' }}>Harga <span style={{ opacity: 0.4 }}>↕</span></th>
                <th style={{ padding: '10px 10px' }}>Bahan Baku <span style={{ opacity: 0.4 }}>↕</span></th>
                <th style={{ padding: '10px 10px' }}>Variant <span style={{ opacity: 0.4 }}>↕</span></th>
                <th style={{ padding: '10px 10px' }}>Status <span style={{ opacity: 0.4 }}>↕</span></th>
                <th style={{ padding: '10px 10px', textAlign: 'right' }}>Aksi <span style={{ opacity: 0.4 }}>↕</span></th>
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

                  let primaryPrice = 0;
                  if (firstOutletObj) {
                    const oid = String(firstOutletObj.id);
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
                        Number(c.outletPrices[firstOutletObj.id]) > 0 || Number(c.outletPrices[oid]) > 0
                      ));
                      if (combo) primaryPrice = Number(combo.outletPrices[firstOutletObj.id] || combo.outletPrices[oid] || 0);
                    }
                  }

                  const outletNameHeader = (primaryPrice > 0 && firstOutletObj) ? (firstOutletObj.name || '').toUpperCase() : '';

                  return (
                    <tr key={p.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)', color: T.txtPrimary }}>
                      {/* 1. SKU */}
                      <td style={{ padding: '8px 10px', color: T.txtSecondary, fontFamily: 'monospace', fontSize: '0.70rem', fontWeight: '600' }}>
                        {p.sku || p.code || `MNM-00${p.id}`}
                      </td>

                      {/* 2. MENU */}
                      <td style={{ padding: '8px 10px', fontWeight: '800', fontSize: '0.76rem', letterSpacing: '0.2px' }}>
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
                            textDecoration: 'underline'
                          }}
                          title="Klik untuk melihat papan informasi detail kuantitas terjual & riwayat penjualan menu ini"
                        >
                          {cleanMenuName}
                        </button>
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
                            {validPriceOutlets.length > 1 && (
                              <div style={{ fontSize: '0.64rem', color: T.txtMuted, marginTop: '1px', fontWeight: '600' }}>
                                +{validPriceOutlets.length - 1} outlet lainnya
                              </div>
                            )}
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
                            if (c.ingredient_name) return c.ingredient_name;
                            if (c.ingredientName) return c.ingredientName;
                            if (c.name && c.name !== p.name) return c.name;
                            if (c.ingredient_id || c.ingredientId) {
                              const ingId = c.ingredient_id || c.ingredientId;
                              const found = (masterData.ingredients || []).find(i => String(i.id) === String(ingId));
                              if (found && found.name) return found.name;
                            }
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

              {/* SECTION 5: HARGA OUTLET MANUAL */}
              <div style={{ border: `1px solid ${T.border}`, borderRadius: '12px', padding: '16px', background: T.cardBg2 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '10px' }}>
                  <div>
                    <div style={{ fontSize: '0.85rem', fontWeight: '800', color: T.txtPrimary }}>
                      Harga Outlet Manual
                    </div>
                    <div style={{ fontSize: '0.75rem', color: T.txtSecondary }}>
                      Pilih dan tambahkan outlet yang menjual menu ini secara manual.
                    </div>
                  </div>

                  {/* Dropdown Select Outlet + Button Tambah */}
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <select
                      value={tempOutletSelectId}
                      onChange={e => setTempOutletSelectId(e.target.value)}
                      style={{
                        background: T.inputBg,
                        border: `1px solid ${T.border}`,
                        color: T.txtPrimary,
                        padding: '6px 10px',
                        borderRadius: '6px',
                        fontSize: '0.78rem',
                        fontWeight: '700'
                      }}
                    >
                      <option value="">-- Pilih Outlet --</option>
                      {(masterData.outlets || [])
                        .filter(o => !selectedOutletIds.map(String).includes(String(o.id)))
                        .map(o => (
                          <option key={o.id} value={o.id}>{o.name}</option>
                        ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => {
                        if (!tempOutletSelectId) return;
                        const targetId = isNaN(tempOutletSelectId) ? tempOutletSelectId : Number(tempOutletSelectId);
                        if (!selectedOutletIds.includes(targetId)) {
                          setSelectedOutletIds([...selectedOutletIds, targetId]);
                          setStandardPrices(prev => ({ ...prev, [targetId]: 0 }));
                          setOutletApkStatus(prev => ({ ...prev, [targetId]: 'Aktif' }));
                        }
                        setTempOutletSelectId('');
                      }}
                      style={{
                        background: T.info,
                        border: 'none',
                        color: '#ffffff',
                        padding: '6px 14px',
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
                      <span>+ Tambah Outlet Ini</span>
                    </button>
                  </div>
                </div>

                {selectedOutletIds.length === 0 ? (
                  <div style={{ padding: '16px', background: T.cardBg, borderRadius: '8px', border: `1px dashed ${T.border}`, color: T.info, fontSize: '0.78rem', textAlign: 'center' }}>
                    Belum ada outlet ditambahkan. Pilih outlet di atas lalu klik "+ Tambah Outlet Ini" untuk menjual menu ini di outlet tersebut.
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '10px', marginTop: '10px' }}>
                    {selectedOutletIds.map(outId => {
                      const outObj = masterData.outlets.find(o => String(o.id) === String(outId)) || { name: `Outlet #${outId}` };
                      const currentVal = standardPrices[outId] !== undefined ? standardPrices[outId] : 0;
                      const currentApkStat = outletApkStatus[outId] || 'Aktif';
                      return (
                        <div key={outId} style={{ background: T.cardBg, padding: '10px 12px', borderRadius: '8px', border: `1px solid ${T.border}` }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                            <div style={{ fontSize: '0.75rem', color: T.info, fontWeight: '800' }}>
                              🏢 {outObj.name}
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedOutletIds(selectedOutletIds.filter(id => String(id) !== String(outId)));
                                const updatedStd = { ...standardPrices };
                                delete updatedStd[outId];
                                setStandardPrices(updatedStd);
                                const updatedApk = { ...outletApkStatus };
                                delete updatedApk[outId];
                                setOutletApkStatus(updatedApk);
                              }}
                              title="Hapus outlet ini dari menu"
                              style={{ background: 'none', border: 'none', color: T.danger, cursor: 'pointer', padding: '2px' }}
                            >
                              <X size={14} />
                            </button>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span style={{ fontSize: '0.8rem', color: T.success, fontWeight: '800' }}>Rp</span>
                            <input
                              type="number"
                              placeholder="Nominal harga..."
                              value={currentVal}
                              onChange={e => handleUpdateStandardPrice(outId, e.target.value)}
                              style={{
                                width: '100%',
                                padding: '4px 8px',
                                borderRadius: '6px',
                                border: `1px solid ${T.border}`,
                                background: T.inputBg,
                                color: T.success,
                                fontWeight: '800',
                                fontSize: '0.85rem'
                              }}
                            />
                          </div>

                          <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: `1px dashed ${T.border}` }}>
                            <label style={{ fontSize: '0.72rem', color: T.txtSecondary, fontWeight: '700', display: 'block', marginBottom: '4px' }}>
                              📱 Tampilkan di POS APK:
                            </label>
                            <select
                              value={currentApkStat}
                              onChange={(e) => {
                                const val = e.target.value;
                                setOutletApkStatus(prev => ({ ...prev, [outId]: val }));
                              }}
                              style={{
                                width: '100%',
                                background: (currentApkStat === 'Inaktif') ? T.dangerBg : T.successBg,
                                border: `1px solid ${(currentApkStat === 'Inaktif') ? T.dangerBorder : T.successBorder}`,
                                color: (currentApkStat === 'Inaktif') ? T.danger : T.success,
                                padding: '6px 8px',
                                borderRadius: '6px',
                                fontSize: '0.78rem',
                                fontWeight: '800',
                                cursor: 'pointer'
                              }}
                            >
                              <option value="Aktif" style={{ background: T.dropdownBg, color: T.success }}>🟢 Aktif (Tampil di POS)</option>
                              <option value="Inaktif" style={{ background: T.dropdownBg, color: T.danger }}>🔴 Inaktif (Sembunyikan dari POS)</option>
                            </select>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
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
    </div>
  );
}
