import React, { useState, useEffect, useCallback } from 'react';
import {
  Users, Smartphone, Plus, Edit3, Trash2, X, Eye, EyeOff,
  RefreshCw, ShieldCheck, Save, Shield, RotateCcw, Check, Ban, Key
} from 'lucide-react';

const API = 'https://mris-api.barokahgroupindonesia.tech';

const WEB_ROLES = ['Super Admin', 'Owner', 'Admin', 'Manajer Cabang', 'Kasir'];
const MOBILE_ROLES = ['Super Admin / Owner', 'Kepala Cabang / SPV', 'Kasir', 'Logistik & Dapur'];

const WEB_PERM_FIELDS = [
  { key: 'dashboard', label: '📊 Dashboard & Penjualan' },
  { key: 'masterData', label: '📦 Data Master Produk' },
  { key: 'costs', label: '💰 Biaya & Pengeluaran' },
  { key: 'stock', label: '🌾 Stok & Bahan Baku' },
  { key: 'approved', label: '✅ Approval Transaksi' },
  { key: 'reports', label: '📑 Laporan Keuangan' },
  { key: 'policies', label: '📜 SOP Restoran' },
  { key: 'settings', label: '🔒 Pengaturan System & User' },
];

const MOBILE_PERM_FIELDS = [
  { key: 'posCashier', label: '📱 Mesin Kasir POS' },
  { key: 'voidOrder', label: '🚫 Batal / Void Struk' },
  { key: 'manualDiscount', label: '🏷️ Diskon Manual Kasir' },
  { key: 'stockOpname', label: '📋 Stock Opname Mobile' },
  { key: 'receiveGoods', label: '🚚 Terima Barang Dapur' },
  { key: 'mobileReports', label: '📊 Laporan Shift Mobile' },
  { key: 'shiftClosing', label: '🔒 Rekonsiliasi Shift Closing' },
];

const DEFAULT_WEB_MATRIX = [
  { role: 'Super Admin', dashboard: true, masterData: true, costs: true, stock: true, approved: true, reports: true, policies: true, settings: true },
  { role: 'Owner', dashboard: true, masterData: true, costs: true, stock: true, approved: true, reports: true, policies: true, settings: true },
  { role: 'Admin', dashboard: true, masterData: true, costs: true, stock: true, approved: true, reports: true, policies: true, settings: false },
  { role: 'Manajer Cabang', dashboard: true, masterData: true, costs: true, stock: true, approved: true, reports: true, policies: true, settings: false },
  { role: 'Kasir', dashboard: false, masterData: false, costs: false, stock: true, approved: false, reports: false, policies: true, settings: false }
];

const DEFAULT_MOBILE_MATRIX = [
  { role: 'Super Admin / Owner', posCashier: true, voidOrder: true, manualDiscount: true, stockOpname: true, receiveGoods: true, mobileReports: true, shiftClosing: true },
  { role: 'Kepala Cabang / SPV', posCashier: true, voidOrder: true, manualDiscount: true, stockOpname: true, receiveGoods: true, mobileReports: true, shiftClosing: true },
  { role: 'Kasir', posCashier: true, voidOrder: false, manualDiscount: false, stockOpname: false, receiveGoods: false, mobileReports: false, shiftClosing: true },
  { role: 'Logistik & Dapur', posCashier: false, voidOrder: false, manualDiscount: false, stockOpname: true, receiveGoods: true, mobileReports: false, shiftClosing: false }
];

const EMPTY_WEB = {
  name: '', username: '', password: '', role: 'Admin', outlet: 'Semua Outlet (Central)', status: 'Aktif',
  useCustomPermissions: false, permissions: { dashboard: true, masterData: true, costs: true, stock: true, approved: true, reports: true, policies: true, settings: false }
};

const EMPTY_MOBILE = {
  name: '', username: '', mobileLoginPassword: '123', role: 'Kasir', outlet: 'Semua Outlet (Central)', status: 'Aktif',
  canAccessMobileReports: true, mobileReportPassword: '8888',
  useCustomPermissions: false, permissions: { posCashier: true, voidOrder: false, manualDiscount: false, stockOpname: false, receiveGoods: false, mobileReports: false, shiftClosing: true }
};

