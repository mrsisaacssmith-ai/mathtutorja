import { sql } from './_shared/db.mjs';
import { json, withErrorHandling, HttpError } from './_shared/http.mjs';
import { requireAuth } from './_shared/auth.mjs';

export default withErrorHandling(async (req) => {
  if (req.method !== 'GET') throw new HttpError(405, 'Method not allowed.');
  const auth = requireAuth(req);

  const bookings = await sql`
    SELECT b.*, s.label, s.day_of_week, s.start_time, s.end_time, s.mode, s.class_type, s.price_usd
    FROM bookings b JOIN slots s ON s.id = b.slot_id
    WHERE b.user_id = ${auth.id}
    ORDER BY b.created_at DESC
  `;
  return json({ bookings });
});

export const config = { path: '/api/bookings/mine' };
