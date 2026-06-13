/* ============================================================
   MEDICARE+ HEALTHCARE APPOINTMENT SYSTEM
   Doctors directory, search/filter/sort, doctor details page
   ============================================================ */

const DOCTORS_PER_PAGE = 9;

let doctorsState = {
  search: '',
  specialties: [],
  maxPrice: 250,
  minRating: 0,
  city: '',
  availableOnly: false,
  sort: 'rating-desc',
  page: 1
};

/* ============================================================
   DOCTORS DIRECTORY PAGE
   ============================================================ */
function initDoctorsPage() {
  const urlSpecialty = getUrlParam('specialty');
  const urlSearch = getUrlParam('search');
  const urlCity = getUrlParam('city');
  const urlAvailable = getUrlParam('availableOnly');
  if (urlSpecialty) doctorsState.specialties = [urlSpecialty];
  if (urlSearch) doctorsState.search = urlSearch;
  if (urlCity) doctorsState.city = urlCity;
  if (urlAvailable === '1') doctorsState.availableOnly = true;

  const searchInput = document.getElementById('doctor-search-input');
  if (searchInput) searchInput.value = doctorsState.search;

  renderSpecialtyFilters();
  renderCityFilter();
  bindDoctorsFilterEvents();
  renderDoctorsResults();
}

function renderSpecialtyFilters() {
  const container = document.getElementById('specialty-filters');
  if (!container) return;
  container.innerHTML = SPECIALTIES.map(s => `
    <label class="checkbox-label">
      <input type="checkbox" value="${s.key}" class="specialty-filter-cb" ${doctorsState.specialties.includes(s.key) ? 'checked' : ''}>
      ${s.icon} ${s.key}
    </label>
  `).join('');
}

function renderCityFilter() {
  const select = document.getElementById('city-filter');
  if (!select) return;
  const cities = [...new Set(DB.getAll(DB.KEYS.DOCTORS).map(d => d.city))].sort();
  select.innerHTML = '<option value="">All Locations</option>' +
    cities.map(c => `<option value="${escapeHtml(c)}" ${doctorsState.city === c ? 'selected' : ''}>${escapeHtml(c)}</option>`).join('');
}

function bindDoctorsFilterEvents() {
  const searchInput = document.getElementById('doctor-search-input');
  if (searchInput) {
    searchInput.addEventListener('input', debounce((e) => {
      doctorsState.search = e.target.value.trim();
      doctorsState.page = 1;
      renderDoctorsResults();
    }, 300));
  }

  document.querySelectorAll('.specialty-filter-cb').forEach(cb => {
    cb.addEventListener('change', () => {
      doctorsState.specialties = [...document.querySelectorAll('.specialty-filter-cb:checked')].map(c => c.value);
      doctorsState.page = 1;
      renderDoctorsResults();
    });
  });

  const priceRange = document.getElementById('price-range-filter');
  const priceLabel = document.getElementById('price-range-label');
  if (priceRange) {
    priceRange.value = doctorsState.maxPrice;
    if (priceLabel) priceLabel.textContent = formatCurrency(doctorsState.maxPrice);
    priceRange.addEventListener('input', (e) => {
      doctorsState.maxPrice = Number(e.target.value);
      if (priceLabel) priceLabel.textContent = formatCurrency(doctorsState.maxPrice);
    });
    priceRange.addEventListener('change', () => {
      doctorsState.page = 1;
      renderDoctorsResults();
    });
  }

  document.querySelectorAll('.rating-filter-radio').forEach(radio => {
    radio.addEventListener('change', (e) => {
      doctorsState.minRating = Number(e.target.value);
      doctorsState.page = 1;
      renderDoctorsResults();
    });
  });

  const cityFilter = document.getElementById('city-filter');
  if (cityFilter) {
    cityFilter.addEventListener('change', (e) => {
      doctorsState.city = e.target.value;
      doctorsState.page = 1;
      renderDoctorsResults();
    });
  }

  const availOnly = document.getElementById('available-only-cb');
  if (availOnly) {
    availOnly.checked = doctorsState.availableOnly;
    availOnly.addEventListener('change', (e) => {
      doctorsState.availableOnly = e.target.checked;
      doctorsState.page = 1;
      renderDoctorsResults();
    });
  }

  const sortSelect = document.getElementById('doctor-sort');
  if (sortSelect) {
    sortSelect.value = doctorsState.sort;
    sortSelect.addEventListener('change', (e) => {
      doctorsState.sort = e.target.value;
      renderDoctorsResults();
    });
  }

  const clearBtn = document.getElementById('clear-filters-btn');
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      doctorsState = { search: '', specialties: [], maxPrice: 250, minRating: 0, city: '', availableOnly: false, sort: 'rating-desc', page: 1 };
      if (searchInput) searchInput.value = '';
      renderSpecialtyFilters();
      renderCityFilter();
      bindDoctorsFilterEvents();
      renderDoctorsResults();
    });
  }
}

