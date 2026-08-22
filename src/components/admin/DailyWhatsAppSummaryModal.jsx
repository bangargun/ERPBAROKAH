import React, { useState, useMemo } from 'react';
import { 
  MessageSquare, 
  Send, 
  X, 
  Copy, 
  Check, 
  Building2, 
  Calendar, 
  DollarSign, 
  TrendingUp, 
  AlertTriangle, 
  Sparkles,
  Phone,
  Settings
} from 'lucide-react';
import { getThemePalette } from '../../utils/themeUtils';
import { getApiUrl } from '../../utils/apiConfig';

export default function DailyWhatsAppSummaryModal({ 
  masterData, 
  setMasterData, 
  onClose, 
  themeMode = 'dark' 
}) {
  const T = getThemePalette(themeMode);
  const [copied, setCopied] = useState(false);
  const [targetDate, setTargetDate] = useState(new Date().toISOString().split('T')[0]);

  // Nomor WA Owner tersimpan di masterData atau default
  const [ownerPhone, setOwnerPhone] = useState(() => {
    return masterData?.settings?.ownerWaPhone || '6281234567890';
  });

  const outlets = masterData?.outlets || [];
  const allSalesTx = masterData?.salesTransactions || [];
  const allIngredients = masterData?.ingredients || [];

  // Hitung Data Penjualan Tanggal Terpilih
  const summaryData = useMemo(() => {
    const periodTx = allSalesTx.filter(t => {
      const d = String(t.date || t.entry_date || t.transaction_date || t.created_at || '').substring(0, 10);
      return d === targetDate && (t.status === 'approved' || !t.status);
    });

    let totalAmount = 0;
    let totalCash = 0;
    let totalQris = 0;
    let totalGrab = 0;
    let cashCount = 0;
    let qrisCount = 0;
    let grabCount = 0;

    const outletMap = {};
    outlets.forEach(o => {
      outletMap[o.id] = { name: o.name, amount: 0, count: 0 };
    });

    const menuMap = {};

    periodTx.forEach(t => {
      const amt = Number(t.amount || t.total || 0);
      totalAmount += amt;

      const method = String(t.payment_method || '').toUpperCase();
      if (method.includes('QRIS')) {
        totalQris += amt;
        qrisCount++;
      } else if (method.includes('GRAB')) {
        totalGrab += amt;
        grabCount++;
      } else {
        totalCash += amt;
        cashCount++;
      }

      // Per Outlet
      const outId = t.outlet_id || t.branch_id || 1;
      if (outletMap[outId]) {
        outletMap[outId].amount += amt;
        outletMap[outId].count++;
      } else {
        const found = outlets.find(o => o.name === t.branch_name || String(o.id) === String(outId));
        if (found && outletMap[found.id]) {
          outletMap[found.id].amount += amt;
          outletMap[found.id].count++;
        }
      }

      // Items Menu
      if (Array.isArray(t.items)) {
        t.items.forEach(it => {
          const name = it.name || it.item_name || 'Menu';
          const qty = Number(it.qty || 1);
          menuMap[name] = (menuMap[name] || 0) + qty;
        });
      }
    });

    const topMenus = Object.entries(menuMap)
      .map(([name, qty]) => ({ name, qty }))
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 3);

    // Bahan Baku Menipis (Non-blocking)
    const lowStockItems = allIngredients.filter(ing => {
      const currentStock = Number(ing.stock || ing.current_stock || 0);
      const minStock = Number(ing.min_stock || ing.minimum_stock || 5);
      return currentStock <= minStock;
    }).slice(0, 5);

    return {
      totalAmount,
      totalCash,
      totalQris,
      totalGrab,
      cashCount,
      qrisCount,
      grabCount,
      totalCount: periodTx.length,
      outletStats: Object.values(outletMap),
      topMenus,
      lowStockItems
    };
  }, [allSalesTx, outlets, allIngredients, targetDate]);

  // Format Helper
  const formatRp = (num) => `Rp ${(Number(num) || 0).toLocaleString('id-ID')}`;

  const formattedDateStr = useMemo(() => {
    const d = new Date(targetDate);
    return d.toLocaleDateString('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  }, [targetDate]);

  // Template Pesan WhatsApp
  const waMessageText = useMemo(() => {
    let msg = `📊 *LAPORAN HARIAN RESMI — BAROKAH GROUP*\n`;
    msg += `📅 *Hari/Tanggal:* ${formattedDateStr}\n`;
    msg += `⏰ *Waktu Rekap:* ${new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB\n\n`;

    msg += `💰 *TOTAL OMSET 5 CABANG:* ${formatRp(summaryData.totalAmount)} (${summaryData.totalCount} Transaksi)\n`;
    msg += `• 💵 *Kas Tunai:* ${formatRp(summaryData.totalCash)} (${summaryData.cashCount} Struk)\n`;
    msg += `• 📱 *QRIS (BCA):* ${formatRp(summaryData.totalQris)} (${summaryData.qrisCount} Struk)\n`;
    msg += `• 🥡 *Grab-Food:* ${formatRp(summaryData.totalGrab)} (${summaryData.grabCount} Struk)\n\n`;

    msg += `🏢 *RINCIAN OMSET PER CABANG:*\n`;
    summaryData.outletStats.forEach((o, idx) => {
      msg += `${idx + 1}. *${o.name}:* ${formatRp(o.amount)} (${o.count} Struk)\n`;
    });
    msg += `\n`;

    if (summaryData.topMenus.length > 0) {
      msg += `🍗 *TOP MENU TERLARIS HARI INI:*\n`;
      summaryData.topMenus.forEach((m, idx) => {
        msg += `${idx + 1}. ${m.name} — *${m.qty} Porsi*\n`;
      });
      msg += `\n`;
    }

    if (summaryData.lowStockItems.length > 0) {
      msg += `⚠️ *PERINGATAN BAHAN BAKU MENIPIS:*\n`;
      summaryData.lowStockItems.forEach(ing => {
        const stock = Number(ing.stock || ing.current_stock || 0);
        msg += `• ${ing.name}: Sisa ${stock} ${ing.unit || 'kg'} (${ing.outlet_name || 'Cabang'})\n`;
      });
      msg += `_(Catatan: Produksi & transaksi POS kasir tetap berjalan lancar)_\n\n`;
    }

    msg += `📌 _Laporan ini digenerate secara otomatis oleh Sistem MRIS Enterprise._`;
    return msg;
  }, [summaryData, formattedDateStr]);

  // Handle Save Phone
  const handleSavePhone = async () => {
    let clean = ownerPhone.replace(/[^0-9]/g, '');
    if (clean.startsWith('0')) clean = '62' + clean.slice(1);
    if (!clean.startsWith('62')) clean = '62' + clean;

    setOwnerPhone(clean);

    const newMaster = {
      ...masterData,
      settings: {
        ...(masterData?.settings || {}),
        ownerWaPhone: clean
      },
      _lastUpdated: Date.now()
    };
    if (setMasterData) setMasterData(newMaster);

    try {
      await fetch(getApiUrl('/api/master-data'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newMaster)
      });
    } catch (e) {}
  };

  // Handle Send WA
  const handleSendWhatsApp = () => {
    let cleanPhone = ownerPhone.replace(/[^0-9]/g, '');
    if (cleanPhone.startsWith('0')) cleanPhone = '62' + cleanPhone.slice(1);
    if (!cleanPhone.startsWith('62')) cleanPhone = '62' + cleanPhone;

    handleSavePhone();

    const encoded = encodeURIComponent(waMessageText);
    const waUrl = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encoded}`;
    window.open(waUrl, '_blank');
  };

  // Handle Copy
  const handleCopyText = () => {
    navigator.clipboard.writeText(waMessageText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0,0,0,0.85)',
      backdropFilter: 'blur(8px)',
      zIndex: 99999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      <div style={{
        background: T.cardBg,
        border: `1px solid ${T.border}`,
        borderRadius: '20px',
        padding: '26px',
        width: '100%',
        maxWidth: '680px',
        maxHeight: '92vh',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '18px',
        boxShadow: '0 25px 60px rgba(0,0,0,0.6)'
      }}>
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${T.border}`, paddingBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 14px rgba(16,185,129,0.4)' }}>
              <MessageSquare size={24} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: '900', color: T.txtPrimary, margin: 0 }}>
                Laporan Ringkasan Harian ke WhatsApp Owner
              </h3>
              <p style={{ fontSize: '0.78rem', color: T.txtSecondary, margin: '2px 0 0 0' }}>
                Kirim rekap total omset 5 cabang, struk kasir, QRIS BCA, Grab-Food, dan stok menipis dengan 1 klik
              </p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: T.txtMuted, cursor: 'pointer' }}>
            <X size={22} />
          </button>
        </div>

        {/* Input Tanggal & Nomor WA Owner */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '12px', background: T.controlBg, padding: '14px', borderRadius: '12px', border: `1px solid ${T.border}` }}>
          <div>
            <label style={{ fontSize: '0.76rem', fontWeight: '800', color: T.txtSecondary, display: 'block', marginBottom: '4px' }}>
              Pilih Tanggal Laporan:
            </label>
            <input
              type="date"
              value={targetDate}
              onChange={e => setTargetDate(e.target.value)}
              style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: `1px solid ${T.border}`, background: T.cardBg, color: T.txtPrimary, fontWeight: '700', fontSize: '0.84rem' }}
            />
          </div>

          <div>
            <label style={{ fontSize: '0.76rem', fontWeight: '800', color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
              <Phone size={13} />
              <span>Nomor WhatsApp Owner (Format 628...):</span>
            </label>
            <input
              type="text"
              value={ownerPhone}
              onChange={e => setOwnerPhone(e.target.value)}
              placeholder="Contoh: 6281298765432"
              style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: `1.5px solid #10b981`, background: T.cardBg, color: '#10b981', fontWeight: '900', fontSize: '0.88rem' }}
            />
          </div>
        </div>

        {/* Preview Box Pesan WhatsApp */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: '800', color: T.txtSecondary }}>
              Pratinjau Format Pesan WhatsApp:
            </span>
            <button
              type="button"
              onClick={handleCopyText}
              style={{
                padding: '4px 10px',
                borderRadius: '6px',
                background: copied ? 'rgba(16,185,129,0.2)' : T.controlBg,
                border: `1px solid ${copied ? '#10b981' : T.border}`,
                color: copied ? '#10b981' : T.txtSecondary,
                fontSize: '0.74rem',
                fontWeight: '800',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              {copied ? <Check size={13} /> : <Copy size={13} />}
              <span>{copied ? 'Tersalin!' : 'Salin Teks'}</span>
            </button>
          </div>

          <textarea
            readOnly
            rows={12}
            value={waMessageText}
            style={{
              width: '100%',
              padding: '14px',
              borderRadius: '12px',
              border: `1px solid ${T.border}`,
              background: themeMode === 'soft_blue' ? '#f0f7ff' : '#0b0f19',
              color: T.txtPrimary,
              fontFamily: 'monospace',
              fontSize: '0.80rem',
              lineHeight: '1.5',
              resize: 'vertical'
            }}
          />
        </div>

        {/* Footer Actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', borderTop: `1px solid ${T.border}`, paddingTop: '14px' }}>
          <button
            type="button"
            onClick={onClose}
            style={{ padding: '10px 18px', borderRadius: '10px', border: `1px solid ${T.border}`, background: T.controlBg, color: T.txtPrimary, fontWeight: '800', cursor: 'pointer' }}
          >
            Tutup
          </button>
          <button
            type="button"
            onClick={handleSendWhatsApp}
            style={{
              padding: '10px 24px',
              borderRadius: '10px',
              border: 'none',
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              color: '#ffffff',
              fontWeight: '900',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 4px 16px rgba(16,185,129,0.45)'
            }}
          >
            <Send size={16} />
            <span>Kirim Langsung ke WhatsApp Owner</span>
          </button>
        </div>

      </div>
    </div>
  );
}
