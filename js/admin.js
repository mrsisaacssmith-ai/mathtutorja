document.addEventListener('DOMContentLoaded', async () => {
  if (!requireLogin('login.html')) return;
  const user = Auth.getUser();
  if (user?.role !== 'admin') {
    window.location.href = 'portal.html';
    return;
  }

  // Bookings / Payments pill-tab toggle
  document.querySelectorAll('[data-tabs]').forEach((group) => {
    const buttons = group.querySelectorAll('.pill-nav button');
    const panels = document.querySelectorAll(`[data-panel-group="${group.dataset.tabs}"]`);
    buttons.forEach((btn) => {
      btn.addEventListener('click', () => {
        buttons.forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        panels.forEach((p) => { p.style.display = p.dataset.panel === btn.dataset.tab ? '' : 'none'; });
      });
    });
  });

  try {
    const [{ activeStudents, revenueThisMonth, openSeats, overduePayments }, { bookings }, { payments }] = await Promise.all([
      apiFetch('/admin/overview', { auth: true }),
      apiFetch('/admin/bookings', { auth: true }),
      apiFetch('/admin/payments', { auth: true }),
    ]);

    renderStats({ activeStudents, revenueThisMonth, openSeats, overduePayments });
    renderBookings(bookings);
    renderPayments(payments);
  } catch (err) {
    document.getElementById('bookingsBody').innerHTML = `<tr><td colspan="6" style="color:#b13a3a;">${err.message}</td></tr>`;
  }
});

function renderStats(s) {
  const nums = document.querySelectorAll('#statRow .num');
  nums[0].textContent = s.activeStudents;
  nums[1].textContent = `$${s.revenueThisMonth.toLocaleString()}`;
  nums[2].textContent = s.openSeats;
  nums[3].textContent = s.overduePayments;
}

function statusTagHTML(status) {
  const map = { active: 'tag-paid', pending_payment: 'tag-pending', cancelled: 'tag-overdue' };
  const label = { active: 'Active', pending_payment: 'Awaiting payment', cancelled: 'Cancelled' };
  return `<span class="tag ${map[status] || 'tag-pending'}">${label[status] || status}</span>`;
}

function renderBookings(bookings) {
  const body = document.getElementById('bookingsBody');
  if (bookings.length === 0) {
    body.innerHTML = `<tr><td colspan="6" style="color:var(--slate);">No bookings yet.</td></tr>`;
    return;
  }
  body.innerHTML = bookings.map((b) => `
    <tr>
      <td>${b.student_name}<br><span style="color:var(--slate); font-size:0.78rem;">${b.email}</span></td>
      <td>${b.grade_level || '—'}</td>
      <td>${b.label}</td>
      <td>${b.class_type === 'group' ? 'Group' : '1-on-1'} ${b.mode === 'online' ? 'online' : 'f2f'}</td>
      <td>
        ${b.mode === 'online' ? `
          <input type="text" placeholder="Paste Zoom link" value="${b.zoom_link || ''}"
                 style="width:150px; padding:6px 8px; border:1px solid var(--board-grey); border-radius:6px; font-size:0.8rem;"
                 onblur="setZoomLink(${b.id}, this.value)">
        ` : '—'}
      </td>
      <td>${statusTagHTML(b.status)}</td>
    </tr>`).join('');
}

function renderPayments(payments) {
  const body = document.getElementById('paymentsBody');
  if (payments.length === 0) {
    body.innerHTML = `<tr><td colspan="6" style="color:var(--slate);">No payments yet.</td></tr>`;
    return;
  }
  const map = { paid: 'tag-paid', pending: 'tag-pending', awaiting_confirmation: 'tag-pending', failed: 'tag-overdue' };
  body.innerHTML = payments.map((p) => `
    <tr>
      <td>${p.student_name}</td>
      <td>${p.label}</td>
      <td>${p.billing_month}</td>
      <td>$${Number(p.amount_usd).toFixed(2)}</td>
      <td>${p.payment_method === 'bank_transfer' ? 'Bank transfer' : 'PayPal'}</td>
      <td>
        <span class="tag ${map[p.status] || 'tag-pending'}">${p.status.replace('_', ' ')}</span>
        ${p.payment_method === 'bank_transfer' && p.status === 'awaiting_confirmation'
          ? `<button class="btn btn-primary btn-sm" style="margin-left:8px;" onclick="confirmTransfer(${p.id}, this)">Confirm</button>`
          : ''}
      </td>
    </tr>`).join('');
}

async function confirmTransfer(paymentId, btn) {
  btn.disabled = true;
  btn.textContent = 'Confirming…';
  try {
    await apiFetch(`/admin/payments/${paymentId}/confirm`, { method: 'PATCH', auth: true });
    btn.closest('tr').querySelector('.tag').textContent = 'paid';
    btn.remove();
  } catch (err) {
    alert(err.message);
    btn.disabled = false;
    btn.textContent = 'Confirm';
  }
}

async function setZoomLink(bookingId, zoomLink) {
  try {
    await apiFetch(`/admin/bookings/${bookingId}`, { method: 'PATCH', auth: true, body: { zoom_link: zoomLink } });
  } catch (err) {
    alert('Could not save Zoom link: ' + err.message);
  }
}
