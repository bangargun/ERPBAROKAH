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
  Sparkles
} from 'lucide-react';
import PaginationControls from './PaginationControls';

export default function SopManagementPage({ masterData, setMasterData, selectedBranch }) {
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
    setShowModal(true);
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
    <div style={{ padding: '24px', flex: 1, overflowY: 'auto', background: '#0f172a', color: '#f8fafc' }}>
      
      {/* PAGE HEADER & ACTION BAR */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', background: '#1e293b', padding: '20px 24px', borderRadius: '18px', border: '1px solid rgba(255,255,255,0.08)' }}>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: '900', color: '#ffffff', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <BookOpen size={28} color="#34d399" />
            <span>Kelola Dokumen Standar Operasional Prosedur (SOP)</span>
          </h1>
          <p style={{ fontSize: '0.82rem', color: '#94a3b8', margin: '4px 0 0 0' }}>
            Manajemen Panduan Kerja Staf Restoran, Prosedur Pembayaran Kasir, & Sinkronisasi ke Aplikasi POS Mobile Kasir
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          {/* TOAST NOTIFICATION FOR SYNC */}
          {toastSyncSuccess && (
            <div className="animate-fade-in" style={{ background: 'rgba(52, 211, 153, 0.2)', border: '1px solid #34d399', color: '#34d399', padding: '8px 16px', borderRadius: '12px', fontSize: '0.80rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CheckCircle2 size={18} />
              <span>Daftar SOP Berhasil Terkirim ke POS Mobile Kasir!</span>
            </div>
          )}

          <button
            type="button"
            onClick={handleSyncToMobileApk}
            style={{
              padding: '10px 18px',
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              color: '#ffffff',
              border: 'none',
              borderRadius: '12px',
              fontWeight: '900',
              fontSize: '0.84rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 4px 14px rgba(16,185,129,0.35)'
            }}
          >
            <Smartphone size={18} />
            <span>📱 Kirim & Sinkron ke Mobile APK</span>
          </button>

          <button
            type="button"
            onClick={handleOpenAddModal}
            style={{
              padding: '10px 18px',
              background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
              color: '#ffffff',
              border: 'none',
              borderRadius: '12px',
              fontWeight: '900',
              fontSize: '0.84rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 4px 14px rgba(99,102,241,0.35)'
            }}
          >
            <Plus size={18} />
            <span>+ Tambah Dokumen SOP Baru</span>
          </button>
        </div>
      </div>

      {/* STATS & SUMMARY BAR */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
        <div style={{ background: '#1e293b', padding: '18px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ fontSize: '0.76rem', color: '#94a3b8', fontWeight: '700' }}>TOTAL DOKUMEN SOP</div>
          <div style={{ fontSize: '1.4rem', fontWeight: '900', color: '#ffffff', marginTop: '6px' }}>
            {sopList.length} Dokumen Resmi
          </div>
        </div>

        <div style={{ background: '#1e293b', padding: '18px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ fontSize: '0.76rem', color: '#94a3b8', fontWeight: '700' }}>SOP KASIR & KEUANGAN</div>
          <div style={{ fontSize: '1.4rem', fontWeight: '900', color: '#38bdf8', marginTop: '6px' }}>
            {sopList.filter(s => s.category === 'kasir' || s.category === 'closing').length} Dokumen
          </div>
        </div>

        <div style={{ background: '#1e293b', padding: '18px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ fontSize: '0.76rem', color: '#94a3b8', fontWeight: '700' }}>SOP KEBERSIHAN & HIGIENE</div>
          <div style={{ fontSize: '1.4rem', fontWeight: '900', color: '#34d399', marginTop: '6px' }}>
            {sopList.filter(s => s.category === 'kebersihan').length} Dokumen
          </div>
        </div>

        <div style={{ background: '#1e293b', padding: '18px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ fontSize: '0.76rem', color: '#94a3b8', fontWeight: '700' }}>STATUS SINKRONISASI APK</div>
          <div style={{ fontSize: '1.1rem', fontWeight: '900', color: '#a78bfa', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>🟢 SYNCED READY</span>
          </div>
        </div>
      </div>

      {/* FILTER & SEARCH CONTROL BAR */}
      <div style={{ background: '#1e293b', padding: '18px 20px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.08)', marginBottom: '24px', display: 'flex', flexWrap: 'wrap', gap: '16px', justifyContent: 'space-between', alignItems: 'center' }}>
        
        {/* SEARCH BOX */}
        <div style={{ flex: 1, minWidth: '280px', position: 'relative' }}>
          <Search size={18} color="#94a3b8" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Cari berdasarkan judul SOP, deskripsi, atau kata kunci..."
            className="form-input"
            style={{ width: '100%', paddingLeft: '40px', height: '42px', background: '#0f172a' }}
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
                borderColor: categoryFilter === cat.id ? '#34d399' : '#334155',
                background: categoryFilter === cat.id ? 'rgba(52, 211, 153, 0.18)' : '#0f172a',
                color: categoryFilter === cat.id ? '#34d399' : '#94a3b8',
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
          <div style={{ gridColumn: '1 / -1', background: '#1e293b', padding: '40px', borderRadius: '16px', textAlign: 'center', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.08)' }}>
            <BookOpen size={48} color="#64748b" style={{ marginBottom: '12px' }} />
            <h3 style={{ fontSize: '1.1rem', fontWeight: '800', color: '#ffffff', margin: 0 }}>Tidak Ada Dokumen SOP Ditemukan</h3>
            <p style={{ fontSize: '0.82rem', marginTop: '6px' }}>Coba ubah kata kunci pencarian atau pilih filter kategori lain.</p>
          </div>
        ) : (
          paginatedSops.map((sop) => (
            <div
              key={sop.id}
              style={{
                background: '#1e293b',
                borderRadius: '18px',
                padding: '22px',
                border: '1px solid rgba(255,255,255,0.08)',
                display: 'flex',
                flexDirection: 'column',
                justify: 'space-between',
                gap: '16px',
                boxShadow: '0 8px 20px rgba(0,0,0,0.18)'
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: '900', color: '#34d399', background: 'rgba(52, 211, 153, 0.15)', padding: '4px 10px', borderRadius: '8px', border: '1px solid rgba(52, 211, 153, 0.3)' }}>
                    {sop.categoryLabel || categoryMap[sop.category]}
                  </span>
                  <span style={{ fontSize: '0.74rem', color: '#38bdf8', fontWeight: '800', background: 'rgba(56,189,248,0.12)', padding: '4px 10px', borderRadius: '8px' }}>
                    🆔 {sop.id}
                  </span>
                </div>

                <h3 style={{ fontSize: '1.1rem', fontWeight: '900', color: '#ffffff', margin: '0 0 10px 0', lineHeight: '1.35' }}>
                  {sop.title}
                </h3>

                <p style={{ fontSize: '0.82rem', color: '#cbd5e1', margin: '0 0 14px 0', lineHeight: '1.45' }}>
                  {sop.summary}
                </p>

                <div style={{ background: '#0f172a', padding: '12px', borderRadius: '10px', border: '1px solid #334155', display: 'flex', gap: '14px', fontSize: '0.76rem', color: '#94a3b8' }}>
                  <span>⏱️ <strong>Estimasi:</strong> {sop.estimatedTime}</span>
                  <span>👤 <strong>Staf:</strong> {sop.author}</span>
                  <span>✅ <strong>Checklist:</strong> {(sop.steps || []).length} Langkah</span>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '14px' }}>
                <button
                  type="button"
                  onClick={() => setViewingSop(sop)}
                  style={{ padding: '7px 14px', background: 'rgba(56,189,248,0.15)', border: '1px solid rgba(56,189,248,0.3)', color: '#38bdf8', borderRadius: '8px', fontSize: '0.78rem', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <BookOpen size={15} />
                  <span>Pratinjau SOP</span>
                </button>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => handleOpenEditModal(sop)}
                    style={{ padding: '7px 14px', background: 'rgba(99,102,241,0.2)', border: '1px solid #6366f1', color: '#818cf8', borderRadius: '8px', fontSize: '0.78rem', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    <Edit3 size={15} />
                    <span>Edit SOP</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDeleteSop(sop.id, sop.title)}
                    style={{ padding: '7px 12px', background: 'rgba(244,63,94,0.15)', border: '1px solid rgba(244,63,94,0.3)', color: '#f43f5e', borderRadius: '8px', fontSize: '0.78rem', fontWeight: '800', cursor: 'pointer' }}
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

      {/* MODAL 1: FORM TAMBAH / EDIT DOKUMEN SOP */}
      {showModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999
        }}>
          <div className="glass-card animate-fade-in" style={{
            width: '100%', maxWidth: '720px', maxHeight: '90vh', padding: '26px', background: '#1e293b', border: '1px solid #34d399', borderRadius: '22px', display: 'flex', flexDirection: 'column', gap: '16px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #334155', paddingBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <BookOpen size={24} color="#34d399" />
                <div>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: '900', color: '#ffffff', margin: 0 }}>
                    {editingSopId ? `Edit Dokumen SOP (${editingSopId})` : 'Buat Dokumen SOP Restoran Baru'}
                  </h3>
                  <p style={{ fontSize: '0.78rem', color: '#94a3b8', margin: '2px 0 0 0' }}>
                    Isi detail judul, kategori, ringkasan, dan langkah-langkah checklist kerja operasional
                  </p>
                </div>
              </div>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontWeight: '900', fontSize: '1.2rem' }}>✕</button>
            </div>

            <form onSubmit={handleSaveSop} style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '14px', paddingRight: '4px' }}>
              
              <div>
                <label style={{ fontSize: '0.78rem', color: '#94a3b8', display: 'block', marginBottom: '4px', fontWeight: '700' }}>Judul Dokumen SOP *</label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={e => setFormTitle(e.target.value)}
                  placeholder="Contoh: SOP Prosedur Penerimaan Pembayaran Kasir POS"
                  className="form-input"
                  style={{ width: '100%', height: '42px' }}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.78rem', color: '#94a3b8', display: 'block', marginBottom: '4px', fontWeight: '700' }}>Kategori SOP</label>
                  <select
                    value={formCategory}
                    onChange={e => setFormCategory(e.target.value)}
                    className="form-input"
                    style={{ width: '100%', height: '42px', background: '#0f172a', color: '#ffffff' }}
                  >
                    <option value="opening">🌅 Persiapan Opening</option>
                    <option value="kasir">💳 Kasir & Pembayaran</option>
                    <option value="kebersihan">🧹 Kebersihan & Higiene</option>
                    <option value="komplain">🤝 Pelayanan Pelanggan</option>
                    <option value="closing">🌙 Penutupan / Closing</option>
                    <option value="stok">📦 Logistik & Stok Opname</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '0.78rem', color: '#94a3b8', display: 'block', marginBottom: '4px', fontWeight: '700' }}>Estimasi Durasi Waktu</label>
                  <input
                    type="text"
                    value={formEstimatedTime}
                    onChange={e => setFormEstimatedTime(e.target.value)}
                    placeholder="Contoh: 30 Menit (07:30 - 08:00 WIB)"
                    className="form-input"
                    style={{ width: '100%', height: '42px' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.78rem', color: '#94a3b8', display: 'block', marginBottom: '4px', fontWeight: '700' }}>Penanggung Jawab / Author</label>
                  <input
                    type="text"
                    value={formAuthor}
                    onChange={e => setFormAuthor(e.target.value)}
                    placeholder="Manager Operasional / Supervisor"
                    className="form-input"
                    style={{ width: '100%', height: '42px' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.78rem', color: '#94a3b8', display: 'block', marginBottom: '4px', fontWeight: '700' }}>Ringkasan / Deskripsi Singkat SOP</label>
                <textarea
                  value={formSummary}
                  onChange={e => setFormSummary(e.target.value)}
                  placeholder="Jelaskan secara singkat tujuan dan cakupan prosedur ini..."
                  className="form-input"
                  style={{ width: '100%', height: '70px', padding: '10px', resize: 'vertical' }}
                  rows={3}
                />
              </div>

              {/* DYNAMIC STEPS CHECKLIST FORM */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label style={{ fontSize: '0.84rem', color: '#ffffff', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <CheckSquare size={16} color="#34d399" />
                    <span>Langkah-Langkah Checklist Operasional Staf</span>
                  </label>

                  <button
                    type="button"
                    onClick={handleAddStepField}
                    style={{ padding: '4px 12px', background: 'rgba(52, 211, 153, 0.18)', border: '1px solid #34d399', color: '#34d399', borderRadius: '8px', fontSize: '0.74rem', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    <Plus size={14} />
                    <span>+ Tambah Langkah</span>
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {formSteps.map((stepVal, idx) => (
                    <div key={idx} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#0f172a', border: '1px solid #334155', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.76rem', fontWeight: '900', color: '#34d399', flexShrink: 0 }}>
                        {idx + 1}
                      </div>
                      <input
                        type="text"
                        value={stepVal}
                        onChange={e => handleStepChange(idx, e.target.value)}
                        placeholder={`Langkah ke-${idx + 1}...`}
                        className="form-input"
                        style={{ flex: 1, height: '40px' }}
                      />
                      {formSteps.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveStepField(idx)}
                          style={{ padding: '8px', background: 'rgba(244,63,94,0.15)', border: '1px solid rgba(244,63,94,0.3)', color: '#f43f5e', borderRadius: '8px', cursor: 'pointer' }}
                        >
                          <X size={16} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '12px', borderTop: '1px solid #334155', paddingTop: '14px' }}>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  style={{ padding: '12px 20px', background: '#334155', color: '#ffffff', border: 'none', borderRadius: '10px', fontWeight: '800', cursor: 'pointer' }}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  style={{ padding: '12px 26px', background: 'linear-gradient(135deg, #34d399 0%, #059669 100%)', color: '#ffffff', border: 'none', borderRadius: '10px', fontWeight: '900', cursor: 'pointer', boxShadow: '0 4px 14px rgba(52,211,153,0.4)' }}
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
                    {viewingSop.title}
                  </h3>
                  <p style={{ fontSize: '0.76rem', color: '#94a3b8', margin: '2px 0 0 0' }}>
                    Dokumen Resmi Standar Operasional Restoran • ID: {viewingSop.id}
                  </p>
                </div>
              </div>
              <button onClick={() => setViewingSop(null)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontWeight: '900', fontSize: '1.2rem' }}>✕</button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px', paddingRight: '4px' }}>
              
              <div style={{ background: '#0f172a', padding: '14px', borderRadius: '12px', border: '1px solid #334155', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', fontSize: '0.78rem' }}>
                <div>
                  <span style={{ color: '#94a3b8', display: 'block' }}>Kategori:</span>
                  <span style={{ fontWeight: '800', color: '#34d399' }}>{viewingSop.categoryLabel}</span>
                </div>
                <div>
                  <span style={{ color: '#94a3b8', display: 'block' }}>Estimasi Durasi:</span>
                  <span style={{ fontWeight: '800', color: '#38bdf8' }}>⏱️ {viewingSop.estimatedTime}</span>
                </div>
                <div>
                  <span style={{ color: '#94a3b8', display: 'block' }}>Penanggung Jawab:</span>
                  <span style={{ fontWeight: '800', color: '#a78bfa' }}>👤 {viewingSop.author}</span>
                </div>
              </div>

              <div>
                <h4 style={{ fontSize: '0.88rem', fontWeight: '900', color: '#ffffff', marginBottom: '6px' }}>📝 Ringkasan Prosedur:</h4>
                <p style={{ fontSize: '0.82rem', color: '#cbd5e1', lineHeight: '1.5', margin: 0 }}>
                  {viewingSop.summary}
                </p>
              </div>

              <div>
                <h4 style={{ fontSize: '0.88rem', fontWeight: '900', color: '#ffffff', marginBottom: '10px' }}>✅ Langkah-Langkah Operasional Checklist:</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {(viewingSop.steps || []).map((step, sIdx) => (
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
              <span style={{ fontSize: '0.72rem', color: '#64748b' }}>Terakhir diverifikasi: {viewingSop.updatedAt}</span>
              <button onClick={() => setViewingSop(null)} style={{ padding: '10px 20px', background: '#334155', color: '#ffffff', border: 'none', borderRadius: '10px', fontWeight: '800', cursor: 'pointer' }}>
                Tutup Pratinjau SOP
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
