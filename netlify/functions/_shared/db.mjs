// Netlify DB — fully managed Postgres (powered by Neon), built into Netlify.
// `neon()` automatically reads the NETLIFY_DATABASE_URL env var that Netlify
// sets for you once you run `netlify db init` (or add a database from the dashboard).
import { neon } from '@netlify/neon';

export const sql = neon();

// One-time schema setup. Safe to call more than once (IF NOT EXISTS / ON CONFLICT).
export async function ensureSchema() {
  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      role TEXT NOT NULL DEFAULT 'student',
      student_name TEXT NOT NULL,
      grade_level TEXT,
      parent_name TEXT,
      phone TEXT,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS slots (
      id INTEGER PRIMARY KEY,
      day_of_week TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      mode TEXT NOT NULL,
      class_type TEXT NOT NULL,
      label TEXT NOT NULL,
      capacity INTEGER NOT NULL DEFAULT 1,
      price_jmd INTEGER NOT NULL,
      price_usd NUMERIC(10,2) NOT NULL
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS bookings (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id),
      slot_id INTEGER NOT NULL REFERENCES slots(id),
      status TEXT NOT NULL DEFAULT 'pending_payment',
      zoom_link TEXT,
      term_start DATE,
      term_end DATE,
      waiver_signed_at TIMESTAMPTZ,
      waiver_signature_name TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS payments (
      id SERIAL PRIMARY KEY,
      booking_id INTEGER NOT NULL REFERENCES bookings(id),
      billing_month TEXT NOT NULL,
      amount_usd NUMERIC(10,2) NOT NULL,
      payment_method TEXT NOT NULL DEFAULT 'paypal',
      status TEXT NOT NULL DEFAULT 'pending',
      paypal_order_id TEXT UNIQUE,
      paypal_capture_id TEXT,
      transfer_reference TEXT,
      confirmed_by_admin_id INTEGER REFERENCES users(id),
      paid_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS materials (
      id SERIAL PRIMARY KEY,
      grade_level TEXT NOT NULL,
      title TEXT NOT NULL,
      file_type TEXT NOT NULL,
      file_url TEXT NOT NULL,
      uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;

  // Seed the fixed weekly schedule. USD prices come from env so you control
  // the exact conversion — PayPal does not support JMD as a checkout currency.
    const oneOnOneUsd = Number(process.env.PRICE_ONE_ON_ONE_USD);
   const groupUsd = Number(process.env.PRICE_GROUP_USD);

  const slots = [
    [1, 'Monday', '16:00', '18:00', 'online', 'one_on_one', 'Monday 4-6pm (Online)', 1, 4000, oneOnOneUsd],
    [2, 'Tuesday', '16:00', '18:00', 'online', 'one_on_one', 'Tuesday 4-6pm (Online)', 1, 4000, oneOnOneUsd],
    [3, 'Wednesday', '16:00', '18:00', 'online', 'one_on_one', 'Wednesday 4-6pm (Online)', 1, 4000, oneOnOneUsd],
    [4, 'Thursday', '16:00', '18:00', 'online', 'one_on_one', 'Thursday 4-6pm (Online)', 1, 4000, oneOnOneUsd],
    [5, 'Friday', '16:00', '18:00', 'online', 'one_on_one', 'Friday 4-6pm (Online)', 1, 4000, oneOnOneUsd],
    [6, 'Saturday', '09:00', '10:00', 'face_to_face', 'one_on_one', 'Saturday 9-10am (Face to face)', 1, 4000, oneOnOneUsd],
    [7, 'Saturday', '10:00', '12:00', 'face_to_face', 'one_on_one', 'Saturday 10am-12pm (Face to face)', 1, 4000, oneOnOneUsd],
    [8, 'Saturday', '13:00', '15:00', 'face_to_face', 'one_on_one', 'Saturday 1-3pm (Face to face)', 1, 4000, oneOnOneUsd],
    [9, 'Saturday', '15:00', '17:00', 'face_to_face', 'group', 'Saturday 3-5pm (CSEC Group)', 8, 2000, groupUsd],
  ];

  for (const s of slots) {
    await sql`
      INSERT INTO slots (id, day_of_week, start_time, end_time, mode, class_type, label, capacity, price_jmd, price_usd)
      VALUES (${s[0]}, ${s[1]}, ${s[2]}, ${s[3]}, ${s[4]}, ${s[5]}, ${s[6]}, ${s[7]}, ${s[8]}, ${s[9]})
      ON CONFLICT (id) DO UPDATE SET price_usd = EXCLUDED.price_usd, price_jmd = EXCLUDED.price_jmd
    `;
  }
}
