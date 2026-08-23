/**
 * MRIS Bluetooth Printer Utility
 * JavaScript bridge antara React POS dan Capacitor native BluetoothPrinterPlugin.
 *
 * Cara penggunaan:
 *   import { scanPairedPrinters, printReceipt, testPrint } from '../utils/bluetoothPrinter';
 *
 * Di Android (Capacitor): panggil native plugin langsung ke hardware printer.
 * Di browser (dev mode): fallback ke window.print() iframe.
 */

import { registerPlugin } from '@capacitor/core';

// Daftarkan plugin native BluetoothPrinter
// Ini otomatis terhubung ke BluetoothPrinterPlugin.java saat berjalan di Capacitor
const BluetoothPrinter = registerPlugin('BluetoothPrinter');

/**
 * Cek apakah app berjalan di dalam Capacitor (Android/iOS) atau browser biasa.
 */
const isCapacitor = () => {
  return typeof window !== 'undefined' && window.Capacitor && window.Capacitor.isNativePlatform();
};

/**
 * Scan daftar perangkat Bluetooth yang sudah dipair di pengaturan Android.
 * Tidak melakukan scanning aktif — hanya membaca bonded devices.
 *
 * @returns {Promise<Array<{name: string, address: string, type: string}>>}
 */
export const scanPairedPrinters = async () => {
  if (!isCapacitor()) {
    console.warn('[BTPrinter] Bukan Capacitor native — scan tidak tersedia di browser.');
    return [];
  }

  try {
    const result = await BluetoothPrinter.scanPairedDevices();
    return result.devices || [];
  } catch (err) {
    console.error('[BTPrinter] scanPairedDevices error:', err);
    throw err;
  }
};

/**
 * Periksa status respon saklar printer secara realtime via Connection Probe.
 * @param {string} mac - Alamat MAC printer
 * @returns {Promise<{isLive: boolean, reason: string}>}
 */
export const checkPrinterLiveStatus = async (mac) => {
  if (!isCapacitor() || !mac) {
    return { isLive: true, reason: 'System default' };
  }
  try {
    const result = await BluetoothPrinter.checkLiveStatus({ mac });
    return result;
  } catch (err) {
    return { isLive: false, reason: err.message || 'Error checking status' };
  }
};

/**
 * Dengarkan perubahan status terhubung/terputus printer secara realtime dari BroadcastReceiver Android.
 * @param {function} callback
 */
export const listenBluetoothStatusChange = (callback) => {
  if (!isCapacitor()) return { remove: () => {} };
  try {
    return BluetoothPrinter.addListener('bluetoothStatusChange', callback);
  } catch (err) {
    console.error('[BTPrinter] addListener error:', err);
    return { remove: () => {} };
  }
};

/**
 * Konversi data transaksi ke format teks ESC/POS yang bisa dicetak.
 * Tag per baris:
 *   [C] = center   [B] = bold   [2] = double size
 *   [DIV] = garis --- [DIVD] = garis === [CUT] = potong kertas
 *
 * @param {object} tx - Objek transaksi
 * @param {string} outletName - Nama outlet/restoran
 * @param {string} ticketType - 'receipt' | 'kitchen' | 'bar' | 'bill'
 * @param {string} paperWidth - '58' | '80'
 * @param {function} formatRupiah - Function formatter angka ke Rupiah
 * @returns {string} Teks terformat siap dikirim ke printer
 */
