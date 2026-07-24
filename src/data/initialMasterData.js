// Master Initial Data for Multi-Restaurant System (MRIS) - Clean Production Build

export const initialMasterData = {
  // 1. DATA MASTER
  outlets: [
    { id: 1, name: 'Restoran Utama (Pusat)', code: 'OUT-01', address: 'Jl. Sudirman No. 45, Jakarta', phone: '0812-3456-7890', color: '#6366f1' },
    { id: 2, name: 'Cabang Bali Beach', code: 'OUT-02', address: 'Jl. Pantai Kuta No. 12, Bali', phone: '0812-9876-5432', color: '#38bdf8' }
  ],
  categories: [
    { id: 1, name: 'Makanan Utama' },
    { id: 2, name: 'Minuman' },
    { id: 3, name: 'Camilan / Dessert' }
  ],
  products: [
    { id: 101, outlet_id: 1, name: 'Nasi Goreng Spesial Resto', category: 'Makanan Utama', price: 35000, stock: 50, variants: ['Sedang', 'Pedas', 'Extra Telur'] },
    { id: 102, outlet_id: 1, name: 'Ayam Bakar Madu', category: 'Makanan Utama', price: 42000, stock: 40, variants: ['Paha', 'Dada'] },
    { id: 103, outlet_id: 1, name: 'Es Teh Manis Segar', category: 'Minuman', price: 8000, stock: 100, variants: ['Dingin (Es)', 'Hangat'] },
    { id: 104, outlet_id: 1, name: 'Kopi Susu Gula Aren', category: 'Minuman', price: 18000, stock: 80, variants: ['Normal Sugar', 'Less Sugar'] },
    { id: 105, outlet_id: 1, name: 'French Fries Crispy', category: 'Camilan / Dessert', price: 20000, stock: 60, variants: ['Original Salt', 'BBQ Flavour', 'Keju Melts'] }
  ],
  customers: [
    { id: 1, code: '00001 - POS', name: 'Pelanggan Umum (Tunai)', phone: '-', customer_type: 'Default POS', gender: 'Umum', address: '-' }
  ],
  salesTransactions: [],
  tables: [
    { 
      id: 1, 
      outlet_id: 1, 
      group_name: 'Area Utama Dine-In', 
      total_tables: 10, 
      table_numbers: [
        { number: 'Meja 01' }, { number: 'Meja 02' }, { number: 'Meja 03' }, { number: 'Meja 04' }, { number: 'Meja 05' },
        { number: 'Meja 06' }, { number: 'Meja 07' }, { number: 'Meja 08' }, { number: 'Meja 09' }, { number: 'Meja 10' }
      ] 
    }
  ],
  paymentMethods: [
    { id: 1, name: 'Tunai (Cash)', code: 'CASH', status: 'Aktif' },
    { id: 2, name: 'QRIS (Gopay/OVO/Shopee)', code: 'QRIS', status: 'Aktif' },
    { id: 3, name: 'Debit / EDC Bank', code: 'EDC', status: 'Aktif' }
  ],
  suppliers: [],
  units: [],
  expenseMaster: [],
  ingredients: [
    { id: 1, name: 'Beras Premium', category: 'Bahan Pokok', stock: 100, unit: 'kg' },
    { id: 2, name: 'Daging Ayam Fresh', category: 'Bahan Utama', stock: 50, unit: 'kg' },
    { id: 3, name: 'Teh Celup Resto', category: 'Bahan Minuman', stock: 200, unit: 'pcs' }
  ],

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

  // 6. KETENTUAN POLICIES
  policies: [
    { id: 1, title: 'SOP Batas Pengeluaran Kas Kecil (Petty Cash)', content: 'Setiap pengeluaran kasir di atas Rp 1.000.000 wajib mengunggah foto nota dan memerlukan persetujuan (approval) Manajer Cabang atau Super Admin.' },
    { id: 2, title: 'Kebijakan Penutupan Kasir (Shift Closing)', content: 'Penutupan kasir wajib dilakukan di akhir shift. Toleransi selisih uang fisik kasir adalah 0 (NIHIL).' }
  ],

  // 7. PENGATURAN (SISTEM & HAK AKSES PERAN - PRESERVED)
  permissionMatrix: [
    { role: 'Super Admin / Owner', dashboard: true, masterData: true, costs: true, stock: true, approved: true, reports: true, policies: true, settings: true },
    { role: 'Manajer Cabang (Branch Manager)', dashboard: true, masterData: true, costs: true, stock: true, approved: true, reports: true, policies: true, settings: false },
    { role: 'Kasir / Staf Keuangan', dashboard: false, masterData: false, costs: false, stock: true, approved: false, reports: false, policies: true, settings: false }
  ],

  mobilePermissionMatrix: [
    { role: 'Super Admin / Owner', posCashier: true, voidOrder: true, manualDiscount: true, stockOpname: true, receiveGoods: true, mobileReports: true, shiftClosing: true },
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
    apiKey: 'MRIS-SEC-KEY-99882233-X7Z',
    tokenExpiryHours: 24,
    dbEncryption: 'AES-256 Enabled',
    lastSecurityScan: '2026-07-24 08:00:00 WIB'
  },

  // HAK USER & AKUN PENGGUNA TERDAFTAR (PRESERVED FOR LOGIN & AUTH)
  userAccounts: [
    {
      id: 1,
      name: 'Budi Santoso (Super Admin)',
      outlet: 'Semua Outlet (Central)',
      username: 'superadmin',
      password: '888',
      role: 'Super Admin',
      status: 'Aktif',
      canLoginMobile: true,
      mobileLoginPassword: '888',
      canAccessMobileReports: true,
      mobileReportPassword: '8888'
    },
    {
      id: 2,
      name: 'Pak Hendra (Owner)',
      outlet: 'Semua Outlet (Central)',
      username: 'owner',
      password: '999',
      role: 'Owner',
      status: 'Aktif',
      canLoginMobile: true,
      mobileLoginPassword: '999',
      canAccessMobileReports: true,
      mobileReportPassword: '9999'
    },
    {
      id: 3,
      name: 'Andi Kasir',
      outlet: 'Kopi MRIS - Cabang Jakarta Pusat',
      username: 'andi_kasir',
      password: '123',
      role: 'Kasir',
      status: 'Aktif',
      canLoginMobile: true,
      mobileLoginPassword: '123',
      canAccessMobileReports: true,
      mobileReportPassword: '1234'
    },
    {
      id: 4,
      name: 'Siti Supervisor',
      outlet: 'Kopi MRIS - Cabang Jakarta Pusat',
      username: 'siti_spv',
      password: '123',
      role: 'SPV',
      status: 'Aktif',
      canLoginMobile: true,
      mobileLoginPassword: '123',
      canAccessMobileReports: true,
      mobileReportPassword: '7777'
    },
    {
      id: 5,
      name: 'Rian Dapur & Logistik',
      outlet: 'Kopi MRIS - Cabang Jakarta Pusat',
      username: 'rian_logistik',
      password: '123',
      role: 'Logistik',
      status: 'Aktif',
      canLoginMobile: true,
      mobileLoginPassword: '123',
      canAccessMobileReports: false,
      mobileReportPassword: '1234'
    },
    {
      id: 6,
      name: 'Agus Kepala Cabang',
      outlet: 'Kopi MRIS - Cabang Bandung',
      username: 'agus_kabeng',
      password: '123',
      role: 'Kepala Cabang',
      status: 'Aktif',
      canLoginMobile: true,
      mobileLoginPassword: '123',
      canAccessMobileReports: true,
      mobileReportPassword: '5555'
    },
    {
      id: 7,
      name: 'Dewi Admin Operasional',
      outlet: 'Kopi MRIS - Cabang Bandung',
      username: 'dewi_admin',
      password: '123',
      role: 'Admin',
      status: 'Aktif',
      canLoginMobile: true,
      mobileLoginPassword: '123',
      canAccessMobileReports: true,
      mobileReportPassword: '6666'
    }
  ],

  localServerConfig: {
    serverIp: 'http://localhost:4000',
    port: 4000,
    syncInterval: 30,
    autoSyncOnOnline: true,
    status: 'Connected'
  },

  // 8. DOKUMEN STANDAR SOP RESTORAN
  sopDocuments: [
    {
      id: 'SOP-001',
      title: 'SOP Persiapan Opening Restoran & Kasir POS',
      category: 'opening',
      categoryLabel: '🌅 Persiapan Opening',
      estimatedTime: '30 Menit (07:30 - 08:00 WIB)',
      updatedAt: '2026-07-20',
      author: 'Manager Operasional',
      summary: 'Panduan standar pemeriksaan mesin kasir POS, pengisian modal kas kecil Rp 500.000, dan kesiapan area makan.',
      steps: [
        'Pastikan koneksi Wi-Fi tablet POS Mobile dalam kondisi aktif dan stabil.',
        'Buka kasir di POS Mobile dan masukkan modal kas kecil sebesar Rp 500.000 ke laci cash drawer.',
        'Periksa ketersediaan kertas thermal printer di mesin printer kasir dan printer dapur.',
        'Lakukan pemeriksaan kebersihan area kasir, meja makan, dan peralatan menyaji.',
        'Nyalakan lampu utama, AC/Kipas, dan papan petunjuk restoran BUKA.'
      ]
    },
    {
      id: 'SOP-002',
      title: 'SOP Prosedur Penerimaan Pembayaran (Cash, QRIS & EDC)',
      category: 'kasir',
      categoryLabel: '💳 Kasir & Pembayaran',
      estimatedTime: 'Setiap Transaksi (2-3 Menit)',
      updatedAt: '2026-07-18',
      author: 'Supervisor Kasir',
      summary: 'Prosedur standar konfirmasi nominal pesanan, transaksi pembayaran tunai/non-tunai, dan penyerahan kembalian.',
      steps: [
        'Konfirmasikan ulang daftar pesanan dan total harga akhir kepada pelanggan secara ramah.',
        'Untuk pembayaran Tunai: Dapatkan uang tunai, hitung di depan pelanggan, masukkan ke cash drawer, dan serahkan kembalian pas.',
        'Untuk pembayaran QRIS: Arahkan pelanggan memindai QRIS Statis/Dinamis, dan pastikan notifikasi sukses di layar POS sebelum menyerahkan struk.',
        'Untuk pembayaran Card EDC: Gesek/tap kartu di EDC, pastikan resi EDC tercetak sukses (APPROVED).',
        'Serahkan struk belanja resmi dan ucapkan salam terima kasih kepada pelanggan.'
      ]
    },
    {
      id: 'SOP-003',
      title: 'SOP Kebersihan, Higiene & Keamanan Pangan',
      category: 'kebersihan',
      categoryLabel: '🧹 Kebersihan & Higiene',
      estimatedTime: 'Rutin Setiap Shift',
      updatedAt: '2026-07-15',
      author: 'Tim Quality Control',
      summary: 'Standar kebersihan staf kasir, sanitasi peralatan touch screen, dan penerapan higiene makanan.',
      steps: [
        'Staf kasir dan pramusaji wajib mencuci tangan menggunakan sabun antiseptik setiap 30 menit atau setelah menangani sampah/uang tunai.',
        'Wajib menggunakan pakaian seragam bersih, celemek, dan penutup rambut saat bertugas.',
        'Bersihkan permukaan layar POS Tablet dan meja kasir menggunakan cairan disinfektan food-grade secara berkala.',
        'Pastikan tidak ada bahan makanan terbuka yang diletakkan di area sekitar mesin kasir.',
        'Selalu cek tanggal kadaluarsa bahan baku minuman dan bumbu pelengkap.'
      ]
    },
    {
      id: 'SOP-004',
      title: 'SOP Penanganan Komplain & Retur Pelanggan',
      category: 'komplain',
      categoryLabel: '🤝 Pelayanan Pelanggan',
      estimatedTime: 'Penanganan Langsung (< 5 Menit)',
      updatedAt: '2026-07-19',
      author: 'Customer Relation Manager',
      summary: 'Langkah standar mendengarkan keluhan pelanggan dengan 3S dan pembuatan laporan barang rusak/retur di POS Mobile.',
      steps: [
        'Terapkan 3S (Senyum, Sapa, Salam) dan dengarkan keluhan pelanggan dengan tenang tanpa memotong pembicaraan.',
        'Ucapkan permohonan maaf atas ketidaknyamanan yang dialami pelanggan.',
        'Apabila makanan/minuman tidak sesuai atau rusak, segera ganti dengan porsi baru yang segar.',
        'Buka menu Laporan di POS Mobile -> pilih "Buat Laporan Barang Rusak (Waste)" untuk menginput barang retur.',
        'Laporkan kejadian komplain kepada Supervisor/Manager shift untuk evaluasi dapur.'
      ]
    },
    {
      id: 'SOP-005',
      title: 'SOP Shift Closing & Setor Tunai Harian',
      category: 'closing',
      categoryLabel: '🌙 Penutupan / Closing',
      estimatedTime: '45 Menit (21:30 - 22:15 WIB)',
      updatedAt: '2026-07-21',
      author: 'Head Accountant',
      summary: 'Prosedur penutupan shift kasir, pencetakan laporan closing, dan penyetoran uang tunai ke brankas/manager.',
      steps: [
        'Buka menu Shift Closing di POS Mobile dan lakukan perhitungan fisik seluruh uang tunai yang ada di laci kasir.',
        'Hitung dan pisahkan modal awal kas kecil (Rp 500.000) dari hasil penjualan tunai harian.',
        'Cocokkan jumlah kas fisik tunai dengan total omzet cash yang terdaftar di sistem POS Mobile.',
        'Cetak Struk Rekap Closing Kasir dan mintalah tanda tangan verifikasi dari Supervisor/Manager shift.',
        'Masukkan uang setor tunai beserta laporan fisik ke dalam amplop tertutup dan simpan di brankas aman.'
      ]
    },
    {
      id: 'SOP-006',
      title: 'SOP Penanganan Stok Opname & Kerusakan Barang',
      category: 'stok',
      categoryLabel: '📦 Logistik & Stok Opname',
      estimatedTime: 'Setiap Akhir Hari / Mingguan',
      updatedAt: '2026-07-22',
      author: 'Head Logistik Pusat',
      summary: 'Panduan perhitungan fisik persediaan bahan baku dan pelaporan stok opname ke Web-Based Admin.',
      steps: [
        'Lakukan penimbangan dan perhitungan sisa stok fisik seluruh bahan baku (daging, beras, minyak, bumbu) di ruang penyimpanan.',
        'Catat sisa stok fisik secara teliti ke dalam lembar kerja audit.',
        'Buka menu Laporan -> "Buat Laporan Logistik" atau "Laporan Stok Opname" di POS Mobile.',
        'Input sisa stok fisik dan pastikan selisih (surplus/defisit) teranalisis otomatis oleh sistem.',
        'Kirimkan laporan opname untuk mendapatkan persetujuan (approval) dari Web Admin Logistik Pusat.'
      ]
    }
  ]
};
