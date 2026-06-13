/* ============================================================
   MEDICARE+ HEALTHCARE APPOINTMENT SYSTEM
   Authentication: login, register, validation helpers
   ============================================================ */

function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function showFieldError(inputId, message) {
  const input = document.getElementById(inputId);
  if (!input) return;
  input.classList.add('input-error');
  let err = input.parentElement.querySelector('.field-error');
  if (!err) {
    err = document.createElement('span');
    err.className = 'field-error';
    input.parentElement.appendChild(err);
  }
  err.textContent = message;
}

function clearFieldErrors(form) {
  form.querySelectorAll('.input-error').forEach(el => el.classList.remove('input-error'));
  form.querySelectorAll('.field-error').forEach(el => el.remove());
}

/* ============================================================
   LOGIN PAGE
   ============================================================ */
function initLoginPage() {
  if (isLoggedIn()) {
    window.location.href = getDashboardUrl(getCurrentUser().role);
    return;
  }

  const form = document.getElementById('login-form');
  if (!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    clearFieldErrors(form);

    const email = document.getElementById('login-email').value.trim().toLowerCase();
    const password = document.getElementById('login-password').value;

    let valid = true;
    if (!email) { showFieldError('login-email', 'Email is required.'); valid = false; }
    else if (!validateEmail(email)) { showFieldError('login-email', 'Enter a valid email address.'); valid = false; }
    if (!password) { showFieldError('login-password', 'Password is required.'); valid = false; }
    if (!valid) return;

    const user = DB.findOne(DB.KEYS.USERS, u => u.email.toLowerCase() === email && u.password === password);
    if (!user) {
      showToast('Invalid email or password. Please try again.', 'error');
      return;
    }

    DB.set(DB.KEYS.CURRENT_USER, user);
    showToast(`Welcome back, ${user.name.split(' ')[0]}!`, 'success');

    const redirect = getUrlParam('redirect');
    setTimeout(() => {
      window.location.href = (redirect && redirect.endsWith('.html')) ? redirect : getDashboardUrl(user.role);
    }, 500);
  });

  // Demo account quick-fill buttons
  document.querySelectorAll('.demo-login-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.getElementById('login-email').value = btn.dataset.email;
      document.getElementById('login-password').value = btn.dataset.password;
      showToast('Demo credentials filled in. Click "Sign In" to continue.', 'info', 2500);
    });
  });

  // Toggle password visibility
  const toggle = document.getElementById('toggle-password');
  if (toggle) {
    toggle.addEventListener('click', () => {
      const pwd = document.getElementById('login-password');
      const isPwd = pwd.type === 'password';
      pwd.type = isPwd ? 'text' : 'password';
      toggle.textContent = isPwd ? '🙈' : '👁️';
    });
  }
}

/* ============================================================
   REGISTER PAGE
   ============================================================ */
function initRegisterPage() {
  if (isLoggedIn()) {
    window.location.href = getDashboardUrl(getCurrentUser().role);
    return;
  }

  const form = document.getElementById('register-form');
  if (!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    clearFieldErrors(form);

    const name = document.getElementById('reg-name').value.trim();
    const email = document.getElementById('reg-email').value.trim().toLowerCase();
    const phone = document.getElementById('reg-phone').value.trim();
    const password = document.getElementById('reg-password').value;
    const confirm = document.getElementById('reg-confirm').value;
    const terms = document.getElementById('reg-terms');

    let valid = true;
    if (!name) { showFieldError('reg-name', 'Full name is required.'); valid = false; }
    if (!email) { showFieldError('reg-email', 'Email is required.'); valid = false; }
    else if (!validateEmail(email)) { showFieldError('reg-email', 'Enter a valid email address.'); valid = false; }
    else if (DB.findOne(DB.KEYS.USERS, u => u.email.toLowerCase() === email)) {
      showFieldError('reg-email', 'An account with this email already exists.'); valid = false;
    }
    if (!phone) { showFieldError('reg-phone', 'Phone number is required.'); valid = false; }
    if (!password || password.length < 6) { showFieldError('reg-password', 'Password must be at least 6 characters.'); valid = false; }
    if (confirm !== password) { showFieldError('reg-confirm', 'Passwords do not match.'); valid = false; }
    if (terms && !terms.checked) { showToast('Please agree to the Terms & Privacy Policy to continue.', 'warning'); valid = false; }
    if (!valid) return;

    const newUser = {
      id: generateId('user'),
      name,
      email,
      phone,
      password,
      role: 'patient',
      avatar: `https://i.pravatar.cc/150?img=${Math.floor(Math.random() * 60) + 5}`,
      dob: '',
      gender: '',
      address: '',
      bloodGroup: '',
      createdAt: todayStr()
    };
    DB.insert(DB.KEYS.USERS, newUser);
    DB.set(DB.KEYS.CURRENT_USER, newUser);

    showToast('Account created successfully! Welcome to MediCare+.', 'success');
    setTimeout(() => { window.location.href = 'patient-dashboard.html'; }, 600);
  });

  const toggle = document.getElementById('toggle-password');
  if (toggle) {
    toggle.addEventListener('click', () => {
      const pwd = document.getElementById('reg-password');
      const isPwd = pwd.type === 'password';
      pwd.type = isPwd ? 'text' : 'password';
      toggle.textContent = isPwd ? '🙈' : '👁️';
    });
  }
}
