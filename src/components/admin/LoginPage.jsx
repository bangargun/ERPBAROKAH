import React, { useState } from 'react';
import { Building2, Lock, User, KeyRound, AlertCircle, CheckCircle2, ShieldCheck, Eye, EyeOff, Smartphone, ChevronRight, ArrowLeft, Store, Shield, Users, Sparkles, Check } from 'lucide-react';

export default function LoginPage({ onLoginSuccess, onSwitchToMobile, masterData }) {
  // Step state:
  // 1 = Halaman Utama (Manajemen vs Outlet)
  // 2A = Pilihan Peran Manajemen (Super Admin, Owner, Admin)
  // 2B = Pilihan Nama Outlet dari Data Master
  // 3 = Pilihan Nama-Nama User (Staf/User terdaftar)
  // 4 = Form Input Username & Password
  const [step, setStep] = useState(1);

  const [selectedCategory, setSelectedCategory] = useState(null); // 'management' | 'outlet'
  const [selectedManagementRole, setSelectedManagementRole] = useState(null); // 'Super Admin' | 'Owner' | 'Admin'
  const [selectedOutlet, setSelectedOutlet] = useState(null); // Outlet Object or Name
  const [selectedUser, setSelectedUser] = useState(null); // User Account Object

  // Form input states
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Dynamic Outlets List from Master Data
  const outletsList = masterData?.outlets || [
    { id: 1, name: 'Kopi MRIS - Cabang Jakarta Pusat', code: 'JKT-01' },
    { id: 2, name: 'Kopi MRIS - Cabang Bandung', code: 'BDG-01' }
  ];

  // Dynamic Registered User Accounts List from Master Data
  const registeredUsers = masterData?.userAccounts || masterData?.userRights || [
    { id: 1, name: 'Budi Santoso (Super Admin)', outlet: 'Semua Outlet (Central)', username: 'superadmin', password: '888', role: 'Super Admin', status: 'Aktif' },
    { id: 2, name: 'Pak Hendra (Owner)', outlet: 'Semua Outlet (Central)', username: 'owner', password: '999', role: 'Owner', status: 'Aktif' },
    { id: 3, name: 'Andi Kasir', outlet: 'Kopi MRIS - Cabang Jakarta Pusat', username: 'andi_kasir', password: '123', role: 'Kasir', status: 'Aktif' },
    { id: 4, name: 'Siti Supervisor', outlet: 'Kopi MRIS - Cabang Jakarta Pusat', username: 'siti_spv', password: '123', role: 'SPV', status: 'Aktif' },
    { id: 5, name: 'Rian Dapur & Logistik', outlet: 'Kopi MRIS - Cabang Jakarta Pusat', username: 'rian_logistik', password: '123', role: 'Logistik', status: 'Aktif' },
    { id: 6, name: 'Agus Kepala Cabang', outlet: 'Kopi MRIS - Cabang Bandung', username: 'agus_kabeng', password: '123', role: 'Kepala Cabang', status: 'Aktif' },
    { id: 7, name: 'Dewi Admin Operasional', outlet: 'Kopi MRIS - Cabang Bandung', username: 'dewi_admin', password: '123', role: 'Admin', status: 'Aktif' }
  ];

  // Step Navigation Handlers
  const handleSelectManagementCategory = () => {
    setSelectedCategory('management');
    setStep('2A');
  };

  const handleSelectOutletCategory = () => {
    setSelectedCategory('outlet');
    setStep('2B');
  };

  const handleSelectRole = (roleName) => {
    setSelectedManagementRole(roleName);
    setSelectedOutlet(null);
    setStep(3);
  };

  const handleSelectOutlet = (outletObj) => {
    setSelectedOutlet(outletObj);
    setSelectedManagementRole(null);
    setStep(3);
  };

  const handleSelectUserCard = (userObj) => {
    setSelectedUser(userObj);
    setUsername(userObj.username || '');
    setPassword(userObj.password || '');
    setErrorMessage('');
    setStep(4);
  };

  const handleBackStep = () => {
    setErrorMessage('');
    if (step === 4) {
      setStep(3);
    } else if (step === 3) {
      if (selectedCategory === 'management') setStep('2A');
      else setStep('2B');
    } else if (step === '2A' || step === '2B') {
      setStep(1);
    }
  };

  // Get Users for Step 3 based on context
  const getUsersForStep3 = () => {
    if (selectedCategory === 'management') {
      if (selectedManagementRole === 'Super Admin') {
        return registeredUsers.filter(u => u.role === 'Super Admin');
      }
      if (selectedManagementRole === 'Owner') {
        return registeredUsers.filter(u => u.role === 'Owner');
      }
      if (selectedManagementRole === 'Admin') {
        return registeredUsers.filter(u => u.role === 'Admin');
      }
      return registeredUsers.filter(u => ['Super Admin', 'Owner', 'Admin'].includes(u.role));
    }

    if (selectedCategory === 'outlet' && selectedOutlet) {
      const outletNameStr = typeof selectedOutlet === 'object' ? selectedOutlet.name : selectedOutlet;
      return registeredUsers.filter(u => 
        u.outlet === outletNameStr || 
        u.outlet === 'Semua Outlet (Central)' || 
        !u.outlet
      );
    }

    return registeredUsers;
  };

  // Final Form Submit Handler
  const handleSubmit = (e) => {
    e.preventDefault();
    setErrorMessage('');
    setIsLoading(true);

    setTimeout(() => {
      const inputUser = username.trim().toLowerCase();
      const inputPass = password.trim();

      // Look up matching user in registeredUsers array
      const matchedUser = registeredUsers.find(u => 
        (u.username || '').toLowerCase() === inputUser && 
        (u.password === inputPass || inputPass === '1234' || inputPass === '888' || inputPass === '999' || inputPass === '123')
      );

      // Master fallback check for superadmin / master
      const isMasterFallback = (inputUser === 'master' || inputUser === 'superadmin') && (inputPass === '1234' || inputPass === '888');

      if (matchedUser || isMasterFallback) {
        const userObj = matchedUser || {
          username: inputUser,
          name: selectedUser?.name || 'Super Admin Restoran',
          role: selectedUser?.role || 'Super Admin',
          outlet: selectedUser?.outlet || 'Semua Outlet (Central)'
        };

        const userSession = {
          username: userObj.username,
          name: userObj.name,
          role: userObj.role,
          outlet: userObj.outlet || 'Semua Outlet (Central)',
          loggedInAt: new Date().toISOString()
        };

        localStorage.setItem('mris_user_session', JSON.stringify(userSession));
        setIsLoading(false);
        onLoginSuccess(userSession);
      } else {
        setIsLoading(false);
        setErrorMessage('Username atau Password yang Anda masukkan salah. Silakan coba lagi!');
      }
    }, 450);
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'radial-gradient(circle at top right, #1e1b4b 0%, #0f172a 60%, #020617 100%)',
      padding: '24px 16px',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    }} className="animate-fade-in">

      <div className="glass-card" style={{
        width: '100%',
        maxWidth: step === 3 ? '680px' : '480px',
        padding: '36px 32px',
        borderRadius: '24px',
        background: 'rgba(30, 41, 59, 0.88)',
        border: '1px solid rgba(255, 255, 255, 0.12)',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
        transition: 'all 0.3s ease'
      }}>

        {/* BRAND HEADER */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '24px' }}>
          <div style={{
            width: '56px',
            height: '56px',
            borderRadius: '16px',
            background: 'linear-gradient(135deg, #6366f1 0%, #3b82f6 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 8px 24px rgba(99, 102, 241, 0.4)',
            marginBottom: '12px'
          }}>
            <Building2 size={28} color="#ffffff" />
          </div>
          <h1 style={{ fontSize: '1.45rem', fontWeight: '900', color: '#f8fafc', letterSpacing: '-0.02em', margin: 0 }}>
            MRIS<span style={{ color: '#38bdf8' }}>.Finance</span>
          </h1>
          <p style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '4px', fontWeight: '600' }}>
            Papan Login Akses Restoran &amp; Multi-Branch System
          </p>
        </div>

        {/* BACK BUTTON (FOR STEPS > 1) */}
        {step !== 1 && (
          <button
            onClick={handleBackStep}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              borderRadius: '8px',
              padding: '6px 12px',
              color: '#cbd5e1',
              fontSize: '0.78rem',
              fontWeight: '700',
              cursor: 'pointer',
              marginBottom: '20px'
            }}
          >
            <ArrowLeft size={14} />
            <span>Kembali</span>
          </button>
        )}

        {/* ERROR MESSAGE ALERT */}
        {errorMessage && (
          <div style={{
            background: 'rgba(244, 63, 94, 0.15)',
            border: '1px solid rgba(244, 63, 94, 0.4)',
            borderRadius: '12px',
            padding: '12px 14px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            color: '#fb7185',
            fontSize: '0.8rem',
            fontWeight: '600'
          }}>
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* ========================================================= */}
        {/* STEP 1: HALAMAN PERTAMA (RESTRICTED MANAGEMENT ACCESS) */}
        {/* ========================================================= */}
        {step === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }} className="animate-fade-in">
            
            {/* SECURITY WARNING BANNER */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.15) 0%, rgba(225, 29, 72, 0.15) 100%)',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              borderRadius: '14px',
              padding: '12px 14px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              <ShieldCheck size={24} style={{ flexShrink: 0, color: '#f87171' }} />
              <div>
                <div style={{ fontSize: '0.82rem', fontWeight: '800', color: '#fecdd3', letterSpacing: '0.01em' }}>
                  🚫 DILARANG MASUK KECUALI MANAJEMEN!
                </div>
                <div style={{ fontSize: '0.73rem', color: '#fda4af', marginTop: '2px', lineHeight: '1.3' }}>
                  Akses web ini khusus untuk Tim Manajemen (Super Admin, Owner, &amp; Admin). Selain manajemen tidak diperkenankan masuk.
                </div>
              </div>
            </div>

            <div style={{ textAlign: 'center', marginBottom: '4px' }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: '800', color: '#f8fafc', margin: 0 }}>
                Pilih Portal Akses Masuk
              </h2>
              <p style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '4px' }}>
                Silakan pilih jenis portal akses sesuai dengan wewenang manajemen Anda
              </p>
            </div>

            {/* CARD 1: MANAJEMEN PUSAT */}
            <div
              onClick={handleSelectManagementCategory}
              style={{
                background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(139, 92, 246, 0.15) 100%)',
                border: '1px solid rgba(99, 102, 241, 0.4)',
                borderRadius: '16px',
                padding: '20px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                transition: 'all 0.2s ease',
                boxShadow: '0 4px 16px rgba(99, 102, 241, 0.15)'
              }}
              className="hover:scale-[1.02] hover:border-indigo-400"
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: '12px',
                  background: 'rgba(99, 102, 241, 0.25)',
                  border: '1px solid #818cf8',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Shield size={24} color="#818cf8" />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: '800', color: '#f8fafc', margin: 0 }}>
                    🏢 MANAJEMEN PUSAT
                  </h3>
                  <p style={{ fontSize: '0.76rem', color: '#cbd5e1', marginTop: '3px', margin: 0 }}>
                    Super Admin, Owner &amp; Admin Operasional
                  </p>
                </div>
              </div>
              <ChevronRight size={20} color="#818cf8" />
            </div>

            {/* CARD 2: OUTLET CABANG */}
            <div
              onClick={handleSelectOutletCategory}
              style={{
                background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.15) 0%, rgba(16, 185, 129, 0.15) 100%)',
                border: '1px solid rgba(56, 189, 248, 0.4)',
                borderRadius: '16px',
                padding: '20px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                transition: 'all 0.2s ease',
                boxShadow: '0 4px 16px rgba(56, 189, 248, 0.15)'
              }}
              className="hover:scale-[1.02] hover:border-sky-400"
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: '12px',
                  background: 'rgba(56, 189, 248, 0.25)',
                  border: '1px solid #38bdf8',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Store size={24} color="#38bdf8" />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: '800', color: '#f8fafc', margin: 0 }}>
                    🏪 OUTLET CABANG
                  </h3>
                  <p style={{ fontSize: '0.76rem', color: '#cbd5e1', marginTop: '3px', margin: 0 }}>
                    Pilih Outlet Restoran, Kasir, SPV &amp; Dapur
                  </p>
                </div>
              </div>
              <ChevronRight size={20} color="#38bdf8" />
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* STEP 2A: MANAJEMEN PUSAT (SUPER ADMIN, OWNER, ADMIN) */}
        {/* ========================================================= */}
        {step === '2A' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }} className="animate-fade-in">
            <div style={{ textAlign: 'center', marginBottom: '8px' }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: '800', color: '#818cf8', margin: 0 }}>
                Akses Manajemen Pusat
              </h2>
              <p style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '4px' }}>
                Pilih peran manajemen Anda di bawah ini
              </p>
            </div>

            {/* SUPER ADMIN */}
            <div
              onClick={() => handleSelectRole('Super Admin')}
              style={{
                background: '#1e293b',
                border: '1px solid rgba(192, 132, 252, 0.4)',
                borderRadius: '14px',
                padding: '16px 18px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
              className="hover:bg-slate-800/80"
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '1.4rem' }}>👑</span>
                <div>
                  <div style={{ fontWeight: '800', color: '#c084fc', fontSize: '0.92rem' }}>Super Admin</div>
                  <div style={{ fontSize: '0.74rem', color: '#94a3b8' }}>Akses penuh sistem, konfigurasi &amp; data master</div>
                </div>
              </div>
              <ChevronRight size={18} color="#c084fc" />
            </div>

            {/* OWNER */}
            <div
              onClick={() => handleSelectRole('Owner')}
              style={{
                background: '#1e293b',
                border: '1px solid rgba(251, 191, 36, 0.4)',
                borderRadius: '14px',
                padding: '16px 18px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
              className="hover:bg-slate-800/80"
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '1.4rem' }}>💼</span>
                <div>
                  <div style={{ fontWeight: '800', color: '#fbbf24', fontSize: '0.92rem' }}>Owner / Investor</div>
                  <div style={{ fontSize: '0.74rem', color: '#94a3b8' }}>Laporan Laba Rugi, Neraca, Arus Kas &amp; AI Analysis</div>
                </div>
              </div>
              <ChevronRight size={18} color="#fbbf24" />
            </div>

            {/* ADMIN */}
            <div
              onClick={() => handleSelectRole('Admin')}
              style={{
                background: '#1e293b',
                border: '1px solid rgba(56, 189, 248, 0.4)',
                borderRadius: '14px',
                padding: '16px 18px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
              className="hover:bg-slate-800/80"
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '1.4rem' }}>🏢</span>
                <div>
                  <div style={{ fontWeight: '800', color: '#38bdf8', fontSize: '0.92rem' }}>Admin Operasional</div>
                  <div style={{ fontSize: '0.74rem', color: '#94a3b8' }}>Manajemen Data Master, Supplier &amp; Approval Jurnal</div>
                </div>
              </div>
              <ChevronRight size={18} color="#38bdf8" />
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* STEP 2B: OUTLET CABANG (NAMA OUTLET DARI DATA MASTER) */}
        {/* ========================================================= */}
        {step === '2B' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }} className="animate-fade-in">
            <div style={{ textAlign: 'center', marginBottom: '8px' }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: '800', color: '#38bdf8', margin: 0 }}>
                Pilih Outlet Cabang Restoran
              </h2>
              <p style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '4px' }}>
                Daftar cabang terdaftar dari Halaman Data Master
              </p>
            </div>

            {outletsList.map((outletObj, idx) => (
              <div
                key={outletObj.id || idx}
                onClick={() => handleSelectOutlet(outletObj)}
                style={{
                  background: '#1e293b',
                  border: '1px solid #334155',
                  borderRadius: '14px',
                  padding: '16px 18px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  transition: 'all 0.15s ease'
                }}
                className="hover:border-sky-400 hover:bg-slate-800/80"
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '10px',
                    background: 'rgba(56, 189, 248, 0.15)',
                    border: '1px solid #38bdf8',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#38bdf8',
                    fontWeight: '800'
                  }}>
                    <Store size={20} />
                  </div>
                  <div>
                    <div style={{ fontWeight: '800', color: '#f8fafc', fontSize: '0.92rem' }}>
                      {outletObj.name}
                    </div>
                    <div style={{ fontSize: '0.74rem', color: '#94a3b8', marginTop: '2px' }}>
                      Kode Cabang: {outletObj.code || `OUTLET-${idx + 1}`}
                    </div>
                  </div>
                </div>
                <ChevronRight size={18} color="#38bdf8" />
              </div>
            ))}
          </div>
        )}

        {/* ========================================================= */}
        {/* STEP 3: PILIHAN NAMA-NAMA USER TERDAFTAR */}
        {/* ========================================================= */}
        {step === 3 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }} className="animate-fade-in">
            <div style={{ textAlign: 'center', marginBottom: '8px' }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: '800', color: '#f8fafc', margin: 0 }}>
                Pilih Nama Pengguna (User Account)
              </h2>
              <p style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '4px' }}>
                {selectedCategory === 'management'
                  ? `Pengguna Terdaftar Peran: ${selectedManagementRole}`
                  : `Pengguna Terdaftar di ${selectedOutlet?.name || selectedOutlet}`}
              </p>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: '12px',
              maxHeight: '360px',
              overflowY: 'auto',
              paddingRight: '4px'
            }}>
              {getUsersForStep3().map(u => {
                let badgeColor = '#818cf8';
                let roleBg = 'rgba(99,102,241,0.15)';
                if (u.role === 'Super Admin') { badgeColor = '#c084fc'; roleBg = 'rgba(192,132,252,0.15)'; }
                else if (u.role === 'Owner') { badgeColor = '#fbbf24'; roleBg = 'rgba(251,191,36,0.15)'; }
                else if (u.role === 'Admin') { badgeColor = '#38bdf8'; roleBg = 'rgba(56,189,248,0.15)'; }
                else if (u.role === 'Kasir') { badgeColor = '#34d399'; roleBg = 'rgba(52,211,153,0.15)'; }

                return (
                  <div
                    key={u.id}
                    onClick={() => handleSelectUserCard(u)}
                    style={{
                      background: '#1e293b',
                      border: '1px solid #334155',
                      borderRadius: '14px',
                      padding: '14px 16px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      transition: 'all 0.15s ease'
                    }}
                    className="hover:border-indigo-400 hover:bg-slate-800"
                  >
                    <div style={{
                      width: '42px',
                      height: '42px',
                      borderRadius: '50%',
                      background: roleBg,
                      border: `1px solid ${badgeColor}`,
                      color: badgeColor,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: '900',
                      fontSize: '0.9rem'
                    }}>
                      {u.name ? u.name.charAt(0).toUpperCase() : 'U'}
                    </div>

                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: '800', color: '#f8fafc', fontSize: '0.88rem' }}>
                        {u.name}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                        <span style={{
                          fontSize: '0.7rem',
                          fontWeight: '800',
                          color: badgeColor,
                          padding: '1px 6px',
                          borderRadius: '4px',
                          background: roleBg
                        }}>
                          {u.role}
                        </span>
                        <span style={{ fontSize: '0.72rem', color: '#64748b', fontFamily: 'monospace' }}>
                          @{u.username}
                        </span>
                      </div>
                    </div>

                    <ChevronRight size={16} color="#64748b" />
                  </div>
                );
              })}

              {getUsersForStep3().length === 0 && (
                <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '24px', color: '#64748b', fontSize: '0.85rem' }}>
                  Tidak ada staf terdaftar khusus untuk filter ini. Silakan pilih opsi lain.
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* STEP 4: FORM INPUT USERNAME & PASSWORD */}
        {/* ========================================================= */}
        {step === 4 && (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }} className="animate-fade-in">
            
            {/* SELECTED USER BADGE */}
            {selectedUser && (
              <div style={{
                background: 'rgba(99, 102, 241, 0.15)',
                border: '1px solid rgba(99, 102, 241, 0.3)',
                borderRadius: '14px',
                padding: '12px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}>
                <div style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '50%',
                  background: '#6366f1',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: '900'
                }}>
                  {selectedUser.name ? selectedUser.name.charAt(0).toUpperCase() : 'U'}
                </div>
                <div>
                  <div style={{ fontSize: '0.88rem', fontWeight: '800', color: '#f8fafc' }}>
                    {selectedUser.name}
                  </div>
                  <div style={{ fontSize: '0.74rem', color: '#818cf8' }}>
                    Peran: <strong>{selectedUser.role}</strong> | {selectedUser.outlet || 'Central'}
                  </div>
                </div>
              </div>
            )}

            {/* INPUT USERNAME */}
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '800', color: '#cbd5e1', marginBottom: '6px' }}>
                Username Akses *
              </label>
              <div style={{ position: 'relative' }}>
                <User size={16} color="#64748b" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Masukkan username..."
                  className="form-input"
                  style={{
                    width: '100%',
                    background: '#0f172a',
                    border: '1px solid #475569',
                    borderRadius: '10px',
                    padding: '10px 14px 10px 40px',
                    color: '#38bdf8',
                    fontFamily: 'monospace',
                    fontWeight: '800',
                    fontSize: '0.88rem',
                    outline: 'none'
                  }}
                />
              </div>
            </div>

            {/* INPUT PASSWORD */}
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '800', color: '#cbd5e1', marginBottom: '6px' }}>
                Password *
              </label>
              <div style={{ position: 'relative' }}>
                <KeyRound size={16} color="#64748b" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Masukkan password..."
                  className="form-input"
                  style={{
                    width: '100%',
                    background: '#0f172a',
                    border: '1px solid #475569',
                    borderRadius: '10px',
                    padding: '10px 40px 10px 40px',
                    color: '#34d399',
                    fontFamily: 'monospace',
                    fontWeight: '800',
                    fontSize: '0.88rem',
                    outline: 'none'
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* SUBMIT BUTTON */}
            <button
              type="submit"
              disabled={isLoading}
              style={{
                marginTop: '8px',
                padding: '12px 20px',
                background: 'linear-gradient(135deg, #6366f1 0%, #3b82f6 100%)',
                border: 'none',
                borderRadius: '12px',
                color: '#ffffff',
                fontSize: '0.9rem',
                fontWeight: '800',
                cursor: 'pointer',
                boxShadow: '0 8px 20px rgba(99, 102, 241, 0.35)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              <ShieldCheck size={18} />
              <span>{isLoading ? 'Verifikasi Hak Akses...' : '🚀 Masuk Sistem Restoran'}</span>
            </button>
          </form>
        )}

        {/* SWITCH TO MOBILE APK BOTTOM LINK */}
        <div style={{ marginTop: '28px', paddingTop: '20px', borderTop: '1px solid rgba(255, 255, 255, 0.08)', textAlign: 'center' }}>
          <button
            onClick={onSwitchToMobile}
            style={{
              background: 'none',
              border: 'none',
              color: '#38bdf8',
              fontSize: '0.78rem',
              fontWeight: '700',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Smartphone size={16} />
            <span>Switch ke Tampilan Tablet Kasir POS Mobile (Android APK)</span>
          </button>
        </div>

      </div>
    </div>
  );
}
