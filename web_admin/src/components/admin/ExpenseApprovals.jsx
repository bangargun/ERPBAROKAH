import React from 'react';
import { getThemePalette } from '../../utils/themeUtils';
import { CheckCircle2, XCircle, FileImage, AlertTriangle, Building2, User, Calendar, DollarSign } from 'lucide-react';

export default function ExpenseApprovals({ pendingTransactions = [], onApprove, onReject, themeMode = 'dark' }) {
  const T = getThemePalette(themeMode);

  const formatRupiah = (val) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val || 0);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px', color: T.txtPrimary }} className="animate-fade-in">
      <div>
        <h2 style={{ fontSize: '1.5rem', fontWeight: '800', color: T.txtPrimary }}>
          Persetujuan Pengeluaran Restoran (Expense Approvals)
        </h2>
        <p style={{ color: T.txtSecondary, fontSize: '0.875rem', marginTop: '4px' }}>
          Verifikasi pengeluaran bernominal besar & klaim nota yang diajukan oleh Manajer Cabang via Mobile App
        </p>
      </div>

      {pendingTransactions.length === 0 ? (
        <div className="glass-card" style={{ padding: '60px', textAlign: 'center', color: T.txtSecondary, background: T.cardBg, border: `1px solid ${T.border}` }}>
          <CheckCircle2 size={48} color={T.success} style={{ marginBottom: '16px' }} />
          <h3 style={{ fontSize: '1.2rem', color: T.txtPrimary, fontWeight: '700' }}>Semua Pengeluaran Telah Disetujui</h3>
          <p style={{ fontSize: '0.85rem', marginTop: '6px', color: T.txtMuted }}>Tidak ada antrean pengajuan pengeluaran baru saat ini.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '24px' }}>
          {pendingTransactions.map(tx => (
            <div key={tx.id} className="glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', background: T.cardBg, border: `1px solid ${T.border}`, borderLeft: `4px solid ${T.accentGold}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <span style={{ background: T.cardBg2, padding: '4px 10px', borderRadius: '6px', fontSize: '0.78rem', color: T.info, border: `1px solid ${T.borderStrong}`, fontWeight: '700' }}>
                  {tx.branch_name}
                </span>
                <span className="badge-pending" style={{ background: T.warningBg, color: T.warning, border: `1px solid ${T.warningBorder}`, padding: '4px 10px', borderRadius: '6px', fontSize: '0.78rem', fontWeight: '700' }}>Menunggu Persetujuan</span>
              </div>

              <div>
                <span style={{ fontSize: '0.75rem', color: T.txtSecondary, textTransform: 'uppercase', fontWeight: '600' }}>Kategori: {tx.category}</span>
                <h3 style={{ fontSize: '1.4rem', fontWeight: '800', color: T.danger, marginTop: '4px' }}>
                  {formatRupiah(tx.amount)}
                </h3>
              </div>

              <div style={{ background: T.cardBg2, padding: '14px', borderRadius: '10px', border: `1px solid ${T.borderStrong}`, fontSize: '0.85rem', color: T.txtPrimary }}>
                <p style={{ fontStyle: 'italic', marginBottom: '10px' }}>"{tx.description || 'Tidak ada catatan'}"</p>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: T.txtSecondary }}>
                  <span>Diajukan oleh: <strong style={{ color: T.txtPrimary }}>{tx.created_by}</strong></span>
                  <span>Tanggal: {tx.date} {tx.time ? tx.time.substring(0, 5) : '00:00'} WIB</span>
                </div>
              </div>

              {/* Receipt Preview Simulator */}
              <div style={{ background: T.infoBg, padding: '12px', borderRadius: '10px', border: `1px dashed ${T.infoBorder}`, display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.78rem', color: T.info }}>
                <FileImage size={20} />
                <span>Bukti Nota Terlampir: <strong>nota_pembelian_{tx.id}.jpg</strong></span>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                <button 
                  onClick={() => onReject(tx.id)}
                  className="btn-secondary" 
                  style={{ flex: 1, justifyContent: 'center', background: T.dangerBg, borderColor: T.dangerBorder, color: T.danger }}
                >
                  <XCircle size={16} />
                  <span>Tolak (Reject)</span>
                </button>

                <button 
                  onClick={() => onApprove(tx.id)}
                  className="btn-emerald" 
                  style={{ flex: 1, justifyContent: 'center' }}
                >
                  <CheckCircle2 size={16} />
                  <span>Setujui (Approve)</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
