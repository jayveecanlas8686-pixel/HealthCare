/* ============================================================
   MEDICARE+ HEALTHCARE APPOINTMENT SYSTEM
   Booking flow, confirmation page, my-appointments management
   ============================================================ */

const BOOKING_DAYS_AHEAD = 14;

let bookingState = {
  doctor: null,
  type: 'in-person',
  date: null,
  time: null,
  files: []
};

let rescheduleState = {
  apptId: null,
  date: null,
  time: null
};

/* ============================================================
   FEE CALCULATION
   ============================================================ */
function getTypeFee(baseFee, type) {
  switch (type) {
    case 'online': return Math.round(baseFee * 0.8);
    case 'follow-up': return Math.round(baseFee * 0.5);
    case 'emergency': return baseFee + 100;
    default: return baseFee;
  }
}

/* ============================================================
   SLOT HELPERS THAT SUPPORT EXCLUDING ONE APPOINTMENT
   (used for rescheduling, so the appointment's own slot
   doesn't appear as "booked")
   ============================================================ */
function getDaySlotsExcluding(doctorId, dateStr, excludeApptId) {
  const schedule = getDoctorSchedule(doctorId);
  if (!schedule) return [];
  const dow = dayAbbrev(dateStr);
  if (!schedule.workDays.includes(dow)) return [];

  const slots = [];
  const start = timeToMinutes(schedule.startTime);
  const end = timeToMinutes(schedule.endTime);
  const breakStart = schedule.breakStart ? timeToMinutes(schedule.breakStart) : null;
  const breakEnd = schedule.breakEnd ? timeToMinutes(schedule.breakEnd) : null;

  const bookedTimes = DB.findAll(DB.KEYS.APPOINTMENTS, a =>
    a.doctorId === doctorId && a.date === dateStr &&
    (a.status === 'pending' || a.status === 'confirmed') &&
    a.id !== excludeApptId
  ).map(a => a.time);

  const blockedTimes = (schedule.blocked || [])
    .filter(b => b.date === dateStr)
    .map(b => b.time);

  for (let m = start; m < end; m += schedule.slotDuration) {
    if (breakStart !== null && m >= breakStart && m < breakEnd) continue;
    const time = minutesToTime(m);
    let status = 'available';
    if (blockedTimes.includes(time)) status = 'blocked';
    else if (bookedTimes.includes(time)) status = 'booked';
    slots.push({ time, status });
  }
  return slots;
}

/* ============================================================
   BOOKING PAGE
   ============================================================ */
function initBookingPage() {
  const user = requireAuth(['patient']);
  if (!user) return;

  const doctorId = Number(getUrlParam('doctorId'));
  const doctor = DB.findById(DB.KEYS.DOCTORS, doctorId);
  const container = document.getElementById('booking-container');

  if (!doctor) {
    if (container) {
      container.innerHTML = renderEmptyState('🩺', 'Doctor Not Found', 'Please choose a doctor before booking an appointment.',
        '<a href="doctors.html" class="btn btn-primary">Browse Doctors</a>');
    }
    return;
  }

  bookingState = { doctor, type: 'in-person', date: null, time: null, files: [] };

  renderBookingDoctorSummary(doctor);
  renderAppointmentTypeOptions(doctor);
  renderBookingDateStrip();
  bindBookingFileUpload();
  updatePriceSummary();

  const form = document.getElementById('booking-form');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      submitBooking(user, doctor);
    });
  }
}

function renderBookingDoctorSummary(doctor) {
  const el = document.getElementById('booking-doctor-summary');
  if (!el) return;
  el.innerHTML = `
    <img src="${escapeHtml(doctor.photo)}" alt="${escapeHtml(doctor.name)}">
    <div>
      <div class="name">${escapeHtml(doctor.name)}</div>
      <div class="specialty">${escapeHtml(doctor.specialty)}</div>
      <div class="loc">📍 ${escapeHtml(doctor.clinicLocation)}, ${escapeHtml(doctor.city)}</div>
    </div>
  `;
}

