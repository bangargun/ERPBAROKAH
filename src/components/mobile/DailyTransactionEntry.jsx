import React, { useState } from 'react';
import { PlusCircle, Camera, CheckCircle2, DollarSign, Tag, CreditCard, User, AlertCircle } from 'lucide-react';

export default function DailyTransactionEntry({ selectedBranch, categories, outlets, onTransactionAdded }) {
  const [type, setType] = useState('income'); // 'income' | 'expense'
  const [category, setCategory] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [createdBy, setCreatedBy] = useState('Kasir Shift');
  const [hasReceipt, setHasReceipt] = useState(false);
  const [loading, setLoading] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState(null);

  const currentOutlet = outlets.find(o => o.id === selectedBranch) || outlets[0];
  const filteredCategories = categories.filter(c => c.type === type);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!amount || !paymentMethod || !category) {
      setFeedbackMsg({ type: 'error', text: 'Mohon isi Nominal, Kategori & Metode Pembayaran' });
      return;
    }

    setLoading(true);

    const payload = {
      branch_id: selectedBranch || (outlets[0]?.id || 1),
      type,
      category,
      amount: parseFloat(amount),
      description,
      payment_method: paymentMethod,
      created_by: createdBy,
      receipt_url: hasReceipt ? `receipt_photo_${Date.now()}.jpg` : null
    };

    const getApiUrl = (pathStr) => {
      if (typeof window !== 'undefined') {
        const savedServer = localStorage.getItem('MRIS_SERVER_URL');
        if (savedServer && savedServer.trim() !== '') {
          return `${savedServer.replace(/\/$/, '')}${pathStr}`;
        }
      }
      return `https://mris-api.barokahgroupindonesia.tech${pathStr}`;
    };

    fetch(getApiUrl('/api/transactions'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
      .then(res => res.json())
      .then(data => {
        setLoading(false);
        if (data.error) {
          setFeedbackMsg({ type: 'error', text: data.error });
        } else {
          setFeedbackMsg({ type: 'success', text: data.message });
          setAmount('');
          setDescription('');
          setHasReceipt(false);
          if (onTransactionAdded) onTransactionAdded();
        }
      })
      .catch(err => {
        setLoading(false);
        setFeedbackMsg({ type: 'error', text: 'Gagal terhubung ke server API' });
      });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }} className="animate-fade-in">
      <div style={{ background: '#1e293b', padding: '14px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.08)' }}>
        <h3 style={{ fontSize: '1.05rem', fontWeight: '800', color: '#f8fafc' }}>
          Input Transaksi Restoran
        </h3>
        <p style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
          Cabang: <strong style={{ color: '#6366f1' }}>{currentOutlet?.name}</strong>
        </p>
      </div>

      {feedbackMsg && (
        <div style={{
          padding: '12px',
          borderRadius: '10px',
          fontSize: '0.8rem',
          fontWeight: '600',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          background: feedbackMsg.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(244, 63, 94, 0.15)',
          color: feedbackMsg.type === 'success' ? '#34d399' : '#fb7185',
          border: `1px solid ${feedbackMsg.type === 'success' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(244, 63, 94, 0.3)'}`
        }}>
          {feedbackMsg.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          <span>{feedbackMsg.text}</span>
        </div>
      )}

      {/* Income / Expense Toggle Pills */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', background: '#0f172a', padding: '4px', borderRadius: '12px', border: '1px solid #334155' }}>
        <button
          type="button"
          onClick={() => { setType('income'); setCategory(''); }}
          style={{
            padding: '10px',
            border: 'none',
            borderRadius: '10px',
            fontWeight: '700',
            fontSize: '0.85rem',
            cursor: 'pointer',
            background: type === 'income' ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : 'transparent',
            color: type === 'income' ? '#ffffff' : '#94a3b8',
            transition: 'all 0.2s ease'
          }}
        >
          + PEMASUKAN
        </button>

        <button
          type="button"
          onClick={() => { setType('expense'); setCategory(''); }}
          style={{
            padding: '10px',
            border: 'none',
            borderRadius: '10px',
            fontWeight: '700',
            fontSize: '0.85rem',
            cursor: 'pointer',
            background: type === 'expense' ? 'linear-gradient(135deg, #f43f5e 0%, #e11d48 100%)' : 'transparent',
            color: type === 'expense' ? '#ffffff' : '#94a3b8',
            transition: 'all 0.2s ease'
          }}
        >
          - PENGELUARAN
        </button>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {/* Nominal Amount */}
        <div>
          <label style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block', marginBottom: '4px', fontWeight: '600' }}>
            Nominal Transaksi (IDR)
          </label>
          <input
            type="number"
            required
            placeholder="0"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            className="form-input"
            style={{ fontSize: '1.2rem', fontWeight: '800', color: type === 'income' ? '#34d399' : '#fb7185' }}
          />
        </div>

        {/* Category Picker */}
        <div>
          <label style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block', marginBottom: '4px', fontWeight: '600' }}>
            Kategori Transaksi
          </label>
          <select
            value={category}
            onChange={e => setCategory(e.target.value)}
            required
            className="form-select"
          >
            <option value="">-- Pilih Kategori --</option>
            {filteredCategories.map(cat => (
              <option key={cat.id} value={cat.name}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>

        {/* Payment Method Quick Select */}
        <div>
          <label style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block', marginBottom: '6px', fontWeight: '600' }}>
            Metode Pembayaran
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
            {['Cash', 'QRIS', 'Transfer', 'EDC'].map(method => (
              <button
                key={method}
                type="button"
                onClick={() => setPaymentMethod(method)}
                style={{
                  padding: '8px 4px',
                  borderRadius: '8px',
                  border: '1px solid',
                  borderColor: paymentMethod === method ? '#6366f1' : '#334155',
                  background: paymentMethod === method ? 'rgba(99, 102, 241, 0.2)' : '#0f172a',
                  color: paymentMethod === method ? '#818cf8' : '#94a3b8',
                  fontSize: '0.75rem',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                {method}
              </button>
            ))}
          </div>
        </div>

        {/* Description Note */}
        <div>
          <label style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block', marginBottom: '4px', fontWeight: '600' }}>
            Keterangan / Catatan
          </label>
          <input
            type="text"
            placeholder="Contoh: Omset Dine in / Beli Gas Elpiji 3kg"
            value={description}
            onChange={e => setDescription(e.target.value)}
            className="form-input"
          />
        </div>

        {/* Staff Name */}
        <div>
          <label style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block', marginBottom: '4px', fontWeight: '600' }}>
            Nama Staf Pembuat
          </label>
          <input
            type="text"
            value={createdBy}
            onChange={e => setCreatedBy(e.target.value)}
            className="form-input"
          />
        </div>

        {/* Camera Upload Simulator */}
        <div style={{
          background: hasReceipt ? 'rgba(16, 185, 129, 0.1)' : '#0f172a',
          border: '1px dashed',
          borderColor: hasReceipt ? '#10b981' : '#334155',
          borderRadius: '10px',
          padding: '12px',
          textAlign: 'center',
          cursor: 'pointer'
        }} onClick={() => setHasReceipt(!hasReceipt)}>
          <Camera size={20} color={hasReceipt ? '#34d399' : '#94a3b8'} style={{ marginBottom: '4px' }} />
          <div style={{ fontSize: '0.75rem', color: hasReceipt ? '#34d399' : '#94a3b8', fontWeight: '600' }}>
            {hasReceipt ? '✓ Foto Nota Terlampir' : '+ Ambil Foto Nota / Struk Pembelian'}
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading}
          className={type === 'income' ? 'btn-emerald' : 'btn-primary'}
          style={{ width: '100%', justifyContent: 'center', padding: '12px', marginTop: '8px', fontSize: '0.9rem' }}
        >
          {loading ? 'Menyimpan...' : type === 'income' ? 'Simpan Pemasukan' : 'Simpan Pengeluaran'}
        </button>
      </form>
    </div>
  );
}
