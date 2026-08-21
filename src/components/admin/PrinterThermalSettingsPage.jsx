import React, { useState } from 'react';
import { 
  Printer, Save, CheckCircle, Wifi, Bluetooth, RefreshCw, Layers, ShieldCheck,
  Store, MapPin, Phone, MessageSquare, Sparkles, ChevronDown, ChevronUp, FileText
} from 'lucide-react';
import { getThemePalette } from '../../utils/themeUtils';

export default function PrinterThermalSettingsPage({ masterData, setMasterData, themeMode = 'dark' }) {
  const T = getThemePalette(themeMode);
  const isLight = themeMode === 'light';

  // Styling helper for input fields (High contrast in both Dark & Light mode)
  const inputStyle = {
    padding: '10px 14px',
    background: isLight ? '#ffffff' : '#0b1120',
    border: isLight ? '1.5px solid #cbd5e1' : '1.5px solid #334155',
    borderRadius: '10px',
    color: isLight ? '#0f172a' : '#f8fafc',
    fontSize: '0.88rem',
    fontWeight: '800',
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box'
  };

  const [printerSettings, setPrinterSettings] = useState(() => {
    return masterData?.printerSettings || {
      kitchenPrinter: { ip: '192.168.1.200', paperWidth: '80', enabled: true },
      barPrinter: { ip: '192.168.1.201', paperWidth: '58', enabled: true },
      cashierPrinter: { ip: '192.168.1.202', paperWidth: '58', enabled: true },
      autoShowReceiptChoiceOnSaveOrder: true,
      autoPrintOnPayment: true,
      printKitchen: true,
      printBar: true,
      printTableCopy: false,
      printCashierCopy: true
    };
  });

  const outlets = masterData?.outlets || [];
  const [selectedOutletId, setSelectedOutletId] = useState(() => {
    if (outlets.length > 0 && outlets[0].id != null) return String(outlets[0].id);
    return '1';
  });

  const [headerFooterByOutlet, setHeaderFooterByOutlet] = useState(() => {
    return masterData?.printerSettings?.headerFooterByOutlet || {};
  });

  const getOutletHeaderFooterDefault = (outletId) => {
    const foundOutlet = outlets.find(o => String(o.id) === String(outletId)) || outlets[0];
    const saved = (masterData?.printerSettings?.headerFooterByOutlet || {})[String(outletId)];
    if (saved) return saved;

    const outletName = foundOutlet?.name || foundOutlet?.branch_name || 'AYAM PECAK 2001 SEAFOOD';
    const outletAddr = foundOutlet?.address || foundOutlet?.alamat || 'Jl. Jendral Sudirman No. 88';
    const outletPhone = foundOutlet?.phone || foundOutlet?.telepon || '(0621) 21555';
    const groupName = foundOutlet?.group_name || foundOutlet?.company_name || masterData?.companyName || 'BAROKAH GROUP INDONESIA';

    return {
      restaurantName: outletName || 'RESTO BAROKAH',
      groupName: groupName || 'BAROKAH GROUP INDONESIA',
      address: outletAddr,
      phone: outletPhone,
      slogan: 'Halal, Gurih & Nikmat',
      footerLine1: 'TERIMA KASIH ATAS KUNJUNGAN ANDA',
      footerLine2: 'SUDAH TERMASUK PB1 PAJAK RESTORAN',
      wifiSsid: 'BarokahResto_5G',
      wifiPassword: 'berkahselalu'
    };
  };

  const [headerFooter, setHeaderFooter] = useState(() => {
    return headerFooterByOutlet[selectedOutletId] || getOutletHeaderFooterDefault(selectedOutletId);
  });

  const handleSelectOutlet = (newOutletId) => {
    setSelectedOutletId(newOutletId);
    const existing = headerFooterByOutlet[String(newOutletId)];
    setHeaderFooter(existing || getOutletHeaderFooterDefault(newOutletId));
  };

  const handleSyncFromDataMaster = () => {
    const foundOutlet = outlets.find(o => String(o.id) === String(selectedOutletId)) || outlets[0];
    const outletName = foundOutlet?.name || foundOutlet?.branch_name || 'AYAM PECAK 2001 SEAFOOD';
    const outletAddr = foundOutlet?.address || foundOutlet?.alamat || 'Jl. Jendral Sudirman No. 88';
    const outletPhone = foundOutlet?.phone || foundOutlet?.telepon || '(0621) 21555';

    setHeaderFooter(prev => ({
      ...prev,
      restaurantName: outletName,
      address: outletAddr,
      phone: outletPhone
    }));
  };

  const applyPreset = (presetType) => {
    const foundOutlet = outlets.find(o => String(o.id) === String(selectedOutletId)) || outlets[0];
    const outletName = foundOutlet?.name || foundOutlet?.branch_name || 'AYAM PECAK 2001 SEAFOOD';
    const outletAddr = foundOutlet?.address || foundOutlet?.alamat || 'Jl. Jendral Sudirman No. 88';
    const outletPhone = foundOutlet?.phone || foundOutlet?.telepon || '(0621) 21555';

    if (presetType === 'modern') {
      setHeaderFooter({
        restaurantName: outletName,
        groupName: 'BAROKAH GROUP INDONESIA',
        address: outletAddr,
        phone: outletPhone,
        slogan: 'Halal, Gurih & Nikmat',
        footerLine1: 'TERIMA KASIH ATAS KUNJUNGAN ANDA',
        footerLine2: 'SUDAH TERMASUK PB1 PAJAK RESTORAN',
        wifiSsid: 'Barokah_Guest',
        wifiPassword: 'berkahselalu'
      });
    } else if (presetType === 'compact') {
      setHeaderFooter({
        restaurantName: outletName,
        groupName: '',
        address: outletAddr,
        phone: outletPhone,
        slogan: '',
        footerLine1: 'MATUR NUWUN / TERIMA KASIH',
        footerLine2: 'SIMPAN STRUK INI SBG BUKTI SAH',
        wifiSsid: '',
        wifiPassword: ''
      });
    } else if (presetType === 'corporate') {
      setHeaderFooter({
        restaurantName: outletName,
        groupName: 'PT. BAROKAH BERSAMA UTAMA',
        address: outletAddr,
        phone: outletPhone,
        slogan: 'Kritik & Saran: CS 0812-3456-7890',
        footerLine1: 'LAYANAN KONSUMEN: 0800-1-BAROKAH',
        footerLine2: 'HARGA SUDAH TERMASUK PAJAK DAERAH (PB1 10%)',
        wifiSsid: 'Barokah_FreeWifi',
        wifiPassword: 'rasaterbaik'
      });
    }
  };

  const [savedSuccessToast, setSavedSuccessToast] = useState(false);
  const [styleOpen, setStyleOpen] = useState(false);

  const defaultReceiptStyle = {
    titleSize: 'xlarge', groupSize: 'medium', addressSize: 'xsmall',
    metaSize: 'small', itemSize: 'small', totalSize: 'large', footerSize: 'xsmall',
    headerAlign: 'center', footerAlign: 'center',
    titleBold: true, itemBold: true, totalBold: true,
    separatorStyle: 'dashed', showItemNotes: true, priceLayout: 'inline',
    letterSpacing: 'normal', lineHeight: 'normal'
  };

  const [receiptStyle, setReceiptStyle] = useState(() =>
    masterData?.printerSettings?.receiptStyle || defaultReceiptStyle
  );
  const setRS = (key, val) => setReceiptStyle(prev => ({ ...prev, [key]: val }));

  const categories = masterData?.categories || masterData?.menuCategories || [];

  const handleSaveSettings = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    const updatedHeaderFooterByOutlet = {
      ...headerFooterByOutlet,
      [String(selectedOutletId)]: headerFooter
    };

    const newSettings = {
      ...printerSettings,
      headerFooterByOutlet: updatedHeaderFooterByOutlet,
      headerFooter: headerFooter,
      receiptStyle: receiptStyle
    };

    setMasterData(prev => ({
      ...prev,
      _lastUpdated: Date.now(),
      printerSettings: newSettings
    }));

    setSavedSuccessToast(true);
    setTimeout(() => setSavedSuccessToast(false), 3000);
  };

  const handleUpdateCategoryPrinter = (catId, target) => {
    const updatedCats = categories.map(c => {
      if (c.id === catId) {
        return { ...c, target_printer: target, printer_type: target };
      }
      return c;
    });

    setMasterData(prev => ({
      ...prev,
      _lastUpdated: Date.now(),
      categories: updatedCats,
      menuCategories: updatedCats
    }));
  };

  return (
    <div style={{ flex: 1, padding: '24px', overflowY: 'auto', background: 'var(--pos-bg-app, #090d16)', minHeight: '100vh', display: 'flex', flexDirection: 'column', gap: '24px' }}>

      {/* TOAST SUCCESS NOTIFICATION */}
      {savedSuccessToast && (
        <div style={{ position: 'fixed', top: '24px', right: '24px', background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: '#ffffff', padding: '14px 22px', borderRadius: '12px', boxShadow: '0 10px 25px rgba(16,185,129,0.4)', display: 'flex', alignItems: 'center', gap: '10px', zIndex: 9999, fontWeight: '800', fontSize: '0.88rem' }}>
          <CheckCircle size={20} />
          <span>Pengaturan Header &amp; Footer Struk Berhasil Disimpan!</span>
        </div>
      )}

      {/* TOP HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', background: T.cardBg, padding: '18px 22px', borderRadius: '16px', border: `1px solid ${T.border}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '46px', height: '46px', borderRadius: '12px', background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', boxShadow: '0 4px 14px rgba(37,99,235,0.4)' }}>
            <Printer size={24} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.25rem', fontWeight: '900', color: T.txtPrimary, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>Pengaturan Printer &amp; Struk Thermal</span>
              <span style={{ fontSize: '0.72rem', background: '#10b981', color: '#fff', padding: '2px 8px', borderRadius: '6px', fontWeight: '800' }}>
                PROFESIONAL
              </span>
            </h1>
            <p style={{ fontSize: '0.80rem', color: T.txtMuted, margin: '2px 0 0 0' }}>
              Kelola tulisan identitas restoran pada struk dan routing printer dapur/bar secara mudah
            </p>
          </div>
        </div>

        <button
          onClick={handleSaveSettings}
          style={{ padding: '10px 20px', background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)', border: 'none', borderRadius: '10px', color: '#ffffff', fontWeight: '900', fontSize: '0.84rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 14px rgba(37,99,235,0.35)' }}
        >
          <Save size={16} />
          <span>Simpan Semua Pengaturan</span>
        </button>
      </div>

      {/* MAIN TWO-COLUMN CONTAINER: FORM (LEFT) & REALISTIC RECEIPT PREVIEW (RIGHT) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.4fr) minmax(360px, 1fr)', gap: '24px', alignItems: 'start' }}>
        
        {/* LEFT COLUMN: SIMPLE & PROFESSIONAL HEADER/FOOTER FORM */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

          {/* 1. OUTLET SELECTION & PRESETS BAR */}
          <div style={{ background: T.cardBg, padding: '20px', borderRadius: '16px', border: `1px solid ${T.border}`, display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Store size={18} color="#3b82f6" />
                <span style={{ fontSize: '0.90rem', fontWeight: '900', color: T.txtPrimary }}>
                  Pilih Cabang Restoran:
                </span>
              </div>

              <button
                type="button"
                onClick={handleSyncFromDataMaster}
                style={{ padding: '6px 12px', background: 'rgba(59,130,246,0.15)', border: '1px solid #3b82f6', borderRadius: '8px', color: '#60a5fa', fontWeight: '800', fontSize: '0.76rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                title="Isi otomatis dari profil cabang Data Master"
              >
                <RefreshCw size={13} />
                <span>Isi Otomatis dari Master Cabang</span>
              </button>
            </div>

            <select
              value={selectedOutletId}
              onChange={e => handleSelectOutlet(e.target.value)}
              style={inputStyle}
            >
              {outlets.map(o => (
                <option key={o.id} value={String(o.id)} style={{ background: isLight ? '#ffffff' : '#0f172a', color: isLight ? '#0f172a' : '#f8fafc' }}>
                  {o.name || o.branch_name}
                </option>
              ))}
            </select>

            {/* PRESET TEMPLATE BUTTONS */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '4px' }}>
              <span style={{ fontSize: '0.74rem', color: T.txtMuted, fontWeight: '700' }}>Template Struk Cepat:</span>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => applyPreset('modern')}
                  style={{ padding: '9px 6px', borderRadius: '8px', border: isLight ? '1.5px solid #cbd5e1' : '1.5px solid #334155', background: isLight ? '#f8fafc' : '#0b1120', color: isLight ? '#0f172a' : '#f8fafc', fontSize: '0.76rem', fontWeight: '800', cursor: 'pointer' }}
                >
                  🌟 Standar Modern
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('compact')}
                  style={{ padding: '9px 6px', borderRadius: '8px', border: isLight ? '1.5px solid #cbd5e1' : '1.5px solid #334155', background: isLight ? '#f8fafc' : '#0b1120', color: isLight ? '#0f172a' : '#f8fafc', fontSize: '0.76rem', fontWeight: '800', cursor: 'pointer' }}
                >
                  ⚡ Hemat Kertas
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('corporate')}
                  style={{ padding: '9px 6px', borderRadius: '8px', border: isLight ? '1.5px solid #cbd5e1' : '1.5px solid #334155', background: isLight ? '#f8fafc' : '#0b1120', color: isLight ? '#0f172a' : '#f8fafc', fontSize: '0.76rem', fontWeight: '800', cursor: 'pointer' }}
                >
                  🏢 Formal / PT
                </button>
              </div>
            </div>
          </div>

          {/* 2. HEADER STRUK (BAGIAN ATAS) */}
          <div style={{ background: T.cardBg, padding: '20px', borderRadius: '16px', border: `1px solid ${T.border}`, display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: `1px solid ${T.border}`, paddingBottom: '10px' }}>
              <FileText size={18} color="#3b82f6" />
              <h3 style={{ fontSize: '0.95rem', fontWeight: '900', color: T.txtPrimary, margin: 0 }}>
                Header Struk (Bagian Atas)
              </h3>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.76rem', color: T.txtSecondary, fontWeight: '800' }}>Nama Restoran (Judul Struk):</label>
                <input
                  type="text"
                  value={headerFooter.restaurantName || ''}
                  onChange={e => setHeaderFooter({ ...headerFooter, restaurantName: e.target.value })}
                  placeholder="Contoh: AYAM PECAK 2001"
                  style={inputStyle}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.76rem', color: T.txtSecondary, fontWeight: '800' }}>Nama Group / PT (Opsional):</label>
                <input
                  type="text"
                  value={headerFooter.groupName || ''}
                  onChange={e => setHeaderFooter({ ...headerFooter, groupName: e.target.value })}
                  placeholder="Contoh: BAROKAH GROUP"
                  style={inputStyle}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '12px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.76rem', color: T.txtSecondary, fontWeight: '800' }}>Alamat Lengkap Cabang:</label>
                <input
                  type="text"
                  value={headerFooter.address || ''}
                  onChange={e => setHeaderFooter({ ...headerFooter, address: e.target.value })}
                  placeholder="Contoh: Jl. Jendral Sudirman No. 88"
                  style={inputStyle}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.76rem', color: T.txtSecondary, fontWeight: '800' }}>No. Telepon / Hotline:</label>
                <input
                  type="text"
                  value={headerFooter.phone || ''}
                  onChange={e => setHeaderFooter({ ...headerFooter, phone: e.target.value })}
                  placeholder="Contoh: 0812-3456-7890"
                  style={inputStyle}
                />
              </div>
            </div>
          </div>

          {/* 3. FOOTER STRUK (BAGIAN BAWAH) */}
          <div style={{ background: T.cardBg, padding: '20px', borderRadius: '16px', border: `1px solid ${T.border}`, display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: `1px solid ${T.border}`, paddingBottom: '10px' }}>
              <MessageSquare size={18} color="#10b981" />
              <h3 style={{ fontSize: '0.95rem', fontWeight: '900', color: T.txtPrimary, margin: 0 }}>
                Footer Struk (Bagian Bawah)
              </h3>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.76rem', color: T.txtSecondary, fontWeight: '800' }}>Pesan Penutup Baris 1:</label>
                <input
                  type="text"
                  value={headerFooter.footerLine1 || ''}
                  onChange={e => setHeaderFooter({ ...headerFooter, footerLine1: e.target.value })}
                  placeholder="TERIMA KASIH ATAS KUNJUNGAN ANDA"
                  style={inputStyle}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.76rem', color: T.txtSecondary, fontWeight: '800' }}>Catatan Pajak / Baris 2:</label>
                <input
                  type="text"
                  value={headerFooter.footerLine2 || ''}
                  onChange={e => setHeaderFooter({ ...headerFooter, footerLine2: e.target.value })}
                  placeholder="SUDAH TERMASUK PB1 PAJAK RESTORAN"
                  style={inputStyle}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.76rem', color: T.txtSecondary, fontWeight: '800' }}>Nama WiFi Pelanggan (SSID):</label>
                <input
                  type="text"
                  value={headerFooter.wifiSsid || ''}
                  onChange={e => setHeaderFooter({ ...headerFooter, wifiSsid: e.target.value })}
                  placeholder="Contoh: BarokahResto_FreeWiFi"
                  style={inputStyle}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.76rem', color: T.txtSecondary, fontWeight: '800' }}>Password WiFi:</label>
                <input
                  type="text"
                  value={headerFooter.wifiPassword || ''}
                  onChange={e => setHeaderFooter({ ...headerFooter, wifiPassword: e.target.value })}
                  placeholder="Contoh: berkahselalu"
                  style={inputStyle}
                />
              </div>
            </div>
          </div>

          {/* 4. ACCORDION: DESAIN & TIPOGRAFI LANJUTAN (OPSIONAL) */}
          <div style={{ background: T.cardBg, borderRadius: '16px', border: `1px solid ${T.border}`, overflow: 'hidden' }}>
            <div
              onClick={() => setStyleOpen(!styleOpen)}
              style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', userSelect: 'none', background: styleOpen ? (isLight ? '#f8fafc' : '#0b1120') : 'transparent' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sparkles size={16} color="#f59e0b" />
                <span style={{ fontSize: '0.88rem', fontWeight: '800', color: T.txtPrimary }}>
                  Pengaturan Desain &amp; Tipografi Lanjutan (Opsional)
                </span>
              </div>
              {styleOpen ? <ChevronUp size={18} color={T.txtMuted} /> : <ChevronDown size={18} color={T.txtMuted} />}
            </div>

            {styleOpen && (
              <div style={{ padding: '20px', borderTop: `1px solid ${T.border}`, display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
                  
                  {/* Separator Style */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '0.76rem', color: T.txtSecondary, fontWeight: '800' }}>Garis Pemisah Struk:</label>
                    <select
                      value={receiptStyle.separatorStyle || 'dashed'}
                      onChange={e => setRS('separatorStyle', e.target.value)}
                      style={inputStyle}
                    >
                      <option value="dashed" style={{ background: isLight ? '#fff' : '#0f172a' }}>--- Garis Putus-putus</option>
                      <option value="solid" style={{ background: isLight ? '#fff' : '#0f172a' }}>─── Garis Lurus</option>
                      <option value="double" style={{ background: isLight ? '#fff' : '#0f172a' }}>═══ Garis Ganda</option>
                      <option value="stars" style={{ background: isLight ? '#fff' : '#0f172a' }}>*** Karakter Bintang</option>
                    </select>
                  </div>

                  {/* Header Alignment */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '0.76rem', color: T.txtSecondary, fontWeight: '800' }}>Perataan Header:</label>
                    <select
                      value={receiptStyle.headerAlign || 'center'}
                      onChange={e => setRS('headerAlign', e.target.value)}
                      style={inputStyle}
                    >
                      <option value="center" style={{ background: isLight ? '#fff' : '#0f172a' }}>Rata Tengah (Center - Standar)</option>
                      <option value="left" style={{ background: isLight ? '#fff' : '#0f172a' }}>Rata Kiri (Left)</option>
                    </select>
                  </div>

                  {/* Footer Alignment */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '0.76rem', color: T.txtSecondary, fontWeight: '800' }}>Perataan Footer:</label>
                    <select
                      value={receiptStyle.footerAlign || 'center'}
                      onChange={e => setRS('footerAlign', e.target.value)}
                      style={inputStyle}
                    >
                      <option value="center" style={{ background: isLight ? '#fff' : '#0f172a' }}>Rata Tengah (Center - Standar)</option>
                      <option value="left" style={{ background: isLight ? '#fff' : '#0f172a' }}>Rata Kiri (Left)</option>
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 5. ROUTING TARGET PRINTER KATEGORI */}
          <div style={{ background: T.cardBg, padding: '20px', borderRadius: '16px', border: `1px solid ${T.border}`, display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Layers size={18} color="#3b82f6" />
              <h3 style={{ fontSize: '0.95rem', fontWeight: '900', color: T.txtPrimary, margin: 0 }}>
                Routing Printer per Kategori Menu
              </h3>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                <thead>
                  <tr style={{ background: isLight ? '#f8fafc' : '#0b1120', borderBottom: `1px solid ${T.border}`, textAlign: 'left' }}>
                    <th style={{ padding: '10px 12px', color: T.txtMuted }}>Kategori Menu</th>
                    <th style={{ padding: '10px 12px', color: T.txtMuted }}>Target Printer</th>
                  </tr>
                </thead>
                <tbody>
                  {categories.map(cat => {
                    const target = cat.target_printer || cat.printer_type || 'dapur';
                    return (
                      <tr key={cat.id} style={{ borderBottom: `1px solid ${T.border}` }}>
                        <td style={{ padding: '10px 12px', fontWeight: '800', color: T.txtPrimary }}>
                          {cat.name}
                        </td>
                        <td style={{ padding: '8px 12px' }}>
                          <select
                            value={target}
                            onChange={e => handleUpdateCategoryPrinter(cat.id, e.target.value)}
                            style={{ padding: '6px 10px', background: isLight ? '#ffffff' : '#0b1120', border: isLight ? '1px solid #cbd5e1' : '1px solid #334155', borderRadius: '6px', color: isLight ? '#0f172a' : '#f8fafc', fontWeight: '800', fontSize: '0.78rem' }}
                          >
                            <option value="dapur" style={{ background: isLight ? '#fff' : '#0f172a' }}>Printer Dapur (Makanan)</option>
                            <option value="bar" style={{ background: isLight ? '#fff' : '#0f172a' }}>Printer Bar (Minuman)</option>
                            <option value="keduanya" style={{ background: isLight ? '#fff' : '#0f172a' }}>Dapur &amp; Bar (Keduanya)</option>
                          </select>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: REALISTIC LIVE THERMAL RECEIPT PREVIEW */}
        <div style={{ position: 'sticky', top: '24px' }}>
          <ThermalReceiptPreviewSection 
            printerSettings={printerSettings} 
            headerFooter={headerFooter} 
            receiptStyle={receiptStyle} 
            themeMode={themeMode} 
          />
        </div>

      </div>

    </div>
  );
}

function ThermalReceiptPreviewSection({ printerSettings, headerFooter, receiptStyle = {}, themeMode = 'dark' }) {
  const T = getThemePalette(themeMode);
  const isLight = themeMode === 'light';
  const [receiptType, setReceiptType] = useState('cashier');
  const [paperWidth, setPaperWidth] = useState('58');

  const is58mm = paperWidth === '58';
  const widthPx = is58mm ? '300px' : '380px';

  const sepChar = receiptStyle.separatorStyle === 'solid' ? '─'
    : receiptStyle.separatorStyle === 'double' ? '═'
    : receiptStyle.separatorStyle === 'stars'  ? '*'
    : '-';

  return (
    <div style={{ background: T.cardBg, padding: '20px', borderRadius: '16px', border: `1px solid ${T.border}`, display: 'flex', flexDirection: 'column', gap: '16px' }}>
      
      {/* HEADER & CONTROLS */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
        <div>
          <h3 style={{ fontSize: '0.95rem', fontWeight: '900', color: T.txtPrimary, margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Printer size={16} color="#3b82f6" />
            <span>Pratinjau Struk (Live Preview)</span>
          </h3>
        </div>

        <div style={{ display: 'flex', gap: '6px' }}>
          <button
            onClick={() => setPaperWidth('58')}
            style={{ padding: '5px 12px', borderRadius: '6px', border: 'none', background: paperWidth === '58' ? '#2563eb' : (isLight ? '#f1f5f9' : '#0b1120'), color: paperWidth === '58' ? '#fff' : T.txtMuted, fontWeight: '900', fontSize: '0.76rem', cursor: 'pointer' }}
          >
            58mm
          </button>
          <button
            onClick={() => setPaperWidth('80')}
            style={{ padding: '5px 12px', borderRadius: '6px', border: 'none', background: paperWidth === '80' ? '#2563eb' : (isLight ? '#f1f5f9' : '#0b1120'), color: paperWidth === '80' ? '#fff' : T.txtMuted, fontWeight: '900', fontSize: '0.76rem', cursor: 'pointer' }}
          >
            80mm
          </button>
        </div>
      </div>

      {/* TABS FOR PREVIEW TYPE */}
      <div style={{ display: 'flex', background: isLight ? '#f1f5f9' : '#0b1120', padding: '3px', borderRadius: '8px', border: `1px solid ${T.border}` }}>
        <button
          onClick={() => setReceiptType('cashier')}
          style={{ flex: 1, padding: '7px 4px', borderRadius: '6px', border: 'none', background: receiptType === 'cashier' ? '#2563eb' : 'transparent', color: receiptType === 'cashier' ? '#fff' : T.txtMuted, fontWeight: '900', fontSize: '0.74rem', cursor: 'pointer' }}
        >
          Nota Kasir
        </button>
        <button
          onClick={() => setReceiptType('bill')}
          style={{ flex: 1, padding: '7px 4px', borderRadius: '6px', border: 'none', background: receiptType === 'bill' ? '#2563eb' : 'transparent', color: receiptType === 'bill' ? '#fff' : T.txtMuted, fontWeight: '900', fontSize: '0.74rem', cursor: 'pointer' }}
        >
          Tagihan (Bill)
        </button>
        <button
          onClick={() => setReceiptType('kitchen')}
          style={{ flex: 1, padding: '7px 4px', borderRadius: '6px', border: 'none', background: receiptType === 'kitchen' ? '#2563eb' : 'transparent', color: receiptType === 'kitchen' ? '#fff' : T.txtMuted, fontWeight: '900', fontSize: '0.74rem', cursor: 'pointer' }}
        >
          Dapur / Bar
        </button>
      </div>

      {/* PAPER SIMULATION */}
      <div style={{ display: 'flex', justifyContent: 'center', padding: '16px 0', background: '#0b1120', borderRadius: '12px' }}>
        <div style={{
          width: widthPx,
          background: '#ffffff',
          color: '#111827',
          padding: '20px 16px',
          fontFamily: "'Courier New', Courier, monospace",
          fontSize: '0.78rem',
          lineHeight: '1.4',
          borderRadius: '4px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
          transition: 'width 0.2s ease'
        }}>

          {/* 1. NOTA KASIR RESMI */}
          {receiptType === 'cashier' && (
            <div>
              {/* HEADER */}
              <div style={{ textAlign: receiptStyle.headerAlign || 'center' }}>
                <div style={{ fontSize: '0.98rem', fontWeight: '900', letterSpacing: '0.5px' }}>
                  {headerFooter?.restaurantName || 'MRIS RESTORAN'}
                </div>
                {headerFooter?.groupName && (
                  <div style={{ fontSize: '0.74rem', fontWeight: '700', color: '#4b5563' }}>{headerFooter.groupName}</div>
                )}
                {headerFooter?.address && (
                  <div style={{ fontSize: '0.70rem', color: '#4b5563' }}>{headerFooter.address}</div>
                )}
                {headerFooter?.phone && (
                  <div style={{ fontSize: '0.70rem', color: '#4b5563' }}>Telp: {headerFooter.phone}</div>
                )}
                <div style={{ fontSize: '0.75rem', fontWeight: '800', marginTop: '4px' }}>NOTA PEMBAYARAN</div>
              </div>

              <div style={{ margin: '8px 0', textAlign: 'center', color: '#9ca3af', overflow: 'hidden' }}>
                {sepChar.repeat(36)}
              </div>

              {/* META INFO */}
              <div style={{ fontSize: '0.72rem', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>No. Struk:</span>
                  <span style={{ fontWeight: '700' }}>TX-POS-8951487</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Tanggal:</span>
                  <span>21/08/2026 12:45:10</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Tipe / Meja:</span>
                  <span style={{ fontWeight: '700' }}>Dine In (Meja 04)</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Pelanggan:</span>
                  <span style={{ fontWeight: '700' }}>Bpk. Hendra (VIP)</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Kasir:</span>
                  <span>Widia</span>
                </div>
              </div>

              <div style={{ margin: '8px 0', textAlign: 'center', color: '#9ca3af', overflow: 'hidden' }}>
                {sepChar.repeat(36)}
              </div>

              {/* ITEMS */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: '800' }}>
                    <span>2x AYAM GORENG [PAHA]</span>
                    <span>34.000</span>
                  </div>
                  <div style={{ fontSize: '0.68rem', color: '#6b7280', paddingLeft: '8px' }}>* Sambal Pecak Pedas</div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: '800' }}>
                  <span>2x NASI PUTIH</span>
                  <span>12.000</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: '800' }}>
                  <span>2x ES TEH MANIS</span>
                  <span>10.000</span>
                </div>
              </div>

              <div style={{ margin: '8px 0', textAlign: 'center', color: '#9ca3af', overflow: 'hidden' }}>
                {sepChar.repeat(36)}
              </div>

              {/* TOTALS */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem' }}>
                  <span>Subtotal:</span>
                  <span>56.000</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: '900', fontSize: '0.90rem' }}>
                  <span>TOTAL:</span>
                  <span>Rp 56.000</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem' }}>
                  <span>Tunai (Cash):</span>
                  <span>Rp 100.000</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: '800', fontSize: '0.82rem', color: '#047857' }}>
                  <span>Kembalian:</span>
                  <span>Rp 44.000</span>
                </div>
              </div>

              <div style={{ margin: '12px 0 8px 0', textAlign: 'center', color: '#9ca3af', overflow: 'hidden' }}>
                {sepChar.repeat(36)}
              </div>

              {/* FOOTER */}
              <div style={{ textAlign: receiptStyle.footerAlign || 'center', fontSize: '0.70rem', color: '#374151' }}>
                {headerFooter?.footerLine1 && (
                  <div style={{ fontWeight: '800' }}>{headerFooter.footerLine1}</div>
                )}
                {headerFooter?.footerLine2 && (
                  <div style={{ marginTop: '2px' }}>{headerFooter.footerLine2}</div>
                )}
                {headerFooter?.wifiSsid && (
                  <div style={{ marginTop: '6px', fontSize: '0.68rem', color: '#1f2937' }}>
                    WIFI: <strong>{headerFooter.wifiSsid}</strong> | PASS: <strong>{headerFooter.wifiPassword || '-'}</strong>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 2. TAGIHAN SEMENTARA (BILL) */}
          {receiptType === 'bill' && (
            <div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '0.95rem', fontWeight: '900' }}>{headerFooter?.restaurantName || 'MRIS RESTORAN'}</div>
                <div style={{ fontSize: '0.75rem', fontWeight: '800', marginTop: '2px' }}>TAGIHAN SEMENTARA</div>
              </div>
              <div style={{ margin: '8px 0', textAlign: 'center', color: '#9ca3af' }}>{sepChar.repeat(36)}</div>
              <div style={{ fontSize: '0.72rem', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Meja:</span>
                  <span style={{ fontWeight: '700' }}>Meja 04</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Pelanggan:</span>
                  <span style={{ fontWeight: '700' }}>Bpk. Hendra</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Waktu:</span>
                  <span>21/08/2026 12:45</span>
                </div>
              </div>
              <div style={{ margin: '8px 0', textAlign: 'center', color: '#9ca3af' }}>{sepChar.repeat(36)}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>2x Ayam Goreng Pecak</span>
                  <span>34.000</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>2x Nasi Putih</span>
                  <span>12.000</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>2x Es Teh Manis</span>
                  <span>10.000</span>
                </div>
              </div>
              <div style={{ margin: '8px 0', textAlign: 'center', color: '#9ca3af' }}>{sepChar.repeat(36)}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: '900', fontSize: '0.85rem' }}>
                <span>TOTAL:</span>
                <span>Rp 56.000</span>
              </div>
              <div style={{ margin: '10px 0 6px 0', textAlign: 'center', color: '#9ca3af' }}>{sepChar.repeat(36)}</div>
              <div style={{ textAlign: 'center', fontSize: '0.68rem', color: '#b91c1c', fontWeight: '800' }}>
                *** PERINGATAN KERAS ***<br/>
                STRUK INI BUKAN STRUK PEMBAYARAN<br/>
                JANGAN DIBAYAR SEBELUM DIBERI STRUK RESMI KASIR
              </div>
            </div>
          )}

          {/* 3. STRUK DAPUR */}
          {receiptType === 'kitchen' && (
            <div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '0.95rem', fontWeight: '900' }}>{headerFooter?.restaurantName || 'MRIS RESTORAN'}</div>
                <div style={{ fontSize: '0.75rem', fontWeight: '800', marginTop: '2px' }}>STRUK DAPUR (KITCHEN TICKET)</div>
              </div>
              <div style={{ margin: '8px 0', textAlign: 'center', color: '#9ca3af' }}>{sepChar.repeat(36)}</div>
              <div style={{ fontSize: '0.72rem', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>No. Order:</span>
                  <span>TO-17853-04</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Meja:</span>
                  <span style={{ fontWeight: '900', color: '#1d4ed8' }}>MEJA 04 (DINE IN)</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Pelanggan:</span>
                  <span style={{ fontWeight: '700' }}>Bpk. Hendra</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Pelayan:</span>
                  <span>Rian • 12:45</span>
                </div>
              </div>
              <div style={{ margin: '8px 0', textAlign: 'center', color: '#9ca3af' }}>{sepChar.repeat(36)}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div>
                  <div style={{ fontSize: '0.90rem', fontWeight: '900' }}>2x AYAM GORENG [PAHA]</div>
                  <div style={{ fontSize: '0.72rem', color: '#dc2626', fontWeight: '700' }}>* Sambal Pecak Pedas</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.90rem', fontWeight: '900' }}>2x NASI PUTIH</div>
                </div>
              </div>
              <div style={{ margin: '12px 0 6px 0', textAlign: 'center', color: '#9ca3af' }}>{sepChar.repeat(36)}</div>
              <div style={{ textAlign: 'center', fontSize: '0.68rem', color: '#4b5563' }}>
                *** UNTUK KOKI / DAPUR (TANPA HARGA) ***
              </div>
              <div style={{ textAlign: 'center', fontSize: '0.66rem', color: '#b91c1c', fontWeight: '800', marginTop: '6px' }}>
                *** PERINGATAN KERAS ***<br/>
                STRUK INI BUKAN STRUK PEMBAYARAN<br/>
                JANGAN DIBAYAR SEBELUM DIBERI STRUK RESMI KASIR
              </div>
            </div>
          )}

        </div>
      </div>

    </div>
  );
}