export default function UserRightsSettings({ masterData, setMasterData }) {
  const [activeTab, setActiveTab] = useState('mobile'); // 'mobile' | 'web' | 'matrix'
  const [matrixSubTab, setMatrixSubTab] = useState('web'); // 'web' | 'mobile'
  const [loading, setLoading] = useState(false);
  const [webUsers, setWebUsers] = useState([]);
  const [mobileUsers, setMobileUsers] = useState([]);
  const [webMatrix, setWebMatrix] = useState(DEFAULT_WEB_MATRIX);
  const [mobileMatrix, setMobileMatrix] = useState(DEFAULT_MOBILE_MATRIX);

  // Modal state for user account CRUD
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
    if (Array.isArray(masterData?.permissionMatrix) && masterData.permissionMatrix.length > 0) {
      setWebMatrix(masterData.permissionMatrix);
    }
    if (Array.isArray(masterData?.mobilePermissionMatrix) && masterData.mobilePermissionMatrix.length > 0) {
      setMobileMatrix(masterData.mobilePermissionMatrix);
    }
  }, [masterData]);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  // ─── REFRESH dari API ───
  const handleRefresh = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/master-data`, { cache: 'no-store' });
      const data = await res.json();
      if (data) {
        if (data.mobileAccounts) setMobileUsers(data.mobileAccounts);
        if (data.webAdminAccounts) setWebUsers(data.webAdminAccounts);
        if (data.permissionMatrix) setWebMatrix(data.permissionMatrix);
        if (data.mobilePermissionMatrix) setMobileMatrix(data.mobilePermissionMatrix);
        setMasterData(data);
      }
    } catch (e) {
      alert('Gagal memuat data dari server: ' + e.message);
    }
    setLoading(false);
  };

  // ─── OPEN MODAL USER ───
  const openAdd = (type) => {
    setModalType(type);
    setEditingId(null);
    setForm(type === 'web' ? JSON.parse(JSON.stringify(EMPTY_WEB)) : JSON.parse(JSON.stringify(EMPTY_MOBILE)));
    setShowPwd(false);
    setShowRepPwd(false);
    setShowModal(true);
  };

  const openEdit = (type, user) => {
    setModalType(type);
    setEditingId(user.id);
    const defaults = type === 'web' ? EMPTY_WEB : EMPTY_MOBILE;
    setForm({
      ...defaults,
      ...user,
      permissions: {
        ...(defaults.permissions || {}),
        ...(user.permissions || user.customPermissions || {})
      }
    });
    setShowPwd(false);
    setShowRepPwd(false);
    setShowModal(true);
  };

  // ─── SAVE USER (ADD / EDIT) ───
  const handleSaveUser = async (e) => {
    e.preventDefault();
    if (!form.name?.trim() || !form.username?.trim()) {
      alert('Nama dan Username wajib diisi!');
      return;
    }
    setSaving(true);

    try {
      const res = await fetch(`${API}/api/master-data`, { cache: 'no-store' });
      const latest = await res.json();
      const key = modalType === 'web' ? 'webAdminAccounts' : 'mobileAccounts';
      let list = Array.isArray(latest[key]) ? [...latest[key]] : [];

      if (editingId) {
        list = list.map(u => String(u.id) === String(editingId) ? { ...u, ...form, id: u.id } : u);
      } else {
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

      if (modalType === 'web') setWebUsers(list);
      else setMobileUsers(list);
      setMasterData(updated);
      setShowModal(false);
    } catch (err) {
      alert('Gagal menyimpan: ' + err.message);
    }
    setSaving(false);
  };

  // ─── DELETE USER ───
  const handleDeleteUser = async (type, user) => {
    setDeleteConfirmId(null);
    try {
      setLoading(true);
      const key = type === 'web' ? 'webAdminAccounts' : 'mobileAccounts';

      await fetch(`${API}/api/master-data/delete-item`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, id: user.id })
      });

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

  // ─── SAVE MATRIX TO SERVER ───
  const saveMatrixToServer = async (newWebMatrix, newMobileMatrix) => {
    const updated = {
      ...masterData,
      permissionMatrix: newWebMatrix,
      mobilePermissionMatrix: newMobileMatrix,
      _lastUpdated: Date.now()
    };
    setMasterData(updated);

    try {
      await fetch(`${API}/api/master-data`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated)
      });
    } catch (e) {
      console.error('Auto save matrix error:', e);
    }
  };

  const handleSaveMatrix = async () => {
    setSaving(true);
    try {
      await saveMatrixToServer(webMatrix, mobileMatrix);
      alert('✅ Matriks Hak Akses Peran berhasil diperbarui!');
    } catch (err) {
      alert('Gagal menyimpan matriks: ' + err.message);
    }
    setSaving(false);
  };

  // ─── TOGGLE MATRIX PERMISSION (AUTO-SAVE INSTANTLY) ───
  const toggleWebMatrixPerm = (roleName, permKey) => {
    const updatedWeb = webMatrix.map(item => {
      if (item.role === roleName) {
        return { ...item, [permKey]: !item[permKey] };
      }
      return item;
    });
    setWebMatrix(updatedWeb);
    saveMatrixToServer(updatedWeb, mobileMatrix);
  };

  const toggleMobileMatrixPerm = (roleName, permKey) => {
    const updatedMobile = mobileMatrix.map(item => {
      if (item.role === roleName) {
        return { ...item, [permKey]: !item[permKey] };
      }
      return item;
    });
    setMobileMatrix(updatedMobile);
    saveMatrixToServer(webMatrix, updatedMobile);
  };

  const resetMatrixDefault = () => {
    if (window.confirm('Reset seluruh Matriks Hak Akses ke pengaturan awal sistem?')) {
      setWebMatrix(DEFAULT_WEB_MATRIX);
      setMobileMatrix(DEFAULT_MOBILE_MATRIX);
      saveMatrixToServer(DEFAULT_WEB_MATRIX, DEFAULT_MOBILE_MATRIX);
    }
  };

  const f = (field, val) => setForm(prev => ({ ...prev, [field]: val }));

  const toggleUserCustomPerm = (permKey) => {
    setForm(prev => ({
      ...prev,
      useCustomPermissions: true,
      permissions: {
        ...(prev.permissions || {}),
        [permKey]: !prev.permissions?.[permKey]
      }
    }));
  };

  // ─── RENDER USER TABLES ───
  const renderUserTable = (type, users) => {
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
              <th style={{ padding: '10px 8px', textAlign: 'center' }}>Permission</th>
              <th style={{ padding: '10px 8px', textAlign: 'center' }}>Status</th>
              <th style={{ padding: '10px 8px', textAlign: 'center', width: '120px' }}>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ padding: '32px', textAlign: 'center', color: '#64748b' }}>
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
                <td style={{ padding: '10px 8px', textAlign: 'center' }}>
                  {u.useCustomPermissions ? (
                    <span style={{
                      padding: '3px 8px', borderRadius: '12px', fontSize: '0.70rem', fontWeight: '800',
                      background: 'rgba(250,204,21,0.15)', color: '#facc15', border: '1px solid rgba(250,204,21,0.3)',
                      display: 'inline-flex', alignItems: 'center', gap: '4px'
                    }}>
                      <Key size={11} /> Custom User
                    </span>
                  ) : (
                    <span style={{ color: '#64748b', fontSize: '0.72rem' }}>Ikuti Matriks Role</span>
                  )}
                </td>
                <td style={{ padding: '10px 8px', textAlign: 'center' }}>
                  {deleteConfirmId === u.id ? (
                    <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                      <button
                        onClick={() => handleDeleteUser(type, u)}
                        style={{ padding: '3px 8px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '0.72rem', fontWeight: '800', cursor: 'pointer' }}
                      >Hapus</button>
                      <button
                        onClick={() => setDeleteConfirmId(null)}
                        style={{ padding: '3px 6px', background: '#334155', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '0.72rem', cursor: 'pointer' }}
                      >Batal</button>
                    </div>
                  ) : (
                    <span style={{
                      padding: '3px 10px', borderRadius: '12px', fontSize: '0.72rem', fontWeight: '900',
                      background: u.status === 'Aktif' ? 'rgba(52,211,153,0.15)' : 'rgba(248,113,113,0.15)',
                      color: u.status === 'Aktif' ? '#34d399' : '#f87171',
                      border: `1px solid ${u.status === 'Aktif' ? '#34d399' : '#f87171'}`
                    }}>
                      {u.status === 'Aktif' ? '🟢 Aktif' : '🔴 Inaktif'}
                    </span>
                  )}
                </td>
                <td style={{ padding: '10px 8px' }}>
                  <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                    <button
                      onClick={() => openEdit(type, u)}
                      title="Edit & Custom Permission"
                      style={{ padding: '5px 8px', background: 'rgba(56,189,248,0.15)', color: '#38bdf8', border: '1px solid rgba(56,189,248,0.3)', borderRadius: '7px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px', fontSize: '0.76rem', fontWeight: '800' }}
                    >
                      <Edit3 size={12} /> Edit / Access
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

  // ─── RENDER PERMISSION MATRIX ───
  const renderPermissionMatrixView = () => {
    const isWeb = matrixSubTab === 'web';
    const columns = isWeb ? WEB_PERM_FIELDS : MOBILE_PERM_FIELDS;
    const matrixData = isWeb ? webMatrix : mobileMatrix;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Top Controls */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#1e293b', padding: '14px 18px', borderRadius: '12px', border: '1px solid #334155' }}>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={() => setMatrixSubTab('web')} style={{
              padding: '7px 16px', borderRadius: '8px', fontWeight: '800', fontSize: '0.80rem', cursor: 'pointer',
              background: isWeb ? 'rgba(99,102,241,0.25)' : 'transparent',
              color: isWeb ? '#818cf8' : '#94a3b8',
              border: isWeb ? '1px solid #818cf8' : '1px solid transparent'
            }}>
              💻 Matriks Role Web Admin
            </button>
            <button onClick={() => setMatrixSubTab('mobile')} style={{
              padding: '7px 16px', borderRadius: '8px', fontWeight: '800', fontSize: '0.80rem', cursor: 'pointer',
              background: !isWeb ? 'rgba(52,211,153,0.25)' : 'transparent',
              color: !isWeb ? '#34d399' : '#94a3b8',
              border: !isWeb ? '1px solid #34d399' : '1px solid transparent'
            }}>
              📱 Matriks Role POS Mobile APK
            </button>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={resetMatrixDefault} style={{
              padding: '7px 14px', borderRadius: '8px', background: '#334155', color: '#cbd5e1', border: 'none', fontSize: '0.78rem', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px'
            }}>
              <RotateCcw size={13} /> Reset Default
            </button>
            <button onClick={handleSaveMatrix} disabled={saving} style={{
              padding: '7px 18px', borderRadius: '8px', background: 'linear-gradient(135deg,#4f46e5,#7c3aed)', color: '#fff', border: 'none', fontSize: '0.78rem', fontWeight: '900', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px'
            }}>
              <Save size={13} /> {saving ? 'Menyimpan...' : 'Simpan Matriks Hak Akses'}
            </button>
          </div>
        </div>

        {/* Matrix Table Grid */}
        <div style={{ overflowX: 'auto', borderRadius: '12px', border: '1px solid #334155' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.80rem' }}>
            <thead>
              <tr style={{ background: '#1e293b', color: '#94a3b8', fontWeight: '800', fontSize: '0.72rem', textTransform: 'uppercase' }}>
                <th style={{ padding: '12px 14px', textAlign: 'left', minWidth: '180px' }}>PERAN / ROLE</th>
                {columns.map(col => (
                  <th key={col.key} style={{ padding: '12px 10px', textAlign: 'center', minWidth: '130px' }}>{col.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {matrixData.map((row, idx) => (
                <tr key={idx} style={{ borderTop: '1px solid #1e293b', color: '#f1f5f9' }}>
                  <td style={{ padding: '14px', fontWeight: '800', background: '#0f172a' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Shield size={14} color={isWeb ? '#818cf8' : '#34d399'} />
                      <span>{row.role}</span>
                    </div>
                  </td>
                  {columns.map(col => {
                    const isAllowed = row[col.key] !== false;
                    return (
                      <td key={col.key} style={{ padding: '12px 8px', textAlign: 'center' }}>
                        <button
                          onClick={() => isWeb ? toggleWebMatrixPerm(row.role, col.key) : toggleMobileMatrixPerm(row.role, col.key)}
                          style={{
                            padding: '6px 12px', borderRadius: '20px', cursor: 'pointer', fontWeight: '800', fontSize: '0.74rem',
                            background: isAllowed ? 'rgba(52,211,153,0.18)' : 'rgba(248,113,113,0.18)',
                            color: isAllowed ? '#34d399' : '#f87171',
                            border: `1px solid ${isAllowed ? '#34d399' : '#f87171'}`,
                            display: 'inline-flex', alignItems: 'center', gap: '5px', transition: 'all 0.2s'
                          }}
                        >
                          {isAllowed ? <Check size={13} /> : <Ban size={13} />}
                          {isAllowed ? 'Diizinkan' : 'Dilarang'}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // ─── RENDER MODAL USER ───
  const renderUserModal = () => {
    const isMobile = modalType === 'mobile';
    const permFields = isMobile ? MOBILE_PERM_FIELDS : WEB_PERM_FIELDS;

    return (
      <div style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999
      }}>
        <div style={{
          width: '100%', maxWidth: '640px', background: '#1e293b',
          border: `1px solid ${isMobile ? 'rgba(52,211,153,0.3)' : 'rgba(99,102,241,0.3)'}`,
          borderRadius: '20px', padding: '24px', maxHeight: '92vh', overflowY: 'auto'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', paddingBottom: '14px', borderBottom: '1px solid #334155' }}>
            <h3 style={{ margin: 0, color: '#fff', fontWeight: '900', fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              {isMobile ? <Smartphone size={18} color="#34d399" /> : <ShieldCheck size={18} color="#818cf8" />}
              {editingId ? '✏️ Edit Akun & Custom Permission' : '➕ Tambah Akun'} {isMobile ? 'POS Mobile' : 'Web Admin'}
            </h3>
            <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
              <X size={20} />
            </button>
          </div>

          <form onSubmit={handleSaveUser} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={lbl}>Nama Lengkap:</label>
              <input required value={form.name || ''} onChange={e => f('name', e.target.value)}
                placeholder="Contoh: Budi Santoso" style={inp} />
            </div>

            <div>
              <label style={lbl}>Outlet Cabang:</label>
              <select value={form.outlet || 'Semua Outlet (Central)'} onChange={e => f('outlet', e.target.value)} style={inp}>
                <option value="Semua Outlet (Central)">Semua Outlet (Central / Pusat)</option>
                {outlets.map((o, i) => <option key={i} value={o.name}>{o.name}</option>)}
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={lbl}>Username:</label>
                <input required value={form.username || ''} onChange={e => f('username', e.target.value)}
                  placeholder="budi_kasir" style={{ ...inp, color: '#38bdf8', fontFamily: 'monospace' }} />
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

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={lbl}>Role / Peran Utama:</label>
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

            {/* SEKSI HAK AKSES INDIVIDUAL USER (CUSTOM PERMISSIONS) */}
            <div style={{ background: '#0f172a', padding: '16px', borderRadius: '14px', border: '1px solid rgba(250,204,21,0.25)', marginTop: '6px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: '900', color: '#facc15' }}>
                  <input
                    type="checkbox"
                    checked={!!form.useCustomPermissions}
                    onChange={e => f('useCustomPermissions', e.target.checked)}
                    style={{ width: '16px', height: '16px', accentColor: '#facc15' }}
                  />
                  🔑 Aktifkan Hak Akses Khusus User Ini (Individual Override)
                </label>
              </div>

              {form.useCustomPermissions && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', paddingTop: '8px', borderTop: '1px solid #1e293b' }}>
                  {permFields.map(field => {
                    const isChecked = form.permissions?.[field.key] !== false;
                    return (
                      <label key={field.key} style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '8px 12px', borderRadius: '8px', background: '#1e293b',
                        border: isChecked ? '1px solid rgba(52,211,153,0.4)' : '1px solid rgba(248,113,113,0.3)',
                        cursor: 'pointer', fontSize: '0.78rem', color: '#f1f5f9', fontWeight: '700'
                      }}>
                        <span>{field.label}</span>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleUserCustomPerm(field.key)}
                          style={{ width: '15px', height: '15px', accentColor: '#10b981' }}
                        />
                      </label>
                    );
                  })}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', paddingTop: '8px' }}>
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
    <div style={{ padding: '24px', maxWidth: '1150px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '1.4rem', fontWeight: '900', color: '#f1f5f9', margin: '0 0 4px 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Users size={22} color="#818cf8" />
          Pengaturan Hak User &amp; Permission Matrix
        </h2>
        <p style={{ color: '#64748b', fontSize: '0.83rem', margin: 0 }}>
          Kelola akun pengguna Web Based Admin, POS Mobile, dan Matriks Hak Akses Peran / Individual User.
        </p>
      </div>

      {/* Main Sub-Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
        <button onClick={() => setActiveTab('mobile')} style={{
          padding: '9px 20px', borderRadius: '10px', fontWeight: '800', fontSize: '0.84rem', cursor: 'pointer', border: 'none',
          background: activeTab === 'mobile' ? 'linear-gradient(135deg,#059669,#047857)' : '#1e293b',
          color: activeTab === 'mobile' ? '#fff' : '#64748b',
          display: 'flex', alignItems: 'center', gap: '7px'
        }}>
          <Smartphone size={15} /> POS Mobile Accounts
        </button>
        <button onClick={() => setActiveTab('web')} style={{
          padding: '9px 20px', borderRadius: '10px', fontWeight: '800', fontSize: '0.84rem', cursor: 'pointer', border: 'none',
          background: activeTab === 'web' ? 'linear-gradient(135deg,#4f46e5,#7c3aed)' : '#1e293b',
          color: activeTab === 'web' ? '#fff' : '#64748b',
          display: 'flex', alignItems: 'center', gap: '7px'
        }}>
          <ShieldCheck size={15} /> Web Admin Accounts
        </button>
        <button onClick={() => setActiveTab('matrix')} style={{
          padding: '9px 20px', borderRadius: '10px', fontWeight: '800', fontSize: '0.84rem', cursor: 'pointer', border: 'none',
          background: activeTab === 'matrix' ? 'linear-gradient(135deg,#d4af37,#b8963e)' : '#1e293b',
          color: activeTab === 'matrix' ? '#1a0a2e' : '#64748b',
          display: 'flex', alignItems: 'center', gap: '7px'
        }}>
          <Shield size={15} /> Permission Matrix (Matriks Role)
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

      {/* Content POS Mobile Users */}
      {activeTab === 'mobile' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <div>
              <h3 style={{ margin: 0, color: '#34d399', fontWeight: '800', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '7px' }}>
                <Smartphone size={17} /> Hak User POS Mobile APK
              </h3>
              <p style={{ margin: '3px 0 0', color: '#64748b', fontSize: '0.78rem' }}>
                {mobileUsers.length} akun terdaftar — Atur hak akses khusus per user atau per role
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
          {renderUserTable('mobile', mobileUsers)}
        </div>
      )}

      {/* Content Web Admin Users */}
      {activeTab === 'web' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <div>
              <h3 style={{ margin: 0, color: '#818cf8', fontWeight: '800', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '7px' }}>
                <ShieldCheck size={17} /> Hak User Web Based Admin
              </h3>
              <p style={{ margin: '3px 0 0', color: '#64748b', fontSize: '0.78rem' }}>
                {webUsers.length} akun terdaftar — Atur hak akses khusus per user atau per role
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
          {renderUserTable('web', webUsers)}
        </div>
      )}

      {/* Content Permission Matrix */}
      {activeTab === 'matrix' && renderPermissionMatrixView()}

      {/* Modal User Form */}
      {showModal && renderUserModal()}
    </div>
  );
}
