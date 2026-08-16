import React, { useState, useMemo } from 'react';
import {
  SlidersHorizontal,
  Package,
  Wallet,
  Plus,
  Search,
  Filter,
  Calendar,
  Building2,
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowDownRight,
  ArrowUpRight,
  DollarSign,
  X,
  FileSpreadsheet,
  Trash2,
  Edit3,
  Scale,
  ShieldCheck,
  Receipt,
  RotateCcw
} from 'lucide-react';
import { getThemePalette } from '../../utils/themeUtils';
import { canDeleteModule, canEditModule } from '../../utils/permissionUtils';
import PaginationControls from './PaginationControls';

export default function AdjustmentsManagementPage({
  masterData,
  setMasterData,
  selectedBranch,
  userSession,
  themeMode = 'dark'
}) {
  const T = getThemePalette(themeMode);
  const allowDelete = canDeleteModule(userSession, 'stock', masterData?.permissionMatrix);
  const allowEdit = canEditModule(userSession, 'stock', masterData?.permissionMatrix);

  // Active Main Sub-Tab ('stock' | 'cash')
  const [activeTab, setActiveTab] = useState('stock');

  // Filters
  const [filterBranch, setFilterBranch] = useState(selectedBranch || 'ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('ALL'); // 'ALL' | 'today' | 'month'

  // Pagination States
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Modal States
  const [showStockModal, setShowStockModal] = useState(false);
  const [showCashModal, setShowCashModal] = useState(false);

  // -------------------------------------------------------------
  // STOCK ADJUSTMENT FORM STATE
  // -------------------------------------------------------------
  const [stockFormBranch, setStockFormBranch] = useState(selectedBranch || (masterData.outlets?.[0]?.id || 1));
  const [stockFormDate, setStockFormDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [stockFormIngredientId, setStockFormIngredientId] = useState('');
  const [stockFormType, setStockFormType] = useState('subtract'); // 'subtract' (-) | 'add' (+)
  const [stockFormReason, setStockFormReason] = useState('Basi / Kadaluarsa (Spoilage)');
  const [stockFormPhysicalQty, setStockFormPhysicalQty] = useState('');
  const [stockFormAdjustQty, setStockFormAdjustQty] = useState('');
  const [stockFormUnitPrice, setStockFormUnitPrice] = useState('0');
  const [stockFormNotes, setStockFormNotes] = useState('');
  const [stockFormPic, setStockFormPic] = useState(userSession?.name || 'Staff Dapur / Admin');

  // -------------------------------------------------------------
  // CASH ADJUSTMENT FORM STATE
  // -------------------------------------------------------------
  const [cashFormBranch, setCashFormBranch] = useState(selectedBranch || (masterData.outlets?.[0]?.id || 1));
  const [cashFormDate, setCashFormDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [cashFormAccount, setCashFormAccount] = useState('Kas Laci Kasir (Cash Drawer)');
  const [cashFormType, setCashFormType] = useState('shortage'); // 'shortage' (Kurang) | 'overage' (Lebih) | 'correction' (Koreksi)
  const [cashFormReason, setCashFormReason] = useState('Selisih Tutup Kasir / Shift Closing');
  const [cashFormAmount, setCashFormAmount] = useState('');
  const [cashFormRefNo, setCashFormRefNo] = useState('');
  const [cashFormNotes, setCashFormNotes] = useState('');
  const [cashFormPic, setCashFormPic] = useState(userSession?.name || 'Kasir / Admin');

  const formatRupiah = (val) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val || 0);
  };

  const allOutlets = useMemo(() => masterData.outlets || [], [masterData.outlets]);
  const allIngredients = useMemo(() => masterData.ingredients || [], [masterData.ingredients]);

  // Selected Ingredient in Stock Form
  const selectedIngredientObj = useMemo(() => {
    return allIngredients.find(i => String(i.id) === String(stockFormIngredientId)) || null;
  }, [allIngredients, stockFormIngredientId]);

  // Auto-fill unit price when ingredient is selected
  const handleSelectIngredient = (ingId) => {
    setStockFormIngredientId(ingId);
    const ing = allIngredients.find(i => String(i.id) === String(ingId));
    if (ing) {
      const price = ing.avg_buy_price || ing.price || ing.standardPrices?.[stockFormBranch] || 15000;
      setStockFormUnitPrice(String(price));
      // Default adjust qty
      setStockFormAdjustQty('1');
      const currentStk = Number(ing.stock || 0);
      setStockFormPhysicalQty(String(Math.max(0, currentStk - 1)));
    }
  };

  // -------------------------------------------------------------
  // STOCK ADJUSTMENTS DATA & KPIS
  // -------------------------------------------------------------
  const stockAdjustmentsList = useMemo(() => {
    const raw = masterData.stockAdjustments || [];
    return raw.filter(item => {
      // Branch filter
      if (filterBranch !== 'ALL' && String(item.outlet_id) !== String(filterBranch)) {
        return false;
      }
      // Search filter
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const ingName = String(item.ingredient_name || '').toLowerCase();
        const code = String(item.code || '').toLowerCase();
        const reason = String(item.reason || '').toLowerCase();
        if (!ingName.includes(q) && !code.includes(q) && !reason.includes(q)) {
          return false;
        }
      }
      return true;
    }).sort((a, b) => new Date(b.date || b.timestamp || 0) - new Date(a.date || a.timestamp || 0));
  }, [masterData.stockAdjustments, filterBranch, searchTerm]);

  const stockKpis = useMemo(() => {
    let totalDeductions = 0;
    let totalAdditions = 0;
    let totalValueLoss = 0;

    stockAdjustmentsList.forEach(item => {
      const val = Number(item.total_value || (item.qty * item.unit_price) || 0);
      if (item.type === 'subtract') {
        totalDeductions += Number(item.qty || 0);
        totalValueLoss += val;
      } else {
        totalAdditions += Number(item.qty || 0);
      }
    });

    return {
      count: stockAdjustmentsList.length,
      totalDeductions,
      totalAdditions,
      totalValueLoss
    };
  }, [stockAdjustmentsList]);

  // -------------------------------------------------------------
  // CASH ADJUSTMENTS DATA & KPIS
  // -------------------------------------------------------------
  const cashAdjustmentsList = useMemo(() => {
    const raw = masterData.cashAdjustments || [];
    return raw.filter(item => {
      // Branch filter
      if (filterBranch !== 'ALL' && String(item.outlet_id) !== String(filterBranch)) {
        return false;
      }
      // Search filter
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const reason = String(item.reason || '').toLowerCase();
        const account = String(item.account || '').toLowerCase();
        const pic = String(item.pic || '').toLowerCase();
        if (!reason.includes(q) && !account.includes(q) && !pic.includes(q)) {
          return false;
        }
      }
      return true;
    }).sort((a, b) => new Date(b.date || b.timestamp || 0) - new Date(a.date || a.timestamp || 0));
  }, [masterData.cashAdjustments, filterBranch, searchTerm]);

  const cashKpis = useMemo(() => {
    let totalShortage = 0;
    let totalOverage = 0;

    cashAdjustmentsList.forEach(item => {
      const amt = Number(item.amount || 0);
      if (item.type === 'shortage') {
        totalShortage += amt;
      } else if (item.type === 'overage') {
        totalOverage += amt;
      }
    });

    const netDiff = totalOverage - totalShortage;

    return {
      count: cashAdjustmentsList.length,
      totalShortage,
      totalOverage,
      netDiff
    };
  }, [cashAdjustmentsList]);

  // -------------------------------------------------------------
  // SUBMIT STOCK ADJUSTMENT
  // -------------------------------------------------------------
  const handleSubmitStockAdjustment = (e) => {
    e.preventDefault();
    if (!stockFormIngredientId) {
      alert('Mohon pilih bahan baku yang akan disesuaikan');
      return;
    }
    const qtyNum = parseFloat(stockFormAdjustQty);
    if (!qtyNum || qtyNum <= 0) {
      alert('Mohon masukkan jumlah penyesuaian yang valid (> 0)');
      return;
    }

    const ing = allIngredients.find(i => String(i.id) === String(stockFormIngredientId));
    if (!ing) return;

    const unitPriceNum = parseFloat(stockFormUnitPrice) || 0;
    const totalVal = qtyNum * unitPriceNum;
    const prevStock = Number(ing.stock || 0);
    const newStock = stockFormType === 'subtract' ? Math.max(0, prevStock - qtyNum) : (prevStock + qtyNum);

    const adjustmentRecord = {
      id: Date.now(),
      code: `ADJ-STK-${Date.now().toString().slice(-6)}`,
      date: stockFormDate,
      timestamp: Date.now(),
      outlet_id: stockFormBranch,
      outlet_name: allOutlets.find(o => String(o.id) === String(stockFormBranch))?.name || 'Cabang Restoran',
      ingredient_id: ing.id,
      ingredient_name: ing.name,
      ingredient_category: ing.category || 'Bumbu & Rempah',
      unit: ing.unit || 'Kg',
      type: stockFormType, // 'subtract' | 'add'
      reason: stockFormReason,
      previous_stock: prevStock,
      adjusted_qty: qtyNum,
      final_stock: newStock,
      unit_price: unitPriceNum,
      total_value: totalVal,
      notes: stockFormNotes.trim(),
      pic: stockFormPic.trim(),
      status: 'Terverifikasi'
    };

    // Update ingredients stock & stockAdjustments array in masterData
    const updatedIngredients = (masterData.ingredients || []).map(item => {
      if (String(item.id) === String(ing.id)) {
        return {
          ...item,
          stock: newStock,
          _lastUpdated: Date.now()
        };
      }
      return item;
    });

    const updatedStockAdjustments = [adjustmentRecord, ...(masterData.stockAdjustments || [])];

    // Also record stock movement
    const movementRecord = {
      id: Date.now() + 1,
      date: stockFormDate,
      ingredient_id: ing.id,
      ingredient_name: ing.name,
      type: stockFormType === 'subtract' ? 'OUT' : 'IN',
      qty: qtyNum,
      unit: ing.unit || 'Kg',
      description: `Penyesuaian Stok: ${stockFormReason} (${adjustmentRecord.code})`,
      outlet_id: stockFormBranch,
      pic: stockFormPic
    };

    const updatedMovements = [movementRecord, ...(masterData.stockMovement || [])];

    setMasterData({
      ...masterData,
      ingredients: updatedIngredients,
      stockAdjustments: updatedStockAdjustments,
      stockMovement: updatedMovements
    });

    setShowStockModal(false);
    // Reset form
    setStockFormIngredientId('');
    setStockFormAdjustQty('');
    setStockFormNotes('');
    alert(`Penyesuaian stok ${ing.name} berhasil disimpan! Stok sistem kini menjadi ${newStock} ${ing.unit || 'Kg'}.`);
  };

  // -------------------------------------------------------------
  // SUBMIT CASH ADJUSTMENT
  // -------------------------------------------------------------
  const handleSubmitCashAdjustment = (e) => {
    e.preventDefault();
    const amountNum = parseFloat(cashFormAmount);
    if (!amountNum || amountNum <= 0) {
      alert('Mohon masukkan nominal penyesuaian kas yang valid (> 0)');
      return;
    }

    const cashRecord = {
      id: Date.now(),
      code: `ADJ-KAS-${Date.now().toString().slice(-6)}`,
      date: cashFormDate,
      timestamp: Date.now(),
      outlet_id: cashFormBranch,
      outlet_name: allOutlets.find(o => String(o.id) === String(cashFormBranch))?.name || 'Cabang Restoran',
      account: cashFormAccount,
      type: cashFormType, // 'shortage' | 'overage' | 'correction'
      reason: cashFormReason,
      amount: amountNum,
      ref_no: cashFormRefNo.trim() || '-',
      notes: cashFormNotes.trim(),
      pic: cashFormPic.trim(),
      status: 'Terverifikasi'
    };

    const updatedCashAdjustments = [cashRecord, ...(masterData.cashAdjustments || [])];

    setMasterData({
      ...masterData,
      cashAdjustments: updatedCashAdjustments
    });

    setShowCashModal(false);
    setCashFormAmount('');
    setCashFormRefNo('');
    setCashFormNotes('');
    alert(`Penyesuaian kas sebesar ${formatRupiah(amountNum)} berhasil dicatat ke sistem!`);
  };

  // Delete handlers with permission check
  const handleDeleteStockAdjustment = (id) => {
    if (!allowDelete) {
      alert('Anda tidak memiliki izin untuk menghapus data penyesuaian stok.');
      return;
    }
    if (confirm('Apakah Anda yakin ingin menghapus catatan penyesuaian stok ini?')) {
      const filtered = (masterData.stockAdjustments || []).filter(item => item.id !== id);
      setMasterData({ ...masterData, stockAdjustments: filtered });
    }
  };

  const handleDeleteCashAdjustment = (id) => {
    if (!allowDelete) {
      alert('Anda tidak memiliki izin untuk menghapus data penyesuaian kas.');
      return;
    }
    if (confirm('Apakah Anda yakin ingin menghapus catatan penyesuaian kas ini?')) {
      const filtered = (masterData.cashAdjustments || []).filter(item => item.id !== id);
      setMasterData({ ...masterData, cashAdjustments: filtered });
    }
  };

  // Pagination Slicing
  const activeList = activeTab === 'stock' ? stockAdjustmentsList : cashAdjustmentsList;
  const totalPages = Math.ceil(activeList.length / pageSize) || 1;
  const paginatedList = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return activeList.slice(start, start + pageSize);
  }, [activeList, currentPage, pageSize]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', background: T.pageBg, color: T.txtPrimary }} className="animate-fade-in">
      
      {/* ------------------------------------------------------------- */}
      {/* 1. HEADER & ACTIONS                                           */}
      {/* ------------------------------------------------------------- */}
      <div style={{
        background: T.cardBg,
        border: `1px solid ${T.borderStrong}`,
        borderRadius: '16px',
        padding: '18px 22px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '16px',
        boxShadow: T.shadowSm
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ padding: '6px', borderRadius: '10px', background: T.primary, color: T.txtInverse }}>
              <SlidersHorizontal size={20} />
            </div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '900', color: T.txtPrimary, margin: 0, letterSpacing: '-0.02em' }}>
              Modul Penyesuaian (Stok &amp; Kas)
            </h2>
            <span style={{ fontSize: '0.68rem', padding: '2px 8px', borderRadius: '6px', background: T.infoBg, color: T.info, border: `1px solid ${T.infoBorder}`, fontWeight: '800' }}>
              AUDIT &amp; RECONCILIATION
            </span>
          </div>
          <p style={{ color: T.txtSecondary, fontSize: '0.74rem', marginTop: '4px', margin: 0 }}>
            Pusat rekonsiliasi selisih fisik vs sistem: audit stok bahan baku dapur (spoilage/rusak/opname) dan selisih kas tunai kasir.
          </p>
        </div>

        {/* Top Actions */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          {allowEdit && (
            <>
              {activeTab === 'stock' ? (
                <button
                  type="button"
                  onClick={() => setShowStockModal(true)}
                  className="btn-primary"
                  style={{ padding: '8px 16px', fontSize: '0.76rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <Plus size={16} />
                  <span>Catat Penyesuaian Stok</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowCashModal(true)}
                  className="btn-primary"
                  style={{ padding: '8px 16px', fontSize: '0.76rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <Plus size={16} />
                  <span>Catat Penyesuaian Kas</span>
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 2. SUB-TAB PILL SWITCHER                                      */}
      {/* ------------------------------------------------------------- */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        {/* Navigation Pills */}
        <div style={{
          display: 'inline-flex',
          background: T.cardBg2,
          padding: '4px',
          borderRadius: '12px',
          border: `1px solid ${T.borderStrong}`,
          gap: '4px'
        }}>
          <button
            type="button"
            onClick={() => { setActiveTab('stock'); setCurrentPage(1); }}
            style={{
              padding: '8px 18px',
              borderRadius: '9px',
              border: 'none',
              background: activeTab === 'stock' ? T.primary : 'transparent',
              color: activeTab === 'stock' ? T.txtInverse : T.txtSecondary,
              fontWeight: '800',
              fontSize: '0.78rem',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              boxShadow: activeTab === 'stock' ? T.shadowSm : 'none'
            }}
          >
            <Package size={16} />
            <span>1. Penyesuaian Stok Bahan Baku</span>
            <span style={{
              padding: '1px 6px',
              borderRadius: '10px',
              fontSize: '0.66rem',
              background: activeTab === 'stock' ? 'rgba(0,0,0,0.2)' : T.inputBg,
              color: activeTab === 'stock' ? T.txtInverse : T.txtPrimary
            }}>
              {stockAdjustmentsList.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => { setActiveTab('cash'); setCurrentPage(1); }}
            style={{
              padding: '8px 18px',
              borderRadius: '9px',
              border: 'none',
              background: activeTab === 'cash' ? T.primary : 'transparent',
              color: activeTab === 'cash' ? T.txtInverse : T.txtSecondary,
              fontWeight: '800',
              fontSize: '0.78rem',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              boxShadow: activeTab === 'cash' ? T.shadowSm : 'none'
            }}
          >
            <Wallet size={16} />
            <span>2. Penyesuaian Kas &amp; Kas Kecil</span>
            <span style={{
              padding: '1px 6px',
              borderRadius: '10px',
              fontSize: '0.66rem',
              background: activeTab === 'cash' ? 'rgba(0,0,0,0.2)' : T.inputBg,
              color: activeTab === 'cash' ? T.txtInverse : T.txtPrimary
            }}>
              {cashAdjustmentsList.length}
            </span>
          </button>
        </div>

        {/* Filter Controls (Branch & Search) */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Branch Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: T.inputBg, padding: '4px 10px', borderRadius: '10px', border: `1px solid ${T.borderStrong}` }}>
            <Building2 size={15} color={T.txtSecondary} />
            <select
              value={filterBranch}
              onChange={e => { setFilterBranch(e.target.value); setCurrentPage(1); }}
              style={{ background: 'transparent', border: 'none', color: T.txtPrimary, fontSize: '0.76rem', fontWeight: '800', cursor: 'pointer', outline: 'none' }}
            >
              <option value="ALL">Semua Cabang Outlet</option>
              {allOutlets.map(o => (
                <option key={o.id} value={o.id}>{o.name}</option>
              ))}
            </select>
          </div>

          {/* Search Bar */}
          <div style={{ position: 'relative', width: '220px' }}>
            <Search size={14} color={T.txtMuted} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              placeholder="Cari transaksi penyesuaian..."
              value={searchTerm}
              onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              style={{
                width: '100%',
                padding: '6px 10px 6px 30px',
                background: T.inputBg,
                border: `1px solid ${T.borderStrong}`,
                borderRadius: '10px',
                color: T.txtPrimary,
                fontSize: '0.74rem'
              }}
            />
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 3. KPI SUMMARY CARDS (DYNAMIC PER TAB)                        */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'stock' ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
          {/* Card 1: Total Records */}
          <div style={{ background: T.cardBg, border: `1px solid ${T.borderStrong}`, borderRadius: '14px', padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <span style={{ fontSize: '0.68rem', fontWeight: '800', color: T.txtSecondary, textTransform: 'uppercase' }}>TOTAL PENYESUAIAN STOK</span>
              <div style={{ fontSize: '1.25rem', fontWeight: '900', color: T.txtPrimary, marginTop: '2px' }}>{stockKpis.count} Transaksi</div>
              <span style={{ fontSize: '0.66rem', color: T.info, fontWeight: '700' }}>Tercatat di Jurnal Mutasi</span>
            </div>
            <div style={{ padding: '8px', borderRadius: '10px', background: T.infoBg, color: T.info }}>
              <Package size={18} />
            </div>
          </div>

          {/* Card 2: Pengurangan (Spoilage / Rusak) */}
          <div style={{ background: T.cardBg, border: `1px solid ${T.borderStrong}`, borderRadius: '14px', padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <span style={{ fontSize: '0.68rem', fontWeight: '800', color: T.txtSecondary, textTransform: 'uppercase' }}>TOTAL PENGURANGAN STOK</span>
              <div style={{ fontSize: '1.25rem', fontWeight: '900', color: T.danger, marginTop: '2px' }}>{stockKpis.totalDeductions} Kuantitas</div>
              <span style={{ fontSize: '0.66rem', color: T.danger, fontWeight: '700' }}>Basi / Rusak / Susut Dapur</span>
            </div>
            <div style={{ padding: '8px', borderRadius: '10px', background: T.dangerBg, color: T.danger }}>
              <TrendingDown size={18} />
            </div>
          </div>

          {/* Card 3: Penambahan Stok */}
          <div style={{ background: T.cardBg, border: `1px solid ${T.borderStrong}`, borderRadius: '14px', padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <span style={{ fontSize: '0.68rem', fontWeight: '800', color: T.txtSecondary, textTransform: 'uppercase' }}>TOTAL PENAMBAHAN STOK</span>
              <div style={{ fontSize: '1.25rem', fontWeight: '900', color: T.success, marginTop: '2px' }}>+{stockKpis.totalAdditions} Kuantitas</div>
              <span style={{ fontSize: '0.66rem', color: T.success, fontWeight: '700' }}>Koreksi Tambah / Temuan</span>
            </div>
            <div style={{ padding: '8px', borderRadius: '10px', background: T.successBg, color: T.success }}>
              <TrendingUp size={18} />
            </div>
          </div>

          {/* Card 4: Nilai Kerugian HPP */}
          <div style={{ background: T.cardBg, border: `1px solid ${T.borderStrong}`, borderRadius: '14px', padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <span style={{ fontSize: '0.68rem', fontWeight: '800', color: T.txtSecondary, textTransform: 'uppercase' }}>ESTIMASI NILAI KERUGIAN HPP</span>
              <div style={{ fontSize: '1.25rem', fontWeight: '900', color: T.accentGold, marginTop: '2px' }}>{formatRupiah(stockKpis.totalValueLoss)}</div>
              <span style={{ fontSize: '0.66rem', color: T.accentGold, fontWeight: '700' }}>Beban Penyesuaian HPP</span>
            </div>
            <div style={{ padding: '8px', borderRadius: '10px', background: T.accentGoldBg, color: T.accentGold }}>
              <DollarSign size={18} />
            </div>
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
          {/* Card 1: Total Records */}
          <div style={{ background: T.cardBg, border: `1px solid ${T.borderStrong}`, borderRadius: '14px', padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <span style={{ fontSize: '0.68rem', fontWeight: '800', color: T.txtSecondary, textTransform: 'uppercase' }}>TOTAL PENYESUAIAN KAS</span>
              <div style={{ fontSize: '1.25rem', fontWeight: '900', color: T.txtPrimary, marginTop: '2px' }}>{cashKpis.count} Transaksi</div>
              <span style={{ fontSize: '0.66rem', color: T.info, fontWeight: '700' }}>Rekonsiliasi Kasir &amp; Brankas</span>
            </div>
            <div style={{ padding: '8px', borderRadius: '10px', background: T.infoBg, color: T.info }}>
              <Wallet size={18} />
            </div>
          </div>

          {/* Card 2: Kas Kurang (Shortage) */}
          <div style={{ background: T.cardBg, border: `1px solid ${T.borderStrong}`, borderRadius: '14px', padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <span style={{ fontSize: '0.68rem', fontWeight: '800', color: T.txtSecondary, textTransform: 'uppercase' }}>TOTAL KAS KURANG (SHORTAGE)</span>
              <div style={{ fontSize: '1.25rem', fontWeight: '900', color: T.danger, marginTop: '2px' }}>{formatRupiah(cashKpis.totalShortage)}</div>
              <span style={{ fontSize: '0.66rem', color: T.danger, fontWeight: '700' }}>Defisit Fisik Kasir</span>
            </div>
            <div style={{ padding: '8px', borderRadius: '10px', background: T.dangerBg, color: T.danger }}>
              <ArrowDownRight size={18} />
            </div>
          </div>

          {/* Card 3: Kas Lebih (Overage) */}
          <div style={{ background: T.cardBg, border: `1px solid ${T.borderStrong}`, borderRadius: '14px', padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <span style={{ fontSize: '0.68rem', fontWeight: '800', color: T.txtSecondary, textTransform: 'uppercase' }}>TOTAL KAS LEBIH (OVERAGE)</span>
              <div style={{ fontSize: '1.25rem', fontWeight: '900', color: T.success, marginTop: '2px' }}>+{formatRupiah(cashKpis.totalOverage)}</div>
              <span style={{ fontSize: '0.66rem', color: T.success, fontWeight: '700' }}>Surplus Fisik Kasir</span>
            </div>
            <div style={{ padding: '8px', borderRadius: '10px', background: T.successBg, color: T.success }}>
              <ArrowUpRight size={18} />
            </div>
          </div>

          {/* Card 4: Net Selisih Kas */}
          <div style={{ background: T.cardBg, border: `1px solid ${T.borderStrong}`, borderRadius: '14px', padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <span style={{ fontSize: '0.68rem', fontWeight: '800', color: T.txtSecondary, textTransform: 'uppercase' }}>NET SELISIH KAS (BERSIH)</span>
              <div style={{ fontSize: '1.25rem', fontWeight: '900', color: cashKpis.netDiff >= 0 ? T.success : T.danger, marginTop: '2px' }}>
                {cashKpis.netDiff >= 0 ? '+' : ''}{formatRupiah(cashKpis.netDiff)}
              </div>
              <span style={{ fontSize: '0.66rem', color: cashKpis.netDiff >= 0 ? T.success : T.danger, fontWeight: '700' }}>
                {cashKpis.netDiff >= 0 ? 'Surplus Kas Bersih' : 'Defisit Kas Bersih'}
              </span>
            </div>
            <div style={{ padding: '8px', borderRadius: '10px', background: T.accentGoldBg, color: T.accentGold }}>
              <Scale size={18} />
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 4. DATA TABLE                                                 */}
      {/* ------------------------------------------------------------- */}
      <div style={{
        background: T.cardBg,
        border: `1px solid ${T.borderStrong}`,
        borderRadius: '16px',
        overflow: 'hidden',
        boxShadow: T.shadowSm
      }}>
        <div style={{ padding: '16px 20px', borderBottom: `1px solid ${T.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ fontSize: '0.94rem', fontWeight: '900', color: T.txtPrimary, margin: 0 }}>
              {activeTab === 'stock' ? 'Riwayat Penyesuaian Stok Bahan Baku Dapur' : 'Riwayat Rekonsiliasi & Penyesuaian Kas'}
            </h3>
            <span style={{ fontSize: '0.70rem', color: T.txtSecondary }}>
              Menampilkan {paginatedList.length} dari total {activeList.length} data penyesuaian
            </span>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          {activeTab === 'stock' ? (
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.74rem' }}>
              <thead>
                <tr style={{ background: T.tableHeaderBg, borderBottom: `1px solid ${T.border}`, color: T.txtMuted }}>
                  <th style={{ padding: '10px 12px', fontWeight: '800' }}>KODE &amp; TANGGAL</th>
                  <th style={{ padding: '10px 12px', fontWeight: '800' }}>CABANG OUTLET</th>
                  <th style={{ padding: '10px 12px', fontWeight: '800' }}>BAHAN BAKU &amp; KATEGORI</th>
                  <th style={{ padding: '10px 12px', fontWeight: '800' }}>ALASAN PENYESUAIAN</th>
                  <th style={{ padding: '10px 12px', fontWeight: '800', textAlign: 'center' }}>MUTASI STOK</th>
                  <th style={{ padding: '10px 12px', fontWeight: '800', textAlign: 'right' }}>NILAI KERUGIAN / HPP</th>
                  <th style={{ padding: '10px 12px', fontWeight: '800' }}>PETUGAS PIC</th>
                  <th style={{ padding: '10px 12px', fontWeight: '800', textAlign: 'center' }}>AKSI</th>
                </tr>
              </thead>
              <tbody>
                {paginatedList.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ padding: '36px', textAlign: 'center', color: T.txtMuted, fontSize: '0.76rem' }}>
                      Belum ada catatan penyesuaian stok bahan baku. Klik tombol <strong>"+ Catat Penyesuaian Stok"</strong> di atas untuk menambahkan.
                    </td>
                  </tr>
                ) : (
                  paginatedList.map((item) => (
                    <tr key={item.id} style={{ borderBottom: `1px solid ${T.border}`, color: T.txtPrimary }}>
                      {/* Kode & Tanggal */}
                      <td style={{ padding: '10px 12px' }}>
                        <div style={{ fontWeight: '800', color: T.info, fontFamily: 'monospace' }}>{item.code}</div>
                        <div style={{ fontSize: '0.66rem', color: T.txtSecondary }}>{item.date}</div>
                      </td>

                      {/* Outlet */}
                      <td style={{ padding: '10px 12px', fontWeight: '700' }}>
                        {item.outlet_name || 'Central Outlet'}
                      </td>

                      {/* Bahan Baku */}
                      <td style={{ padding: '10px 12px' }}>
                        <div style={{ fontWeight: '800', color: T.txtPrimary }}>{item.ingredient_name}</div>
                        <span style={{ fontSize: '0.64rem', color: T.info, background: T.infoBg, padding: '1px 6px', borderRadius: '4px' }}>
                          {item.ingredient_category || 'Bahan Baku'}
                        </span>
                      </td>

                      {/* Alasan */}
                      <td style={{ padding: '10px 12px' }}>
                        <span style={{
                          fontSize: '0.68rem',
                          fontWeight: '800',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          background: item.type === 'subtract' ? T.dangerBg : T.successBg,
                          color: item.type === 'subtract' ? T.danger : T.success,
                          border: `1px solid ${item.type === 'subtract' ? T.dangerBorder : T.successBorder}`
                        }}>
                          {item.reason}
                        </span>
                        {item.notes && (
                          <div style={{ fontSize: '0.66rem', color: T.txtSecondary, marginTop: '3px', fontStyle: 'italic' }}>
                            "{item.notes}"
                          </div>
                        )}
                      </td>

                      {/* Mutasi Stok */}
                      <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                        <div style={{ fontWeight: '900', color: item.type === 'subtract' ? T.danger : T.success, fontSize: '0.80rem' }}>
                          {item.type === 'subtract' ? '-' : '+'}{item.adjusted_qty} {item.unit}
                        </div>
                        <div style={{ fontSize: '0.64rem', color: T.txtSecondary }}>
                          {item.previous_stock} &rarr; <strong>{item.final_stock} {item.unit}</strong>
                        </div>
                      </td>

                      {/* Nilai HPP */}
                      <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: '900', color: item.type === 'subtract' ? T.danger : T.success }}>
                        {item.type === 'subtract' ? '-' : '+'}{formatRupiah(item.total_value)}
                      </td>

                      {/* PIC */}
                      <td style={{ padding: '10px 12px', color: T.txtSecondary }}>
                        <div style={{ fontWeight: '700', color: T.txtPrimary }}>{item.pic || '-'}</div>
                        <span style={{ fontSize: '0.62rem', color: T.success }}>{item.status || 'Terverifikasi'}</span>
                      </td>

                      {/* Aksi */}
                      <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                        {allowDelete && (
                          <button
                            type="button"
                            onClick={() => handleDeleteStockAdjustment(item.id)}
                            style={{ background: 'none', border: 'none', color: T.danger, cursor: 'pointer', padding: '4px' }}
                            title="Hapus Catatan Penyesuaian"
                          >
                            <Trash2 size={15} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.74rem' }}>
              <thead>
                <tr style={{ background: T.tableHeaderBg, borderBottom: `1px solid ${T.border}`, color: T.txtMuted }}>
                  <th style={{ padding: '10px 12px', fontWeight: '800' }}>KODE &amp; TANGGAL</th>
                  <th style={{ padding: '10px 12px', fontWeight: '800' }}>CABANG OUTLET</th>
                  <th style={{ padding: '10px 12px', fontWeight: '800' }}>AKUN KAS</th>
                  <th style={{ padding: '10px 12px', fontWeight: '800' }}>TIPE &amp; ALASAN PENYESUAIAN</th>
                  <th style={{ padding: '10px 12px', fontWeight: '800', textAlign: 'right' }}>NOMINAL SELISIH</th>
                  <th style={{ padding: '10px 12px', fontWeight: '800' }}>NO. BUKTI / REF</th>
                  <th style={{ padding: '10px 12px', fontWeight: '800' }}>PETUGAS PIC</th>
                  <th style={{ padding: '10px 12px', fontWeight: '800', textAlign: 'center' }}>AKSI</th>
                </tr>
              </thead>
              <tbody>
                {paginatedList.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ padding: '36px', textAlign: 'center', color: T.txtMuted, fontSize: '0.76rem' }}>
                      Belum ada catatan penyesuaian kas. Klik tombol <strong>"+ Catat Penyesuaian Kas"</strong> di atas untuk menambahkan.
                    </td>
                  </tr>
                ) : (
                  paginatedList.map((item) => (
                    <tr key={item.id} style={{ borderBottom: `1px solid ${T.border}`, color: T.txtPrimary }}>
                      {/* Kode & Tanggal */}
                      <td style={{ padding: '10px 12px' }}>
                        <div style={{ fontWeight: '800', color: T.info, fontFamily: 'monospace' }}>{item.code}</div>
                        <div style={{ fontSize: '0.66rem', color: T.txtSecondary }}>{item.date}</div>
                      </td>

                      {/* Outlet */}
                      <td style={{ padding: '10px 12px', fontWeight: '700' }}>
                        {item.outlet_name || 'Central Outlet'}
                      </td>

                      {/* Akun Kas */}
                      <td style={{ padding: '10px 12px' }}>
                        <div style={{ fontWeight: '800', color: T.txtPrimary }}>{item.account}</div>
                      </td>

                      {/* Tipe & Alasan */}
                      <td style={{ padding: '10px 12px' }}>
                        <span style={{
                          fontSize: '0.68rem',
                          fontWeight: '800',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          background: item.type === 'shortage' ? T.dangerBg : T.successBg,
                          color: item.type === 'shortage' ? T.danger : T.success,
                          border: `1px solid ${item.type === 'shortage' ? T.dangerBorder : T.successBorder}`
                        }}>
                          {item.type === 'shortage' ? 'Kas Kurang (Shortage)' : item.type === 'overage' ? 'Kas Lebih (Overage)' : 'Koreksi Kas'}
                        </span>
                        <div style={{ fontSize: '0.70rem', color: T.txtSecondary, marginTop: '3px', fontWeight: '600' }}>
                          {item.reason}
                        </div>
                        {item.notes && (
                          <div style={{ fontSize: '0.65rem', color: T.txtMuted, fontStyle: 'italic' }}>
                            "{item.notes}"
                          </div>
                        )}
                      </td>

                      {/* Nominal */}
                      <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: '900', color: item.type === 'shortage' ? T.danger : T.success, fontSize: '0.82rem' }}>
                        {item.type === 'shortage' ? '-' : '+'}{formatRupiah(item.amount)}
                      </td>

                      {/* No Bukti */}
                      <td style={{ padding: '10px 12px', color: T.txtSecondary, fontFamily: 'monospace' }}>
                        {item.ref_no || '-'}
                      </td>

                      {/* PIC */}
                      <td style={{ padding: '10px 12px', color: T.txtSecondary }}>
                        <div style={{ fontWeight: '700', color: T.txtPrimary }}>{item.pic || '-'}</div>
                        <span style={{ fontSize: '0.62rem', color: T.success }}>{item.status || 'Terverifikasi'}</span>
                      </td>

                      {/* Aksi */}
                      <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                        {allowDelete && (
                          <button
                            type="button"
                            onClick={() => handleDeleteCashAdjustment(item.id)}
                            style={{ background: 'none', border: 'none', color: T.danger, cursor: 'pointer', padding: '4px' }}
                            title="Hapus Catatan Penyesuaian Kas"
                          >
                            <Trash2 size={15} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination Controls */}
        <div style={{ padding: '12px 20px', borderTop: `1px solid ${T.border}` }}>
          <PaginationControls
            currentPage={currentPage}
            totalPages={totalPages}
            pageSize={pageSize}
            totalItems={activeList.length}
            onPageChange={setCurrentPage}
            onPageSizeChange={setPageSize}
            themeMode={themeMode}
          />
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 5. MODAL: CATAT PENYESUAIAN STOK BAHAN BAKU                   */}
      {/* ------------------------------------------------------------- */}
      {showStockModal && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '16px'
        }}>
          <div className="glass-card animate-fade-in" style={{
            width: '100%',
            maxWidth: '540px',
            background: T.cardBg,
            border: `1px solid ${T.borderStrong}`,
            borderRadius: '16px',
            padding: '24px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.6)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: '900', color: T.txtPrimary, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Package size={18} color={T.primary} />
                  <span>Catat Penyesuaian Stok Dapur</span>
                </h3>
                <p style={{ fontSize: '0.72rem', color: T.txtSecondary, margin: '2px 0 0 0' }}>
                  Form rekonsiliasi bahan rusak, basi/spoilage, susut, atau selisih hitung opname fisik
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowStockModal(false)}
                style={{ background: 'none', border: 'none', color: T.txtSecondary, cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmitStockAdjustment} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Outlet & Date */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.74rem', fontWeight: '700', color: T.txtSecondary, display: 'block', marginBottom: '4px' }}>
                    Cabang Outlet *
                  </label>
                  <select
                    value={stockFormBranch}
                    onChange={e => setStockFormBranch(e.target.value)}
                    className="form-select"
                    style={{ background: T.inputBg, borderColor: T.border, color: T.txtPrimary, width: '100%' }}
                    required
                  >
                    {allOutlets.map(o => (
                      <option key={o.id} value={o.id}>{o.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '0.74rem', fontWeight: '700', color: T.txtSecondary, display: 'block', marginBottom: '4px' }}>
                    Tanggal Penyesuaian *
                  </label>
                  <input
                    type="date"
                    value={stockFormDate}
                    onChange={e => setStockFormDate(e.target.value)}
                    className="form-input"
                    style={{ background: T.inputBg, borderColor: T.border, color: T.txtPrimary }}
                    required
                  />
                </div>
              </div>

              {/* Bahan Baku */}
              <div>
                <label style={{ fontSize: '0.74rem', fontWeight: '700', color: T.txtSecondary, display: 'block', marginBottom: '4px' }}>
                  Pilih Bahan Baku Dapur *
                </label>
                <select
                  value={stockFormIngredientId}
                  onChange={e => handleSelectIngredient(e.target.value)}
                  className="form-select"
                  style={{ background: T.inputBg, borderColor: T.border, color: T.txtPrimary, width: '100%' }}
                  required
                >
                  <option value="">-- Pilih Bahan Baku --</option>
                  {allIngredients.map(ing => (
                    <option key={ing.id} value={ing.id}>
                      {ing.name} ({ing.code || 'BHN'}) - Stok Sistem: {ing.stock || 0} {ing.unit || 'Kg'}
                    </option>
                  ))}
                </select>
              </div>

              {/* Info Stok Sistem vs Penyesuaian */}
              {selectedIngredientObj && (
                <div style={{ background: T.cardBg2, border: `1px solid ${T.borderStrong}`, padding: '10px 14px', borderRadius: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <span style={{ fontSize: '0.68rem', color: T.txtSecondary }}>STOK SISTEM SAAT INI</span>
                    <div style={{ fontSize: '0.96rem', fontWeight: '900', color: T.info }}>
                      {selectedIngredientObj.stock || 0} {selectedIngredientObj.unit || 'Kg'}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '0.68rem', color: T.txtSecondary }}>ESTIMASI HARGA BELI</span>
                    <div style={{ fontSize: '0.88rem', fontWeight: '800', color: T.txtPrimary }}>
                      {formatRupiah(stockFormUnitPrice)} / {selectedIngredientObj.unit || 'Kg'}
                    </div>
                  </div>
                </div>
              )}

              {/* Tipe & Alasan */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.74rem', fontWeight: '700', color: T.txtSecondary, display: 'block', marginBottom: '4px' }}>
                    Tipe Penyesuaian *
                  </label>
                  <select
                    value={stockFormType}
                    onChange={e => setStockFormType(e.target.value)}
                    className="form-select"
                    style={{ background: T.inputBg, borderColor: T.border, color: T.txtPrimary, width: '100%' }}
                  >
                    <option value="subtract">Pengurangan (-) / Rusak</option>
                    <option value="add">Penambahan (+) / Temuan</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '0.74rem', fontWeight: '700', color: T.txtSecondary, display: 'block', marginBottom: '4px' }}>
                    Kategori Alasan *
                  </label>
                  <select
                    value={stockFormReason}
                    onChange={e => setStockFormReason(e.target.value)}
                    className="form-select"
                    style={{ background: T.inputBg, borderColor: T.border, color: T.txtPrimary, width: '100%' }}
                  >
                    <option value="Penyesuaian Awal Bulan">Penyesuaian Awal Bulan</option>
                    <option value="Basi / Kadaluarsa (Spoilage)">Basi / Kadaluarsa (Spoilage)</option>
                    <option value="Rusak / Tumpah / Pecah (Damaged)">Rusak / Tumpah / Pecah (Damaged)</option>
                    <option value="Selisih Stock Opname Fisik Dapur">Selisih Stock Opname Fisik Dapur</option>
                    <option value="Koreksi Salah Catat Input">Koreksi Salah Catat Input</option>
                    <option value="Pemakaian Khusus (Testing/Owner)">Pemakaian Khusus (Testing/Owner)</option>
                  </select>
                </div>
              </div>

              {/* Jumlah Penyesuaian */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.74rem', fontWeight: '700', color: T.txtSecondary, display: 'block', marginBottom: '4px' }}>
                    Jumlah Kuantitas Koreksi *
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <input
                      type="number"
                      step="any"
                      min="0.01"
                      required
                      placeholder="Contoh: 2"
                      value={stockFormAdjustQty}
                      onChange={e => setStockFormAdjustQty(e.target.value)}
                      className="form-input"
                      style={{ background: T.inputBg, borderColor: T.border, color: T.txtPrimary, flex: 1 }}
                    />
                    <span style={{ fontSize: '0.76rem', color: T.txtSecondary, fontWeight: '700' }}>
                      {selectedIngredientObj?.unit || 'Kg'}
                    </span>
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '0.74rem', fontWeight: '700', color: T.txtSecondary, display: 'block', marginBottom: '4px' }}>
                    Harga Satuan (Rp)
                  </label>
                  <input
                    type="number"
                    value={stockFormUnitPrice}
                    onChange={e => setStockFormUnitPrice(e.target.value)}
                    className="form-input"
                    style={{ background: T.inputBg, borderColor: T.border, color: T.txtPrimary }}
                  />
                </div>
              </div>

              {/* PIC & Notes */}
              <div>
                <label style={{ fontSize: '0.74rem', fontWeight: '700', color: T.txtSecondary, display: 'block', marginBottom: '4px' }}>
                  Keterangan Tambahan / Catatan Audit
                </label>
                <textarea
                  rows={2}
                  placeholder="Catatan detail (contoh: ayam bau asam saat unboxing, atau minyak tumpah di rak dapur)"
                  value={stockFormNotes}
                  onChange={e => setStockFormNotes(e.target.value)}
                  className="form-input"
                  style={{ background: T.inputBg, borderColor: T.border, color: T.txtPrimary, resize: 'none' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px' }}>
                <button
                  type="button"
                  onClick={() => setShowStockModal(false)}
                  style={{ background: T.cardBg2, border: `1px solid ${T.border}`, padding: '8px 16px', borderRadius: '8px', color: T.txtSecondary, fontSize: '0.76rem', fontWeight: '700', cursor: 'pointer' }}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  style={{ padding: '8px 18px', fontSize: '0.76rem', fontWeight: '800' }}
                >
                  Simpan Penyesuaian Stok
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 6. MODAL: CATAT PENYESUAIAN KAS & KAS KECIL                   */}
      {/* ------------------------------------------------------------- */}
      {showCashModal && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '16px'
        }}>
          <div className="glass-card animate-fade-in" style={{
            width: '100%',
            maxWidth: '540px',
            background: T.cardBg,
            border: `1px solid ${T.borderStrong}`,
            borderRadius: '16px',
            padding: '24px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.6)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: '900', color: T.txtPrimary, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Wallet size={18} color={T.primary} />
                  <span>Catat Penyesuaian Kas / Rekonsiliasi</span>
                </h3>
                <p style={{ fontSize: '0.72rem', color: T.txtSecondary, margin: '2px 0 0 0' }}>
                  Form koreksi selisih kas fisik laci kasir POS, kas kecil operasional, atau brankas cabang
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowCashModal(false)}
                style={{ background: 'none', border: 'none', color: T.txtSecondary, cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmitCashAdjustment} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Outlet & Date */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.74rem', fontWeight: '700', color: T.txtSecondary, display: 'block', marginBottom: '4px' }}>
                    Cabang Outlet *
                  </label>
                  <select
                    value={cashFormBranch}
                    onChange={e => setCashFormBranch(e.target.value)}
                    className="form-select"
                    style={{ background: T.inputBg, borderColor: T.border, color: T.txtPrimary, width: '100%' }}
                    required
                  >
                    {allOutlets.map(o => (
                      <option key={o.id} value={o.id}>{o.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '0.74rem', fontWeight: '700', color: T.txtSecondary, display: 'block', marginBottom: '4px' }}>
                    Tanggal Penyesuaian *
                  </label>
                  <input
                    type="date"
                    value={cashFormDate}
                    onChange={e => setCashFormDate(e.target.value)}
                    className="form-input"
                    style={{ background: T.inputBg, borderColor: T.border, color: T.txtPrimary }}
                    required
                  />
                </div>
              </div>

              {/* Akun Kas & Tipe */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.74rem', fontWeight: '700', color: T.txtSecondary, display: 'block', marginBottom: '4px' }}>
                    Akun Kas *
                  </label>
                  <select
                    value={cashFormAccount}
                    onChange={e => setCashFormAccount(e.target.value)}
                    className="form-select"
                    style={{ background: T.inputBg, borderColor: T.border, color: T.txtPrimary, width: '100%' }}
                  >
                    <option value="Kas Laci Kasir (Cash Drawer)">Kas Laci Kasir (Cash Drawer)</option>
                    <option value="Kas Kecil Operasional (Petty Cash)">Kas Kecil Operasional (Petty Cash)</option>
                    <option value="Brankas Outlet Cabang">Brankas Outlet Cabang</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '0.74rem', fontWeight: '700', color: T.txtSecondary, display: 'block', marginBottom: '4px' }}>
                    Tipe Selisih *
                  </label>
                  <select
                    value={cashFormType}
                    onChange={e => setCashFormType(e.target.value)}
                    className="form-select"
                    style={{ background: T.inputBg, borderColor: T.border, color: T.txtPrimary, width: '100%' }}
                  >
                    <option value="shortage">Kas Kurang (Shortage)</option>
                    <option value="overage">Kas Lebih (Overage)</option>
                    <option value="correction">Koreksi Saldo Awal</option>
                  </select>
                </div>
              </div>

              {/* Alasan & Nominal */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.74rem', fontWeight: '700', color: T.txtSecondary, display: 'block', marginBottom: '4px' }}>
                    Kategori Alasan *
                  </label>
                  <select
                    value={cashFormReason}
                    onChange={e => setCashFormReason(e.target.value)}
                    className="form-select"
                    style={{ background: T.inputBg, borderColor: T.border, color: T.txtPrimary, width: '100%' }}
                  >
                    <option value="Penyesuaian Awal Bulan">Penyesuaian Awal Bulan</option>
                    <option value="Selisih Tutup Kasir / Shift Closing">Selisih Tutup Kasir / Shift Closing</option>
                    <option value="Pembulatan Uang Kembalian Pelanggan">Pembulatan Uang Kembalian Pelanggan</option>
                    <option value="Koreksi Modal Awal Kasir">Koreksi Modal Awal Kasir</option>
                    <option value="Biaya Darurat / Talangan Operasional">Biaya Darurat / Talangan Operasional</option>
                    <option value="Selisih Setoran EDC / Bank Transfer">Selisih Setoran EDC / Bank Transfer</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '0.74rem', fontWeight: '700', color: T.txtSecondary, display: 'block', marginBottom: '4px' }}>
                    Nominal Selisih (Rp) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    placeholder="Contoh: 15000"
                    value={cashFormAmount}
                    onChange={e => setCashFormAmount(e.target.value)}
                    className="form-input"
                    style={{ background: T.inputBg, borderColor: T.border, color: T.txtPrimary, fontWeight: '800' }}
                  />
                </div>
              </div>

              {/* No Bukti & Petugas */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.74rem', fontWeight: '700', color: T.txtSecondary, display: 'block', marginBottom: '4px' }}>
                    No. Bukti / Ref (Opsional)
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: SHIFT-01 / BUKTI-09"
                    value={cashFormRefNo}
                    onChange={e => setCashFormRefNo(e.target.value)}
                    className="form-input"
                    style={{ background: T.inputBg, borderColor: T.border, color: T.txtPrimary }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.74rem', fontWeight: '700', color: T.txtSecondary, display: 'block', marginBottom: '4px' }}>
                    Petugas / Kasir PIC
                  </label>
                  <input
                    type="text"
                    value={cashFormPic}
                    onChange={e => setCashFormPic(e.target.value)}
                    className="form-input"
                    style={{ background: T.inputBg, borderColor: T.border, color: T.txtPrimary }}
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label style={{ fontSize: '0.74rem', fontWeight: '700', color: T.txtSecondary, display: 'block', marginBottom: '4px' }}>
                  Keterangan Tambahan / Catatan Audit
                </label>
                <textarea
                  rows={2}
                  placeholder="Catatan penyebab selisih kas fisik..."
                  value={cashFormNotes}
                  onChange={e => setCashFormNotes(e.target.value)}
                  className="form-input"
                  style={{ background: T.inputBg, borderColor: T.border, color: T.txtPrimary, resize: 'none' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px' }}>
                <button
                  type="button"
                  onClick={() => setShowCashModal(false)}
                  style={{ background: T.cardBg2, border: `1px solid ${T.border}`, padding: '8px 16px', borderRadius: '8px', color: T.txtSecondary, fontSize: '0.76rem', fontWeight: '700', cursor: 'pointer' }}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  style={{ padding: '8px 18px', fontSize: '0.76rem', fontWeight: '800' }}
                >
                  Simpan Penyesuaian Kas
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
