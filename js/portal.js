document.addEventListener('DOMContentLoaded', async () => {
  if (!requireLogin('login.html')) return;

  const user = Auth.getUser();
  document.getElementById('welcomeName').textContent = `Hi, ${(user?.student_name || 'there').split(' ')[0]}`;

  try {
    const [{ bookings }, { payments }, { materials }] = await Promise.all([
      apiFetch('/bookings/mine', { auth: true }),
      apiFetch('/payments/mine', { auth: true }),
      apiFetch('/materials', { auth: true }),
    ]);

    renderStatusTag(payments);
    renderBookings(bookings, payments);
    renderMaterials(materials, user?.grade_level);
  } catch (err) {
    document.getElementById('bookingCards').innerHTML =
      `<div class="card"><p style="color:#b13a3a; font-size:0.9rem;">Couldn't load your portal: ${err.message}</p></div>`;
  }
});

function renderStatusTag(payments) {
  const tag = document.getElementById('statusTag');
  const thisMonth = new Date().toISOString().slice(0, 7);
  const paidThisMonth = payments.some((p) => p.billing_month === thisMonth && p.status === 'paid');
  tag.style.display = 'inline-block';
  tag.textContent = paidThisMonth ? 'Paid — this month' : 'Payment needed this month';
  tag.className = 'tag ' + (paidThisMonth ? 'tag-paid' : 'tag-pending');
}

function renderBookings(bookings, payments) {
  const container = document.getElementById('bookingCards');
  const active = bookings.filter((b) => b.status === 'active');

  if (active.length === 0) {
    container.innerHTML = `
      <div class="card">
        <p class="eyebrow">No active class yet</p>
        <h3 style="margin:10px 0 4px;">Book your first slot</h3>
        <p style="color:var(--slate); font-size:0.9rem; margin-bottom:16px;">Pick a weekly time that works for you.</p>
        <a href="schedule.html" class="btn btn-primary btn-sm">See class times</a>
      </div>`;
    return;
  }

  const thisMonth = new Date().toISOString().slice(0, 7);

  container.innerHTML = active.map((b) => {
    const paidThisMonth = payments.some((p) => p.booking_id === b.id && p.billing_month === thisMonth && p.status === 'paid');
    return `
    <div class="card">
      <p class="eyebrow">${b.mode === 'online' ? 'Online' : 'Face to face'} · ${b.class_type === 'group' ? 'CSEC group' : 'One-on-one'}</p>
      <h3 style="margin:10px 0 4px;">${b.label}</h3>
      <p style="color:var(--slate); font-size:0.9rem; margin-bottom:16px;">Reserved through ${b.term_end || 'end of term'}.</p>
      ${b.zoom_link
        ? `<a href="${b.zoom_link}" target="_blank" rel="noopener" class="btn btn-primary btn-sm">Join Zoom link</a>`
        : (b.mode === 'online' ? `<p style="font-size:0.82rem; color:var(--slate);">Zoom link will appear here once set by your tutor.</p>` : '')}
      ${!paidThisMonth ? `<button class="btn btn-gold btn-sm" style="margin-top:10px;" onclick="payNow(${b.id}, this)">Pay for this month</button>` : ''}
    </div>`;
  }).join('');
}

function renderMaterials(materials, gradeLevel) {
  document.getElementById('materialsHeading').textContent = `Class materials${gradeLevel ? ' — ' + gradeLevel : ''}`;
  const grid = document.getElementById('materialsGrid');

  if (materials.length === 0) {
    grid.innerHTML = `<p style="color:var(--slate); font-size:0.9rem;">Nothing uploaded for your grade level yet — check back soon.</p>`;
    return;
  }

  grid.innerHTML = materials.map((m) => `
    <a href="${m.file_url}" target="_blank" rel="noopener" class="card material-card" style="text-decoration:none;">
      <div class="file-badge">${m.file_type === 'video' ? 'MP4' : 'PDF'}</div>
      <div>
        <h3 style="font-size:1rem; color:var(--ink-navy);">${m.title}</h3>
        <p style="font-size:0.85rem; color:var(--slate);">Uploaded ${new Date(m.uploaded_at).toLocaleDateString()}</p>
      </div>
    </a>`).join('');
}

async function payNow(bookingId, btn) {
  const method = window.prompt('Pay via "paypal" or "bank_transfer"?', 'paypal');
  if (!method || !['paypal', 'bank_transfer'].includes(method)) return;

  btn.disabled = true;
  btn.textContent = 'Processing…';
  try {
    const result = await apiFetch('/payments/renew', {
      method: 'POST', auth: true, body: { booking_id: bookingId, payment_method: method },
    });
    if (result.payment_method === 'bank_transfer') {
      const b = result.bank_details;
      alert(
        `Transfer $${result.amount_usd.toFixed(2)} USD equivalent to:\n\n` +
        `${b.bank_name}\n${b.account_name}\n${b.account_number} (${b.account_type})\n${b.branch}\n\n${b.reference_note}\n\n` +
        `We'll mark this month paid once the transfer is confirmed.`
      );
      btn.textContent = 'Awaiting confirmation';
    } else {
      window.location.href = result.checkout_url;
    }
  } catch (err) {
    alert(err.message);
    btn.disabled = false;
    btn.textContent = 'Pay for this month';
  }
}
