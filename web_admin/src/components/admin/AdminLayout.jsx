import React, { useState, useEffect, useMemo } from 'react';
import { 
  LayoutDashboard,
  Boxes, 
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
  Receipt,
  Server,
  Zap,
  ShoppingBasket
} from 'lucide-react';

import { checkWebPermission } from '../../utils/permissionUtils';
import { getThemePalette } from '../../utils/themeUtils';
import ManualReportUpdateModal from './ManualReportUpdateModal';
import SalesImportReconciliationModal from './SalesImportReconciliationModal';
import ExpenseImportReconciliationModal from './ExpenseImportReconciliationModal';

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
  isServerSyncing = false,
  lastServerSyncTime = '',
  children
}) {
  const [showUpdateLaporanModal, setShowUpdateLaporanModal] = useState(false);
  const [showSalesImportModal, setShowSalesImportModal] = useState(false);
  const [showExpenseImportModal, setShowExpenseImportModal] = useState(false);

  const isCalmSage = themeMode === 'calm_sage';
  const isSoftBlue = false;
  const isLight = isCalmSage;
  const isWarmMinimalist = false;

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
        { id: 'dashboard',           label: 'Dashboard',                     icon: LayoutDashboard,  permKey: 'dashboard' },
        { id: 'data',                label: 'Data Master',                   icon: Database,         permKey: 'masterData' },
        { id: 'sales',               label: 'Penjualan',                     icon: ShoppingBag,      permKey: 'reports' }
      ]
    },
    {
      title: 'OPERASIONAL & LOGISTIK',
      items: [
        { id: 'kitchen',             label: 'Kitchen Display (KDS)',         icon: UtensilsCrossed,  permKey: 'dashboard' },
        { id: 'stock',               label: 'Logistik',                      icon: Package,          permKey: 'stock' },
        { id: 'assets',              label: 'Manajemen Aset',                icon: Boxes,            permKey: 'masterData' },
        { id: 'adjustments',         label: 'Penyesuaian',                   icon: SlidersHorizontal, permKey: 'stock' },
        { id: 'update_laporan',      label: 'Update Laporan Harian',         icon: FileSpreadsheet,  permKey: 'reports' },
        { id: 'daily_approval',      label: 'Verifikasi & Approval',         icon: ClipboardCheck,   permKey: 'reports' }
      ]
    },
    {
      title: 'ANALISIS & KEUANGAN',
      items: [
        { id: 'ingredient_analysis', label: 'Analisis Harga Bahan',          icon: Scale,            permKey: 'reports' },
        { id: 'reports',             label: 'Laporan Keuangan',              icon: FileText,         permKey: 'reports' },
        { id: 'tax_report',          label: 'Laporan Pajak (SPTPD)',         icon: Receipt,          permKey: 'reports' }
      ]
    },
    {
      title: 'SISTEM & PENGATURAN',
      items: [
        { id: 'printer_settings',    label: 'Printer & Thermal',             icon: Printer,          permKey: 'settings' },
        { id: 'sop',                 label: 'Kelola SOP Restoran',           icon: BookOpen,         permKey: 'policies' },
        { id: 'loyalty',             label: 'Program Loyalitas',             icon: Award,            permKey: 'masterData' },
        { id: 'settings',            label: 'Pengaturan',                    icon: Settings,         permKey: 'settings' },
        { id: 'activity_log',        label: 'Log Aktivitas',                 icon: History,          permKey: 'settings' }
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

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', overflow: 'hidden', background: T.appBg, color: T.txtPrimary }}>
      
      {/* Sidebar Navigation */}
      <aside style={{
        width: '260px',
        background: isCalmSage ? '#0f291e' : (isSoftBlue ? '#0d3268' : '#120f09'),
        borderRight: isCalmSage ? '1px solid rgba(255, 255, 255, 0.08)' : (isSoftBlue ? '1px solid rgba(255, 255, 255, 0.10)' : '1px solid rgba(251, 191, 36, 0.25)'),
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
          borderBottom: isCalmSage ? '1px solid rgba(255, 255, 255, 0.08)' : (isSoftBlue ? '1px solid rgba(255, 255, 255, 0.10)' : '1px solid rgba(251, 191, 36, 0.15)'),
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '10px',
            background: isCalmSage ? 'linear-gradient(135deg, #2d7a5b 0%, #1b533c 100%)' : (isSoftBlue ? 'linear-gradient(135deg, #1a6fc4 0%, #0d5295 100%)' : 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'),
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff',
            fontWeight: '900',
            fontSize: '1.1rem',
            boxShadow: isCalmSage ? '0 4px 14px rgba(45, 122, 91, 0.45)' : (isSoftBlue ? '0 4px 14px rgba(26, 111, 196, 0.45)' : '0 4px 14px rgba(245, 158, 11, 0.45)')
          }}>
            <UtensilsCrossed size={20} />
          </div>
          <div>
            <h1 style={{ fontSize: '0.96rem', fontWeight: '900', color: isCalmSage ? '#ffffff' : (isSoftBlue ? '#ffffff' : '#f59e0b'), margin: 0, letterSpacing: '0.04em' }}>BAROKAH GROUP</h1>
            <span style={{ fontSize: '0.62rem', color: isCalmSage ? '#86efac' : (isSoftBlue ? '#90cdf4' : '#fbbf24'), fontWeight: '800', letterSpacing: '0.06em' }}>RESTAURANT MANAGEMENT SYSTEM</span>
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
          {/* Quick Action Buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <button
              type="button"
              onClick={() => setShowUpdateLaporanModal(true)}
              style={{
                width: '100%',
                padding: '11px 14px',
                borderRadius: '12px',
                border: isCalmSage ? '1px solid rgba(255, 255, 255, 0.15)' : (isSoftBlue ? '1px solid rgba(255, 255, 255, 0.20)' : '1px solid rgba(251, 191, 36, 0.65)'),
                background: isCalmSage ? 'linear-gradient(135deg, #2d7a5b 0%, #1b533c 100%)' : (isSoftBlue ? 'linear-gradient(135deg, #1a6fc4 0%, #0d5295 100%)' : 'linear-gradient(135deg, #f59e0b 0%, #d97706 60%, #b45309 100%)'),
                color: '#ffffff',
                fontWeight: '900',
                fontSize: '0.84rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '9px',
                boxShadow: isCalmSage ? '0 4px 18px rgba(45, 122, 91, 0.40)' : (isSoftBlue ? '0 4px 18px rgba(26, 111, 196, 0.40)' : '0 4px 18px rgba(245, 158, 11, 0.45)'),
                transition: 'all 0.2s ease',
                letterSpacing: '0.01em'
              }}
              title="Update data penjualan & pengeluaran (Manual, Impor PDF & Excel)"
            >
              <div style={{
                width: '24px',
                height: '24px',
                borderRadius: '6px',
                background: 'rgba(255, 255, 255, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <PlusCircle size={16} color="#ffffff" />
              </div>
              <span>Update Laporan (Manual & Impor)</span>
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
                  color: isCalmSage ? '#86efac' : (isSoftBlue ? '#7eb3e6' : '#facc15'),
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
                        border: isActive
                          ? (isCalmSage ? '1px solid rgba(255, 255, 255, 0.25)' : (isSoftBlue ? '1px solid rgba(255, 255, 255, 0.25)' : '1px solid #fbbf24'))
                          : '1px solid transparent',
                        background: isActive
                          ? (isCalmSage ? 'linear-gradient(135deg, #2d7a5b 0%, #1b533c 100%)' : (isSoftBlue ? 'linear-gradient(135deg, #1a6fc4 0%, #0d5295 100%)' : 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'))
                          : 'transparent',
                        color: isActive
                          ? '#ffffff'
                          : (isCalmSage ? '#a7d4bf' : (isSoftBlue ? '#c3d9f0' : '#fbbf24')),
                        fontWeight: isActive ? '900' : '800',
                        fontSize: '0.82rem',
                        cursor: 'pointer',
                        textAlign: 'left',
                        boxShadow: isActive
                          ? (isCalmSage ? '0 4px 16px rgba(45, 122, 91, 0.45)' : (isSoftBlue ? '0 4px 16px rgba(26, 111, 196, 0.40)' : '0 4px 16px rgba(245, 158, 11, 0.45)'))
                          : 'none',
                        transition: 'all 0.18s ease'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Icon size={17} color={isActive ? '#ffffff' : (isCalmSage ? '#a7d4bf' : (isSoftBlue ? '#c3d9f0' : '#fbbf24'))} />
                        <span style={{ color: isActive ? '#ffffff' : (isCalmSage ? '#a7d4bf' : (isSoftBlue ? '#c3d9f0' : '#fbbf24')), fontWeight: isActive ? '900' : '800' }}>{item.label}</span>
                      </div>
                      {item.id === 'stock' && pendingCount > 0 && (
                        <span style={{
                          background: isActive ? '#ffffff' : (isCalmSage ? '#ef4444' : (isSoftBlue ? '#ef4444' : '#fbbf24')),
                          color: isActive ? (isCalmSage ? '#1b533c' : (isSoftBlue ? '#0d5295' : '#92400e')) : '#ffffff',
                          fontSize: '0.66rem', fontWeight: '900', padding: '2px 7px', borderRadius: '10px'
                        }}>
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
        <div style={{ padding: '14px 16px', borderTop: isCalmSage ? '1px solid rgba(255, 255, 255, 0.08)' : (isSoftBlue ? '1px solid rgba(255, 255, 255, 0.12)' : `1px solid ${T.border}`), display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: isCalmSage ? 'linear-gradient(135deg, #2d7a5b 0%, #1b533c 100%)' : (isSoftBlue ? 'linear-gradient(135deg, #1a6fc4 0%, #0d5295 100%)' : 'linear-gradient(135deg, #d97706 0%, #b45309 100%)'), display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900', fontSize: '0.82rem', color: '#ffffff', border: isCalmSage ? '1px solid rgba(255,255,255,0.25)' : (isSoftBlue ? '1px solid rgba(255,255,255,0.25)' : '1px solid #f59e0b'), flexShrink: 0 }}>
            {userInitial}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '0.80rem', fontWeight: '800', color: (isCalmSage || isSoftBlue) ? '#ffffff' : '#f59e0b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{userName}</div>
            <div style={{ fontSize: '0.66rem', color: isCalmSage ? '#86efac' : (isSoftBlue ? '#90cdf4' : '#f59e0b'), fontWeight: '700', opacity: 0.85, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{userRole} • {userOutlet}</div>
          </div>
          {onLogout && (
            <button
              onClick={onLogout}
              title="Keluar / Logout"
              style={{
                background: 'rgba(244, 63, 94, 0.15)',
                border: '1px solid rgba(244, 63, 94, 0.3)',
                color: isSoftBlue ? '#ef4444' : '#fb7185',
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
          background: T.cardBg,
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
            
            {/* 1. THEME SWITCHER DROPDOWN (DARK / CALM SAGE) */}
            <div style={{ position: 'relative' }}>
              <select
                value={themeMode}
                onChange={(e) => setThemeMode ? setThemeMode(e.target.value) : toggleThemeMode()}
                title="Pilih Tema Tampilan Web Admin"
                style={{
                  padding: '7px 30px 7px 12px',
                  background: isCalmSage ? '#eaf2ec' : T.controlBg,
                  border: `1px solid ${T.border}`,
                  borderRadius: '10px',
                  color: isCalmSage ? '#2d7a5b' : '#f59e0b',
                  fontSize: '0.78rem',
                  fontWeight: '800',
                  cursor: 'pointer',
                  appearance: 'none',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                  transition: 'all 0.15s ease'
                }}
              >
                <option value="calm_sage" style={{ background: '#eaf2ec', color: '#152e22' }}>🌿 Calm Sage (Fresh & Mint)</option>
                <option value="dark" style={{ background: '#1e293b', color: '#f8fafc' }}>🌙 Mode Gelap (Dark)</option>
              </select>
              <Palette size={14} color={isCalmSage ? '#2d7a5b' : '#f59e0b'} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
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

            {/* Profile Avatar Badge */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 10px 4px 4px', background: T.controlBg, border: `1px solid ${T.border}`, borderRadius: '20px' }}>
              <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: isCalmSage ? 'linear-gradient(135deg, #2d7a5b 0%, #1b533c 100%)' : (isSoftBlue ? 'linear-gradient(135deg, #1a6fc4 0%, #0d5295 100%)' : 'linear-gradient(135deg, #d97706 0%, #b45309 100%)'), color: '#ffffff', fontWeight: '900', fontSize: '0.78rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {userInitial}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '0.76rem', fontWeight: '800', color: T.txtPrimary, lineHeight: '1' }}>{userName}</span>
                <span style={{ fontSize: '0.64rem', color: isCalmSage ? '#2d7a5b' : (isSoftBlue ? '#1a6fc4' : T.accentGold), fontWeight: '700', lineHeight: '1', marginTop: '2px' }}>{userRole}</span>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main style={{ flex: 1, padding: '20px', overflowY: 'auto' }}>
          {children}
        </main>

        {/* FUTURISTIC SERVER STATUS FOOTER (WITH ANIMATED CYBER DASHED TRACK) */}
        <footer style={{
          position: 'relative',
          background: isSoftBlue ? '#ffffff' : (isLight ? '#f8fafc' : '#080c14'),
          borderTop: `1px solid ${T.border}`,
          padding: '8px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          zIndex: 10,
          userSelect: 'none'
        }}>
          {/* Top Futuristic Animated Dashed Line / Cyber Stream Track */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '2px',
            background: isServerSyncing
              ? 'linear-gradient(90deg, #38bdf8 0%, #34d399 50%, #f59e0b 100%)'
              : `repeating-linear-gradient(90deg, ${isSoftBlue ? '#0a7c4e' : '#10b981'} 0px, ${isSoftBlue ? '#0a7c4e' : '#10b981'} 8px, transparent 8px, transparent 16px)`,
            backgroundSize: isServerSyncing ? '200% 100%' : 'auto',
            animation: isServerSyncing ? 'cyberStreamMove 0.8s linear infinite' : 'none',
            opacity: isServerSyncing ? 1 : 0.45,
            boxShadow: isServerSyncing ? '0 0 12px rgba(56, 189, 248, 0.8)' : 'none',
            transition: 'all 0.3s ease'
          }} />

          {/* Left Node Status */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '3px 8px',
              borderRadius: '6px',
              background: isServerSyncing
                ? (isSoftBlue ? 'rgba(26, 111, 196, 0.10)' : 'rgba(56, 189, 248, 0.12)')
                : (isSoftBlue ? 'rgba(10, 124, 78, 0.10)' : 'rgba(16, 185, 129, 0.10)'),
              border: `1px solid ${isServerSyncing
                ? (isSoftBlue ? 'rgba(26, 111, 196, 0.25)' : 'rgba(56, 189, 248, 0.3)')
                : (isSoftBlue ? 'rgba(10, 124, 78, 0.25)' : 'rgba(16, 185, 129, 0.25)')}`,
              fontSize: '0.68rem',
              fontWeight: '800',
              color: isServerSyncing ? (isSoftBlue ? '#0369a1' : '#38bdf8') : (isSoftBlue ? '#0a7c4e' : '#10b981'),
              letterSpacing: '0.04em',
              textTransform: 'uppercase'
            }}>
              <span style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: isServerSyncing ? (isSoftBlue ? '#0369a1' : '#38bdf8') : (isSoftBlue ? '#0a7c4e' : '#10b981'),
                boxShadow: isServerSyncing ? '0 0 8px #38bdf8' : '0 0 6px #10b981',
                animation: isServerSyncing ? 'pulseGlowFast 0.6s infinite alternate' : 'pulseGlowSlow 2s infinite alternate'
              }} />
              <Server size={12} />
              <span>{isServerSyncing ? 'Syncing Engine Active' : 'Cloud Server Node'}</span>
            </div>

            <span style={{ fontSize: '0.70rem', color: T.txtSecondary, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace', letterSpacing: '0.02em' }}>
              VPS HOST: <span style={{ color: T.txtPrimary, fontWeight: '700' }}>187.77.122.142</span>
            </span>
          </div>

          {/* Middle Cyber Stream Dashed Glow Visualizer */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            opacity: 0.7
          }}>
            <span style={{ fontSize: '0.65rem', color: T.txtMuted, fontFamily: 'monospace' }}>[</span>
            <div style={{
              width: '100px',
              height: '3px',
              borderRadius: '2px',
              background: isServerSyncing
                ? (isSoftBlue ? '#0369a1' : '#38bdf8')
                : (isSoftBlue ? '#0a7c4e' : '#10b981'),
              animation: isServerSyncing ? 'cyberStreamMove 0.5s linear infinite' : 'none'
            }} />
            <span style={{ fontSize: '0.65rem', color: T.txtMuted, fontFamily: 'monospace' }}>]</span>
          </div>

          {/* Right Update Server Time & Status */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {isServerSyncing ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.70rem', fontWeight: '800', color: isSoftBlue ? '#0369a1' : '#38bdf8', letterSpacing: '0.03em' }}>
                <Zap size={13} style={{ animation: 'spin 1s linear infinite' }} />
                <span>MENGIRIM & MENYINKRONKAN DATA KE SERVER...</span>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.70rem', color: T.txtSecondary, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace' }}>
                <CheckCircle2 size={13} color={isSoftBlue ? '#0a7c4e' : '#10b981'} />
                <span>UPDATE SERVER:</span>
                <span style={{ color: T.txtPrimary, fontWeight: '800' }}>
                  {lastServerSyncTime || todayFormatted} WIB
                </span>
                <span style={{
                  color: isSoftBlue ? '#0a7c4e' : '#10b981',
                  fontWeight: '700',
                  marginLeft: '4px',
                  padding: '1px 6px',
                  background: isSoftBlue ? 'rgba(10, 124, 78, 0.10)' : 'rgba(16, 185, 129, 0.1)',
                  borderRadius: '4px',
                  border: `1px solid ${isSoftBlue ? 'rgba(10, 124, 78, 0.25)' : 'rgba(16, 185, 129, 0.2)'}`
                }}>
                  ONLINE
                </span>
              </div>
            )}
          </div>

          {/* Keyframes Style Tag */}
          <style>{`
            @keyframes cyberStreamMove {
              0% { background-position: 0 0; }
              100% { background-position: 32px 0; }
            }
            @keyframes pulseGlowFast {
              0% { opacity: 0.4; transform: scale(0.9); }
              100% { opacity: 1; transform: scale(1.3); }
            }
            @keyframes pulseGlowSlow {
              0% { opacity: 0.5; transform: scale(0.95); }
              100% { opacity: 1; transform: scale(1.15); }
            }
          `}</style>
        </footer>
      </div>

      {/* MANUAL REPORT UPDATE MODAL (UNIFIED MANUAL & IMPORT) */}
      <ManualReportUpdateModal
        show={showUpdateLaporanModal}
        onClose={() => setShowUpdateLaporanModal(false)}
        masterData={masterData}
        setMasterData={setMasterData}
        userSession={userSession}
        themeMode={themeMode}
        onOpenSalesImport={() => {
          setShowUpdateLaporanModal(false);
          setShowSalesImportModal(true);
        }}
        onOpenExpenseImport={() => {
          setShowUpdateLaporanModal(false);
          setShowExpenseImportModal(true);
        }}
      />

      {/* SALES RECONCILIATION IMPORT MODAL (PDF & EXCEL) */}
      <SalesImportReconciliationModal
        show={showSalesImportModal}
        onClose={() => setShowSalesImportModal(false)}
        masterData={masterData}
        setMasterData={setMasterData}
        userSession={userSession}
        themeMode={themeMode}
      />

      {/* EXPENSE & INGREDIENT RECONCILIATION IMPORT MODAL (PDF & EXCEL) */}
      <ExpenseImportReconciliationModal
        isOpen={showExpenseImportModal}
        onClose={() => setShowExpenseImportModal(false)}
        masterData={masterData}
        setMasterData={setMasterData}
        userSession={userSession}
        themeMode={themeMode}
      />
    </div>
  );
}
