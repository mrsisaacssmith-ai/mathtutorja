import { sql } from './_shared/db.mjs';
import { json, withErrorHandling, HttpError } from './_shared/http.mjs';
import { requireAuth, requireAdmin } from './_shared/auth.mjs';

export default withErrorHandling(async (req) => {
  if (req.method !== 'GET') throw new HttpError(405, 'Method not allowed.');
  requireAdmin(requireAuth(req));

  const bookings = await sql`
    SELECT b.*, u.student_name, u.grade_level, u.email, u.phone, s.label, s.mode, s.class_type
    FROM bookings b
    JOIN users u ON u.id = b.user_id
    JOIN slots s ON s.id = b.slot_id
    ORDER BY b.created_at DESC
  `;
  return json({ bookings });
});

export const config = { path: '/api/admin/bookings' };
