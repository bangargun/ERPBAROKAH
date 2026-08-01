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

export default function ProductManagement({ masterData, setMasterData, selectedBranch }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [displayMode, setDisplayMode] = useState('grid'); // 'grid' | 'table'
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('Semua');
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

  // Field 7: Outlet Selection & Per-Outlet Variant Prices
  const [selectedOutletIds, setSelectedOutletIds] = useState([]);
  const [tempOutletSelectId, setTempOutletSelectId] = useState('');
  const [variantPrices, setVariantPrices] = useState({}); // { 'Sambal Pecak': { 1: 35000, 2: 38000 } }
  const [standardPrices, setStandardPrices] = useState({}); // { 1: 30000, 2: 32000 }

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
      // Initialize default per-outlet prices for this new variant
      const initPrices = {};
      masterData.outlets.forEach(o => {
        initPrices[o.id] = 0;
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

  // Update Standard Price for specific Outlet (when no variants exist)
  const handleUpdateStandardPrice = (outletId, val) => {
    const num = parseFloat(val) || 0;
    setStandardPrices(prev => ({
      ...prev,
      [outletId]: num
    }));
  };

  // 3. Add Composition Row
  const handleAddCompositionRow = () => {
    const defaultIng = masterData.ingredients?.[0] || null;
    const defaultUnit = masterData.units?.[0]?.symbol || 'Gram';

    setCompositions([
      ...compositions,
      {
        id: Date.now(),
        ingredient_id: defaultIng.id,
        ingredient_name: defaultIng.name,
        qty: 100,
        unit: defaultIng.unit || defaultUnit
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
          const ing = masterData.ingredients.find(i => i.id === parseInt(val));
          return {
            ...c,
            ingredient_id: parseInt(val),
            ingredient_name: ing ? ing.name : c.ingredient_name,
            unit: ing ? ing.unit : c.unit
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

    const activeOutletIds = comboOutlets.size > 0 
      ? Array.from(comboOutlets) 
      : (masterData.outlets || []).map(o => o.id);

    setSelectedOutletIds(activeOutletIds);
    setVariantPrices(vPrices);
    setStandardPrices(Object.keys(stdPrices).length > 0 ? stdPrices : (masterData.outlets || []).reduce((acc, o) => ({ ...acc, [o.id]: product.price || 0 }), {}));
    setCompositions(product.compositions || []);
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

    if (variants.length === 0) {
      generatedPriceCombinations.push({
        id: Date.now(),
        combinationName: prodName.trim(),
        selectedOutletIds: selectedOutletIds,
        outletPrices: standardPrices,
        status: 'Aktif'
      });
    } else {
      variants.forEach((vName, idx) => {
        const pMap = variantPrices[vName] || {};
        selectedOutletIds.forEach(outId => {
          if (pMap[outId] === undefined) pMap[outId] = 0;
        });

        generatedPriceCombinations.push({
          id: Date.now() + idx,
          combinationName: `${prodName.trim()} (${vName})`,
          selectedOutletIds: selectedOutletIds,
          outletPrices: pMap,
          status: 'Aktif'
        });
      });
    }

    const firstPriceVal = Object.values(standardPrices)[0] || Object.values(variantPrices[variants[0]] || {})[0] || 0;

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
      variantPrices,
      standardPrices,
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
    // Sembunyikan produk yang harganya 0 atau tidak valid
    if (getEffectiveProductPrice(p) <= 0) return false;

    if (selectedBranch) {
      const matchOutlet = p.outlet_id === selectedBranch || Number(p.outlet_id) === Number(selectedBranch) ||
        (p.selectedOutletIds && (p.selectedOutletIds.includes(selectedBranch) || p.selectedOutletIds.includes(String(selectedBranch)) || p.selectedOutletIds.includes(Number(selectedBranch))));
      if (!matchOutlet) return false;
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
      <div className="glass-card" style={{ padding: '0', overflow: 'hidden', background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px' }}>
        
        {/* CARD TOP HEADER BAR */}
        <div style={{ padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.08)', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '800', color: '#f8fafc', margin: 0 }}>
              Produk
            </h2>
            <p style={{ color: '#94a3b8', fontSize: '0.82rem', marginTop: '4px', margin: 0 }}>
              Master produk/menu, kategori, harga, dan komposisi harga pokok produksi.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {/* Search Input */}
            <div style={{ position: 'relative', width: '220px' }}>
              <Search size={15} color="#94a3b8" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="text"
                placeholder="Cari data..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                style={{
                  width: '100%',
                  padding: '7px 12px 7px 32px',
                  borderRadius: '8px',
                  border: '1px solid #334155',
                  fontSize: '0.8rem',
                  background: '#0f172a',
                  color: '#f8fafc'
                }}
              />
            </div>

            {/* Excel Download & Upload Button */}
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

            {/* Teal Add Product Button */}
            <button
              onClick={handleOpenAddForm}
              style={{
                background: '#0f766e',
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
                boxShadow: '0 4px 12px rgba(15,118,110,0.3)'
              }}
            >
              <Plus size={16} />
              <span>Tambah Menu</span>
            </button>
          </div>
        </div>

        {/* TABLE CONTENT */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.82rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #334155', color: '#94a3b8', fontWeight: '800', fontSize: '0.75rem', textTransform: 'uppercase', background: 'rgba(15,23,42,0.4)' }}>
                <th style={{ padding: '14px 16px' }}>SKU <span style={{ opacity: 0.4 }}>↕</span></th>
                <th style={{ padding: '14px 16px' }}>Produk <span style={{ opacity: 0.4 }}>↕</span></th>
                <th style={{ padding: '14px 16px' }}>Kategori <span style={{ opacity: 0.4 }}>↕</span></th>
                <th style={{ padding: '14px 16px' }}>Harga <span style={{ opacity: 0.4 }}>↕</span></th>
                <th style={{ padding: '14px 16px' }}>Komposisi <span style={{ opacity: 0.4 }}>↕</span></th>
                <th style={{ padding: '14px 16px' }}>Variant <span style={{ opacity: 0.4 }}>↕</span></th>
                <th style={{ padding: '14px 16px' }}>Status <span style={{ opacity: 0.4 }}>↕</span></th>
                <th style={{ padding: '14px 16px', textAlign: 'right' }}>Aksi <span style={{ opacity: 0.4 }}>↕</span></th>
              </tr>
            </thead>
            <tbody>
              {paginatedProducts.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: '50px', textAlign: 'center', color: '#94a3b8' }}>
                    Belum ada produk yang ditambahkan.
                  </td>
                </tr>
              ) : (
                paginatedProducts.map(p => {
                  const categoryName = (masterData.categories.find(c => c.id === p.category_id)?.name || p.category_name || 'Umum').toUpperCase();
                  const isAktif = p.status === 'Aktif';
                  const firstLetter = p.name ? p.name.charAt(0).toUpperCase() : 'P';
                  const variantCount = p.variants ? p.variants.length : (p.priceCombinations ? p.priceCombinations.length : 0);

                  // Primary Outlet Name & Price (HANYA pilih outlet yang memiliki harga > 0)
                  const validPriceOutlets = (masterData.outlets || []).filter(o => {
                    let pr = 0;
                    if (p.standardPrices && p.standardPrices[o.id] !== undefined) {
                      pr = Number(p.standardPrices[o.id]);
                    } else if (p.variantPrices && p.variants && p.variants.length > 0) {
                      const firstV = p.variants[0];
                      if (p.variantPrices[firstV] && p.variantPrices[firstV][o.id] !== undefined) {
                        pr = Number(p.variantPrices[firstV][o.id]);
                      }
                    } else if (p.priceCombinations && p.priceCombinations.length > 0) {
                      const combo = p.priceCombinations.find(c => c.outletPrices && Number(c.outletPrices[o.id]) > 0);
                      if (combo) pr = Number(combo.outletPrices[o.id]);
                    }
                    return pr > 0;
                  });

                  const firstOutletObj = validPriceOutlets[0] || null;

                  let primaryPrice = 0;
                  if (firstOutletObj) {
                    if (p.standardPrices && p.standardPrices[firstOutletObj.id] !== undefined) {
                      primaryPrice = Number(p.standardPrices[firstOutletObj.id]);
                    } else if (p.variantPrices && p.variants && p.variants.length > 0) {
                      const firstV = p.variants[0];
                      if (p.variantPrices[firstV] && p.variantPrices[firstV][firstOutletObj.id] !== undefined) {
                        primaryPrice = Number(p.variantPrices[firstV][firstOutletObj.id]);
                      }
                    } else if (p.priceCombinations && p.priceCombinations.length > 0) {
                      const combo = p.priceCombinations.find(c => c.outletPrices && Number(c.outletPrices[firstOutletObj.id]) > 0);
                      if (combo) primaryPrice = Number(combo.outletPrices[firstOutletObj.id]);
                    }
                  }
                  if (!primaryPrice || primaryPrice <= 0) {
                    primaryPrice = Number(p.price || p.cost_price || p.cost || 0);
                  }

                  const outletNameHeader = (primaryPrice > 0 && firstOutletObj) ? (firstOutletObj.name || '').toUpperCase() : '';

                  return (
                    <tr key={p.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', color: '#f8fafc' }}>
                      {/* 1. SKU */}
                      <td style={{ padding: '14px 16px', color: '#94a3b8', fontFamily: 'monospace', fontSize: '0.8rem', fontWeight: '600' }}>
                        {p.sku || p.code || `MNM-00${p.id}`}
                      </td>

                      {/* 2. MENU (Teks Nama Menu - Klik untuk Papan Informasi Detail Analisis) */}
                      <td style={{ padding: '14px 16px', fontWeight: '800', fontSize: '0.84rem', letterSpacing: '0.3px' }}>
                        <button
                          type="button"
                          onClick={() => setSelectedMenuDetail(p)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#38bdf8',
                            fontWeight: '900',
                            cursor: 'pointer',
                            padding: 0,
                            textAlign: 'left',
                            fontSize: '0.84rem',
                            textDecoration: 'underline'
                          }}
                          title="Klik untuk melihat papan informasi detail kuantitas terjual & riwayat penjualan menu ini"
                        >
                          🍽️ {p.name.toUpperCase()}
                        </button>
                      </td>

                      {/* 3. KATEGORI */}
                      <td style={{ padding: '14px 16px', color: '#cbd5e1', fontWeight: '700', fontSize: '0.78rem' }}>
                        {categoryName}
                      </td>

                      {/* 4. HARGA (Outlet Name cyan + Bold Price, disembunyikan jika 0) */}
                      <td style={{ padding: '14px 16px' }}>
                        {primaryPrice > 0 ? (
                          <>
                            {outletNameHeader && (
                              <div style={{ fontSize: '0.68rem', color: '#38bdf8', fontWeight: '800', textTransform: 'uppercase', marginBottom: '2px', maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {outletNameHeader}
                              </div>
                            )}
                            <div style={{ fontWeight: '900', color: '#34d399', fontSize: '0.85rem' }}>
                              {formatRupiah(primaryPrice)}
                            </div>
                          </>
                        ) : (
                          <span style={{ color: '#64748b', fontSize: '0.75rem', fontStyle: 'italic' }}>Belum Di-set</span>
                        )}
                      </td>

                      {/* 5. KOMPOSISI */}
                      <td style={{ padding: '14px 16px' }}>
                        {p.compositions && p.compositions.length > 0 ? (
                          <span style={{ background: '#0f172a', color: '#38bdf8', border: '1px solid #334155', padding: '4px 10px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: '700' }}>
                            {p.name}
                          </span>
                        ) : (
                          <span style={{ background: '#0f172a', color: '#94a3b8', border: '1px solid #334155', padding: '4px 10px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: '600' }}>
                            Belum ada
                          </span>
                        )}
                      </td>

                      {/* 6. VARIANT (Menampilkan Nama Varian) */}
                      <td style={{ padding: '14px 16px' }}>
                        {(p.variants && p.variants.length > 0) ? (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                            {p.variants.map((vName, vIdx) => (
                              <span key={vIdx} style={{ background: 'rgba(56, 189, 248, 0.12)', color: '#38bdf8', border: '1px solid rgba(56, 189, 248, 0.3)', padding: '3px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: '700' }}>
                                {vName}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span style={{ color: '#64748b', fontSize: '0.75rem', fontStyle: 'italic' }}>Tanpa Varian</span>
                        )}
                      </td>

                      {/* 7. STATUS */}
                      <td style={{ padding: '14px 16px' }}>
                        <span style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '4px 10px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: '800' }}>
                          Aktif
                        </span>
                      </td>

                      {/* 8. AKSI (Tombol Edit & Delete) */}
                      <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                          <button
                            type="button"
                            onClick={() => setSelectedMenuDetail(p)}
                            title="Lihat Riwayat History Penjualan Detail"
                            style={{
                              background: 'rgba(56, 189, 248, 0.15)',
                              color: '#38bdf8',
                              border: '1px solid rgba(56, 189, 248, 0.3)',
                              padding: '5px 10px',
                              borderRadius: '6px',
                              fontSize: '0.75rem',
                              fontWeight: '700',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                          >
                            <Eye size={14} color="#38bdf8" />
                            <span>History</span>
                          </button>

                          <button
                            onClick={() => handleOpenEditForm(p)}
                            title="Edit Produk"
                            style={{
                              background: '#334155',
                              color: '#cbd5e1',
                              border: '1px solid rgba(255,255,255,0.1)',
                              padding: '5px 10px',
                              borderRadius: '6px',
                              fontSize: '0.75rem',
                              fontWeight: '700',
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
                            onClick={() => handleDeleteProduct(p.id, p.name)}
                            title="Hapus Produk"
                            style={{
                              background: 'rgba(244,63,94,0.15)',
                              color: '#fb7185',
                              border: '1px solid rgba(244,63,94,0.3)',
                              padding: '5px 10px',
                              borderRadius: '6px',
                              fontSize: '0.75rem',
                              fontWeight: '700',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px'
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
          <div className="glass-card animate-fade-in" style={{ width: '100%', maxWidth: '780px', maxHeight: '90vh', overflowY: 'auto', padding: '28px', background: '#1e293b', border: '1px solid #334155', borderRadius: '16px' }}>
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '12px' }}>
              <div>
                <h3 style={{ fontSize: '1.3rem', fontWeight: '800', color: '#f8fafc', margin: 0 }}>
                  {editingProductId ? 'Edit Menu' : 'Tambah Menu'}
                </h3>
                <p style={{ fontSize: '0.82rem', color: '#94a3b8', margin: '4px 0 0 0' }}>
                  Kelola produk, harga outlet manual, dan komposisi harga pokok produksi.
                </p>
              </div>
              <button onClick={() => setShowFormModal(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleProceedToPreview} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              
              {/* ROW 1: NAMA PRODUK & SKU AUTO BOX */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', color: '#f8fafc', display: 'block', marginBottom: '6px', fontWeight: '700' }}>
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
                      border: '1px solid #334155',
                      background: '#0f172a',
                      color: '#f8fafc',
                      fontSize: '0.85rem'
                    }}
                  />
                </div>

                <div style={{ background: '#0f172a', border: '1px dashed #334155', borderRadius: '10px', padding: '10px 14px' }}>
                  <div style={{ fontSize: '0.78rem', color: '#f8fafc', fontWeight: '800', marginBottom: '2px' }}>
                    SKU
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#38bdf8', fontWeight: '700', fontFamily: 'monospace' }}>
                    Dibuat otomatis setelah produk disimpan.
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '2px' }}>
                    Contoh: MKN-010, MNM-008, SNK-004.
                  </div>
                </div>
              </div>

              {/* ROW 2: KATEGORI, TARGET PRINTER & STATUS */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', color: '#f8fafc', display: 'block', marginBottom: '6px', fontWeight: '700' }}>
                    Kategori
                  </label>
                  <select
                    value={prodCategoryId}
                    onChange={e => setProdCategoryId(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: '8px',
                      border: '1px solid #334155',
                      background: '#0f172a',
                      color: '#f8fafc',
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
                  <label style={{ fontSize: '0.8rem', color: '#f8fafc', display: 'block', marginBottom: '6px', fontWeight: '700' }}>
                    Target Struk (Printer)
                  </label>
                  <select
                    value={prodPrinterTarget}
                    onChange={e => setProdPrinterTarget(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: '8px',
                      border: '1px solid #334155',
                      background: '#0f172a',
                      color: '#fbbf24',
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
                  <label style={{ fontSize: '0.8rem', color: '#f8fafc', display: 'block', marginBottom: '6px', fontWeight: '700' }}>
                    Status
                  </label>
                  <select
                    value={prodStatus}
                    onChange={e => setProdStatus(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: '8px',
                      border: '1px solid #334155',
                      background: '#0f172a',
                      color: prodStatus === 'Aktif' ? '#34d399' : '#fb7185',
                      fontWeight: '700',
                      fontSize: '0.85rem'
                    }}
                  >
                    <option value="Aktif">Aktif</option>
                    <option value="Inaktif">Inaktif</option>
                  </select>
                </div>
              </div>

              {/* SECTION 3: GAMBAR PRODUK */}
              <div style={{ border: '1px solid #334155', borderRadius: '12px', padding: '16px', background: '#0f172a' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '10px',
                    background: '#1e293b',
                    border: '1px solid #334155',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.2rem',
                    fontWeight: '900',
                    color: '#38bdf8',
                    overflow: 'hidden'
                  }}>
                    {prodImageUrl ? (
                      <img src={prodImageUrl} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <span>{prodName ? prodName.charAt(0).toUpperCase() : 'P'}</span>
                    )}
                  </div>

                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: '800', color: '#f8fafc', marginBottom: '2px' }}>
                      Gambar Produk
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '8px' }}>
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
                        background: '#1e293b',
                        border: '1px solid #334155',
                        color: '#f8fafc',
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
                      <UploadCloud size={14} color="#38bdf8" />
                      <span>Pilih Gambar</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* SECTION 4: CATATAN VARIANT */}
              <div style={{ border: '1px solid #334155', borderRadius: '12px', padding: '16px', background: '#0f172a' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <div>
                    <div style={{ fontSize: '0.85rem', fontWeight: '800', color: '#f8fafc' }}>
                      Catatan Variant
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                      Badge pilihan kecil untuk APK kasir. Bisa dipilih lebih dari satu dan tidak mengubah harga.
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleAddVariant}
                    style={{
                      background: '#1e293b',
                      border: '1px solid #334155',
                      color: '#f8fafc',
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
                        border: '1px solid #334155',
                        background: '#1e293b',
                        color: '#f8fafc',
                        fontSize: '0.8rem'
                      }}
                    />
                  </div>

                  {variants.length === 0 ? (
                    <div style={{ padding: '12px', background: '#1e293b', borderRadius: '8px', border: '1px dashed #334155', color: '#38bdf8', fontSize: '0.78rem', textAlign: 'center' }}>
                      Belum ada catatan variant. Produk tetap bisa dijual tanpa pilihan tambahan.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {variants.map((v, i) => (
                        <span key={i} style={{ background: '#1e293b', border: '1px solid #334155', color: '#f8fafc', padding: '4px 10px', borderRadius: '20px', fontSize: '0.78rem', fontWeight: '600', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                          {v}
                          <X size={14} color="#f43f5e" style={{ cursor: 'pointer' }} onClick={() => handleRemoveVariant(v)} />
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* SECTION 5: HARGA OUTLET MANUAL */}
              <div style={{ border: '1px solid #334155', borderRadius: '12px', padding: '16px', background: '#0f172a' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '10px' }}>
                  <div>
                    <div style={{ fontSize: '0.85rem', fontWeight: '800', color: '#f8fafc' }}>
                      Harga Outlet Manual
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                      Pilih dan tambahkan outlet yang menjual menu ini secara manual.
                    </div>
                  </div>

                  {/* Dropdown Select Outlet + Button Tambah */}
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <select
                      value={tempOutletSelectId}
                      onChange={e => setTempOutletSelectId(e.target.value)}
                      style={{
                        background: '#1e293b',
                        border: '1px solid #334155',
                        color: '#cbd5e1',
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
                          setStandardPrices(prev => ({ ...prev, [targetId]: 15000 }));
                        }
                        setTempOutletSelectId('');
                      }}
                      style={{
                        background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
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
                  <div style={{ padding: '16px', background: '#1e293b', borderRadius: '8px', border: '1px dashed #334155', color: '#38bdf8', fontSize: '0.78rem', textAlign: 'center' }}>
                    Belum ada outlet ditambahkan. Pilih outlet di atas lalu klik "+ Tambah Outlet Ini" untuk menjual menu ini di outlet tersebut.
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '10px', marginTop: '10px' }}>
                    {selectedOutletIds.map(outId => {
                      const outObj = masterData.outlets.find(o => String(o.id) === String(outId)) || { name: `Outlet #${outId}` };
                      const currentVal = standardPrices[outId] !== undefined ? standardPrices[outId] : 0;
                      return (
                        <div key={outId} style={{ background: '#1e293b', padding: '10px 12px', borderRadius: '8px', border: '1px solid #334155' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                            <div style={{ fontSize: '0.75rem', color: '#38bdf8', fontWeight: '800' }}>
                              🏢 {outObj.name}
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedOutletIds(selectedOutletIds.filter(id => String(id) !== String(outId)));
                                const updatedStd = { ...standardPrices };
                                delete updatedStd[outId];
                                setStandardPrices(updatedStd);
                              }}
                              title="Hapus outlet ini dari menu"
                              style={{ background: 'none', border: 'none', color: '#f43f5e', cursor: 'pointer', padding: '2px' }}
                            >
                              <X size={14} />
                            </button>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span style={{ fontSize: '0.8rem', color: '#34d399', fontWeight: '800' }}>Rp</span>
                            <input
                              type="number"
                              placeholder="Nominal harga..."
                              value={currentVal}
                              onChange={e => handleUpdateStandardPrice(outId, e.target.value)}
                              style={{
                                width: '100%',
                                padding: '4px 8px',
                                borderRadius: '6px',
                                border: '1px solid #334155',
                                background: '#0f172a',
                                color: '#34d399',
                                fontWeight: '800',
                                fontSize: '0.85rem'
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* SECTION 6: KOMPOSISI HARGA POKOK PRODUKSI (HPP & STOK) */}
              <div style={{ border: '1px solid #334155', borderRadius: '12px', padding: '16px', background: '#0f172a' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <div>
                    <div style={{ fontSize: '0.85rem', fontWeight: '800', color: '#f8fafc' }}>
                      Komposisi Harga Pokok Produksi
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                      Tambahkan harga pokok produksi untuk estimasi HPP dan stok.
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleAddCompositionRow}
                    style={{
                      background: '#1e293b',
                      border: '1px solid #334155',
                      color: '#f8fafc',
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
                    <span>Tambah Harga Pokok Produksi</span>
                  </button>
                </div>

                {compositions.length === 0 ? (
                  <div style={{ padding: '12px', background: '#1e293b', borderRadius: '8px', border: '1px dashed #334155', color: '#38bdf8', fontSize: '0.78rem', textAlign: 'center' }}>
                    Belum ada komposisi HPP. Klik "+ Tambah Harga Pokok Produksi" di atas.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 40px', gap: '8px', fontSize: '0.72rem', color: '#94a3b8', fontWeight: '700', paddingLeft: '4px' }}>
                      <span>Harga Pokok Produksi</span>
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
                            border: '1px solid #334155',
                            background: '#1e293b',
                            color: '#f8fafc',
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
                            border: '1px solid #334155',
                            background: '#1e293b',
                            color: '#f8fafc',
                            fontSize: '0.8rem'
                          }}
                        />

                        <select
                          value={comp.unit || (masterData.units?.[0]?.symbol || masterData.units?.[0]?.name || 'Gram')}
                          onChange={e => handleUpdateComposition(comp.id, 'unit', e.target.value)}
                          style={{
                            width: '100%',
                            padding: '7px 10px',
                            borderRadius: '6px',
                            border: '1px solid #334155',
                            background: '#1e293b',
                            color: '#f8fafc',
                            fontSize: '0.8rem'
                          }}
                        >
                          {(masterData.units && masterData.units.length > 0 ? masterData.units : [
                            { id: 1, name: 'Kilogram', symbol: 'kg' },
                            { id: 2, name: 'Gram', symbol: 'Gram' },
                            { id: 3, name: 'Liter', symbol: 'Liter' },
                            { id: 4, name: 'Milliliter', symbol: 'ml' },
                            { id: 5, name: 'Porsi', symbol: 'Porsi' },
                            { id: 6, name: 'Pcs', symbol: 'pcs' },
                            { id: 7, name: 'Bungkus', symbol: 'Bungkus' }
                          ]).map(u => {
                            const val = u.symbol || u.name;
                            return (
                              <option key={u.id} value={val}>
                                {val} ({u.name})
                              </option>
                            );
                          })}
                        </select>

                        <button type="button" onClick={() => handleRemoveComposition(comp.id)} style={{ background: 'none', border: 'none', color: '#fb7185', cursor: 'pointer', textAlign: 'center' }}>
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* FOOTER ACTIONS */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '16px' }}>
                <button
                  type="button"
                  onClick={() => setShowFormModal(false)}
                  style={{
                    background: '#334155',
                    color: '#cbd5e1',
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
                    background: '#0f766e',
                    color: '#ffffff',
                    border: 'none',
                    padding: '8px 20px',
                    borderRadius: '8px',
                    fontSize: '0.82rem',
                    fontWeight: '700',
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(15,118,110,0.3)'
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
          <div className="glass-card animate-fade-in" style={{ width: '100%', maxWidth: '600px', maxHeight: '85vh', overflowY: 'auto', padding: '28px', background: '#1e293b', border: '1px solid #10b981' }}>
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <div style={{ width: '50px', height: '50px', borderRadius: '50%', background: 'rgba(16,185,129,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px auto', color: '#34d399' }}>
                <Eye size={24} />
              </div>
              <h3 style={{ fontSize: '1.3rem', fontWeight: '800', color: '#f8fafc' }}>
                Pratinjau Produk (Preview)
              </h3>
              <p style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Periksa kembali kelengkapan data sebelum menyimpan secara permanen</p>
            </div>

            <div style={{ background: '#0f172a', padding: '16px', borderRadius: '12px', border: '1px solid #334155', display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.85rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '8px' }}>
                <span style={{ color: '#94a3b8' }}>Kode Produk:</span>
                <strong style={{ color: '#818cf8', fontFamily: 'monospace' }}>{editingProductId ? (masterData.products.find(p => p.id === editingProductId)?.sku || 'PRD-001') : generateNextProductCode()}</strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '8px' }}>
                <span style={{ color: '#94a3b8' }}>Nama Produk:</span>
                <strong style={{ color: '#f8fafc' }}>{prodName}</strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '8px' }}>
                <span style={{ color: '#94a3b8' }}>Kategori Produk:</span>
                <strong style={{ color: '#38bdf8' }}>{masterData.categories.find(c => c.id === parseInt(prodCategoryId))?.name || 'Umum'}</strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '8px' }}>
                <span style={{ color: '#94a3b8' }}>Status Produk:</span>
                <strong style={{ color: prodStatus === 'Aktif' ? '#34d399' : '#fb7185' }}>{prodStatus}</strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '8px' }}>
                <span style={{ color: '#94a3b8' }}>Varian Produk:</span>
                <strong style={{ color: '#cbd5e1' }}>{variants.length > 0 ? variants.join(', ') : 'Tanpa Varian'}</strong>
              </div>

              <div>
                <span style={{ color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Harga per Outlet:</span>
                {variants.length > 0 ? (
                  variants.map((vName, i) => (
                    <div key={i} style={{ background: '#1e293b', padding: '6px 10px', borderRadius: '6px', marginBottom: '4px', fontSize: '0.78rem' }}>
                      <div style={{ color: '#38bdf8', fontWeight: '700' }}>Varian: {vName}</div>
                      <div style={{ color: '#34d399' }}>
                        {selectedOutletIds.length > 0
                          ? selectedOutletIds.map(oid => `${masterData.outlets.find(o => o.id === oid)?.name || `Outlet #${oid}`}: ${formatRupiah(variantPrices[vName]?.[oid] || 35000)}`).join(' | ')
                          : 'Belum ada outlet'}
                      </div>
                    </div>
                  ))
                ) : (
                  <div style={{ background: '#1e293b', padding: '6px 10px', borderRadius: '6px', fontSize: '0.78rem', color: '#34d399' }}>
                    {selectedOutletIds.length > 0
                      ? selectedOutletIds.map(oid => `${masterData.outlets.find(o => o.id === oid)?.name || `Outlet #${oid}`}: ${formatRupiah(standardPrices[oid] || 30000)}`).join(' | ')
                      : 'Belum ada outlet'}
                  </div>
                )}
              </div>

              <div>
                <span style={{ color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Komposisi Bahan Baku (Resep):</span>
                {compositions.length > 0 ? (
                  <ul style={{ paddingLeft: '18px', color: '#cbd5e1', fontSize: '0.78rem' }}>
                    {compositions.map((comp, i) => (
                      <li key={i}>{comp.ingredient_name}: {comp.qty} {comp.unit}</li>
                    ))}
                  </ul>
                ) : (
                  <span style={{ color: '#64748b', fontSize: '0.75rem', fontStyle: 'italic' }}>Tanpa Komposisi Khusus</span>
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
