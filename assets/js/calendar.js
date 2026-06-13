/* ============================================================
   MEDICARE+ HEALTHCARE APPOINTMENT SYSTEM
   Calendar page: monthly view, day details, doctor slot blocking
   ============================================================ */

let calendarState = {
  year: new Date().getFullYear(),
  month: new Date().getMonth(),
  selectedDate: todayStr()
};

function updateDoctorSchedule(doctorId, updates) {
  const schedules = DB.getAll(DB.KEYS.SCHEDULES);
  const idx = schedules.findIndex(s => s.doctorId === doctorId);
  if (idx === -1) return null;
  schedules[idx] = { ...schedules[idx], ...updates };
  DB.set(DB.KEYS.SCHEDULES, schedules);
  return schedules[idx];
}

function initCalendarPage() {
  const user = requireAuth(['patient', 'doctor']);
  if (!user) return;

  bindCalendarNav(user);
  renderCalendar(user);
}

function bindCalendarNav(user) {
  const prevBtn = document.getElementById('cal-prev-btn');
  const nextBtn = document.getElementById('cal-next-btn');
  const todayBtn = document.getElementById('cal-today-btn');

  if (prevBtn) prevBtn.addEventListener('click', () => {
    calendarState.month--;
    if (calendarState.month < 0) { calendarState.month = 11; calendarState.year--; }
    renderCalendar(user);
  });
  if (nextBtn) nextBtn.addEventListener('click', () => {
    calendarState.month++;
    if (calendarState.month > 11) { calendarState.month = 0; calendarState.year++; }
    renderCalendar(user);
  });
  if (todayBtn) todayBtn.addEventListener('click', () => {
    const now = new Date();
    calendarState = { year: now.getFullYear(), month: now.getMonth(), selectedDate: todayStr() };
    renderCalendar(user);
  });
}

function getUserAppointments(user) {
  if (user.role === 'doctor') {
    return DB.findAll(DB.KEYS.APPOINTMENTS, a => a.doctorId === user.doctorId && a.status !== 'cancelled');
  }
  return DB.findAll(DB.KEYS.APPOINTMENTS, a => a.patientId === user.id && a.status !== 'cancelled');
}

