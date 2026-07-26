import React, { useState } from 'react';
import { DollarSign, ShoppingBasket, Zap, Home, Plus, Trash2, Calendar, FileText } from 'lucide-react';

export default function CostsManagement({ masterData, setMasterData, selectedBranch }) {
  const [activeSubTab, setActiveSubTab] = useState('cogs'); // 'cogs' | 'production' | 'other'

  const formatRupiah = (val) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val || 0);
  };

  const getOutletName = (id) => {
    const found = masterData.outlets.find(o => o.id === id);
    return found ? found.name : 'All Outlets';
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }} className="animate-fade-in">
      <div>
        <h2 style={{ fontSize: '1.5rem', fontWeight: '800', color: '#f8fafc' }}>
          Manajemen Pengeluaran & Biaya Restoran (Cost Center)
        </h2>
        <p style={{ color: '#94a3b8', fontSize: '0.875rem', marginTop: '4px' }}>
          Pencatatan dan analisis 3 struktur biaya utama: HPP (COGS), Biaya Produksi, dan Biaya Lain-Lain / Overhead
        </p>
      </div>

      {/* Sub-Tab Navigation Bar */}
      <div style={{ display: 'flex', gap: '10px' }}>
        <button
          onClick={() => setActiveSubTab('cogs')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 20px',
            borderRadius: '12px',
            border: '1px solid',
            borderColor: activeSubTab === 'cogs' ? '#6366f1' : '#334155',
            background: activeSubTab === 'cogs' ? 'rgba(99, 102, 241, 0.2)' : '#1e293b',
            color: activeSubTab === 'cogs' ? '#818cf8' : '#94a3b8',
            fontWeight: '700',
            fontSize: '0.85rem',
            cursor: 'pointer'
          }}
        >
          <ShoppingBasket size={18} />
          <span>Biaya Harga Pokok Produksi (HPP / COGS)</span>
        </button>

        <button
          onClick={() => setActiveSubTab('production')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 20px',
            borderRadius: '12px',
            border: '1px solid',
            borderColor: activeSubTab === 'production' ? '#6366f1' : '#334155',
            background: activeSubTab === 'production' ? 'rgba(99, 102, 241, 0.2)' : '#1e293b',
            color: activeSubTab === 'production' ? '#818cf8' : '#94a3b8',
            fontWeight: '700',
            fontSize: '0.85rem',
            cursor: 'pointer'
          }}
        >
          <Zap size={18} />
          <span>Biaya Produksi & Utilitas Dapur</span>
        </button>

        <button
          onClick={() => setActiveSubTab('other')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 20px',
            borderRadius: '12px',
            border: '1px solid',
            borderColor: activeSubTab === 'other' ? '#6366f1' : '#334155',
            background: activeSubTab === 'other' ? 'rgba(99, 102, 241, 0.2)' : '#1e293b',
            color: activeSubTab === 'other' ? '#818cf8' : '#94a3b8',
            fontWeight: '700',
            fontSize: '0.85rem',
            cursor: 'pointer'
          }}
        >
          <Home size={18} />
          <span>Biaya Lain-Lain & Overhead</span>
        </button>
      </div>

      {/* COST CONTENT TABLES */}
      <div className="glass-card" style={{ padding: '20px' }}>
        {activeSubTab === 'cogs' && (
          <div>
            <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: '700', color: '#f8fafc' }}>
                Biaya Harga Pokok Produksi (Bahan Baku & Dapur)
              </h3>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #334155', color: '#94a3b8', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                  <th style={{ padding: '10px' }}>Tanggal</th>
                  <th style={{ padding: '10px' }}>Restoran Outlet</th>
                  <th style={{ padding: '10px' }}>Deskripsi Bahan Baku</th>
                  <th style={{ padding: '10px' }}>Supplier Vendor</th>
                  <th style={{ padding: '10px', textAlign: 'right' }}>Total Biaya (IDR)</th>
                </tr>
              </thead>
              <tbody>
                {(masterData.cogsExpenses || []).filter(item => selectedBranch ? Number(item.outlet_id) === Number(selectedBranch) : true).map(item => (
                  <tr key={item.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', color: '#f8fafc' }}>
                    <td style={{ padding: '12px 10px', color: '#94a3b8' }}>{item.date}</td>
                    <td style={{ padding: '12px 10px', fontWeight: '600' }}>{getOutletName(item.outlet_id)}</td>
                    <td style={{ padding: '12px 10px', fontWeight: '700' }}>{item.item}</td>
                    <td style={{ padding: '12px 10px', color: '#818cf8' }}>{item.supplier}</td>
                    <td style={{ padding: '12px 10px', textAlign: 'right', fontWeight: '800', color: '#fb7185' }}>{formatRupiah(item.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeSubTab === 'production' && (
          <div>
            <div style={{ marginBottom: '16px' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: '700', color: '#f8fafc' }}>
                Biaya Operasional Produksi & Kemasan
              </h3>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #334155', color: '#94a3b8', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                  <th style={{ padding: '10px' }}>Tanggal</th>
                  <th style={{ padding: '10px' }}>Restoran Outlet</th>
                  <th style={{ padding: '10px' }}>Kategori Biaya</th>
                  <th style={{ padding: '10px' }}>Keterangan</th>
                  <th style={{ padding: '10px', textAlign: 'right' }}>Jumlah Biaya (IDR)</th>
                </tr>
              </thead>
              <tbody>
                {(masterData.productionExpenses || []).filter(item => selectedBranch ? Number(item.outlet_id) === Number(selectedBranch) : true).map(item => (
                  <tr key={item.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', color: '#f8fafc' }}>
                    <td style={{ padding: '12px 10px', color: '#94a3b8' }}>{item.date}</td>
                    <td style={{ padding: '12px 10px', fontWeight: '600' }}>{getOutletName(item.outlet_id)}</td>
                    <td style={{ padding: '12px 10px', fontWeight: '700', color: '#fbbf24' }}>{item.category}</td>
                    <td style={{ padding: '12px 10px', color: '#cbd5e1' }}>{item.description}</td>
                    <td style={{ padding: '12px 10px', textAlign: 'right', fontWeight: '800', color: '#fb7185' }}>{formatRupiah(item.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeSubTab === 'other' && (
          <div>
            <div style={{ marginBottom: '16px' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: '700', color: '#f8fafc' }}>
                Biaya Lain-Lain & Overhead Operasional
              </h3>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #334155', color: '#94a3b8', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                  <th style={{ padding: '10px' }}>Tanggal</th>
                  <th style={{ padding: '10px' }}>Restoran Outlet</th>
                  <th style={{ padding: '10px' }}>Kategori Biaya</th>
                  <th style={{ padding: '10px' }}>Rincian Pengeluaran</th>
                  <th style={{ padding: '10px', textAlign: 'right' }}>Jumlah Biaya (IDR)</th>
                </tr>
              </thead>
              <tbody>
                {(masterData.otherExpenses || []).filter(item => selectedBranch ? Number(item.outlet_id) === Number(selectedBranch) : true).map(item => (
                  <tr key={item.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', color: '#f8fafc' }}>
                    <td style={{ padding: '12px 10px', color: '#94a3b8' }}>{item.date}</td>
                    <td style={{ padding: '12px 10px', fontWeight: '600' }}>{getOutletName(item.outlet_id)}</td>
                    <td style={{ padding: '12px 10px', fontWeight: '700', color: '#818cf8' }}>{item.category}</td>
                    <td style={{ padding: '12px 10px', color: '#cbd5e1' }}>{item.description}</td>
                    <td style={{ padding: '12px 10px', textAlign: 'right', fontWeight: '800', color: '#fb7185' }}>{formatRupiah(item.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
