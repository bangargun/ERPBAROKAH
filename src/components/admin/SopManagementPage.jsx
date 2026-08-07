import React, { useState } from 'react';
import { 
  BookOpen, 
  Plus, 
  Edit3, 
  Trash2, 
  Send, 
  Search, 
  CheckCircle2, 
  X, 
  Clock, 
  User, 
  FileText, 
  CheckSquare, 
  Smartphone,
  Sparkles,
  Bot,
  Zap,
  RefreshCw,
  Wand2,
  HelpCircle,
  Award
} from 'lucide-react';
import PaginationControls from './PaginationControls';
import { getThemePalette } from '../../utils/themeUtils';

// Pre-built AI SOP Templates for Instant Generation
const aiSopTemplates = {
  kasir: {
    title: 'SOP Prosedur Penerimaan Pembayaran & Rekonsiliasi Kasir POS',
    category: 'kasir',
    estimatedTime: '15-20 Menit',
    author: 'Manager Keuangan & AI Agent',
    summary: 'Standar operasional penerimaan tunai, QRIS, EDC Bank, serta penghitungan kas modal awal dan closing shift kasir.',
    steps: [
      'Langkah 1: Kasir memverifikasi jumlah fisik uang modal awal di laci kasir (Cash Drawer) sebelum transaksi dimulai.',
      'Langkah 2: Input setiap pesanan pelanggan ke dalam POS Mobile Kasir sesuai nomor meja atau antrean takeout.',
      'Langkah 3: Konfirmasi metode pembayaran pelanggan (Tunai, QRIS, Debit/EDC) dan pastikan transaksi terverifikasi LUNAS di layar POS.',
      'Langkah 4: Berikan nota cetak fisik atau e-receipt WhatsApp kepada pelanggan beserta uang kembalian yang tepat.',
      'Langkah 5: Di akhir shift, lakukan Setor Kas & Rekonsiliasi Kasir Fisik vs Kasir Sistem pada menu Shift Closing.'
    ]
  },
  kebersihan: {
    title: 'SOP Sterilisasi Area Dining & Higiene Peralatan Makan',
    category: 'kebersihan',
    estimatedTime: '25-30 Menit',
    author: 'Head Sanitasi & AI Agent',
    summary: 'Prosedur pembersihan meja dining, sanitasi piring/gelas, dan penyemprotan desinfektan lantai dapur restoran.',
    steps: [
      'Langkah 1: Bersihkan sisa makanan di meja segera setelah pelanggan meninggalkan meja (Busing Table).',
      'Langkah 2: Semprot permukaan meja dengan larutan food-grade desinfektan dan usap menggunakan kain microfiber bersih.',
      'Langkah 3: Cuci piring dan alat makan menggunakan sabun antibakteri dan bilas dengan air panas suhu minimum 65°C.',
      'Langkah 4: Keringkan alat makan dan simpan di rak tertutup steril.',
      'Langkah 5: Sapu dan pel lantai dining room dan dapur menggunakan cairan pembersih lantai sesuai instruksi.'
    ]
  },
  stok: {
    title: 'SOP Audit Stock Opname & Penanganan Bahan Baku Rusak',
    category: 'stok',
    estimatedTime: '30-45 Menit',
    author: 'Head Inventory & AI Agent',
    summary: 'Tata cara pencatatan fisik bahan mentah, verifikasi tanggal kedaluwarsa (FIFO), dan pelaporan barang kadaluwarsa/rusak.',
    steps: [
      'Langkah 1: Lakukan penghitungan fisik bahan mentah (daging, ayam, bumbu, sembako) di chiller dan gudang penyimpanan.',
      'Langkah 2: Bandingkan jumlah stok fisik dengan stok sistem di halaman Stock Opname MRIS.',
      'Langkah 3: Jika terdeteksi selisih stok atau bahan kadaluwarsa, pisahkan bahan baku dan tandai label BARANG RUSAK.',
      'Langkah 4: Catat selisih stok dan alasannya (kadaluwarsa, tumpah, penyusutan) pada formulir Stok Rusak / Defektif.',
      'Langkah 5: Ajukan laporan adjustment stok ke Supervisor untuk disetujui (ACC).'
    ]
  },
  opening: {
    title: 'SOP Checklist Persiapan Opening Restoran Shift Pagi',
    category: 'opening',
    estimatedTime: '30 Menit (07:30 - 08:00 WIB)',
    author: 'Captain Outlet & AI Agent',
    summary: 'Prosedur pembukaan outlet, pemeriksaan aliran listrik/AC, pengecekan ketersediaan bahan, dan briefing staf pagi.',
    steps: [
      'Langkah 1: Buka pintu outlet, nyalakan lampu utama, AC, dan atur musik latar ruangan dining.',
      'Langkah 2: Periksa kebersihan area penerimaan tamu, meja kasir, dan kesiapan mesin POS/Printer.',
      'Langkah 3: Cek ketersediaan gas elpiji, air bersih, dan suhu chiller dapur utama.',
      'Langkah 4: Lakukan Morning Briefing 5 menit bersama seluruh staf shift pagi untuk membaca target omzet dan pembagian area.',
      'Langkah 5: Buka papan status outlet menjadi OPEN pada jam 08:00 WIB tepat.'
    ]
  },
  closing: {
    title: 'SOP Prosedur Penutupan Shift (Closing) & Keamanan Malam',
    category: 'closing',
    estimatedTime: '45 Menit (21:30 - 22:15 WIB)',
    author: 'Supervisor Restoran & AI Agent',
    summary: 'Pemeriksaan pemadaman alat listrik dapur, penguncian kasir, dan penyerahan laporan harian outlet.',
    steps: [
      'Langkah 1: Pastikan seluruh transaksi kasir di POS Mobile telah diselesaikan dan cetak Rekap Laporan Kasir Shift.',
      'Langkah 2: Hitung uang tunai di kasir, pisahkan uang modal awal dan masukkan uang hasil penjualan ke dalam Amplop Setor Kas.',
      'Langkah 3: Matikan kompor gas, fryer, exhaust fan, dan cabut peralatan listrik yang tidak diperlukan.',
      'Langkah 4: Pastikan seluruh sampah dapur telah diikat rapat dan dibuang ke tempat penampungan luar.',
      'Langkah 5: Kunci seluruh pintu akses outlet, aktifkan alarm keamanan, dan laporkan status closing di grup operasional.'
    ]
  },
  komplain: {
    title: 'SOP Penanganan Komplain Makanan & Layanan Pelanggan VIP',
    category: 'komplain',
    estimatedTime: '10-15 Menit',
    author: 'Head Waiter & AI Agent',
    summary: 'Standar penanganan umpan balik pelanggan, penggantian hidangan yang kurang memuaskan, dan kompensasi keramahan.',
    steps: [
      'Langkah 1: Dengarkan keluhan pelanggan dengan tenang, sopan, dan kontak mata tanpa memotong pembicaraan.',
      'Langkah 2: Sampaikan permohonan maaf secara tulus atas ketidaknyamanan yang dialami pelanggan.',
      'Langkah 3: Segera konfirmasi ke dapur untuk mengganti hidangan baru atau menyesuaikan tingkat kematangan makanan.',
      'Langkah 4: Berikan kompensasi complimentary (misal minuman penutup gratis) jika disetujui oleh Supervisor.',
      'Langkah 5: Catat kejadian komplain dan solusi pada Log Buku Tamu Operasional sebagai bahan evaluasi.'
    ]
  }
};

