import { sql } from './_shared/db.mjs';
import { json, readJson, withErrorHandling, HttpError } from './_shared/http.mjs';
import { requireAuth } from './_shared/auth.mjs';
import { createOrder } from './_shared/paypal.mjs';
import { getBankDetails } from './_shared/bank.mjs';

export default withErrorHandling(async (req) => {
  if (req.method !== 'POST') throw new HttpError(405, 'Method not allowed.');
  const auth = requireAuth(req);

  const { booking_id, payment_method } = await readJson(req);
  if (!['paypal', 'bank_transfer'].includes(payment_method)) {
    throw new HttpError(400, 'Choose a payment method: paypal or bank_transfer.');
  }

  const [booking] = await sql`SELECT * FROM bookings WHERE id = ${booking_id} AND user_id = ${auth.id}`;
  if (!booking || booking.status !== 'active') throw new HttpError(400, 'This booking is not active.');

  const [slot] = await sql`SELECT * FROM slots WHERE id = ${booking.slot_id}`;
  const billingMonth = new Date().toISOString().slice(0, 7);
  const amountUsd = Number(slot.price_usd);

  const [existingPaid] = await sql`
    SELECT id FROM payments WHERE booking_id = ${booking.id} AND billing_month = ${billingMonth} AND status = 'paid'
  `;
  if (existingPaid) throw new HttpError(400, 'This month is already paid.');

  if (payment_method === 'bank_transfer') {
    const [payment] = await sql`
      INSERT INTO payments (booking_id, billing_month, amount_usd, payment_method, status)
      VALUES (${booking.id}, ${billingMonth}, ${amountUsd}, 'bank_transfer', 'awaiting_confirmation')
      RETURNING *
    `;
    return json({ payment_id: payment.id, payment_method: 'bank_transfer', bank_details: getBankDetails(), amount_usd: amountUsd });
  }

  const [payment] = await sql`
    INSERT INTO payments (booking_id, billing_month, amount_usd, payment_method, status)
    VALUES (${booking.id}, ${billingMonth}, ${amountUsd}, 'paypal', 'pending')
    RETURNING *
  `;
  const { orderId, approveUrl } = await createOrder({
    referenceId: `pay-${payment.id}`,
    amountUsd,
    description: `Math Tutor JA — ${slot.label} (${billingMonth})`,
  });
  await sql`UPDATE payments SET paypal_order_id = ${orderId} WHERE id = ${payment.id}`;

  return json({ payment_id: payment.id, payment_method: 'paypal', checkout_url: approveUrl });
});

export const config = { path: '/api/payments/renew' };
