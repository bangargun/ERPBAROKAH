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

  // Helper untuk URL VPS Backend Cloud API
  const getApiUrl = (pathStr) => {
    if (typeof window !== 'undefined') {
      const host = window.location.hostname;
      if (host && host !== 'localhost' && host !== '127.0.0.1' && !host.includes('http')) {
        return `${window.location.protocol}//${host}${window.location.port ? ':' + window.location.port : ''}${pathStr}`;
      }
    }
    return `https://mris-admin.barokahgroupindonesia.tech${pathStr}`;
  };

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

  // Handle login success dari LoginPage
  const handleLoginSuccess = (session) => {
    const sessionWithTime = { ...session, loggedInAt: new Date().toISOString() };
    localStorage.setItem('mris_user_session', JSON.stringify(sessionWithTime));
    setUserSession(sessionWithTime);
  };

  const handleLogout = () => {
    localStorage.removeItem('mris_user_session');
    setUserSession(null);
  };

  // Master Data State
  const [masterData, setMasterData] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('mris_master_data');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed && typeof parsed === 'object' && Array.isArray(parsed.outlets) && parsed.outlets.length > 0) {
            return parsed;
          }
        } catch (e) {}
      }
    }
    return initialMasterData;
  });

  const [selectedBranch, setSelectedBranch] = useState(() => {
    const defaultBranch = masterData?.outlets?.[0]?.name || 'Gourmet Bistro - Senopati';
    if (userSession && userSession.outlet && userSession.outlet !== 'Semua Outlet (Central)') {
      return userSession.outlet;
    }
    return defaultBranch;
  });

  // 1. AUTO SYNC FLUSH TO VPS CLOUD SERVER ON EVERY DATA CHANGE
  useEffect(() => {
    localStorage.setItem('mris_master_data', JSON.stringify(masterData));

    const syncTimer = setTimeout(() => {
      fetch(getApiUrl('/api/master-data'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(masterData)
      }).catch(() => {
        // Offline-first fallback
      });
    }, 1000);

    return () => clearTimeout(syncTimer);
  }, [masterData]);

  // 2. REAL-TIME 2-WAY LIVE POLLING SYNC WITH VPS CLOUD SERVER (EVERY 3 SECONDS)
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
    const interval = setInterval(fetchLatestFromServer, 3000);
    return () => clearInterval(interval);
  }, []);

  // RENDER PUBLIC CUSTOMER SELF-REGISTRATION WEB PAGE
  if (isSelfRegPath) {
    return (
      <CustomerSelfRegistrationPage
        masterData={masterData}
        setMasterData={setMasterData}
        onBackToPos={() => {
          if (typeof window !== 'undefined' && window.history.pushState) {
            window.history.pushState({}, '', '/');
          }
        }}
      />
    );
  }

  // RENDER LOGIN PAGE jika belum ada sesi aktif
  if (!userSession) {
    return (
      <LoginPage
        onLoginSuccess={handleLoginSuccess}
        masterData={masterData}
      />
    );
  }

  // RENDER NATIVE ANDROID POS KASIR VIEW (PURE POS MOBILE KASIR)
  return (
    <AndroidPosRegister
      masterData={masterData}
      setMasterData={setMasterData}
      selectedBranch={selectedBranch}
      setSelectedBranch={setSelectedBranch}
      onShiftCloseClick={() => {}}
      onLogout={handleLogout}
    />
  );
}
