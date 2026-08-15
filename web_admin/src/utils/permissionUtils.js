/**
 * Utility for checking web admin permissions against masterData.permissionMatrix
 */

export const NORMALIZE_ROLE_MAP = {
  'superadmin': 'Super Admin',
  'super admin': 'Super Admin',
  'owner': 'Owner',
  'super admin restoran': 'Super Admin',
  'owner restoran': 'Owner',
  'admin': 'Admin',
  'admin operasional': 'Admin',
  'manajer cabang': 'Manajer Cabang',
  'manajer cabang (branch manager)': 'Manajer Cabang',
  'branch manager': 'Manajer Cabang',
  'kepala cabang': 'Manajer Cabang',
  'kepala cabang / spv': 'Manajer Cabang',
  'spv': 'Manajer Cabang',
  'kasir': 'Kasir',
  'kasir / staf keuangan': 'Kasir',
  'staf keuangan': 'Kasir',
  'logistik': 'Logistik',
  'logistik & dapur': 'Logistik & Dapur'
};

/**
 * Checks if a user role has access to a specific module in web admin.
 * @param {string} userRole - The role of the logged in user (e.g. 'Super Admin', 'Owner', 'Admin', 'Kasir')
 * @param {string} moduleKey - The key corresponding to permissionMatrix property (e.g. 'dashboard', 'masterData', 'costs', 'stock', 'reports', 'settings', 'policies', 'approved')
 * @param {Array} permissionMatrix - Array of permission objects from masterData.permissionMatrix
 * @returns {boolean}
 */
export function checkWebPermission(userRoleOrUser, moduleKey, permissionMatrix) {
  if (!userRoleOrUser) return false;
  
  // Support passing user object or userRole string
  const userRole = typeof userRoleOrUser === 'object' ? userRoleOrUser.role : userRoleOrUser;
  const userPermissions = typeof userRoleOrUser === 'object' ? (userRoleOrUser.permissions || userRoleOrUser.customPermissions) : null;
  
  // 1. Check individual user custom permission override first if present
  if (userPermissions && userPermissions[moduleKey] !== undefined) {
    return !!userPermissions[moduleKey];
  }

  if (!userRole) return false;
  
  const lowerRole = userRole.trim().toLowerCase();
  
  // Super Admin & Owner always have full permission
  if (lowerRole === 'super admin' || lowerRole === 'superadmin' || lowerRole === 'owner' || lowerRole === 'super admin restoran' || lowerRole === 'owner restoran') {
    return true;
  }

  // Fallback defaults if permissionMatrix is missing or empty
  const matrix = Array.isArray(permissionMatrix) && permissionMatrix.length > 0
    ? permissionMatrix
    : [
        { role: 'Super Admin', dashboard: true, masterData: true, costs: true, stock: true, approved: true, reports: true, policies: true, settings: true },
        { role: 'Owner', dashboard: true, masterData: true, costs: true, stock: true, approved: true, reports: true, policies: true, settings: true },
        { role: 'Admin', dashboard: true, masterData: true, costs: true, stock: true, approved: true, reports: true, policies: true, settings: false },
        { role: 'Manajer Cabang', dashboard: true, masterData: true, costs: true, stock: true, approved: true, reports: true, policies: true, settings: false },
        { role: 'Kasir', dashboard: false, masterData: false, costs: false, stock: true, approved: false, reports: false, policies: true, settings: false }
      ];

  // 1. Try exact match first
  let rolePerm = matrix.find(p => p && p.role && p.role.trim().toLowerCase() === lowerRole);
  
  // 2. Try normalized match
  if (!rolePerm && NORMALIZE_ROLE_MAP[lowerRole]) {
    const norm = NORMALIZE_ROLE_MAP[lowerRole].toLowerCase();
    rolePerm = matrix.find(p => p && p.role && p.role.trim().toLowerCase() === norm);
  }

  // 3. Partial match (excluding false positives like 'admin' matching 'super admin')
  if (!rolePerm) {
    rolePerm = matrix.find(p => {
      if (!p || !p.role) return false;
      const pLower = p.role.trim().toLowerCase();
      if (lowerRole === 'admin' && pLower.includes('super admin')) return false;
      return pLower.includes(lowerRole) || lowerRole.includes(pLower);
    });
  }

  if (!rolePerm) {
    // Default safe fallback if role not found in matrix
    return false;
  }

  // If moduleKey explicitly defined in rolePerm, return its boolean value
  if (rolePerm[moduleKey] !== undefined) {
    const val = rolePerm[moduleKey];
    if (typeof val === 'object' && val !== null) {
      return !!val.view;
    }
    return !!val;
  }

  return false;
}

