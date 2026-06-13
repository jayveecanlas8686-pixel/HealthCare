/* ============================================================
   MEDICARE+ HEALTHCARE APPOINTMENT SYSTEM
   Core App Utilities: nav/footer, toast, modal, theme, auth helpers,
   scheduling helpers, doctor card rendering, pagination
   ============================================================ */

const NAV_LINKS = [
  { href: 'index.html', label: 'Home', key: 'home' },
  { href: 'doctors.html', label: 'Find Doctors', key: 'doctors' },
  { href: 'services.html', label: 'Services', key: 'services' },
  { href: 'about.html', label: 'About', key: 'about' },
  { href: 'contact.html', label: 'Contact', key: 'contact' },
  { href: 'help-center.html', label: 'Help Center', key: 'help' }
];

const APPOINTMENT_TYPES = {
  'in-person': { icon: '🏥', label: 'In-Person Visit' },
  'online': { icon: '💻', label: 'Online Consultation' },
  'follow-up': { icon: '🔄', label: 'Follow-up Visit' },
  'emergency': { icon: '🚨', label: 'Emergency Visit' }
};

/* ============================================================
   FORMAT / TEXT HELPERS
   ============================================================ */
function formatCurrency(amount) {
  const n = Number(amount) || 0;
  return '$' + n.toFixed(2);
}

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function initials(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

function avatarHTML(name, photoUrl, size) {
  size = size || 30;
  if (photoUrl) {
    return `<img src="${escapeHtml(photoUrl)}" alt="${escapeHtml(name)}" class="user-avatar-sm" style="width:${size}px;height:${size}px;">`;
  }
  return `<div class="user-avatar-sm" style="width:${size}px;height:${size}px;">${initials(name)}</div>`;
}

function renderStars(rating, reviewCount, showCount) {
  rating = Number(rating) || 0;
  let html = '<span class="stars">';
  for (let i = 1; i <= 5; i++) {
    if (rating >= i) html += '<span class="star full">★</span>';
    else if (rating >= i - 0.5) html += '<span class="star half">★</span>';
    else html += '<span class="star empty">★</span>';
  }
  html += '</span>';
  if (rating > 0) html += `<span class="rating-num">${rating.toFixed(1)}</span>`;
  if (showCount !== false && reviewCount !== undefined) {
    html += `<span class="review-count">(${reviewCount} review${reviewCount === 1 ? '' : 's'})</span>`;
  }
  return html;
}

function statusBadge(status) {
  const map = {
    pending: ['badge-warning', 'Pending'],
    confirmed: ['badge-primary', 'Confirmed'],
    completed: ['badge-success', 'Completed'],
    cancelled: ['badge-danger', 'Cancelled'],
    active: ['badge-success', 'Active'],
    inactive: ['badge-secondary', 'Inactive']
  };
  const [cls, label] = map[status] || ['badge-secondary', status];
  return `<span class="badge ${cls}">${label}</span>`;
}

function paymentBadge(status) {
  return status === 'paid'
    ? '<span class="badge badge-success">Paid</span>'
    : '<span class="badge badge-warning">Unpaid</span>';
}

function typeBadge(type) {
  const t = APPOINTMENT_TYPES[type] || { icon: '📋', label: type };
  return `<span class="badge badge-teal">${t.icon} ${t.label}</span>`;
}

function getDashboardUrl(role) {
  if (role === 'doctor') return 'doctor-dashboard.html';
  if (role === 'admin') return 'admin-dashboard.html';
  return 'patient-dashboard.html';
}

/* ============================================================
   TOAST NOTIFICATIONS
   ============================================================ */
function showToast(message, type, duration) {
  type = type || 'info';
  duration = duration || 3500;
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }
  const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <span class="toast-icon">${icons[type] || icons.info}</span>
    <span class="toast-msg">${escapeHtml(message)}</span>
    <span class="toast-close">✕</span>
  `;
  container.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('show'));

  const remove = () => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  };
  toast.querySelector('.toast-close').addEventListener('click', remove);
  setTimeout(remove, duration);
}

/* ============================================================
   MODAL SYSTEM
   ============================================================ */
function openModal(title, bodyHtml, footerHtml, size) {
  closeModal();
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'app-modal';
  overlay.innerHTML = `
    <div class="modal ${size ? 'modal-' + size : ''}">
      <div class="modal-header">
        <div class="modal-title">${title}</div>
        <div class="modal-close">✕</div>
      </div>
      <div class="modal-body">${bodyHtml}</div>
      ${footerHtml ? `<div class="modal-footer">${footerHtml}</div>` : ''}
    </div>
  `;
  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add('active'));
  overlay.querySelector('.modal-close').addEventListener('click', closeModal);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeModal();
  });
  return overlay;
}

function closeModal() {
  const overlay = document.getElementById('app-modal');
  if (overlay) {
    overlay.classList.remove('active');
    setTimeout(() => overlay.remove(), 250);
  }
}

function confirmModal(message, onConfirm, confirmText, confirmClass) {
  confirmText = confirmText || 'Confirm';
  confirmClass = confirmClass || 'btn-danger';
  const overlay = openModal(
    'Please Confirm',
    `<p>${escapeHtml(message)}</p>`,
    `<button class="btn btn-secondary" id="confirm-cancel-btn">Cancel</button>
     <button class="btn ${confirmClass}" id="confirm-ok-btn">${confirmText}</button>`
  );
  overlay.querySelector('#confirm-cancel-btn').addEventListener('click', closeModal);
  overlay.querySelector('#confirm-ok-btn').addEventListener('click', () => {
    closeModal();
    onConfirm();
  });
}

/* ============================================================
   AUTH HELPERS
   ============================================================ */
function getCurrentUser() {
  return DB.get(DB.KEYS.CURRENT_USER);
}

function isLoggedIn() {
  return !!getCurrentUser();
}

function logout() {
  DB.set(DB.KEYS.CURRENT_USER, null);
  window.location.href = 'index.html';
}

function requireAuth(roles) {
  const user = getCurrentUser();
  const page = window.location.pathname.split('/').pop();
  if (!user) {
    window.location.href = 'login.html?redirect=' + encodeURIComponent(page);
    return null;
  }
  if (roles && roles !== 'any' && Array.isArray(roles) && !roles.includes(user.role)) {
    window.location.href = getDashboardUrl(user.role);
    return null;
  }
  return user;
}

/* ============================================================
   THEME (LIGHT / DARK)
   ============================================================ */
function getTheme() {
  return DB.get(DB.KEYS.THEME) || 'light';
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
}

function initTheme() {
  applyTheme(getTheme());
}

function toggleTheme() {
  const next = getTheme() === 'dark' ? 'light' : 'dark';
  DB.set(DB.KEYS.THEME, next);
  applyTheme(next);
}

/* ============================================================
   WISHLIST
   ============================================================ */
function getWishlist(userId) {
  const all = DB.get(DB.KEYS.WISHLIST) || {};
  return all[userId] || [];
}

function isWishlisted(doctorId) {
  const user = getCurrentUser();
  if (!user) return false;
  return getWishlist(user.id).includes(doctorId);
}

function toggleWishlist(doctorId) {
  const user = getCurrentUser();
  if (!user) {
    showToast('Please log in to save doctors to your wishlist.', 'warning');
    return false;
  }
  const all = DB.get(DB.KEYS.WISHLIST) || {};
  const list = all[user.id] || [];
  const idx = list.indexOf(doctorId);
  if (idx > -1) {
    list.splice(idx, 1);
    showToast('Removed from wishlist.', 'info');
  } else {
    list.push(doctorId);
    showToast('Added to wishlist.', 'success');
  }
  all[user.id] = list;
  DB.set(DB.KEYS.WISHLIST, all);
  return idx === -1;
}

/* ============================================================
   NOTIFICATIONS HELPER
   ============================================================ */
function getUnreadNotificationCount(userId) {
  const all = DB.findAll(DB.KEYS.NOTIFICATIONS, n => n.userId === userId && !n.read);
  return all.length;
}

/* ============================================================
   SCHEDULING HELPERS
   ============================================================ */
function timeToMinutes(t) {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

function minutesToTime(mins) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return pad2(h) + ':' + pad2(m);
}

function getDoctorSchedule(doctorId) {
  return DB.findOne(DB.KEYS.SCHEDULES, s => s.doctorId === doctorId);
}

// Returns array of { time, status: 'available'|'booked'|'blocked' }
function getDaySlots(doctorId, dateStr) {
  const schedule = getDoctorSchedule(doctorId);
  if (!schedule) return [];
  const dow = dayAbbrev(dateStr);
  if (!schedule.workDays.includes(dow)) return [];

  const slots = [];
  const start = timeToMinutes(schedule.startTime);
  const end = timeToMinutes(schedule.endTime);
  const breakStart = schedule.breakStart ? timeToMinutes(schedule.breakStart) : null;
  const breakEnd = schedule.breakEnd ? timeToMinutes(schedule.breakEnd) : null;

  const bookedAppts = DB.findAll(DB.KEYS.APPOINTMENTS, a =>
    a.doctorId === doctorId && a.date === dateStr && (a.status === 'pending' || a.status === 'confirmed')
  );
  const bookedTimes = bookedAppts.map(a => a.time);
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

function getAvailableSlots(doctorId, dateStr) {
  return getDaySlots(doctorId, dateStr).filter(s => s.status === 'available');
}

// Finds the next date (including today) within `daysAhead` days that has an available slot
function getDoctorNextAvailable(doctorId, daysAhead) {
  daysAhead = daysAhead || 14;
  for (let i = 0; i < daysAhead; i++) {
    const date = addDays(todayStr(), i);
    if (getAvailableSlots(doctorId, date).length > 0) {
      return date;
    }
  }
  return null;
}

function isDoctorAvailableToday(doctorId) {
  return getAvailableSlots(doctorId, todayStr()).length > 0;
}

/* ============================================================
   DOCTOR CARD RENDERER
   ============================================================ */
function renderDoctorCard(doctor) {
  const wishlisted = isWishlisted(doctor.id);
  const nextAvail = getDoctorNextAvailable(doctor.id);
  let availText = 'No upcoming availability';
  if (nextAvail === todayStr()) availText = '🟢 Available Today';
  else if (nextAvail) availText = `🟢 Available ${formatDateShort(nextAvail)}`;

  return `
  <div class="doctor-card" data-doctor-id="${doctor.id}">
    <div class="doctor-card-top">
      <img src="${escapeHtml(doctor.photo)}" alt="${escapeHtml(doctor.name)}" class="doctor-card-avatar">
      <div class="doctor-card-info">
        <div class="doctor-card-name"><a href="doctor-details.html?id=${doctor.id}">${escapeHtml(doctor.name)}</a></div>
        <div class="doctor-card-specialty">${escapeHtml(doctor.specialty)}</div>
        <div class="doctor-card-rating">${renderStars(doctor.rating, doctor.reviewCount)}</div>
      </div>
      <button class="wishlist-btn ${wishlisted ? 'active' : ''}" onclick="event.preventDefault(); handleWishlistClick(${doctor.id}, this)" title="Save to wishlist">${wishlisted ? '❤️' : '🤍'}</button>
    </div>
    <div class="doctor-card-body">
      <div class="doctor-card-meta">
        <span>📍 ${escapeHtml(doctor.clinicLocation)}, ${escapeHtml(doctor.city)}</span>
        <span>🎓 ${escapeHtml(doctor.experience)} years experience</span>
        <span class="availability-pill">${availText}</span>
      </div>
      <div class="doctor-card-footer">
        <div class="doctor-card-fee">
          <span class="fee-amount">${formatCurrency(doctor.consultationFee)}</span>
          <span class="fee-label">Consultation Fee</span>
        </div>
        <a href="book-appointment.html?doctorId=${doctor.id}" class="btn btn-primary btn-sm">Book Now</a>
      </div>
    </div>
  </div>`;
}

function handleWishlistClick(doctorId, btnEl) {
  const added = toggleWishlist(doctorId);
  if (getCurrentUser()) {
    btnEl.classList.toggle('active', added);
    btnEl.textContent = added ? '❤️' : '🤍';
  }
}

/* ============================================================
   PAGINATION
   ============================================================ */
function paginate(items, page, perPage) {
  const totalPages = Math.max(1, Math.ceil(items.length / perPage));
  page = Math.min(Math.max(1, page), totalPages);
  const start = (page - 1) * perPage;
  return {
    items: items.slice(start, start + perPage),
    page,
    totalPages,
    total: items.length
  };
}

function renderPaginationHTML(page, totalPages, onClickFn) {
  if (totalPages <= 1) return '';
  let html = '<div class="pagination">';
  html += `<button class="page-btn" ${page === 1 ? 'disabled' : ''} onclick="${onClickFn}(${page - 1})">‹</button>`;
  for (let i = 1; i <= totalPages; i++) {
    if (totalPages > 7 && (i > 2 && i < totalPages - 1 && Math.abs(i - page) > 1)) {
      if (i === 3 || i === totalPages - 2) html += `<span class="page-btn" style="border:none;cursor:default;">…</span>`;
      continue;
    }
    html += `<button class="page-btn ${i === page ? 'active' : ''}" onclick="${onClickFn}(${i})">${i}</button>`;
  }
  html += `<button class="page-btn" ${page === totalPages ? 'disabled' : ''} onclick="${onClickFn}(${page + 1})">›</button>`;
  html += '</div>';
  return html;
}

/* ============================================================
   DEBOUNCE
   ============================================================ */
function debounce(fn, delay) {
  let timer;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}

/* ============================================================
   EMPTY STATE
   ============================================================ */
function renderEmptyState(icon, title, message, actionHtml) {
  return `
  <div class="empty-state">
    <div class="empty-icon">${icon}</div>
    <h3>${title}</h3>
    <p>${message}</p>
    ${actionHtml || ''}
  </div>`;
}

/* ============================================================
   NAVBAR
   ============================================================ */
function getNavHTML(active) {
  const user = getCurrentUser();
  const linksHtml = NAV_LINKS.map(link =>
    `<li><a href="${link.href}" class="${active === link.key ? 'active' : ''}">${link.label}</a></li>`
  ).join('');

  let authHtml = '';
  if (user) {
    const unread = getUnreadNotificationCount(user.id);
    const dashUrl = getDashboardUrl(user.role);
    let menuItems = `<li><a href="${dashUrl}">📊 Dashboard</a></li>`;
    if (user.role !== 'admin') {
      menuItems += `<li><a href="my-appointments.html">📅 My Appointments</a></li>`;
    }
    if (user.role === 'patient') {
      menuItems += `<li><a href="medical-records.html">📋 Medical Records</a></li>`;
      menuItems += `<li><a href="prescriptions.html">💊 Prescriptions</a></li>`;
      menuItems += `<li><a href="billing.html">💳 Billing</a></li>`;
    }
    if (user.role === 'doctor') {
      menuItems += `<li><a href="calendar.html">🗓️ Calendar</a></li>`;
    }
    menuItems += `<li><a href="notifications.html">🔔 Notifications ${unread > 0 ? `<span class="badge badge-danger">${unread}</span>` : ''}</a></li>`;
    menuItems += `<li><a href="settings.html">⚙️ Settings</a></li>`;

    authHtml = `
      <li class="nav-dropdown">
        <button class="nav-user-btn ${unread > 0 ? 'notif-dot' : ''}" onclick="toggleDropdown(event)">
          ${avatarHTML(user.name, user.avatar, 30)}
          <span>${escapeHtml(user.name.split(' ')[0])}</span>
          <span class="dropdown-arrow">▾</span>
        </button>
        <ul class="dropdown-menu">
          ${menuItems}
          <li class="dropdown-divider"></li>
          <li><a href="#" onclick="logout(); return false;">🚪 Logout</a></li>
        </ul>
      </li>`;
  } else {
    authHtml = `
      <li><a href="login.html" class="btn btn-outline-white btn-sm">Login</a></li>
      <li><a href="register.html" class="btn btn-teal btn-sm">Sign Up</a></li>`;
  }

  return `
  <div class="disclaimer-banner">⚠️ Demo Application Only — Not for real medical use. No real patient data is collected or stored.</div>
  <nav class="navbar">
    <div class="container nav-container">
      <a href="index.html" class="nav-logo"><span class="logo-icon">🩺</span> MediCare+</a>
      <button class="nav-toggle" onclick="toggleMobileNav()">☰</button>
      <ul class="nav-links" id="nav-links">
        ${linksHtml}
        <li class="theme-toggle" onclick="toggleTheme()" title="Toggle dark mode"></li>
        ${authHtml}
      </ul>
    </div>
  </nav>`;
}

function toggleMobileNav() {
  document.getElementById('nav-links').classList.toggle('open');
}

function toggleDropdown(e) {
  e.stopPropagation();
  document.querySelectorAll('.dropdown-menu').forEach(m => {
    if (m !== e.currentTarget.nextElementSibling) m.classList.remove('open');
  });
  e.currentTarget.nextElementSibling.classList.toggle('open');
}

document.addEventListener('click', () => {
  document.querySelectorAll('.dropdown-menu.open').forEach(m => m.classList.remove('open'));
});

/* ============================================================
   FOOTER
   ============================================================ */
function getFooterHTML() {
  const year = new Date().getFullYear();
  return `
  <footer class="footer">
    <div class="container">
      <div class="footer-grid">
        <div class="footer-brand">
          <div class="footer-logo">🩺 MediCare+</div>
          <p>Your trusted partner for finding the right doctor and booking appointments online — fast, simple, and secure.</p>
          <div class="footer-social">
            <a href="#" class="social-link" aria-label="Facebook">📘</a>
            <a href="#" class="social-link" aria-label="Twitter">🐦</a>
            <a href="#" class="social-link" aria-label="Instagram">📷</a>
            <a href="#" class="social-link" aria-label="LinkedIn">💼</a>
          </div>
        </div>
        <div class="footer-col">
          <h4>Quick Links</h4>
          <ul>
            <li><a href="index.html">Home</a></li>
            <li><a href="doctors.html">Find Doctors</a></li>
            <li><a href="services.html">Services</a></li>
            <li><a href="about.html">About Us</a></li>
            <li><a href="reviews.html">Reviews</a></li>
          </ul>
        </div>
        <div class="footer-col">
          <h4>Support</h4>
          <ul>
            <li><a href="help-center.html">Help Center</a></li>
            <li><a href="contact.html">Contact Us</a></li>
            <li><a href="login.html">Login</a></li>
            <li><a href="register.html">Create Account</a></li>
          </ul>
        </div>
        <div class="footer-col">
          <h4>Contact Info</h4>
          <div class="footer-contact">
            <p>📍 123 Wellness Avenue, Health City, HC 10101</p>
            <p>📞 +1 (800) 555-0199</p>
            <p>✉️ support@medicareplus-demo.com</p>
            <p>🕒 Mon - Sat: 8:00 AM - 8:00 PM</p>
          </div>
        </div>
      </div>
      <div class="footer-bottom">
        <p>&copy; ${year} MediCare+ Demo. All rights reserved.</p>
        <p>Built as a static front-end demo project.</p>
      </div>
      <div class="footer-disclaimer">
        This is a demonstration website created for portfolio purposes only. It does not provide real medical advice, diagnosis, or treatment, and does not collect or store any real patient data. All doctors, appointments, and records shown are fictional. In a real medical emergency, call your local emergency number immediately.
      </div>
    </div>
  </footer>`;
}

/* ============================================================
   RESET DEMO BUTTON
   ============================================================ */
function getResetDemoButtonHTML() {
  return `<button class="reset-demo-btn" onclick="handleResetDemo()">🔄 Reset Demo Data</button>`;
}

function handleResetDemo() {
  confirmModal(
    'This will reset all appointments, records, prescriptions, billing and notifications back to their original demo state. Your login session and theme preference will be kept. Continue?',
    () => {
      resetDemoData();
      setTimeout(() => window.location.reload(), 600);
    },
    'Reset Data',
    'btn-danger'
  );
}

/* ============================================================
   PAGE INIT
   ============================================================ */
function initPage(config) {
  config = config || {};
  initTheme();

  const navPlaceholder = document.getElementById('navbar-placeholder');
  const footerPlaceholder = document.getElementById('footer-placeholder');
  if (navPlaceholder) navPlaceholder.innerHTML = getNavHTML(config.active);
  if (footerPlaceholder) footerPlaceholder.innerHTML = getFooterHTML();

  if (!document.querySelector('.reset-demo-btn')) {
    const div = document.createElement('div');
    div.innerHTML = getResetDemoButtonHTML();
    document.body.appendChild(div.firstElementChild);
  }

  if (config.requireRole) {
    const user = requireAuth(config.requireRole);
    if (!user) return null;
    return user;
  }
  return getCurrentUser();
}
