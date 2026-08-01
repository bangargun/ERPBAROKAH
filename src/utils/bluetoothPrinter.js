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
export const buildReceiptText = (tx, outletName, ticketType = 'receipt', paperWidth = '58', formatRupiah) => {
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
    lines.push('[C][B]' + outlet);
    lines.push('[C]POS KASIR BAROKAH');
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
    lines.push('[C]*** TERIMA KASIH ***');
    lines.push('[C]Atas kunjungan Anda');
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
export const printToBluetoothPrinter = async (mac, textContent, paperWidth = '58', onSuccess, onError) => {
  if (isCapacitor() && mac) {
    // Mode Capacitor (Android) — kirim ke native plugin
    try {
      const result = await BluetoothPrinter.printText({
        mac,
        text: textContent,
        paperWidth: String(paperWidth)
      });
      if (onSuccess) onSuccess(result);
      return result;
    } catch (err) {
      console.error('[BTPrinter] printText error:', err);
      if (onError) onError(err);
      throw err;
    }
  } else {
    // Mode Browser / no MAC — fallback ke iframe print dialog
    console.warn('[BTPrinter] Fallback ke browser print (bukan Capacitor atau MAC kosong).');
    _browserPrintFallback(textContent, paperWidth);
    if (onSuccess) onSuccess({ success: true, fallback: true });
  }
};

/**
 * Test print: kirim struk tes sederhana ke printer.
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
    '[C][2]TEST PRINT',
    '[C]' + (outletName || 'POS KASIR BAROKAH').toUpperCase(),
    '[C]POS KASIR BAROKAH',
    divider,
    `Tanggal : ${dateStr}`,
    `Waktu   : ${timeStr}`,
    `Printer : ${mac || '-'}`,
    `Kertas  : ${paperWidth}mm`,
    divider,
    '[C][B]*** PRINTER SIAP DIGUNAKAN ***',
    '[C]POS KASIR BAROKAH Ready',
    '',
    ''
  ].join('\n');

  return printToBluetoothPrinter(mac, text, paperWidth);
};

/**
 * Fallback: cetak via iframe + window.print() (browser / dev mode)
 */
const _browserPrintFallback = (textContent, paperWidth = '58') => {
  const w = paperWidth === '80' ? '76mm' : '54mm';
  const html = `<!DOCTYPE html><html><head>
    <style>
      @page { size: ${paperWidth}mm auto; margin: 0; }
      body { font-family: 'Courier New', monospace; width: ${w}; margin: 0 auto;
             padding: 4mm 2mm; color: #000; background: #fff; font-size: 11px; line-height: 1.4; }
      pre { white-space: pre-wrap; word-break: break-all; margin: 0; font-family: inherit; font-size: inherit; }
    </style></head><body><pre>${textContent.replace(/\[C\]|\[L\]|\[B\]|\[2\]|\[DIV\]|\[DIVD\]|\[CUT\]/g, '')}</pre></body></html>`;

  let iframe = document.getElementById('mris-silent-print-frame');
  if (iframe && iframe.parentNode) iframe.parentNode.removeChild(iframe);
  iframe = document.createElement('iframe');
  iframe.id = 'mris-silent-print-frame';
  Object.assign(iframe.style, { position: 'fixed', left: '-9999px', top: '-9999px', width: '1px', height: '1px', border: '0', opacity: '0' });
  document.body.appendChild(iframe);
  const doc = iframe.contentDocument || iframe.contentWindow.document;
  doc.open(); doc.write(html); doc.close();
  setTimeout(() => {
    iframe.contentWindow.focus();
    iframe.contentWindow.print();
    setTimeout(() => { if (iframe.parentNode) iframe.parentNode.removeChild(iframe); }, 3000);
  }, 150);
};

export default { scanPairedPrinters, printToBluetoothPrinter, buildReceiptText, testPrint };
