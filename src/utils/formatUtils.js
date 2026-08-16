/**
 * Centralized Date & Time Formatting Utilities for MRIS
 */

const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agt', 'Sep', 'Okt', 'Nov', 'Des'];
const MONTHS_LONG = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

/**
 * Format date & time into 'DD/MM/YYYY HH:mm'
 * @param {string|number|Date} dateVal - Date string (YYYY-MM-DD or ISO), timestamp, or Date object
 * @param {string} [timeVal] - Optional time string (HH:mm or HH:mm:ss)
 * @returns {string} - e.g. "16/08/2026 06:44"
 */
export function formatDateTime(dateVal, timeVal) {
  if (!dateVal && !timeVal) return '-';

  let dateStr = '';
  let timeStr = timeVal || '';

  if (dateVal instanceof Date) {
    const d = String(dateVal.getDate()).padStart(2, '0');
    const m = String(dateVal.getMonth() + 1).padStart(2, '0');
    const y = dateVal.getFullYear();
    const hr = String(dateVal.getHours()).padStart(2, '0');
    const min = String(dateVal.getMinutes()).padStart(2, '0');
    return `${d}/${m}/${y} ${hr}:${min}`;
  }

  if (typeof dateVal === 'number') {
    const dObj = new Date(dateVal);
    const d = String(dObj.getDate()).padStart(2, '0');
    const m = String(dObj.getMonth() + 1).padStart(2, '0');
    const y = dObj.getFullYear();
    const hr = String(dObj.getHours()).padStart(2, '0');
    const min = String(dObj.getMinutes()).padStart(2, '0');
    return `${d}/${m}/${y} ${hr}:${min}`;
  }

  const str = String(dateVal || '').trim();

  // If ISO string containing 'T' or space with time
  if (str.includes('T')) {
    const [dPart, tPart] = str.split('T');
    dateStr = dPart;
    if (!timeStr && tPart) {
      timeStr = tPart.substring(0, 5); // HH:mm
    }
  } else if (str.includes(' ') && str.length >= 16) {
    const [dPart, tPart] = str.split(' ');
    dateStr = dPart;
    if (!timeStr && tPart) {
      timeStr = tPart.substring(0, 5); // HH:mm
    }
  } else {
    dateStr = str;
  }

  // Format date part
  let formattedDate = dateStr;
  if (dateStr.includes('-')) {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      // YYYY-MM-DD
      if (parts[0].length === 4) {
        formattedDate = `${parts[2].padStart(2, '0')}/${parts[1].padStart(2, '0')}/${parts[0]}`;
      } else {
        formattedDate = `${parts[0].padStart(2, '0')}/${parts[1].padStart(2, '0')}/${parts[2]}`;
      }
    }
  }

  // Format time part
  let formattedTime = timeStr || '00:00';
  if (formattedTime.includes(':')) {
    const tParts = formattedTime.split(':');
    formattedTime = `${tParts[0].padStart(2, '0')}:${(tParts[1] || '00').substring(0, 2).padStart(2, '0')}`;
  }

  return `${formattedDate} ${formattedTime}`;
}

/**
 * Format date & time into Indonesian readable format e.g. '16 Agu 2026, 06:44'
 */
export function formatDateTimeReadable(dateVal, timeVal) {
  if (!dateVal && !timeVal) return '-';
  const full = formatDateTime(dateVal, timeVal);
  if (full === '-') return '-';

  const [dStr, tStr] = full.split(' ');
  const parts = dStr.split('/');
  if (parts.length === 3) {
    const day = parseInt(parts[0], 10);
    const mIdx = parseInt(parts[1], 10) - 1;
    const year = parts[2];
    const mName = MONTHS_SHORT[mIdx] || parts[1];
    return `${day} ${mName} ${year}, ${tStr}`;
  }
  return full;
}

/**
 * Format date only for financial & operational reports (No time)
 */
