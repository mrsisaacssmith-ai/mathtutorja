# Math Tutor JA — Netlify Edition

Static frontend + Netlify Functions (serverless) + Netlify DB (Postgres) + PayPal + bank transfer.

## Why this version is different from the earlier Node/Express build

Netlify doesn't run a persistent server or a local SQLite file, so this version
uses:
- **Netlify Functions** (in `netlify/functions/`) instead of an Express server — each file is one API route.
- **Netlify DB** (managed Postgres, powered by Neon) instead of SQLite.
- **PayPal Orders API** instead of WiPay — see the currency note below.
- **Bank transfer** as a second, manually-confirmed payment option.

## 1. Push this to a Git repo

Netlify deploys from Git (GitHub/GitLab/Bitbucket). Create a repo, push this
whole folder to it, then in your Netlify team (**mrs-isaacs-smith**) click
**Add new project → Import an existing project** and pick the repo. Build
settings are already in `netlify.toml` — you shouldn't need to change anything.

## 2. Add Netlify DB

In your new site: **Project configuration → Environment → Databases** (or run
`netlify db init` in the project locally with the Netlify CLI). This
provisions a Postgres database and automatically sets `NETLIFY_DATABASE_URL`
for your functions — no connection string to copy/paste.

## 3. Set environment variables

**Project configuration → Environment variables**, add:

| Variable | Value |
|---|---|
| `JWT_SECRET` | any long random string |
| `FRONTEND_URL` | your live site URL, e.g. `https://mathtutorja.netlify.app` |
| `TERM_START` / `TERM_END` | current term dates |
| `SETUP_SECRET` | a one-time password you invent, used only for step 4 below |
| `PAYPAL_CLIENT_ID` / `PAYPAL_CLIENT_SECRET` | from your [PayPal Developer Dashboard](https://developer.paypal.com/dashboard/applications) → your app |
| `PAYPAL_ENVIRONMENT` | `sandbox` while testing, `live` when ready for real payments |
| `PAYPAL_RETURN_URL` | `https://YOUR-SITE.netlify.app/api/payments/capture` |
| `PAYPAL_CANCEL_URL` | `https://YOUR-SITE.netlify.app/api/payments/cancel` |
| `PRICE_ONE_ON_ONE_USD` | USD price per one-on-one session (see currency note) |
| `PRICE_GROUP_USD` | USD price per CSEC group session |
| `BANK_NAME`, `BANK_ACCOUNT_NAME`, `BANK_ACCOUNT_NUMBER`, `BANK_ACCOUNT_TYPE`, `BANK_BRANCH`, `BANK_REFERENCE_NOTE` | already defaulted to your NCB details in code — override here if they ever change |

### ⚠️ Currency note — important

**PayPal does not support JMD.** Its supported currencies are USD, EUR, GBP,
CAD, and a short list of others — JMD isn't one of them. That means:
- **PayPal checkout charges in USD.** Set `PRICE_ONE_ON_ONE_USD` /
  `PRICE_GROUP_USD` to whatever USD amount you're comfortable with for your
  J$4,000 / J$2,000 sessions — I used $25 / $13 as placeholders based on a
  rough exchange rate, but you should set the real numbers you want to charge.
- **Bank transfer stays in JMD** (the amount shown is the USD figure, but the
  transfer itself happens in Jamaican dollars at NCB — there's no currency
  conversion for that path).

## 4. Deploy, then run one-time setup

After the first deploy, call the setup endpoint once to create your database
tables and your admin login:

```bash
curl -X POST https://YOUR-SITE.netlify.app/api/setup/init \
  -H "X-Setup-Secret: YOUR_SETUP_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"admin_email":"you@email.com","admin_password":"a-strong-password","admin_name":"Your Name"}'
```

This is safe to call again later (e.g. to promote another email to admin) —
just don't leave `SETUP_SECRET` guessable, and consider rotating it after
initial setup.

## How the two payment methods work

**PayPal:**
1. `POST /api/bookings` (or `/api/payments/renew`) creates the booking/payment row and asks PayPal for a checkout URL.
2. Browser redirects to PayPal; the student logs in and approves.
3. PayPal redirects to `/api/payments/capture`, which captures the charge and flips the booking to `active`.

**Bank transfer:**
1. Same booking/payment row is created, but with `status = 'awaiting_confirmation'` and no PayPal call.
2. The student sees your NCB details on screen and transfers manually.
3. You confirm it in the **Payments** tab of the admin dashboard — that flips the payment to `paid` and the booking to `active`.

Both hold the slot as `pending_payment` until confirmed, so it still counts against that slot's capacity while you wait — cancel it manually from the admin dashboard if someone never pays.

## Local development

```bash
npm install
netlify link      # connect this folder to your Netlify site
netlify dev       # runs the static site + functions together, with real env vars pulled in
```

## API summary

Same routes as before, now served from Netlify Functions:

| Route | Auth | Purpose |
|---|---|---|
| `POST /api/auth/signup` / `/api/auth/login` / `GET /api/auth/me` | — / — / student | Accounts |
| `GET /api/slots` | — | Weekly schedule + live availability (JMD + USD) |
| `POST /api/bookings` | student | Reserve a slot, sign waiver, choose PayPal or bank transfer |
| `GET /api/bookings/mine` | student | My bookings |
| `PATCH /api/bookings/:id/cancel` | student | Cancel |
| `GET /api/payments/capture` / `GET /api/payments/cancel` | — (PayPal) | PayPal return/cancel redirects |
| `GET /api/payments/mine` | student | My payment history |
| `POST /api/payments/renew` | student | Pay for next month |
| `GET /api/materials` | student | Materials for my grade |
| `GET /api/admin/overview` / `bookings` / `payments` | admin | Dashboards |
| `PATCH /api/admin/bookings/:id` | admin | Set Zoom link / status |
| `PATCH /api/admin/payments/:id/confirm` | admin | Confirm a bank transfer |
| `GET/POST /api/admin/materials`, `DELETE /api/admin/materials/:id` | admin | Materials library |
| `POST /api/setup/init` | setup secret | One-time schema + admin creation |

## What I couldn't verify from here

I don't have a way to actually deploy or hit live PayPal/Netlify DB endpoints
from this environment, so this hasn't been tested against a real deploy. The
code follows PayPal's and Netlify's current documented APIs closely, but
budget time for a first real test pass — especially the PayPal sandbox
checkout round-trip and the `:id` path-parameter routes — and tell me what
error (if any) comes back so I can fix it quickly.