function renderAppointmentTypeOptions(doctor) {
  const el = document.getElementById('appointment-type-options');
  if (!el) return;
  el.innerHTML = Object.keys(APPOINTMENT_TYPES).map(typeKey => {
    const t = APPOINTMENT_TYPES[typeKey];
    const fee = getTypeFee(doctor.consultationFee, typeKey);
    return `
    <label class="type-option ${bookingState.type === typeKey ? 'active' : ''}" data-type="${typeKey}">
      <input type="radio" name="appt-type" value="${typeKey}" ${bookingState.type === typeKey ? 'checked' : ''}>
      <div class="type-icon">${t.icon}</div>
      <div class="type-name">${t.label}</div>
      <div class="type-price">${formatCurrency(fee)}</div>
    </label>`;
  }).join('');

  el.querySelectorAll('.type-option').forEach(opt => {
    opt.addEventListener('click', () => {
      bookingState.type = opt.dataset.type;
      el.querySelectorAll('.type-option').forEach(o => o.classList.remove('active'));
      opt.classList.add('active');
      updatePriceSummary();
    });
  });
}

function renderBookingDateStrip() {
  const el = document.getElementById('booking-date-strip');
  if (!el) return;
  const doctor = bookingState.doctor;
  let firstAvailableSet = false;

  el.innerHTML = '';
  for (let i = 0; i < BOOKING_DAYS_AHEAD; i++) {
    const date = addDays(todayStr(), i);
    const slots = getAvailableSlots(doctor.id, date);
    const disabled = slots.length === 0;
    if (!disabled && !firstAvailableSet && !bookingState.date) {
      bookingState.date = date;
      firstAvailableSet = true;
    }
    const d = new Date(date + 'T00:00:00');
    const chip = document.createElement('div');
    chip.className = `date-chip ${disabled ? 'disabled' : ''} ${bookingState.date === date ? 'active' : ''}`;
    chip.innerHTML = `
      <div class="dow">${dayAbbrev(date)}</div>
      <div class="dom">${d.getDate()}</div>
      <div class="mon">${d.toLocaleDateString('en-US', { month: 'short' })}</div>
    `;
    if (!disabled) {
      chip.addEventListener('click', () => {
        bookingState.date = date;
        bookingState.time = null;
        el.querySelectorAll('.date-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        renderBookingTimeSlots();
        updatePriceSummary();
      });
    }
    el.appendChild(chip);
  }
  renderBookingTimeSlots();
}

function renderBookingTimeSlots() {
  const el = document.getElementById('booking-time-slots');
  if (!el) return;
  if (!bookingState.date) {
    el.innerHTML = `<p class="text-light">This doctor has no available slots in the next ${BOOKING_DAYS_AHEAD} days.</p>`;
    return;
  }
  const slots = getDaySlots(bookingState.doctor.id, bookingState.date);
  if (slots.length === 0) {
    el.innerHTML = '<p class="text-light">No time slots configured for this date.</p>';
    return;
  }
  el.innerHTML = slots.map(s => `
    <label class="time-slot ${s.status !== 'available' ? 'booked' : ''} ${bookingState.time === s.time ? 'active' : ''}" data-time="${s.time}">
      <input type="radio" name="appt-time" value="${s.time}" ${s.status !== 'available' ? 'disabled' : ''} ${bookingState.time === s.time ? 'checked' : ''}>
      ${formatTime(s.time)}
    </label>
  `).join('');

  el.querySelectorAll('.time-slot:not(.booked)').forEach(slot => {
    slot.addEventListener('click', () => {
      bookingState.time = slot.dataset.time;
      el.querySelectorAll('.time-slot').forEach(s => s.classList.remove('active'));
      slot.classList.add('active');
      updatePriceSummary();
    });
  });
}

function bindBookingFileUpload() {
  const input = document.getElementById('booking-file-input');
  const list = document.getElementById('booking-file-list');
  if (!input || !list) return;

  input.addEventListener('change', () => {
    Array.from(input.files).forEach(f => bookingState.files.push(f.name));
    renderFileList();
    input.value = '';
  });

  function renderFileList() {
    list.innerHTML = bookingState.files.map((name, idx) => `
      <div class="upload-chip">
        <span>📎 ${escapeHtml(name)}</span>
        <button type="button" onclick="removeBookingFile(${idx})">✕</button>
      </div>
    `).join('');
  }
  renderFileList();
  window.removeBookingFile = (idx) => {
    bookingState.files.splice(idx, 1);
    renderFileList();
  };
}

function updatePriceSummary() {
  const doctor = bookingState.doctor;
  if (!doctor) return;
  const fee = getTypeFee(doctor.consultationFee, bookingState.type);
  const setText = (id, text) => { const el = document.getElementById(id); if (el) el.textContent = text; };

  setText('summary-doctor-name', doctor.name);
  setText('summary-type', APPOINTMENT_TYPES[bookingState.type].label);
  setText('summary-date', bookingState.date ? formatDateLong(bookingState.date) : '—');
  setText('summary-time', bookingState.time ? formatTime(bookingState.time) : '—');
  setText('summary-fee', formatCurrency(fee));
  setText('summary-total', formatCurrency(fee));
}

function submitBooking(user, doctor) {
  if (!bookingState.date || !bookingState.time) {
    showToast('Please select a date and time slot for your appointment.', 'warning');
    return;
  }
  const symptomsInput = document.getElementById('booking-symptoms');
  const symptoms = symptomsInput ? symptomsInput.value.trim() : '';
  if (!symptoms) {
    showFieldError('booking-symptoms', 'Please briefly describe your symptoms or reason for visit.');
    return;
  }
  const notesInput = document.getElementById('booking-notes');
  const notes = notesInput ? notesInput.value.trim() : '';
  const fee = getTypeFee(doctor.consultationFee, bookingState.type);

  const appt = {
    id: generateId('apt'),
    refNumber: generateRef('APT'),
    patientId: user.id,
    patientName: user.name,
    patientEmail: user.email,
    patientPhone: user.phone || '',
    doctorId: doctor.id,
    doctorName: doctor.name,
    specialty: doctor.specialty,
    date: bookingState.date,
    time: bookingState.time,
    type: bookingState.type,
    status: 'pending',
    fee,
    paymentStatus: 'unpaid',
    paymentMethod: '',
    symptoms,
    notes,
    attachments: bookingState.files.slice(),
    createdAt: todayStr()
  };
  DB.insert(DB.KEYS.APPOINTMENTS, appt);

  const invCount = DB.getAll(DB.KEYS.BILLING).length + 1;
  DB.insert(DB.KEYS.BILLING, {
    id: generateId('inv'),
    invoiceNumber: `INV-${new Date().getFullYear()}-${String(invCount).padStart(4, '0')}`,
    appointmentId: appt.id,
    patientId: user.id,
    patientName: user.name,
    doctorId: doctor.id,
    doctorName: doctor.name,
    date: appt.date,
    amount: fee,
    status: 'unpaid',
    paymentMethod: '',
    items: [{ desc: `${APPOINTMENT_TYPES[appt.type].label} - ${doctor.specialty} (Dr. ${doctor.name.replace(/^Dr\.?\s*/, '')})`, amount: fee }]
  });

  DB.insert(DB.KEYS.NOTIFICATIONS, {
    id: generateId('ntf'),
    userId: user.id,
    title: 'Appointment Requested',
    message: `Your ${APPOINTMENT_TYPES[appt.type].label.toLowerCase()} with ${doctor.name} on ${formatDate(appt.date)} at ${formatTime(appt.time)} has been requested and is pending confirmation.`,
    type: 'reminder',
    read: false,
    date: todayStr()
  });

  const doctorUser = DB.findOne(DB.KEYS.USERS, u => u.doctorId === doctor.id);
  if (doctorUser) {
    DB.insert(DB.KEYS.NOTIFICATIONS, {
      id: generateId('ntf'),
      userId: doctorUser.id,
      title: 'New Appointment Request',
      message: `${user.name} requested a ${APPOINTMENT_TYPES[appt.type].label.toLowerCase()} on ${formatDate(appt.date)} at ${formatTime(appt.time)}.`,
      type: 'system',
      read: false,
      date: todayStr()
    });
  }

  sessionStorage.setItem('hc_last_appointment', appt.id);
  showToast('Appointment booked successfully!', 'success');
  setTimeout(() => { window.location.href = `appointment-confirmation.html?id=${appt.id}`; }, 400);
}

/* ============================================================
   CONFIRMATION PAGE
   ============================================================ */
function initConfirmationPage() {
  const id = getUrlParam('id') || sessionStorage.getItem('hc_last_appointment');
  const appt = DB.findById(DB.KEYS.APPOINTMENTS, id);
  const container = document.getElementById('confirmation-container');

  if (!appt) {
    if (container) {
      container.innerHTML = renderEmptyState('📅', 'No Appointment Found', 'We could not find the appointment you are looking for.',
        '<a href="doctors.html" class="btn btn-primary">Find a Doctor</a>');
    }
    return;
  }

  const doctor = DB.findById(DB.KEYS.DOCTORS, appt.doctorId);
  const setText = (elId, text) => { const el = document.getElementById(elId); if (el) el.textContent = text; };
  const setHtml = (elId, html) => { const el = document.getElementById(elId); if (el) el.innerHTML = html; };

  setText('conf-ref', appt.refNumber);
  setHtml('conf-doctor-info', `
    <div class="confirm-row"><span class="label">Doctor</span><span class="value">${escapeHtml(appt.doctorName)}</span></div>
    <div class="confirm-row"><span class="label">Specialty</span><span class="value">${escapeHtml(appt.specialty)}</span></div>
    <div class="confirm-row"><span class="label">Location</span><span class="value">${doctor ? escapeHtml(doctor.clinicLocation + ', ' + doctor.city) : '—'}</span></div>
  `);
  setHtml('conf-appointment-info', `
    <div class="confirm-row"><span class="label">Date</span><span class="value">${formatDateLong(appt.date)}</span></div>
    <div class="confirm-row"><span class="label">Time</span><span class="value">${formatTime(appt.time)}</span></div>
    <div class="confirm-row"><span class="label">Type</span><span class="value">${APPOINTMENT_TYPES[appt.type].icon} ${APPOINTMENT_TYPES[appt.type].label}</span></div>
    <div class="confirm-row"><span class="label">Status</span><span class="value">${statusBadge(appt.status)}</span></div>
  `);
  setHtml('conf-patient-info', `
    <div class="confirm-row"><span class="label">Patient Name</span><span class="value">${escapeHtml(appt.patientName)}</span></div>
    <div class="confirm-row"><span class="label">Email</span><span class="value">${escapeHtml(appt.patientEmail)}</span></div>
    <div class="confirm-row"><span class="label">Phone</span><span class="value">${escapeHtml(appt.patientPhone || '—')}</span></div>
    <div class="confirm-row"><span class="label">Reason for Visit</span><span class="value">${escapeHtml(appt.symptoms || '—')}</span></div>
  `);
  setHtml('conf-payment-info', `
    <div class="confirm-row"><span class="label">Consultation Fee</span><span class="value">${formatCurrency(appt.fee)}</span></div>
    <div class="confirm-row"><span class="label">Payment Status</span><span class="value">${paymentBadge(appt.paymentStatus)}</span></div>
    <div class="confirm-row total-row"><span class="label">Total Amount</span><span class="value">${formatCurrency(appt.fee)}</span></div>
  `);

  if (appt.type === 'online') {
    const videoBox = document.getElementById('conf-video-box');
    if (videoBox) videoBox.style.display = 'block';
  }

  const printBtn = document.getElementById('conf-print-btn');
  if (printBtn) printBtn.addEventListener('click', () => window.print());
}

/* ============================================================
   MY APPOINTMENTS PAGE
   ============================================================ */
let myApptFilter = 'all';

function initMyAppointmentsPage() {
  const user = requireAuth(['patient', 'doctor']);
  if (!user) return;

  const urlFilter = getUrlParam('filter');
  if (urlFilter) myApptFilter = urlFilter;

  bindMyAppointmentsFilters();
  renderMyAppointments(user);
}

function bindMyAppointmentsFilters() {
  document.querySelectorAll('.filter-tab[data-filter]').forEach(tab => {
    if (tab.dataset.filter === myApptFilter) tab.classList.add('active');
    else tab.classList.remove('active');
    tab.addEventListener('click', () => {
      myApptFilter = tab.dataset.filter;
      document.querySelectorAll('.filter-tab[data-filter]').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      renderMyAppointments(getCurrentUser());
    });
  });
}

function getMyAppointments(user) {
  let appts;
  if (user.role === 'doctor') {
    appts = DB.findAll(DB.KEYS.APPOINTMENTS, a => a.doctorId === user.doctorId);
  } else {
    appts = DB.findAll(DB.KEYS.APPOINTMENTS, a => a.patientId === user.id);
  }
  const today = todayStr();
  switch (myApptFilter) {
    case 'upcoming':
      appts = appts.filter(a => (a.status === 'pending' || a.status === 'confirmed') && a.date >= today);
      break;
    case 'pending':
      appts = appts.filter(a => a.status === 'pending');
      break;
    case 'completed':
      appts = appts.filter(a => a.status === 'completed');
      break;
    case 'cancelled':
      appts = appts.filter(a => a.status === 'cancelled');
      break;
    default:
      break;
  }
  return appts.sort((a, b) => (a.date + a.time < b.date + b.time ? 1 : -1));
}

function renderMyAppointments(user) {
  const container = document.getElementById('appointments-list');
  if (!container) return;
  const appts = getMyAppointments(user);

  if (appts.length === 0) {
    container.innerHTML = renderEmptyState('📅', 'No Appointments Found', 'There are no appointments matching this filter.',
      user.role === 'patient' ? '<a href="doctors.html" class="btn btn-primary">Book an Appointment</a>' : '');
    return;
  }

  const today = todayStr();
  container.innerHTML = appts.map(a => {
    const d = new Date(a.date + 'T00:00:00');
    const isPatient = user.role === 'patient';
    const otherName = isPatient ? a.doctorName : a.patientName;
    const otherLabel = isPatient ? a.specialty : 'Patient';

    let actions = '';
    if (isPatient) {
      if ((a.status === 'pending' || a.status === 'confirmed') && a.date >= today) {
        actions += `<button class="btn btn-outline btn-sm" onclick="openRescheduleModal('${a.id}')">Reschedule</button>`;
        actions += `<button class="btn btn-danger btn-sm" onclick="handleCancelAppointment('${a.id}')">Cancel</button>`;
      }
      if (a.status === 'completed') {
        const hasReview = DB.findOne(DB.KEYS.REVIEWS, r => r.appointmentId === a.id);
        if (!hasReview) actions += `<a href="reviews.html?appointmentId=${a.id}" class="btn btn-teal btn-sm">Leave Review</a>`;
        actions += `<a href="medical-records.html?appointmentId=${a.id}" class="btn btn-outline btn-sm">View Record</a>`;
      }
      if (a.paymentStatus === 'unpaid' && a.status !== 'cancelled') {
        actions += `<a href="billing.html?appointmentId=${a.id}" class="btn btn-warning btn-sm">Pay Now</a>`;
      }
    } else {
      if (a.status === 'pending') {
        actions += `<button class="btn btn-primary btn-sm" onclick="handleConfirmAppointment('${a.id}')">Confirm</button>`;
        actions += `<button class="btn btn-danger btn-sm" onclick="handleDeclineAppointment('${a.id}')">Decline</button>`;
      }
      if (a.status === 'confirmed' && a.date <= today) {
        actions += `<button class="btn btn-success btn-sm" onclick="handleCompleteAppointment('${a.id}')">Mark Completed</button>`;
      }
      if (a.status === 'confirmed' && a.date > today) {
        actions += `<button class="btn btn-danger btn-sm" onclick="handleDeclineAppointment('${a.id}')">Cancel</button>`;
      }
      if (a.status === 'completed') {
        actions += `<a href="medical-records.html?appointmentId=${a.id}" class="btn btn-outline btn-sm">Medical Record</a>`;
        actions += `<a href="prescriptions.html?appointmentId=${a.id}" class="btn btn-outline btn-sm">Prescription</a>`;
      }
    }

    return `
    <div class="appointment-item status-${a.status}-item">
      <div class="appt-date-block">
        <div class="dow">${dayAbbrev(a.date)}</div>
        <div class="dom">${d.getDate()}</div>
        <div class="mon">${d.toLocaleDateString('en-US', { month: 'short' })}</div>
      </div>
      <div class="appt-info">
        <div class="appt-title">${escapeHtml(otherName)} ${!isPatient ? '' : ''}</div>
        <div class="appt-sub">
          <span>${escapeHtml(otherLabel)}</span>
          <span>🕒 ${formatTime(a.time)}</span>
          ${typeBadge(a.type)}
          ${statusBadge(a.status)}
          ${paymentBadge(a.paymentStatus)}
        </div>
      </div>
      <div class="appt-actions">${actions}</div>
    </div>`;
  }).join('');
}

/* ============================================================
   APPOINTMENT ACTIONS
   ============================================================ */
function notifyUser(userId, title, message, type) {
  DB.insert(DB.KEYS.NOTIFICATIONS, {
    id: generateId('ntf'), userId, title, message, type: type || 'system', read: false, date: todayStr()
  });
}

function handleCancelAppointment(apptId) {
  confirmModal('Are you sure you want to cancel this appointment? This action cannot be undone.', () => {
    const appt = DB.findById(DB.KEYS.APPOINTMENTS, apptId);
    DB.update(DB.KEYS.APPOINTMENTS, apptId, { status: 'cancelled' });
    const doctorUser = DB.findOne(DB.KEYS.USERS, u => u.doctorId === appt.doctorId);
    if (doctorUser) {
      notifyUser(doctorUser.id, 'Appointment Cancelled', `${appt.patientName} cancelled their appointment on ${formatDate(appt.date)} at ${formatTime(appt.time)}.`, 'system');
    }
    showToast('Appointment cancelled.', 'success');
    renderMyAppointments(getCurrentUser());
  }, 'Cancel Appointment', 'btn-danger');
}

function handleConfirmAppointment(apptId) {
  const appt = DB.findById(DB.KEYS.APPOINTMENTS, apptId);
  DB.update(DB.KEYS.APPOINTMENTS, apptId, { status: 'confirmed' });
  notifyUser(appt.patientId, 'Appointment Confirmed', `Your appointment with ${appt.doctorName} on ${formatDate(appt.date)} at ${formatTime(appt.time)} has been confirmed.`, 'reminder');
  showToast('Appointment confirmed.', 'success');
  renderMyAppointments(getCurrentUser());
}

function handleDeclineAppointment(apptId) {
  confirmModal('Are you sure you want to cancel this appointment?', () => {
    const appt = DB.findById(DB.KEYS.APPOINTMENTS, apptId);
    DB.update(DB.KEYS.APPOINTMENTS, apptId, { status: 'cancelled' });
    notifyUser(appt.patientId, 'Appointment Cancelled', `Your appointment with ${appt.doctorName} on ${formatDate(appt.date)} at ${formatTime(appt.time)} was cancelled by the clinic. We apologize for the inconvenience.`, 'system');
    showToast('Appointment cancelled.', 'success');
    renderMyAppointments(getCurrentUser());
  }, 'Cancel Appointment', 'btn-danger');
}

function handleCompleteAppointment(apptId) {
  confirmModal('Mark this appointment as completed? You can add a medical record and prescription afterwards.', () => {
    const appt = DB.findById(DB.KEYS.APPOINTMENTS, apptId);
    DB.update(DB.KEYS.APPOINTMENTS, apptId, { status: 'completed' });
    notifyUser(appt.patientId, 'Appointment Completed', `Your appointment with ${appt.doctorName} on ${formatDate(appt.date)} has been marked as completed.`, 'system');
    showToast('Appointment marked as completed.', 'success');
    renderMyAppointments(getCurrentUser());
  }, 'Mark Completed', 'btn-success');
}

/* ============================================================
   RESCHEDULE MODAL
   ============================================================ */
function openRescheduleModal(apptId) {
  const appt = DB.findById(DB.KEYS.APPOINTMENTS, apptId);
  if (!appt) return;
  rescheduleState = { apptId, date: appt.date, time: appt.time };

  const bodyHtml = `
    <p class="text-light mb-2">Choose a new date and time for your appointment with <strong>${escapeHtml(appt.doctorName)}</strong>.</p>
    <div class="calendar-strip" id="reschedule-date-strip"></div>
    <div class="time-slot-grid" id="reschedule-time-slots"></div>
  `;
  const footerHtml = `
    <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
    <button class="btn btn-primary" id="reschedule-confirm-btn">Confirm Reschedule</button>
  `;
  openModal('Reschedule Appointment', bodyHtml, footerHtml, 'md');
  renderRescheduleDateStrip(appt);

  document.getElementById('reschedule-confirm-btn').addEventListener('click', () => {
    if (!rescheduleState.time) {
      showToast('Please select a new time slot.', 'warning');
      return;
    }
    DB.update(DB.KEYS.APPOINTMENTS, appt.id, {
      date: rescheduleState.date,
      time: rescheduleState.time,
      status: 'pending'
    });
    const doctorUser = DB.findOne(DB.KEYS.USERS, u => u.doctorId === appt.doctorId);
    if (doctorUser) {
      notifyUser(doctorUser.id, 'Appointment Rescheduled', `${appt.patientName} rescheduled their appointment to ${formatDate(rescheduleState.date)} at ${formatTime(rescheduleState.time)}. Please re-confirm.`, 'system');
    }
    notifyUser(appt.patientId, 'Appointment Rescheduled', `Your appointment with ${appt.doctorName} has been moved to ${formatDate(rescheduleState.date)} at ${formatTime(rescheduleState.time)} and is pending confirmation.`, 'reminder');
    showToast('Appointment rescheduled successfully.', 'success');
    closeModal();
    renderMyAppointments(getCurrentUser());
  });
}

function renderRescheduleDateStrip(appt) {
  const el = document.getElementById('reschedule-date-strip');
  if (!el) return;
  el.innerHTML = '';
  for (let i = 0; i < BOOKING_DAYS_AHEAD; i++) {
    const date = addDays(todayStr(), i);
    const slots = getDaySlotsExcluding(appt.doctorId, date, appt.id).filter(s => s.status === 'available');
    const disabled = slots.length === 0;
    const d = new Date(date + 'T00:00:00');
    const chip = document.createElement('div');
    chip.className = `date-chip ${disabled ? 'disabled' : ''} ${rescheduleState.date === date ? 'active' : ''}`;
    chip.innerHTML = `<div class="dow">${dayAbbrev(date)}</div><div class="dom">${d.getDate()}</div><div class="mon">${d.toLocaleDateString('en-US', { month: 'short' })}</div>`;
    if (!disabled) {
      chip.addEventListener('click', () => {
        rescheduleState.date = date;
        rescheduleState.time = null;
        el.querySelectorAll('.date-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        renderRescheduleTimeSlots(appt);
      });
    }
    el.appendChild(chip);
  }
  renderRescheduleTimeSlots(appt);
}

function renderRescheduleTimeSlots(appt) {
  const el = document.getElementById('reschedule-time-slots');
  if (!el) return;
  const slots = getDaySlotsExcluding(appt.doctorId, rescheduleState.date, appt.id);
  el.innerHTML = slots.map(s => `
    <div class="time-slot ${s.status !== 'available' ? 'booked' : ''} ${rescheduleState.time === s.time ? 'active' : ''}" data-time="${s.time}">
      ${formatTime(s.time)}
    </div>
  `).join('');
  el.querySelectorAll('.time-slot:not(.booked)').forEach(slot => {
    slot.addEventListener('click', () => {
      rescheduleState.time = slot.dataset.time;
      el.querySelectorAll('.time-slot').forEach(s => s.classList.remove('active'));
      slot.classList.add('active');
    });
  });
}
