import React, { useState, useEffect, useCallback } from 'react';
import {
  Users, Smartphone, Plus, Edit3, Trash2, X, Eye, EyeOff,
  RefreshCw, Building2, ShieldCheck, Save, AlertTriangle
} from 'lucide-react';

const API = 'https://mris-api.barokahgroupindonesia.tech';

const WEB_ROLES = ['Super Admin', 'Owner', 'Admin', 'Manajer Cabang', 'Kasir'];
const MOBILE_ROLES = ['Super Admin / Owner', 'Kepala Cabang / SPV', 'Kasir', 'Logistik & Dapur'];

const EMPTY_WEB = { name: '', username: '', password: '', role: 'Admin', outlet: 'Semua Outlet (Central)', status: 'Aktif' };
const EMPTY_MOBILE = { name: '', username: '', mobileLoginPassword: '123', role: 'Kasir', outlet: 'Semua Outlet (Central)', status: 'Aktif', canAccessMobileReports: true, mobileReportPassword: '8888' };

export default function UserRightsSettings({ masterData, setMasterData }) {
  const [activeTab, setActiveTab] = useState('mobile'); // 'mobile' | 'web'
  const [loading, setLoading] = useState(false);
  const [webUsers, setWebUsers] = useState([]);
  const [mobileUsers, setMobileUsers] = useState([]);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('mobile'); // 'mobile' | 'web'
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({});
  const [showPwd, setShowPwd] = useState(false);
  const [showRepPwd, setShowRepPwd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);

  const outlets = masterData?.outlets || [];

  // Load from masterData
  const loadUsers = useCallback(() => {
    setWebUsers(Array.isArray(masterData?.webAdminAccounts) ? masterData.webAdminAccounts : []);
    setMobileUsers(Array.isArray(masterData?.mobileAccounts) ? masterData.mobileAccounts : []);
  }, [masterData]);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  // ─── REFRESH dari API ───
  const handleRefresh = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/master-data`, { cache: 'no-store' });
      const data = await res.json();
      if (data && data.mobileAccounts) setMobileUsers(data.mobileAccounts);
      if (data && data.webAdminAccounts) setWebUsers(data.webAdminAccounts);
      setMasterData(data);
    } catch (e) {
      alert('Gagal memuat data dari server: ' + e.message);
    }
    setLoading(false);
  };

  // ─── OPEN MODAL ───
  const openAdd = (type) => {
    setModalType(type);
    setEditingId(null);
    setForm(type === 'web' ? { ...EMPTY_WEB } : { ...EMPTY_MOBILE });
    setShowPwd(false);
    setShowRepPwd(false);
    setShowModal(true);
  };

  const openEdit = (type, user) => {
    setModalType(type);
    setEditingId(user.id);
    setForm({ ...user });
    setShowPwd(false);
    setShowRepPwd(false);
    setShowModal(true);
  };

  // ─── SAVE (ADD / EDIT) ───
  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name?.trim() || !form.username?.trim()) {
      alert('Nama dan Username wajib diisi!');
      return;
    }
    setSaving(true);

    try {
      // Ambil data terkini dari server
      const res = await fetch(`${API}/api/master-data`, { cache: 'no-store' });
      const latest = await res.json();
      const key = modalType === 'web' ? 'webAdminAccounts' : 'mobileAccounts';
      let list = Array.isArray(latest[key]) ? [...latest[key]] : [];

      if (editingId) {
        // Edit: update berdasarkan id SAJA
        list = list.map(u => String(u.id) === String(editingId) ? { ...u, ...form, id: u.id } : u);
      } else {
        // Add: buat ID baru
        const newId = Date.now();
        list = [...list, { ...form, id: newId }];
      }

      const updated = { ...latest, [key]: list, _lastUpdated: Date.now() };
      const saveRes = await fetch(`${API}/api/master-data`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated)
      });

      if (!saveRes.ok) throw new Error('Gagal menyimpan ke server');

      // Update state lokal
      if (modalType === 'web') setWebUsers(list);
      else setMobileUsers(list);
      setMasterData(updated);
      setShowModal(false);
    } catch (err) {
      alert('Gagal menyimpan: ' + err.message);
    }
    setSaving(false);
  };

  // ─── DELETE ───
  const handleDelete = async (type, user) => {
    setDeleteConfirmId(null);
    try {
      setLoading(true);
      const key = type === 'web' ? 'webAdminAccounts' : 'mobileAccounts';

      // Hapus via endpoint delete-item (strict by ID, masing-masing tabel)
      await fetch(`${API}/api/master-data/delete-item`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, id: user.id })
      });

      // Update state lokal langsung
      if (type === 'web') {
        setWebUsers(prev => prev.filter(u => String(u.id) !== String(user.id)));
        setMasterData(prev => ({
          ...prev,
          webAdminAccounts: (prev.webAdminAccounts || []).filter(u => String(u.id) !== String(user.id))
        }));
      } else {
        setMobileUsers(prev => prev.filter(u => String(u.id) !== String(user.id)));
        setMasterData(prev => ({
          ...prev,
          mobileAccounts: (prev.mobileAccounts || []).filter(u => String(u.id) !== String(user.id))
        }));
      }
    } catch (err) {
      alert('Gagal menghapus: ' + err.message);
    }
    setLoading(false);
  };

  // ─── TOGGLE STATUS ───
  const handleToggleStatus = async (type, user) => {
    const key = type === 'web' ? 'webAdminAccounts' : 'mobileAccounts';
    const newStatus = user.status === 'Aktif' ? 'Inaktif' : 'Aktif';
    const updated = { ...user, status: newStatus };

    if (type === 'web') setWebUsers(prev => prev.map(u => String(u.id) === String(user.id) ? updated : u));
    else setMobileUsers(prev => prev.map(u => String(u.id) === String(user.id) ? updated : u));

    try {
      const res = await fetch(`${API}/api/master-data`, { cache: 'no-store' });
      const latest = await res.json();
      let list = (latest[key] || []).map(u => String(u.id) === String(user.id) ? { ...u, status: newStatus } : u);
      const latestUpdated = { ...latest, [key]: list, _lastUpdated: Date.now() };
      await fetch(`${API}/api/master-data`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(latestUpdated)
      });
      setMasterData(latestUpdated);
    } catch (e) {}
  };

  const f = (field, val) => setForm(prev => ({ ...prev, [field]: val }));

  // ─── RENDER TABLE ───
  const renderTable = (type, users) => {
    const isMobile = type === 'mobile';
    return (
      <div style={{ overflowX: 'auto', borderRadius: '12px', border: '1px solid #334155' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.80rem' }}>
          <thead>
            <tr style={{ background: '#1e293b', color: '#94a3b8', fontWeight: '800', fontSize: '0.72rem', textTransform: 'uppercase' }}>
              <th style={{ padding: '10px 12px', textAlign: 'left' }}>Nama</th>
              <th style={{ padding: '10px 12px', textAlign: 'left' }}>Username</th>
              <th style={{ padding: '10px 12px', textAlign: 'left' }}>{isMobile ? 'Password Login' : 'Password'}</th>
              <th style={{ padding: '10px 12px', textAlign: 'left' }}>Role</th>
              <th style={{ padding: '10px 12px', textAlign: 'left' }}>Outlet</th>
              {isMobile && <th style={{ padding: '10px 8px', textAlign: 'center' }}>Lap. Mobile</th>}
              <th style={{ padding: '10px 8px', textAlign: 'center' }}>Status</th>
              <th style={{ padding: '10px 8px', textAlign: 'center', width: '120px' }}>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr>
                <td colSpan={isMobile ? 8 : 7} style={{ padding: '32px', textAlign: 'center', color: '#64748b' }}>
                  Belum ada data. Klik tombol "Tambah" untuk menambahkan.
                </td>
              </tr>
            ) : users.map(u => (
              <tr key={u.id} style={{ borderTop: '1px solid #1e293b', color: '#f1f5f9' }}>
                <td style={{ padding: '10px 12px', fontWeight: '700' }}>{u.name}</td>
                <td style={{ padding: '10px 12px', fontFamily: 'monospace', color: '#38bdf8' }}>@{u.username}</td>
                <td style={{ padding: '10px 12px', fontFamily: 'monospace', color: '#34d399' }}>
                  {isMobile ? (u.mobileLoginPassword || u.password || '—') : (u.password || '—')}
                </td>
                <td style={{ padding: '10px 12px' }}>
                  <span style={{
                    padding: '2px 8px', borderRadius: '6px', fontSize: '0.72rem', fontWeight: '800',
                    background: 'rgba(99,102,241,0.15)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.3)'
                  }}>{u.role}</span>
                </td>
                <td style={{ padding: '10px 12px', color: '#cbd5e1', fontSize: '0.76rem' }}>
                  {u.outlet || 'Semua Outlet'}
                </td>
                {isMobile && (
                  <td style={{ padding: '10px 8px', textAlign: 'center' }}>
                    <span style={{ color: u.canAccessMobileReports !== false ? '#34d399' : '#f87171', fontWeight: '800', fontSize: '0.76rem' }}>
                      {u.canAccessMobileReports !== false ? '✅' : '❌'}
                    </span>
                  </td>
                )}
                <td style={{ padding: '10px 8px', textAlign: 'center' }}>
                  {deleteConfirmId === u.id ? (
                    <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                      <button
                        onClick={() => handleDelete(type, u)}
                        style={{ padding: '3px 8px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '0.72rem', fontWeight: '800', cursor: 'pointer' }}
                      >Hapus</button>
                      <button
                        onClick={() => setDeleteConfirmId(null)}
                        style={{ padding: '3px 6px', background: '#334155', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '0.72rem', cursor: 'pointer' }}
                      >Batal</button>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleToggleStatus(type, u)}
                      style={{
                        padding: '3px 10px', borderRadius: '12px', fontSize: '0.72rem', fontWeight: '900',
                        background: u.status === 'Aktif' ? 'rgba(52,211,153,0.15)' : 'rgba(248,113,113,0.15)',
                        color: u.status === 'Aktif' ? '#34d399' : '#f87171',
                        border: `1px solid ${u.status === 'Aktif' ? '#34d399' : '#f87171'}`,
                        cursor: 'pointer'
                      }}
                    >
                      {u.status === 'Aktif' ? '🟢 Aktif' : '🔴 Inaktif'}
                    </button>
                  )}
                </td>
                <td style={{ padding: '10px 8px' }}>
                  <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                    <button
                      onClick={() => openEdit(type, u)}
                      title="Edit"
                      style={{ padding: '5px 8px', background: 'rgba(56,189,248,0.15)', color: '#38bdf8', border: '1px solid rgba(56,189,248,0.3)', borderRadius: '7px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px', fontSize: '0.76rem', fontWeight: '800' }}
                    >
                      <Edit3 size={12} /> Edit
                    </button>
                    <button
                      onClick={() => setDeleteConfirmId(u.id)}
                      title="Hapus"
                      style={{ padding: '5px 8px', background: 'rgba(239,68,68,0.12)', color: '#f87171', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '7px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px', fontSize: '0.76rem', fontWeight: '800' }}
                    >
                      <Trash2 size={12} /> Hapus
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  // ─── RENDER MODAL ───
  const renderModal = () => {
    const isMobile = modalType === 'mobile';
    return (
      <div style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999
      }}>
        <div style={{
          width: '100%', maxWidth: '520px', background: '#1e293b',
          border: `1px solid ${isMobile ? 'rgba(52,211,153,0.3)' : 'rgba(99,102,241,0.3)'}`,
          borderRadius: '20px', padding: '24px', maxHeight: '90vh', overflowY: 'auto'
        }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', paddingBottom: '14px', borderBottom: '1px solid #334155' }}>
            <h3 style={{ margin: 0, color: '#fff', fontWeight: '900', fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              {isMobile ? <Smartphone size={18} color="#34d399" /> : <ShieldCheck size={18} color="#818cf8" />}
              {editingId ? '✏️ Edit Akun' : '➕ Tambah Akun'} {isMobile ? 'POS Mobile' : 'Web Admin'}
            </h3>
            <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
              <X size={20} />
            </button>
          </div>

          <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* Nama */}
            <div>
              <label style={lbl}>Nama Lengkap:</label>
              <input required value={form.name || ''} onChange={e => f('name', e.target.value)}
                placeholder="Contoh: Budi Santoso"
                style={inp} />
            </div>

            {/* Outlet */}
            <div>
              <label style={lbl}>Outlet Cabang:</label>
              <select value={form.outlet || 'Semua Outlet (Central)'} onChange={e => f('outlet', e.target.value)} style={inp}>
                <option value="Semua Outlet (Central)">Semua Outlet (Central / Pusat)</option>
                {outlets.map((o, i) => <option key={i} value={o.name}>{o.name}</option>)}
              </select>
            </div>

            {/* Username & Password */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={lbl}>Username:</label>
                <input required value={form.username || ''} onChange={e => f('username', e.target.value)}
                  placeholder="budi_kasir"
                  style={{ ...inp, color: '#38bdf8', fontFamily: 'monospace' }} />
              </div>
              <div>
                <label style={lbl}>{isMobile ? 'Password Login Mobile:' : 'Password Web:'}</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPwd ? 'text' : 'password'}
                    value={isMobile ? (form.mobileLoginPassword || '') : (form.password || '')}
                    onChange={e => f(isMobile ? 'mobileLoginPassword' : 'password', e.target.value)}
                    placeholder="123"
                    style={{ ...inp, color: '#34d399', fontFamily: 'monospace', paddingRight: '36px' }}
                  />
                  <button type="button" onClick={() => setShowPwd(!showPwd)}
                    style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                    {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>
            </div>

            {/* Role & Status */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={lbl}>Role / Peran:</label>
                <select value={form.role || ''} onChange={e => f('role', e.target.value)} style={inp}>
                  {(isMobile ? MOBILE_ROLES : WEB_ROLES).map((r, i) => <option key={i} value={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <label style={lbl}>Status Akun:</label>
                <select value={form.status || 'Aktif'} onChange={e => f('status', e.target.value)} style={inp}>
                  <option value="Aktif">🟢 Aktif</option>
                  <option value="Inaktif">🔴 Inaktif</option>
                </select>
              </div>
            </div>

            {/* Mobile: akses laporan */}
            {isMobile && (
              <div style={{ background: '#0f172a', padding: '14px', borderRadius: '12px', border: '1px solid rgba(250,204,21,0.2)' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', marginBottom: '10px', fontSize: '0.82rem', fontWeight: '800', color: '#facc15' }}>
                  <input type="checkbox" checked={form.canAccessMobileReports !== false}
                    onChange={e => f('canAccessMobileReports', e.target.checked)}
                    style={{ width: '16px', height: '16px', accentColor: '#facc15' }} />
                  🔒 Boleh Akses Menu Laporan di Mobile
                </label>
                {form.canAccessMobileReports !== false && (
                  <div>
                    <label style={{ ...lbl, color: '#facc15' }}>Password Laporan Mobile:</label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type={showRepPwd ? 'text' : 'password'}
                        value={form.mobileReportPassword || ''}
                        onChange={e => f('mobileReportPassword', e.target.value)}
                        placeholder="8888"
                        style={{ ...inp, color: '#facc15', fontFamily: 'monospace', paddingRight: '36px' }}
                      />
                      <button type="button" onClick={() => setShowRepPwd(!showRepPwd)}
                        style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                        {showRepPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Actions */}
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', paddingTop: '4px' }}>
              <button type="button" onClick={() => setShowModal(false)}
                style={{ padding: '10px 18px', background: '#334155', border: 'none', color: '#cbd5e1', borderRadius: '10px', fontWeight: '700', cursor: 'pointer' }}>
                Batal
              </button>
              <button type="submit" disabled={saving}
                style={{
                  padding: '10px 22px', border: 'none', borderRadius: '10px', fontWeight: '900', cursor: saving ? 'not-allowed' : 'pointer',
                  background: isMobile ? 'linear-gradient(135deg,#059669,#047857)' : 'linear-gradient(135deg,#4f46e5,#7c3aed)',
                  color: '#fff', display: 'flex', alignItems: 'center', gap: '6px', opacity: saving ? 0.7 : 1
                }}>
                <Save size={15} />
                {saving ? 'Menyimpan...' : (editingId ? 'Simpan Perubahan' : 'Tambahkan')}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  const lbl = { fontSize: '0.80rem', fontWeight: '800', color: '#cbd5e1', display: 'block', marginBottom: '5px' };
  const inp = { width: '100%', padding: '9px 13px', borderRadius: '9px', border: '1px solid #334155', background: '#0f172a', color: '#f1f5f9', fontSize: '0.87rem', boxSizing: 'border-box' };

  return (
    <div style={{ padding: '24px', maxWidth: '1100px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '1.4rem', fontWeight: '900', color: '#f1f5f9', margin: '0 0 4px 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Users size={22} color="#818cf8" />
          Pengaturan Hak User (Akses Akun)
        </h2>
        <p style={{ color: '#64748b', fontSize: '0.83rem', margin: 0 }}>
          Kelola akun pengguna Web Based Admin dan POS Mobile secara independen.
        </p>
      </div>

      {/* Sub-Tab */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
        <button onClick={() => setActiveTab('mobile')} style={{
          padding: '9px 20px', borderRadius: '10px', fontWeight: '800', fontSize: '0.84rem', cursor: 'pointer', border: 'none',
          background: activeTab === 'mobile' ? 'linear-gradient(135deg,#059669,#047857)' : '#1e293b',
          color: activeTab === 'mobile' ? '#fff' : '#64748b',
          display: 'flex', alignItems: 'center', gap: '7px'
        }}>
          <Smartphone size={15} /> POS Mobile
        </button>
        <button onClick={() => setActiveTab('web')} style={{
          padding: '9px 20px', borderRadius: '10px', fontWeight: '800', fontSize: '0.84rem', cursor: 'pointer', border: 'none',
          background: activeTab === 'web' ? 'linear-gradient(135deg,#4f46e5,#7c3aed)' : '#1e293b',
          color: activeTab === 'web' ? '#fff' : '#64748b',
          display: 'flex', alignItems: 'center', gap: '7px'
        }}>
          <ShieldCheck size={15} /> Web Admin
        </button>
        <button onClick={handleRefresh} disabled={loading} style={{
          padding: '9px 14px', borderRadius: '10px', fontWeight: '700', fontSize: '0.84rem', cursor: 'pointer',
          background: '#1e293b', color: '#94a3b8', border: '1px solid #334155',
          display: 'flex', alignItems: 'center', gap: '6px', marginLeft: 'auto', opacity: loading ? 0.6 : 1
        }}>
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          {loading ? 'Memuat...' : 'Refresh'}
        </button>
      </div>

      {/* Content POS Mobile */}
      {activeTab === 'mobile' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <div>
              <h3 style={{ margin: 0, color: '#34d399', fontWeight: '800', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '7px' }}>
                <Smartphone size={17} /> Hak User POS Mobile APK
              </h3>
              <p style={{ margin: '3px 0 0', color: '#64748b', fontSize: '0.78rem' }}>
                {mobileUsers.length} akun terdaftar — independen, tidak terhubung ke Web Admin
              </p>
            </div>
            <button onClick={() => openAdd('mobile')} style={{
              padding: '9px 16px', background: 'linear-gradient(135deg,#059669,#047857)', color: '#fff',
              border: 'none', borderRadius: '10px', fontWeight: '800', fontSize: '0.84rem', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: '6px'
            }}>
              <Plus size={15} /> Tambah Akun Mobile
            </button>
          </div>
          {renderTable('mobile', mobileUsers)}
        </div>
      )}

      {/* Content Web Admin */}
      {activeTab === 'web' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <div>
              <h3 style={{ margin: 0, color: '#818cf8', fontWeight: '800', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '7px' }}>
                <ShieldCheck size={17} /> Hak User Web Based Admin
              </h3>
              <p style={{ margin: '3px 0 0', color: '#64748b', fontSize: '0.78rem' }}>
                {webUsers.length} akun terdaftar — independen, tidak terhubung ke POS Mobile
              </p>
            </div>
            <button onClick={() => openAdd('web')} style={{
              padding: '9px 16px', background: 'linear-gradient(135deg,#4f46e5,#7c3aed)', color: '#fff',
              border: 'none', borderRadius: '10px', fontWeight: '800', fontSize: '0.84rem', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: '6px'
            }}>
              <Plus size={15} /> Tambah Akun Web Admin
            </button>
          </div>
          {renderTable('web', webUsers)}
        </div>
      )}

      {/* Modal */}
      {showModal && renderModal()}
    </div>
  );
}
