import { sql } from './_shared/db.mjs';
import { json, withErrorHandling, HttpError } from './_shared/http.mjs';
import { requireAuth } from './_shared/auth.mjs';

export default withErrorHandling(async (req) => {
  if (req.method !== 'GET') throw new HttpError(405, 'Method not allowed.');
  const auth = requireAuth(req);

  const [user] = await sql`SELECT * FROM users WHERE id = ${auth.id}`;
  if (!user) throw new HttpError(404, 'User not found.');

  const { password_hash: _, ...publicUser } = user;
  return json({ user: publicUser });
});

export const config = { path: '/api/auth/me' };
