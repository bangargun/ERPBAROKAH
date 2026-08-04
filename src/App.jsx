import React, { useState, useEffect, useRef } from 'react';
import AdminLayout from './components/admin/AdminLayout';
import FinancialOverview from './components/admin/FinancialOverview';
import MasterDataManagement from './components/admin/MasterDataManagement';
import SalesTransactionsPage from './components/admin/SalesTransactionsPage';
import LoyaltyProgramPage from './components/admin/LoyaltyProgramPage';
import CostsManagement from './components/admin/CostsManagement';

import StockManagement from './components/admin/StockManagement';
import ApprovalCenter from './components/admin/ApprovalCenter';
import FinancialReportsFull from './components/admin/FinancialReportsFull';
import TermsAndPolicies from './components/admin/TermsAndPolicies';
import SystemSettings from './components/admin/SystemSettings';
import UserRightsSettings from './components/admin/UserRightsSettings';
import ManualFinancialEntryPage from './components/admin/ManualFinancialEntryPage';
import ActivityLogPage from './components/admin/ActivityLogPage';
import TransactionHistoryPage from './components/admin/TransactionHistoryPage';
import SopManagementPage from './components/admin/SopManagementPage';
import PrinterThermalSettingsPage from './components/admin/PrinterThermalSettingsPage';
import LoginPage from './components/admin/LoginPage';

import AndroidPosRegister from './components/mobile/AndroidPosRegister';
import CustomerSelfRegistrationPage from './components/mobile/CustomerSelfRegistrationPage';

import { initialMasterData } from './data/initialMasterData';
import { checkWebPermission } from './utils/permissionUtils';
import { Lock } from 'lucide-react';

