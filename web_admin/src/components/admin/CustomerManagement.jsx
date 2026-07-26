import React, { useState } from 'react';
import { Users, Plus, Search, Edit3, Trash2, X, CheckCircle2, MessageSquare, Award, Store, Calendar, DollarSign } from 'lucide-react';
import CustomerAnalyticsDetailModal from './CustomerAnalyticsDetailModal';
import PaginationControls from './PaginationControls';

export default function CustomerManagement({ masterData, setMasterData }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [selectedCustomerDetail, setSelectedCustomerDetail] = useState(null);

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
    const spend = parseFloat(totalSpend) || 0;
    if (spend > 5000000) {
      return { label: 'Customer VIP', color: '#fbbf24', bg: 'rgba(245,158,11,0.15)', border: 'rgba(245,158,11,0.3)', icon: '👑' };
    } else if (spend >= 1000000) {
      return { label: 'Customer Loyal', color: '#34d399', bg: 'rgba(16,185,129,0.15)', border: 'rgba(16,185,129,0.3)', icon: '🟢' };
    } else {
      return { label: 'New Customer', color: '#38bdf8', bg: 'rgba(56,189,248,0.15)', border: 'rgba(56,189,248,0.3)', icon: '🔹' };
    }
  };

  const formatRupiah = (val) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val || 0);
  };

  const getOutletName = (id) => {
    const found = masterData.outlets.find(o => o.id === parseInt(id));
    return found ? found.name : 'Utama';
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
    setOutletId(masterData.outlets[0]?.id || 1);
    setShowAddModal(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (cust) => {
    setEditingCustomer(cust);
    setName(cust.name);
    setPhone(cust.phone);
    setOutletId(cust.outlet_id || masterData.outlets[0]?.id || 1);
    setShowAddModal(true);
  };

  // Handle Submit Form
  const handleSubmitCustomer = (e) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) {
      alert('Mohon isi Nama Pelanggan dan Nomor WhatsApp');
      return;
    }

    const updated = {
      ...masterData,
      _lastUpdated: Date.now()
    };
    if (!updated.customers) updated.customers = [];

    if (editingCustomer) {
      const idx = updated.customers.findIndex(c => c.id === editingCustomer.id);
      if (idx !== -1) {
        updated.customers[idx] = {
          ...editingCustomer,
          name: name.trim(),
          phone: phone.trim(),
          outlet_id: parseInt(outletId)
        };
      }
    } else {
      const autoCode = generateNextMembershipCode();
      const todayDate = new Date().toISOString().split('T')[0];
      const newCustomer = {
        id: Date.now(),
        code: autoCode,
        name: name.trim(),
        phone: phone.trim(),
        join_date: todayDate,
        outlet_id: parseInt(outletId),
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
  const filtered = customersList.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.phone && c.phone.includes(searchTerm)) ||
    (c.code && c.code.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Pagination calculation
  const totalItems = filtered.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const paginatedCustomers = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }} className="animate-fade-in">
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '800', color: '#f8fafc', letterSpacing: '-0.02em' }}>
            Data Pelanggan & Membership
          </h2>
          <p style={{ color: '#94a3b8', fontSize: '0.875rem', marginTop: '4px' }}>
            Manajemen database pelanggan, nomor whatsapp, asal outlet, dan kualifikasi Tier Membership otomatis
          </p>
        </div>

        <button onClick={handleOpenAddModal} className="btn-primary">
          <Plus size={18} />
          <span>Tambahkan Pelanggan</span>
        </button>
      </div>

      {/* Summary KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
        <div className="glass-card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'rgba(56,189,248,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#38bdf8' }}>
            <Users size={22} />
          </div>
          <div>
            <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: '600', textTransform: 'uppercase' }}>TOTAL PELANGGAN</span>
            <h3 style={{ fontSize: '1.3rem', fontWeight: '800', color: '#f8fafc', marginTop: '2px' }}>{customersList.length} Orang</h3>
          </div>
        </div>

        <div className="glass-card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'rgba(245,158,11,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fbbf24' }}>
            <Award size={22} />
          </div>
          <div>
            <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: '600', textTransform: 'uppercase' }}>CUSTOMER VIP (&gt; 5JT)</span>
            <h3 style={{ fontSize: '1.3rem', fontWeight: '800', color: '#fbbf24', marginTop: '2px' }}>
              {customersList.filter(c => (c.total_spend || 0) > 5000000).length} VIP
            </h3>
          </div>
        </div>
      </div>

      {/* Search Filter Bar */}
      <div style={{ position: 'relative', maxWidth: '380px' }}>
        <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
        <input
          type="text"
          placeholder="Cari nama, no. whatsapp, atau no. membership..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="form-input"
          style={{ paddingLeft: '36px' }}
        />
      </div>

      {/* Table Section */}
      <div className="glass-card" style={{ padding: '20px' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #334155', color: '#94a3b8', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                <th style={{ padding: '12px' }}>No. Membership (Auto)</th>
                <th style={{ padding: '12px' }}>Nama Pelanggan</th>
                <th style={{ padding: '12px' }}>Nomor WhatsApp</th>
                <th style={{ padding: '12px' }}>Asal Outlet</th>
                <th style={{ padding: '12px' }}>Tanggal Bergabung</th>
                <th style={{ padding: '12px', textAlign: 'right' }}>Total Belanja</th>
                <th style={{ padding: '12px' }}>Tier Membership</th>
                <th style={{ padding: '12px', textAlign: 'right' }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {paginatedCustomers.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
                    Belum ada data pelanggan yang cocok.
                  </td>
                </tr>
              ) : (
                paginatedCustomers.map(cust => {
                  const tier = calculateTier(cust.total_spend);
                  const joinDate = cust.join_date || '2026-07-20';

                  return (
                    <tr key={cust.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', color: '#f8fafc' }}>
                      {/* 1. NOMOR MEMBERSHIP */}
                      <td style={{ padding: '14px 12px' }}>
                        <span style={{
                          background: 'rgba(99, 102, 241, 0.15)',
                          color: '#818cf8',
                          border: '1px solid rgba(99, 102, 241, 0.3)',
                          padding: '4px 10px',
                          borderRadius: '8px',
                          fontWeight: '800',
                          fontSize: '0.8rem',
                          fontFamily: 'monospace'
                        }}>
                          {cust.code || `MBR-00${cust.id}`}
                        </span>
                      </td>

                      {/* 2. NAMA PELANGGAN (Klik Nama Pelanggan -> Papan Informasi Detail Analisis Pelanggan) */}
                      <td style={{ padding: '14px 12px', fontWeight: '800', fontSize: '0.9rem' }}>
                        <button
                          type="button"
                          onClick={() => setSelectedCustomerDetail(cust)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#38bdf8',
                            fontWeight: '900',
                            cursor: 'pointer',
                            padding: 0,
                            textAlign: 'left',
                            fontSize: '0.9rem',
                            textDecoration: 'underline'
                          }}
                          title="Klik untuk melihat papan informasi detail histori transaksi, total belanja & kuantitas menu dibeli"
                        >
                          👤 {cust.name}
                        </button>
                      </td>

                      {/* 3. NOMOR WHATSAPP (WITH DIRECT CHAT LINK) */}
                      <td style={{ padding: '14px 12px' }}>
                        <a
                          href={getWhatsAppLink(cust.phone)}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            color: '#34d399',
                            textDecoration: 'none',
                            fontWeight: '600',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            background: 'rgba(16, 185, 129, 0.1)',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            border: '1px solid rgba(16, 185, 129, 0.2)'
                          }}
                        >
                          <MessageSquare size={13} />
                          <span>{cust.phone}</span>
                        </a>
                      </td>

                      {/* 4. ASAL OUTLET */}
                      <td style={{ padding: '14px 12px', color: '#cbd5e1' }}>
                        <span style={{ background: '#0f172a', padding: '4px 8px', borderRadius: '6px', border: '1px solid #334155', fontSize: '0.78rem' }}>
                          🏢 {getOutletName(cust.outlet_id)}
                        </span>
                      </td>

                      {/* 5. TANGGAL BERGABUNG */}
                      <td style={{ padding: '14px 12px', color: '#94a3b8' }}>
                        {joinDate}
                      </td>

                      {/* 6. TOTAL BELANJA */}
                      <td style={{ padding: '14px 12px', textAlign: 'right', fontWeight: '800', color: '#34d399' }}>
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
                          <button
                            onClick={() => handleOpenEditModal(cust)}
                            style={{
                              background: '#334155',
                              color: '#cbd5e1',
                              border: '1px solid rgba(255,255,255,0.1)',
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
                            <Edit3 size={14} color="#818cf8" />
                            <span>Edit</span>
                          </button>

                          <button
                            onClick={() => handleDeleteCustomer(cust.id, cust.name)}
                            style={{
                              background: 'rgba(244, 63, 94, 0.15)',
                              color: '#fb7185',
                              border: '1px solid rgba(244, 63, 94, 0.3)',
                              padding: '5px 10px',
                              borderRadius: '6px',
                              fontSize: '0.75rem',
                              fontWeight: '600',
                              cursor: 'pointer'
                            }}
                          >
                            <Trash2 size={14} />
                          </button>
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
          <div className="glass-card animate-fade-in" style={{ width: '100%', maxWidth: '480px', padding: '26px', background: '#1e293b' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: '800', color: '#f8fafc' }}>
                {editingCustomer ? 'Edit Data Pelanggan' : 'Tambahkan Pelanggan Baru'}
              </h3>
              <button onClick={() => setShowAddModal(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmitCustomer} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Field 1: Kode Pelanggan / Nomor Membership (Auto) */}
              <div>
                <label style={{ fontSize: '0.78rem', color: '#94a3b8', display: 'block', marginBottom: '6px', fontWeight: '600' }}>
                  1. Nomor Membership (Auto Generated)
                </label>
                <div style={{
                  background: '#0f172a',
                  border: '1px solid #334155',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  color: '#818cf8',
                  fontWeight: '800',
                  fontFamily: 'monospace',
                  fontSize: '0.9rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}>
                  <span>{editingCustomer ? editingCustomer.code : generateNextMembershipCode()}</span>
                  <span style={{ fontSize: '0.7rem', color: '#34d399', background: 'rgba(16,185,129,0.15)', padding: '2px 8px', borderRadius: '6px' }}>
                    Auto Generated
                  </span>
                </div>
              </div>

              {/* Field 2: Tanggal Bergabung (Auto) */}
              <div>
                <label style={{ fontSize: '0.78rem', color: '#94a3b8', display: 'block', marginBottom: '6px', fontWeight: '600' }}>
                  2. Tanggal Bergabung (Auto Submit Date)
                </label>
                <div style={{ background: '#0f172a', border: '1px solid #334155', padding: '10px 14px', borderRadius: '10px', color: '#cbd5e1', fontSize: '0.85rem' }}>
                  📅 {editingCustomer ? (editingCustomer.join_date || '2026-07-20') : new Date().toISOString().split('T')[0]}
                </div>
              </div>

              {/* Field 3: Nama Pelanggan */}
              <div>
                <label style={{ fontSize: '0.78rem', color: '#94a3b8', display: 'block', marginBottom: '6px', fontWeight: '600' }}>
                  3. Nama Pelanggan *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Hendra Gunawan"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="form-input"
                  autoFocus
                />
              </div>

              {/* Field 4: Nomor Kontak WhatsApp */}
              <div>
                <label style={{ fontSize: '0.78rem', color: '#94a3b8', display: 'block', marginBottom: '6px', fontWeight: '600' }}>
                  4. Nomor Kontak WhatsApp *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: 081211112222 atau 62812..."
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  className="form-input"
                />
                <span style={{ fontSize: '0.7rem', color: '#34d399', marginTop: '4px', display: 'block' }}>
                  ✓ Pastikan nomor terdaftar aktif di WhatsApp
                </span>
              </div>

              {/* Field 5: Asal Outlet */}
              <div>
                <label style={{ fontSize: '0.78rem', color: '#94a3b8', display: 'block', marginBottom: '6px', fontWeight: '600' }}>
                  5. Asal Outlet Restoran *
                </label>
                <select
                  value={outletId}
                  onChange={e => setOutletId(e.target.value)}
                  className="form-select"
                >
                  {masterData.outlets.map(o => (
                    <option key={o.id} value={o.id}>
                      🏢 {o.name} ({o.code})
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