export default function SopManagementPage({ masterData, setMasterData, selectedBranch, themeMode = 'dark' }) {
  const T = getThemePalette(themeMode);

  // Read SOP list from masterData.sopDocuments, fallback to empty array
  const sopList = masterData.sopDocuments || [];

  // Pagination States (Default 25 rows per page)
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // State Management
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [showModal, setShowModal] = useState(false); // Add or Edit Modal
  const [editingSopId, setEditingSopId] = useState(null); // Null for Add, SOP ID string for Edit
  const [viewingSop, setViewingSop] = useState(null); // Detail Modal
  const [toastSyncSuccess, setToastSyncSuccess] = useState(false);

  // AI Generator States
  const [showAiGeneratorModal, setShowAiGeneratorModal] = useState(false);
  const [aiSelectedPreset, setAiSelectedPreset] = useState('kasir');
  const [aiCustomTopicPrompt, setAiCustomTopicPrompt] = useState('');
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [isAiApplied, setIsAiApplied] = useState(false);

  // Form Inputs
  const [formTitle, setFormTitle] = useState('');
  const [formCategory, setFormCategory] = useState('kasir');
  const [formEstimatedTime, setFormEstimatedTime] = useState('15-30 Menit');
  const [formAuthor, setFormAuthor] = useState('Manager Operasional');
  const [formSummary, setFormSummary] = useState('');
  const [formSteps, setFormSteps] = useState(['']);

  const categoryMap = {
    opening: '🌅 Persiapan Opening',
    kasir: '💳 Kasir & Pembayaran',
    kebersihan: '🧹 Kebersihan & Higiene',
    komplain: '🤝 Pelayanan Pelanggan',
    closing: '🌙 Penutupan / Closing',
    stok: '📦 Logistik & Stok Opname'
  };

  // Open Add Modal
  const handleOpenAddModal = () => {
    setEditingSopId(null);
    setFormTitle('');
    setFormCategory('kasir');
    setFormEstimatedTime('15-30 Menit');
    setFormAuthor('Manager Operasional');
    setFormSummary('');
    setFormSteps(['Langkah 1: ', 'Langkah 2: ']);
    setIsAiApplied(false);
    setShowModal(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (sop) => {
    setEditingSopId(sop.id);
    setFormTitle(sop.title || '');
    setFormCategory(sop.category || 'kasir');
    setFormEstimatedTime(sop.estimatedTime || '');
    setFormAuthor(sop.author || 'Manager Operasional');
    setFormSummary(sop.summary || '');
    setFormSteps(sop.steps && sop.steps.length > 0 ? [...sop.steps] : ['']);
    setIsAiApplied(false);
    setShowModal(true);
  };

  // Trigger AI Generation Logic
  const handleGenerateSopByAi = (presetKey, customPrompt) => {
    setIsAiGenerating(true);
    setTimeout(() => {
      let targetTemplate = aiSopTemplates[presetKey] || aiSopTemplates['kasir'];

      if (customPrompt && customPrompt.trim().length > 0) {
        const topicName = customPrompt.trim();
        targetTemplate = {
          title: `SOP Prosedur ${topicName}`,
          category: presetKey || 'kasir',
          estimatedTime: '20-30 Menit',
          author: 'Manager Operasional & Antigravity AI',
          summary: `Standar operasional dan panduan tata cara pelaksanaan ${topicName} di lingkungan restoran secara efektif, aman, dan teratur.`,
          steps: [
            `Langkah 1: Lakukan persiapan awal, alat pendukung, dan pakaian kerja steril sebelum memulai ${topicName}.`,
            `Langkah 2: Periksa kondisi fisik area atau peralatan yang berhubungan dengan ${topicName}.`,
            `Langkah 3: Jalankan prosedur inti ${topicName} sesuai instruksi keselamatan dan mutu kerja restoran.`,
            `Langkah 4: Konfirmasi hasil kerja dengan Supervisor shift untuk memastikan standar operasional terpenuhi.`,
            `Langkah 5: Catat pelaksanaan ${topicName} pada buku log operasional harian.`
          ]
        };
      }

      // Populate form state directly so the user can immediately edit everything!
      setFormTitle(targetTemplate.title);
      setFormCategory(targetTemplate.category);
      setFormEstimatedTime(targetTemplate.estimatedTime);
      setFormAuthor(targetTemplate.author);
      setFormSummary(targetTemplate.summary);
      setFormSteps([...targetTemplate.steps]);

      setIsAiGenerating(false);
      setShowAiGeneratorModal(false);
      setIsAiApplied(true);
      setShowModal(true); // Open the editable SOP form modal
    }, 700);
  };

  // Handle Add/Remove Step Input
  const handleStepChange = (index, value) => {
    const updated = [...formSteps];
    updated[index] = value;
    setFormSteps(updated);
  };

  const handleAddStepField = () => {
    setFormSteps([...formSteps, '']);
  };

  const handleRemoveStepField = (index) => {
    if (formSteps.length <= 1) return;
    setFormSteps(formSteps.filter((_, idx) => idx !== index));
  };

  // Save Form (Create / Edit)
  const handleSaveSop = (e) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      alert('Judul Dokumen SOP Wajib Diisi!');
      return;
    }

    const filteredSteps = formSteps.filter(s => s.trim().length > 0);
    const currentDate = new Date().toISOString().split('T')[0];

    if (editingSopId) {
      // EDIT EXISTING SOP
      const updatedList = sopList.map(item => {
        if (item.id === editingSopId) {
          return {
            ...item,
            title: formTitle,
            category: formCategory,
            categoryLabel: categoryMap[formCategory] || 'SOP General',
            estimatedTime: formEstimatedTime,
            author: formAuthor,
            summary: formSummary,
            steps: filteredSteps,
            updatedAt: currentDate
          };
        }
        return item;
      });

      setMasterData({
        ...masterData,
        sopDocuments: updatedList
      });
      alert(`SOP "${formTitle}" Berhasil Diperbarui!`);
    } else {
      // CREATE NEW SOP
      const newId = `SOP-${String(sopList.length + 1).padStart(3, '0')}`;
      const newSop = {
        id: newId,
        title: formTitle,
        category: formCategory,
        categoryLabel: categoryMap[formCategory] || 'SOP General',
        estimatedTime: formEstimatedTime,
        author: formAuthor,
        summary: formSummary,
        steps: filteredSteps,
        updatedAt: currentDate
      };

      setMasterData({
        ...masterData,
        sopDocuments: [newSop, ...sopList]
      });
      alert(`SOP Baru "${formTitle}" Berhasil Dibuat!`);
    }

    setShowModal(false);
  };

  // Delete SOP
  const handleDeleteSop = (id, title) => {
    if (window.confirm(`Apakah Anda yakin ingin menghapus dokumen SOP "${title}"?`)) {
      const updatedList = sopList.filter(item => item.id !== id);
      setMasterData({
        ...masterData,
        sopDocuments: updatedList
      });
    }
  };

  // Send & Sync to POS Mobile APK
  const handleSyncToMobileApk = () => {
    setMasterData({
      ...masterData,
      pushedSopToMobile: [...sopList]
    });

    setToastSyncSuccess(true);
    setTimeout(() => setToastSyncSuccess(false), 4000);
  };

  // Filtered SOP Documents
  const filteredSops = sopList.filter(sop => {
    if (selectedBranch && sop.outlet_id && Number(sop.outlet_id) !== Number(selectedBranch)) return false;
    const matchCat = categoryFilter === 'all' || sop.category === categoryFilter;
    const matchQuery = !searchQuery || 
      sop.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
      sop.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sop.id.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCat && matchQuery;
  });

  // Pagination calculation
  const totalItems = filteredSops.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const paginatedSops = filteredSops.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div style={{ padding: '24px', flex: 1, overflowY: 'auto', background: T.pageBg, color: T.txtPrimary }}>
      
      {/* PAGE HEADER & ACTION BAR */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '16px',
        background: themeMode === 'warm_minimalist' ? '#143022' : T.cardBg,
        padding: '14px 18px',
        borderRadius: '12px',
        border: `1px solid ${T.border}`
      }}>
        <div>
          <h1 style={{ fontSize: '0.96rem', fontWeight: '900', color: themeMode === 'warm_minimalist' ? '#ffffff' : T.txtPrimary, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <BookOpen size={20} color={T.success} />
            <span>Kelola Dokumen Standar Operasional Prosedur (SOP)</span>
          </h1>
          <p style={{ fontSize: '0.72rem', color: themeMode === 'warm_minimalist' ? 'rgba(255,255,255,0.7)' : T.txtSecondary, margin: '2px 0 0 0' }}>
            Manajemen Panduan Kerja Staf Restoran, Prosedur Pembayaran Kasir, &amp; Generator AI Dokumen SOP
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* TOAST NOTIFICATION FOR SYNC */}
          {toastSyncSuccess && (
            <div className="animate-fade-in" style={{ background: T.successBg, border: `1px solid ${T.successBorder}`, color: T.success, padding: '6px 12px', borderRadius: '8px', fontSize: '0.70rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <CheckCircle2 size={16} />
              <span>Daftar SOP Berhasil Terkirim ke POS Mobile Kasir!</span>
            </div>
          )}

          {/* BUTTON 1: GENERATE BY AI */}
          <button
            type="button"
            onClick={() => setShowAiGeneratorModal(true)}
            style={{
              padding: '6px 12px',
              background: 'linear-gradient(135deg, #a855f7 0%, #6366f1 100%)',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              fontWeight: '900',
              fontSize: '0.72rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 2px 8px rgba(168,85,247,0.3)',
              transition: 'transform 0.2s ease'
            }}
          >
            <Sparkles size={14} />
            <span>Generate by AI</span>
          </button>

          {/* BUTTON 2: SYNC TO MOBILE APK */}
          <button
            type="button"
            onClick={handleSyncToMobileApk}
            style={{
              padding: '6px 12px',
              background: T.primaryBtn,
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              fontWeight: '900',
              fontSize: '0.72rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: `0 2px 8px ${T.primaryBtnShadow}`
            }}
          >
            <Smartphone size={14} />
            <span>Kirim ke Mobile APK</span>
          </button>

          {/* BUTTON 3: TAMBAH MANUAL */}
          <button
            type="button"
            onClick={handleOpenAddModal}
            style={{
              padding: '6px 12px',
              background: T.successBg,
              border: `1px solid ${T.successBorder}`,
              color: T.success,
              borderRadius: '8px',
              fontWeight: '900',
              fontSize: '0.72rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Plus size={14} />
            <span>+ Buat SOP Manual</span>
          </button>
        </div>
      </div>

      {/* STATS & SUMMARY BAR */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
        <div style={{ background: T.cardBg, padding: '18px', borderRadius: '16px', border: `1px solid ${T.border}` }}>
          <div style={{ fontSize: '0.76rem', color: T.txtSecondary, fontWeight: '700' }}>TOTAL DOKUMEN SOP</div>
          <div style={{ fontSize: '1.4rem', fontWeight: '900', color: T.txtPrimary, marginTop: '6px' }}>
            {sopList.length} Dokumen Resmi
          </div>
        </div>

        <div style={{ background: T.cardBg, padding: '18px', borderRadius: '16px', border: `1px solid ${T.border}` }}>
          <div style={{ fontSize: '0.76rem', color: T.txtSecondary, fontWeight: '700' }}>SOP KASIR &amp; KEUANGAN</div>
          <div style={{ fontSize: '1.4rem', fontWeight: '900', color: T.info, marginTop: '6px' }}>
            {sopList.filter(s => s.category === 'kasir' || s.category === 'closing').length} Dokumen
          </div>
        </div>

        <div style={{ background: T.cardBg, padding: '18px', borderRadius: '16px', border: `1px solid ${T.border}` }}>
          <div style={{ fontSize: '0.76rem', color: T.txtSecondary, fontWeight: '700' }}>SOP KEBERSIHAN &amp; HIGIENE</div>
          <div style={{ fontSize: '1.4rem', fontWeight: '900', color: T.success, marginTop: '6px' }}>
            {sopList.filter(s => s.category === 'kebersihan').length} Dokumen
          </div>
        </div>

        <div style={{ background: T.cardBg, padding: '18px', borderRadius: '16px', border: `1px solid ${T.border}` }}>
          <div style={{ fontSize: '0.76rem', color: T.txtSecondary, fontWeight: '700' }}>GENERATOR AI INTEGRATED</div>
          <div style={{ fontSize: '1.1rem', fontWeight: '900', color: T.accentGold, marginTop: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Sparkles size={16} />
            <span>✨ EDITABLE AI READY</span>
          </div>
        </div>
      </div>

      {/* FILTER & SEARCH CONTROL BAR */}
      <div style={{ background: T.cardBg, padding: '18px 20px', borderRadius: '16px', border: `1px solid ${T.border}`, marginBottom: '24px', display: 'flex', flexWrap: 'wrap', gap: '16px', justifyContent: 'space-between', alignItems: 'center' }}>
        
        {/* SEARCH BOX */}
        <div style={{ flex: 1, minWidth: '280px', position: 'relative' }}>
          <Search size={18} color={T.txtMuted} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Cari berdasarkan judul SOP, deskripsi, atau kata kunci..."
            className="form-input"
            style={{ width: '100%', paddingLeft: '40px', height: '42px', background: T.inputBg, border: `1px solid ${T.border}`, color: T.txtPrimary }}
          />
        </div>

        {/* CATEGORY FILTER BUTTONS */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {[
            { id: 'all', label: 'Semua Kategori' },
            { id: 'opening', label: '🌅 Opening' },
            { id: 'kasir', label: '💳 Kasir' },
            { id: 'kebersihan', label: '🧹 Kebersihan' },
            { id: 'komplain', label: '🤝 Pelayanan' },
            { id: 'closing', label: '🌙 Closing' },
            { id: 'stok', label: '📦 Stok Opname' }
          ].map(cat => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setCategoryFilter(cat.id)}
              style={{
                padding: '8px 14px',
                borderRadius: '10px',
                border: '1px solid',
                borderColor: categoryFilter === cat.id ? T.accentGold : T.tabBorder,
                background: categoryFilter === cat.id ? T.tabActiveBg : T.tabInactiveBg,
                color: categoryFilter === cat.id ? T.tabActiveColor : T.tabInactiveColor,
                fontSize: '0.78rem',
                fontWeight: '800',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* GRID DOKUMEN SOP CARDS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px' }}>
        {paginatedSops.length === 0 ? (
          <div style={{ gridColumn: '1 / -1', background: T.cardBg, padding: '40px', borderRadius: '16px', textAlign: 'center', color: T.txtSecondary, border: `1px solid ${T.border}` }}>
            <BookOpen size={48} color={T.txtMuted} style={{ marginBottom: '12px' }} />
            <h3 style={{ fontSize: '1.1rem', fontWeight: '800', color: T.txtPrimary, margin: 0 }}>Tidak Ada Dokumen SOP Ditemukan</h3>
            <p style={{ fontSize: '0.82rem', marginTop: '6px' }}>Coba gunakan fitur <strong>✨ Generate by AI</strong> atau ubah kata kunci pencarian.</p>
          </div>
        ) : (
          paginatedSops.map((sop) => (
            <div
              key={sop.id}
              style={{
                background: T.cardBg,
                borderRadius: '18px',
                padding: '22px',
                border: `1px solid ${T.border}`,
                display: 'flex',
                flexDirection: 'column',
                justify: 'space-between',
                gap: '16px',
                boxShadow: T.shadowMd
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: '900', color: T.success, background: T.successBg, padding: '4px 10px', borderRadius: '8px', border: `1px solid ${T.successBorder}` }}>
                    {sop.categoryLabel || categoryMap[sop.category]}
                  </span>
                  <span style={{ fontSize: '0.74rem', color: T.info, fontWeight: '800', background: T.infoBg, padding: '4px 10px', borderRadius: '8px', border: `1px solid ${T.infoBorder}` }}>
                    🆔 {sop.id}
                  </span>
                </div>

                <h3 style={{ fontSize: '1.1rem', fontWeight: '900', color: T.txtPrimary, margin: '0 0 10px 0', lineHeight: '1.35' }}>
                  {sop.title}
                </h3>

                <p style={{ fontSize: '0.82rem', color: T.txtSecondary, margin: '0 0 14px 0', lineHeight: '1.45' }}>
                  {sop.summary}
                </p>

                <div style={{ background: T.cardBg2, padding: '12px', borderRadius: '10px', border: `1px solid ${T.border}`, display: 'flex', gap: '14px', fontSize: '0.76rem', color: T.txtSecondary }}>
                  <span>⏱️ <strong>Estimasi:</strong> {sop.estimatedTime}</span>
                  <span>👤 <strong>Staf:</strong> {sop.author}</span>
                  <span>✅ <strong>Checklist:</strong> {(sop.steps || []).length} Langkah</span>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: `1px solid ${T.border}`, paddingTop: '14px' }}>
                <button
                  type="button"
                  onClick={() => setViewingSop(sop)}
                  style={{ padding: '7px 14px', background: T.infoBg, border: `1px solid ${T.infoBorder}`, color: T.info, borderRadius: '8px', fontSize: '0.78rem', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <BookOpen size={15} />
                  <span>Pratinjau SOP</span>
                </button>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => handleOpenEditModal(sop)}
                    style={{ padding: '7px 14px', background: T.accentGoldBg, border: `1px solid ${T.accentGoldBorder}`, color: T.accentGold, borderRadius: '8px', fontSize: '0.78rem', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    <Edit3 size={15} />
                    <span>Edit SOP</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDeleteSop(sop.id, sop.title)}
                    style={{ padding: '7px 12px', background: T.dangerBg, border: `1px solid ${T.dangerBorder}`, color: T.danger, borderRadius: '8px', fontSize: '0.78rem', fontWeight: '800', cursor: 'pointer' }}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* PAGINATION CONTROLS */}
      <PaginationControls
        currentPage={currentPage}
        totalPages={totalPages}
        pageSize={pageSize}
        totalItems={totalItems}
        onPageChange={setCurrentPage}
        onPageSizeChange={setPageSize}
      />

      {/* ------------------------------------------------------------- */}
      {/* MODAL AI: GENERATOR DOKUMEN SOP CERDAS BY AI                  */}
      {/* ------------------------------------------------------------- */}
      {showAiGeneratorModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999
        }}>
          <div className="glass-card animate-fade-in" style={{
            width: '100%', maxWidth: '640px', padding: '26px', background: T.cardBg, border: `1px solid ${T.borderStrong}`, borderRadius: '22px', display: 'flex', flexDirection: 'column', gap: '18px', boxShadow: T.shadowLg
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${T.border}`, paddingBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'linear-gradient(135deg, #a855f7 0%, #6366f1 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 15px rgba(168,85,247,0.5)' }}>
                  <Bot size={24} color="#ffffff" />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: '900', color: T.txtPrimary, margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>Generator Dokumen SOP by AI</span>
                    <Sparkles size={16} color="#a855f7" />
                  </h3>
                  <p style={{ fontSize: '0.78rem', color: T.txtSecondary, margin: '2px 0 0 0' }}>
                    Pilih preset topik atau ketik topik khusus. Hasil AI dapat Anda edit sepenuhnya sebelum disimpan.
                  </p>
                </div>
              </div>
              <button onClick={() => setShowAiGeneratorModal(false)} style={{ background: 'none', border: 'none', color: T.txtMuted, cursor: 'pointer', fontWeight: '900', fontSize: '1.2rem' }}>✕</button>
            </div>

            {/* PRESET TOPIC CHIPS */}
            <div>
              <label style={{ fontSize: '0.78rem', color: T.txtSecondary, display: 'block', marginBottom: '8px', fontWeight: '700' }}>
                1. Pilih Preset Topik Standar Operasional Restoran:
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
                {[
                  { id: 'kasir', label: '💳 SOP Kasir POS & QRIS' },
                  { id: 'kebersihan', label: '🧹 SOP Kebersihan & Higiene' },
                  { id: 'stok', label: '📦 SOP Audit Stok Opname' },
                  { id: 'opening', label: '🌅 SOP Checklist Opening' },
                  { id: 'closing', label: '🌙 SOP Closing & Keamanan' },
                  { id: 'komplain', label: '🤝 SOP Handling Komplain' }
                ].map(chip => (
                  <button
                    key={chip.id}
                    type="button"
                    onClick={() => {
                      setAiSelectedPreset(chip.id);
                      setAiCustomTopicPrompt('');
                    }}
                    style={{
                      padding: '10px 12px',
                      borderRadius: '10px',
                      border: '1px solid',
                      borderColor: aiSelectedPreset === chip.id && !aiCustomTopicPrompt ? T.accentGold : T.border,
                      background: aiSelectedPreset === chip.id && !aiCustomTopicPrompt ? T.accentGoldBg : T.cardBg2,
                      color: aiSelectedPreset === chip.id && !aiCustomTopicPrompt ? T.accentGold : T.txtSecondary,
                      fontSize: '0.78rem',
                      fontWeight: '800',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {chip.label}
                  </button>
                ))}
              </div>
            </div>

            {/* CUSTOM TOPIC PROMPT INPUT */}
            <div>
              <label style={{ fontSize: '0.78rem', color: T.txtSecondary, display: 'block', marginBottom: '6px', fontWeight: '700' }}>
                2. Atau Ketik Topik SOP Khusus (Opsional):
              </label>
              <input
                type="text"
                value={aiCustomTopicPrompt}
                onChange={e => setAiCustomTopicPrompt(e.target.value)}
                placeholder="Contoh: Penanganan Mati Listrik, Prosedur Kalibrasi Mesin Kopi, dll..."
                className="form-input"
                style={{ width: '100%', height: '42px', background: T.inputBg, border: `1px solid ${T.border}`, color: T.txtPrimary }}
              />
            </div>

            <div style={{ background: T.infoBg, border: `1px solid ${T.infoBorder}`, padding: '10px 14px', borderRadius: '10px', fontSize: '0.74rem', color: T.info, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Zap size={15} />
              <span>Dokumen hasil buatan AI akan otomatis membuka form input yang dapat Anda edit, ubah teks, atau tambah langkah checklistnya.</span>
            </div>

            {/* ACTION BUTTONS */}
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '6px' }}>
              <button
                type="button"
                onClick={() => setShowAiGeneratorModal(false)}
                style={{ padding: '12px 20px', background: T.controlBg, color: T.txtPrimary, border: `1px solid ${T.border}`, borderRadius: '10px', fontWeight: '800', cursor: 'pointer' }}
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => handleGenerateSopByAi(aiSelectedPreset, aiCustomTopicPrompt)}
                style={{ padding: '12px 24px', background: 'linear-gradient(135deg, #a855f7 0%, #6366f1 100%)', color: '#ffffff', border: 'none', borderRadius: '10px', fontWeight: '900', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 16px rgba(168,85,247,0.4)' }}
              >
                <Sparkles size={16} className={isAiGenerating ? "animate-spin" : ""} />
                <span>{isAiGenerating ? "Membuat Dokumen SOP AI..." : "🚀 Generate Dokumen SOP & Edit"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL 1: FORM TAMBAH / EDIT DOKUMEN SOP (EDITABLE AI RESULT)  */}
      {/* ------------------------------------------------------------- */}
      {showModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999
        }}>
          <div className="glass-card animate-fade-in" style={{
            width: '100%', maxWidth: '750px', maxHeight: '90vh', padding: '26px', background: T.cardBg, border: `1px solid ${T.borderStrong}`, borderRadius: '22px', display: 'flex', flexDirection: 'column', gap: '16px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${T.border}`, paddingBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <BookOpen size={24} color={T.success} />
                <div>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: '900', color: T.txtPrimary, margin: 0 }}>
                    {editingSopId ? `Edit Dokumen SOP (${editingSopId})` : 'Buat / Edit Dokumen SOP Restoran'}
                  </h3>
                  <p style={{ fontSize: '0.78rem', color: T.txtSecondary, margin: '2px 0 0 0' }}>
                    Edit detail judul, kategori, ringkasan, dan langkah-langkah checklist operasional di bawah ini
                  </p>
                </div>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowAiGeneratorModal(true)}
                  style={{ padding: '6px 12px', background: T.accentGoldBg, border: `1px solid ${T.accentGoldBorder}`, color: T.accentGold, borderRadius: '8px', fontSize: '0.74rem', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <Sparkles size={14} />
                  <span>✨ Generate AI</span>
                </button>
                <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', color: T.txtMuted, cursor: 'pointer', fontWeight: '900', fontSize: '1.2rem' }}>✕</button>
              </div>
            </div>

            {/* BANNER INDICATOR FOR AI APPLIED CONTENT */}
            {isAiApplied && (
              <div style={{ background: T.accentGoldBg, border: `1px solid ${T.accentGoldBorder}`, padding: '10px 14px', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.76rem', color: T.txtPrimary }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Sparkles size={16} color={T.accentGold} />
                  <span><strong>Dokumen AI Berhasil Dibuat &amp; Siap Diedit!</strong> Anda dapat mengubah judul, ringkasan, atau menambah/menghapus checklist langkah di bawah ini.</span>
                </div>
                <span style={{ fontSize: '0.68rem', background: T.accentGold, color: T.txtInverse, padding: '2px 8px', borderRadius: '6px', fontWeight: '900' }}>EDITABLE AI</span>
              </div>
            )}

            <form onSubmit={handleSaveSop} style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '14px', paddingRight: '4px' }}>
              
              <div>
                <label style={{ fontSize: '0.78rem', color: T.txtSecondary, display: 'block', marginBottom: '4px', fontWeight: '700' }}>Judul Dokumen SOP *</label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={e => setFormTitle(e.target.value)}
                  placeholder="Contoh: SOP Prosedur Penerimaan Pembayaran Kasir POS"
                  className="form-input"
                  style={{ width: '100%', height: '42px', background: T.inputBg, border: `1px solid ${T.border}`, color: T.txtPrimary }}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.78rem', color: T.txtSecondary, display: 'block', marginBottom: '4px', fontWeight: '700' }}>Kategori SOP</label>
                  <select
                    value={formCategory}
                    onChange={e => setFormCategory(e.target.value)}
                    className="form-input"
                    style={{ width: '100%', height: '42px', background: T.inputBg, border: `1px solid ${T.border}`, color: T.txtPrimary }}
                  >
                    <option value="opening">🌅 Persiapan Opening</option>
                    <option value="kasir">💳 Kasir &amp; Pembayaran</option>
                    <option value="kebersihan">🧹 Kebersihan &amp; Higiene</option>
                    <option value="komplain">🤝 Pelayanan Pelanggan</option>
                    <option value="closing">🌙 Penutupan / Closing</option>
                    <option value="stok">📦 Logistik &amp; Stok Opname</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '0.78rem', color: T.txtSecondary, display: 'block', marginBottom: '4px', fontWeight: '700' }}>Estimasi Durasi Waktu</label>
                  <input
                    type="text"
                    value={formEstimatedTime}
                    onChange={e => setFormEstimatedTime(e.target.value)}
                    placeholder="Contoh: 30 Menit (07:30 - 08:00 WIB)"
                    className="form-input"
                    style={{ width: '100%', height: '42px', background: T.inputBg, border: `1px solid ${T.border}`, color: T.txtPrimary }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.78rem', color: T.txtSecondary, display: 'block', marginBottom: '4px', fontWeight: '700' }}>Penanggung Jawab / Author</label>
                  <input
                    type="text"
                    value={formAuthor}
                    onChange={e => setFormAuthor(e.target.value)}
                    placeholder="Manager Operasional / Supervisor"
                    className="form-input"
                    style={{ width: '100%', height: '42px', background: T.inputBg, border: `1px solid ${T.border}`, color: T.txtPrimary }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.78rem', color: T.txtSecondary, display: 'block', marginBottom: '4px', fontWeight: '700' }}>Ringkasan / Deskripsi Singkat SOP</label>
                <textarea
                  value={formSummary}
                  onChange={e => setFormSummary(e.target.value)}
                  placeholder="Jelaskan secara singkat tujuan dan cakupan prosedur ini..."
                  className="form-input"
                  style={{ width: '100%', height: '70px', padding: '10px', resize: 'vertical', background: T.inputBg, border: `1px solid ${T.border}`, color: T.txtPrimary }}
                  rows={3}
                />
              </div>

              {/* DYNAMIC STEPS CHECKLIST FORM */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label style={{ fontSize: '0.84rem', color: T.txtPrimary, fontWeight: '800', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <CheckSquare size={16} color={T.success} />
                    <span>Langkah-Langkah Checklist Operasional Staf (Bisa Diedit):</span>
                  </label>

                  <button
                    type="button"
                    onClick={handleAddStepField}
                    style={{ padding: '4px 12px', background: T.successBg, border: `1px solid ${T.successBorder}`, color: T.success, borderRadius: '8px', fontSize: '0.74rem', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    <Plus size={14} />
                    <span>+ Tambah Langkah</span>
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {formSteps.map((stepVal, idx) => (
                    <div key={idx} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: T.cardBg2, border: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.76rem', fontWeight: '900', color: T.success, flexShrink: 0 }}>
                        {idx + 1}
                      </div>
                      <input
                        type="text"
                        value={stepVal}
                        onChange={e => handleStepChange(idx, e.target.value)}
                        placeholder={`Langkah ke-${idx + 1}...`}
                        className="form-input"
                        style={{ flex: 1, height: '40px', background: T.inputBg, border: `1px solid ${T.border}`, color: T.txtPrimary }}
                      />
                      {formSteps.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveStepField(idx)}
                          style={{ padding: '8px', background: T.dangerBg, border: `1px solid ${T.dangerBorder}`, color: T.danger, borderRadius: '8px', cursor: 'pointer' }}
                        >
                          <X size={16} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '12px', borderTop: `1px solid ${T.border}`, paddingTop: '14px' }}>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  style={{ padding: '12px 20px', background: T.controlBg, color: T.txtPrimary, border: `1px solid ${T.border}`, borderRadius: '10px', fontWeight: '800', cursor: 'pointer' }}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  style={{ padding: '12px 26px', background: T.primaryBtn, color: '#ffffff', border: 'none', borderRadius: '10px', fontWeight: '900', cursor: 'pointer', boxShadow: `0 4px 14px ${T.primaryBtnShadow}` }}
                >
                  💾 {editingSopId ? 'Simpan Perubahan SOP' : 'Simpan Dokumen SOP Baru'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: PRATINJAU / VIEW DETAIL SOP */}
      {viewingSop && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999
        }}>
          <div className="glass-card animate-fade-in" style={{
            width: '100%', maxWidth: '640px', maxHeight: '85vh', padding: '26px', background: T.cardBg, border: `1px solid ${T.borderStrong}`, borderRadius: '22px', display: 'flex', flexDirection: 'column', gap: '16px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${T.border}`, paddingBottom: '12px' }}>
              <div>
                <span style={{ fontSize: '0.72rem', fontWeight: '900', color: T.success, background: T.successBg, padding: '3px 8px', borderRadius: '6px', border: `1px solid ${T.successBorder}` }}>
                  {viewingSop.categoryLabel || categoryMap[viewingSop.category]}
                </span>
                <h3 style={{ fontSize: '1.2rem', fontWeight: '900', color: T.txtPrimary, margin: '6px 0 0 0' }}>
                  {viewingSop.title}
                </h3>
              </div>
              <button onClick={() => setViewingSop(null)} style={{ background: 'none', border: 'none', color: T.txtMuted, cursor: 'pointer', fontWeight: '900', fontSize: '1.2rem' }}>✕</button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ background: T.cardBg2, padding: '14px', borderRadius: '12px', border: `1px solid ${T.border}`, display: 'flex', justifyContent: 'space-around', fontSize: '0.80rem', color: T.txtSecondary }}>
                <span>🆔 <strong>Kode:</strong> {viewingSop.id}</span>
                <span>⏱️ <strong>Estimasi:</strong> {viewingSop.estimatedTime}</span>
                <span>👤 <strong>Author:</strong> {viewingSop.author}</span>
              </div>

              <div>
                <h4 style={{ fontSize: '0.88rem', fontWeight: '900', color: T.info, marginBottom: '6px' }}>📌 Ringkasan Dokumen:</h4>
                <p style={{ fontSize: '0.82rem', color: T.txtSecondary, lineHeight: '1.5', margin: 0 }}>
                  {viewingSop.summary}
                </p>
              </div>

              <div>
                <h4 style={{ fontSize: '0.88rem', fontWeight: '900', color: T.txtPrimary, marginBottom: '10px' }}>✅ Langkah-Langkah Operasional Checklist:</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {(viewingSop.steps || []).map((step, sIdx) => (
                    <div key={sIdx} style={{ display: 'flex', gap: '12px', background: T.cardBg2, padding: '12px 14px', borderRadius: '10px', border: `1px solid ${T.border}` }}>
                      <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: T.success, color: T.txtInverse, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900', fontSize: '0.78rem', flexShrink: 0 }}>
                        {sIdx + 1}
                      </div>
                      <span style={{ fontSize: '0.82rem', color: T.txtPrimary, lineHeight: '1.4' }}>
                        {step}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

            </div>

            <div style={{ borderTop: `1px solid ${T.border}`, paddingTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.72rem', color: T.txtMuted }}>Terakhir diverifikasi: {viewingSop.updatedAt}</span>
              <button onClick={() => setViewingSop(null)} style={{ padding: '10px 20px', background: T.controlBg, color: T.txtPrimary, border: `1px solid ${T.border}`, borderRadius: '10px', fontWeight: '800', cursor: 'pointer' }}>
                Tutup Pratinjau SOP
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
