import React, { useState, useEffect } from 'react';
import { FileText, Printer, Download, TrendingUp, TrendingDown, DollarSign, PieChart, BarChart2 } from 'lucide-react';
import { ResponsiveContainer, PieChart as RePieChart, Pie, Cell, Tooltip, Legend } from 'recharts';

export default function ReportsAndAnalytics({ masterData, selectedBranch, outlets }) {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);

  const formatRupiah = (val) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val || 0);
  };

  useEffect(() => {
    const transactions = [
      ...(masterData?.salesTransactions || []),
      ...(masterData?.transactions || [])
    ].filter(t => !selectedBranch || Number(t.outlet_id || t.branch_id) === Number(selectedBranch));

    const totalIncome = transactions.reduce((sum, t) => sum + Number(t.amount || t.total || 0), 0);

    const dineInIncome = transactions
      .filter(t => t.order_type !== 'Take Away' && t.order_type !== 'takeaway')
      .reduce((sum, t) => sum + Number(t.amount || t.total || 0), 0);
    const takeAwayIncome = totalIncome - dineInIncome;
    
    const financialRecords = (masterData?.financialRecords || []).filter(f => !selectedBranch || Number(f.outlet_id) === Number(selectedBranch));
    const cogsTotal = (masterData?.ingredients || []).reduce((sum, i) => sum + (Number(i.stock || 0) * Number(i.unit_price || i.cost || 0)), 0);
    const opexTotal = financialRecords.filter(f => f.type === 'expense').reduce((sum, f) => sum + Number(f.amount || 0), 0);
    const totalExpense = opexTotal + cogsTotal;
    const netProfit = totalIncome - totalExpense;

    setReport({
      totalIncome,
      totalExpense,
      netProfit,
      incomeByCategory: [
        { category: 'Penjualan Dine-in (Makan di Tempat)', total: dineInIncome },
        { category: 'Penjualan Takeaway & Online', total: takeAwayIncome }
      ],
      expenseByCategory: [
        { category: 'Bahan Baku & Dapur (COGS)', total: cogsTotal },
        { category: 'Operational & General Expenses (OPEX)', total: opexTotal }
      ]
    });
  }, [masterData, selectedBranch]);

  const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4', '#f43f5e'];

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
          <h2 style={{ fontSize: '1.5rem', fontWeight: '800', color: '#f8fafc' }}>
            Laporan Keuangan Laba Rugi (Profit & Loss Statement)
          </h2>
          <p style={{ color: '#94a3b8', fontSize: '0.875rem', marginTop: '4px' }}>
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
        <div className="glass-card" style={{ padding: '60px', textAlign: 'center', color: '#94a3b8' }}>
          Memuat data laporan laba rugi...
        </div>
      ) : report ? (
        <>
          {/* Summary Banner */}
          <div className="glass-card" style={{ padding: '28px', background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.9) 0%, rgba(15, 23, 42, 0.9) 100%)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '24px' }}>
              <div>
                <span style={{ fontSize: '0.78rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: '600' }}>TOTAL BRUTO PEMASUKAN</span>
                <h3 style={{ fontSize: '1.8rem', fontWeight: '800', color: '#34d399', marginTop: '6px' }}>
                  {formatRupiah(report.totalIncome)}
                </h3>
              </div>

              <div>
                <span style={{ fontSize: '0.78rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: '600' }}>TOTAL BEBAN PENGELUARAN</span>
                <h3 style={{ fontSize: '1.8rem', fontWeight: '800', color: '#fb7185', marginTop: '6px' }}>
                  {formatRupiah(report.totalExpense)}
                </h3>
              </div>

              <div style={{ borderLeft: '1px solid #334155', paddingLeft: '20px' }}>
                <span style={{ fontSize: '0.78rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: '600' }}>LABA BERSIH OPERASIONAL</span>
                <h3 style={{ fontSize: '1.8rem', fontWeight: '800', color: report.netProfit >= 0 ? '#818cf8' : '#f43f5e', marginTop: '6px' }}>
                  {formatRupiah(report.netProfit)}
                </h3>
              </div>
            </div>
          </div>

          {/* Income vs Expense Detailed Category Tables */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
            {/* Income Breakdown */}
            <div className="glass-card" style={{ padding: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(16,185,129,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#34d399' }}>
                  <TrendingUp size={20} />
                </div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: '700', color: '#f8fafc' }}>Rincian Pendapatan (Revenue)</h3>
              </div>

              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #334155', color: '#94a3b8', fontSize: '0.75rem' }}>
                    <th style={{ textAlign: 'left', padding: '10px' }}>Kategori Penjualan</th>
                    <th style={{ textAlign: 'right', padding: '10px' }}>Jumlah (IDR)</th>
                    <th style={{ textAlign: 'right', padding: '10px' }}>Porsi</th>
                  </tr>
                </thead>
                <tbody>
                  {report.incomeByCategory.map((item, idx) => {
                    const pct = report.totalIncome > 0 ? ((item.total / report.totalIncome) * 100).toFixed(1) : 0;
                    return (
                      <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', color: '#f8fafc' }}>
                        <td style={{ padding: '12px 10px', fontWeight: '600' }}>{item.category}</td>
                        <td style={{ padding: '12px 10px', textAlign: 'right', color: '#34d399', fontWeight: '700' }}>{formatRupiah(item.total)}</td>
                        <td style={{ padding: '12px 10px', textAlign: 'right', color: '#94a3b8' }}>{pct}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Expense Breakdown */}
            <div className="glass-card" style={{ padding: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(244,63,94,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fb7185' }}>
                  <TrendingDown size={20} />
                </div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: '700', color: '#f8fafc' }}>Rincian Beban Operasional (Expenses)</h3>
              </div>

              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #334155', color: '#94a3b8', fontSize: '0.75rem' }}>
                    <th style={{ textAlign: 'left', padding: '10px' }}>Kategori Pengeluaran</th>
                    <th style={{ textAlign: 'right', padding: '10px' }}>Jumlah (IDR)</th>
                    <th style={{ textAlign: 'right', padding: '10px' }}>Porsi</th>
                  </tr>
                </thead>
                <tbody>
                  {report.expenseByCategory.map((item, idx) => {
                    const pct = report.totalExpense > 0 ? ((item.total / report.totalExpense) * 100).toFixed(1) : 0;
                    return (
                      <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', color: '#f8fafc' }}>
                        <td style={{ padding: '12px 10px', fontWeight: '600' }}>{item.category}</td>
                        <td style={{ padding: '12px 10px', textAlign: 'right', color: '#fb7185', fontWeight: '700' }}>{formatRupiah(item.total)}</td>
                        <td style={{ padding: '12px 10px', textAlign: 'right', color: '#94a3b8' }}>{pct}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Expense Distribution Pie Chart */}
          <div className="glass-card" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '700', color: '#f8fafc', marginBottom: '6px' }}>
              Distribusi Beban Restoran (Expense Pie Chart)
            </h3>
            <p style={{ fontSize: '0.78rem', color: '#94a3b8', marginBottom: '20px' }}>
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
                    fill="#8884d8"
                    dataKey="total"
                    nameKey="category"
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                  >
                    {report.expenseByCategory.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [formatRupiah(value)]} contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '10px', color: '#fff' }} />
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
