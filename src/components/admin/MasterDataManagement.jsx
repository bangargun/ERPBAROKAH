import React, { useState } from 'react';
import ProductCategoryManagement from './ProductCategoryManagement';
import IngredientsManagement from './IngredientsManagement';
import IngredientCategoryManagement from './IngredientCategoryManagement';
import ProductManagement from './ProductManagement';
import CustomerManagement from './CustomerManagement';
import TableManagement from './TableManagement';
import OutletManagement from './OutletManagement';
import PaymentMethodManagement from './PaymentMethodManagement';
import SupplierManagement from './SupplierManagement';
import UnitManagement from './UnitManagement';
import ExpenseMasterManagement from './ExpenseMasterManagement';
import { 
  Package, 
  Layers, 
  Users, 
  Layout, 
  Store, 
  CreditCard, 
  Truck, 
  Scale, 
  ShoppingBasket,
  DollarSign,
  BookOpen,
  Plus, 
  Search, 
  Trash2, 
  Edit3, 
  CheckCircle2, 
  AlertCircle 
} from 'lucide-react';
import { getThemePalette } from '../../utils/themeUtils';
import DeleteGuardModal from './DeleteGuardModal';
import { requestDelete } from '../../utils/deleteGuard';

export default function MasterDataManagement({ masterData, setMasterData, selectedBranch, userSession, themeMode = 'dark' }) {
  const T = getThemePalette(themeMode);
  const isLight = themeMode === 'calm_sage' || themeMode === 'soft_blue' || themeMode === 'light';
  const [deleteGuardState, setDeleteGuardState] = useState(null);

  const [activeSubTab, setActiveSubTab] = useState('products');
  const [activeCategoryTab, setActiveCategoryTab] = useState('menu'); // 'menu' | 'ingredients'
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  // Form states for new entry
  const [newItemName, setNewItemName] = useState('');
  const [newItemExtra, setNewItemExtra] = useState('');
  const [newItemPrice, setNewItemPrice] = useState('');

  const formatRupiah = (val) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val || 0);
  };

  const subTabs = [
    { id: 'products', name: '1. Katalog Menu', shortLabel: 'Menu Resto', badge: 'Menu Katalog', desc: 'Daftar lengkap produk makanan, minuman, harga jual, estimasi HPP resep, dan status aktif kasir.', icon: Package, count: masterData.products.length },
    { id: 'categories', name: '2. Kategori Master', shortLabel: 'Kategori', badge: 'Kelompok Item', desc: 'Pengelompokan kategori menu restoran dan kategori bahan baku gudang untuk mempermudah POS & filter.', icon: Layers, count: (masterData.categories?.length || 0) + ((masterData.ingredientCategories || []).length || 6) },
    { id: 'ingredients', name: '3. Bahan Baku', shortLabel: 'Bahan Baku', badge: 'Inventory Raw', desc: 'Master data bahan baku mentah dapur, harga beli standar per satuan unit, dan batas minimum stok.', icon: ShoppingBasket, count: (masterData.ingredients || []).length },
    { id: 'customers', name: '4. Pelanggan', shortLabel: 'Pelanggan', badge: 'Loyalty CRM', desc: 'Daftar data member pelanggan, nomor telepon, riwayat akumulasi poin loyalitas, dan status tier.', icon: Users, count: masterData.customers.length },
    { id: 'tables', name: '5. Meja Resto', shortLabel: 'Meja Resto', badge: 'Table Layout', desc: 'Manajemen nomor meja makan per outlet cabang restoran, kapasitas kursi, dan status ketersediaan.', icon: Layout, count: masterData.tables.length },
    { id: 'outlets', name: '6. Outlet Cabang', shortLabel: 'Outlet Resto', badge: 'Branch Network', desc: 'Informasi seluruh cabang restoran Barokah Group, alamat, nomor telepon operasional, dan ID sinkronisasi POS.', icon: Store, count: masterData.outlets.length },
    { id: 'payments', name: '7. Metode Bayar', shortLabel: 'Metode Bayar', badge: 'Payment Channels', desc: 'Pengaturan kanal pembayaran kasir: Tunai (Cash), QRIS LinkAja/BCA, Mesin EDC, Transfer Bank, dan Online Delivery.', icon: CreditCard, count: masterData.paymentMethods.length },
    { id: 'suppliers', name: '8. Supplier', shortLabel: 'Supplier Vendor', badge: 'Vendor Logistics', desc: 'Database vendor & supplier bahan baku, kontak person (PIC), nomor telepon, dan kesepakatan tempo bayar (TOP).', icon: Truck, count: masterData.suppliers.length },
    { id: 'units', name: '9. Satuan Unit', shortLabel: 'Satuan Unit', badge: 'Measurement Units', desc: 'Daftar standar satuan takaran logistik dan resep (Kg, Gram, Liter, Pcs, Ikat, Kaleng, Bungkus, Porsi).', icon: Scale, count: masterData.units.length },
    { id: 'expenses', name: '10. Akun Biaya (COA)', shortLabel: 'Akuntansi COA', badge: 'COA Accounting', desc: 'Bagan akun standar akuntansi (Chart of Accounts), pos biaya operasional outlet, beban gaji, sewa, dan utilitas.', icon: BookOpen, count: (masterData.chartOfAccounts || masterData.expenseMaster || []).length }
  ];

  const handleAddItem = (e) => {
    e.preventDefault();
    if (!newItemName) return;

    const updated = { ...masterData };

    if (activeSubTab === 'products') {
      updated.products.unshift({
        id: Date.now(),
        name: newItemName,
        sku: `PRD-${Math.floor(100 + Math.random() * 900)}`,
        price: parseFloat(newItemPrice) || 50000,
        cost: (parseFloat(newItemPrice) || 50000) * 0.4,
        unit: 'Pcs',
        stock: 50,
        min_stock: 10,
        category_id: 1,
        outlet_id: selectedBranch || 1
      });
    } else if (activeSubTab === 'categories') {
      updated.categories.push({ id: Date.now(), name: newItemName, code: `CAT-${Date.now().toString().slice(-4)}`, description: newItemExtra || 'Kategori Baru' });
    } else if (activeSubTab === 'customers') {
      updated.customers.push({ id: Date.now(), name: newItemName, phone: newItemExtra || '0812-xxxx-xxxx', points: 0, tier: 'Silver', total_spend: 0 });
    } else if (activeSubTab === 'tables') {
      updated.tables.push({ id: Date.now(), outlet_id: selectedBranch || 1, table_number: newItemName, capacity: parseInt(newItemExtra) || 4, status: 'Available' });
    } else if (activeSubTab === 'suppliers') {
      updated.suppliers.push({ id: Date.now(), name: newItemName, contact_person: newItemExtra || 'Manager', phone: '0811-xxxx', product_supplied: 'Bahan Baku', payment_terms: 'Cash' });
    } else if (activeSubTab === 'units') {
      updated.units.push({ id: Date.now(), name: newItemName, symbol: newItemExtra || newItemName, category: 'Umum' });
    }

    setMasterData(updated);
    setShowAddModal(false);
    setNewItemName('');
    setNewItemExtra('');
    setNewItemPrice('');
  };

  // Hapus item dari daftar master data — dengan perlindungan lock untuk bahan baku
  const handleDeleteItem = (listKey, id, name = '') => {
    // Deteksi tipe untuk guard
    const guardType = listKey === 'ingredients' ? 'ingredient' : null;

    if (guardType) {
      requestDelete({
        masterData,
        type: guardType,
        id,
        name,
        setDeleteGuardState,
        onConfirmed: () => {
          const updated = { ...masterData };
          updated[listKey] = (updated[listKey] || []).filter(item => item.id !== id);
          setMasterData(updated);
        }
      });
    } else {
      // Item lain (kategori, pelanggan, meja, dll) — konfirmasi biasa
      if (!window.confirm(`Hapus item ini?`)) return;
      const updated = { ...masterData };
      updated[listKey] = (updated[listKey] || []).filter(item => item.id !== id);
      setMasterData(updated);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', background: T.pageBg, color: T.txtPrimary, transition: 'background 0.25s ease' }}>
      <div>
        <h2 style={{ fontSize: '0.98rem', fontWeight: '900', color: T.txtPrimary, margin: 0, letterSpacing: '-0.01em' }}>
          Sumber Data Master (Master Data Center)
        </h2>
        <p style={{ color: T.txtSecondary, fontSize: '0.72rem', marginTop: '2px', margin: 0 }}>
          Kelola data utama restoran: Produk, Kategori, Bahan Baku, Pelanggan, Meja, Outlet, Pembayaran, Supplier, Satuan, Akuntansi
        </p>
      </div>

      {/* Sticky Sub-Tab Navigation Bar (2-Row Grid: 5 tabs per row) — Enterprise Executive Styling */}
      {/* Sub-Tab Navigation Bar — SuperApp Circular Icon Grid (GoPay / Modern App Style) */}
      <div style={{
        background: T.cardBg,
        borderRadius: '16px',
        border: `1px solid ${T.border}`,
        padding: '14px 18px',
        boxShadow: T.shadowSm,
        marginBottom: '16px'
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(90px, 1fr))',
          gap: '8px',
          alignItems: 'start'
        }}>
          {subTabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeSubTab === tab.id;
            return (
              <div
                key={tab.id}
                onClick={() => { setActiveSubTab(tab.id); setSearchTerm(''); }}
                title={`${tab.name} (${tab.count} data) — ${tab.desc}`}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '8px 4px 6px 4px',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  background: isActive ? (isLight ? 'rgba(45, 122, 91, 0.08)' : 'rgba(45, 122, 91, 0.18)') : 'transparent',
                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                  position: 'relative'
                }}
              >
                {/* Circular Icon Badge */}
                <div style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: isActive
                    ? T.primaryBtn
                    : (isLight ? '#eef6f2' : '#14291f'),
                  border: isActive
                    ? `2px solid ${T.primary}`
                    : `1.5px solid ${isLight ? '#c8ded1' : '#234a38'}`,
                  color: isActive ? '#ffffff' : T.primary,
                  boxShadow: isActive
                    ? (T.primaryBtnShadow ? `0 6px 16px ${T.primaryBtnShadow}` : '0 6px 16px rgba(45, 122, 91, 0.40)')
                    : 'none',
                  transform: isActive ? 'scale(1.06)' : 'none',
                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                  position: 'relative'
                }}>
                  <Icon size={20} />
                  {/* Badge Counter */}
                  <span style={{
                    position: 'absolute',
                    top: '-4px',
                    right: '-4px',
                    fontSize: '0.60rem',
                    fontWeight: '900',
                    padding: '1px 5px',
                    borderRadius: '10px',
                    background: isActive ? '#ffffff' : T.primary,
                    color: isActive ? T.primary : '#ffffff',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
                    border: `1px solid ${isActive ? T.primary : '#ffffff'}`
                  }}>
                    {tab.count}
                  </span>
                </div>

                {/* Text Label */}
                <span style={{
                  fontSize: '0.74rem',
                  fontWeight: isActive ? '900' : '700',
                  color: isActive ? T.primary : T.txtPrimary,
                  textAlign: 'center',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  maxWidth: '100%',
                  letterSpacing: '-0.01em'
                }}>
                  {tab.shortLabel || tab.name}
                </span>

                {/* Active Indicator Underline */}
                {isActive && (
                  <div style={{
                    width: '18px',
                    height: '3px',
                    borderRadius: '2px',
                    background: T.primary,
                    marginTop: '-4px'
                  }} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* DYNAMIC ACTIVE CONTEXT CARD (Penjelasan Lengkap Data Master Saat Diklik) */}
      {(() => {
        const currentTabInfo = subTabs.find(t => t.id === activeSubTab) || subTabs[0];
        const CurrentIcon = currentTabInfo.icon;

        return (
          <div className="glass-card animate-fade-in" style={{
            background: T.cardBg,
            border: `1px solid ${T.border}`,
            borderLeft: `5px solid ${T.primary}`,
            borderRadius: '14px',
            padding: '14px 18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '14px',
            boxShadow: T.shadowSm,
            marginBottom: '16px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: 1, minWidth: '280px' }}>
              <div style={{
                width: '42px',
                height: '42px',
                borderRadius: '12px',
                background: T.primaryBtn,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                boxShadow: T.primaryBtnShadow ? `0 4px 14px ${T.primaryBtnShadow}` : '0 4px 14px rgba(45, 122, 91, 0.35)',
                flexShrink: 0
              }}>
                <CurrentIcon size={20} />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <h3 style={{ fontSize: '0.92rem', fontWeight: '900', color: T.txtPrimary, margin: 0 }}>
                    {currentTabInfo.name}
                  </h3>
                  <span style={{
                    fontSize: '0.62rem',
                    fontWeight: '800',
                    padding: '2px 8px',
                    borderRadius: '6px',
                    background: isLight ? 'rgba(45, 122, 91, 0.10)' : 'rgba(45, 122, 91, 0.22)',
                    color: T.primary,
                    border: `1px solid ${isLight ? '#c8ded1' : '#234a38'}`,
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em'
                  }}>
                    {currentTabInfo.badge}
                  </span>
                  <span style={{
                    fontSize: '0.62rem',
                    fontWeight: '700',
                    color: T.txtMuted
                  }}>
                    • Total: <strong style={{ color: T.primary }}>{currentTabInfo.count} Data Terdaftar</strong>
                  </span>
                </div>
                <p style={{ fontSize: '0.76rem', color: T.txtSecondary, margin: 0, fontWeight: '600', lineHeight: '1.35' }}>
                  {currentTabInfo.desc}
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
              <span style={{ fontSize: '0.70rem', color: T.txtMuted, fontWeight: '700', background: T.controlBg, padding: '5px 10px', borderRadius: '8px', border: `1px solid ${T.border}` }}>
                🗂️ Data Master: <strong style={{ color: T.primary }}>{currentTabInfo.shortLabel}</strong>
              </span>
            </div>
          </div>
        );
      })()}


      {/* Header Actions Bar (Search + Add) */}
      {activeSubTab !== 'products' && activeSubTab !== 'categories' && activeSubTab !== 'ingredients' && activeSubTab !== 'customers' && activeSubTab !== 'tables' && activeSubTab !== 'outlets' && activeSubTab !== 'payments' && activeSubTab !== 'suppliers' && activeSubTab !== 'units' && activeSubTab !== 'expenses' && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px' }}>
          <div style={{ position: 'relative', flex: 1, maxWidth: '360px' }}>
            <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              placeholder={`Cari ${subTabs.find(t => t.id === activeSubTab)?.name}...`}
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="form-input"
              style={{ paddingLeft: '36px' }}
            />
          </div>

          <button onClick={() => setShowAddModal(true)} className="btn-primary">
            <Plus size={16} />
            <span>+ Tambah {subTabs.find(t => t.id === activeSubTab)?.name}</span>
          </button>
        </div>
      )}









      {/* DATA VIEW TABLES BY ACTIVE SUB TAB */}
      <div className="glass-card" style={{ padding: '20px' }}>
        {/* 1. PRODUK (DEDICATED COMPONENT) */}
        {activeSubTab === 'products' && (
          <ProductManagement
            masterData={masterData}
            setMasterData={setMasterData}
            selectedBranch={selectedBranch}
            userSession={userSession}
            themeMode={themeMode}
          />
        )}


        {/* 2. KATEGORI (KATEGORI MENU & KATEGORI BAHAN BAKU) */}
        {activeSubTab === 'categories' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Inner Subtabs Navigation */}
            <div style={{
              display: 'inline-flex',
              background: T.cardBg2,
              padding: '4px',
              borderRadius: '12px',
              border: `1px solid ${T.borderStrong}`,
              gap: '4px',
              alignSelf: 'flex-start'
            }}>
              <button
                type="button"
                onClick={() => setActiveCategoryTab('menu')}
                style={{
                  padding: '8px 18px',
                  borderRadius: '9px',
                  border: 'none',
                  background: activeCategoryTab === 'menu' ? T.primary : 'transparent',
                  color: activeCategoryTab === 'menu' ? T.txtInverse : T.txtSecondary,
                  fontWeight: '800',
                  fontSize: '0.78rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  boxShadow: activeCategoryTab === 'menu' ? T.shadowSm : 'none'
                }}
              >
                <Package size={15} />
                <span>Kategori Menu</span>
                <span style={{
                  padding: '1px 6px',
                  borderRadius: '10px',
                  fontSize: '0.66rem',
                  background: activeCategoryTab === 'menu' ? 'rgba(0,0,0,0.2)' : T.inputBg,
                  color: activeCategoryTab === 'menu' ? T.txtInverse : T.txtPrimary
                }}>
                  {masterData.categories?.length || 0}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveCategoryTab('ingredients')}
                style={{
                  padding: '8px 18px',
                  borderRadius: '9px',
                  border: 'none',
                  background: activeCategoryTab === 'ingredients' ? T.primary : 'transparent',
                  color: activeCategoryTab === 'ingredients' ? T.txtInverse : T.txtSecondary,
                  fontWeight: '800',
                  fontSize: '0.78rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  boxShadow: activeCategoryTab === 'ingredients' ? T.shadowSm : 'none'
                }}
              >
                <ShoppingBasket size={15} />
                <span>Kategori Bahan Baku</span>
                <span style={{
                  padding: '1px 6px',
                  borderRadius: '10px',
                  fontSize: '0.66rem',
                  background: activeCategoryTab === 'ingredients' ? 'rgba(0,0,0,0.2)' : T.inputBg,
                  color: activeCategoryTab === 'ingredients' ? T.txtInverse : T.txtPrimary
                }}>
                  {(masterData.ingredientCategories || []).length || 6}
                </span>
              </button>
            </div>

            {/* Inner Content */}
            {activeCategoryTab === 'menu' ? (
              <ProductCategoryManagement
                masterData={masterData}
                setMasterData={setMasterData}
                selectedBranch={selectedBranch}
                userSession={userSession}
                themeMode={themeMode}
              />
            ) : (
              <IngredientCategoryManagement
                masterData={masterData}
                setMasterData={setMasterData}
                selectedBranch={selectedBranch}
                userSession={userSession}
                themeMode={themeMode}
              />
            )}
          </div>
        )}

        {/* 3. BAHAN BAKU (DEDICATED COMPONENT) */}
        {activeSubTab === 'ingredients' && (
          <IngredientsManagement
            masterData={masterData}
            setMasterData={setMasterData}
            selectedBranch={selectedBranch}
            userSession={userSession}
            themeMode={themeMode}
            onNavigateToCategories={() => {
              setActiveSubTab('categories');
              setActiveCategoryTab('ingredients');
            }}
          />
        )}



        {/* 4. PELANGGAN (DEDICATED COMPONENT) */}
        {activeSubTab === 'customers' && (
          <CustomerManagement
            masterData={masterData}
            setMasterData={setMasterData}
            selectedBranch={selectedBranch}
            userSession={userSession}
            themeMode={themeMode}
          />
        )}


        {/* 5. MEJA (DEDICATED COMPONENT) */}
        {activeSubTab === 'tables' && (
          <TableManagement
            masterData={masterData}
            setMasterData={setMasterData}
            selectedBranch={selectedBranch}
            userSession={userSession}
            themeMode={themeMode}
          />
        )}

        {/* 6. OUTLET (DEDICATED COMPONENT) */}
        {activeSubTab === 'outlets' && (
          <OutletManagement
            masterData={masterData}
            setMasterData={setMasterData}
            userSession={userSession}
            themeMode={themeMode}
          />
        )}


        {/* 7. METODE PEMBAYARAN (DEDICATED COMPONENT) */}
        {activeSubTab === 'payments' && (
          <PaymentMethodManagement
            masterData={masterData}
            setMasterData={setMasterData}
            userSession={userSession}
            themeMode={themeMode}
          />
        )}

        {/* 8. SUPPLIER (DEDICATED COMPONENT) */}
        {activeSubTab === 'suppliers' && (
          <SupplierManagement
            masterData={masterData}
            setMasterData={setMasterData}
            userSession={userSession}
            themeMode={themeMode}
          />
        )}

        {/* 9. SATUAN / UNIT (DEDICATED COMPONENT) */}
        {activeSubTab === 'units' && (
          <UnitManagement
            masterData={masterData}
            setMasterData={setMasterData}
            userSession={userSession}
            themeMode={themeMode}
          />
        )}

        {/* 10. BIAYA (DEDICATED COMPONENT) */}
        {activeSubTab === 'expenses' && (
          <ExpenseMasterManagement
            masterData={masterData}
            setMasterData={setMasterData}
            userSession={userSession}
            themeMode={themeMode}
          />
        )}




      </div>


      {/* Modal Add Master Data Item */}
      {showAddModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(5px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div className="glass-card" style={{ width: '100%', maxWidth: '440px', padding: '24px', background: T.cardBg, border: `1px solid ${T.border}` }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: '800', color: T.txtPrimary, marginBottom: '16px' }}>
              Tambah {subTabs.find(t => t.id === activeSubTab)?.name} Baru
            </h3>

            <form onSubmit={handleAddItem} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '0.78rem', color: T.txtSecondary, display: 'block', marginBottom: '4px' }}>Nama Item / Judul</label>
                <input type="text" required value={newItemName} onChange={e => setNewItemName(e.target.value)} className="form-input" placeholder="Masukkan nama..." />
              </div>

              {activeSubTab === 'products' && (
                <div>
                  <label style={{ fontSize: '0.78rem', color: T.txtSecondary, display: 'block', marginBottom: '4px' }}>Harga Jual (IDR)</label>
                  <input type="number" required value={newItemPrice} onChange={e => setNewItemPrice(e.target.value)} className="form-input" placeholder="50000" />
                </div>
              )}

              <div>
                <label style={{ fontSize: '0.78rem', color: T.txtSecondary, display: 'block', marginBottom: '4px' }}>Keterangan / Detail Tambahan</label>
                <input type="text" value={newItemExtra} onChange={e => setNewItemExtra(e.target.value)} className="form-input" placeholder="Detail..." />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
                <button type="button" onClick={() => setShowAddModal(false)} className="btn-secondary" style={{ flex: 1, justifyContent: 'center' }}>Batal</button>
                <button type="submit" className="btn-primary" style={{ flex: 1, justifyContent: 'center' }}>Simpan Item</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* DELETE GUARD MODAL — perlindungan hapus bahan baku yang punya transaksi */}
      <DeleteGuardModal
        guardState={deleteGuardState}
        onClose={() => setDeleteGuardState(null)}
        theme={themeMode}
      />
    </div>
  );
}
