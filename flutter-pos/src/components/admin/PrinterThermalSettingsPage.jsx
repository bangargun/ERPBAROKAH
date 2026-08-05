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
        printerSettings: updatedSettings
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
    <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px', color: T.txtPrimary, background: T.pageBg, minHeight: '100vh' }}>
      
      {/* HEADER PAGE */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '1.6rem', fontWeight: '900', color: T.txtPrimary, margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Printer size={28} color={T.info} />
            <span>Pengaturan Printer &amp; Thermal Output POS Kasir</span>
          </h2>
          <p style={{ color: T.txtSecondary, fontSize: '0.85rem', marginTop: '4px' }}>
            Kelola printer dapur, printer bar, printer kasir, routing kategori menu, dan mode cetak otomatis.
          </p>
        </div>

        <button
          onClick={handleSaveSettings}
          className="btn-primary"
          style={{ padding: '10px 20px', display: 'flex', alignItems: 'center', gap: '8px', background: T.primaryBtn, borderRadius: '12px', fontWeight: '900', cursor: 'pointer', color: '#ffffff', border: 'none', boxShadow: `0 4px 14px ${T.primaryBtnShadow}` }}
        >
          <Save size={18} />
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
        
        {/* 🍳 PRINTER DAPUR (KITCHEN) */}
        <div className="glass-card" style={{ padding: '20px', background: T.cardBg, borderRadius: '16px', border: `1px solid ${T.border}`, display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: '800', color: T.txtPrimary, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              🍳 Printer Dapur (Kitchen)
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

        {/* 🍹 PRINTER BAR (MINUMAN) */}
        <div className="glass-card" style={{ padding: '20px', background: T.cardBg, borderRadius: '16px', border: `1px solid ${T.border}`, display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: '800', color: T.txtPrimary, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              🍹 Printer Bar (Minuman)
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

        {/* 🧾 PRINTER KASIR (RECEIPT & BILL) */}
        <div className="glass-card" style={{ padding: '20px', background: T.cardBg, borderRadius: '16px', border: `1px solid ${T.border}`, display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: '800', color: T.txtPrimary, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              🧾 Printer Kasir (Nota Pembayaran)
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
                        <option value="dapur">🍳 Printer Dapur (Kitchen)</option>
                        <option value="bar">🍹 Printer Bar (Beverages)</option>
                        <option value="keduanya">🔄 Dapur &amp; Bar (Keduanya)</option>
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

      {/* ✍️ EDIT HEADER & FOOTER STRUK THERMAL */}
      <div className="glass-card" style={{ padding: '24px', background: T.cardBg, borderRadius: '16px', border: `1px solid ${T.border}`, display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '800', color: T.txtPrimary, margin: '0 0 4px 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span>✍️ Pengaturan Header &amp; Footer Struk Restoran</span>
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
              🏢 Pilih Outlet Restoran:
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
                    🏢 {o.name || o.branch_name}
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
            <div style={{ fontSize: '0.85rem', fontWeight: '800', color: T.info }}>📌 Header Struk (Bagian Atas)</div>
            
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
            <div style={{ fontSize: '0.85rem', fontWeight: '800', color: T.success }}>📌 Footer Struk (Bagian Bawah)</div>
            
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

      {/* 🖨️ PRATINJAU REAL-TIME THERMAL RECEIPT OUTPUT */}
      <ThermalReceiptPreviewSection printerSettings={printerSettings} headerFooter={headerFooter} themeMode={themeMode} />

    </div>
  );
}

function ThermalReceiptPreviewSection({ printerSettings, headerFooter, themeMode = 'dark' }) {
  const T = getThemePalette(themeMode);
  const [receiptType, setReceiptType] = useState('cashier'); // 'cashier' | 'kitchen' | 'bar'
  const [paperWidth, setPaperWidth] = useState('58'); // '58' | '80'
  const [printingToast, setPrintingToast] = useState(false);

  const handleSimulatePrint = () => {
    setPrintingToast(true);
    setTimeout(() => setPrintingToast(false), 3000);
  };

  const is58mm = paperWidth === '58';
  const widthPx = is58mm ? '320px' : '420px';
  const fontSz = is58mm ? '0.78rem' : '0.86rem';

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
              <option value="cashier">🧾 Struk Pembayaran Kasir (Nota Pelanggan)</option>
              <option value="kitchen">🍳 Struk Kerja Dapur (Kitchen Ticket)</option>
              <option value="bar">🍹 Struk Kerja Bar (Bar Ticket)</option>
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
            <span>🖨️ Cetak Struk Contoh</span>
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
          fontSize: fontSz,
          lineHeight: '1.4',
          borderRadius: '4px',
          boxShadow: '0 10px 30px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.1)',
          position: 'relative',
          transition: 'width 0.2s ease'
        }}>
          
          {/* RECEIPT CONTENT BASED ON TYPE */}
          {receiptType === 'cashier' && (
            <div>
              {/* HEADER */}
              <div style={{ textAlign: 'center', fontWeight: 'bold' }}>
                <div style={{ fontSize: is58mm ? '1rem' : '1.15rem', letterSpacing: '1px' }}>
                  {headerFooter?.restaurantName || 'MRIS RESTORAN'}
                </div>
                {headerFooter?.groupName && (
                  <div style={{ fontSize: '0.74rem' }}>{headerFooter.groupName}</div>
                )}
                {headerFooter?.address && (
                  <div style={{ fontSize: '0.70rem', color: '#444' }}>{headerFooter.address}</div>
                )}
                {headerFooter?.phone && (
                  <div style={{ fontSize: '0.70rem', color: '#444' }}>Telp: {headerFooter.phone}</div>
                )}
              </div>
              
              <div style={{ margin: '8px 0', borderBottom: '1px dashed #111' }}></div>

              {/* META INFO */}
              <div style={{ fontSize: '0.74rem' }}>
                <div>No. Struk : TRX-20260803-0042</div>
                <div>Tanggal   : 03/08/2026 14:35:12</div>
                <div>Kasir     : Budi (Shift Siang)</div>
                <div>Pelanggan : Meja #07 (Bpk. Ahmad)</div>
              </div>

              <div style={{ margin: '8px 0', borderBottom: '1px dashed #111' }}></div>

              {/* ITEMS HEADER */}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '0.74rem' }}>
                <span>QTY ITEM</span>
                <span>HARGA    TOTAL</span>
              </div>
              <div style={{ margin: '4px 0', borderBottom: '1px dashed #111' }}></div>

              {/* ITEMS LIST */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.74rem' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
                    <span>2x Ayam Bakar Madu</span>
                    <span>35.000   70.000</span>
                  </div>
                  <div style={{ fontSize: '0.68rem', color: '#555', paddingLeft: '12px' }}>*Pedas Manis Extra</div>
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
                    <span>1x Es Teh Manis Jumbo</span>
                    <span> 8.000    8.000</span>
                  </div>
                  <div style={{ fontSize: '0.68rem', color: '#555', paddingLeft: '12px' }}>*Less Ice</div>
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
                    <span>1x Nasi Putih Pulen</span>
                    <span> 6.000    6.000</span>
                  </div>
                </div>
              </div>

              <div style={{ margin: '8px 0', borderBottom: '1px dashed #111' }}></div>

              {/* TOTALS SUMMARY */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', fontSize: '0.74rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>SUBTOTAL</span>
                  <span>Rp 84.000</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>DISKON PROMO (10%)</span>
                  <span>-Rp  8.400</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>PB1 RESTORAN (10%)</span>
                  <span>Rp  7.560</span>
                </div>
                
                <div style={{ margin: '6px 0', borderBottom: '1px dashed #111' }}></div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '0.88rem' }}>
                  <span>TOTAL BAYAR</span>
                  <span>Rp 83.160</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>CASH (TUNAI)</span>
                  <span>Rp 100.000</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
                  <span>KEMBALIAN</span>
                  <span>Rp 16.840</span>
                </div>
              </div>

              <div style={{ margin: '12px 0 8px 0', borderBottom: '1px dashed #111' }}></div>

              {/* FOOTER */}
              <div style={{ textAlign: 'center', fontSize: '0.70rem', color: '#333' }}>
                {headerFooter?.footerLine1 && (
                  <div style={{ fontWeight: 'bold' }}>{headerFooter.footerLine1}</div>
                )}
                {headerFooter?.footerLine2 && (
                  <div>{headerFooter.footerLine2}</div>
                )}
                {headerFooter?.wifiSsid && (
                  <div style={{ marginTop: '4px' }}>WIFI: {headerFooter.wifiSsid}</div>
                )}
                {headerFooter?.wifiPassword && (
                  <div>PASS: {headerFooter.wifiPassword}</div>
                )}
              </div>
            </div>
          )}

          {receiptType === 'kitchen' && (
            <div>
              {/* KITCHEN TICKET HEADER */}
              <div style={{ textAlign: 'center', fontWeight: 'bold' }}>
                <div style={{ fontSize: '1.1rem', background: '#000', color: '#fff', padding: '2px 0' }}>*** STRUK KERJA DAPUR ***</div>
                <div style={{ fontSize: '0.85rem', marginTop: '4px' }}>ORDER #042 - MEJA #07</div>
              </div>

              <div style={{ margin: '8px 0', borderBottom: '2px solid #000' }}></div>

              <div style={{ fontSize: '0.74rem' }}>
                <div>Waktu  : 14:35:12 (03/08/2026)</div>
                <div>Server : Kasir Budi</div>
                <div>Tipe   : DINE-IN (Makan di Tempat)</div>
              </div>

              <div style={{ margin: '8px 0', borderBottom: '2px solid #000' }}></div>

              {/* KITCHEN ITEMS LIST (LARGE FONT) */}
              <div style={{ fontSize: '0.90rem', fontWeight: 'bold', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>[ 2x ] AYAM BAKAR MADU</span>
                  </div>
                  <div style={{ fontSize: '0.76rem', fontWeight: 'normal', color: '#333', paddingLeft: '14px' }}>
                    &gt;&gt; Catatan: Pedas Manis Extra + Sambal Terpisah
                  </div>
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>[ 1x ] NASI PUTIH PULEN</span>
                  </div>
                </div>
              </div>

              <div style={{ margin: '12px 0 8px 0', borderBottom: '2px solid #000' }}></div>
              <div style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '0.78rem' }}>
                *** HARAP SEGERA DISAJIKAN ***
              </div>
            </div>
          )}

          {receiptType === 'bar' && (
            <div>
              {/* BAR TICKET HEADER */}
              <div style={{ textAlign: 'center', fontWeight: 'bold' }}>
                <div style={{ fontSize: '1.1rem', background: '#000', color: '#fff', padding: '2px 0' }}>*** STRUK KERJA BAR ***</div>
                <div style={{ fontSize: '0.85rem', marginTop: '4px' }}>ORDER #042 - MEJA #07</div>
              </div>

              <div style={{ margin: '8px 0', borderBottom: '2px solid #000' }}></div>

              <div style={{ fontSize: '0.74rem' }}>
                <div>Waktu  : 14:35:12 (03/08/2026)</div>
                <div>Server : Kasir Budi</div>
                <div>Tipe   : DINE-IN (Makan di Tempat)</div>
              </div>

              <div style={{ margin: '8px 0', borderBottom: '2px solid #000' }}></div>

              {/* BAR ITEMS LIST */}
              <div style={{ fontSize: '0.90rem', fontWeight: 'bold', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>[ 1x ] ES TEH MANIS JUMBO</span>
                  </div>
                  <div style={{ fontSize: '0.76rem', fontWeight: 'normal', color: '#333', paddingLeft: '14px' }}>
                    &gt;&gt; Catatan: Less Ice / Es Sedikit
                  </div>
                </div>
              </div>

              <div style={{ margin: '12px 0 8px 0', borderBottom: '2px solid #000' }}></div>
              <div style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '0.78rem' }}>
                *** BARTENDER TICKET ***
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
