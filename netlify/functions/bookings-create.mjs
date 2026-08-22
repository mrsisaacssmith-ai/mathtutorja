import { sql } from './_shared/db.mjs';
import { json, readJson, withErrorHandling, HttpError } from './_shared/http.mjs';
import { requireAuth } from './_shared/auth.mjs';
import { createOrder } from './_shared/paypal.mjs';
import { getBankDetails } from './_shared/bank.mjs';

const TERM_START = process.env.TERM_START;
const TERM_END = process.env.TERM_END;

export default withErrorHandling(async (req) => {
  if (req.method !== 'POST') throw new HttpError(405, 'Method not allowed.');
  const auth = requireAuth(req);

  const { slot_id, waiver_agreed, waiver_signature_name, payment_method } = await readJson(req);

  if (!slot_id || !waiver_agreed || !waiver_signature_name) {
    throw new HttpError(400, 'A slot, signed waiver, and signature name are required.');
  }
  if (!['paypal', 'bank_transfer'].includes(payment_method)) {
    throw new HttpError(400, 'Choose a payment method: paypal or bank_transfer.');
  }

  const [slot] = await sql`SELECT * FROM slots WHERE id = ${slot_id}`;
  if (!slot) throw new HttpError(404, 'That class slot does not exist.');

  const [already] = await sql`
    SELECT id FROM bookings WHERE user_id = ${auth.id} AND slot_id = ${slot_id}
    AND status IN ('active','pending_payment')
  `;
  if (already) throw new HttpError(409, 'You already have a booking for this slot.');

  // Capacity check + insert. Postgres runs each statement transactionally per
  // connection here; the count-then-insert is safe in practice at this scale,
  // and a unique partial index could be added later for extra-strict locking.
  const [{ taken }] = await sql`
    SELECT COUNT(*)::int AS taken FROM bookings
    WHERE slot_id = ${slot_id} AND status IN ('active', 'pending_payment')
  `;
  if (taken >= slot.capacity) {
    throw new HttpError(409, 'That slot just filled up. Please choose another time.');
  }

  const [booking] = await sql`
    INSERT INTO bookings (user_id, slot_id, status, term_start, term_end, waiver_signed_at, waiver_signature_name)
    VALUES (${auth.id}, ${slot_id}, 'pending_payment', ${TERM_START}, ${TERM_END}, now(), ${waiver_signature_name})
    RETURNING *
  `;

  const billingMonth = new Date().toISOString().slice(0, 7);
  const amountUsd = Number(slot.price_usd);

  if (payment_method === 'bank_transfer') {
    const [payment] = await sql`
      INSERT INTO payments (booking_id, billing_month, amount_usd, payment_method, status)
      VALUES (${booking.id}, ${billingMonth}, ${amountUsd}, 'bank_transfer', 'awaiting_confirmation')
      RETURNING *
    `;
    return json({
      booking,
      payment_id: payment.id,
      payment_method: 'bank_transfer',
      bank_details: getBankDetails(),
      amount_usd: amountUsd,
    }, 201);
  }

  // PayPal path
  const [payment] = await sql`
    INSERT INTO payments (booking_id, billing_month, amount_usd, payment_method, status)
    VALUES (${booking.id}, ${billingMonth}, ${amountUsd}, 'paypal', 'pending')
    RETURNING *
  `;

  try {
    const { orderId, approveUrl } = await createOrder({
      referenceId: `pay-${payment.id}`,
      amountUsd,
      description: `Math Tutor JA — ${slot.label}`,
    });
    await sql`UPDATE payments SET paypal_order_id = ${orderId} WHERE id = ${payment.id}`;
    return json({ booking, payment_id: payment.id, payment_method: 'paypal', checkout_url: approveUrl }, 201);
  } catch (err) {
    return json({
      error: 'Your slot is reserved for now, but we could not reach PayPal. Please try payment again from your portal.',
      booking,
      payment_id: payment.id,
      detail: err.message,
    }, 502);
  }
});

export const config = { path: '/api/bookings' };
