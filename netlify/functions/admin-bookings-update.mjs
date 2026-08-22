import { sql } from './_shared/db.mjs';
import { json, readJson, withErrorHandling, HttpError } from './_shared/http.mjs';
import { requireAuth, requireAdmin } from './_shared/auth.mjs';

export default withErrorHandling(async (req, context) => {
  if (req.method !== 'PATCH') throw new HttpError(405, 'Method not allowed.');
  requireAdmin(requireAuth(req));

  const bookingId = context.params.id;
  const { zoom_link, status } = await readJson(req);

  const [booking] = await sql`SELECT * FROM bookings WHERE id = ${bookingId}`;
  if (!booking) throw new HttpError(404, 'Booking not found.');

  const updated = await sql`
    UPDATE bookings SET
      zoom_link = COALESCE(${zoom_link ?? null}, zoom_link),
      status = COALESCE(${status ?? null}, status)
    WHERE id = ${bookingId}
    RETURNING *
  `;
  return json({ booking: updated[0] });
});

export const config = { path: '/api/admin/bookings/:id' };