export const buildReceiptText = (tx, outletName, ticketType = 'receipt', paperWidth = '58', formatRupiah, headerFooter) => {
  const charsPerLine = paperWidth === '80' ? 48 : 32;
  const lines = [];
  const outlet = (outletName || 'POS KASIR BAROKAH').toUpperCase();

  const fmt = formatRupiah || ((n) => `Rp ${Number(n).toLocaleString('id-ID')}`);

  // Fungsi helper: baris kiri-kanan pada 1 baris
  const rowLine = (left, right, totalWidth = charsPerLine) => {
    const rightStr = String(right);
    const leftStr = String(left);
    const spaces = Math.max(1, totalWidth - leftStr.length - rightStr.length);
    return leftStr + ' '.repeat(spaces) + rightStr;
  };

  const isTakeAway = (tx.order_type && String(tx.order_type).toLowerCase().includes('take')) ||
                     (tx.order_type && String(tx.order_type).toLowerCase().includes('bungkus')) ||
                     tx.table_number === 'Take Away' ||
                     tx.table_number === 'Bungkus';

  const orderTypeLabel = isTakeAway ? 'TAKE AWAY / BUNGKUS' : 'DINE IN';
  const tableDisplay = isTakeAway ? 'TAKE AWAY' : (tx.table_number || 'Meja 01');
  const custName = (tx.customer_name || tx.customerName || tx.customer || tx.nama_pelanggan || tx.pelanggan || 'Pelanggan Umum');

  if (ticketType === 'kitchen') {
    // ===== STRUK DAPUR (KITCHEN TICKET - TANPA HARGA) =====
    lines.push('[C][B]' + outlet);
    lines.push('[C]STRUK DAPUR - KITCHEN TICKET');
    lines.push('[DIV]');
    lines.push(rowLine('No. Order:', tx.id || tx.receipt_no || '-'));
    lines.push(rowLine('Tipe Order:', orderTypeLabel));
    if (!isTakeAway) {
      lines.push(rowLine('Meja:', tableDisplay));
    }
    lines.push(rowLine('Pelanggan:', custName));
    lines.push(rowLine('Waktu:', (tx.date || '') + ' ' + (tx.time || '')));
    lines.push(rowLine('Kasir/Waiter:', tx.cashier || '-'));
    lines.push('[DIV]');
    lines.push('[B]QTY  NAMA PESANAN (DAPUR)');
    lines.push('[DIV]');
    (tx.items || []).forEach(it => {
      lines.push(`[B]${it.qty || 1}x  ${(it.name || it.item_name || '').toUpperCase()}`);
      if (it.notes) lines.push(`   * Catatan: ${it.notes}`);
    });
    lines.push('[DIVD]');
    lines.push('[C]*** UNTUK KOKI / DAPUR (TANPA HARGA) ***');
    lines.push('[DIV]');
    lines.push('[C][B]*** PERINGATAN KERAS ***');
    lines.push('[C][B]STRUK INI BUKAN STRUK PEMBAYARAN');
    lines.push('[C]JANGAN DIBAYAR SEBELUM DIBERI STRUK RESMI KASIR');
    lines.push('[C]Apabila kasir memberikan struk ini dan anda');
    lines.push('[C]melakukan pembayaran, maka anda berhak mendapatkan');
    lines.push('[C]1 JUTA RUPIAH LANGSUNG DARI KASIR');

  } else if (ticketType === 'bar') {
    // ===== STRUK BAR (BAR TICKET - TANPA HARGA) =====
    lines.push('[C][B]' + outlet);
    lines.push('[C]STRUK BAR - BAR TICKET');
    lines.push('[DIV]');
    lines.push(rowLine('No. Order:', tx.id || tx.receipt_no || '-'));
    lines.push(rowLine('Tipe Order:', orderTypeLabel));
    if (!isTakeAway) {
      lines.push(rowLine('Meja:', tableDisplay));
    }
    lines.push(rowLine('Pelanggan:', custName));
    lines.push(rowLine('Waktu:', (tx.date || '') + ' ' + (tx.time || '')));
    lines.push(rowLine('Kasir/Waiter:', tx.cashier || '-'));
    lines.push('[DIV]');
    lines.push('[B]QTY  NAMA MINUMAN (BAR)');
    lines.push('[DIV]');
    (tx.items || []).forEach(it => {
      lines.push(`[B]${it.qty || 1}x  ${(it.name || it.item_name || '').toUpperCase()}`);
      if (it.notes) lines.push(`   * Catatan: ${it.notes}`);
    });
    lines.push('[DIVD]');
    lines.push('[C]*** UNTUK BARTENDER / BAR (TANPA HARGA) ***');
    lines.push('[DIV]');
    lines.push('[C][B]*** PERINGATAN KERAS ***');
    lines.push('[C][B]STRUK INI BUKAN STRUK PEMBAYARAN');
    lines.push('[C]JANGAN DIBAYAR SEBELUM DIBERI STRUK RESMI KASIR');
    lines.push('[C]Apabila kasir memberikan struk ini dan anda');
    lines.push('[C]melakukan pembayaran, maka anda berhak mendapatkan');
    lines.push('[C]1 JUTA RUPIAH LANGSUNG DARI KASIR');

  } else if (ticketType === 'bill') {
    // ===== CONTOH TAGIHAN SEMENTARA / BILL MEJA (DENGAN RINCIAN HARGA) =====
    lines.push('[C][B]' + outlet);
    lines.push('[C]CONTOH TAGIHAN SEMENTARA');
    lines.push('[DIV]');
    lines.push(rowLine('No. Bill:', tx.id || tx.receipt_no || '-'));
    lines.push(rowLine('Tanggal:', tx.date || ''));
    lines.push(rowLine('Waktu:', tx.time || ''));
    lines.push(rowLine('Tipe Order:', orderTypeLabel));
    if (!isTakeAway) {
      lines.push(rowLine('Meja:', tableDisplay));
    }
    lines.push(rowLine('Pelanggan:', custName));
    lines.push(rowLine('Kasir/Waiter:', tx.cashier || '-'));
    lines.push('[DIV]');
    lines.push(rowLine('ITEM', 'SUBTOTAL'));
    lines.push('[DIV]');
    (tx.items || []).forEach(it => {
      const sub = (it.price || it.price_unit || 0) * (it.qty || 1);
      lines.push(rowLine(`${it.qty || 1}x ${(it.name || it.item_name || '').toUpperCase()}`, fmt(sub)));
      if (it.notes) lines.push(`   * Catatan: ${it.notes}`);
    });
    lines.push('[DIVD]');
    const amountVal = Number(tx.amount || tx.grandTotal || tx.total || 0);
    lines.push('[B]' + rowLine('TOTAL TAGIHAN:', fmt(amountVal)));
    lines.push('[DIV]');
    lines.push('[C][B]*** PERINGATAN KERAS ***');
    lines.push('[C][B]STRUK INI BUKAN STRUK PEMBAYARAN');
    lines.push('[C]JANGAN DIBAYAR SEBELUM DIBERI STRUK RESMI KASIR');
    lines.push('[C]Apabila kasir memberikan struk ini dan anda');
    lines.push('[C]melakukan pembayaran, maka anda berhak mendapatkan');
    lines.push('[C]1 JUTA RUPIAH LANGSUNG DARI KASIR');

  } else if (ticketType === 'table' || ticketType === 'checker') {
    // ===== STRUK MEJA / ORDER CHECKER (TANPA HARGA) =====
    lines.push('[C][B]' + outlet);
    lines.push('[C]STRUK MEJA / ORDER CHECKER');
    lines.push('[DIV]');
    lines.push(rowLine('No. Order:', tx.id || tx.receipt_no || '-'));
    lines.push(rowLine('Tipe Order:', orderTypeLabel));
    if (!isTakeAway) {
      lines.push(rowLine('Meja:', tableDisplay));
    }
    lines.push(rowLine('Pelanggan:', custName));
    lines.push(rowLine('Waktu:', (tx.date || '') + ' ' + (tx.time || '')));
    lines.push(rowLine('Kasir/Waiter:', tx.cashier || '-'));
    lines.push('[DIV]');
    lines.push('[B]QTY  NAMA PESANAN');
    lines.push('[DIV]');
    (tx.items || []).forEach(it => {
      lines.push(`[B]${it.qty || 1}x  ${(it.name || it.item_name || '').toUpperCase()}`);
      if (it.notes) lines.push(`   * Catatan: ${it.notes}`);
    });
    lines.push('[DIVD]');
    lines.push('[C]*** PESANAN TANPA HARGA (CHECKER MEJA) ***');
    lines.push('[DIV]');
    lines.push('[C][B]*** PERINGATAN KERAS ***');
    lines.push('[C][B]STRUK INI BUKAN STRUK PEMBAYARAN');
    lines.push('[C]JANGAN DIBAYAR SEBELUM DIBERI STRUK RESMI KASIR');
    lines.push('[C]Apabila kasir memberikan struk ini dan anda');
    lines.push('[C]melakukan pembayaran, maka anda berhak mendapatkan');
    lines.push('[C]1 JUTA RUPIAH LANGSUNG DARI KASIR');

  } else {
    // ===== STRUK NOTA PEMBAYARAN (DEFAULT RECEIPT - DENGAN HARGA) =====
    const restoName = (headerFooter?.restaurantName || outletName || 'MRIS RESTORAN').toUpperCase();
    const groupName = headerFooter?.groupName;
    const address = headerFooter?.address;
    const phone = headerFooter?.phone;

    lines.push('[C][B]' + restoName);
    if (groupName) lines.push('[C]' + groupName);
    if (address) lines.push('[C]' + address);
    if (phone) lines.push('[C]Telp: ' + phone);
    lines.push('[C]NOTA PEMBAYARAN');
    lines.push('[DIV]');
    lines.push(rowLine('No. Struk:', tx.id || tx.receipt_no || '-'));
    lines.push(rowLine('Tanggal:', tx.date || ''));
    lines.push(rowLine('Waktu:', tx.time || ''));
    lines.push(rowLine('Tipe Order:', orderTypeLabel));
    if (!isTakeAway) {
      lines.push(rowLine('Meja:', tableDisplay));
    }
    lines.push(rowLine('Pelanggan:', custName));
    lines.push(rowLine('Kasir:', tx.cashier || '-'));
    lines.push('[DIV]');
    lines.push(rowLine('ITEM', 'SUBTOTAL'));
    lines.push('[DIV]');
    (tx.items || []).forEach(it => {
      const sub = (it.price || it.price_unit || 0) * (it.qty || 1);
      lines.push(rowLine(`${it.qty || 1}x ${(it.name || it.item_name || '').toUpperCase()}`, fmt(sub)));
      if (it.notes) lines.push(`   * Catatan: ${it.notes}`);
    });
    lines.push('[DIVD]');
    const amountVal = Number(tx.amount || tx.grandTotal || tx.total || 0);
    const payVal = Number(
      tx.paid_amount !== undefined && tx.paid_amount !== null ? tx.paid_amount :
      tx.cash_paid !== undefined && tx.cash_paid !== null ? tx.cash_paid :
      tx.tendered !== undefined && tx.tendered !== null ? tx.tendered :
      tx.bayar !== undefined && tx.bayar !== null ? tx.bayar :
      amountVal
    );
    const changeVal = Number(
      tx.change_amount !== undefined && tx.change_amount !== null ? tx.change_amount :
      tx.change !== undefined && tx.change !== null ? tx.change :
      tx.kembalian !== undefined && tx.kembalian !== null ? tx.kembalian :
      Math.max(0, payVal - amountVal)
    );
    lines.push('[B]' + rowLine('TOTAL:', fmt(amountVal)));
    lines.push(rowLine('Metode Bayar:', tx.payment_method || 'Cash'));
    lines.push(rowLine('Bayar:', fmt(payVal)));
    lines.push('[B]' + rowLine('Kembalian:', fmt(changeVal)));
    lines.push('[DIV]');

    const line1 = headerFooter?.footerLine1 || 'TERIMA KASIH ATAS KUNJUNGAN ANDA';
    const line2 = headerFooter?.footerLine2 || 'SUDAH TERMASUK PB1 PAJAK RESTORAN';
    const ssid = headerFooter?.wifiSsid;
    const pass = headerFooter?.wifiPassword;

    lines.push('[C][B]' + line1);
    if (line2) lines.push('[C]' + line2);
    if (ssid) lines.push('[C]WIFI: ' + ssid);
    if (pass) lines.push('[C]PASS: ' + pass);
  }

  lines.push('');
  lines.push('');

  return lines.join('\n');
};

