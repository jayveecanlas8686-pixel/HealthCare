/* ============================================================
   MEDICARE+ HEALTHCARE APPOINTMENT SYSTEM
   Patient / Doctor / Admin dashboards: stats, charts, tables
   ============================================================ */

const SPECIALTY_COLORS = ['#0f4c81', '#0d9488', '#f59e0b', '#dc2626', '#8b5cf6', '#0ea5e9', '#ec4899', '#16a34a'];

function setStat(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

/* ============================================================
   SHARED CHART HELPERS
   ============================================================ */
function renderBarChart(containerId, data, colorClass) {
  const el = document.getElementById(containerId);
  if (!el) return;
  const max = Math.max(...data.map(d => d.value), 1);
  el.innerHTML = data.map(d => `
    <div class="chart-col">
      <div class="chart-bar-wrap">
        <div class="chart-bar ${colorClass || ''}" style="height:${Math.max((d.value / max) * 100, 2)}%">
          <span class="chart-bar-tooltip">${d.tooltip !== undefined ? d.tooltip : d.value}</span>
        </div>
      </div>
      <div class="chart-label">${d.label}</div>
    </div>
  `).join('');
}

function renderStatusBars(containerId, counts) {
  const el = document.getElementById(containerId);
  if (!el) return;
  const total = Object.values(counts).reduce((s, v) => s + v, 0) || 1;
  const labels = { pending: 'Pending', confirmed: 'Confirmed', completed: 'Completed', cancelled: 'Cancelled' };
  el.innerHTML = Object.keys(labels).map(key => `
    <div class="status-bar-row">
      <div class="status-bar-label">${labels[key]}</div>
      <div class="status-bar-track"><div class="status-bar-fill status-${key}" style="width:${(counts[key] || 0) / total * 100}%"></div></div>
      <div class="status-bar-count">${counts[key] || 0}</div>
    </div>
  `).join('');
}

function renderDonut(donutId, legendId, data) {
  const donut = document.getElementById(donutId);
  const legend = document.getElementById(legendId);
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  let cumulative = 0;
  const stops = data.map(d => {
    const start = (cumulative / total) * 360;
    cumulative += d.value;
    const end = (cumulative / total) * 360;
    return `${d.color} ${start}deg ${end}deg`;
  }).join(', ');
  if (donut) donut.style.background = data.length ? `conic-gradient(${stops})` : 'var(--border)';
  if (legend) {
    legend.innerHTML = data.map(d => `
      <div class="donut-legend-item"><span class="donut-swatch" style="background:${d.color}"></span>${escapeHtml(d.label)} (${d.value})</div>
    `).join('');
  }
}

function getStatusCounts(appts) {
  return appts.reduce((acc, a) => {
    acc[a.status] = (acc[a.status] || 0) + 1;
    return acc;
  }, { pending: 0, confirmed: 0, completed: 0, cancelled: 0 });
}

function last7Days() {
  const days = [];
  for (let i = 6; i >= 0; i--) days.push(addDays(todayStr(), -i));
  return days;
}

/* ============================================================
   APPOINTMENTS TABLE (shared)
   ============================================================ */
function renderAppointmentsTable(tbodyId, appts, perspective) {
  const el = document.getElementById(tbodyId);
  if (!el) return;
  if (appts.length === 0) {
    el.innerHTML = `<tr><td colspan="6" style="text-align:center; color:var(--text-light); padding:2rem;">No appointments to display.</td></tr>`;
    return;
  }
  el.innerHTML = appts.map(a => `
    <tr>
      <td>
        <div class="table-avatar">
          <div class="user-avatar-sm">${initials(perspective === 'doctor' ? a.patientName : a.doctorName)}</div>
          <div>
            <div style="font-weight:600;">${escapeHtml(perspective === 'doctor' ? a.patientName : a.doctorName)}</div>
            <div style="font-size:0.76rem; color:var(--text-light);">${escapeHtml(a.specialty)}</div>
          </div>
        </div>
      </td>
      <td>${formatDateShort(a.date)}</td>
      <td>${formatTime(a.time)}</td>
      <td>${typeBadge(a.type)}</td>
      <td>${statusBadge(a.status)}</td>
      <td>${paymentBadge(a.paymentStatus)}</td>
    </tr>
  `).join('');
}

/* ============================================================
   PATIENT DASHBOARD
   ============================================================ */
function initPatientDashboard() {
  const user = requireAuth(['patient']);
  if (!user) return;

  const today = todayStr();
  const appts = DB.findAll(DB.KEYS.APPOINTMENTS, a => a.patientId === user.id);
  const upcoming = appts.filter(a => (a.status === 'pending' || a.status === 'confirmed') && a.date >= today)
    .sort((a, b) => (a.date + a.time > b.date + b.time ? 1 : -1));
  const completed = appts.filter(a => a.status === 'completed');
  const prescriptions = DB.findAll(DB.KEYS.PRESCRIPTIONS, p => p.patientId === user.id);
  const paidInvoices = DB.findAll(DB.KEYS.BILLING, b => b.patientId === user.id && b.status === 'paid');
  const totalSpent = paidInvoices.reduce((s, i) => s + i.amount, 0);

  setStat('stat-upcoming', upcoming.length);
  setStat('stat-completed', completed.length);
  setStat('stat-prescriptions', prescriptions.length);
  setStat('stat-spent', formatCurrency(totalSpent));

  const welcomeEl = document.getElementById('dashboard-welcome');
  if (welcomeEl) welcomeEl.textContent = `Welcome back, ${user.name.split(' ')[0]}!`;

  // Upcoming appointments list
  const upcomingEl = document.getElementById('upcoming-appointments-list');
  if (upcomingEl) {
    const items = upcoming.slice(0, 4);
    if (items.length === 0) {
      upcomingEl.innerHTML = renderEmptyState('📅', 'No Upcoming Appointments', 'You have no scheduled appointments. Book a visit with one of our doctors.',
        '<a href="doctors.html" class="btn btn-primary btn-sm">Find a Doctor</a>');
    } else {
      upcomingEl.innerHTML = items.map(a => {
        const d = new Date(a.date + 'T00:00:00');
        return `
        <div class="appointment-item status-${a.status}-item">
          <div class="appt-date-block">
            <div class="dow">${dayAbbrev(a.date)}</div>
            <div class="dom">${d.getDate()}</div>
            <div class="mon">${d.toLocaleDateString('en-US', { month: 'short' })}</div>
          </div>
          <div class="appt-info">
            <div class="appt-title">${escapeHtml(a.doctorName)}</div>
            <div class="appt-sub">
              <span>${escapeHtml(a.specialty)}</span>
              <span>🕒 ${formatTime(a.time)}</span>
              ${typeBadge(a.type)}
              ${statusBadge(a.status)}
            </div>
          </div>
          <div class="appt-actions"><a href="my-appointments.html" class="btn btn-outline btn-sm">Manage</a></div>
        </div>`;
      }).join('');
    }
  }

  // Recent activity (notifications)
  const activityEl = document.getElementById('recent-activity-list');
  if (activityEl) {
    const notifs = DB.findAll(DB.KEYS.NOTIFICATIONS, n => n.userId === user.id)
      .sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5);
    if (notifs.length === 0) {
      activityEl.innerHTML = renderEmptyState('🔔', 'No Recent Activity', 'You have no notifications yet.');
    } else {
      activityEl.innerHTML = notifs.map(n => `
        <div class="notification-item ${n.read ? '' : 'unread'}">
          <div class="notif-icon">${notifIcon(n.type)}</div>
          <div class="notif-content">
            <div class="notif-title">${escapeHtml(n.title)}</div>
            <p class="notif-msg">${escapeHtml(n.message)}</p>
            <div class="notif-date">${formatDate(n.date)}</div>
          </div>
        </div>
      `).join('');
    }
  }

  // Appointment status breakdown
  renderStatusBars('appt-status-bars', getStatusCounts(appts));

  // Appointment history chart (last 6 months)
  const monthData = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const label = d.toLocaleDateString('en-US', { month: 'short' });
    const monthKey = `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;
    const count = appts.filter(a => a.date.startsWith(monthKey)).length;
    monthData.push({ label, value: count, tooltip: `${count} appt(s)` });
  }
  renderBarChart('appointment-history-chart', monthData);
}

function notifIcon(type) {
  const icons = { reminder: '⏰', payment: '💳', prescription: '💊', system: '🔔' };
  return icons[type] || '🔔';
}

/* ============================================================
   DOCTOR DASHBOARD
   ============================================================ */
function initDoctorDashboard() {
  const user = requireAuth(['doctor']);
  if (!user) return;

  const today = todayStr();
  const appts = DB.findAll(DB.KEYS.APPOINTMENTS, a => a.doctorId === user.doctorId);
  const todayAppts = appts.filter(a => a.date === today && a.status !== 'cancelled')
    .sort((a, b) => a.time.localeCompare(b.time));
  const pending = appts.filter(a => a.status === 'pending');
  const uniquePatients = new Set(appts.map(a => a.patientId)).size;
  const completedThisMonth = appts.filter(a => a.status === 'completed' && a.date.startsWith(today.slice(0, 7)));

  setStat('stat-today', todayAppts.length);
  setStat('stat-pending', pending.length);
  setStat('stat-patients', uniquePatients);
  setStat('stat-completed-month', completedThisMonth.length);

  const welcomeEl = document.getElementById('dashboard-welcome');
  if (welcomeEl) welcomeEl.textContent = `Welcome back, ${user.name}!`;

  // Today's schedule
  const scheduleEl = document.getElementById('today-schedule-list');
  if (scheduleEl) {
    if (todayAppts.length === 0) {
      scheduleEl.innerHTML = renderEmptyState('🗓️', 'No Appointments Today', 'You have a clear schedule for today.');
    } else {
      scheduleEl.innerHTML = todayAppts.map(a => `
        <div class="appointment-item status-${a.status}-item">
          <div class="appt-date-block">
            <div class="dow">Today</div>
            <div class="dom">${formatTime(a.time).split(' ')[0]}</div>
            <div class="mon">${formatTime(a.time).split(' ')[1]}</div>
          </div>
          <div class="appt-info">
            <div class="appt-title">${escapeHtml(a.patientName)}</div>
            <div class="appt-sub">
              <span>${escapeHtml(a.symptoms || 'No notes provided')}</span>
              ${typeBadge(a.type)}
              ${statusBadge(a.status)}
            </div>
          </div>
          <div class="appt-actions"><a href="my-appointments.html" class="btn btn-outline btn-sm">View</a></div>
        </div>
      `).join('');
    }
  }

  // Weekly appointments chart
  const weekData = last7Days().map(date => {
    const count = appts.filter(a => a.date === date && a.status !== 'cancelled').length;
    const d = new Date(date + 'T00:00:00');
    return { label: dayAbbrev(date), value: count, tooltip: `${count} appt(s) - ${formatDateShort(date)}` };
  });
  renderBarChart('weekly-appointments-chart', weekData, 'chart-bar-teal');

  // Status distribution
  renderStatusBars('appt-status-bars', getStatusCounts(appts));

  // Recent patients table
  const recentEl = document.getElementById('recent-patients-table');
  if (recentEl) {
    const byPatient = {};
    appts.forEach(a => {
      if (!byPatient[a.patientId] || byPatient[a.patientId].date < a.date) byPatient[a.patientId] = a;
    });
    const rows = Object.values(byPatient).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 6);
    if (rows.length === 0) {
      recentEl.innerHTML = `<tr><td colspan="4" style="text-align:center; color:var(--text-light); padding:2rem;">No patients yet.</td></tr>`;
    } else {
      recentEl.innerHTML = rows.map(a => `
        <tr>
          <td>
            <div class="table-avatar">
              <div class="user-avatar-sm">${initials(a.patientName)}</div>
              <div style="font-weight:600;">${escapeHtml(a.patientName)}</div>
            </div>
          </td>
          <td>${escapeHtml(a.patientEmail)}</td>
          <td>${formatDateShort(a.date)}</td>
          <td>${statusBadge(a.status)}</td>
        </tr>
      `).join('');
    }
  }
}

/* ============================================================
   ADMIN DASHBOARD
   ============================================================ */
function initAdminDashboard() {
  const user = requireAuth(['admin']);
  if (!user) return;

  const appts = DB.getAll(DB.KEYS.APPOINTMENTS);
  const patients = DB.findAll(DB.KEYS.USERS, u => u.role === 'patient');
  const doctors = DB.getAll(DB.KEYS.DOCTORS);
  const activeDoctors = doctors.filter(d => d.status === 'active');
  const paidInvoices = DB.findAll(DB.KEYS.BILLING, b => b.status === 'paid');
  const totalRevenue = paidInvoices.reduce((s, i) => s + i.amount, 0);

  setStat('stat-patients', patients.length);
  setStat('stat-doctors', activeDoctors.length);
  setStat('stat-appointments', appts.length);
  setStat('stat-revenue', formatCurrency(totalRevenue));

  const welcomeEl = document.getElementById('dashboard-welcome');
  if (welcomeEl) welcomeEl.textContent = `Welcome back, ${user.name}!`;

  // Appointments per day (last 7 days)
  const apptData = last7Days().map(date => {
    const count = appts.filter(a => a.date === date).length;
    return { label: dayAbbrev(date), value: count, tooltip: `${count} appt(s) - ${formatDateShort(date)}` };
  });
  renderBarChart('appointments-chart', apptData);

  // Revenue per day (last 7 days)
  const revenueData = last7Days().map(date => {
    const total = paidInvoices.filter(i => i.date === date).reduce((s, i) => s + i.amount, 0);
    return { label: dayAbbrev(date), value: total, tooltip: formatCurrency(total) };
  });
  renderBarChart('revenue-chart', revenueData, 'chart-bar-teal');

  // Status distribution
  renderStatusBars('appt-status-bars', getStatusCounts(appts));

  // Specialty distribution donut
  const bySpecialty = {};
  appts.forEach(a => { bySpecialty[a.specialty] = (bySpecialty[a.specialty] || 0) + 1; });
  const specialtyData = Object.keys(bySpecialty).map((label, idx) => ({
    label, value: bySpecialty[label], color: SPECIALTY_COLORS[idx % SPECIALTY_COLORS.length]
  }));
  renderDonut('specialty-donut', 'specialty-legend', specialtyData);

  // Recent appointments table
  const recentAppts = [...appts].sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || '')).slice(0, 8);
  renderAppointmentsTable('recent-appointments-table', recentAppts, 'admin');

  renderDoctorManagementTable();
  renderPatientManagementTable();
  bindAddDoctorModal();
}

/* ============================================================
   ADMIN: DOCTOR MANAGEMENT
   ============================================================ */
function renderDoctorManagementTable() {
  const el = document.getElementById('doctor-management-table');
  if (!el) return;
  const doctors = DB.getAll(DB.KEYS.DOCTORS).sort((a, b) => a.name.localeCompare(b.name));
  el.innerHTML = doctors.map(d => `
    <tr>
      <td>
        <div class="table-avatar">
          <img src="${escapeHtml(d.photo)}" alt="${escapeHtml(d.name)}">
          <div>
            <div style="font-weight:600;">${escapeHtml(d.name)}</div>
            <div style="font-size:0.76rem; color:var(--text-light);">${escapeHtml(d.city)}</div>
          </div>
        </div>
      </td>
      <td>${escapeHtml(d.specialty)}</td>
      <td>${formatCurrency(d.consultationFee)}</td>
      <td>${renderStars(d.rating, d.reviewCount)}</td>
      <td>${statusBadge(d.status)}</td>
      <td class="table-actions">
        <button class="btn btn-sm ${d.status === 'active' ? 'btn-secondary' : 'btn-success'}" onclick="toggleDoctorStatus(${d.id})">
          ${d.status === 'active' ? 'Deactivate' : 'Activate'}
        </button>
      </td>
    </tr>
  `).join('');
}

function toggleDoctorStatus(doctorId) {
  const doctor = DB.findById(DB.KEYS.DOCTORS, doctorId);
  const newStatus = doctor.status === 'active' ? 'inactive' : 'active';
  DB.update(DB.KEYS.DOCTORS, doctorId, { status: newStatus });
  showToast(`${doctor.name} is now ${newStatus}.`, 'success');
  renderDoctorManagementTable();
}

function bindAddDoctorModal() {
  const btn = document.getElementById('add-doctor-btn');
  if (!btn) return;
  btn.addEventListener('click', () => {
    const specialtyOptions = SPECIALTIES.map(s => `<option value="${s.key}">${s.icon} ${s.key}</option>`).join('');
    const bodyHtml = `
      <div class="form-group">
        <label>Full Name (with title)</label>
        <input type="text" class="form-control" id="new-doc-name" placeholder="e.g. Dr. Anna Reyes">
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Specialty</label>
          <select class="form-control" id="new-doc-specialty">${specialtyOptions}</select>
        </div>
        <div class="form-group">
          <label>Consultation Fee ($)</label>
          <input type="number" class="form-control" id="new-doc-fee" value="100" min="0">
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Years of Experience</label>
          <input type="number" class="form-control" id="new-doc-experience" value="5" min="0">
        </div>
        <div class="form-group">
          <label>City</label>
          <input type="text" class="form-control" id="new-doc-city" placeholder="e.g. Health City">
        </div>
      </div>
      <div class="form-group">
        <label>Clinic Location</label>
        <input type="text" class="form-control" id="new-doc-location" placeholder="e.g. MediCare+ Wellness Center">
      </div>
    `;
    const footerHtml = `
      <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" id="save-new-doctor-btn">Add Doctor</button>
    `;
    const overlay = openModal('Add New Doctor', bodyHtml, footerHtml, 'md');
    overlay.querySelector('#save-new-doctor-btn').addEventListener('click', saveNewDoctor);
  });
}

function saveNewDoctor() {
  const name = document.getElementById('new-doc-name').value.trim();
  const specialty = document.getElementById('new-doc-specialty').value;
  const fee = Number(document.getElementById('new-doc-fee').value) || 0;
  const experience = Number(document.getElementById('new-doc-experience').value) || 0;
  const city = document.getElementById('new-doc-city').value.trim() || 'Health City';
  const location = document.getElementById('new-doc-location').value.trim() || 'MediCare+ Clinic';

  if (!name) {
    showFieldError('new-doc-name', 'Doctor name is required.');
    return;
  }

  const doctors = DB.getAll(DB.KEYS.DOCTORS);
  const newId = Math.max(...doctors.map(d => d.id), 0) + 1;
  const newDoctor = {
    id: newId,
    name, specialty,
    photo: `https://i.pravatar.cc/300?img=${10 + (newId % 60)}`,
    experience,
    education: ['MD - General Medical Program'],
    clinicLocation: location,
    city,
    address: `${100 + newId} Wellness Ave, ${city}`,
    consultationFee: fee,
    languages: ['English'],
    about: `${name} is a dedicated ${specialty} specialist committed to providing high-quality patient care.`,
    rating: 0,
    reviewCount: 0,
    featured: false,
    status: 'active',
    createdAt: todayStr()
  };
  DB.insert(DB.KEYS.DOCTORS, newDoctor);
  DB.insert(DB.KEYS.SCHEDULES, {
    doctorId: newId,
    workDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
    startTime: '09:00',
    endTime: '17:00',
    slotDuration: 30,
    breakStart: '12:00',
    breakEnd: '13:00',
    blocked: []
  });

  showToast(`${name} has been added to the directory.`, 'success');
  closeModal();
  renderDoctorManagementTable();
}

