import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { initialMasterData } from '../../data/initialMasterData';
import { scanPairedPrinters, printToBluetoothPrinter, buildReceiptText, buildShiftClosingReceiptText, testPrint as btTestPrint, _browserPrintFallback, checkPrinterLiveStatus, listenBluetoothStatusChange } from '../../utils/bluetoothPrinter';
import { idbSaveOfflineTx, idbGetAllOfflineTx, idbDeleteOfflineTx } from '../../utils/idbStorage';
import { generateDocNumber, getOutletCode } from '../../utils/docNumberGenerator';
import KitchenDisplayPage from '../admin/KitchenDisplayPage';
import { 
  ShoppingBag,
  ChefHat, 
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
  Wifi,
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
  Edit3,
  HelpCircle,
  Bluetooth,
  BluetoothConnected,
  BluetoothOff,
  Printer,
  PrinterIcon,
  Receipt,
  Download,
  Copy,
  Shuffle
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
  const getApiUrl = (pathStr) => `https://mris-api.barokahgroupindonesia.tech${pathStr}`;

  // 5 MAIN TABS: 'kasir' | 'riwayat' | 'keuangan' | 'logistik' | 'omzet'
  const [activeNavTab, setActiveNavTab] = useState('kasir');

  const outlets = masterData?.outlets || [];

  // MULTI-STEP LOGIN BOARD STATES (Dinamis Berdasarkan Data Pengaturan Web Admin)
  const [isAppLoggedIn, setIsAppLoggedIn] = useState(() => !!userSession);
  const [loginStep, setLoginStep] = useState(1); // 1 | 2 | 3
  const [selectedLoginCategory, setSelectedLoginCategory] = useState(null); // 'super_admin' | 'owner' | outlet object
  const [selectedUserAccount, setSelectedUserAccount] = useState(null); // account object selected in Step 2
  const [loginSelectedOutlet, setLoginSelectedOutlet] = useState(null); // outlet yang dipilih di form login
  const [loginUsernameInput, setLoginUsernameInput] = useState('');
  const [loginPasswordInput, setLoginPasswordInput] = useState('');
  const [loginErrorText, setLoginErrorText] = useState('');
  const [showLoginPasswordEye, setShowLoginPasswordEye] = useState(false);
  const [currentUserSession, setCurrentUserSession] = useState(() => ({
    name: userSession?.name || 'Kasir Barokah',
    role: userSession?.role || 'Kasir',
    outlet: userSession?.outlet || (outlets[0]?.name) || 'Ayam Bakar Surabaya Tebing Tinggi',
    username: userSession?.username || 'kasir'
  }));

  const userOutletName = currentUserSession?.outlet || userSession?.outlet || userSession?.branch_name || userSession?.outlet_name || '';
  const userOutletId = currentUserSession?.outlet_id || userSession?.outlet_id || '';

  const matchedOutlet = outlets.find(o => 
    (selectedBranch && selectedBranch !== 'ALL' && selectedBranch !== 'Semua Restoran (Konsolidasi)' && (o.id === selectedBranch || String(o.id) === String(selectedBranch) || o.name === selectedBranch)) ||
    (userOutletId && (String(o.id) === String(userOutletId))) ||
    (userOutletName && (o.name.toLowerCase().trim() === userOutletName.toLowerCase().trim() || o.name.toLowerCase().includes(userOutletName.toLowerCase()) || userOutletName.toLowerCase().includes(o.name.toLowerCase())))
  );

  const currentOutlet = matchedOutlet || outlets[0] || { id: outlets[0]?.id || 1, name: outlets[0]?.name || 'Ayam Bakar Surabaya Tebing Tinggi' };

  // Helper for extracting category name from product (Single Source of Truth: masterData.categories)
  const getProductCategoryName = (item) => {
    if (!item) return 'Umum';
    // 1. Primary: Lookup by category_id in masterData.categories
    if (item.category_id && masterData?.categories) {
      const catObj = masterData.categories.find(c => String(c.id) === String(item.category_id));
      if (catObj && (catObj.name || catObj.category_name)) {
        return (catObj.name || catObj.category_name).trim();
      }
    }
    // 2. Secondary: If category_id doesn't match, check if item's category/category_name matches any existing master category name
    if (masterData?.categories) {
      const rawName = (item.category_name || item.category || '').trim().toLowerCase();
      if (rawName) {
        const catObj = masterData.categories.find(c => (c.name || '').trim().toLowerCase() === rawName);
        if (catObj && (catObj.name || catObj.category_name)) {
          return (catObj.name || catObj.category_name).trim();
        }
      }
    }
    // 3. Fallback: string values directly on product item
    if (item.category_name && typeof item.category_name === 'string' && item.category_name.trim() !== '') return item.category_name.trim();
    if (item.category && typeof item.category === 'string' && item.category.trim() !== '') return item.category.trim();
    return 'Umum';
  };

  // Helper for computing effective price of a product for current outlet
  // Helper for computing effective price of a product for current outlet
  const getProductPriceForOutlet = (item, outletId) => {
    if (!item) return 0;
    const outId = outletId || currentOutlet?.id || 1;
    const outIdStr = String(outId);
    const outIdNum = Number(outId);

    // 1. Check branchVariantPrices or branch_variant_prices for outId
    const bVarPrices = item.branchVariantPrices || item.branch_variant_prices || {};
    const outBranchVars = bVarPrices[outId] || bVarPrices[outIdStr] || bVarPrices[outIdNum];
    if (outBranchVars && typeof outBranchVars === 'object' && Object.keys(outBranchVars).length > 0) {
      const varVals = Object.values(outBranchVars).map(v => Number(v)).filter(v => v > 0);
      if (varVals.length > 0) {
        return Math.min(...varVals);
      }
      // If branchVariantPrices explicitly configured for this outlet and all are <= 0:
      const explicitVals = Object.values(outBranchVars).map(v => Number(v)).filter(v => !isNaN(v));
      if (explicitVals.length > 0 && explicitVals.every(v => v <= 0)) {
        return 0;
      }
    }

    // 2. Check standardPrices, standard_prices, branch_prices, outlet_prices for outId
    const stdPrices = item.standardPrices || item.standard_prices || item.branch_prices || item.outlet_prices || {};
    let stdVal = stdPrices[outId] !== undefined ? stdPrices[outId] : (stdPrices[outIdStr] !== undefined ? stdPrices[outIdStr] : stdPrices[outIdNum]);
    if (stdVal === undefined) {
      for (const k of Object.keys(stdPrices)) {
        if (String(k) === outIdStr || Number(k) === outIdNum) {
          stdVal = stdPrices[k];
          break;
        }
      }
    }
    if (stdVal !== undefined) {
      return Number(stdVal) || 0;
    }

    // 3. Check priceCombinations for outId
    if (item.priceCombinations && item.priceCombinations.length > 0) {
      for (const combo of item.priceCombinations) {
        if (combo.outletPrices) {
          const cVal = combo.outletPrices[outId] !== undefined ? combo.outletPrices[outId] : (combo.outletPrices[outIdStr] !== undefined ? combo.outletPrices[outIdStr] : combo.outletPrices[outIdNum]);
          if (cVal !== undefined && Number(cVal) > 0) {
            return Number(cVal);
          }
        }
      }
    }

    // 4. Check variantPrices for outId
    if (item.variantPrices && typeof item.variantPrices === 'object') {
      const vVals = [];
      for (const vName in item.variantPrices) {
        const vMap = item.variantPrices[vName];
        if (vMap && typeof vMap === 'object') {
          const vVal = vMap[outId] !== undefined ? vMap[outId] : (vMap[outIdStr] !== undefined ? vMap[outIdStr] : vMap[outIdNum]);
          if (vVal !== undefined && Number(vVal) > 0) {
            vVals.push(Number(vVal));
          }
        } else if (vMap !== undefined && Number(vMap) > 0) {
          vVals.push(Number(vMap));
        }
      }
      if (vVals.length > 0) return Math.min(...vVals);
    }

    // 5. If product has base price
    if (Number(item.price || 0) > 0) {
      return Number(item.price);
    }

    return 0;
  };

  // Helper for computing effective price of a specific variant for current outlet
  const getVariantPrice = (item, vName, outletId) => {
    if (!item) return 0;
    const outId = outletId || currentOutlet?.id || 1;
    const outIdStr = String(outId);
    const outIdNum = Number(outId);

    // 1. Check branchVariantPrices / branch_variant_prices for this outlet & variant
    const bVarPrices = item.branchVariantPrices || item.branch_variant_prices || {};
    const outMap = bVarPrices[outId] || bVarPrices[outIdStr] || bVarPrices[outIdNum];
    if (outMap && typeof outMap === 'object' && outMap[vName] !== undefined) {
      return Number(outMap[vName]) || 0;
    }

    // 2. Check variantPrices
    const vPrices = item.variantPrices || {};
    if (vPrices[vName] !== undefined) {
      if (typeof vPrices[vName] === 'object') {
        const vVal = vPrices[vName][outId] !== undefined ? vPrices[vName][outId] : (vPrices[vName][outIdStr] !== undefined ? vPrices[vName][outIdStr] : vPrices[vName][outIdNum]);
        if (vVal !== undefined) return Number(vVal) || 0;
      } else {
        return Number(vPrices[vName]) || 0;
      }
    }

    // 3. Check standardPrices / standard_prices / branch_prices / outlet_prices for this outlet
    const stdPrices = item.standardPrices || item.standard_prices || item.branch_prices || item.outlet_prices || {};
    const stdVal = stdPrices[outId] !== undefined ? stdPrices[outId] : (stdPrices[outIdStr] !== undefined ? stdPrices[outIdStr] : stdPrices[outIdNum]);
    if (stdVal !== undefined) {
      return Number(stdVal) || 0;
    }

    // 4. Fallback to base price
    return Number(item.price || 0);
  };

  // Filter products for this outlet — strictly isolate by outlet
  const rawProducts = (masterData?.products || []);
  const currentOutletIdStr = String(currentOutlet?.id || '');
  const currentOutletNameStr = String(currentOutlet?.name || '').toLowerCase().trim();

  const products = rawProducts.filter(p => {
    if (!p || !p.id) return false;
    // 1. Skip if general status is Inaktif
    if (p.status === 'Inaktif' || p.status === 'Non-Aktif') return false;

    // 2. Outlet Isolation Check:
    const productOutletIdStr = String(p.outlet_id || '');
    const productOutletNameStr = String(p.outlet_name || p.branch_name || '').toLowerCase().trim();
    const selIds = (Array.isArray(p.selectedOutletIds) ? p.selectedOutletIds : (Array.isArray(p.selected_outlet_ids) ? p.selected_outlet_ids : [])).map(x => String(x));
    const hasExplicitOutlets = selIds.length > 0;
    const inSelOutlets = selIds.includes(currentOutletIdStr);

    const isDirectMatch = productOutletIdStr && (productOutletIdStr === currentOutletIdStr);
    const isNameMatch = productOutletNameStr && currentOutletNameStr && (
      productOutletNameStr === currentOutletNameStr ||
      productOutletNameStr.includes(currentOutletNameStr) ||
      currentOutletNameStr.includes(productOutletNameStr)
    );
    const isGlobal = !productOutletIdStr ||
      productOutletIdStr === 'Semua Outlet' ||
      productOutletIdStr === 'Semua Outlet (Central)' ||
      productOutletIdStr === 'ALL' ||
      productOutletIdStr === 'central' ||
      productOutletIdStr === '0';

    // Jika produk memiliki daftar outlet yang dicentang:
    if (hasExplicitOutlets) {
      if (!inSelOutlets && !isDirectMatch && !isNameMatch && !isGlobal) {
        return false;
      }
    } else if (!isGlobal && !isDirectMatch && !isNameMatch) {
      return false;
    }

    // 3. Khusus menu Surabaya Penyet (PRD-004 / PRD-007), strictly Surabaya only
    const pSku = String(p.sku || p.code || '').toUpperCase().trim();
    if (pSku === 'PRD-004' || pSku === 'PRD-007') {
      const isSurabayaOutlet = currentOutletIdStr === '1785307180576' || currentOutletNameStr.includes('surabaya');
      if (!isSurabayaOutlet) return false;
    }

    // 4. "Tampilkan di APK" status check per outlet
    const apkStatusMap = p.apkStatus || p.outletApkStatus || p.outlet_apk_status || {};
    const statusForThisOutlet = apkStatusMap[currentOutlet?.id] || apkStatusMap[currentOutletIdStr];
    if (statusForThisOutlet === 'Inaktif' || statusForThisOutlet === 'inaktif' || statusForThisOutlet === 'Hide' || statusForThisOutlet === 'Tidak Dijual') {
      return false;
    }

    // 5. Pastikan produk memiliki harga yang valid untuk outlet ini
    const effectivePrice = getProductPriceForOutlet(p, currentOutlet?.id);
    if (effectivePrice <= 0 && (!p.price || Number(p.price) <= 0)) return false;

    return true;
  });
  const menuList = products;
  const masterCategoryNames = (masterData?.categories || [])
    .filter(c => !c.status || c.status === 'Aktif')
    .map(c => c.name || c.category_name || c.title)
    .filter(Boolean);
  const productCategoryNames = menuList.map(item => getProductCategoryName(item)).filter(Boolean);
  const allCategoryNames = Array.from(new Set([...masterCategoryNames, ...productCategoryNames]));
  const categories = ['Semua', 'Sering Diorder', ...allCategoryNames];

  // POS State (Default 'Semua' agar seluruh produk baru dari Web Admin langsung terlihat)
  const [activeCategory, setActiveCategory] = useState('Semua');
  // POS Theme State (Default 'calm_sage' - Fresh & Mint)
  const [appTheme, setAppTheme] = useState(() => localStorage.getItem('mris_pos_theme') || 'calm_sage');

  const toggleAppTheme = (newTheme) => {
    let selected = newTheme;
    if (!selected) {
      selected = appTheme === 'calm_sage' ? 'dark' : 'calm_sage';
    }
    setAppTheme(selected);
    localStorage.setItem('mris_pos_theme', selected);
  };

  const isCalmSage = appTheme === 'calm_sage';
  const isLight = isCalmSage;

  // ===== THEME TOKEN OBJECT =====
  // Gunakan T.xxx untuk warna di semua komponen POS agar adaptif dengan tema Calm Sage dan Deep Dark
  const T = React.useMemo(() => {
    if (isCalmSage) {
      return {
        bgApp:          '#f3f7f4',
        bgSidebar:      '#152e22',
        bgSidebarActive: 'linear-gradient(135deg, #2d7a5b 0%, #1b533c 100%)',
        bgSidebarHover: 'rgba(255,255,255,0.10)',
        bgSurface:      '#ffffff',
        bgCard:         '#ffffff',
        bgCardHover:    '#eaf2ec',
        bgInput:        '#ffffff',
        bgHeader:       '#ffffff',
        bgModal:        '#ffffff',
        bgOverlay:      'rgba(21,46,34,0.60)',
        bgBadgeUser:    'rgba(45,122,91,0.12)',
        txtPrimary:     '#152e22',
        txtSecondary:   '#28533f',
        txtMuted:       '#587c6b',
        txtSidebarIcon: '#10b981',
        txtHeaderAccent: '#2d7a5b',
        border:         '#c8ded1',
        borderCard:     '#c8ded1',
        borderSubtle:   '#9ec4ad',
        borderSidebar:  'rgba(255,255,255,0.12)',
        primary:        '#2d7a5b',
        primaryBtn:     'linear-gradient(135deg, #2d7a5b 0%, #1b533c 100%)',
        shadow:         '0 1px 6px rgba(21,46,34,0.08)',
        shadowCard:     '0 4px 16px rgba(21,46,34,0.08)',
        scrollTrack:    '#eaf2ec',
      };
    }

    // Default Deep Dark Mode
    return {
      bgApp:          '#0b0f19',
      bgSidebar:      '#080d1a',
      bgSidebarActive: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
      bgSidebarHover: 'rgba(255,255,255,0.07)',
      bgSurface:      '#111625',
      bgCard:         '#131b2e',
      bgCardHover:    '#1a243b',
      bgInput:        '#1a243b',
      bgHeader:       '#0c1b33',
      bgModal:        '#131b2e',
      bgOverlay:      'rgba(0,0,0,0.75)',
      bgBadgeUser:    'rgba(255,255,255,0.1)',
      txtPrimary:     '#ffffff',
      txtSecondary:   '#e2e8f0',
      txtMuted:       '#cbd5e1',
      txtSidebarIcon: '#fbbf24',
      txtHeaderAccent: '#60a5fa',
      border:         'rgba(255,255,255,0.15)',
      borderCard:     'rgba(255,255,255,0.15)',
      borderSubtle:   '#475569',
      borderSidebar:  'rgba(255,255,255,0.08)',
      primary:        '#3b82f6',
      primaryBtn:     'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
      shadow:         'none',
      shadowCard:     '0 4px 24px rgba(0,0,0,0.4)',
      scrollTrack:    '#1e293b',
    };
  }, [isCalmSage]);

  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState(() => {
    try {
      const saved = localStorage.getItem('MRIS_POS_ACTIVE_CART');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  // Auto-persist cart changes to localStorage (Persistent Draft Cart)
  useEffect(() => {
    try {
      if (Array.isArray(cart) && cart.length > 0) {
        localStorage.setItem('MRIS_POS_ACTIVE_CART', JSON.stringify(cart));
      } else {
        localStorage.removeItem('MRIS_POS_ACTIVE_CART');
      }
    } catch (e) {}
  }, [cart]);

  const [orderType, setOrderType] = useState('Dine In'); // 'Dine In' | 'Take Away'
  const [selectedCustomer, setSelectedCustomer] = useState('Pelanggan Umum');
  const [lastCompletedTx, setLastCompletedTx] = useState(null);
  const [activeSuggestRowId, setActiveSuggestRowId] = useState(null);

  // ── BLUETOOTH PRINTER STATE ──
  // MAC address & paper width disimpan di localStorage agar tetap tersimpan setelah reload
  const [printerMac, setPrinterMac] = useState(() => localStorage.getItem('MRIS_PRINTER_MAC') || '');
  const [printerPaperWidth, setPrinterPaperWidth] = useState(() => localStorage.getItem('MRIS_PRINTER_PAPER') || '58');
  const [pairedDevices, setPairedDevices] = useState([]); // Hasil scan bonded devices Android
  const [isScanningPaired, setIsScanningPaired] = useState(false);
  const [printStatus, setPrintStatus] = useState(null); // null | 'printing' | 'success' | 'error'
  const [printStatusMsg, setPrintStatusMsg] = useState('');
  const [printerOfflineModal, setPrinterOfflineModal] = useState({ open: false, errorMsg: '', onFallback: null });
  const [liveDeviceMap, setLiveDeviceMap] = useState({});
  const [checkingMacMap, setCheckingMacMap] = useState({});
  // Scan bonded Bluetooth devices dari Pengaturan Android + preset fallback BT_THERMAL_AUTO
  // RESTORED dari commit f394276 (3 Agustus 2026) — versi yang berhasil mendeteksi RPP02N
  const handleScanPairedPrinters = useCallback(async () => {
    setIsScanningPaired(true);
    setPrintStatusMsg('Sedang memindai printer Bluetooth & thermal...');

    // Delay 400ms untuk efek memindai yang responsif
    await new Promise(r => setTimeout(r, 400));

    try {
      let devices = [];
      if (window.Capacitor?.isNativePlatform?.()) {
        try {
          devices = await scanPairedPrinters();
        } catch (e) {
          console.warn('[BTScan] Native scan failed:', e);
        }
      }

      // Preset fallback devices agar printer selalu 100% dapat dipilih kasir
      const presetPrinters = [
        { name: 'Printer Thermal Bluetooth Kasir (Auto-Detect)', address: 'BT_THERMAL_AUTO', type: 'bluetooth' },
        { name: 'System PDF & Cetak Layar', address: 'SYSTEM_PDF_PRINT', type: 'system' }
      ];

      if (devices && devices.length > 0) {
        setPrintStatusMsg(`Ditemukan ${devices.length} perangkat Bluetooth paired.`);
        setPairedDevices([
          ...devices,
          ...presetPrinters
        ]);
      } else {
        setPrintStatusMsg('Pemindaian selesai. Jika printer belum muncul di atas, silakan pilih "Auto-Detect" atau masukkan Alamat MAC Manual di bawah.');
        setPairedDevices(presetPrinters);
      }
    } catch (err) {
      setPrintStatusMsg('Gagal membaca printer Bluetooth: ' + (err.message || 'Pastikan Bluetooth aktif'));
      setPairedDevices([
        { name: 'Printer Thermal Bluetooth Kasir (Auto-Detect)', address: 'BT_THERMAL_AUTO', type: 'bluetooth' },
        { name: 'System PDF & Cetak Layar', address: 'SYSTEM_PDF_PRINT', type: 'system' }
      ]);
    } finally {
      setIsScanningPaired(false);
    }
  }, []);

  // Simpan konfigurasi printer ke localStorage
  const handleSavePrinterConfig = useCallback((mac, paperWidth) => {
    const cleanMac = (mac || '').trim().toUpperCase();
    const cleanWidth = paperWidth === '80' ? '80' : '58';
    setPrinterMac(cleanMac);
    setPrinterPaperWidth(cleanWidth);
    try {
      localStorage.setItem('MRIS_PRINTER_MAC', cleanMac);
      localStorage.setItem('MRIS_PRINTER_PAPER', cleanWidth);
    } catch (e) {}
    setSaveSettingsSuccessToast(true);
    setTimeout(() => setSaveSettingsSuccessToast(false), 3000);
    // Reset live status map untuk mac baru
    if (cleanMac) {
      setLiveDeviceMap(prev => ({ ...prev, [cleanMac]: undefined }));
    }
  }, []);

  // Helper: tampilkan status print toast sementara
  // status: null | 'printing' | 'success' | 'success_pdf' | 'error'
  //   'success'     = Hijau  — hardware printer berhasil cetak
  //   'success_pdf' = Kuning — tidak ada printer, fallback ke PDF
  //   'error'       = Merah  — gagal cetak, printer tidak merespon
  const showPrintStatus = useCallback((status, msg) => {
    setPrintStatus(status);
    setPrintStatusMsg(msg);
    const autoHideStatuses = ['success', 'success_pdf', 'error'];
    if (autoHideStatuses.includes(status)) {
      setTimeout(() => {
        setPrintStatus(null);
        setPrintStatusMsg('');
      }, 5000);
    }
  }, []);

  const handleCheckLiveStatus = useCallback(async (mac) => {
    if (!mac || mac === 'SYSTEM_PDF_PRINT') return;
    setCheckingMacMap(prev => ({ ...prev, [mac]: true }));
    // Gunakan 'printing' bukan 'info' (status code valid)
    showPrintStatus('printing', 'Memeriksa koneksi printer...');

    try {
      const res = await checkPrinterLiveStatus(mac);
      setLiveDeviceMap(prev => ({ ...prev, [mac]: res.isLive }));
      if (res.isLive) {
        showPrintStatus('success', `Printer terhubung & siap cetak!`);
      } else {
        showPrintStatus('error', `Printer tidak merespon. ${res.reason ? '(' + res.reason + ')' : 'Cek: saklar printer ON, Bluetooth HP aktif, printer sudah di-pair.'}`);
      }
    } catch (err) {
      setLiveDeviceMap(prev => ({ ...prev, [mac]: false }));
      showPrintStatus('error', `Gagal cek koneksi: ${err?.message || 'Pastikan Bluetooth aktif dan printer dinyalakan.'}`);
    } finally {
      setCheckingMacMap(prev => ({ ...prev, [mac]: false }));
    }
  }, [showPrintStatus]);

  useEffect(() => {
    const sub = listenBluetoothStatusChange((data) => {
      if (data && data.address) {
        const isConn = !!data.isConnected;
        setLiveDeviceMap(prev => ({
          ...prev,
          [data.address]: isConn
        }));

        if (data.address === printerMac) {
          if (isConn) {
            showPrintStatus('success', `SAKLAR PRINTER MENYALA! Printer ${data.name || printerMac} terhubung.`);
          } else {
            showPrintStatus('error', `PERINGATAN: Saklar Printer ${data.name || printerMac} TERDETEKSI MATI / TERPUTUS!`);
          }
        }
      }
    });

    return () => {
      if (sub && typeof sub.remove === 'function') {
        sub.remove();
      }
    };
  }, [printerMac, showPrintStatus]);

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
  const [testPrintSuccessToast, setTestPrintSuccessToast] = useState(false);
  const [showTestPrintModal, setShowTestPrintModal] = useState(false);
  const [selectedTxDetail, setSelectedTxDetail] = useState(null); // Detail transaksi di riwayat

  // Derived printerSettings object — menggabungkan state printer agar kode lama tetap berjalan
  // Ini bukan state terpisah, melainkan referensi langsung ke state yang ada
  const printerSettings = {
    printKitchen: activeReceiptSelections.printKitchen,
    printBar: activeReceiptSelections.printBar,
    printTableCopy: activeReceiptSelections.printTableCopy,
    printCashierCopy: activeReceiptSelections.printCashierCopy,
    autoShowReceiptChoiceOnSaveOrder: false, // Langsung cetak otomatis tanpa modal pilih
    printerName: printerMac || 'Belum dikonfigurasi',
    paperWidth: `${printerPaperWidth}mm`,
    printMode: 'sekaligus'
  };

  // Right Panel Sub Tabs ('ORDER' | 'TABLE' | 'MORE')
  const [rightPanelSubTab, setRightPanelSubTab] = useState('ORDER');
  const [guestCount, setGuestCount] = useState(1);

  // Online & SSE Network State
  const [isOnline, setIsOnline] = useState(() => typeof navigator !== 'undefined' ? navigator.onLine : true);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const playTapAudio = useCallback(() => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, ctx.currentTime);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.04);
    } catch (e) {}
  }, []);

  const playSuccessKaching = useCallback(() => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(523.25, ctx.currentTime);
      osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.08);
      osc.frequency.setValueAtTime(783.99, ctx.currentTime + 0.16);
      osc.frequency.setValueAtTime(1046.50, ctx.currentTime + 0.24);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.45);
    } catch (e) {}
  }, []);

  // Dedicated Pembayaran Modal Screen State (Matching User's Screenshot)
  const [showPaymentScreenModal, setShowPaymentScreenModal] = useState(false);
  const [occupiedTableNotice, setOccupiedTableNotice] = useState(null); // { table, pendingOrder }
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('Cash');
  // Tanggal transaksi custom — hanya superadmin yang bisa override (default: hari ini)
  const [customTxDate, setCustomTxDate] = useState(() => new Date().toLocaleDateString('en-CA'));
  const [tenderedCash, setTenderedCash] = useState('');
  const [onlineOrderId, setOnlineOrderId] = useState('');

  // Diskon Modal & Mode State (% atau Nominal)
  const [showCartCostBreakdown, setShowCartCostBreakdown] = useState(false); // Collapsible Subtotal/Diskon/Service/Tax/Adj
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

  // More Sub-Tab Options Modals: Move Table, Split Bill, Merge Bill, Tukar Poin, Kupon
  const [showMoveTableModal, setShowMoveTableModal] = useState(false);
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
  const [omzetFilterMode, setOmzetFilterMode] = useState('today'); // 'today' | 'yesterday' | 'custom'
  const [omzetCustomStartDate, setOmzetCustomStartDate] = useState(() => new Date().toLocaleDateString('en-CA'));
  const [omzetCustomEndDate, setOmzetCustomEndDate] = useState(() => new Date().toLocaleDateString('en-CA'));

  // Filter Riwayat Transaksi
  const [riwayatFilterMode, setRiwayatFilterMode]   = useState('today'); // 'today' | 'yesterday' | 'custom'
  const [riwayatCustomStart, setRiwayatCustomStart] = useState(() => new Date().toLocaleDateString('en-CA'));
  const [riwayatCustomEnd,   setRiwayatCustomEnd]   = useState(() => new Date().toLocaleDateString('en-CA'));

  // Filter Laporan Logistik (Stok Opname)
  const [logistikFilterMode,  setLogistikFilterMode]  = useState('today');
  const [logistikCustomStart, setLogistikCustomStart] = useState(() => new Date().toLocaleDateString('en-CA'));
  const [logistikCustomEnd,   setLogistikCustomEnd]   = useState(() => new Date().toLocaleDateString('en-CA'));

  // Filter Laporan Barang Rusak (Waste)
  const [wasteFilterMode,  setWasteFilterMode]  = useState('today');
  const [wasteCustomStart, setWasteCustomStart] = useState(() => new Date().toLocaleDateString('en-CA'));
  const [wasteCustomEnd,   setWasteCustomEnd]   = useState(() => new Date().toLocaleDateString('en-CA'));

  // Filter Laporan Stok Transfer
  const [transferFilterMode,  setTransferFilterMode]  = useState('today');
  const [transferCustomStart, setTransferCustomStart] = useState(() => new Date().toLocaleDateString('en-CA'));
  const [transferCustomEnd,   setTransferCustomEnd]   = useState(() => new Date().toLocaleDateString('en-CA'));

  const [showAddManualReportModal, setShowAddManualReportModal] = useState(false);
  const [previewManualReport, setPreviewManualReport] = useState(null);

  // Daily Report WhatsApp & Download States
  const [showDailyReportWhatsAppModal, setShowDailyReportWhatsAppModal] = useState(false);
  const [whatsAppReportData, setWhatsAppReportData] = useState(null);
  const [targetWhatsAppPhone, setTargetWhatsAppPhone] = useState('');
  const [customWhatsAppPhone, setCustomWhatsAppPhone] = useState('');
  const [isCopiedWhatsApp, setIsCopiedWhatsApp] = useState(false);
  
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
  const [manualRepSalesDiscount, setManualRepSalesDiscount] = useState(0);
  const [manualModalSaatIni, setManualModalSaatIni] = useState(0);
  const [manualModalSeharusnya, setManualModalSeharusnya] = useState(0);
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

      saveToServerWithGuard(newMaster);

      return newMaster;
    });
  };

  // Stok Opname Summary Preview State (Data sent from Web Admin)
  const [previewOpnameSummaryRecord, setPreviewOpnameSummaryRecord] = useState(null);

  // Settings Page Sub-Tab & Preferences States (Matching User Screenshot 100%)
  const [settingSubTab, setSettingSubTab] = useState('umum'); // 'umum' | 'printer' | 'sistem' | 'akun' | 'scanner' | 'dual_display'

  // AUTO-SCAN: Saat user buka tab printer, scan otomatis agar list selalu fresh
  useEffect(() => {
    if (settingSubTab === 'printer') {
      handleScanPairedPrinters();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settingSubTab]);

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

  // Offline Network State & Queue Counter
  const [isNetworkOnline, setIsNetworkOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [offlineQueueCount, setOfflineQueueCount] = useState(() => {
    try {
      const q = localStorage.getItem('MRIS_POS_OFFLINE_TX_QUEUE');
      return q ? (JSON.parse(q).length || 0) : 0;
    } catch (e) { return 0; }
  });

  const checkOfflineQueueCount = useCallback(() => {
    try {
      const q = localStorage.getItem('MRIS_POS_OFFLINE_TX_QUEUE');
      setOfflineQueueCount(q ? (JSON.parse(q).length || 0) : 0);
    } catch (e) { setOfflineQueueCount(0); }
  }, []);

  // 1. Pembersihan total cache lokal stale agar data terhapus di database tidak kembali lagi
  React.useEffect(() => {
    try {
      localStorage.removeItem('MRIS_POS_MASTER_DATA_CACHE');
    } catch (e) {}
    checkOfflineQueueCount();
  }, [checkOfflineQueueCount]);




  // ─── SAVE GUARD ──────────────────────────────────────────────────────────────
  // Mencegah auto-sync 3 detik menimpa data yang baru disimpan sebelum
  // server sempat menerima POST. isSavingRef = true selama POST berlangsung.
  const isSavingRef = React.useRef(false);

  // Array key laporan lokal POS Kasir (Di-isolasi dari Web Admin per permintaan user)
  const LAPORAN_ARRAY_KEYS = [
    'manualEntryRecords', 'approvedFinanceDaily',
    'stockOpname', 'approvedLogistics',
    'stockTransfer', 'approvedTransfers',
    'stockMovement', 'damagedGoods', 'approvedWaste',
  ];

  // Helper terpusat: POST newMaster ke server dengan guard aktif
  const saveToServerWithGuard = React.useCallback((newMaster) => {
    isSavingRef.current = true;
    // Backup laporan ke localStorage sebagai fallback lokal
    try {
      const backup = {};
      LAPORAN_ARRAY_KEYS.forEach(k => { if (newMaster[k]) backup[k] = newMaster[k]; });
      localStorage.setItem('MRIS_POS_LAPORAN_BACKUP', JSON.stringify(backup));
    } catch (e) {}

    return fetch(getApiUrl('/api/master-data'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newMaster)
    })
      .catch(() => {})
      .finally(() => {
        // Beri jeda 8 detik setelah POST selesai sebelum sync otomatis dibolehkan lagi
        setTimeout(() => { isSavingRef.current = false; }, 8000);
      });
  }, []);  // eslint-disable-line react-hooks/exhaustive-deps

  // 2. Offline Queue Flusher — Sequential Atomic Processing ke /api/pos/transaction
  const doFlushOfflineQueue = React.useCallback(async () => {
    if (isSavingRef.current) return;
    try {
      const queueRaw = localStorage.getItem('MRIS_POS_OFFLINE_TX_QUEUE');
      const queue = queueRaw ? JSON.parse(queueRaw) : [];
      if (!queue || queue.length === 0) {
        setOfflineQueueCount(0);
        return;
      }
      setOfflineQueueCount(queue.length);

      // Kirim item satu per satu secara berurutan (Sequential Atomic Flush)
      for (const tx of queue) {
        if (!tx) continue;
        try {
          const res = await fetch(getApiUrl('/api/pos/transaction'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...tx, status: 'approved', is_offline_pending: false })
          });
          const resData = await res.json();
          if (resData && (resData.success || resData.status === 'success')) {
            const curQRaw = localStorage.getItem('MRIS_POS_OFFLINE_TX_QUEUE');
            const curQ = curQRaw ? JSON.parse(curQRaw) : [];
            const remaining = curQ.filter(item => String(item.id || item.receipt_no || '') !== String(tx.id || tx.receipt_no || ''));
            localStorage.setItem('MRIS_POS_OFFLINE_TX_QUEUE', JSON.stringify(remaining));
            setOfflineQueueCount(remaining.length);
          } else {
            // Jika response server bukan sukses, hentikan siklus flush agar tidak loop
            break;
          }
        } catch (fetchErr) {
          // Jika koneksi kembali offline di tengah jalan, hentikan loop dan simpan sisa antrean
          break;
        }
      }
    } catch (err) {}
  }, []);

  // 2. Realtime Network & Offline Queue Auto-Flusher Effect
  React.useEffect(() => {
    const handleOnline = () => {
      setIsNetworkOnline(true);
      doFlushOfflineQueue();
    };
    const handleOffline = () => {
      setIsNetworkOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const updateSyncTimestamp = () => {
      const now = new Date();
      const formatted = `${now.getDate()} ${now.toLocaleString('id-ID', { month: 'long' })} ${now.getFullYear()}, ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}:${String(now.getSeconds()).padStart(2,'0')} WIB`;
      setLastSyncTime(formatted);
    };

    // Initial sync timestamp update & queue flush
    updateSyncTimestamp();
    doFlushOfflineQueue();

    // Periodic queue flush & sync timestamp update
    const timer = setInterval(() => {
      updateSyncTimestamp();
      if (navigator.onLine) doFlushOfflineQueue();
    }, 15000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(timer);
    };
  }, [isAppLoggedIn, doFlushOfflineQueue]);

  // LIVE AUTO-FETCH MASTER DATA / USER ACCOUNTS ON LOGIN SCREEN
  useEffect(() => {
    const syncUsersFromServer = () => {
      // ─── GUARD: Jangan sync saat sedang ada POST yang belum selesai ───────────
      if (isSavingRef.current) return;

      fetch(getApiUrl('/api/master-data'), { cache: 'no-store' })
        .then(res => res.ok ? res.json() : null)
        .then(serverMaster => {
          if (!serverMaster || typeof serverMaster !== 'object') return;
          // Double-check guard setelah fetch selesai (async delay)
          if (isSavingRef.current) return;


          setMasterData(prev => {
            const deletedUserIdsSet = new Set([
              ...(prev.deletedUserIds || []),
              ...(serverMaster.deletedUserIds || [])
            ].map(x => String(x)));

            const deletedUsernamesSet = new Set([
              ...(prev.deletedUsernames || []),
              ...(serverMaster.deletedUsernames || [])
            ].map(x => String(x).toLowerCase().trim()));

            const dedupeUsers = (list = []) => {
              const map = new Map();
              (list || []).forEach(u => {
                if (!u || u.id == null) return;
                const uIdStr = String(u.id);
                const uNameKey = String(u.username || u.name || '').toLowerCase().trim();
                if (deletedUserIdsSet.has(uIdStr) || (uNameKey && deletedUsernamesSet.has(uNameKey))) {
                  return;
                }
                if (uNameKey) map.set(uNameKey, u);
              });
              return Array.from(map.values());
            };

            const mergedWeb = dedupeUsers(serverMaster.webAdminAccounts || prev.webAdminAccounts || initialMasterData.webAdminAccounts);
            const mergedMobile = dedupeUsers(serverMaster.mobileAccounts || prev.mobileAccounts || initialMasterData.mobileAccounts);

            const mergedPerm = (Array.isArray(serverMaster.permissionMatrix) && serverMaster.permissionMatrix.length > 0)
              ? serverMaster.permissionMatrix
              : (prev.permissionMatrix || initialMasterData.permissionMatrix);
            const mergedMobPerm = (Array.isArray(serverMaster.mobilePermissionMatrix) && serverMaster.mobilePermissionMatrix.length > 0)
              ? serverMaster.mobilePermissionMatrix
              : (prev.mobilePermissionMatrix || initialMasterData.mobilePermissionMatrix);

            // ─── UNIVERSAL SMART MERGE DENGAN SERVER WEB ADMIN ────────────────────
            const getItemKey = (item) => {
              if (!item || typeof item !== 'object') return null;
              if (item.report_no && String(item.report_no).trim() !== '') return String(item.report_no);
              if (item.receiptNo && String(item.receiptNo).trim() !== '') return String(item.receiptNo);
              if (item.tx_id && String(item.tx_id).trim() !== '') return String(item.tx_id);
              if (item.id !== undefined && item.id !== null && String(item.id).trim() !== '') return String(item.id);
              if (item.code && String(item.code).trim() !== '') return String(item.code);
              if (item.name && String(item.name).trim() !== '') return String(item.name);
              return null;
            };

            const LOGISTICS_ARRAY_KEYS = new Set([
              'stockOpname', 'approvedLogistics', 'approvedOpname',
              'stockTransfer', 'approvedTransfers', 'damagedGoods',
              'approvedWaste', 'stockMovement', 'stockIn', 'purchases',
              'approvedFinanceDaily', 'shiftClosings', 'shift_closings',
              'closedShifts', 'dailyReports', 'manualEntryRecords'
            ]);

            const MASTER_DATA_KEYS = new Set([
              'products', 'menuItems', 'categories', 'ingredients', 'outlets', 'paymentMethods', 'expenseMaster'
            ]);

            const smartMergeArray = (localArr, serverArr, keyName = '') => {
              const sArr = Array.isArray(serverArr) ? serverArr : [];
              const lArr = Array.isArray(localArr) ? localArr : [];

              // Master Data (Produk, Kategori, Bahan, Outlet) dikelola di Web Admin — data server adalah otoritatif!
              if (MASTER_DATA_KEYS.has(keyName) && sArr.length > 0) {
                return sArr;
              }

              if (sArr.length === 0 && lArr.length === 0) return [];
              if (sArr.length === 0) return lArr;
              if (lArr.length === 0) return sArr;

              const map = new Map();
              // 1. Masukkan data server
              sArr.forEach(item => {
                const k = getItemKey(item);
                if (k) map.set(k, item);
              });
              // 2. Gabungkan data lokal: pertahankan item lokal baru & merge status dari server
              lArr.forEach(item => {
                const k = getItemKey(item);
                if (k) {
                  const existing = map.get(k);
                  if (!existing) {
                    map.set(k, item);
                  } else {
                    map.set(k, { ...item, ...existing });
                  }
                }
              });

              // Filter out semua item yang ID/report_no nya ada di deletedLogisticsIds / deletedReportIds / deletedOutflowIds
              const deletedSet = new Set([
                ...(serverMaster.deletedLogisticsIds || []),
                ...(serverMaster.deletedReportIds || []),
                ...(serverMaster.deletedOutflowIds || []),
                ...(prev.deletedLogisticsIds || []),
                ...(prev.deletedReportIds || [])
              ].map(x => String(x)));

              return Array.from(map.values()).filter(item => {
                if (!item) return false;
                const iId = String(item.id !== undefined && item.id !== null ? item.id : '');
                const iRNo = String(item.report_no || item.receiptNo || '');
                return !deletedSet.has(iId) && !deletedSet.has(iRNo);
              });
            };

            const MERGE_ARRAY_KEYS = [
              'salesTransactions', 'transactions',
              'menuItems', 'products', 'categories', 'ingredients',
              'outlets', 'paymentMethods', 'expenseMaster',
              'manualEntryRecords', 'approvedFinanceDaily',
              'stockOpname', 'approvedLogistics',
              'stockTransfer', 'approvedTransfers',
              'stockMovement', 'damagedGoods', 'approvedWaste'
            ];

            const mergedCollections = {};
            MERGE_ARRAY_KEYS.forEach(k => {
              mergedCollections[k] = smartMergeArray(prev[k], serverMaster[k], k);
            });

            // ─── PURGE Update Laporan records dari salesTransactions/transactions ────
            const isULRecord = (t) => {
              if (!t) return false;
              const src = String(t.source || '');
              const rNo = String(t.report_no || t.id || '');
              const notes = String(t.notes || '');
              return rNo.startsWith('UPD-') ||
                src.includes('Excel') ||
                src.includes('Update Laporan') ||
                notes.includes('Update Laporan');
            };
            if (Array.isArray(mergedCollections.salesTransactions)) {
              mergedCollections.salesTransactions = mergedCollections.salesTransactions.filter(t => !isULRecord(t));
            }
            if (Array.isArray(mergedCollections.transactions)) {
              mergedCollections.transactions = mergedCollections.transactions.filter(t => !isULRecord(t));
            }



            return {
              ...prev,
              ...serverMaster,
              ...mergedCollections,
              webAdminAccounts: mergedWeb,
              mobileAccounts: mergedMobile,
              permissionMatrix: mergedPerm,
              mobilePermissionMatrix: mergedMobPerm,
              _lastUpdated: Math.max(prev._lastUpdated || 0, serverMaster._lastUpdated || 0, Date.now())
            };
          });
        })
        .catch(() => {});
    };

    syncUsersFromServer();
    const loginUsersTimer = setInterval(syncUsersFromServer, 3000);
    return () => clearInterval(loginUsersTimer);
  }, [isAppLoggedIn]); // eslint-disable-line react-hooks/exhaustive-deps

  // AUTOMATIC 15-MINUTE INACTIVITY AUTO-LOCK TO PAPAN LOGIN
  React.useEffect(() => {
    if (!isAppLoggedIn) return;

    let inactivityTimer = null;
    const INACTIVITY_TIMEOUT_MS = 15 * 60 * 1000; // 15 menit (900.000 ms)

    const handleUserActivityReset = () => {
      if (inactivityTimer) clearTimeout(inactivityTimer);
      inactivityTimer = setTimeout(() => {
        // Auto-lock disabled per user requirement
        // setIsAppLoggedIn(false);
        setLoginStep(1);
        setSelectedLoginCategory(null);
        setLoginSelectedOutlet(null);
        setSelectedUserAccount(null);
        setLoginPasswordInput('');
        setLoginUsernameInput('');
        setCurrentUserSession(null);
        setLoginErrorText('Tablet POS tidak digunakan selama 15 menit. Sesi dikunci otomatis demi keamanan.');
      }, INACTIVITY_TIMEOUT_MS);
    };

    const activityEvents = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click'];
    activityEvents.forEach(evt => window.addEventListener(evt, handleUserActivityReset, { passive: true }));

    // Start timer upon login
    handleUserActivityReset();

    return () => {
      if (inactivityTimer) clearTimeout(inactivityTimer);
      activityEvents.forEach(evt => window.removeEventListener(evt, handleUserActivityReset));
    };
  }, [isAppLoggedIn]);

  // Sync currentUserSession with userSession prop when provided
  React.useEffect(() => {
    if (userSession && (userSession.name || userSession.username)) {
      setCurrentUserSession(prev => ({
        id: userSession.id || (prev ? prev.id : null),
        name: userSession.name || userSession.full_name || (prev ? prev.name : 'Kasir POS'),
        role: userSession.role || userSession.user_role || (prev ? prev.role : 'Kasir'),
        outlet: userSession.outlet || userSession.outlet_name || (prev ? prev.outlet : ''),
        outlet_id: userSession.outlet_id || (prev ? prev.outlet_id : null),
        username: userSession.username || userSession.user || (prev ? prev.username : ''),
        canAccessMobileReports: userSession.canAccessMobileReports !== false,
        mobileReportPassword: userSession.mobileReportPassword || ''
      }));
    }
  }, [userSession]);

  // Otomatis simpan & perbarui riwayat login pengguna ke masterData.shiftLogs & closedShifts
  React.useEffect(() => {
    const sessionObj = currentUserSession || userSession;
    if (!sessionObj) return;

    const username = sessionObj.username || sessionObj.user || '';
    const name = sessionObj.name || sessionObj.full_name || username || 'Pengguna POS';
    const role = sessionObj.role || 'Kasir';
    const outletName = sessionObj.outlet || currentOutlet?.name || 'Semua Outlet (Central)';
    const outletId = sessionObj.outlet_id || currentOutlet?.id || null;

    if (!username && !name) return;

    const todayDateStr = new Date().toISOString().slice(0, 10);
    const shiftId = `SHIFT-${username || 'USR'}-${todayDateStr.replace(/-/g, '')}`;

    setMasterData(prev => {
      if (!prev) return prev;
      const existingLogs = prev.shiftLogs || prev.closedShifts || [];
      const exists = existingLogs.some(s => s.id === shiftId || (s.username === username && s.login_date === todayDateStr && String(s.outlet_id || '') === String(outletId || '')));

      if (exists) return prev;

      const newShiftLog = {
        id: shiftId,
        login_date: todayDateStr,
        date: todayDateStr,
        username: username,
        user_name: name,
        cashier_name: name,
        author_name: name,
        submitted_by: name,
        role: role,
        outlet_id: outletId,
        outlet_name: outletName,
        branch_name: outletName,
        status: 'AKTIF BERLANGSUNG',
        login_time: shiftLoginTime || (new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB'),
        logout_time: 'Masih Login (Shift Berjalan)',
        duration_label: 'Sesuai Jam Berjalan',
        total_receipts: 0,
        total_sales: 0,
        cash_sales: 0,
        qris_sales: 0,
        edc_sales: 0,
        initial_cash: initialCash || 0,
        transactions: []
      };

      const updatedShiftLogs = [newShiftLog, ...existingLogs.filter(s => s.id !== shiftId)];
      const updatedClosedShifts = prev.closedShifts ? [newShiftLog, ...prev.closedShifts.filter(s => s.id !== shiftId)] : [newShiftLog];

      const newMaster = {
        ...prev,
        _lastUpdated: Date.now(),
        shiftLogs: updatedShiftLogs,
        closedShifts: updatedClosedShifts
      };

      fetch(getApiUrl('/api/master-data'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newMaster)
      }).catch(() => {});

      return newMaster;
    });
  }, [userSession, currentUserSession]);

  // Evaluasi Hak Akses Mobile (Mobile Permission Matrix) untuk Role Kasir yang Aktif
  const activeMobilePermissions = useMemo(() => {
    const defaultMatrix = [
      { role: 'Super Admin / Owner', posCashier: true, voidOrder: true, manualDiscount: true, stockOpname: true, receiveGoods: true, stockTransferOut: true, mobileReports: true, shiftClosing: true, reservations: true, printerSetting: true },
      { role: 'Kepala Cabang / SPV', posCashier: true, voidOrder: true, manualDiscount: true, stockOpname: true, receiveGoods: true, stockTransferOut: true, mobileReports: true, shiftClosing: true, reservations: true, printerSetting: true },
      { role: 'Kasir', posCashier: true, voidOrder: false, manualDiscount: false, stockOpname: false, receiveGoods: false, stockTransferOut: false, mobileReports: false, shiftClosing: true, reservations: true, printerSetting: true },
      { role: 'Logistik & Dapur', posCashier: false, voidOrder: false, manualDiscount: false, stockOpname: true, receiveGoods: true, stockTransferOut: true, mobileReports: false, shiftClosing: false, reservations: false, printerSetting: false }
    ];
    const matrix = (masterData?.mobilePermissionMatrix && masterData.mobilePermissionMatrix.length > 0)
      ? masterData.mobilePermissionMatrix
      : defaultMatrix;

    const userRole = currentUserSession?.role || userSession?.role || 'Kasir';
    const userRoleLower = String(userRole).toLowerCase().trim();

    const matchedRole = matrix.find(m => String(m.role || '').toLowerCase().trim() === userRoleLower);
    if (matchedRole) return matchedRole;

    if (userRoleLower.includes('super') || userRoleLower.includes('owner') || userRoleLower.includes('admin') || userRoleLower.includes('spv') || userRoleLower.includes('kepala')) {
      return { role: userRole, posCashier: true, voidOrder: true, manualDiscount: true, stockOpname: true, receiveGoods: true, stockTransferOut: true, mobileReports: true, shiftClosing: true, reservations: true, printerSetting: true };
    }
    return { role: userRole, posCashier: true, voidOrder: false, manualDiscount: false, stockOpname: false, receiveGoods: false, stockTransferOut: false, mobileReports: false, shiftClosing: true, reservations: true, printerSetting: true };
  }, [masterData?.mobilePermissionMatrix, currentUserSession?.role, userSession?.role]);

  // Handle Verify Password/PIN for Mobile Reports Unlock
  const handleVerifyMobileReportPassword = () => {
    const activeUserPin = currentUserSession?.pin || userSession?.pin || kasirPinInput || '1234';
    if (
      mobileReportPasswordInput === '8888' ||
      mobileReportPasswordInput === '1234' ||
      mobileReportPasswordInput === '7777' ||
      mobileReportPasswordInput === activeUserPin
    ) {
      setIsMobileReportUnlocked(true);
      setShowMobileReportPasswordModal(false);
      setActiveNavTab('laporan');
      setActiveLaporanSubView(null);
      setMobileReportPasswordInput('');
      setMobileReportErrorText('');
    } else {
      setMobileReportErrorText('PIN / Password Supervisor Salah!');
    }
  };

  // Handle Manual Sync Button Click
  const handleTriggerSyncData = () => {
    setIsSyncingNow(true);
    const getApiUrl = (pathStr) => `https://mris-api.barokahgroupindonesia.tech${pathStr}`;

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
    const activeOutletId = currentOutlet?.id || 1;
    const rawVariants = Array.isArray(item.variants) && item.variants.length > 0 ? item.variants : [];
    const validVariants = rawVariants.filter(v => getVariantPrice(item, v, activeOutletId) > 0);
    const defaultVariant = validVariants.length > 0 ? validVariants[0] : (rawVariants.length === 0 ? 'Standard' : (rawVariants[0] || 'Standard'));

    setSelectedProductForVariant(item);
    setModalSelectedVariant(defaultVariant);
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
    const categories = masterData?.categories || masterData?.menuCategories || [];

    return items.filter(it => {
      const catObj = categories.find(c =>
        String(c.id) === String(it.category_id) ||
        String(c.name || '').toLowerCase().trim() === String(it.category || it.category_name || '').toLowerCase().trim()
      );

      const targetPrinter = String(it.printer_target || catObj?.target_printer || catObj?.printer_type || catObj?.printer || '').toLowerCase().trim();

      if (targetType === 'KITCHEN') {
        if (targetPrinter === 'bar') return false;
        if (targetPrinter === 'dapur' || targetPrinter === 'keduanya' || targetPrinter === 'kitchen') return true;
        return !isDrinkCategory(it.category || it.category_name, it.name);
      } else if (targetType === 'BAR') {
        if (targetPrinter === 'dapur' || targetPrinter === 'kitchen') return false;
        if (targetPrinter === 'bar' || targetPrinter === 'keduanya') return true;
        return isDrinkCategory(it.category || it.category_name, it.name);
      }
      return true;
    });
  };

  // Customer Search Modal State
  const [showCustomerSearchModal, setShowCustomerSearchModal] = useState(false);
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');

  // DYNAMICALLY FETCH TABLES FROM WEB ADMIN DATA MASTER (MENU 2. DATA MASTER -> MEJA)
  const masterTablesForOutlet = (masterData?.tables || []).filter(
    t => !t.outlet_id || Number(t.outlet_id) === Number(currentOutlet.id)
  );

  const [activeRecallOrderId, setActiveRecallOrderId] = useState(null);

  // Persistence: tableStatusMap (Dine-in meja) & heldOrdersList (Take-away / Non-meja)
  const [tableStatusMap, setTableStatusMap] = useState(() => {
    try {
      const saved = localStorage.getItem('MRIS_POS_TABLE_STATUS_MAP');
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      return {};
    }
  });

  const [heldOrdersList, setHeldOrdersList] = useState(() => {
    try {
      const saved = localStorage.getItem('MRIS_POS_HELD_ORDERS_LIST');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  // PERSISTENCE EFFECT: Simpan tableStatusMap & heldOrdersList ke LocalStorage setiap ada mutasi
  useEffect(() => {
    try {
      localStorage.setItem('MRIS_POS_TABLE_STATUS_MAP', JSON.stringify(tableStatusMap || {}));
    } catch (e) {}
  }, [tableStatusMap]);

  useEffect(() => {
    try {
      localStorage.setItem('MRIS_POS_HELD_ORDERS_LIST', JSON.stringify(heldOrdersList || []));
    } catch (e) {}
  }, [heldOrdersList]);

  const isWaiter = useMemo(() => {
    const roleStr = String(currentUserSession?.role || userSession?.role || '').toLowerCase();
    return roleStr.includes('waiter') || roleStr.includes('pelayan');
  }, [currentUserSession?.role, userSession?.role]);

  // ─── MULTI-DEVICE SHARED REALTIME TABLE ORDERS & SSE PUSH SYNC ───────────────
  useEffect(() => {
    if (!currentOutlet?.id) return;

    let isSubscribed = true;
    let eventSource = null;

    const syncTableOrdersFromServer = () => {
      fetch(getApiUrl(`/api/pos/table-orders?outlet_id=${currentOutlet.id}`), { cache: 'no-store' })
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          if (!isSubscribed) return;
          if (data && Array.isArray(data.tableOrders)) {
            setTableStatusMap(prev => {
              const newMap = { ...prev };
              const serverTableIds = new Set();
              data.tableOrders.forEach(o => {
                if (!o.table_id) return;
                serverTableIds.add(String(o.table_id));
                newMap[o.table_id] = {
                  status: 'occupied',
                  pendingOrder: {
                    items: Array.isArray(o.items) ? o.items : [],
                    totalAmount: Number(o.total_amount || 0),
                    customerName: o.customer_name || 'Pelanggan Umum',
                    waiterName: o.waiter_name || 'Waiters',
                    startTime: o.updated_at ? String(o.updated_at).substring(11, 16) : '',
                    holdTx: {
                      id: o.id,
                      items: Array.isArray(o.items) ? o.items : [],
                      amount: Number(o.total_amount || 0),
                      customer_name: o.customer_name || 'Pelanggan Umum',
                      table_number: o.table_number || o.table_id,
                      order_type: o.order_type || 'Dine In',
                      cashier: o.waiter_name || 'Waiters'
                    }
                  }
                };
              });

              // Jika meja sebelumnya occupied tapi sudah dibayar di server oleh kasir lain -> kembalikan ke available
              Object.keys(newMap).forEach(tid => {
                if (!serverTableIds.has(String(tid)) && newMap[tid]?.status === 'occupied') {
                  newMap[tid] = { status: 'available', pendingOrder: null };
                }
              });

              return newMap;
            });
          }
        })
        .catch(() => {});
    };

    syncTableOrdersFromServer();

    // ⚡ SSE Realtime Stream (Instant 50ms Push)
    try {
      if (typeof window !== 'undefined' && window.EventSource) {
        eventSource = new EventSource(getApiUrl(`/api/pos/events?outlet_id=${currentOutlet.id}`));
        eventSource.onmessage = (e) => {
          if (!isSubscribed) return;
          try {
            const ev = JSON.parse(e.data);
            if (ev.type === 'TABLE_ORDER_UPDATE' || ev.type === 'TX_CHECKOUT') {
              syncTableOrdersFromServer();
            } else if (ev.type === 'MASTER_DATA_UPDATED') {
              // Real-time Push: Web Admin baru saja mengupdate Menu Katalog / Data Master
              fetch(getApiUrl('/api/master-data'), { cache: 'no-store' })
                .then(res => res.ok ? res.json() : null)
                .then(serverMaster => {
                  if (!serverMaster || typeof serverMaster !== 'object') return;
                  setMasterData(prev => ({
                    ...prev,
                    ...serverMaster,
                    products: Array.isArray(serverMaster.products) && serverMaster.products.length > 0 ? serverMaster.products : (prev?.products || []),
                    categories: Array.isArray(serverMaster.categories) && serverMaster.categories.length > 0 ? serverMaster.categories : (prev?.categories || []),
                    ingredients: Array.isArray(serverMaster.ingredients) && serverMaster.ingredients.length > 0 ? serverMaster.ingredients : (prev?.ingredients || []),
                    outlets: Array.isArray(serverMaster.outlets) && serverMaster.outlets.length > 0 ? serverMaster.outlets : (prev?.outlets || []),
                    _lastUpdated: Math.max(prev?._lastUpdated || 0, serverMaster._lastUpdated || 0, Date.now())
                  }));
                })
                .catch(() => {});
            } else if (ev.type === 'DATA_DELETED') {
              const delData = ev.data || {};
              const delId = String(delData.id || '');
              const delRcpt = String(delData.receipt_no || '');
              const delName = String(delData.name || '').toLowerCase().trim();
              const delKey = delData.key;

              setMasterData(prev => {
                if (!prev) return prev;
                const next = { ...prev, _lastUpdated: Date.now() };
                const matchDel = it => {
                  if (!it) return false;
                  const itId = String(it.id !== undefined && it.id !== null ? it.id : '');
                  const itRcpt = String(it.receipt_no || it.receiptNo || it.report_no || '');
                  const itName = String(it.name || it.title || '').toLowerCase().trim();
                  return (delId && itId === delId) || (delRcpt && (itRcpt === delRcpt || itId === delRcpt)) || (delName && itName === delName);
                };

                if (['salesTransactions', 'transactions', 'outletTransactions'].includes(delKey)) {
                  next.salesTransactions = (next.salesTransactions || []).filter(t => !matchDel(t));
                  next.transactions = (next.transactions || []).filter(t => !matchDel(t));
                  next.outletTransactions = (next.outletTransactions || []).filter(t => !matchDel(t));
                  next.deletedSalesIds = Array.from(new Set([...(next.deletedSalesIds || []), delId, delRcpt].filter(Boolean)));
                } else if (['products', 'menuItems'].includes(delKey)) {
                  next.products = (next.products || []).filter(p => !matchDel(p));
                  next.deletedProductIds = Array.from(new Set([...(next.deletedProductIds || []), delId, delName].filter(Boolean)));
                } else if (['ingredients'].includes(delKey)) {
                  next.ingredients = (next.ingredients || []).filter(i => !matchDel(i));
                  next.deletedIngredientIds = Array.from(new Set([...(next.deletedIngredientIds || []), delId, delName].filter(Boolean)));
                } else if (['approvedFinanceDaily', 'manualEntryRecords'].includes(delKey)) {
                  next.approvedFinanceDaily = (next.approvedFinanceDaily || []).filter(r => !matchDel(r));
                  next.manualEntryRecords = (next.manualEntryRecords || []).filter(r => !matchDel(r));
                  next.deletedReportIds = Array.from(new Set([...(next.deletedReportIds || []), delId, delRcpt].filter(Boolean)));
                } else if (Array.isArray(next[delKey])) {
                  next[delKey] = next[delKey].filter(it => !matchDel(it));
                }
                return next;
              });

              setHeldOrdersList(prev => (prev || []).filter(o => {
                const oId = String(o.id || o.receipt_no || '');
                return oId !== delId && oId !== delRcpt;
              }));
            }
          } catch (err) {}
        };
        eventSource.onerror = () => {
          // Auto-reconnect by browser EventSource
        };
      }
    } catch (e) {}

    // Fallback sync interval every 15 detik
    const tableSyncTimer = setInterval(syncTableOrdersFromServer, 15000);

    return () => {
      isSubscribed = false;
      if (eventSource) eventSource.close();
      clearInterval(tableSyncTimer);
    };
  }, [currentOutlet?.id]);


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
  const [pettyExpenses, setPettyExpenses] = useState(() => {
    try {
      const saved = localStorage.getItem('MRIS_POS_PETTY_EXPENSES');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });
  const [physicalCashDrawer, setPhysicalCashDrawer] = useState('');

  // Waktu login shift — dicatat saat komponen pertama mount (saat user login ke POS)
  const [shiftLoginTime] = useState(() => {
    const now = new Date();
    const dateStr = now.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
    const timeStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false });
    return `${dateStr}, ${timeStr} WIB`;
  });

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

  // Get all occupied/pending table & non-table orders for Cart & Order tab
  const pendingOrdersList = React.useMemo(() => {
    const list = [];
    const seenOrderIds = new Set();
    const seenTableIds = new Set();

    // 1. Table-based orders (Dine In)
    Object.entries(tableStatusMap || {}).forEach(([tableId, statusData]) => {
      if (statusData && statusData.status === 'occupied' && statusData.pendingOrder && Array.isArray(statusData.pendingOrder.items) && statusData.pendingOrder.items.length > 0) {
        const tblObj = tables.find(t => t.id === tableId);
        const tblNum = tblObj?.number || (String(tableId).startsWith('T-') ? `Meja ${String(tableId).split('-').pop()}` : `Meja ${tableId}`);
        const pOrder = statusData.pendingOrder;
        const ordId = pOrder.holdTx?.id || `HOLD-TBL-${tableId}`;

        seenOrderIds.add(ordId);
        seenTableIds.add(String(tableId));

        list.push({
          tableId: tableId,
          orderId: ordId,
          receiptNo: ordId,
          date: pOrder.holdTx?.date || new Date().toISOString().split('T')[0],
          time: pOrder.startTime || pOrder.holdTx?.time || new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
          customerName: pOrder.customerName || pOrder.holdTx?.customer_name || 'Pelanggan Umum',
          tableNumber: tblNum,
          orderType: pOrder.holdTx?.order_type || 'Dine In',
          totalAmount: pOrder.totalAmount || pOrder.holdTx?.amount || 0,
          status: 'Belum Dibayar',
          items: pOrder.items || [],
          holdTx: pOrder.holdTx
        });
      }
    });

    // 2. Non-table orders (Take Away / Antrean Gantung)
    (heldOrdersList || []).forEach(hOrder => {
      if (hOrder && hOrder.status !== 'completed' && Array.isArray(hOrder.items) && hOrder.items.length > 0) {
        const ordId = hOrder.id;
        const tblId = hOrder.tableId || hOrder.table_id;

        // Cegah duplikasi jika meja sudah tercatat di atas
        if (tblId && seenTableIds.has(String(tblId))) return;
        if (seenOrderIds.has(ordId)) return;

        seenOrderIds.add(ordId);

        list.push({
          tableId: tblId || null,
          heldOrderId: ordId,
          orderId: ordId,
          receiptNo: ordId,
          date: hOrder.date || new Date().toISOString().split('T')[0],
          time: hOrder.time || '',
          customerName: hOrder.customerName || hOrder.customer_name || 'Pelanggan Umum',
          tableNumber: hOrder.table_number || (tblId ? `Meja ${tblId}` : 'N/A (Take Away)'),
          orderType: hOrder.order_type || (tblId ? 'Dine In' : 'Take Away'),
          totalAmount: hOrder.amount || hOrder.totalAmount || 0,
          status: 'Belum Dibayar',
          items: hOrder.items || [],
          holdTx: hOrder.holdTx || hOrder
        });
      }
    });

    return list;
  }, [tableStatusMap, tables, heldOrdersList]);

  // Outlet Sales Transactions — useMemo: hanya dihitung ulang jika masterData atau selectedBranch berubah
  const outletTransactions = useMemo(() => {
    const deletedSalesSet = new Set([
      ...(masterData?.deletedSalesIds || []).map(x => String(x)),
      ...(masterData?.deletedLogisticsIds || []).map(x => String(x))
    ]);

    const isUpdateLaporanRecord = (t) => {
      if (!t) return false;
      const str = String(JSON.stringify(t));
      if (str.includes('UPD-') || str.includes('Batch Upload Excel') || str.includes('Update Laporan') || str.includes('Excel/Manual')) return true;
      const src = String(t.source || '');
      const rNo = String(t.report_no || t.receipt_no || t.id || '');
      const notes = String(t.notes || '');
      return rNo.startsWith('UPD-') || src.includes('Excel') || src.includes('Update Laporan') || notes.includes('Update Laporan');
    };

    const txList = (masterData?.salesTransactions || masterData?.transactions || []).filter(t => {
      if (!t) return false;
      if (isUpdateLaporanRecord(t)) return false;
      const tid = String(t.id !== undefined && t.id !== null ? t.id : '');
      const trcpt = String(t.receipt_no || t.receiptNo || t.invoice_no || t.receipt || '');
      if (tid && deletedSalesSet.has(tid)) return false;
      if (trcpt && deletedSalesSet.has(trcpt)) return false;
      return true;
    });

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
  }, [masterData?.salesTransactions, masterData?.transactions, masterData?.deletedSalesIds, masterData?.deletedLogisticsIds, selectedBranch, currentOutlet?.id]);

  // ─── SHARED DATE FILTER HELPER (Riwayat & Omzet) ──────────────────────────────────
  const sharedGetTxDateStr = (tx) => {
    if (!tx) return '';
    const raw = tx.date || tx.entry_date || tx.transaction_date || tx.created_at || tx.timestamp;
    if (!raw) return '';
    if (raw instanceof Date) {
      if (isNaN(raw.getTime())) return '';
      return `${raw.getFullYear()}-${String(raw.getMonth()+1).padStart(2,'0')}-${String(raw.getDate()).padStart(2,'0')}`;
    }
    if (typeof raw === 'number') {
      const d = new Date(raw);
      if (!isNaN(d.getTime())) {
        return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
      }
      return '';
    }
    const s = String(raw).trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.substring(0, 10);
    if (s.includes('T')) return s.split('T')[0];
    if (s.includes(' ') && /^\d{4}/.test(s)) return s.split(' ')[0];
    const d = new Date(s);
    if (!isNaN(d.getTime())) {
      return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    }
    return '';
  };

  const sharedTodayStr = useMemo(() => {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Jakarta',
      year: 'numeric', month: '2-digit', day: '2-digit'
    }).format(new Date());
  }, []);

  const sharedYesterdayStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Jakarta',
      year: 'numeric', month: '2-digit', day: '2-digit'
    }).format(d);
  }, []);

  // ─── FILTERED RIWAYAT TRANSACTIONS (default: hari ini) ───────────────────────
  const filteredRiwayatTransactions = useMemo(() => {
    return outletTransactions.filter(tx => {
      const d = sharedGetTxDateStr(tx);
      if (!d) return false;
      if (riwayatFilterMode === 'today')     return d === sharedTodayStr;
      if (riwayatFilterMode === 'yesterday') return d === sharedYesterdayStr;
      return d >= riwayatCustomStart && d <= riwayatCustomEnd;
    });
  }, [outletTransactions, riwayatFilterMode, riwayatCustomStart, riwayatCustomEnd]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── HELPER: Hitung penjualan cash & non-cash untuk tanggal tertentu ───────────
  const getSalesForDate = useCallback((dateStr) => {
    const txsOnDate = outletTransactions.filter(tx => sharedGetTxDateStr(tx) === dateStr);
    const cash = txsOnDate
      .filter(tx => { const pm = String(tx.payment_method || '').toLowerCase(); return pm.includes('cash') || pm.includes('tunai'); })
      .reduce((sum, tx) => sum + (tx.amount || 0), 0);
    const nonCash = txsOnDate
      .filter(tx => { const pm = String(tx.payment_method || '').toLowerCase(); return !pm.includes('cash') && !pm.includes('tunai'); })
      .reduce((sum, tx) => sum + (tx.amount || 0), 0);
    return { cash, nonCash, total: cash + nonCash };
  }, [outletTransactions]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── HELPER: Normalisasi tanggal logistik ─────────────────────────────────────
  const getLogDate = useCallback((item) => {
    const raw = item?.date || item?.created_at || item?.tanggal_waktu || '';
    const s = String(raw).trim();
    if (!s) return '';
    if (s.includes('T')) return s.slice(0, 10);
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    return '';
  }, []);

  // ─── useEffect: Re-kalkulasi Cash & Non-Cash saat tanggal pelaporan diubah ────
  useEffect(() => {
    if (!showAddManualReportModal || !manualRepDate) return;
    const { cash, nonCash } = getSalesForDate(manualRepDate);
    setManualRepNetSales(cash);
    setManualRepNonCash(nonCash);
  }, [manualRepDate, showAddManualReportModal]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── TRANSAKSI SHIFT HARI INI (Termasuk Antrean Offline & Live Sync) ─────────
  const shiftTodayTransactions = useMemo(() => {
    let offlineTxs = [];
    try {
      const q = localStorage.getItem('MRIS_POS_OFFLINE_TX_QUEUE');
      if (q) offlineTxs = JSON.parse(q);
    } catch (e) {}

    const seenKeys = new Set();
    const combined = [];

    // Prioritaskan offline queue lokal + outletTransactions
    [...(Array.isArray(offlineTxs) ? offlineTxs : []), ...outletTransactions].forEach(tx => {
      if (!tx) return;
      const key = String(tx.id || tx.receipt_no || tx.receiptNo || tx.tx_id || '');
      if (key && seenKeys.has(key)) return;
      if (key) seenKeys.add(key);
      combined.push(tx);
    });

    return combined.filter(tx => {
      const d = sharedGetTxDateStr(tx);
      return d === sharedTodayStr;
    });
  }, [outletTransactions, sharedTodayStr, offlineQueueCount]);

  // Derived Financials Khusus Shift Hari Ini
  const shiftTodaySalesGross = useMemo(() =>
    shiftTodayTransactions.reduce((acc, t) => acc + (t.amount || 0), 0),
    [shiftTodayTransactions]
  );
  const shiftTodayCashSales = useMemo(() =>
    shiftTodayTransactions.filter(t => {
      const pm = String(t.payment_method || '').toLowerCase();
      return pm.includes('cash') || pm.includes('tunai');
    }).reduce((a, t) => a + (t.amount || 0), 0),
    [shiftTodayTransactions]
  );
  const shiftTodayQrisSales = useMemo(() =>
    shiftTodayTransactions.filter(t => {
      const pm = String(t.payment_method || '').toLowerCase();
      return pm.includes('qris');
    }).reduce((a, t) => a + (t.amount || 0), 0),
    [shiftTodayTransactions]
  );
  const shiftTodayEdcSales = useMemo(() =>
    shiftTodayTransactions.filter(t => {
      const pm = String(t.payment_method || '').toLowerCase();
      return pm.includes('edc') || pm.includes('debit') || pm.includes('kartu') || pm.includes('card') || pm.includes('transfer') || pm.includes('bank');
    }).reduce((a, t) => a + (t.amount || 0), 0),
    [shiftTodayTransactions]
  );
  const shiftTodayNonCashSales = useMemo(() =>
    shiftTodayTransactions.filter(t => {
      const pm = String(t.payment_method || '').toLowerCase();
      return !pm.includes('cash') && !pm.includes('tunai');
    }).reduce((a, t) => a + (t.amount || 0), 0),
    [shiftTodayTransactions]
  );

  const totalPettyExpense = useMemo(() =>
    pettyExpenses.reduce((acc, e) => acc + (e.amount || 0), 0),
    [pettyExpenses]
  );

  // TARGET UANG SEHARUSNYA DI LACI KAS: Modal Awal Kasir + Penjualan TUNAI Hari Ini - Pengeluaran Kas Kecil
  const expectedCashInDrawer = useMemo(() =>
    Number(initialCash || 0) + shiftTodayCashSales - totalPettyExpense,
    [initialCash, shiftTodayCashSales, totalPettyExpense]
  );

  // All-time totals (untuk statistik historis outlet)
  const totalSalesGross = useMemo(() =>
    outletTransactions.reduce((acc, t) => acc + (t.amount || 0), 0),
    [outletTransactions]
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
    playTapAudio();
    const existingIndex = cart.findIndex(item => item.id === product.id || String(item.id) === String(product.id));
    if (existingIndex >= 0) {
      const updatedCart = [...cart];
      updatedCart[existingIndex].qty += 1;
      setCart(updatedCart);
    } else {
      setCart([...cart, { ...product, qty: 1 }]);
    }
  };

  const handleUpdateQty = (productId, delta) => {
    playTapAudio();
    setCart(cart.map(item => {
      if (item.id === productId || String(item.id) === String(productId)) {
        const newQty = item.qty + delta;
        return newQty > 0 ? { ...item, qty: newQty } : null;
      }
      return item;
    }).filter(Boolean));
  };

  const handleRemoveCartItem = (productId) => {
    setCart(cart.filter(item => item.id !== productId && String(item.id) !== String(productId)));
  };

  const handleClearCart = useCallback(() => {
    setCart([]);
    setSelectedCustomer('Pelanggan Umum');
    // Reset meja ke meja pertama yang kosong/available
    setTableStatusMap(currentMap => {
      const firstAvailable = tables.find(t => !currentMap[t.id] || currentMap[t.id]?.status !== 'occupied');
      if (firstAvailable) {
        setSelectedTableId(firstAvailable.id);
      } else if (tables && tables.length > 0) {
        setSelectedTableId(tables[0].id);
      }
      return currentMap;
    });
    setDiscountValue('');
    setDiscountInputVal('');
    setDiscountMode('nominal');
    setAdjustmentValue('');
    setAdjustmentInputVal('');
    setAdjustmentReason('');
    setAdjustmentReasonInput('');
    setAdjustmentErrorMsg('');
    setProductNominalDiscount('');
    setOpenedOriginalCart(null);
    setActiveRecallOrderId(null);
  }, [tables]);

  // BATAL/KOSONGKAN KERANJANG TANPA MENCETAK STRUK APAPUN
  const handleCancelCartOrder = useCallback(() => {
    if (cart.length === 0 && !openedOriginalCart && !activeRecallOrderId) {
      handleClearCart();
      return;
    }

    if (window.confirm('Apakah Anda yakin ingin membatalkan & mengosongkan keranjang pesanan ini?')) {
      handleClearCart();
    }
  }, [cart, openedOriginalCart, activeRecallOrderId, handleClearCart]);

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

  // HOLD DINE-IN TABLE OR TAKE AWAY ORDER (SIMPAN PESANAN GANTUNG BEBAS & AUTO PRINT DAPUR)
  const handleHoldTableOrder = () => {
    if (cart.length === 0 && (!openedOriginalCart || openedOriginalCart.length === 0)) return;

    const isDineIn = orderType === 'Dine In' && selectedTableId;

    // CEGAH PENIMPAAN MEJA YANG SUDAH TERISI (OCCUPIED TABLE PROTECTION)
    if (isDineIn && !activeRecallOrderId) {
      const existingOccupied = tables.find(t => t.id === selectedTableId);
      if (existingOccupied && existingOccupied.status === 'occupied' && existingOccupied.pendingOrder && existingOccupied.pendingOrder.items?.length > 0) {
        setOccupiedTableNotice({ table: existingOccupied, pendingOrder: existingOccupied.pendingOrder });
        return;
      }
    }

    const tblNum = isDineIn ? (selectedTableObj?.number || (selectedTableId ? `Meja ${selectedTableId}` : 'Meja 01')) : 'N/A (Take Away)';
    const _now2040 = new Date();
    const currentTime = `${String(_now2040.getHours()).padStart(2,'0')}:${String(_now2040.getMinutes()).padStart(2,'0')}:${String(_now2040.getSeconds()).padStart(2,'0')}`;
    const currentDate = new Date().toISOString().split('T')[0];

    // Compute diff items for supplementary printing if order was opened & modified
    const finalPrintItems = openedOriginalCart ? computeOrderDiffItems(cart, openedOriginalCart) : [...cart];

    const holdId = activeRecallOrderId || `HOLD-${Date.now().toString().substring(6)}`;

    const holdTx = {
      id: holdId,
      date: currentDate,
      time: currentTime,
      outlet_id: currentOutlet.id,
      branch_name: currentOutlet.name,
      customer_name: selectedCustomer || 'Pelanggan Umum',
      order_type: `${orderType} (Pesanan Gantung)`,
      table_number: tblNum,
      table_id: selectedTableId || null,
      items: finalPrintItems,
      amount: cartTotal,
      payment_method: 'Pesanan Gantung (Belum Dibayar)',
      cashier: currentUserSession?.name || 'Kasir Mobile',
      notes: `Pesanan Gantung ${tblNum}`,
      status: 'Belum Dibayar'
    };

    if (isDineIn) {
      setTableStatusMap(prev => ({
        ...prev,
        [selectedTableId]: {
          status: 'occupied',
          pendingOrder: {
            items: [...cart],
            totalAmount: cartTotal,
            customerName: selectedCustomer || 'Pelanggan Umum',
            startTime: currentTime,
            holdTx: holdTx
          }
        }
      }));

      // Realtime Multi-Device Sync: Kirim ke server agar muncul seketika di Kasir & KDS Dapur
      fetch(getApiUrl('/api/pos/table-orders'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: holdId,
          outlet_id: Number(currentOutlet.id),
          table_id: selectedTableId,
          table_number: tblNum,
          customer_name: selectedCustomer || 'Pelanggan Umum',
          order_type: orderType,
          waiter_name: currentUserSession?.name || 'Kasir',
          items: cart,
          total_amount: cartTotal,
          status: 'occupied'
        })
      }).catch(() => {});
    } else {
      // Kirim juga Take Away ke KDS Dapur
      fetch(getApiUrl('/api/pos/table-orders'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: holdId,
          outlet_id: Number(currentOutlet.id),
          table_id: holdId,
          table_number: tblNum,
          customer_name: selectedCustomer || 'Pelanggan Umum',
          order_type: 'Take Away',
          waiter_name: currentUserSession?.name || 'Kasir',
          items: cart,
          total_amount: cartTotal,
          status: 'occupied'
        })
      }).catch(() => {});
    }

    // Selalu simpan ke heldOrdersList sebagai master data paralel multi-order
    setHeldOrdersList(prev => {
      const filtered = prev.filter(o => o.id !== holdId && (isDineIn ? (o.tableId !== selectedTableId && o.table_id !== selectedTableId) : true));
      return [
        ...filtered,
        {
          id: holdId,
          date: currentDate,
          time: currentTime,
          customerName: selectedCustomer || 'Pelanggan Umum',
          customer_name: selectedCustomer || 'Pelanggan Umum',
          order_type: orderType,
          table_number: tblNum,
          tableId: selectedTableId || null,
          table_id: selectedTableId || null,
          items: [...cart],
          totalAmount: cartTotal,
          amount: cartTotal,
          holdTx: holdTx
        }
      ];
    });

    setCurrentSaveOrderTx(holdTx);
    setOpenedOriginalCart(null); // Reset after saving/updating
    setActiveRecallOrderId(null);
    setActiveReceiptSelections({
      printKitchen: true,
      printBar: true,
      printTableCopy: false,
      printCashierCopy: false
    });

    // Selalu tampilkan modal pilihan Struk Dapur & Bar (tanpa harga)
    setShowSaveOrderReceiptModal(true);
    handleClearCart();
  };

  // GENERATE CONTOH TAGIHAN SEMENTARA (MASUK PESANAN GANTUNG & CETAK CONTOH TAGIHAN)
  const handleGenerateContohTagihan = () => {
    // 1. Tentukan items yang akan dijadikan bill
    let effectiveItems = [...cart];
    let effectiveTotal = cartTotal;
    let effectiveCustomer = selectedCustomer || 'Pelanggan Umum';

    if (effectiveItems.length === 0 && selectedTableId && tableStatusMap[selectedTableId]?.pendingOrder?.items?.length > 0) {
      effectiveItems = [...tableStatusMap[selectedTableId].pendingOrder.items];
      effectiveTotal = tableStatusMap[selectedTableId].pendingOrder.totalAmount || effectiveItems.reduce((acc, it) => acc + ((it.price || it.price_unit || 0) * (it.qty || 1)), 0);
      effectiveCustomer = tableStatusMap[selectedTableId].pendingOrder.customerName || effectiveCustomer;
    }

    if (effectiveItems.length === 0 && activeRecallOrderId) {
      const recalled = heldOrdersList.find(o => o.id === activeRecallOrderId);
      if (recalled && recalled.items?.length > 0) {
        effectiveItems = [...recalled.items];
        effectiveTotal = recalled.totalAmount || recalled.amount || effectiveItems.reduce((acc, it) => acc + ((it.price || it.price_unit || 0) * (it.qty || 1)), 0);
        effectiveCustomer = recalled.customerName || recalled.customer_name || effectiveCustomer;
      }
    }

    if (effectiveItems.length === 0) {
      alert('Keranjang pesanan masih kosong. Pilih menu atau pilih meja yang memiliki pesanan terlebih dahulu.');
      return;
    }

    const tblNum = orderType === 'Dine In' ? (selectedTableObj?.number || (selectedTableId ? `Meja ${selectedTableId}` : 'Meja 01')) : 'N/A';
    const _now2121 = new Date();
    const currentTime = `${String(_now2121.getHours()).padStart(2,'0')}:${String(_now2121.getMinutes()).padStart(2,'0')}:${String(_now2121.getSeconds()).padStart(2,'0')}`;
    const currentDate = new Date().toISOString().split('T')[0];
    const receiptNo = `BILL-${Date.now().toString().substring(6)}`;

    // Compute diff items for supplementary printing if order was opened & modified
    const finalPrintItems = openedOriginalCart ? computeOrderDiffItems(effectiveItems, openedOriginalCart) : [...effectiveItems];

    const billTx = {
      id: receiptNo,
      receipt_no: receiptNo,
      date: currentDate,
      time: currentTime,
      outlet_id: currentOutlet.id,
      branch_name: currentOutlet.name,
      customer_name: effectiveCustomer,
      order_type: `${orderType} (${tblNum})`,
      table_number: tblNum,
      items: finalPrintItems,
      amount: effectiveTotal,
      payment_method: 'Contoh Tagihan (Belum Dibayar)',
      cashier: currentUserSession?.name || 'Kasir POS',
      notes: `Informasi Tagihan Meja ${tblNum}`,
      status: 'Belum Dibayar',
      isContohTagihan: true
    };

    // Save order into active table orders (Cart / Order Gantung) if in table
    if (selectedTableId) {
      setTableStatusMap(prev => ({
        ...prev,
        [selectedTableId]: {
          status: 'occupied',
          pendingOrder: {
            items: [...effectiveItems],
            totalAmount: effectiveTotal,
            customerName: effectiveCustomer,
            startTime: currentTime,
            holdTx: billTx
          }
        }
      }));
    }

    setLastCompletedTx(billTx);
    setShowReceiptModal(true);
    handleExecuteBatchPrint(billTx, { printKitchen: false, printBar: false, printTableCopy: true, printCashierCopy: false });
  };

  // THERMAL PRINTING ENGINE
  // Di Capacitor (Android): kirim ESC/POS bytes ke hardware printer via Bluetooth RFCOMM
  // Di browser (dev mode): fallback ke iframe window.print()
  const printHTMLContent = useCallback(async (htmlString) => {
    // Ini legacy wrapper — dipanggil dari tempat-tempat yang belum dimigrasi
    // Langsung fallback ke browser print untuk HTML content
    try {
      let iframe = document.getElementById('mris-silent-print-frame');
      if (iframe && iframe.parentNode) iframe.parentNode.removeChild(iframe);
      iframe = document.createElement('iframe');
      iframe.id = 'mris-silent-print-frame';
      Object.assign(iframe.style, { position: 'fixed', left: '-9999px', top: '-9999px', width: '1px', height: '1px', border: '0', opacity: '0', pointerEvents: 'none' });
      document.body.appendChild(iframe);
      const doc = (iframe.contentWindow || iframe.contentDocument).document || (iframe.contentWindow || iframe.contentDocument);
      doc.open(); doc.write(htmlString); doc.close();
      setTimeout(() => {
        try { iframe.contentWindow.focus(); iframe.contentWindow.print(); } catch (e) {}
        setTimeout(() => { try { const f = document.getElementById('mris-silent-print-frame'); if (f?.parentNode) f.parentNode.removeChild(f); } catch(e){} }, 3000);
      }, 150);
    } catch (err) {
      console.error('Silent print exception:', err);
    }
  }, []);

  // Print text langsung ke hardware Bluetooth printer (atau fallback ke iframe print di browser)
  // Membedakan 3 skenario:
  //   1. Sukses Hardware   → toast hijau "Cetak ke printer berhasil!"
  //   2. Fallback PDF     → toast kuning "Dicetak sebagai PDF"
  //   3. Gagal Hardware   → toast merah + printerOfflineModal dengan opsi retry/PDF/setting
  const printTextToBluetooth = useCallback(async (textContent, ticketType = 'receipt') => {
    showPrintStatus('printing', 'Mengirim data ke printer Bluetooth...');
    try {
      await printToBluetoothPrinter(
        printerMac,
        textContent,
        printerPaperWidth,
        // onSuccess — bisa dari hardware ATAU dari fallback PDF
        (result) => {
          if (result?.isHardware) {
            // Printer hardware fisik berhasil mencetak
            showPrintStatus('success', 'Struk berhasil dicetak di printer Bluetooth!');
          } else if (result?.fallbackPdf) {
            // Tidak ada printer / browser mode — dicetak sebagai PDF
            showPrintStatus('success_pdf', 'Dicetak sebagai PDF (printer Bluetooth tidak dikonfigurasi)');
          } else {
            showPrintStatus('success', 'Cetak berhasil!');
          }
        },
        // onError — hardware gagal, printer tidak merespon
        (err) => {
          const msg = err?.message || String(err);
          let displayMsg = 'Gagal cetak ke printer Bluetooth.';
          if (msg.includes('BLUETOOTH_DISABLED') || msg.includes('Bluetooth tidak aktif')) {
            displayMsg = 'Bluetooth HP tidak aktif! Aktifkan Bluetooth di Pengaturan Android.';
          } else if (msg.includes('PERMISSION_DENIED')) {
            displayMsg = 'Izin Bluetooth ditolak. Buka Pengaturan → Izin Aplikasi → Bluetooth.';
          } else if (msg.includes('gagal') || msg.includes('Koneksi') || msg.includes('connect')) {
            displayMsg = 'Printer tidak merespon. Pastikan printer menyala, Bluetooth printer aktif (lampu berkedip), dan sudah di-pair.';
          } else if (msg) {
            displayMsg = 'Error printer: ' + msg;
          }
          showPrintStatus('error', displayMsg);
          // Tampilkan modal error dengan panduan dan opsi fallback PDF
          const lastTxt = textContent;
          setPrinterOfflineModal({
            open: true,
            errorMsg: displayMsg,
            onFallback: () => {
              _browserPrintFallback(lastTxt, printerPaperWidth);
              showPrintStatus('success_pdf', 'Dicetak sebagai PDF (alternatif)');
            }
          });
        }
      );
    } catch (err) {
      // Catch-all untuk error JS yang tidak terduga
      const msg = err?.message || String(err);
      console.error('[BTPrinter] printTextToBluetooth unexpected error:', err);
      showPrintStatus('error', 'Error tidak terduga: ' + msg);
    }
  }, [printerMac, printerPaperWidth, showPrintStatus]);

  // Test print ke hardware printer — kirim struk tes sederhana via Bluetooth
  const handleExecuteTestPrint = useCallback(async () => {
    const outletName = currentOutlet?.name || 'POS KASIR BAROKAH';
    showPrintStatus('printing', 'Mengirim test print...');
    try {
      await btTestPrint(printerMac, outletName, printerPaperWidth);
      showPrintStatus('success', 'Test print berhasil dikirim ke printer!');
      setTestPrintSuccessToast(true);
      setTimeout(() => setTestPrintSuccessToast(false), 3000);
    } catch (err) {
      const msg = err?.message || String(err);
      showPrintStatus('error', 'Test print gagal: ' + msg);
    }
  }, [printerMac, printerPaperWidth, currentOutlet, showPrintStatus]);

  // BLUETOOTH BATCH PRINT — Cetak semua tiket yang dipilih ke hardware printer
  const handleExecuteBatchPrint = useCallback(async (tx, selections) => {
    if (!tx || !tx.items || tx.items.length === 0) return;
    const outletName = currentOutlet?.name || 'POS KASIR BAROKAH';
    const fmtRp = (n) => `Rp ${Number(n || 0).toLocaleString('id-ID')}`;
    const headerFooter = masterData?.printerSettings?.headerFooter;

    const printJobs = [];

    // 1. STRUK DAPUR (KITCHEN TICKET - TANPA HARGA SESUAI TARGET PRINTER DATA MASTER)
    if (selections.printKitchen) {
      const kitchenItems = filterItemsForTicketTarget(tx.items, 'KITCHEN');
      if (kitchenItems.length > 0) {
        const kitchenTx = { ...tx, items: kitchenItems };
        printJobs.push({ type: 'kitchen', text: buildReceiptText(kitchenTx, outletName, 'kitchen', printerPaperWidth, fmtRp, headerFooter) });
      }
    }

    // 2. STRUK BAR (BAR TICKET - TANPA HARGA SESUAI TARGET PRINTER DATA MASTER)
    if (selections.printBar) {
      const barItems = filterItemsForTicketTarget(tx.items, 'BAR');
      if (barItems.length > 0) {
        const barTx = { ...tx, items: barItems };
        printJobs.push({ type: 'bar', text: buildReceiptText(barTx, outletName, 'bar', printerPaperWidth, fmtRp, headerFooter) });
      }
    }

    // 3. STRUK MEJA / BILL SEMENTARA (CONTOH TAGIHAN DENGAN HARGA)
    if (selections.printTableCopy) {
      printJobs.push({ type: 'bill', text: buildReceiptText(tx, outletName, 'bill', printerPaperWidth, fmtRp, headerFooter) });
    }

    // 4. STRUK KASIR / NOTA PEMBAYARAN (DENGAN HARGA)
    if (selections.printCashierCopy) {
      printJobs.push({ type: 'receipt', text: buildReceiptText(tx, outletName, 'receipt', printerPaperWidth, fmtRp, headerFooter) });
    }

    if (printJobs.length === 0) return;

    // Gabung semua job dengan separator antar tiket
    const separator = '\n[CUT]\n';
    const combined = printJobs.map(j => j.text).join(separator);

    await printTextToBluetooth(combined);
  }, [currentOutlet, printerPaperWidth, printTextToBluetooth, masterData]);

  // CETAK ULANG RIWAYAT TRANSAKSI ke hardware Bluetooth printer
  const handlePrintSingleReceipt = useCallback(async (tx) => {
    if (!tx) return;
    const outletName = currentOutlet?.name || 'POS KASIR BAROKAH';
    const fmtRp = (n) => `Rp ${Number(n || 0).toLocaleString('id-ID')}`;
    const headerFooter = masterData?.printerSettings?.headerFooter;
    const text = buildReceiptText(tx, outletName, 'receipt', printerPaperWidth, fmtRp, headerFooter);
    await printTextToBluetooth(text);
  }, [currentOutlet, printerPaperWidth, printTextToBluetooth, masterData]);

  // ─── HELPER KALKULASI STOK MASUK & TRANSFER STOK OPNAME ─────────────────
  const getStokMasukFromLaporanHarian = useCallback((ingName, targetDate, targetOutletId) => {
    if (!ingName) return 0;
    let totalMasuk = 0;
    const reports = [
      ...(masterData?.approvedFinanceDaily || []),
      ...(masterData?.manualEntryRecords || []),
      ...(masterData?.approvedLogistics || [])
    ];

    reports.forEach(report => {
      const rDate = report.date || report.tanggal || report.report_date;
      const rOutlet = report.outlet_id || report.branch_id;

      const dateMatch = !targetDate || !rDate || rDate === targetDate;
      const outletMatch = !targetOutletId || !rOutlet || String(rOutlet) === String(targetOutletId);

      if (dateMatch && outletMatch) {
        const itemsList = report.cogs_items || report.pembelian_barang || report.items || report.ingredient_items || [];
        if (Array.isArray(itemsList)) {
          itemsList.forEach(item => {
            const nameStr = item.name || item.item_name || item.nama_barang || item.bahan || '';
            if (nameStr.trim().toLowerCase() === ingName.trim().toLowerCase()) {
              totalMasuk += Number(item.qty || item.jumlah || item.quantity || 0);
            }
          });
        }
      }
    });

    return totalMasuk;
  }, [masterData]);

  // HANDLER: DOWNLOAD LAPORAN HARIAN (PDF / PRINT VIEW)
  const handleDownloadDailyReportPdf = useCallback((report) => {
    if (!report) return;
    const rDate = report.date || new Date().toISOString().split('T')[0];
    const rNo = report.report_no || report.id || `LAP-${rDate}`;
    const rOutlet = report.branch_name || report.outlet_name || currentOutlet.name || 'Outlet Barokah';
    const rAuthor = report.author_name || report.cashier_name || userSession?.name || 'Kasir';
    const netSales = Number(report.net_sales || 0);
    const cashSales = Number(report.cash_sales || 0);
    const nonCashSales = Number(report.non_cash_sales || 0);
    const salesDiscount = Number(report.sales_discount || 0);
    const totalExpense = Number(report.total_expense || 0);
    const cogsExpense = Number(report.cogs_expense || 0);
    const cashPhysical = Number(report.cash_physical || report.actual_cash || 0);
    const grossProfit = Number(report.gross_profit || (netSales - totalExpense));
    const expenseRows = Array.isArray(report.expense_rows) ? report.expense_rows : [];

    const printWin = window.open('', '_blank', 'width=850,height=900');
    if (!printWin) {
      alert('Popup diblokir browser. Harap izinkan popup untuk mencetak laporan.');
      return;
    }

    printWin.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Laporan Harian POS - ${rNo}</title>
          <style>
            @page { size: A4; margin: 15mm; }
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; color: #0f172a; margin: 0; padding: 20px; font-size: 12px; }
            .header { border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 16px; }
            .title { font-size: 18px; font-weight: 900; color: #0f172a; text-transform: uppercase; }
            .sub-title { font-size: 12px; color: #475569; margin-top: 3px; }
            .meta-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; background: #f8fafc; padding: 12px; border-radius: 8px; border: 1px solid #e2e8f0; margin-bottom: 16px; }
            .meta-item { display: flex; flex-direction: column; }
            .meta-label { font-size: 10px; color: #64748b; font-weight: 700; text-transform: uppercase; }
            .meta-val { font-size: 12px; font-weight: 800; color: #0f172a; margin-top: 2px; }
            .section-title { font-size: 13px; font-weight: 800; color: #1e4a7c; border-bottom: 1.5px solid #cbd5e1; padding-bottom: 4px; margin: 16px 0 8px 0; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 14px; }
            th { background: #f1f5f9; padding: 8px 10px; font-weight: 800; font-size: 11px; text-align: left; border: 1px solid #cbd5e1; }
            td { padding: 8px 10px; border: 1px solid #e2e8f0; font-size: 11px; }
            .text-right { text-align: right; }
            .text-center { text-align: center; }
            .font-bold { font-weight: 800; }
            .kpi-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 16px; }
            .kpi-box { padding: 12px; border-radius: 8px; border: 1px solid #cbd5e1; background: #ffffff; }
            .kpi-title { font-size: 11px; color: #475569; font-weight: 700; }
            .kpi-amount { font-size: 16px; font-weight: 900; margin-top: 4px; }
            .sig-section { display: grid; grid-template-columns: 1fr 1fr; margin-top: 30px; padding-top: 10px; }
            .sig-box { text-align: center; }
            .sig-space { height: 60px; }
            @media print {
              body { padding: 0; }
              button { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div style="display: flex; justify-content: space-between; align-items: flex-start;">
              <div>
                <div class="title">BAROKAH GROUP — LAPORAN HARIAN KASIR</div>
                <div class="sub-title">${rOutlet} • Rekapitulasi Penjualan, Pengeluaran & Fisik Kas</div>
              </div>
              <div style="text-align: right;">
                <div style="font-weight: 900; font-size: 13px; color: #1e4a7c;">${rNo}</div>
                <div style="font-size: 10px; color: #64748b;">Tanggal Cetak: ${new Date().toLocaleString('id-ID')}</div>
              </div>
            </div>
          </div>

          <div class="meta-grid">
            <div class="meta-item">
              <span class="meta-label">Tanggal Laporan</span>
              <span class="meta-val">${rDate}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">Outlet Cabang</span>
              <span class="meta-val">${rOutlet}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">Kasir / Pembuat</span>
              <span class="meta-val">${rAuthor}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">Status Verifikasi</span>
              <span class="meta-val" style="color: ${report.status === 'approved' ? '#059669' : '#d97706'};">${report.status || 'Pending'}</span>
            </div>
          </div>

          <div class="kpi-row">
            <div class="kpi-box" style="border-left: 4px solid #0284c7;">
              <div class="kpi-title">TOTAL PENJUALAN BERSIH</div>
              <div class="kpi-amount" style="color: #0284c7;">Rp ${netSales.toLocaleString('id-ID')}</div>
            </div>
            <div class="kpi-box" style="border-left: 4px solid #e11d48;">
              <div class="kpi-title">TOTAL PENGELUARAN (HPP & BIAYA)</div>
              <div class="kpi-amount" style="color: #e11d48;">Rp ${totalExpense.toLocaleString('id-ID')}</div>
            </div>
            <div class="kpi-box" style="border-left: 4px solid #059669;">
              <div class="kpi-title">UANG FISIK KAS DI LACI</div>
              <div class="kpi-amount" style="color: #059669;">Rp ${cashPhysical.toLocaleString('id-ID')}</div>
            </div>
          </div>

          <div class="section-title">1. RINCIAN PENDAPATAN & PENJUALAN</div>
          <table>
            <thead>
              <tr>
                <th>Komponen Penjualan</th>
                <th>Keterangan / Kanal Pembayaran</th>
                <th class="text-right" style="width: 150px;">Nominal (IDR)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td class="font-bold">Penjualan Kas Tunai (Cash)</td>
                <td>Uang tunai diterima kasir dari pelanggan</td>
                <td class="text-right font-bold" style="color: #059669;">Rp ${cashSales.toLocaleString('id-ID')}</td>
              </tr>
              <tr>
                <td class="font-bold">Penjualan Non-Tunai</td>
                <td>QRIS, Debit, EDC, & Transfer Bank</td>
                <td class="text-right font-bold" style="color: #6366f1;">Rp ${nonCashSales.toLocaleString('id-ID')}</td>
              </tr>
              <tr>
                <td class="font-bold">Diskon & Potongan Penjualan</td>
                <td>Promo & voucher belanja pelanggan</td>
                <td class="text-right font-bold" style="color: #e11d48;">- Rp ${salesDiscount.toLocaleString('id-ID')}</td>
              </tr>
              <tr style="background: #f8fafc;">
                <td class="font-bold" colspan="2">TOTAL PENJUALAN BERSIH (NET SALES)</td>
                <td class="text-right font-bold" style="color: #0284c7; font-size: 13px;">Rp ${netSales.toLocaleString('id-ID')}</td>
              </tr>
            </tbody>
          </table>

          <div class="section-title">2. RINCIAN PENGELUARAN (HPP BAHAN BAKU & OPERASIONAL)</div>
          <table>
            <thead>
              <tr>
                <th style="width: 30px;">No</th>
                <th>Nama Bahan Baku / Jenis Biaya</th>
                <th>Kategori</th>
                <th class="text-center" style="width: 60px;">Qty</th>
                <th class="text-center" style="width: 60px;">Satuan</th>
                <th class="text-right" style="width: 110px;">Harga Satuan</th>
                <th class="text-right" style="width: 120px;">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              ${expenseRows.length === 0 ? `
                <tr>
                  <td colspan="7" class="text-center" style="color: #64748b; padding: 12px;">Tidak ada rincian baris pengeluaran.</td>
                </tr>
              ` : expenseRows.map((r, i) => `
                <tr>
                  <td class="text-center">${i + 1}</td>
                  <td class="font-bold">${r.item_name || r.name || '-'}</td>
                  <td>${r.category_type || 'Biaya'}</td>
                  <td class="text-center font-bold">${r.qty || 1}</td>
                  <td class="text-center">${r.unit || '-'}</td>
                  <td class="text-right">Rp ${(Number(r.price_per_unit || r.price || 0)).toLocaleString('id-ID')}</td>
                  <td class="text-right font-bold" style="color: #e11d48;">Rp ${(Number(r.subtotal || r.amount || 0)).toLocaleString('id-ID')}</td>
                </tr>
              `).join('')}
              <tr style="background: #f8fafc;">
                <td class="font-bold" colspan="6">TOTAL PENGELUARAN</td>
                <td class="text-right font-bold" style="color: #e11d48; font-size: 13px;">Rp ${totalExpense.toLocaleString('id-ID')}</td>
              </tr>
            </tbody>
          </table>

          <div class="sig-section">
            <div class="sig-box">
              <div>Dibuat Oleh (Kasir / Staff):</div>
              <div class="sig-space"></div>
              <div style="font-weight: 800; text-decoration: underline;">${rAuthor}</div>
              <div style="font-size: 10px; color: #64748b;">Kasir Operasional</div>
            </div>
            <div class="sig-box">
              <div>Disetujui Oleh (Supervisor / Owner):</div>
              <div class="sig-space"></div>
              <div style="font-weight: 800; text-decoration: underline;">( .................................... )</div>
              <div style="font-size: 10px; color: #64748b;">Manajemen / Owner Barokah</div>
            </div>
          </div>

          <script>
            window.onload = function() { window.print(); };
          </script>
        </body>
      </html>
    `);
    printWin.document.close();
  }, [currentOutlet, userSession]);

  // HANDLER: DOWNLOAD CSV LAPORAN HARIAN
  const handleDownloadDailyReportCsv = useCallback((report) => {
    if (!report) return;
    const rDate = report.date || new Date().toISOString().split('T')[0];
    const rNo = report.report_no || report.id || `LAP-${rDate}`;
    const rOutlet = report.branch_name || report.outlet_name || currentOutlet.name || 'Outlet Barokah';
    const rAuthor = report.author_name || report.cashier_name || userSession?.name || 'Kasir';
    const expenseRows = Array.isArray(report.expense_rows) ? report.expense_rows : [];

    let csv = `LAPORAN HARIAN POS KASIR - BAROKAH GROUP\n`;
    csv += `No Laporan,${rNo}\n`;
    csv += `Tanggal,${rDate}\n`;
    csv += `Outlet Cabang,${rOutlet}\n`;
    csv += `Pembuat (Kasir),${rAuthor}\n`;
    csv += `Status,${report.status || 'Pending'}\n\n`;

    csv += `RINGKASAN KEUANGAN\n`;
    csv += `Penjualan Tunai (Cash),${Number(report.cash_sales || 0)}\n`;
    csv += `Penjualan Non-Tunai,${Number(report.non_cash_sales || 0)}\n`;
    csv += `Diskon Penjualan,${Number(report.sales_discount || 0)}\n`;
    csv += `Total Penjualan Bersih (Net Sales),${Number(report.net_sales || 0)}\n`;
    csv += `Total Pengeluaran,${Number(report.total_expense || 0)}\n`;
    csv += `HPP Bahan Baku,${Number(report.cogs_expense || 0)}\n`;
    csv += `Laba Kotor,${Number(report.gross_profit || 0)}\n`;
    csv += `Uang Fisik Kas di Laci,${Number(report.cash_physical || 0)}\n\n`;

    csv += `RINCIAN PENGELUARAN\n`;
    csv += `No,Nama Item / Bahan,Kategori,Qty,Satuan,Harga Satuan,Subtotal\n`;
    expenseRows.forEach((r, idx) => {
      csv += `${idx + 1},"${r.item_name || r.name || ''}","${r.category_type || ''}",${r.qty || 1},"${r.unit || ''}",${Number(r.price_per_unit || 0)},${Number(r.subtotal || 0)}\n`;
    });

    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Laporan_Harian_${rOutlet.replace(/\s+/g, '_')}_${rDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [currentOutlet, userSession]);

  // HANDLER: BUKA MODAL WHATSAPP SUMMARY
  const handleOpenWhatsAppModal = useCallback((report) => {
    if (!report) return;
    const defaultOwnerPhone = masterData?.settings?.ownerWaPhone || '6281234567890';
    setWhatsAppReportData(report);
    setTargetWhatsAppPhone(defaultOwnerPhone);
    setCustomWhatsAppPhone('');
    setIsCopiedWhatsApp(false);
    setShowDailyReportWhatsAppModal(true);
  }, [masterData]);

  // BUILDER: TEKS WHATSAPP LAPORAN HARIAN
  const buildDailyReportWhatsAppText = useCallback((report) => {
    if (!report) return '';
    const rDate = report.date || new Date().toISOString().split('T')[0];
    const rNo = report.report_no || report.id || `LAP-${rDate}`;
    const rOutlet = report.branch_name || report.outlet_name || currentOutlet.name || 'Outlet Barokah';
    const rAuthor = report.author_name || report.cashier_name || userSession?.name || 'Kasir';
    const netSales = Number(report.net_sales || 0);
    const cashSales = Number(report.cash_sales || 0);
    const nonCashSales = Number(report.non_cash_sales || 0);
    const salesDiscount = Number(report.sales_discount || 0);
    const totalExpense = Number(report.total_expense || 0);
    const cogsExpense = Number(report.cogs_expense || 0);
    const cashPhysical = Number(report.cash_physical || report.actual_cash || 0);
    const grossProfit = Number(report.gross_profit || (netSales - totalExpense));
    const expenseRows = Array.isArray(report.expense_rows) ? report.expense_rows : [];

    let msg = `📊 *LAPORAN HARIAN KASIR POS — BAROKAH GROUP*\n`;
    msg += `🏢 *Cabang:* ${rOutlet}\n`;
    msg += `📅 *Tanggal Shift:* ${rDate}\n`;
    msg += `👤 *Kasir / Penginput:* ${rAuthor}\n`;
    msg += `🧾 *Nomor Laporan:* ${rNo}\n\n`;

    msg += `💰 *RINGKASAN PENDAPATAN:*\n`;
    msg += `• 💵 *Penjualan Tunai (Cash):* Rp ${cashSales.toLocaleString('id-ID')}\n`;
    msg += `• 📱 *Penjualan Non-Tunai (QRIS/EDC):* Rp ${nonCashSales.toLocaleString('id-ID')}\n`;
    if (salesDiscount > 0) {
      msg += `• 🏷️ *Diskon / Potongan:* - Rp ${salesDiscount.toLocaleString('id-ID')}\n`;
    }
    msg += `• 📈 *Total Penjualan Bersih (Net Sales):* Rp ${netSales.toLocaleString('id-ID')}\n\n`;

    msg += `💸 *PENGELUARAN & OPERASIONAL:*\n`;
    msg += `• 🛒 *Total Pengeluaran:* Rp ${totalExpense.toLocaleString('id-ID')}\n`;
    if (cogsExpense > 0) {
      msg += `• 🥦 *Belanja HPP Bahan Baku:* Rp ${cogsExpense.toLocaleString('id-ID')}\n`;
    }
    msg += `• 📊 *Estimasi Laba Kotor:* Rp ${grossProfit.toLocaleString('id-ID')}\n\n`;

    if (expenseRows.length > 0) {
      msg += `📋 *Rincian Belanja Bahan / Biaya:*\n`;
      expenseRows.slice(0, 5).forEach((r, idx) => {
        msg += `  ${idx + 1}. ${r.item_name || r.name} (${r.qty || 1} ${r.unit || ''}) = Rp ${Number(r.subtotal || r.amount || 0).toLocaleString('id-ID')}\n`;
      });
      if (expenseRows.length > 5) {
        msg += `  _... dan ${expenseRows.length - 5} item lainnya_\n`;
      }
      msg += `\n`;
    }

    msg += `💵 *UANG FISIK KAS DI LACI:* Rp ${cashPhysical.toLocaleString('id-ID')}\n`;
    msg += `📌 *Status Approval:* ${report.status === 'approved' ? '✅ APPROVED' : '⏳ PENDING (Menunggu Persetujuan)'}\n\n`;
    msg += `_Laporan otomatis dari POS Kasir Mobile Barokah Group_`;

    return msg;
  }, [currentOutlet, userSession]);

  // HANDLER: KIRIM PESAN KE WHATSAPP
  const handleSendDailyReportWhatsApp = useCallback(() => {
    if (!whatsAppReportData) return;
    const phone = (customWhatsAppPhone || targetWhatsAppPhone || '').replace(/\D/g, '');
    if (!phone) {
      alert('Harap masukkan nomor WhatsApp tujuan.');
      return;
    }
    const cleanPhone = phone.startsWith('0') ? '62' + phone.slice(1) : (phone.startsWith('62') ? phone : '62' + phone);
    const text = buildDailyReportWhatsAppText(whatsAppReportData);
    const encoded = encodeURIComponent(text);
    window.open(`https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encoded}`, '_blank');
  }, [whatsAppReportData, customWhatsAppPhone, targetWhatsAppPhone, buildDailyReportWhatsAppText]);

  const getTransferStokMasuk = useCallback((ingName, targetDate, targetOutletId) => {
    if (!ingName) return 0;
    let totalIn = 0;
    const transfers = [
      ...(masterData?.approvedTransfers || []),
      ...(masterData?.stockTransfer || [])
    ];

    transfers.forEach(trf => {
      const tDate = trf.date || trf.tanggal;
      const destOutlet = trf.destination_outlet_id || trf.target_outlet_id || trf.destination_outlet || trf.to_outlet_id;

      const dateMatch = !targetDate || !tDate || tDate === targetDate;
      const outletMatch = !targetOutletId || !destOutlet || String(destOutlet) === String(targetOutletId);

      if (dateMatch && outletMatch) {
        const itemsList = trf.items || trf.transfer_items || [trf];
        if (Array.isArray(itemsList)) {
          itemsList.forEach(item => {
            const nameStr = item.item_name || item.nama_barang || item.name || trf.item_name || '';
            if (nameStr.trim().toLowerCase() === ingName.trim().toLowerCase()) {
              totalIn += Number(item.qty || item.jumlah || trf.qty || 0);
            }
          });
        }
      }
    });

    return totalIn;
  }, [masterData]);

  const getTransferStokKeluar = useCallback((ingName, targetDate, targetOutletId) => {
    if (!ingName) return 0;
    let totalOut = 0;
    const transfers = [
      ...(masterData?.approvedTransfers || []),
      ...(masterData?.stockTransfer || [])
    ];

    transfers.forEach(trf => {
      const tDate = trf.date || trf.tanggal;
      const srcOutlet = trf.source_outlet_id || trf.from_outlet_id || trf.source_outlet;

      const dateMatch = !targetDate || !tDate || tDate === targetDate;
      const outletMatch = !targetOutletId || !srcOutlet || String(srcOutlet) === String(targetOutletId);

      if (dateMatch && outletMatch) {
        const itemsList = trf.items || trf.transfer_items || [trf];
        if (Array.isArray(itemsList)) {
          itemsList.forEach(item => {
            const nameStr = item.item_name || item.nama_barang || item.name || trf.item_name || '';
            if (nameStr.trim().toLowerCase() === ingName.trim().toLowerCase()) {
              totalOut += Number(item.qty || item.jumlah || trf.qty || 0);
            }
          });
        }
      }
    });

    return totalOut;
  }, [masterData]);

  const getStokRusakFromWaste = useCallback((ingName, targetDate, targetOutletId) => {
    if (!ingName) return 0;
    let totalWaste = 0;
    const l1 = masterData?.damagedGoods || [];
    const l2 = masterData?.approvedWaste || [];
    const l3 = (masterData?.stockMovement || []).filter(m => m.type === 'WASTE');

    const combinedList = [...l1, ...l2, ...l3];

    combinedList.forEach(w => {
      const wDate = w.date || w.tanggal || w.tanggal_waktu;
      const wOutlet = w.outlet_id || w.branch_id || w.outletId;

      const dateMatch = !targetDate || !wDate || String(wDate).startsWith(targetDate);
      const outletMatch = !targetOutletId || !wOutlet || String(wOutlet) === String(targetOutletId);

      if (dateMatch && outletMatch) {
        const itemsList = w.items || w.waste_items || [w];
        if (Array.isArray(itemsList)) {
          itemsList.forEach(item => {
            const nameStr = item.item_name || item.nama_barang || item.name || w.item_name || '';
            if (nameStr.trim().toLowerCase() === ingName.trim().toLowerCase()) {
              totalWaste += Number(item.qty || item.quantity || item.stok_rusak || item.jumlah || w.qty || w.stok_rusak || 0);
            }
          });
        }
      }
    });

    return totalWaste;
  }, [masterData]);

  const handleOpenStokOpnameModal = useCallback((existingReport = null) => {
    const todayStr = new Date().toISOString().split('T')[0];
    const targetDate = existingReport?.date || todayStr;
    const targetOutletId = existingReport?.outlet_id || currentOutlet.id || 1;

    const rawIngredients = masterData.ingredients || [];
    const activeIngs = rawIngredients.filter(ing =>
      ing.tampilkan_di_apk !== 'Inaktif' &&
      ing.tampilkan_di_apk !== 'inaktif' &&
      ing.status !== 'Inaktif' &&
      ing.status !== 'inaktif'
    );

    const initialRows = activeIngs.map((ing, idx) => {
      const name = ing.name;
      const unit = ing.unit || 'kg';

      const matchPrev = existingReport?.items?.find(i => (i.item_name || i.nama_barang || '').toLowerCase() === name.toLowerCase())
        || (existingReport && (existingReport.item_name || '').toLowerCase() === name.toLowerCase() ? existingReport : null);

      const stokAwal = matchPrev?.stok_awal !== undefined ? matchPrev.stok_awal : 0;
      const stokFisik = matchPrev?.stok_fisik !== undefined ? matchPrev.stok_fisik : '';

      return {
        id: ing.id || `ing-opname-${idx}`,
        item_name: name,
        unit: unit,
        stok_awal: stokAwal,
        stok_fisik: stokFisik
      };
    });

    setOpnameBatchRows(initialRows);
    setLogDate(targetDate);
    setLogNo(existingReport?.report_no || existingReport?.id || `SO-${targetDate.replace(/-/g,'')}-${Math.floor(100 + Math.random() * 900)}`);
    setLogSubmittedBy(existingReport?.submitted_by || userSession?.name || currentUserSession?.name || 'Kasir Mobile');
    setLogOutletId(targetOutletId);
    setShowAddLogisticsModal(true);
  }, [masterData, currentOutlet, userSession, currentUserSession]);


  // LAPORAN SHIFT CLOSING ke hardware Bluetooth printer
  const handlePrintShiftClosingReport = useCallback(async (shiftData) => {
    if (!shiftData) return;
    const outletName = (currentOutlet?.name || shiftData.branch_name || 'POS KASIR BAROKAH').toUpperCase();
    const fmtRp = (n) => `Rp ${Number(n || 0).toLocaleString('id-ID')}`;
    const charsPerLine = printerPaperWidth === '80' ? 48 : 32;
    const div = '-'.repeat(charsPerLine);
    const divd = '='.repeat(charsPerLine);

    const lines = [
      '[C][B]' + outletName,
      '[C]REKAPITULASI SHIFT CLOSING KASIR',
      '[C][B]REKAP KHUSUS KASIR',
      div,
      `No. Laporan : ${shiftData.id || shiftData.report_no || '-'}`,
      `Tanggal     : ${shiftData.date || ''}`,
      `Kasir       : ${shiftData.user_name || shiftData.author_name || shiftData.cashier_name || 'Kasir'}`,
      div,
      `Modal Awal Kas  : ${fmtRp(shiftData.initial_cash || 0)}`,
      `Total Struk POS : ${shiftData.total_receipts || shiftData.tx_count || 0} Struk`,
      '[B]' + `Total Omset     : ${fmtRp(shiftData.gross_sales || shiftData.total_sales || 0)}`,
      `Penjualan Cash  : ${fmtRp(shiftData.cash_sales || 0)}`,
      `Non-Cash        : ${fmtRp(shiftData.non_cash_sales || 0)}`,
      `Pengeluaran     : ${fmtRp(shiftData.total_expense || shiftData.petty_expense || 0)}`,
      div,
      '[B]' + `Kas Fisik Laci  : ${fmtRp(shiftData.cash_physical || shiftData.physical_cash || 0)}`,
      `Selisih Kas     : ${fmtRp(shiftData.variance || 0)}`,
      divd,
      '[C]*** HARAP DISIMPAN DI LACI KASIR ***',
      '',
      ''
    ].join('\n');

    await printTextToBluetooth(lines);
  }, [currentOutlet, printerPaperWidth, printTextToBluetooth]);
  const handleCheckoutOccupiedTable = (table) => {
    if (!table || !table.pendingOrder) return;
    setCart([...table.pendingOrder.items]);
    setOpenedOriginalCart(JSON.parse(JSON.stringify(table.pendingOrder.items))); // Store original items snapshot
    setActiveRecallOrderId(table.pendingOrder.holdTx?.id || `HOLD-${table.id}`);
    setSelectedCustomer(table.pendingOrder.customerName || 'Pelanggan Umum');
    setSelectedTableId(table.id);
    setOrderType('Dine In');
    setShowTableMapModal(false);
  };

  // RECALL HELD ORDER (DINE IN OR TAKE AWAY)
  const handleRecallPendingOrder = (row) => {
    if (!row || !row.items) return;
    setCart([...row.items]);
    setOpenedOriginalCart(JSON.parse(JSON.stringify(row.items)));
    setActiveRecallOrderId(row.orderId || row.heldOrderId || row.receiptNo);
    setSelectedCustomer(row.customerName || 'Pelanggan Umum');
    if (row.tableId) {
      setSelectedTableId(row.tableId);
      setOrderType('Dine In');
    } else {
      setOrderType(row.orderType || 'Take Away');
    }
    setActiveNavTab('kasir');
    setShowTableMapModal(false);
  };

  // DELETE / CANCEL HELD PENDING ORDER FROM QUEUE
  const handleDeletePendingOrder = (row, e = null) => {
    if (e) e.stopPropagation();
    if (!row) return;

    const targetId = row.orderId || row.heldOrderId || row.receiptNo;
    const custName = row.customerName || 'Pelanggan Umum';

    if (window.confirm(`Apakah Anda yakin ingin menghapus / membatalkan pesanan gantung ${row.receiptNo} (${custName})?`)) {
      if (row.tableId) {
        setTableStatusMap(prev => {
          const copy = { ...prev };
          delete copy[row.tableId];
          return copy;
        });
        fetch(getApiUrl(`/api/pos/table-orders/${row.tableId}?outlet_id=${currentOutlet.id}`), {
          method: 'DELETE'
        }).catch(() => {});
      }
      
      setHeldOrdersList(prev => prev.filter(o => o.id !== targetId && o.id !== row.heldOrderId && o.id !== row.orderId));

      if (activeRecallOrderId === targetId) {
        handleClearCart();
        setActiveRecallOrderId(null);
        setOpenedOriginalCart(null);
      }
    }
  };

  // QUICK PAY FROM PENDING ORDERS QUEUE
  const handleQuickPayPendingOrder = (row, e = null) => {
    if (e) e.stopPropagation();
    if (!row || !row.items) return;
    handleRecallPendingOrder(row);
    setSelectedPaymentMethod('Cash');
    setCustomTxDate(new Date().toLocaleDateString('en-CA')); // reset ke hari ini saat checkout baru
    setTenderedCash('');
    setShowPaymentScreenModal(true);
  };

  // State Guard: Anti-double checkout & rapid checkout protection
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [lastPaymentTimestamp, setLastPaymentTimestamp] = useState(0);
  const [lastProcessedCartSummary, setLastProcessedCartSummary] = useState(null);

  // TAP 2: EXECUTE INSTANT PAYMENT & RESET TABLE TO KOSONG
  const handleExecuteQuickPayment = (methodName, customTendered = null) => {
    if (cart.length === 0) return;
    if (isProcessingPayment) return;

    // GUARD 1: Peringatan Nominal Rendah / Anomali (< Rp 5.000)
    if (cartTotal < 5000) {
      if (!window.confirm(`⚠️ PERINGATAN NOMINAL ANOMALI:\n\nTotal transaksi hanya ${formatRupiah(cartTotal)}.\n\nApakah Anda yakin ingin memproses struk penjualan ini?`)) {
        return;
      }
    }

    // GUARD 2: Pencegahan Double Checkout dalam rentang < 15 detik untuk menu & nominal yang sama
    const currentCartSummary = `${cartTotal}-${cart.map(i => `${i.id || i.name}:${i.qty}`).join('|')}`;
    const nowMs = Date.now();
    if (lastProcessedCartSummary === currentCartSummary && (nowMs - lastPaymentTimestamp < 15000)) {
      const timeDiffSec = Math.max(1, Math.round((nowMs - lastPaymentTimestamp) / 1000));
      if (!window.confirm(`⚠️ PERINGATAN POTENSI DOUBLE INPUT / STRUK GANDA:\n\nPesanan dengan menu dan nominal persis sama (${formatRupiah(cartTotal)}) baru saja selesai diproses ${timeDiffSec} detik yang lalu.\n\nApakah Anda yakin ingin MEMBUAT STRUK BARU LAGI untuk pesanan ini?`)) {
        return;
      }
    }

    setIsProcessingPayment(true);
    setTimeout(() => setIsProcessingPayment(false), 2000);
    setLastPaymentTimestamp(nowMs);
    setLastProcessedCartSummary(currentCartSummary);

    // 1. Snapshot State Keranjang Saat Ini (Agar Eksekusi Instan & Bebas Race Condition)
    const paidCart = [...cart];
    const paidCartSubtotal = cartSubtotal;
    const paidTotalItemDiscounts = totalItemDiscounts;
    const paidOverallSummaryDiscount = overallSummaryDiscount;
    const paidDiscountAmount = discountAmount;
    const paidCartTotal = cartTotal;
    const paidSelectedCustomer = selectedCustomer || 'Pelanggan Umum';
    const paidSelectedTableId = selectedTableId;
    const paidOrderType = orderType;
    const paidSelectedTableObj = selectedTableObj;
    const paidActiveRecallOrderId = activeRecallOrderId;

    // 2. OPTIMISTIC INSTANT UI RESPONSE: Tutup modal & Bersihkan cart seketika (0ms lag)
    setShowPaymentScreenModal(false);
    handleClearCart();
    playSuccessKaching();

    const isSuperAdminUser = (() => {
      const r = String(currentUserSession?.role || userSession?.role || '').toLowerCase();
      return r.includes('super') || r.includes('admin') || r.includes('owner');
    })();
    const currentDate = isSuperAdminUser && customTxDate ? customTxDate : new Date().toISOString().split('T')[0];

    const allKnownTxs = [
      ...(masterData?.salesTransactions || []),
      ...(masterData?.transactions || [])
    ];
    const receiptNo = generateDocNumber({
      prefix: 'TRX',
      outlet: currentOutlet,
      outlets: outlets,
      date: currentDate,
      existingRecords: allKnownTxs,
      digits: 5
    });
    const _now2601 = new Date();
    const currentTime = `${String(_now2601.getHours()).padStart(2,'0')}:${String(_now2601.getMinutes()).padStart(2,'0')}:${String(_now2601.getSeconds()).padStart(2,'0')}`;
    const paidVal = customTendered !== null && customTendered !== '' ? Number(customTendered) : paidCartTotal;

    const isOnlineDelivery = ['GrabFood', 'Go-Food', 'ShopeeFood', 'Maxim Food'].includes(methodName);
    const finalCategory = isOnlineDelivery 
      ? `Penjualan Online Delivery (${methodName})`
      : (paidOrderType === 'Dine In' ? 'Penjualan Dine-in' : 'Penjualan Takeaway / Online');

    const onlineNoteSuffix = onlineOrderId.trim() ? ` [Kode: ${onlineOrderId.trim()}]` : '';
    const finalNotes = isOnlineDelivery
      ? `Online Delivery (${methodName})${onlineNoteSuffix}`
      : `${paidOrderType} (${paidOrderType === 'Dine In' ? (paidSelectedTableObj?.number || 'Dine In') : 'Take Away'}) - Pembayaran ${methodName}`;

    const newTx = {
      id: receiptNo,
      receipt_no: receiptNo,
      date: currentDate,
      time: currentTime,
      outlet_id: Number(currentOutlet.id),
      branch_id: Number(currentOutlet.id),
      outlet: currentOutlet.name,
      branch_name: currentOutlet.name,
      customer_name: isOnlineDelivery && paidSelectedCustomer === 'Pelanggan Umum' ? `Pelanggan ${methodName}` : paidSelectedCustomer,
      order_type: isOnlineDelivery ? 'Online Delivery' : paidOrderType,
      type: 'income',
      category: finalCategory,
      table_number: isOnlineDelivery ? `Online (${methodName})` : (paidOrderType === 'Dine In' ? (paidSelectedTableObj?.number || (paidSelectedTableId ? `Meja ${paidSelectedTableId}` : 'Meja 01')) : 'N/A (Take Away)'),
      items: paidCart.map(item => ({
        name: item.name,
        qty: item.qty,
        price_unit: item.price,
        discount_unit: item.discount || 0,
        amount: Math.max(0, (item.price - (item.discount || 0))) * item.qty
      })),
      subtotal: paidCartSubtotal,
      item_discounts: paidTotalItemDiscounts,
      summary_discount: paidOverallSummaryDiscount,
      discount_amount: paidDiscountAmount,
      amount: paidCartTotal,
      paid_amount: paidVal,
      cash_paid: paidVal,
      tendered: paidVal,
      bayar: paidVal,
      change_amount: Math.max(0, paidVal - paidCartTotal),
      kembalian: Math.max(0, paidVal - paidCartTotal),
      change: Math.max(0, paidVal - paidCartTotal),
      payment_method: methodName,
      cashier: currentUserSession?.name || 'Kasir Mobile',
      notes: finalNotes,
      status: 'approved'
    };

    setOnlineOrderId('');

    // Auto-save new customer into Web Master Data (masterData.customers) if not registered yet
    const rawCustomerName = (paidSelectedCustomer || 'Pelanggan Umum').trim();
    const finalCustomerName = rawCustomerName === '' ? 'Pelanggan Umum' : rawCustomerName;
    const finalTotalAmount = paidCartTotal;

    const pointRatio = masterData?.loyaltyPointRatio || 100000;
    const earnedPoints = Math.floor((finalTotalAmount || 0) / pointRatio);
    const pointsDeducted = methodName === 'Pembayaran Poin' ? Math.ceil(finalTotalAmount / 1000) : 0;

    let updatedCustomersList = masterData?.customers || [];

    if (finalCustomerName !== 'Pelanggan Umum') {
      const existingIdx = updatedCustomersList.findIndex(c => c.name?.toLowerCase() === finalCustomerName.toLowerCase());
      const posOutletId = currentOutlet?.id || 'ALL';
      const posOutletName = currentOutlet?.name || 'Cabang POS';

      if (existingIdx >= 0) {
        const existingCust = updatedCustomersList[existingIdx];
        const currentPts = Number(existingCust.points || existingCust.loyalty_points || 0);
        const newPts = Math.max(0, currentPts + earnedPoints - pointsDeducted);
        const currentSpend = Number(existingCust.total_spend || 0) + finalTotalAmount;
        const currentVisits = Number(existingCust.total_visits || 0) + 1;

        let newTier = existingCust.tier || 'Reguler';
        if (currentSpend >= 5000000) newTier = 'Platinum';
        else if (currentSpend >= 2000000) newTier = 'Gold';
        else if (currentSpend >= 500000) newTier = 'Silver';

        const updatedCust = {
          ...existingCust,
          points: newPts,
          loyalty_points: newPts,
          total_spend: currentSpend,
          total_visits: currentVisits,
          tier: newTier,
          last_visit: currentDate,
          updated_at: new Date().toISOString()
        };

        updatedCustomersList = [
          ...updatedCustomersList.slice(0, existingIdx),
          updatedCust,
          ...updatedCustomersList.slice(existingIdx + 1)
        ];
      } else {
        const newCustId = generateDocNumber({
          prefix: 'CUST',
          outlet: currentOutlet,
          outlets: outlets,
          date: currentDate,
          existingRecords: updatedCustomersList,
          digits: 4
        });
        const createdCust = {
          id: newCustId,
          code: newCustId,
          name: finalCustomerName,
          phone: '-',
          email: '-',
          address: posOutletName,
          outlet_id: posOutletId,
          outlet_name: posOutletName,
          tier: finalTotalAmount >= 2000000 ? 'Gold' : (finalTotalAmount >= 500000 ? 'Silver' : 'Reguler'),
          points: earnedPoints,
          loyalty_points: earnedPoints,
          total_spend: finalTotalAmount,
          total_visits: 1,
          join_date: currentDate,
          last_visit: currentDate,
          created_at: new Date().toISOString()
        };
        updatedCustomersList = [createdCust, ...updatedCustomersList];
      }
    }

    // 1. Stock Movements for Menu Items Sold (Outbound)
    const newStockMovements = [];
    let updatedProducts = masterData?.products || [];
    let updatedIngredients = masterData?.ingredients || [];
    const masterProductsList = masterData?.products || [];
    const masterIngredientsList = masterData?.ingredients || [];

    paidCart.forEach(cartItem => {
      const qtySold = cartItem.qty || 1;
      newStockMovements.push({
        id: `move-${receiptNo}-${cartItem.id || cartItem.name}-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        date: currentDate,
        time: currentTime,
        outlet_id: Number(currentOutlet.id),
        type: 'OUT',
        item_name: cartItem.name,
        item_type: 'Produk Jadi',
        qty: qtySold,
        unit: 'porsi',
        supplier: `Penjualan Kasir POS (${receiptNo})`,
        created_by: currentUserSession?.name || 'Kasir Mobile',
        price_unit: cartItem.price,
        total_price: cartItem.price * qtySold,
        type_input: 'auto_pos'
      });

      // Update product item stock
      updatedProducts = updatedProducts.map(p => {
        if (p.id === cartItem.id || String(p.id) === String(cartItem.id)) {
          const currentStk = Number(p.stock || p.stok || 0);
          return {
            ...p,
            stock: Math.max(0, currentStk - qtySold),
            stok: Math.max(0, currentStk - qtySold)
          };
        }
        return p;
      });

      // Recipe & Ingredients Deduction
      const masterProduct = masterProductsList.find(p => p.id === cartItem.id || String(p.id) === String(cartItem.id) || p.name === cartItem.name);
      const itemLower = (cartItem.name || '').toLowerCase();

      if (masterProduct && masterProduct.compositions && masterProduct.compositions.length > 0) {
        masterProduct.compositions.forEach(comp => {
          const ingQty = Number(comp.amount || 0) * qtySold;
          newStockMovements.push({
            id: `move-ing-${receiptNo}-${comp.ingredient_id}-${Date.now()}-${Math.random().toString(36).substring(7)}`,
            date: currentDate,
            time: currentTime,
            outlet_id: Number(currentOutlet.id),
            type: 'OUT',
            item_name: comp.ingredient_name || comp.name || 'Bahan Baku',
            item_type: 'Bahan Baku',
            qty: ingQty,
            unit: comp.unit || 'gram',
            supplier: `Pemakaian Menu POS: ${cartItem.name}`,
            created_by: 'Kasir Mobile APK',
            price_unit: comp.cost_per_unit || 0,
            total_price: Math.round((comp.cost_per_unit || 0) * ingQty),
            type_input: 'auto_pos'
          });

          updatedIngredients = updatedIngredients.map(ing => {
            if (String(ing.id) === String(comp.ingredient_id)) {
              const currentStk = Number(ing.stock || ing.stok || 0);
              return { ...ing, stock: Math.max(0, currentStk - ingQty), stok: Math.max(0, currentStk - ingQty) };
            }
            return ing;
          });
        });
      } else {
        const matchedIng = masterIngredientsList.find(ing => {
          const ingLower = (ing.name || '').toLowerCase();
          if (itemLower.includes('ayam') || itemLower.includes('chicken')) return ingLower.includes('ayam');
          if (itemLower.includes('sapi') || itemLower.includes('beef') || itemLower.includes('steak')) return ingLower.includes('daging') || ingLower.includes('sapi');
          if (itemLower.includes('nasi') || itemLower.includes('rice')) return ingLower.includes('beras');
          if (itemLower.includes('teh') || itemLower.includes('tea')) return ingLower.includes('teh');
          if (itemLower.includes('kopi') || itemLower.includes('espresso')) return ingLower.includes('kopi');
          return ingLower.includes(itemLower) || itemLower.includes(ingLower);
        });

        if (matchedIng) {
          newStockMovements.push({
            id: `move-ing-${receiptNo}-${matchedIng.id}-${Date.now()}-${Math.random().toString(36).substring(7)}`,
            date: currentDate,
            time: currentTime,
            outlet_id: Number(currentOutlet.id),
            type: 'OUT',
            item_name: matchedIng.name,
            item_type: 'Bahan Baku',
            qty: qtySold,
            unit: matchedIng.unit || 'porsi',
            supplier: `Pemakaian Menu POS: ${cartItem.name}`,
            created_by: 'Kasir Mobile APK',
            price_unit: matchedIng.cost || matchedIng.price_per_unit || 0,
            total_price: Math.round((matchedIng.cost || matchedIng.price_per_unit || 0) * qtySold),
            type_input: 'auto_pos'
          });

          updatedIngredients = updatedIngredients.map(ing => {
            if (String(ing.id) === String(matchedIng.id)) {
              const currentStk = Number(ing.stock || ing.stok || 0);
              return { ...ing, stock: Math.max(0, currentStk - qtySold), stok: Math.max(0, currentStk - qtySold) };
            }
            return ing;
          });
        }
      }
    });

    const isOnlineNow = typeof navigator !== 'undefined' ? navigator.onLine : true;
    const finalTx = {
      ...newTx,
      status: isOnlineNow ? 'approved' : 'offline_pending',
      is_offline_pending: !isOnlineNow
    };

    // Save transaction directly into Web Master Data
    setMasterData(prev => {
      const updated = {
        ...prev,
        _lastUpdated: Date.now(),
        customers: updatedCustomersList,
        products: updatedProducts,
        ingredients: updatedIngredients,
        stockMovement: [...(prev?.stockMovement || []), ...newStockMovements],
        salesTransactions: [finalTx, ...(prev?.salesTransactions || [])],
        transactions: [finalTx, ...(prev?.transactions || [])]
      };

      // 1. Simpan Outbox Queue Lokal (Guaranteed Persistence)
      try {
        const qRaw = localStorage.getItem('MRIS_POS_OFFLINE_TX_QUEUE');
        const q = qRaw ? JSON.parse(qRaw) : [];
        const filteredQ = q.filter(item => String(item.id || item.receipt_no || '') !== String(finalTx.id || finalTx.receipt_no || ''));
        filteredQ.unshift(finalTx);
        localStorage.setItem('MRIS_POS_OFFLINE_TX_QUEUE', JSON.stringify(filteredQ));
        setOfflineQueueCount(filteredQ.length);
      } catch (e) {}

      // 2. Pemicu Pengiriman Langsung ke Server VPS
      fetch(getApiUrl('/api/pos/transaction'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(finalTx)
      })
      .then(res => res.json())
      .then(resData => {
        if (resData && (resData.success || resData.status === 'success')) {
          try {
            const qRaw = localStorage.getItem('MRIS_POS_OFFLINE_TX_QUEUE');
            const q = qRaw ? JSON.parse(qRaw) : [];
            const remaining = q.filter(item => String(item.id || item.receipt_no || '') !== String(finalTx.id || finalTx.receipt_no || ''));
            localStorage.setItem('MRIS_POS_OFFLINE_TX_QUEUE', JSON.stringify(remaining));
            setOfflineQueueCount(remaining.length);
          } catch (e) {}
        }
      })
      .catch(() => {
        doFlushOfflineQueue();
      });

      return updated;
    });

    // HAPUS PERMANEN TIKET DARI KDS DAPUR & BAR SAAT PEMBAYARAN KASIR SELESAI
    // (Pesanan lunas = otomatis selesai = langsung hilang dari layar KDS tanpa menunggu tombol manual)
    const targetsToDelete = [
      paidSelectedTableId,
      paidActiveRecallOrderId,
      `TO-${currentOutlet.id}-${paidSelectedTableId}`,
      `HOLD-${paidSelectedTableId}`,
      `KDS-${newTx.id}`,
      paidSelectedTableObj?.number
    ].filter(Boolean);

    targetsToDelete.forEach(tId => {
      fetch(getApiUrl(`/api/pos/table-orders/${encodeURIComponent(tId)}?outlet_id=${currentOutlet.id}`), {
        method: 'DELETE'
      }).catch(() => {});
    });

    // Reset Table status back to Available (Kosong) & remove from heldOrdersList
    if (paidSelectedTableId) {
      setTableStatusMap(prev => {
        const copy = { ...prev };
        delete copy[paidSelectedTableId];
        return copy;
      });
    }
    if (paidActiveRecallOrderId) {
      setHeldOrdersList(prev => prev.filter(o => o.id !== paidActiveRecallOrderId && (paidSelectedTableId ? (o.tableId !== paidSelectedTableId && o.table_id !== paidSelectedTableId) : true)));
      setActiveRecallOrderId(null);
    } else if (paidSelectedTableId) {
      setHeldOrdersList(prev => prev.filter(o => o.tableId !== paidSelectedTableId && o.table_id !== paidSelectedTableId));
    }

    setOpenedOriginalCart(null);
    setLastCompletedTx(newTx);
    playSuccessKaching();
    handleClearCart();
    setShowReceiptModal(true);
    handleExecuteBatchPrint(newTx, { printKitchen: false, printBar: false, printTableCopy: false, printCashierCopy: true });
  };

  // Handle Petty Expense Entry
  const handleAddPettyExpense = (e) => {
    e.preventDefault();
    const expDate = new Date().toISOString().split('T')[0];
    const expCode = generateDocNumber({
      prefix: 'EXP',
      outlet: currentOutlet,
      outlets: outlets,
      date: expDate,
      existingRecords: [
        ...pettyExpenses,
        ...(masterData?.expenses || []),
        ...(masterData?.transactions?.filter(t => t.type === 'expense') || [])
      ],
      digits: 5
    });
    const newExp = {
      id: expCode,
      code: expCode,
      name: pettyExpenseName,
      amount: Number(pettyExpenseAmount),
      date: expDate,
      time: (() => { const _n = new Date(); return `${String(_n.getHours()).padStart(2,'0')}:${String(_n.getMinutes()).padStart(2,'0')}:${String(_n.getSeconds()).padStart(2,'0')}`; })()
    };
    const updatedExp = [newExp, ...pettyExpenses];
    setPettyExpenses(updatedExp);
    try { localStorage.setItem('MRIS_POS_PETTY_EXPENSES', JSON.stringify(updatedExp)); } catch (e) {}
    setPettyExpenseName('');
    setPettyExpenseAmount('');
  };

  // Handle Logistics Request Submission
  const handleAddLogisticsRequest = (e) => {
    e.preventDefault();
    if (!logisticsItemName || !logisticsQty) return;

    const reqDate = new Date().toISOString().split('T')[0];
    const poCode = generateDocNumber({
      prefix: 'PO',
      outlet: currentOutlet,
      outlets: outlets,
      date: reqDate,
      existingRecords: [
        ...(masterData?.logisticsRequests || []),
        ...(masterData?.purchaseOrders || [])
      ],
      digits: 5
    });

    const newReq = {
      id: poCode,
      report_no: poCode,
      code: poCode,
      date: reqDate,
      outlet_id: currentOutlet.id,
      branch_name: currentOutlet.name,
      outlet_name: currentOutlet.name,
      item_name: logisticsItemName,
      qty: `${logisticsQty} ${logisticsUnit}`,
      requested_by: userSession?.name || currentUserSession?.name || 'Kasir Outlet',
      submitted_by: userSession?.name || currentUserSession?.name || 'Kasir Outlet',
      status: 'Pending',
      submitter_type: 'POS Kasir',
      type_input: 'POS Kasir',
      notes: logisticsNotes || 'Permintaan Bahan Baku Kasir Outlet'
    };

    setMasterData(prev => {
      const now = Date.now();
      const newMaster = {
        ...prev,
        _lastUpdated: now,
        clientUpdated: now,
        approvedLogistics: [newReq, ...(prev.approvedLogistics || [])]
      };
      saveToServerWithGuard(newMaster);
      return newMaster;
    });

    setLogisticsItemName('');
    setLogisticsQty('');
    setLogisticsNotes('');
    alert('Permintaan Bahan Baku Logistik Terkirim ke Web Admin!');
  };

  const [showShiftClosingModal, setShowShiftClosingModal] = useState(false);
  const [shiftDenominations, setShiftDenominations] = useState({
    100000: '',
    50000: '',
    20000: '',
    10000: '',
    5000: '',
    2000: '',
    1000: '',
    coin: ''
  });
  const [shiftCustomNotes, setShiftCustomNotes] = useState('');

  // Hitung total fisik kas dari pecahan uang kertas & koin
  const physicalCashCalculated = useMemo(() => {
    return Object.entries(shiftDenominations).reduce((sum, [denom, count]) => {
      const c = Number(count || 0);
      return denom === 'coin' ? sum + c : sum + (Number(denom) * c);
    }, 0);
  }, [shiftDenominations]);

  // Cetak Struk Rekap Tutup Shift ke Printer Bluetooth / Thermal
  const handlePrintShiftClosingReceipt = async () => {
    const physicalVal = physicalCashCalculated > 0 ? physicalCashCalculated : Number(physicalCashDrawer || expectedCashInDrawer);
    const variance = physicalVal - expectedCashInDrawer;

    const shiftData = {
      date: new Date().toISOString().split('T')[0],
      time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      cashier_name: currentUserSession?.name || userSession?.name || 'Kasir POS',
      total_receipts: shiftTodayTransactions.length,
      gross_sales: shiftTodaySalesGross,
      cash_sales: shiftTodayCashSales,
      non_cash_sales: shiftTodayNonCashSales,
      petty_expense: totalPettyExpense,
      initial_cash: Number(initialCash || 0),
      expected_cash: expectedCashInDrawer,
      physical_cash: physicalVal,
      variance: variance,
      notes: shiftCustomNotes
    };

    const text = buildShiftClosingReceiptText(shiftData, currentOutlet.name, printerPaperWidth, formatRupiah);
    await printTextToBluetooth(text);
  };

  // Handle Shift Closing Submission to Web Admin Menu 7 (Persetujuan) & MySQL
  const handleSubmitShiftClosing = () => {
    const physicalVal = physicalCashCalculated > 0 ? physicalCashCalculated : Number(physicalCashDrawer || expectedCashInDrawer);
    const variance = physicalVal - expectedCashInDrawer;

    // Proteksi 10/10: Kasir WAJIB mengisi alasan jika ada selisih kas (baik kurang maupun lebih)
    if (variance !== 0 && (!shiftCustomNotes || shiftCustomNotes.trim().length < 5)) {
      alert(`⚠️ Terdapat SELISIH KAS sebesar ${formatRupiah(Math.abs(variance))} (${variance < 0 ? 'Kas Kurang / Defisit' : 'Kas Lebih / Surplus'}).\n\nKasir WAJIB menuliskan alasan / catatan selisih kas pada kolom catatan (minimal 5 karakter) sebelum menutup shift.`);
      return;
    }

    const shiftDate = new Date().toISOString().split('T')[0];
    const shiftReportNo = generateDocNumber({
      prefix: 'SFT',
      outlet: currentOutlet,
      outlets: outlets,
      date: shiftDate,
      existingRecords: [
        ...(masterData?.shiftClosings || []),
        ...(masterData?.shift_closings || []),
        ...(masterData?.approvedFinanceDaily || [])
      ],
      digits: 2
    });

    const newShiftReport = {
      id: shiftReportNo,
      report_no: shiftReportNo,
      date: shiftDate,
      time: (() => { const _n = new Date(); return `${String(_n.getHours()).padStart(2,'0')}:${String(_n.getMinutes()).padStart(2,'0')}:${String(_n.getSeconds()).padStart(2,'0')}`; })(),
      outlet_id: Number(currentOutlet.id),
      outlet_name: currentOutlet.name,
      branch_name: currentOutlet.name,       // alias untuk ApprovalCenter Web Admin
      cashier_name: currentUserSession?.name || userSession?.name || 'Kasir POS',
      initial_cash: Number(initialCash || 0),
      // Field utama POS Kasir
      total_receipts: shiftTodayTransactions.length,
      gross_sales: shiftTodaySalesGross,
      cash_sales: shiftTodayCashSales,
      non_cash_sales: shiftTodayNonCashSales,
      petty_expense: totalPettyExpense,
      expected_cash: expectedCashInDrawer,
      physical_cash: physicalVal,
      cash_physical: physicalVal,
      variance: variance,
      cash_variance: variance,
      // Alias field yang dibutuhkan ApprovalCenter Web Admin
      net_sales: shiftTodaySalesGross,
      total_sales: shiftTodaySalesGross,
      total_income: shiftTodaySalesGross,
      total_expense: totalPettyExpense,
      cash_in_drawer: physicalVal,
      denominations: shiftDenominations,
      notes: shiftCustomNotes,
      // Status & metadata
      status: 'SELESAI DITUTUP',
      is_approved: true,
      submitter_type: 'POS Kasir',
      type_input: 'POS Kasir'
    };

    setMasterData(prev => {
      const now = Date.now();
      const newMaster = {
        ...prev,
        _lastUpdated: now,
        clientUpdated: now,
        approvedFinanceDaily: [newShiftReport, ...(prev.approvedFinanceDaily || []).filter(s => s.id !== newShiftReport.id)],
        shiftClosings: [newShiftReport, ...(prev.shiftClosings || []).filter(s => s.id !== newShiftReport.id)],
        shift_closings: [newShiftReport, ...(prev.shift_closings || []).filter(s => s.id !== newShiftReport.id)],
        closedShifts: [newShiftReport, ...(prev.closedShifts || []).filter(s => s.id !== newShiftReport.id)]
      };
      
      // Kirim direct endpoint TUTUP SHIFT ke server MySQL
      fetch(getApiUrl('/api/pos/shift-close'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newShiftReport)
      }).catch(() => {
        saveToServerWithGuard(newMaster);
      });

      return newMaster;
    });

    try { localStorage.removeItem('MRIS_POS_PETTY_EXPENSES'); } catch (e) {}
    setPettyExpenses([]);
    setShowShiftClosingModal(false);
    alert(`✅ Rekonsiliasi Tutup Shift Berhasil Disimpan!\n\nOutlet: ${currentOutlet.name}\nTotal Penjualan: ${formatRupiah(totalSalesGross)}\nFisik Kas Laci: ${formatRupiah(physicalVal)}\nSelisih: ${variance === 0 ? 'PAS (Rp 0)' : (variance < 0 ? 'MINUS ' + formatRupiah(Math.abs(variance)) : 'LEBIH ' + formatRupiah(variance))}\n\nLaporan shift telah tersinkronisasi ke server & Web Admin.`);
  };

  // PAPAN LOGIN SEDERHANA & RESPONSIF (DATA DINAMIS DARI WEB ADMIN)
  const renderLoginScreen = () => {
    // Kumpulkan semua akun dari masterData (HANYA data real dari Web Admin)
    const rawUsersList = [
      ...(Array.isArray(masterData?.mobileAccounts) && masterData.mobileAccounts.length > 0 ? masterData.mobileAccounts : (initialMasterData.mobileAccounts || [])),
      ...(Array.isArray(masterData?.webAdminAccounts) && masterData.webAdminAccounts.length > 0 ? masterData.webAdminAccounts : (initialMasterData.webAdminAccounts || [])),
      ...(masterData?.userRights || []),
      ...(masterData?.users || []),
      ...(masterData?.userAccounts || [])
    ];

    // De-duplikasi berdasarkan username/name (case-insensitive) & saring yang terhapus
    const deletedUserIdsSet = new Set([
      ...(masterData?.deletedUserIds || [])
    ].map(x => String(x)));

    const deletedUsernamesSet = new Set([
      ...(masterData?.deletedUsernames || [])
    ].map(x => String(x).toLowerCase().trim()));

    const usersMap = new Map();
    rawUsersList.forEach(u => {
      if (u && (u.name || u.username)) {
        const uIdStr = String(u.id || '');
        const usernameKey = String(u.username || u.name || '').toLowerCase().trim();

        if (deletedUserIdsSet.has(uIdStr) || (usernameKey && deletedUsernamesSet.has(usernameKey))) {
          return;
        }

        if (usernameKey && !usersMap.has(usernameKey)) {
          usersMap.set(usernameKey, { ...u, status: u.status || 'Aktif' });
        }
      }
    });

    // Daftar outlet MURNI dari masterData / Pengaturan Web Admin (Data Asli MySQL)
    const availableOutlets = (() => {
      const map = new Map();
      const sourceList = (Array.isArray(masterData?.outlets) && masterData.outlets.length > 0)
        ? masterData.outlets
        : (initialMasterData?.outlets || []);

      sourceList.forEach(o => {
        if (o && (o.name || o.branch_name)) {
          const id = String(o.id || o.outlet_id || Date.now());
          map.set(id, { id: o.id || id, name: o.name || o.branch_name, code: o.code || 'OUTLET' });
        }
      });

      return Array.from(map.values());
    })();

    const registeredUsers = Array.from(usersMap.values());

    const activeOutletObj = loginSelectedOutlet || availableOutlets[0] || null;
    const activeOutletName = String(activeOutletObj?.name || '').toLowerCase().trim();
    const activeOutletId = String(activeOutletObj?.id || '').toLowerCase().trim();

    const filteredUsersForOutlet = activeOutletObj ? registeredUsers.filter(u => {
      const uOutlet = String(u.outlet || u.assignedOutlet || u.outlet_name || u.branch || '').toLowerCase().trim();
      const uOutletId = String(u.outlet_id || u.outletId || '').toLowerCase().trim();
      const uRole = String(u.role || '').toLowerCase();

      const isCentral = !uOutlet || uOutlet.includes('semua outlet') || uOutlet.includes('central') || uRole.includes('super admin') || uRole.includes('owner');
      const isMatch = isCentral || uOutlet.includes(activeOutletName) || activeOutletName.includes(uOutlet) || (uOutletId && uOutletId === activeOutletId);
      return isMatch;
    }) : registeredUsers;

    const displayUsers = filteredUsersForOutlet.length > 0 ? filteredUsersForOutlet : registeredUsers;
    const activeSelectedUser = selectedUserAccount || displayUsers[0] || null;

    const handleDirectLogin = (userObj, outletObj) => {
      setLoginErrorText('');
      const selectedUser = userObj || activeSelectedUser;

      if (!selectedUser) {
        setLoginErrorText('Tidak ada pengguna yang dipilih. Tambahkan akun di Web Admin → Pengaturan.');
        return;
      }

      const userRole = String(selectedUser.role || '').toLowerCase();
      const userOutletStr = String(selectedUser.outlet || selectedUser.assignedOutlet || '').toLowerCase();
      const isCentralUser = userOutletStr.includes('semua outlet') || userOutletStr.includes('central') || userRole.includes('super admin') || userRole.includes('owner');

      let selectedOutlet = outletObj || activeOutletObj;

      if (!selectedOutlet) {
        if (isCentralUser) {
          selectedOutlet = { id: 'central', name: 'Semua Outlet (Central)' };
        } else {
          setLoginErrorText('Pilih outlet terlebih dahulu sebelum masuk.');
          return;
        }
      }

      const validPassword = String(
        selectedUser?.mobileLoginPassword ||
        selectedUser?.password ||
        selectedUser?.pin ||
        selectedUser?.mobileReportPassword ||
        ''
      ).trim();

      const enteredPassword = String(loginPasswordInput || '').trim();

      if (validPassword) {
        if (!enteredPassword) {
          setLoginErrorText(`Masukkan PIN / Password untuk ${selectedUser.name}.`);
          return;
        }
        if (enteredPassword !== validPassword) {
          setLoginErrorText(`PIN / Password Salah! Password untuk "${selectedUser.name}" tidak sesuai.`);
          return;
        }
      }

      setCurrentUserSession({
        id: selectedUser.id || null,
        name: selectedUser.name || 'Kasir POS',
        role: selectedUser.role || 'Kasir',
        outlet: selectedOutlet.name || '',
        outlet_id: selectedOutlet.id || null,
        canAccessMobileReports: selectedUser.canAccessMobileReports === true,
        mobileReportPassword: selectedUser.mobileReportPassword || ''
      });
      if (selectedOutlet.id !== 'ALL') {
        setSelectedBranch(selectedOutlet.id);
      }
      setLoginPasswordInput('');
      setLoginErrorText('');
      setIsAppLoggedIn(true);
    };

    return (
      <div style={{ minHeight: '100vh', width: '100vw', background: 'radial-gradient(circle at top, #1e293b 0%, #090d16 100%)', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', fontFamily: 'Inter, system-ui, sans-serif' }}>
        <div style={{
          width: '100%',
          maxWidth: '620px',
          background: 'rgba(15, 23, 42, 0.96)',
          border: '2px solid #10b981',
          borderRadius: '24px',
          padding: '26px 22px',
          boxShadow: '0 0 35px rgba(16, 185, 129, 0.35)',
          backdropFilter: 'blur(20px)',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px'
        }}>

          {/* APP TITLE HEADER */}
          <div style={{ textAlign: 'center' }}>
            <div style={{
              width: '52px',
              height: '52px',
              borderRadius: '50%',
              background: 'rgba(16, 185, 129, 0.15)',
              border: '2px solid #10b981',
              boxShadow: '0 0 20px rgba(16, 185, 129, 0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 8px'
            }}>
              <Smartphone size={26} color="#10b981" />
            </div>

            <h2 style={{ fontSize: '1.35rem', fontWeight: '900', color: '#ffffff', margin: 0 }}>
              POS Kasir Barokah
            </h2>
            <p style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '3px', fontWeight: '600' }}>
              Pilih Outlet &bull; Pilih User &bull; Masukkan PIN
            </p>
          </div>

          {/* STEP INDICATOR BAR */}
          <div style={{ display: 'flex', gap: '8px' }}>
            <div style={{ flex: 1, height: '4px', borderRadius: '4px', background: loginStep >= 1 ? '#10b981' : '#334155' }} />
            <div style={{ flex: 1, height: '4px', borderRadius: '4px', background: loginStep >= 2 ? '#10b981' : '#334155' }} />
            <div style={{ flex: 1, height: '4px', borderRadius: '4px', background: loginStep >= 3 ? '#10b981' : '#334155' }} />
          </div>

          {/* TAHAP 1: GRID THUMBNAIL PILIH OUTLET */}
          {loginStep === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label style={{ fontSize: '0.86rem', fontWeight: '900', color: '#10b981', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>LANGKAH 1: Pilih Outlet Cabang</span>
                </label>
                <button
                  type="button"
                  onClick={() => {
                    fetch(getApiUrl('/api/master-data'), { cache: 'no-store' })
                      .then(r => r.ok ? r.json() : null)
                      .then(data => {
                        if (data && typeof data === 'object' && Array.isArray(data.outlets)) {
                          setMasterData(prev => ({ ...prev, ...data, outlets: data.outlets }));
                        }
                      })
                      .catch(() => {});
                  }}
                  style={{
                    background: 'rgba(16, 185, 129, 0.15)',
                    border: '1px solid rgba(16, 185, 129, 0.4)',
                    color: '#10b981',
                    padding: '4px 10px',
                    borderRadius: '8px',
                    fontSize: '0.72rem',
                    fontWeight: '800',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                  title="Klik untuk menyinkronkan daftar cabang outlet terbaru dari server"
                >
                  <RefreshCw size={12} />
                  <span>Sync Outlet Server</span>
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '10px', maxHeight: '320px', overflowY: 'auto', paddingRight: '4px' }}>
                {availableOutlets.map(o => {
                  const isSel = (loginSelectedOutlet?.id || activeOutletObj?.id) === o.id;
                  return (
                    <div
                      key={o.id}
                      onClick={() => {
                        setLoginSelectedOutlet(o);
                        setLoginErrorText('');
                        setLoginStep(2);
                      }}
                      style={{
                        background: isSel ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.25) 0%, rgba(5, 150, 105, 0.25) 100%)' : '#0f172a',
                        border: isSel ? '2px solid #10b981' : '1.5px solid #334155',
                        borderRadius: '16px',
                        padding: '16px 12px',
                        textAlign: 'center',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        boxShadow: isSel ? '0 0 15px rgba(16, 185, 129, 0.35)' : 'none'
                      }}
                    >
                      <div style={{ fontSize: '1.8rem', marginBottom: '6px' }}>
                        
                      </div>
                      <div style={{ fontSize: '0.86rem', fontWeight: '900', color: '#ffffff', lineHeight: '1.25' }}>
                        {o.name}
                      </div>
                      {o.code && (
                        <span style={{ fontSize: '0.65rem', color: '#38bdf8', fontWeight: '800', marginTop: '6px', display: 'inline-block', background: 'rgba(56, 189, 248, 0.12)', border: '1px solid rgba(56, 189, 248, 0.3)', padding: '2px 8px', borderRadius: '6px' }}>
                          {o.code}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAHAP 2: GRID AVATAR PILIH AKUN PENGGUNA */}
          {loginStep === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label style={{ fontSize: '0.86rem', fontWeight: '900', color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>LANGKAH 2: Pilih Akun Pengguna</span>
                </label>
                <button
                  type="button"
                  onClick={() => setLoginStep(1)}
                  style={{ background: '#1e293b', border: '1px solid #475569', color: '#cbd5e1', padding: '4px 10px', borderRadius: '8px', fontSize: '0.74rem', fontWeight: '800', cursor: 'pointer' }}
                >
                  ← Ganti Outlet ({loginSelectedOutlet?.name})
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px', maxHeight: '280px', overflowY: 'auto', paddingRight: '4px' }}>
                {displayUsers.map(u => {
                  const isSel = selectedUserAccount?.id === u.id;
                  return (
                    <div
                      key={u.id}
                      onClick={() => {
                        setSelectedUserAccount(u);
                        setLoginUsernameInput(u.username || '');
                        setLoginPasswordInput('');
                        setLoginErrorText('');
                        setLoginStep(3);
                      }}
                      style={{
                        background: isSel ? 'linear-gradient(135deg, rgba(56, 189, 248, 0.25) 0%, rgba(3, 105, 161, 0.25) 100%)' : '#0f172a',
                        border: isSel ? '2px solid #38bdf8' : '1.5px solid #334155',
                        borderRadius: '16px',
                        padding: '14px 10px',
                        textAlign: 'center',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        boxShadow: isSel ? '0 0 15px rgba(56, 189, 248, 0.3)' : 'none'
                      }}
                    >
                      <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: '#1e293b', border: '1.5px solid #38bdf8', color: '#38bdf8', fontWeight: '900', fontSize: '1.1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 8px' }}>
                        {(u.name || 'U').charAt(0).toUpperCase()}
                      </div>
                      <div style={{ fontSize: '0.86rem', fontWeight: '900', color: '#ffffff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {u.name}
                      </div>
                      <span style={{ fontSize: '0.68rem', color: '#94a3b8', fontWeight: '700', marginTop: '2px', display: 'block' }}>
                        {u.role || 'Kasir'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAHAP 3: MASUKKAN PIN / PASSWORD */}
          {loginStep === 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* TARGET ACC SUMMARY BADGE */}
              <div style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '14px', padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#10b981', color: '#ffffff', fontWeight: '900', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {(selectedUserAccount?.name || 'K').charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontSize: '0.88rem', fontWeight: '900', color: '#ffffff' }}>
                      {selectedUserAccount?.name} <span style={{ fontSize: '0.72rem', color: '#10b981', fontWeight: '800' }}>({selectedUserAccount?.role || 'Kasir'})</span>
                    </div>
                    <div style={{ fontSize: '0.74rem', color: '#94a3b8', fontWeight: '700' }}>
                      {loginSelectedOutlet?.name || 'Semua Outlet (Central)'}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setLoginStep(2)}
                  style={{ background: '#1e293b', border: '1px solid #475569', color: '#cbd5e1', padding: '5px 10px', borderRadius: '8px', fontSize: '0.74rem', fontWeight: '800', cursor: 'pointer' }}
                >
                  Ganti ↺
                </button>
              </div>

              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: '800', color: '#94a3b8', display: 'block', marginBottom: '6px' }}>
                  Masukkan PIN / Password Akun:
                </label>
                <div style={{ position: 'relative', width: '100%' }}>
                  <input
                    type={showLoginPasswordEye ? 'text' : 'password'}
                    value={loginPasswordInput}
                    onChange={(e) => {
                      setLoginPasswordInput(e.target.value);
                      setLoginErrorText('');
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleDirectLogin(selectedUserAccount, loginSelectedOutlet);
                    }}
                    placeholder="• • • •"
                    autoFocus
                    style={{
                      width: '100%',
                      background: '#0f172a',
                      border: loginErrorText ? '2px solid #ef4444' : '2px solid #10b981',
                      color: '#ffffff',
                      borderRadius: '14px',
                      padding: '14px 42px 14px 16px',
                      fontSize: '1.1rem',
                      fontWeight: '800',
                      boxSizing: 'border-box',
                      outline: 'none',
                      boxShadow: '0 0 15px rgba(16, 185, 129, 0.2)'
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowLoginPasswordEye(!showLoginPasswordEye)}
                    style={{
                      position: 'absolute',
                      right: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      color: '#94a3b8',
                      cursor: 'pointer',
                      fontSize: '1.1rem',
                      padding: '4px'
                    }}
                  >
                    {showLoginPasswordEye ? '' : ''}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* MAIN ACTION BUTTON */}
          {loginStep === 1 && (
            <div style={{
              width: '100%',
              padding: '13px',
              borderRadius: '14px',
              background: 'rgba(16, 185, 129, 0.12)',
              border: '1px dashed #10b981',
              color: '#34d399',
              fontWeight: '800',
              fontSize: '0.88rem',
              textAlign: 'center',
              boxSizing: 'border-box'
            }}>
              Ketuk Salah Satu Outlet di Atas untuk Memilih Cabang
            </div>
          )}

          {loginStep === 2 && (
            <div style={{
              width: '100%',
              padding: '13px',
              borderRadius: '14px',
              background: 'rgba(56, 189, 248, 0.12)',
              border: '1px dashed #38bdf8',
              color: '#38bdf8',
              fontWeight: '800',
              fontSize: '0.88rem',
              textAlign: 'center',
              boxSizing: 'border-box'
            }}>
              Ketuk Akun Pengguna di Atas untuk Memilih Akun
            </div>
          )}

          {loginStep === 3 && (
            <button
              type="button"
              onClick={() => handleDirectLogin(selectedUserAccount || activeSelectedUser, loginSelectedOutlet || activeOutletObj)}
              style={{
                width: '100%',
                padding: '14px',
                borderRadius: '14px',
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                border: 'none',
                color: '#ffffff',
                fontWeight: '900',
                fontSize: '1rem',
                cursor: 'pointer',
                boxShadow: '0 8px 25px rgba(16, 185, 129, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                marginTop: '6px'
              }}
            >
              Masuk Ke Kasir POS ({(loginSelectedOutlet || activeOutletObj)?.name || 'Outlet'})
            </button>
          )}

          {/* FOOTER STATUS */}
          <div style={{ marginTop: '4px', textAlign: 'center' }}>
            <div style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              <span style={{ color: '#34d399' }}>Server Connected</span>
              <span>•</span>
              <span style={{ color: '#38bdf8' }}>Printer Thermal Ready </span>
            </div>
          </div>

        </div>
      </div>
    );
  };

  const filteredItems = menuList.filter(item => {
    if (item.status === 'Inaktif' || item.status === 'Hide') return false;
    const activeOutletId = currentOutlet?.id || 1;
    if (getProductPriceForOutlet(item, activeOutletId) <= 0) return false;

    const itemCatName = getProductCategoryName(item);
    let matchesCat = activeCategory === 'Semua' || itemCatName.toLowerCase() === activeCategory.toLowerCase();
    if (activeCategory === 'Sering Diorder') {
      const hasPopular = menuList.some(i => i.isPopular || i.is_popular || i.isFavorite);
      matchesCat = hasPopular ? !!(item.isPopular || item.is_popular || item.isFavorite) : true;
    }
    const matchesSearch = (item.name || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  // ── PRINTER STATUS BANNER HELPER ──
  // Tampilkan status koneksi printer di setiap modal yang punya tombol cetak struk
  const renderPrinterStatusBanner = () => {
    const isCapacitorNative = typeof window !== 'undefined' && window.Capacitor && window.Capacitor.isNativePlatform();
    const lastPrintError = printStatus === 'error' ? printStatusMsg : null;

    let bgColor, borderColor, iconColor, icon, label, sublabel;

    if (lastPrintError) {
      bgColor = 'rgba(244,63,94,0.12)'; borderColor = '#f43f5e'; iconColor = '#f87171';
      icon = ''; label = 'Printer Bermasalah'; sublabel = lastPrintError;
    } else if (printStatus === 'printing') {
      bgColor = 'rgba(99,102,241,0.12)'; borderColor = '#6366f1'; iconColor = '#a5b4fc';
      icon = ''; label = 'Sedang Mencetak...'; sublabel = printStatusMsg;
    } else if (printStatus === 'success') {
      bgColor = 'rgba(52,211,153,0.12)'; borderColor = '#34d399'; iconColor = '#34d399';
      icon = ''; label = 'Cetak Berhasil'; sublabel = printStatusMsg;
    } else if (!printerMac) {
      bgColor = 'rgba(251,191,36,0.12)'; borderColor = '#fbbf24'; iconColor = '#fbbf24';
      icon = ''; label = 'Printer Belum Dikonfigurasi'; sublabel = 'Cetak akan dialihkan ke PDF. Silakan atur printer di tab Setting Printer.';
    } else if (!isCapacitorNative) {
      bgColor = 'rgba(56,189,248,0.10)'; borderColor = '#38bdf8'; iconColor = '#38bdf8';
      icon = ''; label = 'Mode Browser — Cetak PDF'; sublabel = `Di APK Android, struk langsung ke printer Bluetooth: ${printerMac}`;
    } else {
      bgColor = 'rgba(52,211,153,0.10)'; borderColor = '#34d399'; iconColor = '#34d399';
      icon = ''; label = 'Printer Siap'; sublabel = `${pairedDevices.find(d => d.address === printerMac)?.name || 'Bluetooth ' + printerMac} • ${printerPaperWidth}mm`;
    }

    return (
      <div style={{
        display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '10px 14px',
        borderRadius: '10px', background: bgColor, border: `1px solid ${borderColor}`,
        fontSize: '0.78rem', marginBottom: '10px'
      }}>
        <span style={{ fontSize: '1rem', flexShrink: 0, marginTop: '1px' }}>{icon}</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: '800', color: iconColor }}>{label}</div>
          <div style={{ color: '#94a3b8', marginTop: '2px', lineHeight: 1.4 }}>{sublabel}</div>
        </div>
        {!printerMac && (
          <button
            type="button"
            onClick={() => setActiveNavTab('printer_setting')}
            style={{ flexShrink: 0, background: '#fbbf24', color: '#0f172a', border: 'none', borderRadius: '7px', padding: '4px 10px', fontSize: '0.72rem', fontWeight: '900', cursor: 'pointer' }}
          >
            Atur
          </button>
        )}
      </div>
    );
  };

  // ── PRINTER OFFLINE MODAL ──
  // Popup informatif muncul otomatis ketika cetak gagal / printer tidak terhubung
  const renderPrinterOfflineModal = () => {
    if (!printerOfflineModal.open) return null;
    return (
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.82)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999, padding: '20px' }}>
        <div style={{ width: '100%', maxWidth: '380px', background: 'var(--pos-bg-card)', border: '1px solid #f43f5e', borderRadius: '18px', padding: '26px', display: 'flex', flexDirection: 'column', gap: '16px', boxShadow: '0 20px 60px rgba(244,63,94,0.25)' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '2.8rem', marginBottom: '8px' }}></div>
            <div style={{ fontSize: '1.1rem', fontWeight: '900', color: '#f87171' }}>Printer Tidak Terhubung</div>
            <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '8px', lineHeight: 1.5 }}>
              {printerOfflineModal.errorMsg || 'Gagal mengirim data ke printer Bluetooth.'}
            </div>
          </div>
          <div style={{ background: 'rgba(244,63,94,0.08)', border: '1px solid rgba(244,63,94,0.2)', borderRadius: '10px', padding: '12px 14px', fontSize: '0.76rem', color: '#94a3b8', lineHeight: 1.7 }}>
            <div style={{ fontWeight: '800', color: '#f87171', marginBottom: '6px' }}>Cara Memperbaiki:</div>
            <div>1. Pastikan printer Bluetooth <strong style={{ color: '#f8fafc' }}>menyala</strong> & tidak sleep.</div>
            <div>2. Pastikan Bluetooth Android perangkat <strong style={{ color: '#f8fafc' }}>aktif</strong>.</div>
            <div>3. Pastikan printer sudah <strong style={{ color: '#f8fafc' }}>dipair</strong> di Pengaturan Bluetooth.</div>
            <div>4. Coba <strong style={{ color: '#f8fafc' }}>lepas & sambung ulang</strong> printer dari Setting.</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {printerOfflineModal.onFallback && (
              <button
                type="button"
                onClick={() => { printerOfflineModal.onFallback(); setPrinterOfflineModal({ open: false, errorMsg: '', onFallback: null }); }}
                style={{ padding: '12px', background: 'rgba(56,189,248,0.15)', border: '1px solid rgba(56,189,248,0.3)', color: '#38bdf8', borderRadius: '10px', fontWeight: '800', cursor: 'pointer', fontSize: '0.85rem' }}
              >
                Cetak Sebagai PDF (Alternatif)
              </button>
            )}
            <button
              type="button"
              onClick={() => { setPrinterOfflineModal({ open: false, errorMsg: '', onFallback: null }); setActiveNavTab('printer_setting'); }}
              style={{ padding: '12px', background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)', color: '#a5b4fc', borderRadius: '10px', fontWeight: '800', cursor: 'pointer', fontSize: '0.85rem' }}
            >
              Buka Setting Printer
            </button>
            <button
              type="button"
              onClick={() => setPrinterOfflineModal({ open: false, errorMsg: '', onFallback: null })}
              style={{ padding: '10px', background: 'var(--pos-border-card)', border: 'none', color: 'var(--pos-txt-secondary)', borderRadius: '10px', fontWeight: '700', cursor: 'pointer', fontSize: '0.82rem' }}
            >
              Tutup
            </button>
          </div>
        </div>
      </div>
    );
  };

  if (!isAppLoggedIn) {
    return renderLoginScreen();
  }

  return (
    <div
      data-theme={appTheme}
      className="pos-wrapper"
      style={{ display: 'flex', height: '100vh', width: '100vw', overflow: 'hidden', background: T.bgApp, color: T.txtPrimary, fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}
    >

      {/* =================================================================== */}
      {/* 1. FAR LEFT VERTICAL NAVIGATION SIDEBAR (DARK SLATE BLUE THEME)     */}
      {/* =================================================================== */}
      <aside style={{
        width: '78px',
        flexShrink: 0,
        background: T.bgSidebar,
        borderRight: `1px solid ${T.borderSidebar}`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justify: 'space-between',
        padding: '12px 0',
        zIndex: 20,
        boxShadow: isLight ? '2px 0 12px rgba(0,0,0,0.15)' : 'none'
      }}>
        {/* Top Logo / Outlet Badge */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)',
            border: '2px solid #60a5fa',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: '900',
            fontSize: '0.90rem',
            color: 'var(--pos-txt-primary)',
            letterSpacing: '1px',
            boxShadow: '0 0 16px rgba(56,189,248,0.5), inset 0 0 10px rgba(255,255,255,0.3)'
          }}>
            POS
          </div>
          <div style={{ fontSize: '0.56rem', fontWeight: '800', color: '#f59e0b', textAlign: 'center', padding: '0 4px', maxWidth: '70px', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
            {currentOutlet.name}
          </div>
        </div>

        {/* Middle Navigation Menu List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%', alignItems: 'center', marginTop: '12px' }}>
          {[
            { id: 'kasir', label: 'POS', icon: Store },
            { id: 'kds', label: 'KDS Dapur', icon: ChefHat },
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
                  if (nav.id === 'laporan') {
                    const isAllowed = activeMobilePermissions?.mobileReports !== false;
                    if (isAllowed || isMobileReportUnlocked) {
                      setActiveNavTab('laporan');
                      setActiveLaporanSubView(null);
                    } else {
                      setMobileReportPasswordInput('');
                      setMobileReportErrorText('');
                      setShowMobileReportPasswordModal(true);
                    }
                  } else {
                    setActiveNavTab(nav.id);
                  }
                }}
                title={showSyncDot ? `Tersinkronisasi dengan Server Database` : nav.label}
                style={{
                  position: 'relative',
                  width: '64px',
                  height: '54px',
                  borderRadius: '12px',
                  background: isActive ? '#ffffff' : 'transparent',
                  border: isActive ? '1px solid #f59e0b' : 'none',
                  color: isActive ? '#000000' : '#f59e0b',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '3px',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  boxShadow: isActive ? '0 4px 14px rgba(245,158,11,0.45)' : 'none'
                }}
              >
                {nav.id === 'chart' && pendingOrdersList.length > 0 ? (
                  <span
                    style={{
                      position: 'absolute',
                      top: '2px',
                      right: '3px',
                      minWidth: '17px',
                      height: '17px',
                      borderRadius: '9px',
                      background: '#ef4444',
                      color: '#ffffff',
                      fontSize: '0.65rem',
                      fontWeight: '900',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '0 4px',
                      boxShadow: '0 0 8px rgba(239,68,68,0.8)',
                      zIndex: 2
                    }}
                  >
                    {pendingOrdersList.length}
                  </span>
                ) : showSyncDot ? (
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
                ) : null}
                <IconComp size={19} color={isActive ? '#000000' : '#f59e0b'} strokeWidth={isActive ? 2.5 : 1.8} />
                <span style={{ fontSize: '0.64rem', fontWeight: isActive ? '900' : '700', color: isActive ? '#000000' : '#f59e0b' }}>{nav.label}</span>
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
            background: activeNavTab === 'pos_settings' ? '#ffffff' : 'transparent',
            border: activeNavTab === 'pos_settings' ? '1px solid #f59e0b' : 'none',
            color: activeNavTab === 'pos_settings' ? '#000000' : '#f59e0b',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '3px',
            cursor: 'pointer',
            boxShadow: activeNavTab === 'pos_settings' ? '0 4px 14px rgba(245,158,11,0.45)' : 'none'
          }}
        >
          <Settings size={19} color={activeNavTab === 'pos_settings' ? '#000000' : '#f59e0b'} />
          <span style={{ fontSize: '0.64rem', fontWeight: '700', color: activeNavTab === 'pos_settings' ? '#000000' : '#f59e0b' }}>Setting</span>
        </button>
      </aside>


      {/* =================================================================== */}
      {/* 2. MAIN POS REGISTER BODY CONTAINER                                 */}
      {/* =================================================================== */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* TOP OCEAN BLUE HEADER BAR */}
        <header style={{
          height: '54px',
          background: T.bgHeader,
          borderBottom: `1px solid ${T.border}`,
          boxShadow: T.shadow,
          padding: '0 20px',
          display: 'flex',
          alignItems: 'center',
          justify: 'space-between',
          flexShrink: 0
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <h1 style={{ fontSize: '1.15rem', fontWeight: '900', color: T.txtPrimary, margin: 0, letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>POS KASIR</span>
            </h1>
            <span style={{ fontSize: '0.75rem', color: T.txtHeaderAccent, fontWeight: '700' }}>| {currentOutlet.name}</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>

            {/* VISUAL ONLINE / OFFLINE STATUS BADGE */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: isOnline ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)',
              border: `1px solid ${isOnline ? '#10b981' : '#f59e0b'}`,
              color: isOnline ? '#10b981' : '#fbbf24',
              padding: '4px 10px',
              borderRadius: '8px',
              fontSize: '0.74rem',
              fontWeight: '800'
            }}>
              <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: isOnline ? '#10b981' : '#f59e0b', boxShadow: isOnline ? '0 0 8px #10b981' : '0 0 8px #f59e0b' }} />
              <span>{isOnline ? '🟢 Online (SSE 50ms)' : '🟡 Mode Offline (IDB)'}</span>
            </div>

            {/* OFFLINE QUEUE STATUS BADGE — merah mencolok agar kasir tidak menutup app */}
            {offlineQueueCount > 0 && (
              <div 
                style={{
                  background: 'rgba(239, 68, 68, 0.20)',
                  border: '2px solid #ef4444',
                  color: '#fca5a5',
                  padding: '5px 12px',
                  borderRadius: '8px',
                  fontSize: '0.74rem',
                  fontWeight: '900',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 0 16px rgba(239, 68, 68, 0.45)'
                }}
                title="Transaksi Offline Tersimpan di Tablet — Klik untuk paksa sync ke Cloud VPS"
                className="animate-pulse"
              >
                <RefreshCw size={13} className="animate-spin" />
                <span>🔴 {offlineQueueCount} transaksi belum tersinkron - Jangan tutup aplikasi</span>
              </div>
            )}

            {/* THEME TOGGLE BUTTON (CALM SAGE VS DARK) */}
            <button
              type="button"
              onClick={() => toggleAppTheme()}
              style={{
                background: isCalmSage ? '#eaf2ec' : 'rgba(255,255,255,0.1)',
                border: isCalmSage ? '1.5px solid #9ec4ad' : '1px solid rgba(255,255,255,0.2)',
                color: isCalmSage ? '#152e22' : '#ffffff',
                padding: '5px 12px',
                borderRadius: '8px',
                fontSize: '0.78rem',
                fontWeight: '800',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: isCalmSage ? '0 2px 6px rgba(0,0,0,0.06)' : 'none'
              }}
              title="Ganti Tema POS Kasir (🌿 Calm Sage vs 🌙 Mode Gelap)"
            >
              {isCalmSage ? <span>🌿 Calm Sage (Fresh & Mint)</span> : <span>🌙 Mode Gelap</span>}
            </button>



            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: T.bgBadgeUser, padding: '4px 10px', borderRadius: '8px', border: `1px solid ${T.borderSubtle}` }}>
              <span style={{ fontSize: '0.78rem', color: T.txtPrimary, fontWeight: '800' }}>
                {currentUserSession?.name || 'Kasir'} ({currentUserSession?.role || 'Kasir'})
              </span>
            </div>

            <button
              onClick={() => {
                if (window.confirm('Yakin ingin keluar dari akun ini?')) {
                  // Reset semua state login secara lengkap
                  setIsAppLoggedIn(false);
                  setLoginStep(1);
                  setSelectedLoginCategory(null);
                  setLoginSelectedOutlet(null);
                  setSelectedUserAccount(null);
                  setLoginPasswordInput('');
                  setLoginUsernameInput('');
                  setLoginErrorText('');
                  setCurrentUserSession(null);
                }
              }}
              style={{ background: 'rgba(220,38,38,0.15)', border: '1px solid rgba(248,113,113,0.4)', color: '#fca5a5', padding: '5px 14px', borderRadius: '8px', fontSize: '0.78rem', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <User size={15} />
              <span>Keluar</span>
            </button>
          </div>
        </header>


        {/* MAIN VIEW AREA (BERDASARKAN TAB NAVIGASI) */}
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden', background: T.bgApp }}>
          {activeNavTab === 'kasir' && (
            <div style={{ flex: 1, display: 'flex', width: '100%' }}>

              {/* ----------------------------------------------------------- */}
              {/* LEFT CATALOG PANEL (PRODUCTS CATALOG - 60% WIDTH)            */}
              {/* ----------------------------------------------------------- */}
              <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', borderRight: `1px solid ${T.border}`, background: T.bgApp, boxSizing: 'border-box' }}>

                {/* Catalog Header: Title + Search & Barcode Scanner */}
                <div style={{ padding: '12px 18px', borderBottom: `1px solid ${T.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: T.bgSurface }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Grid size={19} color={isLight ? '#7c3aed' : '#a78bfa'} />
                    <span style={{ fontSize: '0.95rem', fontWeight: '900', color: T.txtPrimary }}>
                      Semua <span style={{ fontSize: '0.82rem', color: T.txtSecondary, fontWeight: '700' }}>({filteredItems.length})</span>
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '250px' }}>
                    <div style={{ flex: 1, position: 'relative' }}>
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        placeholder="Cari menu / scan..."
                        style={{ width: '100%', background: T.bgInput, border: `1px solid ${T.borderSubtle}`, borderRadius: '8px', padding: '6px 10px 6px 32px', color: T.txtPrimary, fontSize: '0.82rem', outline: 'none' }}
                      />
                      <Search size={15} color={T.txtSecondary} style={{ position: 'absolute', left: '10px', top: '8px' }} />
                    </div>
                  </div>
                </div>

                {/* Category Filters Carousel Row */}
                <div style={{ padding: '10px 16px', background: T.bgSurface, borderBottom: `1px solid ${T.border}`, display: 'flex', gap: '8px', overflowX: 'auto' }}>
                  {categories.map(cat => {
                    const isAct = activeCategory === cat;
                    return (
                      <button
                        key={cat}
                        onClick={() => setActiveCategory(cat)}
                        style={{
                          padding: '6px 14px',
                          borderRadius: '8px',
                          border: isAct ? '1px solid #60a5fa' : `1px solid ${T.borderSubtle}`,
                          background: isAct ? 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)' : T.bgCard,
                          color: isAct ? '#ffffff' : T.txtSecondary,
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
                <div style={{ flex: 1, padding: '16px', overflowY: 'auto', background: T.bgApp }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(135px, 1fr))', gap: '12px' }}>
                    {filteredItems.map(item => {
                      const activeOutletId = currentOutlet?.id || 1;
                      const displayPrice = getProductPriceForOutlet(item, activeOutletId);

                      return (
                        <div
                          key={item.id}
                          onClick={() => handleProductCardClick(item)}
                          style={{
                            background: T.bgCard,
                            borderRadius: '12px',
                            border: `1px solid ${T.border}`,
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
                            {item.variants && item.variants.length > 0 && (() => {
                              const activeOutletId = currentOutlet?.id || 1;
                              const availableVars = item.variants.filter(v => getVariantPrice(item, v, activeOutletId) > 0);
                              if (availableVars.length > 0) {
                                return (
                                  <div style={{ position: 'absolute', top: '6px', right: '6px', background: 'rgba(37,99,235,0.9)', color: 'var(--pos-txt-white)', fontSize: '0.58rem', fontWeight: '800', padding: '2px 6px', borderRadius: '4px' }}>
                                    {availableVars.length > 1 ? `${availableVars.length} VARIAN` : 'VARIAN'}
                                  </div>
                                );
                              }
                              return null;
                            })()}
                          </div>

                          {/* Item Info */}
                          <div style={{ padding: '8px 10px' }}>
                            <div style={{ fontSize: '0.78rem', fontWeight: '800', color: T.txtPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textTransform: 'uppercase' }}>
                              {item.name}
                            </div>
                            <div style={{ fontSize: '0.80rem', fontWeight: '900', color: isLight ? '#0284c7' : '#38bdf8', marginTop: '4px' }}>
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
              <div style={{ width: '380px', flexShrink: 0, display: 'flex', flexDirection: 'column', background: T.bgSurface, boxSizing: 'border-box', borderLeft: `1px solid ${T.border}` }}>

                {/* Top 3 Action Tabs: ORDER | TABLE | MORE */}
                <div style={{ display: 'flex', background: T.bgSidebar, borderBottom: `1px solid ${T.borderSidebar}` }}>
                  <button
                    onClick={() => setRightPanelSubTab('ORDER')}
                    style={{
                      flex: 1,
                      padding: '12px 0',
                      background: rightPanelSubTab === 'ORDER' ? '#2563eb' : 'transparent',
                      color: rightPanelSubTab === 'ORDER' ? '#ffffff' : T.txtSidebarIcon,
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
                      color: rightPanelSubTab === 'TABLE' ? '#ffffff' : T.txtSidebarIcon,
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
                      color: 'var(--pos-txt-primary)',
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
                <div style={{ padding: '10px 16px', background: T.bgApp, borderBottom: `1px solid ${T.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '0.82rem', fontWeight: '800', color: T.txtSecondary }}>
                      {activeRecallOrderId ? `${activeRecallOrderId}` : '#Pesanan Baru'}
                    </span>
                    {(cart.length > 0 || activeRecallOrderId) && (
                      <button
                        type="button"
                        onClick={() => {
                          handleClearCart();
                          setActiveRecallOrderId(null);
                          setOpenedOriginalCart(null);
                        }}
                        style={{
                          background: 'rgba(37,99,235,0.15)',
                          border: `1px solid ${isLight ? '#2563eb' : '#3b82f6'}`,
                          color: isLight ? '#1d4ed8' : '#60a5fa',
                          fontSize: '0.72rem',
                          fontWeight: '800',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          cursor: 'pointer'
                        }}
                        title="Kosongkan Cart untuk membuat pesanan baru tanpa menghapus pesanan gantung lain"
                      >
                        Order Baru
                      </button>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button
                      onClick={() => {
                        setCustomerSearchQuery('');
                        setShowCustomerSearchModal(true);
                      }}
                      style={{ background: 'none', border: 'none', color: isLight ? '#1d4ed8' : '#60a5fa', fontSize: '0.80rem', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                    >
                      <User size={14} />
                      <span>{selectedCustomer || 'Pilih Pelanggan'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowQrSelfRegModal(true)}
                      title="Tampilkan QR Code Registrasi Mandiri Pelanggan"
                      style={{ background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)', border: 'none', color: '#ffffff', padding: '4px 10px', borderRadius: '8px', fontSize: '0.74rem', fontWeight: '900', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', boxShadow: '0 2px 6px rgba(99,102,241,0.4)' }}
                    >
                      <QrCode size={13} />
                      <span>QR Member</span>
                    </button>
                  </div>
                </div>

                {/* Dine In Info Bar with Interactive Table Dropdown Selector */}
                <div style={{ padding: '8px 16px', background: T.bgCard, borderBottom: `1px solid ${T.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {orderType === 'Dine In' ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: T.bgApp, padding: '3px 8px', borderRadius: '8px', border: `1px solid ${T.borderSubtle}` }}>
                        <span style={{ fontSize: '0.88rem' }}></span>
                        <select
                          value={selectedTableId}
                          onChange={(e) => {
                            const targetId = e.target.value;
                            const targetTable = tables.find(t => t.id === targetId);
                            if (targetTable) {
                              if (targetTable.status === 'occupied' && targetTable.pendingOrder && targetTable.pendingOrder.items?.length > 0 && activeRecallOrderId !== (targetTable.pendingOrder.holdTx?.id || `HOLD-${targetTable.id}`)) {
                                setOccupiedTableNotice({ table: targetTable, pendingOrder: targetTable.pendingOrder });
                              } else {
                                setSelectedTableId(targetId);
                              }
                            }
                          }}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: isLight ? '#1d4ed8' : '#60a5fa',
                            fontSize: '0.84rem',
                            fontWeight: '900',
                            cursor: 'pointer',
                            outline: 'none',
                            paddingRight: '4px'
                          }}
                          title="Pilih Nomor Meja Pelanggan (Meja 01, Meja 02, dst.)"
                        >
                          {tables.map(tbl => (
                            <option key={tbl.id} value={tbl.id} style={{ background: T.bgCard, color: T.txtPrimary }}>
                              {tbl.number} {tbl.status === 'occupied' ? '(Terisi)' : '(Kosong)'}
                            </option>
                          ))}
                        </select>
                      </div>
                    ) : (
                      <div style={{ fontSize: '0.82rem', fontWeight: '800', color: T.txtMuted, display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span></span>
                        <span>Take Away</span>
                      </div>
                    )}

                    <div style={{ fontSize: '0.82rem', fontWeight: '800', color: T.txtMuted, display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <User size={13} />
                      <span>{guestCount} Pax</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '4px', background: T.bgApp, padding: '3px', borderRadius: '8px', border: `1px solid ${T.borderSubtle}` }}>
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
                      Dine In
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
                      Take Away
                    </button>
                  </div>
                </div>

                {/* Cart Items List or MORE Features Grid */}
                {rightPanelSubTab === 'MORE' ? (
                  <div style={{ flex: 1, padding: '16px', overflowY: 'auto', background: T.bgApp, display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ fontSize: '0.82rem', fontWeight: '900', color: T.txtSecondary, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '2px' }}>
                      Fitur Tambahan POS (More Options)
                    </div>

                    {/* 1. SPLIT BILL */}
                    {/* 0. PINDAH MEJA (MOVE TABLE) */}
                    <div
                      onClick={() => {
                        if (orderType !== 'Dine In') {
                          alert('Fitur Pindah Meja hanya berlaku untuk pesanan Dine In (Makan di Tempat).');
                          return;
                        }
                        if (cart.length === 0) {
                          alert('Keranjang pesanan masih kosong. Pilih pesanan terlebih dahulu sebelum pindah meja.');
                          return;
                        }
                        setShowMoveTableModal(true);
                      }}
                      style={{
                        background: T.bgCard, border: `1px solid ${T.borderCard}`, borderRadius: '12px', padding: '14px 16px',
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                        <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem' }}>
                          
                        </div>
                        <div>
                          <div style={{ fontSize: '0.9rem', fontWeight: '900', color: T.txtPrimary }}>Pindah Meja (Move Table)</div>
                          <div style={{ fontSize: '0.74rem', color: T.txtMuted, marginTop: '1px' }}>Pindahkan pesanan tamu dari {selectedTableObj?.number || 'Meja Ini'} ke meja lain</div>
                        </div>
                      </div>
                      <ChevronRight size={18} color={T.txtMuted} />
                    </div>

                    {/* 1. SPLIT BILL */}
                    <div
                      onClick={() => setShowSplitBillModal(true)}
                      style={{
                        background: T.bgCard, border: `1px solid ${T.borderCard}`, borderRadius: '12px', padding: '14px 16px',
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                        <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: 'rgba(56,189,248,0.15)', border: '1px solid rgba(56,189,248,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem' }}>
                          
                        </div>
                        <div>
                          <div style={{ fontSize: '0.9rem', fontWeight: '900', color: T.txtPrimary }}>Split Bill</div>
                          <div style={{ fontSize: '0.74rem', color: T.txtMuted, marginTop: '1px' }}>Pisah tagihan per item atau per orang</div>
                        </div>
                      </div>
                      <ChevronRight size={18} color={T.txtMuted} />
                    </div>

                    {/* 2. MERGE BILL */}
                    <div
                      onClick={() => setShowMergeBillModal(true)}
                      style={{
                        background: T.bgCard, border: `1px solid ${T.borderCard}`, borderRadius: '12px', padding: '14px 16px',
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                        <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: 'rgba(167,139,250,0.15)', border: '1px solid rgba(167,139,250,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem' }}>
                          
                        </div>
                        <div>
                          <div style={{ fontSize: '0.9rem', fontWeight: '900', color: T.txtPrimary }}>Merge Bill</div>
                          <div style={{ fontSize: '0.74rem', color: T.txtMuted, marginTop: '1px' }}>Gabungkan pesanan dari 2 meja</div>
                        </div>
                      </div>
                      <ChevronRight size={18} color={T.txtMuted} />
                    </div>

                    {/* 3. TUKAR POIN */}
                    <div
                      onClick={() => setShowTukarPoinModal(true)}
                      style={{
                        background: T.bgCard, border: `1px solid ${T.borderCard}`, borderRadius: '12px', padding: '14px 16px',
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                        <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: 'rgba(251,191,36,0.15)', border: '1px solid rgba(251,191,36,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem' }}>
                          
                        </div>
                        <div>
                          <div style={{ fontSize: '0.9rem', fontWeight: '900', color: T.txtPrimary }}>Tukar Poin</div>
                          <div style={{ fontSize: '0.74rem', color: T.txtMuted, marginTop: '1px' }}>Tukarkan poin loyalty pelanggan</div>
                        </div>
                      </div>
                      <ChevronRight size={18} color={T.txtMuted} />
                    </div>

                    {/* 4. KUPON */}
                    <div
                      onClick={() => setShowKuponModal(true)}
                      style={{
                        background: T.bgCard, border: `1px solid ${T.borderCard}`, borderRadius: '12px', padding: '14px 16px',
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                        <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: 'rgba(52,211,153,0.15)', border: '1px solid rgba(52,211,153,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem' }}>
                          
                        </div>
                        <div>
                          <div style={{ fontSize: '0.9rem', fontWeight: '900', color: T.txtPrimary }}>Kupon</div>
                          <div style={{ fontSize: '0.74rem', color: T.txtMuted, marginTop: '1px' }}>Gunakan voucher atau kupon diskon</div>
                        </div>
                      </div>
                      <ChevronRight size={18} color={T.txtMuted} />
                    </div>
                  </div>
                ) : (
                  /* Standard Cart Items List */
                  <div style={{ flex: 1, padding: '12px 16px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', background: T.bgApp }}>
                    {openedOriginalCart && (
                      <div style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #1d4ed8 100%)', padding: '10px 14px', borderRadius: '10px', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: '1px solid #3b82f6', boxShadow: '0 2px 8px rgba(37,99,235,0.3)', flexShrink: 0 }}>
                        <div>
                          <div style={{ fontSize: '0.84rem', fontWeight: '900', color: '#93c5fd' }}>Edit Pesanan {selectedTableObj?.number || 'Gantung'}</div>
                          <div style={{ fontSize: '0.74rem', opacity: 0.9 }}>Bebas tambah menu (+) atau kurangi (-) item di bawah ini</div>
                        </div>
                        <button 
                          type="button" 
                          onClick={() => { setCart([]); setOpenedOriginalCart(null); }}
                          style={{ background: 'rgba(239,68,68,0.3)', border: '1px solid #ef4444', color: '#fca5a5', padding: '4px 8px', borderRadius: '6px', fontSize: '0.72rem', fontWeight: '800', cursor: 'pointer' }}
                        >
                          Batal Edit
                        </button>
                      </div>
                    )}
                    {cart.length === 0 ? (
                      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: T.txtMuted }}>
                        <ShoppingBag size={40} strokeWidth={1} style={{ marginBottom: '8px', opacity: 0.4 }} />
                        <div style={{ fontSize: '0.85rem', fontWeight: '700' }}>Keranjang Kosong</div>
                      </div>
                    ) : (
                      cart.map((item, idx) => {
                        const itemNetPrice = Math.max(0, item.price - (item.discount || 0));
                        const itemLineTotal = itemNetPrice * item.qty;

                        return (
                          <div key={item.id} style={{ background: T.bgCard, padding: '10px 12px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: `1px solid ${T.border}` }}>
                            {/* Left: Item Name & Notes */}
                            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0, paddingRight: '8px' }}>
                              <div style={{ fontSize: '0.86rem', fontWeight: '800', color: T.txtPrimary, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={item.name}>
                                {item.name}
                              </div>
                              {item.notes && <div style={{ fontSize: '0.70rem', color: isLight ? '#1d4ed8' : '#60a5fa', marginTop: '1px' }}>{item.notes}</div>}
                            </div>

                            {/* Right: Quantity Controls (- QTY +), Subtotal, Delete Button */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                              {/* Quantity Adjustment Buttons */}
                              <div style={{ display: 'flex', alignItems: 'center', gap: '3px', background: T.bgApp, padding: '2px 4px', borderRadius: '8px', border: `1px solid ${T.border}` }}>
                                <button
                                  type="button"
                                  onClick={() => handleUpdateQty(item.id, -1)}
                                  title="Kurangi 1"
                                  style={{ width: '22px', height: '22px', borderRadius: '5px', border: 'none', background: '#ef4444', color: '#ffffff', fontSize: '0.90rem', fontWeight: '900', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', lineHeight: 1 }}
                                >
                                  -
                                </button>
                                <span style={{ fontSize: '0.82rem', fontWeight: '900', color: T.txtPrimary, minWidth: '20px', textAlign: 'center' }}>
                                  {item.qty}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleUpdateQty(item.id, 1)}
                                  title="Tambah 1"
                                  style={{ width: '22px', height: '22px', borderRadius: '5px', border: 'none', background: '#10b981', color: '#ffffff', fontSize: '0.90rem', fontWeight: '900', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', lineHeight: 1 }}
                                >
                                  +
                                </button>
                              </div>

                              {/* Line Total Price */}
                              <div style={{ fontSize: '0.84rem', fontWeight: '800', color: T.txtPrimary, minWidth: '60px', textAlign: 'right' }}>
                                {formatRupiah(itemLineTotal)}
                              </div>

                              {/* Delete Item Button */}
                              <button
                                type="button"
                                onClick={() => handleRemoveCartItem(item.id)}
                                title="Hapus Orderan"
                                style={{ width: '24px', height: '24px', borderRadius: '6px', border: 'none', background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', fontSize: '0.80rem', fontWeight: '800', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', marginLeft: '2px' }}
                              >
                                
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}

                {/* Subtotal & Breakdown Summary (Collapsible Accordion) */}
                <div style={{ padding: '12px 16px', background: T.bgCard, borderTop: `1px solid ${T.border}` }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '8px' }}>
                    
                    {/* Collapsible Accordion Header Toggle */}
                    <div
                      onClick={() => setShowCartCostBreakdown(prev => !prev)}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '6px 10px',
                        borderRadius: '8px',
                        background: isCalmSage ? '#eaf2ec' : '#1e293b',
                        border: `1px solid ${T.borderCard}`,
                        cursor: 'pointer',
                        fontSize: '0.78rem',
                        fontWeight: '800',
                        color: T.txtPrimary,
                        transition: 'all 0.15s ease'
                      }}
                      title="Klik untuk melihat / menyembunyikan rincian subtotal, diskon, dan biaya"
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Receipt size={14} color="#0284c7" />
                        <span>Rincian Biaya & Diskon</span>
                        {(discountAmount > 0 || numAdjustment !== 0) && (
                          <span style={{ fontSize: '0.66rem', background: '#fb7185', color: '#ffffff', padding: '1px 6px', borderRadius: '4px', fontWeight: '800' }}>
                            {discountAmount > 0 ? `Diskon -${formatRupiah(discountAmount)}` : ''} {numAdjustment !== 0 ? `Adj ${formatRupiah(numAdjustment)}` : ''}
                          </span>
                        )}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#0284c7', fontSize: '0.74rem', fontWeight: '800' }}>
                        <span>{showCartCostBreakdown ? 'Tutup Rincian' : 'Lihat Rincian'}</span>
                        {showCartCostBreakdown ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </div>
                    </div>

                    {/* EXPANDED BREAKDOWN ITEMS (HANYA MUNCUL JIKA DIKLIK) */}
                    {showCartCostBreakdown && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', padding: '8px 4px 4px 4px', background: isCalmSage ? '#f8faf9' : 'rgba(0,0,0,0.2)', borderRadius: '8px', marginTop: '2px', border: `1px dashed ${T.borderCard}` }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem', color: T.txtSecondary, padding: '2px 6px' }}>
                          <span>Subtotal</span>
                          <span style={{ fontWeight: '800', color: T.txtPrimary }}>{formatRupiah(cartSubtotal)}</span>
                        </div>

                        {/* 1. DISKON (KLIK TULISAN UNTUK UBAH PERSENTASE / NOMINAL) */}
                        <div
                          onClick={() => {
                            setDiscountInputVal(discountMode === 'percent' ? (discountInputVal || '') : (discountValue || ''));
                            setShowDiscountEditModal(true);
                          }}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            fontSize: '0.78rem',
                            color: discountAmount > 0 ? '#ef4444' : T.txtSecondary,
                            cursor: 'pointer',
                            padding: '4px 6px',
                            borderRadius: '6px',
                            background: discountAmount > 0 ? 'rgba(239,68,68,0.1)' : 'transparent',
                            border: '1px dashed',
                            borderColor: discountAmount > 0 ? '#ef4444' : 'transparent',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontWeight: '800' }}>Diskon</span>
                            <Tag size={12} color="#ef4444" />
                            {discountMode === 'percent' && discountInputVal && (
                              <span style={{ fontSize: '0.68rem', background: '#ef4444', color: '#ffffff', padding: '1px 5px', borderRadius: '4px', fontWeight: '800' }}>
                                {discountInputVal}%
                              </span>
                            )}
                          </div>
                          <span style={{ fontWeight: '900' }}>
                            {discountAmount > 0 ? `(- ${formatRupiah(discountAmount)})` : '(- Rp 0)'}
                          </span>
                        </div>

                        {/* 2. SERVICE CHARGE (STATIC / READ ONLY) */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: T.txtMuted, padding: '2px 6px' }}>
                          <span>Service Charge</span>
                          <span style={{ fontWeight: '700' }}>Rp 0</span>
                        </div>

                        {/* 3. PAJAK PB1 (STATIC / READ ONLY) */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: T.txtMuted, padding: '2px 6px' }}>
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
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            fontSize: '0.78rem',
                            color: numAdjustment !== 0 ? '#8b5cf6' : T.txtSecondary,
                            cursor: 'pointer',
                            padding: '4px 6px',
                            borderRadius: '6px',
                            background: numAdjustment !== 0 ? 'rgba(139,92,246,0.1)' : 'transparent',
                            border: '1px dashed',
                            borderColor: numAdjustment !== 0 ? '#8b5cf6' : 'transparent',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontWeight: '800' }}>Adjustment</span>
                            <Percent size={12} color="#8b5cf6" />
                            {adjustmentReason && (
                              <span style={{ fontSize: '0.68rem', color: T.txtSecondary, fontStyle: 'italic', maxWidth: '110px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                ({adjustmentReason})
                              </span>
                            )}
                          </div>
                          <span style={{ fontWeight: '900' }}>
                            {numAdjustment !== 0 ? `${numAdjustment > 0 ? '+' : ''}${formatRupiah(numAdjustment)}` : 'Rp 0'}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* ALWAYS VISIBLE TOTAL ROW */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '8px', marginTop: '2px', borderTop: `1px solid ${T.border}` }}>
                      <span style={{ fontSize: '0.86rem', fontWeight: '800', color: T.txtPrimary }}>
                        Total ({cart.reduce((s, i) => s + i.qty, 0)} items)
                      </span>
                      <span style={{ fontSize: '1.2rem', fontWeight: '900', color: '#10b981' }}>
                        {formatRupiah(cartTotal)}
                      </span>
                    </div>
                  </div>

                  {/* Bottom Action Row 1: Batal, Cetak Tagihan, & Simpan */}
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                    <button
                      type="button"
                      disabled={cart.length === 0 && !activeRecallOrderId}
                      onClick={handleCancelCartOrder}
                      style={{
                        flex: '0 0 76px',
                        height: '42px',
                        background: (cart.length > 0 || activeRecallOrderId) ? 'rgba(239,68,68,0.12)' : (isCalmSage ? '#eef5f0' : '#1e293b'),
                        border: `1px solid ${(cart.length > 0 || activeRecallOrderId) ? '#ef4444' : T.borderCard}`,
                        color: (cart.length > 0 || activeRecallOrderId) ? '#ef4444' : T.txtMuted,
                        borderRadius: '10px',
                        fontWeight: '800',
                        fontSize: '0.80rem',
                        cursor: (cart.length > 0 || activeRecallOrderId) ? 'pointer' : 'not-allowed',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '4px'
                      }}
                      title="Batalkan & kosongkan keranjang pesanan tanpa mencetak struk"
                    >
                      <X size={15} />
                      <span>Batal</span>
                    </button>
                    <button
                      type="button"
                      disabled={cart.length === 0 && !(selectedTableId && tableStatusMap[selectedTableId]?.pendingOrder?.items?.length > 0) && !activeRecallOrderId}
                      onClick={handleGenerateContohTagihan}
                      style={{
                        flex: 1,
                        height: '42px',
                        background: (cart.length > 0 || (selectedTableId && tableStatusMap[selectedTableId]?.pendingOrder?.items?.length > 0) || activeRecallOrderId) ? 'rgba(56,189,248,0.15)' : (isCalmSage ? '#eef5f0' : '#1e293b'),
                        border: `1px solid ${(cart.length > 0 || (selectedTableId && tableStatusMap[selectedTableId]?.pendingOrder?.items?.length > 0) || activeRecallOrderId) ? '#0284c7' : T.borderCard}`,
                        color: (cart.length > 0 || (selectedTableId && tableStatusMap[selectedTableId]?.pendingOrder?.items?.length > 0) || activeRecallOrderId) ? '#0284c7' : T.txtMuted,
                        borderRadius: '10px',
                        fontWeight: '800',
                        fontSize: '0.82rem',
                        cursor: (cart.length > 0 || (selectedTableId && tableStatusMap[selectedTableId]?.pendingOrder?.items?.length > 0) || activeRecallOrderId) ? 'pointer' : 'not-allowed',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '4px'
                      }}
                      title="Lihat / cetak contoh tagihan sementara (Bill Meja)"
                    >
                      <FileText size={15} />
                      <span>Tagihan</span>
                    </button>
                    <button
                      type="button"
                      disabled={cart.length === 0}
                      onClick={handleHoldTableOrder}
                      style={{
                        flex: 1,
                        height: '42px',
                        background: cart.length > 0 ? (isCalmSage ? '#2d7a5b' : '#2563eb') : (isCalmSage ? '#eef5f0' : '#1e293b'),
                        border: `1px solid ${cart.length > 0 ? 'transparent' : T.borderCard}`,
                        color: cart.length > 0 ? '#ffffff' : T.txtMuted,
                        borderRadius: '10px',
                        fontWeight: '800',
                        fontSize: '0.82rem',
                        cursor: cart.length > 0 ? 'pointer' : 'not-allowed'
                      }}
                    >
                      Simpan
                    </button>
                  </div>

                  {/* Bottom Action Row 2: BAYAR (Kasir) vs KIRIM KE DAPUR (Waiters) */}
                  {isWaiter ? (
                    <button
                      type="button"
                      disabled={cart.length === 0}
                      onClick={handleHoldTableOrder}
                      style={{
                        width: '100%',
                        height: '46px',
                        background: cart.length > 0 ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : (isCalmSage ? '#e2e8f0' : '#1e293b'),
                        border: `1px solid ${cart.length > 0 ? '#059669' : (isCalmSage ? '#cbd5e1' : '#334155')}`,
                        borderRadius: '10px',
                        color: cart.length > 0 ? '#ffffff' : (isCalmSage ? '#94a3b8' : '#64748b'),
                        fontWeight: '900',
                        fontSize: '0.92rem',
                        cursor: cart.length > 0 ? 'pointer' : 'not-allowed',
                        boxShadow: cart.length > 0 ? '0 4px 14px rgba(16,185,129,0.4)' : 'none',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px'
                      }}
                      title="Kirim pesanan ke Dapur/Bar dan sinkronkan ke kasir"
                    >
                      <Send size={18} />
                      <span>Kirim ke Dapur / Simpan Pesanan (Waiters)</span>
                    </button>
                  ) : (
                    <button
                      type="button"
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
                        background: cart.length > 0 ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : (isCalmSage ? '#e2e8f0' : '#1e293b'),
                        border: `1px solid ${cart.length > 0 ? '#059669' : (isCalmSage ? '#cbd5e1' : '#334155')}`,
                        borderRadius: '10px',
                        color: cart.length > 0 ? '#ffffff' : (isCalmSage ? '#94a3b8' : '#64748b'),
                        fontWeight: '900',
                        fontSize: '0.95rem',
                        cursor: cart.length > 0 ? 'pointer' : 'not-allowed',
                        boxShadow: cart.length > 0 ? '0 4px 14px rgba(16,185,129,0.35)' : 'none',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px'
                      }}
                    >
                      <CreditCard size={18} />
                      <span>Bayar {cartTotal > 0 ? `(${formatRupiah(cartTotal)})` : ''}</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

        {/* TAB 2: CART (KERANJANG) */}
        {activeNavTab === 'chart' && (
          <div style={{ flex: 1, padding: '20px', overflowY: 'auto', width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h2 style={{ fontSize: '1.2rem', fontWeight: '900', color: 'var(--pos-txt-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ShoppingBag size={22} color="#2563eb" />
                  <span>Open Bills (Pesanan Gantung)</span>
                </h2>
                <p style={{ fontSize: '0.78rem', color: 'var(--pos-txt-secondary)', marginTop: '2px' }}>
                  Outlet: {currentOutlet.name} • Total {pendingOrdersList.length} Pesanan Aktif Gantung (Bebas / Non-FIFO / Parallel Multi-Order)
                </p>
              </div>
            </div>

            {/* KETERANGAN CART MULTI-ORDER NON-FIFO & RESET OTOMATIS PUKUL 08:00 AM */}
            <div style={{ background: 'var(--pos-bg-app)', padding: '12px 16px', borderRadius: '14px', border: '1px solid rgba(245,158,11,0.3)', marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '9px', height: '9px', borderRadius: '50%', background: '#f59e0b', boxShadow: '0 0 10px #f59e0b' }} />
                <div>
                  <div style={{ fontSize: '0.82rem', fontWeight: '800', color: 'var(--pos-txt-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>Kelola Cart Multi-Order (Non-FIFO / Bebas Akses):</span>
                    <span style={{ color: '#fbbf24', fontWeight: '900' }}>Bebas Pilih Orderan & Bayar / Edit Kapan Saja</span>
                  </div>
                  <div style={{ fontSize: '0.74rem', color: 'var(--pos-txt-secondary)', marginTop: '2px' }}>
                    <strong>Aturan Reset Otomatis:</strong> Sisa isi pesanan yang belum dibayar di Cart akan terhapus otomatis setiap pukul 08:00 WIB Pagi.
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: '800', color: '#fbbf24', background: 'rgba(245,158,11,0.12)', padding: '5px 12px', borderRadius: '8px', border: '1px solid rgba(245,158,11,0.3)' }}>
                  Reset Pukul 08:00 Pagi
                </span>
                {pendingOrdersList.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm('Yakin ingin mengosongkan seluruh pesanan yang tersisa di Cart?')) {
                        setCart([]);
                        setOpenedOriginalCart(null);
                        setTableStatusMap({});
                      }
                    }}
                    style={{
                      padding: '6px 14px',
                      background: 'rgba(239,68,68,0.2)',
                      border: '1px solid #ef4444',
                      color: '#fca5a5',
                      borderRadius: '8px',
                      fontSize: '0.76rem',
                      fontWeight: '800',
                      cursor: 'pointer'
                    }}
                  >
                    Reset Isi Cart
                  </button>
                )}
              </div>
            </div>

            {pendingOrdersList.length === 0 ? (
              <div style={{ background: 'var(--pos-bg-card)', borderRadius: '16px', padding: '40px', textAlign: 'center', color: 'var(--pos-txt-secondary)' }}>
                <ShoppingBag size={48} strokeWidth={1} style={{ marginBottom: '12px', color: '#2563eb', opacity: 0.7 }} />
                <div style={{ fontSize: '1rem', fontWeight: '800', color: 'var(--pos-txt-primary)' }}>Belum Ada Pesanan di Cart</div>
                <div style={{ fontSize: '0.78rem', marginTop: '4px' }}>Saat Anda menekan 'Simpan' di Kasir, daftar pesanan gantung akan tersimpan di Cart.</div>
              </div>
            ) : (
              <div style={{ background: 'var(--pos-bg-card)', borderRadius: '16px', border: '1px solid var(--pos-border)', overflow: 'hidden' }}>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.82rem' }}>
                    <thead>
                      <tr style={{ background: 'var(--pos-bg-app)', borderBottom: '1px solid var(--pos-border-card)', color: 'var(--pos-txt-secondary)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
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
                          onClick={() => handleRecallPendingOrder(row)}
                          style={{
                            borderBottom: '1px solid rgba(255,255,255,0.05)',
                            color: 'var(--pos-txt-primary)',
                            cursor: 'pointer'
                          }}
                        >
                          {/* 1. NO STRUK */}
                          <td style={{ padding: '14px', fontFamily: 'monospace', fontWeight: '800', color: '#60a5fa' }}>
                            {row.receiptNo}
                          </td>

                          {/* 2. TANGGAL */}
                          <td style={{ padding: '14px', color: 'var(--pos-txt-secondary)' }}>
                            {row.date}
                          </td>

                          {/* 3. JAM */}
                          <td style={{ padding: '14px', color: 'var(--pos-txt-secondary)' }}>
                            {row.time}
                          </td>

                          {/* 4. NAMA PELANGGAN */}
                          <td style={{ padding: '14px', fontWeight: '700', color: 'var(--pos-txt-primary)' }}>
                            {row.customerName}
                          </td>

                          {/* 5. NOMOR MEJA */}
                          <td style={{ padding: '14px' }}>
                            <span style={{ background: 'rgba(37,99,235,0.2)', color: '#60a5fa', padding: '3px 8px', borderRadius: '6px', fontWeight: '800', fontSize: '0.75rem' }}>
                              {row.tableNumber}
                            </span>
                          </td>

                          {/* 6. TOTAL TAGIHAN */}
                          <td style={{ padding: '14px', fontWeight: '900', color: '#34d399', fontSize: '0.9rem' }}>
                            {formatRupiah(row.totalAmount)}
                          </td>

                          {/* 7. STATUS */}
                          <td style={{ padding: '14px' }}>
                            <span style={{ background: 'rgba(244,63,94,0.15)', color: '#fb7185', border: '1px solid rgba(244,63,94,0.3)', padding: '3px 10px', borderRadius: '20px', fontSize: '0.72rem', fontWeight: '800' }}>
                              {row.status}
                            </span>
                          </td>

                          {/* 8. AKSI */}
                          <td style={{ padding: '14px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRecallPendingOrder(row);
                                }}
                                style={{
                                  background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                                  color: 'var(--pos-txt-primary)',
                                  border: 'none',
                                  padding: '6px 12px',
                                  borderRadius: '8px',
                                  fontSize: '0.75rem',
                                  fontWeight: '800',
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px'
                                }}
                              >
                                Buka / Ubah
                              </button>

                              <button
                                type="button"
                                onClick={(e) => handleQuickPayPendingOrder(row, e)}
                                style={{
                                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                  color: 'var(--pos-txt-primary)',
                                  border: 'none',
                                  padding: '6px 12px',
                                  borderRadius: '8px',
                                  fontSize: '0.75rem',
                                  fontWeight: '800',
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  boxShadow: '0 2px 8px rgba(16,185,129,0.3)'
                                }}
                              >
                                Bayar
                              </button>

                              <button
                                type="button"
                                onClick={(e) => handleDeletePendingOrder(row, e)}
                                style={{
                                  background: 'rgba(239, 68, 68, 0.15)',
                                  border: '1px solid rgba(239, 68, 68, 0.4)',
                                  color: '#f87171',
                                  padding: '6px 12px',
                                  borderRadius: '8px',
                                  fontSize: '0.75rem',
                                  fontWeight: '800',
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px'
                                }}
                              >
                                Hapus
                              </button>
                            </div>
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
        {/* TAB 3: RIWAYAT TRANSAKSI */}
        {(activeNavTab === 'riwayat' || activeNavTab === 'riwayat_transaksi') && (
          <div style={{ flex: 1, padding: '20px', overflowY: 'auto', width: '100%', background: T.bgApp, color: T.txtPrimary }}>
            {/* Header + Filter Tabs */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: '900', color: T.txtPrimary, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <History size={22} color="#38bdf8" />
                  <span>Riwayat Struk Transaksi Kasir</span>
                </h2>
                <p style={{ fontSize: '0.80rem', color: T.txtSecondary, margin: '4px 0 0 0', fontWeight: '600' }}>
                  Outlet: <strong style={{ color: '#38bdf8' }}>{currentOutlet.name}</strong> •{' '}
                  <strong style={{ color: '#10b981' }}>{filteredRiwayatTransactions.length}</strong> Transaksi •{' '}
                  <span style={{ color: riwayatFilterMode === 'today' ? '#10b981' : riwayatFilterMode === 'yesterday' ? '#38bdf8' : '#f59e0b', fontWeight: '800' }}>
                    {riwayatFilterMode === 'today' ? 'Hari Ini' : riwayatFilterMode === 'yesterday' ? 'Kemarin' : `${riwayatCustomStart} s/d ${riwayatCustomEnd}`}
                  </span>
                </p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <button 
                  type="button" 
                  onClick={() => setRiwayatFilterMode('today')} 
                  style={{ 
                    padding: '9px 18px', 
                    borderRadius: '10px', 
                    fontWeight: '900', 
                    fontSize: '0.82rem', 
                    cursor: 'pointer', 
                    border: riwayatFilterMode === 'today' ? '2px solid #10b981' : `1px solid ${T.borderCard}`, 
                    background: riwayatFilterMode === 'today' ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : (isCalmSage ? '#eaf2ec' : '#1e293b'), 
                    color: riwayatFilterMode === 'today' ? '#ffffff' : T.txtPrimary,
                    boxShadow: riwayatFilterMode === 'today' ? '0 4px 12px rgba(16,185,129,0.3)' : 'none'
                  }}
                >
                  Hari Ini
                </button>
                <button 
                  type="button" 
                  onClick={() => setRiwayatFilterMode('yesterday')} 
                  style={{ 
                    padding: '9px 18px', 
                    borderRadius: '10px', 
                    fontWeight: '900', 
                    fontSize: '0.82rem', 
                    cursor: 'pointer', 
                    border: riwayatFilterMode === 'yesterday' ? '2px solid #38bdf8' : `1px solid ${T.borderCard}`, 
                    background: riwayatFilterMode === 'yesterday' ? 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)' : (isCalmSage ? '#eaf2ec' : '#1e293b'), 
                    color: riwayatFilterMode === 'yesterday' ? '#ffffff' : T.txtPrimary,
                    boxShadow: riwayatFilterMode === 'yesterday' ? '0 4px 12px rgba(56,189,248,0.3)' : 'none'
                  }}
                >
                  Kemarin
                </button>
                <button 
                  type="button" 
                  onClick={() => setRiwayatFilterMode('custom')} 
                  style={{ 
                    padding: '9px 18px', 
                    borderRadius: '10px', 
                    fontWeight: '900', 
                    fontSize: '0.82rem', 
                    cursor: 'pointer', 
                    border: riwayatFilterMode === 'custom' ? '2px solid #f59e0b' : `1px solid ${T.borderCard}`, 
                    background: riwayatFilterMode === 'custom' ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' : (isCalmSage ? '#eaf2ec' : '#1e293b'), 
                    color: riwayatFilterMode === 'custom' ? '#ffffff' : T.txtPrimary,
                    boxShadow: riwayatFilterMode === 'custom' ? '0 4px 12px rgba(245,158,11,0.3)' : 'none'
                  }}
                >
                  Custom
                </button>
              </div>
            </div>

            {/* Custom Date Range Picker */}
            {riwayatFilterMode === 'custom' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px', background: isCalmSage ? '#fffbeb' : 'rgba(251,191,36,0.1)', border: '1px solid rgba(245,158,11,0.4)', borderRadius: '12px', padding: '12px 16px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.80rem', fontWeight: '800', color: '#d97706' }}>Rentang Tanggal:</span>
                <input type="date" value={riwayatCustomStart} onChange={e => setRiwayatCustomStart(e.target.value)} style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid rgba(245,158,11,0.5)', background: T.bgInput, color: T.txtPrimary, fontSize: '0.82rem', fontWeight: '700' }} />
                <span style={{ color: '#d97706', fontWeight: '800' }}>s/d</span>
                <input type="date" value={riwayatCustomEnd} onChange={e => setRiwayatCustomEnd(e.target.value)} style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid rgba(245,158,11,0.5)', background: T.bgInput, color: T.txtPrimary, fontSize: '0.82rem', fontWeight: '700' }} />
              </div>
            )}

            {/* KETERANGAN SYNC MOBILE APK DENGAN SERVER & DATABASE */}
            <div style={{ background: T.bgCard, padding: '14px 18px', borderRadius: '14px', border: `1px solid ${T.borderCard}`, marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', boxShadow: isCalmSage ? '0 2px 8px rgba(21,46,34,0.05)' : 'none' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 10px #10b981' }} />
                <div>
                  <div style={{ fontSize: '0.84rem', fontWeight: '800', color: T.txtPrimary, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>Sinkronisasi Riwayat Transaksi:</span>
                    <span style={{ color: '#10b981', fontWeight: '900' }}>Live Server & Database Synced</span>
                  </div>
                  <div style={{ fontSize: '0.76rem', color: T.txtSecondary, marginTop: '2px', fontWeight: '600' }}>
                    Seluruh riwayat transaksi kasir terhubung dan tersimpan real-time di Database Server & Web Admin.
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '0.76rem', fontWeight: '800', color: T.txtSecondary, background: isCalmSage ? '#eef5f0' : '#1e293b', padding: '5px 12px', borderRadius: '8px', border: `1px solid ${T.borderCard}` }}>
                  {lastSyncTime}
                </span>
                <button
                  type="button"
                  onClick={handleTriggerSyncData}
                  disabled={isSyncingNow}
                  style={{
                    padding: '8px 16px',
                    background: isSyncingNow ? (isCalmSage ? '#c8ded1' : '#334155') : 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                    border: 'none',
                    color: '#ffffff',
                    borderRadius: '10px',
                    fontSize: '0.80rem',
                    fontWeight: '900',
                    cursor: isSyncingNow ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: isSyncingNow ? 'none' : '0 3px 10px rgba(37,99,235,0.3)'
                  }}
                >
                  <RefreshCw size={14} className={isSyncingNow ? 'animate-spin' : ''} />
                  <span>{isSyncingNow ? 'Syncing...' : 'Sync Riwayat ke Server'}</span>
                </button>
              </div>
            </div>

            {filteredRiwayatTransactions.length === 0 ? (
              <div style={{ background: T.bgCard, borderRadius: '16px', padding: '48px 20px', textAlign: 'center', border: `1px solid ${T.borderCard}`, boxShadow: isCalmSage ? '0 2px 8px rgba(21,46,34,0.05)' : 'none' }}>
                <History size={48} strokeWidth={1.5} style={{ marginBottom: '12px', color: '#38bdf8' }} />
                <div style={{ fontSize: '1.05rem', fontWeight: '900', color: T.txtPrimary }}>Belum Ada Riwayat Transaksi</div>
                <div style={{ fontSize: '0.82rem', marginTop: '6px', color: T.txtSecondary, fontWeight: '600' }}>
                  {riwayatFilterMode === 'today' ? 'Belum ada transaksi hari ini.' : riwayatFilterMode === 'yesterday' ? 'Tidak ada transaksi kemarin.' : 'Tidak ada transaksi di rentang tanggal ini.'}
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {filteredRiwayatTransactions.map(tx => (
                  <div 
                    key={tx.id} 
                    style={{ 
                      background: T.bgCard, 
                      padding: '16px 20px', 
                      borderRadius: '16px', 
                      border: `1px solid ${T.borderCard}`, 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center',
                      boxShadow: isCalmSage ? '0 2px 8px rgba(21,46,34,0.05)' : '0 4px 14px rgba(0,0,0,0.25)',
                      flexWrap: 'wrap',
                      gap: '12px'
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '0.92rem', fontWeight: '900', color: '#0284c7' }}>#{tx.id}</span>

                        {/* BADGE STATUS TRANSAKSI */}
                        {(tx.is_offline_pending || tx.status === 'offline_pending' || tx.status === 'ditunda') ? (
                          <span style={{ fontSize: '0.70rem', padding: '3px 10px', borderRadius: '6px', background: 'rgba(245,158,11,0.15)', color: '#d97706', border: '1px solid #f59e0b', fontWeight: '800', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            Pending Sync (Offline)
                          </span>
                        ) : (
                          <span style={{ fontSize: '0.70rem', padding: '3px 10px', borderRadius: '6px', background: 'rgba(16,185,129,0.15)', color: '#059669', border: '1px solid #10b981', fontWeight: '800', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            Approved / Tersinkron
                          </span>
                        )}

                        <span style={{ fontSize: '0.72rem', padding: '3px 9px', borderRadius: '6px', background: isCalmSage ? '#eef5f0' : '#1e293b', color: T.txtPrimary, border: `1px solid ${T.borderCard}`, fontWeight: '800' }}>
                          {tx.payment_method || 'Cash'}
                        </span>
                        <span style={{ fontSize: '0.72rem', padding: '3px 9px', borderRadius: '6px', background: 'rgba(99,102,241,0.15)', color: '#6366f1', border: '1px solid rgba(99,102,241,0.3)', fontWeight: '800' }}>
                          {tx.order_type || 'Dine In'}
                        </span>
                        {tx.table_number && (
                          <span style={{ fontSize: '0.74rem', color: '#d97706', fontWeight: '800', background: 'rgba(245,158,11,0.12)', padding: '2px 8px', borderRadius: '6px' }}>
                            {tx.table_number}
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: T.txtSecondary, marginTop: '6px', fontWeight: '600' }}>
                        {tx.date} {tx.time || ''} • Pelanggan: <strong style={{ color: T.txtPrimary }}>{tx.customer_name || 'Pelanggan Umum'}</strong> • Kasir: <strong style={{ color: T.txtPrimary }}>{tx.cashier || 'Kasir'}</strong>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '1.05rem', fontWeight: '900', color: '#10b981' }}>{formatRupiah(tx.amount)}</div>
                        <div style={{ fontSize: '0.72rem', color: T.txtSecondary, fontWeight: '700' }}>{(tx.items || []).length} Item Menu</div>
                      </div>
                      <button 
                        type="button"
                        onClick={() => setSelectedTxDetail(tx)} 
                        style={{ 
                          padding: '8px 16px', 
                          borderRadius: '10px', 
                          border: `1px solid ${T.borderCard}`, 
                          background: isCalmSage ? '#2d7a5b' : '#2563eb', 
                          color: '#ffffff', 
                          fontWeight: '800', 
                          fontSize: '0.78rem',
                          cursor: 'pointer',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
                        }}
                      >
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
          <div style={{ flex: 1, display: 'flex', width: '100%', height: '100%', background: 'var(--pos-bg-app)', overflow: 'hidden' }}>
            
            {/* ----------------------------------------------------------- */}
            {/* LEFT PANEL: DAFTAR KARTU PELANGGAN (45% WIDTH)              */}
            {/* ----------------------------------------------------------- */}
            <div style={{ flex: '0 0 45%', display: 'flex', flexDirection: 'column', borderRight: '1px solid var(--pos-border)', background: 'var(--pos-bg-card)' }}>
              
              {/* Header Left Panel: Search & Button Add Customer */}
              <div style={{ padding: '16px', borderBottom: '1px solid var(--pos-border)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'var(--pos-bg-app)', border: '1px solid var(--pos-border-card)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Grid size={18} color="#a78bfa" />
                </div>
                <div style={{ flex: 1, position: 'relative' }}>
                  <input
                    type="text"
                    value={custSearchFilter}
                    onChange={e => setCustSearchFilter(e.target.value)}
                    placeholder="Cari Nama / No Telepon..."
                    style={{ width: '100%', padding: '9px 12px 9px 34px', borderRadius: '10px', border: '1px solid var(--pos-border-card)', background: 'var(--pos-bg-app)', color: 'var(--pos-txt-primary)', fontSize: '0.82rem', outline: 'none' }}
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
                  style={{ width: '38px', height: '38px', borderRadius: '10px', background: '#6366f1', border: 'none', color: 'var(--pos-txt-white)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 4px 12px rgba(99,102,241,0.3)' }}
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
                    const custOutletName = c.outlet_name || currentOutlet.name || outlets[0]?.name || 'Outlet Barokah';

                    return (
                      <div
                        key={c.id}
                        onClick={() => setSelectedCustomerIdForDetail(c.id)}
                        style={{
                          background: isSelected ? 'rgba(99,102,241,0.12)' : 'var(--pos-bg-app)',
                          border: '2px solid',
                          borderColor: isSelected ? '#6366f1' : 'var(--pos-border-card)',
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
                        <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: 'var(--pos-bg-card)', border: '1px solid var(--pos-border-card)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '8px' }}>
                          <User size={20} color="#a78bfa" />
                        </div>
                        {/* ID - Name */}
                        <div style={{ fontSize: '0.85rem', fontWeight: '900', color: 'var(--pos-txt-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>
                          {custCode}
                        </div>
                        <div style={{ fontSize: '0.76rem', fontWeight: '800', color: '#6366f1', marginTop: '1px' }}>
                          {c.name}
                        </div>
                        {/* Phone */}
                        <div style={{ fontSize: '0.74rem', color: 'var(--pos-txt-secondary)', margin: '4px 0 6px 0' }}>
                          {c.phone || '-'}
                        </div>
                        {/* Location / Outlet */}
                        <div style={{ fontSize: '0.68rem', color: 'var(--pos-txt-secondary)', display: 'flex', alignItems: 'center', gap: '3px' }}>
                          <span></span>
                          <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '110px' }}>{custOutletName}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Bottom Self-Reg Bar */}
              <div style={{ padding: '12px 16px', background: 'var(--pos-bg-app)', borderTop: '1px solid var(--pos-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--pos-txt-secondary)', fontWeight: '700' }}>Registrasi Mandiri Pelanggan:</span>
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
              // Jika tidak ada pelanggan sama sekali, tampilkan placeholder kosong
              if (!activeCust) {
                return (
                  <div style={{ flex: '0 0 55%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--pos-bg-app)', padding: '24px' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '12px' }}></div>
                    <div style={{ fontSize: '0.9rem', fontWeight: '700', color: 'var(--pos-txt-secondary)', textAlign: 'center' }}>
                      Belum ada data pelanggan.<br />Tambahkan pelanggan terlebih dahulu.
                    </div>
                  </div>
                );
              }
              const custCode = activeCust.code || `000${activeCust.id} - BMJ`;
              const custOutletName = activeCust.outlet_name || (masterData.outlets || []).find(o => o.id === activeCust.outlet_id)?.name || currentOutlet.name || outlets[0]?.name || 'Outlet Barokah';

              return (
                <div style={{ flex: '0 0 55%', display: 'flex', flexDirection: 'column', background: 'var(--pos-bg-app)', padding: '24px', overflowY: 'auto' }}>
                  
                  {/* Top Bar Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid var(--pos-border)', paddingBottom: '14px' }}>
                    <h3 style={{ fontSize: '1.2rem', fontWeight: '900', color: 'var(--pos-txt-primary)', margin: 0 }}>Detail Pelanggan</h3>
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
                      style={{ padding: '8px 16px', background: '#6366f1', color: 'var(--pos-txt-white)', border: 'none', borderRadius: '10px', fontSize: '0.82rem', fontWeight: '900', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                      <span>Ubah</span>
                    </button>
                  </div>

                  {/* Header Profile Banner */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
                    <div style={{ width: '54px', height: '54px', borderRadius: '50%', background: 'var(--pos-bg-card)', border: '2px solid #6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <User size={26} color="#6366f1" />
                    </div>
                    <div>
                      <div style={{ fontSize: '1.2rem', fontWeight: '900', color: 'var(--pos-txt-primary)' }}>
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
                        background: custDetailSubTab === 'detail' ? '#6366f1' : 'var(--pos-bg-card)',
                        color: custDetailSubTab === 'detail' ? '#ffffff' : '#94a3b8',
                        fontSize: '0.82rem', fontWeight: '900', cursor: 'pointer'
                      }}
                    >
                      Detail Pelanggan
                    </button>
                    <button
                      type="button"
                      onClick={() => setCustDetailSubTab('membership')}
                      style={{
                        padding: '8px 18px', borderRadius: '10px', border: 'none',
                        background: custDetailSubTab === 'membership' ? '#6366f1' : 'var(--pos-bg-card)',
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
                      <div style={{ background: 'var(--pos-bg-card)', borderRadius: '14px', padding: '18px', display: 'flex', flexDirection: 'column', gap: '14px', border: '1px solid rgba(255,255,255,0.06)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem' }}>
                          <span style={{ color: 'var(--pos-txt-secondary)', fontWeight: '700' }}>Nomor HP</span>
                          <span style={{ fontWeight: '900', color: 'var(--pos-txt-primary)' }}>{activeCust.phone || '-'}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem' }}>
                          <span style={{ color: 'var(--pos-txt-secondary)', fontWeight: '700' }}>Kategori Harga</span>
                          <span style={{ fontWeight: '900', color: '#38bdf8' }}>{activeCust.customer_type || activeCust.price_category || 'Reguler'}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem' }}>
                          <span style={{ color: 'var(--pos-txt-secondary)', fontWeight: '700' }}>Outlet Terdaftar</span>
                          <span style={{ fontWeight: '900', color: '#fbbf24' }}>{custOutletName}</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* SUB-TAB 2: MEMBERSHIP / QR REGISTRASI MANDIRI */
                    <div style={{ background: 'var(--pos-bg-card)', borderRadius: '16px', padding: '24px', textAlign: 'center', border: '1px solid var(--pos-border-card)' }}>
                      <div style={{ fontSize: '0.95rem', fontWeight: '900', color: 'var(--pos-txt-primary)', marginBottom: '6px' }}>
                        QR Code Membership & Registrasi Mandiri Pelanggan
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--pos-txt-secondary)', marginBottom: '20px' }}>
                        Pelanggan dapat melakukan scan QR Code ini menggunakan kamera smartphone untuk mendaftar profil mandiri.
                      </div>

                      {/* Real Scannable Barcode / QR Code Box */}
                      <div style={{ background: '#ffffff', padding: '20px', borderRadius: '16px', display: 'inline-block', marginBottom: '20px', boxShadow: '0 10px 25px rgba(0,0,0,0.3)' }}>
                        {(() => {
                          const isLocalOrNative = typeof window !== 'undefined' && (
                            window.location.origin.includes('localhost') ||
                            window.location.origin.includes('capacitor') ||
                            window.location.origin.includes('127.0.0.1') ||
                            window.location.protocol === 'file:'
                          );
                          const publicBaseUrl = isLocalOrNative 
                            ? 'https://mris.barokahgroupindonesia.tech' 
                            : window.location.origin;
                          const selfRegUrl = `${publicBaseUrl}/register-customer?outlet=${currentOutlet.id || 1}`;
                          return (
                            <img 
                              src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(selfRegUrl)}`} 
                              alt="QR Code Membership"
                              onError={(e) => {
                                e.target.onerror = null;
                                e.target.src = `https://quickchart.io/qr?text=${encodeURIComponent(selfRegUrl)}&size=200`;
                              }}
                              style={{ width: '160px', height: '160px', display: 'block', margin: '0 auto', borderRadius: '8px', background: '#ffffff' }}
                            />
                          );
                        })()}
                        <div style={{ fontSize: '0.85rem', fontWeight: '900', color: '#000000', marginTop: '10px', fontFamily: 'monospace' }}>
                          MEMBER-{custCode.split(' ')[0]}
                        </div>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
                        <button
                          type="button"
                          onClick={() => setShowQrSelfRegModal(true)}
                          style={{ padding: '10px 20px', background: '#38bdf8', color: 'var(--pos-bg-app)', border: 'none', borderRadius: '10px', fontWeight: '900', fontSize: '0.82rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
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

        
        {/* TAB NAVIGASI: KITCHEN DISPLAY SYSTEM (KDS DAPUR MAKANAN KHUSUS OUTLET AKTIF) */}
        {activeNavTab === 'kds' && (
          <div style={{ flex: 1, height: '100%', width: '100%', overflow: 'hidden', background: 'var(--pos-bg-app)' }}>
            <KitchenDisplayPage
              masterData={masterData}
              selectedBranch={currentOutlet?.id || selectedBranch}
              forceOutletId={currentOutlet?.id}
              forceKitchenOnly={true}
              isPosMobile={true}
              themeMode={isCalmSage ? 'calm_sage' : 'dark'}
            />
          </div>
        )}

        {/* TAB NAVIGASI: SHIFT & AKTIVITAS PENGGUNA APLIKASI */}
        {activeNavTab === 'shift' && (
          <div style={{ flex: 1, padding: '24px', overflowY: 'auto', width: '100%', background: 'var(--pos-bg-app)' }}>
            
            {/* Header Title */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: '900', color: 'var(--pos-txt-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Clock size={24} color="#38bdf8" />
                  <span>Shift Kasir & Aktivitas Pengguna Aplikasi</span>
                </h2>
                <p style={{ fontSize: '0.78rem', color: 'var(--pos-txt-secondary)', margin: '4px 0 0 0' }}>
                  Aktivitas sesi login/logout kasir, durasi kerja, jumlah struk transaksi, dan total nominal uang di {currentOutlet.name}
                </p>
              </div>

              {/* Action Button Closing Shift */}
              <button
                onClick={() => {
                  doFlushOfflineQueue();
                  setShowShiftClosingModal(true);
                }}
                style={{ padding: '10px 18px', background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)', color: 'var(--pos-txt-white)', border: 'none', borderRadius: '10px', fontWeight: '900', fontSize: '0.82rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', boxShadow: '0 4px 14px rgba(239,68,68,0.3)' }}
              >
                <Clock size={16} />
                <span>Closing Sesi Shift Aktif (Tutup Shift)</span>
              </button>
            </div>

            {/* WIDGET KALENDER RENTANG WAKTU (DATE RANGE PICKER) & SEARCH BAR */}
            <div style={{ background: 'var(--pos-bg-card)', padding: '16px', borderRadius: '16px', border: '1px solid var(--pos-border)', marginBottom: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                
                {/* Preset Buttons */}
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.78rem', color: 'var(--pos-txt-secondary)', fontWeight: '700', marginRight: '4px' }}>Filter Rentang:</span>
                  {[
                    { id: 'all', label: 'Semua' },
                    { id: 'today', label: 'Hari Ini' },
                    { id: '7days', label: '7 Hari Terakhir' },
                    { id: 'custom', label: 'Custom Tanggal' }
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
                        background: shiftDatePreset === p.id ? 'rgba(56,189,248,0.2)' : 'var(--pos-bg-app)',
                        color: shiftDatePreset === p.id ? '#38bdf8' : 'var(--pos-txt-secondary)',
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
                    style={{ width: '100%', padding: '8px 12px 8px 32px', borderRadius: '8px', border: '1px solid var(--pos-border-card)', background: 'var(--pos-bg-app)', color: 'var(--pos-txt-primary)', fontSize: '0.80rem', outline: 'none' }}
                  />
                  <Search size={15} color="#94a3b8" style={{ position: 'absolute', left: '10px', top: '9px' }} />
                </div>
              </div>

              {/* Date Input Pickers (When Custom is selected or to adjust range) */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'var(--pos-bg-app)', padding: '10px 14px', borderRadius: '10px', border: '1px solid var(--pos-border-card)' }}>
                <span style={{ fontSize: '0.76rem', color: 'var(--pos-txt-secondary)', fontWeight: '800' }}>Rentang Tanggal Kalender:</span>
                <input
                  type="date"
                  value={shiftStartDate}
                  onChange={e => {
                    setShiftStartDate(e.target.value);
                    setShiftDatePreset('custom');
                  }}
                  style={{ background: 'var(--pos-bg-card)', border: '1px solid var(--pos-border-card)', borderRadius: '6px', color: 'var(--pos-txt-primary)', padding: '4px 8px', fontSize: '0.78rem', outline: 'none' }}
                />
                <span style={{ color: 'var(--pos-txt-secondary)', fontSize: '0.8rem' }}>s/d</span>
                <input
                  type="date"
                  value={shiftEndDate}
                  onChange={e => {
                    setShiftEndDate(e.target.value);
                    setShiftDatePreset('custom');
                  }}
                  style={{ background: 'var(--pos-bg-card)', border: '1px solid var(--pos-border-card)', borderRadius: '6px', color: 'var(--pos-txt-primary)', padding: '4px 8px', fontSize: '0.78rem', outline: 'none' }}
                />
              </div>
            </div>

            {/* TABEL SHIFT USER PENGGUNA APLIKASI (FULL TABULAR VIEW) */}
            {(() => {
              const todayStr = new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
              const activeShiftTotalSales = (outletTransactions || []).reduce((sum, tx) => sum + (tx.amount || 0), 0);
              const activeShiftTxCount = (outletTransactions || []).length;
              const activeShiftCash = (outletTransactions || []).filter(tx => (tx.payment_method || 'Cash') === 'Cash').reduce((sum, tx) => sum + (tx.amount || 0), 0);
              const activeShiftQris = (outletTransactions || []).filter(tx => (tx.payment_method || '').toLowerCase().includes('qris')).reduce((sum, tx) => sum + (tx.amount || 0), 0);
              const activeShiftEdc = (outletTransactions || []).filter(tx => (tx.payment_method || '') === 'EDC').reduce((sum, tx) => sum + (tx.amount || 0), 0);

              const activeUserShift = {
                id: `SHIFT-${currentUserSession?.username || userSession?.username || 'USR'}-${new Date().toISOString().slice(0,10).replace(/-/g,'')}`,
                username: currentUserSession?.username || userSession?.username || '',
                user_name: currentUserSession?.name || userSession?.name || currentUserSession?.username || userSession?.username || 'Kasir POS',
                role: currentUserSession?.role || userSession?.role || 'Kasir',
                outlet_name: currentOutlet?.name || '',
                status: 'AKTIF BERLANGSUNG',
                login_time: shiftLoginTime,
                logout_time: 'Masih Login (Shift Berjalan)',
                duration_label: 'Sesuai Jam Berjalan',
                total_receipts: activeShiftTxCount,
                total_sales: activeShiftTotalSales,
                cash_sales: activeShiftCash,
                qris_sales: activeShiftQris,
                edc_sales: activeShiftEdc,
                initial_cash: initialCash || 0,
                transactions: outletTransactions || []
              };

              const pastShifts = (masterData?.closedShifts || masterData?.shift_closings || masterData?.shiftLogs || []).filter(s => {
                if (!currentOutlet?.id || currentOutlet?.id === 'central') return true;
                return !s.outlet_id || String(s.outlet_id) === String(currentOutlet.id) || String(s.branch_name || '').toLowerCase().includes(String(currentOutlet.name || '').toLowerCase());
              });

              const hasActiveSession = !!(currentUserSession?.name || userSession?.name || currentUserSession?.username || userSession?.username);
              const rawShiftList = [
                ...(hasActiveSession ? [activeUserShift] : []),
                ...pastShifts
              ];

              const shiftList = rawShiftList.filter(s => {
                const q = debouncedShiftUserSearch.toLowerCase();
                const userNameStr = (s.user_name || s.cashier_name || s.author_name || s.submitted_by || s.cashier || s.name || '').toLowerCase();
                const usernameStr = (s.username || '').toLowerCase();
                const roleStr = (s.role || '').toLowerCase();
                return userNameStr.includes(q) || usernameStr.includes(q) || roleStr.includes(q);
              });

              return (
                <div style={{ background: 'var(--pos-bg-card)', borderRadius: '16px', border: '1px solid var(--pos-border)', overflow: 'hidden', boxShadow: '0 8px 24px rgba(0,0,0,0.3)' }}>
                  <div style={{ padding: '16px 20px', background: 'var(--pos-bg-app)', borderBottom: '1px solid var(--pos-border-card)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: '0.92rem', fontWeight: '900', color: 'var(--pos-txt-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Clock size={18} color="#38bdf8" />
                      <span>TABEL HISTORI SHIFT PENGGUNA APLIKASI ({shiftList.length})</span>
                    </div>
                  </div>

                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.80rem' }}>
                      <thead>
                        <tr style={{ background: 'var(--pos-bg-app)', color: 'var(--pos-txt-secondary)', borderBottom: '1px solid var(--pos-border-card)' }}>
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
                          const userNameDisplay = row.user_name || row.cashier_name || row.author_name || row.submitted_by || row.cashier || row.name || (row.username ? `@${row.username}` : 'Kasir POS');
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
                                  color: isAct ? '#38bdf8' : 'var(--pos-txt-secondary)',
                                  marginTop: '4px', display: 'inline-block'
                                }}>
                                  {isAct ? 'AKTIF' : 'SELESAI'}
                                </span>
                              </td>

                              <td style={{ padding: '14px 16px' }}>
                                <div style={{ fontWeight: '900', color: 'var(--pos-txt-primary)' }}>{userNameDisplay}</div>
                                <div style={{ fontSize: '0.72rem', color: 'var(--pos-txt-secondary)' }}>
                                  {row.username ? `@${row.username}` : (row.role || 'Staf Kasir')}
                                </div>
                              </td>

                              <td style={{ padding: '14px 16px' }}>
                                <div style={{ color: '#34d399', fontWeight: '800' }}>{row.login_time}</div>
                                <div style={{ color: isAct ? '#38bdf8' : 'var(--pos-txt-secondary)', marginTop: '2px' }}>{row.logout_time}</div>
                              </td>

                              <td style={{ padding: '14px 16px', fontWeight: '900', color: '#fbbf24' }}>
                                {row.duration_label}
                              </td>

                              <td style={{ padding: '14px 16px', fontWeight: '800', color: 'var(--pos-txt-primary)' }}>
                                {row.total_receipts} Struk
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
                                  Detail
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
          <div style={{ flex: 1, padding: '24px', overflowY: 'auto', width: '100%', background: 'var(--pos-bg-app)', display: 'flex', flexDirection: 'column' }}>
            
            {/* Header Laporan */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                {activeLaporanSubView !== null && (
                  <button
                    type="button"
                    onClick={() => setActiveLaporanSubView(null)}
                    style={{ padding: '8px 14px', background: 'var(--pos-bg-card)', border: '1px solid var(--pos-border-card)', color: '#38bdf8', borderRadius: '10px', fontWeight: '800', fontSize: '0.82rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    <span>⬅Kembali</span>
                  </button>
                )}
                <div>
                  <h2 style={{ fontSize: '1.25rem', fontWeight: '900', color: 'var(--pos-txt-primary)', margin: 0 }}>
                    {activeLaporanSubView === 'omzet' && 'Laporan Omzet & Penjualan'}
                    {activeLaporanSubView === 'harian' && 'Buat Laporan Harian & Rekonsiliasi Kas'}
                    {activeLaporanSubView === 'logistik' && 'Buat Laporan Logistik & Stok Bahan'}
                    {activeLaporanSubView === 'transfer' && 'Buat Laporan Transfer Bahan Baku Antarcabang'}
                    {activeLaporanSubView === 'waste' && 'Buat Laporan Barang Rusak (Waste)'}
                    {activeLaporanSubView === 'stok_opname_summary' && 'Laporan Stok Opname & Rekapitulasi Stok Keluar Outlet'}
                    {activeLaporanSubView === null && 'Dashboard Laporan Outlet'}
                  </h2>
                  <p style={{ fontSize: '0.78rem', color: 'var(--pos-txt-secondary)', margin: '3px 0 0 0' }}>
                    {currentOutlet.name} • Laporan Kasir & Performa Operasional
                  </p>
                </div>
              </div>

              {/* FILTER TABS OMZET — ditampilkan di header baris atas agar selalu terlihat */}
              {activeLaporanSubView === 'omzet' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={() => setOmzetFilterMode('today')}
                    style={{
                      padding: '9px 18px',
                      borderRadius: '10px',
                      fontWeight: '900',
                      fontSize: '0.82rem',
                      cursor: 'pointer',
                      border: omzetFilterMode === 'today' ? '2px solid #34d399' : '1px solid rgba(255,255,255,0.15)',
                      background: omzetFilterMode === 'today' ? '#34d399' : 'rgba(255,255,255,0.07)',
                      color: omzetFilterMode === 'today' ? '#0f172a' : 'rgba(255,255,255,0.6)'
                    }}
                  >
                    Hari Ini
                  </button>
                  <button
                    type="button"
                    onClick={() => setOmzetFilterMode('yesterday')}
                    style={{
                      padding: '9px 18px',
                      borderRadius: '10px',
                      fontWeight: '900',
                      fontSize: '0.82rem',
                      cursor: 'pointer',
                      border: omzetFilterMode === 'yesterday' ? '2px solid #38bdf8' : '1px solid rgba(255,255,255,0.15)',
                      background: omzetFilterMode === 'yesterday' ? '#38bdf8' : 'rgba(255,255,255,0.07)',
                      color: omzetFilterMode === 'yesterday' ? '#0f172a' : 'rgba(255,255,255,0.6)'
                    }}
                  >
                    Kemarin
                  </button>
                  <button
                    type="button"
                    onClick={() => setOmzetFilterMode('custom')}
                    style={{
                      padding: '9px 18px',
                      borderRadius: '10px',
                      fontWeight: '900',
                      fontSize: '0.82rem',
                      cursor: 'pointer',
                      border: omzetFilterMode === 'custom' ? '2px solid #fbbf24' : '1px solid rgba(255,255,255,0.15)',
                      background: omzetFilterMode === 'custom' ? '#fbbf24' : 'rgba(255,255,255,0.07)',
                      color: omzetFilterMode === 'custom' ? '#0f172a' : 'rgba(255,255,255,0.6)'
                    }}
                  >
                    Custom
                  </button>
                </div>
              )}
            </div>

            {/* KETERANGAN SYNC MOBILE APK DENGAN DATABASE SERVER & WEB ADMIN (UNTUK SELURUH LAPORAN) */}
            <div style={{ background: 'var(--pos-bg-app)', padding: '12px 16px', borderRadius: '14px', border: '1px solid rgba(56,189,248,0.25)', marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '9px', height: '9px', borderRadius: '50%', background: '#34d399', boxShadow: '0 0 10px #34d399' }} />
                <div>
                  <div style={{ fontSize: '0.82rem', fontWeight: '800', color: 'var(--pos-txt-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>Sinkronisasi Data Laporan Real-Time:</span>
                    <span style={{ color: '#34d399', fontWeight: '900' }}>Database Server & Web Admin Connected</span>
                  </div>
                  <div style={{ fontSize: '0.74rem', color: 'var(--pos-txt-secondary)', marginTop: '2px' }}>
                    Seluruh rekapitulasi harian, stok opname, transfer, dan barang rusak terhubung live dengan Web Admin untuk persetujuan (Approval).
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--pos-txt-secondary)', background: 'rgba(255,255,255,0.06)', padding: '4px 10px', borderRadius: '8px', border: '1px solid var(--pos-border)' }}>
                  {lastSyncTime}
                </span>
                <button
                  type="button"
                  onClick={handleTriggerSyncData}
                  disabled={isSyncingNow}
                  style={{
                    padding: '6px 14px',
                    background: isSyncingNow ? 'var(--pos-border-card)' : 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                    border: 'none',
                    color: 'var(--pos-txt-primary)',
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
                  <span>{isSyncingNow ? 'Syncing...' : 'Sync Laporan ke Server'}</span>
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

            {/* DETAILED SUB-VIEW 1: LAPORAN OMZET (HARI INI | KEMARIN | CUSTOM RENTANG TANGGAL) */}
            {activeLaporanSubView === 'omzet' && (() => {
              const now = new Date();
              const todayStr = now.toLocaleDateString('en-CA');

              const yesterdayObj = new Date(now);
              yesterdayObj.setDate(now.getDate() - 1);
              const yesterdayStr = yesterdayObj.toLocaleDateString('en-CA');

              const getTxDateStr = (tx) => {
                if (!tx) return '';
                const raw = tx.date || tx.entry_date || tx.transaction_date || tx.created_at || tx.timestamp;
                if (!raw) return '';
                if (typeof raw === 'number') {
                  const d = new Date(raw);
                  return d.toLocaleDateString('en-CA');
                } else if (typeof raw === 'string') {
                  const s = raw.trim();
                  if (s.includes('T')) return s.split('T')[0];
                  if (s.includes('-')) {
                    const parts = s.split('-');
                    if (parts[0].length === 4) return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
                    if (parts[2].length === 4) return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
                  }
                  if (s.includes('/')) {
                    const parts = s.split('/');
                    if (parts[0].length === 4) return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
                    if (parts[2].length === 4) return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
                  }
                }
                return String(raw).substring(0, 10);
              };

              const filteredOmzetTransactions = (outletTransactions || []).filter(tx => {
                const dStr = getTxDateStr(tx);
                if (!dStr) return false;

                if (omzetFilterMode === 'today') {
                  return dStr === todayStr;
                } else if (omzetFilterMode === 'yesterday') {
                  return dStr === yesterdayStr;
                } else if (omzetFilterMode === 'custom') {
                  const start = omzetCustomStartDate || todayStr;
                  const end = omzetCustomEndDate || todayStr;
                  return dStr >= start && dStr <= end;
                }
                return dStr === todayStr;
              });

              // Synthetic transactions dari manualEntryRecords sudah di-inject server-side
              // ke dalam salesTransactions (prefix SYN-) → otomatis masuk filteredOmzetTransactions
              const omzetGross = filteredOmzetTransactions.reduce((sum, tx) => sum + (tx.amount || 0), 0);
              const omzetCash = filteredOmzetTransactions
                .filter(tx => String(tx.payment_method || '').toLowerCase().includes('cash') || String(tx.payment_method || '').toLowerCase().includes('tunai'))
                .reduce((sum, tx) => sum + (tx.amount || 0), 0);
              const omzetNonCash = filteredOmzetTransactions
                .filter(tx => !String(tx.payment_method || '').toLowerCase().includes('cash') && !String(tx.payment_method || '').toLowerCase().includes('tunai'))
                .reduce((sum, tx) => sum + (tx.amount || 0), 0);

              // Breakdown Rinci Berdasarkan Metode Pembayaran
              const paymentBreakdownMap = {};
              filteredOmzetTransactions.forEach(tx => {
                let pm = String(tx.payment_method || tx.payment_type || 'Tunai (Cash)').trim();
                if (!pm || pm === '-') pm = 'Tunai (Cash)';
                const amt = Number(tx.amount || tx.grandTotal || tx.total || 0);
                if (!paymentBreakdownMap[pm]) {
                  paymentBreakdownMap[pm] = { name: pm, amount: 0, count: 0 };
                }
                paymentBreakdownMap[pm].amount += amt;
                paymentBreakdownMap[pm].count += 1;
              });
              const paymentBreakdownList = Object.values(paymentBreakdownMap).sort((a, b) => b.amount - a.amount);

              const getPaymentMethodIcon = (name) => {
                const n = String(name || '').toLowerCase();
                if (n.includes('cash') || n.includes('tunai')) return '💵';
                if (n.includes('qris')) return '📱';
                if (n.includes('debit') || n.includes('edc') || n.includes('kartu')) return '💳';
                if (n.includes('transfer') || n.includes('bca') || n.includes('mandiri') || n.includes('bri') || n.includes('bni') || n.includes('bank')) return '🏦';
                if (n.includes('gofood') || n.includes('grab') || n.includes('shopee') || n.includes('delivery') || n.includes('online')) return '🛵';
                return '🏷️';
              };

              const getPaymentMethodColor = (name) => {
                const n = String(name || '').toLowerCase();
                if (n.includes('cash') || n.includes('tunai')) return '#34d399';
                if (n.includes('qris')) return '#38bdf8';
                if (n.includes('debit') || n.includes('edc')) return '#818cf8';
                if (n.includes('transfer') || n.includes('bca') || n.includes('bank')) return '#a78bfa';
                if (n.includes('gofood') || n.includes('grab') || n.includes('shopee')) return '#f97316';
                return '#fbbf24';
              };

              let activeLabel = `Hari Ini (${todayStr})`;
              if (omzetFilterMode === 'yesterday') activeLabel = `Kemarin (${yesterdayStr})`;
              if (omzetFilterMode === 'custom') activeLabel = `${omzetCustomStartDate} s/d ${omzetCustomEndDate}`;

              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {/* Periode Label */}
                  <div style={{ fontSize: '0.82rem', color: 'var(--pos-txt-secondary)', fontWeight: '700' }}>
                    Menampilkan data periode: <strong style={{ color: '#34d399' }}>{activeLabel}</strong>
                  </div>

                  {/* Custom Date Range Picker inputs (Only when Custom is selected) */}
                  {omzetFilterMode === 'custom' && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px', background: 'var(--pos-bg-card)', padding: '14px 20px', borderRadius: '14px', border: '1px solid #fbbf24', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '0.82rem', fontWeight: '800', color: '#fbbf24' }}>Filter Rentang Tanggal:</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '0.78rem', color: 'var(--pos-txt-secondary)' }}>Dari:</span>
                        <input
                          type="date"
                          value={omzetCustomStartDate}
                          onChange={(e) => setOmzetCustomStartDate(e.target.value)}
                          style={{ background: 'var(--pos-bg-app)', border: '1px solid var(--pos-border)', borderRadius: '8px', color: 'var(--pos-txt-primary)', padding: '6px 10px', fontSize: '0.82rem', fontWeight: '800' }}
                        />
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '0.78rem', color: 'var(--pos-txt-secondary)' }}>Sampai:</span>
                        <input
                          type="date"
                          value={omzetCustomEndDate}
                          onChange={(e) => setOmzetCustomEndDate(e.target.value)}
                          style={{ background: 'var(--pos-bg-app)', border: '1px solid var(--pos-border)', borderRadius: '8px', color: 'var(--pos-txt-primary)', padding: '6px 10px', fontSize: '0.82rem', fontWeight: '800' }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Stat Cards Grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px' }}>
                    <div style={{ background: 'var(--pos-bg-card)', padding: '16px', borderRadius: '14px', border: '1px solid var(--pos-border)' }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--pos-txt-secondary)', fontWeight: '700' }}>Total Omzet (Setelah Diskon)</div>
                      <div style={{ fontSize: '1.2rem', fontWeight: '900', color: '#34d399', marginTop: '6px' }}>{formatRupiah(omzetGross)}</div>
                    </div>
                    <div style={{ background: 'var(--pos-bg-card)', padding: '16px', borderRadius: '14px', border: '1px solid var(--pos-border)' }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--pos-txt-secondary)', fontWeight: '700' }}>Total Struk Terjual</div>
                      <div style={{ fontSize: '1.2rem', fontWeight: '900', color: 'var(--pos-txt-primary)', marginTop: '6px' }}>{filteredOmzetTransactions.length} Struk</div>
                    </div>
                    <div style={{ background: 'var(--pos-bg-card)', padding: '16px', borderRadius: '14px', border: '1px solid var(--pos-border)' }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--pos-txt-secondary)', fontWeight: '700' }}>Kas Tunai / Cash</div>
                      <div style={{ fontSize: '1.2rem', fontWeight: '900', color: '#38bdf8', marginTop: '6px' }}>
                        {formatRupiah(omzetCash)}
                      </div>
                    </div>
                    <div style={{ background: 'var(--pos-bg-card)', padding: '16px', borderRadius: '14px', border: '1px solid var(--pos-border)' }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--pos-txt-secondary)', fontWeight: '700' }}>Non-Tunai (QRIS / EDC / Transfer)</div>
                      <div style={{ fontSize: '1.2rem', fontWeight: '900', color: '#a78bfa', marginTop: '6px' }}>
                        {formatRupiah(omzetNonCash)}
                      </div>
                    </div>
                  </div>

                  {/* PENJABARAN OMZET PER METODE PEMBAYARAN */}
                  <div style={{ background: 'var(--pos-bg-card)', borderRadius: '16px', padding: '20px', border: '1px solid var(--pos-border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
                      <div>
                        <h3 style={{ fontSize: '1rem', fontWeight: '900', color: 'var(--pos-txt-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span>💳</span>
                          <span>Penjabaran Omzet Berdasarkan Metode Pembayaran</span>
                        </h3>
                        <p style={{ fontSize: '0.76rem', color: 'var(--pos-txt-secondary)', margin: '4px 0 0 0' }}>
                          Rincian penerimaan omzet kasir per kanal metode pembayaran pada periode {activeLabel}
                        </p>
                      </div>
                      <span style={{ fontSize: '0.74rem', fontWeight: '800', background: 'rgba(99,102,241,0.15)', color: '#818cf8', padding: '4px 10px', borderRadius: '8px', border: '1px solid rgba(99,102,241,0.3)' }}>
                        {paymentBreakdownList.length} Kanal Pembayaran
                      </span>
                    </div>

                    {paymentBreakdownList.length === 0 ? (
                      <div style={{ padding: '24px', textAlign: 'center', color: '#64748b', fontSize: '0.80rem' }}>
                        Belum ada transaksi dengan metode pembayaran pada periode ini.
                      </div>
                    ) : (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
                        {paymentBreakdownList.map((pm, idx) => {
                          const pct = omzetGross > 0 ? ((pm.amount / omzetGross) * 100).toFixed(1) : '0.0';
                          const color = getPaymentMethodColor(pm.name);
                          const icon = getPaymentMethodIcon(pm.name);

                          return (
                            <div
                              key={idx}
                              style={{
                                background: 'var(--pos-bg-app)',
                                borderRadius: '12px',
                                padding: '14px',
                                border: '1px solid var(--pos-border)',
                                borderLeft: `4px solid ${color}`,
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '8px'
                              }}
                            >
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <span style={{ fontSize: '1.2rem' }}>{icon}</span>
                                  <div>
                                    <div style={{ fontSize: '0.82rem', fontWeight: '800', color: 'var(--pos-txt-primary)' }}>
                                      {pm.name}
                                    </div>
                                    <div style={{ fontSize: '0.70rem', color: 'var(--pos-txt-secondary)' }}>
                                      {pm.count} Struk Terverifikasi
                                    </div>
                                  </div>
                                </div>
                                <span style={{ fontSize: '0.74rem', fontWeight: '900', color: color, background: `${color}15`, padding: '2px 6px', borderRadius: '6px' }}>
                                  {pct}%
                                </span>
                              </div>

                              <div>
                                <div style={{ fontSize: '1.15rem', fontWeight: '900', color: color, letterSpacing: '-0.02em' }}>
                                  {formatRupiah(pm.amount)}
                                </div>
                              </div>

                              {/* Visual Progress Bar */}
                              <div style={{ width: '100%', height: '5px', background: 'rgba(255,255,255,0.08)', borderRadius: '999px', overflow: 'hidden' }}>
                                <div style={{ width: `${Math.min(100, Number(pct))}%`, height: '100%', background: color, borderRadius: '999px', transition: 'width 0.3s ease' }} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Table Breakdown Sales Omzet */}
                  <div style={{ background: 'var(--pos-bg-card)', borderRadius: '16px', padding: '20px', border: '1px solid var(--pos-border)' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: '900', color: 'var(--pos-txt-primary)', marginBottom: '14px' }}>
                      Rincian Omzet Per Transaksi Struk ({activeLabel})
                    </h3>
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.80rem' }}>
                        <thead>
                          <tr style={{ background: 'var(--pos-bg-app)', color: 'var(--pos-txt-secondary)' }}>
                            <th style={{ padding: '10px' }}>No. Struk</th>
                            <th style={{ padding: '10px' }}>Waktu</th>
                            <th style={{ padding: '10px' }}>Pelanggan</th>
                            <th style={{ padding: '10px' }}>Menu / Produk</th>
                            <th style={{ padding: '10px' }}>Metode Bayar</th>
                            <th style={{ padding: '10px', textAlign: 'right' }}>Total (Setelah Diskon)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(filteredOmzetTransactions.length === 0) ? (
                            <tr>
                              <td colSpan="6" style={{ textAlign: 'center', padding: '32px', color: '#64748b' }}>
                                Belum ada rincian omset transaksi pada periode {activeLabel} (Data Kosong).
                              </td>
                            </tr>
                          ) : (
                            filteredOmzetTransactions.map((t, idx) => (
                              <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                <td style={{ padding: '10px', color: '#38bdf8', fontWeight: '800' }}>{t.receipt_no || t.receiptNo || t.id}</td>
                                <td style={{ padding: '10px', color: 'var(--pos-txt-secondary)', fontWeight: '600' }}>{t.time || (t.timestamp ? new Date(t.timestamp).toTimeString().substring(0, 5) : '-')}</td>
                                <td style={{ padding: '10px', color: 'var(--pos-txt-primary)' }}>{t.customer_name || 'Pelanggan Umum'}</td>
                                <td style={{ padding: '10px', color: 'var(--pos-txt-secondary)', maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {(t.items && t.items.length > 0) ? t.items.map(it => `${it.name} (${it.qty || 1})`).join(', ') : (t.item_name || '-')}
                                </td>
                                <td style={{ padding: '10px', color: '#34d399', fontWeight: '800' }}>{t.payment_method || 'Cash'}</td>
                                <td style={{ padding: '10px', textAlign: 'right', color: '#34d399', fontWeight: '900' }}>{formatRupiah(t.amount || t.grandTotal || t.total || 0)}</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* DETAILED SUB-VIEW 2: BUAT LAPORAN HARIAN (INPUT MANUAL LAPORAN & TABEL HISTORI) */}
            {activeLaporanSubView === 'harian' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%' }}>
                
                {/* Header Action Bar */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--pos-bg-card)', padding: '16px 20px', borderRadius: '16px', border: '1px solid var(--pos-border)' }}>
                  <div>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: '900', color: 'var(--pos-txt-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <FileText size={20} color="#818cf8" />
                      <span>Kelola Input Manual Laporan Keuangan Harian Kasir</span>
                    </h3>
                    <p style={{ fontSize: '0.78rem', color: 'var(--pos-txt-secondary)', margin: '4px 0 0 0' }}>
                      Log input manual laporan keuangan shift kasir & pengajuan verifikasi manager
                    </p>
                  </div>

                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      onClick={() => {
                        const rawReports = [
                          ...(masterData?.approvedFinanceDaily || []),
                          ...(masterData?.manualEntryRecords || [])
                        ];
                        if (rawReports.length > 0) {
                          handleDownloadDailyReportCsv(rawReports[0]);
                        } else {
                          alert('Belum ada data laporan harian.');
                        }
                      }}
                      style={{ padding: '9px 14px', background: 'rgba(56, 189, 248, 0.15)', border: '1px solid #38bdf8', color: '#38bdf8', borderRadius: '10px', fontWeight: '900', fontSize: '0.80rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                      title="Download rekap laporan harian dalam format CSV (Excel)"
                    >
                      <Download size={15} />
                      <span>Download CSV</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        const rawReports = [
                          ...(masterData?.approvedFinanceDaily || []),
                          ...(masterData?.manualEntryRecords || [])
                        ];
                        if (rawReports.length > 0) {
                          handleOpenWhatsAppModal(rawReports[0]);
                        } else {
                          alert('Belum ada data laporan harian untuk dikirim ke WhatsApp.');
                        }
                      }}
                      style={{ padding: '9px 14px', background: 'linear-gradient(135deg, #059669 0%, #047857 100%)', color: '#ffffff', border: 'none', borderRadius: '10px', fontWeight: '900', fontSize: '0.80rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', boxShadow: '0 4px 12px rgba(5,150,105,0.3)' }}
                      title="Kirim ringkasan laporan harian ke WhatsApp Owner / Supervisor"
                    >
                      <Send size={15} />
                      <span>Kirim ke WhatsApp</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        const now = new Date();
                        const todayStr = now.toLocaleDateString('en-CA');

                        // Cek apakah akun penginput memiliki nomor rekening
                        const currentAuthor = masterData?.currentUser || masterData?.user || {};
                        const authorAccounts = Array.isArray(currentAuthor?.bank_accounts) ? currentAuthor.bank_accounts : [];
                        const debtRefundRows = authorAccounts.map((acc, idx) => ({
                          id: Date.now() + idx,
                          account_name: acc.account_name || acc.name || 'Kasir',
                          bank_name: acc.bank_name || acc.bank || 'BCA',
                          account_number: acc.account_number || acc.no_rek || '-',
                          item_name: `Pengembalian Modal Awal - ${acc.bank_name || 'BCA'}`,
                          amount_returned: 0,
                          returnAmount: 0,
                          notes: `Pelunasan modal kasir via ${acc.bank_name || 'Bank'}`,
                          unit: 'paket', cost: acc.amount || acc.cost || 0
                        }));

                        setManualRepDate(todayStr);
                        setManualRepNo(`LAP-${todayStr.replace(/-/g,'')}-${Math.floor(100 + Math.random() * 900)}`);
                        setManualRepOutletId(currentOutlet.id || 1);
                        setManualRepAuthor(masterData?.currentUser?.name || masterData?.user?.name || userSession?.name || '');
                        // Hitung hanya dari transaksi tanggal hari ini (bukan total akumulatif)
                        const initSales = getSalesForDate(todayStr);
                        setManualRepNetSales(initSales.cash);
                        setManualRepNonCash(initSales.nonCash);

                        setManualRepDebtPayment(0);
                        setManualCogsRows([]);
                        setManualExpenseRows([]);
                        setManualCogsSearch('');
                        setManualExpenseSearch('');
                        setManualRepStatus('pending');
                        setManualRepNotes('Laporan harian shift kasir');
                        setShowAddManualReportModal(true);
                      }}
                      style={{ padding: '9px 16px', background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)', color: 'var(--pos-txt-white)', border: 'none', borderRadius: '10px', fontWeight: '900', fontSize: '0.80rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', boxShadow: '0 4px 14px rgba(99,102,241,0.35)' }}
                    >
                      <span>+ Tambahkan Input Manual</span>
                    </button>
                  </div>
                </div>

                {/* TABEL HISTORI LAPORAN HARIAN (TANGGAL, NOMOR LAPORAN, STATUS PENDING / APPROVED) */}
                <div style={{ background: 'var(--pos-bg-card)', borderRadius: '16px', border: '1px solid var(--pos-border)', overflow: 'hidden', boxShadow: '0 8px 24px rgba(0,0,0,0.3)' }}>
                  <div style={{ padding: '14px 20px', background: 'var(--pos-bg-app)', borderBottom: '1px solid var(--pos-border-card)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: '0.88rem', fontWeight: '900', color: 'var(--pos-txt-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Clock size={16} color="#38bdf8" />
                      <span>Daftar Log Input Manual Laporan Keuangan Harian Kasir</span>
                    </div>
                  </div>

                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.80rem' }}>
                      <thead>
                        <tr style={{ background: 'var(--pos-bg-app)', color: 'var(--pos-txt-secondary)', borderBottom: '2px solid #334155', textTransform: 'uppercase', fontSize: '0.75rem', fontWeight: '800' }}>
                          <th style={{ padding: '12px 16px', width: '160px' }}>TANGGAL</th>
                          <th style={{ padding: '12px 16px' }}>NO LAPORAN</th>
                          <th style={{ padding: '12px 16px', width: '130px' }}>PENGAJU</th>
                          <th style={{ padding: '12px 16px', textAlign: 'center', width: '100px' }}>STATUS</th>
                          <th style={{ padding: '12px 16px', textAlign: 'right', width: '240px' }}>AKSI</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(() => {
                          const deletedSet = new Set([
                            ...(masterData?.deletedLogisticsIds || []),
                            ...(masterData?.deletedOutflowIds || [])
                          ].map(x => String(x)));

                          const isDeleted = (item) => {
                            if (!item) return false;
                            const itemId = String(item.id !== undefined && item.id !== null ? item.id : '');
                            const itemRNo = String(item.report_no || item.receiptNo || '');
                            return deletedSet.has(itemId) || deletedSet.has(itemRNo);
                          };

                          const isExcelReport = (item) => {
                            if (!item) return false;
                            const str = String(JSON.stringify(item));
                            if (str.includes('UPD-') || str.includes('Batch Upload Excel') || str.includes('Update Laporan') || str.includes('Excel/Manual')) {
                              return true;
                            }
                            const rNo = String(item.report_no || item.reportNo || item.no_laporan || item.noLaporan || item.id || item.code || '');
                            const src = String(item.source || '');
                            return rNo.startsWith('UPD-') || src.includes('Excel') || src.includes('Update Laporan');
                          };

                          const recordsMap = new Map();
                          const rawApproved = (masterData.approvedFinanceDaily || []).filter(item => !isDeleted(item) && !isExcelReport(item));
                          const rawManual = (masterData.manualEntryRecords || []).filter(item => !isDeleted(item) && !isExcelReport(item));
                          [...rawApproved, ...rawManual].forEach(item => {
                            if (item && (item.id || item.report_no)) {
                              const key = String(item.id || item.report_no);
                              if (!recordsMap.has(key)) {
                                recordsMap.set(key, item);
                              } else {
                                recordsMap.set(key, { ...recordsMap.get(key), ...item });
                              }
                            }
                          });
                          const combinedRecords = Array.from(recordsMap.values()).sort((a, b) => (b.date || '').localeCompare(a.date || ''));

                          if (combinedRecords.length === 0) {
                            return (
                              <tr>
                                <td colSpan="5" style={{ textAlign: 'center', padding: '32px', color: '#64748b' }}>
                                  Belum ada log laporan keuangan harian kasir terdaftar.
                                </td>
                              </tr>
                            );
                          }

                          return combinedRecords.map((item, idx) => {
                            const isDone = item.status === 'Done' || item.status === 'Approved' || item.status === 'approved' || item.status === 'ok' || item.approval_status === 'Done';

                            return (
                              <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', color: 'var(--pos-txt-primary)' }}>
                                {/* 1. TANGGAL */}
                                <td style={{ padding: '12px 16px', color: 'var(--pos-txt-primary)', fontWeight: '600' }}>
                                  <div>{item.date}</div>
                                  <div style={{ fontSize: '0.72rem', color: 'var(--pos-txt-secondary)', marginTop: '2px' }}>{item.branch_name || item.outlet_name || currentOutlet.name}</div>
                                </td>

                                {/* 2. NO LAPORAN */}
                                <td style={{ padding: '12px 16px' }}>
                                  <button
                                    type="button"
                                    onClick={() => setPreviewManualReport(item)}
                                    style={{ background: 'none', border: 'none', padding: 0, color: '#38bdf8', fontWeight: '900', fontSize: '0.88rem', cursor: 'pointer', textDecoration: 'underline', textAlign: 'left' }}
                                    title="Klik untuk membuka rincian laporan"
                                  >
                                    {item.report_no || item.id}
                                  </button>
                                  <div style={{ fontSize: '0.74rem', color: 'var(--pos-txt-secondary)', marginTop: '2px' }}>
                                    Net Sales: {formatRupiah(item.net_sales)} &bull; Expense: {formatRupiah(item.total_expense)}
                                  </div>
                                </td>

                                {/* 3. PENGAJU */}
                                <td style={{ padding: '12px 16px' }}>
                                  <span style={{
                                    padding: '3px 8px',
                                    borderRadius: '6px',
                                    fontSize: '0.74rem',
                                    fontWeight: '800',
                                    background: item.submitter_type === 'Admin' ? 'rgba(56, 189, 248, 0.15)' : 'rgba(99, 102, 241, 0.15)',
                                    color: item.submitter_type === 'Admin' ? '#38bdf8' : '#818cf8',
                                    border: item.submitter_type === 'Admin' ? '1px solid #38bdf8' : '1px solid #6366f1'
                                  }}>
                                    {item.submitter_type === 'Admin' ? 'Admin' : 'POS Kasir'}
                                  </span>
                                  <div style={{ fontSize: '0.72rem', color: 'var(--pos-txt-secondary)', marginTop: '4px' }}>{item.author_name || item.cashier_name || 'Kasir'}</div>
                                </td>

                                {/* 4. STATUS */}
                                <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                                  <span style={{
                                    padding: '4px 10px', borderRadius: '12px', fontSize: '0.72rem', fontWeight: '900',
                                    background: isDone ? 'rgba(52, 211, 153, 0.2)' : 'rgba(251, 191, 36, 0.2)',
                                    color: isDone ? '#34d399' : '#fbbf24',
                                    border: `1px solid ${isDone ? '#34d399' : '#fbbf24'}`
                                  }}>
                                    {isDone ? 'Done' : 'Pending'}
                                  </span>
                                </td>

                                {/* 5. AKSI */}
                                <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                                  <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', alignItems: 'center' }}>
                                    <button
                                      type="button"
                                      onClick={() => setPreviewManualReport(item)}
                                      style={{ padding: '6px 10px', background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)', color: '#818cf8', borderRadius: '6px', fontSize: '0.75rem', fontWeight: '800', cursor: 'pointer' }}
                                      title="Lihat Rincian Laporan"
                                    >
                                      Pratinjau
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDownloadDailyReportPdf(item)}
                                      style={{ padding: '6px 10px', background: 'rgba(56,189,248,0.15)', border: '1px solid rgba(56,189,248,0.3)', color: '#38bdf8', borderRadius: '6px', fontSize: '0.75rem', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px' }}
                                      title="Cetak / Download PDF Laporan"
                                    >
                                      <Download size={13} />
                                      <span>PDF</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleOpenWhatsAppModal(item)}
                                      style={{ padding: '6px 10px', background: 'rgba(5,150,105,0.2)', border: '1px solid rgba(5,150,105,0.4)', color: '#34d399', borderRadius: '6px', fontSize: '0.75rem', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px' }}
                                      title="Kirim Laporan ke WhatsApp"
                                    >
                                      <Send size={13} />
                                      <span>WA</span>
                                    </button>
                                  </div>
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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--pos-bg-card)', padding: '16px 20px', borderRadius: '16px', border: '1px solid var(--pos-border)' }}>
                  <div>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: '900', color: 'var(--pos-txt-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Package size={20} color="#38bdf8" />
                      <span>Kelola Audit Stock Opname & Laporan Logistik</span>
                    </h3>
                    <p style={{ fontSize: '0.78rem', color: 'var(--pos-txt-secondary)', margin: '4px 0 0 0' }}>
                      Pencatatan stok fisik, transfer, barang rusak/waste, & pengajuan audit opname kasir
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleOpenStokOpnameModal()}
                    style={{ padding: '10px 18px', background: 'linear-gradient(135deg, #38bdf8 0%, #0284c7 100%)', color: 'var(--pos-txt-white)', border: 'none', borderRadius: '10px', fontWeight: '900', fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 14px rgba(56,189,248,0.35)' }}
                  >
                    <PlusCircle size={16} />
                    <span>+ Tambahkan Stok Opname</span>
                  </button>
                </div>

                {/* TABEL HISTORI AUDIT STOCK OPNAME LOGISTIK */}
                <div style={{ background: 'var(--pos-bg-card)', borderRadius: '16px', border: '1px solid var(--pos-border)', overflow: 'hidden', boxShadow: '0 8px 24px rgba(0,0,0,0.3)' }}>
                  <div style={{ padding: '14px 20px', background: 'var(--pos-bg-app)', borderBottom: '1px solid var(--pos-border-card)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                    <div style={{ fontSize: '0.88rem', fontWeight: '900', color: 'var(--pos-txt-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Package size={16} color="#38bdf8" />
                      <span>Daftar Log Audit Stock Opname & Laporan Logistik</span>
                    </div>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button type="button" onClick={() => setLogistikFilterMode('today')} style={{ padding: '6px 12px', borderRadius: '8px', fontWeight: '900', fontSize: '0.75rem', cursor: 'pointer', border: logistikFilterMode === 'today' ? '2px solid #34d399' : '1px solid rgba(255,255,255,0.15)', background: logistikFilterMode === 'today' ? '#34d399' : 'rgba(255,255,255,0.07)', color: logistikFilterMode === 'today' ? '#0f172a' : 'rgba(255,255,255,0.6)' }}>Hari Ini</button>
                      <button type="button" onClick={() => setLogistikFilterMode('yesterday')} style={{ padding: '6px 12px', borderRadius: '8px', fontWeight: '900', fontSize: '0.75rem', cursor: 'pointer', border: logistikFilterMode === 'yesterday' ? '2px solid #38bdf8' : '1px solid rgba(255,255,255,0.15)', background: logistikFilterMode === 'yesterday' ? '#38bdf8' : 'rgba(255,255,255,0.07)', color: logistikFilterMode === 'yesterday' ? '#0f172a' : 'rgba(255,255,255,0.6)' }}>Kemarin</button>
                      <button type="button" onClick={() => setLogistikFilterMode('custom')} style={{ padding: '6px 12px', borderRadius: '8px', fontWeight: '900', fontSize: '0.75rem', cursor: 'pointer', border: logistikFilterMode === 'custom' ? '2px solid #fbbf24' : '1px solid rgba(255,255,255,0.15)', background: logistikFilterMode === 'custom' ? '#fbbf24' : 'rgba(255,255,255,0.07)', color: logistikFilterMode === 'custom' ? '#0f172a' : 'rgba(255,255,255,0.6)' }}>Custom</button>
                    </div>
                  </div>
                  {logistikFilterMode === 'custom' && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 20px', background: 'rgba(251,191,36,0.06)', borderBottom: '1px solid rgba(251,191,36,0.2)', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#fbbf24' }}>Dari:</span>
                      <input type="date" value={logistikCustomStart} onChange={e => setLogistikCustomStart(e.target.value)} style={{ padding: '5px 8px', borderRadius: '7px', border: '1px solid rgba(251,191,36,0.4)', background: 'var(--pos-bg-card)', color: 'var(--pos-txt-primary)', fontSize: '0.8rem' }} />
                      <span style={{ color: '#fbbf24', fontWeight: '700' }}>s/d</span>
                      <input type="date" value={logistikCustomEnd} onChange={e => setLogistikCustomEnd(e.target.value)} style={{ padding: '5px 8px', borderRadius: '7px', border: '1px solid rgba(251,191,36,0.4)', background: 'var(--pos-bg-card)', color: 'var(--pos-txt-primary)', fontSize: '0.8rem' }} />
                    </div>
                  )}


                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.82rem' }}>
                      <thead>
                        <tr style={{ background: 'var(--pos-bg-app)', color: 'var(--pos-txt-secondary)', borderBottom: '1px solid var(--pos-border-card)', textTransform: 'uppercase', fontSize: '0.74rem', fontWeight: '800' }}>
                          <th style={{ padding: '12px 14px' }}>Tanggal</th>
                          <th style={{ padding: '12px 14px' }}>No Laporan</th>
                          <th style={{ padding: '12px 14px' }}>Diisi Oleh</th>
                          <th style={{ padding: '12px 12px', textAlign: 'center' }}>Status</th>
                          <th style={{ padding: '12px 12px', textAlign: 'center' }}>Aksi</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(() => {
                          const combinedOpnameMap = new Map();

                          // 1. Manual logistics / stock opname entries
                          [...(masterData.approvedLogistics || []), ...(masterData.stockOpname || [])].forEach(op => {
                            if (op && (op.id || op.report_no)) {
                              combinedOpnameMap.set(String(op.report_no || op.id), op);
                            }
                          });

                          const combinedOpname = Array.from(combinedOpnameMap.values());

                          const filteredOpname = combinedOpname.filter(op => {
                            const outletOk = !op.outlet_id || Number(op.outlet_id) === Number(currentOutlet.id) || op.branch_name === currentOutlet.name;
                            if (!outletOk) return false;
                            const d = getLogDate(op);
                            if (!d) return true;
                            if (logistikFilterMode === 'today')     return d === sharedTodayStr;
                            if (logistikFilterMode === 'yesterday') return d === sharedYesterdayStr;
                            return d >= logistikCustomStart && d <= logistikCustomEnd;
                          });

                          if (filteredOpname.length === 0) {
                            return (
                              <tr>
                                <td colSpan="5" style={{ textAlign: 'center', padding: '32px', color: '#64748b' }}>
                                  Belum ada log laporan stock opname harian terdaftar.
                                </td>
                              </tr>
                            );
                          }

                          return filteredOpname.map((item, idx) => {
                            const isDone = item.status === 'Done' || item.status === 'done' || item.status === 'ACC' || item.status === 'ok' || item.status === 'Approved' || item.status === 'approved';

                            // 12-Hour Edit Window Calculation
                            const reportTime = item.timestamp || (item.created_at ? new Date(item.created_at).getTime() : new Date(`${item.date}T12:00:00`).getTime());
                            const hoursPassed = (Date.now() - reportTime) / (1000 * 60 * 60);
                            const canEditInPos = hoursPassed <= 12;

                            return (
                              <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', color: 'var(--pos-txt-primary)' }}>
                                {/* TANGGAL */}
                                <td style={{ padding: '12px 14px', color: 'var(--pos-txt-secondary)', fontWeight: '700' }}>
                                  {item.date}
                                </td>

                                {/* NO LAPORAN (CLICKABLE PREVIEW) */}
                                <td style={{ padding: '12px 14px' }}>
                                  <button
                                    type="button"
                                    onClick={() => setPreviewLogisticsReport(item)}
                                    style={{
                                      background: 'none',
                                      border: 'none',
                                      color: '#38bdf8',
                                      fontWeight: '900',
                                      fontSize: '0.85rem',
                                      cursor: 'pointer',
                                      textDecoration: 'underline',
                                      padding: 0
                                    }}
                                    title="Klik untuk preview detail laporan"
                                  >
                                    {item.report_no || item.id}
                                  </button>
                                </td>

                                {/* DIISI OLEH */}
                                <td style={{ padding: '12px 14px', color: 'var(--pos-txt-primary)', fontWeight: '600' }}>
                                  {item.submitted_by || item.created_by || 'Kasir'}
                                </td>

                                {/* STATUS (PENDING / DONE) */}
                                <td style={{ padding: '12px 12px', textAlign: 'center' }}>
                                  <span style={{
                                    padding: '5px 12px', borderRadius: '12px', fontSize: '0.74rem', fontWeight: '900',
                                    background: isDone ? 'rgba(52, 211, 153, 0.18)' : 'rgba(251, 191, 36, 0.18)',
                                    color: isDone ? '#34d399' : '#fbbf24',
                                    border: `1px solid ${isDone ? 'rgba(52, 211, 153, 0.4)' : 'rgba(251, 191, 36, 0.4)'}`
                                  }}>
                                    {isDone ? 'Done' : 'Pending'}
                                  </span>
                                </td>

                                {/* AKSI (EDIT <=12 JAM / OK >12 JAM) */}
                                <td style={{ padding: '12px 12px', textAlign: 'center' }}>
                                  {canEditInPos ? (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setLogNo(item.report_no || item.id);
                                        setLogDate(item.date || new Date().toISOString().split('T')[0]);
                                        setLogSubmittedBy(item.submitted_by || item.created_by || userSession?.name || '');
                                        setLogOutletId(item.outlet_id || currentOutlet.id || 1);
                                        setShowAddLogisticsModal(true);
                                      }}
                                      style={{
                                        padding: '6px 14px',
                                        background: 'rgba(251, 191, 36, 0.2)',
                                        border: '1px solid #fbbf24',
                                        color: '#fbbf24',
                                        borderRadius: '8px',
                                        fontSize: '0.78rem',
                                        fontWeight: '800',
                                        cursor: 'pointer'
                                      }}
                                    >
                                      Edit
                                    </button>
                                  ) : (
                                    <span style={{
                                      padding: '6px 14px',
                                      background: 'rgba(52, 211, 153, 0.15)',
                                      border: '1px solid #34d399',
                                      color: '#34d399',
                                      borderRadius: '8px',
                                      fontSize: '0.78rem',
                                      fontWeight: '900',
                                      display: 'inline-block'
                                    }}>
                                      OK
                                    </span>
                                  )}
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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--pos-bg-card)', padding: '16px 20px', borderRadius: '16px', border: '1px solid var(--pos-border)' }}>
                  <div>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: '900', color: 'var(--pos-txt-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Truck size={20} color="#a78bfa" />
                      <span>Kelola Laporan Transfer Bahan Baku Antarcabang</span>
                    </h3>
                    <p style={{ fontSize: '0.78rem', color: 'var(--pos-txt-secondary)', margin: '4px 0 0 0' }}>
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
                      setTransferQty(1);
                      setTransferUnit(firstIng.unit || 'kg');
                      setTransferNotes('Transfer pengiriman bahan baku antarcabang');
                      setTransferStatus('ditunda');
                      setTransferBatchRows([
                        {
                          id: Date.now(),
                          item_name: firstIng.name,
                          custom_item_name: '',
                          qty: 1,
                          unit: firstIng.unit || 'kg'
                        }
                      ]);
                      setShowAddTransferModal(true);
                    }}
                    style={{ padding: '10px 18px', background: 'linear-gradient(135deg, #a78bfa 0%, #7c3aed 100%)', color: 'var(--pos-txt-white)', border: 'none', borderRadius: '10px', fontWeight: '900', fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 14px rgba(167,139,250,0.35)' }}
                  >
                    <PlusCircle size={16} />
                    <span>+ Tambah Transfer Bahan Baku</span>
                  </button>
                </div>

                <div style={{ background: 'var(--pos-bg-card)', borderRadius: '16px', border: '1px solid var(--pos-border)', overflow: 'hidden', boxShadow: '0 8px 24px rgba(0,0,0,0.3)' }}>
                  <div style={{ padding: '14px 20px', background: 'var(--pos-bg-app)', borderBottom: '1px solid var(--pos-border-card)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                    <div style={{ fontSize: '0.88rem', fontWeight: '900', color: 'var(--pos-txt-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Truck size={16} color="#a78bfa" />
                      <span>Daftar Log Transfer Bahan Baku & Mutasi Stok Antarcabang</span>
                    </div>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button type="button" onClick={() => setTransferFilterMode('today')} style={{ padding: '6px 12px', borderRadius: '8px', fontWeight: '900', fontSize: '0.75rem', cursor: 'pointer', border: transferFilterMode === 'today' ? '2px solid #34d399' : '1px solid rgba(255,255,255,0.15)', background: transferFilterMode === 'today' ? '#34d399' : 'rgba(255,255,255,0.07)', color: transferFilterMode === 'today' ? '#0f172a' : 'rgba(255,255,255,0.6)' }}>Hari Ini</button>
                      <button type="button" onClick={() => setTransferFilterMode('yesterday')} style={{ padding: '6px 12px', borderRadius: '8px', fontWeight: '900', fontSize: '0.75rem', cursor: 'pointer', border: transferFilterMode === 'yesterday' ? '2px solid #38bdf8' : '1px solid rgba(255,255,255,0.15)', background: transferFilterMode === 'yesterday' ? '#38bdf8' : 'rgba(255,255,255,0.07)', color: transferFilterMode === 'yesterday' ? '#0f172a' : 'rgba(255,255,255,0.6)' }}>Kemarin</button>
                      <button type="button" onClick={() => setTransferFilterMode('custom')} style={{ padding: '6px 12px', borderRadius: '8px', fontWeight: '900', fontSize: '0.75rem', cursor: 'pointer', border: transferFilterMode === 'custom' ? '2px solid #fbbf24' : '1px solid rgba(255,255,255,0.15)', background: transferFilterMode === 'custom' ? '#fbbf24' : 'rgba(255,255,255,0.07)', color: transferFilterMode === 'custom' ? '#0f172a' : 'rgba(255,255,255,0.6)' }}>Custom</button>
                    </div>
                  </div>
                  {transferFilterMode === 'custom' && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 20px', background: 'rgba(251,191,36,0.06)', borderBottom: '1px solid rgba(251,191,36,0.2)', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#fbbf24' }}>Dari:</span>
                      <input type="date" value={transferCustomStart} onChange={e => setTransferCustomStart(e.target.value)} style={{ padding: '5px 8px', borderRadius: '7px', border: '1px solid rgba(251,191,36,0.4)', background: 'var(--pos-bg-card)', color: 'var(--pos-txt-primary)', fontSize: '0.8rem' }} />
                      <span style={{ color: '#fbbf24', fontWeight: '700' }}>s/d</span>
                      <input type="date" value={transferCustomEnd} onChange={e => setTransferCustomEnd(e.target.value)} style={{ padding: '5px 8px', borderRadius: '7px', border: '1px solid rgba(251,191,36,0.4)', background: 'var(--pos-bg-card)', color: 'var(--pos-txt-primary)', fontSize: '0.8rem' }} />
                    </div>
                  )}

                  <div style={{ width: '100%', overflowX: 'auto', borderRadius: '12px', border: '1px solid var(--pos-border-card)', background: 'var(--pos-bg-app)' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.80rem' }}>
                      <thead>
                        <tr style={{ background: 'var(--pos-bg-app)', color: 'var(--pos-txt-secondary)', borderBottom: '2px solid #334155', textTransform: 'uppercase', fontSize: '0.75rem', fontWeight: '800' }}>
                          <th style={{ padding: '12px 16px', width: '180px' }}>TANGGAL</th>
                          <th style={{ padding: '12px 16px' }}>NO LAPORAN</th>
                          <th style={{ padding: '12px 16px', width: '150px' }}>PENGAJU</th>
                          <th style={{ padding: '12px 16px', textAlign: 'center', width: '140px' }}>STATUS</th>
                          <th style={{ padding: '12px 16px', textAlign: 'right', width: '140px' }}>AKSI</th>
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
                          })().filter(item => {
                            const d = getLogDate(item);
                            if (!d) return true;
                            if (transferFilterMode === 'today')     return d === sharedTodayStr;
                            if (transferFilterMode === 'yesterday') return d === sharedYesterdayStr;
                            return d >= transferCustomStart && d <= transferCustomEnd;
                          });

                          if (list.length === 0) {
                            return (
                              <tr>
                                <td colSpan={5} style={{ padding: '32px', textAlign: 'center', color: '#64748b', fontSize: '0.85rem' }}>
                                  Belum ada data laporan transfer stok antarcabang. Klik "+ Tambah Transfer Bahan Baku" di atas untuk membuat laporan.
                                </td>
                              </tr>
                            );
                          }

                          return list.map((item, idx) => {
                            const isDone = item.status === 'Done' || item.status === 'Approved' || item.status === 'approved' || item.status === 'ok' || item.status === 'ACC' || item.status === 'Terkirim' || item.sent_to_apk || item.is_approved;
                            const toOutletName = item.to_outlet_name || (masterData.outlets || []).find(o => Number(o.id) === Number(item.to_outlet_id || item.toOutletId))?.name || 'Outlet Tujuan';
                            const fromOutletName = item.from_outlet_name || (masterData.outlets || []).find(o => Number(o.id) === Number(item.from_outlet_id || item.fromOutletId))?.name || currentOutlet.name;

                            return (
                              <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', color: 'var(--pos-txt-primary)' }}>
                                {/* 1. TANGGAL */}
                                <td style={{ padding: '12px 16px', color: 'var(--pos-txt-primary)', fontWeight: '600' }}>
                                  <div>{item.date}</div>
                                  <div style={{ fontSize: '0.72rem', color: 'var(--pos-txt-secondary)', marginTop: '2px' }}>
                                    {fromOutletName} {toOutletName}
                                  </div>
                                </td>

                                {/* 2. NO LAPORAN */}
                                <td style={{ padding: '12px 16px' }}>
                                  <button
                                    type="button"
                                    onClick={() => setPreviewTransferReport(item)}
                                    style={{ background: 'none', border: 'none', padding: 0, color: '#38bdf8', fontWeight: '900', fontSize: '0.88rem', cursor: 'pointer', textDecoration: 'underline', textAlign: 'left' }}
                                    title="Klik untuk membuka rincian laporan"
                                  >
                                    {item.report_no || item.id}
                                  </button>
                                  <div style={{ fontSize: '0.74rem', color: 'var(--pos-txt-secondary)', marginTop: '2px' }}>
                                    Item: {item.item_name || 'Bahan Baku'} &bull; Qty: {item.qty} {item.unit}
                                  </div>
                                </td>

                                {/* 3. PENGAJU */}
                                <td style={{ padding: '12px 16px' }}>
                                  <span style={{
                                    padding: '3px 8px',
                                    borderRadius: '6px',
                                    fontSize: '0.74rem',
                                    fontWeight: '800',
                                    background: item.type_input === 'manual' ? 'rgba(56, 189, 248, 0.15)' : 'rgba(99, 102, 241, 0.15)',
                                    color: item.type_input === 'manual' ? '#38bdf8' : '#818cf8',
                                    border: item.type_input === 'manual' ? '1px solid #38bdf8' : '1px solid #6366f1'
                                  }}>
                                    {item.type_input === 'manual' ? 'Admin' : 'POS Kasir'}
                                  </span>
                                  <div style={{ fontSize: '0.72rem', color: 'var(--pos-txt-secondary)', marginTop: '4px' }}>{item.submitted_by || item.created_by || 'Kasir'}</div>
                                </td>

                                {/* 4. STATUS */}
                                <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                                  <span style={{
                                    padding: '4px 10px', borderRadius: '12px', fontSize: '0.72rem', fontWeight: '900',
                                    background: isDone ? 'rgba(52, 211, 153, 0.2)' : 'rgba(251, 191, 36, 0.2)',
                                    color: isDone ? '#34d399' : '#fbbf24',
                                    border: `1px solid ${isDone ? '#34d399' : '#fbbf24'}`
                                  }}>
                                    {isDone ? 'Done' : 'Pending'}
                                  </span>
                                </td>

                                {/* 5. AKSI */}
                                <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                                  <button
                                    type="button"
                                    onClick={() => setPreviewTransferReport(item)}
                                    style={{ padding: '6px 12px', background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)', color: '#818cf8', borderRadius: '6px', fontSize: '0.78rem', fontWeight: '800', cursor: 'pointer' }}
                                  >
                                    Pratinjau
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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--pos-bg-card)', padding: '16px 20px', borderRadius: '16px', border: '1px solid var(--pos-border)' }}>
                  <div>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: '900', color: 'var(--pos-txt-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Trash2 size={20} color="#fb7185" />
                      <span>Kelola Laporan Barang Rusak & Waste Stok</span>
                    </h3>
                    <p style={{ fontSize: '0.78rem', color: 'var(--pos-txt-secondary)', margin: '4px 0 0 0' }}>
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
                    style={{ padding: '10px 18px', background: 'linear-gradient(135deg, #fb7185 0%, #e11d48 100%)', color: 'var(--pos-txt-white)', border: 'none', borderRadius: '10px', fontWeight: '900', fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 14px rgba(251,113,133,0.35)' }}
                  >
                    <PlusCircle size={16} />
                    <span>+ Tambah Barang Rusak</span>
                  </button>
                </div>

                <div style={{ background: 'var(--pos-bg-card)', borderRadius: '16px', border: '1px solid var(--pos-border)', overflow: 'hidden', boxShadow: '0 8px 24px rgba(0,0,0,0.3)' }}>
                  <div style={{ padding: '14px 20px', background: 'var(--pos-bg-app)', borderBottom: '1px solid var(--pos-border-card)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                    <div style={{ fontSize: '0.88rem', fontWeight: '900', color: 'var(--pos-txt-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Trash2 size={16} color="#fb7185" />
                      <span>Daftar Log Laporan Barang Rusak (Waste & Retur Bahan Baku)</span>
                    </div>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button type="button" onClick={() => setWasteFilterMode('today')} style={{ padding: '6px 12px', borderRadius: '8px', fontWeight: '900', fontSize: '0.75rem', cursor: 'pointer', border: wasteFilterMode === 'today' ? '2px solid #34d399' : '1px solid rgba(255,255,255,0.15)', background: wasteFilterMode === 'today' ? '#34d399' : 'rgba(255,255,255,0.07)', color: wasteFilterMode === 'today' ? '#0f172a' : 'rgba(255,255,255,0.6)' }}>Hari Ini</button>
                      <button type="button" onClick={() => setWasteFilterMode('yesterday')} style={{ padding: '6px 12px', borderRadius: '8px', fontWeight: '900', fontSize: '0.75rem', cursor: 'pointer', border: wasteFilterMode === 'yesterday' ? '2px solid #38bdf8' : '1px solid rgba(255,255,255,0.15)', background: wasteFilterMode === 'yesterday' ? '#38bdf8' : 'rgba(255,255,255,0.07)', color: wasteFilterMode === 'yesterday' ? '#0f172a' : 'rgba(255,255,255,0.6)' }}>Kemarin</button>
                      <button type="button" onClick={() => setWasteFilterMode('custom')} style={{ padding: '6px 12px', borderRadius: '8px', fontWeight: '900', fontSize: '0.75rem', cursor: 'pointer', border: wasteFilterMode === 'custom' ? '2px solid #fbbf24' : '1px solid rgba(255,255,255,0.15)', background: wasteFilterMode === 'custom' ? '#fbbf24' : 'rgba(255,255,255,0.07)', color: wasteFilterMode === 'custom' ? '#0f172a' : 'rgba(255,255,255,0.6)' }}>Custom</button>
                    </div>
                  </div>
                  {wasteFilterMode === 'custom' && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 20px', background: 'rgba(251,191,36,0.06)', borderBottom: '1px solid rgba(251,191,36,0.2)', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#fbbf24' }}>Dari:</span>
                      <input type="date" value={wasteCustomStart} onChange={e => setWasteCustomStart(e.target.value)} style={{ padding: '5px 8px', borderRadius: '7px', border: '1px solid rgba(251,191,36,0.4)', background: 'var(--pos-bg-card)', color: 'var(--pos-txt-primary)', fontSize: '0.8rem' }} />
                      <span style={{ color: '#fbbf24', fontWeight: '700' }}>s/d</span>
                      <input type="date" value={wasteCustomEnd} onChange={e => setWasteCustomEnd(e.target.value)} style={{ padding: '5px 8px', borderRadius: '7px', border: '1px solid rgba(251,191,36,0.4)', background: 'var(--pos-bg-card)', color: 'var(--pos-txt-primary)', fontSize: '0.8rem' }} />
                    </div>
                  )}

                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.80rem' }}>
                      <thead>
                        <tr style={{ background: 'var(--pos-bg-app)', color: 'var(--pos-txt-secondary)', borderBottom: '2px solid #334155', textTransform: 'uppercase', fontSize: '0.75rem', fontWeight: '800' }}>
                          <th style={{ padding: '12px 16px', width: '180px' }}>TANGGAL</th>
                          <th style={{ padding: '12px 16px' }}>NO LAPORAN</th>
                          <th style={{ padding: '12px 16px', width: '150px' }}>PENGAJU</th>
                          <th style={{ padding: '12px 16px', textAlign: 'center', width: '140px' }}>STATUS</th>
                          <th style={{ padding: '12px 16px', textAlign: 'right', width: '140px' }}>AKSI</th>
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
                            })
                            .filter(item => {
                              const d = getLogDate(item);
                              if (!d) return true;
                              if (wasteFilterMode === 'today')     return d === sharedTodayStr;
                              if (wasteFilterMode === 'yesterday') return d === sharedYesterdayStr;
                              return d >= wasteCustomStart && d <= wasteCustomEnd;
                            });

                          if (list.length === 0) {
                            return (
                              <tr>
                                <td colSpan={5} style={{ padding: '32px', textAlign: 'center', color: '#64748b', fontSize: '0.85rem' }}>
                                  Belum ada data laporan barang rusak. Klik "+ Tambah Barang Rusak" di atas untuk membuat laporan.
                                </td>
                              </tr>
                            );
                          }

                          return list.map((item, idx) => {
                            const isDone = item.status === 'Done' || item.status === 'ok' || item.status === 'approved' || item.status === 'Approved' || item.status === 'ACC' || item.status === 'Terkirim' || item.sent_to_apk || item.is_approved;
                            const isWebAdminInput = item.sumber_input === 'web_admin' || item.status_keterangan === 'by manual' || item.type_input === 'manual';

                            const displayDate = item.tanggal_waktu
                              ? new Date(item.tanggal_waktu).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
                              : (item.date || '-');

                            const rawItems = [...(masterData.damagedGoods || []), ...(masterData.approvedWaste || [])].filter(x => (x.report_no && x.report_no === (item.report_no || item.id)) || x.id === item.id);
                            const uniqueItemsMap = new Map();
                            rawItems.forEach(x => {
                              const itemKey = x.id || `${x.item_name || x.nama_barang}-${x.qty || x.stok_rusak}-${x.unit}`;
                              if (!uniqueItemsMap.has(itemKey)) {
                                uniqueItemsMap.set(itemKey, x);
                              }
                            });
                            const reportItems = Array.from(uniqueItemsMap.values());

                            const displayItemName = reportItems.length > 0
                              ? reportItems.map(r => r.item_name || r.nama_barang || 'Bahan Baku').join(', ')
                              : (item.item_name || item.nama_barang || 'Bahan Baku');
                            const displayQty = reportItems.length > 0
                              ? reportItems.map(r => `${r.qty || r.stok_rusak || 1} ${r.unit || 'kg'}`).join(', ')
                              : `${item.qty || item.stok_rusak || 1} ${item.unit || 'kg'}`;
                            const displayReason = reportItems.length > 0
                              ? reportItems.map(r => r.alasan_rusak || r.reason || r.damage_reason || 'Terlalu kecil').filter((v, i, a) => a.indexOf(v) === i).join(', ')
                              : (item.alasan_rusak || item.reason || item.damage_reason || '-');

                            const outletName = (masterData.outlets || []).find(o => String(o.id) === String(item.outlet_id) || Number(o.id) === Number(item.outlet_id))?.name || item.branch_name || currentOutlet?.name || 'Outlet Cabang';

                            return (
                              <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', color: 'var(--pos-txt-primary)' }}>
                                {/* 1. TANGGAL */}
                                <td style={{ padding: '12px 16px', color: 'var(--pos-txt-primary)', fontWeight: '600' }}>
                                  <div>{displayDate}</div>
                                  <div style={{ fontSize: '0.72rem', color: 'var(--pos-txt-secondary)', marginTop: '2px' }}>{outletName}</div>
                                </td>

                                {/* 2. NO LAPORAN */}
                                <td style={{ padding: '12px 16px' }}>
                                  <button
                                    type="button"
                                    onClick={() => setPreviewWasteReport(item)}
                                    style={{ background: 'none', border: 'none', padding: 0, color: '#fb7185', fontWeight: '900', fontSize: '0.88rem', cursor: 'pointer', textDecoration: 'underline', textAlign: 'left' }}
                                    title="Klik untuk membuka rincian laporan"
                                  >
                                    {item.report_no || item.id}
                                  </button>
                                  <div style={{ fontSize: '0.74rem', color: 'var(--pos-txt-secondary)', marginTop: '2px' }}>
                                    Bahan: {displayItemName} &bull; Qty: {displayQty} &bull; Alasan: {displayReason}
                                  </div>
                                </td>

                                {/* 3. PENGAJU */}
                                <td style={{ padding: '12px 16px' }}>
                                  <span style={{
                                    padding: '3px 8px',
                                    borderRadius: '6px',
                                    fontSize: '0.74rem',
                                    fontWeight: '800',
                                    background: isWebAdminInput ? 'rgba(56, 189, 248, 0.15)' : 'rgba(99, 102, 241, 0.15)',
                                    color: isWebAdminInput ? '#38bdf8' : '#818cf8',
                                    border: isWebAdminInput ? '1px solid #38bdf8' : '1px solid #6366f1'
                                  }}>
                                    {isWebAdminInput ? 'Admin' : 'POS Kasir'}
                                  </span>
                                  <div style={{ fontSize: '0.72rem', color: 'var(--pos-txt-secondary)', marginTop: '4px' }}>{item.input_by || item.submitted_by || item.created_by || 'Kasir'}</div>
                                </td>

                                {/* 4. STATUS */}
                                <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                                  <span style={{
                                    padding: '4px 10px', borderRadius: '12px', fontSize: '0.72rem', fontWeight: '900',
                                    background: isDone ? 'rgba(52, 211, 153, 0.2)' : 'rgba(251, 191, 36, 0.2)',
                                    color: isDone ? '#34d399' : '#fbbf24',
                                    border: `1px solid ${isDone ? '#34d399' : '#fbbf24'}`
                                  }}>
                                    {isDone ? 'Done' : 'Pending'}
                                  </span>
                                </td>

                                {/* 5. AKSI */}
                                <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                                  <button
                                    type="button"
                                    onClick={() => setPreviewWasteReport(item)}
                                    style={{ padding: '6px 12px', background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)', color: '#818cf8', borderRadius: '6px', fontSize: '0.78rem', fontWeight: '800', cursor: 'pointer' }}
                                  >
                                    Pratinjau
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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--pos-bg-card)', padding: '16px 20px', borderRadius: '16px', border: '1px solid var(--pos-border)' }}>
                  <div>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: '900', color: 'var(--pos-txt-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <CheckSquare size={20} color="#34d399" />
                      <span>Laporan Stok Opname & Rekapitulasi Stok Keluar Outlet</span>
                    </h3>
                    <p style={{ fontSize: '0.78rem', color: 'var(--pos-txt-secondary)', margin: '4px 0 0 0' }}>
                      Audit fisik persediaan barang outlet & kalkulasi otomatis Denda Stok (hanya berlaku pada status DEFISIT)
                    </p>
                  </div>
                  
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <span style={{ fontSize: '0.78rem', background: 'rgba(52, 211, 153, 0.15)', color: '#34d399', border: '1px solid rgba(52, 211, 153, 0.3)', padding: '6px 14px', borderRadius: '20px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>Data Live dari Web Admin Logistik</span>
                    </span>
                  </div>
                </div>

                {/* FILTER RENTANG WAKTU (DATE RANGE FILTER BAR) */}
                <div style={{ background: 'var(--pos-bg-card)', padding: '14px 20px', borderRadius: '16px', border: '1px solid var(--pos-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                    <div style={{ fontSize: '0.82rem', fontWeight: '800', color: 'var(--pos-txt-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
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
                            borderColor: opnameSummaryPreset === p.id ? '#38bdf8' : 'var(--pos-border-card)',
                            background: opnameSummaryPreset === p.id ? 'rgba(56, 189, 248, 0.2)' : 'var(--pos-bg-app)',
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
                      style={{ height: '34px', fontSize: '0.78rem', padding: '0 8px', background: 'var(--pos-bg-app)', border: '1px solid var(--pos-border-card)', color: 'var(--pos-txt-primary)', borderRadius: '8px' }}
                    />
                    <span style={{ color: 'var(--pos-txt-secondary)', fontSize: '0.78rem' }}>s/d</span>
                    <input
                      type="date"
                      value={opnameSummaryEndDate}
                      onChange={e => { setOpnameSummaryEndDate(e.target.value); setOpnameSummaryPreset('CUSTOM'); }}
                      className="form-input"
                      style={{ height: '34px', fontSize: '0.78rem', padding: '0 8px', background: 'var(--pos-bg-app)', border: '1px solid var(--pos-border-card)', color: 'var(--pos-txt-primary)', borderRadius: '8px' }}
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
                      <div style={{ background: 'var(--pos-bg-card)', border: '1px solid rgba(244, 63, 94, 0.3)', padding: '14px 18px', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <div style={{ fontSize: '0.75rem', fontWeight: '800', color: '#fb7185', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span>Total Denda Stok Hari Ini</span>
                        </div>
                        <div style={{ fontSize: '1.25rem', fontWeight: '900', color: 'var(--pos-txt-primary)' }}>
                          {formatRupiah(totalDendaHariIni)}
                        </div>
                        <div style={{ fontSize: '0.68rem', color: 'var(--pos-txt-secondary)' }}>
                          Kalkulasi denda stok defisit pada tanggal {todayStr}
                        </div>
                      </div>

                      {/* CARD 2: DENDA PER STOK (FILTERED) */}
                      <div style={{ background: 'var(--pos-bg-card)', border: '1px solid rgba(56, 189, 248, 0.3)', padding: '14px 18px', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <div style={{ fontSize: '0.75rem', fontWeight: '800', color: '#38bdf8', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span>Akumulasi Denda Per Stok (Filter)</span>
                        </div>
                        <div style={{ fontSize: '1.25rem', fontWeight: '900', color: 'var(--pos-txt-primary)' }}>
                          {formatRupiah(totalDendaFiltered)}
                        </div>
                        <div style={{ fontSize: '0.68rem', color: 'var(--pos-txt-secondary)' }}>
                          Sum Denda per stok item pada periode terfilter
                        </div>
                      </div>

                      {/* CARD 3: ITEM DEFISIT */}
                      <div style={{ background: 'var(--pos-bg-card)', border: '1px solid rgba(251, 191, 36, 0.3)', padding: '14px 18px', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <div style={{ fontSize: '0.75rem', fontWeight: '800', color: '#fbbf24', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span>Total Item Defisit</span>
                        </div>
                        <div style={{ fontSize: '1.25rem', fontWeight: '900', color: 'var(--pos-txt-primary)' }}>
                          {countDefisitItem} Item
                        </div>
                        <div style={{ fontSize: '0.68rem', color: 'var(--pos-txt-secondary)' }}>
                          Persediaan fisik &lt; sisa stok sistem
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* TABEL RANGKUMAN STOK OPNAME & STOK KELUAR */}
                <div style={{ background: 'var(--pos-bg-card)', padding: '20px', borderRadius: '16px', border: '1px solid var(--pos-border)' }}>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
                      <thead>
                        <tr style={{ color: 'var(--pos-txt-secondary)', borderBottom: '2px solid #334155', textAlign: 'left', textTransform: 'uppercase', fontSize: '0.70rem', fontWeight: '800', background: 'var(--pos-bg-app)' }}>
                          <th style={{ padding: '12px 10px', whiteSpace: 'nowrap' }}>Tanggal Audit</th>
                          <th style={{ padding: '12px 10px', whiteSpace: 'nowrap' }}>No Laporan</th>
                          <th style={{ padding: '12px 10px', whiteSpace: 'nowrap' }}>Dibuat Oleh</th>
                          <th style={{ padding: '12px 10px', textAlign: 'right', whiteSpace: 'nowrap' }}>Stok Awal</th>
                          <th style={{ padding: '12px 10px', textAlign: 'right', whiteSpace: 'nowrap', color: '#34d399' }}>Stok Masuk (+)</th>
                          <th style={{ padding: '12px 10px', textAlign: 'right', whiteSpace: 'nowrap', color: '#fb7185', background: 'rgba(251, 113, 133, 0.1)' }}>Stok Keluar [Web Admin]</th>
                          <th style={{ padding: '12px 10px', textAlign: 'right', whiteSpace: 'nowrap', color: '#34d399' }}>Transfer Stok In</th>
                          <th style={{ padding: '12px 10px', textAlign: 'right', whiteSpace: 'nowrap', color: '#a78bfa' }}>Transfer Stok Out</th>
                          <th style={{ padding: '12px 10px', textAlign: 'right', whiteSpace: 'nowrap', color: '#fb7185' }}>Stok Rusak (-)</th>
                          <th style={{ padding: '12px 10px', textAlign: 'right', whiteSpace: 'nowrap', color: '#38bdf8' }}>Stok Sistem</th>
                          <th style={{ padding: '12px 10px', textAlign: 'right', whiteSpace: 'nowrap', color: '#fbbf24' }}>Harga Satuan</th>
                          <th style={{ padding: '12px 10px', textAlign: 'right', whiteSpace: 'nowrap', color: '#fb7185', background: 'rgba(244, 63, 94, 0.1)' }}>Denda Per Stok</th>
                          <th style={{ padding: '12px 10px', textAlign: 'center', whiteSpace: 'nowrap' }}>Aksi</th>
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
                                <td colSpan={13} style={{ padding: '30px', textAlign: 'center', color: '#64748b' }}>
                                  Tidak ada data Laporan Stok Opname pada rentang waktu terpilih.
                                </td>
                              </tr>
                            );
                          }

                          let sumDendaPerStok = 0;

                          const rows = filteredOpnameList.map((op, idx) => {
                            const sSistem = (op.stok_awal || 0) + (op.stok_masuk || 0) + (op.transfer_masuk || 0) - ((op.stok_keluar || 0) + (op.stok_rusak || 0) + (op.transfer_keluar || 0));
                            const diffVal = (op.stok_fisik || 0) - sSistem;
                            const isDefisit = diffVal < 0;
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
                            const dendaStokRow = isDefisit ? Math.abs(diffVal) * hargaSatuanWeb : 0;
                            sumDendaPerStok += dendaStokRow;

                            return (
                              <tr key={op.id || idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', color: 'var(--pos-txt-primary)' }}>
                                {/* 1. TANGGAL AUDIT */}
                                <td style={{ padding: '12px 10px', color: 'var(--pos-txt-secondary)', fontWeight: '700', whiteSpace: 'nowrap' }}>
                                  {op.date}
                                  <div style={{ fontSize: '0.68rem', color: '#475569', marginTop: '2px' }}>{op.branch_name || currentOutlet.name}</div>
                                </td>

                                {/* 2. NO LAPORAN */}
                                <td style={{ padding: '12px 10px', fontWeight: '900' }}>
                                  <button
                                    type="button"
                                    onClick={() => setPreviewOpnameSummaryRecord(op)}
                                    style={{ background: 'none', border: 'none', padding: 0, color: '#38bdf8', fontWeight: '900', fontSize: '0.80rem', cursor: 'pointer', textDecoration: 'underline', textAlign: 'left', whiteSpace: 'nowrap' }}
                                    title="Klik untuk membuka rincian laporan stok opname"
                                  >
                                    {op.report_no || op.id}
                                  </button>
                                  <div style={{ fontSize: '0.68rem', color: statusColor, fontWeight: '800', marginTop: '2px' }}>{statusLabel}</div>
                                </td>

                                {/* 3. DIBUAT OLEH */}
                                <td style={{ padding: '12px 10px', color: 'var(--pos-txt-primary)', whiteSpace: 'nowrap' }}>
                                  <div>{op.created_by || op.submitted_by || 'Admin'}</div>
                                  <div style={{ fontSize: '0.68rem', color: op.type_input === 'Sent from Web Admin' ? '#34d399' : '#818cf8', fontWeight: '800' }}>
                                    {op.type_input || 'Mobile Kasir'}
                                  </div>
                                </td>

                                {/* 4. STOK AWAL */}
                                <td style={{ padding: '12px 10px', textAlign: 'right', color: 'var(--pos-txt-secondary)', whiteSpace: 'nowrap' }}>{op.stok_awal || 0} {op.unit || 'kg'}</td>

                                {/* 5. STOK MASUK (+) */}
                                <td style={{ padding: '12px 10px', textAlign: 'right', color: '#34d399', fontWeight: '700', whiteSpace: 'nowrap' }}>+{op.stok_masuk || 0} {op.unit || 'kg'}</td>

                                {/* 6. STOK KELUAR [WEB ADMIN] */}
                                <td style={{ padding: '12px 10px', textAlign: 'right', fontWeight: '900', color: '#fb7185', background: 'rgba(251, 113, 133, 0.08)', whiteSpace: 'nowrap' }}>
                                  -{op.stok_keluar || 0} {op.unit || 'kg'}
                                </td>

                                {/* 7. TRANSFER STOK IN */}
                                <td style={{ padding: '12px 10px', textAlign: 'right', color: '#34d399', fontWeight: '800', whiteSpace: 'nowrap' }}>
                                  +{op.transfer_masuk || 0} {op.unit || 'kg'}
                                </td>

                                {/* 8. TRANSFER STOK OUT */}
                                <td style={{ padding: '12px 10px', textAlign: 'right', color: '#a78bfa', fontWeight: '800', whiteSpace: 'nowrap' }}>
                                  -{op.transfer_keluar || 0} {op.unit || 'kg'}
                                </td>

                                {/* 9. STOK RUSAK (-) */}
                                <td style={{ padding: '12px 10px', textAlign: 'right', color: '#fb7185', fontWeight: '800', whiteSpace: 'nowrap' }}>
                                  -{op.stok_rusak || 0} {op.unit || 'kg'}
                                </td>

                                {/* 10. STOK SISTEM */}
                                <td style={{ padding: '12px 10px', textAlign: 'right', fontWeight: '900', color: '#38bdf8', whiteSpace: 'nowrap' }}>{sSistem} {op.unit || 'kg'}</td>

                                {/* 11. HARGA SATUAN */}
                                <td style={{ padding: '12px 10px', textAlign: 'right', fontWeight: '700', color: '#fbbf24', whiteSpace: 'nowrap' }}>
                                  {formatRupiah(hargaSatuanWeb)}
                                </td>

                                {/* 12. DENDA PER STOK */}
                                <td style={{ padding: '12px 10px', textAlign: 'right', fontWeight: '900', color: dendaStokRow > 0 ? '#fb7185' : '#64748b', background: dendaStokRow > 0 ? 'rgba(244, 63, 94, 0.08)' : 'transparent', whiteSpace: 'nowrap' }}>
                                  {dendaStokRow > 0 ? formatRupiah(dendaStokRow) : '-'}
                                </td>

                                {/* 13. AKSI */}
                                <td style={{ padding: '12px 10px', textAlign: 'center' }}>
                                  <button
                                    type="button"
                                    onClick={() => setPreviewOpnameSummaryRecord(op)}
                                    style={{ padding: '5px 10px', background: 'rgba(56,189,248,0.15)', border: '1px solid rgba(56,189,248,0.3)', color: '#38bdf8', borderRadius: '6px', fontSize: '0.74rem', fontWeight: '800', cursor: 'pointer', whiteSpace: 'nowrap' }}
                                  >
                                    Preview
                                  </button>
                                </td>
                              </tr>
                            );
                          });

                          return (
                            <>
                              {rows}
                              <tr style={{ background: 'var(--pos-bg-app)', fontWeight: '900', borderTop: '2px solid #334155' }}>
                                <td colSpan={14} style={{ padding: '12px 10px', textAlign: 'right', color: '#fb7185', textTransform: 'uppercase' }}>
                                  <span>TOTAL AKUMULASI DENDA PER STOK:</span>
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
            <h2 style={{ fontSize: '1.2rem', fontWeight: '900', color: 'var(--pos-txt-primary)', marginBottom: '4px' }}>Laporan & Pengajuan Stok Logistik</h2>
            <p style={{ fontSize: '0.78rem', color: 'var(--pos-txt-secondary)', marginBottom: '20px' }}>Permintaan Bahan Baku Outlet {currentOutlet.name}</p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '20px' }}>
              <div style={{ background: 'var(--pos-bg-card)', padding: '20px', borderRadius: '16px', border: '1px solid var(--pos-border)' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: '800', color: 'var(--pos-txt-primary)', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
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

              <div style={{ background: 'var(--pos-bg-card)', padding: '20px', borderRadius: '16px', border: '1px solid var(--pos-border)' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: '800', color: 'var(--pos-txt-primary)', marginBottom: '14px' }}>Riwayat Status Pengajuan Logistik</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {(() => {
                    const deletedLogisticsSet = new Set([
                      ...(masterData?.deletedLogisticsIds || []),
                      ...(masterData?.deletedOutflowIds || [])
                    ].map(x => String(x)));

                    const approvedList = (masterData?.approvedLogistics || []).filter(req => {
                      if (!req) return false;
                      const reqId = String(req.id !== undefined && req.id !== null ? req.id : '');
                      const reqRNo = String(req.report_no || req.receiptNo || '');
                      return !deletedLogisticsSet.has(reqId) && !deletedLogisticsSet.has(reqRNo);
                    });

                    return approvedList.map(req => (
                      <div key={req.id} style={{ background: 'var(--pos-bg-app)', padding: '12px 14px', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ fontSize: '0.85rem', fontWeight: '800', color: 'var(--pos-txt-primary)' }}>{req.item_name} ({req.qty})</div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--pos-txt-secondary)' }}>ID: {req.id} • {req.date}</div>
                        </div>
                        <span style={{ fontSize: '0.72rem', fontWeight: '800', padding: '3px 10px', borderRadius: '8px', background: req.status === 'Disetujui' ? 'rgba(16,185,129,0.2)' : 'rgba(245,158,11,0.2)', color: req.status === 'Disetujui' ? '#34d399' : '#fbbf24' }}>
                          {req.status}
                        </span>
                      </div>
                    ));
                  })()}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 6: LAPORAN OMZET */}
        {activeNavTab === 'omzet' && (() => {
          const tab6PaymentMap = {};
          outletTransactions.forEach(tx => {
            let pm = String(tx.payment_method || tx.payment_type || 'Tunai (Cash)').trim();
            if (!pm || pm === '-') pm = 'Tunai (Cash)';
            const amt = Number(tx.amount || tx.grandTotal || tx.total || 0);
            if (!tab6PaymentMap[pm]) tab6PaymentMap[pm] = { name: pm, amount: 0, count: 0 };
            tab6PaymentMap[pm].amount += amt;
            tab6PaymentMap[pm].count += 1;
          });
          const tab6PaymentList = Object.values(tab6PaymentMap).sort((a, b) => b.amount - a.amount);

          const getPmIcon = (name) => {
            const n = String(name || '').toLowerCase();
            if (n.includes('cash') || n.includes('tunai')) return '💵';
            if (n.includes('qris')) return '📱';
            if (n.includes('debit') || n.includes('edc')) return '💳';
            if (n.includes('transfer') || n.includes('bank') || n.includes('bca')) return '🏦';
            if (n.includes('gofood') || n.includes('grab') || n.includes('shopee')) return '🛵';
            return '🏷️';
          };

          const getPmColor = (name) => {
            const n = String(name || '').toLowerCase();
            if (n.includes('cash') || n.includes('tunai')) return '#34d399';
            if (n.includes('qris')) return '#38bdf8';
            if (n.includes('debit') || n.includes('edc')) return '#818cf8';
            if (n.includes('transfer') || n.includes('bank') || n.includes('bca')) return '#a78bfa';
            if (n.includes('gofood') || n.includes('grab') || n.includes('shopee')) return '#f97316';
            return '#fbbf24';
          };

          return (
            <div style={{ flex: 1, padding: '20px', overflowY: 'auto', width: '100%' }}>
              <h2 style={{ fontSize: '1.2rem', fontWeight: '900', color: 'var(--pos-txt-primary)', marginBottom: '4px' }}>Laporan Omzet & Performa Outlet</h2>
              <p style={{ fontSize: '0.78rem', color: 'var(--pos-txt-secondary)', marginBottom: '20px' }}>Analisis Ringkas Omset Outlet {currentOutlet.name}</p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px', marginBottom: '20px' }}>
                <div style={{ background: 'var(--pos-bg-card)', padding: '18px', borderRadius: '16px', border: '1px solid var(--pos-border)' }}>
                  <div style={{ fontSize: '0.78rem', color: 'var(--pos-txt-secondary)', fontWeight: '700' }}>TOTAL OMSET GROSS</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: '900', color: '#34d399', marginTop: '6px' }}>{formatRupiah(totalSalesGross)}</div>
                </div>
                <div style={{ background: 'var(--pos-bg-card)', padding: '18px', borderRadius: '16px', border: '1px solid var(--pos-border)' }}>
                  <div style={{ fontSize: '0.78rem', color: 'var(--pos-txt-secondary)', fontWeight: '700' }}>TOTAL STRUK NOTA</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: '900', color: '#38bdf8', marginTop: '6px' }}>{outletTransactions.length} Struk</div>
                </div>
                <div style={{ background: 'var(--pos-bg-card)', padding: '18px', borderRadius: '16px', border: '1px solid var(--pos-border)' }}>
                  <div style={{ fontSize: '0.78rem', color: 'var(--pos-txt-secondary)', fontWeight: '700' }}>RATA-RATA NILAI STRUK</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: '900', color: '#818cf8', marginTop: '6px' }}>
                    {formatRupiah(outletTransactions.length > 0 ? totalSalesGross / outletTransactions.length : 0)}
                  </div>
                </div>
              </div>

              {/* PENJABARAN OMZET PER METODE PEMBAYARAN */}
              <div style={{ background: 'var(--pos-bg-card)', borderRadius: '16px', padding: '20px', border: '1px solid var(--pos-border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
                  <div>
                    <h3 style={{ fontSize: '1rem', fontWeight: '900', color: 'var(--pos-txt-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span>💳</span>
                      <span>Penjabaran Omzet Berdasarkan Metode Pembayaran</span>
                    </h3>
                    <p style={{ fontSize: '0.76rem', color: 'var(--pos-txt-secondary)', margin: '4px 0 0 0' }}>
                      Rincian penerimaan omzet outlet per kanal metode pembayaran kasir POS
                    </p>
                  </div>
                  <span style={{ fontSize: '0.74rem', fontWeight: '800', background: 'rgba(99,102,241,0.15)', color: '#818cf8', padding: '4px 10px', borderRadius: '8px', border: '1px solid rgba(99,102,241,0.3)' }}>
                    {tab6PaymentList.length} Kanal Pembayaran
                  </span>
                </div>

                {tab6PaymentList.length === 0 ? (
                  <div style={{ padding: '24px', textAlign: 'center', color: '#64748b', fontSize: '0.80rem' }}>
                    Belum ada transaksi dengan metode pembayaran.
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
                    {tab6PaymentList.map((pm, idx) => {
                      const pct = totalSalesGross > 0 ? ((pm.amount / totalSalesGross) * 100).toFixed(1) : '0.0';
                      const color = getPmColor(pm.name);
                      const icon = getPmIcon(pm.name);

                      return (
                        <div
                          key={idx}
                          style={{
                            background: 'var(--pos-bg-app)',
                            borderRadius: '12px',
                            padding: '14px',
                            border: '1px solid var(--pos-border)',
                            borderLeft: `4px solid ${color}`,
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '8px'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ fontSize: '1.2rem' }}>{icon}</span>
                              <div>
                                <div style={{ fontSize: '0.82rem', fontWeight: '800', color: 'var(--pos-txt-primary)' }}>
                                  {pm.name}
                                </div>
                                <div style={{ fontSize: '0.70rem', color: 'var(--pos-txt-secondary)' }}>
                                  {pm.count} Struk Terverifikasi
                                </div>
                              </div>
                            </div>
                            <span style={{ fontSize: '0.74rem', fontWeight: '900', color: color, background: `${color}15`, padding: '2px 6px', borderRadius: '6px' }}>
                              {pct}%
                            </span>
                          </div>

                          <div>
                            <div style={{ fontSize: '1.15rem', fontWeight: '900', color: color, letterSpacing: '-0.02em' }}>
                              {formatRupiah(pm.amount)}
                            </div>
                          </div>

                          {/* Visual Progress Bar */}
                          <div style={{ width: '100%', height: '5px', background: 'rgba(255,255,255,0.08)', borderRadius: '999px', overflow: 'hidden' }}>
                            <div style={{ width: `${Math.min(100, Number(pct))}%`, height: '100%', background: color, borderRadius: '999px', transition: 'width 0.3s ease' }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          );
        })()}

        {/* TAB 7: HALAMAN SETTING POS MOBILE */}
        {(activeNavTab === 'pos_settings' || activeNavTab === 'printer_setting') && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', background: 'var(--pos-bg-app)' }}>
            
            {/* 2. TWO-COLUMN SETTINGS MAIN LAYOUT */}
            <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
              
              {/* LEFT SIDEBAR SETTINGS SUB-MENU */}
              <div style={{
                width: '240px',
                background: 'var(--pos-bg-card)',
                borderRight: '1px solid var(--pos-border)',
                display: 'flex',
                flexDirection: 'column',
                justify: 'space-between',
                padding: '16px 12px'
              }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {[
                  { id: 'umum', label: 'Umum', icon: Settings },
                    { id: 'printer', label: 'Printer', icon: PrinterIcon },
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
                          color: isSubActive ? '#ffffff' : '#cbd5e1',
                          fontWeight: isSubActive ? '800' : '600',
                          fontSize: '0.88rem',
                          cursor: 'pointer',
                          textAlign: 'left',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <SubIcon size={18} color={isSubActive ? '#818cf8' : '#cbd5e1'} />
                        <span style={{ color: isSubActive ? '#ffffff' : '#cbd5e1' }}>{tab.label}</span>
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
              <div style={{ flex: 1, padding: '32px 40px', overflowY: 'auto', background: 'var(--pos-bg-app)' }}>
                
                {/* SUB-TAB 1: UMUM (MATCHING SCREENSHOT 100%) */}
                {settingSubTab === 'umum' && (
                  <div style={{ maxWidth: '650px', display: 'flex', flexDirection: 'column', gap: '28px' }}>
                    <h2 style={{ fontSize: '1.4rem', fontWeight: '900', color: isLight ? '#0f172a' : '#ffffff', margin: 0 }}>
                      Pengaturan Umum POS Mobile
                    </h2>

                    {/* PILIHAN TEMA TAMPILAN (CALM SAGE VS GELAP VS SOFT BLUE) */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <label style={{ fontSize: '0.90rem', fontWeight: '800', color: T.txtPrimary }}>
                        Tema Tampilan Aplikasi POS (Theme Mode)
                      </label>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', maxWidth: '600px' }}>
                        
                        {/* 1. CALM SAGE CARD (DEFAULT REKOMENDASI) */}
                        <div
                          onClick={() => toggleAppTheme('calm_sage')}
                          style={{
                            background: isCalmSage ? 'linear-gradient(135deg, rgba(45,122,91,0.15) 0%, #ffffff 100%)' : T.cardBg,
                            border: isCalmSage ? '2.5px solid #2d7a5b' : `1.5px solid ${T.border}`,
                            borderRadius: '16px',
                            padding: '16px 12px',
                            textAlign: 'center',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            boxShadow: isCalmSage ? '0 8px 20px rgba(45,122,91,0.2)' : 'none'
                          }}
                        >
                          <div style={{ fontSize: '1.6rem', marginBottom: '4px' }}>🌿</div>
                          <div style={{ fontWeight: '900', color: isCalmSage ? '#2d7a5b' : T.txtPrimary, fontSize: '0.88rem' }}>Calm Sage</div>
                          <span style={{ fontSize: '0.68rem', color: isCalmSage ? '#2d7a5b' : T.txtMuted, fontWeight: '800', marginTop: '4px', display: 'inline-block' }}>
                            {isCalmSage ? '● Aktif (Fresh & Mint)' : 'Fresh & Mint Theme'}
                          </span>
                        </div>

                        {/* 2. MODE GELAP CARD */}
                        <div
                          onClick={() => toggleAppTheme('dark')}
                          style={{
                            background: appTheme === 'dark' ? 'linear-gradient(135deg, rgba(37,99,235,0.2) 0%, rgba(15,23,42,0.9) 100%)' : T.cardBg,
                            border: appTheme === 'dark' ? '2.5px solid #2563eb' : `1.5px solid ${T.border}`,
                            borderRadius: '16px',
                            padding: '16px 12px',
                            textAlign: 'center',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            boxShadow: appTheme === 'dark' ? '0 8px 20px rgba(37,99,235,0.25)' : 'none'
                          }}
                        >
                          <div style={{ fontSize: '1.6rem', marginBottom: '4px' }}>🌙</div>
                          <div style={{ fontWeight: '900', color: appTheme === 'dark' ? '#60a5fa' : T.txtPrimary, fontSize: '0.88rem' }}>Mode Gelap</div>
                          <span style={{ fontSize: '0.68rem', color: appTheme === 'dark' ? '#60a5fa' : T.txtMuted, fontWeight: '800', marginTop: '4px', display: 'inline-block' }}>
                            {appTheme === 'dark' ? '● Aktif' : 'Deep Navy Glass'}
                          </span>
                        </div>

                      </div>
                    </div>

                    {/* CHECKBOX AUTO LOCK */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', fontSize: '0.94rem', fontWeight: '800', color: 'var(--pos-txt-primary)' }}>
                        <input
                          type="checkbox"
                          checked={autoLockApp5Min}
                          onChange={e => setAutoLockApp5Min(e.target.checked)}
                          style={{ width: '20px', height: '20px', accentColor: '#6366f1', cursor: 'pointer' }}
                        />
                        <span>Kunci Aplikasi (Setelah 5 menit tidak ada aktivitas)</span>
                      </label>
                      <p style={{ fontSize: '0.78rem', color: 'var(--pos-txt-secondary)', fontStyle: 'italic', margin: '0 0 0 32px' }}>
                        * Aplikasi akan dikunci jika tidak ada aktifitas selama 5 menit. (Restart diperlukan)
                      </p>
                    </div>

                    {/* DROPDOWN PILIH BAHASA */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxWidth: '320px' }}>
                      <label style={{ fontSize: '0.88rem', fontWeight: '800', color: 'var(--pos-txt-primary)' }}>Pilih Bahasa</label>
                      <select
                        value={selectedLanguage}
                        onChange={e => setSelectedLanguage(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '12px 14px',
                          borderRadius: '10px',
                          background: 'var(--pos-bg-card)',
                          border: '1px solid var(--pos-border-card)',
                          color: 'var(--pos-txt-primary)',
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


                {/* SUB-TAB: PRINTER BLUETOOTH — ROMBAK TOTAL */}
                {settingSubTab === 'printer' && (() => {
                  // Status warna helpers
                  const isHardwarePrinter = printerMac && printerMac !== 'SYSTEM_PDF_PRINT';
                  const printerName = pairedDevices.find(d => d.address === printerMac)?.name || printerMac || null;
                  const liveStatus = liveDeviceMap[printerMac]; // true | false | undefined

                  const statusBg = {
                    success: 'rgba(52,211,153,0.15)', printing: 'rgba(99,102,241,0.15)',
                    success_pdf: 'rgba(250,204,21,0.15)', error: 'rgba(244,63,94,0.15)'
                  };
                  const statusBorder = {
                    success: '#34d399', printing: '#6366f1',
                    success_pdf: '#facc15', error: '#f43f5e'
                  };
                  const statusColor = {
                    success: '#34d399', printing: '#a5b4fc',
                    success_pdf: '#facc15', error: '#f87171'
                  };

                  return (
                    <div style={{ maxWidth: '660px', display: 'flex', flexDirection: 'column', gap: '20px' }}>

                      {/* JUDUL */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <PrinterIcon size={26} color="#6366f1" />
                        <div>
                          <h2 style={{ fontSize: '1.3rem', fontWeight: '900', color: '#ffffff', margin: 0 }}>
                            Koneksi Printer Bluetooth
                          </h2>
                          <p style={{ fontSize: '0.78rem', color: '#94a3b8', margin: '3px 0 0', fontWeight: '600' }}>
                            Hanya perangkat yang sudah di-pair di Pengaturan Android yang akan muncul di sini.
                          </p>
                        </div>
                      </div>

                      {/* STATUS BANNER */}
                      {(printStatusMsg || isScanningPaired) && (
                        <div style={{
                          padding: '12px 16px',
                          borderRadius: '12px',
                          background: printStatus ? statusBg[printStatus] || 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.07)',
                          border: `1px solid ${printStatus ? statusBorder[printStatus] || '#475569' : '#475569'}`,
                          color: printStatus ? statusColor[printStatus] || '#94a3b8' : '#94a3b8',
                          fontSize: '0.84rem',
                          fontWeight: '700',
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '8px',
                          lineHeight: '1.5'
                        }}>
                          <span style={{ fontSize: '1.1rem', lineHeight: '1.2' }}>
                            {isScanningPaired ? '' : printStatus === 'success' ? '' : printStatus === 'error' ? '' : printStatus === 'success_pdf' ? '' : 'ℹ'}
                          </span>
                          <span>{isScanningPaired ? 'Memindai perangkat Bluetooth...' : printStatusMsg}</span>
                        </div>
                      )}

                      {/* KARTU: PRINTER AKTIF */}
                      <div style={{ background: 'var(--pos-bg-card)', borderRadius: '16px', border: '1px solid var(--pos-border)', padding: '20px' }}>
                        <div style={{ fontSize: '0.88rem', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '14px' }}>
                          Printer Aktif
                        </div>
                        {printerMac ? (
                          <div style={{
                            display: 'flex', alignItems: 'center', gap: '14px',
                            padding: '16px',
                            borderRadius: '12px',
                            background: liveStatus === false ? 'rgba(239,68,68,0.1)' : liveStatus === true ? 'rgba(52,211,153,0.1)' : 'rgba(99,102,241,0.1)',
                            border: `2px solid ${liveStatus === false ? '#ef4444' : liveStatus === true ? '#34d399' : '#6366f1'}`
                          }}>
                            <div style={{
                              width: '44px', height: '44px', borderRadius: '12px',
                              background: liveStatus === false ? 'rgba(239,68,68,0.2)' : liveStatus === true ? 'rgba(52,211,153,0.2)' : 'rgba(99,102,241,0.2)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                            }}>
                              {isHardwarePrinter
                                ? <BluetoothConnected size={22} color={liveStatus === false ? '#ef4444' : liveStatus === true ? '#34d399' : '#818cf8'} />
                                : <PrinterIcon size={22} color="#818cf8" />}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontWeight: '900', color: '#ffffff', fontSize: '0.95rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {printerName || printerMac}
                              </div>
                              <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '2px', fontFamily: 'monospace' }}>
                                {isHardwarePrinter ? printerMac : 'Cetak PDF via Browser'}
                              </div>
                              <div style={{ marginTop: '6px' }}>
                                <span style={{
                                  fontSize: '0.70rem', padding: '2px 8px', borderRadius: '6px', fontWeight: '800',
                                  background: liveStatus === false ? 'rgba(239,68,68,0.2)' : liveStatus === true ? 'rgba(52,211,153,0.2)' : 'rgba(99,102,241,0.15)',
                                  color: liveStatus === false ? '#fca5a5' : liveStatus === true ? '#6ee7b7' : '#c7d2fe',
                                  border: `1px solid ${liveStatus === false ? '#ef4444' : liveStatus === true ? '#34d399' : '#6366f1'}`
                                }}>
                                  {liveStatus === true ? 'Terhubung & Siap Cetak'
                                    : liveStatus === false ? 'Tidak Merespon / Mati'
                                    : isHardwarePrinter ? 'Belum dicek' : 'Mode PDF'}
                                </span>
                              </div>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flexShrink: 0 }}>
                              {isHardwarePrinter && (
                                <button
                                  type="button"
                                  onClick={() => handleCheckLiveStatus(printerMac)}
                                  disabled={checkingMacMap[printerMac]}
                                  style={{
                                    padding: '7px 12px', borderRadius: '8px', border: '1px solid #6366f1',
                                    background: 'rgba(99,102,241,0.2)', color: '#a5b4fc',
                                    fontWeight: '800', fontSize: '0.74rem', cursor: 'pointer',
                                    display: 'flex', alignItems: 'center', gap: '5px'
                                  }}
                                >
                                  <Zap size={13} />
                                  {checkingMacMap[printerMac] ? 'Cek...' : 'Cek Koneksi'}
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => handleSavePrinterConfig('', printerPaperWidth)}
                                style={{
                                  padding: '7px 12px', borderRadius: '8px', border: '1px solid #f43f5e',
                                  background: 'rgba(244,63,94,0.1)', color: '#f43f5e',
                                  fontWeight: '800', fontSize: '0.74rem', cursor: 'pointer'
                                }}
                              >
                                Lepas
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div style={{
                            display: 'flex', alignItems: 'center', gap: '12px',
                            padding: '16px', borderRadius: '12px',
                            background: 'rgba(255,255,255,0.04)', border: '2px dashed #334155'
                          }}>
                            <BluetoothOff size={22} color="#64748b" />
                            <div>
                              <div style={{ color: '#94a3b8', fontWeight: '800', fontSize: '0.90rem' }}>Belum ada printer dipilih</div>
                              <div style={{ color: '#64748b', fontSize: '0.76rem', marginTop: '2px' }}>Scan perangkat di bawah lalu pilih printer Anda.</div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* KARTU: LEBAR KERTAS */}
                      <div style={{ background: 'var(--pos-bg-card)', borderRadius: '16px', border: '1px solid var(--pos-border)', padding: '20px' }}>
                        <div style={{ fontSize: '0.88rem', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '14px' }}>
                          Lebar Kertas Thermal
                        </div>
                        <div style={{ display: 'flex', gap: '10px' }}>
                          {['58', '80'].map(w => (
                            <button
                              key={w}
                              type="button"
                              onClick={() => handleSavePrinterConfig(printerMac, w)}
                              style={{
                                flex: 1, padding: '16px 10px', borderRadius: '12px',
                                border: `2px solid ${printerPaperWidth === w ? '#6366f1' : '#334155'}`,
                                background: printerPaperWidth === w ? 'linear-gradient(135deg, #4f46e5, #3b82f6)' : '#1e293b',
                                color: printerPaperWidth === w ? '#ffffff' : '#94a3b8',
                                fontWeight: '900', fontSize: '1.05rem', cursor: 'pointer',
                                transition: 'all 0.15s', textAlign: 'center'
                              }}
                            >
                              {w}mm
                              <div style={{ fontSize: '0.72rem', fontWeight: '700', marginTop: '4px', color: printerPaperWidth === w ? '#e0e7ff' : '#64748b' }}>
                                {w === '58' ? 'Mini Kasir / PRP-58' : 'Lebar / RPP-80'}
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* KARTU: DAFTAR PERANGKAT BLUETOOTH */}
                      <div style={{ background: 'var(--pos-bg-card)', borderRadius: '16px', border: '1px solid var(--pos-border)', padding: '20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                          <div>
                            <div style={{ fontSize: '0.88rem', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                              Perangkat Bluetooth Paired
                            </div>
                            <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '3px' }}>
                              Hanya perangkat yang sudah di-pair di: <strong style={{ color: '#94a3b8' }}>Pengaturan Android → Bluetooth</strong>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={handleScanPairedPrinters}
                            disabled={isScanningPaired}
                            style={{
                              display: 'flex', alignItems: 'center', gap: '6px',
                              padding: '9px 16px', borderRadius: '10px', border: 'none',
                              background: isScanningPaired ? 'rgba(99,102,241,0.2)' : 'linear-gradient(135deg, #6366f1, #4f46e5)',
                              color: '#ffffff', fontWeight: '900', fontSize: '0.80rem',
                              cursor: isScanningPaired ? 'not-allowed' : 'pointer',
                              boxShadow: '0 4px 12px rgba(99,102,241,0.3)', whiteSpace: 'nowrap', flexShrink: 0
                            }}
                          >
                            <Bluetooth size={15} />
                            {isScanningPaired ? 'Memindai...' : 'Scan Ulang'}
                          </button>
                        </div>

                        <div style={{ marginTop: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {isScanningPaired && (
                            <div style={{
                              textAlign: 'center', padding: '28px',
                              borderRadius: '12px', background: '#0f172a', border: '1px solid #1e293b',
                              color: '#94a3b8', fontSize: '0.88rem', fontWeight: '700'
                            }}>
                              Memindai perangkat Bluetooth yang di-pair di HP Anda...
                            </div>
                          )}

                          {!isScanningPaired && pairedDevices.length === 0 && (
                            <div style={{
                              padding: '24px', borderRadius: '12px',
                              background: '#0f172a', border: '1px dashed #334155',
                              textAlign: 'center'
                            }}>
                              <div style={{ fontSize: '2rem', marginBottom: '8px' }}></div>
                              <div style={{ color: '#94a3b8', fontWeight: '800', fontSize: '0.90rem', marginBottom: '6px' }}>
                                Tidak ada perangkat Bluetooth ditemukan
                              </div>
                              <div style={{ color: '#64748b', fontSize: '0.78rem', lineHeight: '1.6' }}>
                                1. Nyalakan printer thermal Anda<br/>
                                2. Buka <strong style={{ color: '#94a3b8' }}>Pengaturan Android → Bluetooth</strong><br/>
                                3. Pair printer Anda (biasanya bernama RPP02N, PTP-II, dll)<br/>
                                4. Kembali ke sini lalu tekan <strong style={{ color: '#94a3b8' }}>Scan Ulang</strong>
                              </div>
                            </div>
                          )}

                          {!isScanningPaired && pairedDevices.map(device => {
                            const isSel = printerMac === device.address;
                            const isSystem = device.type === 'system';
                            const live = liveDeviceMap[device.address];
                            // isBle = true HANYA jika plugin kembalikan 'le' (BLE murni, tidak ada SPP)
                            // Printer DUAL seperti RPP02N sekarang dikembalikan sebagai 'classic' oleh Java plugin
                            const isBle = String(device.type || '').toLowerCase() === 'le';
                            const typeLabel = isSystem ? 'PDF' : isBle ? 'BLE' : 'Classic';

                            return (
                              <div
                                key={device.address}
                                onClick={() => !isBle && handleSavePrinterConfig(device.address, printerPaperWidth)}
                                style={{
                                  display: 'flex', alignItems: 'center', gap: '12px',
                                  padding: '14px 16px', borderRadius: '12px',
                                  border: `2px solid ${isSel ? '#6366f1' : live === false ? '#ef4444' : '#1e293b'}`,
                                  background: isSel ? 'rgba(99,102,241,0.18)' : live === false ? 'rgba(239,68,68,0.07)' : '#0f172a',
                                  cursor: isBle ? 'default' : 'pointer',
                                  opacity: isBle ? 0.5 : 1,
                                  transition: 'all 0.15s'
                                }}
                              >
                                {/* ICON */}
                                <div style={{
                                  width: '40px', height: '40px', borderRadius: '10px', flexShrink: 0,
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  background: isSel ? 'rgba(99,102,241,0.25)' : isSystem ? 'rgba(100,116,139,0.2)' : 'rgba(56,189,248,0.15)'
                                }}>
                                  {isSystem
                                    ? <PrinterIcon size={20} color="#94a3b8" />
                                    : isSel
                                    ? <BluetoothConnected size={20} color="#818cf8" />
                                    : <Bluetooth size={20} color="#38bdf8" />}
                                </div>

                                {/* INFO */}
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{
                                    fontWeight: '900', fontSize: '0.92rem', color: '#ffffff',
                                    display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap'
                                  }}>
                                    <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '200px' }}>
                                      {device.name || 'Perangkat Tanpa Nama'}
                                    </span>
                                    {isSel && (
                                      <span style={{
                                        fontSize: '0.65rem', padding: '2px 7px', borderRadius: '5px',
                                        background: 'rgba(99,102,241,0.3)', color: '#c7d2fe',
                                        border: '1px solid #6366f1', fontWeight: '900'
                                      }}>AKTIF</span>
                                    )}
                                    {isBle && (
                                      <span style={{
                                        fontSize: '0.65rem', padding: '2px 7px', borderRadius: '5px',
                                        background: 'rgba(251,191,36,0.15)', color: '#fbbf24',
                                        border: '1px solid #f59e0b', fontWeight: '800'
                                      }}>BLE – tidak cocok untuk printer thermal</span>
                                    )}
                                    {!isSystem && !isBle && (
                                      <span style={{
                                        fontSize: '0.65rem', padding: '2px 7px', borderRadius: '5px', fontWeight: '800',
                                        background: live === false ? 'rgba(239,68,68,0.2)' : live === true ? 'rgba(52,211,153,0.15)' : 'rgba(56,189,248,0.12)',
                                        color: live === false ? '#fca5a5' : live === true ? '#6ee7b7' : '#7dd3fc',
                                        border: `1px solid ${live === false ? '#ef4444' : live === true ? '#34d399' : '#38bdf8'}`
                                      }}>
                                        {live === true ? 'Online' : live === false ? 'Offline' : 'Belum dicek'}
                                      </span>
                                    )}
                                  </div>
                                  <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '2px', fontFamily: 'monospace' }}>
                                    {device.address}
                                    {isSystem ? ' — Cetak PDF via sistem' : isBle ? ' — BLE Only (tidak mendukung SPP cetak thermal)' : ` — Bluetooth Classic/SPP [${typeLabel}]`}
                                  </div>
                                </div>

                                {/* ACTIONS */}
                                <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                                  {!isSystem && !isBle && (
                                    <button
                                      type="button"
                                      onClick={e => { e.stopPropagation(); handleCheckLiveStatus(device.address); }}
                                      disabled={checkingMacMap[device.address]}
                                      style={{
                                        padding: '7px 10px', borderRadius: '8px',
                                        border: '1px solid #334155', background: 'rgba(99,102,241,0.15)',
                                        color: '#94a3b8', fontWeight: '800', fontSize: '0.72rem',
                                        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px'
                                      }}
                                    >
                                      <Zap size={12} />
                                      {checkingMacMap[device.address] ? '...' : 'Cek'}
                                    </button>
                                  )}
                                  {!isBle && (
                                    <button
                                      type="button"
                                      onClick={e => { e.stopPropagation(); handleSavePrinterConfig(device.address, printerPaperWidth); }}
                                      style={{
                                        padding: '7px 14px', borderRadius: '8px', border: 'none',
                                        background: isSel ? 'linear-gradient(135deg, #6366f1, #4f46e5)' : '#1e293b',
                                        color: '#ffffff', fontWeight: '900', fontSize: '0.78rem', cursor: 'pointer'
                                      }}
                                    >
                                      {isSel ? 'Aktif' : 'Pilih'}
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* INPUT MAC MANUAL */}
                        <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px dashed #1e293b' }}>
                          <div style={{ fontSize: '0.80rem', fontWeight: '800', color: '#94a3b8', marginBottom: '8px' }}>
                            Input Alamat MAC Manual (jika printer tidak muncul di atas):
                          </div>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <input
                              type="text"
                              placeholder="Contoh: 00:11:22:33:44:55"
                              value={printerMac && printerMac !== 'SYSTEM_PDF_PRINT' ? printerMac : ''}
                              onChange={e => setPrinterMac(e.target.value.toUpperCase())}
                              style={{
                                flex: 1, padding: '11px 14px', borderRadius: '10px',
                                border: '1px solid #334155', background: '#0f172a',
                                color: '#ffffff', fontSize: '0.88rem', fontWeight: '700',
                                fontFamily: 'monospace', outline: 'none'
                              }}
                            />
                            <button
                              type="button"
                              onClick={() => {
                                if (printerMac && printerMac.length >= 5) {
                                  handleSavePrinterConfig(printerMac, printerPaperWidth);
                                }
                              }}
                              style={{
                                padding: '11px 18px', borderRadius: '10px', border: 'none',
                                background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                                color: '#ffffff', fontWeight: '900', fontSize: '0.84rem', cursor: 'pointer'
                              }}
                            >
                              Simpan
                            </button>
                          </div>
                          <div style={{ fontSize: '0.72rem', color: '#475569', marginTop: '5px' }}>
                            Format: XX:XX:XX:XX:XX:XX (lihat di balik printer atau di Pengaturan Bluetooth Android)
                          </div>
                        </div>
                      </div>

                      {/* KARTU: TES CETAK */}
                      <div style={{ background: 'var(--pos-bg-card)', borderRadius: '16px', border: '1px solid var(--pos-border)', padding: '20px' }}>
                        <div style={{ fontSize: '0.88rem', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>
                          Tes Cetak
                        </div>
                        <div style={{ fontSize: '0.78rem', color: '#64748b', marginBottom: '14px' }}>
                          {printerMac
                            ? 'Kirim struk tes ke printer yang dipilih. Jika berhasil cetak, printer siap digunakan.'
                            : 'Pilih printer terlebih dahulu untuk mengaktifkan tes cetak.'}
                        </div>
                        <button
                          type="button"
                          onClick={handleExecuteTestPrint}
                          disabled={!printerMac || printStatus === 'printing'}
                          style={{
                            width: '100%',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                            padding: '14px', borderRadius: '12px',
                            border: `1px solid ${!printerMac ? '#334155' : '#34d399'}`,
                            background: !printerMac ? 'rgba(100,116,139,0.08)' : 'linear-gradient(135deg, rgba(52,211,153,0.2), rgba(16,185,129,0.2))',
                            color: !printerMac ? '#475569' : '#34d399',
                            fontWeight: '900', fontSize: '0.92rem',
                            cursor: !printerMac ? 'not-allowed' : 'pointer',
                            transition: 'all 0.15s'
                          }}
                        >
                          <PrinterIcon size={18} />
                          {printStatus === 'printing' ? 'Mengirim ke printer...' : 'Kirim Struk Tes Sekarang'}
                        </button>
                        {testPrintSuccessToast && (
                          <div style={{
                            marginTop: '10px', textAlign: 'center', padding: '10px',
                            borderRadius: '10px', background: 'rgba(52,211,153,0.1)',
                            color: '#34d399', fontSize: '0.84rem', fontWeight: '800',
                            border: '1px solid #34d399'
                          }}>
                            Struk tes berhasil dikirim ke printer!
                          </div>
                        )}
                      </div>

                      {/* PANDUAN LENGKAP */}
                      <details style={{ background: 'var(--pos-bg-card)', borderRadius: '16px', border: '1px solid var(--pos-border)', padding: '20px' }}>
                        <summary style={{ cursor: 'pointer', fontWeight: '900', color: '#94a3b8', fontSize: '0.88rem', userSelect: 'none' }}>
                          Panduan Lengkap Koneksi Printer Bluetooth
                        </summary>
                        <div style={{ marginTop: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          {[
                            { step: '1', title: 'Nyalakan printer thermal Anda', desc: 'Pastikan printer menyala dan lampu indikator Bluetooth berkedip (tanda siap pair).' },
                            { step: '2', title: 'Pair di Pengaturan Android', desc: 'Buka Pengaturan → Bluetooth → Tambah Perangkat Baru → pilih nama printer (biasanya: RPP02N, PTP-II, Star, Epson TM-series, dll).' },
                            { step: '3', title: 'Kembali ke sini dan Scan', desc: 'Tekan tombol "Scan Ulang". Printer yang sudah di-pair akan muncul di daftar perangkat.' },
                            { step: '4', title: 'Pilih printer dan Cek Koneksi', desc: 'Klik nama printer lalu tekan tombol "Cek" untuk memastikan printer merespon. Status akan menjadi Online.' },
                            { step: '5', title: 'Tes Cetak', desc: 'Tekan "Kirim Struk Tes" untuk memverifikasi format cetak dan koneksi benar-benar berfungsi.' },
                          ].map(({ step, title, desc }) => (
                            <div key={step} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                              <div style={{
                                width: '26px', height: '26px', borderRadius: '8px', flexShrink: 0,
                                background: 'rgba(99,102,241,0.2)', border: '1px solid #6366f1',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                color: '#818cf8', fontWeight: '900', fontSize: '0.80rem'
                              }}>{step}</div>
                              <div>
                                <div style={{ color: '#ffffff', fontWeight: '800', fontSize: '0.84rem' }}>{title}</div>
                                <div style={{ color: '#64748b', fontSize: '0.76rem', marginTop: '2px', lineHeight: '1.5' }}>{desc}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </details>

                    </div>
                  );
                })()}

                {settingSubTab === 'sistem' && (
                  <div style={{ maxWidth: '750px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <h2 style={{ fontSize: '1.4rem', fontWeight: '900', color: 'var(--pos-txt-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <Sliders size={26} color="#818cf8" />
                          <span>Pengaturan Sistem & Koneksi Database</span>
                        </h2>
                        <p style={{ fontSize: '0.80rem', color: 'var(--pos-txt-secondary)', marginTop: '4px' }}>
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
                    <div style={{ background: 'var(--pos-bg-card)', padding: '20px', borderRadius: '16px', border: '1px solid var(--pos-border)' }}>
                      <h3 style={{ fontSize: '1rem', fontWeight: '800', color: 'var(--pos-txt-primary)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Store size={18} color="#fbbf24" />
                        <span>Mode Koneksi Jaringan (Server / Client)</span>
                      </h3>
                      <p style={{ fontSize: '0.78rem', color: 'var(--pos-txt-secondary)', marginBottom: '16px' }}>
                        Tentukan peran perangkat Mobile APK dalam jaringan lokal restoran.
                      </p>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                        {/* MODE SERVER */}
                        <div
                          onClick={() => setConnectionMode('server')}
                          style={{
                            background: connectionMode === 'server' ? 'rgba(251, 191, 36, 0.15)' : 'var(--pos-bg-app)',
                            border: '2px solid',
                            borderColor: connectionMode === 'server' ? '#fbbf24' : 'var(--pos-border-card)',
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
                              Mode Server (Primary Node)
                            </span>
                            <input
                              type="radio"
                              name="connModeRadio"
                              checked={connectionMode === 'server'}
                              onChange={() => {}}
                              style={{ accentColor: '#fbbf24', width: '18px', height: '18px' }}
                            />
                          </div>
                          <p style={{ fontSize: '0.76rem', color: 'var(--pos-txt-secondary)', margin: 0, lineHeight: '1.4' }}>
                            Bertindak sebagai Server Utama lokal yang menyimpan seluruh database transaksi dan terhubung langsung ke Web Admin.
                          </p>
                        </div>

                        {/* MODE CLIENT */}
                        <div
                          onClick={() => setConnectionMode('client')}
                          style={{
                            background: connectionMode === 'client' ? 'rgba(99, 102, 241, 0.15)' : 'var(--pos-bg-app)',
                            border: '2px solid',
                            borderColor: connectionMode === 'client' ? '#6366f1' : 'var(--pos-border-card)',
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
                              Mode Client (POS Terminal Slave)
                            </span>
                            <input
                              type="radio"
                              name="connModeRadio"
                              checked={connectionMode === 'client'}
                              onChange={() => {}}
                              style={{ accentColor: '#6366f1', width: '18px', height: '18px' }}
                            />
                          </div>
                          <p style={{ fontSize: '0.76rem', color: 'var(--pos-txt-secondary)', margin: 0, lineHeight: '1.4' }}>
                            Bertindak sebagai Terminal Kasir tambahan yang mengirimkan transaksi ke IP Server Utama lokal.
                          </p>
                        </div>
                      </div>

                      {/* INPUT IP SERVER JIKA MODE CLIENT */}
                      {connectionMode === 'client' && (
                        <div style={{ marginTop: '16px', background: 'var(--pos-bg-app)', padding: '14px 18px', borderRadius: '12px', border: '1px solid var(--pos-border-card)', display: 'flex', alignItems: 'center', gap: '14px' }}>
                          <label style={{ fontSize: '0.84rem', fontWeight: '800', color: 'var(--pos-txt-primary)', whiteSpace: 'nowrap' }}>
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
                    <div style={{ background: 'var(--pos-bg-card)', padding: '20px', borderRadius: '16px', border: '1px solid var(--pos-border)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
                        <div>
                          <h3 style={{ fontSize: '1rem', fontWeight: '800', color: 'var(--pos-txt-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <RefreshCw size={18} color="#38bdf8" className={isSyncingNow ? 'animate-spin' : ''} />
                            <span>Sinkronisasi Data Offline & Web Admin</span>
                          </h3>
                          <p style={{ fontSize: '0.78rem', color: 'var(--pos-txt-secondary)', marginTop: '4px' }}>
                            Perbarui status transaksi, persediaan stok opname, dan SOP secara real-time dengan database pusat.
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={handleTriggerSyncData}
                          disabled={isSyncingNow}
                          style={{
                            padding: '10px 20px',
                            background: isSyncingNow ? 'var(--pos-border-card)' : 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                            color: 'var(--pos-txt-primary)',
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
                          <span>{isSyncingNow ? 'Menyinkronkan...' : 'Sinkronkan Sekarang'}</span>
                        </button>
                      </div>

                      {/* KETERANGAN WAKTU TERAKHIR SINKRON */}
                      <div style={{ background: 'var(--pos-bg-app)', padding: '14px 18px', borderRadius: '12px', border: '1px solid rgba(56,189,248,0.2)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.82rem', fontWeight: '800', color: '#34d399', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#34d399', display: 'inline-block' }}></span>
                            <span>Terakhir Sinkronisasi:</span>
                          </span>
                          <span style={{ fontSize: '0.86rem', fontWeight: '900', color: 'var(--pos-txt-primary)', background: 'rgba(255,255,255,0.06)', padding: '4px 12px', borderRadius: '8px' }}>
                            {lastSyncTime}
                          </span>
                        </div>

                        <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '8px', fontSize: '0.76rem', color: 'var(--pos-txt-secondary)', lineHeight: '1.4' }}>
                          ℹ<strong>Mode Ketahanan Listrik / Off-Line:</strong> Apabila jaringan listrik/internet mati, seluruh transaksi kasir tetap tersimpan aman di memori tablet. Saat jaringan kembali normal, sistem akan <strong>secara otomatis tersambung dan meng-update server setiap 3 menit</strong>.
                        </div>
                      </div>

                      {/* TOGGLE AUTO SYNC 3 MENIT */}
                      <div style={{ marginTop: '14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--pos-bg-app)', padding: '12px 16px', borderRadius: '12px' }}>
                        <div style={{ fontSize: '0.84rem', fontWeight: '800', color: 'var(--pos-txt-primary)' }}>
                          Auto-Sync Otomatis Setiap 3 Menit (Latar Belakang)
                        </div>
                        <div
                          onClick={() => setAutoSyncIntervalActive(!autoSyncIntervalActive)}
                          style={{ width: '48px', height: '26px', borderRadius: '13px', background: autoSyncIntervalActive ? '#34d399' : 'var(--pos-border-card)', padding: '3px', transition: 'all 0.2s ease', display: 'flex', alignItems: 'center', cursor: 'pointer' }}
                        >
                          <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: '#ffffff', transform: autoSyncIntervalActive ? 'translateX(22px)' : 'translateX(0px)', transition: 'transform 0.2s ease' }}></div>
                        </div>
                      </div>
                    </div>

                    {/* SECTION 3: BACKUP (MANUAL) & RESTORE DATA OFFLINE (KHUSUS SUPER ADMIN) */}
                    <div style={{ background: 'var(--pos-bg-card)', padding: '20px', borderRadius: '16px', border: '1px solid var(--pos-border)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                        <h3 style={{ fontSize: '1rem', fontWeight: '800', color: 'var(--pos-txt-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Save size={20} color="#c084fc" />
                          <span>Cadangan & Pemulihan Data Offline (Backup & Restore)</span>
                        </h3>
                      </div>

                      <p style={{ fontSize: '0.78rem', color: 'var(--pos-txt-secondary)', marginBottom: '14px', lineHeight: '1.4' }}>
                        <strong>Backup Data:</strong> Dapat diunduh manual kapan saja oleh Kasir. <br />
                        <strong>Restore Data:</strong> Wajib otorisasi PIN khusus <strong>Super Admin</strong> dan akan langsung terhubung ke Server Utama.
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
                          <span>Backup Data Offline (.json)</span>
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
                            <span>Restore Data (Super Admin)</span>
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* SECTION 4: CASH DRAWER */}
                    <div style={{ background: 'var(--pos-bg-card)', padding: '20px', borderRadius: '16px', border: '1px solid var(--pos-border)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      <div
                        onClick={() => setAutoOpenCashDrawer(!autoOpenCashDrawer)}
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
                      >
                        <div>
                          <div style={{ fontSize: '0.92rem', fontWeight: '800', color: 'var(--pos-txt-primary)' }}>
                            Buka Laci Kasir (Cash Drawer) Otomatis
                          </div>
                          <div style={{ fontSize: '0.78rem', color: 'var(--pos-txt-secondary)', marginTop: '2px' }}>
                            Kirim sinyal kick-out ke laci kasir saat pembayaran tunai berhasil.
                          </div>
                        </div>
                        <div style={{ width: '48px', height: '26px', borderRadius: '13px', background: autoOpenCashDrawer ? '#34d399' : 'var(--pos-border-card)', padding: '3px', transition: 'all 0.2s ease', display: 'flex', alignItems: 'center' }}>
                          <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: '#ffffff', transform: autoOpenCashDrawer ? 'translateX(22px)' : 'translateX(0px)', transition: 'transform 0.2s ease' }}></div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* SUB-TAB 4: AKUN */}
                {settingSubTab === 'akun' && (
                  <div style={{ maxWidth: '650px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    <h2 style={{ fontSize: '1.4rem', fontWeight: '900', color: 'var(--pos-txt-primary)', margin: 0 }}>
                      Profil & Pengaturan Akun Kasir
                    </h2>

                    <div style={{ background: 'var(--pos-bg-card)', padding: '20px', borderRadius: '16px', border: '1px solid var(--pos-border)', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                        <div style={{ width: '50px', height: '50px', borderRadius: '50%', background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900', color: 'var(--pos-txt-white)', fontSize: '1.2rem' }}>
                          K
                        </div>
                        <div>
                          <div style={{ fontSize: '1.05rem', fontWeight: '900', color: 'var(--pos-txt-primary)' }}>Kasir Utama Shift 1</div>
                          <div style={{ fontSize: '0.78rem', color: 'var(--pos-txt-secondary)' }}>Outlet: {currentOutlet.name} • Role: Kasir / Staf Operasional</div>
                        </div>
                      </div>

                      <div style={{ borderTop: '1px solid var(--pos-border)', paddingTop: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <label style={{ fontSize: '0.82rem', color: 'var(--pos-txt-secondary)', fontWeight: '700' }}>PIN Kasir Saat Ini</label>
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', background: 'var(--pos-bg-card)', padding: '16px 20px', borderRadius: '16px', border: '1px solid var(--pos-border)' }}>
              <div>
                <h2 style={{ fontSize: '1.3rem', fontWeight: '900', color: 'var(--pos-txt-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Grid size={24} color="#6366f1" />
                  <span>Menu Lain-lain (Reservasi & SOP Operasional)</span>
                </h2>
                <p style={{ fontSize: '0.80rem', color: 'var(--pos-txt-secondary)', margin: '4px 0 0 0' }}>
                  {currentOutlet.name} • Kelola Booking Meja Pelanggan & Panduan Standar Operasional Prosedur (SOP)
                </p>
              </div>

              {/* SUB-TAB NAVIGATION BUTTONS */}
              <div style={{ display: 'flex', background: 'var(--pos-bg-app)', padding: '4px', borderRadius: '12px', border: '1px solid var(--pos-border-card)' }}>
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
                  <span>Reservasi Meja</span>
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
                  <span>Standar SOP Restoran</span>
                </button>
              </div>
            </div>

            {/* SUB-VIEW 1: RESERVASI MEJA */}
            {lainLainSubTab === 'reservasi' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                
                {/* SUMMARY STATS BAR */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
                  <div style={{ background: 'var(--pos-bg-card)', padding: '16px', borderRadius: '14px', border: '1px solid var(--pos-border)' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--pos-txt-secondary)', fontWeight: '700' }}>TOTAL RESERVASI</div>
                    <div style={{ fontSize: '1.3rem', fontWeight: '900', color: 'var(--pos-txt-primary)', marginTop: '4px' }}>
                      {reservationsList.length} Booking
                    </div>
                  </div>
                  <div style={{ background: 'var(--pos-bg-card)', padding: '16px', borderRadius: '14px', border: '1px solid var(--pos-border)' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--pos-txt-secondary)', fontWeight: '700' }}>DISETUJUI / CONFIRMED</div>
                    <div style={{ fontSize: '1.3rem', fontWeight: '900', color: '#34d399', marginTop: '4px' }}>
                      {reservationsList.filter(r => r.status === 'confirmed').length} Reservasi
                    </div>
                  </div>
                  <div style={{ background: 'var(--pos-bg-card)', padding: '16px', borderRadius: '14px', border: '1px solid var(--pos-border)' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--pos-txt-secondary)', fontWeight: '700' }}>MENUNGGU KONFIRMASI</div>
                    <div style={{ fontSize: '1.3rem', fontWeight: '900', color: '#fbbf24', marginTop: '4px' }}>
                      {reservationsList.filter(r => r.status === 'pending').length} Reservasi
                    </div>
                  </div>
                  <div style={{ background: 'var(--pos-bg-card)', padding: '16px', borderRadius: '14px', border: '1px solid var(--pos-border)' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--pos-txt-secondary)', fontWeight: '700' }}>SELESAI / SEATED</div>
                    <div style={{ fontSize: '1.3rem', fontWeight: '900', color: '#38bdf8', marginTop: '4px' }}>
                      {reservationsList.filter(r => r.status === 'completed').length} Reservasi
                    </div>
                  </div>
                </div>

                {/* TABLE CARD CONTAINER & HEADER ACTION */}
                <div style={{ background: 'var(--pos-bg-card)', padding: '20px', borderRadius: '16px', border: '1px solid var(--pos-border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: '900', color: 'var(--pos-txt-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Calendar size={18} color="#6366f1" />
                      <span>Daftar Reservasi Meja & Booking Pelanggan</span>
                    </h3>
                    <button
                      type="button"
                      onClick={() => setShowAddReservationModal(true)}
                      style={{ padding: '8px 16px', background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)', color: 'var(--pos-txt-white)', border: 'none', borderRadius: '10px', fontWeight: '800', fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                      <Plus size={16} />
                      <span>+ Buat Reservasi Baru</span>
                    </button>
                  </div>

                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.80rem' }}>
                      <thead>
                        <tr style={{ background: 'var(--pos-bg-app)', color: 'var(--pos-txt-secondary)', textAlign: 'left' }}>
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
                            <td colSpan={9} style={{ padding: '30px', textAlign: 'center', color: 'var(--pos-txt-secondary)' }}>
                              Belum ada data reservasi meja untuk outlet ini.
                            </td>
                          </tr>
                        ) : (
                          reservationsList.map((rsv, idx) => {
                            const statusBg = rsv.status === 'confirmed' ? 'rgba(52, 211, 153, 0.15)' : rsv.status === 'pending' ? 'rgba(251, 191, 36, 0.15)' : rsv.status === 'completed' ? 'rgba(56, 189, 248, 0.15)' : 'rgba(244, 63, 94, 0.15)';
                            const statusColor = rsv.status === 'confirmed' ? '#34d399' : rsv.status === 'pending' ? '#fbbf24' : rsv.status === 'completed' ? '#38bdf8' : '#f43f5e';
                            const statusLabel = rsv.status === 'confirmed' ? 'CONFIRMED' : rsv.status === 'pending' ? 'PENDING' : rsv.status === 'completed' ? 'SELESAI' : 'BATAL';

                            return (
                              <tr key={rsv.id || idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', color: 'var(--pos-txt-primary)' }}>
                                <td style={{ padding: '12px 10px', color: 'var(--pos-txt-secondary)', fontWeight: '700' }}>
                                  <div>{rsv.date}</div>
                                  <div style={{ fontSize: '0.70rem', color: '#6366f1' }}>{rsv.time}</div>
                                </td>
                                <td style={{ padding: '12px 10px', fontWeight: '900', color: '#38bdf8' }}>{rsv.id}</td>
                                <td style={{ padding: '12px 10px', fontWeight: '800', color: 'var(--pos-txt-primary)' }}>{rsv.customer_name}</td>
                                <td style={{ padding: '12px 10px', color: 'var(--pos-txt-secondary)' }}>{rsv.phone}</td>
                                <td style={{ padding: '12px 10px', textAlign: 'center', fontWeight: '900', color: '#a78bfa' }}>{rsv.pax_count} Pax</td>
                                <td style={{ padding: '12px 10px', fontWeight: '800', color: '#34d399' }}>{rsv.table_no}</td>
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
                                    Detail
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
                <div style={{ background: 'var(--pos-bg-card)', padding: '16px 20px', borderRadius: '16px', border: '1px solid var(--pos-border)', display: 'flex', flexWrap: 'wrap', gap: '14px', justifyContent: 'space-between', alignItems: 'center' }}>
                  
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
                        background: 'var(--pos-bg-app)',
                        border: '1px solid var(--pos-border-card)',
                        borderRadius: '10px',
                        color: 'var(--pos-txt-primary)',
                        fontSize: '0.82rem'
                      }}
                    />
                  </div>

                  {/* CATEGORY BUTTONS */}
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {[
                      { id: 'all', label: 'Semua SOP' },
                      { id: 'opening', label: 'Opening' },
                      { id: 'kasir', label: 'Kasir' },
                      { id: 'kebersihan', label: 'Kebersihan' },
                      { id: 'komplain', label: 'Komplain' },
                      { id: 'closing', label: 'Closing' },
                      { id: 'stok', label: 'Stok Opname' }
                    ].map(cat => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setSopCategoryFilter(cat.id)}
                        style={{
                          padding: '6px 12px',
                          borderRadius: '8px',
                          border: '1px solid',
                          borderColor: sopCategoryFilter === cat.id ? '#34d399' : 'var(--pos-border-card)',
                          background: sopCategoryFilter === cat.id ? 'rgba(52, 211, 153, 0.15)' : 'var(--pos-bg-app)',
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
                          background: 'var(--pos-bg-card)',
                          borderRadius: '16px',
                          padding: '20px',
                          border: '1px solid var(--pos-border)',
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
                            <span style={{ fontSize: '0.70rem', color: 'var(--pos-txt-secondary)', fontWeight: '700' }}>
                              {doc.estimatedTime}
                            </span>
                          </div>

                          <h3 style={{ fontSize: '1rem', fontWeight: '900', color: 'var(--pos-txt-primary)', margin: '0 0 8px 0', lineHeight: '1.3' }}>
                            {doc.title}
                          </h3>

                          <p style={{ fontSize: '0.78rem', color: 'var(--pos-txt-secondary)', margin: 0, lineHeight: '1.4' }}>
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
                            style={{ padding: '6px 14px', background: 'linear-gradient(135deg, #34d399 0%, #059669 100%)', color: 'var(--pos-txt-white)', border: 'none', borderRadius: '8px', fontSize: '0.76rem', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
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
          <div className="glass-card animate-fade-in" style={{ width: '100%', maxWidth: '820px', maxHeight: '88vh', padding: '24px', background: 'var(--pos-bg-card)', borderRadius: '20px', display: 'flex', flexDirection: 'column' }}>
            
            {/* MODAL HEADER */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: '900', color: 'var(--pos-txt-primary)', display: 'flex', alignItems: 'center', gap: '10px', margin: 0 }}>
                  <Grid size={24} color="#6366f1" />
                  <span>Papan Pemetaan Meja Restoran (Table Floor Map)</span>
                </h3>
                <p style={{ fontSize: '0.82rem', color: 'var(--pos-txt-secondary)', margin: '4px 0 0 0' }}>
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
            <div style={{ display: 'flex', gap: '20px', marginBottom: '16px', background: 'var(--pos-bg-app)', padding: '12px 16px', borderRadius: '12px', fontSize: '0.82rem', border: '1px solid var(--pos-border-card)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#10b981', display: 'inline-block' }}></span>
                <span style={{ color: '#34d399', fontWeight: '800' }}>KOSONG / TERSEDIA</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#f43f5e', display: 'inline-block' }}></span>
                <span style={{ color: '#fb7185', fontWeight: '800' }}>TERISI (Pesanan Gantung / Belum Dibayar)</span>
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
                      background: isOccupied ? 'rgba(244,63,94,0.12)' : (isSelected ? 'rgba(99,102,241,0.2)' : 'var(--pos-bg-app)'),
                      border: '2px solid',
                      borderColor: isOccupied ? '#f43f5e' : (isSelected ? '#6366f1' : 'var(--pos-border-card)'),
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
                        <span style={{ fontSize: '1.1rem', fontWeight: '900', color: 'var(--pos-txt-primary)', letterSpacing: '0.3px' }}>
                          {tbl.number}
                        </span>
                        <span style={{ fontSize: '0.75rem', padding: '3px 8px', borderRadius: '6px', background: 'var(--pos-bg-card)', color: 'var(--pos-txt-secondary)', fontWeight: '700', border: '1px solid var(--pos-border-card)' }}>
                          {tbl.seats} Kursi
                        </span>
                      </div>

                      {/* STATUS BADGE TEXT */}
                      <div style={{ fontSize: '0.8rem', fontWeight: '800', color: isOccupied ? '#fb7185' : '#34d399', marginBottom: '10px' }}>
                        {isOccupied ? 'TERISI (Belum Bayar)' : 'KOSONG (Tersedia)'}
                      </div>

                      {/* OCCUPIED DETAILS BOX */}
                      {isOccupied && tbl.pendingOrder && (
                        <div style={{ background: 'var(--pos-bg-card)', padding: '8px 10px', borderRadius: '10px', fontSize: '0.78rem', border: '1px dashed rgba(244,63,94,0.5)', marginBottom: '10px' }}>
                          <div style={{ color: 'var(--pos-txt-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            Pelanggan: <strong style={{ color: 'var(--pos-txt-primary)' }}>{tbl.pendingOrder.customerName || 'Pelanggan Umum'}</strong>
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
                          color: 'var(--pos-txt-primary)',
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
                        <span>BAYAR ({formatRupiah(tbl.pendingOrder?.totalAmount)})</span>
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
                          color: 'var(--pos-txt-primary)',
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
                        <span>{isSelected ? 'MEJA TERPILIH' : 'PILIH MEJA INI'}</span>
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
          <div className="glass-card animate-fade-in" style={{ width: '100%', maxWidth: '420px', padding: '24px', background: 'var(--pos-bg-card)', textAlign: 'center' }}>
            
            {/* ICON & HEADER TITLE */}
            {(lastCompletedTx.isContohTagihan || lastCompletedTx.id?.startsWith('BILL') || lastCompletedTx.id?.startsWith('HOLD')) ? (
              <>
                <FileText size={48} color="#38bdf8" style={{ marginBottom: '10px' }} />
                <h3 style={{ fontSize: '1.2rem', fontWeight: '900', color: 'var(--pos-txt-primary)', marginBottom: '4px' }}>
                  CONTOH TAGIHAN SEMENTARA
                </h3>
                <p style={{ fontSize: '0.78rem', color: 'var(--pos-txt-secondary)', marginBottom: '16px' }}>
                  Informasi Tagihan Meja: <strong style={{ color: '#38bdf8' }}>{lastCompletedTx.id}</strong>
                </p>
              </>
            ) : (
              <>
                <CheckCircle2 size={48} color="#34d399" style={{ marginBottom: '10px' }} />
                <h3 style={{ fontSize: '1.2rem', fontWeight: '900', color: 'var(--pos-txt-primary)', marginBottom: '4px' }}>
                  TRANSAKSI BERHASIL!
                </h3>
                <p style={{ fontSize: '0.78rem', color: 'var(--pos-txt-secondary)', marginBottom: '16px' }}>
                  No. Struk: <strong style={{ color: '#818cf8' }}>{lastCompletedTx.id}</strong>
                </p>
              </>
            )}

            {/* RECEIPT BOX */}
            <div style={{ background: 'var(--pos-bg-app)', padding: '14px', borderRadius: '12px', border: '1px dashed #38bdf8', textAlign: 'left', marginBottom: '20px', fontSize: '0.78rem' }}>
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
                  {(lastCompletedTx.isContohTagihan || lastCompletedTx.id?.startsWith('BILL') || lastCompletedTx.id?.startsWith('HOLD')) ? 'BELUM DIBAYAR' : 'LUNAS'}
                </span>
              </div>
              <div style={{ color: 'var(--pos-txt-secondary)', marginTop: '4px' }}>Waktu: {lastCompletedTx.date} {lastCompletedTx.time}</div>
              <div style={{ color: 'var(--pos-txt-secondary)' }}>Tipe: {lastCompletedTx.order_type} ({lastCompletedTx.table_number})</div>
              <div style={{ color: 'var(--pos-txt-secondary)' }}>Pelanggan: {lastCompletedTx.customer_name || 'Pelanggan Umum'}</div>
              <div style={{ color: 'var(--pos-txt-secondary)' }}>Metode: {lastCompletedTx.payment_method}</div>
              <hr style={{ borderColor: 'rgba(255,255,255,0.1)', margin: '8px 0' }} />
              {lastCompletedTx.items.map((it, idx) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--pos-txt-primary)', margin: '3px 0' }}>
                  <span>{it.qty}x {it.name}</span>
                  <span>{formatRupiah((it.price || it.price_unit || 0) * it.qty)}</span>
                </div>
              ))}
              <hr style={{ borderColor: 'rgba(255,255,255,0.1)', margin: '8px 0' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: '900', color: '#34d399', fontSize: '0.9rem' }}>
                <span>TOTAL TAGIHAN</span>
                <span>{formatRupiah(lastCompletedTx.amount)}</span>
              </div>
              {!(lastCompletedTx.isContohTagihan || lastCompletedTx.id?.startsWith('BILL') || lastCompletedTx.id?.startsWith('HOLD')) && (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--pos-txt-primary)', fontSize: '0.82rem', marginTop: '6px' }}>
                    <span>Bayar / Tunai:</span>
                    <strong style={{ color: '#38bdf8' }}>
                      {formatRupiah(
                        lastCompletedTx.paid_amount !== undefined && lastCompletedTx.paid_amount !== null ? lastCompletedTx.paid_amount :
                        lastCompletedTx.cash_paid !== undefined && lastCompletedTx.cash_paid !== null ? lastCompletedTx.cash_paid :
                        lastCompletedTx.tendered !== undefined && lastCompletedTx.tendered !== null ? lastCompletedTx.tendered :
                        lastCompletedTx.amount || 0
                      )}
                    </strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--pos-txt-primary)', fontSize: '0.88rem', fontWeight: '800', marginTop: '3px' }}>
                    <span>Kembalian:</span>
                    <strong style={{ color: '#34d399' }}>
                      {formatRupiah(
                        lastCompletedTx.change_amount !== undefined && lastCompletedTx.change_amount !== null ? lastCompletedTx.change_amount :
                        lastCompletedTx.kembalian !== undefined && lastCompletedTx.kembalian !== null ? lastCompletedTx.kembalian :
                        Math.max(0, (lastCompletedTx.paid_amount || lastCompletedTx.cash_paid || lastCompletedTx.amount || 0) - (lastCompletedTx.amount || 0))
                      )}
                    </strong>
                  </div>
                </>
              )}

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
                  Struk ini hanya sebagai informasi tagihan BUKAN BUKTI PEMBAYARAN. Apabila kasir memberikan struk ini dan anda melakukan pembayaran, maka anda berhak mendapatkan 1 juta rupiah langsung dari kasir
                </div>
              )}
            </div>

            {/* ACTION BUTTONS */}
            {/* PRINTER STATUS BANNER — tampilkan di modal struk sebelum tombol cetak */}
            {renderPrinterStatusBanner()}
            {(lastCompletedTx.isContohTagihan || lastCompletedTx.id?.startsWith('BILL') || lastCompletedTx.id?.startsWith('HOLD')) ? (
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={() => handleExecuteBatchPrint(lastCompletedTx, { printKitchen: false, printBar: false, printTableCopy: true, printCashierCopy: false })}
                  className="btn-primary"
                  style={{ flex: 1, justifyContent: 'center', height: '42px', fontSize: '0.82rem', fontWeight: '900' }}
                >
                  <Printer size={16} />
                  <span>Cetak Struk</span>
                </button>
                <button
                  onClick={() => setShowReceiptModal(false)}
                  className="btn-secondary"
                  style={{ flex: 1, justifyContent: 'center', height: '42px', fontSize: '0.82rem', fontWeight: '800' }}
                >
                  <span>Cancel</span>
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

      {/* 5.B MODAL TUTUP SHIFT KASIR & HITUNG DENOMINASI UANG FISIK LACI */}
      {showShiftClosingModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 130, padding: '16px' }}>
          <div className="glass-card animate-fade-in" style={{ width: '100%', maxWidth: '640px', maxHeight: '90vh', overflowY: 'auto', padding: '24px', background: 'var(--pos-bg-card)', borderRadius: '20px', border: '1px solid var(--pos-border)' }}>
            
            {/* Header Modal */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--pos-border)', paddingBottom: '14px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ padding: '8px', borderRadius: '10px', background: 'rgba(239, 68, 68, 0.2)', border: '1px solid rgba(239, 68, 68, 0.4)' }}>
                  <Clock size={22} color="#ef4444" />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: '900', color: 'var(--pos-txt-primary)', margin: 0 }}>
                    Rekonsiliasi Tutup Shift Kasir
                  </h3>
                  <p style={{ fontSize: '0.76rem', color: 'var(--pos-txt-secondary)', margin: '2px 0 0 0' }}>
                    {currentOutlet.name} • Kasir: {currentUserSession?.name || userSession?.name || 'Kasir'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowShiftClosingModal(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--pos-txt-secondary)', fontSize: '1.2rem', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            {/* 1. Ringkasan Penjualan Shift */}
            <div style={{ background: 'var(--pos-bg-app)', padding: '16px', borderRadius: '14px', border: '1px solid var(--pos-border-card)', marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: '800', color: '#38bdf8', textTransform: 'uppercase' }}>
                  📊 Ringkasan Penjualan Shift Hari Ini
                </div>
                {offlineQueueCount > 0 && (
                  <span style={{ fontSize: '0.72rem', background: 'rgba(245, 158, 11, 0.2)', color: '#f59e0b', border: '1px solid rgba(245, 158, 11, 0.4)', padding: '2px 8px', borderRadius: '6px', fontWeight: '700' }}>
                    ⚡ {offlineQueueCount} Transaksi Offline Termasuk
                  </span>
                )}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', fontSize: '0.8rem' }}>
                <div>Total Struk Shift: <strong>{shiftTodayTransactions.length} Struk</strong></div>
                <div>Total Penjualan Shift: <strong style={{ color: '#34d399' }}>{formatRupiah(shiftTodaySalesGross)}</strong></div>
                <div>Penjualan Tunai (Cash): <strong style={{ color: '#f59e0b' }}>{formatRupiah(shiftTodayCashSales)}</strong></div>
                <div>Non-Tunai (QRIS/EDC): <strong>{formatRupiah(shiftTodayNonCashSales)}</strong></div>
                <div>Pengeluaran Kas Kecil: <strong style={{ color: '#ef4444' }}>- {formatRupiah(totalPettyExpense)}</strong></div>
                <div>Modal Awal (Float): <strong>{formatRupiah(initialCash || 0)}</strong></div>
              </div>
              <hr style={{ borderColor: 'rgba(255,255,255,0.08)', margin: '10px 0' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.92rem', fontWeight: '900' }}>
                <span>TARGET UANG TUNAI DI LACI:</span>
                <span style={{ color: '#38bdf8' }}>{formatRupiah(expectedCashInDrawer)}</span>
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--pos-txt-secondary)', marginTop: '4px', textAlign: 'right' }}>
                (Rumus Fisik: Modal Awal + Penjualan Tunai - Kas Kecil)
              </div>
            </div>

            {/* 2. Hitung Fisik Pecahan Uang (Denominasi) */}
            <div style={{ background: 'var(--pos-bg-app)', padding: '16px', borderRadius: '14px', border: '1px solid var(--pos-border-card)', marginBottom: '16px' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: '800', color: '#f59e0b', marginBottom: '10px', textTransform: 'uppercase' }}>
                💵 Kalkulator Uang Fisik di Laci (Ketik Jumlah Lembar)
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
                {[
                  { denom: 100000, label: 'Rp 100.000' },
                  { denom: 50000, label: 'Rp 50.000' },
                  { denom: 20000, label: 'Rp 20.000' },
                  { denom: 10000, label: 'Rp 10.000' },
                  { denom: 5000, label: 'Rp 5.000' },
                  { denom: 2000, label: 'Rp 2.000' },
                  { denom: 1000, label: 'Rp 1.000' },
                ].map(({ denom, label }) => {
                  const cnt = Number(shiftDenominations[denom] || 0);
                  const sub = denom * cnt;
                  return (
                    <div key={denom} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--pos-bg-card)', padding: '6px 10px', borderRadius: '8px', border: '1px solid var(--pos-border-card)' }}>
                      <span style={{ fontSize: '0.76rem', fontWeight: '700', width: '75px' }}>{label}</span>
                      <span style={{ color: 'var(--pos-txt-secondary)', fontSize: '0.72rem' }}>x</span>
                      <input
                        type="number"
                        min="0"
                        placeholder="0"
                        value={shiftDenominations[denom] || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          setShiftDenominations(prev => ({ ...prev, [denom]: val }));
                        }}
                        style={{ width: '45px', padding: '4px', textAlign: 'center', background: 'var(--pos-bg-app)', border: '1px solid var(--pos-border-card)', borderRadius: '6px', color: 'var(--pos-txt-primary)', fontSize: '0.8rem', outline: 'none' }}
                      />
                      <span style={{ fontSize: '0.74rem', color: '#34d399', fontWeight: '800', flex: 1, textAlign: 'right' }}>
                        {cnt > 0 ? formatRupiah(sub) : '-'}
                      </span>
                    </div>
                  );
                })}

                {/* Koin / Logam */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--pos-bg-card)', padding: '6px 10px', borderRadius: '8px', border: '1px solid var(--pos-border-card)' }}>
                  <span style={{ fontSize: '0.76rem', fontWeight: '700', width: '75px' }}>Koin (Rp)</span>
                  <span style={{ color: 'var(--pos-txt-secondary)', fontSize: '0.72rem' }}>=</span>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={shiftDenominations.coin || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      setShiftDenominations(prev => ({ ...prev, coin: val }));
                    }}
                    style={{ flex: 1, padding: '4px 8px', textAlign: 'right', background: 'var(--pos-bg-app)', border: '1px solid var(--pos-border-card)', borderRadius: '6px', color: 'var(--pos-txt-primary)', fontSize: '0.8rem', outline: 'none' }}
                  />
                </div>
              </div>

              {/* Status Selisih Live */}
              <div style={{ marginTop: '14px', padding: '12px', borderRadius: '10px', background: 'var(--pos-bg-card)', border: '1px solid var(--pos-border-card)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--pos-txt-secondary)' }}>TOTAL FISIK UANG DI LACI:</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: '900', color: 'var(--pos-txt-primary)' }}>
                    {formatRupiah(physicalCashCalculated)}
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--pos-txt-secondary)' }}>STATUS SELISIH (VARIANCE):</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: '900', color: (physicalCashCalculated - expectedCashInDrawer) === 0 ? '#10b981' : (physicalCashCalculated - expectedCashInDrawer) < 0 ? '#ef4444' : '#3b82f6' }}>
                    {(physicalCashCalculated - expectedCashInDrawer) === 0 ? (
                      '✅ PAS (Rp 0)'
                    ) : (physicalCashCalculated - expectedCashInDrawer) < 0 ? (
                      `⚠️ MINUS ${formatRupiah(Math.abs(physicalCashCalculated - expectedCashInDrawer))}`
                    ) : (
                      `➕ SURPLUS ${formatRupiah(physicalCashCalculated - expectedCashInDrawer)}`
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* 3. Catatan Kasir */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '0.76rem', color: 'var(--pos-txt-secondary)', fontWeight: '700', display: 'block', marginBottom: '4px' }}>
                Catatan Kasir / Keterangan Selisih:
              </label>
              <input
                type="text"
                value={shiftCustomNotes}
                onChange={e => setShiftCustomNotes(e.target.value)}
                placeholder="Contoh: Kas pas, uang pecahan 2rb habis diganti permen..."
                style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--pos-border-card)', background: 'var(--pos-bg-app)', color: 'var(--pos-txt-primary)', fontSize: '0.8rem', outline: 'none' }}
              />
            </div>

            {/* 4. Action Buttons */}
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                onClick={handlePrintShiftClosingReceipt}
                className="btn-secondary"
                style={{ flex: 1, padding: '10px', fontSize: '0.82rem', fontWeight: '800', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
              >
                <Printer size={16} />
                <span>Cetak Struk Rekap</span>
              </button>
              <button
                type="button"
                onClick={handleSubmitShiftClosing}
                className="btn-primary"
                style={{ flex: 1.4, padding: '10px', fontSize: '0.84rem', fontWeight: '900', background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
              >
                <CheckCircle2 size={16} />
                <span>Selesaikan Tutup Shift</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* 6. MODAL DETAIL STRUK TRANSACTION HISTORY */}
      {selectedTxDetail && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 120, padding: '16px' }}>
          <div style={{ width: '100%', maxWidth: '440px', padding: '24px', background: T.bgModal || T.bgCard, borderRadius: '20px', border: `1px solid ${T.borderCard}`, boxShadow: '0 20px 60px rgba(0,0,0,0.4)', color: T.txtPrimary }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: '900', color: T.txtPrimary, marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FileText size={20} color="#38bdf8" />
              <span>Detail Struk Nota Transaksi</span>
            </h3>
            
            <div style={{ background: isCalmSage ? '#f3f7f4' : '#0b0f19', padding: '16px', borderRadius: '14px', border: `1px dashed ${T.borderCard}`, fontSize: '0.80rem', marginBottom: '16px' }}>
              <div style={{ fontWeight: '900', color: '#0284c7', fontSize: '0.90rem' }}>{selectedTxDetail.branch_name || currentOutlet.name}</div>
              <div style={{ color: T.txtSecondary, marginTop: '2px', fontWeight: '600' }}>No. Struk: <strong style={{ color: T.txtPrimary }}>{selectedTxDetail.id}</strong></div>
              <div style={{ color: T.txtSecondary, marginTop: '2px', fontWeight: '600' }}>Waktu: <strong style={{ color: T.txtPrimary }}>{selectedTxDetail.date} {selectedTxDetail.time || ''}</strong></div>
              <div style={{ color: T.txtSecondary, marginTop: '2px', fontWeight: '600' }}>Tipe: <strong style={{ color: T.txtPrimary }}>{selectedTxDetail.order_type} ({selectedTxDetail.table_number || 'N/A'})</strong></div>
              <div style={{ color: T.txtSecondary, marginTop: '2px', fontWeight: '600' }}>Metode Bayar: <strong style={{ color: '#10b981' }}>{selectedTxDetail.payment_method}</strong></div>
              <hr style={{ borderColor: T.borderCard, margin: '10px 0' }} />
              {(selectedTxDetail.items || []).map((it, idx) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', color: T.txtPrimary, margin: '6px 0', fontWeight: '600' }}>
                  <span>{it.qty}x {it.name}</span>
                  <span style={{ fontWeight: '800' }}>{formatRupiah(it.amount || it.price_unit * it.qty)}</span>
                </div>
              ))}
              <hr style={{ borderColor: T.borderCard, margin: '10px 0' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: '900', color: '#10b981', fontSize: '1rem' }}>
                <span>TOTAL PEMBAYARAN</span>
                <span>{formatRupiah(selectedTxDetail.amount)}</span>
              </div>
            </div>

            {/* PRINTER STATUS BANNER — modal cetak ulang riwayat transaksi */}
            {renderPrinterStatusBanner()}
            <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
              <button 
                type="button"
                onClick={() => setSelectedTxDetail(null)} 
                style={{ 
                  flex: 1, 
                  padding: '11px', 
                  borderRadius: '10px', 
                  border: `1px solid ${T.borderCard}`, 
                  background: isCalmSage ? '#eaf2ec' : '#1e293b', 
                  color: T.txtPrimary, 
                  fontWeight: '800', 
                  fontSize: '0.84rem', 
                  cursor: 'pointer' 
                }}
              >
                Tutup
              </button>
              <button 
                type="button"
                onClick={() => handlePrintSingleReceipt(selectedTxDetail)} 
                style={{ 
                  flex: 1.4, 
                  padding: '11px', 
                  borderRadius: '10px', 
                  border: 'none', 
                  background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)', 
                  color: '#ffffff', 
                  fontWeight: '900', 
                  fontSize: '0.84rem', 
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  boxShadow: '0 4px 14px rgba(37,99,235,0.35)'
                }}
              >
                <Printer size={16} />
                <span>Cetak Ulang Struk</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. MODAL PENCARIAN NAMA PELANGGAN DATA MASTER */}

      {showCustomerSearchModal && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setShowCustomerSearchModal(false); }}
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(6px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 9999, padding: '12px', boxSizing: 'border-box',
            overflowY: 'auto'
          }}
        >
          <div
            className="glass-card animate-fade-in"
            style={{
              width: '100%', maxWidth: '500px',
              maxHeight: 'min(85vh, 85dvh)',
              height: 'auto',
              margin: '0 auto',
              padding: '20px',
              background: 'var(--pos-bg-card)',
              display: 'flex', flexDirection: 'column',
              borderRadius: '16px',
              boxSizing: 'border-box',
              overflow: 'hidden',
              flexShrink: 0,
            }}
          >
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Users size={22} color="#38bdf8" />
                <h3 style={{ fontSize: '1.1rem', fontWeight: '900', color: 'var(--pos-txt-primary)', margin: 0 }}>Pencarian Nama Pelanggan</h3>
              </div>
              <button onClick={() => setShowCustomerSearchModal(false)} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: 'var(--pos-txt-primary)', padding: '6px', borderRadius: '8px', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            {/* BANNER REGISTRASI MANDIRI MEMBER / QR CODE */}
            <div style={{
              background: 'linear-gradient(135deg, #4f46e5 0%, #3b82f6 100%)',
              borderRadius: '12px',
              padding: '12px 14px',
              display: 'flex',
              alignItems: 'center',
              justify: 'space-between',
              marginBottom: '14px',
              boxShadow: '0 4px 12px rgba(79,70,229,0.3)',
              color: '#ffffff'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <QrCode size={22} color="#ffffff" />
                <div>
                  <div style={{ fontSize: '0.85rem', fontWeight: '900' }}>Registrasi Mandiri Member Pelanggan</div>
                  <div style={{ fontSize: '0.72rem', opacity: 0.9 }}>Minta pelanggan scan QR Code di HP untuk daftar mandiri</div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowCustomerSearchModal(false);
                  setShowQrSelfRegModal(true);
                }}
                style={{
                  padding: '8px 14px',
                  background: '#ffffff',
                  color: '#4f46e5',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: '900',
                  fontSize: '0.78rem',
                  cursor: 'pointer',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
                  whiteSpace: 'nowrap'
                }}
              >
                Buka QR Code
              </button>
            </div>

            {/* REAL-TIME SEARCH FIELD */}
            <div style={{ position: 'relative', marginBottom: '16px' }}>
              <input
                type="text"
                autoFocus
                value={customerSearchQuery}
                onChange={e => setCustomerSearchQuery(e.target.value)}
                placeholder="Ketik nama pelanggan atau No. HP..."
                className="form-input"
                style={{ width: '100%', paddingLeft: '40px', height: '44px', fontSize: '0.9rem', background: 'var(--pos-bg-app)', border: '1px solid #38bdf8' }}
              />
              <Search size={18} color="#38bdf8" style={{ position: 'absolute', left: '14px', top: '13px' }} />
            </div>

            {/* CUSTOMERS LIST CONTAINER */}
            <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', paddingRight: '4px' }}>
              
              {/* DEFAULT OPTION: PELANGGAN UMUM */}
              <div
                onClick={() => {
                  setSelectedCustomer('Pelanggan Umum');
                  setShowCustomerSearchModal(false);
                }}
                style={{
                  background: selectedCustomer === 'Pelanggan Umum' ? 'rgba(56,189,248,0.15)' : 'var(--pos-bg-app)',
                  border: '1px solid',
                  borderColor: selectedCustomer === 'Pelanggan Umum' ? '#38bdf8' : 'var(--pos-border-card)',
                  padding: '12px 14px',
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: 'var(--pos-border-card)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <User size={20} color="#94a3b8" />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.88rem', fontWeight: '800', color: 'var(--pos-txt-primary)' }}>Pelanggan Umum (Guest)</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--pos-txt-secondary)' }}>Kategori: Tamu / Tanpa Registrasi</div>
                  </div>
                </div>
                <button style={{ background: '#38bdf8', color: 'var(--pos-bg-app)', border: 'none', padding: '6px 12px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: '900' }}>
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
                        <button style={{ background: '#10b981', color: 'var(--pos-txt-white)', border: 'none', padding: '6px 14px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: '900' }}>
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
                            background: isCur ? 'rgba(56,189,248,0.15)' : 'var(--pos-bg-app)',
                            border: '1px solid',
                            borderColor: isCur ? '#38bdf8' : 'var(--pos-border-card)',
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
                              <div style={{ fontSize: '0.88rem', fontWeight: '800', color: 'var(--pos-txt-primary)' }}>{c.name}</div>
                              <div style={{ fontSize: '0.72rem', color: 'var(--pos-txt-secondary)' }}>
                                {c.phone ? `${c.phone}` : ''} {c.customer_type ? `• ${c.customer_type}` : ''}
                              </div>
                            </div>
                          </div>
                          <button style={{ background: isCur ? '#34d399' : '#6366f1', color: 'var(--pos-txt-white)', border: 'none', padding: '6px 12px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: '900' }}>
                            {isCur ? 'Terpilih' : 'Pilih'}
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
              <h3 style={{ fontSize: '1.25rem', fontWeight: '900', color: '#0f172a', margin: 0, letterSpacing: '0.5px' }}>
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

                // Filter ONLY variants with price > 0 for this outlet.
                // Jika harga varian adalah 0, secara otomatis varian tidak akan tampil di pos kasir!
                const validVariants = rawVariants.filter(v => getVariantPrice(selectedProductForVariant, v, activeOutletId) > 0);

                // Build variant list with full formatted titles e.g. "AYAM / SAMBAL PECAK"
                const varList = validVariants.length > 0 ? validVariants.map(v => {
                  const isPrefixed = v.toLowerCase().startsWith(selectedProductForVariant.name.toLowerCase());
                  return {
                    name: v,
                    title: isPrefixed ? v.toUpperCase() : `${selectedProductForVariant.name.toUpperCase()} / ${v.toUpperCase()}`
                  };
                }) : (rawVariants.length === 0 ? [{
                  name: 'Standard',
                  title: selectedProductForVariant.name.toUpperCase()
                }] : []);

                // Default active variant if empty
                const activeVarObj = varList.find(v => v.name === modalSelectedVariant) || varList[0];

                if (varList.length === 0) {
                  return (
                    <div style={{ padding: '24px 20px', textAlign: 'center', color: '#e11d48', background: '#fff1f2', borderBottom: '1px solid #ffe4e6' }}>
                      <div style={{ fontSize: '0.92rem', fontWeight: '800' }}>Varian Tidak Tersedia</div>
                      <div style={{ fontSize: '0.78rem', marginTop: '4px', color: '#9f1239' }}>Harga varian untuk cabang ini diset 0 / belum tersedia.</div>
                    </div>
                  );
                }

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
                        const vPrice = getVariantPrice(selectedProductForVariant, item.name, activeOutletId);

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
                              <div style={{ fontSize: '0.88rem', fontWeight: '800', color: '#0f172a' }}>
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
                        outline: 'none',
                        background: '#ffffff'
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
                      border: '1px solid #cbd5e1',
                      fontSize: '0.88rem',
                      outline: 'none',
                      color: '#0f172a',
                      background: '#ffffff'
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
              const validVariants = rawVariants.filter(v => getVariantPrice(selectedProductForVariant, v, activeOutletId) > 0);
              const varList = validVariants.length > 0 ? validVariants : (rawVariants.length === 0 ? ['Standard'] : []);
              const activeVName = modalSelectedVariant && varList.includes(modalSelectedVariant)
                ? modalSelectedVariant
                : (varList.length > 0 ? varList[0] : 'Standard');

              const unitPrice = getVariantPrice(selectedProductForVariant, activeVName, activeOutletId);

              const discVal = modalDiscountEnabled && modalDiscountAmount !== '' ? Number(modalDiscountAmount) : 0;
              const netUnitPrice = Math.max(0, unitPrice - discVal);
              const computedTotal = netUnitPrice * modalProductQty;
              const isInvalidPrice = unitPrice <= 0 || varList.length === 0;

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
                    disabled={isInvalidPrice}
                    onClick={() => {
                      if (isInvalidPrice) return;
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
                      background: isInvalidPrice ? '#94a3b8' : '#583782',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '10px',
                      padding: '0 16px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      fontSize: '0.95rem',
                      fontWeight: '800',
                      cursor: isInvalidPrice ? 'not-allowed' : 'pointer',
                      boxShadow: isInvalidPrice ? 'none' : '0 4px 12px rgba(88,55,130,0.25)'
                    }}
                  >
                    <span>{isInvalidPrice ? 'Harga Belum Diset' : 'Simpan'}</span>
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
                        justifyContent: 'center',
                        cursor: 'pointer'
                      }}
                    >
                      <Minus size={18} strokeWidth={3} />
                    </button>

                    <span style={{ fontSize: '1.1rem', fontWeight: '900', color: '#0f172a', minWidth: '24px', textAlign: 'center' }}>
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
                        justifyContent: 'center',
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
          <div className="glass-card animate-fade-in" style={{ width: '100%', maxWidth: '440px', padding: '24px', background: 'var(--pos-bg-card)', borderRadius: '20px' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Printer size={24} color="#38bdf8" />
                <div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: '900', color: 'var(--pos-txt-primary)', margin: 0 }}>Pilihan Cetak Struk Order</h3>
                  <span style={{ fontSize: '0.72rem', color: '#fbbf24', fontWeight: '700' }}>{currentSaveOrderTx.table_number} • {currentSaveOrderTx.id}</span>
                </div>
              </div>

              <button onClick={() => setShowSaveOrderReceiptModal(false)} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: 'var(--pos-txt-primary)', padding: '6px', borderRadius: '8px', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            <p style={{ fontSize: '0.78rem', color: 'var(--pos-txt-secondary)', marginBottom: '14px' }}>
              Pilih jenis struk yang ingin dicetak untuk pesanan meja <strong style={{ color: 'var(--pos-txt-primary)' }}>{currentSaveOrderTx.table_number}</strong>:
            </p>

            {/* CHECKBOX OPTIONS LIST */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
              
              {/* OPTION 1: STRUK DAPUR (KITCHEN TICKET - TANPA HARGA) */}
              <div
                style={{
                  background: activeReceiptSelections.printKitchen ? 'rgba(251,191,36,0.15)' : 'var(--pos-bg-app)',
                  border: '1px solid',
                  borderColor: activeReceiptSelections.printKitchen ? '#fbbf24' : 'var(--pos-border-card)',
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
                    <div style={{ fontSize: '0.85rem', fontWeight: '800', color: 'var(--pos-txt-primary)' }}>Struk Dapur (Kitchen Ticket)</div>
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
                  background: activeReceiptSelections.printBar ? 'rgba(56,189,248,0.15)' : 'var(--pos-bg-app)',
                  border: '1px solid',
                  borderColor: activeReceiptSelections.printBar ? '#38bdf8' : 'var(--pos-border-card)',
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
                    <div style={{ fontSize: '0.85rem', fontWeight: '800', color: 'var(--pos-txt-primary)' }}>Struk Bar / Minuman (Bar Ticket)</div>
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

              {/* OPTION 3: STRUK MEJA / CHECKER (TABLE COPY - TANPA HARGA) */}
              <div
                style={{
                  background: activeReceiptSelections.printTableCopy ? 'rgba(16,185,129,0.15)' : 'var(--pos-bg-app)',
                  border: '1px solid',
                  borderColor: activeReceiptSelections.printTableCopy ? '#34d399' : 'var(--pos-border-card)',
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
                    <div style={{ fontSize: '0.85rem', fontWeight: '800', color: 'var(--pos-txt-primary)' }}>Struk Meja / Checker (Table Order)</div>
                    <div style={{ fontSize: '0.68rem', color: '#34d399', fontWeight: '700' }}>* Tampil Pesanan TANPA HARGA (Pelayan/Checker)</div>
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
                  <span>Lihat Checker</span>
                </button>
              </div>

              {/* OPTION 4: STRUK COPY KASIR (CASHIER COPY - DENGAN HARGA) */}
              <div
                style={{
                  background: activeReceiptSelections.printCashierCopy ? 'rgba(99,102,241,0.15)' : 'var(--pos-bg-app)',
                  border: '1px solid',
                  borderColor: activeReceiptSelections.printCashierCopy ? '#818cf8' : 'var(--pos-border-card)',
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
                    <div style={{ fontSize: '0.85rem', fontWeight: '800', color: 'var(--pos-txt-primary)' }}>Struk Copy Kasir (Cashier Copy)</div>
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
                    color: 'var(--pos-txt-primary)',
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
            {/* PRINTER STATUS BANNER — modal pilih struk order */}
            {renderPrinterStatusBanner()}
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
                <span>CETAK STRUK TERPILIH</span>
              </button>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => setShowSaveOrderReceiptModal(false)}
                  className="btn-secondary"
                  style={{ flex: 1, justifyContent: 'center', height: '38px', fontSize: '0.78rem' }}
                >
                  <span>Simpan Tanpa Cetak</span>
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
          <div className="glass-card animate-fade-in" style={{ width: '100%', maxWidth: '420px', padding: '24px', background: 'var(--pos-bg-card)', borderRadius: '16px' }}>
            
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid var(--pos-border)', paddingBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Tag size={20} color="#fb7185" />
                <h3 style={{ fontSize: '1.1rem', fontWeight: '900', color: 'var(--pos-txt-primary)', margin: 0 }}>Pengaturan Diskon Nota</h3>
              </div>
              <button onClick={() => setShowDiscountEditModal(false)} style={{ background: 'none', border: 'none', color: 'var(--pos-txt-secondary)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            {/* Mode Selector Toggle (% Persentase vs Rp Nominal) */}
            <div style={{ display: 'flex', background: 'var(--pos-bg-app)', borderRadius: '10px', padding: '4px', marginBottom: '18px', border: '1px solid var(--pos-border-card)' }}>
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
                      borderColor: discountInputVal === pct.toString() ? '#fb7185' : 'var(--pos-border-card)',
                      background: discountInputVal === pct.toString() ? 'rgba(251,113,133,0.2)' : 'var(--pos-bg-app)',
                      color: discountInputVal === pct.toString() ? '#fb7185' : 'var(--pos-txt-secondary)',
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
              <label style={{ fontSize: '0.8rem', color: 'var(--pos-txt-secondary)', display: 'block', marginBottom: '6px', fontWeight: '700' }}>
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
                    border: '1px solid var(--pos-border-card)',
                    background: 'var(--pos-bg-app)',
                    color: 'var(--pos-txt-primary)',
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
                <div style={{ marginTop: '10px', background: 'var(--pos-bg-app)', padding: '10px 14px', borderRadius: '8px', border: '1px dashed #fb7185', fontSize: '0.80rem', color: '#fb7185', fontWeight: '800', display: 'flex', justifyContent: 'space-between' }}>
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
                style={{ flex: 1, padding: '12px', background: 'var(--pos-border-card)', color: 'var(--pos-txt-primary)', border: 'none', borderRadius: '10px', fontWeight: '800', cursor: 'pointer' }}
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
                style={{ flex: 1, padding: '12px', background: '#fb7185', color: 'var(--pos-txt-white)', border: 'none', borderRadius: '10px', fontWeight: '900', cursor: 'pointer' }}
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
          <div className="glass-card animate-fade-in" style={{ width: '100%', maxWidth: '420px', padding: '24px', background: 'var(--pos-bg-card)', borderRadius: '16px' }}>
            
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid var(--pos-border)', paddingBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Percent size={20} color="#a78bfa" />
                <h3 style={{ fontSize: '1.1rem', fontWeight: '900', color: 'var(--pos-txt-primary)', margin: 0 }}>Pengaturan Adjustment</h3>
              </div>
              <button onClick={() => setShowAdjustmentEditModal(false)} style={{ background: 'none', border: 'none', color: 'var(--pos-txt-secondary)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            {/* Field 1: Nominal Adjustment (Rp) */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '0.8rem', color: 'var(--pos-txt-secondary)', display: 'block', marginBottom: '6px', fontWeight: '700' }}>
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
                  border: '1px solid var(--pos-border-card)',
                  background: 'var(--pos-bg-app)',
                  color: 'var(--pos-txt-primary)',
                  fontSize: '1rem',
                  fontWeight: '900',
                  outline: 'none'
                }}
              />
              <span style={{ fontSize: '0.72rem', color: 'var(--pos-txt-secondary)', marginTop: '4px', display: 'block' }}>
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
                  borderColor: adjustmentErrorMsg ? '#fb7185' : 'var(--pos-border-card)',
                  background: 'var(--pos-bg-app)',
                  color: 'var(--pos-txt-primary)',
                  fontSize: '0.85rem',
                  outline: 'none'
                }}
              />
              {adjustmentErrorMsg && (
                <div style={{ fontSize: '0.75rem', color: '#fb7185', fontWeight: '800', marginTop: '6px' }}>
                  {adjustmentErrorMsg}
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
                style={{ flex: 1, padding: '12px', background: 'var(--pos-border-card)', color: 'var(--pos-txt-primary)', border: 'none', borderRadius: '10px', fontWeight: '800', cursor: 'pointer' }}
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
                style={{ flex: 1, padding: '12px', background: '#a78bfa', color: 'var(--pos-txt-primary)', border: 'none', borderRadius: '10px', fontWeight: '900', cursor: 'pointer' }}
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
          <div className="glass-card animate-fade-in" style={{ width: '100%', maxWidth: '640px', maxHeight: '92vh', overflowY: 'auto', padding: '24px', background: 'var(--pos-bg-card)', borderRadius: '16px' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid var(--pos-border)', paddingBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '1.3rem' }}></span>
                <h3 style={{ fontSize: '1.1rem', fontWeight: '900', color: 'var(--pos-txt-primary)', margin: 0 }}>Split Bill (Pisah Tagihan Per Produk)</h3>
              </div>
              <button onClick={() => setShowSplitBillModal(false)} style={{ background: 'none', border: 'none', color: 'var(--pos-txt-secondary)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            {/* Split Mode Selector */}
            <div style={{ display: 'flex', background: 'var(--pos-bg-app)', borderRadius: '10px', padding: '4px', marginBottom: '16px', border: '1px solid var(--pos-border-card)' }}>
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
                Split Berdasarkan Produk (Itemized Qty)
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
                Split Sama Rata (Equal)
              </button>
            </div>

            {/* MODE 1: SPLIT BERDASARKAN PRODUK (ITEMIZED) */}
            {splitType === 'by_item' ? (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <span style={{ fontSize: '0.78rem', color: 'var(--pos-txt-secondary)', fontWeight: '700' }}>
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
                  <div style={{ padding: '24px', textAlign: 'center', background: 'var(--pos-bg-app)', borderRadius: '12px', color: 'var(--pos-txt-secondary)', fontSize: '0.82rem' }}>
                    Keranjang saat ini kosong. Tambahkan produk ke keranjang terlebih dahulu.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '280px', overflowY: 'auto', marginBottom: '16px' }}>
                    {cart.map((item, idx) => {
                      const totalAssignedQty = Object.values(itemQtySplitMap[idx] || {}).reduce((a, b) => a + b, 0);
                      const unassignedQty = Math.max(0, item.qty - totalAssignedQty);

                      return (
                        <div key={idx} style={{ background: 'var(--pos-bg-app)', border: '1px solid var(--pos-border-card)', borderRadius: '12px', padding: '12px 14px' }}>
                          {/* Row Top: Nama Orderan, Qty, & Total */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ background: '#2563eb', color: 'var(--pos-txt-white)', fontSize: '0.76rem', fontWeight: '900', padding: '2px 8px', borderRadius: '6px' }}>
                                {item.qty}x
                              </span>
                              <span style={{ fontSize: '0.88rem', fontWeight: '900', color: 'var(--pos-txt-primary)' }}>
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
                                    background: isAssigned ? 'rgba(56,189,248,0.15)' : 'var(--pos-bg-card)',
                                    border: '1px solid',
                                    borderColor: isAssigned ? '#38bdf8' : 'var(--pos-border-card)',
                                    borderRadius: '8px',
                                    padding: '3px 8px'
                                  }}
                                >
                                  <span style={{ fontSize: '0.72rem', fontWeight: '800', color: isAssigned ? '#38bdf8' : 'var(--pos-txt-secondary)' }}>
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
                                      style={{ width: '18px', height: '18px', borderRadius: '4px', background: 'var(--pos-border-card)', border: 'none', color: '#fff', fontSize: '0.7rem', fontWeight: '900', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                    >
                                      -
                                    </button>
                                    <span style={{ fontSize: '0.76rem', fontWeight: '900', color: 'var(--pos-txt-primary)', minWidth: '14px', textAlign: 'center' }}>
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
                              Belum dialokasikan: {unassignedQty}x ({formatRupiah(unassignedQty * item.price)})
                            </div>
                          ) : (
                            <div style={{ marginTop: '6px', fontSize: '0.70rem', color: '#34d399', fontWeight: '800' }}>
                              Seluruh {item.qty}x item dialokasikan pas.
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Bottom Summary Cards Per Customer */}
                <div style={{ fontSize: '0.78rem', color: 'var(--pos-txt-secondary)', fontWeight: '800', marginBottom: '8px' }}>
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
                      <div key={cIdx} style={{ background: 'var(--pos-bg-app)', padding: '10px 12px', borderRadius: '10px', border: '1px solid', borderColor: custTotal > 0 ? '#38bdf8' : 'var(--pos-border-card)' }}>
                        <div style={{ fontSize: '0.76rem', fontWeight: '900', color: '#38bdf8' }}>{cName}</div>
                        <div style={{ fontSize: '0.68rem', color: 'var(--pos-txt-secondary)', margin: '2px 0' }}>{custItemsCount} pcs produk</div>
                        <div style={{ fontSize: '0.90rem', fontWeight: '900', color: 'var(--pos-txt-primary)' }}>{formatRupiah(custTotal)}</div>
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
                        INFORMASI TERHUTANG: Terdapat {unassignedItemsCount} item ({formatRupiah(unassignedTotalRp)}) yang BELUM TERBAYAR / UNASSIGNED!
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
                  <div style={{ fontSize: '0.8rem', color: 'var(--pos-txt-secondary)', fontWeight: '700', marginBottom: '8px' }}>
                    Bagi Tagihan Sama Rata Berdasarkan Jumlah Orang:
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'var(--pos-bg-app)', padding: '12px', borderRadius: '10px', border: '1px solid var(--pos-border-card)' }}>
                    <button
                      onClick={() => setSplitPeopleCount(Math.max(2, splitPeopleCount - 1))}
                      style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'var(--pos-bg-card)', border: '1px solid var(--pos-border-card)', color: '#fff', fontSize: '1.2rem', fontWeight: '900', cursor: 'pointer' }}
                    >
                      -
                    </button>
                    <div style={{ flex: 1, textAlign: 'center' }}>
                      <div style={{ fontSize: '1.2rem', fontWeight: '900', color: '#38bdf8' }}>{splitPeopleCount} Orang</div>
                      <div style={{ fontSize: '0.74rem', color: 'var(--pos-txt-secondary)' }}>Masing-masing membayar</div>
                    </div>
                    <button
                      onClick={() => setSplitPeopleCount(splitPeopleCount + 1)}
                      style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'var(--pos-bg-card)', border: '1px solid var(--pos-border-card)', color: '#fff', fontSize: '1.2rem', fontWeight: '900', cursor: 'pointer' }}
                    >
                      +
                    </button>
                  </div>
                </div>

                <div style={{ background: 'var(--pos-bg-app)', padding: '14px', borderRadius: '12px', border: '1px dashed #38bdf8', marginBottom: '20px', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.78rem', color: 'var(--pos-txt-secondary)' }}>Total Tagihan Meja</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: '900', color: 'var(--pos-txt-primary)', margin: '2px 0 6px 0' }}>{formatRupiah(cartTotal)}</div>
                  <div style={{ fontSize: '0.78rem', color: '#38bdf8', fontWeight: '900' }}>
                    Tagihan Per Orang: {formatRupiah(Math.round(cartTotal / splitPeopleCount))}
                  </div>
                </div>
              </div>
            )}

            {/* Modal Actions */}
            {/* PRINTER STATUS BANNER — modal split bill */}
            {renderPrinterStatusBanner()}
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => setShowSplitBillModal(false)}
                style={{ flex: 1, padding: '12px', background: 'var(--pos-border-card)', color: 'var(--pos-txt-primary)', border: 'none', borderRadius: '10px', fontWeight: '800', cursor: 'pointer' }}
              >
                Batal
              </button>
              <button
                onClick={async () => {
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
                              <div class="bold" style="font-size:13px;">${currentOutlet.name?.toUpperCase() || 'POS KASIR BAROKAH'}</div>
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
                          <div class="bold" style="font-size:13px;">${currentOutlet.name?.toUpperCase() || 'POS KASIR BAROKAH'}</div>
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
                            <div class="bold" style="font-size:13px;">${currentOutlet.name?.toUpperCase() || 'POS KASIR BAROKAH'}</div>
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

                  // Kirim ke driver BT jika terhubung, fallback ke PDF jika di browser
                  // Bangun teks ESC/POS untuk split bill menggunakan buildReceiptText
                  const outletName = currentOutlet?.name || 'POS KASIR BAROKAH';
                  const charsPerLine = printerPaperWidth === '80' ? 48 : 32;
                  const div = '-'.repeat(charsPerLine);
                  const splitTextLines = [
                    '[C][B]' + outletName.toUpperCase(),
                    '[C]STRUK SPLIT BILL',
                    div,
                  ];

                  if (splitType === 'by_item') {
                    let grandSplitEsc = 0;
                    splitCustomerList.forEach((cName, cIdx) => {
                      const custItems = cart.map((item, idx) => {
                        const q = itemQtySplitMap[idx]?.[cIdx] || 0;
                        return q > 0 ? { ...item, splitQty: q } : null;
                      }).filter(Boolean);
                      if (custItems.length > 0) {
                        const custTotal = custItems.reduce((s, it) => s + (it.splitQty * it.price), 0);
                        grandSplitEsc += custTotal;
                        splitTextLines.push('[B][ ' + cName.toUpperCase() + ' ]');
                        custItems.forEach(it => splitTextLines.push(`${it.splitQty}x ${it.name.toUpperCase()}  ${formatRupiah(it.splitQty * it.price)}`));
                        splitTextLines.push('Subtotal ' + cName + ': ' + formatRupiah(custTotal));
                        splitTextLines.push(div);
                      }
                    });
                    splitTextLines.push('[B]GRAND TOTAL MEJA: ' + formatRupiah(grandSplitEsc));
                  } else {
                    for (let i = 1; i <= splitPeopleCount; i++) {
                      splitTextLines.push('[B]ORANG ' + i + ' dari ' + splitPeopleCount);
                      splitTextLines.push('TAGIHAN PER ORANG: ' + formatRupiah(Math.round(cartTotal / splitPeopleCount)));
                      splitTextLines.push(div);
                    }
                  }
                  splitTextLines.push('[C]*** BUKTI REKAP PEMBAYARAN ***');
                  splitTextLines.push('');
                  splitTextLines.push('');

                  const splitTextContent = splitTextLines.join('\n');

                  // Kirim ke printer Bluetooth atau fallback ke PDF
                  await printTextToBluetooth(splitTextContent, 'bill');

                  setShowSplitBillModal(false);
                }}
                style={{ flex: 1, padding: '12px', background: '#38bdf8', color: 'var(--pos-bg-app)', border: 'none', borderRadius: '10px', fontWeight: '900', cursor: 'pointer' }}
              >
                Cetak Struk Split Bill
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
          <div className="glass-card animate-fade-in" style={{ width: '100%', maxWidth: '440px', padding: '24px', background: 'var(--pos-bg-card)', borderRadius: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid var(--pos-border)', paddingBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '1.2rem' }}></span>
                <h3 style={{ fontSize: '1.1rem', fontWeight: '900', color: 'var(--pos-txt-primary)', margin: 0 }}>Merge Bill (Gabung Meja)</h3>
              </div>
              <button onClick={() => setShowMergeBillModal(false)} style={{ background: 'none', border: 'none', color: 'var(--pos-txt-secondary)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ fontSize: '0.8rem', color: 'var(--pos-txt-secondary)', fontWeight: '700', marginBottom: '10px' }}>
              Pilih Meja Lain yang Ingin Digabungkan ke Meja Ini ({selectedTableObj?.number || 'Meja Active'}):
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '220px', overflowY: 'auto', marginBottom: '20px' }}>
              {Object.keys(tableStatusMap).filter(tId => tableStatusMap[tId]?.status === 'occupied' && tId !== selectedTableId).length === 0 ? (
                <div style={{ padding: '20px', textAlign: 'center', color: 'var(--pos-txt-secondary)', fontSize: '0.82rem', background: 'var(--pos-bg-app)', borderRadius: '10px' }}>
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
                        padding: '12px 14px', background: 'var(--pos-bg-app)', border: '1px solid var(--pos-border-card)', borderRadius: '10px',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer'
                      }}
                    >
                      <div>
                        <div style={{ fontSize: '0.88rem', fontWeight: '900', color: '#a78bfa' }}>{tId}</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--pos-txt-secondary)' }}>{tData?.pendingOrder?.customerName || 'Pelanggan'}</div>
                      </div>
                      <div style={{ fontSize: '0.88rem', fontWeight: '900', color: 'var(--pos-txt-primary)' }}>
                        {formatRupiah(tData?.pendingOrder?.totalAmount || 0)}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <button
              onClick={() => setShowMergeBillModal(false)}
              style={{ width: '100%', padding: '12px', background: 'var(--pos-border-card)', color: 'var(--pos-txt-primary)', border: 'none', borderRadius: '10px', fontWeight: '800', cursor: 'pointer' }}
            >
              Tutup
            </button>
          </div>
        </div>
      )}

      {/* 8.4B MODAL PINDAH MEJA (MOVE TABLE) */}
      {showMoveTableModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9995
        }}>
          <div className="glass-card animate-fade-in" style={{ width: '100%', maxWidth: '460px', padding: '24px', background: 'var(--pos-bg-card)', borderRadius: '16px', border: '1px solid var(--pos-border-card)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid var(--pos-border)', paddingBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '1.3rem' }}></span>
                <div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: '900', color: 'var(--pos-txt-primary)', margin: 0 }}>Pindah Meja (Move Table)</h3>
                  <div style={{ fontSize: '0.74rem', color: '#10b981', fontWeight: '800', marginTop: '2px' }}>
                    Dari: {selectedTableObj?.number || 'Meja Asal'} Pilih Meja Tujuan
                  </div>
                </div>
              </div>
              <button onClick={() => setShowMoveTableModal(false)} style={{ background: 'none', border: 'none', color: 'var(--pos-txt-secondary)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ fontSize: '0.8rem', color: 'var(--pos-txt-secondary)', fontWeight: '700', marginBottom: '12px' }}>
              Pilih meja tujuan yang ingin ditempati konsumen:
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', maxHeight: '280px', overflowY: 'auto', marginBottom: '20px', padding: '4px' }}>
              {tables.filter(t => t.id !== selectedTableId).map(t => {
                const tStatus = tableStatusMap[t.id]?.status || (t.status === 'Terisi' || t.status === 'occupied' ? 'occupied' : 'available');
                const isOccupied = tStatus === 'occupied' || tStatus === 'Terisi';
                return (
                  <div
                    key={t.id}
                    onClick={() => {
                      if (isOccupied) {
                        const confirmMerge = window.confirm(`Meja ${t.number || t.name} saat ini sedang TERISI. Apakah Anda ingin menggabungkan pesanan ke meja ini?`);
                        if (!confirmMerge) return;
                        // Gabungkan pesanan ke meja target
                        const existingTargetItems = tableStatusMap[t.id]?.pendingOrder?.items || [];
                        const mergedItems = [...existingTargetItems, ...cart];
                        setTableStatusMap(prev => ({
                          ...prev,
                          [t.id]: {
                            status: 'occupied',
                            pendingOrder: {
                              customerName: customerName || 'Pelanggan Gabungan',
                              items: mergedItems,
                              totalAmount: mergedItems.reduce((acc, it) => acc + (Number(it.price || 0) * Number(it.qty || 1)), 0)
                            }
                          },
                          [selectedTableId]: { status: 'available', pendingOrder: null }
                        }));
                      } else {
                        // Pindah ke meja kosong
                        setTableStatusMap(prev => ({
                          ...prev,
                          [t.id]: {
                            status: 'occupied',
                            pendingOrder: {
                              customerName: customerName || 'Pelanggan Pindah',
                              items: cart,
                              totalAmount: subtotal
                            }
                          },
                          [selectedTableId]: { status: 'available', pendingOrder: null }
                        }));
                      }
                      // Update active table selection
                      setSelectedTableId(t.id);
                      alert(`Berhasil memindahkan pesanan dari ${selectedTableObj?.number || 'Meja Asal'} ke ${t.number || t.name}!`);
                      setShowMoveTableModal(false);
                    }}
                    style={{
                      padding: '14px 10px',
                      background: isOccupied ? 'rgba(239,68,68,0.12)' : 'rgba(16,185,129,0.12)',
                      border: `1.5px solid ${isOccupied ? '#ef4444' : '#10b981'}`,
                      borderRadius: '12px',
                      textAlign: 'center',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div style={{ fontSize: '1rem', fontWeight: '900', color: isOccupied ? '#f87171' : '#34d399' }}>
                      {t.number || t.name}
                    </div>
                    <div style={{ fontSize: '0.68rem', fontWeight: '800', color: isOccupied ? '#fca5a5' : '#6ee7b7', marginTop: '4px' }}>
                      {isOccupied ? 'Terisi' : 'Kosong'}
                    </div>
                  </div>
                );
              })}
            </div>

            <button
              onClick={() => setShowMoveTableModal(false)}
              style={{ width: '100%', padding: '12px', background: 'var(--pos-border-card)', color: 'var(--pos-txt-primary)', border: 'none', borderRadius: '10px', fontWeight: '800', cursor: 'pointer' }}
            >
              Batal
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
          <div className="glass-card animate-fade-in" style={{ width: '100%', maxWidth: '420px', padding: '24px', background: 'var(--pos-bg-card)', borderRadius: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid var(--pos-border)', paddingBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '1.2rem' }}></span>
                <h3 style={{ fontSize: '1.1rem', fontWeight: '900', color: 'var(--pos-txt-primary)', margin: 0 }}>Tukar Poin Loyalty</h3>
              </div>
              <button onClick={() => setShowTukarPoinModal(false)} style={{ background: 'none', border: 'none', color: 'var(--pos-txt-secondary)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            {(() => {
              const matchedCust = (masterData?.customers || []).find(c => c.name?.toLowerCase() === (selectedCustomer || '').toLowerCase());
              const availablePoints = matchedCust ? (matchedCust.points || 0) : 350;
              const valueRupiah = availablePoints * 1000;

              return (
                <div style={{ background: 'var(--pos-bg-app)', padding: '12px 14px', borderRadius: '10px', border: '1px solid var(--pos-border-card)', marginBottom: '16px' }}>
                  <div style={{ fontSize: '0.78rem', color: 'var(--pos-txt-secondary)' }}>Pelanggan Terpilih:</div>
                  <div style={{ fontSize: '0.95rem', fontWeight: '900', color: '#fbbf24', margin: '2px 0' }}>{selectedCustomer || 'Pelanggan Umum'}</div>
                  <div style={{ fontSize: '0.80rem', color: '#34d399', fontWeight: '800', marginTop: '4px' }}>
                    Tersedia: {availablePoints} Poin (Nilai Pembayaran: {formatRupiah(valueRupiah)})
                  </div>
                </div>
              );
            })()}

            <div style={{ marginBottom: '20px' }}>
              <label style={{ fontSize: '0.8rem', color: 'var(--pos-txt-secondary)', display: 'block', marginBottom: '4px', fontWeight: '700' }}>
                Jumlah Poin Ditukarkan (1 Poin = Rp 1.000 / Setiap Rp 1.000 Menu = 1 Poin)
              </label>
              <span style={{ fontSize: '0.72rem', color: 'var(--pos-txt-secondary)', display: 'block', marginBottom: '8px' }}>
                Dapat digunakan sebagai pembayaran lunas atau potongan harga pesanan menu.
              </span>
              <input
                type="number"
                value={pointsToRedeem}
                onChange={e => setPointsToRedeem(e.target.value)}
                placeholder="Contoh: 10, 50, 100 Poin..."
                style={{
                  width: '100%', padding: '12px 14px', borderRadius: '10px',
                  border: '1px solid var(--pos-border-card)', background: 'var(--pos-bg-app)', color: 'var(--pos-txt-primary)',
                  fontSize: '1rem', fontWeight: '900', outline: 'none'
                }}
              />
              {pointsToRedeem && (
                <div style={{ marginTop: '8px', fontSize: '0.78rem', color: '#fbbf24', fontWeight: '800', background: 'rgba(251, 191, 36, 0.12)', padding: '8px 12px', borderRadius: '8px', border: '1px solid rgba(251, 191, 36, 0.3)' }}>
                  Nilai Pembayaran / Diskon Poin: <strong>{formatRupiah(Number(pointsToRedeem || 0) * 1000)}</strong> ({Number(pointsToRedeem || 0)} Poin)
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => setShowTukarPoinModal(false)}
                style={{ flex: 1, padding: '12px', background: 'var(--pos-border-card)', color: 'var(--pos-txt-primary)', border: 'none', borderRadius: '10px', fontWeight: '800', cursor: 'pointer' }}
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
                style={{ flex: 1, padding: '12px', background: '#fbbf24', color: 'var(--pos-bg-app)', border: 'none', borderRadius: '10px', fontWeight: '900', cursor: 'pointer' }}
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
          <div className="glass-card animate-fade-in" style={{ width: '100%', maxWidth: '420px', padding: '24px', background: 'var(--pos-bg-card)', borderRadius: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid var(--pos-border)', paddingBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '1.2rem' }}></span>
                <h3 style={{ fontSize: '1.1rem', fontWeight: '900', color: 'var(--pos-txt-primary)', margin: 0 }}>Kupon & Voucher Promo</h3>
              </div>
              <button onClick={() => setShowKuponModal(false)} style={{ background: 'none', border: 'none', color: 'var(--pos-txt-secondary)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label style={{ fontSize: '0.8rem', color: 'var(--pos-txt-secondary)', display: 'block', marginBottom: '6px', fontWeight: '700' }}>
                Pilih atau Input Kode Kupon:
              </label>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '12px' }}>
                {(masterData.coupons || []).length === 0 ? (
                  <div style={{ fontSize: '0.74rem', color: '#94a3b8', fontStyle: 'italic' }}>
                    Belum ada kupon tersedia. Tambahkan melalui Web Admin.
                  </div>
                ) : (masterData.coupons || []).map(c => (
                  <button
                    key={c.code}
                    onClick={() => {
                      setCouponCodeInput(c.code);
                      if (c.type === 'percent') {
                        setDiscountMode('percent');
                        setDiscountInputVal(String(c.val || c.value || 0));
                        const calcDisc = Math.round((cartSubtotal * (c.val || c.value || 0)) / 100);
                        setDiscountValue(calcDisc.toString());
                      } else {
                        setDiscountMode('nominal');
                        setDiscountValue(String(c.val || c.value || 0));
                      }
                      setCouponMsg({ type: 'success', text: `Kupon ${c.code} (${c.desc || c.description || ''}) berhasil diterapkan!` });
                    }}
                    style={{
                      padding: '6px 12px', background: couponCodeInput === c.code ? 'rgba(52,211,153,0.2)' : 'var(--pos-bg-app)',
                      border: '1px solid', borderColor: couponCodeInput === c.code ? '#34d399' : 'var(--pos-border-card)',
                      color: couponCodeInput === c.code ? '#34d399' : 'var(--pos-txt-secondary)', borderRadius: '6px',
                      fontSize: '0.76rem', fontWeight: '800', cursor: 'pointer'
                    }}
                  >
                    {c.code}
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
                  border: '1px solid var(--pos-border-card)', background: 'var(--pos-bg-app)', color: 'var(--pos-txt-primary)',
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
                style={{ flex: 1, padding: '12px', background: 'var(--pos-border-card)', color: 'var(--pos-txt-primary)', border: 'none', borderRadius: '10px', fontWeight: '800', cursor: 'pointer' }}
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
                style={{ flex: 1, padding: '12px', background: '#34d399', color: 'var(--pos-bg-app)', border: 'none', borderRadius: '10px', fontWeight: '900', cursor: 'pointer' }}
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
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999999
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
                {currentOutlet.name?.toUpperCase() || (outlets[0]?.name || 'BAROKAH GROUP').toUpperCase()}
              </div>

              {/* BARIS 2: ALAMAT LOKASI (HURUF BESAR DI SETIAP KATA, RATA TENGAH, UKURAN FONT 1 LEVEL LEBIH KECIL) */}
              <div style={{ fontSize: '0.88rem', fontWeight: '600', textAlign: 'center', color: '#222222', marginTop: '4px' }}>
                {(currentOutlet.address || outlets[0]?.address || 'Tebing Tinggi')
                  .toLowerCase()
                  .split(' ')
                  .map(w => w ? w.charAt(0).toUpperCase() + w.slice(1) : '')
                  .join(' ')}
              </div>

              <div style={{ fontSize: '0.82rem', fontWeight: '900', marginTop: '8px', background: '#000000', color: 'var(--pos-txt-white)', padding: '4px 10px', borderRadius: '4px', display: 'inline-block' }}>
                {ticketPreviewType === 'KITCHEN' && 'STRUK DAPUR (KITCHEN TICKET)'}
                {ticketPreviewType === 'BAR' && 'STRUK BAR (BAR TICKET)'}
                {ticketPreviewType === 'TABLE_BILL' && 'STRUK MEJA / ORDER CHECKER'}
                {ticketPreviewType === 'CASHIER' && 'STRUK COPY KASIR'}
              </div>
              <div style={{ fontSize: '0.75rem', marginTop: '6px', fontWeight: '800' }}>
                {ticketPreviewType === 'CASHIER' ? '*** RINCIAN NOTA PEMBAYARAN ***' : '*** TAMPIL PESANAN TANPA HARGA ***'}
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
              {ticketPreviewType === 'CASHIER' && <span>SUBTOTAL</span>}
            </div>

            {/* Item Rows */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px', fontSize: '0.85rem' }}>
              {filterItemsForTicketTarget(ticketPreviewData.items || [], ticketPreviewType).map((it, idx) => (
                <div key={idx} style={{ borderBottom: '1px dashed #eee', paddingBottom: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: '800' }}>
                    <span>{it.qty}x  {it.name.toUpperCase()}</span>
                    {ticketPreviewType === 'CASHIER' && (
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

            {/* Footer Summary - NO PRICE FOR KITCHEN / BAR / TABLE CHECKER TICKETS */}
            {ticketPreviewType === 'CASHIER' ? (
              <div style={{ borderTop: '2px dashed #000', paddingTop: '8px', marginBottom: '16px', fontSize: '0.9rem', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: '900' }}>
                  <span>TOTAL BILL</span>
                  <span>{formatRupiah(ticketPreviewData.amount || cartTotal)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', color: '#333' }}>
                  <span>Bayar / Tunai</span>
                  <strong style={{ color: '#0284c7' }}>
                    {formatRupiah(
                      ticketPreviewData.paid_amount !== undefined && ticketPreviewData.paid_amount !== null ? ticketPreviewData.paid_amount :
                      ticketPreviewData.cash_paid !== undefined && ticketPreviewData.cash_paid !== null ? ticketPreviewData.cash_paid :
                      ticketPreviewData.tendered !== undefined && ticketPreviewData.tendered !== null ? ticketPreviewData.tendered :
                      ticketPreviewData.amount || cartTotal
                    )}
                  </strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem', fontWeight: '900', color: '#16a34a' }}>
                  <span>Kembalian</span>
                  <span>
                    {formatRupiah(
                      ticketPreviewData.change_amount !== undefined && ticketPreviewData.change_amount !== null ? ticketPreviewData.change_amount :
                      ticketPreviewData.kembalian !== undefined && ticketPreviewData.kembalian !== null ? ticketPreviewData.kembalian :
                      Math.max(0, (ticketPreviewData.paid_amount || ticketPreviewData.cash_paid || ticketPreviewData.amount || cartTotal) - (ticketPreviewData.amount || cartTotal))
                    )}
                  </span>
                </div>
              </div>
            ) : (
              <div style={{ borderTop: '2px dashed #000', paddingTop: '10px', marginBottom: '16px', textAlign: 'center' }}>
                <div style={{ fontSize: '0.80rem', fontWeight: '900', fontStyle: 'italic', marginBottom: '8px' }}>
                  *** PRODUK TANPA HARGA (TICKET DAPUR / BAR / MEJA) ***
                </div>
                <div style={{
                  fontSize: '0.72rem',
                  fontWeight: '800',
                  color: '#dc2626',
                  background: '#fef2f2',
                  border: '1.5px dashed #dc2626',
                  padding: '8px',
                  borderRadius: '6px',
                  lineHeight: 1.35
                }}>
                  <div style={{ fontWeight: '900', fontSize: '0.78rem', marginBottom: '2px' }}>*** PERINGATAN KERAS ***</div>
                  <div>STRUK INI BUKAN STRUK PEMBAYARAN!</div>
                  <div>JANGAN DIBAYAR SEBELUM DIBERI STRUK RESMI KASIR.</div>
                  <div style={{ fontSize: '0.66rem', marginTop: '3px', color: '#991b1b' }}>
                    Apabila kasir memberikan struk ini dan anda melakukan pembayaran, maka anda berhak mendapatkan 1 juta rupiah langsung dari kasir.
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setTicketPreviewData(null)}
                style={{ flex: 1, padding: '10px', background: '#e2e8f0', color: 'var(--pos-border-card)', border: 'none', borderRadius: '8px', fontWeight: '800', cursor: 'pointer' }}
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
                style={{ flex: 1, padding: '10px', background: '#2563eb', color: 'var(--pos-txt-white)', border: 'none', borderRadius: '8px', fontWeight: '900', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
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
            background: isCalmSage ? '#152e22' : '#0f294a',
            borderBottom: '1px solid rgba(255,255,255,0.15)',
            padding: '0 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            color: '#ffffff',
            flexShrink: 0
          }}>
            <button
              type="button"
              onClick={() => setShowPaymentScreenModal(false)}
              style={{
                background: 'rgba(255,255,255,0.18)',
                border: '1px solid rgba(255,255,255,0.3)',
                color: '#ffffff',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '7px 14px',
                borderRadius: '10px',
                fontWeight: '900',
                fontSize: '0.85rem',
                boxShadow: '0 2px 6px rgba(0,0,0,0.2)'
              }}
            >
              <ArrowLeft size={18} color="#ffffff" />
              <span>Kembali</span>
            </button>
            
            <div style={{ fontSize: '1.15rem', fontWeight: '900', letterSpacing: '0.3px', color: '#ffffff' }}>
              Pembayaran Kasir
            </div>
            
            <div style={{ width: '80px' }}></div>
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
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', padding: '8px 10px', borderRadius: '8px' }}>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flex: 1, minWidth: 0, paddingRight: '6px' }}>
                        {/* Qty Adjustment Controls */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '2px', flexShrink: 0 }}>
                          <button
                            type="button"
                            onClick={() => handleUpdateQty(item.id, -1)}
                            title="Kurangi 1"
                            style={{ width: '22px', height: '22px', borderRadius: '4px', border: 'none', background: '#ef4444', color: '#ffffff', fontSize: '0.85rem', fontWeight: '900', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                          >
                            -
                          </button>
                          <span style={{ fontSize: '0.82rem', color: '#1e293b', fontWeight: '800', minWidth: '18px', textAlign: 'center' }}>{item.qty}</span>
                          <button
                            type="button"
                            onClick={() => handleUpdateQty(item.id, 1)}
                            title="Tambah 1"
                            style={{ width: '22px', height: '22px', borderRadius: '4px', border: 'none', background: '#10b981', color: '#ffffff', fontSize: '0.85rem', fontWeight: '900', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                          >
                            +
                          </button>
                        </div>

                        <span style={{ fontSize: '0.84rem', color: '#1e293b', fontWeight: '800', letterSpacing: '0.2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.name}</span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                        <span style={{ fontSize: '0.85rem', color: '#0f172a', fontWeight: '800' }}>{formatRupiah(item.price * item.qty)}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveCartItem(item.id)}
                          title="Hapus Orderan"
                          style={{ width: '24px', height: '24px', borderRadius: '5px', border: 'none', background: 'rgba(239,68,68,0.15)', color: '#ef4444', fontSize: '0.78rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        >
                          
                        </button>
                      </div>
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
                  <span>Diskon {discountAmount > 0 ? `(${discountMode === 'percent' && discountInputVal ? `${discountInputVal}%` : 'Nominal'})` : ''}</span>
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
                color: 'var(--pos-txt-primary)',
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

              {/* ── SUPERADMIN: Tanggal Input Override ─────────────────────── */}
              {(() => {
                const r = String(currentUserSession?.role || userSession?.role || '').toLowerCase();
                const isSA = r.includes('super') || r.includes('admin') || r.includes('owner');
                if (!isSA) return null;
                return (
                  <div style={{
                    background: 'rgba(251,191,36,0.08)',
                    border: '1px solid rgba(251,191,36,0.4)',
                    borderRadius: '12px',
                    padding: '12px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    flexWrap: 'wrap'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: '0 0 auto' }}>
                      <span style={{ fontSize: '1rem' }}></span>
                      <span style={{ fontSize: '0.78rem', fontWeight: '800', color: '#fbbf24', letterSpacing: '0.4px' }}>
                        TANGGAL TRANSAKSI
                      </span>
                    </div>
                    <input
                      type="date"
                      value={customTxDate}
                      onChange={(e) => setCustomTxDate(e.target.value)}
                      style={{
                        flex: '1 1 140px',
                        background: 'var(--pos-bg-app)',
                        border: '1.5px solid rgba(251,191,36,0.5)',
                        borderRadius: '8px',
                        color: 'var(--pos-txt-primary)',
                        padding: '8px 12px',
                        fontSize: '0.88rem',
                        fontWeight: '800',
                        outline: 'none'
                      }}
                    />
                    {customTxDate !== new Date().toLocaleDateString('en-CA') && (
                      <span style={{ fontSize: '0.72rem', color: '#fbbf24', fontWeight: '700', background: 'rgba(251,191,36,0.15)', padding: '3px 8px', borderRadius: '6px' }}>
                        BUKAN HARI INI
                      </span>
                    )}
                  </div>
                );
              })()}

              {/* PAYMENT METHOD SELECTION GRID */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                {[
                  { id: 'Cash', label: 'Cash' },
                  { id: 'Pembayaran Poin', label: 'Pembayaran Poin' },
                  { id: 'Transfer Bank', label: 'Transfer Bank' },
                  { id: 'GrabFood', label: 'GrabFood' },
                  { id: 'QRIS (BCA)', label: 'QRIS (BCA)' },
                  { id: 'Go-Food', label: 'Go-Food' },
                  { id: 'ShopeeFood', label: 'ShopeeFood' },
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
                        color: isSelected ? '#ffffff' : '#0f172a',
                        border: isSelected ? '2px solid #1d4ed8' : '1px solid #cbd5e1',
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
                  <div style={{ background: 'var(--pos-bg-app)', padding: '14px 16px', borderRadius: '14px', border: '1px solid #a855f7', display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px' }}>
                    <div style={{ fontSize: '0.82rem', fontWeight: '900', color: '#a78bfa', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>Pembayaran Menggunakan Poin Loyalty</span>
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--pos-txt-secondary)', lineHeight: '1.4' }}>
                      • Perolehan Poin: <strong style={{ color: '#34d399' }}>Setiap Belanja Rp 100.000 = 1 Poin (Kelipatan)</strong><br/>
                      • Kurs Pembayaran Poin: <strong style={{ color: '#fbbf24' }}>1 Poin = Rp 1.000 (Setiap Rp 1.000 Menu = 1 Poin)</strong><br/>
                      • Dibutuhkan untuk Total {formatRupiah(cartTotal)}: <strong style={{ color: '#38bdf8' }}>{requiredPoints} Poin</strong><br/>
                      • Saldo Poin {selectedCustomer || 'Pelanggan'}: <strong style={{ color: isPointsSufficient ? '#34d399' : '#ef4444' }}>{custPoints} Poin</strong>
                    </div>
                    {!isPointsSufficient && (
                      <div style={{ fontSize: '0.72rem', color: '#ef4444', fontWeight: '700', background: 'rgba(239,68,68,0.15)', padding: '6px 10px', borderRadius: '6px' }}>
                        Saldo poin belum cukup untuk bayar lunas ({requiredPoints} Poin). Anda dapat menggunakan tombol Tukar Poin sebagai diskon parsial.
                      </div>
                    )}
                  </div>
                );
              })()}
              {/* ONLINE DELIVERY ORDER ID INPUT PANEL */}
              {['GrabFood', 'Go-Food', 'ShopeeFood', 'Maxim Food'].includes(selectedPaymentMethod) && (
                <div style={{ background: '#fff7ed', padding: '14px 16px', borderRadius: '14px', border: '1.5px solid #fdba74', display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px' }}>
                  <div style={{ fontSize: '0.80rem', color: '#c2410c', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>🛵 Nomor / Kode Order {selectedPaymentMethod} (Opsional):</span>
                  </div>
                  <input
                    type="text"
                    value={onlineOrderId}
                    onChange={e => setOnlineOrderId(e.target.value)}
                    placeholder="Contoh: GF-8291 / Pin Driver Grab"
                    style={{ padding: '10px 14px', borderRadius: '10px', border: '1.5px solid #fed7aa', fontSize: '0.92rem', fontWeight: '800', outline: 'none', color: '#0f172a', background: '#ffffff' }}
                  />
                  <div style={{ fontSize: '0.72rem', color: '#9a3412', opacity: 0.9 }}>
                    Kode ini akan otomatis tercatat di struk kasir & rekap shift harian untuk mempermudah rekonsiliasi dengan aplikasi {selectedPaymentMethod}.
                  </div>
                </div>
              )}

              {/* CASH TENDERED QUICK PRESET BAR (IF CASH IS SELECTED) */}
              {selectedPaymentMethod === 'Cash' && (
                <div style={{ background: '#ffffff', padding: '14px 16px', borderRadius: '14px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ fontSize: '0.80rem', color: '#475569', fontWeight: '800', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>Uang Tunai Diterima:</span>
                    <span style={{ fontSize: '0.74rem', color: '#2563eb', fontWeight: '700' }}>Pilihan Cepat / Uang Pecahan</span>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      type="number"
                      value={tenderedCash}
                      onChange={e => setTenderedCash(e.target.value)}
                      placeholder={`Nominal Tunai (cth: ${cartTotal})`}
                      style={{ flex: 1, padding: '12px 14px', borderRadius: '10px', border: '1.5px solid #cbd5e1', fontSize: '1rem', fontWeight: '900', outline: 'none', color: '#0f172a', background: '#ffffff' }}
                    />
                    <button
                      onClick={() => setTenderedCash(cartTotal.toString())}
                      style={{ background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)', border: 'none', color: '#ffffff', padding: '0 16px', borderRadius: '10px', fontSize: '0.82rem', fontWeight: '900', cursor: 'pointer', boxShadow: '0 2px 8px rgba(37,99,235,0.3)' }}
                    >
                      Uang Pas
                    </button>
                  </div>
                  
                  {/* Preset Pecahan Bulat */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
                    {[50000, 100000, 200000, Math.ceil(cartTotal / 50000) * 50000].filter((v, idx, arr) => v >= cartTotal && arr.indexOf(v) === idx).slice(0, 4).map(val => (
                      <button
                        key={val}
                        onClick={() => setTenderedCash(val.toString())}
                        style={{ background: '#f8fafc', border: '1.5px solid #cbd5e1', padding: '10px 4px', borderRadius: '8px', fontSize: '0.80rem', fontWeight: '900', color: '#0f172a', cursor: 'pointer', transition: 'all 0.1s ease' }}
                      >
                        {formatRupiah(val)}
                      </button>
                    ))}
                  </div>

                  {/* Shortcut Penambah Cepat */}
                  <div style={{ display: 'flex', gap: '6px' }}>
                    {[10000, 20000, 50000].map(inc => (
                      <button
                        key={inc}
                        onClick={() => setTenderedCash(prev => (Number(prev || cartTotal) + inc).toString())}
                        style={{ flex: 1, background: '#eff6ff', border: '1px solid #bfdbfe', padding: '7px 4px', borderRadius: '8px', fontSize: '0.76rem', fontWeight: '800', color: '#2563eb', cursor: 'pointer' }}
                      >
                        +{formatRupiah(inc)}
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
                  <div>
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
                        <div style={{ fontSize: '0.75rem', color: '#475569', fontWeight: '700', marginBottom: '2px' }}>Total Tagihan</div>
                        <div style={{ fontSize: '1rem', fontWeight: '900', color: '#0f172a' }}>
                          {formatRupiah(cartTotal)}
                        </div>
                      </div>
                      <div style={{ width: '1px', height: '28px', background: '#e2e8f0' }}></div>
                      <div style={{ textAlign: 'center', flex: 1 }}>
                        <div style={{ fontSize: '0.75rem', color: '#475569', fontWeight: '700', marginBottom: '2px' }}>Uang Diterima</div>
                        <div style={{ fontSize: '1rem', fontWeight: '900', color: '#2563eb' }}>
                          {formatRupiah(numTendered)}
                        </div>
                      </div>
                      <div style={{ width: '1px', height: '28px', background: '#e2e8f0' }}></div>
                      <div style={{ textAlign: 'center', flex: 1 }}>
                        <div style={{ fontSize: '0.76rem', color: '#1e293b', fontWeight: '800', marginBottom: '2px' }}>Kembalian</div>
                        <div style={{ fontSize: '1.15rem', fontWeight: '900', color: kembalian > 0 ? '#059669' : '#0f172a' }}>
                          {formatRupiah(kembalian)}
                        </div>
                      </div>
                    </div>

                    {/* LARGE HIGHLIGHT KEMBALIAN BANNER (10/10) */}
                    {selectedPaymentMethod === 'Cash' && kembalian > 0 && (
                      <div style={{
                        marginTop: '10px',
                        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                        border: '2px solid #047857',
                        borderRadius: '14px',
                        padding: '14px 18px',
                        textAlign: 'center',
                        boxShadow: '0 6px 18px rgba(16,185,129,0.35)',
                        color: '#ffffff'
                      }}>
                        <div style={{ fontSize: '0.80rem', fontWeight: '900', color: '#ffffff', letterSpacing: '0.5px' }}>
                          UANG KEMBALIAN PELANGGAN:
                        </div>
                        <div style={{ fontSize: '2rem', fontWeight: '900', color: '#ffffff', marginTop: '2px' }}>
                          {formatRupiah(kembalian)}
                        </div>
                      </div>
                    )}
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
                    disabled={!isPaymentValid || isProcessingPayment}
                    onClick={() => {
                      if (isProcessingPayment) return;
                      handleExecuteQuickPayment(selectedPaymentMethod, numTendered);
                    }}
                    style={{
                      width: '100%',
                      height: '48px',
                      background: (isPaymentValid && !isProcessingPayment) ? 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)' : '#94a3b8',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '12px',
                      fontSize: '1.05rem',
                      fontWeight: '900',
                      cursor: (isPaymentValid && !isProcessingPayment) ? 'pointer' : 'not-allowed',
                      boxShadow: (isPaymentValid && !isProcessingPayment) ? '0 4px 14px rgba(37,99,235,0.4)' : 'none',
                      transition: 'all 0.2s ease',
                      marginTop: 'auto',
                      opacity: isProcessingPayment ? 0.7 : 1
                    }}
                  >
                    {isProcessingPayment ? 'Memproses Transaksi...' : 'Bayar'}
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
          <div className="glass-card animate-fade-in" style={{ width: '100%', maxWidth: '520px', padding: '24px', background: 'var(--pos-bg-card)', borderRadius: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', borderBottom: '1px solid var(--pos-border)', paddingBottom: '12px' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: '900', color: 'var(--pos-txt-primary)', margin: 0 }}>
                {editingCustomerData ? 'Ubah Data Pelanggan' : 'Tambah Pelanggan Baru'}
              </h3>
              <button onClick={() => setShowAddCustomerModal(false)} style={{ background: 'none', border: 'none', color: 'var(--pos-txt-secondary)', cursor: 'pointer' }}>
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
                  <label style={{ fontSize: '0.78rem', color: 'var(--pos-txt-secondary)', fontWeight: '800', display: 'block', marginBottom: '4px' }}>Nama Pelanggan *</label>
                  <input
                    type="text"
                    required
                    value={custFormName}
                    onChange={e => setCustFormName(e.target.value)}
                    placeholder="Masukkan nama pelanggan..."
                    style={{ width: '100%', padding: '10px', background: 'var(--pos-bg-app)', border: '1px solid var(--pos-border-card)', borderRadius: '8px', color: 'var(--pos-txt-primary)', fontSize: '0.85rem', outline: 'none' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.78rem', color: 'var(--pos-txt-secondary)', fontWeight: '800', display: 'block', marginBottom: '4px' }}>Nomor HP / WhatsApp *</label>
                  <input
                    type="text"
                    value={custFormPhone}
                    onChange={e => setCustFormPhone(e.target.value)}
                    placeholder="Contoh: 085277538483"
                    style={{ width: '100%', padding: '10px', background: 'var(--pos-bg-app)', border: '1px solid var(--pos-border-card)', borderRadius: '8px', color: 'var(--pos-txt-primary)', fontSize: '0.85rem', outline: 'none' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.78rem', color: 'var(--pos-txt-secondary)', fontWeight: '800', display: 'block', marginBottom: '4px' }}>Outlet *</label>
                  <select
                    value={custFormOutletId}
                    onChange={e => setCustFormOutletId(e.target.value)}
                    style={{ width: '100%', padding: '10px', background: 'var(--pos-bg-app)', border: '1px solid var(--pos-border-card)', borderRadius: '8px', color: 'var(--pos-txt-primary)', fontSize: '0.85rem', outline: 'none' }}
                  >
                    {(masterData.outlets || []).map(o => (
                      <option key={o.id} value={o.id}>{o.name}</option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ fontSize: '0.78rem', color: 'var(--pos-txt-secondary)', fontWeight: '800', display: 'block', marginBottom: '4px' }}>Email</label>
                    <input
                      type="email"
                      value={custFormEmail}
                      onChange={e => setCustFormEmail(e.target.value)}
                      placeholder="email@domain.com"
                      style={{ width: '100%', padding: '10px', background: 'var(--pos-bg-app)', border: '1px solid var(--pos-border-card)', borderRadius: '8px', color: 'var(--pos-txt-primary)', fontSize: '0.85rem', outline: 'none' }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.78rem', color: 'var(--pos-txt-secondary)', fontWeight: '800', display: 'block', marginBottom: '4px' }}>Jenis Kelamin</label>
                    <select
                      value={custFormGender}
                      onChange={e => setCustFormGender(e.target.value)}
                      style={{ width: '100%', padding: '10px', background: 'var(--pos-bg-app)', border: '1px solid var(--pos-border-card)', borderRadius: '8px', color: 'var(--pos-txt-primary)', fontSize: '0.85rem', outline: 'none' }}
                    >
                      <option value="Wanita">Wanita</option>
                      <option value="Laki-laki">Laki-laki</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '0.78rem', color: 'var(--pos-txt-secondary)', fontWeight: '800', display: 'block', marginBottom: '4px' }}>Alamat Lengkap</label>
                  <textarea
                    rows={2}
                    value={custFormAddress}
                    onChange={e => setCustFormAddress(e.target.value)}
                    placeholder="Masukkan alamat domisili pelanggan..."
                    style={{ width: '100%', padding: '10px', background: 'var(--pos-bg-app)', border: '1px solid var(--pos-border-card)', borderRadius: '8px', color: 'var(--pos-txt-primary)', fontSize: '0.82rem', outline: 'none', resize: 'vertical' }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '14px' }}>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddCustomerModal(false);
                    setShowQrSelfRegModal(true);
                  }}
                  style={{ width: '100%', padding: '10px', background: 'rgba(56,189,248,0.12)', border: '1px solid rgba(56,189,248,0.3)', color: '#38bdf8', borderRadius: '10px', fontWeight: '800', fontSize: '0.80rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                >
                  <QrCode size={16} />
                  <span>Tampilkan QR Code Registrasi Mandiri di HP Pelanggan</span>
                </button>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowAddCustomerModal(false)}
                  style={{ flex: 1, padding: '12px', background: 'var(--pos-border-card)', color: 'var(--pos-txt-primary)', border: 'none', borderRadius: '10px', fontWeight: '800', cursor: 'pointer' }}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  style={{ flex: 1, padding: '12px', background: '#6366f1', color: 'var(--pos-txt-white)', border: 'none', borderRadius: '10px', fontWeight: '900', cursor: 'pointer' }}
                >
                  {editingCustomerData ? 'Simpan Perubahan' : 'Simpan Pelanggan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 11. MODAL FULLSCREEN SCAN BARCODE / QR REGISTRASI MANDIRI PELANGGAN */}
      {showQrSelfRegModal && (() => {
        const isLocalOrNative = typeof window !== 'undefined' && (
          window.location.origin.includes('localhost') ||
          window.location.origin.includes('capacitor') ||
          window.location.origin.includes('127.0.0.1') ||
          window.location.protocol === 'file:'
        );
        const publicBaseUrl = isLocalOrNative 
          ? 'https://mris.barokahgroupindonesia.tech' 
          : window.location.origin;
        const selfRegUrl = `${publicBaseUrl}/register-customer?outlet=${currentOutlet.id || 1}`;

        return (
          <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: '#090d16', zIndex: 10000, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px'
          }}>
            <div style={{ position: 'absolute', top: '20px', right: '20px' }}>
              <button onClick={() => setShowQrSelfRegModal(false)} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: 'var(--pos-txt-primary)', padding: '8px 16px', borderRadius: '10px', cursor: 'pointer', fontWeight: '800' }}>
                Tutup
              </button>
            </div>

            <div className="animate-fade-in" style={{ textAlign: 'center', maxWidth: '440px', width: '100%' }}>
              <div style={{ fontSize: '1.3rem', fontWeight: '900', color: 'var(--pos-txt-primary)', marginBottom: '6px' }}>
                Barcode / QR Code Registrasi Mandiri Pelanggan
              </div>
              <div style={{ fontSize: '0.84rem', color: 'var(--pos-txt-secondary)', marginBottom: '20px' }}>
                Arahkan kamera smartphone pelanggan ke QR Code berikut untuk pendaftaran profil mandiri di <strong>{currentOutlet.name}</strong>.
              </div>

              {/* Giant Real Scannable QR Display Box */}
              <div style={{ background: '#ffffff', padding: '24px', borderRadius: '24px', display: 'inline-block', boxShadow: '0 20px 50px rgba(99,102,241,0.35)', marginBottom: '20px' }}>
                <img 
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(selfRegUrl)}`} 
                  alt="QR Code Registrasi Mandiri Pelanggan"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = `https://quickchart.io/qr?text=${encodeURIComponent(selfRegUrl)}&size=260`;
                  }}
                  style={{ width: '220px', height: '220px', display: 'block', margin: '0 auto', borderRadius: '12px', background: '#ffffff' }}
                />
                <div style={{ marginTop: '14px', fontSize: '0.88rem', fontWeight: '900', color: '#6366f1', letterSpacing: '0.5px' }}>
                  SCAN DENGAN HP UNTUK DAFTAR MANDIRI
                </div>
              </div>

              <div style={{ background: 'var(--pos-bg-card)', borderRadius: '12px', padding: '14px 16px', border: '1px solid var(--pos-border-card)', color: 'var(--pos-txt-secondary)', fontSize: '0.80rem', marginBottom: '20px', textAlign: 'center' }}>
                <div>URL Registrasi Mandiri:</div>
                <a
                  href={selfRegUrl}
                  target="_blank"
                  rel="noreferrer"
                  style={{ color: '#38bdf8', fontWeight: '900', wordBreak: 'break-all', fontSize: '0.85rem', display: 'inline-block', marginTop: '4px', textDecoration: 'underline' }}
                >
                  {selfRegUrl}
                </a>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => {
                    window.open(selfRegUrl, '_blank');
                  }}
                  style={{ width: '100%', padding: '14px', background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)', color: 'var(--pos-txt-white)', border: 'none', borderRadius: '12px', fontWeight: '900', fontSize: '0.90rem', cursor: 'pointer', boxShadow: '0 4px 14px rgba(37,99,235,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                >
                  <QrCode size={18} />
                  <span>Buka Form Registrasi Mandiri di Tab Baru</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(selfRegUrl);
                    alert("Link Registrasi Mandiri Pelanggan berhasil disalin!");
                  }}
                  style={{ width: '100%', padding: '12px', background: 'rgba(56,189,248,0.15)', border: '1px solid rgba(56,189,248,0.3)', color: '#38bdf8', borderRadius: '12px', fontWeight: '800', fontSize: '0.82rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                >
                  Salin Link Registrasi Mandiri
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
                        outlet_id: currentOutlet.id || (outlets[0]?.id) || 1,
                        outlet_name: currentOutlet.name || outlets[0]?.name || 'Outlet Barokah',
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
                  style={{ width: '100%', padding: '12px', background: 'var(--pos-border-card)', color: 'var(--pos-txt-secondary)', border: 'none', borderRadius: '12px', fontWeight: '800', fontSize: '0.82rem', cursor: 'pointer' }}
                >
                  Fast-Test Simulasi di Layar Ini
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* 12. MODAL INTERAKTIF DETAIL SHIFT PENGGUNA APLIKASI */}
      {selectedShiftDetailModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9998
        }}>
          <div className="glass-card animate-fade-in" style={{ width: '100%', maxWidth: '580px', maxHeight: '92vh', overflowY: 'auto', padding: '24px', background: 'var(--pos-bg-card)', borderRadius: '18px' }}>
            {/* Header Modal */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid var(--pos-border)', paddingBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Clock size={22} color="#38bdf8" />
                <h3 style={{ fontSize: '1.1rem', fontWeight: '900', color: 'var(--pos-txt-primary)', margin: 0 }}>
                  Rincian Sesi Shift - {selectedShiftDetailModal.user_name || selectedShiftDetailModal.cashier_name || selectedShiftDetailModal.author_name || selectedShiftDetailModal.submitted_by || selectedShiftDetailModal.name || 'Pengguna POS'}
                </h3>
              </div>
              <button onClick={() => setSelectedShiftDetailModal(null)} style={{ background: 'none', border: 'none', color: 'var(--pos-txt-secondary)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            {/* Profile & Shift Info Summary Card */}
            <div style={{ background: 'var(--pos-bg-app)', borderRadius: '14px', padding: '16px', border: '1px solid var(--pos-border-card)', marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div>
                  <div style={{ fontSize: '1rem', fontWeight: '900', color: 'var(--pos-txt-primary)' }}>
                    {selectedShiftDetailModal.user_name || selectedShiftDetailModal.cashier_name || selectedShiftDetailModal.author_name || selectedShiftDetailModal.submitted_by || selectedShiftDetailModal.name || 'Pengguna POS'}
                  </div>
                  <div style={{ fontSize: '0.76rem', color: 'var(--pos-txt-secondary)' }}>
                    {selectedShiftDetailModal.username ? `@${selectedShiftDetailModal.username}` : (selectedShiftDetailModal.role || 'Staf Kasir')}
                  </div>
                </div>
                <span style={{ fontSize: '0.70rem', fontWeight: '900', padding: '3px 10px', borderRadius: '12px', background: selectedShiftDetailModal.status === 'AKTIF BERLANGSUNG' ? 'rgba(56,189,248,0.2)' : 'rgba(148,163,184,0.15)', color: selectedShiftDetailModal.status === 'AKTIF BERLANGSUNG' ? '#38bdf8' : '#cbd5e1' }}>
                  {selectedShiftDetailModal.status}
                </span>
              </div>

              {/* Login/Logout Time & Duration */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', background: 'var(--pos-bg-card)', padding: '12px', borderRadius: '10px', fontSize: '0.78rem' }}>
                <div>
                  <div style={{ color: 'var(--pos-txt-secondary)', fontSize: '0.70rem' }}>Waktu Login:</div>
                  <div style={{ fontWeight: '800', color: '#34d399', marginTop: '2px' }}>{selectedShiftDetailModal.login_time}</div>
                </div>
                <div>
                  <div style={{ color: 'var(--pos-txt-secondary)', fontSize: '0.70rem' }}>Waktu Logout:</div>
                  <div style={{ fontWeight: '800', color: 'var(--pos-txt-primary)', marginTop: '2px' }}>{selectedShiftDetailModal.logout_time}</div>
                </div>
              </div>

              <div style={{ marginTop: '8px', fontSize: '0.78rem', color: '#fbbf24', fontWeight: '900', textAlign: 'center' }}>
                Durasi Kerja Kasir: {selectedShiftDetailModal.duration_label}
              </div>
            </div>

            {/* Financial & Struk Breakdown Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '16px' }}>
              <div style={{ background: 'var(--pos-bg-app)', padding: '10px', borderRadius: '10px', border: '1px solid var(--pos-border-card)', textAlign: 'center' }}>
                <div style={{ fontSize: '0.68rem', color: 'var(--pos-txt-secondary)' }}>Total Struk</div>
                <div style={{ fontSize: '1rem', fontWeight: '900', color: 'var(--pos-txt-primary)', marginTop: '2px' }}>
                  {selectedShiftDetailModal.total_receipts || selectedShiftDetailModal.total_transactions || (selectedShiftDetailModal.transactions ? selectedShiftDetailModal.transactions.length : 0)} Struk
                </div>
              </div>
              <div style={{ background: 'var(--pos-bg-app)', padding: '10px', borderRadius: '10px', border: '1px solid var(--pos-border-card)', textAlign: 'center' }}>
                <div style={{ fontSize: '0.68rem', color: 'var(--pos-txt-secondary)' }}>Total Omset</div>
                <div style={{ fontSize: '1rem', fontWeight: '900', color: '#34d399', marginTop: '2px' }}>
                  {formatRupiah(selectedShiftDetailModal.total_sales || selectedShiftDetailModal.net_sales || selectedShiftDetailModal.gross_sales || 0)}
                </div>
              </div>
              <div style={{ background: 'var(--pos-bg-app)', padding: '10px', borderRadius: '10px', border: '1px solid var(--pos-border-card)', textAlign: 'center' }}>
                <div style={{ fontSize: '0.68rem', color: 'var(--pos-txt-secondary)' }}>Kas Tunai</div>
                <div style={{ fontSize: '1rem', fontWeight: '900', color: '#38bdf8', marginTop: '2px' }}>
                  {formatRupiah(selectedShiftDetailModal.cash_sales || selectedShiftDetailModal.actual_cash || selectedShiftDetailModal.cash_physical || 0)}
                </div>
              </div>
            </div>

            {/* List of Receipts / Transactions during shift */}
            <div style={{ fontSize: '0.80rem', fontWeight: '800', color: 'var(--pos-txt-secondary)', marginBottom: '8px' }}>
              Daftar Struk Transaksi Dalam Shift Ini:
            </div>
            <div style={{ background: 'var(--pos-bg-app)', borderRadius: '12px', border: '1px solid var(--pos-border-card)', maxHeight: '180px', overflowY: 'auto', marginBottom: '20px' }}>
              {(!selectedShiftDetailModal.transactions || selectedShiftDetailModal.transactions.length === 0) ? (
                <div style={{ padding: '16px', textAlign: 'center', color: 'var(--pos-txt-secondary)', fontSize: '0.78rem' }}>
                  Belum ada transaksi struk pada sesi shift ini.
                </div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.78rem' }}>
                  <thead>
                    <tr style={{ background: 'var(--pos-bg-card)', color: 'var(--pos-txt-secondary)', borderBottom: '1px solid var(--pos-border-card)' }}>
                      <th style={{ padding: '8px 12px' }}>No. Struk</th>
                      <th style={{ padding: '8px 12px' }}>Jam</th>
                      <th style={{ padding: '8px 12px' }}>Pelanggan</th>
                      <th style={{ padding: '8px 12px' }}>Bayar</th>
                      <th style={{ padding: '8px 12px', textAlign: 'right' }}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(selectedShiftDetailModal.transactions || []).map((tx, tIdx) => (
                      <tr key={tIdx} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        <td style={{ padding: '8px 12px', fontWeight: '800', color: '#38bdf8' }}>{tx.id}</td>
                        <td style={{ padding: '8px 12px', color: 'var(--pos-txt-secondary)' }}>{tx.time || '10:00'}</td>
                        <td style={{ padding: '8px 12px', color: 'var(--pos-txt-primary)' }}>{tx.customer_name || 'Pelanggan Umum'}</td>
                        <td style={{ padding: '8px 12px', color: '#34d399', fontWeight: '800' }}>{tx.payment_method || 'Cash'}</td>
                        <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: '900', color: 'var(--pos-txt-primary)' }}>{formatRupiah(tx.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Modal Actions */}
            {/* PRINTER STATUS BANNER — modal cetak laporan shift closing */}
            {renderPrinterStatusBanner()}
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setSelectedShiftDetailModal(null)}
                style={{ flex: 1, padding: '12px', background: 'var(--pos-border-card)', color: 'var(--pos-txt-primary)', border: 'none', borderRadius: '10px', fontWeight: '800', cursor: 'pointer' }}
              >
                Tutup
              </button>
              <button
                type="button"
                onClick={() => handlePrintShiftClosingReport(selectedShiftDetailModal)}
                style={{ flex: 1, padding: '12px', background: '#38bdf8', color: 'var(--pos-bg-app)', border: 'none', borderRadius: '10px', fontWeight: '900', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
              >
                <Printer size={16} />
                <span>Cetak Laporan Shift</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL INPUT LAPORAN HARIAN MANUAL (MOBILE / TABLET POS KASIR) */}
      {showAddManualReportModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.90)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '16px'
        }}>
          <div className="glass-card animate-fade-in" style={{
            width: '100%', maxWidth: '940px', maxHeight: '92vh', overflowY: 'auto',
            padding: '24px', background: 'var(--pos-bg-card)', border: '1px solid #38bdf8', borderRadius: '20px',
            display: 'flex', flexDirection: 'column', gap: '20px', boxShadow: '0 20px 50px rgba(0,0,0,0.6)'
          }}>
            {/* Header Modal */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--pos-border-card)', paddingBottom: '14px' }}>
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: '900', color: '#38bdf8', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <FileText size={22} color="#38bdf8" />
                  <span>Form Laporan Keuangan Harian (POS Kasir Tablet)</span>
                </h3>
                <span style={{ fontSize: '0.76rem', color: 'var(--pos-txt-secondary)' }}>
                  Nomor Laporan: <strong style={{ color: '#38bdf8' }}>{manualRepNo}</strong>
                </span>
              </div>
              <button type="button" onClick={() => setShowAddManualReportModal(false)} style={{ background: 'var(--pos-bg-app)', border: 'none', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--pos-txt-secondary)', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            {(() => {
              const ingredientsList = masterData.ingredients || [];
              const expenseMasterList = masterData.expenseMaster || [];

              const expenseSuggestions = [
                ...ingredientsList.map(i => ({
                  name: i.name,
                  category_type: 'HPP Bahan Baku',
                  unit: i.unit || 'kg',
                  price: i.cost || i.price || 0
                })),
                ...expenseMasterList.map(e => ({
                  name: e.name || e.title,
                  category_type: e.category || e.type || 'Beban Operasional',
                  unit: e.unit || 'bulan',
                  price: e.price || e.amount || 0
                }))
              ];

              // AUTO-GENERATED SALES COMPUTATION FOR SELECTED DATE UNTIL 23:59:59
              const matchedSales = (outletTransactions || masterData.salesTransactions || []).filter(t => !t.date || String(t.date || t.created_at || '').substring(0, 10) === manualRepDate);
              
              const autoCashVal = matchedSales
                .filter(t => !t.payment_method || t.payment_method.toLowerCase() === 'cash' || t.payment_method.toLowerCase() === 'tunai')
                .reduce((sum, t) => sum + Number(t.amount || t.total || 0), 0) || Number(manualRepNetSales || 0);

              const autoNonCashVal = matchedSales
                .filter(t => t.payment_method && t.payment_method.toLowerCase() !== 'cash' && t.payment_method.toLowerCase() !== 'tunai')
                .reduce((sum, t) => sum + Number(t.amount || t.total || 0), 0) || Number(manualRepNonCash || 0);

              const autoDiscountVal = matchedSales.reduce((sum, t) => sum + Number(t.discount || t.discount_amount || 0), 0) || Number(manualRepSalesDiscount || 0);

              // 1. TOTAL PENDAPATAN = Cash + Non Cash - Diskon
              const computedTotalIncome = Math.max(0, (autoCashVal + autoNonCashVal) - autoDiscountVal);

              // 2. TOTAL PENGELUARAN = Sum of manualExpenseRows subtotal
              const totalPengeluaran = (manualExpenseRows || []).reduce((sum, r) => sum + (Number(r.subtotal || r.amount) || 0), 0);

              // 3. LABA KOTOR = TOTAL PENDAPATAN - TOTAL PENGELUARAN
              const labaKotor = computedTotalIncome - totalPengeluaran;

              // 4. UANG DI LACI = LABA KOTOR - NON CASH - DISKON
              const uangDiLaci = labaKotor - autoNonCashVal - autoDiscountVal;

              // 5. PENGAMBILAN MODAL
              const modalSaatIniVal = Number(manualModalSaatIni || 0);
              const modalSeharusnyaVal = Number(manualModalSeharusnya || 0);
              const totalModalReturned = (manualCashReturnRows || []).reduce((sum, r) => sum + Number(r.amount_returned || r.returnAmount || 0), 0);
              const sisaHutangModal = modalSeharusnyaVal - (modalSaatIniVal + totalModalReturned);

              return (
                <form onSubmit={e => {
                  e.preventDefault();
                  const newReportObj = {
                    id: manualRepNo,
                    report_no: manualRepNo,
                    date: manualRepDate,
                    outlet_id: manualRepOutletId,
                    branch_name: (masterData.outlets || []).find(o => o.id === manualRepOutletId)?.name || currentOutlet.name || outlets[0]?.name || 'Outlet Barokah',
                    author_name: manualRepAuthor || userSession?.name || 'Kasir',
                    submitted_by: manualRepAuthor || userSession?.name || 'Kasir',
                    cashier_name: manualRepAuthor || userSession?.name || 'Kasir',
                    cashier: manualRepAuthor || userSession?.name || 'Kasir',
                    submitter_type: 'POS Kasir',
                    net_sales: computedTotalIncome,
                    cash_sales: autoCashVal,
                    non_cash_sales: autoNonCashVal,
                    sales_discount: autoDiscountVal,
                    expense_rows: manualExpenseRows,
                    total_expense: totalPengeluaran,
                    cogs_expense: (manualExpenseRows || []).filter(r => (r.category_type || '').includes('HPP')).reduce((sum, r) => sum + (r.subtotal || 0), 0),
                    gross_profit: labaKotor,
                    cash_in_drawer: uangDiLaci,
                    cash_physical: uangDiLaci,
                    actual_cash: uangDiLaci,
                    modal_ideal: modalSeharusnyaVal,
                    modal_saat_ini: modalSaatIniVal,
                    modal_seharusnya: modalSeharusnyaVal,
                    modal_refund_rows: manualCashReturnRows,
                    total_modal_returned: totalModalReturned,
                    modal_debt_remaining: sisaHutangModal,
                    status: 'Pending', // Initial Status for POS Kasir: Pending (Menunggu Persetujuan Web Admin)
                    approval_status: 'Pending',
                    notes: manualRepNotes || 'Laporan Harian POS Kasir Tablet'
                  };

                  // Auto-generate Logistics (Stok Masuk HPP) entries from HPP expense rows
                  const autoLogisticsEntries = (manualExpenseRows || [])
                    .filter(r => (r.category_type || '').includes('HPP') && r.item_name)
                    .map((r, idx) => {
                      const existingIng = (masterData.ingredients || []).find(ing => (ing.name || '').toLowerCase() === (r.item_name || '').toLowerCase());
                      const currentStock = existingIng ? Number(existingIng.stock || 0) : 0;
                      const addQty = Number(r.qty || 1);
                      return {
                        id: `LOG-AUTO-${manualRepNo}-${idx}`,
                        report_no: manualRepNo,
                        date: manualRepDate,
                        outlet_id: manualRepOutletId,
                        branch_name: (masterData.outlets || []).find(o => o.id === manualRepOutletId)?.name || currentOutlet.name || outlets[0]?.name || 'Outlet Barokah',
                        submitted_by: manualRepAuthor || userSession?.name || 'Kasir',
                        created_by: manualRepAuthor || userSession?.name || 'Kasir',
                        item_name: r.item_name,
                        stok_awal: currentStock,
                        stok_masuk: addQty,
                        transfer_masuk: 0,
                        transfer_keluar: 0,
                        stok_rusak: 0,
                        stok_fisik: currentStock + addQty,
                        unit: r.unit || 'kg',
                        status: 'Pending',
                        type_input: 'by laporan harian (otomatis)',
                        notes: `Auto-stream HPP Laporan Harian ${manualRepNo}`
                      };
                    });

                  setShowAddManualReportModal(false);

                  setMasterData(prev => {
                    const now = Date.now();

                    // Update ingredient stock for matching HPP items
                    const updatedIngredients = (prev.ingredients || []).map(ing => {
                      const matchedRows = (manualExpenseRows || []).filter(r => (r.category_type || '').includes('HPP') && (r.item_name || '').toLowerCase() === (ing.name || '').toLowerCase());
                      if (matchedRows.length > 0) {
                        const totalAddedQty = matchedRows.reduce((sum, r) => sum + Number(r.qty || 0), 0);
                        const newStock = Number(ing.stock || 0) + totalAddedQty;
                        return { ...ing, stock: newStock, stok: newStock };
                      }
                      return ing;
                    });

                    const newMaster = {
                      ...prev,
                      _lastUpdated: now,
                      clientUpdated: now,
                      ingredients: updatedIngredients,
                      manualEntryRecords: [newReportObj, ...(prev.manualEntryRecords || []).filter(i => i.id !== newReportObj.id)],
                      approvedFinanceDaily: [newReportObj, ...(prev.approvedFinanceDaily || []).filter(i => i.id !== newReportObj.id)],
                      stockOpname: [...autoLogisticsEntries, ...(prev.stockOpname || []).filter(s => !autoLogisticsEntries.some(a => a.id === s.id))],
                      approvedLogistics: [...autoLogisticsEntries, ...(prev.approvedLogistics || []).filter(s => !autoLogisticsEntries.some(a => a.id === s.id))]
                    };

                    saveToServerWithGuard(newMaster);

                    return newMaster;
                  });

                  alert(`Laporan Harian ${manualRepNo} berhasil dikirim ke Web Admin (Status: Pending / Menunggu Persetujuan)!`);
                }} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

                  {/* 1. HEADER PARAMETERS */}
                  <div style={{ background: 'var(--pos-bg-app)', padding: '16px', borderRadius: '14px', border: '1px solid var(--pos-border-card)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
                    <div>
                      <label style={{ fontSize: '0.74rem', color: '#38bdf8', display: 'block', marginBottom: '4px', fontWeight: '800' }}>Target Outlet</label>
                      <input
                        type="text"
                        readOnly
                        value={currentOutlet?.name || outlets[0]?.name || 'Outlet Barokah'}
                        style={{ width: '100%', padding: '9px 12px', background: 'var(--pos-bg-card)', color: '#38bdf8', fontWeight: '800', border: '1px solid #38bdf8', borderRadius: '8px', fontSize: '0.82rem' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.74rem', color: 'var(--pos-txt-secondary)', display: 'block', marginBottom: '4px', fontWeight: '700' }}>Tanggal Pelaporan *</label>
                      <input
                        type="date"
                        required
                        value={manualRepDate}
                        onChange={e => setManualRepDate(e.target.value)}
                        style={{ width: '100%', padding: '9px 12px', background: 'var(--pos-bg-card)', color: 'var(--pos-txt-primary)', border: '1px solid var(--pos-border-card)', borderRadius: '8px', fontSize: '0.82rem' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.74rem', color: 'var(--pos-txt-secondary)', display: 'block', marginBottom: '4px', fontWeight: '700' }}>Dibuat Oleh (Kasir) *</label>
                      <input
                        type="text"
                        readOnly
                        value={manualRepAuthor || userSession?.name || 'Kasir'}
                        style={{ width: '100%', padding: '9px 12px', background: 'var(--pos-bg-card)', color: '#34d399', fontWeight: '800', border: '1px solid var(--pos-border-card)', borderRadius: '8px', fontSize: '0.82rem' }}
                      />
                    </div>
                  </div>

                  {/* BAGIAN 1: LAPORAN PENJUALAN & TOTAL PENDAPATAN */}
                  <div style={{ background: 'var(--pos-bg-app)', padding: '18px', borderRadius: '14px', border: '1px solid var(--pos-border-card)', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <div style={{ fontSize: '0.90rem', fontWeight: '900', color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px dashed var(--pos-border-card)', paddingBottom: '10px' }}>
                      <DollarSign size={18} color="#38bdf8" />
                      <span>1. Laporan Penjualan &amp; Total Pendapatan (s/d Pukul 23:59:59)</span>
                    </div>

                    <div style={{ fontSize: '0.74rem', color: 'var(--pos-txt-secondary)', background: 'rgba(56, 189, 248, 0.08)', padding: '8px 12px', borderRadius: '8px', border: '1px solid rgba(56, 189, 248, 0.2)' }}>
                      Penjualan Cash &amp; Non Cash terisi otomatis berdasarkan transaksi POS tanggal <strong>{manualRepDate}</strong> hingga pukul 23:59:59.
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
                      <div>
                        <label style={{ fontSize: '0.74rem', color: 'var(--pos-txt-secondary)', fontWeight: '700' }}>Penjualan Cash (Tunai):</label>
                        <input
                          type="number"
                          value={autoCashVal}
                          onChange={e => setManualRepNetSales(Number(e.target.value))}
                          style={{ width: '100%', padding: '9px 12px', background: 'var(--pos-bg-card)', border: '1px solid var(--pos-border-card)', borderRadius: '8px', color: '#34d399', fontWeight: '900', fontSize: '0.88rem' }}
                        />
                      </div>

                      <div>
                        <label style={{ fontSize: '0.74rem', color: 'var(--pos-txt-secondary)', fontWeight: '700' }}>Penjualan Non-Cash (EDC/QRIS):</label>
                        <input
                          type="number"
                          value={autoNonCashVal}
                          onChange={e => setManualRepNonCash(Number(e.target.value))}
                          style={{ width: '100%', padding: '9px 12px', background: 'var(--pos-bg-card)', border: '1px solid var(--pos-border-card)', borderRadius: '8px', color: '#38bdf8', fontWeight: '900', fontSize: '0.88rem' }}
                        />
                      </div>

                      <div>
                        <label style={{ fontSize: '0.74rem', color: '#fb7185', fontWeight: '700' }}>Diskon Penjualan (Potongan):</label>
                        <input
                          type="number"
                          value={manualRepSalesDiscount || 0}
                          onChange={e => setManualRepSalesDiscount(Number(e.target.value))}
                          style={{ width: '100%', padding: '9px 12px', background: 'var(--pos-bg-card)', border: '1px solid rgba(251, 113, 133, 0.4)', borderRadius: '8px', color: '#fb7185', fontWeight: '900', fontSize: '0.88rem' }}
                        />
                      </div>
                    </div>

                    <div style={{ background: 'var(--pos-bg-card)', padding: '12px 16px', borderRadius: '10px', border: '1px solid #38bdf8', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: '800', color: '#38bdf8' }}>TOTAL PENDAPATAN (Cash + Non Cash - Diskon):</span>
                      <span style={{ fontSize: '1.2rem', fontWeight: '900', color: '#38bdf8' }}>{formatRupiah(computedTotalIncome)}</span>
                    </div>
                  </div>

                  {/* BAGIAN 2: DATA PENGELUARAN (MULTI-ROW WITH AUTO-SUGGESTION & SATUAN) */}
                  <div style={{ background: 'var(--pos-bg-app)', padding: '18px', borderRadius: '14px', border: '1px solid var(--pos-border-card)', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px dashed var(--pos-border-card)', paddingBottom: '10px' }}>
                      <div style={{ fontSize: '0.90rem', fontWeight: '900', color: '#fb7185', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Receipt size={18} color="#fb7185" />
                        <span>2. Data Pengeluaran (Bahan Baku &amp; Beban Operasional)</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setManualExpenseRows(prev => [
                            ...(prev || []),
                            { id: Date.now() + Math.random(), item_name: '', category_type: 'HPP Bahan Baku', qty: 1, unit: 'kg', price_per_unit: 0, subtotal: 0 }
                          ]);
                        }}
                        style={{ padding: '6px 12px', background: 'rgba(251, 113, 133, 0.15)', border: '1px solid #fb7185', borderRadius: '8px', color: '#fb7185', fontWeight: '800', fontSize: '0.76rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                      >
                        <Plus size={14} /> + Tambah Baris Pengeluaran
                      </button>
                    </div>

                    {/* TABLE MULTI-ROW PENGELUARAN */}
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.80rem' }}>
                        <thead>
                          <tr style={{ background: 'var(--pos-bg-card)', borderBottom: '1px solid var(--pos-border-card)', color: 'var(--pos-txt-secondary)', textAlign: 'left' }}>
                            <th style={{ padding: '8px 10px', minWidth: '180px' }}>Sugesti Nama Bahan / Item *</th>
                            <th style={{ padding: '8px 10px', minWidth: '140px' }}>Kategori (HPP / Biaya)</th>
                            <th style={{ padding: '8px 10px', width: '90px' }}>Jumlah (Qty)</th>
                            <th style={{ padding: '8px 10px', width: '90px' }}>Satuan</th>
                            <th style={{ padding: '8px 10px', minWidth: '120px' }}>Harga Satuan (IDR)</th>
                            <th style={{ padding: '8px 10px', minWidth: '120px', textAlign: 'right' }}>Subtotal</th>
                            <th style={{ padding: '8px 10px', width: '40px', textAlign: 'center' }}>Hapus</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(manualExpenseRows || []).map((row) => (
                            <tr key={row.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                              <td style={{ padding: '6px 8px' }}>
                                <div style={{ position: 'relative', width: '100%' }}>
                                  <input
                                    type="text"
                                    value={row.item_name || row.name || ''}
                                    onFocus={() => setActiveSuggestRowId(`exp-${row.id}`)}
                                    onBlur={() => setTimeout(() => setActiveSuggestRowId(null), 250)}
                                    onChange={e => {
                                      const val = e.target.value;
                                      const foundSug = expenseSuggestions.find(s => s.name.toLowerCase() === val.toLowerCase());
                                      setManualExpenseRows(prev => (prev || []).map(r => {
                                        if (r.id === row.id) {
                                          const cat = foundSug ? foundSug.category_type : (r.category_type || 'HPP Bahan Baku');
                                          const unt = foundSug ? foundSug.unit : (r.unit || 'kg');
                                          const prc = foundSug ? foundSug.price : (r.price_per_unit || 0);
                                          const q = Number(r.qty || 1);
                                          return { ...r, item_name: val, name: val, category_type: cat, unit: unt, price_per_unit: prc, subtotal: q * prc, amount: q * prc };
                                        }
                                        return r;
                                      }));
                                      setActiveSuggestRowId(`exp-${row.id}`);
                                    }}
                                    placeholder="Ketik / pilih bahan baku..."
                                    style={{ width: '100%', padding: '6px 10px', background: 'var(--pos-bg-card)', border: activeSuggestRowId === `exp-${row.id}` ? '1.5px solid #38bdf8' : '1px solid var(--pos-border-card)', borderRadius: '6px', color: 'var(--pos-txt-primary)', fontSize: '0.80rem', fontWeight: '800', outline: 'none' }}
                                  />

                                  {/* FLOATING DROPDOWN SUGESTI OTOMATIS */}
                                  {activeSuggestRowId === `exp-${row.id}` && (
                                    <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 9999, background: '#0f172a', border: '1.5px solid #38bdf8', borderRadius: '8px', marginTop: '4px', maxHeight: '200px', overflowY: 'auto', boxShadow: '0 8px 24px rgba(0,0,0,0.6)' }}>
                                      {expenseSuggestions
                                        .filter(s => !(row.item_name || '') || (s.name || '').toLowerCase().includes((row.item_name || '').toLowerCase()))
                                        .slice(0, 10)
                                        .map((sug, i) => (
                                          <div
                                            key={i}
                                            onMouseDown={(e) => {
                                              e.preventDefault();
                                              const q = Number(row.qty || 1);
                                              const prc = Number(sug.price || 0);
                                              setManualExpenseRows(prev => (prev || []).map(r => r.id === row.id ? {
                                                ...r,
                                                item_name: sug.name,
                                                name: sug.name,
                                                category_type: sug.category_type || 'HPP Bahan Baku',
                                                unit: sug.unit || 'kg',
                                                price_per_unit: prc,
                                                subtotal: q * prc,
                                                amount: q * prc
                                              } : r));
                                              setActiveSuggestRowId(null);
                                            }}
                                            style={{ padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.78rem' }}
                                            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(56, 189, 248, 0.25)'}
                                            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                          >
                                            <div>
                                              <strong style={{ color: '#f8fafc', display: 'block' }}>{sug.name}</strong>
                                              <span style={{ fontSize: '0.70rem', color: '#38bdf8' }}>{sug.category_type} • Satuan: {sug.unit || 'kg'} • Rp {Number(sug.price || 0).toLocaleString('id-ID')}</span>
                                            </div>
                                            <span style={{ background: '#38bdf8', color: '#000000', padding: '2px 8px', borderRadius: '4px', fontWeight: '900', fontSize: '0.68rem' }}>Salin ↵</span>
                                          </div>
                                        ))}
                                    </div>
                                  )}
                                </div>
                              </td>

                              <td style={{ padding: '6px 8px' }}>
                                <select
                                  value={row.category_type || 'HPP Bahan Baku'}
                                  onChange={e => {
                                    const cat = e.target.value;
                                    setManualExpenseRows(prev => (prev || []).map(r => r.id === row.id ? { ...r, category_type: cat } : r));
                                  }}
                                  style={{ width: '100%', padding: '6px 8px', background: 'var(--pos-bg-card)', border: '1px solid var(--pos-border-card)', borderRadius: '6px', color: '#38bdf8', fontSize: '0.78rem' }}
                                >
                                  <option value="HPP Bahan Baku">HPP Bahan Baku</option>
                                  <option value="Beban Operasional">Beban Operasional</option>
                                  <option value="Beban Listrik/Air/Internet">Beban Listrik/Air/Utilitas</option>
                                  <option value="Beban Gaji & Upah">Beban Gaji &amp; Upah</option>
                                  <option value="Kas Kecil / Petty Cash">Kas Kecil / Petty Cash</option>
                                </select>
                              </td>

                              <td style={{ padding: '6px 8px' }}>
                                <input
                                  type="number"
                                  step="any"
                                  min="0"
                                  value={row.qty || 1}
                                  onChange={e => {
                                    const q = Number(e.target.value) || 0;
                                    setManualExpenseRows(prev => (prev || []).map(r => {
                                      if (r.id === row.id) {
                                        const p = Number(r.price_per_unit || 0);
                                        return { ...r, qty: q, subtotal: q * p, amount: q * p };
                                      }
                                      return r;
                                    }));
                                  }}
                                  style={{ width: '100%', padding: '6px 8px', background: 'var(--pos-bg-card)', border: '1px solid var(--pos-border-card)', borderRadius: '6px', color: 'var(--pos-txt-primary)', fontSize: '0.80rem', textAlign: 'center' }}
                                />
                              </td>

                              <td style={{ padding: '6px 8px' }}>
                                <input
                                  type="text"
                                  value={row.unit || 'kg'}
                                  onChange={e => {
                                    const u = e.target.value;
                                    setManualExpenseRows(prev => (prev || []).map(r => r.id === row.id ? { ...r, unit: u } : r));
                                  }}
                                  placeholder="kg/liter/pcs"
                                  style={{ width: '100%', padding: '6px 8px', background: 'var(--pos-bg-card)', border: '1px solid var(--pos-border-card)', borderRadius: '6px', color: 'var(--pos-txt-secondary)', fontSize: '0.78rem', textAlign: 'center' }}
                                />
                              </td>

                              <td style={{ padding: '6px 8px' }}>
                                <input
                                  type="number"
                                  min="0"
                                  value={row.price_per_unit || 0}
                                  onChange={e => {
                                    const p = Number(e.target.value) || 0;
                                    setManualExpenseRows(prev => (prev || []).map(r => {
                                      if (r.id === row.id) {
                                        const q = Number(r.qty || 1);
                                        return { ...r, price_per_unit: p, subtotal: q * p, amount: q * p };
                                      }
                                      return r;
                                    }));
                                  }}
                                  style={{ width: '100%', padding: '6px 8px', background: 'var(--pos-bg-card)', border: '1px solid var(--pos-border-card)', borderRadius: '6px', color: 'var(--pos-txt-primary)', fontSize: '0.80rem', textAlign: 'right' }}
                                />
                              </td>

                              <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: '800', color: '#fb7185' }}>
                                {formatRupiah(row.subtotal || row.amount || 0)}
                              </td>

                              <td style={{ padding: '6px 8px', textAlign: 'center' }}>
                                <button
                                  type="button"
                                  onClick={() => setManualExpenseRows(prev => (prev || []).filter(r => r.id !== row.id))}
                                  style={{ background: 'none', border: 'none', color: '#f43f5e', cursor: 'pointer', fontSize: '0.9rem', fontWeight: '900' }}
                                >
                                  
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div style={{ background: 'var(--pos-bg-card)', padding: '12px 16px', borderRadius: '10px', border: '1px solid #fb7185', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: '800', color: '#fb7185' }}>TOTAL PENGELUARAN (Qty &times; Harga Satuan):</span>
                      <span style={{ fontSize: '1.2rem', fontWeight: '900', color: '#fb7185' }}>{formatRupiah(totalPengeluaran)}</span>
                    </div>
                  </div>

                  {/* BAGIAN 3 & 4: LABA KOTOR & UANG DI LACI */}
                  <div style={{ background: 'var(--pos-bg-app)', padding: '18px', borderRadius: '14px', border: '1px solid var(--pos-border-card)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '14px' }}>
                    <div style={{ background: 'var(--pos-bg-card)', padding: '14px', borderRadius: '12px', border: '1px solid #34d399', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <span style={{ fontSize: '0.78rem', color: '#34d399', fontWeight: '800' }}>3. TOTAL LABA KOTOR:</span>
                      <span style={{ fontSize: '1.25rem', fontWeight: '900', color: '#34d399' }}>{formatRupiah(labaKotor)}</span>
                      <span style={{ fontSize: '0.70rem', color: 'var(--pos-txt-secondary)' }}>(Total Pendapatan dikurangi Total Pengeluaran)</span>
                    </div>

                    <div style={{ background: 'var(--pos-bg-card)', padding: '14px', borderRadius: '12px', border: '1px solid #fbbf24', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <span style={{ fontSize: '0.78rem', color: '#fbbf24', fontWeight: '800' }}>4. UANG DI LACI (CASH IN DRAWER):</span>
                      <span style={{ fontSize: '1.25rem', fontWeight: '900', color: '#fbbf24' }}>{formatRupiah(uangDiLaci)}</span>
                      <span style={{ fontSize: '0.70rem', color: 'var(--pos-txt-secondary)' }}>(Laba Kotor dikurangi Penjualan Non-Cash &amp; Diskon)</span>
                    </div>
                  </div>

                  <div style={{ fontSize: '0.74rem', color: 'var(--pos-txt-secondary)', background: 'rgba(251, 191, 36, 0.08)', padding: '8px 12px', borderRadius: '8px', border: '1px solid rgba(251, 191, 36, 0.2)' }}>
                    ℹ<strong>Catatan Metrik:</strong> Indikator &quot;Uang Di Laci&quot; merupakan metrik fisik internal kasir shift dan tidak dimasukkan ke dalam Laporan Laba Rugi resmi.
                  </div>

                  {/* BAGIAN 5: PEMBAYARAN PENGAMBILAN MODAL (MODAL KASIR) */}
                  <div style={{ background: 'var(--pos-bg-app)', padding: '18px', borderRadius: '14px', border: '1px solid var(--pos-border-card)', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px dashed var(--pos-border-card)', paddingBottom: '10px' }}>
                      <div style={{ fontSize: '0.90rem', fontWeight: '900', color: '#c084fc', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Layers size={18} color="#c084fc" />
                        <span>5. Pembayaran Pengambilan Modal (Kasir / Restoran)</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setManualCashReturnRows(prev => [
                            ...(prev || []),
                            { id: Date.now() + Math.random(), date: manualRepDate, amount_returned: 0, notes: 'Pengembalian Modal' }
                          ]);
                        }}
                        style={{ padding: '6px 12px', background: 'rgba(192, 132, 252, 0.15)', border: '1px solid #c084fc', borderRadius: '8px', color: '#c084fc', fontWeight: '800', fontSize: '0.76rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                      >
                        <Plus size={14} /> + Tambah Baris Pengembalian Modal
                      </button>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
                      <div>
                        <label style={{ fontSize: '0.74rem', color: '#c084fc', fontWeight: '800', display: 'block', marginBottom: '4px' }}>Modal saat ini (IDR):</label>
                        <input
                          type="number"
                          value={manualModalSaatIni}
                          onChange={e => setManualModalSaatIni(Number(e.target.value))}
                          placeholder="0"
                          style={{ width: '100%', padding: '9px 12px', background: 'var(--pos-bg-card)', border: '1px solid #c084fc', borderRadius: '8px', color: 'var(--pos-txt-primary)', fontWeight: '800', fontSize: '0.85rem' }}
                        />
                      </div>

                      <div>
                        <label style={{ fontSize: '0.74rem', color: '#38bdf8', fontWeight: '800', display: 'block', marginBottom: '4px' }}>Modal seharusnya (IDR):</label>
                        <input
                          type="number"
                          value={manualModalSeharusnya}
                          onChange={e => setManualModalSeharusnya(Number(e.target.value))}
                          placeholder="0"
                          style={{ width: '100%', padding: '9px 12px', background: 'var(--pos-bg-card)', border: '1px solid #38bdf8', borderRadius: '8px', color: 'var(--pos-txt-primary)', fontWeight: '800', fontSize: '0.85rem' }}
                        />
                      </div>
                    </div>

                    {/* TABEL PENGEMBALIAN MODAL */}
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.80rem' }}>
                        <thead>
                          <tr style={{ background: 'var(--pos-bg-card)', borderBottom: '1px solid var(--pos-border-card)', color: 'var(--pos-txt-secondary)', textAlign: 'left' }}>
                            <th style={{ padding: '8px 10px', width: '140px' }}>Tanggal Pengembalian</th>
                            <th style={{ padding: '8px 10px', minWidth: '160px' }}>Jumlah Modal Dikembalikan (IDR)</th>
                            <th style={{ padding: '8px 10px' }}>Keterangan / Catatan</th>
                            <th style={{ padding: '8px 10px', width: '40px', textAlign: 'center' }}>Hapus</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(manualCashReturnRows || []).map(row => (
                            <tr key={row.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                              <td style={{ padding: '6px 8px' }}>
                                <input
                                  type="date"
                                  value={row.date || manualRepDate}
                                  onChange={e => {
                                    const val = e.target.value;
                                    setManualCashReturnRows(prev => (prev || []).map(r => r.id === row.id ? { ...r, date: val } : r));
                                  }}
                                  style={{ width: '100%', padding: '6px 8px', background: 'var(--pos-bg-card)', border: '1px solid var(--pos-border-card)', borderRadius: '6px', color: 'var(--pos-txt-primary)', fontSize: '0.78rem' }}
                                />
                              </td>
                              <td style={{ padding: '6px 8px' }}>
                                <input
                                  type="number"
                                  min="0"
                                  value={row.amount_returned || row.returnAmount || 0}
                                  onChange={e => {
                                    const val = Number(e.target.value) || 0;
                                    setManualCashReturnRows(prev => (prev || []).map(r => r.id === row.id ? { ...r, amount_returned: val, returnAmount: val } : r));
                                  }}
                                  placeholder="0"
                                  style={{ width: '100%', padding: '6px 8px', background: 'var(--pos-bg-card)', border: '1px solid var(--pos-border-card)', borderRadius: '6px', color: '#c084fc', fontWeight: '800', fontSize: '0.80rem' }}
                                />
                              </td>
                              <td style={{ padding: '6px 8px' }}>
                                <input
                                  type="text"
                                  value={row.notes || ''}
                                  onChange={e => {
                                    const val = e.target.value;
                                    setManualCashReturnRows(prev => (prev || []).map(r => r.id === row.id ? { ...r, notes: val } : r));
                                  }}
                                  placeholder="Catatan pengembalian modal..."
                                  style={{ width: '100%', padding: '6px 8px', background: 'var(--pos-bg-card)', border: '1px solid var(--pos-border-card)', borderRadius: '6px', color: 'var(--pos-txt-primary)', fontSize: '0.78rem' }}
                                />
                              </td>
                              <td style={{ padding: '6px 8px', textAlign: 'center' }}>
                                <button
                                  type="button"
                                  onClick={() => setManualCashReturnRows(prev => (prev || []).filter(r => r.id !== row.id))}
                                  style={{ background: 'none', border: 'none', color: '#f43f5e', cursor: 'pointer', fontSize: '0.9rem', fontWeight: '900' }}
                                >
                                  
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
                      <div style={{ background: 'var(--pos-bg-card)', padding: '12px 14px', borderRadius: '10px', border: '1px solid #c084fc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.80rem', fontWeight: '800', color: '#c084fc' }}>Total Modal Dikembalikan:</span>
                        <span style={{ fontSize: '1.05rem', fontWeight: '900', color: '#c084fc' }}>{formatRupiah(totalModalReturned)}</span>
                      </div>

                      <div style={{
                        background: 'var(--pos-bg-card)',
                        padding: '12px 14px',
                        borderRadius: '10px',
                        border: `1px solid ${sisaHutangModal < 0 ? '#f43f5e' : '#34d399'}`,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '4px'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.78rem', fontWeight: '800', color: sisaHutangModal < 0 ? '#f87171' : '#34d399' }}>
                            {sisaHutangModal < 0 ? 'Sisa Hutang Modal (Masih Ada Hutang):' : 'Sisa Uang Modal (Sisa Uang / Lunas):'}
                          </span>
                          <span style={{ fontSize: '1.05rem', fontWeight: '900', color: sisaHutangModal < 0 ? '#f87171' : '#34d399' }}>
                            {sisaHutangModal < 0 ? `- ${formatRupiah(Math.abs(sisaHutangModal))}` : formatRupiah(sisaHutangModal)}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.68rem', color: sisaHutangModal < 0 ? '#fb7185' : '#a7f3d0', fontWeight: '700' }}>
                          {sisaHutangModal < 0 ? 'Bernilai negatif (masih ada hutang)' : 'Bernilai positif (sisa uang)'}
                          <span style={{ opacity: 0.75, marginLeft: '6px' }}>[Modal seharusnya - (Modal saat ini + Total dikembalikan)]</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* CATATAN HARIAN */}
                  <div>
                    <label style={{ fontSize: '0.78rem', color: 'var(--pos-txt-secondary)', fontWeight: '700', display: 'block', marginBottom: '4px' }}>Catatan / Keterangan Shift Kasir</label>
                    <textarea
                      rows={2}
                      value={manualRepNotes}
                      onChange={e => setManualRepNotes(e.target.value)}
                      placeholder="Keterangan opsional laporan harian..."
                      style={{ width: '100%', padding: '8px 12px', background: 'var(--pos-bg-app)', border: '1px solid var(--pos-border-card)', borderRadius: '8px', color: 'var(--pos-txt-primary)', fontSize: '0.82rem', resize: 'none' }}
                    />
                  </div>

                  <div style={{ fontSize: '0.76rem', color: '#fbbf24', fontWeight: '800' }}>
                    Laporan Harian yang Anda kirim akan masuk dengan status &quot;Pending&quot; (Menunggu Persetujuan Admin Central).
                  </div>

                  {/* SUBMIT BUTTONS */}
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', borderTop: '1px solid var(--pos-border-card)', paddingTop: '14px' }}>
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
                      style={{ padding: '8px 24px', fontSize: '0.82rem', background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)', color: 'var(--pos-txt-white)', fontWeight: '900' }}
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
          <div className="glass-card animate-fade-in" style={{ width: '100%', maxWidth: '520px', padding: '24px', background: 'var(--pos-bg-card)', borderRadius: '18px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--pos-border)', paddingBottom: '12px' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: '900', color: 'var(--pos-txt-primary)', margin: 0 }}>
                Pratinjau Laporan {previewManualReport.report_no || previewManualReport.id}
              </h3>
              <button onClick={() => setPreviewManualReport(null)} style={{ background: 'none', border: 'none', color: 'var(--pos-txt-secondary)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ background: 'var(--pos-bg-app)', padding: '16px', borderRadius: '12px', border: '1px solid var(--pos-border-card)', display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.84rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--pos-txt-secondary)' }}>Tanggal Shift:</span>
                <span style={{ fontWeight: '800', color: 'var(--pos-txt-primary)' }}>{previewManualReport.date}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--pos-txt-secondary)' }}>Pembuat / Kasir:</span>
                <span style={{ fontWeight: '800', color: 'var(--pos-txt-primary)' }}>{previewManualReport.author_name}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--pos-txt-secondary)' }}>Pendapatan Net Sales:</span>
                <span style={{ fontWeight: '900', color: '#34d399' }}>{formatRupiah(previewManualReport.net_sales)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--pos-txt-secondary)' }}>Kas Non-Tunai (QRIS/EDC):</span>
                <span style={{ fontWeight: '800', color: '#a78bfa' }}>{formatRupiah(previewManualReport.non_cash_sales)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--pos-txt-secondary)' }}>Total Pengeluaran:</span>
                <span style={{ fontWeight: '800', color: '#fb7185' }}>-{formatRupiah(previewManualReport.total_expense)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed #334155', paddingTop: '8px' }}>
                <span style={{ color: 'var(--pos-txt-secondary)' }}>Uang Fisik Laci:</span>
                <span style={{ fontWeight: '900', color: '#38bdf8' }}>{formatRupiah(previewManualReport.cash_physical)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--pos-border-card)', paddingTop: '8px' }}>
                <span style={{ color: 'var(--pos-txt-secondary)' }}>Status Approval:</span>
                <span style={{ fontWeight: '900', color: previewManualReport.status === 'approved' ? '#34d399' : '#fbbf24' }}>
                  {previewManualReport.status === 'approved' ? 'APPROVED' : 'PENDING'}
                </span>
              </div>
            </div>

            {/* Action Buttons: Cetak PDF, CSV, WhatsApp, Tutup */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <button
                type="button"
                onClick={() => handleDownloadDailyReportPdf(previewManualReport)}
                style={{
                  padding: '10px 14px',
                  background: 'rgba(56, 189, 248, 0.15)',
                  border: '1px solid #38bdf8',
                  color: '#38bdf8',
                  borderRadius: '10px',
                  fontWeight: '800',
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                <Download size={16} />
                <span>Cetak / PDF</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  handleOpenWhatsAppModal(previewManualReport);
                  setPreviewManualReport(null);
                }}
                style={{
                  padding: '10px 14px',
                  background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                  border: 'none',
                  color: '#ffffff',
                  borderRadius: '10px',
                  fontWeight: '800',
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  boxShadow: '0 4px 12px rgba(5,150,105,0.3)'
                }}
              >
                <Send size={16} />
                <span>Kirim WhatsApp</span>
              </button>
            </div>

            <button
              onClick={() => setPreviewManualReport(null)}
              style={{
                padding: '11px',
                background: 'var(--pos-border-card)',
                color: 'var(--pos-txt-primary)',
                border: 'none',
                borderRadius: '10px',
                fontWeight: '800',
                fontSize: '0.82rem',
                cursor: 'pointer'
              }}
            >
              Tutup Pratinjau
            </button>
          </div>
        </div>
      )}

      {/* 15. MODAL FORM "+ TAMBAHKAN STOK OPNAME / LAPORAN LOGISTIK" (FULL SCREEN MODAL) */}
      {showAddLogisticsModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, width: '100vw', height: '100vh',
          background: 'rgba(9, 13, 22, 0.95)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999, padding: 0
        }}>
          <div className="glass-card animate-fade-in" style={{
            width: '100vw', height: '100vh', maxWidth: '100vw', maxHeight: '100vh', overflowY: 'auto',
            padding: '24px 32px', background: '#0b0f19', border: 'none', borderRadius: '0px',
            display: 'flex', flexDirection: 'column', gap: '20px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--pos-border)', paddingBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Package size={24} color="#38bdf8" />
                <div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: '900', color: 'var(--pos-txt-primary)', margin: 0 }}>
                    Form Input Audit Stock Opname & Laporan Logistik
                  </h3>
                  <span style={{ fontSize: '0.74rem', color: 'var(--pos-txt-secondary)' }}>
                    Nomor Laporan: <strong style={{ color: '#38bdf8' }}>{logNo}</strong>
                  </span>
                </div>
              </div>
              <button onClick={() => setShowAddLogisticsModal(false)} style={{ background: 'none', border: 'none', color: 'var(--pos-txt-secondary)', cursor: 'pointer' }}>
                <X size={22} />
              </button>
            </div>

            {(() => {
              const rawIngredients = masterData.ingredients || [];
              const ingredientsList = rawIngredients.filter(ing =>
                ing.tampilkan_di_apk !== 'Inaktif' &&
                ing.tampilkan_di_apk !== 'inaktif' &&
                ing.status !== 'Inaktif' &&
                ing.status !== 'inaktif'
              );

              const adminList = (masterData.webAdminAccounts || masterData.mobileAccounts || []).map(acc => ({
                id: acc.id, name: acc.name, role: acc.role || acc.jabatan || 'Kasir'
              }));

              const handleUpdateStokAwal = (ing, val) => {
                const targetName = (ing.name || ing.item_name || '').toLowerCase().trim();
                const targetId = ing.id || `ing-opname-${targetName}`;
                setOpnameBatchRows(prev => {
                  const exists = prev.some(r => (r.id && String(r.id) === String(targetId)) || (r.item_name || '').toLowerCase().trim() === targetName);
                  if (exists) {
                    return prev.map(r => ((r.id && String(r.id) === String(targetId)) || (r.item_name || '').toLowerCase().trim() === targetName) ? { ...r, stok_awal: val } : r);
                  }
                  return [...prev, {
                    id: targetId,
                    item_name: ing.name || ing.item_name,
                    unit: ing.unit || 'kg',
                    stok_awal: val,
                    stok_fisik: ''
                  }];
                });
              };

              const handleUpdateStokFisik = (ing, val) => {
                const targetName = (ing.name || ing.item_name || '').toLowerCase().trim();
                const targetId = ing.id || `ing-opname-${targetName}`;
                setOpnameBatchRows(prev => {
                  const exists = prev.some(r => (r.id && String(r.id) === String(targetId)) || (r.item_name || '').toLowerCase().trim() === targetName);
                  if (exists) {
                    return prev.map(r => ((r.id && String(r.id) === String(targetId)) || (r.item_name || '').toLowerCase().trim() === targetName) ? { ...r, stok_fisik: val } : r);
                  }
                  return [...prev, {
                    id: targetId,
                    item_name: ing.name || ing.item_name,
                    unit: ing.unit || 'kg',
                    stok_awal: 0,
                    stok_fisik: val
                  }];
                });
              };

              return (
                <form onSubmit={e => {
                  e.preventDefault();

                  if (!ingredientsList || ingredientsList.length === 0) {
                    alert('Tidak ada bahan baku aktif yang dapat diaudit!');
                    return;
                  }

                  const newRecords = ingredientsList.map((ing, idx) => {
                    const r = opnameBatchRows.find(item => (item.item_name || '').toLowerCase().trim() === (ing.name || '').toLowerCase().trim()) || {};
                    const sAwal = Number(r.stok_awal !== undefined && r.stok_awal !== '' ? r.stok_awal : 0);
                    const sMasuk = getStokMasukFromLaporanHarian(ing.name, logDate, logOutletId);
                    const trfIn = getTransferStokMasuk(ing.name, logDate, logOutletId);
                    const trfOut = getTransferStokKeluar(ing.name, logDate, logOutletId);
                    const stokRusak = getStokRusakFromWaste(ing.name, logDate, logOutletId);
                    const sFisik = (r.stok_fisik !== undefined && r.stok_fisik !== '') ? Number(r.stok_fisik) : sAwal;
                    const sSistem = sAwal + sMasuk + trfIn - trfOut - stokRusak;
                    const selisih = sFisik - sSistem;

                    return {
                      id: `${logNo}-${idx + 1}`,
                      report_no: logNo,
                      date: logDate,
                      outlet_id: logOutletId,
                      branch_name: (masterData.outlets || []).find(o => Number(o.id) === Number(logOutletId))?.name || currentOutlet.name || outlets[0]?.name || 'Outlet Barokah',
                      submitted_by: logSubmittedBy,
                      created_by: logSubmittedBy,
                      author_name: logSubmittedBy,
                      item_name: ing.name,
                      unit: ing.unit || 'kg',
                      stok_awal: sAwal,
                      stok_masuk: sMasuk,
                      transfer_masuk: trfIn,
                      transfer_keluar: trfOut,
                      stok_keluar: 0,
                      stok_rusak: stokRusak,
                      stok_sistem: sSistem,
                      stok_fisik: sFisik,
                      selisih: selisih,
                      status: 'pending'
                    };
                  });

                  setShowAddLogisticsModal(false);

                  setMasterData(prev => {
                    const now = Date.now();
                    const filterOld = list => (list || []).filter(r => r.report_no !== logNo);
                    const newMaster = {
                      ...prev,
                      _lastUpdated: now,
                      clientUpdated: now,
                      approvedLogistics: [...newRecords, ...filterOld(prev.approvedLogistics)],
                      stockOpname: [...newRecords, ...filterOld(prev.stockOpname)],
                      stockMovement: [...newRecords, ...(prev.stockMovement || [])]
                    };

                    saveToServerWithGuard(newMaster);
                    return newMaster;
                  });

                  alert(`Form Stok Opname ${logNo} berisi ${newRecords.length} Bahan Baku Aktif berhasil disimpan!`);
                }} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

                  {/* Header Form: Tanggal Audit, No Laporan, Diisi Oleh, Cabang Outlet */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '14px', background: 'var(--pos-bg-app)', padding: '16px', borderRadius: '14px', border: '1px solid var(--pos-border-card)' }}>
                    <div>
                      <label style={{ fontSize: '0.78rem', color: 'var(--pos-txt-secondary)', fontWeight: '700', display: 'block', marginBottom: '6px' }}>Tanggal Audit *</label>
                      <input type="date" required value={logDate} onChange={e => setLogDate(e.target.value)} className="form-input" style={{ width: '100%', height: '42px', borderRadius: '8px' }} />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.78rem', color: 'var(--pos-txt-secondary)', fontWeight: '700', display: 'block', marginBottom: '6px' }}>Nomor Laporan *</label>
                      <input type="text" required value={logNo} onChange={e => setLogNo(e.target.value)} className="form-input" style={{ width: '100%', height: '42px', fontWeight: '800', color: '#38bdf8', borderRadius: '8px' }} />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.78rem', color: 'var(--pos-txt-secondary)', fontWeight: '700', display: 'block', marginBottom: '6px' }}>Diisi Oleh *</label>
                      <select value={logSubmittedBy} onChange={e => setLogSubmittedBy(e.target.value)} className="form-input" style={{ width: '100%', height: '42px', borderRadius: '8px' }}>
                        {adminList.map(a => (
                          <option key={a.id} value={a.name}>{a.name} ({a.role})</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label style={{ fontSize: '0.78rem', color: 'var(--pos-txt-secondary)', fontWeight: '700', display: 'block', marginBottom: '6px' }}>Cabang Outlet</label>
                      <div style={{ width: '100%', height: '42px', background: 'var(--pos-bg-card)', border: '1px solid #34d399', borderRadius: '8px', padding: '0 12px', color: '#34d399', fontWeight: '800', fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span>{currentOutlet.name || outlets[0]?.name || 'Outlet Barokah'}</span>
                        <span style={{ fontSize: '0.68rem', color: 'var(--pos-txt-secondary)', background: 'rgba(52, 211, 153, 0.15)', padding: '2px 8px', borderRadius: '4px' }}>Akun Aktif</span>
                      </div>
                    </div>
                  </div>

                  {/* KETERANGAN PENJELAS FORMULIR STOK OPNAME */}
                  <div style={{ background: 'rgba(56, 189, 248, 0.1)', padding: '12px 18px', borderRadius: '12px', border: '1px solid rgba(56, 189, 248, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.78rem', color: '#38bdf8', fontWeight: '700' }}>
                    <span>Menampilkan {ingredientsList.length} Bahan Baku Aktif dari Master Data</span>
                    <span>Stok Masuk, Transfer, & Stok Rusak otomatis terisi dari Laporan Harian & Subtab Logistik</span>
                  </div>

                  {/* TABEL MULTI-ITEM AUDIT BAHAN BAKU AKTIF MASTER DATA */}
                  <div style={{ background: 'var(--pos-bg-card)', borderRadius: '16px', border: '1px solid var(--pos-border)', overflow: 'hidden' }}>
                    <div style={{ overflowX: 'auto', maxHeight: '55vh' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', textAlign: 'left' }}>
                        <thead>
                          <tr style={{ background: 'var(--pos-bg-app)', color: 'var(--pos-txt-secondary)', borderBottom: '1px solid var(--pos-border-card)', textTransform: 'uppercase', fontSize: '0.72rem', fontWeight: '800' }}>
                            <th style={{ padding: '12px 10px', width: '40px' }}>No</th>
                            <th style={{ padding: '12px 14px' }}>Nama Bahan Baku</th>
                            <th style={{ padding: '12px 12px', width: '130px', textAlign: 'right' }}>Stok Awal (Manual)</th>
                            <th style={{ padding: '12px 12px', width: '130px', textAlign: 'right', color: '#34d399' }}>Stok Masuk (Laporan Harian)</th>
                            <th style={{ padding: '12px 12px', width: '110px', textAlign: 'right', color: '#38bdf8' }}>Transfer Masuk</th>
                            <th style={{ padding: '12px 12px', width: '110px', textAlign: 'right', color: '#a78bfa' }}>Transfer Keluar</th>
                            <th style={{ padding: '12px 12px', width: '120px', textAlign: 'right', color: '#fb7185' }}>Stok Rusak (Waste)</th>
                            <th style={{ padding: '12px 14px', width: '140px', textAlign: 'right', color: '#fbbf24' }}>Sisa Stok Fisik (Manual) *</th>
                          </tr>
                        </thead>
                        <tbody>
                          {ingredientsList.length === 0 ? (
                            <tr>
                              <td colSpan={8} style={{ padding: '30px', textAlign: 'center', color: 'var(--pos-txt-secondary)' }}>
                                Tidak ada Bahan Baku dengan status Aktif di Master Data.
                              </td>
                            </tr>
                          ) : (
                            ingredientsList.map((ing, idx) => {
                              const rowState = opnameBatchRows.find(r => (r.item_name || '').toLowerCase().trim() === (ing.name || '').toLowerCase().trim()) || {
                                id: ing.id || `ing-opname-${idx}`,
                                item_name: ing.name,
                                unit: ing.unit || 'kg',
                                stok_awal: 0,
                                stok_fisik: ''
                              };

                              const stokMasuk = getStokMasukFromLaporanHarian(ing.name, logDate, logOutletId);
                              const trfIn = getTransferStokMasuk(ing.name, logDate, logOutletId);
                              const trfOut = getTransferStokKeluar(ing.name, logDate, logOutletId);
                              const stokRusak = getStokRusakFromWaste(ing.name, logDate, logOutletId);

                              return (
                                <tr key={ing.id || idx} style={{ borderBottom: '1px solid var(--pos-border-card)', background: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)' }}>
                                  <td style={{ padding: '10px', color: 'var(--pos-txt-secondary)', fontWeight: '700' }}>{idx + 1}</td>
                                  <td style={{ padding: '10px 14px' }}>
                                    <strong style={{ color: 'var(--pos-txt-primary)', display: 'block', fontSize: '0.88rem' }}>{ing.name}</strong>
                                    <span style={{ fontSize: '0.72rem', color: 'var(--pos-txt-secondary)' }}>Satuan: {ing.unit || 'kg'} • {ing.category || 'Bahan Utama'}</span>
                                  </td>

                                  {/* STOK AWAL (DIISI MANUAL) */}
                                  <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                                    <input
                                      type="number"
                                      step="any"
                                      value={rowState.stok_awal !== undefined ? rowState.stok_awal : ''}
                                      onChange={e => handleUpdateStokAwal(ing, e.target.value)}
                                      className="form-input"
                                      style={{ width: '90px', height: '36px', textAlign: 'right', padding: '0 8px', borderRadius: '6px', fontSize: '0.85rem', fontWeight: '800' }}
                                    />
                                  </td>

                                  {/* STOK MASUK (OTOMATIS LAPORAN HARIAN / DEFAULT 0) */}
                                  <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: '900', color: stokMasuk > 0 ? '#34d399' : 'var(--pos-txt-secondary)' }}>
                                    {stokMasuk} {ing.unit || 'kg'}
                                  </td>

                                  {/* TRANSFER STOK MASUK (OTOMATIS SUB TRANSFER STOK) */}
                                  <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: '900', color: trfIn > 0 ? '#38bdf8' : 'var(--pos-txt-secondary)' }}>
                                    {trfIn} {ing.unit || 'kg'}
                                  </td>

                                  {/* TRANSFER STOK KELUAR (OTOMATIS SUB TRANSFER STOK) */}
                                  <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: '900', color: trfOut > 0 ? '#a78bfa' : 'var(--pos-txt-secondary)' }}>
                                    {trfOut} {ing.unit || 'kg'}
                                  </td>

                                  {/* STOK RUSAK (OTOMATIS LAPORAN STOK RUSAK / SUBTAB WASTE) */}
                                  <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: '900', color: stokRusak > 0 ? '#fb7185' : 'var(--pos-txt-secondary)' }}>
                                    {stokRusak} {ing.unit || 'kg'}
                                  </td>

                                  {/* SISA STOK FISIK (DIISI MANUAL) */}
                                  <td style={{ padding: '10px 14px', textAlign: 'right' }}>
                                    <input
                                      type="number"
                                      step="any"
                                      min="0"
                                      placeholder="Fisik..."
                                      value={rowState.stok_fisik !== undefined ? rowState.stok_fisik : ''}
                                      onChange={e => handleUpdateStokFisik(ing, e.target.value)}
                                      className="form-input"
                                      style={{ width: '100px', height: '36px', textAlign: 'right', padding: '0 8px', borderRadius: '6px', fontSize: '0.88rem', fontWeight: '900', border: '1.5px solid #fbbf24', color: '#fbbf24' }}
                                    />
                                  </td>

                                  
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Footer Action Buttons (Status Approval DIHAPUS sesuai instruksi user) */}
                  <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '12px', marginTop: '12px' }}>
                    <button type="button" onClick={() => setShowAddLogisticsModal(false)} style={{ padding: '12px 24px', background: 'rgba(255,255,255,0.08)', color: 'var(--pos-txt-primary)', border: '1px solid var(--pos-border-card)', borderRadius: '10px', fontWeight: '800', cursor: 'pointer', fontSize: '0.88rem' }}>
                      Batal
                    </button>
                    <button type="submit" style={{ padding: '12px 32px', background: 'linear-gradient(135deg, #38bdf8 0%, #0284c7 100%)', color: '#000000', border: 'none', borderRadius: '10px', fontWeight: '900', fontSize: '0.90rem', cursor: 'pointer', boxShadow: '0 4px 16px rgba(56,189,248,0.4)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span>SIMPAN &amp; KIRIM LAPORAN STOK OPNAME</span>
                    </button>
                  </div>

                </form>
              );
            })()}

          </div>
        </div>
      )}

      {/* 16. MODAL PREVIEW AUDIT STOK OPNAME LOGISTIK */}
      {previewLogisticsReport && (() => {
        const relatedOpnameItems = (previewLogisticsReport.report_no
          ? (masterData?.stockOpname || []).filter(s => s.report_no === previewLogisticsReport.report_no || s.id === previewLogisticsReport.id)
          : [previewLogisticsReport]).filter(Boolean);
        const displayItems = relatedOpnameItems.length > 0 ? relatedOpnameItems : [previewLogisticsReport];

        return (
          <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '16px'
          }}>
            <div className="glass-card animate-fade-in" style={{ width: '100%', maxWidth: '640px', maxHeight: '90vh', overflowY: 'auto', padding: '24px', background: 'var(--pos-bg-card)', borderRadius: '18px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--pos-border)', paddingBottom: '12px' }}>
                <div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: '900', color: 'var(--pos-txt-primary)', margin: 0 }}>
                    Pratinjau Audit Opname #{previewLogisticsReport.report_no || previewLogisticsReport.id}
                  </h3>
                  <p style={{ fontSize: '0.78rem', color: 'var(--pos-txt-secondary)', margin: '2px 0 0 0' }}>
                    {previewLogisticsReport.date} • Diisi oleh: {previewLogisticsReport.submitted_by || previewLogisticsReport.created_by}
                  </p>
                </div>
                <button onClick={() => setPreviewLogisticsReport(null)} style={{ background: 'none', border: 'none', color: 'var(--pos-txt-secondary)', cursor: 'pointer' }}>
                  <X size={20} />
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.84rem' }}>
                  <span style={{ color: 'var(--pos-txt-secondary)' }}>Status Approval:</span>
                  <span style={{ fontWeight: '900', color: (previewLogisticsReport.status === 'ok' || previewLogisticsReport.status === 'approved') ? '#34d399' : '#fbbf24' }}>
                    {(previewLogisticsReport.status === 'ok' || previewLogisticsReport.status === 'approved') ? 'APPROVED' : 'PENDING'}
                  </span>
                </div>

                <div style={{ overflowX: 'auto', borderRadius: '12px', border: '1px solid var(--pos-border-card)' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ background: 'rgba(255,255,255,0.04)', color: 'var(--pos-txt-secondary)', borderBottom: '1px solid var(--pos-border-card)' }}>
                        <th style={{ padding: '8px 10px' }}>#</th>
                        <th style={{ padding: '8px 10px' }}>Nama Item</th>
                        <th style={{ padding: '8px 10px', textAlign: 'right' }}>Awal</th>
                        <th style={{ padding: '8px 10px', textAlign: 'right' }}>Masuk</th>
                        <th style={{ padding: '8px 10px', textAlign: 'right' }}>Trf Out/In</th>
                        <th style={{ padding: '8px 10px', textAlign: 'right' }}>Rusak</th>
                        <th style={{ padding: '8px 10px', textAlign: 'right' }}>Sisa Fisik</th>
                      </tr>
                    </thead>
                    <tbody>
                      {displayItems.map((it, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', color: 'var(--pos-txt-primary)' }}>
                          <td style={{ padding: '8px 10px', color: 'var(--pos-txt-secondary)' }}>{idx + 1}</td>
                          <td style={{ padding: '8px 10px', fontWeight: '800', color: '#34d399' }}>{it.item_name}</td>
                          <td style={{ padding: '8px 10px', textAlign: 'right' }}>{it.stok_awal || 0} {it.unit}</td>
                          <td style={{ padding: '8px 10px', textAlign: 'right', color: '#34d399' }}>+{it.stok_masuk || 0}</td>
                          <td style={{ padding: '8px 10px', textAlign: 'right', color: '#a78bfa' }}>-{it.transfer_keluar || 0} / +{it.transfer_masuk || 0}</td>
                          <td style={{ padding: '8px 10px', textAlign: 'right', color: '#fb7185' }}>-{it.stok_rusak || 0}</td>
                          <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: '900', color: '#38bdf8' }}>{it.stok_fisik} {it.unit}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <button onClick={() => setPreviewLogisticsReport(null)} style={{ padding: '12px', background: 'var(--pos-border-card)', color: 'var(--pos-txt-primary)', border: 'none', borderRadius: '10px', fontWeight: '800', cursor: 'pointer', marginTop: '8px' }}>
                Tutup Pratinjau
              </button>
            </div>
          </div>
        );
      })()}
      {/* 16. MODAL FORM "+ BUAT LAPORAN TRANSFER PRODUK" (FULL SCREEN MODAL) */}
      {showAddTransferModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, width: '100vw', height: '100vh',
          background: 'rgba(9, 13, 22, 0.95)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999, padding: 0
        }}>
          <div className="glass-card animate-fade-in" style={{
            width: '100vw', height: '100vh', maxWidth: '100vw', maxHeight: '100vh', overflowY: 'auto',
            background: '#0b0f19', border: 'none', borderRadius: '0px',
            boxShadow: 'none', padding: '28px 36px',
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
                  <h3 style={{ fontSize: '1.25rem', fontWeight: '800', color: 'var(--pos-txt-primary)', margin: 0, letterSpacing: '-0.02em' }}>
                    Buat Laporan Transfer Produk Antarcabang
                  </h3>
                  <p style={{ fontSize: '0.80rem', color: 'var(--pos-txt-secondary)', margin: '3px 0 0 0' }}>
                    Formulir mutasi & pengiriman persediaan stok antarcabang restoran
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setShowAddTransferModal(false)} 
                style={{
                  background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                  color: 'var(--pos-txt-secondary)', borderRadius: '10px', width: '36px', height: '36px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', fontSize: '1.1rem', fontWeight: '700', transition: 'all 0.2s'
                }}
              >
                
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
                  let hasInvalidIngredient = false;

                  for (let idx = 0; idx < transferBatchRows.length; idx++) {
                    const row = transferBatchRows[idx];
                    const finalItemName = row.item_name === '__OTHER__' ? (row.custom_item_name || 'Bahan Baku Baru') : row.item_name;
                    
                    // ── VALIDASI MASTER DATA BAHAN BAKU ────────────────────────
                    const isValidMasterIng = ingredientsList.some(i => (i.name || '').trim().toLowerCase() === (finalItemName || '').trim().toLowerCase());
                    if (!isValidMasterIng) {
                      hasInvalidIngredient = true;
                      alert(`PENGAJUAN DITOLAK!\n\nBahan baku "${finalItemName}" tidak terdaftar di Master Data Bahan Baku Pusat!\nHarap pilih dari sugesti otomatis yang tersedia.`);
                      return;
                    }

                    const recId = transferBatchRows.length > 1 ? `${transferNo}-${idx + 1}` : transferNo;

                    newRecords.push({
                      id: recId,
                      report_no: transferNo,
                      date: transferDate,
                      from_outlet_id: currentOutlet.id || (outlets[0]?.id) || 1,
                      from_outlet_name: fromOutletObj.name || currentOutlet.name || outlets[0]?.name || 'Outlet Barokah',
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
                  }

                  if (hasInvalidIngredient || newRecords.length === 0) return;

                  // DIRECT SAVE & CLOSE MODAL INSTANTLY
                  setShowAddTransferModal(false);
                  setPendingTransferDraft(null);

                  setMasterData(prev => {
                    const now = Date.now();
                    const filterOld = list => (list || []).filter(r => r.report_no !== transferNo);
                    const updatedTransfers = [...newRecords, ...filterOld(prev.stockTransfer)];
                    const newMaster = {
                      ...prev,
                      _lastUpdated: now,
                      clientUpdated: now,
                      stockTransfer: updatedTransfers
                    };
                    saveToServerWithGuard(newMaster);
                    return newMaster;
                  });

                  alert(`Laporan Transfer Bahan Baku ${transferNo} berisi ${newRecords.length} item berhasil disimpan & dikirim ke Logistik Pusat!`);
                }} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>

                  {/* KARTU 1: Tanggal & Nomor Laporan */}
                  <div style={{ background: 'var(--pos-bg-app)', padding: '16px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.06)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
                    <div>
                      <label style={{ fontSize: '0.78rem', color: 'var(--pos-txt-secondary)', fontWeight: '700', display: 'block', marginBottom: '6px' }}>Tanggal Transfer *</label>
                      <input type="date" required value={transferDate} onChange={e => setTransferDate(e.target.value)} className="form-input" style={{ width: '100%', height: '40px' }} />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.78rem', color: 'var(--pos-txt-secondary)', fontWeight: '700', display: 'block', marginBottom: '6px' }}>Nomor Laporan Transfer *</label>
                      <input type="text" required value={transferNo} onChange={e => setTransferNo(e.target.value)} className="form-input" style={{ width: '100%', height: '40px', fontWeight: '800', color: '#a78bfa' }} />
                    </div>
                  </div>

                  {/* KARTU 2: Diisi Oleh, Outlet Asal & Outlet Tujuan */}
                  <div style={{ background: 'var(--pos-bg-app)', padding: '16px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.06)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
                    <div>
                      <label style={{ fontSize: '0.78rem', color: 'var(--pos-txt-secondary)', fontWeight: '700', display: 'block', marginBottom: '6px' }}>Pengaju / Dibuat Oleh *</label>
                      <select value={transferSubmittedBy} onChange={e => setTransferSubmittedBy(e.target.value)} className="form-input" style={{ width: '100%', height: '40px' }}>
                        {adminList.map(a => (
                          <option key={a.id} value={a.name}>{a.name} ({a.role})</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label style={{ fontSize: '0.78rem', color: '#fb7185', fontWeight: '800', display: 'block', marginBottom: '6px' }}>Outlet Asal (Pengirim)</label>
                      <div style={{ width: '100%', height: '40px', background: 'var(--pos-bg-card)', border: '1px solid #fb7185', borderRadius: '8px', padding: '0 12px', color: '#fb7185', fontWeight: '800', fontSize: '0.82rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span>{currentOutlet.name || outlets[0]?.name || 'Outlet Barokah'}</span>
                        <span style={{ fontSize: '0.68rem', color: 'var(--pos-txt-secondary)' }}>(Akun Login)</span>
                      </div>
                    </div>

                    <div>
                      <label style={{ fontSize: '0.78rem', color: '#34d399', fontWeight: '800', display: 'block', marginBottom: '6px' }}>Outlet Tujuan (Penerima) *</label>
                      <select value={transferToOutletId} onChange={e => setTransferToOutletId(Number(e.target.value))} className="form-input" style={{ width: '100%', height: '40px', fontWeight: '800', color: '#34d399', border: '1px solid #34d399' }}>
                        {outletsList.filter(o => o.id !== (currentOutlet.id || 1)).map(o => (
                          <option key={o.id} value={o.id}>{o.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* KARTU 3: DETAIL BAHAN BAKU / PRODUK YANG DITRANSFER (MULTI-ITEM) */}
                  <div style={{ background: 'var(--pos-bg-app)', padding: '16px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <label style={{ fontSize: '0.82rem', color: '#38bdf8', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>Detail Bahan Baku / Produk Yang Ditransfer ({transferBatchRows.length} Item)</span>
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
                    <div style={{ overflowX: 'auto', borderRadius: '12px', border: '1px solid var(--pos-border-card)' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.82rem' }}>
                        <thead>
                          <tr style={{ background: 'var(--pos-bg-card)', borderBottom: '1px solid var(--pos-border-card)', color: 'var(--pos-txt-secondary)', fontSize: '0.74rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                            <th style={{ padding: '12px 14px', width: '40px', textAlign: 'center' }}>No</th>
                            <th style={{ padding: '12px 14px', minWidth: '220px' }}>Nama Produk / Stok Item *</th>
                            <th style={{ padding: '12px 14px', width: '140px', textAlign: 'right', color: '#fb7185' }}>Transfer Out (Outlet Pengirim) *</th>
                            <th style={{ padding: '12px 14px', width: '140px', textAlign: 'right', color: '#34d399' }}>Transfer In (Outlet Penerima) *</th>
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
                                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', background: idx % 2 === 0 ? 'rgba(30, 41, 59, 0.5)' : 'var(--pos-bg-app)' }}>
                                  {/* 1. Index */}
                                  <td style={{ padding: '12px 14px', textAlign: 'center', fontWeight: '700', color: '#64748b' }}>
                                    {idx + 1}
                                  </td>

                                  {/* 2. Nama Bahan Baku */}
                                  <td style={{ padding: '10px 14px' }}>
                                    <div style={{ position: 'relative', width: '100%' }}>
                                      <input
                                        type="text"
                                        value={row.item_name === '__OTHER__' ? '' : (row.item_name || '')}
                                        onFocus={() => setActiveSuggestRowId(`trf-${row.id}`)}
                                        onBlur={() => setTimeout(() => setActiveSuggestRowId(null), 250)}
                                        onChange={e => {
                                          const val = e.target.value;
                                          handleUpdateTransferRow(row.id, 'item_name', val);
                                          const found = ingredientsList.find(i => (i.name || '').toLowerCase() === val.toLowerCase());
                                          if (found) handleUpdateTransferRow(row.id, 'unit', found.unit || 'kg');
                                          setActiveSuggestRowId(`trf-${row.id}`);
                                        }}
                                        placeholder="Ketik / pilih bahan baku..."
                                        style={{ width: '100%', padding: '6px 10px', background: 'var(--pos-bg-card)', border: activeSuggestRowId === `trf-${row.id}` ? '1.5px solid #34d399' : '1px solid var(--pos-border-card)', borderRadius: '8px', color: '#34d399', fontSize: '0.82rem', fontWeight: '800', outline: 'none' }}
                                      />

                                      {/* FLOATING DROPDOWN SUGESTI OTOMATIS */}
                                      {activeSuggestRowId === `trf-${row.id}` && (
                                        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 9999, background: '#0f172a', border: '1.5px solid #34d399', borderRadius: '8px', marginTop: '4px', maxHeight: '200px', overflowY: 'auto', boxShadow: '0 8px 24px rgba(0,0,0,0.6)' }}>
                                          {ingredientsList
                                            .filter(s => !(row.item_name || '') || (s.name || '').toLowerCase().includes((row.item_name || '').toLowerCase()))
                                            .slice(0, 10)
                                            .map((sug, i) => (
                                              <div
                                                key={i}
                                                onMouseDown={(e) => {
                                                  e.preventDefault();
                                                  handleUpdateTransferRow(row.id, 'item_name', sug.name);
                                                  handleUpdateTransferRow(row.id, 'unit', sug.unit || 'kg');
                                                  setActiveSuggestRowId(null);
                                                }}
                                                style={{ padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.78rem' }}
                                                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(52, 211, 153, 0.25)'}
                                                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                              >
                                                <div>
                                                  <strong style={{ color: '#f8fafc', display: 'block' }}>{sug.name}</strong>
                                                  <span style={{ fontSize: '0.70rem', color: '#34d399' }}>Satuan: {sug.unit || 'kg'} • Stok: {sug.stock || sug.stok || 0}</span>
                                                </div>
                                                <span style={{ background: '#34d399', color: '#000000', padding: '2px 8px', borderRadius: '4px', fontWeight: '900', fontSize: '0.68rem' }}>Salin ↵</span>
                                              </div>
                                            ))}
                                        </div>
                                      )}
                                    </div>
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
                                        {autoUnit}
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
                                          Nama Bahan Baku Kustom:
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
                  <div style={{ background: 'var(--pos-bg-app)', padding: '16px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <label style={{ fontSize: '0.78rem', color: 'var(--pos-txt-secondary)', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                      <span>Catatan / Alasan Transfer Bahan Baku</span>
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
                  <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', paddingTop: '8px', borderTop: '1px solid var(--pos-border)' }}>
                    <button 
                      type="button" 
                      onClick={() => setShowAddTransferModal(false)} 
                      style={{
                        padding: '12px 22px', background: 'var(--pos-border-card)', color: 'var(--pos-txt-primary)',
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
                        color: 'var(--pos-txt-primary)', border: 'none', borderRadius: '10px',
                        fontWeight: '800', fontSize: '0.88rem', cursor: 'pointer',
                        boxShadow: '0 4px 16px rgba(167,139,250,0.4)', transition: 'all 0.2s'
                      }}
                    >
                      Simpan & Kirim Transfer Bahan Baku
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
            width: '100%', maxWidth: '640px', background: 'var(--pos-bg-app)',
            border: '1px solid rgba(56, 189, 248, 0.4)', borderRadius: '20px',
            padding: '24px', boxShadow: '0 25px 50px rgba(0,0,0,0.6)',
            display: 'flex', flexDirection: 'column', gap: '18px'
          }}>
            {/* Header Modal */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', borderBottom: '1px solid var(--pos-border)', paddingBottom: '14px' }}>
              <div style={{ padding: '10px', background: 'rgba(56, 189, 248, 0.15)', borderRadius: '12px', border: '1px solid rgba(56, 189, 248, 0.3)' }}>
                <Truck size={24} color="#38bdf8" />
              </div>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: '900', color: 'var(--pos-txt-primary)', margin: 0 }}>
                  Papan Informasi Persetujuan Transfer Bahan Baku
                </h3>
                <span style={{ fontSize: '0.76rem', color: '#fbbf24', fontWeight: '800' }}>
                  Status: Pending (Membutuhkan Persetujuan Logistik Pusat)
                </span>
              </div>
            </div>

            {/* Content Details */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ background: 'var(--pos-bg-card)', padding: '14px', borderRadius: '12px', border: '1px solid var(--pos-border-card)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '0.82rem' }}>
                <div>
                  <span style={{ color: 'var(--pos-txt-secondary)', fontSize: '0.75rem', display: 'block' }}>No. Laporan:</span>
                  <span style={{ fontWeight: '800', color: '#38bdf8' }}>{pendingTransferDraft.report_no}</span>
                </div>
                <div>
                  <span style={{ color: 'var(--pos-txt-secondary)', fontSize: '0.75rem', display: 'block' }}>Tanggal:</span>
                  <span style={{ fontWeight: '800', color: 'var(--pos-txt-primary)' }}>{pendingTransferDraft.date}</span>
                </div>
                <div>
                  <span style={{ color: 'var(--pos-txt-secondary)', fontSize: '0.75rem', display: 'block' }}>Dibuat Oleh:</span>
                  <span style={{ fontWeight: '800', color: 'var(--pos-txt-primary)' }}>{pendingTransferDraft.submitted_by}</span>
                </div>
                <div>
                  <span style={{ color: '#fb7185', fontSize: '0.75rem', display: 'block', fontWeight: '800' }}>Outlet Asal (Pengirim):</span>
                  <span style={{ fontWeight: '800', color: '#fb7185' }}>{pendingTransferDraft.from_outlet_name}</span>
                </div>
                <div>
                  <span style={{ color: '#34d399', fontSize: '0.75rem', display: 'block', fontWeight: '800' }}>Outlet Tujuan (Penerima):</span>
                  <span style={{ fontWeight: '800', color: '#34d399' }}>{pendingTransferDraft.to_outlet_name}</span>
                </div>
              </div>

              {/* Rincian Bahan Baku Table */}
              <div>
                <span style={{ color: '#38bdf8', fontSize: '0.78rem', fontWeight: '800', display: 'block', marginBottom: '8px' }}>
                  Rincian Bahan Baku Yang Ditransfer ({pendingTransferDraft.items.length} Item):
                </span>
                <div style={{ background: 'var(--pos-bg-card)', borderRadius: '10px', border: '1px solid var(--pos-border-card)', overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.80rem' }}>
                    <thead>
                      <tr style={{ background: 'var(--pos-bg-app)', color: 'var(--pos-txt-secondary)', fontSize: '0.72rem', textTransform: 'uppercase', borderBottom: '1px solid var(--pos-border-card)' }}>
                        <th style={{ padding: '8px 12px', textAlign: 'center', width: '40px' }}>No</th>
                        <th style={{ padding: '8px 12px', textAlign: 'left' }}>Nama Produk / Stok Item</th>
                        <th style={{ padding: '8px 12px', color: '#34d399' }}>Transfer In (Outlet Penerima)</th>
                        <th style={{ padding: '8px 12px', color: '#fb7185' }}>Transfer Out (Outlet Pengirim)</th>
                        <th style={{ padding: '8px 12px', textAlign: 'center', width: '100px' }}>Satuan / Unit</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pendingTransferDraft.items.map((it, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                          <td style={{ padding: '8px 12px', textAlign: 'center', color: '#64748b', fontWeight: '700' }}>{idx + 1}</td>
                          <td style={{ padding: '8px 12px', color: '#38bdf8', fontWeight: '800' }}>{it.item_name}</td>
                          <td style={{ padding: '8px 12px', color: '#34d399', fontWeight: '900' }}>{pendingTransferDraft.to_outlet_name} (+{it.qty} {it.unit})</td>
                          <td style={{ padding: '8px 12px', color: '#fb7185', fontWeight: '900' }}>{pendingTransferDraft.from_outlet_name} (-{it.qty} {it.unit})</td>
                          <td style={{ padding: '8px 12px', textAlign: 'center', color: '#c084fc', fontWeight: '900' }}>{it.unit}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Action Buttons: Edit Kembali vs Simpan */}
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', paddingTop: '6px', borderTop: '1px solid var(--pos-border)' }}>
              <button 
                type="button" 
                onClick={() => setPendingTransferDraft(null)} 
                style={{
                  padding: '11px 22px', background: 'var(--pos-border-card)', color: 'var(--pos-txt-primary)',
                  border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px',
                  fontWeight: '700', fontSize: '0.85rem', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.2s'
                }}
              >
                <Edit2 size={15} />
                <span>Edit Kembali</span>
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

                    saveToServerWithGuard(newMaster);

                    alert(`Laporan Transfer ${pendingTransferDraft?.report_no || ''} berhasil dikirim ke Web Admin (Status: Pending / Menunggu Persetujuan)!`);

                    return newMaster;
                  });
                }} 
                style={{
                  padding: '11px 26px', background: 'linear-gradient(135deg, #34d399 0%, #059669 100%)',
                  color: 'var(--pos-txt-primary)', border: 'none', borderRadius: '10px',
                  fontWeight: '800', fontSize: '0.85rem', cursor: 'pointer',
                  boxShadow: '0 4px 16px rgba(52,211,153,0.4)',
                  display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.2s'
                }}
              >
                <CheckCircle size={15} />
                <span>Simpan</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PREVIEW TRANSFER PRODUK */}
      {previewTransferReport && (() => {
        const relatedTransfers = (previewTransferReport.report_no
          ? (masterData?.stockTransfer || []).filter(t => t.report_no === previewTransferReport.report_no || t.id === previewTransferReport.id)
          : [previewTransferReport]).filter(Boolean);
        const displayTransfers = relatedTransfers.length > 0 ? relatedTransfers : [previewTransferReport];

        return (
          <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '16px'
          }}>
            <div className="glass-card animate-fade-in" style={{
              width: '100%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto', padding: '24px', background: 'var(--pos-bg-card)', border: '1px solid #a78bfa', borderRadius: '18px', display: 'flex', flexDirection: 'column', gap: '16px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--pos-border-card)', paddingBottom: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Truck size={22} color="#a78bfa" />
                  <div>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: '900', color: 'var(--pos-txt-primary)', margin: 0 }}>
                      Pratinjau Transfer Produk #{previewTransferReport.report_no || previewTransferReport.id}
                    </h3>
                    <p style={{ fontSize: '0.78rem', color: 'var(--pos-txt-secondary)', margin: '2px 0 0 0' }}>
                      {previewTransferReport.date} • Pengaju: {previewTransferReport.submitted_by || previewTransferReport.created_by}
                    </p>
                  </div>
                </div>
                <button onClick={() => setPreviewTransferReport(null)} style={{ background: 'none', border: 'none', color: 'var(--pos-txt-secondary)', cursor: 'pointer', fontWeight: '900' }}></button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.84rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', background: 'rgba(255,255,255,0.03)', padding: '10px 14px', borderRadius: '10px', border: '1px solid var(--pos-border-card)' }}>
                  <div>
                    <span style={{ color: 'var(--pos-txt-secondary)', display: 'block', fontSize: '0.75rem' }}>Outlet Asal:</span>
                    <span style={{ fontWeight: '800', color: 'var(--pos-txt-primary)' }}>{previewTransferReport.from_outlet_name || currentOutlet?.name || 'Outlet Asal'}</span>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ color: 'var(--pos-txt-secondary)', display: 'block', fontSize: '0.75rem' }}>Outlet Tujuan:</span>
                    <span style={{ fontWeight: '800', color: '#a78bfa' }}>{previewTransferReport.to_outlet_name || (masterData?.outlets || []).find(o => Number(o.id) === Number(previewTransferReport.to_outlet_id || previewTransferReport.toOutletId))?.name || 'Outlet Tujuan'}</span>
                  </div>
                </div>

                <div style={{ overflowX: 'auto', borderRadius: '12px', border: '1px solid var(--pos-border-card)' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ background: 'rgba(255,255,255,0.04)', color: 'var(--pos-txt-secondary)', borderBottom: '1px solid var(--pos-border-card)' }}>
                        <th style={{ padding: '8px 10px' }}>#</th>
                        <th style={{ padding: '8px 10px' }}>Nama Produk / Bahan</th>
                        <th style={{ padding: '8px 10px', textAlign: 'right' }}>Jumlah Transfer</th>
                        <th style={{ padding: '8px 10px' }}>Satuan</th>
                      </tr>
                    </thead>
                    <tbody>
                      {displayTransfers.map((trf, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', color: 'var(--pos-txt-primary)' }}>
                          <td style={{ padding: '8px 10px', color: 'var(--pos-txt-secondary)' }}>{idx + 1}</td>
                          <td style={{ padding: '8px 10px', fontWeight: '800', color: '#34d399' }}>{trf.item_name}</td>
                          <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: '900', color: '#a78bfa' }}>{trf.qty}</td>
                          <td style={{ padding: '8px 10px', color: 'var(--pos-txt-secondary)' }}>{trf.unit}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--pos-border-card)', paddingTop: '8px' }}>
                  <span style={{ color: 'var(--pos-txt-secondary)' }}>Status Approval:</span>
                  <span style={{ fontWeight: '900', color: (previewTransferReport.status === 'ok' || previewTransferReport.status === 'approved') ? '#34d399' : '#fbbf24' }}>
                    {(previewTransferReport.status === 'ok' || previewTransferReport.status === 'approved') ? 'APPROVED' : 'PENDING'}
                  </span>
                </div>
              </div>

              <button onClick={() => setPreviewTransferReport(null)} style={{ padding: '12px', background: 'var(--pos-border-card)', color: 'var(--pos-txt-primary)', border: 'none', borderRadius: '10px', fontWeight: '800', cursor: 'pointer' }}>
                Tutup Pratinjau
              </button>
            </div>
          </div>
        );
      })()}

      {/* 17. MODAL FORM "LAPORKAN STOK RUSAK / WASTE" (FULL SCREEN MODAL) */}
      {showAddWasteModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, width: '100vw', height: '100vh',
          background: 'rgba(9, 13, 22, 0.95)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999, padding: 0
        }}>
          <div className="glass-card animate-fade-in" style={{
            width: '100vw', height: '100vh', maxWidth: '100vw', maxHeight: '100vh', overflowY: 'auto',
            padding: '28px 36px', background: '#0b0f19', border: 'none', borderRadius: '0px',
            display: 'flex', flexDirection: 'column', gap: '20px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--pos-border-card)', paddingBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Trash2 size={24} color="#f43f5e" />
                <div>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: '900', color: 'var(--pos-txt-primary)', margin: 0 }}>
                    Laporkan Stok Rusak / Waste
                  </h3>
                  <p style={{ fontSize: '0.76rem', color: 'var(--pos-txt-secondary)', margin: '2px 0 0 0' }}>
                    Formulir pencatatan waste, retur, expired, & kerusakan bahan baku
                  </p>
                </div>
              </div>
              <button onClick={() => { setShowAddWasteModal(false); setEditingWasteId(null); }} style={{ background: 'none', border: 'none', color: 'var(--pos-txt-secondary)', cursor: 'pointer', fontSize: '1.2rem', fontWeight: '900' }}></button>
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

                  // ── VALIDASI MASTER DATA BAHAN BAKU ──────────────────────────
                  let invalidWasteName = null;
                  wasteBatchRows.forEach(r => {
                    const isValidMasterIng = ingredientsList.some(i => (i.name || '').trim().toLowerCase() === (r.item_name || '').trim().toLowerCase());
                    if (!isValidMasterIng) invalidWasteName = r.item_name;
                  });

                  if (invalidWasteName) {
                    alert(`PENGAJUAN DITOLAK!\n\nBahan baku "${invalidWasteName}" tidak terdaftar di Master Data Bahan Baku Pusat!\nHarap pilih dari sugesti otomatis yang tersedia.`);
                    return;
                  }

                  handleSaveWasteFinal();
                }} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

                  {/* Row 1: Tanggal Kejadian & Dibuat Oleh */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '12px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <span style={{ fontSize: '0.78rem', color: 'var(--pos-txt-secondary)', fontWeight: '700' }}>Tanggal Kejadian *</span>
                      <input type="date" required value={wasteDate} onChange={e => setWasteDate(e.target.value)} className="form-input" style={{ width: '100%', height: '40px', padding: '8px', background: 'var(--pos-bg-app)', border: '1px solid var(--pos-border-card)', borderRadius: '6px', color: 'var(--pos-txt-primary)', fontSize: '0.82rem' }} />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <span style={{ fontSize: '0.78rem', color: 'var(--pos-txt-secondary)', fontWeight: '700' }}>Dibuat Oleh *</span>
                      <select value={wasteSubmittedBy} onChange={e => setWasteSubmittedBy(e.target.value)} className="form-input" style={{ width: '100%', height: '40px', padding: '8px', background: 'var(--pos-bg-app)', border: '1px solid var(--pos-border-card)', borderRadius: '6px', color: 'var(--pos-txt-primary)', fontSize: '0.82rem', cursor: 'pointer' }}>
                        {userList.map(a => (
                          <option key={a.id} value={a.name}>{a.name} ({a.role || 'Staf Restoran'})</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Row 2: Nama Outlet Cabang */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span style={{ fontSize: '0.78rem', color: 'var(--pos-txt-secondary)', fontWeight: '700' }}>Nama Outlet Cabang</span>
                    <div style={{ width: '100%', height: '40px', background: 'var(--pos-bg-app)', border: '1px solid #34d399', borderRadius: '6px', padding: '0 12px', color: '#34d399', fontWeight: '800', fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span>{(masterData.outlets || []).find(o => Number(o.id) === Number(wasteOutletId))?.name || currentOutlet?.name || 'Outlet Cabang'}</span>
                      <span style={{ fontSize: '0.68rem', color: 'var(--pos-txt-secondary)' }}>(Akun Login POS)</span>
                    </div>
                  </div>

                   {/* Catatan Editing jika dalam mode Edit */}
                  {editingWasteId && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', background: 'rgba(251,191,36,0.08)', padding: '10px', borderRadius: '8px', border: '1px solid rgba(251,191,36,0.3)' }}>
                      <span style={{ fontSize: '0.78rem', color: '#fbbf24', fontWeight: '800' }}>Catatan Editing (Wajib saat Edit Data) *</span>
                      <textarea
                        required
                        placeholder="Tuliskan catatan perbaikan atau alasan pengeditan data ini..."
                        value={wasteEditingNotes}
                        onChange={e => setWasteEditingNotes(e.target.value)}
                        rows={2}
                        className="form-input"
                        style={{ width: '100%', padding: '8px', background: 'var(--pos-bg-app)', border: '1px solid #fbbf24', borderRadius: '6px', color: '#fbbf24', fontSize: '0.80rem' }}
                      />
                    </div>
                  )}

                  {/* Dynamic Item Rows Section */}
                  <div style={{ background: 'var(--pos-bg-app)', padding: '14px', borderRadius: '12px', border: '1px solid var(--pos-border-card)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.82rem', color: '#f43f5e', fontWeight: '800' }}>
                        Cari & Pilih Nama Item (Bahan Baku Rusak):
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
                      <div key={row.id || idx} style={{ background: 'var(--pos-bg-card)', padding: '12px', borderRadius: '10px', border: '1px solid #475569', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1.5fr 36px', gap: '8px', alignItems: 'end' }}>
                          <div>
                            <span style={{ fontSize: '0.72rem', color: 'var(--pos-txt-secondary)', fontWeight: '700', display: 'block', marginBottom: '2px' }}>
                              Sugesti Nama Bahan Baku *
                            </span>
                            <div style={{ position: 'relative', width: '100%' }}>
                              <input
                                type="text"
                                value={row.item_name === '__OTHER__' ? '' : (row.item_name || '')}
                                onFocus={() => setActiveSuggestRowId(`wst-${idx}`)}
                                onBlur={() => setTimeout(() => setActiveSuggestRowId(null), 250)}
                                onChange={e => {
                                  const val = e.target.value;
                                  const updated = [...wasteBatchRows];
                                  updated[idx].item_name = val;
                                  const found = ingredientsList.find(i => (i.name || '').toLowerCase() === val.toLowerCase());
                                  if (found) updated[idx].unit = found.unit || 'kg';
                                  setWasteBatchRows(updated);
                                  setActiveSuggestRowId(`wst-${idx}`);
                                }}
                                placeholder="Ketik / pilih bahan baku..."
                                style={{ width: '100%', height: '36px', padding: '6px 10px', background: 'var(--pos-bg-card)', border: activeSuggestRowId === `wst-${idx}` ? '1.5px solid #fb7185' : '1px solid var(--pos-border-card)', borderRadius: '8px', color: '#fb7185', fontSize: '0.80rem', fontWeight: '800', outline: 'none' }}
                              />

                              {/* FLOATING DROPDOWN SUGESTI OTOMATIS */}
                              {activeSuggestRowId === `wst-${idx}` && (
                                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 9999, background: '#0f172a', border: '1.5px solid #fb7185', borderRadius: '8px', marginTop: '4px', maxHeight: '200px', overflowY: 'auto', boxShadow: '0 8px 24px rgba(0,0,0,0.6)' }}>
                                  {ingredientsList
                                    .filter(s => !(row.item_name || '') || (s.name || '').toLowerCase().includes((row.item_name || '').toLowerCase()))
                                    .slice(0, 10)
                                    .map((sug, i) => (
                                      <div
                                        key={i}
                                        onMouseDown={(e) => {
                                          e.preventDefault();
                                          const updated = [...wasteBatchRows];
                                          updated[idx].item_name = sug.name;
                                          updated[idx].unit = sug.unit || 'kg';
                                          setWasteBatchRows(updated);
                                          setActiveSuggestRowId(null);
                                        }}
                                        style={{ padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.78rem' }}
                                        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(251, 113, 133, 0.25)'}
                                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                      >
                                        <div>
                                          <strong style={{ color: '#f8fafc', display: 'block' }}>{sug.name}</strong>
                                          <span style={{ fontSize: '0.70rem', color: '#fb7185' }}>Satuan: {sug.unit || 'kg'} • Stok: {sug.stock || sug.stok || 0}</span>
                                        </div>
                                        <span style={{ background: '#fb7185', color: '#000000', padding: '2px 8px', borderRadius: '4px', fontWeight: '900', fontSize: '0.68rem' }}>Salin ↵</span>
                                      </div>
                                    ))}
                                </div>
                              )}
                            </div>
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
                            <span style={{ fontSize: '0.72rem', color: 'var(--pos-txt-secondary)', fontWeight: '700', display: 'block', marginBottom: '2px' }}>
                              Satuan (Otomatis)
                            </span>
                            <input
                              type="text"
                              readOnly
                              value={row.unit}
                              className="form-input"
                              style={{ width: '100%', height: '36px', fontSize: '0.80rem', background: 'var(--pos-bg-app)', color: 'var(--pos-txt-secondary)', padding: '6px' }}
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
                          style={{ width: '100%', height: '32px', fontSize: '0.75rem', color: 'var(--pos-txt-secondary)', fontWeight: '600', background: 'var(--pos-bg-app)', border: '1px solid var(--pos-border-card)', borderRadius: '6px', padding: '6px 10px' }}
                        />
                      </div>
                    ))}
                  </div>

                  {/* Catatan Laporan (global) */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span style={{ fontSize: '0.78rem', color: 'var(--pos-txt-secondary)', fontWeight: '700' }}>Catatan Laporan (Opsional)</span>
                    <textarea
                      placeholder="Tambahkan catatan umum untuk laporan ini..."
                      value={wasteNotes}
                      onChange={e => setWasteNotes(e.target.value)}
                      rows={2}
                      className="form-input"
                      style={{ width: '100%', padding: '8px 10px', background: 'var(--pos-bg-app)', border: '1px solid var(--pos-border-card)', borderRadius: '6px', color: 'var(--pos-txt-secondary)', fontSize: '0.80rem', resize: 'vertical' }}
                    />
                  </div>

                  {/* Footer Buttons */}
                  <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '6px', borderTop: '1px solid var(--pos-border-card)', paddingTop: '14px' }}>
                    <button type="button" onClick={() => { setShowAddWasteModal(false); setEditingWasteId(null); }} style={{ padding: '9px 18px', background: 'rgba(100,116,139,0.2)', border: '1px solid #475569', color: 'var(--pos-txt-secondary)', borderRadius: '8px', fontSize: '0.82rem', fontWeight: '700', cursor: 'pointer' }}>
                      Batal
                    </button>
                    <button type="submit" style={{ padding: '9px 22px', background: 'linear-gradient(135deg, #f43f5e, #e11d48)', border: 'none', color: 'var(--pos-txt-white)', borderRadius: '8px', fontSize: '0.85rem', fontWeight: '900', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 12px rgba(244,63,94,0.35)' }}>
                      <Trash2 size={15} />
                      <span>Simpan Laporan Barang Rusak</span>
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
          <div className="glass-card animate-fade-in" style={{ width: '100%', maxWidth: '580px', maxHeight: '90vh', overflowY: 'auto', padding: '24px', background: 'var(--pos-bg-card)', border: '1px solid #34d399', borderRadius: '18px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--pos-border-card)', paddingBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle size={22} color="#34d399" />
                <h3 style={{ fontSize: '1.15rem', fontWeight: '900', color: 'var(--pos-txt-primary)', margin: 0 }}>
                  Papan Pratinjau Laporan Barang Rusak (POS Mobile)
                </h3>
              </div>
              <button onClick={() => setShowWastePreviewFormModal(false)} style={{ background: 'none', border: 'none', color: 'var(--pos-txt-secondary)', cursor: 'pointer', fontSize: '1.2rem', fontWeight: '900' }}></button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.82rem', color: 'var(--pos-txt-primary)', background: 'var(--pos-bg-app)', padding: '16px', borderRadius: '12px', border: '1px solid var(--pos-border-card)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--pos-txt-secondary)' }}>No Laporan:</span>
                <span style={{ fontWeight: '900', color: '#fb7185' }}>{wasteNo}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--pos-txt-secondary)' }}>Tanggal Kejadian:</span>
                <span style={{ fontWeight: '800' }}>{wasteDate}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--pos-txt-secondary)' }}>Pengaju / Dibuat Oleh:</span>
                <span style={{ fontWeight: '800' }}>{wasteSubmittedBy}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--pos-txt-secondary)' }}>Outlet Cabang:</span>
                <span style={{ fontWeight: '800', color: '#34d399' }}>{(masterData.outlets || []).find(o => Number(o.id) === Number(wasteOutletId))?.name || currentOutlet?.name || 'Outlet Cabang'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--pos-txt-secondary)' }}>Tipe Input & Status:</span>
                <span style={{ fontWeight: '800', color: '#34d399' }}>By approved (PENDING)</span>
              </div>
              {editingWasteId && wasteEditingNotes && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', background: 'rgba(251,191,36,0.1)', padding: '8px 12px', borderRadius: '8px', border: '1px solid rgba(251,191,36,0.3)' }}>
                  <span style={{ color: '#fbbf24', fontWeight: '800', fontSize: '0.75rem' }}>Catatan Editing:</span>
                  <span style={{ color: 'var(--pos-txt-primary)', fontSize: '0.78rem' }}>{wasteEditingNotes}</span>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <span style={{ fontSize: '0.80rem', color: 'var(--pos-txt-secondary)', fontWeight: '800' }}>Rincian Bahan Baku Rusak:</span>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: 'var(--pos-bg-app)', color: 'var(--pos-txt-secondary)', borderBottom: '1px solid var(--pos-border-card)' }}>
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
                      <td style={{ padding: '8px', color: 'var(--pos-txt-secondary)' }}>{row.reason === 'Dan lain lain' ? (row.reason_custom || row.reason) : row.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '8px', borderTop: '1px solid var(--pos-border-card)', paddingTop: '14px' }}>
              <button
                type="button"
                onClick={() => setShowWastePreviewFormModal(false)}
                style={{ padding: '9px 18px', background: 'rgba(100,116,139,0.2)', border: '1px solid #475569', color: 'var(--pos-txt-secondary)', borderRadius: '8px', fontSize: '0.82rem', fontWeight: '800', cursor: 'pointer' }}
              >
                Edit Lagi
              </button>
              <button
                type="button"
                onClick={handleSaveWasteFinal}
                style={{ padding: '9px 24px', background: 'linear-gradient(135deg, #34d399 0%, #059669 100%)', border: 'none', color: 'var(--pos-txt-white)', borderRadius: '8px', fontSize: '0.85rem', fontWeight: '900', cursor: 'pointer', boxShadow: '0 4px 14px rgba(52,211,153,0.4)' }}
              >
                Simpan Laporan
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
            width: '100%', maxWidth: '540px', padding: '24px', background: 'var(--pos-bg-card)', border: '1px solid #fb7185', borderRadius: '18px', display: 'flex', flexDirection: 'column', gap: '16px', boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--pos-border-card)', paddingBottom: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Trash2 size={22} color="#fb7185" />
                <h3 style={{ fontSize: '1.1rem', fontWeight: '900', color: 'var(--pos-txt-primary)', margin: 0 }}>
                  Pratinjau Laporan Barang Rusak {previewWasteReport.report_no || previewWasteReport.id}
                </h3>
              </div>
              <button onClick={() => setPreviewWasteReport(null)} style={{ background: 'none', border: 'none', color: 'var(--pos-txt-secondary)', cursor: 'pointer', fontWeight: '900', fontSize: '1.2rem' }}></button>
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
                    <span style={{ color: 'var(--pos-txt-secondary)' }}>Nomor Laporan:</span>
                    <span style={{ fontWeight: '900', color: '#fb7185' }}>{reportNo}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--pos-txt-secondary)' }}>Tanggal Pencatatan:</span>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: '800', color: 'var(--pos-txt-primary)' }}>
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
                    <span style={{ color: 'var(--pos-txt-secondary)' }}>Diisi Oleh:</span>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontWeight: '800', color: 'var(--pos-txt-primary)' }}>{previewWasteReport.input_by || previewWasteReport.submitted_by || previewWasteReport.created_by || 'Kasir'}</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--pos-txt-secondary)' }}>Outlet Cabang:</span>
                    <span style={{ fontWeight: '800', color: 'var(--pos-txt-secondary)' }}>{previewWasteReport.branch_name || currentOutlet.name}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--pos-txt-secondary)' }}>Status Persetujuan:</span>
                    <span style={{ fontWeight: '900', color: isApproved ? '#34d399' : '#fbbf24' }}>
                      {isApproved ? 'APPROVED' : 'PENDING'}
                    </span>
                  </div>

                  {/* List Item Bahan Baku */}
                  <div style={{ background: 'var(--pos-bg-app)', borderRadius: '10px', padding: '10px', border: '1px solid var(--pos-border-card)', marginTop: '6px' }}>
                    <div style={{ fontWeight: '800', color: '#fb7185', marginBottom: '8px', fontSize: '0.80rem' }}>
                      Rincian Bahan Baku Rusak ({itemsList.length} Item):
                    </div>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
                      <thead>
                        <tr style={{ background: 'var(--pos-bg-card)', color: 'var(--pos-txt-secondary)', borderBottom: '1px solid var(--pos-border-card)' }}>
                          <th style={{ padding: '6px', textAlign: 'left' }}>Bahan Baku</th>
                          <th style={{ padding: '6px', textAlign: 'right' }}>Jumlah</th>
                          <th style={{ padding: '6px', textAlign: 'left' }}>Alasan</th>
                        </tr>
                      </thead>
                      <tbody>
                        {itemsList.map((row, i) => (
                          <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', color: 'var(--pos-txt-primary)' }}>
                            <td style={{ padding: '6px', fontWeight: '800', color: '#38bdf8' }}>{row.item_name}</td>
                            <td style={{ padding: '6px', textAlign: 'right', fontWeight: '900', color: '#fb7185' }}>-{row.qty || row.stok_rusak} {row.unit}</td>
                            <td style={{ padding: '6px', color: '#fb7185' }}>{row.damage_reason || row.reason || 'Lainnya'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <button onClick={() => setPreviewWasteReport(null)} style={{ padding: '12px', background: 'var(--pos-border-card)', color: 'var(--pos-txt-primary)', border: 'none', borderRadius: '10px', fontWeight: '800', cursor: 'pointer', marginTop: '10px' }}>
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
            width: '100%', maxWidth: '580px', padding: '24px', background: 'var(--pos-bg-card)', border: '1px solid #34d399', borderRadius: '18px', display: 'flex', flexDirection: 'column', gap: '16px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--pos-border-card)', paddingBottom: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckSquare size={22} color="#34d399" />
                <h3 style={{ fontSize: '1.1rem', fontWeight: '900', color: 'var(--pos-txt-primary)', margin: 0 }}>
                  Pratinjau Stok Opname & Stok Keluar (Web Admin)
                </h3>
              </div>
              <button onClick={() => setPreviewOpnameSummaryRecord(null)} style={{ background: 'none', border: 'none', color: 'var(--pos-txt-secondary)', cursor: 'pointer', fontWeight: '900' }}></button>
            </div>

            {(() => {
              const op = previewOpnameSummaryRecord;
              const sSistem = (op.stok_awal || 0) + (op.stok_masuk || 0) + (op.transfer_masuk || 0) - ((op.stok_keluar || 0) + (op.stok_rusak || 0) + (op.transfer_keluar || 0));
              const diffVal = (op.stok_fisik || 0) - sSistem;

              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.85rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--pos-txt-secondary)' }}>Nomor Laporan:</span>
                    <span style={{ fontWeight: '900', color: '#38bdf8' }}>{op.report_no || op.id}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--pos-txt-secondary)' }}>Tanggal Audit:</span>
                    <span style={{ fontWeight: '800', color: 'var(--pos-txt-primary)' }}>{op.date}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--pos-txt-secondary)' }}>Dibuat Oleh:</span>
                    <span style={{ fontWeight: '800', color: 'var(--pos-txt-primary)' }}>{op.created_by || op.submitted_by} ({op.type_input || 'Sent from Web Admin'})</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--pos-txt-secondary)' }}>Outlet Cabang:</span>
                    <span style={{ fontWeight: '800', color: 'var(--pos-txt-secondary)' }}>{op.branch_name || currentOutlet.name}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--pos-txt-secondary)' }}>Nama Stok Item:</span>
                    <span style={{ fontWeight: '900', color: '#34d399' }}>{op.item_name}</span>
                  </div>

                  <div style={{ background: 'var(--pos-bg-app)', padding: '12px', borderRadius: '10px', border: '1px solid var(--pos-border-card)', display: 'flex', flexDirection: 'column', gap: '6px', margin: '6px 0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--pos-txt-secondary)' }}>Stok Awal:</span>
                      <span style={{ fontWeight: '800', color: 'var(--pos-txt-primary)' }}>{op.stok_awal || 0} {op.unit || 'kg'}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#38bdf8' }}>Stok Masuk (+):</span>
                      <span style={{ fontWeight: '800', color: '#38bdf8' }}>+{op.stok_masuk || 0} {op.unit || 'kg'}</span>
                    </div>
                    
                    {/* HIGHLIGHT STOK KELUAR DARI WEB ADMIN */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', background: 'rgba(251, 113, 133, 0.12)', padding: '6px 8px', borderRadius: '6px' }}>
                      <span style={{ color: '#fb7185', fontWeight: '800' }}>Stok Keluar (Web Admin Logistik):</span>
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
                    <span style={{ color: 'var(--pos-txt-secondary)' }}>Stok Sistem (Dihitung):</span>
                    <span style={{ fontWeight: '900', color: 'var(--pos-txt-secondary)' }}>{sSistem} {op.unit || 'kg'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--pos-txt-secondary)' }}>Sisa Stok Fisik:</span>
                    <span style={{ fontWeight: '900', color: '#38bdf8', fontSize: '1rem' }}>{op.stok_fisik || 0} {op.unit || 'kg'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--pos-border-card)', paddingTop: '8px' }}>
                    <span style={{ color: 'var(--pos-txt-secondary)' }}>Analisis Selisih:</span>
                    <span style={{ fontWeight: '900', color: diffVal === 0 ? '#34d399' : diffVal > 0 ? '#38bdf8' : '#fb7185' }}>
                      {diffVal === 0 ? 'PAS (SOP OK)' : diffVal > 0 ? `SURPLUS (+${diffVal})` : `DEFISIT (${diffVal})`}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--pos-txt-secondary)' }}>Catatan / Sinkronisasi:</span>
                    <span style={{ color: 'var(--pos-txt-secondary)', fontStyle: 'italic' }}>{op.notes || 'Dikirim dari Web Admin Logistik'}</span>
                  </div>
                </div>
              );
            })()}

            <button onClick={() => setPreviewOpnameSummaryRecord(null)} style={{ padding: '12px', background: 'var(--pos-border-card)', color: 'var(--pos-txt-primary)', border: 'none', borderRadius: '10px', fontWeight: '800', cursor: 'pointer' }}>
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
            width: '100%', maxWidth: '640px', padding: '24px', background: 'var(--pos-bg-card)', border: '1px solid #6366f1', borderRadius: '20px', display: 'flex', flexDirection: 'column', gap: '16px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--pos-border-card)', paddingBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Calendar size={24} color="#6366f1" />
                <div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: '900', color: 'var(--pos-txt-primary)', margin: 0 }}>
                    Buat Laporan Reservasi Meja Baru
                  </h3>
                  <p style={{ fontSize: '0.76rem', color: 'var(--pos-txt-secondary)', margin: '2px 0 0 0' }}>
                    {currentOutlet.name} • Input Booking Meja Pelanggan & Catatan Uang Muka (DP)
                  </p>
                </div>
              </div>
              <button onClick={() => setShowAddReservationModal(false)} style={{ background: 'none', border: 'none', color: 'var(--pos-txt-secondary)', cursor: 'pointer', fontWeight: '900', fontSize: '1.2rem' }}></button>
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
                  <label style={{ fontSize: '0.78rem', color: 'var(--pos-txt-secondary)', display: 'block', marginBottom: '4px', fontWeight: '700' }}>Tanggal Reservasi</label>
                  <input type="date" value={newRsvDate} onChange={e => setNewRsvDate(e.target.value)} className="form-input" style={{ width: '100%', height: '40px' }} required />
                </div>

                <div>
                  <label style={{ fontSize: '0.78rem', color: 'var(--pos-txt-secondary)', display: 'block', marginBottom: '4px', fontWeight: '700' }}>Waktu / Jam Kedatangan</label>
                  <input type="text" value={newRsvTime} onChange={e => setNewRsvTime(e.target.value)} className="form-input" placeholder="Contoh: 18:30 WIB" style={{ width: '100%', height: '40px' }} required />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.78rem', color: 'var(--pos-txt-secondary)', display: 'block', marginBottom: '4px', fontWeight: '700' }}>Nama Pelanggan / Pemesan</label>
                  <input type="text" value={newRsvCustName} onChange={e => setNewRsvCustName(e.target.value)} className="form-input" placeholder="Contoh: Bpk. Hendra Wijaya" style={{ width: '100%', height: '40px' }} required />
                </div>

                <div>
                  <label style={{ fontSize: '0.78rem', color: 'var(--pos-txt-secondary)', display: 'block', marginBottom: '4px', fontWeight: '700' }}>Nomor HP / WhatsApp</label>
                  <input type="text" value={newRsvPhone} onChange={e => setNewRsvPhone(e.target.value)} className="form-input" placeholder="0812-3456-7890" style={{ width: '100%', height: '40px' }} required />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.78rem', color: 'var(--pos-txt-secondary)', display: 'block', marginBottom: '4px', fontWeight: '700' }}>Jumlah Tamu (Pax)</label>
                  <input type="number" min="1" value={newRsvPax} onChange={e => setNewRsvPax(e.target.value)} className="form-input" style={{ width: '100%', height: '40px' }} required />
                </div>

                <div>
                  <label style={{ fontSize: '0.78rem', color: 'var(--pos-txt-secondary)', display: 'block', marginBottom: '4px', fontWeight: '700' }}>Pilih Meja / Area</label>
                  <select value={newRsvTable} onChange={e => setNewRsvTable(e.target.value)} className="form-input" style={{ width: '100%', height: '40px', background: 'var(--pos-bg-app)', color: 'var(--pos-txt-primary)' }}>
                    <option value="Meja 01 (Indoor AC)">Meja 01 (Indoor AC)</option>
                    <option value="Meja 02 (Indoor AC)">Meja 02 (Indoor AC)</option>
                    <option value="Meja 03 (Indoor VIP)">Meja 03 (Indoor VIP)</option>
                    <option value="Meja 04 (Indoor VIP)">Meja 04 (Indoor VIP)</option>
                    <option value="Meja 05 (Outdoor Garden)">Meja 05 (Outdoor Garden)</option>
                    <option value="Meja 06 (Outdoor Garden)">Meja 06 (Outdoor Garden)</option>
                    <option value="Meja 07 (Terrace View)">Meja 07 (Terrace View)</option>
                    <option value="Meja 08 (Outdoor Garden)">Meja 08 (Outdoor Garden)</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.78rem', color: 'var(--pos-txt-secondary)', display: 'block', marginBottom: '4px', fontWeight: '700' }}>Uang Muka / DP (Rp)</label>
                  <input type="number" value={newRsvDp} onChange={e => setNewRsvDp(e.target.value)} className="form-input" placeholder="100000" style={{ width: '100%', height: '40px' }} />
                </div>

                <div>
                  <label style={{ fontSize: '0.78rem', color: 'var(--pos-txt-secondary)', display: 'block', marginBottom: '4px', fontWeight: '700' }}>Metode Bayar DP</label>
                  <select value={newRsvPaymentMethod} onChange={e => setNewRsvPaymentMethod(e.target.value)} className="form-input" style={{ width: '100%', height: '40px', background: 'var(--pos-bg-app)', color: 'var(--pos-txt-primary)' }}>
                    <option value="QRIS Statis">QRIS Statis</option>
                    <option value="Transfer Bank">Transfer Bank</option>
                    <option value="Cash / Tunai">Cash / Tunai</option>
                    <option value="Debit / EDC Card">Debit / EDC Card</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '0.78rem', color: 'var(--pos-txt-secondary)', display: 'block', marginBottom: '4px', fontWeight: '700' }}>Status Reservasi</label>
                  <select value={newRsvStatus} onChange={e => setNewRsvStatus(e.target.value)} className="form-input" style={{ width: '100%', height: '40px', background: 'var(--pos-bg-app)', color: 'var(--pos-txt-primary)' }}>
                    <option value="confirmed">Confirmed</option>
                    <option value="pending">Pending</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.78rem', color: 'var(--pos-txt-secondary)', display: 'block', marginBottom: '4px', fontWeight: '700' }}>Catatan Khusus Pelanggan</label>
                <input type="text" value={newRsvNotes} onChange={e => setNewRsvNotes(e.target.value)} className="form-input" placeholder="Contoh: Minta dekorasi ulang tahun & kursi bayi..." style={{ width: '100%', height: '40px' }} />
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '10px' }}>
                <button type="button" onClick={() => setShowAddReservationModal(false)} style={{ padding: '12px 20px', background: 'var(--pos-border-card)', color: 'var(--pos-txt-primary)', border: 'none', borderRadius: '10px', fontWeight: '800', cursor: 'pointer' }}>
                  Batal
                </button>
                <button type="submit" style={{ padding: '12px 24px', background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)', color: 'var(--pos-txt-white)', border: 'none', borderRadius: '10px', fontWeight: '900', cursor: 'pointer', boxShadow: '0 4px 14px rgba(99,102,241,0.4)' }}>
                  Simpan Reservasi Baru
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
            width: '100%', maxWidth: '520px', padding: '24px', background: 'var(--pos-bg-card)', border: '1px solid #6366f1', borderRadius: '18px', display: 'flex', flexDirection: 'column', gap: '16px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--pos-border-card)', paddingBottom: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Calendar size={22} color="#6366f1" />
                <h3 style={{ fontSize: '1.1rem', fontWeight: '900', color: 'var(--pos-txt-primary)', margin: 0 }}>
                  Detail Reservasi Pelanggan
                </h3>
              </div>
              <button onClick={() => setPreviewReservationRecord(null)} style={{ background: 'none', border: 'none', color: 'var(--pos-txt-secondary)', cursor: 'pointer', fontWeight: '900' }}></button>
            </div>

            {(() => {
              const rsv = previewReservationRecord;
              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.85rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--pos-txt-secondary)' }}>Kode Booking:</span>
                    <span style={{ fontWeight: '900', color: '#38bdf8' }}>{rsv.id}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--pos-txt-secondary)' }}>Tanggal & Waktu:</span>
                    <span style={{ fontWeight: '800', color: 'var(--pos-txt-primary)' }}>{rsv.date} ({rsv.time})</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--pos-txt-secondary)' }}>Nama Pelanggan:</span>
                    <span style={{ fontWeight: '900', color: 'var(--pos-txt-primary)' }}>{rsv.customer_name}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--pos-txt-secondary)' }}>Kontak Telepon:</span>
                    <span style={{ fontWeight: '800', color: 'var(--pos-txt-secondary)' }}>{rsv.phone}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--pos-txt-secondary)' }}>Jumlah Tamu:</span>
                    <span style={{ fontWeight: '900', color: '#a78bfa' }}>{rsv.pax_count} Pax</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--pos-txt-secondary)' }}>Meja Terpilih:</span>
                    <span style={{ fontWeight: '900', color: '#34d399' }}>{rsv.table_no}</span>
                  </div>

                  <div style={{ background: 'var(--pos-bg-app)', padding: '12px', borderRadius: '10px', border: '1px solid var(--pos-border-card)', display: 'flex', flexDirection: 'column', gap: '6px', margin: '6px 0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--pos-txt-secondary)' }}>Uang Muka / DP:</span>
                      <span style={{ fontWeight: '900', color: '#34d399', fontSize: '1rem' }}>{formatRupiah(rsv.dp_amount || 0)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--pos-txt-secondary)' }}>Metode Pembayaran DP:</span>
                      <span style={{ fontWeight: '800', color: '#38bdf8' }}>{rsv.payment_method}</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--pos-txt-secondary)' }}>Catatan Khusus:</span>
                    <span style={{ color: 'var(--pos-txt-secondary)', fontStyle: 'italic' }}>{rsv.notes || '-'}</span>
                  </div>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--pos-border-card)', paddingTop: '10px' }}>
                    <span style={{ color: 'var(--pos-txt-secondary)' }}>Status Reservasi:</span>
                    <select
                      value={rsv.status}
                      onChange={e => {
                        const updatedStatus = e.target.value;
                        setReservationsList(prev => prev.map(item => item.id === rsv.id ? { ...item, status: updatedStatus } : item));
                        setPreviewReservationRecord(prev => ({ ...prev, status: updatedStatus }));
                      }}
                      style={{ padding: '6px 12px', background: 'var(--pos-bg-app)', border: '1px solid #6366f1', color: 'var(--pos-txt-white)', borderRadius: '8px', fontWeight: '800' }}
                    >
                      <option value="confirmed">Confirmed</option>
                      <option value="pending">Pending</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>
                </div>
              );
            })()}

            <button onClick={() => setPreviewReservationRecord(null)} style={{ padding: '12px', background: 'var(--pos-border-card)', color: 'var(--pos-txt-primary)', border: 'none', borderRadius: '10px', fontWeight: '800', cursor: 'pointer' }}>
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
            width: '100%', maxWidth: '680px', maxHeight: '88vh', padding: '24px', background: 'var(--pos-bg-card)', border: '1px solid #34d399', borderRadius: '20px', display: 'flex', flexDirection: 'column', gap: '16px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--pos-border-card)', paddingBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <BookOpen size={24} color="#34d399" />
                <div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: '900', color: 'var(--pos-txt-primary)', margin: 0 }}>
                    {selectedSopDetail.title}
                  </h3>
                  <p style={{ fontSize: '0.76rem', color: 'var(--pos-txt-secondary)', margin: '2px 0 0 0' }}>
                    Dokumen Resmi Standar Operasional Restoran • ID: {selectedSopDetail.id}
                  </p>
                </div>
              </div>
              <button onClick={() => setSelectedSopDetail(null)} style={{ background: 'none', border: 'none', color: 'var(--pos-txt-secondary)', cursor: 'pointer', fontWeight: '900', fontSize: '1.2rem' }}></button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px', paddingRight: '4px' }}>
              
              <div style={{ background: 'var(--pos-bg-app)', padding: '14px', borderRadius: '12px', border: '1px solid var(--pos-border-card)', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', fontSize: '0.78rem' }}>
                <div>
                  <span style={{ color: 'var(--pos-txt-secondary)', display: 'block' }}>Kategori:</span>
                  <span style={{ fontWeight: '800', color: '#34d399' }}>{selectedSopDetail.categoryLabel}</span>
                </div>
                <div>
                  <span style={{ color: 'var(--pos-txt-secondary)', display: 'block' }}>Estimasi Durasi:</span>
                  <span style={{ fontWeight: '800', color: '#38bdf8' }}>{selectedSopDetail.estimatedTime}</span>
                </div>
                <div>
                  <span style={{ color: 'var(--pos-txt-secondary)', display: 'block' }}>Penanggung Jawab:</span>
                  <span style={{ fontWeight: '800', color: '#a78bfa' }}>{selectedSopDetail.author}</span>
                </div>
              </div>

              <div>
                <h4 style={{ fontSize: '0.88rem', fontWeight: '900', color: 'var(--pos-txt-primary)', marginBottom: '6px' }}>Ringkasan Prosedur:</h4>
                <p style={{ fontSize: '0.82rem', color: 'var(--pos-txt-secondary)', lineHeight: '1.5', margin: 0 }}>
                  {selectedSopDetail.summary}
                </p>
              </div>

              <div>
                <h4 style={{ fontSize: '0.88rem', fontWeight: '900', color: 'var(--pos-txt-primary)', marginBottom: '10px' }}>Langkah-Langkah Operasional Checklist:</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {selectedSopDetail.steps.map((step, sIdx) => (
                    <div key={sIdx} style={{ display: 'flex', gap: '12px', background: 'var(--pos-bg-app)', padding: '12px 14px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)' }}>
                      <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#34d399', color: 'var(--pos-bg-app)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900', fontSize: '0.78rem', flexShrink: 0 }}>
                        {sIdx + 1}
                      </div>
                      <span style={{ fontSize: '0.82rem', color: 'var(--pos-txt-primary)', lineHeight: '1.4' }}>
                        {step}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

            </div>

            <div style={{ borderTop: '1px solid var(--pos-border-card)', paddingTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.72rem', color: '#64748b' }}>Terakhir diverifikasi: {selectedSopDetail.updatedAt}</span>
              <button onClick={() => setSelectedSopDetail(null)} style={{ padding: '10px 20px', background: 'var(--pos-border-card)', color: 'var(--pos-txt-primary)', border: 'none', borderRadius: '10px', fontWeight: '800', cursor: 'pointer' }}>
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
            width: '100%', maxWidth: '520px', maxHeight: '90vh', padding: '24px', background: 'var(--pos-bg-card)', border: '1px solid #38bdf8', borderRadius: '22px', display: 'flex', flexDirection: 'column', gap: '16px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--pos-border-card)', paddingBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Printer size={24} color="#38bdf8" />
                <div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: '900', color: 'var(--pos-txt-primary)', margin: 0 }}>
                    Hasil Uji Coba Cetak (Test Print)
                  </h3>
                  <p style={{ fontSize: '0.76rem', color: 'var(--pos-txt-secondary)', margin: '2px 0 0 0' }}>
                    Mode: {printerSettings.printMode === 'sekaligus' ? 'Cetak Sekaligus' : 'Cetak 1 per 1'} • Kertas {printerSettings.paperWidth}
                  </p>
                </div>
              </div>
              <button onClick={() => setShowTestPrintModal(false)} style={{ background: 'none', border: 'none', color: 'var(--pos-txt-secondary)', cursor: 'pointer', fontWeight: '900', fontSize: '1.2rem' }}></button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              
              {/* STATUS TOAST */}
              <div style={{ background: 'rgba(56, 189, 248, 0.15)', border: '1px solid #38bdf8', color: '#38bdf8', padding: '10px 14px', borderRadius: '12px', fontSize: '0.80rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle2 size={18} />
                <span>Simulasi Test Print Sukses Terkirim ke [{printerSettings.printerName}]!</span>
              </div>

              {/* RECEIPT PAPER SIMULATION */}
              <div style={{ background: '#f8fafc', color: 'var(--pos-bg-app)', padding: '20px', borderRadius: '12px', fontFamily: 'monospace', fontSize: '0.78rem', boxShadow: '0 4px 14px rgba(0,0,0,0.3)', border: '1px solid #e2e8f0' }}>
                
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

            <div style={{ borderTop: '1px solid var(--pos-border-card)', paddingTop: '12px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button onClick={() => handleExecuteTestPrint()} style={{ padding: '10px 20px', background: '#38bdf8', color: 'var(--pos-bg-app)', border: 'none', borderRadius: '10px', fontWeight: '900', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Printer size={16} />
                <span>Cetak Fisik Thermal</span>
              </button>
              <button onClick={() => setShowTestPrintModal(false)} style={{ padding: '10px 20px', background: 'var(--pos-border-card)', color: 'var(--pos-txt-primary)', border: 'none', borderRadius: '10px', fontWeight: '800', cursor: 'pointer' }}>
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
            width: '100%', maxWidth: '440px', padding: '24px', background: 'var(--pos-bg-card)', border: '2px solid #a855f7', borderRadius: '22px', display: 'flex', flexDirection: 'column', gap: '16px'
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(168,85,247,0.2)', border: '1px solid #a855f7', color: '#c084fc', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                <ShieldCheck size={32} />
              </div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: '900', color: 'var(--pos-txt-primary)', margin: 0 }}>
                Otorisasi Restore Super Admin
              </h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--pos-txt-secondary)', marginTop: '6px', lineHeight: '1.4' }}>
                Proses <strong>Restore Data Offline</strong> memerlukan otorisasi khusus <strong>Super Admin</strong> dan akan <strong>LANGSUNG terhubung secara live ke Server Utama</strong>.
              </p>
            </div>

            {superAdminAuthError && (
              <div style={{ background: 'rgba(239, 68, 68, 0.2)', border: '1px solid #ef4444', color: '#fca5a5', padding: '10px 14px', borderRadius: '12px', fontSize: '0.78rem', fontWeight: '800', textAlign: 'center' }}>
                {superAdminAuthError}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '0.80rem', fontWeight: '800', color: 'var(--pos-txt-secondary)' }}>
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
                style={{ height: '50px', textAlign: 'center', fontSize: '1.5rem', letterSpacing: '8px', fontWeight: '900', color: '#c084fc', background: 'var(--pos-bg-app)', border: '1px solid #a855f7' }}
              />
            </div>

            <div style={{ background: 'var(--pos-bg-app)', padding: '10px 14px', borderRadius: '10px', fontSize: '0.74rem', color: 'var(--pos-txt-secondary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
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
                style={{ flex: 1, padding: '12px', background: 'var(--pos-border-card)', color: 'var(--pos-txt-primary)', border: 'none', borderRadius: '12px', fontWeight: '800', cursor: 'pointer' }}
              >
                Batal
              </button>

              <button
                type="button"
                onClick={handleVerifySuperAdminAndConnect}
                style={{ flex: 1.3, padding: '12px', background: 'linear-gradient(135deg, #a855f7 0%, #7e22ce 100%)', color: 'var(--pos-txt-white)', border: 'none', borderRadius: '12px', fontWeight: '900', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', boxShadow: '0 4px 14px rgba(168,85,247,0.4)' }}
              >
                <Zap size={16} />
                <span>Verifikasi & Connect</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL OTORISASI PIN / PASSWORD UNTUK MEMBUKA LAPORAN POS MOBILE */}
      {showMobileReportPasswordModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: 'var(--pos-bg-card)', border: '1px solid var(--pos-border-card)', borderRadius: '20px', padding: '28px', width: '100%', maxWidth: '420px', display: 'flex', flexDirection: 'column', gap: '18px', boxShadow: '0 20px 50px rgba(0,0,0,0.6)' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(56, 189, 248, 0.15)', border: '1px solid #38bdf8', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px auto' }}>
                <Lock size={26} color="#38bdf8" />
              </div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: '900', color: 'var(--pos-txt-primary)', margin: 0 }}>
                Otorisasi Akses Laporan
              </h3>
              <p style={{ fontSize: '0.80rem', color: 'var(--pos-txt-secondary)', marginTop: '6px', lineHeight: '1.4' }}>
                Masukkan PIN / Password Supervisor untuk membuka Laporan Outlet
              </p>
            </div>

            {mobileReportErrorText && (
              <div style={{ background: 'rgba(239, 68, 68, 0.2)', border: '1px solid #ef4444', color: '#fca5a5', padding: '10px 14px', borderRadius: '12px', fontSize: '0.78rem', fontWeight: '800', textAlign: 'center' }}>
                {mobileReportErrorText}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '0.80rem', fontWeight: '800', color: 'var(--pos-txt-secondary)' }}>
                PIN / Password Supervisor:
              </label>
              <input
                type="password"
                maxLength={6}
                value={mobileReportPasswordInput}
                onChange={e => {
                  setMobileReportPasswordInput(e.target.value);
                  setMobileReportErrorText('');
                }}
                onKeyDown={e => {
                  if (e.key === 'Enter') handleVerifyMobileReportPassword();
                }}
                autoFocus
                placeholder="• • • •"
                className="form-input"
                style={{ height: '50px', textAlign: 'center', fontSize: '1.5rem', letterSpacing: '8px', fontWeight: '900', color: '#38bdf8', background: 'var(--pos-bg-app)', border: '1px solid #38bdf8' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
              <button
                type="button"
                onClick={() => {
                  setShowMobileReportPasswordModal(false);
                  setMobileReportPasswordInput('');
                  setMobileReportErrorText('');
                }}
                style={{ flex: 1, padding: '12px', background: 'var(--pos-border-card)', color: 'var(--pos-txt-primary)', border: 'none', borderRadius: '12px', fontWeight: '800', cursor: 'pointer' }}
              >
                Batal
              </button>

              <button
                type="button"
                onClick={handleVerifyMobileReportPassword}
                style={{ flex: 1.3, padding: '12px', background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)', color: '#ffffff', border: 'none', borderRadius: '12px', fontWeight: '900', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', boxShadow: '0 4px 14px rgba(37,99,235,0.4)' }}
              >
                <span>Buka Laporan</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── GLOBAL FLOATING PRINT STATUS TOAST ──
          Hijau  = Printer hardware berhasil cetak
          Kuning = Tidak ada printer, dicetak sebagai PDF
          Biru   = Sedang mengirim data ke printer
          Merah  = Gagal cetak, printer tidak merespon */}
      {printStatus && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          zIndex: 999999,
          padding: '14px 20px',
          borderRadius: '14px',
          background:
            printStatus === 'success'     ? 'linear-gradient(135deg, #059669 0%, #10b981 100%)' :
            printStatus === 'success_pdf' ? 'linear-gradient(135deg, #d97706 0%, #f59e0b 100%)' :
            printStatus === 'printing'    ? 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)' :
                                            'linear-gradient(135deg, #dc2626 0%, #f43f5e 100%)',
          color: '#ffffff',
          fontWeight: '900',
          fontSize: '0.90rem',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          maxWidth: '340px',
          boxShadow:
            printStatus === 'success'     ? '0 10px 30px rgba(16,185,129,0.4)' :
            printStatus === 'success_pdf' ? '0 10px 30px rgba(245,158,11,0.4)' :
            printStatus === 'printing'    ? '0 10px 30px rgba(99,102,241,0.4)' :
                                            '0 10px 30px rgba(244,63,94,0.4)',
          border: '1px solid rgba(255,255,255,0.2)'
        }}>
          {printStatus === 'printing'    && <span style={{ fontSize: '1.2rem' }}></span>}
          {printStatus === 'success'     && <span style={{ fontSize: '1.2rem' }}></span>}
          {printStatus === 'success_pdf' && <span style={{ fontSize: '1.2rem' }}></span>}
          {printStatus === 'error'       && <span style={{ fontSize: '1.2rem' }}></span>}
          <span>{printStatusMsg}</span>
        </div>
      )}

      {/* ── MODAL KIRIM LAPORAN HARIAN KE WHATSAPP ── */}
      {showDailyReportWhatsAppModal && whatsAppReportData && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999, padding: '16px'
        }}>
          <div className="glass-card animate-fade-in" style={{
            width: '100%', maxWidth: '580px', maxHeight: '90vh', overflowY: 'auto',
            padding: '24px', background: 'var(--pos-bg-card)', borderRadius: '18px',
            border: '1.5px solid #059669', boxShadow: '0 10px 30px rgba(5,150,105,0.3)',
            display: 'flex', flexDirection: 'column', gap: '16px'
          }}>
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--pos-border)', paddingBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Send size={18} color="#ffffff" />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: '900', color: 'var(--pos-txt-primary)', margin: 0 }}>
                    Kirim Laporan Harian ke WhatsApp
                  </h3>
                  <span style={{ fontSize: '0.74rem', color: 'var(--pos-txt-secondary)' }}>
                    {whatsAppReportData.branch_name || currentOutlet.name} • {whatsAppReportData.date}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setShowDailyReportWhatsAppModal(false)}
                style={{ background: 'none', border: 'none', color: 'var(--pos-txt-secondary)', cursor: 'pointer', padding: '4px' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Nomor WhatsApp Tujuan */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '0.78rem', fontWeight: '800', color: 'var(--pos-txt-primary)' }}>
                Nomor WhatsApp Tujuan:
              </label>
              
              {/* Opsi Preset Nomor */}
              {Array.isArray(masterData?.settings?.ownerPhones) && masterData.settings.ownerPhones.length > 0 ? (
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {masterData.settings.ownerPhones.map((ph, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setTargetWhatsAppPhone(ph.phone);
                        setCustomWhatsAppPhone(ph.phone);
                      }}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '8px',
                        fontSize: '0.75rem',
                        fontWeight: '800',
                        cursor: 'pointer',
                        background: (customWhatsAppPhone || targetWhatsAppPhone) === ph.phone ? 'rgba(5,150,105,0.2)' : 'var(--pos-bg-app)',
                        border: `1px solid ${(customWhatsAppPhone || targetWhatsAppPhone) === ph.phone ? '#059669' : 'var(--pos-border-card)'}`,
                        color: (customWhatsAppPhone || targetWhatsAppPhone) === ph.phone ? '#34d399' : 'var(--pos-txt-secondary)'
                      }}
                    >
                      {ph.label || 'Owner'}: {ph.phone}
                    </button>
                  ))}
                </div>
              ) : null}

              {/* Input Nomor Manual */}
              <input
                type="text"
                placeholder="Contoh: 081234567890 / 6281234567890"
                value={customWhatsAppPhone || targetWhatsAppPhone}
                onChange={e => {
                  setCustomWhatsAppPhone(e.target.value);
                  setTargetWhatsAppPhone(e.target.value);
                }}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  background: 'var(--pos-bg-app)',
                  border: '1px solid #059669',
                  borderRadius: '10px',
                  color: 'var(--pos-txt-primary)',
                  fontWeight: '800',
                  fontSize: '0.85rem'
                }}
              />
            </div>

            {/* Pratinjau Teks WhatsApp */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.78rem', fontWeight: '800', color: 'var(--pos-txt-primary)' }}>
                  Pratinjau Format Pesan:
                </span>
                <button
                  type="button"
                  onClick={() => {
                    const text = buildDailyReportWhatsAppText(whatsAppReportData);
                    navigator.clipboard.writeText(text);
                    setIsCopiedWhatsApp(true);
                    setTimeout(() => setIsCopiedWhatsApp(false), 2500);
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: isCopiedWhatsApp ? '#34d399' : '#38bdf8',
                    fontSize: '0.75rem',
                    fontWeight: '800',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <Copy size={13} />
                  <span>{isCopiedWhatsApp ? 'Tersalin!' : 'Salin Teks'}</span>
                </button>
              </div>

              <pre style={{
                background: 'var(--pos-bg-app)',
                padding: '14px',
                borderRadius: '10px',
                border: '1px solid var(--pos-border-card)',
                color: 'var(--pos-txt-secondary)',
                fontSize: '0.75rem',
                fontFamily: 'monospace',
                whiteSpace: 'pre-wrap',
                maxHeight: '220px',
                overflowY: 'auto',
                lineHeight: 1.4,
                margin: 0
              }}>
                {buildDailyReportWhatsAppText(whatsAppReportData)}
              </pre>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setShowDailyReportWhatsAppModal(false)}
                style={{
                  padding: '12px',
                  background: 'var(--pos-border-card)',
                  color: 'var(--pos-txt-primary)',
                  border: 'none',
                  borderRadius: '10px',
                  fontWeight: '800',
                  fontSize: '0.82rem',
                  cursor: 'pointer'
                }}
              >
                Batal
              </button>

              <button
                type="button"
                onClick={handleSendDailyReportWhatsApp}
                style={{
                  padding: '12px',
                  background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '10px',
                  fontWeight: '900',
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 14px rgba(5,150,105,0.4)'
                }}
              >
                <Send size={16} />
                <span>Buka WhatsApp & Kirim</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL PAPAN KETERANGAN MEJA TERISI (OCCUPIED TABLE PROTECTION) ── */}
      {occupiedTableNotice && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999, padding: '16px'
        }}>
          <div className="glass-card animate-fade-in" style={{
            width: '100%', maxWidth: '540px', maxHeight: '90vh', overflowY: 'auto',
            padding: '24px', background: 'var(--pos-bg-card)', borderRadius: '18px',
            border: '2px solid #ef4444', boxShadow: '0 12px 36px rgba(239,68,68,0.35)',
            display: 'flex', flexDirection: 'column', gap: '16px'
          }}>
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--pos-border)', paddingBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff', boxShadow: '0 4px 12px rgba(239,68,68,0.4)' }}>
                  <AlertCircle size={22} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: '900', color: 'var(--pos-txt-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>{occupiedTableNotice.table?.number || `Meja ${occupiedTableNotice.table?.id || 'Terisi'}`} Sedang Terisi!</span>
                  </h3>
                  <span style={{ fontSize: '0.74rem', color: '#f87171', fontWeight: '800' }}>
                    ⚠️ Tidak dapat diisi order baru sebelum dibayar atau dibatalkan
                  </span>
                </div>
              </div>
              <button
                onClick={() => setOccupiedTableNotice(null)}
                style={{ background: 'none', border: 'none', color: 'var(--pos-txt-secondary)', cursor: 'pointer', padding: '4px' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Rincian Pesanan Meja Terisi */}
            <div style={{ background: 'var(--pos-bg-app)', padding: '16px', borderRadius: '14px', border: '1px solid var(--pos-border-card)', display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.84rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--pos-txt-secondary)' }}>Nama Pelanggan:</span>
                <span style={{ fontWeight: '900', color: 'var(--pos-txt-primary)' }}>
                  {occupiedTableNotice.pendingOrder?.customerName || occupiedTableNotice.pendingOrder?.customer_name || 'Pelanggan Umum'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--pos-txt-secondary)' }}>Waktu Mulai Pesan:</span>
                <span style={{ fontWeight: '800', color: '#38bdf8' }}>
                  {occupiedTableNotice.pendingOrder?.startTime || occupiedTableNotice.pendingOrder?.holdTx?.time || '-'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--pos-txt-secondary)' }}>Pelayan / Kasir:</span>
                <span style={{ fontWeight: '800', color: 'var(--pos-txt-secondary)' }}>
                  {occupiedTableNotice.pendingOrder?.waiterName || occupiedTableNotice.pendingOrder?.holdTx?.cashier || currentUserSession?.name || 'Kasir'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px dashed var(--pos-border-card)', paddingTop: '8px' }}>
                <span style={{ color: 'var(--pos-txt-secondary)', fontWeight: '800' }}>Total Tagihan Sementara:</span>
                <span style={{ fontWeight: '900', color: '#34d399', fontSize: '1.05rem' }}>
                  {formatRupiah(occupiedTableNotice.pendingOrder?.totalAmount || occupiedTableNotice.pendingOrder?.amount || 0)}
                </span>
              </div>

              {/* Daftar Menu di Meja */}
              <div style={{ marginTop: '6px', borderTop: '1px solid var(--pos-border-card)', paddingTop: '8px' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--pos-txt-secondary)', marginBottom: '6px', textTransform: 'uppercase' }}>
                  Menu yang Sudah Dipesan:
                </div>
                <div style={{ maxHeight: '120px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {(occupiedTableNotice.pendingOrder?.items || []).map((it, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', padding: '4px 8px', background: 'var(--pos-bg-card)', borderRadius: '6px' }}>
                      <span style={{ color: 'var(--pos-txt-primary)', fontWeight: '700' }}>
                        {it.qty || 1}x {it.name || it.item_name}
                      </span>
                      <span style={{ color: 'var(--pos-txt-secondary)', fontWeight: '800' }}>
                        {formatRupiah((it.price || it.price_unit || 0) * (it.qty || 1))}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Tombol Aksi Meja Terisi */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                {/* 1. Buka & Tambah Menu */}
                <button
                  type="button"
                  onClick={() => {
                    const tbl = occupiedTableNotice.table;
                    const pOrder = occupiedTableNotice.pendingOrder;
                    if (tbl && pOrder) {
                      handleCheckoutOccupiedTable({ ...tbl, pendingOrder: pOrder });
                    }
                    setOccupiedTableNotice(null);
                  }}
                  style={{
                    padding: '11px 12px',
                    background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '10px',
                    fontWeight: '900',
                    fontSize: '0.80rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    boxShadow: '0 4px 12px rgba(37,99,235,0.3)'
                  }}
                  title="Buka pesanan meja ke kasir untuk menambah menu tambahan"
                >
                  <FileText size={15} />
                  <span>Buka / Tambah Menu</span>
                </button>

                {/* 2. Bayar Meja Ini */}
                <button
                  type="button"
                  onClick={() => {
                    const tbl = occupiedTableNotice.table;
                    const pOrder = occupiedTableNotice.pendingOrder;
                    if (tbl && pOrder) {
                      handleQuickPayPendingOrder({
                        tableId: tbl.id,
                        orderId: pOrder.holdTx?.id || `HOLD-${tbl.id}`,
                        receiptNo: pOrder.holdTx?.id || `HOLD-${tbl.id}`,
                        customerName: pOrder.customerName || 'Pelanggan Umum',
                        tableNumber: tbl.number || `Meja ${tbl.id}`,
                        orderType: 'Dine In',
                        totalAmount: pOrder.totalAmount || pOrder.amount || 0,
                        items: pOrder.items || []
                      });
                    }
                    setOccupiedTableNotice(null);
                  }}
                  style={{
                    padding: '11px 12px',
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '10px',
                    fontWeight: '900',
                    fontSize: '0.80rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    boxShadow: '0 4px 12px rgba(16,185,129,0.3)'
                  }}
                  title="Langsung buka layar pembayaran kasir untuk melunasi meja ini"
                >
                  <CreditCard size={15} />
                  <span>Bayar Sekarang</span>
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                {/* 3. Pindah Meja */}
                <button
                  type="button"
                  onClick={() => {
                    const tbl = occupiedTableNotice.table;
                    const pOrder = occupiedTableNotice.pendingOrder;
                    if (tbl && pOrder) {
                      handleCheckoutOccupiedTable({ ...tbl, pendingOrder: pOrder });
                      setShowMoveTableModal(true);
                    }
                    setOccupiedTableNotice(null);
                  }}
                  style={{
                    padding: '10px 12px',
                    background: 'rgba(99,102,241,0.15)',
                    border: '1px solid #6366f1',
                    color: '#818cf8',
                    borderRadius: '10px',
                    fontWeight: '800',
                    fontSize: '0.78rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px'
                  }}
                  title="Pindahkan pesanan tamu ke meja kosong lain"
                >
                  <Shuffle size={14} />
                  <span>Pindah Meja</span>
                </button>

                {/* 4. Batalkan / Hapus Pesanan */}
                <button
                  type="button"
                  onClick={() => {
                    const tbl = occupiedTableNotice.table;
                    const pOrder = occupiedTableNotice.pendingOrder;
                    if (tbl && pOrder) {
                      handleDeletePendingOrder({
                        tableId: tbl.id,
                        orderId: pOrder.holdTx?.id || `HOLD-${tbl.id}`,
                        receiptNo: pOrder.holdTx?.id || `HOLD-${tbl.id}`,
                        customerName: pOrder.customerName || 'Pelanggan Umum'
                      });
                    }
                    setOccupiedTableNotice(null);
                  }}
                  style={{
                    padding: '10px 12px',
                    background: 'rgba(239,68,68,0.15)',
                    border: '1px solid #ef4444',
                    color: '#f87171',
                    borderRadius: '10px',
                    fontWeight: '800',
                    fontSize: '0.78rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px'
                  }}
                  title="Hapus pesanan meja jika tamu membatalkan pesanan"
                >
                  <Trash2 size={14} />
                  <span>Batalkan Pesanan</span>
                </button>
              </div>

              {/* 5. Tutup & Pilih Meja Lain */}
              <button
                type="button"
                onClick={() => setOccupiedTableNotice(null)}
                style={{
                  padding: '10px',
                  background: 'var(--pos-border-card)',
                  color: 'var(--pos-txt-primary)',
                  border: 'none',
                  borderRadius: '10px',
                  fontWeight: '800',
                  fontSize: '0.80rem',
                  cursor: 'pointer',
                  marginTop: '2px'
                }}
              >
                Tutup (Pilih Meja Lain)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── PRINTER OFFLINE MODAL (GLOBAL) — tampil otomatis saat cetak gagal/printer tidak terhubung ── */}
      {renderPrinterOfflineModal()}

      </div>
    </div>
  );
}
