// MRIS Enterprise IndexedDB Offline Storage Engine
// Menyediakan kapasitas penyimpanan offline ratusan MB (menggantikan limit 5MB localStorage)

const DB_NAME = 'mris_pos_db';
const DB_VERSION = 1;

let dbPromise = null;

export function getIDB() {
  if (typeof window === 'undefined' || !window.indexedDB) {
    return Promise.resolve(null);
  }

  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const request = window.indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains('offlineQueue')) {
          db.createObjectStore('offlineQueue', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('tableOrders')) {
          db.createObjectStore('tableOrders', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('appCache')) {
          db.createObjectStore('appCache', { keyPath: 'key' });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  return dbPromise;
}

// Simpan transaksi offline ke IndexedDB
export async function idbSaveOfflineTx(tx) {
  try {
    const db = await getIDB();
    if (!db) return false;
    return new Promise((resolve, reject) => {
      const txObj = db.transaction('offlineQueue', 'readwrite');
      const store = txObj.objectStore('offlineQueue');
      const req = store.put(tx);
      req.onsuccess = () => resolve(true);
      req.onerror = () => reject(req.error);
    });
  } catch (e) {
    console.warn('[IDB] Error saving offline tx:', e);
    return false;
  }
}

// Ambil seluruh transaksi offline
export async function idbGetAllOfflineTx() {
  try {
    const db = await getIDB();
    if (!db) return [];
    return new Promise((resolve, reject) => {
      const txObj = db.transaction('offlineQueue', 'readonly');
      const store = txObj.objectStore('offlineQueue');
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  } catch (e) {
    return [];
  }
}

// Hapus transaksi offline yang sudah tersinkron
export async function idbDeleteOfflineTx(txId) {
  try {
    const db = await getIDB();
    if (!db) return false;
    return new Promise((resolve, reject) => {
      const txObj = db.transaction('offlineQueue', 'readwrite');
      const store = txObj.objectStore('offlineQueue');
      const req = store.delete(txId);
      req.onsuccess = () => resolve(true);
      req.onerror = () => reject(req.error);
    });
  } catch (e) {
    return false;
  }
}

// Generic Key-Value Cache
export async function idbSetCache(key, value) {
  try {
    const db = await getIDB();
    if (!db) return false;
    return new Promise((resolve, reject) => {
      const txObj = db.transaction('appCache', 'readwrite');
      const store = txObj.objectStore('appCache');
      const req = store.put({ key, value, updatedAt: Date.now() });
      req.onsuccess = () => resolve(true);
      req.onerror = () => reject(req.error);
    });
  } catch (e) {
    return false;
  }
}

export async function idbGetCache(key) {
  try {
    const db = await getIDB();
    if (!db) return null;
    return new Promise((resolve, reject) => {
      const txObj = db.transaction('appCache', 'readonly');
      const store = txObj.objectStore('appCache');
      const req = store.get(key);
      req.onsuccess = () => resolve(req.result ? req.result.value : null);
      req.onerror = () => reject(req.error);
    });
  } catch (e) {
    return null;
  }
}
