import React, { useState } from 'react';
import { Settings, Shield, Printer, Lock, CheckCircle2, RefreshCw, Users, Plus, Trash2, ShieldAlert, Eye, EyeOff, Edit3, X, Key, Building2 } from 'lucide-react';
import PaginationControls from './PaginationControls';

export default function SystemSettings({ masterData, setMasterData }) {
  const [activeSubTab, setActiveSubTab] = useState('user_rights'); // Default to 'user_rights'
  const [selectedOutletIdForPrint, setSelectedOutletIdForPrint] = useState(1);

  // Pagination States (Default 25 rows per page)
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // HAK USER CREATION & EDIT STATES
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [editingUserId, setEditingUserId] = useState(null);
  const [newUserName, setNewUserName] = useState('');
  const [newUserOutlet, setNewUserOutlet] = useState('Semua Outlet (Central)');
  const [newUserUsername, setNewUserUsername] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('123');
  const [newUserRole, setNewUserRole] = useState('Kasir'); // 'Super Admin' | 'Owner' | 'Admin' | 'Kasir' | 'Logistik' | 'Kepala Cabang' | 'SPV'
  const [newUserStatus, setNewUserStatus] = useState('Aktif'); // 'Aktif' | 'Inaktif'
  const [newCanLoginMobile, setNewCanLoginMobile] = useState(true);
  const [newMobileLoginPassword, setNewMobileLoginPassword] = useState('123');
  const [newCanAccessMobileReports, setNewCanAccessMobileReports] = useState(true);
  const [newMobileReportPassword, setNewMobileReportPassword] = useState('8888');
  const [showPasswordVisibility, setShowPasswordVisibility] = useState({});
  const [showAllPasswords, setShowAllPasswords] = useState(false);
  const [showModalWebPasswordEye, setShowModalWebPasswordEye] = useState(false);
  const [showModalMobileLoginPasswordEye, setShowModalMobileLoginPasswordEye] = useState(false);
  const [showModalMobileReportPasswordEye, setShowModalMobileReportPasswordEye] = useState(false);

  // PERMISSION MATRIX MODAL & HANDLER STATES
  const [showAddPermissionModal, setShowAddPermissionModal] = useState(false);
  const [editingPermissionIndex, setEditingPermissionIndex] = useState(null);
  const [newPermissionRole, setNewPermissionRole] = useState('');
  const [newPermissionDashboard, setNewPermissionDashboard] = useState(true);
  const [newPermissionMasterData, setNewPermissionMasterData] = useState(false);
  const [newPermissionCosts, setNewPermissionCosts] = useState(false);
  const [newPermissionStock, setNewPermissionStock] = useState(false);
  const [newPermissionApproved, setNewPermissionApproved] = useState(false);
  const [newPermissionReports, setNewPermissionReports] = useState(false);
  const [newPermissionPolicies, setNewPermissionPolicies] = useState(true);
  const [newPermissionSettings, setNewPermissionSettings] = useState(false);

  const toggleAllPasswords = () => {
    const nextState = !showAllPasswords;
    setShowAllPasswords(nextState);
    const updated = {};
    getUserRightsList().forEach(u => {
      updated[u.id] = nextState;
    });
    setShowPasswordVisibility(updated);
  };

  const handleOpenAddPermissionModal = () => {
    setEditingPermissionIndex(null);
    setNewPermissionRole('');
    setNewPermissionDashboard(true);
    setNewPermissionMasterData(false);
    setNewPermissionCosts(false);
    setNewPermissionStock(false);
    setNewPermissionApproved(false);
    setNewPermissionReports(false);
    setNewPermissionPolicies(true);
    setNewPermissionSettings(false);
    setShowAddPermissionModal(true);
  };

  const handleOpenEditPermissionModal = (idx, pm) => {
    setEditingPermissionIndex(idx);
    setNewPermissionRole(pm.role || '');
    setNewPermissionDashboard(!!pm.dashboard);
    setNewPermissionMasterData(!!pm.masterData);
    setNewPermissionCosts(!!pm.costs);
    setNewPermissionStock(!!pm.stock);
    setNewPermissionApproved(!!pm.approved);
    setNewPermissionReports(!!pm.reports);
    setNewPermissionPolicies(pm.policies !== false);
    setNewPermissionSettings(!!pm.settings);
    setShowAddPermissionModal(true);
  };

  const handleSavePermission = (e) => {
    e.preventDefault();
    if (!newPermissionRole.trim()) {
      alert('Nama Peran (User Role) wajib diisi!');
      return;
    }

    const newRow = {
      role: newPermissionRole.trim(),
      dashboard: newPermissionDashboard,
      masterData: newPermissionMasterData,
      costs: newPermissionCosts,
      stock: newPermissionStock,
      approved: newPermissionApproved,
      reports: newPermissionReports,
      policies: newPermissionPolicies,
      settings: newPermissionSettings
    };

    let updated;
    if (editingPermissionIndex !== null) {
      updated = [...permissionMatrix];
      updated[editingPermissionIndex] = newRow;
    } else {
      updated = [...permissionMatrix, newRow];
    }

    setMasterData(prev => ({
      ...prev,
      permissionMatrix: updated
    }));

    setShowAddPermissionModal(false);
  };

  const handleDeletePermission = (idx) => {
    if (window.confirm(`Apakah Anda yakin ingin menghapus matriks hak akses untuk peran "${permissionMatrix[idx]?.role}"?`)) {
      const updated = permissionMatrix.filter((_, i) => i !== idx);
      setMasterData(prev => ({
        ...prev,
        permissionMatrix: updated
      }));
    }
  };

  // MOBILE APK PERMISSION MATRIX MODAL & HANDLER STATES
  const [showAddMobilePermissionModal, setShowAddMobilePermissionModal] = useState(false);
  const [editingMobilePermissionIndex, setEditingMobilePermissionIndex] = useState(null);
  const [newMobilePermissionRole, setNewMobilePermissionRole] = useState('');
  const [newMobilePosCashier, setNewMobilePosCashier] = useState(true);
  const [newMobileVoidOrder, setNewMobileVoidOrder] = useState(false);
  const [newMobileManualDiscount, setNewMobileManualDiscount] = useState(false);
  const [newMobileStockOpname, setNewMobileStockOpname] = useState(false);
  const [newMobileReceiveGoods, setNewMobileReceiveGoods] = useState(false);
  const [newMobileReports, setNewMobileReports] = useState(false);
  const [newMobileShiftClosing, setNewMobileShiftClosing] = useState(true);

  const mobilePermissionMatrix = masterData?.mobilePermissionMatrix || [
    { role: 'Super Admin / Owner', posCashier: true, voidOrder: true, manualDiscount: true, stockOpname: true, receiveGoods: true, mobileReports: true, shiftClosing: true },
    { role: 'Kepala Cabang / SPV', posCashier: true, voidOrder: true, manualDiscount: true, stockOpname: true, receiveGoods: true, mobileReports: true, shiftClosing: true },
    { role: 'Kasir', posCashier: true, voidOrder: false, manualDiscount: false, stockOpname: false, receiveGoods: false, mobileReports: false, shiftClosing: true },
    { role: 'Logistik & Dapur', posCashier: false, voidOrder: false, manualDiscount: false, stockOpname: true, receiveGoods: true, mobileReports: false, shiftClosing: false }
  ];

  const handleOpenAddMobilePermissionModal = () => {
    setEditingMobilePermissionIndex(null);
    setNewMobilePermissionRole('');
    setNewMobilePosCashier(true);
    setNewMobileVoidOrder(false);
    setNewMobileManualDiscount(false);
    setNewMobileStockOpname(false);
    setNewMobileReceiveGoods(false);
    setNewMobileReports(false);
    setNewMobileShiftClosing(true);
    setShowAddMobilePermissionModal(true);
  };

  const handleOpenEditMobilePermissionModal = (idx, pm) => {
    setEditingMobilePermissionIndex(idx);
    setNewMobilePermissionRole(pm.role || '');
    setNewMobilePosCashier(!!pm.posCashier);
    setNewMobileVoidOrder(!!pm.voidOrder);
    setNewMobileManualDiscount(!!pm.manualDiscount);
    setNewMobileStockOpname(!!pm.stockOpname);
    setNewMobileReceiveGoods(!!pm.receiveGoods);
    setNewMobileReports(!!pm.mobileReports);
    setNewMobileShiftClosing(!!pm.shiftClosing);
    setShowAddMobilePermissionModal(true);
  };

  const handleSaveMobilePermission = (e) => {
    e.preventDefault();
    if (!newMobilePermissionRole.trim()) {
      alert('Nama Peran Mobile APK (Role) wajib diisi!');
      return;
    }

    const newRow = {
      role: newMobilePermissionRole.trim(),
      posCashier: newMobilePosCashier,
      voidOrder: newMobileVoidOrder,
      manualDiscount: newMobileManualDiscount,
      stockOpname: newMobileStockOpname,
      receiveGoods: newMobileReceiveGoods,
      mobileReports: newMobileReports,
      shiftClosing: newMobileShiftClosing
    };

    let updated;
    if (editingMobilePermissionIndex !== null) {
      updated = [...mobilePermissionMatrix];
      updated[editingMobilePermissionIndex] = newRow;
    } else {
      updated = [...mobilePermissionMatrix, newRow];
    }

    setMasterData(prev => ({
      ...prev,
      mobilePermissionMatrix: updated
    }));

    setShowAddMobilePermissionModal(false);
  };

  const handleDeleteMobilePermission = (idx) => {
    if (window.confirm(`Apakah Anda yakin ingin menghapus matriks hak akses Mobile APK untuk peran "${mobilePermissionMatrix[idx]?.role}"?`)) {
      const updated = mobilePermissionMatrix.filter((_, i) => i !== idx);
      setMasterData(prev => ({
        ...prev,
        mobilePermissionMatrix: updated
      }));
    }
  };

  const handleToggleMobilePermissionField = (idx, field) => {
    const updated = mobilePermissionMatrix.map((pm, i) => {
      if (i === idx) {
        return { ...pm, [field]: !pm[field] };
      }
      return pm;
    });
    setMasterData(prev => ({
      ...prev,
      mobilePermissionMatrix: updated
    }));
  };

  const handleTogglePermissionField = (idx, field) => {
    const updated = permissionMatrix.map((pm, i) => {
      if (i === idx) {
        return { ...pm, [field]: !pm[field] };
      }
      return pm;
    });
    setMasterData(prev => ({
      ...prev,
      permissionMatrix: updated
    }));
  };

  const apkSecurity = masterData?.apkSecurity || {
    apiKey: 'MRIS-SEC-KEY-99882233-X7Z',
    tokenExpiryHours: 24,
    dbEncryption: 'AES-256 Enabled',
    lastSecurityScan: '2026-07-24 08:00:00 WIB'
  };

  const printSettings = masterData?.printSettings || {
    printerName: 'Thermal Bluetooth POS Printer 58mm',
    paperWidth: '58mm',
    autoPrintReceipt: true,
    showLogo: true,
    headerText: 'Restoran Multi Branch System\nSelamat Menikmati Hidangan Kami',
    footerText: 'Terima Kasih Atas Kunjungan Anda!'
  };

  const permissionMatrix = masterData?.permissionMatrix || [
    { role: 'Super Admin / Owner', dashboard: true, masterData: true, costs: true, stock: true, approved: true, reports: true, policies: true, settings: true },
    { role: 'Admin Operasional', dashboard: true, masterData: true, costs: true, stock: true, approved: true, reports: true, policies: false, settings: false },
    { role: 'Kepala Cabang / SPV', dashboard: true, masterData: false, costs: true, stock: true, approved: true, reports: true, policies: false, settings: false },
    { role: 'Kasir', dashboard: true, masterData: false, costs: false, stock: false, approved: false, reports: false, policies: false, settings: false },
    { role: 'Logistik', dashboard: false, masterData: false, costs: false, stock: true, approved: false, reports: false, policies: false, settings: false }
  ];

  const getUserRightsList = () => {
    return masterData?.userAccounts || masterData?.userRights || [
      { id: 1, name: 'Budi Santoso (Super Admin)', outlet: 'Semua Outlet (Central)', username: 'superadmin', password: '888', role: 'Super Admin', status: 'Aktif', canLoginMobile: true, mobileLoginPassword: '888', canAccessMobileReports: true, mobileReportPassword: '8888' },
      { id: 2, name: 'Pak Hendra (Owner)', outlet: 'Semua Outlet (Central)', username: 'owner', password: '999', role: 'Owner', status: 'Aktif', canLoginMobile: true, mobileLoginPassword: '999', canAccessMobileReports: true, mobileReportPassword: '9999' },
      { id: 3, name: 'Andi Kasir', outlet: 'Kopi MRIS - Cabang Jakarta Pusat', username: 'andi_kasir', password: '123', role: 'Kasir', status: 'Aktif', canLoginMobile: true, mobileLoginPassword: '123', canAccessMobileReports: true, mobileReportPassword: '1234' },
      { id: 4, name: 'Siti Supervisor', outlet: 'Kopi MRIS - Cabang Jakarta Pusat', username: 'siti_spv', password: '123', role: 'SPV', status: 'Aktif', canLoginMobile: true, mobileLoginPassword: '123', canAccessMobileReports: true, mobileReportPassword: '7777' },
      { id: 5, name: 'Rian Dapur & Logistik', outlet: 'Kopi MRIS - Cabang Jakarta Pusat', username: 'rian_logistik', password: '123', role: 'Logistik', status: 'Aktif', canLoginMobile: true, mobileLoginPassword: '123', canAccessMobileReports: false, mobileReportPassword: '1234' },
      { id: 6, name: 'Agus Kepala Cabang', outlet: 'Kopi MRIS - Cabang Bandung', username: 'agus_kabeng', password: '123', role: 'Kepala Cabang', status: 'Aktif', canLoginMobile: true, mobileLoginPassword: '123', canAccessMobileReports: true, mobileReportPassword: '5555' },
      { id: 7, name: 'Dewi Admin Operasional', outlet: 'Kopi MRIS - Cabang Bandung', username: 'dewi_admin', password: '123', role: 'Admin', status: 'Aktif', canLoginMobile: true, mobileLoginPassword: '123', canAccessMobileReports: true, mobileReportPassword: '6666' }
    ];
  };

  const handleOpenAddUserModal = () => {
    setEditingUserId(null);
    setNewUserName('');
    setNewUserOutlet('Semua Outlet (Central)');
    setNewUserUsername('');
    setNewUserPassword('123');
    setNewUserRole('Kasir');
    setNewUserStatus('Aktif');
    setNewCanLoginMobile(true);
    setNewMobileLoginPassword('123');
    setNewCanAccessMobileReports(true);
    setNewMobileReportPassword('8888');
    setShowAddUserModal(true);
  };

  const handleOpenEditUserModal = (u) => {
    setEditingUserId(u.id);
    setNewUserName(u.name || '');
    setNewUserOutlet(u.outlet || 'Semua Outlet (Central)');
    setNewUserUsername(u.username || '');
    setNewUserPassword(u.password || '');
    setNewUserRole(u.role || 'Kasir');
    setNewUserStatus(u.status || 'Aktif');
    setNewCanLoginMobile(u.canLoginMobile !== false);
    setNewMobileLoginPassword(u.mobileLoginPassword || u.password || '123');
    setNewCanAccessMobileReports(u.canAccessMobileReports !== false);
    setNewMobileReportPassword(u.mobileReportPassword || '8888');
    setShowAddUserModal(true);
  };

  const handleSaveUser = (e) => {
    e.preventDefault();
    if (!newUserName.trim() || !newUserUsername.trim()) {
      alert('Nama pengguna dan Username wajib diisi!');
      return;
    }

    const currentList = getUserRightsList();

    if (editingUserId) {
      // Update existing user
      const updatedList = currentList.map(u => {
        if (u.id === editingUserId) {
          return {
            ...u,
            name: newUserName,
            outlet: newUserOutlet,
            username: newUserUsername,
            password: newUserPassword,
            role: newUserRole,
            status: newUserStatus,
            canLoginMobile: newCanLoginMobile,
            mobileLoginPassword: newMobileLoginPassword || newUserPassword || '123',
            canAccessMobileReports: newCanAccessMobileReports,
            mobileReportPassword: newMobileReportPassword || '8888'
          };
        }
        return u;
      });

      setMasterData(prev => ({
        ...prev,
        userAccounts: updatedList,
        userRights: updatedList
      }));
    } else {
      // Create new user
      const newAccount = {
        id: Date.now(),
        name: newUserName,
        outlet: newUserOutlet,
        username: newUserUsername,
        password: newUserPassword || '123',
        role: newUserRole,
        status: newUserStatus,
        canLoginMobile: newCanLoginMobile,
        mobileLoginPassword: newMobileLoginPassword || newUserPassword || '123',
        canAccessMobileReports: newCanAccessMobileReports,
        mobileReportPassword: newMobileReportPassword || '8888'
      };

      const updatedList = [...currentList, newAccount];
      setMasterData(prev => ({
        ...prev,
        userAccounts: updatedList,
        userRights: updatedList
      }));
    }

    setShowAddUserModal(false);
  };

  const handleToggleUserStatus = (id) => {
    const updated = getUserRightsList().map(u => {
      if (u.id === id) {
        return { ...u, status: u.status === 'Aktif' ? 'Inaktif' : 'Aktif' };
      }
      return u;
    });
    setMasterData(prev => ({
      ...prev,
      userAccounts: updated,
      userRights: updated
    }));
  };

  const handleDeleteUser = (id) => {
    if (id === 1 || id === 2) {
      alert('Akun Super Admin & Owner utama tidak dapat dihapus');
      return;
    }
    if (window.confirm('Apakah Anda yakin ingin menghapus akun user ini?')) {
      const updated = getUserRightsList().filter(u => u.id !== id);
      setMasterData(prev => ({
        ...prev,
        userAccounts: updated,
        userRights: updated
      }));
    }
  };

  const togglePasswordVisibility = (id) => {
    setShowPasswordVisibility(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }} className="animate-fade-in">
      <div>
        <h2 style={{ fontSize: '1.25rem', fontWeight: '800', color: '#f8fafc', margin: 0 }}>
          Pengaturan Sistem &amp; Konfigurasi (System Settings)
        </h2>
        <p style={{ color: '#94a3b8', fontSize: '0.78rem', marginTop: '2px', margin: 0 }}>
          Pengaturan Matriks Hak Akses (Permission Matrix), Template Cetak Struk (Print), dan Keamanan Aplikasi Mobile APK
        </p>
      </div>

      {/* Sub-Tab Navigation Bar */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        <button
          onClick={() => setActiveSubTab('permission')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '7px 14px',
            borderRadius: '10px',
            border: '1px solid',
            borderColor: activeSubTab === 'permission' ? '#6366f1' : '#334155',
            background: activeSubTab === 'permission' ? 'rgba(99, 102, 241, 0.2)' : '#1e293b',
            color: activeSubTab === 'permission' ? '#818cf8' : '#94a3b8',
            fontWeight: '700',
            fontSize: '0.78rem',
            cursor: 'pointer'
          }}
        >
          <Shield size={16} />
          <span>Permission Matrix (Hak Akses Peran)</span>
        </button>

        <button
          onClick={() => setActiveSubTab('print')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '7px 14px',
            borderRadius: '10px',
            border: '1px solid',
            borderColor: activeSubTab === 'print' ? '#6366f1' : '#334155',
            background: activeSubTab === 'print' ? 'rgba(99, 102, 241, 0.2)' : '#1e293b',
            color: activeSubTab === 'print' ? '#818cf8' : '#94a3b8',
            fontWeight: '700',
            fontSize: '0.78rem',
            cursor: 'pointer'
          }}
        >
          <Printer size={16} />
          <span>Print &amp; Struk Thermal</span>
        </button>

        <button
          onClick={() => setActiveSubTab('security')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '7px 14px',
            borderRadius: '10px',
            border: '1px solid',
            borderColor: activeSubTab === 'security' ? '#6366f1' : '#334155',
            background: activeSubTab === 'security' ? 'rgba(99, 102, 241, 0.2)' : '#1e293b',
            color: activeSubTab === 'security' ? '#818cf8' : '#94a3b8',
            fontWeight: '700',
            fontSize: '0.78rem',
            cursor: 'pointer'
          }}
        >
          <Lock size={16} />
          <span>Keamanan APK &amp; Token Enkripsi</span>
        </button>

        <button
          onClick={() => setActiveSubTab('user_rights')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '7px 14px',
            borderRadius: '10px',
            border: '1px solid',
            borderColor: activeSubTab === 'user_rights' ? '#6366f1' : '#334155',
            background: activeSubTab === 'user_rights' ? 'rgba(99, 102, 241, 0.2)' : '#1e293b',
            color: activeSubTab === 'user_rights' ? '#818cf8' : '#94a3b8',
            fontWeight: '700',
            fontSize: '0.78rem',
            cursor: 'pointer'
          }}
        >
          <ShieldAlert size={16} />
          <span>Hak User (Akses Akun)</span>
        </button>
      </div>

      {/* SETTINGS VIEWS */}
      <div className="glass-card" style={{ padding: '16px' }}>
        {/* 1. PERMISSION MATRIX */}
        {activeSubTab === 'permission' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #334155', paddingBottom: '12px' }}>
              <div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: '800', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '6px', margin: 0 }}>
                  <Shield size={18} color="#818cf8" />
                  <span>Permission Matrix - Matriks Hak Akses &amp; Wewenang Peran</span>
                </h3>
                <p style={{ fontSize: '0.74rem', color: '#94a3b8', marginTop: '2px', margin: 0 }}>
                  Kelola daftar peran pengguna (User Role) dan atur hak akses modul aplikasi secara fleksibel.
                </p>
              </div>

              <button
                type="button"
                onClick={handleOpenAddPermissionModal}
                className="btn-primary"
                style={{
                  padding: '6px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '0.78rem',
                  fontWeight: '800',
                  borderRadius: '10px',
                  boxShadow: '0 4px 12px rgba(99,102,241,0.25)'
                }}
              >
                <Plus size={15} />
                <span>+ Tambah Peran / Permission Baru</span>
              </button>
            </div>

            <div style={{ border: '1px solid #334155', borderRadius: '12px', overflow: 'hidden', background: '#0f172a' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.76rem' }}>
                <thead>
                  <tr style={{ background: '#1e293b', borderBottom: '1px solid #334155', color: '#cbd5e1', fontWeight: '800', fontSize: '0.70rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    <th style={{ padding: '8px 10px' }}>Peran (User Role)</th>
                    <th style={{ padding: '8px 6px', textAlign: 'center' }}>Dashboard</th>
                    <th style={{ padding: '8px 6px', textAlign: 'center' }}>Master Data</th>
                    <th style={{ padding: '8px 6px', textAlign: 'center' }}>Akuntansi</th>
                    <th style={{ padding: '8px 6px', textAlign: 'center' }}>Stok</th>
                    <th style={{ padding: '8px 6px', textAlign: 'center' }}>Approved</th>
                    <th style={{ padding: '8px 6px', textAlign: 'center' }}>Laporan</th>
                    <th style={{ padding: '8px 6px', textAlign: 'center' }}>Kebijakan</th>
                    <th style={{ padding: '8px 6px', textAlign: 'center' }}>Pengaturan</th>
                    <th style={{ padding: '8px 10px', textAlign: 'center', width: '90px' }}>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {permissionMatrix.map((pm, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', color: '#f8fafc' }}>
                      <td style={{ padding: '6px 10px', fontWeight: '800', color: '#818cf8', fontSize: '0.78rem' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'rgba(99,102,241,0.15)', padding: '3px 8px', borderRadius: '6px', border: '1px solid rgba(99,102,241,0.3)', fontSize: '0.72rem' }}>
                          👑 {pm.role}
                        </span>
                      </td>
                      <td style={{ padding: '6px 6px', textAlign: 'center' }}>
                        <button
                          type="button"
                          onClick={() => handleTogglePermissionField(idx, 'dashboard')}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.95rem' }}
                          title="Klik untuk ubah akses Dashboard"
                        >
                          {pm.dashboard ? '✅' : '❌'}
                        </button>
                      </td>
                      <td style={{ padding: '6px 6px', textAlign: 'center' }}>
                        <button
                          type="button"
                          onClick={() => handleTogglePermissionField(idx, 'masterData')}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.95rem' }}
                          title="Klik untuk ubah akses Master Data"
                        >
                          {pm.masterData ? '✅' : '❌'}
                        </button>
                      </td>
                      <td style={{ padding: '6px 6px', textAlign: 'center' }}>
                        <button
                          type="button"
                          onClick={() => handleTogglePermissionField(idx, 'costs')}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.95rem' }}
                          title="Klik untuk ubah akses Akuntansi / Biaya"
                        >
                          {pm.costs ? '✅' : '❌'}
                        </button>
                      </td>
                      <td style={{ padding: '6px 6px', textAlign: 'center' }}>
                        <button
                          type="button"
                          onClick={() => handleTogglePermissionField(idx, 'stock')}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.95rem' }}
                          title="Klik untuk ubah akses Stok Opname"
                        >
                          {pm.stock ? '✅' : '❌'}
                        </button>
                      </td>
                      <td style={{ padding: '6px 6px', textAlign: 'center' }}>
                        <button
                          type="button"
                          onClick={() => handleTogglePermissionField(idx, 'approved')}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.95rem' }}
                          title="Klik untuk ubah akses Approval Transaksi"
                        >
                          {pm.approved ? '✅' : '❌'}
                        </button>
                      </td>
                      <td style={{ padding: '6px 6px', textAlign: 'center' }}>
                        <button
                          type="button"
                          onClick={() => handleTogglePermissionField(idx, 'reports')}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.95rem' }}
                          title="Klik untuk ubah akses Laporan Keuangan"
                        >
                          {pm.reports ? '✅' : '❌'}
                        </button>
                      </td>
                      <td style={{ padding: '6px 6px', textAlign: 'center' }}>
                        <button
                          type="button"
                          onClick={() => handleTogglePermissionField(idx, 'policies')}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.95rem' }}
                          title="Klik untuk ubah akses Kebijakan SOP"
                        >
                          {pm.policies !== false ? '✅' : '❌'}
                        </button>
                      </td>
                      <td style={{ padding: '6px 6px', textAlign: 'center' }}>
                        <button
                          type="button"
                          onClick={() => handleTogglePermissionField(idx, 'settings')}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.95rem' }}
                          title="Klik untuk ubah akses Pengaturan Sistem"
                        >
                          {pm.settings ? '✅' : '❌'}
                        </button>
                      </td>
                      <td style={{ padding: '6px 10px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                          <button
                            type="button"
                            onClick={() => handleOpenEditPermissionModal(idx, pm)}
                            style={{ padding: '4px 6px', background: 'rgba(56, 189, 248, 0.15)', border: '1px solid #38bdf8', color: '#38bdf8', borderRadius: '6px', cursor: 'pointer' }}
                            title="Edit Peran Matriks Ini"
                          >
                            <Edit3 size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeletePermission(idx)}
                            style={{ padding: '4px 6px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid #ef4444', color: '#fca5a5', borderRadius: '6px', cursor: 'pointer' }}
                            title="Hapus Peran Matriks Ini"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* MODAL TAMBAH / EDIT PERMISSION MATRIX */}
            {showAddPermissionModal && (
              <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '16px' }}>
                <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '14px', width: '100%', maxWidth: '520px', padding: '18px', boxShadow: '0 20px 40px rgba(0,0,0,0.5)', display: 'flex', flexDirection: 'column', gap: '14px' }} className="animate-scale-up">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #334155', paddingBottom: '10px' }}>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: '800', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '6px', margin: 0 }}>
                      <Shield size={18} color="#818cf8" />
                      <span>{editingPermissionIndex !== null ? 'Edit Permission Matrix Peran' : 'Tambah Permission Matrix Baru'}</span>
                    </h3>
                    <button
                      type="button"
                      onClick={() => setShowAddPermissionModal(false)}
                      style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px' }}
                    >
                      <X size={18} />
                    </button>
                  </div>

                  <form onSubmit={handleSavePermission} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <div>
                      <label style={{ fontSize: '0.78rem', fontWeight: '800', color: '#cbd5e1', display: 'block', marginBottom: '4px' }}>
                        Nama Peran / Role Akses *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Contoh: Manager Bar / Kasir Senior / Auditor"
                        value={newPermissionRole}
                        onChange={e => setNewPermissionRole(e.target.value)}
                        style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #334155', background: '#0f172a', color: '#ffffff', fontSize: '0.82rem', fontWeight: '700' }}
                      />
                    </div>

                    <div>
                      <label style={{ fontSize: '0.78rem', fontWeight: '800', color: '#38bdf8', display: 'block', marginBottom: '8px' }}>
                        Pilih Modul Akses Yang Diizinkan:
                      </label>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#0f172a', padding: '8px 10px', borderRadius: '8px', border: '1px solid #334155', cursor: 'pointer', fontSize: '0.78rem', color: '#cbd5e1' }}>
                          <input type="checkbox" checked={newPermissionDashboard} onChange={e => setNewPermissionDashboard(e.target.checked)} style={{ accentColor: '#818cf8', width: '15px', height: '15px' }} />
                          <span>📊 Dashboard Utama</span>
                        </label>

                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#0f172a', padding: '8px 10px', borderRadius: '8px', border: '1px solid #334155', cursor: 'pointer', fontSize: '0.78rem', color: '#cbd5e1' }}>
                          <input type="checkbox" checked={newPermissionMasterData} onChange={e => setNewPermissionMasterData(e.target.checked)} style={{ accentColor: '#818cf8', width: '15px', height: '15px' }} />
                          <span>🗂️ Data Master</span>
                        </label>

                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#0f172a', padding: '8px 10px', borderRadius: '8px', border: '1px solid #334155', cursor: 'pointer', fontSize: '0.78rem', color: '#cbd5e1' }}>
                          <input type="checkbox" checked={newPermissionCosts} onChange={e => setNewPermissionCosts(e.target.checked)} style={{ accentColor: '#818cf8', width: '15px', height: '15px' }} />
                          <span>📖 Biaya / Akuntansi</span>
                        </label>

                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#0f172a', padding: '8px 10px', borderRadius: '8px', border: '1px solid #334155', cursor: 'pointer', fontSize: '0.78rem', color: '#cbd5e1' }}>
                          <input type="checkbox" checked={newPermissionStock} onChange={e => setNewPermissionStock(e.target.checked)} style={{ accentColor: '#818cf8', width: '15px', height: '15px' }} />
                          <span>📦 Stok Opname &amp; Bahan</span>
                        </label>

                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#0f172a', padding: '8px 10px', borderRadius: '8px', border: '1px solid #334155', cursor: 'pointer', fontSize: '0.78rem', color: '#cbd5e1' }}>
                          <input type="checkbox" checked={newPermissionApproved} onChange={e => setNewPermissionApproved(e.target.checked)} style={{ accentColor: '#818cf8', width: '15px', height: '15px' }} />
                          <span>✅ Approval Transaksi</span>
                        </label>

                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#0f172a', padding: '8px 10px', borderRadius: '8px', border: '1px solid #334155', cursor: 'pointer', fontSize: '0.78rem', color: '#cbd5e1' }}>
                          <input type="checkbox" checked={newPermissionReports} onChange={e => setNewPermissionReports(e.target.checked)} style={{ accentColor: '#818cf8', width: '15px', height: '15px' }} />
                          <span>📈 Laporan Keuangan</span>
                        </label>

                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#0f172a', padding: '8px 10px', borderRadius: '8px', border: '1px solid #334155', cursor: 'pointer', fontSize: '0.78rem', color: '#cbd5e1' }}>
                          <input type="checkbox" checked={newPermissionPolicies} onChange={e => setNewPermissionPolicies(e.target.checked)} style={{ accentColor: '#818cf8', width: '15px', height: '15px' }} />
                          <span>📜 Kebijakan (Policies)</span>
                        </label>

                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#0f172a', padding: '8px 10px', borderRadius: '8px', border: '1px solid #334155', cursor: 'pointer', fontSize: '0.78rem', color: '#cbd5e1' }}>
                          <input type="checkbox" checked={newPermissionSettings} onChange={e => setNewPermissionSettings(e.target.checked)} style={{ accentColor: '#818cf8', width: '15px', height: '15px' }} />
                          <span>⚙️ Pengaturan Sistem</span>
                        </label>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '6px' }}>
                      <button
                        type="button"
                        onClick={() => setShowAddPermissionModal(false)}
                        style={{ padding: '8px 14px', background: '#334155', border: 'none', color: '#cbd5e1', borderRadius: '8px', fontWeight: '700', fontSize: '0.78rem', cursor: 'pointer' }}
                      >
                        Batal
                      </button>
                      <button
                        type="submit"
                        className="btn-primary"
                        style={{ padding: '8px 18px', borderRadius: '8px', fontWeight: '800', fontSize: '0.78rem', cursor: 'pointer' }}
                      >
                        💾 Simpan Permission Matrix
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* ------------------------------------------------------------- */}
            {/* SECTION DEDIKASI: PERMISSION MATRIX MOBILE APK (TABLET POS)  */}
            {/* ------------------------------------------------------------- */}
            <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '2px dashed #334155', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #334155', paddingBottom: '12px' }}>
                <div>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: '800', color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '6px', margin: 0 }}>
                    📱 Permission Matrix Mobile APK - Hak Akses &amp; Wewenang Tablet POS
                  </h3>
                  <p style={{ fontSize: '0.74rem', color: '#94a3b8', marginTop: '2px', margin: 0 }}>
                    Atur izin akses wewenang operasional kasir, void order, diskon manual, stok opname, dan laporan pada Aplikasi Mobile APK.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleOpenAddMobilePermissionModal}
                  style={{
                    padding: '6px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '0.78rem',
                    fontWeight: '800',
                    borderRadius: '10px',
                    background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                    color: '#ffffff',
                    border: '1px solid #38bdf8',
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(56,189,248,0.25)'
                  }}
                >
                  <Plus size={15} />
                  <span>+ Tambah Permission Mobile APK Baru</span>
                </button>
              </div>

              {/* TABEL PERMISSION MATRIX MOBILE APK */}
              <div style={{ border: '1px solid #334155', borderRadius: '12px', overflow: 'hidden', background: '#0f172a' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.76rem' }}>
                  <thead>
                    <tr style={{ background: '#1e293b', borderBottom: '1px solid #334155', color: '#cbd5e1', fontWeight: '800', fontSize: '0.70rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      <th style={{ padding: '8px 10px' }}>Peran Mobile (Role)</th>
                      <th style={{ padding: '8px 6px', textAlign: 'center' }}>Buka POS / Kasir</th>
                      <th style={{ padding: '8px 6px', textAlign: 'center' }}>Void / Batal Order</th>
                      <th style={{ padding: '8px 6px', textAlign: 'center' }}>Diskon Manual</th>
                      <th style={{ padding: '8px 6px', textAlign: 'center' }}>Stok Opname</th>
                      <th style={{ padding: '8px 6px', textAlign: 'center' }}>Terima Barang</th>
                      <th style={{ padding: '8px 6px', textAlign: 'center' }}>Laporan Mobile</th>
                      <th style={{ padding: '8px 6px', textAlign: 'center' }}>Penutupan Shift</th>
                      <th style={{ padding: '8px 10px', textAlign: 'center', width: '90px' }}>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mobilePermissionMatrix.map((pm, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', color: '#f8fafc' }}>
                        <td style={{ padding: '6px 10px', fontWeight: '800', color: '#38bdf8', fontSize: '0.78rem' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'rgba(56,189,248,0.15)', padding: '3px 8px', borderRadius: '6px', border: '1px solid rgba(56,189,248,0.3)', fontSize: '0.72rem' }}>
                            📱 {pm.role}
                          </span>
                        </td>
                        <td style={{ padding: '6px 6px', textAlign: 'center' }}>
                          <button
                            type="button"
                            onClick={() => handleToggleMobilePermissionField(idx, 'posCashier')}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.95rem' }}
                            title="Klik untuk ubah akses Buka POS / Kasir"
                          >
                            {pm.posCashier ? '✅' : '❌'}
                          </button>
                        </td>
                        <td style={{ padding: '6px 6px', textAlign: 'center' }}>
                          <button
                            type="button"
                            onClick={() => handleToggleMobilePermissionField(idx, 'voidOrder')}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.95rem' }}
                            title="Klik untuk ubah akses Void / Batal Order"
                          >
                            {pm.voidOrder ? '✅' : '❌'}
                          </button>
                        </td>
                        <td style={{ padding: '6px 6px', textAlign: 'center' }}>
                          <button
                            type="button"
                            onClick={() => handleToggleMobilePermissionField(idx, 'manualDiscount')}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.95rem' }}
                            title="Klik untuk ubah akses Diskon Manual"
                          >
                            {pm.manualDiscount ? '✅' : '❌'}
                          </button>
                        </td>
                        <td style={{ padding: '6px 6px', textAlign: 'center' }}>
                          <button
                            type="button"
                            onClick={() => handleToggleMobilePermissionField(idx, 'stockOpname')}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.95rem' }}
                            title="Klik untuk ubah akses Stok Opname Mobile"
                          >
                            {pm.stockOpname ? '✅' : '❌'}
                          </button>
                        </td>
                        <td style={{ padding: '6px 6px', textAlign: 'center' }}>
                          <button
                            type="button"
                            onClick={() => handleToggleMobilePermissionField(idx, 'receiveGoods')}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.95rem' }}
                            title="Klik untuk ubah akses Terima Barang"
                          >
                            {pm.receiveGoods ? '✅' : '❌'}
                          </button>
                        </td>
                        <td style={{ padding: '6px 6px', textAlign: 'center' }}>
                          <button
                            type="button"
                            onClick={() => handleToggleMobilePermissionField(idx, 'mobileReports')}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.95rem' }}
                            title="Klik untuk ubah akses Laporan Mobile"
                          >
                            {pm.mobileReports ? '✅' : '❌'}
                          </button>
                        </td>
                        <td style={{ padding: '6px 6px', textAlign: 'center' }}>
                          <button
                            type="button"
                            onClick={() => handleToggleMobilePermissionField(idx, 'shiftClosing')}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.95rem' }}
                            title="Klik untuk ubah akses Penutupan Shift"
                          >
                            {pm.shiftClosing ? '✅' : '❌'}
                          </button>
                        </td>
                        <td style={{ padding: '6px 10px', textAlign: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                            <button
                              type="button"
                              onClick={() => handleOpenEditMobilePermissionModal(idx, pm)}
                              style={{ padding: '4px 6px', background: 'rgba(56, 189, 248, 0.15)', border: '1px solid #38bdf8', color: '#38bdf8', borderRadius: '6px', cursor: 'pointer' }}
                              title="Edit Peran Mobile APK Ini"
                            >
                              <Edit3 size={13} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteMobilePermission(idx)}
                              style={{ padding: '4px 6px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid #ef4444', color: '#fca5a5', borderRadius: '6px', cursor: 'pointer' }}
                              title="Hapus Peran Mobile APK Ini"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* MODAL TAMBAH / EDIT PERMISSION MATRIX MOBILE APK */}
              {showAddMobilePermissionModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '16px' }}>
                  <div style={{ background: '#1e293b', border: '1px solid #38bdf8', borderRadius: '16px', width: '100%', maxWidth: '560px', padding: '24px', boxShadow: '0 20px 40px rgba(0,0,0,0.5)', display: 'flex', flexDirection: 'column', gap: '18px' }} className="animate-scale-up">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #334155', paddingBottom: '14px' }}>
                      <h3 style={{ fontSize: '1.15rem', fontWeight: '800', color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                        📱 <span>{editingMobilePermissionIndex !== null ? 'Edit Permission Mobile APK Peran' : 'Tambah Permission Mobile APK Baru'}</span>
                      </h3>
                      <button
                        type="button"
                        onClick={() => setShowAddMobilePermissionModal(false)}
                        style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px' }}
                      >
                        <X size={20} />
                      </button>
                    </div>

                    <form onSubmit={handleSaveMobilePermission} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      <div>
                        <label style={{ fontSize: '0.82rem', fontWeight: '800', color: '#cbd5e1', display: 'block', marginBottom: '6px' }}>
                          Nama Peran Mobile APK (Role) *
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="Contoh: SPV Kasir / Barista / Staf Logistik"
                          value={newMobilePermissionRole}
                          onChange={e => setNewMobilePermissionRole(e.target.value)}
                          style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #334155', background: '#0f172a', color: '#ffffff', fontSize: '0.90rem', fontWeight: '700' }}
                        />
                      </div>

                      <div>
                        <label style={{ fontSize: '0.82rem', fontWeight: '800', color: '#38bdf8', display: 'block', marginBottom: '10px' }}>
                          Pilih Wewenang Fitur Mobile APK (Tablet POS):
                        </label>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#0f172a', padding: '10px 12px', borderRadius: '8px', border: '1px solid #334155', cursor: 'pointer', fontSize: '0.82rem', color: '#cbd5e1' }}>
                            <input type="checkbox" checked={newMobilePosCashier} onChange={e => setNewMobilePosCashier(e.target.checked)} style={{ accentColor: '#38bdf8', width: '16px', height: '16px' }} />
                            <span>🏪 Buka POS / Kasir</span>
                          </label>

                          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#0f172a', padding: '10px 12px', borderRadius: '8px', border: '1px solid #334155', cursor: 'pointer', fontSize: '0.82rem', color: '#cbd5e1' }}>
                            <input type="checkbox" checked={newMobileVoidOrder} onChange={e => setNewMobileVoidOrder(e.target.checked)} style={{ accentColor: '#38bdf8', width: '16px', height: '16px' }} />
                            <span>🚫 Void / Batal Order</span>
                          </label>

                          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#0f172a', padding: '10px 12px', borderRadius: '8px', border: '1px solid #334155', cursor: 'pointer', fontSize: '0.82rem', color: '#cbd5e1' }}>
                            <input type="checkbox" checked={newMobileManualDiscount} onChange={e => setNewMobileManualDiscount(e.target.checked)} style={{ accentColor: '#38bdf8', width: '16px', height: '16px' }} />
                            <span>🏷️ Diskon Manual</span>
                          </label>

                          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#0f172a', padding: '10px 12px', borderRadius: '8px', border: '1px solid #334155', cursor: 'pointer', fontSize: '0.82rem', color: '#cbd5e1' }}>
                            <input type="checkbox" checked={newMobileStockOpname} onChange={e => setNewMobileStockOpname(e.target.checked)} style={{ accentColor: '#38bdf8', width: '16px', height: '16px' }} />
                            <span>📦 Stok Opname Mobile</span>
                          </label>

                          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#0f172a', padding: '10px 12px', borderRadius: '8px', border: '1px solid #334155', cursor: 'pointer', fontSize: '0.82rem', color: '#cbd5e1' }}>
                            <input type="checkbox" checked={newMobileReceiveGoods} onChange={e => setNewMobileReceiveGoods(e.target.checked)} style={{ accentColor: '#38bdf8', width: '16px', height: '16px' }} />
                            <span>🚚 Terima Barang (GR)</span>
                          </label>

                          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#0f172a', padding: '10px 12px', borderRadius: '8px', border: '1px solid #334155', cursor: 'pointer', fontSize: '0.82rem', color: '#cbd5e1' }}>
                            <input type="checkbox" checked={newMobileReports} onChange={e => setNewMobileReports(e.target.checked)} style={{ accentColor: '#38bdf8', width: '16px', height: '16px' }} />
                            <span>🔒 Laporan Mobile</span>
                          </label>

                          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#0f172a', padding: '10px 12px', borderRadius: '8px', border: '1px solid #334155', cursor: 'pointer', fontSize: '0.82rem', color: '#cbd5e1' }}>
                            <input type="checkbox" checked={newMobileShiftClosing} onChange={e => setNewMobileShiftClosing(e.target.checked)} style={{ accentColor: '#38bdf8', width: '16px', height: '16px' }} />
                            <span>🧾 Penutupan Shift</span>
                          </label>
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '10px' }}>
                        <button
                          type="button"
                          onClick={() => setShowAddMobilePermissionModal(false)}
                          style={{ padding: '10px 18px', background: '#334155', border: 'none', color: '#cbd5e1', borderRadius: '10px', fontWeight: '700', fontSize: '0.85rem', cursor: 'pointer' }}
                        >
                          Batal
                        </button>
                        <button
                          type="submit"
                          style={{ padding: '10px 22px', background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)', color: '#ffffff', border: 'none', borderRadius: '10px', fontWeight: '800', fontSize: '0.85rem', cursor: 'pointer' }}
                        >
                          💾 Simpan Permission Mobile APK
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 2. PRINT & STRUK THERMAL */}
        {activeSubTab === 'print' && (() => {
          const outletsList = masterData?.outlets || [
            { id: 1, name: 'Restoran Utama (Pusat)', address: 'Jl. Sudirman No. 45, Jakarta' },
            { id: 2, name: 'Cabang Bali Beach', address: 'Jl. Pantai Kuta No. 12, Bali' }
          ];

          const currentOutlet = outletsList.find(o => Number(o.id) === Number(selectedOutletIdForPrint)) || outletsList[0];

          const toTitleCase = (str) => {
            if (!str) return '';
            return str
              .toLowerCase()
              .split(' ')
              .map(w => w ? w.charAt(0).toUpperCase() + w.slice(1) : '')
              .join(' ');
          };

          const headerLine1 = (currentOutlet.name || '').toUpperCase();
          const headerLine2 = toTitleCase(currentOutlet.address || 'Jl. Sudirman No. 45, Jakarta');

          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ borderBottom: '1px solid #334155', paddingBottom: '14px' }}>
                <h3 style={{ fontSize: '1.2rem', fontWeight: '800', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                  <Printer size={22} color="#38bdf8" />
                  <span>Konfigurasi Printer Thermal &amp; Template Header Struk</span>
                </h3>
                <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '4px', margin: 0 }}>
                  Format Teks Header Struk Pembayaran dibuat otomatis dari Halaman Data Master (Baris 1: Nama Outlet, Baris 2: Alamat Lokasi).
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '24px', alignItems: 'start' }}>
                
                {/* KONFIGURASI FORM */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  
                  {/* PILIH OUTLET DARI DATA MASTER */}
                  <div style={{ background: '#0f172a', padding: '16px', borderRadius: '12px', border: '1px solid #334155' }}>
                    <label style={{ fontSize: '0.82rem', fontWeight: '800', color: '#38bdf8', display: 'block', marginBottom: '6px' }}>
                      🏢 Pilih Outlet Cabang (Data Master):
                    </label>
                    <select
                      value={selectedOutletIdForPrint}
                      onChange={(e) => setSelectedOutletIdForPrint(Number(e.target.value))}
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: '8px',
                        background: '#1e293b',
                        border: '1px solid #475569',
                        color: '#ffffff',
                        fontSize: '0.88rem',
                        fontWeight: '700',
                        cursor: 'pointer'
                      }}
                    >
                      {outletsList.map(o => (
                        <option key={o.id} value={o.id}>
                          {o.name} - {o.address || 'Alamat Cabang'}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* FORM PRINTER & PAPER */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                    <div>
                      <label style={{ fontSize: '0.78rem', color: '#cbd5e1', fontWeight: '700', display: 'block', marginBottom: '4px' }}>
                        Nama Printer Terhubung
                      </label>
                      <input
                        type="text"
                        value={printSettings.printerName || 'EPSON TM-T82 Thermal Bluetooth POS'}
                        readOnly
                        style={{ width: '100%', padding: '9px 12px', background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', color: '#38bdf8', fontSize: '0.84rem', fontWeight: '700' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.78rem', color: '#cbd5e1', fontWeight: '700', display: 'block', marginBottom: '4px' }}>
                        Ukuran Kertas Thermal
                      </label>
                      <select
                        value={printSettings.paperWidth || '58mm'}
                        readOnly
                        style={{ width: '100%', padding: '9px 12px', background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', color: '#ffffff', fontSize: '0.84rem', fontWeight: '700' }}
                      >
                        <option value="58mm">58mm (Portable Bluetooth POS)</option>
                        <option value="80mm">80mm (Standar Restoran Kasir)</option>
                      </select>
                    </div>
                  </div>

                  {/* TEKS HEADER STRUK PEMBAYARAN */}
                  <div>
                    <label style={{ fontSize: '0.78rem', color: '#cbd5e1', fontWeight: '800', display: 'block', marginBottom: '4px' }}>
                      Teks Header Struk Pembayaran (Otomatis dari Data Master Outlet):
                    </label>
                    <div style={{
                      background: '#0f172a',
                      border: '1px solid #334155',
                      borderRadius: '10px',
                      padding: '12px 14px',
                      color: '#34d399',
                      fontFamily: 'monospace',
                      fontSize: '0.85rem',
                      lineHeight: '1.6'
                    }}>
                      <div style={{ fontWeight: '900', color: '#38bdf8' }}>Baris 1 (Nama Outlet - ALL UPPERCASE, Center):</div>
                      <div style={{ color: '#ffffff', fontWeight: '800', fontSize: '0.92rem' }}>"{headerLine1}"</div>
                      
                      <div style={{ fontWeight: '900', color: '#38bdf8', marginTop: '8px' }}>Baris 2 (Alamat Lokasi - Title Case, Center, Font 1pt Lebih Kecil):</div>
                      <div style={{ color: '#ffffff', fontWeight: '600', fontSize: '0.84rem' }}>"{headerLine2}"</div>
                    </div>
                  </div>

                  {/* TEKS FOOTER STRUK */}
                  <div>
                    <label style={{ fontSize: '0.78rem', color: '#cbd5e1', fontWeight: '700', display: 'block', marginBottom: '4px' }}>
                      Teks Footer Struk Pembayaran
                    </label>
                    <textarea
                      rows={2}
                      value={printSettings.footerText || 'Terima Kasih Atas Kunjungan Anda!\nSelamat Menikmati Hidangan Kami.'}
                      readOnly
                      style={{ width: '100%', padding: '9px 12px', background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', color: '#f8fafc', fontSize: '0.84rem' }}
                    />
                  </div>

                </div>

                {/* LIVE PREVIEW STRUK THERMAL */}
                <div style={{
                  background: '#ffffff',
                  color: '#000000',
                  borderRadius: '16px',
                  padding: '24px 20px',
                  fontFamily: '"Courier New", Courier, monospace',
                  boxShadow: '0 20px 40px rgba(0,0,0,0.6)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px'
                }}>
                  <div style={{ textAlign: 'center', fontSize: '0.7rem', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', marginBottom: '4px', letterSpacing: '0.05em' }}>
                    📱 PREVIEW STRUK THERMAL HASIL CETAK
                  </div>

                  {/* HEADER STRUK DENGAN FORMAT PERSYARATAN LENGKAP */}
                  <div style={{ borderBottom: '2px dashed #000000', paddingBottom: '12px', marginBottom: '8px', textAlign: 'center' }}>
                    {/* BARIS 1: NAMA OUTLET - HURUF BESAR SEMUA, RATA TENGAH, UKURAN FONT LEBIH BESAR 1 LEVEL */}
                    <div style={{
                      fontSize: '1.15rem',
                      fontWeight: '900',
                      textAlign: 'center',
                      textTransform: 'uppercase',
                      letterSpacing: '0.03em',
                      color: '#000000',
                      lineHeight: '1.2'
                    }}>
                      {headerLine1}
                    </div>

                    {/* BARIS 2: ALAMAT LOKASI - HURUF BESAR DI SETIAP KATA (TITLE CASE), RATA TENGAH, UKURAN FONT 1 LEVEL LEBIH KECIL */}
                    <div style={{
                      fontSize: '0.88rem',
                      fontWeight: '600',
                      textAlign: 'center',
                      color: '#222222',
                      marginTop: '6px',
                      lineHeight: '1.3'
                    }}>
                      {headerLine2}
                    </div>
                  </div>

                  {/* DETAIL STRUK CONTOH */}
                  <div style={{ fontSize: '0.75rem', lineHeight: '1.5', borderBottom: '1px dashed #666', paddingBottom: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>No. Transaksi:</span>
                      <strong>TRX-20260724-001</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Tanggal:</span>
                      <span>24/07/2026 14:50</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Kasir:</span>
                      <span>Andi (Kasir Shift 1)</span>
                    </div>
                  </div>

                  {/* ITEMA LIST */}
                  <div style={{ fontSize: '0.75rem', borderBottom: '1px solid #000', paddingBottom: '4px', marginTop: '4px', fontWeight: '800' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>1x NASI GORENG SPESIAL</span>
                      <span>Rp 35.000</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>2x ES TEH MANIS SEGAR</span>
                      <span>Rp 16.000</span>
                    </div>
                  </div>

                  <div style={{ fontSize: '0.78rem', fontWeight: '900', marginTop: '6px', display: 'flex', justifyContent: 'space-between' }}>
                    <span>TOTAL BAYAR (CASH):</span>
                    <span>Rp 51.000</span>
                  </div>

                  <div style={{ borderTop: '2px dashed #000', marginTop: '12px', paddingTop: '10px', textAlign: 'center', fontSize: '0.72rem', color: '#444' }}>
                    {printSettings.footerText || 'Terima Kasih Atas Kunjungan Anda!'}
                  </div>

                </div>

              </div>
            </div>
          );
        })()}

        {/* 3. KEAMANAN APK */}
        {activeSubTab === 'security' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: '800', color: '#f8fafc', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Lock size={18} color="#818cf8" />
              <span>Keamanan APK Mobile &amp; Kunci Enkripsi (APK Security)</span>
            </h3>
            <div style={{ background: '#0f172a', padding: '14px', borderRadius: '10px', border: '1px solid #334155', display: 'flex', flexDirection: 'column', gap: '10px', maxWidth: '500px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem' }}>
                <span style={{ color: '#94a3b8' }}>API Secret Key APK:</span>
                <strong style={{ color: '#34d399', fontFamily: 'monospace' }}>{apkSecurity.apiKey}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem' }}>
                <span style={{ color: '#94a3b8' }}>Masa Berlaku Session Token:</span>
                <strong style={{ color: '#f8fafc' }}>{apkSecurity.tokenExpiryHours} Jam</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem' }}>
                <span style={{ color: '#94a3b8' }}>Enkripsi Database Lokal APK:</span>
                <strong style={{ color: '#34d399' }}>✓ AES-256 Enabled</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem' }}>
                <span style={{ color: '#94a3b8' }}>Pemindaian Keamanan Terakhir:</span>
                <strong style={{ color: '#818cf8' }}>{apkSecurity.lastSecurityScan}</strong>
              </div>
            </div>
          </div>
        )}

        {/* 4. HAK USER (USER ACCESS RIGHTS) */}
        {activeSubTab === 'user_rights' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #334155', paddingBottom: '12px' }}>
              <div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: '800', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '6px', margin: 0 }}>
                  <Users size={18} color="#818cf8" />
                  <span>Manajemen Hak User &amp; Otentikasi Akses Akun</span>
                </h3>
                <p style={{ fontSize: '0.74rem', color: '#94a3b8', marginTop: '2px', margin: 0 }}>
                  Kelola akun pengguna, username, password, outlet cabang, peran, dan status aktif.
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  type="button"
                  onClick={toggleAllPasswords}
                  style={{
                    padding: '6px 12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '0.76rem',
                    fontWeight: '800',
                    borderRadius: '10px',
                    background: showAllPasswords ? 'rgba(239, 68, 68, 0.2)' : 'rgba(52, 211, 153, 0.15)',
                    border: showAllPasswords ? '1px solid #ef4444' : '1px solid #34d399',
                    color: showAllPasswords ? '#fca5a5' : '#34d399',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                  title="Super Admin: Tampilkan atau sembunyikan seluruh password akun user sekaligus"
                >
                  {showAllPasswords ? <EyeOff size={15} /> : <Eye size={15} />}
                  <span>{showAllPasswords ? '🙈 Sembunyikan Password' : '👁️ Tampilkan Semua Password'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleOpenAddUserModal}
                  className="btn-primary"
                  style={{
                    padding: '6px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '0.78rem',
                    fontWeight: '800',
                    borderRadius: '10px',
                    boxShadow: '0 4px 12px rgba(99,102,241,0.25)'
                  }}
                >
                  <Plus size={15} />
                  <span>+ Tambah User Baru</span>
                </button>
              </div>
            </div>

            {/* Tabel Hak User Terdaftar */}
            <div style={{ border: '1px solid #334155', borderRadius: '12px', overflow: 'hidden', background: '#0f172a' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.76rem' }}>
                <thead>
                  <tr style={{ background: '#1e293b', borderBottom: '1px solid #334155', color: '#cbd5e1', fontWeight: '800', fontSize: '0.70rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    <th style={{ padding: '8px 10px' }}>Nama Pengguna</th>
                    <th style={{ padding: '8px 10px' }}>Outlet Cabang</th>
                    <th style={{ padding: '8px 10px' }}>Username &amp; Pass Web</th>
                    <th style={{ padding: '8px 10px' }}>Akses Login Mobile APK</th>
                    <th style={{ padding: '8px 10px' }}>Password Laporan Mobile</th>
                    <th style={{ padding: '8px 10px' }}>Peran (Role)</th>
                    <th style={{ padding: '8px 10px', textAlign: 'center' }}>Status</th>
                    <th style={{ padding: '8px 10px', textAlign: 'center', width: '110px' }}>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const userRightsList = getUserRightsList();
                    const totalUserItems = userRightsList.length;
                    const totalUserPages = Math.ceil(totalUserItems / pageSize) || 1;
                    const paginatedUserRights = userRightsList.slice((currentPage - 1) * pageSize, currentPage * pageSize);

                    return paginatedUserRights.map(u => {
                      const isVisible = showAllPasswords || !!showPasswordVisibility[u.id];

                    let roleBadgeColor = '#818cf8';
                    let roleBgColor = 'rgba(99,102,241,0.15)';
                    if (u.role === 'Super Admin') { roleBadgeColor = '#c084fc'; roleBgColor = 'rgba(168,85,247,0.2)'; }
                    else if (u.role === 'Owner') { roleBadgeColor = '#fbbf24'; roleBgColor = 'rgba(251,191,36,0.2)'; }
                    else if (u.role === 'Admin') { roleBadgeColor = '#38bdf8'; roleBgColor = 'rgba(56,189,248,0.2)'; }
                    else if (u.role === 'Kasir') { roleBadgeColor = '#34d399'; roleBgColor = 'rgba(52,211,153,0.2)'; }
                    else if (u.role === 'Kepala Cabang') { roleBadgeColor = '#f472b6'; roleBgColor = 'rgba(244,114,182,0.2)'; }
                    else if (u.role === 'SPV') { roleBadgeColor = '#fb923c'; roleBgColor = 'rgba(251,146,60,0.2)'; }
                    else if (u.role === 'Logistik') { roleBadgeColor = '#a78bfa'; roleBgColor = 'rgba(167,139,250,0.2)'; }

                    return (
                      <tr key={u.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', color: '#f8fafc' }}>
                        <td style={{ padding: '12px', fontWeight: '800', color: '#f8fafc' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: roleBgColor, border: `1px solid ${roleBadgeColor}`, color: roleBadgeColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900', fontSize: '0.8rem' }}>
                              {u.name ? u.name.charAt(0).toUpperCase() : 'U'}
                            </div>
                            <span>{u.name}</span>
                          </div>
                        </td>
                        <td style={{ padding: '12px', color: '#cbd5e1', fontSize: '0.8rem' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'rgba(255,255,255,0.05)', padding: '3px 8px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.08)' }}>
                            <Building2 size={12} color="#94a3b8" />
                            <span>{u.outlet || 'Semua Outlet (Central)'}</span>
                          </span>
                        </td>
                        <td style={{ padding: '12px' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <span style={{ fontFamily: 'monospace', fontWeight: '800', color: '#38bdf8' }}>@{u.username}</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{ fontFamily: 'monospace', fontSize: '0.80rem', color: isVisible ? '#34d399' : '#94a3b8', fontWeight: isVisible ? '800' : 'normal' }}>
                                {isVisible ? u.password : '••••••••'}
                              </span>
                              <button
                                type="button"
                                onClick={() => togglePasswordVisibility(u.id)}
                                style={{ background: 'none', border: 'none', color: isVisible ? '#34d399' : '#94a3b8', cursor: 'pointer', padding: '2px' }}
                                title={isVisible ? 'Sembunyikan Password' : 'Tampilkan Password'}
                              >
                                {isVisible ? <EyeOff size={14} /> : <Eye size={14} />}
                              </button>
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: '12px' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <span style={{ fontSize: '0.76rem', fontWeight: '800', color: u.canLoginMobile !== false ? '#34d399' : '#fb7185' }}>
                              {u.canLoginMobile !== false ? '📱 ✅ Boleh Login' : '📱 ❌ Ditolak Login'}
                            </span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{ fontFamily: 'monospace', fontSize: '0.76rem', color: isVisible ? '#38bdf8' : '#94a3b8', fontWeight: isVisible ? '800' : 'normal' }}>
                                Pass: {isVisible ? (u.mobileLoginPassword || u.password || '123') : '••••'}
                              </span>
                              <button
                                type="button"
                                onClick={() => togglePasswordVisibility(u.id)}
                                style={{ background: 'none', border: 'none', color: isVisible ? '#38bdf8' : '#94a3b8', cursor: 'pointer', padding: '2px' }}
                                title={isVisible ? 'Sembunyikan Password' : 'Tampilkan Password'}
                              >
                                {isVisible ? <EyeOff size={13} /> : <Eye size={13} />}
                              </button>
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: '12px' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <span style={{ fontSize: '0.76rem', fontWeight: '800', color: u.canAccessMobileReports !== false ? '#38bdf8' : '#fb7185' }}>
                              {u.canAccessMobileReports !== false ? '🔒 ✅ Boleh Buka Laporan' : '🔒 ❌ Dibatasi (No Access)'}
                            </span>
                            {u.canAccessMobileReports !== false && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span style={{ fontFamily: 'monospace', fontSize: '0.80rem', fontWeight: '900', color: isVisible ? '#facc15' : '#94a3b8' }}>
                                  Password: {isVisible ? (u.mobileReportPassword || '8888') : '••••••••'}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => togglePasswordVisibility(u.id)}
                                  style={{ background: 'none', border: 'none', color: isVisible ? '#facc15' : '#94a3b8', cursor: 'pointer', padding: '2px' }}
                                  title={isVisible ? 'Sembunyikan Password' : 'Tampilkan Password'}
                                >
                                  {isVisible ? <EyeOff size={13} /> : <Eye size={13} />}
                                </button>
                              </div>
                            )}
                          </div>
                        </td>
                        <td style={{ padding: '12px' }}>
                          <span style={{
                            padding: '3px 10px',
                            borderRadius: '8px',
                            fontSize: '0.75rem',
                            fontWeight: '900',
                            background: roleBgColor,
                            color: roleBadgeColor,
                            border: `1px solid ${roleBadgeColor}`
                          }}>
                            {u.role}
                          </span>
                        </td>
                        <td style={{ padding: '12px', textAlign: 'center' }}>
                          <button
                            type="button"
                            onClick={() => handleToggleUserStatus(u.id)}
                            style={{
                              padding: '4px 10px',
                              borderRadius: '20px',
                              fontSize: '0.74rem',
                              fontWeight: '900',
                              background: u.status === 'Aktif' ? 'rgba(52, 211, 153, 0.2)' : 'rgba(244, 63, 94, 0.2)',
                              color: u.status === 'Aktif' ? '#34d399' : '#fb7185',
                              border: '1px solid',
                              borderColor: u.status === 'Aktif' ? '#34d399' : '#fb7185',
                              cursor: 'pointer'
                            }}
                          >
                            {u.status === 'Aktif' ? '🟢 Aktif' : '🔴 Inaktif'}
                          </button>
                        </td>
                        <td style={{ padding: '12px', textAlign: 'center' }}>
                          <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                            <button
                              type="button"
                              onClick={() => handleOpenEditUserModal(u)}
                              style={{
                                padding: '5px 8px',
                                background: 'rgba(56, 189, 248, 0.15)',
                                color: '#38bdf8',
                                border: '1px solid rgba(56, 189, 248, 0.3)',
                                borderRadius: '6px',
                                fontSize: '0.75rem',
                                fontWeight: '700',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}
                            >
                              <Edit3 size={12} />
                              <span>Edit</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteUser(u.id)}
                              style={{
                                padding: '5px 8px',
                                background: 'rgba(244, 63, 94, 0.15)',
                                color: '#fb7185',
                                border: '1px solid rgba(244, 63, 94, 0.3)',
                                borderRadius: '6px',
                                fontSize: '0.75rem',
                                fontWeight: '700',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}
                            >
                              <Trash2 size={12} />
                              <span>Hapus</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  });
                })()}
              </tbody>
            </table>
          </div>

          {/* PAGINATION CONTROLS */}
          <PaginationControls
            currentPage={currentPage}
            totalPages={Math.ceil((getUserRightsList().length) / pageSize) || 1}
            pageSize={pageSize}
            totalItems={getUserRightsList().length}
            onPageChange={setCurrentPage}
            onPageSizeChange={setPageSize}
          />
        </div>
      )}
      </div>

      {/* MODAL TAMBAH / EDIT USER BARU DENGAN FIELD PENGATURAN PASSWORD MOBILE APK */}
      {showAddUserModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999
        }}>
          <div className="glass-card animate-fade-in" style={{
            width: '100%', maxWidth: '580px', padding: '24px', background: '#1e293b', border: '1px solid #334155', borderRadius: '20px', maxHeight: '90vh', overflowY: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', borderBottom: '1px solid #334155', paddingBottom: '14px' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: '800', color: '#ffffff', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Users size={22} color="#818cf8" />
                <span>{editingUserId ? '✏️ Edit Hak User Pengguna' : '➕ Tambah User Pengguna Baru'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowAddUserModal(false)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveUser} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              {/* NAMA PENGGUNA */}
              <div>
                <label style={{ fontSize: '0.80rem', fontWeight: '800', color: '#cbd5e1', display: 'block', marginBottom: '6px' }}>
                  Nama Lengkap Pengguna:
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Budi Santoso"
                  value={newUserName}
                  onChange={e => setNewUserName(e.target.value)}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #334155', background: '#0f172a', color: '#ffffff', fontSize: '0.88rem' }}
                />
              </div>

              {/* OUTLET CABANG */}
              <div>
                <label style={{ fontSize: '0.80rem', fontWeight: '800', color: '#cbd5e1', display: 'block', marginBottom: '6px' }}>
                  Outlet Cabang:
                </label>
                <select
                  value={newUserOutlet}
                  onChange={e => setNewUserOutlet(e.target.value)}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #334155', background: '#0f172a', color: '#ffffff', fontSize: '0.88rem', cursor: 'pointer' }}
                >
                  <option value="Semua Outlet (Central)">Semua Outlet (Central / Pusat)</option>
                  {(masterData.outlets || [
                    { name: 'Kopi MRIS - Cabang Jakarta Pusat' },
                    { name: 'Kopi MRIS - Cabang Bandung' }
                  ]).map((o, idx) => (
                    <option key={idx} value={o.name}>{o.name}</option>
                  ))}
                </select>
              </div>

              {/* USERNAME & PASSWORD WEB ADMIN */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.80rem', fontWeight: '800', color: '#cbd5e1', display: 'block', marginBottom: '6px' }}>
                    Username Akses Web:
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="budi_kasir"
                    value={newUserUsername}
                    onChange={e => setNewUserUsername(e.target.value)}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #334155', background: '#0f172a', color: '#38bdf8', fontFamily: 'monospace', fontSize: '0.88rem' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.80rem', fontWeight: '800', color: '#cbd5e1', display: 'block', marginBottom: '6px' }}>
                    Password Web Admin:
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showModalWebPasswordEye ? 'text' : 'password'}
                      required
                      placeholder="123456"
                      value={newUserPassword}
                      onChange={e => setNewUserPassword(e.target.value)}
                      style={{ width: '100%', padding: '10px 38px 10px 14px', borderRadius: '10px', border: '1px solid #334155', background: '#0f172a', color: '#34d399', fontFamily: 'monospace', fontSize: '0.88rem' }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowModalWebPasswordEye(!showModalWebPasswordEye)}
                      style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
                      title={showModalWebPasswordEye ? 'Sembunyikan Password' : 'Tampilkan Password'}
                    >
                      {showModalWebPasswordEye ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
              </div>

              {/* PERAN & STATUS */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.80rem', fontWeight: '800', color: '#cbd5e1', display: 'block', marginBottom: '6px' }}>
                    Peran Hak Akses (Role):
                  </label>
                  <select
                    value={newUserRole}
                    onChange={e => setNewUserRole(e.target.value)}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #334155', background: '#0f172a', color: '#ffffff', fontSize: '0.88rem', cursor: 'pointer' }}
                  >
                    <option value="Super Admin">Super Admin</option>
                    <option value="Owner">Owner</option>
                    <option value="Admin">Admin</option>
                    <option value="Kasir">Kasir</option>
                    <option value="Logistik">Logistik</option>
                    <option value="Kepala Cabang">Kepala Cabang</option>
                    <option value="SPV">SPV (Supervisor)</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '0.80rem', fontWeight: '800', color: '#cbd5e1', display: 'block', marginBottom: '6px' }}>
                    Status Akun:
                  </label>
                  <select
                    value={newUserStatus}
                    onChange={e => setNewUserStatus(e.target.value)}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #334155', background: '#0f172a', color: '#ffffff', fontSize: '0.88rem', cursor: 'pointer' }}
                  >
                    <option value="Aktif">🟢 Aktif</option>
                    <option value="Inaktif">🔴 Inaktif</option>
                  </select>
                </div>
              </div>

              {/* SECTION KHUSUS HAK USER & PASSWORD APLIKASI MOBILE APK */}
              <div style={{ background: '#0f172a', padding: '16px', borderRadius: '14px', border: '1px solid #334155', marginTop: '6px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: '800', color: '#38bdf8', borderBottom: '1px solid #1e293b', paddingBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  📱 Pengaturan Hak Akses &amp; Password Mobile APK (Tablet POS):
                </div>

                {/* HAK LOGIN & PASSWORD LOGIN MOBILE APK */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', alignItems: 'center' }}>
                  <div>
                    <label style={{ fontSize: '0.80rem', fontWeight: '800', color: '#cbd5e1', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={newCanLoginMobile}
                        onChange={e => setNewCanLoginMobile(e.target.checked)}
                        style={{ width: '16px', height: '16px', accentColor: '#38bdf8' }}
                      />
                      <span>Izinkan Login Mobile APK</span>
                    </label>
                  </div>
                  <div>
                    <label style={{ fontSize: '0.76rem', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>
                      Password Login Mobile APK:
                    </label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type={showModalMobileLoginPasswordEye ? 'text' : 'password'}
                        placeholder="123"
                        value={newMobileLoginPassword}
                        onChange={e => setNewMobileLoginPassword(e.target.value)}
                        disabled={!newCanLoginMobile}
                        style={{ width: '100%', padding: '8px 36px 8px 12px', borderRadius: '8px', border: '1px solid #334155', background: '#1e293b', color: '#38bdf8', fontFamily: 'monospace', fontSize: '0.85rem' }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowModalMobileLoginPasswordEye(!showModalMobileLoginPasswordEye)}
                        disabled={!newCanLoginMobile}
                        style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#94a3b8', cursor: newCanLoginMobile ? 'pointer' : 'default', opacity: newCanLoginMobile ? 1 : 0.4 }}
                        title={showModalMobileLoginPasswordEye ? 'Sembunyikan Password' : 'Tampilkan Password'}
                      >
                        {showModalMobileLoginPasswordEye ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* HAK AKSES & PASSWORD LAPORAN MOBILE APK */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', alignItems: 'center', borderTop: '1px dashed #1e293b', paddingTop: '10px' }}>
                  <div>
                    <label style={{ fontSize: '0.80rem', fontWeight: '800', color: '#facc15', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={newCanAccessMobileReports}
                        onChange={e => setNewCanAccessMobileReports(e.target.checked)}
                        style={{ width: '16px', height: '16px', accentColor: '#facc15' }}
                      />
                      <span>Hak Akses Menu Laporan Mobile APK</span>
                    </label>
                  </div>
                  <div>
                    <label style={{ fontSize: '0.76rem', color: '#facc15', fontWeight: '800', display: 'block', marginBottom: '4px' }}>
                      🔒 Password Laporan Mobile APK:
                    </label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type={showModalMobileReportPasswordEye ? 'text' : 'password'}
                        placeholder="8888"
                        value={newMobileReportPassword}
                        onChange={e => setNewMobileReportPassword(e.target.value)}
                        disabled={!newCanAccessMobileReports}
                        style={{ width: '100%', padding: '8px 36px 8px 12px', borderRadius: '8px', border: '1px solid #facc15', background: '#1e293b', color: '#facc15', fontFamily: 'monospace', fontWeight: '800', fontSize: '0.88rem' }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowModalMobileReportPasswordEye(!showModalMobileReportPasswordEye)}
                        disabled={!newCanAccessMobileReports}
                        style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#94a3b8', cursor: newCanAccessMobileReports ? 'pointer' : 'default', opacity: newCanAccessMobileReports ? 1 : 0.4 }}
                        title={showModalMobileReportPasswordEye ? 'Sembunyikan Password' : 'Tampilkan Password'}
                      >
                        {showModalMobileReportPasswordEye ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  </div>
                </div>

              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '12px' }}>
                <button
                  type="button"
                  onClick={() => setShowAddUserModal(false)}
                  style={{ padding: '10px 18px', background: '#334155', border: 'none', color: '#cbd5e1', borderRadius: '10px', fontWeight: '700', fontSize: '0.85rem', cursor: 'pointer' }}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  style={{ padding: '10px 22px', borderRadius: '10px', fontWeight: '800', fontSize: '0.85rem' }}
                >
                  {editingUserId ? 'Simpan Perubahan' : '➕ Tambahkan User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