function renderCalendar(user) {
  const { year, month } = calendarState;
  const titleEl = document.getElementById('calendar-title');
  if (titleEl) {
    titleEl.textContent = new Date(year, month, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }

  const appts = getUserAppointments(user);
  const apptsByDate = {};
  appts.forEach(a => {
    if (!apptsByDate[a.date]) apptsByDate[a.date] = [];
    apptsByDate[a.date].push(a);
  });

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = todayStr();

  let html = '';
  ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].forEach(d => {
    html += `<div class="cal-dow">${d}</div>`;
  });
  for (let i = 0; i < firstDay; i++) html += `<div class="cal-day empty"></div>`;

  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${year}-${pad2(month + 1)}-${pad2(day)}`;
    const dayAppts = apptsByDate[dateStr] || [];
    const isToday = dateStr === today;
    const isSelected = dateStr === calendarState.selectedDate;
    const dots = dayAppts.slice(0, 4).map(a => `<span class="cal-dot cal-dot-${a.status}"></span>`).join('');

    html += `
    <div class="cal-day ${isToday ? 'today' : ''} ${isSelected ? 'selected' : ''}" data-date="${dateStr}">
      <div class="cal-day-num">${day}</div>
      ${dayAppts.length ? `<div class="cal-day-dots">${dots}</div><div class="cal-day-count">${dayAppts.length} appt${dayAppts.length === 1 ? '' : 's'}</div>` : ''}
    </div>`;
  }

  const grid = document.getElementById('calendar-grid');
  if (grid) {
    grid.innerHTML = html;
    grid.querySelectorAll('.cal-day[data-date]').forEach(cell => {
      cell.addEventListener('click', () => {
        calendarState.selectedDate = cell.dataset.date;
        renderCalendar(user);
        renderDayDetails(user, cell.dataset.date);
      });
    });
  }

  renderDayDetails(user, calendarState.selectedDate);
}

function renderDayDetails(user, dateStr) {
  const container = document.getElementById('day-appointments-list');
  const titleEl = document.getElementById('day-details-title');
  if (titleEl) titleEl.textContent = formatDateLong(dateStr);
  if (!container) return;

  const appts = getUserAppointments(user).filter(a => a.date === dateStr)
    .sort((a, b) => a.time.localeCompare(b.time));

  let html = '';
  if (appts.length === 0) {
    html += renderEmptyState('📅', 'No Appointments', 'There are no appointments scheduled for this day.');
  } else {
    html += appts.map(a => `
      <div class="appointment-item status-${a.status}-item">
        <div class="appt-date-block">
          <div class="dow">${dayAbbrev(a.date)}</div>
          <div class="dom">${Number(a.date.split('-')[2])}</div>
          <div class="mon">${new Date(a.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short' })}</div>
        </div>
        <div class="appt-info">
          <div class="appt-title">${escapeHtml(user.role === 'doctor' ? a.patientName : a.doctorName)}</div>
          <div class="appt-sub">
            <span>${escapeHtml(user.role === 'doctor' ? (a.symptoms || 'No notes') : a.specialty)}</span>
            <span>🕒 ${formatTime(a.time)}</span>
            ${typeBadge(a.type)}
            ${statusBadge(a.status)}
          </div>
        </div>
        <div class="appt-actions"><a href="my-appointments.html" class="btn btn-outline btn-sm">View</a></div>
      </div>
    `).join('');
  }

  container.innerHTML = html;

  // Doctor-only: manage availability / block slots for this day
  const slotMgmt = document.getElementById('slot-management');
  if (slotMgmt) {
    if (user.role !== 'doctor') {
      slotMgmt.style.display = 'none';
    } else {
      slotMgmt.style.display = 'block';
      renderSlotManagement(user, dateStr);
    }
  }
}

function renderSlotManagement(user, dateStr) {
  const grid = document.getElementById('slot-management-grid');
  const blockedChips = document.getElementById('blocked-slots-chips');
  if (!grid) return;

  const slots = getDaySlots(user.doctorId, dateStr);
  if (slots.length === 0) {
    grid.innerHTML = `<p class="text-light">This is a non-working day according to your schedule.</p>`;
  } else {
    grid.innerHTML = slots.map(s => {
      let cls = 'time-slot';
      let label = formatTime(s.time);
      if (s.status === 'booked') { cls += ' booked'; label += ' (Booked)'; }
      else if (s.status === 'blocked') { cls += ' active'; label += ' 🚫'; }
      return `<div class="${cls}" data-time="${s.time}" data-status="${s.status}" title="${s.status === 'booked' ? 'Reserved by a patient' : 'Click to toggle availability'}">${label}</div>`;
    }).join('');

    grid.querySelectorAll('.time-slot').forEach(slot => {
      if (slot.dataset.status === 'booked') return;
      slot.addEventListener('click', () => {
        toggleBlockedSlot(user.doctorId, dateStr, slot.dataset.time);
        renderSlotManagement(user, dateStr);
      });
    });
  }

  if (blockedChips) {
    const schedule = getDoctorSchedule(user.doctorId);
    const blockedToday = (schedule.blocked || []).filter(b => b.date === dateStr);
    if (blockedToday.length === 0) {
      blockedChips.innerHTML = '<p class="text-light mb-0">No blocked slots for this day.</p>';
    } else {
      blockedChips.innerHTML = blockedToday.map(b => `
        <span class="blocked-slot-chip">🚫 ${formatTime(b.time)} <button onclick="toggleBlockedSlot(${user.doctorId}, '${dateStr}', '${b.time}'); renderSlotManagement(getCurrentUser(), '${dateStr}')">✕</button></span>
      `).join('');
    }
  }
}

function toggleBlockedSlot(doctorId, dateStr, time) {
  const schedule = getDoctorSchedule(doctorId);
  const blocked = schedule.blocked || [];
  const idx = blocked.findIndex(b => b.date === dateStr && b.time === time);
  if (idx > -1) {
    blocked.splice(idx, 1);
    showToast(`Slot ${formatTime(time)} on ${formatDateShort(dateStr)} is now available.`, 'success');
  } else {
    blocked.push({ date: dateStr, time });
    showToast(`Slot ${formatTime(time)} on ${formatDateShort(dateStr)} has been blocked.`, 'info');
  }
  updateDoctorSchedule(doctorId, { blocked });
}
