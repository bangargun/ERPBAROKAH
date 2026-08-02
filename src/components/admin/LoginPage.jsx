import React, { useState, useMemo, useEffect } from 'react';
import { Monitor, Lock, Eye, EyeOff, AlertCircle, ChevronRight, Utensils, Crown, ShieldCheck } from 'lucide-react';

const DEFAULT_WEB_ADMIN_ACCOUNTS = [
  { id: 1, name: 'Super Admin Restoran', outlet: 'Semua Outlet (Central)', username: 'superadmin', password: '888', role: 'Super Admin', status: 'Aktif' },
  { id: 2, name: 'Owner Restoran', outlet: 'Semua Outlet (Central)', username: 'owner', password: '999', role: 'Owner', status: 'Aktif' }
];

const ROLE_ICONS = {
  'Super Admin': '👑',
  'Owner': '💎',
  'Admin': '🛡️',
  'Kasir': '🏪',
  'Manajer Cabang': '🏢',
};

export default function LoginPage({ onLoginSuccess, masterData }) {
  const [selectedUsername, setSelectedUsername] = useState('superadmin');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setTimeout(() => setMounted(true), 50);
  }, []);

  // Filter Web Admin Accounts
  const webAdminAccounts = useMemo(() => {
    const wa = masterData?.webAdminAccounts;
    if (Array.isArray(wa) && wa.length > 0) return wa;
    const ur = masterData?.userRights;
    if (Array.isArray(ur) && ur.length > 0) return ur;
    const us = masterData?.users;
    if (Array.isArray(us) && us.length > 0) return us;
    return DEFAULT_WEB_ADMIN_ACCOUNTS;
  }, [masterData]);

  const adminUsers = useMemo(() =>
    webAdminAccounts.filter(u => u.status === 'Aktif'),
    [webAdminAccounts]
  );

  // Auto select superadmin on mount
  useEffect(() => {
    if (adminUsers.length > 0 && !selectedUsername) {
      setSelectedUsername(adminUsers[0].username);
    }
  }, [adminUsers, selectedUsername]);

  const selectedUser = useMemo(() =>
    adminUsers.find(u => u.username === selectedUsername) || adminUsers[0],
    [adminUsers, selectedUsername]
  );

  const handleLogin = () => {
    setError('');
    setIsLoading(true);
    setTimeout(() => {
      if (!selectedUsername) {
        setError('Silakan pilih username akun Web Admin.');
        setIsLoading(false);
        return;
      }
      if (!password) {
        setError('Masukkan password.');
        setIsLoading(false);
        return;
      }
      const user = adminUsers.find(u => u.username === selectedUsername);
      if (!user) {
        setError('Username tidak ditemukan atau akun sedang Inaktif.');
        setIsLoading(false);
        return;
      }
      if (user.password !== password) {
        setError('Password Web Admin salah. Periksa kembali.');
        setIsLoading(false);
        return;
      }
      onLoginSuccess && onLoginSuccess(
        { username: user.username, name: user.name, role: user.role, outlet: user.outlet, loggedInAt: new Date().toISOString() },
        'admin'
      );
    }, 400);
  };

  return (
    <div style={{
      minHeight: '100vh',
      width: '100vw',
      background: 'radial-gradient(circle at center, #0f172a 0%, #090d16 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif",
      padding: '24px',
      boxSizing: 'border-box'
    }}>

      {/* CENTERED GLASS FORM CARD (MATCHING USER SCREENSHOT 100%) */}
      <div style={{
        width: '100%',
        maxWidth: '520px',
        background: 'rgba(15, 23, 42, 0.95)',
        border: '1px solid rgba(212, 175, 55, 0.35)',
        borderRadius: '28px',
        padding: '36px 32px',
        boxShadow: '0 25px 60px rgba(0,0,0,0.7), 0 0 35px rgba(212, 175, 55, 0.15)',
        backdropFilter: 'blur(20px)',
        opacity: mounted ? 1 : 0,
        transform: mounted ? 'translateY(0)' : 'translateY(20px)',
        transition: 'all 0.4s ease',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center'
      }}>

        {/* TOP EMBLEM LOGO */}
        <div style={{ position: 'relative', marginBottom: '16px' }}>
          <div style={{
            width: '72px',
            height: '72px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(212,175,55,0.2) 0%, rgba(15,23,42,0.8) 100%)',
            border: '2px solid #d4af37',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 20px rgba(212,175,55,0.3)'
          }}>
            <Utensils size={32} color="#f59e0b" />
          </div>
          <div style={{
            position: 'absolute',
            top: '-4px',
            right: '-4px',
            width: '22px',
            height: '22px',
            borderRadius: '50%',
            background: '#d97706',
            border: '1.5px solid #fbbf24',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '0.70rem'
          }}>
            👑
          </div>
        </div>

        {/* BRAND TITLE */}
        <h1 style={{
          fontSize: '1.8rem',
          fontWeight: '900',
          color: '#f59e0b',
          letterSpacing: '0.02em',
          margin: '0 0 4px 0',
          textAlign: 'center'
        }}>
          MRIS Restoran
        </h1>

        <p style={{
          fontSize: '0.68rem',
          fontWeight: '800',
          color: '#94a3b8',
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          margin: '0 0 16px 0',
          textAlign: 'center'
        }}>
          MULTI RESTAURANT INFORMATION SYSTEM
        </p>

        {/* DIVIDER DOT */}
        <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#d5a832', marginBottom: '20px' }} />

        {/* PORTAL BANNER CARD */}
        <div style={{
          width: '100%',
          padding: '14px 18px',
          borderRadius: '14px',
          background: 'rgba(212, 175, 55, 0.08)',
          border: '1px solid rgba(212, 175, 55, 0.25)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          marginBottom: '24px',
          boxSizing: 'border-box'
        }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '10px',
            background: 'rgba(212, 175, 55, 0.15)',
            border: '1px solid rgba(212, 175, 55, 0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <Monitor size={18} color="#f59e0b" />
          </div>
          <div>
            <div style={{ fontSize: '0.88rem', fontWeight: '800', color: '#f8fafc' }}>
              Portal Web Based Admin
            </div>
            <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '1px' }}>
              Dashboard & Manajemen Restoran
            </div>
          </div>
        </div>

        {/* FORM INPUTS */}
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '18px' }}>
          
          {/* USERNAME DROPDOWN */}
          <div>
            <label style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: '800', display: 'block', marginBottom: '6px', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              USERNAME
            </label>
            <div style={{ position: 'relative' }}>
              <select
                value={selectedUsername}
                onChange={e => { setSelectedUsername(e.target.value); setError(''); }}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: '12px',
                  border: '1.5px solid #334155',
                  background: '#0f172a',
                  color: '#f8fafc',
                  fontSize: '0.88rem',
                  fontWeight: '700',
                  outline: 'none',
                  cursor: 'pointer',
                  appearance: 'none',
                  boxSizing: 'border-box'
                }}
              >
                {adminUsers.map(u => (
                  <option key={u.id} value={u.username} style={{ background: '#0f172a', color: '#f8fafc' }}>
                    {u.username} · {u.name} ({u.role})
                  </option>
                ))}
              </select>
              <ChevronRight size={16} color="#94a3b8" style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%) rotate(90deg)', pointerEvents: 'none' }} />
            </div>

            {/* SELECTED USER CARD BADGE */}
            {selectedUser && (
              <div style={{
                marginTop: '10px',
                padding: '10px 14px',
                borderRadius: '12px',
                background: 'rgba(212, 175, 55, 0.09)',
                border: '1px solid rgba(212, 175, 55, 0.25)',
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
              }}>
                <span style={{ fontSize: '1.1rem' }}>{ROLE_ICONS[selectedUser.role] || '👑'}</span>
                <div>
                  <div style={{ fontSize: '0.82rem', fontWeight: '800', color: '#f59e0b' }}>
                    {selectedUser.name}
                  </div>
                  <div style={{ fontSize: '0.68rem', color: '#d97706', fontWeight: '700' }}>
                    {selectedUser.role} - {selectedUser.outlet}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* PASSWORD WEB ADMIN */}
          <div>
            <label style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: '800', display: 'block', marginBottom: '6px', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              PASSWORD WEB ADMIN
            </label>
            <div style={{ position: 'relative' }}>
              <div style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }}>
                <Lock size={16} color="#94a3b8" />
              </div>
              <input
                type={showPass ? 'text' : 'password'}
                placeholder="Masukkan password..."
                value={password}
                onChange={e => { setPassword(e.target.value); setError(''); }}
                onKeyDown={e => e.key === 'Enter' && handleLogin()}
                style={{
                  width: '100%',
                  padding: '12px 44px 12px 40px',
                  borderRadius: '12px',
                  border: password ? '1.5px solid #d4af37' : '1.5px solid #334155',
                  background: '#0f172a',
                  color: '#f8fafc',
                  fontSize: '0.88rem',
                  fontWeight: '600',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
              <button
                type="button"
                onClick={() => setShowPass(v => !v)}
                style={{
                  position: 'absolute',
                  right: '14px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#94a3b8',
                  padding: 0
                }}
              >
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* ERROR ALERT */}
          {error && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.35)',
              borderRadius: '10px',
              padding: '10px 14px',
              color: '#fca5a5',
              fontSize: '0.82rem',
              fontWeight: '700'
            }}>
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          {/* SUBMIT BUTTON */}
          <button
            type="button"
            onClick={handleLogin}
            disabled={isLoading}
            style={{
              width: '100%',
              padding: '14px',
              marginTop: '8px',
              borderRadius: '14px',
              border: 'none',
              background: isLoading
                ? 'rgba(212,175,55,0.4)'
                : 'linear-gradient(135deg, #d4af37 0%, #ca8a04 100%)',
              color: '#0f172a',
              fontSize: '0.92rem',
              fontWeight: '900',
              cursor: isLoading ? 'wait' : 'pointer',
              boxShadow: '0 8px 24px rgba(212, 175, 55, 0.35)',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            {isLoading ? (
              <span>⏳ Memverifikasi Password...</span>
            ) : (
              <span>💻 Masuk ke Dashboard Admin</span>
            )}
          </button>
        </div>

        {/* SSL FOOTER */}
        <div style={{ marginTop: '24px', fontSize: '0.70rem', color: '#64748b', fontWeight: '600', textAlign: 'center' }}>
          &copy; 2025 MRIS &bull; Barokah Group &bull; v2.0
        </div>

      </div>
    </div>
  );
}
