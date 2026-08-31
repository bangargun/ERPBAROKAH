import React, { useState, useMemo, useRef } from 'react';
import { 
  Receipt, FileText, Printer, Download, Calculator, Building2, 
  Calendar, CheckCircle2, Sliders, DollarSign, ArrowRight, ShieldCheck, 
  HelpCircle, Eye, RefreshCw, Sparkles, ChevronRight, Hash
} from 'lucide-react';
import { getThemePalette } from '../../utils/themeUtils';
import { getApiUrl } from '../../utils/apiConfig';

const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

export default function TaxCompliancePage({ masterData, setMasterData, selectedBranch, themeMode = 'dark' }) {
  const T = getThemePalette(themeMode);

  // States
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1); // 1 - 12
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [activeSubTab, setActiveSubTab] = useState('sptpd'); // 'sptpd' | 'daily_log' | 'config'

  // Daftar Cabang
  const outlets = masterData?.outlets || [];
  const currentOutlet = useMemo(() => {
    if (selectedBranch && selectedBranch !== 'all' && selectedBranch !== 'central') {
      const match = outlets.find(o => String(o.id) === String(selectedBranch) || o.name === selectedBranch);
      if (match) return match;
    }
    return outlets[0] || { id: 1, name: 'AYAM BAKAR SURABAYA TEBING TINGGI', address: 'Kota Tebing Tinggi' };
  }, [outlets, selectedBranch]);

  // Pajak Target Settings State
  const [taxTargetMap, setTaxTargetMap] = useState(() => {
    return masterData?.taxSettings?.outlets || {
      '1785307180576': { targetTax: 400000, npwpd: 'P.2.0019283.01.22', owner: 'H. Barokah', city: 'Tebing Tinggi' },
      '1785369561430': { targetTax: 400000, npwpd: 'P.2.0028191.01.22', owner: 'H. Barokah', city: 'Tebing Tinggi' },
      '1785369617361': { targetTax: 350000, npwpd: 'P.2.0031920.02.21', owner: 'H. Barokah', city: 'Kisaran' },
      '1785537689430': { targetTax: 350000, npwpd: 'P.2.0048123.03.20', owner: 'H. Barokah', city: 'Rantau Prapat' },
      '1785564003169': { targetTax: 300000, npwpd: 'P.2.0059128.02.21', owner: 'H. Barokah', city: 'Kisaran' }
    };
  });

  const activeOutletKey = String(currentOutlet.id);
  const activeTaxSetting = taxTargetMap[activeOutletKey] || {
    targetTax: 400000,
    npwpd: 'P.2.0019283.01.22',
    owner: 'H. Barokah',
    city: currentOutlet.address || 'Tebing Tinggi'
  };

  const [inputTargetTax, setInputTargetTax] = useState(activeTaxSetting.targetTax || 400000);
  const [inputNpwpd, setInputNpwpd] = useState(activeTaxSetting.npwpd || 'P.2.0019283.01.22');
  const [inputOwner, setInputOwner] = useState(activeTaxSetting.owner || 'H. Barokah');
  const [taxRatePct, setTaxRatePct] = useState(10); // 10% PB1
  const [randomSeed, setRandomSeed] = useState(12345);

  // Sync saat outlet berubah
  const handleOutletChangeSync = (outletId) => {
    const s = taxTargetMap[String(outletId)] || { targetTax: 400000, npwpd: 'P.2.0019283.01.22', owner: 'H. Barokah' };
    setInputTargetTax(s.targetTax || 400000);
    setInputNpwpd(s.npwpd || 'P.2.0019283.01.22');
    setInputOwner(s.owner || 'H. Barokah');
  };

  // Simpan Konfigurasi Pajak ke Master Data
  const handleSaveTaxConfig = async (e) => {
    if (e) e.preventDefault();
    const updatedMap = {
      ...taxTargetMap,
      [activeOutletKey]: {
        targetTax: Number(inputTargetTax) || 400000,
        npwpd: inputNpwpd.trim(),
        owner: inputOwner.trim(),
        city: currentOutlet.address || 'Tebing Tinggi'
      }
    };
    setTaxTargetMap(updatedMap);

    const newMaster = {
      ...masterData,
      taxSettings: {
        defaultRate: taxRatePct,
        outlets: updatedMap
      },
      _lastUpdated: Date.now()
    };

    setMasterData(newMaster);
    alert('✅ Konfigurasi target setoran pajak cabang berhasil disimpan!');

    try {
      await fetch(getApiUrl('/api/master-data'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newMaster)
      });
    } catch (err) {}
  };

  // Format Rupiah
  const formatRp = (num) => `Rp ${(Number(num) || 0).toLocaleString('id-ID')}`;

  // Hitung Nilai DPP & Rincian Hari
  const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
  const calculatedDppTotal = Math.round((Number(inputTargetTax) || 400000) / (taxRatePct / 100));

  // Generate Distribusi Omset Harian Realistis
  const dailyTaxDistribution = useMemo(() => {
    const totalDpp = calculatedDppTotal;
    const targetTax = Number(inputTargetTax) || 400000;
    const days = daysInMonth;

    // Bobot harian: Weekend (Sabtu/Minggu) diberi bobot 1.4x, Weekday 1.0x
    const dayWeights = [];
    let totalWeight = 0;

    for (let d = 1; d <= days; d++) {
      const dateObj = new Date(selectedYear, selectedMonth - 1, d);
      const dayOfWeek = dateObj.getDay(); // 0 = Minggu, 6 = Sabtu
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      
      // Pseudo-random variasi natural
      const pseudoNoise = 0.85 + (((d * 17 + randomSeed) % 31) / 100);
      const weight = (isWeekend ? 1.35 : 0.95) * pseudoNoise;
      dayWeights.push({ day: d, dateObj, dayOfWeek, weight });
      totalWeight += weight;
    }

    // Distribusikan DPP per hari
    let currentDppSum = 0;
    const list = dayWeights.map((dw, idx) => {
      let rawDailyDpp = 0;
      if (idx === days - 1) {
        // Hari terakhir menampung selisih pembulatan agar total persis sama
        rawDailyDpp = Math.max(0, totalDpp - currentDppSum);
      } else {
        const exactDpp = (dw.weight / totalWeight) * totalDpp;
        // Bulatkan ke ratusan/ribuan terdekat agar terlihat alami
        rawDailyDpp = Math.round(exactDpp / 1000) * 1000;
        currentDppSum += rawDailyDpp;
      }

      const dailyTax = Math.round(rawDailyDpp * (taxRatePct / 100));
      const dayName = dw.dateObj.toLocaleDateString('id-ID', { weekday: 'long' });
      const dateStr = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(dw.day).padStart(2, '0')}`;

      return {
        day: dw.day,
        dateStr,
        dayName,
        isWeekend: dw.dayOfWeek === 0 || dw.dayOfWeek === 6,
        dpp: rawDailyDpp,
        tax: dailyTax
      };
    });

    // Hitung akumulasi
    let accumDpp = 0;
    let accumTax = 0;
    return list.map(item => {
      accumDpp += item.dpp;
      accumTax += item.tax;
      return {
        ...item,
        accumDpp,
        accumTax
      };
    });
  }, [calculatedDppTotal, inputTargetTax, daysInMonth, selectedYear, selectedMonth, taxRatePct, randomSeed]);

  // Total Realisasi Pajak Hasil Kalkulasi
  const totalReportedDpp = dailyTaxDistribution.reduce((a, b) => a + b.dpp, 0);
  const totalReportedTax = dailyTaxDistribution.reduce((a, b) => a + b.tax, 0);

  // Print Handler
  const handlePrint = () => {
    window.print();
  };

  // Export CSV Handler
  const handleExportCsv = () => {
    const headers = ['No', 'Tanggal', 'Hari', 'Penjualan Terlapor (DPP Rp)', 'Pajak PB1 10% (Rp)', 'Akumulasi Omset (Rp)', 'Akumulasi Pajak (Rp)'];
    const rows = dailyTaxDistribution.map((r, i) => [
      i + 1,
      r.dateStr,
      r.dayName,
      r.dpp,
      r.tax,
      r.accumDpp,
      r.accumTax
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + 
      [`LAPORAN REKAPITULASI PAJAK RESTORAN (PB1) - ${currentOutlet.name}`, `Masa Pajak: ${MONTH_NAMES[selectedMonth - 1]} ${selectedYear}`, `Target Setoran: ${formatRp(inputTargetTax)}`, '']
      .concat([headers.join(',')])
      .concat(rows.map(e => e.join(',')))
      .join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Laporan_Pajak_PB1_${currentOutlet.name.replace(/\s+/g, '_')}_${MONTH_NAMES[selectedMonth - 1]}_${selectedYear}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '4px' }}>
      
      {/* 1. TOP HEADER & BAR PENGENDALI TARGET PAJAK */}
      <div style={{
        background: T.cardBg,
        borderRadius: '16px',
        padding: '20px 24px',
        border: `1px solid ${T.border}`,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '16px',
        boxShadow: T.shadowCard
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: '52px',
            height: '52px',
            borderRadius: '14px',
            background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 8px 20px rgba(37,99,235,0.35)'
          }}>
            <Receipt size={28} color="#ffffff" />
          </div>
          <div>
            <h1 style={{ fontSize: '1.45rem', fontWeight: '900', color: T.txtPrimary, margin: 0, letterSpacing: '-0.02em' }}>
              Laporan &amp; Rekapitulasi Pajak Restoran (PB1 / SPTPD)
            </h1>
            <p style={{ fontSize: '0.82rem', color: T.txtSecondary, margin: '4px 0 0 0', fontWeight: '600' }}>
              Generator Laporan Pajak Daerah Otomatis dengan Penetapan Target Setoran Pajak Tetap per Cabang
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={handleExportCsv}
            style={{
              padding: '10px 18px',
              background: T.controlBg,
              border: `1px solid ${T.border}`,
              color: T.txtPrimary,
              borderRadius: '10px',
              fontWeight: '800',
              fontSize: '0.85rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Download size={16} />
            <span>Ekspor CSV / Excel</span>
          </button>

          <button
            onClick={handlePrint}
            style={{
              padding: '10px 20px',
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              border: 'none',
              color: '#ffffff',
              borderRadius: '10px',
              fontWeight: '900',
              fontSize: '0.85rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 4px 14px rgba(16,185,129,0.35)'
            }}
          >
            <Printer size={16} />
            <span>Cetak Lembar SPTPD Resmi</span>
          </button>
        </div>
      </div>

      {/* 2. PARAMETER KONTROL: CABANG, BULAN, DAN TARGET SETORAN PAJAK */}
      <div style={{
        background: T.cardBg,
        borderRadius: '16px',
        padding: '18px 22px',
        border: `1px solid ${T.border}`,
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        boxShadow: T.shadowCard
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sliders size={18} color="#f59e0b" />
            <span style={{ fontSize: '0.90rem', fontWeight: '900', color: T.txtPrimary }}>
              Pengaturan Nilai Setoran &amp; Parameter Laporan Pajak
            </span>
          </div>
          <button
            onClick={() => setRandomSeed(Date.now())}
            title="Acak ulang sebaran transaksi harian agar tetap alami"
            style={{
              padding: '6px 12px',
              borderRadius: '8px',
              background: T.controlBg,
              border: `1px solid ${T.border}`,
              color: T.txtSecondary,
              fontSize: '0.76rem',
              fontWeight: '800',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <RefreshCw size={13} />
            <span>Variasikan Sebaran Harian</span>
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
          
          {/* Cabang Aktif */}
          <div>
            <label style={{ fontSize: '0.76rem', fontWeight: '800', color: T.txtSecondary, display: 'block', marginBottom: '4px' }}>
              Cabang Restoran
            </label>
            <div style={{ padding: '9px 12px', borderRadius: '10px', background: T.controlBg, border: `1px solid ${T.border}`, fontSize: '0.85rem', fontWeight: '900', color: '#38bdf8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {currentOutlet.name}
            </div>
          </div>

          {/* Masa Pajak (Bulan) */}
          <div>
            <label style={{ fontSize: '0.76rem', fontWeight: '800', color: T.txtSecondary, display: 'block', marginBottom: '4px' }}>
              Masa Pajak (Bulan)
            </label>
            <select
              value={selectedMonth}
              onChange={e => setSelectedMonth(Number(e.target.value))}
              style={{ width: '100%', padding: '9px 12px', borderRadius: '10px', background: T.controlBg, border: `1px solid ${T.border}`, color: T.txtPrimary, fontSize: '0.85rem', fontWeight: '700', outline: 'none' }}
            >
              {MONTH_NAMES.map((m, idx) => (
                <option key={idx + 1} value={idx + 1}>{m}</option>
              ))}
            </select>
          </div>

          {/* Tahun */}
          <div>
            <label style={{ fontSize: '0.76rem', fontWeight: '800', color: T.txtSecondary, display: 'block', marginBottom: '4px' }}>
              Tahun Pajak
            </label>
            <select
              value={selectedYear}
              onChange={e => setSelectedYear(Number(e.target.value))}
              style={{ width: '100%', padding: '9px 12px', borderRadius: '10px', background: T.controlBg, border: `1px solid ${T.border}`, color: T.txtPrimary, fontSize: '0.85rem', fontWeight: '700', outline: 'none' }}
            >
              {[2024, 2025, 2026, 2027].map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          {/* INPUT TARGET SETORAN PAJAK (MISAL: 400.000) */}
          <div>
            <label style={{ fontSize: '0.76rem', fontWeight: '900', color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
              <span>Target Setoran Pajak (IDR) *</span>
            </label>
            <input
              type="number"
              min="0"
              step="10000"
              value={inputTargetTax}
              onChange={e => setInputTargetTax(Number(e.target.value))}
              placeholder="Contoh: 400000"
              style={{ width: '100%', padding: '9px 12px', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.10)', border: '1.5px solid #10b981', color: '#10b981', fontSize: '0.92rem', fontWeight: '900', outline: 'none' }}
            />
          </div>

          {/* NPWPD / NOPD */}
          <div>
            <label style={{ fontSize: '0.76rem', fontWeight: '800', color: T.txtSecondary, display: 'block', marginBottom: '4px' }}>
              NPWPD Cabang
            </label>
            <input
              type="text"
              value={inputNpwpd}
              onChange={e => setInputNpwpd(e.target.value)}
              placeholder="P.2.xxxxxxx.xx.xx"
              style={{ width: '100%', padding: '9px 12px', borderRadius: '10px', background: T.controlBg, border: `1px solid ${T.border}`, color: T.txtPrimary, fontSize: '0.85rem', fontWeight: '800', outline: 'none' }}
            />
          </div>

        </div>

        {/* Action Save Config */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: `1px solid ${T.border}`, paddingTop: '12px' }}>
          <button
            onClick={handleSaveTaxConfig}
            style={{
              padding: '8px 18px',
              background: 'linear-gradient(135deg, #38bdf8 0%, #0284c7 100%)',
              color: '#000000',
              border: 'none',
              borderRadius: '8px',
              fontWeight: '900',
              fontSize: '0.80rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <CheckCircle2 size={14} />
            <span>Simpan Target Setoran Pajak Cabang Ini</span>
          </button>
        </div>
      </div>

      {/* 3. STATS SUMMARY CARDS (HASIL PERHITUNGAN MUNDUR OTOMATIS) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
        
        {/* Card 1: Nilai Setoran Pajak Terutang */}
        <div style={{ background: T.cardBg, borderRadius: '14px', padding: '18px 20px', border: `1.5px solid #10b981`, boxShadow: T.shadowCard }}>
          <div style={{ fontSize: '0.76rem', color: '#10b981', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Jumlah Setoran Pajak Terutang (PB1)
          </div>
          <div style={{ fontSize: '1.55rem', fontWeight: '900', color: '#10b981', marginTop: '6px' }}>
            {formatRp(inputTargetTax)}
          </div>
          <div style={{ fontSize: '0.74rem', color: T.txtMuted, marginTop: '4px' }}>
            Periode: {MONTH_NAMES[selectedMonth - 1]} {selectedYear}
          </div>
        </div>

        {/* Card 2: Dasar Pengenaan Pajak (DPP) Terlapor */}
        <div style={{ background: T.cardBg, borderRadius: '14px', padding: '18px 20px', border: `1px solid ${T.border}`, boxShadow: T.shadowCard }}>
          <div style={{ fontSize: '0.76rem', color: T.txtSecondary, fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Dasar Pengenaan Pajak / DPP Omset
          </div>
          <div style={{ fontSize: '1.55rem', fontWeight: '900', color: '#38bdf8', marginTop: '6px' }}>
            {formatRp(calculatedDppTotal)}
          </div>
          <div style={{ fontSize: '0.74rem', color: T.txtMuted, marginTop: '4px' }}>
            Rumus: Setoran Pajak / 10%
          </div>
        </div>

        {/* Card 3: Rata-Rata Omset Harian Terlapor */}
        <div style={{ background: T.cardBg, borderRadius: '14px', padding: '18px 20px', border: `1px solid ${T.border}`, boxShadow: T.shadowCard }}>
          <div style={{ fontSize: '0.76rem', color: T.txtSecondary, fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Rata-Rata Omset Harian Terlapor
          </div>
          <div style={{ fontSize: '1.55rem', fontWeight: '900', color: '#f59e0b', marginTop: '6px' }}>
            {formatRp(Math.round(calculatedDppTotal / daysInMonth))}
          </div>
          <div style={{ fontSize: '0.74rem', color: T.txtMuted, marginTop: '4px' }}>
            Terdistribusi ke {daysInMonth} hari kalender
          </div>
        </div>

        {/* Card 4: Status Kepatuhan & Bapenda */}
        <div style={{ background: T.cardBg, borderRadius: '14px', padding: '18px 20px', border: `1px solid ${T.border}`, boxShadow: T.shadowCard }}>
          <div style={{ fontSize: '0.76rem', color: T.txtSecondary, fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Status Pelaporan Pajak
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '10px' }}>
            <span style={{ padding: '6px 12px', borderRadius: '8px', background: 'rgba(16,185,129,0.15)', color: '#10b981', fontWeight: '900', fontSize: '0.85rem' }}>
              ✓ Siap Disetor &amp; Dilaporkan
            </span>
          </div>
          <div style={{ fontSize: '0.72rem', color: T.txtMuted, marginTop: '6px' }}>
            Bapenda Wilayah: {currentOutlet.address || 'Tebing Tinggi'}
          </div>
        </div>

      </div>

      {/* 4. SUB-TAB SWITCHER */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: `1px solid ${T.border}`, paddingBottom: '8px' }}>
        <button
          onClick={() => setActiveSubTab('sptpd')}
          style={{
            padding: '10px 20px',
            borderRadius: '10px',
            border: 'none',
            background: activeSubTab === 'sptpd' ? T.primaryBtn : 'transparent',
            color: activeSubTab === 'sptpd' ? '#ffffff' : T.txtSecondary,
            fontWeight: '900',
            fontSize: '0.86rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <FileText size={16} />
          <span>Format Formulir SPTPD Resmi</span>
        </button>

        <button
          onClick={() => setActiveSubTab('daily_log')}
          style={{
            padding: '10px 20px',
            borderRadius: '10px',
            border: 'none',
            background: activeSubTab === 'daily_log' ? T.primaryBtn : 'transparent',
            color: activeSubTab === 'daily_log' ? '#ffffff' : T.txtSecondary,
            fontWeight: '900',
            fontSize: '0.86rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <Calendar size={16} />
          <span>Lampiran Rincian Omset Harian ({daysInMonth} Hari)</span>
        </button>
      </div>

      {/* 5. SUB-TAB 1: DOKUMEN RESMI SPTPD (SURAT PEMBERITAHUAN PAJAK DAERAH) */}
      {activeSubTab === 'sptpd' && (
        <div style={{
          background: '#ffffff',
          color: '#000000',
          borderRadius: '16px',
          padding: '36px 44px',
          border: '1px solid #d1d5db',
          boxShadow: '0 10px 30px rgba(0,0,0,0.15)',
          fontFamily: "'Inter', Arial, sans-serif"
        }}>
          {/* Header SPTPD */}
          <div style={{ borderBottom: '3px double #000000', paddingBottom: '16px', marginBottom: '24px', textAlign: 'center' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '900', margin: 0, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              PEMERINTAH DAERAH {currentOutlet.address?.toUpperCase() || 'KOTA TEBING TINGGI'}
            </h2>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '800', margin: '4px 0 0 0', textTransform: 'uppercase' }}>
              BADAN PENDAPATAN DAERAH (BAPENDA)
            </h3>
            <div style={{ fontSize: '0.84rem', marginTop: '4px', fontWeight: '600' }}>
              SURAT PEMBERITAHUAN PAJAK DAERAH (SPTPD) - PAJAK BARANG DAN JASA TERTENTU (PBJT) RESTORAN
            </div>
            <div style={{ fontSize: '0.80rem', fontWeight: '700', marginTop: '4px', color: '#374151' }}>
              Masa Pajak: <strong>{MONTH_NAMES[selectedMonth - 1].toUpperCase()} {selectedYear}</strong>
            </div>
          </div>

          {/* Section 1: Identitas Wajib Pajak */}
          <div style={{ marginBottom: '24px', fontSize: '0.86rem', lineHeight: '1.8' }}>
            <div style={{ fontWeight: '900', textDecoration: 'underline', marginBottom: '8px' }}>
              I. IDENTITAS WAJIB PAJAK &amp; OBJEK PAJAK RESTORAN:
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <tbody>
                <tr>
                  <td style={{ width: '220px', fontWeight: '700' }}>1. Nama Usaha / Objek Pajak</td>
                  <td style={{ width: '15px' }}>:</td>
                  <td style={{ fontWeight: '800' }}>{currentOutlet.name}</td>
                </tr>
                <tr>
                  <td style={{ fontWeight: '700' }}>2. NPWPD / NOPD</td>
                  <td>:</td>
                  <td style={{ fontWeight: '800', fontFamily: 'monospace', fontSize: '0.95rem' }}>{inputNpwpd}</td>
                </tr>
                <tr>
                  <td style={{ fontWeight: '700' }}>3. Nama Pemilik / Wajib Pajak</td>
                  <td>:</td>
                  <td>{inputOwner}</td>
                </tr>
                <tr>
                  <td style={{ fontWeight: '700' }}>4. Alamat Lokasi Usaha</td>
                  <td>:</td>
                  <td>{currentOutlet.address || 'Tebing Tinggi, Sumatera Utara'}</td>
                </tr>
                <tr>
                  <td style={{ fontWeight: '700' }}>5. Jenis Usaha</td>
                  <td>:</td>
                  <td>Restoran / Rumah Makan / F&amp;B</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Section 2: Rincian Perhitungan Pajak */}
          <div style={{ marginBottom: '24px', fontSize: '0.86rem' }}>
            <div style={{ fontWeight: '900', textDecoration: 'underline', marginBottom: '10px' }}>
              II. RINCIAN PERHITUNGAN PAJAK RESTORAN (PB1 / PBJT 10%):
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #000000', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#f3f4f6', borderBottom: '1px solid #000000' }}>
                  <th style={{ padding: '8px 12px', borderRight: '1px solid #000000', width: '40px' }}>No</th>
                  <th style={{ padding: '8px 12px', borderRight: '1px solid #000000' }}>Uraian Perhitungan</th>
                  <th style={{ padding: '8px 12px', textAlign: 'right', width: '220px' }}>Jumlah (Rupiah)</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <td style={{ padding: '8px 12px', borderRight: '1px solid #000000' }}>1.</td>
                  <td style={{ padding: '8px 12px', borderRight: '1px solid #000000' }}>
                    Dasar Pengenaan Pajak (DPP) — Total Pembayaran Makanan &amp; Minuman
                  </td>
                  <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: '800' }}>
                    {formatRp(totalReportedDpp)}
                  </td>
                </tr>
                <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <td style={{ padding: '8px 12px', borderRight: '1px solid #000000' }}>2.</td>
                  <td style={{ padding: '8px 12px', borderRight: '1px solid #000000' }}>
                    Tarif Pajak Restoran (Perda PBJT Makanan/Minuman)
                  </td>
                  <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: '800' }}>
                    {taxRatePct}%
                  </td>
                </tr>
                <tr style={{ borderBottom: '1px solid #000000', background: '#f9fafb' }}>
                  <td style={{ padding: '10px 12px', borderRight: '1px solid #000000', fontWeight: '900' }}>3.</td>
                  <td style={{ padding: '10px 12px', borderRight: '1px solid #000000', fontWeight: '900' }}>
                    JUMLAH PAJAK RESTORAN TERUTANG YANG HARUS DISETOR
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: '900', fontSize: '1rem', color: '#000000' }}>
                    {formatRp(totalReportedTax)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Section 3: Pernyataan & Tanda Tangan */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '36px', fontSize: '0.84rem' }}>
            <div style={{ width: '45%' }}>
              <div style={{ fontWeight: '700', marginBottom: '4px' }}>Catatan Petugas Bapenda:</div>
              <div style={{ border: '1px dashed #9ca3af', height: '110px', borderRadius: '6px', padding: '8px', fontSize: '0.76rem', color: '#6b7280' }}>
                Diterima tanggal: .......................................<br />
                Nama Petugas: ...........................................<br />
                Paraf/Cap:
              </div>
            </div>

            <div style={{ width: '45%', textAlign: 'center' }}>
              <div>{currentOutlet.address || 'Tebing Tinggi'}, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
              <div style={{ fontWeight: '800', marginTop: '4px' }}>Wajib Pajak / Pengelola Restoran,</div>
              <div style={{ height: '70px' }}></div>
              <div style={{ fontWeight: '900', textDecoration: 'underline' }}>{inputOwner}</div>
              <div style={{ fontSize: '0.78rem', color: '#4b5563' }}>Penanggung Jawab Usaha</div>
            </div>
          </div>

        </div>
      )}

      {/* 6. SUB-TAB 2: TABEL RINCIAN SEBARAN OMSET HARIAN */}
      {activeSubTab === 'daily_log' && (
        <div style={{
          background: T.cardBg,
          borderRadius: '16px',
          border: `1px solid ${T.border}`,
          overflow: 'hidden',
          boxShadow: T.shadowCard
        }}>
          <div style={{ padding: '16px 20px', borderBottom: `1px solid ${T.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: '900', color: T.txtPrimary, margin: 0 }}>
                Lampiran Rincian Omset &amp; Pajak Harian — {MONTH_NAMES[selectedMonth - 1]} {selectedYear}
              </h3>
              <p style={{ fontSize: '0.76rem', color: T.txtSecondary, margin: '2px 0 0 0' }}>
                Sebaran penjualan harian realistis yang menghasilkan total setoran pajak {formatRp(inputTargetTax)}
              </p>
            </div>
            <div style={{ fontSize: '0.80rem', fontWeight: '800', color: '#10b981' }}>
              Total 30 Hari: {formatRp(totalReportedDpp)}
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.84rem' }}>
              <thead>
                <tr style={{ background: T.tableHeaderBg, borderBottom: `2px solid ${T.border}`, color: T.txtSecondary }}>
                  <th style={{ padding: '12px 16px', width: '50px' }}>No</th>
                  <th style={{ padding: '12px 16px' }}>Tanggal</th>
                  <th style={{ padding: '12px 16px' }}>Hari</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>Penjualan Harian (DPP)</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>Pajak PB1 10%</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>Akumulasi Penjualan</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>Akumulasi Pajak</th>
                </tr>
              </thead>
              <tbody>
                {dailyTaxDistribution.map((row, idx) => (
                  <tr 
                    key={idx}
                    style={{
                      borderBottom: `1px solid ${T.border}`,
                      background: row.isWeekend ? (isCalmSage ? 'rgba(45, 122, 91, 0.05)' : 'rgba(245, 158, 11, 0.05)') : 'transparent'
                    }}
                  >
                    <td style={{ padding: '12px 16px', color: T.txtMuted, fontWeight: '700' }}>
                      {row.day}
                    </td>
                    <td style={{ padding: '12px 16px', fontWeight: '800', color: T.txtPrimary }}>
                      {row.dateStr}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{
                        padding: '3px 8px',
                        borderRadius: '6px',
                        fontSize: '0.74rem',
                        fontWeight: '800',
                        background: row.isWeekend ? 'rgba(245, 158, 11, 0.15)' : 'transparent',
                        color: row.isWeekend ? '#f59e0b' : T.txtSecondary
                      }}>
                        {row.dayName} {row.isWeekend && '★'}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: '800', color: T.txtPrimary }}>
                      {formatRp(row.dpp)}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: '800', color: '#10b981' }}>
                      {formatRp(row.tax)}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', color: T.txtSecondary, fontWeight: '700' }}>
                      {formatRp(row.accumDpp)}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', color: '#10b981', fontWeight: '800' }}>
                      {formatRp(row.accumTax)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ background: T.tableHeaderBg, borderTop: `2px solid ${T.border}`, fontWeight: '900' }}>
                  <td colSpan="3" style={{ padding: '14px 16px', color: T.txtPrimary, fontSize: '0.90rem' }}>
                    TOTAL REKAPITULASI BULAN {MONTH_NAMES[selectedMonth - 1].toUpperCase()} {selectedYear}:
                  </td>
                  <td style={{ padding: '14px 16px', textAlign: 'right', color: '#38bdf8', fontSize: '0.95rem' }}>
                    {formatRp(totalReportedDpp)}
                  </td>
                  <td style={{ padding: '14px 16px', textAlign: 'right', color: '#10b981', fontSize: '1rem' }}>
                    {formatRp(totalReportedTax)}
                  </td>
                  <td style={{ padding: '14px 16px', textAlign: 'right', color: T.txtSecondary }}>
                    {formatRp(totalReportedDpp)}
                  </td>
                  <td style={{ padding: '14px 16px', textAlign: 'right', color: '#10b981' }}>
                    {formatRp(totalReportedTax)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

    </div>
  );
}
