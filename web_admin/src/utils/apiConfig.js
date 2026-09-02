/**
 * Centralized API URL resolver for MRIS
 * Automatically handles Localhost, Production Web Admin, and Native Mobile APK
 */
export const getApiUrl = (pathStr = '') => {
  const cleanPath = pathStr.startsWith('/') ? pathStr : `/${pathStr}`;

  if (typeof window !== 'undefined') {
    // 1. Native Capacitor Mobile APK (Android / iOS) -> Wajib 100% ke Live Production Database Server
    const isCapacitorNative = 
      (window.Capacitor && typeof window.Capacitor.isNativePlatform === 'function' && window.Capacitor.isNativePlatform()) ||
      window.location.protocol === 'capacitor:' ||
      (window.location.protocol === 'https:' && window.location.hostname === 'localhost' && !window.location.port);

    if (isCapacitorNative) {
      return `https://mris-api.barokahgroupindonesia.tech${cleanPath}`;
    }

    // 2. Production Web Admin Browser (*.barokahgroupindonesia.tech)
    if (window.location.origin.includes('barokahgroupindonesia.tech')) {
      return cleanPath;
    }

    // 3. Localhost Browser Development -> Terhubung langsung ke Live Production Cloud API
    return `https://mris-api.barokahgroupindonesia.tech${cleanPath}`;
  }

  // 4. Fallback default
  return `https://mris-api.barokahgroupindonesia.tech${cleanPath}`;
};

export default getApiUrl;

