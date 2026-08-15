import React, { useState, useMemo } from 'react';
import { Users, Plus, Search, Edit3, Trash2, X, CheckCircle2, MessageSquare, Award, Store, Calendar, DollarSign, ArrowUpDown } from 'lucide-react';
import CustomerAnalyticsDetailModal from './CustomerAnalyticsDetailModal';
import PaginationControls from './PaginationControls';
import { getThemePalette } from '../../utils/themeUtils';
import { canDeleteModule, canEditModule } from '../../utils/permissionUtils';

export default function CustomerManagement({ masterData, setMasterData, selectedBranch, userSession, themeMode = 'dark' }) {
  const T = getThemePalette(themeMode);
  const allowDelete = canDeleteModule(userSession, 'masterData', masterData?.permissionMatrix);
  const allowEdit = canEditModule(userSession, 'masterData', masterData?.permissionMatrix);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
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
  const [outletId, setOutletId] = useState('');

  // Helper to generate next sequential Membership Code (MBR-001, MBR-002)
  const generateNextMembershipCode = () => {
    const existingCodes = (masterData.customers || [])
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
    if (spend >= 10000000) return { label: 'PLATINUM', color: T.accentGold, bg: 'rgba(217, 119, 6, 0.15)' };
    if (spend >= 5000000) return { label: 'GOLD', color: T.warning, bg: 'rgba(234, 179, 8, 0.15)' };
    if (spend >= 1500000) return { label: 'SILVER', color: T.info, bg: 'rgba(59, 130, 246, 0.15)' };
    return { label: 'BRONZE', color: T.txtSecondary, bg: T.tableHeaderBg };
  };

  const formatRupiah = (val) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val || 0);
  };

  const getOutletName = (id) => {
    if (!id || id === 'ALL' || id === 'all') return 'Semua Outlet (Nasional)';
    const found = (masterData.outlets || []).find(o => String(o.id) === String(id));
    return found ? found.name : `Outlet #${id}`;
  };

  // Format WA phone link
  const getWhatsAppLink = (phoneNum) => {
    let cleaned = (phoneNum || '').replace(/\D/g, '');
    if (cleaned.startsWith('0')) {
      cleaned = '62' + cleaned.slice(1);
    }
    return `https://wa.me/${cleaned}`;
  };

  // Open Add Modal
  const handleOpenAddModal = () => {
    setEditingCustomer(null);
    setName('');
    setPhone('');
    setOutletId('ALL');
    setShowAddModal(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (cust) => {
    setEditingCustomer(cust);
    setName(cust.name || '');
    setPhone(cust.phone || '');
    setOutletId(cust.outlet_id || 'ALL');
    setShowAddModal(true);
  };

  // Handle Submit Form
  const handleSubmitCustomer = (e) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('Nama Pelanggan wajib diisi');
      return;
    }

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
            name: name.trim(),
            phone: phone.trim(),
            outlet_id: outletId
          };
        }
        return c;
      });
    } else {
      const newCustomer = {
        id: Date.now(),
        code: generateNextMembershipCode(),
        name: name.trim(),
        phone: phone.trim(),
        join_date: new Date().toISOString().split('T')[0],
        outlet_id: outletId,
        total_spend: 0
      };
      updated.customers.unshift(newCustomer);
    }

    setMasterData(updated);
    setShowAddModal(false);
    setEditingCustomer(null);
  };

  // Delete Customer
  const handleDeleteCustomer = (id, custName) => {
    if (window.confirm(`Apakah Anda yakin ingin menghapus pelanggan "${custName}"?`)) {
      const updated = {
        ...masterData,
        _lastUpdated: Date.now()
      };
      updated.customers = updated.customers.filter(c => c.id !== id);
      setMasterData(updated);
    }
  };

  const customersList = masterData.customers || [];
  
  const filtered = useMemo(() => {
    return customersList.filter(c => 
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.phone && c.phone.includes(searchTerm)) ||
      (c.code && c.code.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [customersList, searchTerm]);

  // Sorted Customers
  const sortedCustomers = useMemo(() => {
    const list = [...filtered];
    list.sort((a, b) => {
      let valA = '';
      let valB = '';

      switch (sortField) {
        case 'code':
          valA = String(a.code || '');
          valB = String(b.code || '');
          break;
        case 'name':
          valA = String(a.name || '');
          valB = String(b.name || '');
          break;
        case 'phone':
          valA = String(a.phone || '');
          valB = String(b.phone || '');
          break;
        case 'outlet':
          valA = String(getOutletName(a.outlet_id));
          valB = String(getOutletName(b.outlet_id));
          break;
        case 'join_date':
          valA = String(a.join_date || '');
          valB = String(b.join_date || '');
          break;
        case 'spend':
          return sortDirection === 'asc' 
            ? (Number(a.total_spend || 0) - Number(b.total_spend || 0))
            : (Number(b.total_spend || 0) - Number(a.total_spend || 0));
        case 'tier':
          valA = String(calculateTier(a.total_spend).label);
          valB = String(calculateTier(b.total_spend).label);
          break;
        default:
          valA = String(a.name || '');
          valB = String(b.name || '');
      }

      const comp = valA.localeCompare(valB, undefined, { numeric: true, sensitivity: 'base' });
      return sortDirection === 'asc' ? comp : -comp;
    });
    return list;
  }, [filtered, sortField, sortDirection, masterData.outlets]);

  // Pagination calculation
  const totalItems = sortedCustomers.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const paginatedCustomers = sortedCustomers.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleHeaderSort = (field) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const renderSortHeader = (field, label, align = 'left') => {
    const isActive = sortField === field;
    const icon = isActive ? (sortDirection === 'asc' ? ' ▲' : ' ▼') : ' ↕';
    return (
      <th
        onClick={() => handleHeaderSort(field)}
        style={{
          padding: '10px 10px',
          textAlign: align,
          cursor: 'pointer',
          userSelect: 'none',
          color: isActive ? T.info : T.txtSecondary,
          fontWeight: isActive ? '900' : '800'
        }}
        title={`Klik untuk mengurutkan berdasarkan ${label}`}
      >
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', justifyContent: align === 'center' ? 'center' : align === 'right' ? 'flex-end' : 'flex-start' }}>
          <span>{label}</span>
          <span style={{ fontSize: '0.66rem', opacity: isActive ? 1 : 0.4 }}>{icon}</span>
        </div>
      </th>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }} className="animate-fade-in">
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '0.96rem', fontWeight: '900', color: T.txtPrimary, letterSpacing: '-0.01em', margin: 0 }}>
            Data Pelanggan & Membership
          </h2>
          <p style={{ color: T.txtSecondary, fontSize: '0.72rem', marginTop: '2px', margin: 0 }}>
            Manajemen database pelanggan, nomor whatsapp, asal outlet, dan kualifikasi Tier Membership otomatis
          </p>
        </div>

        {allowEdit && (
          <button onClick={handleOpenAddModal} className="btn-primary" style={{ padding: '6px 12px', fontSize: '0.72rem' }}>
            <Plus size={15} />
            <span>Tambahkan Pelanggan</span>
          </button>
        )}
      </div>

      {/* Search & Quick Sort Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ position: 'relative', width: '100%', maxWidth: '360px' }}>
          <Search size={15} color={T.txtMuted} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            placeholder="Cari nama, no. whatsapp, atau no. membership..."
            value={searchTerm}
            onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            className="form-input"
            style={{ paddingLeft: '34px', background: T.inputBg, color: T.txtPrimary, borderColor: T.border, fontSize: '0.76rem', height: '34px' }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <ArrowUpDown size={14} color={T.accentGold} />
          <select
            value={sortField}
            onChange={e => setSortField(e.target.value)}
            style={{ padding: '5px 10px', background: T.cardBg2, border: `1px solid ${T.border}`, borderRadius: '6px', color: T.txtPrimary, fontSize: '0.74rem', fontWeight: '700' }}
          >
            <option value="code">No. Membership</option>
            <option value="name">Nama Pelanggan</option>
            <option value="phone">Nomor WhatsApp</option>
            <option value="outlet">Asal Outlet</option>
            <option value="join_date">Tanggal Bergabung</option>
            <option value="spend">Total Belanja</option>
            <option value="tier">Tier Membership</option>
          </select>
          <button
            type="button"
            onClick={() => setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')}
            style={{ padding: '5px 10px', background: T.cardBg2, border: `1px solid ${T.border}`, borderRadius: '6px', color: T.txtPrimary, fontSize: '0.74rem', fontWeight: '700', cursor: 'pointer' }}
          >
            {sortDirection === 'asc' ? 'Naik' : 'Turun'}
          </button>
        </div>
      </div>

      {/* Table Section */}
      <div className="glass-card" style={{ padding: '16px', background: T.cardBg, border: `1px solid ${T.border}` }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.76rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)', color: T.txtSecondary, background: T.tableHeaderBg, fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: '800' }}>
                {renderSortHeader('code', 'No. Membership (Auto)', 'left')}
                {renderSortHeader('name', 'Nama Pelanggan', 'left')}
                {renderSortHeader('phone', 'Nomor WhatsApp', 'left')}
                {renderSortHeader('outlet', 'Asal Outlet', 'left')}
                {renderSortHeader('join_date', 'Tanggal Bergabung', 'left')}
                {renderSortHeader('spend', 'Total Belanja', 'right')}
                {renderSortHeader('tier', 'Tier Membership', 'left')}
                <th style={{ padding: '10px 10px', textAlign: 'right' }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {paginatedCustomers.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: '36px', textAlign: 'center', color: T.txtSecondary, fontSize: '0.76rem' }}>
                    Belum ada data pelanggan yang cocok.
                  </td>
                </tr>
              ) : (
                paginatedCustomers.map(cust => {
                  const tier = calculateTier(cust.total_spend);
                  const rawJoin = cust.join_date || cust.created_at || '2026-07-20';
                  const joinTime = cust.join_time || '08:00';
                  const joinDate = String(rawJoin).includes(':') 
                    ? String(rawJoin) 
                    : `${String(rawJoin).split('T')[0]} ${joinTime} WIB`;
                  const cleanCustName = (cust.name || '').replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, '').trim();

                  return (
                    <tr key={cust.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)', color: T.txtPrimary }}>
                      {/* 1. NOMOR MEMBERSHIP */}
                      <td style={{ padding: '8px 10px' }}>
                        <span style={{
                          background: T.infoBg,
                          color: T.info,
                          border: `1px solid ${T.infoBorder}`,
                          padding: '3px 8px',
                          borderRadius: '6px',
                          fontWeight: '800',
                          fontSize: '0.68rem',
                          fontFamily: 'monospace'
                        }}>
                          {cust.code || `MBR-00${cust.id}`}
                        </span>
                      </td>

                      {/* 2. NAMA PELANGGAN */}
                      <td style={{ padding: '8px 10px', fontWeight: '800', fontSize: '0.76rem' }}>
                        <button
                          type="button"
                          onClick={() => setSelectedCustomerDetail(cust)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: T.info,
                            fontWeight: '800',
                            cursor: 'pointer',
                            padding: 0,
                            textAlign: 'left',
                            fontSize: '0.76rem',
                            textDecoration: 'underline'
                          }}
                          title="Klik untuk melihat papan informasi detail histori transaksi, total belanja & kuantitas menu dibeli"
                        >
                          {cleanCustName}
                        </button>
                      </td>

                      {/* 3. NOMOR WHATSAPP */}
                      <td style={{ padding: '8px 10px' }}>
                        <a
                          href={getWhatsAppLink(cust.phone)}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            color: T.success,
                            textDecoration: 'none',
                            fontWeight: '600',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            background: T.successBg,
                            padding: '2px 6px',
                            borderRadius: '4px',
                            border: `1px solid ${T.successBorder}`,
                            fontSize: '0.70rem'
                          }}
                        >
                          <MessageSquare size={13} />
                          <span>{cust.phone}</span>
                        </a>
                      </td>

                      {/* 4. ASAL OUTLET */}
                      <td style={{ padding: '14px 12px', color: T.txtPrimary }}>
                        <span style={{ background: T.cardBg2, padding: '4px 8px', borderRadius: '6px', border: `1px solid ${T.borderStrong}`, fontSize: '0.78rem' }}>
                          {getOutletName(cust.outlet_id)}
                        </span>
                      </td>

                      {/* 5. TANGGAL BERGABUNG */}
                      <td style={{ padding: '14px 12px', color: T.txtSecondary }}>
                        {joinDate}
                      </td>

                      {/* 6. TOTAL BELANJA */}
                      <td style={{ padding: '14px 12px', textAlign: 'right', fontWeight: '800', color: T.success }}>
                        {formatRupiah(cust.total_spend || 0)}
                      </td>

                      {/* 7. TIER MEMBERSHIP */}
                      <td style={{ padding: '14px 12px' }}>
                        <span style={{
                          background: tier.bg,
                          color: tier.color,
                          border: `1px solid ${tier.border}`,
                          padding: '4px 10px',
                          borderRadius: '20px',
                          fontSize: '0.75rem',
                          fontWeight: '700',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}>
                          <span>{tier.icon}</span>
                          <span>{tier.label}</span>
                        </span>
                      </td>

                      {/* 8. AKSI */}
                      <td style={{ padding: '14px 12px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                          {allowEdit && (
                            <button
                              onClick={() => handleOpenEditModal(cust)}
                              style={{
                                background: T.cardBg2,
                                color: T.txtPrimary,
                                border: `1px solid ${T.border}`,
                                padding: '5px 10px',
                                borderRadius: '6px',
                                fontSize: '0.75rem',
                                fontWeight: '600',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}
                            >
                              <Edit3 size={14} color={T.info} />
                              <span>Edit</span>
                            </button>
                          )}

                          {allowDelete && (
                            <button
                              onClick={() => handleDeleteCustomer(cust.id, cust.name)}
                              style={{
                                background: T.dangerBg,
                                color: T.danger,
                                border: `1px solid ${T.dangerBorder}`,
                                padding: '5px 10px',
                                borderRadius: '6px',
                                fontSize: '0.75rem',
                                fontWeight: '600',
                                cursor: 'pointer'
                              }}
                            >
                              <Trash2 size={14} />
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

        {/* PAGINATION CONTROLS */}
        <PaginationControls
          currentPage={currentPage}
          totalPages={totalPages}
          pageSize={pageSize}
          totalItems={totalItems}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
        />
      </div>

      {/* MODAL TAMBAH / EDIT PELANGGAN */}
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
          <div className="glass-card animate-fade-in" style={{ width: '100%', maxWidth: '480px', padding: '26px', background: T.cardBg, border: `1px solid ${T.border}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: '800', color: T.txtPrimary }}>
                {editingCustomer ? 'Edit Data Pelanggan' : 'Tambahkan Pelanggan Baru'}
              </h3>
              <button onClick={() => setShowAddModal(false)} style={{ background: 'none', border: 'none', color: T.txtSecondary, cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmitCustomer} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Field 1: Kode Pelanggan / Nomor Membership (Auto) */}
              <div>
                <label style={{ fontSize: '0.78rem', color: T.txtSecondary, display: 'block', marginBottom: '6px', fontWeight: '600' }}>
                  1. Nomor Membership (Auto Generated)
                </label>
                <div style={{
                  background: T.inputBg,
                  border: `1px solid ${T.borderStrong}`,
                  padding: '10px 14px',
                  borderRadius: '10px',
                  color: T.info,
                  fontWeight: '800',
                  fontFamily: 'monospace',
                  fontSize: '0.9rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}>
                  <span>{editingCustomer ? editingCustomer.code : generateNextMembershipCode()}</span>
                  <span style={{ fontSize: '0.7rem', color: T.success, background: T.successBg, border: `1px solid ${T.successBorder}`, padding: '2px 8px', borderRadius: '6px' }}>
                    Auto Generated
                  </span>
                </div>
              </div>

              {/* Field 2: Tanggal Bergabung (Auto) */}
              <div>
                <label style={{ fontSize: '0.78rem', color: T.txtSecondary, display: 'block', marginBottom: '6px', fontWeight: '600' }}>
                  2. Tanggal Bergabung (Auto Submit Date)
                </label>
                <div style={{ background: T.inputBg, border: `1px solid ${T.borderStrong}`, padding: '10px 14px', borderRadius: '10px', color: T.txtPrimary, fontSize: '0.85rem' }}>
                  {editingCustomer ? (editingCustomer.join_date || '2026-07-20') : new Date().toISOString().split('T')[0]}
                </div>
              </div>

              {/* Field 3: Nama Pelanggan */}
              <div>
                <label style={{ fontSize: '0.78rem', color: T.txtSecondary, display: 'block', marginBottom: '6px', fontWeight: '600' }}>
                  3. Nama Pelanggan *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Hendra Gunawan"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="form-input"
                  style={{ background: T.inputBg, color: T.txtPrimary, borderColor: T.border }}
                  autoFocus
                />
              </div>

              {/* Field 4: Nomor Kontak WhatsApp */}
              <div>
                <label style={{ fontSize: '0.78rem', color: T.txtSecondary, display: 'block', marginBottom: '6px', fontWeight: '600' }}>
                  4. Nomor Kontak WhatsApp *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: 081211112222 atau 62812..."
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  className="form-input"
                  style={{ background: T.inputBg, color: T.txtPrimary, borderColor: T.border }}
                />
                <span style={{ fontSize: '0.7rem', color: T.success, marginTop: '4px', display: 'block' }}>
                  Pastikan nomor terdaftar aktif di WhatsApp
                </span>
              </div>

              {/* Field 5: Asal Outlet */}
              <div>
                <label style={{ fontSize: '0.78rem', color: T.txtSecondary, display: 'block', marginBottom: '6px', fontWeight: '600' }}>
                  5. Asal Outlet Restoran *
                </label>
                <select
                  value={outletId}
                  onChange={e => setOutletId(e.target.value)}
                  className="form-select"
                  style={{ background: T.inputBg, color: T.txtPrimary, borderColor: T.border }}
                >
                  {masterData.outlets.map(o => (
                    <option key={o.id} value={o.id} style={{ background: T.cardBg, color: T.txtPrimary }}>
                      {o.name} ({o.code})
                    </option>
                  ))}
                </select>
              </div>

              {/* Submit Buttons */}
              <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                <button type="button" onClick={() => setShowAddModal(false)} className="btn-secondary" style={{ flex: 1, justifyContent: 'center' }}>
                  Batal
                </button>
                <button type="submit" className="btn-primary" style={{ flex: 1, justifyContent: 'center' }}>
                  Simpan Pelanggan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PAPAN INFORMASI DETAIL PELANGGAN ANALYTICS MODAL */}
      {selectedCustomerDetail && (
        <CustomerAnalyticsDetailModal
          customer={selectedCustomerDetail}
          masterData={masterData}
          onClose={() => setSelectedCustomerDetail(null)}
        />
      )}
    </div>
  );
}
