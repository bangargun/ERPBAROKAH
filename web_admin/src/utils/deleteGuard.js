/**
 * deleteGuard.js
 * Utilitas perlindungan penghapusan data yang memiliki transaksi.
 * 
 * Aturan:
 * - Jika item memiliki transaksi terkait → wajib masukkan password "Bismillah"
 * - Jika tidak ada transaksi → konfirmasi biasa
 * - Jika password salah → hapus dibatalkan
 */

const DELETE_PASSWORD = 'Bismillah';

/**
 * Hitung jumlah transaksi yang mereferensikan item tertentu.
 * @param {object} masterData - Data master lengkap
 * @param {string} type - 'product' | 'ingredient' | 'expense'
 * @param {string|number} id - ID item
 * @param {string} name - Nama item (untuk fallback pencarian berdasarkan nama)
 * @returns {number} Jumlah transaksi terkait
 */
export function countRelatedTransactions(masterData, type, id, name = '') {
  if (!masterData) return 0;
  const allTx = [
    ...(masterData.salesTransactions || []),
    ...(masterData.transactions || []),
    ...(masterData.closedShifts || []),
    ...(masterData.shift_closings || []),
  ];
  const idStr = String(id);
  const nameLower = (name || '').toLowerCase().trim();

  if (type === 'product') {
    return allTx.filter(tx => {
      const items = tx.items || tx.orderItems || tx.cart || [];
      return items.some(it =>
        String(it.id) === idStr ||
        String(it.product_id) === idStr ||
        (nameLower && (it.name || it.item_name || '').toLowerCase().trim() === nameLower)
      );
    }).length;
  }

  if (type === 'ingredient') {
    // Check in stock movements, stock-in, logistics
    const stockTx = [
      ...(masterData.stockMovement || []),
      ...(masterData.stockIn || []),
      ...(masterData.purchases || []),
      ...(masterData.approvedLogistics || []),
    ];
    return stockTx.filter(tx => {
      const iStr = String(tx.ingredient_id || tx.item_id || tx.id || '');
      const iName = (tx.ingredient_name || tx.item_name || tx.name || '').toLowerCase().trim();
      return iStr === idStr || (nameLower && iName === nameLower);
    }).length;
  }

  if (type === 'expense') {
    const expenseTx = [
      ...(masterData.approvedFinanceDaily || []),
      ...(masterData.manualEntryRecords || []),
      ...(masterData.closedShifts || []),
      ...(masterData.shift_closings || []),
    ];
    return expenseTx.filter(tx => {
      // Check expense_rows inside shift closings
      const rows = tx.expense_rows || tx.expenses_breakdown || tx.expense_items || [];
      return rows.some(r =>
        String(r.id) === idStr ||
        String(r.account_id) === idStr ||
        (nameLower && (r.name || r.account_name || r.label || '').toLowerCase().trim() === nameLower)
      );
    }).length;
  }

  return 0;
}

/**
 * Tampilkan konfirmasi hapus dengan perlindungan password jika ada transaksi.
 * 
 * @param {object} options
 * @param {object} options.masterData - Data master
 * @param {string} options.type - 'product' | 'ingredient' | 'expense'
 * @param {string|number} options.id - ID item
 * @param {string} options.name - Nama item
 * @param {function} options.onConfirmed - Callback jika hapus dikonfirmasi
 * @param {function} [options.setDeleteGuardState] - Setter state untuk modal (jika pakai modal UI)
 */
export function requestDelete({ masterData, type, id, name, onConfirmed, setDeleteGuardState }) {
  const txCount = countRelatedTransactions(masterData, type, id, name);

  if (setDeleteGuardState) {
    // Gunakan modal UI (preferred)
    setDeleteGuardState({
      show: true,
      type,
      id,
      name,
      txCount,
      onConfirmed,
    });
    return;
  }

  // Fallback: gunakan window.prompt / window.confirm
  if (txCount > 0) {
    const msg =
      `DATA INI TERKUNCI!\n\n` +
      `"${name}" memiliki ${txCount} transaksi terkait.\n` +
      `Data yang memiliki transaksi tidak dapat dihapus sembarangan.\n\n` +
      `Masukkan password untuk melanjutkan penghapusan:`;
    const entered = window.prompt(msg);
    if (entered === null) return; // cancelled
    if (entered !== DELETE_PASSWORD) {
      window.alert('Password salah! Penghapusan dibatalkan.');
      return;
    }
  } else {
    if (!window.confirm(`Apakah Anda yakin ingin menghapus "${name}"?`)) return;
  }

  onConfirmed();
}

export { DELETE_PASSWORD };
