import React, { useState, useMemo } from 'react';
import { 
  Boxes, Plus, Search, Filter, Edit3, Trash2, X, CheckCircle2, 
  AlertTriangle, Wrench, Calendar, DollarSign, Building2, User, 
  FileSpreadsheet, QrCode, Tag, ArrowUpDown, ChevronRight, ShieldAlert, Sparkles
} from 'lucide-react';
import { getThemePalette } from '../../utils/themeUtils';
import { getApiUrl } from '../../utils/apiConfig';
import { canDeleteModule, canEditModule } from '../../utils/permissionUtils';
import PaginationControls from './PaginationControls';


const CATEGORY_LOCATIONS = {
  'Peralatan Dapur & Masak': [
    'Dapur Utama (Main Kitchen)',
    'Dapur Persiapan (Prep Area)',
    'Area Pemanggang (Grill / Bakaran)',
    'Area Penggorengan (Fryer Station)',
    'Area Cuci Piring (Dishwashing Area)',
    'Cold Storage / Freezer Room'
  ],
  'Hardware POS & Elektronik': [
    'Meja Kasir Utama (Cashier Desk)',
    'Area Bar / Kasir Bar',
    'Ruang Server & CCTV',
    'Kantor Manager / Supervisor Cabang',
    'Pos Pelayan / Waiter Station'
  ],
  'Furnitur & Ruang Makan': [
    'Ruang Makan Utama (Lantai 1)',
    'Ruang Makan Lantai 2',
    'Area VIP / Private Room',
    'Area Outdoor / Teras Depan',
    'Area Lesehan'
  ],
  'Kendaraan Operasional': [
    'Area Parkir Depan Outlet',
    'Garasi Logistik Cabang',
    'Pos Delivery Motor'
  ],
  'Gedung & Renovasi': [
    'Area Bangunan & Fasad Depan',
    'Area Toilet & Wastafel',
    'Area Gudang Belakang',
    'Ruko / Keseluruhan Bangunan'
  ]
};

const ASSET_CATEGORIES = [
  'Peralatan Dapur & Masak',
  'Hardware POS & Elektronik',
  'Furnitur & Ruang Makan',
  'Kendaraan Operasional',
  'Gedung & Renovasi'
];

