import React, { useState, useEffect } from 'react';
import { Clock, CheckCircle, AlertTriangle, User, DollarSign, Calendar, RefreshCw } from 'lucide-react';
import { getThemePalette } from '../../utils/themeUtils';

export default function ShiftAudit({ selectedBranch, themeMode = 'dark' }) {
  const T = getThemePalette(themeMode);
  const [closings, setClosings] = useState([]);
  const [loading, setLoading] = useState(true);

  const formatRupiah = (val) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val || 0);
  };

  const fetchClosings = () => {
    setLoading(true);
    const getApiUrl = (pathStr) => {
      if (typeof window !== 'undefined') {
        const savedServer = localStorage.getItem('MRIS_SERVER_URL');
        if (savedServer && savedServer.trim() !== '') {
          return `${savedServer.replace(/\/$/, '')}${pathStr}`;
        }
      }
      return `https://mris-api.barokahgroupindonesia.tech${pathStr}`;
    };

    const path = selectedBranch ? `/api/shift-closings?branchId=${selectedBranch}` : '/api/shift-closings';
    fetch(getApiUrl(path))
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
          <h2 style={{ fontSize: '1.5rem', fontWeight: '800', color: T.txtPrimary }}>
            Audit Penutupan Kas Shift (Shift Closing Audit)
          </h2>
          <p style={{ color: T.txtSecondary, fontSize: '0.875rem', marginTop: '4px' }}>
            Rekonsiliasi fisik uang kas di laci kasir vs Penjualan Sistem POS
          </p>
        </div>

        <button onClick={fetchClosings} className="btn-secondary" style={{ background: T.cardBg, borderColor: T.border, color: T.txtPrimary }}>
          <RefreshCw size={16} />
          <span>Refresh Audit</span>
        </button>
      </div>

      <div className="glass-card" style={{ padding: '24px', background: T.cardBg, borderColor: T.border }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ background: T.tableHeaderBg, borderBottom: `1px solid ${T.border}`, color: T.txtSecondary, fontSize: '0.75rem', textTransform: 'uppercase' }}>
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
                <tr key={item.id} style={{ borderBottom: `1px solid ${T.border}`, color: T.txtPrimary }}>
                  <td style={{ padding: '12px' }}>
                    <div style={{ fontWeight: '700' }}>{item.shift_date}</div>
                    <div style={{ fontSize: '0.75rem', color: T.txtSecondary }}>{item.shift_name}</div>
                  </td>
                  <td style={{ padding: '12px', fontWeight: '600' }}>{item.branch_name}</td>
                  <td style={{ padding: '12px' }}>{item.cashier_name}</td>
                  <td style={{ padding: '12px', textAlign: 'right', fontWeight: '700', color: T.info }}>
                    {formatRupiah(item.system_sales)}
                  </td>
                  <td style={{ padding: '12px', textAlign: 'right', fontWeight: '700', color: T.success }}>
                    {formatRupiah(item.actual_cash)}
                  </td>
                  <td style={{ padding: '12px', textAlign: 'right', color: T.txtPrimary }}>
                    {formatRupiah((item.qris_sales || 0) + (item.edc_sales || 0))}
                  </td>
                  <td style={{ padding: '12px', textAlign: 'right', fontWeight: '800' }}>
                    {item.variance === 0 ? (
                      <span style={{ color: T.success, background: T.successBg, padding: '4px 8px', borderRadius: '6px' }}>
                        ✓ PAS (NIHIL)
                      </span>
                    ) : item.variance > 0 ? (
                      <span style={{ color: T.warning, background: T.warningBg, padding: '4px 8px', borderRadius: '6px' }}>
                        +{formatRupiah(item.variance)}
                      </span>
                    ) : (
                      <span style={{ color: T.danger, background: T.dangerBg, padding: '4px 8px', borderRadius: '6px' }}>
                        {formatRupiah(item.variance)}
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '12px', color: T.txtSecondary, fontStyle: 'italic', maxWidth: '200px' }}>
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