/**
 * Checks granular action permission ('view' | 'edit' | 'delete') on a specific module.
 * @param {object|string} user - Current user object or role string
 * @param {string} moduleKey - Module name (e.g. 'masterData', 'stock', 'reports')
 * @param {string} actionType - 'view' | 'edit' | 'delete'
 * @param {Array} permissionMatrix - Master permission matrix
 * @returns {boolean}
 */
export function checkPermissionAction(user, moduleKey, actionType = 'view', permissionMatrix) {
  if (!user) return false;
  const userRole = typeof user === 'object' ? user.role : user;
  if (!userRole) return false;
  const lowerRole = userRole.trim().toLowerCase();

  // Super Admin & Owner always have 100% full access to view, edit, and delete
  if (
    lowerRole === 'super admin' ||
    lowerRole === 'superadmin' ||
    lowerRole === 'owner' ||
    lowerRole === 'super admin restoran' ||
    lowerRole === 'owner restoran'
  ) {
    return true;
  }

  // Check individual custom user override if present
  const userPerms = typeof user === 'object' ? (user.permissions || user.customPermissions) : null;
  if (userPerms && userPerms[moduleKey] !== undefined) {
    const pVal = userPerms[moduleKey];
    if (typeof pVal === 'object' && pVal !== null) {
      return !!pVal[actionType];
    }
    if (actionType === 'view') return !!pVal;
    if (actionType === 'edit') return !!pVal;
    if (actionType === 'delete') return false; // Default safe: no delete for non-superadmin unless explicitly granted
  }

  const matrix = Array.isArray(permissionMatrix) && permissionMatrix.length > 0
    ? permissionMatrix
    : [];

  let rolePerm = matrix.find(p => p && p.role && p.role.trim().toLowerCase() === lowerRole);
  if (!rolePerm && NORMALIZE_ROLE_MAP[lowerRole]) {
    const norm = NORMALIZE_ROLE_MAP[lowerRole].toLowerCase();
    rolePerm = matrix.find(p => p && p.role && p.role.trim().toLowerCase() === norm);
  }
  if (!rolePerm) {
    rolePerm = matrix.find(p => {
      if (!p || !p.role) return false;
      const pLower = p.role.trim().toLowerCase();
      if (lowerRole === 'admin' && pLower.includes('super admin')) return false;
      return pLower.includes(lowerRole) || lowerRole.includes(pLower);
    });
  }

  if (!rolePerm || rolePerm[moduleKey] === undefined) {
    return false;
  }

  const modPerm = rolePerm[moduleKey];
  if (typeof modPerm === 'object' && modPerm !== null) {
    return !!modPerm[actionType];
  }

  // Legacy boolean mapping
  if (actionType === 'view') return !!modPerm;
  if (actionType === 'edit') return !!modPerm;
  if (actionType === 'delete') {
    // Only allow delete if explicitly role is Admin with true, otherwise false
    return lowerRole.includes('admin') ? !!modPerm : false;
  }

  return false;
}

export const canViewModule = (user, moduleKey, matrix) => checkPermissionAction(user, moduleKey, 'view', matrix);
export const canEditModule = (user, moduleKey, matrix) => checkPermissionAction(user, moduleKey, 'edit', matrix);
export const canDeleteModule = (user, moduleKey, matrix) => checkPermissionAction(user, moduleKey, 'delete', matrix);
