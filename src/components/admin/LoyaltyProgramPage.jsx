import React, { useState } from 'react';
import { Award, Star, Gift, Users, CreditCard, ChevronRight, CheckCircle2, ShieldCheck, Zap, Plus, Settings } from 'lucide-react';

export default function LoyaltyProgramPage({ masterData, setMasterData }) {
  const [activeTab, setActiveTab] = useState('tiers');

  const customers = masterData.customers || [];

  const formatRupiah = (num) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(num || 0);
  };

  const tiersList = [
    {
      name: 'New Customer',
      spendThreshold: 'Kurang dari Rp 1.000.000',
      badgeColor: '#38bdf8',
      multiplier: '1x Poin',
      benefits: [
        'Voucher Welcome Drink Gratis',
        'Akses Promo Reguler Kasir',
        'Pencatatan Riwayat Transaksi'
      ]
    },
    {
      name: 'Customer Loyal',
      spendThreshold: 'Rp 1.000.000 - Rp 5.000.000',
      badgeColor: '#34d399',
      multiplier: '1.5x Poin',
      benefits: [
        'Diskon 5% Setiap Transaksi Dine-in',
        'Kado Ulang Tahun (Birthday Dessert)',
        'Prioritas Antrean Kasir',
        'Akses Menu Special Tasting'
      ]
    },
    {
      name: 'Customer VIP',
      spendThreshold: 'Diatas Rp 5.000.000',
      badgeColor: '#fbbf24',
      multiplier: '2x Poin Double Bonus',
      benefits: [
        'Diskon 10% All Menu & Beverages',
        'Bebas Reservasi Meja VIP Tanpa Minimum Charge',
        'Free Chef Special Dessert Setiap Kunjungan',
        'Undangan Eksklusif Event Launching Menu Baru'
      ]
    }
  ];

  const rewardCatalog = [
    { id: 1, title: 'Voucher Diskon Rp 25.000', points: 250, tier: 'Semua Tier', status: 'Aktif' },
    { id: 2, title: 'Free Signature Iced Artisan Latte', points: 350, tier: 'Customer Loyal', status: 'Aktif' },
    { id: 3, title: 'Voucher Diskon Rp 100.000', points: 900, tier: 'Customer VIP', status: 'Aktif' },
    { id: 4, title: 'Free Main Course Wagyu Steak', points: 1500, tier: 'Customer VIP', status: 'Aktif' }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }} className="animate-fade-in">
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '800', color: '#f8fafc', letterSpacing: '-0.02em' }}>
            Program Loyalitas Pelanggan (Loyalty & Rewards)
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
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
        <div className="glass-card" style={{ padding: '20px' }}>
          <div style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: '600' }}>Total Member Terdaftar</div>
          <div style={{ fontSize: '1.8rem', fontWeight: '900', color: '#818cf8', marginTop: '8px' }}>{customers.length} Member</div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>Member aktif di database</div>
        </div>

        <div className="glass-card" style={{ padding: '20px' }}>
          <div style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: '600' }}>Rasio Perolehan Poin</div>
          <div style={{ fontSize: '1.5rem', fontWeight: '900', color: '#38bdf8', marginTop: '8px' }}>Rp 10.000 = 1 Poin</div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>Hitungan otomatis dari kasir</div>
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
          <h3 style={{ fontSize: '1.1rem', fontWeight: '800', color: '#f8fafc' }}>
            Ketentuan & Benefit Tier Membership Pelanggan
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
            {tiersList.map((tier, idx) => (
              <div key={idx} className="glass-card" style={{ padding: '24px', position: 'relative', overflow: 'hidden', borderTop: `4px solid ${tier.badgeColor}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Award size={22} color={tier.badgeColor} />
                    <h4 style={{ fontSize: '1.15rem', fontWeight: '800', color: '#f8fafc' }}>{tier.name}</h4>
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
                    Daftar Keuntungan & Benefit:
                  </div>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {tier.benefits.map((b, bIdx) => (
                      <li key={bIdx} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.83rem', color: '#cbd5e1' }}>
                        <CheckCircle2 size={16} color={tier.badgeColor} />
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 2. REWARD CATALOG */}
      {activeTab === 'rewards' && (
        <div className="glass-card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: '800', color: '#f8fafc' }}>
                Katalog Hadiah & Redeem Voucher
              </h3>
              <p style={{ color: '#94a3b8', fontSize: '0.83rem', marginTop: '2px' }}>
                Daftar voucher dan reward yang dapat ditukarkan member menggunakan poin belanja
              </p>
            </div>
            <button className="btn-primary">
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
                </tr>
              </thead>
              <tbody>
                {rewardCatalog.map(item => (
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
                      <span style={{ background: 'rgba(16,185,129,0.15)', color: '#34d399', border: '1px solid rgba(16,185,129,0.3)', padding: '3px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: '700' }}>
                        ● {item.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