/**
 * Cetak struk ke printer Bluetooth (native) atau fallback ke browser print.
 *
 * @param {string} mac - MAC address printer
 * @param {string} textContent - Teks terformat (output buildReceiptText)
 * @param {string} paperWidth - '58' | '80'
 * @param {Function} onSuccess - Callback sukses
 * @param {Function} onError - Callback error
 */
/**
 * Cetak struk ke printer Bluetooth (native) atau fallback otomatis ke PDF Print (system print).
 *
 * @param {string} mac - MAC address printer
 * @param {string} textContent - Teks terformat (output buildReceiptText)
 * @param {string} paperWidth - '58' | '80'
 * @param {Function} onSuccess - Callback sukses
 * @param {Function} onError - Callback error
 */
export const printToBluetoothPrinter = async (mac, textContent, paperWidth = '58', onSuccess, onError) => {
  if (isCapacitor() && mac) {
    // Mode Capacitor (Android) — kirim ke native plugin Bluetooth
    try {
      const result = await BluetoothPrinter.printText({
        mac,
        text: textContent,
        paperWidth: String(paperWidth)
      });
      if (onSuccess) onSuccess(result);
      return result;
    } catch (err) {
      console.error('[BTPrinter] Native printText error:', err);
      console.warn('[BTPrinter] Bluetooth printer error / tidak merespon, otomatis mengalihkan ke Cetak PDF...');
      _browserPrintFallback(textContent, paperWidth);
      if (onSuccess) onSuccess({ success: true, fallbackPdf: true, errorMsg: err?.message });
      return { success: true, fallbackPdf: true, errorMsg: err?.message };
    }
  } else {
    // Mode Browser / Printer Tidak Ada (MAC Kosong) — langsung alihkan ke PDF Print!
    console.warn('[BTPrinter] Printer Bluetooth tidak ditemukan / MAC belum dipilih. Otomatis mencetak dalam format PDF.');
    _browserPrintFallback(textContent, paperWidth);
    if (onSuccess) onSuccess({ success: true, fallbackPdf: true });
    return { success: true, fallbackPdf: true };
  }
};

