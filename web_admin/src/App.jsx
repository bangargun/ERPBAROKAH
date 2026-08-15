import React, { useState, useEffect, useRef } from 'react';
import AdminLayout from './components/admin/AdminLayout';
import FinancialOverview from './components/admin/FinancialOverview';
import MasterDataManagement from './components/admin/MasterDataManagement';
import SalesTransactionsPage from './components/admin/SalesTransactionsPage';
import LoyaltyProgramPage from './components/admin/LoyaltyProgramPage';
import CostsManagement from './components/admin/CostsManagement';

import StockManagement from './components/admin/StockManagement';
import ApprovalCenter from './components/admin/ApprovalCenter';
import ManualReportUpdatePage from './components/admin/ManualReportUpdatePage';
import IngredientPriceComparisonPage from './components/admin/IngredientPriceComparisonPage';
import IngredientPriceTrendPage from './components/admin/IngredientPriceTrendPage';
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

import ServerLoadingOverlay from './components/common/ServerLoadingOverlay';

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

  // Global Server Loading Overlay State ("mohon tunggu sebentar ya")
  const [isServerLoading, setIsServerLoading] = useState(false);
  const [serverLoadingMessage, setServerLoadingMessage] = useState("mohon tunggu sebentar ya");
  const [serverLoadingSubMessage, setServerLoadingSubMessage] = useState("Sedang menghubungkan & memuat data ke server...");

  useEffect(() => {
    // Expose global window helper methods
    window.showServerLoading = (msg = "mohon tunggu sebentar ya", subMsg = "Sedang menghubungkan & memuat data ke server...") => {
      setServerLoadingMessage(msg);
      setServerLoadingSubMessage(subMsg);
      setIsServerLoading(true);
    };
    window.hideServerLoading = () => {
      setIsServerLoading(false);
    };

    const handleShowLoading = (e) => {
      const { message, subMessage } = e.detail || {};
      setServerLoadingMessage(message || "mohon tunggu sebentar ya");
      setServerLoadingSubMessage(subMessage || "Sedang menghubungkan & memuat data ke server...");
      setIsServerLoading(true);
    };
    const handleHideLoading = () => setIsServerLoading(false);

    window.addEventListener('show-server-loading', handleShowLoading);
    window.addEventListener('hide-server-loading', handleHideLoading);

    return () => {
      window.removeEventListener('show-server-loading', handleShowLoading);
      window.removeEventListener('hide-server-loading', handleHideLoading);
    };
  }, []);

  // Check if current build target is Leader App
  const isLeaderTarget = typeof window !== 'undefined' && (
    import.meta.env.VITE_APP_TARGET === 'leader' ||
    window.__APP_TARGET__ === 'leader' ||
    localStorage.getItem('mris_app_target') === 'leader' ||
    window.location.search.includes('target=leader') ||
    window.location.hash.includes('target=leader')
  );

  // App View Mode State: 'admin' for Web Browser & Leader App, 'mobile' for POS Kasir Android APK
  const [viewMode, setViewMode] = useState(() => {
    if (isLeaderTarget) return 'admin';
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

    if (typeof window !== 'undefined' && window.showServerLoading) {
      window.showServerLoading("mohon tunggu sebentar ya", "Sedang mengirim & menyimpan data ke server...");
    }

    fetch(getApiUrl('/api/master-data'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedWithTs)
    }).catch(() => {})
      .finally(() => {
        if (typeof window !== 'undefined' && window.hideServerLoading) {
          setTimeout(() => window.hideServerLoading(), 400);
        }
      });
  };

  // Live polling dari server VPS
  useEffect(() => {
    const fetchLatestFromServer = () => {
      // Guard: jangan fetch saat admin baru saja mutasi data (5 detik jeda untuk menghindari race condition)
      const msSinceLastMutation = Date.now() - lastLocalMutationTsRef.current;
      if (msSinceLastMutation < 5000) return;

      fetch(getApiUrl('/api/master-data'), { cache: 'no-store' })
        .then(res => res.ok ? res.json() : null)
        .then(serverData => {
          if (serverData && typeof serverData === 'object' && Array.isArray(serverData.outlets)) {
            const remoteTs = serverData._lastUpdated || 0;

            setMasterData(prev => {
              const localTs = prev._lastUpdated || 0;

              // Track user accounts currently active in local state so tombstones never purge them
              const activeUsernamesInPrev = new Set([
                ...(prev.webAdminAccounts || []),
                ...(prev.mobileAccounts || [])
              ].map(u => String(u?.username || u?.name || '').toLowerCase().trim()).filter(Boolean));

              const activeUserIdsInPrev = new Set([
                ...(prev.webAdminAccounts || []),
                ...(prev.mobileAccounts || [])
              ].map(u => String(u?.id)).filter(Boolean));

              const deletedUserIdsSet = new Set([
                ...(prev.deletedUserIds || []).filter(id => !activeUserIdsInPrev.has(String(id))),
                ...(serverData.deletedUserIds || []).filter(id => !activeUserIdsInPrev.has(String(id)))
              ].map(x => String(x)));

              const deletedUsernamesSet = new Set([
                ...(prev.deletedUsernames || []).filter(u => !activeUsernamesInPrev.has(String(u).toLowerCase().trim())),
                ...(serverData.deletedUsernames || []).filter(u => !activeUsernamesInPrev.has(String(u).toLowerCase().trim()))
              ].map(x => String(x).toLowerCase().trim()));

              const mergeUserAccountsList = (serverList = [], prevList = [], fallbackList = []) => {
                const mapByUsername = new Map();

                const addUsers = (list) => {
                  (list || []).forEach(u => {
                    if (!u || u.id == null) return;
                    const uIdStr = String(u.id);
                    const uNameKey = String(u.username || u.name || '').toLowerCase().trim();
                    if (deletedUserIdsSet.has(uIdStr) || (uNameKey && deletedUsernamesSet.has(uNameKey))) {
                      return;
                    }
                    if (uNameKey) {
                      mapByUsername.set(uNameKey, u);
                    }
                  });
                };

                addUsers(fallbackList);
                addUsers(serverList);
                addUsers(prevList);

                return Array.from(mapByUsername.values());
              };

              const mergedWeb = mergeUserAccountsList(serverData.webAdminAccounts, prev.webAdminAccounts, initialMasterData.webAdminAccounts);
              const mergedMobile = mergeUserAccountsList(serverData.mobileAccounts, prev.mobileAccounts, initialMasterData.mobileAccounts);

              const mergedPerm = (Array.isArray(serverData.permissionMatrix) && serverData.permissionMatrix.length > 0)
                ? serverData.permissionMatrix
                : (prev.permissionMatrix || initialMasterData.permissionMatrix);
              const mergedMobPerm = (Array.isArray(serverData.mobilePermissionMatrix) && serverData.mobilePermissionMatrix.length > 0)
                ? serverData.mobilePermissionMatrix
                : (prev.mobilePermissionMatrix || initialMasterData.mobilePermissionMatrix);

              const getItemKey = (item) => {
                if (!item || typeof item !== 'object') return null;
                if (item.report_no && String(item.report_no).trim() !== '') return String(item.report_no);
                if (item.receiptNo && String(item.receiptNo).trim() !== '') return String(item.receiptNo);
                if (item.tx_id && String(item.tx_id).trim() !== '') return String(item.tx_id);
                if (item.id !== undefined && item.id !== null && String(item.id).trim() !== '') return String(item.id);
                if (item.code && String(item.code).trim() !== '') return String(item.code);
                if (item.name && String(item.name).trim() !== '') return String(item.name);
                return null;
              };

              const deletedSet = new Set([
                ...(prev.deletedLogisticsIds || []),
                ...(prev.deletedReportIds || []),
                ...(prev.deleted_report_nos || []),
                ...(prev.deletedSalesIds || []),
                ...(prev.deletedOutflowIds || []),
                ...(prev.deletedFinancialIds || []),
                ...(serverData.deletedLogisticsIds || []),
                ...(serverData.deletedReportIds || []),
                ...(serverData.deleted_report_nos || []),
                ...(serverData.deletedSalesIds || []),
                ...(serverData.deletedOutflowIds || []),
                ...(serverData.deletedFinancialIds || [])
              ].map(x => String(x)));

              // Track deleted master-data IDs (categories, ingredients, products, etc.)
              const deletedCatIds = new Set([
                ...(prev.deletedCategoriesIds || []),
                ...(serverData.deletedCategoriesIds || [])
              ].map(x => String(x)));
              const deletedIngredientIds = new Set([
                ...(prev.deletedIngredientIds || []),
                ...(serverData.deletedIngredientIds || [])
              ].map(x => String(x)));
              const deletedProductIds = new Set([
                ...(prev.deletedProductIds || []),
                ...(serverData.deletedProductIds || [])
              ].map(x => String(x)));

              const getCombinedArray = (a, b) => {
                const arrA = Array.isArray(a) ? a : [];
                const arrB = Array.isArray(b) ? b : [];
                const map = new Map();
                [...arrA, ...arrB].forEach(item => {
                  const k = getItemKey(item);
                  if (k && !deletedSet.has(k)) map.set(k, item);
                });
                return Array.from(map.values());
              };

              const mergeReportsById = (prevList = [], serverList = []) => {
                const map = new Map();
                // Server items are authoritative
                (serverList || []).forEach(item => {
                  const k = getItemKey(item);
                  if (k && !deletedSet.has(k)) map.set(k, item);
                });
                // Local items: only keep if explicitly pending local (not already deleted or zombie)
                (prevList || []).forEach(item => {
                  const k = getItemKey(item);
                  if (k && !deletedSet.has(k) && !map.has(k)) {
                    // Do not keep legacy purged UPD- or SYN- records that do not exist on server
                    const isZombie = k.startsWith('UPD-') || k.startsWith('SYN-') || k.startsWith('1786671748151');
                    if (!isZombie) {
                      map.set(k, item);
                    }
                  }
                });
                return Array.from(map.values());
              };

              const prevFinance = getCombinedArray(prev.approvedFinanceDaily, prev.manualEntryRecords);
              const serverFinance = getCombinedArray(serverData.approvedFinanceDaily, serverData.manualEntryRecords);
              const mergedApprovedFinance = mergeReportsById(prevFinance, serverFinance);

              const prevShifts = getCombinedArray(prev.shiftClosings, prev.closedShifts);
              const serverShifts = getCombinedArray(serverData.shiftClosings, serverData.closedShifts);
              const mergedShiftClosings = mergeReportsById(prevShifts, serverShifts);

              const prevSales = getCombinedArray(prev.salesTransactions, prev.transactions);
              const serverSales = getCombinedArray(serverData.salesTransactions, serverData.transactions);
              const mergedSalesTx = mergeReportsById(prevSales, serverSales);

              const prevOpname = getCombinedArray(prev.stockOpname, prev.approvedLogistics);
              const serverOpname = getCombinedArray(serverData.stockOpname, serverData.approvedLogistics);
              const mergedOpname = mergeReportsById(prevOpname, serverOpname);

              const prevTransfers = getCombinedArray(prev.stockTransfer, prev.approvedTransfers);
              const serverTransfers = getCombinedArray(serverData.stockTransfer, serverData.approvedTransfers);
              const mergedTransfer = mergeReportsById(prevTransfers, serverTransfers);

              const prevWaste = getCombinedArray(prev.approvedWaste, prev.damagedGoods);
              const serverWaste = getCombinedArray(serverData.approvedWaste, serverData.damagedGoods);
              const mergedWaste = mergeReportsById(prevWaste, serverWaste);

              // Merge master arrays — newer timestamp wins for updates, local wins for deletions
              const mergeMasterArray = (prevArr, serverArr, deletedIds) => {
                const map = new Map();
                // Add server items first as base
                (Array.isArray(serverArr) ? serverArr : []).forEach(item => {
                  const k = String(item.id ?? item.code ?? item.name ?? '');
                  if (k && !deletedIds.has(k)) map.set(k, item);
                });
                // Local items: if same id exists, winner = newer _updatedAt / _lastMutated timestamp
                // If local item is newer → replace server version (e.g. user just edited category)
                // If local item is not in server → add it (new local addition)
                (Array.isArray(prevArr) ? prevArr : []).forEach(item => {
                  const k = String(item.id ?? item.code ?? item.name ?? '');
                  if (!k || deletedIds.has(k)) return;
                  if (map.has(k)) {
                    // Both exist — compare timestamps
                    const serverItem = map.get(k);
                    const localTs  = Number(item._updatedAt  || item._lastMutated  || 0);
                    const serverTs = Number(serverItem._updatedAt || serverItem._lastMutated || 0);
                    if (localTs > serverTs || (localTs === serverTs && localTs > 0) || (localTs === 0 && serverTs === 0 && localTs >= serverTs)) {
                      map.set(k, item); // local wins or is equal
                    }
                  } else {
                    map.set(k, item); // only in local → add it
                  }
                });
                return Array.from(map.values());
              };

              const mergedCategories  = mergeMasterArray(prev.categories,   serverData.categories,   deletedCatIds);
              const mergedIngredients = mergeMasterArray(prev.ingredients,  serverData.ingredients,  deletedIngredientIds);
              const mergedProducts    = mergeMasterArray(prev.products,      serverData.products,      deletedProductIds);

              const prevStr = JSON.stringify(prev);
              const serverStr = JSON.stringify(serverData);
              if (prevStr === serverStr) return prev;

              lastRemoteTsRef.current = remoteTs;
              return {
                ...initialMasterData,
                ...prev,
                ...serverData,
                // Explicitly merged arrays (deletion-safe)
                categories:           mergedCategories,
                ingredients:          mergedIngredients,
                products:             mergedProducts,
                // Deleted ID sets — union of local + server
                deletedCategoriesIds:  Array.from(deletedCatIds),
                deletedIngredientIds:  Array.from(deletedIngredientIds),
                deletedProductIds:     Array.from(deletedProductIds),
                // Transaction arrays (existing merge logic)
                approvedFinanceDaily: mergedApprovedFinance,
                manualEntryRecords: mergedApprovedFinance,
                shiftClosings: mergedShiftClosings,
                closedShifts: mergedShiftClosings,
                salesTransactions: mergedSalesTx,
                transactions: mergedSalesTx,
                stockOpname: mergedOpname,
                approvedLogistics: mergedOpname,
                approvedTransfers: mergedTransfer,
                stockTransfer: mergedTransfer,
                approvedWaste: mergedWaste,
                damagedGoods: mergedWaste,
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

  const filteredProducts = selectedBranch
    ? (masterData.products || []).filter(p => {
        if (String(p.outlet_id) === String(selectedBranch)) return true;
        if (Array.isArray(p.selectedOutletIds) && p.selectedOutletIds.some(id => String(id) === String(selectedBranch))) return true;
        if (p.standardPrices && (p.standardPrices[selectedBranch] !== undefined || p.standardPrices[String(selectedBranch)] !== undefined)) return true;
        if (!p.selectedOutletIds || p.selectedOutletIds.length === 0) return true;
        return false;
      })
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

  // 1. Customer QR Self Registration Page (Check route FIRST so QR scan on phone works without login)
  if (isSelfRegPath || viewMode === 'register_customer') {
    return (
      <CustomerSelfRegistrationPage
        masterData={masterData}
        setMasterData={updateMasterData}
        onBackToPos={() => setViewMode(isCapacitorNative ? 'mobile' : 'admin')}
      />
    );
  }

  // 2. Native Capacitor Android Tablet APK Mode -> Strictly Render POS Kasir Mobile
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
      setMasterData={setMasterData}
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

          {adminTab === 'update_laporan' && (
            <ManualReportUpdatePage
              masterData={masterData}
              setMasterData={updateMasterData}
              userSession={userSession}
              selectedBranch={selectedBranch}
              themeMode={themeMode}
            />
          )}

          {adminTab === 'ingredient_prices' && (
            <IngredientPriceComparisonPage
              masterData={masterData}
              selectedBranch={selectedBranch}
              themeMode={themeMode}
            />
          )}

          {adminTab === 'tren_harga_outlet' && (
            <IngredientPriceTrendPage
              masterData={masterData}
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
      <ServerLoadingOverlay 
        show={isServerLoading} 
        message={serverLoadingMessage} 
        subMessage={serverLoadingSubMessage} 
        themeMode={themeMode} 
      />
    </AdminLayout>
  );
}


