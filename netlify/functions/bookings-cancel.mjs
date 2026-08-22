import { sql } from './_shared/db.mjs';
import { json, withErrorHandling, HttpError } from './_shared/http.mjs';
import { requireAuth } from './_shared/auth.mjs';

export default withErrorHandling(async (req, context) => {
  if (req.method !== 'PATCH') throw new HttpError(405, 'Method not allowed.');
  const auth = requireAuth(req);
  const bookingId = context.params.id;

  const [booking] = await sql`SELECT * FROM bookings WHERE id = ${bookingId} AND user_id = ${auth.id}`;
  if (!booking) throw new HttpError(404, 'Booking not found.');

  await sql`UPDATE bookings SET status = 'cancelled' WHERE id = ${booking.id}`;
  return json({ message: 'Booking cancelled. Reminder: cancellations within 24 hours of a session are billed per policy.' });
});

export const config = { path: '/api/bookings/:id/cancel' };
