import React, { useState, useMemo, useEffect } from 'react';
import { Monitor, Lock, Eye, EyeOff, AlertCircle, ChevronRight, Crown, ShieldCheck, BarChart3, Building2 } from 'lucide-react';

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
  const [selectedUsername, setSelectedUsername] = useState('');
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

  const selectedUser = useMemo(() =>
    adminUsers.find(u => u.username === selectedUsername),
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
    }, 500);
  };

  return (
    <div style={{
      minHeight: '100vh',
      width: '100vw',
      background: 'radial-gradient(ellipse at 30% 50%, #0d1322 0%, #080b12 60%, #05070d 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif",
      padding: '24px',
      position: 'relative',
      overflow: 'hidden',
      boxSizing: 'border-box'
    }}>

      {/* BACKGROUND DECORATION */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '10%', left: '5%', width: '500px', height: '500px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(212,175,55,0.07) 0%, transparent 70%)', filter: 'blur(60px)' }} />
        <div style={{ position: 'absolute', bottom: '10%', right: '5%', width: '600px', height: '600px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.09) 0%, transparent 70%)', filter: 'blur(70px)' }} />
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'linear-gradient(rgba(212,175,55,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(212,175,55,0.02) 1px, transparent 1px)',
          backgroundSize: '60px 60px'
        }} />
      </div>

      {/* MAIN CONTAINER (SPLIT 50/50) */}
      <div style={{
        width: '100%',
        maxWidth: '1100px',
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '40px',
        alignItems: 'center',
        opacity: mounted ? 1 : 0,
        transform: mounted ? 'translateY(0)' : 'translateY(24px)',
        transition: 'all 0.6s cubic-bezier(0.16,1,0.3,1)',
        position: 'relative',
        zIndex: 1
      }}>

        {/* LEFT PANEL: HERO BRANDING */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '20px' }}>
          {/* Glowing Crown Emblem */}
          <div style={{
            width: '110px', height: '110px',
            borderRadius: '28px',
            background: 'linear-gradient(135deg, rgba(212,175,55,0.2) 0%, rgba(212,175,55,0.04) 100%)',
            border: '1.5px solid rgba(212,175,55,0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: '28px',
            boxShadow: '0 20px 50px rgba(212,175,55,0.2), inset 0 0 25px rgba(212,175,55,0.1)',
            position: 'relative'
          }}>
            <Crown size={54} color="#d4af37" />
          </div>

          {/* Title */}
          <h1 style={{
            fontSize: '2.4rem', fontWeight: '900', letterSpacing: '-0.5px', margin: '0 0 8px 0',
            background: 'linear-gradient(135deg, #ffffff 0%, #f8f0d0 40%, #d4af37 100%)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}>
            BAROKAH GROUP
          </h1>

          <p style={{ color: '#94a3b8', fontSize: '0.95rem', margin: '0 0 32px 0', fontWeight: '500', maxWidth: '380px', lineHeight: '1.5' }}>
            Enterprise Restaurant &amp; Financial Management System
          </p>

          {/* Feature Badges */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', justifyContent: 'center' }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: '8px', padding: '9px 16px',
              borderRadius: '20px', background: 'rgba(212,175,55,0.08)', border: '1px solid rgba(212,175,55,0.2)',
              color: '#f8f0d0', fontSize: '0.80rem', fontWeight: '700'
            }}>
              <BarChart3 size={15} color="#d4af37" />
              Laporan Real-Time
            </div>

            <div style={{
              display: 'flex', alignItems: 'center', gap: '8px', padding: '9px 16px',
              borderRadius: '20px', background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.25)',
              color: '#c7d2fe', fontSize: '0.80rem', fontWeight: '700'
            }}>
              <ShieldCheck size={15} color="#818cf8" />
              Keamanan Data Master
            </div>

            <div style={{
              display: 'flex', alignItems: 'center', gap: '8px', padding: '9px 16px',
              borderRadius: '20px', background: 'rgba(212,175,55,0.08)', border: '1px solid rgba(212,175,55,0.2)',
              color: '#f8f0d0', fontSize: '0.80rem', fontWeight: '700'
            }}>
              <Building2 size={15} color="#d4af37" />
              Konsolidasi Multi-Cabang
            </div>
          </div>
        </div>

        {/* RIGHT PANEL: GLASS FORM CARD */}
        <div style={{ position: 'relative' }}>
          {/* Card Border Glow */}
          <div style={{
            position: 'absolute', inset: '-1px', borderRadius: '28px',
            background: 'linear-gradient(135deg, rgba(212,175,55,0.5), rgba(99,102,241,0.25), rgba(212,175,55,0.1))',
            padding: '1px', zIndex: 0
          }} />

          {/* Card Body */}
          <div style={{
            position: 'relative', zIndex: 1,
            background: 'rgba(15, 23, 42, 0.92)',
            backdropFilter: 'blur(24px)',
            borderRadius: '28px', padding: '40px 36px',
            boxShadow: '0 30px 70px rgba(0,0,0,0.6), 0 0 50px rgba(212,175,55,0.05)'
          }}>

            {/* Header */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '28px',
              paddingBottom: '20px', borderBottom: '1px solid rgba(255,255,255,0.08)'
            }}>
              <div style={{
                width: '46px', height: '46px', borderRadius: '14px',
                background: 'linear-gradient(135deg, rgba(212,175,55,0.2), rgba(212,175,55,0.05))',
                border: '1.5px solid rgba(212,175,55,0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <Monitor size={22} color="#d4af37" />
              </div>
              <div>
                <h2 style={{ margin: '0 0 2px 0', fontSize: '1.15rem', fontWeight: '900', color: '#ffffff' }}>
                  Portal Web Based Admin
                </h2>
                <p style={{ margin: 0, fontSize: '0.78rem', color: '#94a3b8' }}>
                  Masuk ke Dashboard Restoran &amp; Keuangan
                </p>
              </div>
            </div>

            {/* Form */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              {/* Username Dropdown */}
              <div>
                <label style={{ fontSize: '0.74rem', color: '#cbd5e1', fontWeight: '800', display: 'block', marginBottom: '8px', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                  Username / Akun Admin
                </label>
                <div style={{ position: 'relative' }}>
                  <select
                    value={selectedUsername}
                    onChange={e => { setSelectedUsername(e.target.value); setError(''); }}
                    style={{
                      width: '100%', padding: '13px 16px',
                      borderRadius: '12px',
                      border: selectedUsername ? '1.5px solid #d4af37' : '1.5px solid #334155',
                      background: '#0f172a',
                      color: selectedUsername ? '#f8f0d0' : '#94a3b8',
                      fontSize: '0.90rem', outline: 'none', cursor: 'pointer',
                      appearance: 'none', boxSizing: 'border-box',
                      fontWeight: '700'
                    }}
                  >
                    <option value="" style={{ background: '#0f172a', color: '#64748b' }}>— Pilih Username —</option>
                    {adminUsers.map(u => (
                      <option key={u.id} value={u.username} style={{ background: '#0f172a', color: '#f8fafc' }}>
                        @{u.username} — {u.name} ({u.role})
                      </option>
                    ))}
                  </select>
                  <ChevronRight size={16} color="#94a3b8" style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%) rotate(90deg)', pointerEvents: 'none' }} />
                </div>

                {selectedUser && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px', padding: '8px 12px', background: 'rgba(212,175,55,0.08)', borderRadius: '8px', border: '1px solid rgba(212,175,55,0.2)' }}>
                    <span style={{ fontSize: '1rem' }}>{ROLE_ICONS[selectedUser.role] || '👤'}</span>
                    <div>
                      <div style={{ fontSize: '0.78rem', fontWeight: '800', color: '#f8f0d0' }}>{selectedUser.name}</div>
                      <div style={{ fontSize: '0.66rem', color: '#d4af37' }}>{selectedUser.role} · {selectedUser.outlet}</div>
                    </div>
                  </div>
                )}
              </div>

              {/* Password */}
              <div>
                <label style={{ fontSize: '0.74rem', color: '#cbd5e1', fontWeight: '800', display: 'block', marginBottom: '8px', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                  Password
                </label>
                <div style={{ position: 'relative' }}>
                  <div style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }}>
                    <Lock size={16} color="#94a3b8" />
                  </div>
                  <input
                    type={showPass ? 'text' : 'password'}
                    placeholder="Masukkan password admin..."
                    value={password}
                    onChange={e => { setPassword(e.target.value); setError(''); }}
                    onKeyDown={e => e.key === 'Enter' && handleLogin()}
                    style={{
                      width: '100%', padding: '13px 44px 13px 42px',
                      borderRadius: '12px',
                      border: password ? '1.5px solid #d4af37' : '1.5px solid #334155',
                      background: '#0f172a',
                      color: '#f8fafc', fontSize: '0.92rem', outline: 'none',
                      boxSizing: 'border-box', letterSpacing: showPass ? 'normal' : '0.12em',
                      fontWeight: '600'
                    }}
                  />
                  <button type="button" onClick={() => setShowPass(v => !v)}
                    style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 0 }}>
                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '10px', padding: '10px 14px', color: '#fca5a5', fontSize: '0.82rem', marginTop: '16px', fontWeight: '600' }}>
                <AlertCircle size={15} /> {error}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="button"
              onClick={handleLogin}
              disabled={isLoading}
              style={{
                width: '100%', padding: '14px', marginTop: '24px',
                borderRadius: '12px', border: 'none',
                background: isLoading
                  ? 'rgba(212,175,55,0.3)'
                  : 'linear-gradient(135deg, #d4af37 0%, #b8963e 50%, #d4af37 100%)',
                color: '#0f172a', fontSize: '0.95rem', fontWeight: '900',
                cursor: isLoading ? 'wait' : 'pointer',
                boxShadow: isLoading ? 'none' : '0 8px 25px rgba(212,175,55,0.35)',
                transition: 'all 0.25s ease',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                letterSpacing: '0.03em'
              }}
            >
              {isLoading ? (
                <><div style={{ width: '16px', height: '16px', border: '2px solid #0f172a', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} /> Memverifikasi...</>
              ) : (
                <>MASUK KE DASHBOARD ADMIN →</>
              )}
            </button>

            {/* Security Footer */}
            <div style={{ marginTop: '20px', textAlign: 'center', fontSize: '0.70rem', color: '#64748b', fontWeight: '600', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
              🔒 SSL 256-Bit Encrypted Connection · Barokah Group ERP
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