/**
 * Test print: kirim struk tes sederhana ke printer atau PDF print.
 *
 * @param {string} mac - MAC address printer
 * @param {string} outletName - Nama outlet
 * @param {string} paperWidth - '58' | '80'
 */
export const testPrint = async (mac, outletName = 'POS KASIR BAROKAH', paperWidth = '58') => {
  const charsPerLine = paperWidth === '80' ? 48 : 32;
  const divider = '-'.repeat(charsPerLine);
  const now = new Date();
  const dateStr = now.toLocaleDateString('id-ID');
  const timeStr = now.toLocaleTimeString('id-ID');

  const text = [
    '[C][2]TEST PRINT STRUK / PDF',
    '[C]' + (outletName || 'POS KASIR BAROKAH').toUpperCase(),
    '[C]POS KASIR BAROKAH',
    divider,
    `Tanggal : ${dateStr}`,
    `Waktu   : ${timeStr}`,
    `Printer : ${mac || 'Mode PDF (Printer Tidak Ada)'}`,
    `Kertas  : ${paperWidth}mm`,
    divider,
    '[C][B]*** STRUK SIAP DICETAK / DISIMPAN PDF ***',
    '[C]POS KASIR BAROKAH Ready',
    '',
    ''
  ].join('\n');

  return printToBluetoothPrinter(mac, text, paperWidth);
};

