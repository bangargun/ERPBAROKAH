import React, { useState, useEffect, useMemo } from 'react';
import { 
  LayoutDashboard, 
  Database, 
  ShoppingBag,
  Package, 
  SlidersHorizontal,
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
  CheckSquare,
  PlusCircle,
  FileSpreadsheet,
  Scale,
  TrendingUp,
  Receipt
} from 'lucide-react';

import { checkWebPermission } from '../../utils/permissionUtils';
import { getThemePalette } from '../../utils/themeUtils';
import ManualReportUpdateModal from './ManualReportUpdateModal';

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
  setMasterData,
  themeMode = 'dark',
  toggleThemeMode,
  setThemeMode,
  children
}) {
  const [showUpdateLaporanModal, setShowUpdateLaporanModal] = useState(false);
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

  const T = getThemePalette(themeMode);

  // Add backward compatibility for keys used in layout that map differently
  const mappedT = {
    ...T,
    sidebarBg: T.cardBg2,
    headerBg: T.cardBg,
    sidebarTxtPrimary: T.txtPrimary,
    sidebarTxtSecondary: T.txtSecondary,
    sidebarTxtMuted: T.txtMuted,
    activeNavBg: T.navActiveBg,
    activeNavTxt: T.navActiveTxt,
    dropdownBorder: T.borderStrong
  };

  const menuSections = [
    {
      title: 'UTAMA & PENJUALAN',
      items: [
        { id: 'dashboard',           label: '1. Dashboard',                      icon: LayoutDashboard,  permKey: 'dashboard' },
        { id: 'data',                label: '2. Data Master',                    icon: Database,         permKey: 'masterData' },
        { id: 'sales',               label: '3. Penjualan',                      icon: ShoppingBag,      permKey: 'reports' }
      ]
    },
    {
      title: 'OPERASIONAL & LOGISTIK',
      items: [
        { id: 'stock',               label: '4. Logistik',                       icon: Package,          permKey: 'stock' },
        { id: 'adjustments',         label: '5. Penyesuaian',                    icon: SlidersHorizontal, permKey: 'stock' },
        { id: 'update_laporan',      label: '6. Update Laporan Harian',          icon: FileSpreadsheet,  permKey: 'reports' },
        { id: 'daily_approval',      label: '7. Verifikasi & Approval Laporan',  icon: ClipboardCheck,   permKey: 'reports' }
      ]
    },
    {
      title: 'ANALISIS & KEUANGAN',
      items: [
        { id: 'ingredient_analysis', label: '8. Analisis Harga Bahan',           icon: Scale,            permKey: 'reports' },
        { id: 'reports',             label: '9. Laporan Keuangan',               icon: FileText,         permKey: 'reports' }
      ]
    },
    {
      title: 'SISTEM & PENGATURAN',
      items: [
        { id: 'printer_settings',    label: '10. Printer & Thermal',             icon: Printer,          permKey: 'settings' },
        { id: 'sop',                 label: '11. Kelola SOP Restoran',           icon: BookOpen,         permKey: 'policies' },
        { id: 'loyalty',             label: '12. Program Loyalitas',             icon: Award,            permKey: 'masterData' },
        { id: 'settings',            label: '13. Pengaturan',                    icon: Settings,         permKey: 'settings' },
        { id: 'activity_log',        label: '14. Log Aktivitas',                 icon: History,          permKey: 'settings' }
      ]
    }
  ];

  const menuItems = menuSections.flatMap(sec => sec.items);

  const userName = userSession?.name || 'Super Admin Restoran';
  const userRole = userSession?.role || 'Super Admin';
  const userOutlet = userSession?.outlet || 'Semua Outlet (Central)';
  const userInitial = userName ? userName.charAt(0).toUpperCase() : 'S';

  // Filter menu items berdasarkan matriks hak akses untuk role aktif
  const filteredMenuItems = menuItems.filter(item => 
    checkWebPermission(userRole, item.permKey, masterData?.permissionMatrix)
  );

  const [currentDateTime, setCurrentDateTime] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentDateTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const todayFormatted = currentDateTime.toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }) + ', ' + currentDateTime.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }) + ' WIB';

  // GENERATE INBOX NOTIFICATIONS FROM REAL-TIME POS DATA PUSH
  const inboxNotifications = useMemo(() => {
    const list = [];
    const salesTx = masterData?.salesTransactions || masterData?.recentTransactions || [];
    const closings = masterData?.approvedFinanceDaily || masterData?.shift_closings || [];
    const logistics = masterData?.approvedLogistics || masterData?.stockOpname || [];

    // 1. Sales POS notifications
    salesTx.slice(0, 5).forEach((tx, idx) => {
      const timeDisplay = tx.time ? `${tx.date || ''} ${tx.time}` : (tx.timestamp ? new Date(tx.timestamp).toLocaleString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : (tx.date || 'Baru saja'));
      list.push({
        id: `tx-${tx.id || idx}`,
        type: 'pos_sale',
        icon: ShoppingCart,
        color: T.success,
        title: `Transaksi POS Baru #${tx.id || (idx + 1)}`,
        subtitle: `Total Rp ${(tx.amount || 0).toLocaleString('id-ID')} • ${tx.payment_method || 'Kasir'}`,
        time: timeDisplay,
        outlet: tx.branch_name || 'Outlet Restoran'
      });
    });

    // 2. Closing Shift notifications
    closings.slice(0, 3).forEach((cs, idx) => {
      const timeDisplay = cs.time ? `${cs.date || ''} ${cs.time}` : (cs.timestamp ? new Date(cs.timestamp).toLocaleString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : (cs.date || 'Hari ini'));
      list.push({
        id: `cs-${cs.id || idx}`,
        type: 'shift_close',
        icon: Clock,
        color: T.info,
        title: `Penutupan Shift Kasir (${cs.kasir_name || cs.cashier || 'Kasir'})`,
        subtitle: `Net Sales: Rp ${(cs.net_sales || cs.total_omzet || 0).toLocaleString('id-ID')}`,
        time: timeDisplay,
        outlet: cs.outlet_name || 'Outlet Restoran'
      });
    });

    // 3. Stock Audit / Logistics notifications
    logistics.slice(0, 3).forEach((lg, idx) => {
      const timeDisplay = lg.time ? `${lg.date || ''} ${lg.time}` : (lg.timestamp ? new Date(lg.timestamp).toLocaleString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : (lg.date || 'Baru saja'));
      list.push({
        id: `lg-${lg.id || idx}`,
        type: 'logistics',
        icon: CheckSquare,
        color: '#fbbf24',
        title: `Audit Stok / Pengajuan Logistik`,
        subtitle: `Status: ${lg.status || 'Pending'} • ${lg.notes || 'Pencatatan Bahan'}`,
        time: timeDisplay,
        outlet: lg.outlet_name || 'Outlet Restoran'
      });
    });

    return list;
  }, [masterData]);

  const unreadNotifCount = useMemo(() => {
    return inboxNotifications.filter(n => !readNotifIds.includes(n.id)).length;
  }, [inboxNotifications, readNotifIds]);



  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', overflow: 'hidden', background: T.appBg, color: T.txtPrimary }}>
      
      {/* Sidebar Navigation */}
      <aside style={{
        width: '260px',
        background: '#120f09',
        borderRight: '1px solid rgba(251, 191, 36, 0.25)',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
        zIndex: 1000,
        transition: 'all 0.2s ease',
        boxShadow: '4px 0 24px rgba(0, 0, 0, 0.4)'
      }}>
        {/* Brand Header */}
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid rgba(251, 191, 36, 0.15)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#000000',
            fontWeight: '900',
            fontSize: '1.1rem',
            boxShadow: '0 4px 14px rgba(245, 158, 11, 0.45)'
          }}>
            <UtensilsCrossed size={20} />
          </div>
          <div>
            <h1 style={{ fontSize: '0.96rem', fontWeight: '900', color: '#f59e0b', margin: 0, letterSpacing: '0.04em' }}>BAROKAH GROUP</h1>
            <span style={{ fontSize: '0.62rem', color: '#fbbf24', fontWeight: '800', letterSpacing: '0.06em' }}>RESTAURANT MANAGEMENT SYSTEM</span>
          </div>
        </div>

        {/* Navigation Links with Section Grouping */}
        <nav style={{
          padding: '12px 14px',
          overflowY: 'auto',
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: '10px'
        }}>
          {/* Quick Update Button */}
          <div>
            <button
              type="button"
              onClick={() => setShowUpdateLaporanModal(true)}
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: '10px',
                border: '1px solid #fbbf24',
                background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                color: '#000000',
                fontWeight: '900',
                fontSize: '0.84rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: '0 4px 16px rgba(245, 158, 11, 0.45)',
                transition: 'all 0.18s ease'
              }}
              title="Update data penjualan & pengeluaran (Manual & Excel)"
            >
              <PlusCircle size={17} color="#000000" />
              <span>+ Update Laporan</span>
            </button>
          </div>

          {/* Render Sections */}
          {menuSections.map((sec, secIdx) => {
            const visibleItems = sec.items.filter(item =>
              checkWebPermission(userRole, item.permKey, masterData?.permissionMatrix)
            );
            if (visibleItems.length === 0) return null;

            return (
              <div key={sec.title} style={{ display: 'flex', flexDirection: 'column', gap: '3px', marginTop: secIdx === 0 ? '4px' : '6px' }}>
                <div style={{
                  fontSize: '0.62rem',
                  textTransform: 'uppercase',
                  color: '#facc15',
                  fontWeight: '900',
                  padding: '4px 10px 2px 10px',
                  letterSpacing: '0.08em',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  opacity: 0.85
                }}>
                  <span>{sec.title}</span>
                </div>

                {visibleItems.map(item => {
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
                        padding: '9px 12px',
                        borderRadius: '10px',
                        border: isActive ? '1px solid #fbbf24' : '1px solid transparent',
                        background: isActive ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' : 'transparent',
                        color: isActive ? '#000000' : '#fbbf24',
                        fontWeight: isActive ? '900' : '800',
                        fontSize: '0.82rem',
                        cursor: 'pointer',
                        textAlign: 'left',
                        boxShadow: isActive ? '0 4px 16px rgba(245, 158, 11, 0.45)' : 'none',
                        transition: 'all 0.18s ease'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Icon size={17} color={isActive ? '#000000' : '#fbbf24'} />
                        <span style={{ color: isActive ? '#000000' : '#fbbf24', fontWeight: isActive ? '900' : '800' }}>{item.label}</span>
                      </div>
                      {item.id === 'stock' && pendingCount > 0 && (
                        <span style={{ background: isActive ? '#000000' : '#fbbf24', color: isActive ? '#fbbf24' : '#000000', fontSize: '0.66rem', fontWeight: '900', padding: '2px 7px', borderRadius: '10px' }}>
                          {pendingCount}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </nav>

        {/* User Profile Footer */}
        <div style={{ padding: '14px 16px', borderTop: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900', fontSize: '0.82rem', color: '#ffffff', border: '1px solid #f59e0b', flexShrink: 0 }}>
            {userInitial}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '0.80rem', fontWeight: '800', color: '#f59e0b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{userName}</div>
            <div style={{ fontSize: '0.66rem', color: '#f59e0b', fontWeight: '700', opacity: 0.85, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{userRole} • {userOutlet}</div>
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, overflow: 'hidden', flex: 1 }}>
            <div style={{ fontSize: '0.94rem', fontWeight: '800', color: T.txtPrimary, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              Selamat Datang, {userName} 
            </div>
            <span style={{ fontSize: '0.78rem', color: T.txtMuted, fontWeight: '600', paddingLeft: '10px', borderLeft: `1px solid ${T.border}`, whiteSpace: 'nowrap', flexShrink: 0 }}>
              {todayFormatted}
            </span>
          </div>

          {/* Right Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
            
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
                <option value="dark" style={{ background: '#1e293b', color: '#f8fafc' }}>Mode Gelap (Dark)</option>
                <option value="light" style={{ background: '#ffffff', color: '#0f172a' }}>Mode Terang (Light)</option>
                <option value="warm_minimalist" style={{ background: '#faf8f5', color: '#143022' }}>Warm Minimalist (Forest & Amber)</option>
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
                <option value="">Semua Restoran (Konsolidasi)</option>
                {outlets.map(o => (
                  <option key={o.id} value={o.id}>{o.name}</option>
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
                    background: T.danger,
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
                        <span style={{ background: T.danger, color: '#fff', fontSize: '0.65rem', fontWeight: '900', padding: '2px 6px', borderRadius: '10px' }}>
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
                        Belum ada notifikasi transaksi POS baru.
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
                                <span>{n.outlet}</span>
                                <span>•</span>
                                <span>{n.time}</span>
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

      {/* MANUAL REPORT UPDATE MODAL */}
      <ManualReportUpdateModal
        show={showUpdateLaporanModal}
        onClose={() => setShowUpdateLaporanModal(false)}
        masterData={masterData}
        setMasterData={setMasterData}
        userSession={userSession}
        themeMode={themeMode}
      />
    </div>
  );
}
