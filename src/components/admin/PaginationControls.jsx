import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function PaginationControls({
  currentPage = 1,
  totalPages = 1,
  pageSize = 25,
  totalItems = 0,
  onPageChange = () => {},
  onPageSizeChange = () => {}
}) {
  if (totalItems === 0) return null;

  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justify: 'space-between',
      padding: '14px 18px',
      background: '#0f172a',
      borderTop: '1px solid #1e293b',
      borderRadius: '0 0 16px 16px',
      flexWrap: 'wrap',
      gap: '12px',
      fontSize: '0.82rem',
      color: '#94a3b8'
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
              background: '#1e293b',
              color: '#f8fafc',
              border: '1px solid #334155',
              borderRadius: '8px',
              padding: '4px 10px',
              fontWeight: '700',
              cursor: 'pointer',
              fontSize: '0.82rem',
              outline: 'none'
            }}
          >
            <option value={10}>10 Baris</option>
            <option value={25}>25 Baris</option>
            <option value={50}>50 Baris</option>
            <option value={100}>100 Baris</option>
          </select>
        </div>
        <span style={{ color: '#cbd5e1' }}>
          Menampilkan <strong style={{ color: '#38bdf8' }}>{startItem} - {endItem}</strong> dari <strong style={{ color: '#34d399' }}>{totalItems}</strong> data
        </span>
      </div>

      {/* 2. Page Navigation Buttons */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <button
          type="button"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          style={{
            background: currentPage <= 1 ? 'rgba(255,255,255,0.04)' : '#1e293b',
            color: currentPage <= 1 ? '#475569' : '#f8fafc',
            border: '1px solid #334155',
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

        <span style={{ padding: '0 8px', fontWeight: '800', color: '#f8fafc', fontSize: '0.82rem' }}>
          Halaman <span style={{ color: '#38bdf8' }}>{currentPage}</span> dari {totalPages || 1}
        </span>

        <button
          type="button"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          style={{
            background: currentPage >= totalPages ? 'rgba(255,255,255,0.04)' : '#1e293b',
            color: currentPage >= totalPages ? '#475569' : '#f8fafc',
            border: '1px solid #334155',
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
