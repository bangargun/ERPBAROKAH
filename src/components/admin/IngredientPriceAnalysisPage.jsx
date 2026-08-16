import React, { useState } from 'react';
import { Scale, TrendingUp, BarChart2, Table } from 'lucide-react';
import { getThemePalette } from '../../utils/themeUtils';
import IngredientPriceComparisonPage from './IngredientPriceComparisonPage';
import IngredientPriceTrendPage from './IngredientPriceTrendPage';

export default function IngredientPriceAnalysisPage({ masterData, setMasterData, selectedBranch, themeMode = 'dark' }) {
  const T = getThemePalette(themeMode);
  const [subTab, setSubTab] = useState('comparison'); // 'comparison' | 'trend'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', background: T.pageBg, color: T.txtPrimary }} className="animate-fade-in">
      {/* Top Header & Sub-Tab Switcher */}
      <div style={{
        background: T.cardBg,
        border: `1px solid ${T.borderStrong}`,
        borderRadius: '16px',
        padding: '16px 20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '14px',
        boxShadow: T.shadowSm
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ padding: '6px', borderRadius: '10px', background: T.primary, color: T.txtInverse }}>
              <Scale size={20} />
            </div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: '900', color: T.txtPrimary, margin: 0, letterSpacing: '-0.02em' }}>
              Analisis Harga Pembelian Bahan Baku
            </h2>
            <span style={{ fontSize: '0.68rem', padding: '2px 8px', borderRadius: '6px', background: T.infoBg, color: T.info, border: `1px solid ${T.infoBorder}`, fontWeight: '800' }}>
              PURCHASING AUDIT
            </span>
          </div>
          <p style={{ color: T.txtSecondary, fontSize: '0.74rem', marginTop: '4px', margin: 0 }}>
            Pantau disparitas harga antar cabang dan fluktuasi riwayat tren harga pembelian bahan baku dari supplier.
          </p>
        </div>

        {/* Sub-Tab Navigation Pill */}
        <div style={{
          display: 'inline-flex',
          background: T.cardBg2,
          padding: '4px',
          borderRadius: '12px',
          border: `1px solid ${T.borderStrong}`,
          gap: '4px'
        }}>
          <button
            type="button"
            onClick={() => setSubTab('comparison')}
            style={{
              padding: '8px 18px',
              borderRadius: '9px',
              border: 'none',
              background: subTab === 'comparison' ? T.primary : 'transparent',
              color: subTab === 'comparison' ? T.txtInverse : T.txtSecondary,
              fontWeight: '800',
              fontSize: '0.78rem',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              boxShadow: subTab === 'comparison' ? T.shadowSm : 'none'
            }}
          >
            <Table size={16} />
            <span>1. Matriks Perbandingan Antar Cabang</span>
          </button>

          <button
            type="button"
            onClick={() => setSubTab('trend')}
            style={{
              padding: '8px 18px',
              borderRadius: '9px',
              border: 'none',
              background: subTab === 'trend' ? T.primary : 'transparent',
              color: subTab === 'trend' ? T.txtInverse : T.txtSecondary,
              fontWeight: '800',
              fontSize: '0.78rem',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              boxShadow: subTab === 'trend' ? T.shadowSm : 'none'
            }}
          >
            <TrendingUp size={16} />
            <span>2. Grafik Tren Fluktuasi Waktu</span>
          </button>
        </div>
      </div>

      {/* Render Active View */}
      {subTab === 'comparison' ? (
        <IngredientPriceComparisonPage
          masterData={masterData}
          selectedBranch={selectedBranch}
          themeMode={themeMode}
        />
      ) : (
        <IngredientPriceTrendPage
          masterData={masterData}
          selectedBranch={selectedBranch}
          themeMode={themeMode}
        />
      )}
    </div>
  );
}
