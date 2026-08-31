import React, { useState, useMemo } from 'react';
import {
  Layout, Plus, Search, Edit3, Trash2, X, CheckCircle2,
  Store, Grid, Smartphone, Users, Tag, AlertCircle,
  Clock, Coffee, Utensils, CheckSquare, Layers, Sparkles, SlidersHorizontal, RefreshCw,
  ChevronDown, ChevronUp, ChevronRight, DollarSign, TrendingUp, BarChart3, Maximize2, Minimize2
} from 'lucide-react';
import { getThemePalette } from '../../utils/themeUtils';
import { canDeleteModule, canEditModule } from '../../utils/permissionUtils';
import { getApiUrl } from '../../utils/apiConfig';

import { executePermanentDelete } from '../../utils/deleteGuard';

const formatRupiah = (num) => {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(num || 0);
};

const TABLE_ZONES = [
  'Indoor Utama (Main Dining)',
  'Outdoor / Teras Depan',
  'Area VIP / Private Room',
  'Area Lesehan',
  'Area Bar / Kasir'
];

const TABLE_STATUS_OPTIONS = [
  { value: 'Tersedia', label: 'Tersedia (Kosong)', color: '#10b981', bg: 'rgba(16, 185, 129, 0.12)', border: 'rgba(16, 185, 129, 0.3)' },
  { value: 'Terisi', label: 'Terisi (Occupied)', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.12)', border: 'rgba(239, 68, 68, 0.3)' },
  { value: 'Reserved', label: 'Reservasi (Booked)', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.12)', border: 'rgba(245, 158, 11, 0.3)' },
  { value: 'Cleaning', label: 'Perlu Dibersihkan', color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.12)', border: 'rgba(139, 92, 246, 0.3)' }
];

