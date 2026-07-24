import React from 'react';
import { CheckCircle2, XCircle, FileImage, AlertTriangle, Building2, User, Calendar, DollarSign } from 'lucide-react';

export default function ExpenseApprovals({ pendingTransactions, onApprove, onReject }) {
  const formatRupiah = (val) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val || 0);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }} className="animate-fade-in">
      <div>
        <h2 style={{ fontSize: '1.5rem', fontWeight: '800', color: '#f8fafc' }}>
          Persetujuan Pengeluaran Restoran (Expense Approvals)
        </h2>
        <p style={{ color: '#94a3b8', fontSize: '0.875rem', marginTop: '4px' }}>
          Verifikasi pengeluaran bernominal besar & klaim nota yang diajukan oleh Manajer Cabang via Mobile App
        </p>
      </div>

      {pendingTransactions.length === 0 ? (
        <div className="glass-card" style={{ padding: '60px', textAlign: 'center', color: '#94a3b8' }}>
          <CheckCircle2 size={48} color="#10b981" style={{ marginBottom: '16px' }} />
          <h3 style={{ fontSize: '1.2rem', color: '#f8fafc', fontWeight: '700' }}>Semua Pengeluaran Telah Disetujui</h3>
          <p style={{ fontSize: '0.85rem', marginTop: '6px' }}>Tidak ada antrean pengajuan pengeluaran baru saat ini.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '24px' }}>
          {pendingTransactions.map(tx => (
            <div key={tx.id} className="glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', borderLeft: '4px solid #f59e0b' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <span style={{ background: '#1e293b', padding: '4px 10px', borderRadius: '6px', fontSize: '0.78rem', color: '#818cf8', border: '1px solid #334155', fontWeight: '700' }}>
                  🏢 {tx.branch_name}
                </span>
                <span className="badge-pending">⏳ Menunggu Persetujuan</span>
              </div>

              <div>
                <span style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: '600' }}>Kategori: {tx.category}</span>
                <h3 style={{ fontSize: '1.4rem', fontWeight: '800', color: '#fb7185', marginTop: '4px' }}>
                  {formatRupiah(tx.amount)}
                </h3>
              </div>

              <div style={{ background: '#0f172a', padding: '14px', borderRadius: '10px', border: '1px solid #334155', fontSize: '0.85rem', color: '#cbd5e1' }}>
                <p style={{ fontStyle: 'italic', marginBottom: '10px' }}>"{tx.description || 'Tidak ada catatan'}"</p>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#94a3b8' }}>
                  <span>Diajukan oleh: <strong style={{ color: '#f8fafc' }}>{tx.created_by}</strong></span>
                  <span>Tanggal: {tx.date}</span>
                </div>
              </div>

              {/* Receipt Preview Simulator */}
              <div style={{ background: 'rgba(99, 102, 241, 0.1)', padding: '12px', borderRadius: '10px', border: '1px dashed rgba(99, 102, 241, 0.3)', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.78rem', color: '#818cf8' }}>
                <FileImage size={20} />
                <span>Bukti Nota Terlampir: <strong>nota_pembelian_{tx.id}.jpg</strong></span>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                <button 
                  onClick={() => onReject(tx.id)}
                  className="btn-secondary" 
                  style={{ flex: 1, justifyContent: 'center', borderColor: 'rgba(244, 63, 94, 0.3)', color: '#fb7185' }}
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
