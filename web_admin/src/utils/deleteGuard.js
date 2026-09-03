/**
 * deleteGuard.js
 * Utilitas perlindungan penghapusan data yang memiliki transaksi.
 * 
 * Aturan:
 * - Jika item memiliki transaksi terkait → wajib masukkan password "Bismillah"
 * - Jika tidak ada transaksi → konfirmasi biasa
 * - Jika password salah → hapus dibatalkan
 */

import { getApiUrl } from './apiConfig';

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

/**
 * Eksekusi penghapusan permanen lintas sistem (Web Admin State + LocalStorage + MySQL Database + POS Kasir)
 * Menjamin 0 ms respons lokal dan data tidak akan pernah bangkit kembali (Zombie-Proof).
 * 
 * @param {object} params
 * @param {string} params.key - Key master array ('products', 'ingredients', 'categories', 'outlets', 'customers', 'suppliers', 'units', 'tables', 'expenseMaster', 'salesTransactions', 'approvedFinanceDaily', 'manualEntryRecords', 'stockOpname', 'stockTransfer', 'damagedGoods', 'webAdminAccounts', 'mobileAccounts', dll.)
 * @param {string|number} params.id - ID item
 * @param {string} [params.name] - Nama item
 * @param {string} [params.code] - Kode / SKU item
 * @param {string} [params.sku] - SKU item
 * @param {string} [params.receipt_no] - Nomor struk / nomor laporan
 * @param {string} [params.username] - Username akun
 * @param {object} params.masterData - Current masterData state
 * @param {function} params.setMasterData - State setter
 * @param {function} [params.updateMasterData] - App updater
 */
