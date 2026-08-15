import React, { useState } from 'react';
import { Printer, Save, CheckCircle, Wifi, Bluetooth, RefreshCw, Layers, ShieldCheck } from 'lucide-react';
import { getThemePalette } from '../../utils/themeUtils';

export default function PrinterThermalSettingsPage({ masterData, setMasterData, themeMode = 'dark' }) {
  const T = getThemePalette(themeMode);
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
    const outletAddr = foundOutlet?.address || foundOutlet?.alamat || 'Jl. Pemuda No. 88, Surabaya';
    const outletPhone = foundOutlet?.phone || foundOutlet?.telepon || '(031) 555-8899';
    const groupName = foundOutlet?.group_name || foundOutlet?.company_name || masterData?.companyName || 'BAROKAH GROUP INDONESIA';

    return {
      restaurantName: 'BUKTI PEMBAYARAN',
      groupName: outletName || groupName,
      address: outletAddr,
      phone: outletPhone,
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
    const outletAddr = foundOutlet?.address || foundOutlet?.alamat || 'Jl. Pemuda No. 88, Surabaya';
    const outletPhone = foundOutlet?.phone || foundOutlet?.telepon || '(031) 555-8899';

    setHeaderFooter(prev => ({
      ...prev,
      groupName: outletName,
      address: outletAddr,
      phone: outletPhone
    }));
  };

  const [savedSuccessToast, setSavedSuccessToast] = useState(false);
  const [styleOpen, setStyleOpen] = useState(true);

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

    const updatedSettings = {
      ...printerSettings,
      headerFooter: headerFooter,
      headerFooterByOutlet: updatedHeaderFooterByOutlet
    };

    setMasterData(prev => {
      const updatedOutlets = (prev.outlets || []).map(o => {
        if (String(o.id) === String(selectedOutletId)) {
          return {
            ...o,
            address: headerFooter.address || o.address,
            phone: headerFooter.phone || o.phone
          };
        }
        return o;
      });

      return {
        ...prev,
        _lastUpdated: Date.now(),
        outlets: updatedOutlets,
        printerSettings: { ...updatedSettings, receiptStyle }
      };
    });

    setHeaderFooterByOutlet(updatedHeaderFooterByOutlet);
    setSavedSuccessToast(true);
    setTimeout(() => setSavedSuccessToast(false), 3000);
  };

  const handleUpdateCategoryPrinter = (catId, newPrinterTarget) => {
    setMasterData(prev => {
      const cats = prev.categories || prev.menuCategories || [];
      const updatedCats = cats.map(c => {
        if (String(c.id) === String(catId)) {
          return { ...c, target_printer: newPrinterTarget, printer_type: newPrinterTarget };
        }
        return c;
      });
      return {
        ...prev,
        categories: updatedCats,
        menuCategories: updatedCats
      };
    });
  };

  return (
    <div style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '14px', color: T.txtPrimary, background: T.pageBg, minHeight: '100vh' }}>
      
      {/* HEADER PAGE */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '0.96rem', fontWeight: '900', color: T.txtPrimary, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Printer size={20} color={T.info} />
            <span>Pengaturan Printer &amp; Thermal Output POS Kasir</span>
          </h2>
          <p style={{ color: T.txtSecondary, fontSize: '0.72rem', marginTop: '2px', margin: 0 }}>
            Kelola printer dapur, printer bar, printer kasir, routing kategori menu, dan mode cetak otomatis.
          </p>
        </div>

        <button
          onClick={handleSaveSettings}
          className="btn-primary"
          style={{ padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '6px', background: T.primaryBtn, borderRadius: '8px', fontSize: '0.72rem', fontWeight: '900', cursor: 'pointer', color: '#ffffff', border: 'none', boxShadow: `0 2px 8px ${T.primaryBtnShadow}` }}
        >
          <Save size={14} />
          <span>Simpan Pengaturan</span>
        </button>
      </div>

      {savedSuccessToast && (
        <div style={{ background: T.successBg, border: `1px solid ${T.successBorder}`, color: T.success, padding: '12px 16px', borderRadius: '12px', fontSize: '0.85rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <CheckCircle size={20} color={T.success} />
          <span>Pengaturan Printer Thermal Berhasil Disimpan &amp; Disinkronkan ke POS Kasir Mobile!</span>
        </div>
      )}

      {/* PRINTER HARDWARE CONFIGURATION GRID */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
        
        {/* PRINTER DAPUR (KITCHEN) */}
        <div className="glass-card" style={{ padding: '20px', background: T.cardBg, borderRadius: '16px', border: `1px solid ${T.border}`, display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: '800', color: T.txtPrimary, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              Printer Dapur (Kitchen)
            </h3>
            <span style={{ fontSize: '0.72rem', background: T.infoBg, color: T.info, padding: '4px 8px', borderRadius: '6px', fontWeight: '800' }}>
              Struk Kerja Koki
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '0.78rem', color: T.txtSecondary, fontWeight: '700' }}>Alamat IP / Nama Bluetooth Printer:</label>
            <input
              type="text"
              value={printerSettings.kitchenPrinter?.ip || ''}
              onChange={e => setPrinterSettings({ ...printerSettings, kitchenPrinter: { ...printerSettings.kitchenPrinter, ip: e.target.value } })}
              placeholder="Contoh: 192.168.1.200 atau RPP02N"
              style={{ padding: '10px', background: T.inputBg, border: `1px solid ${T.border}`, borderRadius: '8px', color: T.txtPrimary, fontSize: '0.85rem' }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '0.78rem', color: T.txtSecondary, fontWeight: '700' }}>Ukuran Kertas Thermal:</label>
            <select
              value={printerSettings.kitchenPrinter?.paperWidth || '80'}
              onChange={e => setPrinterSettings({ ...printerSettings, kitchenPrinter: { ...printerSettings.kitchenPrinter, paperWidth: e.target.value } })}
              style={{ padding: '10px', background: T.inputBg, border: `1px solid ${T.border}`, borderRadius: '8px', color: T.txtPrimary, fontSize: '0.85rem' }}
            >
              <option value="58">58mm (Kecil - 32 Karakter)</option>
              <option value="80">80mm (Besar - 48 Karakter)</option>
            </select>
          </div>
        </div>

        {/* PRINTER BAR (MINUMAN) */}
        <div className="glass-card" style={{ padding: '20px', background: T.cardBg, borderRadius: '16px', border: `1px solid ${T.border}`, display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: '800', color: T.txtPrimary, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              Printer Bar (Minuman)
            </h3>
            <span style={{ fontSize: '0.72rem', background: T.infoBg, color: T.info, padding: '4px 8px', borderRadius: '6px', fontWeight: '800' }}>
              Struk Bartender
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '0.78rem', color: T.txtSecondary, fontWeight: '700' }}>Alamat IP / Nama Bluetooth Printer:</label>
            <input
              type="text"
              value={printerSettings.barPrinter?.ip || ''}
              onChange={e => setPrinterSettings({ ...printerSettings, barPrinter: { ...printerSettings.barPrinter, ip: e.target.value } })}
              placeholder="Contoh: 192.168.1.201 atau BT-BAR"
              style={{ padding: '10px', background: T.inputBg, border: `1px solid ${T.border}`, borderRadius: '8px', color: T.txtPrimary, fontSize: '0.85rem' }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '0.78rem', color: T.txtSecondary, fontWeight: '700' }}>Ukuran Kertas Thermal:</label>
            <select
              value={printerSettings.barPrinter?.paperWidth || '58'}
              onChange={e => setPrinterSettings({ ...printerSettings, barPrinter: { ...printerSettings.barPrinter, paperWidth: e.target.value } })}
              style={{ padding: '10px', background: T.inputBg, border: `1px solid ${T.border}`, borderRadius: '8px', color: T.txtPrimary, fontSize: '0.85rem' }}
            >
              <option value="58">58mm (Kecil - 32 Karakter)</option>
              <option value="80">80mm (Besar - 48 Karakter)</option>
            </select>
          </div>
        </div>

        {/* PRINTER KASIR (RECEIPT & BILL) */}
        <div className="glass-card" style={{ padding: '20px', background: T.cardBg, borderRadius: '16px', border: `1px solid ${T.border}`, display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: '800', color: T.txtPrimary, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              Printer Kasir (Nota Pembayaran)
            </h3>
            <span style={{ fontSize: '0.72rem', background: T.infoBg, color: T.info, padding: '4px 8px', borderRadius: '6px', fontWeight: '800' }}>
              Nota Pelanggan
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '0.78rem', color: T.txtSecondary, fontWeight: '700' }}>Alamat IP / Nama Bluetooth Printer:</label>
            <input
              type="text"
              value={printerSettings.cashierPrinter?.ip || ''}
              onChange={e => setPrinterSettings({ ...printerSettings, cashierPrinter: { ...printerSettings.cashierPrinter, ip: e.target.value } })}
              placeholder="Contoh: 192.168.1.202 atau Thermal_Printer_Kasir"
              style={{ padding: '10px', background: T.inputBg, border: `1px solid ${T.border}`, borderRadius: '8px', color: T.txtPrimary, fontSize: '0.85rem' }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '0.78rem', color: T.txtSecondary, fontWeight: '700' }}>Ukuran Kertas Thermal:</label>
            <select
              value={printerSettings.cashierPrinter?.paperWidth || '58'}
              onChange={e => setPrinterSettings({ ...printerSettings, cashierPrinter: { ...printerSettings.cashierPrinter, paperWidth: e.target.value } })}
              style={{ padding: '10px', background: T.inputBg, border: `1px solid ${T.border}`, borderRadius: '8px', color: T.txtPrimary, fontSize: '0.85rem' }}
            >
              <option value="58">58mm (Kecil - 32 Karakter)</option>
              <option value="80">80mm (Besar - 48 Karakter)</option>
            </select>
          </div>
        </div>

      </div>

      {/* CATEGORY PRINTER TARGET ALLOCATION TABLE */}
      <div className="glass-card" style={{ padding: '24px', background: T.cardBg, borderRadius: '16px', border: `1px solid ${T.border}`, display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Layers size={22} color={T.accentGold} />
          <h3 style={{ fontSize: '1.1rem', fontWeight: '800', color: T.txtPrimary, margin: 0 }}>
            Routing Target Printer per Kategori Menu
          </h3>
        </div>
        <p style={{ fontSize: '0.80rem', color: T.txtSecondary, margin: 0 }}>
          Atur ke printer mana pesanan item pada kategori menu berikut akan otomatis dikirim (Dapur / Bar / Keduanya).
        </p>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', background: T.tableBg }}>
            <thead>
              <tr style={{ background: T.tableHeaderBg, borderBottom: `1px solid ${T.border}`, textAlign: 'left' }}>
                <th style={{ padding: '12px', color: T.txtSecondary }}>Kategori Menu</th>
                <th style={{ padding: '12px', color: T.txtSecondary }}>Target Printer Output</th>
                <th style={{ padding: '12px', color: T.txtSecondary }}>Keterangan Struk</th>
              </tr>
            </thead>
            <tbody>
              {categories.map(cat => {
                const target = cat.target_printer || cat.printer_type || 'dapur';
                return (
                  <tr key={cat.id} style={{ borderBottom: `1px solid ${T.border}` }}>
                    <td style={{ padding: '12px', fontWeight: '800', color: T.txtPrimary }}>
                      {cat.name}
                    </td>
                    <td style={{ padding: '12px' }}>
                      <select
                        value={target}
                        onChange={e => handleUpdateCategoryPrinter(cat.id, e.target.value)}
                        style={{ padding: '8px 12px', background: T.inputBg, border: `1px solid ${T.border}`, borderRadius: '8px', color: T.txtPrimary, fontWeight: '800', cursor: 'pointer' }}
                      >
                        <option value="dapur">Printer Dapur (Kitchen)</option>
                        <option value="bar">Printer Bar (Beverages)</option>
                        <option value="keduanya">Dapur &amp; Bar (Keduanya)</option>
                      </select>
                    </td>
                    <td style={{ padding: '12px', color: T.txtMuted, fontSize: '0.78rem' }}>
                      {target === 'dapur' && 'Item makanan akan dicetak di Printer Dapur tanpa harga.'}
                      {target === 'bar' && 'Item minuman akan dicetak di Printer Bar tanpa harga.'}
                      {target === 'keduanya' && 'Item akan dicetak di Dapur dan Bar sekaligus.'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* EDIT HEADER & FOOTER STRUK THERMAL */}
      <div className="glass-card" style={{ padding: '24px', background: T.cardBg, borderRadius: '16px', border: `1px solid ${T.border}`, display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '800', color: T.txtPrimary, margin: '0 0 4px 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span>Pengaturan Header &amp; Footer Struk Restoran</span>
            </h3>
            <p style={{ fontSize: '0.80rem', color: T.txtSecondary, margin: 0 }}>
              Kustomisasi tulisan nama restoran, alamat, telepon, ucapan terima kasih, dan info WiFi pada cetakan struk thermal.
            </p>
          </div>

          <button
            onClick={handleSaveSettings}
            style={{ padding: '8px 16px', background: T.primaryBtn, border: 'none', borderRadius: '8px', color: '#ffffff', fontWeight: '800', fontSize: '0.82rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', boxShadow: `0 2px 8px ${T.primaryBtnShadow}` }}
          >
            <Save size={16} />
            <span>Simpan Header/Footer</span>
          </button>
        </div>

        {/* OUTLET SELECTOR & SYNC BAR */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap', background: T.cardBg2, padding: '12px 16px', borderRadius: '12px', border: `1px solid ${T.border}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.86rem', fontWeight: '800', color: T.txtPrimary, display: 'flex', alignItems: 'center', gap: '6px' }}>
              Pilih Outlet Restoran:
            </span>
            <select
              value={selectedOutletId}
              onChange={e => handleSelectOutlet(e.target.value)}
              style={{ padding: '8px 14px', background: T.inputBg, border: `1px solid ${T.accentGold}`, borderRadius: '8px', color: T.txtPrimary, fontWeight: '800', fontSize: '0.86rem', cursor: 'pointer' }}
            >
              {outlets.length === 0 ? (
                <option value="1">Ayam Pecak 2001 Seafood</option>
              ) : (
                outlets.map(o => (
                  <option key={o.id} value={String(o.id)}>
                    {o.name || o.branch_name}
                  </option>
                ))
              )}
            </select>
          </div>

          <button
            type="button"
            onClick={handleSyncFromDataMaster}
            style={{ padding: '8px 14px', background: T.infoBg, border: `1px solid ${T.info}`, borderRadius: '8px', color: T.info, fontWeight: '800', fontSize: '0.78rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
            title="Isi otomatis Nama, Alamat, & Telepon dari Halaman Data Master untuk Outlet ini"
          >
            <RefreshCw size={14} />
            <span>Sync Data dari Master Outlet</span>
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
          {/* HEADER INPUTS */}
          <div style={{ background: T.cardBg2, padding: '16px', borderRadius: '12px', border: `1px solid ${T.border}`, display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ fontSize: '0.85rem', fontWeight: '800', color: T.info }}>Header Struk (Bagian Atas)</div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '0.74rem', color: T.txtSecondary, fontWeight: '700' }}>Nama Restoran (Judul Utama):</label>
              <input
                type="text"
                value={headerFooter.restaurantName}
                onChange={e => setHeaderFooter({ ...headerFooter, restaurantName: e.target.value })}
                placeholder="MRIS RESTORAN"
                style={{ padding: '8px 12px', background: T.inputBg, border: `1px solid ${T.border}`, borderRadius: '6px', color: T.txtPrimary, fontSize: '0.82rem' }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '0.74rem', color: T.txtSecondary, fontWeight: '700' }}>Nama Perusahaan / Group:</label>
              <input
                type="text"
                value={headerFooter.groupName}
                onChange={e => setHeaderFooter({ ...headerFooter, groupName: e.target.value })}
                placeholder="BAROKAH GROUP INDONESIA"
                style={{ padding: '8px 12px', background: T.inputBg, border: `1px solid ${T.border}`, borderRadius: '6px', color: T.txtPrimary, fontSize: '0.82rem' }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '0.74rem', color: T.txtSecondary, fontWeight: '700' }}>Alamat Lengkap Restoran:</label>
              <input
                type="text"
                value={headerFooter.address}
                onChange={e => setHeaderFooter({ ...headerFooter, address: e.target.value })}
                placeholder="Jl. Pemuda No. 88, Surabaya"
                style={{ padding: '8px 12px', background: T.inputBg, border: `1px solid ${T.border}`, borderRadius: '6px', color: T.txtPrimary, fontSize: '0.82rem' }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '0.74rem', color: T.txtSecondary, fontWeight: '700' }}>No. Telepon / Hotline:</label>
              <input
                type="text"
                value={headerFooter.phone}
                onChange={e => setHeaderFooter({ ...headerFooter, phone: e.target.value })}
                placeholder="(031) 555-8899"
                style={{ padding: '8px 12px', background: T.inputBg, border: `1px solid ${T.border}`, borderRadius: '6px', color: T.txtPrimary, fontSize: '0.82rem' }}
              />
            </div>
          </div>

          {/* FOOTER INPUTS */}
          <div style={{ background: T.cardBg2, padding: '16px', borderRadius: '12px', border: `1px solid ${T.border}`, display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ fontSize: '0.85rem', fontWeight: '800', color: T.success }}>Footer Struk (Bagian Bawah)</div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '0.74rem', color: T.txtSecondary, fontWeight: '700' }}>Pesan Ucapan Baris 1:</label>
              <input
                type="text"
                value={headerFooter.footerLine1}
                onChange={e => setHeaderFooter({ ...headerFooter, footerLine1: e.target.value })}
                placeholder="TERIMA KASIH ATAS KUNJUNGAN ANDA"
                style={{ padding: '8px 12px', background: T.inputBg, border: `1px solid ${T.border}`, borderRadius: '6px', color: T.txtPrimary, fontSize: '0.82rem' }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '0.74rem', color: T.txtSecondary, fontWeight: '700' }}>Pesan Ucapan Baris 2:</label>
              <input
                type="text"
                value={headerFooter.footerLine2}
                onChange={e => setHeaderFooter({ ...headerFooter, footerLine2: e.target.value })}
                placeholder="SUDAH TERMASUK PB1 PAJAK RESTORAN"
                style={{ padding: '8px 12px', background: T.inputBg, border: `1px solid ${T.border}`, borderRadius: '6px', color: T.txtPrimary, fontSize: '0.82rem' }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '0.74rem', color: T.txtSecondary, fontWeight: '700' }}>Nama SSID WiFi Restoran:</label>
              <input
                type="text"
                value={headerFooter.wifiSsid}
                onChange={e => setHeaderFooter({ ...headerFooter, wifiSsid: e.target.value })}
                placeholder="BarokahResto_5G"
                style={{ padding: '8px 12px', background: T.inputBg, border: `1px solid ${T.border}`, borderRadius: '6px', color: T.txtPrimary, fontSize: '0.82rem' }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '0.74rem', color: T.txtSecondary, fontWeight: '700' }}>Password WiFi Restoran:</label>
              <input
                type="text"
                value={headerFooter.wifiPassword}
                onChange={e => setHeaderFooter({ ...headerFooter, wifiPassword: e.target.value })}
                placeholder="berkahselalu"
                style={{ padding: '8px 12px', background: T.inputBg, border: `1px solid ${T.border}`, borderRadius: '6px', color: T.txtPrimary, fontSize: '0.82rem' }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* DESAIN & TIPOGRAFI STRUK */}
      <div className="glass-card" style={{ padding: '20px', background: T.cardBg, borderRadius: '16px', border: `1px solid ${T.border}`, display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div
          onClick={() => setStyleOpen(o => !o)}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', userSelect: 'none' }}
        >
          <h3 style={{ fontSize: '1.05rem', fontWeight: '800', color: T.txtPrimary, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>Desain &amp; Tipografi Struk</span>
            <span style={{ fontSize: '0.70rem', background: T.infoBg, color: T.info, padding: '2px 8px', borderRadius: '20px', fontWeight: '700' }}>LIVE PREVIEW</span>
          </h3>
          <span style={{ color: T.txtSecondary, fontSize: '1.1rem', transition: 'transform 0.2s', display: 'inline-block', transform: styleOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>▾</span>
        </div>

        {styleOpen && (() => {
          const szOptions = [
            { key: 'xsmall', label: 'XS' },
            { key: 'small',  label: 'S'  },
            { key: 'medium', label: 'M'  },
            { key: 'large',  label: 'L'  },
            { key: 'xlarge', label: 'XL' },
            { key: 'xxlarge',label: '2X' },
          ];
          const SizePicker = ({ label, stateKey }) => (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
              <span style={{ fontSize: '0.74rem', color: T.txtSecondary, fontWeight: '700', minWidth: '120px' }}>{label}</span>
              <div style={{ display: 'flex', gap: '3px' }}>
                {szOptions.map(o => (
                  <button key={o.key} onClick={() => setRS(stateKey, o.key)}
                    style={{ padding: '3px 7px', borderRadius: '5px', border: receiptStyle[stateKey] === o.key ? `2px solid ${T.info}` : `1px solid ${T.border}`, background: receiptStyle[stateKey] === o.key ? T.infoBg : T.cardBg2, color: receiptStyle[stateKey] === o.key ? T.info : T.txtSecondary, fontWeight: '800', fontSize: '0.68rem', cursor: 'pointer' }}>
                    {o.label}
                  </button>
                ))}
              </div>
            </div>
          );
          const AlignPicker = ({ label, stateKey }) => (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
              <span style={{ fontSize: '0.74rem', color: T.txtSecondary, fontWeight: '700', minWidth: '120px' }}>{label}</span>
              <div style={{ display: 'flex', gap: '3px' }}>
                {[['left','←'],['center','≡'],['right','→']].map(([v,lbl]) => (
                  <button key={v} onClick={() => setRS(stateKey, v)}
                    style={{ padding: '3px 10px', borderRadius: '5px', border: receiptStyle[stateKey] === v ? `2px solid ${T.accentGold}` : `1px solid ${T.border}`, background: receiptStyle[stateKey] === v ? 'rgba(255,193,7,0.15)' : T.cardBg2, color: receiptStyle[stateKey] === v ? T.accentGold : T.txtSecondary, fontWeight: '900', fontSize: '0.82rem', cursor: 'pointer' }}>
                    {lbl}
                  </button>
                ))}
              </div>
            </div>
          );
          const Toggle = ({ label, stateKey }) => (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
              <span style={{ fontSize: '0.74rem', color: T.txtSecondary, fontWeight: '700' }}>{label}</span>
              <button onClick={() => setRS(stateKey, !receiptStyle[stateKey])}
                style={{ padding: '4px 14px', borderRadius: '20px', border: 'none', background: receiptStyle[stateKey] ? T.success : T.border, color: receiptStyle[stateKey] ? '#fff' : T.txtSecondary, fontWeight: '800', fontSize: '0.72rem', cursor: 'pointer', transition: 'all 0.2s' }}>
                {receiptStyle[stateKey] ? 'AKTIF' : 'MATI'}
              </button>
            </div>
          );
          const sepOptions = [
            { key: 'dashed', label: '--- Putus-putus' },
            { key: 'solid',  label: '─── Garis Penuh' },
            { key: 'double', label: '═══ Ganda'        },
            { key: 'stars',  label: '*** Bintang'      },
          ];
          return (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>

              {/* UKURAN HURUF */}
              <div style={{ background: T.cardBg2, padding: '16px', borderRadius: '12px', border: `1px solid ${T.border}`, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ fontSize: '0.82rem', fontWeight: '800', color: T.info, marginBottom: '4px' }}>Ukuran Huruf (Font Size)</div>
                <SizePicker label="Judul Struk" stateKey="titleSize" />
                <SizePicker label="Nama Outlet" stateKey="groupSize" />
                <SizePicker label="Alamat &amp; Telp" stateKey="addressSize" />
                <SizePicker label="Info Transaksi" stateKey="metaSize" />
                <SizePicker label="Nama Menu" stateKey="itemSize" />
                <SizePicker label="Total Bayar" stateKey="totalSize" />
                <SizePicker label="Footer" stateKey="footerSize" />
              </div>

              {/* ALIGNMENT + BOLD + SEPARATOR */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

                {/* ALIGNMENT */}
                <div style={{ background: T.cardBg2, padding: '16px', borderRadius: '12px', border: `1px solid ${T.border}`, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ fontSize: '0.82rem', fontWeight: '800', color: T.accentGold, marginBottom: '4px' }}>Perataan Teks (Alignment)</div>
                  <AlignPicker label="Header (Judul)" stateKey="headerAlign" />
                  <AlignPicker label="Footer (Bawah)" stateKey="footerAlign" />
                </div>

                {/* BOLD TOGGLES */}
                <div style={{ background: T.cardBg2, padding: '16px', borderRadius: '12px', border: `1px solid ${T.border}`, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ fontSize: '0.82rem', fontWeight: '800', color: T.success, marginBottom: '4px' }}>Ketebalan Huruf (Bold)</div>
                  <Toggle label="Judul Struk Bold" stateKey="titleBold" />
                  <Toggle label="Nama Menu Bold" stateKey="itemBold" />
                  <Toggle label="Total Bayar Bold" stateKey="totalBold" />
                  <Toggle label="Tampilkan Catatan Item" stateKey="showItemNotes" />
                </div>

                {/* SEPARATOR */}
                <div style={{ background: T.cardBg2, padding: '16px', borderRadius: '12px', border: `1px solid ${T.border}`, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ fontSize: '0.82rem', fontWeight: '800', color: T.txtPrimary, marginBottom: '4px' }}>〰 Garis Pemisah</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {sepOptions.map(s => (
                      <button key={s.key} onClick={() => setRS('separatorStyle', s.key)}
                        style={{ padding: '5px 10px', borderRadius: '6px', border: receiptStyle.separatorStyle === s.key ? `2px solid ${T.info}` : `1px solid ${T.border}`, background: receiptStyle.separatorStyle === s.key ? T.infoBg : T.cardBg, color: receiptStyle.separatorStyle === s.key ? T.info : T.txtSecondary, fontWeight: '700', fontSize: '0.72rem', cursor: 'pointer' }}>
                        {s.label}
                      </button>
                    ))}
                  </div>
                  {/* PRICE LAYOUT */}
                  <div style={{ fontSize: '0.78rem', fontWeight: '700', color: T.txtSecondary, marginTop: '4px' }}>Layout Harga Item:</div>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    {[['inline','Sebaris (Qty Nama Harga Total)'],['twoLine','2 Baris (Nama atas, Harga bawah)']].map(([v,lbl]) => (
                      <button key={v} onClick={() => setRS('priceLayout', v)}
                        style={{ flex: 1, padding: '5px 8px', borderRadius: '6px', border: receiptStyle.priceLayout === v ? `2px solid ${T.info}` : `1px solid ${T.border}`, background: receiptStyle.priceLayout === v ? T.infoBg : T.cardBg, color: receiptStyle.priceLayout === v ? T.info : T.txtSecondary, fontWeight: '700', fontSize: '0.68rem', cursor: 'pointer', textAlign: 'center' }}>
                        {lbl}
                      </button>
                    ))}
                  </div>
                </div>

                {/* LETTER SPACING & LINE HEIGHT */}
                <div style={{ background: T.cardBg2, padding: '16px', borderRadius: '12px', border: `1px solid ${T.border}`, display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ fontSize: '0.82rem', fontWeight: '800', color: T.txtPrimary, marginBottom: '2px' }}>↔ Jarak Huruf &amp; ↕ Jarak Baris</div>

                  {/* LETTER SPACING */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ fontSize: '0.74rem', color: T.txtSecondary, fontWeight: '700' }}>↔ Jarak Huruf Kiri-Kanan (Letter Spacing)</div>
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                      {[
                        { key: 'tight',   label: 'Rapat',   val: '-0.5px' },
                        { key: 'normal',  label: 'Normal',  val: '0px'    },
                        { key: 'wide',    label: 'Lebar',   val: '0.8px'  },
                        { key: 'wider',   label: 'Lebih',   val: '1.5px'  },
                        { key: 'widest',  label: 'Renggang',val: '3px'    },
                      ].map(o => (
                        <button key={o.key} onClick={() => setRS('letterSpacing', o.key)}
                          title={`letter-spacing: ${o.val}`}
                          style={{ padding: '4px 9px', borderRadius: '5px', border: receiptStyle.letterSpacing === o.key ? `2px solid ${T.info}` : `1px solid ${T.border}`, background: receiptStyle.letterSpacing === o.key ? T.infoBg : T.cardBg2, color: receiptStyle.letterSpacing === o.key ? T.info : T.txtSecondary, fontWeight: '800', fontSize: '0.68rem', cursor: 'pointer' }}>
                          {o.label}
                        </button>
                      ))}
                    </div>
                    <div style={{ fontSize: '0.68rem', color: T.txtSecondary, opacity: 0.7, fontFamily: 'monospace' }}>
                      preview: <span style={{ letterSpacing: ({ tight: '-0.5px', normal: '0px', wide: '0.8px', wider: '1.5px', widest: '3px' })[receiptStyle.letterSpacing] || '0px' }}>A B C 1 2 3</span>
                    </div>
                  </div>

                  {/* LINE HEIGHT */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ fontSize: '0.74rem', color: T.txtSecondary, fontWeight: '700' }}>↕ Jarak Baris Atas-Bawah (Line Height)</div>
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                      {[
                        { key: 'compact', label: 'Padat',  val: '1.2'  },
                        { key: 'normal',  label: 'Normal', val: '1.45' },
                        { key: 'relaxed', label: 'Longgar',val: '1.7'  },
                        { key: 'loose',   label: 'Jarang', val: '2.0'  },
                      ].map(o => (
                        <button key={o.key} onClick={() => setRS('lineHeight', o.key)}
                          title={`line-height: ${o.val}`}
                          style={{ padding: '4px 9px', borderRadius: '5px', border: receiptStyle.lineHeight === o.key ? `2px solid ${T.accentGold}` : `1px solid ${T.border}`, background: receiptStyle.lineHeight === o.key ? 'rgba(255,193,7,0.15)' : T.cardBg2, color: receiptStyle.lineHeight === o.key ? T.accentGold : T.txtSecondary, fontWeight: '800', fontSize: '0.68rem', cursor: 'pointer' }}>
                          {o.label}
                        </button>
                      ))}
                    </div>
                    <div style={{ fontSize: '0.68rem', color: T.txtSecondary, opacity: 0.7, lineHeight: ({ compact: '1.2', normal: '1.45', relaxed: '1.7', loose: '2.0' })[receiptStyle.lineHeight] || '1.45' }}>
                      Baris pertama teks<br/>Baris kedua teks
                    </div>
                  </div>
                </div>

              </div>
            </div>
          );
        })()}
      </div>

      {/* PRATINJAU REAL-TIME THERMAL RECEIPT OUTPUT */}
      <ThermalReceiptPreviewSection printerSettings={printerSettings} headerFooter={headerFooter} receiptStyle={receiptStyle} themeMode={themeMode} />

    </div>
  );
}

function ThermalReceiptPreviewSection({ printerSettings, headerFooter, receiptStyle = {}, themeMode = 'dark' }) {
  const T = getThemePalette(themeMode);
  const [receiptType, setReceiptType] = useState('cashier');
  const [paperWidth, setPaperWidth] = useState('58');
  const [printingToast, setPrintingToast] = useState(false);

  const handleSimulatePrint = () => {
    setPrintingToast(true);
    setTimeout(() => setPrintingToast(false), 3000);
  };

  const is58mm = paperWidth === '58';
  const widthPx = is58mm ? '320px' : '420px';

  // Font size mapping
  const fzMap = {
    xsmall: '0.60rem', small: '0.70rem', medium: '0.78rem',
    large: '0.88rem', xlarge: '1.0rem', xxlarge: '1.15rem'
  };
  const rs = {
    titleSize: 'xlarge', groupSize: 'medium', addressSize: 'xsmall',
    metaSize: 'small', itemSize: 'small', totalSize: 'large', footerSize: 'xsmall',
    headerAlign: 'center', footerAlign: 'center',
    titleBold: true, itemBold: true, totalBold: true,
    separatorStyle: 'dashed', showItemNotes: true, priceLayout: 'inline',
    letterSpacing: 'normal', lineHeight: 'normal',
    ...receiptStyle
  };
  const fz = key => fzMap[rs[key]] || '0.74rem';
  const lsMap = { tight: '-0.5px', normal: '0px', wide: '0.8px', wider: '1.5px', widest: '3px' };
  const lhMap = { compact: '1.2', normal: '1.45', relaxed: '1.7', loose: '2.0' };

  const sepChar = rs.separatorStyle === 'solid' ? '─'
    : rs.separatorStyle === 'double' ? '═'
    : rs.separatorStyle === 'stars'  ? '*'
    : '-';
  const sepLine = (n = 32) => sepChar.repeat(n);

  return (
    <div className="glass-card" style={{ padding: '24px', background: T.cardBg, borderRadius: '16px', border: `1px solid ${T.border}`, display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* HEADER PREVIEW */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
        <div>
          <h3 style={{ fontSize: '1.15rem', fontWeight: '900', color: T.info, margin: '0 0 4px 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Printer size={22} color={T.info} />
            <span>Contoh Output Struk Thermal POS Kasir (Real-Time Preview)</span>
          </h3>
          <p style={{ fontSize: '0.78rem', color: T.txtSecondary, margin: 0 }}>
            Simulasi fisik tampilan struk thermal 58mm &amp; 80mm yang akan dicetak oleh printer kasir, dapur, dan bar.
          </p>
        </div>

        {/* CONTROLS */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <label style={{ fontSize: '0.78rem', color: T.txtLabel, fontWeight: '700' }}>Tipe Struk:</label>
            <select
              value={receiptType}
              onChange={e => setReceiptType(e.target.value)}
              style={{ padding: '8px 12px', background: T.inputBg, border: `1px solid ${T.border}`, borderRadius: '8px', color: T.txtPrimary, fontWeight: '800', fontSize: '0.82rem', cursor: 'pointer' }}
            >
              <option value="cashier">Struk Pembayaran Kasir (Nota Pelanggan)</option>
              <option value="kitchen">Struk Kerja Dapur (Kitchen Ticket)</option>
              <option value="bar">Struk Kerja Bar (Bar Ticket)</option>
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <label style={{ fontSize: '0.78rem', color: T.txtLabel, fontWeight: '700' }}>Lebar Kertas:</label>
            <select
              value={paperWidth}
              onChange={e => setPaperWidth(e.target.value)}
              style={{ padding: '8px 12px', background: T.inputBg, border: `1px solid ${T.border}`, borderRadius: '8px', color: T.txtPrimary, fontWeight: '800', fontSize: '0.82rem', cursor: 'pointer' }}
            >
              <option value="58">58mm (Kecil - 32 Karakter)</option>
              <option value="80">80mm (Besar - 48 Karakter)</option>
            </select>
          </div>

          <button
            onClick={handleSimulatePrint}
            style={{ padding: '8px 16px', background: T.primaryBtn, border: 'none', borderRadius: '8px', color: '#ffffff', fontWeight: '900', fontSize: '0.82rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', boxShadow: `0 4px 12px ${T.primaryBtnShadow}` }}
          >
            <Printer size={16} />
            <span>Cetak Struk Contoh</span>
          </button>
        </div>
      </div>

      {printingToast && (
        <div style={{ background: T.infoBg, border: `1px solid ${T.infoBorder}`, color: T.info, padding: '10px 16px', borderRadius: '10px', fontSize: '0.82rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <RefreshCw size={16} className="animate-spin" />
          <span>Mengirim perintah cetak contoh struk thermal ke printer (Port 9100 / ESC POS Bluetooth)...</span>
        </div>
      )}

      {/* PHYSICAL RECEIPT CONTAINER (PAPER SIMULATION) */}
      <div style={{ display: 'flex', justifyContent: 'center', padding: '20px 0', background: T.cardBg2, borderRadius: '14px', border: `1px solid ${T.border}` }}>

        {/* THERMAL PAPER ROLL MOCKUP */}
        <div style={{
          width: widthPx,
          background: '#fefefe',
          color: '#111111',
          padding: '24px 20px',
          fontFamily: "'Courier New', Courier, monospace",
          fontSize: fz('itemSize'),
          lineHeight: lhMap[rs.lineHeight] || '1.45',
          letterSpacing: lsMap[rs.letterSpacing] || '0px',
          borderRadius: '4px',
          boxShadow: '0 10px 30px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.1)',
          position: 'relative',
          transition: 'width 0.2s ease, letter-spacing 0.2s ease, line-height 0.2s ease'
        }}>

          {/* ─── STRUK KASIR ─── */}
          {receiptType === 'cashier' && (
            <div>

              {/* HEADER */}
              <div style={{ textAlign: rs.headerAlign, fontWeight: rs.titleBold ? 'bold' : 'normal' }}>
                <div style={{ fontSize: fz('titleSize'), letterSpacing: '1px', fontWeight: rs.titleBold ? '900' : '600' }}>
                  {headerFooter?.restaurantName || 'BUKTI PEMBAYARAN'}
                </div>
                {headerFooter?.groupName && (
                  <div style={{ fontSize: fz('groupSize'), fontWeight: '700' }}>{headerFooter.groupName}</div>
                )}
                {headerFooter?.address && (
                  <div style={{ fontSize: fz('addressSize'), color: '#444', fontWeight: '400' }}>{headerFooter.address}</div>
                )}
                {headerFooter?.phone && (
                  <div style={{ fontSize: fz('addressSize'), color: '#444', fontWeight: '400' }}>Telp: {headerFooter.phone}</div>
                )}
              </div>

              <div style={{ margin: '8px 0', borderBottom: `1px ${rs.separatorStyle === 'solid' ? 'solid' : rs.separatorStyle === 'double' ? 'double' : 'dashed'} #111` }}></div>

              {/* META INFO */}
              <div style={{ fontSize: fz('metaSize'), textAlign: 'left' }}>
                <div>No. Struk : TRX-20260803-0042</div>
                <div>Tanggal   : 03/08/2026 14:35:12</div>
                <div>Kasir     : Budi (Shift Siang)</div>
                <div>Pelanggan : Meja #07 (Bpk. Ahmad)</div>
              </div>

              <div style={{ margin: '8px 0', borderBottom: `1px ${rs.separatorStyle === 'solid' ? 'solid' : rs.separatorStyle === 'double' ? 'double' : 'dashed'} #111` }}></div>

              {/* ITEMS HEADER */}
              {rs.priceLayout === 'inline' ? (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: fz('itemSize') }}>
                  <span>QTY ITEM</span>
                  <span>HARGA    TOTAL</span>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', fontWeight: 'bold', fontSize: fz('itemSize') }}>
                  <span>NAMA MENU</span><span style={{ textAlign: 'right' }}>TOTAL</span>
                </div>
              )}
              <div style={{ margin: '4px 0', borderBottom: `1px ${rs.separatorStyle === 'solid' ? 'solid' : rs.separatorStyle === 'double' ? 'double' : 'dashed'} #111` }}></div>

              {/* ITEMS LIST */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: rs.priceLayout === 'inline' ? '6px' : '8px', fontSize: fz('itemSize') }}>
                {[
                  { qty: 2, name: 'Ayam Bakar Madu', price: '35.000', total: '70.000', note: 'Pedas Manis Extra' },
                  { qty: 1, name: 'Es Teh Manis Jumbo', price: '8.000',  total: '8.000',  note: 'Less Ice' },
                  { qty: 1, name: 'Nasi Putih Pulen',  price: '6.000',  total: '6.000',  note: null },
                ].map((item, idx) => (
                  <div key={idx}>
                    {rs.priceLayout === 'inline' ? (
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: rs.itemBold ? 'bold' : 'normal' }}>
                        <span>{item.qty}x {item.name}</span>
                        <span style={{ whiteSpace: 'nowrap' }}>{item.price}  {item.total}</span>
                      </div>
                    ) : (
                      <div>
                        <div style={{ fontWeight: rs.itemBold ? 'bold' : 'normal' }}>{item.qty}x {item.name}</div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#555', fontSize: fz('metaSize') }}>
                          <span>@ {item.price}</span><span style={{ fontWeight: '700', color: '#111' }}>= {item.total}</span>
                        </div>
                      </div>
                    )}
                    {rs.showItemNotes && item.note && (
                      <div style={{ fontSize: fz('metaSize'), color: '#555', paddingLeft: '12px' }}>*{item.note}</div>
                    )}
                  </div>
                ))}
              </div>

              <div style={{ margin: '8px 0', borderBottom: `1px ${rs.separatorStyle === 'solid' ? 'solid' : rs.separatorStyle === 'double' ? 'double' : 'dashed'} #111` }}></div>

              {/* TOTALS */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', fontSize: fz('metaSize') }}>
                {[['SUBTOTAL','Rp 84.000'],['DISKON PROMO (10%)','-Rp  8.400'],['PB1 RESTORAN (10%)','Rp  7.560']].map(([l,v]) => (
                  <div key={l} style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>{l}</span><span>{v}</span>
                  </div>
                ))}
                <div style={{ margin: '6px 0', borderBottom: `1px ${rs.separatorStyle === 'solid' ? 'solid' : rs.separatorStyle === 'double' ? 'double' : 'dashed'} #111` }}></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: rs.totalBold ? '900' : '600', fontSize: fz('totalSize') }}>
                  <span>TOTAL BAYAR</span><span>Rp 83.160</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: fz('metaSize') }}>
                  <span>CASH (TUNAI)</span><span>Rp 100.000</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: rs.totalBold ? 'bold' : 'normal', fontSize: fz('metaSize') }}>
                  <span>KEMBALIAN</span><span>Rp 16.840</span>
                </div>
              </div>

              <div style={{ margin: '12px 0 8px 0', borderBottom: `1px ${rs.separatorStyle === 'solid' ? 'solid' : rs.separatorStyle === 'double' ? 'double' : 'dashed'} #111` }}></div>

              {/* FOOTER */}
              <div style={{ textAlign: rs.footerAlign, fontSize: fz('footerSize'), color: '#333' }}>
                {headerFooter?.footerLine1 && <div style={{ fontWeight: 'bold' }}>{headerFooter.footerLine1}</div>}
                {headerFooter?.footerLine2 && <div>{headerFooter.footerLine2}</div>}
                {headerFooter?.wifiSsid && <div style={{ marginTop: '4px' }}>WIFI: {headerFooter.wifiSsid}</div>}
                {headerFooter?.wifiPassword && <div>PASS: {headerFooter.wifiPassword}</div>}
              </div>
            </div>
          )}

          {/* ─── STRUK DAPUR ─── */}
          {receiptType === 'kitchen' && (
            <div>
              <div style={{ textAlign: 'center', fontWeight: 'bold' }}>
                <div style={{ fontSize: '1.1rem', background: '#000', color: '#fff', padding: '2px 0' }}>*** STRUK KERJA DAPUR ***</div>
                <div style={{ fontSize: '0.85rem', marginTop: '4px' }}>ORDER #042 - MEJA #07</div>
              </div>
              <div style={{ margin: '8px 0', borderBottom: `2px ${rs.separatorStyle === 'solid' ? 'solid' : rs.separatorStyle === 'double' ? 'double' : 'dashed'} #000` }}></div>
              <div style={{ fontSize: fz('metaSize') }}>
                <div>Waktu  : 14:35:12 (03/08/2026)</div>
                <div>Server : Kasir Budi</div>
                <div>Tipe   : DINE-IN (Makan di Tempat)</div>
              </div>
              <div style={{ margin: '8px 0', borderBottom: `2px ${rs.separatorStyle === 'solid' ? 'solid' : 'dashed'} #000` }}></div>
              <div style={{ fontSize: fz('totalSize'), fontWeight: 'bold', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div>
                  <div>[ 2x ] AYAM BAKAR MADU</div>
                  {rs.showItemNotes && <div style={{ fontSize: fz('metaSize'), fontWeight: 'normal', color: '#333', paddingLeft: '14px' }}>&gt;&gt; Pedas Manis Extra + Sambal Terpisah</div>}
                </div>
                <div>[ 1x ] NASI PUTIH PULEN</div>
              </div>
              <div style={{ margin: '12px 0 8px 0', borderBottom: '2px solid #000' }}></div>
              <div style={{ textAlign: 'center', fontWeight: 'bold', fontSize: fz('footerSize') }}>*** HARAP SEGERA DISAJIKAN ***</div>
            </div>
          )}

          {/* ─── STRUK BAR ─── */}
          {receiptType === 'bar' && (
            <div>
              <div style={{ textAlign: 'center', fontWeight: 'bold' }}>
                <div style={{ fontSize: '1.1rem', background: '#000', color: '#fff', padding: '2px 0' }}>*** STRUK KERJA BAR ***</div>
                <div style={{ fontSize: '0.85rem', marginTop: '4px' }}>ORDER #042 - MEJA #07</div>
              </div>
              <div style={{ margin: '8px 0', borderBottom: `2px ${rs.separatorStyle === 'solid' ? 'solid' : 'dashed'} #000` }}></div>
              <div style={{ fontSize: fz('metaSize') }}>
                <div>Waktu  : 14:35:12 (03/08/2026)</div>
                <div>Server : Kasir Budi</div>
                <div>Tipe   : DINE-IN (Makan di Tempat)</div>
              </div>
              <div style={{ margin: '8px 0', borderBottom: `2px ${rs.separatorStyle === 'solid' ? 'solid' : 'dashed'} #000` }}></div>
              <div style={{ fontSize: fz('totalSize'), fontWeight: 'bold', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div>
                  <div>[ 1x ] ES TEH MANIS JUMBO</div>
                  {rs.showItemNotes && <div style={{ fontSize: fz('metaSize'), fontWeight: 'normal', color: '#333', paddingLeft: '14px' }}>&gt;&gt; Less Ice / Es Sedikit</div>}
                </div>
              </div>
              <div style={{ margin: '12px 0 8px 0', borderBottom: '2px solid #000' }}></div>
              <div style={{ textAlign: 'center', fontWeight: 'bold', fontSize: fz('footerSize') }}>*** BARTENDER TICKET ***</div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
