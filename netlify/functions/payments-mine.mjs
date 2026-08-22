import { sql } from './_shared/db.mjs';
import { json, withErrorHandling, HttpError } from './_shared/http.mjs';
import { requireAuth } from './_shared/auth.mjs';

export default withErrorHandling(async (req) => {
  if (req.method !== 'GET') throw new HttpError(405, 'Method not allowed.');
  const auth = requireAuth(req);

  const payments = await sql`
    SELECT p.*, s.label FROM payments p
    JOIN bookings b ON b.id = p.booking_id
    JOIN slots s ON s.id = b.slot_id
    WHERE b.user_id = ${auth.id}
    ORDER BY p.created_at DESC
  `;
  return json({ payments });
});

export const config = { path: '/api/payments/mine' };
