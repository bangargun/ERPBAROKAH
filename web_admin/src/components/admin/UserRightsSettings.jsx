import React, { useState, useEffect, useCallback } from 'react';
import {
  Users, Smartphone, Plus, Edit3, Trash2, X, Eye, EyeOff,
  RefreshCw, ShieldCheck, Save, Shield, RotateCcw, Check, Ban, Key
} from 'lucide-react';
import { getThemePalette } from '../../utils/themeUtils';

const API = typeof window !== 'undefined' ? window.location.origin : '';

const WEB_ROLES = ['Super Admin', 'Owner', 'Admin', 'Manajer Cabang', 'Kasir'];
const MOBILE_ROLES = ['Super Admin / Owner', 'Admin', 'Kepala Cabang / SPV', 'Kasir', 'Logistik & Dapur'];

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

const normalizePermObj = (val) => {
  if (typeof val === 'object' && val !== null) {
    return {
      view: Boolean(val.view),
      edit: Boolean(val.edit),
      delete: Boolean(val.delete)
    };
  }
  const bool = Boolean(val);
  return { view: bool, edit: bool, delete: bool };
};

const DEFAULT_WEB_MATRIX = [
  { 
    role: 'Super Admin', 
    dashboard: { view: true, edit: true, delete: true }, 
    masterData: { view: true, edit: true, delete: true }, 
    costs: { view: true, edit: true, delete: true }, 
    stock: { view: true, edit: true, delete: true }, 
    approved: { view: true, edit: true, delete: true }, 
    reports: { view: true, edit: true, delete: true }, 
    policies: { view: true, edit: true, delete: true }, 
    settings: { view: true, edit: true, delete: true } 
  },
  { 
    role: 'Owner', 
    dashboard: { view: true, edit: true, delete: true }, 
    masterData: { view: true, edit: true, delete: true }, 
    costs: { view: true, edit: true, delete: true }, 
    stock: { view: true, edit: true, delete: true }, 
    approved: { view: true, edit: true, delete: true }, 
    reports: { view: true, edit: true, delete: true }, 
    policies: { view: true, edit: true, delete: true }, 
    settings: { view: true, edit: true, delete: true } 
  },
  { 
    role: 'Admin', 
    dashboard: { view: true, edit: true, delete: true }, 
    masterData: { view: true, edit: true, delete: false }, 
    costs: { view: true, edit: true, delete: false }, 
    stock: { view: true, edit: true, delete: false }, 
    approved: { view: true, edit: true, delete: false }, 
    reports: { view: true, edit: true, delete: false }, 
    policies: { view: true, edit: true, delete: false }, 
    settings: { view: false, edit: false, delete: false } 
  },
  { 
    role: 'Manajer Cabang', 
    dashboard: { view: true, edit: false, delete: false }, 
    masterData: { view: true, edit: true, delete: false }, 
    costs: { view: true, edit: true, delete: false }, 
    stock: { view: true, edit: true, delete: false }, 
    approved: { view: true, edit: true, delete: false }, 
    reports: { view: true, edit: false, delete: false }, 
    policies: { view: true, edit: false, delete: false }, 
    settings: { view: false, edit: false, delete: false } 
  },
  { 
    role: 'Kasir', 
    dashboard: { view: false, edit: false, delete: false }, 
    masterData: { view: false, edit: false, delete: false }, 
    costs: { view: false, edit: false, delete: false }, 
    stock: { view: true, edit: true, delete: false }, 
    approved: { view: false, edit: false, delete: false }, 
    reports: { view: false, edit: false, delete: false }, 
    policies: { view: true, edit: false, delete: false }, 
    settings: { view: false, edit: false, delete: false } 
  }
];

