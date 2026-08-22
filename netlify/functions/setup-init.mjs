// One-time setup endpoint. Call this once after deploying (see README), then
// consider removing it or rotating SETUP_SECRET so it can't be called again.
import bcrypt from 'bcryptjs';
import { sql, ensureSchema } from './_shared/db.mjs';
import { json, readJson, withErrorHandling, HttpError } from './_shared/http.mjs';

export default withErrorHandling(async (req) => {
  if (req.method !== 'POST') throw new HttpError(405, 'Method not allowed.');

  const setupSecret = process.env.SETUP_SECRET;
  if (!setupSecret) throw new HttpError(500, 'SETUP_SECRET is not configured on the server.');

  const providedSecret = req.headers.get('x-setup-secret');
  if (providedSecret !== setupSecret) throw new HttpError(401, 'Invalid setup secret.');

  await ensureSchema();

  const { admin_email, admin_password, admin_name } = await readJson(req).catch(() => ({}));
  let adminCreated = false;

  if (admin_email && admin_password) {
    const emailLower = admin_email.toLowerCase();
    const [existing] = await sql`SELECT id FROM users WHERE email = ${emailLower}`;
    if (existing) {
      await sql`UPDATE users SET role = 'admin' WHERE id = ${existing.id}`;
    } else {
      const password_hash = await bcrypt.hash(admin_password, 10);
      await sql`
        INSERT INTO users (role, student_name, email, password_hash, phone)
        VALUES ('admin', ${admin_name || 'Admin'}, ${emailLower}, ${password_hash}, '0000000000')
      `;
    }
    adminCreated = true;
  }

  return json({ message: 'Schema ready.', adminCreated });
});

export const config = { path: '/api/setup/init' };
