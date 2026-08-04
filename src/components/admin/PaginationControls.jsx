import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { getThemePalette } from '../../utils/themeUtils';

export default function PaginationControls({
  currentPage = 1,
  totalPages = 1,
  pageSize = 25,
  totalItems = 0,
  onPageChange = () => {},
  onPageSizeChange = () => {},
  themeMode = 'dark'
}) {
  const T = getThemePalette(themeMode);

  if (totalItems === 0) return null;

  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justify: 'space-between',
      padding: '14px 18px',
      background: T.cardBg2,
      borderTop: `1px solid ${T.borderStrong}`,
      borderRadius: '0 0 16px 16px',
      flexWrap: 'wrap',
      gap: '12px',
      fontSize: '0.82rem',
      color: T.txtSecondary
    }}>
      {/* 1. Page Size Selector & Data Counter */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>Tampilkan per halaman:</span>
          <select
            value={pageSize}
            onChange={(e) => {
              onPageSizeChange(Number(e.target.value));
              onPageChange(1);
            }}
            style={{
              background: T.inputBg,
              color: T.txtPrimary,
              border: `1px solid ${T.borderStrong}`,
              borderRadius: '8px',
              padding: '4px 10px',
              fontWeight: '700',
              cursor: 'pointer',
              fontSize: '0.82rem',
              outline: 'none'
            }}
          >
            <option value={10} style={{ background: T.dropdownBg, color: T.txtPrimary }}>10 Baris</option>
            <option value={25} style={{ background: T.dropdownBg, color: T.txtPrimary }}>25 Baris</option>
            <option value={50} style={{ background: T.dropdownBg, color: T.txtPrimary }}>50 Baris</option>
            <option value={100} style={{ background: T.dropdownBg, color: T.txtPrimary }}>100 Baris</option>
          </select>
        </div>
        <span style={{ color: T.txtPrimary }}>
          Menampilkan <strong style={{ color: T.info }}>{startItem} - {endItem}</strong> dari <strong style={{ color: T.success }}>{totalItems}</strong> data
        </span>
      </div>

      {/* 2. Page Navigation Buttons */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <button
          type="button"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          style={{
            background: currentPage <= 1 ? T.hoverBg : T.cardBg,
            color: currentPage <= 1 ? T.txtMuted : T.txtPrimary,
            border: `1px solid ${T.borderStrong}`,
            borderRadius: '8px',
            padding: '6px 12px',
            cursor: currentPage <= 1 ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            fontWeight: '700',
            fontSize: '0.78rem',
            transition: 'all 0.15s ease'
          }}
        >
          <ChevronLeft size={16} />
          <span>Sebelumnya</span>
        </button>

        <span style={{ padding: '0 8px', fontWeight: '800', color: T.txtPrimary, fontSize: '0.82rem' }}>
          Halaman <span style={{ color: T.info }}>{currentPage}</span> dari {totalPages || 1}
        </span>

        <button
          type="button"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          style={{
            background: currentPage >= totalPages ? T.hoverBg : T.cardBg,
            color: currentPage >= totalPages ? T.txtMuted : T.txtPrimary,
            border: `1px solid ${T.borderStrong}`,
            borderRadius: '8px',
            padding: '6px 12px',
            cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            fontWeight: '700',
            fontSize: '0.78rem',
            transition: 'all 0.15s ease'
          }}
        >
          <span>Berikutnya</span>
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}

