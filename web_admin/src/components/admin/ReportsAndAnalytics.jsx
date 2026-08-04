import React, { useState, useEffect } from 'react';
import { FileText, Printer, Download, TrendingUp, TrendingDown, DollarSign, PieChart, BarChart2 } from 'lucide-react';
import { ResponsiveContainer, PieChart as RePieChart, Pie, Cell, Tooltip, Legend } from 'recharts';
import { getThemePalette } from '../../utils/themeUtils';

export default function ReportsAndAnalytics({ selectedBranch, outlets, themeMode = 'dark' }) {
  const T = getThemePalette(themeMode);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);

  const formatRupiah = (val) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val || 0);
  };

  useEffect(() => {
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

    const path = selectedBranch ? `/api/reports/pnl?branchId=${selectedBranch}` : '/api/reports/pnl';
    fetch(getApiUrl(path))
      .then(res => res.json())
      .then(data => {
        setReport(data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, [selectedBranch]);

  const COLORS = T.chartColors || ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4', '#f43f5e'];

  const handleExportPDF = () => {
    window.print();
  };

  const handleExportCSV = () => {
    if (!report) return;
    let csv = "Tipe,Kategori,Jumlah (IDR)\n";
    report.incomeByCategory.forEach(item => {
      csv += `Pemasukan,"${item.category}",${item.total}\n`;
    });
    report.expenseByCategory.forEach(item => {
      csv += `Pengeluaran,"${item.category}",${item.total}\n`;
    });
    csv += `\nSUMMARY,TOTAL PEMASUKAN,${report.totalIncome}\n`;
    csv += `SUMMARY,TOTAL PENGELUARAN,${report.totalExpense}\n`;
    csv += `SUMMARY,LABA BERSIH,${report.netProfit}\n`;

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Laporan_Laba_Rugi_${selectedBranch ? 'Branch_' + selectedBranch : 'Konsolidasi'}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }} className="animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '800', color: T.txtPrimary }}>
            Laporan Keuangan Laba Rugi (Profit & Loss Statement)
          </h2>
          <p style={{ color: T.txtSecondary, fontSize: '0.875rem', marginTop: '4px' }}>
            {selectedBranch 
              ? `Laporan Keuangan Resmi Cabang: ${outlets.find(o => o.id === selectedBranch)?.name}` 
              : 'Laporan Konsolidasi Seluruh Outlet Restoran'}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button onClick={handleExportCSV} className="btn-emerald">
            <Download size={16} />
            <span>Export CSV / Excel</span>
          </button>
          <button onClick={handleExportPDF} className="btn-secondary">
            <Printer size={16} />
            <span>Cetak / Cetak PDF</span>
          </button>
        </div>
      </div>


      {loading ? (
        <div className="glass-card" style={{ padding: '60px', textAlign: 'center', color: T.txtMuted, background: T.cardBg, border: `1px solid ${T.border}`, borderRadius: '12px' }}>
          Memuat data laporan laba rugi...
        </div>
      ) : report ? (
        <>
          {/* Summary Banner */}
          <div className="glass-card" style={{ padding: '28px', background: `linear-gradient(135deg, ${T.cardBg} 0%, ${T.cardBg2} 100%)`, border: `1px solid ${T.border}`, borderRadius: '16px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '24px' }}>
              <div>
                <span style={{ fontSize: '0.78rem', color: T.txtMuted, textTransform: 'uppercase', fontWeight: '600' }}>TOTAL BRUTO PEMASUKAN</span>
                <h3 style={{ fontSize: '1.8rem', fontWeight: '800', color: T.success, marginTop: '6px' }}>
                  {formatRupiah(report.totalIncome)}
                </h3>
              </div>

              <div>
                <span style={{ fontSize: '0.78rem', color: T.txtMuted, textTransform: 'uppercase', fontWeight: '600' }}>TOTAL BEBAN PENGELUARAN</span>
                <h3 style={{ fontSize: '1.8rem', fontWeight: '800', color: T.danger, marginTop: '6px' }}>
                  {formatRupiah(report.totalExpense)}
                </h3>
              </div>

              <div style={{ borderLeft: `1px solid ${T.borderStrong}`, paddingLeft: '20px' }}>
                <span style={{ fontSize: '0.78rem', color: T.txtMuted, textTransform: 'uppercase', fontWeight: '600' }}>LABA BERSIH OPERASIONAL</span>
                <h3 style={{ fontSize: '1.8rem', fontWeight: '800', color: report.netProfit >= 0 ? T.info : T.danger, marginTop: '6px' }}>
                  {formatRupiah(report.netProfit)}
                </h3>
              </div>
            </div>
          </div>

          {/* Income vs Expense Detailed Category Tables */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
            {/* Income Breakdown */}
            <div className="glass-card" style={{ padding: '24px', background: T.cardBg, border: `1px solid ${T.border}`, borderRadius: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: T.successBg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.success }}>
                  <TrendingUp size={20} />
                </div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: '700', color: T.txtPrimary }}>Rincian Pendapatan (Revenue)</h3>
              </div>

              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${T.borderStrong}`, color: T.txtMuted, fontSize: '0.75rem' }}>
                    <th style={{ textAlign: 'left', padding: '10px' }}>Kategori Penjualan</th>
                    <th style={{ textAlign: 'right', padding: '10px' }}>Jumlah (IDR)</th>
                    <th style={{ textAlign: 'right', padding: '10px' }}>Porsi</th>
                  </tr>
                </thead>
                <tbody>
                  {report.incomeByCategory.map((item, idx) => {
                    const pct = report.totalIncome > 0 ? ((item.total / report.totalIncome) * 100).toFixed(1) : 0;
                    return (
                      <tr key={idx} style={{ borderBottom: `1px solid ${T.border}`, color: T.txtPrimary }}>
                        <td style={{ padding: '12px 10px', fontWeight: '600' }}>{item.category}</td>
                        <td style={{ padding: '12px 10px', textAlign: 'right', color: T.success, fontWeight: '700' }}>{formatRupiah(item.total)}</td>
                        <td style={{ padding: '12px 10px', textAlign: 'right', color: T.txtSecondary }}>{pct}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Expense Breakdown */}
            <div className="glass-card" style={{ padding: '24px', background: T.cardBg, border: `1px solid ${T.border}`, borderRadius: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: T.dangerBg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.danger }}>
                  <TrendingDown size={20} />
                </div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: '700', color: T.txtPrimary }}>Rincian Beban Operasional (Expenses)</h3>
              </div>

              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${T.borderStrong}`, color: T.txtMuted, fontSize: '0.75rem' }}>
                    <th style={{ textAlign: 'left', padding: '10px' }}>Kategori Pengeluaran</th>
                    <th style={{ textAlign: 'right', padding: '10px' }}>Jumlah (IDR)</th>
                    <th style={{ textAlign: 'right', padding: '10px' }}>Porsi</th>
                  </tr>
                </thead>
                <tbody>
                  {report.expenseByCategory.map((item, idx) => {
                    const pct = report.totalExpense > 0 ? ((item.total / report.totalExpense) * 100).toFixed(1) : 0;
                    return (
                      <tr key={idx} style={{ borderBottom: `1px solid ${T.border}`, color: T.txtPrimary }}>
                        <td style={{ padding: '12px 10px', fontWeight: '600' }}>{item.category}</td>
                        <td style={{ padding: '12px 10px', textAlign: 'right', color: T.danger, fontWeight: '700' }}>{formatRupiah(item.total)}</td>
                        <td style={{ padding: '12px 10px', textAlign: 'right', color: T.txtSecondary }}>{pct}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Expense Distribution Pie Chart */}
          <div className="glass-card" style={{ padding: '24px', background: T.cardBg, border: `1px solid ${T.border}`, borderRadius: '16px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '700', color: T.txtPrimary, marginBottom: '6px' }}>
              Distribusi Beban Restoran (Expense Pie Chart)
            </h3>
            <p style={{ fontSize: '0.78rem', color: T.txtSecondary, marginBottom: '20px' }}>
              Visualisasi persentase struktur biaya restoran
            </p>

            <div style={{ width: '100%', height: '300px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <RePieChart>
                  <Pie
                    data={report.expenseByCategory}
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    fill={T.accentGold}
                    dataKey="total"
                    nameKey="category"
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                  >
                    {report.expenseByCategory.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [formatRupiah(value)]} contentStyle={{ backgroundColor: T.tooltipBg, borderColor: T.tooltipBorder || T.borderStrong, borderRadius: '10px', color: T.tooltipColor }} />
                  <Legend />
                </RePieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
