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
    { id: 'products', name: 'Katalog Menu', icon: Package, count: masterData.products.length },
    { id: 'categories', name: 'Kategori', icon: Layers, count: (masterData.categories?.length || 0) + ((masterData.ingredientCategories || []).length || 6) },
    { id: 'ingredients', name: 'Bahan Baku', icon: ShoppingBasket, count: (masterData.ingredients || []).length },
    { id: 'customers', name: 'Pelanggan', icon: Users, count: masterData.customers.length },
    { id: 'tables', name: 'Meja', icon: Layout, count: masterData.tables.length },
    { id: 'outlets', name: 'Outlet', icon: Store, count: masterData.outlets.length },
    { id: 'payments', name: 'Metode Pembayaran', icon: CreditCard, count: masterData.paymentMethods.length },
    { id: 'suppliers', name: 'Supplier', icon: Truck, count: masterData.suppliers.length },
    { id: 'units', name: 'Satuan/Unit', icon: Scale, count: masterData.units.length },
    { id: 'expenses', name: 'Akuntansi', icon: BookOpen, count: (masterData.chartOfAccounts || masterData.expenseMaster || []).length }
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
      <div style={{
        position: 'sticky',
        top: '-20px',
        zIndex: 1000,
        margin: '-20px -20px 14px -20px',
        padding: '14px 20px 12px 20px',
        background: themeMode === 'soft_blue' ? 'rgba(240, 246, 255, 0.96)' : 'rgba(11, 15, 25, 0.96)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderBottom: `1px solid ${T.border}`,
        boxShadow: themeMode === 'soft_blue' ? '0 6px 20px -4px rgba(0,0,0,0.06)' : '0 6px 20px -4px rgba(0,0,0,0.4)',
        display: 'grid',
        gridTemplateColumns: 'repeat(5, 1fr)',
        gap: '8px',
        transition: 'all 0.25s ease'
      }}>
        {subTabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => { setActiveSubTab(tab.id); setSearchTerm(''); }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '8px',
                padding: '8px 12px',
                borderRadius: '10px',
                border: isActive ? '1px solid rgba(56, 189, 248, 0.5)' : '1px solid transparent',
                background: isActive
                  ? (themeMode === 'soft_blue' ? 'linear-gradient(135deg, #1a6fc4 0%, #0d5295 100%)' : 'linear-gradient(135deg, rgba(30, 58, 138, 0.9) 0%, rgba(15, 23, 42, 0.95) 100%)')
                  : (themeMode === 'soft_blue' ? 'rgba(255, 255, 255, 0.7)' : 'rgba(30, 41, 59, 0.4)'),
                color: isActive ? '#ffffff' : (themeMode === 'soft_blue' ? '#1e4a7c' : '#94a3b8'),
                fontWeight: isActive ? '900' : '700',
                fontSize: '0.74rem',
                letterSpacing: '-0.01em',
                cursor: 'pointer',
                transition: 'all 0.22s cubic-bezier(0.4, 0, 0.2, 1)',
                boxShadow: isActive
                  ? (themeMode === 'soft_blue' ? '0 4px 14px rgba(13, 82, 149, 0.3)' : '0 4px 14px rgba(56, 189, 248, 0.25)')
                  : 'none',
                transform: isActive ? 'scale(1.01)' : 'none'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                <div style={{
                  width: '22px',
                  height: '22px',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: isActive ? 'rgba(255, 255, 255, 0.18)' : (themeMode === 'soft_blue' ? 'rgba(30, 74, 124, 0.08)' : 'rgba(255, 255, 255, 0.06)'),
                  flexShrink: 0
                }}>
                  <Icon size={13} color={isActive ? '#ffffff' : (themeMode === 'soft_blue' ? '#1a6fc4' : '#38bdf8')} />
                </div>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{tab.name}</span>
              </div>
              <span style={{
                background: isActive ? 'rgba(255, 255, 255, 0.22)' : (themeMode === 'soft_blue' ? '#eaf4ff' : '#1e293b'),
                color: isActive ? '#ffffff' : (themeMode === 'soft_blue' ? '#1a6fc4' : '#38bdf8'),
                fontSize: '0.64rem',
                fontWeight: '900',
                padding: '2px 7px',
                borderRadius: '8px',
                border: isActive ? '1px solid rgba(255,255,255,0.3)' : `1px solid ${T.border}`,
                flexShrink: 0
              }}>
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>


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
