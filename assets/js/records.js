/* ============================================================
   MEDICARE+ HEALTHCARE APPOINTMENT SYSTEM
   Medical Records, Prescriptions, and Reviews pages
   ============================================================ */

/* ============================================================
   MEDICAL RECORDS PAGE
   ============================================================ */
function initMedicalRecordsPage() {
  const user = requireAuth(['patient', 'doctor']);
  if (!user) return;

  if (user.role === 'patient') renderPatientRecords(user);
  else renderDoctorRecords(user);
}

function renderPatientRecords(user) {
  const container = document.getElementById('records-list');
  if (!container) return;
  const records = DB.findAll(DB.KEYS.RECORDS, r => r.patientId === user.id)
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  if (records.length === 0) {
    container.innerHTML = renderEmptyState('📋', 'No Medical Records Yet', 'Your medical records will appear here after completed appointments.',
      '<a href="doctors.html" class="btn btn-primary">Find a Doctor</a>');
    return;
  }

  container.innerHTML = records.map(r => {
    const hasRx = DB.findOne(DB.KEYS.PRESCRIPTIONS, p => p.appointmentId === r.appointmentId);
    const hasInv = DB.findOne(DB.KEYS.BILLING, b => b.appointmentId === r.appointmentId);
    return `
    <div class="record-card">
      <div class="record-card-header">
        <div>
          <h3>${escapeHtml(r.diagnosis)}</h3>
          <div class="record-meta">${escapeHtml(r.doctorName)} • ${escapeHtml(r.specialty)} • ${formatDateLong(r.date)}</div>
        </div>
        <div class="table-actions">
          ${hasRx ? `<a href="prescriptions.html?appointmentId=${r.appointmentId}" class="btn btn-outline btn-sm">💊 Prescription</a>` : ''}
          ${hasInv ? `<a href="billing.html?appointmentId=${r.appointmentId}" class="btn btn-outline btn-sm">💳 Invoice</a>` : ''}
        </div>
      </div>
      <div class="record-field">
        <label>Symptoms</label>
        <p>${escapeHtml(r.symptoms)}</p>
      </div>
      <div class="record-field">
        <label>Treatment Plan</label>
        <p>${escapeHtml(r.treatmentPlan)}</p>
      </div>
      ${r.notes ? `<div class="record-field mb-0"><label>Doctor's Notes</label><p>${escapeHtml(r.notes)}</p></div>` : ''}
    </div>`;
  }).join('');
}

function renderDoctorRecords(user) {
  const pendingContainer = document.getElementById('pending-records-list');
  const recordsContainer = document.getElementById('records-list');
  if (!recordsContainer) return;

  const myRecords = DB.findAll(DB.KEYS.RECORDS, r => r.doctorId === user.doctorId)
    .sort((a, b) => new Date(b.date) - new Date(a.date));
  const completedAppts = DB.findAll(DB.KEYS.APPOINTMENTS, a => a.doctorId === user.doctorId && a.status === 'completed');
  const pending = completedAppts.filter(a => !myRecords.find(r => r.appointmentId === a.id));

  if (pendingContainer) {
    if (pending.length === 0) {
      pendingContainer.innerHTML = `<p class="text-light">No completed appointments awaiting a medical record.</p>`;
    } else {
      pendingContainer.innerHTML = pending.map(a => `
        <div class="appointment-item status-completed-item">
          <div class="appt-date-block">
            <div class="dow">${dayAbbrev(a.date)}</div>
            <div class="dom">${Number(a.date.split('-')[2])}</div>
            <div class="mon">${new Date(a.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short' })}</div>
          </div>
          <div class="appt-info">
            <div class="appt-title">${escapeHtml(a.patientName)}</div>
            <div class="appt-sub"><span>${escapeHtml(a.symptoms || 'No notes')}</span> ${typeBadge(a.type)}</div>
          </div>
          <div class="appt-actions"><button class="btn btn-primary btn-sm" onclick="openRecordModal('${a.id}')">Add Record</button></div>
        </div>
      `).join('');
    }
  }

  if (myRecords.length === 0) {
    recordsContainer.innerHTML = renderEmptyState('📋', 'No Medical Records Yet', 'Records you create for completed appointments will appear here.');
  } else {
    recordsContainer.innerHTML = myRecords.map(r => `
      <div class="record-card">
        <div class="record-card-header">
          <div>
            <h3>${escapeHtml(r.diagnosis)}</h3>
            <div class="record-meta">${escapeHtml(r.patientName)} • ${formatDateLong(r.date)}</div>
          </div>
          <button class="btn btn-outline btn-sm" onclick="openRecordModal('${r.appointmentId}')">Edit</button>
        </div>
        <div class="record-field"><label>Symptoms</label><p>${escapeHtml(r.symptoms)}</p></div>
        <div class="record-field"><label>Treatment Plan</label><p>${escapeHtml(r.treatmentPlan)}</p></div>
        ${r.notes ? `<div class="record-field mb-0"><label>Doctor's Notes</label><p>${escapeHtml(r.notes)}</p></div>` : ''}
      </div>
    `).join('');
  }

  // Auto-open modal if linked from "Add Record" on appointments list
  const apptId = getUrlParam('appointmentId');
  if (apptId) {
    const existing = DB.findOne(DB.KEYS.RECORDS, r => r.appointmentId === apptId);
    const appt = DB.findById(DB.KEYS.APPOINTMENTS, apptId);
    if (appt && appt.status === 'completed' && !existing) {
      openRecordModal(apptId);
    }
  }
}

function openRecordModal(appointmentId) {
  const appt = DB.findById(DB.KEYS.APPOINTMENTS, appointmentId);
  if (!appt) return;
  const existing = DB.findOne(DB.KEYS.RECORDS, r => r.appointmentId === appointmentId);

  const bodyHtml = `
    <p class="text-light mb-2">Patient: <strong>${escapeHtml(appt.patientName)}</strong> • ${formatDateLong(appt.date)}</p>
    <div class="form-group">
      <label>Diagnosis</label>
      <input type="text" class="form-control" id="record-diagnosis" value="${escapeHtml(existing ? existing.diagnosis : '')}" placeholder="e.g. Acute Bronchitis">
    </div>
    <div class="form-group">
      <label>Symptoms</label>
      <textarea class="form-control" id="record-symptoms">${escapeHtml(existing ? existing.symptoms : (appt.symptoms || ''))}</textarea>
    </div>
    <div class="form-group">
      <label>Treatment Plan</label>
      <textarea class="form-control" id="record-treatment">${escapeHtml(existing ? existing.treatmentPlan : '')}</textarea>
    </div>
    <div class="form-group mb-0">
      <label>Doctor's Notes (optional)</label>
      <textarea class="form-control" id="record-notes">${escapeHtml(existing ? existing.notes : '')}</textarea>
    </div>
  `;
  const footerHtml = `
    <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
    <button class="btn btn-primary" id="save-record-btn">${existing ? 'Update Record' : 'Save Record'}</button>
  `;
  const overlay = openModal(existing ? 'Edit Medical Record' : 'Add Medical Record', bodyHtml, footerHtml, 'md');
  overlay.querySelector('#save-record-btn').addEventListener('click', () => saveRecord(appt, existing));
}

function saveRecord(appt, existing) {
  const diagnosis = document.getElementById('record-diagnosis').value.trim();
  const symptoms = document.getElementById('record-symptoms').value.trim();
  const treatmentPlan = document.getElementById('record-treatment').value.trim();
  const notes = document.getElementById('record-notes').value.trim();

  if (!diagnosis || !symptoms || !treatmentPlan) {
    showToast('Diagnosis, symptoms, and treatment plan are required.', 'warning');
    return;
  }

  if (existing) {
    DB.update(DB.KEYS.RECORDS, existing.id, { diagnosis, symptoms, treatmentPlan, notes });
    showToast('Medical record updated.', 'success');
  } else {
    DB.insert(DB.KEYS.RECORDS, {
      id: generateId('rec'),
      patientId: appt.patientId,
      patientName: appt.patientName,
      appointmentId: appt.id,
      doctorId: appt.doctorId,
      doctorName: appt.doctorName,
      specialty: appt.specialty,
      diagnosis, symptoms, treatmentPlan, notes,
      date: appt.date
    });
    notifyUser(appt.patientId, 'Medical Record Added', `Dr. ${appt.doctorName.replace(/^Dr\.?\s*/, '')} added a new medical record for your visit on ${formatDate(appt.date)}.`, 'system');
    showToast('Medical record saved.', 'success');
  }
  closeModal();
  renderDoctorRecords(getCurrentUser());
}

/* ============================================================
   PRESCRIPTIONS PAGE
   ============================================================ */
function initPrescriptionsPage() {
  const user = requireAuth(['patient', 'doctor']);
  if (!user) return;

  if (user.role === 'patient') renderPatientPrescriptions(user);
  else renderDoctorPrescriptions(user);
}

function renderRxMedicinesTable(medicines) {
  return `
    <div class="rx-medicines">
      <div class="rx-medicine-row" style="background:transparent; font-weight:700; font-size:0.75rem; text-transform:uppercase; color:var(--text-muted);">
        <div>Medicine</div><div>Dosage</div><div>Frequency</div><div>Duration</div><div>Instructions</div>
      </div>
      ${medicines.map(m => `
        <div class="rx-medicine-row">
          <div class="med-name">${escapeHtml(m.name)}</div>
          <div>${escapeHtml(m.dosage)}</div>
          <div>${escapeHtml(m.frequency)}</div>
          <div>${escapeHtml(m.duration)}</div>
          <div>${escapeHtml(m.instructions)}</div>
        </div>
      `).join('')}
    </div>`;
}

function renderPatientPrescriptions(user) {
  const container = document.getElementById('prescriptions-list');
  if (!container) return;
  const prescriptions = DB.findAll(DB.KEYS.PRESCRIPTIONS, p => p.patientId === user.id)
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  if (prescriptions.length === 0) {
    container.innerHTML = renderEmptyState('💊', 'No Prescriptions Yet', 'Prescriptions issued by your doctors will appear here.');
    return;
  }

  container.innerHTML = prescriptions.map(p => `
    <div class="rx-card" id="rx-${p.id}">
      <div class="rx-card-header">
        <div>
          <h3>${escapeHtml(p.specialty)} Prescription</h3>
          <div class="rx-meta">${escapeHtml(p.doctorName)} • ${formatDateLong(p.date)} ${statusBadge(p.status)}</div>
        </div>
        <button class="btn btn-outline btn-sm" onclick="printPrescription('${p.id}')">🖨️ Print</button>
      </div>
      ${renderRxMedicinesTable(p.medicines)}
    </div>
  `).join('');

  highlightFromQuery('rx-', DB.findAll(DB.KEYS.PRESCRIPTIONS, p => p.patientId === user.id), 'appointmentId');
}

function renderDoctorPrescriptions(user) {
  const pendingContainer = document.getElementById('pending-prescriptions-list');
  const container = document.getElementById('prescriptions-list');
  if (!container) return;

  const myRx = DB.findAll(DB.KEYS.PRESCRIPTIONS, p => p.doctorId === user.doctorId)
    .sort((a, b) => new Date(b.date) - new Date(a.date));
  const completedAppts = DB.findAll(DB.KEYS.APPOINTMENTS, a => a.doctorId === user.doctorId && a.status === 'completed');
  const pending = completedAppts.filter(a => !myRx.find(p => p.appointmentId === a.id));

  if (pendingContainer) {
    if (pending.length === 0) {
      pendingContainer.innerHTML = `<p class="text-light">No completed appointments awaiting a prescription.</p>`;
    } else {
      pendingContainer.innerHTML = pending.map(a => `
        <div class="appointment-item status-completed-item">
          <div class="appt-date-block">
            <div class="dow">${dayAbbrev(a.date)}</div>
            <div class="dom">${Number(a.date.split('-')[2])}</div>
            <div class="mon">${new Date(a.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short' })}</div>
          </div>
          <div class="appt-info">
            <div class="appt-title">${escapeHtml(a.patientName)}</div>
            <div class="appt-sub"><span>${escapeHtml(a.specialty)}</span></div>
          </div>
          <div class="appt-actions"><button class="btn btn-primary btn-sm" onclick="openPrescriptionModal('${a.id}')">Add Prescription</button></div>
        </div>
      `).join('');
    }
  }

  if (myRx.length === 0) {
    container.innerHTML = renderEmptyState('💊', 'No Prescriptions Yet', 'Prescriptions you write for patients will appear here.');
  } else {
    container.innerHTML = myRx.map(p => `
      <div class="rx-card">
        <div class="rx-card-header">
          <div>
            <h3>${escapeHtml(p.patientName)}</h3>
            <div class="rx-meta">${escapeHtml(p.specialty)} • ${formatDateLong(p.date)} ${statusBadge(p.status)}</div>
          </div>
          <div class="table-actions">
            ${p.status === 'active' ? `<button class="btn btn-outline btn-sm" onclick="markPrescriptionCompleted('${p.id}')">Mark Completed</button>` : ''}
            <button class="btn btn-outline btn-sm" onclick="printPrescription('${p.id}')">🖨️ Print</button>
          </div>
        </div>
        ${renderRxMedicinesTable(p.medicines)}
      </div>
    `).join('');
  }

  const apptId = getUrlParam('appointmentId');
  if (apptId) {
    const existing = DB.findOne(DB.KEYS.PRESCRIPTIONS, p => p.appointmentId === apptId);
    const appt = DB.findById(DB.KEYS.APPOINTMENTS, apptId);
    if (appt && appt.status === 'completed' && !existing) {
      openPrescriptionModal(apptId);
    }
  }
}

function markPrescriptionCompleted(rxId) {
  DB.update(DB.KEYS.PRESCRIPTIONS, rxId, { status: 'completed' });
  showToast('Prescription marked as completed.', 'success');
  renderDoctorPrescriptions(getCurrentUser());
}

function printPrescription(rxId) {
  const card = document.getElementById(`rx-${rxId}`);
  if (card) {
    document.querySelectorAll('.rx-card').forEach(c => { if (c !== card) c.style.display = 'none'; });
    window.print();
    setTimeout(() => document.querySelectorAll('.rx-card').forEach(c => c.style.display = ''), 500);
  } else {
    window.print();
  }
}

/* ============================================================
   PRESCRIPTION MODAL (DOCTOR)
   ============================================================ */
let rxMedicineCount = 0;

function openPrescriptionModal(appointmentId) {
  const appt = DB.findById(DB.KEYS.APPOINTMENTS, appointmentId);
  if (!appt) return;
  rxMedicineCount = 0;

  const bodyHtml = `
    <p class="text-light mb-2">Patient: <strong>${escapeHtml(appt.patientName)}</strong> • ${formatDateLong(appt.date)}</p>
    <div id="rx-medicine-rows"></div>
    <button type="button" class="btn btn-outline btn-sm mt-1" id="add-medicine-btn">+ Add Medicine</button>
  `;
  const footerHtml = `
    <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
    <button class="btn btn-primary" id="save-rx-btn">Save Prescription</button>
  `;
  const overlay = openModal('Add Prescription', bodyHtml, footerHtml, 'lg');
  addMedicineRow();
  overlay.querySelector('#add-medicine-btn').addEventListener('click', addMedicineRow);
  overlay.querySelector('#save-rx-btn').addEventListener('click', () => savePrescription(appt));
}

function addMedicineRow() {
  const container = document.getElementById('rx-medicine-rows');
  if (!container) return;
  const idx = rxMedicineCount++;
  const row = document.createElement('div');
  row.className = 'form-row-3 mt-2';
  row.dataset.rxRow = idx;
  row.innerHTML = `
    <div class="form-group">
      <label>Medicine Name</label>
      <input type="text" class="form-control rx-name" placeholder="e.g. Amoxicillin">
    </div>
    <div class="form-group">
      <label>Dosage</label>
      <input type="text" class="form-control rx-dosage" placeholder="e.g. 500 mg">
    </div>
    <div class="form-group">
      <label>Frequency</label>
      <input type="text" class="form-control rx-frequency" placeholder="e.g. Twice daily">
    </div>
    <div class="form-group">
      <label>Duration</label>
      <input type="text" class="form-control rx-duration" placeholder="e.g. 7 days">
    </div>
    <div class="form-group" style="grid-column: span 2;">
      <label>Instructions</label>
      <input type="text" class="form-control rx-instructions" placeholder="e.g. Take after meals">
    </div>
    ${idx > 0 ? `<button type="button" class="btn btn-danger btn-xs" style="align-self:start; margin-top:1.6rem;" onclick="this.closest('[data-rx-row]').remove()">Remove</button>` : ''}
  `;
  container.appendChild(row);
}

function savePrescription(appt) {
  const rows = document.querySelectorAll('[data-rx-row]');
  const medicines = [];
  rows.forEach(row => {
    const name = row.querySelector('.rx-name').value.trim();
    if (!name) return;
    medicines.push({
      name,
      dosage: row.querySelector('.rx-dosage').value.trim(),
      frequency: row.querySelector('.rx-frequency').value.trim(),
      duration: row.querySelector('.rx-duration').value.trim(),
      instructions: row.querySelector('.rx-instructions').value.trim()
    });
  });

  if (medicines.length === 0) {
    showToast('Please add at least one medicine.', 'warning');
    return;
  }

  DB.insert(DB.KEYS.PRESCRIPTIONS, {
    id: generateId('rx'),
    patientId: appt.patientId,
    patientName: appt.patientName,
    appointmentId: appt.id,
    doctorId: appt.doctorId,
    doctorName: appt.doctorName,
    specialty: appt.specialty,
    date: appt.date,
    status: 'active',
    medicines
  });

  notifyUser(appt.patientId, 'New Prescription', `Dr. ${appt.doctorName.replace(/^Dr\.?\s*/, '')} has issued a new prescription for your visit on ${formatDate(appt.date)}.`, 'prescription');
  showToast('Prescription saved.', 'success');
  closeModal();
  renderDoctorPrescriptions(getCurrentUser());
}

/* ============================================================
   REVIEWS PAGE
   ============================================================ */
function initReviewsPage() {
  const user = requireAuth(['patient']);
  if (!user) return;

  renderReviewableAppointments(user);
  renderMyReviews(user);
}

function renderStarInput(name, currentValue) {
  let html = '<div class="star-input">';
  for (let i = 5; i >= 1; i--) {
    const id = `${name}-${i}`;
    html += `<input type="radio" name="${name}" value="${i}" id="${id}" ${currentValue === i ? 'checked' : ''}><label for="${id}">★</label>`;
  }
  html += '</div>';
  return html;
}

function renderReviewableAppointments(user) {
  const container = document.getElementById('reviewable-appointments');
  if (!container) return;

  const completed = DB.findAll(DB.KEYS.APPOINTMENTS, a => a.patientId === user.id && a.status === 'completed');
  const reviewed = DB.findAll(DB.KEYS.REVIEWS, r => r.patientId === user.id).map(r => r.appointmentId);
  const reviewable = completed.filter(a => !reviewed.includes(a.id));

  if (reviewable.length === 0) {
    container.innerHTML = `<p class="text-light">You have no completed appointments awaiting a review. Thank you for your feedback!</p>`;
    return;
  }

  const highlightId = getUrlParam('appointmentId');

  container.innerHTML = reviewable.map(a => {
    const doctor = DB.findById(DB.KEYS.DOCTORS, a.doctorId);
    return `
    <div class="review-form-card" id="review-form-${a.id}">
      <div class="review-form-doctor">
        ${doctor ? `<img src="${escapeHtml(doctor.photo)}" alt="${escapeHtml(a.doctorName)}">` : ''}
        <div>
          <h3>${escapeHtml(a.doctorName)}</h3>
          <div class="text-light" style="font-size:0.85rem;">${escapeHtml(a.specialty)} • Visited on ${formatDateLong(a.date)}</div>
        </div>
      </div>
      <div class="form-group">
        <label>Your Rating</label>
        ${renderStarInput(`rating-${a.id}`)}
      </div>
      <div class="form-group">
        <label>Your Review</label>
        <textarea class="form-control" id="review-comment-${a.id}" placeholder="Share details about your experience with this doctor..."></textarea>
      </div>
      <button class="btn btn-primary" onclick="submitReview('${a.id}')">Submit Review</button>
    </div>`;
  }).join('');

  if (highlightId) {
    const el = document.getElementById(`review-form-${highlightId}`);
    if (el) {
      el.style.boxShadow = '0 0 0 3px var(--primary-light)';
      setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'center' }), 300);
    }
  }
}

function submitReview(appointmentId) {
  const appt = DB.findById(DB.KEYS.APPOINTMENTS, appointmentId);
  const ratingInput = document.querySelector(`input[name="rating-${appointmentId}"]:checked`);
  const comment = document.getElementById(`review-comment-${appointmentId}`).value.trim();

  if (!ratingInput) {
    showToast('Please select a star rating.', 'warning');
    return;
  }
  if (!comment) {
    showToast('Please write a short review comment.', 'warning');
    return;
  }

  DB.insert(DB.KEYS.REVIEWS, {
    id: generateId('rev'),
    doctorId: appt.doctorId,
    patientId: appt.patientId,
    patientName: appt.patientName,
    appointmentId: appt.id,
    rating: Number(ratingInput.value),
    comment,
    date: todayStr()
  });
  recalcAllDoctorRatings();

  showToast('Thank you for your review!', 'success');
  renderReviewableAppointments(getCurrentUser());
  renderMyReviews(getCurrentUser());
}

function renderMyReviews(user) {
  const container = document.getElementById('my-reviews-list');
  if (!container) return;

  const reviews = DB.findAll(DB.KEYS.REVIEWS, r => r.patientId === user.id)
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  if (reviews.length === 0) {
    container.innerHTML = renderEmptyState('⭐', 'No Reviews Submitted', 'Reviews you submit for doctors will appear here.');
    return;
  }

  container.innerHTML = reviews.map(r => {
    const doctor = DB.findById(DB.KEYS.DOCTORS, r.doctorId);
    return `
    <div class="my-review-card">
      ${doctor ? `<img src="${escapeHtml(doctor.photo)}" alt="${escapeHtml(doctor.name)}">` : '<div></div>'}
      <div>
        <h4 class="mb-0">${doctor ? escapeHtml(doctor.name) : 'Doctor'}</h4>
        <div style="margin: 0.3rem 0;">${renderStars(r.rating, 0, false)}</div>
        <p class="mb-0 text-light">${escapeHtml(r.comment)}</p>
        <div class="text-muted" style="font-size:0.76rem; margin-top:0.3rem;">${formatDate(r.date)}</div>
      </div>
      <div class="my-review-actions">
        <button class="btn btn-outline btn-sm" onclick="openEditReviewModal('${r.id}')">Edit</button>
        <button class="btn btn-danger btn-sm" onclick="deleteReview('${r.id}')">Delete</button>
      </div>
    </div>`;
  }).join('');
}

function openEditReviewModal(reviewId) {
  const review = DB.findById(DB.KEYS.REVIEWS, reviewId);
  if (!review) return;
  const doctor = DB.findById(DB.KEYS.DOCTORS, review.doctorId);

  const bodyHtml = `
    <p class="text-light mb-2">Editing your review for <strong>${doctor ? escapeHtml(doctor.name) : 'Doctor'}</strong></p>
    <div class="form-group">
      <label>Your Rating</label>
      ${renderStarInput('edit-rating', review.rating)}
    </div>
    <div class="form-group mb-0">
      <label>Your Review</label>
      <textarea class="form-control" id="edit-review-comment">${escapeHtml(review.comment)}</textarea>
    </div>
  `;
  const footerHtml = `
    <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
    <button class="btn btn-primary" id="save-edit-review-btn">Save Changes</button>
  `;
  const overlay = openModal('Edit Review', bodyHtml, footerHtml, 'md');
  overlay.querySelector('#save-edit-review-btn').addEventListener('click', () => {
    const ratingInput = document.querySelector('input[name="edit-rating"]:checked');
    const comment = document.getElementById('edit-review-comment').value.trim();
    if (!ratingInput || !comment) {
      showToast('Please provide a rating and a comment.', 'warning');
      return;
    }
    DB.update(DB.KEYS.REVIEWS, reviewId, { rating: Number(ratingInput.value), comment });
    recalcAllDoctorRatings();
    showToast('Review updated.', 'success');
    closeModal();
    renderMyReviews(getCurrentUser());
  });
}

function deleteReview(reviewId) {
  confirmModal('Are you sure you want to delete this review?', () => {
    DB.delete(DB.KEYS.REVIEWS, reviewId);
    recalcAllDoctorRatings();
    showToast('Review deleted.', 'success');
    renderMyReviews(getCurrentUser());
    renderReviewableAppointments(getCurrentUser());
  }, 'Delete Review', 'btn-danger');
}

/* ============================================================
   SHARED: highlight a card based on ?appointmentId= query param
   ============================================================ */
function highlightFromQuery(prefix, items, matchField) {
  const apptId = getUrlParam(matchField);
  if (!apptId) return;
  const match = items.find(i => i.appointmentId === apptId);
  if (match) {
    const el = document.getElementById(`${prefix}${match.id}`);
    if (el) {
      el.style.boxShadow = '0 0 0 3px var(--primary-light)';
      setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'center' }), 300);
    }
  }
}
