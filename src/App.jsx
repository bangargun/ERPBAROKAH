import React, { useState, useEffect } from 'react';
import LoginPage from './components/admin/LoginPage';

import MobileLayout from './components/mobile/MobileLayout';
import DailyTransactionEntry from './components/mobile/DailyTransactionEntry';
import ShiftClosing from './components/mobile/ShiftClosing';
import MobileBranchSummary from './components/mobile/MobileBranchSummary';
import AndroidPosRegister from './components/mobile/AndroidPosRegister';
import CustomerSelfRegistrationPage from './components/mobile/CustomerSelfRegistrationPage';

import { initialMasterData } from './data/initialMasterData';
import { X, Lock, Key, ShieldCheck } from 'lucide-react';

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

  // App View Mode: 'admin' | 'mobile'
  const [viewMode, setViewMode] = useState('admin');

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
      if (versionKey !== 'v37_clean_slate_no_mock_data') {
        localStorage.removeItem('mris_master_data');
        localStorage.removeItem('mris_user_session');
        localStorage.setItem('mris_version', 'v37_clean_slate_no_mock_data');
        return initialMasterData;
      }
      const saved = localStorage.getItem('mris_master_data');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          return {
            ...initialMasterData,
            ...parsed,
            webAdminAccounts: parsed.webAdminAccounts !== undefined ? parsed.webAdminAccounts : initialMasterData.webAdminAccounts,
            mobileAccounts: parsed.mobileAccounts !== undefined ? parsed.mobileAccounts : initialMasterData.mobileAccounts,
            salesTransactions: parsed.salesTransactions || [],
            closedShifts: parsed.closedShifts || parsed.shift_closings || [],
            approvedFinanceDaily: parsed.approvedFinanceDaily || [],
            manualEntryRecords: parsed.manualEntryRecords || [],
            cogsExpenses: parsed.cogsExpenses || [],
            productionExpenses: parsed.productionExpenses || [],
            otherExpenses: parsed.otherExpenses || [],
            stockOpname: parsed.stockOpname || [],
            stockMovement: parsed.stockMovement || [],
            approvedLogistics: parsed.approvedLogistics || [],
            cashFlow: parsed.cashFlow || [],
            customers: parsed.customers || []
          };
        }
      }
    } catch (e) {
      console.error("Master data parse error:", e);
    }
    return initialMasterData;
  });

  // Helper for VPS API URL in APK & Web
  const getApiUrl = (pathStr) => {
    const isNativeApp = window.location.protocol === 'file:' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || !window.location.hostname;
    const baseUrl = isNativeApp ? 'https://mris-admin.barokahgroupindonesia.tech' : '';
    return `${baseUrl}${pathStr}`;
  };

  // Sync Master Data to localStorage & Central VPS Cloud API
  useEffect(() => {
    localStorage.setItem('mris_master_data', JSON.stringify(masterData));
    
    // Auto Sync to Central Server API on VPS
    const syncTimer = setTimeout(() => {
      fetch(getApiUrl('/api/master-data'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(masterData)
      }).catch(() => {
        // Offline-first fallback
      });
    }, 1200);

    return () => clearTimeout(syncTimer);
  }, [masterData]);

  // Real-time Live Polling Sync with VPS Central Cloud Server (Every 2 Seconds)
  useEffect(() => {
    const fetchLatestFromServer = () => {
      fetch(getApiUrl('/api/master-data'))
        .then(res => res.ok ? res.json() : null)
        .then(serverData => {
          if (serverData && typeof serverData === 'object' && Array.isArray(serverData.outlets) && serverData.outlets.length > 0) {
            setMasterData(prev => {
              const prevJson = JSON.stringify(prev);
              const serverJson = JSON.stringify(serverData);
              if (prevJson === serverJson) return prev;
              return {
                ...prev,
                ...serverData,
                webAdminAccounts: serverData.webAdminAccounts !== undefined ? serverData.webAdminAccounts : prev.webAdminAccounts,
                mobileAccounts: serverData.mobileAccounts !== undefined ? serverData.mobileAccounts : prev.mobileAccounts
              };
            });
          }
        })
        .catch(() => {});
    };

    fetchLatestFromServer();
    const livePollTimer = setInterval(fetchLatestFromServer, 2000);
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
    if (viewMode === 'mobile') return null;
    return (
    <div style={{
      position: 'fixed',
      top: '12px',
      right: '20px',
      zIndex: 999999,
      background: 'rgba(15, 23, 42, 0.90)',
      backdropFilter: 'blur(12px)',
      border: '1.5px solid rgba(56, 189, 248, 0.4)',
      padding: '4px 6px',
      borderRadius: '30px',
      display: 'flex',
      alignItems: 'center',
      gap: '4px',
      boxShadow: '0 10px 30px rgba(0,0,0,0.6), 0 0 15px rgba(56, 189, 248, 0.25)'
    }}>
      <button
        type="button"
        onClick={() => handleRequestSwitchToMode('admin')}
        style={{
          padding: '7px 16px',
          borderRadius: '24px',
          border: 'none',
          background: viewMode === 'admin' ? 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)' : 'transparent',
          color: viewMode === 'admin' ? '#ffffff' : '#94a3b8',
          fontSize: '0.78rem',
          fontWeight: '900',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          boxShadow: viewMode === 'admin' ? '0 4px 12px rgba(99,102,241,0.4)' : 'none',
          transition: 'all 0.2s ease'
        }}
      >
        <span>💻 Web Based Admin</span>
      </button>

      <button
        type="button"
        onClick={() => handleRequestSwitchToMode('mobile')}
        style={{
          padding: '7px 16px',
          borderRadius: '24px',
          border: 'none',
          background: viewMode === 'mobile' ? 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)' : 'transparent',
          color: viewMode === 'mobile' ? '#ffffff' : '#94a3b8',
          fontSize: '0.78rem',
          fontWeight: '900',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          boxShadow: viewMode === 'mobile' ? '0 4px 12px rgba(37,99,235,0.4)' : 'none',
          transition: 'all 0.2s ease'
        }}
      >
        <span>📱 POS Mobile APK</span>
      </button>
    </div>
    );
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

  // RENDER LOGIN PAGE jika belum ada sesi aktif
  if (!userSession && !isSelfRegPath) {
    return (
      <LoginPage
        onLoginSuccess={handleLoginSuccess}
        masterData={masterData}
      />
    );
  }

  // RENDER WARNING MODAL (di atas semua view)
  const switchWarningModal = renderSwitchWarningModal();

  // RENDER WEB ADMIN DESKTOP VIEW
  if (viewMode === 'admin') {
    return (
      <>
        {switchWarningModal}
        {renderPreviewToggleBar()}
        <AdminLayout
          activeTab={adminTab}
          setActiveTab={setAdminTab}
          selectedBranch={selectedBranch}
          setSelectedBranch={setSelectedBranch}
          outlets={masterData.outlets}
          pendingCount={stats.pendingApprovals}
          onSwitchToMobile={handleRequestSwitchToMobile}
          onOpenAddTransaction={() => {
            setAdminTab('manual_entry');
            setTriggerOpenManualModal(Date.now());
          }}
          onLogout={handleLogout}
          userSession={userSession}
        >
        {/* 1. DASHBOARD */}
        {adminTab === 'dashboard' && (
          <FinancialOverview
            stats={stats}
            chartData={chartData}
            recentTransactions={recentTransactions}
            outlets={masterData.outlets}
            selectedBranch={selectedBranch}
            masterData={masterData}
          />
        )}

        {/* 2. DATA (MASTER DATA) */}
        {adminTab === 'data' && (
          <MasterDataManagement
            masterData={masterData}
            setMasterData={setMasterData}
            selectedBranch={selectedBranch}
          />
        )}

        {/* 4. PENDAPATAN (SALES) */}
        {adminTab === 'sales' && (
          <SalesTransactionsPage
            masterData={masterData}
            setMasterData={setMasterData}
            selectedBranch={selectedBranch}
          />
        )}

        {/* 5. RIWAYAT TRANSAKSI */}
        {adminTab === 'transaction_history' && (
          <TransactionHistoryPage
            masterData={masterData}
            setMasterData={setMasterData}
            selectedBranch={selectedBranch}
          />
        )}

        {/* 4. PROGRAM LOYALITAS */}
        {adminTab === 'loyalty' && (
          <LoyaltyProgramPage
            masterData={masterData}
            setMasterData={setMasterData}
          />
        )}


        {/* 3. BIAYA (COSTS) */}
        {adminTab === 'costs' && (
          <CostsManagement
            masterData={masterData}
            setMasterData={setMasterData}
            selectedBranch={selectedBranch}
          />
        )}

        {/* 4. STOK (STOCK) */}
        {adminTab === 'stock' && (
          <StockManagement
            masterData={masterData}
            setMasterData={setMasterData}
            selectedBranch={selectedBranch}
          />
        )}

        {/* 6. LAPORAN (REPORTS) */}
        {adminTab === 'reports' && (
          <FinancialReportsFull
            masterData={masterData}
            selectedBranch={selectedBranch}
          />
        )}

        {/* 7. KELOLA DOKUMEN SOP RESTORAN */}
        {adminTab === 'sop' && (
          <SopManagementPage
            masterData={masterData}
            setMasterData={setMasterData}
            selectedBranch={selectedBranch}
          />
        )}


        {/* 8. PENGATURAN (SETTINGS) */}
        {adminTab === 'settings' && (
          <SystemSettings
            masterData={masterData}
            setMasterData={setMasterData}
          />
        )}

        {/* 9. INPUT MANUAL LAPORAN KEUANGAN */}
        {adminTab === 'manual_entry' && (
          <ManualFinancialEntryPage
            masterData={masterData}
            setMasterData={setMasterData}
            selectedBranch={selectedBranch}
            setActiveTab={setAdminTab}
            triggerOpenModal={triggerOpenManualModal}
          />
        )}

        {/* 10. LOG AKTIVITAS SISTEM */}
        {adminTab === 'activity_log' && (
          <ActivityLogPage
            masterData={masterData}
            setMasterData={setMasterData}
            selectedBranch={selectedBranch}
          />
        )}

        {/* Quick Transaction Add Modal */}
        {showAddModal && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(5px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
            <div className="glass-card" style={{ width: '100%', maxWidth: '440px', padding: '24px', background: '#1e293b' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '1.15rem', fontWeight: '800', color: '#f8fafc' }}>Catat Transaksi Kas Harian</h3>
                <button onClick={() => setShowAddModal(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}><X size={18} /></button>
              </div>

              <form onSubmit={handleModalAdd} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.78rem', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Deskripsi Transaksi</label>
                  <input type="text" required placeholder="Contoh: Omset Penjualan Dine-in" value={modalData.name} onChange={e => setModalData({...modalData, name: e.target.value})} className="form-input" />
                </div>
                <div>
                  <label style={{ fontSize: '0.78rem', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Nominal (IDR)</label>
                  <input type="number" required placeholder="0" value={modalData.amount} onChange={e => setModalData({...modalData, amount: e.target.value})} className="form-input" />
                </div>
                <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                  <button type="button" onClick={() => setShowAddModal(false)} className="btn-secondary" style={{ flex: 1, justifyContent: 'center' }}>Batal</button>
                  <button type="submit" className="btn-primary" style={{ flex: 1, justifyContent: 'center' }}>Simpan</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </AdminLayout>
      </>
    );
  }

  // RENDER PUBLIC CUSTOMER SELF-REGISTRATION WEB PAGE (WHEN SCANNED VIA QR)
  if (isSelfRegPath || viewMode === 'register_customer') {
    return (
      <CustomerSelfRegistrationPage
        masterData={masterData}
        setMasterData={setMasterData}
        onBackToPos={() => {
          if (typeof window !== 'undefined' && window.history.pushState) {
            window.history.pushState({}, '', '/');
          }
          setViewMode('mobile');
        }}
      />
    );
  }

  // RENDER NATIVE ANDROID POS KASIR VIEW (GOBIZ / MOKA STYLE 2-TAP)
  return (
    <>
      {switchWarningModal}
      {renderPreviewToggleBar()}
      <AndroidPosRegister
        masterData={masterData}
        setMasterData={setMasterData}
        selectedBranch={selectedBranch}
        setSelectedBranch={setSelectedBranch}
        onShiftCloseClick={() => {
          handleRequestSwitchToMode('admin');
          setAdminTab('approved');
        }}
        onSwitchToAdmin={() => handleRequestSwitchToMode('admin')}
        onLogout={handleLogout}
      />
    </>
  );
}
