/**
 * Centralized API URL resolver for MRIS
 * Automatically handles Localhost, Production Web Admin, and Native Mobile APK
 */
export const getApiUrl = (pathStr = '') => {
  const cleanPath = pathStr.startsWith('/') ? pathStr : `/${pathStr}`;

  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname || '';

    // 1. Localhost / 127.0.0.1 / Local IP (Local Development)
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname.startsWith('192.168.') || hostname.startsWith('10.')) {
      // If web admin is served on port 3000 or 5173, backend is on port 5001
      return `http://${hostname}:5001${cleanPath}`;
    }

    // 2. Production Web Admin Browser (*.barokahgroupindonesia.tech)
    if (window.location.origin.includes('barokahgroupindonesia.tech')) {
      // Relative path: Nginx handles reverse proxy to Port 5001 with SSL
      return cleanPath;
    }
  }

  // 3. Fallback default for Native Capacitor Mobile APK
  return `https://mris-api.barokahgroupindonesia.tech${cleanPath}`;
};

export default getApiUrl;
