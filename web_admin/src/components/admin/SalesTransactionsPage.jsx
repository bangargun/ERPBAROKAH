import React, { useState, useEffect, useRef } from 'react';
import { 
  ShoppingBag, 
  DollarSign, 
  Layers, 
  FileText, 
  Calendar, 
  Users, 
  Clock, 
  XCircle, 
  PackageMinus, 
  TrendingUp, 
  Plus, 
  Search, 
  Store, 
  CreditCard, 
  ArrowUpRight, 
  Filter,
  AlertTriangle,
  Award,
  Download,
  FileSpreadsheet,
  Printer,
  CheckSquare,
  Square,
  ChevronDown,
  BarChart3,
  SlidersHorizontal,
  RefreshCw,
  Wifi,
  CheckCircle2,
  Zap,
  Receipt,
  ShieldAlert
} from 'lucide-react';
import TransactionHistoryPage from './TransactionHistoryPage';
import { getApiUrl } from '../../utils/apiConfig';
import { 
  BarChart as ReBarChart, 
  Bar as ReBar, 
  LineChart as ReLineChart,
  Line as ReLine,
  PieChart as RePieChart,
  Pie as RePie,
  Cell as ReCell,
  XAxis as ReXAxis, 
  YAxis as ReYAxis, 
  CartesianGrid as ReCartesianGrid, 
  Tooltip as ReTooltip, 
  Legend as ReLegend, 
  ResponsiveContainer as ReResponsiveContainer 
} from 'recharts';
import { getThemePalette } from '../../utils/themeUtils';

// Format YYYY-MM-DD -> DD/MM/YYYY
const formatToDMY = (dateStr) => {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
};

// Format Rp. 10.719.000,00
const formatRupiahDecimals = (val) => {
  const num = Number(val || 0);
  return 'Rp. ' + num.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const monthNamesIndo = [
  'januari', 'februari', 'maret', 'april', 'mei', 'juni',
  'juli', 'agustus', 'september', 'oktober', 'november', 'desember'
];

export const sanitizeForFilename = (str) => {
  if (!str) return 'semua_outlet';
  return str
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '_');
};

export const formatPeriodForFilename = (startStr, endStr) => {
  if (!startStr && !endStr) return 'juli_2026';
  const targetStr = startStr || endStr;
  if (targetStr && targetStr.includes('-')) {
    const parts = targetStr.split('-');
    if (parts.length >= 2) {
      const year = parts[0];
      const monthIdx = parseInt(parts[1], 10) - 1;
      const monthName = monthNamesIndo[monthIdx] || parts[1];
      return `${monthName}_${year}`;
    }
  }
  return 'juli_2026';
};

export const getOutletNameStrForExport = (selectedOutletIds, outlets = [], selectedBranch = null) => {
  if (selectedBranch) {
    const found = outlets.find(o => Number(o.id) === Number(selectedBranch));
    if (found) return found.name;
  }
  if (!selectedOutletIds || selectedOutletIds.includes('ALL') || selectedOutletIds.length === 0) {
    return 'Semua Outlet Cabang';
  }
  if (selectedOutletIds.length === 1) {
    const found = outlets.find(o => Number(o.id) === Number(selectedOutletIds[0]));
    if (found) return found.name;
  }
  return 'Beberapa Outlet Cabang';
};

export const buildExportFilename = (reportTitle, outletName, startStr, endStr, ext = 'csv') => {
  const cleanTitle = sanitizeForFilename(reportTitle);
  const cleanOutlet = sanitizeForFilename(outletName || 'semua_outlet');
  const cleanPeriod = formatPeriodForFilename(startStr, endStr);
  return `${cleanTitle}_${cleanOutlet}_${cleanPeriod}.${ext}`;
};

