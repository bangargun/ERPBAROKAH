import React, { useState, useMemo } from 'react';
import {
  X,
  Upload,
  FileSpreadsheet,
  FileText,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Search,
  Database,
  DollarSign,
  Calendar,
  Store,
  Layers,
  Check,
  RefreshCw,
  SlidersHorizontal,
  Package,
  Receipt
} from 'lucide-react';
import { getApiUrl } from '../../utils/apiConfig';
import { getThemePalette } from '../../utils/themeUtils';

export default function SalesImportReconciliationModal({
  show,
  onClose,
  masterData,
  setMasterData,
  themeMode = 'dark',
  userSession,
  onSuccessImport
}) {
  if (!show) return null;

  const T = getThemePalette(themeMode);
  const isLight = themeMode === 'light';

  // Wizard Steps: 1: 'upload', 2: 'review', 3: 'mapping', 4: 'confirm'
  const [step, setStep] = useState(1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Upload & Parsed Data
  const [selectedFile, setSelectedFile] = useState(null);
  const [parsedData, setParsedData] = useState(null);
  // menuMapping: { [rawMenuName]: targetMenuName }
  const [menuMapping, setMenuMapping] = useState({});
  const [menuSearchQuery, setMenuSearchQuery] = useState('');
  const [selectedOutletOverride, setSelectedOutletOverride] = useState('');
  const [deductStock, setDeductStock] = useState(false);

  // Available master products
  const masterProducts = useMemo(() => {
    return masterData?.products || [];
  }, [masterData]);

  const allCategories = useMemo(() => {
    return masterData?.productCategories || [
      { id: 1, name: 'Makanan Utama' },
      { id: 2, name: 'Minuman' },
      { id: 3, name: 'Snack & Tambahan' }
    ];
  }, [masterData]);

  // Quick Product Creation State
  const [quickCreateData, setQuickCreateData] = useState(null); // { rawName, name, categoryId, price }
  const [isSavingNewProduct, setIsSavingNewProduct] = useState(false);

  // Handle Quick Create Submit
  const handleSaveQuickProduct = async () => {
    if (!quickCreateData || !quickCreateData.name.trim()) return;
    setIsSavingNewProduct(true);
    try {
      const nowTs = Date.now();
      const catObj = allCategories.find(c => String(c.id) === String(quickCreateData.categoryId)) || allCategories[0];
      const catName = catObj?.name || 'Makanan Utama';
      const cleanName = quickCreateData.name.trim().toUpperCase();
      const allOutlets = masterData?.outlets || [];

      const newProduct = {
        id: nowTs,
        sku: `PRD-${String(nowTs).slice(-6)}`,
        code: `PRD-${String(nowTs).slice(-6)}`,
        name: cleanName,
        category_id: quickCreateData.categoryId || (allCategories[0]?.id || 1),
        category_name: catName,
        category: catName,
        price: Number(quickCreateData.price || 0),
        cost: 0,
        unit: 'Pcs',
        status: 'Aktif',
        needs_review: true,
        status_katalog: 'perlu_diedit',
        notes: 'Dibuat otomatis dari Impor Dokumen Penjualan (Perlu Dilengkapi)',
        outlet_id: 'Semua Outlet',
        outlet_name: 'Semua Outlet',
        selectedOutletIds: allOutlets.map(o => String(o.id)),
        selected_outlet_ids: allOutlets.map(o => String(o.id)),
        compositions: [],
        variants: [],
        _updatedAt: nowTs,
        _lastMutated: nowTs,
        _lastUpdated: nowTs
      };

      const nextProducts = [...(masterData?.products || []), newProduct];
      const nextMaster = {
        ...masterData,
        products: nextProducts,
        _lastUpdated: nowTs,
        _lastMutated: nowTs
      };

      if (setMasterData) setMasterData(nextMaster);
      try {
        localStorage.setItem('mris_master_data', JSON.stringify(nextMaster));
      } catch (e) {}

      // Save to server
      await fetch(getApiUrl('/api/master-data'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nextMaster)
      });

      // Update mapping automatically to the new product name
      setMenuMapping(prev => ({
        ...prev,
        [quickCreateData.rawName]: cleanName
      }));

      setQuickCreateData(null);
    } catch (err) {
      alert('Gagal menyimpan menu baru: ' + err.message);
    } finally {
      setIsSavingNewProduct(false);
    }
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
      // Convert file to Base64
      const reader = new FileReader();
      reader.onload = async () => {
        const base64Data = reader.result;
        try {
          const res = await fetch(getApiUrl('/api/sales/parse-import-file'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              fileName: file.name,
              fileData: base64Data
            })
          });

          const json = await res.json();
          if (!res.ok || !json.success) {
            throw new Error(json.error || 'Gagal membaca isi dokumen');
          }

          setParsedData(json);

          // Initialize Auto-Mapping
          const initialMapping = {};
          const rawMenus = json.uniqueRawMenus || [];
          
          rawMenus.forEach(raw => {
            const rawUpper = raw.toUpperCase().trim();
            // Try fuzzy matching with master products
            const found = masterProducts.find(p => {
              const pUpper = (p.name || '').toUpperCase().trim();
              return pUpper === rawUpper || 
                     rawUpper.includes(pUpper) || 
                     pUpper.includes(rawUpper);
            });

            if (found) {
              initialMapping[raw] = found.name;
            } else {
              initialMapping[raw] = '__KEEP_ORIGINAL__';
            }
          });

          setMenuMapping(initialMapping);
          setStep(2); // Go to Review Board
        } catch (err) {
          setErrorMessage(err.message || 'Terjadi kesalahan saat memproses file di server');
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

  // Quick Auto-Match all menus
  const handleAutoMatchAll = () => {
    if (!parsedData?.uniqueRawMenus) return;
    const newMapping = { ...menuMapping };
    
    parsedData.uniqueRawMenus.forEach(raw => {
      const rawUpper = raw.toUpperCase().trim();
      const found = masterProducts.find(p => {
        const pUpper = (p.name || '').toUpperCase().trim();
        return pUpper === rawUpper || 
               rawUpper.includes(pUpper) || 
               pUpper.includes(rawUpper);
      });
      if (found) {
        newMapping[raw] = found.name;
      }
    });

    setMenuMapping(newMapping);
  };

  // Set all to Keep Original
  const handleResetToOriginal = () => {
    if (!parsedData?.uniqueRawMenus) return;
    const newMapping = {};
    parsedData.uniqueRawMenus.forEach(raw => {
      newMapping[raw] = '__KEEP_ORIGINAL__';
    });
    setMenuMapping(newMapping);
  };

  // Filtered Raw Menus for mapping step
  const filteredRawMenus = useMemo(() => {
    const list = parsedData?.uniqueRawMenus || [];
    if (!menuSearchQuery.trim()) return list;
    const q = menuSearchQuery.toLowerCase();
    return list.filter(m => m.toLowerCase().includes(q));
  }, [parsedData, menuSearchQuery]);

  // Execute Final Batch Import
  const handleExecuteImport = async () => {
    if (!parsedData?.transactions || parsedData.transactions.length === 0) {
      setErrorMessage('Tidak ada data transaksi yang dapat diimpor');
      return;
    }

    setIsProcessing(true);
    setErrorMessage('');

    try {
      // Build finalized menu mapping dictionary
      const finalMapping = {};
      Object.entries(menuMapping).forEach(([raw, mapped]) => {
        if (mapped && mapped !== '__KEEP_ORIGINAL__') {
          finalMapping[raw] = mapped;
        }
      });

      const res = await fetch(getApiUrl('/api/sales/execute-import-batch'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transactions: parsedData.transactions,
          menuMapping: finalMapping,
          deductStock,
          defaultOutletId: selectedOutletOverride || null,
          author: userSession?.name || 'Super Admin'
        })
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Gagal menyimpan transaksi ke database');
      }

      setSuccessMessage(`Sukses! ${json.count || parsedData.transactions.length} transaksi berhasil disimpan ke database.`);
      
      // Auto refresh master data
      if (setMasterData) {
        try {
          const mRes = await fetch(getApiUrl('/api/master-data'));
          if (mRes.ok) {
            const mJson = await mRes.json();
            setMasterData(mJson);
          }
        } catch (e) {}
      }

      if (onSuccessImport) onSuccessImport(json);

      setTimeout(() => {
        onClose();
      }, 2500);

    } catch (err) {
      setErrorMessage(err.message || 'Gagal mengimpor data ke server');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 9999,
      background: 'rgba(0, 0, 0, 0.85)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      <div style={{
        background: T.cardBg,
        border: `1px solid ${T.border}`,
        borderRadius: '16px',
        width: '100%',
        maxWidth: '1050px',
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.75)',
        overflow: 'hidden',
        color: T.txtPrimary
      }}>
        
        {/* MODAL HEADER */}
        <div style={{
          padding: '16px 24px',
          borderBottom: `1px solid ${T.border}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: T.cardBg2
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#000',
              boxShadow: '0 4px 12px rgba(245, 158, 11, 0.4)'
            }}>
              <FileSpreadsheet size={22} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.1rem', fontWeight: '900', margin: 0, color: '#f59e0b' }}>
                Impor Dokumen Penjualan (PDF & Excel)
              </h2>
              <span style={{ fontSize: '0.74rem', color: T.txtMuted, fontWeight: '600' }}>
                Upload dokumen fisik/POS, review ringkasan omzet, dan koreksi pemetaan menu
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: T.txtMuted,
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* STEP PROGRESS WIZARD */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          padding: '12px 24px',
          background: isLight ? '#f1f5f9' : '#0f172a',
          borderBottom: `1px solid ${T.border}`,
          gap: '8px'
        }}>
          {[
            { num: 1, label: '1. Upload File' },
            { num: 2, label: '2. Papan Review' },
            { num: 3, label: '3. Koreksi Menu' },
            { num: 4, label: '4. Konfirmasi Simpan' }
          ].map((s, idx) => {
            const isCurrent = step === s.num;
            const isDone = step > s.num;
            return (
              <React.Fragment key={s.num}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  opacity: isCurrent || isDone ? 1 : 0.45
                }}>
                  <div style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    background: isDone ? '#10b981' : isCurrent ? '#f59e0b' : '#334155',
                    color: isDone || isCurrent ? '#000' : '#94a3b8',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.75rem',
                    fontWeight: '900'
                  }}>
                    {isDone ? <Check size={14} color="#000" strokeWidth={3} /> : s.num}
                  </div>
                  <span style={{
                    fontSize: '0.78rem',
                    fontWeight: isCurrent ? '800' : '600',
                    color: isCurrent ? '#f59e0b' : isDone ? '#10b981' : T.txtMuted
                  }}>
                    {s.label}
                  </span>
                </div>
                {idx < 3 && (
                  <div style={{ flex: 1, height: '2px', background: isDone ? '#10b981' : '#334155', margin: '0 6px' }} />
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* ERROR / SUCCESS ALERTS */}
        {errorMessage && (
          <div style={{
            margin: '12px 24px 0 24px',
            padding: '10px 14px',
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.4)',
            borderRadius: '8px',
            color: '#f87171',
            fontSize: '0.82rem',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <AlertCircle size={16} />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div style={{
            margin: '12px 24px 0 24px',
            padding: '12px 16px',
            background: 'rgba(16, 185, 129, 0.2)',
            border: '1px solid #10b981',
            borderRadius: '8px',
            color: '#34d399',
            fontSize: '0.86rem',
            fontWeight: '700',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            <CheckCircle2 size={20} />
            <span>{successMessage}</span>
          </div>
        )}

        {/* MODAL BODY PER STEP */}
        <div style={{
          padding: '20px 24px',
          overflowY: 'auto',
          flex: 1
        }}>

          {/* ─── STEP 1: UPLOAD FILE ────────────────────────────────── */}
          {step === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '30px 10px', textAlign: 'center' }}>
              <div
                style={{
                  border: '2px dashed #f59e0b',
                  borderRadius: '16px',
                  padding: '40px 30px',
                  width: '100%',
                  maxWidth: '650px',
                  background: isLight ? 'rgba(245, 158, 11, 0.05)' : 'rgba(245, 158, 11, 0.03)',
                  cursor: isProcessing ? 'wait' : 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '16px',
                  transition: 'all 0.2s ease'
                }}
                onClick={() => !isProcessing && document.getElementById('file-upload-input').click()}
              >
                <input
                  id="file-upload-input"
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
                  background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.2), rgba(217, 119, 6, 0.3))',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#f59e0b'
                }}>
                  {isProcessing ? (
                    <RefreshCw size={32} style={{ animation: 'spin 1s linear infinite' }} />
                  ) : (
                    <Upload size={32} />
                  )}
                </div>

                <div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: '800', margin: '0 0 6px 0', color: T.txtPrimary }}>
                    {isProcessing ? 'Sedang Membaca & Mengekstrak Dokumen...' : 'Pilih atau Drag & Drop Dokumen Penjualan'}
                  </h3>
                  <p style={{ fontSize: '0.82rem', color: T.txtMuted, margin: 0 }}>
                    Mendukung file <strong>PDF Penjualan (Hingga ratusan halaman)</strong> atau file <strong>Excel (.xlsx / .xls)</strong>
                  </p>
                </div>

                {!isProcessing && (
                  <button
                    type="button"
                    style={{
                      padding: '10px 24px',
                      background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                      color: '#000',
                      fontWeight: '800',
                      fontSize: '0.86rem',
                      borderRadius: '10px',
                      border: 'none',
                      cursor: 'pointer',
                      boxShadow: '0 4px 12px rgba(245, 158, 11, 0.35)'
                    }}
                  >
                    Pilih File dari Komputer
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ─── STEP 2: PAPAN REVIEW TRANSAKSI ─────────────────────── */}
          {step === 2 && parsedData && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              
              {/* KPI Summary Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                <div style={{ padding: '16px', background: T.cardBg2, border: `1px solid ${T.border}`, borderRadius: '12px' }}>
                  <div style={{ fontSize: '0.74rem', color: T.txtMuted, fontWeight: '700', textTransform: 'uppercase' }}>Total Transaksi</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: '900', color: '#f59e0b', marginTop: '4px' }}>
                    {parsedData.totalCount?.toLocaleString('id-ID')} Struk
                  </div>
                  <div style={{ fontSize: '0.70rem', color: T.txtSecondary, marginTop: '2px' }}>
                    Dari {parsedData.totalPages || 1} Halaman Dokumen
                  </div>
                </div>

                <div style={{ padding: '16px', background: T.cardBg2, border: `1px solid ${T.border}`, borderRadius: '12px' }}>
                  <div style={{ fontSize: '0.74rem', color: T.txtMuted, fontWeight: '700', textTransform: 'uppercase' }}>Total Omzet Terdeteksi</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: '900', color: '#10b981', marginTop: '4px' }}>
                    Rp {parsedData.totalOmzet?.toLocaleString('id-ID')}
                  </div>
                  <div style={{ fontSize: '0.70rem', color: T.txtSecondary, marginTop: '2px' }}>
                    Nilai riil tanpa selisih
                  </div>
                </div>

                <div style={{ padding: '16px', background: T.cardBg2, border: `1px solid ${T.border}`, borderRadius: '12px' }}>
                  <div style={{ fontSize: '0.74rem', color: T.txtMuted, fontWeight: '700', textTransform: 'uppercase' }}>Rentang Tanggal</div>
                  <div style={{ fontSize: '1.05rem', fontWeight: '800', color: '#38bdf8', marginTop: '6px' }}>
                    {parsedData.dateStart} s/d {parsedData.dateEnd}
                  </div>
                  <div style={{ fontSize: '0.70rem', color: T.txtSecondary, marginTop: '2px' }}>
                    Otomatis masuk ke buku tanggal terkait
                  </div>
                </div>

                <div style={{ padding: '16px', background: T.cardBg2, border: `1px solid ${T.border}`, borderRadius: '12px' }}>
                  <div style={{ fontSize: '0.74rem', color: T.txtMuted, fontWeight: '700', textTransform: 'uppercase' }}>Cabang / Outlet</div>
                  <div style={{ fontSize: '0.95rem', fontWeight: '800', color: T.txtPrimary, marginTop: '6px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {parsedData.outletsDetected?.[0] || 'Ayam Pecak 2001 Kisaran'}
                  </div>
                  <div style={{ fontSize: '0.70rem', color: '#10b981', fontWeight: '700', marginTop: '2px' }}>
                    ✅ Terpetakan Otomatis
                  </div>
                </div>
              </div>

              {/* Sample Table Preview */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <h4 style={{ fontSize: '0.92rem', fontWeight: '800', margin: 0, color: T.txtPrimary }}>
                    Pratinjau Sampel Transaksi (10 Struk Pertama):
                  </h4>
                  <span style={{ fontSize: '0.74rem', color: T.txtMuted }}>
                    Menampilkan 10 dari {parsedData.totalCount} transaksi
                  </span>
                </div>

                <div style={{
                  border: `1px solid ${T.border}`,
                  borderRadius: '10px',
                  overflow: 'hidden',
                  maxHeight: '260px',
                  overflowY: 'auto'
                }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem', textAlign: 'left' }}>
                    <thead style={{ background: T.cardBg2, color: T.txtSecondary, position: 'sticky', top: 0 }}>
                      <tr>
                        <th style={{ padding: '8px 12px' }}>No</th>
                        <th style={{ padding: '8px 12px' }}>Waktu</th>
                        <th style={{ padding: '8px 12px' }}>Produk Bawaan Dokumen</th>
                        <th style={{ padding: '8px 12px', textAlign: 'right' }}>Total (Rp)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(parsedData.transactions || []).slice(0, 10).map((t, idx) => (
                        <tr key={idx} style={{ borderTop: `1px solid ${T.border}` }}>
                          <td style={{ padding: '8px 12px', color: T.txtMuted }}>{idx + 1}</td>
                          <td style={{ padding: '8px 12px', fontWeight: '700', color: '#f59e0b' }}>
                            {t.date} {t.time?.substring(0, 5)}
                          </td>
                          <td style={{ padding: '8px 12px', maxWidth: '350px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {t.raw_products}
                          </td>
                          <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: '800', color: '#10b981' }}>
                            Rp {t.total?.toLocaleString('id-ID')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}

          {/* ─── STEP 3: PAPAN KOREKSI & PEMETAAN MENU ──────────────── */}
          {step === 3 && parsedData && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              {/* Header Controls for Mapping */}
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
                  <h4 style={{ fontSize: '0.94rem', fontWeight: '900', margin: '0 0 2px 0', color: '#f59e0b' }}>
                    Papan Koreksi & Pemetaan Menu ({parsedData.uniqueRawMenus?.length || 0} Menu Terdeteksi)
                  </h4>
                  <p style={{ fontSize: '0.74rem', color: T.txtMuted, margin: 0 }}>
                    Tentukan apakah ingin mengganti nama menu ke <strong>Menu Master MRIS</strong> atau <strong>Tetap Sama</strong>
                  </p>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={handleAutoMatchAll}
                    type="button"
                    style={{
                      padding: '6px 12px',
                      background: 'rgba(245, 158, 11, 0.15)',
                      border: '1px solid #f59e0b',
                      color: '#f59e0b',
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

              {/* Search Bar for Raw Menus */}
              <div style={{ position: 'relative' }}>
                <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: T.txtMuted }} />
                <input
                  type="text"
                  placeholder="Cari nama menu bawaan dokumen..."
                  value={menuSearchQuery}
                  onChange={(e) => setMenuSearchQuery(e.target.value)}
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

              {/* Menu Mapping Table */}
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
                      <th style={{ padding: '10px 14px', width: '45%' }}>📜 Nama Menu Bawaan Dokumen (Asli)</th>
                      <th style={{ padding: '10px 14px' }}>🔄 Ganti dengan Menu Master / Tetap Sama</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRawMenus.map((rawName, idx) => {
                      const currentMapped = menuMapping[rawName] || '__KEEP_ORIGINAL__';
                      const isMappedToMaster = currentMapped !== '__KEEP_ORIGINAL__';

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
                                if (val === '__CREATE_NEW__') {
                                  setQuickCreateData({
                                    rawName,
                                    name: rawName,
                                    categoryId: allCategories[0]?.id || 1,
                                    price: 20000
                                  });
                                } else {
                                  setMenuMapping(prev => ({
                                    ...prev,
                                    [rawName]: val
                                  }));
                                }
                              }}
                              style={{
                                width: '100%',
                                padding: '8px 12px',
                                borderRadius: '8px',
                                border: isMappedToMaster ? '1px solid #10b981' : '1px solid #64748b',
                                background: isMappedToMaster ? (isLight ? '#ecfdf5' : '#064e3b') : (isLight ? '#f8fafc' : '#1e293b'),
                                color: isMappedToMaster ? (isLight ? '#065f46' : '#a7f3d0') : T.txtPrimary,
                                fontWeight: isMappedToMaster ? '800' : '600',
                                fontSize: '0.80rem',
                                cursor: 'pointer'
                              }}
                            >
                              <option value="__KEEP_ORIGINAL__">
                                🔒 [ Tetap Sama / Gunakan Nama Asli: {rawName} ]
                              </option>
                              <option value="__CREATE_NEW__" style={{ fontWeight: '900', color: '#f59e0b' }}>
                                ➕ [ Buat Menu Master Baru: "{rawName}" ]
                              </option>
                              <optgroup label="─── Pilihan Menu Master Resmi MRIS ───">
                                {masterProducts.map(p => (
                                  <option key={p.id} value={p.name}>
                                    ✨ Ganti ke: {p.name}
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

          {/* ─── STEP 4: KONFIRMASI & DAMPAK SISTEM ──────────────────── */}
          {step === 4 && parsedData && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              
              <div style={{
                padding: '16px 20px',
                background: 'rgba(245, 158, 11, 0.08)',
                border: '1px solid #f59e0b',
                borderRadius: '12px'
              }}>
                <h4 style={{ fontSize: '1rem', fontWeight: '900', margin: '0 0 6px 0', color: '#f59e0b' }}>
                  Konfirmasi Akhir Penyimpanan ke Database
                </h4>
                <p style={{ fontSize: '0.82rem', color: T.txtPrimary, margin: 0 }}>
                  Anda akan menyimpan <strong>{parsedData.totalCount} transaksi</strong> dengan total omzet <strong>Rp {parsedData.totalOmzet?.toLocaleString('id-ID')}</strong> untuk periode <strong>{parsedData.dateStart} s/d {parsedData.dateEnd}</strong>.
                </p>
              </div>

              {/* Rincian Pengaruh Alur Setelahnya */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <h4 style={{ fontSize: '0.90rem', fontWeight: '800', margin: 0, color: T.txtSecondary, textTransform: 'uppercase' }}>
                  Pengaruh Alur ke Modul Lain:
                </h4>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
                  
                  {/* 1. Laporan Keuangan */}
                  <div style={{ padding: '14px', background: T.cardBg2, border: `1px solid ${T.border}`, borderRadius: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#10b981', fontWeight: '800', fontSize: '0.86rem' }}>
                      <DollarSign size={18} />
                      <span>Laporan Keuangan & Omzet</span>
                    </div>
                    <p style={{ fontSize: '0.76rem', color: T.txtMuted, margin: '6px 0 0 0' }}>
                      Omzet Rp {parsedData.totalOmzet?.toLocaleString('id-ID')} langsung masuk ke Buku Kas & Laporan Laba Rugi periode {parsedData.dateStart} s/d {parsedData.dateEnd}.
                    </p>
                  </div>

                  {/* 2. POS Kasir */}
                  <div style={{ padding: '14px', background: T.cardBg2, border: `1px solid ${T.border}`, borderRadius: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#38bdf8', fontWeight: '800', fontSize: '0.86rem' }}>
                      <Receipt size={18} />
                      <span>POS Kasir & Tutup Shift</span>
                    </div>
                    <p style={{ fontSize: '0.76rem', color: T.txtMuted, margin: '6px 0 0 0' }}>
                      Laci kasir aktif hari ini aman dan tidak terganggu. Seluruh struk tersimpan rapi di riwayat transaksi.
                    </p>
                  </div>

                  {/* 3. Stok Bahan Baku */}
                  <div style={{ padding: '14px', background: T.cardBg2, border: `1px solid ${T.border}`, borderRadius: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#f59e0b', fontWeight: '800', fontSize: '0.86rem' }}>
                      <Package size={18} />
                      <span>Pengaturan Stok Logistik</span>
                    </div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px', cursor: 'pointer', fontSize: '0.78rem', color: T.txtPrimary, fontWeight: '700' }}>
                      <input
                        type="checkbox"
                        checked={deductStock}
                        onChange={(e) => setDeductStock(e.target.checked)}
                        style={{ width: '16px', height: '16px', accentColor: '#f59e0b' }}
                      />
                      <span>Otomatis potong stok bahan baku sesuai resep menu terpetakan</span>
                    </label>
                  </div>

                </div>
              </div>

            </div>
          )}

        </div>

        {/* MODAL FOOTER NAVIGATION */}
        <div style={{
          padding: '16px 24px',
          borderTop: `1px solid ${T.border}`,
          background: T.cardBg2,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          {step > 1 ? (
            <button
              type="button"
              onClick={() => setStep(prev => prev - 1)}
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
          ) : (
            <div />
          )}

          <div style={{ display: 'flex', gap: '10px' }}>
            {step < 4 ? (
              <button
                type="button"
                onClick={() => setStep(prev => prev + 1)}
                disabled={!parsedData || isProcessing}
                style={{
                  padding: '9px 22px',
                  borderRadius: '8px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                  color: '#000',
                  fontSize: '0.84rem',
                  fontWeight: '800',
                  cursor: !parsedData || isProcessing ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  opacity: !parsedData ? 0.5 : 1,
                  boxShadow: '0 4px 12px rgba(245, 158, 11, 0.35)'
                }}
              >
                <span>{step === 1 ? 'Lanjut ke Papan Review' : step === 2 ? 'Lanjut ke Koreksi Menu' : 'Lanjut ke Konfirmasi'}</span>
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
                    <span>SETUJUI & SIMPAN SEMUA KE DATABASE</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>

      </div>

      {/* QUICK PRODUCT CREATION MODAL */}
      {quickCreateData && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 10000,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <div style={{
            background: isLight ? '#ffffff' : '#0f172a',
            border: `1px solid ${T.borderStrong}`,
            borderRadius: '14px',
            width: '100%',
            maxWidth: '500px',
            padding: '24px',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.6)',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${T.border}`, paddingBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#000' }}>
                  <Package size={18} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1rem', fontWeight: '900', margin: 0, color: '#f59e0b' }}>
                    Buat Menu Master Baru
                  </h3>
                  <span style={{ fontSize: '0.72rem', color: T.txtMuted }}>
                    Menu akan didaftarkan ke Data Master dengan status <strong>Perlu Diedit</strong>
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setQuickCreateData(null)}
                style={{ background: 'transparent', border: 'none', color: T.txtMuted, cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '0.76rem', fontWeight: '800', color: T.txtSecondary, display: 'block', marginBottom: '4px' }}>
                  Nama Menu Resmi Restoran:
                </label>
                <input
                  type="text"
                  value={quickCreateData.name}
                  onChange={(e) => setQuickCreateData(prev => ({ ...prev, name: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: `1px solid ${T.border}`,
                    background: isLight ? '#f8fafc' : '#1e293b',
                    color: T.txtPrimary,
                    fontSize: '0.84rem',
                    fontWeight: '800'
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.76rem', fontWeight: '800', color: T.txtSecondary, display: 'block', marginBottom: '4px' }}>
                  Kategori Menu:
                </label>
                <select
                  value={quickCreateData.categoryId}
                  onChange={(e) => setQuickCreateData(prev => ({ ...prev, categoryId: Number(e.target.value) }))}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: `1px solid ${T.border}`,
                    background: isLight ? '#f8fafc' : '#1e293b',
                    color: T.txtPrimary,
                    fontSize: '0.82rem',
                    fontWeight: '700'
                  }}
                >
                  {allCategories.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.76rem', fontWeight: '800', color: T.txtSecondary, display: 'block', marginBottom: '4px' }}>
                  Estimasi Harga Jual (Rp):
                </label>
                <input
                  type="number"
                  value={quickCreateData.price}
                  onChange={(e) => setQuickCreateData(prev => ({ ...prev, price: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: `1px solid ${T.border}`,
                    background: isLight ? '#f8fafc' : '#1e293b',
                    color: '#10b981',
                    fontSize: '0.90rem',
                    fontWeight: '900'
                  }}
                />
              </div>

              <div style={{
                padding: '10px 12px',
                background: 'rgba(245, 158, 11, 0.12)',
                border: '1px solid rgba(245, 158, 11, 0.35)',
                borderRadius: '8px',
                fontSize: '0.74rem',
                color: '#fbbf24',
                lineHeight: 1.4
              }}>
                ℹ️ <strong>Catatan:</strong> Menu baru ini akan otomatis muncul dengan tanda kuning <strong>"Perlu Diedit / Perlu Dilengkapi"</strong> di menu Data Master Produk, sehingga Anda bisa mengupload foto atau mengatur resep bahan bakunya nanti.
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', borderTop: `1px solid ${T.border}`, paddingTop: '14px' }}>
              <button
                type="button"
                onClick={() => setQuickCreateData(null)}
                disabled={isSavingNewProduct}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  border: `1px solid ${T.border}`,
                  background: 'transparent',
                  color: T.txtMuted,
                  fontSize: '0.80rem',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSaveQuickProduct}
                disabled={isSavingNewProduct || !quickCreateData.name.trim()}
                style={{
                  padding: '8px 20px',
                  borderRadius: '8px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  color: '#fff',
                  fontSize: '0.82rem',
                  fontWeight: '900',
                  cursor: isSavingNewProduct ? 'wait' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 4px 12px rgba(16, 185, 129, 0.35)'
                }}
              >
                {isSavingNewProduct ? (
                  <>
                    <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} />
                    <span>Menyimpan...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={16} />
                    <span>Simpan & Petakan Menu Ini</span>
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
