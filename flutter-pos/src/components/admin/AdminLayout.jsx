import React, { useState, useMemo } from 'react';
import { 
  LayoutDashboard, 
  Database, 
  ShoppingBag,
  Package, 
  ClipboardCheck,
  FileText, 
  BookOpen, 
  Award, 
  Settings, 
  History, 
  Printer,
  Calendar,
  Bell,
  UtensilsCrossed,
  ChevronDown,
  LogOut,
  Sun,
  Moon,
  Palette,
  CheckCircle2,
  Inbox,
  Sparkles,
  ShoppingCart,
  Clock,
  CheckSquare
} from 'lucide-react';

import { checkWebPermission } from '../../utils/permissionUtils';

export default function AdminLayout({ 
  activeTab, 
  setActiveTab, 
  selectedBranch, 
  setSelectedBranch, 
  outlets = [], 
  pendingCount = 0, 
  onLogout,
  userSession,
  masterData,
  themeMode = 'dark',
  toggleThemeMode,
  setThemeMode,
  children
}) {
  const [showInboxDropdown, setShowInboxDropdown] = useState(false);
  const [readNotifIds, setReadNotifIds] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('mris_read_notif_ids');
      if (saved) {
        try { return JSON.parse(saved); } catch (e) {}
      }
    }
    return [];
  });

  const markNotifAsRead = (id) => {
    setReadNotifIds(prev => {
      if (prev.includes(id)) return prev;
      const next = [...prev, id];
      try { localStorage.setItem('mris_read_notif_ids', JSON.stringify(next)); } catch (e) {}
      return next;
    });
  };

  const handleMarkAllRead = () => {
    const allIds = inboxNotifications.map(n => n.id);
    setReadNotifIds(allIds);
    try { localStorage.setItem('mris_read_notif_ids', JSON.stringify(allIds)); } catch (e) {}
  };

  const isLight = themeMode === 'light';
  const isWarmMinimalist = themeMode === 'warm_minimalist';

  // THEME COLOR PALETTE (Warm Minimalist: Deep Forest Green & Amber Gold on Off-White Ground)
  const T = isWarmMinimalist ? {
    appBg: '#faf8f5', // Warm off-white ground
    sidebarBg: '#143022', // Deep forest green sidebar anchor
    headerBg: '#ffffff', // Crisp white header
    cardBg: '#ffffff', // Crisp white card background
    txtPrimary: '#143022', // Deep forest green primary text
    txtSecondary: '#405649', // Muted forest sage
    txtMuted: '#687d71', // Soft sage grey
    border: '#e4e0d7', // Warm subtle border
    borderHover: '#b8b09f',
    accentGold: '#d97706', // Amber gold
    accentIndigo: '#1b4330', // Deep forest green accent
    activeNavBg: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)', // Amber gold active navigation
    activeNavTxt: '#ffffff',
    controlBg: '#f4f1ea',
    dropdownBg: '#ffffff',
    dropdownBorder: '#d6cfc0'
  } : isLight ? {
    appBg: '#f1f5f9',
    sidebarBg: '#ffffff',
    headerBg: '#ffffff',
    cardBg: '#ffffff',
    txtPrimary: '#0f172a',
    txtSecondary: '#475569',
    txtMuted: '#64748b',
    border: '#e2e8f0',
    borderHover: '#cbd5e1',
    accentGold: '#d97706',
    accentIndigo: '#4f46e5',
    activeNavBg: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)',
    activeNavTxt: '#ffffff',
    controlBg: '#f8fafc',
    dropdownBg: '#ffffff',
    dropdownBorder: '#cbd5e1'
  } : {
    appBg: '#0b0f19',
    sidebarBg: '#111625',
    headerBg: '#111625',
    cardBg: '#1e293b',
    txtPrimary: '#f8fafc',
    txtSecondary: '#94a3b8',
    txtMuted: '#64748b',
    border: 'rgba(255,255,255,0.08)',
    borderHover: 'rgba(255,255,255,0.2)',
    accentGold: '#f59e0b',
    accentIndigo: '#6366f1',
    activeNavBg: 'linear-gradient(135deg, #ca8a04 0%, #a16207 100%)',
    activeNavTxt: '#ffffff',
    controlBg: '#1e293b',
    dropdownBg: '#0f172a',
    dropdownBorder: '#334155'
  };

  const menuItems = [
    { id: 'dashboard', label: '1. Dashboard', icon: LayoutDashboard, permKey: 'dashboard' },
    { id: 'data', label: '2. Data Master', icon: Database, permKey: 'masterData' },
    { id: 'sales', label: '3. Penjualan', icon: ShoppingBag, permKey: 'reports' },
    { id: 'stock', label: '4. Logistik', icon: Package, permKey: 'stock' },
    { id: 'daily_approval', label: '5. Laporan Harian Outlet', icon: ClipboardCheck, permKey: 'reports' },
    { id: 'reports', label: '6. Laporan Keuangan', icon: FileText, permKey: 'reports' },
    { id: 'printer_settings', label: '7. Printer & Thermal', icon: Printer, permKey: 'settings' },
    { id: 'sop', label: '8. Kelola SOP Restoran', icon: BookOpen, permKey: 'policies' },
    { id: 'loyalty', label: '9. Program Loyalitas', icon: Award, permKey: 'masterData' },
    { id: 'settings', label: '10. Pengaturan', icon: Settings, permKey: 'settings' },
    { id: 'activity_log', label: '11. Log Aktivitas', icon: History, permKey: 'settings' }
  ];

  const userName = userSession?.name || 'Super Admin Restoran';
  const userRole = userSession?.role || 'Super Admin';
  const userOutlet = userSession?.outlet || 'Semua Outlet (Central)';
  const userInitial = userName ? userName.charAt(0).toUpperCase() : 'S';

  // Filter menu items berdasarkan matriks hak akses untuk role aktif
  const filteredMenuItems = menuItems.filter(item => 
    checkWebPermission(userRole, item.permKey, masterData?.permissionMatrix)
  );

  const todayFormatted = new Date().toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  // GENERATE INBOX NOTIFICATIONS FROM REAL-TIME POS DATA PUSH
  const inboxNotifications = useMemo(() => {
    const list = [];
    const salesTx = masterData?.salesTransactions || masterData?.recentTransactions || [];
    const closings = masterData?.approvedFinanceDaily || masterData?.shift_closings || [];
    const logistics = masterData?.approvedLogistics || masterData?.stockOpname || [];

    // 1. Sales POS notifications
    salesTx.slice(0, 5).forEach((tx, idx) => {
      list.push({
        id: `tx-${tx.id || idx}`,
        type: 'pos_sale',
        icon: ShoppingCart,
        color: '#34d399',
        title: `🛒 Transaksi POS Baru #${tx.id || (idx + 1)}`,
        subtitle: `Total Rp ${(tx.amount || 0).toLocaleString('id-ID')} • ${tx.payment_method || 'Kasir'}`,
        time: tx.date || 'Baru saja',
        outlet: tx.branch_name || 'Outlet Restoran'
      });
    });

    // 2. Closing Shift notifications
    closings.slice(0, 3).forEach((cs, idx) => {
      list.push({
        id: `cs-${cs.id || idx}`,
        type: 'shift_close',
        icon: Clock,
        color: '#38bdf8',
        title: `💵 Penutupan Shift Kasir (${cs.kasir_name || cs.cashier || 'Kasir'})`,
        subtitle: `Net Sales: Rp ${(cs.net_sales || cs.total_omzet || 0).toLocaleString('id-ID')}`,
        time: cs.date || 'Hari ini',
        outlet: cs.outlet_name || 'Outlet Restoran'
      });
    });

    // 3. Stock Audit / Logistics notifications
    logistics.slice(0, 3).forEach((lg, idx) => {
      list.push({
        id: `lg-${lg.id || idx}`,
        type: 'logistics',
        icon: CheckSquare,
        color: '#fbbf24',
        title: `📦 Audit Stok / Pengajuan Logistik`,
        subtitle: `Status: ${lg.status || 'Pending'} • ${lg.notes || 'Pencatatan Bahan'}`,
        time: lg.date || 'Baru saja',
        outlet: lg.outlet_name || 'Outlet Restoran'
      });
    });

    return list;
  }, [masterData]);

  const unreadNotifCount = useMemo(() => {
    return inboxNotifications.filter(n => !readNotifIds.includes(n.id)).length;
  }, [inboxNotifications, readNotifIds]);



  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: T.appBg, color: T.txtPrimary, fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif", transition: 'background 0.2s ease, color 0.2s ease' }}>
      
      {/* Sidebar Navigation */}
      <aside style={{
        width: '260px',
        background: T.sidebarBg,
        borderRight: `1px solid ${T.border}`,
        display: 'flex',
        flexDirection: 'column',
        position: 'sticky',
        top: 0,
        height: '100vh',
        zIndex: 20,
        userSelect: 'none',
        transition: 'background 0.2s ease, border-color 0.2s ease'
      }}>
        {/* Brand Header */}
        <div style={{
          padding: '16px 18px',
          borderBottom: `1px solid ${T.border}`,
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <div style={{
            width: '38px',
            height: '38px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 14px rgba(217, 119, 6, 0.4)',
            border: '1px solid #f59e0b'
          }}>
            <UtensilsCrossed size={22} color="#ffffff" />
          </div>
          <div>
            <h1 style={{ fontSize: '0.98rem', fontWeight: '900', color: T.accentGold, letterSpacing: '0.04em', margin: 0, textTransform: 'uppercase' }}>
              BAROKAH GROUP
            </h1>
            <p style={{ fontSize: '0.62rem', color: T.txtSecondary, fontWeight: '700', margin: '1px 0 0 0', letterSpacing: '0.05em' }}>
              RESTAURANT MANAGEMENT SYSTEM
            </p>
          </div>
        </div>

        {/* Navigation Menu Items */}
        <nav style={{ flex: 1, padding: '12px 10px', display: 'flex', flexDirection: 'column', gap: '4px', overflowY: 'auto' }}>
          <div style={{ fontSize: '0.64rem', textTransform: 'uppercase', color: T.txtMuted, fontWeight: '800', padding: '6px 10px 4px 10px', letterSpacing: '0.05em' }}>
            MENU UTAMA SISTEM
          </div>
          {filteredMenuItems.map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  border: 'none',
                  background: isActive ? T.activeNavBg : 'transparent',
                  color: isActive ? T.activeNavTxt : T.txtSecondary,
                  fontWeight: isActive ? '800' : '600',
                  fontSize: '0.84rem',
                  cursor: 'pointer',
                  textAlign: 'left',
                  boxShadow: isActive ? '0 4px 14px rgba(217, 119, 6, 0.35)' : 'none',
                  transition: 'all 0.18s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '11px' }}>
                  <Icon size={18} color={isActive ? '#ffffff' : T.txtSecondary} />
                  <span>{item.label}</span>
                </div>
                {item.id === 'stock' && pendingCount > 0 && (
                  <span style={{ background: '#ef4444', color: '#ffffff', fontSize: '0.66rem', fontWeight: '900', padding: '2px 7px', borderRadius: '10px' }}>
                    {pendingCount}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* User Profile Footer */}
        <div style={{ padding: '14px 16px', borderTop: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900', fontSize: '0.82rem', color: '#ffffff', border: '1px solid #f59e0b', flexShrink: 0 }}>
            {userInitial}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '0.80rem', fontWeight: '800', color: T.txtPrimary, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{userName}</div>
            <div style={{ fontSize: '0.66rem', color: T.accentGold, fontWeight: '700', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{userRole} • {userOutlet}</div>
          </div>
          {onLogout && (
            <button
              onClick={onLogout}
              title="Keluar / Logout"
              style={{
                background: 'rgba(244, 63, 94, 0.15)',
                border: '1px solid rgba(244, 63, 94, 0.3)',
                color: '#fb7185',
                padding: '6px 8px',
                borderRadius: '8px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.15s'
              }}
            >
              <LogOut size={15} />
            </button>
          )}
        </div>
      </aside>

      {/* Main Content Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, background: T.appBg, transition: 'background 0.2s ease' }}>
        
        {/* Top Header Bar */}
        <header style={{
          height: '60px',
          background: T.headerBg,
          borderBottom: `1px solid ${T.border}`,
          padding: '0 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'sticky',
          top: 0,
          zIndex: 999,
          transition: 'background 0.2s ease, border-color 0.2s ease'
        }}>
          {/* Greeting & Date */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ fontSize: '0.94rem', fontWeight: '800', color: T.txtPrimary }}>
              Selamat Datang, {userName} 🖐️
            </div>
            <span style={{ fontSize: '0.78rem', color: T.txtMuted, fontWeight: '600', paddingLeft: '10px', borderLeft: `1px solid ${T.border}` }}>
              {todayFormatted}
            </span>
          </div>

          {/* Right Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            
            {/* 1. THEME SWITCHER DROPDOWN (DARK / LIGHT / WARM MINIMALIST) */}
            <div style={{ position: 'relative' }}>
              <select
                value={themeMode}
                onChange={(e) => setThemeMode ? setThemeMode(e.target.value) : toggleThemeMode()}
                title="Pilih Tema Tampilan Web Admin"
                style={{
                  padding: '7px 28px 7px 12px',
                  background: T.controlBg,
                  border: `1px solid ${T.border}`,
                  borderRadius: '10px',
                  color: isWarmMinimalist ? '#d97706' : (isLight ? '#d97706' : '#f59e0b'),
                  fontSize: '0.78rem',
                  fontWeight: '800',
                  cursor: 'pointer',
                  appearance: 'none',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                  transition: 'all 0.15s ease'
                }}
              >
                <option value="dark" style={{ background: '#1e293b', color: '#f8fafc' }}>🌙 Mode Gelap (Dark)</option>
                <option value="light" style={{ background: '#ffffff', color: '#0f172a' }}>☀️ Mode Terang (Light)</option>
                <option value="warm_minimalist" style={{ background: '#faf8f5', color: '#143022' }}>🌿 Warm Minimalist (Forest & Amber)</option>
              </select>
              <Palette size={14} color={isWarmMinimalist ? '#d97706' : (isLight ? '#d97706' : '#f59e0b')} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
            </div>

            {/* 2. OUTLET SWITCHER DROPDOWN */}
            <div style={{ position: 'relative' }}>
              <select 
                value={selectedBranch || ''}
                onChange={(e) => setSelectedBranch(e.target.value ? parseInt(e.target.value) : null)}
                style={{
                  padding: '7px 30px 7px 12px',
                  background: T.controlBg,
                  border: `1px solid ${T.border}`,
                  borderRadius: '10px',
                  color: T.txtPrimary,
                  fontSize: '0.78rem',
                  fontWeight: '700',
                  cursor: 'pointer',
                  appearance: 'none',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
                }}
              >
                <option value="">🏢 Semua Restoran (Konsolidasi)</option>
                {outlets.map(o => (
                  <option key={o.id} value={o.id}>📍 {o.name}</option>
                ))}
              </select>
              <ChevronDown size={14} color={T.txtSecondary} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
            </div>

            {/* 3. INBOX NOTIFIKASI BELL (SUDUT KANAN ATAS) */}
            <div style={{ position: 'relative' }}>
              <button
                type="button"
                onClick={() => setShowInboxDropdown(!showInboxDropdown)}
                title="Inbox Notifikasi POS Kasir"
                style={{
                  position: 'relative',
                  width: '38px',
                  height: '38px',
                  borderRadius: '10px',
                  background: T.controlBg,
                  border: `1px solid ${showInboxDropdown ? T.accentGold : T.border}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.15s'
                }}
              >
                <Bell size={18} color={showInboxDropdown ? T.accentGold : T.txtSecondary} />
                {unreadNotifCount > 0 && (
                  <span style={{
                    position: 'absolute',
                    top: '-4px',
                    right: '-4px',
                    background: '#ef4444',
                    color: '#ffffff',
                    fontSize: '0.64rem',
                    fontWeight: '900',
                    borderRadius: '50%',
                    width: '18px',
                    height: '18px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 0 8px rgba(239,68,68,0.5)'
                  }}>
                    {unreadNotifCount}
                  </span>
                )}
              </button>

              {/* FLOATING INBOX DROPDOWN LIST */}
              {showInboxDropdown && (
                <div style={{
                  position: 'absolute',
                  top: '48px',
                  right: 0,
                  width: '380px',
                  maxHeight: '480px',
                  background: T.dropdownBg,
                  border: `1.5px solid ${T.dropdownBorder}`,
                  borderRadius: '16px',
                  boxShadow: '0 15px 40px rgba(0,0,0,0.4)',
                  zIndex: 9999,
                  display: 'flex',
                  flexDirection: 'column',
                  overflow: 'hidden'
                }}>
                  {/* Inbox Header */}
                  <div style={{
                    padding: '14px 16px',
                    borderBottom: `1px solid ${T.border}`,
                    background: isLight ? 'rgba(217,119,6,0.06)' : 'rgba(245,158,11,0.08)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Inbox size={18} color={T.accentGold} />
                      <span style={{ fontSize: '0.90rem', fontWeight: '800', color: T.txtPrimary }}>
                        Inbox Notifikasi POS
                      </span>
                      {unreadNotifCount > 0 && (
                        <span style={{ background: '#ef4444', color: '#fff', fontSize: '0.65rem', fontWeight: '900', padding: '2px 6px', borderRadius: '10px' }}>
                          {unreadNotifCount} Baru
                        </span>
                      )}
                    </div>
                    {unreadNotifCount > 0 && (
                      <button
                        type="button"
                        onClick={handleMarkAllRead}
                        style={{ background: 'none', border: 'none', color: T.accentGold, fontSize: '0.72rem', fontWeight: '800', cursor: 'pointer' }}
                      >
                        Tandai Dibaca
                      </button>
                    )}
                  </div>

                  {/* Notification Items List */}
                  <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
                    {inboxNotifications.length === 0 ? (
                      <div style={{ padding: '32px', textAlign: 'center', color: T.txtMuted, fontSize: '0.82rem' }}>
                        📥 Belum ada notifikasi transaksi POS baru.
                      </div>
                    ) : (
                      inboxNotifications.map(n => {
                        const IconComp = n.icon;
                        const isRead = readNotifIds.includes(n.id);
                        
                        const handleNotifClick = () => {
                          // Mark as read and decrement badge count
                          markNotifAsRead(n.id);
                          
                          // Navigate to corresponding tab
                          if (n.type === 'pos_sale') {
                            setActiveTab('sales');
                          } else if (n.type === 'shift_close') {
                            setActiveTab('reports');
                          } else if (n.type === 'logistics') {
                            setActiveTab('stock');
                          }
                          setShowInboxDropdown(false);
                        };

                        return (
                          <div
                            key={n.id}
                            onClick={handleNotifClick}
                            title="Klik untuk membuka modul halaman ini"
                            style={{
                              padding: '12px 16px',
                              borderBottom: `1px solid ${T.border}`,
                              background: isRead ? 'transparent' : isLight ? 'rgba(99,102,241,0.04)' : 'rgba(99,102,241,0.08)',
                              display: 'flex',
                              alignItems: 'flex-start',
                              gap: '12px',
                              cursor: 'pointer',
                              transition: 'background 0.15s'
                            }}
                          >
                            <div style={{
                              width: '34px',
                              height: '34px',
                              borderRadius: '10px',
                              background: `${n.color}20`,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                              marginTop: '2px'
                            }}>
                              <IconComp size={17} color={n.color} />
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: '0.82rem', fontWeight: '800', color: T.txtPrimary, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <span>{n.title}</span>
                                <span style={{ fontSize: '0.68rem', color: T.accentGold, fontWeight: '700' }}>Buka →</span>
                              </div>
                              <div style={{ fontSize: '0.74rem', color: T.txtSecondary, marginTop: '2px' }}>
                                {n.subtitle}
                              </div>
                              <div style={{ fontSize: '0.68rem', color: T.txtMuted, marginTop: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span>📍 {n.outlet}</span>
                                <span>•</span>
                                <span>⏱️ {n.time}</span>
                              </div>
                            </div>
                            {!isRead && (
                              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: n.color, marginTop: '6px', flexShrink: 0 }} />
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Profile Avatar Badge */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 10px 4px 4px', background: T.controlBg, border: `1px solid ${T.border}`, borderRadius: '20px' }}>
              <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)', color: '#ffffff', fontWeight: '900', fontSize: '0.78rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {userInitial}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '0.76rem', fontWeight: '800', color: T.txtPrimary, lineHeight: '1' }}>{userName}</span>
                <span style={{ fontSize: '0.64rem', color: T.accentGold, fontWeight: '700', lineHeight: '1', marginTop: '2px' }}>{userRole}</span>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main style={{ flex: 1, padding: '20px', overflowY: 'auto' }}>
          {children}
        </main>
      </div>
    </div>
  );
}
