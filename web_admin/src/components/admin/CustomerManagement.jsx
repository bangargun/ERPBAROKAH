import React, { useState, useMemo } from 'react';
import {
  Users, Plus, Search, Edit3, Trash2, X, CheckCircle2,
  MessageSquare, Award, Store, Calendar, DollarSign, ArrowUpDown,
  TrendingUp, Sparkles, Filter, AlertCircle, Phone, ShoppingBag
} from 'lucide-react';
import CustomerAnalyticsDetailModal from './CustomerAnalyticsDetailModal';
import PaginationControls from './PaginationControls';
import { getThemePalette } from '../../utils/themeUtils';
import { getApiUrl } from '../../utils/apiConfig';
import { canDeleteModule, canEditModule } from '../../utils/permissionUtils';

export default function CustomerManagement({ masterData, setMasterData, selectedBranch, userSession, themeMode = 'dark' }) {
  const T = getThemePalette(themeMode);
  const allowDelete = canDeleteModule(userSession, 'masterData', masterData?.permissionMatrix);
  const allowEdit = canEditModule(userSession, 'masterData', masterData?.permissionMatrix);

  // Filter & Search States
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOutletFilter, setSelectedOutletFilter] = useState(selectedBranch || 'Semua');
  const [selectedTierFilter, setSelectedTierFilter] = useState('Semua');

  useEffect(() => {
    if (selectedBranch && selectedBranch !== 'ALL' && selectedBranch !== 'Semua Restoran (Konsolidasi)') {
      const foundName = allOutlets.find(o => String(o.id) === String(selectedBranch))?.name || String(selectedBranch);
      setSelectedOutletFilter(foundName);
    } else {
      setSelectedOutletFilter('Semua');
    }
  }, [selectedBranch, allOutlets]);

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showCleanModal, setShowCleanModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [selectedCustomerDetail, setSelectedCustomerDetail] = useState(null);

  // Sorting States
  const [sortField, setSortField] = useState('name');
  const [sortDirection, setSortDirection] = useState('asc');

  // Pagination States (Default 25 rows per page)
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Form states
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [outletId, setOutletId] = useState('ALL');

  // Outlets List
  const allOutlets = useMemo(() => masterData?.outlets || [], [masterData?.outlets]);

  // Helper to format Rupiah
  const formatRupiah = (val) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val || 0);
  };

  // Helper to generate next sequential Membership Code (MBR-001, MBR-002)
  const generateNextMembershipCode = () => {
    const existingCodes = (masterData?.customers || [])
      .map(c => c.code)
      .filter(code => code && code.startsWith('MBR-'));

    if (existingCodes.length === 0) return 'MBR-001';

    const numbers = existingCodes.map(code => {
      const numPart = code.replace('MBR-', '');
      return parseInt(numPart, 10) || 0;
    });

    const maxNum = Math.max(...numbers, 0);
    const nextNum = maxNum + 1;
    return `MBR-${nextNum.toString().padStart(3, '0')}`;
  };

  // Helper to calculate Tier Membership based on Total Spend
  const calculateTier = (totalSpend) => {
    const spend = totalSpend || 0;
    if (spend >= 10000000) return { label: 'PLATINUM', color: T.accentGold, bg: 'rgba(217, 119, 6, 0.15)', border: 'rgba(217, 119, 6, 0.3)' };
    if (spend >= 5000000) return { label: 'GOLD', color: T.warning, bg: 'rgba(234, 179, 8, 0.15)', border: 'rgba(234, 179, 8, 0.3)' };
    if (spend >= 1500000) return { label: 'SILVER', color: T.info, bg: 'rgba(59, 130, 246, 0.15)', border: 'rgba(59, 130, 246, 0.3)' };
    return { label: 'BRONZE', color: T.txtSecondary, bg: T.tableHeaderBg, border: T.border };
  };

  // -------------------------------------------------------------
  // ACCURATE OUTLET RESOLVER (LOOKUP FROM TRANSACTIONS IF MISSING)
  // -------------------------------------------------------------
  const getCustomerActualOutlet = (cust) => {
    // 1. Direct outlet_id if valid
    if (cust.outlet_id && cust.outlet_id !== 'ALL' && cust.outlet_id !== 'all') {
      const found = allOutlets.find(o => String(o.id) === String(cust.outlet_id));
      if (found) return found.name;
    }
    // 2. Direct outlet_name if not default
    if (cust.outlet_name && cust.outlet_name !== 'Semua Outlet (Nasional)' && cust.outlet_name !== 'Cabang POS') {
      return cust.outlet_name;
    }

    // 3. Fallback: Search in salesTransactions for transactions associated with this customer
    const rawSales = masterData?.salesTransactions || masterData?.transactions || [];
    const matchedTx = rawSales.find(tx =>
      (tx.customer_name && tx.customer_name.trim().toLowerCase() === cust.name?.trim().toLowerCase()) ||
      (tx.customer_id && String(tx.customer_id) === String(cust.id))
    );

    if (matchedTx) {
      if (matchedTx.branch_name || matchedTx.outlet_name) {
        return matchedTx.branch_name || matchedTx.outlet_name;
      }
      if (matchedTx.outlet_id) {
        const found = allOutlets.find(o => String(o.id) === String(matchedTx.outlet_id));
        if (found) return found.name;
      }
    }

    // If still not found, return default
    return allOutlets[0]?.name || 'AYAM BAKAR SURABAYA TEBING TINGGI';
  };

  // Format WA phone link
  const getWhatsAppLink = (phoneNum) => {
    let cleaned = (phoneNum || '').replace(/\D/g, '');
    if (cleaned.startsWith('0')) {
      cleaned = '62' + cleaned.slice(1);
    }
    return `https://wa.me/${cleaned}?text=Halo%20Pelanggan%20Setia%20Barokah%20Group!`;
  };

  // -------------------------------------------------------------
  // SUSPICIOUS / NOTE-LIKE CUSTOMER DETECTION (DATA CLEANING)
  // -------------------------------------------------------------
  const suspiciousCustomers = useMemo(() => {
    const custs = masterData?.customers || [];
    return custs.filter(c => {
      const n = (c.name || '').trim().toLowerCase();
      if (!n) return true;
      // Pure numbers (e.g. "3", "12", "1")
      if (/^\d+$/.test(n)) return true;
      // Common cashier note words
      if (n.startsWith('baju ') || n.startsWith('meja ') || n.startsWith('bapak') || n.startsWith('ibu ') || n === 'tamu' || n === 'bungkus' || n === 'takeaway' || n === 'ojol') return true;
      return false;
    });
  }, [masterData?.customers]);

  // -------------------------------------------------------------
  // KPI CALCULATIONS
  // -------------------------------------------------------------
  const kpiMetrics = useMemo(() => {
    const custs = masterData?.customers || [];
    const totalCusts = custs.length;

    let totalSpendAll = 0;
    let topSpenderName = 'Belum Ada Transaksi';
    let topSpenderAmount = 0;

    custs.forEach(c => {
      const spend = Number(c.total_spend || 0);
      totalSpendAll += spend;
      if (spend > topSpenderAmount) {
        topSpenderAmount = spend;
        topSpenderName = `${c.name} (${formatRupiah(spend)})`;
      }
    });

    const avgBasketSize = totalCusts > 0 ? Math.round(totalSpendAll / totalCusts) : 0;
    const withPhoneCount = custs.filter(c => c.phone && c.phone !== '-' && c.phone.length > 5).length;

    return {
      totalCusts,
      totalSpendAll,
      avgBasketSize,
      topSpenderName,
      withPhoneCount
    };
  }, [masterData?.customers]);

  // -------------------------------------------------------------
  // FILTERED & SORTED CUSTOMERS
  // -------------------------------------------------------------
  const filteredCustomers = useMemo(() => {
    return (masterData?.customers || [])
      .filter(c => {
        // 1. Search filter
        if (searchTerm.trim()) {
          const q = searchTerm.toLowerCase();
          const nameMatch = (c.name || '').toLowerCase().includes(q);
          const phoneMatch = (c.phone || '').toLowerCase().includes(q);
          const codeMatch = (c.code || '').toLowerCase().includes(q);
          if (!nameMatch && !phoneMatch && !codeMatch) return false;
        }

        // 2. Outlet filter
        if (selectedOutletFilter !== 'Semua') {
          const actualOutlet = getCustomerActualOutlet(c);
          if (actualOutlet !== selectedOutletFilter && String(c.outlet_id) !== String(selectedOutletFilter)) {
            return false;
          }
        }

        // 3. Tier filter
        if (selectedTierFilter !== 'Semua') {
          const tier = calculateTier(c.total_spend);
          if (tier.label !== selectedTierFilter) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortField === 'name') {
          return sortDirection === 'asc' ? (a.name || '').localeCompare(b.name || '') : (b.name || '').localeCompare(a.name || '');
        }
        if (sortField === 'total_spend') {
          return sortDirection === 'asc' ? (a.total_spend || 0) - (b.total_spend || 0) : (b.total_spend || 0) - (a.total_spend || 0);
        }
        if (sortField === 'join_date') {
          return sortDirection === 'asc' ? (a.join_date || '').localeCompare(b.join_date || '') : (b.join_date || '').localeCompare(a.join_date || '');
        }
        return 0;
      });
  }, [masterData?.customers, searchTerm, selectedOutletFilter, selectedTierFilter, sortField, sortDirection, masterData?.salesTransactions]);

  // Pagination calculation
  const totalItems = filteredCustomers.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const paginatedCustomers = useMemo(() => {
    return filteredCustomers.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  }, [filteredCustomers, currentPage, pageSize]);

  // -------------------------------------------------------------
  // FORM HANDLERS
  // -------------------------------------------------------------
  const handleOpenAddModal = () => {
    setEditingCustomer(null);
    setName('');
    setPhone('');
    setOutletId(allOutlets[0]?.id || 'ALL');
    setShowAddModal(true);
  };

  const handleOpenEditModal = (cust) => {
    setEditingCustomer(cust);
    setName(cust.name || '');
    setPhone(cust.phone === '-' ? '' : (cust.phone || ''));
    setOutletId(cust.outlet_id || allOutlets[0]?.id || 'ALL');
    setShowAddModal(true);
  };

  const handleSubmitCustomer = (e) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('Nama Pelanggan wajib diisi');
      return;
    }

    const selectedOutletObj = allOutlets.find(o => String(o.id) === String(outletId));
    const outletName = selectedOutletObj ? selectedOutletObj.name : 'AYAM BAKAR SURABAYA TEBING TINGGI';

    const updated = {
      ...masterData,
      _lastUpdated: Date.now()
    };
    if (!updated.customers) updated.customers = [];

    if (editingCustomer) {
      updated.customers = updated.customers.map(c => {
        if (c.id === editingCustomer.id) {
          return {
            ...c,
            name: name.trim().toUpperCase(),
            phone: phone.trim() || '-',
            outlet_id: outletId,
            outlet_name: outletName,
            _updatedAt: Date.now()
          };
        }
        return c;
      });
    } else {
      const newCustomer = {
        id: Date.now(),
        code: generateNextMembershipCode(),
        name: name.trim().toUpperCase(),
        phone: phone.trim() || '-',
        join_date: new Date().toISOString().split('T')[0],
        outlet_id: outletId,
        outlet_name: outletName,
        total_spend: 0,
        total_orders: 0,
        points: 0,
        _updatedAt: Date.now()
      };
      updated.customers.unshift(newCustomer);
    }

    setMasterData(updated);
    setShowAddModal(false);
    setEditingCustomer(null);
    alert(`Data pelanggan "${name.toUpperCase()}" berhasil disimpan!`);
  };

  const handleDeleteCustomer = (id, custName) => {
    if (!allowDelete) {
      alert('Anda tidak memiliki hak akses untuk menghapus data pelanggan.');
      return;
    }

    if (window.confirm(`Apakah Anda yakin ingin menghapus pelanggan "${custName}"?`)) {
      const updated = {
        ...masterData,
        _lastUpdated: Date.now(),
        customers: (masterData.customers || []).filter(c => c.id !== id)
      };
      setMasterData(updated);
      alert(`Pelanggan "${custName}" berhasil dihapus.`);
    }
  };

  // Bulk Clean Suspicious Customers
  const handleBulkCleanSuspicious = () => {
    if (!allowDelete || suspiciousCustomers.length === 0) return;

    if (!confirm(`Konfirmasi Pembersihan Data:\n\nDitemukan ${suspiciousCustomers.length} catatan kasir/nama tidak valid (misal: "3", "Baju coklat", "Bapak2").\n\nApakah Anda yakin ingin menghapus ${suspiciousCustomers.length} data ini dari master pelanggan?\n\n• Riwayat transaksi nota penjualan tetap 100% aman dan tidak terhapus.`)) {
      return;
    }

    const suspiciousIds = suspiciousCustomers.map(c => c.id);
    const updatedCustomers = (masterData?.customers || []).filter(c => !suspiciousIds.includes(c.id));

    setMasterData({
      ...masterData,
      customers: updatedCustomers,
      _lastUpdated: Date.now()
    });

    setShowCleanModal(false);
    alert(`🎉 Sukses membersihkan ${suspiciousCustomers.length} catatan kasir non-member.`);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }} className="animate-fade-in">
      {/* ------------------------------------------------------------- */}
      {/* 1. HEADER SECTION & MAIN ACTIONS                              */}
      {/* ------------------------------------------------------------- */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <h2 style={{ fontSize: '1.05rem', fontWeight: '900', color: T.txtPrimary, letterSpacing: '-0.01em', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Users size={20} color={T.primary} />
            <span>Data Pelanggan &amp; Member Restoran</span>
          </h2>
          <p style={{ color: T.txtSecondary, fontSize: '0.74rem', marginTop: '3px', margin: 0 }}>
            Manajemen database pelanggan, nomor WhatsApp, asal outlet riil cabang, dan kualifikasi Tier Membership
          </p>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          {suspiciousCustomers.length > 0 && (
            <button
              type="button"
              onClick={() => setShowCleanModal(true)}
              style={{
                padding: '8px 14px',
                fontSize: '0.76rem',
                fontWeight: '800',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: 'rgba(239, 68, 68, 0.15)',
                color: T.danger,
                border: `1px solid ${T.dangerBorder}`,
                borderRadius: '8px',
                cursor: 'pointer'
              }}
            >
              <AlertCircle size={15} />
              <span>Bersihkan {suspiciousCustomers.length} Catatan Kasir</span>
            </button>
          )}

          {allowEdit && (
            <button
              type="button"
              onClick={handleOpenAddModal}
              className="btn-primary"
              style={{ padding: '8px 16px', fontSize: '0.76rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Plus size={16} />
              <span>+ Tambah Pelanggan</span>
            </button>
          )}
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 2. SUMMARY KPI METRIC CARDS (4 CARDS)                         */}
      {/* ------------------------------------------------------------- */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
        {/* Card 1: Total Customers */}
        <div style={{ background: T.cardBg, border: `1px solid ${T.borderStrong}`, borderRadius: '14px', padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <span style={{ fontSize: '0.68rem', fontWeight: '800', color: T.txtSecondary, textTransform: 'uppercase' }}>TOTAL PELANGGAN</span>
            <div style={{ fontSize: '1.3rem', fontWeight: '900', color: T.txtPrimary, marginTop: '2px' }}>{kpiMetrics.totalCusts} Orang</div>
            <span style={{ fontSize: '0.66rem', color: T.info, fontWeight: '700' }}>{kpiMetrics.withPhoneCount} Memiliki Nomor WhatsApp</span>
          </div>
          <div style={{ padding: '8px', borderRadius: '10px', background: T.infoBg, color: T.info }}>
            <Users size={18} />
          </div>
        </div>

        {/* Card 2: Total Accumulated Spend */}
        <div style={{ background: T.cardBg, border: `1px solid ${T.borderStrong}`, borderRadius: '14px', padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <span style={{ fontSize: '0.68rem', fontWeight: '800', color: T.txtSecondary, textTransform: 'uppercase' }}>TOTAL OMZET MEMBER</span>
            <div style={{ fontSize: '1.3rem', fontWeight: '900', color: T.accentGold, marginTop: '2px' }}>{formatRupiah(kpiMetrics.totalSpendAll)}</div>
            <span style={{ fontSize: '0.66rem', color: T.success, fontWeight: '700' }}>Akumulasi Belanja POS</span>
          </div>
          <div style={{ padding: '8px', borderRadius: '10px', background: T.accentGoldBg, color: T.accentGold }}>
            <DollarSign size={18} />
          </div>
        </div>

        {/* Card 3: Average Spend per Customer */}
        <div style={{ background: T.cardBg, border: `1px solid ${T.borderStrong}`, borderRadius: '14px', padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <span style={{ fontSize: '0.68rem', fontWeight: '800', color: T.txtSecondary, textTransform: 'uppercase' }}>RATA-RATA BELANJA</span>
            <div style={{ fontSize: '1.3rem', fontWeight: '900', color: T.success, marginTop: '2px' }}>{formatRupiah(kpiMetrics.avgBasketSize)}</div>
            <span style={{ fontSize: '0.66rem', color: T.txtSecondary }}>Per Akun Pelanggan</span>
          </div>
          <div style={{ padding: '8px', borderRadius: '10px', background: T.successBg, color: T.success }}>
            <ShoppingBag size={18} />
          </div>
        </div>

        {/* Card 4: Top Spender */}
        <div style={{ background: T.cardBg, border: `1px solid ${T.borderStrong}`, borderRadius: '14px', padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <span style={{ fontSize: '0.68rem', fontWeight: '800', color: T.txtSecondary, textTransform: 'uppercase' }}>PELANGGAN TERLOYAL</span>
            <div style={{ fontSize: '0.96rem', fontWeight: '900', color: T.primary, marginTop: '2px', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '160px' }}>
              {kpiMetrics.topSpenderName}
            </div>
            <span style={{ fontSize: '0.66rem', color: T.success, fontWeight: '700' }}>Top Contributor Member</span>
          </div>
          <div style={{ padding: '8px', borderRadius: '10px', background: T.primaryBtn, color: T.navActiveTxt }}>
            <Award size={18} />
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 3. FILTER CONTROLS                                            */}
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
              placeholder="Cari nama / WA / ID Member..."
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

          {/* Tier Filter */}
          <select
            value={selectedTierFilter}
            onChange={e => { setSelectedTierFilter(e.target.value); setCurrentPage(1); }}
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
            <option value="Semua">Semua Tier Member</option>
            <option value="PLATINUM">Tier PLATINUM (≥ Rp 10 Jt)</option>
            <option value="GOLD">Tier GOLD (≥ Rp 5 Jt)</option>
            <option value="SILVER">Tier SILVER (≥ Rp 1.5 Jt)</option>
            <option value="BRONZE">Tier BRONZE (&lt; Rp 1.5 Jt)</option>
          </select>
        </div>

        {/* Right: Sort controls */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <select
            value={sortField}
            onChange={e => setSortField(e.target.value)}
            style={{
              padding: '6px 12px',
              background: T.cardBg2,
              border: `1px solid ${T.border}`,
              color: T.txtPrimary,
              borderRadius: '8px',
              fontSize: '0.74rem',
              fontWeight: '700'
            }}
          >
            <option value="name">Urutkan: Nama Pelanggan</option>
            <option value="total_spend">Urutkan: Total Belanja Tertinggi</option>
            <option value="join_date">Urutkan: Tanggal Bergabung</option>
          </select>

          <button
            type="button"
            onClick={() => setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')}
            style={{
              padding: '6px 10px',
              background: T.cardBg2,
              border: `1px solid ${T.border}`,
              color: T.txtPrimary,
              borderRadius: '8px',
              fontSize: '0.74rem',
              fontWeight: '800',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <ArrowUpDown size={13} />
            <span>{sortDirection === 'asc' ? 'A-Z / Terendah' : 'Z-A / Tertinggi'}</span>
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 4. CUSTOMERS TABLE LISTING                                    */}
      {/* ------------------------------------------------------------- */}
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
                <th style={{ padding: '10px 12px', fontWeight: '800' }}>NO. MEMBERSHIP (AUTO)</th>
                <th style={{ padding: '10px 12px', fontWeight: '800' }}>NAMA PELANGGAN</th>
                <th style={{ padding: '10px 12px', fontWeight: '800' }}>NOMOR WHATSAPP</th>
                <th style={{ padding: '10px 12px', fontWeight: '800' }}>ASAL OUTLET CABANG</th>
                <th style={{ padding: '10px 12px', fontWeight: '800' }}>TANGGAL BERGABUNG</th>
                <th style={{ padding: '10px 12px', fontWeight: '800', textAlign: 'right' }}>TOTAL BELANJA</th>
                <th style={{ padding: '10px 12px', fontWeight: '800', textAlign: 'center' }}>TIER MEMBER</th>
                <th style={{ padding: '10px 12px', fontWeight: '800', textAlign: 'center' }}>AKSI</th>
              </tr>
            </thead>
            <tbody>
              {paginatedCustomers.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: '36px', textAlign: 'center', color: T.txtMuted }}>
                    Tidak ada data pelanggan yang cocok dengan pencarian atau filter.
                  </td>
                </tr>
              ) : (
                paginatedCustomers.map(cust => {
                  const tier = calculateTier(cust.total_spend);
                  const hasPhone = cust.phone && cust.phone !== '-' && cust.phone.length > 5;
                  const actualOutlet = getCustomerActualOutlet(cust);

                  return (
                    <tr key={cust.id} style={{ borderBottom: `1px solid ${T.border}`, color: T.txtPrimary }}>
                      {/* Membership Code */}
                      <td style={{ padding: '10px 12px' }}>
                        <span style={{
                          fontFamily: 'monospace',
                          fontWeight: '800',
                          color: T.info,
                          background: T.infoBg,
                          border: `1px solid ${T.infoBorder}`,
                          padding: '2px 8px',
                          borderRadius: '6px',
                          fontSize: '0.70rem'
                        }}>
                          {cust.code || `MBR-${String(cust.id).slice(-6)}`}
                        </span>
                      </td>

                      {/* Name */}
                      <td style={{ padding: '10px 12px', fontWeight: '800', textTransform: 'uppercase' }}>
                        <button
                          type="button"
                          onClick={() => setSelectedCustomerDetail(cust)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: T.txtPrimary,
                            fontWeight: '800',
                            cursor: 'pointer',
                            padding: 0,
                            textAlign: 'left',
                            fontSize: '0.74rem'
                          }}
                        >
                          {cust.name}
                        </button>
                      </td>

                      {/* WhatsApp Phone */}
                      <td style={{ padding: '10px 12px' }}>
                        {hasPhone ? (
                          <a
                            href={getWhatsAppLink(cust.phone)}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              color: '#10b981',
                              fontWeight: '700',
                              textDecoration: 'none',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              background: 'rgba(16, 185, 129, 0.1)',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              border: '1px solid rgba(16, 185, 129, 0.2)'
                            }}
                          >
                            <MessageSquare size={12} />
                            <span>{cust.phone}</span>
                          </a>
                        ) : (
                          <span style={{ color: T.txtMuted, fontStyle: 'italic' }}>-</span>
                        )}
                      </td>

                      {/* Actual Outlet Branch */}
                      <td style={{ padding: '10px 12px' }}>
                        <span style={{
                          fontSize: '0.68rem',
                          fontWeight: '700',
                          color: T.txtPrimary,
                          background: T.cardBg2,
                          padding: '3px 8px',
                          borderRadius: '6px',
                          border: `1px solid ${T.border}`,
                          display: 'inline-block'
                        }}>
                          📍 {actualOutlet}
                        </span>
                      </td>

                      {/* Join Date */}
                      <td style={{ padding: '10px 12px', color: T.txtSecondary, fontSize: '0.70rem' }}>
                        {cust.join_date ? `${cust.join_date} 08:00 WIB` : '13 Agustus 2026'}
                      </td>

                      {/* Total Spend */}
                      <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: '900', color: T.accentGold }}>
                        {formatRupiah(cust.total_spend || 0)}
                      </td>

                      {/* Membership Tier */}
                      <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                        <span style={{
                          fontSize: '0.64rem',
                          fontWeight: '900',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          background: tier.bg,
                          color: tier.color,
                          border: `1px solid ${tier.border}`
                        }}>
                          {tier.label}
                        </span>
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                        <div style={{ display: 'inline-flex', gap: '6px' }}>
                          <button
                            type="button"
                            onClick={() => setSelectedCustomerDetail(cust)}
                            style={{ background: 'none', border: 'none', color: T.info, cursor: 'pointer', padding: '3px' }}
                            title="Analisis Detail Pelanggan"
                          >
                            <TrendingUp size={15} />
                          </button>

                          {allowEdit && (
                            <button
                              type="button"
                              onClick={() => handleOpenEditModal(cust)}
                              style={{ background: 'none', border: 'none', color: T.txtPrimary, cursor: 'pointer', padding: '3px' }}
                              title="Edit Data Pelanggan"
                            >
                              <Edit3 size={15} />
                            </button>
                          )}

                          {allowDelete && (
                            <button
                              type="button"
                              onClick={() => handleDeleteCustomer(cust.id, cust.name)}
                              style={{ background: 'none', border: 'none', color: T.danger, cursor: 'pointer', padding: '3px' }}
                              title="Hapus Pelanggan"
                            >
                              <Trash2 size={15} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

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
      {/* MODAL: TAMBAH / EDIT PELANGGAN                                */}
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
            maxWidth: '480px',
            background: T.cardBg,
            border: `1px solid ${T.borderStrong}`,
            borderRadius: '16px',
            padding: '24px',
            boxShadow: '0 25px 50px rgba(0,0,0,0.6)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: '900', color: T.txtPrimary, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Users size={18} color={T.primary} />
                  <span>{editingCustomer ? 'Edit Pelanggan' : 'Tambah Pelanggan Baru'}</span>
                </h3>
                <p style={{ fontSize: '0.72rem', color: T.txtSecondary, margin: '3px 0 0 0' }}>
                  Pendaftaran nomor membership dan asal outlet cabang
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

            <form onSubmit={handleSubmitCustomer} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Membership Code */}
              <div>
                <label style={{ fontSize: '0.72rem', color: T.txtSecondary, fontWeight: '700', display: 'block', marginBottom: '4px' }}>
                  NO. MEMBERSHIP (OTOMATIS)
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
                    {editingCustomer ? (editingCustomer.code || `MBR-${String(editingCustomer.id).slice(-6)}`) : generateNextMembershipCode()}
                  </span>
                  <span style={{ fontSize: '0.64rem', color: T.success, background: T.successBg, border: `1px solid ${T.successBorder}`, padding: '2px 6px', borderRadius: '4px', fontWeight: '800' }}>
                    ✓ Auto-Generated
                  </span>
                </div>
              </div>

              {/* Name */}
              <div>
                <label style={{ fontSize: '0.72rem', color: T.txtSecondary, fontWeight: '700', display: 'block', marginBottom: '4px' }}>
                  NAMA PELANGGAN *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: BUDI SANTOSO, SITI RAHMAH..."
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="form-input"
                  style={{ background: T.inputBg, border: `1px solid ${T.border}`, color: T.txtPrimary, textTransform: 'uppercase' }}
                  autoFocus
                />
              </div>

              {/* Phone */}
              <div>
                <label style={{ fontSize: '0.72rem', color: T.txtSecondary, fontWeight: '700', display: 'block', marginBottom: '4px' }}>
                  NOMOR WHATSAPP (OPSIONAL)
                </label>
                <input
                  type="tel"
                  placeholder="Contoh: 081234567890"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  className="form-input"
                  style={{ background: T.inputBg, border: `1px solid ${T.border}`, color: T.txtPrimary }}
                />
              </div>

              {/* Origin Outlet */}
              <div>
                <label style={{ fontSize: '0.72rem', color: T.txtSecondary, fontWeight: '700', display: 'block', marginBottom: '4px' }}>
                  ASAL OUTLET CABANG
                </label>
                <select
                  value={outletId}
                  onChange={e => setOutletId(e.target.value)}
                  className="form-select"
                  style={{ background: T.inputBg, border: `1px solid ${T.border}`, color: T.txtPrimary, width: '100%' }}
                >
                  <option value="ALL">Semua Outlet (Nasional)</option>
                  {allOutlets.map(o => (
                    <option key={o.id} value={o.id}>{o.name}</option>
                  ))}
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
                  Simpan Pelanggan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: BERSIHKAN CATATAN KASIR                                */}
      {/* ------------------------------------------------------------- */}
      {showCleanModal && (
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
            maxWidth: '640px',
            maxHeight: '85vh',
            overflowY: 'auto',
            background: T.cardBg,
            border: `1px solid ${T.borderStrong}`,
            borderRadius: '16px',
            padding: '24px',
            boxShadow: '0 25px 50px rgba(0,0,0,0.6)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: '900', color: T.txtPrimary, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Sparkles size={18} color={T.primary} />
                  <span>Pembersihan Catatan Kasir POS</span>
                </h3>
                <p style={{ fontSize: '0.72rem', color: T.txtSecondary, margin: '3px 0 0 0' }}>
                  Daftar nama yang terdeteksi sebagai nomor meja atau catatan ciri fisik kasir
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowCleanModal(false)}
                style={{ background: 'none', border: 'none', color: T.txtSecondary, cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ background: T.infoBg, border: `1px solid ${T.infoBorder}`, padding: '10px 14px', borderRadius: '10px', marginBottom: '14px', fontSize: '0.72rem', color: T.txtPrimary }}>
              <strong style={{ color: T.info }}>Catatan Keamanan:</strong> Menghapus data ini hanya merapikan database master pelanggan. <strong>Seluruh riwayat transaksi nota penjualan tetap 100% aman dan utuh.</strong>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {suspiciousCustomers.map(c => (
                <div
                  key={c.id}
                  style={{
                    background: T.inputBg,
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: `1px solid ${T.border}`,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: '0.72rem'
                  }}
                >
                  <div>
                    <span style={{ fontWeight: '800', color: T.txtPrimary }}>{c.name}</span>
                    <span style={{ fontSize: '0.66rem', color: T.txtMuted, marginLeft: '8px' }}>• Asal: {getCustomerActualOutlet(c)}</span>
                  </div>
                  <span style={{ fontWeight: '800', color: T.accentGold }}>{formatRupiah(c.total_spend || 0)}</span>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', paddingTop: '12px', borderTop: `1px solid ${T.border}` }}>
              <button
                type="button"
                onClick={() => setShowCleanModal(false)}
                style={{ background: T.cardBg2, border: `1px solid ${T.border}`, padding: '8px 16px', borderRadius: '8px', color: T.txtSecondary, fontSize: '0.76rem', fontWeight: '700', cursor: 'pointer' }}
              >
                Batal
              </button>

              <button
                type="button"
                onClick={handleBulkCleanSuspicious}
                style={{
                  padding: '8px 18px',
                  fontSize: '0.76rem',
                  fontWeight: '900',
                  background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <Trash2 size={15} />
                <span>Hapus {suspiciousCustomers.length} Catatan Ini</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: DETAIL PELANGGAN ANALYTICS                             */}
      {/* ------------------------------------------------------------- */}
      {selectedCustomerDetail && (
        <CustomerAnalyticsDetailModal
          customer={selectedCustomerDetail}
          masterData={masterData}
          onClose={() => setSelectedCustomerDetail(null)}
          themeMode={themeMode}
        />
      )}
    </div>
  );
}
