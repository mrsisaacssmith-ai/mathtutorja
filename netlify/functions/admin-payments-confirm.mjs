import { sql } from './_shared/db.mjs';
import { json, withErrorHandling, HttpError } from './_shared/http.mjs';
import { requireAuth, requireAdmin } from './_shared/auth.mjs';

export default withErrorHandling(async (req, context) => {
  if (req.method !== 'PATCH') throw new HttpError(405, 'Method not allowed.');
  const auth = requireAuth(req);
  requireAdmin(auth);

  const paymentId = context.params.id;
  const [payment] = await sql`SELECT * FROM payments WHERE id = ${paymentId}`;
  if (!payment) throw new HttpError(404, 'Payment not found.');
  if (payment.payment_method !== 'bank_transfer') {
    throw new HttpError(400, 'Only bank transfer payments are confirmed manually — PayPal confirms itself.');
  }
  if (payment.status === 'paid') throw new HttpError(400, 'This payment is already marked paid.');

  await sql`
    UPDATE payments SET status = 'paid', paid_at = now(), confirmed_by_admin_id = ${auth.id}
    WHERE id = ${paymentId}
  `;
  await sql`UPDATE bookings SET status = 'active' WHERE id = ${payment.booking_id}`;

  return json({ message: 'Payment confirmed and booking activated.' });
});

export const config = { path: '/api/admin/payments/:id/confirm' };
