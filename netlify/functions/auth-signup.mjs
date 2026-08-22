import bcrypt from 'bcryptjs';
import { sql } from './_shared/db.mjs';
import { json, readJson, withErrorHandling, HttpError } from './_shared/http.mjs';
import { signToken } from './_shared/auth.mjs';

export default withErrorHandling(async (req) => {
  if (req.method !== 'POST') throw new HttpError(405, 'Method not allowed.');

  const { student_name, grade_level, parent_name, phone, email, password } = await readJson(req);

  if (!student_name || !email || !password || !phone) {
    throw new HttpError(400, 'Student name, phone, email, and password are required.');
  }
  if (password.length < 8) throw new HttpError(400, 'Password must be at least 8 characters.');

  const emailLower = email.toLowerCase();
  const [existing] = await sql`SELECT id FROM users WHERE email = ${emailLower}`;
  if (existing) throw new HttpError(409, 'An account with this email already exists. Try logging in instead.');

  const password_hash = await bcrypt.hash(password, 10);
  const [user] = await sql`
    INSERT INTO users (role, student_name, grade_level, parent_name, phone, email, password_hash)
    VALUES ('student', ${student_name}, ${grade_level || null}, ${parent_name || null}, ${phone}, ${emailLower}, ${password_hash})
    RETURNING *
  `;

  const { password_hash: _, ...publicUser } = user;
  return json({ token: signToken(user), user: publicUser }, 201);
});

export const config = { path: '/api/auth/signup' };
