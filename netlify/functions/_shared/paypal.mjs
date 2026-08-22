// PayPal Orders v2 API integration (REST).
// Docs: https://developer.paypal.com/api/rest/integration/orders-api
//
// Flow used here (redirect-based, mirrors a hosted-checkout experience):
//  1. Server calls createOrder() -> PayPal returns an order id + an "approve" URL.
//  2. Browser is redirected to the approve URL; buyer logs into PayPal and approves.
//  3. PayPal redirects the browser back to PAYPAL_RETURN_URL?token=<ORDER_ID>&PayerID=...
//  4. Server calls captureOrder(orderId) to actually take the payment.
//
// IMPORTANT: PayPal does not support JMD as a checkout currency. This charges
// in USD — see PRICE_ONE_ON_ONE_USD / PRICE_GROUP_USD in db.mjs / netlify.toml.

import { HttpError } from './http.mjs';

function getConfig() {
  const {
    PAYPAL_CLIENT_ID,
    PAYPAL_CLIENT_SECRET,
    PAYPAL_ENVIRONMENT = 'sandbox', // 'sandbox' | 'live'
    PAYPAL_RETURN_URL,
    PAYPAL_CANCEL_URL,
  } = process.env;

  if (!PAYPAL_CLIENT_ID || !PAYPAL_CLIENT_SECRET || !PAYPAL_RETURN_URL || !PAYPAL_CANCEL_URL) {
    throw new HttpError(500, 'Missing PayPal env vars. Set PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET, PAYPAL_RETURN_URL, PAYPAL_CANCEL_URL.');
  }

  return {
    clientId: PAYPAL_CLIENT_ID,
    clientSecret: PAYPAL_CLIENT_SECRET,
    baseUrl: PAYPAL_ENVIRONMENT === 'live' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com',
    returnUrl: PAYPAL_RETURN_URL,
    cancelUrl: PAYPAL_CANCEL_URL,
  };
}

async function getAccessToken() {
  const cfg = getConfig();
  const basicAuth = Buffer.from(`${cfg.clientId}:${cfg.clientSecret}`).toString('base64');

  const res = await fetch(`${cfg.baseUrl}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${basicAuth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  const data = await res.json();
  if (!res.ok) throw new HttpError(502, `PayPal auth failed: ${data.error_description || data.error}`);
  return data.access_token;
}

/**
 * Creates a PayPal order and returns its id + approval URL to redirect the buyer to.
 * @param {{referenceId: string, amountUsd: number, description: string}} params
 */
export async function createOrder({ referenceId, amountUsd, description }) {
  const cfg = getConfig();
  const accessToken = await getAccessToken();

  const res = await fetch(`${cfg.baseUrl}/v2/checkout/orders`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      intent: 'CAPTURE',
      purchase_units: [{
        reference_id: referenceId,
        description,
        amount: { currency_code: 'USD', value: amountUsd.toFixed(2) },
      }],
      application_context: {
        brand_name: 'Math Tutor JA',
        user_action: 'PAY_NOW',
        return_url: cfg.returnUrl,
        cancel_url: cfg.cancelUrl,
      },
    }),
  });

  const data = await res.json();
  if (!res.ok) throw new HttpError(502, `PayPal error: ${data.message || 'could not create order'}`);

  const approveLink = data.links?.find((l) => l.rel === 'approve')?.href;
  if (!approveLink) throw new HttpError(502, 'PayPal did not return an approval link.');

  return { orderId: data.id, approveUrl: approveLink };
}

/**
 * Captures a previously-approved PayPal order.
 * @param {string} orderId
 * @returns {Promise<{status: string, captureId: string|null, amount: string|null}>}
 */
export async function captureOrder(orderId) {
  const cfg = getConfig();
  const accessToken = await getAccessToken();

  const res = await fetch(`${cfg.baseUrl}/v2/checkout/orders/${orderId}/capture`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  const data = await res.json();
  // PayPal returns 201 for a fresh capture, 200 if it was already captured (idempotent retry).
  if (!res.ok) {
    return { status: 'failed', captureId: null, amount: null, message: data.message };
  }

  const capture = data.purchase_units?.[0]?.payments?.captures?.[0];
  return {
    status: data.status, // 'COMPLETED' on success
    captureId: capture?.id || null,
    amount: capture?.amount?.value || null,
  };
}
