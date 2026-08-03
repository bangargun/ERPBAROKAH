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

  if (ticketType === 'kitchen') {
    // ===== STRUK DAPUR =====
    lines.push('[C][B]' + outlet);
    lines.push('[C]STRUK DAPUR - KITCHEN TICKET');
    lines.push('[DIV]');
    lines.push(rowLine('No. Order:', tx.id || '-'));
    lines.push(rowLine('Meja:', tx.table_number || 'Meja 01'));
    lines.push(rowLine('Waktu:', (tx.date || '') + ' ' + (tx.time || '')));
    lines.push('[DIV]');
    lines.push('[B]QTY  NAMA PRODUK');
    lines.push('[DIV]');
    (tx.items || []).forEach(it => {
      lines.push(`[B]${it.qty}x  ${(it.name || '').toUpperCase()}`);
      if (it.notes) lines.push(`   * ${it.notes}`);
    });
    lines.push('[DIVD]');
    lines.push('[C]*** UNTUK KOKI / DAPUR ***');

  } else if (ticketType === 'bar') {
    // ===== STRUK BAR =====
    lines.push('[C][B]' + outlet);
    lines.push('[C]STRUK BAR - BAR TICKET');
    lines.push('[DIV]');
    lines.push(rowLine('No. Order:', tx.id || '-'));
    lines.push(rowLine('Meja:', tx.table_number || 'Meja 01'));
    lines.push(rowLine('Waktu:', (tx.date || '') + ' ' + (tx.time || '')));
    lines.push('[DIV]');
    lines.push('[B]QTY  NAMA MINUMAN');
    lines.push('[DIV]');
    (tx.items || []).forEach(it => {
      lines.push(`[B]${it.qty}x  ${(it.name || '').toUpperCase()}`);
      if (it.notes) lines.push(`   * ${it.notes}`);
    });
    lines.push('[DIVD]');
    lines.push('[C]*** UNTUK BARTENDER / BAR ***');

  } else if (ticketType === 'bill') {
    // ===== STRUK BILL SEMENTARA =====
    lines.push('[C][B]' + outlet);
    lines.push('[C]STRUK MEJA / BILL SEMENTARA');
    lines.push('[DIV]');
    lines.push(rowLine('No. Order:', tx.id || '-'));
    lines.push(rowLine('Meja:', tx.table_number || 'Meja 01'));
    lines.push(rowLine('Pelanggan:', tx.customer_name || 'Pelanggan Umum'));
    lines.push('[DIV]');
    lines.push(rowLine('ITEM', 'SUBTOTAL'));
    lines.push('[DIV]');
    (tx.items || []).forEach(it => {
      const sub = (it.price || it.price_unit || 0) * it.qty;
      lines.push(rowLine(`${it.qty}x ${(it.name || '').toUpperCase()}`, fmt(sub)));
      if (it.notes) lines.push(`   * ${it.notes}`);
    });
    lines.push('[DIVD]');
    lines.push('[B]' + rowLine('TOTAL BILL:', fmt(tx.amount || 0)));
    lines.push('[DIV]');
    lines.push('[C]Terima kasih atas kunjungan Anda');

  } else {
    // ===== STRUK NOTA PEMBAYARAN (DEFAULT RECEIPT) =====
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
    lines.push(rowLine('Tipe Order:', tx.order_type || 'Dine In'));
    lines.push(rowLine('Meja:', tx.table_number || '-'));
    lines.push(rowLine('Pelanggan:', tx.customer_name || 'Pelanggan Umum'));
    lines.push(rowLine('Kasir:', tx.cashier || '-'));
    lines.push('[DIV]');
    lines.push(rowLine('ITEM', 'SUBTOTAL'));
    lines.push('[DIV]');
    (tx.items || []).forEach(it => {
      const sub = (it.price || it.price_unit || 0) * (it.qty || 1);
      lines.push(rowLine(`${it.qty || 1}x ${(it.name || it.item_name || '').toUpperCase()}`, fmt(sub)));
      if (it.notes) lines.push(`   * ${it.notes}`);
    });
    lines.push('[DIVD]');
    const amountVal = Number(tx.amount || 0);
    const payVal = Number(tx.cash_paid || tx.amount || 0);
    const changeVal = Math.max(0, payVal - amountVal);
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

export default { scanPairedPrinters, printToBluetoothPrinter, buildReceiptText, testPrint };
