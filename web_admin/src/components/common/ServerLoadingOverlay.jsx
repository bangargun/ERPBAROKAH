import React from 'react';
import { Server, Wifi } from 'lucide-react';

export default function ServerLoadingOverlay({ 
  show = true, 
  message = "mohon tunggu sebentar ya", 
  subMessage = "Sedang mengamankan koneksi & memuat data ke server...",
  themeMode = 'dark' 
}) {
  if (!show) return null;

  const isLight = themeMode === 'light' || themeMode === 'warm_minimalist';

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: isLight ? 'rgba(255, 255, 255, 0.85)' : 'rgba(15, 23, 42, 0.88)',
      backdropFilter: 'blur(10px)',
      WebkitBackdropFilter: 'blur(10px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999999,
      transition: 'all 0.3s ease'
    }} className="animate-fade-in">
      <div style={{
        background: isLight ? '#ffffff' : '#1e293b',
        border: isLight ? '1px solid #e2e8f0' : '1px solid rgba(255, 255, 255, 0.12)',
        borderRadius: '20px',
        padding: '32px 36px',
        boxShadow: isLight ? '0 20px 50px rgba(0,0,0,0.12)' : '0 25px 60px rgba(0,0,0,0.6)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        maxWidth: '380px',
        width: '90%'
      }}>
        {/* Animated Spinner Icon Container */}
        <div style={{
          position: 'relative',
          width: '72px',
          height: '72px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          {/* Outer Glowing Spinning Ring */}
          <div style={{
            position: 'absolute',
            inset: 0,
            borderRadius: '50%',
            border: '3px solid transparent',
            borderTopColor: '#38bdf8',
            borderRightColor: '#34d399',
            animation: 'spin 1s linear infinite'
          }} />
          {/* Inner Pulsing Circle */}
          <div style={{
            width: '52px',
            height: '52px',
            borderRadius: '50%',
            background: isLight ? 'rgba(56, 189, 248, 0.1)' : 'rgba(56, 189, 248, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#38bdf8'
          }}>
            <Server size={24} className="animate-pulse" />
          </div>
        </div>

        {/* Primary Loading Message */}
        <h4 style={{
          margin: '0 0 6px 0',
          fontSize: '1.12rem',
          fontWeight: '800',
          color: isLight ? '#0f172a' : '#f8fafc',
          letterSpacing: '-0.01em'
        }}>
          {message}
        </h4>

        {/* Secondary Description */}
        <p style={{
          margin: 0,
          fontSize: '0.80rem',
          color: isLight ? '#64748b' : '#94a3b8',
          lineHeight: '1.4'
        }}>
          {subMessage}
        </p>

        {/* Connection Status Badge */}
        <div style={{
          marginTop: '18px',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          padding: '5px 14px',
          borderRadius: '20px',
          background: isLight ? 'rgba(52, 211, 153, 0.12)' : 'rgba(52, 211, 153, 0.18)',
          border: '1px solid rgba(52, 211, 153, 0.3)',
          color: '#10b981',
          fontSize: '0.72rem',
          fontWeight: '700'
        }}>
          <Wifi size={13} className="animate-pulse" />
          <span>Koneksi Server Active</span>
        </div>
      </div>
    </div>
  );
}
