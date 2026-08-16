import React, { useState, useMemo } from 'react';
import {
  Sparkles,
  X,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  DollarSign,
  ShoppingBag,
  Building2,
  Percent,
  Package,
  Layers,
  Award,
  ArrowUpRight,
  ArrowDownRight,
  Lightbulb,
  ShieldCheck,
  Zap,
  Target,
  RefreshCw,
  Copy,
  Check
} from 'lucide-react';
import { getThemePalette } from '../../utils/themeUtils';

export default function DashboardAIInsightModal({
  isOpen,
  onClose,
  initialTab = 'summary',
  kpiMetrics = {},
  salesTrendData = [],
  topSellingMenu = [],
  branchComparisonData = [],
  ingredientDisparityList = [],
  allOutlets = [],
  activeOutletFilter = 'ALL',
  dateRangePreset = '7days',
  themeMode = 'dark'
}) {
  const T = getThemePalette(themeMode);
  const [activeTab, setActiveTab] = useState(initialTab);
  const [copied, setCopied] = useState(false);

  // Sync initial tab when opened with a specific topic
  React.useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab, isOpen]);

  const formatRupiah = (val) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val || 0);
  };

  // -------------------------------------------------------------
  // AI INTELLIGENCE CALCULATIONS
  // -------------------------------------------------------------
  const aiAnalytics = useMemo(() => {
    const totalRev = Number(kpiMetrics.totalRevenue || 0);
    const totalNet = Number(kpiMetrics.netProfit || 0);
    const totalCogs = Number(kpiMetrics.totalCogs || 0);
    const totalOpex = Number(kpiMetrics.totalOpex || 0);
    const marginPct = Number(kpiMetrics.marginPct || 0);
    const avgTicket = Number(kpiMetrics.avgTicket || 0);

    // 1. Health Score (0 - 100)
    let score = 85;
    if (marginPct >= 35) score += 10;
    else if (marginPct < 20 && marginPct > 0) score -= 15;
    else if (marginPct <= 0) score -= 30;

    // Check overbudget branches
    const overbudgetBranches = branchComparisonData.filter(b => b.isOverHppBudget);
    score -= overbudgetBranches.length * 4;
    score = Math.max(20, Math.min(98, score));

    // 2. High Disparity Items
    const alertDisparities = ingredientDisparityList.filter(i => i.hasDisparityAlert);
    const totalPotentialSavings = alertDisparities.reduce((sum, item) => {
      // Est savings per month (assuming 50 units avg per month)
      return sum + (item.disparity * 50);
    }, 0);

    // 3. Top Performer Branch & Branch Needing Attention
    const sortedBranchesByProfit = [...branchComparisonData].sort((a, b) => b.netProfit - a.netProfit);
    const bestBranch = sortedBranchesByProfit[0] || null;
    const worstBranch = sortedBranchesByProfit[sortedBranchesByProfit.length - 1] || null;

    // 4. Star Products
    const starMenu = topSellingMenu.slice(0, 3);
    const topMenuContribution = starMenu.reduce((s, m) => s + (m.percentage || 0), 0);

    return {
      score,
      healthStatus: score >= 80 ? 'Sangat Sehat & Menguntungkan' : score >= 60 ? 'Stabil & Terkendali' : 'Perlu Evaluasi Biaya',
      overbudgetBranches,
      alertDisparities,
      totalPotentialSavings,
      bestBranch,
      worstBranch,
      starMenu,
      topMenuContribution,
      totalRev,
      totalNet,
      totalCogs,
      totalOpex,
      marginPct,
      avgTicket
    };
  }, [kpiMetrics, branchComparisonData, ingredientDisparityList, topSellingMenu]);

  // Copy Executive Summary
  const handleCopySummary = () => {
    const summaryText = `*Laporan Insight AI Multi-Restoran Barokah Group*
Periode: ${dateRangePreset.toUpperCase()} | Filter: ${activeOutletFilter === 'ALL' ? 'Semua Cabang' : 'Cabang Terpilih'}
Score Kesehatan: ${aiAnalytics.score}/100 (${aiAnalytics.healthStatus})

*Metrik Finansial:*
- Total Omzet: ${formatRupiah(aiAnalytics.totalRev)}
- Laba Bersih: ${formatRupiah(aiAnalytics.totalNet)} (Margin: ${aiAnalytics.marginPct}%)
- Beban HPP: ${formatRupiah(aiAnalytics.totalCogs)}
- Rata-rata Nota (Ticket): ${formatRupiah(aiAnalytics.avgTicket)}

*Rekomendasi Utama:*
1. ${aiAnalytics.overbudgetBranches.length > 0 ? `Evaluasi ${aiAnalytics.overbudgetBranches.map(b => b.name).join(', ')} karena HPP > 60%` : 'Efisiensi HPP seluruh cabang berada dalam batas aman ideal'}
2. ${aiAnalytics.alertDisparities.length > 0 ? `Sentralisasi pengadaan ${aiAnalytics.alertDisparities.map(i => i.name).join(', ')} untuk hemat est. ${formatRupiah(aiAnalytics.totalPotentialSavings)}/bulan` : 'Harga pembelian bahan baku antar cabang sudah seragam'}
3. Maksimalkan promosi menu terlaris: ${aiAnalytics.starMenu.map(m => m.name).join(', ')}`;

    navigator.clipboard.writeText(summaryText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  if (!isOpen) return null;

  const tabs = [
    { id: 'summary', label: 'Ringkasan Eksekutif', icon: Sparkles, badge: `${aiAnalytics.score}/100` },
    { id: 'sales', label: 'Tren Penjualan & Menu', icon: TrendingUp, badge: `${topSellingMenu.length} Menu` },
    { id: 'cogs', label: 'Efisiensi HPP & Biaya', icon: Percent, badge: aiAnalytics.overbudgetBranches.length > 0 ? `${aiAnalytics.overbudgetBranches.length} Over` : 'Aman' },
    { id: 'purchasing', label: 'Disparitas Bahan Baku', icon: Package, badge: `${aiAnalytics.alertDisparities.length} Selisih` },
    { id: 'branches', label: 'Diagnostik 5 Cabang', icon: Building2, badge: '5 Outlet' }
  ];

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0, 0, 0, 0.8)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1100,
      padding: '16px'
    }}>
      <div className="glass-card animate-fade-in" style={{
        width: '100%',
        maxWidth: '920px',
        maxHeight: '90vh',
        background: T.cardBg,
        border: `1px solid ${T.borderStrong}`,
        borderRadius: '20px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}>
        {/* Header Modal */}
        <div style={{
          padding: '18px 24px',
          background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(168, 85, 247, 0.15) 100%)',
          borderBottom: `1px solid ${T.borderStrong}`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(99, 102, 241, 0.4)',
              color: '#fff'
            }}>
              <Sparkles size={22} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h2 style={{ fontSize: '1.15rem', fontWeight: '900', color: T.txtPrimary, margin: 0, letterSpacing: '-0.02em' }}>
                  Insight AI Multi-Restoran Barokah Group
                </h2>
                <span style={{ fontSize: '0.66rem', fontWeight: '900', color: '#a855f7', background: 'rgba(168, 85, 247, 0.15)', border: '1px solid rgba(168, 85, 247, 0.3)', padding: '2px 8px', borderRadius: '6px' }}>
                  GEN-AI EXECUTIVE INTELLIGENCE
                </span>
              </div>
              <p style={{ color: T.txtSecondary, fontSize: '0.74rem', margin: '3px 0 0 0' }}>
                Analisis otomatis performa omzet, efisiensi HPP dapur, komparasi harga supplier, dan diagnostik cabang.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              onClick={handleCopySummary}
              style={{
                background: T.cardBg2,
                border: `1px solid ${T.borderStrong}`,
                color: copied ? T.success : T.txtPrimary,
                padding: '6px 12px',
                borderRadius: '8px',
                fontSize: '0.72rem',
                fontWeight: '700',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer'
              }}
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
              <span>{copied ? 'Tersalin ke Clipboard!' : 'Salin Laporan AI'}</span>
            </button>

            <button
              onClick={onClose}
              style={{
                background: T.cardBg2,
                border: `1px solid ${T.border}`,
                color: T.txtSecondary,
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer'
              }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Sub-Tab Navigation Bar */}
        <div style={{
          display: 'flex',
          background: T.cardBg2,
          borderBottom: `1px solid ${T.borderStrong}`,
          padding: '6px 16px',
          gap: '6px',
          overflowX: 'auto'
        }}>
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                style={{
                  padding: '8px 14px',
                  borderRadius: '10px',
                  border: 'none',
                  background: isActive ? T.primary : 'transparent',
                  color: isActive ? T.txtInverse : T.txtSecondary,
                  fontWeight: '800',
                  fontSize: '0.76rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.15s ease'
                }}
              >
                <Icon size={15} />
                <span>{tab.label}</span>
                <span style={{
                  fontSize: '0.65rem',
                  padding: '1px 6px',
                  borderRadius: '12px',
                  background: isActive ? 'rgba(0,0,0,0.2)' : T.inputBg,
                  color: isActive ? T.txtInverse : T.txtPrimary,
                  fontWeight: '700'
                }}>
                  {tab.badge}
                </span>
              </button>
            );
          })}
        </div>

        {/* Modal Scrollable Body */}
        <div style={{ padding: '22px 24px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '18px' }}>
          
          {/* TAB 1: EXECUTIVE SUMMARY */}
          {activeTab === 'summary' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }} className="animate-fade-in">
              {/* Health Score Banner */}
              <div style={{
                background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.1) 0%, rgba(99, 102, 241, 0.1) 100%)',
                border: `1px solid ${T.successBorder}`,
                borderRadius: '14px',
                padding: '16px 20px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '14px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div style={{
                    width: '54px',
                    height: '54px',
                    borderRadius: '14px',
                    background: T.successBg,
                    border: `2px solid ${T.success}`,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: T.success,
                    fontWeight: '900'
                  }}>
                    <span style={{ fontSize: '1.25rem', lineHeight: 1 }}>{aiAnalytics.score}</span>
                    <span style={{ fontSize: '0.55rem', textTransform: 'uppercase' }}>SCORE</span>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.68rem', fontWeight: '800', color: T.success, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      STATUS KESEHATAN FINANSIAL
                    </span>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: '900', color: T.txtPrimary, margin: '2px 0 0 0' }}>
                      {aiAnalytics.healthStatus}
                    </h3>
                    <p style={{ fontSize: '0.72rem', color: T.txtSecondary, margin: '2px 0 0 0' }}>
                      Margin Laba Bersih berada pada tingkat <strong>{aiAnalytics.marginPct}%</strong> dengan total profit <strong>{formatRupiah(aiAnalytics.totalNet)}</strong>.
                    </p>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <div style={{ background: T.cardBg, border: `1px solid ${T.border}`, padding: '8px 14px', borderRadius: '10px', textAlign: 'center' }}>
                    <span style={{ fontSize: '0.64rem', color: T.txtSecondary, fontWeight: '700' }}>TOTAL OMZET</span>
                    <div style={{ fontSize: '0.96rem', fontWeight: '900', color: T.txtPrimary }}>{formatRupiah(aiAnalytics.totalRev)}</div>
                  </div>
                  <div style={{ background: T.cardBg, border: `1px solid ${T.border}`, padding: '8px 14px', borderRadius: '10px', textAlign: 'center' }}>
                    <span style={{ fontSize: '0.64rem', color: T.txtSecondary, fontWeight: '700' }}>LABA BERSIH</span>
                    <div style={{ fontSize: '0.96rem', fontWeight: '900', color: T.success }}>{formatRupiah(aiAnalytics.totalNet)}</div>
                  </div>
                </div>
              </div>

              {/* 3 Key Strategic Priorities */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <h4 style={{ fontSize: '0.84rem', fontWeight: '900', color: T.txtPrimary, margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Lightbulb size={16} color={T.accentGold} />
                  <span>3 Rekomendasi Tindakan Strategis Super Admin & Owner:</span>
                </h4>

                {/* Priority 1 */}
                <div style={{ background: T.cardBg2, border: `1px solid ${T.borderStrong}`, borderRadius: '12px', padding: '12px 16px', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                  <div style={{ padding: '6px', borderRadius: '8px', background: aiAnalytics.overbudgetBranches.length > 0 ? T.dangerBg : T.successBg, color: aiAnalytics.overbudgetBranches.length > 0 ? T.danger : T.success, marginTop: '2px' }}>
                    <Percent size={16} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.78rem', fontWeight: '800', color: T.txtPrimary }}>
                        1. Pengendalian Rasio HPP & Beban Produksi Dapur
                      </span>
                      <span style={{ fontSize: '0.64rem', fontWeight: '800', color: aiAnalytics.overbudgetBranches.length > 0 ? T.danger : T.success, background: aiAnalytics.overbudgetBranches.length > 0 ? T.dangerBg : T.successBg, padding: '2px 6px', borderRadius: '4px' }}>
                        {aiAnalytics.overbudgetBranches.length > 0 ? 'Prioritas Tinggi' : 'Kondisi Aman'}
                      </span>
                    </div>
                    <p style={{ fontSize: '0.72rem', color: T.txtSecondary, margin: '4px 0 0 0' }}>
                      {aiAnalytics.overbudgetBranches.length > 0
                        ? `Terdapat ${aiAnalytics.overbudgetBranches.length} cabang (${aiAnalytics.overbudgetBranches.map(b => b.name).join(', ')}) yang melewati batas HPP ideal 60%. Lakukan audit resep porsi dan cek pembelian bahan baku lokal.`
                        : 'Seluruh cabang berhasil menjaga rasio HPP di bawah 60% terhadap omzet. Pertahankan standarisasi takaran porsi dapur.'}
                    </p>
                  </div>
                </div>

                {/* Priority 2 */}
                <div style={{ background: T.cardBg2, border: `1px solid ${T.borderStrong}`, borderRadius: '12px', padding: '12px 16px', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                  <div style={{ padding: '6px', borderRadius: '8px', background: aiAnalytics.alertDisparities.length > 0 ? T.warningBg : T.infoBg, color: aiAnalytics.alertDisparities.length > 0 ? T.warning : T.info, marginTop: '2px' }}>
                    <Package size={16} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.78rem', fontWeight: '800', color: T.txtPrimary }}>
                        2. Sentralisasi Pengadaan Bahan Baku (Central Kitchen Purchasing)
                      </span>
                      <span style={{ fontSize: '0.64rem', fontWeight: '800', color: T.warning, background: T.warningBg, padding: '2px 6px', borderRadius: '4px' }}>
                        Potensi Hemat: {formatRupiah(aiAnalytics.totalPotentialSavings)}/bln
                      </span>
                    </div>
                    <p style={{ fontSize: '0.72rem', color: T.txtSecondary, margin: '4px 0 0 0' }}>
                      {aiAnalytics.alertDisparities.length > 0
                        ? `Ditemukan selisih harga signifikan (> Rp 2.000) pada ${aiAnalytics.alertDisparities.map(i => i.name).join(', ')}. Menyamakan harga beli ke supplier termurah akan langsung meningkatkan margin laba bersih grup.`
                        : 'Harga bahan baku antar cabang terpantau seragam dan stabil.'}
                    </p>
                  </div>
                </div>

                {/* Priority 3 */}
                <div style={{ background: T.cardBg2, border: `1px solid ${T.borderStrong}`, borderRadius: '12px', padding: '12px 16px', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                  <div style={{ padding: '6px', borderRadius: '8px', background: T.accentGoldBg, color: T.accentGold, marginTop: '2px' }}>
                    <Award size={16} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.78rem', fontWeight: '800', color: T.txtPrimary }}>
                        3. Peningkatan Nilai Transaksi per Meja (Upselling Menu Terlaris)
                      </span>
                      <span style={{ fontSize: '0.64rem', fontWeight: '800', color: T.info, background: T.infoBg, padding: '2px 6px', borderRadius: '4px' }}>
                        Avg: {formatRupiah(aiAnalytics.avgTicket)}/meja
                      </span>
                    </div>
                    <p style={{ fontSize: '0.72rem', color: T.txtSecondary, margin: '4px 0 0 0' }}>
                      {aiAnalytics.starMenu.length > 0
                        ? `Menu favorit (${aiAnalytics.starMenu.map(m => m.name).join(', ')}) menyumbang porsi omzet terbesar. Terapkan paket kombo minuman dan hidangan penutup pada aplikasi POS kasir untuk mendongkrak rata-rata nota di atas ${formatRupiah(aiAnalytics.avgTicket)}.`
                        : 'Optimalkan variasi paket menu bundling di kasir POS untuk mendongkrak transaksi.'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: SALES & PRODUCTS AI */}
          {activeTab === 'sales' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }} className="animate-fade-in">
              <div style={{ background: T.cardBg2, border: `1px solid ${T.borderStrong}`, borderRadius: '12px', padding: '16px' }}>
                <h4 style={{ fontSize: '0.86rem', fontWeight: '900', color: T.txtPrimary, margin: '0 0 10px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Award size={18} color={T.warning} />
                  <span>Analisis Portofolio Menu Terlaris (Stars & Cash Cows)</span>
                </h4>
                <p style={{ fontSize: '0.74rem', color: T.txtSecondary, margin: '0 0 14px 0' }}>
                  Evaluasi kontribusi menu unggulan terhadap total omzet cabang terpilih:
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {topSellingMenu.map((m) => (
                    <div key={m.rank} style={{ background: T.inputBg, border: `1px solid ${T.border}`, padding: '10px 14px', borderRadius: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontWeight: '800', color: T.txtPrimary, fontSize: '0.80rem' }}>
                          #{m.rank} {m.name}
                        </div>
                        <div style={{ fontSize: '0.68rem', color: T.txtSecondary, marginTop: '2px' }}>
                          Kuantitas: <strong>{m.qty} Porsi</strong> • Kontribusi Omzet: <strong>{m.percentage}%</strong>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '0.86rem', fontWeight: '900', color: T.success }}>
                          {formatRupiah(m.revenue)}
                        </div>
                        <span style={{ fontSize: '0.62rem', color: T.info, background: T.infoBg, padding: '2px 6px', borderRadius: '4px', fontWeight: '700' }}>
                          Menu Unggulan
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ background: T.infoBg, border: `1px solid ${T.infoBorder}`, borderRadius: '12px', padding: '14px 16px', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                <Zap size={18} color={T.info} style={{ flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <h5 style={{ fontSize: '0.80rem', fontWeight: '800', color: T.info, margin: 0 }}>Rekomendasi AI untuk Kasir & Dapur:</h5>
                  <p style={{ fontSize: '0.72rem', color: T.txtPrimary, margin: '4px 0 0 0' }}>
                    Sediakan stok bahan baku utama untuk menu <strong>{aiAnalytics.starMenu.map(m => m.name).join(', ')}</strong> di awal shift untuk mencegah *out of stock*. Latih kasir untuk menawarkan menu pendamping (ekstra sambal/minuman segar) pada setiap pemesanan menu tersebut.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: COGS & EXPENSE CONTROL */}
          {activeTab === 'cogs' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }} className="animate-fade-in">
              <div style={{ background: T.cardBg2, border: `1px solid ${T.borderStrong}`, borderRadius: '12px', padding: '16px' }}>
                <h4 style={{ fontSize: '0.86rem', fontWeight: '900', color: T.txtPrimary, margin: '0 0 10px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Percent size={18} color={T.danger} />
                  <span>Audit Rasio HPP per Cabang (Target Max 60%)</span>
                </h4>
                <p style={{ fontSize: '0.74rem', color: T.txtSecondary, margin: '0 0 14px 0' }}>
                  Status kepatuhan biaya bahan baku dapur terhadap batas ambang batas aman:
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {branchComparisonData.map(b => (
                    <div key={b.id} style={{ background: T.inputBg, border: `1px solid ${b.isOverHppBudget ? T.dangerBorder : T.border}`, padding: '10px 14px', borderRadius: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontWeight: '800', color: T.txtPrimary, fontSize: '0.80rem' }}>{b.name}</div>
                        <div style={{ fontSize: '0.68rem', color: T.txtSecondary, marginTop: '2px' }}>
                          Biaya HPP: <strong>{formatRupiah(b.hppAmount)}</strong> • Total Omzet: <strong>{formatRupiah(b.revenue)}</strong>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '0.92rem', fontWeight: '900', color: b.isOverHppBudget ? T.danger : T.success }}>
                          {b.hppPct}% HPP
                        </div>
                        <span style={{ fontSize: '0.62rem', color: b.isOverHppBudget ? T.danger : T.success, background: b.isOverHppBudget ? T.dangerBg : T.successBg, padding: '2px 6px', borderRadius: '4px', fontWeight: '700' }}>
                          {b.isOverHppBudget ? 'Over Budget (>60%)' : 'Efisien / Aman'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: PURCHASING & DISPARITY */}
          {activeTab === 'purchasing' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }} className="animate-fade-in">
              <div style={{ background: T.cardBg2, border: `1px solid ${T.borderStrong}`, borderRadius: '12px', padding: '16px' }}>
                <h4 style={{ fontSize: '0.86rem', fontWeight: '900', color: T.txtPrimary, margin: '0 0 10px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Package size={18} color={T.accentGold} />
                  <span>Deteksi Disparitas Harga Supplier Bahan Baku</span>
                </h4>
                <p style={{ fontSize: '0.74rem', color: T.txtSecondary, margin: '0 0 14px 0' }}>
                  Daftar bahan baku dengan selisih harga beli antar cabang tertinggi:
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {aiAnalytics.alertDisparities.length === 0 ? (
                    <div style={{ padding: '24px', textAlign: 'center', color: T.txtMuted, fontSize: '0.76rem' }}>
                      Tidak ditemukan disparitas harga mencolok antar cabang (seluruh harga beli supplier seragam).
                    </div>
                  ) : (
                    aiAnalytics.alertDisparities.map((item, idx) => (
                      <div key={idx} style={{ background: T.inputBg, border: `1px solid ${T.dangerBorder}`, padding: '10px 14px', borderRadius: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ fontWeight: '800', color: T.txtPrimary, fontSize: '0.80rem' }}>
                            {item.name} <span style={{ fontSize: '0.68rem', color: T.txtSecondary }}>({item.unit})</span>
                          </div>
                          <div style={{ fontSize: '0.68rem', color: T.txtSecondary, marginTop: '2px' }}>
                            Harga Termurah: <strong style={{ color: T.success }}>{formatRupiah(item.minPrice)}</strong> • Termahal: <strong style={{ color: T.danger }}>{formatRupiah(item.maxPrice)}</strong>
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <span style={{ fontSize: '0.72rem', fontWeight: '900', color: T.danger, background: T.dangerBg, padding: '3px 8px', borderRadius: '6px' }}>
                            Selisih: {formatRupiah(item.disparity)} / {item.unit}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: BRANCH DIAGNOSTICS */}
          {activeTab === 'branches' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }} className="animate-fade-in">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px' }}>
                {branchComparisonData.map((b, idx) => (
                  <div key={b.id} style={{ background: T.cardBg2, border: `1px solid ${T.borderStrong}`, borderRadius: '12px', padding: '14px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '10px' }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.66rem', fontWeight: '800', color: T.info, background: T.infoBg, padding: '2px 6px', borderRadius: '4px' }}>
                          Cabang #{idx + 1}
                        </span>
                        <span style={{ fontSize: '0.64rem', fontWeight: '800', color: b.netProfit >= 0 ? T.success : T.danger }}>
                          {b.netProfit >= 0 ? 'Surplus' : 'Defisit'}
                        </span>
                      </div>
                      <h4 style={{ fontSize: '0.84rem', fontWeight: '900', color: T.txtPrimary, margin: '6px 0 2px 0' }}>
                        {b.name}
                      </h4>
                    </div>

                    <div style={{ background: T.inputBg, padding: '8px 10px', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.70rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: T.txtSecondary }}>Omzet Penjualan:</span>
                        <span style={{ fontWeight: '800', color: T.txtPrimary }}>{formatRupiah(b.revenue)}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: T.txtSecondary }}>Laba Bersih:</span>
                        <span style={{ fontWeight: '900', color: b.netProfit >= 0 ? T.success : T.danger }}>{formatRupiah(b.netProfit)}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: T.txtSecondary }}>Rasio HPP:</span>
                        <span style={{ fontWeight: '800', color: b.isOverHppBudget ? T.danger : T.success }}>{b.hppPct}%</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Footer Actions */}
        <div style={{
          padding: '14px 24px',
          background: T.cardBg2,
          borderTop: `1px solid ${T.borderStrong}`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '10px'
        }}>
          <div style={{ fontSize: '0.70rem', color: T.txtSecondary, display: 'flex', alignItems: 'center', gap: '6px' }}>
            <ShieldCheck size={14} color={T.success} />
            <span>Data analisis dihitung secara dinamis dari catatan penjualan, HPP harian, dan logistik terkini.</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="btn-primary"
            style={{
              padding: '8px 20px',
              fontSize: '0.78rem',
              fontWeight: '800'
            }}
          >
            Tutup Panel AI
          </button>
        </div>
      </div>
    </div>
  );
}
