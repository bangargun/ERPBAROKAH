import React, { useState, useEffect, useRef } from 'react';

const DELETE_PASSWORD = 'Bismillah';

/**
 * DeleteGuardModal
 * Modal konfirmasi hapus dengan perlindungan password jika item memiliki transaksi.
 * 
 * Props:
 *   guardState: { show, type, id, name, txCount, onConfirmed }
 *   onClose: () => void
 *   theme: 'dark' | 'light'
 */
export default function DeleteGuardModal({ guardState, state, onClose, theme = 'dark', themeMode }) {
  const activeGuard = guardState || state;
  const currentTheme = themeMode || theme || 'dark';

  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showPass, setShowPass] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (activeGuard?.show) {
      setPassword('');
      setError('');
      setShowPass(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [activeGuard?.show]);

  if (!activeGuard?.show) return null;

  const { name, txCount, onConfirmed } = activeGuard;
  const needsPassword = txCount > 0;

  const isDark = currentTheme === 'dark';
  const bg = isDark ? '#0f172a' : '#ffffff';
  const bgCard = isDark ? '#1e293b' : '#f8fafc';
  const txtPrimary = isDark ? '#f1f5f9' : '#0f172a';
  const txtSecondary = isDark ? '#94a3b8' : '#64748b';
  const border = isDark ? '#334155' : '#e2e8f0';
  const danger = '#ef4444';
  const dangerBg = isDark ? 'rgba(239,68,68,0.12)' : 'rgba(239,68,68,0.08)';
  const warningBg = isDark ? 'rgba(234,179,8,0.1)' : 'rgba(234,179,8,0.08)';
  const warningBorder = '#ca8a04';

  const handleConfirm = () => {
    if (needsPassword) {
      if (password !== DELETE_PASSWORD) {
        setError('Password salah! Penghapusan dibatalkan.');
        setPassword('');
        inputRef.current?.focus();
        return;
      }
    }
    onClose();
    onConfirmed();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleConfirm();
    if (e.key === 'Escape') onClose();
  };

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.75)',
        backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 99999, padding: '16px', boxSizing: 'border-box',
      }}
    >
      <div style={{
        width: '100%', maxWidth: '440px',
        background: bgCard,
        borderRadius: '20px',
        border: `1.5px solid ${needsPassword ? warningBorder : border}`,
        boxShadow: needsPassword
          ? '0 20px 60px rgba(234,179,8,0.2)'
          : '0 20px 60px rgba(0,0,0,0.4)',
        overflow: 'hidden',
        animation: 'fadeInScale 0.18s ease',
      }}>
        {/* Header */}
        <div style={{
          background: needsPassword
            ? 'linear-gradient(135deg, #92400e 0%, #78350f 100%)'
            : 'linear-gradient(135deg, #7f1d1d 0%, #991b1b 100%)',
          padding: '20px 24px',
          display: 'flex', alignItems: 'center', gap: '14px',
        }}>
          <div style={{
            width: '48px', height: '48px', borderRadius: '14px',
            background: 'rgba(255,255,255,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '24px', flexShrink: 0,
          }}>
            {needsPassword ? '' : ''}
          </div>
          <div>
            <div style={{ fontSize: '1rem', fontWeight: '900', color: '#fff' }}>
              {needsPassword ? 'Data Terkunci — Perlu Password' : 'Konfirmasi Hapus'}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.75)', marginTop: '2px' }}>
              {needsPassword
                ? `${txCount} transaksi terkait ditemukan`
                : 'Tindakan ini tidak dapat dibatalkan'}
            </div>
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: '24px' }}>

          {/* Item name */}
          <div style={{
            background: dangerBg,
            border: `1px solid ${isDark ? 'rgba(239,68,68,0.25)' : 'rgba(239,68,68,0.2)'}`,
            borderRadius: '12px', padding: '14px 16px',
            marginBottom: '16px',
            display: 'flex', alignItems: 'center', gap: '10px',
          }}>
            <span style={{ fontSize: '18px' }}></span>
            <div>
              <div style={{ fontSize: '0.72rem', color: txtSecondary, marginBottom: '2px' }}>Item yang akan dihapus:</div>
              <div style={{ fontSize: '0.95rem', fontWeight: '800', color: danger }}>{name}</div>
            </div>
          </div>

          {/* Warning jika ada transaksi */}
          {needsPassword && (
            <div style={{
              background: warningBg,
              border: `1px solid ${warningBorder}`,
              borderRadius: '12px', padding: '14px 16px',
              marginBottom: '20px',
            }}>
              <div style={{ fontSize: '0.82rem', fontWeight: '800', color: '#fbbf24', marginBottom: '6px' }}>
                Peringatan Keras
              </div>
              <div style={{ fontSize: '0.77rem', color: isDark ? '#fde68a' : '#92400e', lineHeight: 1.6 }}>
                Data ini memiliki <strong>{txCount} transaksi terkait</strong> (riwayat penjualan, laporan, atau logistik).
                Menghapus data ini dapat merusak laporan keuangan dan histori transaksi.
                <br /><br />
                Masukkan password untuk melanjutkan penghapusan.
              </div>
            </div>
          )}

          {/* Password input */}
          {needsPassword && (
            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '0.78rem', fontWeight: '700', color: txtSecondary, display: 'block', marginBottom: '8px' }}>
                Password Hapus
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  ref={inputRef}
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={e => { setPassword(e.target.value); setError(''); }}
                  onKeyDown={handleKeyDown}
                  placeholder="Masukkan password..."
                  style={{
                    width: '100%', boxSizing: 'border-box',
                    padding: '12px 44px 12px 16px',
                    background: bg, border: `1.5px solid ${error ? danger : border}`,
                    borderRadius: '10px', color: txtPrimary,
                    fontSize: '0.9rem', outline: 'none',
                    fontFamily: 'inherit',
                    transition: 'border-color 0.2s',
                  }}
                />
                <button
                  onClick={() => setShowPass(v => !v)}
                  style={{
                    position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: txtSecondary, fontSize: '16px', padding: '0',
                  }}
                >
                  {showPass ? '' : ''}
                </button>
              </div>
              {error && (
                <div style={{ marginTop: '8px', fontSize: '0.77rem', color: danger, fontWeight: '700' }}>
                  {error}
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={onClose}
              style={{
                flex: 1, padding: '12px',
                background: isDark ? 'rgba(255,255,255,0.06)' : '#f1f5f9',
                border: `1px solid ${border}`,
                borderRadius: '10px', color: txtPrimary,
                fontSize: '0.85rem', fontWeight: '700', cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              Batal
            </button>
            <button
              onClick={handleConfirm}
              style={{
                flex: 1.5, padding: '12px',
                background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
                border: 'none', borderRadius: '10px',
                color: '#fff', fontSize: '0.85rem', fontWeight: '900',
                cursor: 'pointer', boxShadow: '0 4px 12px rgba(220,38,38,0.35)',
                transition: 'all 0.15s',
              }}
            >
              {needsPassword ? 'Hapus dengan Password' : 'Ya, Hapus'}
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fadeInScale {
          from { opacity: 0; transform: scale(0.92); }
          to   { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