const ASSET_CONDITIONS = [
  { value: 'Baik', label: 'Baik / Prima', color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
  { value: 'Perlu Servis', label: 'Perlu Servis', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  { value: 'Rusak', label: 'Rusak / Afkir', color: '#ef4444', bg: 'rgba(239,68,68,0.12)' }
];

export default function AssetManagement({ masterData, setMasterData, selectedBranch, userSession, themeMode = 'dark' }) {
  const T = getThemePalette(themeMode);
  const allowDelete = canDeleteModule(userSession, 'masterData', masterData?.permissionMatrix);
  const allowEdit = canEditModule(userSession, 'masterData', masterData?.permissionMatrix);

  // States
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedCondition, setSelectedCondition] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editingAsset, setEditingAsset] = useState(null);

  // Pagination & Sorting
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [sortField, setSortField] = useState('code');
  const [sortDirection, setSortDirection] = useState('asc');

  // Form State
  const [formCode, setFormCode] = useState('');
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState(ASSET_CATEGORIES[0]);
  const [formOutletId, setFormOutletId] = useState(masterData?.outlets?.[0]?.id || 1);
  const [formPurchaseDate, setFormPurchaseDate] = useState(new Date().toISOString().split('T')[0]);
  const [formPurchaseCost, setFormPurchaseCost] = useState('');
  const [formUsefulLifeYears, setFormUsefulLifeYears] = useState('5');
  const [formSalvageValue, setFormSalvageValue] = useState('0');
  const [formCondition, setFormCondition] = useState('Baik');
  const [formLocation, setFormLocation] = useState('Dapur Utama');
  const [formPic, setFormPic] = useState('');
  const [formNotes, setFormNotes] = useState('');

  // Format Helper
  const formatRp = (num) => `Rp ${(Number(num) || 0).toLocaleString('id-ID')}`;

  // Daftar Cabang
  const outlets = masterData?.outlets || [];

  // Hitung Nilai Depresiasi & Buku per Aset
  const calculateDepreciation = (asset) => {
    const cost = Number(asset.purchase_cost || asset.cost || 0);
    const salvage = Number(asset.salvage_value || 0);
    const years = Number(asset.useful_life_years || asset.useful_life || 5);
    const totalMonths = Math.max(1, years * 12);
    const monthlyDep = Math.max(0, (cost - salvage) / totalMonths);

    // Hitung berapa bulan sejak tanggal pembelian
    const pDate = new Date(asset.purchase_date || asset.date || new Date());
    const now = new Date();
    const monthsElapsed = Math.max(0, (now.getFullYear() - pDate.getFullYear()) * 12 + (now.getMonth() - pDate.getMonth()));

    const accumDep = Math.min(cost - salvage, Math.round(monthlyDep * monthsElapsed));
    const bookValue = Math.max(salvage, cost - accumDep);

    return {
      monthlyDep: Math.round(monthlyDep),
      accumDep,
      bookValue,
      monthsElapsed,
      totalMonths
    };
  };

  // Filter Aset berdasarkan Cabang Aktif
  const rawAssets = masterData?.fixedAssets || masterData?.assets || [];
  const branchFilteredAssets = useMemo(() => {
    return rawAssets.filter(a => {
      if (!a) return false;
      if (selectedBranch && selectedBranch !== 'all' && selectedBranch !== 'central') {
        return String(a.outlet_id) === String(selectedBranch);
      }
      return true;
    });
  }, [rawAssets, selectedBranch]);

  // Filter Kategori, Kondisi, & Search
  const filteredAssets = useMemo(() => {
    return branchFilteredAssets.filter(a => {
      if (selectedCategory !== 'all' && a.category !== selectedCategory) return false;
      if (selectedCondition !== 'all' && (a.condition_status || a.condition || 'Baik') !== selectedCondition) return false;
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const codeMatch = (a.code || '').toLowerCase().includes(q);
        const nameMatch = (a.name || '').toLowerCase().includes(q);
        const locMatch = (a.location || '').toLowerCase().includes(q);
        const picMatch = (a.pic || '').toLowerCase().includes(q);
        return codeMatch || nameMatch || locMatch || picMatch;
      }
      return true;
    }).sort((a, b) => {
      let valA = a[sortField] || '';
      let valB = b[sortField] || '';
      if (typeof valA === 'string') valA = valA.toLowerCase();
      if (typeof valB === 'string') valB = valB.toLowerCase();
      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [branchFilteredAssets, selectedCategory, selectedCondition, searchTerm, sortField, sortDirection]);

  // Ringkasan KPI
  const stats = useMemo(() => {
    let totalCost = 0;
    let totalAccumDep = 0;
    let totalBookValue = 0;
    let goodCount = 0;
    let serviceCount = 0;
    let brokenCount = 0;

    branchFilteredAssets.forEach(a => {
      const dep = calculateDepreciation(a);
      totalCost += Number(a.purchase_cost || a.cost || 0);
      totalAccumDep += dep.accumDep;
      totalBookValue += dep.bookValue;

      const cond = a.condition_status || a.condition || 'Baik';
      if (cond === 'Baik') goodCount++;
      else if (cond === 'Perlu Servis') serviceCount++;
      else brokenCount++;
    });

    return {
      totalCost,
      totalAccumDep,
      totalBookValue,
      totalCount: branchFilteredAssets.length,
      goodCount,
      serviceCount,
      brokenCount
    };
  }, [branchFilteredAssets]);

  // Nama user yang sedang aktif / membuka
  const loggedInUserName = userSession?.name || userSession?.username || 'Super Admin';

  // Open Modal Tambah
  const handleOpenAdd = () => {
    const defaultOutlet = outlets.find(o => String(o.id) === String(selectedBranch)) || outlets[0] || { id: 1 };
    const nextNum = (rawAssets.length + 1).toString().padStart(3, '0');
    const defaultCat = ASSET_CATEGORIES[0];
    const defaultLoc = CATEGORY_LOCATIONS[defaultCat]?.[0] || 'Dapur Utama (Main Kitchen)';

    setEditingAsset(null);
    setFormCode(`AST-${nextNum}`);
    setFormName('');
    setFormCategory(defaultCat);
    setFormOutletId(defaultOutlet.id);
    setFormPurchaseDate(new Date().toISOString().split('T')[0]);
    setFormPurchaseCost('');
    setFormUsefulLifeYears('5');
    setFormSalvageValue('0');
    setFormCondition('Baik');
    setFormLocation(defaultLoc);
    setFormPic(loggedInUserName);
    setFormNotes('');
    setShowModal(true);
  };

  // Saat kategori diganti, sesuaikan lokasi spesifik default
  const handleCategoryChange = (newCat) => {
    setFormCategory(newCat);
    const locs = CATEGORY_LOCATIONS[newCat] || [];
    if (locs.length > 0 && !locs.includes(formLocation)) {
      setFormLocation(locs[0]);
    }
  };

  // Open Modal Edit
  const handleOpenEdit = (a) => {
    setEditingAsset(a);
    setFormCode(a.code || '');
    setFormName(a.name || '');
    setFormCategory(a.category || ASSET_CATEGORIES[0]);
    setFormOutletId(a.outlet_id || outlets[0]?.id || 1);
    setFormPurchaseDate(a.purchase_date || a.date || new Date().toISOString().split('T')[0]);
    setFormPurchaseCost(String(a.purchase_cost || a.cost || ''));
    setFormUsefulLifeYears(String(a.useful_life_years || a.useful_life || '5'));
    setFormSalvageValue(String(a.salvage_value || '0'));
    setFormCondition(a.condition_status || a.condition || 'Baik');
    setFormLocation(a.location || 'Dapur Utama');
    setFormPic(a.pic || '');
    setFormNotes(a.notes || '');
    setShowModal(true);
  };

  // Submit Simpan
  const handleSave = async (e) => {
    e.preventDefault();
    if (!formName.trim() || !formPurchaseCost) {
      alert('Nama Aset dan Harga Beli wajib diisi!');
      return;
    }

    const matchedOutlet = outlets.find(o => String(o.id) === String(formOutletId)) || { name: 'Cabang' };
    const nowTs = Date.now();
    const assetId = editingAsset ? editingAsset.id : `AST-${nowTs}`;

    const newAsset = {
      id: assetId,
      code: formCode || `AST-${nowTs}`,
      name: formName.trim(),
      category: formCategory,
      outlet_id: Number(formOutletId),
      outlet_name: matchedOutlet.name,
      purchase_date: formPurchaseDate,
      purchase_cost: Number(formPurchaseCost),
      useful_life_years: Number(formUsefulLifeYears) || 5,
      salvage_value: Number(formSalvageValue) || 0,
      condition_status: formCondition,
      location: formLocation.trim(),
      pic: formPic.trim(),
      notes: formNotes.trim(),
      updated_at: new Date().toISOString()
    };

    let updatedList = [];
    if (editingAsset) {
      updatedList = rawAssets.map(a => String(a.id) === String(editingAsset.id) ? newAsset : a);
    } else {
      updatedList = [newAsset, ...rawAssets];
    }

    const newMaster = {
      ...masterData,
      fixedAssets: updatedList,
      assets: updatedList,
      _lastUpdated: nowTs
    };

    setMasterData(newMaster);
    setShowModal(false);

    // Sync ke server backend
    try {
      await fetch(getApiUrl('/api/master-data'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newMaster)
      });
    } catch (err) {}
  };

  // Hapus Aset
  const handleDelete = async (a) => {
    if (!window.confirm(`Yakin ingin menghapus data aset "${a.name}" (${a.code}) secara permanen?`)) return;

    const filtered = rawAssets.filter(item => String(item.id) !== String(a.id) && String(item.code) !== String(a.code));
    const nowTs = Date.now();

    const newMaster = {
      ...masterData,
      fixedAssets: filtered,
      assets: filtered,
      _lastUpdated: nowTs
    };

    setMasterData(newMaster);

    // Trigger delete-item API
    try {
      await fetch(getApiUrl('/api/master-data/delete-item'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'fixedAssets', id: a.id, code: a.code, name: a.name })
      });
    } catch (err) {}
  };

  // Paginated Data
  const paginatedAssets = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredAssets.slice(start, start + pageSize);
  }, [filteredAssets, currentPage, pageSize]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '4px' }}>
      
      {/* 1. TOP HEADER & ACTION BUTTONS */}
      <div style={{
        background: T.cardBg,
        borderRadius: '16px',
        padding: '20px 24px',
        border: `1px solid ${T.border}`,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '16px',
        boxShadow: T.shadowCard
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: '52px',
            height: '52px',
            borderRadius: '14px',
            background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 8px 20px rgba(245,158,11,0.35)'
          }}>
            <Boxes size={28} color="#ffffff" />
          </div>
          <div>
            <h1 style={{ fontSize: '1.45rem', fontWeight: '900', color: T.txtPrimary, margin: 0, letterSpacing: '-0.02em' }}>
              Manajemen Aset &amp; Inventaris Restoran
            </h1>
            <p style={{ fontSize: '0.82rem', color: T.txtSecondary, margin: '4px 0 0 0', fontWeight: '600' }}>
              Pencatatan inventaris alat masak dapur, perangkat POS kasir, furnitur, kendaraan, dan penyusutan depresiasi otomatis
            </p>
          </div>
        </div>

        {allowEdit && (
          <button
            onClick={handleOpenAdd}
            style={{
              padding: '12px 22px',
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              color: '#ffffff',
              border: 'none',
              borderRadius: '12px',
              fontWeight: '900',
              fontSize: '0.90rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 6px 20px rgba(16,185,129,0.35)',
              transition: 'all 0.2s'
            }}
          >
            <Plus size={18} />
            <span>+ Tambah Aset Baru</span>
          </button>
        )}
      </div>

      {/* 2. STATS KPI CARDS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
        
        {/* Card 1: Total Nilai Perolehan */}
        <div style={{ background: T.cardBg, borderRadius: '14px', padding: '18px 20px', border: `1px solid ${T.border}`, boxShadow: T.shadowCard }}>
          <div style={{ fontSize: '0.76rem', color: T.txtSecondary, fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Total Nilai Perolehan (Modal Awal)
          </div>
          <div style={{ fontSize: '1.45rem', fontWeight: '900', color: '#38bdf8', marginTop: '6px' }}>
            {formatRp(stats.totalCost)}
          </div>
          <div style={{ fontSize: '0.74rem', color: T.txtMuted, marginTop: '4px' }}>
            Dari total {stats.totalCount} unit barang terdaftar
          </div>
        </div>

        {/* Card 2: Akumulasi Penyusutan */}
        <div style={{ background: T.cardBg, borderRadius: '14px', padding: '18px 20px', border: `1px solid ${T.border}`, boxShadow: T.shadowCard }}>
          <div style={{ fontSize: '0.76rem', color: T.txtSecondary, fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Akumulasi Penyusutan (Depresiasi)
          </div>
          <div style={{ fontSize: '1.45rem', fontWeight: '900', color: '#f43f5e', marginTop: '6px' }}>
            - {formatRp(stats.totalAccumDep)}
          </div>
          <div style={{ fontSize: '0.74rem', color: T.txtMuted, marginTop: '4px' }}>
            Metode Garis Lurus (Straight-Line)
          </div>
        </div>

        {/* Card 3: Nilai Buku Bersih */}
        <div style={{ background: T.cardBg, borderRadius: '14px', padding: '18px 20px', border: `1px solid ${T.border}`, boxShadow: T.shadowCard }}>
          <div style={{ fontSize: '0.76rem', color: T.txtSecondary, fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Nilai Buku Saat Ini (Net Book Value)
          </div>
          <div style={{ fontSize: '1.45rem', fontWeight: '900', color: '#10b981', marginTop: '6px' }}>
            {formatRp(stats.totalBookValue)}
          </div>
          <div style={{ fontSize: '0.74rem', color: T.txtMuted, marginTop: '4px' }}>
            Nilai riil yang tercatat di Neraca
          </div>
        </div>

        {/* Card 4: Status Kondisi Fisik */}
        <div style={{ background: T.cardBg, borderRadius: '14px', padding: '18px 20px', border: `1px solid ${T.border}`, boxShadow: T.shadowCard }}>
          <div style={{ fontSize: '0.76rem', color: T.txtSecondary, fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Status Kondisi Fisik Barang
          </div>
          <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
            <span style={{ padding: '4px 10px', borderRadius: '8px', background: 'rgba(16,185,129,0.15)', color: '#10b981', fontWeight: '900', fontSize: '0.80rem' }}>
              ✓ {stats.goodCount} Baik
            </span>
            <span style={{ padding: '4px 10px', borderRadius: '8px', background: 'rgba(245,158,11,0.15)', color: '#f59e0b', fontWeight: '900', fontSize: '0.80rem' }}>
              ⚠ {stats.serviceCount} Servis
            </span>
            <span style={{ padding: '4px 10px', borderRadius: '8px', background: 'rgba(239,68,68,0.15)', color: '#ef4444', fontWeight: '900', fontSize: '0.80rem' }}>
              ✕ {stats.brokenCount} Rusak
            </span>
          </div>
        </div>

      </div>

      {/* 3. FILTER BAR & SEARCH */}
      <div style={{
        background: T.cardBg,
        borderRadius: '14px',
        padding: '16px 20px',
        border: `1px solid ${T.border}`,
        display: 'flex',
        gap: '14px',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxShadow: T.shadowCard
      }}>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center', flex: 1 }}>
          
          {/* Search Box */}
          <div style={{
            position: 'relative',
            minWidth: '240px',
            flex: '1 1 240px'
          }}>
            <Search size={16} color={T.txtMuted} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              placeholder="Cari kode aset, nama barang, lokasi, PIC..."
              value={searchTerm}
              onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              style={{
                width: '100%',
                padding: '9px 12px 9px 36px',
                borderRadius: '10px',
                border: `1px solid ${T.border}`,
                background: T.controlBg,
                color: T.txtPrimary,
                fontSize: '0.84rem',
                fontWeight: '600',
                outline: 'none'
              }}
            />
          </div>

          {/* Filter Kategori */}
          <select
            value={selectedCategory}
            onChange={e => { setSelectedCategory(e.target.value); setCurrentPage(1); }}
            style={{
              padding: '9px 14px',
              borderRadius: '10px',
              border: `1px solid ${T.border}`,
              background: T.controlBg,
              color: T.txtPrimary,
              fontSize: '0.84rem',
              fontWeight: '700',
              outline: 'none'
            }}
          >
            <option value="all">Semua Kategori Aset</option>
            {ASSET_CATEGORIES.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          {/* Filter Kondisi */}
          <select
            value={selectedCondition}
            onChange={e => { setSelectedCondition(e.target.value); setCurrentPage(1); }}
            style={{
              padding: '9px 14px',
              borderRadius: '10px',
              border: `1px solid ${T.border}`,
              background: T.controlBg,
              color: T.txtPrimary,
              fontSize: '0.84rem',
              fontWeight: '700',
              outline: 'none'
            }}
          >
            <option value="all">Semua Kondisi Fisik</option>
            {ASSET_CONDITIONS.map(cond => (
              <option key={cond.value} value={cond.value}>{cond.label}</option>
            ))}
          </select>
        </div>

        {/* Counter Info */}
        <div style={{ fontSize: '0.80rem', color: T.txtSecondary, fontWeight: '700' }}>
          Menampilkan <strong>{filteredAssets.length}</strong> data aset
        </div>
      </div>

      {/* 4. DATA TABLE */}
      <div style={{
        background: T.cardBg,
        borderRadius: '16px',
        border: `1px solid ${T.border}`,
        overflow: 'hidden',
        boxShadow: T.shadowCard
      }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.84rem' }}>
            <thead>
              <tr style={{ background: T.tableHeaderBg, borderBottom: `2px solid ${T.border}`, color: T.txtSecondary }}>
                <th style={{ padding: '14px 16px', width: '50px' }}>No</th>
                <th style={{ padding: '14px 16px', cursor: 'pointer' }} onClick={() => { setSortField('code'); setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc'); }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span>Kode Aset</span>
                    <ArrowUpDown size={13} />
                  </div>
                </th>
                <th style={{ padding: '14px 16px', cursor: 'pointer' }} onClick={() => { setSortField('name'); setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc'); }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span>Nama Barang / Aset</span>
                    <ArrowUpDown size={13} />
                  </div>
                </th>
                <th style={{ padding: '14px 16px' }}>Kategori</th>
                <th style={{ padding: '14px 16px' }}>Cabang &amp; Lokasi</th>
                <th style={{ padding: '14px 16px' }}>Tgl Beli</th>
                <th style={{ padding: '14px 16px', textAlign: 'right' }}>Harga Perolehan</th>
                <th style={{ padding: '14px 16px', textAlign: 'right' }}>Depresiasi / Bulan</th>
                <th style={{ padding: '14px 16px', textAlign: 'right' }}>Nilai Buku Saat Ini</th>
                <th style={{ padding: '14px 16px', textAlign: 'center' }}>Kondisi</th>
                <th style={{ padding: '14px 16px', textAlign: 'center', width: '100px' }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {paginatedAssets.length === 0 ? (
                <tr>
                  <td colSpan="11" style={{ textAlign: 'center', padding: '48px 20px', color: T.txtMuted }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                      <Boxes size={44} color={T.txtMuted} />
                      <div style={{ fontSize: '0.95rem', fontWeight: '700' }}>Belum ada data aset terdaftar</div>
                      <div style={{ fontSize: '0.78rem' }}>Klik tombol "+ Tambah Aset Baru" di atas untuk mencatat peralatan dan aset restoran.</div>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedAssets.map((asset, idx) => {
                  const dep = calculateDepreciation(asset);
                  const condObj = ASSET_CONDITIONS.find(c => c.value === (asset.condition_status || asset.condition)) || ASSET_CONDITIONS[0];

                  return (
                    <tr 
                      key={asset.id || idx} 
                      style={{ 
                        borderBottom: `1px solid ${T.border}`, 
                        transition: 'background 0.15s' 
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = T.controlBg}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <td style={{ padding: '14px 16px', color: T.txtMuted, fontWeight: '700' }}>
                        {(currentPage - 1) * pageSize + idx + 1}
                      </td>
                      <td style={{ padding: '14px 16px', fontWeight: '900', color: '#f59e0b' }}>
                        {asset.code}
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ fontWeight: '800', color: T.txtPrimary }}>{asset.name}</div>
                        {asset.notes && <div style={{ fontSize: '0.72rem', color: T.txtMuted, marginTop: '2px' }}>{asset.notes}</div>}
                      </td>
                      <td style={{ padding: '14px 16px', color: T.txtSecondary, fontWeight: '600' }}>
                        {asset.category}
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ fontWeight: '700', color: T.txtPrimary }}>{asset.outlet_name || 'Semua Cabang'}</div>
                        <div style={{ fontSize: '0.74rem', color: T.txtMuted }}>📍 {asset.location || 'Dapur'} • PIC: {asset.pic || '-'}</div>
                      </td>
                      <td style={{ padding: '14px 16px', color: T.txtSecondary, fontWeight: '600' }}>
                        {asset.purchase_date}
                      </td>
                      <td style={{ padding: '14px 16px', textAlign: 'right', fontWeight: '800', color: T.txtPrimary }}>
                        {formatRp(asset.purchase_cost || asset.cost || 0)}
                      </td>
                      <td style={{ padding: '14px 16px', textAlign: 'right', fontWeight: '700', color: '#f43f5e' }}>
                        {formatRp(dep.monthlyDep)}
                      </td>
                      <td style={{ padding: '14px 16px', textAlign: 'right', fontWeight: '900', color: '#10b981' }}>
                        {formatRp(dep.bookValue)}
                      </td>
                      <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                        <span style={{
                          padding: '4px 10px',
                          borderRadius: '8px',
                          background: condObj.bg,
                          color: condObj.color,
                          fontWeight: '800',
                          fontSize: '0.76rem',
                          display: 'inline-block'
                        }}>
                          {condObj.label}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
                          {allowEdit && (
                            <button
                              onClick={() => handleOpenEdit(asset)}
                              title="Edit Aset"
                              style={{
                                background: 'rgba(56,189,248,0.12)',
                                border: '1px solid rgba(56,189,248,0.3)',
                                color: '#38bdf8',
                                width: '32px',
                                height: '32px',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}
                            >
                              <Edit3 size={15} />
                            </button>
                          )}
                          {allowDelete && (
                            <button
                              onClick={() => handleDelete(asset)}
                              title="Hapus Aset"
                              style={{
                                background: 'rgba(239,68,68,0.12)',
                                border: '1px solid rgba(239,68,68,0.3)',
                                color: '#ef4444',
                                width: '32px',
                                height: '32px',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}
                            >
                              <Trash2 size={15} />
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

        {/* Pagination Controls */}
        <PaginationControls
          totalItems={filteredAssets.length}
          pageSize={pageSize}
          currentPage={currentPage}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
          themeMode={themeMode}
        />
      </div>

      {/* 5. MODAL FORM TAMBAH / EDIT ASET */}
      {showModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.85)',
          backdropFilter: 'blur(8px)',
          zIndex: 99999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <div style={{
            background: T.cardBg,
            border: `1px solid ${T.border}`,
            borderRadius: '20px',
            padding: '28px',
            width: '100%',
            maxWidth: '680px',
            maxHeight: '90vh',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
            boxShadow: '0 25px 60px rgba(0,0,0,0.6)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${T.border}`, paddingBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(245,158,11,0.15)', color: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Boxes size={22} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: '900', color: T.txtPrimary, margin: 0 }}>
                    {editingAsset ? 'Edit Data Aset Restoran' : 'Tambah Aset & Inventaris Baru'}
                  </h3>
                  <p style={{ fontSize: '0.78rem', color: T.txtSecondary, margin: '2px 0 0 0' }}>
                    Pastikan rincian harga beli dan masa manfaat terisi dengan benar untuk kalkulasi penyusutan akuntansi
                  </p>
                </div>
              </div>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', color: T.txtMuted, cursor: 'pointer' }}>
                <X size={22} />
              </button>
            </div>

            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              {/* Row 1: Kode & Nama */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: '800', color: T.txtSecondary, display: 'block', marginBottom: '4px' }}>
                    Kode Aset *
                  </label>
                  <input
                    type="text"
                    required
                    value={formCode}
                    onChange={e => setFormCode(e.target.value)}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: `1px solid ${T.border}`, background: T.controlBg, color: T.txtPrimary, fontWeight: '800', fontSize: '0.85rem' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: '800', color: T.txtSecondary, display: 'block', marginBottom: '4px' }}>
                    Nama Barang / Aset *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Freezer Chiller 4 Pintu RSA"
                    value={formName}
                    onChange={e => setFormName(e.target.value)}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: `1px solid ${T.border}`, background: T.controlBg, color: T.txtPrimary, fontWeight: '800', fontSize: '0.85rem' }}
                  />
                </div>
              </div>

              {/* Row 2: Kategori & Cabang */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: '800', color: T.txtSecondary, display: 'block', marginBottom: '4px' }}>
                    Kategori Aset *
                  </label>
                  <select
                    value={formCategory}
                    onChange={e => handleCategoryChange(e.target.value)}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: `1px solid ${T.border}`, background: T.controlBg, color: T.txtPrimary, fontWeight: '700', fontSize: '0.85rem' }}
                  >
                    {ASSET_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: '800', color: T.txtSecondary, display: 'block', marginBottom: '4px' }}>
                    Penempatan Cabang *
                  </label>
                  <select
                    value={formOutletId}
                    onChange={e => setFormOutletId(e.target.value)}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: `1px solid ${T.border}`, background: T.controlBg, color: T.txtPrimary, fontWeight: '700', fontSize: '0.85rem' }}
                  >
                    {outlets.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                  </select>
                </div>
              </div>

              {/* Row 3: Tanggal Pembelian, Harga Beli, Masa Manfaat */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.5fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: '800', color: T.txtSecondary, display: 'block', marginBottom: '4px' }}>
                    Tanggal Beli *
                  </label>
                  <input
                    type="date"
                    required
                    value={formPurchaseDate}
                    onChange={e => setFormPurchaseDate(e.target.value)}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: `1px solid ${T.border}`, background: T.controlBg, color: T.txtPrimary, fontWeight: '700', fontSize: '0.85rem' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: '800', color: T.txtSecondary, display: 'block', marginBottom: '4px' }}>
                    Harga Perolehan / Beli (Rp) *
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    placeholder="Contoh: 12500000"
                    value={formPurchaseCost}
                    onChange={e => setFormPurchaseCost(e.target.value)}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: `1px solid ${T.border}`, background: T.controlBg, color: '#38bdf8', fontWeight: '900', fontSize: '0.85rem' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: '800', color: T.txtSecondary, display: 'block', marginBottom: '4px' }}>
                    Umur Ekonomis
                  </label>
                  <select
                    value={formUsefulLifeYears}
                    onChange={e => setFormUsefulLifeYears(e.target.value)}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: `1px solid ${T.border}`, background: T.controlBg, color: T.txtPrimary, fontWeight: '700', fontSize: '0.85rem' }}
                  >
                    <option value="1">1 Tahun</option>
                    <option value="2">2 Tahun</option>
                    <option value="3">3 Tahun</option>
                    <option value="4">4 Tahun</option>
                    <option value="5">5 Tahun</option>
                    <option value="8">8 Tahun</option>
                    <option value="10">10 Tahun</option>
                  </select>
                </div>
              </div>

              {/* Row 4: Kondisi, Lokasi, PIC */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr 1.2fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: '800', color: T.txtSecondary, display: 'block', marginBottom: '4px' }}>
                    Kondisi Fisik *
                  </label>
                  <select
                    value={formCondition}
                    onChange={e => setFormCondition(e.target.value)}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: `1px solid ${T.border}`, background: T.controlBg, color: T.txtPrimary, fontWeight: '700', fontSize: '0.85rem' }}
                  >
                    {ASSET_CONDITIONS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: '800', color: T.txtSecondary, display: 'block', marginBottom: '4px' }}>
                    Lokasi Spesifik (Kategori: {formCategory}) *
                  </label>
                  <select
                    value={formLocation}
                    onChange={e => setFormLocation(e.target.value)}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: `1.5px solid #38bdf8`, background: T.controlBg, color: T.txtPrimary, fontWeight: '800', fontSize: '0.82rem', outline: 'none' }}
                  >
                    {(CATEGORY_LOCATIONS[formCategory] || ['Dapur Utama']).map(loc => (
                      <option key={loc} value={loc}>{loc}</option>
                    ))}
                    {formLocation && !(CATEGORY_LOCATIONS[formCategory] || []).includes(formLocation) && (
                      <option value={formLocation}>{formLocation}</option>
                    )}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: '800', color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
                    <span>Penanggung Jawab (PIC Akun Aktif) *</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formPic}
                    onChange={e => setFormPic(e.target.value)}
                    placeholder="User Aktif"
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: `1.5px solid #10b981`, background: 'rgba(16,185,129,0.08)', color: '#10b981', fontWeight: '900', fontSize: '0.85rem', outline: 'none' }}
                  />
                </div>
              </div>

              {/* Row 5: Catatan / Spesifikasi */}
              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: '800', color: T.txtSecondary, display: 'block', marginBottom: '4px' }}>
                  Catatan / Spesifikasi Teknis (Nomor Seri, Garansi, dll.)
                </label>
                <textarea
                  rows={2}
                  placeholder="Contoh: Garansi resmi s/d 2028, nomor seri mesin: SN-998821"
                  value={formNotes}
                  onChange={e => setFormNotes(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: `1px solid ${T.border}`, background: T.controlBg, color: T.txtPrimary, fontSize: '0.82rem', resize: 'vertical' }}
                />
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px', borderTop: `1px solid ${T.border}`, paddingTop: '16px' }}>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  style={{ padding: '10px 20px', borderRadius: '10px', border: `1px solid ${T.border}`, background: T.controlBg, color: T.txtPrimary, fontWeight: '800', cursor: 'pointer' }}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  style={{ padding: '10px 26px', borderRadius: '10px', border: 'none', background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: '#ffffff', fontWeight: '900', cursor: 'pointer', boxShadow: '0 4px 14px rgba(16,185,129,0.4)' }}
                >
                  {editingAsset ? 'Simpan Perubahan' : 'Simpan Aset Baru'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