export function formatDateOnly(dateVal) {
  if (!dateVal) return '-';
  const str = String(dateVal).split('T')[0].split(' ')[0];
  if (str.includes('-')) {
    const parts = str.split('-');
    if (parts.length === 3 && parts[0].length === 4) {
      return `${parts[2].padStart(2, '0')}/${parts[1].padStart(2, '0')}/${parts[0]}`;
    }
  }
  return str;
}

/**
 * Contextual High-Resolution AI Culinary Image Selector for Indonesian Restaurant Menus
 * @param {string} name - Product Name
 * @param {string} catName - Category Name
 * @returns {string} - Unsplash high-resolution food photo URL
 */
export function getMenuFallbackImage(name = '', catName = '') {
  const normName = String(name || '').trim().toUpperCase();
  const normCat = String(catName || '').trim().toUpperCase();

  // 1. Ayam
  if (normName.includes('AYAM BAKAR')) return 'https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?w=600&auto=format&fit=crop&q=80';
  if (normName.includes('AYAM GORENG')) return 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=600&auto=format&fit=crop&q=80';
  if (normName.includes('AYAM PENYET')) return 'https://images.unsplash.com/photo-1569058242253-92a9c755a0ec?w=600&auto=format&fit=crop&q=80';
  if (normName.includes('AYAM SAUS PADANG')) return 'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=600&auto=format&fit=crop&q=80';
  if (normName.includes('AYAM UTUH')) return 'https://images.unsplash.com/photo-1532550907401-a500c9a57435?w=600&auto=format&fit=crop&q=80';
  if (normName.includes('AYAM') || normCat.includes('AYAM')) return 'https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?w=600&auto=format&fit=crop&q=80';

  // 2. Bebek
  if (normName.includes('BEBEK BAKAR')) return 'https://images.unsplash.com/photo-1518492104633-130d0cc84637?w=600&auto=format&fit=crop&q=80';
  if (normName.includes('BEBEK PENYET')) return 'https://images.unsplash.com/photo-1589302168068-964664d93dc0?w=600&auto=format&fit=crop&q=80';
  if (normName.includes('BEBEK SAUS PADANG')) return 'https://images.unsplash.com/photo-1563245372-f21724e3856d?w=600&auto=format&fit=crop&q=80';
  if (normName.includes('BEBEK UTUH')) return 'https://images.unsplash.com/photo-1518492104633-130d0cc84637?w=600&auto=format&fit=crop&q=80';
  if (normName.includes('BEBEK') || normCat.includes('BEBEK')) return 'https://images.unsplash.com/photo-1514944298352-f47285a86d26?w=600&auto=format&fit=crop&q=80';

  // 3. Ikan & Seafood
  if (normName.includes('PECEL LELE BAKAR')) return 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=600&auto=format&fit=crop&q=80';
  if (normName.includes('PECEL LELE') || normName.includes('LELE')) return 'https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?w=600&auto=format&fit=crop&q=80';
  if (normName.includes('NILA BAKAR')) return 'https://images.unsplash.com/photo-1544025162-d76694265947?w=600&auto=format&fit=crop&q=80';
  if (normName.includes('NILA SAUS PADANG')) return 'https://images.unsplash.com/photo-1541832676-9b763b0239ab?w=600&auto=format&fit=crop&q=80';
  if (normName.includes('NILA')) return 'https://images.unsplash.com/photo-1580476262798-bddd9f4b7369?w=600&auto=format&fit=crop&q=80';
  if (normName.includes('GEMBUNG BAKAR')) return 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=600&auto=format&fit=crop&q=80';
  if (normName.includes('GEMBUNG SAUS PADANG')) return 'https://images.unsplash.com/photo-1541832676-9b763b0239ab?w=600&auto=format&fit=crop&q=80';
  if (normName.includes('GEMBUNG')) return 'https://images.unsplash.com/photo-1535400255456-984241443b29?w=600&auto=format&fit=crop&q=80';
  if (normName.includes('UDANG')) return 'https://images.unsplash.com/photo-1565680018434-b513d5e5fd47?w=600&auto=format&fit=crop&q=80';
  if (normName.includes('CUMI')) return 'https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?w=600&auto=format&fit=crop&q=80';
  if (normName.includes('IKAN') || normCat.includes('IKAN') || normCat.includes('SEAFOOD')) return 'https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?w=600&auto=format&fit=crop&q=80';

  // 4. Minuman
  if (normName.includes('MINERAL') || normName.includes('AIR')) return 'https://images.unsplash.com/photo-1548839140-29a749e1bc4e?w=600&auto=format&fit=crop&q=80';
  if (normName.includes('TEH BOTOL')) return 'https://images.unsplash.com/photo-1556881286-fc6915169721?w=600&auto=format&fit=crop&q=80';
  if (normName.includes('TEH PAHIT')) return 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=600&auto=format&fit=crop&q=80';
  if (normName.includes('LEMON TEA')) return 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=600&auto=format&fit=crop&q=80';
  if (normName.includes('TEH') || normName.includes('TEA')) return 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=600&auto=format&fit=crop&q=80';
  if (normName.includes('JERUK') || normName.includes('ORANGE')) return 'https://images.unsplash.com/photo-1613478223719-2ab802602423?w=600&auto=format&fit=crop&q=80';
  if (normName.includes('MILO') || normName.includes('COKLAT')) return 'https://images.unsplash.com/photo-1542990253-0d0f5be5f0ed?w=600&auto=format&fit=crop&q=80';
  if (normName.includes('CAPPUCINO') || normName.includes('KOPI') || normName.includes('COFFEE')) return 'https://images.unsplash.com/photo-1517256064527-09c73fc73e38?w=600&auto=format&fit=crop&q=80';
  if (normName.includes('KURNIA') || normName.includes('SIRUP')) return 'https://images.unsplash.com/photo-1536935338788-846bb9981813?w=600&auto=format&fit=crop&q=80';
  if (normName.includes('ES KOSONG') || normName.includes('ES BATU')) return 'https://images.unsplash.com/photo-1517840901100-8179e982acb7?w=600&auto=format&fit=crop&q=80';
  if (normCat.includes('MINUM')) return 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=600&auto=format&fit=crop&q=80';

  // 5. Sayur, Nasi & Tambahan
  if (normName.includes('KANGKUNG')) return 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=600&auto=format&fit=crop&q=80';
  if (normName.includes('TERONG')) return 'https://images.unsplash.com/photo-1528825871115-3581a5387919?w=600&auto=format&fit=crop&q=80';
  if (normName.includes('KOL')) return 'https://images.unsplash.com/photo-1567306226416-28f0efdc88ce?w=600&auto=format&fit=crop&q=80';
  if (normName.includes('SAMBAL')) return 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=600&auto=format&fit=crop&q=80';
  if (normName.includes('TEMPE')) return 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&auto=format&fit=crop&q=80';
  if (normName.includes('TAHU')) return 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&auto=format&fit=crop&q=80';
  if (normName.includes('PETE') || normName.includes('PETAI')) return 'https://images.unsplash.com/photo-1615485500704-8e990f9900f7?w=600&auto=format&fit=crop&q=80';
  if (normName.includes('UDUK')) return 'https://images.unsplash.com/photo-1536304993881-ff6e9eefa2a6?w=600&auto=format&fit=crop&q=80';
  if (normName.includes('NASI')) return 'https://images.unsplash.com/photo-1516684732162-798a0062be99?w=600&auto=format&fit=crop&q=80';

  // 6. Paket
  if (normName.includes('PAKET') || normCat.includes('PAKET')) return 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=600&auto=format&fit=crop&q=80';

  return 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&auto=format&fit=crop&q=80';
}
