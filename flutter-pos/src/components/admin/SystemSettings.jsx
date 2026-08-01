import React, { useState, useMemo } from 'react';
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

  // USER RIGHTS SEARCH, FILTER & PREVIEW STATES
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userFilterOutlet, setUserFilterOutlet] = useState('Semua Outlet');
  const [userFilterRole, setUserFilterRole] = useState('Semua Peran');
  const [userFilterStatus, setUserFilterStatus] = useState('Semua Status');
  const [previewUserAccount, setPreviewUserAccount] = useState(null);

  // PRINT & STRUK THERMAL EDITABLE STATES
  const [customHeaderLine1, setCustomHeaderLine1] = useState(masterData?.printSettings?.headerLine1 || '');
  const [customHeaderLine2, setCustomHeaderLine2] = useState(masterData?.printSettings?.headerLine2 || '');
  const [customFooterText, setCustomFooterText] = useState(masterData?.printSettings?.footerText || 'Terima Kasih Atas Kunjungan Anda!\nSelamat Menikmati Hidangan Kami.');

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
  const [newMobileStockTransferOut, setNewMobileStockTransferOut] = useState(false);
  const [newMobileReports, setNewMobileReports] = useState(false);
  const [newMobileShiftClosing, setNewMobileShiftClosing] = useState(true);
  const [newMobileReservations, setNewMobileReservations] = useState(false);
  const [newMobilePrinterSetting, setNewMobilePrinterSetting] = useState(true);

  const mobilePermissionMatrix = masterData?.mobilePermissionMatrix || [
    { role: 'Super Admin / Owner', posCashier: true, voidOrder: true, manualDiscount: true, stockOpname: true, receiveGoods: true, stockTransferOut: true, mobileReports: true, shiftClosing: true, reservations: true, printerSetting: true },
    { role: 'Kepala Cabang / SPV', posCashier: true, voidOrder: true, manualDiscount: true, stockOpname: true, receiveGoods: true, stockTransferOut: true, mobileReports: true, shiftClosing: true, reservations: true, printerSetting: true },
    { role: 'Kasir', posCashier: true, voidOrder: false, manualDiscount: false, stockOpname: false, receiveGoods: false, stockTransferOut: false, mobileReports: false, shiftClosing: true, reservations: true, printerSetting: true },
    { role: 'Logistik & Dapur', posCashier: false, voidOrder: false, manualDiscount: false, stockOpname: true, receiveGoods: true, stockTransferOut: true, mobileReports: false, shiftClosing: false, reservations: false, printerSetting: false }
  ];

  const handleOpenAddMobilePermissionModal = () => {
    setEditingMobilePermissionIndex(null);
    setNewMobilePermissionRole('');
    setNewMobilePosCashier(true);
    setNewMobileVoidOrder(false);
    setNewMobileManualDiscount(false);
    setNewMobileStockOpname(false);
    setNewMobileReceiveGoods(false);
    setNewMobileStockTransferOut(false);
    setNewMobileReports(false);
    setNewMobileShiftClosing(true);
    setNewMobileReservations(false);
    setNewMobilePrinterSetting(true);
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
    setNewMobileStockTransferOut(!!pm.stockTransferOut);
    setNewMobileReports(!!pm.mobileReports);
    setNewMobileShiftClosing(!!pm.shiftClosing);
    setNewMobileReservations(!!pm.reservations);
    setNewMobilePrinterSetting(!!pm.printerSetting);
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
      stockTransferOut: newMobileStockTransferOut,
      mobileReports: newMobileReports,
      shiftClosing: newMobileShiftClosing,
      reservations: newMobileReservations,
      printerSetting: newMobilePrinterSetting
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

  // Dynamic Web Admin Role Options (from permissionMatrix + defaults)
  const webAdminRoles = useMemo(() => {
    const defaultRoles = ['Super Admin', 'Owner', 'Admin', 'Kasir', 'Logistik', 'Kepala Cabang', 'SPV'];
    const matrixRoles = (permissionMatrix || []).map(p => p.role).filter(Boolean);
    return Array.from(new Set([...matrixRoles, ...defaultRoles]));
  }, [permissionMatrix]);

  // Dynamic Mobile Role Options (from mobilePermissionMatrix + defaults)
  const mobileRoles = useMemo(() => {
    const defaultRoles = ['Super Admin / Owner', 'Kepala Cabang / SPV', 'Kasir', 'Logistik & Dapur'];
    const matrixRoles = (mobilePermissionMatrix || []).map(p => p.role).filter(Boolean);
    return Array.from(new Set([...matrixRoles, ...defaultRoles]));
  }, [mobilePermissionMatrix]);

  // Combined Unique Roles for Filtering
  const allFilterRoles = useMemo(() => {
    const webRoles = (permissionMatrix || []).map(p => p.role).filter(Boolean);
    const mobRoles = (mobilePermissionMatrix || []).map(p => p.role).filter(Boolean);
    const defaults = ['Super Admin', 'Owner', 'Admin', 'Kasir', 'Logistik', 'Kepala Cabang', 'SPV', 'Super Admin / Owner', 'Kepala Cabang / SPV', 'Logistik & Dapur'];
    return Array.from(new Set([...webRoles, ...mobRoles, ...defaults]));
  }, [permissionMatrix, mobilePermissionMatrix]);

  // === WEB ADMIN ACCOUNTS ===
  const getWebAdminList = () => {
    if (Array.isArray(masterData?.webAdminAccounts)) {
      return masterData.webAdminAccounts;
    }
    if (Array.isArray(masterData?.userRights) && masterData.userRights.length > 0) {
      return masterData.userRights;
    }
    if (Array.isArray(masterData?.users) && masterData.users.length > 0) {
      return masterData.users;
    }
    return [];
  };

  // === MOBILE ACCOUNTS ===
  const getMobileList = () => {
    if (Array.isArray(masterData?.mobileAccounts)) {
      return masterData.mobileAccounts;
    }
    if (Array.isArray(masterData?.userRights) && masterData.userRights.length > 0) {
      return masterData.userRights.filter(u => u.canLoginMobile !== false);
    }
    if (Array.isArray(masterData?.users) && masterData.users.length > 0) {
      return masterData.users.filter(u => u.canLoginMobile !== false);
    }
    return [];
  };

  // Backward compat alias
  const getUserRightsList = () => getWebAdminList();

  const handleOpenAddUserModal = () => {
    setEditingUserId(null);
    setNewUserName('');
    setNewUserOutlet('Semua Outlet (Central)');
    setNewUserUsername('');
    setNewUserPassword('123');
    setNewUserRole(webAdminRoles[0] || 'Super Admin');
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

  // ===== CRUD WEB ADMIN ACCOUNTS =====
  const handleSaveUser = (e) => {
    e.preventDefault();
    if (!newUserName.trim() || !newUserUsername.trim()) {
      alert('Nama pengguna dan Username wajib diisi!');
      return;
    }
    const currentList = getWebAdminList();
    let updatedWebList;
    if (editingUserId) {
      updatedWebList = currentList.map(u => {
        if (u.id === editingUserId) {
          return { ...u, name: newUserName.trim(), outlet: newUserOutlet, username: newUserUsername.trim(), password: newUserPassword, role: newUserRole, status: newUserStatus };
        }
        return u;
      });
    } else {
      const newAccount = { id: Date.now(), name: newUserName.trim(), outlet: newUserOutlet, username: newUserUsername.trim(), password: newUserPassword || '123', role: newUserRole, status: newUserStatus };
      updatedWebList = [...currentList, newAccount];
    }

    setMasterData(prev => {
      const mobList = prev?.mobileAccounts || [];
      const usersMap = new Map();
      [...updatedWebList, ...mobList].forEach(u => {
        if (u && u.name) {
          const k = String(u.id || u.username || u.name).toLowerCase();
          if (!usersMap.has(k)) usersMap.set(k, u);
        }
      });
      const combinedUsers = Array.from(usersMap.values());
      return {
        ...prev,
        webAdminAccounts: updatedWebList,
        mobileAccounts: mobList,
        userRights: combinedUsers,
        users: combinedUsers,
        userAccounts: combinedUsers
      };
    });
    setShowAddUserModal(false);
  };

  const handleToggleUserStatus = (id) => {
    const updatedWebList = getWebAdminList().map(u => {
      if (u.id === id) return { ...u, status: u.status === 'Aktif' ? 'Inaktif' : 'Aktif' };
      return u;
    });
    setMasterData(prev => {
      const mobList = prev?.mobileAccounts || [];
      const usersMap = new Map();
      [...updatedWebList, ...mobList].forEach(u => {
        if (u && u.name) {
          const k = String(u.id || u.username || u.name).toLowerCase();
          if (!usersMap.has(k)) usersMap.set(k, u);
        }
      });
      const combinedUsers = Array.from(usersMap.values());
      return {
        ...prev,
        webAdminAccounts: updatedWebList,
        mobileAccounts: mobList,
        userRights: combinedUsers,
        users: combinedUsers,
        userAccounts: combinedUsers
      };
    });
  };

  const handleDeleteUser = (id) => {
    if (window.confirm('Apakah Anda yakin ingin menghapus akun Web Admin ini?')) {
      const updatedWebList = getWebAdminList().filter(u => u.id !== id);
      setMasterData(prev => {
        const mobList = prev?.mobileAccounts || [];
        const usersMap = new Map();
        [...updatedWebList, ...mobList].forEach(u => {
          if (u && u.name) {
            const k = String(u.id || u.username || u.name).toLowerCase();
            if (!usersMap.has(k)) usersMap.set(k, u);
          }
        });
        const combinedUsers = Array.from(usersMap.values());
        return {
          ...prev,
          webAdminAccounts: updatedWebList,
          mobileAccounts: mobList,
          userRights: combinedUsers,
          users: combinedUsers,
          userAccounts: combinedUsers
        };
      });
    }
  };

  // ===== CRUD MOBILE ACCOUNTS (INDEPENDEN dari Web Admin) =====
  const [showAddMobileModal, setShowAddMobileModal] = useState(false);
  const [editingMobileId, setEditingMobileId] = useState(null);
  const [newMobileName, setNewMobileName] = useState('');
  const [newMobileOutlet, setNewMobileOutlet] = useState('Semua Outlet (Central)');
  const [newMobileUsername, setNewMobileUsername] = useState('');
  const [newMobilePwd, setNewMobilePwd] = useState('123');
  const [newMobileRole2, setNewMobileRole2] = useState('Kasir');
  const [newMobileStatus2, setNewMobileStatus2] = useState('Aktif');
  const [newMobileCanReport, setNewMobileCanReport] = useState(true);
  const [newMobileReportPwd2, setNewMobileReportPwd2] = useState('8888');

  const handleOpenAddMobileModal = () => {
    setEditingMobileId(null);
    setNewMobileName(''); setNewMobileOutlet('Semua Outlet (Central)'); setNewMobileUsername('');
    setNewMobilePwd('123'); setNewMobileRole2(mobileRoles[0] || 'Kasir'); setNewMobileStatus2('Aktif');
    setNewMobileCanReport(true); setNewMobileReportPwd2('8888');
    setShowAddMobileModal(true);
  };

  const handleOpenEditMobileModal = (u) => {
    setEditingMobileId(u.id);
    setNewMobileName(u.name || ''); setNewMobileOutlet(u.outlet || 'Semua Outlet (Central)');
    setNewMobileUsername(u.username || ''); setNewMobilePwd(u.mobileLoginPassword || u.password || '123');
    setNewMobileRole2(u.role || 'Kasir'); setNewMobileStatus2(u.status || 'Aktif');
    setNewMobileCanReport(u.canAccessMobileReports !== false); setNewMobileReportPwd2(u.mobileReportPassword || '8888');
    setShowAddMobileModal(true);
  };

  const handleSaveMobile = (e) => {
    e.preventDefault();
    if (!newMobileName.trim() || !newMobileUsername.trim()) { alert('Nama dan Username wajib diisi!'); return; }
    const currentList = getMobileList();
    let updatedMobList;
    if (editingMobileId) {
      updatedMobList = currentList.map(u => {
        if (u.id === editingMobileId) {
          return { ...u, name: newMobileName.trim(), outlet: newMobileOutlet, username: newMobileUsername.trim(), mobileLoginPassword: newMobilePwd, password: newMobilePwd, role: newMobileRole2, status: newMobileStatus2, canLoginMobile: true, canAccessMobileReports: newMobileCanReport, mobileReportPassword: newMobileReportPwd2 };
        }
        return u;
      });
    } else {
      const newAcc = { id: Date.now(), name: newMobileName.trim(), outlet: newMobileOutlet, username: newMobileUsername.trim(), mobileLoginPassword: newMobilePwd || '123', password: newMobilePwd || '123', role: newMobileRole2, status: newMobileStatus2, canLoginMobile: true, canAccessMobileReports: newMobileCanReport, mobileReportPassword: newMobileReportPwd2 || '8888' };
      updatedMobList = [...currentList, newAcc];
    }

    setMasterData(prev => {
      const webList = prev?.webAdminAccounts || [];
      const usersMap = new Map();
      [...webList, ...updatedMobList].forEach(u => {
        if (u && u.name) {
          const k = String(u.id || u.username || u.name).toLowerCase();
          if (!usersMap.has(k)) usersMap.set(k, u);
        }
      });
      const combinedUsers = Array.from(usersMap.values());
      return {
        ...prev,
        webAdminAccounts: webList,
        mobileAccounts: updatedMobList,
        userRights: combinedUsers,
        users: combinedUsers,
        userAccounts: combinedUsers
      };
    });
    setShowAddMobileModal(false);
  };

  const handleToggleMobileStatus = (id) => {
    const updatedMobList = getMobileList().map(u => {
      if (u.id === id) return { ...u, status: u.status === 'Aktif' ? 'Inaktif' : 'Aktif' };
      return u;
    });
    setMasterData(prev => {
      const webList = prev?.webAdminAccounts || [];
      const usersMap = new Map();
      [...webList, ...updatedMobList].forEach(u => {
        if (u && u.name) {
          const k = String(u.id || u.username || u.name).toLowerCase();
          if (!usersMap.has(k)) usersMap.set(k, u);
        }
      });
      const combinedUsers = Array.from(usersMap.values());
      return {
        ...prev,
        webAdminAccounts: webList,
        mobileAccounts: updatedMobList,
        userRights: combinedUsers,
        users: combinedUsers,
        userAccounts: combinedUsers
      };
    });
  };

  const handleDeleteMobile = (id) => {
    if (window.confirm('Apakah Anda yakin ingin menghapus akun Mobile APK ini?')) {
      const updatedMobList = getMobileList().filter(u => u.id !== id);
      setMasterData(prev => {
        const webList = prev?.webAdminAccounts || [];
        const usersMap = new Map();
        [...webList, ...updatedMobList].forEach(u => {
          if (u && u.name) {
            const k = String(u.id || u.username || u.name).toLowerCase();
            if (!usersMap.has(k)) usersMap.set(k, u);
          }
        });
        const combinedUsers = Array.from(usersMap.values());
        return {
          ...prev,
          webAdminAccounts: webList,
          mobileAccounts: updatedMobList,
          userRights: combinedUsers,
          users: combinedUsers,
          userAccounts: combinedUsers
        };
      });
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

            <div style={{ border: '1px solid #334155', borderRadius: '12px', overflow: 'hidden', background: '#0f172a', width: '100%' }}>
              <table style={{ width: '100%', tableLayout: 'fixed', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.74rem' }}>
                <thead>
                  <tr style={{ background: '#1e293b', borderBottom: '1px solid #334155', color: '#cbd5e1', fontWeight: '800', fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.02em' }}>
                    <th style={{ padding: '8px 6px', width: '19%' }}>Peran (User Role)</th>
                    <th style={{ padding: '8px 2px', textAlign: 'center', width: '9%' }}>Dashboard</th>
                    <th style={{ padding: '8px 2px', textAlign: 'center', width: '9%' }}>Master Data</th>
                    <th style={{ padding: '8px 2px', textAlign: 'center', width: '9%' }}>Akuntansi</th>
                    <th style={{ padding: '8px 2px', textAlign: 'center', width: '9%' }}>Stok</th>
                    <th style={{ padding: '8px 2px', textAlign: 'center', width: '9%' }}>Approved</th>
                    <th style={{ padding: '8px 2px', textAlign: 'center', width: '9%' }}>Laporan</th>
                    <th style={{ padding: '8px 2px', textAlign: 'center', width: '9%' }}>Kebijakan</th>
                    <th style={{ padding: '8px 2px', textAlign: 'center', width: '9%' }}>Pengaturan</th>
                    <th style={{ padding: '8px 4px', textAlign: 'center', width: '9%' }}>Aksi</th>
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

              {/* TABEL PERMISSION MATRIX MOBILE APK (FIT TO PAGE TANPA HORIZONTAL SLIDE) */}
              <div style={{ border: '1px solid #334155', borderRadius: '12px', overflow: 'hidden', background: '#0f172a', width: '100%' }}>
                <table style={{ width: '100%', tableLayout: 'fixed', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.72rem' }}>
                  <thead>
                    <tr style={{ background: '#1e293b', borderBottom: '1px solid #334155', color: '#cbd5e1', fontWeight: '800', fontSize: '0.66rem', textTransform: 'uppercase', letterSpacing: '0.02em' }}>
                      <th style={{ padding: '8px 6px', width: '16%' }}>Peran Mobile (Role)</th>
                      <th style={{ padding: '8px 2px', textAlign: 'center', width: '8%' }}>Buka POS</th>
                      <th style={{ padding: '8px 2px', textAlign: 'center', width: '7%' }}>Void</th>
                      <th style={{ padding: '8px 2px', textAlign: 'center', width: '7%' }}>Diskon</th>
                      <th style={{ padding: '8px 2px', textAlign: 'center', width: '8%' }}>Opname</th>
                      <th style={{ padding: '8px 2px', textAlign: 'center', width: '8%' }}>Terima</th>
                      <th style={{ padding: '8px 2px', textAlign: 'center', width: '8%' }}>Trf Out</th>
                      <th style={{ padding: '8px 2px', textAlign: 'center', width: '8%' }}>Laporan</th>
                      <th style={{ padding: '8px 2px', textAlign: 'center', width: '8%' }}>Shift</th>
                      <th style={{ padding: '8px 2px', textAlign: 'center', width: '8%' }}>Reservasi</th>
                      <th style={{ padding: '8px 2px', textAlign: 'center', width: '7%' }}>Printer</th>
                      <th style={{ padding: '8px 4px', textAlign: 'center', width: '7%' }}>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mobilePermissionMatrix.map((pm, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', color: '#f8fafc' }}>
                        <td style={{ padding: '6px 6px', fontWeight: '800', color: '#38bdf8', fontSize: '0.74rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', background: 'rgba(56,189,248,0.15)', padding: '2px 6px', borderRadius: '5px', border: '1px solid rgba(56,189,248,0.3)', fontSize: '0.70rem' }}>
                            📱 {pm.role}
                          </span>
                        </td>
                        <td style={{ padding: '6px 2px', textAlign: 'center' }}>
                          <button
                            type="button"
                            onClick={() => handleToggleMobilePermissionField(idx, 'posCashier')}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.90rem' }}
                            title="Klik untuk ubah akses Buka POS / Kasir"
                          >
                            {pm.posCashier ? '✅' : '❌'}
                          </button>
                        </td>
                        <td style={{ padding: '6px 2px', textAlign: 'center' }}>
                          <button
                            type="button"
                            onClick={() => handleToggleMobilePermissionField(idx, 'voidOrder')}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.90rem' }}
                            title="Klik untuk ubah akses Void / Batal Order"
                          >
                            {pm.voidOrder ? '✅' : '❌'}
                          </button>
                        </td>
                        <td style={{ padding: '6px 2px', textAlign: 'center' }}>
                          <button
                            type="button"
                            onClick={() => handleToggleMobilePermissionField(idx, 'manualDiscount')}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.90rem' }}
                            title="Klik untuk ubah akses Diskon Manual"
                          >
                            {pm.manualDiscount ? '✅' : '❌'}
                          </button>
                        </td>
                        <td style={{ padding: '6px 2px', textAlign: 'center' }}>
                          <button
                            type="button"
                            onClick={() => handleToggleMobilePermissionField(idx, 'stockOpname')}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.90rem' }}
                            title="Klik untuk ubah akses Stok Opname Mobile"
                          >
                            {pm.stockOpname ? '✅' : '❌'}
                          </button>
                        </td>
                        <td style={{ padding: '6px 2px', textAlign: 'center' }}>
                          <button
                            type="button"
                            onClick={() => handleToggleMobilePermissionField(idx, 'receiveGoods')}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.90rem' }}
                            title="Klik untuk ubah akses Terima Barang (GR)"
                          >
                            {pm.receiveGoods ? '✅' : '❌'}
                          </button>
                        </td>
                        <td style={{ padding: '6px 2px', textAlign: 'center' }}>
                          <button
                            type="button"
                            onClick={() => handleToggleMobilePermissionField(idx, 'stockTransferOut')}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.90rem' }}
                            title="Klik untuk ubah akses Transfer Stok Out & Retur"
                          >
                            {pm.stockTransferOut ? '✅' : '❌'}
                          </button>
                        </td>
                        <td style={{ padding: '6px 2px', textAlign: 'center' }}>
                          <button
                            type="button"
                            onClick={() => handleToggleMobilePermissionField(idx, 'mobileReports')}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.90rem' }}
                            title="Klik untuk ubah akses Laporan Mobile"
                          >
                            {pm.mobileReports ? '✅' : '❌'}
                          </button>
                        </td>
                        <td style={{ padding: '6px 2px', textAlign: 'center' }}>
                          <button
                            type="button"
                            onClick={() => handleToggleMobilePermissionField(idx, 'shiftClosing')}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.90rem' }}
                            title="Klik untuk ubah akses Penutupan Shift"
                          >
                            {pm.shiftClosing ? '✅' : '❌'}
                          </button>
                        </td>
                        <td style={{ padding: '6px 2px', textAlign: 'center' }}>
                          <button
                            type="button"
                            onClick={() => handleToggleMobilePermissionField(idx, 'reservations')}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.90rem' }}
                            title="Klik untuk ubah akses Reservasi Meja"
                          >
                            {pm.reservations ? '✅' : '❌'}
                          </button>
                        </td>
                        <td style={{ padding: '6px 2px', textAlign: 'center' }}>
                          <button
                            type="button"
                            onClick={() => handleToggleMobilePermissionField(idx, 'printerSetting')}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.90rem' }}
                            title="Klik untuk ubah akses Setting Printer Thermal"
                          >
                            {pm.printerSetting ? '✅' : '❌'}
                          </button>
                        </td>
                        <td style={{ padding: '6px 4px', textAlign: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3px' }}>
                            <button
                              type="button"
                              onClick={() => handleOpenEditMobilePermissionModal(idx, pm)}
                              style={{ padding: '3px 5px', background: 'rgba(56, 189, 248, 0.15)', border: '1px solid #38bdf8', color: '#38bdf8', borderRadius: '5px', cursor: 'pointer' }}
                              title="Edit Peran Mobile APK Ini"
                            >
                              <Edit3 size={12} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteMobilePermission(idx)}
                              style={{ padding: '3px 5px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid #ef4444', color: '#fca5a5', borderRadius: '5px', cursor: 'pointer' }}
                              title="Hapus Peran Mobile APK Ini"
                            >
                              <Trash2 size={12} />
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
                  <div style={{ background: '#1e293b', border: '1px solid #38bdf8', borderRadius: '16px', width: '100%', maxWidth: '620px', padding: '24px', boxShadow: '0 20px 40px rgba(0,0,0,0.5)', display: 'flex', flexDirection: 'column', gap: '18px' }} className="animate-scale-up">
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
                            <span>🏷️ Diskon Manual &amp; Promo</span>
                          </label>

                          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#0f172a', padding: '10px 12px', borderRadius: '8px', border: '1px solid #334155', cursor: 'pointer', fontSize: '0.82rem', color: '#cbd5e1' }}>
                            <input type="checkbox" checked={newMobileStockOpname} onChange={e => setNewMobileStockOpname(e.target.checked)} style={{ accentColor: '#38bdf8', width: '16px', height: '16px' }} />
                            <span>📦 Stok Opname Mobile</span>
                          </label>

                          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#0f172a', padding: '10px 12px', borderRadius: '8px', border: '1px solid #334155', cursor: 'pointer', fontSize: '0.82rem', color: '#cbd5e1' }}>
                            <input type="checkbox" checked={newMobileReceiveGoods} onChange={e => setNewMobileReceiveGoods(e.target.checked)} style={{ accentColor: '#38bdf8', width: '16px', height: '16px' }} />
                            <span>🚚 Terima Barang (GR / Trf In)</span>
                          </label>

                          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#0f172a', padding: '10px 12px', borderRadius: '8px', border: '1px solid #334155', cursor: 'pointer', fontSize: '0.82rem', color: '#cbd5e1' }}>
                            <input type="checkbox" checked={newMobileStockTransferOut} onChange={e => setNewMobileStockTransferOut(e.target.checked)} style={{ accentColor: '#38bdf8', width: '16px', height: '16px' }} />
                            <span>📤 Transfer Stok Out &amp; Retur</span>
                          </label>

                          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#0f172a', padding: '10px 12px', borderRadius: '8px', border: '1px solid #334155', cursor: 'pointer', fontSize: '0.82rem', color: '#cbd5e1' }}>
                            <input type="checkbox" checked={newMobileReports} onChange={e => setNewMobileReports(e.target.checked)} style={{ accentColor: '#38bdf8', width: '16px', height: '16px' }} />
                            <span>🔒 Laporan Omset &amp; Mobile</span>
                          </label>

                          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#0f172a', padding: '10px 12px', borderRadius: '8px', border: '1px solid #334155', cursor: 'pointer', fontSize: '0.82rem', color: '#cbd5e1' }}>
                            <input type="checkbox" checked={newMobileShiftClosing} onChange={e => setNewMobileShiftClosing(e.target.checked)} style={{ accentColor: '#38bdf8', width: '16px', height: '16px' }} />
                            <span>🧾 Penutupan Shift Kasir</span>
                          </label>

                          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#0f172a', padding: '10px 12px', borderRadius: '8px', border: '1px solid #334155', cursor: 'pointer', fontSize: '0.82rem', color: '#cbd5e1' }}>
                            <input type="checkbox" checked={newMobileReservations} onChange={e => setNewMobileReservations(e.target.checked)} style={{ accentColor: '#38bdf8', width: '16px', height: '16px' }} />
                            <span>📅 Reservasi &amp; Booking Meja</span>
                          </label>

                          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#0f172a', padding: '10px 12px', borderRadius: '8px', border: '1px solid #334155', cursor: 'pointer', fontSize: '0.82rem', color: '#cbd5e1' }}>
                            <input type="checkbox" checked={newMobilePrinterSetting} onChange={e => setNewMobilePrinterSetting(e.target.checked)} style={{ accentColor: '#38bdf8', width: '16px', height: '16px' }} />
                            <span>🖨️ Setting Printer Thermal</span>
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
          const outletsList = masterData?.outlets || [];
          const currentOutlet = outletsList.find(o => Number(o.id) === Number(selectedOutletIdForPrint)) || outletsList[0] || null;

          const toTitleCase = (str) => {
            if (!str) return '';
            return str
              .toLowerCase()
              .split(' ')
              .map(w => w ? w.charAt(0).toUpperCase() + w.slice(1) : '')
              .join(' ');
          };

          const headerLine1 = (currentOutlet?.name || 'RESTORAN UTAMA').toUpperCase();
          const headerLine2 = toTitleCase(currentOutlet?.address || 'Jl. Sudirman No. 45, Jakarta');

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

                  {/* EDITABLE TEKS HEADER STRUK PEMBAYARAN */}
                  <div style={{ background: '#0f172a', padding: '16px', borderRadius: '12px', border: '1px solid #334155', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <label style={{ fontSize: '0.82rem', color: '#38bdf8', fontWeight: '800', display: 'block' }}>
                      ✏️ Edit Teks Header Struk Pembayaran (Live Preview):
                    </label>
                    <div>
                      <span style={{ fontSize: '0.76rem', color: '#cbd5e1', fontWeight: '700', display: 'block', marginBottom: '4px' }}>
                        Baris 1: Nama Restoran / Outlet (Huruf Besar Semua):
                      </span>
                      <input
                        type="text"
                        value={customHeaderLine1}
                        onChange={e => setCustomHeaderLine1(e.target.value)}
                        placeholder={headerLine1}
                        style={{ width: '100%', padding: '9px 12px', background: '#1e293b', border: '1px solid #475569', borderRadius: '8px', color: '#ffffff', fontSize: '0.85rem', fontWeight: '800' }}
                      />
                    </div>
                    <div>
                      <span style={{ fontSize: '0.76rem', color: '#cbd5e1', fontWeight: '700', display: 'block', marginBottom: '4px' }}>
                        Baris 2: Alamat Lokasi / Subtitle Struk (Title Case):
                      </span>
                      <input
                        type="text"
                        value={customHeaderLine2}
                        onChange={e => setCustomHeaderLine2(e.target.value)}
                        placeholder={headerLine2}
                        style={{ width: '100%', padding: '9px 12px', background: '#1e293b', border: '1px solid #475569', borderRadius: '8px', color: '#ffffff', fontSize: '0.85rem', fontWeight: '600' }}
                      />
                    </div>
                  </div>

                  {/* EDITABLE TEKS FOOTER STRUK */}
                  <div style={{ background: '#0f172a', padding: '16px', borderRadius: '12px', border: '1px solid #334155', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ fontSize: '0.82rem', color: '#38bdf8', fontWeight: '800', display: 'block' }}>
                      ✏️ Edit Teks Footer Struk Pembayaran (Live Preview):
                    </label>
                    <textarea
                      rows={3}
                      value={customFooterText}
                      onChange={e => setCustomFooterText(e.target.value)}
                      placeholder="Terima Kasih Atas Kunjungan Anda!&#10;Selamat Menikmati Hidangan Kami."
                      style={{ width: '100%', padding: '9px 12px', background: '#1e293b', border: '1px solid #475569', borderRadius: '8px', color: '#f8fafc', fontSize: '0.84rem', lineHeight: '1.5' }}
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setMasterData(prev => ({
                        ...prev,
                        printSettings: {
                          ...(prev?.printSettings || {}),
                          printerName: printSettings.printerName,
                          paperWidth: printSettings.paperWidth,
                          headerLine1: customHeaderLine1.trim() || headerLine1,
                          headerLine2: customHeaderLine2.trim() || headerLine2,
                          footerText: customFooterText.trim()
                        }
                      }));
                      alert('✅ Template Teks Header & Footer Struk Thermal Berhasil Disimpan!');
                    }}
                    style={{
                      padding: '12px 20px',
                      background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '10px',
                      fontWeight: '800',
                      fontSize: '0.88rem',
                      cursor: 'pointer',
                      boxShadow: '0 4px 14px rgba(37,99,235,0.3)',
                      display: 'flex',
                      alignItems: 'center',
                      justify: 'center',
                      gap: '8px'
                    }}
                  >
                    <Printer size={16} />
                    <span>💾 Simpan Template Struk Thermal</span>
                  </button>

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
                      {customHeaderLine1.trim() ? customHeaderLine1 : headerLine1}
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
                      {customHeaderLine2.trim() ? customHeaderLine2 : headerLine2}
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

                  <div style={{ borderTop: '2px dashed #000', marginTop: '12px', paddingTop: '10px', textAlign: 'center', fontSize: '0.72rem', color: '#444', whiteSpace: 'pre-line' }}>
                    {customFooterText.trim() ? customFooterText : 'Terima Kasih Atas Kunjungan Anda!'}
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
                    border: 'none',
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(2, 132, 199, 0.25)'
                  }}
                  title="Tambah akun pengguna baru khusus untuk akses Web Based Admin"
                >
                  <Plus size={15} />
                  <span>💻 + Tambah User Web Admin</span>
                </button>

                <button
                  type="button"
                  onClick={handleOpenAddMobileModal}
                  style={{
                    padding: '6px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '0.78rem',
                    fontWeight: '800',
                    borderRadius: '10px',
                    background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                    color: '#ffffff',
                    border: 'none',
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(5, 150, 105, 0.25)'
                  }}
                  title="Tambah otentikasi akun pengguna baru khusus untuk akses Aplikasi Kasir (Mobile APK)"
                >
                  <Plus size={15} />
                  <span>📱 + Tambah User Mobile Kasir</span>
                </button>
              </div>
            </div>

            {/* REAL-TIME FILTER BAR (CARI USER, FILTER OUTLET, FILTER ROLE, FILTER STATUS) */}
            <div style={{
              background: '#0f172a',
              padding: '14px 16px',
              borderRadius: '12px',
              border: '1px solid #334155',
              display: 'grid',
              gridTemplateColumns: '1.4fr 1.1fr 1.1fr 1fr',
              gap: '12px',
              alignItems: 'center'
            }}>
              <div>
                <label style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: '700', display: 'block', marginBottom: '4px' }}>
                  🔍 Cari Nama / Username / Peran:
                </label>
                <input
                  type="text"
                  value={userSearchQuery}
                  onChange={e => { setUserSearchQuery(e.target.value); setCurrentPage(1); }}
                  placeholder="Ketik pencarian user..."
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', background: '#1e293b', border: '1px solid #475569', color: '#ffffff', fontSize: '0.80rem', fontWeight: '700' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: '700', display: 'block', marginBottom: '4px' }}>
                  🏢 Filter Outlet Cabang:
                </label>
                <select
                  value={userFilterOutlet}
                  onChange={e => { setUserFilterOutlet(e.target.value); setCurrentPage(1); }}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', background: '#1e293b', border: '1px solid #475569', color: '#ffffff', fontSize: '0.80rem', fontWeight: '700' }}
                >
                  <option value="Semua Outlet">Semua Outlet Cabang</option>
                  <option value="Semua Outlet (Central)">Semua Outlet (Central)</option>
                  {(masterData?.outlets || []).map(o => (
                    <option key={o.id} value={o.name}>{o.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: '700', display: 'block', marginBottom: '4px' }}>
                  👑 Filter Peran (Role):
                </label>
                <select
                  value={userFilterRole}
                  onChange={e => { setUserFilterRole(e.target.value); setCurrentPage(1); }}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', background: '#1e293b', border: '1px solid #475569', color: '#ffffff', fontSize: '0.80rem', fontWeight: '700' }}
                >
                  <option value="Semua Peran">Semua Peran / Role</option>
                  {allFilterRoles.map((rName, idx) => (
                    <option key={idx} value={rName}>{rName}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: '700', display: 'block', marginBottom: '4px' }}>
                  🟢 Filter Status Akun:
                </label>
<select
                  value={userFilterStatus}
                  onChange={e => { setUserFilterStatus(e.target.value); setCurrentPage(1); }}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', background: '#1e293b', border: '1px solid #475569', color: '#ffffff', fontSize: '0.80rem', fontWeight: '700' }}
                >
                  <option value="Semua Status">Semua Status</option>
                  <option value="Aktif">🟢 Aktif</option>
                  <option value="Inaktif">🔴 Inaktif</option>
                </select>
              </div>
            </div>

            {/* ========================================================================= */}
            {/* TABEL 1: 💻 MANAJEMEN AKUN PENGGUNA WEB BASED ADMIN */}
            {/* ========================================================================= */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '0.92rem', fontWeight: '900', color: '#38bdf8' }}>
                    💻 1. Manajemen Akun Pengguna Web Based Admin
                  </span>
                  <span style={{ fontSize: '0.70rem', background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', padding: '2px 8px', borderRadius: '6px', fontWeight: '800', border: '1px solid rgba(56, 189, 248, 0.3)' }}>
                    Akses Dashboard, Data Master, Akuntansi & Laporan Web
                  </span>
                </div>
              </div>

              <div style={{ border: '1px solid #334155', borderRadius: '12px', overflowX: 'auto', background: '#0f172a', width: '100%' }}>
                <table style={{ width: '100%', tableLayout: 'fixed', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.72rem' }}>
                  <thead>
                    <tr style={{ background: '#1e293b', borderBottom: '1px solid #334155', color: '#cbd5e1', fontWeight: '800', fontSize: '0.66rem', textTransform: 'uppercase', letterSpacing: '0.02em' }}>
                      <th style={{ padding: '8px 8px', width: '40%' }}>Nama Pengguna (Klik Detail)</th>
                      <th style={{ padding: '8px 8px', width: '35%' }}>Outlet Cabang</th>
                      <th style={{ padding: '8px 4px', textAlign: 'center', width: '12%' }}>Status</th>
                      <th style={{ padding: '8px 4px', textAlign: 'center', width: '13%' }}>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const rawList = getWebAdminList();
                      const filteredWebList = rawList.filter(u => {
                        const q = userSearchQuery.trim().toLowerCase();
                        const matchQuery = !q || (u.name || '').toLowerCase().includes(q) || (u.username || '').toLowerCase().includes(q) || (u.role || '').toLowerCase().includes(q);
                        
                        const matchOutlet = userFilterOutlet === 'Semua Outlet' || !userFilterOutlet || (u.outlet || 'Semua Outlet (Central)') === userFilterOutlet;
                        const matchRole = userFilterRole === 'Semua Peran' || !userFilterRole || (u.role || '').toLowerCase().includes(userFilterRole.toLowerCase());
                        const matchStatus = userFilterStatus === 'Semua Status' || !userFilterStatus || (u.status || 'Aktif') === userFilterStatus;

                        return matchQuery && matchOutlet && matchRole && matchStatus;
                      });

                      if (filteredWebList.length === 0) {
                        return (
                          <tr>
                            <td colSpan="4" style={{ textAlign: 'center', padding: '24px', color: '#94a3b8' }}>
                              🔍 Tidak ada akun Web Admin yang sesuai dengan filter pencarian.
                            </td>
                          </tr>
                        );
                      }

                      return filteredWebList.map(u => {
                        let roleBadgeColor = '#818cf8';
                        let roleBgColor = 'rgba(99,102,241,0.15)';
                        if (u.role === 'Super Admin') { roleBadgeColor = '#c084fc'; roleBgColor = 'rgba(168,85,247,0.2)'; }
                        else if (u.role === 'Owner') { roleBadgeColor = '#fbbf24'; roleBgColor = 'rgba(251,191,36,0.2)'; }
                        else if (u.role === 'Admin') { roleBadgeColor = '#38bdf8'; roleBgColor = 'rgba(56,189,248,0.2)'; }
                        else if (u.role === 'Kasir') { roleBadgeColor = '#34d399'; roleBgColor = 'rgba(52,211,153,0.2)'; }

                        return (
                          <tr key={u.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', color: '#f8fafc' }}>
                            <td style={{ padding: '8px 8px', fontWeight: '800', color: '#f8fafc' }}>
                              <div
                                onClick={() => setPreviewUserAccount(u)}
                                style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer', background: 'rgba(56,189,248,0.08)', padding: '4px 10px', borderRadius: '8px', border: '1px solid rgba(56,189,248,0.2)', transition: 'all 0.15s ease' }}
                                className="hover:border-sky-400 hover:bg-sky-950/40"
                                title="Klik untuk Pratinjau Detail Akses User Ini"
                              >
                                <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: roleBgColor, border: `1px solid ${roleBadgeColor}`, color: roleBadgeColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900', fontSize: '0.75rem', flexShrink: 0 }}>
                                  {u.name ? u.name.charAt(0).toUpperCase() : 'U'}
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                  <span style={{ fontSize: '0.78rem', color: '#ffffff', fontWeight: '900' }}>{u.name}</span>
                                  <span style={{ fontSize: '0.66rem', color: '#38bdf8', fontWeight: '700' }}>🔍 Klik Preview Detail</span>
                                </div>
                              </div>
                            </td>
                            <td style={{ padding: '8px 8px', color: '#cbd5e1', fontSize: '0.72rem' }}>
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', background: 'rgba(255,255,255,0.05)', padding: '3px 8px', borderRadius: '5px', border: '1px solid rgba(255,255,255,0.08)' }}>
                                <Building2 size={12} color="#94a3b8" />
                                <span>{u.outlet || 'Semua Outlet (Central)'}</span>
                              </span>
                            </td>
                            <td style={{ padding: '8px 4px', textAlign: 'center' }}>
                              <button
                                type="button"
                                onClick={() => handleToggleUserStatus(u.id)}
                                style={{
                                  padding: '3px 8px',
                                  borderRadius: '16px',
                                  fontSize: '0.70rem',
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
                            <td style={{ padding: '8px 4px', textAlign: 'center' }}>
                              <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditUserModal(u)}
                                  style={{
                                    padding: '4px 7px',
                                    background: 'rgba(56, 189, 248, 0.15)',
                                    color: '#38bdf8',
                                    border: '1px solid rgba(56, 189, 248, 0.3)',
                                    borderRadius: '6px',
                                    fontSize: '0.70rem',
                                    fontWeight: '800',
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '3px'
                                  }}
                                  title="Edit Akses User Ini"
                                >
                                  <Edit3 size={12} />
                                  <span>Edit</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteUser(u.id)}
                                  style={{
                                    padding: '4px 7px',
                                    background: 'rgba(244, 63, 94, 0.15)',
                                    color: '#fb7185',
                                    border: '1px solid rgba(244, 63, 94, 0.3)',
                                    borderRadius: '6px',
                                    fontSize: '0.70rem',
                                    fontWeight: '800',
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '3px'
                                  }}
                                  title="Hapus Akses User Ini"
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
            </div>

            {/* ========================================================================= */}
            {/* TABEL 2: 📱 OTENTIKASI AKSES AKUN POS MOBILE APK */}
            {/* ========================================================================= */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '0.92rem', fontWeight: '900', color: '#34d399' }}>
                    📱 2. Otentikasi Akses Akun POS Mobile APK (Tablet POS)
                  </span>
                  <span style={{ fontSize: '0.70rem', background: 'rgba(52, 211, 153, 0.15)', color: '#34d399', padding: '2px 8px', borderRadius: '6px', fontWeight: '800', border: '1px solid rgba(52, 211, 153, 0.3)' }}>
                    Akses Transaksi Kasir, Void, Diskon, Shift & Laporan Mobile
                  </span>
                </div>
              </div>

              <div style={{ border: '1px solid #334155', borderRadius: '12px', overflowX: 'auto', background: '#0f172a', width: '100%' }}>
                <table style={{ width: '100%', tableLayout: 'fixed', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.72rem' }}>
                  <thead>
                    <tr style={{ background: '#1e293b', borderBottom: '1px solid #334155', color: '#cbd5e1', fontWeight: '800', fontSize: '0.66rem', textTransform: 'uppercase', letterSpacing: '0.02em' }}>
                      <th style={{ padding: '8px 8px', width: '38%' }}>Nama Pengguna (Klik Detail)</th>
                      <th style={{ padding: '8px 8px', width: '30%' }}>Outlet Cabang</th>
                      <th style={{ padding: '8px 8px', width: '17%' }}>Peran Mobile (Role)</th>
                      <th style={{ padding: '8px 4px', textAlign: 'center', width: '8%' }}>Status</th>
                      <th style={{ padding: '8px 4px', textAlign: 'center', width: '12%' }}>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const filteredMobileList = getMobileList().filter(u => {
                        const q = userSearchQuery.trim().toLowerCase();
                        const matchQuery = !q || (u.name || '').toLowerCase().includes(q) || (u.username || '').toLowerCase().includes(q) || (u.role || '').toLowerCase().includes(q);
                        
                        const matchOutlet = userFilterOutlet === 'Semua Outlet' || !userFilterOutlet || (u.outlet || 'Semua Outlet (Central)') === userFilterOutlet;
                        const matchRole = userFilterRole === 'Semua Peran' || !userFilterRole || (u.role || '').toLowerCase().includes(userFilterRole.toLowerCase());
                        const matchStatus = userFilterStatus === 'Semua Status' || !userFilterStatus || (u.status || 'Aktif') === userFilterStatus;

                        return matchQuery && matchOutlet && matchRole && matchStatus;
                      });

                      if (filteredMobileList.length === 0) {
                        return (
                          <tr>
                            <td colSpan="5" style={{ textAlign: 'center', padding: '24px', color: '#94a3b8' }}>
                              🔍 Tidak ada otentikasi akun Mobile APK yang sesuai dengan filter pencarian.
                            </td>
                          </tr>
                        );
                      }

                      return filteredMobileList.map(u => {
                        let roleBadgeColor = '#34d399';
                        let roleBgColor = 'rgba(52,211,153,0.15)';
                        if (u.role === 'Super Admin') { roleBadgeColor = '#c084fc'; roleBgColor = 'rgba(168,85,247,0.2)'; }
                        else if (u.role === 'Owner') { roleBadgeColor = '#fbbf24'; roleBgColor = 'rgba(251,191,36,0.2)'; }
                        else if (u.role === 'Kepala Cabang' || u.role === 'SPV') { roleBadgeColor = '#fb923c'; roleBgColor = 'rgba(251,146,60,0.2)'; }
                        else if (u.role === 'Logistik') { roleBadgeColor = '#a78bfa'; roleBgColor = 'rgba(167,139,250,0.2)'; }

                        return (
                          <tr key={u.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', color: '#f8fafc' }}>
                            <td style={{ padding: '8px 8px', fontWeight: '800', color: '#f8fafc' }}>
                              <div
                                onClick={() => setPreviewUserAccount(u)}
                                style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer', background: 'rgba(52,211,153,0.08)', padding: '4px 10px', borderRadius: '8px', border: '1px solid rgba(52,211,153,0.2)', transition: 'all 0.15s ease' }}
                                className="hover:border-emerald-400 hover:bg-emerald-950/40"
                                title="Klik untuk Pratinjau Detail Otentikasi User Ini"
                              >
                                <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: roleBgColor, border: `1px solid ${roleBadgeColor}`, color: roleBadgeColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900', fontSize: '0.75rem', flexShrink: 0 }}>
                                  {u.name ? u.name.charAt(0).toUpperCase() : 'U'}
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                  <span style={{ fontSize: '0.78rem', color: '#ffffff', fontWeight: '900' }}>{u.name}</span>
                                  <span style={{ fontSize: '0.66rem', color: '#34d399', fontWeight: '700' }}>🔍 Klik Preview Detail</span>
                                </div>
                              </div>
                            </td>
                            <td style={{ padding: '8px 8px', color: '#cbd5e1', fontSize: '0.72rem' }}>
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', background: 'rgba(255,255,255,0.05)', padding: '3px 8px', borderRadius: '5px', border: '1px solid rgba(255,255,255,0.08)' }}>
                                <Building2 size={12} color="#94a3b8" />
                                <span>{u.outlet || 'Semua Outlet (Central)'}</span>
                              </span>
                            </td>
                            <td style={{ padding: '8px 8px' }}>
                              <span style={{
                                padding: '2px 7px',
                                borderRadius: '6px',
                                fontSize: '0.70rem',
                                fontWeight: '900',
                                background: roleBgColor,
                                color: roleBadgeColor,
                                border: `1px solid ${roleBadgeColor}`
                              }}>
                                {u.role}
                              </span>
                            </td>
                            <td style={{ padding: '8px 4px', textAlign: 'center' }}>
                              <button
                                type="button"
                                onClick={() => handleToggleMobileStatus(u.id)}
                                style={{
                                  padding: '3px 8px',
                                  borderRadius: '16px',
                                  fontSize: '0.70rem',
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
                            <td style={{ padding: '8px 4px', textAlign: 'center' }}>
                              <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditMobileModal(u)}
                                  style={{
                                    padding: '4px 7px',
                                    background: 'rgba(56, 189, 248, 0.15)',
                                    color: '#38bdf8',
                                    border: '1px solid rgba(56, 189, 248, 0.3)',
                                    borderRadius: '6px',
                                    fontSize: '0.70rem',
                                    fontWeight: '800',
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '3px'
                                  }}
                                  title="Edit Otentikasi User Ini"
                                >
                                  <Edit3 size={12} />
                                  <span>Edit</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteMobile(u.id)}
                                  style={{
                                    padding: '4px 7px',
                                    background: 'rgba(244, 63, 94, 0.15)',
                                    color: '#fb7185',
                                    border: '1px solid rgba(244, 63, 94, 0.3)',
                                    borderRadius: '6px',
                                    fontSize: '0.70rem',
                                    fontWeight: '800',
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '3px'
                                  }}
                                  title="Hapus Otentikasi User Ini"
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
            </div>

          {/* PAGINATION CONTROLS */}
          <PaginationControls
            currentPage={currentPage}
            totalPages={Math.ceil((getWebAdminList().length + getMobileList().length) / pageSize) || 1}
            pageSize={pageSize}
            totalItems={getWebAdminList().length + getMobileList().length}
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
                  {(masterData.outlets || []).map((o, idx) => (
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
                    {webAdminRoles.map((rName, idx) => (
                      <option key={idx} value={rName}>{rName}</option>
                    ))}
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

      {/* MODAL TAMBAH / EDIT AKUN POS MOBILE APK (INDEPENDEN) */}
      {showAddMobileModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999
        }}>
          <div className="glass-card animate-fade-in" style={{
            width: '100%', maxWidth: '520px', padding: '24px', background: '#1e293b',
            border: '1px solid rgba(52,211,153,0.3)', borderRadius: '20px', maxHeight: '90vh', overflowY: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', borderBottom: '1px solid #334155', paddingBottom: '14px' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: '800', color: '#ffffff', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '1.3rem' }}>📱</span>
                <span>{editingMobileId ? '✏️ Edit Akun POS Mobile APK' : '➕ Tambah Akun POS Mobile APK'}</span>
              </h3>
              <button type="button" onClick={() => setShowAddMobileModal(false)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveMobile} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

              {/* NAMA */}
              <div>
                <label style={{ fontSize: '0.80rem', fontWeight: '800', color: '#cbd5e1', display: 'block', marginBottom: '6px' }}>Nama Lengkap Pengguna:</label>
                <input type="text" required placeholder="Contoh: Budi Kasir"
                  value={newMobileName} onChange={e => setNewMobileName(e.target.value)}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #334155', background: '#0f172a', color: '#ffffff', fontSize: '0.88rem', boxSizing: 'border-box' }} />
              </div>

              {/* OUTLET */}
              <div>
                <label style={{ fontSize: '0.80rem', fontWeight: '800', color: '#cbd5e1', display: 'block', marginBottom: '6px' }}>Outlet Cabang:</label>
                <select value={newMobileOutlet} onChange={e => setNewMobileOutlet(e.target.value)}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #334155', background: '#0f172a', color: '#ffffff', fontSize: '0.88rem', cursor: 'pointer' }}>
                  <option value="Semua Outlet (Central)">Semua Outlet (Central / Pusat)</option>
                  {(masterData.outlets || []).map((o, idx) => (
                    <option key={idx} value={o.name}>{o.name}</option>
                  ))}
                </select>
              </div>

              {/* USERNAME & PASSWORD LOGIN MOBILE */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.80rem', fontWeight: '800', color: '#cbd5e1', display: 'block', marginBottom: '6px' }}>Username Mobile:</label>
                  <input type="text" required placeholder="budi_kasir"
                    value={newMobileUsername} onChange={e => setNewMobileUsername(e.target.value)}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #334155', background: '#0f172a', color: '#38bdf8', fontFamily: 'monospace', fontSize: '0.88rem', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.80rem', fontWeight: '800', color: '#cbd5e1', display: 'block', marginBottom: '6px' }}>Password Login Mobile:</label>
                  <input type="text" required placeholder="123"
                    value={newMobilePwd} onChange={e => setNewMobilePwd(e.target.value)}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid rgba(52,211,153,0.4)', background: '#0f172a', color: '#34d399', fontFamily: 'monospace', fontWeight: '800', fontSize: '0.88rem', boxSizing: 'border-box' }} />
                </div>
              </div>

              {/* PERAN & STATUS */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.80rem', fontWeight: '800', color: '#cbd5e1', display: 'block', marginBottom: '6px' }}>Peran Mobile (Role):</label>
                  <select value={newMobileRole2} onChange={e => setNewMobileRole2(e.target.value)}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #334155', background: '#0f172a', color: '#ffffff', fontSize: '0.88rem', cursor: 'pointer' }}>
                    {mobileRoles.map((rName, idx) => (
                      <option key={idx} value={rName}>{rName}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.80rem', fontWeight: '800', color: '#cbd5e1', display: 'block', marginBottom: '6px' }}>Status Akun:</label>
                  <select value={newMobileStatus2} onChange={e => setNewMobileStatus2(e.target.value)}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #334155', background: '#0f172a', color: '#ffffff', fontSize: '0.88rem', cursor: 'pointer' }}>
                    <option value="Aktif">🟢 Aktif</option>
                    <option value="Inaktif">🔴 Inaktif</option>
                  </select>
                </div>
              </div>

              {/* PASSWORD LAPORAN */}
              <div style={{ background: '#0f172a', padding: '14px', borderRadius: '12px', border: '1px solid rgba(250,204,21,0.2)' }}>
                <label style={{ fontSize: '0.80rem', fontWeight: '800', color: '#cbd5e1', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', cursor: 'pointer' }}>
                  <input type="checkbox" checked={newMobileCanReport} onChange={e => setNewMobileCanReport(e.target.checked)}
                    style={{ width: '16px', height: '16px', accentColor: '#facc15' }} />
                  <span>🔒 Boleh Akses Laporan Mobile APK</span>
                </label>
                {newMobileCanReport && (
                  <div>
                    <label style={{ fontSize: '0.76rem', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Password Laporan Mobile:</label>
                    <input type="text" placeholder="8888"
                      value={newMobileReportPwd2} onChange={e => setNewMobileReportPwd2(e.target.value)}
                      style={{ width: '100%', padding: '8px 14px', borderRadius: '8px', border: '1px solid rgba(250,204,21,0.4)', background: '#1e293b', color: '#facc15', fontFamily: 'monospace', fontWeight: '800', fontSize: '0.88rem', boxSizing: 'border-box' }} />
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '4px' }}>
                <button type="button" onClick={() => setShowAddMobileModal(false)}
                  style={{ padding: '10px 18px', background: '#334155', border: 'none', color: '#cbd5e1', borderRadius: '10px', fontWeight: '700', fontSize: '0.85rem', cursor: 'pointer' }}>
                  Batal
                </button>
                <button type="submit"
                  style={{ padding: '10px 22px', borderRadius: '10px', fontWeight: '800', fontSize: '0.85rem', background: 'linear-gradient(135deg,#059669,#047857)', border: 'none', color: '#fff', cursor: 'pointer' }}>
                  {editingMobileId ? 'Simpan Perubahan' : '➕ Tambahkan Akun Mobile'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* ========================================================================= */}
      {/* MODAL PREVIEW DETAIL AKUN PENGGUNA (TAMPIL SAAT NAMA DIKLIK)             */}
      {/* ========================================================================= */}
      {previewUserAccount && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div className="glass-card animate-fade-in" style={{ width: '100%', maxWidth: '480px', padding: '24px', background: '#1e293b', borderRadius: '20px', border: '1px solid #334155', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.7)' }}>
            
            {/* HEADER */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid #334155', paddingBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: 'rgba(56,189,248,0.2)', border: '2px solid #38bdf8', color: '#38bdf8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900', fontSize: '1.2rem' }}>
                  {previewUserAccount.name ? previewUserAccount.name.charAt(0).toUpperCase() : 'U'}
                </div>
                <div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: '900', color: '#ffffff', margin: 0 }}>
                    {previewUserAccount.name}
                  </h3>
                  <span style={{ fontSize: '0.74rem', color: '#94a3b8' }}>
                    📍 {previewUserAccount.outlet || 'Semua Outlet (Central)'}
                  </span>
                </div>
              </div>
              <button onClick={() => setPreviewUserAccount(null)} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#ffffff', padding: '6px', borderRadius: '8px', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            {/* DETAIL CONTENT */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '0.82rem' }}>
              
              {/* STATUS AKUN */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#0f172a', padding: '10px 14px', borderRadius: '10px', border: '1px solid #334155' }}>
                <span style={{ color: '#cbd5e1', fontWeight: '700' }}>Status Operasional:</span>
                <span style={{ fontWeight: '900', color: previewUserAccount.status === 'Aktif' ? '#34d399' : '#fb7185' }}>
                  {previewUserAccount.status === 'Aktif' ? '🟢 Aktif' : '🔴 Inaktif'}
                </span>
              </div>

              {/* SECTION 1: WEB ADMIN ACCESS */}
              <div style={{ background: '#0f172a', padding: '14px', borderRadius: '14px', border: '1px solid rgba(56,189,248,0.3)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ fontWeight: '900', color: '#38bdf8', fontSize: '0.86rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  💻 Detail Akun Web Based Admin
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#94a3b8' }}>Username Web:</span>
                  <span style={{ fontWeight: '800', color: '#ffffff', fontFamily: 'monospace' }}>@{previewUserAccount.username || '-'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#94a3b8' }}>Password Web:</span>
                  <span style={{ fontWeight: '800', color: '#34d399', fontFamily: 'monospace' }}>{previewUserAccount.password || '••••'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#94a3b8' }}>Peran Web (Role):</span>
                  <span style={{ fontWeight: '900', color: '#38bdf8' }}>{previewUserAccount.role || 'Kasir'}</span>
                </div>
              </div>

              {/* SECTION 2: MOBILE APK ACCESS */}
              <div style={{ background: '#0f172a', padding: '14px', borderRadius: '14px', border: '1px solid rgba(52,211,153,0.3)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ fontWeight: '900', color: '#34d399', fontSize: '0.86rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  📱 Detail Otentikasi POS Mobile APK (Tablet)
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#94a3b8' }}>Akses Login Mobile:</span>
                  <span style={{ fontWeight: '800', color: previewUserAccount.canLoginMobile !== false ? '#34d399' : '#fb7185' }}>
                    {previewUserAccount.canLoginMobile !== false ? '📱 ✅ Diberikan' : '📱 ❌ Dibatasi'}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#94a3b8' }}>Password PIN Mobile:</span>
                  <span style={{ fontWeight: '800', color: '#38bdf8', fontFamily: 'monospace' }}>
                    {previewUserAccount.mobileLoginPassword || previewUserAccount.password || '123'}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#94a3b8' }}>Akses Laporan Mobile:</span>
                  <span style={{ fontWeight: '800', color: previewUserAccount.canAccessMobileReports !== false ? '#34d399' : '#fb7185' }}>
                    {previewUserAccount.canAccessMobileReports !== false ? '🔒 ✅ Diberikan' : '🔒 ❌ Dibatasi'}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#94a3b8' }}>Password Laporan Mobile:</span>
                  <span style={{ fontWeight: '800', color: '#facc15', fontFamily: 'monospace' }}>
                    {previewUserAccount.mobileReportPassword || '8888'}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#94a3b8' }}>Peran Mobile:</span>
                  <span style={{ fontWeight: '900', color: '#a78bfa' }}>{previewUserAccount.role || 'Kasir'}</span>
                </div>
              </div>

            </div>

            {/* FOOTER ACTION */}
            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
              <button
                type="button"
                onClick={() => {
                  const acc = previewUserAccount;
                  setPreviewUserAccount(null);
                  handleOpenEditUserModal(acc);
                }}
                style={{
                  flex: 1,
                  justifyContent: 'center',
                  height: '42px',
                  fontSize: '0.84rem',
                  fontWeight: '900',
                  background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <Edit3 size={16} />
                <span>Edit User Ini</span>
              </button>
              <button
                type="button"
                onClick={() => setPreviewUserAccount(null)}
                style={{
                  flex: 1,
                  justifyContent: 'center',
                  height: '42px',
                  fontSize: '0.84rem',
                  fontWeight: '800',
                  background: '#334155',
                  color: '#cbd5e1',
                  border: 'none',
                  borderRadius: '10px',
                  cursor: 'pointer'
                }}
              >
                Tutup
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
