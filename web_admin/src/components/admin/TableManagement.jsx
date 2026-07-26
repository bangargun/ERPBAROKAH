import React, { useState } from 'react';
import { Layout, Plus, Search, Edit3, Trash2, X, CheckCircle2, Store, Grid, Smartphone } from 'lucide-react';

export default function TableManagement({ masterData, setMasterData, selectedBranch }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingTableGroup, setEditingTableGroup] = useState(null);

  // Form states
  const [selectedOutletId, setSelectedOutletId] = useState('');
  const [tableCount, setTableCount] = useState('10');
  const [status, setStatus] = useState('Aktif');

  const getOutletName = (id) => {
    const found = masterData.outlets?.find(o => o.id === parseInt(id));
    return found ? found.name : 'Outlet Utama';
  };

  // Open Add Modal
  const handleOpenAddModal = () => {
    setEditingTableGroup(null);
    setSelectedOutletId(masterData.outlets?.[0]?.id || 1);
    setTableCount('10');
    setStatus('Aktif');
    setShowAddModal(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (group) => {
    setEditingTableGroup(group);
    setSelectedOutletId(group.outlet_id || masterData.outlets?.[0]?.id || 1);
    setTableCount((group.total_tables || group.table_count || 10).toString());
    setStatus(group.status || 'Aktif');
    setShowAddModal(true);
  };

  // Submit Form
  const handleSubmitForm = (e) => {
    e.preventDefault();
    const count = parseInt(tableCount, 10) || 1;
    if (count <= 0) return;

    // Generate table_numbers array for Mobile APK POS
    const generatedTableNumbers = Array.from({ length: count }, (_, i) => ({
      number: `MEJA-${(i + 1).toString().padStart(2, '0')}`,
      status: 'Available'
    }));

    const updated = { ...masterData };
    if (!updated.tables) updated.tables = [];

    const outletIdInt = parseInt(selectedOutletId);

    if (editingTableGroup) {
      const idx = updated.tables.findIndex(t => t.id === editingTableGroup.id);
      if (idx !== -1) {
        updated.tables[idx] = {
          ...editingTableGroup,
          outlet_id: outletIdInt,
          total_tables: count,
          table_count: count,
          status: status,
          table_numbers: generatedTableNumbers
        };
      }
    } else {
      const newGroup = {
        id: Date.now(),
        outlet_id: outletIdInt,
        total_tables: count,
        table_count: count,
        status: status,
        table_numbers: generatedTableNumbers
      };
      updated.tables.unshift(newGroup);
    }

    setMasterData(updated);
    setShowAddModal(false);
    setEditingTableGroup(null);
  };

  // Delete Table Group
  const handleDeleteTableGroup = (id, outletName) => {
    if (window.confirm(`Apakah Anda yakin ingin menghapus data meja untuk outlet "${outletName}"?`)) {
      const updated = { ...masterData };
      updated.tables = updated.tables.filter(t => t.id !== id);
      setMasterData(updated);
    }
  };

  const tablesList = masterData.tables || [];
  const filtered = tablesList.filter(t => {
    if (selectedBranch && Number(t.outlet_id) !== Number(selectedBranch)) return false;
    return getOutletName(t.outlet_id).toLowerCase().includes(searchTerm.toLowerCase());
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }} className="animate-fade-in">
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '800', color: '#f8fafc', letterSpacing: '-0.02em' }}>
            Data Meja Restoran
          </h2>
          <p style={{ color: '#94a3b8', fontSize: '0.875rem', marginTop: '4px' }}>
            Kelola data meja per outlet sebagai sumber data master penomoran meja untuk Mobile APK POS Kasir
          </p>
        </div>

        <button onClick={handleOpenAddModal} className="btn-primary">
          <Plus size={18} />
          <span>Tambahkan Meja</span>
        </button>
      </div>

      {/* Info Banner for Mobile APK Integration */}
      <div className="glass-card" style={{ padding: '16px 20px', background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.3)', display: 'flex', alignItems: 'center', gap: '14px' }}>
        <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff' }}>
          <Smartphone size={22} />
        </div>
        <div>
          <h4 style={{ fontSize: '0.9rem', fontWeight: '800', color: '#818cf8' }}>Sumber Data Master Mobile APK</h4>
          <p style={{ fontSize: '0.78rem', color: '#cbd5e1', marginTop: '2px' }}>
            Seluruh penomoran meja (MEJA-01, MEJA-02, dst.) yang dikonfigurasi di sini akan secara otomatis menjadi pilihan nomor meja pada Mobile APK pengguna saat memilih meja pesanan.
          </p>
        </div>
      </div>

      {/* Search Bar */}
      <div style={{ position: 'relative', maxWidth: '380px' }}>
        <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
        <input
          type="text"
          placeholder="Cari berdasarkan nama outlet..."
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
                <th style={{ padding: '12px' }}>Nama Outlet</th>
                <th style={{ padding: '12px' }}>Jumlah Meja</th>
                <th style={{ padding: '12px' }}>Rincian Nomor Meja (Sumber Mobile APK)</th>
                <th style={{ padding: '12px' }}>Status</th>
                <th style={{ padding: '12px', textAlign: 'right' }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
                    Belum ada data meja yang dikonfigurasi.
                  </td>
                </tr>
              ) : (
                filtered.map(group => {
                  const outletName = getOutletName(group.outlet_id);
                  const count = group.total_tables || group.table_count || 10;
                  const isAktif = (group.status || 'Aktif') === 'Aktif';

                  return (
                    <tr key={group.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', color: '#f8fafc' }}>
                      {/* 1. NAMA OUTLET */}
                      <td style={{ padding: '14px 12px', fontWeight: '800', fontSize: '0.9rem', color: '#f8fafc' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Store size={16} color="#818cf8" />
                          <span>{outletName}</span>
                        </div>
                      </td>

                      {/* 2. JUMLAH MEJA */}
                      <td style={{ padding: '14px 12px', fontWeight: '800', color: '#38bdf8' }}>
                        <span style={{ background: '#0f172a', padding: '4px 10px', borderRadius: '6px', border: '1px solid #334155' }}>
                          🪑 {count} Meja
                        </span>
                      </td>

                      {/* 3. RINCIAN NOMOR MEJA */}
                      <td style={{ padding: '14px 12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{
                            background: 'rgba(56, 189, 248, 0.15)',
                            color: '#38bdf8',
                            border: '1px solid rgba(56, 189, 248, 0.3)',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            fontSize: '0.75rem',
                            fontWeight: '700',
                            fontFamily: 'monospace'
                          }}>
                            MEJA-01 s/d MEJA-{count.toString().padStart(2, '0')}
                          </span>
                          <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontStyle: 'italic' }}>
                            ({count} Meja Aktif APK)
                          </span>
                        </div>
                      </td>

                      {/* 4. STATUS */}
                      <td style={{ padding: '14px 12px' }}>
                        <span style={{
                          background: isAktif ? 'rgba(16, 185, 129, 0.15)' : 'rgba(244, 63, 94, 0.15)',
                          color: isAktif ? '#34d399' : '#fb7185',
                          border: `1px solid ${isAktif ? 'rgba(16, 185, 129, 0.3)' : 'rgba(244, 63, 94, 0.3)'}`,
                          padding: '4px 10px',
                          borderRadius: '20px',
                          fontSize: '0.75rem',
                          fontWeight: '700'
                        }}>
                          ● {isAktif ? 'Aktif' : 'Inaktif'}
                        </span>
                      </td>

                      {/* 5. AKSI */}
                      <td style={{ padding: '14px 12px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                          <button
                            onClick={() => handleOpenEditModal(group)}
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
                            onClick={() => handleDeleteTableGroup(group.id, outletName)}
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
      </div>

      {/* MODAL TAMBAH / EDIT MEJA */}
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
          <div className="glass-card animate-fade-in" style={{ width: '100%', maxWidth: '450px', padding: '26px', background: '#1e293b' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: '800', color: '#f8fafc' }}>
                {editingTableGroup ? 'Edit Data Meja Outlet' : 'Tambahkan Meja Outlet'}
              </h3>
              <button onClick={() => setShowAddModal(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmitForm} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Field 1: Nama Outlet */}
              <div>
                <label style={{ fontSize: '0.78rem', color: '#94a3b8', display: 'block', marginBottom: '6px', fontWeight: '600' }}>
                  1. Nama Outlet * (Dari Data Master Outlet)
                </label>
                <select
                  value={selectedOutletId}
                  onChange={e => setSelectedOutletId(e.target.value)}
                  className="form-select"
                >
                  {masterData.outlets.map(o => (
                    <option key={o.id} value={o.id}>
                      🏢 {o.name} ({o.code})
                    </option>
                  ))}
                </select>
              </div>

              {/* Field 2: Jumlah Meja */}
              <div>
                <label style={{ fontSize: '0.78rem', color: '#94a3b8', display: 'block', marginBottom: '6px', fontWeight: '600' }}>
                  2. Jumlah Meja Restoran *
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  max="100"
                  placeholder="Contoh: 15"
                  value={tableCount}
                  onChange={e => setTableCount(e.target.value)}
                  className="form-input"
                  style={{ fontSize: '1.05rem', fontWeight: '800' }}
                />
                <span style={{ fontSize: '0.7rem', color: '#38bdf8', marginTop: '4px', display: 'block' }}>
                  ✓ Otomatis meng-generate penomoran MEJA-01 s/d MEJA-{(parseInt(tableCount) || 1).toString().padStart(2, '0')}
                </span>
              </div>

              {/* Field 3: Status */}
              <div>
                <label style={{ fontSize: '0.78rem', color: '#94a3b8', display: 'block', marginBottom: '6px', fontWeight: '600' }}>
                  3. Status Penggunaan Meja
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => setStatus('Aktif')}
                    style={{
                      padding: '10px',
                      borderRadius: '8px',
                      border: '1px solid',
                      borderColor: status === 'Aktif' ? '#10b981' : '#334155',
                      background: status === 'Aktif' ? 'rgba(16, 185, 129, 0.2)' : '#0f172a',
                      color: status === 'Aktif' ? '#34d399' : '#94a3b8',
                      fontWeight: '700',
                      fontSize: '0.8rem',
                      cursor: 'pointer'
                    }}
                  >
                    ● Aktif
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatus('Inaktif')}
                    style={{
                      padding: '10px',
                      borderRadius: '8px',
                      border: '1px solid',
                      borderColor: status === 'Inaktif' ? '#f43f5e' : '#334155',
                      background: status === 'Inaktif' ? 'rgba(244, 63, 94, 0.2)' : '#0f172a',
                      color: status === 'Inaktif' ? '#fb7185' : '#94a3b8',
                      fontWeight: '700',
                      fontSize: '0.8rem',
                      cursor: 'pointer'
                    }}
                  >
                    ● Inaktif
                  </button>
                </div>
              </div>

              {/* Submit Buttons */}
              <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
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
    </div>
  );
}
