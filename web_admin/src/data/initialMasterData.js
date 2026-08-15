// Master Initial Data for Multi-Restaurant System (MRIS) - Clean Slate (Super Admin Only)

export const initialMasterData = {
  // 1. DATA MASTER (KOSONG - DIREKAM OLEH PENGGUNA)
  outlets: [],
  categories: [],
  products: [],
  customers: [],
  salesTransactions: [],
  tables: [],
  paymentMethods: [
    { id: 1, name: 'Tunai (Cash)', code: 'CASH', status: 'Aktif' },
    { id: 2, name: 'QRIS', code: 'QRIS', status: 'Aktif' },
    { id: 3, name: 'Debit / EDC Bank', code: 'EDC', status: 'Aktif' }
  ],
  suppliers: [],
  units: [],
  expenseMaster: [],
  ingredients: [],

  // 2. EXPENSE MANAGEMENT
  cogsExpenses: [],
  productionExpenses: [],
  otherExpenses: [],

  // 3. STOK INVENTORY
  stockMovement: [],
  stockOpname: [],

  // 4. APPROVED WORKFLOWS
  approvedLogistics: [],
  approvedFinanceDaily: [],

  // 5. LAPORAN
  balanceSheet: {
    assets: [],
    liabilities: [],
    equity: []
  },
  cashFlow: [],

  // 6. KETENTUAN POLICIES & SOP
  policies: [
    { id: 1, title: 'SOP Batas Pengeluaran Kas Kecil (Petty Cash)', content: 'Setiap pengeluaran kasir di atas Rp 1.000.000 wajib mengunggah foto nota dan memerlukan persetujuan (approval) Manajer Cabang atau Super Admin.' },
    { id: 2, title: 'Kebijakan Penutupan Kasir (Shift Closing)', content: 'Penutupan kasir wajib dilakukan di akhir shift. Toleransi selisih uang fisik kasir adalah 0 (NIHIL).' }
  ],

  // 7. PENGATURAN (SISTEM & HAK AKSES PERAN)
  permissionMatrix: [
    { role: 'Super Admin', dashboard: true, masterData: true, costs: true, stock: true, approved: true, reports: true, policies: true, settings: true },
    { role: 'Owner', dashboard: true, masterData: true, costs: true, stock: true, approved: true, reports: true, policies: true, settings: true },
    { role: 'Admin', dashboard: true, masterData: true, costs: true, stock: true, approved: true, reports: true, policies: true, settings: true },
    { role: 'Manajer Cabang', dashboard: true, masterData: true, costs: true, stock: true, approved: true, reports: true, policies: true, settings: false },
    { role: 'Kasir', dashboard: false, masterData: false, costs: false, stock: true, approved: false, reports: false, policies: true, settings: false }
  ],

  mobilePermissionMatrix: [
    { role: 'Super Admin / Owner', posCashier: true, voidOrder: true, manualDiscount: true, stockOpname: true, receiveGoods: true, mobileReports: true, shiftClosing: true },
    { role: 'Admin', posCashier: true, voidOrder: true, manualDiscount: true, stockOpname: true, receiveGoods: true, mobileReports: true, shiftClosing: true },
    { role: 'Kepala Cabang / SPV', posCashier: true, voidOrder: true, manualDiscount: true, stockOpname: true, receiveGoods: true, mobileReports: true, shiftClosing: true },
    { role: 'Kasir', posCashier: true, voidOrder: false, manualDiscount: false, stockOpname: false, receiveGoods: false, mobileReports: false, shiftClosing: true },
    { role: 'Logistik & Dapur', posCashier: false, voidOrder: false, manualDiscount: false, stockOpname: true, receiveGoods: true, mobileReports: false, shiftClosing: false }
  ],

  printSettings: {
    printerName: 'Thermal Bluetooth POS Printer 58mm',
    paperWidth: '58mm',
    autoPrintReceipt: true,
    showLogo: true,
    headerText: 'Restoran Multi Branch System\nSelamat Menikmati Hidangan Kami',
    footerText: 'Terima Kasih Atas Kunjungan Anda!'
  },

  apkSecurity: {
    restrictUnknownDevice: true,
    requireManagerPinForVoid: true,
    maxCashInDrawer: 5000000,
    sessionTimeoutMinutes: 60,
    encryptionStatus: 'AES-256 Enabled',
    lastSecurityScan: '2026-07-25 08:00:00 WIB'
  },

  // HAK USER & AKUN PENGGUNA - WEB BASED ADMIN (terpisah dari POS Mobile)
  webAdminAccounts: [
    {
      id: 1,
      name: 'Super Admin Restoran',
      outlet: 'Semua Outlet (Central)',
      username: 'superadmin',
      password: '888',
      role: 'Super Admin',
      status: 'Aktif'
    },
    {
      id: 2,
      name: 'Owner Restoran',
      outlet: 'Semua Outlet (Central)',
      username: 'owner',
      password: '999',
      role: 'Owner',
      status: 'Aktif'
    }
  ],

  // OTENTIKASI AKSES AKUN - POS MOBILE APK (terpisah dari Web Admin)
  mobileAccounts: [
    {
      id: 1,
      name: 'Super Admin Restoran',
      outlet: 'Semua Outlet (Central)',
      username: 'superadmin',
      mobileLoginPassword: '888',
      role: 'Super Admin / Owner',
      status: 'Aktif',
      canAccessMobileReports: true,
      mobileReportPassword: '8888'
    },
    {
      id: 2,
      name: 'Owner Restoran',
      outlet: 'Semua Outlet (Central)',
      username: 'owner',
      mobileLoginPassword: '999',
      role: 'Super Admin / Owner',
      status: 'Aktif',
      canAccessMobileReports: true,
      mobileReportPassword: '9999'
    }
  ],

  // (Legacy - tidak digunakan lagi, digantikan webAdminAccounts & mobileAccounts)
  userAccounts: [],

  // DOKUMEN SOP RESTORAN
  sopDocuments: [
    {
      id: 1,
      title: 'SOP Pembukaan & Penutupan Shift Kasir POS',
      category: 'Operasional Kasir',
      version: 'v2.1',
      lastUpdated: '2026-07-25',
      author: 'Super Admin Restoran',
      status: 'Aktif',
      content: '1. Hitung fisik modal awal kas kecil sebelum membuka register POS.\n2. Pastikan Kertas Thermal Printer terpasang.\n3. Lakukan penutupan shift dan cetak rekapitulasi uang laci di akhir jam kerja.'
    }
  ]
};