const DEFAULT_MOBILE_MATRIX = [
  { role: 'Super Admin / Owner', posCashier: true, voidOrder: true, manualDiscount: true, stockOpname: true, receiveGoods: true, mobileReports: true, shiftClosing: true },
  { role: 'Admin', posCashier: true, voidOrder: true, manualDiscount: true, stockOpname: true, receiveGoods: true, mobileReports: true, shiftClosing: true },
  { role: 'Kepala Cabang / SPV', posCashier: true, voidOrder: true, manualDiscount: true, stockOpname: true, receiveGoods: true, mobileReports: true, shiftClosing: true },
  { role: 'Kasir', posCashier: true, voidOrder: false, manualDiscount: false, stockOpname: false, receiveGoods: false, mobileReports: false, shiftClosing: true },
  { role: 'Logistik & Dapur', posCashier: false, voidOrder: false, manualDiscount: false, stockOpname: true, receiveGoods: true, mobileReports: false, shiftClosing: false }
];

const EMPTY_WEB = {
  name: '', username: '', password: '', role: 'Admin', outlet: 'Semua Outlet (Central)', status: 'Aktif',
  permissions: { dashboard: true, masterData: true, costs: true, stock: true, approved: true, reports: true, policies: true, settings: false }
};

const EMPTY_MOBILE = {
  name: '', username: '', mobileLoginPassword: '123', role: 'Kasir', outlet: 'Semua Outlet (Central)', status: 'Aktif',
  canAccessMobileReports: true, mobileReportPassword: '8888',
  permissions: { posCashier: true, voidOrder: false, manualDiscount: false, stockOpname: false, receiveGoods: false, mobileReports: false, shiftClosing: true }
};

