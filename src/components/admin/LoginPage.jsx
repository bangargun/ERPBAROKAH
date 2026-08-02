import React, { useState, useMemo, useEffect } from 'react';
import { 
  Monitor, 
  Lock, 
  Eye, 
  EyeOff, 
  AlertCircle, 
  ChevronRight, 
  Utensils, 
  Crown 
} from 'lucide-react';

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

  // Prioritas fallback berlapis: webAdminAccounts → userRights → users → DEFAULT
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
      background: 'radial-gradient(ellipse at center, #0f172a 0%, #080c16 60%, #04060b 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif",
      padding: '20px',
      boxSizing: 'border-box'
    }}>

      {/* CENTER CARD - 100% PRESERVED EXACT DESIGN FROM USER SCREENSHOT */}
      <div style={{
        width: '100%',
        maxWidth: '440px',
        background: 'rgba(15, 23, 42, 0.94)',
        border: '1px solid rgba(212, 175, 55, 0.3)',
        borderRadius: '24px',
        padding: '32px 28px',
        boxShadow: '0 25px 60px rgba(0,0,0,0.65), 0 0 35px rgba(212, 175, 55, 0.12)',
        backdropFilter: 'blur(20px)',
        opacity: mounted ? 1 : 0,
        transform: mounted ? 'translateY(0)' : 'translateY(16px)',
        transition: 'all 0.4s cubic-bezier(0.16,1,0.3,1)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center'
      }}>

        {/* LOGO EMBLEM CIRCLE WITH CROWN BADGE */}
        <div style={{ position: 'relative', marginBottom: '16px' }}>
          <div style={{
            width: '68px',
            height: '68px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(212,175,55,0.18) 0%, rgba(15,23,42,0.9) 100%)',
            border: '2px solid #d4af37',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 20px rgba(212,175,55,0.3)'
          }}>
            <Utensils size={28} color="#ffffff" />
          </div>
          <div style={{
            position: 'absolute',
            top: '-2px',
            right: '-2px',
            width: '20px',
            height: '20px',
            borderRadius: '50%',
            background: '#d97706',
            border: '1.5px solid #fbbf24',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '0.65rem'
          }}>
            👑
          </div>
        </div>

        {/* BRAND TITLE */}
        <div style={{
          fontSize: '1.65rem',
          fontWeight: '900',
          background: 'linear-gradient(135deg, #d4af37 0%, #f8f0d0 50%, #d4af37 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          marginBottom: '2px',
          letterSpacing: '-0.3px'
        }}>
          MRIS Restoran
        </div>

        <div style={{
          fontSize: '0.66rem',
          color: '#94a3b8',
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          fontWeight: '700',
          marginBottom: '16px'
        }}>
          MULTI RESTAURANT INFORMATION SYSTEM
        </div>

        {/* SINGLE GOLD SEPARATOR DOT */}
        <div style={{
          width: '5px',
          height: '5px',
          borderRadius: '50%',
          background: '#d4af37',
          marginBottom: '20px'
        }} />

        {/* PORTAL BANNER CARD */}
        <div style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '12px 14px',
          borderRadius: '12px',
          background: 'rgba(212,175,55,0.08)',
          border: '1px solid rgba(212,175,55,0.2)',
          marginBottom: '20px',
          boxSizing: 'border-box'
        }}>
          <div style={{
            width: '34px',
            height: '34px',
            borderRadius: '10px',
            background: 'rgba(212,175,55,0.15)',
            border: '1px solid rgba(212,175,55,0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <Monitor size={17} color="#d4af37" />
          </div>
          <div>
            <div style={{ fontSize: '0.82rem', fontWeight: '800', color: '#f8f0d0' }}>
              Portal Web Based Admin
            </div>
            <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>
              Dashboard &amp; Manajemen Restoran
            </div>
          </div>
        </div>

        {/* FORM CONTAINER */}
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* USERNAME SELECT DROPDOWN */}
          <div>
            <label style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: '700', display: 'block', marginBottom: '6px', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              USERNAME
            </label>
            <div style={{ position: 'relative' }}>
              <select
                value={selectedUsername}
                onChange={e => { setSelectedUsername(e.target.value); setError(''); }}
                style={{
                  width: '100%',
                  padding: '12px 44px 12px 16px',
                  borderRadius: '12px',
                  border: selectedUsername ? '1.5px solid rgba(212,175,55,0.5)' : '1.5px solid rgba(255,255,255,0.08)',
                  background: 'rgba(255,255,255,0.04)',
                  color: selectedUsername ? '#f8f0d0' : '#475569',
                  fontSize: '0.88rem',
                  outline: 'none',
                  cursor: 'pointer',
                  appearance: 'none',
                  boxSizing: 'border-box',
                  fontWeight: '700'
                }}
              >
                {adminUsers.map(u => (
                  <option key={u.id} value={u.username} style={{ background: '#1e293b', color: '#f8fafc' }}>
                    {u.username} · {u.name} ({u.role})
                  </option>
                ))}
              </select>
              <ChevronRight size={14} color="#64748b" style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%) rotate(90deg)', pointerEvents: 'none' }} />
            </div>

            {/* SELECTED USER CARD */}
            {selectedUser && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginTop: '8px',
                padding: '8px 12px',
                background: 'rgba(212,175,55,0.08)',
                borderRadius: '8px',
                border: '1px solid rgba(212,175,55,0.15)'
              }}>
                <span style={{ fontSize: '1rem' }}>{ROLE_ICONS[selectedUser.role] || '👤'}</span>
                <div>
                  <div style={{ fontSize: '0.78rem', fontWeight: '700', color: '#f8f0d0' }}>{selectedUser.name}</div>
                  <div style={{ fontSize: '0.65rem', color: '#d4af37' }}>{selectedUser.role} · {selectedUser.outlet}</div>
                </div>
              </div>
            )}
          </div>

          {/* PASSWORD WEB ADMIN */}
          <div>
            <label style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: '700', display: 'block', marginBottom: '6px', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              PASSWORD WEB ADMIN
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
                  width: '100%',
                  padding: '12px 44px 12px 42px',
                  borderRadius: '12px',
                  border: password ? '1.5px solid rgba(212,175,55,0.45)' : '1.5px solid rgba(255,255,255,0.08)',
                  background: 'rgba(255,255,255,0.04)',
                  color: '#f8fafc',
                  fontSize: '0.9rem',
                  outline: 'none',
                  boxSizing: 'border-box',
                  letterSpacing: showPass ? 'normal' : '0.1em',
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
                  color: '#64748b',
                  padding: 0
                }}
              >
                {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          {/* ERROR ALERT */}
          {error && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: 'rgba(239,68,68,0.1)',
              border: '1px solid rgba(239,68,68,0.25)',
              borderRadius: '10px',
              padding: '10px 14px',
              color: '#fca5a5',
              fontSize: '0.8rem'
            }}>
              <AlertCircle size={14} /> {error}
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
              marginTop: '12px',
              borderRadius: '14px',
              border: 'none',
              background: isLoading
                ? 'rgba(212,175,55,0.3)'
                : 'linear-gradient(135deg, #d4af37 0%, #b8963e 50%, #d4af37 100%)',
              color: '#0f172a',
              fontSize: '0.92rem',
              fontWeight: '900',
              cursor: isLoading ? 'wait' : 'pointer',
              boxShadow: isLoading ? 'none' : '0 8px 24px rgba(212,175,55,0.25)',
              transition: 'all 0.3s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            {isLoading ? (
              <><div style={{ width: '16px', height: '16px', border: '2px solid #0f172a', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} /> Memverifikasi...</>
            ) : (
              <>💻 Masuk ke Dashboard Admin</>
            )}
          </button>
        </div>

        {/* FOOTER */}
        <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.05)', textAlign: 'center', width: '100%' }}>
          <div style={{ fontSize: '0.68rem', color: '#64748b', letterSpacing: '0.08em' }}>
            &copy; 2025 MRIS &bull; Barokah Group &bull; v2.0
          </div>
        </div>

      </div>

      {/* ANIMATIONS */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        select option { background: #1e293b !important; }
      `}</style>
    </div>
  );
}
