/* ============================================================
   MEDICARE+ HEALTHCARE APPOINTMENT SYSTEM
   Billing & Invoices page
   ============================================================ */

let billingFilter = 'all';

function setStat(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

function initBillingPage() {
  const user = requireAuth(['patient', 'doctor', 'admin']);
  if (!user) return;

  const urlFilter = getUrlParam('filter');
  if (urlFilter) billingFilter = urlFilter;

  bindBillingFilters();

  if (user.role === 'patient') renderPatientBilling(user);
  else if (user.role === 'doctor') renderDoctorBilling(user);
  else renderAdminBilling(user);
}

function bindBillingFilters() {
  document.querySelectorAll('.filter-tab[data-filter]').forEach(tab => {
    if (tab.dataset.filter === billingFilter) tab.classList.add('active');
    else tab.classList.remove('active');
    tab.addEventListener('click', () => {
      billingFilter = tab.dataset.filter;
      document.querySelectorAll('.filter-tab[data-filter]').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      renderBillingForCurrentUser();
    });
  });
}

function renderBillingForCurrentUser() {
  const user = getCurrentUser();
  if (!user) return;
  if (user.role === 'patient') renderPatientBilling(user);
  else if (user.role === 'doctor') renderDoctorBilling(user);
  else renderAdminBilling(user);
}

function applyBillingFilter(invoices) {
  if (billingFilter === 'paid') return invoices.filter(i => i.status === 'paid');
  if (billingFilter === 'unpaid') return invoices.filter(i => i.status === 'unpaid');
  return invoices;
}

/* ============================================================
   PATIENT BILLING
   ============================================================ */
function renderPatientBilling(user) {
  const all = DB.findAll(DB.KEYS.BILLING, b => b.patientId === user.id);
  const totalSpent = all.filter(i => i.status === 'paid').reduce((sum, i) => sum + i.amount, 0);
  const totalDue = all.filter(i => i.status === 'unpaid').reduce((sum, i) => sum + i.amount, 0);

  setStat('billing-stat-spent', formatCurrency(totalSpent));
  setStat('billing-stat-due', formatCurrency(totalDue));
  setStat('billing-stat-count', all.length);

  const invoices = applyBillingFilter(all).sort((a, b) => new Date(b.date) - new Date(a.date));
  const container = document.getElementById('invoices-list');
  if (!container) return;

  if (invoices.length === 0) {
    container.innerHTML = renderEmptyState('💳', 'No Invoices Found', 'Invoices for your appointments will appear here.');
  } else {
    container.innerHTML = invoices.map(inv => `
      <div class="invoice-card" id="invoice-${inv.id}">
        <div class="invoice-card-header">
          <div>
            <h3>${escapeHtml(inv.invoiceNumber)}</h3>
            <div class="invoice-meta">${escapeHtml(inv.doctorName)} • ${escapeHtml(inv.specialty || '')} • ${formatDateLong(inv.date)} ${paymentBadge(inv.status)}</div>
          </div>
          <div class="table-actions invoice-actions">
            ${inv.status === 'unpaid' ? `<button class="btn btn-primary btn-sm" onclick="openPaymentModal('${inv.id}')">Pay Now</button>` : ''}
            <button class="btn btn-outline btn-sm" onclick="printInvoice('${inv.id}')">🖨️ Print</button>
          </div>
        </div>
        <div class="invoice-items">
          ${inv.items.map(item => `<div class="invoice-item-row"><span>${escapeHtml(item.desc)}</span><span>${formatCurrency(item.amount)}</span></div>`).join('')}
        </div>
        <div class="invoice-total-row"><span>Total</span><span>${formatCurrency(inv.amount)}</span></div>
        ${inv.status === 'paid' ? `<p class="text-light mb-0 mt-1" style="font-size:0.8rem;">Paid via ${paymentMethodLabel(inv.paymentMethod)}</p>` : ''}
      </div>
    `).join('');
  }

  highlightFromQuery('invoice-', all, 'appointmentId');
}

/* ============================================================
   DOCTOR BILLING
   ============================================================ */
function renderDoctorBilling(user) {
  const all = DB.findAll(DB.KEYS.BILLING, b => b.doctorId === user.doctorId);
  const totalEarned = all.filter(i => i.status === 'paid').reduce((sum, i) => sum + i.amount, 0);
  const totalPending = all.filter(i => i.status === 'unpaid').reduce((sum, i) => sum + i.amount, 0);

  setStat('billing-stat-earned', formatCurrency(totalEarned));
  setStat('billing-stat-due', formatCurrency(totalPending));
  setStat('billing-stat-count', all.length);

  const invoices = applyBillingFilter(all).sort((a, b) => new Date(b.date) - new Date(a.date));
  const container = document.getElementById('invoices-list');
  if (!container) return;

  if (invoices.length === 0) {
    container.innerHTML = renderEmptyState('💳', 'No Invoices Found', 'Invoices for your appointments will appear here.');
  } else {
    container.innerHTML = invoices.map(inv => `
      <div class="invoice-card" id="invoice-${inv.id}">
        <div class="invoice-card-header">
          <div>
            <h3>${escapeHtml(inv.invoiceNumber)}</h3>
            <div class="invoice-meta">${escapeHtml(inv.patientName)} • ${formatDateLong(inv.date)} ${paymentBadge(inv.status)}</div>
          </div>
          <div class="table-actions invoice-actions">
            <button class="btn btn-outline btn-sm" onclick="printInvoice('${inv.id}')">🖨️ Print</button>
          </div>
        </div>
        <div class="invoice-items">
          ${inv.items.map(item => `<div class="invoice-item-row"><span>${escapeHtml(item.desc)}</span><span>${formatCurrency(item.amount)}</span></div>`).join('')}
        </div>
        <div class="invoice-total-row"><span>Total</span><span>${formatCurrency(inv.amount)}</span></div>
      </div>
    `).join('');
  }
}

/* ============================================================
   ADMIN BILLING
   ============================================================ */
function renderAdminBilling(user) {
  const all = DB.getAll(DB.KEYS.BILLING);
  const totalRevenue = all.filter(i => i.status === 'paid').reduce((sum, i) => sum + i.amount, 0);
  const totalPending = all.filter(i => i.status === 'unpaid').reduce((sum, i) => sum + i.amount, 0);

  setStat('billing-stat-revenue', formatCurrency(totalRevenue));
  setStat('billing-stat-due', formatCurrency(totalPending));
  setStat('billing-stat-count', all.length);

  const invoices = applyBillingFilter(all).sort((a, b) => new Date(b.date) - new Date(a.date));
  const tbody = document.getElementById('admin-billing-tbody');
  if (!tbody) return;

  if (invoices.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="text-center text-light">No invoices found.</td></tr>`;
    return;
  }

  tbody.innerHTML = invoices.map(inv => `
    <tr>
      <td>${escapeHtml(inv.invoiceNumber)}</td>
      <td>${escapeHtml(inv.patientName)}</td>
      <td>${escapeHtml(inv.doctorName)}</td>
      <td>${formatDate(inv.date)}</td>
      <td>${formatCurrency(inv.amount)}</td>
      <td>${paymentBadge(inv.status)}</td>
      <td>
        <div class="table-actions">
          <button class="btn btn-outline btn-sm" onclick="printInvoice('${inv.id}')">View</button>
          ${inv.status === 'unpaid' ? `<button class="btn btn-primary btn-sm" onclick="adminMarkPaid('${inv.id}')">Mark Paid</button>` : ''}
        </div>
      </td>
    </tr>
  `).join('');
}

function adminMarkPaid(invoiceId) {
  confirmModal('Mark this invoice as paid?', () => {
    DB.update(DB.KEYS.BILLING, invoiceId, { status: 'paid', paymentMethod: 'cash' });
    const inv = DB.findById(DB.KEYS.BILLING, invoiceId);
    if (inv) {
      DB.update(DB.KEYS.APPOINTMENTS, inv.appointmentId, { paymentStatus: 'paid', paymentMethod: 'cash' });
    }
    showToast('Invoice marked as paid.', 'success');
    renderAdminBilling(getCurrentUser());
  }, 'Mark Paid', 'btn-primary');
}

/* ============================================================
   PAYMENT MODAL (PATIENT)
   ============================================================ */
function paymentMethodLabel(method) {
  const map = { card: 'Credit/Debit Card', paypal: 'PayPal', insurance: 'Insurance', cash: 'Cash at Clinic' };
  return map[method] || 'N/A';
}

function openPaymentModal(invoiceId) {
  const invoice = DB.findById(DB.KEYS.BILLING, invoiceId);
  if (!invoice) return;

  const bodyHtml = `
    <p class="text-light mb-2">Amount due for <strong>${escapeHtml(invoice.invoiceNumber)}</strong>: <strong>${formatCurrency(invoice.amount)}</strong></p>
    <div class="form-group">
      <label>Select Payment Method</label>
      <div class="payment-methods" id="payment-method-group">
        <label class="payment-method-btn active"><input type="radio" name="pay-method" value="card" checked>💳 Credit/Debit Card</label>
        <label class="payment-method-btn"><input type="radio" name="pay-method" value="paypal">🅿️ PayPal</label>
        <label class="payment-method-btn"><input type="radio" name="pay-method" value="insurance">🏥 Insurance</label>
        <label class="payment-method-btn"><input type="radio" name="pay-method" value="cash">💵 Pay at Clinic</label>
      </div>
    </div>
    <div id="card-payment-fields">
      <div class="form-group">
        <label>Cardholder Name</label>
        <input type="text" class="form-control" id="pay-card-name" placeholder="John Smith">
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Card Number</label>
          <input type="text" class="form-control" id="pay-card-number" placeholder="4242 4242 4242 4242" maxlength="19">
        </div>
        <div class="form-group">
          <label>Expiry / CVV</label>
          <div style="display:flex; gap:0.5rem;">
            <input type="text" class="form-control" id="pay-card-expiry" placeholder="MM/YY" maxlength="5">
            <input type="text" class="form-control" id="pay-card-cvv" placeholder="CVV" maxlength="3">
          </div>
        </div>
      </div>
    </div>
    <p class="text-muted mb-0" style="font-size:0.78rem;">This is a demo payment form. No real transactions are processed and no card data is stored.</p>
  `;
  const footerHtml = `
    <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
    <button class="btn btn-primary" id="confirm-payment-btn">Pay ${formatCurrency(invoice.amount)}</button>
  `;
  const overlay = openModal('Complete Payment', bodyHtml, footerHtml, 'md');

  const cardFields = overlay.querySelector('#card-payment-fields');
  overlay.querySelectorAll('.payment-method-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      overlay.querySelectorAll('.payment-method-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const method = btn.querySelector('input').value;
      cardFields.style.display = method === 'card' ? '' : 'none';
    });
  });

  overlay.querySelector('#confirm-payment-btn').addEventListener('click', () => processPayment(invoiceId, overlay));
}

function processPayment(invoiceId, overlay) {
  const methodInput = overlay.querySelector('input[name="pay-method"]:checked');
  const method = methodInput ? methodInput.value : 'card';

  if (method === 'card') {
    const name = overlay.querySelector('#pay-card-name').value.trim();
    const number = overlay.querySelector('#pay-card-number').value.trim();
    const expiry = overlay.querySelector('#pay-card-expiry').value.trim();
    const cvv = overlay.querySelector('#pay-card-cvv').value.trim();
    if (!name || !number || !expiry || !cvv) {
      showToast('Please fill in all card details.', 'warning');
      return;
    }
  }

  const invoice = DB.findById(DB.KEYS.BILLING, invoiceId);
  DB.update(DB.KEYS.BILLING, invoiceId, { status: 'paid', paymentMethod: method });
  if (invoice) {
    DB.update(DB.KEYS.APPOINTMENTS, invoice.appointmentId, { paymentStatus: 'paid', paymentMethod: method });
  }

  closeModal();
  showToast('Payment successful! Thank you.', 'success');
  renderPatientBilling(getCurrentUser());
}

/* ============================================================
   PRINT INVOICE
   ============================================================ */
function printInvoice(invoiceId) {
  const card = document.getElementById(`invoice-${invoiceId}`);
  if (card) {
    const hiddenEls = [];
    document.querySelectorAll('.invoice-card').forEach(c => {
      if (c !== card) { c.style.display = 'none'; hiddenEls.push(c); }
    });
    const actions = card.querySelectorAll('.invoice-actions');
    actions.forEach(a => a.style.display = 'none');

    window.print();

    setTimeout(() => {
      hiddenEls.forEach(c => c.style.display = '');
      actions.forEach(a => a.style.display = '');
    }, 500);
  } else {
    window.print();
  }
}
