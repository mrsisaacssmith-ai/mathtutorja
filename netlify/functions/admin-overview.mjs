import { sql } from './_shared/db.mjs';
import { json, withErrorHandling, HttpError } from './_shared/http.mjs';
import { requireAuth, requireAdmin } from './_shared/auth.mjs';

export default withErrorHandling(async (req) => {
  if (req.method !== 'GET') throw new HttpError(405, 'Method not allowed.');
  requireAdmin(requireAuth(req));

  const [{ activeStudents }] = await sql`
    SELECT COUNT(DISTINCT user_id)::int AS "activeStudents" FROM bookings WHERE status = 'active'
  `;
  const billingMonth = new Date().toISOString().slice(0, 7);
  const [{ revenueUsdThisMonth }] = await sql`
    SELECT COALESCE(SUM(amount_usd), 0)::float AS "revenueUsdThisMonth"
    FROM payments WHERE status = 'paid' AND billing_month = ${billingMonth}
  `;
  const [{ totalCapacity }] = await sql`SELECT COALESCE(SUM(capacity), 0)::int AS "totalCapacity" FROM slots`;
  const [{ heldSeats }] = await sql`
    SELECT COUNT(*)::int AS "heldSeats" FROM bookings WHERE status IN ('active','pending_payment')
  `;
  const [{ paymentsNeedingAttention }] = await sql`
    SELECT COUNT(*)::int AS "paymentsNeedingAttention" FROM payments WHERE status IN ('failed','awaiting_confirmation')
  `;

  return json({
    activeStudents,
    revenueThisMonth: revenueUsdThisMonth,
    openSeats: Math.max(totalCapacity - heldSeats, 0),
    overduePayments: paymentsNeedingAttention,
  });
});

export const config = { path: '/api/admin/overview' };
