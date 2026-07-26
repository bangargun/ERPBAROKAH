import React, { useState, useEffect } from 'react';
import { Clock, CheckCircle, AlertTriangle, User, DollarSign, Calendar, RefreshCw } from 'lucide-react';

export default function ShiftAudit({ selectedBranch }) {
  const [closings, setClosings] = useState([]);
  const [loading, setLoading] = useState(true);

  const formatRupiah = (val) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val || 0);
  };

  const fetchClosings = () => {
    setLoading(true);
    const url = selectedBranch ? `/api/shift-closings?branchId=${selectedBranch}` : '/api/shift-closings';
    fetch(url)
      .then(res => res.json())
      .then(data => {
        setClosings(data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchClosings();
  }, [selectedBranch]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }} className="animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '800', color: '#f8fafc' }}>
            Audit Penutupan Kas Shift (Shift Closing Audit)
          </h2>
          <p style={{ color: '#94a3b8', fontSize: '0.875rem', marginTop: '4px' }}>
            Rekonsiliasi fisik uang kas di laci kasir vs Penjualan Sistem POS
          </p>
        </div>

        <button onClick={fetchClosings} className="btn-secondary">
          <RefreshCw size={16} />
          <span>Refresh Audit</span>
        </button>
      </div>

      <div className="glass-card" style={{ padding: '24px' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #334155', color: '#94a3b8', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                <th style={{ padding: '12px' }}>Tanggal & Shift</th>
                <th style={{ padding: '12px' }}>Restoran / Outlet</th>
                <th style={{ padding: '12px' }}>Kasir Bertugas</th>
                <th style={{ padding: '12px', textAlign: 'right' }}>Omset Sistem POS</th>
                <th style={{ padding: '12px', textAlign: 'right' }}>Fisik Uang Kas</th>
                <th style={{ padding: '12px', textAlign: 'right' }}>Non-Tunai (QRIS + EDC)</th>
                <th style={{ padding: '12px', textAlign: 'right' }}>Selisih Audit</th>
                <th style={{ padding: '12px' }}>Catatan Shift</th>
              </tr>
            </thead>
            <tbody>
              {closings.map(item => (
                <tr key={item.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', color: '#f8fafc' }}>
                  <td style={{ padding: '12px' }}>
                    <div style={{ fontWeight: '700' }}>{item.shift_date}</div>
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{item.shift_name}</div>
                  </td>
                  <td style={{ padding: '12px', fontWeight: '600' }}>{item.branch_name}</td>
                  <td style={{ padding: '12px' }}>{item.cashier_name}</td>
                  <td style={{ padding: '12px', textAlign: 'right', fontWeight: '700', color: '#38bdf8' }}>
                    {formatRupiah(item.system_sales)}
                  </td>
                  <td style={{ padding: '12px', textAlign: 'right', fontWeight: '700', color: '#34d399' }}>
                    {formatRupiah(item.actual_cash)}
                  </td>
                  <td style={{ padding: '12px', textAlign: 'right', color: '#cbd5e1' }}>
                    {formatRupiah((item.qris_sales || 0) + (item.edc_sales || 0))}
                  </td>
                  <td style={{ padding: '12px', textAlign: 'right', fontWeight: '800' }}>
                    {item.variance === 0 ? (
                      <span style={{ color: '#34d399', background: 'rgba(16,185,129,0.15)', padding: '4px 8px', borderRadius: '6px' }}>
                        ✓ PAS (NIHIL)
                      </span>
                    ) : item.variance > 0 ? (
                      <span style={{ color: '#fbbf24', background: 'rgba(245,158,11,0.15)', padding: '4px 8px', borderRadius: '6px' }}>
                        +{formatRupiah(item.variance)}
                      </span>
                    ) : (
                      <span style={{ color: '#f43f5e', background: 'rgba(244,63,94,0.15)', padding: '4px 8px', borderRadius: '6px' }}>
                        {formatRupiah(item.variance)}
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '12px', color: '#94a3b8', fontStyle: 'italic', maxWidth: '200px' }}>
                    {item.notes || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
