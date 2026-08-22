import bcrypt from 'bcryptjs';
import { sql } from './_shared/db.mjs';
import { json, readJson, withErrorHandling, HttpError } from './_shared/http.mjs';
import { signToken } from './_shared/auth.mjs';

export default withErrorHandling(async (req) => {
  if (req.method !== 'POST') throw new HttpError(405, 'Method not allowed.');

  const { email, password } = await readJson(req);
  if (!email || !password) throw new HttpError(400, 'Email and password are required.');

  const [user] = await sql`SELECT * FROM users WHERE email = ${email.toLowerCase()}`;
  if (!user) throw new HttpError(401, 'Incorrect email or password.');

  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) throw new HttpError(401, 'Incorrect email or password.');

  const { password_hash: _, ...publicUser } = user;
  return json({ token: signToken(user), user: publicUser });
});

export const config = { path: '/api/auth/login' };
