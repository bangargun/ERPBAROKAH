import React, { useState } from 'react';
import { getThemePalette } from '../../utils/themeUtils';
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

export default function LoyaltyProgramPage({ masterData, setMasterData, themeMode = 'dark' }) {
  const T = getThemePalette(themeMode);
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', background: T.pageBg }} className="animate-fade-in">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '0.96rem', fontWeight: '900', color: T.txtPrimary, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Award size={20} color={T.warning} />
            <span>Program Loyalitas Pelanggan (Loyalty &amp; Rewards)</span>
          </h2>
          <p style={{ color: T.txtSecondary, fontSize: '0.72rem', marginTop: '2px', margin: 0 }}>
            Kelola tingkatan membership (New, Loyal, VIP), sistem poin belanja, benefit reward, dan katalog penukaran voucher
          </p>
        </div>

        <div style={{ display: 'flex', gap: '6px' }}>
          <button onClick={() => setActiveTab('tiers')} style={{ padding: '5px 8px', fontSize: '0.72rem', borderRadius: '8px', background: activeTab === 'tiers' ? T.tabActiveBg : T.tabInactiveBg, color: activeTab === 'tiers' ? T.tabActiveColor : T.tabInactiveColor, border: `1px solid ${T.tabBorder}` }} className={activeTab === 'tiers' ? 'btn-primary' : 'btn-secondary'}>
            <Star size={14} />
            <span>Tingkatan Membership</span>
          </button>
          <button onClick={() => setActiveTab('rewards')} style={{ padding: '5px 8px', fontSize: '0.72rem', borderRadius: '8px', background: activeTab === 'rewards' ? T.tabActiveBg : T.tabInactiveBg, color: activeTab === 'rewards' ? T.tabActiveColor : T.tabInactiveColor, border: `1px solid ${T.tabBorder}` }} className={activeTab === 'rewards' ? 'btn-primary' : 'btn-secondary'}>
            <Gift size={14} />
            <span>Katalog Hadiah</span>
          </button>
        </div>
      </div>

      {/* Overview Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
        <div className="glass-card" style={{ padding: '20px', background: T.cardBg, borderColor: T.border }}>
          <div style={{ fontSize: '0.8rem', color: T.txtSecondary, fontWeight: '600' }}>Total Member Terdaftar</div>
          <div style={{ fontSize: '1.8rem', fontWeight: '900', color: T.accentGreen, marginTop: '8px' }}>{customers.length} Member</div>
          <div style={{ fontSize: '0.75rem', color: T.txtMuted, marginTop: '4px' }}>Member aktif di database</div>
        </div>

        <div className="glass-card" style={{ padding: '20px', position: 'relative', background: T.cardBg, borderColor: T.border }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: '0.8rem', color: T.txtSecondary, fontWeight: '600' }}>Rasio Perolehan Poin</div>
            <button
              type="button"
              onClick={() => {
                setRatioInput(pointRatio);
                setShowRatioModal(true);
              }}
              style={{ padding: '3px 8px', background: T.infoBg, border: `1px solid ${T.infoBorder}`, color: T.info, borderRadius: '6px', fontSize: '0.70rem', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              <Edit3 size={12} />
              <span>Edit Rasio</span>
            </button>
          </div>
          <div style={{ fontSize: '1.3rem', fontWeight: '900', color: T.info, marginTop: '8px' }}>
            {formatRupiah(pointRatio)} = 1 Poin
          </div>
          <div style={{ fontSize: '0.75rem', color: T.success, fontWeight: '700', marginTop: '4px' }}>
            ● berlaku kelipatan (otomatis dari kasir POS)
          </div>
        </div>

        <div className="glass-card" style={{ padding: '20px', background: T.cardBg, borderColor: T.border }}>
          <div style={{ fontSize: '0.8rem', color: T.txtSecondary, fontWeight: '600' }}>Nilai Pembayaran Poin</div>
          <div style={{ fontSize: '1.4rem', fontWeight: '900', color: T.warning, marginTop: '8px' }}>
            1 Poin = Rp 1.000 Menu
          </div>
          <div style={{ fontSize: '0.75rem', color: T.info, fontWeight: '700', marginTop: '4px' }}>
            ● Setiap Rp 1.000 menu senilai 1 Poin
          </div>
        </div>

        <div className="glass-card" style={{ padding: '20px', background: T.cardBg, borderColor: T.border }}>
          <div style={{ fontSize: '0.8rem', color: T.txtSecondary, fontWeight: '600' }}>Pelanggan VIP Level</div>
          <div style={{ fontSize: '1.8rem', fontWeight: '900', color: T.warning, marginTop: '8px' }}>
            {customers.filter(c => (c.total_spend || 0) >= 5000000).length} VIP Member
          </div>
          <div style={{ fontSize: '0.75rem', color: T.txtMuted, marginTop: '4px' }}>Total belanja diatas Rp 5 Juta</div>
        </div>
      </div>

      {/* 1. TIER MEMBERSHIP RULES */}
      {activeTab === 'tiers' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '800', color: T.txtPrimary, margin: 0 }}>
              Ketentuan &amp; Benefit Tier Membership Pelanggan
            </h3>
            <button onClick={handleOpenAddTierModal} className="btn-primary" style={{ padding: '8px 16px', fontSize: '0.80rem', background: T.primaryBtn, color: T.navActiveTxt }}>
              <Plus size={16} />
              <span>+ Tambah Tier Baru</span>
            </button>
          </div>

          {tiersList.length === 0 ? (
            <div className="glass-card" style={{ padding: '40px', textAlign: 'center', color: T.txtSecondary, background: T.cardBg, borderColor: T.border }}>
              <Star size={40} color={T.txtMuted} style={{ margin: '0 auto 12px auto', opacity: 0.5 }} />
              <div style={{ fontSize: '1rem', fontWeight: '700', color: T.txtPrimary }}>Belum Ada Tier Membership Terdaftar</div>
              <div style={{ fontSize: '0.8rem', marginTop: '4px' }}>Silakan klik tombol "+ Tambah Tier Baru" di atas untuk menambahkan tingkatan membership.</div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
              {tiersList.map((tier) => (
                <div key={tier.id} className="glass-card" style={{ padding: '24px', position: 'relative', overflow: 'hidden', borderTop: `4px solid ${tier.badgeColor}`, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', background: T.cardBg, borderColor: T.border }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Award size={22} color={tier.badgeColor} />
                        <h4 style={{ fontSize: '1.15rem', fontWeight: '800', color: T.txtPrimary, margin: 0 }}>{tier.name}</h4>
                      </div>
                      <span style={{ background: T.cardBg2, color: tier.badgeColor, border: `1px solid ${tier.badgeColor}`, padding: '3px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: '800' }}>
                        {tier.multiplier}
                      </span>
                    </div>

                    <div style={{ marginTop: '12px', padding: '10px 14px', background: T.cardBg2, borderRadius: '8px', border: `1px solid ${T.borderStrong}`, fontSize: '0.82rem' }}>
                      <span style={{ color: T.txtSecondary }}>Syarat Total Belanja: </span>
                      <strong style={{ color: T.txtPrimary }}>{tier.spendThreshold}</strong>
                    </div>

                    <div style={{ marginTop: '16px' }}>
                      <div style={{ fontSize: '0.78rem', color: T.txtSecondary, fontWeight: '700', textTransform: 'uppercase', marginBottom: '8px' }}>
                        Daftar Keuntungan &amp; Benefit:
                      </div>
                      <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {(tier.benefits || []).map((b, bIdx) => (
                          <li key={bIdx} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.83rem', color: T.txtPrimary }}>
                            <CheckCircle2 size={16} color={tier.badgeColor} />
                            <span>{b}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* EDIT & DELETE TIER ACTIONS */}
                  <div style={{ marginTop: '20px', paddingTop: '14px', borderTop: `1px solid ${T.border}`, display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={() => handleOpenEditTierModal(tier)}
                      style={{ padding: '6px 12px', background: T.controlBg, border: `1px solid ${T.border}`, color: T.txtPrimary, borderRadius: '6px', fontSize: '0.76rem', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                    >
                      <Edit3 size={14} color={T.accentGreen} />
                      <span>Edit Tier</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteTier(tier.id, tier.name)}
                      style={{ padding: '6px 10px', background: T.dangerBg, border: `1px solid ${T.dangerBorder}`, color: T.danger, borderRadius: '6px', fontSize: '0.76rem', fontWeight: '700', cursor: 'pointer' }}
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
        <div className="glass-card" style={{ padding: '24px', background: T.cardBg, borderColor: T.border }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: '800', color: T.txtPrimary, margin: 0 }}>
                Katalog Hadiah &amp; Redeem Voucher
              </h3>
              <p style={{ color: T.txtSecondary, fontSize: '0.83rem', marginTop: '2px', margin: 0 }}>
                Daftar voucher dan reward yang dapat ditukarkan member menggunakan poin belanja
              </p>
            </div>
            <button onClick={handleOpenAddRewardModal} className="btn-primary" style={{ background: T.primaryBtn, color: T.navActiveTxt }}>
              <Plus size={16} />
              <span>+ Tambah Hadiah Baru</span>
            </button>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ background: T.tableHeaderBg, borderBottom: `1px solid ${T.border}`, color: T.txtSecondary, fontSize: '0.75rem', textTransform: 'uppercase' }}>
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
                    <td colSpan="5" style={{ textAlign: 'center', padding: '36px', color: T.txtMuted }}>
                      <Gift size={32} style={{ margin: '0 auto 8px auto', opacity: 0.4 }} />
                      <div>Belum ada hadiah / voucher reward terdaftar.</div>
                    </td>
                  </tr>
                ) : (
                  rewardCatalog.map(item => (
                    <tr key={item.id} style={{ borderBottom: `1px solid ${T.border}`, color: T.txtPrimary }}>
                      <td style={{ padding: '14px 12px', fontWeight: '800', color: T.txtPrimary }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Gift size={16} color={T.warning} />
                          <span>{item.title}</span>
                        </div>
                      </td>
                      <td style={{ padding: '14px 12px', fontWeight: '900', color: T.info, fontFamily: 'monospace' }}>
                        {item.points} Poin
                      </td>
                      <td style={{ padding: '14px 12px', color: T.txtPrimary }}>
                        <span style={{ background: T.cardBg2, padding: '3px 8px', borderRadius: '6px', border: `1px solid ${T.borderStrong}`, fontSize: '0.75rem' }}>
                          {item.tier}
                        </span>
                      </td>
                      <td style={{ padding: '14px 12px' }}>
                        <span style={{ background: item.status === 'Aktif' ? T.successBg : T.dangerBg, color: item.status === 'Aktif' ? T.success : T.danger, border: `1px solid ${item.status === 'Aktif' ? T.successBorder : T.dangerBorder}`, padding: '3px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: '700' }}>
                          ● {item.status}
                        </span>
                      </td>
                      <td style={{ padding: '14px 12px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                          <button
                            type="button"
                            onClick={() => handleOpenEditRewardModal(item)}
                            style={{ padding: '5px 10px', background: T.controlBg, border: `1px solid ${T.border}`, color: T.txtPrimary, borderRadius: '6px', fontSize: '0.75rem', fontWeight: '600', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                          >
                            <Edit3 size={14} color={T.accentGreen} />
                            <span>Edit</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteReward(item.id, item.title)}
                            style={{ padding: '5px 10px', background: T.dangerBg, color: T.danger, border: `1px solid ${T.dangerBorder}`, borderRadius: '6px', fontSize: '0.75rem', fontWeight: '600', cursor: 'pointer' }}
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
          <div className="glass-card animate-fade-in" style={{ width: '100%', maxWidth: '520px', padding: '26px', background: T.cardBg, borderColor: T.border }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: '800', color: T.txtPrimary, margin: 0 }}>
                {tierForm.id ? 'Edit Tier Membership' : 'Tambah Tier Membership Baru'}
              </h3>
              <button onClick={() => setShowEditTierModal(false)} style={{ background: 'none', border: 'none', color: T.txtSecondary, cursor: 'pointer' }}><X size={20} /></button>
            </div>

            <form onSubmit={handleSaveTier} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '0.78rem', color: T.txtSecondary, display: 'block', marginBottom: '4px', fontWeight: '600' }}>Nama Tier Membership *</label>
                <input
                  type="text"
                  required
                  value={tierForm.name}
                  onChange={e => setTierForm({ ...tierForm, name: e.target.value })}
                  placeholder="Contoh: Customer VIP, Customer Loyal"
                  className="form-input"
                  style={{ background: T.inputBg, border: `1px solid ${T.border}`, color: T.txtPrimary }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.78rem', color: T.txtSecondary, display: 'block', marginBottom: '4px', fontWeight: '600' }}>Syarat Total Belanja *</label>
                  <input
                    type="text"
                    required
                    value={tierForm.spendThreshold}
                    onChange={e => setTierForm({ ...tierForm, spendThreshold: e.target.value })}
                    placeholder="Contoh: Diatas Rp 5.000.000"
                    className="form-input"
                    style={{ background: T.inputBg, border: `1px solid ${T.border}`, color: T.txtPrimary }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.78rem', color: T.txtSecondary, display: 'block', marginBottom: '4px', fontWeight: '600' }}>Multiplier Poin *</label>
                  <input
                    type="text"
                    required
                    value={tierForm.multiplier}
                    onChange={e => setTierForm({ ...tierForm, multiplier: e.target.value })}
                    placeholder="Contoh: 2x Poin Double Bonus"
                    className="form-input"
                    style={{ background: T.inputBg, border: `1px solid ${T.border}`, color: T.txtPrimary }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.78rem', color: T.txtSecondary, display: 'block', marginBottom: '4px', fontWeight: '600' }}>Warna Badge Tier</label>
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
                  <label style={{ fontSize: '0.78rem', color: T.txtSecondary, fontWeight: '600' }}>Daftar Keuntungan / Benefit:</label>
                  <button
                    type="button"
                    onClick={() => setTierForm({ ...tierForm, benefits: [...tierForm.benefits, ''] })}
                    style={{ padding: '3px 8px', background: T.successBg, border: `1px solid ${T.successBorder}`, color: T.success, borderRadius: '6px', fontSize: '0.72rem', fontWeight: '800', cursor: 'pointer' }}
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
                        style={{ flex: 1, background: T.inputBg, border: `1px solid ${T.border}`, color: T.txtPrimary }}
                      />
                      {tierForm.benefits.length > 1 && (
                        <button
                          type="button"
                          onClick={() => {
                            const updated = tierForm.benefits.filter((_, idx) => idx !== bIdx);
                            setTierForm({ ...tierForm, benefits: updated });
                          }}
                          style={{ padding: '6px', background: T.dangerBg, border: `1px solid ${T.dangerBorder}`, color: T.danger, borderRadius: '6px', cursor: 'pointer' }}
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
          <div className="glass-card animate-fade-in" style={{ width: '100%', maxWidth: '480px', padding: '26px', background: T.cardBg, borderColor: T.border }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: '800', color: T.txtPrimary, margin: 0 }}>
                {rewardForm.id ? 'Edit Item Reward / Voucher' : 'Tambah Hadiah Reward Baru'}
              </h3>
              <button onClick={() => setShowRewardModal(false)} style={{ background: 'none', border: 'none', color: T.txtSecondary, cursor: 'pointer' }}><X size={20} /></button>
            </div>

            <form onSubmit={handleSaveReward} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '0.78rem', color: T.txtSecondary, display: 'block', marginBottom: '4px', fontWeight: '600' }}>Nama Reward / Voucher *</label>
                <input
                  type="text"
                  required
                  value={rewardForm.title}
                  onChange={e => setRewardForm({ ...rewardForm, title: e.target.value })}
                  placeholder="Contoh: Voucher Diskon Rp 50.000"
                  className="form-input"
                  style={{ background: T.inputBg, border: `1px solid ${T.border}`, color: T.txtPrimary }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.78rem', color: T.txtSecondary, display: 'block', marginBottom: '4px', fontWeight: '600' }}>Poin Dibutuhkan *</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={rewardForm.points}
                  onChange={e => setRewardForm({ ...rewardForm, points: e.target.value })}
                  placeholder="Contoh: 10"
                  className="form-input"
                  style={{ background: T.inputBg, border: `1px solid ${T.border}`, color: T.txtPrimary }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.78rem', color: T.txtSecondary, display: 'block', marginBottom: '4px', fontWeight: '600' }}>Khusus Tier</label>
                  <select
                    value={rewardForm.tier}
                    onChange={e => setRewardForm({ ...rewardForm, tier: e.target.value })}
                    className="form-input"
                    style={{ background: T.inputBg, border: `1px solid ${T.border}`, color: T.txtPrimary }}
                  >
                    <option value="Semua Tier">Semua Tier</option>
                    {tiersList.map(t => (
                      <option key={t.id} value={t.name}>{t.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '0.78rem', color: T.txtSecondary, display: 'block', marginBottom: '4px', fontWeight: '600' }}>Status</label>
                  <select
                    value={rewardForm.status}
                    onChange={e => setRewardForm({ ...rewardForm, status: e.target.value })}
                    className="form-input"
                    style={{ background: T.inputBg, border: `1px solid ${T.border}`, color: T.txtPrimary }}
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
          <div className="glass-card animate-fade-in" style={{ width: '100%', maxWidth: '420px', padding: '26px', background: T.cardBg, borderColor: T.border }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: '800', color: T.txtPrimary, margin: 0 }}>
                Edit Rasio Perolehan Poin
              </h3>
              <button onClick={() => setShowRatioModal(false)} style={{ background: 'none', border: 'none', color: T.txtSecondary, cursor: 'pointer' }}><X size={20} /></button>
            </div>

            <form onSubmit={handleSaveRatio} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '0.78rem', color: T.txtSecondary, display: 'block', marginBottom: '4px', fontWeight: '600' }}>
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
                  style={{ background: T.inputBg, border: `1px solid ${T.border}`, fontSize: '1.1rem', fontWeight: '900', color: T.info }}
                />
                <span style={{ fontSize: '0.72rem', color: T.txtSecondary, marginTop: '4px', display: 'block' }}>
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
