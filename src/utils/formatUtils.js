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