export async function executePermanentDelete({
  key,
  id,
  name = '',
  code = '',
  sku = '',
  receipt_no = '',
  username = '',
  masterData,
  setMasterData,
  updateMasterData
}) {
  if (!key || id === undefined || id === null) return;

  const idStr = String(id).trim();
  const nameStr = String(name || '').toLowerCase().trim();
  const codeStr = String(code || '').toLowerCase().trim();
  const skuStr = String(sku || '').toLowerCase().trim();
  const rcptStr = String(receipt_no || '').trim();
  const userStr = String(username || '').toLowerCase().trim();
  const nowTs = Date.now();

  const isMatchItem = (it) => {
    if (!it) return false;
    const itId = String(it.id !== undefined && it.id !== null ? it.id : '').trim();
    const itName = String(it.name || it.title || '').toLowerCase().trim();
    const itCode = String(it.code || '').toLowerCase().trim();
    const itSku = String(it.sku || '').toLowerCase().trim();
    const itRcpt = String(it.receipt_no || it.receiptNo || it.report_no || it.tx_id || '').trim();
    const itUser = String(it.username || it.user || '').toLowerCase().trim();

    if (idStr && (itId === idStr || (Number(itId) && Number(itId) === Number(idStr)))) return true;
    if (rcptStr && (itRcpt === rcptStr || itId === rcptStr)) return true;
    if (codeStr && itCode === codeStr) return true;
    if (skuStr && itSku === skuStr) return true;
    if (nameStr && itName === nameStr) return true;
    if (userStr && itUser === userStr) return true;
    return false;
  };

  const current = masterData || {};
  const updated = { ...current, _lastUpdated: nowTs };

  // 1. Catat ke Tombstones di local state
  const appendTombstone = (arrKey, items) => {
    const validItems = items.filter(Boolean);
    updated[arrKey] = Array.from(new Set([
      ...(updated[arrKey] || []),
      ...validItems
    ]));
  };

  if (['products', 'menuItems', 'outletMenuItems'].includes(key)) {
    appendTombstone('deletedProductIds', [idStr, codeStr, skuStr, nameStr]);
    ['products', 'menuItems', 'outletMenuItems'].forEach(k => {
      if (Array.isArray(updated[k])) updated[k] = updated[k].filter(it => !isMatchItem(it));
    });
  } else if (['ingredients'].includes(key)) {
    appendTombstone('deletedIngredientIds', [idStr, codeStr, skuStr, nameStr]);
    if (Array.isArray(updated.ingredients)) updated.ingredients = updated.ingredients.filter(it => !isMatchItem(it));
  } else if (['categories', 'ingredientCategories'].includes(key)) {
    appendTombstone('deletedCategoriesIds', [idStr, codeStr, nameStr]);
    appendTombstone('deletedCategoryIds', [idStr, codeStr, nameStr]);
    ['categories', 'ingredientCategories'].forEach(k => {
      if (Array.isArray(updated[k])) updated[k] = updated[k].filter(it => !isMatchItem(it));
    });
  } else if (['outlets'].includes(key)) {
    appendTombstone('deletedOutletIds', [idStr, codeStr, nameStr]);
    if (Array.isArray(updated.outlets)) updated.outlets = updated.outlets.filter(it => !isMatchItem(it));
  } else if (['customers'].includes(key)) {
    appendTombstone('deletedCustomerIds', [idStr, codeStr, nameStr]);
    if (Array.isArray(updated.customers)) updated.customers = updated.customers.filter(it => !isMatchItem(it));
  } else if (['suppliers'].includes(key)) {
    appendTombstone('deletedSupplierIds', [idStr, codeStr, nameStr]);
    if (Array.isArray(updated.suppliers)) updated.suppliers = updated.suppliers.filter(it => !isMatchItem(it));
  } else if (['units'].includes(key)) {
    appendTombstone('deletedUnitIds', [idStr, nameStr]);
    if (Array.isArray(updated.units)) updated.units = updated.units.filter(it => !isMatchItem(it));
  } else if (['tables'].includes(key)) {
    appendTombstone('deletedTableIds', [idStr, nameStr]);
    if (Array.isArray(updated.tables)) updated.tables = updated.tables.filter(it => !isMatchItem(it));
  } else if (['expenseMaster'].includes(key)) {
    appendTombstone('deletedExpenseIds', [idStr, codeStr, nameStr]);
    if (Array.isArray(updated.expenseMaster)) updated.expenseMaster = updated.expenseMaster.filter(it => !isMatchItem(it));
  } else if (['fixedAssets', 'assets'].includes(key)) {
    appendTombstone('deletedAssetIds', [idStr, codeStr, nameStr]);
    ['fixedAssets', 'assets'].forEach(k => {
      if (Array.isArray(updated[k])) updated[k] = updated[k].filter(it => !isMatchItem(it));
    });
  } else if (['salesTransactions', 'transactions', 'outletTransactions'].includes(key)) {
    appendTombstone('deletedSalesIds', [idStr, rcptStr]);
    appendTombstone('deletedLogisticsIds', [idStr, rcptStr]);
    ['salesTransactions', 'transactions', 'outletTransactions'].forEach(k => {
      if (Array.isArray(updated[k])) updated[k] = updated[k].filter(it => !isMatchItem(it));
    });
    if (Array.isArray(updated.stockMovement)) {
      updated.stockMovement = updated.stockMovement.filter(sm => {
        const ref = String(sm.ref_id || sm.transaction_id || sm.receipt_no || '');
        return ref !== idStr && ref !== rcptStr;
      });
    }
  } else if (['approvedFinanceDaily', 'manualEntryRecords', 'shiftClosings', 'closedShifts'].includes(key)) {
    appendTombstone('deletedReportIds', [idStr, rcptStr]);
    ['approvedFinanceDaily', 'manualEntryRecords', 'shiftClosings', 'closedShifts', 'dailyReports'].forEach(k => {
      if (Array.isArray(updated[k])) updated[k] = updated[k].filter(it => !isMatchItem(it));
    });
  } else if (['stockOpname', 'approvedLogistics', 'stockTransfer', 'damagedGoods', 'approvedWaste'].includes(key)) {
    appendTombstone('deletedLogisticsIds', [idStr, rcptStr]);
    ['stockOpname', 'approvedLogistics', 'stockTransfer', 'approvedTransfers', 'damagedGoods', 'approvedWaste'].forEach(k => {
      if (Array.isArray(updated[k])) updated[k] = updated[k].filter(it => !isMatchItem(it));
    });
  } else if (['webAdminAccounts', 'mobileAccounts', 'users', 'userRights'].includes(key)) {
    appendTombstone('deletedUserIds', [idStr]);
    if (userStr) appendTombstone('deletedUsernames', [userStr]);
    ['webAdminAccounts', 'mobileAccounts', 'users', 'userRights', 'userAccounts'].forEach(k => {
      if (Array.isArray(updated[k])) updated[k] = updated[k].filter(it => !isMatchItem(it));
    });
  } else if (Array.isArray(updated[key])) {
    updated[key] = updated[key].filter(it => !isMatchItem(it));
  }

  // 2. Terapkan pembaruan lokal secara instan (0 ms)
  if (updateMasterData) {
    updateMasterData(updated);
  } else if (setMasterData) {
    setMasterData(updated);
  }

  try {
    localStorage.setItem('mris_master_data', JSON.stringify(updated));
    if (Array.isArray(updated.webAdminAccounts)) localStorage.setItem('MRIS_WEBADMINACCOUNTS', JSON.stringify(updated.webAdminAccounts));
    if (Array.isArray(updated.mobileAccounts)) localStorage.setItem('MRIS_MOBILEACCOUNTS', JSON.stringify(updated.mobileAccounts));
  } catch (e) {}

  // 3. Kirim perintah hapus permanen ke server & database MySQL
  try {
    const payload = {
      key,
      id: idStr,
      name: nameStr,
      code: codeStr,
      sku: skuStr,
      receipt_no: rcptStr,
      username: userStr
    };

    await fetch(getApiUrl('/api/master-data/delete-item'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  } catch (err) {
    console.error(`Gagal menghapus ${key} ID ${idStr} dari server:`, err);
  }
}

export { DELETE_PASSWORD };