export default function TableManagement({ masterData, setMasterData, selectedBranch, userSession, themeMode = 'dark' }) {
  const T = getThemePalette(themeMode);
  const isLight = themeMode === 'calm_sage' || themeMode === 'soft_blue' || themeMode === 'light';
  const allowDelete = canDeleteModule(userSession, 'masterData', masterData?.permissionMatrix);
  const allowEdit = canEditModule(userSession, 'masterData', masterData?.permissionMatrix);

  // Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOutletFilter, setSelectedOutletFilter] = useState(selectedBranch || 'ALL');
  const [zoneFilter, setZoneFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Expanded Outlets Set (Default: expand the first outlet or active branch)
  const [expandedOutlets, setExpandedOutlets] = useState(() => {
    if (selectedBranch && selectedBranch !== 'ALL') {
      return { [String(selectedBranch)]: true };
    }
    return {}; // Start with containers collapsed or first expanded
  });

  // Modal States
  const [showAddModal, setShowAddModal] = useState(false);
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [editingTable, setEditingTable] = useState(null);

  // Form States (Single Add / Edit)
  const [formTableNumber, setFormTableNumber] = useState('');
  const [formTableName, setFormTableName] = useState('');
  const [formOutletId, setFormOutletId] = useState('');
  const [formZone, setFormZone] = useState(TABLE_ZONES[0]);
  const [formCapacity, setFormCapacity] = useState('4');
  const [formStatus, setFormStatus] = useState('Tersedia');

  // Form States (Batch Generator)
  const [batchOutletId, setBatchOutletId] = useState('');
  const [batchPrefix, setBatchPrefix] = useState('Meja');
  const [batchStartNum, setBatchStartNum] = useState('1');
  const [batchCount, setBatchCount] = useState('10');
  const [batchZone, setBatchZone] = useState(TABLE_ZONES[0]);
  const [batchCapacity, setBatchCapacity] = useState('4');

  const outletsList = useMemo(() => {
    return (masterData?.outlets || []).filter(o => o.name !== 'OUTLET BAYANGAN' && String(o.id) !== '1787482070905');
  }, [masterData?.outlets]);

  // Helper resolve outlet name
  const getOutletName = (outletId, fallbackName) => {
    if (!outletId && fallbackName) return fallbackName;
    const found = outletsList.find(o => String(o.id) === String(outletId) || o.code === String(outletId));
    if (found) return found.name;
    if (fallbackName && fallbackName !== 'OUTLET BAYANGAN') return fallbackName;
    return outletsList[0]?.name || 'Outlet Utama';
  };

  // Helper: Transaksi Penjualan untuk menghitung Omzet per Meja
  const salesTxs = useMemo(() => {
    return [
      ...(masterData?.salesTransactions || []),
      ...(masterData?.transactions || []),
      ...(masterData?.outletTransactions || [])
    ];
  }, [masterData]);

  // Map Omzet & Transaksi per Meja & Outlet
  const tableRevenueMap = useMemo(() => {
    const map = {}; // key: `${outletId}_${tableNumber.toLowerCase()}` -> { revenue, count }
    const outletTotalMap = {}; // key: `${outletId}` -> { revenue, count }

    salesTxs.forEach(t => {
      if (t.status === 'Void') return;
      const amount = (t.amount || t.total || 0) - (t.discount || 0);
      const outletId = String(t.outlet_id || t.branch_id || outletsList[0]?.id || 1);

      // Accumulate outlet total
      if (!outletTotalMap[outletId]) outletTotalMap[outletId] = { revenue: 0, count: 0 };
      outletTotalMap[outletId].revenue += amount;
      outletTotalMap[outletId].count += 1;

      // Extract table number
      const ot = String(t.order_type || t.type || t.service_type || t.notes || '').toLowerCase();
      let tableNo = t.table_no || t.table || t.no_meja;
      if (!tableNo) {
        const match = ot.match(/meja\s*(\d+)/i) || ot.match(/table\s*(\d+)/i);
        if (match) tableNo = match[0];
      }

      if (tableNo) {
        const cleanTable = String(tableNo).trim().toLowerCase();
        const key = `${outletId}_${cleanTable}`;
        if (!map[key]) map[key] = { revenue: 0, count: 0 };
        map[key].revenue += amount;
        map[key].count += 1;
      }
    });

    return { tableMap: map, outletMap: outletTotalMap };
  }, [salesTxs, outletsList]);

  // Normalisasi data meja lengkap
  const allNormalizedTables = useMemo(() => {
    const rawList = masterData?.tables || [];
    const flattened = [];

    rawList.forEach((item, idx) => {
      if (!item) return;

      const outletIdVal = String(item.outlet_id || outletsList[0]?.id || 1);
      const resolvedOutlet = getOutletName(outletIdVal, item.outlet_name);

      if (Array.isArray(item.table_numbers) && item.table_numbers.length > 0) {
        item.table_numbers.forEach((sub, subIdx) => {
          const tNum = sub.number || sub.table_number || `Meja ${subIdx + 1}`;
          const cleanNum = String(tNum).trim().toLowerCase();
          const revInfo = tableRevenueMap.tableMap[`${outletIdVal}_${cleanNum}`] || { revenue: 0, count: 0 };

          flattened.push({
            id: `${item.id}-${subIdx}`,
            parentId: item.id,
            table_number: tNum,
            name: sub.name || sub.number || tNum,
            zone: sub.zone || item.zone || TABLE_ZONES[0],
            capacity: Number(sub.capacity || item.capacity) || 4,
            outlet_id: outletIdVal,
            outlet_name: resolvedOutlet,
            status: sub.status || item.status || 'Tersedia',
            revenue: revInfo.revenue,
            txCount: revInfo.count
          });
        });
      } else {
        const tNum = item.table_number || item.number || item.name || `Meja ${idx + 1}`;
        const cleanNum = String(tNum).trim().toLowerCase();
        const revInfo = tableRevenueMap.tableMap[`${outletIdVal}_${cleanNum}`] || { revenue: 0, count: 0 };

        flattened.push({
          id: item.id || `table-${idx + 1}`,
          table_number: tNum,
          name: item.name || item.table_number || tNum,
          zone: item.zone || TABLE_ZONES[0],
          capacity: Number(item.capacity) || 4,
          outlet_id: outletIdVal,
          outlet_name: resolvedOutlet,
          status: item.status === 'Aktif' ? 'Tersedia' : (item.status || 'Tersedia'),
          revenue: revInfo.revenue,
          txCount: revInfo.count
        });
      }
    });

    return flattened;
  }, [masterData?.tables, outletsList, tableRevenueMap]);

  // Group Tables by Outlet Container
  const outletContainers = useMemo(() => {
    const grouped = {};

    // Inisialisasi setiap outlet
    outletsList.forEach(otl => {
      const otlId = String(otl.id);
      grouped[otlId] = {
        outlet: otl,
        tables: [],
        totalPax: 0,
        vacant: 0,
        occupied: 0,
        reserved: 0,
        cleaning: 0,
        totalRevenue: 0,
        totalTxCount: 0
      };
    });

    // Masukkan data meja ke masing-masing outlet
    allNormalizedTables.forEach(t => {
      const otlId = String(t.outlet_id);
      if (!grouped[otlId]) {
        // Fallback jika ada outlet yang belum terdaftar di list
        grouped[otlId] = {
          outlet: { id: otlId, name: t.outlet_name || 'Outlet', code: 'OTL' },
          tables: [],
          totalPax: 0,
          vacant: 0,
          occupied: 0,
          reserved: 0,
          cleaning: 0,
          totalRevenue: 0,
          totalTxCount: 0
        };
      }

      grouped[otlId].tables.push(t);
      grouped[otlId].totalPax += Number(t.capacity) || 4;
      grouped[otlId].totalRevenue += t.revenue;
      grouped[otlId].totalTxCount += t.txCount;

      if (t.status === 'Terisi' || t.status === 'Occupied') grouped[otlId].occupied++;
      else if (t.status === 'Reserved' || t.status === 'Reservasi') grouped[otlId].reserved++;
      else if (t.status === 'Cleaning') grouped[otlId].cleaning++;
      else grouped[otlId].vacant++;
    });

    // Filter outlet jika ada filter selectedOutletFilter
    let result = Object.values(grouped);
    if (selectedBranch && selectedBranch !== 'ALL' && selectedBranch !== 'Semua Restoran (Konsolidasi)') {
      result = result.filter(g => String(g.outlet.id) === String(selectedBranch));
    } else if (selectedOutletFilter !== 'ALL') {
      result = result.filter(g => String(g.outlet.id) === String(selectedOutletFilter));
    }

    return result;
  }, [outletsList, allNormalizedTables, selectedBranch, selectedOutletFilter]);

  // Overall Global KPI Stats
  const globalKpi = useMemo(() => {
    let totalTables = 0;
    let totalPax = 0;
    let vacant = 0;
    let occupied = 0;
    let reserved = 0;
    let totalRevenue = 0;

    outletContainers.forEach(c => {
      totalTables += c.tables.length;
      totalPax += c.totalPax;
      vacant += c.vacant;
      occupied += c.occupied;
      reserved += c.reserved;
      totalRevenue += c.totalRevenue;
    });

    return { totalTables, totalPax, vacant, occupied, reserved, totalRevenue };
  }, [outletContainers]);

  // Toggle Single Container
  const toggleOutletExpand = (outletId) => {
    setExpandedOutlets(prev => ({
      ...prev,
      [outletId]: !prev[outletId]
    }));
  };

  // Expand / Collapse All
  const handleExpandAll = () => {
    const next = {};
    outletContainers.forEach(c => { next[String(c.outlet.id)] = true; });
    setExpandedOutlets(next);
  };

  const handleCollapseAll = () => {
    setExpandedOutlets({});
  };

  // Quick Toggle Status Meja
  const handleQuickToggleStatus = (table) => {
    const current = table.status;
    let next = 'Tersedia';
    if (current === 'Tersedia' || current === 'Available' || current === 'Aktif') next = 'Terisi';
    else if (current === 'Terisi' || current === 'Occupied') next = 'Reserved';
    else if (current === 'Reserved' || current === 'Reservasi') next = 'Cleaning';
    else next = 'Tersedia';

    const updated = { ...masterData };
    if (!updated.tables) updated.tables = [];

    const idx = updated.tables.findIndex(t => String(t.id) === String(table.id));
    if (idx !== -1) {
      updated.tables[idx] = {
        ...updated.tables[idx],
        status: next,
        _updatedAt: Date.now()
      };
    } else {
      updated.tables = updated.tables.map(t => {
        if (String(t.id) === String(table.parentId)) {
          return {
            ...t,
            table_numbers: (t.table_numbers || []).map(sub => {
              if (sub.number === table.table_number) return { ...sub, status: next };
              return sub;
            })
          };
        }
        return t;
      });
    }

    setMasterData(updated);
    try {
      fetch(getApiUrl('/api/master-data'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated)
      }).catch(() => {});
    } catch (err) {}
  };

  // Open Add Modal for Specific Outlet
  const handleOpenAddModalForOutlet = (outletId) => {
    setEditingTable(null);
    setFormTableNumber(`Meja ${(allNormalizedTables.length + 1)}`);
    setFormTableName(`Meja ${(allNormalizedTables.length + 1)}`);
    setFormOutletId(outletId || outletsList[0]?.id || 1);
    setFormZone(TABLE_ZONES[0]);
    setFormCapacity('4');
    setFormStatus('Tersedia');
    setShowAddModal(true);
  };

  // Open Batch Modal for Specific Outlet
  const handleOpenBatchModalForOutlet = (outletId) => {
    setBatchOutletId(outletId || outletsList[0]?.id || 1);
    setBatchPrefix('Meja');
    setBatchStartNum('1');
    setBatchCount('10');
    setBatchZone(TABLE_ZONES[0]);
    setBatchCapacity('4');
    setShowBatchModal(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (table) => {
    setEditingTable(table);
    setFormTableNumber(table.table_number || table.name || '');
    setFormTableName(table.name || table.table_number || '');
    setFormOutletId(table.outlet_id || (outletsList[0]?.id || 1));
    setFormZone(table.zone || TABLE_ZONES[0]);
    setFormCapacity(String(table.capacity || 4));
    setFormStatus(table.status || 'Tersedia');
    setShowAddModal(true);
  };

  // Submit Single Form
  const handleSubmitForm = (e) => {
    e.preventDefault();
    if (!formTableNumber.trim()) {
      alert('Mohon masukkan nomor meja yang valid.');
      return;
    }

    const updated = { ...masterData };
    if (!updated.tables) updated.tables = [];

    const outletIdVal = formOutletId || outletsList[0]?.id || 1;
    const resolvedOutletName = getOutletName(outletIdVal);

    if (editingTable) {
      const idx = updated.tables.findIndex(t => String(t.id) === String(editingTable.id));
      if (idx !== -1) {
        updated.tables[idx] = {
          ...updated.tables[idx],
          table_number: formTableNumber.trim(),
          name: formTableName.trim() || formTableNumber.trim(),
          zone: formZone,
          capacity: parseInt(formCapacity, 10) || 4,
          outlet_id: outletIdVal,
          outlet_name: resolvedOutletName,
          status: formStatus,
          _updatedAt: Date.now()
        };
      } else {
        updated.tables.push({
          id: Date.now(),
          table_number: formTableNumber.trim(),
          name: formTableName.trim() || formTableNumber.trim(),
          zone: formZone,
          capacity: parseInt(formCapacity, 10) || 4,
          outlet_id: outletIdVal,
          outlet_name: resolvedOutletName,
          status: formStatus,
          _updatedAt: Date.now()
        });
      }
    } else {
      const newTable = {
        id: Date.now(),
        table_number: formTableNumber.trim(),
        name: formTableName.trim() || formTableNumber.trim(),
        zone: formZone,
        capacity: parseInt(formCapacity, 10) || 4,
        outlet_id: outletIdVal,
        outlet_name: resolvedOutletName,
        status: formStatus,
        _updatedAt: Date.now()
      };
      updated.tables.unshift(newTable);
    }

    setMasterData(updated);
    try {
      fetch(getApiUrl('/api/master-data'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated)
      }).catch(() => {});
    } catch (err) {}

    // Auto expand container
    setExpandedOutlets(prev => ({ ...prev, [String(outletIdVal)]: true }));

    setShowAddModal(false);
    setEditingTable(null);
  };

  // Submit Batch Form
  const handleSubmitBatch = (e) => {
    e.preventDefault();
    const count = parseInt(batchCount, 10) || 1;
    const startNum = parseInt(batchStartNum, 10) || 1;
    const cap = parseInt(batchCapacity, 10) || 4;
    const outletIdVal = batchOutletId || outletsList[0]?.id || 1;
    const resolvedOutletName = getOutletName(outletIdVal);

    if (count <= 0) {
      alert('Jumlah meja harus minimal 1.');
      return;
    }

    const newTables = [];
    for (let i = 0; i < count; i++) {
      const num = startNum + i;
      const numStr = `${batchPrefix} ${num}`;
      newTables.push({
        id: Date.now() + i,
        table_number: numStr,
        name: numStr,
        zone: batchZone,
        capacity: cap,
        outlet_id: outletIdVal,
        outlet_name: resolvedOutletName,
        status: 'Tersedia',
        _updatedAt: Date.now()
      });
    }

    const updated = {
      ...masterData,
      tables: [...newTables, ...(masterData?.tables || [])]
    };

    setMasterData(updated);
    try {
      fetch(getApiUrl('/api/master-data'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated)
      }).catch(() => {});
    } catch (err) {}

    // Auto expand container
    setExpandedOutlets(prev => ({ ...prev, [String(outletIdVal)]: true }));

    setShowBatchModal(false);
    alert(`🎉 Berhasil membuat ${count} meja baru untuk ${resolvedOutletName}!`);
  };

  // Delete Table
  const handleDeleteTable = (id, tableName) => {
    if (window.confirm(`Apakah Anda yakin ingin menghapus "${tableName}" dari Data Master Meja Restoran?`)) {
      executePermanentDelete({
        key: 'tables',
        id: String(id),
        name: String(tableName || '').trim(),
        masterData,
        setMasterData
      });
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }} className="animate-fade-in">
      
      {/* 1. HEADER SECTION & GLOBAL CONTROLS */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
        <div>
          <h2 style={{ fontSize: '1.05rem', fontWeight: '900', color: T.txtPrimary, letterSpacing: '-0.01em', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Layout size={22} color={T.primary} />
            <span>Manajemen Meja Restoran (Per Cabang Outlet)</span>
          </h2>
          <p style={{ color: T.txtSecondary, fontSize: '0.74rem', marginTop: '3px', margin: 0 }}>
            Struktur hierarki kontainer per cabang outlet: klik cabang untuk melihat denah meja, status ketersediaan, dan omzet riil per meja.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {/* Expand / Collapse All Controls */}
          <button
            type="button"
            onClick={handleExpandAll}
            style={{
              padding: '6px 12px',
              borderRadius: '8px',
              border: `1px solid ${T.border}`,
              background: T.cardBg,
              color: T.txtPrimary,
              fontSize: '0.72rem',
              fontWeight: '700',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Maximize2 size={13} color={T.info} />
            <span>Buka Semua Cabang</span>
          </button>

          <button
            type="button"
            onClick={handleCollapseAll}
            style={{
              padding: '6px 12px',
              borderRadius: '8px',
              border: `1px solid ${T.border}`,
              background: T.cardBg,
              color: T.txtSecondary,
              fontSize: '0.72rem',
              fontWeight: '700',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Minimize2 size={13} />
            <span>Tutup Semua</span>
          </button>

          {allowEdit && (
            <button
              onClick={() => handleOpenAddModalForOutlet(outletsList[0]?.id)}
              className="btn-primary"
              style={{
                padding: '7px 16px',
                fontSize: '0.74rem',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <Plus size={15} />
              <span>Tambah Meja Baru</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. KPI GLOBAL SUMMARY BOARD */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '12px'
      }}>
        {/* Card 1: Total Cabang & Meja */}
        <div style={{ background: T.cardBg, borderRadius: '14px', padding: '14px 16px', border: `1px solid ${T.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: T.shadowSm }}>
          <div>
            <span style={{ fontSize: '0.68rem', fontWeight: '800', color: T.txtSecondary, textTransform: 'uppercase' }}>TOTAL MEJA RESTORAN</span>
            <div style={{ fontSize: '1.25rem', fontWeight: '900', color: T.txtPrimary, marginTop: '2px' }}>
              {globalKpi.totalTables} Meja ({outletContainers.length} Cabang)
            </div>
            <span style={{ fontSize: '0.66rem', color: T.primary, fontWeight: '700' }}>{globalKpi.totalPax} Kapasitas Kursi (Pax)</span>
          </div>
          <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: isLight ? '#eef6f2' : '#1b382b', color: T.primary, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Layout size={18} />
          </div>
        </div>

        {/* Card 2: Omzet Riil Meja Dine-In */}
        <div style={{ background: T.cardBg, borderRadius: '14px', padding: '14px 16px', border: '1px solid rgba(59, 130, 246, 0.3)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: T.shadowSm }}>
          <div>
            <span style={{ fontSize: '0.68rem', fontWeight: '800', color: '#3b82f6', textTransform: 'uppercase' }}>TOTAL OMZET DINE-IN MEJA</span>
            <div style={{ fontSize: '1.25rem', fontWeight: '900', color: '#3b82f6', marginTop: '2px' }}>
              {formatRupiah(globalKpi.totalRevenue)}
            </div>
            <span style={{ fontSize: '0.66rem', color: T.txtMuted }}>Dari Riwayat Transaksi Kasir</span>
          </div>
          <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <DollarSign size={18} />
          </div>
        </div>

        {/* Card 3: Meja Tersedia (Kosong) */}
        <div style={{ background: T.cardBg, borderRadius: '14px', padding: '14px 16px', border: '1px solid rgba(16, 185, 129, 0.3)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: T.shadowSm }}>
          <div>
            <span style={{ fontSize: '0.68rem', fontWeight: '800', color: '#10b981', textTransform: 'uppercase' }}>● TERSEDIA (KOSONG)</span>
            <div style={{ fontSize: '1.25rem', fontWeight: '900', color: '#10b981', marginTop: '2px' }}>{globalKpi.vacant} Meja</div>
            <span style={{ fontSize: '0.66rem', color: T.txtMuted }}>Siap Melayani Tamu</span>
          </div>
          <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CheckCircle2 size={18} />
          </div>
        </div>

        {/* Card 4: Meja Terisi (Occupied) */}
        <div style={{ background: T.cardBg, borderRadius: '14px', padding: '14px 16px', border: '1px solid rgba(239, 68, 68, 0.3)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: T.shadowSm }}>
          <div>
            <span style={{ fontSize: '0.68rem', fontWeight: '800', color: '#ef4444', textTransform: 'uppercase' }}>● TERISI (OCCUPIED)</span>
            <div style={{ fontSize: '1.25rem', fontWeight: '900', color: '#ef4444', marginTop: '2px' }}>{globalKpi.occupied} Meja</div>
            <span style={{ fontSize: '0.66rem', color: T.txtMuted }}>Tamu Sedang Makan</span>
          </div>
          <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Utensils size={18} />
          </div>
        </div>
      </div>

      {/* 3. FILTER & SEARCH CONTROL BAR */}
      <div style={{
        background: T.cardBg,
        padding: '12px 16px',
        borderRadius: '12px',
        border: `1px solid ${T.border}`,
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '10px',
        boxShadow: T.shadowSm
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: '260px', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', width: '220px' }}>
            <Search size={14} color={T.txtMuted} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              placeholder="Cari nomor meja, zona..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '6px 10px 6px 30px',
                background: T.inputBg,
                border: `1px solid ${T.borderStrong}`,
                borderRadius: '8px',
                color: T.txtPrimary,
                fontSize: '0.74rem'
              }}
            />
          </div>

          <select
            value={selectedOutletFilter}
            onChange={e => setSelectedOutletFilter(e.target.value)}
            style={{
              padding: '6px 12px',
              background: T.inputBg,
              border: `1px solid ${T.borderStrong}`,
              borderRadius: '8px',
              color: T.txtPrimary,
              fontSize: '0.74rem',
              fontWeight: '700'
            }}
          >
            <option value="ALL">Semua Cabang Outlet</option>
            {outletsList.map(o => (
              <option key={o.id} value={o.id}>{o.name}</option>
            ))}
          </select>

          <select
            value={zoneFilter}
            onChange={e => setZoneFilter(e.target.value)}
            style={{
              padding: '6px 12px',
              background: T.inputBg,
              border: `1px solid ${T.borderStrong}`,
              borderRadius: '8px',
              color: T.txtPrimary,
              fontSize: '0.74rem',
              fontWeight: '700'
            }}
          >
            <option value="ALL">Semua Zona Area</option>
            {TABLE_ZONES.map(z => (
              <option key={z} value={z}>{z}</option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            style={{
              padding: '6px 12px',
              background: T.inputBg,
              border: `1px solid ${T.borderStrong}`,
              borderRadius: '8px',
              color: T.txtPrimary,
              fontSize: '0.74rem',
              fontWeight: '700'
            }}
          >
            <option value="ALL">Semua Status</option>
            {TABLE_STATUS_OPTIONS.map(s => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>

        <div style={{ fontSize: '0.72rem', color: T.txtSecondary, fontWeight: '700' }}>
          {outletContainers.length} Cabang Restoran
        </div>
      </div>

      {/* 4. OUTLET CONTAINERS ACCORDION (HIERARKI PER CABANG OUTLET) */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {outletContainers.map(container => {
          const otl = container.outlet;
          const otlId = String(otl.id);
          const isExpanded = !!expandedOutlets[otlId];

          // Filter tables inside this container
          const visibleTables = container.tables.filter(t => {
            if (zoneFilter !== 'ALL' && t.zone !== zoneFilter) return false;
            if (statusFilter !== 'ALL') {
              if (statusFilter === 'Tersedia' && t.status !== 'Tersedia' && t.status !== 'Available' && t.status !== 'Aktif') return false;
              if (statusFilter === 'Terisi' && t.status !== 'Terisi' && t.status !== 'Occupied') return false;
              if (statusFilter === 'Reserved' && t.status !== 'Reserved' && t.status !== 'Reservasi') return false;
              if (statusFilter === 'Cleaning' && t.status !== 'Cleaning') return false;
            }
            if (searchTerm) {
              const q = searchTerm.toLowerCase();
              if (!t.table_number.toLowerCase().includes(q) && !t.zone.toLowerCase().includes(q)) return false;
            }
            return true;
          });

          return (
            <div
              key={otlId}
              style={{
                background: T.cardBg,
                borderRadius: '16px',
                border: isExpanded ? `1.5px solid ${T.primary}` : `1px solid ${T.border}`,
                boxShadow: isExpanded ? `0 6px 20px rgba(0,0,0,0.06)` : T.shadowSm,
                overflow: 'hidden',
                transition: 'all 0.2s ease'
              }}
            >
              {/* CONTAINER HEADER (KLIK UNTUK EXPAND/COLLAPSE) */}
              <div
                onClick={() => toggleOutletExpand(otlId)}
                style={{
                  padding: '16px 20px',
                  background: isExpanded ? (isLight ? '#f4fbf7' : 'rgba(45, 122, 91, 0.12)') : T.cardBg,
                  cursor: 'pointer',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '12px',
                  borderBottom: isExpanded ? `1px solid ${T.border}` : 'none'
                }}
              >
                {/* Left: Outlet Name & Code */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '12px',
                    background: isExpanded ? T.primary : T.controlBg,
                    color: isExpanded ? '#ffffff' : T.primary,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    <Store size={20} />
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <h3 style={{ fontSize: '0.94rem', fontWeight: '900', color: T.txtPrimary, margin: 0 }}>
                        {otl.name}
                      </h3>
                      <span style={{ fontSize: '0.68rem', fontWeight: '800', color: T.primary, background: isLight ? '#eef6f2' : '#1b382b', padding: '2px 8px', borderRadius: '6px' }}>
                        {otl.code || 'CABANG'}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.72rem', color: T.txtSecondary, marginTop: '2px' }}>
                      {container.tables.length} Unit Meja Terdaftar • {container.totalPax} Kapasitas Kursi (Pax)
                    </div>
                  </div>
                </div>

                {/* Right: Metrics & Expand Icon */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                  {/* Omzet Dine-In Badge */}
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '0.64rem', color: T.txtMuted, textTransform: 'uppercase', fontWeight: '700' }}>Omzet Dine-In</span>
                    <div style={{ fontSize: '0.90rem', fontWeight: '900', color: '#3b82f6' }}>
                      {formatRupiah(container.totalRevenue)}
                    </div>
                  </div>

                  {/* Status Badges */}
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <span style={{ fontSize: '0.68rem', fontWeight: '800', color: '#10b981', background: 'rgba(16, 185, 129, 0.12)', padding: '3px 8px', borderRadius: '12px', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                      ● {container.vacant} Kosong
                    </span>
                    {container.occupied > 0 && (
                      <span style={{ fontSize: '0.68rem', fontWeight: '800', color: '#ef4444', background: 'rgba(239, 68, 68, 0.12)', padding: '3px 8px', borderRadius: '12px', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                        ● {container.occupied} Terisi
                      </span>
                    )}
                    {container.reserved > 0 && (
                      <span style={{ fontSize: '0.68rem', fontWeight: '800', color: '#f59e0b', background: 'rgba(245, 158, 11, 0.12)', padding: '3px 8px', borderRadius: '12px', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
                        ● {container.reserved} Booked
                      </span>
                    )}
                  </div>

                  {/* Chevron Button */}
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    background: T.controlBg,
                    color: T.txtPrimary,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: `1px solid ${T.border}`
                  }}>
                    {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </div>
                </div>
              </div>

              {/* CONTAINER BODY: DIJABARKAN KETIKA DI-KLIK */}
              {isExpanded && (
                <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }} className="animate-fade-in">
                  
                  {/* Action Bar Khusus Cabang Ini */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                    <div style={{ fontSize: '0.76rem', color: T.txtSecondary }}>
                      Menampilkan <strong>{visibleTables.length}</strong> meja untuk cabang <strong>{otl.name}</strong>
                    </div>

                    {allowEdit && (
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          type="button"
                          onClick={() => handleOpenBatchModalForOutlet(otl.id)}
                          style={{
                            padding: '5px 12px',
                            borderRadius: '7px',
                            border: `1px solid ${T.primary}`,
                            background: isLight ? 'rgba(45, 122, 91, 0.08)' : 'rgba(45, 122, 91, 0.20)',
                            color: T.primary,
                            fontSize: '0.72rem',
                            fontWeight: '800',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          <Sparkles size={13} />
                          <span>Generate Meja di Cabang Ini</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleOpenAddModalForOutlet(otl.id)}
                          className="btn-primary"
                          style={{
                            padding: '5px 12px',
                            fontSize: '0.72rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          <Plus size={14} />
                          <span>+ Tambah Meja</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* DAFTAR KARTU MEJA DENGAN OMZET PER MEJA */}
                  {visibleTables.length === 0 ? (
                    <div style={{ padding: '32px', textAlign: 'center', background: T.cardBg2, borderRadius: '12px', border: `1px solid ${T.border}`, color: T.txtMuted, fontSize: '0.78rem' }}>
                      Belum ada data meja di cabang ini. Klik tombol "+ Tambah Meja" untuk menambahkan meja makan.
                    </div>
                  ) : (
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(215px, 1fr))',
                      gap: '14px'
                    }}>
                      {visibleTables.map(table => {
                        const statusMeta = TABLE_STATUS_OPTIONS.find(s => s.value === table.status) || TABLE_STATUS_OPTIONS[0];

                        return (
                          <div
                            key={table.id}
                            style={{
                              background: T.cardBg2,
                              borderRadius: '14px',
                              border: `1.5px solid ${statusMeta.border}`,
                              padding: '14px',
                              display: 'flex',
                              flexDirection: 'column',
                              justifyContent: 'space-between',
                              gap: '10px',
                              boxShadow: T.shadowSm
                            }}
                          >
                            {/* Card Top: Status & Zone */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span
                                onClick={() => handleQuickToggleStatus(table)}
                                title="Klik untuk mengubah status meja dengan cepat"
                                style={{
                                  padding: '2px 8px',
                                  borderRadius: '20px',
                                  fontSize: '0.64rem',
                                  fontWeight: '800',
                                  background: statusMeta.bg,
                                  color: statusMeta.color,
                                  border: `1px solid ${statusMeta.border}`,
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px'
                                }}
                              >
                                ● {statusMeta.label.split(' ')[0]}
                                <RefreshCw size={9} style={{ opacity: 0.7 }} />
                              </span>

                              <span style={{ fontSize: '0.64rem', fontWeight: '800', color: T.txtSecondary, background: T.controlBg, padding: '2px 6px', borderRadius: '4px' }}>
                                {table.zone.split(' ')[0]}
                              </span>
                            </div>

                            {/* Card Center: Table Icon & Number */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '4px 0' }}>
                              <div style={{
                                width: '42px',
                                height: '42px',
                                borderRadius: '10px',
                                background: statusMeta.bg,
                                border: `1.5px solid ${statusMeta.color}`,
                                color: statusMeta.color,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0
                              }}>
                                <Utensils size={18} />
                              </div>
                              <div>
                                <h4 style={{ fontSize: '0.94rem', fontWeight: '900', color: T.txtPrimary, margin: 0 }}>
                                  {table.table_number}
                                </h4>
                                <span style={{ fontSize: '0.68rem', color: T.txtSecondary, fontWeight: '600' }}>
                                  {table.capacity} Kursi Pelanggan
                                </span>
                              </div>
                            </div>

                            {/* Card Omzet Board: Total Omzet dari Meja Ini */}
                            <div style={{
                              background: isLight ? '#ffffff' : 'rgba(15, 23, 42, 0.5)',
                              padding: '8px 10px',
                              borderRadius: '8px',
                              border: `1px solid ${T.border}`,
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center'
                            }}>
                              <div>
                                <span style={{ fontSize: '0.60rem', color: T.txtMuted, textTransform: 'uppercase', fontWeight: '800', display: 'block' }}>
                                  Omzet Meja Ini
                                </span>
                                <span style={{ fontSize: '0.82rem', fontWeight: '900', color: '#10b981' }}>
                                  {formatRupiah(table.revenue)}
                                </span>
                              </div>
                              <div style={{ textAlign: 'right' }}>
                                <span style={{ fontSize: '0.60rem', color: T.txtMuted, textTransform: 'uppercase', fontWeight: '800', display: 'block' }}>
                                  Transaksi
                                </span>
                                <span style={{ fontSize: '0.78rem', fontWeight: '800', color: T.info }}>
                                  {table.txCount} Struk
                                </span>
                              </div>
                            </div>

                            {/* Card Footer: Action Buttons */}
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '4px', borderTop: `1px solid ${T.border}`, paddingTop: '8px' }}>
                              {allowEdit && (
                                <button
                                  onClick={() => handleOpenEditModal(table)}
                                  style={{
                                    background: T.controlBg,
                                    border: `1px solid ${T.border}`,
                                    color: T.info,
                                    padding: '3px 6px',
                                    borderRadius: '5px',
                                    cursor: 'pointer',
                                    fontSize: '0.68rem'
                                  }}
                                  title="Edit Meja"
                                >
                                  <Edit3 size={12} />
                                </button>
                              )}

                              {allowDelete && (
                                <button
                                  onClick={() => handleDeleteTable(table.id, table.table_number)}
                                  style={{
                                    background: 'rgba(239, 68, 68, 0.1)',
                                    border: '1px solid rgba(239, 68, 68, 0.3)',
                                    color: '#ef4444',
                                    padding: '3px 6px',
                                    borderRadius: '5px',
                                    cursor: 'pointer',
                                    fontSize: '0.68rem'
                                  }}
                                  title="Hapus Meja"
                                >
                                  <Trash2 size={12} />
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 5. MODAL TAMBAH / EDIT MEJA SATUAN */}
      {showAddModal && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.75)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100
        }}>
          <div className="glass-card animate-fade-in" style={{ width: '100%', maxWidth: '440px', padding: '24px', background: T.cardBg, border: `1px solid ${T.border}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: '900', color: T.txtPrimary, margin: 0 }}>
                {editingTable ? 'Edit Data Meja' : 'Tambah Meja Baru'}
              </h3>
              <button onClick={() => setShowAddModal(false)} style={{ background: 'none', border: 'none', color: T.txtMuted, cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmitForm} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '0.76rem', color: T.txtSecondary, display: 'block', marginBottom: '4px', fontWeight: '700' }}>
                  Nomor Meja *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Meja 1, MEJA-01, VIP-1"
                  value={formTableNumber}
                  onChange={e => setFormTableNumber(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: `1px solid ${T.borderStrong}`,
                    background: T.inputBg,
                    color: T.txtPrimary,
                    fontSize: '0.84rem',
                    fontWeight: '700'
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.76rem', color: T.txtSecondary, display: 'block', marginBottom: '4px', fontWeight: '700' }}>
                  Cabang Outlet Restoran *
                </label>
                <select
                  value={formOutletId}
                  onChange={e => setFormOutletId(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: `1px solid ${T.borderStrong}`,
                    background: T.inputBg,
                    color: T.txtPrimary,
                    fontSize: '0.84rem',
                    fontWeight: '700'
                  }}
                >
                  {outletsList.map(o => (
                    <option key={o.id} value={o.id}>
                      {o.name} ({o.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.76rem', color: T.txtSecondary, display: 'block', marginBottom: '4px', fontWeight: '700' }}>
                  Zona / Area Meja
                </label>
                <select
                  value={formZone}
                  onChange={e => setFormZone(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: `1px solid ${T.borderStrong}`,
                    background: T.inputBg,
                    color: T.txtPrimary,
                    fontSize: '0.84rem',
                    fontWeight: '700'
                  }}
                >
                  {TABLE_ZONES.map(z => (
                    <option key={z} value={z}>{z}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.76rem', color: T.txtSecondary, display: 'block', marginBottom: '4px', fontWeight: '700' }}>
                  Kapasitas Kursi (Orang)
                </label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={formCapacity}
                  onChange={e => setFormCapacity(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: `1px solid ${T.borderStrong}`,
                    background: T.inputBg,
                    color: T.txtPrimary,
                    fontSize: '0.84rem',
                    fontWeight: '700'
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.76rem', color: T.txtSecondary, display: 'block', marginBottom: '4px', fontWeight: '700' }}>
                  Status Ketersediaan Meja
                </label>
                <select
                  value={formStatus}
                  onChange={e => setFormStatus(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: `1px solid ${T.borderStrong}`,
                    background: T.inputBg,
                    color: T.txtPrimary,
                    fontSize: '0.84rem',
                    fontWeight: '700'
                  }}
                >
                  {TABLE_STATUS_OPTIONS.map(s => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                <button type="button" onClick={() => setShowAddModal(false)} className="btn-secondary" style={{ flex: 1, justifyContent: 'center' }}>
                  Batal
                </button>
                <button type="submit" className="btn-primary" style={{ flex: 1, justifyContent: 'center' }}>
                  Simpan Meja
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. MODAL GENERATE MEJA MASSAL (BATCH) */}
      {showBatchModal && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.75)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100
        }}>
          <div className="glass-card animate-fade-in" style={{ width: '100%', maxWidth: '460px', padding: '24px', background: T.cardBg, border: `1px solid ${T.border}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: '900', color: T.txtPrimary, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sparkles size={18} color={T.primary} />
                <span>Generate Meja Massal</span>
              </h3>
              <button onClick={() => setShowBatchModal(false)} style={{ background: 'none', border: 'none', color: T.txtMuted, cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmitBatch} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '0.76rem', color: T.txtSecondary, display: 'block', marginBottom: '4px', fontWeight: '700' }}>
                  Pilih Cabang Outlet *
                </label>
                <select
                  value={batchOutletId}
                  onChange={e => setBatchOutletId(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: `1px solid ${T.borderStrong}`,
                    background: T.inputBg,
                    color: T.txtPrimary,
                    fontSize: '0.84rem',
                    fontWeight: '700'
                  }}
                >
                  {outletsList.map(o => (
                    <option key={o.id} value={o.id}>
                      {o.name} ({o.code})
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '0.76rem', color: T.txtSecondary, display: 'block', marginBottom: '4px', fontWeight: '700' }}>
                    Awalan (Prefix)
                  </label>
                  <input
                    type="text"
                    required
                    value={batchPrefix}
                    onChange={e => setBatchPrefix(e.target.value)}
                    placeholder="Meja"
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: `1px solid ${T.borderStrong}`,
                      background: T.inputBg,
                      color: T.txtPrimary,
                      fontSize: '0.84rem',
                      fontWeight: '700'
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.76rem', color: T.txtSecondary, display: 'block', marginBottom: '4px', fontWeight: '700' }}>
                    Mulai Nomor
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={batchStartNum}
                    onChange={e => setBatchStartNum(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: `1px solid ${T.borderStrong}`,
                      background: T.inputBg,
                      color: T.txtPrimary,
                      fontSize: '0.84rem',
                      fontWeight: '700'
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '0.76rem', color: T.txtSecondary, display: 'block', marginBottom: '4px', fontWeight: '700' }}>
                    Jumlah Meja Dibuat *
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    required
                    value={batchCount}
                    onChange={e => setBatchCount(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: `1px solid ${T.borderStrong}`,
                      background: T.inputBg,
                      color: T.txtPrimary,
                      fontSize: '0.84rem',
                      fontWeight: '700'
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.76rem', color: T.txtSecondary, display: 'block', marginBottom: '4px', fontWeight: '700' }}>
                    Kapasitas per Meja
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="30"
                    required
                    value={batchCapacity}
                    onChange={e => setBatchCapacity(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: `1px solid ${T.borderStrong}`,
                      background: T.inputBg,
                      color: T.txtPrimary,
                      fontSize: '0.84rem',
                      fontWeight: '700'
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.76rem', color: T.txtSecondary, display: 'block', marginBottom: '4px', fontWeight: '700' }}>
                  Zona / Area Meja
                </label>
                <select
                  value={batchZone}
                  onChange={e => setBatchZone(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: `1px solid ${T.borderStrong}`,
                    background: T.inputBg,
                    color: T.txtPrimary,
                    fontSize: '0.84rem',
                    fontWeight: '700'
                  }}
                >
                  {TABLE_ZONES.map(z => (
                    <option key={z} value={z}>{z}</option>
                  ))}
                </select>
              </div>

              <div style={{
                background: isLight ? '#f1f5f9' : 'rgba(15, 23, 42, 0.6)',
                padding: '10px 14px',
                borderRadius: '8px',
                border: `1px solid ${T.border}`,
                fontSize: '0.72rem',
                color: T.txtSecondary
              }}>
                ℹ️ Preview: Akan dibuat <strong>{batchCount} Meja</strong> ({batchPrefix} {batchStartNum} s/d {batchPrefix} {parseInt(batchStartNum || 1) + parseInt(batchCount || 1) - 1}) dengan kapasitas {batchCapacity} orang.
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                <button type="button" onClick={() => setShowBatchModal(false)} className="btn-secondary" style={{ flex: 1, justifyContent: 'center' }}>
                  Batal
                </button>
                <button type="submit" className="btn-primary" style={{ flex: 1, justifyContent: 'center' }}>
                  Generate Sekarang
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
