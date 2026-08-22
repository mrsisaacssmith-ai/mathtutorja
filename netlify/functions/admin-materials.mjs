import { sql } from './_shared/db.mjs';
import { json, readJson, withErrorHandling, HttpError } from './_shared/http.mjs';
import { requireAuth, requireAdmin } from './_shared/auth.mjs';

export default withErrorHandling(async (req) => {
  const auth = requireAuth(req);
  requireAdmin(auth);

  if (req.method === 'GET') {
    const materials = await sql`SELECT * FROM materials ORDER BY uploaded_at DESC`;
    return json({ materials });
  }

  if (req.method === 'POST') {
    const { grade_level, title, file_type, file_url } = await readJson(req);
    if (!grade_level || !title || !file_type || !file_url) {
      throw new HttpError(400, 'grade_level, title, file_type, and file_url are required.');
    }
    const [material] = await sql`
      INSERT INTO materials (grade_level, title, file_type, file_url)
      VALUES (${grade_level}, ${title}, ${file_type}, ${file_url})
      RETURNING *
    `;
    return json({ material }, 201);
  }

  throw new HttpError(405, 'Method not allowed.');
});

export const config = { path: '/api/admin/materials' };
