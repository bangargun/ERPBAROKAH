import React, { useState, useMemo, useEffect } from 'react';
import { Monitor, Smartphone, Lock, Eye, EyeOff, Store, AlertCircle, ChevronRight, ArrowLeft, Crown } from 'lucide-react';

// =====================================================================
// DEFAULT ACCOUNTS - WEB BASED ADMIN (terpisah dari POS Mobile)
// =====================================================================
// DEFAULT ACCOUNTS - WEB BASED ADMIN
// =====================================================================
const DEFAULT_WEB_ADMIN_ACCOUNTS = [
  { id: 1, name: 'Super Admin Restoran', outlet: 'Semua Outlet (Central)', username: 'superadmin', password: '888', role: 'Super Admin', status: 'Aktif' },
  { id: 2, name: 'Owner Restoran', outlet: 'Semua Outlet (Central)', username: 'owner', password: '999', role: 'Owner', status: 'Aktif' }
];

// =====================================================================
// DEFAULT ACCOUNTS - POS MOBILE APK
// =====================================================================
const DEFAULT_MOBILE_ACCOUNTS = [
  { id: 1, name: 'Super Admin Restoran', outlet: 'Semua Outlet (Central)', username: 'superadmin', mobileLoginPassword: '888', role: 'Super Admin / Owner', status: 'Aktif', canAccessMobileReports: true, mobileReportPassword: '8888' },
  { id: 2, name: 'Owner Restoran', outlet: 'Semua Outlet (Central)', username: 'owner', mobileLoginPassword: '999', role: 'Super Admin / Owner', status: 'Aktif', canAccessMobileReports: true, mobileReportPassword: '9999' }
];

const ROLE_ICONS = {
  'Super Admin': '👑',
  'Super Admin / Owner': '👑',
  'Owner': '💎',
  'Admin': '🛡️',
  'Kasir': '🏪',
  'Kepala Cabang': '🏢',
  'SPV': '📋',
  'Logistik': '📦',
};

