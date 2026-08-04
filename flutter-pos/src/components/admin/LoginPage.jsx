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
import { getThemePalette } from '../../utils/themeUtils';

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

export default function LoginPage({ onLoginSuccess, masterData, themeMode = 'dark' }) {
  const T = getThemePalette(themeMode);
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
      background: T.pageBg,
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
        background: T.cardBg,
        border: `1px solid ${T.accentGoldBorder}`,
        borderRadius: '24px',
        padding: '32px 28px',
        boxShadow: T.shadowLg,
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
            background: `radial-gradient(circle, ${T.accentGoldBg} 0%, ${T.cardBg} 100%)`,
            border: `2px solid ${T.accentGold}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: `0 0 20px ${T.accentGoldBg}`
          }}>
            <Utensils size={28} color={T.accentGold} />
          </div>
          <div style={{
            position: 'absolute',
            top: '-2px',
            right: '-2px',
            width: '20px',
            height: '20px',
            borderRadius: '50%',
            background: T.accentGold,
            border: `1.5px solid ${T.accentGoldHover}`,
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
          background: `linear-gradient(135deg, ${T.accentGold} 0%, ${T.warning} 50%, ${T.accentGold} 100%)`,
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
          color: T.txtSecondary,
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
          background: T.accentGold,
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
          background: T.accentGoldBg,
          border: `1px solid ${T.accentGoldBorder}`,
          marginBottom: '20px',
          boxSizing: 'border-box'
        }}>
          <div style={{
            width: '34px',
            height: '34px',
            borderRadius: '10px',
            background: T.accentGoldBg,
            border: `1px solid ${T.accentGoldBorder}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <Monitor size={17} color={T.accentGold} />
          </div>
          <div>
            <div style={{ fontSize: '0.82rem', fontWeight: '800', color: T.txtPrimary }}>
              Portal Web Based Admin
            </div>
            <div style={{ fontSize: '0.68rem', color: T.txtSecondary }}>
              Dashboard &amp; Manajemen Restoran
            </div>
          </div>
        </div>

        {/* FORM CONTAINER */}
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* USERNAME SELECT DROPDOWN */}
          <div>
            <label style={{ fontSize: '0.72rem', color: T.txtSecondary, fontWeight: '700', display: 'block', marginBottom: '6px', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
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
                  border: selectedUsername ? `1.5px solid ${T.accentGold}` : `1.5px solid ${T.border}`,
                  background: T.inputBg,
                  color: selectedUsername ? T.txtPrimary : T.txtMuted,
                  fontSize: '0.88rem',
                  outline: 'none',
                  cursor: 'pointer',
                  appearance: 'none',
                  boxSizing: 'border-box',
                  fontWeight: '700'
                }}
              >
                {adminUsers.map(u => (
                  <option key={u.id} value={u.username} style={{ background: T.cardBg, color: T.txtPrimary }}>
                    {u.username} · {u.name} ({u.role})
                  </option>
                ))}
              </select>
              <ChevronRight size={14} color={T.txtMuted} style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%) rotate(90deg)', pointerEvents: 'none' }} />
            </div>

            {/* SELECTED USER CARD */}
            {selectedUser && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginTop: '8px',
                padding: '8px 12px',
                background: T.accentGoldBg,
                borderRadius: '8px',
                border: `1px solid ${T.accentGoldBorder}`
              }}>
                <span style={{ fontSize: '1rem' }}>{ROLE_ICONS[selectedUser.role] || '👤'}</span>
                <div>
                  <div style={{ fontSize: '0.78rem', fontWeight: '700', color: T.txtPrimary }}>{selectedUser.name}</div>
                  <div style={{ fontSize: '0.65rem', color: T.accentGold }}>{selectedUser.role} · {selectedUser.outlet}</div>
                </div>
              </div>
            )}
          </div>

          {/* PASSWORD WEB ADMIN */}
          <div>
            <label style={{ fontSize: '0.72rem', color: T.txtSecondary, fontWeight: '700', display: 'block', marginBottom: '6px', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              PASSWORD WEB ADMIN
            </label>
            <div style={{ position: 'relative' }}>
              <div style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }}>
                <Lock size={15} color={T.txtMuted} />
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
                  border: password ? `1.5px solid ${T.accentGold}` : `1.5px solid ${T.border}`,
                  background: T.inputBg,
                  color: T.txtPrimary,
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
                  color: T.txtMuted,
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
              background: T.dangerBg,
              border: `1px solid ${T.dangerBorder}`,
              borderRadius: '10px',
              padding: '10px 14px',
              color: T.danger,
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
                ? T.accentGoldBg
                : T.primaryBtn,
              color: T.navActiveTxt,
              fontSize: '0.92rem',
              fontWeight: '900',
              cursor: isLoading ? 'wait' : 'pointer',
              boxShadow: isLoading ? 'none' : `0 8px 24px ${T.primaryBtnShadow}`,
              transition: 'all 0.3s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            {isLoading ? (
              <><div style={{ width: '16px', height: '16px', border: `2px solid ${T.navActiveTxt}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} /> Memverifikasi...</>
            ) : (
              <>💻 Masuk ke Dashboard Admin</>
            )}
          </button>
        </div>

        {/* FOOTER */}
        <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: `1px solid ${T.border}`, textAlign: 'center', width: '100%' }}>
          <div style={{ fontSize: '0.68rem', color: T.txtMuted, letterSpacing: '0.08em' }}>
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
        select option { background: ${T.cardBg} !important; color: ${T.txtPrimary} !important; }
      `}</style>
    </div>
  );
}
