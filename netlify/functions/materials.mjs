import { sql } from './_shared/db.mjs';
import { json, withErrorHandling, HttpError } from './_shared/http.mjs';
import { requireAuth } from './_shared/auth.mjs';

export default withErrorHandling(async (req) => {
  if (req.method !== 'GET') throw new HttpError(405, 'Method not allowed.');
  const auth = requireAuth(req);

  const [user] = await sql`SELECT grade_level FROM users WHERE id = ${auth.id}`;
  const materials = await sql`
    SELECT * FROM materials WHERE grade_level = ${user?.grade_level || ''} ORDER BY uploaded_at DESC
  `;
  return json({ materials });
});

export const config = { path: '/api/materials' };
