import React, { useState } from 'react';
import { BookOpen, ShieldCheck, Plus, FileText } from 'lucide-react';
import { getThemePalette } from '../../utils/themeUtils';

export default function TermsAndPolicies({ masterData, setMasterData, themeMode = 'dark' }) {
  const T = getThemePalette(themeMode);
  const [showAdd, setShowAdd] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  const handleAddPolicy = (e) => {
    e.preventDefault();
    if (!title || !content) return;

    const updated = { ...masterData };
    updated.policies.unshift({ id: Date.now(), title, content });
    setMasterData(updated);
    setShowAdd(false);
    setTitle('');
    setContent('');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }} className="animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '800', color: T.txtPrimary }}>
            Ketentuan & Kebijakan Operasional (SOP & Rules)
          </h2>
          <p style={{ color: T.txtSecondary, fontSize: '0.875rem', marginTop: '4px' }}>
            Dokumentasi aturan operasional, kebijakan petty cash, penutupan kasir, dan wewenang pengadaan
          </p>
        </div>

        <button onClick={() => setShowAdd(true)} className="btn-primary">
          <Plus size={16} />
          <span>+ Tambah Ketentuan Baru</span>
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {masterData.policies.map(p => (
          <div key={p.id} className="glass-card" style={{ padding: '20px', borderLeft: `4px solid ${T.info}`, background: T.cardBg }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <ShieldCheck size={20} color={T.info} />
              <h3 style={{ fontSize: '1.1rem', fontWeight: '700', color: T.txtPrimary }}>{p.title}</h3>
            </div>
            <p style={{ fontSize: '0.875rem', color: T.txtSecondary, lineHeight: '1.6', background: T.cardBg2, padding: '14px', borderRadius: '10px', border: `1px solid ${T.borderStrong}` }}>
              {p.content}
            </p>
          </div>
        ))}
      </div>

      {showAdd && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(5px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div className="glass-card" style={{ width: '100%', maxWidth: '480px', padding: '24px', background: T.cardBg, border: `1px solid ${T.border}` }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: '800', color: T.txtPrimary, marginBottom: '16px' }}>Tambah Ketentuan SOP Baru</h3>
            <form onSubmit={handleAddPolicy} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '0.78rem', color: T.txtSecondary, display: 'block', marginBottom: '4px' }}>Judul Ketentuan / Kebijakan</label>
                <input type="text" required value={title} onChange={e => setTitle(e.target.value)} className="form-input" placeholder="Judul..." />
              </div>
              <div>
                <label style={{ fontSize: '0.78rem', color: T.txtSecondary, display: 'block', marginBottom: '4px' }}>Isi Isi SOP / Ketentuan</label>
                <textarea required rows={4} value={content} onChange={e => setContent(e.target.value)} className="form-input" placeholder="Tuliskan aturan lengkap..." />
              </div>
              <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
                <button type="button" onClick={() => setShowAdd(false)} className="btn-secondary" style={{ flex: 1, justifyContent: 'center' }}>Batal</button>
                <button type="submit" className="btn-primary" style={{ flex: 1, justifyContent: 'center' }}>Simpan Ketentuan</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