function getFilteredDoctors() {
  let doctors = DB.findAll(DB.KEYS.DOCTORS, d => d.status === 'active');

  if (doctorsState.search) {
    const q = doctorsState.search.toLowerCase();
    doctors = doctors.filter(d =>
      d.name.toLowerCase().includes(q) ||
      d.specialty.toLowerCase().includes(q) ||
      d.city.toLowerCase().includes(q)
    );
  }
  if (doctorsState.specialties.length > 0) {
    doctors = doctors.filter(d => doctorsState.specialties.includes(d.specialty));
  }
  if (doctorsState.city) {
    doctors = doctors.filter(d => d.city === doctorsState.city);
  }
  doctors = doctors.filter(d => d.consultationFee <= doctorsState.maxPrice);
  doctors = doctors.filter(d => d.rating >= doctorsState.minRating);
  if (doctorsState.availableOnly) {
    doctors = doctors.filter(d => isDoctorAvailableToday(d.id));
  }

  switch (doctorsState.sort) {
    case 'rating-desc': doctors.sort((a, b) => b.rating - a.rating); break;
    case 'price-asc': doctors.sort((a, b) => a.consultationFee - b.consultationFee); break;
    case 'price-desc': doctors.sort((a, b) => b.consultationFee - a.consultationFee); break;
    case 'experience-desc': doctors.sort((a, b) => b.experience - a.experience); break;
    case 'name-asc': doctors.sort((a, b) => a.name.localeCompare(b.name)); break;
    default: break;
  }
  return doctors;
}

function renderDoctorsResults() {
  const container = document.getElementById('doctors-results');
  const countEl = document.getElementById('results-count');
  const paginationEl = document.getElementById('doctors-pagination');
  if (!container) return;

  const filtered = getFilteredDoctors();
  const { items, page, totalPages, total } = paginate(filtered, doctorsState.page, DOCTORS_PER_PAGE);
  doctorsState.page = page;

  if (countEl) countEl.textContent = `${total} doctor${total === 1 ? '' : 's'} found`;

  if (items.length === 0) {
    container.innerHTML = renderEmptyState('🔍', 'No doctors found', 'Try adjusting your filters or search terms to find more results.',
      '<button class="btn btn-outline" onclick="document.getElementById(\'clear-filters-btn\').click()">Clear Filters</button>');
  } else {
    container.innerHTML = items.map(renderDoctorCard).join('');
  }

  if (paginationEl) paginationEl.innerHTML = renderPaginationHTML(page, totalPages, 'goToDoctorsPage');
}

