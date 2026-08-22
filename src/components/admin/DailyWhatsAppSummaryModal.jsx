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
  Plus,
  Trash2,
  Users,
  CheckCircle2,
  ExternalLink
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

  // Multiple Owner Phone Numbers
  const [phoneList, setPhoneList] = useState(() => {
    if (Array.isArray(masterData?.settings?.ownerPhones) && masterData.settings.ownerPhones.length > 0) {
      return masterData.settings.ownerPhones;
    }
    const single = masterData?.settings?.ownerWaPhone || '6281234567890';
    return [{ id: '1', label: 'Owner Utama', phone: single, enabled: true }];
  });

  // State Input Form Tambah Nomor Baru
  const [newLabel, setNewLabel] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

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

  // Clean format phone helper
  const cleanPhone = (num) => {
    let clean = String(num || '').replace(/[^0-9]/g, '');
    if (clean.startsWith('0')) clean = '62' + clean.slice(1);
    if (!clean.startsWith('62') && clean.length > 0) clean = '62' + clean;
    return clean;
  };

  // Sync phones to masterData
  const syncPhoneListToMaster = async (updatedList) => {
    setPhoneList(updatedList);
    const newMaster = {
      ...masterData,
      settings: {
        ...(masterData?.settings || {}),
        ownerPhones: updatedList,
        ownerWaPhone: updatedList[0]?.phone || '6281234567890'
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

  // Toggle enable checkbox
  const handleTogglePhone = (id) => {
    const updated = phoneList.map(p => p.id === id ? { ...p, enabled: !p.enabled } : p);
    syncPhoneListToMaster(updated);
  };

  // Delete phone
  const handleDeletePhone = (id) => {
    if (phoneList.length <= 1) {
      alert('Minimal harus ada 1 nomor WhatsApp tersimpan!');
      return;
    }
    const updated = phoneList.filter(p => p.id !== id);
    syncPhoneListToMaster(updated);
  };

  // Add new phone
  const handleAddPhone = (e) => {
    e.preventDefault();
    if (!newPhone.trim()) {
      alert('Nomor WhatsApp wajib diisi!');
      return;
    }
    const formatted = cleanPhone(newPhone);
    const newItem = {
      id: String(Date.now()),
      label: newLabel.trim() || `Owner #${phoneList.length + 1}`,
      phone: formatted,
      enabled: true
    };
    const updated = [...phoneList, newItem];
    syncPhoneListToMaster(updated);
    setNewLabel('');
    setNewPhone('');
    setShowAddForm(false);
  };

  // Send to 1 single phone
  const handleSendSingle = (phoneNum) => {
    const formatted = cleanPhone(phoneNum);
    const encoded = encodeURIComponent(waMessageText);
    const waUrl = `https://api.whatsapp.com/send?phone=${formatted}&text=${encoded}`;
    window.open(waUrl, '_blank');
  };

  // Send to all enabled phones
  const handleSendAllEnabled = () => {
    const activeList = phoneList.filter(p => p.enabled !== false);
    if (activeList.length === 0) {
      alert('Pilih minimal 1 nomor tujuan dengan mencentang kotak nomor!');
      return;
    }

    const encoded = encodeURIComponent(waMessageText);
    activeList.forEach((item, idx) => {
      const formatted = cleanPhone(item.phone);
      const waUrl = `https://api.whatsapp.com/send?phone=${formatted}&text=${encoded}`;
      setTimeout(() => {
        window.open(waUrl, '_blank');
      }, idx * 400);
    });
  };

  // Handle Copy
  const handleCopyText = () => {
    navigator.clipboard.writeText(waMessageText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const selectedCount = phoneList.filter(p => p.enabled !== false).length;

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
        padding: '24px',
        width: '100%',
        maxWidth: '720px',
        maxHeight: '92vh',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        boxShadow: '0 25px 60px rgba(0,0,0,0.6)'
      }}>
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${T.border}`, paddingBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 14px rgba(16,185,129,0.4)' }}>
              <MessageSquare size={24} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: '900', color: T.txtPrimary, margin: 0 }}>
                Laporan Ringkasan Harian ke WhatsApp Owner
              </h3>
              <p style={{ fontSize: '0.78rem', color: T.txtSecondary, margin: '2px 0 0 0' }}>
                Kirim rekap omset 5 cabang, struk kasir, QRIS BCA, dan Grab-Food ke banyak nomor WhatsApp sekaligus
              </p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: T.txtMuted, cursor: 'pointer' }}>
            <X size={22} />
          </button>
        </div>

        {/* Bar Pilihan Tanggal & Kelola Nomor Owner */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          
          {/* Row 1: Tanggal Laporan */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: T.controlBg, padding: '10px 14px', borderRadius: '12px', border: `1px solid ${T.border}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Calendar size={16} color={T.accentGold} />
              <span style={{ fontSize: '0.80rem', fontWeight: '800', color: T.txtSecondary }}>
                Pilih Tanggal Rekapitulasi:
              </span>
            </div>
            <input
              type="date"
              value={targetDate}
              onChange={e => setTargetDate(e.target.value)}
              style={{ padding: '6px 12px', borderRadius: '8px', border: `1px solid ${T.border}`, background: T.cardBg, color: T.txtPrimary, fontWeight: '800', fontSize: '0.84rem' }}
            />
          </div>

          {/* Row 2: Daftar Nomor WhatsApp Penerima */}
          <div style={{ background: T.controlBg, padding: '14px', borderRadius: '12px', border: `1px solid ${T.border}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Users size={16} color="#10b981" />
                <span style={{ fontSize: '0.82rem', fontWeight: '900', color: '#10b981' }}>
                  Daftar Nomor WhatsApp Tujuan ({phoneList.length} Nomor Terdaftar)
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowAddForm(!showAddForm)}
                style={{
                  padding: '5px 12px',
                  borderRadius: '8px',
                  border: '1px solid #10b981',
                  background: showAddForm ? 'rgba(16,185,129,0.2)' : '#10b981',
                  color: showAddForm ? '#10b981' : '#ffffff',
                  fontWeight: '800',
                  fontSize: '0.74rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <Plus size={14} />
                <span>{showAddForm ? 'Tutup Form' : 'Tambahkan Nomor'}</span>
              </button>
            </div>

            {/* Form Input Tambah Nomor */}
            {showAddForm && (
              <form onSubmit={handleAddPhone} style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.5fr auto', gap: '8px', marginBottom: '12px', background: T.cardBg, padding: '10px', borderRadius: '10px', border: `1.5px dashed #10b981` }}>
                <input
                  type="text"
                  placeholder="Nama / Label (misal: Owner 2)"
                  value={newLabel}
                  onChange={e => setNewLabel(e.target.value)}
                  style={{ padding: '7px 10px', borderRadius: '6px', border: `1px solid ${T.border}`, background: T.controlBg, color: T.txtPrimary, fontSize: '0.80rem', fontWeight: '700' }}
                />
                <input
                  type="text"
                  required
                  placeholder="Nomor WA (contoh: 081298765432)"
                  value={newPhone}
                  onChange={e => setNewPhone(e.target.value)}
                  style={{ padding: '7px 10px', borderRadius: '6px', border: `1px solid ${T.border}`, background: T.controlBg, color: '#10b981', fontSize: '0.82rem', fontWeight: '900' }}
                />
                <button
                  type="submit"
                  style={{ padding: '7px 14px', borderRadius: '6px', border: 'none', background: '#10b981', color: '#ffffff', fontWeight: '900', fontSize: '0.78rem', cursor: 'pointer' }}
                >
                  Simpan
                </button>
              </form>
            )}

            {/* List Nomor Terdaftar */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '140px', overflowY: 'auto' }}>
              {phoneList.map(item => {
                const isEnabled = item.enabled !== false;
                return (
                  <div
                    key={item.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      background: isEnabled ? (themeMode === 'soft_blue' ? '#e0f2fe' : 'rgba(16,185,129,0.08)') : T.cardBg,
                      border: `1px solid ${isEnabled ? '#10b981' : T.border}`
                    }}
                  >
                    <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', flex: 1 }}>
                      <input
                        type="checkbox"
                        checked={isEnabled}
                        onChange={() => handleTogglePhone(item.id)}
                        style={{ width: '16px', height: '16px', accentColor: '#10b981', cursor: 'pointer' }}
                      />
                      <div>
                        <span style={{ fontSize: '0.80rem', fontWeight: '900', color: T.txtPrimary, marginRight: '8px' }}>
                          {item.label}
                        </span>
                        <span style={{ fontSize: '0.78rem', fontWeight: '800', color: '#10b981', fontFamily: 'monospace' }}>
                          +{cleanPhone(item.phone)}
                        </span>
                      </div>
                    </label>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <button
                        type="button"
                        onClick={() => handleSendSingle(item.phone)}
                        style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid #10b981', background: 'rgba(16,185,129,0.15)', color: '#10b981', fontSize: '0.70rem', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                        title="Kirim hanya ke nomor ini"
                      >
                        <Send size={11} />
                        <span>Kirim</span>
                      </button>

                      {phoneList.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleDeletePhone(item.id)}
                          style={{ padding: '4px 6px', borderRadius: '6px', border: `1px solid ${T.dangerBorder}`, background: T.dangerBg, color: T.danger, cursor: 'pointer' }}
                          title="Hapus Nomor Ini"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

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
            rows={10}
            value={waMessageText}
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: '12px',
              border: `1px solid ${T.border}`,
              background: themeMode === 'soft_blue' ? '#f0f7ff' : '#0b0f19',
              color: T.txtPrimary,
              fontFamily: 'monospace',
              fontSize: '0.78rem',
              lineHeight: '1.45',
              resize: 'vertical'
            }}
          />
        </div>

        {/* Footer Actions */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: `1px solid ${T.border}`, paddingTop: '14px', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ fontSize: '0.78rem', color: T.txtSecondary, fontWeight: '700' }}>
            Target: <strong style={{ color: '#10b981' }}>{selectedCount} Nomor WhatsApp Aktif</strong>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{ padding: '10px 18px', borderRadius: '10px', border: `1px solid ${T.border}`, background: T.controlBg, color: T.txtPrimary, fontWeight: '800', cursor: 'pointer' }}
            >
              Tutup
            </button>
            <button
              type="button"
              onClick={handleSendAllEnabled}
              style={{
                padding: '10px 22px',
                borderRadius: '10px',
                border: 'none',
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: '#ffffff',
                fontWeight: '900',
                fontSize: '0.85rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 4px 16px rgba(16,185,129,0.45)'
              }}
            >
              <Send size={16} />
              <span>Kirim Otomatis ke {selectedCount} Nomor WA</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
