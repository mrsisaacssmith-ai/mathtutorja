// UI-only interactions for the scaffold. No backend calls yet —
// these just demonstrate the intended behavior for wiring up later.

document.addEventListener('DOMContentLoaded', () => {
  // ---- Slot selection (schedule page) ----
  const slots = document.querySelectorAll('.slot:not(.full)');
  const summaryBox = document.getElementById('bookingSummary');
  slots.forEach((slot) => {
    slot.addEventListener('click', () => {
      slots.forEach((s) => s.classList.remove('selected'));
      slot.classList.add('selected');
      if (summaryBox) {
        const day = slot.dataset.day || '';
        const time = slot.dataset.time || '';
        const mode = slot.dataset.mode || '';
        const price = slot.dataset.price || '';
        summaryBox.innerHTML = `
          <p class="eyebrow">Selected slot</p>
          <h3 style="margin:10px 0 4px;">${day}, ${time}</h3>
          <p style="color:var(--slate); margin-bottom:16px;">${mode}</p>
          <div style="display:flex; justify-content:space-between; font-family:var(--font-mono); font-size:1.1rem; margin-bottom:20px;">
            <span>Rate</span><strong>${price}</strong>
          </div>
          <a href="signup.html" class="btn btn-primary btn-block">Continue to register</a>
        `;
      }
    });
  });

  // ---- Pill tab switching (used on portal + admin pages) ----
  document.querySelectorAll('[data-tabs]').forEach((group) => {
    const buttons = group.querySelectorAll('.pill-nav button');
    const panels = document.querySelectorAll(`[data-panel-group="${group.dataset.tabs}"]`);
    buttons.forEach((btn) => {
      btn.addEventListener('click', () => {
        buttons.forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        panels.forEach((p) => {
          p.style.display = p.dataset.panel === btn.dataset.tab ? '' : 'none';
        });
      });
    });
  });

  // ---- Waiver checkbox gates the submit button (signup page) ----
  const waiver = document.getElementById('waiverCheck');
  const submitBtn = document.getElementById('signupSubmit');
  if (waiver && submitBtn) {
    submitBtn.disabled = true;
    waiver.addEventListener('change', () => {
      submitBtn.disabled = !waiver.checked;
    });
  }

  // ---- Demo forms: prevent real submission in this scaffold ----
  document.querySelectorAll('form[data-demo]').forEach((form) => {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      alert('This is a front-end scaffold — no data is submitted yet.');
    });
  });
});
