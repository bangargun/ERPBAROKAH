import React, { useState } from 'react';
import { Layout, Plus, Search, Edit3, Trash2, X, CheckCircle2, Store, Grid, Smartphone } from 'lucide-react';
import { getThemePalette } from '../../utils/themeUtils';
import { canDeleteModule, canEditModule } from '../../utils/permissionUtils';

export default function TableManagement({ masterData, setMasterData, selectedBranch, userSession, themeMode = 'dark' }) {
  const T = getThemePalette(themeMode);
  const allowDelete = canDeleteModule(userSession, 'masterData', masterData?.permissionMatrix);
  const allowEdit = canEditModule(userSession, 'masterData', masterData?.permissionMatrix);
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }} className="animate-fade-in">
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '0.96rem', fontWeight: '900', color: T.txtPrimary, letterSpacing: '-0.01em', margin: 0 }}>
            Data Meja Restoran
          </h2>
          <p style={{ color: T.txtSecondary, fontSize: '0.72rem', marginTop: '2px', margin: 0 }}>
            Kelola data meja per outlet sebagai sumber data master penomoran meja untuk Mobile APK POS Kasir
          </p>
        </div>

        {allowEdit && (
          <button onClick={handleOpenAddModal} className="btn-primary" style={{ padding: '6px 12px', fontSize: '0.72rem' }}>
            <Plus size={15} />
            <span>Tambahkan Meja</span>
          </button>
        )}
      </div>

      {/* Info Banner for Mobile APK Integration */}
      <div className="glass-card" style={{ padding: '12px 16px', background: T.infoBg, border: `1px solid ${T.infoBorder}`, display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{ width: '34px', height: '34px', borderRadius: '8px', background: T.info, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff' }}>
          <Smartphone size={18} />
        </div>
        <div>
          <h4 style={{ fontSize: '0.78rem', fontWeight: '800', color: T.info, margin: 0 }}>Sumber Data Master Mobile APK</h4>
          <p style={{ fontSize: '0.70rem', color: T.txtSecondary, marginTop: '2px', margin: 0 }}>
            Seluruh penomoran meja (MEJA-01, MEJA-02, dst.) yang dikonfigurasi di sini akan secara otomatis menjadi pilihan nomor meja pada Mobile APK.
          </p>
        </div>
      </div>

      {/* Search Bar */}
      <div style={{ position: 'relative', maxWidth: '360px' }}>
        <Search size={15} color={T.txtMuted} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
        <input
          type="text"
          placeholder="Cari berdasarkan nama outlet..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="form-input"
          style={{ paddingLeft: '34px', fontSize: '0.76rem', height: '34px' }}
        />
      </div>

      {/* Table Section */}
      <div className="glass-card" style={{ padding: '16px' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.76rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)', color: T.txtSecondary, fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: '800' }}>
                <th style={{ padding: '10px 10px' }}>Nama Outlet</th>
                <th style={{ padding: '10px 10px' }}>Jumlah Meja</th>
                <th style={{ padding: '10px 10px' }}>Rincian Nomor Meja (Sumber Mobile APK)</th>
                <th style={{ padding: '10px 10px' }}>Status</th>
                <th style={{ padding: '10px 10px', textAlign: 'right' }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: '36px', textAlign: 'center', color: T.txtMuted, fontSize: '0.76rem' }}>
                    Belum ada data meja yang dikonfigurasi.
                  </td>
                </tr>
              ) : (
                filtered.map(group => {
                  const outletName = getOutletName(group.outlet_id);
                  const count = group.total_tables || group.table_count || 10;
                  const isAktif = (group.status || 'Aktif') === 'Aktif';

                  return (
                    <tr key={group.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)', color: T.txtPrimary }}>
                      {/* 1. NAMA OUTLET */}
                      <td style={{ padding: '8px 10px', fontWeight: '800', fontSize: '0.76rem', color: T.txtPrimary }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Store size={14} color={T.info} />
                          <span>{outletName}</span>
                        </div>
                      </td>

                      {/* 2. JUMLAH MEJA */}
                      <td style={{ padding: '8px 10px', fontWeight: '800', color: T.info }}>
                        <span style={{ background: T.cardBg2, padding: '2px 6px', borderRadius: '4px', border: `1px solid ${T.borderStrong}`, fontSize: '0.70rem' }}>
                          {count} Meja
                        </span>
                      </td>

                      {/* 3. RINCIAN NOMOR MEJA */}
                      <td style={{ padding: '8px 10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{
                            background: T.infoBg,
                            color: T.info,
                            border: `1px solid ${T.infoBorder}`,
                            padding: '2px 6px',
                            borderRadius: '4px',
                            fontSize: '0.68rem',
                            fontWeight: '700',
                            fontFamily: 'monospace'
                          }}>
                            MEJA-01 s/d MEJA-{count.toString().padStart(2, '0')}
                          </span>
                          <span style={{ fontSize: '0.66rem', color: T.txtMuted, fontStyle: 'italic' }}>
                            ({count} Meja Aktif APK)
                          </span>
                        </div>
                      </td>

                      {/* 4. STATUS */}
                      <td style={{ padding: '8px 10px' }}>
                        <span style={{
                          background: isAktif ? T.successBg : T.dangerBg,
                          color: isAktif ? T.success : T.danger,
                          border: `1px solid ${isAktif ? T.successBorder : T.dangerBorder}`,
                          padding: '2px 8px',
                          borderRadius: '20px',
                          fontSize: '0.68rem',
                          fontWeight: '800'
                        }}>
                          ● {isAktif ? 'Aktif' : 'Inaktif'}
                        </span>
                      </td>

                      {/* 5. AKSI */}
                      <td style={{ padding: '14px 12px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                          {allowEdit && (
                            <button
                              onClick={() => handleOpenEditModal(group)}
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
                              onClick={() => handleDeleteTableGroup(group.id, outletName)}
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
          <div className="glass-card animate-fade-in" style={{ width: '100%', maxWidth: '450px', padding: '26px', background: T.cardBg, border: `1px solid ${T.border}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: '800', color: T.txtPrimary }}>
                {editingTableGroup ? 'Edit Data Meja Outlet' : 'Tambahkan Meja Outlet'}
              </h3>
              <button onClick={() => setShowAddModal(false)} style={{ background: 'none', border: 'none', color: T.txtMuted, cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmitForm} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Field 1: Nama Outlet */}
              <div>
                <label style={{ fontSize: '0.78rem', color: T.txtSecondary, display: 'block', marginBottom: '6px', fontWeight: '600' }}>
                  1. Nama Outlet * (Dari Data Master Outlet)
                </label>
                <select
                  value={selectedOutletId}
                  onChange={e => setSelectedOutletId(e.target.value)}
                  className="form-select"
                >
                  {masterData.outlets.map(o => (
                    <option key={o.id} value={o.id}>
                      {o.name} ({o.code})
                    </option>
                  ))}
                </select>
              </div>

              {/* Field 2: Jumlah Meja */}
              <div>
                <label style={{ fontSize: '0.78rem', color: T.txtSecondary, display: 'block', marginBottom: '6px', fontWeight: '600' }}>
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
                <span style={{ fontSize: '0.7rem', color: T.info, marginTop: '4px', display: 'block' }}>
                  Otomatis meng-generate penomoran MEJA-01 s/d MEJA-{(parseInt(tableCount) || 1).toString().padStart(2, '0')}
                </span>
              </div>

              {/* Field 3: Status */}
              <div>
                <label style={{ fontSize: '0.78rem', color: T.txtSecondary, display: 'block', marginBottom: '6px', fontWeight: '600' }}>
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
                      borderColor: status === 'Aktif' ? T.success : T.borderStrong,
                      background: status === 'Aktif' ? T.successBg : T.cardBg2,
                      color: status === 'Aktif' ? T.success : T.txtMuted,
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
                      borderColor: status === 'Inaktif' ? T.danger : T.borderStrong,
                      background: status === 'Inaktif' ? T.dangerBg : T.cardBg2,
                      color: status === 'Inaktif' ? T.danger : T.txtMuted,
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
