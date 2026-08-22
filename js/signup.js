document.addEventListener('DOMContentLoaded', async () => {
  const slotSummary = document.getElementById('slotSummary');
  const waiverCheck = document.getElementById('waiverCheck');
  const submitBtn = document.getElementById('signupSubmit');
  const errorBox = document.getElementById('formError');
  const form = document.getElementById('signupForm');

  let slot = null;
  try { slot = JSON.parse(localStorage.getItem('mtja_selected_slot') || 'null'); } catch {}

  // Fill in live USD/JMD prices in the order summary from the real schedule.
  try {
    const { slots } = await apiFetch('/slots');
    const oneOnOne = slots.find((s) => s.class_type === 'one_on_one');
    const group = slots.find((s) => s.class_type === 'group');
    if (oneOnOne) document.getElementById('priceOneOnOne').textContent = `$${oneOnOne.price_usd} USD / J$${oneOnOne.price_jmd.toLocaleString()}`;
    if (group) document.getElementById('priceGroup').textContent = `$${group.price_usd} USD / J$${group.price_jmd.toLocaleString()}`;
  } catch {}

  function updateSubmitState() {
    submitBtn.disabled = !(slot && waiverCheck.checked);
  }

  if (slot) {
    slotSummary.innerHTML = `
      <p class="eyebrow">Selected slot</p>
      <h3 style="margin:8px 0 2px;">${slot.day}, ${slot.time}</h3>
      <p style="color:var(--slate); font-size:0.9rem;">${slot.mode}</p>
      <a href="schedule.html" style="color:var(--forest); font-weight:600; font-size:0.85rem;">Change slot</a>
    `;
  }

  waiverCheck.addEventListener('change', updateSubmitState);
  updateSubmitState();

  function showError(msg) {
    errorBox.textContent = msg;
    errorBox.style.display = 'block';
  }

  function showBankTransferInstructions(result) {
    const b = result.bank_details;
    document.getElementById('signupForm').style.display = 'none';
    document.getElementById('orderSummary').innerHTML = `
      <p class="eyebrow">One more step</p>
      <h3 style="margin:10px 0 4px;">Complete your bank transfer</h3>
      <p style="color:var(--slate); font-size:0.9rem; margin-bottom:18px;">
        Your slot is held for now. Transfer <strong>$${result.amount_usd.toFixed(2)} USD equivalent</strong> to the account below,
        then we'll confirm it and activate your booking.
      </p>
      <div style="background:var(--board-grey); border-radius:10px; padding:16px; font-size:0.9rem; line-height:1.8;">
        <div><strong>Bank:</strong> ${b.bank_name}</div>
        <div><strong>Account name:</strong> ${b.account_name}</div>
        <div><strong>Account number:</strong> ${b.account_number}</div>
        <div><strong>Account type:</strong> ${b.account_type}</div>
        <div><strong>Branch:</strong> ${b.branch}</div>
      </div>
      <p style="color:var(--slate); font-size:0.85rem; margin-top:14px;">${b.reference_note}</p>
      <a href="portal.html" class="btn btn-primary btn-block" style="margin-top:20px;">Go to my portal</a>
    `;
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorBox.style.display = 'none';

    if (!slot) return showError('Please choose a class slot first.');

    const student_name = document.getElementById('sname').value.trim();
    const grade_level = document.getElementById('sgrade').value;
    const parent_name = document.getElementById('pname').value.trim();
    const phone = document.getElementById('pphone').value.trim();
    const email = document.getElementById('pemail').value.trim();
    const password = document.getElementById('ppass').value;
    const waiver_signature_name = document.getElementById('waiverSig').value.trim();
    const payment_method = document.querySelector('input[name="paymentMethod"]:checked').value;

    if (!student_name || !grade_level || !parent_name || !phone || !email || !password || !waiver_signature_name) {
      return showError('Please fill in every field.');
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Setting up your account…';

    try {
      const { token, user } = await apiFetch('/auth/signup', {
        method: 'POST',
        body: { student_name, grade_level, parent_name, phone, email, password },
      });
      Auth.setSession(token, user);

      submitBtn.textContent = 'Reserving your slot…';
      const result = await apiFetch('/bookings', {
        method: 'POST',
        auth: true,
        body: { slot_id: slot.id, waiver_agreed: true, waiver_signature_name, payment_method },
      });

      localStorage.removeItem('mtja_selected_slot');

      if (result.payment_method === 'bank_transfer') {
        showBankTransferInstructions(result);
      } else if (result.checkout_url) {
        window.location.href = result.checkout_url;
      } else {
        showError(result.error || 'Your slot is reserved, but payment could not start. Please try again from your portal.');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Continue';
      }
    } catch (err) {
      showError(err.message);
      submitBtn.disabled = false;
      submitBtn.textContent = 'Continue';
    }
  });
});
