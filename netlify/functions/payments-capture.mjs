import { sql } from './_shared/db.mjs';
import { redirect, withErrorHandling } from './_shared/http.mjs';
import { captureOrder } from './_shared/paypal.mjs';

const FRONTEND_URL = process.env.FRONTEND_URL || '';

export default withErrorHandling(async (req) => {
  const url = new URL(req.url);
  const paypalOrderId = url.searchParams.get('token'); // PayPal calls the order id "token" on return

  if (!paypalOrderId) {
    return redirect(`${FRONTEND_URL}/pages/payment-result.html?status=error&reason=missing_token`);
  }

  const [payment] = await sql`SELECT * FROM payments WHERE paypal_order_id = ${paypalOrderId}`;
  if (!payment) {
    return redirect(`${FRONTEND_URL}/pages/payment-result.html?status=error&reason=unknown_order`);
  }

  const result = await captureOrder(paypalOrderId);

  if (result.status === 'COMPLETED') {
    await sql`
      UPDATE payments SET status = 'paid', paypal_capture_id = ${result.captureId}, paid_at = now()
      WHERE id = ${payment.id}
    `;
    await sql`UPDATE bookings SET status = 'active' WHERE id = ${payment.booking_id}`;
    return redirect(`${FRONTEND_URL}/pages/payment-result.html?status=success&booking=${payment.booking_id}`);
  }

  await sql`UPDATE payments SET status = 'failed' WHERE id = ${payment.id}`;
  await sql`UPDATE bookings SET status = 'cancelled' WHERE id = ${payment.booking_id} AND status = 'pending_payment'`;
  return redirect(`${FRONTEND_URL}/pages/payment-result.html?status=failed&reason=${encodeURIComponent(result.message || 'declined')}`);
});

export const config = { path: '/api/payments/capture' };
