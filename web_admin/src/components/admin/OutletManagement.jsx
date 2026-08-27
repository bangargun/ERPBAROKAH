import React, { useState, useMemo } from 'react';
import {
  Store, Plus, Search, Edit3, Trash2, X, CheckCircle2,
  MapPin, Target, Users, LayoutGrid, Layers, TrendingUp,
  DollarSign, AlertCircle, Building2, Phone
} from 'lucide-react';
import OutletAnalyticsDetailModal from './OutletAnalyticsDetailModal';
import PaginationControls from './PaginationControls';
import { getThemePalette } from '../../utils/themeUtils';
import { canDeleteModule, canEditModule } from '../../utils/permissionUtils';
import { executePermanentDelete } from '../../utils/deleteGuard';

export default function OutletManagement({ masterData, setMasterData, userSession, themeMode = 'dark' }) {
  const T = getThemePalette(themeMode);
  const allowDelete = canDeleteModule(userSession, 'masterData', masterData?.permissionMatrix);
  const allowEdit = canEditModule(userSession, 'masterData', masterData?.permissionMatrix);

  // View & Filter States
  const [displayMode, setDisplayMode] = useState('grid'); // 'grid' | 'table'
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('Semua');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingOutlet, setEditingOutlet] = useState(null);
  const [selectedOutletDetail, setSelectedOutletDetail] = useState(null);

  // Pagination States
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);

  // Form states
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [targetOmzet, setTargetOmzet] = useState('50000000');
  const [employeeCount, setEmployeeCount] = useState('10');
  const [status, setStatus] = useState('Aktif');

  // Format Rupiah Helper
  const formatRupiah = (val) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val || 0);
  };

  // Helper to generate next sequential Outlet Code (OTL-001, OTL-002)
  const generateNextOutletCode = () => {
    const existingCodes = (masterData?.outlets || [])
      .map(o => o.code)
      .filter(code => code && code.startsWith('OTL-'));

    if (existingCodes.length === 0) return 'OTL-001';

    const numbers = existingCodes.map(code => {
      const numPart = code.replace('OTL-', '');
      return parseInt(numPart, 10) || 0;
    });

    const maxNum = Math.max(...numbers, 0);
    const nextNum = maxNum + 1;
    return `OTL-${nextNum.toString().padStart(3, '0')}`;
  };

  // Helper to calculate revenue for each outlet from transactions
  const getOutletRevenue = (outletId, outletName) => {
    const sales = masterData?.salesTransactions || masterData?.transactions || [];
    let total = 0;
    let txCount = 0;

    sales.forEach(tx => {
      const matchId = tx.outlet_id && (String(tx.outlet_id) === String(outletId));
      const matchName = tx.branch_name && (tx.branch_name.trim().toLowerCase() === String(outletName).trim().toLowerCase());
      if (matchId || matchName) {
        total += Number(tx.total_amount || tx.total || tx.final_amount || 0);
        txCount += 1;
      }
    });

    return { total, txCount };
  };

  // -------------------------------------------------------------
  // KPI CALCULATIONS
  // -------------------------------------------------------------
  const kpiMetrics = useMemo(() => {
    const outlets = masterData?.outlets || [];
    const sales = masterData?.salesTransactions || masterData?.transactions || [];

    const totalOutlets = outlets.length;
    const activeOutlets = outlets.filter(o => (o.status || 'Aktif') === 'Aktif').length;
    const inactiveOutlets = totalOutlets - activeOutlets;

    let totalRevenueAll = 0;
    const outletRevMap = {};

    sales.forEach(tx => {
      const rev = Number(tx.total_amount || tx.total || tx.final_amount || 0);
      totalRevenueAll += rev;
      const bKey = tx.branch_name || String(tx.outlet_id) || 'Lainnya';
      outletRevMap[bKey] = (outletRevMap[bKey] || 0) + rev;
    });

    let topBranchName = outlets[0]?.name || 'Belum Ada Cabang';
    let topBranchRev = 0;

    outlets.forEach(o => {
      const { total } = getOutletRevenue(o.id, o.name);
      if (total > topBranchRev) {
        topBranchRev = total;
        topBranchName = o.name;
      }
    });

    return {
      totalOutlets,
      activeOutlets,
      inactiveOutlets,
      totalRevenueAll,
      topBranchName,
      topBranchRev
    };
  }, [masterData?.outlets, masterData?.salesTransactions]);

  // -------------------------------------------------------------
  // FILTERED & SORTED OUTLETS
  // -------------------------------------------------------------
  const filteredOutlets = useMemo(() => {
    return (masterData?.outlets || [])
      .filter(o => {
        if (statusFilter !== 'Semua' && (o.status || 'Aktif') !== statusFilter) return false;
        if (searchTerm.trim()) {
          const q = searchTerm.toLowerCase();
          const nameMatch = (o.name || '').toLowerCase().includes(q);
          const addrMatch = (o.address || '').toLowerCase().includes(q);
          const codeMatch = (o.code || '').toLowerCase().includes(q);
          if (!nameMatch && !addrMatch && !codeMatch) return false;
        }
        return true;
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [masterData?.outlets, statusFilter, searchTerm]);

  // Pagination calculation
  const totalItems = filteredOutlets.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const paginatedOutlets = useMemo(() => {
    return filteredOutlets.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  }, [filteredOutlets, currentPage, pageSize]);

  // -------------------------------------------------------------
  // FORM HANDLERS
  // -------------------------------------------------------------
  const handleOpenAddModal = () => {
    setEditingOutlet(null);
    setCode(generateNextOutletCode());
    setName('');
    setAddress('');
    setTargetOmzet('50000000');
    setEmployeeCount('10');
    setStatus('Aktif');
    setShowAddModal(true);
  };

  const handleOpenEditModal = (outlet) => {
    setEditingOutlet(outlet);
    setCode(outlet.code || `OTL-00${outlet.id}`);
    setName(outlet.name || '');
    setAddress(outlet.address || '');
    const currentTarget = outlet.target_omzet !== undefined ? outlet.target_omzet : (outlet.monthly_budget !== undefined ? outlet.monthly_budget : (outlet.target_sales !== undefined ? outlet.target_sales : (outlet.target || '50000000')));
    setTargetOmzet(String(currentTarget));
    setEmployeeCount(String(outlet.employee_count !== undefined ? outlet.employee_count : (outlet.employees || '10')));
    setStatus(outlet.status || 'Aktif');
    setShowAddModal(true);
  };

  const handleSubmitForm = (e) => {
    e.preventDefault();
    if (!name.trim() || !address.trim()) {
      alert('Mohon isi Nama Cabang Outlet dan Alamat Lokasi');
      return;
    }

    const updated = {
      ...masterData,
      _lastUpdated: Date.now()
    };
    const currentOutlets = Array.isArray(updated.outlets) ? [...updated.outlets] : [];
    const finalCode = (code.trim() || generateNextOutletCode()).toUpperCase();
    const numTarget = Number(targetOmzet) || 0;
    const numEmployees = Number(employeeCount) || 0;

    if (editingOutlet) {
      updated.outlets = currentOutlets.map(o => {
        if (o.id === editingOutlet.id) {
          return {
            ...o,
            ...editingOutlet,
            code: finalCode,
            name: name.trim().toUpperCase(),
            address: address.trim(),
            target_omzet: numTarget,
            monthly_budget: numTarget,
            target_sales: numTarget,
            target: numTarget,
            monthly_target: numTarget,
            employee_count: numEmployees,
            employees: numEmployees,
            status: status,
            _updatedAt: Date.now()
          };
        }
        return o;
      });
    } else {
      const newOutlet = {
        id: Date.now(),
        code: finalCode,
        name: name.trim().toUpperCase(),
        address: address.trim(),
        target_omzet: numTarget,
        monthly_budget: numTarget,
        target_sales: numTarget,
        target: numTarget,
        monthly_target: numTarget,
        employee_count: numEmployees,
        employees: numEmployees,
        status: status,
        created_at: new Date().toISOString(),
        _updatedAt: Date.now()
      };
      updated.outlets = [newOutlet, ...currentOutlets];
    }

    setMasterData(updated);
    setShowAddModal(false);
    setEditingOutlet(null);

    // Langsung push ke server VPS MySQL secara eksplisit
    try {
      fetch(getApiUrl('/api/master-data'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated)
      }).catch(err => console.warn('Failed to push outlet to server:', err));
    } catch (e) {
      console.warn('Push error:', e);
    }
  };

  // Delete Outlet (Delete Guard)
  const handleDeleteOutlet = (id, outletName) => {
    if (!allowDelete) {
      alert('Anda tidak memiliki hak akses untuk menghapus cabang outlet.');
      return;
    }

    const { total, txCount } = getOutletRevenue(id, outletName);
    if (txCount > 0) {
      alert(`⚠️ PENGAMAN HAPUS (DELETE GUARD):\n\nCabang Outlet "${outletName}" tidak dapat dihapus karena telah memiliki ${txCount} riwayat transaksi penjualan senilai ${formatRupiah(total)}.\n\nJika outlet sudah tidak beroperasi, silakan ubah statusnya menjadi "Inaktif".`);
      return;
    }

    if (window.confirm(`Apakah Anda yakin ingin menghapus outlet "${outletName}" secara permanen?`)) {
      executePermanentDelete({
        key: 'outlets',
        id,
        name: outletName,
        masterData,
        setMasterData
      });

      alert(`Outlet "${outletName}" berhasil dihapus secara permanen dari Web Admin, POS Kasir, dan Database.`);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }} className="animate-fade-in">
      {/* ------------------------------------------------------------- */}
      {/* 1. HEADER SECTION & MAIN ACTIONS                              */}
      {/* ------------------------------------------------------------- */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <h2 style={{ fontSize: '1.05rem', fontWeight: '900', color: T.txtPrimary, letterSpacing: '-0.01em', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Store size={20} color={T.primary} />
            <span>Data Cabang Restoran (Multi-Outlet)</span>
          </h2>
          <p style={{ color: T.txtSecondary, fontSize: '0.74rem', marginTop: '3px', margin: 0 }}>
            Kelola data cabang restoran, alamat lokasi, target omzet bulanan, dan status operasional outlet
          </p>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          {allowEdit && (
            <button
              type="button"
              onClick={handleOpenAddModal}
              className="btn-primary"
              style={{ padding: '8px 16px', fontSize: '0.76rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Plus size={16} />
              <span>+ Tambahkan Cabang Outlet</span>
            </button>
          )}
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 2. SUMMARY KPI METRIC CARDS (4 CARDS)                         */}
      {/* ------------------------------------------------------------- */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
        {/* Card 1: Total Outlets */}
        <div style={{ background: T.cardBg, border: `1px solid ${T.borderStrong}`, borderRadius: '14px', padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <span style={{ fontSize: '0.68rem', fontWeight: '800', color: T.txtSecondary, textTransform: 'uppercase' }}>TOTAL CABANG</span>
            <div style={{ fontSize: '1.3rem', fontWeight: '900', color: T.txtPrimary, marginTop: '2px' }}>{kpiMetrics.totalOutlets} Outlet</div>
            <span style={{ fontSize: '0.66rem', color: T.info, fontWeight: '700' }}>{kpiMetrics.activeOutlets} Cabang Aktif Beroperasi</span>
          </div>
          <div style={{ padding: '8px', borderRadius: '10px', background: T.infoBg, color: T.info }}>
            <Building2 size={18} />
          </div>
        </div>

        {/* Card 2: Status Outlets */}
        <div style={{ background: T.cardBg, border: `1px solid ${T.borderStrong}`, borderRadius: '14px', padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <span style={{ fontSize: '0.68rem', fontWeight: '800', color: T.txtSecondary, textTransform: 'uppercase' }}>STATUS CABANG</span>
            <div style={{ fontSize: '1.3rem', fontWeight: '900', color: T.success, marginTop: '2px' }}>{kpiMetrics.activeOutlets} Aktif</div>
            <span style={{ fontSize: '0.66rem', color: kpiMetrics.inactiveOutlets > 0 ? T.danger : T.txtMuted, fontWeight: '700' }}>
              {kpiMetrics.inactiveOutlets} Cabang Non-Aktif
            </span>
          </div>
          <div style={{ padding: '8px', borderRadius: '10px', background: T.successBg, color: T.success }}>
            <CheckCircle2 size={18} />
          </div>
        </div>

        {/* Card 3: Total Consolidated Revenue */}
        <div style={{ background: T.cardBg, border: `1px solid ${T.borderStrong}`, borderRadius: '14px', padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <span style={{ fontSize: '0.68rem', fontWeight: '800', color: T.txtSecondary, textTransform: 'uppercase' }}>TOTAL OMZET KONSOLIDASI</span>
            <div style={{ fontSize: '1.3rem', fontWeight: '900', color: T.accentGold, marginTop: '2px' }}>{formatRupiah(kpiMetrics.totalRevenueAll)}</div>
            <span style={{ fontSize: '0.66rem', color: T.success, fontWeight: '700' }}>Akumulasi Seluruh Cabang</span>
          </div>
          <div style={{ padding: '8px', borderRadius: '10px', background: T.accentGoldBg, color: T.accentGold }}>
            <DollarSign size={18} />
          </div>
        </div>

        {/* Card 4: Top Performing Branch */}
        <div style={{ background: T.cardBg, border: `1px solid ${T.borderStrong}`, borderRadius: '14px', padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <span style={{ fontSize: '0.68rem', fontWeight: '800', color: T.txtSecondary, textTransform: 'uppercase' }}>CABANG TERLARIS</span>
            <div style={{ fontSize: '0.96rem', fontWeight: '900', color: T.primary, marginTop: '2px', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '160px' }}>
              {kpiMetrics.topBranchName}
            </div>
            <span style={{ fontSize: '0.66rem', color: T.success, fontWeight: '700' }}>
              {kpiMetrics.topBranchRev > 0 ? `Omzet ${formatRupiah(kpiMetrics.topBranchRev)}` : 'Top Branch Contributor'}
            </span>
          </div>
          <div style={{ padding: '8px', borderRadius: '10px', background: T.primaryBtn, color: T.navActiveTxt }}>
            <TrendingUp size={18} />
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 3. FILTER CONTROLS & DISPLAY SWITCHER                         */}
      {/* ------------------------------------------------------------- */}
      <div style={{
        background: T.cardBg,
        border: `1px solid ${T.borderStrong}`,
        borderRadius: '14px',
        padding: '12px 16px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '10px'
      }}>
        {/* Left: Search and Filters */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Search Box */}
          <div style={{ position: 'relative', width: '240px' }}>
            <Search size={14} color={T.txtMuted} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              placeholder="Cari nama / alamat / kode cabang..."
              value={searchTerm}
              onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              style={{
                width: '100%',
                padding: '6px 10px 6px 30px',
                background: T.inputBg,
                border: `1px solid ${T.border}`,
                borderRadius: '8px',
                color: T.txtPrimary,
                fontSize: '0.74rem',
                outline: 'none'
              }}
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={e => { setStatusFilter(e.target.value); setCurrentPage(1); }}
            style={{
              padding: '6px 12px',
              background: T.inputBg,
              border: `1px solid ${T.border}`,
              color: T.txtPrimary,
              borderRadius: '8px',
              fontSize: '0.74rem',
              fontWeight: '700',
              outline: 'none',
              cursor: 'pointer'
            }}
          >
            <option value="Semua">Semua Status Cabang</option>
            <option value="Aktif">Hanya Cabang Aktif</option>
            <option value="Inaktif">Hanya Cabang Non-Aktif</option>
          </select>
        </div>

        {/* Right: Display Mode Switcher */}
        <div style={{ display: 'flex', gap: '4px', background: T.cardBg2, padding: '3px', borderRadius: '8px', border: `1px solid ${T.borderStrong}` }}>
          <button
            type="button"
            onClick={() => setDisplayMode('grid')}
            style={{
              padding: '5px 10px',
              borderRadius: '6px',
              border: 'none',
              background: displayMode === 'grid' ? T.primary : 'transparent',
              color: displayMode === 'grid' ? T.txtInverse : T.txtSecondary,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '0.72rem',
              fontWeight: '800'
            }}
          >
            <LayoutGrid size={14} />
            <span>Grid</span>
          </button>

          <button
            type="button"
            onClick={() => setDisplayMode('table')}
            style={{
              padding: '5px 10px',
              borderRadius: '6px',
              border: 'none',
              background: displayMode === 'table' ? T.primary : 'transparent',
              color: displayMode === 'table' ? T.txtInverse : T.txtSecondary,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '0.72rem',
              fontWeight: '800'
            }}
          >
            <Layers size={14} />
            <span>Tabel</span>
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 4. OUTLETS LISTING (GRID OR TABLE)                            */}
      {/* ------------------------------------------------------------- */}
      {filteredOutlets.length === 0 ? (
        <div style={{
          background: T.cardBg,
          border: `1px solid ${T.borderStrong}`,
          borderRadius: '16px',
          padding: '48px 24px',
          textAlign: 'center',
          color: T.txtMuted
        }}>
          <Store size={36} color={T.txtMuted} style={{ margin: '0 auto 12px auto' }} />
          <h4 style={{ fontSize: '0.94rem', fontWeight: '800', color: T.txtPrimary, margin: 0 }}>Tidak ada cabang outlet ditemukan</h4>
          <p style={{ fontSize: '0.74rem', color: T.txtSecondary, marginTop: '4px' }}>Coba ubah kata kunci pencarian atau filter status cabang.</p>
        </div>
      ) : displayMode === 'grid' ? (
        /* GRID MODE */
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '14px' }}>
          {paginatedOutlets.map(outlet => {
            const isAktif = (outlet.status || 'Aktif') === 'Aktif';
            const { total: revenue, txCount } = getOutletRevenue(outlet.id, outlet.name);
            const target = Number(outlet.target_omzet || outlet.target || 50000000);
            const empCount = Number(outlet.employee_count || outlet.employees || 10);
            const progressPct = target > 0 ? Math.min(100, Math.round((revenue / target) * 100)) : 0;

            return (
              <div
                key={outlet.id}
                className="glass-card"
                style={{
                  background: T.cardBg,
                  border: `1px solid ${T.borderStrong}`,
                  borderRadius: '14px',
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '12px'
                }}
              >
                <div>
                  {/* Code & Status */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{
                      fontFamily: 'monospace',
                      fontSize: '0.68rem',
                      fontWeight: '800',
                      background: T.infoBg,
                      color: T.info,
                      padding: '2px 6px',
                      borderRadius: '6px',
                      border: `1px solid ${T.infoBorder}`
                    }}>
                      {outlet.code || `OTL-00${outlet.id}`}
                    </span>

                    <span style={{
                      fontSize: '0.64rem',
                      fontWeight: '800',
                      padding: '2px 8px',
                      borderRadius: '20px',
                      background: isAktif ? T.successBg : T.dangerBg,
                      color: isAktif ? T.success : T.danger,
                      border: `1px solid ${isAktif ? T.successBorder : T.dangerBorder}`
                    }}>
                      ● {isAktif ? 'Aktif' : 'Inaktif'}
                    </span>
                  </div>

                  {/* Branch Name */}
                  <h3 style={{ fontSize: '0.94rem', fontWeight: '900', color: T.txtPrimary, margin: '0 0 6px 0', textTransform: 'uppercase' }}>
                    {outlet.name}
                  </h3>

                  {/* Location Address */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.72rem', color: T.txtSecondary, marginBottom: '10px' }}>
                    <MapPin size={13} color={T.primary} style={{ flexShrink: 0 }} />
                    <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                      {outlet.address || 'Alamat Cabang'}
                    </span>
                  </div>

                  {/* Revenue & Target Box */}
                  <div style={{ background: T.cardBg2, border: `1px solid ${T.borderStrong}`, borderRadius: '10px', padding: '10px 12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <div>
                        <span style={{ fontSize: '0.62rem', color: T.txtSecondary, fontWeight: '700' }}>REALISASI OMZET</span>
                        <div style={{ fontSize: '1.05rem', fontWeight: '900', color: T.accentGold }}>{formatRupiah(revenue)}</div>
                        <span style={{ fontSize: '0.62rem', color: T.txtMuted }}>{txCount} Transaksi POS</span>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ fontSize: '0.62rem', color: T.txtSecondary, fontWeight: '700' }}>TARGET BULANAN</span>
                        <div style={{ fontSize: '0.86rem', fontWeight: '800', color: T.txtPrimary }}>{formatRupiah(target)}</div>
                        <span style={{ fontSize: '0.64rem', color: progressPct >= 100 ? T.success : T.accentGold, fontWeight: '800' }}>
                          {progressPct}% Tercapai
                        </span>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div style={{ width: '100%', height: '6px', background: T.inputBg, borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{
                        width: `${progressPct}%`,
                        height: '100%',
                        background: progressPct >= 100 ? 'linear-gradient(90deg, #10b981 0%, #059669 100%)' : 'linear-gradient(90deg, #f59e0b 0%, #d97706 100%)',
                        borderRadius: '4px'
                      }} />
                    </div>
                  </div>

                  {/* Employees count */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.68rem', color: T.txtSecondary, marginTop: '8px' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Users size={12} color={T.txtMuted} />
                      <span>{empCount} Karyawan / Staf</span>
                    </span>
                  </div>
                </div>

                {/* Bottom Actions */}
                <div style={{ display: 'flex', gap: '6px', paddingTop: '10px', borderTop: `1px solid ${T.border}` }}>
                  <button
                    type="button"
                    onClick={() => setSelectedOutletDetail(outlet)}
                    style={{
                      flex: 1,
                      padding: '6px',
                      borderRadius: '6px',
                      border: `1px solid ${T.border}`,
                      background: T.cardBg2,
                      color: T.info,
                      fontSize: '0.70rem',
                      fontWeight: '800',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px'
                    }}
                  >
                    <TrendingUp size={13} />
                    <span>Analisis</span>
                  </button>

                  {allowEdit && (
                    <button
                      type="button"
                      onClick={() => handleOpenEditModal(outlet)}
                      style={{
                        flex: 1,
                        padding: '6px',
                        borderRadius: '6px',
                        border: `1px solid ${T.border}`,
                        background: T.cardBg2,
                        color: T.txtPrimary,
                        fontSize: '0.70rem',
                        fontWeight: '800',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '4px'
                      }}
                    >
                      <Edit3 size={13} />
                      <span>Edit</span>
                    </button>
                  )}

                  {allowDelete && (
                    <button
                      type="button"
                      onClick={() => handleDeleteOutlet(outlet.id, outlet.name)}
                      style={{
                        padding: '6px 8px',
                        borderRadius: '6px',
                        border: `1px solid ${T.dangerBorder}`,
                        background: T.dangerBg,
                        color: T.danger,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                      title="Hapus Cabang Outlet"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* TABLE MODE */
        <div style={{
          background: T.cardBg,
          border: `1px solid ${T.borderStrong}`,
          borderRadius: '16px',
          overflow: 'hidden',
          boxShadow: T.shadowSm
        }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.74rem' }}>
              <thead>
                <tr style={{ background: T.tableHeaderBg, borderBottom: `1px solid ${T.border}`, color: T.txtMuted }}>
                  <th style={{ padding: '10px 12px', fontWeight: '800' }}>KODE (AUTO)</th>
                  <th style={{ padding: '10px 12px', fontWeight: '800' }}>NAMA CABANG OUTLET</th>
                  <th style={{ padding: '10px 12px', fontWeight: '800' }}>ALAMAT LOKASI</th>
                  <th style={{ padding: '10px 12px', fontWeight: '800', textAlign: 'right' }}>REALISASI OMZET</th>
                  <th style={{ padding: '10px 12px', fontWeight: '800', textAlign: 'right' }}>TARGET OMZET</th>
                  <th style={{ padding: '10px 12px', fontWeight: '800', textAlign: 'center' }}>KARYAWAN</th>
                  <th style={{ padding: '10px 12px', fontWeight: '800', textAlign: 'center' }}>STATUS</th>
                  <th style={{ padding: '10px 12px', fontWeight: '800', textAlign: 'center' }}>AKSI</th>
                </tr>
              </thead>
              <tbody>
                {paginatedOutlets.map(outlet => {
                  const isAktif = (outlet.status || 'Aktif') === 'Aktif';
                  const { total: revenue, txCount } = getOutletRevenue(outlet.id, outlet.name);
                  const target = Number(outlet.target_omzet || outlet.target || 50000000);
                  const empCount = Number(outlet.employee_count || outlet.employees || 10);

                  return (
                    <tr key={outlet.id} style={{ borderBottom: `1px solid ${T.border}`, color: T.txtPrimary }}>
                      {/* Code */}
                      <td style={{ padding: '10px 12px' }}>
                        <span style={{ fontFamily: 'monospace', fontWeight: '800', color: T.info, background: T.infoBg, border: `1px solid ${T.infoBorder}`, padding: '2px 6px', borderRadius: '4px' }}>
                          {outlet.code || `OTL-00${outlet.id}`}
                        </span>
                      </td>

                      {/* Name */}
                      <td style={{ padding: '10px 12px', fontWeight: '800', textTransform: 'uppercase' }}>
                        <button
                          type="button"
                          onClick={() => setSelectedOutletDetail(outlet)}
                          style={{ background: 'none', border: 'none', color: T.txtPrimary, fontWeight: '800', cursor: 'pointer', padding: 0, textTransform: 'uppercase' }}
                        >
                          {outlet.name}
                        </button>
                      </td>

                      {/* Address */}
                      <td style={{ padding: '10px 12px', color: T.txtSecondary }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <MapPin size={12} color={T.txtMuted} />
                          <span>{outlet.address}</span>
                        </div>
                      </td>

                      {/* Actual Revenue */}
                      <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: '900', color: T.accentGold }}>
                        {formatRupiah(revenue)}
                        <span style={{ fontSize: '0.64rem', color: T.txtMuted, display: 'block', fontWeight: 'normal' }}>({txCount} tx)</span>
                      </td>

                      {/* Target */}
                      <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: '700', color: T.txtPrimary }}>
                        {formatRupiah(target)}
                      </td>

                      {/* Employees */}
                      <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                        <span style={{ background: T.cardBg2, padding: '2px 8px', borderRadius: '6px', border: `1px solid ${T.border}`, fontWeight: '800' }}>
                          {empCount} Staf
                        </span>
                      </td>

                      {/* Status */}
                      <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                        <span style={{
                          fontSize: '0.64rem',
                          fontWeight: '800',
                          padding: '2px 8px',
                          borderRadius: '20px',
                          background: isAktif ? T.successBg : T.dangerBg,
                          color: isAktif ? T.success : T.danger,
                          border: `1px solid ${isAktif ? T.successBorder : T.dangerBorder}`
                        }}>
                          ● {isAktif ? 'Aktif' : 'Inaktif'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                        <div style={{ display: 'inline-flex', gap: '6px' }}>
                          <button
                            type="button"
                            onClick={() => setSelectedOutletDetail(outlet)}
                            style={{ background: 'none', border: 'none', color: T.info, cursor: 'pointer', padding: '3px' }}
                            title="Analisis Kinerja Cabang"
                          >
                            <TrendingUp size={15} />
                          </button>

                          {allowEdit && (
                            <button
                              type="button"
                              onClick={() => handleOpenEditModal(outlet)}
                              style={{ background: 'none', border: 'none', color: T.txtPrimary, cursor: 'pointer', padding: '3px' }}
                              title="Edit Data Cabang"
                            >
                              <Edit3 size={15} />
                            </button>
                          )}

                          {allowDelete && (
                            <button
                              type="button"
                              onClick={() => handleDeleteOutlet(outlet.id, outlet.name)}
                              style={{ background: 'none', border: 'none', color: T.danger, cursor: 'pointer', padding: '3px' }}
                              title="Hapus Cabang"
                            >
                              <Trash2 size={15} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 5. PAGINATION CONTROLS                                        */}
      {/* ------------------------------------------------------------- */}
      <PaginationControls
        currentPage={currentPage}
        totalPages={totalPages}
        pageSize={pageSize}
        totalItems={totalItems}
        onPageChange={setCurrentPage}
        onPageSizeChange={setPageSize}
      />

      {/* ------------------------------------------------------------- */}
      {/* MODAL: TAMBAH / EDIT CABANG OUTLET                            */}
      {/* ------------------------------------------------------------- */}
      {showAddModal && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0, 0, 0, 0.8)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '16px'
        }}>
          <div className="glass-card animate-fade-in" style={{
            width: '100%',
            maxWidth: '520px',
            background: T.cardBg,
            border: `1px solid ${T.borderStrong}`,
            borderRadius: '16px',
            padding: '24px',
            boxShadow: '0 25px 50px rgba(0,0,0,0.6)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: '900', color: T.txtPrimary, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Store size={18} color={T.primary} />
                  <span>{editingOutlet ? 'Edit Data Cabang Outlet' : 'Tambah Cabang Outlet Baru'}</span>
                </h3>
                <p style={{ fontSize: '0.72rem', color: T.txtSecondary, margin: '3px 0 0 0' }}>
                  Konfigurasi kode cabang, alamat operasional, dan target omzet
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                style={{ background: 'none', border: 'none', color: T.txtSecondary, cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmitForm} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Code */}
              <div>
                <label style={{ fontSize: '0.72rem', color: T.txtSecondary, fontWeight: '700', display: 'block', marginBottom: '4px' }}>
                  KODE CABANG OUTLET (OTOMATIS)
                </label>
                <div style={{
                  background: T.inputBg,
                  border: `1px solid ${T.border}`,
                  padding: '8px 12px',
                  borderRadius: '8px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <span style={{ fontFamily: 'monospace', fontWeight: '900', color: T.info, fontSize: '0.86rem' }}>
                    {editingOutlet ? (editingOutlet.code || `OTL-00${editingOutlet.id}`) : generateNextOutletCode()}
                  </span>
                  <span style={{ fontSize: '0.64rem', color: T.success, background: T.successBg, border: `1px solid ${T.successBorder}`, padding: '2px 6px', borderRadius: '4px', fontWeight: '800' }}>
                    ✓ Auto-Generated
                  </span>
                </div>
              </div>

              {/* Name */}
              <div>
                <label style={{ fontSize: '0.72rem', color: T.txtSecondary, fontWeight: '700', display: 'block', marginBottom: '4px' }}>
                  NAMA CABANG RESTORAN *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: AYAM BAKAR SURABAYA TEBING TINGGI..."
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="form-input"
                  style={{ background: T.inputBg, border: `1px solid ${T.border}`, color: T.txtPrimary, textTransform: 'uppercase' }}
                  autoFocus
                />
              </div>

              {/* Address */}
              <div>
                <label style={{ fontSize: '0.72rem', color: T.txtSecondary, fontWeight: '700', display: 'block', marginBottom: '4px' }}>
                  ALAMAT LENGKAP LOKASI *
                </label>
                <textarea
                  required
                  rows={2}
                  placeholder="Contoh: Jl. Ahmad Yani No. 12, Tebing Tinggi..."
                  value={address}
                  onChange={e => setAddress(e.target.value)}
                  className="form-input"
                  style={{ background: T.inputBg, border: `1px solid ${T.border}`, color: T.txtPrimary, resize: 'none' }}
                />
              </div>

              {/* Target Omzet & Employee Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.72rem', color: T.txtSecondary, fontWeight: '700', display: 'block', marginBottom: '4px' }}>
                    TARGET OMZET BULANAN (RP)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={targetOmzet}
                    onChange={e => setTargetOmzet(e.target.value)}
                    className="form-input"
                    style={{ background: T.inputBg, border: `1px solid ${T.border}`, color: T.accentGold, fontWeight: '900' }}
                  />
                  <span style={{ fontSize: '0.62rem', color: T.txtMuted, marginTop: '2px', display: 'block' }}>
                    {formatRupiah(targetOmzet)}
                  </span>
                </div>

                <div>
                  <label style={{ fontSize: '0.72rem', color: T.txtSecondary, fontWeight: '700', display: 'block', marginBottom: '4px' }}>
                    JUMLAH KARYAWAN / STAF
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={employeeCount}
                    onChange={e => setEmployeeCount(e.target.value)}
                    className="form-input"
                    style={{ background: T.inputBg, border: `1px solid ${T.border}`, color: T.txtPrimary }}
                  />
                </div>
              </div>

              {/* Status */}
              <div>
                <label style={{ fontSize: '0.72rem', color: T.txtSecondary, fontWeight: '700', display: 'block', marginBottom: '4px' }}>
                  STATUS OPERASIONAL CABANG
                </label>
                <select
                  value={status}
                  onChange={e => setStatus(e.target.value)}
                  className="form-select"
                  style={{ background: T.inputBg, border: `1px solid ${T.border}`, color: T.txtPrimary, width: '100%' }}
                >
                  <option value="Aktif">● Aktif Beroperasi</option>
                  <option value="Inaktif">● Non-Aktif / Ditutup Sementara</option>
                </select>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '12px' }}>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  style={{ background: T.cardBg2, border: `1px solid ${T.border}`, padding: '8px 16px', borderRadius: '8px', color: T.txtSecondary, fontSize: '0.76rem', fontWeight: '700', cursor: 'pointer' }}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  style={{ padding: '8px 20px', fontSize: '0.76rem', fontWeight: '800' }}
                >
                  Simpan Cabang Outlet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: DETAIL OUTLET ANALYTICS                                */}
      {/* ------------------------------------------------------------- */}
      {selectedOutletDetail && (
        <OutletAnalyticsDetailModal
          outlet={selectedOutletDetail}
          masterData={masterData}
          onClose={() => setSelectedOutletDetail(null)}
          themeMode={themeMode}
        />
      )}
    </div>
  );
}
