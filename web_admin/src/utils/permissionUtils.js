/**
 * Utility for checking web admin permissions against masterData.permissionMatrix
 */

export const NORMALIZE_ROLE_MAP = {
  'superadmin': 'Super Admin / Owner',
  'super admin': 'Super Admin / Owner',
  'owner': 'Super Admin / Owner',
  'super admin restoran': 'Super Admin / Owner',
  'owner restoran': 'Super Admin / Owner',
  'manajer cabang': 'Manajer Cabang (Branch Manager)',
  'manajer cabang (branch manager)': 'Manajer Cabang (Branch Manager)',
  'branch manager': 'Manajer Cabang (Branch Manager)',
  'kepala cabang': 'Manajer Cabang (Branch Manager)',
  'kepala cabang / spv': 'Manajer Cabang (Branch Manager)',
  'spv': 'Manajer Cabang (Branch Manager)',
  'admin': 'Manajer Cabang (Branch Manager)',
  'admin operasional': 'Manajer Cabang (Branch Manager)',
  'kasir': 'Kasir / Staf Keuangan',
  'kasir / staf keuangan': 'Kasir / Staf Keuangan',
  'staf keuangan': 'Kasir / Staf Keuangan',
  'logistik': 'Logistik',
  'logistik & dapur': 'Logistik'
};

/**
 * Checks if a user role has access to a specific module in web admin.
 * @param {string} userRole - The role of the logged in user (e.g. 'Super Admin', 'Owner', 'Kasir')
 * @param {string} moduleKey - The key corresponding to permissionMatrix property (e.g. 'dashboard', 'masterData', 'costs', 'stock', 'reports', 'settings', 'policies', 'approved')
 * @param {Array} permissionMatrix - Array of permission objects from masterData.permissionMatrix
 * @returns {boolean}
 */
export function checkWebPermission(userRole, moduleKey, permissionMatrix) {
  if (!userRole) return false;
  
  const lowerRole = userRole.trim().toLowerCase();
  
  // Super Admin & Owner always have full permission
  if (lowerRole.includes('super admin') || lowerRole.includes('superadmin') || lowerRole.includes('owner')) {
    return true;
  }

  // Fallback defaults if permissionMatrix is missing or empty
  const matrix = Array.isArray(permissionMatrix) && permissionMatrix.length > 0
    ? permissionMatrix
    : [
        { role: 'Super Admin / Owner', dashboard: true, masterData: true, costs: true, stock: true, approved: true, reports: true, policies: true, settings: true },
        { role: 'Manajer Cabang (Branch Manager)', dashboard: true, masterData: true, costs: true, stock: true, approved: true, reports: true, policies: true, settings: false },
        { role: 'Kasir / Staf Keuangan', dashboard: false, masterData: false, costs: false, stock: true, approved: false, reports: false, policies: true, settings: false }
      ];

  // Try exact match or normalized match
  const normalizedUserRole = NORMALIZE_ROLE_MAP[lowerRole] || userRole;
  
  const rolePerm = matrix.find(p => {
    if (!p.role) return false;
    const pRoleLower = p.role.trim().toLowerCase();
    return pRoleLower === lowerRole ||
           pRoleLower === normalizedUserRole.toLowerCase() ||
           pRoleLower.includes(lowerRole) ||
           lowerRole.includes(pRoleLower);
  });

  if (!rolePerm) {
    // Default safe fallback if role not found in matrix
    return false;
  }

  // If moduleKey explicitly defined in rolePerm, return its boolean value
  if (rolePerm[moduleKey] !== undefined) {
    return !!rolePerm[moduleKey];
  }

  return false;
}
