import React, { useState } from 'react';
import { User, Phone, Mail, MapPin, CheckCircle2, QrCode, ArrowLeft, Sparkles, Store } from 'lucide-react';

export default function CustomerSelfRegistrationPage({ masterData, setMasterData, onBackToPos }) {
  const outlets = masterData?.outlets || [];

  // Extract query params if any (e.g. ?outlet=1)
  const queryParams = new URLSearchParams(window.location.search);
  const defaultOutletId = queryParams.get('outlet') ? Number(queryParams.get('outlet')) : (outlets[0]?.id || 0);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [gender, setGender] = useState('Wanita');
  const [birthdate, setBirthdate] = useState('');
  const [address, setAddress] = useState('');
  const [outletId, setOutletId] = useState(defaultOutletId);

  const [registeredSuccessData, setRegisteredSuccessData] = useState(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) {
      alert('Nama dan Nomor HP / WA wajib diisi!');
      return;
    }

    const selectedOutlet = outlets.find(o => o.id === Number(outletId)) || outlets[0];
    const newCustId = Date.now();
    const existingCount = (masterData?.customers || []).length;
    const newCode = `000${existingCount + 37} - BMJ`;

    const newCustomerObj = {
      id: newCustId,
      code: newCode,
      name: name.trim(),
      phone: phone.trim(),
      email: email.trim(),
      gender: gender,
      birthdate: birthdate,
      address: address.trim(),
      outlet_id: Number(outletId),
      outlet_name: selectedOutlet.name,
      customer_type: 'Self-Reg Member',
      points: 10, // Welcome Bonus Points
      created_at: new Date().toISOString()
    };

    if (setMasterData) {
      setMasterData(prev => ({
        ...prev,
        customers: [...(prev.customers || []), newCustomerObj]
      }));
    }

    setRegisteredSuccessData(newCustomerObj);
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)',
      color: '#f8fafc',
      fontFamily: 'Inter, system-ui, sans-serif',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      {/* Container Box */}
      <div style={{
        width: '100%',
        maxWidth: '480px',
        background: '#1e293b',
        border: '1px solid rgba(255,255,255,0.12)',
        borderRadius: '24px',
        padding: '28px',
        boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
        backdropFilter: 'blur(10px)'
      }}>

        {/* Top Header */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          {onBackToPos && (
            <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: '12px' }}>
              <button
                type="button"
                onClick={onBackToPos}
                style={{ background: 'none', border: 'none', color: '#38bdf8', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', fontWeight: '800' }}
              >
                <ArrowLeft size={16} />
                <span>Kembali ke POS</span>
              </button>
            </div>
          )}

          <div style={{ width: '60px', height: '60px', borderRadius: '20px', background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px', boxShadow: '0 8px 20px rgba(99,102,241,0.4)' }}>
            <Sparkles size={30} color="#ffffff" />
          </div>

          <h2 style={{ fontSize: '1.4rem', fontWeight: '900', color: '#ffffff', margin: '0 0 6px 0', letterSpacing: '0.3px' }}>
            Registrasi Mandiri Pelanggan
          </h2>
          <p style={{ fontSize: '0.82rem', color: '#94a3b8', margin: 0, lineHeight: 1.4 }}>
            Dapatkan diskon member & 10 Poin Welcome Bonus otomatis setelah mengisi formulir di bawah ini!
          </p>
        </div>

        {/* CONDITION 1: SUCCESS CONFIRMATION DISPLAY */}
        {registeredSuccessData ? (
          <div style={{ textAlign: 'center', padding: '10px 0' }}>
            <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(52,211,153,0.15)', border: '2px solid #34d399', color: '#34d399', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
              <CheckCircle2 size={36} />
            </div>

            <h3 style={{ fontSize: '1.2rem', fontWeight: '900', color: '#ffffff', marginBottom: '6px' }}>
              Pendaftaran Member Berhasil!
            </h3>
            <p style={{ fontSize: '0.82rem', color: '#cbd5e1', marginBottom: '20px' }}>
              Selamat <strong>{registeredSuccessData.name}</strong>, profil Anda telah aktif di restoran kami.
            </p>

            {/* Member Card Component */}
            <div style={{ background: 'linear-gradient(135deg, #312e81 0%, #1e1b4b 100%)', borderRadius: '16px', border: '1px solid #6366f1', padding: '20px', textAlign: 'left', marginBottom: '20px', boxShadow: '0 10px 25px rgba(0,0,0,0.3)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <span style={{ fontSize: '0.75rem', color: '#a78bfa', fontWeight: '900', letterSpacing: '1px' }}>KARTU MEMBER DIGITAL</span>
                <span style={{ fontSize: '0.70rem', background: '#34d399', color: '#0f172a', padding: '2px 8px', borderRadius: '12px', fontWeight: '900' }}>AKTIF</span>
              </div>

              <div style={{ fontSize: '1.15rem', fontWeight: '900', color: '#ffffff' }}>
                {registeredSuccessData.name}
              </div>
              <div style={{ fontSize: '0.82rem', color: '#93c5fd', marginTop: '2px' }}>
                📱 {registeredSuccessData.phone}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '20px', borderTop: '1px dashed rgba(255,255,255,0.2)', paddingTop: '12px' }}>
                <div>
                  <div style={{ fontSize: '0.68rem', color: '#cbd5e1' }}>Kode Member:</div>
                  <div style={{ fontSize: '0.85rem', fontWeight: '900', color: '#fbbf24', fontFamily: 'monospace' }}>{registeredSuccessData.code}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.68rem', color: '#cbd5e1' }}>Poin Bonus:</div>
                  <div style={{ fontSize: '1rem', fontWeight: '900', color: '#38bdf8' }}>⭐ {registeredSuccessData.points} Poin</div>
                </div>
              </div>
            </div>

            <div style={{ background: '#0f172a', borderRadius: '12px', padding: '14px', border: '1px solid #334155', fontSize: '0.78rem', color: '#94a3b8', lineHeight: 1.4, marginBottom: '20px' }}>
              💡 Tunjukkan nomor HP <strong>{registeredSuccessData.phone}</strong> atau Kode <strong>{registeredSuccessData.code}</strong> kepada Kasir saat memesan untuk klaim poin & promo!
            </div>

            <button
              onClick={() => {
                setRegisteredSuccessData(null);
                setName('');
                setPhone('');
                setEmail('');
                setAddress('');
              }}
              style={{ width: '100%', padding: '12px', background: '#334155', color: '#ffffff', border: 'none', borderRadius: '12px', fontWeight: '800', fontSize: '0.85rem', cursor: 'pointer' }}
            >
              Daftarkan Pelanggan Lain
            </button>
          </div>
        ) : (
          /* CONDITION 2: REGISTRATION FORM */
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={{ fontSize: '0.78rem', color: '#cbd5e1', fontWeight: '800', display: 'block', marginBottom: '6px' }}>
                Nama Lengkap Pelanggan *
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Contoh: Nurnita Wijaya"
                  style={{ width: '100%', padding: '11px 12px 11px 38px', borderRadius: '10px', border: '1px solid #334155', background: '#0f172a', color: '#ffffff', fontSize: '0.88rem', outline: 'none' }}
                />
                <User size={17} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '12px' }} />
              </div>
            </div>

            <div>
              <label style={{ fontSize: '0.78rem', color: '#cbd5e1', fontWeight: '800', display: 'block', marginBottom: '6px' }}>
                Nomor HP / WhatsApp *
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="Contoh: 085277538483"
                  style={{ width: '100%', padding: '11px 12px 11px 38px', borderRadius: '10px', border: '1px solid #334155', background: '#0f172a', color: '#ffffff', fontSize: '0.88rem', outline: 'none' }}
                />
                <Phone size={17} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '12px' }} />
              </div>
            </div>

            <div>
              <label style={{ fontSize: '0.78rem', color: '#cbd5e1', fontWeight: '800', display: 'block', marginBottom: '6px' }}>
                Cabang / Outlet Terdekat *
              </label>
              <div style={{ position: 'relative' }}>
                <select
                  value={outletId}
                  onChange={e => setOutletId(e.target.value)}
                  style={{ width: '100%', padding: '11px 12px 11px 38px', borderRadius: '10px', border: '1px solid #334155', background: '#0f172a', color: '#ffffff', fontSize: '0.88rem', outline: 'none' }}
                >
                  {outlets.map(o => (
                    <option key={o.id} value={o.id}>{o.name}</option>
                  ))}
                </select>
                <Store size={17} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '12px' }} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label style={{ fontSize: '0.78rem', color: '#cbd5e1', fontWeight: '800', display: 'block', marginBottom: '6px' }}>Email</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="nama@gmail.com"
                    style={{ width: '100%', padding: '11px 12px 11px 34px', borderRadius: '10px', border: '1px solid #334155', background: '#0f172a', color: '#ffffff', fontSize: '0.82rem', outline: 'none' }}
                  />
                  <Mail size={15} color="#94a3b8" style={{ position: 'absolute', left: '10px', top: '13px' }} />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.78rem', color: '#cbd5e1', fontWeight: '800', display: 'block', marginBottom: '6px' }}>Jenis Kelamin</label>
                <select
                  value={gender}
                  onChange={e => setGender(e.target.value)}
                  style={{ width: '100%', padding: '11px 10px', borderRadius: '10px', border: '1px solid #334155', background: '#0f172a', color: '#ffffff', fontSize: '0.82rem', outline: 'none' }}
                >
                  <option value="Wanita">Wanita</option>
                  <option value="Laki-laki">Laki-laki</option>
                </select>
              </div>
            </div>

            <div>
              <label style={{ fontSize: '0.78rem', color: '#cbd5e1', fontWeight: '800', display: 'block', marginBottom: '6px' }}>
                Tanggal Lahir (Opsional - Promo Ultah)
              </label>
              <input
                type="date"
                value={birthdate}
                onChange={e => setBirthdate(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid #334155', background: '#0f172a', color: '#ffffff', fontSize: '0.82rem', outline: 'none' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.78rem', color: '#cbd5e1', fontWeight: '800', display: 'block', marginBottom: '6px' }}>Alamat Domisili</label>
              <div style={{ position: 'relative' }}>
                <textarea
                  rows={2}
                  value={address}
                  onChange={e => setAddress(e.target.value)}
                  placeholder="Masukkan jalan / kota..."
                  style={{ width: '100%', padding: '10px 12px 10px 34px', borderRadius: '10px', border: '1px solid #334155', background: '#0f172a', color: '#ffffff', fontSize: '0.82rem', outline: 'none', resize: 'vertical' }}
                />
                <MapPin size={15} color="#94a3b8" style={{ position: 'absolute', left: '10px', top: '12px' }} />
              </div>
            </div>

            <button
              type="submit"
              style={{
                width: '100%',
                padding: '14px',
                marginTop: '10px',
                borderRadius: '12px',
                border: 'none',
                background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                color: '#ffffff',
                fontSize: '0.95rem',
                fontWeight: '900',
                cursor: 'pointer',
                boxShadow: '0 6px 20px rgba(99,102,241,0.4)',
                letterSpacing: '0.3px'
              }}
            >
              ✨ DAFTAR MEMBER SEKARANG
            </button>
          </form>
        )}

      </div>
    </div>
  );
}