export default function UserRightsSettings({ masterData, setMasterData, themeMode = 'dark' }) {
  const T = getThemePalette(themeMode);

  // Mode Tab: 'users' | 'webMatrix' | 'mobileMatrix'
  const [activeSubTab, setActiveSubTab] = useState('users');

  // Account Type Sub-Tab: 'mobile' | 'web' | 'matrix'
  const [activeTab, setActiveTab] = useState('mobile');
  const [matrixSubTab, setMatrixSubTab] = useState('web');

  const [webUsers, setWebUsers] = useState([]);
  const [mobileUsers, setMobileUsers] = useState([]);
  const [webMatrix, setWebMatrix] = useState(DEFAULT_WEB_MATRIX);
  const [mobileMatrix, setMobileMatrix] = useState(DEFAULT_MOBILE_MATRIX);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('web'); // 'web' | 'mobile'
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_WEB);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);

  const [showPwd, setShowPwd] = useState(false);
  const [showRepPwd, setShowRepPwd] = useState(false);

  const outlets = masterData?.outlets || [];

  // Helper to ensure 'Admin' role exists in matrix
  const ensureAdminInMatrix = useCallback((matrix, defaultMatrix) => {
    const list = Array.isArray(matrix) && matrix.length > 0 ? [...matrix] : [...defaultMatrix];
    const hasAdmin = list.some(r => r.role === 'Admin');
    if (!hasAdmin) {
      const defaultAdminRow = defaultMatrix.find(r => r.role === 'Admin');
      if (defaultAdminRow) {
        const insertIdx = list.findIndex(r => r.role === 'Super Admin' || r.role === 'Owner' || r.role === 'Super Admin / Owner');
        if (insertIdx !== -1) {
          list.splice(insertIdx + 1, 0, defaultAdminRow);
        } else {
          list.push(defaultAdminRow);
        }
      }
    }
    return list;
  }, []);

  // Load from masterData
  const loadUsers = useCallback(() => {
    setWebUsers(Array.isArray(masterData?.webAdminAccounts) ? masterData.webAdminAccounts : []);
    setMobileUsers(Array.isArray(masterData?.mobileAccounts) ? masterData.mobileAccounts : []);
    setWebMatrix(ensureAdminInMatrix(masterData?.permissionMatrix, DEFAULT_WEB_MATRIX));
    setMobileMatrix(ensureAdminInMatrix(masterData?.mobilePermissionMatrix, DEFAULT_MOBILE_MATRIX));
  }, [masterData, ensureAdminInMatrix]);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  // ─── REFRESH dari API ───
  const handleRefresh = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/master-data`, { cache: 'no-store' });
      const data = await res.json();
      if (data) {
        if (data.mobileAccounts) setMobileUsers(data.mobileAccounts);
        if (data.webAdminAccounts) setWebUsers(data.webAdminAccounts);
        setWebMatrix(ensureAdminInMatrix(data.permissionMatrix, DEFAULT_WEB_MATRIX));
        setMobileMatrix(ensureAdminInMatrix(data.mobilePermissionMatrix, DEFAULT_MOBILE_MATRIX));
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
      const key = modalType === 'web' ? 'webAdminAccounts' : 'mobileAccounts';
      let list = Array.isArray(masterData?.[key]) ? [...masterData[key]] : [];
      const targetUsername = String(form.username || '').toLowerCase().trim();

      let savedId;
      if (editingId) {
        savedId = String(editingId);
        list = list.map(u => String(u.id) === String(editingId) ? { ...u, ...form, id: u.id } : u);
      } else {
        savedId = String(Date.now());
        list = [...list, { ...form, id: Number(savedId) }];
      }

      // Hapus tombstone yang memblokir username/ID baru ini dari deletedUsernames & deletedUserIds
      const updatedDeletedUsernames = (masterData?.deletedUsernames || []).filter(
        u => String(u).toLowerCase().trim() !== targetUsername
      );
      const updatedDeletedUserIds = (masterData?.deletedUserIds || []).filter(
        id => String(id) !== savedId
      );

      const updated = {
        ...masterData,
        [key]: list,
        deletedUsernames: updatedDeletedUsernames,
        deletedUserIds: updatedDeletedUserIds,
        _lastUpdated: Date.now()
      };

      if (modalType === 'web') setWebUsers(list);
      else setMobileUsers(list);

      try {
        localStorage.setItem(`MRIS_${key.toUpperCase()}`, JSON.stringify(list));
        localStorage.setItem('mris_master_data', JSON.stringify(updated));
      } catch (e) {}

      // Trigger automatic save to server & React state via App.jsx setMasterData
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
      const targetId = String(user.id);
      const targetUsername = String(user.username || user.name || '').toLowerCase().trim();

      const prevDeletedUsers = masterData?.deletedUserIds || [];
      const prevDeletedUsernames = masterData?.deletedUsernames || [];

      const updatedDeletedUsers = Array.from(new Set([...prevDeletedUsers, targetId]));
      const updatedDeletedUsernames = targetUsername
        ? Array.from(new Set([...prevDeletedUsernames, targetUsername]))
        : prevDeletedUsernames;

      fetch('/api/master-data/delete-item', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, id: user.id, username: targetUsername })
      }).catch(() => {});

      const filterOut = u => {
        if (!u) return false;
        const uId = String(u.id);
        const uName = String(u.username || u.name || '').toLowerCase().trim();
        if (uId === targetId) return false;
        if (targetUsername && uName === targetUsername) return false;
        return true;
      };

      const updatedWeb = (masterData?.webAdminAccounts || []).filter(filterOut);
      const updatedMobile = (masterData?.mobileAccounts || []).filter(filterOut);

      if (type === 'web') setWebUsers(updatedWeb);
      else setMobileUsers(updatedMobile);

      const updatedMaster = {
        ...masterData,
        _lastUpdated: Date.now(),
        deletedUserIds: updatedDeletedUsers,
        deletedUsernames: updatedDeletedUsernames,
        webAdminAccounts: updatedWeb,
        mobileAccounts: updatedMobile
      };

      setMasterData(updatedMaster);
      fetch('/api/master-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedMaster)
      }).catch(() => {});
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
  const toggleWebMatrixActionPerm = (roleName, permKey, actionType) => {
    if (roleName === 'Super Admin' || roleName === 'Owner' || roleName === 'Super Admin / Owner') {
      alert('🔒 Peran Super Admin / Owner memiliki hak akses penuh 100% (View, Edit, Delete).');
      return;
    }
    const updatedWeb = webMatrix.map(item => {
      if (item.role === roleName) {
        const currentMod = normalizePermObj(item[permKey]);
        const nextVal = !currentMod[actionType];
        return {
          ...item,
          [permKey]: {
            ...currentMod,
            [actionType]: nextVal,
            view: (actionType !== 'view' && nextVal) ? true : (actionType === 'view' ? nextVal : currentMod.view)
          }
        };
      }
      return item;
    });
    setWebMatrix(updatedWeb);
    saveMatrixToServer(updatedWeb, mobileMatrix);
  };

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
      <div style={{ overflowX: 'auto', borderRadius: '12px', border: `1px solid ${T.borderStrong}` }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.80rem', background: T.tableBg }}>
          <thead>
            <tr style={{ background: T.tableHeaderBg, color: T.txtSecondary, fontWeight: '800', fontSize: '0.72rem', textTransform: 'uppercase' }}>
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
                <td colSpan={8} style={{ padding: '32px', textAlign: 'center', color: T.txtMuted }}>
                  Belum ada data. Klik tombol "Tambah" untuk menambahkan.
                </td>
              </tr>
            ) : users.map(u => (
              <tr key={u.id} style={{ borderTop: `1px solid ${T.border}`, color: T.txtPrimary }}>
                <td style={{ padding: '10px 12px', fontWeight: '700' }}>{u.name}</td>
                <td style={{ padding: '10px 12px', fontFamily: 'monospace', color: T.info }}>@{u.username}</td>
                <td style={{ padding: '10px 12px', fontFamily: 'monospace', color: T.success }}>
                  {isMobile ? (u.mobileLoginPassword || u.password || '—') : (u.password || '—')}
                </td>
                <td style={{ padding: '10px 12px' }}>
                  <span style={{
                    padding: '2px 8px', borderRadius: '6px', fontSize: '0.72rem', fontWeight: '800',
                    background: T.accentGreenBg, color: T.accentGreen, border: `1px solid ${T.borderHover}`
                  }}>{u.role}</span>
                </td>
                <td style={{ padding: '10px 12px', color: T.txtSecondary, fontSize: '0.76rem' }}>
                  {u.outlet || 'Semua Outlet'}
                </td>
                <td style={{ padding: '10px 8px', textAlign: 'center' }}>
                  {u.useCustomPermissions ? (
                    <span style={{
                      padding: '3px 8px', borderRadius: '12px', fontSize: '0.70rem', fontWeight: '800',
                      background: T.warningBg, color: T.warning, border: `1px solid ${T.warningBorder}`,
                      display: 'inline-flex', alignItems: 'center', gap: '4px'
                    }}>
                      <Key size={11} /> Custom User
                    </span>
                  ) : (
                    <span style={{ color: T.txtMuted, fontSize: '0.72rem' }}>Ikuti Matriks Role</span>
                  )}
                </td>
                <td style={{ padding: '10px 8px', textAlign: 'center' }}>
                  {deleteConfirmId === u.id ? (
                    <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                      <button
                        onClick={() => handleDeleteUser(type, u)}
                        style={{ padding: '3px 8px', background: T.danger, color: '#fff', border: 'none', borderRadius: '6px', fontSize: '0.72rem', fontWeight: '800', cursor: 'pointer' }}
                      >Hapus</button>
                      <button
                        onClick={() => setDeleteConfirmId(null)}
                        style={{ padding: '3px 6px', background: T.controlBg, color: T.txtPrimary, border: 'none', borderRadius: '6px', fontSize: '0.72rem', cursor: 'pointer' }}
                      >Batal</button>
                    </div>
                  ) : (
                    <span style={{
                      padding: '3px 10px', borderRadius: '12px', fontSize: '0.72rem', fontWeight: '900',
                      background: u.status === 'Aktif' ? T.successBg : T.dangerBg,
                      color: u.status === 'Aktif' ? T.success : T.danger,
                      border: `1px solid ${u.status === 'Aktif' ? T.successBorder : T.dangerBorder}`
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
                      style={{ padding: '5px 8px', background: T.infoBg, color: T.info, border: `1px solid ${T.infoBorder}`, borderRadius: '7px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px', fontSize: '0.76rem', fontWeight: '800' }}
                    >
                      <Edit3 size={12} /> Edit / Access
                    </button>
                    <button
                      onClick={() => setDeleteConfirmId(u.id)}
                      title="Hapus"
                      style={{ padding: '5px 8px', background: T.dangerBg, color: T.danger, border: `1px solid ${T.dangerBorder}`, borderRadius: '7px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px', fontSize: '0.76rem', fontWeight: '800' }}
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: T.cardBg, padding: '14px 18px', borderRadius: '12px', border: `1px solid ${T.borderStrong}` }}>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={() => setMatrixSubTab('web')} style={{
              padding: '7px 16px', borderRadius: '8px', fontWeight: '800', fontSize: '0.80rem', cursor: 'pointer',
              background: isWeb ? T.accentGreenBg : 'transparent',
              color: isWeb ? T.accentGreen : T.txtSecondary,
              border: isWeb ? `1px solid ${T.accentGreen}` : '1px solid transparent'
            }}>
              💻 Matriks Role Web Admin
            </button>
            <button onClick={() => setMatrixSubTab('mobile')} style={{
              padding: '7px 16px', borderRadius: '8px', fontWeight: '800', fontSize: '0.80rem', cursor: 'pointer',
              background: !isWeb ? T.successBg : 'transparent',
              color: !isWeb ? T.success : T.txtSecondary,
              border: !isWeb ? `1px solid ${T.success}` : '1px solid transparent'
            }}>
              📱 Matriks Role POS Mobile APK
            </button>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={resetMatrixDefault} style={{
              padding: '7px 14px', borderRadius: '8px', background: T.controlBg, color: T.txtPrimary, border: `1px solid ${T.border}`, fontSize: '0.78rem', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px'
            }}>
              <RotateCcw size={13} /> Reset Default
            </button>
            <button onClick={handleSaveMatrix} disabled={saving} style={{
              padding: '7px 18px', borderRadius: '8px', background: T.primaryBtn, color: '#fff', border: 'none', fontSize: '0.78rem', fontWeight: '900', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px'
            }}>
              <Save size={13} /> {saving ? 'Menyimpan...' : 'Simpan Matriks Hak Akses'}
            </button>
          </div>
        </div>

        {/* Matrix Table Grid */}
        <div style={{ overflowX: 'auto', borderRadius: '12px', border: `1px solid ${T.borderStrong}` }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.80rem', background: T.tableBg }}>
            <thead>
              <tr style={{ background: T.tableHeaderBg, color: T.txtSecondary, fontWeight: '800', fontSize: '0.72rem', textTransform: 'uppercase' }}>
                <th style={{ padding: '12px 14px', textAlign: 'left', minWidth: '180px' }}>PERAN / ROLE</th>
                {columns.map(col => (
                  <th key={col.key} style={{ padding: '12px 10px', textAlign: 'center', minWidth: '130px' }}>{col.label}</th>
                ))}
                {!isWeb && <th style={{ padding: '12px 10px', textAlign: 'center', minWidth: '150px', color: T.info }}>🔑 PASSWORD LAPORAN POS</th>}
              </tr>
            </thead>
            <tbody>
              {matrixData.map((row, idx) => (
                <tr key={idx} style={{ borderTop: `1px solid ${T.border}`, color: T.txtPrimary }}>
                  <td style={{ padding: '14px', fontWeight: '800', background: T.cardBg2 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Shield size={14} color={isWeb ? T.accentGreen : T.success} />
                      <span>{row.role}</span>
                    </div>
                  </td>
                  {columns.map(col => {
                    if (isWeb) {
                      const isSuperAdminOrOwner = row.role === 'Super Admin' || row.role === 'Owner' || row.role === 'Super Admin / Owner';
                      const permObj = normalizePermObj(row[col.key]);

                      return (
                        <td key={col.key} style={{ padding: '8px 4px', textAlign: 'center' }}>
                          <div style={{ display: 'inline-flex', gap: '3px', alignItems: 'center', background: T.cardBg, padding: '3px 4px', borderRadius: '8px', border: `1px solid ${T.border}` }}>
                            {/* VIEW */}
                            <button
                              type="button"
                              onClick={() => toggleWebMatrixActionPerm(row.role, col.key, 'view')}
                              title={`Hak Lihat ${col.label}: ${permObj.view ? 'Aktif' : 'Non-Aktif'}`}
                              style={{
                                padding: '3px 6px',
                                borderRadius: '5px',
                                border: 'none',
                                fontSize: '0.66rem',
                                fontWeight: '800',
                                cursor: isSuperAdminOrOwner ? 'not-allowed' : 'pointer',
                                background: permObj.view ? T.successBg : T.dangerBg,
                                color: permObj.view ? T.success : T.danger,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '2px',
                                transition: 'all 0.15s'
                              }}
                            >
                              <span>👁️</span>
                              <span>View</span>
                            </button>

                            {/* EDIT */}
                            <button
                              type="button"
                              onClick={() => toggleWebMatrixActionPerm(row.role, col.key, 'edit')}
                              title={`Hak Edit & Tambah ${col.label}: ${permObj.edit ? 'Aktif' : 'Non-Aktif'}`}
                              style={{
                                padding: '3px 6px',
                                borderRadius: '5px',
                                border: 'none',
                                fontSize: '0.66rem',
                                fontWeight: '800',
                                cursor: isSuperAdminOrOwner ? 'not-allowed' : 'pointer',
                                background: permObj.edit ? 'rgba(234, 179, 8, 0.15)' : T.dangerBg,
                                color: permObj.edit ? '#eab308' : T.danger,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '2px',
                                transition: 'all 0.15s'
                              }}
                            >
                              <span>✏️</span>
                              <span>Edit</span>
                            </button>

                            {/* DELETE */}
                            <button
                              type="button"
                              onClick={() => toggleWebMatrixActionPerm(row.role, col.key, 'delete')}
                              title={`Hak Hapus ${col.label}: ${permObj.delete ? 'Aktif' : 'Non-Aktif'}`}
                              style={{
                                padding: '3px 6px',
                                borderRadius: '5px',
                                border: 'none',
                                fontSize: '0.66rem',
                                fontWeight: '800',
                                cursor: isSuperAdminOrOwner ? 'not-allowed' : 'pointer',
                                background: permObj.delete ? 'rgba(239, 68, 68, 0.18)' : T.dangerBg,
                                color: permObj.delete ? '#ef4444' : T.danger,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '2px',
                                transition: 'all 0.15s'
                              }}
                            >
                              <span>🗑️</span>
                              <span>Delete</span>
                            </button>
                          </div>
                        </td>
                      );
                    }

                    const isAllowed = row[col.key] !== false;
                    return (
                      <td key={col.key} style={{ padding: '12px 8px', textAlign: 'center' }}>
                        <button
                          onClick={() => toggleMobileMatrixPerm(row.role, col.key)}
                          style={{
                            padding: '6px 12px', borderRadius: '20px', cursor: 'pointer', fontWeight: '800', fontSize: '0.74rem',
                            background: isAllowed ? T.successBg : T.dangerBg,
                            color: isAllowed ? T.success : T.danger,
                            border: `1px solid ${isAllowed ? T.successBorder : T.dangerBorder}`,
                            display: 'inline-flex', alignItems: 'center', gap: '5px', transition: 'all 0.2s'
                          }}
                        >
                          {isAllowed ? <Check size={13} /> : <Ban size={13} />}
                          {isAllowed ? 'Diizinkan' : 'Dilarang'}
                        </button>
                      </td>
                    );
                  })}
                  {!isWeb && (
                    <td style={{ padding: '12px 8px', textAlign: 'center' }}>
                      <input
                        type="text"
                        value={row.reportPassword || row.mobileReportPassword || '1234'}
                        onChange={(e) => {
                          const val = e.target.value;
                          const updated = mobileMatrix.map(m => m.role === row.role ? { ...m, reportPassword: val, mobileReportPassword: val } : m);
                          setMobileMatrix(updated);
                          saveMatrixToServer(webMatrix, updated);
                        }}
                        style={{
                          width: '80px',
                          padding: '6px 8px',
                          background: T.inputBg,
                          border: `1px solid ${T.borderStrong}`,
                          borderRadius: '8px',
                          color: T.txtPrimary,
                          fontSize: '0.80rem',
                          fontWeight: '800',
                          textAlign: 'center'
                        }}
                        title="Password / PIN Akses Laporan Kasir Mobile"
                      />
                    </td>
                  )}
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
          width: '100%', maxWidth: '640px', background: T.cardBg,
          border: `1px solid ${isMobile ? T.successBorder : T.accentGreenBorder || T.borderStrong}`,
          borderRadius: '20px', padding: '24px', maxHeight: '92vh', overflowY: 'auto'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', paddingBottom: '14px', borderBottom: `1px solid ${T.borderStrong}` }}>
            <h3 style={{ margin: 0, color: T.txtPrimary, fontWeight: '900', fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              {isMobile ? <Smartphone size={18} color={T.success} /> : <ShieldCheck size={18} color={T.accentGreen} />}
              {editingId ? '✏️ Edit Akun & Custom Permission' : '➕ Tambah Akun'} {isMobile ? 'POS Mobile' : 'Web Admin'}
            </h3>
            <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', color: T.txtSecondary, cursor: 'pointer' }}>
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
                  placeholder="budi_kasir" style={{ ...inp, color: T.info, fontFamily: 'monospace' }} />
              </div>
              <div>
                <label style={lbl}>{isMobile ? 'Password Login Mobile:' : 'Password Web:'}</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPwd ? 'text' : 'password'}
                    value={isMobile ? (form.mobileLoginPassword || '') : (form.password || '')}
                    onChange={e => f(isMobile ? 'mobileLoginPassword' : 'password', e.target.value)}
                    placeholder="123"
                    style={{ ...inp, color: T.success, fontFamily: 'monospace', paddingRight: '36px' }}
                  />
                  <button type="button" onClick={() => setShowPwd(!showPwd)}
                    style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: T.txtSecondary, cursor: 'pointer' }}>
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
            <div style={{ background: T.cardBg2, padding: '16px', borderRadius: '14px', border: `1px solid ${T.warningBorder}`, marginTop: '6px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: '900', color: T.warning }}>
                  <input
                    type="checkbox"
                    checked={!!form.useCustomPermissions}
                    onChange={e => f('useCustomPermissions', e.target.checked)}
                    style={{ width: '16px', height: '16px', accentColor: T.warning }}
                  />
                  🔑 Aktifkan Hak Akses Khusus User Ini (Individual Override)
                </label>
              </div>

              {form.useCustomPermissions && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', paddingTop: '8px', borderTop: `1px solid ${T.border}` }}>
                  {permFields.map(field => {
                    const isChecked = form.permissions?.[field.key] !== false;
                    return (
                      <label key={field.key} style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '8px 12px', borderRadius: '8px', background: T.controlBg,
                        border: isChecked ? `1px solid ${T.successBorder}` : `1px solid ${T.dangerBorder}`,
                        cursor: 'pointer', fontSize: '0.78rem', color: T.txtPrimary, fontWeight: '700'
                      }}>
                        <span>{field.label}</span>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleUserCustomPerm(field.key)}
                          style={{ width: '15px', height: '15px', accentColor: T.success }}
                        />
                      </label>
                    );
                  })}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', paddingTop: '8px' }}>
              <button type="button" onClick={() => setShowModal(false)}
                style={{ padding: '10px 18px', background: T.controlBg, border: `1px solid ${T.border}`, color: T.txtPrimary, borderRadius: '10px', fontWeight: '700', cursor: 'pointer' }}>
                Batal
              </button>
              <button type="submit" disabled={saving}
                style={{
                  padding: '10px 22px', border: 'none', borderRadius: '10px', fontWeight: '900', cursor: saving ? 'not-allowed' : 'pointer',
                  background: T.primaryBtn,
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

  const lbl = { fontSize: '0.80rem', fontWeight: '800', color: T.txtSecondary, display: 'block', marginBottom: '5px' };
  const inp = { width: '100%', padding: '9px 13px', borderRadius: '9px', border: `1px solid ${T.border}`, background: T.inputBg, color: T.txtPrimary, fontSize: '0.87rem', boxSizing: 'border-box' };

  return (
    <div style={{ padding: '14px', maxWidth: '1150px', margin: '0 auto', background: T.pageBg, minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ marginBottom: '14px' }}>
        <h2 style={{ fontSize: '0.96rem', fontWeight: '900', color: T.txtPrimary, margin: '0 0 2px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Users size={18} color={T.accentGold} />
          Pengaturan Hak User &amp; Permission Matrix
        </h2>
        <p style={{ color: T.txtSecondary, fontSize: '0.72rem', margin: 0 }}>
          Kelola akun pengguna Web Based Admin, POS Mobile, dan Matriks Hak Akses Peran / Individual User.
        </p>
      </div>

      {/* Main Sub-Tabs */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '14px' }}>
        <button onClick={() => setActiveTab('mobile')} style={{
          padding: '5px 8px', borderRadius: '8px', fontWeight: '800', fontSize: '0.72rem', cursor: 'pointer', border: 'none',
          background: activeTab === 'mobile' ? T.tabActiveBg : T.tabInactiveBg,
          color: activeTab === 'mobile' ? T.tabActiveColor : T.tabInactiveColor,
          display: 'flex', alignItems: 'center', gap: '5px'
        }}>
          <Smartphone size={14} /> POS Mobile Accounts
        </button>
        <button onClick={() => setActiveTab('web')} style={{
          padding: '5px 8px', borderRadius: '8px', fontWeight: '800', fontSize: '0.72rem', cursor: 'pointer', border: 'none',
          background: activeTab === 'web' ? T.tabActiveBg : T.tabInactiveBg,
          color: activeTab === 'web' ? T.tabActiveColor : T.tabInactiveColor,
          display: 'flex', alignItems: 'center', gap: '5px'
        }}>
          <ShieldCheck size={14} /> Web Admin Accounts
        </button>
        <button onClick={() => setActiveTab('matrix')} style={{
          padding: '5px 8px', borderRadius: '8px', fontWeight: '800', fontSize: '0.72rem', cursor: 'pointer', border: 'none',
          background: activeTab === 'matrix' ? T.tabActiveBg : T.tabInactiveBg,
          color: activeTab === 'matrix' ? T.tabActiveColor : T.tabInactiveColor,
          display: 'flex', alignItems: 'center', gap: '5px'
        }}>
          <Shield size={14} /> Permission Matrix (Matriks Role)
        </button>

        <button onClick={handleRefresh} disabled={loading} style={{
          padding: '5px 8px', borderRadius: '8px', fontWeight: '700', fontSize: '0.72rem', cursor: 'pointer',
          background: T.controlBg, color: T.txtSecondary, border: `1px solid ${T.border}`,
          display: 'flex', alignItems: 'center', gap: '5px', marginLeft: 'auto', opacity: loading ? 0.6 : 1
        }}>
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          {loading ? 'Memuat...' : 'Refresh'}
        </button>
      </div>

      {/* Content POS Mobile Users */}
      {activeTab === 'mobile' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <div>
              <h3 style={{ margin: 0, color: T.success, fontWeight: '800', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '7px' }}>
                <Smartphone size={17} /> Hak User POS Mobile APK
              </h3>
              <p style={{ margin: '3px 0 0', color: T.txtSecondary, fontSize: '0.78rem' }}>
                {mobileUsers.length} akun terdaftar — Atur hak akses khusus per user atau per role
              </p>
            </div>
            <button onClick={() => openAdd('mobile')} style={{
              padding: '9px 16px', background: T.primaryBtn, color: '#fff',
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
              <h3 style={{ margin: 0, color: T.accentGreen, fontWeight: '800', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '7px' }}>
                <ShieldCheck size={17} /> Hak User Web Based Admin
              </h3>
              <p style={{ margin: '3px 0 0', color: T.txtSecondary, fontSize: '0.78rem' }}>
                {webUsers.length} akun terdaftar — Atur hak akses khusus per user atau per role
              </p>
            </div>
            <button onClick={() => openAdd('web')} style={{
              padding: '9px 16px', background: T.primaryBtn, color: '#fff',
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