export default function App() {
  // Auto-detect environment platform:
  // True if running inside Capacitor Android APK
  const isCapacitorNative = typeof window !== 'undefined' && !!window.Capacitor?.isNativePlatform?.();

  // Check if current URL is Customer Self Registration route
  const isSelfRegPath = typeof window !== 'undefined' && (
    window.location.pathname.includes('register-customer') ||
    window.location.search.includes('register_customer') ||
    window.location.hash.includes('register-customer')
  );

  // User Authentication State (null = belum login, wajib tampilkan LoginPage)
  const [userSession, setUserSession] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('mris_user_session');
      if (saved) {
        try { return JSON.parse(saved); } catch (e) {}
      }
    }
    return null;
  });

  // App View Mode State: 'admin' for Web Browser, 'mobile' for Capacitor Android APK
  const [viewMode, setViewMode] = useState(() => {
    if (isCapacitorNative) return 'mobile';
    return 'admin';
  });

  // Theme Mode State: 'dark' | 'light' | 'warm_minimalist' (Persisted in localStorage)
  const [themeMode, setThemeModeState] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('mris_web_theme');
      if (saved === 'light' || saved === 'dark' || saved === 'warm_minimalist') return saved;
    }
    return 'dark';
  });

  // Apply data-theme attribute to root element so CSS variables cascade globally to ALL components
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', themeMode);
    document.body.setAttribute('data-theme', themeMode);
  }, [themeMode]);

  const setThemeMode = (mode) => {
    setThemeModeState(mode);
    try { localStorage.setItem('mris_web_theme', mode); } catch (e) {}
  };

  const toggleThemeMode = () => {
    setThemeModeState(prev => {
      const next = prev === 'dark' ? 'warm_minimalist' : (prev === 'warm_minimalist' ? 'light' : 'dark');
      try { localStorage.setItem('mris_web_theme', next); } catch (e) {}
      return next;
    });
  };

  // Handle login success dari LoginPage
  const handleLoginSuccess = (session, targetMode) => {
    const sessionWithTime = { ...session, loggedInAt: new Date().toISOString() };
    localStorage.setItem('mris_user_session', JSON.stringify(sessionWithTime));
    setUserSession(sessionWithTime);
    setViewMode(targetMode || (isCapacitorNative ? 'mobile' : 'admin'));
  };

  const handleLogout = () => {
    localStorage.removeItem('mris_user_session');
    setUserSession(null);
  };

  // 10-Minute Inactivity Auto-Logout System (600,000 ms)
  const lastActivityRef = useRef(Date.now());
  useEffect(() => {
    if (!userSession || isCapacitorNative) return;

    const resetActivityTimer = () => {
      lastActivityRef.current = Date.now();
    };

    const activityEvents = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart'];
    activityEvents.forEach(evt => window.addEventListener(evt, resetActivityTimer, { passive: true }));

    const idleCheckInterval = setInterval(() => {
      const elapsedMs = Date.now() - lastActivityRef.current;
      // 10 Menit = 600,000 ms
      if (elapsedMs >= 600000) {
        localStorage.removeItem('mris_user_session');
        setUserSession(null);
      }
    }, 10000);

    return () => {
      activityEvents.forEach(evt => window.removeEventListener(evt, resetActivityTimer));
      clearInterval(idleCheckInterval);
    };
  }, [userSession, isCapacitorNative]);

  // Admin Active Menu Tab
  const [adminTab, setAdminTab] = useState('dashboard');

  // Selected Branch Filter
  const [selectedBranch, setSelectedBranch] = useState(null);

  // Master Data State initialized with clean dataset and multi-key fallback protection
  const [masterData, setMasterData] = useState(() => {
    try {
      const saved = localStorage.getItem('mris_master_data');
      let baseData = { ...initialMasterData };
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          baseData = { ...baseData, ...parsed };
        }
      }
      // Restore & preserve user accounts & permission matrices from standalone keys
      const savedWeb = localStorage.getItem('MRIS_WEBADMINACCOUNTS');
      if (savedWeb) {
        try {
          const parsedWeb = JSON.parse(savedWeb);
          if (Array.isArray(parsedWeb) && parsedWeb.length > 0) baseData.webAdminAccounts = parsedWeb;
        } catch (e) {}
      }
      const savedMobile = localStorage.getItem('MRIS_MOBILEACCOUNTS');
      if (savedMobile) {
        try {
          const parsedMobile = JSON.parse(savedMobile);
          if (Array.isArray(parsedMobile) && parsedMobile.length > 0) baseData.mobileAccounts = parsedMobile;
        } catch (e) {}
      }
      const savedPerm = localStorage.getItem('MRIS_PERMISSIONMATRIX');
      if (savedPerm) {
        try {
          const parsedPerm = JSON.parse(savedPerm);
          if (Array.isArray(parsedPerm) && parsedPerm.length > 0) baseData.permissionMatrix = parsedPerm;
        } catch (e) {}
      }
      const savedMobPerm = localStorage.getItem('MRIS_MOBILEPERMISSIONMATRIX');
      if (savedMobPerm) {
        try {
          const parsedMobPerm = JSON.parse(savedMobPerm);
          if (Array.isArray(parsedMobPerm) && parsedMobPerm.length > 0) baseData.mobilePermissionMatrix = parsedMobPerm;
        } catch (e) {}
      }
      return baseData;
    } catch (e) {
      console.error("Master data parse error:", e);
    }
    return initialMasterData;
  });

  const getApiUrl = (pathStr) => `https://mris-api.barokahgroupindonesia.tech${pathStr}`;

  // Ref untuk track timestamp remote dan mutasi lokal
  const lastRemoteTsRef = useRef(0);
  const lastLocalMutationTsRef = useRef(0);

  const masterDataRef = useRef(masterData);
  useEffect(() => { masterDataRef.current = masterData; }, [masterData]);

  const updateMasterData = (updater) => {
    const prev = masterDataRef.current;
    const next = typeof updater === 'function' ? updater(prev) : updater;
    const ts = Date.now();
    const updatedWithTs = { ...next, _lastUpdated: ts };

    lastLocalMutationTsRef.current = ts;
    setMasterData(updatedWithTs);

    try {
      localStorage.setItem('mris_master_data', JSON.stringify(updatedWithTs));
      if (Array.isArray(updatedWithTs.webAdminAccounts) && updatedWithTs.webAdminAccounts.length > 0) {
        localStorage.setItem('MRIS_WEBADMINACCOUNTS', JSON.stringify(updatedWithTs.webAdminAccounts));
      }
      if (Array.isArray(updatedWithTs.mobileAccounts) && updatedWithTs.mobileAccounts.length > 0) {
        localStorage.setItem('MRIS_MOBILEACCOUNTS', JSON.stringify(updatedWithTs.mobileAccounts));
      }
      if (Array.isArray(updatedWithTs.permissionMatrix) && updatedWithTs.permissionMatrix.length > 0) {
        localStorage.setItem('MRIS_PERMISSIONMATRIX', JSON.stringify(updatedWithTs.permissionMatrix));
      }
      if (Array.isArray(updatedWithTs.mobilePermissionMatrix) && updatedWithTs.mobilePermissionMatrix.length > 0) {
        localStorage.setItem('MRIS_MOBILEPERMISSIONMATRIX', JSON.stringify(updatedWithTs.mobilePermissionMatrix));
      }
    } catch (e) {}

    fetch(getApiUrl('/api/master-data'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedWithTs)
    }).catch(() => {});
  };

  // Live polling dari server VPS
  useEffect(() => {
    const fetchLatestFromServer = () => {
      const msSinceLastMutation = Date.now() - lastLocalMutationTsRef.current;
      if (msSinceLastMutation < 15000) return;

      fetch(getApiUrl('/api/master-data'), { cache: 'no-store' })
        .then(res => res.ok ? res.json() : null)
        .then(serverData => {
          if (serverData && typeof serverData === 'object' && Array.isArray(serverData.outlets)) {
            const remoteTs = serverData._lastUpdated || 0;

            setMasterData(prev => {
              const localTs = prev._lastUpdated || 0;

              const mergedWeb = (Array.isArray(serverData.webAdminAccounts) && serverData.webAdminAccounts.length > 0)
                ? serverData.webAdminAccounts
                : (prev.webAdminAccounts || initialMasterData.webAdminAccounts);
              const mergedMobile = (Array.isArray(serverData.mobileAccounts) && serverData.mobileAccounts.length > 0)
                ? serverData.mobileAccounts
                : (prev.mobileAccounts || initialMasterData.mobileAccounts);
              const mergedPerm = (Array.isArray(serverData.permissionMatrix) && serverData.permissionMatrix.length > 0)
                ? serverData.permissionMatrix
                : (prev.permissionMatrix || initialMasterData.permissionMatrix);
              const mergedMobPerm = (Array.isArray(serverData.mobilePermissionMatrix) && serverData.mobilePermissionMatrix.length > 0)
                ? serverData.mobilePermissionMatrix
                : (prev.mobilePermissionMatrix || initialMasterData.mobilePermissionMatrix);

              const mergeReportsById = (prevList = [], serverList = []) => {
                const map = new Map();
                (prevList || []).forEach(item => {
                  if (item && (item.id || item.report_no)) map.set(String(item.id || item.report_no), item);
                });
                (serverList || []).forEach(item => {
                  if (item && (item.id || item.report_no)) map.set(String(item.id || item.report_no), item);
                });
                return Array.from(map.values());
              };

              const mergedApprovedFinance = mergeReportsById(prev.approvedFinanceDaily, serverData.approvedFinanceDaily);
              const mergedManualEntry = mergeReportsById(prev.manualEntryRecords, serverData.manualEntryRecords);
              const mergedShiftClosings = mergeReportsById(prev.shiftClosings || prev.closedShifts, serverData.shiftClosings || serverData.closedShifts);
              const mergedSalesTx = mergeReportsById(prev.salesTransactions || prev.transactions, serverData.salesTransactions || serverData.transactions);

              if (localTs > remoteTs && (prev.mobileAccounts?.length > 0 && prev.webAdminAccounts?.length > 0)) {
                return prev;
              }

              const prevStr = JSON.stringify(prev);
              const serverStr = JSON.stringify(serverData);
              if (prevStr === serverStr) return prev;

              lastRemoteTsRef.current = remoteTs;
              return {
                ...initialMasterData,
                ...prev,
                ...serverData,
                approvedFinanceDaily: mergedApprovedFinance,
                manualEntryRecords: mergedManualEntry,
                shiftClosings: mergedShiftClosings,
                salesTransactions: mergedSalesTx,
                webAdminAccounts: mergedWeb,
                mobileAccounts: mergedMobile,
                permissionMatrix: mergedPerm,
                mobilePermissionMatrix: mergedMobPerm,
                _lastUpdated: Math.max(localTs, remoteTs)
              };
            });
          }
        })
        .catch(() => {});
    };

    fetchLatestFromServer();
    const livePollTimer = setInterval(fetchLatestFromServer, 5000);
    return () => clearInterval(livePollTimer);
  }, []);

  // Compute Performa Key Metrics
  const filteredProducts = selectedBranch
    ? (masterData.products || []).filter(p => p.outlet_id === selectedBranch)
    : (masterData.products || []);

  const branchSalesTx = selectedBranch
    ? (masterData.salesTransactions || []).filter(t => Number(t.outlet_id) === Number(selectedBranch))
    : (masterData.salesTransactions || []);

  const branchDailyApproved = selectedBranch
    ? (masterData.approvedFinanceDaily || []).filter(f => Number(f.outlet_id) === Number(selectedBranch))
    : (masterData.approvedFinanceDaily || []);

  const totalSalesPos = branchSalesTx.reduce((sum, t) => sum + (t.amount || 0), 0);
  const totalDailyNetSales = branchDailyApproved.reduce((sum, f) => sum + (f.net_sales || 0), 0);
  const totalIncome = Math.max(totalSalesPos, totalDailyNetSales);
  const totalExpense = branchDailyApproved.reduce((sum, f) => sum + (f.total_expense || 0), 0);
  const netProfit = totalIncome - totalExpense;
  const profitMargin = totalIncome > 0 ? ((netProfit / totalIncome) * 100).toFixed(1) : 0;

  const stats = {
    totalIncome,
    totalExpense,
    netProfit,
    profitMargin,
    pendingApprovals: (masterData.approvedLogistics || []).filter(l => (selectedBranch ? Number(l.outlet_id) === Number(selectedBranch) : true) && (l.status === 'Pending' || l.status === 'ditunda')).length
      + (masterData.approvedFinanceDaily || []).filter(f => (selectedBranch ? Number(f.outlet_id) === Number(selectedBranch) : true) && (f.status === 'Pending' || f.status === 'ditunda')).length,
    outletsStats: (masterData.outlets || []).filter(o => selectedBranch ? Number(o.id) === Number(selectedBranch) : true).map(o => {
      const posRev = (masterData.salesTransactions || []).filter(t => Number(t.outlet_id) === Number(o.id)).reduce((sum, t) => sum + (t.amount || 0), 0);
      const dailyRev = (masterData.approvedFinanceDaily || []).filter(f => Number(f.outlet_id) === Number(o.id)).reduce((sum, f) => sum + (f.net_sales || 0), 0);
      const inc = Math.max(posRev, dailyRev);
      const exp = (masterData.approvedFinanceDaily || []).filter(f => Number(f.outlet_id) === Number(o.id)).reduce((sum, f) => sum + (f.total_expense || 0), 0);
      return { id: o.id, name: o.name, code: o.code, color: o.color, income: inc, expense: exp, netProfit: inc - exp };
    })
  };

  const chartData = (() => {
    const dateMap = {};
    branchSalesTx.forEach(t => {
      if (t.date) {
        if (!dateMap[t.date]) dateMap[t.date] = { date: t.date, income: 0, expense: 0 };
        dateMap[t.date].income += Number(t.amount || 0);
      }
    });
    return Object.values(dateMap).sort((a, b) => new Date(a.date) - new Date(b.date));
  })();

  const recentTransactions = branchSalesTx.map(t => ({
    id: `tx-${t.id}`,
    date: t.date || new Date().toISOString().split('T')[0],
    branch_name: (masterData.outlets || []).find(o => Number(o.id) === Number(t.outlet_id))?.name || 'Outlet Restoran',
    type: 'income',
    category: t.category || 'Penjualan POS',
    description: t.notes || 'Transaksi Penjualan Kasir',
    payment_method: t.payment_method || 'Cash',
    amount: t.amount || 0,
    status: 'approved'
  })).sort((a, b) => new Date(b.date) - new Date(a.date));

  // ==========================================
  // RENDER CONTROL: SEPARATE WEB ADMIN VS POS MOBILE
  // ==========================================

  // 1. Native Capacitor Android Tablet APK Mode -> Strictly Render POS Kasir Mobile
  if (isCapacitorNative || viewMode === 'mobile') {
    return (
      <AndroidPosRegister
        masterData={masterData}
        setMasterData={updateMasterData}
        selectedBranch={selectedBranch}
        setSelectedBranch={setSelectedBranch}
        onShiftCloseClick={() => {}}
        onSwitchToAdmin={() => {}}
        onLogout={handleLogout}
      />
    );
  }

  // 2. Customer QR Self Registration Page
  if (isSelfRegPath || viewMode === 'register_customer') {
    return (
      <CustomerSelfRegistrationPage
        masterData={masterData}
        setMasterData={updateMasterData}
        onBackToPos={() => setViewMode('admin')}
      />
    );
  }

  // 3. Web Admin Browser View: MANDATORY LOGIN SCREEN FIRST if no session!
  if (!userSession) {
    return (
      <LoginPage
        onLoginSuccess={handleLoginSuccess}
        masterData={masterData}
        themeMode={themeMode}
      />
    );
  }


  // 4. Web Admin Dashboard Desktop View
  const TAB_PERM_MAP = {
    'dashboard': 'dashboard',
    'data': 'masterData',
    'sales': 'reports',
    'transaction_history': 'reports',
    'loyalty': 'masterData',
    'costs': 'costs',
    'stock': 'stock',
    'reports': 'reports',
    'sop': 'policies',
    'settings': 'settings',
    'activity_log': 'settings'
  };

  const isCurrentTabAllowed = checkWebPermission(
    userSession?.role,
    TAB_PERM_MAP[adminTab] || 'dashboard',
    masterData?.permissionMatrix
  );

  return (
    <AdminLayout
      activeTab={adminTab}
      setActiveTab={setAdminTab}
      selectedBranch={selectedBranch}
      setSelectedBranch={setSelectedBranch}
      outlets={masterData.outlets}
      pendingCount={stats.pendingApprovals}
      onLogout={handleLogout}
      userSession={userSession}
      masterData={masterData}
      themeMode={themeMode}
      toggleThemeMode={toggleThemeMode}
      setThemeMode={setThemeMode}
    >
      {!isCurrentTabAllowed ? (
        <div style={{ padding: '60px 24px', textAlign: 'center', color: themeMode === 'warm_minimalist' ? '#2d2d2d' : '#f8fafc', background: themeMode === 'warm_minimalist' ? '#f9f6f1' : '#111625', borderRadius: '16px', border: `1px solid rgba(239, 68, 68, 0.2)`, margin: '24px' }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
            <Lock size={32} color="#ef4444" />
          </div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '800', marginBottom: '8px' }}>Akses Ditolak / Dibatasi</h2>
          <p style={{ fontSize: '0.88rem', color: themeMode === 'warm_minimalist' ? '#6b5e4e' : '#94a3b8', maxWidth: '520px', margin: '0 auto 20px auto', lineHeight: '1.5' }}>
            Peran Anda (<strong>{userSession?.role || 'Pengguna'}</strong>) tidak memiliki wewenang untuk membuka modul halaman ini. Silakan hubungi Super Admin untuk penyesuaian hak akses pada Matriks Peran.
          </p>
        </div>
      ) : (
        <>
          {adminTab === 'dashboard' && (
            <FinancialOverview
              stats={stats}
              chartData={chartData}
              recentTransactions={recentTransactions}
              outlets={masterData.outlets}
              selectedBranch={selectedBranch}
              masterData={masterData}
              themeMode={themeMode}
            />
          )}

          {adminTab === 'data' && (
            <MasterDataManagement
              masterData={masterData}
              setMasterData={updateMasterData}
              selectedBranch={selectedBranch}
              themeMode={themeMode}
            />
          )}

          {adminTab === 'sales' && (
            <SalesTransactionsPage
              masterData={masterData}
              setMasterData={updateMasterData}
              selectedBranch={selectedBranch}
              themeMode={themeMode}
            />
          )}

          {adminTab === 'stock' && (
            <StockManagement
              masterData={masterData}
              setMasterData={updateMasterData}
              selectedBranch={selectedBranch}
              themeMode={themeMode}
            />
          )}

          {adminTab === 'daily_approval' && (
            <ApprovalCenter
              masterData={masterData}
              setMasterData={updateMasterData}
              selectedBranch={selectedBranch}
              themeMode={themeMode}
            />
          )}

          {adminTab === 'reports' && (
            <FinancialReportsFull
              masterData={masterData}
              selectedBranch={selectedBranch}
              themeMode={themeMode}
            />
          )}

          {adminTab === 'printer_settings' && (
            <PrinterThermalSettingsPage
              masterData={masterData}
              setMasterData={updateMasterData}
              themeMode={themeMode}
            />
          )}

          {adminTab === 'sop' && (
            <SopManagementPage
              masterData={masterData}
              setMasterData={updateMasterData}
              selectedBranch={selectedBranch}
              themeMode={themeMode}
            />
          )}

          {adminTab === 'loyalty' && (
            <LoyaltyProgramPage
              masterData={masterData}
              setMasterData={updateMasterData}
              themeMode={themeMode}
            />
          )}

          {adminTab === 'settings' && (
            <UserRightsSettings
              masterData={masterData}
              setMasterData={updateMasterData}
              themeMode={themeMode}
            />
          )}

          {adminTab === 'activity_log' && (
            <ActivityLogPage
              masterData={masterData}
              setMasterData={updateMasterData}
              selectedBranch={selectedBranch}
              themeMode={themeMode}
            />
          )}
        </>
      )}
    </AdminLayout>
  );
}


