import { sql } from './_shared/db.mjs';
import { json, withErrorHandling, HttpError } from './_shared/http.mjs';
import { requireAuth, requireAdmin } from './_shared/auth.mjs';

export default withErrorHandling(async (req, context) => {
  if (req.method !== 'DELETE') throw new HttpError(405, 'Method not allowed.');
  requireAdmin(requireAuth(req));

  await sql`DELETE FROM materials WHERE id = ${context.params.id}`;
  return json({ deleted: true });
});

export const config = { path: '/api/admin/materials/:id' };
