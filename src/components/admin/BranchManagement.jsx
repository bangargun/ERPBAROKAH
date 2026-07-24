import React, { useState } from 'react';
import { Store, Plus, User, Phone, DollarSign, MapPin, CheckCircle, ShieldAlert } from 'lucide-react';

export default function BranchManagement({ outlets, onAddBranch }) {
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    location: '',
    manager_name: '',
    phone: '',
    monthly_budget: '50000000',
    color: '#6366f1'
  });

  const formatRupiah = (val) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val || 0);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name || !formData.code) return;
    onAddBranch(formData);
    setShowModal(false);
    setFormData({ code: '', name: '', location: '', manager_name: '', phone: '', monthly_budget: '50000000', color: '#6366f1' });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }} className="animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '800', color: '#f8fafc' }}>
            Manajemen Restoran & Cabang Outlet
          </h2>
          <p style={{ color: '#94a3b8', fontSize: '0.875rem', marginTop: '4px' }}>
            Kelola lokasi restoran, alokasi anggaran bulanan, dan penanggung jawab cabang
          </p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary">
          <Plus size={18} />
          <span>Tambah Cabang Restoran</span>
        </button>
      </div>

      {/* Branch Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
        {outlets.map(outlet => (
          <div key={outlet.id} className="glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: outlet.color || '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: '800', fontSize: '1.1rem' }}>
                  {outlet.code.split('-')[1] || 'RST'}
                </div>
                <div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: '800', color: '#f8fafc' }}>{outlet.name}</h3>
                  <span style={{ fontSize: '0.75rem', color: '#94a3b8', background: '#0f172a', padding: '2px 8px', borderRadius: '4px', border: '1px solid #334155' }}>
                    {outlet.code}
                  </span>
                </div>
              </div>

              <span style={{ background: 'rgba(16,185,129,0.15)', color: '#34d399', fontSize: '0.72rem', fontWeight: '700', padding: '4px 10px', borderRadius: '12px' }}>
                ● {outlet.status}
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.85rem', color: '#cbd5e1', background: '#0f172a', padding: '14px', borderRadius: '10px', border: '1px solid #334155' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <MapPin size={16} color="#94a3b8" />
                <span>{outlet.location}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <User size={16} color="#94a3b8" />
                <span>Manajer: <strong>{outlet.manager_name || 'Belum diatur'}</strong></span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Phone size={16} color="#94a3b8" />
                <span>{outlet.phone || '-'}</span>
              </div>
            </div>

            <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Alokasi Budget Operasional</span>
                <div style={{ fontSize: '1.1rem', fontWeight: '800', color: '#6366f1' }}>
                  {formatRupiah(outlet.monthly_budget)}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal Add Branch */}
      {showModal && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.7)',
          backdropFilter: 'blur(5px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100
        }}>
          <div className="glass-card" style={{ width: '100%', maxWidth: '500px', padding: '28px', background: '#1e293b' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: '800', color: '#f8fafc', marginBottom: '20px' }}>
              Tambah Outlet Restoran Baru
            </h3>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'block', marginBottom: '6px' }}>Kode Outlet (e.g. RST-004)</label>
                <input 
                  type="text" 
                  required 
                  value={formData.code} 
                  onChange={e => setFormData({...formData, code: e.target.value})} 
                  className="form-input" 
                  placeholder="RST-004" 
                />
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'block', marginBottom: '6px' }}>Nama Restoran & Cabang</label>
                <input 
                  type="text" 
                  required 
                  value={formData.name} 
                  onChange={e => setFormData({...formData, name: e.target.value})} 
                  className="form-input" 
                  placeholder="Seafood Palace - Ancol" 
                />
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'block', marginBottom: '6px' }}>Alamat Lengkap Outlet</label>
                <input 
                  type="text" 
                  required 
                  value={formData.location} 
                  onChange={e => setFormData({...formData, location: e.target.value})} 
                  className="form-input" 
                  placeholder="Jl. Pantai Indah No. 10, Jakarta" 
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'block', marginBottom: '6px' }}>Nama Manajer Cabang</label>
                  <input 
                    type="text" 
                    value={formData.manager_name} 
                    onChange={e => setFormData({...formData, manager_name: e.target.value})} 
                    className="form-input" 
                    placeholder="Andi Pratama" 
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'block', marginBottom: '6px' }}>No. HP Manajer</label>
                  <input 
                    type="text" 
                    value={formData.phone} 
                    onChange={e => setFormData({...formData, phone: e.target.value})} 
                    className="form-input" 
                    placeholder="0812-xxxx-xxxx" 
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'block', marginBottom: '6px' }}>Anggaran Bulanan (IDR)</label>
                <input 
                  type="number" 
                  value={formData.monthly_budget} 
                  onChange={e => setFormData({...formData, monthly_budget: e.target.value})} 
                  className="form-input" 
                />
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary" style={{ flex: 1, justifyContent: 'center' }}>
                  Batal
                </button>
                <button type="submit" className="btn-primary" style={{ flex: 1, justifyContent: 'center' }}>
                  Simpan Outlet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
