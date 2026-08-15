import React, { useState } from 'react';
import ProductCategoryManagement from './ProductCategoryManagement';
import IngredientsManagement from './IngredientsManagement';
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
    { id: 'categories', name: 'Kategori Menu', icon: Layers, count: masterData.categories.length },
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

      {/* Sticky Sub-Tab Navigation Bar (2-Row Grid: 5 tabs per row) */}
      <div style={{
        position: 'sticky',
        top: '-20px',
        zIndex: 1000,
        margin: '-20px -20px 12px -20px',
        padding: '16px 20px 12px 20px',
        background: T.pageBg,
        borderBottom: `1.5px solid ${T.border}`,
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        display: 'grid',
        gridTemplateColumns: 'repeat(5, 1fr)',
        gap: '8px',
        transition: 'background 0.25s ease'
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
                gap: '6px',
                padding: '5px 8px',
                borderRadius: '8px',
                border: '1px solid',
                borderColor: isActive ? T.accentGold : T.border,
                background: isActive ? T.navActiveBg : T.cardBg,
                color: isActive ? T.navActiveTxt : T.txtSecondary,
                fontWeight: isActive ? '800' : '600',
                fontSize: '0.72rem',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: isActive ? T.navActiveShadow : 'none'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                <Icon size={13} color={isActive ? T.navActiveTxt : T.txtMuted} />
                <span>{tab.name}</span>
              </div>
              <span style={{
                background: isActive ? 'rgba(255,255,255,0.25)' : T.cardBg2,
                color: isActive ? '#ffffff' : T.txtMuted,
                fontSize: '0.64rem',
                fontWeight: '700',
                padding: '1px 5px',
                borderRadius: '6px'
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


        {/* 2. KATEGORI PRODUK (DEDICATED COMPONENT) */}
        {activeSubTab === 'categories' && (
          <ProductCategoryManagement
            masterData={masterData}
            setMasterData={setMasterData}
            selectedBranch={selectedBranch}
            userSession={userSession}
            themeMode={themeMode}
          />
        )}

        {/* 3. BAHAN BAKU (DEDICATED COMPONENT) */}
        {activeSubTab === 'ingredients' && (
          <IngredientsManagement
            masterData={masterData}
            setMasterData={setMasterData}
            selectedBranch={selectedBranch}
            userSession={userSession}
            themeMode={themeMode}
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
