// Bank transfer details shown to students who choose that payment method.
// Overridable via Netlify env vars so these can change without a code deploy.
export function getBankDetails() {
  return {
      bank_name: process.env.BANK_NAME,
   account_name: process.env.BANK_ACCOUNT_NAME,
   account_number: process.env.BANK_ACCOUNT_NUMBER,
   account_type: process.env.BANK_ACCOUNT_TYPE,
   branch: process.env.BANK_BRANCH,
   reference_note: process.env.BANK_REFERENCE_NOTE,
  };
}
