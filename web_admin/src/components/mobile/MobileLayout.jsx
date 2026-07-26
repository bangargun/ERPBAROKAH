import React, { useState } from 'react';
import { 
  Home, 
  PlusCircle, 
  Clock, 
  Store, 
  ArrowLeft, 
  Sparkles, 
  FileText,
  ShieldCheck
} from 'lucide-react';

export default function MobileLayout({ 
  children, 
  currentTab, 
  setCurrentTab, 
  selectedBranch, 
  setSelectedBranch, 
  outlets, 
  onSwitchToAdmin 
}) {
  const currentOutlet = outlets.find(o => o.id === selectedBranch) || outlets[0];

  return (
    <div className="mobile-app-wrapper">
      <div className="mobile-device-frame animate-fade-in">
        {/* Notch */}
        <div className="mobile-notch">
          <div className="mobile-notch-camera"></div>
        </div>

        {/* Top Header App Bar */}
        <div style={{
          height: '60px',
          background: '#1e293b',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          padding: '0 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          zIndex: 30,
          marginTop: '10px'
        }}>
          {/* Branch Picker Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: currentOutlet?.color || '#6366f1',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontWeight: '800',
              fontSize: '0.8rem'
            }}>
              {currentOutlet?.code?.split('-')[1] || 'RST'}
            </div>
            <div>
              <select
                value={selectedBranch || (outlets[0]?.id || '')}
                onChange={e => setSelectedBranch(parseInt(e.target.value))}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#f8fafc',
                  fontWeight: '700',
                  fontSize: '0.82rem',
                  outline: 'none',
                  cursor: 'pointer'
                }}
              >
                {outlets.map(o => (
                  <option key={o.id} value={o.id} style={{ background: '#1e293b' }}>
                    {o.name}
                  </option>
                ))}
              </select>
              <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>Mode Kasir & Manajer Mobile</div>
            </div>
          </div>

          {/* Switch to Web Admin Desktop View */}
          <button 
            onClick={onSwitchToAdmin}
            style={{
              background: 'rgba(99, 102, 241, 0.15)',
              border: '1px solid rgba(99, 102, 241, 0.3)',
              color: '#818cf8',
              padding: '4px 10px',
              borderRadius: '8px',
              fontSize: '0.7rem',
              fontWeight: '700',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <span>Desktop Web</span>
          </button>
        </div>

        {/* Scrollable Screen Content */}
        <div className="mobile-screen-content" style={{ padding: '16px' }}>
          {children}
        </div>

        {/* Mobile Bottom Navigation Bar */}
        <nav className="mobile-bottom-nav">
          <button 
            onClick={() => setCurrentTab('home')}
            className={`mobile-nav-item ${currentTab === 'home' ? 'active' : ''}`}
          >
            <Home size={20} />
            <span>Beranda</span>
          </button>

          <button 
            onClick={() => setCurrentTab('add-tx')}
            className={`mobile-nav-item ${currentTab === 'add-tx' ? 'active' : ''}`}
          >
            <PlusCircle size={20} />
            <span>Catat Transaksi</span>
          </button>

          <button 
            onClick={() => setCurrentTab('shift-close')}
            className={`mobile-nav-item ${currentTab === 'shift-close' ? 'active' : ''}`}
          >
            <Clock size={20} />
            <span>Tutup Kas Shift</span>
          </button>

          <button 
            onClick={() => setCurrentTab('summary')}
            className={`mobile-nav-item ${currentTab === 'summary' ? 'active' : ''}`}
          >
            <FileText size={20} />
            <span>Ringkasan Hari Ini</span>
          </button>
        </nav>
      </div>
    </div>
  );
}
