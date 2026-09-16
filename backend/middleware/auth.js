// Placeholder auth middleware for development/testing.
// Reads X-User-Role header and allows certain roles to perform mutations.
// TODO: Replace with real authentication & authorization (JWT, sessions, role checks).

export function requireAdminOrHR(req, res, next) {
  const role = (req.header('X-User-Role') || '').toLowerCase();
  if (role === 'admin' || role === 'hr' || role === 'superadmin') {
    return next();
  }
  return res.status(403).json({ success: false, message: 'Forbidden: admin/hr role required' });
}
