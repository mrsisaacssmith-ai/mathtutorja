// Bank transfer details shown to students who choose that payment method.
// Overridable via Netlify env vars so these can change without a code deploy.
export function getBankDetails() {
  return {
    bank_name: process.env.BANK_NAME || 'National Commercial Bank (NCB)',
    account_name: process.env.BANK_ACCOUNT_NAME || 'Ashley Isaacs',
    account_number: process.env.BANK_ACCOUNT_NUMBER || '334283232',
    account_type: process.env.BANK_ACCOUNT_TYPE || 'Savings Account',
    branch: process.env.BANK_BRANCH || 'Manor Park / Constant Spring',
    reference_note: process.env.BANK_REFERENCE_NOTE || "Use your child's full name as the transfer reference.",
  };
}
