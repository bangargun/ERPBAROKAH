import React, { useState } from 'react';
import { 
  Award, 
  Star, 
  Gift, 
  Users, 
  CreditCard, 
  ChevronRight, 
  CheckCircle2, 
  ShieldCheck, 
  Zap, 
  Plus, 
  Settings, 
  Edit3, 
  Trash2, 
  X, 
  Coins 
} from 'lucide-react';

export default function LoyaltyProgramPage({ masterData, setMasterData }) {
  const [activeTab, setActiveTab] = useState('tiers');

  const customers = masterData?.customers || [];
  const tiersList = masterData?.loyaltyTiers || [];
  const rewardCatalog = masterData?.loyaltyRewards || [];
  const pointRatio = masterData?.loyaltyPointRatio || 100000;

  // MODAL STATES
  // 1. Edit Tier Modal
  const [showEditTierModal, setShowEditTierModal] = useState(false);
  const [tierForm, setTierForm] = useState({
    id: null,
    name: '',
    spendThreshold: '',
    badgeColor: '#34d399',
    multiplier: '1x Poin',
    benefits: ['']
  });

  // 2. Reward Modal (Add / Edit)
  const [showRewardModal, setShowRewardModal] = useState(false);
  const [rewardForm, setRewardForm] = useState({
    id: null,
    title: '',
    points: 100,
    tier: 'Semua Tier',
    status: 'Aktif'
  });

  // 3. Ratio Modal
  const [showRatioModal, setShowRatioModal] = useState(false);
  const [ratioInput, setRatioInput] = useState(pointRatio);

  const formatRupiah = (num) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(num || 0);
  };

  // ------------------------------------------------------------------
  // TIER HANDLERS
  // ------------------------------------------------------------------
  const handleOpenAddTierModal = () => {
    setTierForm({
      id: null,
      name: '',
      spendThreshold: 'Rp 0',
      badgeColor: '#a855f7',
      multiplier: '1x Poin',
      benefits: ['Benefit 1']
    });
    setShowEditTierModal(true);
  };

  const handleOpenEditTierModal = (tier) => {
    setTierForm({
      id: tier.id,
      name: tier.name || '',
      spendThreshold: tier.spendThreshold || '',
      badgeColor: tier.badgeColor || '#34d399',
      multiplier: tier.multiplier || '1x Poin',
      benefits: tier.benefits ? [...tier.benefits] : ['']
    });
    setShowEditTierModal(true);
  };

  const handleSaveTier = (e) => {
    e.preventDefault();
    if (!tierForm.name.trim()) {
      alert('Nama Tier Membership wajib diisi!');
      return;
    }

    const filteredBenefits = tierForm.benefits.filter(b => b.trim().length > 0);
    const currentTiers = masterData.loyaltyTiers || [];

    let updatedTiers = [];
    if (tierForm.id) {
      updatedTiers = currentTiers.map(t => {
        if (t.id === tierForm.id) {
          return {
            ...t,
            name: tierForm.name.trim(),
            spendThreshold: tierForm.spendThreshold.trim(),
            badgeColor: tierForm.badgeColor,
            multiplier: tierForm.multiplier.trim(),
            benefits: filteredBenefits
          };
        }
        return t;
      });
    } else {
      const newId = Date.now();
      const newTier = {
        id: newId,
        name: tierForm.name.trim(),
        spendThreshold: tierForm.spendThreshold.trim(),
        badgeColor: tierForm.badgeColor,
        multiplier: tierForm.multiplier.trim(),
        benefits: filteredBenefits
      };
      updatedTiers = [...currentTiers, newTier];
    }

    setMasterData({
      ...masterData,
      loyaltyTiers: updatedTiers
    });

    setShowEditTierModal(false);
    alert(`Tier Membership "${tierForm.name}" Berhasil Disimpan!`);
  };

  const handleDeleteTier = (id, name) => {
    if (window.confirm(`Apakah Anda yakin ingin menghapus Tier Membership "${name}"?`)) {
      const currentTiers = masterData.loyaltyTiers || [];
      const updated = currentTiers.filter(t => t.id !== id);
      setMasterData({
        ...masterData,
        loyaltyTiers: updated
      });
    }
  };

  // ------------------------------------------------------------------
  // REWARD CATALOG HANDLERS
  // ------------------------------------------------------------------
  const handleOpenAddRewardModal = () => {
    setRewardForm({
      id: null,
      title: '',
      points: 10,
      tier: 'Semua Tier',
      status: 'Aktif'
    });
    setShowRewardModal(true);
  };

  const handleOpenEditRewardModal = (reward) => {
    setRewardForm({
      id: reward.id,
      title: reward.title || '',
      points: reward.points || 10,
      tier: reward.tier || 'Semua Tier',
      status: reward.status || 'Aktif'
    });
    setShowRewardModal(true);
  };

  const handleSaveReward = (e) => {
    e.preventDefault();
    if (!rewardForm.title.trim()) {
      alert('Nama Reward / Voucher wajib diisi!');
      return;
    }

    const currentRewards = masterData.loyaltyRewards || [];
    let updatedRewards = [];

    if (rewardForm.id) {
      updatedRewards = currentRewards.map(r => {
        if (r.id === rewardForm.id) {
          return {
            ...r,
            title: rewardForm.title.trim(),
            points: Number(rewardForm.points) || 0,
            tier: rewardForm.tier,
            status: rewardForm.status
          };
        }
        return r;
      });
    } else {
      const newReward = {
        id: Date.now(),
        title: rewardForm.title.trim(),
        points: Number(rewardForm.points) || 0,
        tier: rewardForm.tier,
        status: rewardForm.status
      };
      updatedRewards = [newReward, ...currentRewards];
    }

    setMasterData({
      ...masterData,
      loyaltyRewards: updatedRewards
    });

    setShowRewardModal(false);
    alert(`Reward "${rewardForm.title}" Berhasil Disimpan!`);
  };

  const handleDeleteReward = (id, title) => {
    if (window.confirm(`Apakah Anda yakin ingin menghapus item reward "${title}"?`)) {
      const currentRewards = masterData.loyaltyRewards || [];
      const updated = currentRewards.filter(r => r.id !== id);
      setMasterData({
        ...masterData,
        loyaltyRewards: updated
      });
    }
  };

  // ------------------------------------------------------------------
  // RATIO HANDLER
  // ------------------------------------------------------------------
  const handleSaveRatio = (e) => {
    e.preventDefault();
    const val = Number(ratioInput);
    if (!val || val <= 0) {
      alert('Nominal belanja rasio poin wajib lebih besar dari 0!');
      return;
    }

    setMasterData({
      ...masterData,
      loyaltyPointRatio: val
    });

    setShowRatioModal(false);
    alert(`Rasio Perolehan Poin Berhasil Diperbarui: ${formatRupiah(val)} = 1 Poin!`);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }} className="animate-fade-in">
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '800', color: '#f8fafc', letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Award size={28} color="#fbbf24" />
            <span>Program Loyalitas Pelanggan (Loyalty &amp; Rewards)</span>
          </h2>
          <p style={{ color: '#94a3b8', fontSize: '0.875rem', marginTop: '4px' }}>
            Kelola tingkatan membership (New, Loyal, VIP), sistem poin belanja, benefit reward, dan katalog penukaran voucher
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={() => setActiveTab('tiers')} className={activeTab === 'tiers' ? 'btn-primary' : 'btn-secondary'}>
            <Star size={16} />
            <span>Tingkatan Membership</span>
          </button>
          <button onClick={() => setActiveTab('rewards')} className={activeTab === 'rewards' ? 'btn-primary' : 'btn-secondary'}>
            <Gift size={16} />
            <span>Katalog Hadiah</span>
          </button>
        </div>
      </div>

      {/* Overview Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
        <div className="glass-card" style={{ padding: '20px' }}>
          <div style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: '600' }}>Total Member Terdaftar</div>
          <div style={{ fontSize: '1.8rem', fontWeight: '900', color: '#818cf8', marginTop: '8px' }}>{customers.length} Member</div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>Member aktif di database</div>
        </div>

        <div className="glass-card" style={{ padding: '20px', position: 'relative' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: '600' }}>Rasio Perolehan Poin</div>
            <button
              type="button"
              onClick={() => {
                setRatioInput(pointRatio);
                setShowRatioModal(true);
              }}
              style={{ padding: '3px 8px', background: 'rgba(56, 189, 248, 0.15)', border: '1px solid #38bdf8', color: '#38bdf8', borderRadius: '6px', fontSize: '0.70rem', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              <Edit3 size={12} />
              <span>Edit Rasio</span>
            </button>
          </div>
          <div style={{ fontSize: '1.3rem', fontWeight: '900', color: '#38bdf8', marginTop: '8px' }}>
            {formatRupiah(pointRatio)} = 1 Poin
          </div>
          <div style={{ fontSize: '0.75rem', color: '#34d399', fontWeight: '700', marginTop: '4px' }}>
            ● berlaku kelipatan (otomatis dari kasir POS)
          </div>
        </div>

        <div className="glass-card" style={{ padding: '20px' }}>
          <div style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: '600' }}>Nilai Pembayaran Poin</div>
          <div style={{ fontSize: '1.4rem', fontWeight: '900', color: '#fbbf24', marginTop: '8px' }}>
            1 Poin = Rp 1.000 Menu
          </div>
          <div style={{ fontSize: '0.75rem', color: '#38bdf8', fontWeight: '700', marginTop: '4px' }}>
            ● Setiap Rp 1.000 menu senilai 1 Poin
          </div>
        </div>

        <div className="glass-card" style={{ padding: '20px' }}>
          <div style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: '600' }}>Pelanggan VIP Level</div>
          <div style={{ fontSize: '1.8rem', fontWeight: '900', color: '#fbbf24', marginTop: '8px' }}>
            {customers.filter(c => (c.total_spend || 0) >= 5000000).length} VIP Member
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>Total belanja diatas Rp 5 Juta</div>
        </div>
      </div>

      {/* 1. TIER MEMBERSHIP RULES */}
      {activeTab === 'tiers' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '800', color: '#f8fafc', margin: 0 }}>
              Ketentuan &amp; Benefit Tier Membership Pelanggan
            </h3>
            <button onClick={handleOpenAddTierModal} className="btn-primary" style={{ padding: '8px 16px', fontSize: '0.80rem' }}>
              <Plus size={16} />
              <span>+ Tambah Tier Baru</span>
            </button>
          </div>

          {tiersList.length === 0 ? (
            <div className="glass-card" style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
              <Star size={40} color="#64748b" style={{ margin: '0 auto 12px auto', opacity: 0.5 }} />
              <div style={{ fontSize: '1rem', fontWeight: '700', color: '#cbd5e1' }}>Belum Ada Tier Membership Terdaftar</div>
              <div style={{ fontSize: '0.8rem', marginTop: '4px' }}>Silakan klik tombol "+ Tambah Tier Baru" di atas untuk menambahkan tingkatan membership.</div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
              {tiersList.map((tier) => (
                <div key={tier.id} className="glass-card" style={{ padding: '24px', position: 'relative', overflow: 'hidden', borderTop: `4px solid ${tier.badgeColor}`, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Award size={22} color={tier.badgeColor} />
                        <h4 style={{ fontSize: '1.15rem', fontWeight: '800', color: '#f8fafc', margin: 0 }}>{tier.name}</h4>
                      </div>
                      <span style={{ background: '#0f172a', color: tier.badgeColor, border: `1px solid ${tier.badgeColor}`, padding: '3px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: '800' }}>
                        {tier.multiplier}
                      </span>
                    </div>

                    <div style={{ marginTop: '12px', padding: '10px 14px', background: '#0f172a', borderRadius: '8px', border: '1px solid #334155', fontSize: '0.82rem' }}>
                      <span style={{ color: '#94a3b8' }}>Syarat Total Belanja: </span>
                      <strong style={{ color: '#f8fafc' }}>{tier.spendThreshold}</strong>
                    </div>

                    <div style={{ marginTop: '16px' }}>
                      <div style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase', marginBottom: '8px' }}>
                        Daftar Keuntungan &amp; Benefit:
                      </div>
                      <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {(tier.benefits || []).map((b, bIdx) => (
                          <li key={bIdx} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.83rem', color: '#cbd5e1' }}>
                            <CheckCircle2 size={16} color={tier.badgeColor} />
                            <span>{b}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* EDIT & DELETE TIER ACTIONS */}
                  <div style={{ marginTop: '20px', paddingTop: '14px', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={() => handleOpenEditTierModal(tier)}
                      style={{ padding: '6px 12px', background: '#334155', border: '1px solid rgba(255,255,255,0.1)', color: '#cbd5e1', borderRadius: '6px', fontSize: '0.76rem', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                    >
                      <Edit3 size={14} color="#818cf8" />
                      <span>Edit Tier</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteTier(tier.id, tier.name)}
                      style={{ padding: '6px 10px', background: 'rgba(244,63,94,0.15)', border: '1px solid rgba(244,63,94,0.3)', color: '#f43f5e', borderRadius: '6px', fontSize: '0.76rem', fontWeight: '700', cursor: 'pointer' }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 2. REWARD CATALOG */}
      {activeTab === 'rewards' && (
        <div className="glass-card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: '800', color: '#f8fafc', margin: 0 }}>
                Katalog Hadiah &amp; Redeem Voucher
              </h3>
              <p style={{ color: '#94a3b8', fontSize: '0.83rem', marginTop: '2px', margin: 0 }}>
                Daftar voucher dan reward yang dapat ditukarkan member menggunakan poin belanja
              </p>
            </div>
            <button onClick={handleOpenAddRewardModal} className="btn-primary">
              <Plus size={16} />
              <span>+ Tambah Hadiah Baru</span>
            </button>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #334155', color: '#94a3b8', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                  <th style={{ padding: '12px' }}>Nama Reward / Voucher</th>
                  <th style={{ padding: '12px' }}>Poin Dibutuhkan</th>
                  <th style={{ padding: '12px' }}>Khusus Tier</th>
                  <th style={{ padding: '12px' }}>Status</th>
                  <th style={{ padding: '12px', textAlign: 'right' }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {rewardCatalog.length === 0 ? (
                  <tr>
                    <td colSpan="5" style={{ textAlign: 'center', padding: '36px', color: '#64748b' }}>
                      <Gift size={32} style={{ margin: '0 auto 8px auto', opacity: 0.4 }} />
                      <div>Belum ada hadiah / voucher reward terdaftar.</div>
                    </td>
                  </tr>
                ) : (
                  rewardCatalog.map(item => (
                    <tr key={item.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', color: '#f8fafc' }}>
                      <td style={{ padding: '14px 12px', fontWeight: '800', color: '#f8fafc' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Gift size={16} color="#fbbf24" />
                          <span>{item.title}</span>
                        </div>
                      </td>
                      <td style={{ padding: '14px 12px', fontWeight: '900', color: '#38bdf8', fontFamily: 'monospace' }}>
                        {item.points} Poin
                      </td>
                      <td style={{ padding: '14px 12px', color: '#cbd5e1' }}>
                        <span style={{ background: '#0f172a', padding: '3px 8px', borderRadius: '6px', border: '1px solid #334155', fontSize: '0.75rem' }}>
                          ★ {item.tier}
                        </span>
                      </td>
                      <td style={{ padding: '14px 12px' }}>
                        <span style={{ background: item.status === 'Aktif' ? 'rgba(16,185,129,0.15)' : 'rgba(244,63,94,0.15)', color: item.status === 'Aktif' ? '#34d399' : '#fb7185', border: `1px solid ${item.status === 'Aktif' ? 'rgba(16,185,129,0.3)' : 'rgba(244,63,94,0.3)'}`, padding: '3px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: '700' }}>
                          ● {item.status}
                        </span>
                      </td>
                      <td style={{ padding: '14px 12px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                          <button
                            type="button"
                            onClick={() => handleOpenEditRewardModal(item)}
                            style={{ padding: '5px 10px', background: '#334155', border: '1px solid rgba(255,255,255,0.1)', color: '#cbd5e1', borderRadius: '6px', fontSize: '0.75rem', fontWeight: '600', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                          >
                            <Edit3 size={14} color="#818cf8" />
                            <span>Edit</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteReward(item.id, item.title)}
                            style={{ padding: '5px 10px', background: 'rgba(244, 63, 94, 0.15)', color: '#fb7185', border: '1px solid rgba(244, 63, 94, 0.3)', borderRadius: '6px', fontSize: '0.75rem', fontWeight: '600', cursor: 'pointer' }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL 1: EDIT TIER MEMBERSHIP */}
      {showEditTierModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div className="glass-card animate-fade-in" style={{ width: '100%', maxWidth: '520px', padding: '26px', background: '#1e293b' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: '800', color: '#f8fafc', margin: 0 }}>
                {tierForm.id ? 'Edit Tier Membership' : 'Tambah Tier Membership Baru'}
              </h3>
              <button onClick={() => setShowEditTierModal(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}><X size={20} /></button>
            </div>

            <form onSubmit={handleSaveTier} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '0.78rem', color: '#94a3b8', display: 'block', marginBottom: '4px', fontWeight: '600' }}>Nama Tier Membership *</label>
                <input
                  type="text"
                  required
                  value={tierForm.name}
                  onChange={e => setTierForm({ ...tierForm, name: e.target.value })}
                  placeholder="Contoh: Customer VIP, Customer Loyal"
                  className="form-input"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.78rem', color: '#94a3b8', display: 'block', marginBottom: '4px', fontWeight: '600' }}>Syarat Total Belanja *</label>
                  <input
                    type="text"
                    required
                    value={tierForm.spendThreshold}
                    onChange={e => setTierForm({ ...tierForm, spendThreshold: e.target.value })}
                    placeholder="Contoh: Diatas Rp 5.000.000"
                    className="form-input"
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.78rem', color: '#94a3b8', display: 'block', marginBottom: '4px', fontWeight: '600' }}>Multiplier Poin *</label>
                  <input
                    type="text"
                    required
                    value={tierForm.multiplier}
                    onChange={e => setTierForm({ ...tierForm, multiplier: e.target.value })}
                    placeholder="Contoh: 2x Poin Double Bonus"
                    className="form-input"
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.78rem', color: '#94a3b8', display: 'block', marginBottom: '4px', fontWeight: '600' }}>Warna Badge Tier</label>
                <div style={{ display: 'flex', gap: '10px' }}>
                  {['#38bdf8', '#34d399', '#fbbf24', '#a855f7', '#f43f5e'].map(col => (
                    <button
                      key={col}
                      type="button"
                      onClick={() => setTierForm({ ...tierForm, badgeColor: col })}
                      style={{
                        width: '32px', height: '32px', borderRadius: '50%', background: col, border: tierForm.badgeColor === col ? '3px solid #ffffff' : 'none', cursor: 'pointer'
                      }}
                    />
                  ))}
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: '600' }}>Daftar Keuntungan / Benefit:</label>
                  <button
                    type="button"
                    onClick={() => setTierForm({ ...tierForm, benefits: [...tierForm.benefits, ''] })}
                    style={{ padding: '3px 8px', background: 'rgba(52,211,153,0.15)', border: '1px solid #34d399', color: '#34d399', borderRadius: '6px', fontSize: '0.72rem', fontWeight: '800', cursor: 'pointer' }}
                  >
                    + Tambah Benefit
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '160px', overflowY: 'auto' }}>
                  {tierForm.benefits.map((bVal, bIdx) => (
                    <div key={bIdx} style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                      <input
                        type="text"
                        value={bVal}
                        onChange={e => {
                          const updated = [...tierForm.benefits];
                          updated[bIdx] = e.target.value;
                          setTierForm({ ...tierForm, benefits: updated });
                        }}
                        placeholder={`Benefit ${bIdx + 1}...`}
                        className="form-input"
                        style={{ flex: 1 }}
                      />
                      {tierForm.benefits.length > 1 && (
                        <button
                          type="button"
                          onClick={() => {
                            const updated = tierForm.benefits.filter((_, idx) => idx !== bIdx);
                            setTierForm({ ...tierForm, benefits: updated });
                          }}
                          style={{ padding: '6px', background: 'rgba(244,63,94,0.15)', border: '1px solid rgba(244,63,94,0.3)', color: '#f43f5e', borderRadius: '6px', cursor: 'pointer' }}
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button type="button" onClick={() => setShowEditTierModal(false)} className="btn-secondary" style={{ flex: 1, justifyContent: 'center' }}>Batal</button>
                <button type="submit" className="btn-primary" style={{ flex: 1, justifyContent: 'center' }}>Simpan Tier</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: TAMBAH / EDIT HADIAH KATALOG */}
      {showRewardModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div className="glass-card animate-fade-in" style={{ width: '100%', maxWidth: '480px', padding: '26px', background: '#1e293b' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: '800', color: '#f8fafc', margin: 0 }}>
                {rewardForm.id ? 'Edit Item Reward / Voucher' : 'Tambah Hadiah Reward Baru'}
              </h3>
              <button onClick={() => setShowRewardModal(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}><X size={20} /></button>
            </div>

            <form onSubmit={handleSaveReward} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '0.78rem', color: '#94a3b8', display: 'block', marginBottom: '4px', fontWeight: '600' }}>Nama Reward / Voucher *</label>
                <input
                  type="text"
                  required
                  value={rewardForm.title}
                  onChange={e => setRewardForm({ ...rewardForm, title: e.target.value })}
                  placeholder="Contoh: Voucher Diskon Rp 50.000"
                  className="form-input"
                />
              </div>

              <div>
                <label style={{ fontSize: '0.78rem', color: '#94a3b8', display: 'block', marginBottom: '4px', fontWeight: '600' }}>Poin Dibutuhkan *</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={rewardForm.points}
                  onChange={e => setRewardForm({ ...rewardForm, points: e.target.value })}
                  placeholder="Contoh: 10"
                  className="form-input"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.78rem', color: '#94a3b8', display: 'block', marginBottom: '4px', fontWeight: '600' }}>Khusus Tier</label>
                  <select
                    value={rewardForm.tier}
                    onChange={e => setRewardForm({ ...rewardForm, tier: e.target.value })}
                    className="form-input"
                    style={{ background: '#0f172a', color: '#ffffff' }}
                  >
                    <option value="Semua Tier">Semua Tier</option>
                    {tiersList.map(t => (
                      <option key={t.id} value={t.name}>{t.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '0.78rem', color: '#94a3b8', display: 'block', marginBottom: '4px', fontWeight: '600' }}>Status</label>
                  <select
                    value={rewardForm.status}
                    onChange={e => setRewardForm({ ...rewardForm, status: e.target.value })}
                    className="form-input"
                    style={{ background: '#0f172a', color: '#ffffff' }}
                  >
                    <option value="Aktif">Aktif</option>
                    <option value="Inaktif">Inaktif</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button type="button" onClick={() => setShowRewardModal(false)} className="btn-secondary" style={{ flex: 1, justifyContent: 'center' }}>Batal</button>
                <button type="submit" className="btn-primary" style={{ flex: 1, justifyContent: 'center' }}>Simpan Hadiah</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: EDIT RASIO PEROLEHAN POIN */}
      {showRatioModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div className="glass-card animate-fade-in" style={{ width: '100%', maxWidth: '420px', padding: '26px', background: '#1e293b' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: '800', color: '#f8fafc', margin: 0 }}>
                Edit Rasio Perolehan Poin
              </h3>
              <button onClick={() => setShowRatioModal(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}><X size={20} /></button>
            </div>

            <form onSubmit={handleSaveRatio} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '0.78rem', color: '#94a3b8', display: 'block', marginBottom: '4px', fontWeight: '600' }}>
                  Nominal Belanja untuk 1 Poin (Rp) *
                </label>
                <input
                  type="number"
                  required
                  min="100"
                  step="100"
                  value={ratioInput}
                  onChange={e => setRatioInput(e.target.value)}
                  placeholder="Contoh: 100000"
                  className="form-input"
                  style={{ fontSize: '1.1rem', fontWeight: '900', color: '#38bdf8' }}
                />
                <span style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '4px', display: 'block' }}>
                  Setiap belanja kelipatan nominal di atas, pelanggan akan otomatis memperoleh 1 Poin.
                </span>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button type="button" onClick={() => setShowRatioModal(false)} className="btn-secondary" style={{ flex: 1, justifyContent: 'center' }}>Batal</button>
                <button type="submit" className="btn-primary" style={{ flex: 1, justifyContent: 'center' }}>Simpan Rasio</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
