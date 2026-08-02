import React, { useState, useEffect, useRef } from 'react';
import AdminLayout from './components/admin/AdminLayout';
import FinancialOverview from './components/admin/FinancialOverview';
import MasterDataManagement from './components/admin/MasterDataManagement';
import SalesTransactionsPage from './components/admin/SalesTransactionsPage';
import LoyaltyProgramPage from './components/admin/LoyaltyProgramPage';
import CostsManagement from './components/admin/CostsManagement';

import StockManagement from './components/admin/StockManagement';
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

import MobileLayout from './components/mobile/MobileLayout';
import DailyTransactionEntry from './components/mobile/DailyTransactionEntry';
import ShiftClosing from './components/mobile/ShiftClosing';
import MobileBranchSummary from './components/mobile/MobileBranchSummary';
import AndroidPosRegister from './components/mobile/AndroidPosRegister';
import CustomerSelfRegistrationPage from './components/mobile/CustomerSelfRegistrationPage';

import { initialMasterData } from './data/initialMasterData';
import { checkWebPermission } from './utils/permissionUtils';
import { X, Lock, Key, ShieldCheck, ShieldAlert } from 'lucide-react';

export default function App() {
  // Check if current URL is Customer Self Registration route
  const isSelfRegPath = typeof window !== 'undefined' && (
    window.location.pathname.includes('register-customer') ||
    window.location.search.includes('register_customer') ||
    window.location.hash.includes('register-customer')
  );
  // User Authentication State (null = belum login, tampilkan LoginPage)
  const [userSession, setUserSession] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('mris_user_session');
      if (saved) {
        try { return JSON.parse(saved); } catch (e) {}
      }
    }
    return null;
  });

  // App View Mode: Strictly 'mobile' for POS Kasir Tablet APK
  const [viewMode, setViewMode] = useState('mobile');

  // Handle login success dari LoginPage
  const handleLoginSuccess = (session, targetMode) => {
    const sessionWithTime = { ...session, loggedInAt: new Date().toISOString() };
    localStorage.setItem('mris_user_session', JSON.stringify(sessionWithTime));
    setUserSession(sessionWithTime);
    setViewMode(targetMode || 'admin');
  };

  const handleLogout = () => {
    localStorage.removeItem('mris_user_session');
    setUserSession(null);
  };

  // Modal peringatan saat POS Mobile mencoba beralih ke Web Admin
  const [showSwitchWarning, setShowSwitchWarning] = useState(false);

  // Perpindahan: dari Web Admin → POS Mobile langsung (bebas hambatan)
  // dari POS Mobile → Web Admin: harus keluar dulu
  const handleRequestSwitchToMode = (targetMode) => {
    if (viewMode === 'mobile' && targetMode === 'admin') {
      setShowSwitchWarning(true); // tampilkan modal peringatan
    } else {
      setViewMode(targetMode);
    }
  };

  const handleRequestSwitchToMobile = () => setViewMode('mobile');
  const handleRequestSwitchToAdmin = () => setViewMode('admin');

  // Admin Active Menu: 'dashboard' | 'data' | 'costs' | 'stock' | 'approved' | 'reports' | 'terms' | 'settings'
  const [adminTab, setAdminTab] = useState('dashboard');

  // Mobile Active Tab: 'home' | 'add-tx' | 'shift-close' | 'summary'
  const [mobileTab, setMobileTab] = useState('home');

  // Selected Branch Filter
  const [selectedBranch, setSelectedBranch] = useState(null);

  // Master Data State initialized with clean dataset and version reset check
  const [masterData, setMasterData] = useState(() => {
    try {
      const versionKey = localStorage.getItem('mris_version');
      if (versionKey !== 'v61_isolated_user_tables_restored') {
        localStorage.removeItem('mris_master_data');
        localStorage.setItem('mris_version', 'v61_isolated_user_tables_restored');
        return initialMasterData;
      }
      const saved = localStorage.getItem('mris_master_data');
      let baseData = { ...initialMasterData };
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          baseData = { ...baseData, ...parsed };
        }
      }
      // Restore persisted user accounts from standalone keys
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

  // Ref menyimpan masterData terkini agar bisa dibaca sinkron di updateMasterData
  const masterDataRef = useRef(masterData);
  useEffect(() => { masterDataRef.current = masterData; }, [masterData]);

  // Wrapper function that guarantees every local mutation gets a new timestamp & instant push to VPS MySQL
  // FIX: lastLocalMutationTsRef diset SINKRON di luar setState — proteksi polling langsung aktif
  // FIX: fetch POST dipindahkan ke luar setState callback (bukan anti-pattern lagi)
  // FIX: window proteksi diperpanjang ke 15 detik untuk koneksi lambat
  const updateMasterData = (updater) => {
    // ✅ Compute next state secara sinkron dari ref (bukan dari stale closure)
    const prev = masterDataRef.current;
    const next = typeof updater === 'function' ? updater(prev) : updater;
    const ts = Date.now();
    const updatedWithTs = { ...next, _lastUpdated: ts };

    // ✅ Set timestamp SINKRON sebelum setState agar polling protection langsung aktif
    lastLocalMutationTsRef.current = ts;

    // ✅ setState dengan nilai final (bukan updater function) — aman dari double-invoke
    setMasterData(updatedWithTs);

    // ✅ Instant push ke VPS (MySQL mris_db) — di luar setState, tidak ada side-effect
    fetch(getApiUrl('/api/master-data'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedWithTs)
    })
    .then(res => res.ok ? res.json() : null)
    .then(data => {
      if (data && data._lastUpdated) {
        lastRemoteTsRef.current = data._lastUpdated;
        // Extend protection window dengan timestamp server yang dikonfirmasi
        lastLocalMutationTsRef.current = Math.max(lastLocalMutationTsRef.current, data._lastUpdated);
      }
    })
    .catch(err => console.error('Instant push error:', err));
  };

  // Sync Master Data to localStorage
  useEffect(() => {
    localStorage.setItem('mris_master_data', JSON.stringify(masterData));
  }, [masterData]);

  // Real-time Live Polling Sync dengan VPS (setiap 5 detik)
  // PROTEKSI: skip overwrite jika data lokal lebih baru dari server
  // PROTEKSI: skip polling selama 15 detik setelah mutasi lokal (diperpanjang untuk koneksi lambat)
  useEffect(() => {
    const fetchLatestFromServer = () => {
      // Jika ada mutasi lokal dalam 15 detik terakhir → skip polling
      const msSinceLastMutation = Date.now() - lastLocalMutationTsRef.current;
      if (msSinceLastMutation < 15000) return;

      fetch(getApiUrl('/api/master-data'), { cache: 'no-store' })
        .then(res => res.ok ? res.json() : null)
        .then(serverData => {
          if (serverData && typeof serverData === 'object' && Array.isArray(serverData.outlets)) {
            const remoteTs = serverData._lastUpdated || 0;

            setMasterData(prev => {
              const localTs = prev._lastUpdated || 0;

              // Jika data lokal LEBIH BARU dari server → jangan timpa
              if (localTs > remoteTs) return prev;

              const prevStr = JSON.stringify(prev);
              const serverStr = JSON.stringify(serverData);
              if (prevStr === serverStr) return prev;

              const mergedWeb = (Array.isArray(serverData.webAdminAccounts) && serverData.webAdminAccounts.length > 0)
                ? serverData.webAdminAccounts
                : (prev.webAdminAccounts || initialMasterData.webAdminAccounts);
              const mergedMobile = (Array.isArray(serverData.mobileAccounts) && serverData.mobileAccounts.length > 0)
                ? serverData.mobileAccounts
                : (prev.mobileAccounts || initialMasterData.mobileAccounts);

              lastRemoteTsRef.current = remoteTs;
              return {
                ...initialMasterData,
                ...prev,
                ...serverData,
                webAdminAccounts: mergedWeb,
                mobileAccounts: mergedMobile,
                _lastUpdated: remoteTs
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

  // Derived Financial Stats
  const activeOutletList = masterData.outlets || [];
  const filteredProducts = selectedBranch 
    ? (masterData.products || []).filter(p => p.outlet_id === selectedBranch) 
    : (masterData.products || []);
  
  // Filter datasets based on selectedBranch
  const salesTransactionsFiltered = selectedBranch 
    ? (masterData.salesTransactions || []).filter(t => Number(t.outlet_id) === Number(selectedBranch))
    : (masterData.salesTransactions || []);

  const approvedFinanceFiltered = selectedBranch
    ? (masterData.approvedFinanceDaily || []).filter(f => Number(f.outlet_id) === Number(selectedBranch))
    : (masterData.approvedFinanceDaily || []);

  const financialRecordsFiltered = selectedBranch
    ? (masterData.financialRecords || []).filter(f => {
        const outlet = (masterData.outlets || []).find(o => Number(o.id) === Number(selectedBranch));
        return Number(f.outlet_id) === Number(selectedBranch) || (outlet && f.branch_name === outlet.name);
      })
    : (masterData.financialRecords || []);

  const cogsExpensesFiltered = selectedBranch
    ? (masterData.cogsExpenses || []).filter(e => !e.outlet_id || Number(e.outlet_id) === Number(selectedBranch))
    : (masterData.cogsExpenses || []);

  const productionExpensesFiltered = selectedBranch
    ? (masterData.productionExpenses || []).filter(e => !e.outlet_id || Number(e.outlet_id) === Number(selectedBranch))
    : (masterData.productionExpenses || []);

  const otherExpensesFiltered = selectedBranch
    ? (masterData.otherExpenses || []).filter(e => !e.outlet_id || Number(e.outlet_id) === Number(selectedBranch))
    : (masterData.otherExpenses || []);
  
  // Calculate Totals dynamically based on sales transactions, financial records, AND manual entry approved finance daily
  const salesIncome = salesTransactionsFiltered.reduce((acc, t) => acc + (t.amount || 0), 0);
  const manualFinanceIncome = approvedFinanceFiltered.reduce((acc, f) => acc + (f.net_sales || 0), 0);
  
  const totalIncome = Math.max(salesIncome, manualFinanceIncome) +
                      financialRecordsFiltered.filter(f => f.type === 'income').reduce((acc, f) => acc + (f.amount || 0), 0);
  
  const manualFinanceExpense = approvedFinanceFiltered.reduce((acc, f) => acc + (f.total_expense || 0), 0);

  const totalExpense = manualFinanceExpense +
                       cogsExpensesFiltered.reduce((acc, e) => acc + (e.amount || 0), 0) + 
                       productionExpensesFiltered.reduce((acc, e) => acc + (e.amount || 0), 0) + 
                       otherExpensesFiltered.reduce((acc, e) => acc + (e.amount || 0), 0) +
                       financialRecordsFiltered.filter(f => f.type === 'expense').reduce((acc, f) => acc + (f.amount || 0), 0);
  
  const netProfit = totalIncome - totalExpense;
  const profitMargin = totalIncome > 0 ? ((netProfit / totalIncome) * 100).toFixed(1) : 0;

  const stats = {
    totalIncome,
    totalExpense,
    netProfit,
    profitMargin,
    pendingApprovals: ((masterData.approvedLogistics || []).filter(l => (selectedBranch ? Number(l.outlet_id) === Number(selectedBranch) : true) && (l.status === 'Pending' || l.status === 'ditunda'))).length + 
                      ((masterData.approvedFinanceDaily || []).filter(f => (selectedBranch ? Number(f.outlet_id) === Number(selectedBranch) : true) && (f.status === 'Pending' || f.status === 'ditunda'))).length,
    outletsStats: (masterData.outlets || []).filter(o => selectedBranch ? Number(o.id) === Number(selectedBranch) : true).map(o => {
      const oSalesTx = (masterData.salesTransactions || []).filter(t => Number(t.outlet_id) === Number(o.id)).reduce((s, t) => s + (t.amount || 0), 0);
      const oManualInc = (masterData.approvedFinanceDaily || []).filter(f => Number(f.outlet_id) === Number(o.id)).reduce((s, f) => s + (f.net_sales || 0), 0);
      const oIncome = Math.max(oSalesTx, oManualInc);

      const oManualExp = (masterData.approvedFinanceDaily || []).filter(f => Number(f.outlet_id) === Number(o.id)).reduce((s, f) => s + (f.total_expense || 0), 0);
      const oExpense = oManualExp + (masterData.financialRecords || []).filter(f => f.branch_name === o.name && f.type === 'expense').reduce((s, f) => s + (f.amount || 0), 0);

      return {
        id: o.id,
        name: o.name,
        code: o.code,
        color: o.color,
        income: oIncome,
        expense: oExpense,
        netProfit: oIncome - oExpense
      };
    })
  };

  // Dynamic Chart Data from Master Data
  const chartData = (() => {
    const datesMap = {};
    salesTransactionsFiltered.forEach(t => {
      if (!t.date) return;
      if (!datesMap[t.date]) datesMap[t.date] = { date: t.date, income: 0, expense: 0 };
      datesMap[t.date].income += Number(t.amount || 0);
    });
    financialRecordsFiltered.forEach(f => {
      if (!f.date) return;
      if (!datesMap[f.date]) datesMap[f.date] = { date: f.date, income: 0, expense: 0 };
      if (f.type === 'expense') {
        datesMap[f.date].expense += Number(f.amount || 0);
      } else if (f.type === 'income') {
        datesMap[f.date].income += Number(f.amount || 0);
      }
    });
    return Object.values(datesMap).sort((a, b) => new Date(a.date) - new Date(b.date));
  })();

  // Dynamic Recent Transactions from Master Data
  const recentTransactions = [
    ...salesTransactionsFiltered.map(t => ({
      id: `tx-${t.id}`,
      date: t.date || new Date().toISOString().split('T')[0],
      branch_name: (masterData.outlets || []).find(o => Number(o.id) === Number(t.outlet_id))?.name || 'Outlet Restoran',
      type: 'income',
      category: t.category || 'Penjualan POS',
      description: t.notes || `Transaksi Penjualan Kasir`,
      payment_method: t.payment_method || 'Cash',
      amount: t.amount || 0,
      status: 'approved'
    })),
    ...financialRecordsFiltered.map(f => ({
      id: `fin-${f.id}`,
      date: f.date || new Date().toISOString().split('T')[0],
      branch_name: f.branch_name || 'Outlet Restoran',
      type: f.type || 'expense',
      category: f.category || 'Pengeluaran Biaya',
      description: f.description || 'Pengeluaran Kasir',
      payment_method: f.payment_method || 'Cash',
      amount: f.amount || 0,
      status: f.status || 'approved'
    }))
  ].sort((a, b) => new Date(b.date) - new Date(a.date));

  // Quick Modal Add Transaction & Manual Entry Modal Trigger State
  const [triggerOpenManualModal, setTriggerOpenManualModal] = useState(0);
  const [showAddModal, setShowAddModal] = useState(false);
  const [modalData, setModalData] = useState({ name: '', amount: '', type: 'income' });

  const handleModalAdd = (e) => {
    e.preventDefault();
    setShowAddModal(false);
    setModalData({ name: '', amount: '', type: 'income' });
  };

  // FLOATING PREVIEW TOGGLE BUTTON BAR (BERALIH DENGAN MUDAH ANTARA WEB ADMIN & POS MOBILE APK)
  const renderPreviewToggleBar = () => {
    return null;
  };

  // MODAL PERINGATAN: Keluar dulu dari POS Mobile sebelum ke Web Admin
  const renderSwitchWarningModal = () => {
    if (!showSwitchWarning) return null;
    return (
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 9999999, padding: '20px'
      }}>
        <div style={{
          width: '100%', maxWidth: '420px',
          background: 'rgba(15, 23, 42, 0.97)',
          border: '1.5px solid rgba(248,113,113,0.4)',
          borderRadius: '20px', padding: '32px 28px',
          boxShadow: '0 25px 60px rgba(0,0,0,0.6)',
          textAlign: 'center', fontFamily: "'Inter', sans-serif"
        }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>🔒</div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: '900', color: '#f8fafc', margin: '0 0 10px' }}>
            Keluar dari POS Mobile Terlebih Dahulu
          </h3>
          <p style={{ fontSize: '0.82rem', color: '#94a3b8', lineHeight: '1.6', margin: '0 0 24px' }}>
            Anda sedang aktif di <strong style={{ color: '#60a5fa' }}>📱 POS Mobile APK</strong>.<br />
            Untuk beralih ke <strong style={{ color: '#a5b4fc' }}>💻 Web Based Admin</strong>, silakan keluar dari akun terlebih dahulu, kemudian pilih akses Web Based Admin.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <button
              type="button"
              onClick={() => {
                setShowSwitchWarning(false);
                handleLogout(); // keluar akun → kembali ke papan login
              }}
              style={{
                padding: '12px', borderRadius: '12px', border: 'none',
                background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
                color: '#ffffff', fontSize: '0.88rem', fontWeight: '800',
                cursor: 'pointer', boxShadow: '0 4px 16px rgba(220,38,38,0.4)'
              }}
            >
              🚪 Keluar dari Akun POS Mobile
            </button>
            <button
              type="button"
              onClick={() => setShowSwitchWarning(false)}
              style={{
                padding: '11px', borderRadius: '12px',
                border: '1.5px solid rgba(148,163,184,0.25)',
                background: 'transparent', color: '#94a3b8',
                fontSize: '0.85rem', fontWeight: '700', cursor: 'pointer'
              }}
            >
              Tetap di POS Mobile APK
            </button>
          </div>
        </div>
      </div>
    );
  };

  // RENDER PUBLIC CUSTOMER SELF-REGISTRATION WEB PAGE (WHEN SCANNED VIA QR)
  if (isSelfRegPath || viewMode === 'register_customer') {
    return (
      <CustomerSelfRegistrationPage
        masterData={masterData}
        setMasterData={updateMasterData}
        onBackToPos={() => {
          if (typeof window !== 'undefined' && window.history.pushState) {
            window.history.pushState({}, '', '/');
          }
          setViewMode('mobile');
        }}
      />
    );
  }

  // RENDER STRICTLY NATIVE ANDROID POS KASIR VIEW (100% ISOLATED FROM WEB ADMIN)
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
