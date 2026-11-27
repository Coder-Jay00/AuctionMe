/**
 * Centralized role-based dashboard routing and safe redirect validation.
 * Roles are always determined by the backend (/api/auth/login, /api/auth/me),
 * never supplied by the frontend.
 */

export function getDashboardPathForRole(role) {
  switch (String(role || '').toUpperCase()) {
    case 'ADMIN':
      return '/admin';
    case 'HOST':
      return '/host';
    case 'BIDDER':
    default:
      return '/discover';
  }
}

export function isSafeInternalPath(path) {
  if (typeof path !== 'string' || !path.startsWith('/')) return false;
  if (path.startsWith('//') || path.includes('\\')) return false;
  if (path === '/login' || path.startsWith('/login?') || path === '/signup' || path.startsWith('/signup?')) {
    return false;
  }
  return true;
}

export function isPathAllowedForRole(pathname, role) {
  if (!isSafeInternalPath(pathname)) return false;
  const normalizedRole = String(role || '').toUpperCase();
  const cleanPath = pathname.split('?')[0];

  if (cleanPath === '/admin' || cleanPath.startsWith('/admin/')) {
    return normalizedRole === 'ADMIN';
  }
  if (cleanPath === '/host' || cleanPath.startsWith('/host/')) {
    return normalizedRole === 'HOST' || normalizedRole === 'ADMIN';
  }
  return true;
}

export function resolvePostLoginDestination(role, nextParam) {
  if (nextParam && isPathAllowedForRole(nextParam, role)) {
    return nextParam;
  }
  return getDashboardPathForRole(role);
}
