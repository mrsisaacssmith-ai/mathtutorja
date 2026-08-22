import { sql } from './_shared/db.mjs';
import { json, withErrorHandling, HttpError } from './_shared/http.mjs';

export default withErrorHandling(async (req) => {
  if (req.method !== 'GET') throw new HttpError(405, 'Method not allowed.');

  const slots = await sql`SELECT * FROM slots ORDER BY id`;
  const counts = await sql`
    SELECT slot_id, COUNT(*)::int AS taken FROM bookings
    WHERE status IN ('active', 'pending_payment')
    GROUP BY slot_id
  `;
  const takenBySlot = Object.fromEntries(counts.map((c) => [c.slot_id, c.taken]));

  const withAvailability = slots.map((slot) => {
    const taken = takenBySlot[slot.id] || 0;
    return {
      ...slot,
      price: slot.price_jmd, // kept for display; charging happens in USD (price_usd)
      seats_taken: taken,
      seats_available: Math.max(slot.capacity - taken, 0),
      is_full: taken >= slot.capacity,
    };
  });

  return json({ slots: withAvailability });
});

export const config = { path: '/api/slots' };
