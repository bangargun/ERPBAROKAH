import React, { useState, useMemo } from 'react';
import {
  FileSpreadsheet,
  Upload,
  CheckCircle2,
  AlertCircle,
  X,
  ArrowRight,
  ArrowLeft,
  RefreshCw,
  Sparkles,
  Search,
  Building2,
  DollarSign,
  Calendar,
  Layers,
  ShoppingBasket,
  HelpCircle,
  Truck,
  Check,
  Package
} from 'lucide-react';
import { getThemePalette } from '../../utils/themeUtils';

export default function ExpenseImportReconciliationModal({
  isOpen,
  onClose,
  masterData,
  setMasterData,
  themeMode = 'dark',
  onSuccess
}) {
  if (!isOpen) return null;

  const T = getThemePalette(themeMode);
  const isLight = themeMode === 'light';

  // Wizard Step: 1 (Upload), 2 (Review), 3 (Reconciliation/Correction), 4 (Confirmation)
  const [step, setStep] = useState(1);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Parsed Data from Backend
  const [parsedData, setParsedData] = useState(null);

  // Mapping State: { [rawItemName]: "Mapped Master Ingredient / Expense Category" }
  const [itemMapping, setItemMapping] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [increaseStock, setIncreaseStock] = useState(true);
  const [selectedOutletOverride, setSelectedOutletOverride] = useState('');

  // Master Ingredients & Expense Categories
  const masterIngredients = useMemo(() => {
    return masterData?.ingredients || [];
  }, [masterData]);

  const expenseCategories = useMemo(() => {
    return masterData?.expenseCategories || [
      'Pembelian Bahan Baku (HPP)',
      'Bahan Tambahan & Bumbu',
      'Gas LPG & Bahan Bakar',
      'Kemasan & Plastik (Packaging)',
      'Listrik, Air & Utilitas',
      'Gaji & Upah Karyawan',
      'Biaya Operasional Lainnya',
      'Perbaikan & Pemeliharaan'
    ];
  }, [masterData]);

  // Master options for dropdown
  const selectableOptions = useMemo(() => {
    const list = [];
    // Ingredients
    masterIngredients.forEach(ing => {
      list.push({
        key: `ing_${ing.id}`,
        value: ing.name,
        label: `🥩 ${ing.name} (Bahan Baku - ${ing.unit || 'Satuan'})`,
        type: 'ingredient'
      });
    });
    return list;
  }, [masterIngredients]);

  // Intelligent Matcher for Ingredients & Expense Categories
  const findBestItemMatch = (rawName) => {
    if (!rawName) return null;
    const rawUpper = rawName.toUpperCase().trim();

    // 1. Exact match with Master Ingredient
    const exactIng = masterIngredients.find(i => (i.name || '').toUpperCase().trim() === rawUpper);
    if (exactIng) return exactIng.name;

    // 2. Fuzzy match with Master Ingredient
    const fuzzyIng = masterIngredients.find(i => {
      const iUpper = (i.name || '').toUpperCase().trim();
      return iUpper.includes(rawUpper) || rawUpper.includes(iUpper);
    });
    if (fuzzyIng) return fuzzyIng.name;

    // 3. Match with Expense Categories
    const foundCat = expenseCategories.find(c => {
      const cUpper = c.toUpperCase().trim();
      return cUpper.includes(rawUpper) || rawUpper.includes(cUpper);
    });
    if (foundCat) return foundCat;

    return null;
  };

  // Quick Ingredient Creation State
  const [quickCreateData, setQuickCreateData] = useState(null);
  const [isSavingNewIngredient, setIsSavingNewIngredient] = useState(false);

  // Handle Quick Create Ingredient
  const handleSaveQuickIngredient = async () => {
    if (!quickCreateData || !quickCreateData.name?.trim()) return;
    setIsSavingNewIngredient(true);
    try {
      const nowTs = Date.now();
      const cleanName = quickCreateData.name.trim().toUpperCase();

      const newIngredient = {
        id: nowTs,
        code: quickCreateData.code || `ING-${String(nowTs).slice(-6)}`,
        sku: quickCreateData.code || `ING-${String(nowTs).slice(-6)}`,
        name: cleanName,
        category: quickCreateData.category || 'Bahan Pokok',
        unit: quickCreateData.unit || 'Kg',
        cost_per_unit: Number(quickCreateData.cost || 0),
        price: Number(quickCreateData.cost || 0),
        current_stock: Number(quickCreateData.initialStock || 0),
        min_stock: Number(quickCreateData.minStock || 5),
        status: 'Aktif',
        needs_review: true,
        status_katalog: 'perlu_diedit',
        notes: 'Dibuat otomatis dari Impor Dokumen Pengeluaran (Perlu Dilengkapi)',
        _updatedAt: nowTs,
        _lastMutated: nowTs
      };

      const nextIngredients = [...(masterData?.ingredients || []), newIngredient];
      const nextMaster = {
        ...masterData,
        ingredients: nextIngredients,
        _lastUpdated: nowTs,
        _lastMutated: nowTs
      };

      if (setMasterData) setMasterData(nextMaster);
      try {
        localStorage.setItem('mris_master_data', JSON.stringify(nextMaster));
      } catch (e) {}

      const getApiUrl = (endpoint) => {
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
          return `http://localhost:5001${endpoint}`;
        }
        return `https://mris-admin.barokahgroupindonesia.tech${endpoint}`;
      };

      await fetch(getApiUrl('/api/master-data'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nextMaster)
      });

      setItemMapping(prev => ({
        ...prev,
        [quickCreateData.rawName]: cleanName
      }));

      setQuickCreateData(null);
    } catch (err) {
      alert('Gagal menyimpan bahan baku baru: ' + err.message);
    } finally {
      setIsSavingNewIngredient(false);
    }
  };

  const getApiUrl = (endpoint) => {
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return `http://localhost:5001${endpoint}`;
    }
    return `https://mris-admin.barokahgroupindonesia.tech${endpoint}`;
  };

  // Handle File Selection
  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    setErrorMessage('');
    await processUploadedFile(file);
  };

  const processUploadedFile = async (file) => {
    setIsProcessing(true);
    setErrorMessage('');

    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64Data = reader.result;
        try {
          const res = await fetch(getApiUrl('/api/expenses/parse-import-file'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              fileName: file.name,
              fileData: base64Data
            })
          });

          const json = await res.json();
          if (!res.ok || !json.success) {
            throw new Error(json.error || 'Gagal membaca isi dokumen pengeluaran');
          }

          setParsedData(json);

          // Auto-mapping
          const initialMapping = {};
          const rawItems = json.uniqueRawItems || [];
          rawItems.forEach(raw => {
            const matched = findBestItemMatch(raw);
            if (matched) {
              initialMapping[raw] = matched;
            } else {
              initialMapping[raw] = '__KEEP_ORIGINAL__';
            }
          });

          setItemMapping(initialMapping);
          setStep(2); // Go to Review
        } catch (err) {
          setErrorMessage(err.message || 'Terjadi kesalahan saat memproses file pengeluaran di server');
        } finally {
          setIsProcessing(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (err) {
      setErrorMessage(err.message || 'Gagal membaca file');
      setIsProcessing(false);
    }
  };

  // Refresh Master Data from Server
  const [isRefreshingMasterData, setIsRefreshingMasterData] = useState(false);
  const handleRefreshMasterData = async () => {
    setIsRefreshingMasterData(true);
    try {
      const res = await fetch(getApiUrl('/api/master-data'));
      if (!res.ok) throw new Error('Gagal mengambil data master terbaru');
      const freshData = await res.json();
      if (setMasterData) setMasterData(freshData);
      try {
        localStorage.setItem('mris_master_data', JSON.stringify(freshData));
      } catch (e) {}

      if (parsedData?.uniqueRawItems) {
        const newMapping = { ...itemMapping };
        parsedData.uniqueRawItems.forEach(raw => {
          const matched = findBestItemMatch(raw);
          if (matched) newMapping[raw] = matched;
        });
        setItemMapping(newMapping);
      }
    } catch (err) {
      console.error('Refresh master data error:', err);
    } finally {
      setIsRefreshingMasterData(false);
    }
  };

  const handleAutoMatchAll = () => {
    if (!parsedData?.uniqueRawItems) return;
    const newMapping = { ...itemMapping };
    parsedData.uniqueRawItems.forEach(raw => {
      const matched = findBestItemMatch(raw);
      if (matched) newMapping[raw] = matched;
    });
    setItemMapping(newMapping);
  };

  const handleResetToOriginal = () => {
    if (!parsedData?.uniqueRawItems) return;
    const newMapping = {};
    parsedData.uniqueRawItems.forEach(raw => {
      newMapping[raw] = '__KEEP_ORIGINAL__';
    });
    setItemMapping(newMapping);
  };

  // Filter raw items by search query
  const filteredRawItems = useMemo(() => {
    if (!parsedData?.uniqueRawItems) return [];
    if (!searchQuery.trim()) return parsedData.uniqueRawItems;
    return parsedData.uniqueRawItems.filter(item =>
      item.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [parsedData, searchQuery]);

  // Execute Import
  const handleExecuteImport = async () => {
    if (!parsedData || !parsedData.expenses) return;
    setIsProcessing(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const res = await fetch(getApiUrl('/api/expenses/execute-import-batch'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          expenses: parsedData.expenses,
          itemMapping,
          increaseStock,
          defaultOutletId: selectedOutletOverride || null
        })
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Gagal menyimpan pengeluaran ke database');
      }

      setSuccessMessage(`Berhasil menyimpan ${json.count || parsedData.totalCount} pengeluaran (Total Rp ${(json.totalAmount || parsedData.totalExpense).toLocaleString('id-ID')})!`);
      if (onSuccess) onSuccess(json);

      setTimeout(() => {
        onClose();
        window.location.reload();
      }, 1500);
    } catch (err) {
      setErrorMessage(err.message || 'Gagal mengeksekusi impor pengeluaran');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 9999,
      background: 'rgba(0, 0, 0, 0.78)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      <div style={{
        background: isLight ? '#ffffff' : '#0f172a',
        border: `1px solid ${T.borderStrong}`,
        borderRadius: '20px',
        width: '100%',
        maxWidth: '1000px',
        maxHeight: '92vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8)',
        overflow: 'hidden'
      }}>
        {/* MODAL HEADER */}
        <div style={{
          padding: '18px 24px',
          borderBottom: `1px solid ${T.border}`,
          background: isLight ? '#f8fafc' : '#1e293b',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              boxShadow: '0 4px 12px rgba(239, 68, 68, 0.35)'
            }}>
              <ShoppingBasket size={22} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: '900', color: T.txtPrimary, margin: 0 }}>
                Impor Dokumen Pengeluaran & Pembelian Bahan (PDF / Excel)
              </h3>
              <p style={{ fontSize: '0.74rem', color: T.txtMuted, margin: '2px 0 0 0' }}>
                Review statistik, rekonsiliasi bahan baku & akun biaya, serta sinkronisasi otomatis ke Laporan Keuangan
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: T.txtMuted, cursor: 'pointer', padding: '4px' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* STEP PROGRESS TRACKER */}
        <div style={{
          display: 'flex',
          background: isLight ? '#f1f5f9' : '#090d16',
          borderBottom: `1px solid ${T.border}`,
          padding: '8px 24px',
          gap: '8px'
        }}>
          {[
            { num: 1, title: 'Upload File' },
            { num: 2, title: 'Papan Review Pengeluaran' },
            { num: 3, title: 'Papan Koreksi Bahan & Biaya' },
            { num: 4, title: 'Konfirmasi & Simpan' }
          ].map(s => {
            const isActive = step === s.num;
            const isDone = step > s.num;
            return (
              <div
                key={s.num}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '6px 12px',
                  borderRadius: '8px',
                  background: isActive ? (isLight ? '#ffffff' : '#ef4444') : 'transparent',
                  color: isActive ? (isLight ? '#0f172a' : '#ffffff') : isDone ? '#10b981' : T.txtMuted,
                  fontWeight: isActive || isDone ? '800' : '600',
                  fontSize: '0.76rem',
                  boxShadow: isActive ? '0 2px 8px rgba(0,0,0,0.15)' : 'none',
                  transition: 'all 0.2s ease'
                }}
              >
                <div style={{
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  background: isDone ? '#10b981' : isActive ? (isLight ? '#ef4444' : '#ffffff') : T.border,
                  color: isDone ? '#ffffff' : isActive ? (isLight ? '#ffffff' : '#000000') : T.txtMuted,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.70rem',
                  fontWeight: '900'
                }}>
                  {isDone ? '✓' : s.num}
                </div>
                <span>{s.title}</span>
              </div>
            );
          })}
        </div>

        {/* ALERTS */}
        {errorMessage && (
          <div style={{ margin: '12px 24px 0 24px', padding: '12px 16px', background: 'rgba(239, 68, 68, 0.2)', border: '1px solid #ef4444', borderRadius: '8px', color: '#f87171', fontSize: '0.86rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <AlertCircle size={20} />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div style={{ margin: '12px 24px 0 24px', padding: '12px 16px', background: 'rgba(16, 185, 129, 0.2)', border: '1px solid #10b981', borderRadius: '8px', color: '#34d399', fontSize: '0.86rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <CheckCircle2 size={20} />
            <span>{successMessage}</span>
          </div>
        )}

        {/* BODY PER STEP */}
        <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1 }}>
          
          {/* STEP 1: UPLOAD */}
          {step === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '30px 10px', textAlign: 'center' }}>
              <div
                style={{
                  border: '2px dashed #ef4444',
                  borderRadius: '16px',
                  padding: '40px 30px',
                  width: '100%',
                  maxWidth: '650px',
                  background: isLight ? 'rgba(239, 68, 68, 0.05)' : 'rgba(239, 68, 68, 0.03)',
                  cursor: isProcessing ? 'wait' : 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '16px',
                  transition: 'all 0.2s ease'
                }}
                onClick={() => !isProcessing && document.getElementById('expense-file-upload-input').click()}
              >
                <input
                  id="expense-file-upload-input"
                  type="file"
                  accept=".pdf,.xlsx,.xls"
                  style={{ display: 'none' }}
                  onChange={handleFileChange}
                  disabled={isProcessing}
                />

                <div style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.2), rgba(185, 28, 28, 0.3))',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ef4444'
                }}>
                  {isProcessing ? (
                    <RefreshCw size={32} style={{ animation: 'spin 1s linear infinite' }} />
                  ) : (
                    <Upload size={32} />
                  )}
                </div>

                <div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: '800', margin: '0 0 6px 0', color: T.txtPrimary }}>
                    {isProcessing ? 'Sedang Membaca & Mengekstrak Dokumen Pengeluaran...' : 'Pilih atau Drag & Drop Dokumen Pengeluaran / Nota Pembelian'}
                  </h3>
                  <p style={{ fontSize: '0.82rem', color: T.txtMuted, margin: 0 }}>
                    Mendukung file <strong>PDF Rekap Kas Keluar / Nota Pasar</strong> atau file <strong>Excel (.xlsx / .xls)</strong>
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: REVIEW */}
          {step === 2 && parsedData && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                <div style={{ padding: '14px', borderRadius: '12px', background: T.cardBg2, border: `1px solid ${T.border}` }}>
                  <div style={{ fontSize: '0.70rem', color: T.txtMuted, fontWeight: '800' }}>TOTAL PENGELUARAN DOKUMEN</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: '900', color: '#ef4444', marginTop: '4px' }}>
                    Rp {parsedData.totalExpense?.toLocaleString('id-ID')}
                  </div>
                </div>

                <div style={{ padding: '14px', borderRadius: '12px', background: T.cardBg2, border: `1px solid ${T.border}` }}>
                  <div style={{ fontSize: '0.70rem', color: T.txtMuted, fontWeight: '800' }}>JUMLAH NOTA / BARIS BIAYA</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: '900', color: T.txtPrimary, marginTop: '4px' }}>
                    {parsedData.totalCount?.toLocaleString('id-ID')} Nota
                  </div>
                </div>

                <div style={{ padding: '14px', borderRadius: '12px', background: T.cardBg2, border: `1px solid ${T.border}` }}>
                  <div style={{ fontSize: '0.70rem', color: T.txtMuted, fontWeight: '800' }}>PERIODE TANGGAL</div>
                  <div style={{ fontSize: '0.88rem', fontWeight: '800', color: '#38bdf8', marginTop: '6px' }}>
                    {parsedData.dateStart || '01/08/2026'} s/d {parsedData.dateEnd || '13/08/2026'}
                  </div>
                </div>

                <div style={{ padding: '14px', borderRadius: '12px', background: T.cardBg2, border: `1px solid ${T.border}` }}>
                  <div style={{ fontSize: '0.70rem', color: T.txtMuted, fontWeight: '800' }}>ITEM BAHAN / BIAYA UNIK</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: '900', color: '#f59e0b', marginTop: '4px' }}>
                    {parsedData.uniqueRawItems?.length || 0} Macam
                  </div>
                </div>
              </div>

              {/* Sample 10 items */}
              <div>
                <h4 style={{ fontSize: '0.88rem', fontWeight: '800', color: T.txtPrimary, margin: '0 0 8px 0' }}>
                  Sampel 10 Baris Pengeluaran Terbaca:
                </h4>
                <div style={{ border: `1px solid ${T.border}`, borderRadius: '10px', overflow: 'hidden', maxHeight: '220px', overflowY: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem', textAlign: 'left' }}>
                    <thead style={{ background: T.cardBg2, color: T.txtSecondary, position: 'sticky', top: 0 }}>
                      <tr>
                        <th style={{ padding: '8px 12px' }}>No</th>
                        <th style={{ padding: '8px 12px' }}>Tanggal</th>
                        <th style={{ padding: '8px 12px' }}>Supplier / Toko</th>
                        <th style={{ padding: '8px 12px' }}>Item Pengeluaran</th>
                        <th style={{ padding: '8px 12px', textAlign: 'right' }}>Nominal (Rp)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(parsedData.expenses || []).slice(0, 10).map((e, idx) => (
                        <tr key={idx} style={{ borderTop: `1px solid ${T.border}` }}>
                          <td style={{ padding: '8px 12px', color: T.txtMuted }}>{idx + 1}</td>
                          <td style={{ padding: '8px 12px', fontWeight: '700', color: '#38bdf8' }}>{e.date}</td>
                          <td style={{ padding: '8px 12px' }}>{e.supplier_name}</td>
                          <td style={{ padding: '8px 12px', fontWeight: '700' }}>{e.raw_item}</td>
                          <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: '800', color: '#ef4444' }}>
                            Rp {e.amount?.toLocaleString('id-ID')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: RECONCILIATION */}
          {step === 3 && parsedData && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '12px',
                padding: '12px 16px',
                background: T.cardBg2,
                border: `1px solid ${T.border}`,
                borderRadius: '10px'
              }}>
                <div>
                  <h4 style={{ fontSize: '0.94rem', fontWeight: '900', margin: '0 0 2px 0', color: '#ef4444' }}>
                    Papan Koreksi Bahan Baku & Akun Biaya ({parsedData.uniqueRawItems?.length || 0} Item)
                  </h4>
                  <p style={{ fontSize: '0.74rem', color: T.txtMuted, margin: 0 }}>
                    Petakan item pengeluaran ke <strong>Bahan Baku Gudang</strong> atau <strong>Akun Biaya Operasional</strong>
                  </p>
                </div>

                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <button
                    onClick={handleRefreshMasterData}
                    disabled={isRefreshingMasterData}
                    type="button"
                    style={{
                      padding: '6px 14px',
                      background: 'rgba(56, 189, 248, 0.15)',
                      border: '1px solid #38bdf8',
                      color: '#38bdf8',
                      borderRadius: '8px',
                      fontSize: '0.76rem',
                      fontWeight: '800',
                      cursor: isRefreshingMasterData ? 'wait' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                    title="Muat ulang bahan baku master dari database"
                  >
                    <RefreshCw size={14} style={{ animation: isRefreshingMasterData ? 'spin 1s linear infinite' : 'none' }} />
                    <span>{isRefreshingMasterData ? 'Memuat...' : 'Refresh Bahan Baku Master'}</span>
                  </button>

                  <button
                    onClick={handleAutoMatchAll}
                    type="button"
                    style={{
                      padding: '6px 12px',
                      background: 'rgba(239, 68, 68, 0.15)',
                      border: '1px solid #ef4444',
                      color: '#ef4444',
                      borderRadius: '8px',
                      fontSize: '0.76rem',
                      fontWeight: '800',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <Sparkles size={14} />
                    <span>Auto-Match Pintar</span>
                  </button>

                  <button
                    onClick={handleResetToOriginal}
                    type="button"
                    style={{
                      padding: '6px 12px',
                      background: 'rgba(100, 116, 139, 0.15)',
                      border: '1px solid #64748b',
                      color: T.txtSecondary,
                      borderRadius: '8px',
                      fontSize: '0.76rem',
                      fontWeight: '700',
                      cursor: 'pointer'
                    }}
                  >
                    Gunakan Semua Nama Asli
                  </button>
                </div>
              </div>

              {/* Search */}
              <div style={{ position: 'relative' }}>
                <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: T.txtMuted }} />
                <input
                  type="text"
                  placeholder="Cari nama item pengeluaran..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px 8px 36px',
                    borderRadius: '8px',
                    border: `1px solid ${T.border}`,
                    background: isLight ? '#fff' : '#0b1120',
                    color: T.txtPrimary,
                    fontSize: '0.82rem'
                  }}
                />
              </div>

              {/* Mapping Table */}
              <div style={{
                border: `1px solid ${T.border}`,
                borderRadius: '10px',
                overflow: 'hidden',
                maxHeight: '380px',
                overflowY: 'auto'
              }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.80rem', textAlign: 'left' }}>
                  <thead style={{ background: T.cardBg2, color: T.txtSecondary, position: 'sticky', top: 0, zIndex: 2 }}>
                    <tr>
                      <th style={{ padding: '10px 14px', width: '40px' }}>No</th>
                      <th style={{ padding: '10px 14px', width: '45%' }}>📜 Nama Item Dokumen Asli</th>
                      <th style={{ padding: '10px 14px' }}>🔄 Ganti dengan Bahan Baku / Akun Biaya</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRawItems.map((rawName, idx) => {
                      const currentMapped = itemMapping[rawName] || '__KEEP_ORIGINAL__';
                      const isMapped = currentMapped !== '__KEEP_ORIGINAL__';

                      return (
                        <tr key={rawName} style={{ borderTop: `1px solid ${T.border}`, background: idx % 2 === 0 ? 'transparent' : (isLight ? 'rgba(0,0,0,0.02)' : 'rgba(255,255,255,0.02)') }}>
                          <td style={{ padding: '10px 14px', color: T.txtMuted }}>{idx + 1}</td>
                          <td style={{ padding: '10px 14px', fontWeight: '700', color: T.txtPrimary }}>
                            {rawName}
                          </td>
                          <td style={{ padding: '10px 14px' }}>
                            <select
                              value={currentMapped}
                              onChange={(e) => {
                                const val = e.target.value;
                                if (val === '__CREATE_NEW_INGREDIENT__') {
                                  setQuickCreateData({
                                    rawName,
                                    code: `ING-${Math.floor(100000 + Math.random() * 900000)}`,
                                    name: rawName,
                                    category: 'Bahan Pokok',
                                    unit: 'Kg',
                                    cost: 25000,
                                    initialStock: 10,
                                    minStock: 5,
                                    activeSubTab: 'info'
                                  });
                                } else {
                                  setItemMapping(prev => ({
                                    ...prev,
                                    [rawName]: val
                                  }));
                                }
                              }}
                              style={{
                                width: '100%',
                                padding: '8px 12px',
                                borderRadius: '8px',
                                border: isMapped ? '1px solid #10b981' : '1px solid #64748b',
                                background: isMapped ? (isLight ? '#ecfdf5' : '#064e3b') : (isLight ? '#f8fafc' : '#1e293b'),
                                color: isMapped ? (isLight ? '#065f46' : '#a7f3d0') : T.txtPrimary,
                                fontWeight: isMapped ? '800' : '600',
                                fontSize: '0.80rem',
                                cursor: 'pointer'
                              }}
                            >
                              <option value="__KEEP_ORIGINAL__">
                                🔒 [ Tetap Sama / Gunakan Nama Asli: {rawName} ]
                              </option>
                              <option value="__CREATE_NEW_INGREDIENT__" style={{ fontWeight: '900', color: '#ef4444' }}>
                                ➕ [ Buat Bahan Baku Master Baru: "{rawName}" ]
                              </option>
                              <optgroup label="─── Pilihan Bahan Baku Master (Inventory) ───">
                                {selectableOptions.map(opt => (
                                  <option key={opt.key} value={opt.value}>
                                    {opt.label}
                                  </option>
                                ))}
                              </optgroup>
                              <optgroup label="─── Pilihan Akun Biaya Operasional ───">
                                {expenseCategories.map(cat => (
                                  <option key={cat} value={cat}>
                                    📑 Biaya: {cat}
                                  </option>
                                ))}
                              </optgroup>
                            </select>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* STEP 4: CONFIRMATION */}
          {step === 4 && parsedData && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ padding: '16px 20px', background: 'rgba(239, 68, 68, 0.08)', border: '1px solid #ef4444', borderRadius: '12px' }}>
                <h4 style={{ fontSize: '1rem', fontWeight: '900', margin: '0 0 6px 0', color: '#ef4444' }}>
                  Konfirmasi Akhir Penyimpanan Pengeluaran ke Database
                </h4>
                <p style={{ fontSize: '0.82rem', color: T.txtPrimary, margin: 0 }}>
                  Anda akan menyimpan <strong>{parsedData.totalCount} transaksi pengeluaran</strong> dengan total nominal <strong>Rp {parsedData.totalExpense?.toLocaleString('id-ID')}</strong> untuk periode <strong>{parsedData.dateStart} s/d {parsedData.dateEnd}</strong>.
                </p>
              </div>

              {/* Rincian Pengaruh */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <h4 style={{ fontSize: '0.90rem', fontWeight: '800', margin: 0, color: T.txtSecondary, textTransform: 'uppercase' }}>
                  Pengaruh Alur ke Modul Lain:
                </h4>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
                  <div style={{ padding: '14px', borderRadius: '10px', background: T.cardBg2, border: `1px solid ${T.border}` }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#10b981', fontWeight: '800', fontSize: '0.82rem', marginBottom: '6px' }}>
                      <CheckCircle2 size={16} />
                      <span>Laporan Laba Rugi (Beban & HPP)</span>
                    </div>
                    <p style={{ fontSize: '0.74rem', color: T.txtMuted, margin: 0 }}>
                      Seluruh nominal pengeluaran otomatis tercatat sebagai beban operasional & HPP pada periode terkait secara akurat.
                    </p>
                  </div>

                  <div style={{ padding: '14px', borderRadius: '10px', background: T.cardBg2, border: `1px solid ${T.border}` }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#38bdf8', fontWeight: '800', fontSize: '0.82rem', marginBottom: '6px' }}>
                      <CheckCircle2 size={16} />
                      <span>Arus Kas Keluar (Cash Outflow)</span>
                    </div>
                    <p style={{ fontSize: '0.74rem', color: T.txtMuted, margin: 0 }}>
                      Arus kas keluar akan mencerminkan total pengeluaran ini pada buku kas konsolidasi & cabang.
                    </p>
                  </div>
                </div>

                {/* Checkbox Options */}
                <div style={{ padding: '14px 18px', background: T.cardBg2, border: `1px solid ${T.border}`, borderRadius: '10px', marginTop: '6px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={increaseStock}
                      onChange={(e) => setIncreaseStock(e.target.checked)}
                      style={{ width: '18px', height: '18px', accentColor: '#10b981' }}
                    />
                    <div>
                      <span style={{ fontSize: '0.84rem', fontWeight: '800', color: T.txtPrimary }}>
                        Tambahkan Stok Bahan Baku Otomatis (Inventory Inflow)
                      </span>
                      <p style={{ fontSize: '0.72rem', color: T.txtMuted, margin: '2px 0 0 0' }}>
                        Centang opsi ini jika Anda ingin stok gudang bahan baku otomatis bertambah sesuai item yang dibeli pada dokumen.
                      </p>
                    </div>
                  </label>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* MODAL FOOTER */}
        <div style={{
          padding: '16px 24px',
          borderTop: `1px solid ${T.border}`,
          background: isLight ? '#f8fafc' : '#1e293b',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            {step > 1 && (
              <button
                type="button"
                onClick={() => setStep(step - 1)}
                disabled={isProcessing}
                style={{
                  padding: '9px 18px',
                  borderRadius: '8px',
                  border: `1px solid ${T.border}`,
                  background: 'transparent',
                  color: T.txtPrimary,
                  fontSize: '0.82rem',
                  fontWeight: '700',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <ArrowLeft size={16} />
                <span>Kembali</span>
              </button>
            )}
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={isProcessing}
              style={{
                padding: '9px 18px',
                borderRadius: '8px',
                border: `1px solid ${T.border}`,
                background: 'transparent',
                color: T.txtMuted,
                fontSize: '0.82rem',
                fontWeight: '700',
                cursor: 'pointer'
              }}
            >
              Tutup
            </button>

            {step < 4 ? (
              <button
                type="button"
                onClick={() => setStep(step + 1)}
                disabled={!parsedData || isProcessing}
                style={{
                  padding: '9px 22px',
                  borderRadius: '8px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)',
                  color: '#fff',
                  fontSize: '0.84rem',
                  fontWeight: '800',
                  cursor: !parsedData || isProcessing ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  opacity: !parsedData ? 0.5 : 1,
                  boxShadow: '0 4px 12px rgba(239, 68, 68, 0.35)'
                }}
              >
                <span>{step === 1 ? 'Lanjut ke Review' : step === 2 ? 'Lanjut ke Koreksi Bahan & Biaya' : 'Lanjut ke Konfirmasi'}</span>
                <ArrowRight size={16} />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleExecuteImport}
                disabled={isProcessing}
                style={{
                  padding: '11px 28px',
                  borderRadius: '8px',
                  border: 'none',
                  background: isProcessing ? '#64748b' : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  color: '#fff',
                  fontSize: '0.88rem',
                  fontWeight: '900',
                  cursor: isProcessing ? 'wait' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 16px rgba(16, 185, 129, 0.45)'
                }}
              >
                {isProcessing ? (
                  <>
                    <RefreshCw size={18} style={{ animation: 'spin 1s linear infinite' }} />
                    <span>Sedang Menyimpan ke Database...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={18} />
                    <span>SETUJUI & SIMPAN PENGELUARAN KE DATABASE</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>

      </div>

      {/* QUICK INGREDIENT CREATION MODAL */}
      {quickCreateData && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 10000,
          background: 'rgba(0, 0, 0, 0.80)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <div style={{
            background: isLight ? '#ffffff' : '#0f172a',
            border: `1px solid ${T.borderStrong}`,
            borderRadius: '16px',
            width: '100%',
            maxWidth: '620px',
            maxHeight: '88vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.75)',
            overflow: 'hidden'
          }}>
            <div style={{
              padding: '16px 20px',
              borderBottom: `1px solid ${T.border}`,
              background: isLight ? '#f8fafc' : '#1e293b',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  boxShadow: '0 4px 12px rgba(239, 68, 68, 0.35)'
                }}>
                  <ShoppingBasket size={20} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: '900', color: T.txtPrimary, margin: 0 }}>
                    Tambah Bahan Baku Baru
                  </h3>
                  <p style={{ fontSize: '0.70rem', color: T.txtMuted, margin: '2px 0 0 0' }}>
                    Daftarkan bahan baku ke inventori master dengan status <strong>Perlu Diedit</strong>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setQuickCreateData(null)}
                style={{ background: 'transparent', border: 'none', color: T.txtMuted, cursor: 'pointer', padding: '4px' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ padding: '20px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 2fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.74rem', fontWeight: '800', color: T.txtSecondary, display: 'block', marginBottom: '4px' }}>
                    Kode SKU / Bahan *
                  </label>
                  <input
                    type="text"
                    value={quickCreateData.code || ''}
                    onChange={(e) => setQuickCreateData(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: `1px solid ${T.border}`, background: isLight ? '#f8fafc' : '#1e293b', color: '#38bdf8', fontFamily: 'monospace', fontWeight: '800', fontSize: '0.82rem' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.74rem', fontWeight: '800', color: T.txtSecondary, display: 'block', marginBottom: '4px' }}>
                    Nama Bahan Baku *
                  </label>
                  <input
                    type="text"
                    value={quickCreateData.name || ''}
                    onChange={(e) => setQuickCreateData(prev => ({ ...prev, name: e.target.value.toUpperCase() }))}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: `1px solid ${T.border}`, background: isLight ? '#f8fafc' : '#1e293b', color: T.txtPrimary, fontWeight: '900', fontSize: '0.84rem' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.74rem', fontWeight: '800', color: T.txtSecondary, display: 'block', marginBottom: '4px' }}>
                    Kategori Bahan:
                  </label>
                  <select
                    value={quickCreateData.category || 'Bahan Pokok'}
                    onChange={(e) => setQuickCreateData(prev => ({ ...prev, category: e.target.value }))}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: `1px solid ${T.border}`, background: isLight ? '#f8fafc' : '#1e293b', color: T.txtPrimary, fontWeight: '700', fontSize: '0.80rem' }}
                  >
                    <option value="Bahan Pokok">Bahan Pokok (Daging/Ayam/Ikan)</option>
                    <option value="Bumbu & Rempah">Bumbu & Rempah</option>
                    <option value="Sayuran & Buah">Sayuran & Buah</option>
                    <option value="Minyak & Gas">Minyak & Gas</option>
                    <option value="Packaging & Plastik">Packaging & Kemasan</option>
                    <option value="Lainnya">Lainnya</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '0.74rem', fontWeight: '800', color: T.txtSecondary, display: 'block', marginBottom: '4px' }}>
                    Satuan Standar:
                  </label>
                  <select
                    value={quickCreateData.unit || 'Kg'}
                    onChange={(e) => setQuickCreateData(prev => ({ ...prev, unit: e.target.value }))}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: `1px solid ${T.border}`, background: isLight ? '#f8fafc' : '#1e293b', color: T.txtPrimary, fontWeight: '700', fontSize: '0.80rem' }}
                  >
                    <option value="Kg">Kilogram (Kg)</option>
                    <option value="Gram">Gram (g)</option>
                    <option value="Liter">Liter (L)</option>
                    <option value="Pcs">Pcs / Buah</option>
                    <option value="Ikat">Ikat</option>
                    <option value="Bungkus">Bungkus / Pack</option>
                    <option value="Tabung">Tabung (Gas)</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.74rem', fontWeight: '800', color: T.txtSecondary, display: 'block', marginBottom: '4px' }}>
                  Estimasi Harga Beli / Biaya Satuan (Rp):
                </label>
                <input
                  type="number"
                  value={quickCreateData.cost || 0}
                  onChange={(e) => setQuickCreateData(prev => ({ ...prev, cost: e.target.value }))}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: `1px solid ${T.border}`, background: isLight ? '#f8fafc' : '#1e293b', color: '#ef4444', fontSize: '1.05rem', fontWeight: '900' }}
                />
              </div>

              <div style={{
                padding: '10px 14px',
                background: 'rgba(239, 68, 68, 0.12)',
                border: '1px solid rgba(239, 68, 68, 0.35)',
                borderRadius: '8px',
                fontSize: '0.74rem',
                color: '#f87171',
                lineHeight: 1.4
              }}>
                ℹ️ Bahan baku baru ini akan otomatis ditandai dengan badge <strong>"Perlu Diedit / Dilengkapi"</strong> di menu Data Master Bahan Baku agar Anda dapat melengkapi supplier dan stok minimumnya nanti.
              </div>
            </div>

            <div style={{
              padding: '14px 20px',
              borderTop: `1px solid ${T.border}`,
              background: isLight ? '#f8fafc' : '#1e293b',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '8px'
            }}>
              <button
                type="button"
                onClick={() => setQuickCreateData(null)}
                disabled={isSavingNewIngredient}
                style={{ padding: '8px 16px', borderRadius: '8px', border: `1px solid ${T.border}`, background: 'transparent', color: T.txtMuted, fontSize: '0.80rem', fontWeight: '700', cursor: 'pointer' }}
              >
                Batal
              </button>

              <button
                type="button"
                onClick={handleSaveQuickIngredient}
                disabled={isSavingNewIngredient || !quickCreateData.name?.trim()}
                style={{
                  padding: '9px 24px',
                  borderRadius: '8px',
                  border: 'none',
                  background: isSavingNewIngredient ? '#64748b' : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  color: '#fff',
                  fontSize: '0.84rem',
                  fontWeight: '900',
                  cursor: isSavingNewIngredient ? 'wait' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 4px 14px rgba(16, 185, 129, 0.4)'
                }}
              >
                {isSavingNewIngredient ? (
                  <>
                    <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} />
                    <span>Menyimpan...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={16} />
                    <span>Simpan & Petakan Bahan Ini</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
