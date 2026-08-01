import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  Database, 
  ShoppingBag,
  DollarSign, 
  Package, 
  CheckSquare, 
  FileText, 
  BookOpen, 
  Settings, 
  PlusCircle, 
  Building2, 
  Smartphone,
  Award,
  FileEdit,
  History,
  Receipt,
  LogOut,
  Bell,
  ChevronDown,
  Calendar,
  Sparkles,
  Users,
  BarChart3,
  Crown
} from 'lucide-react';

import { checkWebPermission } from '../../utils/permissionUtils';

export default function AdminLayout({ 
  activeTab, 
  setActiveTab, 
  selectedBranch, 
  setSelectedBranch, 
  outlets, 
  pendingCount, 
  onSwitchToMobile,
  onOpenAddTransaction,
  onLogout,
  userSession,
  masterData,
  children
}) {
  const menuItems = [
    { id: 'dashboard', label: '1. Dashboard', icon: LayoutDashboard, permKey: 'dashboard' },
    { id: 'data', label: '2. Data Master', icon: Database, permKey: 'masterData' },
    { id: 'manual_entry', label: '3. Laporan dari Outlet', icon: FileEdit, permKey: 'costs' },
    { id: 'sales', label: '4. Penjualan', icon: ShoppingBag, permKey: 'reports' },
    { id: 'stock', label: '5. Logistik', icon: Package, permKey: 'stock' },
    { id: 'reports', label: '6. Laporan Keuangan', icon: FileText, permKey: 'reports' },
    { id: 'sop', label: '7. Kelola SOP Restoran', icon: BookOpen, permKey: 'policies' },
    { id: 'loyalty', label: '8. Program Loyalitas', icon: Award, permKey: 'masterData' },
    { id: 'settings', label: '9. Pengaturan', icon: Settings, permKey: 'settings' },
    { id: 'activity_log', label: '10. Log Aktivitas', icon: History, permKey: 'settings' }
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

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#0b0f19', color: '#f8fafc', fontFamily: 'Inter, system-ui, sans-serif' }}>
      {/* Sidebar Navigation */}
      <aside style={{
        width: '260px',
        background: '#111625',
        borderRight: '1px solid rgba(255,255,255,0.06)',
        display: 'flex',
        flexDirection: 'column',
        position: 'sticky',
        top: 0,
        height: '100vh',
        zIndex: 20,
        userSelect: 'none'
      }}>
        {/* Brand Logo Header */}
        <div style={{ padding: '16px 18px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: '12px' }}>
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
            <Crown size={22} color="#ffffff" />
          </div>
          <div>
            <h1 style={{ fontSize: '0.98rem', fontWeight: '900', color: '#f59e0b', letterSpacing: '0.04em', margin: 0, textTransform: 'uppercase' }}>
              BAROKAH GROUP
            </h1>
            <p style={{ fontSize: '0.62rem', color: '#94a3b8', fontWeight: '700', margin: '1px 0 0 0', letterSpacing: '0.05em' }}>
              RESTAURANT MANAGEMENT SYSTEM
            </p>
          </div>
        </div>

        {/* Quick Action Button */}
        <div style={{ padding: '12px 14px' }}>
          <button 
            onClick={onOpenAddTransaction}
            style={{
              width: '100%',
              padding: '9px 12px',
              borderRadius: '8px',
              border: 'none',
              background: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)',
              color: '#ffffff',
              fontWeight: '800',
              fontSize: '0.80rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              boxShadow: '0 4px 12px rgba(217, 119, 6, 0.3)'
            }}
          >
            <PlusCircle size={16} />
            <span>Catat Transaksi Kas</span>
          </button>
        </div>

        {/* Navigation Menu Items */}
        <nav style={{ flex: 1, padding: '0 10px', display: 'flex', flexDirection: 'column', gap: '3px', overflowY: 'auto' }}>
          <div style={{ fontSize: '0.64rem', textTransform: 'uppercase', color: '#64748b', fontWeight: '800', padding: '6px 10px 2px 10px', letterSpacing: '0.05em' }}>
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
                  padding: '9px 12px',
                  borderRadius: '8px',
                  border: 'none',
                  background: isActive ? 'linear-gradient(135deg, #ca8a04 0%, #a16207 100%)' : 'transparent',
                  color: isActive ? '#ffffff' : '#cbd5e1',
                  fontWeight: isActive ? '800' : '600',
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  textAlign: 'left',
                  boxShadow: isActive ? '0 4px 12px rgba(202, 138, 4, 0.3)' : 'none',
                  transition: 'all 0.2s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Icon size={17} color={isActive ? '#ffffff' : '#94a3b8'} />
                  <span>{item.label}</span>
                </div>
                {item.id === 'stock' && pendingCount > 0 && (
                  <span style={{ background: '#ef4444', color: 'white', fontSize: '0.66rem', fontWeight: '800', padding: '2px 6px', borderRadius: '10px' }}>
                    {pendingCount}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* User Profile Footer */}
        <div style={{ padding: '12px 14px', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', fontSize: '0.80rem', color: '#ffffff', border: '1px solid #f59e0b', flexShrink: 0 }}>
            {userInitial}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '0.78rem', fontWeight: '800', color: '#f8fafc', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{userName}</div>
            <div style={{ fontSize: '0.64rem', color: '#f59e0b', fontWeight: '700', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{userRole} • {userOutlet}</div>
          </div>
          {onLogout && (
            <button
              onClick={onLogout}
              title="Keluar / Logout"
              style={{
                background: 'rgba(244, 63, 94, 0.15)',
                border: '1px solid rgba(244, 63, 94, 0.3)',
                color: '#fb7185',
                padding: '5px 7px',
                borderRadius: '6px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <LogOut size={14} />
            </button>
          )}
        </div>
      </aside>

      {/* Main Container */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, background: '#0b0f19' }}>
        {/* Top Header Bar */}
        <header style={{
          height: '56px',
          background: '#111625',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          padding: '0 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'sticky',
          top: 0,
          zIndex: 999
        }}>
          {/* Greeting & Date */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ fontSize: '0.90rem', fontWeight: '800', color: '#ffffff' }}>
              Selamat Datang, {userName} 🖐️
            </div>
            <span style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: '600', paddingLeft: '8px', borderLeft: '1px solid #334155' }}>
              {todayFormatted}
            </span>
          </div>

          {/* Right Controls (Outlet Dropdown, Date Range, Notification, Profile) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {/* Outlet Switcher */}
            <div style={{ position: 'relative' }}>
              <select 
                value={selectedBranch || ''}
                onChange={(e) => setSelectedBranch(e.target.value ? parseInt(e.target.value) : null)}
                style={{
                  padding: '6px 28px 6px 12px',
                  background: '#1e293b',
                  border: '1px solid #334155',
                  borderRadius: '8px',
                  color: '#ffffff',
                  fontSize: '0.76rem',
                  fontWeight: '700',
                  cursor: 'pointer',
                  appearance: 'none'
                }}
              >
                <option value="">🏢 Semua Restoran (Konsolidasi)</option>
                {outlets.map(o => (
                  <option key={o.id} value={o.id}>📍 {o.name}</option>
                ))}
              </select>
              <ChevronDown size={14} color="#94a3b8" style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
            </div>

            {/* Date Range Selector */}
            <button
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                background: '#1e293b',
                border: '1px solid #334155',
                borderRadius: '8px',
                color: '#ffffff',
                fontSize: '0.76rem',
                fontWeight: '700',
                cursor: 'pointer'
              }}
            >
              <Calendar size={14} color="#94a3b8" />
              <span>Hari Ini</span>
              <ChevronDown size={14} color="#94a3b8" />
            </button>

            {/* Notification Bell */}
            <div style={{ position: 'relative', width: '32px', height: '32px', borderRadius: '8px', background: '#1e293b', border: '1px solid #334155', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <Bell size={16} color="#cbd5e1" />
              {pendingCount > 0 && (
                <span style={{ position: 'absolute', top: '-4px', right: '-4px', background: '#ef4444', color: '#ffffff', fontSize: '0.62rem', fontWeight: '900', borderRadius: '50%', width: '15px', height: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {pendingCount}
                </span>
              )}
            </div>



            {/* Profile Avatar Badge */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 8px 4px 4px', background: '#1e293b', border: '1px solid #334155', borderRadius: '20px' }}>
              <div style={{ width: '26px', height: '26px', borderRadius: '50%', background: '#d97706', color: '#ffffff', fontWeight: '900', fontSize: '0.72rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                BA
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '0.74rem', fontWeight: '800', color: '#ffffff', lineHeight: '1' }}>Bang Argun</span>
                <span style={{ fontSize: '0.62rem', color: '#94a3b8', lineHeight: '1', marginTop: '2px' }}>Owner</span>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main style={{ flex: 1, padding: '16px', overflowY: 'auto' }}>
          {children}
        </main>
      </div>
    </div>
  );
}
