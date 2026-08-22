/**
 * Standarisasi Generator Nomor Dokumen & Transaksi MRIS Barokah Group
 * Format: [PREFIX]-[KODE_OUTLET]-[YYYYMMDD]-[URUTAN]
 *
 * Contoh:
 * - TRX-SBY-TT-20260822-00001 (Transaksi POS Kasir)
 * - SFT-SBY-TT-20260822-01    (Tutup Shift Kasir)
 * - REP-SBY-TT-20260822-00001 (Update Laporan Harian)
 * - EXP-SBY-TT-20260822-00001 (Pengeluaran Operasional / Kas Keluar)
 * - PO-SBY-TT-20260822-00001  (Purchase Order Pembelian)
 * - RCV-SBY-TT-20260822-00001 (Penerimaan Logistik Masuk)
 * - ADJ-SBY-TT-20260822-00001 (Penyesuaian Stok / Opname)
 * - AST-SBY-TT-20260822-00001 (Aset Restoran)
 * - TAX-SBY-TT-202608-01      (Laporan Pajak Daerah SPTPD)
 */

export const getOutletCode = (outlet, outlets = []) => {
  if (!outlet) return 'CABANG';
  
  if (typeof outlet === 'object' && outlet !== null) {
    if (outlet.code) return String(outlet.code).toUpperCase().trim();
    if (outlet.id && outlets && outlets.length > 0) {
      const found = outlets.find(o => String(o.id) === String(outlet.id));
      if (found && found.code) return String(found.code).toUpperCase().trim();
    }
    outlet = outlet.name || outlet.branch_name || String(outlet.id || '');
  }

  const str = String(outlet).trim();
  if (outlets && outlets.length > 0) {
    const found = outlets.find(o => 
      String(o.id) === str || 
      (o.name && o.name.toLowerCase() === str.toLowerCase()) || 
      (o.code && o.code.toLowerCase() === str.toLowerCase())
    );
    if (found && found.code) return String(found.code).toUpperCase().trim();
  }

  // Fallback berdasarkan kata kunci nama cabang
  const upper = str.toUpperCase();
  if (upper.includes('SURABAYA') || upper.includes('SBY')) return 'SBY-TT';
  if (upper.includes('PECAK') && upper.includes('KISARAN')) return 'PCK-KIS';
  if (upper.includes('PECAK') && (upper.includes('RANTAU') || upper.includes('RP'))) return 'PCK-RP';
  if (upper.includes('PECAK') || upper.includes('2001') || upper.includes('PCK')) return 'PCK-TT';
  if (upper.includes('PAK HAJI') || upper.includes('PLP') || upper.includes('LELE')) return 'PLP-KIS';

  return upper.replace(/[^A-Z0-9-]/g, '').substring(0, 8) || 'CABANG';
};

/**
 * Menghitung nomor urut harian tertinggi (Next Sequence) berdasarkan data transaksi/laporan yang ada
 */
export const getNextDailySequence = ({
  prefix = 'TRX',
  outletCode = 'SBY-TT',
  date = new Date(),
  existingRecords = []
}) => {
  const d = date instanceof Date ? date : new Date(date);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const dateKey = `${yyyy}${mm}${dd}`;

  const matchPrefix = `${prefix}-${outletCode}-${dateKey}-`.toUpperCase();

  let maxSeq = 0;
  if (Array.isArray(existingRecords)) {
    existingRecords.forEach(rec => {
      const code = String(rec.id || rec.receipt_no || rec.receiptNo || rec.report_no || rec.code || '').toUpperCase();
      if (code.startsWith(matchPrefix)) {
        const parts = code.split('-');
        const lastPart = parts[parts.length - 1];
        const num = parseInt(lastPart, 10);
        if (!isNaN(num) && num > maxSeq) {
          maxSeq = num;
        }
      }
    });
  }

  return maxSeq + 1;
};

/**
 * Membuat format nomor dokumen lengkap
 */
export const formatDocNumber = ({
  prefix = 'TRX',
  outletCode = 'SBY-TT',
  date = new Date(),
  seq = 1,
  digits = 5
}) => {
  const d = date instanceof Date ? date : new Date(date);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');

  if (prefix === 'TAX') {
    const seqStr = String(seq).padStart(2, '0');
    return `TAX-${outletCode}-${yyyy}${mm}-${seqStr}`;
  }

  if (prefix === 'SFT') {
    const seqStr = String(seq).padStart(2, '0');
    return `SFT-${outletCode}-${yyyy}${mm}${dd}-${seqStr}`;
  }

  const seqStr = String(seq).padStart(digits, '0');
  return `${prefix}-${outletCode}-${yyyy}${mm}${dd}-${seqStr}`;
};

/**
 * Helper langsung untuk generate nomor dokumen baru
 */
export const generateDocNumber = ({
  prefix = 'TRX',
  outlet = null,
  outlets = [],
  date = new Date(),
  existingRecords = [],
  customSeq = null,
  digits = 5
}) => {
  const outletCode = getOutletCode(outlet, outlets);
  const seq = customSeq !== null && customSeq !== undefined
    ? customSeq
    : getNextDailySequence({ prefix, outletCode, date, existingRecords });

  return formatDocNumber({ prefix, outletCode, date, seq, digits });
};
