import jwt from 'jsonwebtoken';
import { HttpError } from './http.mjs';

const JWT_SECRET = process.env.JWT_SECRET || 'change-me-in-netlify-env-vars';

export function signToken(user) {
  return jwt.sign(
    { id: user.id, role: user.role, email: user.email, student_name: user.student_name },
    JWT_SECRET,
    { expiresIn: '30d' }
  );
}

// Reads and verifies the Bearer token from a Request. Throws HttpError(401) if missing/invalid.
export function requireAuth(req) {
  const header = req.headers.get('authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) throw new HttpError(401, 'Log in to continue.');

  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    throw new HttpError(401, 'Your session expired — please log in again.');
  }
}

export function requireAdmin(user) {
  if (user.role !== 'admin') throw new HttpError(403, 'Admin access only.');
}