/* ============================================================
   ADMIN: PATIENT MANAGEMENT
   ============================================================ */
function renderPatientManagementTable(searchTerm) {
  const el = document.getElementById('patient-management-table');
  if (!el) return;
  let patients = DB.findAll(DB.KEYS.USERS, u => u.role === 'patient');
  if (searchTerm) {
    const q = searchTerm.toLowerCase();
    patients = patients.filter(p => p.name.toLowerCase().includes(q) || p.email.toLowerCase().includes(q));
  }
  if (patients.length === 0) {
    el.innerHTML = `<tr><td colspan="5" style="text-align:center; color:var(--text-light); padding:2rem;">No patients found.</td></tr>`;
    return;
  }
  el.innerHTML = patients.map(p => {
    const apptCount = DB.findAll(DB.KEYS.APPOINTMENTS, a => a.patientId === p.id).length;
    return `
    <tr>
      <td>
        <div class="table-avatar">
          ${avatarHTML(p.name, p.avatar, 34)}
          <div style="font-weight:600;">${escapeHtml(p.name)}</div>
        </div>
      </td>
      <td>${escapeHtml(p.email)}</td>
      <td>${escapeHtml(p.phone || '—')}</td>
      <td>${apptCount}</td>
      <td>${formatDateShort(p.createdAt || todayStr())}</td>
    </tr>`;
  }).join('');

  const searchInput = document.getElementById('patient-search-input');
  if (searchInput && !searchInput.dataset.bound) {
    searchInput.dataset.bound = 'true';
    searchInput.addEventListener('input', debounce((e) => renderPatientManagementTable(e.target.value), 300));
  }
}
