import React, { useState, useEffect, useRef } from 'react';
import LoginPage from './components/admin/LoginPage';
import AndroidPosRegister from './components/mobile/AndroidPosRegister';
import CustomerSelfRegistrationPage from './components/mobile/CustomerSelfRegistrationPage';
import { initialMasterData } from './data/initialMasterData';

export default function App() {
  // Check if current URL is Customer Self Registration route
  const isSelfRegPath = typeof window !== 'undefined' && (
    window.location.pathname.includes('register-customer') ||
    window.location.search.includes('register_customer') ||
    window.location.hash.includes('register-customer')
  );

  // Helper untuk URL VPS Backend Cloud API (mris-api.barokahgroupindonesia.tech)
  const getApiUrl = (pathStr) => {
    if (typeof window !== 'undefined') {
      const savedServer = localStorage.getItem('MRIS_SERVER_URL');
      if (savedServer && savedServer.trim() !== '') {
        return `${savedServer.replace(/\/$/, '')}${pathStr}`;
      }
    }
    return `https://mris-api.barokahgroupindonesia.tech${pathStr}`;
  };

  // User Authentication State
  const [userSession, setUserSession] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('mris_user_session');
      if (saved) {
        try { return JSON.parse(saved); } catch (e) {}
      }
    }
    return null;
  });

  const handleLoginSuccess = (session) => {
    const sessionWithTime = { ...session, loggedInAt: new Date().toISOString() };
    localStorage.setItem('mris_user_session', JSON.stringify(sessionWithTime));
    setUserSession(sessionWithTime);
  };

  const handleLogout = () => {
    localStorage.removeItem('mris_user_session');
    setUserSession(null);
  };

  // Master Data State — diinisialisasi dengan pembersihan cache versi baru & data terpusat
  const [masterData, setMasterData] = useState(() => {
    if (typeof window !== 'undefined') {
      const versionKey = localStorage.getItem('mris_version');
      if (versionKey !== 'v59_purge_all_local_cache') {
        // Pembersihan total seluruh key localStorage lama yang mengandung data stale
        localStorage.removeItem('mris_master_data');
        localStorage.removeItem('mris_user_session');
        localStorage.removeItem('MRIS_POS_MASTER_DATA_CACHE');
        localStorage.setItem('mris_version', 'v59_purge_all_local_cache');
        return initialMasterData;
      }
      const saved = localStorage.getItem('mris_master_data');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed && typeof parsed === 'object') {
            return {
              ...initialMasterData,
              ...parsed
            };
          }
        } catch (e) {}
      }
    }
    return initialMasterData;
  });

  // Selected branch — ikut outlet milik user yang login
  const [selectedBranch, setSelectedBranch] = useState(null);

  useEffect(() => {
    if (userSession && userSession.outlet && userSession.outlet !== 'Semua Outlet (Central)') {
      const match = (masterData?.outlets || []).find(
        o => o.name === userSession.outlet || String(o.id) === String(userSession.outlet_id)
      );
      setSelectedBranch(match ? match.id : null);
    } else {
      setSelectedBranch(null); // Super Admin / Owner: akses semua outlet
    }
  }, [userSession, masterData?.outlets]);

  const lastRemoteTsRef = useRef(0);
  const isInitialMountRef = useRef(true);

  // 1. SYNC ke localStorage & VPS server (hanya saat mutasi lokal)
  useEffect(() => {
    localStorage.setItem('mris_master_data', JSON.stringify(masterData));

    // Prevent POST on initial mount (always fetch from server first!)
    if (isInitialMountRef.current) {
      isInitialMountRef.current = false;
      return;
    }

    // Ignore automatic POST if this state update came from server GET polling
    if (masterData._lastUpdated && masterData._lastUpdated === lastRemoteTsRef.current) {
      return;
    }

    const syncTimer = setTimeout(() => {
      fetch(getApiUrl('/api/master-data'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(masterData)
      })
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data && data._lastUpdated) {
          lastRemoteTsRef.current = data._lastUpdated;
          setMasterData(prev => ({ ...prev, _lastUpdated: data._lastUpdated }));
        }
      })
      .catch(() => {});
    }, 50);

    return () => clearTimeout(syncTimer);
  }, [masterData]);

  // 2. LIVE REALTIME POLLING DARI VPS SERVER (Setiap 3 Detik - Sinkronisasi 100% dengan Web Admin)
  useEffect(() => {
    const fetchLatestFromServer = () => {
      fetch(getApiUrl('/api/master-data'))
        .then(res => res.ok ? res.json() : null)
        .then(serverData => {
          if (serverData && typeof serverData === 'object' && Array.isArray(serverData.products)) {
            const remoteTs = serverData._lastUpdated || Date.now();
            lastRemoteTsRef.current = remoteTs;
            setMasterData(prev => {
              const prevStr = JSON.stringify(prev);
              const serverStr = JSON.stringify(serverData);
              if (prevStr === serverStr) return prev;

              return {
                ...initialMasterData,
                ...serverData,
                _lastUpdated: remoteTs
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

  // RENDER: Customer Self-Registration (QR scan publik)
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

  // RENDER: POS Mobile Kasir (AndroidPosRegister mengelola Papan Login Akses Restoran, Sesi & Lock Screen)
  return (
    <AndroidPosRegister
      userSession={userSession}
      masterData={masterData}
      setMasterData={setMasterData}
      selectedBranch={selectedBranch}
      setSelectedBranch={setSelectedBranch}
      onShiftCloseClick={() => {}}
      onSwitchToAdmin={() => {}}
      onLogout={handleLogout}
    />
  );
}