export default function LoginPage({ onLoginSuccess, masterData }) {
  const [mode, setMode] = useState('mobile');
  const [selectedOutlet, setSelectedOutlet] = useState('');
  const [selectedUsername, setSelectedUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setTimeout(() => setMounted(true), 50);
  }, []);

  // Fallback berlapis: gunakan DEFAULT jika array kosong atau tidak ada
  // Prioritas: webAdminAccounts → userRights → users → DEFAULT
  const webAdminAccounts = (() => {
    const wa = masterData?.webAdminAccounts;
    if (Array.isArray(wa) && wa.length > 0) return wa;
    const ur = masterData?.userRights;
    if (Array.isArray(ur) && ur.length > 0) return ur;
    const us = masterData?.users;
    if (Array.isArray(us) && us.length > 0) return us;
    return DEFAULT_WEB_ADMIN_ACCOUNTS;
  })();

  // Prioritas: mobileAccounts → userRights (canLoginMobile) → users → DEFAULT
  const mobileAccountsList = (() => {
    const ma = masterData?.mobileAccounts;
    if (Array.isArray(ma) && ma.length > 0) return ma;
    const ur = masterData?.userRights;
    if (Array.isArray(ur) && ur.length > 0) return ur.filter(u => u.canLoginMobile !== false);
    const us = masterData?.users;
    if (Array.isArray(us) && us.length > 0) return us.filter(u => u.canLoginMobile !== false);
    return DEFAULT_MOBILE_ACCOUNTS;
  })();

  const outlets = masterData?.outlets || [];

  const mobileOutlets = useMemo(() => {
    const outletSet = new Set();
    mobileAccountsList.filter(u => u.status === 'Aktif').forEach(u => {
      if (u.outlet) outletSet.add(u.outlet);
    });
    outlets.forEach(o => outletSet.add(o.name));
    return Array.from(outletSet);
  }, [mobileAccountsList, outlets]);

  const mobileUsersForOutlet = useMemo(() => {
    if (!selectedOutlet) return [];
    return mobileAccountsList.filter(u =>
      u.status === 'Aktif' &&
      (u.outlet === selectedOutlet || u.outlet === 'Semua Outlet (Central)')
    );
  }, [mobileAccountsList, selectedOutlet]);

  const adminUsers = useMemo(() =>
    webAdminAccounts.filter(u => u.status === 'Aktif'),
    [webAdminAccounts]
  );

  const resetForm = () => {
    setSelectedOutlet('');
    setSelectedUsername('');
    setPassword('');
    setError('');
    setShowPass(false);
    setIsLoading(false);
  };

  const handleModeSelect = (m) => {
    resetForm();
    setMode(m);
  };

  const handleLogin = () => {
    setError('');
    setIsLoading(true);
    setTimeout(() => {
      if (mode === 'admin') {
        if (!selectedUsername) { setError('Pilih username terlebih dahulu.'); setIsLoading(false); return; }
        if (!password) { setError('Masukkan password.'); setIsLoading(false); return; }
        const user = adminUsers.find(u => u.username === selectedUsername);
        if (!user) { setError('Username tidak ditemukan.'); setIsLoading(false); return; }
        if (user.password !== password) { setError('Password salah. Periksa kembali.'); setIsLoading(false); return; }
        onLoginSuccess && onLoginSuccess({ username: user.username, name: user.name, role: user.role, outlet: user.outlet, loggedInAt: new Date().toISOString() }, 'admin');
      } else if (mode === 'mobile') {
        if (!selectedOutlet) { setError('Pilih outlet terlebih dahulu.'); setIsLoading(false); return; }
        if (!selectedUsername) { setError('Pilih username terlebih dahulu.'); setIsLoading(false); return; }
        if (!password) { setError('Masukkan password.'); setIsLoading(false); return; }
        const user = mobileUsersForOutlet.find(u => u.username === selectedUsername);
        if (!user) { setError('Username tidak ditemukan untuk outlet ini.'); setIsLoading(false); return; }
        if (user.mobileLoginPassword !== password) { setError('Password POS Mobile salah.'); setIsLoading(false); return; }
        onLoginSuccess && onLoginSuccess({ username: user.username, name: user.name, role: user.role, outlet: selectedOutlet, loggedInAt: new Date().toISOString() }, 'mobile');
      }
    }, 600);
  };

  const selectedUser = mode === 'admin'
    ? adminUsers.find(u => u.username === selectedUsername)
    : mobileUsersForOutlet.find(u => u.username === selectedUsername);

  return (
    <div style={{
      minHeight: '100vh',
      width: '100vw',
      background: 'radial-gradient(ellipse at 20% 50%, #1a0a2e 0%, #0d0d1a 40%, #0a0f1e 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif",
      padding: '20px',
      position: 'relative',
      overflow: 'hidden',
    }}>

      {/* DECORATIVE BACKGROUND ELEMENTS */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
        {/* Gold orbs */}
        <div style={{ position: 'absolute', top: '-10%', left: '-5%', width: '500px', height: '500px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(212,175,55,0.08) 0%, transparent 70%)', filter: 'blur(40px)' }} />
        <div style={{ position: 'absolute', bottom: '-15%', right: '-5%', width: '600px', height: '600px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(139,92,246,0.10) 0%, transparent 70%)', filter: 'blur(50px)' }} />
        <div style={{ position: 'absolute', top: '40%', right: '15%', width: '300px', height: '300px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(56,189,248,0.06) 0%, transparent 70%)', filter: 'blur(30px)' }} />
        {/* Decorative grid */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'linear-gradient(rgba(212,175,55,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(212,175,55,0.03) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }} />
        {/* Top decorative line */}
        <div style={{ position: 'absolute', top: 0, left: '10%', right: '10%', height: '1px', background: 'linear-gradient(90deg, transparent, rgba(212,175,55,0.4), transparent)' }} />
        <div style={{ position: 'absolute', bottom: 0, left: '10%', right: '10%', height: '1px', background: 'linear-gradient(90deg, transparent, rgba(212,175,55,0.2), transparent)' }} />
      </div>

      {/* MAIN CARD */}
      <div style={{
        width: '100%',
        maxWidth: mode ? '460px' : '540px',
        opacity: mounted ? 1 : 0,
        transform: mounted ? 'translateY(0)' : 'translateY(20px)',
        transition: 'all 0.5s cubic-bezier(0.22,1,0.36,1)',
        position: 'relative',
        zIndex: 1,
      }}>

        {/* CARD GLOW BORDER */}
        <div style={{
          position: 'absolute', inset: '-1px',
          borderRadius: '28px',
          background: mode === 'mobile'
            ? 'linear-gradient(135deg, rgba(56,189,248,0.5), rgba(99,102,241,0.2), rgba(56,189,248,0.1))'
            : mode === 'admin'
            ? 'linear-gradient(135deg, rgba(212,175,55,0.6), rgba(99,102,241,0.3), rgba(212,175,55,0.1))'
            : 'linear-gradient(135deg, rgba(212,175,55,0.4), rgba(139,92,246,0.3), rgba(212,175,55,0.1))',
          padding: '1px',
          zIndex: 0,
        }}>
          <div style={{ width: '100%', height: '100%', borderRadius: '28px', background: '#0d1117' }} />
        </div>

        {/* CARD BODY */}
        <div style={{
          position: 'relative',
          zIndex: 1,
          background: 'rgba(13,17,23,0.96)',
          backdropFilter: 'blur(20px)',
          borderRadius: '28px',
          padding: '40px 36px 36px',
          boxShadow: '0 40px 80px rgba(0,0,0,0.7), 0 0 60px rgba(212,175,55,0.06)',
        }}>

          {/* LOGO AREA */}
          <div style={{ textAlign: 'center', marginBottom: mode ? '28px' : '32px' }}>
            {/* Crown icon with glow */}
            <div style={{
              width: '72px', height: '72px',
              borderRadius: '50%',
              background: 'radial-gradient(135deg, rgba(212,175,55,0.25) 0%, rgba(212,175,55,0.05) 100%)',
              border: '1.5px solid rgba(212,175,55,0.4)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 16px',
              boxShadow: '0 0 30px rgba(212,175,55,0.15), inset 0 0 20px rgba(212,175,55,0.05)',
              position: 'relative',
            }}>
              <div style={{ fontSize: '1.8rem' }}>🍽️</div>
              <div style={{
                position: 'absolute', top: '-3px', right: '-3px',
                width: '22px', height: '22px', borderRadius: '50%',
                background: 'linear-gradient(135deg, #d4af37, #a0762a)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 2px 8px rgba(212,175,55,0.5)',
              }}>
                <Crown size={12} color="#fff" />
              </div>
            </div>

            <div style={{
              fontSize: '1.55rem', fontWeight: '900', letterSpacing: '-0.5px',
              background: 'linear-gradient(135deg, #f8f0d0 0%, #d4af37 50%, #b8963e 100%)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              marginBottom: '4px',
            }}>
              POS Kasir Barokah
            </div>
            <div style={{ fontSize: '0.72rem', color: '#64748b', letterSpacing: '0.15em', textTransform: 'uppercase', fontWeight: '700' }}>
              Restoran &amp; ERP Management System
            </div>

            {/* Divider */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '20px 0 0' }}>
              <div style={{ flex: 1, height: '1px', background: 'linear-gradient(90deg, transparent, rgba(212,175,55,0.3))' }} />
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'rgba(212,175,55,0.5)' }} />
              <div style={{ flex: 1, height: '1px', background: 'linear-gradient(90deg, rgba(212,175,55,0.3), transparent)' }} />
            </div>
          </div>

          {/* ======= PILIH MODE ======= */}
          {!mode && (
            <div style={{ opacity: mounted ? 1 : 0, transition: 'opacity 0.4s ease 0.2s' }}>
              <div style={{ fontSize: '0.72rem', color: '#64748b', textAlign: 'center', letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: '700', marginBottom: '18px' }}>
                Pilih Portal Akses
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                {/* WEB ADMIN CARD */}
                <button
                  type="button"
                  onClick={() => handleModeSelect('admin')}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px',
                    padding: '24px 16px',
                    borderRadius: '18px',
                    border: '1.5px solid rgba(212,175,55,0.25)',
                    background: 'linear-gradient(145deg, rgba(212,175,55,0.08) 0%, rgba(212,175,55,0.03) 100%)',
                    cursor: 'pointer',
                    transition: 'all 0.25s ease',
                    position: 'relative',
                    overflow: 'hidden',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = 'rgba(212,175,55,0.6)';
                    e.currentTarget.style.background = 'linear-gradient(145deg, rgba(212,175,55,0.15) 0%, rgba(212,175,55,0.06) 100%)';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = 'rgba(212,175,55,0.25)';
                    e.currentTarget.style.background = 'linear-gradient(145deg, rgba(212,175,55,0.08) 0%, rgba(212,175,55,0.03) 100%)';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  <div style={{
                    width: '52px', height: '52px', borderRadius: '14px',
                    background: 'linear-gradient(135deg, rgba(212,175,55,0.2), rgba(212,175,55,0.08))',
                    border: '1px solid rgba(212,175,55,0.3)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: '0 4px 16px rgba(212,175,55,0.1)',
                  }}>
                    <Monitor size={24} color="#d4af37" />
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontWeight: '800', fontSize: '0.88rem', color: '#f8f0d0', marginBottom: '4px' }}>
                      Web Admin
                    </div>
                    <div style={{ fontSize: '0.66rem', color: '#64748b', lineHeight: '1.4' }}>
                      Dashboard & Manajemen
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.68rem', color: '#d4af37', fontWeight: '700' }}>
                    <span>Masuk</span>
                    <ChevronRight size={12} />
                  </div>
                </button>

                {/* POS MOBILE CARD */}
                <button
                  type="button"
                  onClick={() => handleModeSelect('mobile')}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px',
                    padding: '24px 16px',
                    borderRadius: '18px',
                    border: '1.5px solid rgba(56,189,248,0.2)',
                    background: 'linear-gradient(145deg, rgba(56,189,248,0.07) 0%, rgba(99,102,241,0.04) 100%)',
                    cursor: 'pointer',
                    transition: 'all 0.25s ease',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = 'rgba(56,189,248,0.5)';
                    e.currentTarget.style.background = 'linear-gradient(145deg, rgba(56,189,248,0.14) 0%, rgba(99,102,241,0.08) 100%)';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = 'rgba(56,189,248,0.2)';
                    e.currentTarget.style.background = 'linear-gradient(145deg, rgba(56,189,248,0.07) 0%, rgba(99,102,241,0.04) 100%)';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  <div style={{
                    width: '52px', height: '52px', borderRadius: '14px',
                    background: 'linear-gradient(135deg, rgba(56,189,248,0.18), rgba(99,102,241,0.1))',
                    border: '1px solid rgba(56,189,248,0.25)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: '0 4px 16px rgba(56,189,248,0.08)',
                  }}>
                    <Smartphone size={24} color="#38bdf8" />
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontWeight: '800', fontSize: '0.88rem', color: '#e0f2fe', marginBottom: '4px' }}>
                      POS Mobile
                    </div>
                    <div style={{ fontSize: '0.66rem', color: '#64748b', lineHeight: '1.4' }}>
                      Kasir Tablet APK
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.68rem', color: '#38bdf8', fontWeight: '700' }}>
                    <span>Masuk</span>
                    <ChevronRight size={12} />
                  </div>
                </button>
              </div>

              <div style={{ marginTop: '20px', textAlign: 'center', fontSize: '0.68rem', color: '#334155', letterSpacing: '0.05em' }}>
                🔒 Dilindungi Enkripsi AES-256 · Data Tersimpan Aman
              </div>
            </div>
          )}

          {/* ======= FORM WEB BASED ADMIN ======= */}
          {mode === 'admin' && (
            <div style={{ animation: 'fadeSlideIn 0.35s ease' }}>
              {/* Header mode */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px',
                padding: '12px 16px',
                background: 'linear-gradient(135deg, rgba(212,175,55,0.1), rgba(212,175,55,0.04))',
                borderRadius: '12px',
                border: '1px solid rgba(212,175,55,0.2)',
              }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(212,175,55,0.15)', border: '1px solid rgba(212,175,55,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Monitor size={18} color="#d4af37" />
                </div>
                <div>
                  <div style={{ fontSize: '0.88rem', fontWeight: '800', color: '#f8f0d0' }}>Portal Web Based Admin</div>
                  <div style={{ fontSize: '0.68rem', color: '#64748b' }}>Dashboard & Manajemen Restoran</div>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* USERNAME SELECT */}
                <div>
                  <label style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: '700', display: 'block', marginBottom: '8px', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                    Username
                  </label>
                  <div style={{ position: 'relative' }}>
                    <select
                      value={selectedUsername}
                      onChange={e => { setSelectedUsername(e.target.value); setError(''); }}
                      style={{
                        width: '100%', padding: '12px 16px',
                        borderRadius: '12px',
                        border: selectedUsername ? '1.5px solid rgba(212,175,55,0.5)' : '1.5px solid rgba(255,255,255,0.08)',
                        background: 'rgba(255,255,255,0.04)',
                        color: selectedUsername ? '#f8f0d0' : '#475569',
                        fontSize: '0.88rem', outline: 'none', cursor: 'pointer',
                        appearance: 'none', boxSizing: 'border-box',
                        transition: 'border-color 0.2s',
                      }}
                    >
                      <option value="" style={{ background: '#1e293b', color: '#64748b' }}>— Pilih Username —</option>
                      {adminUsers.map(u => (
                        <option key={u.id} value={u.username} style={{ background: '#1e293b', color: '#f8fafc' }}>
                          {u.username} · {u.name} ({u.role})
                        </option>
                      ))}
                    </select>
                    <ChevronRight size={14} color="#64748b" style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%) rotate(90deg)', pointerEvents: 'none' }} />
                  </div>

                  {/* User badge */}
                  {selectedUser && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px', padding: '8px 12px', background: 'rgba(212,175,55,0.08)', borderRadius: '8px', border: '1px solid rgba(212,175,55,0.15)' }}>
                      <span style={{ fontSize: '1rem' }}>{ROLE_ICONS[selectedUser.role] || '👤'}</span>
                      <div>
                        <div style={{ fontSize: '0.78rem', fontWeight: '700', color: '#f8f0d0' }}>{selectedUser.name}</div>
                        <div style={{ fontSize: '0.65rem', color: '#d4af37' }}>{selectedUser.role} · {selectedUser.outlet}</div>
                      </div>
                    </div>
                  )}
                </div>

                {/* PASSWORD */}
                <div>
                  <label style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: '700', display: 'block', marginBottom: '8px', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                    Password Web Admin
                  </label>
                  <div style={{ position: 'relative' }}>
                    <div style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }}>
                      <Lock size={15} color="#64748b" />
                    </div>
                    <input
                      type={showPass ? 'text' : 'password'}
                      placeholder="Masukkan password..."
                      value={password}
                      onChange={e => { setPassword(e.target.value); setError(''); }}
                      onKeyDown={e => e.key === 'Enter' && handleLogin()}
                      style={{
                        width: '100%', padding: '12px 44px 12px 42px',
                        borderRadius: '12px',
                        border: password ? '1.5px solid rgba(212,175,55,0.4)' : '1.5px solid rgba(255,255,255,0.08)',
                        background: 'rgba(255,255,255,0.04)',
                        color: '#f8fafc', fontSize: '0.9rem', outline: 'none',
                        boxSizing: 'border-box', letterSpacing: showPass ? 'normal' : '0.1em',
                        transition: 'border-color 0.2s',
                      }}
                    />
                    <button type="button" onClick={() => setShowPass(v => !v)}
                      style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: 0 }}>
                      {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>
              </div>

              {/* ERROR */}
              {error && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '10px', padding: '10px 14px', color: '#fca5a5', fontSize: '0.8rem', marginTop: '14px' }}>
                  <AlertCircle size={14} /> {error}
                </div>
              )}

              {/* LOGIN BUTTON */}
              <button
                type="button"
                onClick={handleLogin}
                disabled={isLoading}
                style={{
                  width: '100%', padding: '14px', marginTop: '20px',
                  borderRadius: '14px', border: 'none',
                  background: isLoading
                    ? 'rgba(212,175,55,0.3)'
                    : 'linear-gradient(135deg, #d4af37 0%, #b8963e 50%, #d4af37 100%)',
                  backgroundSize: '200% auto',
                  color: '#1a0a2e', fontSize: '0.92rem', fontWeight: '900',
                  cursor: isLoading ? 'wait' : 'pointer',
                  boxShadow: isLoading ? 'none' : '0 8px 24px rgba(212,175,55,0.3)',
                  transition: 'all 0.3s ease',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                  letterSpacing: '0.02em',
                }}
              >
                {isLoading ? (
                  <><div style={{ width: '16px', height: '16px', border: '2px solid rgba(26,10,46,0.3)', borderTopColor: '#1a0a2e', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} /> Memverifikasi...</>
                ) : (
                  <>💻 Masuk ke Dashboard Admin</>
                )}
              </button>

              <button type="button" onClick={() => handleModeSelect(null)}
                style={{ background: 'none', border: 'none', color: '#475569', fontSize: '0.78rem', cursor: 'pointer', marginTop: '14px', display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 0' }}>
                <ArrowLeft size={13} /> Kembali ke pilihan akses
              </button>
            </div>
          )}

          {/* ======= FORM POS MOBILE APK ======= */}
          {mode === 'mobile' && (
            <div style={{ animation: 'fadeSlideIn 0.35s ease' }}>
              {/* Header mode */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px',
                padding: '12px 16px',
                background: 'linear-gradient(135deg, rgba(56,189,248,0.1), rgba(99,102,241,0.05))',
                borderRadius: '12px',
                border: '1px solid rgba(56,189,248,0.2)',
              }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(56,189,248,0.15)', border: '1px solid rgba(56,189,248,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Smartphone size={18} color="#38bdf8" />
                </div>
                <div>
                  <div style={{ fontSize: '0.88rem', fontWeight: '800', color: '#e0f2fe' }}>Portal POS Mobile APK</div>
                  <div style={{ fontSize: '0.68rem', color: '#64748b' }}>Kasir Tablet POS Restoran</div>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* OUTLET SELECT */}
                <div>
                  <label style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: '700', display: 'block', marginBottom: '8px', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                    Nama Outlet
                  </label>
                  <div style={{ position: 'relative' }}>
                    <div style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }}>
                      <Store size={15} color="#64748b" />
                    </div>
                    <select
                      value={selectedOutlet}
                      onChange={e => { setSelectedOutlet(e.target.value); setSelectedUsername(''); setError(''); }}
                      style={{
                        width: '100%', padding: '12px 44px 12px 42px',
                        borderRadius: '12px',
                        border: selectedOutlet ? '1.5px solid rgba(56,189,248,0.5)' : '1.5px solid rgba(255,255,255,0.08)',
                        background: 'rgba(255,255,255,0.04)',
                        color: selectedOutlet ? '#e0f2fe' : '#475569',
                        fontSize: '0.88rem', outline: 'none', cursor: 'pointer',
                        appearance: 'none', boxSizing: 'border-box',
                      }}
                    >
                      <option value="" style={{ background: '#1e293b', color: '#64748b' }}>— Pilih Outlet —</option>
                      {mobileOutlets.map((o, idx) => (
                        <option key={idx} value={o} style={{ background: '#1e293b', color: '#f8fafc' }}>{o}</option>
                      ))}
                    </select>
                    <ChevronRight size={14} color="#64748b" style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%) rotate(90deg)', pointerEvents: 'none' }} />
                  </div>
                </div>

                {/* USERNAME SELECT (muncul setelah outlet dipilih) */}
                {selectedOutlet && (
                  <div style={{ animation: 'fadeSlideIn 0.25s ease' }}>
                    <label style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: '700', display: 'block', marginBottom: '8px', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                      Username Kasir
                    </label>
                    <div style={{ position: 'relative' }}>
                      <select
                        value={selectedUsername}
                        onChange={e => { setSelectedUsername(e.target.value); setError(''); }}
                        style={{
                          width: '100%', padding: '12px 44px 12px 16px',
                          borderRadius: '12px',
                          border: selectedUsername ? '1.5px solid rgba(56,189,248,0.5)' : '1.5px solid rgba(255,255,255,0.08)',
                          background: 'rgba(255,255,255,0.04)',
                          color: selectedUsername ? '#e0f2fe' : '#475569',
                          fontSize: '0.88rem', outline: 'none', cursor: 'pointer',
                          appearance: 'none', boxSizing: 'border-box',
                        }}
                      >
                        <option value="" style={{ background: '#1e293b', color: '#64748b' }}>— Pilih Username —</option>
                        {mobileUsersForOutlet.map(u => (
                          <option key={u.id} value={u.username} style={{ background: '#1e293b', color: '#f8fafc' }}>
                            {u.username} · {u.name} ({u.role})
                          </option>
                        ))}
                      </select>
                      <ChevronRight size={14} color="#64748b" style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%) rotate(90deg)', pointerEvents: 'none' }} />
                    </div>

                    {selectedUser && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px', padding: '8px 12px', background: 'rgba(56,189,248,0.08)', borderRadius: '8px', border: '1px solid rgba(56,189,248,0.15)' }}>
                        <span style={{ fontSize: '1rem' }}>{ROLE_ICONS[selectedUser.role] || '👤'}</span>
                        <div>
                          <div style={{ fontSize: '0.78rem', fontWeight: '700', color: '#e0f2fe' }}>{selectedUser.name}</div>
                          <div style={{ fontSize: '0.65rem', color: '#38bdf8' }}>{selectedUser.role}</div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* PASSWORD (muncul setelah username dipilih) */}
                {selectedUsername && (
                  <div style={{ animation: 'fadeSlideIn 0.25s ease' }}>
                    <label style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: '700', display: 'block', marginBottom: '8px', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                      Password POS Mobile
                    </label>
                    <div style={{ position: 'relative' }}>
                      <div style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }}>
                        <Lock size={15} color="#64748b" />
                      </div>
                      <input
                        type={showPass ? 'text' : 'password'}
                        placeholder="Masukkan password mobile..."
                        value={password}
                        onChange={e => { setPassword(e.target.value); setError(''); }}
                        onKeyDown={e => e.key === 'Enter' && handleLogin()}
                        style={{
                          width: '100%', padding: '12px 44px 12px 42px',
                          borderRadius: '12px',
                          border: password ? '1.5px solid rgba(56,189,248,0.45)' : '1.5px solid rgba(255,255,255,0.08)',
                          background: 'rgba(255,255,255,0.04)',
                          color: '#f8fafc', fontSize: '0.9rem', outline: 'none',
                          boxSizing: 'border-box', letterSpacing: showPass ? 'normal' : '0.1em',
                        }}
                      />
                      <button type="button" onClick={() => setShowPass(v => !v)}
                        style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: 0 }}>
                        {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* ERROR */}
              {error && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '10px', padding: '10px 14px', color: '#fca5a5', fontSize: '0.8rem', marginTop: '14px' }}>
                  <AlertCircle size={14} /> {error}
                </div>
              )}

              {/* LOGIN BUTTON */}
              <button
                type="button"
                onClick={handleLogin}
                disabled={isLoading || !selectedOutlet || !selectedUsername || !password}
                style={{
                  width: '100%', padding: '14px', marginTop: '20px',
                  borderRadius: '14px', border: 'none',
                  background: (!selectedOutlet || !selectedUsername || !password)
                    ? 'rgba(56,189,248,0.15)'
                    : isLoading
                    ? 'rgba(56,189,248,0.3)'
                    : 'linear-gradient(135deg, #0ea5e9 0%, #2563eb 50%, #0ea5e9 100%)',
                  color: (!selectedOutlet || !selectedUsername || !password) ? '#475569' : '#ffffff',
                  fontSize: '0.92rem', fontWeight: '900',
                  cursor: (!selectedOutlet || !selectedUsername || !password) ? 'not-allowed' : isLoading ? 'wait' : 'pointer',
                  boxShadow: (!selectedOutlet || !selectedUsername || !password) ? 'none' : '0 8px 24px rgba(14,165,233,0.25)',
                  transition: 'all 0.3s ease',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                }}
              >
                {isLoading ? (
                  <><div style={{ width: '16px', height: '16px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} /> Memverifikasi...</>
                ) : (
                  <>📱 Masuk ke POS Kasir</>
                )}
              </button>

              <button type="button" onClick={() => handleModeSelect(null)}
                style={{ background: 'none', border: 'none', color: '#475569', fontSize: '0.78rem', cursor: 'pointer', marginTop: '14px', display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 0' }}>
                <ArrowLeft size={13} /> Kembali ke pilihan akses
              </button>
            </div>
          )}

          {/* FOOTER */}
          <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.05)', textAlign: 'center' }}>
            <div style={{ fontSize: '0.62rem', color: '#334155', letterSpacing: '0.08em' }}>
              © 2026 POS Kasir Barokah · Barokah Group · v3.0.0
            </div>
          </div>
        </div>
      </div>

      {/* CSS ANIMATIONS */}
      <style>{`
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        select option { background: #1e293b !important; }
      `}</style>
    </div>
  );
}