function goToDoctorsPage(page) {
  doctorsState.page = page;
  renderDoctorsResults();
  const results = document.getElementById('doctors-results');
  if (results) results.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/* ============================================================
   DOCTOR DETAILS PAGE
   ============================================================ */
function initDoctorDetailsPage() {
  const id = Number(getUrlParam('id'));
  const doctor = DB.findById(DB.KEYS.DOCTORS, id);
  const container = document.getElementById('doctor-detail-container');
  if (!doctor) {
    if (container) {
      container.innerHTML = renderEmptyState('🩺', 'Doctor Not Found', 'The doctor profile you are looking for does not exist or may have been removed.',
        '<a href="doctors.html" class="btn btn-primary">Browse Doctors</a>');
    }
    return;
  }

  document.title = `${doctor.name} - ${doctor.specialty} | MediCare+`;
  renderDoctorProfile(doctor);
  renderAvailabilitySummary(doctor);
  renderDoctorReviews(doctor);
  renderRelatedDoctors(doctor);
  setupBookingSidebar(doctor);
}

function renderDoctorProfile(doctor) {
  const setText = (id, text) => { const el = document.getElementById(id); if (el) el.textContent = text; };
  const setHtml = (id, html) => { const el = document.getElementById(id); if (el) el.innerHTML = html; };

  setHtml('doctor-avatar', `<img src="${escapeHtml(doctor.photo)}" alt="${escapeHtml(doctor.name)}" class="profile-header-avatar">`);
  setText('doctor-name', doctor.name);
  setText('doctor-specialty', doctor.specialty);
  setHtml('doctor-rating', renderStars(doctor.rating, doctor.reviewCount));
  setHtml('doctor-meta', `
    <span>🎓 ${doctor.experience} years experience</span>
    <span>📍 ${escapeHtml(doctor.clinicLocation)}, ${escapeHtml(doctor.city)}</span>
    <span>💰 ${formatCurrency(doctor.consultationFee)} per visit</span>
  `);
  setText('doctor-about', doctor.about);
  setHtml('doctor-education', doctor.education.split('·').map(e => `<li>${escapeHtml(e.trim())}</li>`).join(''));
  setHtml('doctor-languages', doctor.languages.map(l => `<span class="tag">${escapeHtml(l)}</span>`).join(''));
  setText('doctor-address', doctor.address);

  const wishBtn = document.getElementById('doctor-wishlist-btn');
  if (wishBtn) {
    const wishlisted = isWishlisted(doctor.id);
    wishBtn.innerHTML = wishlisted ? '❤️ Saved to Wishlist' : '🤍 Save to Wishlist';
    wishBtn.classList.toggle('active', wishlisted);
    wishBtn.addEventListener('click', () => {
      const added = toggleWishlist(doctor.id);
      wishBtn.innerHTML = added ? '❤️ Saved to Wishlist' : '🤍 Save to Wishlist';
      wishBtn.classList.toggle('active', added);
    });
  }
}

function renderAvailabilitySummary(doctor) {
  const container = document.getElementById('availability-summary');
  if (!container) return;
  const schedule = getDoctorSchedule(doctor.id);
  const allDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  container.innerHTML = allDays.map(d => `
    <span class="avail-day-pill ${schedule && schedule.workDays.includes(d) ? 'active' : ''}">${d}</span>
  `).join('') + `<p class="mt-2 text-light" style="width:100%;">Hours: ${schedule ? formatTime(schedule.startTime) + ' - ' + formatTime(schedule.endTime) : 'N/A'}${schedule && schedule.breakStart ? ` (Break ${formatTime(schedule.breakStart)} - ${formatTime(schedule.breakEnd)})` : ''}</p>`;
}

function renderDoctorReviews(doctor) {
  const summaryContainer = document.getElementById('reviews-summary-container');
  const listContainer = document.getElementById('doctor-reviews-list');
  if (!listContainer) return;

  const reviews = DB.findAll(DB.KEYS.REVIEWS, r => r.doctorId === doctor.id)
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  if (summaryContainer) {
    summaryContainer.innerHTML = `
      <div class="reviews-score-big">
        <div class="big-score">${doctor.rating.toFixed(1)}</div>
        <div class="big-score-label">${renderStars(doctor.rating, 0, false)}</div>
        <div class="big-score-count">${doctor.reviewCount} review${doctor.reviewCount === 1 ? '' : 's'}</div>
      </div>
      <div>
        <h3 style="margin-bottom:0.5rem;">Patient Feedback</h3>
        <p class="text-light mb-0">See what patients have to say about their experience with ${escapeHtml(doctor.name)}. Only patients with completed appointments can leave a review.</p>
      </div>
    `;
  }

  if (reviews.length === 0) {
    listContainer.innerHTML = renderEmptyState('💬', 'No Reviews Yet', 'Be the first to share your experience with this doctor after your appointment.');
    return;
  }

  listContainer.innerHTML = reviews.slice(0, 8).map(r => `
    <div class="review-card">
      <div class="review-header">
        <div class="reviewer-avatar">${initials(r.patientName)}</div>
        <div>
          <div class="reviewer-name">${escapeHtml(r.patientName)}</div>
          <div class="reviewer-date">${formatDate(r.date)}</div>
        </div>
        <div class="review-rating-inline">${renderStars(r.rating, 0, false)}</div>
      </div>
      <p class="review-comment">${escapeHtml(r.comment)}</p>
    </div>
  `).join('');
}

function renderRelatedDoctors(doctor) {
  const container = document.getElementById('related-doctors');
  if (!container) return;
  const related = DB.findAll(DB.KEYS.DOCTORS, d => d.specialty === doctor.specialty && d.id !== doctor.id && d.status === 'active')
    .sort((a, b) => b.rating - a.rating)
    .slice(0, 3);

  if (related.length === 0) {
    container.closest('.detail-section').style.display = 'none';
    return;
  }
  container.innerHTML = related.map(renderDoctorCard).join('');
}

function setupBookingSidebar(doctor) {
  const setText = (id, text) => { const el = document.getElementById(id); if (el) el.textContent = text; };
  setText('sidebar-fee', formatCurrency(doctor.consultationFee));
  const bookBtn = document.getElementById('sidebar-book-btn');
  if (bookBtn) bookBtn.href = `book-appointment.html?doctorId=${doctor.id}`;

  const nextAvail = getDoctorNextAvailable(doctor.id);
  const availEl = document.getElementById('sidebar-next-available');
  if (availEl) {
    availEl.textContent = nextAvail
      ? (nextAvail === todayStr() ? 'Available Today' : `Next available: ${formatDateShort(nextAvail)}`)
      : 'No upcoming availability';
  }

  const mapEl = document.getElementById('sidebar-map-address');
  if (mapEl) mapEl.textContent = `${doctor.clinicLocation}, ${doctor.address}, ${doctor.city}`;
}
