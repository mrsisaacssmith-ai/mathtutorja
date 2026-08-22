// Fetches the real schedule from the API and renders it. Selecting a slot
// stores it for the signup page to pick up (via localStorage) and shows a
// live summary card.

let SELECTED_SLOT = null;

function renderSlotCard(slot) {
  const full = slot.is_full;
  const groupNote = slot.class_type === 'group'
    ? `<div class="slot-mode">${full ? 'Full' : slot.seats_available + ' of ' + slot.capacity + ' seats left'}</div>`
    : `<div class="slot-mode">${slot.mode === 'online' ? 'Online' : 'Face to face'} · ${full ? 'Booked' : '1-on-1'}</div>`;

  return `
    <div class="slot ${slot.class_type === 'group' ? 'group' : ''} ${full ? 'full' : ''}"
         data-slot-id="${slot.id}"
         data-day="${slot.day_of_week}"
         data-time="${formatTime(slot.start_time)}–${formatTime(slot.end_time)}"
         data-mode="${slot.mode === 'online' ? 'Online' : 'Face to face'} · ${slot.class_type === 'group' ? 'CSEC Group' : 'One-on-one'}"
         data-price="J$${slot.price.toLocaleString()} (~$${slot.price_usd} USD)"
         ${full ? 'aria-disabled="true"' : ''}>
      <div class="slot-time">${formatTime(slot.start_time)}–${formatTime(slot.end_time)}</div>
      ${groupNote}
    </div>`;
}

function formatTime(t) {
  const [h, m] = t.split(':').map(Number);
  const period = h >= 12 ? 'pm' : 'am';
  const hour = h % 12 === 0 ? 12 : h % 12;
  return m === 0 ? `${hour}${period}` : `${hour}:${String(m).padStart(2, '0')}${period}`;
}

async function loadSchedule() {
  const weekdayContainer = document.getElementById('weekdaySlots');
  const satContainer = document.getElementById('saturdaySlots');
  if (!weekdayContainer && !satContainer) return;

  try {
    const { slots } = await apiFetch('/slots');
    const weekdays = slots.filter((s) => s.day_of_week !== 'Saturday');
    const saturday = slots.filter((s) => s.day_of_week === 'Saturday');

    if (weekdayContainer) {
      weekdayContainer.innerHTML = weekdays.map((s) => `
        <div class="day-col">
          <div class="day-label">${s.day_of_week.slice(0, 3)}</div>
          ${renderSlotCard(s)}
        </div>`).join('');
    }
    if (satContainer) {
      satContainer.innerHTML = saturday.map(renderSlotCard).join('');
    }

    attachSlotHandlers();
  } catch (err) {
    const msg = `<p style="color:var(--slate); font-size:0.9rem;">Couldn't load live availability (${err.message}). Showing may be out of date — try refreshing.</p>`;
    if (weekdayContainer) weekdayContainer.innerHTML = msg;
  }
}

function attachSlotHandlers() {
  document.querySelectorAll('.slot:not(.full)').forEach((el) => {
    el.addEventListener('click', () => {
      document.querySelectorAll('.slot').forEach((s) => s.classList.remove('selected'));
      el.classList.add('selected');
      SELECTED_SLOT = {
        id: el.dataset.slotId,
        day: el.dataset.day,
        time: el.dataset.time,
        mode: el.dataset.mode,
        price: el.dataset.price,
      };
      renderSummary();
    });
  });
}

function renderSummary() {
  const box = document.getElementById('bookingSummary');
  if (!box || !SELECTED_SLOT) return;
  box.innerHTML = `
    <p class="eyebrow">Selected slot</p>
    <h3 style="margin:10px 0 4px;">${SELECTED_SLOT.day}, ${SELECTED_SLOT.time}</h3>
    <p style="color:var(--slate); margin-bottom:16px;">${SELECTED_SLOT.mode}</p>
    <div style="display:flex; justify-content:space-between; font-family:var(--font-mono); font-size:1.1rem; margin-bottom:20px;">
      <span>Rate</span><strong>${SELECTED_SLOT.price}</strong>
    </div>
    <a href="signup.html" class="btn btn-primary btn-block" id="continueBtn">Continue to register</a>
  `;
  document.getElementById('continueBtn').addEventListener('click', () => {
    localStorage.setItem('mtja_selected_slot', JSON.stringify(SELECTED_SLOT));
  });
}

document.addEventListener('DOMContentLoaded', loadSchedule);