export function DoubleCalendarPicker({
  startDate,
  endDate,
  datePreset,
  setStartDate,
  setEndDate,
  setDatePreset,
  showPopover,
  setShowPopover,
  outlets = [],
  selectedOutletIds = [],
  onToggleOutlet,
  onToggleAllOutlets,
  showOutletDropdown,
  setShowOutletDropdown,
  selectedBranch = null,
  hideOutletFilter = false,
  noWrapper = false,
  themeMode = 'dark' }) {
  const T = getThemePalette(themeMode);
  const [baseMonth, setBaseMonth] = useState(() => {
    if (startDate) {
      const d = new Date(startDate);
      if (!isNaN(d.getTime())) return new Date(d.getFullYear(), d.getMonth(), 1);
    }
    return new Date();
  });
  const [tempStart, setTempStart] = useState(startDate);
  const [tempEnd, setTempEnd] = useState(endDate);
  const containerRef = useRef(null);

  // Sync temp dates when popover opens or when dates change
  useEffect(() => {
    setTempStart(startDate);
    setTempEnd(endDate);
    if (startDate) {
      const d = new Date(startDate);
      if (!isNaN(d.getTime())) {
        setBaseMonth(new Date(d.getFullYear(), d.getMonth(), 1));
      }
    }
  }, [startDate, endDate, showPopover]);

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setShowPopover(false);
        setShowOutletDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [setShowPopover, setShowOutletDropdown]);

  const handleApplyPreset = (presetKey) => {
    setDatePreset(presetKey);
    const today = new Date();
    const todayStr = formatToYMD(today);

    if (presetKey === 'today') {
      setStartDate(todayStr);
      setEndDate(todayStr);
      setTempStart(todayStr);
      setTempEnd(todayStr);
      setShowPopover(false);
    } else if (presetKey === 'yesterday') {
      const yes = new Date();
      yes.setDate(today.getDate() - 1);
      const yesStr = formatToYMD(yes);
      setStartDate(yesStr);
      setEndDate(yesStr);
      setTempStart(yesStr);
      setTempEnd(yesStr);
      setShowPopover(false);
    } else if (presetKey === '7days') {
      const past = new Date();
      past.setDate(today.getDate() - 6);
      const pastStr = formatToYMD(past);
      setStartDate(pastStr);
      setEndDate(todayStr);
      setTempStart(pastStr);
      setTempEnd(todayStr);
      setShowPopover(false);
    } else if (presetKey === '30days') {
      const past = new Date();
      past.setDate(today.getDate() - 29);
      const pastStr = formatToYMD(past);
      setStartDate(pastStr);
      setEndDate(todayStr);
      setTempStart(pastStr);
      setTempEnd(todayStr);
      setShowPopover(false);
    } else if (presetKey === 'month') {
      const firstDayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`;
      setStartDate(firstDayStr);
      setEndDate(todayStr);
      setTempStart(firstDayStr);
      setTempEnd(todayStr);
      setShowPopover(false);
    } else if (presetKey === 'last_month') {
      const firstDay = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const lastDay = new Date(today.getFullYear(), today.getMonth(), 0);
      const fStr = formatToYMD(firstDay);
      const lStr = formatToYMD(lastDay);
      setStartDate(fStr);
      setEndDate(lStr);
      setTempStart(fStr);
      setTempEnd(lStr);
      setShowPopover(false);
    } else if (presetKey === 'all') {
      setStartDate('');
      setEndDate('');
      setTempStart('');
      setTempEnd('');
      setShowPopover(false);
    }
  };

  const handleApplyCustom = () => {
    setStartDate(tempStart);
    setEndDate(tempEnd);
    setDatePreset('custom');
    setShowPopover(false);
  };

  const handleDayClick = (dateYMD) => {
    if (!tempStart || (tempStart && tempEnd)) {
      setTempStart(dateYMD);
      setTempEnd('');
    } else {
      if (dateYMD < tempStart) {
        setTempStart(dateYMD);
        setTempEnd('');
      } else {
        setTempEnd(dateYMD);
      }
    }
  };

  const getDaysInMonth = (year, month) => {
    const date = new Date(year, month, 1);
    const days = [];
    const startDayOfWeek = date.getDay();
    const prevMonthLastDate = new Date(year, month, 0).getDate();

    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const d = prevMonthLastDate - i;
      const prevMonth = month - 1;
      const prevYear = prevMonth < 0 ? year - 1 : year;
      const realMonth = prevMonth < 0 ? 11 : prevMonth;
      days.push({
        day: d,
        dateString: `${prevYear}-${String(realMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
        isCurrentMonth: false
      });
    }

    const lastDate = new Date(year, month + 1, 0).getDate();
    for (let d = 1; d <= lastDate; d++) {
      days.push({
        day: d,
        dateString: `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
        isCurrentMonth: true
      });
    }

    const remaining = 42 - days.length;
    for (let d = 1; d <= remaining; d++) {
      const nextMonth = month + 1;
      const nextYear = nextMonth > 11 ? year + 1 : year;
      const realMonth = nextMonth > 11 ? 0 : nextMonth;
      days.push({
        day: d,
        dateString: `${nextYear}-${String(realMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
        isCurrentMonth: false
      });
    }

    return days;
  };

  const leftMonth = baseMonth.getMonth();
  const leftYear = baseMonth.getFullYear();
  const rightMonthObj = new Date(leftYear, leftMonth + 1, 1);
  const rightMonth = rightMonthObj.getMonth();
  const rightYear = rightMonthObj.getFullYear();

  const leftDays = getDaysInMonth(leftYear, leftMonth);
  const rightDays = getDaysInMonth(rightYear, rightMonth);

  const monthNames = ["Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar", "Apr", "May", "Jun"];
  const getMonthName = (mIndex) => {
    const list = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agt", "Sep", "Okt", "Nov", "Des"];
    return list[mIndex] || '';
  };

  const leftMonthLabel = `${getMonthName(leftMonth)} ${leftYear}`;
  const rightMonthLabel = `${getMonthName(rightMonth)} ${rightYear}`;

  const selectedOutletLabel = () => {
    if (selectedBranch) {
      return outlets.find(o => o.id === selectedBranch)?.name || 'Utama';
    }
    if (selectedOutletIds.includes('ALL')) {
      return 'SEMUA OUTLET CABANG';
    }
    if (selectedOutletIds.length === 0) return 'Pilih Outlet...';
    if (selectedOutletIds.length === 1) {
      return outlets.find(o => o.id === selectedOutletIds[0])?.name || 'Utama';
    }
    return `${outlets.find(o => o.id === selectedOutletIds[0])?.name || 'Utama'} (+${selectedOutletIds.length - 1})`;
  };

  const displayDateRange = () => {
    if (!startDate && !endDate) return 'Pilih Rentang Waktu...';
    return `${formatToDMY(startDate)} - ${formatToDMY(endDate || startDate)}`;
  };

  const [selectedYear, setSelectedYear] = useState(() => startDate ? startDate.slice(0, 4) : '');
  const [selectedMonth, setSelectedMonth] = useState(() => startDate ? startDate.slice(5, 7) : '');

  // Keep year and month dropdowns synced with startDate
  useEffect(() => {
    if (startDate) {
      setSelectedYear(startDate.slice(0, 4));
      setSelectedMonth(startDate.slice(5, 7));
    } else {
      setSelectedYear('');
      setSelectedMonth('');
    }
  }, [startDate]);

  const handleYearChange = (yr) => {
    setSelectedYear(yr);
    if (!yr) {
      setStartDate('');
      setEndDate('');
      setSelectedMonth('');
      return;
    }
    const m = selectedMonth || '01';
    const lastDay = new Date(Number(yr), Number(m), 0).getDate();
    if (selectedMonth) {
      setStartDate(`${yr}-${m}-01`);
      setEndDate(`${yr}-${m}-${String(lastDay).padStart(2, '0')}`);
    } else {
      setStartDate(`${yr}-01-01`);
      setEndDate(`${yr}-12-31`);
    }
    setDatePreset('custom');
  };

  const handleMonthChange = (m) => {
    setSelectedMonth(m);
    const yr = selectedYear || new Date().getFullYear().toString();
    if (!selectedYear) setSelectedYear(yr);
    if (!m) {
      if (selectedYear) {
        setStartDate(`${yr}-01-01`);
        setEndDate(`${yr}-12-31`);
      } else {
        setStartDate('');
        setEndDate('');
      }
      return;
    }
    const lastDay = new Date(Number(yr), Number(m), 0).getDate();
    setStartDate(`${yr}-${m}-01`);
    setEndDate(`${yr}-${m}-${String(lastDay).padStart(2, '0')}`);
    setDatePreset('custom');
  };

  return (
    <div ref={containerRef} style={noWrapper ? {
      display: 'flex',
      gap: '10px',
      alignItems: 'flex-end',
      position: 'relative',
      zIndex: (showPopover || showOutletDropdown) ? 999999 : 100
    } : {
      display: 'flex',
      gap: '12px',
      alignItems: 'flex-end',
      flexWrap: 'wrap',
      position: 'relative',
      zIndex: (showPopover || showOutletDropdown) ? 999999 : 100,
      background: T.cardBg,
      padding: '12px 16px',
      borderRadius: '12px',
      border: `1px solid ${T.border}`
    }}>
      
      {/* 1. Tahun Dropdown */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <span style={{ fontSize: '0.78rem', color: T.txtSecondary, fontWeight: '700' }}>Tahun</span>
        <select
          value={selectedYear}
          onChange={e => handleYearChange(e.target.value)}
          style={{
            padding: '0 12px',
            borderRadius: '6px',
            border: `1px solid ${T.border}`,
            background: T.inputBg,
            color: T.txtPrimary,
            fontSize: '0.85rem',
            fontWeight: '700',
            height: '40px',
            cursor: 'pointer'
          }}
        >
          <option value="">Semua Tahun</option>
          {Array.from({ length: 17 }, (_, i) => 2024 + i).map(yr => (
            <option key={yr} value={String(yr)}>{yr}</option>
          ))}
        </select>
      </div>

      {/* 2. Bulan Dropdown */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <span style={{ fontSize: '0.78rem', color: T.txtSecondary, fontWeight: '700' }}>Bulan</span>
        <select
          value={selectedMonth}
          onChange={e => handleMonthChange(e.target.value)}
          style={{
            padding: '0 12px',
            borderRadius: '6px',
            border: `1px solid ${T.border}`,
            background: T.inputBg,
            color: T.txtPrimary,
            fontSize: '0.85rem',
            fontWeight: '700',
            height: '40px',
            cursor: 'pointer'
          }}
        >
          <option value="">Semua Bulan</option>
          <option value="01">Januari</option>
          <option value="02">Februari</option>
          <option value="03">Maret</option>
          <option value="04">April</option>
          <option value="05">Mei</option>
          <option value="06">Juni</option>
          <option value="07">Juli</option>
          <option value="08">Agustus</option>
          <option value="09">September</option>
          <option value="10">Oktober</option>
          <option value="11">November</option>
          <option value="12">Desember</option>
        </select>
      </div>

      {/* 3. Tanggal Input Field */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', position: 'relative', zIndex: showPopover ? 999999 : 1 }}>
        <span style={{ fontSize: '0.78rem', color: T.txtSecondary, fontWeight: '700' }}>Tanggal (Rentang Waktu)</span>
        <button
          onClick={() => { setShowPopover(!showPopover); setShowOutletDropdown(false); }}
          style={{
            minWidth: '210px',
            padding: '10px 14px',
            borderRadius: '6px',
            border: `1px solid ${T.border}`,
            background: T.inputBg,
            color: T.txtPrimary,
            fontSize: '0.85rem',
            textAlign: 'left',
            fontWeight: '700',
            cursor: 'pointer',
            boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            height: '40px',
            transition: 'all 0.15s ease'
          }}
          onMouseEnter={(e) => e.currentTarget.style.borderColor = T.info}
          onMouseLeave={(e) => e.currentTarget.style.borderColor = T.border}
        >
          <span>{displayDateRange()}</span>
          <ChevronDown size={16} color={T.txtSecondary} />
        </button>
      </div>

      {/* Outlet Selection Dropdown */}
      {!hideOutletFilter && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', position: 'relative', zIndex: showOutletDropdown ? 999999 : 1 }}>
          <button
            onClick={() => { setShowOutletDropdown(!showOutletDropdown); setShowPopover(false); }}
            style={{
              minWidth: '220px',
              padding: '10px 14px',
              borderRadius: '6px',
              border: `1px solid ${T.border}`,
              background: T.inputBg,
              color: T.txtPrimary,
              fontSize: '0.85rem',
              textAlign: 'left',
              fontWeight: '700',
              cursor: 'pointer',
              boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              height: '40px',
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={(e) => e.currentTarget.style.borderColor = T.info}
            onMouseLeave={(e) => e.currentTarget.style.borderColor = T.border}
          >
            <span style={{ textTransform: 'uppercase', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '180px' }}>
              {selectedOutletLabel()}
            </span>
            <ChevronDown size={16} color={T.txtSecondary} />
          </button>

          {/* Outlet Multi-select Dropdown Popover */}
          {showOutletDropdown && (
            <div style={{
              position: 'absolute',
              top: '48px',
              left: 0,
              width: '280px',
              background: T.dropdownBg,
              border: `1.5px solid ${T.dropdownBorder}`,
              borderRadius: '8px',
              boxShadow: T.shadowLg,
              zIndex: 999999,
              padding: '8px 0',
              display: 'flex',
              flexDirection: 'column'
            }}>
              <button
                onClick={() => onToggleAllOutlets()}
                style={{
                  width: '100%',
                  padding: '10px 16px',
                  textAlign: 'left',
                  border: 'none',
                  background: 'none',
                  fontSize: '0.82rem',
                  color: selectedOutletIds.includes('ALL') ? `${T.info}` : T.txtPrimary,
                  fontWeight: '700',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'background 0.15s ease'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = T.hoverBg}
                onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
              >
                <input type="checkbox" checked={selectedOutletIds.includes('ALL')} onChange={() => {}} style={{ pointerEvents: 'none', accentColor: T.info }} />
                <span>SEMUA OUTLET CABANG</span>
              </button>

              <div style={{ borderTop: `1px solid ${T.border}`, margin: '4px 0' }} />

              <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                {outlets.map(o => {
                  const isChecked = selectedOutletIds.includes(o.id);
                  return (
                    <button
                      key={o.id}
                      onClick={() => onToggleOutlet(o.id)}
                      style={{
                        width: '100%',
                        padding: '8px 16px',
                        textAlign: 'left',
                        border: 'none',
                        background: 'none',
                        fontSize: '0.82rem',
                        color: isChecked ? `${T.info}` : T.txtPrimary,
                        fontWeight: isChecked ? '700' : '500',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        transition: 'background 0.15s ease'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = T.hoverBg}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                    >
                      <input type="checkbox" checked={isChecked} onChange={() => {}} style={{ pointerEvents: 'none', accentColor: T.info }} />
                      <span>{o.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Double Calendar Picker Popover */}
      {showPopover && (
        <div style={{
          position: 'absolute',
          top: '48px',
          left: 0,
          background: T.cardBg,
          border: `1.5px solid ${T.accentGreen}`,
          borderRadius: '8px',
          boxShadow: '0 20px 40px rgba(0,0,0,0.8), 0 0 20px rgba(99, 102, 241, 0.3)',
          zIndex: 999999,
          display: 'flex',
          padding: '16px',
          color: T.txtPrimary
        }}>
          {/* Popover Arrow */}
          <div style={{
            position: 'absolute',
            top: '-6px',
            left: '20px',
            width: '10px',
            height: '10px',
            background: T.cardBg,
            borderTop: `1px solid ${T.border}`,
            borderLeft: `1px solid ${T.border}`,
            transform: 'rotate(45deg)'
          }} />

          {/* Left Sidebar Presets */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            width: '140px',
            borderRight: `1px solid ${T.border}`,
            paddingRight: '12px',
            gap: '6px',
            marginRight: '12px'
          }}>
            {[
              { id: 'today', label: 'Hari ini' },
              { id: 'yesterday', label: 'Kemarin' },
              { id: '7days', label: '7 hari terakhir' },
              { id: '30days', label: '30 hari terakhir' },
              { id: 'month', label: 'Bulan ini' },
              { id: 'last_month', label: 'Bulan kemarin' },
              { id: 'custom', label: 'Custom Range' }
            ].map(preset => {
              const isActive = datePreset === preset.id || (preset.id === 'custom' && datePreset === 'custom');
              return (
                <button
                  key={preset.id}
                  onClick={() => {
                    if (preset.id === 'custom') {
                      setDatePreset('custom');
                    } else {
                      handleApplyPreset(preset.id);
                    }
                  }}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '4px',
                    border: 'none',
                    textAlign: 'left',
                    fontSize: '0.8rem',
                    fontWeight: '600',
                    cursor: 'pointer',
                    background: isActive ? `${T.accentGreen}` : T.cardBg2,
                    color: isActive ? `${T.txtPrimary}` : T.txtPrimary,
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) e.currentTarget.style.background = T.hoverBg;
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) e.currentTarget.style.background = T.cardBg2;
                  }}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>

          {/* Right Section */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            
            {/* Top Inputs inside popover */}
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                border: `1px solid ${T.accentGreen}`,
                borderRadius: '4px',
                padding: '6px 10px',
                fontSize: '0.82rem',
                background: T.cardBg2,
                color: T.txtPrimary,
                width: '140px',
                gap: '8px'
              }}>
                <Calendar size={14} color={ T.info } />
                <span style={{ fontWeight: '700' }}>{formatToDMY(tempStart) || 'Pilih...'}</span>
              </div>

              <div style={{
                display: 'flex',
                alignItems: 'center',
                border: `1px solid ${T.border}`,
                borderRadius: '4px',
                padding: '6px 10px',
                fontSize: '0.82rem',
                background: T.cardBg2,
                color: T.txtPrimary,
                width: '140px',
                gap: '8px'
              }}>
                <Calendar size={14} color={ T.txtSecondary } />
                <span style={{ fontWeight: '700' }}>{formatToDMY(tempEnd) || 'Pilih...'}</span>
              </div>

              {/* Terapkan Button */}
              <button
                onClick={handleApplyCustom}
                disabled={!tempStart}
                style={{
                  background: T.accentGreen,
                  color: T.txtPrimary,
                  border: 'none',
                  borderRadius: '4px',
                  padding: '6px 14px',
                  fontSize: '0.8rem',
                  fontWeight: '700',
                  cursor: 'pointer',
                  opacity: tempStart ? 1 : 0.4
                }}
              >
                Terapkan
              </button>
            </div>

            {/* Calendars side-by-side */}
            <div style={{ display: 'flex', gap: '20px' }}>
              {/* Left Month Calendar */}
              <div style={{ width: '210px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <button
                    onClick={() => setBaseMonth(new Date(leftYear, leftMonth - 1, 1))}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontWeight: '800', fontSize: '0.95rem', color: T.txtPrimary }}
                  >
                    
                  </button>
                  <span style={{ fontSize: '0.82rem', fontWeight: '700', color: T.txtPrimary }}>{leftMonthLabel}</span>
                  <button
                    onClick={() => setBaseMonth(new Date(leftYear, leftMonth + 1, 1))}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontWeight: '800', fontSize: '0.95rem', color: T.txtPrimary }}
                  >
                    
                  </button>
                </div>
                
                {/* Day name headers */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', textAlign: 'center', fontSize: '0.72rem', fontWeight: '700', color: T.txtSecondary, marginBottom: '6px' }}>
                  <div>Su</div><div>Mo</div><div>Tu</div><div>We</div><div>Th</div><div>Fr</div><div>Sa</div>
                </div>

                {/* Days Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px', textAlign: 'center' }}>
                  {leftDays.map((day, idx) => {
                    const isStart = tempStart === day.dateString;
                    const isEnd = tempEnd === day.dateString;
                    const isInRange = tempStart && tempEnd && day.dateString > tempStart && day.dateString < tempEnd;

                    return (
                      <button
                        key={idx}
                        onClick={() => handleDayClick(day.dateString)}
                        style={{
                          border: 'none',
                          padding: '6px 0',
                          fontSize: '0.75rem',
                          fontWeight: (isStart || isEnd) ? '800' : '500',
                          color: !day.isCurrentMonth ? `${T.txtMuted}` : (isStart || isEnd) ? `${T.txtPrimary}` : T.txtPrimary,
                          background: (isStart || isEnd) ? `${T.accentGreen}` : isInRange ? `${T.accentGreenBg}` : 'transparent',
                          borderRadius: (isStart || isEnd) ? '50%' : isInRange ? '0px' : '4px',
                          cursor: 'pointer',
                          transition: 'background 0.15s ease'
                        }}
                        onMouseEnter={(e) => {
                          if (!isStart && !isEnd && !isInRange) e.currentTarget.style.background = T.border;
                        }}
                        onMouseLeave={(e) => {
                          if (!isStart && !isEnd && !isInRange) e.currentTarget.style.background = 'transparent';
                        }}
                      >
                        {day.day}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Right Month Calendar */}
              <div style={{ width: '210px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <button
                    onClick={() => setBaseMonth(new Date(leftYear, leftMonth - 1, 1))}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontWeight: '800', fontSize: '0.95rem', color: T.txtPrimary }}
                  >
                    
                  </button>
                  <span style={{ fontSize: '0.82rem', fontWeight: '700', color: T.txtPrimary }}>{rightMonthLabel}</span>
                  <button
                    onClick={() => setBaseMonth(new Date(leftYear, leftMonth + 1, 1))}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontWeight: '800', fontSize: '0.95rem', color: T.txtPrimary }}
                  >
                    
                  </button>
                </div>
                
                {/* Day name headers */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', textAlign: 'center', fontSize: '0.72rem', fontWeight: '700', color: T.txtSecondary, marginBottom: '6px' }}>
                  <div>Su</div><div>Mo</div><div>Tu</div><div>We</div><div>Th</div><div>Fr</div><div>Sa</div>
                </div>

                {/* Days Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px', textAlign: 'center' }}>
                  {rightDays.map((day, idx) => {
                    const isStart = tempStart === day.dateString;
                    const isEnd = tempEnd === day.dateString;
                    const isInRange = tempStart && tempEnd && day.dateString > tempStart && day.dateString < tempEnd;

                    return (
                      <button
                        key={idx}
                        onClick={() => handleDayClick(day.dateString)}
                        style={{
                          border: 'none',
                          padding: '6px 0',
                          fontSize: '0.75rem',
                          fontWeight: (isStart || isEnd) ? '800' : '500',
                          color: !day.isCurrentMonth ? `${T.txtMuted}` : (isStart || isEnd) ? `${T.txtPrimary}` : T.txtPrimary,
                          background: (isStart || isEnd) ? `${T.accentGreen}` : isInRange ? `${T.accentGreenBg}` : 'transparent',
                          borderRadius: (isStart || isEnd) ? '50%' : isInRange ? '0px' : '4px',
                          cursor: 'pointer',
                          transition: 'background 0.15s ease'
                        }}
                        onMouseEnter={(e) => {
                          if (!isStart && !isEnd && !isInRange) e.currentTarget.style.background = T.border;
                        }}
                        onMouseLeave={(e) => {
                          if (!isStart && !isEnd && !isInRange) e.currentTarget.style.background = 'transparent';
                        }}
                      >
                        {day.day}
                      </button>
                    );
                  })}
                </div>
              </div>

            </div>
          </div>

        </div>
      )}

    </div>
  );
}

export function ColumnVisibilityDropdown({ columns, visibleColumns, onToggleColumn, themeMode = 'dark' }) {
  const T = getThemePalette(themeMode);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={dropdownRef} style={{ position: 'relative', display: 'inline-block', zIndex: isOpen ? 999999 : 10 }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="btn-secondary"
        style={{
          padding: '6px 12px',
          fontSize: '0.78rem',
          color: T.info,
          borderColor: 'rgba(56, 189, 248, 0.4)',
          background: 'rgba(56, 189, 248, 0.1)',
          fontWeight: '700',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          height: '32px'
        }}
      >
        <SlidersHorizontal size={14} />
        <span>Filter Kolom</span>
        <ChevronDown size={12} />
      </button>

      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: '38px',
            right: 0,
            width: '240px',
            background: T.cardBg,
            border: `1.5px solid ${T.info}`,
            borderRadius: '10px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.8), 0 0 20px rgba(56, 189, 248, 0.3)',
            zIndex: 999999,
            padding: '10px',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px'
          }}
        >
          <div style={{ fontSize: '0.75rem', fontWeight: '800', color: T.txtSecondary, paddingBottom: '6px', borderBottom: `1px solid ${T.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>TAMPILKAN KOLOM:</span>
          </div>

          <div style={{ maxHeight: '220px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px', paddingTop: '4px' }}>
            {columns.map(col => {
              const isVisible = visibleColumns[col.key] !== false;
              return (
                <label
                  key={col.key}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '6px 8px',
                    borderRadius: '6px',
                    fontSize: '0.8rem',
                    color: isVisible ? `${T.txtPrimary}` : T.txtMuted,
                    cursor: 'pointer',
                    background: isVisible ? 'rgba(56, 189, 248, 0.08)' : 'transparent',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <input
                    type="checkbox"
                    checked={isVisible}
                    onChange={() => onToggleColumn(col.key)}
                    style={{ accentColor: T.info, cursor: 'pointer' }}
                  />
                  <span style={{ fontWeight: isVisible ? '700' : '400' }}>{col.label}</span>
                </label>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default function SalesTransactionsPage({ masterData, setMasterData, selectedBranch, themeMode = 'dark' }) {
  const T = getThemePalette(themeMode);

  const [activeTab, setActiveTab] = useState('omzet');
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  // AUTO SYNC STATES & ENGINE FOR MOBILE APK
  const [lastSyncTime, setLastSyncTime] = useState(() => new Date().toLocaleTimeString('id-ID'));
  const [isSyncing, setIsSyncing] = useState(false);
  const [isAutoSyncEnabled, setIsAutoSyncEnabled] = useState(true);
  const [syncPulse, setSyncPulse] = useState(false);

  // Periodic Auto Sync effect (Fetches live data from server every 10 seconds)
  useEffect(() => {
    if (!isAutoSyncEnabled) return;
    const interval = setInterval(() => {
      fetch(getApiUrl('/api/master-data'), { cache: 'no-store' })
        .then(res => res.ok ? res.json() : null)
        .then(serverData => {
          if (serverData && typeof serverData === 'object' && Array.isArray(serverData.salesTransactions)) {
            setMasterData(prev => ({
              ...prev,
              ...serverData
            }));
            setSyncPulse(true);
            setLastSyncTime(new Date().toLocaleTimeString('id-ID', { hour12: false }));
            setTimeout(() => setSyncPulse(false), 1200);
          }
        })
        .catch(() => {});
    }, 10000);
    return () => clearInterval(interval);
  }, [isAutoSyncEnabled]);

  const handleManualSync = async () => {
    setIsSyncing(true);
    try {
      const res = await fetch(getApiUrl('/api/master-data'), { cache: 'no-store' });
      if (res.ok) {
        const serverData = await res.json();
        if (serverData && typeof serverData === 'object') {
          setMasterData(prev => ({
            ...prev,
            ...serverData,
            _lastUpdated: Date.now()
          }));
        }
      }
    } catch (err) {
      console.error('Error syncing POS transactions from server:', err);
    } finally {
      setIsSyncing(false);
      const nowStr = new Date().toLocaleTimeString('id-ID', { hour12: false });
      setLastSyncTime(nowStr);
    }
  };

  // Form New Transaction state
  const [receiptNo, setReceiptNo] = useState(`POS-${Math.floor(100000 + Math.random() * 900000)}`);
  const [customerId, setCustomerId] = useState('');
  const [outletId, setOutletId] = useState(masterData.outlets?.[0]?.id || 1);
  const [amount, setAmount] = useState('');
  const [discountAmount, setDiscountAmount] = useState('0');
  const [paymentMethod, setPaymentMethod] = useState(masterData.paymentMethods?.[0]?.name || 'QRIS BCA');
  const [notes, setNotes] = useState('Dine In');
  const [txStatus, setTxStatus] = useState('Success');
  const [voidReason, setVoidReason] = useState('Salah input menu');

  // OMZET FILTER STATES
  const [omzetViewPeriodMode, setOmzetViewPeriodMode] = useState('daily'); // 'daily' | 'monthly'
  const [selectedOmzetYear, setSelectedOmzetYear] = useState(new Date().getFullYear().toString());
  const [selectedOmzetMonth, setSelectedOmzetMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM for Line Chart & Comparison Table
  const [omzetStartDate, setOmzetStartDate] = useState('');
  const [omzetEndDate, setOmzetEndDate] = useState('');
  const [omzetDatePreset, setOmzetDatePreset] = useState('all');
  const [omzetShowCalendarPopover, setOmzetShowCalendarPopover] = useState(false);
  const [omzetSelectedOutletIds, setOmzetSelectedOutletIds] = useState(['ALL']);
  const [omzetShowOutletDropdown, setOmzetShowOutletDropdown] = useState(false);

  const handleToggleOmzetOutlet = (idVal) => {
    if (idVal === 'ALL') {
      setOmzetSelectedOutletIds(['ALL']);
    } else {
      let updated = omzetSelectedOutletIds.filter(id => id !== 'ALL');
      if (updated.includes(idVal)) {
        updated = updated.filter(id => id !== idVal);
      } else {
        updated.push(idVal);
      }
      if (updated.length === 0) updated = ['ALL'];
      setOmzetSelectedOutletIds(updated);
    }
  };
  // 1. Date Range Filter & Calendar Widget Popover
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [datePreset, setDatePreset] = useState('all');
  const [showCalendarPopover, setShowCalendarPopover] = useState(false);

  // 2. Multi-Outlet Filter Dropdown
  const [selectedOutletIds, setSelectedOutletIds] = useState(['ALL']); // ['ALL'] or array of numbers
  const [showOutletDropdown, setShowOutletDropdown] = useState(false);

  // 3. Column Visibility Filter
  const [visibleColumns, setVisibleColumns] = useState({
    date: true,
    outlets: true,
    gross: true,
    discount: true,
    net: true
  });
  const [showColumnDropdown, setShowColumnDropdown] = useState(false);

  // PENJUALAN BY MENU FILTER STATES
  // Initialize catStartDate/catEndDate to current month so the default preset 'month' has actual dates
  const [selectedMenuFilter, setSelectedMenuFilter] = useState('ALL');
  const [catStartDate, setCatStartDate] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  });
  const [catEndDate, setCatEndDate] = useState(() => {
    const now = new Date();
    return now.toISOString().split('T')[0];
  });
  const [catDatePreset, setCatDatePreset] = useState('month');
  const [catShowCalendarPopover, setCatShowCalendarPopover] = useState(false);
  const [catSelectedOutletIds, setCatSelectedOutletIds] = useState(['ALL']);
  const [catShowOutletDropdown, setCatShowOutletDropdown] = useState(false);

  // COLUMN VISIBILITY STATES FOR MENU TABLES
  const [menuNominalVisibleCols, setMenuNominalVisibleCols] = useState({
    menuName: true,
    gross: true,
    net: true,
    totalGross: true,
    totalNet: true
  });

  const [menuQtyVisibleCols, setMenuQtyVisibleCols] = useState({
    menuName: true,
    qty: true,
    totalQty: true
  });

  const handleToggleMenuNominalCol = (key) => {
    setMenuNominalVisibleCols(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleToggleMenuQtyCol = (key) => {
    setMenuQtyVisibleCols(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // SUMMARY SALES FILTER STATES
  const [sumStartDate, setSumStartDate] = useState('');
  const [sumEndDate, setSumEndDate] = useState('');
  const [sumDatePreset, setSumDatePreset] = useState('all');
  const [sumShowCalendarPopover, setSumShowCalendarPopover] = useState(false);
  const [sumSelectedOutletIds, setSumSelectedOutletIds] = useState(['ALL']);
  const [sumShowOutletDropdown, setSumShowOutletDropdown] = useState(false);

  // DAILY SALES FILTER STATES
  const [dailyStartDate, setDailyStartDate] = useState('');
  const [dailyEndDate, setDailyEndDate] = useState('');
  const [dailyDatePreset, setDailyDatePreset] = useState('all');
  const [dailyShowCalendarPopover, setDailyShowCalendarPopover] = useState(false);
  const [dailySelectedOutletIds, setDailySelectedOutletIds] = useState(['ALL']);
  const [dailyShowOutletDropdown, setDailyShowOutletDropdown] = useState(false);
  const [dailyVisibleColumns, setDailyVisibleColumns] = useState({
    date: true,
    net: true,
    dineIn: true,
    takeAway: true,
    cash: true,
    qris: true,
    transfer: true,
    ewallet: true
  });
  const [dailyShowColumnDropdown, setDailyShowColumnDropdown] = useState(false);

  // CUSTOMER SALES FILTER STATES
  const [custStartDate, setCustStartDate] = useState('');
  const [custEndDate, setCustEndDate] = useState('');
  const [custDatePreset, setCustDatePreset] = useState('all');
  const [custShowCalendarPopover, setCustShowCalendarPopover] = useState(false);
  const [custSelectedOutletIds, setCustSelectedOutletIds] = useState(['ALL']);
  const [custShowOutletDropdown, setCustShowOutletDropdown] = useState(false);
  const [custVisibleColumns, setCustVisibleColumns] = useState({
    code: true,
    name: true,
    phone: true,
    tier: true,
    txCount: true,
    avgSpend: true,
    totalSpend: true
  });
  const [custShowColumnDropdown, setCustShowColumnDropdown] = useState(false);

  // HOURLY SALES FILTER STATES
  const [hourStartDate, setHourStartDate] = useState('');
  const [hourEndDate, setHourEndDate] = useState('');
  const [hourDatePreset, setHourDatePreset] = useState('all');
  const [hourShowCalendarPopover, setHourShowCalendarPopover] = useState(false);
  const [hourSelectedOutletIds, setHourSelectedOutletIds] = useState(['ALL']);
  const [hourShowOutletDropdown, setHourShowOutletDropdown] = useState(false);
  const [hourVisibleColumns, setHourVisibleColumns] = useState({
    hourRange: true,
    txCount: true,
    net: true,
    pct: true
  });
  const [hourShowColumnDropdown, setHourShowColumnDropdown] = useState(false);

  // RECEIPTS SALES FILTER STATES
  const [rcptStartDate, setRcptStartDate] = useState('');
  const [rcptEndDate, setRcptEndDate] = useState('');
  const [rcptDatePreset, setRcptDatePreset] = useState('all');
  const [rcptShowCalendarPopover, setRcptShowCalendarPopover] = useState(false);
  const [rcptSelectedOutletIds, setRcptSelectedOutletIds] = useState(['ALL']);
  const [rcptShowOutletDropdown, setRcptShowOutletDropdown] = useState(false);
  const [rcptVisibleColumns, setRcptVisibleColumns] = useState({
    serviceType: true,
    receiptCount: true,
    totalQty: true,
    avgQtyPerReceipt: true,
    grossSales: true,
    discount: true,
    netSales: true,
    avgSpend: true,
    pct: true
  });
  const [rcptShowColumnDropdown, setRcptShowColumnDropdown] = useState(false);

  // MONTHLY COMPARISON FILTER STATES
  const [momStartDate, setMomStartDate] = useState('');
  const [momEndDate, setMomEndDate] = useState('');
  const [momDatePreset, setMomDatePreset] = useState('all');
  const [momShowCalendarPopover, setMomShowCalendarPopover] = useState(false);
  const [momSelectedOutletIds, setMomSelectedOutletIds] = useState(['ALL']);
  const [momShowOutletDropdown, setMomShowOutletDropdown] = useState(false);
  const [momVisibleColumns, setMomVisibleColumns] = useState({
    month: true,
    outletName: true,
    txCount: true,
    grossSales: true,
    discount: true,
    netSales: true,
    avgSpend: true,
    growth: true
  });
  const [momShowColumnDropdown, setMomShowColumnDropdown] = useState(false);

  // Auto-sync all sub-tab outlet filters with top-level selectedBranch
  useEffect(() => {
    const val = selectedBranch ? [selectedBranch] : ['ALL'];
    setSelectedOutletIds(val);
    setOmzetSelectedOutletIds(val);
    setCatSelectedOutletIds(val);
    setSumSelectedOutletIds(val);
    setDailySelectedOutletIds(val);
    setCustSelectedOutletIds(val);
    setHourSelectedOutletIds(val);
    setRcptSelectedOutletIds(val);
    setMomSelectedOutletIds(val);
  }, [selectedBranch]);







  const analysisTabs = [
    { id: 'omzet', name: '1. Omzet Penjualan', icon: DollarSign },
    { id: 'categories', name: '2. Penjualan By Menu', icon: Layers },
    { id: 'summary', name: '3. Ulasan Eksekutif', icon: FileText },
    { id: 'daily', name: '4. Ringkasan Penjualan', icon: Calendar },
    { id: 'transaction_history', name: '5. Riwayat Transaksi', icon: Receipt },
    { id: 'hourly', name: '6. Penjualan per Jam', icon: Clock },
    { id: 'receipts', name: '7. Penjualan By Layanan', icon: ShoppingBag },
    { id: 'customers', name: '8. Penjualan per Pelanggan', icon: Users },
    { id: 'monthly_comparison', name: '9. Perbandingan Bulanan', icon: TrendingUp }
  ];

  const transactions = masterData.salesTransactions || [];
  const outlets = masterData.outlets || [];
  const customers = masterData.customers || [];
  const categories = masterData.categories || [];
  const products = masterData.products || [];

  const formatRupiah = (num) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(num || 0);
  };

  const getOutletName = (id) => {
    const found = outlets.find(o => o.id === parseInt(id));
    return found ? found.name : 'Outlet Utama';
  };

  const getCustomerName = (id) => {
    const found = customers.find(c => c.id === parseInt(id));
    return found ? found.name : 'Pelanggan Umum (Guest)';
  };

  // Preset Date Filter Handler
  const handleApplyDatePreset = (presetKey) => {
    setDatePreset(presetKey);
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    if (presetKey === 'today') {
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (presetKey === '7days') {
      const past = new Date();
      past.setDate(today.getDate() - 7);
      setStartDate(past.toISOString().split('T')[0]);
      setEndDate(todayStr);
    } else if (presetKey === 'month') {
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      setStartDate(firstDay.toISOString().split('T')[0]);
      setEndDate(todayStr);
    } else {
      setStartDate('');
      setEndDate('');
    }
  };

  // Toggle Multi Outlet Select
  const handleToggleOutlet = (idVal) => {
    if (idVal === 'ALL') {
      setSelectedOutletIds(['ALL']);
    } else {
      let updated = selectedOutletIds.filter(id => id !== 'ALL');
      if (updated.includes(idVal)) {
        updated = updated.filter(id => id !== idVal);
      } else {
        updated.push(idVal);
      }
      if (updated.length === 0) updated = ['ALL'];
      setSelectedOutletIds(updated);
    }
  };

  // Toggle Column Visibility
  const handleToggleColumn = (colKey) => {
    setVisibleColumns(prev => ({ ...prev, [colKey]: !prev[colKey] }));
  };

  // Submit New Sales Transaction (Auto syncs with Omzet and Mobile APK)
  const handleSubmitTransaction = (e) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    const numDiscount = parseFloat(discountAmount) || 0;

    if (!numAmount || numAmount <= 0) {
      alert('Mohon masukkan Nominal Penjualan yang valid');
      return;
    }

    const updated = { ...masterData };
    if (!updated.salesTransactions) updated.salesTransactions = [];
    if (!updated.customers) updated.customers = [];

    const todayStr = new Date().toISOString().split('T')[0];
    const newTx = {
      id: Date.now(),
      receipt_no: receiptNo,
      date: todayStr,
      time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      customer_id: customerId ? parseInt(customerId) : null,
      outlet_id: parseInt(outletId),
      amount: numAmount,
      discount: numDiscount,
      payment_method: paymentMethod,
      notes: notes,
      status: txStatus,
      void_reason: txStatus === 'Void' ? voidReason : null
    };

    updated.salesTransactions.unshift(newTx);

    // Update Customer Spend & Tier if customer linked and transaction is Success (not Voided)
    if (customerId && txStatus !== 'Void') {
      const custIdx = updated.customers.findIndex(c => c.id === parseInt(customerId));
      if (custIdx !== -1) {
        const oldSpend = updated.customers[custIdx].total_spend || 0;
        const newSpend = oldSpend + (numAmount - numDiscount);
        updated.customers[custIdx].total_spend = newSpend;
      }
    }

    setMasterData(updated);
    setShowAddModal(false);
    setAmount('');
    setDiscountAmount('0');
    setReceiptNo(`POS-${Math.floor(100000 + Math.random() * 900000)}`);
    setTxStatus('Success');
    setVoidReason('Salah input menu');
  };

  // Active Outlets for dynamic table columns
  const activeOutletsList = outlets.filter(o => {
    if (selectedBranch && o.id !== selectedBranch) return false;
    if (!selectedOutletIds.includes('ALL') && !selectedOutletIds.includes(o.id)) return false;
    return true;
  });

  // Filtered transactions for Omzet Calculation
  const filteredOmzetTxs = transactions.filter(t => {
    if (startDate && t.date < startDate) return false;
    if (endDate && t.date > endDate) return false;
    if (!selectedOutletIds.includes('ALL') && !selectedOutletIds.includes(t.outlet_id)) return false;
    if (selectedBranch && t.outlet_id !== selectedBranch) return false;
    if (t.status === 'Void') return false;
    return true;
  });

  // Grouped Pivot Data Matrix (Grouped by Date, values per outlet)
  const pivotOmzetMap = {};
  filteredOmzetTxs.forEach(t => {
    const d = t.date;
    if (!pivotOmzetMap[d]) {
      pivotOmzetMap[d] = {
        date: d,
        outletGross: {}, // { outlet_id: amount }
        totalGross: 0,
        totalDiscount: 0,
        totalNet: 0
      };
    }
    const grossVal = t.amount || 0;
    const discountVal = t.discount || 0;

    if (!pivotOmzetMap[d].outletGross[t.outlet_id]) {
      pivotOmzetMap[d].outletGross[t.outlet_id] = 0;
    }
    pivotOmzetMap[d].outletGross[t.outlet_id] += grossVal;
    pivotOmzetMap[d].totalGross += grossVal;
    pivotOmzetMap[d].totalDiscount += discountVal;
    pivotOmzetMap[d].totalNet += (grossVal - discountVal);
  });

  const pivotRows = Object.values(pivotOmzetMap).sort((a, b) => b.date.localeCompare(a.date));

  const grandGross = pivotRows.reduce((acc, r) => acc + r.totalGross, 0);
  const grandDiscount = pivotRows.reduce((acc, r) => acc + r.totalDiscount, 0);
  const grandNet = pivotRows.reduce((acc, r) => acc + r.totalNet, 0);

  // Helper for Omzet Outlet Comparison (Table & Line Chart per Date Range / Month)
  const getOmzetOutletComparisonData = () => {
    const activeOutlets = outlets || [];
    let filteredOutlets = omzetSelectedOutletIds.includes('ALL')
      ? activeOutlets
      : activeOutlets.filter(o => omzetSelectedOutletIds.some(id => Number(id) === Number(o.id)));

    // -------------------------------------------------------------
    // MODE BULANAN (REKAP 12 BULAN DALAM 1 TAHUN)
    // -------------------------------------------------------------
    if (omzetViewPeriodMode === 'monthly') {
      const year = selectedOmzetYear || new Date().getFullYear().toString();
      const monthDefs = [
        { key: '01', name: 'Januari', short: 'Jan' },
        { key: '02', name: 'Februari', short: 'Feb' },
        { key: '03', name: 'Maret', short: 'Mar' },
        { key: '04', name: 'April', short: 'Apr' },
        { key: '05', name: 'Mei', short: 'Mei' },
        { key: '06', name: 'Juni', short: 'Jun' },
        { key: '07', name: 'Juli', short: 'Jul' },
        { key: '08', name: 'Agustus', short: 'Agt' },
        { key: '09', name: 'September', short: 'Sep' },
        { key: '10', name: 'Oktober', short: 'Okt' },
        { key: '11', name: 'November', short: 'Nov' },
        { key: '12', name: 'Desember', short: 'Des' }
      ];

      const isAllOutlets = omzetSelectedOutletIds.includes('ALL') || omzetSelectedOutletIds.length === 0;

      const validTxs = transactions.filter(t => {
        if (t.status === 'Void') return false;
        const dt = String(t.date || t.timestamp || t.created_at || '').slice(0, 4);
        if (dt !== year) return false;

        if (!isAllOutlets) {
          const matchesOutlet = filteredOutlets.some(otl => 
            Number(otl.id) === Number(t.outlet_id) || 
            (t.branch_name && t.branch_name.trim().toLowerCase() === otl.name.trim().toLowerCase())
          );
          if (!matchesOutlet) return false;
        }

        return true;
      });

      const rows = [];
      const chartData = [];

      monthDefs.forEach(m => {
        const ym = `${year}-${m.key}`;
        const monthTxs = validTxs.filter(t => {
          const dt = String(t.date || t.timestamp || t.created_at || '').slice(0, 7);
          return dt === ym;
        });

        const outletData = {};
        let totalGrossAll = 0;
        let totalNetAll = 0;

        const chartItem = {
          dayLabel: m.short,
          fullDate: `${m.name} ${year}`
        };

        filteredOutlets.forEach(otl => {
          const otlTxs = monthTxs.filter(t => 
            (Number(t.outlet_id) === Number(otl.id)) || 
            (t.branch_name && t.branch_name.trim().toLowerCase() === otl.name.trim().toLowerCase())
          );
          let gross = otlTxs.reduce((sum, t) => sum + Number(t.total_amount || t.amount || t.total || t.price || 0), 0);
          let disc = otlTxs.reduce((sum, t) => sum + Number(t.discount || t.discount_amount || 0), 0);
          let net = otlTxs.reduce((sum, t) => {
            const g = Number(t.total_amount || t.amount || t.total || t.price || 0);
            const d = Number(t.discount || t.discount_amount || 0);
            const n = Number(t.final_amount !== undefined ? t.final_amount : (g - d));
            return sum + n;
          }, 0);

          outletData[otl.id] = { gross, net, txCount: otlTxs.length };
          chartItem[otl.name] = net;
          totalGrossAll += gross;
          totalNetAll += net;
        });

        chartItem['Total Omzet'] = totalNetAll;

        rows.push({
          date: ym,
          formattedDate: `${m.name} ${year}`,
          dayNum: m.key,
          outlets: outletData,
          totalGross: totalGrossAll,
          totalNet: totalNetAll,
          txCount: monthTxs.length
        });

        chartData.push(chartItem);
      });

      let grandTotalGross = 0;
      let grandTotalNet = 0;
      let grandTotalDiscount = 0;
      const totalTxCount = validTxs.length;
      const outletRevenueMap = {};

      filteredOutlets.forEach(otl => {
        outletRevenueMap[otl.id] = { name: otl.name, net: 0, txCount: 0 };
      });

      validTxs.forEach(t => {
        const g = Number(t.total_amount || t.amount || t.total || t.price || 0);
        const d = Number(t.discount || t.discount_amount || 0);
        const n = Number(t.final_amount !== undefined ? t.final_amount : (g - d));
        grandTotalGross += g;
        grandTotalDiscount += d;
        grandTotalNet += n;

        const matchedOtl = filteredOutlets.find(o => 
          Number(o.id) === Number(t.outlet_id) || 
          (t.branch_name && t.branch_name.trim().toLowerCase() === o.name.trim().toLowerCase())
        );
        if (matchedOtl && outletRevenueMap[matchedOtl.id]) {
          outletRevenueMap[matchedOtl.id].net += n;
          outletRevenueMap[matchedOtl.id].txCount += 1;
        }
      });

      let topOutletName = 'Belum Ada Transaksi';
      let topOutletAmount = 0;
      Object.values(outletRevenueMap).forEach(o => {
        if (o.net > topOutletAmount) {
          topOutletAmount = o.net;
          topOutletName = `${o.name} (${formatRupiah(o.net)})`;
        }
      });

      const activeMonthsCount = rows.filter(r => r.totalNet > 0).length || 1;
      const dailyAvgNet = Math.round(grandTotalNet / activeMonthsCount);

      return {
        activeOutlets: filteredOutlets,
        rows,
        chartData,
        start: `${year}-01-01`,
        end: `${year}-12-31`,
        displayPeriod: `Rekap 12 Bulan Tahun ${year}`,
        grandTotalGross,
        grandTotalDiscount,
        grandTotalNet,
        totalTxCount,
        dailyAvgNet,
        topOutletName,
        topOutletAmount
      };
    }

    // -------------------------------------------------------------
    // MODE HARIAN (RINCIAN PER TANGGAL DALAM BULAN / PERIODE)
    // -------------------------------------------------------------
    let start = omzetStartDate;
    let end = omzetEndDate;

    if (!start && !end) {
      const currentYM = selectedOmzetMonth || new Date().toISOString().slice(0, 7);
      const [yStr, mStr] = currentYM.split('-');
      const y = parseInt(yStr);
      const m = parseInt(mStr);
      const days = new Date(y, m, 0).getDate();
      start = `${currentYM}-01`;
      end = `${currentYM}-${String(days).padStart(2, '0')}`;
    } else if (start && !end) {
      end = start;
    } else if (!start && end) {
      start = end;
    }

    const startDateObj = new Date(start);
    const endDateObj = new Date(end);
    const daysDiff = Math.max(1, Math.min(62, Math.round((endDateObj - startDateObj) / (1000 * 60 * 60 * 24)) + 1));

    const isAllOutlets = omzetSelectedOutletIds.includes('ALL') || omzetSelectedOutletIds.length === 0;

    const validTxs = transactions.filter(t => {
      if (t.status === 'Void') return false;
      const dt = String(t.date || t.timestamp || t.created_at || '').slice(0, 10);
      if (start && dt < start) return false;
      if (end && dt > end) return false;

      if (!isAllOutlets) {
        const matchesOutlet = filteredOutlets.some(otl => 
          Number(otl.id) === Number(t.outlet_id) || 
          (t.branch_name && t.branch_name.trim().toLowerCase() === otl.name.trim().toLowerCase())
        );
        if (!matchesOutlet) return false;
      }

      return true;
    });

    const rows = [];
    const chartData = [];

    for (let i = 0; i < daysDiff; i++) {
      const curr = new Date(startDateObj);
      curr.setDate(startDateObj.getDate() + i);
      const y = curr.getFullYear();
      const m = String(curr.getMonth() + 1).padStart(2, '0');
      const d = String(curr.getDate()).padStart(2, '0');
      const dateKey = `${y}-${m}-${d}`;
      const formattedDate = `${d}/${m}/${y}`;

      const dayTxs = validTxs.filter(t => {
        const dt = String(t.date || t.timestamp || t.created_at || '').slice(0, 10);
        return dt === dateKey;
      });

      const outletData = {};
      let totalGrossAll = 0;
      let totalNetAll = 0;

      const chartItem = {
        dayLabel: `Tgl ${d}`,
        fullDate: formattedDate
      };

      filteredOutlets.forEach(otl => {
        const otlTxs = dayTxs.filter(t => 
          (Number(t.outlet_id) === Number(otl.id)) || 
          (t.branch_name && t.branch_name.trim().toLowerCase() === otl.name.trim().toLowerCase())
        );
        let gross = otlTxs.reduce((sum, t) => sum + Number(t.total_amount || t.amount || t.total || t.price || 0), 0);
        let disc = otlTxs.reduce((sum, t) => sum + Number(t.discount || t.discount_amount || 0), 0);
        let net = otlTxs.reduce((sum, t) => {
          const g = Number(t.total_amount || t.amount || t.total || t.price || 0);
          const d = Number(t.discount || t.discount_amount || 0);
          const n = Number(t.final_amount !== undefined ? t.final_amount : (g - d));
          return sum + n;
        }, 0);

        outletData[otl.id] = { gross, net, txCount: otlTxs.length };
        chartItem[otl.name] = net;
        totalGrossAll += gross;
        totalNetAll += net;
      });

      chartItem['Total Omzet'] = totalNetAll;

      rows.push({
        date: dateKey,
        formattedDate,
        dayNum: parseInt(d),
        outlets: outletData,
        totalGross: totalGrossAll,
        totalNet: totalNetAll,
        txCount: dayTxs.length
      });

      chartData.push(chartItem);
    }

    // Comprehensive KPI metrics for Omzet tab
    let grandTotalGross = 0;
    let grandTotalNet = 0;
    let grandTotalDiscount = 0;
    const totalTxCount = validTxs.length;
    const outletRevenueMap = {};

    filteredOutlets.forEach(otl => {
      outletRevenueMap[otl.id] = { name: otl.name, net: 0, txCount: 0 };
    });

    validTxs.forEach(t => {
      const g = Number(t.total_amount || t.amount || t.total || t.price || 0);
      const d = Number(t.discount || t.discount_amount || 0);
      const n = Number(t.final_amount !== undefined ? t.final_amount : (g - d));
      grandTotalGross += g;
      grandTotalDiscount += d;
      grandTotalNet += n;

      const matchedOtl = filteredOutlets.find(o => 
        Number(o.id) === Number(t.outlet_id) || 
        (t.branch_name && t.branch_name.trim().toLowerCase() === o.name.trim().toLowerCase())
      );
      if (matchedOtl && outletRevenueMap[matchedOtl.id]) {
        outletRevenueMap[matchedOtl.id].net += n;
        outletRevenueMap[matchedOtl.id].txCount += 1;
      }
    });

    let topOutletName = 'Belum Ada Transaksi';
    let topOutletAmount = 0;
    Object.values(outletRevenueMap).forEach(o => {
      if (o.net > topOutletAmount) {
        topOutletAmount = o.net;
        topOutletName = `${o.name} (${formatRupiah(o.net)})`;
      }
    });

    const activeDaysCount = rows.filter(r => r.totalNet > 0).length || 1;
    const dailyAvgNet = Math.round(grandTotalNet / activeDaysCount);

    const displayPeriod = start === end ? start : (start.slice(0, 7) === end.slice(0, 7) ? start.slice(0, 7) : `${start} s/d ${end}`);

    return {
      activeOutlets: filteredOutlets,
      rows,
      chartData,
      start,
      end,
      displayPeriod,
      grandTotalGross,
      grandTotalDiscount,
      grandTotalNet,
      totalTxCount,
      dailyAvgNet,
      topOutletName,
      topOutletAmount
    };
  };

  // EXPORT EXCEL FOR OMZET COMPARISON
  const handleDownloadOmzetComparisonExcel = () => {
    const { activeOutlets, rows, start, end, displayPeriod } = getOmzetOutletComparisonData();
    const outletStr = getOutletNameStrForExport(omzetSelectedOutletIds, outlets, selectedBranch);
    const filename = buildExportFilename('perbandingan_omzet_penjualan', outletStr, start, end, 'csv');

    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += `Laporan Perbandingan Omzet Penjualan - Outlet: ${outletStr} - Periode ${displayPeriod}\n\n`;

    let headerRow = '"Tanggal"';
    activeOutlets.forEach(otl => {
      headerRow += `,"${otl.name}"`;
    });
    headerRow += ',"Total Akumulasi"\n';
    csvContent += headerRow;

    rows.forEach(r => {
      let rowStr = `"${r.formattedDate}"`;
      activeOutlets.forEach(otl => {
        const d = r.outlets[otl.id] || { net: 0 };
        rowStr += `,${d.net}`;
      });
      rowStr += `,${r.totalNet}\n`;
      csvContent += rowStr;
    });

    let totalRowStr = '"TOTAL"';
    activeOutlets.forEach(otl => {
      const sumNet = rows.reduce((s, r) => s + (r.outlets[otl.id]?.net || 0), 0);
      totalRowStr += `,${sumNet}`;
    });
    totalRowStr += `,${rows.reduce((s, r) => s + r.totalNet, 0)}\n`;
    csvContent += totalRowStr;

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // EXPORT PDF PRINT FUNCTION FOR OMZET COMPARISON
  const handleDownloadOmzetComparisonPDF = () => {
    const { activeOutlets, rows, start, end, displayPeriod } = getOmzetOutletComparisonData();
    const outletStr = getOutletNameStrForExport(omzetSelectedOutletIds, outlets, selectedBranch);
    const pdfFilename = buildExportFilename('perbandingan_omzet_penjualan', outletStr, start, end, 'pdf');

    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>${pdfFilename}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 30px; color: ${T.cardBg}; }
            h1 { text-align: center; color: #0284c7; font-size: 22px; margin-bottom: 4px; font-weight: bold; }
            .subtitle { text-align: center; color: ${T.txtMuted}; font-size: 14px; font-weight: bold; margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 11px; }
            th { border: 1px solid ${T.txtPrimary}; padding: 8px 6px; text-align: right; background: ${T.txtPrimary}; font-weight: bold; }
            th.center { text-align: center; }
            td { border: 1px solid #e2e8f0; padding: 6px; text-align: right; }
            td.center { text-align: center; }
            .total-row { font-weight: bold; background: #f1f5f9; border-top: 2px solid #0284c7; }
          </style>
        </head>
        <body>
          <h1>Perbandingan Omzet Penjualan Antar Outlet</h1>
          <div class="subtitle">Outlet: ${outletStr} | Periode: ${displayPeriod}</div>
          <table>
            <thead>
              <tr>
                <th class="center">Tanggal</th>
                ${activeOutlets.map(otl => `<th class="center">${otl.name}</th>`).join('')}
                <th class="center">Total Akumulasi</th>
              </tr>
            </thead>
            <tbody>
              ${rows.map(r => `
                <tr>
                  <td class="center">${r.formattedDate}</td>
                  ${activeOutlets.map(otl => {
                    const d = r.outlets[otl.id] || { net: 0 };
                    return `<td><b>${formatRupiah(d.net)}</b></td>`;
                  }).join('')}
                  <td><b>${formatRupiah(r.totalNet)}</b></td>
                </tr>
              `).join('')}
              <tr class="total-row">
                <td class="center">TOTAL</td>
                ${activeOutlets.map(otl => {
                  const sumNet = rows.reduce((s, r) => s + (r.outlets[otl.id]?.net || 0), 0);
                  return `<td>${formatRupiah(sumNet)}</td>`;
                }).join('')}
                <td>${formatRupiah(rows.reduce((s, r) => s + r.totalNet, 0))}</td>
              </tr>
            </tbody>
          </table>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 500);
  };

  // Detailed Menu Sales Aggregation for Tables & Top 5 Cards
  const getDetailedMenuSalesData = () => {
    const activeOutlets = outlets || [];
    const salesTx = masterData?.salesTransactions || masterData?.transactions || [];

    let filteredOutlets = catSelectedOutletIds.includes('ALL')
      ? activeOutlets
      : activeOutlets.filter(o => catSelectedOutletIds.some(id => Number(id) === Number(o.id)));

    const start = catStartDate || '';
    const end = catEndDate || '';

    // 1. Gather all unique menu names (deduplicate identical names across outlets)
    const uniqueMenuMap = new Map();

    (products || []).forEach(p => {
      const rawName = (p.name || '').trim();
      if (!rawName) return;
      const key = rawName.toUpperCase();
      if (!uniqueMenuMap.has(key)) {
        uniqueMenuMap.set(key, {
          key,
          displayName: rawName,
          category_id: p.category_id,
          category_name: p.category_name
        });
      }
    });

    salesTx.forEach(t => {
      if (t.items && Array.isArray(t.items)) {
        t.items.forEach(it => {
          const rawName = (it.name || it.product_name || '').trim();
          if (!rawName) return;
          const key = rawName.toUpperCase();
          if (!uniqueMenuMap.has(key)) {
            uniqueMenuMap.set(key, {
              key,
              displayName: rawName,
              category_id: null,
              category_name: null
            });
          }
        });
      } else {
        const rawName = (t.item_name || t.product_name || '').trim();
        if (!rawName) return;
        const key = rawName.toUpperCase();
        if (!uniqueMenuMap.has(key)) {
          uniqueMenuMap.set(key, {
            key,
            displayName: rawName,
            category_id: null,
            category_name: null
          });
        }
      }
    });

    // 2. Pre-filter valid transactions
    const validTxs = salesTx.filter(t => {
      if (t.status === 'Void') return false;
      const dt = String(t.date || t.timestamp || t.created_at || '').slice(0, 10);
      if (start && dt < start) return false;
      if (end && dt > end) return false;
      return true;
    });

    // 3. For each unique menu, calculate sales across filteredOutlets
    const menuRows = Array.from(uniqueMenuMap.values()).map((menu, idx) => {
      const outletMap = {};
      let totalGrossAll = 0;
      let totalNetAll = 0;
      let totalQtyAll = 0;

      filteredOutlets.forEach(otl => {
        let gross = 0;
        let disc = 0;
        let qty = 0;

        const otlTxs = validTxs.filter(t => 
          (Number(t.outlet_id) === Number(otl.id)) || 
          (t.branch_name && t.branch_name.trim().toLowerCase() === otl.name.trim().toLowerCase())
        );

        otlTxs.forEach(t => {
          if (t.items && Array.isArray(t.items) && t.items.length > 0) {
            t.items.forEach(it => {
              const itName = (it.name || it.product_name || '').trim().toUpperCase();
              if (itName === menu.key) {
                const q = Number(it.qty || it.quantity || 1);
                const itemGross = Number(it.subtotal || it.total || it.amount || (it.price_unit ? it.price_unit * q : 0) || (it.price ? it.price * q : 0) || 0);
                const itemDisc = Number(it.discount || it.discount_amount || (it.discount_unit ? it.discount_unit * q : 0) || 0);
                qty += q;
                gross += itemGross;
                disc += itemDisc;
              }
            });
          } else {
            const tName = (t.item_name || t.product_name || '').trim().toUpperCase();
            if (tName === menu.key) {
              const q = Number(t.qty || t.quantity || 1);
              const tGross = Number(t.total_amount || t.amount || t.price || 0);
              const tDisc = Number(t.discount || t.discount_amount || 0);
              qty += q;
              gross += tGross;
              disc += tDisc;
            }
          }
        });

        const net = gross - disc;
        outletMap[otl.id] = { gross, net, qty };
        totalGrossAll += gross;
        totalNetAll += net;
        totalQtyAll += qty;
      });

      return {
        id: menu.key || idx + 1,
        name: menu.displayName,
        outlets: outletMap,
        totalGross: totalGrossAll,
        totalNet: totalNetAll,
        totalQty: totalQtyAll
      };
    });

    menuRows.sort((a, b) => b.totalNet - a.totalNet);

    const top5PerOutlet = {};
    filteredOutlets.forEach(otl => {
      const sortedForOtl = menuRows.map(m => ({
        name: m.name,
        qty: m.outlets[otl.id]?.qty || 0,
        gross: m.outlets[otl.id]?.gross || 0,
        net: m.outlets[otl.id]?.net || 0
      })).filter(m => m.qty > 0 || m.net > 0).sort((a, b) => b.qty - a.qty).slice(0, 5);

      top5PerOutlet[otl.id] = sortedForOtl;
    });

    // KPI Metrics for Categories / Menu Sales tab
    const grandTotalNetAll = menuRows.reduce((s, r) => s + r.totalNet, 0);
    const grandTotalGrossAll = menuRows.reduce((s, r) => s + r.totalGross, 0);
    const grandTotalQtyAll = menuRows.reduce((s, r) => s + r.totalQty, 0);
    const activeMenusCount = menuRows.filter(r => r.totalQty > 0).length;

    const sortedByQty = [...menuRows].sort((a, b) => b.totalQty - a.totalQty);
    const topMenuName = sortedByQty.length > 0 && sortedByQty[0].totalQty > 0 
      ? `${sortedByQty[0].name} (${sortedByQty[0].totalQty} Porsi)` 
      : 'Belum Ada Penjualan';

    // Category breakdown
    const categoryRevenueMap = {};
    menuRows.forEach(r => {
      const p = (products || []).find(prod => (prod.name || '').trim().toUpperCase() === r.id);
      const catName = p?.category_name || (masterData?.productCategories || []).find(c => Number(c.id) === Number(p?.category_id))?.name || 'Makanan & Minuman';
      if (!categoryRevenueMap[catName]) categoryRevenueMap[catName] = { name: catName, net: 0, qty: 0 };
      categoryRevenueMap[catName].net += r.totalNet;
      categoryRevenueMap[catName].qty += r.totalQty;
    });

    let topCategoryName = 'Makanan Utama';
    let maxCatNet = 0;
    Object.values(categoryRevenueMap).forEach(c => {
      if (c.net > maxCatNet) {
        maxCatNet = c.net;
        topCategoryName = `${c.name} (${formatRupiah(c.net)})`;
      }
    });

    return { 
      activeOutlets: filteredOutlets, 
      menuRows, 
      top5PerOutlet, 
      start, 
      end,
      grandTotalNetAll,
      grandTotalGrossAll,
      grandTotalQtyAll,
      activeMenusCount,
      topMenuName,
      topCategoryName,
      categoryRevenueMap
    };
  };

  // Helper for Line Chart Daily Movement of Filtered Menu Item
  const getMenuLineChartData = () => {
    const { activeOutlets, start, end } = getDetailedMenuSalesData();
    const salesTx = masterData?.salesTransactions || masterData?.transactions || [];
    const startDateObj = new Date(start || '2026-07-01');
    const endDateObj = new Date(end || '2026-07-31');
    const daysDiff = Math.max(1, Math.min(31, Math.round((endDateObj - startDateObj) / (1000 * 60 * 60 * 24)) + 1));

    const chartData = [];
    const activeMenuName = selectedMenuFilter === 'ALL' ? 'Teh Manis' : selectedMenuFilter;

    for (let i = 0; i < daysDiff; i++) {
      const curr = new Date(startDateObj);
      curr.setDate(startDateObj.getDate() + i);
      const dayPad = String(curr.getDate()).padStart(2, '0');
      const monthPad = String(curr.getMonth() + 1).padStart(2, '0');
      const yearNum = curr.getFullYear();
      const formattedDate = `${dayPad}/${monthPad}/${yearNum}`;

      const chartItem = {
        dayLabel: `Tgl ${curr.getDate()}`,
        fullDate: formattedDate
      };

      activeOutlets.forEach(otl => {
        const dayTxs = salesTx.filter(t => 
          Number(t.outlet_id) === Number(otl.id) &&
          (t.date === formattedDate || t.date === `${yearNum}-${monthPad}-${dayPad}`) &&
          (selectedMenuFilter === 'ALL' || t.item_name === activeMenuName || t.product_name === activeMenuName)
        );
        const net = dayTxs.reduce((sum, t) => sum + (Number(t.amount || 0) - Number(t.discount || 0)), 0);
        chartItem[otl.name] = net;
      });

      chartData.push(chartItem);
    }

    return { activeOutlets, chartData, activeMenuName };
  };

  // EXPORT EXCEL - NOMINAL BY MENU
  const handleDownloadMenuNominalExcel = () => {
    const { activeOutlets, menuRows, start, end } = getDetailedMenuSalesData();
    const outletStr = getOutletNameStrForExport(catSelectedOutletIds, outlets, selectedBranch);
    const filename = buildExportFilename('penjualan_by_menu_nominal', outletStr, start, end, 'csv');

    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += `Laporan Penjualan By Menu (Nominal Rincian Per Menu) - Outlet: ${outletStr} - Periode ${start} s/d ${end}\n\n`;

    let headerRow = '"Nama Menu"';
    activeOutlets.forEach(otl => {
      headerRow += `,"${otl.name}"`;
    });
    headerRow += ',"Total Akumulasi"\n';
    csvContent += headerRow;

    menuRows.forEach(r => {
      let rowStr = `"${r.name}"`;
      activeOutlets.forEach(otl => {
        const d = r.outlets[otl.id] || { net: 0 };
        rowStr += `,${d.net}`;
      });
      rowStr += `,${r.totalNet}\n`;
      csvContent += rowStr;
    });

    let totalRowStr = '"TOTAL AKUMULASI NOMINAL"';
    activeOutlets.forEach(otl => {
      const sumNet = menuRows.reduce((s, r) => s + (r.outlets[otl.id]?.net || 0), 0);
      totalRowStr += `,${sumNet}`;
    });
    totalRowStr += `,${menuRows.reduce((s, r) => s + r.totalNet, 0)}\n`;
    csvContent += totalRowStr;

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // EXPORT EXCEL - QTY BY MENU
  const handleDownloadMenuQtyExcel = () => {
    const { activeOutlets, menuRows, start, end } = getDetailedMenuSalesData();
    const outletStr = getOutletNameStrForExport(catSelectedOutletIds, outlets, selectedBranch);
    const filename = buildExportFilename('penjualan_by_menu_qty', outletStr, start, end, 'csv');

    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += `Laporan Penjualan By Menu (Qty Terjual Per Menu) - Outlet: ${outletStr} - Periode ${start} s/d ${end}\n\n`;

    let headerRow = '"Nama Menu"';
    activeOutlets.forEach(otl => {
      headerRow += `,"${otl.name} (Qty Terjual)"`;
    });
    headerRow += ',"Total Akumulasi Qty Seluruh Outlet"\n';
    csvContent += headerRow;

    menuRows.forEach(r => {
      let rowStr = `"${r.name}"`;
      activeOutlets.forEach(otl => {
        const d = r.outlets[otl.id] || { qty: 0 };
        rowStr += `,${d.qty}`;
      });
      rowStr += `,${r.totalQty}\n`;
      csvContent += rowStr;
    });

    let totalRowStr = '"TOTAL AKUMULASI QTY BULANAN"';
    activeOutlets.forEach(otl => {
      const sumQty = menuRows.reduce((s, r) => s + (r.outlets[otl.id]?.qty || 0), 0);
      totalRowStr += `,${sumQty}`;
    });
    totalRowStr += `,${menuRows.reduce((s, r) => s + r.totalQty, 0)}\n`;
    csvContent += totalRowStr;

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // EXPORT PDF - NOMINAL BY MENU
  const handleDownloadMenuNominalPDF = () => {
    const { activeOutlets, menuRows, start, end } = getDetailedMenuSalesData();
    const outletStr = getOutletNameStrForExport(catSelectedOutletIds, outlets, selectedBranch);
    const pdfFilename = buildExportFilename('penjualan_by_menu_nominal', outletStr, start, end, 'pdf');

    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>${pdfFilename}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 30px; color: ${T.cardBg}; }
            h1 { text-align: center; color: #0284c7; font-size: 20px; margin-bottom: 4px; font-weight: bold; }
            .subtitle { text-align: center; color: ${T.txtMuted}; font-size: 13px; font-weight: bold; margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 11px; }
            th { border: 1px solid ${T.txtPrimary}; padding: 8px 6px; text-align: right; background: ${T.txtPrimary}; font-weight: bold; }
            th.center { text-align: center; }
            th.left { text-align: left; }
            td { border: 1px solid #e2e8f0; padding: 6px; text-align: right; }
            td.left { text-align: left; }
            td.center { text-align: center; }
            .total-row { font-weight: bold; background: #f1f5f9; border-top: 2px solid #0284c7; }
          </style>
        </head>
        <body>
          <h1>Laporan Rincian Nominal Penjualan By Menu (Setelah Diskon)</h1>
          <div class="subtitle">Outlet: ${outletStr} | Periode Rentang Waktu: ${start} s/d ${end}</div>
          <table>
            <thead>
              <tr>
                <th class="left">Nama Menu</th>
                ${activeOutlets.map(otl => `<th class="center">${otl.name}</th>`).join('')}
                <th class="center">Total Akumulasi</th>
              </tr>
            </thead>
            <tbody>
              ${menuRows.map(r => `
                <tr>
                  <td class="left"><b>${r.name}</b></td>
                  ${activeOutlets.map(otl => {
                    const d = r.outlets[otl.id] || { net: 0 };
                    return `<td><b>${formatRupiah(d.net)}</b></td>`;
                  }).join('')}
                  <td><b>${formatRupiah(r.totalNet)}</b></td>
                </tr>
              `).join('')}
              <tr class="total-row">
                <td class="left">TOTAL AKUMULASI</td>
                ${activeOutlets.map(otl => {
                  const sumNet = menuRows.reduce((s, r) => s + (r.outlets[otl.id]?.net || 0), 0);
                  return `<td>${formatRupiah(sumNet)}</td>`;
                }).join('')}
                <td>${formatRupiah(menuRows.reduce((s, r) => s + r.totalNet, 0))}</td>
              </tr>
            </tbody>
          </table>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 500);
  };

  // EXPORT PDF - QTY BY MENU
  const handleDownloadMenuQtyPDF = () => {
    const { activeOutlets, menuRows, start, end } = getDetailedMenuSalesData();

    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>Laporan Rincian Qty Penjualan By Menu (${start} s/d ${end})</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 30px; color: ${T.cardBg}; }
            h1 { text-align: center; color: #0284c7; font-size: 20px; margin-bottom: 4px; font-weight: bold; }
            .subtitle { text-align: center; color: ${T.txtMuted}; font-size: 13px; font-weight: bold; margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 11px; }
            th { border: 1px solid ${T.txtPrimary}; padding: 8px 6px; text-align: right; background: ${T.txtPrimary}; font-weight: bold; }
            th.center { text-align: center; }
            th.left { text-align: left; }
            td { border: 1px solid #e2e8f0; padding: 6px; text-align: right; }
            td.left { text-align: left; }
            .total-row { font-weight: bold; background: #f1f5f9; border-top: 2px solid #0284c7; }
          </style>
        </head>
        <body>
          <h1>Laporan Rincian Qty Penjualan By Menu (Porsi / Item Terjual)</h1>
          <div class="subtitle">Periode Rentang Waktu: ${start} s/d ${end}</div>
          <table>
            <thead>
              <tr>
                <th class="left">Nama Menu</th>
                ${activeOutlets.map(otl => `<th class="center">${otl.name} (Qty)</th>`).join('')}
                <th class="center">Total Akumulasi Qty</th>
              </tr>
            </thead>
            <tbody>
              ${menuRows.map(r => `
                <tr>
                  <td class="left"><b>${r.name}</b></td>
                  ${activeOutlets.map(otl => {
                    const d = r.outlets[otl.id] || { qty: 0 };
                    return `<td><b>${d.qty.toLocaleString('id-ID')} Item</b></td>`;
                  }).join('')}
                  <td><b>${r.totalQty.toLocaleString('id-ID')} Item</b></td>
                </tr>
              `).join('')}
              <tr class="total-row">
                <td class="left">TOTAL AKUMULASI QTY</td>
                ${activeOutlets.map(otl => {
                  const sumQty = menuRows.reduce((s, r) => s + (r.outlets[otl.id]?.qty || 0), 0);
                  return `<td>${sumQty.toLocaleString('id-ID')} Item</td>`;
                }).join('')}
                <td>${menuRows.reduce((s, r) => s + r.totalQty, 0).toLocaleString('id-ID')} Item</td>
              </tr>
            </tbody>
          </table>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 500);
  };

  // EXECUTIVE SALES SUMMARY REPORT DATA HELPER (MATCHING LUNA POS REPORT SCREENSHOT)
  const getExecutiveSummaryReportData = () => {
    const start = sumStartDate ? formatToDMY(sumStartDate) : 'Semua Tanggal';
    const end = sumEndDate ? formatToDMY(sumEndDate) : '';

    const activeOutlets = sumSelectedOutletIds.includes('ALL') 
      ? outlets 
      : outlets.filter(o => sumSelectedOutletIds.includes(o.id));
    
    const outletNameStr = getOutletNameStrForExport(sumSelectedOutletIds, outlets, selectedBranch);

    const salesTx = masterData?.salesTransactions || masterData?.transactions || [];

    const filteredTxs = salesTx.filter(t => {
      if (sumStartDate && t.date < sumStartDate) return false;
      if (sumEndDate && t.date > sumEndDate) return false;
      if (!sumSelectedOutletIds.includes('ALL') && !sumSelectedOutletIds.includes(t.outlet_id)) return false;
      if (selectedBranch && t.outlet_id !== selectedBranch) return false;
      return true;
    });

    const activeTxs = filteredTxs.filter(t => t.status !== 'Void');
    const voidTxs = filteredTxs.filter(t => t.status === 'Void');

    const totalSales = activeTxs.reduce((s, t) => s + Number(t.amount || t.total_amount || t.grand_total || 0), 0);
    const totalDiscount = activeTxs.reduce((s, t) => s + Number(t.discount || t.discount_amount || 0), 0);
    const totalServiceCharge = activeTxs.reduce((s, t) => s + Number(t.service_charge || t.serviceCharge || 0), 0);
    const totalTax = activeTxs.reduce((s, t) => s + Number(t.tax || t.tax_amount || 0), 0);
    const totalAdjustment = activeTxs.reduce((s, t) => s + Number(t.adjustment || 0), 0);
    const netTotal = totalSales - totalDiscount + totalServiceCharge + totalTax + totalAdjustment;

    const numberOfInvoices = activeTxs.length;
    const avgBillPerInvoice = numberOfInvoices > 0 ? netTotal / numberOfInvoices : 0;

    const voidInvoices = voidTxs.length;
    const voidItems = voidTxs.reduce((s, t) => {
      if (t.items && Array.isArray(t.items)) return s + t.items.reduce((is, i) => is + Number(i.qty || 1), 0);
      return s + Number(t.qty || t.quantity || 1);
    }, 0);
    const voidTotal = voidTxs.reduce((s, t) => s + Number(t.amount || t.total_amount || 0), 0);

    // Group active transactions by product and order type (Dine In / Take Away)
    const productMap = {}; // { prodName: { Normal: { qty, sales }, 'Take Away': { qty, sales } } }

    activeTxs.forEach(t => {
      const isTakeAway = (t.type || t.service_type || t.notes || '').toLowerCase().includes('take') ||
                         (t.notes || '').toLowerCase().includes('bungkus') ||
                         (t.notes || '').toLowerCase().includes('delivery') ||
                         (t.notes || '').toLowerCase().includes('ojol') ||
                         (t.notes || '').toLowerCase().includes('online');
      const orderType = isTakeAway ? 'Take Away' : 'Normal';

      if (t.items && Array.isArray(t.items) && t.items.length > 0) {
        t.items.forEach(item => {
          const pName = item.name || item.product_name || 'Item Penjualan';
          const q = Number(item.qty || 1);
          const s = Number(item.total || (item.qty * item.price) || 0);

          if (!productMap[pName]) productMap[pName] = { Normal: { qty: 0, sales: 0 }, 'Take Away': { qty: 0, sales: 0 } };
          productMap[pName][orderType].qty += q;
          productMap[pName][orderType].sales += s;
        });
      } else {
        const pName = t.item_name || t.product_name || 'Item Penjualan';
        const q = Number(t.qty || t.quantity || 1);
        const s = Number(t.amount || 0);

        if (!productMap[pName]) productMap[pName] = { Normal: { qty: 0, sales: 0 }, 'Take Away': { qty: 0, sales: 0 } };
        productMap[pName][orderType].qty += q;
        productMap[pName][orderType].sales += s;
      }
    });

    const productSummary = Object.keys(productMap).map(name => {
      const variants = [];
      if (productMap[name].Normal.qty > 0 || productMap[name].Normal.sales > 0) {
        variants.push({ type: 'Normal', qty: productMap[name].Normal.qty, sales: productMap[name].Normal.sales });
      }
      if (productMap[name]['Take Away'].qty > 0 || productMap[name]['Take Away'].sales > 0) {
        variants.push({ type: 'Take Away', qty: productMap[name]['Take Away'].qty, sales: productMap[name]['Take Away'].sales });
      }
      if (variants.length === 0) {
        variants.push({ type: 'Normal', qty: 0, sales: 0 });
      }
      return { name, variants };
    });

    return {
      start,
      end,
      outletNameStr,
      totalSales,
      totalDiscount,
      totalServiceCharge,
      totalTax,
      totalAdjustment,
      netTotal,
      numberOfInvoices,
      avgBillPerInvoice,
      voidInvoices,
      voidItems,
      voidTotal,
      productSummary
    };
  };

  // EXPORT EXCEL - EXECUTIVE SALES SUMMARY
  const handleDownloadSummaryExcel = () => {
    const data = getExecutiveSummaryReportData();
    const filename = buildExportFilename('ringkasan_penjualan', data.outletNameStr, data.start, data.end, 'csv');

    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += `Ringkasan Penjualan - ${data.outletNameStr}\n`;
    csvContent += `Nama Outlet,${data.outletNameStr}\n`;
    csvContent += `Periode,${data.start} - ${data.end}\n\n`;

    csvContent += `FINANCIAL SUMMARY\n`;
    csvContent += `"Total Sales",${data.totalSales}\n`;
    csvContent += `"Total Discount",-${data.totalDiscount}\n`;
    csvContent += `"Total Service Charge",${data.totalServiceCharge}\n`;
    csvContent += `"Total Tax",${data.totalTax}\n`;
    csvContent += `"Total Adjustment",${data.totalAdjustment}\n`;
    csvContent += `"TOTAL",${data.netTotal}\n\n`;

    csvContent += `INVOICES\n`;
    csvContent += `"Number of Invoices",${data.numberOfInvoices}\n`;
    csvContent += `"Average Bill per Invoice",${data.avgBillPerInvoice}\n\n`;

    csvContent += `VOID SUMMARY\n`;
    csvContent += `"Number of Invoices",${data.voidInvoices}\n`;
    csvContent += `"Number of Items",${data.voidItems}\n`;
    csvContent += `"TOTAL",${data.voidTotal}\n\n`;

    csvContent += `SUMMARY BY PRODUCT\n`;
    csvContent += `"Nama Menu","Tipe Layanan","Qty","Total Sales"\n`;

    data.productSummary.forEach(prod => {
      prod.variants.forEach(v => {
        csvContent += `"${prod.name}","${v.type}",${v.qty},${v.sales}\n`;
      });
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // EXPORT PDF - EXECUTIVE SALES SUMMARY
  const handleDownloadSummaryPDF = () => {
    const data = getExecutiveSummaryReportData();
    const pdfFilename = buildExportFilename('ringkasan_penjualan', data.outletNameStr, data.start, data.end, 'pdf');
    const printWindow = window.open('', '_blank');

    printWindow.document.write(`
      <html>
        <head>
          <title>${pdfFilename}</title>
          <style>
            body { font-family: 'Helvetica Neue', Arial, sans-serif; padding: 40px; color: ${T.cardBg}; max-width: 800px; margin: 0 auto; }
            .header { text-align: center; margin-bottom: 28px; }
            .title { font-size: 22px; font-weight: bold; color: #0284c7; margin-bottom: 4px; }
            .period { font-size: 13px; font-weight: 600; color: ${T.txtMuted}; margin-bottom: 8px; }
            .resto { font-size: 16px; font-weight: bold; color: ${T.cardBg}; border-bottom: 2px solid #e2e8f0; padding-bottom: 12px; }
            
            .section-title { font-size: 13px; font-weight: bold; color: ${T.txtMuted}; margin-top: 24px; margin-bottom: 8px; border-bottom: 1px solid ${T.txtPrimary}; padding-bottom: 4px; }
            
            table { width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 12px; }
            td { padding: 8px 12px; border-bottom: 1px solid #e2e8f0; }
            td.left { text-align: left; color: ${T.border}; }
            td.right { text-align: right; font-weight: 600; color: ${T.cardBg2}; }
            tr.total-row td { font-weight: bold; font-size: 13px; border-top: 2px solid ${T.cardBg2}; border-bottom: 2px solid ${T.cardBg2}; }
            
            .product-table th { background: ${T.txtPrimary}; border-bottom: 2px solid ${T.txtPrimary}; padding: 8px 12px; text-align: left; font-size: 11px; color: ${T.txtMuted}; }
            .product-table td { padding: 6px 12px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="title">Ringkasan Penjualan</div>
            <div class="period">${data.start} - ${data.end}</div>
            <div class="resto">${data.outletNameStr}</div>
          </div>

          <table>
            <tbody>
              <tr><td class="left">Total Sales</td><td class="right">${formatRupiahDecimals(data.totalSales)}</td></tr>
              <tr><td class="left">Total Discount</td><td class="right">(${formatRupiahDecimals(data.totalDiscount)})</td></tr>
              <tr><td class="left">Total Service Charge</td><td class="right">${formatRupiahDecimals(data.totalServiceCharge)}</td></tr>
              <tr><td class="left">Total Tax</td><td class="right">${formatRupiahDecimals(data.totalTax)}</td></tr>
              <tr><td class="left">Total Adjustment</td><td class="right">${formatRupiahDecimals(data.totalAdjustment)}</td></tr>
              <tr class="total-row"><td class="left">TOTAL</td><td class="right">${formatRupiahDecimals(data.netTotal)}</td></tr>
            </tbody>
          </table>

          <div class="section-title">Invoices</div>
          <table>
            <tbody>
              <tr><td class="left">Number of Invoices</td><td class="right">${data.numberOfInvoices.toLocaleString('id-ID')}</td></tr>
              <tr><td class="left">Average Bill per Invoice</td><td class="right">${formatRupiahDecimals(data.avgBillPerInvoice)}</td></tr>
            </tbody>
          </table>

          <div class="section-title">Void Summary</div>
          <table>
            <tbody>
              <tr><td class="left">Number of Invoices</td><td class="right">${data.voidInvoices}</td></tr>
              <tr><td class="left">Number of Items</td><td class="right">${data.voidItems}</td></tr>
              <tr class="total-row"><td class="left">TOTAL</td><td class="right">${formatRupiahDecimals(data.voidTotal)}</td></tr>
            </tbody>
          </table>

          <div class="section-title">Summary By Product</div>
          <table class="product-table">
            <thead>
              <tr>
                <th>Nama Produk</th>
                <th>Tipe Pesanan</th>
                <th style="text-align: center;">Qty</th>
                <th style="text-align: right;">Total Sales</th>
              </tr>
            </thead>
            <tbody>
              ${data.productSummary.map(prod => `
                ${prod.variants.map((v, i) => `
                  <tr>
                    <td>${i === 0 ? `<b>${prod.name}</b>` : ''}</td>
                    <td style="color: ${T.txtMuted};">${v.type}</td>
                    <td style="text-align: center;">x${v.qty}</td>
                    <td style="text-align: right; font-weight: 600;">${formatRupiahDecimals(v.sales)}</td>
                  </tr>
                `).join('')}
              `).join('')}
            </tbody>
          </table>
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 500);
  };

  // CATEGORY SALES CALCULATIONS & FILTERS
  const handleApplyCatDatePreset = (presetKey) => {
    setCatDatePreset(presetKey);
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    if (presetKey === 'today') {
      setCatStartDate(todayStr);
      setCatEndDate(todayStr);
    } else if (presetKey === '7days') {
      const past = new Date();
      past.setDate(today.getDate() - 7);
      setCatStartDate(past.toISOString().split('T')[0]);
      setCatEndDate(todayStr);
    } else if (presetKey === 'month') {
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      setCatStartDate(firstDay.toISOString().split('T')[0]);
      setCatEndDate(todayStr);
    } else {
      setCatStartDate('');
      setCatEndDate('');
    }
  };

  const handleToggleCatOutlet = (idVal) => {
    if (idVal === 'ALL') {
      setCatSelectedOutletIds(['ALL']);
    } else {
      let updated = catSelectedOutletIds.filter(id => id !== 'ALL');
      if (updated.includes(idVal)) {
        updated = updated.filter(id => id !== idVal);
      } else {
        updated.push(idVal);
      }
      if (updated.length === 0) updated = ['ALL'];
      setCatSelectedOutletIds(updated);
    }
  };

  const filteredCategoryTxs = transactions.filter(t => {
    if (catStartDate && t.date < catStartDate) return false;
    if (catEndDate && t.date > catEndDate) return false;
    // Use catSelectedOutletIds (already synced with selectedBranch via useEffect)
    if (!catSelectedOutletIds.includes('ALL') && !catSelectedOutletIds.includes(t.outlet_id)) return false;
    if (t.status === 'Void') return false;
    return true;
  });

  const categorySalesData = (categories.length > 0 ? categories : [
    { id: 1, name: 'Makanan Utama' },
    { id: 2, name: 'Minuman' },
    { id: 3, name: 'Dessert' }
  ]).map((cat, idx) => {
    const catTxs = filteredCategoryTxs.filter(t => t.category_id === cat.id || (idx === 0 && !t.category_id));
    const gross = catTxs.reduce((acc, t) => acc + (t.amount || 0), 0);
    const discount = catTxs.reduce((acc, t) => acc + (t.discount || 0), 0);
    const net = gross - discount;
    const qty = catTxs.length * 2;
    return {
      id: cat.id,
      name: cat.name,
      description: cat.description || 'Kategori menu restoran',
      gross,
      discount,
      net,
      qty
    };
  });

  const totalCatNet = categorySalesData.reduce((acc, c) => acc + c.net, 0);
  const totalCatGross = categorySalesData.reduce((acc, c) => acc + c.gross, 0);
  const totalCatDiscount = categorySalesData.reduce((acc, c) => acc + c.discount, 0);
  const totalCatQty = categorySalesData.reduce((acc, c) => acc + c.qty, 0);

  // Category Download Excel (CSV)
  const handleDownloadCategoryExcel = () => {
    if (categorySalesData.length === 0) {
      alert('Tidak ada data kategori produk untuk di-export');
      return;
    }
    const outletStr = getOutletNameStrForExport(catSelectedOutletIds, outlets, selectedBranch);
    const filename = buildExportFilename('penjualan_kategori_produk', outletStr, catStartDate, catEndDate, 'csv');

    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += `Laporan Penjualan Kategori Produk - Outlet: ${outletStr}\n`;
    csvContent += `Nama Outlet,${outletStr}\n\n`;
    csvContent += "Kategori Produk,Porsi/Qty Terjual,Total Gross (Rp),Diskon Penjualan (Rp),Pendapatan Bersih (Net Rp),Kontribusi Omzet (%)\n";

    categorySalesData.forEach(c => {
      const pct = totalCatNet > 0 ? ((c.net / totalCatNet) * 100).toFixed(1) : '0';
      csvContent += `"${c.name}",${c.qty},${c.gross},${c.discount},${c.net},${pct}%\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Category Download PDF (Print View)
  const handleDownloadCategoryPDF = () => {
    if (categorySalesData.length === 0) {
      alert('Tidak ada data kategori produk untuk di-export PDF');
      return;
    }
    const outletStr = getOutletNameStrForExport(catSelectedOutletIds, outlets, selectedBranch);
    const pdfFilename = buildExportFilename('penjualan_kategori_produk', outletStr, catStartDate, catEndDate, 'pdf');

    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>${pdfFilename}</title>
          <style>
            body { font-family: sans-serif; padding: 20px; color: ${T.cardBg}; }
            h2 { color: ${T.cardBg2}; margin-bottom: 4px; }
            p { font-size: 14px; color: ${T.txtMuted}; margin-top: 0; }
            table { width: 100%; border-collapse: collapse; margin-top: 16px; }
            th, td { border: 1px solid ${T.txtPrimary}; padding: 10px; text-align: left; font-size: 12px; }
            th { background-color: #f1f5f9; text-transform: uppercase; font-size: 11px; }
            .text-right { text-align: right; }
            .font-bold { font-weight: bold; }
          </style>
        </head>
        <body>
          <h2>Laporan Penjualan Berdasarkan Kategori Produk</h2>
          <p>Outlet: ${outletStr} | Tanggal Cetak: ${new Date().toLocaleDateString('id-ID')}</p>
          <table>
            <thead>
              <tr>
                <th>Kategori Produk</th>
                <th class="text-right">Qty Terjual</th>
                <th class="text-right">Total Gross</th>
                <th class="text-right">Diskon</th>
                <th class="text-right">Pendapatan Bersih</th>
                <th class="text-right">Kontribusi</th>
              </tr>
            </thead>
            <tbody>
              ${categorySalesData.map(c => {
                const pct = totalCatNet > 0 ? ((c.net / totalCatNet) * 100).toFixed(1) : '0';
                return `
                  <tr>
                    <td><b>${c.name}</b></td>
                    <td class="text-right">${c.qty} porsi</td>
                    <td class="text-right">${formatRupiah(c.gross)}</td>
                    <td class="text-right">${formatRupiah(c.discount)}</td>
                    <td class="text-right font-bold">${formatRupiah(c.net)}</td>
                    <td class="text-right font-bold">${pct}%</td>
                  </tr>
                `;
              }).join('')}
              <tr style="background-color: ${T.txtPrimary}; font-weight: bold;">
                <td>TOTAL KESELURUHAN</td>
                <td class="text-right">${totalCatQty} porsi</td>
                <td class="text-right">${formatRupiah(totalCatGross)}</td>
                <td class="text-right">${formatRupiah(totalCatDiscount)}</td>
                <td class="text-right" style="color: #059669;">${formatRupiah(totalCatNet)}</td>
                <td class="text-right">100%</td>
              </tr>
            </tbody>
          </table>
          <script>window.print();</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // SUMMARY SALES CALCULATIONS & AI NOTES GENERATOR
  const handleApplySumDatePreset = (presetKey) => {
    setSumDatePreset(presetKey);
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    if (presetKey === 'today') {
      setSumStartDate(todayStr);
      setSumEndDate(todayStr);
    } else if (presetKey === '7days') {
      const past = new Date();
      past.setDate(today.getDate() - 7);
      setSumStartDate(past.toISOString().split('T')[0]);
      setSumEndDate(todayStr);
    } else if (presetKey === 'month') {
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      setSumStartDate(firstDay.toISOString().split('T')[0]);
      setSumEndDate(todayStr);
    } else {
      setSumStartDate('');
      setSumEndDate('');
    }
  };

  const handleToggleSumOutlet = (idVal) => {
    if (idVal === 'ALL') {
      setSumSelectedOutletIds(['ALL']);
    } else {
      let updated = sumSelectedOutletIds.filter(id => id !== 'ALL');
      if (updated.includes(idVal)) {
        updated = updated.filter(id => id !== idVal);
      } else {
        updated.push(idVal);
      }
      if (updated.length === 0) updated = ['ALL'];
      setSumSelectedOutletIds(updated);
    }
  };

  const filteredSummaryTxs = transactions.filter(t => {
    if (sumStartDate && t.date < sumStartDate) return false;
    if (sumEndDate && t.date > sumEndDate) return false;
    if (!sumSelectedOutletIds.includes('ALL') && !sumSelectedOutletIds.includes(t.outlet_id)) return false;
    if (selectedBranch && t.outlet_id !== selectedBranch) return false;
    if (t.status === 'Void') return false;
    return true;
  });

  // Financial Summary Totals
  const sumGross = filteredSummaryTxs.reduce((acc, t) => acc + (t.amount || 0), 0);
  const sumDiscount = filteredSummaryTxs.reduce((acc, t) => acc + (t.discount || 0), 0);
  const sumNet = sumGross - sumDiscount;
  const sumTxCount = filteredSummaryTxs.length;

  // Service Type Breakdown (Dine In vs. Take Away)
  const dineInTxs = filteredSummaryTxs.filter(t => !t.notes || t.notes.toLowerCase().includes('dine') || t.notes.toLowerCase().includes('meja') || t.notes.toLowerCase().includes('table'));
  const takeAwayTxs = filteredSummaryTxs.filter(t => t.notes && (t.notes.toLowerCase().includes('take') || t.notes.toLowerCase().includes('bungkus') || t.notes.toLowerCase().includes('delivery') || t.notes.toLowerCase().includes('ojol')));

  const dineInGross = dineInTxs.reduce((acc, t) => acc + (t.amount - (t.discount || 0)), 0);
  const takeAwayGross = takeAwayTxs.reduce((acc, t) => acc + (t.amount - (t.discount || 0)), 0);

  const dineInPct = sumNet > 0 ? ((dineInGross / sumNet) * 100).toFixed(1) : '65.0';
  const takeAwayPct = sumNet > 0 ? ((takeAwayGross / sumNet) * 100).toFixed(1) : '35.0';

  // Payment Method Breakdown
  const paymentMethodsList = masterData.paymentMethods || [{ name: 'Cash' }, { name: 'QRIS BCA' }, { name: 'Transfer' }, { name: 'E-Wallet' }];
  const paymentMethodSummary = paymentMethodsList.map(pm => {
    const pmTxs = filteredSummaryTxs.filter(t => t.payment_method === pm.name);
    const amount = pmTxs.reduce((acc, t) => acc + (t.amount - (t.discount || 0)), 0);
    const count = pmTxs.length;
    const pct = sumNet > 0 ? ((amount / sumNet) * 100).toFixed(1) : '0';
    return { name: pm.name, amount, count, pct };
  });

  // AI Generated Executive Notes / Review
  const generateAISummaryReview = () => {
    if (sumTxCount === 0) {
      return "Belum terdapat transaksi penjualan tercatat pada periode filter ini. Diperlukan transaksi masuk untuk menghasilkan ulasan performa otomatis.";
    }

    const topPayment = paymentMethodSummary.reduce((max, p) => parseFloat(p.pct) > parseFloat(max.pct) ? p : max, { name: 'N/A', amount: 0, pct: '0' });
    const avgBasket = sumTxCount > 0 ? sumNet / sumTxCount : 0;

    return `ULASAN EKSEKUTIF OMZET & PENJUALAN:
- Total akumulasi penjualan bersih sebesar ${formatRupiah(sumNet)} dari total ${sumTxCount} transaksi kasir terproses.
- Rata-rata nilai transaksi per pelanggan (Average Basket Size) adalah ${formatRupiah(avgBasket)}.
- Pembagian tipe layanan didominasi oleh Dine In sebesar ${dineInPct}% (${formatRupiah(dineInGross)}), disusul Take Away / Delivery sebesar ${takeAwayPct}% (${formatRupiah(takeAwayGross)}).
- Metode pembayaran favorit pelanggan saat ini adalah ${topPayment.name} dengan kontribusi sebesar ${topPayment.pct}% dari total omzet.
- Rekomendasi Manajemen: Tingkatkan promo bundel menu pada jam sibuk dan optimalkan area makan Dine In untuk memaksimalkan kepuasan pelanggan.`;
  };



  // DAILY SALES CALCULATIONS & FILTERS
  const handleApplyDailyDatePreset = (presetKey) => {
    setDailyDatePreset(presetKey);
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    if (presetKey === 'today') {
      setDailyStartDate(todayStr);
      setDailyEndDate(todayStr);
    } else if (presetKey === '7days') {
      const past = new Date();
      past.setDate(today.getDate() - 7);
      setDailyStartDate(past.toISOString().split('T')[0]);
      setDailyEndDate(todayStr);
    } else if (presetKey === 'month') {
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      setDailyStartDate(firstDay.toISOString().split('T')[0]);
      setDailyEndDate(todayStr);
    } else {
      setDailyStartDate('');
      setDailyEndDate('');
    }
  };

  const handleToggleDailyOutlet = (idVal) => {
    if (idVal === 'ALL') {
      setDailySelectedOutletIds(['ALL']);
    } else {
      let updated = dailySelectedOutletIds.filter(id => id !== 'ALL');
      if (updated.includes(idVal)) {
        updated = updated.filter(id => id !== idVal);
      } else {
        updated.push(idVal);
      }
      if (updated.length === 0) updated = ['ALL'];
      setDailySelectedOutletIds(updated);
    }
  };

  const handleToggleDailyColumn = (colKey) => {
    setDailyVisibleColumns(prev => ({ ...prev, [colKey]: !prev[colKey] }));
  };

  const filteredDailyTxs = transactions.filter(t => {
    if (dailyStartDate && t.date < dailyStartDate) return false;
    if (dailyEndDate && t.date > dailyEndDate) return false;
    if (!dailySelectedOutletIds.includes('ALL') && !dailySelectedOutletIds.includes(t.outlet_id)) return false;
    if (selectedBranch && t.outlet_id !== selectedBranch) return false;
    if (t.status === 'Void') return false;
    return true;
  });

  // Group transactions by date
  const dailyOmzetMap = {};
  filteredDailyTxs.forEach(t => {
    const d = t.date;
    if (!dailyOmzetMap[d]) {
      dailyOmzetMap[d] = {
        date: d,
        gross: 0,
        discount: 0,
        net: 0,
        dineIn: 0,
        takeAway: 0,
        cash: 0,
        qris: 0,
        transfer: 0,
        ewallet: 0
      };
    }

    const netVal = (t.amount || 0) - (t.discount || 0);
    dailyOmzetMap[d].gross += (t.amount || 0);
    dailyOmzetMap[d].discount += (t.discount || 0);
    dailyOmzetMap[d].net += netVal;

    // Dine In vs Take Away
    const noteLower = (t.notes || '').toLowerCase();
    if (noteLower.includes('take') || noteLower.includes('bungkus') || noteLower.includes('delivery')) {
      dailyOmzetMap[d].takeAway += netVal;
    } else {
      dailyOmzetMap[d].dineIn += netVal;
    }

    // Payment Methods
    const pmLower = (t.payment_method || '').toLowerCase();
    if (pmLower.includes('cash') || pmLower.includes('tunai')) {
      dailyOmzetMap[d].cash += netVal;
    } else if (pmLower.includes('qris')) {
      dailyOmzetMap[d].qris += netVal;
    } else if (pmLower.includes('transfer')) {
      dailyOmzetMap[d].transfer += netVal;
    } else {
      dailyOmzetMap[d].ewallet += netVal;
    }
  });

  const dailyRows = Object.values(dailyOmzetMap).sort((a, b) => b.date.localeCompare(a.date));

  const totalDailyNet = dailyRows.reduce((acc, r) => acc + r.net, 0);
  const totalDailyDineIn = dailyRows.reduce((acc, r) => acc + r.dineIn, 0);
  const totalDailyTakeAway = dailyRows.reduce((acc, r) => acc + r.takeAway, 0);
  const totalDailyCash = dailyRows.reduce((acc, r) => acc + r.cash, 0);
  const totalDailyQris = dailyRows.reduce((acc, r) => acc + r.qris, 0);
  const totalDailyTransfer = dailyRows.reduce((acc, r) => acc + r.transfer, 0);
  const totalDailyEwallet = dailyRows.reduce((acc, r) => acc + r.ewallet, 0);

  // Helper function to build daily summary table data matching Luna POS layout
  const getSalesSummaryByDayData = () => {
    const txs = filteredDailyTxs;
    const map = {};

    txs.forEach(t => {
      const d = t.date || new Date().toISOString().split('T')[0];
      if (!map[d]) {
        map[d] = {
          date: d,
          formattedDate: formatToDMY(d),
          totalSales: 0,
          discount: 0,
          serviceCharge: 0,
          tax: 0,
          adjustment: 0,
          total: 0
        };
      }
      const gross = Number(t.amount || t.total_amount || t.grand_total || 0);
      const disc = Number(t.discount || t.discount_amount || 0);
      const sc = Number(t.service_charge || t.serviceCharge || 0);
      const tax = Number(t.tax || t.tax_amount || 0);
      const adj = Number(t.adjustment || 0);

      map[d].totalSales += gross;
      map[d].discount += disc;
      map[d].serviceCharge += sc;
      map[d].tax += tax;
      map[d].adjustment += adj;
      map[d].total += (gross - disc + sc + tax + adj);
    });

    const sortedDates = Object.keys(map).sort();
    return sortedDates.map(d => map[d]);
  };

  // Daily Download Excel (CSV)
  const handleDownloadDailyExcel = () => {
    const data = getSalesSummaryByDayData();
    const outletStr = getOutletNameStrForExport(dailySelectedOutletIds, outlets, selectedBranch);
    const filename = buildExportFilename('ringkasan_penjualan_harian', outletStr, dailyStartDate, dailyEndDate, 'csv');

    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += `Ringkasan Penjualan Harian - Outlet: ${outletStr}\n`;
    csvContent += `Nama Outlet,${outletStr}\n`;
    csvContent += `Periode,${dailyStartDate ? formatToDMY(dailyStartDate) : '01/07/2026'} - ${dailyEndDate ? formatToDMY(dailyEndDate) : '31/07/2026'}\n\n`;
    csvContent += "Tanggal,Total Sales,Discount,Service Charge,Tax,Adjustment,Total\n";

    data.forEach(row => {
      csvContent += `"${row.formattedDate}",${row.totalSales},${row.discount},${row.serviceCharge},${row.tax},${row.adjustment},${row.total}\n`;
    });

    const totalSalesSum = data.reduce((s, r) => s + r.totalSales, 0);
    const discountSum = data.reduce((s, r) => s + r.discount, 0);
    const serviceChargeSum = data.reduce((s, r) => s + r.serviceCharge, 0);
    const taxSum = data.reduce((s, r) => s + r.tax, 0);
    const adjustmentSum = data.reduce((s, r) => s + r.adjustment, 0);
    const grandTotal = data.reduce((s, r) => s + r.total, 0);

    csvContent += `Total,${totalSalesSum},${discountSum},${serviceChargeSum},${taxSum},${adjustmentSum},${grandTotal}\n`;

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Daily Download PDF (Print View)
  const handleDownloadDailyPDF = () => {
    const data = getSalesSummaryByDayData();
    const outletStr = getOutletNameStrForExport(dailySelectedOutletIds, outlets, selectedBranch);
    const dateRangeStr = `${dailyStartDate ? formatToDMY(dailyStartDate) : '01/07/2026'} - ${dailyEndDate ? formatToDMY(dailyEndDate) : '31/07/2026'}`;
    const pdfFilename = buildExportFilename('ringkasan_penjualan_harian', outletStr, dailyStartDate, dailyEndDate, 'pdf');

    const totalSalesSum = data.reduce((s, r) => s + r.totalSales, 0);
    const discountSum = data.reduce((s, r) => s + r.discount, 0);
    const serviceChargeSum = data.reduce((s, r) => s + r.serviceCharge, 0);
    const taxSum = data.reduce((s, r) => s + r.tax, 0);
    const adjustmentSum = data.reduce((s, r) => s + r.adjustment, 0);
    const grandTotal = data.reduce((s, r) => s + r.total, 0);

    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>${pdfFilename}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 40px; color: ${T.cardBg}; }
            h1 { text-align: center; color: #0284c7; font-size: 26px; margin-bottom: 6px; font-weight: bold; }
            .subtitle { text-align: center; color: ${T.border}; font-size: 15px; font-weight: bold; margin-bottom: 28px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 13px; }
            th { border-bottom: 2px solid #0284c7; padding: 10px 8px; text-align: right; background: ${T.txtPrimary}; font-weight: bold; }
            th:first-child { text-align: left; }
            td { border-bottom: 1px solid #e2e8f0; padding: 10px 8px; text-align: right; }
            td:first-child { text-align: left; }
            .total-row { font-weight: bold; border-top: 2px solid #0284c7; background: #f1f5f9; font-size: 14px; }
          </style>
        </head>
        <body>
          <h1>Ringkasan Penjualan Harian</h1>
          <div class="subtitle">Outlet: ${outletStr} | Periode: ${dateRangeStr}</div>
          <table>
            <thead>
              <tr>
                <th>Tanggal</th>
                <th>Total Sales</th>
                <th>Discount</th>
                <th>Service Charge</th>
                <th>Tax</th>
                <th>Adjustment</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              ${data.map(r => `
                <tr>
                  <td>${r.formattedDate}</td>
                  <td>${formatRupiahDecimals(r.totalSales)}</td>
                  <td>${formatRupiahDecimals(r.discount)}</td>
                  <td>${formatRupiahDecimals(r.serviceCharge)}</td>
                  <td>${formatRupiahDecimals(r.tax)}</td>
                  <td>${formatRupiahDecimals(r.adjustment)}</td>
                  <td>${formatRupiahDecimals(r.total)}</td>
                </tr>
              `).join('')}
              <tr class="total-row">
                <td>Total</td>
                <td>${formatRupiahDecimals(totalSalesSum)}</td>
                <td>${formatRupiahDecimals(discountSum)}</td>
                <td>${formatRupiahDecimals(serviceChargeSum)}</td>
                <td>${formatRupiahDecimals(taxSum)}</td>
                <td>${formatRupiahDecimals(adjustmentSum)}</td>
                <td>${formatRupiahDecimals(grandTotal)}</td>
              </tr>
            </tbody>
          </table>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 500);
  };

  // CUSTOMER SALES CALCULATIONS & FILTERS
  const handleApplyCustDatePreset = (presetKey) => {
    setCustDatePreset(presetKey);
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    if (presetKey === 'today') {
      setCustStartDate(todayStr);
      setCustEndDate(todayStr);
    } else if (presetKey === '7days') {
      const past = new Date();
      past.setDate(today.getDate() - 7);
      setCustStartDate(past.toISOString().split('T')[0]);
      setCustEndDate(todayStr);
    } else if (presetKey === 'month') {
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      setCustStartDate(firstDay.toISOString().split('T')[0]);
      setCustEndDate(todayStr);
    } else {
      setCustStartDate('');
      setCustEndDate('');
    }
  };

  const handleToggleCustOutlet = (idVal) => {
    if (idVal === 'ALL') {
      setCustSelectedOutletIds(['ALL']);
    } else {
      let updated = custSelectedOutletIds.filter(id => id !== 'ALL');
      if (updated.includes(idVal)) {
        updated = updated.filter(id => id !== idVal);
      } else {
        updated.push(idVal);
      }
      if (updated.length === 0) updated = ['ALL'];
      setCustSelectedOutletIds(updated);
    }
  };

  const handleToggleCustColumn = (colKey) => {
    setCustVisibleColumns(prev => ({ ...prev, [colKey]: !prev[colKey] }));
  };

  // Filtered transactions for customer metrics
  const filteredCustTxs = transactions.filter(t => {
    if (custStartDate && t.date < custStartDate) return false;
    if (custEndDate && t.date > custEndDate) return false;
    if (!custSelectedOutletIds.includes('ALL') && !custSelectedOutletIds.includes(t.outlet_id)) return false;
    if (selectedBranch && t.outlet_id !== selectedBranch) return false;
    if (t.status === 'Void') return false;
    return true;
  });

  // Aggregate spending by customer
  const customerStatsMap = {};
  filteredCustTxs.forEach(t => {
    const cid = t.customer_id;
    if (!cid) return; // Ignore walk-in / unknown customers without ID
    if (!customerStatsMap[cid]) {
      customerStatsMap[cid] = {
        id: cid,
        txCount: 0,
        totalSpend: 0
      };
    }
    const netVal = (t.amount || 0) - (t.discount || 0);
    customerStatsMap[cid].txCount += 1;
    customerStatsMap[cid].totalSpend += netVal;
  });

  // Map back to masterData.customers to include their code, name, phone, and calculate correct membership tier based on actual total spend
  const customerRows = customers.map(c => {
    const stats = customerStatsMap[c.id] || { txCount: 0, totalSpend: 0 };
    const finalSpend = stats.totalSpend;
    
    // Tier logic matching CustomerManagement.jsx
    let tierLabel = 'New Customer';
    let badgeColor = T.info;
    let tierIcon = '';
    if (finalSpend > 5000000) {
      tierLabel = 'Customer VIP';
      badgeColor = T.accentGold;
      tierIcon = '';
    } else if (finalSpend >= 1000000) {
      tierLabel = 'Customer Loyal';
      badgeColor = T.success;
      tierIcon = '';
    }

    return {
      id: c.id,
      code: c.code || `MBR-${c.id.toString().padStart(3, '0')}`,
      name: c.name,
      phone: c.phone || '-',
      tier: tierLabel,
      tierIcon,
      badgeColor,
      txCount: stats.txCount,
      avgSpend: stats.txCount > 0 ? finalSpend / stats.txCount : 0,
      totalSpend: finalSpend
    };
  }).sort((a, b) => b.totalSpend - a.totalSpend);

  const totalCustCount = customerRows.length;
  const totalCustTxCount = customerRows.reduce((acc, r) => acc + r.txCount, 0);
  const totalCustSpend = customerRows.reduce((acc, r) => acc + r.totalSpend, 0);

  // Customer Download Excel (CSV)
  const handleDownloadCustExcel = () => {
    if (customerRows.length === 0) {
      alert('Tidak ada data penjualan per pelanggan untuk di-export');
      return;
    }
    const outletStr = getOutletNameStrForExport(custSelectedOutletIds, outlets, selectedBranch);
    const filename = buildExportFilename('penjualan_per_pelanggan', outletStr, custStartDate, custEndDate, 'csv');

    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += `Laporan Penjualan Per Pelanggan - Outlet: ${outletStr}\n`;
    csvContent += `Nama Outlet,${outletStr}\n\n`;
    csvContent += "Kode Membership,Nama Pelanggan,No WhatsApp,Tier Membership,Jumlah Transaksi,Rata-rata Belanja (Rp),Total Belanja (Rp)\n";

    customerRows.forEach(r => {
      csvContent += `"${r.code}","${r.name}","${r.phone}","${r.tier}",${r.txCount},${r.avgSpend},${r.totalSpend}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Customer Download PDF (Print View)
  const handleDownloadCustPDF = () => {
    if (customerRows.length === 0) {
      alert('Tidak ada data penjualan per pelanggan untuk di-export PDF');
      return;
    }
    const outletStr = getOutletNameStrForExport(custSelectedOutletIds, outlets, selectedBranch);
    const pdfFilename = buildExportFilename('penjualan_per_pelanggan', outletStr, custStartDate, custEndDate, 'pdf');

    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>${pdfFilename}</title>
          <style>
            body { font-family: sans-serif; padding: 20px; color: ${T.cardBg}; }
            h2 { color: ${T.cardBg2}; margin-bottom: 4px; }
            p { font-size: 14px; color: ${T.txtMuted}; margin-top: 0; }
            table { width: 100%; border-collapse: collapse; margin-top: 16px; }
            th, td { border: 1px solid ${T.txtPrimary}; padding: 10px; text-align: left; font-size: 12px; }
            th { background-color: #f1f5f9; text-transform: uppercase; font-size: 11px; }
            .text-right { text-align: right; }
            .font-bold { font-weight: bold; }
          </style>
        </head>
        <body>
          <h2>Laporan Rekapan Penjualan per Pelanggan</h2>
          <p>Outlet: ${outletStr} | Tanggal Cetak: ${new Date().toLocaleDateString('id-ID')}</p>
          <table>
            <thead>
              <tr>
                <th>Kode Membership</th>
                <th>Nama Pelanggan</th>
                <th>No WhatsApp</th>
                <th>Tier Membership</th>
                <th class="text-right">Jumlah Transaksi</th>
                <th class="text-right">Rata-rata Belanja</th>
                <th class="text-right">Total Akumulasi Belanja</th>
              </tr>
            </thead>
            <tbody>
              ${customerRows.map(r => `
                <tr>
                  <td><b>${r.code}</b></td>
                  <td>${r.name}</td>
                  <td>${r.phone}</td>
                  <td>${r.tierIcon} ${r.tier}</td>
                  <td class="text-right">${r.txCount} kali</td>
                  <td class="text-right">${formatRupiah(r.avgSpend)}</td>
                  <td class="text-right font-bold" style="color: #059669;">${formatRupiah(r.totalSpend)}</td>
                </tr>
              `).join('')}
              <tr style="background-color: ${T.txtPrimary}; font-weight: bold;">
                <td colspan="4">TOTAL KESELURUHAN</td>
                <td class="text-right">${totalCustTxCount} kali</td>
                <td class="text-right">-</td>
                <td class="text-right" style="color: #059669;">${formatRupiah(totalCustSpend)}</td>
              </tr>
            </tbody>
          </table>
          <script>window.print();</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // HOURLY SALES CALCULATIONS & FILTERS
  const handleApplyHourDatePreset = (presetKey) => {
    setHourDatePreset(presetKey);
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    if (presetKey === 'today') {
      setHourStartDate(todayStr);
      setHourEndDate(todayStr);
    } else if (presetKey === '7days') {
      const past = new Date();
      past.setDate(today.getDate() - 7);
      setHourStartDate(past.toISOString().split('T')[0]);
      setHourEndDate(todayStr);
    } else if (presetKey === 'month') {
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      setHourStartDate(firstDay.toISOString().split('T')[0]);
      setHourEndDate(todayStr);
    } else {
      setHourStartDate('');
      setHourEndDate('');
    }
  };

  const handleToggleHourOutlet = (idVal) => {
    if (idVal === 'ALL') {
      setHourSelectedOutletIds(['ALL']);
    } else {
      let updated = hourSelectedOutletIds.filter(id => id !== 'ALL');
      if (updated.includes(idVal)) {
        updated = updated.filter(id => id !== idVal);
      } else {
        updated.push(idVal);
      }
      if (updated.length === 0) updated = ['ALL'];
      setHourSelectedOutletIds(updated);
    }
  };

  const handleToggleHourColumn = (colKey) => {
    setHourVisibleColumns(prev => ({ ...prev, [colKey]: !prev[colKey] }));
  };

  // Filtered transactions for hourly analysis
  const filteredHourTxs = transactions.filter(t => {
    if (hourStartDate && t.date < hourStartDate) return false;
    if (hourEndDate && t.date > hourEndDate) return false;
    if (!hourSelectedOutletIds.includes('ALL') && !hourSelectedOutletIds.includes(t.outlet_id)) return false;
    if (selectedBranch && t.outlet_id !== selectedBranch) return false;
    if (t.status === 'Void') return false;
    return true;
  });

  // Calculate 24-hour intervals
  const hourlyBuckets = Array.from({ length: 24 }, (_, i) => {
    const startHour = i.toString().padStart(2, '0');
    const endHour = (i + 1).toString().padStart(2, '0');
    return {
      hourRange: `${startHour}:00 - ${endHour}:00`,
      txCount: 0,
      net: 0,
      index: i
    };
  });

  filteredHourTxs.forEach(t => {
    // Expected time format: "HH:MM" or "HH:MM:SS"
    if (!t.time) return;
    const hourPart = parseInt(t.time.split(':')[0], 10);
    if (hourPart >= 0 && hourPart < 24) {
      const netVal = (t.amount || 0) - (t.discount || 0);
      hourlyBuckets[hourPart].txCount += 1;
      hourlyBuckets[hourPart].net += netVal;
    }
  });

  const totalHourNet = hourlyBuckets.reduce((acc, b) => acc + b.net, 0);
  const totalHourTxCount = hourlyBuckets.reduce((acc, b) => acc + b.txCount, 0);

  // Hourly Download Excel (CSV)
  const handleDownloadHourExcel = () => {
    if (filteredHourTxs.length === 0) {
      alert('Tidak ada data penjualan per jam untuk di-export');
      return;
    }
    const outletStr = getOutletNameStrForExport(hourSelectedOutletIds, outlets, selectedBranch);
    const filename = buildExportFilename('penjualan_per_jam', outletStr, hourStartDate, hourEndDate, 'csv');

    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += `Laporan Penjualan Per Jam - Outlet: ${outletStr}\n`;
    csvContent += `Nama Outlet,${outletStr}\n\n`;
    csvContent += "Rentang Jam,Jumlah Transaksi,Total Omzet Net (Rp),Kontribusi (%)\n";

    hourlyBuckets.forEach(b => {
      const pct = totalHourNet > 0 ? ((b.net / totalHourNet) * 100).toFixed(1) : '0.0';
      csvContent += `"${b.hourRange}",${b.txCount},${b.net},${pct}%\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Hourly Download PDF (Print View)
  const handleDownloadHourPDF = () => {
    if (filteredHourTxs.length === 0) {
      alert('Tidak ada data penjualan per jam untuk di-export PDF');
      return;
    }
    const outletStr = getOutletNameStrForExport(hourSelectedOutletIds, outlets, selectedBranch);
    const pdfFilename = buildExportFilename('penjualan_per_jam', outletStr, hourStartDate, hourEndDate, 'pdf');

    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>${pdfFilename}</title>
          <style>
            body { font-family: sans-serif; padding: 20px; color: ${T.cardBg}; }
            h2 { color: ${T.cardBg2}; margin-bottom: 4px; }
            p { font-size: 14px; color: ${T.txtMuted}; margin-top: 0; }
            table { width: 100%; border-collapse: collapse; margin-top: 16px; }
            th, td { border: 1px solid ${T.txtPrimary}; padding: 10px; text-align: left; font-size: 12px; }
            th { background-color: #f1f5f9; text-transform: uppercase; font-size: 11px; }
            .text-right { text-align: right; }
            .font-bold { font-weight: bold; }
          </style>
        </head>
        <body>
          <h2>Laporan Rekapan Penjualan per Jam (Peak Hour Analysis)</h2>
          <p>Outlet: ${outletStr} | Tanggal Cetak: ${new Date().toLocaleDateString('id-ID')}</p>
          <table>
            <thead>
              <tr>
                <th>Rentang Jam</th>
                <th class="text-right">Jumlah Transaksi</th>
                <th class="text-right">Total Omzet Net (Rupiah)</th>
                <th class="text-right">Kontribusi (%)</th>
              </tr>
            </thead>
            <tbody>
              ${hourlyBuckets.map(b => {
                const pct = totalHourNet > 0 ? ((b.net / totalHourNet) * 100).toFixed(1) : '0.0';
                return `
                  <tr>
                    <td><b>${b.hourRange}</b></td>
                    <td class="text-right">${b.txCount} kali</td>
                    <td class="text-right font-bold" style="color: #059669;">${formatRupiah(b.net)}</td>
                    <td class="text-right"><b>${pct}%</b></td>
                  </tr>
                `;
              }).join('')}
              <tr style="background-color: ${T.txtPrimary}; font-weight: bold;">
                <td>TOTAL KESELURUHAN</td>
                <td class="text-right">${totalHourTxCount} kali</td>
                <td class="text-right" style="color: #059669;">${formatRupiah(totalHourNet)}</td>
                <td class="text-right">100%</td>
              </tr>
            </tbody>
          </table>
          <script>window.print();</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // RECEIPTS SALES CALCULATIONS & FILTERS
  const handleApplyRcptDatePreset = (presetKey) => {
    setRcptDatePreset(presetKey);
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    if (presetKey === 'today') {
      setRcptStartDate(todayStr);
      setRcptEndDate(todayStr);
    } else if (presetKey === '7days') {
      const past = new Date();
      past.setDate(today.getDate() - 7);
      setRcptStartDate(past.toISOString().split('T')[0]);
      setRcptEndDate(todayStr);
    } else if (presetKey === 'month') {
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      setRcptStartDate(firstDay.toISOString().split('T')[0]);
      setRcptEndDate(todayStr);
    } else {
      setRcptStartDate('');
      setRcptEndDate('');
    }
  };

  const handleToggleRcptOutlet = (idVal) => {
    if (idVal === 'ALL') {
      setRcptSelectedOutletIds(['ALL']);
    } else {
      let updated = rcptSelectedOutletIds.filter(id => id !== 'ALL');
      if (updated.includes(idVal)) {
        updated = updated.filter(id => id !== idVal);
      } else {
        updated.push(idVal);
      }
      if (updated.length === 0) updated = ['ALL'];
      setRcptSelectedOutletIds(updated);
    }
  };

  const handleToggleRcptColumn = (colKey) => {
    setRcptVisibleColumns(prev => ({ ...prev, [colKey]: !prev[colKey] }));
  };

  // Filtered transactions for receipts (status !== 'Void')
  const filteredRcptTxs = transactions.filter(t => {
    if (t.status === 'Void') return false;
    if (rcptStartDate && t.date < rcptStartDate) return false;
    if (rcptEndDate && t.date > rcptEndDate) return false;
    if (!rcptSelectedOutletIds.includes('ALL') && !rcptSelectedOutletIds.includes(t.outlet_id)) return false;
    if (selectedBranch && t.outlet_id !== selectedBranch) return false;
    return true;
  });

  // Receipts specific metrics
  const totalRcptCount = filteredRcptTxs.length;
  const rcptDineInTxs = filteredRcptTxs.filter(t => (t.notes || '').toLowerCase().includes('dine in'));
  const rcptDineInCount = rcptDineInTxs.length;
  const rcptTakeAwayCount = totalRcptCount - rcptDineInCount;

  const totalRcptGross = filteredRcptTxs.reduce((acc, t) => acc + (t.amount || 0), 0);
  const totalRcptDiscount = filteredRcptTxs.reduce((acc, t) => acc + (t.discount || 0), 0);
  const totalRcptNet = totalRcptGross - totalRcptDiscount;
  const avgRcptSpend = totalRcptCount > 0 ? totalRcptNet / totalRcptCount : 0;

  // Helper for Service Type Sales Summary Data (Dine In vs Take Away)
  const getServiceTypeSalesSummaryData = () => {
    const activeOutlets = outlets || [];
    const filteredOutlets = rcptSelectedOutletIds.includes('ALL') 
      ? activeOutlets 
      : activeOutlets.filter(o => rcptSelectedOutletIds.includes(o.id));

    const salesTx = masterData?.salesTransactions || masterData?.transactions || [];

    const filteredTxs = salesTx.filter(t => {
      if (rcptStartDate && t.date < rcptStartDate) return false;
      if (rcptEndDate && t.date > rcptEndDate) return false;
      if (!rcptSelectedOutletIds.includes('ALL') && !rcptSelectedOutletIds.includes(t.outlet_id)) return false;
      if (selectedBranch && t.outlet_id !== selectedBranch) return false;
      if (t.status === 'Void') return false;
      return true;
    });

    let dineInCount = 0, dineInQty = 0, dineInGross = 0, dineInDisc = 0;
    let takeAwayCount = 0, takeAwayQty = 0, takeAwayGross = 0, takeAwayDisc = 0;

    const dineInOutletMap = {};
    const takeAwayOutletMap = {};

    filteredTxs.forEach(t => {
      const isTakeAway = (t.type || t.service_type || t.notes || '').toLowerCase().includes('take') ||
                         (t.notes || '').toLowerCase().includes('bungkus') ||
                         (t.notes || '').toLowerCase().includes('delivery') ||
                         (t.notes || '').toLowerCase().includes('ojol') ||
                         (t.notes || '').toLowerCase().includes('online');

      const gross = Number(t.amount || t.total_amount || t.grand_total || 0);
      const disc = Number(t.discount || t.discount_amount || 0);
      const qty = (t.items && Array.isArray(t.items)) 
        ? t.items.reduce((s, i) => s + Number(i.qty || 1), 0)
        : Number(t.qty || t.quantity || 1);
      const otlId = t.outlet_id;

      if (isTakeAway) {
        takeAwayCount += 1;
        takeAwayQty += qty;
        takeAwayGross += gross;
        takeAwayDisc += disc;
        if (!takeAwayOutletMap[otlId]) takeAwayOutletMap[otlId] = { receiptCount: 0, totalQty: 0, gross: 0, disc: 0, net: 0 };
        takeAwayOutletMap[otlId].receiptCount += 1;
        takeAwayOutletMap[otlId].totalQty += qty;
        takeAwayOutletMap[otlId].gross += gross;
        takeAwayOutletMap[otlId].disc += disc;
        takeAwayOutletMap[otlId].net += (gross - disc);
      } else {
        dineInCount += 1;
        dineInQty += qty;
        dineInGross += gross;
        dineInDisc += disc;
        if (!dineInOutletMap[otlId]) dineInOutletMap[otlId] = { receiptCount: 0, totalQty: 0, gross: 0, disc: 0, net: 0 };
        dineInOutletMap[otlId].receiptCount += 1;
        dineInOutletMap[otlId].totalQty += qty;
        dineInOutletMap[otlId].gross += gross;
        dineInOutletMap[otlId].disc += disc;
        dineInOutletMap[otlId].net += (gross - disc);
      }
    });

    const dineInNet = dineInGross - dineInDisc;
    const takeAwayNet = takeAwayGross - takeAwayDisc;

    const serviceTypeBuckets = [
      {
        id: 'dine_in',
        name: 'Dine In (Makan di Tempat / Normal)',
        icon: '',
        receiptCount: dineInCount,
        totalQty: dineInQty,
        grossSales: dineInGross,
        discount: dineInDisc,
        netSales: dineInNet,
        color: T.info,
        outletBreakdown: filteredOutlets.map(otl => {
          const m = dineInOutletMap[otl.id] || { receiptCount: 0, totalQty: 0, gross: 0, disc: 0, net: 0 };
          return { name: otl.name, ...m };
        })
      },
      {
        id: 'take_away',
        name: 'Take Away (Bawa Pulang & Online Delivery)',
        icon: '',
        receiptCount: takeAwayCount,
        totalQty: takeAwayQty,
        grossSales: takeAwayGross,
        discount: takeAwayDisc,
        netSales: takeAwayNet,
        color: T.accentGold,
        outletBreakdown: filteredOutlets.map(otl => {
          const m = takeAwayOutletMap[otl.id] || { receiptCount: 0, totalQty: 0, gross: 0, disc: 0, net: 0 };
          return { name: otl.name, ...m };
        })
      }
    ];

    const totalReceipts = serviceTypeBuckets.reduce((s, b) => s + b.receiptCount, 0);
    const totalQty = serviceTypeBuckets.reduce((s, b) => s + b.totalQty, 0);
    const totalGross = serviceTypeBuckets.reduce((s, b) => s + b.grossSales, 0);
    const totalDiscount = serviceTypeBuckets.reduce((s, b) => s + b.discount, 0);
    const totalNet = serviceTypeBuckets.reduce((s, b) => s + b.netSales, 0);

    return {
      activeOutlets: filteredOutlets,
      serviceTypeBuckets,
      totalReceipts,
      totalQty,
      totalGross,
      totalDiscount,
      totalNet
    };
  };

  // Receipts / Service Type Download Excel (CSV)
  const handleDownloadRcptExcel = () => {
    const data = getServiceTypeSalesSummaryData();
    const outletStr = getOutletNameStrForExport(rcptSelectedOutletIds, outlets, selectedBranch);
    const filename = buildExportFilename('penjualan_by_layanan', outletStr, rcptStartDate, rcptEndDate, 'csv');

    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += `Laporan Penjualan By Layanan (Dine In vs Take Away) - Outlet: ${outletStr}\n`;
    csvContent += `Nama Outlet,${outletStr}\n\n`;
    csvContent += "Tipe Layanan,Jumlah Struk / Transaksi,Kuantitas Item Terjual (Qty),Rata-rata Qty per Struk,Penjualan Kotor (Gross),Potongan Diskon,Penjualan Bersih (Net),Rata-rata Nilai Struk (APC),Kontribusi Omzet (%)\n";

    data.serviceTypeBuckets.forEach(b => {
      const avgQty = b.receiptCount > 0 ? (b.totalQty / b.receiptCount).toFixed(1) : '0';
      const avgSpend = b.receiptCount > 0 ? Math.round(b.netSales / b.receiptCount) : 0;
      const pct = data.totalNet > 0 ? ((b.netSales / data.totalNet) * 100).toFixed(1) : '0.0';
      csvContent += `"${b.name}",${b.receiptCount},${b.totalQty},${avgQty},${b.grossSales},${b.discount},${b.netSales},${avgSpend},${pct}%\n`;
    });

    csvContent += `"TOTAL KESELURUHAN",${data.totalReceipts},${data.totalQty},${data.totalReceipts > 0 ? (data.totalQty / data.totalReceipts).toFixed(1) : 0},${data.totalGross},${data.totalDiscount},${data.totalNet},${data.totalReceipts > 0 ? Math.round(data.totalNet / data.totalReceipts) : 0},100%\n`;

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Receipts / Service Type Download PDF (Print View)
  const handleDownloadRcptPDF = () => {
    const data = getServiceTypeSalesSummaryData();
    const outletStr = getOutletNameStrForExport(rcptSelectedOutletIds, outlets, selectedBranch);
    const pdfFilename = buildExportFilename('penjualan_by_layanan', outletStr, rcptStartDate, rcptEndDate, 'pdf');

    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>${pdfFilename}</title>
          <style>
            body { font-family: sans-serif; padding: 24px; color: ${T.cardBg}; }
            h2 { color: ${T.cardBg2}; margin-bottom: 4px; border-bottom: 2px solid #0284c7; padding-bottom: 8px; }
            p { font-size: 13px; color: ${T.txtMuted}; margin-top: 0; }
            table { width: 100%; border-collapse: collapse; margin-top: 16px; }
            th, td { border: 1px solid ${T.txtPrimary}; padding: 10px; text-align: left; font-size: 12px; }
            th { background-color: #f1f5f9; text-transform: uppercase; font-size: 11px; }
            .text-right { text-align: right; }
            .text-center { text-align: center; }
            .font-bold { font-weight: bold; }
          </style>
        </head>
        <body>
          <h2>Laporan Penjualan By Layanan (Dine In & Take Away)</h2>
          <p>Outlet: ${outletStr} | Tanggal Cetak: ${new Date().toLocaleDateString('id-ID')}</p>
          <p>Total Struk: ${data.totalReceipts.toLocaleString('id-ID')} | Total Qty Terjual: ${data.totalQty.toLocaleString('id-ID')} Porsi | Total Omzet Bersih: ${formatRupiah(data.totalNet)}</p>
          <table>
            <thead>
              <tr>
                <th>Tipe Layanan</th>
                <th class="text-right">Jumlah Struk</th>
                <th class="text-center">Kuantitas Terjual (Qty)</th>
                <th class="text-right">Penjualan Kotor</th>
                <th class="text-right">Diskon</th>
                <th class="text-right">Penjualan Bersih</th>
                <th class="text-right">Rata-rata / Struk (APC)</th>
                <th class="text-right">Kontribusi (%)</th>
              </tr>
            </thead>
            <tbody>
              ${data.serviceTypeBuckets.map(b => {
                const avgSpend = b.receiptCount > 0 ? b.netSales / b.receiptCount : 0;
                const pct = data.totalNet > 0 ? ((b.netSales / data.totalNet) * 100).toFixed(1) : '0.0';
                return `
                  <tr>
                    <td><b>${b.name}</b></td>
                    <td class="text-right">${b.receiptCount.toLocaleString('id-ID')} struk</td>
                    <td class="text-center">x${b.totalQty.toLocaleString('id-ID')} porsi</td>
                    <td class="text-right">${formatRupiah(b.grossSales)}</td>
                    <td class="text-right" style="color: #e11d48;">${formatRupiah(b.discount)}</td>
                    <td class="text-right font-bold" style="color: #059669;">${formatRupiah(b.netSales)}</td>
                    <td class="text-right">${formatRupiah(avgSpend)}</td>
                    <td class="text-right font-bold">${pct}%</td>
                  </tr>
                `;
              }).join('')}
              <tr style="background-color: ${T.txtPrimary}; font-weight: bold;">
                <td>TOTAL KESELURUHAN</td>
                <td class="text-right">${data.totalReceipts.toLocaleString('id-ID')} struk</td>
                <td class="text-center">x${data.totalQty.toLocaleString('id-ID')} porsi</td>
                <td class="text-right">${formatRupiah(data.totalGross)}</td>
                <td class="text-right" style="color: #e11d48;">${formatRupiah(data.totalDiscount)}</td>
                <td class="text-right font-bold" style="color: #059669;">${formatRupiah(data.totalNet)}</td>
                <td class="text-right">${data.totalReceipts > 0 ? formatRupiah(data.totalNet / data.totalReceipts) : 0}</td>
                <td class="text-right">100%</td>
              </tr>
            </tbody>
          </table>
          <script>window.print();</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };


  // -------------------------------------------------------------
  // MONTHLY COMPARISON / MoM GROWTH LOGIC (SUB-TAB 9)
  // -------------------------------------------------------------

  const handleToggleMomOutlet = (idVal) => {
    if (idVal === 'ALL') {
      setMomSelectedOutletIds(['ALL']);
    } else {
      let updated = momSelectedOutletIds.filter(id => id !== 'ALL');
      if (updated.includes(idVal)) {
        updated = updated.filter(id => id !== idVal);
      } else {
        updated.push(idVal);
      }
      if (updated.length === 0) updated = ['ALL'];
      setMomSelectedOutletIds(updated);
    }
  };

  const handleToggleMomColumn = (colKey) => {
    setMomVisibleColumns(prev => ({ ...prev, [colKey]: !prev[colKey] }));
  };

  // Generate MoM Comparison Data per Outlet across Months
  const generateMonthlyComparisonData = () => {
    const activeOutlets = outlets || [];
    const salesTx = masterData?.salesTransactions || masterData?.transactions || [];

    if (salesTx.length === 0) {
      return [];
    }

    const monthlyMap = {}; // { 'YYYY-MM': { monthLabel, outlets: { outletId: { txCount, grossSales, discount, netSales } } } }

    salesTx.forEach(t => {
      if (t.status === 'Void') return;
      const d = t.date;
      if (!d) return;
      
      let monthKey = '';
      if (d.includes('-')) {
        const parts = d.split('-');
        if (parts.length >= 2) monthKey = `${parts[0]}-${parts[1]}`;
      } else if (d.includes('/')) {
        const parts = d.split('/');
        if (parts.length === 3) monthKey = `${parts[2]}-${parts[1].padStart(2, '0')}`;
      }

      if (!monthKey) return;

      const otlId = Number(t.outlet_id || 1);
      const gross = Number(t.amount || t.total_amount || t.grand_total || 0);
      const disc = Number(t.discount || t.discount_amount || 0);
      const net = gross - disc;

      if (!monthlyMap[monthKey]) {
        const parts = monthKey.split('-');
        const year = parts[0];
        const monthIdx = parseInt(parts[1], 10) - 1;
        const monthName = monthNamesIndo[monthIdx] || parts[1];
        const monthLabel = `${monthName.charAt(0).toUpperCase() + monthName.slice(1)} ${year}`;

        monthlyMap[monthKey] = {
          monthKey,
          monthLabel,
          outlets: {}
        };
      }

      if (!monthlyMap[monthKey].outlets[otlId]) {
        monthlyMap[monthKey].outlets[otlId] = {
          txCount: 0,
          grossSales: 0,
          discount: 0,
          netSales: 0
        };
      }

      monthlyMap[monthKey].outlets[otlId].txCount += 1;
      monthlyMap[monthKey].outlets[otlId].grossSales += gross;
      monthlyMap[monthKey].outlets[otlId].discount += disc;
      monthlyMap[monthKey].outlets[otlId].netSales += net;
    });

    const sortedMonthKeys = Object.keys(monthlyMap).sort();
    const list = [];

    sortedMonthKeys.forEach((mKey, idx) => {
      const monthData = monthlyMap[mKey];
      const prevMonthKey = idx > 0 ? sortedMonthKeys[idx - 1] : null;
      const prevMonthData = prevMonthKey ? monthlyMap[prevMonthKey] : null;

      activeOutlets.forEach(outlet => {
        const currentStats = monthData.outlets[outlet.id] || { txCount: 0, grossSales: 0, discount: 0, netSales: 0 };
        const prevStats = prevMonthData ? (prevMonthData.outlets[outlet.id] || { netSales: 0 }) : { netSales: 0 };

        let growth = 0;
        if (prevStats.netSales > 0) {
          growth = ((currentStats.netSales - prevStats.netSales) / prevStats.netSales) * 100;
        }

        list.push({
          monthKey: mKey,
          monthLabel: monthData.monthLabel,
          outletId: outlet.id,
          outletName: outlet.name,
          txCount: currentStats.txCount,
          grossSales: currentStats.grossSales,
          discount: currentStats.discount,
          netSales: currentStats.netSales,
          avgSpend: currentStats.txCount > 0 ? currentStats.netSales / currentStats.txCount : 0,
          growth: growth
        });
      });
    });

    return list;
  };

  const momComparisonData = generateMonthlyComparisonData();

  // Aggregate data by month for overall chart/table totals
  const aggregateMomByMonth = () => {
    const uniqueMonths = Array.from(new Set(momComparisonData.map(r => r.monthLabel)));
    const result = [];

    uniqueMonths.forEach((month, idx) => {
      const records = momComparisonData.filter(r => r.monthLabel === month);
      const gross = records.reduce((acc, r) => acc + r.grossSales, 0);
      const disc = records.reduce((acc, r) => acc + r.discount, 0);
      const net = gross - disc;
      const tx = records.reduce((acc, r) => acc + r.txCount, 0);

      let growth = 0;
      if (idx > 0) {
        const prevNet = result[idx - 1].netSales;
        growth = prevNet > 0 ? ((net - prevNet) / prevNet) * 100 : 0;
      }

      result.push({
        monthLabel: month,
        txCount: tx,
        grossSales: gross,
        discount: disc,
        netSales: net,
        avgSpend: tx > 0 ? net / tx : 0,
        growth
      });
    });

    return result;
  };

  const aggregatedMomData = aggregateMomByMonth();

  // Format dataset for Recharts BarChart
  const getChartDataset = () => {
    const uniqueMonths = Array.from(new Set(momComparisonData.map(r => r.monthLabel)));
    return uniqueMonths.map(m => {
      const dataObj = { name: m };
      const records = momComparisonData.filter(r => r.monthLabel === m);
      records.forEach(r => {
        dataObj[r.outletName] = Math.round(r.netSales);
      });
      return dataObj;
    });
  };

  const chartDataset = getChartDataset();

  // Export Excel for MoM Comparison
  const handleDownloadMomExcel = () => {
    if (momComparisonData.length === 0) {
      alert('Tidak ada data perbandingan bulanan untuk di-export');
      return;
    }
    const outletStr = getOutletNameStrForExport(momSelectedOutletIds, outlets, selectedBranch);
    const filename = buildExportFilename('perbandingan_bulanan_mom', outletStr, '2026-05', '2026-07', 'csv');

    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += `Laporan Perbandingan Bulanan (MoM) - Outlet: ${outletStr}\n`;
    csvContent += `Nama Outlet,${outletStr}\n\n`;
    csvContent += "Bulan,Nama Outlet,Jumlah Transaksi,Penjualan Kotor (Rp),Total Diskon (Rp),Penjualan Bersih (Rp),Rata-rata per Tiket (Rp),Pertumbuhan MoM (%)\n";

    momComparisonData.forEach(r => {
      csvContent += `"${r.monthLabel}","${r.outletName}",${r.txCount},${Math.round(r.grossSales)},${Math.round(r.discount)},${Math.round(r.netSales)},${Math.round(r.avgSpend)},${r.growth.toFixed(2)}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export PDF for MoM Comparison
  const handleDownloadMomPDF = () => {
    if (momComparisonData.length === 0) {
      alert('Tidak ada data perbandingan bulanan untuk di-export PDF');
      return;
    }
    const outletStr = getOutletNameStrForExport(momSelectedOutletIds, outlets, selectedBranch);
    const pdfFilename = buildExportFilename('perbandingan_bulanan_mom', outletStr, '2026-05', '2026-07', 'pdf');

    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>${pdfFilename}</title>
          <style>
            body { font-family: sans-serif; padding: 20px; color: ${T.cardBg}; }
            h2 { color: ${T.cardBg2}; margin-bottom: 4px; }
            p { font-size: 14px; color: ${T.txtMuted}; margin-top: 0; }
            table { width: 100%; border-collapse: collapse; margin-top: 16px; }
            th, td { border: 1px solid ${T.txtPrimary}; padding: 10px; text-align: left; font-size: 12px; }
            th { background-color: #f1f5f9; text-transform: uppercase; font-size: 11px; }
            .text-right { text-align: right; }
            .font-bold { font-weight: bold; }
          </style>
        </head>
        <body>
          <h2>Laporan Perbandingan Penjualan Bulanan (Month-over-Month Growth)</h2>
          <p>Outlet: ${outletStr} | Tanggal Cetak: ${new Date().toLocaleDateString('id-ID')}</p>
          <table>
            <thead>
              <tr>
                <th>Bulan</th>
                <th>Nama Outlet</th>
                <th class="text-right">Jumlah Transaksi</th>
                <th class="text-right">Penjualan Kotor</th>
                <th class="text-right">Total Diskon</th>
                <th class="text-right">Penjualan Bersih</th>
                <th class="text-right">Rata-rata per Tiket</th>
                <th class="text-right">Pertumbuhan MoM</th>
              </tr>
            </thead>
            <tbody>
              ${momComparisonData.map(r => {
                const growthText = r.monthLabel === 'Mei 2026' ? '-' : `${r.growth >= 0 ? '▲' : '▼'} ${r.growth.toFixed(1)}%`;
                const growthColor = r.growth >= 0 ? '#059669' : '#dc2626';
                return `
                  <tr>
                    <td><b>${r.monthLabel}</b></td>
                    <td>${r.outletName}</td>
                    <td class="text-right">${r.txCount}</td>
                    <td class="text-right">${formatRupiah(r.grossSales)}</td>
                    <td class="text-right" style="color: #e11d48;">${formatRupiah(r.discount)}</td>
                    <td class="text-right font-bold" style="color: #059669;">${formatRupiah(r.netSales)}</td>
                    <td class="text-right">${formatRupiah(r.avgSpend)}</td>
                    <td class="text-right font-bold" style="color: ${growthColor};">${growthText}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
          <script>window.print();</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };


  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', background: T.pageBg, color: T.txtPrimary, transition: 'background 0.25s ease, color 0.25s ease' }} className="animate-fade-in">
      {/* STICKY TOP HEADER CONTAINER (Batas Atas Scroll: Sinkronisasi Otomatis Mobile APK Kasir) */}
      <div style={{
        position: 'sticky',
        top: '-20px',
        zIndex: 100,
        background: T.pageBg,
        paddingTop: '20px',
        paddingBottom: '8px',
        marginTop: '-20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px',
        boxShadow: '0 4px 12px -2px rgba(0, 0, 0, 0.25)'
      }}>
        {/* PAGE TITLE HEADER */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ fontSize: '0.96rem', fontWeight: '900', color: T.txtPrimary, letterSpacing: '-0.01em', margin: 0 }}>
              Laporan Transaksi & Analytics Penjualan POS
            </h2>
            <p style={{ color: T.txtSecondary, fontSize: '0.72rem', marginTop: '2px', margin: 0 }}>
              Pusat analisis & rekapan omzet transaksi kasir restoran (Terhubung Realtime dengan Mobile APK Kasir)
            </p>
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button
              onClick={handleManualSync}
              className="btn-secondary"
              disabled={isSyncing}
              style={{
                padding: '6px 12px',
                fontSize: '0.72rem',
                color: T.info,
                borderColor: 'rgba(56, 189, 248, 0.3)',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer'
              }}
            >
              <RefreshCw size={14} className={isSyncing ? "animate-spin" : ""} />
              <span>{isSyncing ? "Menyinkronkan..." : "Sync Mobile APK"}</span>
            </button>
          </div>
        </div>

        {/* 9 Sub-Tabs Navigation Grid (3 Baris x 3 Sub-Tab) */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
          {analysisTabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '5px 8px',
                  borderRadius: '8px',
                  border: '1px solid',
                  borderColor: isActive ? T.accentGold : T.border,
                  background: isActive ? T.navActiveBg : T.cardBg,
                  color: isActive ? T.navActiveTxt : T.txtSecondary,
                  fontWeight: isActive ? '800' : '600',
                  fontSize: '0.72rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}
              >
                <Icon size={14} color={isActive ? `${T.info}` : T.txtMuted} />
                <span>{tab.name}</span>
              </button>
            );
          })}
        </div>

        {/* GLOBAL AUTO SYNC STATUS BANNER BAR */}
        <div className="glass-card animate-fade-in" style={{
          padding: '12px 18px',
          background: 'linear-gradient(90deg, rgba(15, 23, 42, 0.9) 0%, rgba(30, 41, 59, 0.9) 100%)',
          border: '1px solid rgba(52, 211, 153, 0.3)',
          borderRadius: '12px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Zap size={18} color={ T.success } />
            <span style={{ fontSize: '0.85rem', fontWeight: '800', color: T.txtPrimary }}>
              Sinkronisasi Otomatis Mobile APK Kasir
            </span>
            <span style={{ fontSize: '0.75rem', color: T.txtSecondary }}>
              | Terakhir disinkronkan: <b style={{ color: T.info }}>{lastSyncTime}</b> | Terhubung: <b style={{ color: T.success }}>{outlets.length} Outlet POS</b>
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '0.75rem', color: T.success, background: 'rgba(52, 211, 153, 0.12)', padding: '3px 8px', borderRadius: '6px', border: '1px solid rgba(52, 211, 153, 0.2)', fontWeight: '700' }}>
              Realtime Streaming Active
            </span>
            <button
              onClick={() => setIsAutoSyncEnabled(!isAutoSyncEnabled)}
              style={{
                background: isAutoSyncEnabled ? 'rgba(52, 211, 153, 0.15)' : 'rgba(148, 163, 184, 0.15)',
                border: '1px solid',
                borderColor: isAutoSyncEnabled ? 'rgba(52, 211, 153, 0.4)' : T.border,
                color: isAutoSyncEnabled ? `${T.success}` : T.txtSecondary,
                padding: '4px 10px',
                borderRadius: '6px',
                fontSize: '0.75rem',
                fontWeight: '700',
                cursor: 'pointer'
              }}
            >
              Auto Sync: {isAutoSyncEnabled ? 'ON' : 'OFF'}
            </button>
          </div>
        </div>
      </div>

      {/* CONTENT AREA: 1. OMZET PENJUALAN (GRAFIK GARIS & TABEL PERBANDINGAN SEBELUM/SETELAH DISKON) */}
      {activeTab === 'omzet' && (() => {
        const omzetData = getOmzetOutletComparisonData();
        const { activeOutlets, chartData, rows, displayPeriod, grandTotalNet, grandTotalGross, grandTotalDiscount, totalTxCount, dailyAvgNet, topOutletName } = omzetData;
        const colors = [`${T.info}`, `${T.success}`, `${T.accentGold}`, '#ec4899', '#f43f5e', '#a78bfa'];

        return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* TOP BAR WITH MODE SWITCHER, MONTH FILTER & EXPORT BUTTONS */}
          <div className="glass-card" style={{ padding: '14px 18px', background: T.cardBg, border: `1px solid ${T.border}`, borderRadius: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px', position: 'relative', zIndex: 1000 }}>
            
            {/* Left: Mode Switcher & Date/Month Pickers */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              {/* Period Mode Switcher */}
              <div style={{ display: 'flex', gap: '3px', background: T.cardBg2, padding: '3px', borderRadius: '8px', border: `1px solid ${T.borderStrong}` }}>
                <button
                  type="button"
                  onClick={() => setOmzetViewPeriodMode('daily')}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    border: 'none',
                    background: omzetViewPeriodMode === 'daily' ? T.primary : 'transparent',
                    color: omzetViewPeriodMode === 'daily' ? T.txtInverse : T.txtSecondary,
                    cursor: 'pointer',
                    fontSize: '0.74rem',
                    fontWeight: '800',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <Calendar size={13} />
                  <span>Rincian Harian</span>
                </button>

                <button
                  type="button"
                  onClick={() => setOmzetViewPeriodMode('monthly')}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    border: 'none',
                    background: omzetViewPeriodMode === 'monthly' ? T.primary : 'transparent',
                    color: omzetViewPeriodMode === 'monthly' ? T.txtInverse : T.txtSecondary,
                    cursor: 'pointer',
                    fontSize: '0.74rem',
                    fontWeight: '800',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <TrendingUp size={13} />
                  <span>Rekap 12 Bulan</span>
                </button>
              </div>

              {omzetViewPeriodMode === 'daily' ? (
                <>
                  {/* Quick Month Dropdown */}
                  <select
                    value={selectedOmzetMonth}
                    onChange={e => {
                      const ym = e.target.value;
                      setSelectedOmzetMonth(ym);
                      const [yStr, mStr] = ym.split('-');
                      const y = parseInt(yStr);
                      const m = parseInt(mStr);
                      const lastDay = new Date(y, m, 0).getDate();
                      setOmzetStartDate(`${ym}-01`);
                      setOmzetEndDate(`${ym}-${String(lastDay).padStart(2, '0')}`);
                      setOmzetDatePreset('month');
                    }}
                    style={{
                      padding: '7px 12px',
                      background: T.inputBg,
                      border: `1px solid ${T.border}`,
                      color: T.txtPrimary,
                      borderRadius: '8px',
                      fontSize: '0.74rem',
                      fontWeight: '800',
                      outline: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    <option value="2026-08">🗓️ Bulan Agustus 2026</option>
                    <option value="2026-07">🗓️ Bulan Juli 2026</option>
                    <option value="2026-06">🗓️ Bulan Juni 2026</option>
                    <option value="2026-05">🗓️ Bulan Mei 2026</option>
                    <option value="2026-04">🗓️ Bulan April 2026</option>
                    <option value="2026-03">🗓️ Bulan Maret 2026</option>
                    <option value="2026-02">🗓️ Bulan Februari 2026</option>
                    <option value="2026-01">🗓️ Bulan Januari 2026</option>
                  </select>

                  {/* Double Calendar Picker */}
                  <DoubleCalendarPicker themeMode={themeMode}
                    startDate={omzetStartDate}
                    endDate={omzetEndDate}
                    datePreset={omzetDatePreset}
                    setStartDate={setOmzetStartDate}
                    setEndDate={setOmzetEndDate}
                    setDatePreset={setOmzetDatePreset}
                    showPopover={omzetShowCalendarPopover}
                    setShowPopover={setOmzetShowCalendarPopover}
                    outlets={outlets}
                    selectedOutletIds={omzetSelectedOutletIds}
                    onToggleOutlet={handleToggleOmzetOutlet}
                    onToggleAllOutlets={() => handleToggleOmzetOutlet('ALL')}
                    showOutletDropdown={omzetShowOutletDropdown}
                    setShowOutletDropdown={setOmzetShowOutletDropdown}
                    selectedBranch={selectedBranch}
                  />
                </>
              ) : (
                <>
                  {/* Year Selector (2024 s/d 2040) */}
                  <select
                    value={selectedOmzetYear}
                    onChange={e => setSelectedOmzetYear(e.target.value)}
                    style={{
                      padding: '7px 12px',
                      background: T.inputBg,
                      border: `1px solid ${T.border}`,
                      color: T.txtPrimary,
                      borderRadius: '8px',
                      fontSize: '0.74rem',
                      fontWeight: '800',
                      outline: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    {Array.from({ length: 2040 - 2024 + 1 }, (_, i) => 2040 - i).map(yr => (
                      <option key={yr} value={yr.toString()}>
                        📅 Tahun {yr} (Jan - Des)
                      </option>
                    ))}
                  </select>

                  {/* Multi-Outlet Dropdown Trigger in Monthly Mode */}
                  <div style={{ position: 'relative' }}>
                    <button
                      type="button"
                      onClick={() => setOmzetShowOutletDropdown(!omzetShowOutletDropdown)}
                      style={{
                        padding: '7px 12px',
                        background: T.cardBg2,
                        border: `1px solid ${T.border}`,
                        color: T.txtPrimary,
                        borderRadius: '8px',
                        fontSize: '0.74rem',
                        fontWeight: '800',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      <Store size={13} color={T.info} />
                      <span>{omzetSelectedOutletIds.includes('ALL') ? 'Semua Outlet' : `${omzetSelectedOutletIds.length} Outlet`}</span>
                      <ChevronDown size={12} />
                    </button>

                    {omzetShowOutletDropdown && (
                      <div style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        marginTop: '4px',
                        background: T.cardBg2,
                        border: `1px solid ${T.borderStrong}`,
                        borderRadius: '8px',
                        padding: '8px',
                        zIndex: 100,
                        minWidth: '220px',
                        boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '4px'
                      }}>
                        <button
                          type="button"
                          onClick={() => handleToggleOmzetOutlet('ALL')}
                          style={{
                            background: omzetSelectedOutletIds.includes('ALL') ? T.primary : 'transparent',
                            color: omzetSelectedOutletIds.includes('ALL') ? T.txtInverse : T.txtPrimary,
                            border: 'none',
                            padding: '6px 8px',
                            borderRadius: '6px',
                            textAlign: 'left',
                            fontSize: '0.72rem',
                            fontWeight: '700',
                            cursor: 'pointer'
                          }}
                        >
                          ✓ Semua Outlet Cabang
                        </button>
                        {outlets.map(o => {
                          const isSel = omzetSelectedOutletIds.includes(o.id) || omzetSelectedOutletIds.includes(Number(o.id));
                          return (
                            <button
                              key={o.id}
                              type="button"
                              onClick={() => handleToggleOmzetOutlet(o.id)}
                              style={{
                                background: isSel ? T.infoBg : 'transparent',
                                color: isSel ? T.info : T.txtPrimary,
                                border: 'none',
                                padding: '6px 8px',
                                borderRadius: '6px',
                                textAlign: 'left',
                                fontSize: '0.72rem',
                                fontWeight: '700',
                                cursor: 'pointer'
                              }}
                            >
                              {isSel ? '✓ ' : '• '} {o.name}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Right: Export buttons */}
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <button 
                onClick={handleDownloadOmzetComparisonPDF} 
                className="btn-secondary" 
                style={{ padding: '7px 12px', fontSize: '0.76rem', color: T.danger, borderColor: 'rgba(251, 113, 133, 0.4)', background: 'rgba(251, 113, 133, 0.1)', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <Printer size={14} />
                <span>PDF</span>
              </button>

              <button 
                onClick={handleDownloadOmzetComparisonExcel} 
                className="btn-secondary" 
                style={{ padding: '7px 12px', fontSize: '0.76rem', color: T.success, borderColor: 'rgba(52, 211, 153, 0.4)', background: 'rgba(52, 211, 153, 0.1)', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <FileSpreadsheet size={14} />
                <span>Excel</span>
              </button>
            </div>
          </div>

          {/* 4 SUMMARY KPI CARDS FOR OMZET */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
            {/* Card 1: Total Net Omzet */}
            <div style={{ background: T.cardBg, border: `1px solid ${T.borderStrong}`, borderRadius: '14px', padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ fontSize: '0.68rem', fontWeight: '800', color: T.txtSecondary, textTransform: 'uppercase' }}>TOTAL OMZET BERSIH</span>
                <div style={{ fontSize: '1.3rem', fontWeight: '900', color: T.accentGold, marginTop: '2px' }}>{formatRupiah(grandTotalNet)}</div>
                <span style={{ fontSize: '0.66rem', color: T.success, fontWeight: '700' }}>Setelah Diskon: {formatRupiah(grandTotalDiscount)}</span>
              </div>
              <div style={{ padding: '8px', borderRadius: '10px', background: T.accentGoldBg, color: T.accentGold }}>
                <DollarSign size={18} />
              </div>
            </div>

            {/* Card 2: Total Transactions */}
            <div style={{ background: T.cardBg, border: `1px solid ${T.borderStrong}`, borderRadius: '14px', padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ fontSize: '0.68rem', fontWeight: '800', color: T.txtSecondary, textTransform: 'uppercase' }}>TRANSAKSI SELESAI</span>
                <div style={{ fontSize: '1.3rem', fontWeight: '900', color: T.info, marginTop: '2px' }}>{totalTxCount} Nota</div>
                <span style={{ fontSize: '0.66rem', color: T.info, fontWeight: '700' }}>Transaksi Sukses POS</span>
              </div>
              <div style={{ padding: '8px', borderRadius: '10px', background: T.infoBg, color: T.info }}>
                <Receipt size={18} />
              </div>
            </div>

            {/* Card 3: Daily Average */}
            <div style={{ background: T.cardBg, border: `1px solid ${T.borderStrong}`, borderRadius: '14px', padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ fontSize: '0.68rem', fontWeight: '800', color: T.txtSecondary, textTransform: 'uppercase' }}>RATA-RATA HARIAN</span>
                <div style={{ fontSize: '1.3rem', fontWeight: '900', color: T.success, marginTop: '2px' }}>{formatRupiah(dailyAvgNet)}</div>
                <span style={{ fontSize: '0.66rem', color: T.txtSecondary }}>Omzet per Hari Aktif</span>
              </div>
              <div style={{ padding: '8px', borderRadius: '10px', background: T.successBg, color: T.success }}>
                <TrendingUp size={18} />
              </div>
            </div>

            {/* Card 4: Top Outlet */}
            <div style={{ background: T.cardBg, border: `1px solid ${T.borderStrong}`, borderRadius: '14px', padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ fontSize: '0.68rem', fontWeight: '800', color: T.txtSecondary, textTransform: 'uppercase' }}>CABANG KONTRIBUTOR UTAMA</span>
                <div style={{ fontSize: '0.94rem', fontWeight: '900', color: T.primary, marginTop: '2px', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '160px' }}>
                  {topOutletName}
                </div>
                <span style={{ fontSize: '0.66rem', color: T.success, fontWeight: '700' }}>Top Performer Branch</span>
              </div>
              <div style={{ padding: '8px', borderRadius: '10px', background: T.primaryBtn, color: T.navActiveTxt }}>
                <Award size={18} />
              </div>
            </div>
          </div>

          {/* 1. GRAFIK GARIS TREN PERGERAKAN HARIAN ANTAR OUTLET */}
          {(() => {
            const { activeOutlets, chartData, displayPeriod } = getOmzetOutletComparisonData();
            const colors = [`${T.info}`, `${T.success}`, `${T.accentGold}`, `${T.info}`, '#f43f5e', '#a78bfa'];

            return (
              <div className="glass-card animate-fade-in" style={{ padding: '24px', background: T.cardBg2, border: `1px solid ${T.border}`, borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: '900', color: T.txtPrimary, margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <TrendingUp size={22} color={T.info} />
                      <span>Grafik Tren Pergerakan Omzet Harian Antar Outlet ({displayPeriod})</span>
                    </h3>
                    <p style={{ fontSize: '0.8rem', color: T.txtSecondary, marginTop: '4px', margin: 0 }}>
                      Grafik garis membandingkan tren kenaikan & penurunan omzet harian seluruh cabang restoran per hari
                    </p>
                  </div>

                  <span style={{ fontSize: '0.75rem', color: T.info, background: 'rgba(56, 189, 248, 0.15)', padding: '5px 12px', borderRadius: '8px', fontWeight: '800', border: '1px solid rgba(56, 189, 248, 0.3)' }}>
                    Realtime Line Chart Active
                  </span>
                </div>

                {/* RECHARTS LINE CHART CONTAINER */}
                <div style={{ background: T.cardBg, padding: '24px 16px 16px 8px', borderRadius: '14px', border: `1px solid ${T.border}` }}>
                  <ReResponsiveContainer width="100%" height={340}>
                    <ReLineChart data={chartData} margin={{ top: 15, right: 30, left: 10, bottom: 5 }}>
                      <ReCartesianGrid strokeDasharray="3 3" stroke={T.border} />
                      <ReXAxis dataKey="dayLabel" stroke={T.txtSecondary} fontSize={11} />
                      <ReYAxis stroke={T.txtSecondary} fontSize={11} tickFormatter={v => `Rp ${(v / 1000000).toFixed(1)}M`} />
                      <ReTooltip
                        contentStyle={{ background: T.cardBg2, borderColor: T.info, borderRadius: '10px', color: T.txtPrimary, fontSize: '0.82rem', boxShadow: '0 8px 24px rgba(0,0,0,0.5)' }}
                        formatter={(val, name) => [formatRupiah(val), name]}
                      />
                      <ReLegend wrapperStyle={{ paddingTop: '12px', fontSize: '0.8rem', fontWeight: '700', color: T.txtPrimary }} />
                      {activeOutlets.map((otl, idx) => (
                        <ReLine
                          key={otl.id}
                          type="monotone"
                          dataKey={otl.name}
                          stroke={colors[idx % colors.length]}
                          strokeWidth={3}
                          dot={{ r: 3 }}
                          activeDot={{ r: 7, strokeWidth: 2, stroke: T.txtPrimary }}
                        />
                      ))}
                    </ReLineChart>
                  </ReResponsiveContainer>
                </div>
              </div>
            );
          })()}

          {/* 2. TABEL PERBANDINGAN PENDAPATAN SETELAH DISKON ANTAR OUTLET */}
          <div className="glass-card animate-fade-in" style={{ padding: '24px', background: T.cardBg2, border: `1px solid ${T.border}`, borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: '900', color: T.txtPrimary, margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <DollarSign size={22} color={T.success} />
                  <span>Tabel Perbandingan Omzet Antar Outlet (Setelah Diskon)</span>
                </h3>
                <p style={{ fontSize: '0.8rem', color: T.txtSecondary, marginTop: '4px', margin: 0 }}>
                  Rincian omzet bersih (Setelah Diskon) tiap outlet per hari
                </p>
              </div>

              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <ColumnVisibilityDropdown themeMode={themeMode}
                  columns={[
                    { key: 'date', label: 'Tanggal' },
                    { key: 'net', label: 'Omzet (Setelah Diskon)' },
                    { key: 'totalNet', label: 'Total Akumulasi' }
                  ]}
                  visibleColumns={visibleColumns}
                  onToggleColumn={handleToggleColumn}
                />

                <button onClick={handleDownloadOmzetComparisonExcel} className="btn-secondary" style={{ padding: '6px 12px', fontSize: '0.78rem', color: T.success, borderColor: 'rgba(52, 211, 153, 0.4)', background: 'rgba(52, 211, 153, 0.1)', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <FileSpreadsheet size={14} />
                  <span>Download Excel</span>
                </button>

                <button onClick={handleDownloadOmzetComparisonPDF} className="btn-secondary" style={{ padding: '6px 12px', fontSize: '0.78rem', color: T.danger, borderColor: 'rgba(251, 113, 133, 0.4)', background: 'rgba(251, 113, 133, 0.1)', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Printer size={14} />
                  <span>Download PDF</span>
                </button>
              </div>
            </div>

            {/* MATRIX COMPARISON TABLE */}
            {(() => {
              const { activeOutlets, rows } = getOmzetOutletComparisonData();
              const grandTotalNetAll = rows.reduce((s, r) => s + r.totalNet, 0);

              const showDate = visibleColumns.date !== false;
              const showNet = visibleColumns.net !== false;
              const showTotalNet = visibleColumns.totalNet !== false;

              return (
                <div style={{ overflowX: 'auto', borderRadius: '10px', border: `1px solid ${T.border}` }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', tableLayout: 'auto' }}>
                    <thead>
                      <tr style={{ background: T.tableHeaderBg, borderBottom: `2px solid ${T.border}` }}>
                        {showDate && (
                          <th style={{ padding: '11px 14px', fontWeight: '700', fontSize: '0.75rem', color: T.txtSecondary, textAlign: 'left', letterSpacing: '0.05em', textTransform: 'uppercase', borderRight: `1px solid ${T.border}`, whiteSpace: 'nowrap', width: '120px' }}>
                            {omzetViewPeriodMode === 'monthly' ? 'Bulan / Periode' : 'Tanggal'}
                          </th>
                        )}
                        {activeOutlets.map(otl => (
                          <th key={otl.id} style={{ padding: '11px 14px', fontWeight: '700', fontSize: '0.75rem', color: T.info, textAlign: 'right', letterSpacing: '0.03em', textTransform: 'uppercase', borderRight: `1px solid ${T.border}`, whiteSpace: 'nowrap' }}>
                            {otl.name}
                          </th>
                        ))}
                        {showTotalNet && (
                          <th style={{ padding: '11px 14px', fontWeight: '700', fontSize: '0.75rem', color: T.success, textAlign: 'right', letterSpacing: '0.03em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                            Total
                          </th>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row, idx) => (
                        <tr key={idx} style={{ borderBottom: `1px solid ${T.border}`, background: idx % 2 === 0 ? T.cardBg : T.cardBg2 }}>
                          {showDate && (
                            <td style={{ padding: '9px 14px', fontWeight: '600', color: T.txtSecondary, borderRight: `1px solid ${T.border}`, textAlign: 'left', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                              {row.formattedDate}
                            </td>
                          )}
                          {activeOutlets.map(otl => {
                            const d = row.outlets[otl.id] || { net: 0 };
                            const isZero = d.net === 0;
                            return (
                              <td key={otl.id} style={{ padding: '9px 14px', textAlign: 'right', fontWeight: isZero ? '400' : '700', color: isZero ? T.txtMuted : T.txtPrimary, borderRight: `1px solid ${T.border}`, whiteSpace: 'nowrap' }}>
                                {showNet ? (isZero ? <span style={{ color: T.txtMuted, fontSize: '0.75rem' }}>—</span> : formatRupiah(d.net)) : '—'}
                              </td>
                            );
                          })}
                          {showTotalNet && (
                            <td style={{ padding: '9px 14px', textAlign: 'right', fontWeight: '800', color: T.success, whiteSpace: 'nowrap' }}>
                              {formatRupiah(row.totalNet)}
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr style={{ background: T.tableHeaderBg, borderTop: `2px solid ${T.border}` }}>
                        {showDate && (
                          <td style={{ padding: '11px 14px', fontWeight: '800', color: T.txtPrimary, borderRight: `1px solid ${T.border}`, fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            Total
                          </td>
                        )}
                        {activeOutlets.map(otl => {
                          const sumNet = rows.reduce((s, r) => s + (r.outlets[otl.id]?.net || 0), 0);
                          return (
                            <td key={otl.id} style={{ padding: '11px 14px', textAlign: 'right', fontWeight: '800', color: T.info, borderRight: `1px solid ${T.border}`, whiteSpace: 'nowrap' }}>
                              {formatRupiah(sumNet)}
                            </td>
                          );
                        })}
                        {showTotalNet && (
                          <td style={{ padding: '11px 14px', textAlign: 'right', fontWeight: '900', color: T.success, whiteSpace: 'nowrap', fontSize: '0.88rem' }}>
                            {formatRupiah(grandTotalNetAll)}
                          </td>
                        )}
                      </tr>
                    </tfoot>
                  </table>
                </div>
              );
            })()}
          </div>

        </div>
        );
      })()}


      {/* 2. PENJUALAN BY MENU (TOP 5 CARDS, GRAFIK GARIS & 2 TABEL RINCIAN PER MENU) */}
      {activeTab === 'categories' && (() => {
        const menuData = getDetailedMenuSalesData();
        const { activeOutlets, menuRows, top5PerOutlet, grandTotalNetAll, grandTotalGrossAll, grandTotalQtyAll, activeMenusCount, topMenuName, topCategoryName } = menuData;

        return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* TOP BAR WITH DATE RANGE FILTER (DOUBLE CALENDAR PICKER) & MENU FILTER */}
          <div className="glass-card" style={{ padding: '14px 18px', background: T.cardBg, border: `1px solid ${T.border}`, borderRadius: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px', position: 'relative', zIndex: 1000 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              {/* Quick Month Dropdown */}
              <select
                value={selectedOmzetMonth}
                onChange={e => {
                  const ym = e.target.value;
                  setSelectedOmzetMonth(ym);
                  const [yStr, mStr] = ym.split('-');
                  const y = parseInt(yStr);
                  const m = parseInt(mStr);
                  const lastDay = new Date(y, m, 0).getDate();
                  setCatStartDate(`${ym}-01`);
                  setCatEndDate(`${ym}-${String(lastDay).padStart(2, '0')}`);
                  setCatDatePreset('month');
                }}
                style={{
                  padding: '7px 12px',
                  background: T.inputBg,
                  border: `1px solid ${T.border}`,
                  color: T.txtPrimary,
                  borderRadius: '8px',
                  fontSize: '0.74rem',
                  fontWeight: '800',
                  outline: 'none',
                  cursor: 'pointer'
                }}
              >
                <option value="2026-08">🗓️ Bulan Agustus 2026</option>
                <option value="2026-07">🗓️ Bulan Juli 2026</option>
                <option value="2026-06">🗓️ Bulan Juni 2026</option>
                <option value="2026-05">🗓️ Bulan Mei 2026</option>
                <option value="2026-04">🗓️ Bulan April 2026</option>
                <option value="2026-03">🗓️ Bulan Maret 2026</option>
                <option value="2026-02">🗓️ Bulan Februari 2026</option>
                <option value="2026-01">🗓️ Bulan Januari 2026</option>
              </select>

              <DoubleCalendarPicker themeMode={themeMode}
                startDate={catStartDate}
                endDate={catEndDate}
                datePreset={catDatePreset}
                setStartDate={setCatStartDate}
                setEndDate={setCatEndDate}
                setDatePreset={setCatDatePreset}
                showPopover={catShowCalendarPopover}
                setShowPopover={setCatShowCalendarPopover}
                outlets={outlets}
                selectedOutletIds={catSelectedOutletIds}
                onToggleOutlet={handleToggleCatOutlet}
                onToggleAllOutlets={() => handleToggleCatOutlet('ALL')}
                showOutletDropdown={catShowOutletDropdown}
                setShowOutletDropdown={setCatShowOutletDropdown}
                selectedBranch={selectedBranch}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              {/* Active Period Indicator */}
              {(catStartDate || catEndDate) && (
                <span style={{ fontSize: '0.75rem', color: T.accentGold, background: `${T.accentGold}18`, padding: '4px 10px', borderRadius: '8px', border: `1px solid ${T.accentGold}40`, fontWeight: '700' }}>
                  {catStartDate || '∞'} → {catEndDate || '∞'}
                </span>
              )}
              {/* Active Outlet Indicator */}
              <span style={{ fontSize: '0.75rem', color: T.info, background: `${T.info}15`, padding: '4px 10px', borderRadius: '8px', border: `1px solid ${T.info}35`, fontWeight: '700' }}>
                {catSelectedOutletIds.includes('ALL') ? 'Semua Outlet' : `${catSelectedOutletIds.length} Outlet Dipilih`}
              </span>
              <span style={{ fontSize: '0.75rem', color: T.success, background: `${T.success}12`, padding: '4px 10px', borderRadius: '8px', border: `1px solid ${T.success}30`, fontWeight: '700' }}>
                Auto Sync Realtime POS
              </span>
            </div>
          </div>

          {/* 4 SUMMARY KPI CARDS FOR MENU SALES */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
            {/* Card 1: Total Qty Menu Terjual */}
            <div style={{ background: T.cardBg, border: `1px solid ${T.borderStrong}`, borderRadius: '14px', padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ fontSize: '0.68rem', fontWeight: '800', color: T.txtSecondary, textTransform: 'uppercase' }}>TOTAL PORSI TERJUAL</span>
                <div style={{ fontSize: '1.3rem', fontWeight: '900', color: T.accentGold, marginTop: '2px' }}>{grandTotalQtyAll.toLocaleString('id-ID')} Porsi</div>
                <span style={{ fontSize: '0.66rem', color: T.txtSecondary }}>Dari {activeMenusCount} Varian Menu</span>
              </div>
              <div style={{ padding: '8px', borderRadius: '10px', background: T.accentGoldBg, color: T.accentGold }}>
                <ShoppingBag size={18} />
              </div>
            </div>

            {/* Card 2: Total Net Omzet Menu */}
            <div style={{ background: T.cardBg, border: `1px solid ${T.borderStrong}`, borderRadius: '14px', padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ fontSize: '0.68rem', fontWeight: '800', color: T.txtSecondary, textTransform: 'uppercase' }}>TOTAL OMZET BERSIH MENU</span>
                <div style={{ fontSize: '1.3rem', fontWeight: '900', color: T.success, marginTop: '2px' }}>{formatRupiah(grandTotalNetAll)}</div>
                <span style={{ fontSize: '0.66rem', color: T.success, fontWeight: '700' }}>Setelah Diskon</span>
              </div>
              <div style={{ padding: '8px', borderRadius: '10px', background: T.successBg, color: T.success }}>
                <DollarSign size={18} />
              </div>
            </div>

            {/* Card 3: Top Best Seller Menu */}
            <div style={{ background: T.cardBg, border: `1px solid ${T.borderStrong}`, borderRadius: '14px', padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ fontSize: '0.68rem', fontWeight: '800', color: T.txtSecondary, textTransform: 'uppercase' }}>MENU PALING LARIS</span>
                <div style={{ fontSize: '0.94rem', fontWeight: '900', color: T.info, marginTop: '2px', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '160px' }}>
                  {topMenuName}
                </div>
                <span style={{ fontSize: '0.66rem', color: T.info, fontWeight: '700' }}>Top Volume Terjual</span>
              </div>
              <div style={{ padding: '8px', borderRadius: '10px', background: T.infoBg, color: T.info }}>
                <Award size={18} />
              </div>
            </div>

            {/* Card 4: Top Category */}
            <div style={{ background: T.cardBg, border: `1px solid ${T.borderStrong}`, borderRadius: '14px', padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ fontSize: '0.68rem', fontWeight: '800', color: T.txtSecondary, textTransform: 'uppercase' }}>KATEGORI TERFAVORIT</span>
                <div style={{ fontSize: '0.94rem', fontWeight: '900', color: T.primary, marginTop: '2px', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '160px' }}>
                  {topCategoryName}
                </div>
                <span style={{ fontSize: '0.66rem', color: T.success, fontWeight: '700' }}>Kontribusi Omzet Tertinggi</span>
              </div>
              <div style={{ padding: '8px', borderRadius: '10px', background: T.primaryBtn, color: T.navActiveTxt }}>
                <TrendingUp size={18} />
              </div>
            </div>
          </div>

          {/* SECTION 1: CARD 5 PENJUALAN TERTINGGI TIAP OUTLET */}
          <div className="glass-card animate-fade-in" style={{ padding: '24px', background: T.cardBg2, border: `1px solid ${T.border}`, borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: '900', color: T.txtPrimary, margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Award size={22} color={T.accentGold} />
                  <span>5 Penjualan Menu Tertinggi Tiap Outlet</span>
                </h3>
                <p style={{ fontSize: '0.8rem', color: T.txtSecondary, marginTop: '4px', margin: 0 }}>
                  Daftar 5 produk menu paling laris berdasarkan volume terjual (Qty) dan omzet di setiap cabang
                </p>
              </div>
              <span style={{ fontSize: '0.75rem', color: T.accentGold, background: `${T.accentGold}20`, padding: '5px 12px', borderRadius: '8px', fontWeight: '800', border: `1px solid ${T.accentGold}40` }}>
                Best Seller Per Outlet
              </span>
            </div>

            {/* TOP 5 OUTLET CARDS GRID */}
            {(() => {
              const { activeOutlets, top5PerOutlet } = getDetailedMenuSalesData();

              if (activeOutlets.length === 0) {
                return (
                  <div style={{ textAlign: 'center', padding: '32px', color: T.txtSecondary, fontSize: '0.9rem' }}>
                    Tidak ada data penjualan untuk outlet / periode yang dipilih.
                  </div>
                );
              }

              return (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
                  {activeOutlets.map((otl) => {
                    const topItems = top5PerOutlet[otl.id] || [];
                    const badgeColors = [T.accentGold, `${T.txtPrimary}`, '#b45309', T.info, `${T.info}`];

                    return (
                      <div key={otl.id} style={{ background: T.cardBg, borderRadius: '14px', border: `1px solid ${T.border}`, padding: '18px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: `1px solid ${T.border}`, paddingBottom: '10px' }}>
                          <span style={{ fontWeight: '800', fontSize: '0.92rem', color: T.txtPrimary, display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {otl.name}
                          </span>
                          <span style={{ fontSize: '0.72rem', color: T.info, background: `${T.info}15`, padding: '2px 8px', borderRadius: '6px', fontWeight: '700' }}>
                            Top 5 Menu
                          </span>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          {topItems.length === 0 ? (
                            <div style={{ color: T.txtMuted, fontSize: '0.82rem', textAlign: 'center', padding: '16px 0' }}>
                              Tidak ada data terjual di periode ini
                            </div>
                          ) : topItems.map((item, rIdx) => (
                            <div key={rIdx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: T.cardBg2, padding: '8px 12px', borderRadius: '10px', border: `1px solid ${T.border}` }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <span style={{ width: '22px', height: '22px', borderRadius: '50%', background: badgeColors[rIdx] || `${T.txtMuted}`, color: T.cardBg2, fontSize: '0.75rem', fontWeight: '900', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                  {rIdx + 1}
                                </span>
                                <div>
                                  <div style={{ fontSize: '0.83rem', fontWeight: '800', color: T.txtPrimary }}>{item.name}</div>
                                  <div style={{ fontSize: '0.72rem', color: T.txtSecondary }}>Terjual: <b style={{ color: T.accentGold }}>{item.qty} Porsi</b></div>
                                </div>
                              </div>
                              <div style={{ textAlign: 'right' }}>
                                <div style={{ fontSize: '0.82rem', fontWeight: '800', color: T.success }}>{formatRupiah(item.net)}</div>
                                <div style={{ fontSize: '0.7rem', color: T.txtMuted }}>Net Sales</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>






          {/* SECTION 4: TABEL 1 RINCIAN NOMINAL PENJUALAN BY MENU (PER NAMA MENU) */}
          <div className="glass-card animate-fade-in" style={{ padding: '24px', background: T.cardBg2, border: `1px solid ${T.border}`, borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: '900', color: T.txtPrimary, margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <DollarSign size={22} color={T.info} />
                  <span>1. Tabel Rincian Nominal Penjualan By Menu (Setelah Diskon)</span>
                </h3>
                <p style={{ fontSize: '0.8rem', color: T.txtSecondary, marginTop: '4px', margin: 0 }}>
                  Detail nominal omzet bersih (setelah diskon) per nama menu di setiap outlet cabang
                </p>
              </div>

              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <ColumnVisibilityDropdown themeMode={themeMode}
                  columns={[
                    { key: 'menuName', label: 'Nama Menu' },
                    { key: 'net', label: 'Omzet (Setelah Diskon)' },
                    { key: 'totalNet', label: 'Total Akumulasi' }
                  ]}
                  visibleColumns={menuNominalVisibleCols}
                  onToggleColumn={handleToggleMenuNominalCol}
                />

                <button 
                  onClick={handleDownloadMenuNominalPDF} 
                  className="btn-secondary" 
                  style={{ padding: '6px 12px', fontSize: '0.78rem', color: T.danger, borderColor: 'rgba(251, 113, 133, 0.4)', background: 'rgba(251, 113, 133, 0.1)', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <Printer size={14} />
                  <span>Download PDF</span>
                </button>

                <button 
                  onClick={handleDownloadMenuNominalExcel} 
                  className="btn-secondary" 
                  style={{ padding: '6px 12px', fontSize: '0.78rem', color: T.success, borderColor: 'rgba(52, 211, 153, 0.4)', background: 'rgba(52, 211, 153, 0.1)', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <FileSpreadsheet size={14} />
                  <span>Download Excel</span>
                </button>
              </div>
            </div>

            {/* MATRIX NOMINAL DETAILED MENU TABLE */}
            {(() => {
              const { activeOutlets, menuRows } = getDetailedMenuSalesData();
              const grandTotalNetAll = menuRows.reduce((s, r) => s + r.totalNet, 0);

              const showMenuName = menuNominalVisibleCols.menuName !== false;
              const showNet = menuNominalVisibleCols.net !== false;
              const showTotalNet = menuNominalVisibleCols.totalNet !== false;

              return (
                <div style={{ overflowX: 'auto', borderRadius: '10px', border: `1px solid ${T.border}` }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', tableLayout: 'auto' }}>
                    <thead>
                      <tr style={{ background: T.tableHeaderBg, borderBottom: `2px solid ${T.border}` }}>
                        {showMenuName && (
                          <th style={{ padding: '11px 14px', fontWeight: '700', fontSize: '0.75rem', color: T.txtSecondary, textAlign: 'left', letterSpacing: '0.05em', textTransform: 'uppercase', borderRight: `1px solid ${T.border}`, minWidth: '180px' }}>
                            Nama Menu
                          </th>
                        )}
                        {activeOutlets.map(otl => (
                          <th key={otl.id} style={{ padding: '11px 14px', fontWeight: '700', fontSize: '0.75rem', color: T.info, textAlign: 'right', letterSpacing: '0.03em', textTransform: 'uppercase', borderRight: `1px solid ${T.border}`, whiteSpace: 'nowrap' }}>
                            {otl.name}
                          </th>
                        ))}
                        {showTotalNet && (
                          <th style={{ padding: '11px 14px', fontWeight: '700', fontSize: '0.75rem', color: T.success, textAlign: 'right', letterSpacing: '0.03em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                            Total
                          </th>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {menuRows.map((row, idx) => (
                        <tr key={row.id} style={{ borderBottom: `1px solid ${T.border}`, background: idx % 2 === 0 ? T.cardBg : T.cardBg2 }}>
                          {showMenuName && (
                            <td style={{ padding: '9px 14px', fontWeight: '700', color: T.txtPrimary, borderRight: `1px solid ${T.border}` }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ opacity: 0.7 }}></span>
                                <span>{row.name}</span>
                              </div>
                            </td>
                          )}
                          {activeOutlets.map(otl => {
                            const d = row.outlets[otl.id] || { net: 0 };
                            const isZero = d.net === 0;
                            return (
                              <td key={otl.id} style={{ padding: '9px 14px', textAlign: 'right', fontWeight: isZero ? '400' : '700', color: isZero ? T.txtMuted : T.txtPrimary, borderRight: `1px solid ${T.border}`, whiteSpace: 'nowrap' }}>
                                {showNet ? (isZero ? <span style={{ color: T.txtMuted, fontSize: '0.75rem' }}>—</span> : formatRupiah(d.net)) : '—'}
                              </td>
                            );
                          })}
                          {showTotalNet && (
                            <td style={{ padding: '9px 14px', textAlign: 'right', fontWeight: '800', color: T.success, whiteSpace: 'nowrap' }}>
                              {formatRupiah(row.totalNet)}
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr style={{ background: T.tableHeaderBg, borderTop: `2px solid ${T.border}` }}>
                        {showMenuName && (
                          <td style={{ padding: '11px 14px', fontWeight: '800', color: T.txtPrimary, borderRight: `1px solid ${T.border}`, fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            Total
                          </td>
                        )}
                        {activeOutlets.map(otl => {
                          const sumNet = menuRows.reduce((s, r) => s + (r.outlets[otl.id]?.net || 0), 0);
                          return (
                            <td key={otl.id} style={{ padding: '11px 14px', textAlign: 'right', fontWeight: '800', color: T.info, borderRight: `1px solid ${T.border}`, whiteSpace: 'nowrap' }}>
                              {formatRupiah(sumNet)}
                            </td>
                          );
                        })}
                        {showTotalNet && (
                          <td style={{ padding: '11px 14px', textAlign: 'right', fontWeight: '900', color: T.success, whiteSpace: 'nowrap', fontSize: '0.88rem' }}>
                            {formatRupiah(grandTotalNetAll)}
                          </td>
                        )}
                      </tr>
                    </tfoot>
                  </table>
                </div>
              );
            })()}
          </div>

          {/* SECTION 4: TABEL 2 RINCIAN JUMLAH PENJUALAN (QTY PORSI/ITEM) BY MENU */}
          <div className="glass-card animate-fade-in" style={{ padding: '24px', background: T.cardBg2, border: `1px solid ${T.border}`, borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: '900', color: T.txtPrimary, margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <ShoppingBag size={22} color={T.accentGold} />
                  <span>2. Tabel Rincian Jumlah Penjualan (Qty Porsi/Item) By Menu</span>
                </h3>
                <p style={{ fontSize: '0.8rem', color: T.txtSecondary, marginTop: '4px', margin: 0 }}>
                  Detail per nama menu: jumlah porsi/unit item terjual di setiap outlet cabang
                </p>
              </div>

              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <ColumnVisibilityDropdown themeMode={themeMode}
                  columns={[
                    { key: 'menuName', label: 'Nama Menu' },
                    { key: 'qty', label: 'Jumlah Porsi / Qty' },
                    { key: 'totalQty', label: 'Total Akumulasi Qty' }
                  ]}
                  visibleColumns={menuQtyVisibleCols}
                  onToggleColumn={handleToggleMenuQtyCol}
                />

                <button 
                  onClick={handleDownloadMenuQtyPDF} 
                  className="btn-secondary" 
                  style={{ padding: '6px 12px', fontSize: '0.78rem', color: T.danger, borderColor: 'rgba(251, 113, 133, 0.4)', background: 'rgba(251, 113, 133, 0.1)', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <Printer size={14} />
                  <span>Download PDF</span>
                </button>

                <button 
                  onClick={handleDownloadMenuQtyExcel} 
                  className="btn-secondary" 
                  style={{ padding: '6px 12px', fontSize: '0.78rem', color: T.success, borderColor: 'rgba(52, 211, 153, 0.4)', background: 'rgba(52, 211, 153, 0.1)', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <FileSpreadsheet size={14} />
                  <span>Download Excel</span>
                </button>
              </div>
            </div>

            {/* MATRIX QTY DETAILED MENU TABLE */}
            {(() => {
              const { activeOutlets, menuRows } = getDetailedMenuSalesData();
              const grandTotalQtyAll = menuRows.reduce((s, r) => s + r.totalQty, 0);

              const showMenuName = menuQtyVisibleCols.menuName !== false;
              const showQty = menuQtyVisibleCols.qty !== false;
              const showTotalQty = menuQtyVisibleCols.totalQty !== false;

              return (
                <div style={{ overflowX: 'auto', border: `1px solid ${T.border}`, borderRadius: '12px' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                    <thead>
                      <tr style={{ background: T.cardBg, borderBottom: `2px solid ${T.border}`, color: T.txtPrimary, fontWeight: '800', fontSize: '0.8rem' }}>
                        {showMenuName && <th style={{ padding: '12px 14px', borderRight: `1px solid ${T.border}`, textAlign: 'left', minWidth: '200px' }}>Nama Menu</th>}
                        {showQty && activeOutlets.map(otl => (
                          <th key={otl.id} style={{ padding: '12px 10px', textAlign: 'right', borderRight: `1px solid ${T.border}`, color: T.accentGold }}>
                            {otl.name} (Qty)
                          </th>
                        ))}
                        {showTotalQty && (
                          <th style={{ padding: '12px 10px', textAlign: 'right', background: 'rgba(251, 191, 36, 0.1)', color: T.accentGold }}>
                            Total Akumulasi Qty Seluruh Outlet
                          </th>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {menuRows.map((row) => (
                        <tr key={row.id} style={{ borderBottom: `1px solid ${T.hoverBg}`, color: T.txtPrimary }}>
                          {showMenuName && (
                            <td style={{ padding: '12px 14px', fontWeight: '800', color: T.accentGold, borderRight: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span></span>
                              <span>{row.name}</span>
                            </td>
                          )}
                          {showQty && activeOutlets.map(otl => {
                            const d = row.outlets[otl.id] || { qty: 0 };
                            return (
                              <td key={otl.id} style={{ padding: '10px', textAlign: 'right', fontWeight: '700', color: T.txtPrimary, borderRight: `1px solid ${T.border}` }}>
                                {d.qty.toLocaleString('id-ID')} Item
                              </td>
                            );
                          })}
                          {showTotalQty && (
                            <td style={{ padding: '10px', textAlign: 'right', fontWeight: '900', color: T.accentGold, fontSize: '0.9rem' }}>
                              {row.totalQty.toLocaleString('id-ID')} Item
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                    {/* FOOTER TOTAL ROW */}
                    <tfoot>
                      <tr style={{ background: T.cardBg, borderTop: `2px solid ${T.accentGold}`, fontWeight: '900', color: T.txtPrimary, fontSize: '0.85rem' }}>
                        {showMenuName && <td style={{ padding: '14px', borderRight: `1px solid ${T.border}`, textAlign: 'left' }}>TOTAL AKUMULASI QTY BULANAN</td>}
                        {showQty && activeOutlets.map(otl => {
                          const sumQty = menuRows.reduce((s, r) => s + (r.outlets[otl.id]?.qty || 0), 0);
                          return (
                            <td key={otl.id} style={{ padding: '14px 10px', textAlign: 'right', color: T.accentGold, borderRight: `1px solid ${T.border}` }}>
                              {sumQty.toLocaleString('id-ID')} Item
                            </td>
                          );
                        })}
                        {showTotalQty && (
                          <td style={{ padding: '14px 10px', textAlign: 'right', color: T.accentGold, fontSize: '0.95rem' }}>
                            {grandTotalQtyAll.toLocaleString('id-ID')} Item
                          </td>
                        )}
                      </tr>
                    </tfoot>
                  </table>
                </div>
              );
            })()}
          </div>
        </div>
        );
      })()}

      {/* 3. RINGKASAN PENJUALAN EKSEKUTIF */}
      {activeTab === 'summary' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* FILTER & ACTION BAR SECTION */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', position: 'relative', zIndex: 1000 }}>
            <DoubleCalendarPicker themeMode={themeMode}
              startDate={sumStartDate}
              endDate={sumEndDate}
              datePreset={sumDatePreset}
              setStartDate={setSumStartDate}
              setEndDate={setSumEndDate}
              setDatePreset={setSumDatePreset}
              showPopover={sumShowCalendarPopover}
              setShowPopover={setSumShowCalendarPopover}
              outlets={outlets}
              selectedOutletIds={sumSelectedOutletIds}
              onToggleOutlet={handleToggleSumOutlet}
              onToggleAllOutlets={() => handleToggleSumOutlet('ALL')}
              showOutletDropdown={sumShowOutletDropdown}
              setShowOutletDropdown={setSumShowOutletDropdown}
              selectedBranch={selectedBranch}
            />

            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <button onClick={handleDownloadSummaryExcel} className="btn-secondary" style={{ padding: '8px 14px', fontSize: '0.82rem', color: T.success, borderColor: 'rgba(52, 211, 153, 0.4)', background: 'rgba(52, 211, 153, 0.1)', height: '40px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FileSpreadsheet size={16} />
                <span>Download Excel</span>
              </button>

              <button onClick={handleDownloadSummaryPDF} className="btn-secondary" style={{ padding: '8px 14px', fontSize: '0.82rem', color: T.danger, borderColor: 'rgba(251, 113, 133, 0.4)', background: 'rgba(251, 113, 133, 0.1)', height: '40px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Printer size={16} />
                <span>Download PDF</span>
              </button>
            </div>
          </div>

          {/* MAIN EXECUTIVE REPORT BOARD - MATCHING LUNA POS REPORT SCREENSHOT */}
          {(() => {
            const data = getExecutiveSummaryReportData();

            return (
              <div className="glass-card animate-fade-in" style={{ padding: '36px 32px', background: T.cardBg2, border: `1px solid ${T.border}`, borderRadius: '18px', display: 'flex', flexDirection: 'column', gap: '28px' }}>
                
                {/* CENTERED REPORT TITLE HEADER */}
                <div style={{ textAlign: 'center', borderBottom: `1px solid ${T.border}`, paddingBottom: '20px' }}>
                  <h1 style={{ fontSize: '2.2rem', fontWeight: '900', color: T.info, letterSpacing: '-0.02em', margin: 0 }}>
                    Ringkasan Penjualan
                  </h1>
                  <div style={{ fontSize: '1.05rem', fontWeight: '700', color: T.txtSecondary, marginTop: '6px' }}>
                    {data.start} - {data.end}
                  </div>
                  <div style={{ fontSize: '1.25rem', fontWeight: '900', color: T.txtPrimary, marginTop: '10px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    {data.outletNameStr}
                  </div>
                </div>

                {/* 1. FINANCIAL SUMMARY TABLE */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <h4 style={{ fontSize: '0.88rem', fontWeight: '800', color: T.txtSecondary, textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>
                    Financial Summary (Omzet & Diskon)
                  </h4>
                  <div style={{ border: `1px solid ${T.border}`, borderRadius: '12px', overflow: 'hidden', background: T.cardBg }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                      <tbody>
                        <tr style={{ borderBottom: `1px solid ${T.border}` }}>
                          <td style={{ padding: '12px 18px', color: T.txtPrimary, fontWeight: '600' }}>Total Sales (Omzet Kotor)</td>
                          <td style={{ padding: '12px 18px', textAlign: 'right', fontWeight: '800', color: T.txtPrimary }}>{formatRupiahDecimals(data.totalSales)}</td>
                        </tr>
                        <tr style={{ borderBottom: `1px solid ${T.border}` }}>
                          <td style={{ padding: '12px 18px', color: T.txtPrimary, fontWeight: '600' }}>Total Discount</td>
                          <td style={{ padding: '12px 18px', textAlign: 'right', fontWeight: '800', color: T.danger }}>({formatRupiahDecimals(data.totalDiscount)})</td>
                        </tr>
                        <tr style={{ borderBottom: `1px solid ${T.border}` }}>
                          <td style={{ padding: '12px 18px', color: T.txtPrimary, fontWeight: '600' }}>Total Service Charge</td>
                          <td style={{ padding: '12px 18px', textAlign: 'right', fontWeight: '700', color: T.txtSecondary }}>{formatRupiahDecimals(data.totalServiceCharge)}</td>
                        </tr>
                        <tr style={{ borderBottom: `1px solid ${T.border}` }}>
                          <td style={{ padding: '12px 18px', color: T.txtPrimary, fontWeight: '600' }}>Total Tax</td>
                          <td style={{ padding: '12px 18px', textAlign: 'right', fontWeight: '700', color: T.txtSecondary }}>{formatRupiahDecimals(data.totalTax)}</td>
                        </tr>
                        <tr style={{ borderBottom: `1px solid ${T.border}` }}>
                          <td style={{ padding: '12px 18px', color: T.txtPrimary, fontWeight: '600' }}>Total Adjustment</td>
                          <td style={{ padding: '12px 18px', textAlign: 'right', fontWeight: '700', color: T.txtSecondary }}>{formatRupiahDecimals(data.totalAdjustment)}</td>
                        </tr>
                        <tr style={{ background: 'rgba(52, 211, 153, 0.1)', borderTop: `2px solid ${T.success}` }}>
                          <td style={{ padding: '14px 18px', color: T.txtPrimary, fontWeight: '900', fontSize: '1rem' }}>TOTAL (NET SALES)</td>
                          <td style={{ padding: '14px 18px', textAlign: 'right', fontWeight: '900', color: T.success, fontSize: '1.15rem' }}>{formatRupiahDecimals(data.netTotal)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* 2. INVOICES SUMMARY TABLE */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <h4 style={{ fontSize: '0.88rem', fontWeight: '800', color: T.txtSecondary, textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>
                    Invoices (Statistik Struk)
                  </h4>
                  <div style={{ border: `1px solid ${T.border}`, borderRadius: '12px', overflow: 'hidden', background: T.cardBg }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                      <tbody>
                        <tr style={{ borderBottom: `1px solid ${T.border}` }}>
                          <td style={{ padding: '12px 18px', color: T.txtPrimary, fontWeight: '600' }}>Number of Invoices (Jumlah Struk)</td>
                          <td style={{ padding: '12px 18px', textAlign: 'right', fontWeight: '800', color: T.info }}>{data.numberOfInvoices.toLocaleString('id-ID')}</td>
                        </tr>
                        <tr>
                          <td style={{ padding: '12px 18px', color: T.txtPrimary, fontWeight: '600' }}>Average Bill per Invoice (Rata-rata Struk / APC)</td>
                          <td style={{ padding: '12px 18px', textAlign: 'right', fontWeight: '800', color: T.info }}>{formatRupiahDecimals(data.avgBillPerInvoice)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* 3. VOID SUMMARY TABLE */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <h4 style={{ fontSize: '0.88rem', fontWeight: '800', color: T.danger, textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>
                    Void Summary (Ringkasan Pembatalan)
                  </h4>
                  <div style={{ border: `1px solid ${T.border}`, borderRadius: '12px', overflow: 'hidden', background: T.cardBg }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                      <tbody>
                        <tr style={{ borderBottom: `1px solid ${T.border}` }}>
                          <td style={{ padding: '12px 18px', color: T.txtPrimary, fontWeight: '600' }}>Number of Invoices (Struk Batal)</td>
                          <td style={{ padding: '12px 18px', textAlign: 'right', fontWeight: '800', color: T.danger }}>{data.voidInvoices}</td>
                        </tr>
                        <tr style={{ borderBottom: `1px solid ${T.border}` }}>
                          <td style={{ padding: '12px 18px', color: T.txtPrimary, fontWeight: '600' }}>Number of Items (Item Batal)</td>
                          <td style={{ padding: '12px 18px', textAlign: 'right', fontWeight: '800', color: T.danger }}>{data.voidItems}</td>
                        </tr>
                        <tr style={{ background: 'rgba(251, 113, 133, 0.1)', borderTop: `2px solid ${T.danger}` }}>
                          <td style={{ padding: '14px 18px', color: T.txtPrimary, fontWeight: '900' }}>TOTAL NOMINAL VOID</td>
                          <td style={{ padding: '14px 18px', textAlign: 'right', fontWeight: '900', color: T.danger, fontSize: '1.05rem' }}>{formatRupiahDecimals(data.voidTotal)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* 4. SUMMARY BY PRODUCT TABLE */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <h4 style={{ fontSize: '0.88rem', fontWeight: '800', color: T.accentGold, textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>
                    Summary By Product (Rincian Produk & Tipe Pesanan)
                  </h4>
                  <div style={{ border: `1px solid ${T.border}`, borderRadius: '12px', overflow: 'hidden', background: T.cardBg }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                      <thead>
                        <tr style={{ background: T.cardBg2, borderBottom: `2px solid ${T.border}`, color: T.txtPrimary, fontWeight: '800' }}>
                          <th style={{ padding: '12px 16px', textAlign: 'left', minWidth: '220px' }}>Nama Produk</th>
                          <th style={{ padding: '12px 16px', textAlign: 'left', width: '150px' }}>Tipe Pesanan</th>
                          <th style={{ padding: '12px 16px', textAlign: 'center', width: '100px' }}>Qty</th>
                          <th style={{ padding: '12px 16px', textAlign: 'right' }}>Total Sales</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.productSummary.length === 0 ? (
                          <tr>
                            <td colSpan={4} style={{ padding: '24px', textAlign: 'center', color: T.txtSecondary }}>
                              Belum ada rincian produk transaksi untuk periode ini.
                            </td>
                          </tr>
                        ) : (
                          data.productSummary.map((prod, pIdx) => (
                            <React.Fragment key={pIdx}>
                              {prod.variants.map((v, vIdx) => (
                                <tr key={vIdx} style={{ borderBottom: `1px solid ${T.hoverBg}`, color: T.txtPrimary }}>
                                  <td style={{ padding: '10px 16px', fontWeight: vIdx === 0 ? '800' : '400', color: vIdx === 0 ? `${T.txtPrimary}` : 'transparent' }}>
                                    {vIdx === 0 ? prod.name : ''}
                                  </td>
                                  <td style={{ padding: '10px 16px', color: v.type === 'Take Away' ? `${T.accentGold}` : T.info, fontWeight: '700' }}>
                                    {v.type}
                                  </td>
                                  <td style={{ padding: '10px 16px', textAlign: 'center', fontWeight: '800', color: T.txtPrimary }}>
                                    x{v.qty.toLocaleString('id-ID')}
                                  </td>
                                  <td style={{ padding: '10px 16px', textAlign: 'right', fontWeight: '800', color: T.success }}>
                                    {formatRupiahDecimals(v.sales)}
                                  </td>
                                </tr>
                              ))}
                            </React.Fragment>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* 5. ULASAN EKSEKUTIF & AI INSIGHT BOARD */}
                <div style={{ background: `linear-gradient(135deg, ${T.accentGreenBg} 0%, rgba(15, 23, 42, 0.95) 100%)`, padding: '24px', borderRadius: '14px', border: `1px solid ${T.accentGreen}`, display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <h4 style={{ fontSize: '1.05rem', fontWeight: '900', color: T.info, margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <FileText size={20} color={ T.info } />
                    <span>Ulasan Eksekutif & AI Insight Resto</span>
                  </h4>
                  <div style={{ fontSize: '0.88rem', color: T.txtPrimary, lineHeight: '1.7', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <p style={{ margin: 0 }}>
                      • <strong>Performa Finansial:</strong> Total omzet bersih yang diraih pada periode ini adalah <strong style={{ color: T.success }}>{formatRupiah(data.netTotal)}</strong> dari <strong style={{ color: T.info }}>{data.numberOfInvoices.toLocaleString('id-ID')} struk transaksi</strong> dengan rata-rata belanja <strong style={{ color: T.accentGold }}>{formatRupiah(data.avgBillPerInvoice)} per struk</strong>.
                    </p>
                    {data.productSummary.length > 0 && (
                      <p style={{ margin: 0 }}>
                        • <strong>Menu Terlaris:</strong> Menu utama terdaftar pada periode ini mencakup <strong style={{ color: T.txtPrimary }}>{data.productSummary[0]?.name}</strong>.
                      </p>
                    )}
                    <p style={{ margin: 0 }}>
                      • <strong>Tingkat Pembatalan (Void):</strong> Terjadi pembatalan sebanyak <strong style={{ color: T.danger }}>{data.voidInvoices} struk ({data.voidItems} item)</strong> dengan nominal <strong style={{ color: T.danger }}>{formatRupiah(data.voidTotal)}</strong>.
                    </p>
                  </div>
                </div>

              </div>
            );
          })()}

        </div>
      )}


      {/* 4. RINGKASAN PENJUALAN (MATCHING LUNA POS REPORT SCREENSHOT) */}
      {activeTab === 'daily' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* FILTER & ACTION BAR SECTION */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', position: 'relative', zIndex: 1000 }}>
            <DoubleCalendarPicker themeMode={themeMode}
              startDate={dailyStartDate}
              endDate={dailyEndDate}
              datePreset={dailyDatePreset}
              setStartDate={setDailyStartDate}
              setEndDate={setDailyEndDate}
              setDatePreset={setDailyDatePreset}
              showPopover={dailyShowCalendarPopover}
              setShowPopover={setDailyShowCalendarPopover}
              outlets={outlets}
              selectedOutletIds={dailySelectedOutletIds}
              onToggleOutlet={handleToggleDailyOutlet}
              onToggleAllOutlets={() => handleToggleDailyOutlet('ALL')}
              showOutletDropdown={dailyShowOutletDropdown}
              setShowOutletDropdown={setDailyShowOutletDropdown}
              selectedBranch={selectedBranch}
            />

            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <button 
                onClick={handleDownloadDailyPDF} 
                className="btn-secondary" 
                style={{ padding: '9px 16px', fontSize: '0.82rem', color: T.danger, borderColor: 'rgba(251, 113, 133, 0.4)', background: 'rgba(251, 113, 133, 0.1)', height: '40px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <Printer size={16} />
                <span>Download PDF</span>
              </button>

              <button 
                onClick={handleDownloadDailyExcel} 
                className="btn-secondary" 
                style={{ padding: '9px 16px', fontSize: '0.82rem', color: T.success, borderColor: 'rgba(52, 211, 153, 0.4)', background: 'rgba(52, 211, 153, 0.1)', height: '40px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <FileSpreadsheet size={16} />
                <span>Download Excel</span>
              </button>
            </div>
          </div>

          {/* MAIN REPORT BOARD - MATCHING LUNA POS REPORT SCREENSHOT */}
          <div className="glass-card animate-fade-in" style={{ padding: '36px 32px', background: T.cardBg2, border: `1px solid ${T.border}`, borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
            
            {/* CENTERED REPORT TITLE HEADER */}
            <div style={{ textAlign: 'center', marginBottom: '8px' }}>
              <h1 style={{ fontSize: '2.2rem', fontWeight: '900', color: T.info, letterSpacing: '-0.02em', margin: 0 }}>
                Ringkasan Penjualan Harian
              </h1>
              <div style={{ fontSize: '1.05rem', fontWeight: '700', color: T.txtPrimary, marginTop: '6px' }}>
                {dailyStartDate ? formatToDMY(dailyStartDate) : 'Semua Tanggal'} {dailyEndDate ? `- ${formatToDMY(dailyEndDate)}` : ''}
              </div>
            </div>

            {/* REPORT TABLE */}
            <div style={{ overflowX: 'auto', border: `1px solid ${T.border}`, borderRadius: '12px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
                <thead>
                  <tr style={{ background: T.cardBg, borderBottom: `2px solid ${T.border}`, color: T.txtPrimary, fontWeight: '800', fontSize: '0.82rem' }}>
                    <th style={{ padding: '14px 16px' }}>Tanggal</th>
                    <th style={{ padding: '14px 16px', textAlign: 'right' }}>Total Sales</th>
                    <th style={{ padding: '14px 16px', textAlign: 'right' }}>Discount</th>
                    <th style={{ padding: '14px 16px', textAlign: 'right' }}>Service Charge</th>
                    <th style={{ padding: '14px 16px', textAlign: 'right' }}>Tax</th>
                    <th style={{ padding: '14px 16px', textAlign: 'right' }}>Adjustment</th>
                    <th style={{ padding: '14px 16px', textAlign: 'right', fontWeight: '900' }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const data = getSalesSummaryByDayData();
                    if (data.length === 0) {
                      return (
                        <tr>
                          <td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: T.txtSecondary, fontSize: '0.88rem' }}>
                            Belum ada data transaksi penjualan harian. Data penjualan akan muncul otomatis ketika transaksi kasir diinput.
                          </td>
                        </tr>
                      );
                    }

                    const totalSalesSum = data.reduce((s, r) => s + r.totalSales, 0);
                    const discountSum = data.reduce((s, r) => s + r.discount, 0);
                    const serviceChargeSum = data.reduce((s, r) => s + r.serviceCharge, 0);
                    const taxSum = data.reduce((s, r) => s + r.tax, 0);
                    const adjustmentSum = data.reduce((s, r) => s + r.adjustment, 0);
                    const grandTotal = data.reduce((s, r) => s + r.total, 0);

                    return (
                      <>
                        {data.map((r, idx) => (
                          <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', color: T.txtPrimary }}>
                            <td style={{ padding: '12px 16px', fontWeight: '700', color: T.txtPrimary }}>{r.formattedDate}</td>
                            <td style={{ padding: '12px 16px', textAlign: 'right' }}>{formatRupiahDecimals(r.totalSales)}</td>
                            <td style={{ padding: '12px 16px', textAlign: 'right', color: r.discount > 0 ? `${T.danger}` : T.txtPrimary }}>{formatRupiahDecimals(r.discount)}</td>
                            <td style={{ padding: '12px 16px', textAlign: 'right' }}>{formatRupiahDecimals(r.serviceCharge)}</td>
                            <td style={{ padding: '12px 16px', textAlign: 'right' }}>{formatRupiahDecimals(r.tax)}</td>
                            <td style={{ padding: '12px 16px', textAlign: 'right' }}>{formatRupiahDecimals(r.adjustment)}</td>
                            <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: '800', color: T.info }}>{formatRupiahDecimals(r.total)}</td>
                          </tr>
                        ))}
                        
                        {/* GRAND TOTAL FOOTER ROW */}
                        <tr style={{ background: T.cardBg, borderTop: `2px solid ${T.info}`, fontWeight: '900', color: T.txtPrimary, fontSize: '0.92rem' }}>
                          <td style={{ padding: '16px' }}>Total Akumulasi</td>
                          <td style={{ padding: '16px', textAlign: 'right', color: T.success }}>{formatRupiahDecimals(totalSalesSum)}</td>
                          <td style={{ padding: '16px', textAlign: 'right', color: T.danger }}>{formatRupiahDecimals(discountSum)}</td>
                          <td style={{ padding: '16px', textAlign: 'right' }}>{formatRupiahDecimals(serviceChargeSum)}</td>
                          <td style={{ padding: '16px', textAlign: 'right' }}>{formatRupiahDecimals(taxSum)}</td>
                          <td style={{ padding: '16px', textAlign: 'right' }}>{formatRupiahDecimals(adjustmentSum)}</td>
                          <td style={{ padding: '16px', textAlign: 'right', color: T.info, fontSize: '1.05rem' }}>{formatRupiahDecimals(grandTotal)}</td>
                        </tr>
                      </>
                    );
                  })()}
                </tbody>
              </table>
            </div>

          </div>
        </div>
      )}


      {/* 5. RIWAYAT TRANSAKSI */}
      {activeTab === 'transaction_history' && (
        <TransactionHistoryPage
          masterData={masterData}
          setMasterData={setMasterData}
          selectedBranch={selectedBranch}
          themeMode={themeMode}
        />
      )}



      {/* 6. PENJUALAN PER JAM */}
      {activeTab === 'hourly' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* FILTER BAR SECTION */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '16px', marginBottom: '16px', position: 'relative', zIndex: 1000 }}>
            <DoubleCalendarPicker themeMode={themeMode}
              startDate={hourStartDate}
              endDate={hourEndDate}
              datePreset={hourDatePreset}
              setStartDate={setHourStartDate}
              setEndDate={setHourEndDate}
              setDatePreset={setHourDatePreset}
              showPopover={hourShowCalendarPopover}
              setShowPopover={setHourShowCalendarPopover}
              outlets={outlets}
              selectedOutletIds={hourSelectedOutletIds}
              onToggleOutlet={handleToggleHourOutlet}
              onToggleAllOutlets={() => handleToggleHourOutlet('ALL')}
              showOutletDropdown={hourShowOutletDropdown}
              setShowOutletDropdown={setHourShowOutletDropdown}
              selectedBranch={selectedBranch}
            />

            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              {/* Column Visibility Filter Toggle Button */}
              <button
                onClick={() => {
                  setHourShowColumnDropdown(!hourShowColumnDropdown);
                  setHourShowCalendarPopover(false);
                  setHourShowOutletDropdown(false);
                }}
                className="btn-secondary"
                style={{
                  fontSize: '0.8rem',
                  padding: '8px 12px',
                  borderColor: hourShowColumnDropdown ? `${T.accentGold}` : 'rgba(255,255,255,0.1)',
                  background: hourShowColumnDropdown ? 'rgba(251, 191, 36, 0.2)' : T.cardBg,
                  color: hourShowColumnDropdown ? `${T.accentGold}` : T.txtPrimary,
                  height: '40px'
                }}
              >
                <SlidersHorizontal size={15} color={ T.accentGold } />
                <span>Filter Kolom Ditampilkan</span>
                <ChevronDown size={14} style={{ transform: hourShowColumnDropdown ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
              </button>

              {/* Export Action Buttons */}
              <button onClick={handleDownloadHourExcel} className="btn-secondary" style={{ padding: '8px 12px', fontSize: '0.8rem', color: T.success, borderColor: 'rgba(52, 211, 153, 0.3)', height: '40px' }}>
                <FileSpreadsheet size={15} />
                <span>Download Excel</span>
              </button>

              <button onClick={handleDownloadHourPDF} className="btn-secondary" style={{ padding: '8px 12px', fontSize: '0.8rem', color: T.danger, borderColor: 'rgba(251, 113, 133, 0.3)', height: '40px' }}>
                <Printer size={15} />
                <span>Download PDF</span>
              </button>
            </div>
          </div>

          {/* 3. PAPAN FILTER KOLOM DITAMPILKAN (DISUSUN LANGSUNG DI ATAS TABEL) */}
          {hourShowColumnDropdown && (
            <div className="glass-card animate-fade-in" style={{ padding: '20px', border: `1px solid ${T.accentGold}`, background: T.cardBg, display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${T.border}`, paddingBottom: '10px' }}>
                <div style={{ fontWeight: '800', color: T.txtPrimary, fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <SlidersHorizontal size={18} color={ T.accentGold } />
                  <span>Papan Filter Visibilitas Kolom Tabel (Penjualan per Jam)</span>
                </div>
                <button onClick={() => setHourShowColumnDropdown(false)} style={{ background: 'none', border: 'none', color: T.txtSecondary, cursor: 'pointer', fontWeight: '800', fontSize: '1rem' }}>
                  Sembunyikan Papan Kolom
                </button>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', background: T.cardBg2, padding: '16px', borderRadius: '12px', border: `1px solid ${T.border}` }}>
                {[
                  { key: 'hourRange', label: 'Rentang Waktu (1 Jam)' },
                  { key: 'txCount', label: 'Jumlah Transaksi' },
                  { key: 'net', label: 'Total Omzet Net (Rupiah)' },
                  { key: 'pct', label: 'Kontribusi Omzet (%)' }
                ].map(col => (
                  <label key={col.key} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                    color: hourVisibleColumns[col.key] ? `${T.accentGold}` : T.txtPrimary,
                    fontWeight: hourVisibleColumns[col.key] ? '800' : '600',
                    background: hourVisibleColumns[col.key] ? 'rgba(251, 191, 36, 0.15)' : T.cardBg,
                    padding: '8px 14px',
                    borderRadius: '8px',
                    border: '1px solid',
                    borderColor: hourVisibleColumns[col.key] ? `${T.accentGold}` : T.border
                  }}>
                    <input
                      type="checkbox"
                      checked={hourVisibleColumns[col.key]}
                      onChange={() => handleToggleHourColumn(col.key)}
                      style={{ accentColor: T.accentGold, width: '16px', height: '16px' }}
                    />
                    <span>{col.label}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* GRAFIK BATANG PEMBANDING PENJUALAN PER JAM */}
          <div className="glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: '800', color: T.txtPrimary, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <TrendingUp size={20} color={ T.info } />
                  <span>Grafik Jam Sibuk Penjualan (Peak Hours Chart)</span>
                </h3>
                <p style={{ color: T.txtSecondary, fontSize: '0.8rem', marginTop: '4px' }}>
                  Distribusi omzet per jam operasional restoran dengan label nominal Rupiah (Rp) melayang di atas puncak bagan
                </p>
              </div>

              <div style={{ fontSize: '0.8rem', color: T.info, fontWeight: '800', background: T.accentGreenBg, padding: '6px 12px', borderRadius: '8px', border: '1px solid rgba(99, 102, 241, 0.3)' }}>
                Peak Hours Active
              </div>
            </div>

            {/* Visual Bar Chart */}
            <div style={{ background: T.cardBg2, padding: '32px 14px 14px 14px', borderRadius: '16px', border: `1px solid ${T.border}`, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', minHeight: '260px', overflowX: 'auto', gap: '10px' }}>
              {hourlyBuckets.map((b, idx) => {
                const maxNet = Math.max(...hourlyBuckets.map(h => h.net), 1);
                const barHeightPct = Math.max((b.net / maxNet) * 150, 6);
                const isSibuk = b.net > 0;

                return (
                  <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, position: 'relative', minWidth: '40px' }}>
                    {/* Floating Nominal Label on Top of Peak (Only if omzet > 0) */}
                    {b.net > 0 && (
                      <div style={{
                        position: 'absolute',
                        top: `-${barHeightPct + 36}px`,
                        background: 'rgba(129, 140, 248, 0.95)',
                        color: T.txtPrimary,
                        fontSize: '0.65rem',
                        fontWeight: '900',
                        padding: '3px 6px',
                        borderRadius: '6px',
                        whiteSpace: 'nowrap',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
                        border: `1px solid ${T.info}`,
                        zIndex: 10
                      }}>
                        {formatRupiah(b.net)}
                      </div>
                    )}

                    {/* Bar */}
                    <div style={{
                      width: '60%',
                      height: `${barHeightPct}px`,
                      background: isSibuk ? `linear-gradient(180deg, ${T.info} 0%, #4f46e5 100%)` : T.cardBg,
                      borderRadius: '4px 4px 0 0',
                      transition: 'height 0.4s ease'
                    }} />

                    {/* Label Jam */}
                    <div style={{ marginTop: '8px', fontSize: '0.65rem', color: T.txtSecondary, fontWeight: '800' }}>
                      {b.hourRange.split(' - ')[0]}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* TABEL DATA PENJUALAN PER JAM */}
          <div className="glass-card" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: '800', color: T.txtPrimary }}>
                Tabel Analisis Penjualan per Jam
              </h3>
              <div style={{ fontSize: '0.8rem', color: T.txtSecondary }}>
                Interval Terbagi 24 Jam Operasional
              </div>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${T.border}`, color: T.txtSecondary, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {hourVisibleColumns.hourRange && <th style={{ padding: '12px' }}>Rentang Waktu (1 Jam)</th>}
                    {hourVisibleColumns.txCount && <th style={{ padding: '12px', textAlign: 'right', color: T.info }}>Jumlah Transaksi</th>}
                    {hourVisibleColumns.net && <th style={{ padding: '12px', textAlign: 'right', color: T.success }}>Total Omzet Net (Rupiah)</th>}
                    {hourVisibleColumns.pct && <th style={{ padding: '12px', textAlign: 'right', color: T.accentGold }}>Kontribusi Omzet (%)</th>}
                  </tr>
                </thead>
                <tbody>
                  {hourlyBuckets.map((b, idx) => {
                    const pct = totalHourNet > 0 ? ((b.net / totalHourNet) * 100).toFixed(1) : '0.0';
                    return (
                      <tr key={idx} style={{ borderBottom: `1px solid ${T.hoverBg}`, color: T.txtPrimary }}>
                        {hourVisibleColumns.hourRange && (
                          <td style={{ padding: '12px', fontWeight: '800', color: T.txtPrimary }}>
                            {b.hourRange}
                          </td>
                        )}
                        {hourVisibleColumns.txCount && (
                          <td style={{ padding: '12px', textAlign: 'right', fontWeight: '700', color: T.info }}>
                            {b.txCount} kali
                          </td>
                        )}
                        {hourVisibleColumns.net && (
                          <td style={{ padding: '12px', textAlign: 'right', fontWeight: '900', color: T.success, fontSize: '0.92rem' }}>
                            {formatRupiah(b.net)}
                          </td>
                        )}
                        {hourVisibleColumns.pct && (
                          <td style={{ padding: '12px', textAlign: 'right', fontWeight: '800', color: T.accentGold }}>
                            {pct}%
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
<tfoot>
                  <tr style={{ background: T.cardBg2, borderTop: `2px solid ${T.border}`, fontWeight: '900', color: T.txtPrimary }}>
                    {hourVisibleColumns.hourRange && <td style={{ padding: '14px 12px' }}>TOTAL KESELURUHAN</td>}
                    {hourVisibleColumns.txCount && <td style={{ padding: '14px 12px', textAlign: 'right', color: T.info }}>{totalHourTxCount} kali</td>}
                    {hourVisibleColumns.net && <td style={{ padding: '14px 12px', textAlign: 'right', color: T.success, fontSize: '1rem' }}>{formatRupiah(totalHourNet)}</td>}
                    {hourVisibleColumns.pct && <td style={{ padding: '14px 12px', textAlign: 'right', color: T.accentGold }}>100%</td>}
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}


      {/* 7. PENJUALAN BY LAYANAN (DINE IN VS TAKE AWAY) */}
      {activeTab === 'receipts' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {(() => {
            const data = getServiceTypeSalesSummaryData();

            return (
              <>
                {/* FILTER BAR SECTION (RENTANG WAKTU & SELEKSI OUTLET) */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '16px', position: 'relative', zIndex: 1000 }}>
                  <DoubleCalendarPicker themeMode={themeMode}
                    startDate={rcptStartDate}
                    endDate={rcptEndDate}
                    datePreset={rcptDatePreset}
                    setStartDate={setRcptStartDate}
                    setEndDate={setRcptEndDate}
                    setDatePreset={setRcptDatePreset}
                    showPopover={rcptShowCalendarPopover}
                    setShowPopover={setRcptShowCalendarPopover}
                    outlets={outlets}
                    selectedOutletIds={rcptSelectedOutletIds}
                    onToggleOutlet={handleToggleRcptOutlet}
                    onToggleAllOutlets={() => handleToggleRcptOutlet('ALL')}
                    showOutletDropdown={rcptShowOutletDropdown}
                    setShowOutletDropdown={setRcptShowOutletDropdown}
                    selectedBranch={selectedBranch}
                  />

                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <ColumnVisibilityDropdown themeMode={themeMode}
                      columns={[
                        { key: 'serviceType', label: 'Tipe Layanan' },
                        { key: 'receiptCount', label: 'Jumlah Struk' },
                        { key: 'totalQty', label: 'Kuantitas Terjual' },
                        { key: 'netSales', label: 'Total Penjualan (Nominal)' },
                        { key: 'avgSpend', label: 'Rata-rata Penjualan per Struk' },
                        { key: 'pct', label: 'Kontribusi (%)' }
                      ]}
                      visibleColumns={rcptVisibleColumns}
                      onToggleColumn={handleToggleRcptColumn}
                    />

                    <button onClick={handleDownloadRcptExcel} className="btn-secondary" style={{ padding: '8px 12px', fontSize: '0.8rem', color: T.success, borderColor: 'rgba(52, 211, 153, 0.3)', height: '40px' }}>
                      <FileSpreadsheet size={15} />
                      <span>Download Excel</span>
                    </button>

                    <button onClick={handleDownloadRcptPDF} className="btn-secondary" style={{ padding: '8px 12px', fontSize: '0.8rem', color: T.danger, borderColor: 'rgba(251, 113, 133, 0.3)', height: '40px' }}>
                      <Printer size={15} />
                      <span>Download PDF</span>
                    </button>
                  </div>
                </div>

                {/* CARD SUMMARY LAYANAN */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
                  {/* Card 1: Dine In */}
                  <div className="glass-card animate-fade-in" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px', borderLeft: `4px solid ${T.info}` }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(56, 189, 248, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Store size={24} color={ T.info } />
                    </div>
                    <div>
                      <div style={{ fontSize: '0.78rem', color: T.txtSecondary, fontWeight: '700', textTransform: 'uppercase' }}>Dine In (Makan di Tempat)</div>
                      <div style={{ fontSize: '1.35rem', fontWeight: '900', color: T.info, marginTop: '4px' }}>{formatRupiah(data.serviceTypeBuckets[0].netSales)}</div>
                      <div style={{ fontSize: '0.78rem', color: T.txtPrimary, marginTop: '2px' }}>
                        {data.serviceTypeBuckets[0].receiptCount.toLocaleString('id-ID')} Struk | x{data.serviceTypeBuckets[0].totalQty.toLocaleString('id-ID')} Porsi
                      </div>
                    </div>
                  </div>

                  {/* Card 2: Take Away */}
                  <div className="glass-card animate-fade-in" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px', borderLeft: `4px solid ${T.accentGold}` }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(251, 191, 36, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <ShoppingBag size={24} color={ T.accentGold } />
                    </div>
                    <div>
                      <div style={{ fontSize: '0.78rem', color: T.txtSecondary, fontWeight: '700', textTransform: 'uppercase' }}>Take Away (Bawa Pulang / GrabFood / GoFood)</div>
                      <div style={{ fontSize: '1.35rem', fontWeight: '900', color: T.accentGold, marginTop: '4px' }}>{formatRupiah(data.serviceTypeBuckets[1].netSales)}</div>
                      <div style={{ fontSize: '0.78rem', color: T.txtPrimary, marginTop: '2px' }}>
                        {data.serviceTypeBuckets[1].receiptCount.toLocaleString('id-ID')} Struk | x{data.serviceTypeBuckets[1].totalQty.toLocaleString('id-ID')} Porsi
                      </div>
                    </div>
                  </div>

                  {/* Card 3: Total Akumulasi */}
                  <div className="glass-card animate-fade-in" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px', borderLeft: `4px solid ${T.success}` }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(52, 211, 153, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <DollarSign size={24} color={ T.success } />
                    </div>
                    <div>
                      <div style={{ fontSize: '0.78rem', color: T.txtSecondary, fontWeight: '700', textTransform: 'uppercase' }}>Total Omzet Bersih Layanan</div>
                      <div style={{ fontSize: '1.35rem', fontWeight: '900', color: T.success, marginTop: '4px' }}>{formatRupiah(data.totalNet)}</div>
                      <div style={{ fontSize: '0.78rem', color: T.txtPrimary, marginTop: '2px' }}>
                        {data.totalReceipts.toLocaleString('id-ID')} Struk | x{data.totalQty.toLocaleString('id-ID')} Porsi Total
                      </div>
                    </div>
                  </div>
                </div>

                {/* GRAFIK PIE PERBANDINGAN PENJUALAN DINE IN VS TAKE AWAY */}
                <div className="glass-card animate-fade-in" style={{ padding: '24px', background: T.cardBg2, border: `1px solid ${T.border}`, borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <h3 style={{ fontSize: '1.1rem', fontWeight: '800', color: T.txtPrimary, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <BarChart3 size={20} color={ T.info } />
                        <span>Grafik Pie Perbandingan Penjualan (Dine In vs Take Away)</span>
                      </h3>
                      <p style={{ color: T.txtSecondary, fontSize: '0.8rem', marginTop: '4px', margin: 0 }}>
                        Proporsi kontribusi omzet bersih dari layanan Makan di Tempat (Dine In) dan Bawa Pulang / Online Delivery (Take Away).
                      </p>
                    </div>
                    <div style={{ fontSize: '0.78rem', color: T.info, fontWeight: '800', background: 'rgba(56, 189, 248, 0.15)', padding: '6px 12px', borderRadius: '8px', border: '1px solid rgba(56, 189, 248, 0.3)' }}>
                      Visual Proportion Chart
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', gap: '32px', minHeight: '260px' }}>
                    <div style={{ width: '280px', height: '240px' }}>
                      <ReResponsiveContainer width="100%" height="100%">
                        <RePieChart>
                          <RePie
                            data={[
                              { name: 'Dine In (Makan di Tempat)', value: data.serviceTypeBuckets[0].netSales, color: T.info },
                              { name: 'Take Away (Bawa Pulang & Online)', value: data.serviceTypeBuckets[1].netSales, color: T.accentGold }
                            ]}
                            cx="50%"
                            cy="50%"
                            innerRadius={55}
                            outerRadius={85}
                            paddingAngle={5}
                            dataKey="value"
                          >
                            <ReCell key="cell-0" fill={ T.info } />
                            <ReCell key="cell-1" fill={ T.accentGold } />
                          </RePie>
                          <ReTooltip 
                            formatter={(val) => [formatRupiah(val), 'Total Omzet']}
                            contentStyle={{ background: T.cardBg, borderColor: T.border, borderRadius: '10px', color: T.txtPrimary }}
                          />
                        </RePieChart>
                      </ReResponsiveContainer>
                    </div>

                    {/* PIE CHART LEGEND DETAILS */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', minWidth: '260px' }}>
                      <div style={{ background: T.cardBg, padding: '14px 18px', borderRadius: '12px', borderLeft: `4px solid ${T.info}`, border: `1px solid ${T.border}` }}>
                        <div style={{ fontSize: '0.8rem', color: T.txtSecondary, fontWeight: '700' }}>Dine In (Makan di Tempat)</div>
                        <div style={{ fontSize: '1.2rem', fontWeight: '900', color: T.info, marginTop: '2px' }}>
                          {formatRupiah(data.serviceTypeBuckets[0].netSales)}
                        </div>
                        <div style={{ fontSize: '0.78rem', color: T.txtPrimary, marginTop: '2px' }}>
                          Kontribusi: <strong style={{ color: T.info }}>{((data.serviceTypeBuckets[0].netSales / data.totalNet) * 100).toFixed(1)}%</strong> ({data.serviceTypeBuckets[0].receiptCount.toLocaleString('id-ID')} Struk / x{data.serviceTypeBuckets[0].totalQty.toLocaleString('id-ID')} Porsi)
                        </div>
                      </div>

                      <div style={{ background: T.cardBg, padding: '14px 18px', borderRadius: '12px', borderLeft: `4px solid ${T.accentGold}`, border: `1px solid ${T.border}` }}>
                        <div style={{ fontSize: '0.8rem', color: T.txtSecondary, fontWeight: '700' }}>Take Away (Bawa Pulang & Delivery)</div>
                        <div style={{ fontSize: '1.2rem', fontWeight: '900', color: T.accentGold, marginTop: '2px' }}>
                          {formatRupiah(data.serviceTypeBuckets[1].netSales)}
                        </div>
                        <div style={{ fontSize: '0.78rem', color: T.txtPrimary, marginTop: '2px' }}>
                          Kontribusi: <strong style={{ color: T.accentGold }}>{((data.serviceTypeBuckets[1].netSales / data.totalNet) * 100).toFixed(1)}%</strong> ({data.serviceTypeBuckets[1].receiptCount.toLocaleString('id-ID')} Struk / x{data.serviceTypeBuckets[1].totalQty.toLocaleString('id-ID')} Porsi)
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* TABEL PENJUALAN BY LAYANAN */}
                <div className="glass-card animate-fade-in" style={{ padding: '24px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <div>
                      <h3 style={{ fontSize: '1.1rem', fontWeight: '800', color: T.txtPrimary }}>
                        Tabel Analisis Penjualan By Layanan (Dine In & Take Away)
                      </h3>
                      <p style={{ color: T.txtSecondary, fontSize: '0.8rem', marginTop: '4px' }}>
                        Rincian perbandingan jumlah struk, kuantitas item terjual, total penjualan (nominal), rata-rata penjualan per struk, dan kontribusi (%).
                      </p>
                    </div>
                    <div style={{ fontSize: '0.8rem', color: T.info, fontWeight: '800', background: 'rgba(56,189,248,0.15)', padding: '6px 12px', borderRadius: '8px', border: '1px solid rgba(56,189,248,0.3)' }}>
                      Multi-Layanan Terintegrasi
                    </div>
                  </div>

                  <div style={{ overflowX: 'auto', border: `1px solid ${T.border}`, borderRadius: '12px' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                      <thead>
                        <tr style={{ borderBottom: `2px solid ${T.border}`, background: T.cardBg2, color: T.txtPrimary, fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          {rcptVisibleColumns.serviceType !== false && <th style={{ padding: '12px 14px' }}>Tipe Layanan</th>}
                          {rcptVisibleColumns.receiptCount !== false && <th style={{ padding: '12px 14px', textAlign: 'right', color: T.info }}>Jumlah Struk</th>}
                          {rcptVisibleColumns.totalQty !== false && <th style={{ padding: '12px 14px', textAlign: 'center', color: T.accentGold }}>Kuantitas Terjual</th>}
                          {rcptVisibleColumns.netSales !== false && <th style={{ padding: '12px 14px', textAlign: 'right', color: T.success }}>Total Penjualan (Nominal)</th>}
                          {rcptVisibleColumns.avgSpend !== false && <th style={{ padding: '12px 14px', textAlign: 'right', color: T.info }}>Rata-rata Penjualan per Struk</th>}
                          {rcptVisibleColumns.pct !== false && <th style={{ padding: '12px 14px', textAlign: 'right', color: T.accentGold }}>Kontribusi (%)</th>}
                        </tr>
                      </thead>
                      <tbody>
                        {data.serviceTypeBuckets.map((b) => {
                          const avgSpend = b.receiptCount > 0 ? b.netSales / b.receiptCount : 0;
                          const pct = data.totalNet > 0 ? ((b.netSales / data.totalNet) * 100).toFixed(1) : '0.0';

                          return (
                            <React.Fragment key={b.id}>
                              {/* BARIS UTAMA TIPE LAYANAN */}
                              <tr style={{ background: 'rgba(30, 41, 59, 0.8)', borderBottom: `1px solid ${T.border}`, color: T.txtPrimary }}>
                                {rcptVisibleColumns.serviceType !== false && (
                                  <td style={{ padding: '14px 12px', fontWeight: '900', color: b.color, display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem' }}>
                                    <span style={{ fontSize: '1.2rem' }}>{b.icon}</span>
                                    <span>{b.name}</span>
                                  </td>
                                )}
                                {rcptVisibleColumns.receiptCount !== false && (
                                  <td style={{ padding: '14px 12px', textAlign: 'right', fontWeight: '900', color: T.info, fontSize: '0.9rem' }}>
                                    {b.receiptCount.toLocaleString('id-ID')} struk
                                  </td>
                                )}
                                {rcptVisibleColumns.totalQty !== false && (
                                  <td style={{ padding: '14px 12px', textAlign: 'center', fontWeight: '900', color: T.accentGold, fontSize: '0.9rem' }}>
                                    x{b.totalQty.toLocaleString('id-ID')} porsi
                                  </td>
                                )}
                                {rcptVisibleColumns.netSales !== false && (
                                  <td style={{ padding: '14px 12px', textAlign: 'right', fontWeight: '900', color: T.success, fontSize: '1rem', background: 'rgba(52, 211, 153, 0.1)' }}>
                                    {formatRupiah(b.netSales)}
                                  </td>
                                )}
                                {rcptVisibleColumns.avgSpend !== false && (
                                  <td style={{ padding: '14px 12px', textAlign: 'right', fontWeight: '700', color: T.info }}>
                                    {formatRupiah(avgSpend)}
                                  </td>
                                )}
                                {rcptVisibleColumns.pct !== false && (
                                  <td style={{ padding: '14px 12px', textAlign: 'right', fontWeight: '900', color: T.accentGold }}>
                                    {pct}%
                                  </td>
                                )}
                              </tr>

                              {/* BARIS SUB-DETAIL RINCIAN PENJUALAN MASING-MASING OUTLET */}
                              {b.outletBreakdown && b.outletBreakdown.map((otl, otlIdx) => {
                                const otlAvgSpend = otl.receiptCount > 0 ? otl.net / otl.receiptCount : 0;
                                const otlPct = b.netSales > 0 ? ((otl.net / b.netSales) * 100).toFixed(1) : '0.0';

                                return (
                                  <tr key={otlIdx} style={{ borderBottom: `1px solid ${T.tableRowHover}`, background: T.cardBg2, fontSize: '0.8rem' }}>
                                    {rcptVisibleColumns.serviceType !== false && (
                                      <td style={{ padding: '10px 12px 10px 36px', color: T.txtSecondary, fontWeight: '600' }}>
                                        {otl.name}
                                      </td>
                                    )}
                                    {rcptVisibleColumns.receiptCount !== false && (
                                      <td style={{ padding: '10px 12px', textAlign: 'right', color: T.txtPrimary }}>
                                        {otl.receiptCount.toLocaleString('id-ID')} struk
                                      </td>
                                    )}
                                    {rcptVisibleColumns.totalQty !== false && (
                                      <td style={{ padding: '10px 12px', textAlign: 'center', color: T.txtPrimary }}>
                                        x{otl.totalQty.toLocaleString('id-ID')} porsi
                                      </td>
                                    )}
                                    {rcptVisibleColumns.netSales !== false && (
                                      <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: '800', color: T.success }}>
                                        {formatRupiah(otl.net)}
                                      </td>
                                    )}
                                    {rcptVisibleColumns.avgSpend !== false && (
                                      <td style={{ padding: '10px 12px', textAlign: 'right', color: T.txtSecondary }}>
                                        {formatRupiah(otlAvgSpend)}
                                      </td>
                                    )}
                                    {rcptVisibleColumns.pct !== false && (
                                      <td style={{ padding: '10px 12px', textAlign: 'right', color: T.txtSecondary }}>
                                        {otlPct}%
                                      </td>
                                    )}
                                  </tr>
                                );
                              })}
                            </React.Fragment>
                          );
                        })}
                      </tbody>
                      <tfoot>
                        <tr style={{ background: T.cardBg2, borderTop: `2px solid ${T.info}`, fontWeight: '900', color: T.txtPrimary, fontSize: '0.88rem' }}>
                          {rcptVisibleColumns.serviceType !== false && <td style={{ padding: '16px 12px' }}>TOTAL AKUMULASI LAYANAN</td>}
                          {rcptVisibleColumns.receiptCount !== false && <td style={{ padding: '16px 12px', textAlign: 'right', color: T.info }}>{data.totalReceipts.toLocaleString('id-ID')} struk</td>}
                          {rcptVisibleColumns.totalQty !== false && <td style={{ padding: '16px 12px', textAlign: 'center', color: T.accentGold }}>x{data.totalQty.toLocaleString('id-ID')} porsi</td>}
                          {rcptVisibleColumns.netSales !== false && <td style={{ padding: '16px 12px', textAlign: 'right', color: T.success, fontSize: '1.05rem' }}>{formatRupiah(data.totalNet)}</td>}
                          {rcptVisibleColumns.avgSpend !== false && <td style={{ padding: '16px 12px', textAlign: 'right', color: T.info }}>{formatRupiah(data.totalNet / data.totalReceipts)}</td>}
                          {rcptVisibleColumns.pct !== false && <td style={{ padding: '16px 12px', textAlign: 'right', color: T.accentGold }}>100%</td>}
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              </>
            );
          })()}
        </div>
      )}





      {/* 8. PENJUALAN PER PELANGGAN */}
      {activeTab === 'customers' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* FILTER BAR SECTION */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '16px', marginBottom: '16px', position: 'relative', zIndex: 1000 }}>
            <DoubleCalendarPicker themeMode={themeMode}
              startDate={custStartDate}
              endDate={custEndDate}
              datePreset={custDatePreset}
              setStartDate={setCustStartDate}
              setEndDate={setCustEndDate}
              setDatePreset={setCustDatePreset}
              showPopover={custShowCalendarPopover}
              setShowPopover={setCustShowCalendarPopover}
              outlets={outlets}
              selectedOutletIds={custSelectedOutletIds}
              onToggleOutlet={handleToggleCustOutlet}
              onToggleAllOutlets={() => handleToggleCustOutlet('ALL')}
              showOutletDropdown={custShowOutletDropdown}
              setShowOutletDropdown={setCustShowOutletDropdown}
              selectedBranch={selectedBranch}
            />

            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <button
                onClick={() => {
                  setCustShowColumnDropdown(!custShowColumnDropdown);
                  setCustShowCalendarPopover(false);
                  setCustShowOutletDropdown(false);
                }}
                className="btn-secondary"
                style={{
                  fontSize: '0.8rem',
                  padding: '8px 12px',
                  borderColor: custShowColumnDropdown ? `${T.accentGold}` : 'rgba(255,255,255,0.1)',
                  background: custShowColumnDropdown ? 'rgba(251, 191, 36, 0.15)' : T.cardBg,
                  color: custShowColumnDropdown ? `${T.accentGold}` : T.txtPrimary,
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <SlidersHorizontal size={14} />
                <span>Filter Kolom</span>
              </button>

              <button 
                onClick={handleDownloadCustPDF} 
                className="btn-secondary" 
                style={{ padding: '8px 14px', fontSize: '0.8rem', color: T.danger, borderColor: 'rgba(251, 113, 133, 0.3)', height: '38px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <Printer size={15} />
                <span>Download PDF</span>
              </button>

              <button 
                onClick={handleDownloadCustExcel} 
                className="btn-secondary" 
                style={{ padding: '8px 14px', fontSize: '0.8rem', color: T.success, borderColor: 'rgba(52, 211, 153, 0.3)', height: '38px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <FileSpreadsheet size={15} />
                <span>Download Excel</span>
              </button>
            </div>
          </div>

          {/* MAIN TABLE BOARD */}
          <div className="glass-card animate-fade-in" style={{ padding: '24px', background: T.cardBg, border: `1px solid ${T.border}`, borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: '800', color: T.txtPrimary }}>
                  Laporan Akumulasi Penjualan per Pelanggan
                </h3>
                <p style={{ color: T.txtSecondary, fontSize: '0.8rem', marginTop: '4px' }}>
                  Menampilkan total histori frekuensi transaksi & akumulasi nilai belanja tiap customer terdaftar.
                </p>
              </div>

              <div style={{ fontSize: '0.8rem', color: T.txtSecondary }}>
                Total {totalCustCount} Pelanggan Terdaftar
              </div>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${T.border}`, color: T.txtSecondary, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {custVisibleColumns.code && <th style={{ padding: '12px' }}>Kode Membership</th>}
                    {custVisibleColumns.name && <th style={{ padding: '12px' }}>Nama Pelanggan</th>}
                    {custVisibleColumns.phone && <th style={{ padding: '12px' }}>No. WhatsApp</th>}
                    {custVisibleColumns.tier && <th style={{ padding: '12px' }}>Tier Membership</th>}
                    {custVisibleColumns.txCount && <th style={{ padding: '12px', textAlign: 'right', color: T.info }}>Jumlah Transaksi</th>}
                    {custVisibleColumns.avgSpend && <th style={{ padding: '12px', textAlign: 'right', color: T.accentGold }}>Rata-rata Belanja</th>}
                    {custVisibleColumns.totalSpend && <th style={{ padding: '12px', textAlign: 'right', color: T.success }}>Total Belanja</th>}
                  </tr>
                </thead>
                <tbody>
                  {customerRows.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: T.txtSecondary }}>
                        Belum ada pelanggan terdaftar di Master Data.
                      </td>
                    </tr>
                  ) : (
                    customerRows.map(r => (
                      <tr key={r.id} style={{ borderBottom: `1px solid ${T.hoverBg}`, color: T.txtPrimary }}>
                        {custVisibleColumns.code && (
                          <td style={{ padding: '14px 12px', color: T.info, fontWeight: '800', fontFamily: 'monospace' }}>
                            {r.code}
                          </td>
                        )}
                        {custVisibleColumns.name && (
                          <td style={{ padding: '14px 12px', fontWeight: '800' }}>
                            {r.name}
                          </td>
                        )}
                        {custVisibleColumns.phone && (
                          <td style={{ padding: '14px 12px', color: T.txtPrimary }}>
                            {r.phone}
                          </td>
                        )}
                        {custVisibleColumns.tier && (
                          <td style={{ padding: '14px 12px' }}>
                            <span style={{ 
                              background: r.badgeColor + '20', 
                              color: r.badgeColor, 
                              border: `1px solid ${r.badgeColor}40`, 
                              padding: '4px 10px', 
                              borderRadius: '12px', 
                              fontSize: '0.75rem', 
                              fontWeight: '800' 
                            }}>
                              {r.tierIcon} {r.tier}
                            </span>
                          </td>
                        )}
                        {custVisibleColumns.txCount && (
                          <td style={{ padding: '14px 12px', textAlign: 'right', fontWeight: '800', color: T.info }}>
                            {r.txCount} kali
                          </td>
                        )}
                        {custVisibleColumns.avgSpend && (
                          <td style={{ padding: '14px 12px', textAlign: 'right', fontWeight: '700', color: T.accentGold }}>
                            {formatRupiah(r.avgSpend)}
                          </td>
                        )}
                        {custVisibleColumns.totalSpend && (
                          <td style={{ padding: '14px 12px', textAlign: 'right', fontWeight: '900', color: T.success, fontSize: '0.95rem' }}>
                            {formatRupiah(r.totalSpend)}
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
                {customerRows.length > 0 && (
                  <tfoot>
                    <tr style={{ background: T.cardBg2, borderTop: `2px solid ${T.border}`, fontWeight: '900', color: T.txtPrimary }}>
                      {custVisibleColumns.code && <td style={{ padding: '14px 12px' }}>TOTAL AKUMULASI</td>}
                      {custVisibleColumns.name && <td></td>}
                      {custVisibleColumns.phone && <td></td>}
                      {custVisibleColumns.tier && <td></td>}
                      {custVisibleColumns.txCount && <td style={{ padding: '14px 12px', textAlign: 'right', color: T.info }}>{totalCustTxCount} kali</td>}
                      {custVisibleColumns.avgSpend && <td></td>}
                      {custVisibleColumns.totalSpend && <td style={{ padding: '14px 12px', textAlign: 'right', color: T.success, fontSize: '1rem' }}>{formatRupiah(totalCustSpend)}</td>}
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </div>
      )}


      {/* 9. PERBANDINGAN PENJUALAN PER BULAN */}
      {activeTab === 'monthly_comparison' && (
        <div className="glass-card animate-fade-in" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: '900', color: T.txtPrimary, letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <TrendingUp size={22} color={ T.success } />
              <span>Perbandingan Penjualan per Bulan (MoM Sales Growth Analysis)</span>
            </h3>
            <p style={{ color: T.txtSecondary, fontSize: '0.85rem', marginTop: '4px' }}>
              Analisis pertumbuhan omzet kotor, potongan diskon, dan penjualan bersih dari bulan ke bulan antar cabang outlet.
            </p>
          </div>

          {/* FILTER BAR SECTION */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '16px', position: 'relative', zIndex: 1000 }}>
            
            <DoubleCalendarPicker themeMode={themeMode}
              startDate={momStartDate}
              endDate={momEndDate}
              datePreset={momDatePreset}
              setStartDate={setMomStartDate}
              setEndDate={setMomEndDate}
              setDatePreset={setMomDatePreset}
              showPopover={momShowCalendarPopover}
              setShowPopover={setMomShowCalendarPopover}
              outlets={outlets}
              selectedOutletIds={momSelectedOutletIds}
              onToggleOutlet={handleToggleMomOutlet}
              onToggleAllOutlets={() => handleToggleMomOutlet('ALL')}
              showOutletDropdown={momShowOutletDropdown}
              setShowOutletDropdown={setMomShowOutletDropdown}
              selectedBranch={selectedBranch}
            />

            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              {/* Column Visibility Filter Toggle Button */}
              <button
                onClick={() => {
                  setMomShowColumnDropdown(!momShowColumnDropdown);
                  setMomShowOutletDropdown(false);
                }}
                className="btn-secondary"
                style={{
                  fontSize: '0.8rem',
                  padding: '8px 12px',
                  borderColor: momShowColumnDropdown ? `${T.accentGold}` : 'rgba(255,255,255,0.1)',
                  background: momShowColumnDropdown ? 'rgba(251, 191, 36, 0.2)' : T.cardBg,
                  color: momShowColumnDropdown ? `${T.accentGold}` : T.txtPrimary,
                  height: '40px'
                }}
              >
                <SlidersHorizontal size={15} color={ T.accentGold } />
                <span>Filter Kolom Ditampilkan</span>
                <ChevronDown size={14} style={{ transform: momShowColumnDropdown ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
              </button>

              {/* Export Action Buttons */}
              <button onClick={handleDownloadMomExcel} className="btn-secondary" style={{ padding: '8px 12px', fontSize: '0.8rem', color: T.success, borderColor: 'rgba(52, 211, 153, 0.3)', height: '40px' }}>
                <FileSpreadsheet size={15} />
                <span>Download Excel</span>
              </button>

              <button onClick={handleDownloadMomPDF} className="btn-secondary" style={{ padding: '8px 12px', fontSize: '0.8rem', color: T.danger, borderColor: 'rgba(251, 113, 133, 0.3)', height: '40px' }}>
                <Printer size={15} />
                <span>Download PDF</span>
              </button>
            </div>
          </div>

          {/* COLUMN VISIBILITY PANEL */}
          {momShowColumnDropdown && (
            <div className="glass-card animate-fade-in" style={{ padding: '20px', border: `1px solid ${T.accentGold}`, background: T.cardBg, display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${T.border}`, paddingBottom: '10px' }}>
                <div style={{ fontWeight: '800', color: T.txtPrimary, fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <SlidersHorizontal size={18} color={ T.accentGold } />
                  <span>Papan Filter Visibilitas Kolom Tabel (Perbandingan Bulanan)</span>
                </div>
                <button onClick={() => setMomShowColumnDropdown(false)} style={{ background: 'none', border: 'none', color: T.txtSecondary, cursor: 'pointer', fontWeight: '800', fontSize: '1rem' }}>
                  Sembunyikan Papan Kolom
                </button>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', background: T.cardBg2, padding: '16px', borderRadius: '12px', border: `1px solid ${T.border}` }}>
                {[
                  { key: 'month', label: 'Periode Bulan' },
                  { key: 'outletName', label: 'Nama Outlet' },
                  { key: 'txCount', label: 'Jumlah Transaksi' },
                  { key: 'grossSales', label: 'Penjualan Kotor (Gross)' },
                  { key: 'discount', label: 'Potongan Diskon' },
                  { key: 'netSales', label: 'Penjualan Bersih (Net)' },
                  { key: 'avgSpend', label: 'Rata-rata per Tiket' },
                  { key: 'growth', label: 'Pertumbuhan MoM' }
                ].map(col => (
                  <label key={col.key} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                    color: momVisibleColumns[col.key] ? `${T.accentGold}` : T.txtPrimary,
                    fontWeight: momVisibleColumns[col.key] ? '800' : '600',
                    background: momVisibleColumns[col.key] ? 'rgba(251, 191, 36, 0.15)' : T.cardBg,
                    padding: '8px 14px',
                    borderRadius: '8px',
                    border: '1px solid',
                    borderColor: momVisibleColumns[col.key] ? `${T.accentGold}` : T.border,
                    transition: 'all 0.15s ease'
                  }}>
                    <input
                      type="checkbox"
                      checked={momVisibleColumns[col.key]}
                      onChange={() => handleToggleMomColumn(col.key)}
                      style={{ accentColor: T.accentGold, width: '16px', height: '16px' }}
                    />
                    <span>{col.label}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* VISUAL CHART SECTION */}
          <div style={{ background: T.cardBg2, padding: '20px', borderRadius: '12px', border: `1px solid ${T.border}` }}>
            <div style={{ fontSize: '0.9rem', fontWeight: '800', color: T.txtPrimary, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>Grafik Perbandingan Omzet Bersih Bulanan per Outlet</span>
              <span style={{ fontSize: '0.75rem', color: T.info, background: 'rgba(56, 189, 248, 0.15)', padding: '2px 8px', borderRadius: '4px' }}>
                Dalam Rupiah (Rp)
              </span>
            </div>
            <div style={{ width: '100%', height: '320px' }}>
              <ReResponsiveContainer width="100%" height="100%">
                <ReBarChart data={chartDataset}>
                  <ReCartesianGrid strokeDasharray="3 3" stroke={T.gridColor} />
                  <ReXAxis dataKey="name" stroke={ T.txtPrimary } style={{ fontSize: '0.8rem' }} />
                  <ReYAxis stroke={ T.txtPrimary } style={{ fontSize: '0.8rem' }} tickFormatter={(v) => `${(v / 1000000).toFixed(0)}jt`} />
                  <ReTooltip 
                    formatter={(value) => [formatRupiah(value), "Omzet Bersih"]} 
                    contentStyle={{ background: T.cardBg, border: `1px solid ${T.border}`, borderRadius: '8px', color: T.txtPrimary, fontSize: '0.82rem' }}
                  />
                  <ReLegend wrapperStyle={{ fontSize: '0.8rem', paddingTop: '10px' }} />
                  {outlets.map((o, idx) => {
                    const colorsList = [`${T.info}`, `${T.success}`, `${T.info}`, `${T.accentGold}`, '#f43f5e', '#a855f7'];
                    const barColor = o.color || colorsList[idx % colorsList.length];
                    return (
                      <ReBar key={o.id} dataKey={o.name} fill={barColor} radius={[4, 4, 0, 0]} />
                    );
                  })}
                </ReBarChart>
              </ReResponsiveContainer>
            </div>
          </div>

          {/* MONTHLY COMPARISON TABLE */}
          <div style={{ border: `1px solid ${T.border}`, borderRadius: '12px', overflow: 'hidden', background: T.cardBg2 }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ background: T.cardBg, borderBottom: `1px solid ${T.border}`, color: T.txtPrimary, fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: '800' }}>
                    {momVisibleColumns.month && <th style={{ padding: '14px 12px' }}>Periode Bulan</th>}
                    {momVisibleColumns.outletName && <th style={{ padding: '14px 12px' }}>Nama Outlet</th>}
                    {momVisibleColumns.txCount && <th style={{ padding: '14px 12px', textAlign: 'right' }}>Jumlah Transaksi</th>}
                    {momVisibleColumns.grossSales && <th style={{ padding: '14px 12px', textAlign: 'right' }}>Omzet Kotor (Gross)</th>}
                    {momVisibleColumns.discount && <th style={{ padding: '14px 12px', textAlign: 'right' }}>Total Diskon</th>}
                    {momVisibleColumns.netSales && <th style={{ padding: '14px 12px', textAlign: 'right' }}>Omzet Bersih (Net)</th>}
                    {momVisibleColumns.avgSpend && <th style={{ padding: '14px 12px', textAlign: 'right' }}>Rata-rata per Tiket</th>}
                    {momVisibleColumns.growth && <th style={{ padding: '14px 12px', textAlign: 'right' }}>Pertumbuhan MoM</th>}
                  </tr>
                </thead>
                <tbody>
                  {momComparisonData.length === 0 ? (
                    <tr>
                      <td colSpan={8} style={{ padding: '40px', textAlign: 'center', color: T.txtSecondary }}>
                        Belum ada data perbandingan penjualan bulanan. Data akan terbentuk otomatis seiring berjalannya transaksi kasir.
                      </td>
                    </tr>
                  ) : (
                    momComparisonData.map((r, idx) => {
                      const isFirstMonth = idx === 0;
                      const isUp = r.growth >= 0;
                      const growthColor = isFirstMonth ? `${T.txtPrimary}` : isUp ? `${T.success}` : T.danger;
                      return (
                        <tr key={idx} style={{ borderBottom: `1px solid ${T.hoverBg}`, color: T.txtPrimary }}>
                          {momVisibleColumns.month && (
                            <td style={{ padding: '12px', fontWeight: '800', color: T.info }}>
                              {r.monthLabel}
                            </td>
                          )}
                          {momVisibleColumns.outletName && (
                            <td style={{ padding: '12px', color: T.txtPrimary, fontWeight: '700' }}>
                              {r.outletName}
                            </td>
                          )}
                          {momVisibleColumns.txCount && (
                            <td style={{ padding: '12px', textAlign: 'right', fontWeight: '600' }}>
                              {r.txCount.toLocaleString('id-ID')}
                            </td>
                          )}
                          {momVisibleColumns.grossSales && (
                            <td style={{ padding: '12px', textAlign: 'right', color: T.txtPrimary }}>
                              {formatRupiah(r.grossSales)}
                            </td>
                          )}
                          {momVisibleColumns.discount && (
                            <td style={{ padding: '12px', textAlign: 'right', color: T.danger }}>
                              {formatRupiah(r.discount)}
                            </td>
                          )}
                          {momVisibleColumns.netSales && (
                            <td style={{ padding: '12px', textAlign: 'right', fontWeight: '800', color: T.success }}>
                              {formatRupiah(r.netSales)}
                            </td>
                          )}
                          {momVisibleColumns.avgSpend && (
                            <td style={{ padding: '12px', textAlign: 'right', color: T.info }}>
                              {formatRupiah(r.avgSpend)}
                            </td>
                          )}
                          {momVisibleColumns.growth && (
                            <td style={{ padding: '12px', textAlign: 'right', fontWeight: '800', color: growthColor }}>
                              {isFirstMonth ? (
                                <span style={{ color: T.txtMuted }}>- (Baseline)</span>
                              ) : (
                                <span>
                                  {isUp ? '▲' : '▼'} {isUp ? '+' : ''}{r.growth.toFixed(1)}%
                                </span>
                              )}
                            </td>
                          )}
                        </tr>
                      );
                    })
                  )}
                </tbody>
                {aggregatedMomData.length > 0 && (
                  <tfoot>
                    {aggregatedMomData.map((m, idx) => {
                      const isMei = m.monthLabel === 'Mei 2026';
                      const isUp = m.growth >= 0;
                      const growthColor = isMei ? `${T.txtPrimary}` : isUp ? `${T.success}` : T.danger;
                      return (
                        <tr key={idx} style={{ background: 'rgba(255, 255, 255, 0.03)', borderTop: idx === 0 ? `2px solid ${T.border}` : `1px solid ${T.border}`, fontWeight: '900', color: T.txtPrimary }}>
                          {momVisibleColumns.month && <td style={{ padding: '12px' }}>AKUMULASI {m.monthLabel.toUpperCase()}</td>}
                          {momVisibleColumns.outletName && <td style={{ padding: '12px', color: T.txtSecondary }}>SEMUA CABANG</td>}
                          {momVisibleColumns.txCount && <td style={{ padding: '12px', textAlign: 'right' }}>{m.txCount.toLocaleString('id-ID')}</td>}
                          {momVisibleColumns.grossSales && <td style={{ padding: '12px', textAlign: 'right', color: T.txtPrimary }}>{formatRupiah(m.grossSales)}</td>}
                          {momVisibleColumns.discount && <td style={{ padding: '12px', textAlign: 'right', color: T.danger }}>{formatRupiah(m.discount)}</td>}
                          {momVisibleColumns.netSales && <td style={{ padding: '12px', textAlign: 'right', color: T.success, fontSize: '0.95rem' }}>{formatRupiah(m.netSales)}</td>}
                          {momVisibleColumns.avgSpend && <td style={{ padding: '12px', textAlign: 'right', color: T.info }}>{formatRupiah(m.avgSpend)}</td>}
                          {momVisibleColumns.growth && (
                            <td style={{ padding: '12px', textAlign: 'right', color: growthColor }}>
                              {isMei ? '-' : `${isUp ? '▲' : '▼'} ${isUp ? '+' : ''}${m.growth.toFixed(1)}%`}
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </div>
      )}


    </div>
  );
}
