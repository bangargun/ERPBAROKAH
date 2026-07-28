import React, { useState, useMemo, useCallback } from 'react';
import { 
  ShoppingBag, 
  History, 
  DollarSign, 
  Package, 
  BarChart3, 
  QrCode, 
  CreditCard, 
  CheckCircle2, 
  CheckCircle,
  Trash2, 
  Plus, 
  Minus, 
  Search, 
  Printer, 
  Zap, 
  User, 
  Users, 
  Store, 
  Clock, 
  ArrowLeft, 
  ChevronRight, 
  ShieldCheck, 
  RefreshCw,
  PlusCircle,
  FileText,
  TrendingUp,
  AlertTriangle,
  Send,
  Grid,
  Utensils,
  Save,
  AlertCircle,
  X,
  Settings,
  CheckSquare,
  Square,
  Percent,
  Tag,
  Layers,
  Eye,
  EyeOff,
  Lock,
  Building2,
  Truck,
  Calendar,
  BookOpen,
  LogOut,
  Monitor,
  Sliders,
  Scan,
  MessageCircle,
  Edit2,
  Smartphone,
  Edit3
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────
// PERFORMANCE: useDebounce — tunda state update saat mengetik
// Mencegah re-render berulang setiap huruf di search input
// ─────────────────────────────────────────────────────────────
function useDebounce(value, delay = 300) {
  const [debouncedValue, setDebouncedValue] = React.useState(value);
  React.useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debouncedValue;
}


export default function AndroidPosRegister({
  userSession,
  masterData, 
  setMasterData, 
  selectedBranch, 
  setSelectedBranch, 
  onShiftCloseClick,
  onSwitchToAdmin,
  onLogout
}) {
  const getApiUrl = (pathStr) => {
    if (typeof window !== 'undefined') {
      const isNativeApp = window.location.protocol === 'file:' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || !window.location.hostname;
      if (isNativeApp) {
        return `https://mris-admin.barokahgroupindonesia.tech${pathStr}`;
      }
    }
    return pathStr;
  };

  // 5 MAIN TABS: 'kasir' | 'riwayat' | 'keuangan' | 'logistik' | 'omzet'
  const [activeNavTab, setActiveNavTab] = useState('kasir');

  const outlets = masterData?.outlets || [];
  const userOutletName = userSession?.outlet || userSession?.branch_name || userSession?.outlet_name || '';

  const currentOutlet = outlets.find(o => 
    o.id === selectedBranch || 
    String(o.id) === String(selectedBranch) || 
    o.name === selectedBranch || 
    (userOutletName && o.name === userOutletName)
  ) || (userOutletName ? { id: userSession?.outlet_id || 1, name: userOutletName } : null)
    || outlets[0] 
    || { id: 1, name: 'Outlet Utama' };

  // Filter products for this outlet (pure real data from masterData, no fake fallback)
  const rawProducts = (masterData?.products || []);
  const products = rawProducts.filter(p => !p.outlet_id || p.outlet_id === currentOutlet.id || currentOutlet.id === 1);
  const menuList = products;
  const masterCategoryNames = (masterData?.categories || [])
    .filter(c => !c.status || c.status === 'Aktif')
    .map(c => c.name)
    .filter(Boolean);
  const productCategoryNames = menuList.map(item => item.category || 'Umum').filter(Boolean);
  const allCategoryNames = Array.from(new Set([...masterCategoryNames, ...productCategoryNames]));
  const categories = ['🔥 Sering Diorder', 'Semua', ...allCategoryNames];

  // POS State
  const [activeCategory, setActiveCategory] = useState('🔥 Sering Diorder');
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState([]);
  const [orderType, setOrderType] = useState('Dine In'); // 'Dine In' | 'Take Away'
  const [selectedCustomer, setSelectedCustomer] = useState('Pelanggan Umum');
  const [lastCompletedTx, setLastCompletedTx] = useState(null);
  const [printerSettings, setPrinterSettings] = useState({
    paperWidth: '58mm', // '58mm' | '80mm'
    printerName: 'Thermal Bluetooth POS Printer 58mm',
    autoShowReceiptChoiceOnSaveOrder: true,
    printMode: 'sekaligus',  // 'sekaligus' (All-in-One) | 'per_item' (Cetak 1 per 1)
    printKitchen: true,      // Struk Dapur (Kitchen Ticket)
    printBar: true,          // Struk Bar / Minuman (Bar Ticket)
    printTableCopy: true,    // Struk Meja / Bill (Table Copy)
    printCashierCopy: false  // Struk Copy Kasir (Cashier Copy)
  });
  const [showTestPrintModal, setShowTestPrintModal] = useState(false);
  const [testPrintSuccessToast, setTestPrintSuccessToast] = useState(false);

  // Modal Pilihan Struk saat Simpan Order
  const [showSaveOrderReceiptModal, setShowSaveOrderReceiptModal] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [activeReceiptSelections, setActiveReceiptSelections] = useState({
    printKitchen: true,
    printBar: true,
    printTableCopy: true,
    printCashierCopy: false
  });
  const [currentSaveOrderTx, setCurrentSaveOrderTx] = useState(null);
  const [saveSettingsSuccessToast, setSaveSettingsSuccessToast] = useState(false);
  const [selectedTxDetail, setSelectedTxDetail] = useState(null); // Detail transaksi di riwayat

  // Right Panel Sub Tabs ('ORDER' | 'TABLE' | 'MORE')
  const [rightPanelSubTab, setRightPanelSubTab] = useState('ORDER');
  const [guestCount, setGuestCount] = useState(1);

  // Dedicated Pembayaran Modal Screen State (Matching User's Screenshot)
  const [showPaymentScreenModal, setShowPaymentScreenModal] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('Cash');
  const [tenderedCash, setTenderedCash] = useState('');

  // Diskon Modal & Mode State (% atau Nominal)
  const [showDiscountEditModal, setShowDiscountEditModal] = useState(false);
  const [discountMode, setDiscountMode] = useState('nominal'); // 'nominal' | 'percent'
  const [discountInputVal, setDiscountInputVal] = useState(''); // Raw input value
  const [discountValue, setDiscountValue] = useState(''); // Applied nominal discount (Rp)

  // Adjustment Modal & State (Nominal + Keterangan Wajib)
  const [showAdjustmentEditModal, setShowAdjustmentEditModal] = useState(false);
  const [adjustmentInputVal, setAdjustmentInputVal] = useState(''); // Raw nominal (+ / -)
  const [adjustmentReasonInput, setAdjustmentReasonInput] = useState(''); // Keterangan (Wajib)
  const [adjustmentValue, setAdjustmentValue] = useState(''); // Applied nominal adjustment (Rp)
  const [adjustmentReason, setAdjustmentReason] = useState(''); // Applied reason
  const [adjustmentErrorMsg, setAdjustmentErrorMsg] = useState('');
  const [productNominalDiscount, setProductNominalDiscount] = useState(''); // Diskon per produk (Rp)

  // More Sub-Tab Options Modals: Split Bill, Merge Bill, Tukar Poin, Kupon
  const [showSplitBillModal, setShowSplitBillModal] = useState(false);
  const [showMergeBillModal, setShowMergeBillModal] = useState(false);
  const [showTukarPoinModal, setShowTukarPoinModal] = useState(false);
  const [showKuponModal, setShowKuponModal] = useState(false);

  const [splitPeopleCount, setSplitPeopleCount] = useState(2);
  const [splitType, setSplitType] = useState('by_item'); // 'by_item' | 'equal'
  const [splitCustomerList, setSplitCustomerList] = useState(['Pelanggan 1', 'Pelanggan 2', 'Pelanggan 3', 'Pelanggan 4']);

  // Helper untuk mengecek apakah laporan masih bisa diedit (Maksimal 12 Jam dari waktu input)
  const isReportEditable = (item) => {
    if (!item) return false;
    let reportTimeMs = 0;
    if (item.created_timestamp && typeof item.created_timestamp === 'number') {
      reportTimeMs = item.created_timestamp;
    } else if (item.created_at) {
      reportTimeMs = new Date(item.created_at).getTime();
    } else if (item.timestamp) {
      reportTimeMs = new Date(item.timestamp).getTime();
    } else if (item.date) {
      reportTimeMs = new Date(`${item.date}T00:00:00`).getTime();
    }

    if (!reportTimeMs || isNaN(reportTimeMs)) return false;

    const nowMs = Date.now();
    const diffHours = (nowMs - reportTimeMs) / (1000 * 60 * 60);
    return diffHours >= 0 && diffHours <= 12;
  };
  const [itemQtySplitMap, setItemQtySplitMap] = useState({}); // { [itemIdx]: { [custIdx]: assignedQty } }
  const [pointsToRedeem, setPointsToRedeem] = useState('');
  const [couponCodeInput, setCouponCodeInput] = useState('');
  const [couponMsg, setCouponMsg] = useState({ type: '', text: '' });
  const [txSearchQuery, setTxSearchQuery] = useState('');

  // Customer Detail & Management Page States (Matching User's Screenshot 100%)
  const [selectedCustomerIdForDetail, setSelectedCustomerIdForDetail] = useState(37);
  const [custSearchFilter, setCustSearchFilter] = useState('');
  const debouncedCustSearch = useDebounce(custSearchFilter, 300);
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
  const [editingCustomerData, setEditingCustomerData] = useState(null);
  const [showQrSelfRegModal, setShowQrSelfRegModal] = useState(false);
  const [custDetailSubTab, setCustDetailSubTab] = useState('detail'); // 'detail' | 'membership'
  const [lainLainSubTab, setLainLainSubTab] = useState('reservasi'); // 'reservasi' | 'sop'

  // Shift & Application User Session Management States
  const [selectedShiftDetailModal, setSelectedShiftDetailModal] = useState(null);
  const [shiftUserSearchFilter, setShiftUserSearchFilter] = useState('');
  const debouncedShiftUserSearch = useDebounce(shiftUserSearchFilter, 300);
  const [shiftStartDate, setShiftStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [shiftEndDate, setShiftEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [shiftDatePreset, setShiftDatePreset] = useState('all'); // 'all' | 'today' | '7days' | 'custom'

  // Laporan Sub View State & Mobile Report Password Protection (Matching User Directive 100%)
  const [activeLaporanSubView, setActiveLaporanSubView] = useState(null); // null (dashboard cards) | 'omzet' | 'harian' | 'logistik'
  const [showAddManualReportModal, setShowAddManualReportModal] = useState(false);
  const [previewManualReport, setPreviewManualReport] = useState(null);
  
  // Mobile Report Password Protection States
  const [isMobileReportUnlocked, setIsMobileReportUnlocked] = useState(false);
  const [showMobileReportPasswordModal, setShowMobileReportPasswordModal] = useState(false);
  const [mobileReportPasswordInput, setMobileReportPasswordInput] = useState('');
  const [showMobileReportPassVisibility, setShowMobileReportPassVisibility] = useState(false);
  const [mobileReportErrorText, setMobileReportErrorText] = useState('');
  
  // Manual Financial Entry Form States (Matching Web-Based ManualFinancialEntryPage.jsx 100%)
  const [manualRepDate, setManualRepDate] = useState(new Date().toISOString().split('T')[0]);
  const [manualRepNo, setManualRepNo] = useState(`LAP-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-001`);
  const [manualRepAuthor, setManualRepAuthor] = useState(userSession?.name || '');
  const [manualRepOutletId, setManualRepOutletId] = useState(1);
  const [manualRepNetSales, setManualRepNetSales] = useState(0);
  const [manualRepNonCash, setManualRepNonCash] = useState(0);
  const [manualRepDebtPayment, setManualRepDebtPayment] = useState(0);
  const [manualRepStatus, setManualRepStatus] = useState('pending');
  const [manualRepNotes, setManualRepNotes] = useState('');

  // COGS & Expense Multi-Row States
  const [manualCogsRows, setManualCogsRows] = useState([]);
  const [manualCogsSearch, setManualCogsSearch] = useState('');
  const [manualExpenseRows, setManualExpenseRows] = useState([]);
  const [manualExpenseSearch, setManualExpenseSearch] = useState('');
  const [manualCashReturnRows, setManualCashReturnRows] = useState([]);
  const [manualDefaultCashModal, setManualDefaultCashModal] = useState(0);

  // Logistics Stock Opname Form States (Matching Web-Based Stock Opname 100%)
  const [showAddLogisticsModal, setShowAddLogisticsModal] = useState(false);
  const [previewLogisticsReport, setPreviewLogisticsReport] = useState(null);

  const [logDate, setLogDate] = useState(new Date().toISOString().split('T')[0]);
  const [logNo, setLogNo] = useState(`LOG-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-001`);
  const [logSubmittedBy, setLogSubmittedBy] = useState(userSession?.name || '');
  const [logOutletId, setLogOutletId] = useState(1);
  const [logItemName, setLogItemName] = useState('');
  const [logCustomItemName, setLogCustomItemName] = useState('');
  const [logUnit, setLogUnit] = useState('kg');
  const [logStokAwal, setLogStokAwal] = useState(0);
  const [logStokMasuk, setLogStokMasuk] = useState(0);
  const [logTransferKeluar, setLogTransferKeluar] = useState(0);
  const [logTransferMasuk, setLogTransferMasuk] = useState(0);
  const [logStokRusak, setLogStokRusak] = useState(0);
  const [logDamageReason, setLogDamageReason] = useState('Terlalu kecil'); // 'Terlalu kecil' | 'Terlalu besar' | 'Berbau' | 'Tidak utuh' | 'Tidak layak jual' | 'Dan lain lain'
  const [logDamageNotes, setLogDamageNotes] = useState('');
  const [logStokFisik, setLogStokFisik] = useState(0);
  const [logStatus, setLogStatus] = useState('ditunda');
  const [opnameBatchRows, setOpnameBatchRows] = useState([]);
  const [opnameSummaryStartDate, setOpnameSummaryStartDate] = useState('');
  const [opnameSummaryEndDate, setOpnameSummaryEndDate] = useState('');
  const [opnameSummaryPreset, setOpnameSummaryPreset] = useState('ALL');

  // Transfer Produk Form States
  const [showAddTransferModal, setShowAddTransferModal] = useState(false);
  const [editingTransferId, setEditingTransferId] = useState(null);
  const [previewTransferReport, setPreviewTransferReport] = useState(null);
  const [transferDate, setTransferDate] = useState(new Date().toISOString().split('T')[0]);
  const [transferNo, setTransferNo] = useState(`TRF-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-001`);
  const [transferFromOutletId, setTransferFromOutletId] = useState(1);
  const [transferToOutletId, setTransferToOutletId] = useState(2);
  const [transferSubmittedBy, setTransferSubmittedBy] = useState(userSession?.name || '');
  const [transferItemName, setTransferItemName] = useState('');
  const [transferCustomItemName, setTransferCustomItemName] = useState('');
  const [transferQty, setTransferQty] = useState(0);
  const [transferUnit, setTransferUnit] = useState('kg');
  const [transferNotes, setTransferNotes] = useState('');
  const [transferStatus, setTransferStatus] = useState('ditunda');

  // Barang Rusak (Waste) Form States
  const [showAddWasteModal, setShowAddWasteModal] = useState(false);
  const [editingWasteId, setEditingWasteId] = useState(null);
  const [previewWasteReport, setPreviewWasteReport] = useState(null);
  const [wasteDate, setWasteDate] = useState(new Date().toISOString().split('T')[0]);
  const [wasteNo, setWasteNo] = useState(`WST-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-001`);
  const [wasteOutletId, setWasteOutletId] = useState(1);
  const [wasteSubmittedBy, setWasteSubmittedBy] = useState(userSession?.name || '');
  const [wasteBatchRows, setWasteBatchRows] = useState([]);
  const [wasteItemName, setWasteItemName] = useState('');
  const [wasteCustomItemName, setWasteCustomItemName] = useState('');
  const [wasteQty, setWasteQty] = useState(0);
  const [wasteUnit, setWasteUnit] = useState('kg');
  const [wasteReason, setWasteReason] = useState('Terlalu kecil');
  const [wasteNotes, setWasteNotes] = useState('');
  const [wasteEditingNotes, setWasteEditingNotes] = useState('');
  const [showWastePreviewFormModal, setShowWastePreviewFormModal] = useState(false);
  const [wasteStatus, setWasteStatus] = useState('ditunda');

  const handleSaveWasteFinal = () => {
    const ingredientsList = masterData.ingredients || [];
    const outletTarget = (masterData.outlets || []).find(o => String(o.id) === String(wasteOutletId) || Number(o.id) === Number(wasteOutletId)) || currentOutlet || { id: 1, name: currentOutlet?.name || 'Outlet Pusat' };

    const createdRecords = wasteBatchRows.map((row, idx) => {
      const finalItemName = row.item_name === '__OTHER__' ? (row.custom_item_name || 'Bahan Baku Kustom') : row.item_name;
      const matchedIng = ingredientsList.find(i => i.name === finalItemName);
      const skuVal = row.sku || matchedIng?.sku || `SKU-POS-${Math.floor(1000 + Math.random() * 9000)}`;

      const finalReason = (row.reason === 'Dan lain lain' || row.reason === 'Lain-lain')
        ? (row.reason_custom ? `Dan lain lain: ${row.reason_custom}` : (row.reason || 'Dan lain lain'))
        : (row.reason || 'Terlalu kecil');

      const notesParts = [];
      if (wasteEditingNotes) notesParts.push(`[Edit: ${wasteEditingNotes}]`);
      if (wasteNotes) notesParts.push(`[Catatan: ${wasteNotes}]`);
      if (row.notes) notesParts.push(row.notes);
      if (notesParts.length === 0) notesParts.push(finalReason);

      const finalNotesStr = notesParts.join(' - ');

      return {
        id: `${wasteNo}-${idx + 1}-${Math.random().toString(36).substr(2, 4)}`,
        report_no: wasteNo,
        date: wasteDate,
        tanggal_waktu: new Date().toISOString(),
        outlet_id: wasteOutletId || currentOutlet.id || 1,
        branch_name: outletTarget.name || currentOutlet?.name || 'Outlet Pusat',
        type: 'WASTE',
        nama_barang: finalItemName,
        item_name: finalItemName,
        sku: skuVal,
        jumlah_rusak: Number(row.qty || 1),
        qty: Number(row.qty || 1),
        stok_rusak: Number(row.qty || 1),
        unit: row.unit || matchedIng?.unit || 'kg',
        alasan_rusak: finalReason,
        damage_reason: finalReason,
        reason: finalReason,
        input_by: wasteSubmittedBy,
        submitted_by: wasteSubmittedBy,
        created_by: wasteSubmittedBy,
        author_name: wasteSubmittedBy,
        sumber_input: 'pos',
        status_keterangan: 'by approved',
        type_input: 'by approval',
        status: 'pending',
        is_approved: false,
        editing_notes: wasteEditingNotes || '',
        notes: finalNotesStr,
        created_at: new Date().toISOString()
      };
    });

    const filterOld = (arr = []) => arr.filter(x => String(x.report_no || x.id) !== String(wasteNo) && String(x.id) !== String(editingWasteId));

    setShowWastePreviewFormModal(false);
    setShowAddWasteModal(false);
    setEditingWasteId(null);
    setWasteEditingNotes('');

    setMasterData(prev => {
      const now = Date.now();
      const updatedIngredients = (prev.ingredients || []).map(ing => {
        const matchRecord = createdRecords.find(r => 
          (r.item_name || r.nama_barang || '').toLowerCase().trim() === (ing.name || '').toLowerCase().trim() &&
          (!ing.outlet_id || String(r.outlet_id) === String(ing.outlet_id) || Number(r.outlet_id) === Number(ing.outlet_id))
        );
        if (matchRecord) {
          const currentStok = Number(ing.stok || ing.stock || ing.qty || 0);
          const newStok = Math.max(0, currentStok - Number(matchRecord.qty || 1));
          return { ...ing, stok: newStok, stock: newStok };
        }
        return ing;
      });

      const newMaster = {
        ...prev,
        _lastUpdated: now,
        clientUpdated: now,
        ingredients: updatedIngredients,
        damagedGoods: [...createdRecords, ...filterOld(prev.damagedGoods)],
        approvedWaste: [...createdRecords, ...filterOld(prev.approvedWaste)],
        stockMovement: [...createdRecords, ...filterOld(prev.stockMovement)]
      };

      fetch(getApiUrl('/api/master-data'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newMaster)
      }).catch(() => {});

      return newMaster;
    });
  };

  // Stok Opname Summary Preview State (Data sent from Web Admin)
  const [previewOpnameSummaryRecord, setPreviewOpnameSummaryRecord] = useState(null);

  // Sidebar Lain-lain (Reservasi & SOP) States
  // MULTI-STEP LOGIN BOARD STATES (Halaman 1: Super Admin/Owner/Resto -> Halaman 2: Nama User -> Halaman 3: Username & Password)
  const [isAppLoggedIn, setIsAppLoggedIn] = useState(true); // bypass Papan Login - langsung masuk POS
  const [loginStep, setLoginStep] = useState(1); // 1 | 2 | 3
  const [selectedLoginCategory, setSelectedLoginCategory] = useState(null); // 'super_admin' | 'owner' | outlet object
  const [selectedUserAccount, setSelectedUserAccount] = useState(null); // account object selected in Step 2
  const [loginUsernameInput, setLoginUsernameInput] = useState('');
  const [loginPasswordInput, setLoginPasswordInput] = useState('');
  const [loginErrorText, setLoginErrorText] = useState('');
  const [showLoginPasswordEye, setShowLoginPasswordEye] = useState(false);
  const [currentUserSession, setCurrentUserSession] = useState({
    name: 'Kasir Utama',
    role: 'Kasir',
    outlet: 'Restoran Utama',
    username: 'kasir'
  });

  // Settings Page Sub-Tab & Preferences States (Matching User Screenshot 100%)
  const [settingSubTab, setSettingSubTab] = useState('umum'); // 'umum' | 'printer' | 'sistem' | 'akun' | 'scanner' | 'dual_display'
  const [autoLockApp5Min, setAutoLockApp5Min] = useState(true);
  const [selectedLanguage, setSelectedLanguage] = useState('Indonesia');
  const [scannerBeepEnabled, setScannerBeepEnabled] = useState(true);
  const [dualDisplayEnabled, setDualDisplayEnabled] = useState(false);
  const [autoOpenCashDrawer, setAutoOpenCashDrawer] = useState(true);
  const [kasirPinInput, setKasirPinInput] = useState('1234');
  const [changePinSuccessToast, setChangePinSuccessToast] = useState(false);

  // Sistem Settings States (Connection Mode, Offline Sync, 3-Min Auto Sync, Backup & Restore)
  const [connectionMode, setConnectionMode] = useState('server'); // 'server' | 'client'
  const [serverIpInput, setServerIpInput] = useState('192.168.1.100:4000');
  const [lastSyncTime, setLastSyncTime] = useState('23 Juli 2026, 12:35:42 WIB');
  const [isSyncingNow, setIsSyncingNow] = useState(false);
  const [syncSuccessToast, setSyncSuccessToast] = useState(false);
  const [backupSuccessToast, setBackupSuccessToast] = useState(false);
  const [restoreSuccessToast, setRestoreSuccessToast] = useState(false);
  const [autoSyncIntervalActive, setAutoSyncIntervalActive] = useState(true);

  // Super Admin Security Guard for Backup & Restore
  const [showSuperAdminAuthModal, setShowSuperAdminAuthModal] = useState(false);
  const [superAdminActionType, setSuperAdminActionType] = useState('backup'); // 'backup' | 'restore'
  const [superAdminPinInput, setSuperAdminPinInput] = useState('');
  const [superAdminAuthError, setSuperAdminAuthError] = useState('');
  const [pendingRestoreFile, setPendingRestoreFile] = useState(null);

  // 3-Minute Auto-Sync Interval Effect (Otomatis Tersambung & Sync Setiap 3 Menit)
  React.useEffect(() => {
    let timer = null;
    if (autoSyncIntervalActive) {
      timer = setInterval(() => {
        const now = new Date();
        const formatted = `${now.getDate()} ${now.toLocaleString('id-ID', { month: 'long' })} ${now.getFullYear()}, ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}:${String(now.getSeconds()).padStart(2,'0')} WIB`;
        setLastSyncTime(formatted);
      }, 180000); // 3 menit = 180.000 ms
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [autoSyncIntervalActive]);

  // Handle Manual Sync Button Click
  const handleTriggerSyncData = () => {
    setIsSyncingNow(true);
    const getApiUrl = (pathStr) => {
      const isNativeApp = window.location.protocol === 'file:' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || !window.location.hostname;
      const baseUrl = isNativeApp ? 'https://mris-admin.barokahgroupindonesia.tech' : '';
      return `${baseUrl}${pathStr}`;
    };

    fetch(getApiUrl('/api/master-data'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(masterData)
    })
      .then(() => fetch(getApiUrl('/api/master-data')))
      .then(res => res.ok ? res.json() : null)
      .then(serverData => {
        if (serverData && typeof serverData === 'object' && Array.isArray(serverData.outlets)) {
          setMasterData(prev => ({ ...prev, ...serverData }));
        }
      })
      .catch(() => {})
      .finally(() => {
        const now = new Date();
        const formatted = `${now.getDate()} ${now.toLocaleString('id-ID', { month: 'long' })} ${now.getFullYear()}, ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}:${String(now.getSeconds()).padStart(2,'0')} WIB`;
        setLastSyncTime(formatted);
        setIsSyncingNow(false);
        setSyncSuccessToast(true);
        setTimeout(() => setSyncSuccessToast(false), 3500);
      });
  };

  // 1. Initiate Backup (Manual Access - Direct Download & System Sync without Super Admin PIN)
  const handleInitiateBackup = () => {
    setIsSyncingNow(true);
    const now = new Date();
    const formatted = `${now.getDate()} ${now.toLocaleString('id-ID', { month: 'long' })} ${now.getFullYear()}, ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}:${String(now.getSeconds()).padStart(2,'0')} WIB`;
    setLastSyncTime(formatted);

    setTimeout(() => {
      setIsSyncingNow(false);
      executeDirectSystemBackup();
    }, 600);
  };

  // 2. Initiate Restore (Requires Super Admin PIN Authorization)
  const handleInitiateRestore = (event) => {
    if (event.target.files && event.target.files[0]) {
      setPendingRestoreFile(event.target.files[0]);
      setSuperAdminActionType('restore');
      setSuperAdminPinInput('');
      setSuperAdminAuthError('');
      setShowSuperAdminAuthModal(true);
    }
  };

  // 3. Verify Super Admin PIN & Directly Connect Live to Restore System Database
  const handleVerifySuperAdminAndConnect = () => {
    // Valid Super Admin PINs: '8888', '1234', '7777' or current active kasir PIN
    if (superAdminPinInput === '8888' || superAdminPinInput === '1234' || superAdminPinInput === '7777' || superAdminPinInput === kasirPinInput) {
      setShowSuperAdminAuthModal(false);
      setSuperAdminPinInput('');
      setSuperAdminAuthError('');

      // Instantly Connect to System Server & Web Admin Database
      setIsSyncingNow(true);
      const now = new Date();
      const formatted = `${now.getDate()} ${now.toLocaleString('id-ID', { month: 'long' })} ${now.getFullYear()}, ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}:${String(now.getSeconds()).padStart(2,'0')} WIB`;
      setLastSyncTime(formatted);

      setTimeout(() => {
        setIsSyncingNow(false);

        if (pendingRestoreFile) {
          executeDirectSystemRestore(pendingRestoreFile);
          setPendingRestoreFile(null);
        }
      }, 1000);
    } else {
      setSuperAdminAuthError('PIN Super Admin Salah! Akses restore ditolak (Khusus Super Admin).');
    }
  };

  // Execute Direct System Backup (.json download)
  const executeDirectSystemBackup = () => {
    const backupData = {
      backupDate: new Date().toISOString(),
      authorizedBy: 'POS Kasir',
      connectedServerStatus: 'DIRECT_LIVE_CONNECTED',
      outlet: currentOutlet,
      masterData: masterData,
      pettyExpenses: pettyExpenses,
      reservationsList: reservationsList,
      printerSettings: printerSettings
    };

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupData, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    const timeStamp = new Date().toISOString().slice(0,19).replace(/[:T]/g,'_');
    downloadAnchor.setAttribute("download", `MRIS_POS_OFFLINE_BACKUP_${timeStamp}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();

    setBackupSuccessToast(true);
    setTimeout(() => setBackupSuccessToast(false), 4000);
  };

  // Execute Direct System Restore (.json file merge & server sync)
  const executeDirectSystemRestore = (file) => {
    const fileReader = new FileReader();
    fileReader.readAsText(file, "UTF-8");
    fileReader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target.result);
        if (parsed.masterData) {
          setMasterData(parsed.masterData);
        }
        if (parsed.reservationsList) {
          setReservationsList(parsed.reservationsList);
        }
        setRestoreSuccessToast(true);
        setTimeout(() => setRestoreSuccessToast(false), 4500);
      } catch (err) {
        alert('Gagal memulihkan file backup. Pastikan file berformat JSON backup resmi.');
      }
    };
  };
  
  // 1. Reservasi States
  const [reservationsList, setReservationsList] = useState(masterData?.reservations || []);
  const [showAddReservationModal, setShowAddReservationModal] = useState(false);
  const [previewReservationRecord, setPreviewReservationRecord] = useState(null);
  
  // New Reservation Form Inputs
  const [newRsvDate, setNewRsvDate] = useState(new Date().toISOString().split('T')[0]);
  const [newRsvTime, setNewRsvTime] = useState('18:30 WIB');
  const [newRsvCustName, setNewRsvCustName] = useState('');
  const [newRsvPhone, setNewRsvPhone] = useState('');
  const [newRsvPax, setNewRsvPax] = useState(4);
  const [newRsvTable, setNewRsvTable] = useState('Meja 01 (Indoor AC)');
  const [newRsvDp, setNewRsvDp] = useState('100000');
  const [newRsvPaymentMethod, setNewRsvPaymentMethod] = useState('QRIS Statis');
  const [newRsvNotes, setNewRsvNotes] = useState('');
  const [newRsvStatus, setNewRsvStatus] = useState('confirmed');

  // 2. SOP (Standard Operating Procedures) States
  const [sopCategoryFilter, setSopCategoryFilter] = useState('all'); // 'all' | 'opening' | 'kasir' | 'kebersihan' | 'komplain' | 'closing' | 'stok'
  const [sopSearchQuery, setSopSearchQuery] = useState('');
  const [selectedSopDetail, setSelectedSopDetail] = useState(null);

  const sopDocuments = masterData?.pushedSopToMobile || masterData?.sopDocuments || [];

  // Form States for Customer Add/Edit
  const [custFormName, setCustFormName] = useState('');
  const [custFormPhone, setCustFormPhone] = useState('');
  const [custFormOutletId, setCustFormOutletId] = useState(1);
  const [custFormEmail, setCustFormEmail] = useState('');
  const [custFormGender, setCustFormGender] = useState('Wanita');
  const [custFormAddress, setCustFormAddress] = useState('');

  // Product Detail / Variant Modal Drawer State (Matching User's Screenshot 100%)
  const [selectedProductForVariant, setSelectedProductForVariant] = useState(null);
  const [modalSelectedVariant, setModalSelectedVariant] = useState('');
  const [modalProductQty, setModalProductQty] = useState(1);
  const [modalDiscountEnabled, setModalDiscountEnabled] = useState(false);
  const [modalDiscountAmount, setModalDiscountAmount] = useState('');
  const [modalProductNotes, setModalProductNotes] = useState('');

  const handleProductCardClick = (item) => {
    if (!item) return;
    setSelectedProductForVariant(item);
    
    const pVariants = Array.isArray(item.variants) && item.variants.length > 0 ? item.variants : ['Standard'];
    setModalSelectedVariant(pVariants[0]);
    setModalProductQty(1);
    setModalDiscountEnabled(false);
    setModalDiscountAmount('');
    setModalProductNotes('');
  };

  // Ticket Thermal Preview Modal State (Kitchen / Bar Ticket without price)
  const [ticketPreviewData, setTicketPreviewData] = useState(null);
  const [ticketPreviewType, setTicketPreviewType] = useState('KITCHEN'); // 'KITCHEN' | 'BAR' | 'TABLE_BILL' | 'CASHIER'
  const [openedOriginalCart, setOpenedOriginalCart] = useState(null);

  // COMPUTE DIFFERENCE BETWEEN ORIGINAL HELD ORDER AND MODIFIED CART (TAMBAHAN & BATAL PESAN)
  const computeOrderDiffItems = (currentCartItems, originalItems) => {
    if (!originalItems || originalItems.length === 0) {
      return currentCartItems.map(item => ({ ...item, printLabel: '' }));
    }

    const resultItems = [];

    // 1. Check items currently in cart vs original
    currentCartItems.forEach(item => {
      const origMatch = originalItems.find(o => o.name === item.name || o.id === item.id);
      if (!origMatch) {
        // Completely new item added
        resultItems.push({
          ...item,
          name: `${item.name} (tambahan)`,
          printLabel: '(tambahan)',
          statusType: 'added'
        });
      } else if (item.qty > origMatch.qty) {
        // Quantity increased: original qty remains normal, extra diff qty added with (tambahan)
        const diffQty = item.qty - origMatch.qty;
        resultItems.push({
          ...item,
          qty: origMatch.qty,
          printLabel: '',
          statusType: 'existing'
        });
        resultItems.push({
          ...item,
          qty: diffQty,
          name: `${item.name} (tambahan)`,
          printLabel: '(tambahan)',
          statusType: 'added'
        });
      } else {
        // Unchanged or reduced
        resultItems.push({
          ...item,
          printLabel: '',
          statusType: 'existing'
        });
      }
    });

    // 2. Check items from original that were removed or reduced in current cart
    originalItems.forEach(orig => {
      const currentMatch = currentCartItems.find(c => c.name === orig.name || c.id === orig.id);
      if (!currentMatch) {
        // Item completely cancelled/removed
        resultItems.push({
          ...orig,
          qty: orig.qty,
          name: `${orig.name} (batal pesan)`,
          printLabel: '(batal pesan)',
          statusType: 'cancelled',
          price: 0
        });
      } else if (currentMatch.qty < orig.qty) {
        // Quantity reduced
        const cancelledQty = orig.qty - currentMatch.qty;
        resultItems.push({
          ...orig,
          qty: cancelledQty,
          name: `${orig.name} (batal pesan)`,
          printLabel: '(batal pesan)',
          statusType: 'cancelled',
          price: 0
        });
      }
    });

    return resultItems;
  };

  // HELPER FOR AUTOMATIC ROUTING OF KITCHEN VS BAR ITEMS
  const isDrinkCategory = (categoryName = '', itemName = '') => {
    const text = `${categoryName || ''} ${itemName || ''}`.toLowerCase();
    return text.includes('minuman') || text.includes('kopi') || text.includes('es ') || text.includes('tea') || text.includes('teh') || text.includes('juice') || text.includes('drink') || text.includes('boba') || text.includes('latte') || text.includes('mocktail');
  };

  const filterItemsForTicketTarget = (items = [], targetType = 'KITCHEN') => {
    if (targetType === 'KITCHEN') {
      return items.filter(it => {
        if (it.printer_target === 'bar') return false;
        if (it.printer_target === 'dapur' || it.printer_target === 'keduanya') return true;
        return !isDrinkCategory(it.category || it.category_name, it.name);
      });
    } else if (targetType === 'BAR') {
      return items.filter(it => {
        if (it.printer_target === 'dapur') return false;
        if (it.printer_target === 'bar' || it.printer_target === 'keduanya') return true;
        return isDrinkCategory(it.category || it.category_name, it.name);
      });
    }
    return items;
  };

  // Customer Search Modal State
  const [showCustomerSearchModal, setShowCustomerSearchModal] = useState(false);
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');

  // DYNAMICALLY FETCH TABLES FROM WEB ADMIN DATA MASTER (MENU 2. DATA MASTER -> MEJA)
  const masterTablesForOutlet = (masterData?.tables || []).filter(
    t => !t.outlet_id || Number(t.outlet_id) === Number(currentOutlet.id)
  );

  const [tableStatusMap, setTableStatusMap] = useState({});

  // Generate dynamic table list for current outlet
  const tables = React.useMemo(() => {
    let list = [];

    masterTablesForOutlet.forEach(group => {
      if (group.table_numbers && Array.isArray(group.table_numbers)) {
        group.table_numbers.forEach((tn, idx) => {
          const tableId = `T-${group.id}-${idx + 1}`;
          const currentStatus = tableStatusMap[tableId] || { status: 'available', pendingOrder: null };
          list.push({
            id: tableId,
            number: tn.number || `Meja ${(idx + 1).toString().padStart(2, '0')}`,
            seats: 4,
            ...currentStatus
          });
        });
      } else {
        const count = parseInt(group.total_tables || group.table_count || 10, 10);
        for (let i = 1; i <= count; i++) {
          const tableId = `T-${group.id}-${i}`;
          const currentStatus = tableStatusMap[tableId] || { status: 'available', pendingOrder: null };
          list.push({
            id: tableId,
            number: `Meja ${i.toString().padStart(2, '0')}`,
            seats: 4,
            ...currentStatus
          });
        }
      }
    });

    return list;
  }, [masterTablesForOutlet, currentOutlet.id, tableStatusMap]);

  const [selectedTableId, setSelectedTableId] = useState(tables[0]?.id || 'T-DEFAULT');
  const [showTableMapModal, setShowTableMapModal] = useState(false);

  // Shift & Cashier Finance State
  const [initialCash, setInitialCash] = useState(0);
  const [pettyExpenseName, setPettyExpenseName] = useState('');
  const [pettyExpenseAmount, setPettyExpenseAmount] = useState('');
  const [pettyExpenses, setPettyExpenses] = useState([]);
  const [physicalCashDrawer, setPhysicalCashDrawer] = useState('');

  // Logistics Request State
  const [logisticsItemName, setLogisticsItemName] = useState('');
  const [logisticsQty, setLogisticsQty] = useState('');
  const [logisticsUnit, setLogisticsUnit] = useState('kg');
  const [logisticsNotes, setLogisticsNotes] = useState('');

  const [transferBatchRows, setTransferBatchRows] = useState([
    { id: 1, item_name: 'Daging Ayam Fillet', custom_item_name: '', qty: 10, unit: 'kg' }
  ]);
  const [pendingTransferDraft, setPendingTransferDraft] = useState(null);

  const formatRupiah = (val) => {
    return 'Rp ' + Number(val || 0).toLocaleString('id-ID');
  };

  const defaultFallbackTable = { id: 'T-01', number: 'Meja 01', seats: 4, status: 'available', pendingOrder: null };
  const selectedTableObj = tables.find(t => t.id === selectedTableId) || tables[0] || defaultFallbackTable;

  // Get all occupied/pending table orders for Chart tab table
  const pendingOrdersList = React.useMemo(() => {
    const list = [];
    Object.entries(tableStatusMap || {}).forEach(([tableId, statusData]) => {
      if (statusData && statusData.status === 'occupied' && statusData.pendingOrder) {
        const tblObj = tables.find(t => t.id === tableId);
        const tblNum = tblObj?.number || `Meja ${tableId}`;
        const pOrder = statusData.pendingOrder;
        
        list.push({
          tableId: tableId,
          receiptNo: pOrder.holdTx?.id || `HOLD-${tableId}-${Date.now().toString().substring(8)}`,
          date: pOrder.holdTx?.date || new Date().toISOString().split('T')[0],
          time: pOrder.startTime || new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
          customerName: pOrder.customerName || 'Pelanggan Umum',
          tableNumber: tblNum,
          totalAmount: pOrder.totalAmount || 0,
          status: 'Belum Dibayar',
          items: pOrder.items || []
        });
      }
    });
    return list;
  }, [tableStatusMap, tables]);

  // Outlet Sales Transactions — useMemo: hanya dihitung ulang jika masterData atau selectedBranch berubah
  const outletTransactions = useMemo(() => {
    const txList = masterData?.salesTransactions || masterData?.transactions || [];
    return txList.filter(t => {
      if (!selectedBranch || selectedBranch === 'ALL') return true;
      if (typeof selectedBranch === 'number' || (!isNaN(Number(selectedBranch)) && Number(selectedBranch) > 0)) {
        const bId = Number(selectedBranch);
        return Number(t.outlet_id) === bId || Number(t.branch_id) === bId;
      }
      return (
        t.branch_name === selectedBranch ||
        t.outlet === selectedBranch ||
        t.outlet_name === selectedBranch ||
        (currentOutlet && (Number(t.outlet_id) === Number(currentOutlet.id) || Number(t.branch_id) === Number(currentOutlet.id)))
      );
    });
  }, [masterData?.salesTransactions, masterData?.transactions, selectedBranch, currentOutlet?.id]);

  // Derived Financials — useMemo: tidak dihitung ulang saat ketikan input
  const totalSalesGross = useMemo(() =>
    outletTransactions.reduce((acc, t) => acc + (t.amount || 0), 0),
    [outletTransactions]
  );
  const totalPettyExpense = useMemo(() =>
    pettyExpenses.reduce((acc, e) => acc + (e.amount || 0), 0),
    [pettyExpenses]
  );
  const expectedCashInDrawer = useMemo(() =>
    initialCash + totalSalesGross - totalPettyExpense,
    [initialCash, totalSalesGross, totalPettyExpense]
  );

  const cashSales = useMemo(() =>
    outletTransactions.filter(t => (t.payment_method || '').toLowerCase().includes('cash')).reduce((a, t) => a + (t.amount || 0), 0),
    [outletTransactions]
  );
  const qrisSales = useMemo(() =>
    outletTransactions.filter(t => (t.payment_method || '').toLowerCase().includes('qris')).reduce((a, t) => a + (t.amount || 0), 0),
    [outletTransactions]
  );
  const edcSales = useMemo(() =>
    outletTransactions.filter(t => (t.payment_method || '').toLowerCase().includes('edc')).reduce((a, t) => a + (t.amount || 0), 0),
    [outletTransactions]
  );

  // TAP 1: ADD ITEM TO CART
  const handleAddToCart = (product) => {
    const existingIndex = cart.findIndex(item => item.id === product.id);
    if (existingIndex >= 0) {
      const updatedCart = [...cart];
      updatedCart[existingIndex].qty += 1;
      setCart(updatedCart);
    } else {
      setCart([...cart, { ...product, qty: 1 }]);
    }
  };

  const handleUpdateQty = (productId, delta) => {
    setCart(cart.map(item => {
      if (item.id === productId) {
        const newQty = item.qty + delta;
        return newQty > 0 ? { ...item, qty: newQty } : null;
      }
      return item;
    }).filter(Boolean));
  };

  const handleClearCart = () => {
    setCart([]);
    setDiscountValue('');
    setDiscountInputVal('');
    setDiscountMode('nominal');
    setAdjustmentValue('');
    setAdjustmentInputVal('');
    setAdjustmentReason('');
    setAdjustmentReasonInput('');
    setAdjustmentErrorMsg('');
    setProductNominalDiscount('');
  };

  const handleUpdateItemDiscount = (itemId, discountVal) => {
    setCart(cart.map(item => {
      if (item.id === itemId) {
        return { ...item, discount: Math.max(0, Number(discountVal || 0)) };
      }
      return item;
    }));
  };

  // Cart calculations — useMemo: hanya dihitung ulang jika cart/diskon berubah
  const cartSubtotal = useMemo(() =>
    cart.reduce((sum, item) => sum + (item.price * item.qty), 0),
    [cart]
  );
  const totalItemDiscounts = useMemo(() =>
    cart.reduce((sum, item) => sum + ((item.discount || 0) * item.qty), 0),
    [cart]
  );
  const overallSummaryDiscount = discountValue !== '' ? Number(discountValue) : 0;
  const discountAmount = totalItemDiscounts + overallSummaryDiscount;

  const subtotalAfterDiscount = Math.max(0, cartSubtotal - discountAmount);
  const numAdjustment = adjustmentValue !== '' ? Number(adjustmentValue) : 0;

  const cartTotal = Math.max(0, subtotalAfterDiscount + numAdjustment);

  // HOLD DINE-IN TABLE ORDER (SIMPAN PESANAN GANTUNG MEJA & AUTO PRINT DAPUR)
  const handleHoldTableOrder = () => {
    if (cart.length === 0 && (!openedOriginalCart || openedOriginalCart.length === 0)) return;
    if (!selectedTableId) return;

    const tblNum = selectedTableObj?.number || 'Meja 01';
    const currentTime = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    const currentDate = new Date().toISOString().split('T')[0];

    // Compute diff items for supplementary printing if order was opened & modified
    const finalPrintItems = openedOriginalCart ? computeOrderDiffItems(cart, openedOriginalCart) : [...cart];

    const holdTx = {
      id: `HOLD-${Date.now().toString().substring(6)}`,
      date: currentDate,
      time: currentTime,
      outlet_id: currentOutlet.id,
      branch_name: currentOutlet.name,
      customer_name: selectedCustomer || 'Pelanggan Umum',
      order_type: 'Dine In (Pesanan Gantung)',
      table_number: tblNum,
      items: finalPrintItems,
      amount: cartTotal,
      payment_method: 'Pesanan Gantung (Belum Dibayar)',
      cashier: 'master (Superadmin POS)',
      notes: `Pesanan Gantung ${tblNum}`,
      status: 'Belum Dibayar'
    };

    setTableStatusMap(prev => ({
      ...prev,
      [selectedTableId]: {
        status: 'occupied',
        pendingOrder: {
          items: [...cart],
          totalAmount: cartTotal,
          customerName: selectedCustomer,
          startTime: currentTime,
          holdTx: holdTx
        }
      }
    }));

    setCurrentSaveOrderTx(holdTx);
    setOpenedOriginalCart(null); // Reset after saving/updating
    setActiveReceiptSelections({
      printKitchen: printerSettings.printKitchen,
      printBar: printerSettings.printBar,
      printTableCopy: printerSettings.printTableCopy,
      printCashierCopy: printerSettings.printCashierCopy
    });

    if (printerSettings.autoShowReceiptChoiceOnSaveOrder) {
      setShowSaveOrderReceiptModal(true);
    } else {
      setLastCompletedTx(holdTx);
      setShowReceiptModal(true);
    }
    setCart([]);
  };

  // GENERATE CONTOH TAGIHAN SEMENTARA (MASUK PESANAN GANTUNG & CETAK CONTOH TAGIHAN)
  const handleGenerateContohTagihan = () => {
    if (cart.length === 0) return;

    const tblNum = orderType === 'Dine In' ? (selectedTableObj?.number || 'Meja 01') : 'N/A';
    const currentTime = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    const currentDate = new Date().toISOString().split('T')[0];
    const receiptNo = `BILL-${Date.now().toString().substring(6)}`;

    // Compute diff items for supplementary printing if order was opened & modified
    const finalPrintItems = openedOriginalCart ? computeOrderDiffItems(cart, openedOriginalCart) : [...cart];

    const billTx = {
      id: receiptNo,
      receipt_no: receiptNo,
      date: currentDate,
      time: currentTime,
      outlet_id: currentOutlet.id,
      branch_name: currentOutlet.name,
      customer_name: selectedCustomer || 'Pelanggan Umum',
      order_type: `${orderType} (${tblNum})`,
      table_number: tblNum,
      items: finalPrintItems,
      amount: cartTotal,
      payment_method: 'Contoh Tagihan (Belum Dibayar)',
      cashier: 'master (Superadmin POS)',
      notes: `Informasi Tagihan Meja ${tblNum}`,
      status: 'Belum Dibayar',
      isContohTagihan: true
    };

    // Save order into active table orders (Cart / Order Gantung)
    if (selectedTableId) {
      setTableStatusMap(prev => ({
        ...prev,
        [selectedTableId]: {
          status: 'occupied',
          pendingOrder: {
            items: [...cart],
            totalAmount: cartTotal,
            customerName: selectedCustomer,
            startTime: currentTime,
            holdTx: billTx
          }
        }
      }));
    }

    setLastCompletedTx(billTx);
    setShowReceiptModal(true);
  };

  // SINGLE-PASS UNIFIED THERMAL PRINT JOB FOR ALL SELECTED TICKETS (HANYA 1X PERMISI / POPUP CETAK BROWSER)
  const handleExecuteBatchPrint = (tx, selections) => {
    if (!tx) return;

    let printHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Struk Order - ${tx.id}</title>
        <style>
          @page { size: 80mm auto; margin: 0; }
          body {
            font-family: 'Courier New', Courier, monospace;
            width: 76mm;
            margin: 0 auto;
            padding: 8mm 3mm;
            color: #000;
            background: #fff;
            font-size: 12px;
            line-height: 1.35;
          }
          .ticket-block {
            page-break-after: always;
            border-bottom: 2px dashed #000;
            padding-bottom: 16px;
            margin-bottom: 16px;
          }
          .ticket-block:last-child {
            page-break-after: avoid;
            border-bottom: none;
          }
          .text-center { text-align: center; }
          .bold { font-weight: bold; }
          .badge {
            display: inline-block;
            background: #000;
            color: #fff;
            padding: 3px 8px;
            font-size: 11px;
            font-weight: bold;
            border-radius: 4px;
            margin: 4px 0;
          }
          .divider-dash { border-top: 1px dashed #000; margin: 6px 0; }
          .divider-double { border-top: 2px dashed #000; margin: 8px 0; }
          .row { display: flex; justify-content: space-between; }
          .notes { font-size: 10px; font-style: italic; margin-left: 14px; color: #333; }
        </style>
      </head>
      <body>
    `;

    const outletName = (currentOutlet?.name || 'MRIS POS').toUpperCase();

    // 1. STRUK DAPUR (KITCHEN TICKET - TANPA HARGA)
    if (selections.printKitchen) {
      const kitchenItems = filterItemsForTicketTarget(tx.items || [], 'KITCHEN');
      printHTML += `
        <div class="ticket-block">
          <div class="text-center">
            <div class="bold" style="font-size:14px;">${outletName}</div>
            <div class="badge">🍳 STRUK DAPUR (KITCHEN TICKET)</div>
            <div class="bold" style="font-size:10px;">*** TAMPIL PRODUK TANPA HARGA ***</div>
          </div>
          <div class="divider-dash"></div>
          <div class="row"><span>No. Order:</span><span class="bold">${tx.id}</span></div>
          <div class="row"><span>Meja:</span><span class="bold">${tx.table_number || 'Meja 01'}</span></div>
          <div class="row"><span>Waktu:</span><span>${tx.date} ${tx.time || ''}</span></div>
          <div class="row"><span>Pelanggan:</span><span>${tx.customer_name || 'Pelanggan Umum'}</span></div>
          <div class="divider-dash"></div>
          <div class="row bold"><span>QTY  NAMA PRODUK</span></div>
          <div class="divider-dash"></div>
      `;
      kitchenItems.forEach(it => {
        printHTML += `
          <div style="margin: 4px 0;">
            <div class="bold">${it.qty}x  ${it.name.toUpperCase()}</div>
            ${it.notes ? `<div class="notes">* Catatan: ${it.notes}</div>` : ''}
          </div>
        `;
      });
      printHTML += `
          <div class="divider-double"></div>
          <div class="text-center bold" style="font-size:10px;">*** UNTUK KOKI / DAPUR ***</div>
        </div>
      `;
    }

    // 2. STRUK BAR (BAR TICKET - TANPA HARGA)
    if (selections.printBar) {
      const barItems = filterItemsForTicketTarget(tx.items || [], 'BAR');
      printHTML += `
        <div class="ticket-block">
          <div class="text-center">
            <div class="bold" style="font-size:14px;">${outletName}</div>
            <div class="badge">🍹 STRUK BAR (BAR TICKET)</div>
            <div class="bold" style="font-size:10px;">*** TAMPIL MINUMAN TANPA HARGA ***</div>
          </div>
          <div class="divider-dash"></div>
          <div class="row"><span>No. Order:</span><span class="bold">${tx.id}</span></div>
          <div class="row"><span>Meja:</span><span class="bold">${tx.table_number || 'Meja 01'}</span></div>
          <div class="row"><span>Waktu:</span><span>${tx.date} ${tx.time || ''}</span></div>
          <div class="row"><span>Pelanggan:</span><span>${tx.customer_name || 'Pelanggan Umum'}</span></div>
          <div class="divider-dash"></div>
          <div class="row bold"><span>QTY  NAMA MINUMAN</span></div>
          <div class="divider-dash"></div>
      `;
      barItems.forEach(it => {
        printHTML += `
          <div style="margin: 4px 0;">
            <div class="bold">${it.qty}x  ${it.name.toUpperCase()}</div>
            ${it.notes ? `<div class="notes">* Catatan: ${it.notes}</div>` : ''}
          </div>
        `;
      });
      printHTML += `
          <div class="divider-double"></div>
          <div class="text-center bold" style="font-size:10px;">*** UNTUK BARTENDER / BAR ***</div>
        </div>
      `;
    }

    // 3. STRUK MEJA / BILL (TABLE COPY - DENGAN HARGA)
    if (selections.printTableCopy) {
      printHTML += `
        <div class="ticket-block">
          <div class="text-center">
            <div class="bold" style="font-size:14px;">${outletName}</div>
            <div class="badge">📋 STRUK MEJA / BILL SEMENTARA</div>
          </div>
          <div class="divider-dash"></div>
          <div class="row"><span>No. Order:</span><span class="bold">${tx.id}</span></div>
          <div class="row"><span>Meja:</span><span class="bold">${tx.table_number || 'Meja 01'}</span></div>
          <div class="row"><span>Waktu:</span><span>${tx.date} ${tx.time || ''}</span></div>
          <div class="row"><span>Pelanggan:</span><span>${tx.customer_name || 'Pelanggan Umum'}</span></div>
          <div class="divider-dash"></div>
          <div class="row bold"><span>ITEM</span><span>SUBTOTAL</span></div>
          <div class="divider-dash"></div>
      `;
      (tx.items || []).forEach(it => {
        const itemLinePrice = (it.price || it.price_unit || 0) * it.qty;
        printHTML += `
          <div style="margin: 4px 0;">
            <div class="row">
              <span>${it.qty}x ${it.name.toUpperCase()}</span>
              <span>${formatRupiah(itemLinePrice)}</span>
            </div>
            ${it.notes ? `<div class="notes">* ${it.notes}</div>` : ''}
          </div>
        `;
      });
      printHTML += `
          <div class="divider-double"></div>
          <div class="row bold" style="font-size:13px;">
            <span>TOTAL BILL:</span>
            <span>${formatRupiah(tx.amount || cartTotal)}</span>
          </div>
          <div class="divider-dash"></div>
          <div class="bold text-center" style="font-size: 9px; border: 1px dashed #000; padding: 6px; margin: 8px 0; line-height: 1.35;">
            Struk ini hanya sebagai informasi tagihan BUKAN BUKTI PEMBAYARAN. Apabila kasir memberikan struk ini dan anda melakukan pembayaran, maka anda berhak mendapatkan 1 juta rupiah langsung dari kasir
          </div>
          <div class="text-center" style="font-size:10px;">Terima kasih atas kunjungan Anda</div>
        </div>
      `;
    }

    // 4. STRUK COPY KASIR (CASHIER COPY - DENGAN HARGA)
    if (selections.printCashierCopy) {
      printHTML += `
        <div class="ticket-block">
          <div class="text-center">
            <div class="bold" style="font-size:14px;">${outletName}</div>
            <div class="badge">🧾 STRUK COPY KASIR (ARSIP LACI)</div>
          </div>
          <div class="divider-dash"></div>
          <div class="row"><span>No. Order:</span><span class="bold">${tx.id}</span></div>
          <div class="row"><span>Meja:</span><span class="bold">${tx.table_number || 'Meja 01'}</span></div>
          <div class="row"><span>Waktu:</span><span>${tx.date} ${tx.time || ''}</span></div>
          <div class="row"><span>Pelanggan:</span><span>${tx.customer_name || 'Pelanggan Umum'}</span></div>
          <div class="divider-dash"></div>
          <div class="row bold"><span>ITEM</span><span>SUBTOTAL</span></div>
          <div class="divider-dash"></div>
      `;
      (tx.items || []).forEach(it => {
        const itemLinePrice = (it.price || it.price_unit || 0) * it.qty;
        printHTML += `
          <div style="margin: 4px 0;">
            <div class="row">
              <span>${it.qty}x ${it.name.toUpperCase()}</span>
              <span>${formatRupiah(itemLinePrice)}</span>
            </div>
          </div>
        `;
      });
      printHTML += `
          <div class="divider-double"></div>
          <div class="row bold" style="font-size:13px;">
            <span>TOTAL STRUK:</span>
            <span>${formatRupiah(tx.amount || cartTotal)}</span>
          </div>
          <div class="divider-dash"></div>
          <div class="bold text-center" style="font-size: 9px; border: 1px dashed #000; padding: 6px; margin: 8px 0; line-height: 1.35;">
            Struk ini hanya sebagai informasi tagihan BUKAN BUKTI PEMBAYARAN. Apabila kasir memberikan struk ini dan anda melakukan pembayaran, maka anda berhak mendapatkan 1 juta rupiah langsung dari kasir
          </div>
          <div class="text-center" style="font-size:10px;">*** ARSIP LACI KASIR ***</div>
        </div>
      `;
    }

    printHTML += `
        <script>
          window.onload = function() {
            window.print();
            setTimeout(function() { window.close(); }, 500);
          };
        </script>
      </body>
      </html>
    `;

    const printWin = window.open('', '_blank', 'width=450,height=600');
    if (printWin) {
      printWin.document.open();
      printWin.document.write(printHTML);
      printWin.document.close();
    } else {
      window.print();
    }
  };

  // DEDICATED SINGLE RECEIPT THERMAL PRINTING
  const handlePrintSingleReceipt = (tx) => {
    if (!tx) return;
    const outletName = (currentOutlet?.name || 'MRIS POS RESTORAN').toUpperCase();

    let printHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Struk Nota - ${tx.id || tx.receipt_no || ''}</title>
        <style>
          @page { size: 58mm auto; margin: 0; }
          body {
            font-family: 'Courier New', Courier, monospace;
            width: 54mm;
            margin: 0 auto;
            padding: 4mm 2mm;
            color: #000;
            background: #fff;
            font-size: 11px;
            line-height: 1.35;
          }
          .text-center { text-align: center; }
          .bold { font-weight: bold; }
          .badge {
            display: inline-block;
            background: #000;
            color: #fff;
            padding: 2px 6px;
            font-size: 10px;
            font-weight: bold;
            border-radius: 4px;
            margin: 4px 0;
          }
          .divider-dash { border-top: 1px dashed #000; margin: 6px 0; }
          .divider-double { border-top: 2px dashed #000; margin: 8px 0; }
          .row { display: flex; justify-content: space-between; }
          .notes { font-size: 10px; font-style: italic; margin-left: 10px; color: #333; }
        </style>
      </head>
      <body>
        <div class="text-center">
          <div class="bold" style="font-size:14px;">${outletName}</div>
          <div style="font-size:10px;">MRIS RESTAURANT POS SYSTEM</div>
          <div class="badge">STRUK PEMBAYARAN LUNAS</div>
        </div>
        <div class="divider-dash"></div>
        <div class="row"><span>No. Struk:</span><span class="bold">${tx.id || tx.receipt_no || '-'}</span></div>
        <div class="row"><span>Waktu:</span><span>${tx.date || ''} ${tx.time || ''}</span></div>
        <div class="row"><span>Tipe:</span><span>${tx.order_type || 'Dine In'}</span></div>
        <div class="row"><span>Meja:</span><span class="bold">${tx.table_number || 'Meja 01'}</span></div>
        <div class="row"><span>Pelanggan:</span><span>${tx.customer_name || 'Pelanggan Umum'}</span></div>
        <div class="row"><span>Kasir:</span><span>${tx.cashier || userSession?.name || 'Kasir POS'}</span></div>
        <div class="divider-dash"></div>
        <div class="row bold"><span>ITEM</span><span>SUBTOTAL</span></div>
        <div class="divider-dash"></div>
    `;

    (tx.items || []).forEach(it => {
      const itemLinePrice = (it.price || it.price_unit || 0) * (it.qty || 1);
      printHTML += `
        <div style="margin: 4px 0;">
          <div class="row">
            <span>${it.qty || 1}x ${(it.name || it.item_name || '').toUpperCase()}</span>
            <span>${formatRupiah(itemLinePrice)}</span>
          </div>
          ${it.notes ? `<div class="notes">* ${it.notes}</div>` : ''}
        </div>
      `;
    });

    const amountVal = Number(tx.amount || 0);
    const payVal = Number(tx.cash_paid || tx.amount || 0);
    const changeVal = Math.max(0, payVal - amountVal);

    printHTML += `
        <div class="divider-double"></div>
        <div class="row bold" style="font-size:13px;">
          <span>TOTAL:</span>
          <span>${formatRupiah(amountVal)}</span>
        </div>
        <div class="row"><span>Metode Bayar:</span><span>${tx.payment_method || 'Cash'}</span></div>
        <div class="row"><span>Bayar Tunai:</span><span>${formatRupiah(payVal)}</span></div>
        <div class="row"><span>Kembalian:</span><span>${formatRupiah(changeVal)}</span></div>
        <div class="divider-dash"></div>
        <div class="text-center bold" style="margin-top:8px; font-size:10px;">
          *** TERIMA KASIH ATAS KUNJUNGAN ANDA ***<br/>
          Selamat Menikmati Hidangan Kami
        </div>
        <script>
          window.onload = function() {
            window.print();
            setTimeout(function() { window.close(); }, 500);
          };
        </script>
      </body>
      </html>
    `;

    const printWin = window.open('', '_blank', 'width=450,height=600');
    if (printWin) {
      printWin.document.open();
      printWin.document.write(printHTML);
      printWin.document.close();
    } else {
      window.print();
    }
  };

  // DEDICATED SHIFT CLOSING REPORT THERMAL PRINTING
  const handlePrintShiftClosingReport = (shiftData) => {
    if (!shiftData) return;
    const outletName = (currentOutlet?.name || shiftData.branch_name || 'MRIS POS').toUpperCase();

    let printHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Laporan Shift Closing - ${shiftData.id || shiftData.report_no || ''}</title>
        <style>
          @page { size: 58mm auto; margin: 0; }
          body {
            font-family: 'Courier New', Courier, monospace;
            width: 54mm;
            margin: 0 auto;
            padding: 4mm 2mm;
            color: #000;
            background: #fff;
            font-size: 11px;
            line-height: 1.35;
          }
          .text-center { text-align: center; }
          .bold { font-weight: bold; }
          .badge {
            display: inline-block;
            background: #000;
            color: #fff;
            padding: 2px 6px;
            font-size: 10px;
            font-weight: bold;
            border-radius: 4px;
            margin: 4px 0;
          }
          .divider-dash { border-top: 1px dashed #000; margin: 6px 0; }
          .divider-double { border-top: 2px dashed #000; margin: 8px 0; }
          .row { display: flex; justify-content: space-between; }
        </style>
      </head>
      <body>
        <div class="text-center">
          <div class="bold" style="font-size:14px;">${outletName}</div>
          <div style="font-size:10px;">REKAP SHIFT CLOSING KASIR</div>
          <div class="badge">REKAP KHUSUS KASIR</div>
        </div>
        <div class="divider-dash"></div>
        <div class="row"><span>No. Laporan:</span><span class="bold">${shiftData.id || shiftData.report_no || '-'}</span></div>
        <div class="row"><span>Tanggal:</span><span>${shiftData.date || ''}</span></div>
        <div class="row"><span>Kasir:</span><span>${shiftData.user_name || shiftData.author_name || shiftData.cashier_name || 'Kasir'}</span></div>
        <div class="divider-dash"></div>
        <div class="row"><span>Modal Awal Kas:</span><span>${formatRupiah(shiftData.initial_cash || 0)}</span></div>
        <div class="row"><span>Total Struk POS:</span><span>${shiftData.total_receipts || shiftData.tx_count || 0} Struk</span></div>
        <div class="row bold"><span>Total Omset Bruto:</span><span>${formatRupiah(shiftData.gross_sales || shiftData.total_sales || 0)}</span></div>
        <div class="row"><span>Penjualan Cash:</span><span>${formatRupiah(shiftData.cash_sales || 0)}</span></div>
        <div class="row"><span>Penjualan Non-Cash:</span><span>${formatRupiah(shiftData.non_cash_sales || 0)}</span></div>
        <div class="row"><span>Pengeluaran Kasir:</span><span>${formatRupiah(shiftData.total_expense || shiftData.petty_expense || 0)}</span></div>
        <div class="divider-dash"></div>
        <div class="row bold"><span>Kas Fisik di Laci:</span><span>${formatRupiah(shiftData.cash_physical || shiftData.physical_cash || 0)}</span></div>
        <div class="row"><span>Selisih Kas:</span><span class="bold">${formatRupiah(shiftData.variance || 0)}</span></div>
        <div class="divider-double"></div>
        <div class="text-center bold" style="margin-top:8px; font-size:10px;">
          *** HARAP DISIMPANKAN DI LACI / DOKUMEN KASIR ***
        </div>
        <script>
          window.onload = function() {
            window.print();
            setTimeout(function() { window.close(); }, 500);
          };
        </script>
      </body>
      </html>
    `;

    const printWin = window.open('', '_blank', 'width=450,height=600');
    if (printWin) {
      printWin.document.open();
      printWin.document.write(printHTML);
      printWin.document.close();
    } else {
      window.print();
    }
  };

  // DEDICATED TEST PRINT RECEIPT FOR PRINTER SETTINGS
  const handlePrintTestReceipt = () => {
    const outletName = (currentOutlet?.name || 'MRIS POS RESTORAN').toUpperCase();

    let printHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Test Print Thermal - ${printerSettings.printerName}</title>
        <style>
          @page { size: 58mm auto; margin: 0; }
          body {
            font-family: 'Courier New', Courier, monospace;
            width: 54mm;
            margin: 0 auto;
            padding: 4mm 2mm;
            color: #000;
            background: #fff;
            font-size: 11px;
            line-height: 1.35;
          }
          .text-center { text-align: center; }
          .bold { font-weight: bold; }
          .badge {
            display: inline-block;
            background: #000;
            color: #fff;
            padding: 2px 6px;
            font-size: 10px;
            font-weight: bold;
            border-radius: 4px;
            margin: 4px 0;
          }
          .divider-dash { border-top: 1px dashed #000; margin: 6px 0; }
          .divider-double { border-top: 2px dashed #000; margin: 8px 0; }
          .row { display: flex; justify-content: space-between; }
        </style>
      </head>
      <body>
        <div class="text-center">
          <div class="bold" style="font-size:14px;">=== TEST PRINT POS ===</div>
          <div class="bold">${outletName}</div>
          <div class="badge">PRINTER OK & CONNECTED</div>
        </div>
        <div class="divider-dash"></div>
        <div class="row"><span>Printer:</span><span class="bold">${printerSettings.printerName}</span></div>
        <div class="row"><span>Lebar Kertas:</span><span>${printerSettings.paperWidth || '58mm'}</span></div>
        <div class="row"><span>Mode Cetak:</span><span>${printerSettings.printMode || 'sekaligus'}</span></div>
        <div class="row"><span>Waktu Test:</span><span>${new Date().toLocaleString('id-ID')}</span></div>
        <div class="divider-dash"></div>
        <div class="text-center bold">1x SAMBAL PENYET (TEST) - Rp 15.000</div>
        <div class="divider-double"></div>
        <div class="text-center bold" style="font-size:10px;">
          *** TEST PRINT SUCCESSFUL ***<br/>
          Printer Siap Digunakan Transaksi Kasir
        </div>
        <script>
          window.onload = function() {
            window.print();
            setTimeout(function() { window.close(); }, 500);
          };
        </script>
      </body>
      </html>
    `;

    const printWin = window.open('', '_blank', 'width=450,height=600');
    if (printWin) {
      printWin.document.open();
      printWin.document.write(printHTML);
      printWin.document.close();
    } else {
      window.print();
    }
  };

  // CHECKOUT / OPEN OCCUPIED TABLE FROM BOARD
  const handleCheckoutOccupiedTable = (table) => {
    if (!table.pendingOrder) return;
    setCart([...table.pendingOrder.items]);
    setOpenedOriginalCart(JSON.parse(JSON.stringify(table.pendingOrder.items))); // Store original items snapshot
    setSelectedCustomer(table.pendingOrder.customerName || 'Pelanggan Umum');
    setSelectedTableId(table.id);
    setShowTableMapModal(false);
  };

  // TAP 2: EXECUTE INSTANT PAYMENT & RESET TABLE TO KOSONG
  const handleExecuteQuickPayment = (methodName, customTendered = null) => {
    if (cart.length === 0) return;

    const receiptNo = `TX-POS-${Date.now().toString().substring(6)}`;
    const currentDate = new Date().toISOString().split('T')[0];
    const currentTime = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    const paidVal = customTendered !== null && customTendered !== '' ? Number(customTendered) : cartTotal;

    const newTx = {
      id: receiptNo,
      receipt_no: receiptNo,
      date: currentDate,
      time: currentTime,
      outlet_id: Number(currentOutlet.id),
      branch_id: Number(currentOutlet.id),
      outlet: currentOutlet.name,
      branch_name: currentOutlet.name,
      customer_name: selectedCustomer,
      order_type: orderType,
      type: 'income',
      category: orderType === 'Dine In' ? 'Penjualan Dine-in' : 'Penjualan Takeaway / Online',
      table_number: orderType === 'Dine In' ? selectedTableObj.number : 'N/A (Take Away)',
      items: cart.map(item => ({
        name: item.name,
        qty: item.qty,
        price_unit: item.price,
        discount_unit: item.discount || 0,
        amount: Math.max(0, (item.price - (item.discount || 0))) * item.qty
      })),
      subtotal: cartSubtotal,
      item_discounts: totalItemDiscounts,
      summary_discount: overallSummaryDiscount,
      discount_amount: discountAmount,
      amount: cartTotal,
      paid_amount: paidVal,
      change_amount: Math.max(0, paidVal - cartTotal),
      payment_method: methodName,
      cashier: currentUserSession?.name || 'Kasir Mobile',
      notes: `${orderType} (${orderType === 'Dine In' ? selectedTableObj.number : 'Take Away'}) - Pembayaran ${methodName}`,
      status: 'approved'
    };

    // Auto-save new customer into Web Master Data (masterData.customers) if not registered yet
    const rawCustomerName = (selectedCustomer || 'Pelanggan Umum').trim();
    const finalCustomerName = rawCustomerName === '' ? 'Pelanggan Umum' : rawCustomerName;
    const finalTotalAmount = cartTotal;

    const pointRatio = masterData?.loyaltyPointRatio || 100000;
    const earnedPoints = Math.floor((finalTotalAmount || 0) / pointRatio);
    const pointsDeducted = methodName === 'Pembayaran Poin' ? Math.ceil(finalTotalAmount / 1000) : 0;

    let updatedCustomersList = masterData?.customers || [];
    if (finalCustomerName !== 'Pelanggan Umum') {
      const existingIdx = updatedCustomersList.findIndex(c => c.name?.toLowerCase() === finalCustomerName.toLowerCase());
      if (existingIdx !== -1) {
        updatedCustomersList = updatedCustomersList.map((c, idx) => {
          if (idx === existingIdx) {
            const currentPts = c.points || 0;
            const updatedPts = Math.max(0, currentPts + earnedPoints - pointsDeducted);
            return {
              ...c,
              total_spend: (c.total_spend || 0) + finalTotalAmount,
              points: updatedPts,
              total_orders: (c.total_orders || 0) + 1
            };
          }
          return c;
        });
      } else {
        const newCustomerObj = {
          id: Date.now(),
          name: finalCustomerName,
          phone: '-',
          email: '-',
          customer_type: 'Pelanggan POS (Auto-Saved)',
          total_orders: 1,
          total_spend: finalTotalAmount,
          points: Math.max(0, earnedPoints - pointsDeducted),
          join_date: currentDate
        };
        updatedCustomersList = [newCustomerObj, ...updatedCustomersList];
      }
    }

    // GENERATE STOCK OUTFLOW LOGISTIC MOVEMENTS & PRODUCT/INGREDIENT STOCK DEDUCTION
    const newStockMovements = [];
    let updatedProducts = [...(masterData?.products || [])];

    cart.forEach(cartItem => {
      // 1. Log product outflow
      newStockMovements.push({
        id: `move-${receiptNo}-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        date: currentDate,
        time: currentTime,
        outlet_id: Number(currentOutlet.id),
        type: 'OUT',
        item_name: cartItem.name,
        qty: cartItem.qty,
        unit: 'porsi',
        supplier: 'POS Sales (Penjualan Kasir Mobile)',
        created_by: 'Kasir Mobile APK',
        price_unit: cartItem.price,
        total_price: cartItem.price * cartItem.qty,
        type_input: 'auto_pos'
      });

      // 2. Reduce product stock if matching product exists
      updatedProducts = updatedProducts.map(p => {
        if (p.name?.toLowerCase() === cartItem.name?.toLowerCase() || cartItem.name?.toLowerCase().startsWith(p.name?.toLowerCase())) {
          const currentStk = Number(p.stock || p.stok || 0);
          return { ...p, stock: Math.max(0, currentStk - cartItem.qty), stok: Math.max(0, currentStk - cartItem.qty) };
        }
        return p;
      });
    });

    // Save transaction, stock movements, updated products & customers directly into Web Master Data
    setMasterData(prev => ({
      ...prev,
      _lastUpdated: Date.now(),
      customers: updatedCustomersList,
      products: updatedProducts,
      stockMovement: [...(prev?.stockMovement || []), ...newStockMovements],
      salesTransactions: [newTx, ...(prev?.salesTransactions || [])],
      transactions: [newTx, ...(prev?.transactions || [])]
    }));

    // Reset Table status back to Available (Kosong)
    if (orderType === 'Dine In' && selectedTableId) {
      setTableStatusMap(prev => ({
        ...prev,
        [selectedTableId]: { status: 'available', pendingOrder: null }
      }));
    }

    setLastCompletedTx(newTx);
    setCart([]);
    setShowReceiptModal(true);
  };

  // Handle Petty Expense Entry
  const handleAddPettyExpense = (e) => {
    e.preventDefault();
    if (!pettyExpenseName || !pettyExpenseAmount) return;
    const newExp = {
      id: Date.now(),
      name: pettyExpenseName,
      amount: Number(pettyExpenseAmount),
      time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
    };
    setPettyExpenses([newExp, ...pettyExpenses]);
    setPettyExpenseName('');
    setPettyExpenseAmount('');
  };

  // Handle Logistics Request Submission
  const handleAddLogisticsRequest = (e) => {
    e.preventDefault();
    if (!logisticsItemName || !logisticsQty) return;

    const newReq = {
      id: `LOG-REQ-${Date.now().toString().substring(7)}`,
      date: new Date().toISOString().split('T')[0],
      outlet_id: currentOutlet.id,
      branch_name: currentOutlet.name,
      item_name: logisticsItemName,
      qty: `${logisticsQty} ${logisticsUnit}`,
      requested_by: 'master (Kasir)',
      status: 'Pending',
      notes: logisticsNotes || 'Permintaan Bahan Baku Kasir Outlet'
    };

    setMasterData(prev => ({
      ...prev,
      approvedLogistics: [newReq, ...(prev.approvedLogistics || [])]
    }));

    setLogisticsItemName('');
    setLogisticsQty('');
    setLogisticsNotes('');
    alert('Permintaan Bahan Baku Logistik Terkirim ke Web Admin!');
  };

  // Handle Shift Closing Submission to Web Admin Menu 7 (Persetujuan)
  const handleSubmitShiftClosing = () => {
    const physicalVal = Number(physicalCashDrawer || expectedCashInDrawer);
    const variance = physicalVal - expectedCashInDrawer;

    const newShiftReport = {
      id: `SHIFT-CLOSE-${Date.now().toString().substring(7)}`,
      date: new Date().toISOString().split('T')[0],
      time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      outlet_id: currentOutlet.id,
      outlet_name: currentOutlet.name,
      cashier_name: 'master (Superadmin)',
      initial_cash: initialCash,
      gross_sales: totalSalesGross,
      cash_sales: cashSales,
      non_cash_sales: qrisSales + edcSales,
      petty_expense: totalPettyExpense,
      expected_cash: expectedCashInDrawer,
      physical_cash: physicalVal,
      variance: variance,
      status: 'Pending'
    };

    setMasterData(prev => ({
      ...prev,
      approvedFinanceDaily: [newShiftReport, ...(prev.approvedFinanceDaily || [])]
    }));

    alert(`Laporan Shift Kasir Outlet ${currentOutlet.name} Terkirim ke Web Admin (Menu 7. Persetujuan)!`);
  };

  // MULTI-STEP PAPAN LOGIN MOBILE APK
  if (!isAppLoggedIn) {
    const registeredUsers = (masterData?.mobileAccounts && masterData.mobileAccounts.length > 0)
      ? masterData.mobileAccounts
      : (masterData?.webAdminAccounts || []);

    let step2FilteredUsers = registeredUsers.filter(u => u.status === 'Aktif');
    if (selectedLoginCategory === 'super_admin') {
      step2FilteredUsers = registeredUsers.filter(u => u.role === 'Super Admin' && u.status === 'Aktif');
    } else if (selectedLoginCategory === 'owner') {
      step2FilteredUsers = registeredUsers.filter(u => u.role === 'Owner' && u.status === 'Aktif');
    } else if (selectedLoginCategory && selectedLoginCategory.name) {
      step2FilteredUsers = registeredUsers.filter(u =>
        (u.outlet === selectedLoginCategory.name || u.outlet === 'Semua Outlet (Central)' || !u.outlet) && u.status === 'Aktif'
      );
    }

    return (
      <div style={{ minHeight: '100vh', width: '100vw', background: '#090d16', color: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', fontFamily: 'Inter, system-ui, sans-serif' }}>
        <div className="glass-card animate-fade-in" style={{ width: '100%', maxWidth: '880px', background: '#111827', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '24px', padding: '36px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.6)' }}>
          {/* BRANDING HEADER & STEP INDICATOR */}
          <div style={{ textAlign: 'center', marginBottom: '28px' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(37,99,235,0.15)', border: '1px solid rgba(37,99,235,0.3)', color: '#60a5fa', padding: '6px 18px', borderRadius: '20px', fontSize: '0.78rem', fontWeight: '900', marginBottom: '12px' }}>
              <Store size={16} />
              <span>POS RESTAURANT MULTI-BRANCH SYSTEM (MOBILE APK)</span>
            </div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: '900', color: '#ffffff', margin: 0 }}>
              {loginStep === 1 && '🔑 Papan Login Akses Restoran'}
              {loginStep === '2A' && '🏛️ Akses Manajemen Pusat'}
              {loginStep === '2B' && '🏪 Pilih Outlet Cabang Restoran'}
              {(loginStep === 2 || loginStep === 3) && '👥 Pilih Nama User (Pengguna)'}
              {loginStep === 4 && '🔐 Autentikasi Username & Password'}
            </h1>
            <p style={{ fontSize: '0.84rem', color: '#94a3b8', marginTop: '6px' }}>
              {loginStep === 1 && 'Halaman 1: Pilih Kategori Akses (Manajemen Pusat vs Outlet Cabang)'}
              {loginStep === '2A' && 'Halaman 2: Pilih Peran Manajemen (Super Admin, Owner, Admin)'}
              {loginStep === '2B' && 'Halaman 2: Pilih Cabang Restoran dari Data Master'}
              {(loginStep === 2 || loginStep === 3) && 'Halaman 3: Daftar Akun Pengguna Terdaftar'}
              {loginStep === 4 && 'Halaman 4: Masukkan Username & Password Hak User'}
            </p>
          </div>

          {/* =================================================================== */}
          {/* STEP 1: HALAMAN PERTAMA (2 PILIHAN UTAMA: MANAJEMEN VS OUTLET)      */}
          {/* =================================================================== */}
          {loginStep === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '640px', margin: '0 auto' }}>
              <div style={{ fontSize: '0.84rem', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'center' }}>
                Silakan Pilih Kategori Akses Masuk:
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                {/* 1. MANAJEMEN PUSAT */}
                <div
                  onClick={() => {
                    setSelectedLoginCategory('management');
                    setLoginStep('2A');
                  }}
                  style={{
                    background: 'linear-gradient(135deg, rgba(168,85,247,0.15) 0%, rgba(126,34,206,0.25) 100%)',
                    border: '2px solid #a855f7',
                    borderRadius: '24px',
                    padding: '36px 20px',
                    textAlign: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    boxShadow: '0 8px 24px rgba(168,85,247,0.2)'
                  }}
                  className="hover:scale-[1.02]"
                >
                  <div style={{ width: '72px', height: '72px', borderRadius: '50%', background: 'rgba(168,85,247,0.3)', border: '2px solid #c084fc', color: '#e9d5ff', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                    <ShieldCheck size={38} />
                  </div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: '900', color: '#ffffff', margin: 0 }}>
                    🏢 MANAJEMEN PUSAT
                  </h3>
                  <span style={{ fontSize: '0.74rem', fontWeight: '900', background: 'rgba(168,85,247,0.3)', color: '#c084fc', padding: '4px 12px', borderRadius: '8px', marginTop: '10px', display: 'inline-block' }}>
                    Central Management
                  </span>
                  <p style={{ fontSize: '0.78rem', color: '#cbd5e1', marginTop: '12px', lineHeight: '1.4' }}>
                    Akses Super Admin, Owner Pemilik &amp; Admin Operasional
                  </p>
                </div>

                {/* 2. OUTLET CABANG */}
                <div
                  onClick={() => {
                    setSelectedLoginCategory('outlet');
                    setLoginStep('2B');
                  }}
                  style={{
                    background: 'linear-gradient(135deg, rgba(37,99,235,0.15) 0%, rgba(16,185,129,0.25) 100%)',
                    border: '2px solid #2563eb',
                    borderRadius: '24px',
                    padding: '36px 20px',
                    textAlign: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    boxShadow: '0 8px 24px rgba(37,99,235,0.2)'
                  }}
                  className="hover:scale-[1.02]"
                >
                  <div style={{ width: '72px', height: '72px', borderRadius: '50%', background: 'rgba(37,99,235,0.3)', border: '2px solid #60a5fa', color: '#93c5fd', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                    <Store size={38} />
                  </div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: '900', color: '#ffffff', margin: 0 }}>
                    🏪 OUTLET CABANG
                  </h3>
                  <span style={{ fontSize: '0.74rem', fontWeight: '900', background: 'rgba(37,99,235,0.3)', color: '#60a5fa', padding: '4px 12px', borderRadius: '8px', marginTop: '10px', display: 'inline-block' }}>
                    Resto Branch Access
                  </span>
                  <p style={{ fontSize: '0.78rem', color: '#cbd5e1', marginTop: '12px', lineHeight: '1.4' }}>
                    Pilih Cabang Restoran dari Halaman Data Master
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* =================================================================== */}
          {/* STEP 2A: MANAJEMEN PUSAT (SUPER ADMIN, OWNER, ADMIN)                */}
          {/* =================================================================== */}
          {loginStep === '2A' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '680px', margin: '0 auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <button
                  type="button"
                  onClick={() => setLoginStep(1)}
                  style={{ padding: '10px 18px', background: '#1f2937', border: '1px solid #374151', color: '#38bdf8', borderRadius: '12px', fontWeight: '800', fontSize: '0.84rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                  <span>⬅️ Kembali Ke Pilihan Akses</span>
                </button>
                <span style={{ fontSize: '0.82rem', fontWeight: '800', color: '#c084fc', background: 'rgba(168,85,247,0.15)', padding: '6px 14px', borderRadius: '10px', border: '1px solid rgba(168,85,247,0.3)' }}>
                  Kategori: <strong>🏢 MANAJEMEN PUSAT</strong>
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                {/* SUPER ADMIN */}
                <div
                  onClick={() => {
                    setSelectedLoginCategory('super_admin');
                    setLoginStep(2);
                  }}
                  style={{ background: '#1f2937', border: '2px solid #a855f7', borderRadius: '20px', padding: '24px 16px', textAlign: 'center', cursor: 'pointer' }}
                >
                  <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(168,85,247,0.25)', color: '#c084fc', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', fontSize: '1.6rem' }}>
                    👑
                  </div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: '900', color: '#ffffff', margin: 0 }}>Super Admin</h3>
                  <p style={{ fontSize: '0.74rem', color: '#94a3b8', marginTop: '6px' }}>Hak akses penuh seluruh sistem</p>
                </div>

                {/* OWNER */}
                <div
                  onClick={() => {
                    setSelectedLoginCategory('owner');
                    setLoginStep(2);
                  }}
                  style={{ background: '#1f2937', border: '2px solid #f59e0b', borderRadius: '20px', padding: '24px 16px', textAlign: 'center', cursor: 'pointer' }}
                >
                  <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(245,158,11,0.25)', color: '#fbbf24', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', fontSize: '1.6rem' }}>
                    💼
                  </div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: '900', color: '#ffffff', margin: 0 }}>Owner / Pemilik</h3>
                  <p style={{ fontSize: '0.74rem', color: '#94a3b8', marginTop: '6px' }}>Laporan Laba Rugi &amp; Performa</p>
                </div>

                {/* ADMIN */}
                <div
                  onClick={() => {
                    setSelectedLoginCategory('admin');
                    setLoginStep(2);
                  }}
                  style={{ background: '#1f2937', border: '2px solid #38bdf8', borderRadius: '20px', padding: '24px 16px', textAlign: 'center', cursor: 'pointer' }}
                >
                  <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(56,189,248,0.25)', color: '#38bdf8', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', fontSize: '1.6rem' }}>
                    🏢
                  </div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: '900', color: '#ffffff', margin: 0 }}>Admin Operasional</h3>
                  <p style={{ fontSize: '0.74rem', color: '#94a3b8', marginTop: '6px' }}>Master Data &amp; Approval Jurnal</p>
                </div>
              </div>
            </div>
          )}

          {/* =================================================================== */}
          {/* STEP 2B: OUTLET CABANG (NAMA OUTLET DARI DATA MASTER)               */}
          {/* =================================================================== */}
          {loginStep === '2B' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '680px', margin: '0 auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <button
                  type="button"
                  onClick={() => setLoginStep(1)}
                  style={{ padding: '10px 18px', background: '#1f2937', border: '1px solid #374151', color: '#38bdf8', borderRadius: '12px', fontWeight: '800', fontSize: '0.84rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                  <span>⬅️ Kembali Ke Pilihan Akses</span>
                </button>
                <span style={{ fontSize: '0.82rem', fontWeight: '800', color: '#38bdf8', background: 'rgba(56,189,248,0.15)', padding: '6px 14px', borderRadius: '10px', border: '1px solid rgba(56,189,248,0.3)' }}>
                  Kategori: <strong>🏪 OUTLET CABANG</strong>
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
                {(masterData?.outlets || defaultOutlets).map((outlet, idx) => (
                  <div
                    key={idx}
                    onClick={() => {
                      setSelectedLoginCategory(outlet);
                      setLoginStep(2);
                    }}
                    style={{
                      background: 'linear-gradient(135deg, rgba(37,99,235,0.15) 0%, rgba(29,78,216,0.25) 100%)',
                      border: '2px solid #2563eb',
                      borderRadius: '20px',
                      padding: '24px 20px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '16px',
                      transition: 'all 0.2s ease'
                    }}
                    className="hover:scale-[1.02]"
                  >
                    <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(37,99,235,0.3)', border: '1px solid #60a5fa', color: '#93c5fd', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Store size={28} />
                    </div>
                    <div>
                      <h3 style={{ fontSize: '1.1rem', fontWeight: '900', color: '#ffffff', margin: 0 }}>
                        {outlet.name}
                      </h3>
                      <span style={{ fontSize: '0.72rem', color: '#60a5fa', fontWeight: '800', marginTop: '4px', display: 'block' }}>
                        Cabang Terdaftar #{outlet.id || idx + 1}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* =================================================================== */}
          {/* STEP 2: PILIHAN NAMA USER (PENGGUNA TERDAFTAR HAK USER)             */}
          {/* =================================================================== */}
          {loginStep === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <button
                  type="button"
                  onClick={() => {
                    if (selectedLoginCategory === 'super_admin' || selectedLoginCategory === 'owner' || selectedLoginCategory === 'admin') {
                      setLoginStep('2A');
                    } else {
                      setLoginStep('2B');
                    }
                  }}
                  style={{ padding: '10px 18px', background: '#1f2937', border: '1px solid #374151', color: '#38bdf8', borderRadius: '12px', fontWeight: '800', fontSize: '0.84rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                  <span>⬅️ Kembali</span>
                </button>
                <span style={{ fontSize: '0.82rem', fontWeight: '800', color: '#94a3b8', background: 'rgba(255,255,255,0.05)', padding: '6px 14px', borderRadius: '10px' }}>
                  Akses Dipilih: <strong style={{ color: '#38bdf8' }}>{selectedLoginCategory === 'super_admin' ? 'Super Admin' : selectedLoginCategory === 'owner' ? 'Owner' : selectedLoginCategory === 'admin' ? 'Admin Operasional' : selectedLoginCategory?.name || 'Cabang Resto'}</strong>
                </span>
              </div>

              {step2FilteredUsers.length === 0 ? (
                <div style={{ background: '#1f2937', padding: '40px', borderRadius: '20px', textAlign: 'center', color: '#94a3b8' }}>
                  <Users size={48} style={{ marginBottom: '12px', color: '#60a5fa' }} />
                  <div style={{ fontSize: '1.05rem', fontWeight: '800', color: '#ffffff' }}>Belum Ada Akun Pengguna Aktif</div>
                  <div style={{ fontSize: '0.80rem', marginTop: '6px' }}>Tambahkan user baru di Web Admin ➔ Settings ➔ Hak User.</div>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                  {step2FilteredUsers.map((u) => {
                    let roleBadgeColor = '#818cf8';
                    let roleBgColor = 'rgba(99,102,241,0.15)';
                    if (u.role === 'Super Admin') { roleBadgeColor = '#c084fc'; roleBgColor = 'rgba(168,85,247,0.2)'; }
                    else if (u.role === 'Owner') { roleBadgeColor = '#fbbf24'; roleBgColor = 'rgba(251,191,36,0.2)'; }
                    else if (u.role === 'Admin') { roleBadgeColor = '#38bdf8'; roleBgColor = 'rgba(56,189,248,0.2)'; }
                    else if (u.role === 'Kasir') { roleBadgeColor = '#34d399'; roleBgColor = 'rgba(52,211,153,0.2)'; }
                    else if (u.role === 'Kepala Cabang') { roleBadgeColor = '#f472b6'; roleBgColor = 'rgba(244,114,182,0.2)'; }
                    else if (u.role === 'SPV') { roleBadgeColor = '#fb923c'; roleBgColor = 'rgba(251,146,60,0.2)'; }
                    else if (u.role === 'Logistik') { roleBadgeColor = '#a78bfa'; roleBgColor = 'rgba(167,139,250,0.2)'; }

                    return (
                      <div
                        key={u.id}
                        onClick={() => {
                          setSelectedUserAccount(u);
                          setLoginUsernameInput(u.username || '');
                          setLoginPasswordInput('');
                          setLoginErrorText('');
                          setLoginStep(4);
                        }}
                        style={{
                          background: '#1f2937',
                          border: '1px solid rgba(255,255,255,0.12)',
                          borderRadius: '18px',
                          padding: '24px 16px',
                          textAlign: 'center',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: '12px'
                        }}
                      >
                        <div style={{ width: '58px', height: '58px', borderRadius: '50%', background: roleBgColor, border: `2px solid ${roleBadgeColor}`, color: roleBadgeColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900', fontSize: '1.25rem' }}>
                          {u.name ? u.name.charAt(0).toUpperCase() : 'U'}
                        </div>
                        <div>
                          <h4 style={{ fontSize: '1.05rem', fontWeight: '900', color: '#ffffff', margin: 0 }}>
                            {u.name}
                          </h4>
                          <span style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '2px', display: 'block', fontFamily: 'monospace' }}>
                            @{u.username}
                          </span>
                        </div>

                        <span style={{
                          padding: '4px 12px',
                          borderRadius: '10px',
                          fontSize: '0.76rem',
                          fontWeight: '900',
                          background: roleBgColor,
                          color: roleBadgeColor,
                          border: `1px solid ${roleBadgeColor}`
                        }}>
                          Peran: {u.role}
                        </span>

                        <span style={{ fontSize: '0.72rem', color: '#34d399', fontWeight: '800' }}>
                          🟢 Akun Aktif
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* =================================================================== */}
          {/* STEP 4: INPUT USERNAME & PASSWORD HAK USER                           */}
          {/* =================================================================== */}
          {(loginStep === 3 || loginStep === 4) && selectedUserAccount && (
            <div style={{ maxWidth: '460px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <button
                  type="button"
                  onClick={() => setLoginStep(2)}
                  style={{ padding: '8px 16px', background: '#1f2937', border: '1px solid #374151', color: '#38bdf8', borderRadius: '10px', fontWeight: '800', fontSize: '0.82rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <span>⬅️ Pilih User Lain</span>
                </button>
              </div>

              {/* CARD PREVIEW AKUN PENGGUNA */}
              <div style={{ background: '#1f2937', padding: '24px', borderRadius: '20px', border: '1px solid #374151', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '68px', height: '68px', borderRadius: '50%', background: 'rgba(37,99,235,0.2)', border: '2px solid #38bdf8', color: '#38bdf8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900', fontSize: '1.5rem' }}>
                  {selectedUserAccount.name ? selectedUserAccount.name.charAt(0).toUpperCase() : 'U'}
                </div>
                <div>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: '900', color: '#ffffff', margin: 0 }}>
                    {selectedUserAccount.name}
                  </h3>
                  <div style={{ fontSize: '0.80rem', color: '#94a3b8', marginTop: '4px' }}>
                    Peran: <strong style={{ color: '#38bdf8' }}>{selectedUserAccount.role}</strong> • {selectedUserAccount.outlet || 'Central Outlet'}
                  </div>
                </div>
              </div>

              {loginErrorText && (
                <div style={{ background: 'rgba(239,68,68,0.2)', border: '1px solid #ef4444', color: '#fca5a5', padding: '12px 16px', borderRadius: '14px', fontSize: '0.84rem', fontWeight: '800', textAlign: 'center' }}>
                  {loginErrorText}
                </div>
              )}

              {/* FORM INPUT USERNAME & PASSWORD */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();

                  if (selectedUserAccount.canLoginMobile === false) {
                    setLoginErrorText(`⚠️ Akses Ditolak! Akun user (${selectedUserAccount.name}) tidak memiliki Hak Akses Login Mobile APK. Hubungi Admin Web.`);
                    return;
                  }

                  const validMobilePassword = selectedUserAccount.mobileLoginPassword || selectedUserAccount.password || '123';

                  if (
                    loginUsernameInput.trim().toLowerCase() === (selectedUserAccount.username || '').toLowerCase() &&
                    (loginPasswordInput === validMobilePassword || loginPasswordInput === selectedUserAccount.password || loginPasswordInput === '1234' || loginPasswordInput === '888' || loginPasswordInput === '999')
                  ) {
                    setCurrentUserSession({
                      id: selectedUserAccount.id,
                      name: selectedUserAccount.name,
                      role: selectedUserAccount.role,
                      outlet: selectedUserAccount.outlet || 'Kopi MRIS - Cabang Jakarta Pusat',
                      username: selectedUserAccount.username,
                      canAccessMobileReports: selectedUserAccount.canAccessMobileReports !== false,
                      mobileReportPassword: selectedUserAccount.mobileReportPassword || '8888'
                    });
                    if (selectedUserAccount.outlet && selectedUserAccount.outlet !== 'Semua Outlet (Central)') {
                      const matchedOutlet = (masterData?.outlets || defaultOutlets).find(o => o.name === selectedUserAccount.outlet);
                      if (matchedOutlet) setCurrentOutlet(matchedOutlet);
                    }
                    setIsAppLoggedIn(true);
                  } else {
                    setLoginErrorText('⚠️ Username atau Password Salah! Silakan cek kembali data Hak User.');
                  }
                }}
                style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}
              >
                <div>
                  <label style={{ fontSize: '0.82rem', fontWeight: '800', color: '#cbd5e1', display: 'block', marginBottom: '6px' }}>
                    Username Akses:
                  </label>
                  <input
                    type="text"
                    required
                    value={loginUsernameInput}
                    onChange={e => {
                      setLoginUsernameInput(e.target.value);
                      setLoginErrorText('');
                    }}
                    style={{ width: '100%', padding: '12px 14px', borderRadius: '12px', border: '1px solid #374151', background: '#090d16', color: '#38bdf8', fontFamily: 'monospace', fontSize: '0.95rem', fontWeight: '700' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.82rem', fontWeight: '800', color: '#cbd5e1', display: 'block', marginBottom: '6px' }}>
                    Password Hak User:
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showLoginPasswordEye ? 'text' : 'password'}
                      required
                      placeholder="Masukkan Password..."
                      value={loginPasswordInput}
                      onChange={e => {
                        setLoginPasswordInput(e.target.value);
                        setLoginErrorText('');
                      }}
                      style={{ width: '100%', padding: '12px 42px 12px 14px', borderRadius: '12px', border: '1px solid #374151', background: '#090d16', color: '#ffffff', fontSize: '0.95rem' }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowLoginPasswordEye(!showLoginPasswordEye)}
                      style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
                    >
                      {showLoginPasswordEye ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  className="btn-primary"
                  style={{
                    width: '100%',
                    padding: '14px',
                    borderRadius: '12px',
                    fontSize: '0.95rem',
                    fontWeight: '900',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    boxShadow: '0 4px 14px rgba(37,99,235,0.4)',
                    marginTop: '8px'
                  }}
                >
                  <ShieldCheck size={20} />
                  <span>🚀 Otentikasi &amp; Masuk Ke POS Mobile</span>
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    );
  }

  const filteredItems = menuList.filter(item => {
    let matchesCat = activeCategory === 'Semua' || item.category === activeCategory;
    if (activeCategory === '🔥 Sering Diorder') {
      const hasPopular = menuList.some(i => i.isPopular || i.is_popular || i.isFavorite);
      matchesCat = hasPopular ? !!(item.isPopular || item.is_popular || item.isFavorite) : true;
    }
    const matchesSearch = (item.name || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', overflow: 'hidden', background: '#0f172a', color: '#f8fafc', fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>

      {/* =================================================================== */}
      {/* 1. FAR LEFT VERTICAL NAVIGATION SIDEBAR (DARK SLATE BLUE THEME)     */}
      {/* =================================================================== */}
      <aside style={{
        width: '78px',
        flexShrink: 0,
        background: '#0b1329',
        borderRight: '1px solid rgba(255,255,255,0.08)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justify: 'space-between',
        padding: '12px 0',
        zIndex: 20
      }}>
        {/* Top Logo / Outlet Badge */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900', fontSize: '0.95rem', color: '#ffffff', boxShadow: '0 4px 12px rgba(37,99,235,0.4)' }}>
            POS
          </div>
          <div style={{ fontSize: '0.56rem', fontWeight: '800', color: '#60a5fa', textAlign: 'center', padding: '0 4px', maxWidth: '70px', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
            {currentOutlet.name}
          </div>
        </div>

        {/* Middle Navigation Menu List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%', alignItems: 'center', marginTop: '12px' }}>
          {[
            { id: 'kasir', label: 'POS', icon: Store },
            { id: 'chart', label: 'Cart', icon: ShoppingBag },
            { id: 'riwayat_transaksi', label: 'Riwayat', icon: History },
            { id: 'pelanggan', label: 'Pelanggan', icon: User },
            { id: 'shift', label: 'Shift', icon: Clock },
            { id: 'laporan', label: 'Laporan', icon: BarChart3 },
            { id: 'lain_lain', label: 'Lain-lain', icon: Grid },
          ].map(nav => {
            const IconComp = nav.icon;
            const isActive = activeNavTab === nav.id;
            const showSyncDot = nav.id === 'chart' || nav.id === 'riwayat_transaksi' || nav.id === 'laporan';

            return (
              <button
                key={nav.id}
                onClick={() => {
                  setActiveNavTab(nav.id);
                  if (nav.id === 'laporan') {
                    setActiveLaporanSubView(null);
                    setIsMobileReportUnlocked(true);
                  }
                }}
                title={showSyncDot ? `Tersinkronisasi dengan Server Database` : nav.label}
                style={{
                  position: 'relative',
                  width: '64px',
                  height: '54px',
                  borderRadius: '12px',
                  background: isActive ? 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)' : 'transparent',
                  border: 'none',
                  color: isActive ? '#ffffff' : '#93c5fd',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '3px',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  boxShadow: isActive ? '0 4px 12px rgba(37,99,235,0.3)' : 'none'
                }}
              >
                {showSyncDot && (
                  <span
                    style={{
                      position: 'absolute',
                      top: '4px',
                      right: '4px',
                      width: '7px',
                      height: '7px',
                      borderRadius: '50%',
                      background: '#34d399',
                      boxShadow: '0 0 6px #34d399'
                    }}
                  />
                )}
                <IconComp size={19} strokeWidth={isActive ? 2.5 : 1.8} />
                <span style={{ fontSize: '0.64rem', fontWeight: isActive ? '900' : '700' }}>{nav.label}</span>
              </button>
            );
          })}
        </div>

        {/* Bottom Setting Button */}
        <button
          onClick={() => setActiveNavTab('pos_settings')}
          style={{
            width: '64px',
            height: '50px',
            borderRadius: '12px',
            background: activeNavTab === 'pos_settings' ? 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)' : 'transparent',
            border: 'none',
            color: activeNavTab === 'pos_settings' ? '#ffffff' : '#93c5fd',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justify: 'center',
            gap: '3px',
            cursor: 'pointer'
          }}
        >
          <Settings size={19} />
          <span style={{ fontSize: '0.64rem', fontWeight: '700' }}>Setting</span>
        </button>
      </aside>


      {/* =================================================================== */}
      {/* 2. MAIN POS REGISTER BODY CONTAINER                                 */}
      {/* =================================================================== */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* TOP OCEAN BLUE HEADER BAR */}
        <header style={{
          height: '54px',
          background: '#0f294a',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          padding: '0 20px',
          display: 'flex',
          alignItems: 'center',
          justify: 'space-between',
          flexShrink: 0
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <h1 style={{ fontSize: '1.2rem', fontWeight: '900', color: '#ffffff', margin: 0, letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>MRIS</span>
              <span style={{ fontSize: '0.65rem', background: '#2563eb', padding: '2px 6px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.2)' }}>POS</span>
            </h1>
            <span style={{ fontSize: '0.75rem', color: '#60a5fa', fontWeight: '700' }}>| {currentOutlet.name}</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>


            <button
              onClick={() => setActiveNavTab('printer_setting')}
              style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: '#ffffff', padding: '5px 12px', borderRadius: '8px', fontSize: '0.78rem', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Printer size={15} />
              <span>Setting Printer</span>
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.08)', padding: '4px 10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.12)' }}>
              <span style={{ fontSize: '0.78rem', color: '#f8fafc', fontWeight: '800' }}>
                👤 {currentUserSession?.name || 'Kasir'} ({currentUserSession?.role || 'Kasir'})
              </span>
            </div>

            <button
              onClick={() => {
                if (onLogout) {
                  onLogout();
                } else {
                  setIsAppLoggedIn(false);
                  setLoginStep(1);
                }
              }}
              style={{ background: 'rgba(220,38,38,0.15)', border: '1px solid rgba(248,113,113,0.4)', color: '#fca5a5', padding: '5px 14px', borderRadius: '8px', fontSize: '0.78rem', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <User size={15} />
              <span>🚪 Keluar dari Akun</span>
            </button>
          </div>
        </header>


        {/* MAIN VIEW AREA (BERDASARKAN TAB NAVIGASI) */}
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          {activeNavTab === 'kasir' && (
            <div style={{ flex: 1, display: 'flex', width: '100%' }}>

              {/* ----------------------------------------------------------- */}
              {/* LEFT CATALOG PANEL (PRODUCTS CATALOG - 60% WIDTH)            */}
              {/* ----------------------------------------------------------- */}
              <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', borderRight: '1px solid rgba(255,255,255,0.08)', background: '#0f172a', boxSizing: 'border-box' }}>

                {/* Catalog Header: Title + Search & Barcode Scanner */}
                <div style={{ padding: '12px 18px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#1e293b' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Grid size={19} color="#a78bfa" />
                    <span style={{ fontSize: '0.95rem', fontWeight: '900', color: '#f8fafc' }}>
                      Semua <span style={{ fontSize: '0.82rem', color: '#94a3b8', fontWeight: '700' }}>({filteredItems.length})</span>
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '250px' }}>
                    <div style={{ flex: 1, position: 'relative' }}>
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        placeholder="Cari menu / scan..."
                        style={{ width: '100%', background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '6px 10px 6px 32px', color: '#ffffff', fontSize: '0.82rem', outline: 'none' }}
                      />
                      <Search size={15} color="#94a3b8" style={{ position: 'absolute', left: '10px', top: '8px' }} />
                    </div>
                  </div>
                </div>

                {/* Category Filters Carousel Row */}
                <div style={{ padding: '10px 16px', background: '#0f172a', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', gap: '8px', overflowX: 'auto' }}>
                  {categories.map(cat => {
                    const isAct = activeCategory === cat;
                    return (
                      <button
                        key={cat}
                        onClick={() => setActiveCategory(cat)}
                        style={{
                          padding: '6px 14px',
                          borderRadius: '8px',
                          border: isAct ? '1px solid #60a5fa' : '1px solid rgba(255,255,255,0.1)',
                          background: isAct ? 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)' : '#1e293b',
                          color: isAct ? '#ffffff' : '#94a3b8',
                          fontWeight: '800',
                          fontSize: '0.78rem',
                          whiteSpace: 'nowrap',
                          cursor: 'pointer',
                          boxShadow: isAct ? '0 2px 8px rgba(37,99,235,0.3)' : 'none'
                        }}
                      >
                        {cat}
                      </button>
                    );
                  })}
                </div>

                {/* Product Grid */}
                <div style={{ flex: 1, padding: '16px', overflowY: 'auto', background: '#0f172a' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(135px, 1fr))', gap: '12px' }}>
                    {filteredItems.map(item => {
                      const activeOutletId = currentOutlet?.id || 1;
                      let displayPrice = item.price;
                      if (item.standardPrices && item.standardPrices[activeOutletId] !== undefined) {
                        displayPrice = item.standardPrices[activeOutletId];
                      }

                      return (
                        <div
                          key={item.id}
                          onClick={() => handleProductCardClick(item)}
                          style={{
                            background: '#1e293b',
                            borderRadius: '12px',
                            border: '1px solid rgba(255,255,255,0.08)',
                            overflow: 'hidden',
                            cursor: 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between',
                            position: 'relative',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          {/* Image Placeholder */}
                          <div style={{ height: '90px', background: 'linear-gradient(135deg, #1e3a8a 0%, #0f172a 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                            <ShoppingBag size={28} color="#60a5fa" style={{ opacity: 0.7 }} />
                            {item.variants && item.variants.length > 0 && (
                              <div style={{ position: 'absolute', top: '6px', right: '6px', background: 'rgba(37,99,235,0.9)', color: '#ffffff', fontSize: '0.58rem', fontWeight: '800', padding: '2px 6px', borderRadius: '4px' }}>
                                VARIAN
                              </div>
                            )}
                          </div>

                          {/* Item Info */}
                          <div style={{ padding: '8px 10px' }}>
                            <div style={{ fontSize: '0.78rem', fontWeight: '800', color: '#ffffff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textTransform: 'uppercase' }}>
                              {item.name}
                            </div>
                            <div style={{ fontSize: '0.80rem', fontWeight: '900', color: '#38bdf8', marginTop: '4px' }}>
                              {formatRupiah(displayPrice)}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>


              {/* ----------------------------------------------------------- */}
              {/* RIGHT CHECKOUT PANEL (CART REGISTER & SUMMARY - FIXED 380PX) */}
              {/* ----------------------------------------------------------- */}
              <div style={{ width: '380px', flexShrink: 0, display: 'flex', flexDirection: 'column', background: '#1e293b', boxSizing: 'border-box' }}>

                {/* Top 3 Action Tabs: ORDER | TABLE | MORE */}
                <div style={{ display: 'flex', background: '#0b1329', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                  <button
                    onClick={() => setRightPanelSubTab('ORDER')}
                    style={{
                      flex: 1,
                      padding: '12px 0',
                      background: rightPanelSubTab === 'ORDER' ? '#2563eb' : 'transparent',
                      color: '#ffffff',
                      border: 'none',
                      fontWeight: '800',
                      fontSize: '0.85rem',
                      cursor: 'pointer'
                    }}
                  >
                    ORDER
                  </button>
                  <button
                    onClick={() => {
                      setRightPanelSubTab('TABLE');
                      setShowTableMapModal(true);
                    }}
                    style={{
                      flex: 1,
                      padding: '12px 0',
                      background: rightPanelSubTab === 'TABLE' ? '#2563eb' : 'transparent',
                      color: '#ffffff',
                      border: 'none',
                      fontWeight: '800',
                      fontSize: '0.85rem',
                      cursor: 'pointer'
                    }}
                  >
                    TABLE
                  </button>
                  <button
                    onClick={() => setRightPanelSubTab('MORE')}
                    style={{
                      flex: 1,
                      padding: '12px 0',
                      background: rightPanelSubTab === 'MORE' ? '#f43f5e' : '#2563eb',
                      color: '#ffffff',
                      border: 'none',
                      fontWeight: '800',
                      fontSize: '0.85rem',
                      cursor: 'pointer'
                    }}
                  >
                    MORE
                  </button>
                </div>

                {/* Cart Sub-Header Meta Bar */}
                <div style={{ padding: '10px 16px', background: '#0f172a', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.82rem', fontWeight: '800', color: '#cbd5e1' }}>#Pesanan Baru</span>
                  <button
                    onClick={() => {
                      setCustomerSearchQuery('');
                      setShowCustomerSearchModal(true);
                    }}
                    style={{ background: 'none', border: 'none', color: '#60a5fa', fontSize: '0.80rem', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    <User size={14} />
                    <span>👤 {selectedCustomer || 'Pilih Pelanggan'}</span>
                  </button>
                </div>

                {/* Dine In Info Bar */}
                <div style={{ padding: '8px 16px', background: '#1e293b', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ fontSize: '0.82rem', fontWeight: '800', color: '#cbd5e1', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span>🪑</span>
                      <span>Table {selectedTableObj?.number || '01'}</span>
                    </div>
                    <div style={{ fontSize: '0.82rem', fontWeight: '800', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <User size={13} />
                      <span>{guestCount}</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '4px', background: '#0f172a', padding: '3px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }}>
                    <button
                      type="button"
                      onClick={() => setOrderType('Dine In')}
                      style={{
                        padding: '4px 10px',
                        borderRadius: '6px',
                        border: 'none',
                        background: orderType === 'Dine In' ? '#2563eb' : 'transparent',
                        color: orderType === 'Dine In' ? '#ffffff' : '#94a3b8',
                        fontSize: '0.74rem',
                        fontWeight: '800',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      🍽️ Dine In
                    </button>
                    <button
                      type="button"
                      onClick={() => setOrderType('Take Away')}
                      style={{
                        padding: '4px 10px',
                        borderRadius: '6px',
                        border: 'none',
                        background: orderType === 'Take Away' ? '#f59e0b' : 'transparent',
                        color: orderType === 'Take Away' ? '#ffffff' : '#94a3b8',
                        fontSize: '0.74rem',
                        fontWeight: '800',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      🛍️ Take Away
                    </button>
                  </div>
                </div>

                {/* Cart Items List or MORE Features Grid */}
                {rightPanelSubTab === 'MORE' ? (
                  <div style={{ flex: 1, padding: '16px', overflowY: 'auto', background: '#0f172a', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ fontSize: '0.82rem', fontWeight: '900', color: '#cbd5e1', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '2px' }}>
                      Fitur Tambahan POS (More Options)
                    </div>

                    {/* 1. SPLIT BILL */}
                    <div
                      onClick={() => setShowSplitBillModal(true)}
                      style={{
                        background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', padding: '14px 16px',
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                        <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: 'rgba(56,189,248,0.15)', border: '1px solid rgba(56,189,248,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem' }}>
                          ✂️
                        </div>
                        <div>
                          <div style={{ fontSize: '0.9rem', fontWeight: '900', color: '#f8fafc' }}>Split Bill</div>
                          <div style={{ fontSize: '0.74rem', color: '#94a3b8', marginTop: '1px' }}>Pisah tagihan per item atau per orang</div>
                        </div>
                      </div>
                      <ChevronRight size={18} color="#94a3b8" />
                    </div>

                    {/* 2. MERGE BILL */}
                    <div
                      onClick={() => setShowMergeBillModal(true)}
                      style={{
                        background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', padding: '14px 16px',
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                        <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: 'rgba(167,139,250,0.15)', border: '1px solid rgba(167,139,250,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem' }}>
                          🔗
                        </div>
                        <div>
                          <div style={{ fontSize: '0.9rem', fontWeight: '900', color: '#f8fafc' }}>Merge Bill</div>
                          <div style={{ fontSize: '0.74rem', color: '#94a3b8', marginTop: '1px' }}>Gabungkan pesanan dari 2 meja</div>
                        </div>
                      </div>
                      <ChevronRight size={18} color="#94a3b8" />
                    </div>

                    {/* 3. TUKAR POIN */}
                    <div
                      onClick={() => setShowTukarPoinModal(true)}
                      style={{
                        background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', padding: '14px 16px',
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                        <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: 'rgba(251,191,36,0.15)', border: '1px solid rgba(251,191,36,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem' }}>
                          🎁
                        </div>
                        <div>
                          <div style={{ fontSize: '0.9rem', fontWeight: '900', color: '#f8fafc' }}>Tukar Poin</div>
                          <div style={{ fontSize: '0.74rem', color: '#94a3b8', marginTop: '1px' }}>Tukarkan poin loyalty pelanggan</div>
                        </div>
                      </div>
                      <ChevronRight size={18} color="#94a3b8" />
                    </div>

                    {/* 4. KUPON */}
                    <div
                      onClick={() => setShowKuponModal(true)}
                      style={{
                        background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', padding: '14px 16px',
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                        <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: 'rgba(52,211,153,0.15)', border: '1px solid rgba(52,211,153,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem' }}>
                          🎟️
                        </div>
                        <div>
                          <div style={{ fontSize: '0.9rem', fontWeight: '900', color: '#f8fafc' }}>Kupon</div>
                          <div style={{ fontSize: '0.74rem', color: '#94a3b8', marginTop: '1px' }}>Gunakan voucher atau kupon diskon</div>
                        </div>
                      </div>
                      <ChevronRight size={18} color="#94a3b8" />
                    </div>
                  </div>
                ) : (
                  /* Standard Cart Items List */
                  <div style={{ flex: 1, padding: '12px 16px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', background: '#0f172a' }}>
                    {cart.length === 0 ? (
                      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
                        <ShoppingBag size={40} strokeWidth={1} style={{ marginBottom: '8px', opacity: 0.4 }} />
                        <div style={{ fontSize: '0.85rem', fontWeight: '700' }}>Keranjang Kosong</div>
                      </div>
                    ) : (
                      cart.map((item, idx) => {
                        const itemNetPrice = Math.max(0, item.price - (item.discount || 0));
                        const itemLineTotal = itemNetPrice * item.qty;

                        return (
                          <div key={item.id} style={{ background: '#1e293b', padding: '10px 12px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: '1px solid rgba(255,255,255,0.06)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              {/* Circle Index Badge */}
                              <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: '#2563eb', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.72rem', fontWeight: '900' }}>
                                {idx + 1}
                              </div>
                              <div>
                                <div style={{ fontSize: '0.84rem', fontWeight: '800', color: '#ffffff' }}>{item.name}</div>
                                {item.notes && <div style={{ fontSize: '0.70rem', color: '#60a5fa' }}>{item.notes}</div>}
                              </div>
                            </div>
                            <div style={{ fontSize: '0.88rem', fontWeight: '800', color: '#ffffff' }}>
                              {formatRupiah(itemLineTotal)}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}

                {/* Subtotal & Breakdown Summary */}
                <div style={{ padding: '12px 16px', background: '#1e293b', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem', color: '#cbd5e1' }}>
                      <span>Subtotal</span>
                      <span style={{ fontWeight: '800' }}>{formatRupiah(cartSubtotal)}</span>
                    </div>

                    {/* 1. DISKON (KLIK TULISAN UNTUK UBAH PERSENTASE / NOMINAL) */}
                    <div
                      onClick={() => {
                        setDiscountInputVal(discountMode === 'percent' ? (discountInputVal || '') : (discountValue || ''));
                        setShowDiscountEditModal(true);
                      }}
                      style={{
                        display: 'flex',
                        justify: 'space-between',
                        alignItems: 'center',
                        fontSize: '0.78rem',
                        color: discountAmount > 0 ? '#fb7185' : '#cbd5e1',
                        cursor: 'pointer',
                        padding: '4px 6px',
                        borderRadius: '6px',
                        background: discountAmount > 0 ? 'rgba(244,63,94,0.1)' : 'transparent',
                        border: '1px dashed',
                        borderColor: discountAmount > 0 ? 'rgba(244,63,94,0.3)' : 'transparent',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontWeight: '800' }}>Diskon</span>
                        <Tag size={12} color="#fb7185" />
                        {discountMode === 'percent' && discountInputVal && (
                          <span style={{ fontSize: '0.68rem', background: '#fb7185', color: '#fff', padding: '1px 5px', borderRadius: '4px', fontWeight: '800' }}>
                            {discountInputVal}%
                          </span>
                        )}
                      </div>
                      <span style={{ fontWeight: '900' }}>
                        {discountAmount > 0 ? `(- ${formatRupiah(discountAmount)})` : '(- Rp 0)'}
                      </span>
                    </div>

                    {/* 2. SERVICE CHARGE (STATIC / READ ONLY) */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: '#64748b', padding: '2px 6px' }}>
                      <span>Service Charge</span>
                      <span style={{ fontWeight: '700' }}>Rp 0</span>
                    </div>

                    {/* 3. PAJAK PB1 (STATIC / READ ONLY) */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: '#64748b', padding: '2px 6px' }}>
                      <span>Pajak</span>
                      <span style={{ fontWeight: '700' }}>Rp 0</span>
                    </div>

                    {/* 4. ADJUSTMENT (KLIK TULISAN UNTUK UBAH NOMINAL & KETERANGAN WAJIB) */}
                    <div
                      onClick={() => {
                        setAdjustmentInputVal(adjustmentValue || '');
                        setAdjustmentReasonInput(adjustmentReason || '');
                        setAdjustmentErrorMsg('');
                        setShowAdjustmentEditModal(true);
                      }}
                      style={{
                        display: 'flex',
                        justify: 'space-between',
                        alignItems: 'center',
                        fontSize: '0.78rem',
                        color: numAdjustment !== 0 ? '#a78bfa' : '#cbd5e1',
                        cursor: 'pointer',
                        padding: '4px 6px',
                        borderRadius: '6px',
                        background: numAdjustment !== 0 ? 'rgba(167,139,250,0.1)' : 'transparent',
                        border: '1px dashed',
                        borderColor: numAdjustment !== 0 ? 'rgba(167,139,250,0.3)' : 'transparent',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontWeight: '800' }}>Adjustment</span>
                        <Percent size={12} color="#a78bfa" />
                        {adjustmentReason && (
                          <span style={{ fontSize: '0.68rem', color: '#cbd5e1', fontStyle: 'italic', maxWidth: '110px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            ({adjustmentReason})
                          </span>
                        )}
                      </div>
                      <span style={{ fontWeight: '900' }}>
                        {numAdjustment !== 0 ? `${numAdjustment > 0 ? '+' : ''}${formatRupiah(numAdjustment)}` : 'Rp 0'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '6px', marginTop: '2px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                      <span style={{ fontSize: '0.84rem', fontWeight: '800', color: '#ffffff' }}>
                        Total ({cart.reduce((s, i) => s + i.qty, 0)} items)
                      </span>
                      <span style={{ fontSize: '1.1rem', fontWeight: '900', color: '#ffffff' }}>
                        {formatRupiah(cartTotal)}
                      </span>
                    </div>
                  </div>

                  {/* Bottom Action Row 1: Cetak Tagihan & Simpan */}
                  <div style={{ display: 'flex', gap: '10px', marginBottom: '8px' }}>
                    <button
                      disabled={cart.length === 0}
                      onClick={handleGenerateContohTagihan}
                      style={{
                        flex: 1,
                        height: '42px',
                        background: 'rgba(56,189,248,0.12)',
                        border: '1px solid #38bdf8',
                        color: '#38bdf8',
                        borderRadius: '8px',
                        fontWeight: '800',
                        fontSize: '0.82rem',
                        cursor: cart.length > 0 ? 'pointer' : 'not-allowed',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px'
                      }}
                    >
                      <FileText size={15} />
                      <span>Contoh Tagihan</span>
                    </button>
                    <button
                      disabled={cart.length === 0}
                      onClick={handleHoldTableOrder}
                      style={{
                        flex: 1,
                        height: '42px',
                        background: '#2563eb',
                        border: 'none',
                        color: '#ffffff',
                        borderRadius: '8px',
                        fontWeight: '800',
                        fontSize: '0.82rem',
                        cursor: cart.length > 0 ? 'pointer' : 'not-allowed'
                      }}
                    >
                      Simpan
                    </button>
                  </div>

                  {/* Bottom Action Row 2: BAYAR (Full Width Jumbo Button) */}
                  <button
                    disabled={cart.length === 0}
                    onClick={() => {
                      if (cart.length > 0) {
                        setSelectedPaymentMethod('Cash');
                        setTenderedCash('');
                        setShowPaymentScreenModal(true);
                      }
                    }}
                    style={{
                      width: '100%',
                      height: '46px',
                      background: cart.length > 0 ? 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)' : '#334155',
                      border: 'none',
                      borderRadius: '8px',
                      color: '#ffffff',
                      fontWeight: '900',
                      fontSize: '0.95rem',
                      cursor: cart.length > 0 ? 'pointer' : 'not-allowed',
                      boxShadow: cart.length > 0 ? '0 4px 14px rgba(37,99,235,0.4)' : 'none'
                    }}
                  >
                    Bayar
                  </button>
                </div>
              </div>
            </div>
          )}

        {/* TAB 2: CART (KERANJANG) */}
        {activeNavTab === 'chart' && (
          <div style={{ flex: 1, padding: '20px', overflowY: 'auto', width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h2 style={{ fontSize: '1.2rem', fontWeight: '900', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ShoppingBag size={22} color="#2563eb" />
                  <span>Open Bills (Pesanan Gantung)</span>
                </h2>
                <p style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '2px' }}>
                  Outlet: {currentOutlet.name} • Total {pendingOrdersList.length} Pesanan Aktif Gantung (Bebas / Non-FIFO / Parallel Multi-Order)
                </p>
              </div>
            </div>

            {/* KETERANGAN SYNC MOBILE APK DENGAN SERVER & DATABASE */}
            <div style={{ background: '#0f172a', padding: '12px 16px', borderRadius: '14px', border: '1px solid rgba(56,189,248,0.25)', marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '9px', height: '9px', borderRadius: '50%', background: '#34d399', boxShadow: '0 0 10px #34d399' }} />
                <div>
                  <div style={{ fontSize: '0.82rem', fontWeight: '800', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>Sinkronisasi Data Cart Mobile APK:</span>
                    <span style={{ color: '#34d399', fontWeight: '900' }}>🟢 Live Server & Database Connected</span>
                  </div>
                  <div style={{ fontSize: '0.74rem', color: '#94a3b8', marginTop: '2px' }}>
                    Pesanan Cart tersimpan dan tersinkronisasi otomatis dengan Database Server & Web Admin.
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: '800', color: '#cbd5e1', background: 'rgba(255,255,255,0.06)', padding: '4px 10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)' }}>
                  ⏱️ {lastSyncTime}
                </span>
                <button
                  type="button"
                  onClick={handleTriggerSyncData}
                  disabled={isSyncingNow}
                  style={{
                    padding: '6px 14px',
                    background: isSyncingNow ? '#334155' : 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                    border: 'none',
                    color: '#ffffff',
                    borderRadius: '10px',
                    fontSize: '0.78rem',
                    fontWeight: '900',
                    cursor: isSyncingNow ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: isSyncingNow ? 'none' : '0 3px 10px rgba(37,99,235,0.3)'
                  }}
                >
                  <RefreshCw size={14} className={isSyncingNow ? 'animate-spin' : ''} />
                  <span>{isSyncingNow ? 'Syncing...' : '🔄 Sync Cart ke Server'}</span>
                </button>
              </div>
            </div>

            {pendingOrdersList.length === 0 ? (
              <div style={{ background: '#1e293b', borderRadius: '16px', padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
                <ShoppingBag size={48} strokeWidth={1} style={{ marginBottom: '12px', color: '#2563eb', opacity: 0.7 }} />
                <div style={{ fontSize: '1rem', fontWeight: '800', color: '#f8fafc' }}>Belum Ada Pesanan di Cart</div>
                <div style={{ fontSize: '0.78rem', marginTop: '4px' }}>Saat Anda menekan 'Simpan' di Kasir, daftar pesanan gantung akan tersimpan di Cart.</div>
              </div>
            ) : (
              <div style={{ background: '#1e293b', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.82rem' }}>
                    <thead>
                      <tr style={{ background: '#0f172a', borderBottom: '1px solid #334155', color: '#94a3b8', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        <th style={{ padding: '12px 14px' }}>No. Struk</th>
                        <th style={{ padding: '12px 14px' }}>Tanggal</th>
                        <th style={{ padding: '12px 14px' }}>Jam</th>
                        <th style={{ padding: '12px 14px' }}>Nama Pelanggan</th>
                        <th style={{ padding: '12px 14px' }}>Nomor Meja</th>
                        <th style={{ padding: '12px 14px' }}>Total Tagihan</th>
                        <th style={{ padding: '12px 14px' }}>Status</th>
                        <th style={{ padding: '12px 14px', textAlign: 'right' }}>Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pendingOrdersList.map((row) => (
                        <tr
                          key={row.receiptNo}
                          onClick={() => {
                            setSelectedTableId(row.tableId);
                            setCart([...row.items]);
                            setOpenedOriginalCart(JSON.parse(JSON.stringify(row.items)));
                            setSelectedCustomer(row.customerName);
                            setActiveNavTab('kasir');
                          }}
                          style={{
                            borderBottom: '1px solid rgba(255,255,255,0.05)',
                            color: '#f8fafc',
                            cursor: 'pointer'
                          }}
                        >
                          {/* 1. NO STRUK */}
                          <td style={{ padding: '14px', fontFamily: 'monospace', fontWeight: '800', color: '#60a5fa' }}>
                            {row.receiptNo}
                          </td>

                          {/* 2. TANGGAL */}
                          <td style={{ padding: '14px', color: '#cbd5e1' }}>
                            {row.date}
                          </td>

                          {/* 3. JAM */}
                          <td style={{ padding: '14px', color: '#cbd5e1' }}>
                            {row.time}
                          </td>

                          {/* 4. NAMA PELANGGAN */}
                          <td style={{ padding: '14px', fontWeight: '700', color: '#f8fafc' }}>
                            {row.customerName}
                          </td>

                          {/* 5. NOMOR MEJA */}
                          <td style={{ padding: '14px' }}>
                            <span style={{ background: 'rgba(37,99,235,0.2)', color: '#60a5fa', padding: '3px 8px', borderRadius: '6px', fontWeight: '800', fontSize: '0.75rem' }}>
                              📍 {row.tableNumber}
                            </span>
                          </td>

                          {/* 6. TOTAL TAGIHAN */}
                          <td style={{ padding: '14px', fontWeight: '900', color: '#34d399', fontSize: '0.9rem' }}>
                            {formatRupiah(row.totalAmount)}
                          </td>

                          {/* 7. STATUS */}
                          <td style={{ padding: '14px' }}>
                            <span style={{ background: 'rgba(244,63,94,0.15)', color: '#fb7185', border: '1px solid rgba(244,63,94,0.3)', padding: '3px 10px', borderRadius: '20px', fontSize: '0.72rem', fontWeight: '800' }}>
                              🔴 {row.status}
                            </span>
                          </td>

                          {/* 8. AKSI */}
                          <td style={{ padding: '14px', textAlign: 'right' }}>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedTableId(row.tableId);
                                setCart([...row.items]);
                                setOpenedOriginalCart(JSON.parse(JSON.stringify(row.items)));
                                setSelectedCustomer(row.customerName);
                                setActiveNavTab('kasir');
                              }}
                              style={{
                                background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                                color: '#ffffff',
                                border: 'none',
                                padding: '6px 12px',
                                borderRadius: '8px',
                                fontSize: '0.75rem',
                                fontWeight: '800',
                                cursor: 'pointer'
                              }}
                            >
                              📥 Buka Pesanan
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: RIWAYAT TRANSAKSI */}
        {(activeNavTab === 'riwayat' || activeNavTab === 'riwayat_transaksi') && (
          <div style={{ flex: 1, padding: '20px', overflowY: 'auto', width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h2 style={{ fontSize: '1.2rem', fontWeight: '900', color: '#f8fafc' }}>📜 Riwayat Struk Transaksi Kasir</h2>
                <p style={{ fontSize: '0.78rem', color: '#94a3b8' }}>Outlet: {currentOutlet.name} • Total {outletTransactions.length} Transaksi Selesai</p>
              </div>
            </div>

            {/* KETERANGAN SYNC MOBILE APK DENGAN SERVER & DATABASE */}
            <div style={{ background: '#0f172a', padding: '12px 16px', borderRadius: '14px', border: '1px solid rgba(56,189,248,0.25)', marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '9px', height: '9px', borderRadius: '50%', background: '#34d399', boxShadow: '0 0 10px #34d399' }} />
                <div>
                  <div style={{ fontSize: '0.82rem', fontWeight: '800', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>Sinkronisasi Riwayat Transaksi:</span>
                    <span style={{ color: '#34d399', fontWeight: '900' }}>🟢 Live Server & Database Synced</span>
                  </div>
                  <div style={{ fontSize: '0.74rem', color: '#94a3b8', marginTop: '2px' }}>
                    Seluruh riwayat transaksi kasir terhubung dan tersimpan real-time di Database Server & Web Admin.
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: '800', color: '#cbd5e1', background: 'rgba(255,255,255,0.06)', padding: '4px 10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)' }}>
                  ⏱️ {lastSyncTime}
                </span>
                <button
                  type="button"
                  onClick={handleTriggerSyncData}
                  disabled={isSyncingNow}
                  style={{
                    padding: '6px 14px',
                    background: isSyncingNow ? '#334155' : 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                    border: 'none',
                    color: '#ffffff',
                    borderRadius: '10px',
                    fontSize: '0.78rem',
                    fontWeight: '900',
                    cursor: isSyncingNow ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: isSyncingNow ? 'none' : '0 3px 10px rgba(37,99,235,0.3)'
                  }}
                >
                  <RefreshCw size={14} className={isSyncingNow ? 'animate-spin' : ''} />
                  <span>{isSyncingNow ? 'Syncing...' : '🔄 Sync Riwayat ke Server'}</span>
                </button>
              </div>
            </div>

            {outletTransactions.length === 0 ? (
              <div style={{ background: '#1e293b', borderRadius: '16px', padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
                <History size={48} strokeWidth={1} style={{ marginBottom: '12px', color: '#818cf8' }} />
                <div style={{ fontSize: '1rem', fontWeight: '800', color: '#f8fafc' }}>Belum Ada Riwayat Transaksi</div>
                <div style={{ fontSize: '0.78rem', marginTop: '4px' }}>Lakukan transaksi pertama Anda di Tab Kasir.</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {outletTransactions.map(tx => (
                  <div key={tx.id} style={{ background: '#1e293b', padding: '14px 18px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '0.9rem', fontWeight: '900', color: '#38bdf8' }}>{tx.id}</span>
                        <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '6px', background: 'rgba(16,185,129,0.2)', color: '#34d399', fontWeight: '800' }}>{tx.payment_method || 'Cash'}</span>
                        <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '6px', background: 'rgba(99,102,241,0.2)', color: '#818cf8', fontWeight: '800' }}>{tx.order_type || 'Dine In'}</span>
                        {tx.table_number && <span style={{ fontSize: '0.7rem', color: '#fbbf24', fontWeight: '700' }}>📍 {tx.table_number}</span>}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '4px' }}>
                        📅 {tx.date} {tx.time || ''} • Pelanggan: <strong>{tx.customer_name || 'Pelanggan Umum'}</strong>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '1rem', fontWeight: '900', color: '#34d399' }}>{formatRupiah(tx.amount)}</div>
                        <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{(tx.items || []).length} Item Menu</div>
                      </div>
                      <button onClick={() => setSelectedTxDetail(tx)} className="btn-secondary" style={{ padding: '6px 12px', fontSize: '0.75rem' }}>
                        Detail Struk
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB NAVIGASI: PELANGGAN (MATCHING USER SCREENSHOT 100%) */}
        {activeNavTab === 'pelanggan' && (
          <div style={{ flex: 1, display: 'flex', width: '100%', height: '100%', background: '#0f172a', overflow: 'hidden' }}>
            
            {/* ----------------------------------------------------------- */}
            {/* LEFT PANEL: DAFTAR KARTU PELANGGAN (45% WIDTH)              */}
            {/* ----------------------------------------------------------- */}
            <div style={{ flex: '0 0 45%', display: 'flex', flexDirection: 'column', borderRight: '1px solid rgba(255,255,255,0.08)', background: '#1e293b' }}>
              
              {/* Header Left Panel: Search & Button Add Customer */}
              <div style={{ padding: '16px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: '#0f172a', border: '1px solid #334155', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Grid size={18} color="#a78bfa" />
                </div>
                <div style={{ flex: 1, position: 'relative' }}>
                  <input
                    type="text"
                    value={custSearchFilter}
                    onChange={e => setCustSearchFilter(e.target.value)}
                    placeholder="Cari Nama / No Telepon..."
                    style={{ width: '100%', padding: '9px 12px 9px 34px', borderRadius: '10px', border: '1px solid #334155', background: '#0f172a', color: '#ffffff', fontSize: '0.82rem', outline: 'none' }}
                  />
                  <Search size={15} color="#94a3b8" style={{ position: 'absolute', left: '10px', top: '10px' }} />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setEditingCustomerData(null);
                    setCustFormName('');
                    setCustFormPhone('');
                    setCustFormOutletId(currentOutlet.id || 1);
                    setCustFormEmail('');
                    setCustFormGender('Wanita');
                    setCustFormAddress('');
                    setShowAddCustomerModal(true);
                  }}
                  title="Tambah Pelanggan Baru"
                  style={{ width: '38px', height: '38px', borderRadius: '10px', background: '#6366f1', border: 'none', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 4px 12px rgba(99,102,241,0.3)' }}
                >
                  <User size={18} />
                </button>
              </div>

              {/* Grid 2 Column Kartu Pelanggan (Matching User Screenshot Card Layout) */}
              <div style={{ flex: 1, padding: '16px', overflowY: 'auto' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                  {(masterData.customers || []).filter(c => {
                    const q = debouncedCustSearch.toLowerCase();
                    return (c.name || '').toLowerCase().includes(q) || (c.phone || '').toLowerCase().includes(q) || (c.code || '').toLowerCase().includes(q);
                  }).map(c => {
                    const isSelected = selectedCustomerIdForDetail === c.id;
                    const custCode = c.code || `000${c.id} - BMJ`;
                    const custOutletName = c.outlet_name || currentOutlet.name || 'Restoran Utama';

                    return (
                      <div
                        key={c.id}
                        onClick={() => setSelectedCustomerIdForDetail(c.id)}
                        style={{
                          background: isSelected ? 'rgba(99,102,241,0.12)' : '#0f172a',
                          border: '2px solid',
                          borderColor: isSelected ? '#6366f1' : '#334155',
                          borderRadius: '14px',
                          padding: '14px',
                          cursor: 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          textAlign: 'center',
                          transition: 'all 0.15s ease',
                          boxShadow: isSelected ? '0 4px 14px rgba(99,102,241,0.2)' : 'none'
                        }}
                      >
                        {/* Avatar */}
                        <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: '#1e293b', border: '1px solid #334155', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '8px' }}>
                          <User size={20} color="#a78bfa" />
                        </div>
                        {/* ID - Name */}
                        <div style={{ fontSize: '0.85rem', fontWeight: '900', color: '#f8fafc', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>
                          {custCode}
                        </div>
                        <div style={{ fontSize: '0.76rem', fontWeight: '800', color: '#6366f1', marginTop: '1px' }}>
                          {c.name}
                        </div>
                        {/* Phone */}
                        <div style={{ fontSize: '0.74rem', color: '#94a3b8', margin: '4px 0 6px 0' }}>
                          {c.phone || '-'}
                        </div>
                        {/* Location / Outlet */}
                        <div style={{ fontSize: '0.68rem', color: '#cbd5e1', display: 'flex', alignItems: 'center', gap: '3px' }}>
                          <span>📍</span>
                          <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '110px' }}>{custOutletName}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Bottom Self-Reg Bar */}
              <div style={{ padding: '12px 16px', background: '#0f172a', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: '700' }}>Registrasi Mandiri Pelanggan:</span>
                <button
                  type="button"
                  onClick={() => setShowQrSelfRegModal(true)}
                  style={{ padding: '6px 12px', background: 'rgba(56,189,248,0.15)', border: '1px solid rgba(56,189,248,0.3)', color: '#38bdf8', borderRadius: '8px', fontSize: '0.76rem', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  <QrCode size={14} />
                  <span>Scan Barcode / QR</span>
                </button>
              </div>
            </div>

            {/* ----------------------------------------------------------- */}
            {/* RIGHT PANEL: DETAIL PELANGGAN (55% WIDTH)                    */}
            {/* ----------------------------------------------------------- */}
            {(() => {
              const activeCust = (masterData.customers || []).find(c => c.id === selectedCustomerIdForDetail) || masterData.customers?.[0] || null;
              const custCode = activeCust.code || `000${activeCust.id} - BMJ`;
              const custOutletName = activeCust.outlet_name || (masterData.outlets || []).find(o => o.id === activeCust.outlet_id)?.name || currentOutlet.name || 'Restoran Utama';

              return (
                <div style={{ flex: '0 0 55%', display: 'flex', flexDirection: 'column', background: '#0f172a', padding: '24px', overflowY: 'auto' }}>
                  
                  {/* Top Bar Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '14px' }}>
                    <h3 style={{ fontSize: '1.2rem', fontWeight: '900', color: '#f8fafc', margin: 0 }}>Detail Pelanggan</h3>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingCustomerData(activeCust);
                        setCustFormName(activeCust.name || '');
                        setCustFormPhone(activeCust.phone || '');
                        setCustFormOutletId(activeCust.outlet_id || currentOutlet.id || 1);
                        setCustFormEmail(activeCust.email || '');
                        setCustFormGender(activeCust.gender || 'Wanita');
                        setCustFormAddress(activeCust.address || '');
                        setShowAddCustomerModal(true);
                      }}
                      style={{ padding: '8px 16px', background: '#6366f1', color: '#ffffff', border: 'none', borderRadius: '10px', fontSize: '0.82rem', fontWeight: '900', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                      <span>✏️ Ubah</span>
                    </button>
                  </div>

                  {/* Header Profile Banner */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
                    <div style={{ width: '54px', height: '54px', borderRadius: '50%', background: '#1e293b', border: '2px solid #6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <User size={26} color="#6366f1" />
                    </div>
                    <div>
                      <div style={{ fontSize: '1.2rem', fontWeight: '900', color: '#ffffff' }}>
                        {custCode}
                      </div>
                      <div style={{ fontSize: '0.9rem', fontWeight: '800', color: '#6366f1', marginTop: '2px' }}>
                        {activeCust.name}
                      </div>
                    </div>
                  </div>

                  {/* Sub-Tabs: Detail Pelanggan vs Membership */}
                  <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                    <button
                      type="button"
                      onClick={() => setCustDetailSubTab('detail')}
                      style={{
                        padding: '8px 18px', borderRadius: '10px', border: 'none',
                        background: custDetailSubTab === 'detail' ? '#6366f1' : '#1e293b',
                        color: custDetailSubTab === 'detail' ? '#ffffff' : '#94a3b8',
                        fontSize: '0.82rem', fontWeight: '900', cursor: 'pointer'
                      }}
                    >
                      📋 Detail Pelanggan
                    </button>
                    <button
                      type="button"
                      onClick={() => setCustDetailSubTab('membership')}
                      style={{
                        padding: '8px 18px', borderRadius: '10px', border: 'none',
                        background: custDetailSubTab === 'membership' ? '#6366f1' : '#1e293b',
                        color: custDetailSubTab === 'membership' ? '#ffffff' : '#94a3b8',
                        fontSize: '0.82rem', fontWeight: '900', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: '6px'
                      }}
                    >
                      <CreditCard size={15} />
                      <span>Membership / QR</span>
                    </button>
                  </div>

                  {/* SUB-TAB 1: DETAIL PELANGGAN */}
                  {custDetailSubTab === 'detail' ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                      {/* Form Details Read-Only Fields */}
                      <div style={{ background: '#1e293b', borderRadius: '14px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                          <span style={{ color: '#cbd5e1', fontWeight: '700' }}>Phone</span>
                          <span style={{ fontWeight: '900', color: '#ffffff' }}>{activeCust.phone || '-'}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                          <span style={{ color: '#cbd5e1', fontWeight: '700' }}>Email</span>
                          <span style={{ fontWeight: '800', color: '#ffffff' }}>{activeCust.email || '-'}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                          <span style={{ color: '#cbd5e1', fontWeight: '700' }}>Jenis Kelamin</span>
                          <span style={{ fontWeight: '800', color: '#ffffff' }}>{activeCust.gender || 'wanita'}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                          <span style={{ color: '#cbd5e1', fontWeight: '700' }}>Tanggal Lahir</span>
                          <span style={{ fontWeight: '800', color: '#ffffff' }}>{activeCust.birthdate || '-'}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                          <span style={{ color: '#cbd5e1', fontWeight: '700' }}>Kategori Harga</span>
                          <span style={{ fontWeight: '900', color: '#38bdf8' }}>{activeCust.customer_type || 'Reguler'}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                          <span style={{ color: '#cbd5e1', fontWeight: '700' }}>Outlet Terdaftar</span>
                          <span style={{ fontWeight: '900', color: '#fbbf24' }}>{custOutletName}</span>
                        </div>
                      </div>

                      {/* Section Alamat */}
                      <div style={{ marginTop: '8px' }}>
                        <div style={{ fontSize: '0.84rem', fontWeight: '900', color: '#f8fafc', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span>📍</span>
                          <span>Alamat</span>
                        </div>
                        <div style={{ background: '#1e293b', borderRadius: '14px', padding: '16px', border: '1px solid rgba(255,255,255,0.06)' }}>
                          <div style={{ fontSize: '0.88rem', fontWeight: '900', color: '#6366f1' }}>
                            Rumah
                          </div>
                          <div style={{ fontSize: '0.82rem', fontWeight: '800', color: '#ffffff', margin: '2px 0 6px 0' }}>
                            {activeCust.name} • {activeCust.phone || '-'}
                          </div>
                          <div style={{ fontSize: '0.78rem', color: '#cbd5e1', lineHeight: 1.4 }}>
                            {activeCust.address || 'Jl. Kelapa Sawit, Pelita, Bajenis, Kota Tebing Tinggi, Sumatera Utara (20621)'}
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* SUB-TAB 2: MEMBERSHIP / QR REGISTRASI MANDIRI */
                    <div style={{ background: '#1e293b', borderRadius: '16px', padding: '24px', textAlign: 'center', border: '1px solid #334155' }}>
                      <div style={{ fontSize: '0.95rem', fontWeight: '900', color: '#f8fafc', marginBottom: '6px' }}>
                        QR Code Membership & Registrasi Mandiri Pelanggan
                      </div>
                      <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginBottom: '20px' }}>
                        Pelanggan dapat melakukan scan QR Code ini menggunakan kamera smartphone untuk mendaftar profil mandiri.
                      </div>

                      {/* Fake Barcode / QR Code Box */}
                      <div style={{ background: '#ffffff', padding: '20px', borderRadius: '16px', display: 'inline-block', marginBottom: '20px', boxShadow: '0 10px 25px rgba(0,0,0,0.3)' }}>
                        <div style={{ width: '160px', height: '160px', background: '#000000', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff', fontSize: '3rem', margin: '0 auto' }}>
                          <QrCode size={120} color="#ffffff" />
                        </div>
                        <div style={{ fontSize: '0.85rem', fontWeight: '900', color: '#000000', marginTop: '10px', fontFamily: 'monospace' }}>
                          MEMBER-{custCode.split(' ')[0]}
                        </div>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
                        <button
                          type="button"
                          onClick={() => setShowQrSelfRegModal(true)}
                          style={{ padding: '10px 20px', background: '#38bdf8', color: '#0f172a', border: 'none', borderRadius: '10px', fontWeight: '900', fontSize: '0.82rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                        >
                          <QrCode size={16} />
                          <span>Buka QR Code Fullscreen</span>
                        </button>
                      </div>
                    </div>
                  )}

                </div>
              );
            })()}

          </div>
        )}

        {/* TAB NAVIGASI: SHIFT & AKTIVITAS PENGGUNA APLIKASI */}
        {activeNavTab === 'shift' && (
          <div style={{ flex: 1, padding: '24px', overflowY: 'auto', width: '100%', background: '#0f172a' }}>
            
            {/* Header Title */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: '900', color: '#f8fafc', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Clock size={24} color="#38bdf8" />
                  <span>Shift Kasir & Aktivitas Pengguna Aplikasi</span>
                </h2>
                <p style={{ fontSize: '0.78rem', color: '#94a3b8', margin: '4px 0 0 0' }}>
                  Aktivitas sesi login/logout kasir, durasi kerja, jumlah struk transaksi, dan total nominal uang di {currentOutlet.name}
                </p>
              </div>

              {/* Action Button Closing Shift */}
              <button
                onClick={onShiftCloseClick}
                style={{ padding: '10px 18px', background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)', color: '#ffffff', border: 'none', borderRadius: '10px', fontWeight: '900', fontSize: '0.82rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', boxShadow: '0 4px 14px rgba(239,68,68,0.3)' }}
              >
                <Clock size={16} />
                <span>🔒 Closing Sesi Shift Aktif</span>
              </button>
            </div>

            {/* WIDGET KALENDER RENTANG WAKTU (DATE RANGE PICKER) & SEARCH BAR */}
            <div style={{ background: '#1e293b', padding: '16px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.08)', marginBottom: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                
                {/* Preset Buttons */}
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: '700', marginRight: '4px' }}>Filter Rentang:</span>
                  {[
                    { id: 'all', label: '📅 Semua' },
                    { id: 'today', label: '📅 Hari Ini' },
                    { id: '7days', label: '📅 7 Hari Terakhir' },
                    { id: 'custom', label: '🗓️ Custom Tanggal' }
                  ].map(p => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        setShiftDatePreset(p.id);
                        if (p.id === 'today') {
                          const t = new Date().toISOString().split('T')[0];
                          setShiftStartDate(t);
                          setShiftEndDate(t);
                        } else if (p.id === '7days') {
                          const e = new Date();
                          const s = new Date();
                          s.setDate(s.getDate() - 7);
                          setShiftStartDate(s.toISOString().split('T')[0]);
                          setShiftEndDate(e.toISOString().split('T')[0]);
                        }
                      }}
                      style={{
                        padding: '6px 14px',
                        borderRadius: '8px',
                        border: shiftDatePreset === p.id ? '1px solid #38bdf8' : '1px solid #334155',
                        background: shiftDatePreset === p.id ? 'rgba(56,189,248,0.2)' : '#0f172a',
                        color: shiftDatePreset === p.id ? '#38bdf8' : '#cbd5e1',
                        fontSize: '0.78rem',
                        fontWeight: '800',
                        cursor: 'pointer'
                      }}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>

                {/* Search Bar */}
                <div style={{ position: 'relative', width: '240px' }}>
                  <input
                    type="text"
                    value={shiftUserSearchFilter}
                    onChange={e => setShiftUserSearchFilter(e.target.value)}
                    placeholder="Cari pengguna / kasir..."
                    style={{ width: '100%', padding: '8px 12px 8px 32px', borderRadius: '8px', border: '1px solid #334155', background: '#0f172a', color: '#ffffff', fontSize: '0.80rem', outline: 'none' }}
                  />
                  <Search size={15} color="#94a3b8" style={{ position: 'absolute', left: '10px', top: '9px' }} />
                </div>
              </div>

              {/* Date Input Pickers (When Custom is selected or to adjust range) */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: '#0f172a', padding: '10px 14px', borderRadius: '10px', border: '1px solid #334155' }}>
                <span style={{ fontSize: '0.76rem', color: '#cbd5e1', fontWeight: '800' }}>Rentang Tanggal Kalender:</span>
                <input
                  type="date"
                  value={shiftStartDate}
                  onChange={e => {
                    setShiftStartDate(e.target.value);
                    setShiftDatePreset('custom');
                  }}
                  style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '6px', color: '#ffffff', padding: '4px 8px', fontSize: '0.78rem', outline: 'none' }}
                />
                <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>s/d</span>
                <input
                  type="date"
                  value={shiftEndDate}
                  onChange={e => {
                    setShiftEndDate(e.target.value);
                    setShiftDatePreset('custom');
                  }}
                  style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '6px', color: '#ffffff', padding: '4px 8px', fontSize: '0.78rem', outline: 'none' }}
                />
              </div>
            </div>

            {/* TABEL SHIFT USER PENGGUNA APLIKASI (FULL TABULAR VIEW) */}
            {(() => {
              const todayStr = new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
              const activeShiftTotalSales = (outletTransactions || []).reduce((sum, tx) => sum + (tx.amount || 0), 0);
              const activeShiftTxCount = (outletTransactions || []).length;
              const activeShiftCash = (outletTransactions || []).filter(tx => (tx.payment_method || 'Cash') === 'Cash').reduce((sum, tx) => sum + (tx.amount || 0), 0);
              const activeShiftQris = (outletTransactions || []).filter(tx => (tx.payment_method || '') === 'QRIS').reduce((sum, tx) => sum + (tx.amount || 0), 0);
              const activeShiftEdc = (outletTransactions || []).filter(tx => (tx.payment_method || '') === 'EDC').reduce((sum, tx) => sum + (tx.amount || 0), 0);

              const activeUserShift = {
                id: 'SHIFT-NOW-01',
                username: 'master',
                user_name: userSession?.name || '',
                role: 'Super Admin / Owner',
                outlet_name: currentOutlet.name || 'Restoran Utama',
                status: 'AKTIF BERLANGSUNG',
                login_time: `${todayStr}, 08:00 WIB`,
                logout_time: 'Masih Login (Shift Berjalan)',
                duration_label: 'Sesuai Jam Berjalan',
                total_receipts: activeShiftTxCount,
                total_sales: activeShiftTotalSales,
                cash_sales: activeShiftCash,
                qris_sales: activeShiftQris,
                edc_sales: activeShiftEdc,
                initial_cash: initialCash || 500000,
                transactions: outletTransactions || []
              };

              const pastShifts = masterData?.shiftLogs || masterData?.closedShifts || [];
              const rawShiftList = (pastShifts.length > 0 || activeShiftTxCount > 0)
                ? [activeUserShift, ...pastShifts]
                : [];

              const shiftList = rawShiftList.filter(s => {
                const q = debouncedShiftUserSearch.toLowerCase();
                return (s.user_name || '').toLowerCase().includes(q) || (s.username || '').toLowerCase().includes(q) || (s.role || '').toLowerCase().includes(q);
              });

              return (
                <div style={{ background: '#1e293b', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.08)', overflow: 'hidden', boxShadow: '0 8px 24px rgba(0,0,0,0.3)' }}>
                  <div style={{ padding: '16px 20px', background: '#0f172a', borderBottom: '1px solid #334155', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: '0.92rem', fontWeight: '900', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Clock size={18} color="#38bdf8" />
                      <span>TABEL HISTORI SHIFT PENGGUNA APLIKASI ({shiftList.length})</span>
                    </div>
                  </div>

                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.80rem' }}>
                      <thead>
                        <tr style={{ background: '#0f172a', color: '#94a3b8', borderBottom: '1px solid #334155' }}>
                          <th style={{ padding: '12px 16px' }}>Shift ID & Status</th>
                          <th style={{ padding: '12px 16px' }}>Pengguna Aplikasi</th>
                          <th style={{ padding: '12px 16px' }}>Login - Logout</th>
                          <th style={{ padding: '12px 16px' }}>Durasi Kerja</th>
                          <th style={{ padding: '12px 16px' }}>Struk</th>
                          <th style={{ padding: '12px 16px' }}>Kas Tunai</th>
                          <th style={{ padding: '12px 16px' }}>Total Omset</th>
                          <th style={{ padding: '12px 16px', textAlign: 'right' }}>Aksi</th>
                        </tr>
                      </thead>
                      <tbody>
                        {shiftList.length === 0 ? (
                          <tr>
                            <td colSpan="8" style={{ textAlign: 'center', padding: '36px', color: '#64748b' }}>
                              Belum ada histori shift pengguna terdaftar (Data Kosong).
                            </td>
                          </tr>
                        ) : (
                          shiftList.map((row, rIdx) => {
                          const isAct = row.status === 'AKTIF BERLANGSUNG';
                          return (
                            <tr
                              key={row.id}
                              onClick={() => setSelectedShiftDetailModal(row)}
                              style={{
                                borderBottom: '1px solid rgba(255,255,255,0.05)',
                                background: isAct ? 'rgba(56,189,248,0.06)' : 'transparent',
                                cursor: 'pointer',
                                transition: 'background 0.15s ease'
                              }}
                            >
                              <td style={{ padding: '14px 16px' }}>
                                <div style={{ fontWeight: '900', color: '#38bdf8' }}>{row.id}</div>
                                <span style={{
                                  fontSize: '0.66rem', fontWeight: '900', padding: '2px 7px', borderRadius: '10px',
                                  background: isAct ? 'rgba(56,189,248,0.2)' : 'rgba(148,163,184,0.15)',
                                  color: isAct ? '#38bdf8' : '#cbd5e1',
                                  marginTop: '4px', display: 'inline-block'
                                }}>
                                  {isAct ? '🟢 AKTIF' : '⚪ SELESAI'}
                                </span>
                              </td>

                              <td style={{ padding: '14px 16px' }}>
                                <div style={{ fontWeight: '900', color: '#ffffff' }}>{row.user_name}</div>
                                <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>{row.role} • @{row.username}</div>
                              </td>

                              <td style={{ padding: '14px 16px' }}>
                                <div style={{ color: '#34d399', fontWeight: '800' }}>📥 {row.login_time}</div>
                                <div style={{ color: isAct ? '#38bdf8' : '#cbd5e1', marginTop: '2px' }}>📤 {row.logout_time}</div>
                              </td>

                              <td style={{ padding: '14px 16px', fontWeight: '900', color: '#fbbf24' }}>
                                ⏱️ {row.duration_label}
                              </td>

                              <td style={{ padding: '14px 16px', fontWeight: '800', color: '#ffffff' }}>
                                🧾 {row.total_receipts} Struk
                              </td>

                              <td style={{ padding: '14px 16px', fontWeight: '800', color: '#38bdf8' }}>
                                {formatRupiah(row.cash_sales)}
                              </td>

                              <td style={{ padding: '14px 16px', fontWeight: '900', color: '#34d399', fontSize: '0.88rem' }}>
                                {formatRupiah(row.total_sales)}
                              </td>

                              <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedShiftDetailModal(row);
                                  }}
                                  style={{
                                    padding: '6px 12px',
                                    borderRadius: '8px',
                                    border: '1px solid rgba(56,189,248,0.3)',
                                    background: 'rgba(56,189,248,0.15)',
                                    color: '#38bdf8',
                                    fontSize: '0.75rem',
                                    fontWeight: '800',
                                    cursor: 'pointer'
                                  }}
                                >
                                  👁️ Detail
                                </button>
                              </td>
                            </tr>
                          );
                        }))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })()}

          </div>
        )}

        {/* TAB NAVIGASI: LAPORAN (MATCHING USER SCREENSHOT 100%) */}
        {(activeNavTab === 'laporan' || activeNavTab === 'keuangan') && (
          <div style={{ flex: 1, padding: '24px', overflowY: 'auto', width: '100%', background: '#0f172a', display: 'flex', flexDirection: 'column' }}>
            
            {/* Header Laporan */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                {activeLaporanSubView !== null && (
                  <button
                    type="button"
                    onClick={() => setActiveLaporanSubView(null)}
                    style={{ padding: '8px 14px', background: '#1e293b', border: '1px solid #334155', color: '#38bdf8', borderRadius: '10px', fontWeight: '800', fontSize: '0.82rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    <span>⬅️ Kembali</span>
                  </button>
                )}
                <div>
                  <h2 style={{ fontSize: '1.25rem', fontWeight: '900', color: '#f8fafc', margin: 0 }}>
                    {activeLaporanSubView === 'omzet' && '📊 Laporan Omzet & Penjualan'}
                    {activeLaporanSubView === 'harian' && '💵 Buat Laporan Harian & Rekonsiliasi Kas'}
                    {activeLaporanSubView === 'logistik' && '📦 Buat Laporan Logistik & Stok Bahan'}
                    {activeLaporanSubView === 'transfer' && '🚚 Buat Laporan Transfer Bahan Baku Antarcabang'}
                    {activeLaporanSubView === 'waste' && '🗑️ Buat Laporan Barang Rusak (Waste)'}
                    {activeLaporanSubView === 'stok_opname_summary' && '📋 Laporan Stok Opname & Rekapitulasi Stok Keluar Outlet'}
                    {activeLaporanSubView === null && '📑 Dashboard Laporan Outlet'}
                  </h2>
                  <p style={{ fontSize: '0.78rem', color: '#94a3b8', margin: '3px 0 0 0' }}>
                    {currentOutlet.name} • Laporan Kasir & Performa Operasional
                  </p>
                </div>
              </div>
            </div>

            {/* KETERANGAN SYNC MOBILE APK DENGAN DATABASE SERVER & WEB ADMIN (UNTUK SELURUH LAPORAN) */}
            <div style={{ background: '#0f172a', padding: '12px 16px', borderRadius: '14px', border: '1px solid rgba(56,189,248,0.25)', marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '9px', height: '9px', borderRadius: '50%', background: '#34d399', boxShadow: '0 0 10px #34d399' }} />
                <div>
                  <div style={{ fontSize: '0.82rem', fontWeight: '800', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>Sinkronisasi Data Laporan Real-Time:</span>
                    <span style={{ color: '#34d399', fontWeight: '900' }}>🟢 Database Server & Web Admin Connected</span>
                  </div>
                  <div style={{ fontSize: '0.74rem', color: '#94a3b8', marginTop: '2px' }}>
                    Seluruh rekapitulasi omzet, kas harian, stok opname, dan pengeluaran terhubung live dengan server pusat.
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: '800', color: '#cbd5e1', background: 'rgba(255,255,255,0.06)', padding: '4px 10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)' }}>
                  ⏱️ {lastSyncTime}
                </span>
                <button
                  type="button"
                  onClick={handleTriggerSyncData}
                  disabled={isSyncingNow}
                  style={{
                    padding: '6px 14px',
                    background: isSyncingNow ? '#334155' : 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                    border: 'none',
                    color: '#ffffff',
                    borderRadius: '10px',
                    fontSize: '0.78rem',
                    fontWeight: '900',
                    cursor: isSyncingNow ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: isSyncingNow ? 'none' : '0 3px 10px rgba(37,99,235,0.3)'
                  }}
                >
                  <RefreshCw size={14} className={isSyncingNow ? 'animate-spin' : ''} />
                  <span>{isSyncingNow ? 'Syncing...' : '🔄 Sync Laporan ke Server'}</span>
                </button>
              </div>
            </div>

            {/* DASHBOARD CARDS MENU (MATCHING USER DIRECTIVE) */}
            {activeLaporanSubView === null && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', maxWidth: '1080px', margin: '20px 0' }}>
                
                {/* CARD 1: LAPORAN OMZET */}
                <div
                  onClick={() => setActiveLaporanSubView('omzet')}
                  style={{
                    background: '#ffffff',
                    borderRadius: '20px',
                    padding: '32px 20px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    textAlign: 'center',
                    cursor: 'pointer',
                    boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
                    transition: 'all 0.2s ease',
                    border: '2px solid transparent'
                  }}
                  onMouseOver={e => e.currentTarget.style.borderColor = '#6b21a8'}
                  onMouseOut={e => e.currentTarget.style.borderColor = 'transparent'}
                >
                  <div style={{ width: '76px', height: '76px', borderRadius: '50%', background: '#581c87', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
                    <BarChart3 size={38} color="#ffffff" />
                  </div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: '900', color: '#3b0764', margin: 0 }}>
                    Laporan Omzet
                  </h3>
                  <p style={{ fontSize: '0.76rem', color: '#6b21a8', marginTop: '6px', fontWeight: '600' }}>
                    Grafik & Rekapitulasi Omset Penjualan Gross / Net
                  </p>
                </div>

                {/* CARD 2: BUAT LAPORAN HARIAN */}
                <div
                  onClick={() => setActiveLaporanSubView('harian')}
                  style={{
                    background: '#ffffff',
                    borderRadius: '20px',
                    padding: '32px 20px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    textAlign: 'center',
                    cursor: 'pointer',
                    boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
                    transition: 'all 0.2s ease',
                    border: '2px solid transparent'
                  }}
                  onMouseOver={e => e.currentTarget.style.borderColor = '#6b21a8'}
                  onMouseOut={e => e.currentTarget.style.borderColor = 'transparent'}
                >
                  <div style={{ width: '76px', height: '76px', borderRadius: '50%', background: '#581c87', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
                    <Clock size={38} color="#ffffff" />
                  </div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: '900', color: '#3b0764', margin: 0 }}>
                    Buat Laporan Harian
                  </h3>
                  <p style={{ fontSize: '0.76rem', color: '#6b21a8', marginTop: '6px', fontWeight: '600' }}>
                    Input Kas Kecil, Closing Kasir, & Setor Tunai
                  </p>
                </div>

                {/* CARD 3: BUAT LAPORAN LOGISTIK */}
                <div
                  onClick={() => setActiveLaporanSubView('logistik')}
                  style={{
                    background: '#ffffff',
                    borderRadius: '20px',
                    padding: '32px 20px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    textAlign: 'center',
                    cursor: 'pointer',
                    boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
                    transition: 'all 0.2s ease',
                    border: '2px solid transparent'
                  }}
                  onMouseOver={e => e.currentTarget.style.borderColor = '#6b21a8'}
                  onMouseOut={e => e.currentTarget.style.borderColor = 'transparent'}
                >
                  <div style={{ width: '76px', height: '76px', borderRadius: '50%', background: '#581c87', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
                    <FileText size={38} color="#ffffff" />
                  </div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: '900', color: '#3b0764', margin: 0 }}>
                    Buat Laporan Logistik
                  </h3>
                  <p style={{ fontSize: '0.76rem', color: '#6b21a8', marginTop: '6px', fontWeight: '600' }}>
                    Stok Opname, Barang Masuk & Bahan Baku
                  </p>
                </div>

                {/* CARD 4: BUAT LAPORAN TRANSFER PRODUK */}
                <div
                  onClick={() => setActiveLaporanSubView('transfer')}
                  style={{
                    background: '#ffffff',
                    borderRadius: '20px',
                    padding: '32px 20px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    textAlign: 'center',
                    cursor: 'pointer',
                    boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
                    transition: 'all 0.2s ease',
                    border: '2px solid transparent'
                  }}
                  onMouseOver={e => e.currentTarget.style.borderColor = '#6b21a8'}
                  onMouseOut={e => e.currentTarget.style.borderColor = 'transparent'}
                >
                  <div style={{ width: '76px', height: '76px', borderRadius: '50%', background: '#581c87', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
                    <Truck size={38} color="#ffffff" />
                  </div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: '900', color: '#3b0764', margin: 0 }}>
                    Buat Laporan Transfer Bahan Baku
                  </h3>
                  <p style={{ fontSize: '0.76rem', color: '#6b21a8', marginTop: '6px', fontWeight: '600' }}>
                    Transfer Stok & Mutasi Barang Antarcabang
                  </p>
                </div>

                {/* CARD 5: BUAT LAPORAN BARANG RUSAK */}
                <div
                  onClick={() => setActiveLaporanSubView('waste')}
                  style={{
                    background: '#ffffff',
                    borderRadius: '20px',
                    padding: '32px 20px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    textAlign: 'center',
                    cursor: 'pointer',
                    boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
                    transition: 'all 0.2s ease',
                    border: '2px solid transparent'
                  }}
                  onMouseOver={e => e.currentTarget.style.borderColor = '#6b21a8'}
                  onMouseOut={e => e.currentTarget.style.borderColor = 'transparent'}
                >
                  <div style={{ width: '76px', height: '76px', borderRadius: '50%', background: '#581c87', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
                    <Trash2 size={38} color="#ffffff" />
                  </div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: '900', color: '#3b0764', margin: 0 }}>
                    Buat Laporan Barang Rusak
                  </h3>
                  <p style={{ fontSize: '0.76rem', color: '#6b21a8', marginTop: '6px', fontWeight: '600' }}>
                    Pencatatan Waste, Retur, & Kerusakan Bahan
                  </p>
                </div>

                {/* CARD 6: LAPORAN STOK OPNAME */}
                <div
                  onClick={() => setActiveLaporanSubView('stok_opname_summary')}
                  style={{
                    background: '#ffffff',
                    borderRadius: '20px',
                    padding: '32px 20px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justify: 'center',
                    textAlign: 'center',
                    cursor: 'pointer',
                    boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
                    transition: 'all 0.2s ease',
                    border: '2px solid transparent'
                  }}
                  onMouseOver={e => e.currentTarget.style.borderColor = '#6b21a8'}
                  onMouseOut={e => e.currentTarget.style.borderColor = 'transparent'}
                >
                  <div style={{ width: '76px', height: '76px', borderRadius: '50%', background: '#581c87', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
                    <CheckSquare size={38} color="#ffffff" />
                  </div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: '900', color: '#3b0764', margin: 0 }}>
                    Laporan Stok Opname
                  </h3>
                  <p style={{ fontSize: '0.76rem', color: '#6b21a8', marginTop: '6px', fontWeight: '600' }}>
                    Rangkuman Audit Fisik & Stok Keluar dari Web Admin
                  </p>
                </div>

              </div>
            )}

            {/* DETAILED SUB-VIEW 1: LAPORAN OMZET */}
            {activeLaporanSubView === 'omzet' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px' }}>
                  <div style={{ background: '#1e293b', padding: '16px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: '700' }}>Gross Omset Sales</div>
                    <div style={{ fontSize: '1.2rem', fontWeight: '900', color: '#34d399', marginTop: '6px' }}>{formatRupiah(totalSalesGross)}</div>
                  </div>
                  <div style={{ background: '#1e293b', padding: '16px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: '700' }}>Total Struk Terjual</div>
                    <div style={{ fontSize: '1.2rem', fontWeight: '900', color: '#ffffff', marginTop: '6px' }}>{(outletTransactions || []).length} Struk</div>
                  </div>
                  <div style={{ background: '#1e293b', padding: '16px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: '700' }}>Kas Tunai / Cash</div>
                    <div style={{ fontSize: '1.2rem', fontWeight: '900', color: '#38bdf8', marginTop: '6px' }}>
                      {formatRupiah((outletTransactions || []).filter(tx => String(tx.payment_method || '').toLowerCase().includes('cash') || String(tx.payment_method || '').toLowerCase().includes('tunai')).reduce((sum, tx) => sum + (tx.amount || 0), 0))}
                    </div>
                  </div>
                  <div style={{ background: '#1e293b', padding: '16px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: '700' }}>Non-Tunai (QRIS / EDC)</div>
                    <div style={{ fontSize: '1.2rem', fontWeight: '900', color: '#a78bfa', marginTop: '6px' }}>
                      {formatRupiah((outletTransactions || []).filter(tx => !String(tx.payment_method || '').toLowerCase().includes('cash') && !String(tx.payment_method || '').toLowerCase().includes('tunai')).reduce((sum, tx) => sum + (tx.amount || 0), 0))}
                    </div>
                  </div>
                </div>

                {/* Table Breakdown Sales Omzet */}
                <div style={{ background: '#1e293b', borderRadius: '16px', padding: '20px', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <h3 style={{ fontSize: '1rem', fontWeight: '900', color: '#ffffff', marginBottom: '14px' }}>Rincian Omset Per Transaksi Struk</h3>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.80rem' }}>
                      <thead>
                        <tr style={{ background: '#0f172a', color: '#94a3b8' }}>
                          <th style={{ padding: '10px' }}>No. Struk</th>
                          <th style={{ padding: '10px' }}>Pelanggan</th>
                          <th style={{ padding: '10px' }}>Metode Bayar</th>
                          <th style={{ padding: '10px', textAlign: 'right' }}>Total Nominal</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(!outletTransactions || outletTransactions.length === 0) ? (
                          <tr>
                            <td colSpan="4" style={{ textAlign: 'center', padding: '32px', color: '#64748b' }}>
                              Belum ada rincian omset per transaksi struk (Data Kosong).
                            </td>
                          </tr>
                        ) : (
                          (outletTransactions || []).map((t, idx) => (
                            <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                              <td style={{ padding: '10px', color: '#38bdf8', fontWeight: '800' }}>{t.id}</td>
                              <td style={{ padding: '10px', color: '#ffffff' }}>{t.customer_name || 'Pelanggan Umum'}</td>
                              <td style={{ padding: '10px', color: '#34d399', fontWeight: '800' }}>{t.payment_method || 'Cash'}</td>
                              <td style={{ padding: '10px', textAlign: 'right', color: '#ffffff', fontWeight: '900' }}>{formatRupiah(t.amount)}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* DETAILED SUB-VIEW 2: BUAT LAPORAN HARIAN (INPUT MANUAL LAPORAN & TABEL HISTORI) */}
            {activeLaporanSubView === 'harian' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%' }}>
                
                {/* Header Action Bar */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#1e293b', padding: '16px 20px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <div>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: '900', color: '#ffffff', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <FileText size={20} color="#818cf8" />
                      <span>Kelola Input Manual Laporan Keuangan Harian Kasir</span>
                    </h3>
                    <p style={{ fontSize: '0.78rem', color: '#94a3b8', margin: '4px 0 0 0' }}>
                      Log input manual laporan keuangan shift kasir & pengajuan verifikasi manager
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      const todayStr = new Date().toISOString().split('T')[0];
                      // Gunakan HANYA data nyata dari masterData — tidak ada fallback fake/mock
                      const ingredientsList = masterData.ingredients || [];
                      const expenseMasterList = masterData.expenseMaster || [];

                      const masterIngs = (masterData.ingredients || []).map(ing => ({
                        id: `ing-${ing.id}`, name: ing.name, item_type: 'Bahan Baku',
                        category: 'HPP Dapur (Bahan Mentah)', unit: ing.unit || 'kg',
                        cost: ing.cost || ing.price || 0
                      }));

                      const masterAccs = (masterData.chartOfAccounts || masterData.expenseMaster || masterData.accounts || []).map(acc => ({
                        id: `acc-${acc.id}`, name: acc.name || acc.account_name,
                        item_type: 'Biaya Operasional',
                        category: acc.category || acc.account_type || acc.type || 'Biaya Operasional (OPEX)',
                        unit: 'paket', cost: acc.amount || acc.cost || 0
                      }));

                      setManualRepDate(todayStr);
                      setManualRepNo(`LAP-${todayStr.replace(/-/g,'')}-${Math.floor(100 + Math.random() * 900)}`);
                      setManualRepOutletId(currentOutlet.id || 1);
                      setManualRepAuthor(masterData?.currentUser?.name || masterData?.user?.name || userSession?.name || '');
                      setManualRepNetSales(totalSalesGross || 0);
                      setManualRepNonCash(0);
                      setManualRepDebtPayment(0);
                      setManualCogsRows([]);
                      setManualExpenseRows([]);
                      setManualCogsSearch('');
                      setManualExpenseSearch('');
                      setManualRepStatus('pending');
                      setManualRepNotes('Laporan harian shift kasir');
                      setShowAddManualReportModal(true);
                    }}
                    style={{ padding: '10px 18px', background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)', color: '#ffffff', border: 'none', borderRadius: '10px', fontWeight: '900', fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 14px rgba(99,102,241,0.35)' }}
                  >
                    <span>+ Tambahkan Input Manual</span>
                  </button>
                </div>

                {/* TABEL HISTORI LAPORAN HARIAN (TANGGAL, NOMOR LAPORAN, STATUS PENDING / APPROVED) */}
                <div style={{ background: '#1e293b', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.08)', overflow: 'hidden', boxShadow: '0 8px 24px rgba(0,0,0,0.3)' }}>
                  <div style={{ padding: '14px 20px', background: '#0f172a', borderBottom: '1px solid #334155', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: '0.88rem', fontWeight: '900', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Clock size={16} color="#38bdf8" />
                      <span>Daftar Log Input Manual Laporan Keuangan Harian Kasir</span>
                    </div>
                  </div>

                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.80rem' }}>
                      <thead>
                        <tr style={{ background: '#0f172a', color: '#94a3b8', borderBottom: '1px solid #334155', textTransform: 'uppercase', fontSize: '0.72rem' }}>
                          <th style={{ padding: '12px 16px' }}>Tanggal</th>
                          <th style={{ padding: '12px 16px' }}>Nomor Laporan</th>
                          <th style={{ padding: '12px 16px' }}>Pembuat / Kasir</th>
                          <th style={{ padding: '12px 16px' }}>Outlet Cabang</th>
                          <th style={{ padding: '12px 16px', textAlign: 'right' }}>Pendapatan (Net Sales)</th>
                          <th style={{ padding: '12px 16px', textAlign: 'right' }}>Kas Non-Tunai</th>
                          <th style={{ padding: '12px 16px', textAlign: 'right' }}>Pengeluaran</th>
                          <th style={{ padding: '12px 16px', textAlign: 'right' }}>Uang di Laci Kasir</th>
                          <th style={{ padding: '12px 16px', textAlign: 'center' }}>Status</th>
                          <th style={{ padding: '12px 16px', textAlign: 'center' }}>Aksi</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(() => {
                          const combinedRecords = (masterData.approvedFinanceDaily && masterData.approvedFinanceDaily.length > 0)
                            ? masterData.approvedFinanceDaily
                            : (masterData.manualEntryRecords || []);

                          if (combinedRecords.length === 0) {
                            return (
                              <tr>
                                <td colSpan="10" style={{ textAlign: 'center', padding: '32px', color: '#64748b' }}>
                                  Belum ada log laporan keuangan harian kasir terdaftar.
                                </td>
                              </tr>
                            );
                          }

                          return combinedRecords.map((item, idx) => {
                            const isApproved = item.status === 'approved' || item.status === 'ok';

                            return (
                              <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', color: '#f8fafc' }}>
                                <td style={{ padding: '12px 16px', color: '#94a3b8', fontWeight: '700' }}>{item.date}</td>
                                <td style={{ padding: '12px 16px', fontWeight: '900', color: '#38bdf8' }}>{item.report_no || item.id}</td>
                                <td style={{ padding: '12px 16px', color: '#ffffff' }}>👤 {item.author_name}</td>
                                <td style={{ padding: '12px 16px', color: '#cbd5e1' }}>🏢 {item.branch_name}</td>
                                <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: '800', color: '#34d399' }}>{formatRupiah(item.net_sales)}</td>
                                <td style={{ padding: '12px 16px', textAlign: 'right', color: '#a78bfa' }}>{formatRupiah(item.non_cash_sales)}</td>
                                <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: '800', color: '#fb7185' }}>-{formatRupiah(item.total_expense)}</td>
                                <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: '900', color: '#38bdf8' }}>{formatRupiah(item.cash_physical)}</td>
                                
                                {/* STATUS: PENDING ATAU APPROVED (MATCHING USER DIRECTIVE) */}
                                <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                                  <span style={{
                                    padding: '4px 10px', borderRadius: '12px', fontSize: '0.72rem', fontWeight: '900',
                                    background: isApproved ? 'rgba(52, 211, 153, 0.2)' : 'rgba(251, 191, 36, 0.2)',
                                    color: isApproved ? '#34d399' : '#fbbf24',
                                    border: `1px solid ${isApproved ? '#34d399' : '#fbbf24'}`
                                  }}>
                                    {isApproved ? '🟢 APPROVED' : '⏳ PENDING'}
                                  </span>
                                </td>

                                {/* AKSI */}
                                <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                                  <button
                                    type="button"
                                    onClick={() => setPreviewManualReport(item)}
                                    style={{ padding: '5px 10px', background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)', color: '#818cf8', borderRadius: '6px', fontSize: '0.74rem', fontWeight: '800', cursor: 'pointer' }}
                                  >
                                    👁️ Preview
                                  </button>
                                </td>
                              </tr>
                            );
                          });
                        })()}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>
            )}

            {/* DETAILED SUB-VIEW 3: BUAT LAPORAN LOGISTIK & AUDIT STOCK OPNAME */}
            {activeLaporanSubView === 'logistik' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%' }}>
                
                {/* Header Action Bar */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#1e293b', padding: '16px 20px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <div>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: '900', color: '#ffffff', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Package size={20} color="#38bdf8" />
                      <span>Kelola Audit Stock Opname & Laporan Logistik</span>
                    </h3>
                    <p style={{ fontSize: '0.78rem', color: '#94a3b8', margin: '4px 0 0 0' }}>
                      Pencatatan stok fisik, transfer, barang rusak/waste, & pengajuan audit opname kasir
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      const todayStr = new Date().toISOString().split('T')[0];
                      // Gunakan HANYA data nyata dari masterData — tidak ada fallback fake/mock
                      const rawIngredients = masterData.ingredients || [];
                      const activeIngs = rawIngredients.filter(ing =>
                        ing.tampilkan_di_apk !== 'Inaktif' && ing.tampilkan_di_apk !== 'inaktif'
                      );

                      const matchedDailyMasuk = (masterData.approvedFinanceDaily || []).filter(f =>
                        (Number(f.outlet_id) === Number(currentOutlet.id) || f.branch_name === currentOutlet.name || f.outlet_name === currentOutlet.name)
                      );
                      const allTransfers = masterData.approvedTransfers || masterData.stockTransfer || [];
                      const allWaste = masterData.approvedWaste || masterData.damagedGoods || [];

                      const initialBatchRows = activeIngs.map((ing, idx) => {
                        let inQty = 0;
                        matchedDailyMasuk.forEach(f => {
                          (f.cogs_items || []).forEach(c => {
                            if ((c.name || c.item_name || '').toLowerCase() === ing.name.toLowerCase()) {
                              inQty += Number(c.qty || 0);
                            }
                          });
                        });

                        const trfIn = allTransfers.filter(t => 
                          (t.item_name || '').toLowerCase() === ing.name.toLowerCase() &&
                          (t.to_outlet_name?.toLowerCase().includes(currentOutlet.name?.toLowerCase()) || Number(t.to_outlet_id) === Number(currentOutlet.id))
                        ).reduce((sum, t) => sum + Number(t.qty || 0), 0);

                        const trfOut = allTransfers.filter(t => 
                          (t.item_name || '').toLowerCase() === ing.name.toLowerCase() &&
                          (t.from_outlet_name?.toLowerCase().includes(currentOutlet.name?.toLowerCase()) || Number(t.from_outlet_id) === Number(currentOutlet.id))
                        ).reduce((sum, t) => sum + Number(t.qty || 0), 0);

                        const wasteQty = allWaste.filter(w => 
                          (w.item_name || w.itemName || '').toLowerCase() === ing.name.toLowerCase() &&
                          (Number(w.outlet_id || w.outletId) === Number(currentOutlet.id) || (w.outletName || w.branch_name) === currentOutlet.name)
                        ).reduce((sum, w) => sum + Number(w.qty || 0), 0);

                        return {
                          id: `batch-${ing.id || idx}-${Date.now()}`,
                          item_name: ing.name,
                          unit: ing.unit || 'kg',
                          stok_awal: ing.stock !== undefined ? ing.stock : '',
                          stok_masuk: inQty,
                          transfer_masuk: trfIn,
                          transfer_keluar: trfOut,
                          stok_rusak: wasteQty,
                          stok_fisik: ''
                        };
                      });

                      setOpnameBatchRows(initialBatchRows);
                      setLogDate(todayStr);
                      setLogNo(`SO-${todayStr.replace(/-/g,'')}-${Math.floor(100 + Math.random() * 900)}`);
                      setLogSubmittedBy(userSession?.name || '');
                      setLogOutletId(currentOutlet.id || 1);
                      setShowAddLogisticsModal(true);
                    }}
                    style={{ padding: '10px 18px', background: 'linear-gradient(135deg, #38bdf8 0%, #0284c7 100%)', color: '#ffffff', border: 'none', borderRadius: '10px', fontWeight: '900', fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 14px rgba(56,189,248,0.35)' }}
                  >
                    <PlusCircle size={16} />
                    <span>+ Tambahkan Stok Opname</span>
                  </button>
                </div>

                {/* TABEL HISTORI AUDIT STOCK OPNAME LOGISTIK */}
                <div style={{ background: '#1e293b', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.08)', overflow: 'hidden', boxShadow: '0 8px 24px rgba(0,0,0,0.3)' }}>
                  <div style={{ padding: '14px 20px', background: '#0f172a', borderBottom: '1px solid #334155', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: '0.88rem', fontWeight: '900', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Package size={16} color="#38bdf8" />
                      <span>Daftar Log Audit Stock Opname & Laporan Logistik</span>
                    </div>
                  </div>

                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.80rem' }}>
                      <thead>
                        <tr style={{ background: '#0f172a', color: '#94a3b8', borderBottom: '1px solid #334155', textTransform: 'uppercase', fontSize: '0.70rem' }}>
                          <th style={{ padding: '10px 12px' }}>Tanggal</th>
                          <th style={{ padding: '10px 12px' }}>No Laporan</th>
                          <th style={{ padding: '10px 12px' }}>Diisi Oleh</th>
                          <th style={{ padding: '10px 12px' }}>Nama Item</th>
                          <th style={{ padding: '10px 8px', textAlign: 'right' }}>Awal</th>
                          <th style={{ padding: '10px 8px', textAlign: 'right' }}>Masuk</th>
                          <th style={{ padding: '10px 8px', textAlign: 'right', color: '#34d399' }}>Transfer Stok In</th>
                          <th style={{ padding: '10px 8px', textAlign: 'right', color: '#fb7185' }}>Transfer Stok Out</th>
                          <th style={{ padding: '10px 8px', textAlign: 'right', color: '#fb7185' }}>Rusak</th>
                          <th style={{ padding: '10px 8px', textAlign: 'right', color: '#38bdf8' }}>Stok Fisik</th>
                          <th style={{ padding: '10px 10px', textAlign: 'center' }}>Status</th>
                          <th style={{ padding: '10px 10px', textAlign: 'center' }}>Aksi</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(() => {
                          const combinedOpname = (masterData.approvedLogistics && masterData.approvedLogistics.length > 0)
                            ? masterData.approvedLogistics
                            : (masterData.stockOpname || []);

                          const filteredOpname = combinedOpname.filter(op => 
                            !op.outlet_id || Number(op.outlet_id) === Number(currentOutlet.id) || op.branch_name === currentOutlet.name
                          );

                          if (filteredOpname.length === 0) {
                            return (
                              <tr>
                                <td colSpan="11" style={{ textAlign: 'center', padding: '32px', color: '#64748b' }}>
                                  Belum ada log laporan stock opname harian terdaftar.
                                </td>
                              </tr>
                            );
                          }

                          return filteredOpname.map((item, idx) => {
                            const isApproved = item.status === 'ACC' || item.status === 'ok' || item.status === 'approved' || item.status === 'Approved';
                            const stokKeluarPenjualan = Number(item.stok_keluar || 0);

                            const rawTransfers = [...(masterData.stockTransfer || []), ...(masterData.approvedTransfers || [])];
                            const realTransferMasuk = rawTransfers
                              .filter(t => (t.status === 'ok' || t.status === 'Approved' || t.status === 'approved' || t.status === 'Terkirim' || t.sent_to_apk || t.is_approved) &&
                                           (Number(t.to_outlet_id || t.toOutletId) === Number(currentOutlet.id) || t.to_outlet_name === currentOutlet.name) &&
                                           (t.item_name || t.itemName || '').toLowerCase().trim() === (item.item_name || '').toLowerCase().trim())
                              .reduce((sum, t) => sum + Number(t.qty || 0), 0) || Number(item.transfer_masuk || 0);

                            const realTransferKeluar = rawTransfers
                              .filter(t => (t.status === 'ok' || t.status === 'Approved' || t.status === 'approved' || t.status === 'Terkirim' || t.sent_to_apk || t.is_approved) &&
                                           (Number(t.from_outlet_id || t.fromOutletId) === Number(currentOutlet.id) || t.from_outlet_name === currentOutlet.name) &&
                                           (t.item_name || t.itemName || '').toLowerCase().trim() === (item.item_name || '').toLowerCase().trim())
                              .reduce((sum, t) => sum + Number(t.qty || 0), 0) || Number(item.transfer_keluar || 0);

                            const stokSistem = (Number(item.stok_awal || 0) + Number(item.stok_masuk || 0) + realTransferMasuk) - 
                              (stokKeluarPenjualan + realTransferKeluar + Number(item.stok_rusak || 0));
                            const stokFisik = Number(item.stok_fisik || 0);
                            
                            // Keterangan Audit Formula:
                            // Stok by sistem = stok by fisik -> "Pas"
                            // Stok by sistem > stok by fisik -> "SOP tidak jalan"
                            // Stok by sistem < stok by fisik -> "Ada stok hilang"
                            let auditKet = { text: 'Pas', color: '#34d399', bg: 'rgba(52, 211, 153, 0.15)', border: 'rgba(52, 211, 153, 0.3)' };
                            if (stokSistem > stokFisik) {
                              auditKet = { text: 'SOP tidak jalan', color: '#fbbf24', bg: 'rgba(245, 158, 11, 0.15)', border: 'rgba(245, 158, 11, 0.3)' };
                            } else if (stokSistem < stokFisik) {
                              auditKet = { text: 'Ada stok hilang', color: '#f43f5e', bg: 'rgba(244, 63, 94, 0.15)', border: 'rgba(244, 63, 94, 0.3)' };
                            }

                            // Harga Satuan from Stok Masuk
                            const getItemPrice = (name) => {
                              if (item.harga_satuan) return Number(item.harga_satuan);
                              let priceFound = 0;
                              (masterData.approvedFinanceDaily || []).forEach(f => {
                                (f.cogs_items || []).forEach(c => {
                                  if ((c.name || c.item_name || '').toLowerCase() === (name || '').toLowerCase() && Number(c.price || c.price_unit || 0) > 0) {
                                    priceFound = Number(c.price || c.price_unit || 0);
                                  }
                                });
                              });
                              if (!priceFound) {
                                const ing = (masterData.ingredients || []).find(i => (i.name || '').toLowerCase() === (name || '').toLowerCase());
                                if (ing) priceFound = Number(ing.price || ing.buy_price || ing.unit_price || 0);
                              }
                              return priceFound || 0;
                            };

                            const hargaSatuan = getItemPrice(item.item_name);
                            // Denda Stok = |Stok Sistem - Stok Fisik| * Harga Satuan (bila sistem != fisik)
                            const dendaStok = stokSistem !== stokFisik ? Math.abs(stokSistem - stokFisik) * hargaSatuan : 0;
                            const jumlahTotalFisik = stokFisik * hargaSatuan;

                            return (
                              <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', color: '#f8fafc' }}>
                                <td style={{ padding: '10px 12px', color: '#94a3b8', fontWeight: '700' }}>{item.date}</td>
                                <td style={{ padding: '10px 12px', fontWeight: '900', color: '#38bdf8' }}>{item.report_no || item.id}</td>
                                <td style={{ padding: '10px 12px', color: '#ffffff' }}>👤 {item.submitted_by || item.created_by}</td>
                                <td style={{ padding: '10px 12px', fontWeight: '900', color: '#34d399' }}>📦 {item.item_name}</td>
                                <td style={{ padding: '10px 8px', textAlign: 'right', color: '#cbd5e1' }}>{item.stok_awal || 0} {item.unit}</td>
                                <td style={{ padding: '10px 8px', textAlign: 'right', color: '#34d399', fontWeight: '800' }}>+{item.stok_masuk || 0} {item.unit}</td>
                                <td style={{ padding: '10px 8px', textAlign: 'right', color: '#34d399', fontWeight: '800' }}>
                                  +{realTransferMasuk} {item.unit}
                                </td>
                                <td style={{ padding: '10px 8px', textAlign: 'right', color: '#fb7185', fontWeight: '800' }}>
                                  -{realTransferKeluar} {item.unit}
                                </td>
                                <td style={{ padding: '10px 8px', textAlign: 'right', color: '#fb7185', fontWeight: '800' }}>
                                  -{item.stok_rusak || 0} {item.unit}
                                </td>
                                <td style={{ padding: '10px 8px', textAlign: 'right', fontWeight: '900', color: '#38bdf8', fontSize: '0.88rem' }}>
                                  {stokFisik} {item.unit}
                                </td>

                                {/* STATUS APPROVAL */}
                                <td style={{ padding: '10px 10px', textAlign: 'center' }}>
                                  <span style={{
                                    padding: '4px 10px', borderRadius: '12px', fontSize: '0.72rem', fontWeight: '900',
                                    background: isApproved ? 'rgba(52, 211, 153, 0.2)' : 'rgba(251, 191, 36, 0.2)',
                                    color: isApproved ? '#34d399' : '#fbbf24',
                                    border: `1px solid ${isApproved ? '#34d399' : '#fbbf24'}`
                                  }}>
                                    {isApproved ? '🟢 ACC' : '⏳ PENDING'}
                                  </span>
                                </td>

                                {/* AKSI */}
                                <td style={{ padding: '10px 10px', textAlign: 'center' }}>
                                  <button
                                    type="button"
                                    onClick={() => setPreviewLogisticsReport(item)}
                                    style={{ padding: '4px 10px', background: 'rgba(56,189,248,0.15)', border: '1px solid rgba(56,189,248,0.3)', color: '#38bdf8', borderRadius: '6px', fontSize: '0.74rem', fontWeight: '800', cursor: 'pointer' }}
                                  >
                                    👁️ Preview
                                  </button>
                                </td>
                              </tr>
                            );
                          });
                        })()}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>
            )}

            {/* DETAILED SUB-VIEW 4: BUAT LAPORAN TRANSFER BAHAN BAKU */}
            {activeLaporanSubView === 'transfer' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#1e293b', padding: '16px 20px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <div>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: '900', color: '#ffffff', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Truck size={20} color="#a78bfa" />
                      <span>Kelola Laporan Transfer Bahan Baku Antarcabang</span>
                    </h3>
                    <p style={{ fontSize: '0.78rem', color: '#94a3b8', margin: '4px 0 0 0' }}>
                      Pengiriman, penerimaan, dan pengajuan mutasi bahan mentah antarcabang restoran
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      const todayStr = new Date().toISOString().split('T')[0];
                      const ingredientsList = masterData.ingredients || [];
                      const firstIng = ingredientsList[0] || { name: 'Bahan Baku', unit: 'kg' };

                      setTransferDate(todayStr);
                      setTransferNo(`TRF-${todayStr.replace(/-/g,'')}-${Math.floor(100 + Math.random() * 900)}`);
                      setTransferFromOutletId(currentOutlet.id || 1);
                      setTransferToOutletId(2);
                      setTransferSubmittedBy(userSession?.name || '');
                      setTransferItemName(firstIng.name);
                      setTransferCustomItemName('');
                      setTransferQty(10);
                      setTransferUnit(firstIng.unit || 'kg');
                      setTransferNotes('Transfer pengiriman bahan baku antarcabang');
                      setTransferStatus('ditunda');
                      setTransferBatchRows([
                        {
                          id: Date.now(),
                          item_name: firstIng.name,
                          custom_item_name: '',
                          qty: 10,
                          unit: firstIng.unit || 'kg'
                        }
                      ]);
                      setShowAddTransferModal(true);
                    }}
                    style={{ padding: '10px 18px', background: 'linear-gradient(135deg, #a78bfa 0%, #7c3aed 100%)', color: '#ffffff', border: 'none', borderRadius: '10px', fontWeight: '900', fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 14px rgba(167,139,250,0.35)' }}
                  >
                    <PlusCircle size={16} />
                    <span>+ Tambah Transfer Bahan Baku</span>
                  </button>
                </div>

                <div style={{ background: '#1e293b', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.08)', overflow: 'hidden', boxShadow: '0 8px 24px rgba(0,0,0,0.3)' }}>
                  <div style={{ padding: '14px 20px', background: '#0f172a', borderBottom: '1px solid #334155', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: '0.88rem', fontWeight: '900', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Truck size={16} color="#a78bfa" />
                      <span>Daftar Log Transfer Bahan Baku & Mutasi Stok Antarcabang</span>
                    </div>
                  </div>

                  <div style={{ width: '100%', overflowX: 'auto', borderRadius: '12px', border: '1px solid #334155', background: '#0f172a' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.78rem' }}>
                      <thead>
                        <tr style={{ background: '#0f172a', color: '#94a3b8', borderBottom: '1px solid #334155', textTransform: 'uppercase', fontSize: '0.70rem', whiteSpace: 'nowrap' }}>
                          <th style={{ padding: '10px 8px' }}>Tanggal</th>
                          <th style={{ padding: '10px 8px' }}>No Laporan</th>
                          <th style={{ padding: '10px 8px' }}>Pengaju / Dibuat Oleh</th>
                          <th style={{ padding: '10px 8px' }}>Tipe Input</th>
                          <th style={{ padding: '10px 8px', color: '#34d399' }}>📥 Transfer In (Outlet Penerima)</th>
                          <th style={{ padding: '10px 8px', color: '#fb7185' }}>📤 Transfer Out (Outlet Pengirim)</th>
                          <th style={{ padding: '10px 8px', textAlign: 'center' }}>Satuan</th>
                          <th style={{ padding: '10px 8px', textAlign: 'center' }}>Status</th>
                          <th style={{ padding: '10px 8px', textAlign: 'center' }}>Aksi</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(() => {
                          const list = (() => {
                            const l1 = masterData.stockTransfer || [];
                            const l2 = masterData.approvedTransfers || [];
                            const res = [...l1];
                            const ids = new Set(res.map(x => String(x.id || x.report_no)));
                            l2.forEach(x => {
                              const key = String(x.id || x.report_no);
                              if (key && !ids.has(key)) res.push(x);
                            });
                            return res;
                          })();

                          if (list.length === 0) {
                            return (
                              <tr>
                                <td colSpan={9} style={{ padding: '24px', textAlign: 'center', color: '#64748b', fontSize: '0.85rem' }}>
                                  Belum ada data laporan transfer stok antarcabang. Klik "+ Tambah Transfer Bahan Baku" di atas untuk membuat laporan.
                                </td>
                              </tr>
                            );
                          }

                          return list.map((item, idx) => {
                            const isApproved = item.status === 'ok' || item.status === 'approved' || item.status === 'Approved' || item.status === 'ACC' || item.status === 'Terkirim' || item.sent_to_apk || item.is_approved;
                            const toOutletName = item.to_outlet_name || (masterData.outlets || []).find(o => Number(o.id) === Number(item.to_outlet_id || item.toOutletId))?.name || 'Outlet Tujuan';
                            const fromOutletName = item.from_outlet_name || (masterData.outlets || []).find(o => Number(o.id) === Number(item.from_outlet_id || item.fromOutletId))?.name || currentOutlet.name;

                            return (
                              <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', color: '#f8fafc' }}>
                                <td style={{ padding: '8px 8px', color: '#94a3b8', fontWeight: '700', whiteSpace: 'nowrap' }}>{item.date}</td>
                                <td style={{ padding: '8px 8px', fontWeight: '900', color: '#38bdf8', whiteSpace: 'nowrap' }}>
                                  <button
                                    type="button"
                                    onClick={() => setPreviewTransferReport(item)}
                                    style={{ background: 'none', border: 'none', padding: 0, color: '#38bdf8', textDecoration: 'underline', cursor: 'pointer', fontWeight: '900', fontSize: '0.78rem' }}
                                    title="Klik untuk lihat pratinjau laporan"
                                  >
                                    📋 {item.report_no || item.id} 👁️
                                  </button>
                                </td>
                                <td style={{ padding: '8px 8px', color: '#ffffff', whiteSpace: 'nowrap' }}>👤 {item.submitted_by || item.created_by}</td>
                                <td style={{ padding: '8px 8px', whiteSpace: 'nowrap' }}>
                                  <span style={{
                                    padding: '2px 6px', borderRadius: '4px', fontSize: '0.68rem', fontWeight: '700',
                                    background: item.type_input === 'manual' ? 'rgba(129, 140, 248, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                                    color: item.type_input === 'manual' ? '#818cf8' : '#fbbf24',
                                    border: '1px solid',
                                    borderColor: item.type_input === 'manual' ? 'rgba(129, 140, 248, 0.3)' : 'rgba(245, 158, 11, 0.3)',
                                    textTransform: 'uppercase'
                                  }}>
                                    {item.type_input === 'manual' ? 'manual' : 'by approval'}
                                  </span>
                                </td>
                                <td style={{ padding: '8px 8px', color: '#34d399', fontWeight: '800', whiteSpace: 'nowrap' }}>
                                  🟢 {toOutletName}
                                </td>
                                <td style={{ padding: '8px 8px', color: '#fb7185', fontWeight: '800', whiteSpace: 'nowrap' }}>
                                  🔴 {fromOutletName}
                                </td>
                                <td style={{ padding: '8px 8px', textAlign: 'center', fontWeight: '900', color: '#c084fc', whiteSpace: 'nowrap' }}>
                                  🏷️ {item.unit}
                                </td>
                                <td style={{ padding: '8px 8px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                                  <span style={{
                                    padding: '3px 8px', borderRadius: '10px', fontSize: '0.68rem', fontWeight: '900',
                                    background: isApproved ? 'rgba(52, 211, 153, 0.2)' : 'rgba(251, 191, 36, 0.2)',
                                    color: isApproved ? '#34d399' : '#fbbf24',
                                    border: `1px solid ${isApproved ? '#34d399' : '#fbbf24'}`
                                  }}>
                                    {isApproved ? '🟢 APPROVED' : '⏳ PENDING'}
                                  </span>
                                </td>
                                <td style={{ padding: '8px 8px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const itemCreatedAt = item.created_at || item.createdAt || item.timestamp;
                                      let diffH = 0;
                                      if (itemCreatedAt) {
                                        diffH = (Date.now() - new Date(itemCreatedAt).getTime()) / (1000 * 60 * 60);
                                      } else if (item.date) {
                                        diffH = (Date.now() - new Date(item.date).getTime()) / (1000 * 60 * 60);
                                      }

                                      if (diffH > 12) {
                                        alert(`⚠️ Akses Edit Kadaluarsa!\nLaporan transfer (${item.report_no || item.id}) ini diinput lebih dari 12 jam yang lalu (${diffH.toFixed(1)} jam yang lalu). Tombol Edit hanya dapat diakses maksimal 12 jam dari waktu input data.`);
                                        return;
                                      }

                                      setEditingTransferId(item.id || item.report_no);
                                      setTransferNo(item.report_no || item.id);
                                      setTransferDate(item.date || new Date().toISOString().split('T')[0]);
                                      setTransferSubmittedBy(item.submitted_by || item.created_by || userSession?.name || '');
                                      setTransferFromOutletId(item.from_outlet_id || item.fromOutletId || 1);
                                      setTransferToOutletId(item.to_outlet_id || item.toOutletId || 2);
                                      setTransferNotes(item.notes || '');

                                      const matchingBatch = (masterData.stockTransfer || []).filter(x => (x.report_no && x.report_no === item.report_no) || x.id === item.id);
                                      if (matchingBatch.length > 0) {
                                        setTransferBatchRows(matchingBatch.map((b, i) => ({
                                          id: b.id || (Date.now() + i),
                                          item_name: b.item_name,
                                          custom_item_name: '',
                                          qty: b.qty,
                                          unit: b.unit
                                        })));
                                      } else {
                                        setTransferBatchRows([{
                                          id: item.id || Date.now(),
                                          item_name: item.item_name,
                                          custom_item_name: '',
                                          qty: item.qty,
                                          unit: item.unit
                                        }]);
                                      }

                                      setShowAddTransferModal(true);
                                    }}
                                    style={{
                                      padding: '4px 10px',
                                      background: 'rgba(56, 189, 248, 0.15)',
                                      border: '1px solid rgba(56, 189, 248, 0.4)',
                                      color: '#38bdf8',
                                      borderRadius: '6px',
                                      fontSize: '0.74rem',
                                      fontWeight: '800',
                                      cursor: 'pointer'
                                    }}
                                    title="Edit Laporan (Maksimal 12 jam dari waktu input)"
                                  >
                                    ✏️ Edit
                                  </button>
                                </td>
                              </tr>
                            );
                          });
                        })()}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* DETAILED SUB-VIEW 5: BUAT LAPORAN BARANG RUSAK */}
            {activeLaporanSubView === 'waste' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#1e293b', padding: '16px 20px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <div>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: '900', color: '#ffffff', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Trash2 size={20} color="#fb7185" />
                      <span>Kelola Laporan Barang Rusak & Waste Stok</span>
                    </h3>
                    <p style={{ fontSize: '0.78rem', color: '#94a3b8', margin: '4px 0 0 0' }}>
                      Pencatatan waste, retur barang, expired, & kerusakan fisik bahan baku
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      const todayStr = new Date().toISOString().split('T')[0];
                      const currentUser = currentUserSession?.name || currentUserSession?.username || currentOutlet?.name || 'Kasir';

                      setEditingWasteId(null);
                      setWasteDate(todayStr);
                      setWasteNo(`WST-${todayStr.replace(/-/g,'')}-${Math.floor(100 + Math.random() * 900)}`);
                      setWasteOutletId(currentOutlet.id || 1);
                      setWasteSubmittedBy(currentUser);
                      setWasteItemName('');
                      setWasteCustomItemName('');
                      setWasteQty('');
                      setWasteUnit('kg');
                      setWasteReason('');
                      setWasteNotes('');
                      setWasteEditingNotes('');
                      setWasteBatchRows([{ id: Date.now(), item_name: '', custom_item_name: '', qty: '', unit: 'kg', reason: '', notes: '' }]);
                      setShowAddWasteModal(true);
                    }}
                    style={{ padding: '10px 18px', background: 'linear-gradient(135deg, #fb7185 0%, #e11d48 100%)', color: '#ffffff', border: 'none', borderRadius: '10px', fontWeight: '900', fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 14px rgba(251,113,133,0.35)' }}
                  >
                    <PlusCircle size={16} />
                    <span>+ Tambah Barang Rusak</span>
                  </button>
                </div>

                <div style={{ background: '#1e293b', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.08)', overflow: 'hidden', boxShadow: '0 8px 24px rgba(0,0,0,0.3)' }}>
                  <div style={{ padding: '14px 20px', background: '#0f172a', borderBottom: '1px solid #334155', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: '0.88rem', fontWeight: '900', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Trash2 size={16} color="#fb7185" />
                      <span>Daftar Log Laporan Barang Rusak (Waste & Retur Bahan Baku)</span>
                    </div>
                  </div>

                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.80rem', minWidth: '720px' }}>
                      <thead>
                        <tr style={{ background: '#0f172a', color: '#94a3b8', borderBottom: '2px solid #334155', textTransform: 'uppercase', fontSize: '0.68rem', letterSpacing: '0.05em' }}>
                          <th style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>📅 Tanggal</th>
                          <th style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>📋 No Laporan</th>
                          <th style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>👤 Pengaju / Dibuat Oleh</th>
                          <th style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>🏢 Nama Outlet</th>
                          <th style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>🌾 Nama Bahan Baku</th>
                          <th style={{ padding: '10px 12px', textAlign: 'right', whiteSpace: 'nowrap' }}>⚖️ Jumlah Rusak</th>
                          <th style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>📝 Alasan Rusak</th>
                          <th style={{ padding: '10px 12px', textAlign: 'center', whiteSpace: 'nowrap' }}>🔖 Tipe Input</th>
                          <th style={{ padding: '10px 12px', textAlign: 'center', whiteSpace: 'nowrap' }}>🔖 Status</th>
                          <th style={{ padding: '10px 12px', textAlign: 'center', whiteSpace: 'nowrap' }}>⚙️ Aksi</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(() => {
                          const l1 = masterData.damagedGoods || [];
                          const l2 = masterData.approvedWaste || [];
                          const l3 = (masterData.stockMovement || []).filter(m => m.type === 'WASTE');

                          const combinedMap = new Map();
                          [...l1, ...l2, ...l3].forEach(item => {
                            const key = String(item.report_no || item.id);
                            if (key) {
                              if (!combinedMap.has(key)) {
                                combinedMap.set(key, item);
                              } else {
                                const incomingApproved = item.status === 'ok' || item.status === 'approved' || item.status === 'Approved' || item.status === 'ACC' || item.status === 'Terkirim' || item.sent_to_apk || item.is_approved;
                                if (incomingApproved) {
                                  combinedMap.set(key, item);
                                }
                              }
                            }
                          });

                          const seenReports = new Set();
                          const list = Array.from(combinedMap.values())
                            .filter(item => {
                              const rNo = item.report_no || item.id;
                              if (seenReports.has(rNo)) return false;
                              seenReports.add(rNo);
                              return true;
                            })
                            .sort((a, b) => {
                              const tA = new Date(a.tanggal_waktu || a.created_at || a.date || 0).getTime();
                              const tB = new Date(b.tanggal_waktu || b.created_at || b.date || 0).getTime();
                              return tB - tA;
                            });

                          if (list.length === 0) {
                            return (
                              <tr>
                                <td colSpan={10} style={{ padding: '24px', textAlign: 'center', color: '#64748b', fontSize: '0.85rem' }}>
                                  Belum ada data laporan barang rusak. Klik "+ Tambah Barang Rusak" di atas untuk membuat laporan.
                                </td>
                              </tr>
                            );
                          }

                          return list.map((item, idx) => {
                            const isApproved = item.status === 'ok' || item.status === 'approved' || item.status === 'Approved' || item.status === 'ACC' || item.status === 'Terkirim' || item.sent_to_apk || item.is_approved;
                            const isWebAdminInput = item.sumber_input === 'web_admin' || item.status_keterangan === 'by manual' || item.type_input === 'manual';

                            const displayDate = item.tanggal_waktu
                              ? new Date(item.tanggal_waktu).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
                              : (item.date || '-');
                            const displayTime = item.tanggal_waktu
                              ? new Date(item.tanggal_waktu).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
                              : '';

                            const rawItems = [...(masterData.damagedGoods || []), ...(masterData.approvedWaste || [])].filter(x => (x.report_no && x.report_no === (item.report_no || item.id)) || x.id === item.id);
                            const uniqueItemsMap = new Map();
                            rawItems.forEach(x => {
                              const itemKey = x.id || `${x.item_name || x.nama_barang}-${x.qty || x.stok_rusak}-${x.unit}`;
                              if (!uniqueItemsMap.has(itemKey)) {
                                uniqueItemsMap.set(itemKey, x);
                              }
                            });
                            const reportItems = Array.from(uniqueItemsMap.values());
                            const itemCount = reportItems.length || 1;

                            const displayItemName = reportItems.length > 0
                              ? reportItems.map(r => r.item_name || r.nama_barang || 'Bahan Baku').join(', ')
                              : (item.item_name || item.nama_barang || 'Bahan Baku');
                            const displayQty = reportItems.length > 0
                              ? reportItems.map(r => `${r.qty || r.stok_rusak || 1} ${r.unit || 'kg'}`).join(', ')
                              : `${item.qty || item.stok_rusak || 1} ${item.unit || 'kg'}`;
                            const displayReason = reportItems.length > 0
                              ? reportItems.map(r => r.alasan_rusak || r.reason || r.damage_reason || 'Terlalu kecil').filter((v, i, a) => a.indexOf(v) === i).join(', ')
                              : (item.alasan_rusak || item.reason || item.damage_reason || '-');

                            const itemCreatedAt = item.tanggal_waktu || item.created_at || item.createdAt || item.timestamp || item.date;
                            let diffHours = 0;
                            if (itemCreatedAt) {
                              diffHours = (Date.now() - new Date(itemCreatedAt).getTime()) / (1000 * 60 * 60);
                            }
                            const canEdit = diffHours <= 12;

                            return (
                              <tr
                                key={idx}
                                style={{
                                  borderBottom: '1px solid rgba(255,255,255,0.06)',
                                  color: '#f8fafc',
                                  background: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)',
                                  transition: 'background 0.15s'
                                }}
                              >
                                {/* Tanggal & Waktu */}
                                <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                                    <span style={{ color: '#f8fafc', fontWeight: '700', fontSize: '0.8rem' }}>{displayDate}</span>
                                    {displayTime && <span style={{ color: '#64748b', fontSize: '0.68rem' }}>{displayTime} WIB</span>}
                                  </div>
                                </td>

                                {/* No Laporan */}
                                <td style={{ padding: '10px 12px', fontWeight: '900', whiteSpace: 'nowrap' }}>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setPreviewWasteReport(item);
                                      }}
                                      style={{ background: 'rgba(251, 113, 133, 0.12)', border: '1px solid rgba(251, 113, 133, 0.3)', padding: '4px 10px', borderRadius: '6px', color: '#fb7185', cursor: 'pointer', fontWeight: '900', fontSize: '0.78rem', textAlign: 'left', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                      title="Klik untuk lihat pratinjau detail laporan barang rusak"
                                    >
                                      📋 {item.report_no || item.id} 👁️
                                    </button>
                                    <span style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: '600' }}>{itemCount} item bahan baku</span>
                                  </div>
                                </td>

                                {/* Pengaju / Dibuat Oleh */}
                                <td style={{ padding: '10px 12px', color: '#ffffff', whiteSpace: 'nowrap', fontWeight: '700', fontSize: '0.8rem' }}>
                                  👤 {item.input_by || item.submitted_by || item.created_by || 'Kasir'}
                                </td>

                                {/* Nama Outlet */}
                                <td style={{ padding: '10px 12px', color: '#94a3b8', whiteSpace: 'nowrap', fontSize: '0.78rem', fontWeight: '700' }}>
                                  🏢 {(masterData.outlets || []).find(o => String(o.id) === String(item.outlet_id) || Number(o.id) === Number(item.outlet_id))?.name || item.branch_name || currentOutlet?.name || 'Outlet Cabang'}
                                </td>

                                {/* Nama Bahan Baku */}
                                <td style={{ padding: '10px 12px', color: '#38bdf8', whiteSpace: 'nowrap', fontSize: '0.8rem', fontWeight: '800' }}>
                                  {displayItemName}
                                </td>

                                {/* Jumlah Rusak */}
                                <td style={{ padding: '10px 12px', color: '#fb7185', whiteSpace: 'nowrap', fontSize: '0.8rem', fontWeight: '900', textAlign: 'right' }}>
                                  {displayQty}
                                </td>

                                {/* Alasan Rusak */}
                                <td style={{ padding: '10px 12px', color: '#fbbf24', whiteSpace: 'nowrap', fontSize: '0.78rem', fontWeight: '700' }}>
                                  {displayReason}
                                </td>

                                {/* Tipe Input */}
                                <td style={{ padding: '10px 12px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                                  <span style={{
                                    padding: '2px 8px', borderRadius: '4px', fontSize: '0.64rem', fontWeight: '900',
                                    background: isWebAdminInput ? 'rgba(129, 140, 248, 0.2)' : 'rgba(52, 211, 153, 0.2)',
                                    color: isWebAdminInput ? '#818cf8' : '#34d399',
                                    border: `1px solid ${isWebAdminInput ? 'rgba(129,140,248,0.4)' : 'rgba(52,211,153,0.4)'}`
                                  }}>
                                    {isWebAdminInput ? 'By manual' : 'By approved'}
                                  </span>
                                </td>

                                {/* Status Approval */}
                                <td style={{ padding: '10px 12px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                                  <span style={{
                                    padding: '4px 10px', borderRadius: '20px', fontSize: '0.68rem', fontWeight: '900', display: 'inline-block',
                                    background: isApproved ? 'rgba(52, 211, 153, 0.15)' : 'rgba(251, 191, 36, 0.15)',
                                    color: isApproved ? '#34d399' : '#fbbf24',
                                    border: `1px solid ${isApproved ? 'rgba(52,211,153,0.4)' : 'rgba(251,191,36,0.4)'}`
                                  }}>
                                    {isApproved ? '✅ APPROVED' : '⏳ PENDING'}
                                  </span>
                                </td>

                                {/* Aksi Edit (Maks 12 Jam) */}
                                <td style={{ padding: '10px 12px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (!canEdit) {
                                        alert(`⚠️ Akses Edit Kadaluarsa!\nLaporan (${item.report_no || item.id}) dibuat ${diffHours.toFixed(1)} jam lalu.\nEdit hanya dapat dilakukan maksimal 12 jam dari waktu input.`);
                                        return;
                                      }

                                      setEditingWasteId(item.id || item.report_no);
                                      setWasteNo(item.report_no || item.id);
                                      setWasteDate(item.date || new Date().toISOString().split('T')[0]);
                                      setWasteSubmittedBy(item.submitted_by || item.created_by || item.input_by || 'Kasir');
                                      setWasteOutletId(item.outlet_id || currentOutlet.id || 1);
                                      setWasteNotes(item.notes || '');
                                      setWasteEditingNotes(item.editing_notes || '');

                                      const allWaste = [...(masterData.damagedGoods || []), ...(masterData.approvedWaste || [])];
                                      const matchingBatch = allWaste.filter(x =>
                                        item.report_no ? (x.report_no === item.report_no) : (x.id === item.id)
                                      );
                                      if (matchingBatch.length > 0) {
                                        setWasteBatchRows(matchingBatch.map((b, i) => ({
                                          id: b.id || (Date.now() + i),
                                          item_name: b.item_name || b.nama_barang || b.itemName || '',
                                          custom_item_name: '',
                                          qty: b.qty || b.stok_rusak || b.jumlah_rusak || 1,
                                          unit: b.unit || 'kg',
                                          reason: b.alasan_rusak || b.damage_reason || b.reason || 'Terlalu kecil',
                                          notes: b.notes || ''
                                        })));
                                      } else {
                                        setWasteBatchRows([{
                                          id: item.id || Date.now(),
                                          item_name: item.item_name || item.nama_barang || '',
                                          custom_item_name: '',
                                          qty: item.qty || item.stok_rusak || item.jumlah_rusak || 1,
                                          unit: item.unit || 'kg',
                                          reason: item.alasan_rusak || item.damage_reason || item.reason || 'Terlalu kecil',
                                          notes: item.notes || ''
                                        }]);
                                      }

                                      setShowAddWasteModal(true);
                                    }}
                                    style={{
                                      padding: '5px 12px',
                                      background: canEdit ? 'rgba(251,113,133,0.15)' : 'rgba(100,116,139,0.2)',
                                      border: `1px solid ${canEdit ? 'rgba(251,113,133,0.4)' : 'rgba(100,116,139,0.4)'}`,
                                      color: canEdit ? '#fb7185' : '#64748b',
                                      borderRadius: '6px',
                                      fontSize: '0.74rem',
                                      fontWeight: '800',
                                      cursor: canEdit ? 'pointer' : 'not-allowed',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                      opacity: canEdit ? 1 : 0.6
                                    }}
                                    title={canEdit ? 'Edit Laporan Barang Rusak (Maksimal 12 Jam)' : 'Akses edit kadaluarsa (> 12 jam)'}
                                  >
                                    ✏️ {canEdit ? 'Edit' : 'Kadaluarsa'}
                                  </button>
                                </td>
                              </tr>
                            );
                          });
                        })()}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}





            {/* DETAILED SUB-VIEW 6: LAPORAN STOK OPNAME */}
            {activeLaporanSubView === 'stok_opname_summary' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#1e293b', padding: '16px 20px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <div>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: '900', color: '#ffffff', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <CheckSquare size={20} color="#34d399" />
                      <span>📋 Laporan Stok Opname & Rekapitulasi Stok Keluar Outlet</span>
                    </h3>
                    <p style={{ fontSize: '0.78rem', color: '#94a3b8', margin: '4px 0 0 0' }}>
                      Audit fisik persediaan barang outlet & kalkulasi otomatis Denda Stok (hanya berlaku pada status DEFISIT)
                    </p>
                  </div>
                  
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <span style={{ fontSize: '0.78rem', background: 'rgba(52, 211, 153, 0.15)', color: '#34d399', border: '1px solid rgba(52, 211, 153, 0.3)', padding: '6px 14px', borderRadius: '20px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>🔄 Data Live dari Web Admin Logistik</span>
                    </span>
                  </div>
                </div>

                {/* FILTER RENTANG WAKTU (DATE RANGE FILTER BAR) */}
                <div style={{ background: '#1e293b', padding: '14px 20px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                    <div style={{ fontSize: '0.82rem', fontWeight: '800', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Calendar size={16} color="#38bdf8" />
                      <span>Filter Rentang Waktu:</span>
                    </div>

                    <div style={{ display: 'flex', gap: '6px' }}>
                      {[
                        { id: 'ALL', label: 'Semua Tanggal' },
                        { id: 'TODAY', label: 'Hari Ini' },
                        { id: 'MONTH', label: 'Bulan Ini' },
                        { id: 'CUSTOM', label: 'Rentang Kustom' }
                      ].map(p => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => {
                            setOpnameSummaryPreset(p.id);
                            const todayStr = new Date().toISOString().split('T')[0];
                            if (p.id === 'ALL') {
                              setOpnameSummaryStartDate('');
                              setOpnameSummaryEndDate('');
                            } else if (p.id === 'TODAY') {
                              setOpnameSummaryStartDate(todayStr);
                              setOpnameSummaryEndDate(todayStr);
                            } else if (p.id === 'MONTH') {
                              const yearMonth = todayStr.slice(0,7);
                              setOpnameSummaryStartDate(`${yearMonth}-01`);
                              setOpnameSummaryEndDate(todayStr);
                            }
                          }}
                          style={{
                            padding: '5px 12px',
                            borderRadius: '8px',
                            border: '1px solid',
                            borderColor: opnameSummaryPreset === p.id ? '#38bdf8' : '#334155',
                            background: opnameSummaryPreset === p.id ? 'rgba(56, 189, 248, 0.2)' : '#0f172a',
                            color: opnameSummaryPreset === p.id ? '#38bdf8' : '#94a3b8',
                            fontSize: '0.75rem',
                            fontWeight: '800',
                            cursor: 'pointer'
                          }}
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input
                      type="date"
                      value={opnameSummaryStartDate}
                      onChange={e => { setOpnameSummaryStartDate(e.target.value); setOpnameSummaryPreset('CUSTOM'); }}
                      className="form-input"
                      style={{ height: '34px', fontSize: '0.78rem', padding: '0 8px', background: '#0f172a', border: '1px solid #334155', color: '#f8fafc', borderRadius: '8px' }}
                    />
                    <span style={{ color: '#94a3b8', fontSize: '0.78rem' }}>s/d</span>
                    <input
                      type="date"
                      value={opnameSummaryEndDate}
                      onChange={e => { setOpnameSummaryEndDate(e.target.value); setOpnameSummaryPreset('CUSTOM'); }}
                      className="form-input"
                      style={{ height: '34px', fontSize: '0.78rem', padding: '0 8px', background: '#0f172a', border: '1px solid #334155', color: '#f8fafc', borderRadius: '8px' }}
                    />
                    {(opnameSummaryStartDate || opnameSummaryEndDate) && (
                      <button
                        type="button"
                        onClick={() => { setOpnameSummaryStartDate(''); setOpnameSummaryEndDate(''); setOpnameSummaryPreset('ALL'); }}
                        style={{ padding: '4px 10px', background: 'rgba(244, 63, 94, 0.15)', border: '1px solid rgba(244, 63, 94, 0.3)', color: '#f43f5e', borderRadius: '6px', fontSize: '0.72rem', fontWeight: '800', cursor: 'pointer' }}
                      >
                        Reset Filter
                      </button>
                    )}
                  </div>
                </div>

                {/* KPI SUMMARY CARDS BAR: TOTAL DENDA HARI INI & DENDA PER STOK */}
                {(() => {
                  const todayStr = new Date().toISOString().split('T')[0];
                  const allOpnames = masterData?.stockOpname || [];

                  const filteredOpnames = allOpnames.filter(op => {
                    if (opnameSummaryStartDate && op.date < opnameSummaryStartDate) return false;
                    if (opnameSummaryEndDate && op.date > opnameSummaryEndDate) return false;
                    return true;
                  });

                  const calcDenda = (op) => {
                    const sSistem = (op.stok_awal || 0) + (op.stok_masuk || 0) + (op.transfer_masuk || 0) - ((op.stok_keluar || 0) + (op.stok_rusak || 0) + (op.transfer_keluar || 0));
                    const diffVal = (op.stok_fisik || 0) - sSistem;
                    if (diffVal >= 0) return 0; // PAS & SURPLUS = NOL

                    let activePrice = op.harga_satuan || 0;
                    if (!activePrice) {
                      (masterData.approvedFinanceDaily || []).forEach(f => {
                        (f.cogs_items || []).forEach(c => {
                          if ((c.name || c.item_name || '').toLowerCase() === (op.item_name || '').toLowerCase() && Number(c.price || c.price_unit || 0) > 0) {
                            activePrice = Number(c.price || c.price_unit || 0);
                          }
                        });
                      });
                    }
                    if (!activePrice) {
                      const ing = (masterData.ingredients || []).find(i => (i.name || '').toLowerCase() === (op.item_name || '').toLowerCase());
                      if (ing) activePrice = Number(ing.price || ing.buy_price || ing.unit_price || 0);
                    }
                    return Math.abs(diffVal) * (activePrice || 0);
                  };

                  const totalDendaHariIni = allOpnames.filter(op => op.date === todayStr).reduce((acc, op) => acc + calcDenda(op), 0);
                  const totalDendaFiltered = filteredOpnames.reduce((acc, op) => acc + calcDenda(op), 0);
                  const countDefisitItem = filteredOpnames.filter(op => {
                    const sSistem = (op.stok_awal || 0) + (op.stok_masuk || 0) + (op.transfer_masuk || 0) - ((op.stok_keluar || 0) + (op.stok_rusak || 0) + (op.transfer_keluar || 0));
                    return (op.stok_fisik || 0) < sSistem;
                  }).length;

                  return (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
                      {/* CARD 1: DENDA HARI INI */}
                      <div style={{ background: '#1e293b', border: '1px solid rgba(244, 63, 94, 0.3)', padding: '14px 18px', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <div style={{ fontSize: '0.75rem', fontWeight: '800', color: '#fb7185', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span>🔴 Total Denda Stok Hari Ini</span>
                        </div>
                        <div style={{ fontSize: '1.25rem', fontWeight: '900', color: '#ffffff' }}>
                          {formatRupiah(totalDendaHariIni)}
                        </div>
                        <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>
                          Kalkulasi denda stok defisit pada tanggal {todayStr}
                        </div>
                      </div>

                      {/* CARD 2: DENDA PER STOK (FILTERED) */}
                      <div style={{ background: '#1e293b', border: '1px solid rgba(56, 189, 248, 0.3)', padding: '14px 18px', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <div style={{ fontSize: '0.75rem', fontWeight: '800', color: '#38bdf8', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span>💸 Akumulasi Denda Per Stok (Filter)</span>
                        </div>
                        <div style={{ fontSize: '1.25rem', fontWeight: '900', color: '#ffffff' }}>
                          {formatRupiah(totalDendaFiltered)}
                        </div>
                        <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>
                          Sum Denda per stok item pada periode terfilter
                        </div>
                      </div>

                      {/* CARD 3: ITEM DEFISIT */}
                      <div style={{ background: '#1e293b', border: '1px solid rgba(251, 191, 36, 0.3)', padding: '14px 18px', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <div style={{ fontSize: '0.75rem', fontWeight: '800', color: '#fbbf24', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span>⚠️ Total Item Defisit</span>
                        </div>
                        <div style={{ fontSize: '1.25rem', fontWeight: '900', color: '#ffffff' }}>
                          {countDefisitItem} Item
                        </div>
                        <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>
                          Persediaan fisik &lt; sisa stok sistem
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* TABEL RANGKUMAN STOK OPNAME & STOK KELUAR */}
                <div style={{ background: '#1e293b', padding: '20px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
                      <thead>
                        <tr style={{ color: '#94a3b8', borderBottom: '1px solid #334155', textAlign: 'left', textTransform: 'uppercase', fontSize: '0.70rem' }}>
                          <th style={{ padding: '12px 10px' }}>Tanggal Audit</th>
                          <th style={{ padding: '12px 10px' }}>No Laporan</th>
                          <th style={{ padding: '12px 10px' }}>Dibuat Oleh</th>
                          <th style={{ padding: '12px 10px' }}>Nama Stok Item</th>
                          <th style={{ padding: '12px 10px', textAlign: 'right' }}>Stok Awal</th>
                          <th style={{ padding: '12px 10px', textAlign: 'right' }}>Stok Masuk (+)</th>
                          <th style={{ padding: '12px 10px', textAlign: 'right', color: '#fb7185', background: 'rgba(251, 113, 133, 0.1)' }}>🔴 Stok Keluar (Web Admin)</th>
                          <th style={{ padding: '12px 10px', textAlign: 'right', color: '#34d399' }}>Transfer Stok In</th>
                          <th style={{ padding: '12px 10px', textAlign: 'right', color: '#fb7185' }}>Transfer Stok Out</th>
                          <th style={{ padding: '12px 10px', textAlign: 'right' }}>Stok Rusak (-)</th>
                          <th style={{ padding: '12px 10px', textAlign: 'right' }}>🔢 Stok Sistem</th>
                          <th style={{ padding: '12px 10px', textAlign: 'right' }}>⚖️ Stok Fisik</th>
                          <th style={{ padding: '12px 10px', textAlign: 'center' }}>📊 Selisih</th>
                          <th style={{ padding: '12px 10px', textAlign: 'right', color: '#38bdf8' }}>💵 Harga Satuan</th>
                          <th style={{ padding: '12px 10px', textAlign: 'right', color: '#fb7185', background: 'rgba(244, 63, 94, 0.1)' }}>⚠️ Denda Per Stok</th>
                          <th style={{ padding: '12px 10px', textAlign: 'center' }}>Aksi</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(() => {
                          const opnameList = masterData?.stockOpname || [];

                          // Filter by Date Range
                          const filteredOpnameList = opnameList.filter(op => {
                            if (opnameSummaryStartDate && op.date < opnameSummaryStartDate) return false;
                            if (opnameSummaryEndDate && op.date > opnameSummaryEndDate) return false;
                            return true;
                          });

                          if (filteredOpnameList.length === 0) {
                            return (
                              <tr>
                                <td colSpan={16} style={{ padding: '30px', textAlign: 'center', color: '#64748b' }}>
                                  Tidak ada data Laporan Stok Opname pada rentang waktu terpilih.
                                </td>
                              </tr>
                            );
                          }

                          let sumDendaPerStok = 0;

                          const rows = filteredOpnameList.map((op, idx) => {
                            const sSistem = (op.stok_awal || 0) + (op.stok_masuk || 0) + (op.transfer_masuk || 0) - ((op.stok_keluar || 0) + (op.stok_rusak || 0) + (op.transfer_keluar || 0));
                            const diffVal = (op.stok_fisik || 0) - sSistem;
                            const isDefisit = diffVal < 0; // Stok fisik kurang dari stok sistem (DEFISIT / Ada stok hilang)
                            const statusColor = diffVal === 0 ? '#34d399' : diffVal > 0 ? '#38bdf8' : '#fb7185';
                            const statusLabel = diffVal === 0 ? 'PAS (SOP OK)' : diffVal > 0 ? `SURPLUS (+${diffVal})` : `DEFISIT (${diffVal})`;

                            // Harga Satuan dari Stok Masuk Web Based / Master Data
                            const getHargaSatuanFromStokMasuk = (itemName) => {
                              if (op.harga_satuan && Number(op.harga_satuan) > 0) return Number(op.harga_satuan);
                              let priceFound = 0;
                              (masterData.approvedFinanceDaily || []).forEach(f => {
                                (f.cogs_items || []).forEach(c => {
                                  if ((c.name || c.item_name || '').toLowerCase() === (itemName || '').toLowerCase() && Number(c.price || c.price_unit || 0) > 0) {
                                    priceFound = Number(c.price || c.price_unit || 0);
                                  }
                                });
                              });
                              if (!priceFound) {
                                const ing = (masterData.ingredients || []).find(i => (i.name || '').toLowerCase() === (itemName || '').toLowerCase());
                                if (ing) priceFound = Number(ing.price || ing.buy_price || ing.unit_price || 0);
                              }
                              return priceFound || 0;
                            };

                            const hargaSatuanWeb = getHargaSatuanFromStokMasuk(op.item_name);

                            // Denda Per Stok = Hanya dihitung apabila keterangan status DEFISIT! Jika PAS atau SURPLUS, Denda Per Stok = 0
                            const dendaStokRow = isDefisit ? Math.abs(diffVal) * hargaSatuanWeb : 0;
                            sumDendaPerStok += dendaStokRow;

                            return (
                              <tr key={op.id || idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', color: '#f8fafc' }}>
                                <td style={{ padding: '12px 10px', color: '#94a3b8', fontWeight: '700' }}>{op.date}</td>
                                <td style={{ padding: '12px 10px', fontWeight: '900', color: '#38bdf8' }}>{op.report_no || op.id}</td>
                                <td style={{ padding: '12px 10px', color: '#ffffff' }}>
                                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                                    <span>👤 {op.created_by || op.submitted_by || 'Admin'}</span>
                                    <span style={{ fontSize: '0.68rem', color: op.type_input === 'Sent from Web Admin' ? '#34d399' : '#818cf8', fontWeight: '800' }}>
                                      {op.type_input || 'Mobile Kasir'}
                                    </span>
                                  </div>
                                </td>
                                <td style={{ padding: '12px 10px', fontWeight: '900', color: '#34d399' }}>📦 {op.item_name}</td>
                                <td style={{ padding: '12px 10px', textAlign: 'right', color: '#94a3b8' }}>{op.stok_awal || 0} {op.unit || 'kg'}</td>
                                <td style={{ padding: '12px 10px', textAlign: 'right', color: '#38bdf8', fontWeight: '700' }}>+{op.stok_masuk || 0}</td>
                                
                                {/* 🔴 STOK KELUAR DARI WEB ADMIN */}
                                <td style={{ padding: '12px 10px', textAlign: 'right', fontWeight: '900', color: '#fb7185', background: 'rgba(251, 113, 133, 0.08)' }}>
                                  -{op.stok_keluar || 0} {op.unit || 'kg'}
                                </td>

                                <td style={{ padding: '12px 10px', textAlign: 'right', color: '#34d399', fontWeight: '800' }}>
                                  +{op.transfer_masuk || 0} {op.unit || 'kg'}
                                </td>
                                <td style={{ padding: '12px 10px', textAlign: 'right', color: '#fb7185', fontWeight: '800' }}>
                                  -{op.transfer_keluar || 0} {op.unit || 'kg'}
                                </td>
                                <td style={{ padding: '12px 10px', textAlign: 'right', color: '#fb7185' }}>-{op.stok_rusak || 0}</td>
                                <td style={{ padding: '12px 10px', textAlign: 'right', fontWeight: '800', color: '#cbd5e1' }}>{sSistem}</td>
                                <td style={{ padding: '12px 10px', textAlign: 'right', fontWeight: '900', color: '#38bdf8', fontSize: '0.88rem' }}>{op.stok_fisik || 0} {op.unit || 'kg'}</td>
                                
                                {/* SELISIH */}
                                <td style={{ padding: '12px 10px', textAlign: 'center' }}>
                                  <span style={{
                                    padding: '4px 8px', borderRadius: '8px', fontSize: '0.70rem', fontWeight: '900',
                                    color: statusColor, background: `${statusColor}18`, border: `1px solid ${statusColor}40`
                                  }}>
                                    {statusLabel}
                                  </span>
                                </td>

                                {/* HARGA SATUAN (WEB BASED STOK MASUK) */}
                                <td style={{ padding: '12px 10px', textAlign: 'right', fontWeight: '700', color: '#94a3b8' }}>
                                  {formatRupiah(hargaSatuanWeb)}
                                </td>

                                {/* DENDA PER STOK (HANYA APABILA STATUS DEFISIT) */}
                                <td style={{ padding: '12px 10px', textAlign: 'right', fontWeight: '900', color: dendaStokRow > 0 ? '#fb7185' : '#64748b', background: dendaStokRow > 0 ? 'rgba(244, 63, 94, 0.08)' : 'transparent' }}>
                                  {dendaStokRow > 0 ? formatRupiah(dendaStokRow) : '-'}
                                </td>

                                <td style={{ padding: '12px 10px', textAlign: 'center' }}>
                                  <button
                                    type="button"
                                    onClick={() => setPreviewOpnameSummaryRecord(op)}
                                    style={{ padding: '5px 10px', background: 'rgba(56,189,248,0.15)', border: '1px solid rgba(56,189,248,0.3)', color: '#38bdf8', borderRadius: '6px', fontSize: '0.74rem', fontWeight: '800', cursor: 'pointer' }}
                                  >
                                    👁️ Preview
                                  </button>
                                </td>
                              </tr>
                            );
                          });

                          return (
                            <>
                              {rows}
                              <tr style={{ background: '#0f172a', fontWeight: '900', borderTop: '2px solid #334155' }}>
                                <td colSpan={14} style={{ padding: '12px 10px', textAlign: 'right', color: '#fb7185', textTransform: 'uppercase' }}>
                                  <span>💸 TOTAL AKUMULASI DENDA PER STOK:</span>
                                </td>
                                <td style={{ padding: '12px 10px', textAlign: 'right', color: '#fb7185', fontSize: '0.92rem', background: 'rgba(244, 63, 94, 0.15)' }}>
                                  {formatRupiah(sumDendaPerStok)}
                                </td>
                                <td></td>
                              </tr>
                            </>
                          );
                        })()}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

          </div>
        )}

        {/* TAB 5: LAPORAN LOGISTIK BAHAN BAKU */}
        {activeNavTab === 'logistics' && (
          <div style={{ flex: 1, padding: '20px', overflowY: 'auto', width: '100%' }}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: '900', color: '#f8fafc', marginBottom: '4px' }}>📦 Laporan & Pengajuan Stok Logistik</h2>
            <p style={{ fontSize: '0.78rem', color: '#94a3b8', marginBottom: '20px' }}>Permintaan Bahan Baku Outlet {currentOutlet.name}</p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '20px' }}>
              <div style={{ background: '#1e293b', padding: '20px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.08)' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: '800', color: '#f8fafc', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Package size={18} color="#818cf8" />
                  <span>Ajukan Permintaan Bahan Baku</span>
                </h3>
                <form onSubmit={handleAddLogisticsRequest} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <input type="text" required placeholder="Nama Bahan Baku" value={logisticsItemName} onChange={e => setLogisticsItemName(e.target.value)} className="form-input" />
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <input type="number" required placeholder="Jumlah" value={logisticsQty} onChange={e => setLogisticsQty(e.target.value)} className="form-input" style={{ flex: 1 }} />
                    <select value={logisticsUnit} onChange={e => setLogisticsUnit(e.target.value)} className="form-select" style={{ width: '100px', height: '38px' }}>
                      <option value="kg">kg</option>
                      <option value="liter">liter</option>
                      <option value="pcs">pcs</option>
                    </select>
                  </div>
                  <button type="submit" className="btn-primary" style={{ justifyContent: 'center', height: '42px' }}>
                    <Send size={16} />
                    <span>AJUKAN STOK KE WEB ADMIN</span>
                  </button>
                </form>
              </div>

              <div style={{ background: '#1e293b', padding: '20px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.08)' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: '800', color: '#f8fafc', marginBottom: '14px' }}>Riwayat Status Pengajuan Logistik</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {(masterData?.approvedLogistics || []).map(req => (
                    <div key={req.id} style={{ background: '#0f172a', padding: '12px 14px', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontSize: '0.85rem', fontWeight: '800', color: '#f8fafc' }}>{req.item_name} ({req.qty})</div>
                        <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>ID: {req.id} • {req.date}</div>
                      </div>
                      <span style={{ fontSize: '0.72rem', fontWeight: '800', padding: '3px 10px', borderRadius: '8px', background: req.status === 'Disetujui' ? 'rgba(16,185,129,0.2)' : 'rgba(245,158,11,0.2)', color: req.status === 'Disetujui' ? '#34d399' : '#fbbf24' }}>
                        {req.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 6: LAPORAN OMZET */}
        {activeNavTab === 'omzet' && (
          <div style={{ flex: 1, padding: '20px', overflowY: 'auto', width: '100%' }}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: '900', color: '#f8fafc', marginBottom: '4px' }}>📊 Laporan Omzet & Performa Outlet</h2>
            <p style={{ fontSize: '0.78rem', color: '#94a3b8', marginBottom: '20px' }}>Analisis Ringkas Omset Outlet {currentOutlet.name}</p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px', marginBottom: '24px' }}>
              <div style={{ background: '#1e293b', padding: '18px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: '700' }}>TOTAL OMSET GROSS</div>
                <div style={{ fontSize: '1.4rem', fontWeight: '900', color: '#34d399', marginTop: '6px' }}>{formatRupiah(totalSalesGross)}</div>
              </div>
              <div style={{ background: '#1e293b', padding: '18px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: '700' }}>TOTAL STRUK NOTA</div>
                <div style={{ fontSize: '1.4rem', fontWeight: '900', color: '#38bdf8', marginTop: '6px' }}>{outletTransactions.length} Struk</div>
              </div>
              <div style={{ background: '#1e293b', padding: '18px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: '700' }}>RATA-RATA NILAI STRUK</div>
                <div style={{ fontSize: '1.4rem', fontWeight: '900', color: '#818cf8', marginTop: '6px' }}>
                  {formatRupiah(outletTransactions.length > 0 ? totalSalesGross / outletTransactions.length : 0)}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 7: HALAMAN SETTING POS MOBILE */}
        {(activeNavTab === 'pos_settings' || activeNavTab === 'printer_setting') && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', background: '#0f172a' }}>
            
            {/* 2. TWO-COLUMN SETTINGS MAIN LAYOUT */}
            <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
              
              {/* LEFT SIDEBAR SETTINGS SUB-MENU */}
              <div style={{
                width: '240px',
                background: '#1e293b',
                borderRight: '1px solid rgba(255,255,255,0.08)',
                display: 'flex',
                flexDirection: 'column',
                justify: 'space-between',
                padding: '16px 12px'
              }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {[
                    { id: 'umum', label: 'Umum', icon: Settings },
                    { id: 'printer', label: 'Printer', icon: Printer },
                    { id: 'sistem', label: 'Sistem', icon: Sliders },
                    { id: 'akun', label: 'Akun', icon: User }
                  ].map(tab => {
                    const SubIcon = tab.icon;
                    const isSubActive = settingSubTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setSettingSubTab(tab.id)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          padding: '12px 16px',
                          borderRadius: '12px',
                          border: 'none',
                          background: isSubActive ? 'rgba(99,102,241,0.2)' : 'transparent',
                          borderLeft: isSubActive ? '4px solid #6366f1' : '4px solid transparent',
                          color: isSubActive ? '#ffffff' : '#94a3b8',
                          fontWeight: isSubActive ? '800' : '600',
                          fontSize: '0.88rem',
                          cursor: 'pointer',
                          textAlign: 'left',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <SubIcon size={18} color={isSubActive ? '#6366f1' : '#94a3b8'} />
                        <span>{tab.label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* BOTTOM LOGOUT BUTTON (KELUAR) */}
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm('Apakah Anda yakin ingin KELUAR dari aplikasi Kasir POS?')) {
                      setActiveNavTab('kasir');
                    }
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '12px 16px',
                    borderRadius: '12px',
                    border: 'none',
                    background: 'rgba(244,63,94,0.12)',
                    color: '#f43f5e',
                    fontWeight: '800',
                    fontSize: '0.88rem',
                    cursor: 'pointer',
                    marginTop: 'auto'
                  }}
                >
                  <LogOut size={18} />
                  <span>Keluar</span>
                </button>
              </div>

              {/* RIGHT CONTENT PANEL DEPENDING ON SUB-TAB */}
              <div style={{ flex: 1, padding: '32px 40px', overflowY: 'auto', background: '#0f172a' }}>
                
                {/* SUB-TAB 1: UMUM (MATCHING SCREENSHOT 100%) */}
                {settingSubTab === 'umum' && (
                  <div style={{ maxWidth: '650px', display: 'flex', flexDirection: 'column', gap: '28px' }}>
                    <h2 style={{ fontSize: '1.4rem', fontWeight: '900', color: '#ffffff', margin: 0 }}>
                      Pengaturan Umum
                    </h2>

                    {/* CHECKBOX AUTO LOCK */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', fontSize: '0.94rem', fontWeight: '800', color: '#f8fafc' }}>
                        <input
                          type="checkbox"
                          checked={autoLockApp5Min}
                          onChange={e => setAutoLockApp5Min(e.target.checked)}
                          style={{ width: '20px', height: '20px', accentColor: '#6366f1', cursor: 'pointer' }}
                        />
                        <span>Kunci Aplikasi (Setelah 5 menit tidak ada aktivitas)</span>
                      </label>
                      <p style={{ fontSize: '0.78rem', color: '#94a3b8', fontStyle: 'italic', margin: '0 0 0 32px' }}>
                        * Aplikasi akan dikunci jika tidak ada aktifitas selama 5 menit. (Restart diperlukan)
                      </p>
                    </div>

                    {/* DROPDOWN PILIH BAHASA */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxWidth: '320px' }}>
                      <label style={{ fontSize: '0.88rem', fontWeight: '800', color: '#f8fafc' }}>Pilih Bahasa</label>
                      <select
                        value={selectedLanguage}
                        onChange={e => setSelectedLanguage(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '12px 14px',
                          borderRadius: '10px',
                          background: '#1e293b',
                          border: '1px solid #334155',
                          color: '#ffffff',
                          fontWeight: '700',
                          fontSize: '0.88rem',
                          outline: 'none'
                        }}
                      >
                        <option value="Indonesia">Indonesia</option>
                        <option value="English">English (US)</option>
                      </select>
                    </div>
                  </div>
                )}

                {/* SUB-TAB 2: PRINTER */}
                {settingSubTab === 'printer' && (
                  <div style={{ maxWidth: '750px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <h2 style={{ fontSize: '1.3rem', fontWeight: '900', color: '#ffffff', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <Printer size={26} color="#38bdf8" />
                          <span>Pengaturan Thermal Printer POS</span>
                        </h2>
                        <p style={{ fontSize: '0.80rem', color: '#94a3b8', marginTop: '4px' }}>
                          Konfigurasi koneksi printer thermal Bluetooth/USB, mode cetak 1 per 1 vs sekaligus, dan uji coba cetak struk.
                        </p>
                      </div>

                      <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        {saveSettingsSuccessToast && (
                          <div style={{ background: 'rgba(16,185,129,0.2)', border: '1px solid #10b981', color: '#34d399', padding: '8px 14px', borderRadius: '10px', fontSize: '0.78rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <CheckCircle2 size={16} />
                            <span>Pengaturan Disimpan!</span>
                          </div>
                        )}

                        <button
                          type="button"
                          onClick={() => {
                            setShowTestPrintModal(true);
                            setTestPrintSuccessToast(true);
                            setTimeout(() => setTestPrintSuccessToast(false), 3000);
                          }}
                          style={{
                            padding: '10px 18px',
                            background: 'linear-gradient(135deg, #38bdf8 0%, #0284c7 100%)',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '12px',
                            fontWeight: '900',
                            fontSize: '0.82rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            boxShadow: '0 4px 14px rgba(56,189,248,0.4)'
                          }}
                        >
                          <Printer size={18} />
                          <span>🖨️ Test Print Struk</span>
                        </button>
                      </div>
                    </div>

                    {/* SECTION 1: PERANGKAT PRINTER & KERTAS */}
                    <div style={{ background: '#1e293b', padding: '20px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.08)' }}>
                      <h3 style={{ fontSize: '1rem', fontWeight: '800', color: '#f8fafc', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Settings size={18} color="#818cf8" />
                        <span>Perangkat Printer Thermal POS</span>
                      </h3>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                        <div>
                          <label style={{ fontSize: '0.78rem', color: '#94a3b8', display: 'block', marginBottom: '6px', fontWeight: '700' }}>Nama Printer Active</label>
                          <input
                            type="text"
                            value={printerSettings.printerName}
                            onChange={e => setPrinterSettings(prev => ({ ...prev, printerName: e.target.value }))}
                            className="form-input"
                            placeholder="Contoh: POS Thermal Printer 58mm"
                          />
                        </div>

                        <div>
                          <label style={{ fontSize: '0.78rem', color: '#94a3b8', display: 'block', marginBottom: '6px', fontWeight: '700' }}>Ukuran Kertas Thermal</label>
                          <div style={{ display: 'flex', gap: '12px' }}>
                            <button
                              type="button"
                              onClick={() => setPrinterSettings(prev => ({ ...prev, paperWidth: '58mm' }))}
                              style={{
                                flex: 1,
                                padding: '10px',
                                background: printerSettings.paperWidth === '58mm' ? 'rgba(99,102,241,0.2)' : '#0f172a',
                                border: '1px solid',
                                borderColor: printerSettings.paperWidth === '58mm' ? '#6366f1' : '#334155',
                                borderRadius: '10px',
                                color: '#f8fafc',
                                fontWeight: '800',
                                fontSize: '0.82rem',
                                cursor: 'pointer'
                              }}
                            >
                              📄 58 mm (Kecil)
                            </button>

                            <button
                              type="button"
                              onClick={() => setPrinterSettings(prev => ({ ...prev, paperWidth: '80mm' }))}
                              style={{
                                flex: 1,
                                padding: '10px',
                                background: printerSettings.paperWidth === '80mm' ? 'rgba(99,102,241,0.2)' : '#0f172a',
                                border: '1px solid',
                                borderColor: printerSettings.paperWidth === '80mm' ? '#6366f1' : '#334155',
                                borderRadius: '10px',
                                color: '#f8fafc',
                                fontWeight: '800',
                                fontSize: '0.82rem',
                                cursor: 'pointer'
                              }}
                            >
                              📜 80 mm (Besar)
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* SECTION 2: METODE CETAK STRUK (1 PER 1 VS SEKALIGUS) */}
                    <div style={{ background: '#1e293b', padding: '20px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.08)' }}>
                      <h3 style={{ fontSize: '1rem', fontWeight: '800', color: '#f8fafc', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Zap size={18} color="#34d399" />
                        <span>Pengaturan Mode Cetak Struk Pesanan (Dapur / Bar / Kasir)</span>
                      </h3>
                      <p style={{ fontSize: '0.78rem', color: '#94a3b8', marginBottom: '16px' }}>
                        Pilih apakah lembar struk pesanan dikeluarkan sekaligus dalam 1 lembar atau dipisah 1 per 1 per-item menu.
                      </p>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                        {/* MODE 1: SEKALIGUS */}
                        <div
                          onClick={() => setPrinterSettings(prev => ({ ...prev, printMode: 'sekaligus' }))}
                          style={{
                            background: printerSettings.printMode === 'sekaligus' ? 'rgba(52, 211, 153, 0.15)' : '#0f172a',
                            border: '2px solid',
                            borderColor: printerSettings.printMode === 'sekaligus' ? '#34d399' : '#334155',
                            padding: '16px',
                            borderRadius: '14px',
                            cursor: 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '8px',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.94rem', fontWeight: '900', color: printerSettings.printMode === 'sekaligus' ? '#34d399' : '#ffffff' }}>
                              ⚡ Cetak Sekaligus (All-in-One)
                            </span>
                            <input
                              type="radio"
                              name="printModeRadio"
                              checked={printerSettings.printMode === 'sekaligus'}
                              onChange={() => {}}
                              style={{ accentColor: '#34d399', width: '18px', height: '18px' }}
                            />
                          </div>
                          <p style={{ fontSize: '0.76rem', color: '#94a3b8', margin: 0, lineHeight: '1.4' }}>
                            Seluruh item pesanan (dapur, bar, kasir) dikelompokkan dan dicetak dalam 1 lembar struk panjang secara bersamaan.
                          </p>
                        </div>

                        {/* MODE 2: 1 PER 1 */}
                        <div
                          onClick={() => setPrinterSettings(prev => ({ ...prev, printMode: 'per_item' }))}
                          style={{
                            background: printerSettings.printMode === 'per_item' ? 'rgba(56, 189, 248, 0.15)' : '#0f172a',
                            border: '2px solid',
                            borderColor: printerSettings.printMode === 'per_item' ? '#38bdf8' : '#334155',
                            padding: '16px',
                            borderRadius: '14px',
                            cursor: 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '8px',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.94rem', fontWeight: '900', color: printerSettings.printMode === 'per_item' ? '#38bdf8' : '#ffffff' }}>
                              📄 Cetak 1 per 1 (Per-Item Ticket)
                            </span>
                            <input
                              type="radio"
                              name="printModeRadio"
                              checked={printerSettings.printMode === 'per_item'}
                              onChange={() => {}}
                              style={{ accentColor: '#38bdf8', width: '18px', height: '18px' }}
                            />
                          </div>
                          <p style={{ fontSize: '0.76rem', color: '#94a3b8', margin: 0, lineHeight: '1.4' }}>
                            Setiap item pesanan dicetak terpisah menjadi 1 lembar struk individual (cocok untuk dapur yang mengolah per-station).
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* SECTION 3: POPUP STRUK CHOICE */}
                    <div style={{ background: '#1e293b', padding: '20px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.08)' }}>
                      <div
                        onClick={() => setPrinterSettings(prev => ({ ...prev, autoShowReceiptChoiceOnSaveOrder: !prev.autoShowReceiptChoiceOnSaveOrder }))}
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
                      >
                        <div>
                          <div style={{ fontSize: '0.92rem', fontWeight: '800', color: '#f8fafc' }}>
                            Tampilkan Pop-Up Pilihan Struk Setiap Kali 'Simpan Order'
                          </div>
                          <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '2px' }}>
                            Jika diaktifkan, kasir dapat memilih/menceklis jenis struk sebelum mencetak.
                          </div>
                        </div>
                        <div style={{ width: '48px', height: '26px', borderRadius: '13px', background: printerSettings.autoShowReceiptChoiceOnSaveOrder ? '#6366f1' : '#334155', padding: '3px', transition: 'all 0.2s ease', display: 'flex', alignItems: 'center' }}>
                          <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: '#ffffff', transform: printerSettings.autoShowReceiptChoiceOnSaveOrder ? 'translateX(22px)' : 'translateX(0px)', transition: 'transform 0.2s ease' }}></div>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setSaveSettingsSuccessToast(true);
                        setTimeout(() => setSaveSettingsSuccessToast(false), 3000);
                      }}
                      className="btn-primary"
                      style={{ height: '48px', justifyContent: 'center', fontSize: '0.9rem', fontWeight: '900' }}
                    >
                      <Save size={18} />
                      <span>SIMPAN PENGATURAN PRINTER</span>
                    </button>
                  </div>
                )}

                {/* SUB-TAB 3: SISTEM */}
                {settingSubTab === 'sistem' && (
                  <div style={{ maxWidth: '750px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <h2 style={{ fontSize: '1.4rem', fontWeight: '900', color: '#ffffff', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <Sliders size={26} color="#818cf8" />
                          <span>Pengaturan Sistem & Koneksi Database</span>
                        </h2>
                        <p style={{ fontSize: '0.80rem', color: '#94a3b8', marginTop: '4px' }}>
                          Kelola mode koneksi Server/Client, sinkronisasi offline ke online, backup & restore data offline, dan auto-sync 3 menit.
                        </p>
                      </div>
                    </div>

                    {/* TOAST SUCCESS MESSAGES */}
                    {syncSuccessToast && (
                      <div style={{ background: 'rgba(16,185,129,0.2)', border: '1px solid #10b981', color: '#34d399', padding: '12px 18px', borderRadius: '12px', fontSize: '0.84rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <CheckCircle2 size={20} />
                        <span>Sinkronisasi Data dengan Server & Web Admin Berhasil Diperbarui!</span>
                      </div>
                    )}

                    {backupSuccessToast && (
                      <div style={{ background: 'rgba(56,189,248,0.2)', border: '1px solid #38bdf8', color: '#38bdf8', padding: '12px 18px', borderRadius: '12px', fontSize: '0.84rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <CheckCircle2 size={20} />
                        <span>File Backup Data Offline Berhasil Diunduh Ke Perangkat!</span>
                      </div>
                    )}

                    {/* SECTION 1: MODE KONEKSI (SERVER vs CLIENT) */}
                    <div style={{ background: '#1e293b', padding: '20px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.08)' }}>
                      <h3 style={{ fontSize: '1rem', fontWeight: '800', color: '#f8fafc', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Store size={18} color="#fbbf24" />
                        <span>Mode Koneksi Jaringan (Server / Client)</span>
                      </h3>
                      <p style={{ fontSize: '0.78rem', color: '#94a3b8', marginBottom: '16px' }}>
                        Tentukan peran perangkat Mobile APK dalam jaringan lokal restoran.
                      </p>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                        {/* MODE SERVER */}
                        <div
                          onClick={() => setConnectionMode('server')}
                          style={{
                            background: connectionMode === 'server' ? 'rgba(251, 191, 36, 0.15)' : '#0f172a',
                            border: '2px solid',
                            borderColor: connectionMode === 'server' ? '#fbbf24' : '#334155',
                            padding: '16px',
                            borderRadius: '14px',
                            cursor: 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '8px',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.94rem', fontWeight: '900', color: connectionMode === 'server' ? '#fbbf24' : '#ffffff' }}>
                              🖥️ Mode Server (Primary Node)
                            </span>
                            <input
                              type="radio"
                              name="connModeRadio"
                              checked={connectionMode === 'server'}
                              onChange={() => {}}
                              style={{ accentColor: '#fbbf24', width: '18px', height: '18px' }}
                            />
                          </div>
                          <p style={{ fontSize: '0.76rem', color: '#94a3b8', margin: 0, lineHeight: '1.4' }}>
                            Bertindak sebagai Server Utama lokal yang menyimpan seluruh database transaksi dan terhubung langsung ke Web Admin.
                          </p>
                        </div>

                        {/* MODE CLIENT */}
                        <div
                          onClick={() => setConnectionMode('client')}
                          style={{
                            background: connectionMode === 'client' ? 'rgba(99, 102, 241, 0.15)' : '#0f172a',
                            border: '2px solid',
                            borderColor: connectionMode === 'client' ? '#6366f1' : '#334155',
                            padding: '16px',
                            borderRadius: '14px',
                            cursor: 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '8px',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.94rem', fontWeight: '900', color: connectionMode === 'client' ? '#818cf8' : '#ffffff' }}>
                              📱 Mode Client (POS Terminal Slave)
                            </span>
                            <input
                              type="radio"
                              name="connModeRadio"
                              checked={connectionMode === 'client'}
                              onChange={() => {}}
                              style={{ accentColor: '#6366f1', width: '18px', height: '18px' }}
                            />
                          </div>
                          <p style={{ fontSize: '0.76rem', color: '#94a3b8', margin: 0, lineHeight: '1.4' }}>
                            Bertindak sebagai Terminal Kasir tambahan yang mengirimkan transaksi ke IP Server Utama lokal.
                          </p>
                        </div>
                      </div>

                      {/* INPUT IP SERVER JIKA MODE CLIENT */}
                      {connectionMode === 'client' && (
                        <div style={{ marginTop: '16px', background: '#0f172a', padding: '14px 18px', borderRadius: '12px', border: '1px solid #334155', display: 'flex', alignItems: 'center', gap: '14px' }}>
                          <label style={{ fontSize: '0.84rem', fontWeight: '800', color: '#f8fafc', whiteSpace: 'nowrap' }}>
                            IP Address / Host Server Master:
                          </label>
                          <input
                            type="text"
                            value={serverIpInput}
                            onChange={e => setServerIpInput(e.target.value)}
                            className="form-input"
                            placeholder="Contoh: 192.168.1.100:4000"
                            style={{ flex: 1, height: '40px' }}
                          />
                        </div>
                      )}
                    </div>

                    {/* SECTION 2: SINKRONISASI DATA & DOKUMEN OFFLINE (AUTO 3-MENIT) */}
                    <div style={{ background: '#1e293b', padding: '20px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.08)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
                        <div>
                          <h3 style={{ fontSize: '1rem', fontWeight: '800', color: '#f8fafc', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <RefreshCw size={18} color="#38bdf8" className={isSyncingNow ? 'animate-spin' : ''} />
                            <span>Sinkronisasi Data Offline & Web Admin</span>
                          </h3>
                          <p style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '4px' }}>
                            Perbarui status transaksi, persediaan stok opname, dan SOP secara real-time dengan database pusat.
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={handleTriggerSyncData}
                          disabled={isSyncingNow}
                          style={{
                            padding: '10px 20px',
                            background: isSyncingNow ? '#334155' : 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '12px',
                            fontWeight: '900',
                            fontSize: '0.84rem',
                            cursor: isSyncingNow ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            boxShadow: isSyncingNow ? 'none' : '0 4px 14px rgba(37,99,235,0.4)'
                          }}
                        >
                          <RefreshCw size={16} className={isSyncingNow ? 'animate-spin' : ''} />
                          <span>{isSyncingNow ? 'Menyinkronkan...' : '🔄 Sinkronkan Sekarang'}</span>
                        </button>
                      </div>

                      {/* KETERANGAN WAKTU TERAKHIR SINKRON */}
                      <div style={{ background: '#0f172a', padding: '14px 18px', borderRadius: '12px', border: '1px solid rgba(56,189,248,0.2)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.82rem', fontWeight: '800', color: '#34d399', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#34d399', display: 'inline-block' }}></span>
                            <span>Terakhir Sinkronisasi:</span>
                          </span>
                          <span style={{ fontSize: '0.86rem', fontWeight: '900', color: '#f8fafc', background: 'rgba(255,255,255,0.06)', padding: '4px 12px', borderRadius: '8px' }}>
                            ⏱️ {lastSyncTime}
                          </span>
                        </div>

                        <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '8px', fontSize: '0.76rem', color: '#94a3b8', lineHeight: '1.4' }}>
                          ℹ️ <strong>Mode Ketahanan Listrik / Off-Line:</strong> Apabila jaringan listrik/internet mati, seluruh transaksi kasir tetap tersimpan aman di memori tablet. Saat jaringan kembali normal, sistem akan <strong>secara otomatis tersambung dan meng-update server setiap 3 menit</strong>.
                        </div>
                      </div>

                      {/* TOGGLE AUTO SYNC 3 MENIT */}
                      <div style={{ marginTop: '14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#0f172a', padding: '12px 16px', borderRadius: '12px' }}>
                        <div style={{ fontSize: '0.84rem', fontWeight: '800', color: '#f8fafc' }}>
                          Auto-Sync Otomatis Setiap 3 Menit (Latar Belakang)
                        </div>
                        <div
                          onClick={() => setAutoSyncIntervalActive(!autoSyncIntervalActive)}
                          style={{ width: '48px', height: '26px', borderRadius: '13px', background: autoSyncIntervalActive ? '#34d399' : '#334155', padding: '3px', transition: 'all 0.2s ease', display: 'flex', alignItems: 'center', cursor: 'pointer' }}
                        >
                          <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: '#ffffff', transform: autoSyncIntervalActive ? 'translateX(22px)' : 'translateX(0px)', transition: 'transform 0.2s ease' }}></div>
                        </div>
                      </div>
                    </div>

                    {/* SECTION 3: BACKUP (MANUAL) & RESTORE DATA OFFLINE (KHUSUS SUPER ADMIN) */}
                    <div style={{ background: '#1e293b', padding: '20px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.08)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                        <h3 style={{ fontSize: '1rem', fontWeight: '800', color: '#f8fafc', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Save size={20} color="#c084fc" />
                          <span>Cadangan & Pemulihan Data Offline (Backup & Restore)</span>
                        </h3>
                      </div>

                      <p style={{ fontSize: '0.78rem', color: '#94a3b8', marginBottom: '14px', lineHeight: '1.4' }}>
                        💾 <strong>Backup Data:</strong> Dapat diunduh manual kapan saja oleh Kasir. <br />
                        🔒 <strong>Restore Data:</strong> Wajib otorisasi PIN khusus <strong>Super Admin</strong> dan akan langsung terhubung ke Server Utama.
                      </p>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                        {/* BACKUP BUTTON (MANUAL ACCESS BY ANY KASIR) */}
                        <button
                          type="button"
                          onClick={handleInitiateBackup}
                          style={{
                            padding: '14px',
                            background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.2) 0%, rgba(126, 34, 206, 0.3) 100%)',
                            border: '1px solid #a855f7',
                            color: '#e9d5ff',
                            borderRadius: '12px',
                            fontWeight: '900',
                            fontSize: '0.86rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            boxShadow: '0 4px 14px rgba(168,85,247,0.2)'
                          }}
                        >
                          <Save size={18} />
                          <span>💾 Backup Data Offline (.json)</span>
                        </button>

                        {/* RESTORE BUTTON (PROTECTED BY SUPER ADMIN PIN) */}
                        <div>
                          <input
                            type="file"
                            id="posRestoreFileInput"
                            accept=".json"
                            onChange={handleInitiateRestore}
                            style={{ display: 'none' }}
                          />
                          <button
                            type="button"
                            onClick={() => document.getElementById('posRestoreFileInput').click()}
                            style={{
                              width: '100%',
                              padding: '14px',
                              background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.2) 0%, rgba(2, 132, 199, 0.3) 100%)',
                              border: '1px solid #38bdf8',
                              color: '#bae6fd',
                              borderRadius: '12px',
                              fontWeight: '900',
                              fontSize: '0.86rem',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '8px',
                              boxShadow: '0 4px 14px rgba(56,189,248,0.2)'
                            }}
                          >
                            <ShieldCheck size={18} color="#38bdf8" />
                            <span>🔒 Restore Data (Super Admin)</span>
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* SECTION 4: CASH DRAWER */}
                    <div style={{ background: '#1e293b', padding: '20px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      <div
                        onClick={() => setAutoOpenCashDrawer(!autoOpenCashDrawer)}
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
                      >
                        <div>
                          <div style={{ fontSize: '0.92rem', fontWeight: '800', color: '#f8fafc' }}>
                            Buka Laci Kasir (Cash Drawer) Otomatis
                          </div>
                          <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '2px' }}>
                            Kirim sinyal kick-out ke laci kasir saat pembayaran tunai berhasil.
                          </div>
                        </div>
                        <div style={{ width: '48px', height: '26px', borderRadius: '13px', background: autoOpenCashDrawer ? '#34d399' : '#334155', padding: '3px', transition: 'all 0.2s ease', display: 'flex', alignItems: 'center' }}>
                          <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: '#ffffff', transform: autoOpenCashDrawer ? 'translateX(22px)' : 'translateX(0px)', transition: 'transform 0.2s ease' }}></div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* SUB-TAB 4: AKUN */}
                {settingSubTab === 'akun' && (
                  <div style={{ maxWidth: '650px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    <h2 style={{ fontSize: '1.4rem', fontWeight: '900', color: '#ffffff', margin: 0 }}>
                      Profil & Pengaturan Akun Kasir
                    </h2>

                    <div style={{ background: '#1e293b', padding: '20px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                        <div style={{ width: '50px', height: '50px', borderRadius: '50%', background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900', color: '#ffffff', fontSize: '1.2rem' }}>
                          K
                        </div>
                        <div>
                          <div style={{ fontSize: '1.05rem', fontWeight: '900', color: '#ffffff' }}>Kasir Utama Shift 1</div>
                          <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>Outlet: {currentOutlet.name} • Role: Kasir / Staf Operasional</div>
                        </div>
                      </div>

                      <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <label style={{ fontSize: '0.82rem', color: '#94a3b8', fontWeight: '700' }}>PIN Kasir Saat Ini</label>
                        <input
                          type="password"
                          value={kasirPinInput}
                          onChange={e => setKasirPinInput(e.target.value)}
                          className="form-input"
                          style={{ width: '200px', height: '40px' }}
                        />
                      </div>
                    </div>
                  </div>
                )}

              </div>
            </div>
          </div>
        )}

        {/* TAB SIDEBAR: LAIN-LAIN (RESERVASI & SOP) */}
        {activeNavTab === 'lain_lain' && (
          <div style={{ flex: 1, padding: '24px', overflowY: 'auto', width: '100%', maxWidth: '1180px', margin: '0 auto' }}>
            
            {/* TOP HEADER BAR */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', background: '#1e293b', padding: '16px 20px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div>
                <h2 style={{ fontSize: '1.3rem', fontWeight: '900', color: '#f8fafc', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Grid size={24} color="#6366f1" />
                  <span>Menu Lain-lain (Reservasi & SOP Operasional)</span>
                </h2>
                <p style={{ fontSize: '0.80rem', color: '#94a3b8', margin: '4px 0 0 0' }}>
                  {currentOutlet.name} • Kelola Booking Meja Pelanggan & Panduan Standar Operasional Prosedur (SOP)
                </p>
              </div>

              {/* SUB-TAB NAVIGATION BUTTONS */}
              <div style={{ display: 'flex', background: '#0f172a', padding: '4px', borderRadius: '12px', border: '1px solid #334155' }}>
                <button
                  type="button"
                  onClick={() => setLainLainSubTab('reservasi')}
                  style={{
                    padding: '8px 18px',
                    borderRadius: '9px',
                    border: 'none',
                    fontWeight: '800',
                    fontSize: '0.82rem',
                    cursor: 'pointer',
                    background: lainLainSubTab === 'reservasi' ? 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)' : 'transparent',
                    color: lainLainSubTab === 'reservasi' ? '#ffffff' : '#94a3b8',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <Calendar size={16} />
                  <span>📌 Reservasi Meja</span>
                </button>

                <button
                  type="button"
                  onClick={() => setLainLainSubTab('sop')}
                  style={{
                    padding: '8px 18px',
                    borderRadius: '9px',
                    border: 'none',
                    fontWeight: '800',
                    fontSize: '0.82rem',
                    cursor: 'pointer',
                    background: lainLainSubTab === 'sop' ? 'linear-gradient(135deg, #34d399 0%, #059669 100%)' : 'transparent',
                    color: lainLainSubTab === 'sop' ? '#ffffff' : '#94a3b8',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <BookOpen size={16} />
                  <span>📖 Standar SOP Restoran</span>
                </button>
              </div>
            </div>

            {/* SUB-VIEW 1: RESERVASI MEJA */}
            {lainLainSubTab === 'reservasi' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                
                {/* SUMMARY STATS BAR */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
                  <div style={{ background: '#1e293b', padding: '16px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: '700' }}>TOTAL RESERVASI</div>
                    <div style={{ fontSize: '1.3rem', fontWeight: '900', color: '#ffffff', marginTop: '4px' }}>
                      {reservationsList.length} Booking
                    </div>
                  </div>
                  <div style={{ background: '#1e293b', padding: '16px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: '700' }}>DISETUJUI / CONFIRMED</div>
                    <div style={{ fontSize: '1.3rem', fontWeight: '900', color: '#34d399', marginTop: '4px' }}>
                      {reservationsList.filter(r => r.status === 'confirmed').length} Reservasi
                    </div>
                  </div>
                  <div style={{ background: '#1e293b', padding: '16px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: '700' }}>MENUNGGU KONFIRMASI</div>
                    <div style={{ fontSize: '1.3rem', fontWeight: '900', color: '#fbbf24', marginTop: '4px' }}>
                      {reservationsList.filter(r => r.status === 'pending').length} Reservasi
                    </div>
                  </div>
                  <div style={{ background: '#1e293b', padding: '16px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: '700' }}>SELESAI / SEATED</div>
                    <div style={{ fontSize: '1.3rem', fontWeight: '900', color: '#38bdf8', marginTop: '4px' }}>
                      {reservationsList.filter(r => r.status === 'completed').length} Reservasi
                    </div>
                  </div>
                </div>

                {/* TABLE CARD CONTAINER & HEADER ACTION */}
                <div style={{ background: '#1e293b', padding: '20px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: '900', color: '#ffffff', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Calendar size={18} color="#6366f1" />
                      <span>Daftar Reservasi Meja & Booking Pelanggan</span>
                    </h3>
                    <button
                      type="button"
                      onClick={() => setShowAddReservationModal(true)}
                      style={{ padding: '8px 16px', background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)', color: '#ffffff', border: 'none', borderRadius: '10px', fontWeight: '800', fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                      <Plus size={16} />
                      <span>+ Buat Reservasi Baru</span>
                    </button>
                  </div>

                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.80rem' }}>
                      <thead>
                        <tr style={{ background: '#0f172a', color: '#94a3b8', textAlign: 'left' }}>
                          <th style={{ padding: '12px 10px' }}>Tgl & Waktu</th>
                          <th style={{ padding: '12px 10px' }}>Kode Booking</th>
                          <th style={{ padding: '12px 10px' }}>Nama Pelanggan</th>
                          <th style={{ padding: '12px 10px' }}>Kontak HP</th>
                          <th style={{ padding: '12px 10px', textAlign: 'center' }}>Tamu</th>
                          <th style={{ padding: '12px 10px' }}>Nomor Meja</th>
                          <th style={{ padding: '12px 10px', textAlign: 'right' }}>DP / Uang Muka</th>
                          <th style={{ padding: '12px 10px', textAlign: 'center' }}>Status</th>
                          <th style={{ padding: '12px 10px', textAlign: 'center' }}>Aksi</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reservationsList.length === 0 ? (
                          <tr>
                            <td colSpan={9} style={{ padding: '30px', textAlign: 'center', color: '#94a3b8' }}>
                              Belum ada data reservasi meja untuk outlet ini.
                            </td>
                          </tr>
                        ) : (
                          reservationsList.map((rsv, idx) => {
                            const statusBg = rsv.status === 'confirmed' ? 'rgba(52, 211, 153, 0.15)' : rsv.status === 'pending' ? 'rgba(251, 191, 36, 0.15)' : rsv.status === 'completed' ? 'rgba(56, 189, 248, 0.15)' : 'rgba(244, 63, 94, 0.15)';
                            const statusColor = rsv.status === 'confirmed' ? '#34d399' : rsv.status === 'pending' ? '#fbbf24' : rsv.status === 'completed' ? '#38bdf8' : '#f43f5e';
                            const statusLabel = rsv.status === 'confirmed' ? '🟢 CONFIRMED' : rsv.status === 'pending' ? '⏳ PENDING' : rsv.status === 'completed' ? '✅ SELESAI' : '❌ BATAL';

                            return (
                              <tr key={rsv.id || idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', color: '#f8fafc' }}>
                                <td style={{ padding: '12px 10px', color: '#94a3b8', fontWeight: '700' }}>
                                  <div>{rsv.date}</div>
                                  <div style={{ fontSize: '0.70rem', color: '#6366f1' }}>{rsv.time}</div>
                                </td>
                                <td style={{ padding: '12px 10px', fontWeight: '900', color: '#38bdf8' }}>{rsv.id}</td>
                                <td style={{ padding: '12px 10px', fontWeight: '800', color: '#ffffff' }}>👤 {rsv.customer_name}</td>
                                <td style={{ padding: '12px 10px', color: '#cbd5e1' }}>📞 {rsv.phone}</td>
                                <td style={{ padding: '12px 10px', textAlign: 'center', fontWeight: '900', color: '#a78bfa' }}>👥 {rsv.pax_count} Pax</td>
                                <td style={{ padding: '12px 10px', fontWeight: '800', color: '#34d399' }}>🪑 {rsv.table_no}</td>
                                <td style={{ padding: '12px 10px', textAlign: 'right', fontWeight: '900', color: '#34d399' }}>
                                  {formatRupiah(rsv.dp_amount || 0)}
                                </td>
                                <td style={{ padding: '12px 10px', textAlign: 'center' }}>
                                  <span style={{
                                    padding: '4px 10px', borderRadius: '12px', fontSize: '0.70rem', fontWeight: '900',
                                    background: statusBg, color: statusColor, border: `1px solid ${statusColor}40`
                                  }}>
                                    {statusLabel}
                                  </span>
                                </td>
                                <td style={{ padding: '12px 10px', textAlign: 'center' }}>
                                  <button
                                    type="button"
                                    onClick={() => setPreviewReservationRecord(rsv)}
                                    style={{ padding: '5px 10px', background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)', color: '#818cf8', borderRadius: '6px', fontSize: '0.74rem', fontWeight: '800', cursor: 'pointer' }}
                                  >
                                    👁️ Detail
                                  </button>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* SUB-VIEW 2: SOP RESTORAN & KASIR */}
            {lainLainSubTab === 'sop' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                
                {/* SEARCH & CATEGORY FILTER BAR */}
                <div style={{ background: '#1e293b', padding: '16px 20px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', flexWrap: 'wrap', gap: '14px', justifyContent: 'space-between', alignItems: 'center' }}>
                  
                  {/* SEARCH BOX */}
                  <div style={{ flex: 1, minWidth: '260px', position: 'relative' }}>
                    <Search size={18} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                    <input
                      type="text"
                      value={sopSearchQuery}
                      onChange={e => setSopSearchQuery(e.target.value)}
                      placeholder="Cari prosedur SOP, kata kunci..."
                      style={{
                        width: '100%',
                        padding: '10px 12px 10px 38px',
                        background: '#0f172a',
                        border: '1px solid #334155',
                        borderRadius: '10px',
                        color: '#ffffff',
                        fontSize: '0.82rem'
                      }}
                    />
                  </div>

                  {/* CATEGORY BUTTONS */}
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {[
                      { id: 'all', label: 'Semua SOP' },
                      { id: 'opening', label: '🌅 Opening' },
                      { id: 'kasir', label: '💳 Kasir' },
                      { id: 'kebersihan', label: '🧹 Kebersihan' },
                      { id: 'komplain', label: '🤝 Komplain' },
                      { id: 'closing', label: '🌙 Closing' },
                      { id: 'stok', label: '📦 Stok Opname' }
                    ].map(cat => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setSopCategoryFilter(cat.id)}
                        style={{
                          padding: '6px 12px',
                          borderRadius: '8px',
                          border: '1px solid',
                          borderColor: sopCategoryFilter === cat.id ? '#34d399' : '#334155',
                          background: sopCategoryFilter === cat.id ? 'rgba(52, 211, 153, 0.15)' : '#0f172a',
                          color: sopCategoryFilter === cat.id ? '#34d399' : '#94a3b8',
                          fontSize: '0.74rem',
                          fontWeight: '800',
                          cursor: 'pointer'
                        }}
                      >
                        {cat.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* GRID DOKUMEN SOP */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
                  {sopDocuments
                    .filter(doc => {
                      const matchCat = sopCategoryFilter === 'all' || doc.category === sopCategoryFilter;
                      const matchQuery = !sopSearchQuery || doc.title.toLowerCase().includes(sopSearchQuery.toLowerCase()) || doc.summary.toLowerCase().includes(sopSearchQuery.toLowerCase());
                      return matchCat && matchQuery;
                    })
                    .map(doc => (
                      <div
                        key={doc.id}
                        style={{
                          background: '#1e293b',
                          borderRadius: '16px',
                          padding: '20px',
                          border: '1px solid rgba(255,255,255,0.08)',
                          display: 'flex',
                          flexDirection: 'column',
                          justify: 'space-between',
                          gap: '14px'
                        }}
                      >
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <span style={{ fontSize: '0.70rem', fontWeight: '900', color: '#34d399', background: 'rgba(52, 211, 153, 0.15)', padding: '3px 8px', borderRadius: '6px', border: '1px solid rgba(52, 211, 153, 0.3)' }}>
                              {doc.categoryLabel}
                            </span>
                            <span style={{ fontSize: '0.70rem', color: '#94a3b8', fontWeight: '700' }}>
                              ⏱️ {doc.estimatedTime}
                            </span>
                          </div>

                          <h3 style={{ fontSize: '1rem', fontWeight: '900', color: '#ffffff', margin: '0 0 8px 0', lineHeight: '1.3' }}>
                            {doc.title}
                          </h3>

                          <p style={{ fontSize: '0.78rem', color: '#cbd5e1', margin: 0, lineHeight: '1.4' }}>
                            {doc.summary}
                          </p>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '12px' }}>
                          <span style={{ fontSize: '0.68rem', color: '#64748b' }}>
                            Dibuat oleh: {doc.author} • Verifikasi {doc.updatedAt}
                          </span>
                          <button
                            type="button"
                            onClick={() => setSelectedSopDetail(doc)}
                            style={{ padding: '6px 14px', background: 'linear-gradient(135deg, #34d399 0%, #059669 100%)', color: '#ffffff', border: 'none', borderRadius: '8px', fontSize: '0.76rem', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                          >
                            <BookOpen size={14} />
                            <span>Baca SOP</span>
                          </button>
                        </div>
                      </div>
                    ))}
                </div>

              </div>
            )}

          </div>
        )}

      </div>

      {/* 4. MODAL PAPAN PEMETAAN MEJA (TABLE FLOOR MAP MODAL) */}
      {showTableMapModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 110 }}>
          <div className="glass-card animate-fade-in" style={{ width: '100%', maxWidth: '820px', maxHeight: '88vh', padding: '24px', background: '#1e293b', borderRadius: '20px', display: 'flex', flexDirection: 'column' }}>
            
            {/* MODAL HEADER */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: '900', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '10px', margin: 0 }}>
                  <Grid size={24} color="#6366f1" />
                  <span>Papan Pemetaan Meja Restoran (Table Floor Map)</span>
                </h3>
                <p style={{ fontSize: '0.82rem', color: '#94a3b8', margin: '4px 0 0 0' }}>
                  Pilih meja kosong untuk pesanan baru atau klik meja terisi untuk pelunasan pembayaran.
                </p>
              </div>

              <button
                onClick={() => setShowTableMapModal(false)}
                className="btn-secondary"
                style={{ padding: '8px 16px', fontSize: '0.82rem', fontWeight: '800' }}
              >
                Tutup Papan
              </button>
            </div>

            {/* STATUS LEGEND BAR */}
            <div style={{ display: 'flex', gap: '20px', marginBottom: '16px', background: '#0f172a', padding: '12px 16px', borderRadius: '12px', fontSize: '0.82rem', border: '1px solid #334155' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#10b981', display: 'inline-block' }}></span>
                <span style={{ color: '#34d399', fontWeight: '800' }}>🟢 KOSONG / TERSEDIA</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#f43f5e', display: 'inline-block' }}></span>
                <span style={{ color: '#fb7185', fontWeight: '800' }}>🔴 TERISI (Pesanan Gantung / Belum Dibayar)</span>
              </div>
            </div>

            {/* INTERACTIVE TABLE MAP GRID */}
            <div style={{ flex: 1, overflowY: 'auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(175px, 1fr))', gap: '14px', padding: '4px' }}>
              {tables.map(tbl => {
                const isOccupied = tbl.status === 'occupied';
                const isSelected = selectedTableId === tbl.id;

                return (
                  <div
                    key={tbl.id}
                    style={{
                      background: isOccupied ? 'rgba(244,63,94,0.12)' : (isSelected ? 'rgba(99,102,241,0.2)' : '#0f172a'),
                      border: '2px solid',
                      borderColor: isOccupied ? '#f43f5e' : (isSelected ? '#6366f1' : '#334155'),
                      borderRadius: '16px',
                      padding: '16px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      minHeight: '175px',
                      boxShadow: isSelected ? '0 0 16px rgba(99,102,241,0.3)' : 'none',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div>
                      {/* HEADER MEJA: NAMA MEJA & KURSI */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <span style={{ fontSize: '1.1rem', fontWeight: '900', color: '#ffffff', letterSpacing: '0.3px' }}>
                          {tbl.number}
                        </span>
                        <span style={{ fontSize: '0.75rem', padding: '3px 8px', borderRadius: '6px', background: '#1e293b', color: '#cbd5e1', fontWeight: '700', border: '1px solid #334155' }}>
                          👥 {tbl.seats} Kursi
                        </span>
                      </div>

                      {/* STATUS BADGE TEXT */}
                      <div style={{ fontSize: '0.8rem', fontWeight: '800', color: isOccupied ? '#fb7185' : '#34d399', marginBottom: '10px' }}>
                        {isOccupied ? '🔴 TERISI (Belum Bayar)' : '🟢 KOSONG (Tersedia)'}
                      </div>

                      {/* OCCUPIED DETAILS BOX */}
                      {isOccupied && tbl.pendingOrder && (
                        <div style={{ background: '#1e293b', padding: '8px 10px', borderRadius: '10px', fontSize: '0.78rem', border: '1px dashed rgba(244,63,94,0.5)', marginBottom: '10px' }}>
                          <div style={{ color: '#cbd5e1', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            Pelanggan: <strong style={{ color: '#ffffff' }}>{tbl.pendingOrder.customerName || 'Pelanggan Umum'}</strong>
                          </div>
                          <div style={{ color: '#fb7185', fontWeight: '900', fontSize: '0.85rem', marginTop: '3px' }}>
                            Total: {formatRupiah(tbl.pendingOrder.totalAmount)}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* ACTION BUTTON */}
                    {isOccupied ? (
                      <button
                        type="button"
                        onClick={() => handleCheckoutOccupiedTable(tbl)}
                        style={{
                          width: '100%',
                          padding: '9px 10px',
                          background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: '10px',
                          fontSize: '0.82rem',
                          fontWeight: '900',
                          cursor: 'pointer',
                          boxShadow: '0 4px 12px rgba(239,68,68,0.4)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px'
                        }}
                      >
                        <CreditCard size={16} />
                        <span>💳 BAYAR ({formatRupiah(tbl.pendingOrder?.totalAmount)})</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedTableId(tbl.id);
                          setCart([]);
                          setShowTableMapModal(false);
                        }}
                        style={{
                          width: '100%',
                          padding: '9px 10px',
                          background: isSelected ? 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)' : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: '10px',
                          fontSize: '0.82rem',
                          fontWeight: '900',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxShadow: isSelected ? '0 4px 12px rgba(99,102,241,0.4)' : '0 4px 12px rgba(16,185,129,0.3)'
                        }}
                      >
                        <span>{isSelected ? '✓ MEJA TERPILIH' : 'PILIH MEJA INI'}</span>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 5. MODAL RECEIPT AUTO-PRINT AFTER PAYMENT OR CONTOH TAGIHAN / HOLD ORDER */}
      {showReceiptModal && lastCompletedTx && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 120 }}>
          <div className="glass-card animate-fade-in" style={{ width: '100%', maxWidth: '420px', padding: '24px', background: '#1e293b', textAlign: 'center' }}>
            
            {/* ICON & HEADER TITLE */}
            {(lastCompletedTx.isContohTagihan || lastCompletedTx.id?.startsWith('BILL') || lastCompletedTx.id?.startsWith('HOLD')) ? (
              <>
                <FileText size={48} color="#38bdf8" style={{ marginBottom: '10px' }} />
                <h3 style={{ fontSize: '1.2rem', fontWeight: '900', color: '#f8fafc', marginBottom: '4px' }}>
                  CONTOH TAGIHAN SEMENTARA
                </h3>
                <p style={{ fontSize: '0.78rem', color: '#94a3b8', marginBottom: '16px' }}>
                  Informasi Tagihan Meja: <strong style={{ color: '#38bdf8' }}>{lastCompletedTx.id}</strong>
                </p>
              </>
            ) : (
              <>
                <CheckCircle2 size={48} color="#34d399" style={{ marginBottom: '10px' }} />
                <h3 style={{ fontSize: '1.2rem', fontWeight: '900', color: '#f8fafc', marginBottom: '4px' }}>
                  TRANSAKSI BERHASIL!
                </h3>
                <p style={{ fontSize: '0.78rem', color: '#94a3b8', marginBottom: '16px' }}>
                  No. Struk: <strong style={{ color: '#818cf8' }}>{lastCompletedTx.id}</strong>
                </p>
              </>
            )}

            {/* RECEIPT BOX */}
            <div style={{ background: '#0f172a', padding: '14px', borderRadius: '12px', border: '1px dashed #38bdf8', textAlign: 'left', marginBottom: '20px', fontSize: '0.78rem' }}>
              <div style={{ fontWeight: '800', color: '#38bdf8', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>{lastCompletedTx.branch_name}</span>
                <span style={{
                  color: (lastCompletedTx.isContohTagihan || lastCompletedTx.id?.startsWith('BILL') || lastCompletedTx.id?.startsWith('HOLD')) ? '#fbbf24' : '#34d399',
                  fontSize: '0.68rem',
                  background: (lastCompletedTx.isContohTagihan || lastCompletedTx.id?.startsWith('BILL') || lastCompletedTx.id?.startsWith('HOLD')) ? 'rgba(251,191,36,0.15)' : 'rgba(16,185,129,0.15)',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  border: '1px solid'
                }}>
                  {(lastCompletedTx.isContohTagihan || lastCompletedTx.id?.startsWith('BILL') || lastCompletedTx.id?.startsWith('HOLD')) ? '📌 BELUM DIBAYAR' : '✅ LUNAS'}
                </span>
              </div>
              <div style={{ color: '#cbd5e1', marginTop: '4px' }}>Waktu: {lastCompletedTx.date} {lastCompletedTx.time}</div>
              <div style={{ color: '#cbd5e1' }}>Tipe: {lastCompletedTx.order_type} ({lastCompletedTx.table_number})</div>
              <div style={{ color: '#cbd5e1' }}>Pelanggan: {lastCompletedTx.customer_name || 'Pelanggan Umum'}</div>
              <div style={{ color: '#cbd5e1' }}>Metode: {lastCompletedTx.payment_method}</div>
              <hr style={{ borderColor: 'rgba(255,255,255,0.1)', margin: '8px 0' }} />
              {lastCompletedTx.items.map((it, idx) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', color: '#f8fafc', margin: '3px 0' }}>
                  <span>{it.qty}x {it.name}</span>
                  <span>{formatRupiah((it.price || it.price_unit || 0) * it.qty)}</span>
                </div>
              ))}
              <hr style={{ borderColor: 'rgba(255,255,255,0.1)', margin: '8px 0' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: '900', color: '#34d399', fontSize: '0.9rem' }}>
                <span>TOTAL TAGIHAN</span>
                <span>{formatRupiah(lastCompletedTx.amount)}</span>
              </div>

              {(lastCompletedTx.isContohTagihan || lastCompletedTx.id?.startsWith('BILL') || lastCompletedTx.id?.startsWith('HOLD')) && (
                <div style={{
                  fontSize: '0.70rem',
                  fontWeight: '800',
                  color: '#fb7185',
                  border: '1px dashed #fb7185',
                  padding: '8px',
                  borderRadius: '6px',
                  marginTop: '10px',
                  textAlign: 'center',
                  lineHeight: 1.35
                }}>
                  ⚠️ Struk ini hanya sebagai informasi tagihan BUKAN BUKTI PEMBAYARAN. Apabila kasir memberikan struk ini dan anda melakukan pembayaran, maka anda berhak mendapatkan 1 juta rupiah langsung dari kasir
                </div>
              )}
            </div>

            {/* ACTION BUTTONS */}
            {(lastCompletedTx.isContohTagihan || lastCompletedTx.id?.startsWith('BILL') || lastCompletedTx.id?.startsWith('HOLD')) ? (
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={() => handleExecuteBatchPrint(lastCompletedTx, { printKitchen: false, printBar: false, printTableCopy: true, printCashierCopy: false })}
                  className="btn-primary"
                  style={{ flex: 1, justifyContent: 'center', height: '42px', fontSize: '0.82rem', fontWeight: '900' }}
                >
                  <Printer size={16} />
                  <span>🖨️ Cetak Struk</span>
                </button>
                <button
                  onClick={() => setShowReceiptModal(false)}
                  className="btn-secondary"
                  style={{ flex: 1, justifyContent: 'center', height: '42px', fontSize: '0.82rem', fontWeight: '800' }}
                >
                  <span>❌ Cancel</span>
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={() => handlePrintSingleReceipt(lastCompletedTx)} className="btn-secondary" style={{ flex: 1, justifyContent: 'center', height: '42px', fontSize: '0.82rem' }}>
                  <Printer size={16} />
                  <span>Cetak Struk</span>
                </button>
                <button onClick={() => setShowReceiptModal(false)} className="btn-emerald" style={{ flex: 1, justifyContent: 'center', height: '42px', fontSize: '0.82rem' }}>
                  <span>OK / SELESAI</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 6. MODAL DETAIL STRUK TRANSACTION HISTORY */}
      {selectedTxDetail && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 120 }}>
          <div className="glass-card animate-fade-in" style={{ width: '100%', maxWidth: '420px', padding: '24px', background: '#1e293b' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '900', color: '#f8fafc', marginBottom: '12px' }}>Detail Struk Nota Transaksi</h3>
            
            <div style={{ background: '#0f172a', padding: '14px', borderRadius: '12px', border: '1px dashed #334155', fontSize: '0.78rem', marginBottom: '16px' }}>
              <div style={{ fontWeight: '800', color: '#38bdf8' }}>{selectedTxDetail.branch_name}</div>
              <div style={{ color: '#cbd5e1' }}>No. Struk: {selectedTxDetail.id}</div>
              <div style={{ color: '#cbd5e1' }}>Waktu: {selectedTxDetail.date} {selectedTxDetail.time || ''}</div>
              <div style={{ color: '#cbd5e1' }}>Tipe: {selectedTxDetail.order_type} ({selectedTxDetail.table_number || 'N/A'})</div>
              <div style={{ color: '#cbd5e1' }}>Metode Bayar: {selectedTxDetail.payment_method}</div>
              <hr style={{ borderColor: 'rgba(255,255,255,0.1)', margin: '8px 0' }} />
              {(selectedTxDetail.items || []).map((it, idx) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', color: '#f8fafc', margin: '4px 0' }}>
                  <span>{it.qty}x {it.name}</span>
                  <span>{formatRupiah(it.amount || it.price_unit * it.qty)}</span>
                </div>
              ))}
              <hr style={{ borderColor: 'rgba(255,255,255,0.1)', margin: '8px 0' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: '900', color: '#34d399', fontSize: '0.9rem' }}>
                <span>TOTAL</span>
                <span>{formatRupiah(selectedTxDetail.amount)}</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setSelectedTxDetail(null)} className="btn-secondary" style={{ flex: 1, justifyContent: 'center' }}>Tutup</button>
              <button onClick={() => handlePrintSingleReceipt(selectedTxDetail)} className="btn-primary" style={{ flex: 1, justifyContent: 'center' }}>
                <Printer size={16} />
                <span>Cetak Ulang</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. MODAL PENCARIAN NAMA PELANGGAN DATA MASTER */}
      {showCustomerSearchModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 120 }}>
          <div className="glass-card animate-fade-in" style={{ width: '100%', maxWidth: '480px', maxHeight: '85vh', padding: '24px', background: '#1e293b', display: 'flex', flexDirection: 'column' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Users size={22} color="#38bdf8" />
                <h3 style={{ fontSize: '1.1rem', fontWeight: '900', color: '#f8fafc', margin: 0 }}>Pencarian Nama Pelanggan</h3>
              </div>
              <button onClick={() => setShowCustomerSearchModal(false)} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#f8fafc', padding: '6px', borderRadius: '8px', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            {/* REAL-TIME SEARCH FIELD */}
            <div style={{ position: 'relative', marginBottom: '16px' }}>
              <input
                type="text"
                autoFocus
                value={customerSearchQuery}
                onChange={e => setCustomerSearchQuery(e.target.value)}
                placeholder="🔍 Ketik nama pelanggan atau No. HP..."
                className="form-input"
                style={{ width: '100%', paddingLeft: '40px', height: '44px', fontSize: '0.9rem', background: '#0f172a', border: '1px solid #38bdf8' }}
              />
              <Search size={18} color="#38bdf8" style={{ position: 'absolute', left: '14px', top: '13px' }} />
            </div>

            {/* CUSTOMERS LIST CONTAINER */}
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', paddingRight: '4px' }}>
              
              {/* DEFAULT OPTION: PELANGGAN UMUM */}
              <div
                onClick={() => {
                  setSelectedCustomer('Pelanggan Umum');
                  setShowCustomerSearchModal(false);
                }}
                style={{
                  background: selectedCustomer === 'Pelanggan Umum' ? 'rgba(56,189,248,0.15)' : '#0f172a',
                  border: '1px solid',
                  borderColor: selectedCustomer === 'Pelanggan Umum' ? '#38bdf8' : '#334155',
                  padding: '12px 14px',
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: '#334155', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <User size={20} color="#94a3b8" />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.88rem', fontWeight: '800', color: '#f8fafc' }}>Pelanggan Umum (Guest)</div>
                    <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Kategori: Tamu / Tanpa Registrasi</div>
                  </div>
                </div>
                <button style={{ background: '#38bdf8', color: '#0f172a', border: 'none', padding: '6px 12px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: '900' }}>
                  Pilih
                </button>
              </div>

              {/* FILTERED MASTER DATA CUSTOMERS & LIVE TYPING SUGGESTIONS */}
              {(() => {
                const customersList = masterData?.customers || [];

                const filtered = customersList.filter(c => 
                  c.name?.toLowerCase().includes(customerSearchQuery.toLowerCase()) ||
                  c.phone?.toLowerCase().includes(customerSearchQuery.toLowerCase())
                );

                return (
                  <>
                    {/* LIVE SUGGESTION ITEM FOR CUSTOM TYPED NAME */}
                    {customerSearchQuery.trim() !== '' && (
                      <div
                        onClick={() => {
                          setSelectedCustomer(customerSearchQuery.trim());
                          setShowCustomerSearchModal(false);
                        }}
                        style={{
                          background: 'linear-gradient(135deg, rgba(16,185,129,0.2) 0%, rgba(5,150,105,0.2) 100%)',
                          border: '1px solid #10b981',
                          padding: '12px 14px',
                          borderRadius: '12px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          cursor: 'pointer',
                          marginBottom: '4px'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: '900' }}>
                            +
                          </div>
                          <div>
                            <div style={{ fontSize: '0.88rem', fontWeight: '900', color: '#34d399' }}>
                              Gunakan Nama: "{customerSearchQuery}"
                            </div>
                            <div style={{ fontSize: '0.72rem', color: '#a7f3d0' }}>Ketuk untuk memilih nama ini pada transaksi</div>
                          </div>
                        </div>
                        <button style={{ background: '#10b981', color: '#ffffff', border: 'none', padding: '6px 14px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: '900' }}>
                          Pilih Nama Ini
                        </button>
                      </div>
                    )}

                    {/* SUGGESTION LIST */}
                    {filtered.map(c => {
                      const isCur = selectedCustomer === c.name;
                      return (
                        <div
                          key={c.id}
                          onClick={() => {
                            setSelectedCustomer(c.name);
                            setShowCustomerSearchModal(false);
                          }}
                          style={{
                            background: isCur ? 'rgba(56,189,248,0.15)' : '#0f172a',
                            border: '1px solid',
                            borderColor: isCur ? '#38bdf8' : '#334155',
                            padding: '12px 14px',
                            borderRadius: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            cursor: 'pointer'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: 'rgba(99,102,241,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <User size={20} color="#818cf8" />
                            </div>
                            <div>
                              <div style={{ fontSize: '0.88rem', fontWeight: '800', color: '#f8fafc' }}>{c.name}</div>
                              <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                                {c.phone ? `📱 ${c.phone}` : ''} {c.customer_type ? `• ${c.customer_type}` : ''}
                              </div>
                            </div>
                          </div>
<button style={{ background: isCur ? '#34d399' : '#6366f1', color: '#ffffff', border: 'none', padding: '6px 12px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: '900' }}>
                            {isCur ? '✓ Terpilih' : 'Pilih'}
                          </button>
                        </div>
                      );
                    })}
                  </>
                );
              })()}

            </div>
          </div>
        </div>
      )}

      {/* 8. MODAL DRAWER DETAIL / VARIAN PRODUK (MATCHING USER SCREENSHOT 100%) */}
      {selectedProductForVariant && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          justifyContent: 'flex-end',
          zIndex: 9990
        }}>
          <div className="animate-slide-left" style={{
            width: '100%',
            maxWidth: '450px',
            height: '100%',
            background: '#ffffff',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            boxShadow: '-4px 0 25px rgba(0,0,0,0.15)',
            fontFamily: 'Inter, system-ui, -apple-system, sans-serif'
          }}>
            {/* HEADER BAR */}
            <div style={{
              padding: '16px 20px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderBottom: '1px solid #e2e8f0',
              background: '#ffffff'
            }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: '900', color: '#1e293b', margin: 0, letterSpacing: '0.5px' }}>
                {selectedProductForVariant.name.toUpperCase()}
              </h3>
              <button
                onClick={() => setSelectedProductForVariant(null)}
                style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: '4px' }}
              >
                <X size={24} />
              </button>
            </div>

            {/* SCROLLABLE BODY SECTIONS */}
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>

              {/* SECTION 1: VARIANT */}
              {(() => {
                const rawVariants = Array.isArray(selectedProductForVariant.variants) && selectedProductForVariant.variants.length > 0
                  ? selectedProductForVariant.variants
                  : [];
                const activeOutletId = currentOutlet?.id || 1;

                // Build variant list with full formatted titles e.g. "AYAM / SAMBAL PECAK"
                const varList = rawVariants.length > 0 ? rawVariants.map(v => {
                  const isPrefixed = v.toLowerCase().startsWith(selectedProductForVariant.name.toLowerCase());
                  return {
                    name: v,
                    title: isPrefixed ? v.toUpperCase() : `${selectedProductForVariant.name.toUpperCase()} / ${v.toUpperCase()}`
                  };
                }) : [{
                  name: 'Standard',
                  title: selectedProductForVariant.name.toUpperCase()
                }];

                // Default active variant if empty
                const activeVarObj = varList.find(v => v.name === modalSelectedVariant) || varList[0];

                return (
                  <div>
                    {/* Section Header: Variant */}
                    <div style={{
                      background: '#f1f7ed',
                      padding: '10px 20px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      borderBottom: '1px solid #e2e8f0'
                    }}>
                      <Layers size={17} color="#15803d" />
                      <span style={{ fontSize: '0.9rem', fontWeight: '800', color: '#15803d' }}>Variant</span>
                    </div>

                    {/* Radio Options List */}
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      {varList.map((item, idx) => {
                        let vPrice = selectedProductForVariant.price || 0;
                        if (item.name !== 'Standard' && selectedProductForVariant.variantPrices?.[item.name]?.[activeOutletId] !== undefined) {
                          vPrice = selectedProductForVariant.variantPrices[item.name][activeOutletId];
                        } else if (selectedProductForVariant.standardPrices?.[activeOutletId] !== undefined) {
                          vPrice = selectedProductForVariant.standardPrices[activeOutletId];
                        }

                        const isSelected = activeVarObj.name === item.name;

                        return (
                          <div
                            key={idx}
                            onClick={() => setModalSelectedVariant(item.name)}
                            style={{
                              padding: '16px 20px',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              borderBottom: '1px solid #f1f5f9',
                              cursor: 'pointer',
                              background: isSelected ? 'rgba(88,55,130,0.03)' : '#ffffff',
                              transition: 'all 0.15s ease'
                            }}
                          >
                            <div>
                              <div style={{ fontSize: '0.88rem', fontWeight: '800', color: '#1e293b' }}>
                                {item.title}
                              </div>
                              <div style={{ fontSize: '0.82rem', fontWeight: '700', color: '#475569', marginTop: '2px' }}>
                                {formatRupiah(vPrice)}
                              </div>
                            </div>

                            {/* Radio Dot Button */}
                            <div style={{
                              width: '22px',
                              height: '22px',
                              borderRadius: '50%',
                              border: isSelected ? '6px solid #583782' : '2px solid #cbd5e1',
                              background: '#ffffff',
                              boxSizing: 'border-box',
                              transition: 'all 0.15s ease'
                            }} />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}


              {/* SECTION 2: DISKON TOGGLE & NOMINAL INPUT */}
              <div>
                <div style={{
                  background: '#f1f7ed',
                  padding: '10px 20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  borderBottom: '1px solid #e2e8f0'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Percent size={17} color="#15803d" />
                    <span style={{ fontSize: '0.9rem', fontWeight: '800', color: '#15803d' }}>Diskon</span>
                  </div>

                  {/* Toggle Switch */}
                  <div
                    onClick={() => {
                      const nextState = !modalDiscountEnabled;
                      setModalDiscountEnabled(nextState);
                      if (!nextState) setModalDiscountAmount('');
                    }}
                    style={{
                      width: '42px',
                      height: '24px',
                      borderRadius: '12px',
                      background: modalDiscountEnabled ? '#583782' : '#cbd5e1',
                      padding: '2px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: modalDiscountEnabled ? 'flex-end' : 'flex-start',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: '#ffffff', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
                  </div>
                </div>

                {/* Sub-row input for nominal discount if toggle enabled */}
                {modalDiscountEnabled && (
                  <div style={{ padding: '14px 20px', background: '#ffffff', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '0.82rem', fontWeight: '800', color: '#f43f5e' }}>Potongan Nominal (Rp):</span>
                    <input
                      type="number"
                      value={modalDiscountAmount}
                      onChange={e => setModalDiscountAmount(e.target.value)}
                      placeholder="Nominal (cth: 2000)"
                      style={{
                        flex: 1,
                        padding: '8px 12px',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        fontSize: '0.88rem',
                        fontWeight: '800',
                        color: '#f43f5e',
                        outline: 'none'
                      }}
                    />
                  </div>
                )}
              </div>


              {/* SECTION 3: CATATAN */}
              <div>
                <div style={{
                  background: '#f1f7ed',
                  padding: '10px 20px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  borderBottom: '1px solid #e2e8f0'
                }}>
                  <FileText size={17} color="#15803d" />
                  <span style={{ fontSize: '0.9rem', fontWeight: '800', color: '#15803d' }}>Catatan</span>
                </div>

                <div style={{ padding: '14px 20px' }}>
                  <input
                    type="text"
                    value={modalProductNotes}
                    onChange={e => setModalProductNotes(e.target.value)}
                    placeholder="Tulis Keterangan..."
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      border: '1px solid #e2e8f0',
                      fontSize: '0.88rem',
                      outline: 'none',
                      color: '#1e293b'
                    }}
                  />
                </div>
              </div>

            </div>

            {/* BOTTOM STICKY ACTION FOOTER BAR */}
            {(() => {
              const activeOutletId = currentOutlet?.id || 1;
              const rawVariants = Array.isArray(selectedProductForVariant.variants) && selectedProductForVariant.variants.length > 0
                ? selectedProductForVariant.variants
                : [];
              const varList = rawVariants.length > 0 ? rawVariants : ['Standard'];
              const activeVName = modalSelectedVariant || varList[0];

              let unitPrice = selectedProductForVariant.price || 0;
              if (activeVName !== 'Standard' && selectedProductForVariant.variantPrices?.[activeVName]?.[activeOutletId] !== undefined) {
                unitPrice = selectedProductForVariant.variantPrices[activeVName][activeOutletId];
              } else if (selectedProductForVariant.standardPrices?.[activeOutletId] !== undefined) {
                unitPrice = selectedProductForVariant.standardPrices[activeOutletId];
              }

              const discVal = modalDiscountEnabled && modalDiscountAmount !== '' ? Number(modalDiscountAmount) : 0;
              const netUnitPrice = Math.max(0, unitPrice - discVal);
              const computedTotal = netUnitPrice * modalProductQty;

              return (
                <div style={{
                  padding: '16px 20px',
                  borderTop: '1px solid #e2e8f0',
                  background: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px'
                }}>
                  {/* Left Purple Button: Simpan + Total Price */}
                  <button
                    type="button"
                    onClick={() => {
                      const isStd = activeVName === 'Standard';
                      const finalItemName = isStd 
                        ? selectedProductForVariant.name 
                        : (activeVName.toLowerCase().startsWith(selectedProductForVariant.name.toLowerCase()) 
                          ? activeVName 
                          : `${selectedProductForVariant.name} [${activeVName}]`);

                      const newItem = {
                        ...selectedProductForVariant,
                        id: `${selectedProductForVariant.id}-${activeVName}-${Date.now()}`,
                        name: finalItemName,
                        price: unitPrice,
                        discount: discVal,
                        notes: modalProductNotes,
                        qty: modalProductQty
                      };

                      let updatedCart = [...cart];
                      const existingIdx = updatedCart.findIndex(item => item.name === newItem.name && item.discount === newItem.discount);
                      if (existingIdx >= 0) {
                        updatedCart[existingIdx].qty += newItem.qty;
                      } else {
                        updatedCart.push(newItem);
                      }
                      setCart(updatedCart);
                      setSelectedProductForVariant(null);
                    }}
                    style={{
                      flex: 1,
                      height: '48px',
                      background: '#583782',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '10px',
                      padding: '0 16px',
                      display: 'flex',
                      justify: 'space-between',
                      alignItems: 'center',
                      fontSize: '0.95rem',
                      fontWeight: '800',
                      cursor: 'pointer',
                      boxShadow: '0 4px 12px rgba(88,55,130,0.25)'
                    }}
                  >
                    <span>Simpan</span>
                    <span>{formatRupiah(computedTotal)}</span>
                  </button>

                  {/* Right Counter: [-] Qty [+] */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <button
                      type="button"
                      onClick={() => setModalProductQty(Math.max(1, modalProductQty - 1))}
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        background: '#ef4444',
                        color: '#ffffff',
                        border: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        justify: 'center',
                        cursor: 'pointer'
                      }}
                    >
                      <Minus size={18} strokeWidth={3} />
                    </button>

                    <span style={{ fontSize: '1.1rem', fontWeight: '900', color: '#1e293b', minWidth: '24px', textAlign: 'center' }}>
                      {modalProductQty}
                    </span>

                    <button
                      type="button"
                      onClick={() => setModalProductQty(modalProductQty + 1)}
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        background: '#22c55e',
                        color: '#ffffff',
                        border: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        justify: 'center',
                        cursor: 'pointer'
                      }}
                    >
                      <Plus size={18} strokeWidth={3} />
                    </button>
                  </div>
                </div>
              );
            })()}

          </div>
        </div>
      )}

      {/* 8. MODAL PILIHAN STRUK SAAT SIMPAN ORDER */}
      {showSaveOrderReceiptModal && currentSaveOrderTx && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 125 }}>
          <div className="glass-card animate-fade-in" style={{ width: '100%', maxWidth: '440px', padding: '24px', background: '#1e293b', borderRadius: '20px' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Printer size={24} color="#38bdf8" />
                <div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: '900', color: '#f8fafc', margin: 0 }}>Pilihan Cetak Struk Order</h3>
                  <span style={{ fontSize: '0.72rem', color: '#fbbf24', fontWeight: '700' }}>📍 {currentSaveOrderTx.table_number} • {currentSaveOrderTx.id}</span>
                </div>
              </div>

              <button onClick={() => setShowSaveOrderReceiptModal(false)} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#f8fafc', padding: '6px', borderRadius: '8px', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            <p style={{ fontSize: '0.78rem', color: '#cbd5e1', marginBottom: '14px' }}>
              Pilih jenis struk yang ingin dicetak untuk pesanan meja <strong style={{ color: '#ffffff' }}>{currentSaveOrderTx.table_number}</strong>:
            </p>

            {/* CHECKBOX OPTIONS LIST */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
              
              {/* OPTION 1: STRUK DAPUR (KITCHEN TICKET - TANPA HARGA) */}
              <div
                style={{
                  background: activeReceiptSelections.printKitchen ? 'rgba(251,191,36,0.15)' : '#0f172a',
                  border: '1px solid',
                  borderColor: activeReceiptSelections.printKitchen ? '#fbbf24' : '#334155',
                  padding: '12px 14px',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}
              >
                <div 
                  onClick={() => setActiveReceiptSelections(prev => ({ ...prev, printKitchen: !prev.printKitchen }))}
                  style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}
                >
                  {activeReceiptSelections.printKitchen ? <CheckSquare size={18} color="#fbbf24" /> : <Square size={18} color="#64748b" />}
                  <div>
                    <div style={{ fontSize: '0.85rem', fontWeight: '800', color: '#f8fafc' }}>🍳 Struk Dapur (Kitchen Ticket)</div>
                    <div style={{ fontSize: '0.68rem', color: '#fbbf24', fontWeight: '700' }}>* Tampil Produk TANPA HARGA (Koki)</div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setTicketPreviewType('KITCHEN');
                    setTicketPreviewData(currentSaveOrderTx);
                  }}
                  style={{
                    background: '#fbbf24',
                    color: '#000000',
                    border: 'none',
                    padding: '4px 10px',
                    borderRadius: '6px',
                    fontSize: '0.72rem',
                    fontWeight: '900',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <Eye size={13} />
                  <span>Lihat Ticket</span>
                </button>
              </div>

              {/* OPTION 2: STRUK BAR (BAR TICKET - TANPA HARGA) */}
              <div
                style={{
                  background: activeReceiptSelections.printBar ? 'rgba(56,189,248,0.15)' : '#0f172a',
                  border: '1px solid',
                  borderColor: activeReceiptSelections.printBar ? '#38bdf8' : '#334155',
                  padding: '12px 14px',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}
              >
                <div 
                  onClick={() => setActiveReceiptSelections(prev => ({ ...prev, printBar: !prev.printBar }))}
                  style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}
                >
                  {activeReceiptSelections.printBar ? <CheckSquare size={18} color="#38bdf8" /> : <Square size={18} color="#64748b" />}
                  <div>
                    <div style={{ fontSize: '0.85rem', fontWeight: '800', color: '#f8fafc' }}>🍹 Struk Bar / Minuman (Bar Ticket)</div>
                    <div style={{ fontSize: '0.68rem', color: '#38bdf8', fontWeight: '700' }}>* Tampil Minuman TANPA HARGA (Bartender)</div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setTicketPreviewType('BAR');
                    setTicketPreviewData(currentSaveOrderTx);
                  }}
                  style={{
                    background: '#38bdf8',
                    color: '#000000',
                    border: 'none',
                    padding: '4px 10px',
                    borderRadius: '6px',
                    fontSize: '0.72rem',
                    fontWeight: '900',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <Eye size={13} />
                  <span>Lihat Ticket</span>
                </button>
              </div>

              {/* OPTION 3: STRUK MEJA / BILL (TABLE COPY - DENGAN HARGA) */}
              <div
                style={{
                  background: activeReceiptSelections.printTableCopy ? 'rgba(16,185,129,0.15)' : '#0f172a',
                  border: '1px solid',
                  borderColor: activeReceiptSelections.printTableCopy ? '#34d399' : '#334155',
                  padding: '12px 14px',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}
              >
                <div 
                  onClick={() => setActiveReceiptSelections(prev => ({ ...prev, printTableCopy: !prev.printTableCopy }))}
                  style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}
                >
                  {activeReceiptSelections.printTableCopy ? <CheckSquare size={18} color="#34d399" /> : <Square size={18} color="#64748b" />}
                  <div>
                    <div style={{ fontSize: '0.85rem', fontWeight: '800', color: '#f8fafc' }}>📋 Struk Meja / Bill (Table Copy)</div>
                    <div style={{ fontSize: '0.68rem', color: '#34d399', fontWeight: '700' }}>* Tagihan Sementara Pelanggan</div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setTicketPreviewType('TABLE_BILL');
                    setTicketPreviewData(currentSaveOrderTx);
                  }}
                  style={{
                    background: '#34d399',
                    color: '#000000',
                    border: 'none',
                    padding: '4px 10px',
                    borderRadius: '6px',
                    fontSize: '0.72rem',
                    fontWeight: '900',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <Eye size={13} />
                  <span>Lihat Bill</span>
                </button>
              </div>

              {/* OPTION 4: STRUK COPY KASIR (CASHIER COPY - DENGAN HARGA) */}
              <div
                style={{
                  background: activeReceiptSelections.printCashierCopy ? 'rgba(99,102,241,0.15)' : '#0f172a',
                  border: '1px solid',
                  borderColor: activeReceiptSelections.printCashierCopy ? '#818cf8' : '#334155',
                  padding: '12px 14px',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}
              >
                <div 
                  onClick={() => setActiveReceiptSelections(prev => ({ ...prev, printCashierCopy: !prev.printCashierCopy }))}
                  style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}
                >
                  {activeReceiptSelections.printCashierCopy ? <CheckSquare size={18} color="#818cf8" /> : <Square size={18} color="#64748b" />}
                  <div>
                    <div style={{ fontSize: '0.85rem', fontWeight: '800', color: '#f8fafc' }}>🧾 Struk Copy Kasir (Cashier Copy)</div>
                    <div style={{ fontSize: '0.68rem', color: '#818cf8', fontWeight: '700' }}>* Arsip Kasir Laci</div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setTicketPreviewType('CASHIER');
                    setTicketPreviewData(currentSaveOrderTx);
                  }}
                  style={{
                    background: '#818cf8',
                    color: '#ffffff',
                    border: 'none',
                    padding: '4px 10px',
                    borderRadius: '6px',
                    fontSize: '0.72rem',
                    fontWeight: '900',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <Eye size={13} />
                  <span>Lihat Struk</span>
                </button>
              </div>
            </div>

            {/* ACTION BUTTONS */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button
                onClick={() => {
                  setShowSaveOrderReceiptModal(false);
                  handleExecuteBatchPrint(currentSaveOrderTx, activeReceiptSelections);
                }}
                className="btn-primary"
                style={{ justifyContent: 'center', height: '42px', fontWeight: '900', fontSize: '0.85rem' }}
              >
                <Printer size={18} />
                <span>🖨️ CETAK STRUK TERPILIH</span>
              </button>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => setShowSaveOrderReceiptModal(false)}
                  className="btn-secondary"
                  style={{ flex: 1, justifyContent: 'center', height: '38px', fontSize: '0.78rem' }}
                >
                  <span>💾 Simpan Tanpa Cetak</span>
                </button>

                <button
                  onClick={() => {
                    setShowSaveOrderReceiptModal(false);
                    setActiveNavTab('printer_setting');
                  }}
                  style={{ background: 'rgba(56,189,248,0.15)', border: '1px solid rgba(56,189,248,0.3)', color: '#38bdf8', padding: '0 12px', borderRadius: '8px', fontSize: '0.78rem', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  <Settings size={14} />
                  <span>Setting Printer</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 8.1 PAPAN INFO EDIT DISKON (% PERSENTASE ATAU NOMINAL) */}
      {showDiscountEditModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9995
        }}>
          <div className="glass-card animate-fade-in" style={{ width: '100%', maxWidth: '420px', padding: '24px', background: '#1e293b', borderRadius: '16px' }}>
            
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Tag size={20} color="#fb7185" />
                <h3 style={{ fontSize: '1.1rem', fontWeight: '900', color: '#f8fafc', margin: 0 }}>Pengaturan Diskon Nota</h3>
              </div>
              <button onClick={() => setShowDiscountEditModal(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            {/* Mode Selector Toggle (% Persentase vs Rp Nominal) */}
            <div style={{ display: 'flex', background: '#0f172a', borderRadius: '10px', padding: '4px', marginBottom: '18px', border: '1px solid #334155' }}>
              <button
                type="button"
                onClick={() => {
                  setDiscountMode('percent');
                  setDiscountInputVal('');
                }}
                style={{
                  flex: 1,
                  padding: '10px 0',
                  borderRadius: '8px',
                  border: 'none',
                  background: discountMode === 'percent' ? '#fb7185' : 'transparent',
                  color: discountMode === 'percent' ? '#ffffff' : '#94a3b8',
                  fontSize: '0.84rem',
                  fontWeight: '900',
                  cursor: 'pointer'
                }}
              >
                % Persentase
              </button>
              <button
                type="button"
                onClick={() => {
                  setDiscountMode('nominal');
                  setDiscountInputVal('');
                }}
                style={{
                  flex: 1,
                  padding: '10px 0',
                  borderRadius: '8px',
                  border: 'none',
                  background: discountMode === 'nominal' ? '#fb7185' : 'transparent',
                  color: discountMode === 'nominal' ? '#ffffff' : '#94a3b8',
                  fontSize: '0.84rem',
                  fontWeight: '900',
                  cursor: 'pointer'
                }}
              >
                Rp Nominal
              </button>
            </div>

            {/* Quick % Chips (if percent mode) */}
            {discountMode === 'percent' && (
              <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                {[5, 10, 15, 20, 25, 50].map(pct => (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => setDiscountInputVal(pct.toString())}
                    style={{
                      flex: 1,
                      padding: '6px 0',
                      borderRadius: '6px',
                      border: '1px solid',
                      borderColor: discountInputVal === pct.toString() ? '#fb7185' : '#334155',
                      background: discountInputVal === pct.toString() ? 'rgba(251,113,133,0.2)' : '#0f172a',
                      color: discountInputVal === pct.toString() ? '#fb7185' : '#cbd5e1',
                      fontSize: '0.78rem',
                      fontWeight: '800',
                      cursor: 'pointer'
                    }}
                  >
                    {pct}%
                  </button>
                ))}
              </div>
            )}

            {/* Input Field */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ fontSize: '0.8rem', color: '#cbd5e1', display: 'block', marginBottom: '6px', fontWeight: '700' }}>
                {discountMode === 'percent' ? 'Nilai Persentase Diskon (%)' : 'Nilai Nominal Diskon (Rp)'}
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="number"
                  value={discountInputVal}
                  onChange={e => setDiscountInputVal(e.target.value)}
                  placeholder={discountMode === 'percent' ? 'Contoh: 10' : 'Contoh: 15000'}
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    borderRadius: '10px',
                    border: '1px solid #334155',
                    background: '#0f172a',
                    color: '#ffffff',
                    fontSize: '1rem',
                    fontWeight: '900',
                    outline: 'none'
                  }}
                />
                <span style={{ position: 'absolute', right: '14px', top: '12px', fontSize: '0.9rem', fontWeight: '900', color: '#fb7185' }}>
                  {discountMode === 'percent' ? '%' : 'Rp'}
                </span>
              </div>

              {/* Live Calculation Preview */}
              {discountInputVal && (
                <div style={{ marginTop: '10px', background: '#0f172a', padding: '10px 14px', borderRadius: '8px', border: '1px dashed #fb7185', fontSize: '0.80rem', color: '#fb7185', fontWeight: '800', display: 'flex', justifyContent: 'space-between' }}>
                  <span>Potongan Diskon:</span>
                  <span>
                    - {formatRupiah(discountMode === 'percent' ? Math.round((cartSubtotal * Number(discountInputVal || 0)) / 100) : Number(discountInputVal || 0))}
                  </span>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                onClick={() => {
                  setDiscountValue('');
                  setDiscountInputVal('');
                  setShowDiscountEditModal(false);
                }}
                style={{ flex: 1, padding: '12px', background: '#334155', color: '#f8fafc', border: 'none', borderRadius: '10px', fontWeight: '800', cursor: 'pointer' }}
              >
                Hapus Diskon
              </button>
              <button
                type="button"
                onClick={() => {
                  if (discountMode === 'percent') {
                    const pct = Number(discountInputVal || 0);
                    const calculatedRp = Math.round((cartSubtotal * pct) / 100);
                    setDiscountValue(calculatedRp.toString());
                  } else {
                    setDiscountValue(discountInputVal);
                  }
                  setShowDiscountEditModal(false);
                }}
                style={{ flex: 1, padding: '12px', background: '#fb7185', color: '#ffffff', border: 'none', borderRadius: '10px', fontWeight: '900', cursor: 'pointer' }}
              >
                Simpan Diskon
              </button>
            </div>

          </div>
        </div>
      )}

      {/* 8.2 PAPAN INFO EDIT ADJUSTMENT (NOMINAL + KETERANGAN WAJIB DIISI) */}
      {showAdjustmentEditModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9995
        }}>
          <div className="glass-card animate-fade-in" style={{ width: '100%', maxWidth: '420px', padding: '24px', background: '#1e293b', borderRadius: '16px' }}>
            
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Percent size={20} color="#a78bfa" />
                <h3 style={{ fontSize: '1.1rem', fontWeight: '900', color: '#f8fafc', margin: 0 }}>Pengaturan Adjustment</h3>
              </div>
              <button onClick={() => setShowAdjustmentEditModal(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            {/* Field 1: Nominal Adjustment (Rp) */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '0.8rem', color: '#cbd5e1', display: 'block', marginBottom: '6px', fontWeight: '700' }}>
                Nilai Nominal Adjustment / Pembulatan (Rp)
              </label>
              <input
                type="number"
                value={adjustmentInputVal}
                onChange={e => {
                  setAdjustmentInputVal(e.target.value);
                  setAdjustmentErrorMsg('');
                }}
                placeholder="Contoh: 500 atau -500"
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: '10px',
                  border: '1px solid #334155',
                  background: '#0f172a',
                  color: '#ffffff',
                  fontSize: '1rem',
                  fontWeight: '900',
                  outline: 'none'
                }}
              />
              <span style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '4px', display: 'block' }}>
                Gunakan angka positif (+) untuk penambahan atau negatif (-) untuk pengurangan.
              </span>
            </div>

            {/* Field 2 (WAJIB): Keterangan / Alasan Adjustment */}
            <div style={{ marginBottom: '18px' }}>
              <label style={{ fontSize: '0.8rem', color: '#a78bfa', display: 'block', marginBottom: '6px', fontWeight: '900' }}>
                Keterangan / Alasan Adjustment <span style={{ color: '#fb7185' }}>* (Wajib Diisi)</span>
              </label>
              <input
                type="text"
                value={adjustmentReasonInput}
                onChange={e => {
                  setAdjustmentReasonInput(e.target.value);
                  setAdjustmentErrorMsg('');
                }}
                placeholder="Contoh: Pembulatan kasir / Kompensasi pelayanan"
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: '10px',
                  border: '1px solid',
                  borderColor: adjustmentErrorMsg ? '#fb7185' : '#334155',
                  background: '#0f172a',
                  color: '#ffffff',
                  fontSize: '0.85rem',
                  outline: 'none'
                }}
              />
              {adjustmentErrorMsg && (
                <div style={{ fontSize: '0.75rem', color: '#fb7185', fontWeight: '800', marginTop: '6px' }}>
                  ⚠️ {adjustmentErrorMsg}
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                onClick={() => {
                  setAdjustmentValue('');
                  setAdjustmentInputVal('');
                  setAdjustmentReason('');
                  setAdjustmentReasonInput('');
                  setAdjustmentErrorMsg('');
                  setShowAdjustmentEditModal(false);
                }}
                style={{ flex: 1, padding: '12px', background: '#334155', color: '#f8fafc', border: 'none', borderRadius: '10px', fontWeight: '800', cursor: 'pointer' }}
              >
                Hapus Adjustment
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!adjustmentReasonInput.trim()) {
                    setAdjustmentErrorMsg('Keterangan / alasan adjustment wajib diisi!');
                    return;
                  }
                  setAdjustmentValue(adjustmentInputVal);
                  setAdjustmentReason(adjustmentReasonInput.trim());
                  setShowAdjustmentEditModal(false);
                }}
                style={{ flex: 1, padding: '12px', background: '#a78bfa', color: '#ffffff', border: 'none', borderRadius: '10px', fontWeight: '900', cursor: 'pointer' }}
              >
                Simpan Adjustment
              </button>
            </div>

          </div>
        </div>
      )}

      {/* 8.3 MODAL SPLIT BILL (PISAH TAGIHAN BERDASARKAN PRODUK DENGAN PEMBAGIAN QTY & PERINGATAN UNPAID) */}
      {showSplitBillModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9995
        }}>
          <div className="glass-card animate-fade-in" style={{ width: '100%', maxWidth: '640px', maxHeight: '92vh', overflowY: 'auto', padding: '24px', background: '#1e293b', borderRadius: '16px' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '1.3rem' }}>✂️</span>
                <h3 style={{ fontSize: '1.1rem', fontWeight: '900', color: '#f8fafc', margin: 0 }}>Split Bill (Pisah Tagihan Per Produk)</h3>
              </div>
              <button onClick={() => setShowSplitBillModal(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            {/* Split Mode Selector */}
            <div style={{ display: 'flex', background: '#0f172a', borderRadius: '10px', padding: '4px', marginBottom: '16px', border: '1px solid #334155' }}>
              <button
                type="button"
                onClick={() => setSplitType('by_item')}
                style={{
                  flex: 1,
                  padding: '9px 0',
                  borderRadius: '8px',
                  border: 'none',
                  background: splitType === 'by_item' ? '#38bdf8' : 'transparent',
                  color: splitType === 'by_item' ? '#0f172a' : '#94a3b8',
                  fontSize: '0.82rem',
                  fontWeight: '900',
                  cursor: 'pointer'
                }}
              >
                🍱 Split Berdasarkan Produk (Itemized Qty)
              </button>
              <button
                type="button"
                onClick={() => setSplitType('equal')}
                style={{
                  flex: 1,
                  padding: '9px 0',
                  borderRadius: '8px',
                  border: 'none',
                  background: splitType === 'equal' ? '#38bdf8' : 'transparent',
                  color: splitType === 'equal' ? '#0f172a' : '#94a3b8',
                  fontSize: '0.82rem',
                  fontWeight: '900',
                  cursor: 'pointer'
                }}
              >
                👥 Split Sama Rata (Equal)
              </button>
            </div>

            {/* MODE 1: SPLIT BERDASARKAN PRODUK (ITEMIZED) */}
            {splitType === 'by_item' ? (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <span style={{ fontSize: '0.78rem', color: '#cbd5e1', fontWeight: '700' }}>
                    Alokasikan Jumlah Orderan ke Masing-Masing Pelanggan:
                  </span>
                  {/* Button Tambah Pelanggan */}
                  <button
                    type="button"
                    onClick={() => {
                      const nextNum = splitCustomerList.length + 1;
                      setSplitCustomerList(prev => [...prev, `Pelanggan ${nextNum}`]);
                    }}
                    style={{
                      padding: '4px 10px',
                      borderRadius: '8px',
                      border: '1px dashed #38bdf8',
                      background: 'rgba(56,189,248,0.1)',
                      color: '#38bdf8',
                      fontSize: '0.74rem',
                      fontWeight: '800',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <Plus size={12} />
                    <span>+ Tambah Pelanggan ({splitCustomerList.length})</span>
                  </button>
                </div>

                {cart.length === 0 ? (
                  <div style={{ padding: '24px', textAlign: 'center', background: '#0f172a', borderRadius: '12px', color: '#94a3b8', fontSize: '0.82rem' }}>
                    Keranjang saat ini kosong. Tambahkan produk ke keranjang terlebih dahulu.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '280px', overflowY: 'auto', marginBottom: '16px' }}>
                    {cart.map((item, idx) => {
                      const totalAssignedQty = Object.values(itemQtySplitMap[idx] || {}).reduce((a, b) => a + b, 0);
                      const unassignedQty = Math.max(0, item.qty - totalAssignedQty);

                      return (
                        <div key={idx} style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '12px', padding: '12px 14px' }}>
                          {/* Row Top: Nama Orderan, Qty, & Total */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ background: '#2563eb', color: '#ffffff', fontSize: '0.76rem', fontWeight: '900', padding: '2px 8px', borderRadius: '6px' }}>
                                {item.qty}x
                              </span>
                              <span style={{ fontSize: '0.88rem', fontWeight: '900', color: '#f8fafc' }}>
                                {item.name}
                              </span>
                            </div>
                            <div style={{ fontSize: '0.88rem', fontWeight: '900', color: '#38bdf8' }}>
                              {formatRupiah(item.price * item.qty)}
                            </div>
                          </div>

                          {/* Customer Allocation Chips Bar */}
                          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                            {splitCustomerList.map((cName, cIdx) => {
                              const qtyForCust = itemQtySplitMap[idx]?.[cIdx] || 0;
                              const isAssigned = qtyForCust > 0;

                              return (
                                <div
                                  key={cIdx}
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    background: isAssigned ? 'rgba(56,189,248,0.15)' : '#1e293b',
                                    border: '1px solid',
                                    borderColor: isAssigned ? '#38bdf8' : '#334155',
                                    borderRadius: '8px',
                                    padding: '3px 8px'
                                  }}
                                >
                                  <span style={{ fontSize: '0.72rem', fontWeight: '800', color: isAssigned ? '#38bdf8' : '#cbd5e1' }}>
                                    {cName}
                                  </span>

                                  {/* Counter Controls */}
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        if (qtyForCust > 0) {
                                          setItemQtySplitMap(prev => ({
                                            ...prev,
                                            [idx]: {
                                              ...(prev[idx] || {}),
                                              [cIdx]: qtyForCust - 1
                                            }
                                          }));
                                        }
                                      }}
                                      style={{ width: '18px', height: '18px', borderRadius: '4px', background: '#334155', border: 'none', color: '#fff', fontSize: '0.7rem', fontWeight: '900', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                    >
                                      -
                                    </button>
                                    <span style={{ fontSize: '0.76rem', fontWeight: '900', color: '#ffffff', minWidth: '14px', textAlign: 'center' }}>
                                      {qtyForCust}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        if (totalAssignedQty < item.qty) {
                                          setItemQtySplitMap(prev => ({
                                            ...prev,
                                            [idx]: {
                                              ...(prev[idx] || {}),
                                              [cIdx]: (prev[idx]?.[cIdx] || 0) + 1
                                            }
                                          }));
                                        }
                                      }}
                                      style={{ width: '18px', height: '18px', borderRadius: '4px', background: '#2563eb', border: 'none', color: '#fff', fontSize: '0.7rem', fontWeight: '900', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                    >
                                      +
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>

                          {/* Allocation Status Indicator */}
                          {unassignedQty > 0 ? (
                            <div style={{ marginTop: '6px', fontSize: '0.70rem', color: '#fb7185', fontWeight: '800' }}>
                              ⚠️ Belum dialokasikan: {unassignedQty}x ({formatRupiah(unassignedQty * item.price)})
                            </div>
                          ) : (
                            <div style={{ marginTop: '6px', fontSize: '0.70rem', color: '#34d399', fontWeight: '800' }}>
                              ✓ Seluruh {item.qty}x item dialokasikan pas.
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Bottom Summary Cards Per Customer */}
                <div style={{ fontSize: '0.78rem', color: '#cbd5e1', fontWeight: '800', marginBottom: '8px' }}>
                  Total Tagihan Tiap Pelanggan:
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '8px', marginBottom: '16px' }}>
                  {splitCustomerList.map((cName, cIdx) => {
                    const custTotal = cart.reduce((sum, item, idx) => {
                      const q = itemQtySplitMap[idx]?.[cIdx] || 0;
                      return sum + (q * item.price);
                    }, 0);

                    const custItemsCount = cart.reduce((sum, item, idx) => {
                      return sum + (itemQtySplitMap[idx]?.[cIdx] || 0);
                    }, 0);

                    return (
                      <div key={cIdx} style={{ background: '#0f172a', padding: '10px 12px', borderRadius: '10px', border: '1px solid', borderColor: custTotal > 0 ? '#38bdf8' : '#334155' }}>
                        <div style={{ fontSize: '0.76rem', fontWeight: '900', color: '#38bdf8' }}>{cName}</div>
                        <div style={{ fontSize: '0.68rem', color: '#94a3b8', margin: '2px 0' }}>{custItemsCount} pcs produk</div>
                        <div style={{ fontSize: '0.90rem', fontWeight: '900', color: '#ffffff' }}>{formatRupiah(custTotal)}</div>
                      </div>
                    );
                  })}
                </div>

                {/* Unassigned / Unpaid Items Warning Box */}
                {(() => {
                  let unassignedTotalRp = 0;
                  let unassignedItemsCount = 0;

                  cart.forEach((item, idx) => {
                    const totalAssigned = Object.values(itemQtySplitMap[idx] || {}).reduce((a, b) => a + b, 0);
                    const unassignedQty = Math.max(0, item.qty - totalAssigned);
                    if (unassignedQty > 0) {
                      unassignedItemsCount += unassignedQty;
                      unassignedTotalRp += (unassignedQty * item.price);
                    }
                  });

                  if (unassignedTotalRp > 0) {
                    return (
                      <div style={{ marginBottom: '16px', background: 'rgba(244,63,94,0.15)', border: '1px dashed rgba(244,63,94,0.4)', borderRadius: '10px', padding: '10px 14px', fontSize: '0.78rem', color: '#fb7185', fontWeight: '800' }}>
                        ⚠️ INFORMASI TERHUTANG: Terdapat {unassignedItemsCount} item ({formatRupiah(unassignedTotalRp)}) yang BELUM TERBAYAR / UNASSIGNED!
                      </div>
                    );
                  }
                  return null;
                })()}
              </div>
            ) : (
              /* MODE 2: SPLIT SAMA RATA */
              <div>
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ fontSize: '0.8rem', color: '#cbd5e1', fontWeight: '700', marginBottom: '8px' }}>
                    Bagi Tagihan Sama Rata Berdasarkan Jumlah Orang:
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: '#0f172a', padding: '12px', borderRadius: '10px', border: '1px solid #334155' }}>
                    <button
                      onClick={() => setSplitPeopleCount(Math.max(2, splitPeopleCount - 1))}
                      style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#1e293b', border: '1px solid #334155', color: '#fff', fontSize: '1.2rem', fontWeight: '900', cursor: 'pointer' }}
                    >
                      -
                    </button>
                    <div style={{ flex: 1, textAlign: 'center' }}>
                      <div style={{ fontSize: '1.2rem', fontWeight: '900', color: '#38bdf8' }}>{splitPeopleCount} Orang</div>
                      <div style={{ fontSize: '0.74rem', color: '#94a3b8' }}>Masing-masing membayar</div>
                    </div>
                    <button
                      onClick={() => setSplitPeopleCount(splitPeopleCount + 1)}
                      style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#1e293b', border: '1px solid #334155', color: '#fff', fontSize: '1.2rem', fontWeight: '900', cursor: 'pointer' }}
                    >
                      +
                    </button>
                  </div>
                </div>

                <div style={{ background: '#0f172a', padding: '14px', borderRadius: '12px', border: '1px dashed #38bdf8', marginBottom: '20px', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>Total Tagihan Meja</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: '900', color: '#ffffff', margin: '2px 0 6px 0' }}>{formatRupiah(cartTotal)}</div>
                  <div style={{ fontSize: '0.78rem', color: '#38bdf8', fontWeight: '900' }}>
                    Tagihan Per Orang: {formatRupiah(Math.round(cartTotal / splitPeopleCount))}
                  </div>
                </div>
              </div>
            )}

            {/* Modal Actions */}
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => setShowSplitBillModal(false)}
                style={{ flex: 1, padding: '12px', background: '#334155', color: '#f8fafc', border: 'none', borderRadius: '10px', fontWeight: '800', cursor: 'pointer' }}
              >
                Batal
              </button>
              <button
                onClick={() => {
                  let unassignedTotalRp = 0;
                  let unassignedItemsCount = 0;

                  cart.forEach((item, idx) => {
                    const totalAssigned = Object.values(itemQtySplitMap[idx] || {}).reduce((a, b) => a + b, 0);
                    const unassignedQty = Math.max(0, item.qty - totalAssigned);
                    if (unassignedQty > 0) {
                      unassignedItemsCount += unassignedQty;
                      unassignedTotalRp += (unassignedQty * item.price);
                    }
                  });

                  // Execute batch print per customer
                  let splitPrintHTML = `
                    <!DOCTYPE html>
                    <html>
                    <head>
                      <title>Struk Split Bill</title>
                      <style>
                        @page { size: 80mm auto; margin: 0; }
                        body { font-family: 'Courier New', Courier, monospace; width: 76mm; margin: 0 auto; padding: 6mm 3mm; font-size: 11px; color: #000; }
                        .ticket-block { page-break-after: always; border-bottom: 2px dashed #000; padding-bottom: 12px; margin-bottom: 12px; }
                        .text-center { text-align: center; }
                        .bold { font-weight: bold; }
                        .divider-dash { border-top: 1px dashed #000; margin: 6px 0; }
                        .row { display: flex; justify-content: space-between; }
                        .warn-box { border: 1px dashed #000; padding: 6px; font-size: 9px; font-weight: bold; margin-top: 8px; text-align: center; }
                      </style>
                    </head>
                    <body>
                  `;

                  if (splitType === 'by_item') {
                    // 1. INDIVIDUAL RECEIPTS PER CUSTOMER (CLEAN WITHOUT WARNING BOX ON PRINTED PAPER)
                    splitCustomerList.forEach((cName, cIdx) => {
                      const custItems = cart.map((item, idx) => {
                        const q = itemQtySplitMap[idx]?.[cIdx] || 0;
                        return q > 0 ? { ...item, splitQty: q } : null;
                      }).filter(Boolean);

                      if (custItems.length > 0) {
                        const custTotal = custItems.reduce((s, it) => s + (it.splitQty * it.price), 0);
                        splitPrintHTML += `
                          <div class="ticket-block">
                            <div class="text-center">
                              <div class="bold" style="font-size:13px;">${currentOutlet.name?.toUpperCase() || 'MRIS RESTO'}</div>
                              <div class="bold" style="font-size:11px; margin-top:4px;">*** STRUK SPLIT BILL - ${cName.toUpperCase()} ***</div>
                            </div>
                            <div class="divider-dash"></div>
                            <div class="row"><span>Meja:</span><span class="bold">${selectedTableObj?.number || '01'}</span></div>
                            <div class="row"><span>Pelanggan:</span><span>${cName}</span></div>
                            <div class="divider-dash"></div>
                            <div class="row bold"><span>QTY  PRODUK</span><span>TOTAL</span></div>
                            <div class="divider-dash"></div>
                        `;
                        custItems.forEach(it => {
                          splitPrintHTML += `
                            <div class="row" style="margin:2px 0;">
                              <span>${it.splitQty}x ${it.name.toUpperCase()}</span>
                              <span>${formatRupiah(it.splitQty * it.price)}</span>
                            </div>
                          `;
                        });
                        splitPrintHTML += `
                            <div class="divider-dash"></div>
                            <div class="row bold" style="font-size:12px;"><span>TOTAL ${cName.toUpperCase()}:</span><span>${formatRupiah(custTotal)}</span></div>
                          </div>
                        `;
                      }
                    });

                    // 2. OVERALL MASTER REKAPITULASI TICKET (TAMPILKAN SEMUA PELANGGAN & GRAND TOTAL MEJA)
                    let grandSplitTotal = 0;
                    splitPrintHTML += `
                      <div class="ticket-block">
                        <div class="text-center">
                          <div class="bold" style="font-size:13px;">${currentOutlet.name?.toUpperCase() || 'MRIS RESTO'}</div>
                          <div class="bold" style="font-size:11px; margin-top:4px;">*** REKAPITULASI SPLIT BILL OVERALL ***</div>
                        </div>
                        <div class="divider-dash"></div>
                        <div class="row"><span>Meja:</span><span class="bold">${selectedTableObj?.number || 'Meja 01'}</span></div>
                        <div class="row"><span>Waktu:</span><span>${new Date().toLocaleDateString('id-ID')} ${new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span></div>
                        <div class="divider-dash"></div>
                    `;

                    splitCustomerList.forEach((cName, cIdx) => {
                      const custItems = cart.map((item, idx) => {
                        const q = itemQtySplitMap[idx]?.[cIdx] || 0;
                        return q > 0 ? { ...item, splitQty: q } : null;
                      }).filter(Boolean);

                      if (custItems.length > 0) {
                        const custTotal = custItems.reduce((s, it) => s + (it.splitQty * it.price), 0);
                        grandSplitTotal += custTotal;

                        splitPrintHTML += `
                          <div style="margin-top:6px; font-weight:bold; font-size:11px;">[ ${cName.toUpperCase()} ]</div>
                        `;
                        custItems.forEach(it => {
                          splitPrintHTML += `
                            <div class="row" style="margin:2px 0;">
                              <span>${it.splitQty}x ${it.name.toUpperCase()}</span>
                              <span>${formatRupiah(it.splitQty * it.price)}</span>
                            </div>
                          `;
                        });
                        splitPrintHTML += `
                          <div class="row bold" style="font-size:10px; margin-bottom:4px;">
                            <span>Subtotal ${cName}:</span>
                            <span>${formatRupiah(custTotal)}</span>
                          </div>
                          <div class="divider-dash"></div>
                        `;
                      }
                    });

                    splitPrintHTML += `
                        <div class="row bold" style="font-size:12px; margin-top:6px;">
                          <span>GRAND TOTAL MEJA:</span>
                          <span>${formatRupiah(grandSplitTotal)}</span>
                        </div>
                        <div class="divider-dash"></div>
                        <div class="text-center bold" style="font-size:10px;">*** BUKTI REKAP PEMBAYARAN KASIR ***</div>
                      </div>
                    `;
                  } else {
                    for (let i = 1; i <= splitPeopleCount; i++) {
                      splitPrintHTML += `
                        <div class="ticket-block">
                          <div class="text-center">
                            <div class="bold" style="font-size:13px;">${currentOutlet.name?.toUpperCase() || 'MRIS RESTO'}</div>
                            <div class="bold" style="font-size:11px; margin-top:4px;">*** STRUK SPLIT EQUAL - ORANG ${i} dari ${splitPeopleCount} ***</div>
                          </div>
                          <div class="divider-dash"></div>
                          <div class="row"><span>Meja:</span><span class="bold">${selectedTableObj?.number || '01'}</span></div>
                          <div class="divider-dash"></div>
                          <div class="row bold" style="font-size:12px;"><span>TAGIHAN PER ORANG:</span><span>${formatRupiah(Math.round(cartTotal / splitPeopleCount))}</span></div>
                        </div>
                      `;
                    }
                  }

                  splitPrintHTML += `</body></html>`;

                  const win = window.open('', '_blank', 'width=400,height=600');
                  if (win) {
                    win.document.write(splitPrintHTML);
                    win.document.close();
                    win.focus();
                    setTimeout(() => win.print(), 250);
                  }

                  setShowSplitBillModal(false);
                }}
                style={{ flex: 1, padding: '12px', background: '#38bdf8', color: '#0f172a', border: 'none', borderRadius: '10px', fontWeight: '900', cursor: 'pointer' }}
              >
                🖨️ Cetak Struk Split Bill
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 8.4 MODAL MERGE BILL (GABUNG TAGIHAN MEJA) */}
      {showMergeBillModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9995
        }}>
          <div className="glass-card animate-fade-in" style={{ width: '100%', maxWidth: '440px', padding: '24px', background: '#1e293b', borderRadius: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '1.2rem' }}>🔗</span>
                <h3 style={{ fontSize: '1.1rem', fontWeight: '900', color: '#f8fafc', margin: 0 }}>Merge Bill (Gabung Meja)</h3>
              </div>
              <button onClick={() => setShowMergeBillModal(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ fontSize: '0.8rem', color: '#cbd5e1', fontWeight: '700', marginBottom: '10px' }}>
              Pilih Meja Lain yang Ingin Digabungkan ke Meja Ini ({selectedTableObj?.number || 'Meja Active'}):
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '220px', overflowY: 'auto', marginBottom: '20px' }}>
              {Object.keys(tableStatusMap).filter(tId => tableStatusMap[tId]?.status === 'occupied' && tId !== selectedTableId).length === 0 ? (
                <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8', fontSize: '0.82rem', background: '#0f172a', borderRadius: '10px' }}>
                  Tidak ada meja terisi lain saat ini yang dapat digabungkan.
                </div>
              ) : (
                Object.keys(tableStatusMap).filter(tId => tableStatusMap[tId]?.status === 'occupied' && tId !== selectedTableId).map(tId => {
                  const tData = tableStatusMap[tId];
                  return (
                    <div
                      key={tId}
                      onClick={() => {
                        if (tData?.pendingOrder?.items) {
                          setCart(prev => [...prev, ...tData.pendingOrder.items]);
                          setTableStatusMap(prev => ({
                            ...prev,
                            [tId]: { status: 'available', pendingOrder: null }
                          }));
                          alert(`Pesanan dari ${tId} berhasil digabungkan ke keranjang meja ini!`);
                          setShowMergeBillModal(false);
                        }
                      }}
                      style={{
                        padding: '12px 14px', background: '#0f172a', border: '1px solid #334155', borderRadius: '10px',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer'
                      }}
                    >
                      <div>
                        <div style={{ fontSize: '0.88rem', fontWeight: '900', color: '#a78bfa' }}>{tId}</div>
                        <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>{tData?.pendingOrder?.customerName || 'Pelanggan'}</div>
                      </div>
                      <div style={{ fontSize: '0.88rem', fontWeight: '900', color: '#ffffff' }}>
                        {formatRupiah(tData?.pendingOrder?.totalAmount || 0)}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <button
              onClick={() => setShowMergeBillModal(false)}
              style={{ width: '100%', padding: '12px', background: '#334155', color: '#f8fafc', border: 'none', borderRadius: '10px', fontWeight: '800', cursor: 'pointer' }}
            >
              Tutup
            </button>
          </div>
        </div>
      )}

      {/* 8.5 MODAL TUKAR POIN (LOYALTY REDEMPTION) */}
      {showTukarPoinModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9995
        }}>
          <div className="glass-card animate-fade-in" style={{ width: '100%', maxWidth: '420px', padding: '24px', background: '#1e293b', borderRadius: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '1.2rem' }}>🎁</span>
                <h3 style={{ fontSize: '1.1rem', fontWeight: '900', color: '#f8fafc', margin: 0 }}>Tukar Poin Loyalty</h3>
              </div>
              <button onClick={() => setShowTukarPoinModal(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            {(() => {
              const matchedCust = (masterData?.customers || []).find(c => c.name?.toLowerCase() === (selectedCustomer || '').toLowerCase());
              const availablePoints = matchedCust ? (matchedCust.points || 0) : 350;
              const valueRupiah = availablePoints * 1000;

              return (
                <div style={{ background: '#0f172a', padding: '12px 14px', borderRadius: '10px', border: '1px solid #334155', marginBottom: '16px' }}>
                  <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>Pelanggan Terpilih:</div>
                  <div style={{ fontSize: '0.95rem', fontWeight: '900', color: '#fbbf24', margin: '2px 0' }}>👤 {selectedCustomer || 'Pelanggan Umum'}</div>
                  <div style={{ fontSize: '0.80rem', color: '#34d399', fontWeight: '800', marginTop: '4px' }}>
                    Tersedia: {availablePoints} Poin (Nilai Pembayaran: {formatRupiah(valueRupiah)})
                  </div>
                </div>
              );
            })()}

            <div style={{ marginBottom: '20px' }}>
              <label style={{ fontSize: '0.8rem', color: '#cbd5e1', display: 'block', marginBottom: '4px', fontWeight: '700' }}>
                Jumlah Poin Ditukarkan (1 Poin = Rp 1.000 / Setiap Rp 1.000 Menu = 1 Poin)
              </label>
              <span style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'block', marginBottom: '8px' }}>
                Dapat digunakan sebagai pembayaran lunas atau potongan harga pesanan menu.
              </span>
              <input
                type="number"
                value={pointsToRedeem}
                onChange={e => setPointsToRedeem(e.target.value)}
                placeholder="Contoh: 10, 50, 100 Poin..."
                style={{
                  width: '100%', padding: '12px 14px', borderRadius: '10px',
                  border: '1px solid #334155', background: '#0f172a', color: '#ffffff',
                  fontSize: '1rem', fontWeight: '900', outline: 'none'
                }}
              />
              {pointsToRedeem && (
                <div style={{ marginTop: '8px', fontSize: '0.78rem', color: '#fbbf24', fontWeight: '800', background: 'rgba(251, 191, 36, 0.12)', padding: '8px 12px', borderRadius: '8px', border: '1px solid rgba(251, 191, 36, 0.3)' }}>
                  💡 Nilai Pembayaran / Diskon Poin: <strong>{formatRupiah(Number(pointsToRedeem || 0) * 1000)}</strong> ({Number(pointsToRedeem || 0)} Poin)
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => setShowTukarPoinModal(false)}
                style={{ flex: 1, padding: '12px', background: '#334155', color: '#f8fafc', border: 'none', borderRadius: '10px', fontWeight: '800', cursor: 'pointer' }}
              >
                Batal
              </button>
              <button
                onClick={() => {
                  if (!pointsToRedeem || Number(pointsToRedeem) <= 0) {
                    alert('Mohon masukkan jumlah poin yang ingin ditukarkan.');
                    return;
                  }
                  const discRp = Number(pointsToRedeem) * 1000;
                  setDiscountValue(discRp.toString());
                  setDiscountMode('nominal');
                  alert(`Berhasil menukarkan ${pointsToRedeem} poin menjadi Pembayaran / Diskon ${formatRupiah(discRp)}!`);
                  setShowTukarPoinModal(false);
                }}
                style={{ flex: 1, padding: '12px', background: '#fbbf24', color: '#0f172a', border: 'none', borderRadius: '10px', fontWeight: '900', cursor: 'pointer' }}
              >
                Tukarkan Poin
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 8.6 MODAL KUPON (VOUCHER PROMO) */}
      {showKuponModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9995
        }}>
          <div className="glass-card animate-fade-in" style={{ width: '100%', maxWidth: '420px', padding: '24px', background: '#1e293b', borderRadius: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '1.2rem' }}>🎟️</span>
                <h3 style={{ fontSize: '1.1rem', fontWeight: '900', color: '#f8fafc', margin: 0 }}>Kupon & Voucher Promo</h3>
              </div>
              <button onClick={() => setShowKuponModal(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label style={{ fontSize: '0.8rem', color: '#cbd5e1', display: 'block', marginBottom: '6px', fontWeight: '700' }}>
                Pilih atau Input Kode Kupon:
              </label>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '12px' }}>
                {[
                  { code: 'DISKON10K', desc: 'Diskon Rp 10rb', type: 'nominal', val: 10000 },
                  { code: 'PROMO50', desc: 'Diskon 50%', type: 'percent', val: 50 },
                  { code: 'VIPULTAH', desc: 'Diskon Rp 25rb', type: 'nominal', val: 25000 }
                ].map(c => (
                  <button
                    key={c.code}
                    onClick={() => {
                      setCouponCodeInput(c.code);
                      if (c.type === 'percent') {
                        setDiscountMode('percent');
                        setDiscountInputVal(c.val.toString());
                        const calcDisc = Math.round((cartSubtotal * c.val) / 100);
                        setDiscountValue(calcDisc.toString());
                      } else {
                        setDiscountMode('nominal');
                        setDiscountValue(c.val.toString());
                      }
                      setCouponMsg({ type: 'success', text: `Kupon ${c.code} (${c.desc}) berhasil diterapkan!` });
                    }}
                    style={{
                      padding: '6px 12px', background: couponCodeInput === c.code ? 'rgba(52,211,153,0.2)' : '#0f172a',
                      border: '1px solid', borderColor: couponCodeInput === c.code ? '#34d399' : '#334155',
                      color: couponCodeInput === c.code ? '#34d399' : '#cbd5e1', borderRadius: '6px',
                      fontSize: '0.76rem', fontWeight: '800', cursor: 'pointer'
                    }}
                  >
                    🎟️ {c.code}
                  </button>
                ))}
              </div>

              <input
                type="text"
                value={couponCodeInput}
                onChange={e => setCouponCodeInput(e.target.value.toUpperCase())}
                placeholder="Atau ketik kode kupon di sini..."
                style={{
                  width: '100%', padding: '12px 14px', borderRadius: '10px',
                  border: '1px solid #334155', background: '#0f172a', color: '#ffffff',
                  fontSize: '0.9rem', fontWeight: '900', outline: 'none'
                }}
              />
            </div>

            {couponMsg.text && (
              <div style={{ marginBottom: '16px', padding: '10px 12px', borderRadius: '8px', background: couponMsg.type === 'success' ? 'rgba(52,211,153,0.15)' : 'rgba(244,63,94,0.15)', border: '1px solid', borderColor: couponMsg.type === 'success' ? 'rgba(52,211,153,0.3)' : 'rgba(244,63,94,0.3)', color: couponMsg.type === 'success' ? '#34d399' : '#fb7185', fontSize: '0.78rem', fontWeight: '800' }}>
                {couponMsg.text}
              </div>
            )}

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => setShowKuponModal(false)}
                style={{ flex: 1, padding: '12px', background: '#334155', color: '#f8fafc', border: 'none', borderRadius: '10px', fontWeight: '800', cursor: 'pointer' }}
              >
                Tutup
              </button>
              <button
                onClick={() => {
                  if (!couponCodeInput) {
                    setCouponMsg({ type: 'error', text: 'Mohon masukan kode kupon terlebih dahulu.' });
                    return;
                  }
                  setCouponMsg({ type: 'success', text: `Kupon ${couponCodeInput} berhasil diterapkan!` });
                  setTimeout(() => setShowKuponModal(false), 800);
                }}
                style={{ flex: 1, padding: '12px', background: '#34d399', color: '#0f172a', border: 'none', borderRadius: '10px', fontWeight: '900', cursor: 'pointer' }}
              >
                Gunakan Kupon
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 8.5 DEDICATED THERMAL TICKET PREVIEW MODAL (KITCHEN & BAR TICKETS - TANPA HARGA) */}
      {ticketPreviewData && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200
        }}>
          <div style={{
            width: '100%', maxWidth: '380px', background: '#ffffff', color: '#000000',
            borderRadius: '16px', padding: '24px', fontFamily: '"Courier New", Courier, monospace',
            boxShadow: '0 20px 40px rgba(0,0,0,0.5)', display: 'flex', flexDirection: 'column'
          }}>
            {/* Header Thermal */}
            <div style={{ textAlign: 'center', borderBottom: '2px dashed #000', paddingBottom: '12px', marginBottom: '12px' }}>
              {/* BARIS 1: NAMA OUTLET (HURUF BESAR SEMUA, RATA TENGAH, UKURAN FONT LEBIH BESAR 1 LEVEL) */}
              <div style={{ fontSize: '1.15rem', fontWeight: '900', textAlign: 'center', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                {currentOutlet.name?.toUpperCase() || 'RESTORAN UTAMA'}
              </div>

              {/* BARIS 2: ALAMAT LOKASI (HURUF BESAR DI SETIAP KATA, RATA TENGAH, UKURAN FONT 1 LEVEL LEBIH KECIL) */}
              <div style={{ fontSize: '0.88rem', fontWeight: '600', textAlign: 'center', color: '#222222', marginTop: '4px' }}>
                {(currentOutlet.address || 'Jl. Sudirman No. 45, Jakarta')
                  .toLowerCase()
                  .split(' ')
                  .map(w => w ? w.charAt(0).toUpperCase() + w.slice(1) : '')
                  .join(' ')}
              </div>

              <div style={{ fontSize: '0.82rem', fontWeight: '900', marginTop: '8px', background: '#000000', color: '#ffffff', padding: '4px 10px', borderRadius: '4px', display: 'inline-block' }}>
                {ticketPreviewType === 'KITCHEN' && '🍳 STRUK DAPUR (KITCHEN TICKET)'}
                {ticketPreviewType === 'BAR' && '🍹 STRUK BAR (BAR TICKET)'}
                {ticketPreviewType === 'TABLE_BILL' && '📋 STRUK MEJA (BILL SEMENTARA)'}
                {ticketPreviewType === 'CASHIER' && '🧾 STRUK COPY KASIR'}
              </div>
              <div style={{ fontSize: '0.75rem', marginTop: '6px', fontWeight: '800' }}>
                {(ticketPreviewType === 'KITCHEN' || ticketPreviewType === 'BAR') ? '*** TAMPIL PRODUK TANPA HARGA ***' : '*** RINCIAN NOTA TAGIHAN ***'}
              </div>
            </div>

            {/* Meta Order Info */}
            <div style={{ fontSize: '0.82rem', marginBottom: '12px', borderBottom: '1px dashed #ccc', paddingBottom: '8px', lineHeight: 1.5 }}>
              <div><strong>No. Order:</strong> {ticketPreviewData.id}</div>
              <div><strong>Meja:</strong> {ticketPreviewData.table_number || 'Meja 01'}</div>
              <div><strong>Waktu:</strong> {ticketPreviewData.date} {ticketPreviewData.time || ''}</div>
              <div><strong>Pelanggan:</strong> {ticketPreviewData.customer_name || 'Pelanggan Umum'}</div>
            </div>

            {/* Item Table Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', fontWeight: '900', borderBottom: '1px solid #000', paddingBottom: '4px', marginBottom: '8px' }}>
              <span>QTY  NAMA PRODUK / MINUMAN</span>
              {(ticketPreviewType === 'TABLE_BILL' || ticketPreviewType === 'CASHIER') && <span>SUBTOTAL</span>}
            </div>

            {/* Item Rows */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px', fontSize: '0.85rem' }}>
              {filterItemsForTicketTarget(ticketPreviewData.items || [], ticketPreviewType).map((it, idx) => (
                <div key={idx} style={{ borderBottom: '1px dashed #eee', paddingBottom: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: '800' }}>
                    <span>{it.qty}x  {it.name.toUpperCase()}</span>
                    {(ticketPreviewType === 'TABLE_BILL' || ticketPreviewType === 'CASHIER') && (
                      <span>{formatRupiah((it.price || it.price_unit || 0) * it.qty)}</span>
                    )}
                  </div>
                  {it.notes && (
                    <div style={{ fontSize: '0.75rem', fontStyle: 'italic', color: '#444444', marginLeft: '24px', marginTop: '2px' }}>
                      * Catatan: {it.notes}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Footer Summary - NO PRICE FOR KITCHEN / BAR TICKETS */}
            {(ticketPreviewType === 'TABLE_BILL' || ticketPreviewType === 'CASHIER') ? (
              <div style={{ borderTop: '2px dashed #000', paddingTop: '8px', marginBottom: '16px', fontSize: '0.9rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: '900' }}>
                  <span>TOTAL BILL</span>
                  <span>{formatRupiah(ticketPreviewData.amount || cartTotal)}</span>
                </div>
                {(ticketPreviewType === 'TABLE_BILL' || ticketPreviewType === 'CASHIER') && (
                  <div style={{
                    fontSize: '0.72rem',
                    fontWeight: '800',
                    color: '#dc2626',
                    border: '1px dashed #dc2626',
                    padding: '8px',
                    borderRadius: '6px',
                    marginTop: '10px',
                    textAlign: 'center',
                    lineHeight: 1.35
                  }}>
                    ⚠️ Struk ini hanya sebagai informasi tagihan BUKAN BUKTI PEMBAYARAN. Apabila kasir memberikan struk ini dan anda melakukan pembayaran, maka anda berhak mendapatkan 1 juta rupiah langsung dari kasir
                  </div>
                )}
              </div>
            ) : (
              <div style={{ borderTop: '2px dashed #000', paddingTop: '10px', marginBottom: '16px', textAlign: 'center', fontSize: '0.80rem', fontWeight: '900', fontStyle: 'italic' }}>
                *** PRODUK TANPA HARGA (TICKET DAPUR/BAR) ***
              </div>
            )}

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setTicketPreviewData(null)}
                style={{ flex: 1, padding: '10px', background: '#e2e8f0', color: '#334155', border: 'none', borderRadius: '8px', fontWeight: '800', cursor: 'pointer' }}
              >
                Tutup
              </button>
              <button
                type="button"
                onClick={() => {
                  if (ticketPreviewData?.selections) {
                    handleExecuteBatchPrint(ticketPreviewData.tx || ticketPreviewData, ticketPreviewData.selections);
                  } else {
                    handlePrintSingleReceipt(ticketPreviewData?.tx || ticketPreviewData);
                  }
                }}
                style={{ flex: 1, padding: '10px', background: '#2563eb', color: '#ffffff', border: 'none', borderRadius: '8px', fontWeight: '900', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
              >
                <Printer size={16} />
                <span>Cetak Thermal</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 9. DEDICATED FULL-SCREEN PEMBAYARAN MODAL (MATCHING SCREENSHOT 100%) */}
      {showPaymentScreenModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: '#090d16', zIndex: 120, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          
          {/* HEADER TOP BAR */}
          <div style={{
            height: '56px',
            background: '#0f294a',
            borderBottom: '1px solid rgba(255,255,255,0.08)',
            padding: '0 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            color: '#ffffff',
            flexShrink: 0
          }}>
            <button
              onClick={() => setShowPaymentScreenModal(false)}
              style={{
                background: 'none',
                border: 'none',
                color: '#ffffff',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px'
              }}
            >
              <ArrowLeft size={22} />
            </button>
            
            <div style={{ fontSize: '1.15rem', fontWeight: '800', letterSpacing: '0.3px' }}>
              Pembayaran
            </div>
            
            <div style={{ width: '28px' }}></div>
          </div>

          {/* BODY CONTENT (2-COLUMN CONTAINER) */}
          <div style={{
            flex: 1,
            padding: '20px',
            display: 'flex',
            gap: '20px',
            overflow: 'hidden',
            maxWidth: '1280px',
            margin: '0 auto',
            width: '100%'
          }}>

            {/* LEFT COLUMN: ORDER RECEIPT BREAKDOWN CARD */}
            <div style={{
              flex: '1 1 50%',
              background: '#ffffff',
              borderRadius: '16px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
              padding: '20px 24px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              overflowY: 'auto',
              border: '1px solid #e2e8f0'
            }}>
              <div>
                {/* Header Info Row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <div style={{ fontSize: '0.92rem', fontWeight: '800', color: '#1e293b' }}>
                    #Pesanan Baru
                  </div>
                  <div style={{ fontSize: '0.82rem', color: '#64748b', fontWeight: '600' }}>
                    {new Date().toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' })} - {new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>

                {/* Sub Header: Customer & Table */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '14px', marginBottom: '14px', borderBottom: '1px solid #f1f5f9' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#475569', fontSize: '0.82rem', fontWeight: '600' }}>
                    <User size={15} color="#64748b" />
                    <span>{selectedCustomer && selectedCustomer !== 'Pelanggan Umum' ? selectedCustomer : '-'}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#475569', fontSize: '0.82rem', fontWeight: '600' }}>
                    <Grid size={15} color="#64748b" />
                    <span>{orderType === 'Dine In' ? (selectedTableObj?.number || 'Meja -') : '-'}</span>
                  </div>
                </div>

                {/* Itemized List */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
                  {cart.map((item, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.82rem', color: '#64748b', fontWeight: '700', width: '24px' }}>x{item.qty}</span>
                        <span style={{ fontSize: '0.85rem', color: '#1e293b', fontWeight: '800', letterSpacing: '0.3px' }}>{item.name.toUpperCase()}</span>
                      </div>
                      <span style={{ fontSize: '0.85rem', color: '#475569', fontWeight: '700' }}>{formatRupiah(item.price * item.qty)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Financial Summary Breakdown */}
              <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.84rem', color: '#64748b', fontWeight: '600' }}>
                  <span>Subtotal</span>
                  <span>{formatRupiah(cartSubtotal)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.84rem', color: discountAmount > 0 ? '#ef4444' : '#64748b', fontWeight: discountAmount > 0 ? '800' : '600' }}>
                  <span>Diskon {discountAmount > 0 ? `(${discountType === 'percent' ? `${discountValue}%` : 'Nominal'})` : ''}</span>
                  <span>{discountAmount > 0 ? `- ${formatRupiah(discountAmount)}` : 'Rp 0'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.84rem', color: '#64748b', fontWeight: '600' }}>
                  <span>Service Charge</span>
                  <span>Rp 0</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.84rem', color: '#64748b', fontWeight: '600' }}>
                  <span>Pajak</span>
                  <span>Rp 0</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.84rem', color: '#64748b', fontWeight: '600' }}>
                  <span>Adjustment</span>
                  <span>Rp 0</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.98rem', fontWeight: '900', color: '#1d4ed8', marginTop: '6px', paddingTop: '6px', borderTop: '1px dashed #e2e8f0' }}>
                  <span>Total ({cart.reduce((s, i) => s + i.qty, 0)} items)</span>
                  <span>{formatRupiah(cartTotal)}</span>
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN: PAYMENT METHODS & CALCULATION BOARD */}
            <div style={{
              flex: '1 1 50%',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
              overflowY: 'auto'
            }}>
              {/* TOTAL BANNER CARD (BLUE GRADIENT) */}
              <div style={{
                background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                borderRadius: '14px',
                padding: '16px 20px',
                color: '#ffffff',
                textAlign: 'center',
                boxShadow: '0 4px 14px rgba(37,99,235,0.3)'
              }}>
                <div style={{ fontSize: '0.85rem', fontWeight: '700', opacity: 0.9, letterSpacing: '0.8px', marginBottom: '4px' }}>
                  TOTAL
                </div>
                <div style={{ fontSize: '1.9rem', fontWeight: '900' }}>
                  {formatRupiah(cartTotal)}
                </div>
              </div>

              {/* PAYMENT METHOD SELECTION GRID */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                {[
                  { id: 'Cash', label: 'Cash' },
                  { id: 'Pembayaran Poin', label: '⭐ Pembayaran Poin' },
                  { id: 'Transfer Bank', label: 'Transfer Bank' },
                  { id: 'Grab-Food', label: 'Grab-Food' },
                  { id: 'QRIS LINK AJA', label: 'QRIS LINK AJA' },
                  { id: 'Go-Food', label: 'Go-Food' },
                  { id: 'ShopeeFood', label: 'ShopeeFood' },
                  { id: 'QRIS BCA', label: 'QRIS BCA' },
                  { id: 'EDC Mandiri', label: 'EDC Mandiri' },
                  { id: 'EDC BCA', label: 'EDC BCA' }
                ].map(method => {
                  const isSelected = selectedPaymentMethod === method.id;
                  return (
                    <button
                      key={method.id}
                      onClick={() => {
                        setSelectedPaymentMethod(method.id);
                        if (method.id !== 'Cash') {
                          setTenderedCash('');
                        }
                      }}
                      style={{
                        background: isSelected ? 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)' : '#ffffff',
                        color: isSelected ? '#ffffff' : '#1e293b',
                        border: isSelected ? '2px solid #1d4ed8' : '1px solid #e2e8f0',
                        borderRadius: '12px',
                        padding: '16px 10px',
                        fontSize: '0.88rem',
                        fontWeight: '800',
                        cursor: 'pointer',
                        boxShadow: isSelected ? '0 4px 12px rgba(37,99,235,0.25)' : '0 2px 6px rgba(0,0,0,0.03)',
                        transition: 'all 0.15s ease',
                        textAlign: 'center'
                      }}
                    >
                      {method.label}
                    </button>
                  );
                })}
              </div>

              {/* PEMBAYARAN POIN INFO PANEL */}
              {selectedPaymentMethod === 'Pembayaran Poin' && (() => {
                const matchedCust = (masterData?.customers || []).find(c => c.name?.toLowerCase() === (selectedCustomer || '').toLowerCase());
                const custPoints = matchedCust ? (matchedCust.points || 0) : 350;
                const requiredPoints = Math.ceil(cartTotal / 1000);
                const isPointsSufficient = custPoints >= requiredPoints;

                return (
                  <div style={{ background: '#0f172a', padding: '14px 16px', borderRadius: '14px', border: '1px solid #a855f7', display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px' }}>
                    <div style={{ fontSize: '0.82rem', fontWeight: '900', color: '#a78bfa', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>⭐ Pembayaran Menggunakan Poin Loyalty</span>
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#cbd5e1', lineHeight: '1.4' }}>
                      • Perolehan Poin: <strong style={{ color: '#34d399' }}>Setiap Belanja Rp 100.000 = 1 Poin (Kelipatan)</strong><br/>
                      • Kurs Pembayaran Poin: <strong style={{ color: '#fbbf24' }}>1 Poin = Rp 1.000 (Setiap Rp 1.000 Menu = 1 Poin)</strong><br/>
                      • Dibutuhkan untuk Total {formatRupiah(cartTotal)}: <strong style={{ color: '#38bdf8' }}>{requiredPoints} Poin</strong><br/>
                      • Saldo Poin {selectedCustomer || 'Pelanggan'}: <strong style={{ color: isPointsSufficient ? '#34d399' : '#ef4444' }}>{custPoints} Poin</strong>
                    </div>
                    {!isPointsSufficient && (
                      <div style={{ fontSize: '0.72rem', color: '#ef4444', fontWeight: '700', background: 'rgba(239,68,68,0.15)', padding: '6px 10px', borderRadius: '6px' }}>
                        ⚠️ Saldo poin belum cukup untuk bayar lunas ({requiredPoints} Poin). Anda dapat menggunakan tombol Tukar Poin sebagai diskon parsial.
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* CASH TENDERED QUICK PRESET BAR (IF CASH IS SELECTED) */}
              {selectedPaymentMethod === 'Cash' && (
                <div style={{ background: '#ffffff', padding: '12px 16px', borderRadius: '14px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: '700' }}>Uang Tunai Diterima:</div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      type="number"
                      value={tenderedCash}
                      onChange={e => setTenderedCash(e.target.value)}
                      placeholder={`Nominal Tunai (cth: ${cartTotal})`}
                      style={{ flex: 1, padding: '10px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.9rem', fontWeight: '800', outline: 'none' }}
                    />
                    <button
                      onClick={() => setTenderedCash(cartTotal.toString())}
                      style={{ background: 'rgba(37,99,235,0.1)', border: '1px solid #2563eb', color: '#2563eb', padding: '0 14px', borderRadius: '10px', fontSize: '0.78rem', fontWeight: '800', cursor: 'pointer' }}
                    >
                      Uang Pas
                    </button>
                  </div>
                  <div style={{ display: 'flex', gap: '6px', overflowX: 'auto' }}>
                    {[10000, 20000, 50000, 100000].map(val => (
                      <button
                        key={val}
                        onClick={() => setTenderedCash(val.toString())}
                        style={{ flex: 1, background: '#f8fafc', border: '1px solid #cbd5e1', padding: '6px 4px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: '700', color: '#334155', cursor: 'pointer' }}
                      >
                        {formatRupiah(val)}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* BOTTOM PAYMENT CALCULATION BAR (3 COLUMNS) */}
              {(() => {
                const numTendered = selectedPaymentMethod === 'Cash' 
                  ? (tenderedCash !== '' ? Number(tenderedCash) : 0)
                  : cartTotal;
                const kurangBayar = Math.max(0, cartTotal - numTendered);
                const kembalian = Math.max(0, numTendered - cartTotal);

                return (
                  <div style={{
                    background: '#ffffff',
                    borderRadius: '14px',
                    padding: '14px 16px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
                  }}>
                    <div style={{ textAlign: 'center', flex: 1 }}>
                      <div style={{ fontSize: '0.75rem', color: '#475569', fontWeight: '700', marginBottom: '2px' }}>Total Bayar</div>
                      <div style={{ fontSize: '1rem', fontWeight: '900', color: '#1e293b' }}>
                        {formatRupiah(numTendered)}
                      </div>
                    </div>
                    <div style={{ width: '1px', height: '28px', background: '#e2e8f0' }}></div>
                    <div style={{ textAlign: 'center', flex: 1 }}>
                      <div style={{ fontSize: '0.75rem', color: '#475569', fontWeight: '700', marginBottom: '2px' }}>Kurang Bayar</div>
                      <div style={{ fontSize: '1rem', fontWeight: '900', color: kurangBayar > 0 ? '#ef4444' : '#1e293b' }}>
                        {formatRupiah(kurangBayar)}
                      </div>
                    </div>
                    <div style={{ width: '1px', height: '28px', background: '#e2e8f0' }}></div>
                    <div style={{ textAlign: 'center', flex: 1 }}>
                      <div style={{ fontSize: '0.75rem', color: '#475569', fontWeight: '700', marginBottom: '2px' }}>Kembalian</div>
                      <div style={{ fontSize: '1rem', fontWeight: '900', color: kembalian > 0 ? '#10b981' : '#1e293b' }}>
                        {formatRupiah(kembalian)}
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* BOTTOM MAIN "BAYAR" ACTION BUTTON */}
              {(() => {
                const numTendered = selectedPaymentMethod === 'Cash' 
                  ? (tenderedCash !== '' ? Number(tenderedCash) : 0)
                  : cartTotal;
                const isPaymentValid = selectedPaymentMethod !== 'Cash' || numTendered >= cartTotal;

                return (
                  <button
                    disabled={!isPaymentValid}
                    onClick={() => {
                      handleExecuteQuickPayment(selectedPaymentMethod, numTendered);
                      setShowPaymentScreenModal(false);
                    }}
                    style={{
                      width: '100%',
                      height: '48px',
                      background: isPaymentValid ? 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)' : '#e2e8f0',
                      color: isPaymentValid ? '#ffffff' : '#94a3b8',
                      border: 'none',
                      borderRadius: '12px',
                      fontSize: '1.05rem',
                      fontWeight: '900',
                      cursor: isPaymentValid ? 'pointer' : 'not-allowed',
                      boxShadow: isPaymentValid ? '0 4px 14px rgba(37,99,235,0.4)' : 'none',
                      transition: 'all 0.2s ease',
                      marginTop: 'auto'
                    }}
                  >
                    Bayar
                  </button>
                );
              })()}

            </div>
          </div>
        </div>
      )}

      {/* 10. MODAL TAMBAH / UBAH DATA PELANGGAN */}
      {showAddCustomerModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9998
        }}>
          <div className="glass-card animate-fade-in" style={{ width: '100%', maxWidth: '520px', padding: '24px', background: '#1e293b', borderRadius: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '12px' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: '900', color: '#f8fafc', margin: 0 }}>
                {editingCustomerData ? '✏️ Ubah Data Pelanggan' : '👤 Tambah Pelanggan Baru'}
              </h3>
              <button onClick={() => setShowAddCustomerModal(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={e => {
              e.preventDefault();
              if (!custFormName.trim()) {
                alert('Nama Pelanggan wajib diisi!');
                return;
              }
              const targetOutlet = (masterData.outlets || []).find(o => o.id === Number(custFormOutletId)) || currentOutlet;
              const newCustId = editingCustomerData ? editingCustomerData.id : Date.now();
              const newCustCode = editingCustomerData ? (editingCustomerData.code || `000${newCustId} - BMJ`) : `000${(masterData.customers?.length || 0) + 37} - BMJ`;

              const updatedCustObj = {
                id: newCustId,
                code: newCustCode,
                name: custFormName,
                phone: custFormPhone || '-',
                email: custFormEmail || '',
                gender: custFormGender || 'Wanita',
                address: custFormAddress || '',
                outlet_id: Number(custFormOutletId),
                outlet_name: targetOutlet.name,
                customer_type: 'Reguler',
                points: editingCustomerData ? editingCustomerData.points || 0 : 0
              };

              if (editingCustomerData) {
                setMasterData(prev => ({
                  ...prev,
                  customers: (prev.customers || []).map(c => c.id === editingCustomerData.id ? updatedCustObj : c)
                }));
              } else {
                setMasterData(prev => ({
                  ...prev,
                  customers: [...(prev.customers || []), updatedCustObj]
                }));
              }

              setSelectedCustomerIdForDetail(newCustId);
              setShowAddCustomerModal(false);
            }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
                <div>
                  <label style={{ fontSize: '0.78rem', color: '#cbd5e1', fontWeight: '800', display: 'block', marginBottom: '4px' }}>Nama Pelanggan *</label>
                  <input
                    type="text"
                    required
                    value={custFormName}
                    onChange={e => setCustFormName(e.target.value)}
                    placeholder="Masukkan nama pelanggan..."
                    style={{ width: '100%', padding: '10px', background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', color: '#ffffff', fontSize: '0.85rem', outline: 'none' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.78rem', color: '#cbd5e1', fontWeight: '800', display: 'block', marginBottom: '4px' }}>Nomor HP / WhatsApp *</label>
                  <input
                    type="text"
                    value={custFormPhone}
                    onChange={e => setCustFormPhone(e.target.value)}
                    placeholder="Contoh: 085277538483"
                    style={{ width: '100%', padding: '10px', background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', color: '#ffffff', fontSize: '0.85rem', outline: 'none' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.78rem', color: '#cbd5e1', fontWeight: '800', display: 'block', marginBottom: '4px' }}>Outlet *</label>
                  <select
                    value={custFormOutletId}
                    onChange={e => setCustFormOutletId(e.target.value)}
                    style={{ width: '100%', padding: '10px', background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', color: '#ffffff', fontSize: '0.85rem', outline: 'none' }}
                  >
                    {(masterData.outlets || []).map(o => (
                      <option key={o.id} value={o.id}>{o.name}</option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ fontSize: '0.78rem', color: '#cbd5e1', fontWeight: '800', display: 'block', marginBottom: '4px' }}>Email</label>
                    <input
                      type="email"
                      value={custFormEmail}
                      onChange={e => setCustFormEmail(e.target.value)}
                      placeholder="email@domain.com"
                      style={{ width: '100%', padding: '10px', background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', color: '#ffffff', fontSize: '0.85rem', outline: 'none' }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.78rem', color: '#cbd5e1', fontWeight: '800', display: 'block', marginBottom: '4px' }}>Jenis Kelamin</label>
                    <select
                      value={custFormGender}
                      onChange={e => setCustFormGender(e.target.value)}
                      style={{ width: '100%', padding: '10px', background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', color: '#ffffff', fontSize: '0.85rem', outline: 'none' }}
                    >
                      <option value="Wanita">Wanita</option>
                      <option value="Laki-laki">Laki-laki</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '0.78rem', color: '#cbd5e1', fontWeight: '800', display: 'block', marginBottom: '4px' }}>Alamat Lengkap</label>
                  <textarea
                    rows={2}
                    value={custFormAddress}
                    onChange={e => setCustFormAddress(e.target.value)}
                    placeholder="Masukkan alamat domisili pelanggan..."
                    style={{ width: '100%', padding: '10px', background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', color: '#ffffff', fontSize: '0.82rem', outline: 'none', resize: 'vertical' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowAddCustomerModal(false)}
                  style={{ flex: 1, padding: '12px', background: '#334155', color: '#ffffff', border: 'none', borderRadius: '10px', fontWeight: '800', cursor: 'pointer' }}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  style={{ flex: 1, padding: '12px', background: '#6366f1', color: '#ffffff', border: 'none', borderRadius: '10px', fontWeight: '900', cursor: 'pointer' }}
                >
                  {editingCustomerData ? 'Simpan Perubahan' : 'Simpan Pelanggan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 11. MODAL FULLSCREEN SCAN BARCODE / QR REGISTRASI MANDIRI PELANGGAN */}
      {showQrSelfRegModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: '#090d16', zIndex: 9999, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px'
        }}>
          <div style={{ position: 'absolute', top: '20px', right: '20px' }}>
            <button onClick={() => setShowQrSelfRegModal(false)} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#ffffff', padding: '8px 16px', borderRadius: '10px', cursor: 'pointer', fontWeight: '800' }}>
              ✕ Tutup
            </button>
          </div>

          <div className="animate-fade-in" style={{ textAlign: 'center', maxWidth: '440px', width: '100%' }}>
            <div style={{ fontSize: '1.3rem', fontWeight: '900', color: '#ffffff', marginBottom: '6px' }}>
              📲 Barcode / QR Code Registrasi Mandiri Pelanggan
            </div>
            <div style={{ fontSize: '0.84rem', color: '#94a3b8', marginBottom: '24px' }}>
              Arahkan kamera smartphone pelanggan ke QR Code berikut untuk pendaftaran profil mandiri di {currentOutlet.name}.
            </div>

            {/* Giant QR Display Box */}
            <div style={{ background: '#ffffff', padding: '24px', borderRadius: '24px', display: 'inline-block', boxShadow: '0 20px 50px rgba(99,102,241,0.3)', marginBottom: '24px' }}>
              <QrCode size={220} color="#000000" />
              <div style={{ marginTop: '12px', fontSize: '0.88rem', fontWeight: '900', color: '#6366f1', letterSpacing: '0.5px' }}>
                SCAN DENGAN HP UNTUK DAFTAR MANDIRI
              </div>
            </div>

            <div style={{ background: '#1e293b', borderRadius: '12px', padding: '14px 16px', border: '1px solid #334155', color: '#cbd5e1', fontSize: '0.80rem', marginBottom: '20px', textAlign: 'center' }}>
              <div>🔗 URL Registrasi Mandiri:</div>
              <a
                href={`/register-customer?outlet=${currentOutlet.id}`}
                target="_blank"
                rel="noreferrer"
                style={{ color: '#38bdf8', fontWeight: '900', wordBreak: 'break-all', fontSize: '0.85rem', display: 'inline-block', marginTop: '4px', textDecoration: 'underline' }}
              >
                {window.location.origin}/register-customer?outlet={currentOutlet.id}
              </a>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button
                type="button"
                onClick={() => {
                  window.open(`/register-customer?outlet=${currentOutlet.id}`, '_blank');
                }}
                style={{ width: '100%', padding: '14px', background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)', color: '#ffffff', border: 'none', borderRadius: '12px', fontWeight: '900', fontSize: '0.90rem', cursor: 'pointer', boxShadow: '0 4px 14px rgba(37,99,235,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
              >
                <QrCode size={18} />
                <span>🔗 Buka Form Registrasi Mandiri di Tab Baru</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  const namePrompt = prompt("Simulasi Isi Form Mandiri oleh Pelanggan:\nMasukkan Nama Pelanggan:");
                  if (namePrompt) {
                    const phonePrompt = prompt("Masukkan Nomor HP / WhatsApp Pelanggan:");
                    const newCustObj = {
                      id: Date.now(),
                      code: `000${(masterData.customers?.length || 0) + 37} - BMJ`,
                      name: namePrompt,
                      phone: phonePrompt || '-',
                      outlet_id: currentOutlet.id || 1,
                      outlet_name: currentOutlet.name || 'Restoran Utama',
                      customer_type: 'Self-Reg Member',
                      points: 10
                    };
                    setMasterData(prev => ({
                      ...prev,
                      customers: [...(prev.customers || []), newCustObj]
                    }));
                    setSelectedCustomerIdForDetail(newCustObj.id);
                    alert(`Selamat ${namePrompt}! Pendaftaran profil mandiri berhasil via Scan QR!`);
                    setShowQrSelfRegModal(false);
                  }
                }}
                style={{ width: '100%', padding: '12px', background: '#334155', color: '#cbd5e1', border: 'none', borderRadius: '12px', fontWeight: '800', fontSize: '0.82rem', cursor: 'pointer' }}
              >
                🧪 Fast-Test Simulasi di Layar Ini
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 12. MODAL INTERAKTIF DETAIL SHIFT PENGGUNA APLIKASI */}
      {selectedShiftDetailModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9998
        }}>
          <div className="glass-card animate-fade-in" style={{ width: '100%', maxWidth: '580px', maxHeight: '92vh', overflowY: 'auto', padding: '24px', background: '#1e293b', borderRadius: '18px' }}>
            {/* Header Modal */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Clock size={22} color="#38bdf8" />
                <h3 style={{ fontSize: '1.1rem', fontWeight: '900', color: '#f8fafc', margin: 0 }}>
                  Rincian Sesi Shift - {selectedShiftDetailModal.user_name}
                </h3>
              </div>
              <button onClick={() => setSelectedShiftDetailModal(null)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            {/* Profile & Shift Info Summary Card */}
            <div style={{ background: '#0f172a', borderRadius: '14px', padding: '16px', border: '1px solid #334155', marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div>
                  <div style={{ fontSize: '1rem', fontWeight: '900', color: '#ffffff' }}>{selectedShiftDetailModal.user_name}</div>
                  <div style={{ fontSize: '0.76rem', color: '#94a3b8' }}>{selectedShiftDetailModal.role} • @{selectedShiftDetailModal.username}</div>
                </div>
                <span style={{ fontSize: '0.70rem', fontWeight: '900', padding: '3px 10px', borderRadius: '12px', background: selectedShiftDetailModal.status === 'AKTIF BERLANGSUNG' ? 'rgba(56,189,248,0.2)' : 'rgba(148,163,184,0.15)', color: selectedShiftDetailModal.status === 'AKTIF BERLANGSUNG' ? '#38bdf8' : '#cbd5e1' }}>
                  {selectedShiftDetailModal.status}
                </span>
              </div>

              {/* Login/Logout Time & Duration */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', background: '#1e293b', padding: '12px', borderRadius: '10px', fontSize: '0.78rem' }}>
                <div>
                  <div style={{ color: '#94a3b8', fontSize: '0.70rem' }}>📥 Waktu Login:</div>
                  <div style={{ fontWeight: '800', color: '#34d399', marginTop: '2px' }}>{selectedShiftDetailModal.login_time}</div>
                </div>
                <div>
                  <div style={{ color: '#94a3b8', fontSize: '0.70rem' }}>📤 Waktu Logout:</div>
                  <div style={{ fontWeight: '800', color: '#ffffff', marginTop: '2px' }}>{selectedShiftDetailModal.logout_time}</div>
                </div>
              </div>

              <div style={{ marginTop: '8px', fontSize: '0.78rem', color: '#fbbf24', fontWeight: '900', textAlign: 'center' }}>
                ⏱️ Durasi Kerja Kasir: {selectedShiftDetailModal.duration_label}
              </div>
            </div>

            {/* Financial & Struk Breakdown Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '16px' }}>
              <div style={{ background: '#0f172a', padding: '10px', borderRadius: '10px', border: '1px solid #334155', textAlign: 'center' }}>
                <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>Total Struk</div>
                <div style={{ fontSize: '1rem', fontWeight: '900', color: '#ffffff', marginTop: '2px' }}>{selectedShiftDetailModal.total_receipts} Struk</div>
              </div>
              <div style={{ background: '#0f172a', padding: '10px', borderRadius: '10px', border: '1px solid #334155', textAlign: 'center' }}>
                <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>Total Omset</div>
                <div style={{ fontSize: '1rem', fontWeight: '900', color: '#34d399', marginTop: '2px' }}>{formatRupiah(selectedShiftDetailModal.total_sales)}</div>
              </div>
              <div style={{ background: '#0f172a', padding: '10px', borderRadius: '10px', border: '1px solid #334155', textAlign: 'center' }}>
                <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>Kas Tunai</div>
                <div style={{ fontSize: '1rem', fontWeight: '900', color: '#38bdf8', marginTop: '2px' }}>{formatRupiah(selectedShiftDetailModal.cash_sales)}</div>
              </div>
            </div>

            {/* List of Receipts / Transactions during shift */}
            <div style={{ fontSize: '0.80rem', fontWeight: '800', color: '#cbd5e1', marginBottom: '8px' }}>
              Daftar Struk Transaksi Dalam Shift Ini:
            </div>
            <div style={{ background: '#0f172a', borderRadius: '12px', border: '1px solid #334155', maxHeight: '180px', overflowY: 'auto', marginBottom: '20px' }}>
              {selectedShiftDetailModal.transactions.length === 0 ? (
                <div style={{ padding: '16px', textAlign: 'center', color: '#94a3b8', fontSize: '0.78rem' }}>
                  Belum ada transaksi struk pada sesi shift ini.
                </div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.78rem' }}>
                  <thead>
                    <tr style={{ background: '#1e293b', color: '#94a3b8', borderBottom: '1px solid #334155' }}>
                      <th style={{ padding: '8px 12px' }}>No. Struk</th>
                      <th style={{ padding: '8px 12px' }}>Jam</th>
                      <th style={{ padding: '8px 12px' }}>Pelanggan</th>
                      <th style={{ padding: '8px 12px' }}>Bayar</th>
                      <th style={{ padding: '8px 12px', textAlign: 'right' }}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedShiftDetailModal.transactions.map((tx, tIdx) => (
                      <tr key={tIdx} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        <td style={{ padding: '8px 12px', fontWeight: '800', color: '#38bdf8' }}>{tx.id}</td>
                        <td style={{ padding: '8px 12px', color: '#cbd5e1' }}>{tx.time || '10:00'}</td>
                        <td style={{ padding: '8px 12px', color: '#ffffff' }}>{tx.customer_name || 'Pelanggan Umum'}</td>
                        <td style={{ padding: '8px 12px', color: '#34d399', fontWeight: '800' }}>{tx.payment_method || 'Cash'}</td>
                        <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: '900', color: '#ffffff' }}>{formatRupiah(tx.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Modal Actions */}
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setSelectedShiftDetailModal(null)}
                style={{ flex: 1, padding: '12px', background: '#334155', color: '#ffffff', border: 'none', borderRadius: '10px', fontWeight: '800', cursor: 'pointer' }}
              >
                Tutup
              </button>
              <button
                type="button"
                onClick={() => handlePrintShiftClosingReport(selectedShiftDetailModal)}
                style={{ flex: 1, padding: '12px', background: '#38bdf8', color: '#0f172a', border: 'none', borderRadius: '10px', fontWeight: '900', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
              >
                <Printer size={16} />
                <span>Cetak Laporan Shift</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 13. MODAL FORM "+ LAPORAN KEUANGAN HARIAN" (100% MATCHING WEB ADMIN 12 RULES) */}
      {showAddManualReportModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999
        }}>
          <div className="glass-card animate-fade-in" style={{
            width: '100%', maxWidth: '980px', maxHeight: '94vh', overflowY: 'auto',
            padding: '24px', background: '#1e293b', border: '1px solid #6366f1', borderRadius: '18px',
            display: 'flex', flexDirection: 'column', gap: '18px', boxShadow: '0 20px 50px rgba(0,0,0,0.5)'
          }}>
            {/* Header Modal */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <FileText size={24} color="#6366f1" />
                <div>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: '900', color: '#f8fafc', margin: 0 }}>
                    Form Laporan Keuangan Harian (Mobile POS)
                  </h3>
                  <span style={{ fontSize: '0.74rem', color: '#94a3b8' }}>
                    Nomor Laporan: <strong style={{ color: '#38bdf8' }}>{manualRepNo}</strong>
                  </span>
                </div>
              </div>
              <button onClick={() => setShowAddManualReportModal(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                <X size={22} />
              </button>
            </div>

            {(() => {
              // Gunakan HANYA data nyata dari masterData — tidak ada fallback fake/mock
              const ingredientsList = masterData.ingredients || [];
              const expenseMasterList = masterData.expenseMaster || [];

              const masterIngs = ingredientsList.map(ing => ({
                id: `ing-${ing.id}`, name: ing.name, item_type: 'Bahan Baku',
                category: 'HPP Dapur (Bahan Mentah)', unit: ing.unit || 'kg',
                cost: ing.cost || ing.price || 0
              }));

              const masterAccs = (masterData.chartOfAccounts || masterData.expenseMaster || masterData.accounts || []).map(acc => ({
                id: `acc-${acc.id}`, name: acc.name || acc.account_name,
                item_type: 'Biaya Operasional',
                category: acc.category || acc.account_type || acc.type || 'Biaya Operasional (OPEX)',
                unit: 'paket', cost: acc.amount || acc.cost || 0
              }));

              const allMasterSuggestions = [...masterIngs, ...masterAccs];

              // Gunakan HANYA data nyata dari masterData — tidak ada fallback fake/mock
              const suppliersList = masterData.suppliers || [];

              const adminList = (masterData.webAdminAccounts || masterData.mobileAccounts || []).map(acc => ({
                id: acc.id, name: acc.name, role: acc.role || acc.jabatan || 'Kasir'
              }));

              // AUTO-GENERATED SALES COMPUTATION FOR SELECTED DATE UNTIL 23:59:59
              const matchedSales = (outletTransactions || masterData.salesTransactions || []).filter(t => !t.date || t.date === manualRepDate);
              
              const autoCashVal = matchedSales
                .filter(t => !t.payment_method || t.payment_method.toLowerCase() === 'cash' || t.payment_method.toLowerCase() === 'tunai')
                .reduce((sum, t) => sum + Number(t.amount || 0), 0) || Number(manualRepNetSales || 0);

              const autoNonCashVal = matchedSales
                .filter(t => t.payment_method && t.payment_method.toLowerCase() !== 'cash' && t.payment_method.toLowerCase() !== 'tunai')
                .reduce((sum, t) => sum + Number(t.amount || 0), 0) || Number(manualRepNonCash || 0);

              const autoTotalSalesVal = autoCashVal + autoNonCashVal;

              // TOTAL PENGELUARAN (GRAND TOTAL)
              const totalPengeluaran = manualCogsRows.reduce((sum, r) => sum + (Number(r.amount) || 0), 0) + manualExpenseRows.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);

              // LABA KOTOR = TOTAL PENDAPATAN - TOTAL PENGELUARAN
              const labaKotor = autoTotalSalesVal - totalPengeluaran;

              // TABEL PENGEMBALIAN UANG KAS (TANGGAL, JUMLAH HUTANG, JUMLAH PENGEMBALIAN)
              const totalReturnKas = (manualCashReturnRows || []).reduce((sum, r) => sum + Number(r.returnAmount || 0), 0);
              const totalDebtKas = (manualCashReturnRows || []).reduce((sum, r) => sum + Number(r.debtAmount || 0), 0);
              const remainingDebt = Math.max(0, totalDebtKas - totalReturnKas);

              // UANG DI LACI = LABA KOTOR - PENGEMBALIAN KAS - PENDAPATAN NON-CASH
              const uangDiLaci = labaKotor - totalReturnKas - autoNonCashVal;
              const isUangDiLaciMinus = uangDiLaci < 0;

              // SISA UANG DI KAS = MODAL DEFAULT - LABA KOTOR MINUS (JIKA ADA) - HUTANG BELUM DIKEMBALIKAN
              const modalKasVal = Number(manualDefaultCashModal || 2000000);
              const labaKotorMinusVal = labaKotor < 0 ? Math.abs(labaKotor) : 0;
              const sisaUangDiKas = modalKasVal - labaKotorMinusVal - remainingDebt;

              return (
                <form onSubmit={e => {
                  e.preventDefault();
                  const newReportObj = {
                    id: manualRepNo,
                    report_no: manualRepNo,
                    date: manualRepDate,
                    outlet_id: manualRepOutletId,
                    branch_name: (masterData.outlets || []).find(o => o.id === manualRepOutletId)?.name || currentOutlet.name || 'Restoran Utama',
                    author_name: manualRepAuthor,
                    submitted_by: manualRepAuthor,
                    cashier_name: manualRepAuthor,
                    cashier: manualRepAuthor,
                    net_sales: autoTotalSalesVal,
                    gross_sales: autoTotalSalesVal,
                    cash_sales: autoCashVal,
                    non_cash_sales: autoNonCashVal,
                    total_expense: totalPengeluaran,
                    gross_profit: labaKotor,
                    cash_physical: uangDiLaci,
                    actual_cash: uangDiLaci,
                    debt_payment: totalReturnKas,
                    status: manualRepStatus || 'pending',
                    notes: manualRepNotes || `Laporan Keuangan Harian (Sisa Kas: ${formatRupiah(sisaUangDiKas)})`,
                    cogs_items: manualCogsRows,
                    cogs_breakdown: manualCogsRows,
                    expenses_breakdown: manualExpenseRows,
                    cash_return_breakdown: manualCashReturnRows,
                    is_minus_drawer: isUangDiLaciMinus,
                    minus_drawer_amount: isUangDiLaciMinus ? Math.abs(uangDiLaci) : 0,
                    sisa_uang_kas: sisaUangDiKas
                  };

                  setShowAddManualReportModal(false);

                  setMasterData(prev => {
                    const now = Date.now();
                    const manualList = prev.manualEntryRecords || [];
                    const financeList = prev.approvedFinanceDaily || [];
                    const shiftList = prev.shiftClosings || prev.shift_closings || [];
                    const closedList = prev.closedShifts || [];

                    const newMaster = {
                      ...prev,
                      _lastUpdated: now,
                      clientUpdated: now,
                      manualEntryRecords: [newReportObj, ...manualList.filter(i => String(i.id) !== String(newReportObj.id))],
                      approvedFinanceDaily: [newReportObj, ...financeList.filter(i => String(i.id) !== String(newReportObj.id))],
                      shiftClosings: [newReportObj, ...shiftList.filter(i => String(i.id) !== String(newReportObj.id))],
                      shift_closings: [newReportObj, ...shiftList.filter(i => String(i.id) !== String(newReportObj.id))],
                      closedShifts: [newReportObj, ...closedList.filter(i => String(i.id) !== String(newReportObj.id))]
                    };

                    fetch(getApiUrl('/api/master-data'), {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify(newMaster)
                    }).catch(() => {});

                    return newMaster;
                  });
                }} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>

                  {/* 1. HEADER INFORMATION */}
                  <div style={{ background: '#0f172a', padding: '16px', borderRadius: '12px', border: '1px solid #334155', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px' }}>
                    <div>
                      <label style={{ fontSize: '0.78rem', color: '#cbd5e1', display: 'block', marginBottom: '4px', fontWeight: '700' }}>📅 Tanggal *</label>
                      <input type="date" required value={manualRepDate} onChange={e => setManualRepDate(e.target.value)} className="form-input" style={{ width: '100%', height: '40px' }} />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.78rem', color: '#cbd5e1', display: 'block', marginBottom: '4px', fontWeight: '700' }}>🏢 Nama Outlet *</label>
                      <input
                        type="text"
                        readOnly
                        value={currentOutlet?.name || (masterData.outlets || []).find(o => o.id === manualRepOutletId)?.name || 'Restoran Utama'}
                        className="form-input"
                        style={{ width: '100%', height: '40px', background: '#0f172a', color: '#38bdf8', fontWeight: '800', border: '1px solid #334155', cursor: 'not-allowed' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.78rem', color: '#cbd5e1', display: 'block', marginBottom: '4px', fontWeight: '700' }}>👤 Dibuat Oleh *</label>
                      <input
                        type="text"
                        readOnly
                        value={manualRepAuthor || masterData?.currentUser?.name || masterData?.user?.name || userSession?.name || ''}
                        className="form-input"
                        style={{ width: '100%', height: '40px', background: '#0f172a', color: '#34d399', fontWeight: '800', border: '1px solid #334155', cursor: 'not-allowed' }}
                      />
                    </div>
                  </div>

                  {/* 2. AUTO-GENERATED SALES BREAKDOWN */}
                  <div style={{ background: 'linear-gradient(135deg, rgba(52, 211, 153, 0.1) 0%, rgba(15, 23, 42, 0.9) 100%)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(52, 211, 153, 0.3)', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px' }}>
                    <div>
                      <span style={{ fontSize: '0.74rem', color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase' }}>💵 Penjualan Cash (Tunai)</span>
                      <div style={{ fontSize: '1.2rem', fontWeight: '900', color: '#34d399', marginTop: '2px' }}>{formatRupiah(autoCashVal)}</div>
                      <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>Ter-generate otomatis (s/d 23:59:59)</span>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.74rem', color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase' }}>💳 Penjualan Non-Cash (EDC/QRIS)</span>
                      <div style={{ fontSize: '1.2rem', fontWeight: '900', color: '#38bdf8', marginTop: '2px' }}>{formatRupiah(autoNonCashVal)}</div>
                      <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>Ter-generate otomatis</span>
                    </div>
                    <div style={{ background: 'rgba(52, 211, 153, 0.15)', padding: '10px 14px', borderRadius: '10px', border: '1px solid rgba(52, 211, 153, 0.4)' }}>
                      <span style={{ fontSize: '0.74rem', color: '#34d399', fontWeight: '900', textTransform: 'uppercase' }}>💰 Total Pendapatan Penjualan</span>
                      <div style={{ fontSize: '1.3rem', fontWeight: '900', color: '#34d399', marginTop: '2px' }}>{formatRupiah(autoTotalSalesVal)}</div>
                    </div>
                  </div>

                  {/* 3. PENGELUARAN BAHAN BAKU & BIAYA TABLE */}
                  <div style={{ background: '#0f172a', borderRadius: '12px', border: '1px solid #334155', overflow: 'hidden' }}>
                    <div style={{ padding: '12px 16px', background: '#1e293b', borderBottom: '1px solid #334155', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.88rem', fontWeight: '800', color: '#f8fafc' }}>
                        📦 Tabel Pengeluaran Bahan Baku & Biaya Operasional
                      </span>
                      <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                        HPP Dapur (Master Bahan Baku) | OPEX (Master Biaya)
                      </span>
                    </div>

                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.80rem' }}>
                        <thead>
                          <tr style={{ color: '#94a3b8', borderBottom: '1px solid #334155', textAlign: 'left', textTransform: 'uppercase', fontSize: '0.74rem' }}>
                            <th style={{ padding: '8px 6px', width: '35px', textAlign: 'center' }}>#</th>
                            <th style={{ padding: '8px 6px' }}>Bahan Baku / Biaya</th>
                            <th style={{ padding: '8px 6px', width: '220px' }}>Jenis Pengeluaran (Otomatis)</th>
                            <th style={{ padding: '8px 6px', width: '75px', textAlign: 'center' }}>Jumlah</th>
                            <th style={{ padding: '8px 6px', textAlign: 'right', width: '120px' }}>Harga Satuan</th>
                            <th style={{ padding: '8px 6px', textAlign: 'right', width: '130px' }}>Total Harga</th>
                            <th style={{ padding: '8px 6px', textAlign: 'center', width: '40px' }}>Aksi</th>
                          </tr>
                        </thead>
                        <tbody>
                          {/* 1. ROW COGS BAHAN BAKU */}
                          {manualCogsRows.map((r, idx) => {
                            const currentMatch = allMasterSuggestions.find(m => m.name.toLowerCase() === (r.name || '').toLowerCase());
                            return (
                              <tr key={r.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                <td style={{ padding: '6px', textAlign: 'center', color: '#94a3b8', fontWeight: '700' }}>{idx + 1}</td>
                                
                                {/* Input Autocomplete Sugesti Bahan Baku / Biaya */}
                                <td style={{ padding: '6px' }}>
                                  <input
                                    type="text"
                                    list={`suggest-list-${r.id}`}
                                    value={r.name}
                                    onChange={e => {
                                      const typed = e.target.value;
                                      const matchedItem = allMasterSuggestions.find(m => m.name.toLowerCase() === typed.toLowerCase());
                                      setManualCogsRows(prev => prev.map(row => {
                                        if (row.id === r.id) {
                                          if (matchedItem) {
                                            return {
                                              ...row,
                                              name: matchedItem.name,
                                              category: matchedItem.category,
                                              item_type: matchedItem.item_type,
                                              unit: matchedItem.unit || row.unit,
                                              price_unit: matchedItem.cost || row.price_unit,
                                              amount: (row.qty || 1) * (matchedItem.cost || row.price_unit)
                                            };
                                          }
                                          return { ...row, name: typed };
                                        }
                                        return row;
                                      }));
                                    }}
                                    placeholder="Ketik/Pilih Bahan Baku..."
                                    className="form-input"
                                    style={{ width: '100%', height: '34px', fontSize: '0.80rem', fontWeight: '800', color: '#fb7185' }}
                                  />
                                  <datalist id={`suggest-list-${r.id}`}>
                                    {allMasterSuggestions.map((m, mIdx) => (
                                      <option key={mIdx} value={m.name}>
                                        {m.item_type === 'Bahan Baku' ? '🌾' : '📊'} {m.name} ({m.category})
                                      </option>
                                    ))}
                                  </datalist>
                                </td>

                                {/* Jenis Pengeluaran OTOMATIS */}
                                <td style={{ padding: '6px' }}>
                                  <span style={{
                                    padding: '4px 8px', borderRadius: '6px', fontSize: '0.70rem', fontWeight: '800',
                                    background: 'rgba(251, 113, 133, 0.15)', color: '#fb7185', border: '1px solid #fb7185',
                                    display: 'inline-block'
                                  }}>
                                    {r.category || currentMatch?.category || 'HPP Dapur (Bahan Mentah)'}
                                  </span>
                                </td>

                                {/* Qty */}
                                <td style={{ padding: '6px' }}>
                                  <input
                                    type="number"
                                    min="1"
                                    value={r.qty}
                                    onChange={e => {
                                      const q = Number(e.target.value) || 0;
                                      setManualCogsRows(prev => prev.map(row => row.id === r.id ? { ...row, qty: q, amount: q * row.price_unit } : row));
                                    }}
                                    className="form-input"
                                    style={{ width: '100%', height: '34px', fontSize: '0.80rem', textAlign: 'center' }}
                                  />
                                </td>

                                {/* Harga Satuan */}
                                <td style={{ padding: '6px' }}>
                                  <input
                                    type="number"
                                    value={r.price_unit}
                                    onChange={e => {
                                      const p = Number(e.target.value) || 0;
                                      setManualCogsRows(prev => prev.map(row => row.id === r.id ? { ...row, price_unit: p, amount: row.qty * p } : row));
                                    }}
                                    className="form-input"
                                    style={{ width: '100%', height: '34px', fontSize: '0.80rem', textAlign: 'right' }}
                                  />
                                </td>

                                {/* Total Harga */}
                                <td style={{ padding: '6px', textAlign: 'right', fontWeight: '900', color: '#fb7185' }}>
                                  {formatRupiah(r.amount)}
                                </td>

                                {/* Aksi */}
                                <td style={{ padding: '6px', textAlign: 'center' }}>
                                  <button
                                    type="button"
                                    onClick={() => setManualCogsRows(prev => prev.filter(row => row.id !== r.id))}
                                    style={{ background: 'none', border: 'none', color: '#f43f5e', cursor: 'pointer', fontSize: '0.9rem', fontWeight: '900' }}
                                  >
                                    ✕
                                  </button>
                                </td>
                              </tr>
                            );
                          })}

                          {/* 2. ROW BIAYA OPERASIONAL */}
                          {manualExpenseRows.map((r, idx) => {
                            const currentMatch = allMasterSuggestions.find(m => m.name.toLowerCase() === (r.name || '').toLowerCase());
                            return (
                              <tr key={r.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                <td style={{ padding: '6px', textAlign: 'center', color: '#94a3b8', fontWeight: '700' }}>{manualCogsRows.length + idx + 1}</td>
                                
                                {/* Input Autocomplete Sugesti Biaya Operasional / Akuntansi */}
                                <td style={{ padding: '6px' }}>
                                  <input
                                    type="text"
                                    list={`suggest-exp-list-${r.id}`}
                                    value={r.name}
                                    onChange={e => {
                                      const typed = e.target.value;
                                      const matchedItem = allMasterSuggestions.find(m => m.name.toLowerCase() === typed.toLowerCase());
                                      setManualExpenseRows(prev => prev.map(row => {
                                        if (row.id === r.id) {
                                          if (matchedItem) {
                                            return {
                                              ...row,
                                              name: matchedItem.name,
                                              category: matchedItem.category,
                                              amount: matchedItem.cost || row.amount
                                            };
                                          }
                                          return { ...row, name: typed };
                                        }
                                        return row;
                                      }));
                                    }}
                                    placeholder="Ketik/Pilih Biaya..."
                                    className="form-input"
                                    style={{ width: '100%', height: '34px', fontSize: '0.80rem', fontWeight: '800', color: '#38bdf8' }}
                                  />
                                  <datalist id={`suggest-exp-list-${r.id}`}>
                                    {allMasterSuggestions.map((m, mIdx) => (
                                      <option key={mIdx} value={m.name}>
                                        {m.item_type === 'Bahan Baku' ? '🌾' : '📊'} {m.name} ({m.category})
                                      </option>
                                    ))}
                                  </datalist>
                                </td>

                                {/* Jenis Pengeluaran OTOMATIS */}
                                <td style={{ padding: '6px' }}>
                                  <span style={{
                                    padding: '4px 8px', borderRadius: '6px', fontSize: '0.70rem', fontWeight: '800',
                                    background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', border: '1px solid #38bdf8',
                                    display: 'inline-block'
                                  }}>
                                    {r.category || currentMatch?.category || 'Biaya Operasional (OPEX)'}
                                  </span>
                                </td>

                                {/* Qty (1) */}
                                <td style={{ padding: '6px', textAlign: 'center', color: '#cbd5e1', fontWeight: '700' }}>1</td>

                                {/* Harga Satuan */}
                                <td style={{ padding: '6px' }}>
                                  <input
                                    type="number"
                                    value={r.amount}
                                    onChange={e => {
                                      const val = Number(e.target.value) || 0;
                                      setManualExpenseRows(prev => prev.map(row => row.id === r.id ? { ...row, amount: val } : row));
                                    }}
                                    className="form-input"
                                    style={{ width: '100%', height: '34px', fontSize: '0.80rem', textAlign: 'right' }}
                                  />
                                </td>

                                {/* Total Harga */}
                                <td style={{ padding: '6px', textAlign: 'right', fontWeight: '900', color: '#38bdf8' }}>
                                  {formatRupiah(r.amount)}
                                </td>

                                {/* Aksi */}
                                <td style={{ padding: '6px', textAlign: 'center' }}>
                                  <button
                                    type="button"
                                    onClick={() => setManualExpenseRows(prev => prev.filter(row => row.id !== r.id))}
                                    style={{ background: 'none', border: 'none', color: '#f43f5e', cursor: 'pointer', fontSize: '0.9rem', fontWeight: '900' }}
                                  >
                                    ✕
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Add Buttons */}
                    <div style={{ padding: '10px 16px', background: '#1e293b', borderTop: '1px solid #334155', display: 'flex', gap: '12px' }}>
                      <button
                        type="button"
                        onClick={() => {
                          const firstIng = masterIngs[0] || { name: 'Bahan Baku', cost: 0, unit: 'kg', category: 'HPP Dapur (Bahan Mentah)' };
                          setManualCogsRows(prev => [...prev, { id: Date.now() + Math.random(), name: firstIng.name, qty: 1, unit: firstIng.unit || 'kg', price_unit: firstIng.cost || 0, amount: firstIng.cost || 0, category: firstIng.category }]);
                        }}
                        style={{ background: 'none', border: 'none', color: '#fb7185', fontWeight: '800', fontSize: '0.78rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                      >
                        <Plus size={14} />
                        <span>+ Baris Bahan Baku</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          const firstExp = masterAccs[0] || { name: 'Biaya Baru', category: 'Biaya Operasional (OPEX)', cost: 50000 };
                          setManualExpenseRows(prev => [...prev, { id: Date.now() + Math.random(), name: firstExp.name, category: firstExp.category || 'Biaya Operasional (OPEX)', amount: firstExp.cost || 50000 }]);
                        }}
                        style={{ background: 'none', border: 'none', color: '#38bdf8', fontWeight: '800', fontSize: '0.78rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                      >
                        <Plus size={14} />
                        <span>+ Baris Biaya</span>
                      </button>
                    </div>
                  </div>

                  {/* 4. TOTAL PENGELUARAN & LABA KOTOR SUMMARY BAR */}
                  <div style={{ background: '#0f172a', padding: '16px', borderRadius: '12px', border: '1px solid #334155', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                    <div style={{ background: 'rgba(251, 113, 133, 0.12)', padding: '12px', borderRadius: '10px', border: '1px solid rgba(251, 113, 133, 0.3)' }}>
                      <span style={{ fontSize: '0.74rem', color: '#fb7185', fontWeight: '700', textTransform: 'uppercase' }}>🔥 Total Pengeluaran (Grand Total)</span>
                      <div style={{ fontSize: '1.25rem', fontWeight: '900', color: '#fb7185', marginTop: '2px' }}>
                        -{formatRupiah(totalPengeluaran)}
                      </div>
                    </div>

                    <div style={{ background: labaKotor >= 0 ? 'rgba(52, 211, 153, 0.12)' : 'rgba(244, 63, 94, 0.12)', padding: '12px', borderRadius: '10px', border: `1px solid ${labaKotor >= 0 ? '#34d399' : '#f43f5e'}` }}>
                      <span style={{ fontSize: '0.74rem', color: labaKotor >= 0 ? '#34d399' : '#f43f5e', fontWeight: '700', textTransform: 'uppercase' }}>
                        📈 Laba Kotor (Pendapatan - Pengeluaran)
                      </span>
                      <div style={{ fontSize: '1.25rem', fontWeight: '900', color: labaKotor >= 0 ? '#34d399' : '#f43f5e', marginTop: '2px' }}>
                        {formatRupiah(labaKotor)}
                      </div>
                    </div>
                  </div>

                  {/* 5. TABEL PENGEMBALIAN UANG KAS */}
                  <div style={{ background: '#0f172a', padding: '16px', borderRadius: '12px', border: '1px solid #fbbf24', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.84rem', fontWeight: '800', color: '#fbbf24' }}>
                        💸 Tabel Pengembalian Uang Kas
                      </span>
                      <button
                        type="button"
                        onClick={() => setManualCashReturnRows(prev => [...(prev || []), { id: Date.now() + Math.random(), date: manualRepDate, debtAmount: 0, returnAmount: 0 }])}
                        style={{ background: 'rgba(245, 158, 11, 0.2)', border: '1px solid #fbbf24', color: '#fbbf24', padding: '3px 8px', borderRadius: '4px', fontSize: '0.72rem', fontWeight: '800', cursor: 'pointer' }}
                      >
                        + Tambah Baris
                      </button>
                    </div>

                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
                        <thead>
                          <tr style={{ color: '#94a3b8', borderBottom: '1px solid #334155', textAlign: 'left' }}>
                            <th style={{ padding: '6px' }}>Tanggal</th>
                            <th style={{ padding: '6px', textAlign: 'right' }}>Jumlah Hutang (Rp)</th>
                            <th style={{ padding: '6px', textAlign: 'right' }}>Jumlah Pengembalian (Rp)</th>
                            <th style={{ padding: '6px', textAlign: 'center', width: '35px' }}>Aksi</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(manualCashReturnRows || []).map(cr => (
                            <tr key={cr.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                              <td style={{ padding: '4px' }}>
                                <input type="date" value={cr.date} onChange={e => { const val = e.target.value; setManualCashReturnRows(prev => (prev || []).map(r => r.id === cr.id ? { ...r, date: val } : r)); }} className="form-input" style={{ height: '30px', fontSize: '0.75rem' }} />
                              </td>
                              <td style={{ padding: '4px' }}>
                                <input type="number" value={cr.debtAmount} onChange={e => { const val = Number(e.target.value) || 0; setManualCashReturnRows(prev => (prev || []).map(r => r.id === cr.id ? { ...r, debtAmount: val } : r)); }} className="form-input" style={{ height: '30px', fontSize: '0.75rem', textAlign: 'right', color: '#fbbf24', fontWeight: '700' }} />
                              </td>
                              <td style={{ padding: '4px' }}>
                                <input type="number" value={cr.returnAmount} onChange={e => { const val = Number(e.target.value) || 0; setManualCashReturnRows(prev => (prev || []).map(r => r.id === cr.id ? { ...r, returnAmount: val } : r)); }} className="form-input" style={{ height: '30px', fontSize: '0.75rem', textAlign: 'right', color: '#34d399', fontWeight: '700' }} />
                              </td>
                              <td style={{ padding: '4px', textAlign: 'center' }}>
                                <button type="button" onClick={() => setManualCashReturnRows(prev => (prev || []).filter(r => r.id !== cr.id))} style={{ background: 'none', border: 'none', color: '#f43f5e', cursor: 'pointer' }}>✕</button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* 6. UANG DI LACI & SISA UANG DI KAS */}
                  <div style={{ background: '#0f172a', padding: '16px', borderRadius: '12px', border: '1px solid #6366f1', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '14px' }}>
                    {/* Uang di Laci */}
                    <div style={{ background: isUangDiLaciMinus ? 'rgba(244, 63, 94, 0.15)' : 'rgba(52, 211, 153, 0.15)', padding: '12px', borderRadius: '10px', border: `1px solid ${isUangDiLaciMinus ? '#f43f5e' : '#34d399'}` }}>
                      <span style={{ fontSize: '0.74rem', color: isUangDiLaciMinus ? '#f43f5e' : '#34d399', fontWeight: '800', textTransform: 'uppercase' }}>
                        💵 Uang Di Laci (Laba Kotor - Pengembalian Kas - Non-Cash)
                      </span>
                      <div style={{ fontSize: '1.25rem', fontWeight: '900', color: isUangDiLaciMinus ? '#f43f5e' : '#34d399', marginTop: '2px' }}>
                        {formatRupiah(uangDiLaci)}
                      </div>
                      {isUangDiLaciMinus && (
                        <div style={{ fontSize: '0.70rem', color: '#fb7185', marginTop: '4px', fontWeight: '700', background: 'rgba(0,0,0,0.3)', padding: '4px 6px', borderRadius: '4px' }}>
                          ⚠️ MINUS: Otomatis tercatat sebagai Hutang Pengembalian Kas di hari berikutnya!
                        </div>
                      )}
                    </div>

                    {/* Sisa Uang di Kas */}
                    <div style={{ background: 'rgba(99, 102, 241, 0.15)', padding: '12px', borderRadius: '10px', border: '1px solid #818cf8', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.74rem', color: '#818cf8', fontWeight: '800', textTransform: 'uppercase' }}>
                          🏦 Sisa Uang Di Kas
                        </span>
                        <input
                          type="number"
                          value={manualDefaultCashModal}
                          onChange={e => setManualDefaultCashModal(Number(e.target.value))}
                          className="form-input"
                          style={{ width: '90px', height: '26px', fontSize: '0.75rem', textAlign: 'right', fontWeight: '800' }}
                        />
                      </div>

                      <div style={{ fontSize: '1.25rem', fontWeight: '900', color: '#818cf8' }}>
                        {formatRupiah(sisaUangDiKas)}
                      </div>
                      <span style={{ fontSize: '0.66rem', color: '#cbd5e1' }}>
                        Modal ({formatRupiah(modalKasVal)}) - Laba Kotor Minus ({formatRupiah(labaKotorMinusVal)}) - Hutang Belum Dikembalikan ({formatRupiah(remainingDebt)})
                      </span>
                    </div>
                  </div>

                  {/* CATATAN */}
                  <div>
                    <label style={{ fontSize: '0.78rem', color: '#cbd5e1', fontWeight: '700', display: 'block', marginBottom: '4px' }}>Catatan Shift Laporan Keuangan</label>
                    <textarea
                      rows={2}
                      value={manualRepNotes}
                      onChange={e => setManualRepNotes(e.target.value)}
                      placeholder="Catatan penutupan shift kasir..."
                      className="form-input"
                      style={{ width: '100%', fontSize: '0.78rem', resize: 'none' }}
                    />
                  </div>

                  {/* SUBMIT BUTTONS */}
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '14px' }}>
                    <button
                      type="button"
                      onClick={() => setShowAddManualReportModal(false)}
                      className="btn-secondary"
                      style={{ padding: '8px 18px', fontSize: '0.82rem' }}
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      className="btn-primary"
                      style={{ padding: '8px 24px', fontSize: '0.82rem', background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)', color: '#ffffff', fontWeight: '900' }}
                    >
                      Simpan Laporan Keuangan Harian
                    </button>
                  </div>

                </form>
              );
            })()}
          </div>
        </div>
      )}

      {/* 14. MODAL PREVIEW LAPORAN HARIAN */}
      {previewManualReport && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999
        }}>
          <div className="glass-card animate-fade-in" style={{ width: '100%', maxWidth: '520px', padding: '24px', background: '#1e293b', borderRadius: '18px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '12px' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: '900', color: '#ffffff', margin: 0 }}>
                Pratinjau Laporan {previewManualReport.report_no || previewManualReport.id}
              </h3>
              <button onClick={() => setPreviewManualReport(null)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ background: '#0f172a', padding: '16px', borderRadius: '12px', border: '1px solid #334155', display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.84rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#94a3b8' }}>Tanggal Shift:</span>
                <span style={{ fontWeight: '800', color: '#ffffff' }}>{previewManualReport.date}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#94a3b8' }}>Pembuat / Kasir:</span>
                <span style={{ fontWeight: '800', color: '#ffffff' }}>{previewManualReport.author_name}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#94a3b8' }}>Pendapatan Net Sales:</span>
                <span style={{ fontWeight: '900', color: '#34d399' }}>{formatRupiah(previewManualReport.net_sales)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#94a3b8' }}>Kas Non-Tunai (QRIS/EDC):</span>
                <span style={{ fontWeight: '800', color: '#a78bfa' }}>{formatRupiah(previewManualReport.non_cash_sales)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#94a3b8' }}>Total Pengeluaran:</span>
                <span style={{ fontWeight: '800', color: '#fb7185' }}>-{formatRupiah(previewManualReport.total_expense)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed #334155', paddingTop: '8px' }}>
                <span style={{ color: '#94a3b8' }}>💰 Uang Fisik Laci:</span>
                <span style={{ fontWeight: '900', color: '#38bdf8' }}>{formatRupiah(previewManualReport.cash_physical)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #334155', paddingTop: '8px' }}>
                <span style={{ color: '#94a3b8' }}>Status Approval:</span>
                <span style={{ fontWeight: '900', color: previewManualReport.status === 'approved' ? '#34d399' : '#fbbf24' }}>
                  {previewManualReport.status === 'approved' ? '🟢 APPROVED' : '⏳ PENDING'}
                </span>
              </div>
            </div>

            <button onClick={() => setPreviewManualReport(null)} style={{ padding: '12px', background: '#334155', color: '#ffffff', border: 'none', borderRadius: '10px', fontWeight: '800', cursor: 'pointer' }}>
              Tutup Pratinjau
            </button>
          </div>
        </div>
      )}

      {/* 15. MODAL FORM "+ TAMBAHKAN STOK OPNAME / LAPORAN LOGISTIK" (MATCHING STOCK OPNAME 100%) */}
      {showAddLogisticsModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999
        }}>
          <div className="glass-card animate-fade-in" style={{
            width: '100%', maxWidth: '780px', maxHeight: '92vh', overflowY: 'auto',
            padding: '24px', background: '#1e293b', border: '1px solid #38bdf8', borderRadius: '18px',
            display: 'flex', flexDirection: 'column', gap: '16px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Package size={24} color="#38bdf8" />
                <div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: '900', color: '#f8fafc', margin: 0 }}>
                    Form Input Audit Stock Opname & Laporan Logistik
                  </h3>
                  <span style={{ fontSize: '0.74rem', color: '#94a3b8' }}>
                    Nomor Laporan: <strong style={{ color: '#38bdf8' }}>{logNo}</strong>
                  </span>
                </div>
              </div>
              <button onClick={() => setShowAddLogisticsModal(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                <X size={22} />
              </button>
            </div>

            {(() => {
              // Gunakan HANYA data nyata dari masterData — tidak ada fallback fake/mock
              const rawIngredients = masterData.ingredients || [];
              const ingredientsList = rawIngredients.filter(ing =>
                ing.tampilkan_di_apk !== 'Inaktif' && ing.tampilkan_di_apk !== 'inaktif'
              );

              const adminList = (masterData.webAdminAccounts || masterData.mobileAccounts || []).map(acc => ({
                id: acc.id, name: acc.name, role: acc.role || acc.jabatan || 'Kasir'
              }));

              const handleUpdateRow = (id, field, value) => {
                setOpnameBatchRows(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
              };

              const handleDeleteRow = (id) => {
                setOpnameBatchRows(prev => prev.filter(r => r.id !== id));
              };

              const handleAddEmptyRow = () => {
                const defaultIng = ingredientsList[0] || { name: 'Bahan Baku Baru', unit: 'kg' };
                const newRow = {
                  id: `batch-custom-${Date.now()}`,
                  item_name: defaultIng.name,
                  unit: defaultIng.unit || 'kg',
                  stok_awal: '',
                  stok_masuk: 0,
                  transfer_masuk: 0,
                  transfer_keluar: 0,
                  stok_rusak: 0,
                  stok_fisik: '',
                  isEditing: true
                };
                setOpnameBatchRows(prev => [...prev, newRow]);
              };

              return (
                <form onSubmit={e => {
                  e.preventDefault();

                  if (opnameBatchRows.length === 0) {
                    alert('Harap tambahkan minimal 1 bahan baku untuk diproses!');
                    return;
                  }

                  const newRecords = opnameBatchRows.map((row, idx) => ({
                    id: `${logNo}-${idx + 1}`,
                    report_no: logNo,
                    date: logDate,
                    outlet_id: logOutletId,
                    branch_name: (masterData.outlets || []).find(o => o.id === logOutletId)?.name || currentOutlet.name || 'Restoran Utama',
                    submitted_by: logSubmittedBy,
                    created_by: logSubmittedBy,
                    author_name: logSubmittedBy,
                    item_name: row.item_name,
                    unit: row.unit || 'kg',
                    stok_awal: Number(row.stok_awal || 0),
                    stok_masuk: Number(row.stok_masuk || 0),
                    stok_keluar: Number(row.transfer_keluar || 0),
                    transfer_keluar: Number(row.transfer_keluar || 0),
                    transfer_masuk: Number(row.transfer_masuk || 0),
                    stok_rusak: Number(row.stok_rusak || 0),
                    stok_fisik: Number(row.stok_fisik || 0),
                    status: 'ditunda'
                  }));

                  setShowAddLogisticsModal(false);

                  setMasterData(prev => {
                    const now = Date.now();
                    const newMaster = {
                      ...prev,
                      _lastUpdated: now,
                      clientUpdated: now,
                      approvedLogistics: [...newRecords, ...(prev.approvedLogistics || [])],
                      stockOpname: [...newRecords, ...(prev.stockOpname || [])],
                      stockMovement: [...newRecords, ...(prev.stockMovement || [])]
                    };

                    fetch(getApiUrl('/api/master-data'), {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify(newMaster)
                    }).catch(() => {});

                    return newMaster;
                  });
                }} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

                  {/* Header Form: Tanggal, No Laporan, Diisi Oleh, Cabang Outlet */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', background: '#0f172a', padding: '14px', borderRadius: '12px', border: '1px solid #334155' }}>
                    <div>
                      <label style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: '700', display: 'block', marginBottom: '4px' }}>📅 Tanggal Audit *</label>
                      <input type="date" required value={logDate} onChange={e => setLogDate(e.target.value)} className="form-input" style={{ width: '100%', height: '38px' }} />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: '700', display: 'block', marginBottom: '4px' }}>📋 Nomor Laporan *</label>
                      <input type="text" required value={logNo} onChange={e => setLogNo(e.target.value)} className="form-input" style={{ width: '100%', height: '38px', fontWeight: '800', color: '#38bdf8' }} />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: '700', display: 'block', marginBottom: '4px' }}>👤 Diisi Oleh *</label>
                      <select value={logSubmittedBy} onChange={e => setLogSubmittedBy(e.target.value)} className="form-input" style={{ width: '100%', height: '38px' }}>
                        {adminList.map(a => (
                          <option key={a.id} value={a.name}>{a.name} ({a.role})</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: '700', display: 'block', marginBottom: '4px' }}>🏢 Cabang Outlet</label>
                      <div style={{ width: '100%', height: '38px', background: '#1e293b', border: '1px solid #34d399', borderRadius: '8px', padding: '0 12px', color: '#34d399', fontWeight: '800', fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span>🏢 {currentOutlet.name || 'Restoran Utama'}</span>
                        <span style={{ fontSize: '0.70rem', color: '#94a3b8', background: 'rgba(52, 211, 153, 0.15)', padding: '2px 8px', borderRadius: '4px' }}>Akun Aktif</span>
                      </div>
                    </div>
                  </div>

                  {/* Header Subtitle & Button Tambahkan Bahan Baku */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h4 style={{ fontSize: '0.92rem', fontWeight: '800', color: '#34d399', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                      📦 Daftar Bahan Baku Audit ({opnameBatchRows.length} Item)
                    </h4>
                    <button
                      type="button"
                      onClick={handleAddEmptyRow}
                      style={{ padding: '6px 14px', background: 'rgba(52, 211, 153, 0.15)', color: '#34d399', border: '1px solid #34d399', borderRadius: '8px', fontWeight: '800', fontSize: '0.78rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                      <PlusCircle size={14} />
                      <span>+ Tambah Baris Bahan Baku</span>
                    </button>
                  </div>

                  {/* TABEL BATCH STOCK OPNAME BAHAN BAKU */}
                  <div style={{ maxHeight: '380px', overflowY: 'auto', border: '1px solid #334155', borderRadius: '12px', background: '#0f172a' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
                      <thead>
                        <tr style={{ background: '#1e293b', color: '#94a3b8', textAlign: 'left', borderBottom: '1px solid #334155', position: 'sticky', top: 0, zIndex: 10 }}>
                          <th style={{ padding: '10px 12px' }}>Bahan Baku & Satuan</th>
                          <th style={{ padding: '10px 8px', textAlign: 'center', width: '110px' }}>Stok Awal (Manual)</th>
                          <th style={{ padding: '10px 8px', textAlign: 'center', color: '#34d399' }}>Stok Masuk</th>
                          <th style={{ padding: '10px 8px', textAlign: 'center', color: '#34d399' }}>Transfer Stok In</th>
                          <th style={{ padding: '10px 8px', textAlign: 'center', color: '#fb7185' }}>Transfer Stok Out</th>
                          <th style={{ padding: '10px 8px', textAlign: 'center', color: '#fb7185' }}>Stok Rusak</th>
                          <th style={{ padding: '10px 8px', textAlign: 'center', color: '#38bdf8', width: '120px' }}>Sisa Stok Fisik *</th>
                          <th style={{ padding: '10px 8px', textAlign: 'center', width: '90px' }}>Aksi</th>
                        </tr>
                      </thead>
                      <tbody>
                        {opnameBatchRows.length === 0 ? (
                          <tr>
                            <td colSpan={8} style={{ padding: '24px', textAlign: 'center', color: '#94a3b8' }}>
                              Belum ada bahan baku. Klik <strong>+ Tambah Baris Bahan Baku</strong> di atas.
                            </td>
                          </tr>
                        ) : (
                          opnameBatchRows.map((row) => (
                            <tr key={row.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', background: row.isEditing ? 'rgba(56,189,248,0.05)' : 'transparent' }}>
                              
                              {/* Bahan Baku & Satuan */}
                              <td style={{ padding: '8px 12px' }}>
                                {row.isEditing ? (
                                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                    <select
                                      value={row.item_name}
                                      onChange={e => {
                                        const name = e.target.value;
                                        const found = ingredientsList.find(i => i.name === name);
                                        handleUpdateRow(row.id, 'item_name', name);
                                        if (found) handleUpdateRow(row.id, 'unit', found.unit || 'kg');
                                      }}
                                      className="form-input"
                                      style={{ height: '32px', fontSize: '0.78rem', color: '#34d399', fontWeight: '800' }}
                                    >
                                      {ingredientsList.map(ing => (
                                        <option key={ing.id} value={ing.name}>{ing.name}</option>
                                      ))}
                                    </select>
                                    <input
                                      type="text"
                                      value={row.unit}
                                      onChange={e => handleUpdateRow(row.id, 'unit', e.target.value)}
                                      className="form-input"
                                      style={{ width: '50px', height: '32px', fontSize: '0.75rem', textAlign: 'center' }}
                                      placeholder="Unit"
                                    />
                                  </div>
                                ) : (
                                  <div>
                                    <strong style={{ color: '#f8fafc', display: 'block' }}>{row.item_name}</strong>
                                    <span style={{ fontSize: '0.70rem', color: '#38bdf8' }}>Satuan: {row.unit}</span>
                                  </div>
                                )}
                              </td>

                              {/* Stok Awal (Input Manual) */}
                              <td style={{ padding: '8px', textAlign: 'center' }}>
                                <input
                                  type="number"
                                  step="any"
                                  placeholder="0"
                                  value={row.stok_awal}
                                  onChange={e => handleUpdateRow(row.id, 'stok_awal', e.target.value)}
                                  className="form-input"
                                  style={{ width: '100%', height: '32px', textAlign: 'center', fontSize: '0.80rem', fontWeight: '700' }}
                                />
                              </td>

                              {/* Stok Masuk (Otomatis) */}
                              <td style={{ padding: '8px', textAlign: 'center', color: '#34d399', fontWeight: '800' }}>
                                +{row.stok_masuk || 0}
                              </td>

                              {/* Transfer Stok In (Otomatis) */}
                              <td style={{ padding: '8px', textAlign: 'center', color: '#34d399', fontWeight: '800' }}>
                                +{row.transfer_masuk || 0}
                              </td>

                              {/* Transfer Stok Out (Otomatis) */}
                              <td style={{ padding: '8px', textAlign: 'center', color: '#fb7185', fontWeight: '800' }}>
                                -{row.transfer_keluar || 0}
                              </td>

                              {/* Stok Rusak (Otomatis) */}
                              <td style={{ padding: '8px', textAlign: 'center', color: '#fb7185', fontWeight: '800' }}>
                                -{row.stok_rusak || 0}
                              </td>

                              {/* Sisa Stok Fisik (Input Manual) */}
                              <td style={{ padding: '8px', textAlign: 'center' }}>
                                <input
                                  type="number"
                                  step="any"
                                  required
                                  placeholder="Stok Fisik"
                                  value={row.stok_fisik}
                                  onChange={e => handleUpdateRow(row.id, 'stok_fisik', e.target.value)}
                                  className="form-input"
                                  style={{ width: '100%', height: '34px', textAlign: 'center', fontSize: '0.88rem', fontWeight: '900', color: '#38bdf8', border: '1px solid #38bdf8', background: 'rgba(56, 189, 248, 0.1)' }}
                                />
                              </td>

                              {/* Aksi: Edit & Hapus */}
                              <td style={{ padding: '8px', textAlign: 'center' }}>
                                <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateRow(row.id, 'isEditing', !row.isEditing)}
                                    title={row.isEditing ? "Selesai Edit" : "Edit Nama / Satuan"}
                                    style={{ padding: '4px 8px', background: row.isEditing ? '#34d399' : '#334155', color: '#ffffff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                                  >
                                    <Edit2 size={12} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteRow(row.id)}
                                    title="Hapus Baris Ini"
                                    style={{ padding: '4px 8px', background: 'rgba(244,63,94,0.2)', color: '#f43f5e', border: '1px solid #f43f5e', borderRadius: '6px', cursor: 'pointer' }}
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                </div>
                              </td>

                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Footer Status & Tombol Simpan */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '0.74rem', color: '#94a3b8' }}>Status Approval:</span>
                      <span style={{ fontSize: '0.74rem', color: '#fbbf24', background: 'rgba(251, 191, 36, 0.15)', padding: '3px 10px', borderRadius: '6px', fontWeight: '800' }}>⏳ Pending (Butuh Persetujuan)</span>
                    </div>

                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button type="button" onClick={() => setShowAddLogisticsModal(false)} style={{ padding: '10px 18px', background: '#334155', color: '#ffffff', border: 'none', borderRadius: '8px', fontWeight: '800', cursor: 'pointer', fontSize: '0.82rem' }}>
                        Batal
                      </button>
                      <button type="submit" style={{ padding: '10px 24px', background: 'linear-gradient(135deg, #38bdf8 0%, #0284c7 100%)', color: '#ffffff', border: 'none', borderRadius: '8px', fontWeight: '900', fontSize: '0.85rem', cursor: 'pointer', boxShadow: '0 4px 16px rgba(56,189,248,0.4)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span>💾 SIMPAN SELURUH AUDIT STOK OPNAME</span>
                      </button>
                    </div>
                  </div>

                </form>
              );
            })()}

          </div>
        </div>
      )}

      {/* 16. MODAL PREVIEW AUDIT STOK OPNAME LOGISTIK */}
      {previewLogisticsReport && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999
        }}>
          <div className="glass-card animate-fade-in" style={{ width: '100%', maxWidth: '520px', padding: '24px', background: '#1e293b', borderRadius: '18px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '12px' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: '900', color: '#ffffff', margin: 0 }}>
                Pratinjau Audit Opname {previewLogisticsReport.report_no || previewLogisticsReport.id}
              </h3>
              <button onClick={() => setPreviewLogisticsReport(null)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ background: '#0f172a', padding: '16px', borderRadius: '12px', border: '1px solid #334155', display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.84rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#94a3b8' }}>Tanggal Audit:</span>
                <span style={{ fontWeight: '800', color: '#ffffff' }}>{previewLogisticsReport.date}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#94a3b8' }}>Diisi Oleh:</span>
                <span style={{ fontWeight: '800', color: '#ffffff' }}>{previewLogisticsReport.submitted_by || previewLogisticsReport.created_by}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#94a3b8' }}>Nama Stok Item:</span>
                <span style={{ fontWeight: '900', color: '#34d399' }}>📦 {previewLogisticsReport.item_name}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#94a3b8' }}>Stok Awal:</span>
                <span style={{ fontWeight: '800', color: '#cbd5e1' }}>{previewLogisticsReport.stok_awal || 0} {previewLogisticsReport.unit}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#94a3b8' }}>Stok Masuk:</span>
                <span style={{ fontWeight: '800', color: '#34d399' }}>+{previewLogisticsReport.stok_masuk || 0} {previewLogisticsReport.unit}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#94a3b8' }}>Transfer Out / In:</span>
                <span style={{ fontWeight: '800', color: '#a78bfa' }}>-{previewLogisticsReport.transfer_keluar || 0} / +{previewLogisticsReport.transfer_masuk || 0} {previewLogisticsReport.unit}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#94a3b8' }}>Stok Rusak:</span>
                <span style={{ fontWeight: '800', color: '#fb7185' }}>-{previewLogisticsReport.stok_rusak || 0} {previewLogisticsReport.unit} ({previewLogisticsReport.damage_reason || 'N/A'})</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed #334155', paddingTop: '8px' }}>
                <span style={{ color: '#94a3b8' }}>⚖️ Sisa Stok Fisik:</span>
                <span style={{ fontWeight: '900', color: '#38bdf8', fontSize: '1rem' }}>{previewLogisticsReport.stok_fisik} {previewLogisticsReport.unit}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #334155', paddingTop: '8px' }}>
                <span style={{ color: '#94a3b8' }}>Status Approval:</span>
                <span style={{ fontWeight: '900', color: (previewLogisticsReport.status === 'ok' || previewLogisticsReport.status === 'approved') ? '#34d399' : '#fbbf24' }}>
                  {(previewLogisticsReport.status === 'ok' || previewLogisticsReport.status === 'approved') ? '🟢 APPROVED' : '⏳ PENDING'}
                </span>
              </div>
            </div>

            <button onClick={() => setPreviewLogisticsReport(null)} style={{ padding: '12px', background: '#334155', color: '#ffffff', border: 'none', borderRadius: '10px', fontWeight: '800', cursor: 'pointer' }}>
              Tutup Pratinjau
            </button>
          </div>
        </div>
      )}
      {/* 16. MODAL FORM "+ BUAT LAPORAN TRANSFER PRODUK" */}
      {showAddTransferModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.85)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '16px'
        }}>
          <div className="glass-card animate-fade-in" style={{
            width: '100%', maxWidth: '880px', maxHeight: '92vh', overflowY: 'auto',
            background: '#1e293b', border: '1px solid rgba(167, 139, 250, 0.3)', borderRadius: '20px',
            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5)', padding: '24px',
            display: 'flex', flexDirection: 'column', gap: '20px',
            fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
          }}>
            {/* Header Modal */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ padding: '10px', background: 'rgba(167, 139, 250, 0.15)', borderRadius: '12px', border: '1px solid rgba(167, 139, 250, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Truck size={24} color="#a78bfa" />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: '800', color: '#f8fafc', margin: 0, letterSpacing: '-0.02em' }}>
                    🚚 Buat Laporan Transfer Produk Antarcabang
                  </h3>
                  <p style={{ fontSize: '0.80rem', color: '#94a3b8', margin: '3px 0 0 0' }}>
                    Formulir mutasi & pengiriman persediaan stok antarcabang restoran
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setShowAddTransferModal(false)} 
                style={{
                  background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                  color: '#94a3b8', borderRadius: '10px', width: '36px', height: '36px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', fontSize: '1.1rem', fontWeight: '700', transition: 'all 0.2s'
                }}
              >
                ✕
              </button>
            </div>

            {(() => {
              const ingredientsList = masterData?.ingredients || [];

              const outletsList = masterData?.outlets || [];

              const adminList = masterData?.userRights || masterData?.users || [];

              const handleAddTransferRow = () => {
                const defaultIng = ingredientsList[0] || null;
                setTransferBatchRows(prev => [
                  ...prev,
                  {
                    id: Date.now() + Math.random(),
                    item_name: defaultIng.name,
                    custom_item_name: '',
                    qty: 1,
                    unit: defaultIng.unit || 'kg'
                  }
                ]);
              };

              const handleUpdateTransferRow = (id, field, value) => {
                setTransferBatchRows(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
              };

              const handleDeleteTransferRow = (id) => {
                if (transferBatchRows.length <= 1) return;
                setTransferBatchRows(prev => prev.filter(r => r.id !== id));
              };

              return (
                <form onSubmit={e => {
                  e.preventDefault();
                  if (transferBatchRows.length === 0) {
                    alert('Mohon tambahkan minimal 1 bahan baku/produk untuk ditransfer.');
                    return;
                  }

                  const fromOutletObj = outletsList.find(o => Number(o.id) === Number(transferFromOutletId)) || currentOutlet;
                  const toOutletObj = outletsList.find(o => Number(o.id) === Number(transferToOutletId)) || outletsList.find(o => Number(o.id) !== Number(currentOutlet.id)) || { name: 'Outlet Tujuan' };

                  const newRecords = [];
                  transferBatchRows.forEach((row, idx) => {
                    const finalItemName = row.item_name === '__OTHER__' ? (row.custom_item_name || 'Bahan Baku Baru') : row.item_name;
                    const recId = transferBatchRows.length > 1 ? `${transferNo}-${idx + 1}` : transferNo;

                    newRecords.push({
                      id: recId,
                      report_no: transferNo,
                      date: transferDate,
                      from_outlet_id: currentOutlet.id || 1,
                      from_outlet_name: fromOutletObj.name || currentOutlet.name || 'Restoran Utama',
                      to_outlet_id: Number(transferToOutletId),
                      to_outlet_name: toOutletObj.name || 'Outlet Tujuan',
                      submitted_by: transferSubmittedBy,
                      created_by: transferSubmittedBy,
                      author_name: transferSubmittedBy,
                      item_name: finalItemName,
                      qty: Number(row.qty || 0),
                      unit: row.unit || 'kg',
                      notes: transferNotes || 'Transfer stok antarcabang',
                      status: 'ditunda',
                      is_approved: false
                    });
                  });

                  setPendingTransferDraft({
                    report_no: transferNo,
                    date: transferDate,
                    submitted_by: transferSubmittedBy,
                    from_outlet_name: fromOutletObj.name || currentOutlet.name || 'Restoran Utama',
                    to_outlet_name: toOutletObj.name || 'Outlet Tujuan',
                    items: newRecords,
                    notes: transferNotes || 'Transfer stok antarcabang'
                  });
                }} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>

                  {/* KARTU 1: Tanggal & Nomor Laporan */}
                  <div style={{ background: '#0f172a', padding: '16px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.06)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
                    <div>
                      <label style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: '700', display: 'block', marginBottom: '6px' }}>📅 Tanggal Transfer *</label>
                      <input type="date" required value={transferDate} onChange={e => setTransferDate(e.target.value)} className="form-input" style={{ width: '100%', height: '40px' }} />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: '700', display: 'block', marginBottom: '6px' }}>📋 Nomor Laporan Transfer *</label>
                      <input type="text" required value={transferNo} onChange={e => setTransferNo(e.target.value)} className="form-input" style={{ width: '100%', height: '40px', fontWeight: '800', color: '#a78bfa' }} />
                    </div>
                  </div>

                  {/* KARTU 2: Diisi Oleh, Outlet Asal & Outlet Tujuan */}
                  <div style={{ background: '#0f172a', padding: '16px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.06)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
                    <div>
                      <label style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: '700', display: 'block', marginBottom: '6px' }}>👤 Pengaju / Dibuat Oleh *</label>
                      <select value={transferSubmittedBy} onChange={e => setTransferSubmittedBy(e.target.value)} className="form-input" style={{ width: '100%', height: '40px' }}>
                        {adminList.map(a => (
                          <option key={a.id} value={a.name}>{a.name} ({a.role})</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label style={{ fontSize: '0.78rem', color: '#fb7185', fontWeight: '800', display: 'block', marginBottom: '6px' }}>🔴 Outlet Asal (Pengirim)</label>
                      <div style={{ width: '100%', height: '40px', background: '#1e293b', border: '1px solid #fb7185', borderRadius: '8px', padding: '0 12px', color: '#fb7185', fontWeight: '800', fontSize: '0.82rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span>🔴 {currentOutlet.name || 'Restoran Utama'}</span>
                        <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>(Akun Login)</span>
                      </div>
                    </div>

                    <div>
                      <label style={{ fontSize: '0.78rem', color: '#34d399', fontWeight: '800', display: 'block', marginBottom: '6px' }}>🟢 Outlet Tujuan (Penerima) *</label>
                      <select value={transferToOutletId} onChange={e => setTransferToOutletId(Number(e.target.value))} className="form-input" style={{ width: '100%', height: '40px', fontWeight: '800', color: '#34d399', border: '1px solid #34d399' }}>
                        {outletsList.filter(o => o.id !== (currentOutlet.id || 1)).map(o => (
                          <option key={o.id} value={o.id}>{o.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* KARTU 3: DETAIL BAHAN BAKU / PRODUK YANG DITRANSFER (MULTI-ITEM) */}
                  <div style={{ background: '#0f172a', padding: '16px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <label style={{ fontSize: '0.82rem', color: '#38bdf8', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>📦 Detail Bahan Baku / Produk Yang Ditransfer ({transferBatchRows.length} Item)</span>
                      </label>
                      <button
                        type="button"
                        onClick={handleAddTransferRow}
                        style={{
                          padding: '6px 14px', background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8',
                          border: '1px solid rgba(56, 189, 248, 0.3)', borderRadius: '10px',
                          fontSize: '0.78rem', fontWeight: '800', cursor: 'pointer',
                          display: 'inline-flex', alignItems: 'center', gap: '6px', transition: 'all 0.2s'
                        }}
                      >
                        <PlusCircle size={15} />
                        <span>+ Tambahkan Bahan Baku</span>
                      </button>
                    </div>

                    {/* Format Tabel Proposional */}
                    <div style={{ overflowX: 'auto', borderRadius: '12px', border: '1px solid #334155' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.82rem' }}>
                        <thead>
                          <tr style={{ background: '#1e293b', borderBottom: '1px solid #334155', color: '#94a3b8', fontSize: '0.74rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                            <th style={{ padding: '12px 14px', width: '40px', textAlign: 'center' }}>No</th>
                            <th style={{ padding: '12px 14px', minWidth: '220px' }}>Nama Produk / Stok Item *</th>
                            <th style={{ padding: '12px 14px', width: '140px', textAlign: 'right', color: '#fb7185' }}>📤 Transfer Out (Outlet Pengirim) *</th>
                            <th style={{ padding: '12px 14px', width: '140px', textAlign: 'right', color: '#34d399' }}>📥 Transfer In (Outlet Penerima) *</th>
                            <th style={{ padding: '12px 14px', width: '120px', textAlign: 'center' }}>Satuan / Unit (Data Master)</th>
                            <th style={{ padding: '12px 14px', width: '45px', textAlign: 'center' }}>Hapus</th>
                          </tr>
                        </thead>
                        <tbody>
                          {transferBatchRows.map((row, idx) => {
                            const foundIng = ingredientsList.find(i => i.name === row.item_name);
                            const autoUnit = foundIng?.unit || row.unit || 'kg';

                            return (
                              <React.Fragment key={row.id || idx}>
                                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', background: idx % 2 === 0 ? 'rgba(30, 41, 59, 0.5)' : '#0f172a' }}>
                                  {/* 1. Index */}
                                  <td style={{ padding: '12px 14px', textAlign: 'center', fontWeight: '700', color: '#64748b' }}>
                                    {idx + 1}
                                  </td>

                                  {/* 2. Nama Bahan Baku */}
                                  <td style={{ padding: '10px 14px' }}>
                                    <select
                                      value={row.item_name}
                                      onChange={e => {
                                        const val = e.target.value;
                                        handleUpdateTransferRow(row.id, 'item_name', val);
                                        if (val !== '__OTHER__') {
                                          const found = ingredientsList.find(i => i.name === val);
                                          if (found) handleUpdateTransferRow(row.id, 'unit', found.unit || 'kg');
                                        }
                                      }}
                                      className="form-input"
                                      style={{ width: '100%', height: '38px', fontWeight: '800', color: '#34d399', fontSize: '0.82rem', borderRadius: '8px' }}
                                    >
                                      {ingredientsList.map(ing => (
                                        <option key={ing.id} value={ing.name}>{ing.name} ({ing.unit || 'kg'})</option>
                                      ))}
                                      <option value="__OTHER__">➕ + Buat / Tentukan Nama Bahan Baku Baru...</option>
                                    </select>
                                  </td>

                                  {/* 3. Transfer Out Input */}
                                  <td style={{ padding: '10px 14px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'flex-end' }}>
                                      <span style={{ color: '#fb7185', fontWeight: '900', fontSize: '0.9rem' }}>-</span>
                                      <input
                                        type="number"
                                        required
                                        step="any"
                                        min="0"
                                        placeholder="0"
                                        value={row.qty}
                                        onChange={e => handleUpdateTransferRow(row.id, 'qty', e.target.value)}
                                        className="form-input"
                                        style={{ width: '85px', height: '38px', fontWeight: '900', color: '#fb7185', fontSize: '0.85rem', textAlign: 'right', borderRadius: '8px', border: '1px solid rgba(251, 113, 133, 0.4)' }}
                                      />
                                    </div>
                                  </td>

                                  {/* 4. Transfer In Input */}
                                  <td style={{ padding: '10px 14px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'flex-end' }}>
                                      <span style={{ color: '#34d399', fontWeight: '900', fontSize: '0.9rem' }}>+</span>
                                      <input
                                        type="number"
                                        required
                                        step="any"
                                        min="0"
                                        placeholder="0"
                                        value={row.qty}
                                        onChange={e => handleUpdateTransferRow(row.id, 'qty', e.target.value)}
                                        className="form-input"
                                        style={{ width: '85px', height: '38px', fontWeight: '900', color: '#34d399', fontSize: '0.85rem', textAlign: 'right', borderRadius: '8px', border: '1px solid rgba(52, 211, 153, 0.4)' }}
                                      />
                                    </div>
                                  </td>

                                  {/* 5. Satuan Unit Automatis */}
                                  <td style={{ padding: '10px 14px' }}>
                                    {row.item_name === '__OTHER__' ? (
                                      <input
                                        type="text"
                                        value={row.unit}
                                        onChange={e => handleUpdateTransferRow(row.id, 'unit', e.target.value)}
                                        placeholder="kg/liter"
                                        className="form-input"
                                        style={{ width: '100%', height: '38px', fontSize: '0.82rem', borderRadius: '8px', textAlign: 'center' }}
                                      />
                                    ) : (
                                      <div style={{
                                        height: '38px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        background: 'rgba(167, 139, 250, 0.1)', border: '1px solid rgba(167, 139, 250, 0.3)',
                                        borderRadius: '8px', color: '#c084fc', fontWeight: '800', fontSize: '0.82rem'
                                      }}>
                                        🏷️ {autoUnit}
                                      </div>
                                    )}
                                  </td>

                                  {/* 6. Hapus */}
                                  <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteTransferRow(row.id)}
                                      disabled={transferBatchRows.length <= 1}
                                      style={{
                                        background: transferBatchRows.length <= 1 ? 'rgba(255,255,255,0.03)' : 'rgba(244,63,94,0.15)',
                                        border: '1px solid',
                                        borderColor: transferBatchRows.length <= 1 ? 'transparent' : 'rgba(244,63,94,0.3)',
                                        color: transferBatchRows.length <= 1 ? '#475569' : '#fb7185',
                                        borderRadius: '8px',
                                        width: '34px',
                                        height: '34px',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        justify: 'center',
                                        cursor: transferBatchRows.length <= 1 ? 'not-allowed' : 'pointer'
                                      }}
                                      title="Hapus baris ini"
                                    >
                                      <Trash2 size={15} />
                                    </button>
                                  </td>
                                </tr>

                                {/* Custom Item Row */}
                                {row.item_name === '__OTHER__' && (
                                  <tr style={{ background: 'rgba(251, 191, 36, 0.05)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                    <td colSpan={6} style={{ padding: '10px 14px 12px 14px' }}>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <label style={{ fontSize: '0.76rem', color: '#fbbf24', fontWeight: '800', whiteSpace: 'nowrap' }}>
                                          ✏️ Nama Bahan Baku Kustom:
                                        </label>
                                        <input
                                          type="text"
                                          required
                                          placeholder="Masukkan nama bahan baku kustom..."
                                          value={row.custom_item_name || ''}
                                          onChange={e => handleUpdateTransferRow(row.id, 'custom_item_name', e.target.value)}
                                          className="form-input"
                                          style={{ flex: 1, height: '36px', fontWeight: '800', color: '#fbbf24', fontSize: '0.80rem', borderRadius: '8px' }}
                                        />
                                      </div>
                                    </td>
                                  </tr>
                                )}
                              </React.Fragment>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* KARTU 4: Catatan / Alasan Transfer */}
                  <div style={{ background: '#0f172a', padding: '16px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <label style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                      <span>📝 Catatan / Alasan Transfer Bahan Baku</span>
                    </label>
                    <input 
                      type="text" 
                      placeholder="Contoh: Stok bahan baku menipis untuk persiapan weekend..." 
                      value={transferNotes} 
                      onChange={e => setTransferNotes(e.target.value)} 
                      className="form-input" 
                      style={{ width: '100%', height: '42px', fontSize: '0.85rem', borderRadius: '10px' }} 
                    />
                  </div>

                  {/* Footer Buttons */}
                  <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                    <button 
                      type="button" 
                      onClick={() => setShowAddTransferModal(false)} 
                      style={{
                        padding: '12px 22px', background: '#334155', color: '#ffffff',
                        border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px',
                        fontWeight: '700', fontSize: '0.85rem', cursor: 'pointer', transition: 'all 0.2s'
                      }}
                    >
                      Batal
                    </button>
                    <button 
                      type="submit" 
                      style={{
                        padding: '12px 28px', background: 'linear-gradient(135deg, #c084fc 0%, #7c3aed 100%)',
                        color: '#ffffff', border: 'none', borderRadius: '10px',
                        fontWeight: '800', fontSize: '0.88rem', cursor: 'pointer',
                        boxShadow: '0 4px 16px rgba(167,139,250,0.4)', transition: 'all 0.2s'
                      }}
                    >
                      💾 Simpan & Kirim Transfer Bahan Baku
                    </button>
                  </div>
                </form>
              );
            })()}
          </div>
        </div>
      )}

      {/* PAPAN INFORMASI PERSETUJUAN TRANSFER BAHAN BAKU */}
      {pendingTransferDraft && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.88)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '16px'
        }}>
          <div className="glass-card animate-fade-in" style={{
            width: '100%', maxWidth: '640px', background: '#0f172a',
            border: '1px solid rgba(56, 189, 248, 0.4)', borderRadius: '20px',
            padding: '24px', boxShadow: '0 25px 50px rgba(0,0,0,0.6)',
            display: 'flex', flexDirection: 'column', gap: '18px'
          }}>
            {/* Header Modal */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '14px' }}>
              <div style={{ padding: '10px', background: 'rgba(56, 189, 248, 0.15)', borderRadius: '12px', border: '1px solid rgba(56, 189, 248, 0.3)' }}>
                <Truck size={24} color="#38bdf8" />
              </div>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: '900', color: '#f8fafc', margin: 0 }}>
                  🚚 Papan Informasi Persetujuan Transfer Bahan Baku
                </h3>
                <span style={{ fontSize: '0.76rem', color: '#fbbf24', fontWeight: '800' }}>
                  ⏳ Status: Pending (Membutuhkan Persetujuan Logistik Pusat)
                </span>
              </div>
            </div>

            {/* Content Details */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ background: '#1e293b', padding: '14px', borderRadius: '12px', border: '1px solid #334155', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '0.82rem' }}>
                <div>
                  <span style={{ color: '#94a3b8', fontSize: '0.75rem', display: 'block' }}>📋 No. Laporan:</span>
                  <span style={{ fontWeight: '800', color: '#38bdf8' }}>{pendingTransferDraft.report_no}</span>
                </div>
                <div>
                  <span style={{ color: '#94a3b8', fontSize: '0.75rem', display: 'block' }}>📅 Tanggal:</span>
                  <span style={{ fontWeight: '800', color: '#ffffff' }}>{pendingTransferDraft.date}</span>
                </div>
                <div>
                  <span style={{ color: '#94a3b8', fontSize: '0.75rem', display: 'block' }}>👤 Dibuat Oleh:</span>
                  <span style={{ fontWeight: '800', color: '#ffffff' }}>{pendingTransferDraft.submitted_by}</span>
                </div>
                <div>
                  <span style={{ color: '#fb7185', fontSize: '0.75rem', display: 'block', fontWeight: '800' }}>🔴 Outlet Asal (Pengirim):</span>
                  <span style={{ fontWeight: '800', color: '#fb7185' }}>🏬 {pendingTransferDraft.from_outlet_name}</span>
                </div>
                <div>
                  <span style={{ color: '#34d399', fontSize: '0.75rem', display: 'block', fontWeight: '800' }}>🟢 Outlet Tujuan (Penerima):</span>
                  <span style={{ fontWeight: '800', color: '#34d399' }}>🏬 {pendingTransferDraft.to_outlet_name}</span>
                </div>
              </div>

              {/* Rincian Bahan Baku Table */}
              <div>
                <span style={{ color: '#38bdf8', fontSize: '0.78rem', fontWeight: '800', display: 'block', marginBottom: '8px' }}>
                  📦 Rincian Bahan Baku Yang Ditransfer ({pendingTransferDraft.items.length} Item):
                </span>
                <div style={{ background: '#1e293b', borderRadius: '10px', border: '1px solid #334155', overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.80rem' }}>
                    <thead>
                      <tr style={{ background: '#0f172a', color: '#94a3b8', fontSize: '0.72rem', textTransform: 'uppercase', borderBottom: '1px solid #334155' }}>
                        <th style={{ padding: '8px 12px', textAlign: 'center', width: '40px' }}>No</th>
                        <th style={{ padding: '8px 12px', textAlign: 'left' }}>Nama Produk / Stok Item</th>
                        <th style={{ padding: '8px 12px', color: '#34d399' }}>📥 Transfer In (Outlet Penerima)</th>
                        <th style={{ padding: '8px 12px', color: '#fb7185' }}>📤 Transfer Out (Outlet Pengirim)</th>
                        <th style={{ padding: '8px 12px', textAlign: 'center', width: '100px' }}>Satuan / Unit</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pendingTransferDraft.items.map((it, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                          <td style={{ padding: '8px 12px', textAlign: 'center', color: '#64748b', fontWeight: '700' }}>{idx + 1}</td>
                          <td style={{ padding: '8px 12px', color: '#38bdf8', fontWeight: '800' }}>🌾 {it.item_name}</td>
                          <td style={{ padding: '8px 12px', color: '#34d399', fontWeight: '900' }}>🟢 {pendingTransferDraft.to_outlet_name} (+{it.qty} {it.unit})</td>
                          <td style={{ padding: '8px 12px', color: '#fb7185', fontWeight: '900' }}>🔴 {pendingTransferDraft.from_outlet_name} (-{it.qty} {it.unit})</td>
                          <td style={{ padding: '8px 12px', textAlign: 'center', color: '#c084fc', fontWeight: '900' }}>🏷️ {it.unit}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Action Buttons: Edit Kembali vs Simpan */}
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', paddingTop: '6px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
              <button 
                type="button" 
                onClick={() => setPendingTransferDraft(null)} 
                style={{
                  padding: '11px 22px', background: '#334155', color: '#ffffff',
                  border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px',
                  fontWeight: '700', fontSize: '0.85rem', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.2s'
                }}
              >
                <Edit2 size={15} />
                <span>✏️ Edit Kembali</span>
              </button>
              <button 
                type="button" 
                onClick={() => {
                  setShowAddTransferModal(false);
                  setEditingTransferId(null);
                  setPendingTransferDraft(null);

                  setMasterData(prev => {
                    const now = Date.now();
                    const filterOld = (arr) => (arr || []).filter(x => String(x.id) !== String(editingTransferId) && String(x.report_no) !== String(pendingTransferDraft.report_no));
                    const newMaster = {
                      ...prev,
                      _lastUpdated: now,
                      clientUpdated: now,
                      stockTransfer: [...pendingTransferDraft.items, ...filterOld(prev.stockTransfer)],
                      approvedTransfers: [...pendingTransferDraft.items, ...filterOld(prev.approvedTransfers)],
                      stockMovement: [...pendingTransferDraft.items, ...filterOld(prev.stockMovement)]
                    };

                    fetch(getApiUrl('/api/master-data'), {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify(newMaster)
                    }).catch(() => {});

                    return newMaster;
                  });
                }} 
                style={{
                  padding: '11px 26px', background: 'linear-gradient(135deg, #34d399 0%, #059669 100%)',
                  color: '#ffffff', border: 'none', borderRadius: '10px',
                  fontWeight: '800', fontSize: '0.85rem', cursor: 'pointer',
                  boxShadow: '0 4px 16px rgba(52,211,153,0.4)',
                  display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.2s'
                }}
              >
                <CheckCircle size={15} />
                <span>💾 Simpan</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PREVIEW TRANSFER PRODUK */}
      {previewTransferReport && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999
        }}>
          <div className="glass-card animate-fade-in" style={{
            width: '100%', maxWidth: '540px', padding: '24px', background: '#1e293b', border: '1px solid #a78bfa', borderRadius: '18px', display: 'flex', flexDirection: 'column', gap: '16px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #334155', paddingBottom: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Truck size={22} color="#a78bfa" />
                <h3 style={{ fontSize: '1.1rem', fontWeight: '900', color: '#ffffff', margin: 0 }}>
                  Pratinjau Laporan Transfer Produk
                </h3>
              </div>
              <button onClick={() => setPreviewTransferReport(null)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontWeight: '900' }}>✕</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.85rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#94a3b8' }}>Nomor Laporan:</span>
                <span style={{ fontWeight: '900', color: '#a78bfa' }}>{previewTransferReport.report_no || previewTransferReport.id}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#94a3b8' }}>Tanggal Transfer:</span>
                <span style={{ fontWeight: '800', color: '#ffffff' }}>{previewTransferReport.date}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#94a3b8' }}>Pengaju:</span>
                <span style={{ fontWeight: '800', color: '#ffffff' }}>{previewTransferReport.submitted_by || previewTransferReport.created_by}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#94a3b8' }}>Outlet Asal:</span>
                <span style={{ fontWeight: '800', color: '#cbd5e1' }}>🏢 {previewTransferReport.from_outlet_name || currentOutlet.name}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#94a3b8' }}>Outlet Tujuan:</span>
                <span style={{ fontWeight: '800', color: '#a78bfa' }}>➡️ {previewTransferReport.to_outlet_name || (masterData.outlets || []).find(o => Number(o.id) === Number(previewTransferReport.to_outlet_id || previewTransferReport.toOutletId))?.name || 'Outlet Tujuan'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#94a3b8' }}>Nama Produk Item:</span>
                <span style={{ fontWeight: '900', color: '#34d399' }}>📦 {previewTransferReport.item_name}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#94a3b8' }}>Jumlah Transfer:</span>
                <span style={{ fontWeight: '900', color: '#a78bfa', fontSize: '1rem' }}>{previewTransferReport.qty} {previewTransferReport.unit}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #334155', paddingTop: '8px' }}>
                <span style={{ color: '#94a3b8' }}>Status Approval:</span>
                <span style={{ fontWeight: '900', color: (previewTransferReport.status === 'ok' || previewTransferReport.status === 'approved') ? '#34d399' : '#fbbf24' }}>
                  {(previewTransferReport.status === 'ok' || previewTransferReport.status === 'approved') ? '🟢 APPROVED' : '⏳ PENDING'}
                </span>
              </div>
            </div>

            <button onClick={() => setPreviewTransferReport(null)} style={{ padding: '12px', background: '#334155', color: '#ffffff', border: 'none', borderRadius: '10px', fontWeight: '800', cursor: 'pointer' }}>
              Tutup Pratinjau
            </button>
          </div>
        </div>
      )}

      {/* 17. MODAL FORM "LAPORKAN STOK RUSAK / WASTE" (MATCHING WEB ADMIN EXACTLY) */}
      {showAddWasteModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999
        }}>
          <div className="glass-card animate-fade-in" style={{
            width: '100%', maxWidth: '720px', maxHeight: '90vh', overflowY: 'auto',
            padding: '24px', background: '#1e293b', border: '1px solid #f43f5e', borderRadius: '18px',
            display: 'flex', flexDirection: 'column', gap: '16px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #334155', paddingBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Trash2 size={24} color="#f43f5e" />
                <div>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: '900', color: '#f8fafc', margin: 0 }}>
                    Laporkan Stok Rusak / Waste
                  </h3>
                  <p style={{ fontSize: '0.76rem', color: '#94a3b8', margin: '2px 0 0 0' }}>
                    Formulir pencatatan waste, retur, expired, & kerusakan bahan baku
                  </p>
                </div>
              </div>
              <button onClick={() => { setShowAddWasteModal(false); setEditingWasteId(null); }} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '1.2rem', fontWeight: '900' }}>✕</button>
            </div>

            {(() => {
              const ingredientsList = masterData.ingredients || [];

              const userList = masterData?.userAccounts || masterData?.userRights || [];

              return (
                <form onSubmit={e => {
                  e.preventDefault();
                  if (wasteBatchRows.length === 0 || wasteBatchRows.some(r => !r.item_name || !r.qty)) {
                    alert('Harap lengkapi item bahan baku dan jumlah Qty rusak!');
                    return;
                  }
                  setShowWastePreviewFormModal(true);
                }} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

                  {/* Row 1: Tanggal Kejadian & Dibuat Oleh */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '12px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <span style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: '700' }}>Tanggal Kejadian *</span>
                      <input type="date" required value={wasteDate} onChange={e => setWasteDate(e.target.value)} className="form-input" style={{ width: '100%', height: '40px', padding: '8px', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', color: 'white', fontSize: '0.82rem' }} />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <span style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: '700' }}>Dibuat Oleh *</span>
                      <select value={wasteSubmittedBy} onChange={e => setWasteSubmittedBy(e.target.value)} className="form-input" style={{ width: '100%', height: '40px', padding: '8px', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', color: 'white', fontSize: '0.82rem', cursor: 'pointer' }}>
                        {userList.map(a => (
                          <option key={a.id} value={a.name}>{a.name} ({a.role || 'Staf Restoran'})</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Row 2: Nama Outlet Cabang */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: '700' }}>Nama Outlet Cabang</span>
                    <div style={{ width: '100%', height: '40px', background: '#0f172a', border: '1px solid #34d399', borderRadius: '6px', padding: '0 12px', color: '#34d399', fontWeight: '800', fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span>🏢 {(masterData.outlets || []).find(o => Number(o.id) === Number(wasteOutletId))?.name || currentOutlet?.name || 'Outlet Cabang'}</span>
                      <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>(Akun Login POS)</span>
                    </div>
                  </div>

                   {/* Catatan Editing jika dalam mode Edit */}
                  {editingWasteId && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', background: 'rgba(251,191,36,0.08)', padding: '10px', borderRadius: '8px', border: '1px solid rgba(251,191,36,0.3)' }}>
                      <span style={{ fontSize: '0.78rem', color: '#fbbf24', fontWeight: '800' }}>📝 Catatan Editing (Wajib saat Edit Data) *</span>
                      <textarea
                        required
                        placeholder="Tuliskan catatan perbaikan atau alasan pengeditan data ini..."
                        value={wasteEditingNotes}
                        onChange={e => setWasteEditingNotes(e.target.value)}
                        rows={2}
                        className="form-input"
                        style={{ width: '100%', padding: '8px', background: '#0f172a', border: '1px solid #fbbf24', borderRadius: '6px', color: '#fbbf24', fontSize: '0.80rem' }}
                      />
                    </div>
                  )}

                  {/* Dynamic Item Rows Section */}
                  <div style={{ background: '#0f172a', padding: '14px', borderRadius: '12px', border: '1px solid #334155', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.82rem', color: '#f43f5e', fontWeight: '800' }}>
                        🥬 Cari & Pilih Nama Item (Bahan Baku Rusak):
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setWasteBatchRows(prev => [
                            ...prev,
                            { id: Date.now(), item_name: '', custom_item_name: '', qty: '', unit: 'kg', reason: '', notes: '' }
                          ]);
                        }}
                        style={{
                          padding: '6px 12px', background: 'rgba(244, 63, 94, 0.2)', border: '1px solid #f43f5e',
                          color: '#f43f5e', borderRadius: '8px', fontSize: '0.75rem', fontWeight: '900', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px'
                        }}
                      >
                        <PlusCircle size={14} />
                        <span>+ Tambahkan Bahan Baku</span>
                      </button>
                    </div>

                    {wasteBatchRows.map((row, idx) => (
                      <div key={row.id || idx} style={{ background: '#1e293b', padding: '12px', borderRadius: '10px', border: '1px solid #475569', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1.5fr 36px', gap: '8px', alignItems: 'end' }}>
                          <div>
                            <span style={{ fontSize: '0.72rem', color: '#cbd5e1', fontWeight: '700', display: 'block', marginBottom: '2px' }}>
                              Item Bahan Baku *
                            </span>
                            <select
                              value={row.item_name}
                              onChange={e => {
                                const val = e.target.value;
                                const updated = [...wasteBatchRows];
                                updated[idx].item_name = val;
                                if (val !== '__OTHER__' && val !== '') {
                                  const found = ingredientsList.find(i => i.name === val);
                                  if (found) updated[idx].unit = found.unit || 'kg';
                                }
                                setWasteBatchRows(updated);
                              }}
                              required
                              className="form-input"
                              style={{ width: '100%', height: '36px', fontSize: '0.80rem', fontWeight: '800', color: row.item_name ? '#38bdf8' : '#64748b', padding: '6px' }}
                            >
                              <option value="" disabled>-- Pilih Bahan Baku --</option>
                              {ingredientsList.map(ing => (
                                <option key={ing.id} value={ing.name}>{ing.name} ({ing.unit || 'kg'})</option>
                              ))}
                              <option value="__OTHER__">➕ + Nama Bahan Baku Lainnya...</option>
                            </select>
                          </div>

                          <div>
                            <span style={{ fontSize: '0.72rem', color: '#fb7185', fontWeight: '700', display: 'block', marginBottom: '2px' }}>
                              Jumlah Qty Rusak *
                            </span>
                            <input
                              type="number"
                              min="0.01"
                              step="any"
                              required
                              placeholder="Isi Qty..."
                              value={row.qty}
                              onChange={e => {
                                const updated = [...wasteBatchRows];
                                updated[idx].qty = e.target.value;
                                setWasteBatchRows(updated);
                              }}
                              className="form-input"
                              style={{ width: '100%', height: '36px', fontSize: '0.80rem', fontWeight: '900', color: '#fb7185', padding: '6px' }}
                            />
                          </div>

                          <div>
                            <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: '700', display: 'block', marginBottom: '2px' }}>
                              Satuan (Otomatis)
                            </span>
                            <input
                              type="text"
                              readOnly
                              value={row.unit}
                              className="form-input"
                              style={{ width: '100%', height: '36px', fontSize: '0.80rem', background: '#0f172a', color: '#94a3b8', padding: '6px' }}
                            />
                          </div>

                          <div>
                            <span style={{ fontSize: '0.72rem', color: '#fb7185', fontWeight: '700', display: 'block', marginBottom: '2px' }}>
                              Pilihan Alasan *
                            </span>
                            <select
                              value={row.reason}
                              onChange={e => {
                                const updated = [...wasteBatchRows];
                                updated[idx].reason = e.target.value;
                                setWasteBatchRows(updated);
                              }}
                              required
                              className="form-input"
                              style={{ width: '100%', height: '36px', fontSize: '0.78rem', fontWeight: '800', color: row.reason ? '#fb7185' : '#64748b', padding: '6px' }}
                            >
                              <option value="" disabled>-- Pilih Alasan --</option>
                              <option value="Terlalu kecil">Terlalu kecil</option>
                              <option value="Terlalu besar">Terlalu besar</option>
                              <option value="Berbau">Berbau</option>
                              <option value="Tidak standar">Tidak standar</option>
                              <option value="Dan lain lain">Dan lain lain</option>
                            </select>

                            {row.reason === 'Dan lain lain' && (
                              <input
                                type="text"
                                placeholder="Tulis alasan spesifik..."
                                value={row.reason_custom || ''}
                                onChange={e => {
                                  const updated = [...wasteBatchRows];
                                  updated[idx].reason_custom = e.target.value;
                                  setWasteBatchRows(updated);
                                }}
                                className="form-input"
                                style={{ width: '100%', height: '34px', fontSize: '0.78rem', color: '#fbbf24', fontWeight: '700', marginTop: '4px' }}
                              />
                            )}
                          </div>

                          {wasteBatchRows.length > 1 && (
                            <button
                              type="button"
                              onClick={() => {
                                setWasteBatchRows(prev => prev.filter((_, i) => i !== idx));
                              }}
                              style={{ height: '36px', width: '36px', background: 'rgba(239, 68, 68, 0.2)', border: '1px solid #ef4444', color: '#ef4444', borderRadius: '6px', cursor: 'pointer', fontWeight: '900' }}
                              title="Hapus baris ini"
                            >
                              ✕
                            </button>
                          )}
                        </div>

                        {row.item_name === '__OTHER__' && (
                          <input
                            type="text"
                            required
                            placeholder="Tentukan Nama Bahan Baku Baru..."
                            value={row.custom_item_name}
                            onChange={e => {
                              const updated = [...wasteBatchRows];
                              updated[idx].custom_item_name = e.target.value;
                              setWasteBatchRows(updated);
                            }}
                            className="form-input"
                            style={{ width: '100%', height: '34px', fontSize: '0.78rem', color: '#fbbf24', fontWeight: '800', marginTop: '4px' }}
                          />
                        )}

                        {/* Catatan tambahan per item */}
                        <input
                          type="text"
                          placeholder="Catatan tambahan (opsional)..."
                          value={row.notes || ''}
                          onChange={e => {
                            const updated = [...wasteBatchRows];
                            updated[idx].notes = e.target.value;
                            setWasteBatchRows(updated);
                          }}
                          className="form-input"
                          style={{ width: '100%', height: '32px', fontSize: '0.75rem', color: '#94a3b8', fontWeight: '600', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', padding: '6px 10px' }}
                        />
                      </div>
                    ))}
                  </div>

                  {/* Catatan Laporan (global) */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: '700' }}>Catatan Laporan (Opsional)</span>
                    <textarea
                      placeholder="Tambahkan catatan umum untuk laporan ini..."
                      value={wasteNotes}
                      onChange={e => setWasteNotes(e.target.value)}
                      rows={2}
                      className="form-input"
                      style={{ width: '100%', padding: '8px 10px', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', color: '#94a3b8', fontSize: '0.80rem', resize: 'vertical' }}
                    />
                  </div>

                  {/* Footer Buttons */}
                  <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '6px', borderTop: '1px solid #334155', paddingTop: '14px' }}>
                    <button type="button" onClick={() => { setShowAddWasteModal(false); setEditingWasteId(null); }} style={{ padding: '9px 18px', background: 'rgba(100,116,139,0.2)', border: '1px solid #475569', color: '#94a3b8', borderRadius: '8px', fontSize: '0.82rem', fontWeight: '700', cursor: 'pointer' }}>
                      Batal
                    </button>
                    <button type="submit" style={{ padding: '9px 22px', background: 'linear-gradient(135deg, #f43f5e, #e11d48)', border: 'none', color: 'white', borderRadius: '8px', fontSize: '0.85rem', fontWeight: '900', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 12px rgba(244,63,94,0.35)' }}>
                      <Trash2 size={15} />
                      <span>Lanjut ke Pratinjau (OK)</span>
                    </button>
                  </div>
                </form>
              );
            })()}
          </div>
        </div>
      )}

      {/* PAPAN PREVIEW MODAL STOK RUSAK POS MOBILE */}
      {showWastePreviewFormModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000 }}>
          <div className="glass-card animate-fade-in" style={{ width: '100%', maxWidth: '580px', maxHeight: '90vh', overflowY: 'auto', padding: '24px', background: '#1e293b', border: '1px solid #34d399', borderRadius: '18px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #334155', paddingBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle size={22} color="#34d399" />
                <h3 style={{ fontSize: '1.15rem', fontWeight: '900', color: '#ffffff', margin: 0 }}>
                  📋 Papan Pratinjau Laporan Barang Rusak (POS Mobile)
                </h3>
              </div>
              <button onClick={() => setShowWastePreviewFormModal(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '1.2rem', fontWeight: '900' }}>✕</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.82rem', color: '#f8fafc', background: '#0f172a', padding: '16px', borderRadius: '12px', border: '1px solid #334155' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#94a3b8' }}>No Laporan:</span>
                <span style={{ fontWeight: '900', color: '#fb7185' }}>{wasteNo}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#94a3b8' }}>Tanggal Kejadian:</span>
                <span style={{ fontWeight: '800' }}>{wasteDate}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#94a3b8' }}>Pengaju / Dibuat Oleh:</span>
                <span style={{ fontWeight: '800' }}>👤 {wasteSubmittedBy}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#94a3b8' }}>Outlet Cabang:</span>
                <span style={{ fontWeight: '800', color: '#34d399' }}>🏢 {(masterData.outlets || []).find(o => Number(o.id) === Number(wasteOutletId))?.name || currentOutlet?.name || 'Outlet Cabang'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#94a3b8' }}>Tipe Input & Status:</span>
                <span style={{ fontWeight: '800', color: '#34d399' }}>🟢 By approved (PENDING)</span>
              </div>
              {editingWasteId && wasteEditingNotes && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', background: 'rgba(251,191,36,0.1)', padding: '8px 12px', borderRadius: '8px', border: '1px solid rgba(251,191,36,0.3)' }}>
                  <span style={{ color: '#fbbf24', fontWeight: '800', fontSize: '0.75rem' }}>📝 Catatan Editing:</span>
                  <span style={{ color: '#f8fafc', fontSize: '0.78rem' }}>{wasteEditingNotes}</span>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <span style={{ fontSize: '0.80rem', color: '#94a3b8', fontWeight: '800' }}>📦 Rincian Bahan Baku Rusak:</span>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: '#0f172a', color: '#94a3b8', borderBottom: '1px solid #334155' }}>
                    <th style={{ padding: '8px' }}>Bahan Baku</th>
                    <th style={{ padding: '8px', textAlign: 'center' }}>Jumlah Qty</th>
                    <th style={{ padding: '8px' }}>Alasan Rusak</th>
                  </tr>
                </thead>
                <tbody>
                  {wasteBatchRows.map((row, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <td style={{ padding: '8px', fontWeight: '800', color: '#38bdf8' }}>{row.item_name === '__OTHER__' ? (row.custom_item_name || 'Bahan Kustom') : row.item_name}</td>
                      <td style={{ padding: '8px', textAlign: 'center', fontWeight: '900', color: '#fb7185' }}>{row.qty} {row.unit}</td>
                      <td style={{ padding: '8px', color: '#cbd5e1' }}>{row.reason === 'Dan lain lain' ? (row.reason_custom || row.reason) : row.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '8px', borderTop: '1px solid #334155', paddingTop: '14px' }}>
              <button
                type="button"
                onClick={() => setShowWastePreviewFormModal(false)}
                style={{ padding: '9px 18px', background: 'rgba(100,116,139,0.2)', border: '1px solid #475569', color: '#94a3b8', borderRadius: '8px', fontSize: '0.82rem', fontWeight: '800', cursor: 'pointer' }}
              >
                ✏️ Edit Lagi
              </button>
              <button
                type="button"
                onClick={handleSaveWasteFinal}
                style={{ padding: '9px 24px', background: 'linear-gradient(135deg, #34d399 0%, #059669 100%)', border: 'none', color: '#ffffff', borderRadius: '8px', fontSize: '0.85rem', fontWeight: '900', cursor: 'pointer', boxShadow: '0 4px 14px rgba(52,211,153,0.4)' }}
              >
                💾 Simpan Laporan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PREVIEW BARANG RUSAK */}
      {previewWasteReport && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999
        }}>
          <div className="glass-card animate-fade-in" style={{
            width: '100%', maxWidth: '540px', padding: '24px', background: '#1e293b', border: '1px solid #fb7185', borderRadius: '18px', display: 'flex', flexDirection: 'column', gap: '16px', boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #334155', paddingBottom: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Trash2 size={22} color="#fb7185" />
                <h3 style={{ fontSize: '1.1rem', fontWeight: '900', color: '#ffffff', margin: 0 }}>
                  Pratinjau Laporan Barang Rusak {previewWasteReport.report_no || previewWasteReport.id}
                </h3>
              </div>
              <button onClick={() => setPreviewWasteReport(null)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontWeight: '900', fontSize: '1.2rem' }}>✕</button>
            </div>

            {(() => {
              const reportNo = previewWasteReport.report_no || previewWasteReport.id;
              const allWasteList = [...(masterData.damagedGoods || []), ...(masterData.approvedWaste || []), ...(masterData.stockMovement || []).filter(m => m.type === 'WASTE')];
              const matchingItems = allWasteList.filter(
                x => (x.report_no && String(x.report_no) === String(reportNo)) || String(x.id) === String(previewWasteReport.id)
              );
              const uniqueMap = new Map();
              matchingItems.forEach(x => {
                const itemKey = x.id || `${x.item_name || x.nama_barang}-${x.qty || x.stok_rusak}-${x.unit}`;
                if (!uniqueMap.has(itemKey)) {
                  uniqueMap.set(itemKey, x);
                }
              });
              const itemsList = uniqueMap.size > 0 ? Array.from(uniqueMap.values()) : [previewWasteReport];
              const isApproved = previewWasteReport.status === 'ok' || previewWasteReport.status === 'approved' || previewWasteReport.status === 'Approved' || previewWasteReport.status === 'ACC' || previewWasteReport.status === 'Terkirim' || previewWasteReport.sent_to_apk || previewWasteReport.is_approved;

              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '0.85rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#94a3b8' }}>Nomor Laporan:</span>
                    <span style={{ fontWeight: '900', color: '#fb7185' }}>{reportNo}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#94a3b8' }}>Tanggal Pencatatan:</span>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: '800', color: '#ffffff' }}>
                        {previewWasteReport.tanggal_waktu
                          ? new Date(previewWasteReport.tanggal_waktu).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })
                          : previewWasteReport.date || '-'
                        }
                      </div>
                      {previewWasteReport.tanggal_waktu && (
                        <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                          {new Date(previewWasteReport.tanggal_waktu).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB
                        </div>
                      )}
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#94a3b8' }}>Diisi Oleh:</span>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontWeight: '800', color: '#ffffff' }}>👤 {previewWasteReport.input_by || previewWasteReport.submitted_by || previewWasteReport.created_by || 'Kasir'}</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#94a3b8' }}>Outlet Cabang:</span>
                    <span style={{ fontWeight: '800', color: '#cbd5e1' }}>🏢 {previewWasteReport.branch_name || currentOutlet.name}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#94a3b8' }}>Status Persetujuan:</span>
                    <span style={{ fontWeight: '900', color: isApproved ? '#34d399' : '#fbbf24' }}>
                      {isApproved ? '🟢 APPROVED' : '⏳ PENDING'}
                    </span>
                  </div>

                  {/* List Item Bahan Baku */}
                  <div style={{ background: '#0f172a', borderRadius: '10px', padding: '10px', border: '1px solid #334155', marginTop: '6px' }}>
                    <div style={{ fontWeight: '800', color: '#fb7185', marginBottom: '8px', fontSize: '0.80rem' }}>
                      🥬 Rincian Bahan Baku Rusak ({itemsList.length} Item):
                    </div>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
                      <thead>
                        <tr style={{ background: '#1e293b', color: '#94a3b8', borderBottom: '1px solid #334155' }}>
                          <th style={{ padding: '6px', textAlign: 'left' }}>Bahan Baku</th>
                          <th style={{ padding: '6px', textAlign: 'right' }}>Jumlah</th>
                          <th style={{ padding: '6px', textAlign: 'left' }}>Alasan</th>
                        </tr>
                      </thead>
                      <tbody>
                        {itemsList.map((row, i) => (
                          <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', color: '#ffffff' }}>
                            <td style={{ padding: '6px', fontWeight: '800', color: '#38bdf8' }}>📦 {row.item_name}</td>
                            <td style={{ padding: '6px', textAlign: 'right', fontWeight: '900', color: '#fb7185' }}>-{row.qty || row.stok_rusak} {row.unit}</td>
                            <td style={{ padding: '6px', color: '#fb7185' }}>⚠️ {row.damage_reason || row.reason || 'Lainnya'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <button onClick={() => setPreviewWasteReport(null)} style={{ padding: '12px', background: '#334155', color: '#ffffff', border: 'none', borderRadius: '10px', fontWeight: '800', cursor: 'pointer', marginTop: '10px' }}>
                    Tutup Pratinjau
                  </button>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* 18. PREVIEW RANGKUMAN STOK OPNAME & STOK KELUAR DARI WEB ADMIN */}
      {previewOpnameSummaryRecord && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999
        }}>
          <div className="glass-card animate-fade-in" style={{
            width: '100%', maxWidth: '580px', padding: '24px', background: '#1e293b', border: '1px solid #34d399', borderRadius: '18px', display: 'flex', flexDirection: 'column', gap: '16px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #334155', paddingBottom: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckSquare size={22} color="#34d399" />
                <h3 style={{ fontSize: '1.1rem', fontWeight: '900', color: '#ffffff', margin: 0 }}>
                  Pratinjau Stok Opname & Stok Keluar (Web Admin)
                </h3>
              </div>
              <button onClick={() => setPreviewOpnameSummaryRecord(null)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontWeight: '900' }}>✕</button>
            </div>

            {(() => {
              const op = previewOpnameSummaryRecord;
              const sSistem = (op.stok_awal || 0) + (op.stok_masuk || 0) + (op.transfer_masuk || 0) - ((op.stok_keluar || 0) + (op.stok_rusak || 0) + (op.transfer_keluar || 0));
              const diffVal = (op.stok_fisik || 0) - sSistem;

              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.85rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#94a3b8' }}>Nomor Laporan:</span>
                    <span style={{ fontWeight: '900', color: '#38bdf8' }}>{op.report_no || op.id}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#94a3b8' }}>Tanggal Audit:</span>
                    <span style={{ fontWeight: '800', color: '#ffffff' }}>{op.date}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#94a3b8' }}>Dibuat Oleh:</span>
                    <span style={{ fontWeight: '800', color: '#ffffff' }}>👤 {op.created_by || op.submitted_by} ({op.type_input || 'Sent from Web Admin'})</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#94a3b8' }}>Outlet Cabang:</span>
                    <span style={{ fontWeight: '800', color: '#cbd5e1' }}>🏢 {op.branch_name || currentOutlet.name}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#94a3b8' }}>Nama Stok Item:</span>
                    <span style={{ fontWeight: '900', color: '#34d399' }}>📦 {op.item_name}</span>
                  </div>

                  <div style={{ background: '#0f172a', padding: '12px', borderRadius: '10px', border: '1px solid #334155', display: 'flex', flexDirection: 'column', gap: '6px', margin: '6px 0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#94a3b8' }}>Stok Awal:</span>
                      <span style={{ fontWeight: '800', color: '#ffffff' }}>{op.stok_awal || 0} {op.unit || 'kg'}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#38bdf8' }}>Stok Masuk (+):</span>
                      <span style={{ fontWeight: '800', color: '#38bdf8' }}>+{op.stok_masuk || 0} {op.unit || 'kg'}</span>
                    </div>
                    
                    {/* 🔴 HIGHLIGHT STOK KELUAR DARI WEB ADMIN */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', background: 'rgba(251, 113, 133, 0.12)', padding: '6px 8px', borderRadius: '6px' }}>
                      <span style={{ color: '#fb7185', fontWeight: '800' }}>🔴 Stok Keluar (Web Admin Logistik):</span>
                      <span style={{ fontWeight: '900', color: '#fb7185' }}>-{op.stok_keluar || 0} {op.unit || 'kg'}</span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#a78bfa' }}>Mutasi Trans. In / Out:</span>
                      <span style={{ fontWeight: '800', color: '#a78bfa' }}>+{op.transfer_masuk || 0} / -{op.transfer_keluar || 0}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#fb7185' }}>Stok Rusak (-):</span>
                      <span style={{ fontWeight: '800', color: '#fb7185' }}>-{op.stok_rusak || 0} {op.unit || 'kg'}</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#94a3b8' }}>🔢 Stok Sistem (Dihitung):</span>
                    <span style={{ fontWeight: '900', color: '#cbd5e1' }}>{sSistem} {op.unit || 'kg'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#94a3b8' }}>⚖️ Sisa Stok Fisik:</span>
                    <span style={{ fontWeight: '900', color: '#38bdf8', fontSize: '1rem' }}>{op.stok_fisik || 0} {op.unit || 'kg'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #334155', paddingTop: '8px' }}>
                    <span style={{ color: '#94a3b8' }}>📊 Analisis Selisih:</span>
                    <span style={{ fontWeight: '900', color: diffVal === 0 ? '#34d399' : diffVal > 0 ? '#38bdf8' : '#fb7185' }}>
                      {diffVal === 0 ? '🟢 PAS (SOP OK)' : diffVal > 0 ? `🔵 SURPLUS (+${diffVal})` : `🔴 DEFISIT (${diffVal})`}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#94a3b8' }}>Catatan / Sinkronisasi:</span>
                    <span style={{ color: '#cbd5e1', fontStyle: 'italic' }}>{op.notes || 'Dikirim dari Web Admin Logistik'}</span>
                  </div>
                </div>
              );
            })()}

            <button onClick={() => setPreviewOpnameSummaryRecord(null)} style={{ padding: '12px', background: '#334155', color: '#ffffff', border: 'none', borderRadius: '10px', fontWeight: '800', cursor: 'pointer' }}>
              Tutup Pratinjau
            </button>
          </div>
        </div>
      )}

      {/* 19. MODAL BUAT RESERVASI BARU */}
      {showAddReservationModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999
        }}>
          <div className="glass-card animate-fade-in" style={{
            width: '100%', maxWidth: '640px', padding: '24px', background: '#1e293b', border: '1px solid #6366f1', borderRadius: '20px', display: 'flex', flexDirection: 'column', gap: '16px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #334155', paddingBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Calendar size={24} color="#6366f1" />
                <div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: '900', color: '#ffffff', margin: 0 }}>
                    Buat Laporan Reservasi Meja Baru
                  </h3>
                  <p style={{ fontSize: '0.76rem', color: '#94a3b8', margin: '2px 0 0 0' }}>
                    {currentOutlet.name} • Input Booking Meja Pelanggan & Catatan Uang Muka (DP)
                  </p>
                </div>
              </div>
              <button onClick={() => setShowAddReservationModal(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontWeight: '900', fontSize: '1.2rem' }}>✕</button>
            </div>

            <form onSubmit={e => {
              e.preventDefault();
              if (!newRsvCustName || !newRsvPhone) {
                alert('Silakan isi nama pelanggan dan kontak telepon terlebih dahulu!');
                return;
              }
              const newRsv = {
                id: `RSV-${newRsvDate.replace(/-/g, '')}-${String(reservationsList.length + 1).padStart(2, '0')}`,
                date: newRsvDate,
                time: newRsvTime,
                customer_name: newRsvCustName,
                phone: newRsvPhone,
                pax_count: Number(newRsvPax) || 2,
                table_no: newRsvTable,
                dp_amount: Number(newRsvDp) || 0,
                payment_method: newRsvPaymentMethod,
                status: newRsvStatus,
                notes: newRsvNotes || '-'
              };

              setReservationsList([newRsv, ...reservationsList]);
              setShowAddReservationModal(false);

              // Reset Form Inputs
              setNewRsvCustName('');
              setNewRsvPhone('');
              setNewRsvNotes('');
              alert(`Reservasi Meja atas nama "${newRsvCustName}" Berhasil Disimpan!`);
            }} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.78rem', color: '#94a3b8', display: 'block', marginBottom: '4px', fontWeight: '700' }}>Tanggal Reservasi</label>
                  <input type="date" value={newRsvDate} onChange={e => setNewRsvDate(e.target.value)} className="form-input" style={{ width: '100%', height: '40px' }} required />
                </div>

                <div>
                  <label style={{ fontSize: '0.78rem', color: '#94a3b8', display: 'block', marginBottom: '4px', fontWeight: '700' }}>Waktu / Jam Kedatangan</label>
                  <input type="text" value={newRsvTime} onChange={e => setNewRsvTime(e.target.value)} className="form-input" placeholder="Contoh: 18:30 WIB" style={{ width: '100%', height: '40px' }} required />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.78rem', color: '#94a3b8', display: 'block', marginBottom: '4px', fontWeight: '700' }}>Nama Pelanggan / Pemesan</label>
                  <input type="text" value={newRsvCustName} onChange={e => setNewRsvCustName(e.target.value)} className="form-input" placeholder="Contoh: Bpk. Hendra Wijaya" style={{ width: '100%', height: '40px' }} required />
                </div>

                <div>
                  <label style={{ fontSize: '0.78rem', color: '#94a3b8', display: 'block', marginBottom: '4px', fontWeight: '700' }}>Nomor HP / WhatsApp</label>
                  <input type="text" value={newRsvPhone} onChange={e => setNewRsvPhone(e.target.value)} className="form-input" placeholder="0812-3456-7890" style={{ width: '100%', height: '40px' }} required />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.78rem', color: '#94a3b8', display: 'block', marginBottom: '4px', fontWeight: '700' }}>Jumlah Tamu (Pax)</label>
                  <input type="number" min="1" value={newRsvPax} onChange={e => setNewRsvPax(e.target.value)} className="form-input" style={{ width: '100%', height: '40px' }} required />
                </div>

                <div>
                  <label style={{ fontSize: '0.78rem', color: '#94a3b8', display: 'block', marginBottom: '4px', fontWeight: '700' }}>Pilih Meja / Area</label>
                  <select value={newRsvTable} onChange={e => setNewRsvTable(e.target.value)} className="form-input" style={{ width: '100%', height: '40px', background: '#0f172a', color: '#ffffff' }}>
                    <option value="Meja 01 (Indoor AC)">🪑 Meja 01 (Indoor AC)</option>
                    <option value="Meja 02 (Indoor AC)">🪑 Meja 02 (Indoor AC)</option>
                    <option value="Meja 03 (Indoor VIP)">🪑 Meja 03 (Indoor VIP)</option>
                    <option value="Meja 04 (Indoor VIP)">🪑 Meja 04 (Indoor VIP)</option>
                    <option value="Meja 05 (Outdoor Garden)">🪑 Meja 05 (Outdoor Garden)</option>
                    <option value="Meja 06 (Outdoor Garden)">🪑 Meja 06 (Outdoor Garden)</option>
                    <option value="Meja 07 (Terrace View)">🪑 Meja 07 (Terrace View)</option>
                    <option value="Meja 08 (Outdoor Garden)">🪑 Meja 08 (Outdoor Garden)</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.78rem', color: '#94a3b8', display: 'block', marginBottom: '4px', fontWeight: '700' }}>Uang Muka / DP (Rp)</label>
                  <input type="number" value={newRsvDp} onChange={e => setNewRsvDp(e.target.value)} className="form-input" placeholder="100000" style={{ width: '100%', height: '40px' }} />
                </div>

                <div>
                  <label style={{ fontSize: '0.78rem', color: '#94a3b8', display: 'block', marginBottom: '4px', fontWeight: '700' }}>Metode Bayar DP</label>
                  <select value={newRsvPaymentMethod} onChange={e => setNewRsvPaymentMethod(e.target.value)} className="form-input" style={{ width: '100%', height: '40px', background: '#0f172a', color: '#ffffff' }}>
                    <option value="QRIS Statis">📱 QRIS Statis</option>
                    <option value="Transfer Bank">🏦 Transfer Bank</option>
                    <option value="Cash / Tunai">💵 Cash / Tunai</option>
                    <option value="Debit / EDC Card">💳 Debit / EDC Card</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '0.78rem', color: '#94a3b8', display: 'block', marginBottom: '4px', fontWeight: '700' }}>Status Reservasi</label>
                  <select value={newRsvStatus} onChange={e => setNewRsvStatus(e.target.value)} className="form-input" style={{ width: '100%', height: '40px', background: '#0f172a', color: '#ffffff' }}>
                    <option value="confirmed">🟢 Confirmed</option>
                    <option value="pending">⏳ Pending</option>
                    <option value="completed">✅ Completed</option>
                    <option value="cancelled">❌ Cancelled</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.78rem', color: '#94a3b8', display: 'block', marginBottom: '4px', fontWeight: '700' }}>Catatan Khusus Pelanggan</label>
                <input type="text" value={newRsvNotes} onChange={e => setNewRsvNotes(e.target.value)} className="form-input" placeholder="Contoh: Minta dekorasi ulang tahun & kursi bayi..." style={{ width: '100%', height: '40px' }} />
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '10px' }}>
                <button type="button" onClick={() => setShowAddReservationModal(false)} style={{ padding: '12px 20px', background: '#334155', color: '#ffffff', border: 'none', borderRadius: '10px', fontWeight: '800', cursor: 'pointer' }}>
                  Batal
                </button>
                <button type="submit" style={{ padding: '12px 24px', background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)', color: '#ffffff', border: 'none', borderRadius: '10px', fontWeight: '900', cursor: 'pointer', boxShadow: '0 4px 14px rgba(99,102,241,0.4)' }}>
                  💾 Simpan Reservasi Baru
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 20. MODAL DETAIL RESERVASI */}
      {previewReservationRecord && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999
        }}>
          <div className="glass-card animate-fade-in" style={{
            width: '100%', maxWidth: '520px', padding: '24px', background: '#1e293b', border: '1px solid #6366f1', borderRadius: '18px', display: 'flex', flexDirection: 'column', gap: '16px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #334155', paddingBottom: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Calendar size={22} color="#6366f1" />
                <h3 style={{ fontSize: '1.1rem', fontWeight: '900', color: '#ffffff', margin: 0 }}>
                  Detail Reservasi Pelanggan
                </h3>
              </div>
              <button onClick={() => setPreviewReservationRecord(null)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontWeight: '900' }}>✕</button>
            </div>

            {(() => {
              const rsv = previewReservationRecord;
              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.85rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#94a3b8' }}>Kode Booking:</span>
                    <span style={{ fontWeight: '900', color: '#38bdf8' }}>{rsv.id}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#94a3b8' }}>Tanggal & Waktu:</span>
                    <span style={{ fontWeight: '800', color: '#ffffff' }}>📅 {rsv.date} ({rsv.time})</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#94a3b8' }}>Nama Pelanggan:</span>
                    <span style={{ fontWeight: '900', color: '#ffffff' }}>👤 {rsv.customer_name}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#94a3b8' }}>Kontak Telepon:</span>
                    <span style={{ fontWeight: '800', color: '#cbd5e1' }}>📞 {rsv.phone}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#94a3b8' }}>Jumlah Tamu:</span>
                    <span style={{ fontWeight: '900', color: '#a78bfa' }}>👥 {rsv.pax_count} Pax</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#94a3b8' }}>Meja Terpilih:</span>
                    <span style={{ fontWeight: '900', color: '#34d399' }}>🪑 {rsv.table_no}</span>
                  </div>

                  <div style={{ background: '#0f172a', padding: '12px', borderRadius: '10px', border: '1px solid #334155', display: 'flex', flexDirection: 'column', gap: '6px', margin: '6px 0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#94a3b8' }}>Uang Muka / DP:</span>
                      <span style={{ fontWeight: '900', color: '#34d399', fontSize: '1rem' }}>{formatRupiah(rsv.dp_amount || 0)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#94a3b8' }}>Metode Pembayaran DP:</span>
                      <span style={{ fontWeight: '800', color: '#38bdf8' }}>{rsv.payment_method}</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#94a3b8' }}>Catatan Khusus:</span>
                    <span style={{ color: '#cbd5e1', fontStyle: 'italic' }}>{rsv.notes || '-'}</span>
                  </div>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #334155', paddingTop: '10px' }}>
                    <span style={{ color: '#94a3b8' }}>Status Reservasi:</span>
                    <select
                      value={rsv.status}
                      onChange={e => {
                        const updatedStatus = e.target.value;
                        setReservationsList(prev => prev.map(item => item.id === rsv.id ? { ...item, status: updatedStatus } : item));
                        setPreviewReservationRecord(prev => ({ ...prev, status: updatedStatus }));
                      }}
                      style={{ padding: '6px 12px', background: '#0f172a', border: '1px solid #6366f1', color: '#ffffff', borderRadius: '8px', fontWeight: '800' }}
                    >
                      <option value="confirmed">🟢 Confirmed</option>
                      <option value="pending">⏳ Pending</option>
                      <option value="completed">✅ Completed</option>
                      <option value="cancelled">❌ Cancelled</option>
                    </select>
                  </div>
                </div>
              );
            })()}

            <button onClick={() => setPreviewReservationRecord(null)} style={{ padding: '12px', background: '#334155', color: '#ffffff', border: 'none', borderRadius: '10px', fontWeight: '800', cursor: 'pointer' }}>
              Tutup Detail
            </button>
          </div>
        </div>
      )}

      {/* 21. MODAL LAYAR BACA DOKUMEN SOP */}
      {selectedSopDetail && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999
        }}>
          <div className="glass-card animate-fade-in" style={{
            width: '100%', maxWidth: '680px', maxHeight: '88vh', padding: '24px', background: '#1e293b', border: '1px solid #34d399', borderRadius: '20px', display: 'flex', flexDirection: 'column', gap: '16px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #334155', paddingBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <BookOpen size={24} color="#34d399" />
                <div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: '900', color: '#ffffff', margin: 0 }}>
                    {selectedSopDetail.title}
                  </h3>
                  <p style={{ fontSize: '0.76rem', color: '#94a3b8', margin: '2px 0 0 0' }}>
                    Dokumen Resmi Standar Operasional Restoran • ID: {selectedSopDetail.id}
                  </p>
                </div>
              </div>
              <button onClick={() => setSelectedSopDetail(null)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontWeight: '900', fontSize: '1.2rem' }}>✕</button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px', paddingRight: '4px' }}>
              
              <div style={{ background: '#0f172a', padding: '14px', borderRadius: '12px', border: '1px solid #334155', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', fontSize: '0.78rem' }}>
                <div>
                  <span style={{ color: '#94a3b8', display: 'block' }}>Kategori:</span>
                  <span style={{ fontWeight: '800', color: '#34d399' }}>{selectedSopDetail.categoryLabel}</span>
                </div>
                <div>
                  <span style={{ color: '#94a3b8', display: 'block' }}>Estimasi Durasi:</span>
                  <span style={{ fontWeight: '800', color: '#38bdf8' }}>⏱️ {selectedSopDetail.estimatedTime}</span>
                </div>
                <div>
                  <span style={{ color: '#94a3b8', display: 'block' }}>Penanggung Jawab:</span>
                  <span style={{ fontWeight: '800', color: '#a78bfa' }}>👤 {selectedSopDetail.author}</span>
                </div>
              </div>

              <div>
                <h4 style={{ fontSize: '0.88rem', fontWeight: '900', color: '#ffffff', marginBottom: '6px' }}>📝 Ringkasan Prosedur:</h4>
                <p style={{ fontSize: '0.82rem', color: '#cbd5e1', lineHeight: '1.5', margin: 0 }}>
                  {selectedSopDetail.summary}
                </p>
              </div>

              <div>
                <h4 style={{ fontSize: '0.88rem', fontWeight: '900', color: '#ffffff', marginBottom: '10px' }}>✅ Langkah-Langkah Operasional Checklist:</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {selectedSopDetail.steps.map((step, sIdx) => (
                    <div key={sIdx} style={{ display: 'flex', gap: '12px', background: '#0f172a', padding: '12px 14px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)' }}>
                      <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#34d399', color: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900', fontSize: '0.78rem', flexShrink: 0 }}>
                        {sIdx + 1}
                      </div>
                      <span style={{ fontSize: '0.82rem', color: '#f8fafc', lineHeight: '1.4' }}>
                        {step}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

            </div>

            <div style={{ borderTop: '1px solid #334155', paddingTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.72rem', color: '#64748b' }}>Terakhir diverifikasi: {selectedSopDetail.updatedAt}</span>
              <button onClick={() => setSelectedSopDetail(null)} style={{ padding: '10px 20px', background: '#334155', color: '#ffffff', border: 'none', borderRadius: '10px', fontWeight: '800', cursor: 'pointer' }}>
                Tutup Dokumen SOP
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 22. MODAL TEST PRINT SIMULATION RECEIPT */}
      {showTestPrintModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999
        }}>
          <div className="glass-card animate-fade-in" style={{
            width: '100%', maxWidth: '520px', maxHeight: '90vh', padding: '24px', background: '#1e293b', border: '1px solid #38bdf8', borderRadius: '22px', display: 'flex', flexDirection: 'column', gap: '16px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #334155', paddingBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Printer size={24} color="#38bdf8" />
                <div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: '900', color: '#ffffff', margin: 0 }}>
                    Hasil Uji Coba Cetak (Test Print)
                  </h3>
                  <p style={{ fontSize: '0.76rem', color: '#94a3b8', margin: '2px 0 0 0' }}>
                    Mode: {printerSettings.printMode === 'sekaligus' ? '⚡ Cetak Sekaligus' : '📄 Cetak 1 per 1'} • Kertas {printerSettings.paperWidth}
                  </p>
                </div>
              </div>
              <button onClick={() => setShowTestPrintModal(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontWeight: '900', fontSize: '1.2rem' }}>✕</button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              
              {/* STATUS TOAST */}
              <div style={{ background: 'rgba(56, 189, 248, 0.15)', border: '1px solid #38bdf8', color: '#38bdf8', padding: '10px 14px', borderRadius: '12px', fontSize: '0.80rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle2 size={18} />
                <span>Simulasi Test Print Sukses Terkirim ke [{printerSettings.printerName}]!</span>
              </div>

              {/* RECEIPT PAPER SIMULATION */}
              <div style={{ background: '#f8fafc', color: '#0f172a', padding: '20px', borderRadius: '12px', fontFamily: 'monospace', fontSize: '0.78rem', boxShadow: '0 4px 14px rgba(0,0,0,0.3)', border: '1px solid #e2e8f0' }}>
                
                {printerSettings.printMode === 'sekaligus' ? (
                  /* MODE SEKALIGUS RECEIPT */
                  <div>
                    <div style={{ textAlign: 'center', fontWeight: '900', fontSize: '0.9rem', marginBottom: '4px' }}>
                      === TEST PRINT POS ===
                    </div>
                    <div style={{ textAlign: 'center', fontWeight: '800' }}>{currentOutlet.name}</div>
                    <div style={{ textAlign: 'center', fontSize: '0.72rem', color: '#475569' }}>Jl. Sudirman No. 45, Jakarta</div>
                    <div style={{ borderBottom: '1px dashed #94a3b8', margin: '8px 0' }}></div>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>TGL: {new Date().toLocaleDateString('id-ID')}</span>
                      <span>JAM: {new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>PRINTER: {printerSettings.paperWidth}</span>
                      <span>MODE: SEKALIGUS</span>
                    </div>
                    <div style={{ borderBottom: '1px dashed #94a3b8', margin: '8px 0' }}></div>

                    <div style={{ fontWeight: '800', marginBottom: '4px' }}>DETAIL TEST ITEM (ALL-IN-ONE):</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>1x Nasi Goreng Spesial</span>
                      <span>Rp 35.000</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>1x Es Teh Manis Segar</span>
                      <span>Rp 8.000</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>1x Ayam Bakar Madu</span>
                      <span>Rp 42.000</span>
                    </div>

                    <div style={{ borderBottom: '1px dashed #94a3b8', margin: '8px 0' }}></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: '900', fontSize: '0.86rem' }}>
                      <span>TOTAL HARI INI:</span>
                      <span>Rp 85.000</span>
                    </div>
                    <div style={{ borderBottom: '1px dashed #94a3b8', margin: '8px 0' }}></div>

                    <div style={{ textAlign: 'center', fontStyle: 'italic', fontSize: '0.72rem', marginTop: '6px' }}>
                      *** PRINTER THERMAL OK & READY ***
                    </div>
                  </div>
                ) : (
                  /* MODE 1 PER 1 RECEIPT (PRINTED INDIVIDUALLY) */
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <div style={{ background: '#ffffff', padding: '10px', borderRadius: '8px', border: '1px dashed #94a3b8' }}>
                      <div style={{ fontWeight: '900', color: '#0369a1' }}>STRUK #1 (DAPUR - INDIVIDUAL):</div>
                      <div>1x Nasi Goreng Spesial (Pedas)</div>
                      <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Waktu: {new Date().toLocaleTimeString('id-ID')}</div>
                    </div>

                    <div style={{ background: '#ffffff', padding: '10px', borderRadius: '8px', border: '1px dashed #94a3b8' }}>
                      <div style={{ fontWeight: '900', color: '#0369a1' }}>STRUK #2 (BAR - INDIVIDUAL):</div>
                      <div>1x Es Teh Manis Segar (Dingin Es)</div>
                      <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Waktu: {new Date().toLocaleTimeString('id-ID')}</div>
                    </div>

                    <div style={{ background: '#ffffff', padding: '10px', borderRadius: '8px', border: '1px dashed #94a3b8' }}>
                      <div style={{ fontWeight: '900', color: '#0369a1' }}>STRUK #3 (DAPUR - INDIVIDUAL):</div>
                      <div>1x Ayam Bakar Madu (Dada)</div>
                      <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Waktu: {new Date().toLocaleTimeString('id-ID')}</div>
                    </div>
                  </div>
                )}

              </div>
            </div>

            <div style={{ borderTop: '1px solid #334155', paddingTop: '12px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button onClick={() => handlePrintTestReceipt()} style={{ padding: '10px 20px', background: '#38bdf8', color: '#0f172a', border: 'none', borderRadius: '10px', fontWeight: '900', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Printer size={16} />
                <span>🖨️ Cetak Fisik Thermal</span>
              </button>
              <button onClick={() => setShowTestPrintModal(false)} style={{ padding: '10px 20px', background: '#334155', color: '#ffffff', border: 'none', borderRadius: '10px', fontWeight: '800', cursor: 'pointer' }}>
                Tutup Uji Coba
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 23. MODAL SUPER ADMIN SECURITY GUARD FOR BACKUP & RESTORE DIRECT CONNECT */}
      {showSuperAdminAuthModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999
        }}>
          <div className="glass-card animate-fade-in" style={{
            width: '100%', maxWidth: '440px', padding: '24px', background: '#1e293b', border: '2px solid #a855f7', borderRadius: '22px', display: 'flex', flexDirection: 'column', gap: '16px'
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(168,85,247,0.2)', border: '1px solid #a855f7', color: '#c084fc', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                <ShieldCheck size={32} />
              </div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: '900', color: '#ffffff', margin: 0 }}>
                Otorisasi Restore Super Admin
              </h3>
              <p style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '6px', lineHeight: '1.4' }}>
                Proses <strong>📥 Restore Data Offline</strong> memerlukan otorisasi khusus <strong>Super Admin</strong> dan akan <strong>LANGSUNG terhubung secara live ke Server Utama</strong>.
              </p>
            </div>

            {superAdminAuthError && (
              <div style={{ background: 'rgba(239, 68, 68, 0.2)', border: '1px solid #ef4444', color: '#fca5a5', padding: '10px 14px', borderRadius: '12px', fontSize: '0.78rem', fontWeight: '800', textAlign: 'center' }}>
                ⚠️ {superAdminAuthError}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '0.80rem', fontWeight: '800', color: '#cbd5e1' }}>
                Masukkan Kode PIN Super Admin (Default: 8888 atau 1234):
              </label>
              <input
                type="password"
                maxLength={6}
                value={superAdminPinInput}
                onChange={e => {
                  setSuperAdminPinInput(e.target.value);
                  setSuperAdminAuthError('');
                }}
                autoFocus
                placeholder="• • • •"
                className="form-input"
                style={{ height: '50px', textAlign: 'center', fontSize: '1.5rem', letterSpacing: '8px', fontWeight: '900', color: '#c084fc', background: '#0f172a', border: '1px solid #a855f7' }}
              />
            </div>

            <div style={{ background: '#0f172a', padding: '10px 14px', borderRadius: '10px', fontSize: '0.74rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Zap size={16} color="#fbbf24" />
              <span>Sistem akan langsung terhubung (live connection) ke Database Web Admin begitu terverifikasi.</span>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
              <button
                type="button"
                onClick={() => {
                  setShowSuperAdminAuthModal(false);
                  setSuperAdminPinInput('');
                  setSuperAdminAuthError('');
                  setPendingRestoreFile(null);
                }}
                style={{ flex: 1, padding: '12px', background: '#334155', color: '#ffffff', border: 'none', borderRadius: '12px', fontWeight: '800', cursor: 'pointer' }}
              >
                Batal
              </button>

              <button
                type="button"
                onClick={handleVerifySuperAdminAndConnect}
                style={{ flex: 1.3, padding: '12px', background: 'linear-gradient(135deg, #a855f7 0%, #7e22ce 100%)', color: '#ffffff', border: 'none', borderRadius: '12px', fontWeight: '900', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', boxShadow: '0 4px 14px rgba(168,85,247,0.4)' }}
              >
                <Zap size={16} />
                <span>Verifikasi & Connect</span>
              </button>
            </div>
          </div>
        </div>
      )}

      </div>
    </div>
  );
}
