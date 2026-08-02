import React, { useState } from 'react';
import { Printer, Save, CheckCircle, Wifi, Bluetooth, RefreshCw, Layers, ShieldCheck } from 'lucide-react';

export default function PrinterThermalSettingsPage({ masterData, setMasterData }) {
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

  const [savedSuccessToast, setSavedSuccessToast] = useState(false);

  const categories = masterData?.categories || masterData?.menuCategories || [];

  const handleSaveSettings = (e) => {
    e.preventDefault();
    setMasterData(prev => ({
      ...prev,
      printerSettings: printerSettings
    }));
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
    <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px', color: '#f8fafc' }}>
      
      {/* HEADER PAGE */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '1.6rem', fontWeight: '900', color: '#f8fafc', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Printer size={28} color="#38bdf8" />
            <span>Pengaturan Printer &amp; Thermal Output POS Kasir</span>
          </h2>
          <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginTop: '4px' }}>
            Kelola printer dapur, printer bar, printer kasir, routing kategori menu, dan mode cetak otomatis.
          </p>
        </div>

        <button
          onClick={handleSaveSettings}
          className="btn-primary"
          style={{ padding: '10px 20px', display: 'flex', alignItems: 'center', gap: '8px', background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)', borderRadius: '12px', fontWeight: '900', cursor: 'pointer' }}
        >
          <Save size={18} />
          <span>Simpan Pengaturan</span>
        </button>
      </div>

      {savedSuccessToast && (
        <div style={{ background: 'rgba(34, 197, 94, 0.2)', border: '1px solid #22c55e', color: '#86efac', padding: '12px 16px', borderRadius: '12px', fontSize: '0.85rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <CheckCircle size={20} color="#22c55e" />
          <span>Pengaturan Printer Thermal Berhasil Disimpan &amp; Disinkronkan ke POS Kasir Mobile!</span>
        </div>
      )}

      {/* PRINTER HARDWARE CONFIGURATION GRID */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
        
        {/* 🍳 PRINTER DAPUR (KITCHEN) */}
        <div className="glass-card" style={{ padding: '20px', background: '#1e293b', borderRadius: '16px', border: '1px solid #334155', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: '800', color: '#fbbf24', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              🍳 Printer Dapur (Kitchen)
            </h3>
            <span style={{ fontSize: '0.72rem', background: 'rgba(251,191,36,0.15)', color: '#fbbf24', padding: '4px 8px', borderRadius: '6px', fontWeight: '800' }}>
              Struk Kerja Koki
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: '700' }}>Alamat IP / Nama Bluetooth Printer:</label>
            <input
              type="text"
              value={printerSettings.kitchenPrinter?.ip || ''}
              onChange={e => setPrinterSettings({ ...printerSettings, kitchenPrinter: { ...printerSettings.kitchenPrinter, ip: e.target.value } })}
              placeholder="Contoh: 192.168.1.200 atau RPP02N"
              style={{ padding: '10px', background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', color: '#ffffff', fontSize: '0.85rem' }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: '700' }}>Ukuran Kertas Thermal:</label>
            <select
              value={printerSettings.kitchenPrinter?.paperWidth || '80'}
              onChange={e => setPrinterSettings({ ...printerSettings, kitchenPrinter: { ...printerSettings.kitchenPrinter, paperWidth: e.target.value } })}
              style={{ padding: '10px', background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', color: '#ffffff', fontSize: '0.85rem' }}
            >
              <option value="58">58mm (Kecil - 32 Karakter)</option>
              <option value="80">80mm (Besar - 48 Karakter)</option>
            </select>
          </div>
        </div>

        {/* 🍹 PRINTER BAR (MINUMAN) */}
        <div className="glass-card" style={{ padding: '20px', background: '#1e293b', borderRadius: '16px', border: '1px solid #334155', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: '800', color: '#38bdf8', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              🍹 Printer Bar (Minuman)
            </h3>
            <span style={{ fontSize: '0.72rem', background: 'rgba(56,189,248,0.15)', color: '#38bdf8', padding: '4px 8px', borderRadius: '6px', fontWeight: '800' }}>
              Struk Bartender
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: '700' }}>Alamat IP / Nama Bluetooth Printer:</label>
            <input
              type="text"
              value={printerSettings.barPrinter?.ip || ''}
              onChange={e => setPrinterSettings({ ...printerSettings, barPrinter: { ...printerSettings.barPrinter, ip: e.target.value } })}
              placeholder="Contoh: 192.168.1.201 atau BT-BAR"
              style={{ padding: '10px', background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', color: '#ffffff', fontSize: '0.85rem' }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: '700' }}>Ukuran Kertas Thermal:</label>
            <select
              value={printerSettings.barPrinter?.paperWidth || '58'}
              onChange={e => setPrinterSettings({ ...printerSettings, barPrinter: { ...printerSettings.barPrinter, paperWidth: e.target.value } })}
              style={{ padding: '10px', background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', color: '#ffffff', fontSize: '0.85rem' }}
            >
              <option value="58">58mm (Kecil - 32 Karakter)</option>
              <option value="80">80mm (Besar - 48 Karakter)</option>
            </select>
          </div>
        </div>

        {/* 🧾 PRINTER KASIR (RECEIPT & BILL) */}
        <div className="glass-card" style={{ padding: '20px', background: '#1e293b', borderRadius: '16px', border: '1px solid #334155', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: '800', color: '#4ade80', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              🧾 Printer Kasir (Nota Pembayaran)
            </h3>
            <span style={{ fontSize: '0.72rem', background: 'rgba(74,222,128,0.15)', color: '#4ade80', padding: '4px 8px', borderRadius: '6px', fontWeight: '800' }}>
              Nota Pelanggan
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: '700' }}>Alamat IP / Nama Bluetooth Printer:</label>
            <input
              type="text"
              value={printerSettings.cashierPrinter?.ip || ''}
              onChange={e => setPrinterSettings({ ...printerSettings, cashierPrinter: { ...printerSettings.cashierPrinter, ip: e.target.value } })}
              placeholder="Contoh: 192.168.1.202 atau Thermal_Printer_Kasir"
              style={{ padding: '10px', background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', color: '#ffffff', fontSize: '0.85rem' }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: '700' }}>Ukuran Kertas Thermal:</label>
            <select
              value={printerSettings.cashierPrinter?.paperWidth || '58'}
              onChange={e => setPrinterSettings({ ...printerSettings, cashierPrinter: { ...printerSettings.cashierPrinter, paperWidth: e.target.value } })}
              style={{ padding: '10px', background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', color: '#ffffff', fontSize: '0.85rem' }}
            >
              <option value="58">58mm (Kecil - 32 Karakter)</option>
              <option value="80">80mm (Besar - 48 Karakter)</option>
            </select>
          </div>
        </div>

      </div>

      {/* CATEGORY PRINTER TARGET ALLOCATION TABLE */}
      <div className="glass-card" style={{ padding: '24px', background: '#1e293b', borderRadius: '16px', border: '1px solid #334155', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Layers size={22} color="#a855f7" />
          <h3 style={{ fontSize: '1.1rem', fontWeight: '800', color: '#f8fafc', margin: 0 }}>
            Routing Target Printer per Kategori Menu
          </h3>
        </div>
        <p style={{ fontSize: '0.80rem', color: '#94a3b8', margin: 0 }}>
          Atur ke printer mana pesanan item pada kategori menu berikut akan otomatis dikirim (Dapur / Bar / Keduanya).
        </p>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ background: '#0f172a', borderBottom: '1px solid #334155', textAlign: 'left' }}>
                <th style={{ padding: '12px', color: '#94a3b8' }}>Kategori Menu</th>
                <th style={{ padding: '12px', color: '#94a3b8' }}>Target Printer Output</th>
                <th style={{ padding: '12px', color: '#94a3b8' }}>Keterangan Struk</th>
              </tr>
            </thead>
            <tbody>
              {categories.map(cat => {
                const target = cat.target_printer || cat.printer_type || 'dapur';
                return (
                  <tr key={cat.id} style={{ borderBottom: '1px solid #334155' }}>
                    <td style={{ padding: '12px', fontWeight: '800', color: '#ffffff' }}>
                      {cat.name}
                    </td>
                    <td style={{ padding: '12px' }}>
                      <select
                        value={target}
                        onChange={e => handleUpdateCategoryPrinter(cat.id, e.target.value)}
                        style={{ padding: '8px 12px', background: '#0f172a', border: '1px solid #38bdf8', borderRadius: '8px', color: '#38bdf8', fontWeight: '800', cursor: 'pointer' }}
                      >
                        <option value="dapur">🍳 Printer Dapur (Kitchen)</option>
                        <option value="bar">🍹 Printer Bar (Beverages)</option>
                        <option value="keduanya">🔄 Dapur &amp; Bar (Keduanya)</option>
                      </select>
                    </td>
                    <td style={{ padding: '12px', color: '#94a3b8', fontSize: '0.78rem' }}>
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

    </div>
  );
}
