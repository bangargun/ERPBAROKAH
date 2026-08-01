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

  // FORM STATES
  const [prodName, setProdName] = useState('');
  const [prodCategoryId, setProdCategoryId] = useState('');
  const [prodStatus, setProdStatus] = useState('Aktif');
  const [prodPrinterTarget, setProdPrinterTarget] = useState('dapur');
  const [prodImageUrl, setProdImageUrl] = useState('');

  // Varian produk (badge label saja, harga per varian ada di outletRows)
  const [prodVariants, setProdVariants] = useState([]); // ['Sambal Pecak', 'Sambal Ijo']
  const [tempVariantInput, setTempVariantInput] = useState('');

  // State utama: satu array rows per outlet, masing-masing menyimpan harga per varian
  // outletRows = [{ outletId: Number, apkStatus: 'Aktif'|'Inaktif', basePrice: Number, variantPrices: { [vName]: Number } }]
  const [outletRows, setOutletRows] = useState([]);
  const [tempOutletSelectId, setTempOutletSelectId] = useState('');

  // Field: Komposisi / Ingredients List
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

  // ─── HANDLER VARIAN (pakai prodVariants + outletRows) ──────────────────────

  const handleAddVariant = () => {
    if (!tempVariantInput.trim()) return;
    const newV = tempVariantInput.trim();
    if (prodVariants.includes(newV)) { setTempVariantInput(''); return; }
    setProdVariants(prev => [...prev, newV]);
    // Tambah key varian ke setiap outletRow yang sudah ada
    setOutletRows(prev => prev.map(row => ({
      ...row,
      variantPrices: { ...row.variantPrices, [newV]: 0 }
    })));
    setTempVariantInput('');
  };

  const handleRemoveVariant = (vName) => {
    setProdVariants(prev => prev.filter(v => v !== vName));
    setOutletRows(prev => prev.map(row => {
      const vp = { ...row.variantPrices };
      delete vp[vName];
      return { ...row, variantPrices: vp };
    }));
  };

  // ─── HANDLER OUTLET ROWS ────────────────────────────────────────────────────

  const handleAddOutletRow = () => {
    if (!tempOutletSelectId) return;
    const outletId = Number(tempOutletSelectId);
    if (outletRows.some(r => r.outletId === outletId)) { setTempOutletSelectId(''); return; }
    const initVP = {};
    prodVariants.forEach(v => { initVP[v] = 0; });
    setOutletRows(prev => [...prev, { outletId, apkStatus: 'Aktif', basePrice: 0, variantPrices: initVP }]);
    setTempOutletSelectId('');
  };

  const handleRemoveOutletRow = (outletId) => {
    setOutletRows(prev => prev.filter(r => r.outletId !== outletId));
  };

  const handleUpdateOutletBasePrice = (outletId, val) => {
    setOutletRows(prev => prev.map(r =>
      r.outletId === outletId ? { ...r, basePrice: parseFloat(val) || 0 } : r
    ));
  };

  const handleUpdateOutletVariantPrice = (outletId, vName, val) => {
    setOutletRows(prev => prev.map(r =>
      r.outletId === outletId
        ? { ...r, variantPrices: { ...r.variantPrices, [vName]: parseFloat(val) || 0 } }
        : r
    ));
  };

  const handleUpdateOutletApkStatus = (outletId, val) => {
    setOutletRows(prev => prev.map(r =>
      r.outletId === outletId ? { ...r, apkStatus: val } : r
    ));
  };

  // ─── HANDLER KOMPOSISI ──────────────────────────────────────────────────────

  const handleAddCompositionRow = () => {
    const defaultIng = (masterData.ingredients || [])[0] || null;
    const defaultUnit = masterData.units?.[0]?.symbol || 'Gram';
    if (!defaultIng) {
      setCompositions([...compositions, { id: Date.now(), ingredient_id: '', ingredient_name: '', qty: 1, unit: defaultUnit }]);
      return;
    }
    setCompositions([...compositions, {
      id: Date.now(),
      ingredient_id: defaultIng.id,
      ingredient_name: defaultIng.name,
      qty: 100,
      unit: defaultIng.unit || defaultUnit
    }]);
  };

  const handleRemoveComposition = (compId) => {
    setCompositions(compositions.filter(c => c.id !== compId));
  };

  const handleUpdateComposition = (compId, field, val) => {
    setCompositions(compositions.map(c => {
      if (c.id !== compId) return c;
      if (field === 'ingredient_id') {
        const ing = (masterData.ingredients || []).find(i => i.id === parseInt(val));
        return { ...c, ingredient_id: parseInt(val), ingredient_name: ing?.name || '', unit: ing?.unit || c.unit };
      }
      return { ...c, [field]: val };
    }));
  };

  // ─── RESET & BUKA FORM ──────────────────────────────────────────────────────

  const handleOpenAddForm = () => {
    setEditingProductId(null);
    setProdName('');
    setProdCategoryId(masterData.categories[0]?.id || '');
    setProdStatus('Aktif');
    setProdPrinterTarget('dapur');
    setProdImageUrl('');
    setProdVariants([]);
    setTempVariantInput('');
    setOutletRows([]);
    setTempOutletSelectId('');
    setCompositions([]);
    setShowFormModal(true);
  };

  // Edit: rekonstruksi outletRows dari data tersimpan
  const handleOpenEditForm = (product) => {
    setEditingProductId(product.id);
    setProdName(product.name);
    setProdCategoryId(product.category_id || masterData.categories[0]?.id || '');
    setProdStatus(product.status || 'Aktif');
    setProdPrinterTarget(product.target_printer || 'dapur');
    setProdImageUrl(product.image_url || '');
    setProdVariants(product.variants || []);
    setTempVariantInput('');
    setTempOutletSelectId('');
    setCompositions(product.compositions || []);

    const apkMap = product.apkStatus || product.outletApkStatus || {};
    const stdPrices = product.standardPrices || {};
    const vPrices = product.variantPrices || {};
    const pVariants = product.variants || [];

    // Kumpulkan semua outletId (normalize ke Number)
    const allOutletIds = new Set();
    if (Array.isArray(product.selectedOutletIds)) {
      product.selectedOutletIds.forEach(id => allOutletIds.add(Number(id)));
    }
    Object.keys(stdPrices).forEach(id => allOutletIds.add(Number(id)));
    Object.values(vPrices).forEach(vMap => Object.keys(vMap).forEach(id => allOutletIds.add(Number(id))));
    if (product.priceCombinations) {
      product.priceCombinations.forEach(combo => {
        (combo.selectedOutletIds || []).forEach(id => allOutletIds.add(Number(id)));
        if (combo.outletPrices) Object.keys(combo.outletPrices).forEach(id => allOutletIds.add(Number(id)));
      });
    }

    const rows = Array.from(allOutletIds)
      .filter(outId => (masterData.outlets || []).some(o => Number(o.id) === outId))
      .map(outId => {
        const sId = String(outId);
        const bp = Number(stdPrices[outId] ?? stdPrices[sId] ?? 0);
        const rowVP = {};
        pVariants.forEach(vName => {
          const vMap = vPrices[vName] || {};
          rowVP[vName] = Number(vMap[outId] ?? vMap[sId] ?? 0);
        });
        return { outletId: outId, apkStatus: apkMap[outId] || apkMap[sId] || 'Aktif', basePrice: bp, variantPrices: rowVP };
      });

    setOutletRows(rows);
    setShowFormModal(true);
  };

  // ─── SIMPAN PRODUK (1-STEP) ─────────────────────────────────────────────────

  const handleProceedToPreview = (e) => {
    e.preventDefault();
    if (!prodName.trim()) { alert('Mohon isi Nama Produk.'); return; }
    handleFinalSaveProduct();
  };

  const handleFinalSaveProduct = () => {
    const code = editingProductId
      ? masterData.products.find(p => p.id === editingProductId)?.sku || generateNextProductCode()
      : generateNextProductCode();

    const categoryObj = masterData.categories.find(c => c.id === parseInt(prodCategoryId));

    // Rebuild dari outletRows — outletId SELALU Number
    const builtStdPrices = {};
    const builtVarPrices = {};
    const builtApkStatus = {};
    const selectedOutletIds = [];

    outletRows.forEach(row => {
      const oid = Number(row.outletId);
      selectedOutletIds.push(oid);
      builtApkStatus[oid] = row.apkStatus;
      if (prodVariants.length === 0) {
        builtStdPrices[oid] = parseFloat(row.basePrice) || 0;
      } else {
        prodVariants.forEach(vName => {
          if (!builtVarPrices[vName]) builtVarPrices[vName] = {};
          builtVarPrices[vName][oid] = parseFloat(row.variantPrices?.[vName]) || 0;
        });
      }
    });

    // priceCombinations untuk backward compat POS Mobile
    const generatedPriceCombinations = [];
    if (prodVariants.length === 0) {
      generatedPriceCombinations.push({
        id: Date.now(), combinationName: prodName.trim(),
        selectedOutletIds, outletPrices: builtStdPrices, apkStatus: builtApkStatus, status: 'Aktif'
      });
    } else {
      prodVariants.forEach((vName, idx) => {
        generatedPriceCombinations.push({
          id: Date.now() + idx, combinationName: `${prodName.trim()} (${vName})`,
          selectedOutletIds, outletPrices: builtVarPrices[vName] || {}, apkStatus: builtApkStatus, status: 'Aktif'
        });
      });
    }

    let firstPrice = 0;
    if (prodVariants.length === 0) {
      firstPrice = Object.values(builtStdPrices).find(v => v > 0) || 0;
    } else {
      outer: for (const vName of prodVariants) {
        for (const v of Object.values(builtVarPrices[vName] || {})) {
          if (v > 0) { firstPrice = v; break outer; }
        }
      }
    }

    const productPayload = {
      id: editingProductId || Date.now(),
      sku: code, code,
      name: prodName.trim(),
      category_id: parseInt(prodCategoryId),
      category_name: categoryObj?.name || 'Umum',
      category: categoryObj?.name || 'Umum',
      price: firstPrice,
      cost: firstPrice * 0.4,
      unit: 'Pcs', stock: 100, min_stock: 10,
      status: prodStatus,
      target_printer: prodPrinterTarget,
      image_url: prodImageUrl || '',
      variants: prodVariants,
      selectedOutletIds,
      variantPrices: builtVarPrices,
      standardPrices: builtStdPrices,
      apkStatus: builtApkStatus,
      outletApkStatus: builtApkStatus,
      priceCombinations: generatedPriceCombinations,
      compositions
    };

    const updated = { ...masterData, _lastUpdated: Date.now() };
    if (editingProductId) {
      const idx = updated.products.findIndex(p => p.id === editingProductId);
      if (idx !== -1) updated.products[idx] = productPayload;
    } else {
      updated.products.unshift(productPayload);
    }

    setMasterData(updated);
    setShowFormModal(false);
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

            {/* Status Filter Dropdown */}
            <select
              value={selectedStatusFilter}
              onChange={e => setSelectedStatusFilter(e.target.value)}
              style={{
                padding: '7px 12px',
                borderRadius: '8px',
                border: '1px solid #334155',
                fontSize: '0.8rem',
                background: '#0f172a',
                color: selectedStatusFilter === 'Aktif' ? '#34d399' : selectedStatusFilter === 'Hide' ? '#94a3b8' : selectedStatusFilter === 'Inaktif' ? '#fb7185' : '#cbd5e1',
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
                  
                  // === LOGIKA HARGA KATALOG MENU ===
                  // Prioritas: standardPrices (dari form) → variantPrices → priceCombinations → p.price (produk lama)
                  const _getOutletPrice = (o) => {
                    const oid = String(o.id);
                    // 1. standardPrices (diisi langsung dari form "Harga Outlet Manual")
                    if (p.standardPrices) {
                      const k = Object.keys(p.standardPrices).find(k => String(k) === oid);
                      if (k && Number(p.standardPrices[k]) > 0) return Number(p.standardPrices[k]);
                    }
                    // 2. variantPrices (jika ada varian)
                    if (p.variantPrices && p.variants && p.variants.length > 0) {
                      for (const vName of p.variants) {
                        const vMap = p.variantPrices[vName] || {};
                        const vKey = Object.keys(vMap).find(k => String(k) === oid);
                        if (vKey && Number(vMap[vKey]) > 0) return Number(vMap[vKey]);
                      }
                    }
                    // 3. priceCombinations (backward compat)
                    if (p.priceCombinations && p.priceCombinations.length > 0) {
                      for (const combo of p.priceCombinations) {
                        if (combo.outletPrices) {
                          const v = Number(combo.outletPrices[o.id] || combo.outletPrices[oid] || 0);
                          if (v > 0) return v;
                        }
                      }
                    }
                    return 0;
                  };

                  const validPriceOutlets = (masterData.outlets || []).filter(o => _getOutletPrice(o) > 0);
                  const firstOutletObj = validPriceOutlets[0] || null;

                  // Harga dari outlet pertama, atau fallback ke p.price (produk lama tanpa outlet mapping)
                  let primaryPrice = firstOutletObj ? _getOutletPrice(firstOutletObj) : 0;
                  if (primaryPrice <= 0 && p.price && Number(p.price) > 0) {
                    primaryPrice = Number(p.price);
                  }

                  return (
                    <tr key={p.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', color: '#f8fafc' }}>
                      {/* 1. SKU */}
                      <td style={{ padding: '14px 16px', color: '#94a3b8', fontFamily: 'monospace', fontSize: '0.8rem', fontWeight: '600', whiteSpace: 'nowrap' }}>
                        {p.sku || p.code || `PRD-${String(p.id).slice(-3)}`}
                      </td>

                      {/* 2. NAMA MENU */}
                      <td style={{ padding: '14px 16px', fontWeight: '800', fontSize: '0.84rem', letterSpacing: '0.3px', minWidth: '160px' }}>
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
                          title="Klik untuk melihat detail analisis penjualan menu ini"
                        >
                          🍽️ {p.name.toUpperCase()}
                        </button>
                        {/* Tampilkan Komposisi HPP sebagai sub-info */}
                        {p.compositions && p.compositions.length > 0 && (
                          <div style={{ fontSize: '0.68rem', color: '#64748b', marginTop: '3px' }}>
                            🧪 {p.compositions.length} bahan HPP
                          </div>
                        )}
                      </td>

                      {/* 3. KATEGORI */}
                      <td style={{ padding: '14px 16px', color: '#cbd5e1', fontWeight: '700', fontSize: '0.78rem', whiteSpace: 'nowrap' }}>
                        {categoryName}
                      </td>

                      {/* 4. TARGET PRINTER */}
                      <td style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>
                        {(() => {
                          const tp = p.target_printer || 'dapur';
                          if (tp === 'bar') return <span style={{ background: 'rgba(251,191,36,0.12)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.3)', padding: '3px 8px', borderRadius: '6px', fontSize: '0.72rem', fontWeight: '800' }}>🍹 Bar</span>;
                          if (tp === 'keduanya') return <span style={{ background: 'rgba(168,85,247,0.12)', color: '#c084fc', border: '1px solid rgba(168,85,247,0.3)', padding: '3px 8px', borderRadius: '6px', fontSize: '0.72rem', fontWeight: '800' }}>🍳🍹 Keduanya</span>;
                          return <span style={{ background: 'rgba(249,115,22,0.12)', color: '#fb923c', border: '1px solid rgba(249,115,22,0.3)', padding: '3px 8px', borderRadius: '6px', fontSize: '0.72rem', fontWeight: '800' }}>🍳 Dapur</span>;
                        })()}
                      </td>

                      {/* 5. HARGA & APK STATUS PER OUTLET - tampilkan semua outlet yang terdaftar */}
                      <td style={{ padding: '14px 16px', minWidth: '200px' }}>
                        {(() => {
                          const allOutlets = masterData.outlets || [];
                          const registeredOutlets = (p.selectedOutletIds || []).map(oid => allOutlets.find(o => String(o.id) === String(oid))).filter(Boolean);

                          if (registeredOutlets.length === 0) {
                            // Fallback: cari outlet yang punya harga
                            const hasPrice = allOutlets.filter(o => _getOutletPrice(o) > 0);
                            if (hasPrice.length === 0) {
                              return <span style={{ color: '#f43f5e', fontSize: '0.72rem', fontWeight: '800', background: 'rgba(244,63,94,0.1)', padding: '2px 8px', borderRadius: '4px', border: '1px solid rgba(244,63,94,0.3)' }}>⚠️ Belum Di-set</span>;
                            }
                            return hasPrice.map(o => {
                              const pr = _getOutletPrice(o);
                              return (
                                <div key={o.id} style={{ marginBottom: '4px' }}>
                                  <span style={{ fontSize: '0.7rem', color: '#38bdf8', fontWeight: '700' }}>{o.name}: </span>
                                  <span style={{ fontSize: '0.78rem', color: '#34d399', fontWeight: '900' }}>{formatRupiah(pr)}</span>
                                </div>
                              );
                            });
                          }

                          return registeredOutlets.map(o => {
                            const pr = _getOutletPrice(o);
                            const apkSt = (p.apkStatus || p.outletApkStatus || {})[o.id] ||
                                          (p.apkStatus || p.outletApkStatus || {})[String(o.id)] || 'Aktif';
                            const apkColor = apkSt === 'Inaktif' ? '#f43f5e' : '#34d399';
                            // Tampilkan harga per varian jika ada
                            if (p.variants && p.variants.length > 0 && p.variantPrices) {
                              return (
                                <div key={o.id} style={{ marginBottom: '6px', paddingBottom: '4px', borderBottom: '1px dashed rgba(255,255,255,0.05)' }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                                    <span style={{ fontSize: '0.68rem', color: '#38bdf8', fontWeight: '800' }}>🏢 {o.name}</span>
                                    <span style={{ fontSize: '0.65rem', color: apkColor, fontWeight: '800' }}>{apkSt === 'Inaktif' ? '🔴 Sembunyi' : '🟢 Tampil'}</span>
                                  </div>
                                  {p.variants.map(vName => {
                                    const vMap = p.variantPrices[vName] || {};
                                    const vPr = Number(vMap[o.id] || vMap[String(o.id)] || 0);
                                    return (
                                      <div key={vName} style={{ fontSize: '0.7rem', color: '#94a3b8', display: 'flex', justifyContent: 'space-between' }}>
                                        <span style={{ color: '#a78bfa' }}>{vName}:</span>
                                        <span style={{ color: vPr > 0 ? '#34d399' : '#f43f5e', fontWeight: '800' }}>{vPr > 0 ? formatRupiah(vPr) : '—'}</span>
                                      </div>
                                    );
                                  })}
                                </div>
                              );
                            }
                            return (
                              <div key={o.id} style={{ marginBottom: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                                <div>
                                  <span style={{ fontSize: '0.68rem', color: '#38bdf8', fontWeight: '800' }}>🏢 {o.name}: </span>
                                  <span style={{ fontSize: '0.78rem', color: pr > 0 ? '#34d399' : '#f43f5e', fontWeight: '900' }}>{pr > 0 ? formatRupiah(pr) : '⚠️ —'}</span>
                                </div>
                                <span style={{ fontSize: '0.65rem', color: apkColor, fontWeight: '800', whiteSpace: 'nowrap' }}>{apkSt === 'Inaktif' ? '🔴 Sembunyi' : '🟢 Tampil'}</span>
                              </div>
                            );
                          });
                        })()}
                      </td>

                      {/* 6. VARIANT */}
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
                        {(() => {
                          const st = p.status || 'Aktif';
                          if (st === 'Aktif') {
                            return (
                              <span style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '4px 10px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: '800' }}>
                                🟢 Aktif
                              </span>
                            );
                          } else if (st === 'Inaktif') {
                            return (
                              <span style={{ background: 'rgba(244, 63, 94, 0.15)', color: '#fb7185', border: '1px solid rgba(244, 63, 94, 0.3)', padding: '4px 10px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: '800' }}>
                                🔴 Inaktif
                              </span>
                            );
                          } else {
                            return (
                              <span style={{ background: 'rgba(148, 163, 184, 0.15)', color: '#94a3b8', border: '1px solid rgba(148, 163, 184, 0.3)', padding: '4px 10px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: '800' }}>
                                👁️ Hide
                              </span>
                            );
                          }
                        })()}
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

      {/* ═══════════════════════════════════════════════════════════
          FORM MODAL: TAMBAH / EDIT MENU (Format Baru — Outlet Pertama)
          ═══════════════════════════════════════════════════════════ */}
      {showFormModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.78)',
          backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 100, padding: '16px'
        }}>
          <div className="glass-card animate-fade-in" style={{
            width: '100%', maxWidth: '800px', maxHeight: '92vh',
            overflowY: 'auto', background: '#1e293b',
            border: '1px solid #334155', borderRadius: '18px',
            padding: '28px', display: 'flex', flexDirection: 'column', gap: '0'
          }}>

            {/* ── HEADER ── */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '22px', borderBottom: '1px solid rgba(255,255,255,0.07)', paddingBottom: '14px' }}>
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: '900', color: '#f8fafc', margin: 0 }}>
                  {editingProductId ? '✏️ Edit Menu' : '➕ Tambah Menu Baru'}
                </h3>
                <p style={{ fontSize: '0.78rem', color: '#94a3b8', margin: '4px 0 0 0' }}>
                  Isi info dasar, tambah outlet beserta harga, lalu simpan.
                </p>
              </div>
              <button onClick={() => setShowFormModal(false)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: '4px' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleProceedToPreview} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

              {/* ══════════════════════════════════
                  SECTION 1 — INFO DASAR
                  ══════════════════════════════════ */}
              <div style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '12px', padding: '18px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ fontSize: '0.78rem', fontWeight: '900', color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '2px' }}>① Info Dasar</div>

                {/* Nama + SKU */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '12px', alignItems: 'start' }}>
                  <div>
                    <label style={{ fontSize: '0.78rem', color: '#cbd5e1', display: 'block', marginBottom: '6px', fontWeight: '700' }}>Nama Menu <span style={{ color: '#f43f5e' }}>*</span></label>
                    <input
                      type="text" required
                      placeholder="Contoh: Nasi Goreng Barokah"
                      value={prodName}
                      onChange={e => setProdName(e.target.value)}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #334155', background: '#1e293b', color: '#f8fafc', fontSize: '0.88rem', fontWeight: '700', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div style={{ background: '#1e293b', border: '1px dashed #334155', borderRadius: '8px', padding: '9px 14px', minWidth: '120px' }}>
                    <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: '700' }}>SKU (otomatis)</div>
                    <div style={{ fontSize: '0.78rem', color: '#818cf8', fontFamily: 'monospace', fontWeight: '800' }}>
                      {editingProductId ? masterData.products.find(p => p.id === editingProductId)?.sku || '—' : generateNextProductCode()}
                    </div>
                  </div>
                </div>

                {/* Kategori + Printer + Status */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '0.78rem', color: '#cbd5e1', display: 'block', marginBottom: '6px', fontWeight: '700' }}>Kategori</label>
                    <select value={prodCategoryId} onChange={e => setProdCategoryId(e.target.value)}
                      style={{ width: '100%', padding: '9px 10px', borderRadius: '8px', border: '1px solid #334155', background: '#1e293b', color: '#f8fafc', fontSize: '0.82rem' }}>
                      {(masterData.categories || []).map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: '0.78rem', color: '#cbd5e1', display: 'block', marginBottom: '6px', fontWeight: '700' }}>🖨️ Target Printer</label>
                    <select value={prodPrinterTarget} onChange={e => setProdPrinterTarget(e.target.value)}
                      style={{ width: '100%', padding: '9px 10px', borderRadius: '8px', border: '1px solid #334155', background: '#1e293b', color: '#fbbf24', fontWeight: '700', fontSize: '0.82rem' }}>
                      <option value="dapur">🍳 Dapur (Koki)</option>
                      <option value="bar">🍹 Bar (Bartender)</option>
                      <option value="keduanya">🍳🍹 Keduanya</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: '0.78rem', color: '#cbd5e1', display: 'block', marginBottom: '6px', fontWeight: '700' }}>Status</label>
                    <select value={prodStatus} onChange={e => setProdStatus(e.target.value)}
                      style={{ width: '100%', padding: '9px 10px', borderRadius: '8px', border: '1px solid #334155', background: '#1e293b', color: prodStatus === 'Aktif' ? '#34d399' : prodStatus === 'Hide' ? '#94a3b8' : '#fb7185', fontWeight: '700', fontSize: '0.82rem' }}>
                      <option value="Aktif">🟢 Aktif</option>
                      <option value="Inaktif">🔴 Inaktif</option>
                      <option value="Hide">👁️ Hide</option>
                    </select>
                  </div>
                </div>

                {/* Gambar */}
                <div>
                  <label style={{ fontSize: '0.78rem', color: '#cbd5e1', display: 'block', marginBottom: '6px', fontWeight: '700' }}>Gambar Produk <span style={{ color: '#64748b', fontWeight: '400' }}>(opsional)</span></label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '52px', height: '52px', borderRadius: '10px', background: '#334155', border: '1px solid #475569', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
                      {prodImageUrl
                        ? <img src={prodImageUrl} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : <span style={{ fontSize: '1.4rem', fontWeight: '900', color: '#38bdf8' }}>{prodName ? prodName.charAt(0).toUpperCase() : '?'}</span>
                      }
                    </div>
                    <div style={{ flex: 1 }}>
                      <input id="product-image-file-input" type="file" accept="image/*" onChange={handleFileInputChange} style={{ display: 'none' }} />
                      <button type="button" onClick={() => document.getElementById('product-image-file-input').click()}
                        style={{ background: '#334155', border: '1px solid #475569', color: '#cbd5e1', padding: '7px 14px', borderRadius: '7px', fontSize: '0.78rem', fontWeight: '700', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        <UploadCloud size={13} color="#38bdf8" /> Pilih Gambar
                      </button>
                      {prodImageUrl && (
                        <button type="button" onClick={() => setProdImageUrl('')}
                          style={{ marginLeft: '8px', background: 'none', border: 'none', color: '#f43f5e', fontSize: '0.75rem', cursor: 'pointer', fontWeight: '700' }}>Hapus</button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* ══════════════════════════════════
                  SECTION 2 — VARIAN MENU
                  ══════════════════════════════════ */}
              <div style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '12px', padding: '18px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <div>
                    <div style={{ fontSize: '0.78rem', fontWeight: '900', color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>② Varian Menu</div>
                    <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px' }}>Opsional. Tiap varian punya harga sendiri per outlet di bawah.</div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
                  <input
                    type="text"
                    placeholder="Ketik nama varian, lalu Enter atau klik + Tambah"
                    value={tempVariantInput}
                    onChange={e => setTempVariantInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddVariant(); } }}
                    style={{ flex: 1, padding: '8px 12px', borderRadius: '8px', border: '1px solid #334155', background: '#1e293b', color: '#f8fafc', fontSize: '0.82rem' }}
                  />
                  <button type="button" onClick={handleAddVariant}
                    style={{ background: '#1e40af', border: 'none', color: '#fff', padding: '8px 14px', borderRadius: '8px', fontSize: '0.78rem', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' }}>
                    <Plus size={14} /> Tambah
                  </button>
                </div>

                {prodVariants.length === 0 ? (
                  <div style={{ padding: '10px 14px', background: '#1e293b', borderRadius: '8px', border: '1px dashed #334155', color: '#475569', fontSize: '0.75rem', textAlign: 'center' }}>
                    Belum ada varian — harga tunggal per outlet.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {prodVariants.map((v, i) => (
                      <span key={i} style={{ background: 'rgba(56,189,248,0.12)', border: '1px solid rgba(56,189,248,0.3)', color: '#38bdf8', padding: '4px 12px', borderRadius: '20px', fontSize: '0.78rem', fontWeight: '700', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        {v}
                        <button type="button" onClick={() => handleRemoveVariant(v)}
                          style={{ background: 'none', border: 'none', color: '#f43f5e', cursor: 'pointer', padding: 0, display: 'flex' }}>
                          <X size={13} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* ══════════════════════════════════
                  SECTION 3 — OUTLET & HARGA
                  ══════════════════════════════════ */}
              <div style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '12px', padding: '18px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
                  <div>
                    <div style={{ fontSize: '0.78rem', fontWeight: '900', color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>③ Outlet & Harga</div>
                    <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px' }}>Pilih outlet → isi harga {prodVariants.length > 0 ? 'per varian' : 'tunggal'} → set APK status.</div>
                  </div>

                  {/* Pilih Outlet Dropdown */}
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <select value={tempOutletSelectId} onChange={e => setTempOutletSelectId(e.target.value)}
                      style={{ background: '#1e293b', border: '1px solid #334155', color: '#cbd5e1', padding: '7px 10px', borderRadius: '8px', fontSize: '0.78rem', fontWeight: '700', minWidth: '160px' }}>
                      <option value="">— Pilih Outlet —</option>
                      {(masterData.outlets || [])
                        .filter(o => !outletRows.some(r => r.outletId === Number(o.id)))
                        .map(o => (
                          <option key={o.id} value={o.id}>{o.name}</option>
                        ))}
                    </select>
                    <button type="button" onClick={handleAddOutletRow}
                      style={{ background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)', border: 'none', color: '#fff', padding: '7px 14px', borderRadius: '8px', fontSize: '0.78rem', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' }}>
                      <Plus size={14} /> Tambah Outlet
                    </button>
                  </div>
                </div>

                {/* Daftar Outlet Cards */}
                {outletRows.length === 0 ? (
                  <div style={{ padding: '16px', background: '#1e293b', borderRadius: '10px', border: '1px dashed #334155', color: '#475569', fontSize: '0.78rem', textAlign: 'center' }}>
                    Belum ada outlet ditambahkan. Pilih outlet di atas lalu klik "+ Tambah Outlet".
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {outletRows.map(row => {
                      const outObj = (masterData.outlets || []).find(o => Number(o.id) === row.outletId) || { name: `Outlet #${row.outletId}` };
                      return (
                        <div key={row.outletId} style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', overflow: 'hidden' }}>
                          {/* Card Header */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'rgba(56,189,248,0.07)', borderBottom: '1px solid #334155' }}>
                            <span style={{ fontSize: '0.82rem', fontWeight: '900', color: '#38bdf8' }}>🏢 {outObj.name}</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              {/* APK Status Toggle */}
                              <select
                                value={row.apkStatus}
                                onChange={e => handleUpdateOutletApkStatus(row.outletId, e.target.value)}
                                style={{
                                  background: row.apkStatus === 'Inaktif' ? 'rgba(244,63,94,0.15)' : 'rgba(52,211,153,0.12)',
                                  border: `1px solid ${row.apkStatus === 'Inaktif' ? '#f43f5e' : '#10b981'}`,
                                  color: row.apkStatus === 'Inaktif' ? '#f43f5e' : '#34d399',
                                  padding: '4px 8px', borderRadius: '6px', fontSize: '0.72rem', fontWeight: '800', cursor: 'pointer'
                                }}
                              >
                                <option value="Aktif" style={{ background: '#1e293b', color: '#34d399' }}>🟢 Tampil di POS</option>
                                <option value="Inaktif" style={{ background: '#1e293b', color: '#f43f5e' }}>🔴 Sembunyikan</option>
                              </select>
                              {/* Hapus Outlet */}
                              <button type="button" onClick={() => handleRemoveOutletRow(row.outletId)}
                                style={{ background: 'none', border: 'none', color: '#f43f5e', cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center' }}>
                                <X size={15} />
                              </button>
                            </div>
                          </div>

                          {/* Card Body: Harga */}
                          <div style={{ padding: '12px 14px' }}>
                            {prodVariants.length === 0 ? (
                              // Tanpa varian: input harga tunggal
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ fontSize: '0.85rem', color: '#34d399', fontWeight: '900', flexShrink: 0 }}>Rp</span>
                                <input
                                  type="number" min="0" step="500"
                                  placeholder="Masukkan harga jual..."
                                  value={row.basePrice || ''}
                                  onChange={e => handleUpdateOutletBasePrice(row.outletId, e.target.value)}
                                  style={{ flex: 1, padding: '8px 12px', borderRadius: '8px', border: '1px solid #334155', background: '#0f172a', color: '#34d399', fontWeight: '900', fontSize: '0.9rem' }}
                                />
                              </div>
                            ) : (
                              // Dengan varian: satu row input per varian
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {prodVariants.map(vName => (
                                  <div key={vName} style={{ display: 'grid', gridTemplateColumns: '130px 1fr', alignItems: 'center', gap: '10px' }}>
                                    <div style={{ fontSize: '0.78rem', fontWeight: '800', color: '#a78bfa', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                      <span style={{ fontSize: '0.9rem' }}>🏷️</span> {vName}
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                      <span style={{ fontSize: '0.82rem', color: '#34d399', fontWeight: '900', flexShrink: 0 }}>Rp</span>
                                      <input
                                        type="number" min="0" step="500"
                                        placeholder="Harga varian ini..."
                                        value={row.variantPrices?.[vName] || ''}
                                        onChange={e => handleUpdateOutletVariantPrice(row.outletId, vName, e.target.value)}
                                        style={{ flex: 1, padding: '7px 10px', borderRadius: '7px', border: '1px solid #334155', background: '#0f172a', color: '#34d399', fontWeight: '900', fontSize: '0.85rem' }}
                                      />
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* ══════════════════════════════════
                  SECTION 4 — KOMPOSISI HPP
                  ══════════════════════════════════ */}
              <div style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '12px', padding: '18px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <div>
                    <div style={{ fontSize: '0.78rem', fontWeight: '900', color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>④ Komposisi HPP</div>
                    <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px' }}>Opsional. Untuk estimasi Harga Pokok Produksi dan pengurangan stok bahan baku.</div>
                  </div>
                  <button type="button" onClick={handleAddCompositionRow}
                    style={{ background: '#1e293b', border: '1px solid #334155', color: '#cbd5e1', padding: '6px 12px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' }}>
                    <Plus size={13} /> Tambah Bahan
                  </button>
                </div>

                {compositions.length === 0 ? (
                  <div style={{ padding: '10px 14px', background: '#1e293b', borderRadius: '8px', border: '1px dashed #334155', color: '#475569', fontSize: '0.75rem', textAlign: 'center' }}>
                    Belum ada bahan HPP. Klik "+ Tambah Bahan" di atas.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 36px', gap: '8px', fontSize: '0.7rem', color: '#64748b', fontWeight: '700', paddingLeft: '4px' }}>
                      <span>Bahan Baku</span><span>Qty</span><span>Satuan</span><span></span>
                    </div>
                    {compositions.map(comp => (
                      <div key={comp.id} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 36px', gap: '8px', alignItems: 'center' }}>
                        <select value={comp.ingredient_id} onChange={e => handleUpdateComposition(comp.id, 'ingredient_id', e.target.value)}
                          style={{ width: '100%', padding: '7px 10px', borderRadius: '7px', border: '1px solid #334155', background: '#1e293b', color: '#f8fafc', fontSize: '0.8rem' }}>
                          {masterData.ingredients.length === 0
                            ? <option value="">— Belum ada bahan baku —</option>
                            : masterData.ingredients.map(ing => <option key={ing.id} value={ing.id}>{ing.name}</option>)
                          }
                        </select>
                        <input type="number" step="0.01" placeholder="0" value={comp.qty}
                          onChange={e => handleUpdateComposition(comp.id, 'qty', e.target.value)}
                          style={{ width: '100%', padding: '7px 8px', borderRadius: '7px', border: '1px solid #334155', background: '#1e293b', color: '#f8fafc', fontSize: '0.8rem' }} />
                        <select value={comp.unit || (masterData.units?.[0]?.symbol || 'Gram')} onChange={e => handleUpdateComposition(comp.id, 'unit', e.target.value)}
                          style={{ width: '100%', padding: '7px 8px', borderRadius: '7px', border: '1px solid #334155', background: '#1e293b', color: '#f8fafc', fontSize: '0.8rem' }}>
                          {(masterData.units && masterData.units.length > 0 ? masterData.units : [
                            { id: 1, name: 'Kilogram', symbol: 'kg' }, { id: 2, name: 'Gram', symbol: 'Gram' },
                            { id: 3, name: 'Liter', symbol: 'Liter' }, { id: 4, name: 'Milliliter', symbol: 'ml' },
                            { id: 5, name: 'Porsi', symbol: 'Porsi' }, { id: 6, name: 'Pcs', symbol: 'pcs' },
                          ]).map(u => <option key={u.id} value={u.symbol || u.name}>{u.symbol || u.name} ({u.name})</option>)}
                        </select>
                        <button type="button" onClick={() => handleRemoveComposition(comp.id)}
                          style={{ background: 'none', border: 'none', color: '#f43f5e', cursor: 'pointer', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Trash2 size={15} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* ── FOOTER ACTIONS ── */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', paddingTop: '4px', borderTop: '1px solid rgba(255,255,255,0.07)', marginTop: '4px' }}>
                <button type="button" onClick={() => setShowFormModal(false)}
                  style={{ background: '#334155', color: '#cbd5e1', border: 'none', padding: '9px 20px', borderRadius: '9px', fontSize: '0.82rem', fontWeight: '700', cursor: 'pointer' }}>
                  Batal
                </button>
                <button type="submit"
                  style={{ background: 'linear-gradient(135deg, #0f766e 0%, #0d9488 100%)', color: '#fff', border: 'none', padding: '9px 24px', borderRadius: '9px', fontSize: '0.82rem', fontWeight: '900', cursor: 'pointer', boxShadow: '0 4px 14px rgba(15,118,110,0.4)', display: 'inline-flex', alignItems: 'center', gap: '7px' }}>
                  <CheckCircle2 size={15} />
                  {editingProductId ? 'Simpan Perubahan' : 'Simpan Menu'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* Preview modal dihapus — form menyimpan langsung (1-step) */}

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
