import React from 'react';
import { TrendingUp, TrendingDown, DollarSign, Store, Clock, ArrowRight } from 'lucide-react';

export default function MobileBranchSummary({ selectedBranch, outlets, stats, recentTransactions, onNavigateAdd }) {
  const currentOutlet = outlets.find(o => o.id === selectedBranch) || outlets[0];
  const outletStat = stats.outletsStats?.find(o => o.id === (selectedBranch || outlets[0]?.id)) || { income: 0, expense: 0, netProfit: 0 };

  const formatRupiah = (val) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val || 0);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }} className="animate-fade-in">
      {/* Branch Financial Hero Card */}
      <div style={{
        background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '16px',
        padding: '18px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <span style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: '700', letterSpacing: '0.05em' }}>
            PERFORMANSI KEUANGAN
          </span>
          <span style={{ background: currentOutlet?.color || '#6366f1', color: 'white', fontSize: '0.68rem', fontWeight: '700', padding: '2px 8px', borderRadius: '10px' }}>
            {currentOutlet?.code}
          </span>
        </div>

        <h3 style={{ fontSize: '1.4rem', fontWeight: '800', color: '#f8fafc' }}>
          {currentOutlet?.name}
        </h3>
        <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '2px' }}>
          Manajer: {currentOutlet?.manager_name}
        </p>

        {/* Financial Stat Trio */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '16px' }}>
          <div style={{ background: '#0f172a', padding: '10px', borderRadius: '10px', border: '1px solid #334155' }}>
            <div style={{ fontSize: '0.7rem', color: '#34d399', fontWeight: '700' }}>+ PEMASUKAN</div>
            <div style={{ fontSize: '1rem', fontWeight: '800', color: '#f8fafc', marginTop: '2px' }}>
              {formatRupiah(outletStat.income)}
            </div>
          </div>

          <div style={{ background: '#0f172a', padding: '10px', borderRadius: '10px', border: '1px solid #334155' }}>
            <div style={{ fontSize: '0.7rem', color: '#fb7185', fontWeight: '700' }}>- PENGELUARAN</div>
            <div style={{ fontSize: '1rem', fontWeight: '800', color: '#f8fafc', marginTop: '2px' }}>
              {formatRupiah(outletStat.expense)}
            </div>
          </div>
        </div>

        {/* Net Profit Banner */}
        <div style={{ background: 'rgba(99, 102, 241, 0.15)', border: '1px solid rgba(99, 102, 241, 0.3)', padding: '12px', borderRadius: '10px', marginTop: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '0.75rem', color: '#818cf8', fontWeight: '700' }}>Laba Bersih Cabang:</span>
          <span style={{ fontSize: '1.1rem', fontWeight: '800', color: outletStat.netProfit >= 0 ? '#34d399' : '#fb7185' }}>
            {formatRupiah(outletStat.netProfit)}
          </span>
        </div>
      </div>

      {/* Quick Action Bar */}
      <button 
        onClick={onNavigateAdd}
        className="btn-emerald" 
        style={{ width: '100%', justifyContent: 'center', padding: '12px' }}
      >
        <TrendingUp size={18} />
        <span>+ Catat Transaksi Baru</span>
      </button>

      {/* Recent Activity List */}
      <div style={{ background: '#1e293b', borderRadius: '16px', padding: '16px', border: '1px solid rgba(255,255,255,0.08)' }}>
        <h4 style={{ fontSize: '0.85rem', fontWeight: '700', color: '#f8fafc', marginBottom: '12px' }}>
          Aktivitas Kas Terbaru Cabang Ini
        </h4>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {recentTransactions.slice(0, 5).map(tx => (
            <div key={tx.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#0f172a', padding: '10px 12px', borderRadius: '10px', border: '1px solid #334155' }}>
              <div>
                <div style={{ fontSize: '0.8rem', fontWeight: '700', color: '#f8fafc' }}>{tx.category}</div>
                <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{tx.date} • {tx.payment_method}</div>
              </div>
              <div style={{ fontSize: '0.85rem', fontWeight: '800', color: tx.type === 'income' ? '#34d399' : '#fb7185' }}>
                {tx.type === 'income' ? '+' : '-'}{formatRupiah(tx.amount)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
