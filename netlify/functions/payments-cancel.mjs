import { sql } from './_shared/db.mjs';
import { redirect, withErrorHandling } from './_shared/http.mjs';

const FRONTEND_URL = process.env.FRONTEND_URL || '';

export default withErrorHandling(async (req) => {
  const url = new URL(req.url);
  const paypalOrderId = url.searchParams.get('token');

  if (paypalOrderId) {
    const [payment] = await sql`SELECT * FROM payments WHERE paypal_order_id = ${paypalOrderId}`;
    if (payment && payment.status === 'pending') {
      await sql`UPDATE payments SET status = 'failed' WHERE id = ${payment.id}`;
      await sql`UPDATE bookings SET status = 'cancelled' WHERE id = ${payment.booking_id} AND status = 'pending_payment'`;
    }
  }

  return redirect(`${FRONTEND_URL}/pages/payment-result.html?status=failed&reason=${encodeURIComponent('Checkout was cancelled.')}`);
});

export const config = { path: '/api/payments/cancel' };