/**
 * Fallback: cetak via iframe / window.print() ke PDF System Print
 */
export const _browserPrintFallback = (textContent, paperWidth = '58') => {
  const w = paperWidth === '80' ? '76mm' : '54mm';
  
  // Clean ESC/POS tags for clean PDF layout
  const cleanText = (textContent || '')
    .replace(/\[C\]|\[L\]|\[R\]|\[B\]|\[2\]|\[DIV\]|\[DIVD\]|\[CUT\]/g, '')
    .replace(/undefined/g, '');

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Cetak Struk POS - PDF</title>
  <style>
    @page {
      size: ${paperWidth === '80' ? '80mm' : '58mm'} auto;
      margin: 0;
    }
    @media print {
      body {
        width: 100%;
        margin: 0;
        padding: 4mm 2mm;
      }
      .no-print {
        display: none !important;
      }
    }
    body {
      font-family: 'Courier New', Courier, monospace;
      width: ${w};
      margin: 0 auto;
      padding: 6mm 4mm;
      color: #000000;
      background: #ffffff;
      font-size: 12px;
      line-height: 1.45;
      font-weight: 700;
    }
    pre {
      white-space: pre-wrap;
      word-break: break-all;
      margin: 0;
      font-family: inherit;
      font-size: inherit;
      font-weight: inherit;
    }
  </style>
</head>
<body>
  <pre>${cleanText}</pre>
</body>
</html>`;

  try {
    let iframe = document.getElementById('mris-silent-print-frame');
    if (iframe && iframe.parentNode) iframe.parentNode.removeChild(iframe);

    iframe = document.createElement('iframe');
    iframe.id = 'mris-silent-print-frame';
    Object.assign(iframe.style, {
      position: 'fixed',
      left: '-9999px',
      top: '-9999px',
      width: '1px',
      height: '1px',
      border: '0',
      opacity: '0',
      pointerEvents: 'none'
    });
    document.body.appendChild(iframe);

    const doc = iframe.contentDocument || iframe.contentWindow.document;
    doc.open();
    doc.write(html);
    doc.close();

    setTimeout(() => {
      try {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
      } catch (e) {
        console.warn('[BTPrinter] iframe print exception, using window.open fallback:', e);
        try {
          const printWin = window.open('', '_blank');
          if (printWin) {
            printWin.document.write(html);
            printWin.document.close();
            printWin.focus();
            printWin.print();
            setTimeout(() => { try { printWin.close(); } catch(errClose){} }, 1000);
          }
        } catch (errWin) {
          console.error('[BTPrinter] PDF Print popup blocked / failed:', errWin);
        }
      }
      setTimeout(() => {
        if (iframe && iframe.parentNode) iframe.parentNode.removeChild(iframe);
      }, 4000);
    }, 200);
  } catch (errGlobal) {
    console.error('[BTPrinter] _browserPrintFallback global exception:', errGlobal);
  }
};

/**
 * Konversi data rekonsiliasi tutup shift kasir ke format teks ESC/POS untuk thermal printer.
 */
export const buildShiftClosingReceiptText = (shiftData, outletName, paperWidth = '58', formatRupiah) => {
  const charsPerLine = paperWidth === '80' ? 48 : 32;
  const lines = [];
  const fmt = formatRupiah || ((n) => `Rp ${Number(n || 0).toLocaleString('id-ID')}`);
  const rowLine = (left, right, totalWidth = charsPerLine) => {
    const r = String(right);
    const l = String(left);
    const space = Math.max(1, totalWidth - l.length - r.length);
    return l + ' '.repeat(space) + r;
  };

  lines.push('[C][B]' + (outletName || 'POS BAROKAH').toUpperCase() + '[/B][/C]');
  lines.push('[C][B]REKAPITULASI TUTUP SHIFT[/B][/C]');
  lines.push('[C]' + (shiftData.date || new Date().toISOString().split('T')[0]) + ' ' + (shiftData.time || '') + '[/C]');
  lines.push('[DIV]');
  lines.push(rowLine('Kasir/Petugas', shiftData.cashier_name || 'Kasir'));
  lines.push(rowLine('Status Shift', 'SELESAI DITUTUP'));
  lines.push('[DIV]');
  lines.push(rowLine('Total Transaksi', `${shiftData.total_receipts || 0} Struk`));
  lines.push(rowLine('Total Penjualan', fmt(shiftData.gross_sales || 0)));
  lines.push(rowLine('Penjualan Tunai', fmt(shiftData.cash_sales || 0)));
  lines.push(rowLine('Non-Tunai (QRIS/EDC)', fmt(shiftData.non_cash_sales || 0)));
  lines.push(rowLine('Kas Kecil (Expense)', '-' + fmt(shiftData.petty_expense || 0)));
  lines.push(rowLine('Modal Awal (Float)', fmt(shiftData.initial_cash || 0)));
  lines.push('[DIVD]');
  lines.push('[B]' + rowLine('Target Kas Laci', fmt(shiftData.expected_cash || 0)) + '[/B]');
  lines.push('[B]' + rowLine('Fisik Dihitung', fmt(shiftData.physical_cash || 0)) + '[/B]');
  const v = Number(shiftData.variance || 0);
  const vLabel = v === 0 ? 'PAS (Rp 0)' : (v < 0 ? `MINUS ${fmt(Math.abs(v))}` : `LEBIH ${fmt(v)}`);
  lines.push('[B]' + rowLine('Selisih Kas', vLabel) + '[/B]');
  lines.push('[DIV]');
  if (shiftData.notes) {
    lines.push('Catatan: ' + shiftData.notes);
    lines.push('[DIV]');
  }
  lines.push('[C]Tanda Tangan Kasir,[/C]');
  lines.push('\n\n');
  lines.push('[C]( ' + (shiftData.cashier_name || 'Kasir') + ' )[/C]');
  lines.push('[DIV]');
  lines.push('[C]Laporan tersimpan otomatis[/C]');
  lines.push('[CUT]');
  return lines.join('\n');
};

export default { scanPairedPrinters, printToBluetoothPrinter, buildReceiptText, buildShiftClosingReceiptText, testPrint };
